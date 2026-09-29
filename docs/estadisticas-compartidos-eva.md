# Estadísticas de acciones de compartir EVA

## Objetivo

EVA registra de forma agregada las activaciones del botón "Compartir" para conocer qué módulos y páginas generan mayor interacción sin crear perfiles individuales de visitantes.

La métrica representa la apertura del flujo de compartir. No confirma que la persona haya completado una publicación en Facebook u otra aplicación.

## Registro público

Los archivos `compartir-facebook.js` envían una inserción a:

`public.eva_compartidos_eventos`

El evento contiene únicamente:

- módulo EVA;
- ruta de la página.

No se envían nombre, correo, ubicación ni un identificador persistente del visitante.

El trigger `private.registrar_compartir_eva_evento()` incrementa el agregado y devuelve `null`, por lo que el evento individual no queda almacenado.

## Datos agregados

Los conteos se conservan en:

`private.eva_compartidos_diarios`

por:

- fecha;
- módulo;
- ruta de página;
- número de acciones.

La tabla agregada no se expone para lectura pública.

## Panel administrativo

Los RPC:

- `public.estadisticas_compartidos_eva()`;
- `public.estadisticas_compartidos_eva_periodo(text)`;

requieren una sesión administrativa autorizada con MFA AAL2.

El panel muestra:

- total de acciones;
- acciones del día;
- últimos 7 días;
- mes actual;
- distribución por módulo;
- consulta por 7, 30 y 90 días o histórico;
- páginas con mayor número de acciones de compartir.

## Cobertura

La instrumentación utiliza los botones de compartir existentes en la plataforma principal, Capacitaciones, Banco Digital Accesible, Materiales Educativos Accesibles, Repositorio Accesible y artículos de Noti Inclusivos.

El código admite también los identificadores DUA 3.0 y Accesos Complementarios para una eventual ampliación del mismo componente.

## Interpretación

Una acción contabilizada significa que el usuario activó el botón y EVA abrió el flujo de compartir. La plataforma no recibe una confirmación fiable de que la publicación haya sido finalmente enviada o publicada.

Por ello, en el panel la métrica se denomina "Acciones de compartir" y no "Publicaciones realizadas".
