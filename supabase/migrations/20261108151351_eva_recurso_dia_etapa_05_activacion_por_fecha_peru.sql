
-- Etapa 05: aprobación ARASAAC y activación por fecha de Lima; sin tareas Cron.
-- LSP no programable hasta demostrar derechos de republicación de sus imágenes.
alter table public.eva_recurso_dia_programacion
  add constraint eva_dia_etapa05_aprobacion_ck check (
    estado not in ('programado','publicado') or (
      estado = 'programado'
      and tipo = 'arasaac'
      and fuente_url ~ '^https://(www\.)?arasaac\.org(/|$)'
      and licencia = 'CC BY-NC-SA 4.0'
      and position('Sergio Palao' in atribucion) > 0
      and position('ARASAAC' in atribucion) > 0
      and position('Gobierno de Aragón' in atribucion) > 0
      and referencia_derechos = 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es'
    )
  );
drop policy if exists eva_dia_publico_hoy on public.eva_recurso_dia_programacion;
create policy eva_dia_publico_hoy on public.eva_recurso_dia_programacion
  for select to anon
  using (
    estado='programado'
    and tipo='arasaac'
    and fecha=(now() at time zone 'America/Lima')::date
    and derechos_verificados and revision_pedagogica
  );
create or replace view public.eva_recurso_dia_publico
with (security_invoker=true) as
select fecha,tipo,lsp_id,arasaac_ids,titulo,descripcion,texto_alternativo,
       imagen_lsp_url,fuente_url,atribucion,licencia
  from public.eva_recurso_dia_programacion
 where estado='programado'
   and tipo='arasaac'
   and fecha=(now() at time zone 'America/Lima')::date
   and derechos_verificados and revision_pedagogica;
comment on constraint eva_dia_etapa05_aprobacion_ck on public.eva_recurso_dia_programacion
 is 'Etapa 05: programa ARASAAC con atribución completa; bloquea LSP mientras no conste autorización de ilustraciones MINEDU y reserva publicado para futuras etapas.';
comment on view public.eva_recurso_dia_publico
 is 'Motor de fecha peruana: un recurso ARASAAC programado y aprobado para hoy; security_invoker con RLS, sin cron.';
