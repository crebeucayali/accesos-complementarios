# Etapa 3 - Definición de clasificación futura de visitas RA y NI
Fecha: 11 de noviembre de 2026.
Estado: definición técnica documentada. Sin modificación del contador, bases de datos ni instrumentación pública.
Repositorio rector: accesos-complementarios (CREBE Ucayali).

## 1. Alcance y decisión
La estructura vigente de EVA presenta como módulos principales CAP, BDA, MEA y DUA 3.0, junto a la plataforma principal y los accesos complementarios (AC).
Se establece la clasificación prevista para eventos **futuros**:
- Rutas del Repositorio Accesible (RA): módulo de estadísticas `bda`.
- Rutas de Noti Inclusivos / Lecturas inclusivas (NI): módulo de estadísticas `accesos_complementarios`.
- BDA y AC conservan sus identificadores actuales.
- El contador global `__eva__` continúa siendo un registro por sesión EVA y no la suma de módulos.

Este documento NO autoriza reescribir o sumar retrospectivamente los accesos previos de `repositorio_accesible` o `noti_inclusivos` en los módulos nuevos.

## 2. Estado comprobado
- `estadisticas/visitas-eva.js` recibe `data-eva-modulo`, admite ocho identificadores y conserva la sesión en `localStorage["eva_visitas_sesion_v1"]`, con deduplicación por `session.modules` y expiración por inactividad de 30 minutos.
- La instrumentación principal de RA usa `data-eva-modulo="repositorio_accesible"`; NI usa `data-eva-modulo="noti_inclusivos"`; BDA y AC usan `bda` y `accesos_complementarios` respectivamente.
- Los reintentos `eva_visitas_pendiente_v2` guardan identificador de operación, módulo, inicio de sesión y banderas; el RPC idempotente usa UUID y retención temporal.
- El panel `admin/admin.js` actualmente oculta RA y NI solamente en la tabla de visitas por acceso; conserva ambos en el denominador histórico.
- La tabla de agregados `public.eva_visitas_diarias` conserva `(fecha,modulo)`; las funciones públicas y administrativas siguen aceptando los ocho identificadores.

## 3. Regla para nuevas sesiones y recorridos
Dentro de una sesión activa, cada grupo estadístico se registra como máximo una vez:
- Entrar a BDA y posteriormente a RA = **un acceso BDA** (sin segundo incremento por RA).
- Entrar primero a RA y después a BDA = **un acceso BDA**.
- Entrar a AC y luego a NI = **un acceso AC**.
- Entrar primero a NI y después a AC = **un acceso AC**.
- Entrar a BDA y a AC en la misma sesión = **dos accesos de módulo distintos**, pero una sola sesión en `__eva__`.
- La recarga de páginas dentro de la misma sesión no debe incrementar visitas.
- Una sesión nueva tras 30 minutos de inactividad puede generar un nuevo acceso por grupo.

El campo `data-eva-modulo` debe representar el **grupo estadístico**, no necesariamente el repositorio físico. No se sumarán contadores actuales mediante una operación de agregación en frontend, pues las visitas previas ya pueden haber contado BDA+RA o AC+NI en una misma sesión y no existe información suficiente en los agregados diarios para deduplicar retrospectivamente.

## 4. Compatibilidad y despliegue futuro (Etapa 4)
1. Inventariar exhaustivamente las páginas instrumentadas de RA y NI (incluidos artículos), comprobar rutas de publicación y enlaces de ingreso.
2. Verificar las reglas vigentes de seguridad, permisos, idempotencia, hitos y sesiones en Supabase sin modificarlas.
3. Introducir y probar la nueva clasificación con el mínimo cambio en la instrumentación de RA y NI; mantener por compatibilidad los identificadores antiguos en el backend y registros anteriores.
4. Validar que las operaciones pendientes con identificadores antiguos se reintenten con el **mismo UUID y módulo original**; no reescribir ni borrar operaciones pendientes. Verificar el caso de navegación entre repositorios durante un registro pendiente.
5. Probar recorridos en ambos órdenes dentro de una sesión, recargas, nuevas sesiones, varias pestañas, suspensión de red y retorno de conexión, en un entorno aislado o con transacción revertida.
6. Comprobar equivalencia del contador global, hitos y datos agregados. Conservar la posibilidad de reversión del código de instrumentación sin eliminar registros históricos.
7. Publicar tras revisión, registrar fecha efectiva de corte y dejar explícita la ruptura de comparabilidad en los accesos por módulo antes/después del cambio.

## 5. Riesgos y controles
- La tabla `eva_visitas_diarias` contiene agregados, no visitas identificables: los conteos RA/NI históricos no pueden fusionarse retrospectivamente con deduplicación garantizada.
- Una sesión que comenzó antes del despliegue puede tener `modules.repositorio_accesible=true` pero no `modules.bda=true`. La Etapa 4 debe decidir y probar explícitamente el tratamiento de esta transición (recomendación: conservar el historial, evitar manipular sesiones existentes y documentar el corte).
- Las claves históricas RA/NI no deben retirarse del conjunto de valores válidos mientras puedan existir páginas antiguas en caché y operaciones pendientes.
- El cambio de módulo no debe invocar una nueva sesión global, ni alterar el hito, ni incrementar visitas repetidas por cambio de URL.
- Los porcentajes administrativos, tras el corte, requieren leyenda que distinga participación sobre el conjunto de módulos históricos frente al catálogo actual. No modificar esa base en la Etapa 3.

## 6. Aprobación de alcance y criterios de salida
La Etapa 3 queda cumplida con la regla de correspondencia RA->BDA y NI->AC y el plan de compatibilidad anterior; no se modifica el funcionamiento en producción.
Para dar por culminada la Etapa 4 serán necesarias pruebas verificables en entorno controlado y validación funcional del panel con sesión administrativa, sin pérdida de registros previos.

## 7. Archivos relacionados
- `estadisticas/visitas-eva.js`
- `admin/admin.js`
- `admin/index.html`
- `supabase/migrations/20261111020000_visitas_idempotentes_v2.sql`
- `docs/estadisticas-visitas-eva.md`
- `crebeucayali/repositorio-accesible/index.html`
- `crebeucayali/noti-inclusivos/index.html`
