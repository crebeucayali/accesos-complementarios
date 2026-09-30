# Etapa 3: cuenta master, usuarios y permisos por módulo

Fecha: 30 de septiembre de 2026. Alcance: administración, autenticación, autorización y auditoría del panel EVA. La Etapa 2 fue validada manualmente por el titular antes de autorizar esta intervención.

## Comportamiento anterior y nuevo

Antes, una cuenta activa en `admin_guard.admin_usuarios_autorizados` tenía permisos administrativos generales al presentar AAL2. No había roles ni asignación de módulos y el panel cargaba todos sus contenidos.

Ahora, la cuenta administrativa existente conserva su UUID y se convierte en el único `master`. Los permisos se consultan en la base de datos usando `auth.uid()` y la fila vigente. No se derivan de correos ni de metadatos modificables por el usuario. Retirar un módulo, cambiar un rol o desactivar una cuenta afecta inmediatamente a las siguientes operaciones administrativas, sin esperar una renovación de JWT.

| Rol | Lectura administrativa de contenido | Crear, editar y publicar | Eliminar contenido | Usuarios, permisos y operaciones críticas |
| --- | --- | --- | --- | --- |
| master | Todos los módulos existentes | Todos | Según las capacidades existentes del módulo | Acceso exclusivo |
| editor | Módulos asignados | Módulos asignados | Noticias, Repositorio y Galería cuando la política existente lo permite | Sin acceso |
| consulta | Módulos asignados | No | No | Sin acceso |

Todos los accesos al panel y sus operaciones administrativas conservan AAL2. La lectura pública de los contenidos ya publicados conserva las políticas anteriores. Las estadísticas administrativas se muestran exclusivamente al master; los contadores públicos existentes mantienen su comportamiento.

Módulos asignables: `capacitaciones`, `calendario`, `noticias`, `galeria` y `repositorio`. `materiales` queda reconocido en la estructura, pero las RPC de asignación lo rechazan hasta que exista un editor de ese módulo en el panel. No se crean módulos de contenido nuevos. `consulta` está preparado y no se asignó a ninguna cuenta real.

## Estructura y migraciones aplicadas

Se amplía `admin_guard.admin_usuarios_autorizados`, sin crear una tabla paralela de usuarios. Contiene `user_id`, `email`, `nombre`, `rol`, `activo`, `modulos`, `creado_at` y `actualizado_at`; se conserva `nota`.

La preautorización de correos existente, `admin_guard.admin_correos_autorizados`, incorpora nombre, rol, módulos y el UUID del master que autorizó. Sirve exclusivamente para preparar una invitación y vincular el UUID al crear la cuenta Auth. Una cuenta sin correo confirmado no obtiene autorización administrativa. No se conceden permisos por coincidencia de correo en una sesión.

| Versión remota | Migración | SQL reproducible |
| --- | --- | --- |
| `20260930053226` | `etapa_3_usuarios_roles_modulos_master` | [etapa-3-usuarios-permisos.sql](sql/etapa-3-usuarios-permisos.sql) |
| `20260930054502` | `etapa_3_indice_autorizaciones` | [etapa-3-indice-autorizaciones.sql](sql/etapa-3-indice-autorizaciones.sql) |

El primer SQL incluye una comprobación previa del único administrador activo, restricciones de roles y módulos, índices únicos, protección del master, funciones y auditoría. No debe ejecutarse por segunda vez: las migraciones ya figuran en el historial de Supabase. El segundo agrega el índice de la referencia al autorizador señalado por el asesor de rendimiento.

## Funciones, políticas y auditoría

Se modifican `private.es_admin_autorizado()`, `private.es_admin_mfa()` y `public.admin_guardar_actividad_calendario(...)`. La puerta administrativa antigua `es_admin_mfa` pasa a exigir master activo y AAL2. El RPC de calendario exige permiso de escritura sobre Calendario.

Se agregan trece funciones:

- Privadas: `proteger_cuenta_master`, `permite_modulo`, `perfil_panel_admin`, `validar_asignacion`, `auditar_autorizacion_usuario`, `admin_listar_usuarios`, `admin_autorizar_editor`, `admin_guardar_usuario` y `vincular_usuario_autorizado`.
- Wrappers públicos con `SECURITY INVOKER`: `perfil_panel_admin`, `admin_listar_usuarios`, `admin_autorizar_editor` y `admin_guardar_usuario`.

Las funciones privadas que necesitan acceder a tablas internas utilizan `SECURITY DEFINER`, `search_path` vacío y verificaciones de identidad y permiso. No se permite ejecución anónima de las RPC administrativas. Las dos tablas `admin_guard` tienen RLS activada, ningún permiso directo para `anon` o `authenticated` y ninguna política que permita lectura directa; el acceso ocurre mediante las funciones protegidas.

Se ajustan 26 políticas: 21 de las seis tablas de contenido existentes, cuatro de `storage.objects` para `eva-publico` y una de estadísticas de compartidos. INSERT, UPDATE y DELETE verifican el módulo de escritura; UPDATE comprueba tanto la fila anterior como la nueva. La lectura administrativa de borradores requiere módulo de lectura. Storage también comprueba la carpeta y el módulo. No se agregan permisos DELETE a Capacitaciones ni Calendario.

Se amplía `private.auditoria_administrativa` con `eventos text[]` y un índice de consulta por usuario y fecha. Se conservan los registros y triggers de contenido. Los nuevos triggers administrativos registran autorización, asignación/cambio de rol, asignación/cambio de módulos, activación, desactivación y modificación de permisos, incluyendo actor, fecha y datos anteriores/nuevos. El listado de usuarios muestra la última modificación disponible. Las modificaciones de una autorización y de la fila del usuario pueden producir entradas separadas del mismo flujo de auditoría, porque son recursos diferentes.

Los guardados exigen `actualizado_at` exacto. Un cambio simultáneo devuelve un error y requiere recargar; no sobrescribe silenciosamente cambios ajenos.

## Protección del master

El índice único permite una sola cuenta master. La restricción exige que esté activa. Un trigger impide borrar esa fila o cambiar UUID, correo registrado, rol, estado o módulos del master, incluso por cascada al intentar borrar la cuenta Auth. Las RPC también rechazan estos cambios y el panel muestra la cuenta protegida sin controles para degradarla o desactivarla. Ninguna RPC crea ni promueve otro master.

La transferencia del master queda fuera de las operaciones normales del panel. Requeriría una intervención técnica explícita: verificar la cuenta receptora y su MFA, respaldo de autorización/auditoría, aprobación concreta de la identidad receptora y una migración transaccional que adapte la protección y garantice un único master activo al finalizar. No se proporciona una opción ni una bandera del cliente que eluda el trigger. No se ejecutó una transferencia ni se modificaron los factores MFA de la cuenta principal.

## Archivos de esta etapa

En `crebeucayali/accesos-complementarios`:

- Modificados: `admin/admin.js`, `admin/index.html`, `admin/tests/auth-session.test.cjs`.
- Nuevos de ejecución: `admin/usuarios.js`, `admin/activacion.js`, `supabase/functions/admin-invitar-editor/index.js`.
- Nuevos de prueba: `admin/tests/admin-dom.cjs`, `admin/tests/users-panel.test.cjs`, `admin/tests/activation.test.cjs`, `admin/tests/invitation-server.test.mjs`, `admin/tests/authorization-rollback.sql`.
- SQL/documentación: los dos archivos de `docs/sql/` enumerados arriba y este informe.

En `crebeucayali/crebeucayali.github.io` no fue necesario modificar archivos: el panel sigue consumiendo la sesión compartida validada en la Etapa 2. No se modificaron estilos, páginas públicas, datos de contenido ni funciones ajenas al alcance.

## Pruebas y resultados

- **43 comprobaciones PostgreSQL conformes** mediante `admin/tests/authorization-rollback.sql`: identidad por UUID, master AAL2, rechazo de AAL1, editor sin administración ni escalada por metadatos, módulo asignado/no asignado, creación/edición/publicación/eliminación de contenido, consulta sin escritura, retiro de permisos con JWT vigente, desactivación, conflicto de guardado, trigger de master y auditoría. Incluye operaciones sintéticas de metadatos Storage, sin subir archivos. Se verifican INSERT/SELECT/UPDATE, carpeta no asignada y el predicado de la política DELETE. Supabase exige usar su API para borrar objetos: no se desactivó esa protección y no se probó una eliminación física de archivo.
- **43 pruebas de código conformes**: 21 de acceso/sesión/permisos del panel, siete de gestión de usuarios y renderizado seguro, cinco de activación y diez del servidor de invitaciones con solicitudes simuladas.
- **31 regresiones conformes** de la sesión compartida de la Etapa 2: renovación coordinada, persistencia, AAL2, errores transitorios, logout y ausencia de reenvío automático de escrituras. Renovar con los mismos permisos no recarga formularios ni borra una edición pendiente.
- Sintaxis JavaScript verificada. HTML: 157 IDs únicos, sin IDs requeridos ausentes ni eventos inline; conserva la CSP.
- Edge Function `admin-invitar-editor` desplegada activa, versión 1 y `verify_jwt=true`. Comprobación HTTP real: OPTIONS devuelve 204 y el origen permitido; POST sin sesión devuelve 401. No se llamó con datos de un editor real.
- Tras las transacciones de prueba: una cuenta Auth, una fila autorizada, un master activo y cero correos u objetos sintéticos persistentes. Las pruebas no enviaron correos. Las secuencias pueden presentar saltos normales por los INSERT revertidos; no implican registros perdidos.
- Asesores ejecutados: se corrigió el índice de clave foránea señalado. Permanecen avisos informativos de índices aún no usados y de RLS sin políticas en las tablas privadas, que corresponde al cierre deliberado del acceso directo. La advertencia previa de protección de contraseñas filtradas deshabilitada continúa; no se cambió configuración Auth fuera de esta etapa.

Las pruebas de interfaz usan un DOM simulado. No equivalen a una validación manual en navegador con la cuenta real ni a una prueba de entrega/recepción de correo.

## Incorporar editores posteriormente

1. Ingresar con la cuenta master al panel y completar MFA si la sesión lo solicita.
2. Abrir **Usuarios**. Comprobar que la cuenta principal figura como master y protegida.
3. En **Incorporar editor**, ingresar nombre y correo real y marcar únicamente los módulos autorizados. Puede dejarse sin módulos; la cuenta no podrá gestionar contenido hasta que se le asignen.
4. Pulsar **Autorizar y enviar invitación**. La función servidor valida la sesión master AAL2 con PostgREST, guarda la preautorización y pide a Supabase que envíe el enlace. La clave de servidor permanece en el entorno de la función y no llega al navegador.
5. La persona abre el enlace, define una contraseña de al menos 12 caracteres y vuelve al acceso administrativo. Inicia sesión con su contraseña, configura TOTP y obtiene AAL2 para entrar a sus módulos. La activación no reemplaza una sesión master existente en el mismo navegador.
6. Para cambiar accesos posteriormente, seleccionar **Editar**, modificar estado, rol editor/consulta y módulos y guardar. Desmarcar un módulo retira su acceso; desactivar la cuenta bloquea todo acceso administrativo. No hay controles de eliminación ni de transferencia de master.

## Riesgos y límites antes de la primera invitación real

El servicio de correo y la lista de redirecciones de Auth deben admitir la entrega a los correos reales y `https://crebeucayali.github.io/accesos-complementarios/admin/`. Esos ajustes no se pudieron verificar mediante las capacidades disponibles y no se modificaron. El éxito de despliegue no garantiza la recepción del correo. Las restricciones del SMTP predeterminado, límites de envío o una redirección no autorizada pueden impedir la incorporación.

Si una operación falla o queda sin respuesta, recargar **Usuarios** antes de reintentar. La preautorización puede quedar pendiente o la cuenta Auth haberse creado antes de un error de entrega. Una autorización pendiente activa con rol editor muestra **Enviar invitación** para reintentar cuando aún no existe cuenta Auth. Si figura **Pendiente de activación**, revisar la invitación en Supabase antes de repetir la creación; la infraestructura rechaza duplicados. No se añadió un sistema alternativo de contraseñas ni un registro público.

La advertencia previa sobre contraseñas filtradas se mantiene como riesgo detectado. La primera incorporación real requiere comprobar correo, enlace de activación y MFA de esa persona. No se creó ningún editor real durante esta etapa.
