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

`private.eva_visitas_diarias`

almacena únicamente datos agregados:

- fecha;
- identificador del módulo;
- número de visitas.

No se guarda en esta tabla un identificador del visitante, correo, ubicación ni dirección IP.

## RPC público

`public.registrar_visita_eva(...)`

permite incrementar los conteos agregados sin conceder acceso directo a la tabla.

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
