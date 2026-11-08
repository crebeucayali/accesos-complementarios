const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const html=fs.readFileSync("admin/index.html","utf8");
const start=html.indexOf('<section class="tarjeta panel-seccion" id="panel-recurso-dia"');
const stop=html.indexOf('<section class="tarjeta panel-seccion" id="panel-noticias"',start);
assert.ok(start>0&&stop>start);
const panel=html.slice(start,stop);
const bda=[
{id:"LSP-000001",palabra:"hola",categoria:"saludos",descripcion:"Mover la mano para saludar",archivo_imagen:"imagenes/verbos/hola.png"},
{id:"LSP-000092",palabra:"con",categoria:"adverbios_y_preposiciones",descripcion:"No mostrar",archivo_imagen:"imagenes/adverbios_y_preposiciones/con.png"},
{id:"LSP-000002",palabra:"hola sin descripcion",categoria:"saludos",descripcion:"",archivo_imagen:"imagenes/verbos/otro.png"}
];
const pictos=[
{_id:111,keywords:[{keyword:"comer",type:1}]},
{_id:222,keywords:[{keyword:"alimento",type:1}]},
{_id:333,keywords:[{keyword:"desayuno",type:1}]},
{_id:444,keywords:[{keyword:"merienda",type:1}]}
];
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox"]});
 try{
  for(const width of [1280,768,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",x=>errors.push(x.message));
   await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fs.readFileSync("admin/admin.css","utf8")+'</style><main>'+panel+'</main>');
   await page.locator("#panel-recurso-dia").evaluate(x=>x.hidden=false);
   await page.evaluate(()=>{
     window.__requests=[];
     window.__profile={autorizado:true,rol:"master",aal:"aal2"};
     window.EvaAdminSession={
       getSession:()=>({access_token:"TEST",user:{id:"test"}}),
       request:async(path,options={})=>{
         window.__requests.push({path,method:options.method||"GET",data:options.body||""});
         if(!options.method)return [];
         if(options.method==="POST")return null;
         throw Error("Unexpected request");
       }
     };
   });
   await page.route("https://crebeucayali.github.io/banco-digital-accesible/lsp/diccionario_lsp.json",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(bda)}));
   await page.route("https://api.arasaac.org/api/pictograms/es/search/**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(pictos)}));
   await page.route(/\.(png|webp)$/,r=>r.fulfill({status:200,contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5n8AAAAASUVORK5CYII=","base64")}));
   await page.addScriptTag({path:"admin/recurso-dia-fuentes.js"});
   await page.addScriptTag({path:"admin/recurso-dia.js"});
   await page.evaluate(()=>window.EvaRecursoDiaAdmin.configurar(window.__profile));
   await page.evaluate(()=>{$("dia-mes").value="2026-12";function $(id){return document.getElementById(id)}});
   await page.evaluate(()=>window.EvaRecursoDiaAdmin.cargar());
   await page.locator("#dia-busqueda").fill("hola");
   await page.locator("#dia-buscar").click();
   await page.waitForFunction(()=>document.querySelectorAll(".dia-fuente-resultado").length===1);
   await page.locator(".dia-fuente-resultado button").first().click();
   assert.equal(await page.locator("#dia-lsp-id").inputValue(),"LSP-000001");
   assert.ok((await page.locator("#dia-imagen-lsp").inputValue()).includes("/lsp/imagenes/verbos/hola.png"));
   assert.equal(await page.locator("#dia-derechos").isChecked(),false,"La selección no otorga derechos LSP");
   assert.equal(await page.locator("#dia-licencia").inputValue(),"","No inventar licencia LSP");
   await page.locator("#dia-tipo").selectOption("arasaac");
   assert.equal(await page.locator("#dia-lsp-id").inputValue(),"","Cambiar tipo limpia origen anterior");
   await page.locator("#dia-busqueda").fill("comer");
   await page.locator("#dia-buscar").click();
   await page.waitForFunction(()=>document.querySelectorAll(".dia-fuente-resultado").length===4);
   for(let i=0;i<3;i++) await page.locator(".dia-fuente-resultado button").nth(i).click();
   assert.equal(await page.locator("#dia-arasaac-ids").inputValue(),"111, 222, 333");
   await page.locator(".dia-fuente-resultado button").nth(3).click();
   assert.equal(await page.locator("#dia-arasaac-ids").inputValue(),"111, 222, 333","No admite un cuarto pictograma");
   assert.ok((await page.locator("#dia-atribucion").inputValue()).includes("Sergio Palao"));
   assert.equal(await page.locator("#dia-licencia").inputValue(),"CC BY-NC-SA 4.0");
   assert.equal(await page.locator("#dia-derechos").isChecked(),false,"No marcar verificación automáticamente");
   assert.equal(await page.locator("#dia-estado option[value=publicado]").getAttribute("disabled"),"","Publicación manual bloqueada");
   assert.equal(await page.locator("#dia-estado option[value=programado]").isEnabled(),true,"ARASAAC permite programación posterior a validación");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,"Sin desbordamiento horizontal");
   await page.locator("#dia-fecha").fill("2026-12-10");
   await page.locator("#dia-guardar").click();
   await page.waitForFunction(()=>document.getElementById("dia-mensaje").textContent.includes("Borrador guardado"));
   const requests=await page.evaluate(()=>window.__requests);
   const posted=requests.find(r=>r.method==="POST");
   assert.ok(posted,"Guardado en borrador");
   const data=JSON.parse(posted.data);
   assert.equal(data.estado,"borrador");
   assert.deepEqual(data.arasaac_ids,[111,222,333]);
   assert.equal(data.derechos_verificados,false);
   assert.equal(errors.length,0,errors.join(" | "));
   console.log("PASS",width,"BDA realista, ARASAAC, tres selecciones, créditos, derechos y borrador");
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});