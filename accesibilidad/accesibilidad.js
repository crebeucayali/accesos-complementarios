/* Cargador estable de la herramienta común de accesibilidad EVA. */
(function(){
  'use strict';

  const VERSION='10';
  const BASE='https://crebe-ucayali.github.io/accesos-complementarios/accesibilidad/';

  function corregirTabulacionesNoInteractivas(){
    document.querySelectorAll('.item-recurso[tabindex="0"]').forEach(elemento=>{
      elemento.removeAttribute('tabindex');
    });
  }

  function cargarCssCanonico(){
    const href=BASE+'accesibilidad.css?v='+VERSION;
    if(document.querySelector(`link[data-eva-accesibilidad-css="${VERSION}"]`)) return;

    const enlace=document.createElement('link');
    enlace.rel='stylesheet';
    enlace.href=href;
    enlace.dataset.evaAccesibilidadCss=VERSION;
    enlace.addEventListener('load',()=>{
      document.querySelectorAll(`link[href*="/accesibilidad/accesibilidad.css"]:not([data-eva-accesibilidad-css="${VERSION}"])`).forEach(anterior=>{
        anterior.disabled=true;
      });
    });
    document.head.appendChild(enlace);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',corregirTabulacionesNoInteractivas);
  }else{
    corregirTabulacionesNoInteractivas();
  }

  cargarCssCanonico();

  if(document.querySelector(`script[data-eva-accesibilidad-v2="${VERSION}"]`)) return;
  const script=document.createElement('script');
  script.src=BASE+'accesibilidad-v2.js?v='+VERSION;
  script.async=false;
  script.dataset.evaAccesibilidadV2=VERSION;
  document.head.appendChild(script);
})();