// Ejecutar con Node y Playwright instalado. Chromium puede indicarse con EVA_CHROMIUM.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),helper=process.env.EVA_SHARE_HELPER||path.resolve(root,'../shared-src/compartir-facebook.js');
const origin='https://crebeucayali.github.io',base='/accesos-complementarios/';
const html=fs.readFileSync(path.join(root,'recursos/galeria.html'),'utf8').replace(/<script\b[^>]*src="[^"]*(?:accesibilidad|visitas-eva)[^"]*"[^>]*>[\s\S]*?<\/script>/g,'');
const image=(id,n)=>({galeria_item_id:id,orden:n,imagen_url:`https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/galeria/prueba/${id}-${n}.webp`,imagen_alt:`Foto ${n} de ${id}`});
const items=[123,456,789].map((id,i)=>({id,fecha:'2026-09-15',titulo:'Actividad '+id,descripcion:'Descripción '+id,visible:true,publicacion_autorizada:true,estado_publicacion:'publicado',imagen_url:image(id,1).imagen_url,imagen_alt:'Foto principal',cantidad:[1,5,8][i]}));
let browser;
test('Compartir por actividad: enlaces, conteo, Web Share, fallback y responsive',async t=>{
 browser=await chromium.launch({headless:true,...(process.env.EVA_CHROMIUM?{executablePath:process.env.EVA_CHROMIUM}:{}),args:['--no-sandbox','--no-zygote','--disable-gpu']});
 try {
 for(const width of [1440,1024,768,480,320]) for(const native of [true,false]) await t.test(`${width}px; ${native?'Web Share':'fallback existente'}`,async()=>{
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],events=[];let active=items.slice(),failedStats=false,failedGallery=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({native})=>{window.shares=[];if(native)Object.defineProperty(navigator,'share',{configurable:true,value:data=>{window.shares.push(data);return Promise.resolve();}});},{native});
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,content-type,prefer','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(url.pathname.endsWith('/eva_compartidos_eventos')){events.push(req.postDataJSON());return route.fulfill({status:failedStats?500:201,headers,body:''});}
   if(url.pathname.endsWith('/galeria_items'))return route.fulfill({status:failedGallery?503:200,headers,json:active});
   if(url.pathname.endsWith('/galeria_item_imagenes'))return route.fulfill({headers,json:active.flatMap(item=>Array.from({length:item.cantidad},(_,i)=>image(item.id,i+1)))});
   if(url.pathname.startsWith('/storage/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#cce5df"/></svg>'});
   if(url.pathname==='/compartir-facebook.js')return route.fulfill({path:helper});
   if(url.pathname===base+'recursos/galeria.html')return route.fulfill({contentType:'text/html',body:html});
   const file=path.join(root,url.pathname.replace(base,''));if(url.hostname==='crebeucayali.github.io'&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
   return route.fulfill({status:200,contentType:'text/html',body:'<title>Destino simulado</title>'});
  });
  context.on('page',p=>{if(p!==page)p.waitForLoadState().then(()=>p.close()).catch(()=>{});});
  await page.goto(origin+base+'recursos/galeria.html#actividad-456');await page.waitForFunction(()=>document.documentElement.dataset.galeriaFuente==='supabase');
  assert.equal(await page.locator('.galeria-compartir').count(),3);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'actividad-456');
  await page.addScriptTag({url:origin+'/compartir-facebook.js?v=4'}); // Doble inicialización no duplica listeners.
  for(const item of items){
   const card=page.locator('#actividad-'+item.id),link=card.locator('.galeria-compartir');
   assert.equal(await card.locator('img').count(),item.cantidad);
   assert.equal(await link.textContent(),'Compartir');
   assert.equal(await link.getAttribute('data-compartir-url'),origin+base+'recursos/galeria.html#actividad-'+item.id);
   const old=events.length;
   await card.locator('.galeria-imagen-boton').last().focus();await page.keyboard.press('Tab');
   assert.equal(await link.evaluate(el=>el===document.activeElement),true);
   assert.notEqual(await link.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
   await page.keyboard.press('Enter');await page.waitForFunction(()=>document.documentElement.dataset.evaCompartir==='registrada');
   await page.waitForTimeout(80);
   assert.equal(events.length,old+1);
   assert.deepEqual(events.at(-1),{modulo:'galeria',pagina:base+'recursos/galeria.html#actividad-'+item.id});
   if(native){const data=await page.evaluate(()=>window.shares.at(-1));assert.equal(data.url,origin+events.at(-1).pagina);assert.match(data.text,/15 de se(?:p)?tiembre de 2026/);assert.equal(data.title,item.titulo);assert.equal('files' in data,false);}
   else{const url=new URL(await link.getAttribute('href'));assert.equal(url.hostname,'www.facebook.com');assert.equal(url.searchParams.get('href'),origin+events.at(-1).pagina);assert.match(url.searchParams.get('quote'),/15 de se(?:p)?tiembre de 2026/);}
   const bounds=await card.evaluate(el=>({right:el.getBoundingClientRect().right,overflow:el.scrollWidth>el.clientWidth}));assert.ok(bounds.right<=width);assert.equal(bounds.overflow,false);
  }
  const oldURL=await page.locator('#actividad-456 .galeria-compartir').getAttribute('data-compartir-url');
  active=items.filter(item=>item.id!==456);await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.galeriaFuente==='supabase');assert.equal(await page.locator('#actividad-456').count(),0);
  assert.equal(await page.locator('.galeria-compartir').count(),2);
  active=items.slice();await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.galeriaFuente==='supabase');assert.equal(await page.locator('#actividad-456 .galeria-compartir').getAttribute('data-compartir-url'),oldURL);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'actividad-456');
  await page.evaluate(()=>document.body.classList.add('alto-contraste'));
  assert.deepEqual(await page.locator('#actividad-456 .galeria-compartir').evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})),{color:'rgb(0, 0, 0)',background:'rgb(255, 255, 255)'});
  if(process.env.EVA_SHARE_SCREENSHOTS){fs.mkdirSync(process.env.EVA_SHARE_SCREENSHOTS,{recursive:true});await page.locator('#actividad-789').screenshot({path:path.join(process.env.EVA_SHARE_SCREENSHOTS,`share-${width}-${native}.png`)});}
  failedStats=true;const old=events.length;await page.locator('#actividad-456 .galeria-compartir').click();await page.waitForFunction(()=>document.documentElement.dataset.evaCompartir==='error');assert.equal(events.length,old+1);if(native)assert.ok((await page.evaluate(()=>window.shares.length))>0);
  if(native){await page.evaluate(()=>navigator.share=()=>Promise.reject(Object.assign(new Error('cancel'),{name:'AbortError'})));const before=events.length;await page.locator('#actividad-456 .galeria-compartir').click();await page.waitForTimeout(100);assert.equal(events.length,before+1);}
  failedGallery=true;await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.galeriaFuente==='error');assert.equal(await page.locator('.galeria-item').count(),0);
  assert.deepEqual(errors,[]);await context.close();
 });
 await t.test('Estadísticas: nombre Galería, título, fecha, enlace y participación',async()=>{
  const page=await browser.newPage();await page.goto('about:blank');
  await page.setContent('<table><tbody id="compartidos-modulos"></tbody></table><table><tbody id="compartidos-paginas"></tbody></table><span id="comp-periodo-acciones"></span><span id="comp-periodo-rango"></span>');
  const source=fs.readFileSync(path.join(root,'admin/admin.js'),'utf8');
  const functions=source.slice(source.indexOf('  const NOMBRES_MODULOS_COMPARTIDOS'),source.indexOf('  async function cargarEstadisticasCompartidos()'));
  await page.evaluate(`(async()=>{const NOMBRES_MODULOS={principal:'Plataforma principal'};const $=id=>document.getElementById(id);const numeroES=n=>String(n||0);const porcentajeES=n=>String(n)+'%';const fechaEstadistica=f=>f;window.queries=[];
  const rest=async(r)=>{window.queries.push(r);return r.startsWith('galeria_items')?[{id:123,titulo:'Actividad A',fecha:'2026-09-15'},{id:456,titulo:'Actividad B',fecha:'2026-09-15'}]:{acciones:4,modulos:[{modulo:'galeria',acciones:3},{modulo:'principal',acciones:1}],paginas_top:[{modulo:'galeria',pagina:'/accesos-complementarios/recursos/galeria.html#actividad-123',acciones:2},{modulo:'galeria',pagina:'/accesos-complementarios/recursos/galeria.html#actividad-456',acciones:1}]};};${functions} await cargarEstadisticasCompartidosPeriodo('7d');})()`);
  assert.match(await page.locator('#compartidos-modulos').textContent(),/Galería375%/);
  assert.equal(await page.locator('#compartidos-paginas a').count(),2);
  assert.match(await page.locator('#compartidos-paginas a').first().textContent(),/Actividad A.*2026-09-15/);
  assert.notEqual(await page.locator('#compartidos-paginas a').first().getAttribute('href'),await page.locator('#compartidos-paginas a').last().getAttribute('href'));
  assert.equal(await page.locator('#comp-periodo-acciones').textContent(),'4');
  assert.equal(await page.evaluate(()=>window.queries.length),2);await page.close();
 });
 for(const route of ['/','/capacitaciones/','/repositorio-accesible/','/noti-inclusivos/articulo.html']) await t.test('Regresión '+route,async()=>{
  const page=await browser.newPage(),events=[];await page.addInitScript(()=>{navigator.share=()=>{throw Error('No cambiar módulos anteriores');};});
  await page.route('**/*',r=>{const url=new URL(r.request().url());if(url.pathname.endsWith('/eva_compartidos_eventos')){events.push(r.request().postDataJSON());return r.fulfill({status:201,headers:{'Access-Control-Allow-Origin':origin},body:''});}if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,content-type,prefer'},body:''});if(url.pathname==='/compartir-facebook.js')return r.fulfill({path:helper});return r.fulfill({contentType:'text/html',body:'<a class="compartir-facebook" href="#">Compartir</a><script src="/compartir-facebook.js"></script>'});});
  await page.goto(origin+route);const a=page.locator('a');assert.equal(new URL(await a.getAttribute('href')).searchParams.get('href'),origin+route);
  await a.click();await page.waitForTimeout(100);assert.equal(events.length,1);assert.equal(events[0].pagina,route);await page.close();
 });
 }finally{await browser.close();}
});
