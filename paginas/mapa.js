(function(){
  const grupos = Array.from(document.querySelectorAll('[data-mapa-grupo]'));

  function obtenerElementos(grupo){
    const boton = grupo.querySelector('.mapa-cabecera .mapa-desplegar');
    const panel = grupo.querySelector(':scope > .mapa-contenido');
    return { boton, panel };
  }

  function establecerEstado(boton, panel, abierto){
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    panel.hidden = !abierto;
    panel.classList.toggle('esta-abierto', abierto);
    boton.textContent = abierto ? 'Ocultar accesos' : 'Ver accesos';
  }

  grupos.forEach((grupo) => {
    const { boton, panel } = obtenerElementos(grupo);
    if(!boton || !panel) return;

    establecerEstado(boton, panel, false);

    boton.addEventListener('click', () => {
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      establecerEstado(boton, panel, !abierto);
    });

    grupo.addEventListener('mouseenter', () => {
      if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
        establecerEstado(boton, panel, true);
      }
    });

    grupo.addEventListener('mouseleave', () => {
      if(window.matchMedia('(hover:hover) and (pointer:fine)').matches && !grupo.contains(document.activeElement)){
        establecerEstado(boton, panel, false);
      }
    });

    grupo.addEventListener('focusin', () => establecerEstado(boton, panel, true));
    grupo.addEventListener('focusout', (evento) => {
      if(!grupo.contains(evento.relatedTarget)){
        establecerEstado(boton, panel, false);
      }
    });
  });

  document.addEventListener('keydown', (evento) => {
    if(evento.key !== 'Escape') return;

    grupos.forEach((grupo) => {
      const { boton, panel } = obtenerElementos(grupo);
      if(boton && panel) establecerEstado(boton, panel, false);
    });
  });
})();