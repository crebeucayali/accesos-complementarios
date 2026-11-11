# Cierre técnico del contador EVA v3
Fecha de referencia: 10 de noviembre de 2026 (Perú).

## Estado
Implementación integrada en `main` de los ocho repositorios que componen EVA. No incluye métricas de materiales descargados.

## Backend
- Supabase CREBE Project: migraciones `aislar_funcion_publica_visitas_eva` y `visitas_idempotentes_v2` aplicadas.
- RPC anterior `registrar_visita_eva_hito` conserva compatibilidad para clientes que aún tienen archivos caché.
- Nuevo RPC `registrar_visita_eva_hito_v2`: clave UUID efímera por operación; un reintento del mismo identificador no incrementa por segunda vez mientras conserve su registro de deduplicación.
- La tabla restringida `eva_counter_api.eva_operaciones_recientes` almacena UUID de operación, marca temporal y respuesta técnica, sin identidad de visitante ni rutas recorridas.
- La depuración elimina registros con más de 72 horas, ejecutándose probabilísticamente al recibirse nuevas visitas; sin tráfico nuevo puede retrasarse.
- Auditor de seguridad: las funciones públicas de visitas no se ejecutan como SECURITY DEFINER; las funciones elevadas permanecen en esquema no expuesto.

## Frontend
- Script `estadisticas/visitas-eva.js` publicado como versión compartida `v=3`.
- Mantiene un contador universal `__eva__` y ocho contadores de módulos.
- Sesión de inactividad de 30 minutos; una primera entrada por módulo y sesión.
- Web Locks sincroniza pestañas del mismo origen cuando está disponible.
- Ante respuesta HTTP fallida o ambigua, se conserva temporalmente la UUID para reintentar sin duplicar la misma operación.
- Mantiene reconocimiento de hitos por cada 1000 sesiones universales.

## Repositorios y actualización de caché
- Principal: 3 páginas.
- CAP: 3 páginas.
- BDA: 13 páginas.
- MEA: 11 páginas.
- NI: 9 páginas.
- RA: 4 páginas.
- AC: 17 páginas.
- DUA 3.0: 3 páginas.
- Total de 63 referencias de página cambiadas de `v=2` a `v=3` en los repositorios.

## Integraciones verificadas
- AC PR #23.
- CAP PR #6.
- BDA PR #7.
- MEA PR #9.
- NI PR #10.
- RA PR #8.
- Principal PR #38.
- DUA 3.0 PR #6.
Todos fusionados.

## Validación
- GitHub Actions: seis pruebas Node aprobadas; Chromium/Playwright aprobado con solicitudes a Supabase interceptadas.
- PostgreSQL 17 efímero: autorización anónima de RPC, validación de módulos y acciones, un único incremento ante UUID repetida, hito 1000.
- La migración de producción se aplicó sin reiniciar tablas ni migrar estadísticas.
- Consulta posterior: `__eva__=1239` sesiones y `eva_visitas_eventos=0` eventos individuales; `eva_operaciones_recientes=0` al momento del muestreo. Las visitas naturales pueden seguir aumentando.

## Límites técnicos que continúan
- El contador anónimo no demuestra usuarios únicos ni excluye por completo llamadas artificiales con nuevas UUID.
- Sin Web Locks puede existir carrera entre pestañas.
- La garantía de no duplicación opera sólo mientras la UUID de la solicitud permanezca en la tabla temporal.
- Se validaron fuentes GitHub y pruebas simuladas; la propagación de GitHub Pages/CDN y la navegación manual de usuarios en todos los módulos no se verificaron directamente. No confundir PR fusionada con disponibilidad inmediata en CDN.

## Etapa posterior, fuera de alcance
Métricas de descargas/exportaciones de MEA, imágenes de BDA y recursos documentales de CAP, con conteos agregados. RA se mediría por fichas consultadas, no por descargas de materiales físicos.
