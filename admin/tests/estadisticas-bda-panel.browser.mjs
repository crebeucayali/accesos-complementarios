import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const js=await readFile(new URL("../estadisticas-bda.js",import.meta.url),"utf8");
const css=await readFile(new URL("../admin.css",import.meta.url),"utf8");
const admin=await readFile(new URL("../admin.js",import.meta.url),"utf8");
assert.match(html,/estadisticas-bda\.js\?v=2/);
assert.match(admin,/rpc\/admin_estadisticas_recursos_bda/);
assert.match(admin,/EvaBDAEstadisticasAdmin\?\.limpiar\(\)/);
assert.match(admin,/EvaBDAEstadisticasAdmin\?\.cargar\(\)/);
const start=html.indexOf('<section class="tarjeta panel-seccion" id="panel-recursos-uso"');
const end=html.indexOf('<p id="mensaje-admin"',start);
assert.ok(start>0 && end>start);
const section=html.slice(start,end);
const browser=await chromium.launch({headless:true});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850}});
  await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+section+'</body></html>');
  await page.addScriptTag({content:js});
  const output=await page.evaluate(async()=>{
   let args=[];
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async dias=>{
    args.push(dias);
    return [{fecha:"2026-11-10",herramienta:"lsp",formato:"png",accion:"descarga_solicitada",total:1}];
   }});
   await window.EvaBDAEstadisticasAdmin.cargar();
   return {args,total:document.getElementById("bda-est-total").textContent,filas:document.querySelectorAll("#bda-est-detalle tr").length,mea:document.getElementById("rec-total").textContent};
  });
  assert.deepEqual(output.args,[30]);
  assert.equal(output.total,"1");
  assert.equal(await page.locator("#bda-est-impresiones").textContent(),"0");
  assert.equal(output.filas,1);
  assert.equal(output.mea,"—","BDA no debe incrementar los indicadores MEA");
  const empty=await page.evaluate(async()=>{
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>[]});
   await window.EvaBDAEstadisticasAdmin.cargar();
   return {total:document.getElementById("bda-est-total").textContent,empty:document.getElementById("bda-est-sin-datos").hidden};
  });
  assert.deepEqual(empty,{total:"0",empty:false});
  const both=await page.evaluate(async()=>{
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>[
    {fecha:"2026-11-10",herramienta:"lsp",formato:"png",accion:"descarga_solicitada",total:1},
    {fecha:"2026-11-10",herramienta:"braille",formato:"impresion",accion:"impresion_iniciada",total:2}
   ]});
   await window.EvaBDAEstadisticasAdmin.cargar();
   return {lsp:document.getElementById("bda-est-total").textContent,
     braille:document.getElementById("bda-est-impresiones").textContent,
     filas:document.querySelectorAll("#bda-est-detalle tr").length,
     detalle:document.getElementById("bda-est-detalle").textContent};
  });
  assert.equal(both.lsp,"1");
  assert.equal(both.braille,"2");
  assert.equal(both.filas,2);
  assert.match(both.detalle,/Braille · impresión iniciada/);
  const blocked=await page.evaluate(async()=>{
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"editor",aal:"aal2"});
   await window.EvaBDAEstadisticasAdmin.cargar();
   return document.getElementById("bda-est-total").textContent;
  });
  assert.equal(blocked,"—");
  const stale=await page.evaluate(async()=>{
   let resolver;
   const pendiente=new Promise(r=>{resolver=r;});
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:()=>pendiente});
   const anterior=window.EvaBDAEstadisticasAdmin.cargar();
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>[{fecha:"2026-11-10",herramienta:"lsp",formato:"png",accion:"descarga_solicitada",total:2}]});
   await window.EvaBDAEstadisticasAdmin.cargar();
   resolver([{fecha:"2026-11-10",herramienta:"lsp",formato:"png",accion:"descarga_solicitada",total:99}]);
   await anterior;
   const before=document.getElementById("bda-est-total").textContent;
   window.EvaBDAEstadisticasAdmin.limpiar();
   return {before,after:document.getElementById("bda-est-total").textContent};
  });
  assert.deepEqual(stale,{before:"2",after:"—"});
  assert.equal(await page.locator("#bda-est-impresiones").textContent(),"—");
  await page.evaluate(()=>{document.getElementById("panel-recursos-uso").hidden=false;document.body.classList.add("alto-contraste");});
  const layout=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(layout.actual<=layout.viewport+2,"Desbordamiento horizontal: "+JSON.stringify(layout));
  await page.close();
  console.log((mobile?"Móvil simulado":"Escritorio")+": consulta LSP, separación MEA, vacío, permisos, cambio de sesión y diseño aprobados");
 }
}finally{await browser.close();}
