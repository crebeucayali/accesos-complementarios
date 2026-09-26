"use strict";

const formularioRegistro=document.querySelector("#formulario-registro");
const mensajeRegistro=document.querySelector("#mensaje-registro");
const mensajeModulo=document.querySelector("#mensajeModulo");
const campoModulosSeleccionados=document.querySelector("#modulosSeleccionados");
const checkboxesModulo=document.querySelectorAll('input[name="modulo_visitado"]');
const grupoModulos=document.querySelector(".opciones-modulo");
const tituloModulos=document.querySelector(".modulo-visitado .titulo-campo");
const ayudaModulos=document.querySelector(".modulo-visitado .ayuda-campo");
const botonEnviar=formularioRegistro?.querySelector('button[type="submit"]');
const URL_APPS_SCRIPT="https://script.google.com/macros/s/AKfycbym3C4uxMNqm85n3d_9dvHfyh6xGtK-XLp6lY_a8VQhUhXyZV6BuSNtWrVEodXMNxfOfw/exec";
const CLAVE_ULTIMO_ENVIO="eva_firma_visita_ultimo_envio_v1";
const ESPERA_ENTRE_ENVIOS_MS=45000;
const TIEMPO_MINIMO_FORMULARIO_MS=1500;
const inicioFormulario=Date.now();

const MODULOS_PERMITIDOS=new Set([
  "Plataforma general",
  "Capacitaciones CREBE",
  "Banco Digital Accesible",
  "Materiales Educativos Accesibles",
  "Juegos Interactivos Accesibles",
  "Noti Inclusivos",
  "Otro recurso o acceso de AC"
]);

const ROLES_PERMITIDOS=new Set([
  "Docente",
  "Familia",
  "Directivo",
  "Estudiante",
  "Especialista",
  "Personal CREBE",
  "Otro"
]);

function limpiarTexto(valor,maximo,preservarSaltos=false){
  let texto=String(valor??"").replace(/\r/g,"");
  texto=texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g," ");
  if(preservarSaltos){
    texto=texto.replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
  }else{
    texto=texto.replace(/\s+/g," ").trim();
  }
  return texto.slice(0,maximo);
}

function protegerParaHoja(valor,maximo,preservarSaltos=false){
  const texto=limpiarTexto(valor,maximo,preservarSaltos);
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

function leerUltimoEnvio(){
  try{return Number(localStorage.getItem(CLAVE_ULTIMO_ENVIO)||0);}catch(error){return 0;}
}

function guardarUltimoEnvio(){
  try{localStorage.setItem(CLAVE_ULTIMO_ENVIO,String(Date.now()));}catch(error){/* Continúa sin persistencia. */}
}

function prepararSemanticaFormulario(){
  document.querySelector("#nombres")?.setAttribute("autocomplete","name");
  document.querySelector("#institucion")?.setAttribute("autocomplete","organization");
  document.querySelector("#correo")?.setAttribute("autocomplete","email");

  if(tituloModulos){
    tituloModulos.id=tituloModulos.id||"titulo-modulos-visitados";
  }
  if(ayudaModulos){
    ayudaModulos.id=ayudaModulos.id||"ayuda-modulos-visitados";
  }
  if(grupoModulos){
    grupoModulos.setAttribute("aria-labelledby",tituloModulos?.id||"titulo-modulos-visitados");
    grupoModulos.setAttribute("aria-describedby",`${ayudaModulos?.id||"ayuda-modulos-visitados"} mensajeModulo`);
    grupoModulos.setAttribute("aria-invalid","false");
  }

  mensajeModulo?.setAttribute("role","alert");
  mensajeRegistro?.setAttribute("role","status");
  mensajeRegistro?.setAttribute("aria-atomic","true");
}

function establecerErrorModulos(mensaje,dirigirFoco=false){
  if(mensajeModulo) mensajeModulo.textContent=mensaje;
  grupoModulos?.setAttribute("aria-invalid",mensaje?"true":"false");
  checkboxesModulo.forEach(checkbox=>{
    checkbox.setAttribute("aria-invalid",mensaje?"true":"false");
  });
  if(mensaje&&dirigirFoco) checkboxesModulo[0]?.focus();
}

function establecerEstadoEnvio(enviando){
  formularioRegistro?.setAttribute("aria-busy",String(enviando));
  if(botonEnviar){
    botonEnviar.disabled=enviando;
    botonEnviar.textContent=enviando?"Enviando registro...":"Enviar registro";
  }
}

function validarControlAntiSpam(){
  const trampa=formularioRegistro?.querySelector("#website");
  if(trampa?.value){
    return {ok:false,mensaje:"No se pudo procesar el registro."};
  }

  if(Date.now()-inicioFormulario<TIEMPO_MINIMO_FORMULARIO_MS){
    return {ok:false,mensaje:"Espera un momento y vuelve a enviar el registro."};
  }

  const ultimo=leerUltimoEnvio();
  const restante=ESPERA_ENTRE_ENVIOS_MS-(Date.now()-ultimo);
  if(ultimo&&restante>0){
    const segundos=Math.ceil(restante/1000);
    return {ok:false,mensaje:`Espera ${segundos} segundos antes de enviar otro registro.`};
  }

  return {ok:true,mensaje:""};
}

prepararSemanticaFormulario();

checkboxesModulo.forEach((checkbox)=>{
  checkbox.addEventListener("change",()=>{
    const seleccionados=document.querySelectorAll('input[name="modulo_visitado"]:checked');
    if(seleccionados.length>3){
      checkbox.checked=false;
      establecerErrorModulos("Solo puede seleccionar hasta 3 opciones.");
      return;
    }
    establecerErrorModulos("");
  });
});

formularioRegistro?.addEventListener("submit",async(evento)=>{
  evento.preventDefault();

  if(!formularioRegistro.checkValidity()){
    formularioRegistro.reportValidity();
    return;
  }

  const antiSpam=validarControlAntiSpam();
  if(!antiSpam.ok){
    if(mensajeRegistro) mensajeRegistro.textContent=antiSpam.mensaje;
    return;
  }

  const modulosSeleccionados=Array.from(
    document.querySelectorAll('input[name="modulo_visitado"]:checked')
  ).map(opcion=>opcion.value).filter(valor=>MODULOS_PERMITIDOS.has(valor));

  if(modulosSeleccionados.length===0){
    establecerErrorModulos("Seleccione al menos una opción.",true);
    return;
  }
  if(modulosSeleccionados.length>3){
    establecerErrorModulos("Solo puede seleccionar hasta 3 opciones.",true);
    return;
  }

  const rol=formularioRegistro.rol.value;
  if(!ROLES_PERMITIDOS.has(rol)){
    formularioRegistro.rol.setCustomValidity("Seleccione un cargo o rol válido.");
    formularioRegistro.rol.reportValidity();
    return;
  }
  formularioRegistro.rol.setCustomValidity("");

  establecerErrorModulos("");
  const modulosTexto=modulosSeleccionados.join(", ");
  campoModulosSeleccionados.value=modulosTexto;

  const datos={
    nombres:protegerParaHoja(formularioRegistro.nombres.value,100),
    institucion:protegerParaHoja(formularioRegistro.institucion.value,120),
    rol:protegerParaHoja(rol,40),
    modulo:protegerParaHoja(modulosTexto,240),
    motivo:"",
    correo:protegerParaHoja(formularioRegistro.correo.value,160),
    comentario:protegerParaHoja(formularioRegistro.comentario.value,1000,true),
    website:limpiarTexto(formularioRegistro.website?.value||"",120),
    formStartedAt:inicioFormulario
  };

  if(!datos.nombres){
    formularioRegistro.nombres.setCustomValidity("Escribe tus nombres y apellidos.");
    formularioRegistro.nombres.reportValidity();
    return;
  }
  formularioRegistro.nombres.setCustomValidity("");

  if(mensajeRegistro) mensajeRegistro.textContent="Enviando registro...";
  establecerEstadoEnvio(true);

  try{
    await fetch(URL_APPS_SCRIPT,{
      method:"POST",
      mode:"no-cors",
      credentials:"omit",
      cache:"no-store",
      referrerPolicy:"strict-origin-when-cross-origin",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(datos)
    });

    guardarUltimoEnvio();
    if(mensajeRegistro) mensajeRegistro.textContent="Registro enviado para procesamiento.";
    formularioRegistro.reset();
    campoModulosSeleccionados.value="";
    establecerErrorModulos("");
  }catch(error){
    if(mensajeRegistro) mensajeRegistro.textContent="No se pudo enviar el registro. Inténtalo nuevamente.";
  }finally{
    establecerEstadoEnvio(false);
  }
});