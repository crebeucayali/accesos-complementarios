# Etapa 5. Validación final de clasificación estadística RA / NI

Fecha de ejecución: 11 de noviembre de 2026.
Ámbito: ecosistema EVA del CREBE Ucayali.
Estado: **validación técnica satisfactoria; cierre funcional definitivo pendiente de pruebas autenticadas y de navegador**.
Tipo de ejecución: auditoría de solo lectura, sin nuevas visitas artificiales ni cambios funcionales.

## 1. Objetivo
Comprobar la clasificación implementada en Etapa 4: páginas RA registradas como BDA y páginas NI (Lecturas inclusivas) como AC; conservar estadísticas históricas y controles de acceso.

## 2. Inventario de páginas
Revisión de contenido en GitHub:
- RA: 4/4 archivos HTML instrumentados presentan `data-eva-modulo="bda"` y `visitas-eva.js?v=4`.
- NI: 9/9 archivos HTML instrumentados presentan `data-eva-modulo="accesos_complementarios"` y `visitas-eva.js?v=4`.
- Cada una de las 13 páginas contiene una única declaración de `data-eva-modulo`.
- El script común `estadisticas/visitas-eva.js` conserva las equivalencias históricas `repositorio_accesible -> bda` y `noti_inclusivos -> accesos_complementarios`.
- La página principal de RA y el catálogo público de NI fueron localizados a través de consulta web; el acceso completo a cada recurso y la ejecución del JavaScript no pudieron verificarse con navegador automatizado en este entorno.

## 3. Pruebas de reglas de sesión (simulación de lógica, no navegador real)
Se ejecutaron 10 casos de comprobación de la agrupación por sesión:
1. BDA -> RA: un acceso BDA.
2. RA -> BDA: un acceso BDA.
3. AC -> NI: un acceso AC.
4. NI -> AC: un acceso AC.
5. BDA -> NI: dos accesos distintos, BDA y AC.
6. RA recargado repetidamente: un acceso BDA.
7. Sesión con marca histórica RA y entrada a BDA: no hay nuevo acceso al grupo.
8. Sesión con marca histórica NI y entrada a AC: no hay nuevo acceso al grupo.
9. Operación pendiente histórica RA y entrada a BDA: el reintento mantiene el módulo antiguo; no se suma otro acceso del grupo.
10. Operación pendiente histórica NI y entrada a AC: equivalente con el módulo antiguo NI.

Los diez escenarios produjeron el resultado lógico esperado. Se trata de simulaciones de reglas de clasificación, no de pruebas de ejecución de JavaScript real en un navegador contra el servidor.

## 4. Integridad de datos en Supabase
Consulta de solo lectura sobre `public.eva_visitas_diarias`:
- Sesiones `__eva__`: 1259.
- Acumulado histórico `repositorio_accesible`: 271.
- Acumulado histórico `noti_inclusivos`: 251.
- Acumulado `bda`: 460.
- Acumulado `accesos_complementarios`: 376.
- Filas con visitas negativas: 0.
- Claves duplicadas `(fecha, modulo)`: 0.
- Fechas futuras: 0.

Estos acumulados son una fotografía de la consulta realizada, no una garantía de inmutabilidad mientras existan usuarios reales.

## 5. Seguridad de las funciones
Comprobación del privilegio `EXECUTE`:
- `public.contador_visitas_eva()`: anon permitido para lectura pública.
- `public.registrar_visita_eva_hito_v2(...)`: anon permitido para registrar eventos públicos.
- `public.estadisticas_visitas_eva()`: anon denegado.
- `public.estadisticas_visitas_eva_periodo(text)`: anon denegado.

La comprobación de privilegios no sustituye la prueba de permisos por usuario autorizado, MFA y RLS dentro de una sesión autenticada.

## 6. Elementos no validados en navegador real
No se contó con una sesión de navegador controlable: el conector de pestañas solicitó abrir ChatGPT con la extensión conectada, y el runtime de pruebas Playwright carecía del ejecutable de Chromium.
Por tanto, quedaron sin prueba end-to-end:
- Transiciones reales BDA -> RA -> BDA y AC -> NI -> AC.
- Recuento en recargas, pestañas simultáneas y tras 30 minutos de inactividad.
- Interrupción de conectividad y recuperación de `eva_visitas_pendiente_v2`.
- Renderizado del panel administrativo mediante cuenta autorizada y MFA.
- Representación de los seis accesos y selección de periodos 7, 30, 90 días e histórico.
- Visualización pública de contador y aparición de hito al llegar a múltiplo de 1000.
- Revisión visual en PC y móvil.

No deben ejecutarse registros sintéticos contra estadísticas productivas para dar por aprobados esos casos. Probar en entorno aislado o mediante sesiones reales controladas y lectura de los agregados sin manipular registros históricos.

## 7. Pasos operativos para cierre humano
1. Abrir el panel administrativo con una sesión autorizada y MFA; comprobar la tabla de seis módulos, porcentajes, cuatro periodos y gráficas.
2. En PC y móvil, entrar a BDA y navegar a RA; invertir el orden. Repetir entre AC y NI.
3. Comprobar recarga, misma sesión, varias pestañas y nueva sesión tras inactividad. Comparar agregados antes/después en entorno aislado si corresponde.
4. Probar suspensión de red/reintento únicamente en entorno controlado, verificando que el UUID pendiente se conserve.
5. Validar el contador global, comprobando que las visitas de los módulos no creen sesiones adicionales, y los hitos cuando exista un umbral real pertinente.
6. Registrar los resultados observados, las evidencias y cualquier incidencia; completar entonces el cierre definitivo.

## 8. Alcance y protección
No se hicieron cambios al contador central, a Supabase, a los contenidos ni a los permisos durante esta etapa. La solución de Etapa 4 permanece publicada. No se modifican registros históricos RA/NI ni se reasignan retrospectivamente sus visitas.

## 9. Resultado
**Cierre técnico provisional satisfactorio. Cierre funcional definitivo pendiente de validación en navegador y panel autenticado.**
