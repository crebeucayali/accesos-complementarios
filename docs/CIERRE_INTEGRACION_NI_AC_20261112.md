# Integración pública de Lecturas Inclusivas (NI) en AC

Fecha: 12 de noviembre de 2026.
Estado: contenido publicado y referencias institucionales principales actualizadas. Repositorio NI independiente conservado; eliminación NO autorizada.

## Aprobación y alcance
El usuario validó visual y funcionalmente la portada, índice, siete artículos y acceso histórico `blog/` en la ruta provisional `/accesos-complementarios/validacion-ni/`.

Se copiaron **19 archivos** de la rama aislada `migration/ni-a-ac-20261111` al directorio definitivo `lecturas-inclusivas/` de `main`: diez HTML, hojas de estilo, scripts, SVG y dos WebP originales, previamente comparados mediante SHA Git.

Destino público: https://crebeucayali.github.io/accesos-complementarios/lecturas-inclusivas/

No se copiaron las herramientas temporales de validación a producción. La ruta `validacion-ni/` permanece separada, `noindex` y sin telemetría de visitas de producción.

## Enlaces actualizados
- Tarjeta Lecturas Inclusivas en `AC/index.html`.
- Mapa web `AC/mapa-web.html`.
- Buscador simple `AC/busqueda.json` y catálogo estructurado `AC/datos/buscador.json` con la portada y siete artículos.
- Fuentes del buscador unificado de EVA: eliminada la fuente `ni` inexistente, conservada la fuente `ac` que ya contiene las lecturas.
- EVA `index.html`, `eva-lecturas-inclusivas.js` con origen AC y filtro `/accesos-complementarios/lecturas-inclusivas/articulos/`, `main.js`, `busqueda.json` y `noticias-destacadas.json`.
- AC `datos/noticias-destacadas.json` y enlace en `admin/index.html`.
- MEA `pictogramas/pictogramas.js`.

## SEO
- AC sitemap contiene portada, índice y siete artículos, **9 rutas** añadidas.
- Los seis sitemaps públicos contienen **59 URLs únicas**; cero URLs de `/noti-inclusivos/` en los sitemaps.
- Se eliminó el sitemap de NI independiente de `sitemap.xml` y `sitemap-v2.xml` de EVA.
- `crebe-agent` actualizado en inventarios, configuración funcional/seguridad/accesibilidad, scripts SEO y tareas de clonación; no se reescriben reportes históricos.
- Última prueba automatizada previa: integración aislada NI en AC y validación de 10 páginas, 7 artículos y CSP, con éxito.

## Despliegues
- AC Pages: https://github.com/crebeucayali/accesos-complementarios/actions/runs/43160794611 — success.
- EVA Pages: https://github.com/crebeucayali/crebeucayali.github.io/actions/runs/43160781591 — success.
- MEA Pages: https://github.com/crebeucayali/materiales-educativos-accesibles/actions/runs/43160800082 — success.

## Límites y pendientes antes de borrar NI
1. Los despliegues son evidencia de publicación técnica, pero no equivalen a una nueva prueba visual de todas las rutas definitivas. Revisar portada, artículos, navegación y carrusel de lecturas en EVA ya publicados.
2. Una prueba de verificación correctiva de accesibilidad del conjunto EVA reportó un nodo de contraste en la portada; se observaron incidencias similares antes de trasladar NI. No afirmar corrección total de accesibilidad a raíz de la migración.
3. Revisar en GitHub los flujos de `crebe-agent` ante la nueva topología de seis repositorios y las expectativas históricas de validadores.
4. Crear y verificar una copia espejo Git **fuera de NI**, con todas sus ramas e historial, mediante `git clone --mirror`, `git fsck --full`, `git show-ref` y comparación de `main`.
5. Aceptar que las URLs antiguas de NI producirán 404 tras eliminar el repositorio si no se mantienen redirecciones externas. La decisión del usuario es reducir repositorios, por lo que no se debe conservar NI como redirect indefinido.
6. Solicitar autorización explícita separada para eliminación definitiva. No borrar NI ni alterar las tablas Supabase de noticias.

**Dictamen: integración funcional completada; eliminación NI aún no autorizada y condicionada a la auditoría preeliminación y respaldo externo.**
