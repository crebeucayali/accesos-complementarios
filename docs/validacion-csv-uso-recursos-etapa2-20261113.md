# Verificación de archivos CSV de Uso de recursos, etapa 2

**Fecha:** 13 de noviembre de 2026 (Perú).  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Ámbito:** evidencia funcional del apartado administrativo `Seguimiento > Uso de recursos`.  
**Origen:** dos archivos CSV compartidos por el responsable tras las pruebas visuales de la etapa 2. No se publican aquí los archivos descargados; solo sus resultados de verificación.

## 1. Archivos analizados

| Archivo | Bytes | Encabezados | Filas de datos | Total |
| --- | ---: | --- | ---: | ---: |
| `EVA-MEA-uso-recursos-ultimos-30-dias-2026-11-13.csv` | 117 | Fecha; Herramienta; Formato; Acción; Cantidad | 1 | 1 |
| `EVA-BDA-uso-recursos-ultimos-30-dias-2026-11-13.csv` | 107 | Fecha; Tipo de recurso; Solicitudes | 2 | 11 |

**Contenido MEA:** `10/11/2026; Pictogramas; PNG; Descarga solicitada; 1`.

**Contenido BDA:**
- `13/11/2026; LSP · PNG; 10`
- `10/11/2026; LSP · PNG; 1`

## 2. Verificaciones efectivas del contenido binario

- Los dos CSV pudieron leerse directamente a partir de los archivos facilitados por el responsable.
- UTF-8 válido con marca BOM inicial en ambos archivos.
- Separador punto y coma, encabezados correctos y anchura consistente (MEA 5 campos por fila; BDA 3).
- Saltos de línea CRLF: dos en MEA y tres en BDA; ningún LF suelto.
- Fechas en formato `DD/MM/YYYY`.
- Sumas verificadas: MEA `1` y BDA `10 + 1 = 11`; coinciden con los indicadores visibles en la última captura.
- No aparecen celdas con fórmulas ejecutables ni campos de identidad personal en estos archivos.

## 3. Dictamen y precisión

**Conforme:** generación y recuperación de ambos archivos CSV, integridad estructural y de codificación, y coincidencia estadística con la captura disponible.

**Constatación humana posterior (13/11/2026):** tras la pregunta concreta sobre si los dos CSV se abrían correctamente en Excel, con sus columnas y datos sin alteraciones, el responsable respondió: "Sí se visualiza correctamente". Se registra esta comprobación como una confirmación del responsable, distinta de la revisión automática de los archivos, que no abrió Excel directamente. El cambio de periodo y el bloqueo de exportación tras cerrar sesión continúan cubiertos por pruebas automatizadas; no se declara una verificación manual independiente de esos escenarios.

No se requirieron ni realizaron modificaciones de código, Supabase o estadísticas para esta comprobación.
