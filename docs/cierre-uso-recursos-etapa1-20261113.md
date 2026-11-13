# Cierre técnico y documental: etapa 1 de Uso de recursos

**Fecha:** 13 de noviembre de 2026, Perú.  
**Sistema:** Ecosistema Virtual Accesible (EVA), CREBE "Señor de los Milagros" - Ucayali.  
**Repositorio:** `crebeucayali/accesos-complementarios`.  
**Alcance:** exclusivamente `Seguimiento > Uso de recursos` (`#panel-recursos-uso`) del panel administrativo, su hoja de estilos específica, gráfica MEA y pruebas.  
**Auditoría previa:** `docs/auditoria-uso-recursos-etapa1-20261113.md` (commit `cf8562eba378f1ebb837f549b906596e91d2ce2a`).  
**Implementación:** commit `f265b4f10f23692c76fa9d55c8caea5d307417dc`.  
**PR:** https://github.com/crebeucayali/accesos-complementarios/pull/39  
**Merge en main:** `073e6a0f120d8e3ca45d8a45fda30e7f69889d37`.

## 1. Secuencia

Se auditó la interfaz de MEA/BDA y la interpretación gráfica antes de editar código. Después se implementaron cambios acotados en una rama de revisión, se ampliaron las aserciones Playwright y se comprobó la aprobación de los tres workflows antes de integrar a `main`.

## 2. Cambios finales

- Dos contenedores visuales dentro de la misma sección: MEA y BDA, identificados por encabezados y bordes distintos.
- Texto introductorio resumido; explicación completa accesible mediante `<details>` y `<summary>` nativos en cada módulo.
- Ajustes locales de tipografía, espaciado y controles con soporte móvil y reglas de alto contraste.
- Gráfica de evolución MEA con escala cuantitativa, redondeada a múltiplos de cinco y mínimo cinco acciones. Una sola acción ocupa 20 % de una escala 0–5, aunque el número real permanece visible a la derecha.
- Leyenda textual clara: las barras son cantidades relativas a una escala de acciones, no porcentajes de usuarios.
- La leyenda de escala se oculta y limpia cuando no hay filas, ocurre un error o se elimina la sesión. Los periodos 7, 30, 90 y 365 días se conservan.
- Versionado de recursos CSS `v=58` y JS MEA `v=3`.

## 3. Verificación automatizada

| Workflow | Resultado | Evidencia |
| --- | --- | --- |
| Validar panel de uso de recursos MEA | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43464215969 |
| Validar visualización de BDA en panel EVA | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43464215474 |
| Validar cabecera y portada del panel administrativo | Aprobado | https://github.com/crebeucayali/accesos-complementarios/actions/runs/43464215465 |
| Inspección de `main`: estructura MEA/BDA, desplegables, fórmula y escala, CSS delimitado, referencias versionadas y documento de auditoría | Conforme mediante revisión de código | https://github.com/crebeucayali/accesos-complementarios/pull/39/files |

Las pruebas de MEA y BDA cubren datos simulados para verificar interfaz, estados vacíos, errores, protección master/AAL2, cambios/cierre de sesión, escritorio y móvil simulado, y alto contraste. El nuevo control de MEA comprueba que una acción se represente al 20 % con escala 0–5.

## 4. Archivos modificados

- `admin/index.html`.
- `admin/admin.css`.
- `admin/estadisticas-recursos.js`.
- `admin/tests/estadisticas-recursos.browser.mjs`.
- `admin/tests/estadisticas-bda-panel.browser.mjs`.
- `docs/auditoria-uso-recursos-etapa1-20261113.md`.
- `docs/cierre-uso-recursos-etapa1-20261113.md` (este documento).

El archivo `admin/estadisticas-bda.js`, las funciones de `admin/admin.js` y los mecanismos de almacenamiento no se modificaron.

## 5. Exclusiones

La etapa 1 **no** agregó nuevos eventos, categorías, métricas, gráfico temporal BDA ni exportación CSV. No modifica Supabase, RPC, políticas RLS, roles, MFA, información histórica, contadores, práctica Braille, repositorios públicos ni otras secciones administrativas. Estas ampliaciones no deben considerarse aprobadas por el cierre.

## 6. Dictamen

**Etapa 1 integrada y cerrada técnicamente**, con tres workflows aprobados y confirmación de archivos en `main`. La captura/verificación humana del resultado publicado dentro del navegador con acceso administrativo queda pendiente y no se presenta como ejecutada. La etapa 2 (análisis adicional de datos existentes) necesitará una nueva decisión e intervención específica.
