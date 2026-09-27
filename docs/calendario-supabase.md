# Calendario público con Supabase

## Objetivo

El Calendario de actividades utiliza Supabase como fuente principal de sus datos variables, manteniendo el HTML existente como respaldo local si la consulta remota no está disponible.

La apariencia general del calendario no se modifica. La migración afecta principalmente a la fuente de datos.

## Arquitectura

- GitHub Pages mantiene la interfaz, estilos, fotografías y estructura del calendario.
- Supabase mantiene las actividades públicas variables.
- Las sesiones del módulo Capacitaciones no se duplican en una segunda tabla: se reutilizan desde `public.capacitaciones_sesiones`.
- La vista `public.calendario_publico` integra ambos orígenes.
- Si Supabase no responde, el calendario conserva el contenido estático existente.

## Tabla de actividades

Tabla:

`public.calendario_actividades`

Campos principales:

- `fecha`
- `orden`
- `titulo`
- `contenido_lineas`
- `clase_css`
- `estado`
- `origen`
- `visible`
- `updated_at`

La tabla está destinada únicamente a programación pública. No debe utilizarse para nombres de participantes, datos de contacto, documentos de identidad ni otros datos personales.

## Migración inicial

Se migraron 153 celdas con contenido correspondientes al calendario existente entre abril y octubre de 2026.

Se conservaron, según correspondía:

- actividades internas;
- trabajo colegiado;
- feriados;
- capacitaciones;
- sensibilizaciones;
- reuniones;
- asistencias técnicas;
- semanas de gestión;
- actividades en planificación;
- otras actividades institucionales publicadas en el calendario.

Noviembre y diciembre permanecen preparados para recibir información dinámica. Las sesiones de Capacitaciones ya programadas para noviembre se obtienen automáticamente de la vista integrada.

## Reutilización de Capacitaciones

La vista:

`public.calendario_publico`

combina:

1. `public.calendario_actividades`
2. `public.capacitaciones_sesiones`

Las sesiones de Capacitaciones se presentan como actividades del calendario sin crear una copia adicional del registro.

Por ello, cuando se actualice en Supabase una sesión de Capacitaciones, el Calendario podrá reflejar la fecha y la información correspondiente sin volver a introducir esos datos en otra tabla.

## Seguridad

`public.calendario_actividades` tiene RLS habilitado y forzado.

Permisos públicos:

- `anon`: `SELECT`
- `authenticated`: `SELECT`
- sin `INSERT`, `UPDATE` o `DELETE` desde el navegador público.

La política pública permite leer únicamente filas con `visible = true`.

La vista `public.calendario_publico` utiliza `security_invoker = true`, por lo que respeta los permisos y políticas de las tablas subyacentes.

## Frontend

Archivo:

`recursos/calendario-supabase.js`

Realiza una consulta REST de solo lectura con la clave publicable del proyecto.

No utiliza:

- Supabase Auth;
- sesiones de usuario;
- cookies propias de autenticación;
- `localStorage` para la integración;
- claves secretas o `service_role`.

El documento HTML identifica la fuente activa mediante:

```js
document.documentElement.dataset.calendarioFuente
```

Valores previstos:

- `supabase`
- `respaldo-local`

## Respaldo local

El contenido estático previo no fue eliminado de `recursos/calendario.html`.

Si la consulta remota falla, el usuario sigue viendo ese contenido. Esto permite mantener continuidad mientras se valida el uso de Supabase durante el periodo de actividades.

## Alcance de privacidad

El Calendario utiliza exclusivamente información pública de programación institucional. Esta migración no habilita Supabase Auth ni amplía el proyecto a datos personales.

La puerta preproducción para Auth y datos personales continúa bloqueada hasta cerrar los controles institucionales, jurídicos y operativos pendientes.
