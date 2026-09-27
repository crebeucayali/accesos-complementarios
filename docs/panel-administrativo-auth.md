# Panel administrativo con Supabase Auth

## Estado

La interfaz del panel administrativo está **habilitada técnicamente** en:

`/admin/`

El formulario de acceso puede comunicarse con Supabase Auth, pero actualmente no existen usuarios Auth ni administradores autorizados. Por ello, el panel todavía no tiene una cuenta capaz de realizar operaciones administrativas.

El frontend mantiene:

`PANEL_HABILITADO = true`

Esto habilita el flujo de autenticación, no la autorización de escritura.

## Alcance

El panel administra únicamente:

- Capacitaciones;
- Calendario.

No se incorporan otros módulos del EVA en esta etapa.

## Modelo de acceso

Para editar contenido deben cumplirse simultáneamente estas condiciones:

1. existir una cuenta válida de Supabase Auth;
2. estar vinculada como activa en `admin_guard.admin_usuarios_autorizados`;
3. completar MFA TOTP;
4. disponer de una sesión con `aal2`;
5. superar las políticas RLS de la tabla correspondiente.

Una contraseña válida por sí sola no concede permisos de edición.

## Registro público

El panel no contiene formulario de registro.

También se prepararon:

`admin_guard.admin_correos_autorizados`

y:

`private.auth_restringir_creacion_admin(event jsonb)`

El hook rechaza la creación de cuentas cuyo correo no esté previamente autorizado. Su función ya existe en PostgreSQL, pero todavía debe seleccionarse y habilitarse en **Authentication > Hooks > Before User Created** antes de crear la primera cuenta administrativa.

La disponibilidad del endpoint Auth de Supabase no equivale a autorización administrativa: una cuenta no incluida en la guardia no supera las políticas de escritura.

## MFA

La escritura exige `aal2`.

Flujo previsto:

```text
correo + contraseña
        ↓
sesión aal1
        ↓
TOTP
        ↓
sesión aal2
        ↓
administrador autorizado
        ↓
RLS
        ↓
INSERT / UPDATE
```

El panel permite enrolar un factor TOTP y resolver el desafío MFA. La comprobación de AAL2 se repite en la base de datos; no depende solo de la interfaz.

## Guardia administrativa

Las tablas de autorización se mantienen fuera del esquema público:

`admin_guard.admin_usuarios_autorizados`

`admin_guard.admin_correos_autorizados`

Los usuarios autenticados no tienen acceso directo a esas tablas.

Las funciones:

`public.es_admin_autorizado()`

`public.es_admin_mfa()`

son `SECURITY DEFINER` y permiten a las políticas consultar únicamente el resultado necesario para autorizar la operación.

## Permisos

### Capacitaciones

`anon`:
- SELECT.

`authenticated`:
- SELECT;
- INSERT y UPDATE solamente cuando `public.es_admin_mfa()` devuelve verdadero;
- sin DELETE.

### Calendario

`anon`:
- SELECT de actividades visibles.

`authenticated`:
- SELECT público;
- acceso administrativo a registros y escritura únicamente con administrador autorizado + AAL2;
- sin DELETE.

El panel utiliza `public.admin_guardar_actividad_calendario(...)` para crear o editar actividades. La función vuelve a verificar administrador autorizado y AAL2 antes de modificar datos.

## Protección contra eliminaciones accidentales

El rol `authenticated` no recibe permiso `DELETE`.

En Calendario, una actividad puede retirarse de la vista pública mediante:

`visible = false`

sin destruir el registro.

## Auditoría

Se mantiene:

`private.auditoria_administrativa`

Los cambios administrativos registran trazabilidad de la operación, incluyendo el identificador del usuario autenticado y el nivel AAL cuando exista una sesión administrativa.

La tabla de auditoría no es accesible para visitantes ni usuarios autenticados ordinarios.

## Sesión del navegador

El panel utiliza `sessionStorage` para conservar temporalmente los tokens de la sesión administrativa.

La copia local se elimina al cerrar sesión y está limitada al contexto de la pestaña/sesión del navegador. No se utiliza `localStorage` para la sesión administrativa.

Las credenciales y tokens no deben copiarse a repositorios, documentos públicos ni registros de diagnóstico.

## Funciones disponibles en el panel

### Capacitaciones

Permite editar:

- fecha;
- estado;
- título;
- tema;
- flyer;
- infografía;
- PDF;
- video y vista previa;
- diapositivas y vista previa;
- materiales complementarios.

Las restricciones de integridad creadas anteriormente en PostgreSQL siguen aplicándose.

### Calendario

Permite:

- crear una actividad;
- editar una actividad existente;
- sustituir un marcador `En planificación`;
- cambiar estado y clase visual;
- controlar la visibilidad.

No permite eliminar registros desde la interfaz.

## Primera cuenta administrativa

Actualmente:

- correo autorizado para la primera cuenta: **senordelosmilagroscrebe@gmail.com**;
- usuarios en Supabase Auth: **0**;
- administradores autorizados: **0**;
- factores MFA: **0**.

El correo institucional ya está registrado en `admin_guard.admin_correos_autorizados`.

Para poner el panel en uso administrativo real todavía se debe:

1. habilitar y verificar el hook `Before User Created`;
2. crear o invitar la cuenta `senordelosmilagroscrebe@gmail.com` mediante Supabase Auth;
3. vincular su `user_id` a `admin_guard.admin_usuarios_autorizados`;
4. iniciar sesión desde `/admin/`;
5. enrolar TOTP;
6. verificar que la sesión alcanza `aal2`;
7. ejecutar una prueba controlada de edición.

La custodia de esta cuenta institucional debe mantenerse restringida a las personas expresamente responsables de la administración del EVA.

## Gate de privacidad

El panel técnico no modifica automáticamente:

`private.supabase_preproduccion_gate.habilitado_para_datos_personales`

El gate continúa en `false` mientras sigan pendientes controles institucionales o jurídicos.

Por tanto, el panel está preparado para la activación de una cuenta, pero esa activación debe hacerse de forma deliberada y documentada.

## Verificación técnica

Después de cada modificación de permisos, funciones o políticas RLS deben ejecutarse los asesores de seguridad y rendimiento de Supabase y comprobarse nuevamente que:

- no exista escritura para `anon`;
- ninguna cuenta no autorizada pueda escribir;
- una cuenta autorizada con `aal1` no pueda escribir;
- una cuenta autorizada con `aal2` sí pueda realizar las operaciones previstas;
- `DELETE` continúe bloqueado para `authenticated`.
