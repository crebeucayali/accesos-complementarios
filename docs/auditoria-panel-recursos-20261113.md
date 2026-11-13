# Auditoría previa: panel administrativo > Seguimiento > Uso de recursos

**Fecha:** 13 de noviembre de 2026 (Perú).  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Referencia de partida:** `76edbe44c030b53288cbea49f1442c8dda7e6d09` (`main`).  
**Tipo:** revisión estática del código, de las pruebas y de la documentación anterior; no sustituye la validación con sesión administrativa real.  
**Alcance autorizado:** exclusivamente la presentación y las pruebas del apartado `#panel-recursos-uso`, que contiene MEA y BDA.

## 1. Fuentes verificadas

- `admin/index.html`: marcado de Seguimiento > Uso de recursos.
- `admin/estadisticas-recursos.js`: resumen MEA, periodos, validación de filas, gráfica y detalle.
- `admin/estadisticas-bda.js`: solicitudes PNG LSP y detalle por fecha.
- `admin/admin.js`: menú, permisos y consultas RPC mediante sesión autenticada.
- `admin/admin.css`: disposición, estados, contraste y diseño móvil.
- `admin/tests/estadisticas-recursos.browser.mjs`, `admin/tests/estadisticas-bda-panel.browser.mjs` y workflows respectivos.
- `docs/cierre-operativo-estadisticas-mea-20261110.md`, `docs/cierre-operativo-estadisticas-bda-lsp-20261110.md` y `docs/acta-cierre-alcance-estadisticas-descargas-eva-20261111.md`.

## 2. Hallazgos y riesgos

| Aspecto | Evidencia | Dictamen |
| --- | --- | --- |
| MEA y BDA | Cada módulo consulta su RPC específico y presenta acumulados separados | Conservar sin cambios |
| Cálculo MEA | Total de acciones; exportaciones; descargas = total menos exportaciones; herramientas distintas con acciones positivas | El cálculo corresponde a los tipos de evento previstos |
| Cálculo BDA | Suma de `lsp/png/descarga_solicitada` por día | Coherente con el alcance |
| Permisos | Acceso `master` con MFA `aal2`; consulta privada controlada en servidor | No modificar |
| Privacidad | No se obtiene identidad, búsqueda, nombre de imagen ni descarga consumada | Conservar y explicar mejor |
| Sesión | Versionado de solicitudes y limpieza ante cierre/cambio de cuenta | Conservar |
| Semántica | `Herramientas utilizadas` sugiere uso general; el contador solo refleja herramientas con acciones registradas | Corregir etiqueta |
| Encabezados | `Uso de recursos educativos` abarca MEA y BDA, pero solo aparece el identificador MEA | Separar visual y textualmente ambos ámbitos |
| Gráfica MEA | Con cero filas, la gráfica queda sin contenido explicativo | Incorporar mensaje vacío sin datos simulados |
| Tabla BDA | Columna `Recurso` contiene `LSP · PNG` y no identifica imágenes individuales | Cambiar a `Tipo de recurso` |
| Botones | `Actualizar recursos` puede parecer actualización de contenidos o de ambos módulos | Precisar que consulta solo estadísticas MEA |
| Pruebas | Ya existen escenarios de escritorio, móvil simulado, respuesta vacía, error, permisos y sesión | Ampliar aserciones sobre nuevas etiquetas y estado vacío |

## 3. Decisión de intervención

La intervención será **exclusivamente de claridad de interfaz y pruebas de regresión**, sin cambiar fórmulas, rangos temporales, RPC, tablas, registros, conteos históricos, seguridad, módulos públicos ni otros apartados administrativos.

Aplicar textos claros sobre acciones de descarga y exportación, mantener explícita la independencia MEA/BDA, precisar indicadores y cabeceras, e informar cuando la gráfica no tenga registros. Conservar el gráfico, la tabla, la accesibilidad y el diseño adaptable.

## 4. Criterio de aceptación

1. Etiquetas consistentes con el evento medido, sin afirmar usuarios únicos ni descargas completadas.
2. Igualdad de resultados antes y después en los escenarios de prueba (MEA 1 solicitud PNG, BDA 1 solicitud LSP PNG, mezcla de categorías, ausencia de registros).
3. Continuidad de controles de acceso, protección contra respuestas rezagadas, limpieza de sesión y estados de error.
4. Pruebas automatizadas de MEA y BDA en escritorio y móvil simulado, incluido alto contraste y ausencia de desbordamiento.
5. Verificación de archivos modificados limitada a `admin/index.html`, `admin/admin.css`, `admin/estadisticas-recursos.js`, pruebas del apartado y documentación de auditoría/cierre.

## 5. Límites de la auditoría

No se verificó la base de datos productiva con una sesión master ni la acción de descargar un archivo real. La auditoría previa comprueba contratos y comportamiento descrito en código y pruebas existentes; la validación automatizada posterior debe registrarse en un cierre independiente. No se inventarán resultados de ejecución.
