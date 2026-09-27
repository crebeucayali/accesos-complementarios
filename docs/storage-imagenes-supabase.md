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

La Etapa 1C queda implementada técnicamente y pendiente de una prueba funcional real desde una sesión administrativa AAL2 antes de extender Storage al Repositorio Accesible.
