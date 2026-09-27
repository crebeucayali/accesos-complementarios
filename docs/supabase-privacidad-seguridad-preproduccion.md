# Supabase: revisión de privacidad y seguridad previa a datos personales

## Estado general

El proyecto Supabase `crebe Project` continúa habilitado únicamente para el tratamiento de información pública de Capacitaciones.

La revisión técnica de esta fase deja el proyecto en estado:

**NO HABILITADO PARA INCORPORAR DATOS PERSONALES O SUPABASE AUTH TODAVÍA.**

Este estado no significa que exista una falla de seguridad en el uso público actual. Significa que antes de ampliar el alcance deben cerrarse controles institucionales, jurídicos y operativos que no pueden deducirse únicamente de la configuración técnica del proyecto.

## Verificaciones técnicas realizadas

- Proyecto Supabase activo y saludable.
- Región primaria verificada: `us-east-1`.
- PostgreSQL 17.
- La única tabla pública de la integración actual es `public.capacitaciones_sesiones`.
- La tabla contiene información pública y no está diseñada para datos personales.
- Row Level Security (RLS) está habilitado y forzado.
- Los roles `anon` y `authenticated` tienen únicamente permiso `SELECT`.
- No existen políticas públicas de escritura.
- No existen Edge Functions desplegadas.
- El frontend de Capacitaciones no utiliza Supabase Auth.
- El frontend utiliza clave publicable; no se detectaron `sb_secret`, `service_role` ni secretos equivalentes en el repositorio de Capacitaciones.
- Los asesores de seguridad y rendimiento de Supabase no presentan advertencias en esta revisión.

## Endurecimiento aplicado

Se creó un control privado en Supabase:

`private.supabase_preproduccion_control`

y una vista de estado:

`private.supabase_preproduccion_gate`

La vista resume los controles bloqueantes pendientes y devuelve `habilitado_para_datos_personales = false` mientras exista al menos uno sin verificar.

Estos objetos pertenecen al esquema `private` y no están disponibles para los roles públicos `anon` ni `authenticated`.

También se creó el event trigger:

`ensure_rls_public_tables`

Su función es activar RLS automáticamente cuando se creen nuevas tablas en el esquema `public`. Esto añade una barrera adicional para futuras ampliaciones, aunque cada tabla seguirá necesitando políticas y permisos definidos expresamente.

## Controles verificados

1. Región del proyecto.
2. Alcance actual limitado a datos públicos.
3. RLS en la tabla pública actual.
4. Escritura pública deshabilitada.
5. Ausencia de Edge Functions.
6. Ausencia de Supabase Auth en el frontend actual.
7. Ausencia de secretos administrativos de Supabase en el repositorio público de Capacitaciones.

## Controles pendientes antes de datos personales

### Registro de bancos de datos personales

Debe verificarse institucionalmente si el tratamiento proyectado corresponde a un banco de datos personales que deba inscribirse, modificarse o actualizarse ante el Registro Nacional de Protección de Datos Personales.

La ANPD dispone de un trámite específico para la inscripción de bancos de datos personales y señala que la inscripción es gratuita bajo el Reglamento aprobado por D.S. N.° 016-2024-JUS.

Referencia oficial:
https://www.gob.pe/8060

### Flujo transfronterizo

El proyecto está desplegado en `us-east-1`. Supabase indica que cada proyecto se aloja en una región primaria y que Postgres, Auth y Storage principales se ubican en esa región, aunque copias de seguridad, registros, servicios externos y subencargados también pueden influir en el análisis de residencia de datos.

Por ello, antes de almacenar datos personales originados en Perú debe evaluarse institucionalmente el flujo transfronterizo y la obligación de comunicarlo o registrarlo cuando corresponda.

Referencia ANPD:
https://www.gob.pe/9253-inscribir-flujo-transfronterizo-de-datos-personales

Referencia Supabase:
https://supabase.com/docs/guides/security/gdpr-compliance

### Proveedor, DPA y subencargados

Debe revisarse la documentación contractual aplicable de Supabase, incluyendo el acuerdo de tratamiento de datos cuando corresponda, sus proveedores/subencargados y los términos del plan utilizado.

Supabase describe la seguridad como una responsabilidad compartida: la plataforma protege la infraestructura, mientras que el responsable de la aplicación debe gestionar datos, accesos, políticas y controles.

Referencias:
https://supabase.com/docs/guides/deployment/shared-responsibility-model
https://supabase.com/legal/dpa

### Conservación y eliminación

Antes de incorporar datos personales debe definirse:

- finalidad de cada dato;
- plazo de conservación;
- criterio de eliminación o anonimización;
- procedimiento para atender solicitudes de supresión, rectificación u oposición;
- tratamiento de copias o respaldos cuando resulte aplicable.

### Acceso administrativo

Debe documentarse:

- quiénes podrán administrar Supabase;
- qué nivel de acceso necesita cada responsable;
- principio de mínimo privilegio;
- uso de MFA para cuentas administrativas cuando corresponda;
- procedimiento de alta, baja y revisión periódica de accesos.

### Documento de seguridad e incidentes

Supabase debe incorporarse al documento o procedimiento interno de seguridad que corresponda, incluyendo:

- inventario del servicio;
- clasificación de la información;
- responsables;
- controles de acceso;
- gestión de credenciales;
- respuesta a incidentes;
- notificación y escalamiento;
- revisión de logs cuando corresponda.

### Supabase Auth

Supabase Auth permanece fuera de alcance en esta etapa.

Antes de activarlo deben definirse:

- finalidad de las cuentas;
- quiénes podrán registrarse;
- datos mínimos de identificación;
- método de autenticación;
- política de recuperación de acceso;
- duración y persistencia de sesiones;
- cierre de sesión;
- MFA para perfiles administrativos;
- políticas RLS asociadas a cada rol;
- información y consentimiento cuando corresponda.

### Storage

Supabase Storage no se usa actualmente para datos personales.

Si se incorpora más adelante, deberán definirse buckets privados/públicos, políticas RLS, tipos de archivos permitidos, conservación, eliminación y controles específicos para impedir exposición accidental.

### Respaldo y recuperación

Antes de depender de Supabase para información personal o administrativa debe establecerse el nivel de continuidad requerido, qué mecanismos de respaldo se utilizarán y cómo se recuperará la información ante un incidente.

## Regla de avance

No se debe pasar a un panel administrativo con Auth o a formularios que almacenen datos personales en Supabase mientras la vista:

`private.supabase_preproduccion_gate`

mantenga:

`habilitado_para_datos_personales = false`

La modificación de ese estado exige evidencia de que los controles bloqueantes fueron revisados y cerrados. El cambio de estado debe documentarse; no debe marcarse un control como verificado únicamente para habilitar una funcionalidad.

## Situación del uso público actual

El uso actual de Supabase para Capacitaciones puede continuar porque:

- consulta información pública;
- no requiere Auth;
- no crea cuentas;
- no utiliza información personal;
- el acceso desde el navegador es de solo lectura;
- existe RLS y permisos mínimos.

## Alcance de esta revisión

Esta revisión organiza controles técnicos y administrativos del proyecto. No sustituye la evaluación institucional o jurídica que corresponda ni la inscripción, comunicación o actualización ante autoridades cuando sea exigible.
