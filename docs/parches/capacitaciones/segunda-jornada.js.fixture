"use strict";

function validarVistaDrive(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return null;

  try {
    const url = new URL(texto);
    const rutaValida = /^\/file\/d\/[A-Za-z0-9_-]+\/preview\/?$/.test(url.pathname);

    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "drive.google.com" ||
      !rutaValida
    ) {
      return null;
    }

    return url.href;
  } catch (error) {
    return null;
  }
}

function validarEnlaceExterno(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return null;

  try {
    const url = new URL(texto);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      !["drive.google.com", "docs.google.com"].includes(host)
    ) {
      return null;
    }
    return url.href;
  } catch (error) {
    return null;
  }
}

function validarRutaLocal(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return null;

  try {
    const url = new URL(texto, window.location.href);

    if (url.origin === window.location.origin) {
      return url.href;
    }

    const storageCapacitaciones =
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "dteimbhwtzghhsijeeld.supabase.co" &&
      /^\/storage\/v1\/object\/public\/eva-publico\/capacitaciones\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname);

    return storageCapacitaciones ? url.href : null;
  } catch (error) {
    return null;
  }
}

function mostrarAvisoDrive(boton, tipo, continuar) {
  const contenedor = boton.closest(".vista-recurso");
  if (!contenedor || contenedor.querySelector(".aviso-drive-previo")) return;

  const aviso = document.createElement("div");
  aviso.className = "aviso-drive-previo";
  aviso.setAttribute("role", "note");

  const texto = document.createElement("p");
  texto.innerHTML = `Al cargar ${tipo}, se establecerá una conexión con <strong>Google Drive</strong>, que puede procesar datos técnicos de la conexión conforme a sus propias políticas.`;

  const acciones = document.createElement("div");
  acciones.className = "acciones-aviso-drive";

  const cargar = document.createElement("button");
  cargar.type = "button";
  cargar.className = "boton-recurso boton-confirmar-drive";
  cargar.textContent = tipo === "el video" ? "Cargar video" : "Cargar vista previa";

  const cancelar = document.createElement("button");
  cancelar.type = "button";
  cancelar.className = "boton-recurso boton-cancelar-drive";
  cancelar.textContent = "Cancelar";

  cargar.addEventListener("click", continuar, { once: true });
  cancelar.addEventListener("click", () => {
    aviso.remove();
    boton.hidden = false;
    boton.focus();
  });

  acciones.append(cargar, cancelar);
  aviso.append(texto, acciones);
  boton.hidden = true;
  contenedor.appendChild(aviso);
  cargar.focus();
}

function cargarVistaDrive(boton, selectorContenedor, titulo, permisos) {
  const contenedor = boton.closest(selectorContenedor);
  const url = validarVistaDrive(
    boton.dataset.slideSrc || boton.dataset.videoSrc
  );

  if (!contenedor || !url) return;

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.title = titulo;
  iframe.loading = "lazy";
  iframe.allow = permisos;
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";

  contenedor.classList.remove("marcador");
  contenedor.replaceChildren(iframe);
}

function crearRecursoPendiente(titulo, mensaje, estadoTexto) {
  const articulo = document.createElement("article");
  articulo.className = "recurso recurso-pendiente";

  const encabezado = document.createElement("h4");
  encabezado.textContent = titulo;

  const vista = document.createElement("div");
  vista.className = "vista-recurso marcador";
  vista.textContent = mensaje;

  const estado = document.createElement("span");
  estado.className = "boton-recurso deshabilitado";
  estado.textContent = estadoTexto;

  articulo.append(encabezado, vista, estado);
  return articulo;
}

function crearRecursoInfografia(ruta) {
  const segura = validarRutaLocal(ruta);
  if (!segura) {
    return crearRecursoPendiente("Infografía", "Pendiente de publicación", "Sin archivo");
  }

  const articulo = document.createElement("article");
  articulo.className = "recurso";

  const titulo = document.createElement("h4");
  titulo.textContent = "Infografía";

  const vista = document.createElement("a");
  vista.className = "vista-recurso";
  vista.href = segura;
  vista.target = "_blank";
  vista.rel = "noopener noreferrer";

  const imagen = document.createElement("img");
  imagen.src = segura;
  imagen.alt = "Infografía de la sesión";
  imagen.loading = "lazy";
  imagen.decoding = "async";
  vista.appendChild(imagen);

  const enlace = document.createElement("a");
  enlace.className = "boton-recurso";
  enlace.href = segura;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
  enlace.textContent = "Abrir infografía";

  articulo.append(titulo, vista, enlace);
  return articulo;
}

function crearRecursoDocumento(fila) {
  const preview = validarVistaDrive(fila.diapositivas_preview_url);
  const externo = validarEnlaceExterno(fila.diapositivas_url);
  const pdf = validarEnlaceExterno(fila.pdf_url);

  if (!preview && !externo && !pdf) {
    return crearRecursoPendiente("PDF", "Pendiente de publicación", "Sin enlace");
  }

  const articulo = document.createElement("article");
  articulo.className = "recurso";

  const titulo = document.createElement("h4");
  titulo.textContent = preview || externo ? "Diapositivas (PPTX)" : "PDF";

  if (preview) {
    const vista = document.createElement("div");
    vista.className = "vista-recurso pdf-recurso marcador";

    const boton = document.createElement("button");
    boton.className = "boton-recurso boton-cargar-diapositivas";
    boton.type = "button";
    boton.dataset.slideSrc = preview;
    boton.textContent = "Ver vista previa";
    vista.appendChild(boton);
    articulo.append(titulo, vista);
  } else {
    const vista = document.createElement("div");
    vista.className = "vista-recurso marcador";
    vista.textContent = "Material disponible para abrir externamente.";
    articulo.append(titulo, vista);
  }

  const enlaceFinal = externo || pdf;
  if (enlaceFinal) {
    const enlace = document.createElement("a");
    enlace.className = "boton-recurso";
    enlace.href = enlaceFinal;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.textContent = externo ? "Abrir diapositivas en Drive" : "Abrir PDF en Drive";
    articulo.appendChild(enlace);
  }

  return articulo;
}

function crearRecursoVideo(fila) {
  const preview = validarVistaDrive(fila.video_preview_url);
  const externo = validarEnlaceExterno(fila.video_url);

  if (!preview && !externo) {
    return crearRecursoPendiente("Video", "Pendiente de publicación", "Sin enlace");
  }

  const articulo = document.createElement("article");
  articulo.className = "recurso";

  const titulo = document.createElement("h4");
  titulo.textContent = "Video";

  if (preview) {
    const vista = document.createElement("div");
    vista.className = "vista-recurso video-recurso marcador";
    vista.dataset.videoSrc = preview;

    const boton = document.createElement("button");
    boton.className = "boton-recurso boton-cargar-video";
    boton.type = "button";
    boton.dataset.videoSrc = preview;
    boton.textContent = "Ver video";
    vista.appendChild(boton);
    articulo.append(titulo, vista);
  } else {
    const vista = document.createElement("div");
    vista.className = "vista-recurso marcador";
    vista.textContent = "Video disponible para abrir externamente.";
    articulo.append(titulo, vista);
  }

  if (externo) {
    const enlace = document.createElement("a");
    enlace.className = "boton-recurso";
    enlace.href = externo;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.textContent = "Abrir video en Drive";
    articulo.appendChild(enlace);
  }

  return articulo;
}

function crearMaterialesAdicionales(fila) {
  const materiales = Array.isArray(fila.recursos_adicionales)
    ? fila.recursos_adicionales
    : [];

  if (!materiales.length) return null;

  const seccion = document.createElement("section");
  seccion.className = "materiales-complementarios";
  const idTitulo = `sesion-${fila.numero_sesion}-materiales`;
  seccion.setAttribute("aria-labelledby", idTitulo);

  const encabezado = document.createElement("div");
  encabezado.className = "materiales-encabezado";
  encabezado.innerHTML = `<p class="seccion-etiqueta">Materiales complementarios</p><h4 id="${idTitulo}">Materiales compartidos por la ponente</h4><p>Documentos complementarios utilizados durante la sesión para ampliar y aplicar los contenidos desarrollados.</p>`;

  const lista = document.createElement("div");
  lista.className = "lista-materiales-complementarios";

  materiales.forEach((material, indice) => {
    const url = validarEnlaceExterno(material?.url);
    if (!url) return;

    const articulo = document.createElement("article");
    articulo.className = "material-complementario";

    const numero = document.createElement("span");
    numero.className = "material-numero";
    numero.textContent = String(indice + 1).padStart(2, "0");

    const contenido = document.createElement("div");
    const titulo = document.createElement("h5");
    titulo.textContent = String(material?.titulo || "Material complementario");
    const descripcion = document.createElement("p");
    descripcion.textContent = String(material?.descripcion || "Documento complementario.");
    contenido.append(titulo, descripcion);

    const enlace = document.createElement("a");
    enlace.className = "boton-recurso";
    enlace.href = url;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.textContent = "Abrir en Drive";

    articulo.append(numero, contenido, enlace);
    lista.appendChild(articulo);
  });

  seccion.append(encabezado, lista);
  return lista.childElementCount ? seccion : null;
}

function aplicarFilaSupabase(articulo, fila) {
  if (!articulo || !fila) return;

  articulo.classList.toggle("disponible", fila.estado === "disponible");
  articulo.classList.toggle("pendiente", fila.estado !== "disponible");

  const etiqueta = articulo.querySelector(".seccion-etiqueta");
  const fecha = articulo.querySelector(".fecha");
  const titulo = articulo.querySelector(".cabecera-capacitacion h3");
  const tema = articulo.querySelector(".tema");

  if (etiqueta) etiqueta.textContent = fila.etiqueta || `Segunda jornada · Sesión ${fila.numero_sesion} de 10`;
  if (fecha) fecha.textContent = fila.fecha_texto || "";
  if (titulo) {
    titulo.textContent = fila.titulo || "";
    titulo.id = `sesion-${fila.numero_sesion}-titulo`;
    articulo.setAttribute("aria-labelledby", titulo.id);
  }
  if (tema) tema.textContent = fila.tema || "";

  const recursos = articulo.querySelector(".recursos");
  if (recursos) {
    recursos.replaceChildren(
      crearRecursoInfografia(fila.infografia_url),
      crearRecursoDocumento(fila),
      crearRecursoVideo(fila)
    );
  }

  articulo.querySelector(".materiales-complementarios")?.remove();
  const adicionales = crearMaterialesAdicionales(fila);
  if (adicionales) {
    articulo.querySelector(".tarjeta-capacitacion")?.appendChild(adicionales);
  }
}

async function cargarSegundaJornadaDesdeSupabase() {
  const articulos = [...document.querySelectorAll("#lineaTiempo > article.capacitacion")];
  articulos.forEach(articulo => { articulo.hidden = true; });
  if (!window.EVASupabasePublico?.consultarSesiones) return;

  try {
    const filas = await window.EVASupabasePublico.consultarSesiones(2);
    filas.forEach((fila) => {
      const articulo = articulos[fila.numero_sesion - 1];
      if (!articulo) return;
      aplicarFilaSupabase(articulo, fila);
      articulo.hidden = false;
    });
    document.documentElement.dataset.capacitacionesFuente = "supabase";
  } catch (error) {
    document.documentElement.dataset.capacitacionesFuente = "no-disponible";
    console.warn("Segunda jornada: no se pudo verificar el contenido publicado.", error);
  }
}

cargarSegundaJornadaDesdeSupabase();

document.addEventListener("click", (evento) => {
  const botonDiapositivas = evento.target.closest(".boton-cargar-diapositivas");
  if (botonDiapositivas) {
    mostrarAvisoDrive(botonDiapositivas, "la vista previa", () => {
      cargarVistaDrive(
        botonDiapositivas,
        ".pdf-recurso",
        "Vista previa de las diapositivas de la sesión",
        "fullscreen"
      );
    });
    return;
  }

  const botonVideo = evento.target.closest(".boton-cargar-video");
  if (botonVideo) {
    mostrarAvisoDrive(botonVideo, "el video", () => {
      cargarVistaDrive(
        botonVideo,
        ".video-recurso",
        "Vista previa del video de la sesión",
        "autoplay; fullscreen"
      );
    });
  }
});
