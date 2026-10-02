(() => {
  "use strict";
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.get("type")!=="invite") return;
  window.EvaActivacionPendiente=true;
  let token=hash.get("access_token")||"";
  // El token nunca se copia al almacenamiento ni a la sesión del master.
  history.replaceState(null,"",location.pathname+location.search);
  const $=id=>document.getElementById(id);
  const url="https://dteimbhwtzghhsijeeld.supabase.co";
  const key="sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const formulario=$("form-activacion"), mensaje=$("activacion-mensaje");
  $("form-login").closest(".tarjeta").hidden=true;
  $("seccion-activacion").hidden=false;
  $("estado-panel-titulo").textContent="Activación de cuenta";
  $("estado-panel-mensaje").textContent="";
  const headers=()=>({apikey:key,Authorization:"Bearer "+token,"Content-Type":"application/json"});
  async function solicitud(path,opciones={}) {
    const response=await fetch(url+path,{...opciones,headers:headers(),signal:AbortSignal.timeout(12000)});
    const data=await response.json();
    if(!response.ok) throw new Error("El enlace no pudo validarse. Solicita al master que revise la invitación.");
    return data;
  }
  async function preparar() {
    try {
      if(!token) throw new Error("La invitación no contiene una sesión válida.");
      const user=await solicitud("/auth/v1/user");
      const profile=await solicitud("/rest/v1/rpc/perfil_panel_admin",{method:"POST",body:"{}"});
      if(!profile.autorizado || !["editor","consulta"].includes(profile.rol) || profile.user_id!==user.id) {
        throw new Error("Esta cuenta no tiene una autorización de publicación o consulta activa.");
      }
      mensaje.textContent="Cuenta: "+profile.email+". Define tu contraseña para continuar.";
      formulario.hidden=false;
    } catch(error) { token=""; mensaje.textContent=error.message; }
  }
  formulario.addEventListener("submit",async evento=>{
    evento.preventDefault();
    const boton=formulario.querySelector("button"); if(boton.disabled || !token) return;
    try {
      const password=$("activacion-clave").value;
      if(password.length<12 || password!==$("activacion-confirmacion").value) throw new Error("Las contraseñas deben coincidir y tener al menos 12 caracteres.");
      boton.disabled=true;
      await solicitud("/auth/v1/user",{method:"PUT",body:JSON.stringify({password})});
      // Revoca esta sesión de activación; el publicador ingresará con correo y contraseña.
      try { await fetch(url+"/auth/v1/logout?scope=local",{method:"POST",headers:headers(),signal:AbortSignal.timeout(12000)}); } catch {}
      token=""; formulario.hidden=true; mensaje.textContent="Contraseña guardada. Ve al acceso administrativo e inicia sesión con tu correo y contraseña.";
    } catch(error) { mensaje.textContent=error.message; }
    finally { $("activacion-clave").value=""; $("activacion-confirmacion").value=""; boton.disabled=false; }
  });
  preparar();
})();
