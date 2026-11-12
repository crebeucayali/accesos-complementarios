# NI hacia AC: etapa 2 - adaptación y verificación técnica

Fecha: 11 de noviembre de 2026. Validación automatizada en GitHub Actions (UTC: 12 de noviembre).
Origen: `crebeucayali/noti-inclusivos` (`main`, sin cambios).
Destino aislado: `crebeucayali/accesos-complementarios`, rama `migration/ni-a-ac-20261111`.
Destino definitivo propuesto: https://crebeucayali.github.io/accesos-complementarios/lecturas-inclusivas/

## Implementación

1. Copiados exactamente 17 archivos HTML/CSS/JS/SVG del origen a la rama aislada de AC, verificados en etapa 1 por SHA Git.
2. Transferidos los dos WebP originales del lanzamiento EVA mediante un flujo controlado de GitHub Actions, calculando previamente el SHA Git de sus bytes y rechazando diferencias:
   - `lanzamiento-eva.webp`: `78ddaea7346f143aa89e6155d8d7487cdc5b0229`
   - `lanzamiento-eva-mini.webp`: `d9998c1f6eec0b2c127437020d6769a9927478b1`
3. Adaptadas las diez páginas HTML (portada, índice, siete artículos y alias `blog/`): enlaces canónicos, URLs absolutas y parámetros antiguos de Facebook al destino AC.
4. Sustituida exclusivamente la imagen inexistente `/noti-inclusivos/assets/img/sindrome-down-ciencia-bioetica.jpeg` por el logo institucional **como imagen de referencia, no como portada original**, con textos alternativos corregidos.
5. Actualizadas tres rutas relativas del patrón shipibo en CSS para reutilizar el recurso conservado en la raíz AC.
6. Recalculado el hash SHA-256 CSP del bloque JSON-LD de la portada para conservar su política estricta.
7. El script de compartir reconoce la sección `/accesos-complementarios/lecturas-inclusivas/` y conserva la clasificación `noti_inclusivos` para continuidad del registro.

## Auditoría automática

Flujos:
- Copia binaria y adaptación: https://github.com/crebeucayali/accesos-complementarios/actions/runs/43156938231 - **success**.
- Comprobación de navegación, recursos y CSP: https://github.com/crebeucayali/accesos-complementarios/actions/runs/43157138915 - **success**.

Validación técnica: diez HTML y siete artículos presentes; imágenes WebP con hashes Git coincidentes; recursos locales y enlaces relativos internos comprobados; JSON-LD y su hash CSP verificados.

## Límites

La rama `main` de AC sigue sin cambios en esta etapa y la nueva ubicación **aún no está publicada en GitHub Pages**. La validación de navegador (móvil y escritorio) queda pendiente.

No se actualizó la portada EVA ni su `eva-lecturas-inclusivas.js`, que todavía consulta el origen NI. No se modificó la base Supabase de `noticias_destacadas`; las noticias destacadas y los siete artículos estáticos son superficies distintas.

Antes de integrar a `main` deberán revisarse la experiencia visual, links de compartir, navegación por artículos, contadores, SEO/sitemap, buscadores, mapa web y configuración activa de `crebe-agent`. El flujo temporal de migración no debe convertirse en una tarea recurrente de producción. Tras la integración debe mantenerse el origen NI hasta verificar la publicación definitiva.

**Estado: ETAPA 2 TÉCNICAMENTE APROBADA EN RAMA AISLADA; SIN AUTORIZACIÓN PARA ELIMINAR NI.**
