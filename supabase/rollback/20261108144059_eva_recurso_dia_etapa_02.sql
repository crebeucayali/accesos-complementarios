-- REVERSION CONTROLADA: etapa 02 del Recurso del dia.
-- Ejecutar solo si no hay registros; jamás borrar programación real.
begin;
do $$
begin
  if exists (select 1 from public.eva_recurso_dia_programacion limit 1) then
    raise exception 'Reversion detenida: existen recursos programados. Exportar y coordinar migracion de datos antes de proceder.';
  end if;
end $$;
drop view if exists public.eva_recurso_dia_publico;
drop table if exists public.eva_recurso_dia_programacion;
drop function if exists private.eva_dia_actualizar_fecha();
commit;
-- Nota: el historial de supabase_migrations no se manipula automaticamente.
