const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const initial = () => ({access_token:'synthetic-aal2',refresh_token:'synthetic-refresh',expires_at:9999999999,user:{id:'synthetic-user',email:'synthetic@example.invalid'}});
function panel(options = {}) {
  let current = options.noSession ? null : initial();
  let aal = options.aal || 'aal2';
  let authError = options.authError || null;
  let contentError = options.contentError || false;
  let authorization = options.authorized !== false;
  let role = options.role || 'master'; let modules=options.modules || ['noticias'];
  const calls=[];const requests=[];const listeners=[];const nodes=new Map();
  let authCount=0;let resolveChallenge=null;
  function element(id) {
    if (!nodes.has(id)) nodes.set(id,{hidden:['seccion-admin','seccion-mfa','boton-reintentar-acceso'].includes(id),disabled:false,value:'',textContent:'',dataset:{},style:{},handlers:{},
      classList:{toggle(){},add(){},remove(){}},closest(){return element('seccion-login');},
      addEventListener(name,fn){this.handlers[name]=fn;},querySelector(){return element(id+'-submit');},
      querySelectorAll(selector){if(id.startsWith('panel-') && !['panel-inicio','panel-usuarios','panel-estadisticas'].includes(id))return [element(id+'-field')];return [];},replaceChildren(){this.replaced=true;},appendChild(){},append(){},focus(){},removeAttribute(){},setAttribute(){}});
    return nodes.get(id);
  }
  function publish(event,error) {listeners.forEach(fn => fn(event,current,error));}
  const auth={
    getSession:() => current,
    async ensureSession(){if (!current){const e=new Error('expired');e.definitive=true;throw e;} return current;},
    async getAuthorization(){authCount++; if(authError)throw authError;return {autorizado:authorization,aal};},
    async request(p,opts){calls.push(p);requests.push({path:p,options:opts});
      if(p==='rpc/perfil_panel_admin')return {autorizado:authorization,aal,user_id:'synthetic-user',email:'synthetic@example.invalid',rol:role,modulos:modules};
      if(p==='rpc/estado_mfa_admin')return [{aal,factor_id:'synthetic-factor',tiene_factor_verificado:true}];
      if(contentError && p.startsWith('noticias_destacadas'))throw new Error('synthetic content outage');
      if(p.startsWith('rpc/'))return [{}];return [];},
    async signIn(email,password){if(password==='wrong')throw new Error('invalid credentials');current=initial();aal='aal1';publish('SIGNED_IN');return current;},
    async verifyMfa(){current=initial();aal='aal2';publish('MFA_VERIFIED');return current;},
    async signOut(){current=null;publish('SIGNED_OUT');return {remote:true};},
    subscribe(fn){listeners.push(fn);}
  };
  const tabs=['capacitaciones','calendario','repositorio','noticias','galeria','estadisticas','usuarios'].map(modulo=>{const node=element('tab-'+modulo);node.dataset.panel=modulo;return node;});
  const context=vm.createContext({window:{EvaAdminSession:options.noHelper?undefined:auth,EvaActivacionPendiente:options.activation},document:{getElementById:element,querySelectorAll:selector=>selector==='.tab'?tabs:[],createElement:()=>element('new')},
    fetch:async url=>{calls.push(url);if(options.pendingChallenge && url.includes('/challenge'))await new Promise(resolve=>{resolveChallenge=resolve;});return {ok:true,status:200,text:async()=>JSON.stringify({id:'synthetic-challenge'})};},
    URL,Intl,Date,console,location:{reload(){throw new Error('unexpected reload');}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','publicacion.js'),'utf8'),context);
  vm.runInContext(source,context);
  return {element,auth,calls,requests,publish,get current(){return current;},get authCount(){return authCount;},
    setRole(value,assigned){role=value;modules=assigned;},
    setAuthError(value){authError=value;},setContentError(value){contentError=value;},setAal(value){aal=value;},finishChallenge(){resolveChallenge();}};
}
test('una sesión AAL2 abre el panel sin solicitar MFA',async()=>{
  const p=panel();await tick();
  assert.equal(p.element('seccion-admin').hidden,false);
  assert.equal(p.element('seccion-mfa').hidden,true);
  assert.ok(!p.calls.some(x=>x.includes('/factors/')||x.includes('estado_mfa')));
});
test('AAL1 mantiene oculto el contenido y solicita el desafío existente',async()=>{
  const p=panel({aal:'aal1'});await tick();
  assert.equal(p.element('seccion-admin').hidden,true);
  assert.equal(p.element('seccion-mfa').hidden,false);
  assert.equal(p.element('seccion-login').hidden,true);
  assert.ok(p.calls.some(x=>x.includes('/challenge')));
});
test('el error de red al recuperar conserva la sesión y ofrece reintento',async()=>{
  const p=panel({authError:new Error('offline')});await tick();
  assert.ok(p.current);
  assert.equal(p.element('seccion-admin').hidden,true);
  assert.equal(p.element('seccion-login').hidden,true);
  assert.equal(p.element('boton-reintentar-acceso').hidden,false);
  p.setAuthError(null);
  await p.element('boton-reintentar-acceso').handlers.click();
  assert.equal(p.element('seccion-admin').hidden,false);
});
test('un fallo de un módulo conserva el acceso y permite reintentar',async()=>{
  const p=panel({contentError:true});await tick();
  assert.ok(p.current);
  assert.equal(p.element('seccion-admin').hidden,false);
  assert.equal(p.element('boton-reintentar-acceso').hidden,false);
  p.setContentError(false);
  await p.element('boton-reintentar-acceso').handlers.click();
  assert.equal(p.element('boton-reintentar-acceso').hidden,true);
});
test('logout oculta el panel y borra contraseña, código y secreto MFA',async()=>{
  const p=panel();await tick();
  p.element('clave').value='synthetic-password';p.element('codigo-mfa').value='192837';p.element('mfa-secreto').textContent='synthetic-secret';
  await p.element('boton-salir').handlers.click();
  assert.equal(p.current,null);
  assert.equal(p.element('seccion-admin').hidden,true);
  assert.equal(p.element('seccion-login').hidden,false);
  assert.equal(p.element('clave').value,'');assert.equal(p.element('codigo-mfa').value,'');assert.equal(p.element('mfa-secreto').textContent,'');
});
test('el cierre comunicado por otra pestaña bloquea la interfaz',async()=>{
  const p=panel();await tick();await p.auth.signOut();
  assert.equal(p.element('seccion-admin').hidden,true);
});
test('una cuenta no autorizada no abre el contenido',async()=>{
  const p=panel({authorized:false});await tick();
  assert.equal(p.current,null);assert.equal(p.element('seccion-admin').hidden,true);
});
test('sin sesión aparece el login sin solicitudes de contenido',async()=>{
  const p=panel({noSession:true});await tick();
  assert.equal(p.element('seccion-login').hidden,false);assert.equal(p.calls.length,0);
});
test('la falta del recurso de sesión bloquea login y ofrece recarga',async()=>{
  const p=panel({noHelper:true});
  assert.equal(p.element('boton-login').disabled,true);
  assert.equal(p.element('boton-reintentar-acceso').hidden,false);
});
test('un rechazo de contraseña limpia el campo y mantiene el login',async()=>{
  const p=panel({noSession:true});p.element('clave').value='wrong';
  await p.element('form-login').handlers.submit({preventDefault(){}});
  assert.equal(p.element('clave').value,'');assert.equal(p.element('seccion-admin').hidden,true);
});
test('una renovación que baja a AAL1 vuelve a bloquear el contenido',async()=>{
  const p=panel();await tick();p.setAal('aal1');p.publish('TOKEN_REFRESHED');await tick();
  assert.equal(p.element('seccion-admin').hidden,true);assert.equal(p.element('seccion-mfa').hidden,false);
});
test('un desafío MFA pendiente no vuelve a mostrar el acceso después de logout',async()=>{
  const p=panel({aal:'aal1',pendingChallenge:true});await tick();
  await p.auth.signOut();p.finishChallenge();await tick();
  assert.equal(p.element('seccion-mfa').hidden,true);assert.equal(p.element('seccion-admin').hidden,true);
  assert.equal(p.element('seccion-login').hidden,false);
});

test('editor carga solo Noticias y no usuarios ni estadísticas',async()=>{
  const p=panel({role:'editor',modules:['noticias']});await tick();
  assert.equal(p.element('seccion-admin').hidden,false);
  assert.equal(p.element('tab-noticias').hidden,false);
  assert.equal(p.element('tab-usuarios').hidden,true);
  assert.equal(p.element('tab-estadisticas').hidden,true);
  assert.ok(p.calls.some(x=>x.startsWith('noticias_destacadas')));
  assert.ok(!p.calls.some(x=>/^(calendario_actividades|capacitaciones_sesiones|repositorio_recursos|galeria_items|eva_visitas_diarias)/.test(x)));
});
test('un editor no abre Usuarios alterando el botón de navegación',async()=>{
  const p=panel({role:'editor'});await tick();
  await p.element('tab-usuarios').handlers.click();
  assert.equal(p.element('panel-usuarios').hidden,true);
});
test('consulta carga el módulo en lectura y bloquea sus controles de escritura',async()=>{
  const p=panel({role:'consulta',modules:['noticias']});await tick();
  assert.equal(p.element('panel-noticias-field').disabled,true);
  assert.equal(p.element('tab-noticias').hidden,false);
});
test('editor sin módulos entra sin realizar solicitudes de contenido',async()=>{
  const p=panel({role:'editor',modules:[]});await tick();
  assert.equal(p.element('seccion-admin').hidden,false);
  assert.ok(!p.calls.some(x=>!x.startsWith('rpc/')));
  assert.match(p.element('estado-panel-mensaje').textContent,/no tiene módulos/);
});
test('un perfil desconocido falla cerrado y conserva la sesión para reintentar',async()=>{
  const p=panel({role:'inventado'});await tick();
  assert.equal(p.element('seccion-admin').hidden,true);assert.ok(p.current);
  assert.ok(!p.calls.some(x=>!x.startsWith('rpc/')));
});
test('la renovación vuelve a consultar los permisos y retira módulos',async()=>{
  const p=panel({role:'editor',modules:['noticias']});await tick();
  p.setRole('editor',[]);p.publish('TOKEN_REFRESHED');await tick();
  assert.equal(p.element('tab-noticias').hidden,true);
  assert.ok(p.calls.filter(x=>x==='rpc/perfil_panel_admin').length>=2);
});
test('renovar con los mismos permisos no recarga formularios ni borra un borrador',async()=>{
  const p=panel({role:'editor',modules:['noticias']});await tick();
  const before=p.calls.filter(x=>x.startsWith('noticias_destacadas')).length;
  p.element('panel-noticias-field').value='Edición pendiente';p.publish('TOKEN_REFRESHED');await tick();
  assert.equal(p.calls.filter(x=>x.startsWith('noticias_destacadas')).length,before);
  assert.equal(p.element('panel-noticias-field').value,'Edición pendiente');
});
test('logout limpia los campos de contenido para la siguiente cuenta',async()=>{
  const p=panel();await tick();p.element('panel-noticias-field').value='Borrador privado';
  await p.auth.signOut();assert.equal(p.element('panel-noticias-field').value,'');
});
test('la invitación no inicia la recuperación de la sesión master existente',async()=>{
  const p=panel({activation:true});await tick();assert.equal(p.calls.length,0);assert.equal(p.authCount,0);
});
