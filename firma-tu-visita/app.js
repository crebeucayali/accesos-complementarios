const formularioRegistro=document.querySelector("#formulario-registro");
const mensajeRegistro=document.querySelector("#mensaje-registro");
const mensajeModulo=document.querySelector("#mensajeModulo");
const campoModulosSeleccionados=document.querySelector("#modulosSeleccionados");
const checkboxesModulo=document.querySelectorAll('input[name="modulo_visitado"]');
const URL_APPS_SCRIPT="https://script.google.com/macros/s/AKfycbym3C4uxMNqm85n3d_9dvHfyh6xGtK-XLp6lY_a8VQhUhXyZV6BuSNtWrVEodXMNxfOfw/exec";

checkboxesModulo.forEach((checkbox)=>{
  checkbox.addEventListener("change",()=>{
    const seleccionados=document.querySelectorAll('input[name="modulo_visitado"]:checked');

    if(seleccionados.length>3){
      checkbox.checked=false;
      mensajeModulo.textContent="Solo puede seleccionar hasta 3 opciones.";
      return;
    }

    mensajeModulo.textContent="";
  });
});

formularioRegistro.addEventListener("submit",async(evento)=>{
  evento.preventDefault();

  const modulosSeleccionados=Array.from(document.querySelectorAll('input[name="modulo_visitado"]:checked'))
    .map((opcion)=>opcion.value);

  if(modulosSeleccionados.length===0){
    mensajeModulo.textContent="Seleccione al menos una opción.";
    return;
  }

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

  mensajeRegistro.textContent="Enviando registro...";

  try{
    await fetch(URL_APPS_SCRIPT,{method:"POST",mode:"no-cors",body:JSON.stringify(datos)});
    mensajeRegistro.textContent="Registro enviado correctamente.";
    formularioRegistro.reset();
    campoModulosSeleccionados.value="";
    mensajeModulo.textContent="";
  }catch(error){
    mensajeRegistro.textContent="No se pudo enviar el registro. Inténtalo nuevamente.";
  }
});