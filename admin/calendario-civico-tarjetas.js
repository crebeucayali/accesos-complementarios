(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const auth=window.EvaAdminSession;
  const API="https://dteimbhwtzghhsijeeld.supabase.co";
  const KEY="sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const DATA_URL="../recursos/calendario-civico.json";
  const root=$("cal-admin-civico");
  if(!root||!auth)return;
  let autorizado=false,editable=false,activado=false,eventos=[],guardados=new Map(),foto=null,previewUrl="",imagenGuardada="",quitada=false,guardando=false,revision=0;
  const key=x=>x.fecha+"|"+x.titulo;
  const label=(id,value)=>{const e=$(id);if(e)e.textContent=value||"";};
  const validUrl=url=>typeof url==="string"&&/^https:\/\/dteimbhwtzghhsijeeld\.supabase\.co\/storage\/v1\/object\/public\/eva-publico\/calendario\/civico\/[a-z0-9._/-]+\.(webp|jpe?g|png)$/i.test(url);
  const selected=()=>{
    const i=$("cal-civico-seleccion").value;
    return i===""?null:eventos[Number(i)]||null;
  };
  const resumen=x=>{
    const f=x.ficha||{};
    const m=String(f.motivo||x.descripcion||"").trim();
    const a=String(f.antecedentes||"").trim();
    return (m+(a?"\n\n"+a:"")).slice(0,1400);
  };
  function revoke(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl="";}}
  function preview(){
    const x=selected();
    const content=$("cal-civico-contenido").value.trim();
    if(x)label("cal-civico-previa-descripcion",content);
    const img=$("cal-civico-previa-imagen");
    const url=previewUrl||(quitada?"":validUrl(imagenGuardada)?imagenGuardada:"");
    if(url){img.src=url;img.alt=$("cal-civico-imagen-alt").value.trim()||"Imagen pendiente de descripción";img.hidden=false;}
    else {img.removeAttribute("src");img.hidden=true;}
  }
  function fill(){
    const x=selected(),saved=x?guardados.get(key(x)):null;
    revoke();foto=null;quitada=false;$("cal-civico-imagen").value="";
    imagenGuardada=validUrl(saved?.imagen_url)?saved.imagen_url:"";
    $("cal-civico-contenido").value=x?String(saved?.contenido||resumen(x)):"";
    $("cal-civico-imagen-alt").value=saved?.imagen_alt||"";
    $("cal-civico-prioridad").value=saved?.prioridad===2?"secundaria":"principal";
    $("cal-civico-mostrar").checked=saved?.visible??true;
    label("cal-civico-imagen-estado",imagenGuardada?"Imagen guardada para esta fecha.":"Ninguna imagen asociada.");
    preview();
  }
  async function load(){
    if(!autorizado||!root||root.hidden)return;
    const token=++revision;
    try{
      const response=await fetch(DATA_URL,{cache:"no-store"});
      if(!response.ok)throw Error("No fue posible cargar fechas.");
      const data=await response.json();
      if(!autorizado||token!==revision)return;
      eventos=Array.isArray(data.registros)?data.registros.filter(e=>typeof e.fecha==="string"&&typeof e.titulo==="string"):[];
      eventos.sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.titulo.localeCompare(b.titulo,"es"));
      if(editable){
        const results=await auth.request("calendario_civico_tarjetas?select=clave,fecha,titulo,contenido,imagen_url,imagen_alt,prioridad,visible&order=fecha.asc",{method:"GET"});
        if(!autorizado||token!==revision)return;
        guardados=new Map((Array.isArray(results)?results:[]).map(x=>[x.clave,x]));
      }
      activado=true;fill();
    }catch(error){label("cal-civico-imagen-estado","No se pudieron consultar los datos guardados: "+(error.message||"Error de conexión"));}
  }
  function imageChange(){
    const f=$("cal-civico-imagen").files?.[0]||null;
    if(f&&(!["image/webp","image/png","image/jpeg"].includes(f.type)||f.size>5*1024*1024)){
      $("cal-civico-imagen").value="";label("cal-civico-imagen-estado","Selecciona WebP, JPG o PNG (máximo 5 MB).");return;
    }
    revoke();foto=f;quitada=false;
    if(f)previewUrl=URL.createObjectURL(f);
    label("cal-civico-imagen-estado",f?"La imagen se subirá cuando guardes.":imagenGuardada?"Imagen guardada.":"Ninguna imagen.");
    preview();
  }
  async function upload(file,x){
    const sesion=await auth.ensureSession();
    if(!sesion?.access_token)throw Error("Sesión no disponible para subir imágenes.");
    const ext={"image/webp":"webp","image/png":"png","image/jpeg":"jpg"}[file.type];
    if(!ext||file.size>5*1024*1024)throw Error("Formato o tamaño de archivo no válido.");
    const path="calendario/civico/"+x.fecha+"/"+crypto.randomUUID()+"."+ext;
    const response=await fetch(API+"/storage/v1/object/eva-publico/"+path,{
      method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+sesion.access_token,"Content-Type":file.type,"x-upsert":"false"},
      body:file,credentials:"omit"
    });
    if(!response.ok)throw Error("No se pudo cargar la imagen: HTTP "+response.status);
    return API+"/storage/v1/object/public/eva-publico/"+path;
  }
  async function save(){
    if(!editable||guardando||!auth)return;
    const x=selected();if(!x){label("cal-civico-imagen-estado","Selecciona una fecha.");return;}
    const contenido=$("cal-civico-contenido").value.trim(),alt=$("cal-civico-imagen-alt").value.trim();
    if(contenido.length<20||contenido.length>1400){label("cal-civico-imagen-estado","El texto debe tener entre 20 y 1400 caracteres.");return;}
    if((foto||(!quitada&&imagenGuardada))&&(alt.length<8||alt.length>220)){label("cal-civico-imagen-estado","La imagen requiere una descripción de 8 a 220 caracteres.");return;}
    guardando=true;$("cal-civico-guardar").disabled=true;
    label("cal-civico-imagen-estado","Verificando sesión y guardando...");
    try{
      await auth.ensureSession();
      const p=await auth.request("rpc/perfil_panel_admin",{method:"POST",body:"{}"});
      const perfil=Array.isArray(p)?p[0]:p;
      if(!perfil?.autorizado||perfil.rol!=="master"||perfil.aal!=="aal2")throw Error("Se requiere rol master con MFA AAL2.");
      let imagen=quitada?null:imagenGuardada||null;
      if(foto)imagen=await upload(foto,x);
      const prioridad=$("cal-civico-prioridad").value==="secundaria"?2:1;
      const visible=$("cal-civico-mostrar").checked;
      await auth.request("rpc/admin_guardar_tarjeta_civica",{method:"POST",body:JSON.stringify({
        p_clave:key(x),p_fecha:x.fecha,p_titulo:x.titulo,p_categoria:x.categoria,
        p_contenido:contenido,p_imagen_url:imagen,p_imagen_alt:imagen?alt:null,
        p_prioridad:prioridad,p_visible:visible
      })});
      guardados.set(key(x),{clave:key(x),contenido,imagen_url:imagen,imagen_alt:imagen?alt:null,prioridad,visible});
      fill();
      label("cal-civico-imagen-estado",visible?"Guardado. Se mostrará en la portada únicamente el día de esta conmemoración.":"Guardado como no visible.");
    }catch(error){label("cal-civico-imagen-estado","No se guardó: "+(error.message||"Error"));}
    finally{guardando=false;$("cal-civico-guardar").disabled=false;}
  }
  $("cal-civico-seleccion").addEventListener("change",fill);
  $("cal-civico-listado").addEventListener("click",()=>queueMicrotask(fill));
  $("cal-tab-civico").addEventListener("click",()=>{if(autorizado)load();});
  $("cal-civico-contenido").addEventListener("input",preview);
  $("cal-civico-imagen-alt").addEventListener("input",preview);
  $("cal-civico-imagen").addEventListener("change",imageChange);
  $("cal-civico-prioridad").addEventListener("change",preview);
  $("cal-civico-previa-boton").addEventListener("click",preview);
  $("cal-civico-quitar-imagen").addEventListener("click",()=>{
    revoke();foto=null;quitada=true;imagenGuardada="";
    $("cal-civico-imagen").value="";$("cal-civico-imagen-alt").value="";
    label("cal-civico-imagen-estado","Imagen retirada de la propuesta; guarda para confirmar.");
    preview();
  });
  $("cal-civico-guardar").addEventListener("click",save);
  function clear(){
    ++revision;autorizado=false;editable=false;activado=false;eventos=[];guardados.clear();
    revoke();foto=null;imagenGuardada="";quitada=false;
    $("cal-civico-contenido").value="";$("cal-civico-imagen").value="";$("cal-civico-imagen-alt").value="";
    $("cal-civico-guardar").hidden=true;
    preview();
  }
  window.EvaCalendarioCivicoTarjetas=Object.freeze({
    configurar(perfil){
      if(!perfil?.autorizado){clear();return;}
      const nuevo=perfil.rol==="master"&&perfil.aal==="aal2";
      if(editable!==nuevo){activado=false;guardados.clear();}
      autorizado=true;editable=nuevo;
      $("cal-civico-guardar").hidden=!editable;
      for(const id of ["cal-civico-contenido","cal-civico-imagen","cal-civico-imagen-alt","cal-civico-quitar-imagen","cal-civico-prioridad","cal-civico-mostrar"])$(id).disabled=!editable;
    },
    limpiar:clear
  });
})();