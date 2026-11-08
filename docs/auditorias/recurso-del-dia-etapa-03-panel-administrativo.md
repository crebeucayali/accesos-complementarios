# Recursos del día - Etapa 03: pestaña administrativa

Fecha: 8 de noviembre de 2026 (America/Lima).
Rama de desarrollo: `feature/eva-recurso-dia-etapa-02`.
Esquema Supabase previo: `20261108144059_eva_recurso_dia_etapa_02_programacion_segura`.

## Alcance implementado

Se incorporó en `admin/index.html` una pestaña "Recursos del día", restringida a Master + MFA AAL2, dentro de Gestión de contenidos.

- Selector mensual con calendario de días reales, incluyendo febrero y meses de 30/31 días.
- Cada día muestra el estado y permite seleccionar fecha. La tabla inferior muestra todos los registros del mes.
- Formulario para un solo recurso LSP **o** ARASAAC por fecha, con ID de fuente, título, descripción, texto alternativo, URL fuente, atribución, licencia y referencia documental; incluye casillas de revisión pedagógica y derechos.
- Registro de borradores y edición de borradores o retirados, con validación de identificadores y URL HTTPS.
- Opción de guardar "programado" y "publicado" **deshabilitada intencionalmente**: no se publicarán recursos antes de completar la integración de fuentes de la etapa 04 y el motor de fecha de etapa 05.
- Consultas por rango de mes a `eva_recurso_dia_programacion` mediante el cliente de sesión administrativo existente, sin claves privadas. No hay nuevas tablas, RPC, permisos RLS ni escrituras de datos ficticios en producción.
- Al perder autorización se limpian valores privados y se bloquean controles. La consulta comprueba continuidad de la misma identidad tras la petición.

## Archivos

- `admin/index.html`: navegación, formulario, calendario y listado, referencia al nuevo script.
- `admin/admin.js`: módulo permitido solo para Master AAL2, se integra en navegación, configuración y limpieza de sesión.
- `admin/recurso-dia.js`: carga, renderizado y edición segura de borradores.
- `admin/admin.css`: estilos responsivos y alto contraste limitados al nuevo panel.
- `admin/tests/recurso-dia-etapa-03-browser.cjs`: prueba aislada con datos simulados en memoria.
- `.github/workflows/recurso-dia-etapa-03.yml`: ejecución automatizada sin despliegue de páginas públicas.

## Validación

GitHub Actions: https://github.com/crebeucayali/accesos-complementarios/actions/runs/42492123212 .

La ejecución fue satisfactoria a 1280, 768, 390 y 320 px. Se verificó creación y edición de borradores, cambio de fecha, 31 días de diciembre, inhabilitación de programación, bloqueo sin Master y ausencia de errores JavaScript. Las llamadas REST del ensayo fueron simuladas; **no se introdujeron datos reales**.

La etapa 02 ya confirmó las políticas RLS y bloqueos en PostgreSQL mediante pruebas transaccionales. Se debe verificar el proceso completo con una sesión Master real, sin publicar registros, en la siguiente revisión administrativa.

## Límites y continuidad

- **Etapa 04**: conectar selector gráfico real al diccionario BDA y a ARASAAC; permitir vista previa e identificación de licencia y atribución validadas.
- **Etapa 05**: automatizar la lectura diaria y completar autorización final de programación.
- **Etapa 06**: definir ubicación y crear tarjeta pública.
- No se modifica ni se activa la portada EVA.
- Derechos de republicación de imágenes LSP continúan pendientes de verificación documental.

## Reversión

El cambio del panel puede revertirse mediante el commit de integración o retirando la pestaña, sus scripts y estilos, sin afectar la tabla de Supabase creada en etapa 02. El esquema y los datos de la base no dependen del HTML.
