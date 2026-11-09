(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const institucional=$("cal-admin-institucional"),civico=$("cal-admin-civico"),botonInstitucional=$("cal-tab-institucional"),botonCivico=$("cal-tab-civico");
  if(!institucional||!civico||!botonInstitucional||!botonCivico)return;
  const lista=$("cal-civico-listado"),elegir=$("cal-civico-seleccion"),estado=$("cal-civico-estado");
  const nombres=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Setiembre","Octubre","Noviembre","Diciembre"];
  let autorizacion=false,registros=[],cargado=false,solicitud=0;
  const texto=(id,valor)=>{const el=$(id);if(el)el.textContent=valor||"";};
  const normalizar=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-PE");
  const formato=iso=>{const [,mes,dia]=iso.split("-");return Number(dia)+" de "+nombres[Number(mes)-1]+" de "+iso.slice(0,4)};
  function mostrarSeccion(nombre){
    if(!autorizacion)return;
    const esCivico=nombre==="civico";
    institucional.hidden=esCivico;civico.hidden=!esCivico;
    botonCivico.setAttribute("aria-pressed",String(esCivico));botonInstitucional.setAttribute("aria-pressed",String(!esCivico));
    if(esCivico&&!cargado)cargar();
  }
  function filtros(){
    const q=normalizar($("cal-civico-buscar").value.trim());
    const m=$("cal-civico-mes").value,cat=$("cal-civico-categoria").value;
    return registros.filter(x=>(m==="todos"||x.fecha.slice(5,7)===m)
      &&(cat==="todas"||x.categoria===cat)
      &&(!q||normalizar(x.titulo+" "+x.descripcion+" "+x.fecha).includes(q)));
  }
  function actualizarListado(){
    if(!autorizacion)return;
    const prev=elegir.value,items=filtros();
    elegir.replaceChildren();
    const inicial=document.createElement("option");inicial.value="";inicial.textContent="Selecciona una fecha";elegir.append(inicial);
    lista.replaceChildren();
    for(const x of items){
      const idx=registros.indexOf(x),id=String(idx);
      const option=document.createElement("option");option.value=id;option.textContent=formato(x.fecha)+" · "+x.titulo;elegir.append(option);
      const boton=document.createElement("button");boton.type="button";boton.className="cal-civico-item";
      const fecha=document.createElement("span");fecha.className="cal-civico-item-fecha";fecha.textContent=formato(x.fecha)+" · "+x.categoria;
      const titulo=document.createElement("strong");titulo.textContent=x.titulo;boton.append(fecha,titulo);
      boton.addEventListener("click",()=>{elegir.value=id;actualizarPrevia();$("cal-civico-seleccion").focus();});
      lista.append(boton);
    }
    if(!items.length){const aviso=document.createElement("p");aviso.className="nota";aviso.textContent="No se encontraron fechas con esos filtros.";lista.append(aviso);}
    elegir.value=Array.from(elegir.options).some(x=>x.value===prev)?prev:"";
    estado.textContent=items.length+" de "+registros.length+" conmemoraciones visibles. Selecciona una fecha para consultar su contenido y preparar la tarjeta.";
    actualizarPrevia();
  }
  function actualizarPrevia(){
    if(!autorizacion)return;
    const index=elegir.value===""?-1:Number(elegir.value),x=registros[index];
    const activo=Boolean(x&&$("cal-civico-mostrar").checked);
    texto("cal-civico-previa-estado",!x?"Selecciona una conmemoración para preparar la tarjeta.":!activo?"Tarjeta desactivada en la propuesta.":$("cal-civico-prioridad").value==="principal"?"Propuesta de tarjeta principal.":"Propuesta de tarjeta secundaria.");
    texto("cal-civico-previa-fecha",x?formato(x.fecha)+" · 00:00 a 00:00 del día siguiente (Perú)":"");
    texto("cal-civico-previa-nombre",x?x.titulo:"");
    texto("cal-civico-previa-descripcion",x?x.descripcion:"");
    $("cal-civico-previa-enlace").hidden=!x;
  }
  async function cargar(){
    if(!autorizacion)return;
    const version=++solicitud;
    estado.textContent="Cargando fechas del calendario cívico...";
    try{
      const controlador=new AbortController();
      const timeout=setTimeout(()=>controlador.abort(),12000);
      let respuesta;
      try{respuesta=await fetch("../recursos/calendario-civico.json",{cache:"no-store",signal:controlador.signal});}finally{clearTimeout(timeout);}
      if(!respuesta.ok)throw new Error("No fue posible obtener el calendario público.");
      const data=await respuesta.json();
      if(!Number.isInteger(data.anio)||!Array.isArray(data.registros))throw new Error("Datos de calendario inválidos.");
      if(!autorizacion||version!==solicitud)return;
      registros=data.registros.filter(x=>x&&typeof x.fecha==="string"&&x.fecha.startsWith(String(data.anio)+"-")&&typeof x.titulo==="string"&&typeof x.descripcion==="string"&&["Cívica","Educación","Inclusión"].includes(x.categoria));
      registros.sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.titulo.localeCompare(b.titulo,"es"));
      texto("cal-civico-anio",String(data.anio));cargado=true;
      actualizarListado();
    }catch(error){
      if(!autorizacion||version!==solicitud)return;
      lista.replaceChildren();elegir.replaceChildren();
      estado.textContent="No se pudieron consultar las fechas. Vuelve a abrir esta pestaña para reintentar.";
      cargado=false;
    }
  }
  function limpiar(){
    ++solicitud;autorizacion=false;cargado=false;registros=[];lista.replaceChildren();elegir.replaceChildren();
    institucional.hidden=false;civico.hidden=true;botonInstitucional.setAttribute("aria-pressed","true");botonCivico.setAttribute("aria-pressed","false");
    $("cal-civico-buscar").value="";$("cal-civico-mes").value="todos";$("cal-civico-categoria").value="todas";
    $("cal-civico-mostrar").checked=true;$("cal-civico-prioridad").value="principal";
    ["cal-civico-previa-estado","cal-civico-previa-fecha","cal-civico-previa-nombre","cal-civico-previa-descripcion"].forEach(id=>texto(id,""));
    $("cal-civico-previa-enlace").hidden=true;
    estado.textContent="Consulta disponible tras iniciar sesión.";
  }
  nombres.forEach((nombre,i)=>{const o=document.createElement("option");o.value=String(i+1).padStart(2,"0");o.textContent=nombre;$("cal-civico-mes").append(o);});
  botonInstitucional.addEventListener("click",()=>mostrarSeccion("institucional"));
  botonCivico.addEventListener("click",()=>mostrarSeccion("civico"));
  ["cal-civico-mes","cal-civico-categoria"].forEach(id=>$(id).addEventListener("change",actualizarListado));
  $("cal-civico-buscar").addEventListener("input",actualizarListado);
  $("cal-civico-seleccion").addEventListener("change",actualizarPrevia);
  $("cal-civico-prioridad").addEventListener("change",actualizarPrevia);
  $("cal-civico-mostrar").addEventListener("change",actualizarPrevia);
  $("cal-civico-previa-boton").addEventListener("click",actualizarPrevia);
  $("cal-civico-limpiar").addEventListener("click",()=>{elegir.value="";$("cal-civico-prioridad").value="principal";$("cal-civico-mostrar").checked=true;actualizarPrevia();});
  window.EvaCalendarioCivicoAdmin=Object.freeze({
    configurar(perfil){if(!perfil?.autorizado){limpiar();return;}autorizacion=true;},
    limpiar
  });
})();
