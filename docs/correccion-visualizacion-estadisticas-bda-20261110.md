# Corrección de visualización administrativa de descargas BDA

Fecha: 10 de noviembre de 2026 (Perú).

## Incidencia
El responsable informó una descarga real de una imagen LSP vinculada a la búsqueda «matrimonio», pero no apareció en el panel de EVA. La consulta de solo lectura a Supabase confirmó un registro `lsp/png/descarga_solicitada` con `total=1`, del 10 de noviembre de 2026 (22:59 hora peruana). BDA no almacena la palabra buscada.

## Causa verificada
El componente «Uso de recursos educativos» del panel consultaba únicamente el RPC administrativo de MEA. Aunque la infraestructura y el registro de BDA ya estaban implementados, faltaba incorporar su presentación en el panel. La ausencia de la cifra en la interfaz no implicaba pérdida del evento en Supabase.

## Corrección aplicada
Se añadió en la sección de seguimiento un bloque independiente «Descargas de imágenes LSP» con filtros de 7, 30, 90 y 365 días, total de solicitudes PNG y desglose por fecha. Consulta `public.admin_estadisticas_recursos_bda(p_dias)` mediante la sesión existente, con autorización `master` y MFA AAL2. El componente se limpia al cerrar sesión y anula respuestas antiguas. No suma sus resultados a MEA ni a los contadores de visitas EVA.

## Pruebas
- Validación del bloque BDA en Chromium, escritorio y móvil simulado: https://github.com/crebeucayali/accesos-complementarios/actions/runs/42956878631
- Regresión del panel MEA: https://github.com/crebeucayali/accesos-complementarios/actions/runs/42956878599
- Ambas verificaciones aprobaron, sin eventos sintéticos en producción.

## Validación operativa pendiente
Con el panel publicado y una sesión master MFA AAL2, entrar a Seguimiento > Uso de recursos educativos. En el nuevo bloque BDA, seleccionar «Últimos 30 días» y confirmar una solicitud de LSP PNG. El bloque MEA debe conservar separadamente su solicitud anterior de pictogramas PNG. Esta revisión real no se puede sustituir por las pruebas de Chromium con datos simulados.

No se modifica el inventario de 1118 imágenes ni se extiende el seguimiento a búsquedas, ampliaciones o recursos externos.
