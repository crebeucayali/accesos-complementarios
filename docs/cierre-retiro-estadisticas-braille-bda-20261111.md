# Cierre operativo: seguimiento de descargas BDA, exclusión de Braille

**Fecha:** 11 de noviembre de 2026 (Perú).  
**Decisión funcional:** conservar solo la estadística de solicitudes de descarga de imágenes PNG de Lengua de Señas Peruana en BDA; descartar la incorporación de impresiones de constancias Braille al seguimiento BDA.

## 1. Motivo

El responsable del proyecto informó que MEA ya dispone de dos modalidades de práctica Braille, básica y por niveles/personalizada, con constancias simbólicas y un sistema específico de seguimiento pedagógico mediante Google Apps Script y hoja de cálculo. Para evitar redundancia de funciones entre módulos, la práctica básica adicional de BDA se evaluará para su retiro en la reestructuración RA+BDA. Por lo tanto, no corresponde mantener como categoría permanente de BDA el contador añadido para «impresión iniciada» de su constancia.

## 2. Reversión efectuada

- En `crebeucayali/banco-digital-accesible`: se restauró el cliente estadístico que registra únicamente `lsp/png/descarga_solicitada`; se retiró la llamada estadística del botón Braille, manteniendo temporalmente el funcionamiento original `window.print()`; se restauraron cargas y versiones del script LSP, así como las pruebas de regresión.
- En `crebeucayali/accesos-complementarios`: se restauró el bloque administrativo BDA limitado a descargas de imágenes LSP y se retiraron de las políticas las referencias de medición de constancias Braille, sin tocar el contador de MEA.
- En Supabase: una nueva migración devuelve `eva_recursos_api.registrar_bda` a su lista de aceptación original, únicamente `lsp/png/descarga_solicitada`; se preservan tablas, derechos, agregados e historia de migraciones. No se eliminó ninguna tabla ni se generaron eventos artificiales.

## 3. Evidencias

- PR backend/panel: https://github.com/crebeucayali/accesos-complementarios/pull/34, fusionada en `main`, commit `9d7df4cce129bb85ee391341d74f2a56c08ddb35`.
- PR cliente BDA: https://github.com/crebeucayali/banco-digital-accesible/pull/11, fusionada en `main`, commit `8de546442a37fcbff4947e1131ec890d975d2e72`.
- Pruebas automáticas: BDA Chromium https://github.com/crebeucayali/banco-digital-accesible/actions/runs/42963362805; SQL https://github.com/crebeucayali/accesos-complementarios/actions/runs/42963357445; panel BDA https://github.com/crebeucayali/accesos-complementarios/actions/runs/42963357345; panel MEA https://github.com/crebeucayali/accesos-complementarios/actions/runs/42963357394. Todas finalizaron con `success`.
- Supabase producción, consulta de solo lectura después de aplicar la migración: BDA `lsp/png/descarga_solicitada` total `1`, cero filas en agregados BDA cuya herramienta fuera `braille`; MEA `pictogramas/png/descarga_solicitada` total `1`. La definición vigente de `eva_recursos_api.registrar_bda` no contiene la palabra `braille`.

## 4. Alcance de la decisión

**Cerrado:** estadísticas de solicitudes de descarga PNG de LSP en BDA, con prueba humana anterior, panel administrativo y backend seguros.

**Descartado:** seguimiento agregado de impresión de constancia simbólica Braille en BDA. La migración de habilitación previa se conserva como antecedente en la historia del repositorio, pero quedó neutralizada por una migración posterior.

**Conservado sin cambios:** práctica básica y personalizada de Braille en MEA, su seguimiento pedagógico condicionado al consentimiento mediante Google Apps Script y su hoja de cálculo, y las estadísticas independientes de visitas EVA y de recursos MEA.

**No realizado en esta intervención:** eliminar la página Braille de BDA; fusionar RA con BDA; cambiar rutas, imágenes, permisos de recursos RA, enlaces QR o categorías administrativas.

## 5. Continuidad aprobada para análisis

Se debe verificar antes de desarrollar la reestructuración propuesta entre RA y BDA: compatibilidad de sus rutas, componentes JS/CSS, catálogos dinámicos de Supabase, fichas y anclas individuales, panel administrativo, imágenes, estadísticas de visitas, SEO, accesibilidad, enlaces públicos antiguos y recursos incorporados al índice central de EVA.

Este documento registra el cierre operativo y sirve como referencia para que ninguna ampliación posterior de estadísticas vuelva a incorporar, por accidente, la impresión de constancias Braille de BDA.
