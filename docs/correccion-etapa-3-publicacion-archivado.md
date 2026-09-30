# Corrección de Etapa 3: publicar y archivar

Fecha: 30 de septiembre de 2026.

**Estado: permisos y panel corregidos dentro del alcance autorizado. No está cerrado el requisito de visibilidad pública de todos los módulos. Las invitaciones permanecen bloqueadas.**

La intervención de ejecución se limita a `crebeucayali/accesos-complementarios` y Supabase. No se han publicado cambios en otros repositorios. Las páginas públicas de Capacitaciones, Repositorio y Noticias tienen respaldos estáticos que requieren el [parche mínimo pendiente](parches/README.md). La instrucción de no modificar otros repositorios impide aplicarlo sin ampliar ese alcance.

## Comportamiento anterior y corregido

La Etapa 3 inicial permitía CRUD de un editor en su módulo, incluyendo DELETE en Noticias, Repositorio y Galería y escrituras en Storage. Ahora las escrituras generales y todas las políticas DELETE administrativas que ya existían requieren master activo, correo confirmado y AAL2. Los editores no pueden crear registros, editar sus campos, subir/reemplazar/eliminar archivos, modificar consentimiento de imágenes ni usar la RPC estructural del calendario.

El master conserva los formularios completos, estadísticas, gestión de usuarios, permisos y operaciones críticas. Solo el master puede eliminar definitivamente donde ya existía esa capacidad: Noticias, Repositorio, Galería y sus imágenes. No se añade DELETE a Capacitaciones ni Calendario. Su UUID, cuenta Auth, contraseña y factores MFA no se modificaron. Continúan las protecciones existentes contra degradación, desactivación y eliminación, incluida la cascada desde Auth.

Un editor AAL2 ve solamente sus módulos asignados entre `capacitaciones`, `calendario`, `repositorio`, `noticias` y `galeria`. En ellos ve publicados y archivados; los borradores quedan en preparación exclusiva del master. No se ofrece Materiales. Su interfaz no muestra formularios estructurales, eliminación, usuarios, roles, permisos, estadísticas ni configuración.

El master prepara el contenido y sus archivos. Si va a entregarlo al flujo del editor, puede dejarlo archivado con los campos completos. El editor dispone de **Publicar** para un archivado y **Archivar** para un publicado. Publicar un archivado lo vuelve a mostrar y se audita como `restaurado`. El botón y acción RPC explícitos **Restaurar** se reservan al master. `consulta` conserva únicamente lectura.

La nueva sección de publicación de Capacitaciones muestra su estado, pero mantiene Publicar/Archivar pausados hasta completar su filtro público externo. Los formularios de preparación del master siguen disponibles. Todas las invitaciones están deshabilitadas tanto en la interfaz como en la RPC previa a Auth, incluso al intentar forzar la API. No se incorporó ninguna cuenta real.

## Tablas y campos de archivo

| Módulo/recurso | Tabla | Campo utilizado | Publicado | Archivado |
| --- | --- | --- | --- | --- |
| Capacitaciones | `public.capacitaciones_sesiones` | Nuevo `visible boolean NOT NULL DEFAULT true` | `visible=true` | `visible=false` |
| Calendario | `public.calendario_actividades` | `visible`, ya existente | `true` | `false` |
| Repositorio | `public.repositorio_recursos` | `estado_publicacion` y su `visible` existente | `publicado`, `true` | `archivado`, `false` |
| Noticias | `public.noticias_destacadas` | `estado_publicacion` y su `visible` existente | `publicado`, `true` | `archivado`, `false` |
| Galería | `public.galeria_items` | `estado_publicacion` y su `visible` existente | `publicado`, `true`, consentimiento existente | `archivado`, `false` |
| Imágenes de Galería | `public.galeria_item_imagenes` | Estado del álbum padre; sin campo duplicado | Lectura pública si padre publicado y autorizado | Conservadas; lectura administrativa según módulo |
| Storage | `storage.objects` | Sin cambios de campos ni objetos | Conserva las reglas de lectura existentes | Archivar no borra archivos |
| Auditoría existente | `private.auditoria_administrativa` | Nuevos `actor_rol`, `modulo`; conserva UUID, fecha, registro, datos y `eventos` | Mismo flujo de auditoría | Mismo flujo de auditoría |

Se propuso `visible` para Capacitaciones antes de aplicar la migración: su `estado` actual significa disponibilidad (`disponible`/`pendiente`) y no servía para archivar. Ambos significados permanecen separados. Todos los registros existentes conservan su contenido y visibilidad previa; las dos actividades de calendario previamente invisibles se identifican ahora como Archivado. Se añaden CHECK de consistencia a los tres módulos que ya tenían estado de publicación, sin duplicar campos.

## Migración aplicada y funciones

Versión remota **`20260930133100`**, nombre `correccion_etapa_3_editor_publicar_archivar`. [SQL aplicado](sql/correccion-etapa-3-publicacion-archivado.sql). Ya consta en el historial; no ejecutar otra vez.

| Función o vista | Modificación |
| --- | --- |
| `private.permite_modulo` | Permiso de escritura estructural solo master; lectura administrativa editor/consulta por módulo y AAL2. |
| Nueva `private.estado_publicacion_registro` | Traduce los campos existentes al estado común; sin ejecución directa de usuarios. |
| Nueva `private.cambiar_publicacion_contenido` | Lista blanca de cinco módulos y tres acciones, UUID autorizado, AAL2, rol, módulo, bloqueo de fila y versión `updated_at`. Solo modifica estado/visibilidad. |
| Nueva `public.admin_cambiar_publicacion` | Wrapper SECURITY INVOKER; ejecución solo authenticated. No recibe campos arbitrarios, archivos ni metadatos. |
| `private.registrar_auditoria_admin` | Distingue `publicado`, `archivado`, `restaurado`, `eliminado_definitivamente`; conserva auditoría de otros cambios. |
| Nueva `private.contexto_auditoria_administrativa` y trigger | Añade rol del actor y módulo al insertar en la misma auditoría. No inventa roles históricos. |
| `public.admin_guardar_actividad_calendario` | Creación/edición estructural solo master AAL2. |
| `private.admin_autorizar_editor` | Pausa antes de autorizar o invitar. La Edge Function existente no puede pasar a Auth si esta RPC falla. |
| `public.calendario_publico` | Conserva SECURITY INVOKER; excluye también sesiones de Capacitaciones con `visible=false`. |

Las funciones privadas con privilegios elevados tienen `search_path` vacío y verifican autorización antes de operar; los nombres de tablas provienen de una lista fija. Los wrappers públicos no elevan privilegios. No se conceden permisos a anon ni se exponen las tablas administrativas/auditoría. Un `updated_at` obsoleto devuelve `40001`, exige actualizar y no sobrescribe silenciosamente otro cambio. Una acción repetida sobre el mismo estado es idempotente.

## Políticas RLS

Se modifican **24 políticas existentes** y se añade una de lectura authenticated de Capacitaciones:

- 16 INSERT/UPDATE/DELETE de las seis tablas de contenido ahora exigen `private.es_admin_mfa()` (master AAL2), tanto USING como WITH CHECK donde corresponde.
- Tres INSERT/UPDATE/DELETE de `storage.objects` conservan bucket/carpeta válidos y exigen master AAL2. No se amplía lectura pública de archivos.
- Noticias, Repositorio, Galería e imágenes permiten al editor/consulta asignado leer únicamente publicados y archivados; el master puede leer borradores.
- La política pública de Capacitaciones queda para anon y exige `visible`; su nueva política authenticated admite visible o lectura administrativa por módulo.

DELETE no tiene una vía alternativa para editores: las políticas de contenido y Storage exigen master. La publicación del editor se realiza exclusivamente a través de la RPC acotada. La estructura de usuarios, la asignación de módulos y estadísticas conserva las restricciones master de la Etapa 3.

## Archivos de ejecución modificados

- `admin/admin.js`: escrituras y formularios estructurales master, integración del listado de publicación, limpieza y recuperación de permisos sin cambiar la sesión.
- `admin/index.html`: bloques de formularios master, listados de publicación, etiquetas de eliminación definitiva y pausa de invitaciones. Sin cambios de CSS, header o footer.
- Nuevo `admin/publicacion.js`: lectura mínima por módulo, estados, acciones acotadas, versión del registro, paginación, prevención de doble envío y respuestas tardías.
- `admin/usuarios.js`: pausa de envío y conservación de gestión master.
- `recursos/calendario-supabase.js`: retira respaldos estáticos de fechas sin registros y ante fallo de validación pública.
- `recursos/calendario.html`: únicamente incremento de la versión del script para evitar caché anterior.

Documentación: este informe, SQL aplicado, aviso de informe histórico en `docs/usuarios-roles-permisos-etapa-3.md`, `docs/parches/README.md`, diff y ocho fixtures no ejecutables. Pruebas nuevas: `publication-panel.test.cjs`, `public-filters.test.cjs`, `publication-rollback.sql`, `publication-results.json`. Pruebas ajustadas: `auth-session.test.cjs`, `users-panel.test.cjs`, `invitation-server.test.mjs`. La Edge Function, activación y helper compartido de sesión mantienen su código de producción anterior.

## Pruebas y resultados

Los seis archivos de ejecución se publicaron en el [commit 9839c64](https://github.com/crebeucayali/accesos-complementarios/commit/9839c64c169b9a6033e0cc502d03350beea0b356). El [despliegue de GitHub Pages](https://github.com/crebeucayali/accesos-complementarios/actions/runs/36728550616) terminó con resultado `success`. La comparación del commit confirma que no cambió CSS ni archivos de otros repositorios. El seguimiento de pruebas/documentación no cambia los archivos de ejecución.

- **62 comprobaciones Supabase conformes**, con roles PostgreSQL reales authenticated/anon y claims sintéticos, dentro de una transacción revertida. [SQL reproducible](../admin/tests/publication-rollback.sql) y [resultados](../admin/tests/publication-results.json). En los cinco módulos: master publica/archiva/restaura; editor lee publicados/archivados y publica/archiva; DELETE directo y PATCH generales editor bloqueados; campos y registros preservados; AAL2, versiones y asignaciones comprobadas. Master elimina en los tres módulos previstos. Auditoría de las cuatro acciones con UUID/rol/módulo/registro/fecha, imágenes y Storage conservados, usuarios/roles/permisos/estadísticas editor bloqueados y master protegido.
- **75 pruebas Node conformes**: panel, sesión integrada, usuarios, activación, servidor de invitaciones y filtros públicos. Incluyen 13 comprobaciones de los parches externos preparados, que todavía no equivalen a una validación de sus páginas desplegadas.
- **31 regresiones del helper de sesión de Etapa 2 conformes**: recuperación AAL2, renovación coordinada entre pestañas, fallos transitorios, logout y rechazo definitivo. El helper no fue modificado.
- Sintaxis JavaScript y estructura HTML del panel verificadas: cinco bloques master, cinco formularios dentro de ellos y 177 IDs únicos.
- Asesores Supabase: ningún error nuevo de seguridad o rendimiento. Las dos tablas `admin_guard` deliberadamente sin políticas directas generan INFO; los índices sin uso generan INFO. Persiste la advertencia preexistente de protección contra contraseñas filtradas deshabilitada; [guía de remediación](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se modifica configuración Auth ni MFA en esta corrección.

Comprobación posterior al ROLLBACK: una cuenta Auth, un master activo, un factor MFA verificado, una autorización de correo; 20 sesiones, 154 actividades, 5 noticias, 21 recursos y 1 álbum. No quedan fixtures ni invitaciones. Las pruebas pueden consumir valores de secuencias, lo cual no elimina ni modifica registros reales.

## Límites y condición para cerrar

La API pública excluye archivados en los cinco módulos y vuelve a incluir los restaurados. El calendario autorizado ya elimina el respaldo cuando la respuesta está vacía. Sin embargo, la página externa de Capacitaciones conserva tarjetas estáticas omitidas por la API; Noticias y Repositorio pueden recuperar respaldos ante fallos. Por ello **no se declara completa la visibilidad pública ni se permite la primera invitación**.

Se preparó y probó el parche de ocho archivos de tres repositorios, únicamente para estos filtros y versiones de script. Requiere autorización adicional porque el alcance vigente excluye expresamente otros repositorios. Al aplicarlo, una caída de Supabase no mostrará respaldos que podrían contener archivados; el contenido volverá al recuperarse la consulta.

No se realizó login manual ni un DELETE HTTP autenticado con un editor real: no existen credenciales de editor y no se crearon cuentas persistentes para pruebas. La comprobación del DELETE utiliza el mismo rol authenticated y las políticas RLS que aplica PostgREST, no una simulación del frontend. Las pruebas DOM no sustituyen la revisión visual/manual final.

Después de aplicar y verificar los filtros externos, completar la revisión manual master/editor, retirar la pausa mediante una migración específica y habilitar los controles de invitación y publicación pendientes. Solo entonces, desde master AAL2 → Usuarios y módulos → Incorporar editor, introducir nombre/correo real, seleccionar módulos de la lista de cinco y enviar la invitación individual. El editor activará su contraseña y MFA. No compartir la cuenta master ni sus factores. Retirar módulos o desactivar seguirá siendo efectivo para la siguiente operación incluso con JWT vigente.
