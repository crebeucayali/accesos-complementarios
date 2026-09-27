(() => {
  "use strict";

  const PANEL_HABILITADO = true;
  const SUPABASE_URL = "https://dteimbhwtzghhsijeeld.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const SESSION_KEY = "eva_admin_supabase_session_v1";

  const $ = (id) => document.getElementById(id);
  const estadoTitulo = $("estado-panel-titulo");
  const estadoMensaje = $("estado-panel-mensaje");
  const formLogin = $("form-login");
  const seccionMfa = $("seccion-mfa");
  const seccionAdmin = $("seccion-admin");
  const mensajeAdmin = $("mensaje-admin");

  let sesion = null;
  let factorMfa = null;
  let desafioMfa = null;
  let capacitaciones = [];
  let actividades = [];

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
      throw new Error(mensaje);
    }
    return datos;
  }

  function guardarSesion(datos) {
    if (!datos?.access_token) throw new Error("Supabase no devolvió una sesión válida.");
    sesion = {
      access_token: datos.access_token,
      refresh_token: datos.refresh_token || sesion?.refresh_token || "",
      expires_at: datos.expires_at || Math.floor(Date.now() / 1000) + Number(datos.expires_in || 3600),
      user: datos.user || sesion?.user || null
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
  }

  function leerSesion() {
    try {
      const datos = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (datos?.access_token) sesion = datos;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  async function refrescarSesionSiHaceFalta() {
    if (!sesion?.access_token) throw new Error("No hay sesión administrativa.");
    const ahora = Math.floor(Date.now() / 1000);
    if (Number(sesion.expires_at || 0) - ahora > 90) return;
    if (!sesion.refresh_token) throw new Error("La sesión venció. Inicia sesión nuevamente.");

    const datos = await solicitar(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token: sesion.refresh_token })
    });
    guardarSesion(datos);
  }

  async function rest(path, opciones = {}) {
    await refrescarSesionSiHaceFalta();
    const headers = authHeaders(sesion.access_token, opciones.headers || {});
    return solicitar(SUPABASE_URL + "/rest/v1/" + path, { ...opciones, headers });
  }

  async function comprobarAutorizacion() {
    const estado = await rest("rpc/estado_panel_admin", {
      method: "POST",
      body: "{}"
    });
    const fila = Array.isArray(estado) ? estado[0] : estado;
    return {
      autorizado: Boolean(fila?.autorizado),
      aal: String(fila?.aal || "")
    };
  }

  async function listarFactores() {
    await refrescarSesionSiHaceFalta();
    const datos = await solicitar(SUPABASE_URL + "/auth/v1/factors", {
      method: "GET",
      headers: authHeaders(sesion.access_token)
    });
    if (Array.isArray(datos)) return datos;
    if (Array.isArray(datos?.all)) return datos.all;
    return [
      ...(Array.isArray(datos?.totp) ? datos.totp : []),
      ...(Array.isArray(datos?.phone) ? datos.phone : [])
    ];
  }

  async function prepararMfa() {
    const factores = await listarFactores();
    const verificado = factores.find((factor) => factor.status === "verified" && factor.factor_type === "totp");

    if (verificado) {
      factorMfa = verificado.id;
      $("mfa-enrolamiento").hidden = true;
    } else {
      const enrolado = await solicitar(SUPABASE_URL + "/auth/v1/factors", {
        method: "POST",
        headers: authHeaders(sesion.access_token),
        body: JSON.stringify({ factor_type: "totp", friendly_name: "EVA Administración" })
      });
      factorMfa = enrolado.id;
      $("mfa-enrolamiento").hidden = false;
      if (enrolado?.totp?.qr_code) $("mfa-qr").src = enrolado.totp.qr_code;
      $("mfa-secreto").textContent = enrolado?.totp?.secret ? "Clave alternativa: " + enrolado.totp.secret : "";
    }

    const desafio = await solicitar(SUPABASE_URL + "/auth/v1/factors/" + encodeURIComponent(factorMfa) + "/challenge", {
      method: "POST",
      headers: authHeaders(sesion.access_token),
      body: "{}"
    });
    desafioMfa = desafio.id;
    seccionMfa.hidden = false;
    $("codigo-mfa").focus();
  }

  async function entrarPanel() {
    const estado = await comprobarAutorizacion();
    if (!estado.autorizado) {
      throw new Error("La cuenta está autenticada, pero no está autorizada como administradora.");
    }
    if (estado.aal !== "aal2") {
      await prepararMfa();
      return;
    }

    seccionMfa.hidden = true;
    formLogin.closest(".tarjeta").hidden = true;
    seccionAdmin.hidden = false;
    $("usuario-actual").textContent = sesion?.user?.email || "Administrador";
    await Promise.all([cargarCapacitaciones(), cargarCalendario()]);
  }

  async function iniciarSesion(correo, clave) {
    const datos = await solicitar(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email: correo, password: clave })
    });
    guardarSesion(datos);

    const estado = await comprobarAutorizacion();
    if (!estado.autorizado) {
      await cerrarSesion();
      throw new Error("Esta cuenta no está autorizada para administrar EVA.");
    }
    if (estado.aal !== "aal2") {
      await prepararMfa();
    } else {
      await entrarPanel();
    }
  }

  async function verificarMfa(codigo) {
    const datos = await solicitar(SUPABASE_URL + "/auth/v1/factors/" + encodeURIComponent(factorMfa) + "/verify", {
      method: "POST",
      headers: authHeaders(sesion.access_token),
      body: JSON.stringify({ challenge_id: desafioMfa, code: codigo })
    });
    if (datos?.access_token) guardarSesion(datos);
    await entrarPanel();
  }

  async function cerrarSesion() {
    try {
      if (sesion?.access_token) {
        await solicitar(SUPABASE_URL + "/auth/v1/logout", {
          method: "POST",
          headers: authHeaders(sesion.access_token),
          body: "{}"
        });
      }
    } catch {
      // La limpieza local se realiza incluso si el cierre remoto falla.
    }
    sesion = null;
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
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
  }

  async function cargarCapacitaciones() {
    capacitaciones = await rest("capacitaciones_sesiones?select=*&order=jornada.asc,numero_sesion.asc", { method: "GET" });
    const selector = $("sesion-selector");
    selector.replaceChildren();
    capacitaciones.forEach((fila, indice) => {
      const opcion = document.createElement("option");
      opcion.value = String(indice);
      opcion.textContent = "Jornada " + fila.jornada + " · Sesión " + fila.numero_sesion + " · " + fila.fecha;
      selector.appendChild(opcion);
    });
    llenarCapacitacion(capacitaciones[0]);
  }

  async function guardarCapacitacion() {
    const indice = Number($("sesion-selector").value);
    const fila = capacitaciones[indice];
    if (!fila) throw new Error("Selecciona una sesión válida.");

    const fecha = $("cap-fecha").value;
    const cambios = {
      fecha,
      fecha_texto: fechaTextoES(fecha),
      estado: $("cap-estado").value,
      titulo: $("cap-titulo").value.trim(),
      tema: $("cap-tema").value.trim(),
      flyer_url: $("cap-flyer").value.trim(),
      infografia_url: $("cap-infografia").value.trim(),
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
      opcion.textContent = fila.fecha + " · " + fila.titulo;
      selector.appendChild(opcion);
    });
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

  document.querySelectorAll(".tab").forEach((boton) => {
    boton.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("activo", x === boton));
      $("panel-capacitaciones").hidden = boton.dataset.panel !== "capacitaciones";
      $("panel-calendario").hidden = boton.dataset.panel !== "calendario";
      mostrarMensaje("");
    });
  });

  $("sesion-selector").addEventListener("change", (evento) => {
    llenarCapacitacion(capacitaciones[Number(evento.target.value)]);
  });

  $("actividad-selector").addEventListener("change", (evento) => {
    const valor = evento.target.value;
    if (valor === "") return nuevaActividad();
    llenarActividad(actividades[Number(valor)]);
  });

  $("boton-nueva-actividad").addEventListener("click", nuevaActividad);

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
      $("boton-login").disabled = false;
    }
  });

  $("form-mfa").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    try {
      await verificarMfa($("codigo-mfa").value.trim());
    } catch (error) {
      estadoTitulo.textContent = "No se pudo verificar MFA";
      estadoMensaje.textContent = error.message;
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

  $("boton-salir").addEventListener("click", cerrarSesion);

  if (!PANEL_HABILITADO) {
    formLogin.querySelectorAll("input,button").forEach((control) => control.disabled = true);
    estadoTitulo.textContent = "Panel temporalmente deshabilitado";
    estadoMensaje.textContent = "El acceso administrativo ha sido deshabilitado por configuración.";
    return;
  }

  estadoTitulo.textContent = "Panel administrativo protegido";
  estadoMensaje.textContent = "Solo pueden ingresar cuentas previamente autorizadas. La escritura exige MFA AAL2 y queda registrada en auditoría.";

  leerSesion();
  if (sesion?.access_token) {
    entrarPanel().catch(() => {
      sessionStorage.removeItem(SESSION_KEY);
      sesion = null;
    });
  }
})();
