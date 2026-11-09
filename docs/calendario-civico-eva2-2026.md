# EVA 2.0 · Calendario cívico 2026

Actualización: 2026-11-09.

## Alcance implementado
- Página pública permanente: `recursos/calendario-civico.html`.
- Fuente única de fechas y fuentes: `recursos/calendario-civico.json`, actualmente con `anio: 2026` y 68 conmemoraciones seleccionadas.
- Aplicación pública: `recursos/calendario-civico.js`.
- Estilos compartidos y específicos: `recursos/calendarios.css`.
- Abarca todos los días del año, del 1 de enero al 31 de diciembre; los días sin efemérides seleccionadas se muestran sin marca.
- Consulta por mes, categoría y palabra, con fuentes oficiales enlazadas para cada registro.
- Las tres categorías editoriales son Cívica, Educación e Inclusión.
- No es un calendario exhaustivo, ni todas las conmemoraciones son feriados.
- Fuentes principales: Calendario Cívico Escolar del Ministerio de Educación de Perú; días internacionales de Naciones Unidas; feriados del Estado Peruano; CONADIS; OMS.

## Reglas para actualizar 2027 y años siguientes
1. Verificar el calendario cívico del año correspondiente con fuentes oficiales y revisar las fechas móviles.
2. Editar exclusivamente `recursos/calendario-civico.json`, cambiando `anio`, `fecha`, título, categoría, descripción y fuente según corresponda.
3. Mantener el nombre del JSON y la ruta `recursos/calendario-civico.html`. No crear páginas `calendario-civico-2027.html` ni datos paralelos.
4. Confirmar que las fechas pertenezcan al año indicado y que no se clasifiquen días cívicos como feriados sin respaldo.
5. Validar la presentación pública en pantallas pequeñas, teclado y alto contraste.

## Pendientes
- La gestión, programación y aprobación de conmemoraciones en el panel administrativo no están implementadas.
- La tarjeta temporal de la portada principal de EVA no está implementada.
- La actualización al siguiente año no es automática en su contenido: requiere revisión y publicación editorial del JSON, aunque se conserva la misma página.
- Requiere validación visual y funcional en el sitio desplegado. La comprobación actual ha sido de código y formato de datos.

## Fuentes principales
- MINEDU: https://www.gob.pe/institucion/minedu/informes-publicaciones/2777923-calendario-civico-escolar
- Naciones Unidas: https://www.un.org/es/observances/list-days-weeks
- Feriados de Perú: https://www.gob.pe/feriados
- CONADIS: https://www.gob.pe/institucion/conadis/noticias/307444-conmemoracion-del-dia-nacional-de-la-persona-con-discapacidad
- OMS: https://www.who.int/es/campaigns/world-mental-health-day/2026

## Ampliación selectiva de noviembre de 2026
Se incorporaron ocho conmemoraciones con fuentes oficiales: Día del Psicólogo Peruano (30 de abril), Día de la Madre (10 de mayo de 2026), Día del Padre (21 de junio de 2026), Día Internacional de la Juventud (12 de agosto), Día de la Educación Física y el Deporte (8 de octubre), Día de la Educación Inclusiva en el Perú (16 de octubre), Día de la Educación Primaria (12 de noviembre) y Día Mundial para Prevenir la Explotación, los Abusos y la Violencia Sexuales contra los Niños y Promover la Sanación (18 de noviembre). Día Internacional de la Mujer (8 de marzo) y Día de la Educación Inicial (25 de mayo) ya existían y no fueron duplicados.

Las fechas familiares son móviles por domingo y deben recalcularse al actualizar el calendario para cada año.
