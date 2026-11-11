# Inventario técnico de descargas y exportaciones de EVA
Fecha: 10 de noviembre de 2026 (Perú)
Alcance: lectura de código en ramas principales de MEA, BDA, CAP y RA. No se incorporaron rastreadores ni registros en Supabase.

## Criterios
- **Exportación propia:** archivo producido en el navegador con `pdf.save`, Blob, enlace `download` o equivalente.
- **Descarga directa de imagen:** botón de descarga explícito, con posible dependencia de CORS o del navegador.
- **Enlace externo:** acceso a archivos o sitios fuera de EVA; un clic no demuestra la descarga.
- **Pendiente:** existe interfaz o descriptor pero el archivo está marcado `publicado:false` o sin enlace.
- **Consulta:** ver PDF, imagen, ficha o vista previa no es descarga.
- Registrar **acciones de exportación iniciadas** o **completadas en el código**; el navegador no confirma necesariamente que el usuario conservó el archivo.

## MEA: exportaciones y descargas disponibles
1. `pictogramas/pictogramas.js`: botón por pictograma **Descargar PNG** desde imágenes de ARASAAC. La función solicita el recurso, crea Blob y activa enlace `download`; ante fallos se abre la imagen externa. Diferenciar descarga iniciada de la ruta alternativa de visualización.
2. `rutinas/rutinas.js`: generador de rutinas visuales con **JPG** y **PDF**; función `descargarJpg` y `descargarPdf`. La exportación ocurre luego de renderizar imágenes y preparar el archivo; pueden producirse errores.
3. `generador/generador.js`: generador braille, **PDF** con `pdf.save("recurso-braille.pdf")`.
4. `generador-lsp/generador-senas.js`: recurso visual de dactilología LSP, **PDF horizontal**, con `pdf.save`.
5. `apoyos-lsp/generador-lsp.js`: generador de palabras y apoyos LSP, **PDF horizontal**, con `pdf.save`.
6. `conciencia-fonologica/conciencia-fonologica.js`: ficha de silabeo, **HTML** generado en el navegador con Blob y enlace `download`. No confundir con un PDF.
7. `adaptaciones-curriculares/panificacion-dua/documentos.js`, `costa-peruana-original/documentos.js`, `costa-peruana-adaptada-tea/documentos.js`: tres pares PDF/DOCX, **seis archivos previstos y marcados `publicado:false`**. Los enlaces solo se construyen si se publica el documento. No medir como descargables vigentes.

## BDA: descargas y enlaces
1. `lsp/visor-senas.js`: **Descargar imagen original** de una seña, mediante atributo `download`. La imagen depende del origen y las condiciones de uso del material. Diferenciar ampliar imagen de pulsar descargar.
2. `biblioteca/biblioteca.js`: construye enlaces de acceso a recursos bibliográficos, y prioriza etiquetas de formato tales como `Descargar EPUB`; la etiqueta no garantiza un recurso activo.
3. `biblioteca/datos/recursos.json`: cuatro fichas verificadas; **una ficha de criterios enlazada a página web y tres fichas pendientes sin enlace**. No hay actualmente un EPUB activo identificado en este catálogo. Evitar incluir las tres fichas pendientes como descargas.
4. No se identificaron otras funciones `download` propias en BDA mediante la búsqueda de código realizada; un examen manual completo de todas las rutas podría descubrir otros mecanismos.

## CAP: documentos y recursos externos
1. `app.js`: primera jornada; muestra archivos de flyer/infografía e integra PDF y videos alojados en Google Drive mediante vista previa y enlace `Abrir PDF en Drive`. No se encontró descarga controlada por EVA en el código revisado.
2. `segunda-jornada.js`: segunda jornada; `diapositivas_url`, `pdf_url`, vistas previas y enlace `Abrir diapositivas/PDF en Drive`. La descarga, de realizarse, ocurre en Drive y no puede confirmarse desde el enlace de CAP.
3. Los accesos a Drive se presentan con aviso de conexión a tercero y deben mantener ese comportamiento. Si se mide algo, registrar **apertura de recurso externo**, nunca "descarga confirmada".
4. Las entradas sin enlace/pendientes deben excluirse.

## RA: no aplica la misma métrica de descarga
- El catálogo de materiales disponibles, elaborados y equipos tecnológicos presenta fichas e imágenes de materiales físicos.
- La búsqueda de código no identificó una función de descarga de recursos equivalente a MEA.
- Su posible indicador futuro sería **fichas abiertas** (sin guardar identificadores de visitantes), separado de las exportaciones.

## Propuesta de eventos (sin implementar)
- `exportacion_generada`: generadores propios de MEA, distinguibles por herramienta y formato.
- `descarga_solicitada`: descarga de PNG (MEA) e imagen de seña (BDA).
- `recurso_externo_abierto`: CAP, solo cuando el usuario activa el enlace.
- `ficha_consultada`: RA, en etapa diferente.
- No registrar la palabra escrita, pictograma elegido, imagen personalizada, título de documento externo privado ni datos personales. Usar códigos de herramientas y tipos de archivo, más fecha y conteo.
- Distinguir ejecución exitosa del código de archivo finalmente guardado, ya que el navegador no asegura este último resultado.

## Prioridades
1. MEA: exportaciones de rutinas JPG/PDF, braille PDF, LSP PDF y ficha HTML; descarga PNG de pictogramas.
2. BDA: descarga de imagen de señas.
3. CAP: apertura de PDF/diapositivas de Drive, con nombre correcto del evento.
4. RA: aperturas de fichas, opcional y separada.
5. Adaptaciones curriculares y biblioteca: incorporar la métrica únicamente cuando sus enlaces estén realmente publicados.

## Pendientes de la etapa de implementación
- Auditar controles de permisos, CSP, errores, y términos/licencias de descarga de imágenes externas.
- Diseñar esquema agregado `fecha, modulo, herramienta, accion, formato, total` con RPC restringido y sin perfiles individuales.
- Pruebas automáticas para evento válido, fallo de exportación, doble clic y concurrencia sin afectar contadores de visitas.
- Añadir un panel administrativo solo si el dato aporta decisiones; no introducir seguimiento de navegación ni invadir el contenido de los archivos.

Fuentes de código: repositorios `crebeucayali/materiales-educativos-accesibles`, `banco-digital-accesible`, `capacitaciones` y `repositorio-accesible`, rama principal, inspección realizada el 10 de noviembre de 2026. Inventario funcional de código, no certificación de descarga real en todos los navegadores.
