#!/usr/bin/env python3
"""Prepara una vista pública de validación NI dentro de AC, sin tocar enlaces productivos."""
from pathlib import Path
import shutil
import re
import hashlib
import base64

source = Path("source/lecturas-inclusivas")
target = Path("validacion-ni")
new = "https://crebeucayali.github.io/accesos-complementarios/lecturas-inclusivas/"
preview = "https://crebeucayali.github.io/accesos-complementarios/validacion-ni/"
if not source.is_dir():
    raise SystemExit("Falta carpeta origen validada")
if target.exists():
    shutil.rmtree(target)
shutil.copytree(source, target)

visited = []
for path in sorted(target.rglob("*.html")):
    html = path.read_text(encoding="utf-8")
    html = html.replace(new, preview)
    # Impedir que esta copia experimental se indexe o aparezca en resultados.
    html = html.replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">\n', 1)
    # Evitar contar visitas experimentales como visitas reales del módulo.
    html = re.sub(r'<script\b(?=[^>]*visitas-eva\.js)[^>]*>\s*</script>', "", html, flags=re.I)
    # La portada contiene JSON-LD inline: mantener CSP hash sincronizado.
    scripts = re.findall(r'<script\s+type="application/ld\+json"[^>]*>([\s\S]*?)</script>', html, flags=re.I)
    if scripts:
        if len(scripts) != 1:
            raise SystemExit("Múltiples scripts JSON-LD no previstos")
        digest = base64.b64encode(hashlib.sha256(scripts[0].encode("utf-8")).digest()).decode("ascii")
        html, count = re.subn(r"'sha256-[A-Za-z0-9+/=]+'", "'sha256-" + digest + "'", html, count=1)
        if count != 1:
            raise SystemExit("No se encontró el hash CSP a corregir")
    if "noti-inclusivos/" in html:
        raise SystemExit("Referencia NI antigua: " + str(path))
    path.write_text(html, encoding="utf-8")
    visited.append(path)

# La copia de previsualización comparte sin escribir eventos reales en Supabase.
share = target / "articulos/compartir-facebook.js"
share.write_text("""(() => {
  "use strict";
  const links = document.querySelectorAll("[data-compartir-facebook], .compartir-facebook");
  const page = new URL(window.location.href);
  page.hash = "";
  links.forEach(link => {
    const params = new URLSearchParams({ app_id: "1743067010248486", display: "popup",
      href: page.href, redirect_uri: page.href });
    link.href = "https://www.facebook.com/dialog/share?" + params;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Compartir";
    link.setAttribute("aria-label", "Compartir este contenido de validación");
  });
})();
""", encoding="utf-8")

if len(visited) != 10:
    raise SystemExit("Número de páginas incorrecto: " + str(len(visited)))
print("NI vista previa: 10 HTML, 7 artículos, vista noindex, sin telemetría en la copia")
