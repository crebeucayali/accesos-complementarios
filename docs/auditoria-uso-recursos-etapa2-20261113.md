# Auditoría previa: Uso de recursos, etapa 2

**Fecha:** 13 de noviembre de 2026 (Perú).
**Repositorio:** `crebeucayali/accesos-complementarios`.
**Punto de partida:** `main` en `4612ca78498c325e1d14c82877d241874ee72677`.
**Área:** solamente el apartado administrativo `Seguimiento > Uso de recursos` (MEA y BDA).

## Documentos y código inspeccionados

- `admin/index.html`, `admin/admin.css`, `admin/estadisticas-recursos.js`, `admin/estadisticas-bda.js`, `admin/admin.js`.
- Pruebas `admin/tests/estadisticas-recursos.browser.mjs` y `admin/tests/estadisticas-bda-panel.browser.mjs`, más los workflows de GitHub Actions.
- `docs/auditoria-uso-recursos-etapa1-20261113.md` y `docs/cierre-uso-recursos-etapa1-20261113.md`.

## Hallazgos

1. **Contratos reutilizables:** La consulta RPC de MEA devuelve filas por `fecha`, `herramienta`, `formato`, `accion` y `total`; BDA devuelve registros LSP/PNG de `descarga_solicitada` por fecha. No hace falta ampliar tablas, RPC ni capturas públicas.
2. **BDA sin gráfica:** El panel BDA solo muestra total y tabla diaria. Es viable graficar los mismos registros ya validados: por día para 7/30 y por mes para 90/365.
3. **MEA sin resumen por herramienta:** La tabla existente agrega por herramienta, formato y acción. Se puede añadir un resumen local (descargas, exportaciones y total) sin tocar la suma de datos.
4. **Fechas técnicas:** Las gráficas y las tablas presentan `YYYY-MM-DD` o `YYYY-MM`; resulta más legible `DD/MM/YYYY` y `MM/YYYY`, manteniendo el orden interno original.
5. **CSV:** Es posible exportar exclusivamente agregados ya consultados. Riesgos: datos expuestos tras cierre o cambio de cuenta; exportación antes de obtener respuesta válida; inyección de fórmulas; codificación regional; errores y solicitudes concurrentes. Se necesita exportación explícita con botones deshabilitados por defecto, datos en memoria temporal, guardas master/AAL2, invalidación al consultar/limpiar/error, filas normalizadas, cabeceras canónicas, UTF-8 BOM, punto y coma y escapado CSV.
6. **Accesibilidad:** La evolución nueva debe presentar fecha y cantidad exactas en texto y `aria-label`, sin confundir escala visual con porcentaje. Debe respetar estado vacío, contraste alto y móvil.
7. **Integración:** Los dos componentes limpian la interfaz y descartan respuestas atrasadas al cambiar de sesión. Esta propiedad debe conservarse.

## Decisión de implementación

**Dentro del alcance:** (a) gráfica diaria/mensual BDA, (b) resumen por herramienta MEA, (c) fechas visibles más comprensibles, (d) botones para exportar agregados CSV de cada módulo con el periodo seleccionado. Utilizar una pequeña utilidad compartida solo del panel para formateo de fechas y CSV.

**Fuera del alcance:** visitas, búsquedas, visualizaciones, descargas completadas, usuarios únicos, seguimiento individual, registros nuevos, consultas API nuevas, Supabase, permisos, autenticación, módulos públicos y cualquier otra pestaña.

## Criterios de aceptación

- Mismas cantidades y separación MEA/BDA, periodos existentes y orden cronológico anterior.
- BDA presenta barras con referencia numérica y salida vacía/errores bien diferenciados.
- MEA resumen por herramientas consistente con el detalle sin sumar doble.
- CSV sin datos personales, sin fórmulas ejecutables, descargado solo por acción del administrador autorizado tras una consulta válida.
- Reset ante nueva consulta, error, cierre, cuentas cambiadas y respuesta rezagada.
- Pruebas de escritorio/móvil, alto contraste, permisos, carreras, formato y seguridad de CSV; workflows aprobados antes de integrar.

**Limitación:** auditoría de código y contratos documentados; sin acceso a una sesión productiva autenticada para comprobar manualmente descargas.
