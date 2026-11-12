# Migración controlada de NI hacia Accesos Complementarios: etapa 1

Fecha: 2026-11-11
Rama aislada: `migration/ni-a-ac-20261111`.
Origen intacto: `crebeucayali/noti-inclusivos`.
Destino propuesto: `https://crebeucayali.github.io/accesos-complementarios/lecturas-inclusivas/`.

## Inventario de origen

El repositorio NI contiene siete artículos públicos dentro de `articulos/`, portada `index.html`, índice `articulos/index.html`, alias de compatibilidad `blog/index.html`, estilos, scripts de Facebook y recursos gráficos. La migración NO se limita a `public.noticias_destacadas` de Supabase: esa tabla contiene cinco registros y alimenta otra función de noticias; no sustituye los siete artículos estáticos de NI.

Las publicaciones individuales existentes son:

1. `cuentos-inclusion-discapacidad/`
2. `lanzamiento-eva/`
3. `natacion-inclusiva-sin-barreras/`
4. `neurodiversidad-del-reconocimiento-a-los-apoyos/`
5. `salud-emergencias-inclusion/`
6. `sindrome-down-y-bioetica/`
7. `transicion-vida-adulta/`

## Trabajo ejecutado en rama aislada

Se copiaron 17 archivos de código y contenido HTML/CSS/JS/SVG a `lecturas-inclusivas/`, sin tocar ni publicar la rama `main` de AC y sin modificar NI. Su contenido se conserva inicialmente idéntico para facilitar la auditoría. **Estos archivos todavía tienen enlaces/canonical/CSP de NI antiguo y no están autorizados para publicación**.

## Recursos gráficos

- `logo-crebe.webp` y `patron-shipibo.webp` existen en la raíz de AC y coinciden por SHA Git con los originales de NI.
- Falta copiar dentro de AC los dos archivos propios del artículo de lanzamiento, de 240856 y 1193020 bytes, ya que la interfaz de transferencia disponible rechaza archivos binarios. Ninguno está duplicado en AC con el mismo SHA.
- Existe una referencia histórica a `/noti-inclusivos/assets/img/sindrome-down-ciencia-bioetica.jpeg`, pero ese archivo **no figura en el árbol de NI**. Debe corregirse como incidencia de origen, sin inventar la imagen.
- El SVG `transicion-vida-adulta.svg` sí se incluyó en el traslado de texto, con contenido original intacto.

## Dependencias funcionales

- AC `index.html` todavía enlaza a `https://crebeucayali.github.io/noti-inclusivos/`.
- EVA `eva-lecturas-inclusivas.js` hace `fetch` a la portada HTML de NI y extrae tarjetas y enlaces; requiere cambiar la fuente al nuevo directorio de AC cuando se publique.
- Revisar `mapa-web.html`, `busqueda.json`, `datos/buscador.json`, el buscador de EVA y todos los sitemaps.
- Revisar el sistema `crebe-agent`: clonación, inventarios, validaciones SEO, seguridad, monitoreo y accesibilidad.
- Ajustar rutas absolutas, URLs canónicas, imágenes sociales y hashes CSP de bloques JSON-LD cuando cambien las páginas. No publicar contenido con un CSP desactualizado.
- La tabla Supabase `public.noticias_destacadas` no debe alterarse como parte de esta copia inicial.

## Criterios antes de publicar AC

- [ ] Reunir los dos WebP del artículo de lanzamiento y resolver la imagen histórica faltante
- [ ] Reescribir todas las rutas locales y absolutas que dependan del repositorio NI
- [ ] Reconstruir o comprobar hashes CSP y metadatos canonical/OG/JSON-LD
- [ ] Validar portada, índice, siete artículos y navegación móvil/escritorio
- [ ] Comprobar el lector de artículos destacados de EVA con el destino AC
- [ ] Publicar AC y cambiar enlaces EVA, búsqueda y monitoreo tras pruebas
- [ ] Preparar copia espejo externa del repositorio NI y validar integridad antes de borrarlo

**Estado: MIGRACIÓN PREPARADA SOLO EN RAMA. NI no debe eliminarse, archivarse ni redirigirse aún.**
