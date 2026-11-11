# Fase 3: panel de uso de recursos educativos MEA

Fecha de implementación: 10 de noviembre de 2026, hora de Perú.

## Alcance
- Nueva sección independiente **Uso de recursos** dentro de Seguimiento del panel administrativo de EVA.
- La sección se presenta exclusivamente a perfiles master con MFA AAL2. No modifica el acceso de editores y consultas.
- Consulta el RPC existente `public.admin_estadisticas_recursos_mea(p_dias)` con la sesión autenticada. No se crea ninguna tabla ni se altera el contador universal o por módulo.
- Filtros: 7, 30, 90 y 365 días.
- Indicadores: total de acciones, exportaciones iniciadas, descargas solicitadas y cantidad de herramientas con actividad en el periodo.
- Tabla accesible por herramienta, formato y tipo de acción, agrupada por suma.
- Gráfico temporal diario para 7/30 días y mensual para 90/365 días.
- Mensajes diferenciados para carga, ausencia de datos y error. Nunca se presenta información simulada como registro institucional.

## Privacidad y controles
- `admin.js` valida permiso `master/aal2` y delega la consulta mediante `auth.request`, sin exponer tokens a un módulo separado.
- El backend ya valida por su cuenta `private.es_admin_mfa()`: no se confía únicamente en controles de interfaz.
- Los elementos de interfaz se crean mediante `textContent`, sin insertar HTML procedente de las filas.
- Al salir se borran los datos y se invalidan solicitudes pendientes para evitar resultados tardíos de sesiones anteriores.
- La nueva sección es solo de lectura. No utiliza identificadores de personas ni material pedagógico descargado.

## Validaciones automatizadas
GitHub Actions https://github.com/crebeucayali/accesos-complementarios/actions/runs/42951956187
- Chromium en escritorio: seis escenarios aprobados.
- Chromium con viewport móvil: seis escenarios aprobados.
- Estado inicial sin cifras; un registro real de ejemplo simulado `pictogramas/png=1`, cambio del filtro 90 días, periodo sin datos, error de conexión, perfil editor sin acceso y limpieza mientras llega una respuesta atrasada.
- Comprobaciones estáticas de menú, enlace de RPC y borrado al cerrar sesión.
- `node --check` de `admin.js` y `estadisticas-recursos.js`: aprobados.
Las pruebas usaron respuestas simuladas, no el token ni datos del administrador real.

## Verificación previa de base real
La fase 2 confirmó una acción de pictogramas PNG registrada el 10-11-2026 (hora local 10-11-2026 en Perú) y el RPC con acceso master MFA AAL2. La cifra puede aumentar por uso natural; el panel siempre mostrará la consulta actual del periodo.

## Pendientes operativos
- Confirmar propagación del cambio en GitHub Pages y carga efectiva con sesión master y segundo factor, con una revisión visual en computadora y teléfono.
- Revisar contrastes y tamaños de letra con los ajustes institucionales de accesibilidad.
- No interpretar las estadísticas como visitantes únicos, descargas completadas ni evidencia de aprendizaje.
- Al cerrar esta revisión puede iniciarse la fase 4 de auditoría y documentación final.
