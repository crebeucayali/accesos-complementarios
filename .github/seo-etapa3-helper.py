from pathlib import Path
import re

canonicals = {
    "index.html": "https://crebeucayali.github.io/accesos-complementarios/",
    "paginas/nosotros.html": "https://crebeucayali.github.io/accesos-complementarios/paginas/nosotros.html",
    "paginas/que-hacemos.html": "https://crebeucayali.github.io/accesos-complementarios/paginas/que-hacemos.html",
    "paginas/contacto.html": "https://crebeucayali.github.io/accesos-complementarios/paginas/contacto.html",
    "paginas/guia-de-uso.html": "https://crebeucayali.github.io/accesos-complementarios/paginas/guia-de-uso.html",
    "paginas/lineas-de-accion.html": "https://crebeucayali.github.io/accesos-complementarios/paginas/lineas-de-accion.html",
    "directorios/directorio-institucional.html": "https://crebeucayali.github.io/accesos-complementarios/directorios/directorio-institucional.html",
    "directorios/directorio-ciudadano.html": "https://crebeucayali.github.io/accesos-complementarios/directorios/directorio-ciudadano.html",
    "firma-tu-visita/index.html": "https://crebeucayali.github.io/accesos-complementarios/firma-tu-visita/",
    "recursos/galeria.html": "https://crebeucayali.github.io/accesos-complementarios/recursos/galeria.html",
    "recursos/calendario.html": "https://crebeucayali.github.io/accesos-complementarios/recursos/calendario.html",
    "paginas/aviso-legal.html": "https://crebeucayali.github.io/accesos-complementarios/paginas/aviso-legal.html",
    "paginas/politica-privacidad.html": "https://crebeucayali.github.io/accesos-complementarios/paginas/politica-privacidad.html",
    "paginas/politica-cookies.html": "https://crebeucayali.github.io/accesos-complementarios/paginas/politica-cookies.html",
}

for filename, url in canonicals.items():
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    canonical_re = re.compile(r'<link\b[^>]*\brel=["\']canonical["\'][^>]*>', re.I)
    existing = canonical_re.search(text)
    expected = f'<link rel="canonical" href="{url}">'
    if existing:
        if url not in existing.group(0):
            raise SystemExit(f"Canonical inesperado en {filename}: {existing.group(0)}")
        continue
    title = re.search(r'</title>', text, re.I)
    if not title:
        raise SystemExit(f"No se encontró </title> en {filename}")
    insertion = "\n  " + expected
    text = text[:title.end()] + insertion + text[title.end():]
    path.write_text(text, encoding="utf-8")
