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


(() => {
  const contenedor=document.querySelector(".grid-directorio");
  if(!contenedor)return;
  const endpoint="https://dteimbhwtzghhsijeeld.supabase.co/rest/v1/eva_directorio_institucional?select=nombre,area,correo,foto,orden&visible=eq.true&order=orden.asc,id.asc";
  const clave="sb_publishable_tHbo1jTeW_dC90hdA5DvyQ_a6LrfKpq";
  const iniciales=nombre=>nombre.replace(/^(Lic\.|Psic\.|Mg\.|Prof\.)\s*/i,"").trim().split(/\s+/).slice(0,2).map(v=>v[0]||"").join("").toUpperCase();
  function tarjeta(persona,indice) {
    const articulo=document.createElement("article");articulo.className="tarjeta-personal";articulo.tabIndex=0;
    const numero=document.createElement("span");numero.className="numero-personal";numero.textContent=String(indice+1).padStart(2,"0");
    const nombre=document.createElement("h3");nombre.textContent=persona.nombre;
    const area=document.createElement("p");const areaLabel=document.createElement("strong");areaLabel.textContent="Área responsable:";area.append(areaLabel,document.createElement("br"),document.createTextNode(persona.area));
    const correo=document.createElement("p");const correoLabel=document.createElement("strong");correoLabel.textContent="Correo:";correo.append(correoLabel,document.createElement("br"));
    if(persona.correo){const a=document.createElement("a");a.href="mailto:"+persona.correo;a.textContent=persona.correo;correo.appendChild(a);}
    else correo.appendChild(document.createTextNode("No registrado"));
    const figura=document.createElement("figure");figura.className="foto-profesional";
    const siglas=document.createElement("span");siglas.className="foto-iniciales";siglas.setAttribute("aria-hidden","true");siglas.textContent=iniciales(persona.nombre);
    figura.appendChild(siglas);
    if(/^fotos\/[a-z0-9._-]+\.(?:webp|png|jpe?g)$/i.test(persona.foto)){
      const foto=document.createElement("img");foto.src=persona.foto;foto.alt="Fotografía de "+persona.nombre.replace(/^(Lic\.|Psic\.|Mg\.|Prof\.)\s*/i,"");foto.loading="lazy";
      foto.addEventListener("error",()=>{foto.hidden=true},{once:true});figura.appendChild(foto);
    }
    articulo.append(numero,nombre,area,correo,figura);return articulo;
  }
  async function cargar() {
    try{
      const respuesta=await fetch(endpoint,{headers:{apikey:clave,Accept:"application/json"},credentials:"omit",cache:"no-store"});
      if(!respuesta.ok)throw new Error("Directorio no disponible");
      const personas=await respuesta.json();if(!Array.isArray(personas))throw new Error("Respuesta incorrecta");
      contenedor.replaceChildren(...personas.map(tarjeta));
      document.querySelector(".nota-directorio").hidden=personas.length===0;
    }catch(error){
      // Mantener las fichas originales si falla la conexión con Supabase.
    }
  }
  cargar();
})();
