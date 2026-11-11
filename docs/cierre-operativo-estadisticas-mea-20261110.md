# Cierre operativo de estadísticas de recursos MEA

**Fecha de cierre:** 10 de noviembre de 2026 (Perú).  
**Ámbito:** CREBE Señor de los Milagros, EVA, módulo Materiales Educativos Accesibles (MEA).  
**Estado:** cierre operativo del circuito de pictogramas PNG y cierre técnico-documental de la primera implementación de estadísticas de MEA. No equivale a certificación humana de las otras seis combinaciones.

## 1. Alcance implementado

Se identificaron e instrumentaron siete acciones de descarga/exportación en seis páginas:
- Pictogramas: PNG, `descarga_solicitada`.
- Rutinas visuales: JPG y PDF, `exportacion_iniciada`.
- Generador braille: PDF, `exportacion_iniciada`.
- Dactilología LSP: PDF, `exportacion_iniciada`.
- Apoyos LSP: PDF, `exportacion_iniciada`.
- Conciencia fonológica: HTML, `exportacion_iniciada`.

Se implantó el backend agregado `eva_recursos_api` en Supabase y el RPC público para el registro de eventos. El panel administrativo incluye la sección **Seguimiento > Uso de recursos**, visible solo para el master autenticado con MFA AAL2, con filtros de 7, 30, 90 y 365 días, resumen, evolución y distribución por herramienta y formato.

Las estadísticas son independientes de las visitas universales y por módulo. Los archivos curriculares no publicados, los materiales de RA, las aperturas de CAP y las descargas de BDA no forman parte de esta implementación.

## 2. Evidencia de producción y confirmación humana

El responsable comunicó que descargó un pictograma mediante la búsqueda de la palabra «comer» y después confirmó que el registro se visualizó en la sección administrativa de uso de recursos.

La consulta de solo lectura a Supabase en el cierre confirmó:
- `fecha = 2026-11-10` (zona local Perú).
- `herramienta = pictogramas`.
- `formato = png`.
- `accion = descarga_solicitada`.
- `total = 1`.

Por tanto, se considera **validado operativamente el circuito de pictogramas PNG**: acción de descarga, recepción de evento, incremento agregado y visualización por la cuenta administrativa.

El sistema no almacenó la palabra empleada en la búsqueda; «comer» es únicamente información comunicada por el responsable para identificar su prueba. Tampoco certifica que los archivos descargados por otros usuarios queden guardados en sus dispositivos.

## 3. Evidencias técnicas

- Fase 1: descargas de siete combinaciones en Chromium, con escritorio y móvil simulado, y fallos controlados del servicio de estadísticas. Se corrigió el botón PNG de pictogramas y la configuración CSP de los generadores LSP. Véase https://github.com/crebeucayali/materiales-educativos-accesibles/pull/11.
- Etapa 2: validación del despliegue público y CORS, prueba de agregación e idempotencia en base PostgreSQL temporal, sin alterar datos de producción. Véanse https://github.com/crebeucayali/materiales-educativos-accesibles/pull/12 y https://github.com/crebeucayali/accesos-complementarios/pull/26.
- Fase 3: panel de consulta para master MFA AAL2, filtros, gráficos y tablas, con pruebas de escritorio/móvil simulado. Véase https://github.com/crebeucayali/accesos-complementarios/pull/27.
- Fase 4: corrección de aislamiento entre sesiones master, limpieza de datos, alto contraste, diseño móvil y pruebas de regresión. Véase https://github.com/crebeucayali/accesos-complementarios/pull/28.
- Auditoría de referencia: `docs/fase4-auditoria-cierre-recursos-mea-20261110.md`.

## 4. Controles y privacidad

El registro transmite únicamente identificador efímero de operación, código de herramienta, formato y tipo de acción. La tabla de agregados conserva fecha y cantidad. Las tablas no tienen lectura pública directa. El panel requiere autorización administrativa master y MFA AAL2, comprobadas también desde el backend.

La UUID temporal deduplica reenvíos de la misma solicitud; una nueva solicitud con nueva UUID constituye otra acción. Las estadísticas anónimas no prueban identidad humana, visitantes únicos, finalización del guardado ni resultados pedagógicos.

## 5. Alcance de la validación y asuntos pendientes

**Cerrado:** implementación de backend, instrumentación de seis herramientas, panel administrativo, validaciones automatizadas y comprobación real de pictogramas PNG incluida su visualización en el panel.

**No declarado como validado físicamente:** las otras seis combinaciones de exportación, pruebas en todos los navegadores y teléfonos, recorridos completos por todos los filtros y cierre de sesión observado por el responsable, ni inspección manual con lectores de pantalla. Se conservan como comprobaciones operativas complementarias y no constituyen incidencias demostradas.

**No incluido en MEA:** seguimiento de archivos pendientes de publicación, seguimiento de descargas en BDA, aperturas externas de CAP o consultas de fichas RA.

## 6. Criterio de continuidad

El trabajo inicial de estadísticas MEA queda cerrado en su alcance implementado y auditado. Si se amplían acciones, formatos o herramientas, se deberá crear un nuevo inventario de eventos, verificar permisos y pruebas, actualizar la información de privacidad y realizar contraste real antes de declarar el nuevo alcance completado.

Próximo módulo propuesto: **BDA**, empezando por la opción de descarga de imágenes originales de señas, sin mezclar sus cifras con las de MEA ni con el contador de visitas.

Este cierre se registra sin generar eventos sintéticos en Supabase, sin modificar el contador EVA y sin realizar cambios de código funcional.
