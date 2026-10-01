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
- Noticias destacadas de la portada principal;
- Galería de actividades;
- Estadísticas agregadas de visitas EVA.

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

El acceso compacto de la plataforma principal y el panel utilizan el mismo gestor de sesión, servido desde `/admin-sesion.js`. La sesión válida se recupera al abrir el panel; si Supabase informa AAL2, no se repite el desafío MFA.

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

## Galería

Público:

- SELECT de fotografías con `visible = true` y `publicacion_autorizada = true`.

Administrador autorizado + AAL2:

- INSERT;
- UPDATE;
- DELETE;
- lectura de tarjetas ocultas.

La Galería administra únicamente tarjetas fotográficas dentro de `recursos/galeria.html`. No crea nuevos subaccesos.

El panel exige título, imagen y texto alternativo. Para publicar una tarjeta también debe confirmarse explícitamente que la fotografía está autorizada para publicación institucional.

Los archivos de imagen permanecen alojados en EVA/GitHub; Supabase almacena solo metadatos y referencias.

## Estadísticas de visitas

La pestaña **Estadísticas** es de consulta administrativa y requiere sesión autorizada con MFA AAL2.

Presenta:

- total acumulado EVA;
- visitas del día;
- últimos 7 días;
- mes actual;
- visitas acumuladas por acceso.

La medición utiliza una sesión de 30 minutos de inactividad en el navegador. La base de datos conserva conteos agregados por fecha y módulo, no un perfil de cada visitante.

## Auditoría

La tabla privada:

`private.auditoria_administrativa`

registra operaciones administrativas de Capacitaciones, Calendario, Repositorio Accesible, Noticias destacadas y Galería.

Para Repositorio se auditan:

- INSERT;
- UPDATE;
- DELETE.

La auditoría registra el identificador de usuario, AAL y los datos anteriores/nuevos según la operación.

## Sesión del navegador

El acceso compacto y el panel utilizan la capa común `window.EvaAdminSession`, sobre la API HTTP existente de Supabase. No se incorpora un SDK ni una dependencia externa.

En navegadores con Web Locks y almacenamiento local disponible, la sesión se conserva en `localStorage`, bajo `eva_admin_supabase_session_v2`. La portada y el panel comparten el mismo origen. La sesión anterior de `sessionStorage` se migra una vez y se mantiene una copia temporal compatible durante la transición.

Web Locks coordina la renovación, el login, la verificación MFA, la comprobación administrativa y el logout entre pestañas. Una promesa compartida coordina las solicitudes de renovación dentro de cada pestaña.

Se renueva el token cuando quedan 90 segundos o menos, antes de las solicitudes protegidas y mediante comprobación proactiva cuando la página está visible. Las pestañas ocultas posponen la renovación proactiva; al volver a estar visibles se comprueba la sesión.

Los errores transitorios de red, timeout, HTTP 429, HTTP 5xx o carga de contenido no eliminan la sesión guardada. El panel ofrece "Reintentar acceso". Las respuestas explícitas de Supabase que identifican una sesión o refresh token revocado sí limpian la sesión.

AAL2 se conserva exclusivamente mediante el token que devuelve Supabase y se comprueba a través del RPC existente. No hay una bandera local que otorgue AAL2.

"Cerrar sesión" borra la sesión de este navegador y utiliza `scope=local` en Supabase, para conservar las sesiones independientes de otras personas que usan la misma cuenta. Si no se confirma el cierre remoto, la interfaz lo informa; la limpieza local se realiza igualmente. El cierre se comunica a las otras pestañas del mismo navegador.

Si Web Locks no está disponible, el gestor utiliza almacenamiento de pestaña y coordinación interna. Si el almacenamiento está restringido, la persistencia entre aperturas no está garantizada. No se guardan contraseñas, códigos MFA ni secretos del autenticador. Los campos de contraseña y código se limpian después del envío, y el secreto/QR de enrolamiento se limpia al completar MFA o cerrar la sesión.

La persistencia requiere cerrar la sesión al terminar de trabajar en un equipo compartido. Desde la migración `20260930225705`, la autorización administrativa valida el `session_id` contra `auth.sessions`, su pertenencia al usuario y vigencia, además del estado administrativo y el bloqueo Auth. Un access token anterior ya no autoriza operaciones administrativas después de la revocación efectiva de su sesión. La firma/caducidad JWT sigue siendo validada por Auth/PostgREST. Si el logout remoto no se confirma por un fallo de red, la interfaz informa ese resultado y debe comprobarse el cierre con conexión.

[Informe de cierre de sesiones y estadísticas](cierre-sesiones-estadisticas-master-2026-09-30.md).

Pruebas del panel: `node admin/tests/auth-session.test.cjs`.

[Informe de la etapa 2](https://github.com/crebeucayali/crebeucayali.github.io/blob/main/docs/autenticacion-etapa-2-sesion.md).

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
- DELETE está permitido en Repositorio Accesible, Noticias destacadas y Galería únicamente para el administrador AAL2;
- una fotografía visible en Galería requiere confirmación de autorización de publicación;
- los asesores de seguridad y rendimiento no presentan advertencias.

