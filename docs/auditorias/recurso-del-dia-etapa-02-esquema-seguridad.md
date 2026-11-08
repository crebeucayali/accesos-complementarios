# Recurso del día - etapa 02: Supabase, programación mensual segura

Fecha de aplicación: 8 de noviembre de 2026 (America/Lima).
Proyecto Supabase: `dteimbhwtzghhsijeeld` (CREBE).
Migración aplicada: `20261108144059_eva_recurso_dia_etapa_02_programacion_segura`.
Rama de documentación: `feature/eva-recurso-dia-etapa-02`.

## Alcance ejecutado

Esta etapa prepara **exclusivamente la estructura de datos y la seguridad**. No se incorporó la pestaña del panel, no se modificaron los módulos BDA/MEA ni la portada EVA, no se guardó un catálogo mensual, no se agregaron registros de producción y no se activó recurso diario.

Se creó la tabla `public.eva_recurso_dia_programacion` y la vista `public.eva_recurso_dia_publico`. No se requieren tareas Cron, Edge Functions ni almacenamiento adicional para seleccionar el día vigente.

## Modelo de programación

Cada registro contiene: `fecha` (fecha civil de Perú), `tipo` exclusivo `lsp`/`arasaac`, `lsp_id` o `arasaac_ids` (lista de 1 a 3), título, descripción, texto alternativo, imagen LSP, URL de fuente, atribución, licencia, verificación documental de derechos, referencia de derechos, revisión pedagógica y estado administrativo (`borrador`, `programado`, `publicado`, `retirado`). Incluye timestamps de creación/actualización.

- Una **única programación activa por fecha**, con índice único parcial para `programado` o `publicado`. Se permiten borradores alternativos hasta su revisión.
- Nunca hay LSP y ARASAAC en una misma ficha; tipo LSP exige identificador con patrón `LSP-000001`; ARASAAC exige de 1 a 3 IDs numéricos positivos.
- El salto de `borrador` a `programado` o `publicado` exige título, descripción, texto alternativo, URL de fuente, atribución, licencia, derechos verificados, referencia documental y revisión pedagógica. Si es LSP también exige URL de imagen.
- La activación para visitantes se decide **por fecha de Perú**, desde la vista; la base no actualiza automáticamente el campo `estado` cada medianoche. El término `publicado` en el esquema es un estado administrativo, no una operación automática de cron.
- No existe ningún registro inicial: hasta crear y aprobar la programación, la vista pública está vacía.
- Los derechos de LSP continúan **pendientes de verificación** según etapa 01; el campo booleano no constituye prueba jurídica por sí solo. El panel de etapa 03 deberá impedir marcarlo sin referencia verificable.

## Autorización y RLS

- RLS habilitada y forzada sobre la nueva tabla.
- `anon`: solo SELECT y solo registro de la fecha presente de Lima con estado `programado/publicado` y revisiones marcadas. Sin INSERT, UPDATE ni DELETE.
- `authenticated`: operaciones condicionadas a `private.es_admin_mfa()`, guardia que el panel ya usa para Master + MFA AAL2. La pertenencia al rol `authenticated` por sí sola no habilita edición.
- Vista pública `security_invoker=true`, sin ID interno de fila, datos de validación administrativa, referencias de autorización ni fechas futuras. Conserva solo fuente, contenido y créditos para el recurso público.
- No se crearon funciones `security definer` en el esquema público ni se añadió acceso con `service_role` al navegador.

## Resultados de verificación

1. La migración fue aplicada satisfactoriamente.
2. Tabla real: **0 registros**; vista: **0 registros**.
3. RLS y `FORCE ROW LEVEL SECURITY` confirmadas; vista `security_invoker` confirmada.
4. Se verificaron cinco políticas: SELECT `anon` solo de hoy; cuatro políticas para administradores autenticados (SELECT, INSERT, UPDATE, DELETE) con `private.es_admin_mfa()`.
5. Prueba SQL transaccional: se creó una ficha simulada para hoy y un borrador futuro; con rol `anon` solamente apareció la ficha aprobada del día. Se comprobó bloqueo de INSERT anónimo y autenticado sin MFA.
6. El índice único rechazó dos recursos activos en la misma fecha; la restricción rechazó fichas programadas sin verificación documental.
7. Se comprobó exclusividad LSP/ARASAAC. Los datos de ensayo se revertieron mediante ROLLBACK.
8. Advisors de seguridad: **no se identificaron avisos relativos a la nueva tabla ni vista**. Existen avisos previos en otras funcionalidades (guardas internas, funciones de visitas/invitaciones y protección de contraseñas), que no se alteraron por estar fuera del alcance.
9. Advisors de rendimiento: el índice `eva_dia_fecha_estado` aparece sin uso porque la tabla está vacía. Se conservará provisionalmente; revisar al existir volumen real. Otros avisos corresponden a funciones anteriores, fuera de alcance.

## Archivos de respaldo y reversión

- `supabase/migrations/20261108144059_eva_recurso_dia_etapa_02_programacion_segura.sql`: SQL exacto recuperado del historial de la migración aplicada.
- `supabase/tests/eva_recurso_dia_etapa_02_seguridad.sql`: comprobaciones transaccionales de roles, fechas y restricciones.
- `supabase/rollback/20261108144059_eva_recurso_dia_etapa_02.sql`: reversión conservadora; **se niega a borrar la tabla si tiene registros**. No manipula automáticamente el historial de migraciones.

## Pendiente para etapa 03

Crear la pestaña administrativa, consulta de borradores y programación por mes, selección de un único recurso por fecha, validaciones de referencias y atribuciones, revisión previa y estados. No cambiar la vista ni publicar un recurso hasta completar las etapas correspondientes y aclarar permisos de imágenes LSP.

## Estado

Etapa 02 **implementada en la base y verificada por SQL**, sin registros ni modificaciones públicas. Etapa 03 pendiente.
