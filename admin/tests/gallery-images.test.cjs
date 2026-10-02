// Ejecuta las funciones reales de Galería con DOM y transporte simulados.
// No usa credenciales ni escribe en Supabase o Storage.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {dom}=require('./admin-dom.cjs');
const source=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8');
const gallery=source.slice(source.indexOf('  function resolverVistaPreviaGaleria('),source.indexOf('  async function eliminarFotoGaleria('));
const helpers=source.slice(source.indexOf('  function validarArchivoImagenNoticia('),source.indexOf('  function rutaStorageNoticia('));
const limit=source.match(/  const MAX_FOTOGRAFIAS_GALERIA = \d+;/)[0];
const photo=i=>({orden:i+1,imagen_url:`imagenes-galeria/prueba-${i+1}.jpg`,imagen_alt:`Descripción individual ${i+1}`});
const file=i=>({name:`foto-${i}.webp`,type:'image/webp',size:100});
function panel(existing=0,authorization={autorizado:true,aal:'aal2'}){
 const d=dom(),calls=[],uploads=[],messages=[],revoked=[];
 Object.defineProperty(d.get('gal-id'),'value',{get(){return this._value||'';},set(v){this._value=String(v);}});
 let rows=existing?[{id:42,orden:1,titulo:'Actividad existente',descripcion:'Sin cambios',fecha:'2026-10-01',estado_publicacion:'archivado',visible:false,publicacion_autorizada:true,imagen_url:photo(0).imagen_url,imagen_alt:photo(0).imagen_alt,imagenes:Array.from({length:existing},(_,i)=>photo(i))}]:[];
 let images=existing?rows[0].imagenes.map(x=>({...x,galeria_item_id:42})):[];
 const rest=async(p,o={})=>{
  calls.push({p,o});const method=o.method||'GET';
  if(p.startsWith('galeria_items?select'))return rows;
  if(p.startsWith('galeria_item_imagenes?select'))return images;
  if(p.startsWith('galeria_item_imagenes?')&&method==='DELETE'){images=[];return [];}
  if(p==='galeria_item_imagenes'&&method==='POST'){images=JSON.parse(o.body);return [];}
  if(p.startsWith('galeria_items')&&['PATCH','POST'].includes(method)){
   const body=JSON.parse(o.body),row={...rows[0],...body,id:rows[0]?.id||100};rows=[row];return [row];
  }
  throw Error('Unexpected endpoint '+p);
 };
 class TestURL extends URL{static createObjectURL(x){return 'blob:synthetic-'+x.name;}static revokeObjectURL(x){revoked.push(x);}}
 const ctx=vm.createContext({document:d.document,window:{},URL:TestURL,console,Date,Math,crypto:require('node:crypto').webcrypto,
  rest,solicitar:async(url,o)=>{uploads.push({url,o});return {};},refrescarSesionSiHaceFalta:async()=>{},comprobarAutorizacion:async()=>authorization,
  mostrarMensaje:(text,type)=>messages.push({text,type}),SUPABASE_URL:'https://dteimbhwtzghhsijeeld.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic-public-key',
  STORAGE_BUCKET_EVA:'eva-publico',STORAGE_NOTICIAS_BASE:'https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/',
  sesion:{access_token:'synthetic-test-token'},$:d.get});
 vm.runInContext(`${limit}\nlet galeriaItems=[],imagenesGaleriaEditor=[];\n${helpers}\n${gallery}\nglobalThis.api={fill:llenarGaleriaAdmin,select:gestionarArchivosGaleria,save:guardarFotoGaleria,items:()=>imagenesGaleriaEditor,force:n=>{imagenesGaleriaEditor=n;},seed:n=>{galeriaItems=n;}};`,ctx);
 const api=ctx.api;api.seed(rows);api.fill(rows[0]||null);
 d.get('gal-titulo').value='Actividad de prueba';d.get('gal-estado-publicacion').value='borrador';d.get('gal-autorizada').checked=true;
 return {...d,api,calls,uploads,messages,revoked,images:()=>images,rows:()=>rows,
  select:n=>api.select({target:{files:Array.from({length:n},(_,i)=>file(i)),value:'selección'}}),
  describe:()=>api.items().forEach((x,i)=>x.alt='Descripción individual '+(i+1))};
}
for(const count of [1,5,6,7,8])test(`crear ${count} fotografías: carga y guarda todas las referencias`,async()=>{
 const p=panel();p.select(count);p.describe();await p.api.save();
 assert.equal(p.uploads.length,count);assert.equal(p.images().length,count);assert.equal(p.get('gal-imagenes-editor').children.length,count);
 assert.deepEqual(p.images().map(x=>x.orden),Array.from({length:count},(_,i)=>i+1));
 assert.ok(p.uploads.every(x=>x.url.includes('/storage/v1/object/eva-publico/galeria/')&&x.o.headers['x-upsert']==='false'));
 assert.equal(p.rows()[0].imagen_url,p.images()[0].imagen_url);assert.equal(p.rows()[0].imagen_alt,p.images()[0].imagen_alt);
});
test('seleccionar nueve rechaza toda la selección y no inicia subidas',()=>{
 const p=panel();p.select(9);assert.equal(p.api.items().length,0);assert.equal(p.calls.length,0);assert.equal(p.uploads.length,0);assert.match(p.messages.at(-1).text,/máximo de 8 fotografías/);
});
test('guardado manipulado de nueve rechaza antes de Storage o escrituras',async()=>{
 const p=panel();p.api.force(Array.from({length:9},(_,i)=>({archivo:file(i),alt:'Alternativo'})));await assert.rejects(p.api.save(),/entre 1 y 8/);
 assert.equal(p.calls.length,0);assert.equal(p.uploads.length,0);
});
for(const added of [1,2,3])test(`editar 5 + ${added}: conserva URLs, alternativos y orden existentes`,async()=>{
 const p=panel(5),before=Array.from({length:5},(_,i)=>photo(i));p.select(added);p.api.items().slice(5).forEach((x,i)=>x.alt='Nueva '+i);await p.api.save();
 assert.equal(p.uploads.length,added);assert.equal(p.images().length,5+added);assert.equal(p.rows()[0].id,42);
 before.forEach((x,i)=>{assert.equal(p.images()[i].imagen_url,x.imagen_url);assert.equal(p.images()[i].imagen_alt,x.imagen_alt);assert.equal(p.images()[i].orden,x.orden);});
});
test('editar 5 + 4 bloquea sin cambios ni subidas y comunica los tres espacios',()=>{
 const p=panel(5);p.select(4);assert.equal(p.api.items().length,5);assert.equal(p.calls.length,0);assert.equal(p.uploads.length,0);assert.match(p.messages.at(-1).text,/máximo de 3 más/);
});
test('5 - 1 + 4 permite ocho y solo retira la fotografía elegida',async()=>{
 const p=panel(5);p.get('gal-imagenes-editor').children[1].children[1].children[2].handlers.click();
 assert.equal(p.api.items().length,4);p.select(4);p.api.items().slice(4).forEach(x=>x.alt='Nueva');await p.api.save();
 assert.equal(p.images().length,8);assert.equal(p.uploads.length,4);assert.equal(p.images()[1].imagen_url,photo(2).imagen_url);
 assert.ok(!p.uploads.some(x=>x.o.method==='DELETE'));
});
test('la selección con un archivo inválido es atómica y conserva las fotos previas',()=>{
 const p=panel(5);p.api.select({target:{files:[file(1),{...file(2),type:'application/pdf'}],value:'selección'}});
 assert.equal(p.api.items().length,5);assert.equal(p.uploads.length,0);assert.match(p.messages.at(-1).text,/WebP/);
});
for(const count of [1,2,3,4,5,6,7,8])test(`edición y vista previa muestran ${count} fotos con ${count} alternativos obligatorios`,()=>{
 const p=panel(count),cards=p.get('gal-imagenes-editor').children;
 assert.equal(cards.length,count);cards.forEach((card,i)=>{const input=card.children[1].children[1].children[0];assert.equal(input.required,true);assert.equal(input.maxLength,220);assert.equal(input.value,photo(i).imagen_alt);});
});
for(const missing of [5,6,7])test(`alternativo obligatorio de fotografía ${missing+1} se valida antes de subir`,async()=>{
 const p=panel();p.select(8);p.describe();p.api.items()[missing].alt=' ';await assert.rejects(p.api.save(),new RegExp('fotografía '+(missing+1)));
 assert.equal(p.uploads.length,0);assert.equal(p.calls.length,0);
});
test('5 MB por imagen sigue vigente',()=>{const p=panel();p.api.select({target:{files:[{...file(1),size:5*1024*1024+1}],value:''}});assert.equal(p.api.items().length,0);assert.match(p.messages.at(-1).text,/5 MB/);});
test('cero fotografías se rechazan antes de escribir',async()=>{const p=panel();await assert.rejects(p.api.save(),/entre 1 y 8/);assert.equal(p.calls.length,0);assert.equal(p.uploads.length,0);});
test('publicar sigue requiriendo autorización institucional antes de subir',async()=>{const p=panel();p.select(8);p.describe();p.get('gal-estado-publicacion').value='publicado';p.get('gal-autorizada').checked=false;await assert.rejects(p.api.save(),/autorizadas/);assert.equal(p.calls.length,0);assert.equal(p.uploads.length,0);});
test('sin AAL2 la subida sigue bloqueada',async()=>{const p=panel(0,{autorizado:true,aal:'aal1'});p.select(8);p.describe();await assert.rejects(p.api.save(),/MFA AAL2/);assert.equal(p.uploads.length,0);assert.equal(p.calls.length,0);});
