const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {dom}=require('./admin-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'../publicacion.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function panel({role='editor',modules=['noticias'],aal='aal2',rows,error,wait}={}) {
  const d=dom(), calls=[]; let sesion={user:{id:'fixture-uuid'}};
  const datos=rows||[{id:1,titulo:'Publicado',visible:true,estado_publicacion:'publicado',updated_at:'2026-09-30T01:00:00Z'},
    {id:2,titulo:'Archivado',visible:false,estado_publicacion:'archivado',updated_at:'2026-09-30T01:00:00Z'}];
  const auth={getSession:()=>sesion,ensureSession:async()=>sesion,request:async(p,o)=>{
    calls.push({p,o}); if(wait)await wait;if(error)throw error;
    if(p.startsWith('rpc/')) {const b=JSON.parse(o.body),fila=datos.find(x=>x.id===b.p_id);fila.visible=b.p_accion!=='archivar';fila.estado_publicacion=fila.visible?'publicado':'archivado';fila.updated_at='2026-09-30T02:00:00Z';return {estado:fila.estado_publicacion};}
    return datos.map(x=>({...x}));
  }};
  const window={EvaAdminSession:auth}; vm.runInNewContext(source,{window,document:d.document,console});
  const perfil={autorizado:true,aal,rol:role,user_id:'fixture-uuid',modulos:modules};window.EvaPublicacion.configurar(perfil);
  return {...d,calls,auth,api:window.EvaPublicacion,perfil,logout(){sesion=null;window.EvaPublicacion.limpiar();},
    botones(m='noticias'){return d.get('publicacion-listado-'+m).querySelectorAll('button');}};
}
test('editor solo carga el módulo asignado, estados publicado y archivado',async()=>{
  const p=panel();await p.api.cargarTodos();assert.equal(p.calls.length,1);
  assert.match(p.calls[0].p,/^noticias_destacadas/);assert.match(p.calls[0].p,/estado_publicacion=in.\(publicado,archivado\)/);
  assert.equal(p.get('publicacion-listado-noticias').children.length,2);
  assert.deepEqual(p.botones().map(b=>b.textContent),['Archivar','Publicar']);
});
test('archivar usa solo RPC, ID, módulo, acción y versión; conserva el registro',async()=>{
  const p=panel();await p.api.cargarTodos();await p.botones()[0].handlers.click();
  const r=p.calls.find(c=>c.p.startsWith('rpc/'));assert.equal(r.p,'rpc/admin_cambiar_publicacion');
  assert.deepEqual(JSON.parse(r.o.body),{p_modulo:'noticias',p_id:1,p_accion:'archivar',p_actualizado_at:'2026-09-30T01:00:00Z'});
  assert.equal(p.get('publicacion-listado-noticias').children.length,2);
  assert.equal(p.get('publicacion-listado-noticias').children[0].children[1].textContent,'Archivado');
  assert.ok(!p.calls.some(c=>['DELETE','PATCH','PUT'].includes(c.o?.method)));
});
test('publicar archivado usa Publicar sin exponer Restaurar al editor',async()=>{
  const p=panel();await p.api.cargarTodos();await p.botones()[1].handlers.click();
  assert.equal(JSON.parse(p.calls.find(c=>c.p.startsWith('rpc/')).o.body).p_accion,'publicar');
  assert.equal(p.get('publicacion-listado-noticias').children[1].children[1].textContent,'Publicado');
});
test('master puede Restaurar y conserva listado de borradores',async()=>{
  const p=panel({role:'master',rows:[{id:2,titulo:'Archivo',visible:false,estado_publicacion:'archivado',updated_at:'v1'},
    {id:3,titulo:'Borrador',visible:false,estado_publicacion:'borrador',updated_at:'v1'}]});
  await p.api.cargar('noticias');assert.deepEqual(p.botones().map(b=>b.textContent),['Restaurar','Publicar']);
  assert.ok(!p.calls[0].p.includes('estado_publicacion=in'));await p.botones()[0].handlers.click();
  assert.equal(JSON.parse(p.calls.find(c=>c.p.startsWith('rpc/')).o.body).p_accion,'restaurar');
});
test('consulta no recibe acciones',async()=>{const p=panel({role:'consulta'});await p.api.cargarTodos();assert.equal(p.botones().length,0);});
test('AAL1 no consulta ni opera contenido privado',async()=>{const p=panel({aal:'aal1'});await p.api.cargarTodos();assert.equal(p.calls.length,0);await assert.rejects(p.api.cargar('noticias'));});
test('otro módulo y Materiales se rechazan antes de llamar a API',async()=>{
  const p=panel();await assert.rejects(p.api.cargar('galeria'));await assert.rejects(p.api.cargar('materiales'));assert.equal(p.calls.length,0);
});
test('Capacitaciones permite publicar y archivar después de cerrar el filtro público',async()=>{
  const p=panel({modules:['capacitaciones'],rows:[{id:1,titulo:'Sesión',jornada:1,numero_sesion:1,visible:false,updated_at:'v1'}]});
  await p.api.cargarTodos();assert.deepEqual(p.botones('capacitaciones').map(b=>b.textContent),['Publicar']);
  assert.equal(p.get('publicacion-listado-capacitaciones').children[0].children[1].textContent,'Archivado');
  await p.botones('capacitaciones')[0].handlers.click();
  assert.deepEqual(p.botones('capacitaciones').map(b=>b.textContent),['Archivar']);
  assert.equal(JSON.parse(p.calls.find(c=>c.p.startsWith('rpc/')).o.body).p_modulo,'capacitaciones');
});
test('Galería sin consentimiento del master no permite publicar',async()=>{
  const p=panel({modules:['galeria'],rows:[{id:1,titulo:'Álbum',visible:false,estado_publicacion:'archivado',publicacion_autorizada:false,updated_at:'v1'}]});
  await p.api.cargarTodos();assert.equal(p.botones('galeria')[0].disabled,true);
});
test('logout borra datos y una carga tardía no los repinta',async()=>{
  let resolve;const wait=new Promise(r=>resolve=r),p=panel({wait});const carga=p.api.cargarTodos();p.logout();resolve();await carga;
  assert.equal(p.get('publicacion-listado-noticias').children.length,0);
});
test('retirar módulo descarta la respuesta pendiente sin cambiar sesión',async()=>{
  let resolve;const wait=new Promise(r=>resolve=r),p=panel({wait});const carga=p.api.cargarTodos();
  p.api.configurar({...p.perfil,modulos:[]});resolve();await carga;
  assert.equal(p.get('publicacion-listado-noticias').children.length,0);assert.ok(p.auth.getSession());
});
test('error transitorio ofrece reintento y conserva sesión',async()=>{
  const p=panel({error:new Error('Red transitoria')});await assert.rejects(p.api.cargarTodos());
  assert.match(p.get('publicacion-mensaje-noticias').textContent,/reintentar/);assert.ok(p.auth.getSession());
});
test('misma identidad y permisos conservan el listado al renovar',async()=>{
  const p=panel();await p.api.cargarTodos();p.api.configurar({...p.perfil});
  assert.equal(p.get('publicacion-listado-noticias').children.length,2);assert.equal(p.calls.length,1);
});
test('doble clic produce una sola mutación',async()=>{
  const p=panel();await p.api.cargarTodos();const boton=p.botones()[0];
  await Promise.all([boton.handlers.click(),boton.handlers.click()]);
  assert.equal(p.calls.filter(c=>c.p.startsWith('rpc/')).length,1);
});
