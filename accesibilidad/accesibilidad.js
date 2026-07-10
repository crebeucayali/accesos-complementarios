/* Herramienta común de accesibilidad para EVA / Accesos Complementarios.
   Insertar en cualquier página junto al CSS común. */

(function(){
  const STORAGE_KEY = 'eva_accesibilidad_preferencias';
  const CLASES = ['eva-alto-contraste','eva-texto-grande','eva-texto-muy-grande','eva-espaciado-amplio','eva-reducir-movimiento'];

  const opciones = [
    { id:'alto-contraste', texto:'Alto contraste', clase:'eva-alto-contraste' },
    { id:'texto-grande', texto:'Texto grande', clase:'eva-texto-grande', excluye:['eva-texto-muy-grande'] },
    { id:'texto-muy-grande', texto:'Texto muy grande', clase:'eva-texto-muy-grande', excluye:['eva-texto-grande'] }
  ];

  function insertarRefuerzoContraste(){
    if(document.getElementById('eva-refuerzo-contraste')) return;
    const estilo = document.createElement('style');
    estilo.id = 'eva-refuerzo-contraste';
    estilo.textContent = `
      html.eva-alto-contraste body .panel-presentacion,
      html.eva-alto-contraste body .aviso-pedagogico,
      html.eva-alto-contraste body .tarjeta-material,
      html.eva-alto-contraste body .nota,
      html.eva-alto-contraste body .panel-braille,
      html.eva-alto-contraste body .bloque-generador,
      html.eva-alto-contraste body .vista-previa,
      html.eva-alto-contraste body .resultado,
      html.eva-alto-contraste body .panel-descarga,
      html.eva-alto-contraste body .bloque-uso,
      html.eva-alto-contraste body .panel-busqueda,
      html.eva-alto-contraste body .campo-picto,
      html.eva-alto-contraste body .licencia-visible,
      html.eva-alto-contraste body .tarjeta-picto,
      html.eva-alto-contraste body .marco-picto,
      html.eva-alto-contraste body .estado-vacio,
      html.eva-alto-contraste body .mensaje-error,
      html.eva-alto-contraste body .panel-rutinas,
      html.eva-alto-contraste body .configuracion-rutina,
      html.eva-alto-contraste body .zona-construccion,
      html.eva-alto-contraste body .bloque-editor,
      html.eva-alto-contraste body .bloque-buscador,
      html.eva-alto-contraste body .licencia-rutina,
      html.eva-alto-contraste body .rutina-preview,
      html.eva-alto-contraste body .rutina-lienzo,
      html.eva-alto-contraste body .paso-libre,
      html.eva-alto-contraste body .marco-paso,
      html.eva-alto-contraste body .rutina-item,
      html.eva-alto-contraste body .opcion-picto,
      html.eva-alto-contraste body .panel-generador,
      html.eva-alto-contraste body .configuracion-silabas,
      html.eva-alto-contraste body .vista-silabas,
      html.eva-alto-contraste body .vista-cabecera,
      html.eva-alto-contraste body .hoja-ficha,
      html.eva-alto-contraste body .cabecera-ficha,
      html.eva-alto-contraste body .bloque-ficha,
      html.eva-alto-contraste body .imagen-ficha,
      html.eva-alto-contraste body .miniatura-imagen,
      html.eva-alto-contraste body .mensaje-arasaac,
      html.eva-alto-contraste body .tabla-actividad,
      html.eva-alto-contraste body .tabla-actividad th,
      html.eva-alto-contraste body .tabla-actividad td{
        color:#ffffff!important;
        background:#000000!important;
        border-color:#ffffff!important;
        box-shadow:none!important;
        opacity:1!important;
      }

      html.eva-alto-contraste body .panel-presentacion h2,
      html.eva-alto-contraste body .panel-presentacion p,
      html.eva-alto-contraste body .aviso-pedagogico h2,
      html.eva-alto-contraste body .aviso-pedagogico p,
      html.eva-alto-contraste body .tarjeta-material h3,
      html.eva-alto-contraste body .tarjeta-material p,
      html.eva-alto-contraste body .nota h2,
      html.eva-alto-contraste body .nota p,
      html.eva-alto-contraste body .panel-braille h2,
      html.eva-alto-contraste body .panel-braille h3,
      html.eva-alto-contraste body .panel-braille p,
      html.eva-alto-contraste body .texto-panel-braille,
      html.eva-alto-contraste body .etiqueta-campo,
      html.eva-alto-contraste body .mensaje-inicial,
      html.eva-alto-contraste body .sugerencia,
      html.eva-alto-contraste body .panel-descarga h2,
      html.eva-alto-contraste body .panel-descarga p,
      html.eva-alto-contraste body .bloque-uso p,
      html.eva-alto-contraste body .ayuda,
      html.eva-alto-contraste body .contador,
      html.eva-alto-contraste body .licencia-visible,
      html.eva-alto-contraste body .licencia-visible strong,
      html.eva-alto-contraste body .tarjeta-picto h3,
      html.eva-alto-contraste body .tarjeta-picto p,
      html.eva-alto-contraste body .estado-vacio h3,
      html.eva-alto-contraste body .estado-vacio p,
      html.eva-alto-contraste body .mensaje-error h3,
      html.eva-alto-contraste body .mensaje-error p,
      html.eva-alto-contraste body .panel-rutinas h2,
      html.eva-alto-contraste body .panel-rutinas h3,
      html.eva-alto-contraste body .panel-rutinas p,
      html.eva-alto-contraste body .texto-panel-rutinas,
      html.eva-alto-contraste body .campo-configuracion label,
      html.eva-alto-contraste body .ayuda-editor,
      html.eva-alto-contraste body .estado-busqueda,
      html.eva-alto-contraste body .placeholder-paso,
      html.eva-alto-contraste body .opcion-picto span,
      html.eva-alto-contraste body .rutina-preview h2,
      html.eva-alto-contraste body .rutina-lienzo h3,
      html.eva-alto-contraste body .rutina-item p,
      html.eva-alto-contraste body .rutina-atribucion,
      html.eva-alto-contraste body .panel-generador h2,
      html.eva-alto-contraste body .panel-generador h3,
      html.eva-alto-contraste body .panel-generador p,
      html.eva-alto-contraste body .texto-panel-silabas,
      html.eva-alto-contraste body .grupo-formulario label,
      html.eva-alto-contraste body .grupo-opciones p,
      html.eva-alto-contraste body .nota-campo,
      html.eva-alto-contraste body .opcion-ficha,
      html.eva-alto-contraste body .vista-cabecera p,
      html.eva-alto-contraste body .cabecera-ficha h2,
      html.eva-alto-contraste body .cabecera-ficha p,
      html.eva-alto-contraste body .bloque-ficha h3,
      html.eva-alto-contraste body .bloque-ficha p,
      html.eva-alto-contraste body .palabra-principal,
      html.eva-alto-contraste body .actividad-linea,
      html.eva-alto-contraste body .pie-ficha{
        color:#ffffff!important;
        background:transparent!important;
        text-shadow:none!important;
        opacity:1!important;
      }

      html.eva-alto-contraste body .material-icono,
      html.eva-alto-contraste body .estado-material,
      html.eva-alto-contraste body .enlace-material,
      html.eva-alto-contraste body .boton,
      html.eva-alto-contraste body .boton-secundario,
      html.eva-alto-contraste body .boton-primario,
      html.eva-alto-contraste body .boton-descarga,
      html.eva-alto-contraste body .boton-picto,
      html.eva-alto-contraste body .boton-rutina,
      html.eva-alto-contraste body .descargar-png,
      html.eva-alto-contraste body .abrir-original,
      html.eva-alto-contraste body .aviso-icono,
      html.eva-alto-contraste body .etiqueta-ficha,
      html.eva-alto-contraste body .chip-silaba,
      html.eva-alto-contraste body .casilla-silaba,
      html.eva-alto-contraste body .caja-recorte,
      html.eva-alto-contraste body .numero-paso,
      html.eva-alto-contraste body .cambiar-paso,
      html.eva-alto-contraste body .quitar-paso,
      html.eva-alto-contraste body .acciones-paso button{
        color:#ffff00!important;
        background:#07324a!important;
        border:1px solid #ffff00!important;
      }

      html.eva-alto-contraste body input,
      html.eva-alto-contraste body select,
      html.eva-alto-contraste body textarea{
        color:#ffffff!important;
        background:#000000!important;
        border-color:#ffffff!important;
      }
      html.eva-alto-contraste body input::placeholder,
      html.eva-alto-contraste body textarea::placeholder{
        color:#d1d5db!important;
      }
    `;
    document.head.appendChild(estilo);
  }

  function obtenerPreferencias(){
    try{ const guardado = localStorage.getItem(STORAGE_KEY); return guardado ? JSON.parse(guardado) : {}; }
    catch(error){ return {}; }
  }

  function guardarPreferencias(preferencias){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(preferencias)); }
    catch(error){ }
  }

  function limpiarPreferenciasObsoletas(preferencias){
    preferencias['eva-espaciado-amplio'] = false;
    preferencias['eva-reducir-movimiento'] = false;
    return preferencias;
  }

  function aplicarPreferencias(preferencias){
    insertarRefuerzoContraste();
    const preferenciasLimpias = limpiarPreferenciasObsoletas(preferencias || {});
    CLASES.forEach(clase => document.documentElement.classList.remove(clase));
    opciones.forEach(opcion => { if(preferenciasLimpias[opcion.clase]) document.documentElement.classList.add(opcion.clase); });
  }

  function actualizarBotones(panel, preferencias){
    panel.querySelectorAll('[data-eva-clase]').forEach(boton => {
      const clase = boton.getAttribute('data-eva-clase');
      boton.setAttribute('aria-pressed', preferencias[clase] ? 'true' : 'false');
    });
  }

  function alternarOpcion(opcion, panel){
    const preferencias = limpiarPreferenciasObsoletas(obtenerPreferencias());
    const nuevoEstado = !preferencias[opcion.clase];
    if(opcion.excluye) opcion.excluye.forEach(clase => { preferencias[clase] = false; });
    preferencias[opcion.clase] = nuevoEstado;
    guardarPreferencias(preferencias);
    aplicarPreferencias(preferencias);
    actualizarBotones(panel, preferencias);
  }

  function crearPanel(){
    if(document.querySelector('.eva-accesibilidad-panel')) return;
    const panel = document.createElement('div');
    panel.className = 'eva-accesibilidad-panel';
    panel.innerHTML = `
      <button class="eva-accesibilidad-boton" type="button" aria-expanded="false" aria-controls="eva-accesibilidad-menu" aria-label="Abrir opciones de accesibilidad">Accesibilidad</button>
      <div class="eva-accesibilidad-menu" id="eva-accesibilidad-menu" hidden>
        <p class="eva-accesibilidad-titulo">Opciones de accesibilidad</p>
        <p class="eva-accesibilidad-descripcion">Ajustes visuales temporales para facilitar la lectura y navegación.</p>
        <div class="eva-accesibilidad-opciones"></div>
      </div>
    `;
    const botonPrincipal = panel.querySelector('.eva-accesibilidad-boton');
    const menu = panel.querySelector('.eva-accesibilidad-menu');
    const contenedorOpciones = panel.querySelector('.eva-accesibilidad-opciones');

    opciones.forEach(opcion => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'eva-accesibilidad-opcion';
      boton.setAttribute('data-eva-clase', opcion.clase);
      boton.setAttribute('aria-pressed', 'false');
      boton.textContent = opcion.texto;
      boton.addEventListener('click', () => alternarOpcion(opcion, panel));
      contenedorOpciones.appendChild(boton);
    });

    const restablecer = document.createElement('button');
    restablecer.type = 'button';
    restablecer.className = 'eva-accesibilidad-opcion eva-accesibilidad-restablecer';
    restablecer.textContent = 'Restablecer ajustes';
    restablecer.addEventListener('click', () => { guardarPreferencias({}); aplicarPreferencias({}); actualizarBotones(panel, {}); });
    contenedorOpciones.appendChild(restablecer);

    botonPrincipal.addEventListener('click', () => {
      const abierto = menu.hasAttribute('hidden');
      menu.toggleAttribute('hidden', !abierto);
      botonPrincipal.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });

    document.addEventListener('keydown', evento => {
      if(evento.key === 'Escape' && !menu.hasAttribute('hidden')){
        menu.setAttribute('hidden','');
        botonPrincipal.setAttribute('aria-expanded','false');
        botonPrincipal.focus();
      }
    });

    document.addEventListener('click', evento => {
      if(!panel.contains(evento.target) && !menu.hasAttribute('hidden')){
        menu.setAttribute('hidden','');
        botonPrincipal.setAttribute('aria-expanded','false');
      }
    });

    document.body.appendChild(panel);
    actualizarBotones(panel, limpiarPreferenciasObsoletas(obtenerPreferencias()));
  }

  const preferenciasIniciales = limpiarPreferenciasObsoletas(obtenerPreferencias());
  guardarPreferencias(preferenciasIniciales);
  aplicarPreferencias(preferenciasIniciales);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', crearPanel);
  else crearPanel();
})();
