# Panel administrativo con Supabase Auth

## Estado

El panel administrativo ha sido preparado técnicamente, pero permanece **deshabilitado** hasta completar los controles preproducción pendientes y registrar la primera cuenta administradora autorizada.

Ruta preparada:

`/admin/`

El archivo `admin/admin.js` mantiene:

`PANEL_HABILITADO = false`

Mientras ese valor permanezca en `false`, el formulario de acceso no realiza autenticación.

## Alcance

El panel está diseñado únicamente para administrar:

- Capacitaciones;
- Calendario.

No se incorporan otros módulos del EVA en esta etapa.

## Modelo de acceso

La arquitectura preparada exige simultáneamente:

1. una cuenta de Supabase Auth;
2. que su `user_id` figure como activo en `admin_guard.admin_usuarios_autorizados`;
3. autenticación multifactor TOTP;
4. una sesión con nivel `aal2`;
5. políticas RLS que autoricen la operación solicitada.

Una contraseña correcta por sí sola no concede escritura.

## Registro público

El panel no contiene función de registro de usuarios.

Además, se preparó:

`admin_guard.admin_correos_autorizados`

y el hook:

`private.auth_restringir_creacion_admin(event jsonb)`

para limitar la creación de cuentas a correos expresamente autorizados.

Ese hook debe quedar habilitado en la configuración de Authentication antes de activar el panel. Mientras no se haya verificado esa configuración y no exista un primer correo autorizado, el panel debe permanecer deshabilitado.

## MFA

La escritura administrativa exige `aal2`.

El flujo previsto es:

```text
correo + contraseña
        ↓
sesión aal1
        ↓
TOTP
        ↓
sesión aal2
        ↓
RLS valida administrador autorizado
        ↓
INSERT / UPDATE
```

El frontend contempla enrolamiento y verificación TOTP. Supabase recomienda que MFA sea aplicado también en las políticas de base de datos; por ello la comprobación principal no depende únicamente de la interfaz.

## Permisos

### Capacitaciones

`anon`:
- SELECT.

`authenticated`:
- SELECT;
- INSERT y UPDATE únicamente si el usuario está autorizado y tiene `aal2`;
- sin DELETE.

### Calendario

`anon`:
- SELECT de actividades visibles.

`authenticated`:
- SELECT;
- INSERT y UPDATE únicamente si el usuario está autorizado y tiene `aal2`;
- sin DELETE.

La edición del Calendario utiliza la función:

`public.admin_guardar_actividad_calendario(...)`

en modo `SECURITY INVOKER`, de manera que las políticas RLS siguen siendo obligatorias.

## Protección contra eliminaciones accidentales

El rol `authenticated` no recibe permiso `DELETE`.

Para retirar una actividad del Calendario se utiliza:

`visible = false`

en lugar de eliminar el registro.

## Auditoría

Se preparó:

`private.auditoria_administrativa`

Los cambios sobre Capacitaciones y Calendario generan trazabilidad con:

- tabla;
- operación;
- clave del registro;
- identificador del usuario autenticado cuando exista;
- nivel de autenticación;
- fecha;
- estado anterior;
- estado nuevo.

La tabla es privada y no está disponible para visitantes ni usuarios autenticados ordinarios.

## Sesiones

Cuando se active el panel, el frontend almacenará la sesión administrativa en `sessionStorage`, no en `localStorage`.

Esto implica que el estado local del panel está pensado para finalizar al cerrar la pestaña o sesión del navegador. El cierre de sesión elimina también la copia local.

Los tokens de Supabase no deben copiarse, compartirse ni registrarse en repositorios.

## Cuenta administrativa

Actualmente no se ha creado ni autorizado ninguna cuenta.

Antes de activar el panel se debe:

1. definir el correo administrativo;
2. incorporarlo a la lista de creación autorizada;
3. verificar que el mecanismo de restricción de altas esté activo;
4. crear o invitar la cuenta;
5. vincular su `user_id` en `admin_guard.admin_usuarios_autorizados`;
6. completar el enrolamiento TOTP;
7. comprobar que la sesión alcanza `aal2`;
8. realizar una prueba controlada de UPDATE;
9. mantener DELETE bloqueado.

## Gate de privacidad

La preparación técnica del panel no cambia por sí sola:

`private.supabase_preproduccion_gate.habilitado_para_datos_personales`

El gate continúa en `false` mientras existan controles institucionales o jurídicos bloqueantes.

Por tanto, la existencia del código del panel no debe interpretarse como autorización para iniciar tratamiento de datos personales.

## Verificación técnica

Después de preparar las políticas de administración se ejecutan los asesores de seguridad y rendimiento de Supabase.

El objetivo antes de activar el panel es mantener ambos sin advertencias asociadas a esta implementación.
