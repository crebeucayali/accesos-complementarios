# Habilitación de invitaciones y presentación Publicador

Repositorio: `crebeucayali/accesos-complementarios`. Autorización: instrucciones del 1 de octubre de 2026 para habilitar infraestructura y detenerse antes de la primera invitación real.

## Resultado

Se habilitan las invitaciones en el panel y se retira la pausa deliberada de `private.admin_autorizar_editor`, conservando sus controles de master activo, sesión vigente y AAL2. La interfaz muestra Publicador; el rol técnico sigue siendo `editor` en datos, RLS, RPC, comparaciones y Edge Function. No se habilita edición de contenido.

El formulario requiere nombre, correo y al menos uno de los cinco módulos permitidos. Admite varios módulos; no admite Materiales, roles arbitrarios ni redirecciones del cliente. Se mantienen las protecciones del master, las verificaciones de autorización existentes, el bloqueo de escritura general, Storage, Usuarios y Estadísticas y el acceso AAL1 de Publicador/Consulta previamente aplicado.

No se cambian contenidos ni consultas públicas, límites de fotos, Compartir, contadores, cabecera, pie, políticas de privacidad ni cookies.

## Archivos modificados o añadidos

- `admin/index.html`: textos, formulario habilitado y versiones de scripts.
- `admin/admin.js`: etiqueta de rol y mensaje inicial; sin cambios en lógica de permisos o sesión.
- `admin/usuarios.js`: habilitación de invitaciones, etiqueta Publicador y validaciones de entrada.
- `admin/activacion.js`: mensajes de acceso con correo y contraseña, sin pedir TOTP.
- `supabase/functions/admin-invitar-editor/index.js`: validación temprana de nombre, correo y módulos, normalización del correo y mensaje corregido.
- `supabase/migrations/20261002012640_habilitar_invitaciones_publicadores.sql`: retira pausa, exige módulos sin duplicados, corrige expresión regular de correo y dos mensajes visibles del RPC de publicación. No cambia RLS ni la lógica de publicar/archivar/restaurar.
- `admin/tests/users-panel.test.cjs`.
- `admin/tests/activation.test.cjs`.
- `admin/tests/invitation-server.test.mjs`.
- `admin/tests/publicadores-browser.test.cjs`.
- `admin/tests/publicadores-rollback.sql`.
- `docs/habilitacion-publicadores-2026-10-01.md`.

## Supabase y Edge Function

Migración nueva aplicada: `20261002012640_habilitar_invitaciones_publicadores`.

Edge Function `admin-invitar-editor`, versión 3, ACTIVE, `verify_jwt=true`. Su RPC comprueba el JWT del llamante, autorización activa, `session_id` vigente y master AAL2 antes de acceder a la clave de servidor. La clave service role se usa únicamente en el entorno servidor. No se leyó ni publicó ninguna clave privada durante esta intervención. La respuesta no expone errores privados de Auth ni secretos.

Las autorizaciones se normalizan por correo, tienen unicidad y se bloquean transaccionalmente. Repetir una autorización pendiente idéntica no genera otra fila. Una cuenta Auth existente o un usuario ya autorizado obliga a revisar el estado y no se invita otra vez. El frontend no reintenta automáticamente envíos; el servidor tampoco.

`private.es_admin_mfa` sigue siendo exclusiva del master AAL2; `private.permite_modulo` mantiene master AAL2 y Publicador/Consulta AAL1 o AAL2 en módulos asignados. El publicador solo cambia estados mediante `admin_cambiar_publicacion`. La acción técnica Restaurar sigue siendo exclusiva del master; Publicar un archivado conserva la lógica anterior.

Existe exactamente un master activo, con el UUID original y un factor TOTP verificado. El índice único `admin_usuarios_unico_master` permanece intacto.

## Redirección Auth

La Edge Function utiliza exactamente:

`https://crebeucayali.github.io/accesos-complementarios/admin/`

Esta ruta existe y contiene `activacion.js`; admite el flujo implícito de invitación `#type=invite`, valida usuario/perfil con Supabase, elimina el fragmento del historial, guarda la contraseña sin persistir el token y cierra la sesión temporal de activación.

Se comprobó la configuración efectiva del servicio Auth mediante GET `/auth/v1/verify` con un token deliberadamente inválido: no se crean cuentas ni se envía correo. Con `redirect_to` al panel, Auth respondió 303 al panel con un error de invitación inválida. Con un destino externo de prueba, respondió 303 al mismo panel, que es el destino predeterminado efectivo (Site URL). El destino externo se rechazó. No se modificó la configuración Auth.

No se leyó la lista completa de Redirect URLs, la plantilla ni las credenciales/configuración privada SMTP desde Dashboard: el conector no ofrece esa lectura. La ruta utilizada y su aceptación efectiva sí se comprobaron. La entrega de un correo y la activación real se comprobarán con el único piloto, después de que el master ingrese sus datos. No se garantiza entrega antes de esa prueba.

## Comprobaciones ejecutadas

- 35 pruebas unitarias: usuarios, activación y Edge Function. Cubren normalización, validaciones, rol fijo, rechazo de llamadas sin JWT, rechazo de publicador, duplicados, error de correo y ausencia de reintentos.
- 7 pruebas de navegador (grupo y seis escenarios): scripts/HTML reales, Auth y correo simulados; master, publicador y consulta en 1366 y 390 px. El master AAL1 pasó a pantalla MFA, se simuló una verificación correcta y regresó a AAL2. Publicador/Consulta AAL1 nunca solicitaron QR, secreto ni código TOTP. Se verificaron formularios master, pestañas asignadas y retirada de módulos. No se enviaron invitaciones reales.
- 75 comprobaciones reales de base de datos, antes y después de la migración. Terminan en ROLLBACK; un único usuario sintético sin contraseña, cinco contenidos sintéticos y sesiones transaccionales. No quedaron datos de prueba ni se subieron archivos físicos. Las secuencias de IDs pueden avanzar.
- Publicador AAL1: Publicar/Archivar verificado en los cinco módulos tras asignación; INSERT/UPDATE/DELETE estructurales bloqueados en los cinco; Storage bloqueado; sin Usuarios, Estadísticas, invitaciones ni Restaurar; rechazo de módulos no asignados, desactivación y retirada de módulo con JWT anterior todavía vigente.
- Consulta AAL1: lectura asignada sin publicar/archivar.
- Master AAL1: sin privilegios de escritura ni invitaciones. Master AAL2: autoriza invitaciones y administra asignación, desactivación y cambio Publicador/Consulta.
- Cuenta master: UUID y TOTP conservados; desactivación, degradación y eliminación directas rechazadas; RPC de gestión rechaza promoción a master; unicidad intacta.
- Auditoría: autorización pendiente y modificaciones registradas sin contraseñas, tokens ni secretos.
- Huellas antes/después idénticas para políticas, registros e imágenes existentes; un usuario Auth real, mismas sesiones, objetos, auditoría y contador agregado.
- Security Advisor: sin nuevos hallazgos. Se conservan dos avisos informativos por RLS en tablas privadas sin políticas de acceso directo y el aviso previo de [protección contra contraseñas filtradas deshabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), que no se modificó.

Las pruebas no sustituyen un login real con contraseña/TOTP del master ni la entrega del correo, activación y acceso del futuro piloto. No se solicitaron credenciales y no se creó ninguna cuenta piloto real.

## Primera prueba real, a cargo del master

1. Entrar al panel con correo, contraseña y TOTP. Comprobar los cinco módulos, Usuarios y Estadísticas.
2. Abrir Usuarios y módulos. En Invitar publicador escribir el nombre y correo real del único piloto y seleccionar inicialmente un módulo, por ejemplo Galería. Pulsar Enviar invitación una sola vez.
3. Comprobar el mensaje y actualizar el listado. Si no se confirma el envío, revisar el estado antes de volver a intentarlo; no crear otra autorización ni otra cuenta.
4. El piloto abre el enlace, define su contraseña y vuelve al acceso administrativo. Debe entrar con correo y contraseña, sin QR/TOTP, y ver solo su módulo.
5. En un registro seguro previamente preparado por el master, archivar y volver a publicar. Verificar desaparición/reaparición pública y conservación de ID y archivos. No usar datos importantes ni eliminación definitiva.
6. El master agrega un segundo módulo y retira el primero. El piloto actualiza el acceso: debe ver la nueva asignación. Intentar una operación en el módulo retirado debe ser rechazado por el backend.
7. El master desactiva al piloto durante su sesión. La siguiente operación debe ser rechazada. Reactivar solo si se continúa la prueba.
8. Cerrar sesión. No enviar invitaciones a más personas hasta confirmar esta prueba de entrega y acceso.

El sistema queda preparado para que el master introduzca manualmente nombre, correo y módulos del primer publicador piloto. No se seleccionó ningún destinatario ni se envió invitación alguna.
