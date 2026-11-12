# Cierre controlado: franja «Alcance institucional» y galería de fondos EVA

Fecha: 2026-11-11

## Alcance entregado

- Portada principal: la sección «Alcance institucional» utiliza un fondo fotográfico WebP administrable, con capa azul para legibilidad.
- Franja fotográfica de borde a borde, fuera del contenedor de anchura limitada de la portada.
- Carrusel horizontal continuo de indicadores hasta los extremos de la ventana, con desvanecimiento lateral mediante máscara CSS (58 px en escritorio; 28 px en móvil); se conservan pausa al pasar el cursor y modo de alto contraste.
- Panel administrativo, pestaña «Indicadores»: galería de hasta cinco fondos WebP, previsualización, publicación manual de una imagen, cambio de fondo, retirada y eliminación de la galería sin borrado automático del objeto físico.
- Sin rotación diaria o por fechas: la imagen activa permanece vigente hasta que la cuenta autorizada cambie la selección.
- El encabezado y los indicadores siguen administrándose por separado.

## Integración

- Repositorio público: `crebeucayali/crebeucayali.github.io`.
- Archivos relevantes: `index.html`, `indicadores-eva.js`, `eva-indicadores-fondo.css`.
- Repositorio del panel: `crebeucayali/accesos-complementarios`.
- Archivos relevantes: `admin/index.html`, `admin/indicadores.js`, `admin/admin.css`.
- Supabase: `public.eva_indicadores_config.fondo_url` identifica la imagen activa y `public.eva_indicadores_fondos` mantiene hasta cinco registros (posiciones del 1 al 5). Storage público de lectura `eva-publico/indicadores/`; escritura restringida a sesión administrativa con MFA.
- La galería de fondos pertenece a «Indicadores». La pestaña «Destacados» administra recursos y herramientas destacados; no se duplica ahí esta función.

## Comprobaciones y observaciones

- Estructura y estilos del repositorio revisados tras los ajustes de ancho y máscara del carrusel.
- Validación visual del usuario: franja a ancho completo aprobada y desvanecimiento en los extremos aprobado.
- Se había verificado la sintaxis JavaScript de la gestión de fondos, la existencia de la tabla, la seguridad por filas y las políticas de acceso.
- Una fotografía publicada fue observada en capturas del usuario.
- No se declara como ejecutada una prueba integral con cinco fotografías diferentes ni una auditoría visual automatizada multiplataforma.

## Criterio de cierre

Cierre funcional y visual aprobado para la franja pública. Galería administrativa implementada; las operaciones completas con cinco fotografías siguen sujetas a validación real si posteriormente se desea declarar aceptación integral de todas las funciones. No modificar «Destacados» por esta implementación.
