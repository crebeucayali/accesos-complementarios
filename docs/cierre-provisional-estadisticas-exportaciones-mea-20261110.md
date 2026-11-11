# Implementación inicial de métricas de descargas MEA
Fecha: 10 de noviembre de 2026 (Perú).

## Estado
Primera implementación de registro agregado publicada en ramas main de Accesos Complementarios y MEA. Pruebas automatizadas aprobadas. Validación física de descargas en PC y móvil todavía pendiente; no declarar cierre funcional completo.

## Cambios
- Migración Supabase `estadisticas_recursos_mea`: esquema privado `eva_recursos_api`; tabla agregada diaria y tabla de UUID efímeras para deduplicación.
- Función pública `registrar_accion_recurso_mea` con validación estricta de combinaciones. Función de lectura `admin_estadisticas_recursos_mea(p_dias)` autorizada exclusivamente para master con MFA AAL2.
- MEA `estadisticas/recursos-mea.js?v=1`: cliente no bloqueante, registra acción, herramienta y formato, sin enviar texto, palabras, nombre de archivo, imágenes ni identificadores de usuario.
- Instrumentación en 6 herramientas y 7 combinaciones: pictogramas PNG; rutinas JPG/PDF; braille PDF; dactilología LSP PDF; apoyos LSP PDF; conciencia fonológica HTML.
- No se cuentan consultas, vistas previas, fallos de generación ni la impresión/PDF desde el navegador en conciencia fonológica.
- Políticas institucionales de privacidad y cookies actualizadas.

## Evidencias
- PR #24 AC fusionada; PR #10 MEA fusionada.
- GitHub Actions SQL PostgreSQL temporal 42944594807: aprobado, con deduplicación, validación de formato y control de acceso MFA.
- GitHub Actions Node 42944736164: aprobado, incluyendo tipos de evento, petición sin contenido pedagógico, fallos de red y scripts.
- Verificación posterior de las seis páginas en GitHub: `recursos-mea.js?v=1` presente y `visitas-eva.js?v=3` conservado.
- Supabase después de integración: 0 filas agregadas y 0 claves de eventos al momento de consulta. El contador universal histórico permanecía en 1239 sesiones sin intervención.

## Limitaciones
- La interacción en un sitio público puede simularse artificialmente; los datos son indicativos, no confirmación de visitantes humanos o aprendizaje.
- No se puede garantizar que el archivo haya quedado guardado en el equipo; se cuenta la acción de exportación/descarga solicitada, luego de alcanzar el punto técnico correspondiente.
- Los tests actuales no ejecutaron de manera física las siete descargas en teléfonos. Queda pendiente verificar PC/móvil y propagación de CDN de GitHub Pages.
- El panel administrativo todavía no tiene una nueva sección gráfica para estas estadísticas; el RPC de consulta ya está disponible bajo MFA AAL2.
- No se miden los archivos de adaptaciones no publicados ni se incorpora BDA, CAP o RA.

## Próxima intervención
1. Prueba humana en móvil y PC de las herramientas MEA, incluyendo error de red y recuperación.
2. Revisar el primer registro real agregado mediante consulta de solo lectura, sin fabricar eventos de prueba en las estadísticas históricas.
3. Incorporar al panel administrativo una sección independiente de uso de recursos con periodos de 7, 30, 90 y 365 días, tras validar el circuito.
