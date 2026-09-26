"use strict";

document.querySelectorAll(".foto-profesional img").forEach((imagen) => {
  const ocultarSiFalla = () => {
    imagen.hidden = true;
  };

  imagen.addEventListener("error", ocultarSiFalla, { once: true });

  if (imagen.complete && imagen.naturalWidth === 0) {
    ocultarSiFalla();
  }
});
