(() => {
  "use strict";

  const SUPABASE_URL = "https://dteimbhwtzghhsijeeld.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const CLASES_CONTROLADAS = ["feriado", "lunes-colegiado", "sin-foto-consentimiento"];
  const MESES = {
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    setiembre: 9,
    septiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12
  };

  async function consultarCalendario() {
    const endpoint = new URL(`${SUPABASE_URL}/rest/v1/calendario_publico`);
    endpoint.searchParams.set(
      "select",
      "registro_id,fecha,fuente,orden,estado,clase_css,contenido_lineas,jornada,numero_sesion,updated_at,imagen_url,imagen_alt"
    );
    endpoint.searchParams.set("order", "fecha.asc,orden.asc");

    const respuesta = await fetch(endpoint.href, {
      method: "GET",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Accept: "application/json"
      },
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "strict-origin-when-cross-origin"
    });

    if (!respuesta.ok) {
      throw new Error(`Supabase respondió con estado ${respuesta.status}.`);
    }

    const datos = await respuesta.json();
    if (!Array.isArray(datos)) {
      throw new Error("La respuesta de Supabase no tiene el formato esperado.");
    }

    return datos;
  }

  function obtenerMes(titulo) {
    const texto = String(titulo || "").trim().toLowerCase();
    const nombre = Object.keys(MESES).find((mes) => texto.startsWith(mes));
    return nombre ? MESES[nombre] : null;
  }

  function fechaISO(mes, dia) {
    return `2026-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  function agruparPorFecha(registros) {
    const mapa = new Map();
    registros.forEach((registro) => {
      if (!registro || typeof registro.fecha !== "string") return;
      if (!mapa.has(registro.fecha)) mapa.set(registro.fecha, []);
      mapa.get(registro.fecha).push(registro);
    });
    return mapa;
  }

  function crearBloqueActividad(registro) {
    const bloque = document.createElement("div");
    bloque.className = "datos-actividad";
    if (registro.fuente === "capacitaciones") {
      bloque.classList.add("actividad-capacitacion-supabase");
    }

    const lineas = Array.isArray(registro.contenido_lineas)
      ? registro.contenido_lineas.filter((linea) => typeof linea === "string" && linea.trim())
      : [];

    lineas.forEach((linea, indice) => {
      const esTituloCalendario = registro.fuente === "calendario" && indice === 0;
      const elemento =
        esTituloCalendario || (registro.clase_css === "feriado" && indice === 0)
          ? document.createElement("strong")
          : document.createElement("span");
      elemento.textContent = linea;
      bloque.appendChild(elemento);
    });

    if (registro.fuente === "calendario" && registro.imagen_url) {
      try {
        const fotoUrl = new URL(registro.imagen_url, location.href);
        const storageValido =
          fotoUrl.origin === SUPABASE_URL &&
          /^\/storage\/v1\/object\/public\/eva-publico\/calendario\/[A-Za-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(fotoUrl.pathname);
        const historicaValida =
          fotoUrl.origin === location.origin &&
          /^\/accesos-complementarios\/recursos\/imagenes-calendario\/[A-Za-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(fotoUrl.pathname);
        if (storageValido || historicaValida) {
          const imagen = document.createElement("img");
          imagen.className = "calendario-actividad-foto";
          imagen.src = fotoUrl.href;
          imagen.alt = String(registro.imagen_alt || "Fotografía de la actividad");
          imagen.loading = "lazy";
          imagen.decoding = "async";
          bloque.classList.add("con-fotografia");
          bloque.tabIndex = 0;
          bloque.appendChild(imagen);
        }
      } catch {}
    }

    return bloque;
  }

  function aplicarMesesEnCuadricula(porFecha) {
    document.querySelectorAll(".grid-meses > .mes").forEach((articulo) => {
      const tabla = articulo.querySelector(".calendario-actividades");
      const titulo = articulo.querySelector(".mes-cabecera h3");
      if (!tabla || !titulo) return;

      const mes = obtenerMes(titulo.textContent);
      if (!mes) return;

      tabla.querySelectorAll("td").forEach((celda) => {
        const numero = celda.querySelector(".numero-dia");
        if (!numero) return;

        const dia = Number(numero.textContent);
        if (!Number.isInteger(dia)) return;

        const fecha = fechaISO(mes, dia);
        celda.dataset.fecha = fecha;

        const registros = porFecha.get(fecha);
        celda.querySelectorAll(".datos-actividad").forEach((elemento) => elemento.remove());
        CLASES_CONTROLADAS.forEach((clase) => celda.classList.remove(clase));
        celda.classList.remove("celda-multiples-actividades");
        delete celda.dataset.actividades;

        if (!registros || !registros.length) return;

        if (registros.length > 1) {
          celda.classList.add("celda-multiples-actividades");
          celda.dataset.actividades = String(registros.length);
        }

        const clase = registros.find((registro) => CLASES_CONTROLADAS.includes(registro.clase_css))?.clase_css;
        if (clase) celda.classList.add(clase);

        registros.forEach((registro) => {
          celda.appendChild(crearBloqueActividad(registro));
        });
      });
    });
  }

  function etiquetaEstado(estado) {
    const etiquetas = {
      disponible: "Disponible",
      pendiente: "Pendiente",
      confirmada: "Confirmada",
      planificacion: "En planificación",
      interna: "Actividad interna",
      feriado: "Feriado",
      cancelada: "Cancelada"
    };
    return etiquetas[estado] || "Programada";
  }

  function aplicarMesesEnTabla(porFecha) {
    document.querySelectorAll(".grid-meses > .mes").forEach((articulo) => {
      const tabla = articulo.querySelector(".tabla-calendario");
      const titulo = articulo.querySelector(".mes-cabecera h3");
      if (!tabla || !titulo) return;

      const mes = obtenerMes(titulo.textContent);
      if (![11, 12].includes(mes)) return;

      const registros = [];
      porFecha.forEach((items, fecha) => {
        const mesRegistro = Number(fecha.slice(5, 7));
        if (mesRegistro === mes) registros.push(...items);
      });

      registros.sort((a, b) => a.fecha.localeCompare(b.fecha) || Number(a.orden) - Number(b.orden));
      const cuerpo = tabla.querySelector("tbody");
      if (!cuerpo) return;
      cuerpo.replaceChildren();

      registros.forEach((registro) => {
        const fila = document.createElement("tr");

        const fecha = document.createElement("td");
        const [anio, numeroMes, dia] = registro.fecha.split("-");
        fecha.textContent = `${dia}/${numeroMes}/${anio}`;

        const actividad = document.createElement("td");
        actividad.appendChild(crearBloqueActividad(registro));

        const estado = document.createElement("td");
        const marca = document.createElement("span");
        marca.className = "estado";
        marca.textContent = etiquetaEstado(registro.estado);
        estado.appendChild(marca);

        fila.append(fecha, actividad, estado);
        cuerpo.appendChild(fila);
      });
    });
  }

  async function cargarCalendarioDesdeSupabase() {
    // Solo se muestra contenido cuya publicación haya confirmado Supabase.
    aplicarMesesEnCuadricula(new Map());
    aplicarMesesEnTabla(new Map());
    try {
      const registros = await consultarCalendario();
      const porFecha = agruparPorFecha(registros);
      aplicarMesesEnCuadricula(porFecha);
      aplicarMesesEnTabla(porFecha);
      document.documentElement.dataset.calendarioFuente = "supabase";
    } catch (error) {
      document.documentElement.dataset.calendarioFuente = "no-disponible";
      console.warn("Calendario: no se pudo verificar el contenido publicado.", error);
    }
  }

  cargarCalendarioDesdeSupabase();
})();
