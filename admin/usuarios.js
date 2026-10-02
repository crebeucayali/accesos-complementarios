(() => {
  "use strict";
  const auth = window.EvaAdminSession;
  const $ = id => document.getElementById(id);
  const URL_SUPABASE = "https://dteimbhwtzghhsijeeld.supabase.co";
  const invitacionesPausadas = false;
  const PUBLIC_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const modulos = {capacitaciones:"Capacitaciones",calendario:"Calendario",noticias:"Noticias",galeria:"Galería",repositorio:"Repositorio Accesible"};
  let perfil = null, version = 0, usuarios = [], seleccionado = null, cargando = false;
  const esMaster = () => perfil?.rol === "master" && perfil.autorizado && perfil.aal === "aal2"
    && auth?.getSession()?.user?.id === perfil.user_id;
  function mensaje(texto,tipo="") { $("usuarios-mensaje").textContent=texto; $("usuarios-mensaje").className="mensaje"+(tipo?" "+tipo:""); }
  function exigeMaster() { if (!esMaster()) throw new Error("Se requiere la cuenta master con verificación en dos pasos."); }
  function opciones(id) {
    const campo = $(id);
    for (const [codigo,nombre] of Object.entries(modulos)) {
      const label=document.createElement("label"), input=document.createElement("input");
      label.className="check";
      input.type="checkbox"; input.value=codigo; input.name=id; label.append(input,document.createTextNode(" "+nombre)); campo.append(label);
    }
  }
  function asignados(id) { return Array.from($(id).querySelectorAll("input:checked")).map(input=>input.value); }
  function fecha(texto) { return texto ? new Date(texto).toLocaleString("es-PE",{timeZone:"America/Lima"}) : "Sin registro previo"; }
  function pintar() {
    const cuerpo=$("usuarios-listado"); cuerpo.replaceChildren();
    for (const usuario of usuarios) {
      const fila=document.createElement("tr");
      const estado=!usuario.activo?"Inactivo":usuario.pendiente?"Pendiente de invitación":usuario.confirmado?"Activo":"Pendiente de activación";
      const columnas=[
        ["Nombre",usuario.nombre],
        ["Correo",usuario.email],
        ["Rol",({editor:"Publicador",consulta:"Consulta",master:"Master"})[usuario.rol] || usuario.rol],
        ["Estado",estado],
        ["Módulos",usuario.rol==="master"?"Todos":usuario.modulos.map(c=>modulos[c]||c).join(", ")||"Sin módulos"],
        ["Última modificación",fecha(usuario.ultima_modificacion||usuario.actualizado_at)
          + (usuario.ultimos_eventos?.length ? " · " + usuario.ultimos_eventos.join(", ").replaceAll("_"," ") : "")]
      ];
      for (const [etiqueta,valor] of columnas) {
        const celda=document.createElement("td"); celda.dataset.label=etiqueta; celda.textContent=valor; fila.append(celda);
      }
      const accion=document.createElement("td"); accion.dataset.label="Acción";
      if (usuario.rol==="master") accion.textContent="Cuenta protegida";
      else {
        const boton=document.createElement("button"); boton.type="button"; boton.textContent="Editar";
        boton.addEventListener("click",()=>editar(usuario)); accion.append(boton);
        if (!invitacionesPausadas && usuario.pendiente && usuario.activo && usuario.rol==="editor") {
          const invitar=document.createElement("button"); invitar.type="button"; invitar.textContent="Enviar invitación";
          invitar.addEventListener("click",()=>enviarInvitacion(usuario.email,usuario.nombre,usuario.modulos,invitar).catch(error=>mensaje(error.message,"error")));
          accion.append(invitar);
        }
      }
      fila.append(accion); cuerpo.append(fila);
    }
    if (!usuarios.length) mensaje("No se encontraron usuarios autorizados.");
  }
  async function cargar() {
    exigeMaster();
    if (cargando) return;
    const revision=version; cargando=true; $("usuarios-recargar").disabled=true;
    try {
      const datos=await auth.request("rpc/admin_listar_usuarios",{method:"POST",body:"{}"});
      if (revision!==version || !esMaster()) return;
      if (!Array.isArray(datos)) throw new Error("No se pudo interpretar el listado de usuarios.");
      usuarios=datos; pintar();
    } catch(error) { if(revision===version && esMaster()) mensaje(error.message,"error"); throw error; }
    finally { cargando=false; $("usuarios-recargar").disabled=false; }
  }
  function editar(usuario) {
    exigeMaster(); if(usuario.rol==="master") throw new Error("La cuenta master está protegida.");
    seleccionado={...usuario,modulos:[...usuario.modulos]};
    $("usuario-editar-correo").textContent=usuario.email;
    $("usuario-editar-nombre").value=usuario.nombre;
    $("usuario-editar-rol").value=usuario.rol;
    $("usuario-editar-activo").checked=usuario.activo;
    $("usuario-editar-modulos").querySelectorAll("input").forEach(input=>input.checked=usuario.modulos.includes(input.value));
    $("form-usuario-editar").hidden=false; $("usuario-editar-nombre").focus(); mensaje("");
  }
  async function guardar(evento) {
    evento.preventDefault();
    const boton=$("usuario-guardar"); if(boton.disabled) return;
    const revision=version;
    try {
      exigeMaster(); if(!seleccionado || seleccionado.rol==="master") throw new Error("Selecciona un usuario publicador o consulta.");
      boton.disabled=true;
      const estado=await auth.getAuthorization();
      if(!estado?.autorizado || estado.aal!=="aal2" || revision!==version) throw new Error("Revalida tu acceso antes de guardar.");
      exigeMaster();
      await auth.request("rpc/admin_guardar_usuario",{method:"POST",body:JSON.stringify({
        p_user_id:seleccionado.user_id,p_email:seleccionado.email,p_nombre:$("usuario-editar-nombre").value.trim(),
        p_rol:$("usuario-editar-rol").value,p_activo:$("usuario-editar-activo").checked,
        p_modulos:asignados("usuario-editar-modulos"),p_actualizado_at:seleccionado.actualizado_at
      })});
      if(revision!==version || !esMaster()) return;
      seleccionado=null; $("form-usuario-editar").hidden=true;
      mensaje("Cambios guardados y registrados en auditoría.","exito"); await cargar();
    } catch(error) { if(revision===version && esMaster()) mensaje(error.message,"error"); }
    finally { boton.disabled=false; }
  }
  async function enviarInvitacion(email,nombre,asignacion,boton) {
    exigeMaster(); if(invitacionesPausadas) throw new Error("Invitaciones pausadas hasta cerrar la auditoría y recibir autorización expresa.");
    if (!asignacion.length || asignacion.some(modulo => !Object.hasOwn(modulos,modulo))) throw new Error("Selecciona al menos un módulo permitido para el publicador.");
    email=email.trim().toLowerCase(); nombre=nombre.trim();
    if (!nombre || nombre.length>160 || email.length>254 || !/^[^\s@]+@[^\s@]+[.][^\s@]+$/.test(email)) throw new Error("Revisa el nombre y el correo del publicador.");
    if(boton.disabled) return; boton.disabled=true;
    const revision=version;
    try {
      const sesion=await auth.ensureSession(); exigeMaster();
      const respuesta=await fetch(URL_SUPABASE+"/functions/v1/admin-invitar-editor",{
        method:"POST",headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+sesion.access_token,"Content-Type":"application/json"},
        body:JSON.stringify({email,nombre,modulos:asignacion}),signal:AbortSignal.timeout(30000)
      });
      const resultado=await respuesta.json();
      if(revision!==version || !esMaster()) return;
      if(!respuesta.ok) throw new Error(resultado.message||"No se pudo confirmar la invitación.");
      $("form-usuario-invitar").reset(); mensaje(resultado.message,"exito");
    } finally {
      boton.disabled=false;
      if(revision===version && esMaster()) await cargar();
    }
  }
  function limpiar() {
    version++; perfil=null; usuarios=[]; seleccionado=null;
    $("usuarios-listado").replaceChildren(); $("form-usuario-editar").hidden=true;
    $("form-usuario-editar").reset(); $("form-usuario-invitar").reset();
    $("usuario-editar-correo").textContent=""; mensaje(""); $("panel-usuarios").hidden=true;
  }
  function configurar(nuevoPerfil) {
    const identidad = nuevoPerfil?.user_id+":"+nuevoPerfil?.rol+":"+nuevoPerfil?.aal;
    const anterior = perfil?.user_id+":"+perfil?.rol+":"+perfil?.aal;
    if (identidad!==anterior) limpiar();
    perfil=nuevoPerfil;
    if(!esMaster()) $("panel-usuarios").hidden=true;
  }
  opciones("usuario-nuevo-modulos"); opciones("usuario-editar-modulos");
  $("usuarios-recargar").addEventListener("click",()=>{mensaje(""); cargar().catch(error=>mensaje(error.message,"error"));});
  $("usuario-cancelar").addEventListener("click",()=>{seleccionado=null; $("form-usuario-editar").hidden=true;});
  $("form-usuario-editar").addEventListener("submit",guardar);
  $("form-usuario-invitar").addEventListener("submit",evento=>{
    evento.preventDefault();
    enviarInvitacion($("usuario-nuevo-email").value.trim(),$("usuario-nuevo-nombre").value.trim(),asignados("usuario-nuevo-modulos"),$("usuario-invitar"))
      .catch(error=>mensaje(error.message,"error"));
  });
  auth?.subscribe(evento=>{if(evento==="SIGNED_OUT") limpiar();});
  window.EvaUsuarios=Object.freeze({configurar,cargar,limpiar});
})();
