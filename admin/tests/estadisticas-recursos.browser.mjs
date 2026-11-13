import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const js=await readFile(new URL("../estadisticas-recursos.js",import.meta.url),"utf8");
const css=await readFile(new URL("../admin.css",import.meta.url),"utf8");
const start=html.indexOf('<section class="tarjeta panel-seccion" id="panel-recursos-uso"');
const end=html.indexOf('<p id="mensaje-admin"',start);
assert.ok(start>0 && end>start,"Falta la sección MEA en el HTML real");
const markup=html.slice(start,end);
assert.match(markup,/Descargas y exportaciones de recursos/);
assert.match(markup,/Materiales Educativos Accesibles/);
assert.match(markup,/Herramientas con acciones registradas/);
assert.match(markup,/id="rec-grafico-sin-datos"/);
assert.match(markup,/No mide visitas, búsquedas, visualizaciones/);
const browser=await chromium.launch({headless:true});
try{
  for(const mobile of [false,true]){
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800}});
    await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+markup+'</body></html>');
    await page.addScriptTag({content:js});
    await page.evaluate(()=>document.getElementById("panel-recursos-uso").hidden=false);
    const initial=await page.evaluate(()=>document.getElementById("rec-total").textContent);
    assert.equal(initial,"—","No debe mostrar números antes del acceso");
    const first=await page.evaluate(async()=>{
      let calls=[];
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async dias=>{
        calls.push(dias);
        return [{fecha:"2026-11-10",herramienta:"pictogramas",formato:"png",accion:"descarga_solicitada",total:1}];
      }});
      await window.EvaRecursosEstadisticasAdmin.cargar();
      return {
        calls,values:["rec-total","rec-descargas","rec-exportaciones","rec-herramientas"].map(id=>document.getElementById(id).textContent),
        rows:document.querySelectorAll("#rec-tabla tr").length,
        graph:document.querySelectorAll("#rec-grafico [role=listitem]").length,
        emptyGraphHidden:document.getElementById("rec-grafico-sin-datos").hidden
      };
    });
    assert.deepEqual(first.calls,[30]);
    assert.deepEqual(first.values,["1","1","0","1"]);
    assert.equal(first.rows,1);
    assert.equal(first.graph,1);
    assert.equal(first.emptyGraphHidden,true);

    const change=await page.evaluate(async()=>{
      const input=document.getElementById("rec-periodo"); input.value="90";
      input.dispatchEvent(new Event("change"));
      await new Promise(resolve=>setTimeout(resolve,50));
      return document.getElementById("rec-grafico-titulo").textContent;
    });
    assert.equal(change,"Evolución mensual");

    const empty=await page.evaluate(async()=>{
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>[]});
      await window.EvaRecursosEstadisticasAdmin.cargar();
      return {total:document.getElementById("rec-total").textContent,
        status:document.getElementById("rec-estado").textContent,
        empty:document.getElementById("rec-sin-datos").hidden,
        emptyGraph:document.getElementById("rec-grafico-sin-datos").hidden,
        graphRows:document.querySelectorAll("#rec-grafico [role=listitem]").length};
    });
    assert.equal(empty.total,"0");
    assert.match(empty.status,/Sin acciones registradas/);
    assert.equal(empty.empty,false);
    assert.equal(empty.emptyGraph,false,"La gráfica sin acciones debe mostrar una explicación");
    assert.equal(empty.graphRows,0);

    const failed=await page.evaluate(async()=>{
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>{throw new Error("503");}});
      await window.EvaRecursosEstadisticasAdmin.cargar();
      return {value:document.getElementById("rec-total").textContent,status:document.getElementById("rec-estado").textContent,
        hiddenGraph:document.getElementById("rec-grafico-sin-datos").hidden};
    });
    assert.equal(failed.value,"—");
    assert.equal(failed.hiddenGraph,true);
    assert.match(failed.status,/No se pudieron consultar/);

    const denied=await page.evaluate(async()=>{
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"editor",aal:"aal2"});
      await window.EvaRecursosEstadisticasAdmin.cargar();
      return document.getElementById("rec-total").textContent;
    });
    assert.equal(denied,"—");
    // Respuesta rezagada no debe repoblar datos cuando se cierra la sesión.
    const stale=await page.evaluate(async()=>{
      let resolve;
      const pending=new Promise(r=>{resolve=r;});
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:()=>pending});
      const load=window.EvaRecursosEstadisticasAdmin.cargar();
      window.EvaRecursosEstadisticasAdmin.limpiar();
      resolve([{fecha:"2026-11-10",herramienta:"pictogramas",formato:"png",accion:"descarga_solicitada",total:99}]);
      await load;
      return document.getElementById("rec-total").textContent;
    });
    assert.equal(stale,"—");

    // Dos sesiones master sucesivas: nunca presentar respuesta de la anterior.
    const changedMaster=await page.evaluate(async()=>{
      let resolver;
      const old=new Promise(r=>{resolver=r;});
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:()=>old});
      const cargaAnterior=window.EvaRecursosEstadisticasAdmin.cargar();
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{
        consultar:async()=>[{fecha:"2026-11-10",herramienta:"rutinas",formato:"pdf",accion:"exportacion_iniciada",total:2}]
      });
      await window.EvaRecursosEstadisticasAdmin.cargar();
      resolver([{fecha:"2026-11-10",herramienta:"pictogramas",formato:"png",accion:"descarga_solicitada",total:99}]);
      await cargaAnterior;
      const resultado={
        total:document.getElementById("rec-total").textContent,
        filas:document.getElementById("rec-tabla").textContent,
        habilitado:!document.getElementById("rec-actualizar").disabled
      };
      window.EvaRecursosEstadisticasAdmin.configurar(null);
      resultado.despues= document.getElementById("rec-total").textContent;
      resultado.sinDatosOculto=document.getElementById("rec-sin-datos").hidden;
      return resultado;
    });
    assert.equal(changedMaster.total,"2","La respuesta de la cuenta anterior no debe reemplazar a la actual");
    assert.match(changedMaster.filas,/Rutinas visuales/);
    assert.equal(changedMaster.habilitado,true);
    assert.equal(changedMaster.despues,"—");
    assert.equal(changedMaster.sinDatosOculto,true);

    // Verificación de legibilidad a tamaños de dispositivo y alto contraste.
    await page.evaluate(()=>{
      document.body.classList.add("alto-contraste");
      document.getElementById("panel-recursos-uso").hidden=false;
    });
    const mobileLayout=await page.evaluate(()=>{
      const panel=document.getElementById("panel-recursos-uso");
      const summary=panel.querySelector(".estadisticas-resumen");
      return {
        viewport:document.documentElement.clientWidth,
        pageWidth:document.documentElement.scrollWidth,
        columns:getComputedStyle(summary).gridTemplateColumns.split(" ").length,
        inputLabel:document.querySelector('label[for="rec-periodo"]')?.textContent.trim(),
        statusRole:document.getElementById("rec-estado").getAttribute("role")
      };
    });
    assert.equal(mobileLayout.statusRole,"status");
    assert.match(mobileLayout.inputLabel,/Periodo de análisis de MEA/);
    if(mobile)assert.equal(mobileLayout.columns,2,"En móvil se requieren 2 columnas de indicadores");
    assert.ok(mobileLayout.pageWidth<=mobileLayout.viewport+2,"Desbordamiento horizontal con alto contraste");
    await page.close();
    console.log((mobile?"Movil simulado":"Escritorio")+": aprobados 6 escenarios de visualización, protección y borrado.");
  }
  const admin=await readFile(new URL("../admin.js",import.meta.url),"utf8");
  assert.ok(admin.includes('boton.dataset.panel === "recursos-uso"'));
  assert.ok(admin.includes('rpc/admin_estadisticas_recursos_mea'));
  assert.ok(admin.includes('EvaRecursosEstadisticasAdmin?.limpiar()'));
  console.log("Integración con menú, RPC MFA y limpieza administrativa verificada.");
}finally{await browser.close();}
