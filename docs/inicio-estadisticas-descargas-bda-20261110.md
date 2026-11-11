# Inicio del seguimiento de descargas BDA (LSP) — 10 de noviembre de 2026

## Alcance validado
El inventario del Banco Digital Accesible identificó el visor de imágenes de Lengua de Señas Peruana, que ofrece el enlace `Descargar imagen original`. El diccionario actualmente contiene 1118 entradas, todas con rutas PNG. La vista ampliada, las búsquedas y las consultas de señas no cuentan como descarga. La Biblioteca Accesible y sus enlaces externos quedan fuera de esta etapa.

## Registro implementado
Se incorporó `eva_recursos_api.bda_acciones_diarias`, agregado por fecha local de Perú, herramienta, formato y acción, y `eva_recursos_api.bda_eventos_recientes` para deduplicación temporal por UUID. Son tablas privadas, con RLS y sin SELECT para los roles `anon` ni `authenticated`.

El RPC `public.registrar_accion_recurso_bda` acepta exclusivamente `lsp/png/descarga_solicitada`, con validación del lado servidor. No acepta palabras, nombres de archivo, identificadores del visitante ni contenidos de imágenes. El RPC `public.admin_estadisticas_recursos_bda(p_dias)` permite lectura a una cuenta master con MFA AAL2; queda preparado para incorporarlo al panel administrativo en una etapa posterior, sin haber añadido aún una tarjeta de BDA al panel.

Las acciones de BDA permanecen separadas de las de MEA y de los contadores de visitas de EVA.

## Integración de interfaz
En `banco-digital-accesible/lsp/`, el cliente `estadisticas/recursos-bda.js` registra una solicitud al hacer clic en el enlace de descarga de un PNG alojado en el mismo origen HTTPS. Abrir la imagen o cerrar el visor no genera eventos. El registro es no bloqueante para la descarga.

## Validaciones automatizadas
- PostgreSQL temporal: https://github.com/crebeucayali/accesos-complementarios/actions/runs/42955340856. Probó dos acciones diferentes, una solicitud repetida descartada, validación estricta de formato, fecha Perú, aislamiento de las tablas MEA y denegación de lectura sin MFA.
- Chromium: https://github.com/crebeucayali/banco-digital-accesible/actions/runs/42955345816. Descarga real de PNG en escritorio y vista móvil simulada; un solo evento al pulsar el enlace, ninguno al ampliar o cerrar, campos limitados al esquema permitido y descarga conservada ante respuesta 503 del servidor estadístico.
- Las pruebas de navegador utilizaron un recurso gráfico de ejemplo y RPC simulado. No ingresaron valores en los agregados de Supabase de producción.

## Límites
Esta intervención **no** certifica aún una descarga humana de LSP en producción ni la visualización de BDA en el panel administrativo. Esas validaciones corresponden a las fases siguientes. En ningún caso el contador confirma que el archivo se haya guardado finalmente o que exista una persona única detrás de la solicitud. La biblioteca y demás recursos BDA requieren inventario propio antes de instrumentarlos.

## Próximos pasos
1. Verificar funciones y permisos en Supabase real sin insertar acciones ficticias.
2. Comprobar que el visor publicado carga el cliente.
3. Ejecutar al menos una descarga genuina y contrastar su incremento con la tabla BDA.
4. Extender al panel administrativo los agregados BDA manteniendo las secciones y totales de MEA y EVA independientes.
