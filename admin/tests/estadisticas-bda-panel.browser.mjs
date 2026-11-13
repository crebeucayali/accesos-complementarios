import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const js=await readFile(new URL("../estadisticas-bda.js",import.meta.url),"utf8");
const util=await readFile(new URL("../estadisticas-uso-util.js",import.meta.url),"utf8");
const css=await readFile(new URL("../admin.css",import.meta.url),"utf8");
const admin=await readFile(new URL("../admin.js",import.meta.url),"utf8");
assert.match(html,/estadisticas-bda\.js\?v=2/);
assert.match(html,/estadisticas-uso-util\.js\?v=1/);
assert.match(admin,/rpc\/admin_estadisticas_recursos_bda/);
assert.match(admin,/EvaBDAEstadisticasAdmin\?\.limpiar\(\)/);
assert.match(admin,/EvaBDAEstadisticasAdmin\?\.cargar\(\)/);
const start=html.indexOf('<section class="tarjeta panel-seccion" id="panel-recursos-uso"');
const end=html.indexOf('<p id="mensaje-admin"',start);
assert.ok(start>0 && end>start);
const section=html.slice(start,end);
assert.match(section,/Solicitudes de descarga de imágenes LSP/);
assert.match(section,/Tipo de recurso/);
assert.match(section,/¿Qué se contabiliza en BDA\?/);
assert.match(section,/class="estadisticas-bloque rec-modulo rec-modulo-bda"/);
assert.match(section,/Solicitudes de descarga PNG de imágenes de Lengua de Señas Peruana/);
assert.match(section,/Actualizar datos de BDA/);
assert.match(section,/id="bda-est-grafico"/);
assert.match(section,/id="bda-est-grafico-escala"/);
assert.match(section,/id="bda-est-exportar-csv"[^>]*disabled/);
const browser=await chromium.launch({headless:true});
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},acceptDownloads:true});
  await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+section+'</body></html>');
  await page.addScriptTag({content:util});
  await page.addScriptTag({content:js});
  await page.evaluate(()=>document.getElementById("panel-recursos-uso").hidden=false);
  assert.equal(await page.locator("#bda-est-exportar-csv").isDisabled(),true);
  const output=await page.evaluate(async()=>{
   let args=[];
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async dias=>{
    args.push(dias);
    return [{fecha:"2026-11-10",herramienta:"lsp",formato:"png",accion:"descarga_solicitada",total:1}];
   }});
   await window.EvaBDAEstadisticasAdmin.cargar();
   return {args,total:document.getElementById("bda-est-total").textContent,
     filas:document.querySelectorAll("#bda-est-detalle tr").length,
     fecha:document.querySelector("#bda-est-detalle th")?.textContent,
     grafico:document.querySelectorAll("#bda-est-grafico [role=listitem]").length,
     ancho:document.querySelector("#bda-est-grafico .rec-grafico-valor")?.style.width,
     escala:document.getElementById("bda-est-grafico-escala").textContent,
     exportar:!document.getElementById("bda-est-exportar-csv").disabled,
     mea:document.getElementById("rec-total").textContent};
  });
  assert.deepEqual(output.args,[30]);
  assert.equal(output.total,"1");
  assert.equal(output.filas,1);
  assert.equal(output.mea,"—","BDA no debe incrementar los indicadores MEA");
  assert.equal(output.fecha,"10/11/2026");
  assert.equal(output.grafico,1);
  assert.equal(output.ancho,"20%");
  assert.match(output.escala,/0 a 5 solicitudes/);
  assert.equal(output.exportar,true);

  const evolucion=await page.evaluate(async()=>{
    document.getElementById("bda-est-periodo").value="90";
    window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>[
      {fecha:"2026-10-30",herramienta:"lsp",formato:"png",accion:"descarga_solicitada",total:1},
      {fecha:"2026-11-13",herramienta:"lsp",formato:"png",accion:"descarga_solicitada",total:10}
    ]});
    await window.EvaBDAEstadisticasAdmin.cargar();
    return {total:document.getElementById("bda-est-total").textContent,
      titulo:document.getElementById("bda-est-grafico-titulo").textContent,
      months:[...document.querySelectorAll("#bda-est-grafico .rec-grafico-fecha")].map(n=>n.textContent),
      fechas:[...document.querySelectorAll("#bda-est-detalle th")].map(n=>n.textContent)};
  });
  assert.equal(evolucion.total,"11");
  assert.equal(evolucion.titulo,"Evolución mensual de BDA");
  assert.deepEqual(evolucion.months,["10/2026","11/2026"]);
  assert.deepEqual(evolucion.fechas,["13/11/2026","30/10/2026"]);
  const [download]=await Promise.all([page.waitForEvent("download"),page.locator("#bda-est-exportar-csv").click()]);
  assert.match(download.suggestedFilename(),/EVA-BDA-uso-recursos-ultimos-90-dias-.*\.csv/);
  const csv=await readFile(await download.path(),"utf8");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv,/13\/11\/2026/);
  assert.match(csv,/10/);
  assert.doesNotMatch(csv,/correo|usuario|dirección IP/i);
  const empty=await page.evaluate(async()=>{
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>[]});
   await window.EvaBDAEstadisticasAdmin.cargar();
   return {total:document.getElementById("bda-est-total").textContent,
     empty:document.getElementById("bda-est-sin-datos").hidden,
     graphEmpty:document.getElementById("bda-est-grafico-sin-datos").hidden,
     scaleHidden:document.getElementById("bda-est-grafico-escala").hidden,
     csvDisabled:document.getElementById("bda-est-exportar-csv").disabled};
  });
  assert.deepEqual(empty,{total:"0",empty:false,graphEmpty:false,scaleHidden:true,csvDisabled:true});
  const blocked=await page.evaluate(async()=>{
   window.EvaBDAEstadisticasAdmin.configurar({autorizado:true,rol:"editor",aal:"aal2"});
   await window.EvaBDAEstadisticasAdmin.cargar();
   return {total:document.getElementById("bda-est-total").textContent,
      disabled:document.getElementById("bda-est-exportar-csv").disabled};
  });
  assert.deepEqual(blocked,{total:"—",disabled:true});
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
   const enabled=!document.getElementById("bda-est-exportar-csv").disabled;
   window.EvaBDAEstadisticasAdmin.limpiar();
   return {before,after:document.getElementById("bda-est-total").textContent,
     enabled,disabled:document.getElementById("bda-est-exportar-csv").disabled,
     graphCount:document.querySelectorAll("#bda-est-grafico [role=listitem]").length};
  });
  assert.deepEqual(stale,{before:"2",after:"—",enabled:true,disabled:true,graphCount:0});
  await page.evaluate(()=>{document.getElementById("panel-recursos-uso").hidden=false;document.body.classList.add("alto-contraste");});
  const layout=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert.ok(layout.actual<=layout.viewport+2,"Desbordamiento horizontal: "+JSON.stringify(layout));
  await page.close();
  console.log((mobile?"Móvil simulado":"Escritorio")+": consulta LSP, separación MEA, vacío, permisos, cambio de sesión y diseño aprobados");
 }
}finally{await browser.close();}
