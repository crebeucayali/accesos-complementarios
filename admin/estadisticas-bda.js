(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let autorizado = false, consulta = null, version = 0;
  const PERIODOS = new Set([7, 30, 90, 365]);
  function estado(mensaje, error = false) {
    const el = $("bda-est-estado");
    if (el) { el.textContent = mensaje; el.dataset.error = String(error); }
  }
  function limpiar() {
    ++version;
    for(const id of ["bda-est-total","bda-est-impresiones"]) if ($(id)) $(id).textContent = "—";
    $("bda-est-detalle")?.replaceChildren();
    if ($("bda-est-sin-datos")) $("bda-est-sin-datos").hidden = true;
    if ($("bda-est-actualizar")) $("bda-est-actualizar").disabled = false;
    estado("Sin consultar.");
  }
  function configurar(perfil, opciones={}) {
    limpiar();
    autorizado = perfil?.autorizado === true && perfil?.rol === "master" && perfil?.aal === "aal2";
    consulta = autorizado && typeof opciones.consultar === "function" ? opciones.consultar : null;
  }
  async function cargar() {
    if (!autorizado || !consulta) return;
    const periodo = Number($("bda-est-periodo")?.value || 30);
    if (!PERIODOS.has(periodo)) { estado("Periodo no permitido.", true); return; }
    const ticket=++version;
    $("bda-est-actualizar").disabled=true;
    estado("Consultando descargas de BDA...");
    try {
      const filas=await consulta(periodo);
      if (ticket !== version || !autorizado) return;
      if (!Array.isArray(filas)) throw new Error("Respuesta inesperada.");
      let total=0, impresiones=0;
      const grupos=new Map();
      for(const fila of filas) {
        const n=Number(fila?.total);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fila?.fecha||"")) ||
            !((fila?.herramienta==="lsp" && fila?.formato==="png" && fila?.accion==="descarga_solicitada") ||
              (fila?.herramienta==="braille" && fila?.formato==="impresion" && fila?.accion==="impresion_iniciada")) ||
            !Number.isSafeInteger(n) || n<0) {
          throw new Error("Registro inesperado.");
        }
        if (fila.herramienta==="lsp") total+=n;
        else impresiones+=n;
        const clave=fila.fecha+"|"+fila.herramienta;
        grupos.set(clave,(grupos.get(clave)||0)+n);
      }
      $("bda-est-total").textContent=total.toLocaleString("es-PE");
      $("bda-est-impresiones").textContent=impresiones.toLocaleString("es-PE");
      $("bda-est-detalle").replaceChildren();
      for(const [clave,n] of [...grupos].sort((a,b)=>b[0].localeCompare(a[0]))) {
        const [fecha,herramienta]=clave.split("|");
        const tr=document.createElement("tr");
        const tdFecha=document.createElement("th");tdFecha.scope="row";tdFecha.textContent=fecha;
        const tdFormato=document.createElement("td");tdFormato.textContent=herramienta==="lsp"?"LSP · PNG (descarga solicitada)":"Braille · impresión iniciada";
        const tdCantidad=document.createElement("td");tdCantidad.textContent=n.toLocaleString("es-PE");tdCantidad.className="estadistica-numero";
        tr.append(tdFecha,tdFormato,tdCantidad);
        $("bda-est-detalle").append(tr);
      }
      $("bda-est-sin-datos").hidden=grupos.size>0;
      estado(grupos.size ? "Solicitudes LSP e impresiones Braille iniciadas en los últimos "+periodo+" días." :
        "Sin solicitudes de descarga ni impresión iniciada en BDA en este periodo.");
    } catch(error) {
      if(ticket!==version || !autorizado) return;
      $("bda-est-total").textContent="—";
      $("bda-est-impresiones").textContent="—";
      $("bda-est-detalle").replaceChildren();
      $("bda-est-sin-datos").hidden=true;
      estado("No se pudieron consultar las estadísticas de BDA. Reintenta o verifica tu sesión.",true);
      console.warn("Error de consulta BDA",error);
    } finally {
      if(ticket===version)$("bda-est-actualizar").disabled=false;
    }
  }
  $("bda-est-periodo")?.addEventListener("change",()=>{void cargar();});
  $("bda-est-actualizar")?.addEventListener("click",()=>{void cargar();});
  window.EvaBDAEstadisticasAdmin=Object.freeze({configurar,cargar,limpiar});
})();