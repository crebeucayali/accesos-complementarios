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
    ├── accesibilidad-v2.js
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

Los demás repositorios deben llamar preferentemente a este archivo y no directamente a `accesibilidad-v2.js`.

### `accesibilidad-v2.js`

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
- una carga directa adicional de `accesibilidad-v2.js`;
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
├── accesibilidad-v2.js
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
