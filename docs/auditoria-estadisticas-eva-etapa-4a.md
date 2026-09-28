# Auditoría de estadísticas EVA — Etapa 4A

Fecha de auditoría: 27 de septiembre de 2026.

## Objetivo

Verificar la cobertura real del sistema de estadísticas del Ecosistema Virtual Accesible, la coherencia de los identificadores de módulo, el mecanismo de prevención de doble conteo en el navegador, la persistencia en Supabase y los controles de seguridad existentes.

Esta etapa es exclusivamente de auditoría. No modifica la lógica pública de conteo.

## Cobertura verificada

| Módulo | Páginas instrumentadas |
| --- | ---: |
| Plataforma principal | 3 |
| Accesos Complementarios | 17 |
| Capacitaciones | 3 |
| Materiales Educativos Accesibles | 11 |
| Banco Digital Accesible | 13 |
| Repositorio Accesible | 1 |
| Noti Inclusivos | 9 |
| DUA 3.0 | 3 |
| **Total** | **60** |

Los ocho identificadores utilizados por el frontend coinciden con la lista permitida por el script y por Supabase:

- `principal`
- `capacitaciones`
- `bda`
- `mea`
- `noti_inclusivos`
- `repositorio_accesible`
- `dua_3`
- `accesos_complementarios`

### Exclusiones verificadas

No forman parte de las 60 páginas públicas contabilizadas:

- `crebeucayali.github.io/pruebas/buscador-accesible/index.html`: ruta de traslado marcada `noindex`;
- archivos de verificación de Google;
- `accesos-complementarios/admin/index.html`: panel privado marcado `noindex`;
- `banco-digital-accesible/docs/referencias/logo-ruta-base.html`: referencia técnica, no página pública navegable.

## Funcionamiento del navegador

El script central `estadisticas/visitas-eva.js` utiliza `localStorage["eva_visitas_sesion_v1"]`.

La lógica comprobada es:

1. una sesión EVA nueva comienza después de 30 minutos de inactividad;
2. dentro de la sesión, cada módulo se contabiliza una sola vez;
3. una recarga no vuelve a incrementar el módulo si continúa la misma sesión;
4. la actividad del usuario actualiza el momento de última actividad;
5. todos los repositorios públicos comparten el mismo origen `crebeucayali.github.io`, por lo que utilizan la misma sesión local.

## Flujo en Supabase

El navegador inserta un evento efímero en `public.eva_visitas_eventos`.

El trigger `eva_visitas_eventos_registrar`, ejecutado antes del INSERT, llama a `private.registrar_visita_eva_evento()`.

La función incrementa:

- `__eva__` cuando comienza una nueva sesión EVA;
- el identificador del módulo cuando se accede por primera vez a ese módulo durante la sesión.

El trigger devuelve `NULL`, por lo que el evento individual no queda persistido. Durante la auditoría:

- filas persistidas en `eva_visitas_eventos`: **0**.

La tabla agregada `public.eva_visitas_diarias` posee clave primaria única `(fecha, modulo)`, por lo que existe como máximo una fila diaria por identificador y los incrementos se acumulan sobre ella.

RLS está habilitado y forzado tanto en `eva_visitas_diarias` como en `eva_visitas_eventos`.

## Datos existentes al momento de la auditoría

La información disponible comienza el 27 de septiembre de 2026.

Sesiones EVA acumuladas:

- `__eva__`: 5.

Accesos de módulo registrados:

- Accesos Complementarios: 4;
- Plataforma principal: 3;
- Repositorio Accesible: 2;
- Capacitaciones: 1;
- Materiales Educativos Accesibles: 1.

Los módulos que todavía no presentan registros no se consideran fallas de instrumentación: el código de seguimiento está presente en sus páginas públicas.

## Estadísticas administrativas

`public.estadisticas_visitas_eva()` exige autorización administrativa y MFA AAL2.

Actualmente devuelve:

- total histórico;
- hoy;
- últimos 7 días;
- mes actual;
- acumulado por módulo;
- serie diaria de los últimos 30 días.

El panel administrativo utiliza el resumen y el acumulado por módulo, pero **todavía no representa visualmente la serie diaria de 30 días**. Este dato ya existe en backend y constituye una mejora directa para la Etapa 4B.

## Hallazgos técnicos

### 1. Cobertura pública completa

La cobertura prevista está completa: **60/60 páginas**. No se encontraron identificadores de módulo incorrectos.

### 2. Protección contra duplicados agregados

La clave primaria `(fecha, modulo)` evita filas duplicadas para un mismo módulo y día. Los incrementos se realizan mediante `ON CONFLICT ... DO UPDATE`.

### 3. Limitación propia de localStorage

Si el usuario elimina, bloquea o impide `localStorage`, el navegador no puede conservar la sesión y puede producir conteos adicionales. Es una limitación ya asumida por el diseño y debe mantenerse documentada.

### 4. Posible carrera entre pestañas simultáneas

La deduplicación de sesión se realiza en el navegador. Dos pestañas abiertas exactamente al mismo tiempo podrían leer el estado anterior antes de que la otra lo actualice y generar un incremento adicional. No se observó evidencia de este caso en los datos actuales, pero técnicamente es posible.

### 5. Endpoint público susceptible a llamadas artificiales

`eva_visitas_eventos` está diseñado para aceptar inserciones anónimas desde las páginas públicas. RLS restringe los módulos admitidos y exige que el evento represente nueva sesión o nuevo módulo, pero no existe un identificador de sesión del lado del servidor que permita deduplicar solicitudes artificiales.

Por ello, las cifras deben seguir interpretándose como métricas operativas y no como personas únicas verificadas.

### 6. Infraestructura histórica residual

Durante la auditoría 4A existían `private.eva_visitas_diarias` y el RPC histórico `public.registrar_visita_eva(...)`.

Este punto quedó resuelto en la Etapa 5 de consolidación:

- el RPC obsoleto fue eliminado;
- la tabla fue renombrada a `private.eva_visitas_diarias_legacy`;
- sus 2 registros históricos se conservaron para trazabilidad;
- la tabla legacy no participa en los contadores actuales.

### 7. Seguridad

El asesor de seguridad de Supabase no detectó nuevas observaciones asociadas al sistema de estadísticas. Permanece únicamente la advertencia general preexistente sobre protección frente a contraseñas filtradas, ajena a esta auditoría.

## Resultado de la Etapa 4A

Estado: **AUDITADA**.

- Cobertura: 60/60 páginas previstas.
- Identificadores: 8/8 correctos.
- Eventos individuales persistidos: 0.
- Agregación diaria: consistente.
- RLS: activo y forzado en las tablas públicas del contador.
- Panel administrativo: operativo, con una serie de 30 días disponible en backend pero aún no visualizada.
- Cambios en la lógica de conteo durante 4A: ninguno.

## Siguiente etapa

La Etapa 4B puede concentrarse en mejorar la información presentada al administrador, aprovechando primero datos que ya existen y evitando aumentar innecesariamente la recopilación de información.
