
create table public.eva_recurso_dia_programacion (
  id bigint generated always as identity primary key,
  fecha date not null,
  tipo text not null check (tipo in ('lsp','arasaac')),
  lsp_id text,
  arasaac_ids bigint[] not null default '{}'::bigint[],
  titulo text not null default '',
  descripcion text not null default '',
  texto_alternativo text not null default '',
  imagen_lsp_url text,
  fuente_url text not null default '',
  atribucion text not null default '',
  licencia text not null default '',
  derechos_verificados boolean not null default false,
  referencia_derechos text not null default '',
  revision_pedagogica boolean not null default false,
  estado text not null default 'borrador' check (estado in ('borrador','programado','publicado','retirado')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint eva_dia_fuente_exclusiva_ck check (
    (tipo = 'lsp' and lsp_id ~ '^LSP-[0-9]{6}$' and cardinality(arasaac_ids)=0)
    or
    (tipo = 'arasaac' and nullif(btrim(coalesce(lsp_id,'')), '') is null
      and cardinality(arasaac_ids) between 1 and 3 and 0 < all(arasaac_ids)
      and array_position(arasaac_ids, null) is null)
  ),
  constraint eva_dia_publicable_ck check (
    estado not in ('programado','publicado') or (
      btrim(titulo)<>'' and btrim(descripcion)<>'' and btrim(texto_alternativo)<>''
      and btrim(fuente_url)<>'' and btrim(atribucion)<>'' and btrim(licencia)<>''
      and derechos_verificados and btrim(referencia_derechos)<>''
      and revision_pedagogica
      and (tipo <> 'lsp' or btrim(coalesce(imagen_lsp_url,''))<>'')
    )
  )
);
comment on table public.eva_recurso_dia_programacion is 'Un recurso diario LSP o ARASAAC programado mensualmente; sin registros iniciales y con derechos pedagógicos obligatorios para programar.';
comment on column public.eva_recurso_dia_programacion.fecha is 'Fecha civil del calendario de Peru (America/Lima); nunca se calcula por zona horaria del navegador.';
comment on column public.eva_recurso_dia_programacion.referencia_derechos is 'Referencia documental verificable de licencia/autorizacion; no indica que los derechos LSP ya hayan sido aprobados.';
create unique index eva_dia_unico_activo_fecha on public.eva_recurso_dia_programacion(fecha)
  where estado in ('programado','publicado');
create index eva_dia_fecha_estado on public.eva_recurso_dia_programacion(fecha,estado);
create or replace function private.eva_dia_actualizar_fecha()
returns trigger language plpgsql set search_path='' as $$
begin
  new.actualizado_en:=now();
  return new;
end $$;
create trigger eva_dia_actualizar
before update on public.eva_recurso_dia_programacion
for each row execute function private.eva_dia_actualizar_fecha();
alter table public.eva_recurso_dia_programacion enable row level security;
alter table public.eva_recurso_dia_programacion force row level security;
revoke all on public.eva_recurso_dia_programacion from public,anon,authenticated;
grant select on public.eva_recurso_dia_programacion to anon,authenticated;
grant insert,update,delete on public.eva_recurso_dia_programacion to authenticated;
grant usage,select on sequence public.eva_recurso_dia_programacion_id_seq to authenticated;
create policy eva_dia_publico_hoy on public.eva_recurso_dia_programacion
for select to anon
using (estado in ('programado','publicado')
  and fecha=(now() at time zone 'America/Lima')::date
  and derechos_verificados and revision_pedagogica);
create policy eva_dia_admin_lectura on public.eva_recurso_dia_programacion
for select to authenticated using ((select private.es_admin_mfa()));
create policy eva_dia_admin_insertar on public.eva_recurso_dia_programacion
for insert to authenticated with check ((select private.es_admin_mfa()));
create policy eva_dia_admin_actualizar on public.eva_recurso_dia_programacion
for update to authenticated
using ((select private.es_admin_mfa()))
with check ((select private.es_admin_mfa()));
create policy eva_dia_admin_eliminar on public.eva_recurso_dia_programacion
for delete to authenticated using ((select private.es_admin_mfa()));
create view public.eva_recurso_dia_publico
with (security_invoker = true) as
select fecha, tipo, lsp_id, arasaac_ids, titulo, descripcion,
  texto_alternativo, imagen_lsp_url, fuente_url, atribucion, licencia
from public.eva_recurso_dia_programacion
where estado in ('programado','publicado')
  and fecha=(now() at time zone 'America/Lima')::date
  and derechos_verificados and revision_pedagogica;
revoke all on public.eva_recurso_dia_publico from public,anon,authenticated;
grant select on public.eva_recurso_dia_publico to anon,authenticated;
comment on view public.eva_recurso_dia_publico is 'Solo recurso diario aprobado para fecha America/Lima, sin borradores, historico futuro ni metadatos administrativos; security_invoker RLS.';
