# Etapa 3 - Integración administrativa del Repositorio Accesible en BDA

Fecha: 2026-11-11. Rama: `migration/ra-bda-admin-20261111`.

## Alcance ejecutado
- Interfaz del panel EVA identificada como **BDA · Repositorio**. Se conservan los identificadores internos `repositorio`, `panel-repositorio` y los controles actuales para no romper el sistema de permisos, publicaciones ni pruebas.
- Previsualización de fotografías con ruta `assets/...` trasladada al espacio `https://crebeucayali.github.io/banco-digital-accesible/repositorio-accesible/`.
- Las direcciones absolutas históricas de imágenes de RA se aceptan y normalizan hacia BDA para nuevas operaciones de guardado. Las direcciones de BDA y Supabase Storage continúan permitidas.
- Módulo de materiales de la semana actualizado para mostrar imágenes del catálogo desde BDA.
- Se conserva la tabla `public.repositorio_recursos`, los valores de `categoria`, los identificadores de recursos, el bucket existente y los controles de sesión administrativa.
- Se mantienen operaciones de listar, insertar, editar, archivar y eliminar sin alteraciones en sus endpoints; la eliminación sigue requiriendo confirmación.

## Base de datos - verificación de solo lectura
- 47 recursos registrados y publicados: 27 materiales disponibles, 5 equipos tecnológicos y 15 materiales elaborados.
- `public.repositorio_recursos` con RLS habilitado y forzado.
- Políticas existentes con lectura pública restringida a recursos publicados/visibles, lectura administrativa autorizada y escrituras para administrador MFA AAL2.
- No se realizaron modificaciones de esquema, filas, permisos o policies. Se conserva la auditoría existente.

## Condiciones de publicación y pruebas pendientes
1. La rama de cambios administrativos sigue aislada; no se ha desplegado la nueva interfaz del panel.
2. Realizar prueba contextual con sesión Master MFA AAL2 de creación de recurso borrador, edición, imagen, cambio de estado y limpieza controlada; comprobar trazas de auditoría.
3. Repetir las operaciones de lectura y publicación con una cuenta autorizada de consulta/publicador; las acciones no permitidas deben quedar bloqueadas.
4. Probar rutas de imagen antiguas y nuevas, incluida la previsualización de un recurso histórico.
5. Publicar el árbol final de BDA antes o simultáneamente con el panel adaptado: el destino `banco-digital-accesible/repositorio-accesible/` todavía existe solamente en la rama de migración y en pruebas bajo `validacion-ra/`.
6. Verificar e incorporar las restantes dependencias EVA (publicación, comunicados y buscador); hacer redirecciones antes de desactivar RA.

## Regla de protección
No cambiar los identificadores lógicos `repositorio` a `bda` en controles de acceso sin antes migrar de manera coordinada los permisos en base de datos. No eliminar ni archivar el repositorio RA hasta la verificación global.
