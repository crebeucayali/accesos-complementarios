(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let autorizado = false, consulta = null, version = 0;
  let filasCSV = [], periodoCSV = null;
  const fechaLegible = valor => window.EvaUsoRecursosUtil.fechaLegible(valor);
  const formatoNumero = valor => Number(valor).toLocaleString("es-PE");
  const PERIODOS = new Set([7, 30, 90, 365]);
  function estado(mensaje, error = false) {
    const el = $("bda-est-estado");
    if (el) { el.textContent = mensaje; el.dataset.error = String(error); }
  }
  function limpiar() {
    ++version;
    if ($("bda-est-total")) $("bda-est-total").textContent = "—";
    filasCSV = []; periodoCSV = null;
    $("bda-est-detalle")?.replaceChildren();
    $("bda-est-grafico")?.replaceChildren();
    if ($("bda-est-grafico-sin-datos")) $("bda-est-grafico-sin-datos").hidden = true;
    if ($("bda-est-grafico-escala")) {
      $("bda-est-grafico-escala").hidden = true;
      $("bda-est-grafico-escala").textContent = "";
    }
    if ($("bda-est-grafico-titulo")) $("bda-est-grafico-titulo").textContent = "Evolución diaria de BDA";
    if ($("bda-est-exportar-csv")) $("bda-est-exportar-csv").disabled = true;
    if ($("bda-est-sin-datos")) $("bda-est-sin-datos").hidden = true;
    if ($("bda-est-actualizar")) $("bda-est-actualizar").disabled = false;
    estado("Sin consultar.");
  }
  function configurar(perfil, opciones={}) {
    limpiar();
    autorizado = perfil?.autorizado === true && perfil?.rol === "master" && perfil?.aal === "aal2";
    consulta = autorizado && typeof opciones.consultar === "function" ? opciones.consultar : null;
  }
  function renderGrafico(grupos, dias) {
    const contenedor = $("bda-est-grafico");
    contenedor.replaceChildren();
    const mensual = dias >= 90;
    const acumulado = new Map();
    for (const [fecha,n] of grupos) {
      const clave = mensual ? fecha.slice(0,7) : fecha;
      acumulado.set(clave,(acumulado.get(clave) || 0)+n);
    }
    const puntos = [...acumulado].sort((a,b)=>a[0].localeCompare(b[0]));
    $("bda-est-grafico-titulo").textContent = mensual ? "Evolución mensual de BDA" : "Evolución diaria de BDA";
    $("bda-est-grafico-sin-datos").hidden = puntos.length > 0;
    const maximo = Math.max(0,...puntos.map(([,n])=>n));
    const escala = Math.max(5, Math.ceil(maximo / 5) * 5);
    const leyenda = $("bda-est-grafico-escala");
    leyenda.hidden = puntos.length === 0;
    leyenda.textContent = puntos.length ? "Escala: 0 a "+formatoNumero(escala)+
      " solicitudes. Las barras representan cantidades, no porcentajes." : "";
    for (const [fecha,n] of puntos) {
      const fila = document.createElement("div");
      fila.className = "rec-grafico-fila";
      fila.setAttribute("role","listitem");
      fila.setAttribute("aria-label",fechaLegible(fecha)+": "+formatoNumero(n)+" solicitudes");
      const etiqueta = document.createElement("span");
      etiqueta.className = "rec-grafico-fecha";
      etiqueta.textContent = fechaLegible(fecha);
      const pista = document.createElement("div");
      pista.className = "rec-grafico-pista";
      const barra = document.createElement("span");
      barra.className = "rec-grafico-valor";
      barra.style.width = (n / escala) * 100 + "%";
      pista.append(barra);
      const cantidad = document.createElement("strong");
      cantidad.textContent = formatoNumero(n);
      fila.append(etiqueta,pista,cantidad);
      contenedor.append(fila);
    }
  }

  async function cargar() {
    if (!autorizado || !consulta) return;
    const periodo = Number($("bda-est-periodo")?.value || 30);
    if (!PERIODOS.has(periodo)) { limpiar(); estado("Periodo no permitido.", true); return; }
    const ticket=++version;
    filasCSV = []; periodoCSV = null;
    $("bda-est-exportar-csv").disabled=true;
    $("bda-est-actualizar").disabled=true;
    estado("Consultando descargas de BDA...");
    try {
      const filas=await consulta(periodo);
      if (ticket !== version || !autorizado) return;
      if (!Array.isArray(filas)) throw new Error("Respuesta inesperada.");
      let total=0;
      const grupos=new Map();
      for(const fila of filas) {
        const n=Number(fila?.total);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fila?.fecha||"")) ||
            fila?.herramienta!=="lsp" || fila?.formato!=="png" ||
            fila?.accion!=="descarga_solicitada" || !Number.isSafeInteger(n) || n<0) {
          throw new Error("Registro inesperado.");
        }
        total+=n;
        grupos.set(fila.fecha,(grupos.get(fila.fecha)||0)+n);
      }
      $("bda-est-total").textContent=total.toLocaleString("es-PE");
      $("bda-est-detalle").replaceChildren();
      for(const [fecha,n] of [...grupos].sort((a,b)=>b[0].localeCompare(a[0]))) {
        const tr=document.createElement("tr");
        const tdFecha=document.createElement("th");tdFecha.scope="row";tdFecha.textContent=fechaLegible(fecha);
        const tdFormato=document.createElement("td");tdFormato.textContent="LSP · PNG";
        const tdCantidad=document.createElement("td");tdCantidad.textContent=n.toLocaleString("es-PE");tdCantidad.className="estadistica-numero";
        tr.append(tdFecha,tdFormato,tdCantidad);
        $("bda-est-detalle").append(tr);
      }
      $("bda-est-sin-datos").hidden=grupos.size>0;
      renderGrafico(grupos, periodo);
      filasCSV = [...grupos].sort((a,b)=>b[0].localeCompare(a[0]));
      periodoCSV = periodo;
      $("bda-est-exportar-csv").disabled = filasCSV.length===0;
      estado(grupos.size ? "Solicitudes de descarga LSP registradas en los últimos "+periodo+" días." :
        "Sin descargas solicitadas de BDA en este periodo.");
    } catch(error) {
      if(ticket!==version || !autorizado) return;
      $("bda-est-total").textContent="—";
      filasCSV=[]; periodoCSV=null;
      $("bda-est-exportar-csv").disabled=true;
      $("bda-est-detalle").replaceChildren();
      $("bda-est-grafico").replaceChildren();
      $("bda-est-grafico-escala").hidden=true;
      $("bda-est-grafico-escala").textContent="";
      $("bda-est-grafico-sin-datos").hidden=true;
      $("bda-est-sin-datos").hidden=true;
      estado("No se pudieron consultar las estadísticas de BDA. Reintenta o verifica tu sesión.",true);
      console.warn("Error de consulta BDA",error);
    } finally {
      if(ticket===version)$("bda-est-actualizar").disabled=false;
    }
  }
  function exportarCSV() {
    if (!autorizado || !consulta || !filasCSV.length || !periodoCSV ||
        Number($("bda-est-periodo").value) !== periodoCSV) return;
    try {
      const filas=filasCSV.map(([fecha,n])=>[fechaLegible(fecha),"LSP · PNG",n]);
      window.EvaUsoRecursosUtil.descargarCSV("BDA",periodoCSV,
        ["Fecha","Tipo de recurso","Solicitudes"],filas);
      estado("Se inició la descarga del CSV de BDA correspondiente a los últimos "+periodoCSV+" días.");
    } catch(error) {
      console.warn("No se pudo preparar el CSV de BDA:",error);
      estado("No se pudo preparar el CSV. Vuelve a consultar los datos.",true);
    }
  }
  $("bda-est-exportar-csv")?.addEventListener("click",exportarCSV);
  $("bda-est-periodo")?.addEventListener("change",()=>{void cargar();});
  $("bda-est-actualizar")?.addEventListener("click",()=>{void cargar();});
  window.EvaBDAEstadisticasAdmin=Object.freeze({configurar,cargar,limpiar});
})();