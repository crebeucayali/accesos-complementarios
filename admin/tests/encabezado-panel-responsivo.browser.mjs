import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

/* Prueba aislada del encabezado y portada reales, sin autenticación ni servicios externos. */
const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const css=await readFile(new URL("../admin.css",import.meta.url),"utf8");
const adminJs=await readFile(new URL("../admin.js",import.meta.url),"utf8");
const from=html.indexOf('<header class="cabecera-crebe">');
const until=html.indexOf('<section class="admin-contenido">',from);
assert.ok(from>0 && until>from,"No se encontró la cabecera y portada administrativa");
const markup=html.slice(from,until);
assert.match(markup,/Panel administrativo EVA/);
assert.match(css,/Resiliencia tipográfica de cabecera y portada administrativa/);
assert.match(css,/evita una base flex vertical de 460px/);
assert.match(adminJs,/const mediaMenuMovil = window\.matchMedia/);
assert.match(adminJs,/menuAbierto = Boolean\(abierto\) && mediaMenuMovil\.matches/);
assert.doesNotMatch(html,/Los indicadores se incorporarán con datos reales/);
assert.doesNotMatch(html,/Las próximas actividades y publicaciones se incorporarán/);
const startAdmin=html.indexOf('<section id="seccion-admin" hidden>');
const endAdmin=html.indexOf('<section class="tarjeta panel-seccion" id="panel-capacitaciones"',startAdmin);
assert.ok(startAdmin>0 && endAdmin>startAdmin,"No se encontró el contenedor administrativo actual");
const adminShell=html.slice(startAdmin,endAdmin)+"</div></div></section>";
const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,390,768,900,980,1100,1180,1280,1650]){
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
        // La portada conserva un ornamento ::after desplazado 125 px fuera del borde.
        // Ese pseudoelemento se recorta intencionalmente; evaluar el texto interior.
        if(area.selector!==".admin-hero") {
          assert.ok(area.overflow<=2,
            `Texto cortado horizontalmente (${width}px, fuente ${rootFontSize}px): ${JSON.stringify(area)}`);
        }
      }
      await page.close();
    }
  }
  console.log("36 combinaciones aprobadas: escritorio/móvil, tamaños tipográficos 100 % a 300 %, cabecera y portada sin recortes.");

  // Comprobar el espacio real de la marca y el cambio de navegación en pantalla táctil.
  for(const scenario of [
    {width:390,touch:true,mobile:true,menu:true},
    {width:980,touch:true,mobile:true,menu:true},
    {width:1100,touch:true,mobile:true,menu:true},
    {width:980,touch:false,mobile:false,menu:false},
    {width:1280,touch:false,mobile:false,menu:false}
  ]){
    const page=await browser.newPage({
      viewport:{width:scenario.width,height:850},
      hasTouch:scenario.touch,
      isMobile:scenario.mobile
    });
    await page.route("**/*",route=>route.abort());
    await page.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body class="theme-crebe panel-admin-page">${markup}<div class="admin-contenido"><div class="contenedor">${adminShell}</div></div></main></body></html>`);
    const state=await page.evaluate(()=>{
      const section=document.querySelector("#seccion-admin");
      section.hidden=false;
      const header=document.querySelector(".cabecera-interior");
      const marca=document.querySelector(".marca-crebe");
      const nav=document.querySelector(".pestanas-crebe");
      const menu=document.querySelector(".admin-movil-barra");
      const lateral=document.querySelector(".admin-lateral");
      const distribucion=document.querySelector(".admin-distribucion");
      const rect=header.getBoundingClientRect();
      return {
        headerHeight:rect.height,
        marcaHeight:marca.getBoundingClientRect().height,
        marcaFlexBasis:getComputedStyle(marca).flexBasis,
        navigationTop:nav.getBoundingClientRect().top,
        menuDisplay:getComputedStyle(menu).display,
        lateralPosition:getComputedStyle(lateral).position,
        lateralVisibility:getComputedStyle(lateral).visibility,
        distribucionDisplay:getComputedStyle(distribucion).display,
        viewport:document.documentElement.clientWidth,
        documentWidth:document.documentElement.scrollWidth,
        touchWindow:window.matchMedia("(pointer:coarse)").matches
      };
    });
    if(scenario.width<=1180){
      assert.ok(state.marcaHeight<150,
        "La marca no debe reservar una altura flex vertical de 460 px: "+JSON.stringify({scenario,state}));
      assert.ok(state.headerHeight<250,
        "La cabecera no debe presentar el espacio blanco excesivo: "+JSON.stringify({scenario,state}));
      assert.equal(state.marcaFlexBasis,"auto","La base flex debe ser auto en cabecera vertical");
    }
    assert.ok(state.documentWidth<=state.viewport+2,"No debe haber scroll horizontal de página: "+JSON.stringify({scenario,state}));
    assert.equal(state.menuDisplay!=="none",scenario.menu,"El menú adaptado debe corresponder al tipo de dispositivo");
    assert.equal(state.lateralPosition,scenario.menu?"fixed":"sticky");
    assert.equal(state.distribucionDisplay,scenario.menu?"block":"grid");
    assert.equal(state.lateralVisibility,scenario.menu?"hidden":"visible");
    await page.close();
  }
  console.log("5 escenarios adicionales aprobados: teléfono normal, teléfono en viewport de escritorio y escritorio con ratón.");
}finally{
  await browser.close();
}
