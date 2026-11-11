# BDA, etapa 2: seguimiento de impresión de constancia Braille
Fecha: 10 de noviembre de 2026 (Perú).

## Alcance
Se amplió el registro agregado de BDA para contabilizar, por separado, las solicitudes de descarga de PNG de LSP y las **impresiones iniciadas** de la constancia simbólica Braille. La segunda acción se activa únicamente cuando una persona completa el 100 % de la práctica, abre la constancia y pulsa «Imprimir o guardar en PDF».

El navegador utiliza `window.print()`. El registro **no confirma** si se imprimió, si se seleccionó la opción «Guardar como PDF» o si se canceló el diálogo.

## Categorías admitidas
- `lsp / png / descarga_solicitada`: existente, sin cambios de significado.
- `braille / impresion / impresion_iniciada`: nueva categoría que contabiliza el inicio de la operación.
- Ningún otro formato ni combinación está permitido por la función del backend.

## Datos excluidos
No se transmiten nombre del participante, código de constancia, respuestas, puntuación, texto del documento, identidad ni PDF. Cada operación transmite únicamente una UUID efímera, herramienta, formato y acción. La base agrega fecha local Perú y cantidad; el mecanismo existente evita la duplicación por UUID.

## Integración
- BDA, `braille/practica.js`: invoca `EVARecursosBDA.registrarImpresionBraille()` antes de `window.print()`, solo si la constancia está habilitada y el diálogo abierto. Con fallo de red la impresión funciona.
- BDA, `estadisticas/recursos-bda.js`: amplía el cliente con compatibilidad para `registrarDescargaLsp()`.
- Accesos Complementarios, migración `20261111050000_bda_constancia_braille_impresion.sql`: amplía la lista autorizada de una función preexistente, sin crear nuevas tablas, cambiar esquemas de datos ni tocar registros históricos.
- Panel administrativo, `estadisticas-bda.js`: presenta indicadores separados de LSP PNG e impresiones iniciadas de constancias Braille, y desglose por fecha y recurso. Conserva control master MFA AAL2 y limpieza al cerrar sesión.
- Políticas de privacidad y tecnologías similares: actualizadas para explicar el nuevo evento.

## Pruebas automatizadas
- PostgreSQL temporal: la migración anterior se aplica primero y se comprueba su comportamiento previo; después se instala la migración nueva y se verifica una impresión nueva, deduplicación de UUID, denegación de combinaciones no autorizadas, fecha Perú e independencia respecto de MEA y LSP.
- Chromium en escritorio y vista móvil simulada: prueba la práctica al 100 %, la habilitación de constancia, que no se imprima sin habilitación, solicitud única de impresión, ausencia de nombre/código/puntaje en el payload y funcionamiento aun cuando el RPC responde con error.
- Regresiones de descarga PNG LSP y de panel MEA.
- BDA: https://github.com/crebeucayali/banco-digital-accesible/actions/runs/42960759985
- Accesos Complementarios: https://github.com/crebeucayali/accesos-complementarios/actions/runs/42960862010 y https://github.com/crebeucayali/accesos-complementarios/actions/runs/42960862159

## Puesta en funcionamiento y validación real pendiente
1. Publicar el backend antes del cliente BDA.
2. Comprobar en Supabase (solo lectura) que la acción previa de LSP se conserve y que la categoría Braille comience sin eventos ficticios.
3. Completar una práctica Braille con 100 % y abrir la constancia; pulsar una vez «Imprimir o guardar en PDF», independientemente de si finalmente se guarda o cancela.
4. Contrastarlo con `braille/impresion/impresion_iniciada` sin asociarlo a nombres, puntajes ni códigos.
5. Confirmar que el panel administrativo muestra la impresión **por separado** de las descargas LSP PNG.

La intervención queda aprobada técnicamente al superar las pruebas; el cierre operativo de la nueva categoría requiere una interacción real voluntaria y la comprobación en el panel.
