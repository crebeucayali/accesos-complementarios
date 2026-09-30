const DOMINIOS_EVA_PERMITIDOS = new Set(["crebeucayali.github.io"]);

function resolverUrlEvaSegura(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return null;

  try {
    const url = new URL(texto, window.location.href);

    if (url.origin === window.location.origin) {
      return url.href;
    }

    if (url.protocol !== "https:") {
      return null;
    }

    return DOMINIOS_EVA_PERMITIDOS.has(url.hostname.toLowerCase()) ? url.href : null;
  } catch (error) {
    return null;
  }
}

function resolverUrlImagenEvaSegura(valor) {
  const eva = resolverUrlEvaSegura(valor);
  if (eva) return eva;

  try {
    const url = new URL(String(valor || "").trim());
    const storageNoticias =
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "dteimbhwtzghhsijeeld.supabase.co" &&
      /^\/storage\/v1\/object\/public\/eva-publico\/noticias\/[a-z0-9._/-]+$/i.test(url.pathname);

    return storageNoticias ? url.href : null;
  } catch (error) {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const buscador = document.querySelector("#buscador-modulos");
  const mensajeBusqueda = document.querySelector("#resultado-busqueda-modulos");
  const listaResultados = document.querySelector("#lista-resultados-busqueda");
  const botonLimpiar = document.querySelector("#boton-limpiar-busqueda");
  const sugerencias = document.querySelectorAll(".sugerencia-busqueda");
  const botonArriba = document.querySelector("#volver-arriba");

  if (listaResultados) {
    listaResultados.setAttribute("role", "region");
    listaResultados.setAttribute("aria-live", "polite");
  }

  let indiceBusqueda = [];

  const normalizarTexto = (texto) => {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const crearIndiceDesdeTarjetas = () => {
    return Array.from(document.querySelectorAll(".tarjetas .tarjeta, .tarjeta-acceso")).map((elemento) => {
      const titulo = elemento.querySelector("h2, h3")?.textContent?.trim() || elemento.textContent.trim();
      const descripcion = elemento.querySelector("p")?.textContent?.trim() || "Acceso del ecosistema EVA.";
      return {
        titulo,
        modulo: elemento.querySelector(".numero, .icono-acceso")?.textContent?.trim() || "EVA",
        tipo: elemento.classList.contains("tarjeta") ? "Módulo" : "Acceso complementario",
        descripcion,
        url: elemento.getAttribute("href") || "#",
        etiquetas: ""
      };
    });
  };

  const cargarIndiceBusqueda = async () => {
    try {
      const respuesta = await fetch("busqueda.json", { cache: "no-store" });
      if (!respuesta.ok) throw new Error("No se pudo cargar busqueda.json");
      const datos = await respuesta.json();
      indiceBusqueda = Array.isArray(datos) ? datos : [];
    } catch (error) {
      indiceBusqueda = crearIndiceDesdeTarjetas();
    }
  };

  const limpiarResultados = () => {
    if (listaResultados) listaResultados.replaceChildren();
  };

  const construirTextoBusqueda = (item) => {
    return normalizarTexto([
      item.titulo,
      item.modulo,
      item.tipo,
      item.descripcion,
      item.etiquetas
    ].join(" "));
  };

  const nombreGrupo = (tipo) => {
    const texto = normalizarTexto(tipo);
    if (texto.includes("modulo")) return "Módulos";
    if (texto.includes("juego")) return "Juegos y actividades";
    if (texto.includes("directorio")) return "Directorios";
    if (texto.includes("recurso")) return "Recursos";
    if (texto.includes("subpagina")) return "Subpáginas";
    if (texto.includes("acceso")) return "Accesos complementarios";
    return "Otros resultados";
  };

  const crearResultado = (item) => {
    const urlSegura = resolverUrlEvaSegura(item.url);
    const enlace = document.createElement(urlSegura ? "a" : "span");
    enlace.className = urlSegura ? "resultado-busqueda" : "resultado-busqueda enlace-bloqueado";

    if (urlSegura) {
      enlace.href = urlSegura;
      if (new URL(urlSegura).origin !== window.location.origin) {
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
      }
    }

    const titulo = document.createElement("strong");
    titulo.textContent = `${item.modulo ? item.modulo + " · " : ""}${item.titulo || "Resultado"}`;

    const descripcion = document.createElement("span");
    descripcion.textContent = item.descripcion || "Acceso relacionado del ecosistema EVA.";

    const tipo = document.createElement("small");
    tipo.textContent = item.tipo || "Acceso";

    enlace.append(titulo, descripcion, tipo);
    return enlace;
  };

  const mostrarResultados = (resultados, consulta) => {
    if (!listaResultados || !mensajeBusqueda) return;

    limpiarResultados();

    if (botonLimpiar) {
      botonLimpiar.hidden = !consulta;
    }

    if (!consulta) {
      mensajeBusqueda.textContent = "Se muestran todos los módulos principales. También puede usar las sugerencias para iniciar una búsqueda rápida.";
      return;
    }

    if (!resultados.length) {
      mensajeBusqueda.textContent = "No se encontraron resultados. Pruebe con otra palabra o revise los módulos principales.";
      return;
    }

    mensajeBusqueda.textContent = resultados.length === 1
      ? "Se encontró 1 resultado relacionado."
      : `Se encontraron ${resultados.length} resultados relacionados.`;

    const grupos = new Map();
    resultados.slice(0, 12).forEach((item) => {
      const grupo = nombreGrupo(item.tipo);
      if (!grupos.has(grupo)) grupos.set(grupo, []);
      grupos.get(grupo).push(item);
    });

    const fragmento = document.createDocumentFragment();

    grupos.forEach((items, grupo) => {
      const seccion = document.createElement("section");
      seccion.className = "grupo-resultados-busqueda";

      const tituloGrupo = document.createElement("h3");
      tituloGrupo.textContent = grupo;

      const contenedor = document.createElement("div");
      contenedor.className = "grupo-resultados-lista";

      items.forEach((item) => contenedor.appendChild(crearResultado(item)));
      seccion.append(tituloGrupo, contenedor);
      fragmento.appendChild(seccion);
    });

    listaResultados.appendChild(fragmento);
  };

  const actualizarBusqueda = () => {
    if (!buscador) return;

    const consulta = normalizarTexto(buscador.value);

    if (!consulta) {
      mostrarResultados([], "");
      return;
    }

    const palabras = consulta.split(/\s+/).filter(Boolean);
    const resultados = indiceBusqueda
      .map((item) => {
        const texto = construirTextoBusqueda(item);
        const coincidencias = palabras.filter((palabra) => texto.includes(palabra)).length;
        const tituloNormalizado = normalizarTexto(item.titulo);
        const moduloNormalizado = normalizarTexto(item.modulo);
        const prioridadTitulo = tituloNormalizado.includes(consulta) ? 3 : 0;
        const prioridadModulo = moduloNormalizado === consulta ? 2 : 0;
        return { item, puntaje: coincidencias + prioridadTitulo + prioridadModulo };
      })
      .filter((resultado) => resultado.puntaje > 0)
      .sort((a, b) => b.puntaje - a.puntaje)
      .map((resultado) => resultado.item);

    mostrarResultados(resultados, consulta);
  };

  cargarIndiceBusqueda().then(() => {
    if (buscador) {
      buscador.addEventListener("input", actualizarBusqueda);
      actualizarBusqueda();
    }
  });

  if (botonLimpiar && buscador) {
    botonLimpiar.addEventListener("click", () => {
      buscador.value = "";
      actualizarBusqueda();
      buscador.focus();
    });
  }

  sugerencias.forEach((boton) => {
    boton.addEventListener("click", () => {
      if (!buscador) return;
      buscador.value = boton.dataset.consulta || boton.textContent.trim();
      actualizarBusqueda();
      buscador.focus();
    });
  });

  if (botonArriba) {
    const controlarBotonArriba = () => {
      botonArriba.hidden = window.scrollY < 420;
    };

    controlarBotonArriba();
    window.addEventListener("scroll", controlarBotonArriba, { passive: true });

    botonArriba.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

/* Carrusel de noticias destacadas. */
document.addEventListener("DOMContentLoaded", () => {
  const inicializarCarruselNoticias = async () => {
    const carrusel = document.querySelector(".noticias-carrusel");
    const pista = document.querySelector("#noticias-pista");
    const indicadores = document.querySelector("#noticias-indicadores");
    const botonAnterior = document.querySelector(".noticias-anterior");
    const botonSiguiente = document.querySelector(".noticias-siguiente");

    if (!carrusel || !pista || !indicadores || !botonAnterior || !botonSiguiente) return;

    const viewport = carrusel.querySelector(".noticias-viewport");
    const prefiereReducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPABASE_URL_NOTICIAS = "https://dteimbhwtzghhsijeeld.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY_NOTICIAS = "sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
    const noticiasBase = [
      {
        titulo: "Jornada de sensibilización sobre inclusión educativa",
        descripcion: "Actividad orientada a fortalecer el respeto por la diversidad y promover prácticas de inclusión en la comunidad educativa.",
        imagen: "imagenes/noticias/noticia-1.svg",
        enlace: "https://crebeucayali.github.io/noti-inclusivos/"
      },
      {
        titulo: "Capacitación docente en adaptaciones curriculares",
        descripcion: "Espacio formativo dirigido a docentes y equipos de apoyo para reforzar estrategias pedagógicas accesibles.",
        imagen: "imagenes/noticias/noticia-2.svg",
        enlace: "https://crebeucayali.github.io/capacitaciones/"
      },
      {
        titulo: "Recursos accesibles disponibles en el ecosistema EVA",
        descripcion: "Difusión de materiales educativos accesibles, apoyos visuales y herramientas para la atención a la diversidad.",
        imagen: "imagenes/noticias/noticia-3.svg",
        enlace: "https://crebeucayali.github.io/materiales-educativos-accesibles/"
      },
      {
        titulo: "Acompañamiento a instituciones educativas de la región",
        descripcion: "Acciones de orientación y soporte técnico vinculadas al fortalecimiento de prácticas inclusivas en instituciones educativas.",
        imagen: "imagenes/noticias/noticia-4.svg",
        enlace: "https://crebeucayali.github.io/accesos-complementarios/paginas/lineas-de-accion.html"
      },
      {
        titulo: "Estudiantes de educación superior participan en acciones formativas",
        descripcion: "Participación de estudiantes en jornadas de sensibilización y procesos de formación vinculados a inclusión y accesibilidad.",
        imagen: "imagenes/noticias/noticia-5.svg",
        enlace: "https://crebeucayali.github.io/noti-inclusivos/"
      }
    ];

    const normalizarNoticias = (datos) => {
      if (!Array.isArray(datos)) return [];
      return datos
        .filter((item) => item && item.titulo && item.descripcion)
        .map((item, indice) => {
          const imagen = resolverUrlImagenEvaSegura(
            item.imagen || item.imagen_url || noticiasBase[indice % noticiasBase.length]?.imagen || noticiasBase[0].imagen
          );
          const enlaceOriginal = item.enlace || item.enlace_url || "";
          const enlace = enlaceOriginal ? resolverUrlEvaSegura(enlaceOriginal) : null;
          if (!imagen) return null;

          return {
            titulo: String(item.titulo).trim(),
            descripcion: String(item.descripcion).trim(),
            imagen,
            enlace: enlace || "",
            categoria: String(item.categoria || "Noticia destacada").trim()
          };
        })
        .filter(Boolean);
    };

    const obtenerNoticias = async () => {
      const consultarSupabase = async () => {
        const endpoint = new URL(SUPABASE_URL_NOTICIAS + "/rest/v1/noticias_destacadas");
        endpoint.searchParams.set(
          "select",
          "id,orden,categoria,titulo,descripcion,imagen_url,enlace_url,estado_publicacion,updated_at"
        );
        endpoint.searchParams.set("visible", "eq.true");
        endpoint.searchParams.set("estado_publicacion", "eq.publicado");
        endpoint.searchParams.set("order", "orden.asc,id.asc");

        const respuesta = await fetch(endpoint.href, {
          method: "GET",
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY_NOTICIAS,
            Accept: "application/json"
          },
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "strict-origin-when-cross-origin"
        });

        if (!respuesta.ok) return [];
        return normalizarNoticias(await respuesta.json());
      };

      try {
        const remotas = await consultarSupabase();
        document.documentElement.dataset.noticiasFuente = "supabase";
        return remotas;
      } catch (error) {
        document.documentElement.dataset.noticiasFuente = "no-disponible";
        return [];
      }
    };

    const noticias = await obtenerNoticias();
    if (!noticias.length) {
      const seccionNoticias = carrusel.closest(".noticias-destacadas");
      if (seccionNoticias) seccionNoticias.hidden = true;
      return;
    }

    pista.replaceChildren();
    indicadores.replaceChildren();

    const crearTarjeta = (noticia) => {
      const articulo = document.createElement("article");
      articulo.className = "noticia-tarjeta";

      const figura = document.createElement("figure");
      figura.className = "noticia-media";

      const imagen = document.createElement("img");
      const imagenSegura = resolverUrlImagenEvaSegura(noticia.imagen);
      if (imagenSegura) imagen.src = imagenSegura;
      imagen.alt = noticia.titulo;
      imagen.loading = "lazy";
      figura.appendChild(imagen);

      const contenido = document.createElement("div");
      contenido.className = "noticia-contenido";

      const categoria = document.createElement("span");
      categoria.className = "noticia-categoria";
      categoria.textContent = noticia.categoria || "Noticia destacada";

      const titulo = document.createElement("h3");
      titulo.textContent = noticia.titulo;

      const descripcion = document.createElement("p");
      descripcion.textContent = noticia.descripcion;

      const urlNoticia = noticia.enlace ? resolverUrlEvaSegura(noticia.enlace) : null;

      contenido.append(categoria, titulo, descripcion);

      if (urlNoticia) {
        const enlace = document.createElement("a");
        enlace.className = "noticia-enlace";
        enlace.href = urlNoticia;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        enlace.textContent = "Ampliar noticia →";
        contenido.appendChild(enlace);
      }
      articulo.append(figura, contenido);
      return articulo;
    };

    noticias.forEach((noticia, indice) => {
      pista.appendChild(crearTarjeta(noticia));
      const indicador = document.createElement("button");
      indicador.type = "button";
      indicador.className = "noticias-indicador";
      indicador.setAttribute("aria-label", `Ir a la noticia ${indice + 1}`);
      indicador.addEventListener("click", () => irA(indice, true));
      indicadores.appendChild(indicador);
    });

    const diapositivas = Array.from(pista.children);
    const puntos = Array.from(indicadores.children);
    let indiceActual = 0;
    let temporizador = null;

    const actualizarIndicadores = () => {
      puntos.forEach((punto, indice) => {
        punto.classList.toggle("activo", indice === indiceActual);
        punto.setAttribute("aria-pressed", indice === indiceActual ? "true" : "false");
      });
    };

    const actualizarEstadoDiapositivas = () => {
      diapositivas.forEach((slide, indice) => {
        slide.classList.remove("activa", "vecina", "lejana", "vecina-izquierda", "vecina-derecha");
        const diferencia = indice - indiceActual;
        if (diferencia === 0) {
          slide.classList.add("activa");
        } else if (Math.abs(diferencia) === 1) {
          slide.classList.add("vecina", diferencia < 0 ? "vecina-izquierda" : "vecina-derecha");
        } else {
          slide.classList.add("lejana");
        }
      });
    };

    const desplazar = () => {
      actualizarEstadoDiapositivas();

      window.requestAnimationFrame(() => {
        const slide = diapositivas[indiceActual];
        if (!slide) return;

        const rellenoLateral = Math.max(0, (viewport.clientWidth - slide.clientWidth) / 2);
        pista.style.paddingLeft = `${rellenoLateral}px`;
        pista.style.paddingRight = `${rellenoLateral}px`;

        const offsetObjetivo = slide.offsetLeft - rellenoLateral;
        pista.style.transform = `translateX(${-offsetObjetivo}px)`;
        actualizarIndicadores();
      });
    };

    const irA = (indice, reiniciar = false) => {
      indiceActual = (indice + diapositivas.length) % diapositivas.length;
      desplazar();
      if (reiniciar) {
        detenerAuto();
        iniciarAuto();
      }
    };

    const siguiente = () => irA(indiceActual + 1, true);
    const anterior = () => irA(indiceActual - 1, true);

    const detenerAuto = () => {
      if (!temporizador) return;
      window.clearInterval(temporizador);
      temporizador = null;
    };

    const iniciarAuto = () => {
      if (prefiereReducirMovimiento || diapositivas.length < 2 || temporizador) return;
      temporizador = window.setInterval(() => {
        indiceActual = (indiceActual + 1) % diapositivas.length;
        desplazar();
      }, 6000);
    };

    botonAnterior.addEventListener("click", anterior);
    botonSiguiente.addEventListener("click", siguiente);

    carrusel.addEventListener("mouseenter", detenerAuto);
    carrusel.addEventListener("mouseleave", iniciarAuto);
    carrusel.addEventListener("focusin", detenerAuto);
    carrusel.addEventListener("focusout", iniciarAuto);

    window.addEventListener("resize", desplazar, { passive: true });

    irA(0, false);
    iniciarAuto();
  };

  inicializarCarruselNoticias();
});

