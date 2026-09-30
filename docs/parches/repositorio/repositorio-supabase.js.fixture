(() => {
  "use strict";

  const SUPABASE_URL = "https://dteimbhwtzghhsijeeld.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const CATEGORIAS = new Set([
    "materiales_disponibles",
    "equipos_tecnologicos",
    "materiales_elaborados"
  ]);

  function urlImagenSegura(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    if (/^assets\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(texto)) {
      return texto;
    }

    try {
      const url = new URL(texto, window.location.href);

      const githubRepositorio =
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "crebeucayali.github.io" &&
        /^\/repositorio-accesible\/assets\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname);

      const storageRepositorio =
        url.protocol === "https:" &&
        url.hostname.toLowerCase() === "dteimbhwtzghhsijeeld.supabase.co" &&
        /^\/storage\/v1\/object\/public\/eva-publico\/repositorio\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname);

      return githubRepositorio || storageRepositorio ? url.href : "";
    } catch {
      return "";
    }
  }

  async function consultarRecursos() {
    const endpoint = new URL(SUPABASE_URL + "/rest/v1/repositorio_recursos");
    endpoint.searchParams.set(
      "select",
      "id,categoria,orden,titulo,descripcion,imagen_url,imagen_alt,estado_publicacion,updated_at"
    );
    endpoint.searchParams.set("visible", "eq.true");
    endpoint.searchParams.set("estado_publicacion", "eq.publicado");
    endpoint.searchParams.set("order", "categoria.asc,orden.asc,titulo.asc");

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
    if (!Array.isArray(datos)) {
      throw new Error("La respuesta de Supabase no tiene el formato esperado.");
    }

    return datos.filter((recurso) =>
      recurso &&
      CATEGORIAS.has(recurso.categoria) &&
      typeof recurso.titulo === "string" &&
      recurso.titulo.trim()
    );
  }

  function crearDetalle(recurso) {
    const imagenUrl = urlImagenSegura(recurso.imagen_url);
    const descripcion = String(recurso.descripcion || "").trim();

    if (!imagenUrl && !descripcion) return null;

    const detalle = document.createElement("div");
    detalle.className = "recuadro-detalle";
    detalle.setAttribute("role", "group");
    detalle.setAttribute("aria-label", "Vista previa de " + recurso.titulo);

    if (imagenUrl) {
      const imagen = document.createElement("img");
      imagen.src = imagenUrl;
      imagen.alt = String(recurso.imagen_alt || recurso.titulo).trim();
      imagen.loading = "lazy";

      const pendiente = document.createElement("div");
      pendiente.className = "imagen-pendiente";
      pendiente.hidden = true;
      pendiente.textContent = "Imagen pendiente de subir";

      imagen.addEventListener("error", () => {
        imagen.hidden = true;
        pendiente.hidden = false;
      }, { once: true });

      detalle.append(imagen, pendiente);
    }

    const texto = document.createElement("div");
    texto.className = "detalle-texto";

    const titulo = document.createElement("strong");
    titulo.textContent = recurso.titulo;
    texto.appendChild(titulo);

    if (descripcion) {
      const descripcionNodo = document.createElement("span");
      descripcionNodo.textContent = descripcion;
      texto.appendChild(descripcionNodo);
    }

    detalle.appendChild(texto);
    return detalle;
  }

  function crearRecurso(recurso) {
    const item = document.createElement("li");
    item.className = "item-recurso";
    item.tabIndex = 0;
    item.dataset.recursoId = String(recurso.id);
    item.appendChild(document.createTextNode(recurso.titulo));

    const detalle = crearDetalle(recurso);
    if (detalle) item.appendChild(detalle);

    return item;
  }

  function aplicarRecursos(recursos) {
    const porCategoria = new Map();

    recursos.forEach((recurso) => {
      if (!porCategoria.has(recurso.categoria)) {
        porCategoria.set(recurso.categoria, []);
      }
      porCategoria.get(recurso.categoria).push(recurso);
    });

    document.querySelectorAll(".lista-ejemplos[data-categoria]").forEach((lista) => {
      const categoria = lista.dataset.categoria;
      const items = porCategoria.get(categoria) || [];
      lista.replaceChildren();
      lista.hidden = false;

      if (!items.length) {
        const vacio = document.createElement("li");
        vacio.className = "item-recurso item-recurso-vacio";
        vacio.textContent = "No hay recursos publicados en esta categoría por el momento.";
        vacio.tabIndex = 0;
        lista.appendChild(vacio);
        return;
      }

      const fragmento = document.createDocumentFragment();
      items.forEach((recurso) => fragmento.appendChild(crearRecurso(recurso)));
      lista.appendChild(fragmento);
    });
  }

  async function cargarRepositorioDesdeSupabase() {
    aplicarRecursos([]);
    try {
      const recursos = await consultarRecursos();
      aplicarRecursos(recursos);
      document.documentElement.dataset.repositorioFuente = "supabase";
    } catch (error) {
      document.documentElement.dataset.repositorioFuente = "no-disponible";
      console.warn("Repositorio Accesible: no se pudo verificar el contenido publicado.", error);
    }
  }

  cargarRepositorioDesdeSupabase();
})();
