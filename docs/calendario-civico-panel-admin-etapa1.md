# EVA 2.0 · Calendario cívico, interfaz administrativa (etapa 1)
Fecha: 2026-11-09.

## Alcance implementado
- Dentro de la pestaña `Calendario`, dos subpestañas: `Calendario institucional` y `Calendario cívico`.
- La vista institucional conserva los controles existentes de publicación, archivo y formulario `form-calendario`.
- La vista cívica obtiene el archivo público `../recursos/calendario-civico.json` solo con la sesión administrativa autorizada para el módulo.
- Filtros por mes, categoría y búsqueda. Listado seleccionable de efemérides.
- Programación preliminar en memoria: prioridad principal/secundaria, propuesta de visibilidad, horario diario según America/Lima y vista previa textual.
- La interfaz indica expresamente que NO guarda programaciones ni realiza publicaciones.
- Se integra con `permitePanel("calendario")` y con la limpieza de datos de sesión de `admin/admin.js`.
- Los datos y el esquema de Supabase existentes permanecen intactos. No se añaden escrituras RPC, REST ni migraciones.

## Archivos
- `admin/index.html`: subpestañas, campos y estructura de las vistas.
- `admin/calendario-civico-admin.js`: lectura, filtros, selección y previsualización.
- `admin/admin.css`: estilos responsive y contraste.
- `admin/admin.js`: integración con permisos y borrado por cierre de sesión.

## Pendiente de una etapa posterior
1. Modelar el almacenamiento de programación cívica y políticas RLS sin mezclarlo con `calendario_actividades` institucional.
2. Definir autorización de escritura únicamente para usuarios habilitados y verificar AAL2 donde corresponda.
3. Crear edición, guardado, validación, auditoría y estados de publicación, incluyendo conflictos cuando coincidan varias fechas.
4. Conectar la portada principal de EVA a una fuente pública segura; hacer aparecer y desaparecer tarjetas en zona `America/Lima` sin reservar espacios vacíos.
5. Probar visualmente en móvil, teclado y alto contraste, con sesión real y diferentes roles.
