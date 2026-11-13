# Constatación visual de la etapa 2: Uso de recursos

**Fecha:** 13 de noviembre de 2026 (Perú).  
**Sistema:** EVA, CREBE "Señor de los Milagros" - Ucayali.  
**Área:** Panel administrativo > Seguimiento > Uso de recursos.  
**Evidencia:** captura de pantalla facilitada por el responsable tras integrar la PR #40. La imagen se revisó en conversación; no se copia al repositorio.  
**Cierre técnico previo:** `docs/cierre-uso-recursos-etapa2-20261113.md`.

## 1. Resultado visual observado

| Elemento | Evidencia visible | Resultado |
| --- | --- | --- |
| Separación MEA / BDA | Dos paneles diferenciados por encabezado y borde de color | Conforme en la captura |
| MEA: indicadores | Una acción, una descarga solicitada, cero exportaciones, una herramienta | Coherente entre indicadores y detalle visible |
| MEA: resumen por herramienta | Pictogramas; una descarga, cero exportaciones, total uno | Coherente con indicador global |
| MEA: evolución | Una barra, cantidad exacta uno, escala de 0 a 5 | Conforme; no representa porcentaje de usuarios |
| BDA: solicitudes | Total 11; detalle de dos fechas con valores 10 y 1 | Coherente con total |
| BDA: gráfica | Dos barras diferenciadas, escala de 0 a 10 solicitudes, con números visibles | Conforme |
| Fechas | Formato DD/MM/YYYY en evolución y tabla, por ejemplo 13/11/2026 | Conforme |
| CSV | Botones `Descargar CSV de MEA` y `Descargar CSV de BDA` visibles | Presencia visual conforme; operación no probada con la captura |
| Estructura y legibilidad general | No se observan cortes, superposiciones ni desplazamiento horizontal dentro del área mostrada | Conforme en el ámbito de la imagen |

La imagen es una captura reducida; no acredita por sí sola legibilidad en el tamaño físico habitual ni funcionamiento en todas las resoluciones.

## 2. Qué valida esta constatación

La presentación final de la etapa 2 y la coherencia aritmética de los valores **visibles** en la captura. Es una evaluación visual, no una auditoría de filas productivas ni una prueba funcional de descarga.

## 3. Validación manual funcional restante

Una sesión autorizada puede realizar esta comprobación sin cambiar código:

1. En el módulo MEA, con el periodo que muestre datos, pulsar `Descargar CSV de MEA`.
2. Confirmar que el navegador descarga un archivo con el prefijo `EVA-MEA-uso-recursos-ultimos-` y extensión `.csv`. Abrirlo en Excel con UTF-8 y separador punto y coma si no se interpretan las columnas automáticamente.
3. Verificar encabezados `Fecha;Herramienta;Formato;Acción;Cantidad` y correspondencia de los totales con la tabla del panel.
4. Repetir para BDA, encabezados `Fecha;Tipo de recurso;Solicitudes`; confirmar que la suma de solicitudes del CSV coincide con el indicador BDA.
5. Cambiar el periodo y comprobar que la nueva descarga, si contiene datos, refleja solo el periodo seleccionado. Cuando no hay acciones, el CSV debe permanecer deshabilitado.
6. Cerrar sesión y comprobar que no queda disponible la exportación.

Los valores concretos mostrados en la captura (MEA 1; BDA 11) pueden cambiar al producirse nuevos eventos. Deben compararse con los indicadores vigentes al momento de la prueba, no con la captura histórica.

## 4. Dictamen

**Etapa 2: validación visual conforme y pruebas automatizadas previamente aprobadas**. No se recomiendan modificaciones adicionales del diseño por la imagen revisada. **La entrega de ambos CSV y su correcta apertura en Microsoft Excel quedaron confirmadas posteriormente por el responsable.** Véase `docs/validacion-csv-uso-recursos-etapa2-20261113.md`. Las verificaciones de otros periodos y cierre de sesión se mantienen como automatizadas, no como pruebas humanas.

No se modificó lógica, base de datos, permisos, archivos públicos ni estadísticas como parte de esta constatación. No se inicia una nueva etapa ni se propone añadir eventos sin autorización.
