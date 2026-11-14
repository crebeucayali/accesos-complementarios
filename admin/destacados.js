(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const auth=window.EvaAdminSession;
  let perfil=null,recursos=[],ocupado=false,iniciado=false;
  let archivoSeleccionado=null, urlLocal="", quitarImagen=false;
  const API="https://dteimbhwtzghhsijeeld.supabase.co";
  const STORAGE_PUBLICO=API+"/storage/v1/object/public/eva-publico/destacados/";
  const KEY="sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const EXT=Object.freeze({"image/webp":"webp","image/jpeg":"jpg","image/png":"png"});
  const SIGLA=Object.freeze({"CAP":"CAP","BDA":"BDA","MEA":"MEA","NI":"NI","RA":"RA","DUA 3.0":"DUA3"});
  const MAX_BYTES=5*1024*1024;
  const origenes={
    CAP:"capacitaciones",BDA:"banco-digital-accesible",MEA:"materiales-educativos-accesibles",
    NI:"accesos-complementarios/lecturas-inclusivas",RA:"banco-digital-accesible/repositorio-accesible","DUA 3.0":"DUA-3.0"
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
    const controles=Array.from($("destacados-form").querySelectorAll("input,textarea,select,button"));
    controles.forEach(c=>{c.disabled=true;});
    try{await funcion();}
    catch(error){mensaje(error.message||"No se completó la operación.",true);}
    finally{
      ocupado=false;
      controles.forEach(c=>{c.disabled=false;});
      actualizarPreview();render();
    }
  }
  function actualizarPreview(){
    $("destacados-preview-modulo").textContent=$("destacados-modulo").value||"Módulo";
    $("destacados-preview-titulo").textContent=$("destacados-titulo").value.trim()||"Título del recurso";
    $("destacados-preview-descripcion").textContent=$("destacados-descripcion").value.trim()||"Descripción del recurso.";
    $("destacados-preview-modulo").parentElement.style.opacity=$("destacados-visible").checked?"1":".75";
    mostrarImagenPreview();
  }
  function limpiarFormulario(){
    liberarUrlLocal();quitarImagen=false;
    $("destacados-form").reset();$("destacados-id").value="";$("destacados-visible").checked=false;
    actualizarPreview();
  }
  function editar(item){
    if(ocupado)return;
    liberarUrlLocal();quitarImagen=false;
    $("destacados-archivo").value="";
    $("destacados-id").value=String(item.id);
    $("destacados-modulo").value=item.modulo;
    $("destacados-titulo").value=item.titulo;
    $("destacados-descripcion").value=item.descripcion;
    $("destacados-enlace").value=item.enlace_url;
    $("destacados-imagen").value=item.imagen_url||"";
    $("destacados-imagen-alt").value=item.imagen_alt||"";
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
    let u;try{u=new URL(valor);}catch{throw Error("La URL de la imagen no es válida.");}
    if(u.protocol!=="https:"||u.username||u.password||u.port)throw Error("La imagen requiere una dirección HTTPS institucional.");
    if(u.hostname==="crebeucayali.github.io"&&u.pathname.startsWith("/"))return u.href;
    const prefix="/storage/v1/object/public/eva-publico/destacados/";
    if(u.hostname==="dteimbhwtzghhsijeeld.supabase.co"&&
       u.pathname.startsWith(prefix)&&!u.search&&!u.hash&&
       /^[A-Za-z0-9_-]+\.(webp|jpe?g|png)$/.test(u.pathname.slice(prefix.length)))return u.href;
    throw Error("Solo se admiten imágenes de GitHub CREBE o Storage EVA /destacados/.");
  }
  function validarArchivo(file){
    if(!file||!Object.hasOwn(EXT,file.type)||file.size<1||file.size>MAX_BYTES)
      throw Error("Selecciona WebP, JPG o PNG de hasta 5 MB.");
    return EXT[file.type];
  }
  function liberarUrlLocal(){
    if(urlLocal)URL.revokeObjectURL(urlLocal);
    urlLocal="";archivoSeleccionado=null;
  }
  function mostrarImagenPreview(){
    const input=$("destacados-imagen").value.trim();
    let src=urlLocal;
    if(!src&&input){try{src=imagenOficial(input);}catch{src="";}}
    const img=$("destacados-preview-imagen");
    if(src){
      if(img.getAttribute("src")!==src)img.src=src;
      img.alt=$("destacados-imagen-alt").value.trim()||"Vista previa de la imagen";
      img.hidden=false;
    }else{img.removeAttribute("src");img.hidden=true;}
    $("destacados-quitar-imagen").disabled=ocupado||!(archivoSeleccionado||input);
    $("destacados-imagen-estado").textContent=archivoSeleccionado
      ?"Imagen seleccionada: "+archivoSeleccionado.name+". Se subirá al guardar."
      :quitarImagen?"La imagen se desvinculará al guardar."
      :input&&!src?"URL no admitida. Usa una imagen institucional."
      :src?"Imagen asociada al recurso.":"Sin imagen (opcional).";
  }
  async function imagenDecodificable(file){
    await new Promise((resolve,reject)=>{
      const tmp=URL.createObjectURL(file),img=new Image();
      const fin=()=>{img.onload=null;img.onerror=null;URL.revokeObjectURL(tmp);};
      img.onload=()=>{const ok=img.naturalWidth>0&&img.naturalHeight>0;fin();ok?resolve():reject(Error("Imagen vacía o dañada."));};
      img.onerror=()=>{fin();reject(Error("No se pudo abrir la imagen seleccionada."));};
      img.src=tmp;
    });
  }
  async function comprobarPermisosCarga(){
    exigir();
    const session=await auth.ensureSession();
    if(!session?.access_token)throw Error("Sesión expirada. Ingresa nuevamente.");
    const response=await consultar("rpc/perfil_panel_admin",{method:"POST",body:"{}"});
    const data=Array.isArray(response)?response[0]:response;
    if(!data?.autorizado||data.rol!=="master"||data.aal!=="aal2")
      throw Error("Solo Master con MFA AAL2 puede cargar imágenes.");
    return session;
  }
  async function subirImagen(file,modulo,session){
    const ext=validarArchivo(file);
    if(typeof crypto.randomUUID!=="function")throw Error("No se dispone de identificadores seguros en este navegador.");
    const path="destacados/"+SIGLA[modulo]+"-"+crypto.randomUUID()+"."+ext;
    const res=await fetch(API+"/storage/v1/object/eva-publico/"+path,{
      method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+session.access_token,
        "Content-Type":file.type,"x-upsert":"false"},
      body:file,credentials:"omit",cache:"no-store"
    });
    if(!res.ok)throw Error("La carga de imagen fue rechazada (HTTP "+res.status+").");
    return {path,url:STORAGE_PUBLICO+path.slice("destacados/".length)};
  }
  async function revertirCargaSinVinculo(subida){
    try{
      const usados=await consultar("eva_recursos_destacados?select=id&imagen_url=eq."+
        encodeURIComponent(subida.url)+"&limit=1");
      if(!Array.isArray(usados)||usados.length)return false;
      const s=await auth.ensureSession();
      if(!s?.access_token||!permitido())return false;
      const r=await fetch(API+"/storage/v1/object/eva-publico/"+subida.path,{
        method:"DELETE",headers:{apikey:KEY,Authorization:"Bearer "+s.access_token},
        credentials:"omit",cache:"no-store"
      });
      return r.ok;
    }catch{return false;}
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
    for(const id of ["destacados-modulo","destacados-titulo","destacados-descripcion","destacados-visible","destacados-imagen-alt"]){
      $(id).addEventListener("input",actualizarPreview);
      $(id).addEventListener("change",actualizarPreview);
    }
    $("destacados-preview-imagen").addEventListener("error",()=>{
      $("destacados-preview-imagen").hidden=true;
      $("destacados-imagen-estado").textContent="No se pudo mostrar la vista previa de esta imagen.";
    });
    $("destacados-archivo").addEventListener("change",()=>{
      liberarUrlLocal();quitarImagen=false;
      const file=$("destacados-archivo").files?.[0];
      if(file){
        try{validarArchivo(file);archivoSeleccionado=file;urlLocal=URL.createObjectURL(file);}
        catch(error){$("destacados-archivo").value="";mensaje(error.message,true);}
      }
      actualizarPreview();
    });
    $("destacados-imagen").addEventListener("input",()=>{
      if(archivoSeleccionado){liberarUrlLocal();$("destacados-archivo").value="";}
      quitarImagen=false;actualizarPreview();
    });
    $("destacados-quitar-imagen").addEventListener("click",()=>{
      if(ocupado)return;
      liberarUrlLocal();
      $("destacados-archivo").value="";
      $("destacados-imagen").value="";
      $("destacados-imagen-alt").value="";
      quitarImagen=true;actualizarPreview();
    });
    $("destacados-nuevo").addEventListener("click",()=>{
      if(ocupado)return;
      limpiarFormulario();$("destacados-modulo").focus();
    });
    $("destacados-recargar").addEventListener("click",()=>ejecutar(async()=>{
      await refrescar();mensaje("Listado actualizado.");
    }));
    $("destacados-form").addEventListener("submit",event=>{
      event.preventDefault();
      ejecutar(async()=>{
        const id=$("destacados-id").value.trim(),modulo=$("destacados-modulo").value;
        if(!Object.hasOwn(origenes,modulo))throw Error("Selecciona uno de los seis módulos oficiales.");
        const file=archivoSeleccionado,anterior=id?recursos.find(x=>String(x.id)===id):null;
        if(id&&!anterior)throw Error("El recurso cambió. Actualiza el listado antes de editar.");
        const payload={
          modulo,
          titulo:$("destacados-titulo").value.trim(),
          descripcion:$("destacados-descripcion").value.trim(),
          enlace_url:urlOficial($("destacados-enlace").value.trim(),modulo),
          imagen_url:file?"":imagenOficial($("destacados-imagen").value.trim()),
          imagen_alt:$("destacados-imagen-alt").value.trim(),
          visible:$("destacados-visible").checked
        };
        if(!payload.titulo||!payload.descripcion)throw Error("Completa título y descripción.");
        if(file)validarArchivo(file);
        if(!file&&!payload.imagen_url)payload.imagen_alt="";
        const historica=anterior&&!file&&payload.imagen_url===anterior.imagen_url&&
          !anterior.imagen_alt&&!payload.imagen_alt&&
          payload.imagen_url.startsWith("https://crebeucayali.github.io/");
        if((file||payload.imagen_url)&&!historica&&
          (payload.imagen_alt.length<8||payload.imagen_alt.length>220))
          throw Error("La imagen requiere una descripción accesible de 8 a 220 caracteres.");
        if(!id)payload.orden=recursos.length?Math.max(...recursos.map(x=>Number(x.orden)))+1:1;
        const session=await comprobarPermisosCarga();
        if(id){
          const remoto=await consultar("eva_recursos_destacados?id=eq."+encodeURIComponent(id)+"&select=id,updated_at");
          if(!Array.isArray(remoto)||remoto.length!==1||remoto[0].updated_at!==anterior.updated_at)
            throw Error("Otro administrador modificó el recurso. Actualiza el listado.");
        }
        if(file)await imagenDecodificable(file);
        let subida=null,guardado=false;
        try{
          if(file){subida=await subirImagen(file,modulo,session);payload.imagen_url=subida.url;}
          exigir();
          const result=await consultar("eva_recursos_destacados"+(id?"?id=eq."+encodeURIComponent(id):""),{
            method:id?"PATCH":"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)
          });
          if(!Array.isArray(result)||result.length!==1)throw Error("No se confirmó el guardado del recurso.");
          guardado=true;
          limpiarFormulario();
          try{
            await refrescar();
            mensaje(id?"Recurso actualizado correctamente.":"Recurso registrado correctamente.");
          }catch{
            mensaje("Recurso guardado. No se actualizó el listado; pulsa «Actualizar listado».",true);
          }
        }catch(error){
          if(subida&&!guardado){
            const eliminado=await revertirCargaSinVinculo(subida);
            if(!eliminado)throw Error((error.message||"Error al guardar")+
              " El archivo subido se conservó por seguridad; revisa Storage antes de reintentar.");
          }
          throw error;
        }
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