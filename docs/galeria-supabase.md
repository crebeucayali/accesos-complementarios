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
- ruta o URL de imagen;
- texto alternativo;
- confirmación de autorización de publicación;
- visibilidad.

## Autorización de publicación

Una tarjeta no puede guardarse con `visible = true` si:

`publicacion_autorizada = false`

La restricción se aplica tanto en el panel como en PostgreSQL.

Esta medida no reemplaza la evaluación institucional de los permisos, consentimientos o bases legales que correspondan a las personas que aparezcan en una fotografía.

## Fotografías

En esta etapa Supabase no almacena los archivos fotográficos.

`galeria_items.imagen_url` referencia imágenes previamente publicadas en el EVA/GitHub, por ejemplo:

```text
imagenes-galeria/actividad-01.webp
imagenes-calendario/25-09.webp
```

También se admiten URL HTTPS del dominio `crebeucayali.github.io`.

No se habilita Supabase Storage para fotografías en esta fase.

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
