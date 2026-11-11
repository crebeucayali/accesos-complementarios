# Cierre técnico previo a publicación: estadísticas EVA

Fecha: 10 de noviembre de 2026 (hora de Perú).

## Alcance conservado
- Contador universal `__eva__` y ocho contadores por módulo.
- Sesiones de 30 minutos, y una entrada a cada módulo por sesión.
- Estadísticas agregadas por fecha y módulo; no se registran IP, usuarios ni historiales individuales.
- Panel administrativo y MFA AAL2 sin cambios.
- Hitos cada 1000 sesiones globales; la ventana aparece solamente al evento que cruza el umbral.

## Corrección de backend aplicada
Migración `aislar_funcion_publica_visitas_eva` aplicada al proyecto Supabase CREBE.
- La entrada pública `public.registrar_visita_eva_hito(text,boolean,boolean)` mantiene su firma y permisos `anon` y `authenticated`.
- Ahora funciona como `SECURITY INVOKER`; la operación elevada se ejecuta en `eva_counter_api.registrar_visita_eva_hito_interna`, un esquema no publicado en el Data API.
- El único objeto privilegiado del esquema nuevo es la función del contador, con validación de módulo y acción.
- La migración no modifica ningún dato histórico ni los nombres de RPC públicos.
- El asesor de Supabase ya no señala una función pública `SECURITY DEFINER` para visitas.
- Inmediatamente después, los agregados `__eva__` conservaban 1237 sesiones y la tabla de eventos efímeros conservaba 0 filas.

## Corrección frontend preparada y sin publicar
En la PR #23 (borrador):
- coordinación entre pestañas por Web Locks cuando existe;
- confirmación local después del éxito HTTP;
- espera limitada antes de reintentar fallos HTTP.
- casos Node y navegador Playwright con transporte Supabase simulado.

## Pruebas sin escribir visitas reales
- PostgreSQL 17 temporal en GitHub Actions: migración, permisos `anon`, incremento global, incremento individual, rechazos de entradas inválidas y hito de 1000.
- Node: seis pruebas para recargas, red, concurrencia, varios módulos, expiración de sesión y fallback sin Web Locks.
- Chromium/Playwright: dos pestañas, recarga, fallo HTTP y recuperación; solicitudes interceptadas.

## Riesgos conocidos: no confundir con fallas ocultas
- **Autenticidad de tráfico:** el conteo anónimo público puede ser activado artificialmente por solicitudes automatizadas. No hay prueba técnica de persona humana; no presentar las cifras como visitantes únicos.
- **Respuesta perdida después del incremento:** el servidor puede registrar una visita aunque el navegador no reciba la respuesta. El reintento de esta versión puede contabilizarla de nuevo. Una garantía de idempotencia necesita identificadores efímeros de evento y almacenamiento temporal o mecanismo equivalente, con una revisión previa de privacidad.
- **Navegadores sin Web Locks:** pueden darse carreras entre pestañas.
- **Avisos ajenos al contador:** los RPC de calendario cívico y reenvío de invitaciones requieren su propio control de permisos MFA; las contraseñas filtradas son una configuración separada de Auth.
- **Caché:** varios repositorios cargan el script compartido con un parámetro de versión. Cualquier publicación de la modificación del script exige revisar invalidación de caché y regresión intermodular.

## Decisión de publicación
La migración del backend es compatible y ya está activa.
La modificación de JavaScript permanece aislada en la PR #23; no fusionar ni habilitarla automáticamente solo por pruebas simuladas. Antes de publicar, decidir explícitamente cómo manejar el riesgo de respuestas HTTP ambiguas (política de reintento o idempotencia), comprobar el caché entre repositorios y aceptar documentadamente el carácter aproximado de las sesiones.
No corresponde iniciar métricas de descargas hasta cerrar este punto.

## Próxima etapa
Una vez cerrado el contador, inventariar recursos descargables de MEA, BDA y los enlaces externos de CAP. Registrar acciones agregadas por recurso y día, sin identificar personas. RA debe contabilizar consultas de fichas, no descargas de materiales físicos.
