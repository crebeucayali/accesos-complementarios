# Acta de cierre del alcance de estadísticas de descargas de recursos EVA

**Fecha:** 11 de noviembre de 2026 (Perú).  
**Carácter:** cierre documental y congelación del alcance vigente.  
**Decisión comunicada por el responsable:** dar por finalizado el trabajo de seguimiento de descargas. No ejecutar ahora integraciones RA-BDA ni otras ampliaciones, porque se evalúa una modificación posterior diferente.

## 1. Funcionalidades que permanecen operativas

| Módulo | Acción | Estado |
| --- | --- | --- |
| MEA | Registro agregado de exportaciones iniciadas y descargas solicitadas de herramientas instrumentadas | Implementado, con pruebas automáticas y primera validación humana de descarga de pictogramas PNG |
| BDA | `lsp/png/descarga_solicitada` del visor de señas | Implementado, con prueba humana de imagen LSP, registro en Supabase y visualización en panel administrativo móvil |
| Panel administrativo EVA | Consultas estadísticas de recursos MEA y BDA, por separado, con acceso master y MFA AAL2 | Implementado y probado |
| Visitas EVA | Estadísticas de visitas generales y por módulo | Sistemas independientes, no afectados por el trabajo de descargas |

Las cifras previamente contrastadas en producción fueron una solicitud de descarga de pictogramas PNG de MEA y una solicitud de descarga PNG LSP de BDA, ambas fechadas el 10 de noviembre de 2026. Estas cantidades son constancias de la verificación previa y no una promesa de que permanezcan iguales en el futuro.

## 2. Decisión de descarte

Se descarta la inclusión de impresiones de constancias Braille de BDA en las estadísticas de recursos. La función de registro se desactivó en cliente, backend y panel por las PR:
- https://github.com/crebeucayali/banco-digital-accesible/pull/11
- https://github.com/crebeucayali/accesos-complementarios/pull/34

La práctica Braille preexistente de BDA no fue eliminada por este cierre; su posible retirada queda sujeta a otra decisión. Las dos modalidades de práctica Braille de MEA, el consentimiento y su seguimiento pedagógico mediante Google Apps Script y hoja de cálculo permanecen fuera de cualquier modificación de esta acta.

La migración histórica de habilitación de Braille se conserva en el control de versiones, pero quedó neutralizada por una migración posterior. No se borraron tablas, eventos ni registros existentes.

## 3. Referencias de cierre

- BDA LSP: `docs/cierre-operativo-estadisticas-bda-lsp-20261110.md`.
- Reversión de impresión Braille BDA: `docs/cierre-retiro-estadisticas-braille-bda-20261111.md`.
- MEA: `docs/cierre-operativo-estadisticas-mea-20261110.md`.
- Verificación RA+BDA previa: `crebeucayali/banco-digital-accesible/docs/verificacion-previa-reestructuracion-ra-bda-20261111.md`. Es un estudio de compatibilidad, **no una aprobación de migración**.

## 4. Límites y continuidad suspendida

- Se detiene el desarrollo de nuevas categorías, eventos, descargas o métricas en esta línea de trabajo.
- No se realizan modificaciones de código, SQL, UI, políticas ni recursos como parte de este cierre documental.
- No se fusionan RA y BDA, ni se trasladan recursos, imágenes o tablas; no se despublican repositorios.
- No se retira ni modifica la práctica Braille preexistente de BDA.
- La auditoría RA+BDA se conserva como referencia técnica, pero toda integración queda **en espera de una nueva instrucción expresa**.
- No se interpretan aperturas de enlaces externos, impresiones ni consultas como descargas consumadas.
- Permanecen como validaciones complementarias, no requisitos pendientes del cierre documental, las comprobaciones humanas de otras herramientas MEA, periodos y plataformas no ensayadas.

## 5. Dictamen

**Se declara cerrado el trabajo de estadísticas de descargas del EVA dentro del alcance implementado y validado.** Se conserva el estado técnico actual sin ampliaciones. El siguiente cambio institucional será tratado como una intervención independiente, únicamente cuando el responsable defina su alcance.

Este documento registra la decisión de cierre; no constituye una autorización para fusionar RA y BDA, eliminar módulos, alterar registros pedagógicos ni crear nuevas estadísticas.
