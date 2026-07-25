/* Accesibilidad común EVA, versión 2. */
(function(){
  'use strict';

  const STORAGE_KEY='eva_accesibilidad_preferencias';
  const FAVICON_BASE='https://crebe-ucayali.github.io/accesos-complementarios/assets/favicon/';
  const clases=['eva-alto-contraste','eva-texto-grande','eva-texto-muy-grande','eva-fuente-legible','eva-espaciado-amplio','eva-enlaces-resaltados','eva-escala-grises','eva-reducir-movimiento'];
  const opciones=[
    {texto:'Alto contraste',clase:'eva-alto-contraste'},
    {texto:'Texto grande',clase:'eva-texto-grande',excluye:['eva-texto-muy-grande']},
    {texto:'Texto muy grande',clase:'eva-texto-muy-grande',excluye:['eva-texto-grande']},
    {texto:'Fuente legible',clase:'eva-fuente-legible'},
    {texto:'Espaciado amplio',clase:'eva-espaciado-amplio'},
    {texto:'Resaltar enlaces',clase:'eva-enlaces-resaltados'},
    {texto:'Escala de grises',clase:'eva-escala-grises'},
    {texto:'Reducir movimiento',clase:'eva-reducir-movimiento'}
  ];

  let lecturaActiva=false;
  let fragmentos=[];
  let indice=0;

  function obtenerPreferencias(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');}
    catch(error){return {};}
  }

  function guardarPreferencias(preferencias){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(preferencias));}
    catch(error){/* Funciona sin persistencia. */}
  }

  function aplicarPreferencias(preferencias){
    clases.forEach(clase=>document.documentElement.classList.remove(clase));
    opciones.forEach(opcion=>{
      if(preferencias[opcion.clase]) document.documentElement.classList.add(opcion.clase);
    });
  }

  function implementarFavicon(){
    const recursos=[
      {rel:'icon',href:FAVICON_BASE+'favicon-crebe.ico',sizes:'any'},
      {rel:'icon',href:FAVICON_BASE+'favicon-32x32.png',type:'image/png',sizes:'32x32'},
      {rel:'icon',href:FAVICON_BASE+'favicon-16x16.png',type:'image/png',sizes:'16x16'},
      {rel:'apple-touch-icon',href:FAVICON_BASE+'apple-touch-icon.png',sizes:'180x180'}
    ];
    recursos.forEach(recurso=>{
      if(document.head.querySelector(`link[rel="${recurso.rel}"][href="${recurso.href}"]`)) return;
      const enlace=document.createElement('link');
      enlace.setAttribute('rel',recurso.rel);
      enlace.setAttribute('href',recurso.href);
      if(recurso.type) enlace.setAttribute('type',recurso.type);
      if(recurso.sizes) enlace.setAttribute('sizes',recurso.sizes);
      document.head.appendChild(enlace);
    });
    if(!document.head.querySelector('meta[name="theme-color"]')){
      const meta=document.createElement('meta');
      meta.name='theme-color';
      meta.content='#0b3550';
      document.head.appendChild(meta);
    }
  }

  function corregirRutas(){
    const inicio='https://crebe-ucayali.github.io/';
    const contacto='https://crebe-ucayali.github.io/accesos-complementarios/paginas/contacto.html';
    const inicioAC='https://crebe-ucayali.github.io/accesos-complementarios/';
    document.querySelectorAll('a[href]').forEach(enlace=>{
      const href=(enlace.getAttribute('href')||'').trim();
      if(!href) return;
      if(href.includes('crebe-ucayali.netlify.app')) enlace.href=inicio;
      else if(href==='contacto.html'||href.endsWith('/recursos/contacto.html')||href.endsWith('/directorios/contacto.html')||href.endsWith('/firma-tu-visita/contacto.html')) enlace.href=contacto;
      else if(href==='index.html'&&/\/(recursos|directorios|firma-tu-visita)\//.test(location.pathname)) enlace.href=inicioAC;
    });
  }

  function reforzarEstructura(){
    if(!document.documentElement.lang) document.documentElement.lang='es';
    const principal=document.querySelector('main');
    if(principal&&!principal.id) principal.id='contenido-principal';
    if(principal&&!document.querySelector('.eva-salto-contenido')){
      const salto=document.createElement('a');
      salto.className='eva-salto-contenido';
      salto.href=`#${principal.id}`;
      salto.textContent='Saltar al contenido principal';
      document.body.prepend(salto);
    }
    document.querySelectorAll('a[target="_blank"]').forEach(enlace=>{
      const rel=new Set((enlace.getAttribute('rel')||'').split(/\s+/).filter(Boolean));
      rel.add('noopener');rel.add('noreferrer');
      enlace.setAttribute('rel',[...rel].join(' '));
    });
    document.querySelectorAll('iframe:not([title])').forEach((marco,i)=>{
      marco.title=marco.getAttribute('aria-label')||`Contenido integrado ${i+1}`;
    });
    const actual=new URL(location.href);
    document.querySelectorAll('nav a[href]').forEach(enlace=>{
      try{
        const destino=new URL(enlace.href,actual);
        if(destino.origin===actual.origin&&destino.pathname.replace(/index\.html$/,'')===actual.pathname.replace(/index\.html$/,'')) enlace.setAttribute('aria-current','page');
      }catch(error){/* Dirección no válida. */}
    });
  }

  function anunciador(){
    let nodo=document.querySelector('#eva-anunciador-accesibilidad');
    if(!nodo){
      nodo=document.createElement('div');
      nodo.id='eva-anunciador-accesibilidad';
      nodo.className='eva-solo-lectores';
      nodo.setAttribute('aria-live','polite');
      nodo.setAttribute('aria-atomic','true');
      document.body.appendChild(nodo);
    }
    return nodo;
  }

  function anunciar(mensaje){
    const nodo=anunciador();
    nodo.textContent='';
    setTimeout(()=>{nodo.textContent=mensaje;},30);
  }

  function actualizarBotones(panel,preferencias){
    panel.querySelectorAll('[data-eva-clase]').forEach(boton=>{
      boton.setAttribute('aria-pressed',preferencias[boton.dataset.evaClase]?'true':'false');
    });
  }

  function alternar(opcion,panel){
    const preferencias=obtenerPreferencias();
    const activo=!preferencias[opcion.clase];
    (opcion.excluye||[]).forEach(clase=>{preferencias[clase]=false;});
    preferencias[opcion.clase]=activo;
    guardarPreferencias(preferencias);
    aplicarPreferencias(preferencias);
    actualizarBotones(panel,preferencias);
    anunciar(`${opcion.texto}: ${activo?'activado':'desactivado'}.`);
  }

  function textoLectura(){
    const copia=(document.querySelector('main')||document.body).cloneNode(true);
    copia.querySelectorAll('script,style,noscript,[hidden],[aria-hidden="true"],.eva-accesibilidad-panel,.eva-solo-lectores').forEach(n=>n.remove());
    return (copia.innerText||copia.textContent||'').replace(/\s+/g,' ').trim();
  }

  function dividir(texto,limite){
    const oraciones=texto.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[texto];
    const partes=[];let actual='';
    oraciones.forEach(oracion=>{
      const limpia=oracion.trim();
      if(!limpia) return;
      if((actual+' '+limpia).trim().length<=limite) actual=(actual+' '+limpia).trim();
      else{
        if(actual) partes.push(actual);
        if(limpia.length<=limite) actual=limpia;
        else{for(let i=0;i<limpia.length;i+=limite) partes.push(limpia.slice(i,i+limite));actual='';}
      }
    });
    if(actual) partes.push(actual);
    return partes;
  }

  function detenerLectura(panel,avisar=true){
    if('speechSynthesis' in window) speechSynthesis.cancel();
    lecturaActiva=false;fragmentos=[];indice=0;
    const boton=panel?.querySelector('[data-eva-accion="lectura"]');
    if(boton){boton.textContent='Leer página';boton.setAttribute('aria-pressed','false');}
    if(avisar) anunciar('Lectura detenida.');
  }

  function reproducir(panel){
    if(!lecturaActiva||indice>=fragmentos.length){detenerLectura(panel,false);anunciar('Lectura finalizada.');return;}
    const voz=new SpeechSynthesisUtterance(fragmentos[indice]);
    voz.lang='es-PE';voz.rate=.95;
    voz.onend=()=>{indice+=1;reproducir(panel);};
    voz.onerror=()=>detenerLectura(panel,false);
    speechSynthesis.speak(voz);
  }

  function alternarLectura(panel){
    if(!('speechSynthesis' in window)){anunciar('La lectura en voz alta no está disponible en este navegador.');return;}
    if(lecturaActiva){detenerLectura(panel);return;}
    const texto=textoLectura();
    if(!texto){anunciar('No se encontró contenido para leer.');return;}
    fragmentos=dividir(texto,220);indice=0;lecturaActiva=true;
    const boton=panel.querySelector('[data-eva-accion="lectura"]');
    boton.textContent='Detener lectura';boton.setAttribute('aria-pressed','true');
    anunciar('Lectura en voz alta iniciada.');
    reproducir(panel);
  }

  function crearPanel(){
    if(document.querySelector('.eva-accesibilidad-panel')) return;
    const panel=document.createElement('div');
    panel.className='eva-accesibilidad-panel';
    panel.innerHTML=`<button class="eva-accesibilidad-boton" type="button" aria-expanded="false" aria-controls="eva-accesibilidad-menu" aria-label="Abrir opciones de accesibilidad">Accesibilidad</button><section class="eva-accesibilidad-menu" id="eva-accesibilidad-menu" hidden aria-labelledby="eva-accesibilidad-titulo"><h2 class="eva-accesibilidad-titulo" id="eva-accesibilidad-titulo">Opciones de accesibilidad</h2><p class="eva-accesibilidad-descripcion">Personalice la lectura y visualización. Las preferencias se guardan en este dispositivo.</p><div class="eva-accesibilidad-opciones"></div></section>`;
    const abrir=panel.querySelector('.eva-accesibilidad-boton');
    const menu=panel.querySelector('.eva-accesibilidad-menu');
    const contenedor=panel.querySelector('.eva-accesibilidad-opciones');
    opciones.forEach(opcion=>{
      const boton=document.createElement('button');
      boton.type='button';boton.className='eva-accesibilidad-opcion';
      boton.dataset.evaClase=opcion.clase;boton.setAttribute('aria-pressed','false');boton.textContent=opcion.texto;
      boton.addEventListener('click',()=>alternar(opcion,panel));
      contenedor.appendChild(boton);
    });
    const lectura=document.createElement('button');
    lectura.type='button';lectura.className='eva-accesibilidad-opcion';lectura.dataset.evaAccion='lectura';lectura.setAttribute('aria-pressed','false');lectura.textContent='Leer página';
    lectura.addEventListener('click',()=>alternarLectura(panel));
    if(!('speechSynthesis' in window)) lectura.disabled=true;
    contenedor.appendChild(lectura);
    const reset=document.createElement('button');
    reset.type='button';reset.className='eva-accesibilidad-opcion eva-accesibilidad-restablecer';reset.textContent='Restablecer ajustes';
    reset.addEventListener('click',()=>{guardarPreferencias({});aplicarPreferencias({});actualizarBotones(panel,{});detenerLectura(panel,false);anunciar('Se restablecieron las opciones de accesibilidad.');});
    contenedor.appendChild(reset);
    abrir.addEventListener('click',()=>{const estado=menu.hidden;menu.hidden=!estado;abrir.setAttribute('aria-expanded',String(estado));if(estado) menu.querySelector('button')?.focus();});
    document.addEventListener('click',evento=>{if(!panel.contains(evento.target)&&!menu.hidden){menu.hidden=true;abrir.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',evento=>{
      if(evento.altKey&&evento.shiftKey&&evento.key.toLowerCase()==='a'){evento.preventDefault();abrir.click();}
      if(evento.key==='Escape'){if(lecturaActiva) detenerLectura(panel);if(!menu.hidden){menu.hidden=true;abrir.setAttribute('aria-expanded','false');abrir.focus();}}
    });
    addEventListener('beforeunload',()=>{'speechSynthesis' in window&&speechSynthesis.cancel();});
    document.body.appendChild(panel);
    actualizarBotones(panel,obtenerPreferencias());
  }

  function iniciar(){
    if(document.documentElement.dataset.evaAccesibilidadInicializada==='true') return;
    document.documentElement.dataset.evaAccesibilidadInicializada='true';
    implementarFavicon();corregirRutas();reforzarEstructura();anunciador();aplicarPreferencias(obtenerPreferencias());crearPanel();
  }

  aplicarPreferencias(obtenerPreferencias());
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciar);
  else iniciar();
})();