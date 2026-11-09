(() => {
  "use strict";
  const nav=document.getElementById("calendario-anios-nav");
  const grid2026=document.getElementById("calendario-anio-2026");
  const dinamico=document.getElementById("calendario-anio-dinamico");
  const estado=document.getElementById("calendario-anios-estado");
  if (!nav || !grid2026 || !dinamico || !estado) return;
  const nombres=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Setiembre","Octubre","Noviembre","Diciembre"];
  let anios=[2026,2027];
  let seleccionado=2026;
  let registros=null;
  let fallo=false;
  function actualPeru() {
    return Number(new Intl.DateTimeFormat("en-US",{timeZone:"America/Lima",year:"numeric"}).format(new Date()));
  }
  function soloFecha(valor,anio,mes) {
    return typeof valor==="string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)
      && Number(valor.slice(0,4))===anio && Number(valor.slice(5,7))===mes;
  }
  function construirMes(anio,mes) {
    const articulo=document.createElement("article");
    articulo.className="mes";
    const titulo=document.createElement("h3");
    titulo.textContent=nombres[mes-1]+" "+anio;
    const cabecera=document.createElement("div");
    cabecera.className="mes-cabecera";
    cabecera.append(titulo);
    articulo.append(cabecera);
    const tabla=document.createElement("table");
    tabla.className="tabla-calendario";
    const thead=document.createElement("thead");
    const filaHead=document.createElement("tr");
    for(const texto of ["Fecha","Actividad","Estado"]) {
      const th=document.createElement("th");th.textContent=texto;filaHead.append(th);
    }
    thead.append(filaHead);tabla.append(thead);
    const tbody=document.createElement("tbody");
    const mesRegistros=(registros||[]).filter(reg=>soloFecha(reg?.fecha,anio,mes));
    mesRegistros.sort((a,b)=>a.fecha.localeCompare(b.fecha)||Number(a.orden||0)-Number(b.orden||0));
    for(const reg of mesRegistros) {
      const tr=document.createElement("tr");
      const fecha=document.createElement("td");
      fecha.textContent=reg.fecha.slice(8,10)+"/"+reg.fecha.slice(5,7)+"/"+anio;
      const descripcion=document.createElement("td");
      const lineas=Array.isArray(reg.contenido_lineas)?reg.contenido_lineas.filter(x=>typeof x==="string"&&x.trim()):[];
      if(lineas.length) for(const [i,linea] of lineas.entries()) {
        const nodo=document.createElement(i===0?"strong":"span");
        nodo.textContent=linea;
        nodo.className="calendario-anio-linea";
        descripcion.append(nodo);
      } else descripcion.textContent="Actividad publicada";
      const est=document.createElement("td");
      est.textContent=String(reg.estado||"Programada").replaceAll("_"," ");
      tr.append(fecha,descripcion,est);tbody.append(tr);
    }
    if(!mesRegistros.length){
      const tr=document.createElement("tr");
      const td=document.createElement("td");td.colSpan=3;
      td.textContent=fallo?"No se pudieron verificar las actividades publicadas.":"Sin actividades publicadas para este mes.";
      tr.append(td);tbody.append(tr);
    }
    tabla.append(tbody);articulo.append(tabla);
    return articulo;
  }
  function actualizar() {
    grid2026.hidden=seleccionado!==2026;
    dinamico.hidden=seleccionado===2026;
    estado.textContent="Calendario institucional "+seleccionado+
      (registros===null && !fallo?". Cargando actividades publicadas.":fallo?". No se pudo verificar la programación publicada.":". Actividades publicadas.");
    nav.querySelectorAll("button").forEach(b=>{
      const activo=Number(b.dataset.anio)===seleccionado;
      b.setAttribute("aria-pressed",String(activo));
    });
    if(seleccionado!==2026){
      dinamico.replaceChildren();
      for(let m=1;m<=12;m++) dinamico.append(construirMes(seleccionado,m));
    }
  }
  function elegir(anio) {
    if(!anios.includes(anio)) return;
    seleccionado=anio;
    actualizar();
  }
  function construirPestanas(){
    nav.replaceChildren();
    for(const anio of anios){
      const boton=document.createElement("button");
      boton.type="button";
      boton.dataset.anio=String(anio);
      boton.textContent="Calendario "+anio;
      boton.addEventListener("click",()=>elegir(anio));
      nav.append(boton);
    }
    const hoy=actualPeru();
    seleccionado=anios.includes(hoy)?hoy:Math.max(...anios.filter(n=>n<=hoy).length?anios.filter(n=>n<=hoy):[anios[0]]);
    actualizar();
  }
  document.addEventListener("eva:calendario-publico",e=>{
    if(Array.isArray(e.detail?.registros)){registros=e.detail.registros;fallo=false;}
    else {registros=null;fallo=true;}
    actualizar();
  });
  async function iniciar(){
    try{
      const respuesta=await fetch("calendarios-anios.json",{cache:"no-store"});
      if(!respuesta.ok)throw new Error("Configuración no disponible");
      const config=await respuesta.json();
      const validos=Array.isArray(config.anios)?[...new Set(config.anios.filter(v=>Number.isInteger(v)&&v>=2026&&v<=2100))].sort((a,b)=>a-b):[];
      if(validos.includes(2026)&&validos.length)anios=validos;
    }catch{estado.textContent="Usando años de calendario disponibles.";}
    construirPestanas();
  }
  iniciar();
})();
