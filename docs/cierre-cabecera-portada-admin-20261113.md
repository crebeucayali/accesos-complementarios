# Cierre técnico de corrección visual: cabecera y portada del panel administrativo EVA

**Fecha:** 13 de noviembre de 2026 (Perú).  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Incidencia:** visualización ampliada y recorte horizontal en cabecera/portada del panel `/admin/`, según captura del responsable con zoom del navegador al 100 %.  
**Auditoría previa:** `docs/auditoria-cabecera-portada-admin-20261113.md`.  
**Pull request:** https://github.com/crebeucayali/accesos-complementarios/pull/38  
**Merge en main:** `88b6bd166237019344873599e1744e0c5e6b4e4e`.

## Diagnóstico sustentado

El código previo empleaba enlaces de navegación sin salto de línea y un título de portada proporcional al tamaño raíz tipográfico; el bloque de portada recortaba el excedente horizontal. El escenario es sensible a preferencias de texto ampliado. La imagen no permite establecer si el aumento de fuente procede del navegador, de ajustes guardados de accesibilidad, de una extensión o de otra configuración local. El zoom indicado al 100 % no demuestra que el tamaño tipográfico raíz sea estándar.

La PR #37 de mejoras de `Uso de recursos` no modificó las reglas de cabecera ni portada; sus cambios de estilo se limitaron a `#panel-recursos-uso`. No se declara causalidad sin evidencia.

## Corrección aplicada

- Flexibilidad de filas en `.cabecera-interior` para adaptar la marca y la navegación al espacio disponible.
- Salto de línea seguro en el nombre institucional y en los enlaces de navegación; se evita que palabras extensas sobrepasen sus contenedores.
- Ajuste del título, la etiqueta y el subtítulo de la portada dentro del panel disponible, incluso con tipografía aumentada.
- Los tamaños de letra no se reducen de forma forzada, para conservar la accesibilidad.
- Actualización de versión de `admin.css` a `v=57`.
- Nueva prueba autónoma y workflow de validación responsive del encabezado y portada.

## Validaciones automatizadas realizadas

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| Cabecera y portada con 320, 390, 1280 y 1650 px, y tipografía raíz 16, 20, 32 y 48 px (16 combinaciones) | Aprobada | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43461748420 |
| Regresión MEA del panel de Uso de recursos | Aprobada | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43461748308 |
| Regresión BDA del panel de Uso de recursos | Aprobada | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43461748261 |
| Confirmación de archivos integrados en main y preservación de etiquetas de recursos | Conforme mediante revisión de repositorio | https://github.com/crebeucayali/accesos-complementarios/pull/38/files |

Una primera ejecución del test de portada produjo un falso positivo porque `.admin-hero::after` añade un círculo decorativo desplazado 125 px hacia el exterior, recortado intencionalmente por `overflow:hidden`. La corrección de la prueba excluye ese pseudoelemento decorativo del cálculo de desbordamiento y sigue verificando que los textos y contenedores visibles no se corten. La nueva ejecución resultó aprobada.

## Archivos modificados

- `admin/admin.css`.
- `admin/index.html` (únicamente versión de la hoja de estilos).
- `admin/tests/encabezado-panel-responsivo.browser.mjs`.
- `.github/workflows/validar-admin-encabezado.yml`.
- `docs/auditoria-cabecera-portada-admin-20261113.md`.
- `docs/cierre-cabecera-portada-admin-20261113.md` (este cierre).

## Exclusiones y limitaciones

No se cambian las estadísticas ni los controles de `Seguimiento > Uso de recursos`, la autenticación, la base de datos Supabase, los roles, los módulos de EVA, las tarjetas ni otras operaciones administrativas. La corrección ha superado pruebas de Chromium en condiciones simuladas; no se ha inspeccionado el tamaño de fuente real del navegador del responsable. Si el problema subsiste pese a los ajustes de CSS, corresponde probar el restablecimiento de preferencias de accesibilidad del sitio y comprobar la configuración tipográfica o extensiones del navegador.

## Dictamen

La intervención del código y su revisión automatizada quedan **cerradas técnicamente**. La verificación visual final en el navegador del responsable queda pendiente y no se da por realizada.
