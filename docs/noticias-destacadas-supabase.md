# Noticias destacadas de la portada con Supabase

## Alcance

Esta integración afecta únicamente el bloque **Noticias destacadas** de la plataforma principal:

`https://crebeucayali.github.io/`

No migra ni modifica el módulo completo **Noti Inclusivos**.

## Tabla

Tabla principal:

`public.noticias_destacadas`

Campos:

- `orden`
- `categoria`
- `titulo`
- `descripcion`
- `imagen_url`
- `enlace_url`
- `visible`
- `origen`
- `created_at`
- `updated_at`

Los títulos se limitan a 140 caracteres y las síntesis a 350 caracteres para mantener un formato breve.

## Migración inicial

Se migraron las 5 noticias que ya existían en `noticias-destacadas.json`.

El archivo JSON y las noticias integradas en `main.js` continúan como respaldo técnico si Supabase no está disponible.

Si Supabase responde correctamente pero no existen noticias visibles, el bloque se oculta. En ese caso no se recuperan las noticias antiguas del respaldo.

## Página principal

`main.js` consulta primero Supabase.

Fuente activa:

```js
document.documentElement.dataset.noticiasFuente
```

Valores posibles:

- `supabase`
- `respaldo-json`
- `respaldo-integrado`

## Panel administrativo

Noticias destacadas aparece como una pestaña independiente del panel EVA.

Permite:

- crear;
- editar;
- ocultar;
- eliminar;
- seleccionar y subir una imagen destacada directamente a Supabase Storage.

Campos administrativos:

- categoría;
- título;
- síntesis breve;
- imagen opcional;
- enlace opcional;
- visibilidad.

La imagen puede conservar una referencia histórica de GitHub o cargarse desde el panel al bucket público `eva-publico`, dentro de `noticias/`. Las nuevas cargas admiten WebP, JPG/JPEG y PNG con un máximo de 5 MB. El archivo se sube únicamente con sesión administrativa autorizada y MFA AAL2.

Los recursos nuevos se agregan al final del carrusel según su orden.

## Seguridad

`anon`:

- solo SELECT de noticias visibles.

Administrador autorizado con MFA AAL2:

- SELECT;
- INSERT;
- UPDATE;
- DELETE;
- carga de imágenes en `eva-publico/noticias/`.

El bucket es público solo para lectura de los archivos. Las operaciones de escritura sobre Storage continúan protegidas mediante RLS y `private.es_admin_mfa()`.

Las operaciones administrativas se registran mediante `private.auditoria_administrativa`.

## Relación con Noti Inclusivos

El carrusel de portada funciona como espacio de información rápida y síntesis institucional.

Cuando una noticia necesite una ampliación, el campo `enlace_url` puede dirigir a una página interna del EVA, incluido Noti Inclusivos. El enlace es opcional.
