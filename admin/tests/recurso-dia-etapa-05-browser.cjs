const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("fs");
const html=fs.readFileSync("admin/index.html","utf8");
const start=html.indexOf('<section class="tarjeta panel-seccion" id="panel-recurso-dia"');
const end=html.indexOf('<section class="tarjeta panel-seccion" id="panel-noticias"',start);
assert.ok(start>=0&&end>start);
const section=html.slice(start,end);
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox"]});
 try{
  for(const width of [1280,768,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
     fs.readFileSync("admin/admin.css","utf8")+'</style><main>'+section+'</main>');
   await page.locator("#panel-recurso-dia").evaluate(el=>el.hidden=false);
   await page.evaluate(()=>{
     window.__rows=[];window.__operations=[];
     window.EvaAdminSession={
       getSession:()=>({access_token:"TEST_MASTER",user:{id:"master-test"}}),
       request:async(path,opts={})=>{
         const method=opts.method||"GET";
         window.__operations.push({method,path,body:opts.body});
         if(method==="GET")return structuredClone(window.__rows);
         if(method==="POST"){
           const record=JSON.parse(opts.body);
           record.id=window.__rows.length+1;
           window.__rows.push(record);
           return opts.headers.Prefer==="return=representation"?[structuredClone(record)]:null;
         }
         if(method==="PATCH"){
           const id=Number(path.split("id=eq.")[1].split("&")[0]);
           const existing=window.__rows.find(x=>x.id===id);
           if(!existing)return [];
           Object.assign(existing,JSON.parse(opts.body));
           return opts.headers.Prefer==="return=representation"?[structuredClone(existing)]:null;
         }
         throw Error("Unexpected method "+method);
       }
     };
   });
   await page.route("https://api.arasaac.org/api/pictograms/es/search/**",
     r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify([{_id:111,keywords:[{keyword:"comer",type:1}]}])}));
   await page.route(/\.png$/,r=>r.fulfill({status:200,contentType:"image/png",
     body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5n8AAAAASUVORK5CYII=","base64")}));
   await page.addScriptTag({path:"admin/recurso-dia-fuentes.js"});
   await page.addScriptTag({path:"admin/recurso-dia.js"});
   await page.evaluate(()=>window.EvaRecursoDiaAdmin.configurar({autorizado:true,rol:"master",aal:"aal2"}));
   await page.evaluate(()=>{document.getElementById("dia-mes").value="2026-12";});
   await page.evaluate(()=>window.EvaRecursoDiaAdmin.cargar());
   assert.equal(await page.locator('#dia-estado option[value=programado]').getAttribute("disabled"),"","LSP blocked");
   await page.locator("#dia-tipo").selectOption("arasaac");
   assert.equal(await page.locator('#dia-estado option[value=programado]').getAttribute("disabled"),null,"ARASAAC programmable");
   await page.locator("#dia-busqueda").fill("comer");
   await page.locator("#dia-buscar").click();
   await page.waitForFunction(()=>document.querySelectorAll(".dia-fuente-resultado").length===1);
   await page.locator(".dia-fuente-resultado button").click();
   await page.locator("#dia-fecha").fill("2026-12-10");
   await page.locator("#dia-estado").selectOption("programado");
   await page.locator("#dia-guardar").click();
   assert.ok((await page.locator("#dia-mensaje").innerText()).includes("Completa título, descripción")||
     (await page.locator("#dia-mensaje").innerText()).includes("Confirm"),"Validation warning");
   assert.equal((await page.evaluate(()=>window.__operations.filter(x=>x.method!=="GET").length)),0,"Incomplete not written");
   await page.locator("#dia-descripcion").fill("Secuencia de ejemplo educativa revisada");
   await page.locator("#dia-derechos").check();
   await page.locator("#dia-revision").check();
   page.once("dialog",d=>d.accept());
   await page.locator("#dia-guardar").click();
   await page.waitForFunction(()=>document.getElementById("dia-mensaje").textContent.includes("Programación confirmada"));
   let state=await page.evaluate(()=>({rows:window.__rows,operations:window.__operations}));
   assert.equal(state.rows.length,1);
   assert.equal(state.rows[0].estado,"programado");
   assert.equal(state.rows[0].tipo,"arasaac");
   assert.equal(state.rows[0].fecha,"2026-12-10");
   assert.equal(state.rows[0].derechos_verificados,true);
   assert.equal(state.operations.filter(x=>x.method==="POST").length,1);
   page.once("dialog",d=>d.accept());
   await page.locator("#dia-registros button").click();
   await page.waitForFunction(()=>document.getElementById("dia-mensaje").textContent.includes("Programación retirada"));
   state=await page.evaluate(()=>({rows:window.__rows,operations:window.__operations}));
   assert.equal(state.rows[0].estado,"retirado");
   assert.equal(state.operations.filter(x=>x.method==="PATCH").length,1);
   assert.equal(errors.length,0,errors.join(" | "));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   console.log("PASS",width,"etapa05 validación de programación, fecha Perú y permisos");
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});