# Cierre técnico y documental: Uso de recursos, etapa 2

**Fecha:** 13 de noviembre de 2026 (Perú).  
**Sistema:** EVA, CREBE "Señor de los Milagros" - Ucayali.  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Alcance único:** Panel administrativo > Seguimiento > Uso de recursos (`#panel-recursos-uso`).  
**Auditoría previa:** `docs/auditoria-uso-recursos-etapa2-20261113.md`, commit `a386db49a89175cab0827e98eb7df36cf01a986e` (anterior a las modificaciones).  
**Rama de trabajo:** `mejora-uso-recursos-etapa2-20261113`.  
**Revisión e integración:** https://github.com/crebeucayali/accesos-complementarios/pull/40  
**Merge a main:** `e56f7e9cd4478b2b80f1187de5d3d0c1ef9a018c`.  
**Estado:** integrado y comprobado por los workflows automatizados; constatación visual por administrador en producción pendiente.

## 1. Secuencia realizada

Se revisaron previamente contratos de datos, interfaz, cálculos, controles de acceso, eventos, riesgos de seguridad CSV y pruebas existentes. La auditoría se guardó antes de crear las funcionalidades de etapa 2. Se desarrolló en una rama separada, se añadió y verificó una utilidad común para fechas y CSV, se extendieron pruebas Playwright MEA y BDA, y se integró a `main` únicamente al resultar satisfactorios tres workflows.

## 2. Funciones nuevas

### MEA
- Resumen por herramienta a partir de las filas ya consultadas, con columnas de descargas solicitadas, exportaciones iniciadas y total.
- Sumas agrupadas solo en el navegador, utilizando los mismos registros agregados y nombres de herramienta autorizados.
- Fechas `DD/MM/YYYY` y periodos mensuales `MM/YYYY` en la evolución, sin cambiar el orden cronológico.
- Botón `Descargar CSV de MEA`, habilitado solamente para una consulta válida con registros. Columnas: Fecha, Herramienta, Formato, Acción y Cantidad.

### BDA
- Gráfica de solicitudes LSP/PNG diaria (7/30 días) o mensual (90/365 días), con escala de cantidades y valores visibles, no porcentajes.
- Estados vacíos explícitos, leyenda de escala y limpieza ante errores/cierre/cambio de sesión.
- Tabla con fechas en `DD/MM/YYYY`, manteniendo la suma, el orden cronológico inverso y el tipo de recurso original.
- Botón `Descargar CSV de BDA`, con Fecha, Tipo de recurso y Solicitudes.

### Compartido y seguridad
- `admin/estadisticas-uso-util.js` proporciona formato local de fechas y exportación CSV voluntaria. No agrega solicitudes de red ni almacenamiento persistente.
- CSV con UTF-8 BOM, separador punto y coma, saltos CRLF, protección preventiva contra fórmulas y nombre de archivo que identifica módulo, periodo y fecha de exportación.
- Los botones CSV permanecen deshabilitados antes de una consulta autorizada, mientras cambia el periodo, sin registros, con errores y tras limpiar/cambiar la sesión. Las respuestas obsoletas no deben repoblar datos.
- No se altera la autorización existente `master` con MFA `aal2`, ni las consultas RPC de MEA y BDA.

## 3. Validaciones

| Workflow | Resultado | Evidencia |
| --- | --- | --- |
| MEA: resumen por herramienta, totales, evolución, fechas, descarga CSV, celdas seguras, estados vacíos, permisos y sesiones, escritorio/móvil | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43466327079 |
| BDA: gráfico diario/mensual, fecha, total, descarga CSV real de prueba, vacío, bloqueo, cambio de sesión, escritorio/móvil | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43466327054 |
| Cabecera y portada administrativa, regresiones de adaptabilidad | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43466327056 |
| Comprobación de archivos integrados en main: ids, orden de scripts, utilidad compartida, permisos y auditoría | Conforme por inspección del repositorio | https://github.com/crebeucayali/accesos-complementarios/pull/40/files |

Las pruebas emplearon datos simulados para verificar funcionalidades en Chromium. No certifican los valores reales de producción, la efectiva recepción de archivos de terceros ni una sesión administrativa autenticada en un navegador del usuario.

## 4. Inventario de archivos modificados

- `admin/index.html`.
- `admin/admin.css`.
- `admin/estadisticas-recursos.js`.
- `admin/estadisticas-bda.js`.
- `admin/estadisticas-uso-util.js` (nuevo).
- `admin/tests/estadisticas-recursos.browser.mjs`.
- `admin/tests/estadisticas-bda-panel.browser.mjs`.
- `.github/workflows/validar-panel-recursos-mea.yml`.
- `.github/workflows/validar-panel-bda.yml`.
- `docs/auditoria-uso-recursos-etapa2-20261113.md`.
- `docs/cierre-uso-recursos-etapa2-20261113.md` (este documento).

## 5. Límites y preservación

No se realizaron cambios en Supabase, SQL, RPC, eventos del repositorio público, perfiles, MFA, autenticación, datos históricos, políticas de privacidad, módulos de EVA, otras pestañas del panel ni sistemas externos. Los indicadores no representan usuarios únicos, consultas de imágenes, visitas o descargas completadas.

## 6. Dictamen final

La etapa 2 queda **cerrada técnicamente e integrada en main**, con validaciones automáticas satisfactorias. Se conserva la arquitectura de conteos y la independencia entre MEA/BDA. **Actualización 13/11/2026:** la presentación visual quedó conforme a partir de una captura posterior remitida por el responsable. Posteriormente, el responsable remitió ambos CSV y se verificaron su estructura, codificación y totales. La apertura visual en Microsoft Excel sigue sin constatarse. Véase `docs/validacion-csv-uso-recursos-etapa2-20261113.md`.

Cualquier incorporación futura de eventos, visitas, consultas de recursos o nuevas categorías estadisticas requerirá una auditoría y autorización independientes.


## 7. Validación visual posterior

La constatación realizada con la captura del 13 de noviembre documentó la distribución separada de MEA y BDA, la coherencia visible de los indicadores y el resumen por herramienta, las escalas de las dos gráficas, el formato de fechas y la presencia de los botones CSV. El resultado fue **conforme en el alcance visual comprobable**.

El responsable aportó los dos CSV generados para el periodo de 30 días y se comprobaron encabezados, codificación UTF-8 con BOM, separador `;`, fechas, filas y totales (MEA 1; BDA 11). Se acredita que ambos archivos fueron generados y recuperados. Sigue pendiente confirmar su apertura y presentación en Microsoft Excel en el dispositivo del responsable; tampoco se equiparan las pruebas automáticas de cambio de periodo y cierre de sesión con una verificación humana. Véase `docs/validacion-csv-uso-recursos-etapa2-20261113.md`.
