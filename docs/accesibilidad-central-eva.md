# Sistema central de accesibilidad EVA

## Propósito

Este documento establece el punto único de referencia para el manejo técnico de la accesibilidad transversal del Ecosistema Virtual Accesible (EVA).

A partir de esta definición, **Accesos Complementarios (AC)** queda establecido como repositorio canónico del sistema común de accesibilidad utilizado por los demás módulos del ecosistema. El objetivo es evitar implementaciones paralelas, reducir duplicaciones y permitir que las mejoras generales se administren desde un único lugar.

Esta definición corresponde a la **Etapa 1 de la transición hacia una arquitectura centralizada de accesibilidad**. En esta etapa se formaliza y documenta el modelo; no se eliminan todavía implementaciones locales que puedan seguir siendo necesarias durante la migración.

## Ubicación canónica

```text
accesos-complementarios/
└── accesibilidad/
    ├── accesibilidad.js
    ├── accesibilidad-core.js
    └── accesibilidad.css
```

Ruta pública base:

```text
https://crebeucayali.github.io/accesos-complementarios/accesibilidad/
```

Cualquier mejora general de accesibilidad que deba compartirse entre módulos debe evaluarse primero en esta ubicación.

## Función de cada archivo

### `accesibilidad.js`

Es el **cargador estable** del sistema común EVA.

Responsabilidades:

- cargar la hoja de estilos canónica;
- cargar la implementación vigente;
- evitar cargas repetidas de la misma versión;
- servir como punto de entrada estable para los demás repositorios.

Los demás repositorios deben llamar preferentemente a este archivo y no directamente a `accesibilidad-core.js`.

### `accesibilidad-core.js`

Contiene la lógica funcional central. Actualmente administra, entre otras funciones:

- alto contraste;
- texto grande y muy grande;
- fuente legible;
- espaciado amplio;
- resaltado de enlaces;
- escala de grises;
- reducción de movimiento;
- lectura de página cuando el navegador lo permite;
- restablecimiento de preferencias;
- persistencia de preferencias;
- panel flotante común;
- refuerzos básicos de estructura accesible.

Es una implementación interna del sistema central y no debe utilizarse como punto de entrada independiente desde otros repositorios salvo necesidad técnica documentada.

### `accesibilidad.css`

Contiene los estilos comunes del panel, foco visible, salto al contenido, contraste, tamaños de texto, fuente legible, espaciado, enlaces resaltados y reducción de movimiento.

## Contrato de integración

Los módulos EVA deben consumir el sistema desde AC.

Patrón de referencia:

```html
<link rel="stylesheet"
      href="https://crebeucayali.github.io/accesos-complementarios/accesibilidad/accesibilidad.css?v=VERSION">

<script src="https://crebeucayali.github.io/accesos-complementarios/accesibilidad/accesibilidad.js?v=VERSION"
        defer></script>
```

La versión debe corresponder a la versión estable definida en AC.

No deben añadirse simultáneamente:

- otra implementación completa del mismo panel;
- una carga directa adicional de `accesibilidad-core.js`;
- un segundo botón general de accesibilidad;
- controles que repliquen exactamente las mismas funciones sin una razón documentada;
- copias locales del sistema central solo para modificar comportamiento general.

## Fuente única de verdad

Para funcionalidades generales de accesibilidad, la fuente de verdad será:

```text
crebeucayali/accesos-complementarios/accesibilidad/
```

Una mejora transversal deberá implementarse primero en AC. Los módulos consumidores deberán utilizar la versión estable y las excepciones deberán limitarse a pequeñas extensiones específicas.

## Estado de transición por módulo

### EVA principal

Mantiene archivos locales de compatibilidad y controles rápidos históricos.

- El sistema central de AC ya interviene en la experiencia de accesibilidad.
- Los elementos locales se revisarán en una etapa posterior.
- No se eliminarán archivos locales hasta verificar todas sus referencias.
- La meta es dejar una única entrada visible de accesibilidad.

### Capacitaciones, MEA, Noti Inclusivos y Repositorio Accesible

Deben utilizar el sistema común de AC como mecanismo principal. No se prevé una implementación local completa salvo una necesidad específica claramente justificada.

### Banco Digital Accesible

Es una **excepción temporal documentada**.

BDA dispone actualmente de una implementación local con funciones específicas adicionales. Durante la transición:

- no se eliminarán sus archivos locales de forma inmediata;
- primero se identificarán las funciones ya cubiertas por el sistema central;
- las funciones exclusivas se separarán posteriormente como extensión específica de BDA;
- la meta final es que BDA consuma el núcleo central de AC y conserve únicamente las funciones particulares.

## Regla para extensiones específicas

Cuando un módulo necesite funciones que no correspondan al sistema general, la solución preferida será:

```text
Sistema central AC
        +
extensión específica del módulo
```

Ejemplo:

```text
accesibilidad.js       ← núcleo común desde AC
accesibilidad-bda.js   ← solo funciones exclusivas de BDA
```

La extensión no debe crear un segundo panel general ni volver a implementar funciones ya disponibles en AC.

## Gestión de versiones

Cuando se publique una nueva versión estable:

1. modificar y probar los archivos dentro de `accesibilidad/`;
2. actualizar la versión interna del cargador cuando corresponda;
3. comprobar la página principal de AC;
4. comprobar al menos un módulo consumidor;
5. actualizar de forma controlada las referencias `?v=`;
6. verificar GitHub Pages;
7. documentar cualquier cambio funcional relevante.

No se debe incrementar una versión únicamente por cambios ajenos al sistema de accesibilidad.

## Procedimiento para futuras modificaciones

Antes de cambiar accesibilidad en cualquier repositorio EVA:

1. determinar si el cambio es general o específico;
2. si es general, implementarlo en AC;
3. si es específico, comprobar que no pueda resolverse mediante el sistema central;
4. evitar introducir un segundo panel general;
5. comprobar escritorio y móvil;
6. comprobar teclado y foco visible;
7. comprobar alto contraste;
8. comprobar tamaños de texto;
9. comprobar el restablecimiento de ajustes;
10. verificar que no se generen dos controles visibles de accesibilidad.

## Criterios de seguridad para la migración

No se eliminará un archivo local únicamente porque exista un equivalente central. Antes de retirarlo se debe comprobar:

- qué páginas lo cargan;
- qué funciones aporta;
- si migra preferencias anteriores;
- si modifica clases o selectores propios;
- si contiene funciones todavía ausentes en AC;
- si su eliminación afecta páginas internas;
- si el sistema central ya sustituye completamente su comportamiento.

## Elementos que no deben duplicarse

Como regla general, una página EVA debe mostrar **una sola entrada principal de accesibilidad**.

Debe evitarse la coexistencia visible de:

- panel flotante general + otro panel general;
- dos botones llamados “Accesibilidad”;
- controles rápidos que repliquen exactamente funciones del panel central, salvo transición documentada;
- dos implementaciones que guarden preferencias distintas para la misma función.

## Alcance de esta etapa

Esta etapa formaliza la arquitectura objetivo y el punto central de mantenimiento.

Todavía no se eliminan:

- archivos de compatibilidad de EVA principal;
- implementación local de BDA;
- archivos heredados con referencias activas.

Las siguientes etapas deberán ejecutarse progresivamente y con verificación por repositorio.

## Regla de mantenimiento

Ante cualquier duda sobre dónde implementar una mejora transversal de accesibilidad:

> Revisar primero `accesos-complementarios/accesibilidad/` y mantener allí la funcionalidad común.

Solo se desarrollará una solución local cuando exista una necesidad específica que no deba afectar al resto del ecosistema.

## Estado de la transición

### Etapa 1 — completada

**Arquitectura central documentada.**

AC queda establecido como núcleo canónico de accesibilidad transversal para EVA.

### Etapa 2 — completada en EVA principal

La página principal de EVA fue adaptada para utilizar una sola entrada visible de accesibilidad.

Cambios realizados:

- se retiraron los controles rápidos locales de Texto grande, Alto contraste y Restablecer;
- se conserva el panel central de accesibilidad administrado desde AC;
- `crebeucayali.github.io/accesibilidad.js` queda temporalmente como puente de compatibilidad;
- el puente conserva la migración de preferencias antiguas hacia `eva_accesibilidad_preferencias`;
- se retiró de `main.js` la lógica antigua que administraba texto grande y contraste;
- la guía y el texto introductorio dejaron de referirse a los controles retirados;
- no se eliminaron todavía los archivos locales de compatibilidad ni sus estilos heredados, porque su depuración definitiva corresponde a una etapa posterior.

Resultado esperado: EVA Inicio presenta un único acceso general de **Accesibilidad**, proporcionado por el núcleo central de AC.


### Etapa 3 — completada

Se normalizaron los repositorios consumidores que ya dependen del núcleo central de accesibilidad de AC:

- Capacitaciones CREBE;
- Materiales Educativos Accesibles;
- Noti Inclusivos;
- Repositorio Accesible.

Acciones realizadas:

- todas las páginas detectadas de estos repositorios fueron alineadas con la versión canónica vigente `v=10`;
- las referencias CSS y JS apuntan al sistema central alojado en `accesos-complementarios/accesibilidad/`;
- se verificó que estos cuatro repositorios no mantienen una implementación local completa de accesibilidad;
- no se introdujeron nuevas copias locales;
- no se modificó BDA en esta etapa, porque conserva una excepción temporal documentada con funciones propias.

Resultado esperado: CAP, MEA, NI y RA consumen una misma versión estable del sistema central de accesibilidad EVA.


### Etapa 4 — completada en BDA

Banco Digital Accesible fue migrado al núcleo central de accesibilidad de AC conservando únicamente una extensión específica para su recorrido guiado.

Arquitectura resultante:

```text
AC / accesibilidad/
├── accesibilidad.js
├── accesibilidad-core.js
└── accesibilidad.css
          ↓
BDA
├── accesibilidad-bda.js
└── accesibilidad-bda.css
```

Acciones realizadas:

- las páginas activas de BDA fueron cambiadas para consumir `accesibilidad.css?v=10` y `accesibilidad.js?v=10` desde AC;
- se creó `accesibilidad-bda.js` con la lógica exclusiva del recorrido guiado;
- se creó `accesibilidad-bda.css` con los estilos exclusivos del recorrido;
- el botón “Iniciar recorrido” se integra dentro del panel central de accesibilidad, evitando un segundo panel general;
- las funciones comunes de contraste, texto, fuente, espaciado, enlaces, grises, reducción de movimiento y lectura quedan a cargo de AC;
- las hojas `lsp/accesibilidad.css` y `braille/accesibilidad.css` se conservaron porque corresponden al contenido visual de sus páginas informativas y no al panel global;
- los antiguos `accesibilidad.js` y `accesibilidad.css` de la raíz BDA quedaron sin referencias activas como sistema global y fueron marcados como legado de transición;
- dichos archivos antiguos no se eliminan todavía: su retirada definitiva corresponde a una etapa posterior de depuración, después de observar la migración y verificar que no existan dependencias ocultas.

Resultado esperado: BDA utiliza un solo panel general de accesibilidad, administrado desde AC, y mantiene el recorrido guiado como extensión específica.


### Etapa 5 — completada en BDA

Se ejecutó la depuración controlada de los archivos heredados de accesibilidad en Banco Digital Accesible.

Acciones realizadas:

- se retiró la importación de la antigua hoja global `accesibilidad.css` desde `estilos.css`;
- se retiró la importación heredada desde `braille/cabecera-bda.css`;
- se actualizaron las versiones de caché de las páginas afectadas;
- se verificó que ninguna página activa de BDA cargara el antiguo `accesibilidad.js` de la raíz;
- se verificó que las únicas referencias restantes con nombre `accesibilidad.css` correspondieran a las hojas locales de contenido de `lsp/accesibilidad.html` y `braille/accesibilidad.html`;
- se eliminaron definitivamente los antiguos `accesibilidad.js` y `accesibilidad.css` de la raíz BDA;
- se mantiene como arquitectura vigente el núcleo central de AC más `accesibilidad-bda.js` y `accesibilidad-bda.css` para el recorrido guiado.

Resultado: BDA ya no conserva una implementación general paralela de accesibilidad.


### Etapa 6 — completada en EVA principal

Se ejecutó la depuración controlada de los componentes locales heredados de accesibilidad en la página principal EVA.

Acciones realizadas:

- `index.html` pasó a consumir directamente `accesibilidad.css?v=10` y `accesibilidad.js?v=10` desde AC;
- se creó `migracion-accesibilidad.js` como archivo temporal y específico para convertir preferencias antiguas a `eva_accesibilidad_preferencias`;
- se retiró el `@import` de la antigua hoja local de accesibilidad;
- se eliminaron de `estilos-original.css` las reglas correspondientes a los controles rápidos ya retirados;
- se actualizaron las versiones de caché de `estilos.css` y `estilos-original.css`;
- se verificó que `buscar/index.html` y `pruebas/tarjetas-educativas/index.html` ya consumían directamente el sistema central;
- se eliminaron definitivamente los antiguos `accesibilidad.js` y `accesibilidad.css` de la raíz de EVA principal.

Estado resultante:

```text
EVA principal
├── migracion-accesibilidad.js   ← temporal, solo migración de preferencias antiguas
└── consume AC v10               ← sistema general vigente
```

`migracion-accesibilidad.js` no constituye un sistema paralelo. Su única responsabilidad es migrar preferencias históricas. Su retirada podrá evaluarse en una etapa posterior cuando se considere cumplido el periodo de compatibilidad.

Resultado: EVA principal ya no mantiene una implementación local general de accesibilidad.


### Etapa 7 — consolidación interna de AC completada

Se consolidó internamente el núcleo central de accesibilidad dentro de Accesos Complementarios.

Acciones realizadas:

- todas las páginas HTML de AC fueron normalizadas para consumir `accesibilidad.css?v=10` y `accesibilidad.js?v=10`;
- se unificaron las referencias antiguas `v=2`, `v=5`, `v=6`, `v=7` y `v=9`;
- `mapa-web.html` pasó de rutas relativas a las rutas públicas canónicas del sistema central;
- el archivo interno `accesibilidad-v2.js` fue renombrado funcionalmente como `accesibilidad-core.js`;
- el cargador estable `accesibilidad.js` fue actualizado para cargar `accesibilidad-core.js?v=10`;
- se verificó que los repositorios consumidores no dependan directamente del motor interno;
- se retiró definitivamente `accesibilidad-v2.js`.

Arquitectura central resultante:

```text
accesos-complementarios/
└── accesibilidad/
    ├── accesibilidad.js        ← punto de entrada público estable
    ├── accesibilidad-core.js   ← motor funcional interno
    └── accesibilidad.css       ← estilos centrales
```

Regla de mantenimiento:

Los repositorios consumidores deben seguir llamando únicamente a `accesibilidad.js?v=10` y `accesibilidad.css?v=10`. El archivo `accesibilidad-core.js` es interno y no debe enlazarse directamente desde otros repositorios.

Resultado: AC queda consolidado como una única fuente central de accesibilidad, con nomenclatura interna clara y versionado uniforme.


### Etapa 8 — auditoría final transversal

Se realizó una auditoría final transversal del sistema de accesibilidad en los repositorios principales del ecosistema CREBE:

- EVA principal;
- Capacitaciones CREBE;
- Materiales Educativos Accesibles;
- Noti Inclusivos;
- Repositorio Accesible;
- Banco Digital Accesible;
- Accesos Complementarios.

Criterios verificados:

- uso del núcleo central de AC como fuente común;
- ausencia de implementaciones generales paralelas;
- ausencia de referencias directas al motor interno;
- eliminación de versiones antiguas conocidas;
- mantenimiento de una sola entrada general de accesibilidad por página;
- conservación únicamente de extensiones específicas justificadas;
- despliegue correcto de GitHub Pages.

Resultado de los siete repositorios CREBE: **conforme**.

Estado de despliegue verificado: los siete repositorios finalizaron correctamente su último flujo de GitHub Pages.

#### DUA 3.0 institucional

Se confirmó que existen dos repositorios diferenciados:

- `neuronova-apps/DUA-3.0`: proyecto original de NeuroNova Apps;
- `crebeucayali/DUA-3.0`: adaptación e implementación institucional para CREBE Ucayali.

La integración transversal corresponde al repositorio institucional `crebeucayali/DUA-3.0`.

Se integró el núcleo central de accesibilidad AC `v=10` en:

- `index.html`;
- `evolucion.html`;
- `recursos.html`.

La política CSP existente se mantuvo intacta. Las referencias a AC están permitidas por `'self'` al encontrarse bajo el mismo origen `https://crebeucayali.github.io`.

DUA 3.0 institucional queda incorporado a la arquitectura transversal de accesibilidad EVA.

## Estado consolidado

La arquitectura central de accesibilidad de los repositorios CREBE queda consolidada y desplegada correctamente.

```text
AC / accesibilidad/
├── accesibilidad.js
├── accesibilidad-core.js
└── accesibilidad.css
        ↓
EVA principal
CAP
MEA
NI
RA
BDA + extensión específica
AC
```

DUA 3.0 institucional queda integrado al núcleo transversal de accesibilidad AC. El repositorio original de NeuroNova Apps se mantiene como proyecto de origen independiente.


### Corrección posterior de la auditoría — DUA 3.0

Se aclaró la existencia de dos repositorios DUA 3.0. La adaptación institucional se encuentra en `crebeucayali/DUA-3.0`, mientras que `neuronova-apps/DUA-3.0` corresponde al proyecto original.

Se integró la versión institucional al núcleo central AC `v=10` en sus tres páginas principales. Con esta corrección, DUA 3.0 deja de ser una excepción pendiente dentro de EVA.
