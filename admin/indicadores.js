(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const auth=window.EvaAdminSession;
  let perfil=null,filas=[],busy=false,initialized=false,fondoActual="",fondos=[],ocupadoFondo=false;
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
  const baseFondo="https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/indicadores/";
  const validarUrlFondo=url=>typeof url==="string" && url.startsWith(baseFondo) && /^https:\/\/dteimbhwtzghhsijeeld\.supabase\.co\/storage\/v1\/object\/public\/eva-publico\/indicadores\/[a-zA-Z0-9_./-]+\.webp$/.test(url);
  const informarFondo=(mensaje,error=false)=>{
    const el=$("indicadores-fondo-estado");
    el.textContent=mensaje;
    el.style.color=error?"#a12222":"";
  };
  const ejecutarFondo=async accion=>{
    if(ocupadoFondo)return;
    ocupadoFondo=true;renderFondos();
    try{await accion();}
    catch(error){informarFondo(error.message||"No se pudo realizar la operación.",true);}
    finally{ocupadoFondo=false;renderFondos();}
  };
  function renderFondos(){
    const grid=$("indicadores-fondos-grid");
    if(!grid)return;
    grid.replaceChildren();
    const ubicados=new Map(fondos.map(f=>[Number(f.posicion),f]));
    for(let i=1;i<=5;i++){
      const fila=ubicados.get(i);
      const articulo=document.createElement("article");
      articulo.className="indicadores-fondo-item";
      const titulo=document.createElement("strong");
      titulo.textContent="Imagen "+i;
      articulo.append(titulo);
      if(fila){
        const img=document.createElement("img");
        img.src=fila.imagen_url;img.alt="Vista previa de "+fila.nombre;img.loading="lazy";
        const nombre=document.createElement("p");
        nombre.textContent=fila.nombre;
        const activa=fondoActual===fila.imagen_url;
        const estado=document.createElement("span");
        estado.className="indicadores-fondo-insignia";
        estado.textContent=activa?"Publicada en EVA":"Guardada, sin publicar";
        const acciones=document.createElement("div");
        acciones.className="indicadores-fondo-acciones";
        acciones.append(
          boton(activa?"Publicada":"Publicar en EVA",()=>activarFondo(fila),ocupadoFondo||activa),
          boton("Eliminar de galería",()=>eliminarFondo(fila),ocupadoFondo)
        );
        articulo.append(img,nombre,estado,acciones);
      }else{
        const vacia=document.createElement("p");
        vacia.textContent="Espacio disponible para una fotografía WebP.";
        articulo.append(vacia);
      }
      grid.append(articulo);
    }
    $("indicadores-fondo-capacidad").textContent=fondos.length+" de 5 imágenes guardadas.";
    $("indicadores-fondo-publicar").disabled=ocupadoFondo||fondos.length===5;
    $("indicadores-fondo-quitar").disabled=ocupadoFondo||!fondoActual;
    $("indicadores-fondo-recargar").disabled=ocupadoFondo;
    $("indicadores-fondo-archivo").disabled=ocupadoFondo||fondos.length===5;
  }
  function validarArchivo(file){
    if(!file || file.type!=="image/webp" || !/\.webp$/i.test(file.name))throw new Error("Solo se permiten imágenes WebP.");
    if(!file.size || file.size>5*1024*1024)throw new Error("Cada imagen WebP debe pesar como máximo 5 MB.");
    return file;
  }
  async function guardarFondo(url){
    const result=await solicitar("eva_indicadores_config?id=eq.1",{
      method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({fondo_url:url})
    });
    if(!Array.isArray(result)||result.length!==1)throw new Error("No se confirmó el cambio de imagen publicada.");
    fondoActual=url||"";
  }
  async function cargarGaleria(){
    const [lista,config]=await Promise.all([
      solicitar("eva_indicadores_fondos?select=posicion,imagen_url,nombre,creado_en&order=posicion.asc"),
      solicitar("eva_indicadores_config?select=fondo_url&id=eq.1")
    ]);
    if(!Array.isArray(lista)||!Array.isArray(config))throw new Error("No se pudo recuperar la galería.");
    fondos=lista.filter(f=>Number.isInteger(Number(f.posicion))&&validarUrlFondo(f.imagen_url));
    fondoActual=validarUrlFondo(config[0]?.fondo_url)?config[0].fondo_url:"";
    renderFondos();
  }
  async function activarFondo(fila){
    await ejecutarFondo(async()=>{
      if(!window.confirm("¿Publicar esta imagen de fondo en EVA hasta que la cambies manualmente?"))return;
      await guardarFondo(fila.imagen_url);
      informarFondo("Imagen "+fila.posicion+" publicada. Permanecerá activa hasta que la cambies.");
    });
  }
  async function eliminarFondo(fila){
    await ejecutarFondo(async()=>{
      if(!window.confirm("¿Quitar la imagen "+fila.posicion+" de la galería? El archivo almacenado se conservará."))return;
      if(fondoActual===fila.imagen_url)await guardarFondo(null);
      const result=await solicitar("eva_indicadores_fondos?posicion=eq."+fila.posicion,{
        method:"DELETE",headers:{Prefer:"return=representation"}
      });
      if(!Array.isArray(result)||result.length!==1)throw new Error("No se confirmó la eliminación de la imagen.");
      await cargarGaleria();
      informarFondo("Imagen retirada de la galería.");
    });
  }
  async function subirFondos(){
    await ejecutarFondo(async()=>{
      const archivos=Array.from($("indicadores-fondo-archivo").files||[]);
      if(!archivos.length)throw new Error("Selecciona al menos una imagen WebP.");
      if(archivos.length>5-fondos.length)throw new Error("Solo quedan "+(5-fondos.length)+" espacios. Selecciona menos imágenes.");
      archivos.forEach(validarArchivo);
      const sesion=auth.getSession();
      if(!sesion?.access_token)throw new Error("La sesión administrativa expiró. Vuelve a iniciar sesión.");
      const ocupados=new Set(fondos.map(f=>Number(f.posicion)));
      let completados=0;
      try{
        for(const file of archivos){
          const slot=[1,2,3,4,5].find(n=>!ocupados.has(n));
          if(!slot)break;
          const id=(window.crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+Math.random().toString(36).slice(2,10));
          const ruta="indicadores/fondo-"+id+".webp";
          const respuesta=await fetch("https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/eva-publico/"+ruta,{
            method:"POST",headers:{
              apikey:"sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq",
              Authorization:"Bearer "+sesion.access_token,
              "Content-Type":"image/webp","x-upsert":"false"
            },body:file,cache:"no-store"
          });
          if(!respuesta.ok)throw new Error("No se pudo cargar "+file.name+" (HTTP "+respuesta.status+").");
          const registro={
            posicion:slot,imagen_url:baseFondo+ruta.slice("indicadores/".length),
            nombre:file.name.slice(0,120)
          };
          const guardado=await solicitar("eva_indicadores_fondos",{
            method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(registro)
          });
          if(!Array.isArray(guardado)||guardado.length!==1)throw new Error("La imagen se subió, pero no se pudo registrar en la galería.");
          ocupados.add(slot);completados++;
        }
      }finally{
        await cargarGaleria();
        $("indicadores-fondo-archivo").value="";
        if(completados)informarFondo(completados+" imagen(es) guardadas. Elige «Publicar en EVA» para activar una.");
      }
    });
  }
  async function quitarFondo(){
    await ejecutarFondo(async()=>{
      if(!window.confirm("¿Quitar el fondo de EVA? Las cinco imágenes guardadas se conservarán."))return;
      await guardarFondo(null);
      informarFondo("Fondo desactivado. Las imágenes siguen disponibles.");
    });
  }
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
      fondoActual=validarUrlFondo(config[0].fondo_url)?config[0].fondo_url:"";
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
    $("indicadores-fondo-publicar").addEventListener("click",subirFondos);
    $("indicadores-fondo-quitar").addEventListener("click",quitarFondo);
    $("indicadores-fondo-recargar").addEventListener("click",()=>ejecutarFondo(async()=>{await cargarGaleria();informarFondo("Galería actualizada.");}));
    limpiarFormulario();
  }
  window.EvaIndicadoresAdmin={
    configurar(value){perfil=value;},
    limpiar(){filas=[];perfil=null;fondos=[];fondoActual="";if(initialized){$("indicadores-fondo-archivo").value="";informarFondo("");renderFondos();$("indicadores-listado").replaceChildren();$("indicadores-orden-listado").replaceChildren();$("indicadores-config-form").reset();limpiarFormulario();aviso("");}},
    async cargar(){requireMaster();init();await refrescar();await cargarGaleria();aviso("");}
  };
})();