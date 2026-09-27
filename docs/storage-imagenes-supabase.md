# Storage institucional de imágenes EVA

## Etapa 1A — infraestructura base

Se preparó Supabase Storage para que, en una etapa posterior, el Panel Administrativo EVA pueda subir imágenes directamente sin pasar por GitHub.

### Bucket

- ID: `eva-publico`
- Acceso de lectura: público
- Tamaño máximo por archivo: 5 MB
- MIME permitidos:
  - `image/webp`
  - `image/jpeg`
  - `image/png`

### Carpetas funcionales admitidas

Las políticas de escritura solo permiten objetos bajo estos primeros segmentos:

- `noticias/`
- `capacitaciones/`
- `repositorio/`
- `galeria/`

Las carpetas son virtuales y aparecerán cuando el panel suba el primer archivo correspondiente.

### Seguridad de escritura

Las operaciones `INSERT`, `UPDATE` y `DELETE` sobre `storage.objects` para este bucket requieren:

1. sesión autenticada;
2. administrador autorizado;
3. MFA en nivel `aal2`;
4. ruta dentro de una de las carpetas funcionales admitidas.

La comprobación reutiliza `private.es_admin_mfa()`, la misma guardia del Panel Administrativo EVA.

La lectura pública se realiza mediante el bucket público; no se habilita escritura anónima.

### Etapa 1B — piloto en Noticias destacadas

Noticias destacadas es el primer módulo conectado al bucket.

El Panel Administrativo permite:

1. seleccionar una imagen WebP, JPG/JPEG o PNG;
2. validar el límite de 5 MB antes de transmitirla;
3. mostrar una vista previa local;
4. subir el archivo a `eva-publico/noticias/` usando la sesión administrativa;
5. guardar la URL pública resultante en `public.noticias_destacadas.imagen_url`;
6. mostrar la imagen desde Supabase Storage en el carrusel de la portada.

Las imágenes de noticias que ya están alojadas en GitHub **no se migran ni se eliminan** y continúan siendo compatibles. Al sustituir una imagen, el sistema crea un objeto nuevo; no sobrescribe ni elimina automáticamente el archivo anterior.

La portada solo admite como imagen externa de Storage la ruta pública específica:

`https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/noticias/...`

Los enlaces para ampliar noticias conservan su restricción al dominio del EVA.

### Estado de validación de 1B

Noticias destacadas fue validado con carga real desde el Panel Administrativo: la imagen se subió correctamente a Storage y se mostró desde la portada. También se incorporó validación previa de títulos duplicados para evitar subir archivos antes de detectar ese conflicto.

## Etapa 1C — Capacitaciones

Capacitaciones incorpora Storage únicamente para los recursos visuales que realmente lo necesitan:

- infografías de ambas jornadas;
- flyer solo en el espacio donde la plantilla pública ya lo contempla: primera jornada, sesión 1.

No se reintroducen flyers en la segunda jornada.

El Panel Administrativo permite seleccionar WebP, JPG/JPEG o PNG de hasta 5 MB, previsualizar la imagen y subirla a rutas organizadas como:

`eva-publico/capacitaciones/jornada-02/sesion-04/infografia-...`

Las URLs resultantes se guardan en los campos existentes `flyer_url` e `infografia_url`. Las rutas históricas `imagenes/...` continúan siendo compatibles y no se migran automáticamente.

PDF, videos, diapositivas y materiales complementarios conservan su integración actual con Google Drive/Docs; no se trasladan a Storage en esta etapa.

Las páginas de primera y segunda jornada solo aceptan como imágenes externas las rutas públicas específicas de `eva-publico/capacitaciones/`.

### Estado de validación de 1C

Capacitaciones fue validado con una carga real desde el Panel Administrativo: la infografía se subió correctamente a Storage y se visualizó en la jornada pública correspondiente.

## Etapa 1D — Repositorio Accesible

Repositorio Accesible incorpora Storage únicamente para la imagen de presentación de cada recurso.

El Panel Administrativo permite:

1. seleccionar WebP, JPG/JPEG o PNG de hasta 5 MB;
2. mostrar una vista previa local;
3. exigir texto alternativo cuando existe una imagen;
4. subir el archivo a una ruta organizada por categoría, por ejemplo:
   `eva-publico/repositorio/materiales_elaborados/...`;
5. guardar la URL pública resultante en `public.repositorio_recursos.imagen_url`;
6. mostrar la imagen desde Supabase Storage en la tarjeta pública del recurso.

Las imágenes históricas `assets/...` continúan siendo compatibles y no se migran automáticamente.

Los archivos descargables o enlaces externos del Repositorio no se trasladan a Storage en esta etapa. El bucket sigue limitado a imágenes institucionales públicas.

La página pública solo acepta como imagen externa la ruta específica `eva-publico/repositorio/`.

### Estado de validación de 1D

Repositorio Accesible fue validado con una carga real desde el Panel Administrativo: la imagen se subió correctamente a Storage y se visualizó en la tarjeta pública correspondiente.


## Etapa 1E — Galería

Galería incorpora Storage para las fotografías institucionales publicadas en `recursos/galeria.html`. Cada actividad puede reunir entre 1 y 5 fotografías dentro de una sola tarjeta.

El Panel Administrativo permite:

1. seleccionar de 1 a 5 fotografías WebP, JPG/JPEG o PNG de hasta 5 MB cada una;
2. mostrar una vista previa de todas las fotografías;
3. exigir texto alternativo individual para cada imagen;
4. mantener una confirmación explícita de autorización de publicación para la actividad;
5. subir los archivos a rutas organizadas bajo `eva-publico/galeria/`;
6. registrar la colección en `public.galeria_item_imagenes` y mantener la primera fotografía reflejada en `public.galeria_items` por compatibilidad;
7. mostrar las fotografías en un mosaico que se adapta automáticamente a la cantidad disponible y permite ampliarlas individualmente.

Las referencias históricas `imagenes-galeria/...`, `imagenes-calendario/...` y las URLs HTTPS ya admitidas de `crebeucayali.github.io` continúan siendo compatibles y no se migran automáticamente.

La página pública solo acepta como imagen externa de Storage la ruta específica `eva-publico/galeria/`.

La escritura mantiene la misma guardia: administrador autorizado y MFA AAL2. Las reglas de autorización institucional de la fotografía siguen vigentes y son independientes del lugar donde se almacena el archivo.

### Estado de validación de 1E

La Etapa 1E está implementada técnicamente y pendiente de una prueba funcional real desde una sesión administrativa AAL2.
