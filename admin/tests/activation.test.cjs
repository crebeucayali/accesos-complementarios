const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {dom}=require('./admin-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'../activacion.js'),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function activate({role='editor',hash='#type=invite&access_token=synthetic-token&refresh_token=synthetic-refresh'}={}) {
  const d=dom(),calls=[],replacements=[],window={};
  const button=d.node('button');d.get('form-activacion').append(button);d.get('form-activacion').hidden=true;
  vm.runInNewContext(source,{window,document:d.document,location:{hash,pathname:'/accesos-complementarios/admin/',search:''},
    history:{replaceState(...args){replacements.push(args);}},URLSearchParams,AbortSignal,
    fetch:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>url.endsWith('/auth/v1/user')?{id:'editor-id'}:{autorizado:true,user_id:'editor-id',email:'editor@example.invalid',rol:role}};}});
  return {...d,window,calls,replacements,button};
}
test('el enlace de invitación borra el fragmento y valida el usuario en Supabase',async()=>{
  const p=activate();await tick();assert.equal(p.window.EvaActivacionPendiente,true);
  assert.equal(p.replacements[0][2],'/accesos-complementarios/admin/');
  assert.equal(p.get('form-activacion').hidden,false);assert.equal(p.calls.length,2);
  assert.ok(p.calls[0].url.endsWith('/auth/v1/user'));
});
test('la activación de invitación rechaza cuenta master',async()=>{
  const p=activate({role:'master'});await tick();assert.equal(p.get('form-activacion').hidden,true);
  assert.match(p.get('activacion-mensaje').textContent,/no tiene una autorización/);
});
test('una visita normal no altera el acceso ni solicita información',async()=>{
  const p=activate({hash:''});await tick();assert.equal(p.calls.length,0);assert.equal(p.window.EvaActivacionPendiente,undefined);
});
test('contraseñas distintas no se envían y se limpian',async()=>{
  const p=activate();await tick();p.get('activacion-clave').value='synthetic-pass-123';p.get('activacion-confirmacion').value='different-pass-456';
  await p.get('form-activacion').handlers.submit({preventDefault(){}});
  assert.equal(p.calls.length,2);assert.equal(p.get('activacion-clave').value,'');
});
test('guardar contraseña cierra la sesión de activación sin reemplazar otra sesión',async()=>{
  const p=activate();await tick();p.get('activacion-clave').value=p.get('activacion-confirmacion').value='synthetic-password-123';
  await p.get('form-activacion').handlers.submit({preventDefault(){}});
  assert.equal(p.calls[2].opts.method,'PUT');assert.ok(p.calls[3].url.endsWith('/logout?scope=local'));
  assert.equal(p.get('form-activacion').hidden,true);assert.equal(p.get('activacion-clave').value,'');
  assert.equal(p.get('activacion-confirmacion').value,'');
  assert.ok(!Object.keys(p.window).includes('EvaAdminSession'));
});
