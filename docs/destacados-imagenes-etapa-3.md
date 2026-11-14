# EVA 2.0 - Recursos y herramientas destacadas - Etapa 3
Fecha de implementación: 13 de noviembre de 2026 (hora de Perú).
Repositorio intervenido: crebeucayali/accesos-complementarios.

## Alcance
Se habilitó en el formulario administrativo existente la selección de una imagen por recurso destacado, su vista previa local y el campo de descripción accesible (8-220 caracteres). Se mantiene como alternativa la URL institucional de imagen ya existente. El usuario Master con MFA AAL2 puede actualizar, sustituir o desvincular una imagen, sin eliminar automáticamente archivos históricos.

## Archivos intervenidos
- admin/destacados.js: validación y estado de imagen, verificación de perfil Master AAL2, carga Storage mediante API con x-upsert:false, asociación al guardar, comprobación de edición concurrente y reversión conservadora de cargas fallidas.
- admin/index.html: selector, ayuda, descripción accesible, vista previa y acción de desvinculación; caché JS v3.
- admin/admin.css: estilos delimitados exclusivamente a #panel-destacados; caché CSS v61.

## Integración
Bucket existente eva-publico; carpeta virtual destacados/ con extensión WebP/JPG/PNG y nombre único por recurso.
Máximo de archivo: 5 MB. No se crean buckets, tablas, políticas adicionales ni nuevas dependencias.
Se aprovecha imagen_url e imagen_alt de public.eva_recursos_destacados (etapa 2).
Las imágenes de GitHub continúan siendo compatibles.
Las URL de Supabase admitidas quedan restringidas a la carpeta destacados/.
No se modifica la portada pública en esta etapa; su lector de imágenes se integrará en la etapa 4.

## Seguridad y límites
El cliente verifica nuevamente los permisos Master AAL2 antes de subir; la política de Storage aplica la misma autorización a nivel de servidor.
Se evita UPSERT y se usa un nombre exclusivo para cada archivo. En caso de fallo posterior a la carga, se intenta eliminar solo el archivo nuevo después de comprobar que ningún registro lo referencia. Si no es posible confirmar la eliminación segura, el archivo permanece para revisión manual. Las imágenes antiguas no se eliminan automáticamente al reemplazarse o desvincularse.
No se alteran otras secciones administrativas, enlaces o repositorios CAP, BDA o MEA.

## Evidencias de verificación automatizada (simuladas)
- Compilación de JavaScript correcta; referencias de IDs en HTML completas; CSS específico del panel.
- Registro con carga de imagen y texto alternativo: confirmado en un simulador del formulario y de API.
- Sesión que no cumple el rol Master: intento rechazado antes de subir imagen.
- Fallo al registrar el recurso después de subir: eliminación del archivo nuevo simulado y ausencia de registro incompleto.

## Pendientes para el cierre funcional
- Prueba real desde una sesión administrativa Master AAL2: seleccionar imagen, guardar, comprobar la URL en Storage, editar, sustituir y desvincular.
- Comprobación visual del panel en navegador y celular y accesibilidad mediante teclado.
- Etapa 4: compatibilizar la portada pública destacados-eva.js con URL de Storage.
- Etapa 5 posterior e independiente: efecto de revelación al pasar el cursor.
