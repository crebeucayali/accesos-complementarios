# Procedimiento operativo conjunto: Capacitaciones y Calendario

## Objetivo

Este procedimiento define cómo actualizar los dos espacios dinámicos del EVA que actualmente utilizan Supabase: Capacitaciones y Calendario.

La regla principal es evitar duplicar información. Una sesión de Capacitación se administra en `public.capacitaciones_sesiones` y el Calendario la reutiliza automáticamente mediante `public.calendario_publico`.

## Actualización de una sesión de Capacitación

Para una sesión nueva o pendiente se revisan:

- jornada;
- número de sesión;
- fecha;
- título definitivo;
- tema;
- estado;
- infografía;
- PDF;
- video;
- diapositivas;
- materiales complementarios.

Cuando la sesión cambia en `public.capacitaciones_sesiones`, el Calendario recibe automáticamente su fecha y contenido. No debe crearse una segunda actividad manual para representar la misma sesión.

## Actualización de una actividad institucional

Para una actividad que no pertenece a Capacitaciones, la información mínima es:

- fecha;
- tipo o título de actividad;
- institución, lugar o destinatario, cuando corresponda;
- tema o descripción breve, cuando corresponda;
- estado.

Estados permitidos:

- `confirmada`;
- `planificacion`;
- `interna`;
- `feriado`;
- `cancelada`.

Clases visuales permitidas:

- sin clase especial;
- `feriado`;
- `lunes-colegiado`;
- `sin-foto-consentimiento`.

## Regla para "En planificación"

Si una fecha tiene un registro genérico `En planificación` y posteriormente se confirma la actividad de ese día, el registro existente debe actualizarse en lugar de añadir otro registro con la misma finalidad.

Para las operaciones administrativas se creó:

`private.registrar_actividad_calendario(fecha, contenido_lineas, estado, clase_css)`

La función sigue esta regla:

1. busca un marcador visible `En planificación` en la fecha;
2. si existe, reutiliza y actualiza ese registro;
3. si no existe, crea una nueva actividad;
4. si ya existe una actividad visible con el mismo título en la misma fecha, rechaza el duplicado.

La función no está disponible para `anon` ni `authenticated`; es una herramienta administrativa.

## Días con varias actividades reales

Dos o más actividades distintas pueden coexistir en una misma fecha.

Ejemplo:

- actividad institucional;
- sesión de capacitación.

El frontend identifica esos días con `celda-multiples-actividades` y mantiene cada actividad separada visualmente dentro de la misma celda.

## Control privado

La vista:

`private.calendario_control_operativo`

permite identificar:

- cantidad de actividades del Calendario;
- cantidad de sesiones de Capacitaciones;
- total publicado por fecha;
- marcadores `En planificación`;
- fechas con múltiples actividades;
- marcadores de planificación que entren en conflicto con una actividad ya definida.

El valor `marcador_en_conflicto = true` requiere revisión antes de considerar estable la fecha.

## Respaldo

El HTML existente continúa como respaldo local.

Si la consulta a Supabase funciona:

`document.documentElement.dataset.calendarioFuente === "supabase"`

Si falla:

`document.documentElement.dataset.calendarioFuente === "respaldo-local"`

## Datos personales

Este flujo está limitado a información pública de programación institucional. No debe utilizarse para almacenar nombres de participantes, teléfonos, correos, documentos de identidad u otros datos personales.

Supabase Auth continúa fuera de alcance mientras la puerta preproducción permanezca bloqueada.
