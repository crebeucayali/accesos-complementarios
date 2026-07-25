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

  const modulosSeleccionados=Array.from(document.querySelectorAll('input[name="modulo_visitado"]:checked')).map((opcion)=>opcion.value);
  if(modulosSeleccionados.length===0){
    establecerErrorModulos("Seleccione al menos una opción.",true);
    return;
  }

  establecerErrorModulos("");
  const modulosTexto=modulosSeleccionados.join(", ");
  campoModulosSeleccionados.value=modulosTexto;
  const datos={
    nombres:formularioRegistro.nombres.value.trim(),
    institucion:formularioRegistro.institucion.value.trim(),
    rol:formularioRegistro.rol.value,
    modulo:modulosTexto,
    motivo:"",
    correo:formularioRegistro.correo.value.trim(),
    comentario:formularioRegistro.comentario.value.trim()
  };

  if(mensajeRegistro) mensajeRegistro.textContent="Enviando registro...";
  establecerEstadoEnvio(true);

  try{
    await fetch(URL_APPS_SCRIPT,{method:"POST",mode:"no-cors",body:JSON.stringify(datos)});
    if(mensajeRegistro) mensajeRegistro.textContent="Registro enviado correctamente.";
    formularioRegistro.reset();
    campoModulosSeleccionados.value="";
    establecerErrorModulos("");
  }catch(error){
    if(mensajeRegistro) mensajeRegistro.textContent="No se pudo enviar el registro. Inténtalo nuevamente.";
  }finally{
    establecerEstadoEnvio(false);
  }
});