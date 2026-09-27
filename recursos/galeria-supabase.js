(() => {
  "use strict";

  const SUPABASE_URL = "https://dteimbhwtzghhsijeeld.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";

  const grid = document.getElementById("galeria-grid");
  const estado = document.getElementById("galeria-estado");
  const modal = document.getElementById("galeria-modal");
  const modalImagen = document.getElementById("galeria-modal-imagen");
  const modalTitulo = document.getElementById("galeria-modal-titulo");
  const modalFecha = document.getElementById("galeria-modal-fecha");
  const modalDescripcion = document.getElementById("galeria-modal-descripcion");
  const modalCerrar = document.getElementById("galeria-modal-cerrar");

  if (!grid || !estado) return;

  function resolverImagen(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return null;

    try {
      const url = new URL(texto, window.location.href);
      const githubValida =
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "crebeucayali.github.io";

      const storageValida =
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "dteimbhwtzghhsijeeld.supabase.co" &&
        /^\/storage\/v1\/object\/public\/eva-publico\/galeria\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname);

      return githubValida || storageValida ? url.href : null;
    } catch {
      return null;
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return "";
    const partes = String(fecha).split("-").map(Number);
    if (partes.length !== 3 || partes.some((n) => !Number.isFinite(n))) return "";
    const valor = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(valor);
  }

  async function consultarGaleria() {
    const endpoint = new URL(SUPABASE_URL + "/rest/v1/galeria_items");
    endpoint.searchParams.set(
      "select",
      "id,orden,fecha,titulo,descripcion,imagen_url,imagen_alt,updated_at"
    );
    endpoint.searchParams.set("visible", "eq.true");
    endpoint.searchParams.set("publicacion_autorizada", "eq.true");
    endpoint.searchParams.set("order", "orden.desc,id.desc");

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
      throw new Error("Supabase respondió con estado " + respuesta.status + ".");
    }

    const datos = await respuesta.json();
    return Array.isArray(datos) ? datos : [];
  }

  function abrirVisor(item, imagenUrl) {
    if (!modal || !modalImagen || !modalTitulo || !modalFecha || !modalDescripcion) return;

    modalImagen.src = imagenUrl;
    modalImagen.alt = String(item.imagen_alt || item.titulo || "Fotografía de actividad");
    modalTitulo.textContent = String(item.titulo || "");
    modalFecha.textContent = formatearFecha(item.fecha);
    modalFecha.hidden = !modalFecha.textContent;
    modalDescripcion.textContent = String(item.descripcion || "");
    modalDescripcion.hidden = !modalDescripcion.textContent;

    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
  }

  function cerrarVisor() {
    if (!modal) return;
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  }

  function crearTarjeta(item) {
    const imagenUrl = resolverImagen(item.imagen_url);
    if (!imagenUrl) return null;

    const articulo = document.createElement("article");
    articulo.className = "galeria-item";
    articulo.dataset.galeriaId = String(item.id);

    const botonImagen = document.createElement("button");
    botonImagen.type = "button";
    botonImagen.className = "galeria-imagen-boton";
    botonImagen.setAttribute("aria-label", "Ampliar fotografía: " + item.titulo);

    const imagen = document.createElement("img");
    imagen.className = "galeria-foto";
    imagen.src = imagenUrl;
    imagen.alt = String(item.imagen_alt || item.titulo);
    imagen.loading = "lazy";

    botonImagen.appendChild(imagen);
    botonImagen.addEventListener("click", () => abrirVisor(item, imagenUrl));

    const contenido = document.createElement("div");
    contenido.className = "contenido-categoria";

    const titulo = document.createElement("h3");
    titulo.textContent = String(item.titulo || "");

    contenido.appendChild(titulo);

    const fecha = formatearFecha(item.fecha);
    if (fecha) {
      const fechaNodo = document.createElement("span");
      fechaNodo.className = "fecha";
      fechaNodo.textContent = fecha;
      contenido.appendChild(fechaNodo);
    }

    const descripcion = String(item.descripcion || "").trim();
    if (descripcion) {
      const parrafo = document.createElement("p");
      parrafo.textContent = descripcion;
      contenido.appendChild(parrafo);
    }

    articulo.append(botonImagen, contenido);
    return articulo;
  }

  async function cargarGaleria() {
    estado.textContent = "Cargando fotografías…";

    try {
      const items = await consultarGaleria();
      grid.replaceChildren();

      if (!items.length) {
        estado.textContent = "Aún no hay fotografías publicadas en la Galería.";
        document.documentElement.dataset.galeriaFuente = "supabase";
        return;
      }

      const fragmento = document.createDocumentFragment();
      let total = 0;

      items.forEach((item) => {
        const tarjeta = crearTarjeta(item);
        if (!tarjeta) return;
        fragmento.appendChild(tarjeta);
        total += 1;
      });

      grid.appendChild(fragmento);
      estado.textContent = total
        ? ""
        : "No hay fotografías disponibles para mostrar.";
      document.documentElement.dataset.galeriaFuente = "supabase";
    } catch (error) {
      grid.replaceChildren();
      estado.textContent = "La Galería no está disponible temporalmente. Intente nuevamente más tarde.";
      document.documentElement.dataset.galeriaFuente = "error";
      console.warn("Galería CREBE:", error);
    }
  }

  modalCerrar?.addEventListener("click", cerrarVisor);

  modal?.addEventListener("click", (evento) => {
    if (evento.target === modal) cerrarVisor();
  });

  modal?.addEventListener("cancel", (evento) => {
    evento.preventDefault();
    cerrarVisor();
  });

  cargarGaleria();
})();