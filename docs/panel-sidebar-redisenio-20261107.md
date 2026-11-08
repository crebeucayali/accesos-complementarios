# EVA - Reorganización del panel administrativo mediante barra lateral

Fecha: 7 de noviembre de 2026 (Perú).

## Alcance aplicado

La barra horizontal de secciones fue reorganizada en una navegación lateral de escritorio, con menú desplegable para móvil. Se conservan los mismos 11 botones `data-panel`, sus cargadores y los permisos por rol; se añade botón Inicio independiente, indicador de vista activa y grupos de Seguimiento, Gestión de contenidos y Administración.

Archivos actualizados:

- `admin/index.html`: estructura de barra lateral, botón móvil, fondo modal y distribución del contenido.
- `admin/admin.css`: diseño responsive, resaltado de pestaña, alto contraste, foco visible, respeto al movimiento reducido y garantía de ocultación de pestañas sin permiso.
- `admin/admin.js`: apertura/cierre de menú móvil, tecla Escape, regreso a Inicio, marca de sección activa y cierre del menú al seleccionar un módulo.

## Seguridad y preservación

No se modificó el inicio de sesión, MFA AAL2, almacenamiento de sesión, políticas RLS, Supabase, tablas, datos ni repositorios de módulos públicos. Se conservan los chequeos `permitePanel` y las funciones originales de gestión. La regla de CSS `button.tab[hidden]` prevalece sobre el diseño para no mostrar botones que la autorización oculta.

## Verificación estática realizada

- 11 botones de navegación conservados, sin duplicación de sus identificadores.
- Sintaxis de `admin/admin.js` verificada.
- Referencias de botones móviles, capa de fondo, panel lateral y área de contenido presentes.
- Cargadores y controles originales de permisos/autenticación siguen en el código.
- Versiones de recursos actualizadas para evitar el uso del CSS/JS anterior.

## Pendientes de comprobación humana antes de declarar cierre integral

1. Ingresar como Master con MFA, navegar los 11 módulos y volver a Inicio.
2. Verificar en un usuario editor/consulta que solo se vean los módulos permitidos.
3. En celular, abrir y cerrar el menú, seleccionar un módulo, usar Escape y probar desplazamientos largos.
4. Revisar que los formularios extensos, tablas y edición/guardado existentes no se recorten ni alteren.
5. Comprobar teclado, foco y alto contraste. La navegación móvil todavía no cuenta con una prueba automatizada de foco.
6. Confirmar que cerrar sesión elimina el acceso y que la sesión conservada continúa funcionando.

## Reversión

Restaurar los tres archivos del panel `admin/index.html`, `admin/admin.css` y `admin/admin.js` a sus versiones previas a esta reorganización. No realizar migraciones ni revertir datos de Supabase.
