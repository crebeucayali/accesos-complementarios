# Ampliación de Galería a ocho fotografías

Fecha de comprobación: 1 de octubre de 2026, America/Lima.

El máximo por actividad pasó de 5 a 8 fotografías en `crebeucayali/accesos-complementarios` y en la restricción SQL correspondiente del proyecto EVA. Se conserva el flujo existente. La implementación y las pruebas automatizadas, transaccionales y visuales son conformes. Falta comprobar una carga física de ocho archivos desde una sesión master real; las pruebas de subida de esta intervención utilizaron transporte simulado.

Los límites anteriores estaban en la selección de archivos, la validación previa al guardado y el recorte al cargar una actividad existente en `admin/admin.js`; en dos recortes de la colección pública en `recursos/galeria-supabase.js`; en dos textos del formulario; en la documentación de Galería y Storage; y en `galeria_item_imagenes_orden_check`, que admitía órdenes de 1 a 5. No se encontraron otros límites de cantidad en RPC, triggers o Storage. Las reglas CSS para una composición de cinco fotografías se conservaron porque siguen siendo necesarias.

| Archivo modificado o creado | Cambio |
| --- | --- |
| `admin/admin.js` | Constante local de máximo 8, selección, edición y guardado; validación completa del lote antes de incorporarlo a la vista previa. |
| `admin/index.html` | Dos textos pasan a 1–8; versiones de JavaScript y CSS actualizadas. |
| `admin/admin.css` | Vista previa de Galería en una columna hasta 620 px para evitar desbordamiento de sus controles. |
| `recursos/galeria-supabase.js` | Conserva y muestra hasta ocho imágenes por actividad. |
| `recursos/galeria.css` | Mosaicos para 6–8; título legible en alto contraste. |
| `recursos/galeria.html` | Versiones de los recursos de Galería actualizadas. |
| `docs/galeria-supabase.md` | Documentación del máximo actual. |
| `docs/storage-imagenes-supabase.md` | Documentación del máximo actual; 5 MB por archivo se conserva. |
| `admin/tests/gallery-images.test.cjs` | Pruebas del editor real con DOM y transporte simulados. |
| `admin/tests/gallery-eight-rollback.sql` | Pruebas reales de restricciones, RLS, publicación, referencias, permisos y auditoría, terminadas en ROLLBACK. |
| `supabase/migrations/20261002001349_ampliar_galeria_hasta_ocho.sql` | Nueva migración aplicada: órdenes permitidos de 1 a 8. |
| `docs/ampliacion-galeria-ocho-2026-10-01.md` | Este informe y el procedimiento de comprobación física. |

Fue necesario modificar Supabase únicamente mediante esa migración. La tabla relacionada `public.galeria_item_imagenes`, la tabla padre `public.galeria_items` y la restricción única `(galeria_item_id, orden)` permanecen. El rango 1–8 y esa unicidad impiden una novena referencia. No se reejecutaron migraciones anteriores, no se migraron fotografías y no se modificaron políticas, permisos, RPC, triggers o buckets. El archivo de migración se generó con Supabase CLI y su nombre se sincronizó con la versión registrada al aplicarlo mediante el conector.

La selección usa la colección vigente del editor, que ya incorpora las retiradas individuales. Se comprobaron `5 + 1`, `5 + 2` y `5 + 3`, todos permitidos; `5 + 4`, rechazado sin modificar la colección ni iniciar subidas; y `5 - 1 + 4`, permitido. La selección de nueve desde una actividad nueva también se rechaza íntegramente. El mensaje informa del máximo de ocho y de los espacios restantes. El guardado vuelve a validar el total antes de cualquier solicitud de Storage o escritura. Los textos alternativos siguen siendo individuales y obligatorios, incluidos los de las fotos 6, 7 y 8.

Las composiciones públicas de 6 y 8 utilizan dos imágenes por fila. La de 7 mantiene dos por fila y centra la última con más ancho. Las composiciones de 1 a 5 mantienen sus reglas. No se añadió carrusel. El visor existente conserva la ampliación por teclado, cierre con Escape y devolución del foco. En la vista previa administrativa se mantiene la cuadrícula existente en escritorio; en móvil, cada tarjeta coloca la miniatura encima de sus controles. La comprobación también detectó y corrigió el título oscuro sobre fondo negro en alto contraste, exclusivamente dentro de Galería.

| Prueba ejecutada | Resultado |
| --- | --- |
| 28 pruebas nuevas del editor + 14 regresiones existentes de publicación | 42 conformes. Creación con 1, 5, 6, 7 y 8; bloqueo de 9; edición; retirada individual; alternativos; lote inválido; autorización para publicar y MFA para subir. |
| SQL en Supabase con roles y datos sintéticos | 42 comprobaciones conformes; ROLLBACK completo. Guarda 1–8, bloquea 9, rechaza orden repetido/cero y alternativos vacíos; comprueba edición y atomicidad del lote. |
| Renderizadores reales con datos simulados | 64 estados conformes: panel y página pública, cantidades 1–8, anchos 1366, 768, 390 y 320 px. Sin errores JavaScript ni desbordamiento horizontal de las vistas previas o mosaicos. |
| Teclado y alto contraste | Campos alternativos editables, retirada individual, apertura/cierre del visor y retorno del foco conformes; títulos y etiquetas legibles. |
| Lectura real de un archivo ya existente en Storage | HTTP 200; JPEG válido de 227 217 bytes. No se alteró ni se volvió a subir. |

La prueba SQL mostró ocho referencias públicas al publicar, ninguna al archivar y las ocho nuevamente al volver a publicar. Durante el archivado, el registro, las ocho referencias y los ocho metadatos sintéticos de Storage se conservaron. Master pudo restaurar y eliminar definitivamente con la cascada de referencias ya existente. Eliminar referencias no introdujo un borrado físico de Storage. Editor pudo archivar y volver a publicar Galería asignada, pero no crear, editar estructura, agregar o retirar imágenes, modificar alternativos, usar DELETE ni escribir en Storage. Las operaciones conservaron sus eventos y contexto de auditoría.

Los metadatos de Storage de las pruebas SQL son registros transaccionales, no archivos físicos. Las subidas del editor se verificaron con el transporte simulado: cantidades correctas, rutas y bucket existentes, y cero solicitudes cuando se supera el límite. No se afirma haber realizado una subida física autenticada de ocho archivos. El bucket `eva-publico`, sus rutas, tipos WebP/JPEG/PNG y máximo de 5 MB por imagen siguen iguales.

Tras las pruebas, coincidieron las huellas completas de las actividades e imágenes existentes, las políticas y los buckets. También permanecieron los recuentos de usuarios Auth, sesiones, objetos y auditoría: no quedó contenido ni cuenta de prueba persistente. Security Advisor no añadió hallazgos: mantiene los dos avisos informativos de tablas privadas sin políticas y la advertencia previa de protección contra contraseñas filtradas. Performance Advisor solo informó dos índices sin uso, ajenos a este cambio. No se modificó ninguna configuración de Auth. Referencias de los avisos existentes: [tablas privadas sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) y [protección contra contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Para completar la prueba física, el master puede crear una actividad de prueba en borrador con ocho imágenes seguras, completar los ocho textos alternativos y guardar. Deben reaparecer ocho miniaturas al seleccionar de nuevo la actividad. Intentar añadir otra debe rechazarla sin iniciar subida. Para probar edición, conservar cinco fotografías y agregar tres debe permitir guardar; seleccionar cuatro debe bloquearse. La publicación, el archivado y la restauración pueden comprobarse después con imágenes cuya publicación institucional esté autorizada, verificando ocho, cero y ocho fotografías en la página pública, respectivamente. Esta intervención no realizó esa prueba con credenciales personales.

Autenticación, MFA, sesiones, usuarios, roles, invitaciones, estadísticas y los demás módulos permanecen sin cambios. Las capacidades de master y editor se conservaron y se verificaron directamente mediante RLS y RPC dentro de la transacción.
