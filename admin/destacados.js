(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const auth=window.EvaAdminSession;
  let perfil=null,recursos=[],ocupado=false,iniciado=false;
  const origenes={
    CAP:"capacitaciones",BDA:"banco-digital-accesible",MEA:"materiales-educativos-accesibles",
    NI:"noti-inclusivos",RA:"repositorio-accesible","DUA 3.0":"DUA-3.0"
  };
  const permitido=()=>perfil?.autorizado===true&&perfil.rol==="master"&&perfil.aal==="aal2"&&Boolean(auth?.getSession());
  function exigir(){if(!permitido())throw new Error("La gestión de destacados requiere una sesión Master con MFA.");}
  async function consultar(path,options={}){exigir();return auth.request(path,options);}
  const ordenados=()=>recursos.slice().sort((a,b)=>Number(a.orden)-Number(b.orden)||Number(a.id)-Number(b.id));
  const mensaje=(texto,error=false)=>{
    const el=$("destacados-mensaje");el.textContent=texto||"";
    el.className="mensaje"+(error?" error":texto?" exito":"");
  };
  function boton(texto,accion,disabled=false){
    const el=document.createElement("button");el.type="button";el.className="secundario";
    el.textContent=texto;el.disabled=ocupado||disabled;el.addEventListener("click",accion);return el;
  }
  function render(){
    if(!iniciado)return;
    const tabla=$("destacados-listado"),orden=$("destacados-orden");
    tabla.replaceChildren();orden.replaceChildren();
    const items=ordenados();
    if(!items.length){
      const tr=document.createElement("tr"),td=document.createElement("td");
      td.colSpan=3;td.textContent="Todavía no hay recursos destacados registrados.";
      tr.appendChild(td);tabla.appendChild(tr);
      const li=document.createElement("li");li.textContent="Registra un recurso para establecer su posición.";orden.appendChild(li);
      return;
    }
    items.forEach((item)=>{
      const fila=document.createElement("tr"),contenido=document.createElement("td");
      const titulo=document.createElement("strong");titulo.textContent=item.modulo+" · "+item.titulo;
      const detalle=document.createElement("span");detalle.className="destacados-detalle";detalle.textContent=item.descripcion;
      contenido.append(titulo,detalle);
      const estado=document.createElement("td");estado.textContent=item.visible?"Visible":"Oculto";
      const accion=document.createElement("td"),acciones=document.createElement("div");acciones.className="destacados-acciones";
      acciones.append(boton("Editar",()=>editar(item)),
        boton(item.visible?"Ocultar":"Mostrar",()=>visibilidad(item)),
        boton("Eliminar",()=>eliminar(item)));
      accion.appendChild(acciones);fila.append(contenido,estado,accion);tabla.appendChild(fila);
    });
    const visibles=items.filter(item=>item.visible===true);
    if(!visibles.length){
      const li=document.createElement("li");
      li.textContent="No hay recursos visibles. Usa Mostrar en la tabla superior para activar una tarjeta.";
      orden.appendChild(li);
      return;
    }
    visibles.forEach((item,i)=>{
      const li=document.createElement("li");li.className="destacados-orden-item";
      const nombre=document.createElement("span");nombre.textContent=(i+1)+". "+item.titulo+" ("+item.modulo+")";
      const pasos=document.createElement("span");pasos.className="destacados-acciones";
      pasos.append(boton("Subir",()=>mover(item.id,-1),i===0),boton("Bajar",()=>mover(item.id,1),i===visibles.length-1));
      li.append(nombre,pasos);orden.appendChild(li);
    });
  }
  async function refrescar(){
    const filas=await consultar("eva_recursos_destacados?select=*&order=orden.asc,id.asc");
    if(!Array.isArray(filas))throw new Error("No se pudo recuperar el listado.");
    recursos=filas;render();
  }
  async function ejecutar(funcion){
    if(ocupado)return;ocupado=true;render();
    try{await funcion();}catch(error){mensaje(error.message||"No se completó la operación.",true);}
    finally{ocupado=false;render();}
  }
  function actualizarPreview(){
    $("destacados-preview-modulo").textContent=$("destacados-modulo").value||"Módulo";
    $("destacados-preview-titulo").textContent=$("destacados-titulo").value.trim()||"Título del recurso";
    $("destacados-preview-descripcion").textContent=$("destacados-descripcion").value.trim()||"Descripción del recurso.";
    $("destacados-preview-modulo").parentElement.style.opacity=$("destacados-visible").checked?"1":".75";
  }
  function limpiarFormulario(){
    $("destacados-form").reset();$("destacados-id").value="";$("destacados-visible").checked=false;actualizarPreview();
  }
  function editar(item){
    $("destacados-id").value=String(item.id);
    $("destacados-modulo").value=item.modulo;
    $("destacados-titulo").value=item.titulo;
    $("destacados-descripcion").value=item.descripcion;
    $("destacados-enlace").value=item.enlace_url;
    $("destacados-imagen").value=item.imagen_url||"";
    $("destacados-visible").checked=Boolean(item.visible);
    actualizarPreview();
    $("destacados-editor-titulo").scrollIntoView({block:"start",behavior:"smooth"});
    $("destacados-titulo").focus({preventScroll:true});
  }
  function urlOficial(valor,modulo){
    let url;
    try{url=new URL(valor);}catch{throw new Error("Introduce una URL válida del recurso.");}
    const base="/"+origenes[modulo]+"/";
    if(url.protocol!=="https:"||url.hostname!=="crebeucayali.github.io"||!url.pathname.startsWith(base)||url.username||url.password){
      throw new Error("El enlace debe pertenecer al módulo oficial seleccionado en EVA.");
    }
    return url.href;
  }
  function imagenOficial(valor){
    if(!valor)return "";
    let url;try{url=new URL(valor);}catch{throw new Error("La dirección de la imagen no es válida.");}
    if(url.protocol!=="https:"||url.hostname!=="crebeucayali.github.io"||url.username||url.password){
      throw new Error("La imagen debe estar alojada en GitHub institucional.");
    }
    return url.href;
  }
  async function modificar(item,patch){
    const result=await consultar("eva_recursos_destacados?id=eq."+encodeURIComponent(item.id),{
      method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)
    });
    if(!Array.isArray(result)||result.length!==1)throw new Error("El cambio no fue confirmado.");
  }
  async function mover(id,direccion){
    await ejecutar(async()=>{
      const items=ordenados(),visibles=items.filter(item=>item.visible===true);
      const index=visibles.findIndex(x=>String(x.id)===String(id));
      const actual=visibles[index],otro=visibles[index+direccion];
      if(!actual||!otro)return;
      if(!Number.isInteger(Number(actual.orden))||!Number.isInteger(Number(otro.orden))||Number(actual.orden)===Number(otro.orden)){
        throw new Error("Posiciones duplicadas o incorrectas. Actualiza el listado.");
      }
      const remotos=await consultar("eva_recursos_destacados?select=id,orden,visible&order=orden.asc,id.asc");
      if(remotos.length!==items.length||remotos.some((x,i)=>String(x.id)!==String(items[i].id)||Number(x.orden)!==Number(items[i].orden)||x.visible!==items[i].visible)){
        throw new Error("El orden cambió en otra sesión. Actualiza antes de reordenar.");
      }
      await modificar(actual,{orden:otro.orden});
      try{await modificar(otro,{orden:actual.orden});}
      catch(error){try{await modificar(actual,{orden:actual.orden});}catch{throw new Error("No se pudo recuperar el orden original. Actualiza el listado.");}throw error;}
      await refrescar();mensaje("Orden actualizado correctamente.");
    });
  }
  async function visibilidad(item){
    await ejecutar(async()=>{
      await modificar(item,{visible:!item.visible});
      await refrescar();mensaje(item.visible?"Recurso ocultado.":"Recurso marcado como visible para la futura sección pública.");
    });
  }
  async function eliminar(item){
    if(!window.confirm('¿Eliminar definitivamente el recurso "'+item.titulo+'"? Esta acción no se puede deshacer.'))return;
    await ejecutar(async()=>{
      const result=await consultar("eva_recursos_destacados?id=eq."+encodeURIComponent(item.id),{
        method:"DELETE",headers:{Prefer:"return=representation"}
      });
      if(!Array.isArray(result)||result.length!==1)throw new Error("No se confirmó la eliminación.");
      await refrescar();limpiarFormulario();mensaje("Recurso eliminado.");
    });
  }
  function iniciar(){
    if(iniciado)return;iniciado=true;
    for(const id of ["destacados-modulo","destacados-titulo","destacados-descripcion","destacados-visible"]){
      $(id).addEventListener("input",actualizarPreview);$(id).addEventListener("change",actualizarPreview);
    }
    $("destacados-nuevo").addEventListener("click",()=>{limpiarFormulario();$("destacados-modulo").focus();});
    $("destacados-recargar").addEventListener("click",()=>ejecutar(async()=>{await refrescar();mensaje("Listado actualizado.");}));
    $("destacados-form").addEventListener("submit",event=>{
      event.preventDefault();
      ejecutar(async()=>{
        const id=$("destacados-id").value.trim(),modulo=$("destacados-modulo").value;
        if(!Object.hasOwn(origenes,modulo))throw new Error("Selecciona uno de los seis módulos oficiales.");
        const payload={
          modulo,
          titulo:$("destacados-titulo").value.trim(),
          descripcion:$("destacados-descripcion").value.trim(),
          enlace_url:urlOficial($("destacados-enlace").value.trim(),modulo),
          imagen_url:imagenOficial($("destacados-imagen").value.trim()),
          visible:$("destacados-visible").checked
        };
        if(!payload.titulo||!payload.descripcion)throw new Error("Completa el título y la descripción.");
        if(!id)payload.orden=recursos.length?Math.max(...recursos.map(x=>Number(x.orden)))+1:1;
        const result=await consultar("eva_recursos_destacados"+(id?"?id=eq."+encodeURIComponent(id):""),{
          method:id?"PATCH":"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)
        });
        if(!Array.isArray(result)||result.length!==1)throw new Error("No se confirmó el guardado.");
        await refrescar();limpiarFormulario();mensaje(id?"Recurso actualizado.":"Recurso registrado.");
      });
    });
    limpiarFormulario();
  }
  window.EvaDestacadosAdmin={
    configurar(p){perfil=p;},
    limpiar(){perfil=null;recursos=[];if(iniciado){$("destacados-listado").replaceChildren();$("destacados-orden").replaceChildren();limpiarFormulario();mensaje("");}},
    async cargar(){exigir();iniciar();await refrescar();mensaje("");}
  };
})();