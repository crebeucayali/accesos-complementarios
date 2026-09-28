# Etapa 5 — Consolidación y cierre técnico

Fecha de cierre técnico: 27 de septiembre de 2026.

## Objetivo

Consolidar la arquitectura implementada durante las etapas anteriores, retirar componentes activos que ya no forman parte del diseño vigente, reforzar controles consistentes y dejar una referencia única del estado técnico estable del módulo Accesos Complementarios y de sus servicios Supabase asociados.

La Etapa 5 no congela el proyecto: establece una **base funcional consolidada** sobre la cual podrán realizarse mejoras futuras de manera controlada.

## Estado general

Estado: **BASE FUNCIONAL CONSOLIDADA**.

Los siguientes bloques se consideran implementados y validados:

- panel administrativo protegido con Supabase Auth;
- MFA AAL2 para operaciones administrativas;
- Capacitaciones;
- Calendario;
- Repositorio Accesible;
- Noticias destacadas;
- Galería dinámica multifoto;
- Storage institucional para imágenes;
- estados editoriales donde corresponden;
- Estadísticas EVA;
- accesibilidad transversal integrada;
- páginas legales y de privacidad;
- documentación técnica de cada módulo intervenido.

## Modelo de publicación consolidado

### Noticias destacadas

Utiliza:

- borrador;
- publicado;
- archivado.

Solo el contenido publicado se presenta públicamente.

### Repositorio Accesible

Utiliza:

- borrador;
- publicado;
- archivado.

La selección administrativa de recursos permanece filtrada por categoría.

### Galería

Utiliza:

- borrador;
- publicado;
- archivado.

La publicación exige además autorización institucional independiente.

Las fotografías asociadas heredan la protección pública del registro padre.

### Calendario

No utiliza borrador/publicado/archivado.

Mantiene exclusivamente sus estados propios:

- confirmada;
- planificación;
- actividad interna;
- feriado;
- cancelada.

La visibilidad pública se controla de forma independiente mediante `visible`.

### Capacitaciones

Conserva su modelo operativo existente. No se incorporaron estados editoriales adicionales.

## Supabase Auth y administración

Las operaciones administrativas continúan exigiendo:

1. sesión autenticada;
2. cuenta autorizada;
3. MFA con nivel AAL2.

La función privada `private.es_admin_mfa()` centraliza esta validación para políticas y operaciones administrativas.

No quedan funciones `SECURITY DEFINER` en el esquema público.

## RLS

Al cierre de la Etapa 5, todas las tablas operativas del esquema `public` tienen:

- RLS habilitado;
- RLS forzado.

Tablas verificadas:

- `calendario_actividades`;
- `capacitaciones_sesiones`;
- `eva_visitas_diarias`;
- `eva_visitas_eventos`;
- `galeria_item_imagenes`;
- `galeria_items`;
- `noticias_destacadas`;
- `repositorio_recursos`.

La vista `public.calendario_publico` mantiene:

`security_invoker=true`

por lo que respeta las políticas de las tablas subyacentes.

## Storage

Bucket operativo:

`eva-publico`

Configuración verificada:

- lectura pública de objetos;
- tamaño máximo por archivo: 5 MB;
- MIME permitidos:
  - WebP;
  - JPEG;
  - PNG.

Carpetas administrativas permitidas:

- `noticias/`;
- `capacitaciones/`;
- `repositorio/`;
- `galeria/`.

INSERT, UPDATE y DELETE sobre objetos administrados continúan condicionados a `private.es_admin_mfa()`.

## Estadísticas EVA

La arquitectura vigente utiliza:

- `public.eva_visitas_eventos` como entrada efímera;
- `private.registrar_visita_eva_evento()` como trigger privado;
- `public.eva_visitas_diarias` como agregado diario;
- `public.contador_visitas_eva()` para el contador público;
- `public.estadisticas_visitas_eva()` para el panel administrativo;
- `public.estadisticas_visitas_eva_periodo(text)` para consultas 7/30/90 días e histórico.

La Etapa 4D validó el recorrido completo mediante una transacción reversible y confirmó que los eventos individuales no quedan persistidos.

## Consolidación del contador histórico

Se comprobó que la arquitectura anterior no era utilizada por el frontend ni por el panel actual.

Por ello, durante la Etapa 5:

- se eliminó el RPC obsoleto `public.registrar_visita_eva(text,boolean,boolean)`;
- la antigua `private.eva_visitas_diarias` fue renombrada a `private.eva_visitas_diarias_legacy`;
- sus 2 registros históricos se conservaron intactos para trazabilidad;
- la tabla legacy no participa en los contadores vigentes.

No se eliminó información histórica.

## Validación de aplicación

Los siguientes scripts críticos fueron analizados sintácticamente y compilan correctamente:

- `admin/admin.js`;
- `estadisticas/visitas-eva.js`;
- `recursos/calendario-supabase.js`;
- `recursos/galeria-supabase.js`.

No se detectaron marcadores `TODO` o `FIXME` pendientes en el repositorio mediante la búsqueda de cierre.

## Rendimiento y seguridad

### Asesor de rendimiento

Resultado:

**0 observaciones**.

### Asesor de seguridad

No existen observaciones nuevas asociadas a la arquitectura implementada.

Permanece una única advertencia general de Supabase Auth:

`Leaked Password Protection Disabled`

Esta configuración es externa al código del módulo y no se modificó durante el cierre técnico.

## Consideraciones de mantenimiento

El sistema queda preparado para mantenimiento evolutivo. Antes de futuras ampliaciones se deberá mantener el mismo criterio aplicado durante estas etapas:

- intervenir un módulo por vez;
- conservar compatibilidad con contenidos existentes;
- verificar RLS después de cambios de esquema;
- mantener MFA AAL2 para escritura administrativa;
- no incorporar datos personales a Estadísticas EVA sin una nueva revisión de privacidad;
- validar cambios con pruebas reversibles cuando afecten métricas o datos compartidos;
- actualizar documentación y versiones de caché cuando cambien recursos públicos.

En Galería y Storage debe mantenerse atención al ciclo de vida de archivos: una eliminación futura de objetos físicos debe comprobar primero que la imagen no sea utilizada por otra referencia antes de retirarla.

## Documentación de referencia

La trazabilidad principal se encuentra en:

- `docs/panel-administrativo-auth.md`;
- `docs/calendario-supabase.md`;
- `docs/repositorio-supabase.md`;
- `docs/noticias-destacadas-supabase.md`;
- `docs/galeria-supabase.md`;
- `docs/estadisticas-visitas-eva.md`;
- `docs/auditoria-estadisticas-eva-etapa-4a.md`;
- `docs/mejora-estadisticas-eva-etapa-4b.md`;
- `docs/consulta-estadisticas-eva-etapa-4c.md`;
- `docs/validacion-estadisticas-eva-etapa-4d.md`.

## Resultado final

La Etapa 5 queda cerrada con una arquitectura coherente, documentada y validada.

El módulo puede continuar recibiendo nuevas funciones, pero cualquier nueva intervención parte desde esta **base funcional consolidada** y no desde una fase de construcción inicial.
