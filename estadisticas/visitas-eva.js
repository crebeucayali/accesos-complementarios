(() => {
  "use strict";

  const SUPABASE_URL = "https://dteimbhwtzghhsijeeld.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const SESSION_KEY = "eva_visitas_sesion_v1";
  const PENDING_KEY = "eva_visitas_pendiente_v2";
  const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
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
  let ultimoErrorRegistro = 0;
  const REINTENTO_ERROR_MS = 15000;

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

  function leerPendiente() {
    try {
      const p = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
      if (!p || typeof p !== "object" || !/^[a-f0-9-]{36}$/i.test(p.id) ||
          !MODULOS.has(p.modulo) || !Number.isFinite(p.creadoEn) ||
          !Number.isFinite(p.inicioSesion)) return null;
      return p;
    } catch { return null; }
  }

  function guardarPendiente(p) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); }
    catch { /* El seguimiento no debe impedir la navegación. */ }
  }

  function borrarPendiente() {
    try { localStorage.removeItem(PENDING_KEY); }
    catch { /* Sin almacenamiento local no se puede garantizar idempotencia. */ }
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

  function mostrarReconocimientoHito(hito) {
    if (!Number.isSafeInteger(hito) || hito <= 0 || hito % 1000 !== 0) return;
    const marca = "eva_hito_mostrado_v1_" + hito;
    try {
      if (localStorage.getItem(marca) === "1") return;
      localStorage.setItem(marca, "1");
    } catch {
      // Sin almacenamiento persistente, el reconocimiento sigue siendo funcional.
    }
    if (document.getElementById("eva-reconocimiento-hito")) return;

    const estilo = document.createElement("style");
    estilo.id = "eva-reconocimiento-estilos";
    estilo.textContent = `
      #eva-reconocimiento-hito{position:fixed;inset:0;z-index:2147483000;background:rgba(5,29,58,.74);display:grid;place-items:center;padding:20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #eva-reconocimiento-hito .eva-hito-tarjeta{position:relative;background:#fff;color:#102e58;border:4px solid #78b936;border-radius:22px;max-width:490px;width:100%;padding:34px 24px;box-sizing:border-box;text-align:center;box-shadow:0 18px 70px rgba(0,0,0,.35)}
      #eva-reconocimiento-hito .eva-hito-cerrar{position:absolute;right:12px;top:10px;background:transparent;border:0;color:#102e58;font-size:27px;cursor:pointer;padding:4px 10px}
      #eva-reconocimiento-hito .eva-hito-numero{font-size:clamp(3rem,12vw,5rem);font-weight:800;color:#24793c;line-height:1.2}
      #eva-reconocimiento-hito .eva-hito-boton{margin-top:18px;border:0;border-radius:10px;padding:12px 24px;background:#103c75;color:white;font-weight:700;font-size:1rem;cursor:pointer}
      #eva-reconocimiento-hito h2{margin:0 0 10px;font-size:clamp(1.4rem,5vw,2rem)}
      #eva-reconocimiento-hito p{margin:10px 0;line-height:1.5}
      @media (prefers-reduced-motion:reduce){#eva-reconocimiento-hito *{animation:none!important;transition:none!important}}
    `;
    document.head.appendChild(estilo);

    const fondo = document.createElement("div");
    fondo.id = "eva-reconocimiento-hito";
    fondo.setAttribute("role", "dialog");
    fondo.setAttribute("aria-modal", "true");
    fondo.setAttribute("aria-labelledby", "eva-hito-titulo");
    const tarjeta = document.createElement("div");
    tarjeta.className = "eva-hito-tarjeta";
    const cerrar = document.createElement("button");
    cerrar.className = "eva-hito-cerrar";
    cerrar.setAttribute("aria-label", "Cerrar reconocimiento");
    cerrar.textContent = "×";
    const titulo = document.createElement("h2");
    titulo.id = "eva-hito-titulo";
    titulo.textContent = "¡Felicitaciones!";
    const numero = document.createElement("div");
    numero.className = "eva-hito-numero";
    numero.textContent = new Intl.NumberFormat("es-PE").format(hito);
    const mensaje = document.createElement("p");
    mensaje.textContent = "¡Tu visita ha alcanzado el hito número " + new Intl.NumberFormat("es-PE").format(hito) + " de EVA!";
    const gracias = document.createElement("p");
    gracias.textContent = 'Gracias por formar parte de nuestra comunidad educativa inclusiva. CREBE "Señor de los Milagros" - Ucayali.';
    const aceptar = document.createElement("button");
    aceptar.className = "eva-hito-boton";
    aceptar.textContent = "Continuar navegando";
    tarjeta.append(cerrar,titulo,numero,mensaje,gracias,aceptar);
    fondo.appendChild(tarjeta);
    const focoPrevio = document.activeElement;
    const quitar = () => {
      fondo.remove();
      estilo.remove();
      document.removeEventListener("keydown", teclado);
      if (focoPrevio && typeof focoPrevio.focus === "function") focoPrevio.focus();
    };
    const teclado = (evento) => {
      if (evento.key === "Escape") quitar();
      if (evento.key === "Tab") {
        const botones = [cerrar,aceptar];
        const indice = botones.indexOf(document.activeElement);
        if (evento.shiftKey && indice <= 0) {evento.preventDefault();aceptar.focus();}
        else if (!evento.shiftKey && indice >= botones.length-1) {evento.preventDefault();cerrar.focus();}
      }
    };
    cerrar.addEventListener("click",quitar);
    aceptar.addEventListener("click",quitar);
    fondo.addEventListener("click",(evento) => {if(evento.target===fondo) quitar();});
    document.addEventListener("keydown",teclado);
    document.body.appendChild(fondo);
    cerrar.focus();
  }

  async function registrar(pendiente) {
    if (!pendiente || registroEnCurso) return false;
    registroEnCurso = true;
    try {
      const resultado = await rpc("registrar_visita_eva_hito_v2", {
        p_evento_id: pendiente.id,
        p_modulo: pendiente.modulo,
        p_nueva_sesion: Boolean(pendiente.nuevaSesion),
        p_nuevo_modulo: Boolean(pendiente.nuevoModulo)
      });
      document.documentElement.dataset.evaVisitas = "registrada";
      ultimoErrorRegistro = 0;
      const hito = Number(resultado?.hito);
      if (pendiente.nuevaSesion && Number.isSafeInteger(hito) && hito > 0) {
        mostrarReconocimientoHito(hito);
      }
      return true;
    } catch (error) {
      document.documentElement.dataset.evaVisitas = "error";
      ultimoErrorRegistro = Date.now();
      console.warn("Estadísticas EVA:", error);
      return false;
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

  // Un único registro en curso por pestaña; Web Locks sincroniza pestañas.
  let procesandoActividad = false;
  async function procesarActividad({ forzarRegistro = false } = {}) {
    if (procesandoActividad) return;
    procesandoActividad = true;
    try {
      const procesar = async () => {
        let ahora = Date.now();
        let pendiente = leerPendiente();
        if (pendiente && (ahora - pendiente.creadoEn > PENDING_MAX_AGE_MS ||
              pendiente.creadoEn > ahora + 60000)) {
          borrarPendiente();
          pendiente = null;
        }

        // Reintentar siempre con el mismo UUID: respuesta HTTP ambigua
        // ya no puede sumar dos veces una operación dentro de 72 horas.
        if (pendiente) {
          if (ahora - ultimoErrorRegistro < REINTENTO_ERROR_MS) return;
          if (!await registrar(pendiente)) return;
          const vigente = leerSesion();
          let recuperada = vigente && vigente.startedAt === pendiente.inicioSesion
            ? vigente : crearSesion(pendiente.inicioSesion);
          recuperada.modules[pendiente.modulo] = true;
          recuperada.lastActivity = Date.now();
          guardarSesion(recuperada);
          borrarPendiente();
          ultimoGuardadoActividad = Date.now();
        }

        ahora = Date.now();
        let sesion = leerSesion();
        const expirada = !sesion || (ahora - Number(sesion.lastActivity || 0) >= SESSION_TIMEOUT_MS);
        if (expirada) sesion = crearSesion(ahora);
        const nuevaSesion = expirada;
        const nuevoModulo = !sesion.modules[modulo];
        if (nuevaSesion || nuevoModulo) {
          if (ahora - ultimoErrorRegistro < REINTENTO_ERROR_MS) return;
          pendiente = {
            id: crypto.randomUUID(),
            modulo,
            nuevaSesion,
            nuevoModulo,
            creadoEn: ahora,
            inicioSesion: sesion.startedAt
          };
          guardarPendiente(pendiente);
          if (!await registrar(pendiente)) return;
          sesion.modules[modulo] = true;
          sesion.lastActivity = Date.now();
          guardarSesion(sesion);
          borrarPendiente();
          ultimoGuardadoActividad = Date.now();
          actualizarContadorPublico();
          return;
        }
        if (forzarRegistro || ahora - ultimoGuardadoActividad >= ACTIVITY_WRITE_INTERVAL_MS) {
          sesion.lastActivity = ahora;
          guardarSesion(sesion);
          ultimoGuardadoActividad = ahora;
        }
      };

      if (navigator.locks && typeof navigator.locks.request === "function") {
        await navigator.locks.request("eva-visitas-sesion-v1", { mode: "exclusive" }, procesar);
      } else {
        // Sin Web Locks pueden darse carreras entre pestañas simultáneas.
        await procesar();
      }
    } catch (error) {
      console.warn("Estadísticas EVA (sesión):", error);
    } finally {
      procesandoActividad = false;
    }
  }

  procesarActividad({ forzarRegistro: true });
  actualizarContadorPublico();
  const actividad = () => { void procesarActividad(); };
  window.addEventListener("pointerdown", actividad, { passive: true });
  window.addEventListener("keydown", actividad);
  window.addEventListener("touchstart", actividad, { passive: true });
  window.addEventListener("scroll", actividad, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void procesarActividad({ forzarRegistro: true });
  });
})();