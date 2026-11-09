# EVA 2.0 - Inicio de implementación de calendarios

Fecha: 2026-11-09.

## Objetivo
Separar las dos rutas públicas de calendario: calendario institucional por año y calendario cívico único actualizable anualmente.

## Implementación pública inicial
- `recursos/calendarios.html`: página de entrada con dos tarjetas independientes.
- `recursos/calendario.html`: conserva la presentación histórica 2026 y agrega pestañas 2026/2027.
- `recursos/calendarios-anios.json`: lista de años habilitados; el año predeterminado corresponde al año actual de `America/Lima` cuando esté incluido, con alternativa al último año configurado no futuro.
- `recursos/calendario-anios.js`: controla el selector y presenta los meses del año alternativo.
- `recursos/calendario-supabase.js`: mantiene una sola consulta a `calendario_publico`; la vista 2026 sigue usando su cuadrícula existente y los demás años reciben los mismos resultados públicos agrupados por fecha.
- `recursos/calendario-civico.html`: página independiente y permanente, por ahora sin registros; no se han inventado conmemoraciones ni fuentes.
- `recursos/calendarios.css`: estilo para el acceso de dos tarjetas y la página cívica.
- Portada AC y portada principal EVA: enlaces hacia el nuevo índice de calendarios.

## Límites y tareas pendientes
- No se modificó Supabase, sus políticas ni el panel administrativo.
- El calendario cívico aún requiere modelo de datos, controles editoriales, fuentes comprobadas, revisión de fechas variables y gestión administrativa.
- La tarjeta cívica temporal del repositorio principal no está activada.
- El calendario institucional actual incorpora una estructura histórica fija para 2026; la vista de 2027 utiliza una presentación de registros mensuales. La unificación posterior de formatos y una solución genérica para años posteriores requieren trabajo adicional.
- Se requiere validación visual y autenticada/publicada real, incluidos navegador móvil, contraste, ausencia de datos, latencia y cambio de año.
- El JSON configura años de navegación, no es una copia del contenido de eventos; la consulta a Supabase sigue siendo fuente de actividades publicadas.
