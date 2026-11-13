# Cierre documentado: claridad de uso de recursos en el panel administrativo EVA

**Fecha:** 13 de noviembre de 2026 (Perú).  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Área única:** Panel administrativo > Seguimiento > Uso de recursos (`#panel-recursos-uso`).  
**Auditoría previa:** `docs/auditoria-panel-recursos-20261113.md`.  
**Rama de trabajo:** `audit-panel-recursos-claridad-20261113`.  
**Solicitud de revisión:** https://github.com/crebeucayali/accesos-complementarios/pull/37  
**Integración en main:** `0326b3206d2657322ca05d784457af43b5099b9a`.  
**Estado:** intervención de interfaz integrada; verificaciones automatizadas satisfactorias; validación humana autenticada pendiente de corroboración opcional.

## 1. Secuencia y justificación

La auditoría precedió a los cambios funcionales de interfaz y se registró en un commit independiente (`d950df520df445f27cc17bbf615479977487ac8a`). Encontró que los conteos y las separaciones MEA/BDA correspondían a sus eventos implementados, mientras ciertas etiquetas podían confundirse con usuarios, consultas generales o descargas finalizadas.

Se decidió mantener el modelo estadístico y aclarar exclusivamente la interpretación del panel. La modificación de interfaz se realizó después, en `de2d1b68d6d3403379f7bdc8e9aa545b435194b2`. La integración se efectuó tras aprobar los controles de MEA y BDA.

## 2. Cambios introducidos

- Encabezado general preciso: `Descargas y exportaciones de recursos`; identificador EVA en lugar de uno exclusivo de MEA.
- Sección MEA identificada y explicación de `descarga solicitada` y `exportación iniciada`.
- Contador MEA cambiado de `Herramientas utilizadas` a `Herramientas con acciones registradas`. No se modifica el cálculo.
- Actualización de etiquetas de periodo, botones y detalle para indicar si pertenecen a MEA o BDA.
- Gráfica MEA con mensaje explícito cuando no hay acciones; el aviso se oculta al cargar datos, al producirse un error y al limpiar la sesión.
- Subapartado BDA titulado `Solicitudes de descarga de imágenes LSP`; columna `Tipo de recurso` (no nombre de imagen).
- Texto explícito sobre privacidad y límites: no se cuentan búsquedas, visualizaciones, visitantes únicos ni guardados completados.
- Estilos nuevos restringidos mediante `#panel-recursos-uso` y actualizaciones de versión de CSS y JavaScript.
- Pruebas de regresión ampliadas para etiquetas, estado gráfico sin datos y límites de ambos componentes.

## 3. Verificaciones y evidencias

| Verificación | Resultado | Referencia |
| --- | --- | --- |
| Playwright MEA (escritorio y móvil simulado): cifras, periodos, vacío, errores, permiso, sesión, alto contraste y desbordamiento | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43459427372 |
| Playwright BDA (escritorio y móvil simulado): consulta, separación MEA, vacío, permiso, cambio de sesión, diseño y nuevas etiquetas | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43459427376 |
| Revisión de los archivos integrados en main: textos, gráfico vacío, estilos acotados, versión de recursos y auditoría | Conforme mediante inspección de contenidos | https://github.com/crebeucayali/accesos-complementarios/pull/37 |
| Revisión del conjunto de cambios de la PR | 5 archivos del panel y pruebas, más el acta de auditoría | https://github.com/crebeucayali/accesos-complementarios/pull/37/files |

La aprobación automatizada corresponde a los escenarios que ejecutan estos workflows. No se declara una prueba de usuario real, una descarga efectiva ni una revisión integral de Supabase en producción.

## 4. Inventario de archivos modificados

- `admin/index.html`
- `admin/admin.css`
- `admin/estadisticas-recursos.js`
- `admin/tests/estadisticas-recursos.browser.mjs`
- `admin/tests/estadisticas-bda-panel.browser.mjs`
- `docs/auditoria-panel-recursos-20261113.md` (documento previo)
- `docs/cierre-panel-recursos-claridad-20261113.md` (este cierre)

Los componentes `admin/admin.js` y `admin/estadisticas-bda.js` se inspeccionaron, pero no requirieron modificación.

## 5. Exclusiones expresas

- Sin cambios en Supabase, tablas, RPC, roles, MFA, filas, conteos históricos o método de agregación.
- Sin nuevas categorías de estadísticas, descargas, métricas, etiquetas de seguimiento público ni recopilación de datos personales.
- Sin cambios en MEA público, BDA público, RA, CAP, NI, DUA 3.0, la portada de EVA ni otras secciones del panel administrativo.
- No se reinician contadores ni se generan eventos sintéticos.

## 6. Dictamen y cierre

La intervención de claridad del panel queda **integrada y cerrada técnicamente** dentro de su alcance. Se conserva la arquitectura original de estadísticas de recursos y la independencia entre MEA y BDA. Para una constatación humana final, basta que un administrador autorizado abra Seguimiento > Uso de recursos, contraste los valores ya existentes y revise la legibilidad en su dispositivo; esa constatación no se considera realizada por este documento.

Cualquier ampliación futura de métricas o instrumentación constituye una intervención nueva y necesitará autorización expresa.
