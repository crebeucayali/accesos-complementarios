# Etapa 4C — Consulta administrativa por periodo

## Objetivo

Permitir que el panel administrativo consulte las estadísticas EVA por periodos definidos sin modificar el mecanismo de registro de visitas ni recopilar datos adicionales.

## Periodos disponibles

La consulta administrativa permite alternar entre:

- últimos 7 días;
- últimos 30 días;
- últimos 90 días;
- todo el historial disponible.

## Backend

Se incorporó el RPC:

`public.estadisticas_visitas_eva_periodo(p_periodo text)`

Valores permitidos de `p_periodo`:

- `7d`
- `30d`
- `90d`
- `historico`

El RPC devuelve:

- periodo seleccionado;
- fecha inicial;
- fecha final;
- número de sesiones EVA del intervalo;
- visitas acumuladas por módulo dentro del mismo intervalo.

La función exige administrador autorizado con MFA AAL2.

Permisos comprobados:

- `anon`: sin EXECUTE;
- `authenticated`: EXECUTE permitido, manteniéndose la validación interna AAL2;
- `service_role`: EXECUTE permitido.

## Panel administrativo

El bloque **Visitas por acceso** dispone ahora de un selector de periodo.

Al cambiar de periodo se actualizan:

- sesiones EVA del intervalo;
- rango exacto de fechas;
- visitas de cada módulo;
- participación porcentual de cada módulo dentro de los accesos del intervalo.

Las gráficas generales incorporadas en 4B permanecen sin cambios:

- evolución mensual de los últimos 6 meses;
- actividad diaria de los últimos 30 días;
- métricas globales Total EVA, Hoy, Últimos 7 días y Mes actual.

## Interpretación

Una sesión EVA puede acceder a varios módulos. Por ello:

- **Sesiones EVA del periodo** representa sesiones aproximadas del navegador;
- **Visitas por acceso** representa primeras entradas a módulos dentro de esas sesiones;
- **Participación** representa el peso relativo de cada módulo dentro del total de accesos a módulos del periodo.

No debe interpretarse la participación como porcentaje de personas.

## Privacidad

La Etapa 4C no incorpora nuevas categorías de datos.

No se almacenan:

- identidad;
- correo;
- dirección IP;
- ubicación;
- huella de navegador;
- historial individual de navegación.

## Verificación

Se comprobó que:

- los periodos 7, 30 y 90 días devuelven un rango correcto;
- la consulta histórica utiliza como inicio la primera fecha disponible;
- con los datos actuales los cuatro periodos devuelven 5 sesiones EVA, porque toda la medición existente corresponde al 27 de septiembre de 2026;
- `anon` no puede ejecutar el RPC;
- el JavaScript administrativo compila correctamente;
- el panel carga `admin.css?v=10` y `admin.js?v=27`.

## Alcance

Esta etapa refina la consulta administrativa. No modifica las 60 páginas instrumentadas, la sesión de 30 minutos ni el registro agregado en Supabase.
