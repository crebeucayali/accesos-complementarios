(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const auth = window.EvaAdminSession;
  let perfil = null, recursos = [], semanas = [], ocupado = false, iniciado = false, version = 0;
  const master = () => perfil?.autorizado === true && perfil.rol === "master"
    && perfil.aal === "aal2" && !!auth?.getSession();
  const asegurar = () => { if (!master()) throw new Error("Esta gestión exige acceso Master con MFA AAL2."); };
  const status = (texto, error = false) => {
    const el = $("ra-semana-mensaje");
    if (!el) return;
    el.textContent = texto || "";
    el.className = "mensaje" + (error ? " error" : texto ? " exito" : "");
  };
  const opciones = () => recursos.filter(r => r.visible === true && r.estado_publicacion === "publicado"
    && String(r.descripcion || "").trim() && String(r.imagen_url || "").trim()
    && String(r.imagen_alt || "").trim());
  const fechaPeru = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const sumarDias = (fecha, dias) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "";
    const d = new Date(fecha + "T12:00:00Z");
    if (!Number.isFinite(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
  };
  const normalizarImagen = url => {
    const val = String(url || "").trim();
    if (/^assets\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(val)) {
      return "https://crebeucayali.github.io/repositorio-accesible/" + val;
    }
    try {
      const u = new URL(val);
      if (u.protocol !== "https:") return "";
      const gh = u.hostname === "crebeucayali.github.io"
        && /^\/repositorio-accesible\/assets\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(u.pathname);
      const sb = u.hostname === "dteimbhwtzghhsijeeld.supabase.co"
        && /^\/storage\/v1\/object\/public\/eva-publico\/repositorio\/[a-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(u.pathname);
      return gh || sb ? u.href : "";
    } catch { return ""; }
  };
  async function consultar(path, options = {}) {
    asegurar();
    const identity = auth.getSession()?.user?.id;
    const result = await auth.request(path, options);
    if (!master() || auth.getSession()?.user?.id !== identity)
      throw new Error("La sesión cambió durante la consulta. Actualiza el panel.");
    return result;
  }
  function formulario() {
    return {
      id: $("ra-semana-id").value,
      inicio: $("ra-semana-inicio").value,
      fin: $("ra-semana-fin").value,
      estado: $("ra-semana-estado").value,
      ids: [1, 2, 3].map(n => $("ra-semana-material-" + n).value)
    };
  }
  function validar(f) {
    if (!f.inicio || !f.fin || f.fin < f.inicio || f.fin > sumarDias(f.inicio, 6)) {
      throw new Error("Selecciona un intervalo válido de hasta siete días, incluyendo ambas fechas.");
    }
    if (f.estado === "programado") {
      if (f.ids.some(id => !id) || new Set(f.ids).size !== 3)
        throw new Error("Selecciona tres materiales diferentes antes de programar.");
      const disponibles = opciones();
      if (f.ids.some(id => !disponibles.some(r => String(r.id) === id)))
        throw new Error("Los tres materiales deben estar publicados y contar con imagen, descripción y texto alternativo.");
      if (semanas.some(s => String(s.id) !== f.id && s.estado === "programado"
        && f.inicio <= s.fecha_fin && f.fin >= s.fecha_inicio))
        throw new Error("La programación se superpone con otra semana ya programada.");
    }
  }
  function preview() {
    const items = $("ra-semana-preview");
    if (!items) return;
    items.replaceChildren();
    [1, 2, 3].forEach(n => {
      const id = $("ra-semana-material-" + n).value;
      const r = recursos.find(x => String(x.id) === id);
      const article = document.createElement("article");
      article.className = "ra-semana-tarjeta";
      const heading = document.createElement("h4");
      heading.textContent = r ? n + ". " + r.titulo : n + ". Material pendiente de selección";
      article.append(heading);
      if (r) {
        const src = normalizarImagen(r.imagen_url);
        if (src) {
          const image = document.createElement("img");
          image.src = src; image.alt = r.imagen_alt || ""; image.loading = "lazy";
          article.appendChild(image);
        }
        const p = document.createElement("p");
        p.textContent = r.descripcion || "Descripción pendiente.";
        article.appendChild(p);
      }
      items.appendChild(article);
    });
  }
  function selectores() {
    for (let n = 1; n <= 3; n++) {
      const select = $("ra-semana-material-" + n);
      const actual = select.value;
      select.replaceChildren(new Option("Seleccionar material", ""));
      for (const r of opciones())
        select.add(new Option(r.titulo + " (" + r.categoria.replaceAll("_", " ") + ")", String(r.id)));
      if (actual && [...select.options].some(o => o.value === actual)) select.value = actual;
    }
    preview();
  }
  function limpiarForm() {
    $("ra-semana-form").reset(); $("ra-semana-id").value = "";
    $("ra-semana-inicio").value = fechaPeru();
    $("ra-semana-fin").value = sumarDias($("ra-semana-inicio").value, 6);
    $("ra-semana-estado").value = "borrador";
    preview();
  }
  function editar(s) {
    $("ra-semana-id").value = s.id;
    $("ra-semana-inicio").value = s.fecha_inicio;
    $("ra-semana-fin").value = s.fecha_fin;
    $("ra-semana-estado").value = s.estado;
    [1, 2, 3].forEach(n => $("ra-semana-material-" + n).value = String(s["material_" + n + "_id"] || ""));
    preview(); $("ra-semana-inicio").focus();
  }
  function listar() {
    const cuerpo = $("ra-semana-listado");
    cuerpo.replaceChildren();
    if (!semanas.length) {
      const tr = document.createElement("tr"), td = document.createElement("td");
      td.colSpan = 4; td.textContent = "No hay programaciones registradas.";
      tr.appendChild(td); cuerpo.appendChild(tr); return;
    }
    for (const s of semanas) {
      const tr = document.createElement("tr");
      const datos = [s.fecha_inicio + " a " + s.fecha_fin, s.estado,
        [1,2,3].map(n => recursos.find(r => String(r.id) === String(s["material_" + n + "_id"]))?.titulo || "Sin seleccionar").join(" · ")];
      for (const value of datos) { const td = document.createElement("td"); td.textContent = value; tr.appendChild(td); }
      const action = document.createElement("td"), button = document.createElement("button");
      button.type = "button"; button.className = "secundario"; button.textContent = "Editar";
      button.disabled = ocupado; button.addEventListener("click", () => editar(s));
      action.appendChild(button); tr.appendChild(action); cuerpo.appendChild(tr);
    }
  }
  async function recargar() {
    const actual = ++version;
    const [r, s] = await Promise.all([
      consultar("repositorio_recursos?select=id,categoria,titulo,descripcion,imagen_url,imagen_alt,visible,estado_publicacion&order=categoria.asc,titulo.asc"),
      consultar("ra_materiales_semana?select=*&order=fecha_inicio.desc,id.desc")
    ]);
    if (actual !== version || !master()) return;
    if (!Array.isArray(r) || !Array.isArray(s)) throw new Error("No se recibieron los listados esperados.");
    recursos = r; semanas = s; selectores(); listar();
  }
  async function ejecutar(fn) {
    if (ocupado) return;
    ocupado = true; status("");
    $("ra-semana-guardar").disabled = true;
    try { asegurar(); await fn(); }
    catch (e) { status(e.message || "No se pudo completar la operación.", true); }
    finally { ocupado = false; if (master()) $("ra-semana-guardar").disabled = false; listar(); }
  }
  async function guardar() {
    const f = formulario(); validar(f);
    const payload = {
      fecha_inicio:f.inicio, fecha_fin:f.fin, estado:f.estado,
      material_1_id:f.ids[0] ? Number(f.ids[0]) : null,
      material_2_id:f.ids[1] ? Number(f.ids[1]) : null,
      material_3_id:f.ids[2] ? Number(f.ids[2]) : null
    };
    const path = "ra_materiales_semana" + (f.id ? "?id=eq." + encodeURIComponent(f.id) : "");
    const result = await consultar(path, {method:f.id ? "PATCH" : "POST",
      headers: {Prefer:"return=representation"}, body: JSON.stringify(payload)});
    if (!Array.isArray(result) || result.length !== 1)
      throw new Error("El servidor no confirmó el guardado.");
    await recargar(); limpiarForm(); status(f.estado === "programado" ? "Programación guardada. La portada pública aún no muestra este carrusel." : "Borrador guardado.");
  }
  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    const cambiar = evento => {
      if (!master()) return;
      const semanales = evento.target.dataset.raSemanal === "true";
      $("ra-semana-contenido").hidden = !semanales;
      $("ra-semana-catalogo").hidden = semanales;
      $("ra-semana-tab-catalogo").setAttribute("aria-pressed",String(!semanales));
      $("ra-semana-tab-semanal").setAttribute("aria-pressed",String(semanales));
      if (semanales) ejecutar(async () => { await recargar(); status(""); });
    };
    $("ra-semana-tab-catalogo").addEventListener("click", cambiar);
    $("ra-semana-tab-semanal").addEventListener("click", cambiar);
    [1,2,3].forEach(n => $("ra-semana-material-" + n).addEventListener("change", preview));
    $("ra-semana-inicio").addEventListener("change", () => {
      const field = $("ra-semana-fin");
      if (field.value < $("ra-semana-inicio").value || field.value > sumarDias($("ra-semana-inicio").value,6))
        field.value = sumarDias($("ra-semana-inicio").value,6);
    });
    $("ra-semana-nuevo").addEventListener("click", () => {limpiarForm();status("");});
    $("ra-semana-recargar").addEventListener("click", () => ejecutar(async()=> {await recargar();status("Listado actualizado.");}));
    $("ra-semana-form").addEventListener("submit", e => {e.preventDefault();ejecutar(guardar);});
    limpiarForm();
  }
  window.EvaRAMaterialesSemana = {
    configurar(p) {
      perfil = p;
      const seccion = $("ra-semana-administracion");
      if (!seccion) return;
      seccion.hidden = !master();
      if (master()) iniciar();
      else this.limpiar();
    },
    limpiar() {
      version++; recursos = []; semanas = [];
      const section = $("ra-semana-administracion");
      if(section) section.hidden = true;
      const content = $("ra-semana-contenido");
      if(content) content.hidden = true;
      const catalogo = $("ra-semana-catalogo");
      if(catalogo) catalogo.hidden = false;
      if (iniciado) {limpiarForm();listar();status("");}
    }
  };
})();
