# EVA Recursos destacados - Corrección de confirmación de imágenes
Fecha: 13 de noviembre de 2026, hora de Perú.

## Incidencia observada
Se reportó que, al seleccionar una imagen para la tarjeta CAP "Segunda jornada de capacitación CREBE 2026", la vista previa era visible pero no aparecía confirmación junto al botón de guardado ni la imagen en la portada.

## Diagnóstico verificable
Consultas de solo lectura en Supabase confirmaron que `public.eva_recursos_destacados.imagen_url` seguía vacío para los cuatro registros y `storage.objects` no contenía objetos bajo `eva-publico/destacados/`. Por tanto, no se produjo una carga efectiva. La selección local no equivale a guardar la imagen.
El formulario mostraba errores únicamente en `destacados-mensaje` por encima del listado de tarjetas, lejos del botón. El campo `imagen_alt` requiere entre 8 y 220 caracteres para nuevas imágenes; faltando ese dato se detiene el guardado antes de transmitir el archivo. No se pudo constatar si el usuario omitió exactamente ese campo; es una causa posible, no una confirmación histórica.

## Correcciones
- `admin/destacados.js`: mensaje duplicado en `destacados-guardar-estado` inmediatamente debajo de Guardar; aviso de descripción accesible incompleta durante la selección; secuencia de mensajes Validando/Cargando/Asociando; detalle básico HTTP si Storage rechaza el archivo; confirmación del `imagen_url` y `imagen_alt` devueltos por la tabla antes de declarar éxito.
- `admin/index.html`: estatus accesible cercano a botones, `aria-describedby` y textos de publicación actualizados. Asset JS v4 y CSS v62.
- `admin/admin.css`: estilos de progreso, error y `aria-invalid` específicos del panel de destacados.

## Validación
Simulación de DOM y de API con siete comprobaciones de regresión aprobadas, incluidos cinco escenarios: descripción incompleta, éxito, usuario editor rechazado, denegación 403 de Storage y fallo de base de datos con limpieza del archivo sin vínculo. Sintaxis JS aprobada, IDs encontrados y versiones de caché actualizadas.

## Pendiente
Prueba real con Master MFA AAL2, seleccionando el archivo original y rellenando `imagen_alt`. Confirmar éxito cerca del botón, presencia en `eva-publico/destacados/`, asociación en `eva_recursos_destacados` y visualización en la portada. No se ejecutaron cargas reales en esta corrección ni se modificaron otros módulos de EVA.
