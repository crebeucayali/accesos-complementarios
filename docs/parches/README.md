# Filtros públicos pendientes de autorización

Estos archivos son documentación y fixtures de prueba. **No se han aplicado a los repositorios de las páginas públicas.** Las extensiones `.fixture` evitan publicar copias ejecutables de esas páginas en Accesos Complementarios.

El [parche revisable](filtros-publicos-pendientes.patch) contiene únicamente los cambios necesarios para que los respaldos estáticos no vuelvan a mostrar contenido archivado:

| Repositorio fuera del alcance actual | Archivos propuestos | Cambio |
| --- | --- | --- |
| `crebeucayali/capacitaciones` | `app.js`, `primera-jornada.html`, `segunda-jornada.js`, `segunda-jornada.html` | Renderizar únicamente sesiones que devuelve Supabase, conservar número de sesión, ocultar tarjetas estáticas antes de validar y actualizar versión de scripts. |
| `crebeucayali/repositorio-accesible` | `repositorio-supabase.js`, `index.html` | Vaciar el respaldo antes de consultar, mantener las listas inicialmente ocultas y mostrar solamente los recursos publicados; actualizar versión de script. |
| `crebeucayali/crebeucayali.github.io` | `main.js`, `index.html` | Desactivar únicamente los respaldos del carrusel de Noticias ante un error de Supabase; actualizar versión de script. |

El resultado cuando Supabase no puede confirmar la publicación es no mostrar contenido de respaldo. No se modifican estilos, header, footer, funciones de navegación ni otros módulos. Los archivos y registros archivados permanecen almacenados.

`admin/tests/public-filters.test.cjs` comprueba estos fixtures. La conformidad de las pruebas locales no significa que las páginas externas ya estén corregidas. Después de autorizar el alcance mínimo debe verificarse el estado actual de cada rama, aplicar los cambios, comprobar sus despliegues y validar las páginas publicadas antes de habilitar invitaciones.

La RPC de autorización/invitación permanece pausada en Supabase. No se debe retirar esa pausa mientras persista cualquiera de estas dependencias.
