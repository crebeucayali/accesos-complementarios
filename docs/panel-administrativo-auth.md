# Panel administrativo con Supabase Auth

## Estado actual

El panel administrativo EVA está operativo en:

`/admin/`

Cuenta administrativa autorizada:

`senordelosmilagroscrebe@gmail.com`

La cuenta utiliza:

- Supabase Auth;
- contraseña;
- MFA TOTP;
- sesión con nivel `aal2`;
- autorización explícita en `admin_guard.admin_usuarios_autorizados`.

El registro público de usuarios no está disponible desde el panel.

## Alcance

El panel administra actualmente:

- Capacitaciones;
- Calendario;
- Repositorio Accesible;
- Noticias destacadas de la portada principal.

## Flujo de acceso

```text
correo + contraseña
        ↓
sesión AAL1
        ↓
TOTP
        ↓
sesión AAL2
        ↓
administrador autorizado
        ↓
RLS
        ↓
operaciones administrativas
```

El acceso compacto de la plataforma principal reutiliza la misma sesión almacenada temporalmente en `sessionStorage`.

## Guardia administrativa

Las tablas de autorización están fuera del esquema público:

- `admin_guard.admin_usuarios_autorizados`
- `admin_guard.admin_correos_autorizados`

Las políticas RLS utilizan funciones privadas de autorización, entre ellas:

- `private.es_admin_autorizado()`
- `private.es_admin_mfa()`

Los visitantes y usuarios autenticados ordinarios no tienen acceso directo a las tablas de guardia.

## Capacitaciones

Público:

- SELECT.

Administrador autorizado + AAL2:

- INSERT;
- UPDATE;
- sin DELETE.

El panel permite editar fecha, estado, título, tema, flyer, infografía, PDF, video, diapositivas y materiales complementarios.

## Calendario

Público:

- SELECT de actividades visibles.

Administrador autorizado + AAL2:

- INSERT;
- UPDATE;
- lectura de registros administrativos;
- sin DELETE.

Las actividades pueden retirarse de la vista pública con `visible = false`.

## Repositorio Accesible

Público:

- SELECT de recursos con `visible = true`.

Administrador autorizado + AAL2:

- INSERT;
- UPDATE;
- DELETE;
- lectura de recursos ocultos.

El panel permite administrar tres categorías:

- `materiales_disponibles`
- `equipos_tecnologicos`
- `materiales_elaborados`

La eliminación es una excepción deliberada respecto de Capacitaciones y Calendario: en Repositorio Accesible se permite borrar una tarjeta/recurso porque el contenido es un catálogo incremental y el administrador puede retirar registros que ya no deban mantenerse.

## Noticias destacadas

Público:

- SELECT de noticias con `visible = true`.

Administrador autorizado + AAL2:

- INSERT;
- UPDATE;
- DELETE;
- lectura de noticias ocultas.

El panel permite crear noticias breves con categoría, título, síntesis, imagen opcional, enlace opcional y visibilidad. Esta gestión afecta únicamente el carrusel **Noticias destacadas** de la portada principal; no modifica el módulo completo Noti Inclusivos.

La eliminación retira la tarjeta de la portada y queda registrada en auditoría.

## Auditoría

La tabla privada:

`private.auditoria_administrativa`

registra operaciones administrativas de Capacitaciones, Calendario y Repositorio Accesible.

Para Repositorio se auditan:

- INSERT;
- UPDATE;
- DELETE.

La auditoría registra el identificador de usuario, AAL y los datos anteriores/nuevos según la operación.

## Sesión del navegador

La sesión del panel se conserva temporalmente en:

`sessionStorage`

La contraseña no se almacena en GitHub ni en Supabase como texto visible. Los tokens de sesión no deben copiarse a repositorios, documentos públicos ni registros de diagnóstico.

## Restricción de altas

El hook:

`private.auth_restringir_creacion_admin(event jsonb)`

está configurado como **Before User Created**.

Solo los correos registrados en:

`admin_guard.admin_correos_autorizados`

pueden utilizarse para crear cuentas autorizadas dentro de este esquema de administración.

## Gate de privacidad

La operación del panel para gestionar contenido público no cambia el estado general de:

`private.supabase_preproduccion_gate`

El gate puede continuar en `false` mientras existan controles institucionales o jurídicos pendientes para otros tratamientos de datos personales.

La regla es:

- el panel puede gestionar contenido público con la cuenta autorizada y MFA;
- no se debe ampliar a nuevos formularios personales, Storage personal u otros tratamientos de datos personales sin cerrar previamente los controles aplicables.

## Verificación técnica

Después de modificar permisos o políticas se debe comprobar:

- `anon` no escribe;
- un usuario no autorizado no escribe;
- una cuenta autorizada con AAL1 no escribe;
- una cuenta autorizada con AAL2 realiza únicamente las operaciones previstas;
- DELETE sigue bloqueado en Capacitaciones y Calendario;
- DELETE está permitido únicamente en Repositorio Accesible para el administrador AAL2;
- los asesores de seguridad y rendimiento no presentan advertencias.
