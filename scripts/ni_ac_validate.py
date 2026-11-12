#!/usr/bin/env python3
"""Comprueba recursos y navegación de NI migrado en AC sin acceder a Supabase."""
import base64
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

ROOT = Path(".")
NI = Path("lecturas-inclusivas")
SITE = "https://crebeucayali.github.io/accesos-complementarios/"
OLD = "https://crebeucayali.github.io/noti-inclusivos/"

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        for name in ("href", "src"):
            if data.get(name):
                self.urls.append((tag, name, data[name]))

def check(path, raw):
    base = SITE + path.as_posix()
    u = urljoin(base, raw)
    pu = urlparse(u)
    if pu.netloc != "crebeucayali.github.io" or not pu.path.startswith("/accesos-complementarios/"):
        return None
    rel = unquote(pu.path.removeprefix("/accesos-complementarios/"))
    p = ROOT / rel
    if rel.endswith("/"): p = p / "index.html"
    return str(p) if not p.is_file() else None

def main():
    failures = []
    scanned = 0
    htmls = sorted(NI.rglob("*.html"))
    if len(htmls) != 10:
        raise AssertionError(f"Se esperaban 10 HTML, encontrados {len(htmls)}")
    for path in htmls:
        content = path.read_text("utf-8")
        if OLD in content or "noti-inclusivos/" in content:
            failures.append(f"{path}: referencia antigua NI")
        parser = Links()
        parser.feed(content)
        for tag, attr, value in parser.urls:
            if value.startswith(("mailto:", "tel:", "javascript:", "data:", "#")): continue
            missing = check(path, value)
            if missing:
                failures.append(f"{path}: {tag}.{attr}={value} -> falta {missing}")
            scanned += 1
        if path == NI / "index.html":
            bodies = re.findall(r'<script\s+type="application/ld\+json"[^>]*>([\s\S]*?)</script>', content)
            if len(bodies) != 1: failures.append("Portada: debe tener 1 JSON-LD")
            else:
                data = json.loads(bodies[0])
                hashes = re.findall(r"'sha256-([A-Za-z0-9+/=]+)'", content)
                actual = base64.b64encode(hashlib.sha256(bodies[0].encode()).digest()).decode()
                if hashes != [actual]: failures.append("Portada: hash CSP JSON-LD inválido")
                if "accesos-complementarios/lecturas-inclusivas/" not in json.dumps(data):
                    failures.append("Portada: JSON-LD no migrado")
    css_files = sorted(NI.rglob("*.css"))
    for path in css_files:
        for url in re.findall(r'url\(["\']?([^)"\']+)["\']?\)', path.read_text("utf-8")):
            if url.startswith("data:"): continue
            missing = check(path, url)
            if missing: failures.append(f"CSS {path}: {url} -> falta {missing}")
            scanned += 1
    images = {
      "lanzamiento-eva.webp": "78ddaea7346f143aa89e6155d8d7487cdc5b0229",
      "lanzamiento-eva-mini.webp": "d9998c1f6eec0b2c127437020d6769a9927478b1"
    }
    for name, want in images.items():
        blob = (NI / "articulos/lanzamiento-eva" / name).read_bytes()
        sha = hashlib.sha1(b"blob " + str(len(blob)).encode() + b"\0" + blob).hexdigest()
        if sha != want: failures.append(f"SHA erróneo: {name}")
    articles = sorted((NI / "articulos").glob("*/index.html"))
    if len(articles) != 7: failures.append(f"Artículos: {len(articles)}, esperado 7")
    print(json.dumps({"html":len(htmls),"articles":len(articles),"css":len(css_files),
      "resources_checked":scanned, "webp_verified":len(images),"failures":failures}, ensure_ascii=False, indent=2))
    if failures: raise SystemExit(1)

if __name__ == "__main__":
    main()
