const chipsCategorias = document.getElementById("chips-categorias");
const selectorCategoria = document.getElementById("categoria");
const directorioContenedor = document.getElementById("directorio");

function obtenerCategoriaDesdeChip(chip) {
  return Array.from(chip.childNodes)
    .filter((nodo) => nodo.nodeType === Node.TEXT_NODE)
    .map((nodo) => nodo.textContent)
    .join(" ")
    .trim();
}

function prepararChipsComoAccesos() {
  if (!chipsCategorias) return;
  chipsCategorias.querySelectorAll(".chip").forEach((chip) => {
    const categoria = obtenerCategoriaDesdeChip(chip);
    if (!categoria) return;
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("title", `Ver entidades de ${categoria}`);
    chip.setAttribute("aria-label", `Ver entidades de ${categoria}`);
    chip.style.cursor = "pointer";
  });
}

function irACategoria(categoria) {
  if (!categoria || !selectorCategoria) return;
  const existeOpcion = Array.from(selectorCategoria.options).some((opcion) => opcion.value === categoria);
  if (!existeOpcion) return;

  selectorCategoria.value = categoria;
  selectorCategoria.dispatchEvent(new Event("change", { bubbles: true }));

  window.requestAnimationFrame(() => {
    const seccion = Array.from(directorioContenedor?.querySelectorAll(".seccion-grupo") || [])
      .find((grupo) => grupo.querySelector(".titulo-grupo")?.textContent.trim() === categoria);
    seccion?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (chipsCategorias) {
  prepararChipsComoAccesos();

  chipsCategorias.addEventListener("click", (evento) => {
    const chip = evento.target.closest(".chip");
    if (!chip || !chipsCategorias.contains(chip)) return;
    irACategoria(obtenerCategoriaDesdeChip(chip));
  });

  chipsCategorias.addEventListener("keydown", (evento) => {
    if (evento.key !== "Enter" && evento.key !== " ") return;
    const chip = evento.target.closest(".chip");
    if (!chip || !chipsCategorias.contains(chip)) return;
    evento.preventDefault();
    irACategoria(obtenerCategoriaDesdeChip(chip));
  });

  const observadorChips = new MutationObserver(prepararChipsComoAccesos);
  observadorChips.observe(chipsCategorias, { childList: true });
}