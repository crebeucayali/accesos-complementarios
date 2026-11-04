(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const auth=window.EvaAdminSession;
  let perfil=null,integrantes=[],ocupado=false,iniciado=false;
  const autorizado=()=>perfil?.autorizado===true&&perfil.rol==="master"&&perfil.aal==="aal2"&&Boolean(auth?.getSession());
  function exigirAcceso(){if(!autorizado())throw new Error("La administración del directorio requiere una sesión Master con MFA.");}
  async function solicitar(ruta,opciones={}){exigirAcceso();return auth.request(ruta,opciones);}
  const ordenados=()=>integrantes.slice().sort((a,b)=>Number(a.orden)-Number(b.orden)||Number(a.id)-Number(b.id));
  function informar(texto,error=false){
    const salida=$("directorio-mensaje");
    salida.textContent=texto||"";
    salida.className="mensaje"+(error?" error":texto?" exito":"");
  }
  function boton(etiqueta,accion,bloqueado=false){
    const b=document.createElement("button");b.type="button";b.className="secundario";b.textContent=etiqueta;
    b.disabled=ocupado||bloqueado;b.addEventListener("click",accion);return b;
  }
  function dibujar(){
    if(!iniciado)return;
    const tabla=$("directorio-listado"),lista=$("directorio-orden-listado");
    tabla.replaceChildren();lista.replaceChildren();
    const filas=ordenados();
    if(!filas.length){
      const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=3;td.textContent="No hay integrantes registrados.";tr.appendChild(td);tabla.appendChild(tr);return;
    }
    filas.forEach((persona,i)=>{
      const tr=document.createElement("tr");
      const contenido=document.createElement("td");
      const nombre=document.createElement("strong");nombre.textContent=persona.nombre;
      const detalle=document.createElement("span");detalle.className="directorio-contenido-detalle";
      detalle.textContent=persona.area+(persona.correo?" · "+persona.correo:"");
      contenido.append(nombre,detalle);
      const estado=document.createElement("td");estado.textContent=persona.visible?"Publicado":"Oculto";
      const accion=document.createElement("td"),acciones=document.createElement("div");acciones.className="directorio-acciones";
      acciones.append(
        boton("Editar",()=>editar(persona)),
        boton(persona.visible?"Ocultar":"Publicar",()=>visibilidad(persona)),
        boton("Eliminar",()=>eliminar(persona))
      );
      accion.appendChild(acciones);tr.append(contenido,estado,accion);tabla.appendChild(tr);
      const item=document.createElement("li");item.className="directorio-orden-item";
      const titulo=document.createElement("span");titulo.textContent=(i+1)+". "+persona.nombre;
      const moverAcciones=document.createElement("span");moverAcciones.className="directorio-acciones";
      moverAcciones.append(boton("Subir",()=>mover(persona.id,-1),i===0),boton("Bajar",()=>mover(persona.id,1),i===filas.length-1));
      item.append(titulo,moverAcciones);lista.appendChild(item);
    });
  }
  async function refrescar(){
    const datos=await solicitar("eva_directorio_institucional?select=*&order=orden.asc,id.asc");
    if(!Array.isArray(datos))throw new Error("No se pudo obtener el directorio institucional.");
    integrantes=datos;dibujar();
  }
  async function ejecutar(tarea){
    if(ocupado)return;ocupado=true;dibujar();
    try{await tarea();}catch(e){informar(e.message||"No se completó la operación.",true);}
    finally{ocupado=false;dibujar();}
  }
  function limpiarFormulario(){
    $("directorio-form").reset();$("directorio-id").value="";$("directorio-visible").checked=true;
  }
  function editar(persona){
    $("directorio-id").value=String(persona.id);
    $("directorio-nombre").value=persona.nombre;
    $("directorio-area").value=persona.area;
    $("directorio-correo").value=persona.correo||"";
    $("directorio-foto").value=persona.foto||"";
    $("directorio-visible").checked=Boolean(persona.visible);
    $("directorio-editor-titulo").scrollIntoView({block:"start",behavior:"smooth"});
    $("directorio-nombre").focus({preventScroll:true});
  }
  async function modificar(persona,cambios){
    const resultado=await solicitar("eva_directorio_institucional?id=eq."+encodeURIComponent(persona.id),{
      method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(cambios)
    });
    if(!Array.isArray(resultado)||resultado.length!==1)throw new Error("El servidor no confirmó el cambio.");
  }
  async function mover(id,direccion){
    await ejecutar(async()=>{
      const lista=ordenados(),indice=lista.findIndex(p=>String(p.id)===String(id));
      if(indice<0||!lista[indice+direccion])return;
      const a=lista[indice],b=lista[indice+direccion];
      if(!Number.isInteger(Number(a.orden))||!Number.isInteger(Number(b.orden))||Number(a.orden)===Number(b.orden))throw new Error("Hay posiciones duplicadas o incorrectas. Actualiza la lista.");
      const remoto=await solicitar("eva_directorio_institucional?select=id,orden&order=orden.asc,id.asc");
      if(remoto.length!==lista.length||remoto.some((p,i)=>String(p.id)!==String(lista[i].id)||Number(p.orden)!==Number(lista[i].orden)))throw new Error("El orden cambió en otra sesión. Actualiza el listado.");
      await modificar(a,{orden:b.orden});
      try{await modificar(b,{orden:a.orden});}
      catch(error){try{await modificar(a,{orden:a.orden});}catch{throw new Error("No se pudo restablecer el orden original; actualiza el listado.");}throw error;}
      await refrescar();informar("Orden del directorio actualizado.");
    });
  }
  async function visibilidad(persona){
    await ejecutar(async()=>{
      await modificar(persona,{visible:!persona.visible});
      await refrescar();informar(persona.visible?"Integrante ocultado del directorio.":"Integrante publicado.");
    });
  }
  async function eliminar(persona){
    if(!confirm('¿Eliminar definitivamente a "'+persona.nombre+'" del directorio? Esta acción no se puede deshacer.'))return;
    await ejecutar(async()=>{
      const datos=await solicitar("eva_directorio_institucional?id=eq."+encodeURIComponent(persona.id),{
        method:"DELETE",headers:{Prefer:"return=representation"}
      });
      if(!Array.isArray(datos)||datos.length!==1)throw new Error("No se confirmó la eliminación.");
      await refrescar();limpiarFormulario();informar("Integrante eliminado correctamente.");
    });
  }
  function iniciar(){
    if(iniciado)return;iniciado=true;
    $("directorio-recargar").addEventListener("click",()=>ejecutar(async()=>{await refrescar();informar("Listado actualizado.");}));
    $("directorio-nuevo").addEventListener("click",()=>{limpiarFormulario();$("directorio-nombre").focus();});
    $("directorio-form").addEventListener("submit",evento=>{
      evento.preventDefault();
      ejecutar(async()=>{
        const id=$("directorio-id").value.trim();
        const nuevo={
          nombre:$("directorio-nombre").value.trim(),
          area:$("directorio-area").value.trim(),
          correo:$("directorio-correo").value.trim(),
          foto:$("directorio-foto").value.trim(),
          visible:$("directorio-visible").checked
        };
        if(!nuevo.nombre||!nuevo.area)throw new Error("Nombre y área responsable son obligatorios.");
        if(nuevo.foto&&!/^fotos\/[a-z0-9._-]+\.(webp|png|jpe?g)$/i.test(nuevo.foto))throw new Error("La imagen debe utilizar una ruta válida dentro de fotos/.");
        if(nuevo.correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo.correo))throw new Error("Revisa el formato del correo.");
        if(!id)nuevo.orden=integrantes.length?Math.max(...integrantes.map(p=>Number(p.orden)))+1:1;
        const datos=await solicitar("eva_directorio_institucional"+(id?"?id=eq."+encodeURIComponent(id):""),{
          method:id?"PATCH":"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(nuevo)
        });
        if(!Array.isArray(datos)||datos.length!==1)throw new Error("No se confirmó el guardado.");
        await refrescar();limpiarFormulario();informar(id?"Integrante actualizado.":"Integrante agregado.");
      });
    });
  }
  window.EvaDirectorioAdmin={
    configurar(datos){perfil=datos;},
    limpiar(){
      integrantes=[];perfil=null;
      if(iniciado){$("directorio-listado").replaceChildren();$("directorio-orden-listado").replaceChildren();limpiarFormulario();informar("");}
    },
    async cargar(){exigirAcceso();iniciar();await refrescar();informar("");}
  };
})();