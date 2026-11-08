(() => {
  "use strict";
  const BASE = "https://crebeucayali.github.io/banco-digital-accesible/lsp/";
  const BDA = BASE + "diccionario_lsp.json";
  const API = "https://api.arasaac.org/api/pictograms/es/search/";
  const IMAGE = "https://static.arasaac.org/pictograms/";
  const LICENSE = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es";
  const MINEDU_DOCUMENT = "https://repositorio.minedu.gob.pe/handle/20.500.12799/5545";
  const MINEDU_USAGE = "Acceso abierto para consulta; permiso de reproducción de ilustraciones no confirmado.";
  const BAD_LSP = new Set(["LSP-000092","LSP-000630","LSP-000730","LSP-000954"]);
  const SKIP = new Set(["himno_nacional","padre_nuestro","ave_maria"]);
  const $ = id => document.getElementById(id);
  let bank = null, controller = null, sequence = 0;
  let selectedPictos = [];
  let currentType = "lsp";
  let verifiedLsp = null;
  let canUse = () => false;

  function normalize(value) {
    return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .toLocaleLowerCase("es").trim();
  }
  function setStatus(text, error = false) {
    const el = $("dia-fuentes-estado");
    if (!el) return;
    el.textContent = text;
    el.dataset.error = String(error);
  }
  function field(id,value) {
    $(id).value = String(value == null ? "" : value);
  }
  function elt(tag,cls,text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text!==undefined) el.textContent = text;
    return el;
  }
  function allowedSource(path) {
    const value = String(path||"");
    if (!/^imagenes\/[a-z0-9áéíóúñ_./-]+\.(png|jpe?g|webp)$/i.test(value)
      || value.includes("..") || value.includes("//")) return "";
    const url = new URL(value,BASE);
    return url.origin === "https://crebeucayali.github.io" && url.pathname.startsWith("/banco-digital-accesible/lsp/imagenes/")
      ? url.href : "";
  }
  function pictoImage(id) {
    return IMAGE + id + "/" + id + "_500.png";
  }
  function clearSelection() {
    sequence++;
    controller?.abort();
    controller=null;
    verifiedLsp=null;
    selectedPictos=[];
    $("dia-resultados-fuente")?.replaceChildren();
    $("dia-seleccion-fuente")?.replaceChildren();
    field("dia-busqueda","");
  }
  function clearFields() {
    ["dia-lsp-id","dia-arasaac-ids","dia-imagen-lsp","dia-titulo-recurso",
      "dia-descripcion","dia-alt","dia-fuente","dia-licencia",
      "dia-atribucion","dia-referencia"].forEach(id=>field(id,""));
    $("dia-derechos").checked=false;
    $("dia-revision").checked=false;
  }
  function sourceChanged() {
    clearSelection();
    clearFields();
    currentType = $("dia-tipo").value;
    setStatus(currentType==="lsp" ? "Busca una seña del catálogo del BDA." : "Busca pictogramas de ARASAAC. Selecciona un máximo de tres.");
  }
  function rehydrate() {
    clearSelection();
    currentType=$("dia-tipo").value;
    if (currentType==="arasaac") {
      const ids=$("dia-arasaac-ids").value.split(",").map(x=>x.trim()).filter(x=>/^[1-9]\d*$/.test(x));
      selectedPictos=ids.slice(0,3).map(id=>({id,label:$("dia-titulo-recurso").value||("Pictograma "+id)}));
      drawSelection();
    } else if ($("dia-lsp-id").value) {
      const el=elt("p","nota","Seña guardada: "+$("dia-lsp-id").value+". Selecciona en el catálogo para comprobar la fuente y la fotografía.");
      $("dia-seleccion-fuente").replaceChildren(el);
    }
    setStatus("Puedes buscar y sustituir la selección actual. Los créditos se conservarán hasta que selecciones un recurso distinto.");
  }
  function photo(src,alt) {
    const img=elt("img");
    img.src=src;
    img.alt=alt;
    img.loading="lazy";
    img.decoding="async";
    img.addEventListener("error",()=>{
      const warning=elt("p","dia-imagen-error","Imagen no disponible");
      img.replaceWith(warning);
    },{once:true});
    return img;
  }
  function applyLsp(item,url) {
    if (!canUse() || $("dia-tipo").value!=="lsp") return;
    selectedPictos=[];verifiedLsp=item.id;
    field("dia-lsp-id",item.id);
    field("dia-arasaac-ids","");
    field("dia-imagen-lsp",url);
    field("dia-titulo-recurso",item.palabra);
    field("dia-descripcion",item.descripcion);
    field("dia-alt","Ilustración de la seña LSP para "+item.palabra+". Consulta la descripción del movimiento en el BDA.");
    field("dia-fuente",BASE);
    field("dia-atribucion","Ministerio de Educación del Perú. Guía de Lengua de Señas Peruana. Consulta en BDA, CREBE Ucayali.");
    field("dia-licencia",MINEDU_USAGE);
    field("dia-referencia",MINEDU_DOCUMENT);
    $("dia-derechos").checked=false;
    $("dia-revision").checked=false;
    $("dia-resultados-fuente").replaceChildren();
    const card=elt("article","dia-fuente-seleccion");
    card.append(photo(url,"Seña "+item.palabra),elt("strong","",item.palabra),
      elt("p","nota","ID "+item.id+" · Fuente: MINEDU / BDA. Licencia y autorización de reutilización pendientes de revisión."));
    $("dia-seleccion-fuente").replaceChildren(card);
    setStatus("Seña seleccionada. Verifica documentalmente los derechos y revisa la descripción antes de programar; las casillas no se marcan automáticamente.");
  }
  function drawSelection() {
    const box=$("dia-seleccion-fuente");
    box.replaceChildren();
    if(!selectedPictos.length)return;
    box.append(elt("p","nota",selectedPictos.length+" pictograma(s) seleccionado(s)."));
    selectedPictos.forEach(item=>{
      const row=elt("article","dia-fuente-seleccion");
      row.append(photo(pictoImage(item.id),"Pictograma "+item.label),elt("strong","",item.label+" · ID "+item.id));
      const remove=elt("button","secundario","Quitar");
      remove.type="button";
      remove.addEventListener("click",()=>{
        if(!canUse())return;
        selectedPictos=selectedPictos.filter(x=>x.id!==item.id);
        applyPictos();
      });
      row.append(remove);box.append(row);
    });
  }
  function applyPictos() {
    if(!canUse()||$("dia-tipo").value!=="arasaac")return;
    verifiedLsp=null;
    field("dia-lsp-id","");
    field("dia-imagen-lsp","");
    field("dia-arasaac-ids",selectedPictos.map(x=>x.id).join(", "));
    field("dia-titulo-recurso",selectedPictos.map(x=>x.label).join(" / "));
    field("dia-descripcion",selectedPictos.length === 1
      ? "Recurso visual para apoyar la comprensión y anticipación de la acción "+selectedPictos[0].label+". Adaptar su uso al contexto y las necesidades del estudiante."
      : "Conjunto de pictogramas para apoyar la comunicación y comprensión de las acciones seleccionadas. Revisar su pertinencia pedagógica.");
    field("dia-alt",selectedPictos.map(x=>"Pictograma de "+x.label).join("; "));
    field("dia-fuente","https://arasaac.org/");
    field("dia-licencia","CC BY-NC-SA 4.0");
    field("dia-atribucion","Pictogramas: Sergio Palao. Procedencia: ARASAAC. Propiedad: Gobierno de Aragón. Licencia CC BY-NC-SA 4.0. IDs: "+selectedPictos.map(x=>x.id).join(", ")+".");
    field("dia-referencia",LICENSE);
    $("dia-derechos").checked=false;
    $("dia-revision").checked=false;
    drawSelection();
    setStatus("Selección guardada en el formulario. Completa su descripción y revisión pedagógica antes de aprobarla.");
  }
  function showLsp(list) {
    const box=$("dia-resultados-fuente");box.replaceChildren();
    list.slice(0,24).forEach(item=>{
      const url=allowedSource(item.archivo_imagen);
      if(!url)return;
      const card=elt("article","dia-fuente-resultado");
      card.append(photo(url,"Seña "+item.palabra));
      const details=elt("div","dia-fuente-detalle");
      details.append(elt("strong","",item.palabra),
        elt("small","",item.categoria.replace(/_/g," ")+" · "+item.id));
      const description=elt("p","",item.descripcion.slice(0,240));details.append(description);
      const select=elt("button","secundario","Seleccionar seña");
      select.type="button";
      select.addEventListener("click",()=>applyLsp(item,url));
      details.append(select);card.append(details);box.append(card);
    });
    setStatus(list.length ? "Se encontraron "+list.length+" resultados válidos. Se muestran hasta 24." :
      "No se encontraron señas con imagen y descripción verificables.");
  }
  function getTerm(item) {
    const candidates=item.keywords||[];
    const match=candidates.find(x=>x.keyword&&x.type===1)||candidates.find(x=>x.keyword);
    return String(match?.keyword || ("Pictograma "+(item._id||item.id))).trim();
  }
  function relevantPictos(list, term) {
    const clean = normalize(term).replace(/[^a-z0-9ñ ]/g, " ").replace(/\\s+/g, " ").trim();
    const words = clean.split(" ").filter(w => w.length > 2 && !["los","las","del","con","para","por","una","uno","unos","unas"].includes(w));
    if (!words.length) return [];
    const stem = word => {
      if(/(arse|erse|irse)$/.test(word))return word.slice(0,-4);
      if(/(ando|iendo)$/.test(word))return word.slice(0,word.endsWith("ando")?-4:-5);
      if(/(ar|er|ir)$/.test(word))return word.slice(0,-2);
      if(word.endsWith("es") && word.length>5)return word.slice(0,-2);
      if(word.endsWith("s") && word.length>4)return word.slice(0,-1);
      return word;
    };
    const matchesWord = (a,b) => a===b || (stem(a).length>=3 &&
      (stem(a)===stem(b) || (stem(a).length>=4 && stem(b).length>=4 && stem(a).slice(0,4)===stem(b).slice(0,4))));
    const score = item => {
      const terms = (item.keywords||[]).map(k => normalize(k.keyword||k.word||"")).filter(Boolean);
      const labels = terms.flatMap(t=>t.split(/[^a-z0-9ñ]+/).filter(Boolean));
      if (!words.every(w=>labels.some(label=>matchesWord(w,label)))) return -1;
      return terms.some(t=>t===clean) ? 3 : terms.some(t=>words.every(w=>t.split(/[^a-z0-9ñ]+/).some(label=>matchesWord(w,label)))) ? 2 : 1;
    };
    return list.map((item,index)=>({item,index,score:score(item)}))
      .filter(x=>x.score>=0).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.item);
  }
  function showPictos(list) {
    const box=$("dia-resultados-fuente");box.replaceChildren();
    const seen=new Set();
    const items=[];
    for(const item of list){
      const id=String(item._id||item.id||"");
      if(!/^[1-9]\d*$/.test(id)||seen.has(id))continue;
      seen.add(id);items.push({id,label:getTerm(item)});
      if(items.length>=24)break;
    }
    items.forEach(item=>{
      const card=elt("article","dia-fuente-resultado");
      card.append(photo(pictoImage(item.id),"Pictograma "+item.label));
      const details=elt("div","dia-fuente-detalle");
      details.append(elt("strong","",item.label),elt("small","","ARASAAC · ID "+item.id));
      const btn=elt("button","secundario","Seleccionar pictograma");
      btn.type="button";
      btn.disabled=selectedPictos.some(x=>x.id===item.id);
      btn.addEventListener("click",()=>{
        if(!canUse()||$("dia-tipo").value!=="arasaac")return;
        if(selectedPictos.some(x=>x.id===item.id))return;
        if(selectedPictos.length===3){setStatus("Máximo de tres pictogramas por fecha.",true);return;}
        selectedPictos.push(item);applyPictos();
        btn.disabled=true;
      });
      details.append(btn);card.append(details);
      card.classList.add("dia-fuente-elegible");
      card.tabIndex=0;
      card.setAttribute("role","button");
      card.setAttribute("aria-label","Seleccionar pictograma "+item.label+", identificador "+item.id);
      const selectCard=()=>{
        if(!canUse()||$("dia-tipo").value!=="arasaac")return;
        if(selectedPictos.some(x=>x.id===item.id))return;
        if(selectedPictos.length===3){setStatus("Máximo de tres pictogramas por fecha.",true);return;}
        selectedPictos.push(item);applyPictos();btn.disabled=true;
      };
      card.addEventListener("click",event=>{if(event.target.closest("button"))return;selectCard();});
      card.addEventListener("keydown",event=>{
        if(event.target!==card||!["Enter"," "].includes(event.key))return;
        event.preventDefault();selectCard();
      });
      box.append(card);
    });
    setStatus(items.length?items.length+" pictogramas disponibles. Selección manual obligatoria.":
      "No se encontraron pictogramas para el término.");
  }
  async function find() {
    if(!canUse())return;
    const term=$("dia-busqueda").value.trim();
    if(term.length<2){setStatus("Introduce al menos dos caracteres.",true);return;}
    controller?.abort();controller=new AbortController();
    const current=++sequence;
    $("dia-resultados-fuente").replaceChildren();
    setStatus("Consultando catálogo...");
    try{
      if($("dia-tipo").value==="lsp"){
        if(!bank){
          const resp=await fetch(BDA,{signal:controller.signal,cache:"force-cache"});
          if(!resp.ok)throw Error("BDA no disponible ("+resp.status+").");
          const data=await resp.json();
          if(!Array.isArray(data))throw Error("Catálogo LSP no válido.");
          bank=data.filter(x=>x&&/^LSP-\d{6}$/.test(x.id||"")
            && x.palabra&&String(x.descripcion||"").trim()
            && !BAD_LSP.has(x.id)&&!SKIP.has(x.categoria)
            && allowedSource(x.archivo_imagen));
        }
        if(current!==sequence||!canUse())return;
        const needle=normalize(term);
        const match=bank.filter(x=>normalize(x.palabra).includes(needle));
        showLsp(match);
      }else{
        // ARASAAC puede responder 404 si no hay resultados. Buscar alternativas sin tratarlo como caída del servicio.
        const alternatives={
          "vestirse":["vestir","ponerse la ropa"],
          "banarse":["bañar","baño","ducharse"],
          "compartir":["prestar"]
        };
        const key=normalize(term);
        const variants=[term,...(alternatives[key]||[])];
        const requests=[];
        for(const variant of variants){
          if(variant.trim().split(/\s+/).length>1)requests.push({query:'"'+variant+'"',term:variant});
          requests.push({query:variant,term:variant});
        }
        const seen=new Set();
        let matches=[],matchingTerm="";
        for(const entry of requests){
          if(seen.has(entry.query))continue;
          seen.add(entry.query);
          const resp=await fetch(API+encodeURIComponent(entry.query),{signal:controller.signal,cache:"no-store"});
          if(resp.status===404)continue;
          if(!resp.ok)throw Error("ARASAAC no disponible ("+resp.status+").");
          const data=await resp.json();
          if(!Array.isArray(data))throw Error("Respuesta inesperada de ARASAAC.");
          matches=relevantPictos(data,entry.term);
          if(matches.length){matchingTerm=entry.term;break;}
        }
        if(current!==sequence||!canUse())return;
        showPictos(matches);
        if(matches.length && normalize(matchingTerm)!==key)
          setStatus(matches.length+" pictogramas relacionados con «"+matchingTerm+"». Revisa cada imagen antes de seleccionarla.");
        else if(!matches.length)
          setStatus("Sin coincidencias en ARASAAC para esta expresión. Prueba otra palabra, por ejemplo «vestir» o «baño».",true);
      }
    }catch(error){
      if(error.name!=="AbortError"&&current===sequence){
        setStatus("No se pudo consultar la fuente: "+error.message,true);
      }
    }
  }
  function configure({authorized}) {
    canUse=authorized;
    if(!authorized())clearSelection();
  }
  function refresh() {
    rehydrate();
  }
  function reset() {
    clearSelection();setStatus("Selecciona un tipo y busca un recurso oficial.");
  }
  $("dia-buscar")?.addEventListener("click",find);
  $("dia-busqueda")?.addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();find();}
  });
  window.EvaRecursoDiaFuentes=Object.freeze({configurar:configure,actualizar:refresh,limpiar:reset,cambiarTipo:sourceChanged});
})();