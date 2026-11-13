# Auditoría previa: etapa 1 de presentación de Uso de recursos

**Fecha:** 13 de noviembre de 2026 (Perú).  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Rama base y SHA auditado:** `main` / `d8997c8d0ad958aab6f73687f4a20b9824c79569`.  
**Alcance:** solamente `admin/index.html` dentro de `#panel-recursos-uso`, sus estilos locales en `admin/admin.css`, el gráfico de MEA en `admin/estadisticas-recursos.js`, y sus pruebas. Sin cambios en el registro público, consultas RPC, permisos, base de datos o otras pantallas.

## Estado previo y evidencias

- La sección está conformada por una sola tarjeta principal con bloques contiguos de MEA y BDA y textos explicativos siempre visibles.
- Los cuatro indicadores MEA derivan de la suma de eventos y herramientas con acciones, mientras BDA cuenta solicitudes `lsp/png/descarga_solicitada`. Los cálculos coinciden con el alcance anterior documentado.
- La longitud de la barra MEA es `total / máximo observado`: cuando solo existe una acción, esta ocupa el 100 % de la pista, sin leyenda que explique que es una escala relativa y no un porcentaje de uso.
- Los estados vacíos y de error de MEA, las fechas y agregados, la protección `master` con MFA AAL2, la separación entre RPC MEA y BDA y la limpieza ante cambio/cierre de sesión ya tienen pruebas Playwright.
- En la captura del 13 de noviembre se observa un bloque BDA inmediatamente después del detalle MEA, etiquetas compactas y abundante texto introductorio; no se observa una falla de conteo.

## Riesgos que deben mitigarse

1. Evitar cambios globales de estilos que alteren otras pestañas administrativas.
2. Conservar la accesibilidad del texto explicativo mediante `details`/ `summary` con control de teclado nativo.
3. No convertir la barra relativa del gráfico en porcentaje; mostrar una referencia numérica de escala y la cantidad exacta.
4. No alterar las cantidades de MEA/BDA, los filtros de 7/30/90/365 días ni la agrupación temporal.
5. Mantener la lectura móvil, el alto contraste y la limpieza al cerrar sesión.

## Decisión

La etapa 1 solo reestructura visualmente en dos bloques reconocibles (MEA y BDA), reduce la información introductoria visible sin suprimir explicaciones, aumenta legibilidad local y agrega una referencia de escala a la evolución MEA. Se excluye la gráfica de BDA, el CSV, nuevos eventos y nuevos indicadores porque corresponden a otra etapa.

## Criterios de aceptación

- Cabecera clara para MEA y BDA, explicaciones desplegables, selección y actualización conservadas.
- Cifra de una acción MEA representada en escala numérica de al menos cinco acciones, sin prometer porcentajes.
- Texto accesible en escritorio y móvil y sin desbordamiento horizontal de página.
- Playwright MEA y BDA aprobado en escenarios de muestra, vacío, error, permisos, sesiones y alto contraste.
- Integración tras comprobaciones de CI y cierre documentado independiente.

**Tipo de auditoría:** revisión de código y evidencia visual remitida. No implica inspección de la sesión administrativa privada ni lectura directa de Supabase en producción.
