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
  const calls=[];const listeners=[];const nodes=new Map();
  let authCount=0;
  function element(id) {
    if (!nodes.has(id)) nodes.set(id,{hidden:['seccion-admin','seccion-mfa','boton-reintentar-acceso'].includes(id),disabled:false,value:'',textContent:'',dataset:{},style:{},handlers:{},
      classList:{toggle(){},add(){},remove(){}},closest(){return element('seccion-login');},
      addEventListener(name,fn){this.handlers[name]=fn;},querySelector(){return element(id+'-submit');},
      querySelectorAll(){return [];},replaceChildren(){},appendChild(){},append(){},focus(){},removeAttribute(){},setAttribute(){}});
    return nodes.get(id);
  }
  function publish(event,error) {listeners.forEach(fn => fn(event,current,error));}
  const auth={
    getSession:() => current,
    async ensureSession(){if (!current){const e=new Error('expired');e.definitive=true;throw e;} return current;},
    async getAuthorization(){authCount++; if(authError)throw authError;return {autorizado:authorization,aal};},
    async request(p){calls.push(p);if(p==='rpc/estado_mfa_admin')return [{aal,factor_id:'synthetic-factor',tiene_factor_verificado:true}];
      if(contentError && p.startsWith('noticias_destacadas'))throw new Error('synthetic content outage');
      if(p.startsWith('rpc/'))return [{}];return [];},
    async signIn(email,password){if(password==='wrong')throw new Error('invalid credentials');current=initial();aal='aal1';publish('SIGNED_IN');return current;},
    async verifyMfa(){current=initial();aal='aal2';publish('MFA_VERIFIED');return current;},
    async signOut(){current=null;publish('SIGNED_OUT');return {remote:true};},
    subscribe(fn){listeners.push(fn);}
  };
  const context=vm.createContext({window:{EvaAdminSession:options.noHelper?undefined:auth},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element('new')},
    fetch:async url=>{calls.push(url);return {ok:true,status:200,text:async()=>JSON.stringify({id:'synthetic-challenge'})};},
    URL,Intl,Date,console,location:{reload(){throw new Error('unexpected reload');}}});
  vm.runInContext(source,context);
  return {element,auth,calls,publish,get current(){return current;},get authCount(){return authCount;},
    setAuthError(value){authError=value;},setContentError(value){contentError=value;},setAal(value){aal=value;}};
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
