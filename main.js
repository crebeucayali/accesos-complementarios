document.addEventListener("DOMContentLoaded", () => {
  const buscador = document.querySelector("#buscador-modulos");
  const mensajeBusqueda = document.querySelector("#resultado-busqueda-modulos");
  const listaResultados = document.querySelector("#lista-resultados-busqueda");
  const botonLimpiar = document.querySelector("#boton-limpiar-busqueda");
  const sugerencias = document.querySelectorAll(".sugerencia-busqueda");
  const botonTexto = document.querySelector("#boton-texto");
  const botonContraste = document.querySelector("#boton-contraste");
  const botonRestablecer = document.querySelector("#boton-restablecer");
  const botonArriba = document.querySelector("#volver-arriba");

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
    if (listaResultados) listaResultados.innerHTML = "";
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
    const enlace = document.createElement("a");
    enlace.className = "resultado-busqueda";
    enlace.href = item.url || "#";

    if (enlace.href.startsWith("http")) {
      enlace.target = "_blank";
      enlace.rel = "noopener noreferrer";
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

  const aplicarPreferencias = () => {
    const nivelTexto = localStorage.getItem("evaTextoNivel") || "normal";
    const contrasteActivo = localStorage.getItem("evaContraste") === "activo";

    document.body.classList.remove("texto-grande", "texto-muy-grande");
    if (nivelTexto === "grande") document.body.classList.add("texto-grande");
    if (nivelTexto === "muy-grande") document.body.classList.add("texto-muy-grande");

    document.body.classList.toggle("alto-contraste", contrasteActivo);

    if (botonTexto) {
      const etiqueta = nivelTexto === "normal" ? "Texto grande" : nivelTexto === "grande" ? "Texto muy grande" : "Texto normal";
      botonTexto.textContent = etiqueta;
      botonTexto.setAttribute("aria-pressed", nivelTexto !== "normal" ? "true" : "false");
    }

    if (botonContraste) {
      botonContraste.setAttribute("aria-pressed", contrasteActivo ? "true" : "false");
    }

  };

  aplicarPreferencias();

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

  if (botonTexto) {
    botonTexto.addEventListener("click", () => {
      const nivelActual = localStorage.getItem("evaTextoNivel") || "normal";
      const nuevoNivel = nivelActual === "normal" ? "grande" : nivelActual === "grande" ? "muy-grande" : "normal";
      localStorage.setItem("evaTextoNivel", nuevoNivel);
      aplicarPreferencias();
    });
  }

  if (botonContraste) {
    botonContraste.addEventListener("click", () => {
      const activo = !document.body.classList.contains("alto-contraste");
      localStorage.setItem("evaContraste", activo ? "activo" : "inactivo");
      aplicarPreferencias();
    });
  }


  if (botonRestablecer) {
    botonRestablecer.addEventListener("click", () => {
      localStorage.removeItem("evaTextoNivel");
      localStorage.removeItem("evaTextoGrande");
      localStorage.removeItem("evaContraste");
      aplicarPreferencias();
      if (buscador) {
        buscador.value = "";
        actualizarBusqueda();
        buscador.focus();
      }
    });
  }

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

/* Recorrido guiado de accesibilidad. */
document.addEventListener("DOMContentLoaded", () => {
  const botonGuia = document.querySelector("#boton-guia");
  if (!botonGuia) return;

  const pasosGuia = [
    {
      selector: ".cabecera-crebe",
      titulo: "Cabecera principal",
      texto: "Aquí se presenta la identidad del CREBE Ucayali y el acceso inicial a la plataforma. Esta zona ayuda a reconocer el espacio institucional desde el primer momento."
    },
    {
      selector: ".campo-busqueda-modulos",
      titulo: "Búsqueda de recursos",
      texto: "El buscador permite ubicar módulos, recursos o temas específicos. También se pueden usar las sugerencias rápidas para encontrar materiales, juegos, braille, señas, noticias o contacto."
    },
    {
      selector: ".controles-accesibilidad",
      titulo: "Controles de accesibilidad",
      texto: "Estos botones permiten ampliar el texto, activar alto contraste y restablecer la vista. Sirven como apoyos básicos para mejorar la lectura y navegación."
    },
    {
      selector: ".tarjetas",
      titulo: "Módulos del ecosistema",
      texto: "En esta sección se agrupan los módulos principales: capacitaciones, banco digital, materiales, juegos, noticias y repositorio accesible. Cada tarjeta abre un espacio con recursos específicos."
    },
    {
      selector: ".accesos-complementarios-weebly",
      titulo: "Accesos complementarios",
      texto: "Aquí se reúnen espacios de apoyo, como líneas de acción, firma de visita, calendario y galería. Funcionan como complementos para la participación y organización institucional."
    },
    {
      selector: ".firma-visita-acceso",
      titulo: "Firma tu visita",
      texto: "Este acceso permite registrar la participación de docentes, familias, visitantes y comunidad educativa que ingresan a la plataforma."
    },
    {
      selector: ".pie-crebe",
      titulo: "Información institucional",
      texto: "El pie de página mantiene datos generales del CREBE, enlaces de información, redes sociales, ubicación y horario de atención."
    }
  ];

  let pasoActual = 0;
  let overlay = null;
  let resaltado = null;
  let panel = null;
  let ultimoFoco = null;

  const crearElementosGuia = () => {
    overlay = document.createElement("div");
    overlay.className = "guia-overlay";
    overlay.setAttribute("aria-hidden", "true");

    resaltado = document.createElement("div");
    resaltado.className = "guia-resaltado";
    resaltado.setAttribute("aria-hidden", "true");

    panel = document.createElement("section");
    panel.className = "guia-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "guia-titulo");
    panel.innerHTML = `
      <span class="guia-contador"></span>
      <h2 id="guia-titulo"></h2>
      <p id="guia-texto"></p>
      <div class="guia-acciones">
        <button type="button" class="guia-anterior">Anterior</button>
        <button type="button" class="guia-cerrar">Cerrar</button>
        <button type="button" class="guia-siguiente">Siguiente</button>
      </div>
    `;

    document.body.append(overlay, resaltado, panel);

    panel.querySelector(".guia-anterior").addEventListener("click", retrocederGuia);
    panel.querySelector(".guia-cerrar").addEventListener("click", cerrarGuia);
    panel.querySelector(".guia-siguiente").addEventListener("click", avanzarGuia);
    overlay.addEventListener("click", cerrarGuia);
  };

  const obtenerPasoValido = () => {
    while (pasoActual < pasosGuia.length) {
      const objetivo = document.querySelector(pasosGuia[pasoActual].selector);
      if (objetivo) return { paso: pasosGuia[pasoActual], objetivo };
      pasoActual += 1;
    }
    return null;
  };

  const ubicarPanel = (rect) => {
    const margen = 16;
    const anchoPanel = panel.offsetWidth || 360;
    const altoPanel = panel.offsetHeight || 190;
    const espacioAbajo = window.innerHeight - rect.bottom;
    const espacioArriba = rect.top;
    let top = rect.bottom + margen;

    if (espacioAbajo < altoPanel + margen && espacioArriba > altoPanel + margen) {
      top = rect.top - altoPanel - margen;
    }

    top = Math.max(margen, Math.min(top, window.innerHeight - altoPanel - margen));
    let left = rect.left;

    if (left + anchoPanel > window.innerWidth - margen) {
      left = window.innerWidth - anchoPanel - margen;
    }

    left = Math.max(margen, left);
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  };

  const mostrarPaso = () => {
    const datos = obtenerPasoValido();
    if (!datos) {
      cerrarGuia();
      return;
    }

    const { paso, objetivo } = datos;
    objetivo.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    window.setTimeout(() => {
      const rect = objetivo.getBoundingClientRect();
      const margen = 8;
      resaltado.style.top = `${rect.top + window.scrollY - margen}px`;
      resaltado.style.left = `${rect.left + window.scrollX - margen}px`;
      resaltado.style.width = `${rect.width + margen * 2}px`;
      resaltado.style.height = `${rect.height + margen * 2}px`;

      panel.querySelector(".guia-contador").textContent = `Paso ${pasoActual + 1} de ${pasosGuia.length}`;
      panel.querySelector("#guia-titulo").textContent = paso.titulo;
      panel.querySelector("#guia-texto").textContent = paso.texto;
      panel.querySelector(".guia-anterior").disabled = pasoActual === 0;
      panel.querySelector(".guia-anterior").textContent = "Anterior";
      panel.querySelector(".guia-cerrar").textContent = "Cerrar";
      panel.querySelector(".guia-siguiente").textContent = pasoActual === pasosGuia.length - 1 ? "Finalizar" : "Siguiente";
      ubicarPanel(rect);
      panel.querySelector(".guia-siguiente").focus({ preventScroll: true });
    }, 240);
  };

  const iniciarGuia = () => {
    ultimoFoco = document.activeElement;
    pasoActual = 0;
    if (!overlay) crearElementosGuia();
    document.body.classList.add("guia-activa");
    overlay.hidden = false;
    resaltado.hidden = false;
    panel.hidden = false;
    mostrarPaso();
  };

  function avanzarGuia(){
    if (pasoActual >= pasosGuia.length - 1) {
      cerrarGuia();
      return;
    }
    pasoActual += 1;
    mostrarPaso();
  }

  function retrocederGuia(){
    if (pasoActual <= 0) return;
    pasoActual -= 1;
    mostrarPaso();
  }

  function cerrarGuia(){
    document.body.classList.remove("guia-activa");
    if (overlay) overlay.hidden = true;
    if (resaltado) resaltado.hidden = true;
    if (panel) panel.hidden = true;
    if (ultimoFoco && typeof ultimoFoco.focus === "function") {
      ultimoFoco.focus({ preventScroll: true });
    }
  }

  document.addEventListener("keydown", (evento) => {
    if (!panel || panel.hidden) return;
    if (evento.key === "Escape") cerrarGuia();
    if (evento.key === "ArrowRight") avanzarGuia();
    if (evento.key === "ArrowLeft") retrocederGuia();
  });

  window.addEventListener("resize", () => {
    if (!panel || panel.hidden) return;
    mostrarPaso();
  });

  window.addEventListener("scroll", () => {
    if (!panel || panel.hidden) return;
    const datos = obtenerPasoValido();
    if (!datos) return;
    const rect = datos.objetivo.getBoundingClientRect();
    const margen = 8;
    resaltado.style.top = `${rect.top + window.scrollY - margen}px`;
    resaltado.style.left = `${rect.left + window.scrollX - margen}px`;
    resaltado.style.width = `${rect.width + margen * 2}px`;
    resaltado.style.height = `${rect.height + margen * 2}px`;
  }, { passive: true });


  const inicializarCarruselNoticias = async () => {
    const carrusel = document.querySelector(".noticias-carrusel");
    const pista = document.querySelector("#noticias-pista");
    const indicadores = document.querySelector("#noticias-indicadores");
    const botonAnterior = document.querySelector(".noticias-anterior");
    const botonSiguiente = document.querySelector(".noticias-siguiente");

    if (!carrusel || !pista || !indicadores || !botonAnterior || !botonSiguiente) return;

    const viewport = carrusel.querySelector(".noticias-viewport");
    const sourceUrl = carrusel.dataset.newsSource;
    const fallbackUrl = carrusel.dataset.fallbackSource || "noticias-destacadas.json";
    const prefiereReducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const noticiasBase = [
      {
        titulo: "Jornada de sensibilización sobre inclusión educativa",
        descripcion: "Actividad orientada a fortalecer el respeto por la diversidad y promover prácticas de inclusión en la comunidad educativa.",
        imagen: "imagenes/noticias/noticia-1.svg",
        enlace: "https://gabriel-lsp.github.io/noti-inclusivos/"
      },
      {
        titulo: "Capacitación docente en adaptaciones curriculares",
        descripcion: "Espacio formativo dirigido a docentes y equipos de apoyo para reforzar estrategias pedagógicas accesibles.",
        imagen: "imagenes/noticias/noticia-2.svg",
        enlace: "https://gabriel-lsp.github.io/capacitaciones-crebe-ucayali/"
      },
      {
        titulo: "Recursos accesibles disponibles en el ecosistema EVA",
        descripcion: "Difusión de materiales educativos accesibles, apoyos visuales y herramientas para la atención a la diversidad.",
        imagen: "imagenes/noticias/noticia-3.svg",
        enlace: "https://gabriel-lsp.github.io/materiales-educativos-accesibles/"
      },
      {
        titulo: "Acompañamiento a instituciones educativas de la región",
        descripcion: "Acciones de orientación y soporte técnico vinculadas al fortalecimiento de prácticas inclusivas en instituciones educativas.",
        imagen: "imagenes/noticias/noticia-4.svg",
        enlace: "https://gabriel-lsp.github.io/accesos-complementarios/paginas/lineas-de-accion.html"
      },
      {
        titulo: "Estudiantes de educación superior participan en acciones formativas",
        descripcion: "Participación de estudiantes en jornadas de sensibilización y procesos de formación vinculados a inclusión y accesibilidad.",
        imagen: "imagenes/noticias/noticia-5.svg",
        enlace: "https://gabriel-lsp.github.io/noti-inclusivos/"
      }
    ];

    const normalizarNoticias = (datos) => {
      if (!Array.isArray(datos)) return [];
      return datos
        .filter((item) => item && item.titulo && item.descripcion && item.enlace)
        .slice(0, 5)
        .map((item, indice) => ({
          titulo: String(item.titulo).trim(),
          descripcion: String(item.descripcion).trim(),
          imagen: String(item.imagen || noticiasBase[indice]?.imagen || noticiasBase[0].imagen).trim(),
          enlace: String(item.enlace).trim(),
          categoria: String(item.categoria || "Noticia destacada").trim()
        }));
    };

    const obtenerNoticias = async () => {
      const intentar = async (url) => {
        if (!url) return [];
        const respuesta = await fetch(url, { cache: "no-store" });
        if (!respuesta.ok) return [];
        return normalizarNoticias(await respuesta.json());
      };

      try {
        const externas = await intentar(sourceUrl);
        if (externas.length) return externas;
      } catch (error) {}

      try {
        const locales = await intentar(fallbackUrl);
        if (locales.length) return locales;
      } catch (error) {}

      return noticiasBase.map((item) => ({ ...item, categoria: "Noticia destacada" }));
    };

    const noticias = await obtenerNoticias();
    if (!noticias.length) return;

    pista.innerHTML = "";
    indicadores.innerHTML = "";

    const crearTarjeta = (noticia) => {
      const articulo = document.createElement("article");
      articulo.className = "noticia-tarjeta";

      const figura = document.createElement("figure");
      figura.className = "noticia-media";

      const imagen = document.createElement("img");
      imagen.src = noticia.imagen;
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

      const enlace = document.createElement("a");
      enlace.className = "noticia-enlace";
      enlace.href = noticia.enlace;
      enlace.target = "_blank";
      enlace.rel = "noopener noreferrer";
      enlace.textContent = "Ampliar noticia →";

      contenido.append(categoria, titulo, descripcion, enlace);
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

  botonGuia.addEventListener("click", iniciarGuia);
});
