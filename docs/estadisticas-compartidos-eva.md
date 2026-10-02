# Estadísticas de acciones de compartir EVA

EVA registra activaciones de Compartir, no publicaciones completadas en una aplicación externa. La incorporación de Galería conserva este criterio.

## Sistema existente

Los archivos `compartir-facebook.js` insertan únicamente módulo y ruta en `public.eva_compartidos_eventos`, usando la clave publishable prevista para el público. El trigger privado `private.registrar_compartir_eva_evento()` incrementa `public.eva_compartidos_diarios` por fecha, módulo y página y devuelve `null`: el evento individual no queda almacenado. No se envían datos personales, identificadores de visitante, credenciales ni archivos.

Los RPC existentes `estadisticas_compartidos_eva()` y `estadisticas_compartidos_eva_periodo(text)` conservan la exigencia de master con MFA AAL2 y sesión válida. El agregado conserva RLS; el público solo puede insertar eventos mediante el mecanismo existente.

La cobertura anterior comprende principal, Capacitaciones, Banco Digital Accesible, Materiales Educativos Accesibles, Repositorio Accesible y Noti Inclusivos. También admite DUA 3.0 y Accesos Complementarios.

## Galería: incorporación por actividad

Cada actividad usa el `id` bigint existente de `galeria_items`; la fecha no es su identificador. El artículo tiene `id="actividad-ID"` y el enlace público canónico es:

`https://crebeucayali.github.io/accesos-complementarios/recursos/galeria.html#actividad-ID`

Compartir aparece después de la descripción, dentro de cada tarjeta publicada. No hay botón general ni botón por fotografía. Incluye título, fecha y URL; no adjunta fotografías. El renderizado sigue consultando solo actividades visibles, autorizadas y publicadas, sin respaldo estático ante errores. Al cargar el enlace, localiza el artículo, lo enfoca y lo distingue mediante contorno. Una actividad ausente o archivada no se reconstruye.

Galería carga el helper ya existente del repositorio principal. Su listener delegado admite las tarjetas dinámicas y evita duplicación si el script se carga dos veces. Para actividades de Galería utiliza `navigator.share` cuando existe; en su ausencia conserva el diálogo de Facebook que ya utilizaba EVA. Título y fecha se pasan como texto a Web Share y como `quote` al diálogo existente. La presentación final de ese texto en Facebook depende de Facebook. Cancelar Web Share no abre otro canal. No hay reintentos estadísticos ni registro adicional por fallback. Un error estadístico no impide compartir.

Los demás botones conservan su canal, URL de página y protección de 1500 ms existentes. La rama nativa se aplica exclusivamente a las actividades de Galería.

El evento de Galería contiene:

- `modulo = galeria`;
- `pagina = /accesos-complementarios/recursos/galeria.html#actividad-ID`.

La ruta relativa identifica exactamente la misma URL pública. No se crean columnas, tablas, contadores ni RPC. Estadísticas incorpora Galería a total, distribución y participación y muestra título, fecha y enlace en contenidos más compartidos, recuperando la etiqueta de la tabla existente. Si el registro ya no existe, conserva su ruta histórica.

## Migración necesaria

`20261002005430_integrar_compartidos_galeria.sql`, aplicada el 2 de octubre de 2026 UTC / 1 de octubre en Perú.

Existían restricciones CHECK de módulos que excluían Galería y restricciones de rutas que rechazaban cualquier `#` o `?`, además de las validaciones equivalentes del trigger y su política INSERT. Se ampliaron únicamente esos componentes del contador existente. Solo Galería admite el ancla canónica `#actividad-ID`; otros módulos mantienen sus reglas. El trigger exige que el ID corresponda a una actividad actualmente pública. No admite rutas generales de Galería, parámetros, otros destinos, IDs inexistentes ni contenido archivado.

No cambian autenticación, usuarios, invitaciones, roles, permisos administrativos, Storage, consultas o composición fotográfica, publicación, archivado ni restauración. Se conserva el límite de ocho y los textos alternativos individuales.

## Archivos modificados o añadidos

`crebeucayali/crebeucayali.github.io`:

- `compartir-facebook.js`.

`crebeucayali/accesos-complementarios`:

- `recursos/galeria-supabase.js`;
- `recursos/galeria.css`;
- `recursos/galeria.html`;
- `admin/admin.js` (solo presentación de estadísticas de compartidos);
- `admin/index.html` (versión del script);
- `admin/tests/gallery-share.test.cjs`;
- `admin/tests/gallery-share-rollback.sql`;
- `supabase/migrations/20261002005430_integrar_compartidos_galeria.sql`;
- `docs/estadisticas-compartidos-eva.md`.

## Validación de cierre

44 comprobaciones JavaScript y navegador aprobadas sobre el código final: 16 de Compartir incluyendo pruebas agrupadas y 28 del límite de fotografías. Chromium ejecutó los scripts y estilos reales con datos simulados y transportes interceptados. Se probaron 1440, 1024, 768, 480 y 320 px, con Web Share simulado y sin él, teclado, foco, alto contraste y ausencia de desbordamiento. Se inspeccionaron las capturas móvil y escritorio. El diálogo nativo del sistema y la publicación final en Facebook no se automatizaron ni se afirma que se haya enviado contenido a un tercero.

27 comprobaciones SQL de Compartir aprobaron tanto en ensayo transaccional de la migración como después de aplicarla. Otras 42 comprobaron permisos reales master/editor y regresiones de Galería. Todas terminaron en ROLLBACK; no quedaron sesiones, usuarios sintéticos, contenidos, archivos ni conteos de prueba. El nuevo protocolo de Compartir no crea usuarios, solo una sesión master transaccional. Las secuencias de IDs pueden avanzar durante estas pruebas.

Resultados:

- Dos actividades con fecha idéntica: IDs y destinos distintos; enfoque correcto.
- Actividades con 1, 5 y 8 fotos: botón y enlace iguales en funcionamiento, fotos completas.
- Archivado: desaparece del público, conserva registro y fotos y rechaza eventos para su antigua URL.
- Restauración: reaparece con el mismo ID, URL y contador agregado.
- Un clic: un POST y un incremento; doble inicialización no duplica el listener.
- Estadísticas: total, módulo, participación y destinos individuales comprobados; etiquetas y enlaces comprobados en el renderizador real.
- Regresión: páginas principal, Capacitaciones, Repositorio y Noticias conservan el comportamiento anterior del helper; los archivos de los tres últimos módulos no se modifican.
- Políticas no relacionadas y huellas de registros/fotos existentes idénticas antes/después; usuarios, sesiones, objetos, auditoría y contador permanecieron iguales.
- Security Advisor sin hallazgos nuevos: siguen los dos avisos informativos de tablas privadas con RLS y el aviso previo de [protección contra contraseñas filtradas deshabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), fuera del alcance de este cambio.

Los commits concurrentes de autenticación del panel se conservaron; el cambio de este trabajo en admin.js se limita a estadísticas.\n\nPara reproducir la prueba de navegador, instalar Playwright y señalar con `EVA_SHARE_HELPER` el archivo del repositorio principal. `EVA_CHROMIUM` permite indicar un ejecutable de Chromium. Ejecutar `node --test admin/tests/gallery-share.test.cjs`. El SQL debe ejecutarse completo, incluido ROLLBACK.
