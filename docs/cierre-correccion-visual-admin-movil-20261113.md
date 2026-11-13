# Cierre técnico: corrección visual de cabecera y menú móvil del panel EVA

**Fecha:** 13 de noviembre de 2026 (Perú).  
**Sistema:** Panel administrativo del Ecosistema Virtual Accesible (EVA), CREBE "Señor de los Milagros" - Ucayali.  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Alcance:** corrección de presentación de `admin/`, sin nuevos módulos, estadísticas ni cambios de datos.  
**Auditoría previa:** `docs/auditoria-correccion-visual-admin-movil-20261113.md` (commit inicial `af2dcdd66a8953a44fbdc7b906101abbb77fcf60`, precisado en `cb2477db0a078b37a7b131a5af3571135792b766`).  
**PR:** https://github.com/crebeucayali/accesos-complementarios/pull/41  
**Merge a main:** `1707150b1a4380de49a705ded9f35ef719ab75ff`.

## 1. Diagnóstico confirmado en código

La hoja de estilos situaba la identidad institucional `.marca-crebe` con `flex:1 1 460px`. Cuando la cabecera cambiaba a dirección vertical bajo 1180 px, la regla de mayor especificidad mantenía una reserva flex vertical de 460 px y originaba un bloque blanco excesivamente alto.

El menú lateral móvil se activaba solo con `max-width:900px` tanto en CSS como en JavaScript. En navegadores móviles que exponen un ancho CSS de escritorio, podía mantenerse una barra lateral y reducirse el área de trabajo. La captura de usuario mostró una presentación compatible con ese comportamiento; no se dispone de inspección directa de la configuración de Brave.

## 2. Corrección aplicada

- Bajo 1180 px, el elemento de identidad emplea `flex:0 0 auto`, `width:100%` y altura automática. La cabecera conserva texto y logotipo sin altura flex artificial.
- Para dispositivos de puntero táctil con ancho CSS de 901 a 1180 px, el área administrativa cambia a menú lateral superpuesto con botón de apertura, cierre, fondo y contenido en una columna. Las mismas reglas siguen aplicando normalmente bajo 900 px.
- La condición de apertura y cierre del menú en `admin/admin.js` utiliza el mismo criterio CSS: `(max-width:900px), (max-width:1180px) and (pointer:coarse)`. Se oculta el menú al salir de ese contexto. No se cambió ningún permiso ni decisión de acceso a las pestañas.
- Los textos de inicio ya no anuncian la futura disponibilidad de indicadores que se consultan; la sección de seguimiento todavía no integrada queda expresamente identificada.
- Se forzó la renovación de caché de `admin.css?v=60` y `admin.js?v=65`.

## 3. Verificaciones automáticas

| Workflow | Resultado | Evidencia |
| --- | --- | --- |
| Cabecera y portada: 36 combinaciones de ancho/fuente y 5 situaciones adicionales de móvil táctil, ancho de escritorio simulado y escritorio convencional | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43489622488 |
| Regresiones de panel de recursos MEA | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43489622567 |
| Regresiones de panel de recursos BDA | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43489622441 |
| Verificación de archivos en `main` (CSS, JS y versionado, textos, pruebas y auditoría) | Conforme | https://github.com/crebeucayali/accesos-complementarios/pull/41/files |

Las pruebas de cabecera se ejecutaron con Playwright/Chromium sin autenticación ni llamadas externas. Es una validación automatizada de geometría y condiciones CSS/JS, no una captura de la sesión administrativa del usuario.

## 4. Archivos modificados

- `admin/index.html`.
- `admin/admin.css`.
- `admin/admin.js` (únicamente condición responsive del menú y su escucha).
- `admin/tests/encabezado-panel-responsivo.browser.mjs`.
- `.github/workflows/validar-admin-encabezado.yml`.
- `docs/auditoria-correccion-visual-admin-movil-20261113.md`.
- `docs/cierre-correccion-visual-admin-movil-20261113.md` (este archivo).

## 5. Exclusiones y validación humana

No se modificaron Supabase, funciones de seguimiento, estadísticas, tablas, autenticación, MFA, RLS, permisos, datos históricos, GitHub Pages de otros módulos ni funciones de publicación.

**Estado técnico:** integrado en `main`, con tres workflows aprobados y comprobación de referencias.  
**Pendiente de validación humana:** abrir el panel en el teléfono después de publicarse el cambio, actualizar la página y comprobar la cabecera sin espacio blanco y el funcionamiento del menú. Si el navegador mantiene activado "Sitio para ordenador", conviene desactivarlo para disfrutar del diseño móvil nativo; ningún cambio web puede garantizar la anulación de esa preferencia.

No se considera realizada una prueba con la sesión autenticada real hasta que el responsable confirme su resultado.
