// HTML y JS reales; Auth y correo simulados. Nunca envía una invitación real.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'../..');
const origin='https://crebeucayali.github.io',base='/accesos-complementarios/';
test('Panel por rol, invitación y activación sin MFA para publicador',async t=>{
 const browser=await chromium.launch({headless:true,...(process.env.EVA_CHROMIUM?{executablePath:process.env.EVA_CHROMIUM}:{}),args:['--no-sandbox','--no-zygote','--disable-gpu']});
 try{
 for(const width of [1366,390])for(const role of ['master','editor','consulta'])await t.test(`${role}; ${width}px`,async()=>{
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],invites=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({role})=>{
   const listeners=[],state={role,aal:role==='master'?'aal2':'aal1',modules:['galeria','noticias'],authorized:true};let session={access_token:'synthetic-token',user:{id:role+'-id',email:'sin-envio@example.invalid'}};
   const auth={getSession:()=>session,ensureSession:async()=>session,subscribe:f=>listeners.push(f),signOut:async()=>{session=null;listeners.forEach(f=>f('SIGNED_OUT'));return{remote:true};},getAuthorization:async()=>({autorizado:state.authorized,aal:state.aal}),
    request:async ruta=>{window.testCalls.push(ruta);if(ruta==='rpc/perfil_panel_admin')return{autorizado:state.authorized,user_id:session.user.id,rol:state.role,aal:state.aal,modulos:state.role==='master'?['capacitaciones','calendario','repositorio','noticias','galeria']:state.modules,nombre:'Usuario sintético',email:session.user.email};
     if(ruta==='rpc/estado_mfa_admin')return{aal:state.aal,factor_id:'factor-test',tiene_factor_verificado:true};
     if(ruta==='rpc/admin_listar_usuarios')return[{user_id:'master-id',email:'master@example.invalid',nombre:'Master sintético',rol:'master',activo:true,modulos:[],confirmado:true},{user_id:'publisher-id',email:'sin-envio@example.invalid',nombre:'Publicador sintético',rol:'editor',activo:true,modulos:['galeria'],confirmado:true}];
     if(ruta.startsWith('rpc/estadisticas_'))return{};
     if(ruta.startsWith('rpc/admin_'))return{};
     if(ruta.includes('select=id,titulo'))return[{id:123,titulo:'Contenido preparado',visible:true,estado_publicacion:'publicado',publicacion_autorizada:true,updated_at:'2026-10-01T00:00:00Z'},{id:456,titulo:'Contenido archivado',visible:false,estado_publicacion:'archivado',publicacion_autorizada:true,updated_at:'2026-10-01T00:00:00Z'}];return[];},
    verifyMfa:async()=>{state.aal='aal2';return session;}};
   window.testCalls=[];window.EvaAdminSession=auth;window.testAuth={state,emit:()=>listeners.forEach(f=>f('TOKEN_REFRESHED',session)),session:()=>session};
  },{role});
  await page.route('**/*',route=>{const req=route.request(),u=new URL(req.url());
   if(u.pathname.endsWith('admin-sesion.js')||u.pathname.includes('/accesibilidad/'))return route.fulfill({contentType:'application/javascript',body:''});
   if(u.pathname==='/functions/v1/admin-invitar-editor'){if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type'},body:''});invites.push(req.postDataJSON());return route.fulfill({headers:{'Access-Control-Allow-Origin':origin},json:{invitado:true,message:'Invitación sintética enviada'}});}
   if(u.pathname.startsWith('/auth/v1/factors/'))return route.fulfill({headers:{'Access-Control-Allow-Origin':origin},json:{id:'challenge-test'}});
   let rel=u.pathname.replace(base,'');if(rel==='admin/')rel='admin/index.html';const file=path.join(root,rel);if(u.hostname==='crebeucayali.github.io'&&fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
   return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'});
  });
  await page.goto(origin+base+'admin/');await page.waitForFunction(()=>!document.getElementById('seccion-admin').hidden);
  if(role==='master'){
   assert.equal(await page.locator('.tab:not([hidden])').count(),7);await page.locator('[data-panel="usuarios"]').click();
   assert.equal(await page.locator('#form-usuario-invitar').isVisible(),true);assert.equal(await page.locator('#usuario-invitar').isEnabled(),true);
   assert.equal(await page.locator('#usuario-editar-rol option[value="editor"]').textContent(),'Publicador');assert.equal(await page.locator('#usuario-editar-rol option[value="master"]').count(),0);
   assert.match(await page.locator('#usuarios-listado').textContent(),/Publicador/);
   await page.locator('#usuario-nuevo-nombre').fill('Piloto sintético');await page.locator('#usuario-nuevo-email').fill('SIN-ENVIO@EXAMPLE.INVALID');
   await page.locator('#usuario-invitar').click();await page.waitForFunction(()=>document.getElementById('usuarios-mensaje').textContent.includes('al menos un módulo'));assert.equal(invites.length,0);
   await page.locator('#usuario-nuevo-modulos input[value="galeria"]').check();await page.locator('#usuario-nuevo-modulos input[value="noticias"]').check();await page.locator('#usuario-invitar').click();await page.waitForFunction(()=>document.getElementById('usuarios-mensaje').textContent.includes('sintética enviada'));
   assert.deepEqual(invites,[{email:'sin-envio@example.invalid',nombre:'Piloto sintético',modulos:['noticias','galeria']}]);
   await page.evaluate(()=>{window.testAuth.state.aal='aal1';window.testAuth.emit();});await page.waitForFunction(()=>!document.getElementById('seccion-mfa').hidden);
   assert.equal(await page.locator('#seccion-admin').isVisible(),false);assert.equal(await page.locator('#mfa-enrolamiento').isVisible(),false);
   await page.locator('#codigo-mfa').fill('123456');await page.locator('#form-mfa button[type="submit"]').click();await page.waitForFunction(()=>!document.getElementById('seccion-admin').hidden);
  }else{
   assert.equal(await page.locator('#seccion-mfa').isVisible(),false);assert.equal(await page.locator('.tab:not([hidden])').count(),2);
   assert.equal(await page.locator('[data-panel="usuarios"]').isVisible(),false);assert.equal(await page.locator('[data-panel="estadisticas"]').isVisible(),false);
   await page.locator('[data-panel="galeria"]').click();assert.equal(await page.locator('#panel-galeria [data-master-contenido]').isVisible(),false);
   const labels=await page.locator('#publicacion-listado-galeria button').allTextContents();assert.deepEqual(labels,role==='editor'?['Archivar','Publicar']:[]);
   assert.equal(await page.evaluate(()=>window.testCalls.some(x=>x.includes('mfa'))),false);
   if(role==='editor')assert.match(await page.locator('#usuario-actual').textContent(),/Publicador/);
   await page.evaluate(()=>{window.testAuth.state.modules=['galeria'];window.testAuth.emit();});await page.waitForFunction(()=>document.querySelector('[data-panel="noticias"]').hidden);
   assert.equal(await page.locator('#seccion-mfa').isVisible(),false);
  }
  if(process.env.EVA_INVITE_SCREENSHOTS){fs.mkdirSync(process.env.EVA_INVITE_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.EVA_INVITE_SCREENSHOTS,`publicadores-${role}-${width}.png`),fullPage:true});}
  assert.deepEqual(errors,[]);await page.close();
 });
 }finally{await browser.close();}
});
