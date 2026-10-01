# Cierre de correcciones de seguridad del panel EVA

Fecha: 30 de septiembre de 2026, America/Lima. La comprobación final de archivos públicos se realizó también el 1 de octubre en UTC, todavía 30 de septiembre en Lima.

## Estado general

**NO LISTO para habilitar invitaciones todavía.**

Los dos hallazgos de backend quedan corregidos y probados en el proyecto EVA. El cierre operativo depende de verificar Site URL, redirecciones, plantilla/proveedor de correo y el recorrido manual con la cuenta master. La lectura del Dashboard mediante navegador agotó el tiempo de espera; esas configuraciones no se dan por verificadas.

No se enviaron invitaciones ni se crearon cuentas reales. Las cuentas, autorizaciones, sesiones y contenidos utilizados como fixtures terminaron en ROLLBACK. Sigue existiendo una sola cuenta Auth, una sola cuenta master activa y un factor TOTP verificado.

## Alcance y conservación de datos

Se modifican únicamente este repositorio y Supabase EVA. Las páginas de Capacitaciones, Repositorio y portal principal se revisaron por HTTP sin modificar sus repositorios.

Las huellas de los registros de Capacitaciones, Calendario, Repositorio, Noticias, Galería y sus imágenes son iguales antes y después de la migración y de las pruebas. Storage conserva 29 objetos en eva-publico. El master conserva su UUID. No se cambió la arquitectura de sesión, diseño, navegación, header, footer o contenido real.

Los INSERT transaccionales pueden consumir valores de secuencia aun cuando se reviertan. No dejan registros ni usuarios persistentes.

## Revocación: antes y después

| Caso | Antes | Después |
| --- | --- | --- |
| Sesión Auth existente y propia, usuario activo | Permitido | Permitido |
| Sesión eliminada con los mismos claims anteriores | Autorización y módulo seguían permitidos | Autorización falsa; RPC de publicación rechazada |
| Master con sesión eliminada | Guardia no consultaba la sesión | Estadísticas y gestión de usuarios rechazadas |
| Usuario bloqueado en Auth | Seguía autorizado | Bloqueado |
| Usuario desactivado en la tabla administrativa | Bloqueado | Sigue bloqueado |
| Módulo retirado con JWT anterior | Bloqueado | Sigue bloqueado |
| session_id ausente, vacío, mal formado o inexistente | No se comprobaba | Bloqueado |
| Sesión perteneciente a otro usuario | No se comprobaba | Bloqueado |
| Sesión con not_after vencido | No se comprobaba | Bloqueado |
| AAL1 para una operación AAL2 | Bloqueado | Sigue bloqueado |
| Claim AAL2 sobre sesión registrada como AAL1 | No se contrastaba | Bloqueado |
| Renovación con el mismo session_id válido | Permitida | Conserva autorización |

La validación común reside en private.es_admin_autorizado(). Comprueba usuario administrativo activo, correo confirmado, ausencia de soft delete y bloqueo Auth vigente, correspondencia del UUID de sesión con el usuario, vigencia de not_after y consistencia de AAL2.

private.es_admin_mfa(), private.permite_modulo(), private.perfil_panel_admin() y las políticas/RPC que dependen de ellas heredan la corrección. No se duplicó la lógica en cada módulo.

También se cerraron private.estado_mfa_admin_actual() y private.limpiar_mfa_no_verificado_admin(): una sesión revocada no obtiene el factor MFA ni ejecuta la limpieza de factores no verificados. Una sesión AAL1 válida conserva el acceso previo a MFA.

Las pruebas emulan claims dentro de PostgreSQL con los roles authenticated y anon reales. No generan JWT firmados ni sustituyen un login real. PostgREST/Auth sigue siendo responsable de validar firma y caducidad del access token. Esta corrección exige además que la sesión Auth exista al ejecutar la operación.

## Estadísticas: antes y después

La reproducción anterior mostró que un editor AAL2 podía leer 30 filas del historial diario y obtener un total de visitas de 105 desde la RPC. Las cuatro RPC aceptaban al editor; las de compartidos devolvían su estructura sin datos debido a la RLS de esa tabla.

Ahora las cuatro RPC exigen private.es_admin_mfa(), es decir, master autorizado con sesión vigente y AAL2. Rechazan el acceso con SQLSTATE 42501.

| Identidad | Cuatro RPC administrativas |
| --- | --- |
| Master, sesión válida, AAL2 | Permitidas |
| Master, AAL1 | Rechazadas |
| Editor, AAL2 | Rechazadas |
| Consulta, AAL2 | Rechazadas |
| Usuario Auth sin autorización administrativa | Rechazadas |
| Anónimo | Rechazadas |
| Master o editor con sesión revocada | Rechazadas |

Se cerró asimismo la lectura directa de public.eva_visitas_diarias. Ocultar Estadísticas en el panel o proteger solamente las RPC habría dejado abierto el historial.

El contador público mantiene el contrato original: solo total y hoy. public.contador_visitas_eva() conserva SECURITY INVOKER y llama a un agregado fijo privado mediante cuerpo SQL BEGIN ATOMIC, que resuelve la dependencia al definirlo. La elevación necesaria para sumar los datos queda en private.contador_visitas_eva_publico(), sin parámetros, historial ni desglose por módulos. No se concedió USAGE a anon sobre private.

Prueba HTTP posterior: contador 200 con total 105 y hoy 10; historial anónimo 401/42501; las cuatro RPC anónimas 401/42501. Los valores del contador son una instantánea, no una expectativa permanente.

## Migración aplicada

Versión remota: **20260930225705**.

Nombre: cerrar_revocacion_sesiones_y_estadisticas_master.

Archivo: [supabase/migrations/20260930225705_cerrar_revocacion_sesiones_y_estadisticas_master.sql](../supabase/migrations/20260930225705_cerrar_revocacion_sesiones_y_estadisticas_master.sql).

Se preparó con Supabase CLI, se probó dentro de transacciones con ROLLBACK y se aplicó una sola vez mediante apply_migration. El nombre local se sincronizó con la versión realmente registrada por Supabase. El proyecto registra 43 migraciones; no se volvieron a ejecutar las 42 anteriores.

Funciones reemplazadas:

- private.es_admin_autorizado()
- private.estado_mfa_admin_actual()
- private.limpiar_mfa_no_verificado_admin()
- public.contador_visitas_eva()
- public.estadisticas_visitas_eva()
- public.estadisticas_visitas_eva_periodo(text)
- public.estadisticas_compartidos_eva()
- public.estadisticas_compartidos_eva_periodo(text)
- private.admin_autorizar_editor(text,text,text[]), únicamente para actualizar el motivo de pausa.

Función nueva, necesaria para conservar el contador público: private.contador_visitas_eva_publico().

Políticas y grants:

- Se reemplazó eva_visitas_diarias_lectura_publica por eva_visitas_diarias_admin_lectura, SELECT para authenticated con private.es_admin_mfa().
- Se retiró SELECT del historial a anon y PUBLIC.
- authenticated conserva SELECT sujeto a RLS exclusiva de master.
- No se abrieron tablas de admin_guard ni se cambiaron políticas de contenido o Storage.
- Las funciones nuevas y reemplazadas usan search_path vacío. Las RPC estadísticas continúan con SECURITY INVOKER.

## Archivos modificados

- La migración nueva indicada arriba.
- admin/tests/publication-rollback.sql: sesiones sintéticas válidas, creación/edición master, INSERT editor en los cinco módulos y DELETE directo de Storage bloqueado.
- admin/tests/publication-results.json: resultado de 72 comprobaciones.
- admin/tests/security-closure-rollback.sql: batería nueva de 85 comprobaciones.
- admin/tests/security-closure-results.json: resultados de la batería nueva.
- admin/tests/authorization-rollback.sql: aviso de prueba histórica obsoleta; no se ejecutó su expectativa antigua de CRUD editor.
- docs/panel-administrativo-auth.md: actualización de la garantía de revocación.
- Este informe.

Ningún archivo de ejecución del frontend fue modificado.

## Pruebas y regresiones

| Batería | Resultado |
| --- | --- |
| Publicación, permisos, archivado y visibilidad SQL | 72 conformes |
| Sesión, estadísticas, usuarios y master SQL | 85 conformes |
| Código Node del panel y Edge Function | 75 conformes |
| Ocho filtros públicos servidos por Pages | 8/8 idénticos byte a byte |
| HTML del panel servido | Idéntico al archivo previamente desplegado |
| Pruebas HTTP públicas y de rechazo anónimo | Conformes |

Las dos baterías SQL pasaron antes de aplicar la migración y después de aplicarla. Son 157 comprobaciones SQL distintas; repetirlas no aumenta ese total. Las 75 pruebas Node cubren el comportamiento simulado de interfaz, sesión, roles, activación, invitación y filtros. Se verificó también la sintaxis del gestor de sesión público y de la Edge Function.

Se ajustó la construcción de fixtures durante la preparación: autorización previa exigida por el trigger Auth, omisión de columnas identity y versión deliberadamente obsoleta para la prueba de concurrencia. Los ensayos fallidos de preparación se revirtieron antes de la aplicación; los resultados finales indicados corresponden a las baterías completas conformes.

Master: creación y edición estructural de los cinco módulos, publicar/archivar/restaurar, DELETE en los tres módulos que ya lo permiten, gestión de usuarios, roles, módulos y estadísticas. Editor: publicación/archivado exclusivamente en módulos asignados; INSERT, PATCH general, DELETE, Storage, usuarios, roles, permisos y estadísticas bloqueados. Consulta conserva solo lectura autorizada.

Se comprobó el cambio editor a consulta y de vuelta, desactivación, activación y retiro de módulo con los mismos claims anteriores. La siguiente operación usa el estado actual de autorización de la base de datos.

La protección del master continúa: índice único, rechazo de segundo master, bloqueo de cambio de UUID, degradación, desactivación y eliminación por cascada desde Auth. No depende de user_metadata.

La auditoría conserva UUID, rol, módulo, registro, fecha y eventos de publicar, archivar, restaurar, eliminar definitivamente, cambios de rol/módulos y activación/desactivación. Los registros de prueba no contienen contraseñas, códigos MFA, access/refresh tokens, secretos ni session_id. No se añadió registro de claims.

## Filtros públicos y despliegue

Los ocho archivos previamente autorizados coinciden byte a byte con las respuestas públicas actuales. No se reaplicó ningún parche.

Commits ya desplegados y conservados:

| Repositorio público | Commit |
| --- | --- |
| Capacitaciones | 903c5a6775e83c04552d04aba9acdcd236efb927 |
| Repositorio Accesible | 8309337a5f81b2b5aa540839d0550c5ae4345b44 |
| Portal principal y Noticias | d09a1e9ca4b09c198a20fcdef791dbcdbf2c287f |

La prueba transaccional usa anon para comprobar que los cinco módulos ocultan archivados y vuelven a mostrar restaurados. Las pruebas de código verifican que un fallo de Supabase no restaura respaldos estáticos de Capacitaciones, Calendario, Repositorio o Noticias.

Lectura pública HTTP posterior: 20 sesiones de Capacitaciones, 152 actividades visibles de Calendario, 21 recursos, 2 Noticias y 1 elemento de Galería. Todas las filas retornadas son visibles.

Portal, primera y segunda jornada, Repositorio, panel, Calendario y Galería responden 200. Se conservan las versiones app v34, segunda-jornada v5, repositorio-supabase v4, main v14, admin-sesion v1 y admin v33.

El HTML del panel sigue idéntico, incluida su CSP. No se añadió unsafe-inline ni se cambió la publishable key pública. La búsqueda de patrones de alta confianza no encontró claves secretas en los 18 archivos de código y pruebas revisados. Esta búsqueda no equivale a repetir la auditoría completa del historial de Git.

La modificación de Supabase entra en vigor sin cambiar ni renovar URLs de scripts. El commit de respaldo contiene migración, pruebas y documentación. La verificación de su workflow Pages se incorpora al informe entregable después de publicar ese commit.

La lectura HTTP no reemplaza una inspección de consola y viewport con sesión autenticada. La validación operativa de móvil y escritorio queda en el protocolo manual.

## Security Advisor y Performance Advisor

Ejecutados después de la migración.

| Hallazgo | Clasificación de cierre | Acción |
| --- | --- | --- |
| Errores críticos o altos nuevos | Ninguno detectado por los asesores | Sin corrección adicional |
| Leaked Password Protection Disabled | Medio, pendiente | No modificada; proyecto Free |
| RLS Enabled No Policy: admin_guard.admin_correos_autorizados | Informativo | Mantener sin políticas públicas |
| RLS Enabled No Policy: admin_guard.admin_usuarios_autorizados | Informativo | Mantener sin políticas públicas |
| Índice eva_compartidos_diarios_modulo_fecha_idx sin uso | Informativo | Conservar |
| Índice admin_correos_autorizado_por_idx sin uso | Informativo | Conservar |

anon y authenticated siguen sin SELECT/INSERT/UPDATE/DELETE en las dos tablas administrativas. Los avisos de RLS sin políticas corresponden al cierre deliberado de acceso directo.

Referencias de remediación: [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [índices sin uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Los asesores son una comprobación adicional; la conformidad de permisos se sustenta en las pruebas directas descritas.

## Contraseñas filtradas

La organización continúa en plan Free. La documentación oficial reserva la protección contra contraseñas filtradas a Pro o superior. No se cambió el plan ni la configuración Auth.

Recomendación: decidir por separado si se autoriza Pro. Si se dispone de ese plan, revisar Authentication > configuración de contraseñas/email y activar la protección, conservando MFA. La opción evalúa contraseñas futuras y cambios de contraseña; no elimina la cuenta master ni transforma su UUID. Las contraseñas existentes pueden generar advertencias de debilidad y deben verificarse en el flujo real. No se consultó ni evaluó la contraseña actual del master.

La activación por invitación establece una contraseña y debe respetar los requisitos efectivos de Auth. No se deben cambiar esos requisitos hasta comprobar que el formulario de activación presenta los errores correctamente. La compatibilidad de código se comprobó con las pruebas locales; la configuración efectiva sigue pendiente de lectura.

Fuentes oficiales: [seguridad de contraseñas](https://supabase.com/docs/guides/auth/password-security), [sesiones y revocación](https://supabase.com/docs/guides/auth/sessions).

## Edge Function y bloqueo de invitaciones

admin-invitar-editor sigue ACTIVE, versión 2 y verify_jwt=true. Su código desplegado coincide con el repositorio y no se modificó.

La llamada conserva el JWT del solicitante para que PostgREST y admin_autorizar_editor exijan master, AAL2 y sesión vigente. Un editor recibe rechazo. Una invocación anónima real recibe HTTP 401.

El cuerpo acepta únicamente email, nombre y modulos. No acepta rol, redirección ni credenciales arbitrarias. La validación existente admite únicamente los cinco módulos editor y excluye Materiales. El rol se fija en editor. La service role permanece como variable del entorno servidor y no aparece en respuestas ni frontend.

El control SQL conserva normalización/validación de email, bloqueo transaccional por correo y revisión de cuentas/autorizaciones existentes para prevenir duplicados. Los casos de correo, módulos y duplicados posteriores a la pausa se revisaron en código y pruebas locales. No se ejecutó un envío real ni se verificó la entrega SMTP o una carrera real de invitaciones.

La redirección del código es fija: https://crebeucayali.github.io/accesos-complementarios/admin/. Su inclusión efectiva en la lista Auth aún debe comprobarse.

El frontend conserva const invitacionesPausadas = true. La RPC servidor conserva la pausa 55000, ahora con un motivo actualizado: verificación final de Auth/correo y autorización expresa. No puede llegar al envío Auth desde una autorización válida mientras esa pausa permanezca.

## Pasos manuales pendientes

### Configuración Auth y correo, sin enviar invitaciones

1. Abrir el Dashboard de Supabase, seleccionar el proyecto EVA y entrar en Authentication > URL Configuration.
2. Registrar el valor actual de Site URL. Para el flujo administrativo de este proyecto se recomienda el panel https://crebeucayali.github.io/accesos-complementarios/admin/. Si la configuración actual tiene otro propósito documentado, revisarlo antes de cambiarla.
3. Confirmar que Redirect URLs permite exactamente https://crebeucayali.github.io/accesos-complementarios/admin/. Evitar comodines amplios innecesarios.
4. En Authentication > Email Templates, revisar la plantilla Invite user y que su enlace use ConfirmationURL y llegue al panel. No copiar tokens o enlaces individuales de invitación al informe.
5. En configuración de email/SMTP, registrar solo proveedor, remitente, dominio verificado, restricciones de destinatarios y límites; omitir usuario/contraseña SMTP y claves.
6. Si utiliza el proveedor SMTP por defecto, revisar sus restricciones antes de invitar a un correo ajeno al equipo del proyecto. No asumir que una autorización SQL garantiza la entrega.
7. Tener presente que las plantillas de proyectos Free nuevos con el proveedor por defecto pueden estar restringidas desde junio de 2026; el SMTP personalizado tiene reglas diferentes.
8. Registrar si la protección contra contraseñas filtradas está disponible y el plan necesario, sin cambiar plan o contraseña durante la revisión.
9. Mantener las dos pausas de invitación hasta cerrar estas comprobaciones y recibir autorización expresa.

Referencia oficial: [cambio de plantillas Free](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

### Recorrido con tu cuenta master

1. Abrir el panel en escritorio con conexión disponible. Probar una contraseña incorrecta una sola vez y después el login correcto.
2. Probar un código MFA incorrecto una sola vez y luego uno válido. No compartir contraseña, código, QR ni tokens.
3. Confirmar acceso a los cinco módulos, Usuarios y Estadísticas, y formularios completos para master.
4. Crear una nueva noticia de prueba, archivada, con título PRUEBA EVA CIERRE seguido de fecha/hora. Usar texto neutro y ninguna imagen o archivo. No reutilizar contenido importante.
5. Publicarla. En otra ventana privada comprobar que aparece en el portal.
6. Archivarla. Confirmar que permanece en el panel y desaparece públicamente al recargar.
7. Restaurarla. Confirmar su reaparición. Archivarla al terminar, sin eliminar contenido importante.
8. Recargar y abrir otra pestaña del panel. Confirmar recuperación de AAL2 y acceso autorizado.
9. Cerrar y reabrir el navegador antes del logout. En un navegador compatible con persistencia, comprobar recuperación de sesión.
10. Provocar una pérdida breve de conexión durante una lectura; restablecerla y usar Reintentar acceso. Evitar repetir escrituras durante la desconexión.
11. Mantener el panel hasta la renovación normal del token y comprobar una lectura posterior. No reducir artificialmente el JWT lifetime.
12. Cerrar sesión con conexión disponible desde una pestaña. Confirmar que las otras pestañas del mismo navegador cierran el panel. Si se informa que el cierre remoto no fue confirmado, reintentar el cierre con conexión antes de dar esa prueba por conforme.
13. Reabrir el navegador después del logout: debe requerir login/MFA. Iniciar sesión de nuevo y comprobar acceso.
14. Repetir la revisión visual en el móvil: los cinco módulos y controles master deben ser utilizables sin superposición. No crear editores para probar la interfaz; su restricción ya tiene pruebas simuladas y SQL.
15. Registrar solo conforme/no conforme por paso, navegador y ancho o dispositivo. No exportar localStorage, cabeceras Authorization, session_id o credenciales.

La revocación y los cambios de permisos/desactivación fueron probados transaccionalmente. No se debe desactivar, eliminar ni degradar la cuenta master para repetir esas pruebas.

## Recomendación

Mantener bloqueada la primera invitación. Los dos hallazgos principales ya no son bloqueos de backend. Para cerrar como LISTO PARA HABILITAR EDITORES o LISTO CON OBSERVACIONES MENORES faltan las lecturas Auth/correo y el recorrido operativo indicado. La advertencia de contraseñas filtradas requiere una decisión sobre el plan y su configuración.

Aunque esas comprobaciones sean conformes, habilitar invitaciones requiere autorización expresa posterior. Esta intervención no la sustituye.
