/* Utilidades privadas de presentación y CSV para Uso de recursos del panel EVA.
   No realiza consultas, no almacena información persistente ni registra eventos. */
(() => {
  "use strict";
  function fechaLegible(valor) {
    const texto=String(valor);
    const dia=/^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if(dia) return dia[3]+"/"+dia[2]+"/"+dia[1];
    const mes=/^(\d{4})-(\d{2})$/.exec(texto);
    return mes ? mes[2]+"/"+mes[1] : texto;
  }
  function celdaCSV(valor) {
    let texto=String(valor ?? "");
    // Defensa incluso ante valores no esperados: impedir ejecución de fórmulas al abrir CSV.
    if(/^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(texto)) texto="'"+texto;
    return '"'+texto.replace(/"/g,'""')+'"';
  }
  function crearCSV(encabezados,filas) {
    if(!Array.isArray(encabezados)||!Array.isArray(filas)||!encabezados.length)
      throw new Error("Datos CSV no válidos.");
    const serializar=campos=>campos.map(celdaCSV).join(";");
    return "\uFEFF"+[serializar(encabezados),...filas.map(fila=>{
      if(!Array.isArray(fila)||fila.length!==encabezados.length)throw new Error("Fila CSV no válida.");
      return serializar(fila);
    })].join("\r\n")+"\r\n";
  }
  function fechaArchivo() {
    const d=new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function descargarCSV(modulo,dias,encabezados,filas) {
    if(!["MEA","BDA"].includes(modulo)||![7,30,90,365].includes(dias)||!filas.length)
      throw new Error("La exportación no está disponible.");
    const blob=new Blob([crearCSV(encabezados,filas)],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="EVA-"+modulo+"-uso-recursos-ultimos-"+dias+"-dias-"+fechaArchivo()+".csv";
    a.hidden=true;
    document.body.append(a);
    try{a.click();}
    finally{
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }
  }
  window.EvaUsoRecursosUtil=Object.freeze({fechaLegible,crearCSV,descargarCSV});
})();
