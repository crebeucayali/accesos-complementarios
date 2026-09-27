# Repositorio Accesible con Supabase

## Objetivo

Repositorio Accesible utiliza Supabase como fuente principal para los recursos que aparecen en sus tres categorías públicas:

- Materiales disponibles.
- Equipos tecnológicos.
- Materiales elaborados.

La estructura visual de las tres secciones se conserva. Supabase administra los elementos que aparecen dentro de cada categoría.

## Tabla

Tabla principal:

`public.repositorio_recursos`

Campos principales:

- `categoria`
- `orden`
- `titulo`
- `descripcion`
- `imagen_url`
- `imagen_alt`
- `visible`
- `origen`
- `created_at`
- `updated_at`

Las categorías admitidas son:

```text
materiales_disponibles
equipos_tecnologicos
materiales_elaborados
```

## Migración inicial

Se migraron 21 recursos existentes desde el HTML:

- 4 materiales disponibles;
- 3 equipos tecnológicos;
- 14 materiales elaborados.

El HTML original se mantiene como respaldo local. Si Supabase no responde, la página conserva el contenido estático previo.

## Página pública

El archivo:

`repositorio-supabase.js`

consulta únicamente recursos con:

`visible = true`

y reconstruye las listas de cada categoría.

El documento expone la fuente activa mediante:

```js
document.documentElement.dataset.repositorioFuente
```

Valores previstos:

- `supabase`
- `respaldo-local`

## Panel administrativo

Repositorio Accesible aparece como tercera pestaña del panel administrativo EVA.

Desde el panel se puede:

- crear un recurso;
- seleccionar cualquiera de las tres categorías;
- editar título y descripción;
- definir una imagen opcional y su texto alternativo;
- controlar su visibilidad;
- eliminar un recurso.

Los nuevos recursos se agregan al final de la categoría seleccionada.

## Eliminación

A diferencia de Capacitaciones y Calendario, Repositorio Accesible permite eliminación real desde el panel.

La operación exige:

1. cuenta administrativa autorizada;
2. sesión Supabase Auth;
3. MFA con nivel AAL2;
4. política RLS válida.

La eliminación queda registrada por el disparador de auditoría administrativa.

## Seguridad

`anon`:
- solo SELECT de filas con `visible = true`.

`authenticated`:
- lectura administrativa completa solo con MFA AAL2 para registros ocultos;
- INSERT, UPDATE y DELETE únicamente con administrador autorizado + MFA AAL2.

No se expone `service_role` en el navegador.

## Imágenes

Se admiten:

- rutas locales `assets/...`;
- URL HTTPS del dominio `crebeucayali.github.io`.

La imagen es opcional. Un recurso puede publicarse solo con título y descripción.

La migración actual no utiliza Supabase Storage.

## Privacidad

La tabla contiene exclusivamente información pública sobre materiales y equipos. No está destinada a datos personales.

La incorporación de Repositorio Accesible no modifica el gate general de preproducción para otros tratamientos de datos personales.
