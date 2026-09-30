import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../../supabase/functions/admin-invitar-editor/index.js';
const token='synthetic.header.signature';
const environment={get:key=>({SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'synthetic-public',SUPABASE_SERVICE_ROLE_KEY:'synthetic-server-only'})[key]};
const data={email:'editor@example.invalid',nombre:'Editor',modulos:['noticias']};
function req(payload=data,headers={Authorization:'Bearer '+token,Origin:'https://crebeucayali.github.io'}) {
  return new Request('https://test.invalid/functions/v1/admin-invitar-editor',{method:'POST',headers,body:JSON.stringify(payload)});
}
test('sin JWT no se llama a la base de datos ni a Auth',async()=>{
  let calls=0;const r=await handle(req(data,{}),environment,async()=>{calls++;});
  assert.equal(r.status,401);assert.equal(calls,0);
});
test('editor o AAL1 rechazado por la RPC no llega a invitar',async()=>{
  const urls=[];const r=await handle(req(),environment,async url=>{urls.push(url);return Response.json({code:'42501'},{status:403});});
  assert.equal(r.status,403);assert.equal(urls.length,1);assert.ok(urls[0].includes('/rest/v1/rpc/'));
});
test('la pausa SQL 55000 detiene la invitación antes de usar Auth',async()=>{
  const urls=[];const r=await handle(req(),environment,async url=>{urls.push(url);return Response.json({code:'55000',message:'Invitaciones pausadas'},{status:500});});
  assert.equal(urls.length,1);assert.ok(urls[0].includes('/rest/v1/rpc/'));
  assert.ok(r.status>=400);assert.match((await r.json()).message,/pausadas/);
});
test('el cliente no puede enviar rol master',async()=>{
  let calls=0;const r=await handle(req({...data,rol:'master'}),environment,async()=>{calls++;});
  assert.equal(r.status,400);assert.equal(calls,0);
});
test('el cliente no puede seleccionar otra redirección',async()=>{
  const r=await handle(req({...data,redirect_to:'https://attacker.invalid'}),environment,async()=>{throw new Error('should not call');});
  assert.equal(r.status,400);
});
test('se conserva el JWT del llamante para comprobar master AAL2 en PostgREST',async()=>{
  const calls=[];const r=await handle(req(),environment,async (url,opts)=>{
    calls.push({url,opts});return Response.json(url.includes('/invite?')?{id:'synthetic-editor'}:{email:data.email});
  });
  assert.equal(r.status,200);assert.equal(calls.length,2);
  assert.equal(calls[0].opts.headers.Authorization,'Bearer '+token);
  assert.equal(calls[0].opts.headers.apikey,'synthetic-public');
  assert.equal(calls[1].opts.headers.apikey,'synthetic-server-only');
  assert.equal(new URL(calls[1].url).searchParams.get('redirect_to'),'https://crebeucayali.github.io/accesos-complementarios/admin/');
  assert.deepEqual(JSON.parse(calls[1].opts.body),{email:data.email});
  assert.ok(!(await r.text()).includes('synthetic-server-only'));
});
test('un fallo del correo conserva la autorización y comunica revisión',async()=>{
  let calls=0;const r=await handle(req(),environment,async()=>++calls===1?Response.json({email:data.email}):Response.json({error:'smtp unavailable'},{status:500}));
  assert.equal(r.status,502);assert.match((await r.json()).message,/autorización quedó guardada/);
});
test('un fallo transitorio no reintenta automáticamente una invitación',async()=>{
  let calls=0;const r=await handle(req(),environment,async()=>{calls++;throw new Error('offline');});
  assert.equal(r.status,503);assert.equal(calls,1);
});
test('se rechaza otro origen antes de ejecutar operaciones',async()=>{
  const r=await handle(req(data,{Authorization:'Bearer '+token,Origin:'https://attacker.invalid'}),environment,async()=>{throw new Error('should not call');});
  assert.equal(r.status,403);
});
test('preflight permite únicamente el origen del panel',async()=>{
  const r=await handle(new Request('https://test.invalid',{method:'OPTIONS',headers:{Origin:'https://crebeucayali.github.io'}}),environment,async()=>{throw new Error('should not call');});
  assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://crebeucayali.github.io');
});
test('solo se admiten solicitudes POST',async()=>{
  assert.equal((await handle(new Request('https://test.invalid'),environment)).status,405);
});
