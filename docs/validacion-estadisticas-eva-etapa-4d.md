# Etapa 4D — Validación integral del sistema de estadísticas EVA

Fecha de validación: 27 de septiembre de 2026.

## Objetivo

Comprobar de extremo a extremo el funcionamiento del sistema de estadísticas EVA sin contaminar los datos reales.

La validación cubrió:

1. instrumentación pública;
2. registro anónimo permitido;
3. trigger de agregación;
4. ausencia de persistencia del evento individual;
5. contador público;
6. consultas administrativas;
7. bloqueo de eventos inválidos;
8. estado final de los datos;
9. controles de seguridad.

## Cobertura pública

Se verificaron nuevamente los ocho módulos:

| Módulo | Páginas verificadas |
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

No se encontraron identificadores `data-eva-modulo` incorrectos.

Las tres páginas de DUA 3.0 se verificaron directamente:

- `index.html`;
- `recursos.html`;
- `evolucion.html`.

Todas cargan el script central y utilizan `data-eva-modulo="dua_3"`.

## Validación del frontend

Se comprobó que `estadisticas/visitas-eva.js` compila correctamente.

La lógica activa mantiene:

- sesión de 30 minutos;
- un único conteo por módulo dentro de la sesión;
- envío de eventos a `/rest/v1/eva_visitas_eventos`;
- uso compartido de la sesión local entre los módulos del dominio EVA.

También se comprobó que `admin/admin.js` compila correctamente y contiene:

- consulta general `estadisticas_visitas_eva`;
- consulta por periodo `estadisticas_visitas_eva_periodo`;
- selector 7/30/90 días/histórico;
- renderizado de evolución mensual, diaria y distribución por módulo.

## Prueba reversible de extremo a extremo

Antes de la prueba:

- sesiones EVA del día: **5**;
- visitas BDA del día: **0**;
- eventos individuales persistidos: **0**.

Se abrió una transacción y se cambió temporalmente al rol `anon`.

Se insertó un evento válido:

- módulo: `bda`;
- nueva sesión: `true`;
- nuevo módulo: `true`.

Durante la transacción se observó:

- sesiones EVA: **6**;
- visitas BDA: **1**;
- eventos individuales persistidos: **0**.

Esto confirmó que:

1. el rol público puede enviar un evento válido;
2. RLS permite únicamente la operación prevista;
3. el trigger `eva_visitas_eventos_registrar` se ejecuta;
4. `private.registrar_visita_eva_evento()` incrementa los agregados;
5. el evento individual no queda almacenado.

A continuación se ejecutó `ROLLBACK`.

Después de la reversión:

- sesiones EVA: **5**;
- visitas BDA: **0**;
- eventos persistidos: **0**.

Por tanto, la validación no agregó visitas artificiales al sistema real.

## Validación de eventos inválidos

Se probaron dos solicitudes bajo rol `anon`.

### Módulo no permitido

Intento:

`modulo_invalido + nueva_sesion=true + nuevo_modulo=true`

Resultado:

`Módulo EVA no permitido`

La operación fue rechazada.

### Evento sin acción

Intento:

`principal + nueva_sesion=false + nuevo_modulo=false`

Resultado:

`Evento EVA sin acción`

La operación fue rechazada.

Ninguna prueba inválida modificó los agregados.

## Contador público

Se ejecutó `public.contador_visitas_eva()` con rol `anon`.

Resultado:

- total EVA: **5**;
- hoy: **5**.

El contador público tiene permiso de ejecución para `anon`, como requiere la portada pública.

## Estadísticas administrativas

Permisos verificados:

- `anon` puede ejecutar `contador_visitas_eva()`;
- `anon` **no** puede ejecutar `estadisticas_visitas_eva()`;
- `anon` **no** puede ejecutar `estadisticas_visitas_eva_periodo(text)`;
- `authenticated` puede ejecutar los RPC administrativos, que además verifican autorización y MFA AAL2 internamente.

## RLS y flujo de escritura

Las políticas actuales son:

### `public.eva_visitas_diarias`

Lectura para `anon` y `authenticated`.

No existe escritura pública directa.

### `public.eva_visitas_eventos`

Inserción para `anon` y `authenticated` únicamente cuando:

- el módulo pertenece a la lista de ocho módulos EVA;
- `nueva_sesion=true` o `nuevo_modulo=true`.

El trigger realiza la agregación y devuelve `NULL`, por lo que la tabla de eventos continúa vacía.

## Estado final

Al finalizar 4D:

- total EVA: **5**;
- hoy: **5**;
- BDA hoy: **0**;
- eventos individuales persistidos: **0**.

No quedaron datos de prueba.

## Seguridad

El asesor de seguridad no reportó nuevas observaciones relacionadas con Estadísticas EVA.

Permanece únicamente la advertencia general preexistente:

`Leaked Password Protection Disabled`

Esta advertencia pertenece a la configuración general de Auth y no fue modificada durante la Etapa 4D.

## Resultado

Estado de la Etapa 4D: **VALIDADA**.

El recorrido público → evento → trigger → agregado → contador → consulta administrativa funciona de forma coherente.

No se requieren cambios adicionales en el sistema de estadísticas para cerrar la Etapa 4.
