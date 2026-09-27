# Galería dinámica con Supabase

## Alcance

La migración afecta únicamente la página:

`/recursos/galeria.html`

La Galería presenta fotografías y registros visuales dentro de la misma página. No crea páginas adicionales, fichas individuales ni nuevos subaccesos.

## Tabla

Tabla principal:

`public.galeria_items`

Campos:

- `orden`
- `fecha`
- `titulo`
- `descripcion`
- `imagen_url`
- `imagen_alt`
- `publicacion_autorizada`
- `visible`
- `origen`
- `created_at`
- `updated_at`

## Estado inicial

La página anterior contenía seis tarjetas de ejemplo con el texto **Imagen por subir**. Esas tarjetas no se migraron como evidencias reales.

La tabla inicia sin fotografías publicadas. Cuando no existen registros visibles, la página muestra un mensaje de estado en lugar de tarjetas ficticias.

## Visualización

Cada tarjeta muestra:

- fotografía;
- título;
- fecha opcional;
- descripción breve opcional.

Al pulsar la fotografía se abre un visor ampliado dentro de la misma página mediante un diálogo. No existe redirección hacia otra página.

## Panel administrativo

Galería aparece como una pestaña propia del panel EVA.

Permite:

- crear una tarjeta fotográfica;
- editarla;
- ocultarla;
- eliminarla.

Campos administrativos:

- fecha;
- título;
- descripción;
- imagen seleccionada desde el equipo;
- texto alternativo;
- confirmación de autorización de publicación;
- visibilidad.

## Autorización de publicación

Una tarjeta no puede guardarse con `visible = true` si:

`publicacion_autorizada = false`

La restricción se aplica tanto en el panel como en PostgreSQL.

Esta medida no reemplaza la evaluación institucional de los permisos, consentimientos o bases legales que correspondan a las personas que aparezcan en una fotografía.

## Fotografías

Las nuevas fotografías pueden cargarse directamente desde el Panel Administrativo en WebP, JPG/JPEG o PNG, con un máximo de 5 MB.

El flujo es:

1. seleccionar la imagen;
2. mostrar una vista previa local;
3. exigir texto alternativo;
4. comprobar sesión administrativa autorizada con MFA AAL2;
5. subir el archivo a `eva-publico/galeria/`;
6. guardar la URL pública en `galeria_items.imagen_url`;
7. mostrarla en la Galería pública.

Las imágenes históricas previamente alojadas en EVA/GitHub continúan siendo compatibles y no se migran ni eliminan automáticamente.

La página pública solo admite como imágenes externas de Storage las rutas bajo:

`https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/galeria/...`

La carga crea un objeto nuevo y no sobrescribe automáticamente fotografías anteriores.

## Seguridad

Público:

- SELECT solamente de tarjetas con `visible = true` y `publicacion_autorizada = true`.

Administrador autorizado + MFA AAL2:

- SELECT;
- INSERT;
- UPDATE;
- DELETE.

Todas las operaciones administrativas quedan sujetas a RLS y auditoría.

## Auditoría

El trigger:

`galeria_auditoria_admin`

registra INSERT, UPDATE y DELETE en:

`private.auditoria_administrativa`

## Fuente pública

La página utiliza:

`recursos/galeria-supabase.js`

El estado de carga queda disponible en:

```js
document.documentElement.dataset.galeriaFuente
```

Valores:

- `supabase`
- `error`


## Estado de validación de Storage

La integración técnica de Storage para Galería está implementada. Queda pendiente una prueba funcional real desde una sesión administrativa AAL2 antes de considerar cerrada esta etapa.


## Galerías por actividad

Cada actividad puede contener entre 1 y 5 fotografías. Las imágenes se registran en `public.galeria_item_imagenes`, relacionadas con `public.galeria_items`.

Cada fotografía conserva:

- orden dentro de la actividad;
- URL de imagen;
- texto alternativo propio.

La primera fotografía también se mantiene reflejada en `galeria_items.imagen_url` e `imagen_alt` para compatibilidad con registros y código histórico.

La página pública adapta automáticamente el mosaico según la cantidad de fotografías disponibles. Las fotografías adicionales no crean nuevas tarjetas ni nuevas actividades.
