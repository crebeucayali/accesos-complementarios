# EVA - Etapa 4: implementación técnica controlada RA/NI
Fecha: 11 de noviembre de 2026.
Estado: cambios publicados en GitHub; comprobación técnica estática y de registros satisfactoria. Validación humana en navegador pendiente.

## Alcance aplicado
- Se modificó únicamente el seguimiento de visitas de las páginas públicas de RA y NI.
- RA: cuatro páginas instrumentadas usan `data-eva-modulo="bda"`.
- NI: nueve páginas instrumentadas usan `data-eva-modulo="accesos_complementarios"`.
- Las trece páginas utilizan `visitas-eva.js?v=4`.
- El script compartido `estadisticas/visitas-eva.js` normaliza los identificadores históricos en lectura de la sesión local: `repositorio_accesible -> bda` y `noti_inclusivos -> accesos_complementarios`.
- Las operaciones pendientes conservan módulo y UUID originales para mantener compatibilidad con los reintentos idempotentes.
- No se alteró contenido pedagógico, archivos de los artículos, rutas públicas, autenticación, roles administrativos, frontend de la tabla de estadísticas ni el backend de Supabase.

## Archivos públicos verificados
RA:
1. `index.html`
2. `equipos-tecnologicos/index.html`
3. `materiales-elaborados/index.html`
4. `materiales-disponibles/index.html`

NI:
1. `index.html`
2. `articulos/index.html`
3. `articulos/lanzamiento-eva/index.html`
4. `articulos/transicion-vida-adulta/index.html`
5. `articulos/salud-emergencias-inclusion/index.html`
6. `articulos/sindrome-down-y-bioetica/index.html`
7. `articulos/cuentos-inclusion-discapacidad/index.html`
8. `articulos/natacion-inclusiva-sin-barreras/index.html`
9. `articulos/neurodiversidad-del-reconocimiento-a-los-apoyos/index.html`

## Evidencia de verificación
- Lectura posterior en GitHub: 4/4 páginas RA y 9/9 páginas NI presentan identificador y versión esperados.
- Simulación lógica de grupo por sesión: BDA->RA=1, RA->BDA=1, AC->NI=1, NI->AC=1, BDA->NI=2, RA->RA=1.
- Lectura de Supabase antes/después: sesiones globales `__eva__=1259`; `bda=460`; `accesos_complementarios=376`; `repositorio_accesible=271`; `noti_inclusivos=251`. Se mantuvieron sin cambios durante la intervención; no se insertaron datos artificiales.
- El servidor conserva los identificadores originales, las reglas de deduplicación por UUID y la lógica de hitos.

## Limitaciones y pruebas aún necesarias
- La simulación prueba las reglas previstas, pero no constituye una prueba de navegador end-to-end.
- Un visitante con páginas HTML o el script antiguo en caché puede seguir usando identificadores anteriores transitoriamente; por eso el backend continúa aceptándolos.
- Validar manualmente en PC y móvil las seis rutas: BDA->RA, RA->BDA, AC->NI, NI->AC, recargas y expiración de 30 minutos.
- Probar un registro pendiente mientras se navega entre repositorios y una interrupción de red en un entorno aislado. No generar sesiones artificiales sobre las estadísticas reales.
- Verificar el panel autenticado, selección de periodos, contador visible y aparición de hitos al alcanzar un múltiplo de 1000.

## Reversión
- RA y NI: restaurar `data-eva-modulo` anterior y la versión del script en las trece páginas, basándose en los commits previos.
- Script central: restaurar la versión previa del archivo si se requiere una reversión completa, una vez comprobadas las operaciones pendientes y su compatibilidad.
- No modificar ni borrar los registros históricos de Supabase durante una reversión.

## Continuidad
Etapa 5: validación real de recorridos, panel administrativo y cierre final. Se mantiene separada de la verificación técnica de esta etapa.
