(() => {
  "use strict";
  const auth = window.EvaAdminSession;
  const $ = id => document.getElementById(id);
  const tablas = {
    capacitaciones: {tabla:"capacitaciones_sesiones",campos:"id,titulo,jornada,numero_sesion,visible,updated_at"},
    calendario: {tabla:"calendario_actividades",campos:"id,titulo,fecha,visible,updated_at"},
    repositorio: {tabla:"repositorio_recursos",campos:"id,titulo,visible,estado_publicacion,updated_at"},
    noticias: {tabla:"noticias_destacadas",campos:"id,titulo,visible,estado_publicacion,updated_at"},
    galeria: {tabla:"galeria_items",campos:"id,titulo,visible,estado_publicacion,publicacion_autorizada,updated_at"}
  };
  // Los filtros públicos están desplegados; la pausa de invitaciones se conserva por separado.
  const filtroCapacitacionesPendiente = false;
  let perfil = null, clave = "", revision = 0, alCambiar = null;
  const listas = new Map(), cargas = new Map(), operaciones = new Set();
  const vigente = () => perfil?.autorizado
    && (perfil.rol === "master" ? perfil.aal === "aal2" : ["aal1","aal2"].includes(perfil.aal))
    && auth?.getSession()?.user?.id === perfil.user_id;
  const permite = modulo => vigente() && Object.hasOwn(tablas,modulo)
    && (perfil.rol === "master" || ["editor","consulta"].includes(perfil.rol) && perfil.modulos.includes(modulo));
  const escribe = modulo => permite(modulo) && ["master","editor"].includes(perfil.rol)
    && !(modulo === "capacitaciones" && filtroCapacitacionesPendiente);
  const estado = fila => fila.estado_publicacion || (fila.visible ? "publicado" : "archivado");
  function mensaje(modulo,texto,tipo="") {
    const nodo=$("publicacion-mensaje-"+modulo);
    if(nodo) { nodo.textContent=texto; nodo.className="mensaje"+(tipo?" "+tipo:""); }
  }
  function pintar(modulo) {
    const cuerpo=$("publicacion-listado-"+modulo); if(!cuerpo) return;
    cuerpo.replaceChildren();
    for(const fila of listas.get(modulo)||[]) {
      const tr=document.createElement("tr"), situacion=estado(fila);
      const titulo=document.createElement("td"), marca=document.createElement("td"), acciones=document.createElement("td");
      titulo.textContent=fila.titulo+(modulo==="capacitaciones"?" · Jornada "+fila.jornada+" · Sesión "+fila.numero_sesion:"");
      marca.textContent=({publicado:"Publicado",archivado:"Archivado",borrador:"Borrador"})[situacion]||situacion;
      if(escribe(modulo)) {
        const opciones=situacion==="publicado"?[["archivar","Archivar"]]:
          situacion==="archivado" && perfil.rol==="master"?[["restaurar","Restaurar"]]:[["publicar","Publicar"]];
        for(const [accion,etiqueta] of opciones) {
          const boton=document.createElement("button"); boton.type="button"; boton.textContent=etiqueta;
          boton.disabled=operaciones.has(modulo) || modulo==="galeria" && accion!=="archivar" && !fila.publicacion_autorizada;
          boton.addEventListener("click",()=>operar(modulo,fila,accion).catch(()=>{})); acciones.append(boton);
        }
      } else acciones.textContent=modulo==="capacitaciones" && filtroCapacitacionesPendiente?"Filtro público pendiente":"Solo lectura";
      tr.append(titulo,marca,acciones); cuerpo.append(tr);
    }
  }
  async function cargar(modulo) {
    if(!permite(modulo)) throw new Error("Módulo no autorizado.");
    const captura=revision;
    if(cargas.get(modulo)?.revision===captura) return cargas.get(modulo).promesa;
    const promesa=(async()=>{
      const datos=[], {tabla,campos}=tablas[modulo];
      try {
        for(let offset=0;;offset+=250) {
          const filtro=perfil.rol!=="master" && !["capacitaciones","calendario"].includes(modulo)
            ?"&estado_publicacion=in.(publicado,archivado)":"";
          const pagina=await auth.request(tabla+"?select="+campos+filtro+"&order=id.asc&limit=250&offset="+offset);
          if(captura!==revision || !permite(modulo)) return;
          if(!Array.isArray(pagina)) throw new Error("No se pudo interpretar el contenido del módulo.");
          datos.push(...pagina); if(pagina.length<250) break;
        }
        listas.set(modulo,datos); pintar(modulo);
        mensaje(modulo,modulo==="capacitaciones" && filtroCapacitacionesPendiente
          ?"Publicar y archivar están pausados hasta completar el filtro de la página pública de Capacitaciones."
          :datos.length?"":"No hay contenido publicado o archivado disponible.");
      } catch(error) {
        if(captura===revision && permite(modulo)) mensaje(modulo,error.message+" Puedes actualizar el listado para reintentar.","error");
        throw error;
      } finally { if(cargas.get(modulo)?.revision===captura) cargas.delete(modulo); }
    })();
    cargas.set(modulo,{revision:captura,promesa}); return promesa;
  }
  async function operar(modulo,fila,accion) {
    const captura=revision;
    if(!escribe(modulo) || operaciones.has(modulo) || !["publicar","archivar","restaurar"].includes(accion)
      || accion==="restaurar" && perfil.rol!=="master") throw new Error("Operación no autorizada.");
    operaciones.add(modulo); pintar(modulo);
    try {
      await auth.ensureSession();
      if(captura!==revision || !escribe(modulo)) return;
      const resultado=await auth.request("rpc/admin_cambiar_publicacion",{method:"POST",body:JSON.stringify({
        p_modulo:modulo,p_id:fila.id,p_accion:accion,p_actualizado_at:fila.updated_at
      })});
      if(captura!==revision || !escribe(modulo)) return;
      await cargar(modulo);
      if(captura!==revision || !escribe(modulo)) return;
      if(perfil.rol==="master" && alCambiar) await alCambiar(modulo);
      if(captura===revision && escribe(modulo)) mensaje(modulo,resultado.sin_cambios?"El contenido ya tenía ese estado.":
        "Contenido "+({publicado:"publicado",archivado:"archivado"})[resultado.estado]+". Cambio registrado en auditoría.","exito");
    } catch(error) {
      if(captura===revision && permite(modulo)) mensaje(modulo,error.message+" Actualiza el listado antes de reintentar.","error");
      throw error;
    } finally { if(captura===revision) { operaciones.delete(modulo); if(permite(modulo)) pintar(modulo); } }
  }
  function limpiar() {
    revision++; perfil=null; clave=""; listas.clear(); cargas.clear(); operaciones.clear();
    for(const modulo of Object.keys(tablas)) { $("publicacion-listado-"+modulo)?.replaceChildren(); mensaje(modulo,""); }
  }
  function configurar(nuevo,opciones={}) {
    const nuevaClave=nuevo?JSON.stringify([nuevo.user_id,nuevo.rol,nuevo.modulos,nuevo.autorizado,nuevo.aal]):"";
    if(nuevaClave!==clave) { limpiar(); perfil=nuevo; clave=nuevaClave; }
    alCambiar=opciones.alCambiar||null;
    for(const modulo of Object.keys(tablas)) {
      const boton=$("publicacion-recargar-"+modulo);
      if(boton) boton.disabled=!permite(modulo);
    }
  }
  for(const modulo of Object.keys(tablas)) $("publicacion-recargar-"+modulo)?.addEventListener("click",()=>cargar(modulo).catch(()=>{}));
  window.EvaPublicacion={configurar,limpiar,cargar,cargarTodos:()=>Promise.all(Object.keys(tablas).filter(permite).map(cargar))};
})();
