# Cierre operativo de estadísticas de descargas BDA: imágenes LSP

**Fecha del cierre:** 10 de noviembre de 2026, hora de Perú.  
**Entidad:** CREBE "Señor de los Milagros", Ucayali.  
**Sistema:** Ecosistema Virtual Accesible (EVA).  
**Módulo:** Banco Digital Accesible (BDA).  
**Estado:** cierre operativo del primer circuito de registro y consulta administrativa de descargas solicitadas de imágenes de Lengua de Señas Peruana (LSP), en el alcance descrito aquí.

## 1. Objeto y alcance

Se implementó y validó el seguimiento agregado del enlace «Descargar imagen original» en el visor LSP del Banco Digital Accesible. El diccionario consultado contenía 1118 registros de imágenes PNG en el momento de la implementación.

La categoría de evento admitida es `lsp/png/descarga_solicitada`. Abrir una imagen, buscar una palabra, consultar una ficha o cerrar el visor no se contabilizan como descarga. La Biblioteca Accesible, enlaces externos y otras funciones de BDA permanecen fuera de este alcance.

## 2. Arquitectura entregada

- BDA: `estadisticas/recursos-bda.js` registra la solicitud al pulsar el enlace de descarga PNG; `lsp/visor-senas.js` conserva la descarga incluso si el servicio de estadísticas falla.
- Supabase: tablas privadas `eva_recursos_api.bda_acciones_diarias` y `eva_recursos_api.bda_eventos_recientes` con conteo por fecha de Perú, herramienta, formato y acción, y deduplicación temporal por identificador UUID.
- API de registro: `public.registrar_accion_recurso_bda` con validación de la única combinación autorizada.
- Consulta administrativa: `public.admin_estadisticas_recursos_bda(p_dias)`, con control del lado del servidor para master y MFA AAL2.
- Panel EVA: bloque «Banco Digital Accesible (BDA) / Descargas de imágenes LSP» dentro de «Seguimiento > Uso de recursos», con filtros de 7, 30, 90 y 365 días y tabla de solicitudes por fecha.
- Independencia: BDA, MEA y contadores de visitas EVA conservan sus agregados propios, sin sumarse ni confundirse.

## 3. Evidencia verificada en producción

El responsable del sistema comunicó que realizó una descarga PNG de la seña correspondiente a la búsqueda «matrimonio». Posteriormente compartió dos capturas del panel administrativo en teléfono móvil, donde se observó:

1. MEA: 1 acción de descarga solicitada de pictogramas PNG.
2. BDA: 1 acción de descarga solicitada de LSP PNG, con fecha 2026-11-10 y el periodo seleccionado «Últimos 30 días».
3. Indicadores, controles y tablas visibles en la versión móvil, sin desbordamiento horizontal apreciable en la región mostrada.

La comprobación directa, en modo solo lectura, de Supabase durante este cierre corroboró `fecha=2026-11-10`, `herramienta=lsp`, `formato=png`, `accion=descarga_solicitada` y `total=1`. El registro temporal de deduplicación tenía una clave. MEA conservó su acción previa, sin variación.

La palabra «matrimonio» fue comunicada por el responsable como referencia de la prueba y **no** es un dato almacenado en la estadística. Las capturas aportadas en la conversación se consideraron evidencia visual humana, pero no se incorporan como imágenes al repositorio por contener elementos de una sesión administrativa y porque esta acta consigna sus hallazgos suficientes sin reproducir su interfaz privada.

## 4. Validaciones técnicas previas

- BDA visor y cliente: PR https://github.com/crebeucayali/banco-digital-accesible/pull/8. Pruebas Chromium en escritorio y vista móvil simulada, descarga PNG real en navegador con RPC simulado, un único evento al pulsar descarga, ninguno al ampliar o cerrar, tolerancia a error HTTP de seguimiento.
- Backend y privacidad: PR https://github.com/crebeucayali/accesos-complementarios/pull/30. PostgreSQL temporal: idempotencia por UUID, validación de formato/herramienta, fecha `America/Lima`, denegación de consulta sin la autorización correspondiente y aislamiento respecto de las cifras MEA.
- Visualización administrativa: PR https://github.com/crebeucayali/accesos-complementarios/pull/31. Pruebas Chromium de estados con y sin datos, roles no autorizados, limpieza de sesión, respuesta rezagada y visualización móvil. Regresiones del panel MEA satisfactorias.
- Resultados publicados: https://github.com/crebeucayali/accesos-complementarios/actions/runs/42955340856, https://github.com/crebeucayali/banco-digital-accesible/actions/runs/42955345816, https://github.com/crebeucayali/accesos-complementarios/actions/runs/42956878631 y https://github.com/crebeucayali/accesos-complementarios/actions/runs/42956878599.

## 5. Privacidad y significado de las cifras

Se contabilizan solicitudes de descarga, no la finalización garantizada del guardado ni personas únicas. El envío no contiene la palabra consultada, nombre de archivo, imagen ni identidad del visitante. La UUID efímera permite evitar duplicaciones técnicas de una misma solicitud. Las tablas carecen de lectura pública directa; la consulta administrativa requiere autorización master y MFA AAL2.

La base estadística representa la demanda de uso de la función, no evidencia de aprendizaje, calidad pedagógica ni apropiación de los materiales.

## 6. Comprobaciones complementarias

No consta validación humana completa del panel desde una computadora, de todos los filtros temporales, de la lectura con tecnologías de asistencia ni del cierre de sesión observado por el responsable. No se identificó una incidencia funcional en las capturas suministradas. Estos aspectos quedan como verificaciones complementarias y no se declaran aprobados.

La implementación futura de seguimiento para otros recursos de BDA deberá pasar por inventario, consentimiento/información de privacidad según corresponda, pruebas de registro y contraste de acciones genuinas. La Biblioteca Accesible y sus enlaces externos no deben confundirse con descargas locales LSP.

## 7. Decisión y continuidad

**Se declara cerrado operativamente el alcance inicial de estadísticas de BDA para solicitudes de descarga PNG de imágenes LSP.** La decisión se apoya en la confirmación de descarga, el registro agregado verificado en Supabase y su visualización en la sesión administrativa móvil, respaldados por pruebas automatizadas.

El cierre es exclusivamente documental. No modifica tablas, migraciones, funciones, permisos ni contadores históricos. Se conserva MEA como módulo independiente ya cerrado en su propio alcance.

Como siguiente intervención, puede prepararse el inventario de posibles acciones de descarga de otros recursos de BDA antes de ampliar el seguimiento.
