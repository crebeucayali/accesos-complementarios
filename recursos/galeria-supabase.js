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

  async function consultarRest(ruta) {
    const respuesta = await fetch(SUPABASE_URL + "/rest/v1/" + ruta, {
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

  async function consultarGaleria() {
    const items = await consultarRest(
      "galeria_items?select=id,orden,fecha,titulo,descripcion,imagen_url,imagen_alt,estado_publicacion,updated_at&visible=eq.true&publicacion_autorizada=eq.true&estado_publicacion=eq.publicado&order=orden.desc,id.desc"
    );

    const imagenes = await consultarRest(
      "galeria_item_imagenes?select=galeria_item_id,orden,imagen_url,imagen_alt&order=galeria_item_id.asc,orden.asc"
    );

    const porItem = new Map();
    imagenes.forEach((imagen) => {
      const clave = String(imagen.galeria_item_id);
      if (!porItem.has(clave)) porItem.set(clave, []);
      porItem.get(clave).push(imagen);
    });

    return items.map((item) => ({
      ...item,
      imagenes: (porItem.get(String(item.id)) || []).slice(0, 5)
    }));
  }

  function abrirVisor(item, imagen, indice, total) {
    if (!modal || !modalImagen || !modalTitulo || !modalFecha || !modalDescripcion) return;

    const imagenUrl = resolverImagen(imagen.imagen_url);
    if (!imagenUrl) return;

    modalImagen.src = imagenUrl;
    modalImagen.alt = String(imagen.imagen_alt || item.titulo || "Fotografía de actividad");
    modalTitulo.textContent =
      String(item.titulo || "") +
      (total > 1 ? " · Foto " + (indice + 1) + " de " + total : "");
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
    let imagenes = Array.isArray(item.imagenes) ? item.imagenes : [];
    if (!imagenes.length && item.imagen_url) {
      imagenes = [{
        orden: 1,
        imagen_url: item.imagen_url,
        imagen_alt: item.imagen_alt || item.titulo
      }];
    }

    imagenes = imagenes
      .map((imagen) => ({ ...imagen, urlResuelta: resolverImagen(imagen.imagen_url) }))
      .filter((imagen) => imagen.urlResuelta)
      .slice(0, 5);

    if (!imagenes.length) return null;

    const articulo = document.createElement("article");
    articulo.className = "galeria-item";
    articulo.dataset.galeriaId = String(item.id);

    const mosaico = document.createElement("div");
    mosaico.className = "galeria-imagenes";
    mosaico.dataset.cantidad = String(imagenes.length);

    imagenes.forEach((imagenData, indice) => {
      const botonImagen = document.createElement("button");
      botonImagen.type = "button";
      botonImagen.className = "galeria-imagen-boton";
      botonImagen.setAttribute(
        "aria-label",
        "Ampliar fotografía " + (indice + 1) + " de " + imagenes.length + ": " + item.titulo
      );

      const imagen = document.createElement("img");
      imagen.className = "galeria-foto";
      imagen.src = imagenData.urlResuelta;
      imagen.alt = String(imagenData.imagen_alt || item.titulo);
      imagen.loading = "lazy";

      botonImagen.appendChild(imagen);
      botonImagen.addEventListener("click", () =>
        abrirVisor(item, imagenData, indice, imagenes.length)
      );
      mosaico.appendChild(botonImagen);
    });

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

    const contador = document.createElement("span");
    contador.className = "galeria-contador";
    contador.textContent = imagenes.length + (imagenes.length === 1 ? " fotografía" : " fotografías");
    contenido.appendChild(contador);

    const descripcion = String(item.descripcion || "").trim();
    if (descripcion) {
      const parrafo = document.createElement("p");
      parrafo.textContent = descripcion;
      contenido.appendChild(parrafo);
    }

    articulo.append(mosaico, contenido);
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