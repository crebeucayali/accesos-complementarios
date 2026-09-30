const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const tick=()=>new Promise(r=>setImmediate(r));
function node(tag='div') {
  const x={tagName:tag.toUpperCase(),children:[],dataset:{},hidden:false,textContent:'',className:'',selectors:{},
    append(...ys){for(const y of ys)this.appendChild(y);},appendChild(y){if(y.fragment)this.append(...y.children);else{this.children.push(y);y.parent=this;}},
    replaceChildren(...ys){this.children=[];this.append(...ys);},setAttribute(k,v){this[k]=v;},addEventListener(){},
    querySelector(s){return this.selectors[s]||null;},querySelectorAll(s){return this.children.filter(c=>s==='td'?c.tagName==='TD':c.className?.split(' ').includes(s.slice(1)));},
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);},get childElementCount(){return this.children.length;}};
  x.classList={add(c){x.className+=' '+c;},remove(c){x.className=x.className.split(' ').filter(v=>v!==c).join(' ');},toggle(){}};return x;
}
const calendarSource=fs.readFileSync(path.join(__dirname,'../../recursos/calendario-supabase.js'),'utf8');
function calendario(rows,error) {
  const celda=node('td'),datos=node();datos.className='datos-actividad';celda.append(datos);
  const numero=node();numero.textContent='1';celda.selectors['.numero-dia']=numero;
  const abril=node(),titulo=node();titulo.textContent='Abril 2026';const grid=node('table');grid.append(celda);
  abril.selectors['.calendario-actividades']=grid;abril.selectors['.mes-cabecera h3']=titulo;
  const noviembre=node(),tit=node();tit.textContent='Noviembre 2026';const tabla=node('table'),tbody=node('tbody');tbody.append(node('tr'));
  tabla.selectors.tbody=tbody;noviembre.selectors['.tabla-calendario']=tabla;noviembre.selectors['.mes-cabecera h3']=tit;
  const document={documentElement:node(),querySelectorAll:()=>[abril,noviembre],createElement:node};
  vm.runInNewContext(calendarSource,{document,URL,console:{warn(){}},fetch:async()=>{if(error)throw error;return {ok:true,json:async()=>rows};}});
  return {celda,tbody,document};
}
test('calendario retira respaldo estático incluso cuando la consulta devuelve cero filas',async()=>{
  const p=calendario([]);await tick();assert.equal(p.celda.children.length,0);assert.equal(p.tbody.children.length,0);
  assert.equal(p.document.documentElement.dataset.calendarioFuente,'supabase');
});
test('calendario solo muestra registros confirmados por vista pública y elimina días omitidos',async()=>{
  const fila={fecha:'2026-11-02',fuente:'calendario',contenido_lineas:['Restaurado'],estado:'confirmada',orden:1};
  const p=calendario([fila]);await tick();assert.equal(p.celda.children.length,0);assert.equal(p.tbody.children.length,1);
  assert.equal(p.tbody.children[0].children[1].children[0].children[0].textContent,'Restaurado');
});
test('una caída pública no vuelve a mostrar respaldos de registros archivados',async()=>{
  const p=calendario(null,new Error('Red'));await tick();assert.equal(p.celda.children.length,0);assert.equal(p.tbody.children.length,0);
  assert.equal(p.document.documentElement.dataset.calendarioFuente,'no-disponible');
});
// El parche está incluido para revisión; estas pruebas NO publican el otro repositorio.
const capDir=path.join(__dirname,'../../docs/parches/capacitaciones');
function capacitaciones(jornada,rows,error,wait) {
  const linea=node(),sinResultados=node(),articulos=Array.from({length:10},()=>node('article'));
  const document={documentElement:node(),getElementById:id=>id==='lineaTiempo'?linea:sinResultados,
    querySelectorAll:()=>articulos,createElement:node,createDocumentFragment:()=>({...node(),fragment:true}),addEventListener(){}};
  const window={location:{href:'https://crebeucayali.github.io/capacitaciones/',origin:'https://crebeucayali.github.io'},
    EVASupabasePublico:{consultarSesiones:async()=>{if(wait)await wait;if(error)throw error;return rows;}}};
  const ctx=vm.createContext({window,document,URL,atob,console:{warn(){}}});
  vm.runInContext(fs.readFileSync(path.join(capDir,jornada===1?'app.js.fixture':'segunda-jornada.js.fixture'),'utf8'),ctx);
  return {linea,articulos,document,ctx};
}
for(const jornada of [1,2]) {
  test('parche jornada '+jornada+': todos archivados => no reaparece contenido estático',async()=>{
    const p=capacitaciones(jornada,[]);await tick();
    assert.equal(jornada===1?p.linea.children.length:p.articulos.filter(x=>!x.hidden).length,0);
  });
  test('parche jornada '+jornada+': falla de red => no reaparece contenido estático',async()=>{
    const p=capacitaciones(jornada,null,new Error('Red'));await tick();
    assert.equal(jornada===1?p.linea.children.length:p.articulos.filter(x=>!x.hidden).length,0);
  });
  test('parche jornada '+jornada+': solo muestra la sesión publicada y respeta su número',async()=>{
    const p=capacitaciones(jornada,[{numero_sesion:6,titulo:'Restaurado',tema:'Tema',estado:'pendiente',fecha_texto:'Fecha',recursos_adicionales:[]}]);await tick();
    if(jornada===1)assert.equal(p.linea.children.length,1);else {assert.equal(p.articulos.filter(x=>!x.hidden).length,1);assert.equal(p.articulos[5].hidden,false);}
    assert.equal(p.document.documentElement.dataset.capacitacionesFuente,'supabase');
  });
}
test('parche primera jornada bloquea el render de actualizadores estáticos mientras carga',async()=>{
  let resolve;const p=capacitaciones(1,[],null,new Promise(r=>resolve=r));
  vm.runInContext('renderizarCapacitaciones(capacitaciones)',p.ctx);assert.equal(p.linea.children.length,0);resolve();await tick();
});
test('parche segunda jornada parte de tarjetas HTML ocultas y renueva URL de scripts',()=>{
  const h=fs.readFileSync(path.join(capDir,'segunda-jornada.html.fixture'),'utf8');
  assert.equal((h.match(/<article class="capacitacion pendiente" hidden /g)||[]).length,10);
  assert.match(h,/segunda-jornada.js\?v=5/);assert.match(fs.readFileSync(path.join(capDir,'primera-jornada.html.fixture'),'utf8'),/app.js\?v=34/);
});
function repositorio(rows,error) {
  const listas=['materiales_disponibles','equipos_tecnologicos','materiales_elaborados'].map(c=>{const n=node('ul');n.dataset.categoria=c;n.hidden=true;n.append(node('li'));return n;});
  const document={documentElement:node(),querySelectorAll:()=>listas,createElement:node,createTextNode:t=>({textContent:t}),createDocumentFragment:()=>({...node(),fragment:true})};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../docs/parches/repositorio/repositorio-supabase.js.fixture'),'utf8'),{
    document,URL,window:{location:{href:'https://crebeucayali.github.io/repositorio-accesible/'}},console:{warn(){}},
    fetch:async()=>{if(error)throw error;return {ok:true,json:async()=>rows};}});
  return {listas,document};
}
test('parche Repositorio no recupera tarjetas estáticas cuando falla Supabase',async()=>{
  const p=repositorio(null,new Error('Red'));await tick();
  assert.ok(p.listas.every(x=>x.children.length===1 && /No hay recursos/.test(x.children[0].textContent)));
  assert.equal(p.document.documentElement.dataset.repositorioFuente,'no-disponible');
});
test('parche Repositorio vacío y restaurado usa únicamente la respuesta pública',async()=>{
  const p=repositorio([]);await tick();assert.ok(p.listas.every(x=>/No hay recursos/.test(x.children[0].textContent)));
  const q=repositorio([{id:3,categoria:'materiales_elaborados',titulo:'Restaurado'}]);await tick();
  assert.equal(q.listas[2].children[0].dataset.recursoId,'3');assert.equal(q.listas[2].children[0].children[0].textContent,'Restaurado');
});
test('parche Repositorio HTML parte de las tres listas ocultas',()=>{
  const h=fs.readFileSync(path.join(__dirname,'../../docs/parches/repositorio/index.html.fixture'),'utf8');
  assert.equal((h.match(/<ul class="lista-ejemplos" hidden data-categoria=/g)||[]).length,3);assert.match(h,/repositorio-supabase.js\?v=4/);
});
function noticias(rows,error) {
  const callbacks=[],seccion=node(),carrusel=node(),pista=node(),indicadores=node(),prev=node(),next=node(),viewport=node();
  pista.style={};carrusel.closest=()=>seccion;carrusel.selectors['.noticias-viewport']=viewport;
  const mapa={'.noticias-carrusel':carrusel,'#noticias-pista':pista,'#noticias-indicadores':indicadores,'.noticias-anterior':prev,'.noticias-siguiente':next};
  const document={documentElement:node(),querySelector:s=>mapa[s]||null,createElement:node,addEventListener:(e,f)=>{if(e==='DOMContentLoaded')callbacks.push(f);}};
  let calls=0;const window={location:{href:'https://crebeucayali.github.io/',origin:'https://crebeucayali.github.io'},matchMedia:()=>({matches:true}),addEventListener(){},requestAnimationFrame(){}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../docs/parches/portal/main.js.fixture'),'utf8'),{document,window,URL,
    fetch:async()=>{calls++;if(error)throw error;return {ok:true,json:async()=>rows};},console});
  callbacks.find(f=>f.toString().includes('inicializarCarruselNoticias'))();return {seccion,pista,document,get calls(){return calls;}};
}
test('parche Noticias no consulta respaldos JSON ni integrado al fallar Supabase',async()=>{
  const p=noticias(null,new Error('Red'));await tick();assert.equal(p.calls,1);assert.equal(p.seccion.hidden,true);assert.equal(p.pista.children.length,0);
  assert.equal(p.document.documentElement.dataset.noticiasFuente,'no-disponible');
});
test('parche Noticias muestra solo el contenido restaurado que devuelve Supabase',async()=>{
  const p=noticias([{titulo:'Restaurado',descripcion:'Texto',imagen_url:'https://crebeucayali.github.io/imagenes/noticias/noticia-1.svg'}]);await tick();
  assert.equal(p.calls,1);assert.equal(p.pista.children.length,1);
  assert.equal(p.pista.children[0].children[1].children[1].textContent,'Restaurado');
});
