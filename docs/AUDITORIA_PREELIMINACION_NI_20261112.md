# Auditoría de preeliminación de NI integrado en AC

Fecha: 12 de noviembre de 2026 (Perú).
Repositorio de origen: `crebeucayali/noti-inclusivos`.
Repositorio de destino: `crebeucayali/accesos-complementarios`.
Ruta definitiva: `https://crebeucayali.github.io/accesos-complementarios/lecturas-inclusivas/`.

## Dictamen

**INDEPENDENCIA FUNCIONAL CONFORME; ELIMINACIÓN DEFINITIVA AÚN BLOQUEADA POR RESPALDO EXTERNO Y AUTORIZACIÓN.**

El usuario validó la vista de prueba antes de integrar a producción. Se han publicado la portada, el índice, siete artículos, el alias de `blog/` y sus recursos internos en AC. La aprobación humana de la vista previa no sustituye una segunda revisión visual de los enlaces definitivos.

## Integridad del contenido

- Origen NI `main`: 25 archivos versionados, entre páginas, scripts, estilos, recursos y configuración GitHub Pages.
- Destino AC: 19 archivos bajo `lecturas-inclusivas/`, correspondientes a los contenidos funcionales migrados; se excluyeron deliberadamente `README.md`, `.nojekyll`, `robots.txt` y `sitemap.xml` independientes, junto con logo y patrón duplicados que ya existen en la raíz de AC.
- Diez páginas HTML bajo AC (portada, índice, siete artículos y alias de blog): todas tienen `canonical` dentro de AC, sin dependencia de `/noti-inclusivos/` en la ruta ni imagen antigua inexistente.
- Los cinco recursos gráficos del origen (dos WebP del artículo lanzamiento EVA, un SVG y logo/patrón) tienen objetos SHA Git idénticos conservados en AC.
- La imagen faltante de síndrome de Down ya faltaba en NI original; se reemplazó en AC por el logo CREBE, expresamente identificado como referencia institucional.

## Rutas, buscadores y auditoría

- Actualizados accesos en AC, mapa del sitio, catálogo local, buscador unificado de EVA, tarjetas del portal y lecturas destacadas.
- Corregidas dependencias activas detectadas en la auditoría: `eva-columna-lateral.js`, `destacados-eva.js` y `admin/destacados.js` (incluida ruta antigua de RA encontrada en el mismo punto).
- Ajustadas pruebas de regresión en EVA y AC a la ubicación actual de Lecturas Inclusivas.
- Supabase `eva_recursos_destacados`: 4 filas actuales, ninguna con `enlace_url` apuntando al NI antiguo; la tabla independiente `noticias_destacadas` no se ha eliminado ni migrado porque no depende de un repositorio GitHub para persistencia.
- SEO: las seis fuentes de sitemap del ecosistema acumulan 59 URL únicas, de las cuales nueve corresponden a Lecturas Inclusivas dentro de AC. Ninguna de esas 59 URL apunta a `/noti-inclusivos/`.
- Los historiales de informe y pruebas de fases anteriores pueden mencionar NI y no deben reescribirse artificialmente. Algunos scripts de compartir fuera de NI conservan la categoría histórica `noti_inclusivos` sin enlazar a una URL antigua; esto no constituye una dependencia de publicación.
- `crebe-agent`: inventarios, objetivos funcionales, alcance SEO, seguridad y accesibilidad y flujos que clonan repositorios fueron adaptados al nuevo conjunto. Existen verificaciones generales de accesibilidad con incidencias de contraste anteriores o independientes a la migración; no se declara accesibilidad general completamente aprobada.

## Publicación

Últimos despliegues correctos tras los cambios de auditoría:
- EVA: https://github.com/crebeucayali/crebeucayali.github.io/actions/runs/43220340502
- AC: https://github.com/crebeucayali/accesos-complementarios/actions/runs/43220349198

No se interpreta un despliegue satisfactorio como reemplazo de pruebas humanas funcionales en toda la plataforma.

## Rama e historial NI todavía no respaldados fuera del repositorio

La API GitHub registra **11 ramas** (incluida `main`) y **10 referencias de solicitudes de extracción**. El commit actual de `main` es:

`16618b4e08baa2dd56ad0d47019a4275d11e4894`

Se requiere copia espejo independiente, no una rama dentro del propio repositorio. Ruta propuesta junto al respaldo verificado de RA:

`E:\Escritorio\DOCS GABRIEL\CASA\banco_digital_lsp\Backups\NI-respaldo-git.git`

Procedimiento en PowerShell:

```powershell
$Destino = "E:\Escritorio\DOCS GABRIEL\CASA\banco_digital_lsp\Backups"
New-Item -ItemType Directory -Force -Path $Destino | Out-Null
git clone --mirror https://github.com/crebeucayali/noti-inclusivos.git "$Destino\NI-respaldo-git.git"
git -C "$Destino\NI-respaldo-git.git" fsck --full
git -C "$Destino\NI-respaldo-git.git" show-ref
git -C "$Destino\NI-respaldo-git.git" rev-parse refs/heads/main
```

Comprobar que los objetos no presentan errores, que se conservaron las once ramas y las diez referencias de PR, y que la rama principal devuelve el SHA anterior.

## Condiciones de autorización

- [x] Copia de contenido público y siete artículos funcionalmente integrada en AC
- [x] Recursos gráficos del origen conservados por SHA Git
- [x] Enlaces, rutas de búsqueda, índice SEO y monitores principales consolidados
- [x] Rutas HTML de producción revisadas sin URLs canónicas antiguas
- [x] Despliegues AC/EVA satisfactorios
- [ ] Copia espejo Git independiente realizada y comprobada
- [ ] Aprobación explícita del usuario para borrar definitivamente `crebeucayali/noti-inclusivos`, aceptando el 404 de los enlaces históricos sin redirect
- [ ] Revisión visual final de las URLs definitivas, recomendable antes de borrar el origen

**NO ELIMINAR NI** hasta que se acredite el respaldo y se autorice la eliminación. Los recursos y registros de Supabase permanecen intactos.
