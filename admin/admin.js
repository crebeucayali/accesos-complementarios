(() => {
  "use strict";

  const PANEL_HABILITADO = true;
  const SUPABASE_URL = "https://dteimbhwtzghhsijeeld.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const auth = window.EvaAdminSession;

  // La activación de una invitación no reemplaza una sesión administrativa abierta.
  if (window.EvaActivacionPendiente) return;

  const $ = (id) => document.getElementById(id);
  const estadoTitulo = $("estado-panel-titulo");
  const estadoMensaje = $("estado-panel-mensaje");
  const formLogin = $("form-login");
  const tarjetaLogin = formLogin?.closest(".tarjeta");
  const seccionMfa = $("seccion-mfa");
  const seccionAdmin = $("seccion-admin");
  const mensajeAdmin = $("mensaje-admin");
  const reintentarAcceso = $("boton-reintentar-acceso");

  if (!auth) {
    estadoTitulo.textContent = "No se pudo preparar el acceso";
    estadoMensaje.textContent = "Recarga la página para volver a cargar la sesión administrativa.";
    $("boton-login").disabled = true;
    reintentarAcceso.hidden = false;
    reintentarAcceso.addEventListener("click", () => location.reload());
    return;
  }

  let sesion = null;
  let factorMfa = null;
  let desafioMfa = null;
  let accesoPendiente = null;
  let saliendo = false;
  let perfil = null;
  let clavePermisos = "";
  const modulosContenido = ["capacitaciones", "calendario", "repositorio", "noticias", "galeria"];

  function permitePanel(modulo, escritura = false) {
    if (!perfil?.autorizado) return false;
    if (perfil.rol === "master") return perfil.aal === "aal2";
    return ["editor","consulta"].includes(perfil.rol)
      && ["aal1","aal2"].includes(perfil.aal)
      && modulosContenido.includes(modulo)
      && perfil.modulos.includes(modulo)
      && !escritura;
  }

  function limpiarContenidoPrivado() {
    capacitaciones = []; actividades = []; recursosRepositorio = []; noticiasDestacadas = []; galeriaItems = [];
    archivoNoticiaSeleccionado = null; archivoCapFlyerSeleccionado = null;
    archivoCapInfografiaSeleccionado = null; archivoRepositorioSeleccionado = null; imagenesGaleriaEditor = [];
    modulosContenido.forEach(modulo => {
      const panel = $("panel-" + modulo);
      panel?.querySelectorAll("input,textarea").forEach(control => {
        if (control.type === "checkbox") control.checked = false; else control.value = "";
      });
      panel?.querySelectorAll("img").forEach(img => img.removeAttribute("src"));
      panel?.querySelectorAll("select").forEach(control => {
        if (control.id?.endsWith("selector")) control.replaceChildren();
      });
    });
    ["gal-imagenes-editor", "estadisticas-mensual", "estadisticas-diarias", "estadisticas-modulos", "compartidos-modulos", "compartidos-paginas"].forEach(id => $(id)?.replaceChildren());
    window.EvaUsuarios?.limpiar();
    window.EvaPublicacion?.limpiar();
  }

  function aplicarPermisos() {
    document.querySelectorAll(".tab").forEach(boton => {
      boton.hidden = !permitePanel(boton.dataset.panel);
      if (boton.hidden) $("panel-" + boton.dataset.panel).hidden = true;
    });
    modulosContenido.forEach(modulo => {
      $("panel-" + modulo)?.querySelectorAll("[data-master-contenido]").forEach(bloque => {
        bloque.hidden = perfil?.rol !== "master";
      });
      $("panel-" + modulo)?.querySelectorAll("[data-master-contenido] input,[data-master-contenido] textarea,[data-master-contenido] select,[data-master-contenido] button").forEach(control => {
        const bloquear = !permitePanel(modulo, true) && !(control.id?.endsWith("selector"));
        if (bloquear && control.dataset.bloqueadoPermiso !== "true") {
          control.dataset.disabledPrevio = String(control.disabled);
          control.dataset.bloqueadoPermiso = "true"; control.disabled = true;
        } else if (!bloquear && control.dataset.bloqueadoPermiso === "true") {
          control.disabled = control.dataset.disabledPrevio === "true";
          delete control.dataset.bloqueadoPermiso; delete control.dataset.disabledPrevio;
        }
      });
    });
    window.EvaUsuarios?.configurar(perfil);
    window.EvaPublicacion?.configurar(perfil, {alCambiar: async modulo => {
      if (!permitePanel(modulo,true)) return;
      const cargadores = {capacitaciones:cargarCapacitaciones,calendario:cargarCalendario,repositorio:cargarRepositorio,noticias:cargarNoticiasDestacadas,galeria:cargarGaleriaAdmin};
      await cargadores[modulo]();
    }});
  }
  let capacitaciones = [];
  let actividades = [];
  let recursosRepositorio = [];
  let noticiasDestacadas = [];
  const MAX_FOTOGRAFIAS_GALERIA = 8;
  let galeriaItems = [];
  let archivoNoticiaSeleccionado = null;
  let archivoCapFlyerSeleccionado = null;
  let archivoCapInfografiaSeleccionado = null;
  let archivoRepositorioSeleccionado = null;
  let imagenesGaleriaEditor = [];

  function mostrarMensaje(texto, tipo = "") {
    mensajeAdmin.textContent = texto || "";
    mensajeAdmin.className = "mensaje" + (tipo ? " " + tipo : "");
  }

  function authHeaders(token, extra = {}) {
    const headers = {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...extra
    };
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const texto = await respuesta.text();
    let datos = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
    if (!respuesta.ok) {
      const mensaje = datos?.msg || datos?.message || datos?.error_description || datos?.error || ("Error HTTP " + respuesta.status);
      const error = new Error(mensaje);
      error.status = respuesta.status;
      error.code = datos?.error_code || datos?.code || "http_error";
      throw error;
    }
    return datos;
  }

  function leerSesion() {
    sesion = auth.getSession();
  }

  async function refrescarSesionSiHaceFalta() {
    sesion = await auth.ensureSession();
  }

  async function rest(path, opciones = {}) {
    await refrescarSesionSiHaceFalta();
    const usuario = sesion?.user?.id;
    const permisos = clavePermisos;
    const tablas = {capacitaciones_sesiones:"capacitaciones",calendario_actividades:"calendario",repositorio_recursos:"repositorio",noticias_destacadas:"noticias",galeria_items:"galeria",galeria_item_imagenes:"galeria","rpc/admin_guardar_actividad_calendario":"calendario"};
    const modulo = tablas[path.split("?")[0]];
    if (modulo && ["POST","PATCH","DELETE","PUT"].includes(opciones.method?.toUpperCase()) && !permitePanel(modulo,true)) {
      throw new Error("No tienes permiso de escritura en este módulo.");
    }
    const resultado = await auth.request(path, opciones);
    if (auth.getSession()?.user?.id !== usuario || clavePermisos !== permisos) {
      throw new Error("La sesión o los permisos cambiaron durante la operación. Reintenta el acceso.");
    }
    return resultado;
  }

  async function comprobarAutorizacion() {
    const estado = await auth.getAuthorization();
    leerSesion();
    const fila = Array.isArray(estado) ? estado[0] : estado;
    return {
      autorizado: Boolean(fila?.autorizado),
      aal: String(fila?.aal || "")
    };
  }

  async function obtenerEstadoMfa() {
    const datos = await rest("rpc/estado_mfa_admin", {
      method: "POST",
      body: "{}"
    });
    const fila = Array.isArray(datos) ? datos[0] : datos;
    return {
      aal: String(fila?.aal || ""),
      factorId: fila?.factor_id || null,
      tieneFactorVerificado: Boolean(fila?.tiene_factor_verificado)
    };
  }

  async function prepararMfa() {
    const confirmarSesion = () => {
      if (saliendo || !auth.getSession()) {
        const error = new Error("La sesión terminó. Inicia sesión nuevamente.");
        error.definitive = true;
        throw error;
      }
    };
    const estadoMfa = await obtenerEstadoMfa();
    confirmarSesion();

    if (estadoMfa.tieneFactorVerificado && estadoMfa.factorId) {
      factorMfa = estadoMfa.factorId;
      $("mfa-enrolamiento").hidden = true;
    } else {
      await rest("rpc/limpiar_mfa_no_verificado_admin", {
        method: "POST",
        body: "{}"
      });
      confirmarSesion();

      const enrolado = await solicitar(SUPABASE_URL + "/auth/v1/factors", {
        method: "POST",
        headers: authHeaders(sesion.access_token),
        body: JSON.stringify({
          factor_type: "totp",
          friendly_name: "CREBE Ucayali - EVA Administración",
          issuer: "https://crebeucayali.github.io"
        })
      });
      confirmarSesion();
      factorMfa = enrolado.id;
      $("mfa-enrolamiento").hidden = false;
      if (enrolado?.totp?.qr_code) {
        const qr = String(enrolado.totp.qr_code).trim();
        $("mfa-qr").src = qr.startsWith("data:")
          ? qr
          : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qr);
      }
      $("mfa-secreto").textContent = enrolado?.totp?.secret || "No disponible";
    }

    const desafio = await solicitar(SUPABASE_URL + "/auth/v1/factors/" + encodeURIComponent(factorMfa) + "/challenge", {
      method: "POST",
      headers: authHeaders(sesion.access_token),
      body: "{}"
    });
    confirmarSesion();
    desafioMfa = desafio.id;
    seccionMfa.hidden = false;
    $("codigo-mfa").focus();
  }

  async function entrarPanel() {
    const estado = await comprobarAutorizacion();
    if (!estado.autorizado) {
      seccionAdmin.hidden = true;
      seccionMfa.hidden = true;
      if (tarjetaLogin) tarjetaLogin.hidden = false;
      await auth.signOut();
      throw new Error("Esta cuenta no está autorizada para administrar EVA.");
    }

    leerSesion();
    if (!sesion) {
      const error = new Error("La sesión terminó. Inicia sesión nuevamente.");
      error.definitive = true;
      throw error;
    }

    if (tarjetaLogin) tarjetaLogin.hidden = true;

    const nuevoPerfil = await rest("rpc/perfil_panel_admin", {method:"POST", body:"{}"});
    if (!nuevoPerfil?.autorizado
      || !["master","editor","consulta"].includes(nuevoPerfil.rol)
      || nuevoPerfil.user_id !== auth.getSession()?.user?.id || !Array.isArray(nuevoPerfil.modulos)) {
      seccionAdmin.hidden = true;
      throw new Error("Los permisos cambiaron. Reintenta el acceso para comprobar tu autorización.");
    }

    if (nuevoPerfil.rol === "master" && nuevoPerfil.aal !== "aal2") {
      perfil = null;
      aplicarPermisos();
      seccionAdmin.hidden = true;
      seccionMfa.hidden = false;
      estadoTitulo.textContent = "Verificación en dos pasos";
      estadoMensaje.textContent = "La cuenta master requiere el código de tu autenticador para completar el acceso.";
      await prepararMfa();
      return;
    }

    if (nuevoPerfil.rol !== "master" && !["aal1","aal2"].includes(nuevoPerfil.aal)) {
      seccionAdmin.hidden = true;
      throw new Error("No se pudo validar el nivel de autenticación de esta cuenta.");
    }
    const nuevaClave = JSON.stringify([nuevoPerfil.user_id,nuevoPerfil.rol,nuevoPerfil.modulos]);
    if (nuevaClave !== clavePermisos) limpiarContenidoPrivado();
    perfil = nuevoPerfil; clavePermisos = nuevaClave;
    aplicarPermisos();
    seccionMfa.hidden = true;
    seccionAdmin.hidden = false;
    estadoTitulo.textContent = "Acceso administrativo activo";
    estadoMensaje.textContent = "";
    $("usuario-actual").textContent = (perfil.nombre || sesion?.user?.email || "Usuario") + " · " + ({editor:"Publicador",consulta:"Consulta",master:"Master"})[perfil.rol];
    const cargadores = {capacitaciones:cargarCapacitaciones,calendario:cargarCalendario,repositorio:cargarRepositorio,noticias:cargarNoticiasDestacadas,galeria:cargarGaleriaAdmin,estadisticas:cargarEstadisticasVisitas};
    const cargas = await Promise.allSettled([
      ...Object.entries(cargadores).filter(([modulo]) => permitePanel(modulo,true)).map(([,cargar]) => cargar()),
      window.EvaPublicacion?.cargarTodos()
    ]);
    if (!auth.getSession()) return;
    aplicarPermisos();
    if (perfil.rol !== "master" && !perfil.modulos.some(modulo => modulosContenido.includes(modulo))) {
      estadoMensaje.textContent = "Tu cuenta está activa y todavía no tiene módulos asignados. Solicita la asignación a la cuenta master.";
    }
    if (cargas.some(resultado => resultado.status === "rejected")) {
      estadoMensaje.textContent = "La sesión está activa. Parte de la información no pudo cargarse. Pulsa Reintentar acceso.";
      reintentarAcceso.hidden = false;
    }
  }

  async function iniciarSesion(correo, clave) {
    sesion = await auth.signIn(correo, clave);
    await recuperarAcceso();
  }

  async function verificarMfa(codigo) {
    sesion = await auth.verifyMfa(factorMfa, desafioMfa, codigo);
    $("mfa-secreto").textContent = "";
    $("mfa-qr").removeAttribute("src");
    await recuperarAcceso();
  }

  async function cerrarSesion() {
    if (saliendo) return;
    saliendo = true;
    $("boton-salir").disabled = true;
    seccionAdmin.hidden = true;
    seccionMfa.hidden = true;
    try {
      const resultado = await auth.signOut();
      mostrarAccesoCerrado();
      estadoMensaje.textContent = resultado.remote ? "Sesión administrativa cerrada." : "Sesión cerrada en este navegador. No se pudo confirmar el cierre remoto.";
    } finally {
      saliendo = false;
      $("boton-salir").disabled = false;
    }
  }

  function mostrarAccesoCerrado() {
    perfil = null; clavePermisos = "";
    limpiarContenidoPrivado();
    aplicarPermisos();
    sesion = null;
    factorMfa = null;
    desafioMfa = null;
    seccionAdmin.hidden = true;
    seccionMfa.hidden = true;
    if (tarjetaLogin) tarjetaLogin.hidden = false;
    $("clave").value = "";
    $("codigo-mfa").value = "";
    $("mfa-secreto").textContent = "";
    $("mfa-qr").removeAttribute("src");
    $("usuario-actual").textContent = "";
    reintentarAcceso.hidden = true;
    estadoTitulo.textContent = "Acceso administrativo cerrado";
  }

  function informarErrorAcceso(error) {
    if (error.definitive || !auth.getSession()) {
      mostrarAccesoCerrado();
    } else {
      if (tarjetaLogin) tarjetaLogin.hidden = true;
      estadoTitulo.textContent = "No se pudo completar el acceso";
      reintentarAcceso.hidden = false;
    }
    estadoMensaje.textContent = error.message || "Revisa la conexión y vuelve a intentarlo.";
  }

  function recuperarAcceso() {
    if (accesoPendiente) return accesoPendiente;
    reintentarAcceso.hidden = true;
    accesoPendiente = entrarPanel().catch(informarErrorAcceso).finally(() => { accesoPendiente = null; });
    return accesoPendiente;
  }

  function recursosATexto(recursos) {
    if (!Array.isArray(recursos)) return "";
    return recursos.map((recurso) => {
      const titulo = String(recurso?.titulo || "").trim();
      const url = String(recurso?.url || "").trim();
      const descripcion = String(recurso?.descripcion || "").trim();
      return [titulo, url, descripcion].join(" | ").replace(/\\s+\\|\\s*$/, "").trim();
    }).filter(Boolean).join("\\n");
  }

  function textoARecursos(texto) {
    return String(texto || "").split(/\\r?\\n/).map((linea) => linea.trim()).filter(Boolean).map((linea) => {
      const partes = linea.split("|").map((parte) => parte.trim());
      if (!partes[0] || !partes[1]) {
        throw new Error("Cada material debe usar: Título | URL | Descripción opcional.");
      }
      return {
        titulo: partes[0],
        url: partes[1],
        descripcion: partes.slice(2).join(" | ").trim()
      };
    });
  }

  function fechaTextoES(fecha) {
    if (!fecha) return "";
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const valor = new Date(Date.UTC(anio, mes - 1, dia));
    const texto = new Intl.DateTimeFormat("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(valor);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function resolverVistaPreviaCapacitacion(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^imagenes\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(texto)) {
      return "https://crebeucayali.github.io/capacitaciones/" + texto;
    }
    return texto;
  }

  function mostrarVistaPreviaCapacitacion(tipo, origen, mensaje) {
    const panel = $("cap-" + tipo + "-panel");
    const imagen = $("cap-" + tipo + "-preview");
    const estado = $("cap-" + tipo + "-estado");
    const url = String(origen || "").trim();

    if (!url) {
      panel.hidden = true;
      imagen.removeAttribute("src");
      estado.textContent = "";
      return;
    }

    imagen.src = resolverVistaPreviaCapacitacion(url);
    estado.textContent = mensaje || "Imagen actualmente asociada a la sesión.";
    panel.hidden = false;
  }

  function esImagenStorageCapacitacion(valor) {
    try {
      const url = new URL(String(valor || "").trim());
      return (
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "dteimbhwtzghhsijeeld.supabase.co" &&
        /^\/storage\/v1\/object\/public\/eva-publico\/capacitaciones\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  function validarImagenCapacitacion(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^imagenes\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(texto)) return texto;
    if (esImagenStorageCapacitacion(texto)) return new URL(texto).href;
    throw new Error("La imagen de capacitación debe pertenecer al repositorio actual o al Storage institucional de Capacitaciones.");
  }

  function rutaStorageCapacitacion(archivo, fila, tipo) {
    const jornada = String(Number(fila.jornada || 0)).padStart(2, "0");
    const sesion = String(Number(fila.numero_sesion || 0)).padStart(2, "0");
    return (
      "capacitaciones/jornada-" + jornada +
      "/sesion-" + sesion +
      "/" + tipo + "-" + Date.now() + "-" +
      identificadorArchivoNoticia() + "." + extensionImagenNoticia(archivo)
    );
  }

  async function subirImagenCapacitacion(archivo, fila, tipo) {
    validarArchivoImagenNoticia(archivo);
    await refrescarSesionSiHaceFalta();

    const estado = await comprobarAutorizacion();
    if (!estado.autorizado || estado.aal !== "aal2") {
      throw new Error("La carga de imágenes requiere una sesión administrativa con MFA AAL2.");
    }

    const ruta = rutaStorageCapacitacion(archivo, fila, tipo);
    const rutaCodificada = ruta.split("/").map(encodeURIComponent).join("/");

    await solicitar(
      SUPABASE_URL + "/storage/v1/object/" + encodeURIComponent(STORAGE_BUCKET_EVA) + "/" + rutaCodificada,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: "Bearer " + sesion.access_token,
          "Content-Type": archivo.type,
          Accept: "application/json",
          "Cache-Control": "3600",
          "x-upsert": "false"
        },
        body: archivo
      }
    );

    return {
      ruta,
      url: STORAGE_NOTICIAS_BASE + ruta
    };
  }

  function gestionarArchivoCapacitacion(tipo, evento) {
    try {
      const archivo = validarArchivoImagenNoticia(evento.target.files?.[0] || null);
      if (tipo === "flyer") archivoCapFlyerSeleccionado = archivo;
      if (tipo === "infografia") archivoCapInfografiaSeleccionado = archivo;

      if (!archivo) {
        const valorActual = $("cap-" + tipo).value;
        mostrarVistaPreviaCapacitacion(
          tipo,
          valorActual,
          valorActual ? "Imagen actualmente asociada a la sesión." : ""
        );
        return;
      }

      const lector = new FileReader();
      lector.addEventListener("load", () => {
        mostrarVistaPreviaCapacitacion(
          tipo,
          lector.result,
          archivo.name + " · " + Math.max(1, Math.round(archivo.size / 1024)) + " KB · preparada para subir"
        );
      });
      lector.readAsDataURL(archivo);
      mostrarMensaje("");
    } catch (error) {
      if (tipo === "flyer") archivoCapFlyerSeleccionado = null;
      if (tipo === "infografia") archivoCapInfografiaSeleccionado = null;
      evento.target.value = "";
      const valorActual = $("cap-" + tipo).value;
      mostrarVistaPreviaCapacitacion(
        tipo,
        valorActual,
        valorActual ? "Imagen actualmente asociada a la sesión." : ""
      );
      mostrarMensaje(error.message, "error");
    }
  }

  function llenarCapacitacion(fila) {
    $("cap-fecha").value = fila?.fecha || "";
    $("cap-estado").value = fila?.estado || "pendiente";
    $("cap-titulo").value = fila?.titulo || "";
    $("cap-tema").value = fila?.tema || "";
    $("cap-flyer").value = fila?.flyer_url || "";
    $("cap-infografia").value = fila?.infografia_url || "";
    $("cap-pdf").value = fila?.pdf_url || "";
    $("cap-video").value = fila?.video_url || "";
    $("cap-video-preview").value = fila?.video_preview_url || "";
    $("cap-diapositivas").value = fila?.diapositivas_url || "";
    $("cap-diapositivas-preview").value = fila?.diapositivas_preview_url || "";
    $("cap-recursos").value = recursosATexto(fila?.recursos_adicionales);

    archivoCapFlyerSeleccionado = null;
    archivoCapInfografiaSeleccionado = null;
    $("cap-flyer-archivo").value = "";
    $("cap-infografia-archivo").value = "";

    const flyerAplicable = Number(fila?.jornada) === 1 && Number(fila?.numero_sesion) === 1;
    $("cap-flyer-bloque").hidden = !flyerAplicable;

    mostrarVistaPreviaCapacitacion(
      "flyer",
      flyerAplicable ? (fila?.flyer_url || "") : "",
      fila?.flyer_url ? "Flyer actualmente asociado a la sesión." : ""
    );
    mostrarVistaPreviaCapacitacion(
      "infografia",
      fila?.infografia_url || "",
      fila?.infografia_url ? "Infografía actualmente asociada a la sesión." : ""
    );
  }

  async function cargarCapacitaciones() {
    capacitaciones = await rest("capacitaciones_sesiones?select=*&order=jornada.asc,numero_sesion.asc", { method: "GET" });
    const selector = $("sesion-selector");
    selector.replaceChildren();
    capacitaciones.forEach((fila, indice) => {
      const opcion = document.createElement("option");
      opcion.value = String(indice);
      opcion.textContent = "Jornada " + fila.jornada + " · Sesión " + fila.numero_sesion + " · " + fila.fecha + (fila.visible === false ? " · Archivado" : " · Publicado");
      selector.appendChild(opcion);
    });
    llenarCapacitacion(capacitaciones[0]);
    window.EvaPublicacion?.cargar("capacitaciones").catch(() => {});
  }

  async function guardarCapacitacion() {
    const indice = Number($("sesion-selector").value);
    const fila = capacitaciones[indice];
    if (!fila) throw new Error("Selecciona una sesión válida.");

    const fecha = $("cap-fecha").value;
    const titulo = $("cap-titulo").value.trim();
    if (!fecha) throw new Error("La fecha es obligatoria.");
    if (!titulo) throw new Error("El título es obligatorio.");

    let flyerUrl = validarImagenCapacitacion($("cap-flyer").value);
    let infografiaUrl = validarImagenCapacitacion($("cap-infografia").value);

    if (archivoCapFlyerSeleccionado) {
      if (!(Number(fila.jornada) === 1 && Number(fila.numero_sesion) === 1)) {
        throw new Error("El flyer no está habilitado para esta sesión.");
      }
      mostrarMensaje("Subiendo flyer de la capacitación a Supabase Storage…");
      const subidaFlyer = await subirImagenCapacitacion(archivoCapFlyerSeleccionado, fila, "flyer");
      flyerUrl = subidaFlyer.url;
      $("cap-flyer").value = flyerUrl;
      archivoCapFlyerSeleccionado = null;
      $("cap-flyer-archivo").value = "";
      mostrarVistaPreviaCapacitacion("flyer", flyerUrl, "Flyer subido a Storage. Pendiente de guardar la sesión.");
    }

    if (archivoCapInfografiaSeleccionado) {
      mostrarMensaje("Subiendo infografía de la capacitación a Supabase Storage…");
      const subidaInfografia = await subirImagenCapacitacion(archivoCapInfografiaSeleccionado, fila, "infografia");
      infografiaUrl = subidaInfografia.url;
      $("cap-infografia").value = infografiaUrl;
      archivoCapInfografiaSeleccionado = null;
      $("cap-infografia-archivo").value = "";
      mostrarVistaPreviaCapacitacion("infografia", infografiaUrl, "Infografía subida a Storage. Pendiente de guardar la sesión.");
    }

    const cambios = {
      fecha,
      fecha_texto: fechaTextoES(fecha),
      estado: $("cap-estado").value,
      titulo,
      tema: $("cap-tema").value.trim(),
      flyer_url: flyerUrl,
      infografia_url: infografiaUrl,
      pdf_url: $("cap-pdf").value.trim(),
      video_url: $("cap-video").value.trim(),
      video_preview_url: $("cap-video-preview").value.trim(),
      diapositivas_url: $("cap-diapositivas").value.trim(),
      diapositivas_preview_url: $("cap-diapositivas-preview").value.trim(),
      recursos_adicionales: textoARecursos($("cap-recursos").value)
    };

    const resultado = await rest(
      "capacitaciones_sesiones?jornada=eq." + fila.jornada + "&numero_sesion=eq." + fila.numero_sesion,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(cambios)
      }
    );
    capacitaciones[indice] = Array.isArray(resultado) && resultado[0] ? resultado[0] : { ...fila, ...cambios };
    llenarCapacitacion(capacitaciones[indice]);
    mostrarMensaje("Sesión actualizada correctamente.", "exito");
  }

  function lineasActividad(fila) {
    const lineas = Array.isArray(fila?.contenido_lineas) ? fila.contenido_lineas : [];
    return lineas.slice(1).join("\n");
  }

  function llenarActividad(fila) {
    $("cal-id").value = fila?.id || "";
    $("cal-fecha").value = fila?.fecha || "";
    $("cal-titulo").value = fila?.titulo || "";
    $("cal-lineas").value = lineasActividad(fila);
    $("cal-estado").value = fila?.estado || "confirmada";
    $("cal-clase").value = fila?.clase_css || "";
    $("cal-visible").checked = fila?.visible !== false;
  }

  async function cargarCalendario() {
    actividades = await rest("calendario_actividades?select=*&order=fecha.desc,orden.asc", { method: "GET" });
    const selector = $("actividad-selector");
    selector.replaceChildren();
    const nueva = document.createElement("option");
    nueva.value = "";
    nueva.textContent = "Seleccionar actividad";
    selector.appendChild(nueva);

    actividades.forEach((fila, indice) => {
      const opcion = document.createElement("option");
      opcion.value = String(indice);
      opcion.textContent =
        fila.fecha + " · " + fila.titulo +
        " · " + ({
          confirmada: "Confirmada",
          planificacion: "En planificación",
          interna: "Actividad interna",
          feriado: "Feriado",
          cancelada: "Cancelada"
        }[fila.estado] || fila.estado) +
        (fila.visible === false ? " · Archivado" : "");
      selector.appendChild(opcion);
    });
    window.EvaPublicacion?.cargar("calendario").catch(() => {});
  }

  function nuevaActividad() {
    $("actividad-selector").value = "";
    $("cal-id").value = "";
    $("cal-fecha").value = "";
    $("cal-titulo").value = "";
    $("cal-lineas").value = "";
    $("cal-estado").value = "confirmada";
    $("cal-clase").value = "";
    $("cal-visible").checked = true;
    mostrarMensaje("");
  }

  async function guardarActividad() {
    const titulo = $("cal-titulo").value.trim();
    const extras = $("cal-lineas").value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    const id = $("cal-id").value;

    await rest("rpc/admin_guardar_actividad_calendario", {
      method: "POST",
      body: JSON.stringify({
        p_id: id ? Number(id) : null,
        p_fecha: $("cal-fecha").value,
        p_contenido_lineas: [titulo, ...extras],
        p_estado: $("cal-estado").value,
        p_clase_css: $("cal-clase").value,
        p_visible: $("cal-visible").checked
      })
    });

    mostrarMensaje(
      id ? "Actividad actualizada correctamente." : "Actividad registrada correctamente.",
      "exito"
    );
    await cargarCalendario();
  }


  const ETIQUETAS_REPOSITORIO = {
    materiales_disponibles: "Materiales disponibles",
    equipos_tecnologicos: "Equipos tecnológicos",
    materiales_elaborados: "Materiales elaborados"
  };

  function resolverVistaPreviaRepositorio(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^assets\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(texto)) {
      return "https://crebeucayali.github.io/repositorio-accesible/" + texto;
    }
    return texto;
  }

  function mostrarVistaPreviaRepositorio(origen, mensaje) {
    const panel = $("rep-imagen-panel");
    const imagen = $("rep-imagen-preview");
    const estado = $("rep-imagen-estado");
    const url = String(origen || "").trim();

    if (!url) {
      panel.hidden = true;
      imagen.removeAttribute("src");
      estado.textContent = "";
      return;
    }

    imagen.src = resolverVistaPreviaRepositorio(url);
    estado.textContent = mensaje || "Imagen actualmente asociada al recurso.";
    panel.hidden = false;
  }

  function esImagenStorageRepositorio(valor) {
    try {
      const url = new URL(String(valor || "").trim());
      return (
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "dteimbhwtzghhsijeeld.supabase.co" &&
        /^\/storage\/v1\/object\/public\/eva-publico\/repositorio\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  function rutaStorageRepositorio(archivo, categoria) {
    const carpeta = String(categoria || "materiales_disponibles").toLowerCase();
    return (
      "repositorio/" + carpeta + "/" +
      Date.now() + "-" + identificadorArchivoNoticia() +
      "." + extensionImagenNoticia(archivo)
    );
  }

  async function subirImagenRepositorio(archivo, categoria) {
    validarArchivoImagenNoticia(archivo);
    await refrescarSesionSiHaceFalta();

    const estado = await comprobarAutorizacion();
    if (!estado.autorizado || estado.aal !== "aal2") {
      throw new Error("La carga de imágenes requiere una sesión administrativa con MFA AAL2.");
    }

    const ruta = rutaStorageRepositorio(archivo, categoria);
    const rutaCodificada = ruta.split("/").map(encodeURIComponent).join("/");

    await solicitar(
      SUPABASE_URL + "/storage/v1/object/" + encodeURIComponent(STORAGE_BUCKET_EVA) + "/" + rutaCodificada,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: "Bearer " + sesion.access_token,
          "Content-Type": archivo.type,
          Accept: "application/json",
          "Cache-Control": "3600",
          "x-upsert": "false"
        },
        body: archivo
      }
    );

    return {
      ruta,
      url: STORAGE_NOTICIAS_BASE + ruta
    };
  }

  function gestionarArchivoRepositorio(evento) {
    try {
      const archivo = validarArchivoImagenNoticia(evento.target.files?.[0] || null);
      archivoRepositorioSeleccionado = archivo;

      if (!archivo) {
        const valorActual = $("rep-imagen").value;
        mostrarVistaPreviaRepositorio(
          valorActual,
          valorActual ? "Imagen actualmente asociada al recurso." : ""
        );
        return;
      }

      const lector = new FileReader();
      lector.addEventListener("load", () => {
        mostrarVistaPreviaRepositorio(
          lector.result,
          archivo.name + " · " + Math.max(1, Math.round(archivo.size / 1024)) + " KB · preparada para subir"
        );
      });
      lector.readAsDataURL(archivo);
      mostrarMensaje("");
    } catch (error) {
      archivoRepositorioSeleccionado = null;
      evento.target.value = "";
      const valorActual = $("rep-imagen").value;
      mostrarVistaPreviaRepositorio(
        valorActual,
        valorActual ? "Imagen actualmente asociada al recurso." : ""
      );
      mostrarMensaje(error.message, "error");
    }
  }

  function actualizarSelectorRepositorio(categoria, idSeleccionado = "") {
    const selector = $("repositorio-selector");
    selector.replaceChildren();

    const etiquetaCategoria = ETIQUETAS_REPOSITORIO[categoria] || categoria;
    const vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = "Seleccionar recurso de " + etiquetaCategoria;
    selector.appendChild(vacio);

    recursosRepositorio.forEach((fila, indice) => {
      if (fila.categoria !== categoria) return;

      const opcion = document.createElement("option");
      opcion.value = String(indice);
      opcion.textContent =
        fila.titulo +
        " · " + ({
          borrador: "Borrador",
          publicado: "Publicado",
          archivado: "Archivado"
        }[fila.estado_publicacion] || (fila.visible === false ? "Borrador" : "Publicado"));
      selector.appendChild(opcion);

      if (idSeleccionado && String(fila.id) === String(idSeleccionado)) {
        selector.value = String(indice);
      }
    });
  }

  function llenarRecursoRepositorio(fila, categoriaPreferida = "") {
    const categoria =
      fila?.categoria ||
      categoriaPreferida ||
      $("rep-categoria").value ||
      "materiales_disponibles";

    $("rep-id").value = fila?.id || "";
    $("rep-categoria").value = categoria;
    $("rep-titulo").value = fila?.titulo || "";
    $("rep-descripcion").value = fila?.descripcion || "";
    $("rep-imagen").value = fila?.imagen_url || "";
    $("rep-alt").value = fila?.imagen_alt || "";
    $("rep-estado-publicacion").value = fila?.estado_publicacion || (fila?.visible === false ? "borrador" : "publicado");
    $("boton-eliminar-recurso").hidden = !fila?.id;

    archivoRepositorioSeleccionado = null;
    $("rep-imagen-archivo").value = "";
    mostrarVistaPreviaRepositorio(
      fila?.imagen_url || "",
      fila?.imagen_url ? "Imagen actualmente asociada al recurso." : ""
    );

    actualizarSelectorRepositorio(categoria, fila?.id || "");
  }

  async function cargarRepositorio() {
    recursosRepositorio = await rest(
      "repositorio_recursos?select=*&order=categoria.asc,orden.asc,titulo.asc",
      { method: "GET" }
    );

    const categoriaActual = $("rep-categoria").value || "materiales_disponibles";
    llenarRecursoRepositorio(null, categoriaActual);
    window.EvaPublicacion?.cargar("repositorio").catch(() => {});
  }

  function nuevoRecursoRepositorio() {
    const categoriaActual = $("rep-categoria").value || "materiales_disponibles";
    llenarRecursoRepositorio(null, categoriaActual);
    $("rep-titulo").focus();
    mostrarMensaje("");
  }

  function validarImagenRepositorio(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^assets\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(texto)) return texto;
    if (esImagenStorageRepositorio(texto)) return new URL(texto).href;

    try {
      const url = new URL(texto);
      const rutaGitHubValida =
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "crebeucayali.github.io" &&
        /^\/repositorio-accesible\/assets\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname);

      if (!rutaGitHubValida) throw new Error();
      return url.href;
    } catch {
      throw new Error("La imagen debe pertenecer al Repositorio Accesible o al Storage institucional autorizado.");
    }
  }

  function siguienteOrdenRepositorio(categoria) {
    const ordenes = recursosRepositorio
      .filter((fila) => fila.categoria === categoria)
      .map((fila) => Number(fila.orden || 0));
    return (ordenes.length ? Math.max(...ordenes) : 0) + 1;
  }

  async function guardarRecursoRepositorio() {
    const id = $("rep-id").value.trim();
    const categoria = $("rep-categoria").value;
    const titulo = $("rep-titulo").value.trim();
    const alt = $("rep-alt").value.trim();

    if (!titulo) throw new Error("El título del recurso es obligatorio.");

    let imagen = validarImagenRepositorio($("rep-imagen").value);
    if ((imagen || archivoRepositorioSeleccionado) && !alt) {
      throw new Error("El texto alternativo es obligatorio cuando el recurso tiene una imagen.");
    }

    const existente = id
      ? recursosRepositorio.find((fila) => String(fila.id) === id)
      : null;

    const orden = existente && existente.categoria === categoria
      ? Number(existente.orden || 1)
      : siguienteOrdenRepositorio(categoria);

    if (archivoRepositorioSeleccionado) {
      mostrarMensaje("Subiendo imagen del recurso a Supabase Storage…");
      const subida = await subirImagenRepositorio(archivoRepositorioSeleccionado, categoria);
      imagen = subida.url;
      $("rep-imagen").value = imagen;
      archivoRepositorioSeleccionado = null;
      $("rep-imagen-archivo").value = "";
      mostrarVistaPreviaRepositorio(imagen, "Imagen subida a Storage. Pendiente de guardar el recurso.");
    }

    const payload = {
      categoria,
      orden,
      titulo,
      descripcion: $("rep-descripcion").value.trim(),
      imagen_url: imagen,
      imagen_alt: alt,
      estado_publicacion: $("rep-estado-publicacion").value,
      visible: $("rep-estado-publicacion").value === "publicado",
      origen: existente?.origen || "panel_admin"
    };

    let resultado;
    if (id) {
      resultado = await rest("repositorio_recursos?id=eq." + encodeURIComponent(id), {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
    } else {
      resultado = await rest("repositorio_recursos", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
    }

    await cargarRepositorio();

    const guardado = Array.isArray(resultado) ? resultado[0] : null;
    if (guardado?.id) {
      const indice = recursosRepositorio.findIndex((fila) => Number(fila.id) === Number(guardado.id));
      if (indice >= 0) {
        $("repositorio-selector").value = String(indice);
        llenarRecursoRepositorio(recursosRepositorio[indice]);
      }
    }

    mostrarMensaje(id ? "Recurso actualizado correctamente." : "Recurso agregado correctamente.", "exito");
  }

  async function eliminarRecursoRepositorio() {
    const id = $("rep-id").value.trim();
    if (!id) return;

    const fila = recursosRepositorio.find((item) => String(item.id) === id);
    if (!fila) throw new Error("No se encontró el recurso seleccionado.");

    const aceptar = window.confirm(
      '¿Eliminar "' + fila.titulo + '" del Repositorio Accesible?\n\nEsta acción retirará la tarjeta de Supabase.'
    );
    if (!aceptar) return;

    const resultado = await rest(
      "repositorio_recursos?id=eq." + encodeURIComponent(id),
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" }
      }
    );

    if (!Array.isArray(resultado) || !resultado.length) {
      throw new Error("No se pudo eliminar el recurso.");
    }

    await cargarRepositorio();
    nuevoRecursoRepositorio();
    mostrarMensaje("Recurso eliminado correctamente.", "exito");
  }


  const STORAGE_BUCKET_EVA = "eva-publico";
  const STORAGE_NOTICIAS_BASE = SUPABASE_URL + "/storage/v1/object/public/" + STORAGE_BUCKET_EVA + "/";

  function resolverVistaPreviaNoticia(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^imagenes\/noticias\/[a-z0-9._/-]+$/i.test(texto)) {
      return "https://crebeucayali.github.io/" + texto;
    }
    return texto;
  }

  function mostrarVistaPreviaNoticia(origen, mensaje) {
    const panel = $("not-imagen-panel");
    const imagen = $("not-imagen-preview");
    const estado = $("not-imagen-estado");
    const url = String(origen || "").trim();

    if (!url) {
      panel.hidden = true;
      imagen.removeAttribute("src");
      estado.textContent = "";
      return;
    }

    imagen.src = resolverVistaPreviaNoticia(url);
    estado.textContent = mensaje || "Imagen actual de la noticia.";
    panel.hidden = false;
  }

  function validarArchivoImagenNoticia(archivo) {
    if (!archivo) return null;
    const permitidos = new Set(["image/webp", "image/jpeg", "image/png"]);
    if (!permitidos.has(archivo.type)) {
      throw new Error("La imagen debe estar en formato WebP, JPG/JPEG o PNG.");
    }
    if (!archivo.size) {
      throw new Error("El archivo de imagen está vacío.");
    }
    if (archivo.size > 5 * 1024 * 1024) {
      throw new Error("La imagen supera el máximo permitido de 5 MB.");
    }
    return archivo;
  }

  function extensionImagenNoticia(archivo) {
    if (archivo.type === "image/webp") return "webp";
    if (archivo.type === "image/png") return "png";
    return "jpg";
  }

  function identificadorArchivoNoticia() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID().toLowerCase();
    }
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function rutaStorageNoticia(archivo) {
    return "noticias/" + Date.now() + "-" + identificadorArchivoNoticia() + "." + extensionImagenNoticia(archivo);
  }

  function esImagenStorageNoticias(valor) {
    try {
      const url = new URL(String(valor || "").trim());
      return (
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "dteimbhwtzghhsijeeld.supabase.co" &&
        /^\/storage\/v1\/object\/public\/eva-publico\/noticias\/[a-z0-9._/-]+$/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  async function subirImagenNoticia(archivo) {
    validarArchivoImagenNoticia(archivo);
    await refrescarSesionSiHaceFalta();

    const estado = await comprobarAutorizacion();
    if (!estado.autorizado || estado.aal !== "aal2") {
      throw new Error("La carga de imágenes requiere una sesión administrativa con MFA AAL2.");
    }

    const ruta = rutaStorageNoticia(archivo);
    const rutaCodificada = ruta.split("/").map(encodeURIComponent).join("/");

    await solicitar(
      SUPABASE_URL + "/storage/v1/object/" + encodeURIComponent(STORAGE_BUCKET_EVA) + "/" + rutaCodificada,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: "Bearer " + sesion.access_token,
          "Content-Type": archivo.type,
          Accept: "application/json",
          "Cache-Control": "3600",
          "x-upsert": "false"
        },
        body: archivo
      }
    );

    return {
      ruta,
      url: STORAGE_NOTICIAS_BASE + ruta
    };
  }

  function llenarNoticiaDestacada(fila) {
    $("not-id").value = fila?.id || "";
    $("not-categoria").value = fila?.categoria || "Noticia destacada";
    $("not-titulo").value = fila?.titulo || "";
    $("not-descripcion").value = fila?.descripcion || "";
    $("not-imagen").value = fila?.imagen_url || "";
    $("not-enlace").value = fila?.enlace_url || "";
    $("not-estado-publicacion").value = fila?.estado_publicacion || (fila?.visible === false ? "borrador" : "publicado");
    $("boton-eliminar-noticia").hidden = !fila?.id;
    archivoNoticiaSeleccionado = null;
    $("not-archivo").value = "";
    mostrarVistaPreviaNoticia(
      fila?.imagen_url || "",
      fila?.imagen_url ? "Imagen actualmente asociada a la noticia." : ""
    );
  }

  async function cargarNoticiasDestacadas() {
    noticiasDestacadas = await rest(
      "noticias_destacadas?select=*&order=orden.asc,id.asc",
      { method: "GET" }
    );

    const selector = $("noticia-selector");
    selector.replaceChildren();

    const vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = "Seleccionar noticia";
    selector.appendChild(vacio);

    noticiasDestacadas.forEach((fila, indice) => {
      const opcion = document.createElement("option");
      opcion.value = String(indice);
      opcion.textContent =
        fila.categoria + " · " + fila.titulo +
        " · " + ({
          borrador: "Borrador",
          publicado: "Publicado",
          archivado: "Archivado"
        }[fila.estado_publicacion] || (fila.visible === false ? "Borrador" : "Publicado"));
      selector.appendChild(opcion);
    });

    llenarNoticiaDestacada(null);
    window.EvaPublicacion?.cargar("noticias").catch(() => {});
  }

  function nuevaNoticiaDestacada() {
    $("noticia-selector").value = "";
    llenarNoticiaDestacada(null);
    $("not-titulo").focus();
    mostrarMensaje("");
  }

  function validarImagenNoticia(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^imagenes\/noticias\/[a-z0-9._/-]+$/i.test(texto)) return texto;
    if (esImagenStorageNoticias(texto)) return new URL(texto).href;

    try {
      const url = new URL(texto);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "crebeucayali.github.io") {
        throw new Error();
      }
      return url.href;
    } catch {
      throw new Error("La imagen debe pertenecer a Noticias del EVA o al Storage institucional autorizado.");
    }
  }

  function validarEnlaceNoticia(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    try {
      const url = new URL(texto);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "crebeucayali.github.io") {
        throw new Error();
      }
      return url.href;
    } catch {
      throw new Error("El enlace para ampliar debe pertenecer a crebeucayali.github.io.");
    }
  }

  function siguienteOrdenNoticia() {
    const ordenes = noticiasDestacadas.map((fila) => Number(fila.orden || 0));
    return (ordenes.length ? Math.max(...ordenes) : 0) + 1;
  }

  function normalizarTituloNoticia(valor) {
    return String(valor || "").trim().toLocaleLowerCase("es");
  }

  function validarTituloNoticiaUnico(titulo, idActual = "") {
    const normalizado = normalizarTituloNoticia(titulo);
    const repetida = noticiasDestacadas.find((fila) =>
      String(fila.id) !== String(idActual || "") &&
      normalizarTituloNoticia(fila.titulo) === normalizado
    );

    if (repetida) {
      throw new Error('Ya existe una noticia con el título "' + repetida.titulo + '". Cambia el título o edita la noticia existente.');
    }
  }

  async function guardarNoticiaDestacada() {
    const id = $("not-id").value.trim();
    const categoria = $("not-categoria").value.trim();
    const titulo = $("not-titulo").value.trim();
    const descripcion = $("not-descripcion").value.trim();

    if (!categoria) throw new Error("La categoría es obligatoria.");
    if (!titulo) throw new Error("El título es obligatorio.");
    if (!descripcion) throw new Error("La síntesis breve es obligatoria.");

    validarTituloNoticiaUnico(titulo, id);

    const existente = id
      ? noticiasDestacadas.find((fila) => String(fila.id) === id)
      : null;

    let imagenUrl = validarImagenNoticia($("not-imagen").value);

    if (archivoNoticiaSeleccionado) {
      mostrarMensaje("Subiendo imagen de la noticia a Supabase Storage…");
      const subida = await subirImagenNoticia(archivoNoticiaSeleccionado);
      imagenUrl = subida.url;
      $("not-imagen").value = imagenUrl;
      archivoNoticiaSeleccionado = null;
      $("not-archivo").value = "";
      mostrarVistaPreviaNoticia(imagenUrl, "Imagen subida a Storage. Pendiente de guardar la noticia.");
    }

    const payload = {
      orden: existente ? Number(existente.orden || 1) : siguienteOrdenNoticia(),
      categoria,
      titulo,
      descripcion,
      imagen_url: imagenUrl,
      enlace_url: validarEnlaceNoticia($("not-enlace").value),
      estado_publicacion: $("not-estado-publicacion").value,
      visible: $("not-estado-publicacion").value === "publicado",
      origen: existente?.origen || "panel_admin"
    };

    let resultado;

    if (id) {
      resultado = await rest("noticias_destacadas?id=eq." + encodeURIComponent(id), {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
    } else {
      resultado = await rest("noticias_destacadas", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
    }

    await cargarNoticiasDestacadas();

    const guardada = Array.isArray(resultado) ? resultado[0] : null;
    if (guardada?.id) {
      const indice = noticiasDestacadas.findIndex((fila) => Number(fila.id) === Number(guardada.id));
      if (indice >= 0) {
        $("noticia-selector").value = String(indice);
        llenarNoticiaDestacada(noticiasDestacadas[indice]);
      }
    }

    mostrarMensaje(id ? "Noticia actualizada correctamente." : "Noticia agregada correctamente.", "exito");
  }

  async function eliminarNoticiaDestacada() {
    const id = $("not-id").value.trim();
    if (!id) return;

    const fila = noticiasDestacadas.find((item) => String(item.id) === id);
    if (!fila) throw new Error("No se encontró la noticia seleccionada.");

    const aceptar = window.confirm(
      '¿Eliminar "' + fila.titulo + '" de Noticias destacadas?\n\nEsta acción retirará la tarjeta de la portada.'
    );
    if (!aceptar) return;

    const resultado = await rest(
      "noticias_destacadas?id=eq." + encodeURIComponent(id),
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" }
      }
    );

    if (!Array.isArray(resultado) || !resultado.length) {
      throw new Error("No se pudo eliminar la noticia.");
    }

    await cargarNoticiasDestacadas();
    nuevaNoticiaDestacada();
    mostrarMensaje("Noticia eliminada correctamente.", "exito");
  }


  function resolverVistaPreviaGaleria(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^imagenes-(galeria|calendario)\/[a-z0-9._/-]+$/i.test(texto)) {
      return "https://crebeucayali.github.io/accesos-complementarios/" + texto;
    }
    return texto;
  }

  function esImagenStorageGaleria(valor) {
    try {
      const url = new URL(String(valor || "").trim());
      return (
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "dteimbhwtzghhsijeeld.supabase.co" &&
        /^\/storage\/v1\/object\/public\/eva-publico\/galeria\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  function validarImagenGaleria(valor) {
    const texto = String(valor || "").trim();
    if (!texto) throw new Error("La imagen es obligatoria.");

    if (/^imagenes-(galeria|calendario)\/[a-z0-9._/-]+$/i.test(texto)) return texto;
    if (esImagenStorageGaleria(texto)) return new URL(texto).href;

    try {
      const url = new URL(texto);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "crebeucayali.github.io") {
        throw new Error();
      }
      return url.href;
    } catch {
      throw new Error("La imagen debe pertenecer a la Galería del EVA o al Storage institucional autorizado.");
    }
  }

  function rutaStorageGaleria(archivo, orden) {
    const fecha = $("gal-fecha").value || "sin-fecha";
    return (
      "galeria/" + fecha + "/" +
      String(orden).padStart(2, "0") + "-" +
      Date.now() + "-" + identificadorArchivoNoticia() +
      "." + extensionImagenNoticia(archivo)
    );
  }

  async function subirImagenGaleria(archivo, orden) {
    validarArchivoImagenNoticia(archivo);
    await refrescarSesionSiHaceFalta();

    const estado = await comprobarAutorizacion();
    if (!estado.autorizado || estado.aal !== "aal2") {
      throw new Error("La carga de imágenes requiere una sesión administrativa con MFA AAL2.");
    }

    const ruta = rutaStorageGaleria(archivo, orden);
    const rutaCodificada = ruta.split("/").map(encodeURIComponent).join("/");

    await solicitar(
      SUPABASE_URL + "/storage/v1/object/" + encodeURIComponent(STORAGE_BUCKET_EVA) + "/" + rutaCodificada,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: "Bearer " + sesion.access_token,
          "Content-Type": archivo.type,
          Accept: "application/json",
          "Cache-Control": "3600",
          "x-upsert": "false"
        },
        body: archivo
      }
    );

    return { ruta, url: STORAGE_NOTICIAS_BASE + ruta };
  }

  function limpiarPreviewTemporalGaleria(item) {
    if (item?.previewTemporal && item.previewUrl) {
      try { URL.revokeObjectURL(item.previewUrl); } catch {}
    }
  }

  function renderizarImagenesGaleriaEditor() {
    const contenedor = $("gal-imagenes-editor");
    contenedor.replaceChildren();

    if (!imagenesGaleriaEditor.length) {
      const vacio = document.createElement("p");
      vacio.className = "nota";
      vacio.textContent = "Aún no has seleccionado fotografías para esta actividad.";
      contenedor.appendChild(vacio);
      return;
    }

    imagenesGaleriaEditor.forEach((item, indice) => {
      const tarjeta = document.createElement("article");
      tarjeta.className = "imagen-admin-preview galeria-admin-foto";

      const imagen = document.createElement("img");
      imagen.src = item.previewUrl || resolverVistaPreviaGaleria(item.url);
      imagen.alt = "Vista previa de la fotografía " + (indice + 1);

      const info = document.createElement("div");
      info.className = "imagen-admin-preview-info";

      const titulo = document.createElement("p");
      titulo.className = "nota";
      titulo.textContent = "Fotografía " + (indice + 1) + " de " + imagenesGaleriaEditor.length;

      const etiqueta = document.createElement("label");
      etiqueta.textContent = "Texto alternativo de la fotografía " + (indice + 1);

      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 220;
      input.required = true;
      input.placeholder = "Describe brevemente lo que muestra esta fotografía";
      input.value = item.alt || "";
      input.addEventListener("input", () => {
        imagenesGaleriaEditor[indice].alt = input.value;
      });

      const retirar = document.createElement("button");
      retirar.type = "button";
      retirar.className = "secundario";
      retirar.textContent = "Retirar fotografía";
      retirar.addEventListener("click", () => {
        limpiarPreviewTemporalGaleria(imagenesGaleriaEditor[indice]);
        imagenesGaleriaEditor.splice(indice, 1);
        renderizarImagenesGaleriaEditor();
        mostrarMensaje("Fotografía retirada de la actividad. El cambio se aplicará al guardar.");
      });

      etiqueta.appendChild(input);
      info.append(titulo, etiqueta, retirar);
      tarjeta.append(imagen, info);
      contenedor.appendChild(tarjeta);
    });
  }

  function gestionarArchivosGaleria(evento) {
    try {
      const archivos = Array.from(evento.target.files || []);
      if (!archivos.length) return;

      if (imagenesGaleriaEditor.length + archivos.length > MAX_FOTOGRAFIAS_GALERIA) {
        throw new Error("Cada actividad puede contener un máximo de " + MAX_FOTOGRAFIAS_GALERIA + " fotografías. Puedes agregar un máximo de " + (MAX_FOTOGRAFIAS_GALERIA - imagenesGaleriaEditor.length) + " más.");
      }

      archivos.forEach(validarArchivoImagenNoticia);
      archivos.forEach((archivo) => {
        imagenesGaleriaEditor.push({
          url: "",
          alt: "",
          archivo,
          previewUrl: URL.createObjectURL(archivo),
          previewTemporal: true
        });
      });

      evento.target.value = "";
      renderizarImagenesGaleriaEditor();
      mostrarMensaje("");
    } catch (error) {
      evento.target.value = "";
      mostrarMensaje(error.message, "error");
    }
  }

  function llenarGaleriaAdmin(fila) {
    $("gal-id").value = fila?.id || "";
    $("gal-fecha").value = fila?.fecha || "";
    $("gal-titulo").value = fila?.titulo || "";
    $("gal-descripcion").value = fila?.descripcion || "";
    $("gal-estado-publicacion").value = fila?.estado_publicacion || (fila?.visible === false ? "borrador" : "publicado");
    $("gal-autorizada").checked = fila?.publicacion_autorizada === true;
    $("boton-eliminar-foto").hidden = !fila?.id;
    $("gal-imagen-archivo").value = "";

    imagenesGaleriaEditor.forEach(limpiarPreviewTemporalGaleria);

    const imagenes = Array.isArray(fila?.imagenes) && fila.imagenes.length
      ? fila.imagenes
      : (fila?.imagen_url ? [{
          orden: 1,
          imagen_url: fila.imagen_url,
          imagen_alt: fila.imagen_alt || ""
        }] : []);

    imagenesGaleriaEditor = imagenes
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))
      .slice(0, MAX_FOTOGRAFIAS_GALERIA)
      .map((imagen) => ({
        url: imagen.imagen_url,
        alt: imagen.imagen_alt || "",
        archivo: null,
        previewUrl: "",
        previewTemporal: false
      }));

    renderizarImagenesGaleriaEditor();
  }

  async function cargarGaleriaAdmin() {
    const [items, imagenes] = await Promise.all([
      rest("galeria_items?select=*&order=orden.desc,id.desc", { method: "GET" }),
      rest("galeria_item_imagenes?select=id,galeria_item_id,orden,imagen_url,imagen_alt&order=galeria_item_id.asc,orden.asc", { method: "GET" })
    ]);

    const porItem = new Map();
    (Array.isArray(imagenes) ? imagenes : []).forEach((imagen) => {
      const clave = String(imagen.galeria_item_id);
      if (!porItem.has(clave)) porItem.set(clave, []);
      porItem.get(clave).push(imagen);
    });

    galeriaItems = (Array.isArray(items) ? items : []).map((fila) => ({
      ...fila,
      imagenes: porItem.get(String(fila.id)) || []
    }));

    const selector = $("galeria-selector");
    selector.replaceChildren();

    const vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = "Seleccionar actividad";
    selector.appendChild(vacio);

    galeriaItems.forEach((fila, indice) => {
      const opcion = document.createElement("option");
      opcion.value = String(indice);
      const fecha = fila.fecha ? fila.fecha + " · " : "";
      const cantidad = fila.imagenes?.length || (fila.imagen_url ? 1 : 0);
      opcion.textContent =
        fecha + fila.titulo + " · " + cantidad + (cantidad === 1 ? " foto" : " fotos") +
        " · " + ({
          borrador: "Borrador",
          publicado: "Publicado",
          archivado: "Archivado"
        }[fila.estado_publicacion] || (fila.visible === false ? "Borrador" : "Publicado")) +
        (fila.publicacion_autorizada === false ? " · Sin autorización" : "");
      selector.appendChild(opcion);
    });

    llenarGaleriaAdmin(null);
    window.EvaPublicacion?.cargar("galeria").catch(() => {});
  }

  function nuevaFotoGaleria() {
    $("galeria-selector").value = "";
    llenarGaleriaAdmin(null);
    $("gal-fecha").value = "";
    $("gal-estado-publicacion").value = "borrador";
    $("gal-autorizada").checked = false;
    $("gal-titulo").focus();
    mostrarMensaje("");
  }

  function siguienteOrdenGaleria() {
    const ordenes = galeriaItems.map((fila) => Number(fila.orden || 0));
    return (ordenes.length ? Math.max(...ordenes) : 0) + 1;
  }

  async function guardarImagenesGaleria(galeriaItemId, imagenes) {
    await rest(
      "galeria_item_imagenes?galeria_item_id=eq." + encodeURIComponent(galeriaItemId),
      { method: "DELETE", headers: { Prefer: "return=minimal" } }
    );

    const filas = imagenes.map((imagen, indice) => ({
      galeria_item_id: Number(galeriaItemId),
      orden: indice + 1,
      imagen_url: imagen.url,
      imagen_alt: imagen.alt
    }));

    await rest("galeria_item_imagenes", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(filas)
    });
  }

  async function guardarFotoGaleria() {
    const id = $("gal-id").value.trim();
    const titulo = $("gal-titulo").value.trim();
    const descripcion = $("gal-descripcion").value.trim();
    const estadoPublicacion = $("gal-estado-publicacion").value;
    const visible = estadoPublicacion === "publicado";
    const autorizada = $("gal-autorizada").checked;

    if (!titulo) throw new Error("El título de la actividad es obligatorio.");
    if (imagenesGaleriaEditor.length < 1 || imagenesGaleriaEditor.length > MAX_FOTOGRAFIAS_GALERIA) {
      throw new Error("La actividad debe contener entre 1 y " + MAX_FOTOGRAFIAS_GALERIA + " fotografías.");
    }

    imagenesGaleriaEditor.forEach((imagen, indice) => {
      if (!String(imagen.alt || "").trim()) {
        throw new Error("Completa el texto alternativo de la fotografía " + (indice + 1) + ".");
      }
    });

    if (visible && !autorizada) {
      throw new Error("Para publicar la actividad debes confirmar primero que sus fotografías están autorizadas para publicación institucional.");
    }

    const existente = id
      ? galeriaItems.find((fila) => String(fila.id) === id)
      : null;

    const imagenesFinales = [];
    for (let indice = 0; indice < imagenesGaleriaEditor.length; indice += 1) {
      const item = imagenesGaleriaEditor[indice];
      let url = item.url;

      if (item.archivo) {
        mostrarMensaje(
          "Subiendo fotografía " + (indice + 1) + " de " + imagenesGaleriaEditor.length + " a Supabase Storage…"
        );
        const subida = await subirImagenGaleria(item.archivo, indice + 1);
        url = subida.url;
      }

      imagenesFinales.push({
        url: validarImagenGaleria(url),
        alt: String(item.alt || "").trim()
      });
    }

    const principal = imagenesFinales[0];
    const payload = {
      orden: existente ? Number(existente.orden || 1) : siguienteOrdenGaleria(),
      fecha: $("gal-fecha").value || null,
      titulo,
      descripcion,
      imagen_url: principal.url,
      imagen_alt: principal.alt,
      publicacion_autorizada: autorizada,
      estado_publicacion: estadoPublicacion,
      visible,
      origen: existente?.origen || "panel_admin"
    };

    let resultado;
    if (id) {
      resultado = await rest("galeria_items?id=eq." + encodeURIComponent(id), {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
    } else {
      resultado = await rest("galeria_items", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
    }

    const guardada = Array.isArray(resultado) ? resultado[0] : null;
    const galeriaItemId = guardada?.id || Number(id);
    if (!galeriaItemId) throw new Error("No se pudo identificar la actividad guardada.");

    await guardarImagenesGaleria(galeriaItemId, imagenesFinales);

    imagenesGaleriaEditor.forEach(limpiarPreviewTemporalGaleria);
    await cargarGaleriaAdmin();

    const indiceGuardado = galeriaItems.findIndex((fila) => Number(fila.id) === Number(galeriaItemId));
    if (indiceGuardado >= 0) {
      $("galeria-selector").value = String(indiceGuardado);
      llenarGaleriaAdmin(galeriaItems[indiceGuardado]);
    }

    mostrarMensaje(
      id ? "Actividad actualizada correctamente." : "Actividad agregada correctamente.",
      "exito"
    );
  }

  async function eliminarFotoGaleria() {
    const id = $("gal-id").value.trim();
    if (!id) return;

    const fila = galeriaItems.find((item) => String(item.id) === id);
    if (!fila) throw new Error("No se encontró la actividad seleccionada.");

    const aceptar = window.confirm(
      '¿Eliminar "' + fila.titulo + '" de la Galería?\n\nLa actividad y sus fotografías dejarán de mostrarse.'
    );
    if (!aceptar) return;

    const resultado = await rest(
      "galeria_items?id=eq." + encodeURIComponent(id),
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" }
      }
    );

    if (!Array.isArray(resultado) || !resultado.length) {
      throw new Error("No se pudo eliminar la actividad.");
    }

    await cargarGaleriaAdmin();
    nuevaFotoGaleria();
    mostrarMensaje("Actividad eliminada correctamente.", "exito");
  }

  const NOMBRES_MODULOS = {
    principal: "Plataforma principal",
    capacitaciones: "Capacitaciones",
    bda: "Banco Digital Accesible",
    mea: "Materiales Educativos Accesibles",
    noti_inclusivos: "Noti Inclusivos",
    repositorio_accesible: "Repositorio Accesible",
    dua_3: "DUA 3.0",
    accesos_complementarios: "Accesos Complementarios"
  };

  function numeroES(valor) {
    return new Intl.NumberFormat("es-PE").format(Number(valor || 0));
  }

  function porcentajeES(valor) {
    return new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(Number(valor || 0)) + " %";
  }

  function fechaEstadistica(fecha, opciones) {
    if (!fecha) return "";
    const [anio, mes, dia] = String(fecha).slice(0, 10).split("-").map(Number);
    if (!anio || !mes || !dia) return String(fecha);
    return new Intl.DateTimeFormat("es-PE", {
      timeZone: "UTC",
      ...opciones
    }).format(new Date(Date.UTC(anio, mes - 1, dia)));
  }

  function renderEstadisticasMensuales(filas) {
    const contenedor = $("estadisticas-mensual");
    contenedor.replaceChildren();

    const datos = Array.isArray(filas) ? filas : [];
    const maximo = Math.max(0, ...datos.map((fila) => Number(fila.visitas || 0)));

    datos.forEach((fila) => {
      const visitas = Number(fila.visitas || 0);
      const porcentaje = maximo > 0 ? (visitas / maximo) * 100 : 0;

      const item = document.createElement("div");
      item.className = "estadistica-mes-fila";
      item.setAttribute("role", "listitem");

      const etiqueta = document.createElement("span");
      etiqueta.className = "estadistica-mes-etiqueta";
      etiqueta.textContent = fechaEstadistica(fila.mes, { month: "short", year: "numeric" });

      const pista = document.createElement("span");
      pista.className = "estadistica-barra-pista";

      const barra = document.createElement("span");
      barra.className = "estadistica-barra-valor";
      barra.style.width = porcentaje + "%";
      pista.appendChild(barra);

      const valor = document.createElement("strong");
      valor.className = "estadistica-mes-valor";
      valor.textContent = numeroES(visitas);

      item.setAttribute(
        "aria-label",
        etiqueta.textContent + ": " + numeroES(visitas) + (visitas === 1 ? " sesión EVA" : " sesiones EVA")
      );
      item.append(etiqueta, pista, valor);
      contenedor.appendChild(item);
    });
  }

  function renderEstadisticasDiarias(filas) {
    const contenedor = $("estadisticas-diarias");
    contenedor.replaceChildren();

    const datos = Array.isArray(filas) ? filas : [];
    const maximo = Math.max(0, ...datos.map((fila) => Number(fila.visitas || 0)));

    datos.forEach((fila, indice) => {
      const visitas = Number(fila.visitas || 0);
      const altura = maximo > 0 ? Math.max(visitas > 0 ? 8 : 0, (visitas / maximo) * 100) : 0;

      const columna = document.createElement("span");
      columna.className = "estadistica-dia-columna";
      columna.setAttribute("role", "listitem");
      columna.setAttribute(
        "aria-label",
        fechaEstadistica(fila.fecha, { day: "numeric", month: "long", year: "numeric" }) +
        ": " + numeroES(visitas) + (visitas === 1 ? " sesión EVA" : " sesiones EVA")
      );
      columna.title = columna.getAttribute("aria-label");

      const barra = document.createElement("span");
      barra.className = "estadistica-dia-barra";
      barra.style.height = altura + "%";

      const etiqueta = document.createElement("span");
      etiqueta.className = "estadistica-dia-etiqueta";
      const mostrarEtiqueta =
        indice === 0 ||
        indice === datos.length - 1 ||
        (indice + 1) % 7 === 0;
      etiqueta.textContent = mostrarEtiqueta
        ? fechaEstadistica(fila.fecha, { day: "2-digit", month: "2-digit" })
        : "";
      etiqueta.setAttribute("aria-hidden", "true");

      columna.append(barra, etiqueta);
      contenedor.appendChild(columna);
    });
  }

  function renderDistribucionModulos(resumen) {
    const cuerpo = $("estadisticas-modulos");
    cuerpo.replaceChildren();

    const filas = Array.isArray(resumen?.modulos) ? resumen.modulos : [];
    const mapa = new Map(filas.map((fila) => [fila.modulo, Number(fila.visitas || 0)]));
    const totalAccesosModulos = Object.keys(NOMBRES_MODULOS)
      .reduce((total, id) => total + Number(mapa.get(id) || 0), 0);

    Object.entries(NOMBRES_MODULOS).forEach(([id, nombre]) => {
      const visitas = Number(mapa.get(id) || 0);
      const participacion = totalAccesosModulos > 0
        ? (visitas / totalAccesosModulos) * 100
        : 0;

      const tr = document.createElement("tr");
      const tdNombre = document.createElement("td");
      const tdVisitas = document.createElement("td");
      const tdParticipacion = document.createElement("td");

      tdNombre.textContent = nombre;
      tdVisitas.textContent = numeroES(visitas);
      tdVisitas.className = "estadistica-numero";

      const grupo = document.createElement("div");
      grupo.className = "estadistica-participacion";

      const pista = document.createElement("span");
      pista.className = "estadistica-participacion-pista";
      pista.setAttribute("aria-hidden", "true");

      const barra = document.createElement("span");
      barra.className = "estadistica-participacion-valor";
      barra.style.width = participacion + "%";
      pista.appendChild(barra);

      const texto = document.createElement("span");
      texto.className = "estadistica-participacion-texto";
      texto.textContent = porcentajeES(participacion);

      grupo.append(pista, texto);
      tdParticipacion.appendChild(grupo);

      tr.append(tdNombre, tdVisitas, tdParticipacion);
      cuerpo.appendChild(tr);
    });
  }

  async function cargarEstadisticasPeriodo(periodo) {
    const valorPeriodo = periodo || $("est-periodo")?.value || "30d";
    const datos = await rest("rpc/estadisticas_visitas_eva_periodo", {
      method: "POST",
      body: JSON.stringify({ p_periodo: valorPeriodo })
    });

    const resumen = Array.isArray(datos) ? datos[0] : datos;
    $("est-periodo-sesiones").textContent = numeroES(resumen?.sesiones);

    const desde = resumen?.fecha_desde
      ? fechaEstadistica(resumen.fecha_desde, { day: "numeric", month: "short", year: "numeric" })
      : "";
    const hasta = resumen?.fecha_hasta
      ? fechaEstadistica(resumen.fecha_hasta, { day: "numeric", month: "short", year: "numeric" })
      : "";

    $("est-periodo-rango").textContent =
      desde && hasta
        ? desde + " – " + hasta
        : "Sin datos disponibles para este periodo.";

    renderDistribucionModulos(resumen);
  }

  async function cargarEstadisticasVisitas() {
    const datos = await rest("rpc/estadisticas_visitas_eva", {
      method: "POST",
      body: "{}"
    });

    const resumen = Array.isArray(datos) ? datos[0] : datos;
    $("est-total").textContent = numeroES(resumen?.total);
    $("est-hoy").textContent = numeroES(resumen?.hoy);
    $("est-7dias").textContent = numeroES(resumen?.ultimos_7_dias);
    $("est-mes").textContent = numeroES(resumen?.mes_actual);

    $("est-desde").textContent = resumen?.inicio_medicion
      ? "Datos disponibles desde " + fechaEstadistica(resumen.inicio_medicion, {
          day: "numeric",
          month: "long",
          year: "numeric"
        }) + "."
      : "Aún no hay sesiones EVA registradas.";

    renderEstadisticasMensuales(resumen?.mensual_6_meses);
    renderEstadisticasDiarias(resumen?.diario_30_dias);
    await cargarEstadisticasPeriodo($("est-periodo")?.value || "30d");
  }


  const NOMBRES_MODULOS_COMPARTIDOS = { ...NOMBRES_MODULOS, galeria: "Galería" };

  function renderDistribucionCompartidos(resumen) {
    const cuerpo = $("compartidos-modulos");
    cuerpo.replaceChildren();

    const filas = Array.isArray(resumen?.modulos) ? resumen.modulos : [];
    const mapa = new Map(filas.map((fila) => [fila.modulo, Number(fila.acciones || 0)]));
    const total = Object.keys(NOMBRES_MODULOS_COMPARTIDOS)
      .reduce((acumulado, id) => acumulado + Number(mapa.get(id) || 0), 0);

    Object.entries(NOMBRES_MODULOS_COMPARTIDOS).forEach(([id, nombre]) => {
      const acciones = Number(mapa.get(id) || 0);
      const participacion = total > 0 ? (acciones / total) * 100 : 0;
      const tr = document.createElement("tr");
      const tdNombre = document.createElement("td");
      const tdAcciones = document.createElement("td");
      const tdParticipacion = document.createElement("td");
      tdNombre.textContent = nombre;
      tdAcciones.textContent = numeroES(acciones);
      tdAcciones.className = "estadistica-numero";

      const grupo = document.createElement("div");
      grupo.className = "estadistica-participacion";
      const pista = document.createElement("span");
      pista.className = "estadistica-participacion-pista";
      pista.setAttribute("aria-hidden", "true");
      const barra = document.createElement("span");
      barra.className = "estadistica-participacion-valor";
      barra.style.width = participacion + "%";
      pista.appendChild(barra);
      const texto = document.createElement("span");
      texto.className = "estadistica-participacion-texto";
      texto.textContent = porcentajeES(participacion);
      grupo.append(pista, texto);
      tdParticipacion.appendChild(grupo);
      tr.append(tdNombre, tdAcciones, tdParticipacion);
      cuerpo.appendChild(tr);
    });
  }

  function renderPaginasCompartidas(resumen) {
    const cuerpo = $("compartidos-paginas");
    cuerpo.replaceChildren();
    const filas = Array.isArray(resumen?.paginas_top) ? resumen.paginas_top : [];

    if (!filas.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = "Aún no hay acciones de compartir registradas en este periodo.";
      tr.appendChild(td);
      cuerpo.appendChild(tr);
      return;
    }

    filas.forEach((fila) => {
      const tr = document.createElement("tr");
      const tdPagina = document.createElement("td");
      const tdModulo = document.createElement("td");
      const tdAcciones = document.createElement("td");
      tdPagina.textContent = String(fila.pagina || "/");
      tdPagina.className = "estadistica-ruta";
      if (fila.modulo === "galeria" && /^\/accesos-complementarios\/recursos\/galeria\.html#actividad-[1-9][0-9]{0,18}$/.test(fila.pagina)) {
        const enlace = document.createElement("a");
        enlace.href = "https://crebeucayali.github.io" + fila.pagina;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        enlace.textContent = fila.etiqueta_galeria || fila.pagina;
        tdPagina.replaceChildren(enlace);
      }
      tdModulo.textContent = NOMBRES_MODULOS_COMPARTIDOS[fila.modulo] || String(fila.modulo || "");
      tdAcciones.textContent = numeroES(fila.acciones);
      tdAcciones.className = "estadistica-numero";
      tr.append(tdPagina, tdModulo, tdAcciones);
      cuerpo.appendChild(tr);
    });
  }

  async function cargarEstadisticasCompartidosPeriodo(periodo) {
    const valorPeriodo = periodo || $("comp-periodo")?.value || "30d";
    const datos = await rest("rpc/estadisticas_compartidos_eva_periodo", {
      method: "POST",
      body: JSON.stringify({ p_periodo: valorPeriodo })
    });
    const resumen = Array.isArray(datos) ? datos[0] : datos;
    $("comp-periodo-acciones").textContent = numeroES(resumen?.acciones);

    const desde = resumen?.fecha_desde
      ? fechaEstadistica(resumen.fecha_desde, { day: "numeric", month: "short", year: "numeric" })
      : "";
    const hasta = resumen?.fecha_hasta
      ? fechaEstadistica(resumen.fecha_hasta, { day: "numeric", month: "short", year: "numeric" })
      : "";

    $("comp-periodo-rango").textContent =
      desde && hasta ? desde + " – " + hasta : "Sin datos disponibles para este periodo.";

    const paginasGaleria = (resumen?.paginas_top || []).filter(fila =>
      fila.modulo === "galeria" && /^\/accesos-complementarios\/recursos\/galeria\.html#actividad-[1-9][0-9]{0,18}$/.test(fila.pagina));
    if (paginasGaleria.length) {
      const ids = [...new Set(paginasGaleria.map(fila => fila.pagina.split("#actividad-")[1]))];
      try {
        const actividades = await rest("galeria_items?select=id,titulo,fecha&id=in.(" + ids.join(",") + ")");
        const etiquetas = new Map(actividades.map(item => [String(item.id), [item.titulo,
          item.fecha ? fechaEstadistica(item.fecha, { day: "numeric", month: "long", year: "numeric" }) : ""].filter(Boolean).join(" · ")]));
        paginasGaleria.forEach(fila => { fila.etiqueta_galeria = etiquetas.get(fila.pagina.split("#actividad-")[1]); });
      } catch {
        // La ruta sigue identificando la actividad si su título ya no está disponible.
      }
    }
    renderDistribucionCompartidos(resumen);
    renderPaginasCompartidas(resumen);
  }

  async function cargarEstadisticasCompartidos() {
    const datos = await rest("rpc/estadisticas_compartidos_eva", {
      method: "POST",
      body: "{}"
    });
    const resumen = Array.isArray(datos) ? datos[0] : datos;
    $("comp-total").textContent = numeroES(resumen?.total);
    $("comp-hoy").textContent = numeroES(resumen?.hoy);
    $("comp-7dias").textContent = numeroES(resumen?.ultimos_7_dias);
    $("comp-mes").textContent = numeroES(resumen?.mes_actual);
    $("comp-desde").textContent = resumen?.inicio_medicion
      ? "Datos disponibles desde " + fechaEstadistica(resumen.inicio_medicion, {
          day: "numeric", month: "long", year: "numeric"
        }) + "."
      : "Aún no hay acciones de compartir registradas.";

    await cargarEstadisticasCompartidosPeriodo($("comp-periodo")?.value || "30d");
  }

  document.querySelectorAll(".tab").forEach((boton) => {
    boton.addEventListener("click", () => {
      if (!permitePanel(boton.dataset.panel)) return;
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("activo", x === boton));
      $("panel-inicio").hidden = true;
      $("panel-capacitaciones").hidden = boton.dataset.panel !== "capacitaciones";
      $("panel-calendario").hidden = boton.dataset.panel !== "calendario";
      $("panel-repositorio").hidden = boton.dataset.panel !== "repositorio";
      $("panel-noticias").hidden = boton.dataset.panel !== "noticias";
      $("panel-galeria").hidden = boton.dataset.panel !== "galeria";
      $("panel-estadisticas").hidden = boton.dataset.panel !== "estadisticas";
      $("panel-usuarios").hidden = boton.dataset.panel !== "usuarios";
      if (boton.dataset.panel === "usuarios") {
        window.EvaUsuarios?.cargar().catch(error => mostrarMensaje(error.message,"error"));
      }
      if (boton.dataset.panel === "estadisticas") {
        Promise.all([
          cargarEstadisticasVisitas(),
          cargarEstadisticasCompartidos()
        ]).catch((error) => mostrarMensaje(error.message, "error"));
      }
      mostrarMensaje("");
    });
  });

  $("sesion-selector").addEventListener("change", (evento) => {
    llenarCapacitacion(capacitaciones[Number(evento.target.value)]);
  });

  $("cap-flyer-archivo").addEventListener("change", (evento) => {
    gestionarArchivoCapacitacion("flyer", evento);
  });

  $("cap-infografia-archivo").addEventListener("change", (evento) => {
    gestionarArchivoCapacitacion("infografia", evento);
  });

  $("cap-flyer-retirar").addEventListener("click", () => {
    archivoCapFlyerSeleccionado = null;
    $("cap-flyer-archivo").value = "";
    $("cap-flyer").value = "";
    mostrarVistaPreviaCapacitacion("flyer", "", "");
    mostrarMensaje("El flyer se retirará al guardar los cambios de la sesión.");
  });

  $("cap-infografia-retirar").addEventListener("click", () => {
    archivoCapInfografiaSeleccionado = null;
    $("cap-infografia-archivo").value = "";
    $("cap-infografia").value = "";
    mostrarVistaPreviaCapacitacion("infografia", "", "");
    mostrarMensaje("La infografía se retirará al guardar los cambios de la sesión.");
  });

  $("actividad-selector").addEventListener("change", (evento) => {
    const valor = evento.target.value;
    if (valor === "") return nuevaActividad();
    llenarActividad(actividades[Number(valor)]);
  });

  $("boton-nueva-actividad").addEventListener("click", nuevaActividad);

  $("repositorio-selector").addEventListener("change", (evento) => {
    const valor = evento.target.value;
    if (valor === "") return nuevoRecursoRepositorio();
    llenarRecursoRepositorio(recursosRepositorio[Number(valor)]);
  });

  $("rep-categoria").addEventListener("change", (evento) => {
    const categoria = evento.target.value;
    const idActual = $("rep-id").value.trim();
    actualizarSelectorRepositorio(categoria, idActual);
  });

  $("boton-nuevo-recurso").addEventListener("click", nuevoRecursoRepositorio);

  $("rep-imagen-archivo").addEventListener("change", gestionarArchivoRepositorio);

  $("rep-imagen-retirar").addEventListener("click", () => {
    archivoRepositorioSeleccionado = null;
    $("rep-imagen-archivo").value = "";
    $("rep-imagen").value = "";
    $("rep-alt").value = "";
    mostrarVistaPreviaRepositorio("", "");
    mostrarMensaje("La imagen se retirará al guardar el recurso.");
  });

  $("boton-eliminar-recurso").addEventListener("click", async () => {
    try {
      await eliminarRecursoRepositorio();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("noticia-selector").addEventListener("change", (evento) => {
    const valor = evento.target.value;
    if (valor === "") return nuevaNoticiaDestacada();
    llenarNoticiaDestacada(noticiasDestacadas[Number(valor)]);
  });

  $("boton-nueva-noticia").addEventListener("click", nuevaNoticiaDestacada);

  $("not-archivo").addEventListener("change", (evento) => {
    try {
      const archivo = validarArchivoImagenNoticia(evento.target.files?.[0] || null);
      archivoNoticiaSeleccionado = archivo;
      if (!archivo) {
        mostrarVistaPreviaNoticia($("not-imagen").value, $("not-imagen").value ? "Imagen actualmente asociada a la noticia." : "");
        return;
      }

      const lector = new FileReader();
      lector.addEventListener("load", () => {
        mostrarVistaPreviaNoticia(
          lector.result,
          archivo.name + " · " + Math.max(1, Math.round(archivo.size / 1024)) + " KB · preparada para subir"
        );
      });
      lector.readAsDataURL(archivo);
      mostrarMensaje("");
    } catch (error) {
      archivoNoticiaSeleccionado = null;
      evento.target.value = "";
      mostrarVistaPreviaNoticia($("not-imagen").value, $("not-imagen").value ? "Imagen actualmente asociada a la noticia." : "");
      mostrarMensaje(error.message, "error");
    }
  });

  $("boton-retirar-imagen-noticia").addEventListener("click", () => {
    archivoNoticiaSeleccionado = null;
    $("not-archivo").value = "";
    $("not-imagen").value = "";
    mostrarVistaPreviaNoticia("", "");
    mostrarMensaje("La noticia se guardará sin una imagen propia y utilizará el respaldo visual del carrusel.");
  });

  $("boton-eliminar-noticia").addEventListener("click", async () => {
    try {
      await eliminarNoticiaDestacada();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("galeria-selector").addEventListener("change", (evento) => {
    const valor = evento.target.value;
    if (valor === "") return nuevaFotoGaleria();
    llenarGaleriaAdmin(galeriaItems[Number(valor)]);
  });

  $("boton-nueva-foto").addEventListener("click", nuevaFotoGaleria);

  $("gal-imagen-archivo").addEventListener("change", gestionarArchivosGaleria);

  $("boton-eliminar-foto").addEventListener("click", async () => {
    try {
      await eliminarFotoGaleria();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("est-periodo").addEventListener("change", async (evento) => {
    try {
      await cargarEstadisticasPeriodo(evento.target.value);
      mostrarMensaje("");
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("boton-actualizar-estadisticas").addEventListener("click", async () => {
    try {
      await cargarEstadisticasVisitas();
      mostrarMensaje("Estadísticas actualizadas.", "exito");
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("comp-periodo").addEventListener("change", async (evento) => {
    try {
      await cargarEstadisticasCompartidosPeriodo(evento.target.value);
      mostrarMensaje("");
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("boton-actualizar-compartidos").addEventListener("click", async () => {
    try {
      await cargarEstadisticasCompartidos();
      mostrarMensaje("Acciones de compartir actualizadas.", "exito");
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!PANEL_HABILITADO) return;
    try {
      $("boton-login").disabled = true;
      await iniciarSesion($("correo").value.trim(), $("clave").value);
    } catch (error) {
      estadoTitulo.textContent = "Acceso no completado";
      estadoMensaje.textContent = error.message;
    } finally {
      $("clave").value = "";
      $("boton-login").disabled = false;
    }
  });

  $("form-mfa").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const botonMfa = $("form-mfa").querySelector("button[type=submit]");
    if (botonMfa.disabled) return;
    try {
      botonMfa.disabled = true;
      await verificarMfa($("codigo-mfa").value.trim());
    } catch (error) {
      estadoTitulo.textContent = "No se pudo verificar MFA";
      estadoMensaje.textContent = error.message;
    } finally {
      $("codigo-mfa").value = "";
      botonMfa.disabled = false;
    }
  });

  $("form-capacitacion").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try { await guardarCapacitacion(); } catch (error) { mostrarMensaje(error.message, "error"); }
  });

  $("form-calendario").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try { await guardarActividad(); } catch (error) { mostrarMensaje(error.message, "error"); }
  });

  $("form-repositorio").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try {
      await guardarRecursoRepositorio();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("form-noticia").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try {
      await guardarNoticiaDestacada();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("form-galeria").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try {
      await guardarFotoGaleria();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  });

  $("boton-salir").addEventListener("click", cerrarSesion);
  reintentarAcceso.addEventListener("click", recuperarAcceso);
  auth.subscribe((evento, nuevaSesion, error) => {
    sesion = nuevaSesion;
    if (evento === "SIGNED_OUT") {
      mostrarAccesoCerrado();
      if (!saliendo) estadoMensaje.textContent = "La sesión terminó. Inicia sesión nuevamente.";
    } else if (evento === "SESSION_ERROR") {
      if (error?.definitive) informarErrorAcceso(error);
      else {
        estadoMensaje.textContent = "No se pudo renovar la sesión. Revisa la conexión o pulsa Reintentar acceso.";
        reintentarAcceso.hidden = false;
      }
    } else if (evento === "SESSION_UPDATED" || evento === "TOKEN_REFRESHED") {
      comprobarAutorizacion().then(async estado => {
        if (!auth.getSession()) return;
        if (!estado.autorizado || estado.aal !== "aal2") {
          seccionAdmin.hidden = true;
          recuperarAcceso();
          return;
        }
        const actual = await rest("rpc/perfil_panel_admin", {method:"POST",body:"{}"});
        const claveActual = JSON.stringify([actual?.user_id,actual?.rol,actual?.modulos]);
        if (!actual?.autorizado || actual.aal !== "aal2" || claveActual !== clavePermisos) {
          seccionAdmin.hidden = true;
          recuperarAcceso();
        }
      }).catch(informarErrorAcceso);
    }
  });

  if (!PANEL_HABILITADO) {
    formLogin.querySelectorAll("input,button").forEach((control) => control.disabled = true);
    estadoTitulo.textContent = "Panel temporalmente deshabilitado";
    estadoMensaje.textContent = "El acceso administrativo ha sido deshabilitado por configuración.";
    return;
  }

  estadoTitulo.textContent = "Panel administrativo protegido";
  estadoMensaje.textContent = "Solo pueden ingresar cuentas previamente autorizadas. El master requiere autenticador; los publicadores acceden con correo y contraseña y solo publican o archivan en sus módulos asignados.";

  leerSesion();
  if (sesion?.access_token) {
    if (tarjetaLogin) tarjetaLogin.hidden = true;
    recuperarAcceso();
  }
})();
