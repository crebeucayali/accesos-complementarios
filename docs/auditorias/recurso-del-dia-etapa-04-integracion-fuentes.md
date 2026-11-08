# Recurso del día - Etapa 04: integración BDA LSP y ARASAAC

Fecha: 8 de noviembre de 2026. Proyecto: EVA / CREBE.
Alcance exclusivo: selector gráfico de fuentes en la pestaña administrativa existente, sin activar publicación diaria.

## Funcionalidad implementada

1. La búsqueda de señas utiliza el JSON oficial del BDA en `https://crebeucayali.github.io/banco-digital-accesible/lsp/diccionario_lsp.json`. Se filtran entradas sin descripción, secuencias especiales no aptas para tarjeta individual y cuatro rutas faltantes detectadas en la auditoría de etapa 01.
2. El administrador busca por palabra y escoge manualmente un registro LSP. Se muestra fotografía, palabra, identificador y descripción de movimiento. El formulario recibe los metadatos originales y un enlace al BDA.
3. La búsqueda de pictogramas consulta `https://api.arasaac.org/api/pictograms/es/search/`, utiliza identificadores reales de resultados y permite seleccionar entre uno y tres pictogramas; muestra las imágenes de `static.arasaac.org`.
4. Al seleccionar pictogramas se preparan créditos visibles: Sergio Palao, ARASAAC, Gobierno de Aragón, CC BY-NC-SA 4.0 y los ID correspondientes; se incluye enlace a las condiciones de la licencia. La selección no se realiza por coincidencia automática ni crea nuevos recursos.
5. En LSP se conserva la procedencia MINEDU / BDA, pero no se inventa una licencia. El campo de licencia y referencia de autorización se mantienen vacíos hasta verificación.
6. Los controles de selección no marcan automáticamente `derechos_verificados` ni `revision_pedagogica`. El administrador debe realizar una validación documentada.
7. Al cambiar de LSP a ARASAAC o viceversa, se limpian campos y selección anteriores; los IDs e imágenes se escogen mediante el selector, no digitándolos libremente.
8. El formulario sigue admitiendo únicamente `borrador` o `retirado`. Las opciones `programado` y `publicado` siguen deshabilitadas. No se modificó ninguna tabla, vista ni política de Supabase.
9. Se actualizó la CSP del panel únicamente para consultar JSON de BDA, la API ARASAAC e imágenes de sus dominios oficiales, sin nuevas conexiones arbitrarias.

## Archivos modificados

- `admin/index.html`: buscador, lista de resultados y selección, CSP permitida para los dos orígenes, campos de identificación protegidos.
- `admin/recurso-dia-fuentes.js`: integración de fuentes con control de solicitudes, selección y vista previa.
- `admin/recurso-dia.js`: sincronización de selector con borradores y cambios de sesión.
- `admin/admin.css`: presentación responsive y alto contraste.
- `admin/tests/recurso-dia-etapa-04-browser.cjs`: prueba de selección controlada, licencias, derechos y ausencia de publicación.
- `admin/tests/recurso-dia-etapa-03-browser.cjs`: regresión de guardado adaptada a campos de solo lectura.
- `.github/workflows/recurso-dia-etapa-04.yml`: suite aislada de ambas etapas.

## Pruebas

Ejecutar suite Chromium en 1280, 768, 390 y 320 px con respuestas BDA y ARASAAC simuladas. Se verifica selección LSP válida, exclusión de rutas fallidas, tres pictogramas máximo, cambio de tipo, créditos, controles no aprobados y persistencia de borradores simulada. No se utiliza una cuenta administrativa real ni se escriben registros reales en Supabase.

La primera prueba de etapa 04 aprobó completamente; la regresión anterior se ajustó al nuevo comportamiento readonly y debe finalizar satisfactoria antes del cierre.

## Incidencias conocidas y condiciones

- Los derechos de reutilización de las imágenes de LSP **no están confirmados**. No mostrar estas imágenes en la portada hasta verificar licencia/autorización original. La vista previa administrativa no presupone esa autorización.
- No se realizó validación pedagógica individual de las futuras selecciones. El máximo de tres pictogramas no significa que siempre se requieran tres; por defecto se recomienda uno.
- La integración hace solicitudes públicas al cargar búsquedas; ante falla del servicio muestra un mensaje y no selecciona automáticamente recursos.
- El indicador administrativo de derechos exige respaldo verificable y revisión humana: no se marca automáticamente por presencia de la licencia ARASAAC.
- Etapa 05 pendiente: motor de publicación por fecha. Etapa 06 pendiente: ubicación y tarjeta pública. No ejecutar acciones de estas etapas ahora.
