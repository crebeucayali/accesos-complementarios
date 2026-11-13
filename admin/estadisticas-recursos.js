(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const PERIODOS = new Set(["7", "30", "90", "365"]);
  const HERRAMIENTAS = Object.freeze({
    pictogramas: "Pictogramas",
    rutinas: "Rutinas visuales",
    braille: "Generador braille",
    dactilologia_lsp: "Dactilología LSP",
    apoyos_lsp: "Apoyos LSP",
    conciencia_fonologica: "Conciencia fonológica"
  });
  const FORMATOS = new Set(["png", "jpg", "pdf", "html"]);
  const ACCIONES = new Set(["descarga_solicitada", "exportacion_iniciada"]);
  const formatoNumero = valor => Number(valor).toLocaleString("es-PE");
  let autorizado = false;
  let consultar = null;
  let solicitud = 0;

  function estado(mensaje, error = false) {
    const elemento = $("rec-estado");
    if (!elemento) return;
    elemento.textContent = mensaje;
    elemento.dataset.error = String(error);
  }

  function limpiar() {
    ++solicitud;
    ["rec-total", "rec-exportaciones", "rec-descargas", "rec-herramientas"].forEach(id => {
      const elemento = $(id);
      if (elemento) elemento.textContent = "—";
    });
    ["rec-tabla", "rec-grafico"].forEach(id => $(id)?.replaceChildren());
    if ($("rec-grafico-sin-datos")) $("rec-grafico-sin-datos").hidden = true;
    if ($("rec-sin-datos")) $("rec-sin-datos").hidden = true;
    if ($("rec-actualizar")) $("rec-actualizar").disabled = false;
    estado("Selecciona un periodo para consultar las estadísticas.");
  }

  function configurar(perfil, opciones = {}) {
    // Cambio de identidad o permisos: anula resultados y peticiones previas.
    limpiar();
    autorizado = perfil?.autorizado === true && perfil?.rol === "master" && perfil?.aal === "aal2";
    consultar = autorizado && typeof opciones.consultar === "function" ? opciones.consultar : null;
  }

  function normalizar(filas) {
    if (!Array.isArray(filas)) throw new Error("La respuesta de estadísticas no tiene el formato esperado.");
    return filas.map(fila => {
      const fecha = String(fila?.fecha || "");
      const herramienta = String(fila?.herramienta || "");
      const formato = String(fila?.formato || "");
      const accion = String(fila?.accion || "");
      const total = Number(fila?.total);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
          !Object.hasOwn(HERRAMIENTAS, herramienta) ||
          !FORMATOS.has(formato) || !ACCIONES.has(accion) ||
          !Number.isSafeInteger(total) || total < 0) {
        throw new Error("La consulta devolvió un registro estadístico no válido.");
      }
      return { fecha, herramienta, formato, accion, total };
    });
  }

  function renderTabla(filas) {
    const cuerpo = $("rec-tabla");
    cuerpo.replaceChildren();
    const grupos = new Map();
    filas.forEach(fila => {
      const clave = fila.herramienta + ":" + fila.formato + ":" + fila.accion;
      const anterior = grupos.get(clave);
      if (anterior) anterior.total += fila.total;
      else grupos.set(clave, { ...fila });
    });
    const orden = [...grupos.values()].sort((a, b) => b.total - a.total || a.herramienta.localeCompare(b.herramienta));
    for (const fila of orden) {
      const tr = document.createElement("tr");
      const nombre = document.createElement("th");
      nombre.scope = "row";
      nombre.textContent = HERRAMIENTAS[fila.herramienta];
      const formato = document.createElement("td");
      formato.textContent = fila.formato.toUpperCase();
      const accion = document.createElement("td");
      accion.textContent = fila.accion === "descarga_solicitada" ? "Descarga solicitada" : "Exportación iniciada";
      const total = document.createElement("td");
      total.className = "estadistica-numero";
      total.textContent = formatoNumero(fila.total);
      tr.append(nombre, formato, accion, total);
      cuerpo.append(tr);
    }
    $("rec-sin-datos").hidden = orden.length > 0;
  }

  function renderGrafico(filas, dias) {
    const contenedor = $("rec-grafico");
    contenedor.replaceChildren();
    const mensual = dias >= 90;
    const acumulado = new Map();
    for (const fila of filas) {
      const clave = mensual ? fila.fecha.slice(0, 7) : fila.fecha;
      acumulado.set(clave, (acumulado.get(clave) || 0) + fila.total);
    }
    const puntos = [...acumulado].sort((a, b) => a[0].localeCompare(b[0]));
    $("rec-grafico-sin-datos").hidden = puntos.length > 0;
    const maximo = Math.max(0, ...puntos.map(([, total]) => total));
    $("rec-grafico-titulo").textContent = mensual ? "Evolución mensual" : "Evolución diaria";
    for (const [fecha, total] of puntos) {
      const item = document.createElement("div");
      item.className = "rec-grafico-fila";
      item.setAttribute("role", "listitem");
      item.setAttribute("aria-label", fecha + ": " + formatoNumero(total) + " acciones");
      const etiqueta = document.createElement("span");
      etiqueta.className = "rec-grafico-fecha";
      etiqueta.textContent = fecha;
      const pista = document.createElement("div");
      pista.className = "rec-grafico-pista";
      const barra = document.createElement("span");
      barra.className = "rec-grafico-valor";
      barra.style.width = (maximo > 0 ? (total / maximo) * 100 : 0) + "%";
      pista.append(barra);
      const numero = document.createElement("strong");
      numero.textContent = formatoNumero(total);
      item.append(etiqueta, pista, numero);
      contenedor.append(item);
    }
  }

  async function cargar() {
    if (!autorizado || !consultar) return;
    const selector = $("rec-periodo");
    const periodo = String(selector?.value || "30");
    if (!PERIODOS.has(periodo)) {
      estado("El periodo seleccionado no está permitido.", true);
      return;
    }
    const ticket = ++solicitud;
    $("rec-actualizar").disabled = true;
    estado("Consultando estadísticas de MEA...");
    try {
      const respuesta = await consultar(Number(periodo));
      if (ticket !== solicitud || !autorizado) return;
      const filas = normalizar(respuesta);
      const total = filas.reduce((suma, fila) => suma + fila.total, 0);
      const exportaciones = filas.filter(f => f.accion === "exportacion_iniciada").reduce((suma, fila) => suma + fila.total, 0);
      const descargas = total - exportaciones;
      const herramientas = new Set(filas.filter(f => f.total > 0).map(f => f.herramienta)).size;
      $("rec-total").textContent = formatoNumero(total);
      $("rec-exportaciones").textContent = formatoNumero(exportaciones);
      $("rec-descargas").textContent = formatoNumero(descargas);
      $("rec-herramientas").textContent = formatoNumero(herramientas);
      renderTabla(filas);
      renderGrafico(filas, Number(periodo));
      estado(filas.length
        ? "Datos agregados de MEA durante los últimos " + periodo + " días."
        : "Sin acciones registradas durante los últimos " + periodo + " días.");
    } catch (error) {
      if (ticket !== solicitud || !autorizado) return;
      ["rec-total", "rec-exportaciones", "rec-descargas", "rec-herramientas"].forEach(id => {
        $(id).textContent = "—";
      });
      $("rec-tabla").replaceChildren();
      $("rec-grafico").replaceChildren();
      $("rec-grafico-sin-datos").hidden = true;
      $("rec-sin-datos").hidden = true;
      console.warn("No se pudo consultar el uso de recursos MEA:", error);
      estado("No se pudieron consultar los recursos educativos. Revisa tu sesión o vuelve a intentarlo.", true);
    } finally {
      if (ticket === solicitud) $("rec-actualizar").disabled = false;
    }
  }

  $("rec-actualizar")?.addEventListener("click", () => { void cargar(); });
  $("rec-periodo")?.addEventListener("change", () => { void cargar(); });
  window.EvaRecursosEstadisticasAdmin = Object.freeze({ configurar, cargar, limpiar });
})();