# Auditoría de visualización: cabecera y portada del panel administrativo EVA

**Fecha:** 13 de noviembre de 2026 (hora de Perú).  
**Origen de la incidencia:** captura remitida con el indicador de zoom del navegador en 100 %, pero con textos de cabecera y portada desproporcionados y recortados horizontalmente.  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Alcance:** exclusivamente la presentación de `admin/`. La sección `Seguimiento > Uso de recursos`, su lógica de datos y su documentación de cierre permanecen intactas.

## Diagnóstico

1. La revisión de la PR #37 confirmó que las reglas añadidas para `Uso de recursos` estaban restringidas por `#panel-recursos-uso`. No modificaron `.cabecera-crebe` ni `.admin-hero`. Por tanto, no se puede atribuir causalidad a esa PR a partir de la captura.
2. La cabecera define una fila flexible con textos que dependen de `rem` y enlaces sin salto de línea. El título de portada usa `clamp(2.1rem,4vw,3.45rem)`, mientras el contenedor utiliza `overflow:hidden`. Con tamaños tipográficos superiores al habitual, pueden aparecer contenedores altos y palabras largas recortadas.
3. El menú de zoom del navegador al 100 % no informa sobre el tamaño de fuente predeterminado, las preferencias de accesibilidad guardadas ni las extensiones de modificación tipográfica. El origen exacto de la escala vista en la captura no puede comprobarse remotamente.
4. No se identificó un cambio necesario en autenticación, Supabase, gestión de contenidos ni estadísticas.

## Corrección aprobada por alcance

- Permitir salto de línea y ajuste flexible de la marca institucional y de los enlaces de navegación.
- Hacer que título, subtítulo y etiqueta de la portada se ajusten dentro de su contenedor, incluso cuando aumente el tamaño de letra.
- No fijar tamaños tipográficos máximos que anulen las preferencias personales de accesibilidad.
- Añadir una prueba independiente en Chromium para anchos de escritorio y móvil y varios tamaños tipográficos, incluida la verificación de ausencia de recortes y desbordamiento.
- Mantener intactos los componentes de `Seguimiento > Uso de recursos`, los valores estadísticos, los permisos, los módulos públicos y otras pestañas.

## Criterios de aceptación

- En visualización estándar se conserva el diseño y el orden habitual.
- Con tamaño aumentado, los textos se redistribuyen sin quedar cortados por los bordes de la cabecera o de la portada.
- Verificaciones automatizadas del panel administrativo y de los módulos MEA/BDA sin regresiones.
- El cierre diferenciará la validación automatizada de la verificación pendiente del navegador real del usuario.

**Limitación:** no hay acceso directo a las preferencias tipográficas del navegador de la captura. Si una extensión aplica transformaciones externas ajenas al sitio, podrá requerirse desactivarla o restablecer ajustes del navegador.
