# Criterio para banner y consentimiento global

## Estado actual

El Ecosistema Virtual Accesible (EVA) se mantiene **sin banner global de cookies o consentimiento** mientras el inventario técnico no identifique tecnologías no esenciales que deban activarse antes de una elección del usuario.

Esta decisión no significa que el ecosistema carezca de almacenamiento local o servicios externos. Significa que, en el estado auditado, las tecnologías propias identificadas se utilizan para funciones de accesibilidad, preferencias locales, continuidad de uso, prevención de duplicados o funciones educativas específicas.

Los tratamientos opcionales que sí requieren una decisión del usuario se resuelven de forma contextual en la función correspondiente:

- **Firma tu visita:** autorización específica antes del envío del formulario.
- **Seguimiento Braille:** consentimiento específico y opcional antes del envío estadístico.
- **Google Drive en Capacitaciones:** aviso y confirmación antes de cargar la vista previa externa.

## Fuente técnica de estado

El archivo `privacidad/estado-consentimiento.json` conserva el estado actual del ecosistema y los disparadores que obligan a revisar nuevamente la necesidad de un banner o gestor de consentimiento.

Este archivo es un registro de gobernanza técnica. No se carga en el navegador ni instala cookies, almacenamiento o componentes visuales.

## Cuándo debe revisarse este criterio

Antes de publicar cualquiera de las siguientes incorporaciones debe realizarse una nueva revisión:

1. Analítica web no esencial.
2. Publicidad, marketing o remarketing.
3. Píxeles, etiquetas o seguimiento entre sitios.
4. Nuevas cookies o almacenamiento no estrictamente funcional.
5. Inicio de sesión, autenticación o sesiones persistentes.
6. SDK o scripts de terceros que se ejecuten automáticamente.
7. Uso de Supabase en el cliente, especialmente Auth, sesiones o tratamiento de datos personales.
8. Cambios relevantes en proveedores, finalidades o flujos de datos.

## Procedimiento de revisión

Cuando aparezca uno de los disparadores anteriores:

1. Identificar exactamente qué datos y tecnologías se incorporan.
2. Determinar si se ejecutan antes de una acción voluntaria del usuario.
3. Revisar si son necesarias para la función solicitada o si son opcionales.
4. Actualizar el inventario de tecnologías.
5. Actualizar la Política de privacidad y la Política de cookies y tecnologías similares.
6. Determinar si corresponde consentimiento previo.
7. Si corresponde, implementar el gestor o banner antes de habilitar la nueva tecnología en producción.
8. Verificar que rechazar una tecnología opcional no bloquee funciones que no dependan de ella.

## Regla de implementación

No se debe añadir un banner genérico solo por existir `localStorage`, enlaces externos o servicios bajo demanda. La interfaz de consentimiento debe responder a tecnologías concretas y a su forma real de funcionamiento.

Tampoco debe incorporarse una nueva tecnología no esencial y dejar la revisión para después de publicarla. La revisión de privacidad forma parte del paso previo a producción.

## Última revisión

26 de septiembre de 2026.
