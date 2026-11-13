import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

/* Prueba aislada del encabezado y portada reales, sin autenticación ni servicios externos. */
const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const css=await readFile(new URL("../admin.css",import.meta.url),"utf8");
const from=html.indexOf('<header class="cabecera-crebe">');
const until=html.indexOf('<section class="admin-contenido">',from);
assert.ok(from>0 && until>from,"No se encontró la cabecera y portada administrativa");
const markup=html.slice(from,until);
assert.match(markup,/Panel administrativo EVA/);
assert.match(css,/Resiliencia tipográfica de cabecera y portada administrativa/);
const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,390,1280,1650]){
    for(const rootFontSize of [16,20,32,48]){
      const page=await browser.newPage({viewport:{width,height:850}});
      await page.route("**/*",route=>route.abort());
      await page.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body class="theme-crebe panel-admin-page">${markup}</main></body></html>`);
      await page.evaluate(size=>{document.documentElement.style.fontSize=size+"px";},rootFontSize);
      const result=await page.evaluate(()=>{
        const selectors=[
          ".cabecera-interior",".marca-crebe",".marca-texto",".pestanas-crebe",
          ".admin-hero",".admin-hero-contenido",".admin-hero h1",".admin-subtitulo"
        ];
        return selectors.map(selector=>{
          const element=document.querySelector(selector);
          const rect=element.getBoundingClientRect();
          return {
            selector,
            left:rect.left,
            right:rect.right,
            overflow:element.scrollWidth-element.clientWidth,
            viewport:document.documentElement.clientWidth
          };
        });
      });
      for(const area of result){
        assert.ok(area.left>=-2 && area.right<=area.viewport+2,
          `Contenedor fuera de pantalla (${width}px, fuente ${rootFontSize}px): ${JSON.stringify(area)}`);
        assert.ok(area.overflow<=2,
          `Texto cortado horizontalmente (${width}px, fuente ${rootFontSize}px): ${JSON.stringify(area)}`);
      }
      await page.close();
    }
  }
  console.log("16 combinaciones aprobadas: escritorio/móvil, tamaños tipográficos 100 % a 300 %, cabecera y portada sin recortes.");
}finally{
  await browser.close();
}
