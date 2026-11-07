# RA · Materiales de la semana · Fase 2

## Alcance ejecutado (7 de noviembre de 2026)

Migración aplicada en Supabase CREBE: `20261107234607_ra_materiales_semana_fase_2_seguridad_programacion`.

- Tabla `public.ra_materiales_semana`: una fila por periodo, tres referencias independientes a recursos publicados, ordenados como posiciones 1, 2 y 3.
- Estados: `borrador`, `programado`, `desactivado`.
- Periodos inclusivos de 1 a 7 días; exclusión GiST de periodos programados superpuestos.
- Claves foráneas `ON DELETE RESTRICT`: no se eliminan recursos referenciados por una programación.
- Validación al programar: tres recursos distintos, publicados, con fotografía, descripción y texto alternativo.
- RLS activada y forzada. Escritura solo para usuario master con MFA AAL2, mediante `private.es_admin_mfa()`. Lectura administrativa acorde al módulo Repositorio.
- Vista `public.ra_materiales_semana_publicos` con `security_invoker=true`: un grupo programado vigente; si no lo hay, el último grupo válido anterior con etiqueta `destacados`. No expone borradores ni futuros.
- Fechas evaluadas en zona horaria `America/Lima`.

**Sin cambios** en la página principal, panel administrativo, catálogo `repositorio_recursos`, fotografías, Storage, otros módulos ni monitores. La tabla nueva quedó sin datos.

## Verificaciones efectuadas

1. Inspección de cinco políticas RLS, llaves foráneas, controles de fechas, exclusión de periodos y `security_invoker`.
2. Transacción de prueba revertida: programación válida; rechazo de semanas superpuestas; tres materiales repetidos; periodo de más de siete días; material incompleto; referencia inexistente; eliminación de recurso referenciado.
3. Transacción de prueba revertida: una programación anterior aparece como `destacados` y una vigente aparece como `semana`.
4. Acceso `anon`: lectura de vistas vacías sin programación, sin privilegios de insertar, modificar ni borrar.
5. Comprobación posterior: 21 recursos conservados y 0 programaciones persistidas.
6. Advisors de seguridad: sin hallazgos nuevos atribuidos a las estructuras de esta fase; continúan avisos preexistentes relativos a funciones y Auth.

Las verificaciones funcionales con sesión master real, navegador, carrusel y panel quedan para las fases 3 a 5.

## Reversión planificada, NO EJECUTAR durante el uso normal

Antes de cualquier reversión, asegurar copia de seguridad y confirmar que no existen programaciones a conservar. Las instrucciones siguientes eliminarían los datos de la **nueva** tabla exclusivamente, por lo que deben ejecutarse solo ante una decisión expresa de rollback.

```sql
begin;
drop view if exists public.ra_materiales_semana_publicos;
drop table if exists public.ra_materiales_semana;
drop function if exists private.ra_validar_materiales_semana();
drop function if exists private.ra_actualizar_fecha_semana();
commit;
```

No cambiar `repositorio_recursos` ni `eva_recursos_destacados`.

## Siguiente fase

Fase 3: subpestaña administrativa de selección y programación. Mantener cerrada la publicación pública hasta que funcionen permisos, vista previa y validaciones de interfaz. No duplicar imágenes ni modificar la edición existente del catálogo.
