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
  const tarjetaLogin = formLogin?.closest(".tarjeta");
  const seccionMfa = $("seccion-mfa");
  const seccionAdmin = $("seccion-admin");
  const mensajeAdmin = $("mensaje-admin");

  let sesion = null;
  let factorMfa = null;
  let desafioMfa = null;
  let capacitaciones = [];
  let actividades = [];
  let recursosRepositorio = [];
  let noticiasDestacadas = [];
  let galeriaItems = [];

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
    const estadoMfa = await obtenerEstadoMfa();

    if (estadoMfa.tieneFactorVerificado && estadoMfa.factorId) {
      factorMfa = estadoMfa.factorId;
      $("mfa-enrolamiento").hidden = true;
    } else {
      await rest("rpc/limpiar_mfa_no_verificado_admin", {
        method: "POST",
        body: "{}"
      });

      const enrolado = await solicitar(SUPABASE_URL + "/auth/v1/factors", {
        method: "POST",
        headers: authHeaders(sesion.access_token),
        body: JSON.stringify({ factor_type: "totp", friendly_name: "EVA Administración" })
      });
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
    desafioMfa = desafio.id;
    seccionMfa.hidden = false;
    $("codigo-mfa").focus();
  }

  async function entrarPanel() {
    const estado = await comprobarAutorizacion();
    if (!estado.autorizado) {
      throw new Error("La cuenta está autenticada, pero no está autorizada como administradora.");
    }

    if (tarjetaLogin) tarjetaLogin.hidden = true;

    if (estado.aal !== "aal2") {
      seccionAdmin.hidden = true;
      seccionMfa.hidden = false;
      estadoTitulo.textContent = "Verificación en dos pasos";
      estadoMensaje.textContent = "La contraseña ya fue validada. Completa únicamente el código de tu autenticador.";
      await prepararMfa();
      return;
    }

    seccionMfa.hidden = true;
    seccionAdmin.hidden = false;
    estadoTitulo.textContent = "Acceso administrativo activo";
    estadoMensaje.textContent = "";
    $("usuario-actual").textContent = sesion?.user?.email || "Administrador";
    await Promise.all([cargarCapacitaciones(), cargarCalendario(), cargarRepositorio(), cargarNoticiasDestacadas(), cargarGaleriaAdmin()]);
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


  const ETIQUETAS_REPOSITORIO = {
    materiales_disponibles: "Materiales disponibles",
    equipos_tecnologicos: "Equipos tecnológicos",
    materiales_elaborados: "Materiales elaborados"
  };

  function llenarRecursoRepositorio(fila) {
    $("rep-id").value = fila?.id || "";
    $("rep-categoria").value = fila?.categoria || "materiales_disponibles";
    $("rep-titulo").value = fila?.titulo || "";
    $("rep-descripcion").value = fila?.descripcion || "";
    $("rep-imagen").value = fila?.imagen_url || "";
    $("rep-alt").value = fila?.imagen_alt || "";
    $("rep-visible").checked = fila?.visible !== false;
    $("boton-eliminar-recurso").hidden = !fila?.id;
  }

  async function cargarRepositorio() {
    recursosRepositorio = await rest(
      "repositorio_recursos?select=*&order=categoria.asc,orden.asc,titulo.asc",
      { method: "GET" }
    );

    const selector = $("repositorio-selector");
    selector.replaceChildren();

    const vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = "Seleccionar recurso";
    selector.appendChild(vacio);

    recursosRepositorio.forEach((fila, indice) => {
      const opcion = document.createElement("option");
      opcion.value = String(indice);
      opcion.textContent =
        (ETIQUETAS_REPOSITORIO[fila.categoria] || fila.categoria) +
        " · " + fila.titulo +
        (fila.visible === false ? " · Oculto" : "");
      selector.appendChild(opcion);
    });

    llenarRecursoRepositorio(null);
  }

  function nuevoRecursoRepositorio() {
    $("repositorio-selector").value = "";
    llenarRecursoRepositorio(null);
    $("rep-titulo").focus();
    mostrarMensaje("");
  }

  function validarImagenRepositorio(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (/^assets\/[a-z0-9._/-]+$/i.test(texto)) return texto;

    try {
      const url = new URL(texto);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "crebeucayali.github.io") {
        throw new Error();
      }
      return url.href;
    } catch {
      throw new Error("La imagen debe usar una ruta local assets/... o una URL HTTPS de crebeucayali.github.io.");
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
    const imagen = validarImagenRepositorio($("rep-imagen").value);

    if (!titulo) throw new Error("El título del recurso es obligatorio.");

    const existente = id
      ? recursosRepositorio.find((fila) => String(fila.id) === id)
      : null;

    const orden = existente && existente.categoria === categoria
      ? Number(existente.orden || 1)
      : siguienteOrdenRepositorio(categoria);

    const payload = {
      categoria,
      orden,
      titulo,
      descripcion: $("rep-descripcion").value.trim(),
      imagen_url: imagen,
      imagen_alt: $("rep-alt").value.trim(),
      visible: $("rep-visible").checked,
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


  function llenarNoticiaDestacada(fila) {
    $("not-id").value = fila?.id || "";
    $("not-categoria").value = fila?.categoria || "Noticia destacada";
    $("not-titulo").value = fila?.titulo || "";
    $("not-descripcion").value = fila?.descripcion || "";
    $("not-imagen").value = fila?.imagen_url || "";
    $("not-enlace").value = fila?.enlace_url || "";
    $("not-visible").checked = fila?.visible !== false;
    $("boton-eliminar-noticia").hidden = !fila?.id;
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
        (fila.visible === false ? " · Oculta" : "");
      selector.appendChild(opcion);
    });

    llenarNoticiaDestacada(null);
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

    try {
      const url = new URL(texto);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "crebeucayali.github.io") {
        throw new Error();
      }
      return url.href;
    } catch {
      throw new Error("La imagen debe usar una ruta imagenes/noticias/... o una URL HTTPS de crebeucayali.github.io.");
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

  async function guardarNoticiaDestacada() {
    const id = $("not-id").value.trim();
    const categoria = $("not-categoria").value.trim();
    const titulo = $("not-titulo").value.trim();
    const descripcion = $("not-descripcion").value.trim();

    if (!categoria) throw new Error("La categoría es obligatoria.");
    if (!titulo) throw new Error("El título es obligatorio.");
    if (!descripcion) throw new Error("La síntesis breve es obligatoria.");

    const existente = id
      ? noticiasDestacadas.find((fila) => String(fila.id) === id)
      : null;

    const payload = {
      orden: existente ? Number(existente.orden || 1) : siguienteOrdenNoticia(),
      categoria,
      titulo,
      descripcion,
      imagen_url: validarImagenNoticia($("not-imagen").value),
      enlace_url: validarEnlaceNoticia($("not-enlace").value),
      visible: $("not-visible").checked,
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


  function llenarGaleriaAdmin(fila) {
    $("gal-id").value = fila?.id || "";
    $("gal-fecha").value = fila?.fecha || "";
    $("gal-titulo").value = fila?.titulo || "";
    $("gal-descripcion").value = fila?.descripcion || "";
    $("gal-imagen").value = fila?.imagen_url || "";
    $("gal-alt").value = fila?.imagen_alt || "";
    $("gal-visible").checked = fila?.visible === true;
    $("gal-autorizada").checked = fila?.publicacion_autorizada === true;
    $("boton-eliminar-foto").hidden = !fila?.id;
  }

  async function cargarGaleriaAdmin() {
    galeriaItems = await rest(
      "galeria_items?select=*&order=orden.desc,id.desc",
      { method: "GET" }
    );

    const selector = $("galeria-selector");
    selector.replaceChildren();

    const vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = "Seleccionar fotografía";
    selector.appendChild(vacio);

    galeriaItems.forEach((fila, indice) => {
      const opcion = document.createElement("option");
      opcion.value = String(indice);
      const fecha = fila.fecha ? fila.fecha + " · " : "";
      opcion.textContent =
        fecha + fila.titulo +
        (fila.visible === false ? " · Oculta" : "") +
        (fila.publicacion_autorizada === false ? " · Sin autorización" : "");
      selector.appendChild(opcion);
    });

    llenarGaleriaAdmin(null);
  }

  function nuevaFotoGaleria() {
    $("galeria-selector").value = "";
    llenarGaleriaAdmin(null);
    $("gal-fecha").value = "";
    $("gal-visible").checked = false;
    $("gal-autorizada").checked = false;
    $("gal-titulo").focus();
    mostrarMensaje("");
  }

  function validarImagenGaleria(valor) {
    const texto = String(valor || "").trim();
    if (!texto) throw new Error("La imagen es obligatoria.");

    if (/^imagenes-(galeria|calendario)\/[a-z0-9._/-]+$/i.test(texto)) {
      return texto;
    }

    try {
      const url = new URL(texto);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "crebeucayali.github.io") {
        throw new Error();
      }
      return url.href;
    } catch {
      throw new Error("La imagen debe usar imagenes-galeria/..., imagenes-calendario/... o una URL HTTPS de crebeucayali.github.io.");
    }
  }

  function siguienteOrdenGaleria() {
    const ordenes = galeriaItems.map((fila) => Number(fila.orden || 0));
    return (ordenes.length ? Math.max(...ordenes) : 0) + 1;
  }

  async function guardarFotoGaleria() {
    const id = $("gal-id").value.trim();
    const titulo = $("gal-titulo").value.trim();
    const descripcion = $("gal-descripcion").value.trim();
    const alt = $("gal-alt").value.trim();
    const visible = $("gal-visible").checked;
    const autorizada = $("gal-autorizada").checked;

    if (!titulo) throw new Error("El título de la fotografía es obligatorio.");
    if (!alt) throw new Error("El texto alternativo de la fotografía es obligatorio.");
    if (visible && !autorizada) {
      throw new Error("Para publicar una fotografía debes confirmar primero que está autorizada para publicación institucional.");
    }

    const existente = id
      ? galeriaItems.find((fila) => String(fila.id) === id)
      : null;

    const payload = {
      orden: existente ? Number(existente.orden || 1) : siguienteOrdenGaleria(),
      fecha: $("gal-fecha").value || null,
      titulo,
      descripcion,
      imagen_url: validarImagenGaleria($("gal-imagen").value),
      imagen_alt: alt,
      publicacion_autorizada: autorizada,
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

    await cargarGaleriaAdmin();

    const guardada = Array.isArray(resultado) ? resultado[0] : null;
    if (guardada?.id) {
      const indice = galeriaItems.findIndex((fila) => Number(fila.id) === Number(guardada.id));
      if (indice >= 0) {
        $("galeria-selector").value = String(indice);
        llenarGaleriaAdmin(galeriaItems[indice]);
      }
    }

    mostrarMensaje(id ? "Fotografía actualizada correctamente." : "Fotografía agregada correctamente.", "exito");
  }

  async function eliminarFotoGaleria() {
    const id = $("gal-id").value.trim();
    if (!id) return;

    const fila = galeriaItems.find((item) => String(item.id) === id);
    if (!fila) throw new Error("No se encontró la fotografía seleccionada.");

    const aceptar = window.confirm(
      '¿Eliminar "' + fila.titulo + '" de la Galería?\n\nLa tarjeta dejará de mostrarse y el registro se eliminará de Supabase.'
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
      throw new Error("No se pudo eliminar la fotografía.");
    }

    await cargarGaleriaAdmin();
    nuevaFotoGaleria();
    mostrarMensaje("Fotografía eliminada correctamente.", "exito");
  }

  document.querySelectorAll(".tab").forEach((boton) => {
    boton.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("activo", x === boton));
      $("panel-capacitaciones").hidden = boton.dataset.panel !== "capacitaciones";
      $("panel-calendario").hidden = boton.dataset.panel !== "calendario";
      $("panel-repositorio").hidden = boton.dataset.panel !== "repositorio";
      $("panel-noticias").hidden = boton.dataset.panel !== "noticias";
      $("panel-galeria").hidden = boton.dataset.panel !== "galeria";
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

  $("repositorio-selector").addEventListener("change", (evento) => {
    const valor = evento.target.value;
    if (valor === "") return nuevoRecursoRepositorio();
    llenarRecursoRepositorio(recursosRepositorio[Number(valor)]);
  });

  $("boton-nuevo-recurso").addEventListener("click", nuevoRecursoRepositorio);

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

  $("boton-eliminar-foto").addEventListener("click", async () => {
    try {
      await eliminarFotoGaleria();
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
