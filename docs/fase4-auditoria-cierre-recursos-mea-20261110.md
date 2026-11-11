# Fase 4. Auditoría y cierre técnico de estadísticas de MEA
Fecha de referencia: 10 de noviembre de 2026, Perú.

## Alcance revisado
- Instrumentación existente de MEA: seis herramientas y siete acciones descargables o exportables.
- Backend: `eva_recursos_api.mea_acciones_diarias`, `eva_recursos_api.mea_eventos_recientes`, `public.registrar_accion_recurso_mea` y `public.admin_estadisticas_recursos_mea`.
- Panel administrativo: sección `Uso de recursos`, filtros de 7, 30, 90 y 365 días, sumarios, gráfica y tabla.
- Sesión master MFA AAL2, cierre de sesión, accesibilidad móvil y alto contraste, y separación frente a estadísticas de visitas.

## Datos reales consultados (solo lectura)
Al momento de la auditoría:
- `pictogramas/png/descarga_solicitada`: 1 acción del 2026-11-10, asociada a la prueba de descarga comunicada por el responsable. La base **no** almacena la palabra buscada.
- Contador universal histórico EVA: 1241 sesiones; contador módulo MEA: 414 accesos. Son métricas distintas que no deben sumarse ni confundirse.
- No se añadieron eventos de prueba a Supabase de producción durante esta auditoría.

## Seguridad
- Las tablas del esquema privado `eva_recursos_api` mantienen RLS sin permiso directo SELECT para `anon` ni `authenticated`.
- El RPC de registro es `SECURITY INVOKER` y accesible para envío anónimo, con validación del lado servidor.
- La consulta administrativa es `SECURITY INVOKER` y no accesible a `anon`; su implementación interna aplica `private.es_admin_mfa()`.
- El cliente administrativo también comprueba `perfil.rol === "master"` y `aal === "aal2"`, pero la comprobación determinante reside en el backend.
- Las tablas estadísticas no contienen nombres, correos, palabras, imágenes personalizadas ni identificadores permanentes de visitantes. UUID de evento efímeras se usan para deduplicación.
- La precisión del contador anónimo está limitada ante solicitudes automatizadas y no prueba descargas terminadas o visitantes únicos.

## Hallazgo corregido en fase 4
El módulo del panel no invalidaba explícitamente las solicitudes anteriores al configurar sucesivamente una nueva cuenta master. Se corrigió para limpiar resultados e invalidar peticiones previas al cambiar el contexto de autorización. También se restablecen indicadores de estado y botón al limpiar, evitando retener mensajes o deshabilitaciones de otra sesión. Se evita mostrar mensajes crudos del backend en la interfaz pública del módulo.

## Validaciones
- GitHub Actions: https://github.com/crebeucayali/accesos-complementarios/actions/runs/42952507229
- `admin.js` y `estadisticas-recursos.js`: sintaxis Node aprobada.
- Chromium escritorio y móvil simulado: casos de datos, selección de periodo, vacío, HTTP/error, usuario no autorizado, respuestas atrasadas, cambio de master y limpieza, alto contraste y control de desbordamiento. Ejecución aprobada.
- La verificación automatizada del backend de fase 2 (PostgreSQL temporal) ya probó siete acciones autorizadas, deduplicación por UUID, fecha de Perú y denegación de lectura sin permisos.
- Solo comprobaciones de lectura en Supabase real; no se insertaron eventos falsos.

## Advertencias generales fuera del alcance
El asesor de seguridad de Supabase señala dos funciones administrativas públicas `SECURITY DEFINER` de calendario cívico y reenvío de invitaciones, y que la protección de contraseñas filtradas no está activa. Deben evaluarse en su propia intervención de seguridad, sin modificar sus permisos o la autenticación a ciegas durante esta fase. El aviso `RLS Enabled No Policy` de tablas privadas es coherente con su protección por funciones internas y revocación de SELECT; no se añadió una política pública.

## Alcances no certificados
- No se utilizó una cuenta master real para realizar la prueba de extremo a extremo del panel protegido, pues requiere credenciales y segundo factor del administrador.
- La interfaz se validó mediante Chromium con DOM y datos simulados, sin sustituir inspección humana en teléfono/PC, lectores de pantalla o contraste visual del sitio con sesión real.
- Propagación de GitHub Pages/CDN, posibles cachés de navegador y comportamientos específicos del hardware no se certifican sólo por fusionar el código.
- La única acción real de descarga contrastada corresponde a pictogramas PNG; otras seis combinaciones cuentan con pruebas simuladas/automatizadas, no con descargas humanas verificadas individualmente.

## Criterio de cierre
Cierre de **implementación y auditoría automatizada** sujeto a una última prueba operativa: iniciar sesión master con MFA AAL2, abrir Seguimiento > Uso de recursos, seleccionar 30 días, verificar la acción de pictogramas PNG, cambiar a 7/90/365 días y cerrar sesión. Si se detecta discrepancia, reabrir la incidencia y verificar el RPC sin generar datos artificiales.

## Continuidad
Después del cierre operativo, ampliar el seguimiento a BDA si se justifica, manteniendo estadísticas de recursos independientes de visitas. Las descargas físicas de RA y las aperturas de Drive de CAP requieren otro tipo de indicador.
