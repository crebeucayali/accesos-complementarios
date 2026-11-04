(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const auth=window.EvaAdminSession;
  let perfil=null,filas=[],busy=false,initialized=false;
  const permitido=()=>perfil?.autorizado===true && perfil.rol==="master" && perfil.aal==="aal2";
  const requireMaster=()=>{if(!permitido()||!auth?.getSession())throw new Error("Esta función requiere una sesión Master con MFA.");};
  const solicitar=async(path,options={})=>{
    requireMaster();
    return auth.request(path,options);
  };
  const aviso=(text,error=false)=>{
    const el=$("indicadores-mensaje");if(!el)return;
    el.textContent=text||"";el.className="mensaje"+(error?" error":text?" exito":"");
  };
  const actualizarPreview=()=>{
    $("indicador-preview-cifra").textContent=$("indicador-cifra").value.trim()||"150+";
    $("indicador-preview-titulo").textContent=$("indicador-titulo").value.trim()||"Título del indicador";
    $("indicador-preview-descripcion").textContent=$("indicador-descripcion").value.trim()||"Descripción del indicador.";
    $("indicador-preview-cifra").parentElement.style.opacity=$("indicador-visible").checked?"1":".55";
  };
  const limpiarFormulario=()=>{
    $("indicadores-form").reset();$("indicador-id").value="";$("indicador-visible").checked=true;actualizarPreview();
  };
  const ordenar=(datos)=>datos.slice().sort((a,b)=>Number(a.orden)-Number(b.orden)||Number(a.id)-Number(b.id));
  const boton=(texto,accion,deshabilitado=false)=>{
    const el=document.createElement("button");el.type="button";el.className="secundario";
    el.textContent=texto;el.disabled=busy||deshabilitado;el.addEventListener("click",accion);return el;
  };
  function render(){
    const cuerpo=$("indicadores-listado");
    const listaOrden=$("indicadores-orden-listado");
    cuerpo.replaceChildren();
    listaOrden.replaceChildren();
    const ordenadas=ordenar(filas);
    if(!ordenadas.length){
      const fila=document.createElement("tr"),celda=document.createElement("td");
      celda.colSpan=3;celda.textContent="No hay indicadores registrados.";
      fila.appendChild(celda);cuerpo.appendChild(fila);
      return;
    }
    ordenadas.forEach((fila,i)=>{
      const tr=document.createElement("tr");
      const contenido=document.createElement("td");
      const titulo=document.createElement("strong");
      titulo.textContent=fila.cifra+" · "+fila.titulo;
      const descripcion=document.createElement("p");
      descripcion.className="indicadores-descripcion-lista";
      descripcion.textContent=fila.descripcion;
      contenido.append(titulo,descripcion);
      const estado=document.createElement("td");
      estado.textContent=fila.visible?"Publicado":"Oculto";
      const accion=document.createElement("td");
      const botones=document.createElement("div");
      botones.className="indicadores-acciones";
      botones.append(
        boton("Editar",()=>editar(fila)),
        boton(fila.visible?"Ocultar":"Publicar",()=>cambiarVisible(fila)),
        boton("Eliminar",()=>eliminar(fila))
      );
      accion.appendChild(botones);
      tr.append(contenido,estado,accion);cuerpo.appendChild(tr);

      const li=document.createElement("li");
      li.className="indicadores-item";
      const info=document.createElement("span");
      info.className="indicadores-item-info";
      info.textContent=(i+1)+". "+fila.cifra+" · "+fila.titulo;
      const ordenAcciones=document.createElement("span");
      ordenAcciones.className="indicadores-acciones";
      ordenAcciones.append(
        boton("Subir",()=>mover(fila.id,-1),i===0),
        boton("Bajar",()=>mover(fila.id,1),i===ordenadas.length-1)
      );
      li.append(info,ordenAcciones);listaOrden.appendChild(li);
    });
  }
  const refrescar=async()=>{
    const [config,items]=await Promise.all([
      solicitar("eva_indicadores_config?select=*&id=eq.1"),
      solicitar("eva_indicadores_institucionales?select=*&order=orden.asc,id.asc")
    ]);
    if(!Array.isArray(items))throw new Error("No se pudo cargar el listado de indicadores.");
    filas=items;
    if(Array.isArray(config)&&config[0]){
      $("indicadores-etiqueta").value=config[0].etiqueta;
      $("indicadores-titulo").value=config[0].titulo;
      $("indicadores-descripcion").value=config[0].descripcion;
    }
    render();
  };
  async function ejecutar(fn){
    if(busy)return;busy=true;render();
    try{await fn();}catch(e){aviso(e.message||"No se pudo completar la operación.",true);}
    finally{busy=false;render();}
  }
  function editar(fila){
    $("indicador-id").value=String(fila.id);
    $("indicador-cifra").value=fila.cifra;
    $("indicador-titulo").value=fila.titulo;
    $("indicador-descripcion").value=fila.descripcion;
    $("indicador-visible").checked=Boolean(fila.visible);
    actualizarPreview();
    $("indicador-cifra").focus();
    $("indicadores-editor-titulo").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function modificar(fila,patch){
    const out=await solicitar("eva_indicadores_institucionales?id=eq."+encodeURIComponent(fila.id),{
      method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)
    });
    if(!Array.isArray(out)||out.length!==1)throw new Error("No se confirmó la actualización del indicador.");
  }
  async function mover(id,delta){
    await ejecutar(async()=>{
      const ordenadas=ordenar(filas),i=ordenadas.findIndex(f=>String(f.id)===String(id)),a=ordenadas[i],b=ordenadas[i+delta];
      if(!a||!b)return;
      const actual=Number(a.orden),otro=Number(b.orden);
      if(!Number.isInteger(actual)||!Number.isInteger(otro)||actual===otro)throw new Error("Hay posiciones duplicadas o inválidas. Actualiza el listado.");
      const remotas=await solicitar("eva_indicadores_institucionales?select=id,orden&order=orden.asc,id.asc");
      if(remotas.length!==ordenadas.length||remotas.some((f,j)=>String(f.id)!==String(ordenadas[j].id)||Number(f.orden)!==Number(ordenadas[j].orden)))throw new Error("El orden cambió en otra sesión. Actualiza antes de reordenar.");
      await modificar(a,{orden:otro});
      try{await modificar(b,{orden:actual});}
      catch(error){try{await modificar(a,{orden:actual});}catch{throw new Error("No se pudo restablecer el orden anterior. Actualiza la lista.");}throw error;}
      await refrescar();aviso("Orden actualizado correctamente.");
    });
  }
  async function cambiarVisible(fila){
    await ejecutar(async()=>{
      await modificar(fila,{visible:!fila.visible});
      await refrescar();aviso(fila.visible?"Indicador ocultado.":"Indicador publicado.");
    });
  }
  async function eliminar(fila){
    if(!window.confirm('¿Eliminar definitivamente el indicador "'+fila.titulo+'"? Esta acción no se puede deshacer.'))return;
    await ejecutar(async()=>{
      const out=await solicitar("eva_indicadores_institucionales?id=eq."+encodeURIComponent(fila.id),{method:"DELETE",headers:{Prefer:"return=representation"}});
      if(!Array.isArray(out)||out.length!==1)throw new Error("No se confirmó la eliminación.");
      await refrescar();limpiarFormulario();aviso("Indicador eliminado.");
    });
  }
  function init(){
    if(initialized)return;initialized=true;
    for(const id of ["indicador-cifra","indicador-titulo","indicador-descripcion","indicador-visible"]){
      $(id).addEventListener("input",actualizarPreview);
      $(id).addEventListener("change",actualizarPreview);
    }
    $("indicador-nuevo").addEventListener("click",()=>{limpiarFormulario();$("indicador-cifra").focus();});
    $("indicadores-recargar").addEventListener("click",()=>ejecutar(async()=>{await refrescar();aviso("Listado actualizado.");}));
    $("indicadores-config-form").addEventListener("submit",e=>{
      e.preventDefault();ejecutar(async()=>{
        const payload={
          etiqueta:$("indicadores-etiqueta").value.trim(),
          titulo:$("indicadores-titulo").value.trim(),
          descripcion:$("indicadores-descripcion").value.trim()
        };
        if(!payload.etiqueta||!payload.titulo||!payload.descripcion)throw new Error("Completa todos los campos del encabezado.");
        const out=await solicitar("eva_indicadores_config?id=eq.1",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)});
        if(!Array.isArray(out)||out.length!==1)throw new Error("No se confirmó el cambio del encabezado.");
        await refrescar();aviso("Encabezado actualizado.");
      });
    });
    $("indicadores-form").addEventListener("submit",e=>{
      e.preventDefault();ejecutar(async()=>{
        const id=$("indicador-id").value.trim(),payload={
          cifra:$("indicador-cifra").value.trim(),
          titulo:$("indicador-titulo").value.trim(),
          descripcion:$("indicador-descripcion").value.trim(),
          visible:$("indicador-visible").checked
        };
        if(!payload.cifra||!payload.titulo||!payload.descripcion)throw new Error("Completa cifra, título y descripción.");
        const path="eva_indicadores_institucionales"+(id?"?id=eq."+encodeURIComponent(id):"");
        if(!id)payload.orden=filas.length?Math.max(...filas.map(f=>Number(f.orden)))+1:1;
        const result=await solicitar(path,{method:id?"PATCH":"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)});
        if(!Array.isArray(result)||result.length!==1)throw new Error("No se confirmó el guardado.");
        await refrescar();limpiarFormulario();aviso(id?"Indicador actualizado.":"Indicador agregado.");
      });
    });
    limpiarFormulario();
  }
  window.EvaIndicadoresAdmin={
    configurar(value){perfil=value;},
    limpiar(){filas=[];perfil=null;if(initialized){$("indicadores-listado").replaceChildren();$("indicadores-orden-listado").replaceChildren();$("indicadores-config-form").reset();limpiarFormulario();aviso("");}},
    async cargar(){requireMaster();init();await refrescar();aviso("");}
  };
})();