import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const script = await readFile(new URL("../../estadisticas/visitas-eva.js", import.meta.url), "utf8");
const browser = await chromium.launch({ headless: true });
const origin = "https://eva-pruebas.invalid";
const calls = [];
let fail = false;
async function wire(page, modulo="principal") {
  await page.route(origin + "/**", route => {
    const html = `<!doctype html><html><head></head><body><div data-eva-contador hidden><span data-eva-visitas-total></span></div><script src="/tracker.js" data-eva-modulo="${modulo}"></script></body></html>`;
    const url=new URL(route.request().url());
    return route.fulfill({status:200,contentType:url.pathname==="/tracker.js"?"application/javascript":"text/html",body:url.pathname==="/tracker.js"?script:html});
  });
  await page.route("https://dteimbhwtzghhsijeeld.supabase.co/**", route => {
    const url = new URL(route.request().url());
    const name=url.pathname.split("/").at(-1);
    if(name==="registrar_visita_eva_hito"){
      calls.push(JSON.parse(route.request().postData()||"{}"));
      if(fail)return route.fulfill({status:503,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"error":"simulated"}'});
      return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"hito":null}'});
    }
    return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'[{"total":1,"hoy":1}]'});
  });
}

try{
  // Same origin + same browser context: localStorage and Web Locks are shared.
  const context=await browser.newContext();
  const a=await context.newPage();
  const b=await context.newPage();
  await wire(a);await wire(b);
  await Promise.all([a.goto(origin+"/a"),b.goto(origin+"/b")]);
  await Promise.all([a.waitForFunction(()=>document.documentElement.dataset.evaVisitas==="registrada"),b.waitForFunction(()=>document.documentElement.dataset.evaVisitas==="registrada")]);
  assert.equal(calls.filter(c=>c.p_nueva_sesion).length,1,"Only one global session for two tabs");
  assert.equal(calls.filter(c=>c.p_nuevo_modulo).length,1,"Only one module view for two tabs");
  await a.reload();
  await a.waitForLoadState("load");
  await a.waitForTimeout(150);
  assert.equal(calls.length,1,"Reload must not duplicate");
  await context.close();

  // Network failure: no locally confirmed visit, then retry on interaction.
  const context2=await browser.newContext();
  const c=await context2.newPage();
  await wire(c,"bda");
  fail=true;
  await c.goto(origin+"/failure");
  await c.waitForFunction(()=>document.documentElement.dataset.evaVisitas==="error");
  const local=await c.evaluate(()=>localStorage.getItem("eva_visitas_sesion_v1"));
  assert.equal(local,null,"Failed request must not confirm local visit");
  fail=false;
  await c.evaluate(()=>{window.__evaTestTimeOffset=16001;});
  // Keep the request's retry throttle real-time: revisit via fresh page with
  // a fresh instance, ensuring a retry is possible without production writes.
  await c.reload();
  await c.waitForFunction(()=>document.documentElement.dataset.evaVisitas==="registrada");
  assert.equal(calls.at(-1).p_modulo,"bda");
  await context2.close();

  console.log("EVA browser integration passed: concurrent tabs, reload and HTTP recovery (mocked Supabase)");
}finally{await browser.close();}
