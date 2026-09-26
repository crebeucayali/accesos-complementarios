# Estructura práctica del repositorio AC

Este repositorio corresponde a **AC = Accesos Complementarios**. Forma parte de un **proyecto personal de desarrollo propio** del **Psicólogo Gabriel Berrospi**, orientado a reunir páginas generales de apoyo, orientación, contacto, consulta de directorios y recursos complementarios.

## Naturaleza del proyecto

AC se organiza como una iniciativa personal desarrollada con recursos propios. Su estructura busca facilitar navegación, orientación, contacto, consulta de directorios y acceso a recursos complementarios.

## Criterio de organización

La página raíz `index.html` funciona como portada general de AC. Cada recurso debe mantenerse en su carpeta funcional principal para evitar duplicaciones y facilitar el mantenimiento del repositorio.

## Carpetas principales

- `assets/`: recursos visuales generales, como logo, íconos o imágenes de apoyo.
- `accesibilidad/`: núcleo canónico de accesibilidad transversal de EVA. Su arquitectura y reglas de integración se documentan en `docs/accesibilidad-central-eva.md`.
- `datos/`: archivos de datos utilizados por componentes del sitio.
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

Las carpetas funcionales principales constituyen la ubicación oficial de sus archivos. No deben mantenerse copias redundantes dentro de `contenido/`. La carpeta `contenido/` se encuentra en proceso de depuración y solo debe conservar temporalmente archivos que todavía requieran una migración o ajuste previo, como `contenido/paginas/mapa-web.html` mientras se completa su reorganización final.

## Accesibilidad transversal

La carpeta `accesibilidad/` constituye la ubicación oficial del sistema común de accesibilidad para los módulos EVA. Las mejoras generales deben revisarse y mantenerse primero en esta carpeta.

Los módulos consumidores deben evitar duplicar el panel general o crear implementaciones paralelas de funciones ya disponibles en AC. Las necesidades particulares de un módulo deberán resolverse como extensiones específicas y documentadas.

Documento operativo de referencia: [Sistema central de accesibilidad EVA](accesibilidad-central-eva.md).
