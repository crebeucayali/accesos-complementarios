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

### Estado de validación

La infraestructura, RLS, restricciones de archivo, código del panel, CSP y resolución pública de imágenes quedaron implementados y verificados en código.

La prueba funcional con una carga real debe realizarse desde una sesión administrativa AAL2 en el navegador antes de extender Storage a Capacitaciones, Repositorio Accesible o Galería.
