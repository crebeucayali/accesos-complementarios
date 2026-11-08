const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const index=fs.readFileSync("admin/index.html","utf8");
const begin=index.indexOf('<section class="tarjeta panel-seccion" id="panel-recurso-dia"');
const stop=index.indexOf('<section class="tarjeta panel-seccion" id="panel-noticias"',begin);
assert.ok(begin>=0 && stop>begin,"Sección admin aislable");
const panel=index.slice(begin,stop);
const source="admin/recurso-dia.js";
(async()=>{
  const browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox"]});
  try{
    for(const width of [1280,768,390,320]){
      const page=await browser.newPage({viewport:{width,height:920}});
      const errors=[];page.on("pageerror",e=>errors.push(e.message));
      await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fs.readFileSync("admin/admin.css","utf8")+'</style></head><body><main>'+panel+'</main></body></html>');
      await page.evaluate(()=>{
        window.__records=[];
        window.__calls=[];
        window.__profile={autorizado:true,rol:"master",aal:"aal2"};
        window.EvaAdminSession={
          getSession:()=>({user:{id:"test-master"},access_token:"TEST_TOKEN"}),
          request:async(path,options={})=>{
            window.__calls.push({path,method:options.method||"GET",body:options.body||null});
            if(path.startsWith("eva_recurso_dia_programacion?")&&(!options.method||options.method==="GET"))return structuredClone(window.__records);
            if(options.method==="POST"){
              const row=JSON.parse(options.body);row.id=window.__records.length+1;
              window.__records.push(row);return null;
            }
            if(options.method==="PATCH"){
              const id=Number(path.split("id=eq.")[1]);
              const row=window.__records.find(x=>x.id===id);
              Object.assign(row,JSON.parse(options.body));
              return null;
            }
            throw Error("Operación no esperada");
          }
        };
      });
      await page.addScriptTag({path:source});
      await page.evaluate(()=>window.EvaRecursoDiaAdmin.configurar(window.__profile));
      await page.evaluate(()=>{document.getElementById("dia-mes").value="2026-12";});
      await page.evaluate(()=>window.EvaRecursoDiaAdmin.cargar());
      assert.equal(await page.locator("#dia-calendario button").count(),31,"31 días");
      await page.locator("#dia-calendario button").nth(9).click();
      assert.equal(await page.locator("#dia-fecha").inputValue(),"2026-12-10");
      await page.locator("#dia-lsp-id").fill("LSP-000001");
      await page.locator("#dia-titulo-recurso").fill("Recurso de prueba");
      await page.locator("#dia-descripcion").fill("Descripción pedagógica");
      await page.locator("#dia-estado").selectOption("borrador");
      assert.equal(await page.locator("#dia-estado option[value=programado]").isDisabled(),true);
      await page.locator("#dia-guardar").click();
      await page.waitForFunction(()=>document.getElementById("dia-mensaje").textContent.includes("Borrador guardado"));
      let state=await page.evaluate(()=>({records:window.__records,calls:window.__calls}));
      assert.equal(state.records.length,1);
      assert.equal(state.records[0].estado,"borrador");
      assert.equal(state.records[0].fecha,"2026-12-10");
      assert.ok(state.calls.every(x=>["GET","POST","PATCH"].includes(x.method)));
      assert.ok(state.calls.filter(x=>x.method==="POST").length===1);
      await page.locator("#dia-titulo-recurso").fill("Recurso editado");
      await page.locator("#dia-guardar").click();
      await page.waitForFunction(()=>document.getElementById("dia-mensaje").textContent.includes("Borrador guardado"));
      state=await page.evaluate(()=>({records:window.__records,calls:window.__calls}));
      assert.equal(state.records.length,1);
      assert.equal(state.records[0].titulo,"Recurso editado");
      assert.equal(state.calls.filter(x=>x.method==="PATCH").length,1);
      const cols=await page.evaluate(()=>document.querySelector("#dia-calendario").scrollWidth>document.querySelector("#dia-calendario").clientWidth);
      assert.equal(cols,false,"Sin overflow de calendario");
      await page.evaluate(()=>window.EvaRecursoDiaAdmin.configurar({autorizado:false,rol:"editor",aal:"aal1"}));
      assert.equal(await page.locator("#dia-guardar").isDisabled(),true,"Sin permisos no puede guardar");
      assert.equal(errors.length,0,errors.join(" | "));
      console.log("PASS",width,"calendario, borrador, edición y restricciones");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
