#!/usr/bin/env python3
"""Adaptación conservadora NI -> AC en rama aislada. No modifica el origen."""
from __future__ import annotations

import base64
import hashlib
import re
from pathlib import Path

ROOT = Path("lecturas-inclusivas")
OLD = "https://crebeucayali.github.io/noti-inclusivos/"
NEW = "https://crebeucayali.github.io/accesos-complementarios/lecturas-inclusivas/"
OLD_ENCODED = "https%3A%2F%2Fcrebeucayali.github.io%2Fnoti-inclusivos%2F"
NEW_ENCODED = "https%3A%2F%2Fcrebeucayali.github.io%2Faccesos-complementarios%2Flecturas-inclusivas%2F"
BROKEN_IMAGE = OLD + "assets/img/sindrome-down-ciencia-bioetica.jpeg"
FALLBACK = "https://crebeucayali.github.io/accesos-complementarios/logo-crebe.webp"
EXPECTED_HTML = 10  # portada, indice, 7 articulos, alias /blog
EXPECTED_MEDIA = {
    "lanzamiento-eva.webp": "78ddaea7346f143aa89e6155d8d7487cdc5b0229",
    "lanzamiento-eva-mini.webp": "d9998c1f6eec0b2c127437020d6769a9927478b1",
}

def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\\0" + data).hexdigest()

def verify_images() -> None:
    folder = ROOT / "articulos/lanzamiento-eva"
    for name, sha in EXPECTED_MEDIA.items():
        data = (folder / name).read_bytes()
        actual = git_blob_sha(data)
        if actual != sha:
            raise RuntimeError(f"SHA de imagen no coincide: {name}: {actual}")

def repair_jsonld_csp(html: str) -> str:
    pattern = r'(<script\\s+type="application/ld\\+json"\\s*>)([\\s\\S]*?)(</script>)'
    scripts = list(re.finditer(pattern, html, re.I))
    if not scripts:
        return html
    if len(scripts) != 1:
        raise RuntimeError("JSON-LD múltiples no previstos")
    body = scripts[0].group(2)
    sha = base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode("ascii")
    old_hashes = re.findall(r"'sha256-[A-Za-z0-9+/=]+'", html)
    if len(old_hashes) != 1:
        raise RuntimeError("CSP de la portada inesperada")
    return html.replace(old_hashes[0], "'sha256-" + sha + "'", 1)

def main() -> None:
    verify_images()
    n = 0
    html_files = sorted(ROOT.rglob("*.html"))
    if len(html_files) != 10:
        raise RuntimeError(f"HTML inesperados: {len(html_files)}")
    for path in html_files:
        text = path.read_text(encoding="utf-8")
        text = text.replace(BROKEN_IMAGE, FALLBACK)
        text = text.replace(OLD, NEW).replace(OLD_ENCODED, NEW_ENCODED)
        # El recurso gráfico original de este artículo no existía en NI.
        # El logo institucional funciona como imagen sustitutiva verificable.
        text = text.replace("Portada del artículo sobre síndrome de Down, ciencia y bioética", "Logo del CREBE, imagen institucional de referencia para este artículo")
        text = text.replace("Portada de Notiinclusivas CREBE dedicada al síndrome de Down, la ciencia y la bioética", "Logo institucional del CREBE como imagen de referencia")
        if path == ROOT / "index.html":
            text = repair_jsonld_csp(text)
        if "noti-inclusivos/" in text:
            raise RuntimeError(f"Referencias NI antiguas tras adaptar: {path}")
        path.write_text(text, encoding="utf-8")
        n += 1

    patterns = {
        "estilos.css": ('url("patron-shipibo.webp?v=2")', 'url("../patron-shipibo.webp?v=2")'),
        "articulos/estilos-articulo.css": ('url("../patron-shipibo.webp?v=2")', 'url("../../patron-shipibo.webp?v=2")'),
        "articulos/sindrome-down-y-bioetica/estilos.css": ('url("../../patron-shipibo.webp?v=2")', 'url("../../../patron-shipibo.webp?v=2")'),
    }
    for rel, (a, b) in patterns.items():
        path = ROOT / rel
        body = path.read_text(encoding="utf-8")
        # Solo sustituye cuando el estilo aún tiene la ruta original.
        if a in body:
            path.write_text(body.replace(a, b), encoding="utf-8")

    share_path = ROOT / "articulos/compartir-facebook.js"
    share = share_path.read_text(encoding="utf-8")
    share = share.replace('["/noti-inclusivos", "noti_inclusivos"]', '["/accesos-complementarios/lecturas-inclusivas", "noti_inclusivos"]')
    if '["/accesos-complementarios/lecturas-inclusivas", "noti_inclusivos"]' not in share:
        raise RuntimeError("Mapeo de compartir NI dentro de AC no encontrado")
    share_path.write_text(share, encoding="utf-8")

    for path in html_files:
        body = path.read_text(encoding="utf-8")
        if OLD in body or OLD_ENCODED in body or BROKEN_IMAGE in body:
            raise RuntimeError(f"Referencia histórica sin migrar: {path}")
    print(f"Adaptación realizada y revisada: {n} HTML, 3 CSS, 1 JS; 2 WebP exactos")

if __name__ == "__main__":
    main()
