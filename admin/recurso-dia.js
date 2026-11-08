(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const auth = window.EvaAdminSession;
  const TABLE = "eva_recurso_dia_programacion";
  const FIELDS = "id,fecha,tipo,lsp_id,arasaac_ids,titulo,descripcion,texto_alternativo,imagen_lsp_url,fuente_url,atribucion,licencia,derechos_verificados,referencia_derechos,revision_pedagogica,estado,actualizado_en";
  const privateStates = new Set(["borrador", "retirado"]);
  let profile = null, rows = [], loading = false, generation = 0;

  function authorized() {
    return profile?.autorizado === true && profile.rol === "master"
      && profile.aal === "aal2" && !!auth?.getSession()?.access_token;
  }
  function requireMaster() {
    if (!authorized()) throw new Error("Esta gestión requiere una sesión Master con MFA AAL2.");
  }
  function message(value, isError = false) {
    const el = $("dia-mensaje");
    if (!el) return;
    el.textContent = value || "";
    el.className = "mensaje" + (isError ? " error" : value ? " exito" : "");
  }
  function todayPeru() {
    return new Intl.DateTimeFormat("sv-SE", {
      year:"numeric", month:"2-digit", day:"2-digit", timeZone:"America/Lima"
    }).format(new Date());
  }
  function parseMonth(month) {
    if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Selecciona un mes válido.");
    const [year, part] = month.split("-").map(Number);
    if (year < 2026 || year > 2100) throw new Error("El mes está fuera del intervalo permitido.");
    const start = month + "-01";
    const end = month + "-" + String(new Date(Date.UTC(year,part,0)).getUTCDate()).padStart(2,"0");
    return {start,end,days:Number(end.slice(-2))};
  }
  function dateValid(value) {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    try {
      const parts = value.split("-").map(Number);
      return new Date(Date.UTC(parts[0],parts[1]-1,parts[2])).toISOString().slice(0,10) === value;
    } catch { return false; }
  }
  async function request(path, options = {}) {
    requireMaster();
    const identity = auth.getSession()?.user?.id;
    const result = await auth.request(path, options);
    if (!authorized() || auth.getSession()?.user?.id !== identity)
      throw new Error("La sesión cambió durante la consulta. Reingresa al panel.");
    return result;
  }
  function selectedMonth() { return $("dia-mes").value; }
  function selectedDate() { return $("dia-fecha").value; }
  function text(id) { return String($(id).value || "").trim(); }
  function set(id, value) { $(id).value = value == null ? "" : String(value); }
  function refreshKind() {
    const isLsp = $("dia-tipo").value === "lsp";
    document.querySelectorAll("#panel-recurso-dia [data-dia-lsp]").forEach(el => { el.hidden = !isLsp; });
    document.querySelectorAll("#panel-recurso-dia [data-dia-arasaac]").forEach(el => { el.hidden = isLsp; });
  }
  function defaultForm(date) {
    $("dia-formulario").reset();
    set("dia-id","");
    set("dia-fecha",date);
    $("dia-estado").value = "borrador";
    $("dia-tipo").value = "lsp";
    refreshKind();
    window.EvaRecursoDiaFuentes?.limpiar();
    message("");
  }
  function edit(row) {
    if (!row) return;
    if (!privateStates.has(row.estado)) {
      message("El registro ya está programado o publicado. Su gestión corresponde a las etapas posteriores.",true);
      return;
    }
    set("dia-id",row.id);
    set("dia-fecha",row.fecha);
    set("dia-tipo",row.tipo);
    set("dia-estado",row.estado);
    set("dia-lsp-id",row.lsp_id);
    set("dia-arasaac-ids",(row.arasaac_ids||[]).join(", "));
    set("dia-titulo-recurso",row.titulo);
    set("dia-descripcion",row.descripcion);
    set("dia-alt",row.texto_alternativo);
    set("dia-fuente",row.fuente_url);
    set("dia-imagen-lsp",row.imagen_lsp_url);
    set("dia-licencia",row.licencia);
    set("dia-atribucion",row.atribucion);
    set("dia-referencia",row.referencia_derechos);
    $("dia-derechos").checked = row.derechos_verificados === true;
    $("dia-revision").checked = row.revision_pedagogica === true;
    refreshKind();
    window.EvaRecursoDiaFuentes?.actualizar();
    message("Editando borrador del " + row.fecha + ".");
    $("dia-formulario").scrollIntoView({behavior:"auto",block:"start"});
  }
  function element(tag,textValue) {
    const el = document.createElement(tag);
    if (textValue !== undefined) el.textContent = textValue;
    return el;
  }
  function drawCalendar() {
    const el = $("dia-calendario");
    el.replaceChildren();
    const month = parseMonth(selectedMonth());
    const map = new Map();
    rows.forEach(row => { if (!map.has(row.fecha)) map.set(row.fecha,[]);map.get(row.fecha).push(row); });
    const first = new Date(month.start + "T12:00:00Z");
    const offset = (first.getUTCDay() + 6) % 7;
    ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].forEach(day => {
      const h=element("span",day);h.className="dia-calendario-dia";el.appendChild(h);
    });
    for(let i=0;i<offset;i++){const placeholder=element("span");placeholder.setAttribute("aria-hidden","true");el.appendChild(placeholder);}
    for(let n=1;n<=month.days;n++){
      const date=month.start.slice(0,8)+String(n).padStart(2,"0");
      const items=map.get(date)||[];
      const btn=element("button");
      btn.type="button";btn.className="dia-calendario-fecha";
      if(selectedDate()===date) btn.classList.add("seleccionado");
      if(items.some(x=>x.estado==="programado"||x.estado==="publicado")) btn.classList.add("activo");
      const digit=element("strong",String(n));
      const badge=element("small",items.length?items.map(x=>x.estado).join(", "):"Sin programar");
      btn.setAttribute("aria-label",date+": "+badge.textContent);
      btn.append(digit,badge);
      btn.addEventListener("click",()=>{
        const editable=items.find(x=>privateStates.has(x.estado));
        if(editable) edit(editable); else defaultForm(date);
        drawCalendar();
      });
      el.appendChild(btn);
    }
    $("dia-resumen").textContent=rows.length+" registro(s) en "+selectedMonth()+". "+
      rows.filter(x=>x.estado==="borrador").length+" borrador(es), "+
      rows.filter(x=>x.estado==="programado"||x.estado==="publicado").length+" aprobado(s).";
  }
  function drawRows() {
    const body=$("dia-registros");body.replaceChildren();
    if(!rows.length){const tr=element("tr");const td=element("td","No existen registros para este mes.");td.colSpan=5;tr.append(td);body.append(tr);return;}
    rows.forEach(row=>{
      const tr=element("tr");
      [row.fecha,row.tipo==="lsp"?"Seña LSP":"ARASAAC",row.titulo||"Pendiente",row.estado].forEach(value=>tr.append(element("td",value)));
      const td=element("td");
      if(privateStates.has(row.estado)){
        const btn=element("button","Editar");
        btn.type="button";btn.className="secundario";
        btn.addEventListener("click",()=>{edit(row);drawCalendar();});
        td.append(btn);
      } else td.append(element("span","Solo lectura"));
      tr.append(td);body.append(tr);
    });
  }
  async function load() {
    requireMaster();
    if(loading) return;
    const {start,end}=parseMonth(selectedMonth());
    const current=++generation;
    loading=true;
    $("dia-recargar").disabled=true;
    try {
      const result=await request("eva_recurso_dia_programacion?select="+encodeURIComponent(FIELDS)
        +"&fecha=gte."+start+"&fecha=lte."+end+"&order=fecha.asc,id.asc");
      if(current!==generation) return;
      rows=Array.isArray(result)?result:[];
      if(!selectedDate()||selectedDate().slice(0,7)!==selectedMonth())
        defaultForm(start);
      drawCalendar();drawRows();
      message("");
    } catch(error) {message(error.message||"No se pudo cargar la programación.",true);throw error;}
    finally {loading=false;$("dia-recargar").disabled=false;}
  }
  function parseIds(value) {
    if(!value.trim())return [];
    const parts=value.split(",").map(x=>x.trim());
    if(parts.length>3||parts.some(x=>!/^[1-9][0-9]*$/.test(x)))
      throw new Error("Utiliza de uno a tres IDs numéricos positivos de ARASAAC, separados por comas.");
    const ids=parts.map(Number);
    if(ids.some(x=>!Number.isSafeInteger(x))||new Set(ids).size!==ids.length)
      throw new Error("Los identificadores ARASAAC deben ser números válidos y distintos.");
    return ids;
  }
  function safeHttps(id) {
    const value=text(id);
    if(!value)return "";
    let url;
    try {url=new URL(value);}catch{throw new Error("Comprueba que el enlace "+id+" sea una URL HTTPS.");}
    if(url.protocol!=="https:"||url.username||url.password)
      throw new Error("La URL "+id+" debe utilizar HTTPS.");
    return url.href;
  }
  function extract() {
    const fecha=text("dia-fecha"),tipo=text("dia-tipo"),estado=text("dia-estado");
    if(!dateValid(fecha)||fecha.slice(0,7)!==selectedMonth())
      throw new Error("Selecciona una fecha válida dentro del mes actual.");
    if(!["lsp","arasaac"].includes(tipo)) throw new Error("Tipo de recurso inválido.");
    if(!privateStates.has(estado)) throw new Error("La programación y publicación se habilitarán después de la validación de fuentes de la etapa 04.");
    const lsp_id=tipo==="lsp"?text("dia-lsp-id")||null:null;
    if(lsp_id&&!/^LSP-[0-9]{6}$/.test(lsp_id))
      throw new Error("El identificador LSP debe tener el formato LSP-000001.");
    const arasaac_ids=tipo==="arasaac"?parseIds(text("dia-arasaac-ids")):[];
    if(tipo==="arasaac"&&!arasaac_ids.length)
      throw new Error("Selecciona al menos un identificador ARASAAC para guardar la ficha.");
    if(tipo==="lsp"&&!lsp_id)throw new Error("Introduce un identificador LSP para guardar la ficha.");
    const id=text("dia-id");
    const collision=rows.some(row=>row.fecha===fecha&&String(row.id)!==id
      && (row.estado==="programado"||row.estado==="publicado"));
    if(collision) throw new Error("Ya existe una programación activa para esta fecha.");
    return {
      fecha,tipo,estado,lsp_id,arasaac_ids,
      titulo:text("dia-titulo-recurso"),descripcion:text("dia-descripcion"),
      texto_alternativo:text("dia-alt"),fuente_url:safeHttps("dia-fuente"),
      imagen_lsp_url:tipo==="lsp"?safeHttps("dia-imagen-lsp")||null:null,
      licencia:text("dia-licencia"),atribucion:text("dia-atribucion"),
      referencia_derechos:text("dia-referencia"),
      derechos_verificados:$("dia-derechos").checked,
      revision_pedagogica:$("dia-revision").checked
    };
  }
  async function save(event) {
    event.preventDefault();
    if(loading)return;
    try {
      requireMaster();
      const data=extract(),id=text("dia-id");
      const current=rows.find(row=>String(row.id)===id);
      if(id&&(!current||!privateStates.has(current.estado)))
        throw new Error("El registro ya no es un borrador editable. Actualiza el mes.");
      loading=true;$("dia-guardar").disabled=true;
      await request(TABLE+(id?"?id=eq."+encodeURIComponent(id):""),{
        method:id?"PATCH":"POST",
        headers:{"Content-Type":"application/json",Prefer:"return=minimal"},
        body:JSON.stringify(data)
      });
      await loadAfterSave(data.fecha);
      message("Borrador guardado correctamente. No se ha publicado en EVA.");
    } catch(err) {message(err.message||"No se pudo guardar el borrador.",true);}
    finally {loading=false;$("dia-guardar").disabled=false;}
  }
  async function loadAfterSave(date) {
    const {start,end}=parseMonth(selectedMonth());
    const result=await request(TABLE+"?select="+encodeURIComponent(FIELDS)
      +"&fecha=gte."+start+"&fecha=lte."+end+"&order=fecha.asc,id.asc");
    rows=Array.isArray(result)?result:[];
    const latest=rows.filter(x=>x.fecha===date&&privateStates.has(x.estado)).at(-1);
    if(latest)edit(latest);else defaultForm(date);
    drawCalendar();drawRows();
  }
  function configure(next) {
    profile=next||null;
    if(!authorized())clear();
    const panel=$("panel-recurso-dia");
    panel?.querySelectorAll("button,input,select,textarea").forEach(control=>{
      control.disabled=!authorized()||(control.dataset.blockedStage==="true");
    });
    window.EvaRecursoDiaFuentes?.configurar({authorized});
    // Los estados aprobados siguen deshabilitados hasta la etapa 05.
    panel?.querySelectorAll("#dia-estado option[value=programado],#dia-estado option[value=publicado]")
      .forEach(option=>option.disabled=true);
  }
  function clear() {
    ++generation;rows=[];profile=null;
    $("dia-calendario")?.replaceChildren();
    $("dia-registros")?.replaceChildren();
    $("dia-formulario")?.reset();
    set("dia-id","");
    window.EvaRecursoDiaFuentes?.limpiar();
    message("");
  }
  async function init() {
    if(!authorized())return;
    if(!$("dia-mes").value)$("dia-mes").value=todayPeru().slice(0,7);
    if(!$("dia-fecha").value)defaultForm($("dia-mes").value+"-01");
    await load();
  }
  $("dia-mes")?.addEventListener("change",()=>{if(!authorized())return;defaultForm($("dia-mes").value+"-01");load().catch(()=>{});});
  $("dia-recargar")?.addEventListener("click",()=>load().catch(()=>{}));
  $("dia-tipo")?.addEventListener("change",()=>{
    refreshKind();
    window.EvaRecursoDiaFuentes?.cambiarTipo();
  });
  $("dia-fecha")?.addEventListener("change",drawCalendar);
  $("dia-nuevo")?.addEventListener("click",()=>{defaultForm(selectedDate()||selectedMonth()+"-01");drawCalendar();});
  $("dia-formulario")?.addEventListener("submit",save);
  window.EvaRecursoDiaAdmin=Object.freeze({configurar:configure,limpiar:clear,cargar:init});
})();