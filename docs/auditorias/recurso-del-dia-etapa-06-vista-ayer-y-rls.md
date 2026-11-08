# EVA - etapa 06: consulta pública segura de hoy y ayer

Fecha de ejecución: 8 de noviembre de 2026. Proyecto: CREBE Ucayali.
Migración aplicada: `20261108165134_eva_recurso_dia_etapa_06_vista_ayer_segura`.

## Objetivo

Dar soporte a dos tarjetas de la portada EVA: "El recurso del día", en columna principal, y "El recurso de ayer", al comienzo de Actualidad EVA. Esta migración no modifica el panel administrativo, la programación mensual, los catálogos de BDA o MEA ni las autorizaciones de ilustraciones LSP.

## Cambios de seguridad

La vista `public.eva_recurso_dia_publico` de la etapa 05 conserva su comportamiento de hoy. Se añadió `public.eva_recurso_ayer_publico` con `security_invoker=true`; consulta exclusivamente la fecha anterior determinada por `(now() at time zone 'America/Lima')::date - 1`, no el último recurso disponible ni el día anterior del navegador.

La política RLS anónima `eva_dia_publico_hoy_ayer` permite leer solo los registros aprobados de hoy y ayer. Ambos deben cumplir `estado='programado'`, `tipo='arasaac'`, `derechos_verificados` y `revision_pedagogica`. Los borradores, fechas anteriores, futuras, retirados y LSP no son visibles para visitantes. Se conservan las políticas de administrador Master con MFA AAL2.

La nueva vista expone únicamente fecha, identificadores y atributos públicos de la tarjeta. No expone los campos internos de revisión ni datos administrativos. Se concedió exclusivamente SELECT a `anon` y `authenticated`. La tabla original conserva RLS forzada.

## Pruebas SQL

Prueba transaccional con cuatro registros simulados: hoy, ayer, borrador antiguo y borrador futuro. La vista de hoy devolvió solo hoy y la de ayer solo ayer. El rol `anon` vio exclusivamente dos registros aprobados en la tabla subyacente y uno en cada vista. Se ejecutó ROLLBACK completo.

Verificación final: **0 registros reales**, **0 resultados públicos de hoy**, **0 de ayer**. Vista con `security_invoker=true` y RLS forzada. Los advisors de seguridad no reportaron advertencias nuevas vinculadas a la funcionalidad. Los avisos preexistentes de otras áreas no se modificaron.

## Compatibilidad con la etapa 05

- Mantiene programación mensual, retiro y autorización ARASAAC.
- Mantiene bloqueo temporal de LSP hasta aclarar licencia de ilustraciones MINEDU.
- Sin Cron ni llamadas recurrentes a la base.
- Si no existe programación de ayer, la nueva vista devuelve cero filas; nunca rellena con fechas más antiguas.

## Reversión

`supabase/rollback/20261108165134_eva_recurso_dia_etapa_06.sql`: elimina solo la vista de ayer y restaura política de lectura limitada a hoy. No elimina ni modifica registros. No manipula historial de migraciones automáticamente.

## Presentación

Implementada por separado en `crebeucayali/crebeucayali.github.io`: archivos `index.html`, `eva-recurso-dia.js`, `eva-recurso-dia.css`. La portada consulta ambas vistas con clave pública; el diseño se controla en las pruebas de navegador. No se han insertado recursos reales para forzar la visualización: se oculta un bloque si su vista está vacía.

Las pruebas funcionales con administradores, licencias de señas y activación editorial forman parte de la etapa 07.
