# Estructura práctica del repositorio AC

Este repositorio corresponde a **AC = Accesos Complementarios**. Forma parte de un **proyecto personal de desarrollo propio** del **Psicólogo Gabriel Berrospi**, orientado a reunir páginas generales de apoyo, orientación, contacto, consulta de directorios y recursos complementarios.

## Naturaleza del proyecto

AC se organiza como una iniciativa personal desarrollada con recursos propios. Su estructura busca facilitar navegación, orientación, contacto, consulta de directorios y acceso a recursos complementarios.

## Criterio de organización

La página raíz `index.html` funciona como portada general de AC. Cada recurso debe mantenerse en su carpeta funcional principal para evitar duplicaciones y facilitar el mantenimiento del repositorio.

## Carpetas principales

- `assets/`: recursos visuales generales, como logo, íconos o imágenes de apoyo.
- `accesibilidad/`: núcleo canónico de accesibilidad transversal de EVA. Su arquitectura y reglas de integración se documentan en `docs/accesibilidad-central-eva.md`.
- `datos/`: archivos de datos utilizados por componentes del sitio. Incluye `datos/noticias-destacadas.json` como ubicación canónica del conjunto de noticias destacadas de AC.
- `paginas/`: páginas informativas generales de AC.
- `directorios/`: páginas relacionadas con directorios y entidades.
- `recursos/`: páginas de apoyo visual o informativo, como calendario y galería.
- `firma-tu-visita/`: componente específico de registro voluntario de visita.
- `docs/`: documentación del repositorio, autoría, finalidad, estructura y mantenimiento.

## Criterio técnico

- HTML: estructura y contenido.
- CSS: diseño visual en archivos separados y ubicados junto a la sección o componente al que pertenecen cuando corresponda.
- JS: funcionamiento o interactividad, solo cuando sea necesario.
- JSON: datos estructurados utilizados por componentes del sitio.
- MD: documentación interna de autoría, finalidad, propósito, funciones y mantenimiento.

## Autoría

La organización funcional del repositorio, su estructura y documentación forman parte del **proyecto personal y desarrollo original del Psicólogo Gabriel Berrospi**.

## Organización vigente

Las carpetas funcionales principales constituyen la ubicación oficial de sus archivos. No deben mantenerse copias redundantes dentro de `contenido/`. El Mapa web vigente se encuentra en `mapa-web.html`; `paginas/mapa-web.html` se conserva únicamente como redirección compatible hacia esa ruta principal.

## Accesibilidad transversal

La carpeta `accesibilidad/` constituye la ubicación oficial del sistema común de accesibilidad para los módulos EVA. Las mejoras generales deben revisarse y mantenerse primero en esta carpeta.

Los módulos consumidores deben evitar duplicar el panel general o crear implementaciones paralelas de funciones ya disponibles en AC. Las necesidades particulares de un módulo deberán resolverse como extensiones específicas y documentadas.

Documento operativo de referencia: [Sistema central de accesibilidad EVA](accesibilidad-central-eva.md).


## Datos canónicos

Para evitar copias paralelas, los conjuntos de datos reutilizables deben mantenerse dentro de `datos/` cuando corresponda.

En particular:

- `datos/noticias-destacadas.json` es la única copia canónica de las noticias destacadas de AC;
- no debe recrearse una segunda copia de `noticias-destacadas.json` en la raíz;
- si una página futura necesita este conjunto, debe enlazar explícitamente la ruta canónica dentro de `datos/`.
