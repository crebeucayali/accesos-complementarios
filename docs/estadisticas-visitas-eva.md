# Estadísticas de visitas EVA

## Objetivo

El Ecosistema Virtual Accesible utiliza un contador central de visitas para conocer el uso general del EVA y de sus accesos principales sin crear perfiles individuales de visitantes.

La regla operativa es:

- una nueva visita EVA comienza después de 30 minutos de inactividad;
- dentro de una misma visita, cada acceso principal se contabiliza como máximo una vez;
- recargar una página no genera una nueva visita mientras la sesión siga activa.

## Accesos incluidos

- Plataforma principal
- Capacitaciones
- Banco Digital Accesible
- Materiales Educativos Accesibles
- Noti Inclusivos
- Repositorio Accesible
- DUA 3.0
- Accesos Complementarios

## Control en el navegador

El script central es:

`estadisticas/visitas-eva.js`

Utiliza:

`localStorage["eva_visitas_sesion_v1"]`

para conservar únicamente:

- momento de inicio de la sesión;
- última actividad;
- accesos ya contabilizados durante esa sesión.

No almacena nombre, correo, ubicación ni una identidad de usuario.

El estado se renueva cuando han transcurrido 30 minutos de inactividad.

## Registro en Supabase

La tabla privada:

`public.eva_visitas_diarias`

almacena únicamente datos agregados:

- fecha;
- identificador del módulo;
- número de visitas.

No se guarda en esta tabla un identificador del visitante, correo, ubicación ni dirección IP.

## Registro público protegido

El navegador envía una inserción a:

`public.eva_visitas_eventos`

La tabla funciona como endpoint efímero. Un trigger privado incrementa `public.eva_visitas_diarias` y cancela la inserción, de modo que el evento individual no queda almacenado.

La tabla agregada permite lectura de los conteos, pero no escritura directa desde el navegador.

`public.contador_visitas_eva()`

devuelve únicamente:

- total histórico;
- visitas del día.

La plataforma principal utiliza este RPC para mostrar el contador público del EVA.

## Estadísticas administrativas

`public.estadisticas_visitas_eva()`

requiere administrador autorizado con MFA AAL2 y devuelve:

- total EVA;
- visitas de hoy;
- últimos 7 días;
- mes actual;
- visitas acumuladas por acceso;
- serie diaria de los últimos 30 días.

El panel administrativo presenta el resumen y el detalle por acceso.

## Limitaciones

Este contador representa sesiones aproximadas del navegador, no personas únicas.

Puede variar por factores como:

- eliminación o bloqueo de localStorage;
- uso de navegadores o dispositivos diferentes;
- automatizaciones o solicitudes artificiales;
- interrupciones de red.

Por ello debe interpretarse como una métrica operativa de uso y no como un censo exacto de personas.


## Cobertura final por repositorio

La instrumentación se aplicó por etapas y quedó distribuida de la siguiente manera:

| Módulo | Páginas públicas instrumentadas |
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

Todas estas páginas utilizan el mismo control de sesión de 30 minutos y uno de los ocho identificadores admitidos por el sistema.

### Exclusiones intencionales

No se contabilizan como visitas públicas:

- el panel administrativo de Accesos Complementarios;
- la antigua ruta de prueba/redirección del buscador, marcada `noindex`;
- el archivo técnico de verificación de Google;
- fragmentos HTML generados exclusivamente para descargas locales que no constituyen páginas navegables.

En la plataforma principal, además de la portada, se contabilizan como `principal`:

- el Buscador unificado de EVA;
- Tarjetas educativas accesibles.

La tarjeta pública **Visitas al EVA** permanece únicamente en el footer de la plataforma principal. El resto de páginas registra la visita sin mostrar un contador individual.



## Auditoría Etapa 4A

La auditoría integral del sistema de estadísticas realizada el 27 de septiembre de 2026 confirmó la cobertura de las 60 páginas públicas previstas, los ocho identificadores de módulo y el funcionamiento del flujo agregado en Supabase.

El informe técnico completo se encuentra en:

[Auditoría de estadísticas EVA — Etapa 4A](auditoria-estadisticas-eva-etapa-4a.md)


## Etapa 4B — mejora de métricas

La Etapa 4B amplió la lectura administrativa sin recopilar datos adicionales. El panel incorpora:

- evolución mensual de los últimos 6 meses;
- actividad diaria de los últimos 30 días, incluyendo días con cero sesiones;
- fecha de inicio de la medición;
- participación de cada módulo dentro del total acumulado de accesos a módulos.

La documentación completa se encuentra en:

[Etapa 4B — Mejora de métricas EVA](mejora-estadisticas-eva-etapa-4b.md)


## Etapa 4C — consulta por periodo

El panel administrativo permite ahora consultar la distribución de accesos en cuatro periodos: 7 días, 30 días, 90 días y todo el historial.

La consulta actualiza las sesiones EVA del intervalo, el rango de fechas, las visitas por módulo y su participación relativa.

La documentación completa se encuentra en:

[Etapa 4C — Consulta administrativa por periodo](consulta-estadisticas-eva-etapa-4c.md)
