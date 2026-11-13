import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
const js=await readFile(new URL("../estadisticas-recursos.js",import.meta.url),"utf8");
const util=await readFile(new URL("../estadisticas-uso-util.js",import.meta.url),"utf8");
const css=await readFile(new URL("../admin.css",import.meta.url),"utf8");
const start=html.indexOf('<section class="tarjeta panel-seccion" id="panel-recursos-uso"');
const end=html.indexOf('<p id="mensaje-admin"',start);
assert.ok(start>0 && end>start,"Falta la sección MEA en el HTML real");
const markup=html.slice(start,end);
assert.match(markup,/Descargas y exportaciones de recursos/);
assert.match(markup,/Materiales Educativos Accesibles/);
assert.match(markup,/Herramientas con acciones registradas/);
assert.match(markup,/id="rec-grafico-sin-datos"/);
assert.match(markup,/¿Qué se contabiliza en MEA\?/);
assert.match(markup,/class="rec-modulo rec-modulo-mea"/);
assert.match(markup,/id="rec-grafico-escala"/);
assert.match(markup,/Cada módulo presenta sus propias cifras/);
assert.match(markup,/id="rec-herramientas-tabla"/);
assert.match(markup,/id="rec-exportar-csv"[^>]*disabled/);
const browser=await chromium.launch({headless:true});
try{
  for(const mobile of [false,true]){
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},acceptDownloads:true});
    await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+markup+'</body></html>');
    await page.addScriptTag({content:util});
    await page.addScriptTag({content:js});
    await page.evaluate(()=>document.getElementById("panel-recursos-uso").hidden=false);
    const initial=await page.evaluate(()=>document.getElementById("rec-total").textContent);
    assert.equal(initial,"—","No debe mostrar números antes del acceso");
    assert.equal(await page.locator("#rec-exportar-csv").isDisabled(),true,"No CSV antes de consultar");
    const injection=await page.evaluate(()=>window.EvaUsoRecursosUtil.crearCSV(["Dato"],[["=2+2"]]));
    assert.match(injection,/"'=2\+2"/,"CSV evita celdas de fórmula");
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
        emptyGraphHidden:document.getElementById("rec-grafico-sin-datos").hidden,
        scale:document.getElementById("rec-grafico-escala").textContent,
        scaleHidden:document.getElementById("rec-grafico-escala").hidden,
        barWidth:document.querySelector("#rec-grafico .rec-grafico-valor")?.style.width,
        legible:document.querySelector("#rec-grafico .rec-grafico-fecha")?.textContent,
        summary:document.querySelectorAll("#rec-herramientas-tabla tr").length,
        csvEnabled:!document.getElementById("rec-exportar-csv").disabled
      };
    });
    assert.deepEqual(first.calls,[30]);
    assert.deepEqual(first.values,["1","1","0","1"]);
    assert.equal(first.rows,1);
    assert.equal(first.graph,1);
    assert.equal(first.emptyGraphHidden,true);
    assert.equal(first.scaleHidden,false);
    assert.match(first.scale,/0 a 5 acciones/);
    assert.equal(first.barWidth,"20%","Una acción equivale a 1 de 5, no a 100 %");
    assert.equal(first.legible,"10/11/2026");
    assert.equal(first.summary,1);
    assert.equal(first.csvEnabled,true);

    const change=await page.evaluate(async()=>{
      const input=document.getElementById("rec-periodo"); input.value="90";
      input.dispatchEvent(new Event("change"));
      await new Promise(resolve=>setTimeout(resolve,50));
      return document.getElementById("rec-grafico-titulo").textContent;
    });
    assert.equal(change,"Evolución mensual");
    const resumen=await page.evaluate(async()=>{
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{
        consultar:async()=>[
          {fecha:"2026-11-13",herramienta:"pictogramas",formato:"png",accion:"descarga_solicitada",total:3},
          {fecha:"2026-11-10",herramienta:"pictogramas",formato:"pdf",accion:"exportacion_iniciada",total:1},
          {fecha:"2026-10-30",herramienta:"rutinas",formato:"pdf",accion:"exportacion_iniciada",total:2}
        ]
      });
      await window.EvaRecursosEstadisticasAdmin.cargar();
      return {
        values:["rec-total","rec-descargas","rec-exportaciones","rec-herramientas"].map(id=>document.getElementById(id).textContent),
        rows:[...document.querySelectorAll("#rec-herramientas-tabla tr")].map(x=>x.textContent),
        months:[...document.querySelectorAll("#rec-grafico .rec-grafico-fecha")].map(x=>x.textContent),
        csv:!document.getElementById("rec-exportar-csv").disabled
      };
    });
    assert.deepEqual(resumen.values,["6","3","3","2"]);
    assert.equal(resumen.rows.length,2);
    assert.match(resumen.rows[0],/Pictogramas/);
    assert.match(resumen.rows[0],/314/);
    assert.match(resumen.rows[1],/Rutinas visuales/);
    assert.deepEqual(resumen.months,["10/2026","11/2026"]);
    assert.equal(resumen.csv,true);
    const [download]=await Promise.all([page.waitForEvent("download"),page.locator("#rec-exportar-csv").click()]);
    assert.match(download.suggestedFilename(),/EVA-MEA-uso-recursos-ultimos-90-dias-.*\.csv/);
    const csv=await readFile(await download.path(),"utf8");
    assert.ok(csv.startsWith("\uFEFF"));
    assert.match(csv,/10\/11\/2026/);
    assert.match(csv,/13\/11\/2026/);
    assert.match(csv,/Pictogramas/);
    assert.doesNotMatch(csv,/correo|usuario|dirección IP/i);

    const empty=await page.evaluate(async()=>{
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>[]});
      await window.EvaRecursosEstadisticasAdmin.cargar();
      return {total:document.getElementById("rec-total").textContent,
        status:document.getElementById("rec-estado").textContent,
        empty:document.getElementById("rec-sin-datos").hidden,
        emptyGraph:document.getElementById("rec-grafico-sin-datos").hidden,
        graphRows:document.querySelectorAll("#rec-grafico [role=listitem]").length,
        scaleHidden:document.getElementById("rec-grafico-escala").hidden,
        csvDisabled:document.getElementById("rec-exportar-csv").disabled,
        toolsEmpty:document.getElementById("rec-herramientas-sin-datos").hidden};
    });
    assert.equal(empty.total,"0");
    assert.match(empty.status,/Sin acciones registradas/);
    assert.equal(empty.empty,false);
    assert.equal(empty.emptyGraph,false,"La gráfica sin acciones debe mostrar una explicación");
    assert.equal(empty.graphRows,0);
    assert.equal(empty.scaleHidden,true);
    assert.equal(empty.csvDisabled,true);
    assert.equal(empty.toolsEmpty,false);

    const failed=await page.evaluate(async()=>{
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:async()=>{throw new Error("503");}});
      await window.EvaRecursosEstadisticasAdmin.cargar();
      return {value:document.getElementById("rec-total").textContent,status:document.getElementById("rec-estado").textContent,
        hiddenGraph:document.getElementById("rec-grafico-sin-datos").hidden,
        hiddenScale:document.getElementById("rec-grafico-escala").hidden,
        csvDisabled:document.getElementById("rec-exportar-csv").disabled};
    });
    assert.equal(failed.value,"—");
    assert.equal(failed.hiddenGraph,true);
    assert.equal(failed.hiddenScale,true);
    assert.equal(failed.csvDisabled,true);
    assert.match(failed.status,/No se pudieron consultar/);

    const denied=await page.evaluate(async()=>{
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"editor",aal:"aal2"});
      await window.EvaRecursosEstadisticasAdmin.cargar();
      return {total:document.getElementById("rec-total").textContent,
        disabled:document.getElementById("rec-exportar-csv").disabled};
    });
    assert.equal(denied.total,"—");
    assert.equal(denied.disabled,true);
    // Respuesta rezagada no debe repoblar datos cuando se cierra la sesión.
    const stale=await page.evaluate(async()=>{
      let resolve;
      const pending=new Promise(r=>{resolve=r;});
      window.EvaRecursosEstadisticasAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"},{consultar:()=>pending});
      const load=window.EvaRecursosEstadisticasAdmin.cargar();
      window.EvaRecursosEstadisticasAdmin.limpiar();
      resolve([{fecha:"2026-11-10",herramienta:"pictogramas",formato:"png",accion:"descarga_solicitada",total:99}]);
      await load;
      return {total:document.getElementById("rec-total").textContent,
        disabled:document.getElementById("rec-exportar-csv").disabled};
    });
    assert.equal(stale.total,"—");
    assert.equal(stale.disabled,true);

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
        habilitado:!document.getElementById("rec-actualizar").disabled,
        csvHabilitado:!document.getElementById("rec-exportar-csv").disabled
      };
      window.EvaRecursosEstadisticasAdmin.configurar(null);
      resultado.despues= document.getElementById("rec-total").textContent;
      resultado.sinDatosOculto=document.getElementById("rec-sin-datos").hidden;
      resultado.csvFinal=document.getElementById("rec-exportar-csv").disabled;
      return resultado;
    });
    assert.equal(changedMaster.total,"2","La respuesta de la cuenta anterior no debe reemplazar a la actual");
    assert.match(changedMaster.filas,/Rutinas visuales/);
    assert.equal(changedMaster.habilitado,true);
    assert.equal(changedMaster.csvHabilitado,true);
    assert.equal(changedMaster.despues,"—");
    assert.equal(changedMaster.sinDatosOculto,true);
    assert.equal(changedMaster.csvFinal,true);

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
