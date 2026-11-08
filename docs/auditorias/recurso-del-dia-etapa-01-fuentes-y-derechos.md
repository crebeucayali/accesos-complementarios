# Auditoría de fuentes y derechos - Recurso del día EVA

Fecha de revisión: 8 de noviembre de 2026.
Etapa: 01 de 07. Alcance: solo análisis documental y del código.
Decisión funcional: un solo recurso por fecha, **seña LSP O pictograma ARASAAC**, programación mensual híbrida desde el panel; ubicación visual pendiente.

## 1. Repositorios y archivos revisados

- BDA: `crebeucayali/banco-digital-accesible/lsp/diccionario_lsp.json`, SHA de contenido `cd6b995c555510ac4fcfecb5c7f0f759faf0e772`; `lsp/app.js`; `lsp/creditos.html`; árbol de archivos de rama main.
- MEA: `crebeucayali/materiales-educativos-accesibles/pictogramas/pictogramas.js` y `pictogramas.html`.
- AC/panel: `crebeucayali/accesos-complementarios/admin/index.html` y `admin/ra-materiales-semana.js` como referencia de arquitectura de programación y permisos (no se editan).
- Fuentes externas: condiciones de uso oficiales de ARASAAC y guía del MINEDU (2015), enlaces al final.

## 2. Auditoría cuantitativa del catálogo LSP

Archivo: `lsp/diccionario_lsp.json` de BDA, 1.118 registros distribuidos en 31 categorías, incluidos vocabulario y secuencias. Campos detectados: `id`, `categoria`, `palabra`, `descripcion`, `archivo_imagen`, `fuente`.

- IDs ausentes: 0; IDs duplicados: 0.
- Palabras ausentes: 0; fuente ausente: 0; referencias de imagen vacías: 0.
- Rutas de imagen duplicadas: 0; formatos de ruta no esperados: 0.
- Descripciones vacías: **91** registros.
- Rutas de imagen del JSON sin archivo correspondiente en el árbol de GitHub: **4** registros.
- Registros sin ambos problemas anteriores: **1.023** (candidatos **técnicos**; NO equivalen a autorización de republicación ni a aprobación pedagógica).
- Secuencias especiales (himno nacional, padre nuestro, ave maría): 37 registros; no recomendar su fragmentación automática en señas individuales sin evaluar el contexto. Están entre los registros que requieren validación adicional.

Rutas de imagen faltantes:

| ID | Palabra | Referencia declarada | Diagnóstico preliminar |
|---|---|---|---|
| LSP-000092 | con | `imagenes/adverbios_y_preposiciones/con.png` | Existe `imagenes/adverbios_y_preposiciones/preposicion_con.png`; confirmar correspondencia antes de corregir |
| LSP-000630 | ministerio de educación | `imagenes/instituciones_y_lugares/ministerio_de_educación.png` | Existe `imagenes/instituciones_y_lugares/ministerio_de_educacion.png`; verificar acento |
| LSP-000730 | una | `imagenes/pronombres_personales/una_1.png` | No se encontró archivo exacto ni coincidencia simple |
| LSP-000954 | beber/tomar | `imagenes/verbos/beber-tomar.png` | No se encontró archivo exacto ni coincidencia simple |

Requisito para etapa 04: filtrar fichas con imágenes accesibles y descripciones útiles, distinguir vocabulario unitario de secuencias y someter recursos elegidos a validación de LSP.

## 3. Procedencia y derechos LSP

Todos los registros contienen `fuente: Ministerio de Educación del Perú - Guía de Lengua de Señas Peruana`. La página `lsp/creditos.html` reconoce esa procedencia e indica finalidad educativa no comercial. La ficha oficial de la guía 2015 en el repositorio MINEDU la señala como `openAccess`: https://repositorio.minedu.gob.pe/handle/20.500.12799/5545 .

**PENDIENTE JURÍDICO**: `openAccess` permite consulta, pero no demuestra por sí mismo una licencia abierta de redistribución o permiso para republicar las ilustraciones del libro en nuevas tarjetas dentro de EVA. El aviso de créditos del BDA tampoco sustituye el permiso del titular. Antes de incorporar imágenes individuales de LSP a una nueva sección: (a) identificar las condiciones de uso originales y titularidad, (b) documentar autorización o fundamento legal aplicable, y (c) si no puede verificarse, usar solo enlace al BDA en lugar de duplicar imágenes hasta contar con autorización. No crear una fuente o permiso supuesto.

**Requisito pedagógico**: la ilustración aislada puede no representar suficientemente movimiento, orientación de manos y expresión facial. Verificar cada seña y decidir si una imagen basta; cuando no, remitir a explicación completa del BDA o recurso autorizado.

Atribución mínima propuesta una vez verificados los derechos: `Lengua de Señas Peruana. Fuente: Ministerio de Educación del Perú, Guía de Lengua de Señas Peruana (2015). Recurso consultado en BDA, CREBE Ucayali.` Añadir indicación de adaptación si procede y enlace a la ficha original cuando exista ruta estable.

## 4. Integración actual de ARASAAC en MEA

`pictogramas/pictogramas.js` busca términos en `https://api.arasaac.org/api/pictograms/es/search/` y crea imágenes mediante `https://static.arasaac.org/pictograms/{id}/{id}_500.png`. Valida identificadores numéricos; presenta palabra y ID. `pictogramas.html` permite los orígenes `api.arasaac.org` y `static.arasaac.org` en CSP y ya contiene créditos generales en su pie. No se constató un catálogo local ya aprobado para programación mensual: la búsqueda actual no constituye validación editorial de una correspondencia palabra-pictograma.

Criterio para etapa 04: usar la API solamente para buscar candidatos, selección explícita por ID, vista previa, validación pedagógica, y máximo **1 pictograma por día por defecto**, ampliable a 2 o 3 cuando un concepto o secuencia lo requiera y se justifique. Nunca seleccionar automáticamente el primer resultado de búsqueda sin aprobación.

## 5. Licencias y atribuciones ARASAAC

- Condiciones oficiales ARASAAC: https://aulaabierta.arasaac.org/condiciones-de-uso .
- Modelo de atribución de ARASAAC: https://aulaabierta.arasaac.org/senalizacion-de-espacios-publicos-y-servicios-con-pictogramas-de-arasaac .
- CC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es .

La distribución de pictogramas está bajo CC BY-NC-SA, con crédito al creador Sergio Palao, procedencia ARASAAC y titularidad del Gobierno de Aragón. Debe respetarse la restricción no comercial y la obligación de compartir igual las adaptaciones; indicar cambios realizados cuando los haya. El uso de ARASAAC en una aplicación con publicidad, cobros o patrocinio comercial necesita una revisión específica antes de autorizarlo.

Texto propuesto para cada recurso de pictogramas:

> Pictograma: Sergio Palao. Procedencia: ARASAAC (https://arasaac.org). Propiedad: Gobierno de Aragón. Licencia: CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/). ID: [identificador]. [Indicar adaptación si corresponde].

El crédito será visible en la tarjeta diaria, no exclusivamente en el pie de EVA. Debe mantenerse enlace de origen, ID, estado de adaptación y metadatos para auditoría. No presentar la marca de ARASAAC como aval o patrocinio de EVA.

## 6. Modelo mínimo de metadatos para la etapa 02 (propuesta, no implementado)

Por recurso programable: fecha local (`America/Lima`), tipo exclusivo `LSP` o `ARASAAC`, identificador en su fuente, título aprobado, descripción/texto alternativo, URL confiable de imagen o enlace al módulo original, atribución, licencia/condición de reutilización, versión de fuente, fecha de revisión, revisor, estado `borrador/programado/publicado/retirado`, justificación de cambios y referencia a autorizaciones cuando aplique.

Reglas: un solo recurso por fecha; no duplicar un término como si fueran recursos diferentes; nunca publicar borradores; cambiar la selección por fecha local sin un cron repetitivo; no seleccionar automáticamente material no validado; registrar sustituciones y rechazos. La etapa 02 definirá esquema RLS y migración reversible.

## 7. Decisiones y bloqueo de avance

| Control | Estado al cierre de etapa 01 |
|---|---|
| Inventario LSP y estructura identificados | VERIFICADO |
| Auditoría de rutas y descripciones | VERIFICADO, con incidencias |
| Integración ARASAAC existente en MEA | VERIFICADA |
| Condiciones de atribución ARASAAC | VERIFICADAS, sujetas a caso de uso |
| Derecho a republicar ilustraciones LSP | **NO CONFIRMADO** |
| Validación pedagógica de 30 señas | NO REALIZADA |
| Selección de pictogramas para el mes | NO REALIZADA |
| Diseño de la base y panel | FUERA DE ETAPA 01 |
| Ubicación en portada | NO DECIDIDA |

**Dictamen**: etapa 01 completada como auditoría documental y técnica, con aprobación **condicionada** de la siguiente implementación. Se puede diseñar el modelo de datos de etapa 02, pero no activar publicaciones de imágenes LSP hasta verificar derechos y evaluación pedagógica de cada recurso. ARASAAC es reutilizable bajo las condiciones citadas, siempre que el proyecto y su uso específico respeten la licencia.

## 8. Integridad y reversibilidad

Este informe se incorpora únicamente en la rama `audit/recurso-del-dia-etapa-01` de `accesos-complementarios`. No se modificaron BDA, MEA, panel en producción, Supabase, repositorio principal EVA ni GitHub Pages. No se necesita reversión operativa.
