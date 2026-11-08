-- Applied in Supabase on 2026-11-08. Enable reviewed LSP and ARASAAC in both daily slots.
begin;
alter table public.eva_recurso_dia_programacion drop constraint if exists eva_dia_etapa05_aprobacion_ck;
alter table public.eva_recurso_dia_programacion add constraint eva_dia_etapa05_aprobacion_ck check (
  estado not in ('programado','publicado') or (estado='programado' and (
  (tipo='arasaac' and fuente_url ~ '^https://(www[.])?arasaac[.]org(/|$)'
    and licencia='CC BY-NC-SA 4.0' and position('Sergio Palao' in atribucion)>0
    and position('ARASAAC' in atribucion)>0 and position('Gobierno de Aragón' in atribucion)>0
    and referencia_derechos='https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es')
  or (tipo='lsp' and fuente_url like 'https://crebeucayali.github.io/banco-digital-accesible/lsp/%'
    and imagen_lsp_url like 'https://crebeucayali.github.io/banco-digital-accesible/lsp/imagenes/%'
    and position('Ministerio de Educación del Perú' in atribucion)>0
    and length(btrim(referencia_derechos))>0))));
drop policy if exists eva_dia_publico_hoy_ayer on public.eva_recurso_dia_programacion;
create policy eva_dia_publico_hoy_ayer on public.eva_recurso_dia_programacion for select to anon using (
  estado='programado' and tipo in ('arasaac','lsp')
  and fecha in ((now() at time zone 'America/Lima')::date,(now() at time zone 'America/Lima')::date-1)
  and derechos_verificados and revision_pedagogica);
create or replace view public.eva_recurso_dia_publico with (security_invoker=true) as
select fecha,tipo,lsp_id,arasaac_ids,titulo,descripcion,texto_alternativo,imagen_lsp_url,fuente_url,atribucion,licencia
from public.eva_recurso_dia_programacion
where estado='programado' and tipo in ('lsp','arasaac') and fecha=(now() at time zone 'America/Lima')::date
and derechos_verificados and revision_pedagogica;
create or replace view public.eva_recurso_ayer_publico with (security_invoker=true) as
select fecha,tipo,lsp_id,arasaac_ids,titulo,descripcion,texto_alternativo,imagen_lsp_url,fuente_url,atribucion,licencia
from public.eva_recurso_dia_programacion
where estado='programado' and tipo in ('lsp','arasaac') and fecha=(now() at time zone 'America/Lima')::date-1
and derechos_verificados and revision_pedagogica;
commit;
