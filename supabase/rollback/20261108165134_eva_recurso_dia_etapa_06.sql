-- Etapa 06: revertir solamente la vista de ayer y el alcance de lectura anónima.
-- Conserva íntegra la tabla, las programaciones y la vista pública de hoy.
begin;
drop view if exists public.eva_recurso_ayer_publico;
drop policy if exists eva_dia_publico_hoy_ayer on public.eva_recurso_dia_programacion;
create policy eva_dia_publico_hoy on public.eva_recurso_dia_programacion
  for select to anon
  using (
    estado='programado' and tipo='arasaac'
    and fecha=(now() at time zone 'America/Lima')::date
    and derechos_verificados and revision_pedagogica
  );
commit;
-- No editar manualmente el historial de migraciones.
