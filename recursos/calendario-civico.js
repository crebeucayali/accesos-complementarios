(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const nombres=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Setiembre","Octubre","Noviembre","Diciembre"];
  const dias=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  const contenedor=$("civico-contenido"), estado=$("civico-estado"), mes=$("civico-mes"), categoria=$("civico-categoria"), busqueda=$("civico-busqueda"), nav=$("civico-meses-nav");
  if(!contenedor||!estado||!mes||!categoria||!busqueda||!nav)return;
  let registros=[],anio=2026;
  const crear=(tag,clase,texto)=>{const el=document.createElement(tag);if(clase)el.className=clase;if(texto!==undefined)el.textContent=texto;return el};
  const fecha=(mes,dia)=>anio+"-"+String(mes).padStart(2,"0")+"-"+String(dia).padStart(2,"0");
  function normalizar(valor){return String(valor||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-PE")}
  function filtrar(){
    const query=normalizar(busqueda.value.trim());
    return registros.filter(r=>(categoria.value==="todas"||r.categoria===categoria.value)
      &&(!query||normalizar([r.titulo,r.descripcion,r.categoria,r.ficha?.antecedentes,r.ficha?.origen].join(" ")).includes(query)));
  }
  function construirMes(numero,registrosVisibles) {
    const seccion=crear("section","civico-mes");
    seccion.id="civico-"+String(numero).padStart(2,"0");
    const lista=registrosVisibles.filter(r=>Number(r.fecha.slice(5,7))===numero);
    const h3=crear("h3","civico-mes-titulo",nombres[numero-1]+" "+anio);
    const cantidad=crear("span","civico-mes-cantidad",lista.length+" "+(lista.length===1?"conmemoración":"conmemoraciones"));
    const cab=crear("div","civico-mes-cabecera");cab.append(h3,cantidad);seccion.append(cab);
    const tabla=crear("table","civico-tabla");
    tabla.setAttribute("aria-label","Calendario de "+nombres[numero-1]+" de "+anio);
    const thead=crear("thead");const encabezado=crear("tr");
    for(const nombre of dias)encabezado.append(crear("th","",nombre));
    thead.append(encabezado);tabla.append(thead);
    const tbody=crear("tbody");
    const primero=(new Date(Date.UTC(anio,numero-1,1)).getUTCDay()+6)%7;
    const total=new Date(Date.UTC(anio,numero,0)).getUTCDate();
    const filas=Math.ceil((primero+total)/7);
    for(let f=0;f<filas;f++){
      const tr=crear("tr");
      for(let d=0;d<7;d++){
        const dia=f*7+d-primero+1,celda=crear("td");
        if(dia<1||dia>total){celda.classList.add("civico-sin-dia");celda.setAttribute("aria-hidden","true");}
        else {
          const iso=fecha(numero,dia),eventos=lista.filter(r=>r.fecha===iso);
          const numeroDia=crear("span","civico-numero",String(dia));
          celda.append(numeroDia);
          if(eventos.length){
            celda.classList.add("civico-con-fecha");
            const nota=crear("span","civico-indicador",eventos.length===1?"1 fecha":eventos.length+" fechas");
            nota.title=eventos.map(x=>x.titulo).join("; ");
            celda.append(nota);
            const enlace=crear("a","civico-dia-enlace","Ver");
            enlace.href="#civico-dia-"+iso;
            enlace.setAttribute("aria-label","Ver "+eventos.length+" "+(eventos.length===1?"conmemoración":"conmemoraciones")+" del "+dia+" de "+nombres[numero-1]);
            celda.append(enlace);
          }
        }
        tr.append(celda);
      }
      tbody.append(tr);
    }
    tabla.append(tbody);const scroll=crear("div","civico-tabla-wrap");scroll.append(tabla);seccion.append(scroll);
    const articulos=crear("div","civico-eventos");
    if(!lista.length)articulos.append(crear("p","civico-vacio","No hay conmemoraciones que coincidan con los filtros en este mes."));
    const fechasIdentificadas=new Set();
    for(const r of lista){
      const articulo=crear("article","civico-evento");
      if(!fechasIdentificadas.has(r.fecha)){
        articulo.id="civico-dia-"+r.fecha;
        fechasIdentificadas.add(r.fecha);
      }
      const fechaVisible=crear("span","civico-evento-fecha",Number(r.fecha.slice(8,10))+" de "+nombres[numero-1].toLocaleLowerCase("es-PE"));
      const clase={"Inclusión":"inclusion","Educación":"educacion","Cívica":"civica"}[r.categoria]||"";
      const etiqueta=crear("span","civico-etiqueta civico-etiqueta-"+clase,r.categoria);
      const meta=crear("div","civico-evento-meta");meta.append(fechaVisible,etiqueta);
      const nombre=crear("h4","",r.titulo);
      const descripcion=crear("p","",r.descripcion);
      const fichaDatos=r.ficha&&typeof r.ficha==="object"?r.ficha:null;
      articulo.append(meta,nombre);
      if(fichaDatos&&typeof fichaDatos.antecedentes==="string"&&typeof fichaDatos.origen==="string"){
        const detalles=crear("details","civico-ficha");
        const abrir=crear("summary","civico-ficha-abrir","Conoce esta fecha");
        // El cursor abre la información en escritorio; teclado y pantallas táctiles conservan el clic nativo.
        detalles.addEventListener("pointerenter",(evento)=>{
          if(evento.pointerType==="mouse"&&window.matchMedia("(hover: hover) and (pointer: fine)").matches) detalles.open=true;
        });
        detalles.addEventListener("pointerleave",(evento)=>{
          if(evento.pointerType==="mouse"&&window.matchMedia("(hover: hover) and (pointer: fine)").matches
             &&!detalles.contains(document.activeElement)) detalles.open=false;
        });
        detalles.addEventListener("focusout",(evento)=>{
          if(!detalles.contains(evento.relatedTarget)&&!detalles.matches(":hover")) detalles.open=false;
        });
        const contenido=crear("div","civico-ficha-contenido");
        function campo(etiqueta,valor){
          const bloque=crear("div","civico-ficha-campo");
          bloque.append(crear("h5","",etiqueta),crear("p","",valor));
          return bloque;
        }
        contenido.append(
          campo("¿Por qué se conmemora?",typeof fichaDatos.motivo==="string"?fichaDatos.motivo:r.descripcion),
          campo("Antecedentes e historia",fichaDatos.antecedentes),
          campo("¿Desde cuándo?",fichaDatos.origen)
        );
        if(typeof fichaDatos.fuente_historia_url==="string"&&/^https:\/\//.test(fichaDatos.fuente_historia_url)){
          const enlaceHistoria=crear("a","civico-fuente","Consultar fuente histórica");
          enlaceHistoria.href=fichaDatos.fuente_historia_url;
          enlaceHistoria.target="_blank";enlaceHistoria.rel="noopener noreferrer";
          contenido.append(enlaceHistoria);
        }
        detalles.append(abrir,contenido);
        articulo.append(detalles);
      }else{
        articulo.append(descripcion);
      }
      const fuente=crear("a","civico-fuente","Fuente de la conmemoración: "+r.fuente);
      fuente.href=r.fuente_url;fuente.target="_blank";fuente.rel="noopener noreferrer";
      articulo.append(fuente);articulos.append(articulo);
    }
    seccion.append(articulos);return seccion;
  }
  function render(){
    const visibles=filtrar();
    contenedor.replaceChildren();nav.replaceChildren();
    const seleccion=mes.value;
    for(let m=1;m<=12;m++){
      if(seleccion!=="todos"&&Number(seleccion)!==m)continue;
      const etiqueta=crear("a","civico-mes-link",nombres[m-1]);
      etiqueta.href="#civico-"+String(m).padStart(2,"0");
      nav.append(etiqueta);
      contenedor.append(construirMes(m,visibles));
    }
    estado.textContent="Calendario "+anio+": "+visibles.length+" "+(visibles.length===1?"conmemoración encontrada":"conmemoraciones encontradas")+". "+(seleccion==="todos"?"Del 1 de enero al 31 de diciembre.":"Mes seleccionado: "+nombres[Number(seleccion)-1]+".");
  }
  for(let m=1;m<=12;m++){
    const o=crear("option","",nombres[m-1]);o.value=String(m);mes.append(o);
  }
  for(const control of [mes,categoria,busqueda])control.addEventListener(control===busqueda?"input":"change",render);
  $("civico-limpiar")?.addEventListener("click",()=>{mes.value="todos";categoria.value="todas";busqueda.value="";render();busqueda.focus();});
  async function iniciar(){
    try{
      const respuesta=await fetch("calendario-civico.json",{cache:"no-store"});
      if(!respuesta.ok)throw new Error("No se pudo obtener el calendario.");
      const datos=await respuesta.json();
      if(!Number.isInteger(datos.anio)||datos.anio<2026||datos.anio>2100||!Array.isArray(datos.registros))throw new Error("El archivo de fechas no tiene la estructura esperada.");
      anio=datos.anio;
      const campoAnio=document.getElementById("civico-anio");
      if(campoAnio)campoAnio.textContent=String(anio);
      const categorias=new Set(["Cívica","Educación","Inclusión"]);
      registros=datos.registros.filter(r=>r&&new RegExp("^"+anio+"-\\d{2}-\\d{2}$").test(r.fecha)
        &&Number.isFinite(Date.parse(r.fecha+"T00:00:00Z"))
        &&categorias.has(r.categoria)&&typeof r.titulo==="string"
        &&typeof r.descripcion==="string"&&typeof r.fuente_url==="string"
        &&/^https:\/\//.test(r.fuente_url));
      registros.sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.titulo.localeCompare(b.titulo,"es"));
      render();
    }catch(error){
      estado.textContent="No se pudo cargar el calendario cívico. Recarga la página para reintentar.";
      contenedor.replaceChildren();nav.replaceChildren();
      console.warn("Calendario cívico EVA:",error);
    }
  }
  iniciar();
})();
