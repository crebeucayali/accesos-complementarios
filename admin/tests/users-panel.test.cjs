const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {dom}=require('./admin-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'../usuarios.js'),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const user={user_id:'editor-id',email:'editor@example.invalid',nombre:'<img src=x onerror=alert(1)>',rol:'editor',activo:true,modulos:['noticias'],actualizado_at:'2026-09-30T05:00:00.123456Z',confirmado:true};
const master={user_id:'master-id',email:'master@example.invalid',nombre:'Master',rol:'master',activo:true,modulos:[],actualizado_at:user.actualizado_at,confirmado:true};
function app({role='master',pending=false}={}) {
  const d=dom(),listeners=[],calls=[];let resolve=null,current={access_token:'synthetic-token',user:{id:role==='master'?'master-id':'editor-id'}};
  const auth={getSession:()=>current,ensureSession:async()=>current,getAuthorization:async()=>({autorizado:true,aal:'aal2'}),
    request:async(p,opts)=>{calls.push({p,opts});if(p==='rpc/admin_listar_usuarios'){if(pending)await new Promise(r=>resolve=r);return [master,user];}return {guardado:true};},
    subscribe:f=>listeners.push(f)};
  const window={EvaAdminSession:auth};
  vm.runInNewContext(source,{window,document:d.document,fetch:async()=>{calls.push({invite:true});return {ok:true,json:async()=>({message:'Invitación sintética'})};},AbortSignal,Date,Array,Object,Error,JSON});
  window.EvaUsuarios.configurar({user_id:current.user.id,rol:role,autorizado:true,aal:'aal2'});
  return {...d,window,calls,logout(){current=null;listeners.forEach(f=>f('SIGNED_OUT'));},finish(){resolve();}};
}
test('master ve nombre, correo, rol, estado, módulos y fecha',async()=>{
  const p=app();await p.window.EvaUsuarios.cargar();
  const rows=p.get('usuarios-listado').children;assert.equal(rows.length,2);
  assert.equal(rows[1].children[0].textContent,user.nombre);assert.equal(rows[1].children[4].textContent,'Noticias');
  assert.ok(rows[1].children[5].textContent);
});
test('los nombres se renderizan como texto y no como HTML',async()=>{
  const p=app();await p.window.EvaUsuarios.cargar();
  const name=p.get('usuarios-listado').children[1].children[0];assert.equal(name.textContent,user.nombre);assert.equal(name.children.length,0);
});
test('master no tiene botón de degradación o desactivación',async()=>{
  const p=app();await p.window.EvaUsuarios.cargar();const cell=p.get('usuarios-listado').children[0].children[6];
  assert.equal(cell.textContent,'Cuenta protegida');assert.equal(cell.children.length,0);
});
test('editor no puede consultar ni renderizar la gestión de usuarios',async()=>{
  const p=app({role:'editor'});await assert.rejects(p.window.EvaUsuarios.cargar(),/master/);
  assert.equal(p.calls.length,0);assert.equal(p.get('panel-usuarios').hidden,true);
});
test('guardado envía UUID, versión exacta y módulos seleccionados',async()=>{
  const p=app();await p.window.EvaUsuarios.cargar();p.get('usuarios-listado').children[1].children[6].children[0].handlers.click();
  p.get('usuario-editar-rol').value='consulta';p.get('usuario-editar-activo').checked=false;
  await p.get('form-usuario-editar').handlers.submit({preventDefault(){}});
  const save=JSON.parse(p.calls.find(x=>x.p==='rpc/admin_guardar_usuario').opts.body);
  assert.equal(save.p_user_id,'editor-id');assert.equal(save.p_actualizado_at,user.actualizado_at);assert.deepEqual(save.p_modulos,['noticias']);
  assert.equal(save.p_rol,'consulta');assert.equal(save.p_activo,false);
});
test('el listado pendiente no aparece después de cerrar sesión',async()=>{
  const p=app({pending:true});const operation=p.window.EvaUsuarios.cargar();await tick();p.logout();p.finish();await operation;
  assert.equal(p.get('usuarios-listado').children.length,0);
});
test('cerrar sesión limpia el usuario seleccionado y sus datos',async()=>{
  const p=app();await p.window.EvaUsuarios.cargar();p.get('usuarios-listado').children[1].children[6].children[0].handlers.click();p.logout();
  assert.equal(p.get('usuario-editar-correo').textContent,'');assert.equal(p.get('form-usuario-editar').hidden,true);
  await p.get('form-usuario-editar').handlers.submit({preventDefault(){}});assert.ok(!p.calls.some(x=>x.p==='rpc/admin_guardar_usuario'));
});
