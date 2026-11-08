# Fase 3 · Materiales de la semana · Panel administrativo EVA

Fecha: 7 de noviembre de 2026.

## Alcance

Se integra en el panel de Repositorio Accesible una subpestaña administrativa exclusivamente para el rol `master` con MFA AAL2. El catálogo y el listado de publicación existentes continúan en la vista "Catálogo y publicaciones". La nueva sección contiene:

- Selección de exactamente tres materiales diferentes ya registrados en `repositorio_recursos`, con fotografía, descripción y texto alternativo.
- Fechas de inicio y fin de hasta siete días, inclusive, en el calendario de Perú.
- Estados `borrador`, `programado` y `desactivado`.
- Vista previa sin duplicar fotografías, con tres tarjetas estáticas.
- Historial con edición, carga/recarga, nueva programación y actualización.
- Errores explícitos en caso de permisos, solapamientos, contenido incompleto o sesión vencida.

## Archivos modificados/creados

- `admin/index.html`: nuevo formulario y subpestaña dentro de Repositorio, carga de módulo y versiones de caché.
- `admin/ra-materiales-semana.js`: lógica y acceso a Supabase a través de `EvaAdminSession`.
- `admin/admin.js`: integración de `configurar` y `limpiar` para cambios de sesión.
- `admin/admin.css`: vista previa y subpestañas adaptadas a móvil.

No se modificó `crebeucayali.github.io`, `repositorio-accesible`, la tabla original, Storage ni los monitores.

## Seguridad

La interfaz se oculta para cuentas sin autorización master AAL2. Todas las solicitudes se realizan mediante la sesión autenticada y requieren autorización vigente. La base `ra_materiales_semana` mantiene su RLS, comprobación de master AAL2, restricciones de integridad y control de periodos. La interfaz no sustituye los controles de la base.

## Verificaciones realizadas

- Lectura posterior del código completo en GitHub: nuevos identificadores HTML únicos, presencia de los scripts, conexión de limpieza/permisos, estilos y referencias de tabla.
- Validación sintáctica del nuevo JavaScript satisfactoria.
- No se guardaron programaciones de ejemplo. El repositorio principal público no se modificó.
- Persisten pendientes las pruebas manuales en un navegador autenticado real: selección de tres recursos, guardado de borrador, programación efectiva, edición, renovación/cierre de sesión, lector de pantalla, teclado y dispositivos móviles.
- La fase 4 implementará únicamente el carrusel público cuando se apruebe el panel.

## Recuperación

Para revertir esta fase sin afectar los datos, restaurar las versiones anteriores de `admin/index.html`, `admin/admin.js` y `admin/admin.css` y eliminar la referencia al archivo nuevo `admin/ra-materiales-semana.js`. No revertir la migración de fase 2 sin una intervención independiente y explícita.
