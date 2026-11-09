# EVA 2.0 · Tarjetas cívicas desde el panel administrativo

Fecha de implementación: 2026-11-09.

## Objetivo
Aprovechar los 68 registros y las fichas de `recursos/calendario-civico.json` para crear tarjetas informativas programadas en la portada principal de EVA. La programación cívica permanece separada de `calendario_actividades`, que corresponde al calendario institucional.

## Administración
En `admin/index.html`, dentro de Calendario > Calendario cívico:
1. Seleccionar una conmemoración.
2. Revisar o adaptar el contenido propuesto a partir de `Conoce esta fecha` (motivo y antecedentes). La modificación de la tarjeta no altera el JSON ni las fichas del calendario.
3. Opcionalmente seleccionar una fotografía WebP, JPEG o PNG (hasta 5 MB) y añadir una descripción accesible.
4. Elegir prioridad principal/secundaria y marcar si debe publicarse.
5. Guardar la programación. Solo master autorizado con MFA AAL2 puede guardar; otros roles habilitados para Calendario conservan consulta y previsualización.

Los archivos subidos se almacenan en el bucket público `eva-publico`, bajo `calendario/civico/AAAA-MM-DD/UUID.ext`. El bucket ya tenía una política de inserción restringida a master con MFA para la carpeta `calendario`. No se permitió insertar archivos con políticas públicas genéricas.

## Base de datos y seguridad
Se aplicaron mediante el conector Supabase las migraciones:
- `crear_tarjetas_calendario_civico_eva2`: tabla `public.calendario_civico_tarjetas`, políticas RLS y RPC `admin_guardar_tarjeta_civica`.
- `limitar_columnas_publicas_tarjetas_civicas`: permisos SELECT por columnas, que excluyen `updated_by` y `updated_at` de las consultas públicas.

El RPC valida la autorización master con MFA AAL2 por la función institucional `private.es_admin_mfa()`, valida contenido, fecha, categoría, prioridad y ruta de imagen; no usa la clave de servicio en JavaScript público.

Solo las tarjetas `visible=true` y con `fecha` igual al día vigente en `America/Lima` son visibles para visitantes anónimos. Los administradores master con MFA pueden consultar todas las programaciones. La política pública no expone tarjetas futuras ni borradores.

## Portada principal
Repositorio `crebeucayali/crebeucayali.github.io`:
- `index.html`: sección `eva-civico-hoy`, colocada antes de Noticias destacadas.
- `eva-civico-dia.js`: consulta la programación pública correspondiente al día en Perú, renderiza la principal y las secundarias, y actualiza al volver a la pestaña o cada minuto.
- `eva-civico-dia.css`: estilos responsive y accesibilidad.
- Cuando no hay tarjeta programada para ese día, la sección se mantiene oculta y no reserva espacio.
- La fotografía se muestra únicamente si existe una URL permitida; se usa el texto alternativo registrado.

## Situación inicial y validaciones
La tabla inicia vacía (0 tarjetas guardadas). La portada no mostrará una tarjeta hasta que un administrador guarde y habilite una con fecha correspondiente al día actual.

Se verificaron en GitHub los archivos y la sintaxis JavaScript, así como las políticas RLS y privilegios por columnas en Supabase. Quedan pendientes pruebas reales con sesión master y MFA, carga de una fotografía, guardado, consulta anónima, móvil, teclado y alto contraste.

Para fotografías de terceros, corresponde verificar la licencia y registrar la atribución según sus condiciones antes de su uso.
