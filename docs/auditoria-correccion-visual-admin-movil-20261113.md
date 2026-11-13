# Auditoría previa: cabecera y adaptación móvil del panel administrativo EVA

**Fecha:** 13 de noviembre de 2026, Perú.  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Base:** `main` (`0a7b5e13d305bf04f391da36c7cc4fd2ab80b3fc`).  
**Origen:** captura móvil facilitada por el responsable, que muestra cabecera excesivamente alta, navegador con vista de escritorio aparente y barra administrativa lateral sobre un ancho físico reducido.

## Diagnóstico verificable en código

1. `@media(max-width:1180px)` configura `.cabecera-interior` en dirección vertical y `.marca-crebe` con `flex-basis:auto`, pero la regla posterior `body.panel-admin-page .marca-crebe{flex:1 1 460px}` tiene mayor especificidad y reinstaura 460 px de base flex **vertical**: puede generar el gran blanco visible.
2. La navegación del panel pasa a botón/menú móvil solo con `@media(max-width:900px)`. Algunos navegadores en la opción "sitio para ordenador" usan un viewport CSS aproximado de escritorio sobre una pantalla física de teléfono; el breakpoint no se activa y el contenido se reduce visualmente. Puede añadirse un fallback estrechamente limitado a dispositivos táctiles con viewport de hasta 1180 px. Esta detección no garantiza vencer todos los modos de escritorio del navegador.
3. En `admin/index.html` siguen las frases "Los indicadores se incorporarán con datos reales en la siguiente etapa" y "Las próximas actividades y publicaciones se incorporarán...". La primera es incorrecta porque el panel ya presenta cifras; la segunda debe expresar que el apartado está pendiente, sin atribuirle funciones implementadas.
4. El documento tiene `<meta name="viewport" content="width=device-width, initial-scale=1">` correcto; no se justifica modificar JavaScript ni forzar el comportamiento del navegador.

## Solución acotada

- Añadir override específico de la base flex y altura de identidad en cabeceras verticales; no tocar cabeceras de otros repositorios.
- Aplicar modo menú móvil al usuario de dispositivo de puntero táctil aunque el viewport CSS se exponga entre 901 y 1180 px; conservar el modo normal de escritorio en dispositivos con ratón.
- Ajustar solo dos textos provisionales, sin alterar tarjetas, métricas, lógica, conectividad, autenticación ni permisos.
- Incorporar pruebas de estrés a resoluciones CSS 320/390/768/900/980/1100/1280 y contextos táctiles/no táctiles, cabecera, navegación y contenedores.
- Validar regresiones existentes de cabecera, MEA y BDA antes de integrar a `main`.

## Límites de verificación

La captura permite observar presentación visual, pero no expone dimensiones CSS computadas ni configuración interna de Brave. La prueba automatizada cubrirá escenarios reproducibles en Chromium; la revisión final en el teléfono requiere abrir la página con la vista móvil del navegador y comparar visualmente.

No se realizarán cambios en Supabase, datos, RPC, tablas, MFA, permisos, código administrativo funcional ni secciones de EVA públicas.
