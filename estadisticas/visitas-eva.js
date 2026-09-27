(() => {
  "use strict";

  const SUPABASE_URL = "https://dteimbhwtzghhsijeeld.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const SESSION_KEY = "eva_visitas_sesion_v1";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;

  const script = document.currentScript;
  const modulo = String(script?.dataset?.evaModulo || "").trim().toLowerCase();

  const MODULOS = new Set([
    "principal",
    "capacitaciones",
    "bda",
    "mea",
    "noti_inclusivos",
    "repositorio_accesible",
    "dua_3",
    "accesos_complementarios"
  ]);

  if (!MODULOS.has(modulo)) return;

  let ultimoGuardadoActividad = 0;
  let registroEnCurso = false;

  function leerSesion() {
    try {
      const valor = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!valor || typeof valor !== "object") return null;
      if (!Number.isFinite(Number(valor.lastActivity))) return null;
      if (!valor.modules || typeof valor.modules !== "object") valor.modules = {};
      return valor;
    } catch {
      return null;
    }
  }

  function guardarSesion(sesion) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
    } catch {
      // Si localStorage no está disponible, la página sigue funcionando.
    }
  }

  function crearSesion(ahora) {
    return {
      startedAt: ahora,
      lastActivity: ahora,
      modules: {}
    };
  }

  async function rpc(nombre, cuerpo) {
    const respuesta = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + nombre, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(cuerpo || {}),
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "strict-origin-when-cross-origin",
      keepalive: true
    });

    if (!respuesta.ok) {
      throw new Error("Supabase respondió con estado " + respuesta.status + ".");
    }

    const texto = await respuesta.text();
    if (!texto) return null;
    try { return JSON.parse(texto); } catch { return null; }
  }

  async function registrar(nuevaSesion, nuevoModulo) {
    if ((!nuevaSesion && !nuevoModulo) || registroEnCurso) return;

    registroEnCurso = true;
    try {
      const respuesta = await fetch(SUPABASE_URL + "/rest/v1/eva_visitas_eventos", {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          modulo,
          nueva_sesion: Boolean(nuevaSesion),
          nuevo_modulo: Boolean(nuevoModulo)
        }),
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "strict-origin-when-cross-origin",
        keepalive: true
      });

      if (!respuesta.ok) {
        throw new Error("Supabase respondió con estado " + respuesta.status + ".");
      }

      document.documentElement.dataset.evaVisitas = "registrada";
    } catch (error) {
      document.documentElement.dataset.evaVisitas = "error";
      console.warn("Estadísticas EVA:", error);
    } finally {
      registroEnCurso = false;
    }
  }

  async function actualizarContadorPublico() {
    const destino = document.querySelector("[data-eva-visitas-total]");
    if (!destino) return;

    try {
      const datos = await rpc("contador_visitas_eva", {});
      const fila = Array.isArray(datos) ? datos[0] : datos;
      const total = Number(fila?.total || 0);
      destino.textContent = new Intl.NumberFormat("es-PE").format(total);
      destino.closest("[data-eva-contador]")?.removeAttribute("hidden");
    } catch {
      // El contador público es complementario; no interrumpe la navegación.
    }
  }

  function procesarActividad({ forzarRegistro = false } = {}) {
    const ahora = Date.now();
    let sesion = leerSesion();
    const expirada = !sesion || (ahora - Number(sesion.lastActivity || 0) >= SESSION_TIMEOUT_MS);
    let nuevaSesion = false;

    if (expirada) {
      sesion = crearSesion(ahora);
      nuevaSesion = true;
    }

    const nuevoModulo = !sesion.modules[modulo];
    if (nuevoModulo) sesion.modules[modulo] = true;

    const debeGuardarActividad =
      nuevaSesion ||
      nuevoModulo ||
      forzarRegistro ||
      (ahora - ultimoGuardadoActividad >= ACTIVITY_WRITE_INTERVAL_MS);

    if (debeGuardarActividad) {
      sesion.lastActivity = ahora;
      guardarSesion(sesion);
      ultimoGuardadoActividad = ahora;
    }

    if (nuevaSesion || nuevoModulo) {
      registrar(nuevaSesion, nuevoModulo).then(actualizarContadorPublico);
    }
  }

  procesarActividad({ forzarRegistro: true });
  actualizarContadorPublico();

  const actividad = () => procesarActividad();

  window.addEventListener("pointerdown", actividad, { passive: true });
  window.addEventListener("keydown", actividad);
  window.addEventListener("touchstart", actividad, { passive: true });
  window.addEventListener("scroll", actividad, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") procesarActividad({ forzarRegistro: true });
  });
})();