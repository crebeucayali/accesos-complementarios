(() => {
  "use strict";
  const links = document.querySelectorAll("[data-compartir-facebook], .compartir-facebook");
  const page = new URL(window.location.href);
  page.hash = "";
  links.forEach(link => {
    const params = new URLSearchParams({ app_id: "1743067010248486", display: "popup",
      href: page.href, redirect_uri: page.href });
    link.href = "https://www.facebook.com/dialog/share?" + params;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Compartir";
    link.setAttribute("aria-label", "Compartir este contenido de validación");
  });
})();
