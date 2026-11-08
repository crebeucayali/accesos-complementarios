# Recurso del día de EVA - Cierre técnico de la etapa 05

Fecha: 8 de noviembre de 2026. Proyecto CREBE, Supabase `dteimbhwtzghhsijeeld`.

## Alcance realizado

La etapa 05 implementa el motor de selección por día y la confirmación administrativa de programaciones. La ubicación, diseño y visualización de la tarjeta en la portada pertenecen exclusivamente a la etapa 06. No se ha agregado ninguna tarjeta pública ni alterado la navegación EVA.

### Motor automático

La vista `public.eva_recurso_dia_publico`, declarada `security_invoker=true` y regida por RLS, retorna como máximo un recurso aprobado correspondiente al día actual de `America/Lima`. Utiliza `(now() at time zone 'America/Lima')::date` en la base de datos, no la fecha o huso horario del navegador. Al cambiar el día, una nueva consulta devuelve el siguiente recurso programado sin cron ni escrituras diarias.

Solo se consideran registros `programado`, `tipo=arasaac`, `derechos_verificados=true`, `revision_pedagogica=true`, con atributos exigidos por las restricciones de la tabla. Los borradores, registros retirados, fechas futuras o pasadas y datos del administrador no aparecen. El índice único parcial de la etapa 02 impide dos programaciones activas en una fecha.

No se programa automáticamente un recurso nuevo si falta la fecha. El día sin ficha aprobada devuelve cero resultados. La actualización de pantallas mantenidas abiertas durante medianoche corresponde a la presentación pública de la etapa 06.

### Restricción jurídica LSP

Se estableció un bloqueo **a nivel de base de datos** para programar ilustraciones LSP. El catálogo BDA puede utilizarse para preparar borradores, pero la auditoría de la etapa 01 no encontró una autorización suficiente para republicar imágenes del MINEDU en un nuevo bloque. Se requiere resolver esa condición documental y hacer una modificación formal posterior antes de levantar el bloqueo. No basta con marcar una casilla administrativa.

### Programación administrativa

En `admin/recurso-dia.js` se permite seleccionar `programado` únicamente para pictogramas ARASAAC. Antes de guardar se exige:
- Fecha válida del mes elegido y no pasada en horario de Perú.
- Identificadores ARASAAC elegidos en el selector, de 1 a 3.
- Título, descripción pedagógica y texto alternativo.
- Fuente HTTPS válida de ARASAAC.
- Créditos Sergio Palao, ARASAAC y Gobierno de Aragón.
- Licencia `CC BY-NC-SA 4.0` y referencia exacta a la licencia.
- Confirmaciones explícitas de derechos y revisión pedagógica (sin que el selector las marque).
- Confirmación de la acción y respuesta comprobada del servidor; solo Master con MFA AAL2.
- Se mantiene deshabilitada la opción manual `publicado`.

La pestaña muestra el total de fechas programadas y las que faltan en el mes. Permite retirar una programación confirmándola; la operación actualiza el estado a `retirado`, dejando de ser visible en la vista pública y preservando el registro. Los borradores se pueden crear o editar como antes. No se agregaron nuevas credenciales, funciones `SECURITY DEFINER`, Edge Functions ni RPC.

### Migración

`supabase/migrations/20261108151351_eva_recurso_dia_etapa_05_activacion_por_fecha_peru.sql`: restricción `eva_dia_etapa05_aprobacion_ck`, política `eva_dia_publico_hoy` y definición de vista pública por fecha peruana. La migración está aplicada en Supabase.

`supabase/rollback/20261108151351_eva_recurso_dia_etapa_05.sql`: reversión conservadora que **se detiene si existen programaciones activas** y no borra los registros. La reversión del panel se haría mediante un revert Git de la integración de etapa 05.

### Verificaciones

- Pruebas SQL en transacción: simulación de hoy y mañana, vista muestra solo hoy; se rechazan duplicados y LSP sin derechos aprobados; se rechaza falta de revisión pedagógica; retiro elimina de la vista; al terminar ROLLBACK.
- Prueba con rol `anon`: no ve contenido futuro.
- Pruebas Chromium en 1280, 768, 390 y 320 píxeles: programación ARASAAC condicionada, rechazo de ficha incompleta, confirmación Master, retiro, borradores, campos de licencia y ausencia de overflow.
- Regresión de etapas 03 y 04: calendario, búsqueda y selección, y borradores.
- Advisors Supabase: sin avisos nuevos relativos a esta tabla o vista; observaciones preexistentes fuera de alcance permanecen sin cambios.
- Final de pruebas: tabla `eva_recurso_dia_programacion` con **0 registros reales** y vista pública sin resultados.

Pruebas de navegador: https://github.com/crebeucayali/accesos-complementarios/actions/runs/42494323959

## Exclusiones expresas

**No corresponde a la etapa 05**: publicar tarjeta en la portada EVA, definir su ubicación, imágenes de difusión, panel de métricas de estos recursos, autorización jurídica de imágenes MINEDU, validación de toda la lista de señas o crear 30 fichas reales. La fase 06 implementará la presentación, y la 07 comprenderá la verificación integral y activación pública de la experiencia visual.

## Estado

Etapa 05 implementada y verificada en SQL y pruebas automáticas. El funcionamiento con sesión Master real y datos de producción requiere comprobación humana antes del cierre final de todo el proyecto.
