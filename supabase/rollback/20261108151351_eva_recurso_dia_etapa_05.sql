-- Reversión etapa 05. Conserva registros. Ejecutar solo tras revisar datos activos.
begin;
do $$
begin
 if exists(select 1 from public.eva_recurso_dia_programacion where estado in ('programado','publicado')) then
   raise exception 'Reversión detenida: existen recursos activos; primero revisar y retirar su programación.';
 end if;
end $$;
alter table public.eva_recurso_dia_programacion drop constraint if exists eva_dia_etapa05_aprobacion_ck;
drop policy if exists eva_dia_publico_hoy on public.eva_recurso_dia_programacion;
create policy eva_dia_publico_hoy on public.eva_recurso_dia_programacion
for select to anon using (
  estado in ('programado','publicado')
  and fecha=(now() at time zone 'America/Lima')::date
  and derechos_verificados and revision_pedagogica
);
create or replace view public.eva_recurso_dia_publico with (security_invoker=true) as
select fecha,tipo,lsp_id,arasaac_ids,titulo,descripcion,texto_alternativo,
       imagen_lsp_url,fuente_url,atribucion,licencia
from public.eva_recurso_dia_programacion
where estado in ('programado','publicado')
  and fecha=(now() at time zone 'America/Lima')::date
  and derechos_verificados and revision_pedagogica;
commit;
-- Historial de migraciones no se modifica automáticamente.
