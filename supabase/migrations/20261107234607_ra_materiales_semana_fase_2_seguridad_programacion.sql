
create table public.ra_materiales_semana (
  id bigint generated always as identity primary key,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'borrador',
  material_1_id bigint references public.repositorio_recursos(id) on delete restrict,
  material_2_id bigint references public.repositorio_recursos(id) on delete restrict,
  material_3_id bigint references public.repositorio_recursos(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint ra_semana_estado_ck check (estado in ('borrador','programado','desactivado')),
  constraint ra_semana_fechas_ck check (fecha_fin between fecha_inicio and fecha_inicio + 6),
  constraint ra_semana_tripleta_ck check (
    estado <> 'programado' or (
      material_1_id is not null and material_2_id is not null and material_3_id is not null
      and material_1_id <> material_2_id
      and material_1_id <> material_3_id
      and material_2_id <> material_3_id
    )
  ),
  constraint ra_semana_programaciones_sin_solapar
    exclude using gist (daterange(fecha_inicio, fecha_fin, '[]') with &&)
    where (estado = 'programado')
);

comment on table public.ra_materiales_semana is 'Programación semanal de exactamente tres materiales del catálogo RA; sin duplicar imágenes ni contenido.';
comment on column public.ra_materiales_semana.fecha_fin is 'Último día visible inclusive, horario local de Perú. El periodo máximo es siete días.';

create or replace function private.ra_validar_materiales_semana()
returns trigger language plpgsql set search_path = '' as $$
declare n integer;
begin
  if new.estado <> 'programado' then return new; end if;
  select count(*) into n
    from public.repositorio_recursos r
   where r.id in (new.material_1_id,new.material_2_id,new.material_3_id)
     and r.estado_publicacion = 'publicado' and r.visible = true
     and btrim(r.imagen_url) <> ''
     and btrim(r.imagen_alt) <> ''
     and btrim(r.descripcion) <> '';
  if n <> 3 then
    raise exception 'Los tres materiales deben estar publicados y contar con fotografía, texto alternativo y descripción.'
      using errcode = '23514';
  end if;
  return new;
end $$;

create or replace function private.ra_actualizar_fecha_semana()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger ra_semana_validar_contenido
before insert or update of estado,material_1_id,material_2_id,material_3_id
on public.ra_materiales_semana
for each row execute function private.ra_validar_materiales_semana();

create trigger ra_semana_actualizado
before update on public.ra_materiales_semana
for each row execute function private.ra_actualizar_fecha_semana();

alter table public.ra_materiales_semana enable row level security;
alter table public.ra_materiales_semana force row level security;

revoke all on table public.ra_materiales_semana from public,anon,authenticated;
grant select on table public.ra_materiales_semana to anon,authenticated;
grant insert,update,delete on table public.ra_materiales_semana to authenticated;

create policy ra_semana_lectura_anon on public.ra_materiales_semana
for select to anon using (
 estado = 'programado' and fecha_inicio <= (now() at time zone 'America/Lima')::date
);

create policy ra_semana_lectura_autenticados on public.ra_materiales_semana
for select to authenticated using (
 (estado = 'programado' and fecha_inicio <= (now() at time zone 'America/Lima')::date)
 or (select private.permite_modulo('repositorio', false))
);

create policy ra_semana_insertar_master on public.ra_materiales_semana
for insert to authenticated with check ((select private.es_admin_mfa()));

create policy ra_semana_actualizar_master on public.ra_materiales_semana
for update to authenticated
using ((select private.es_admin_mfa()))
with check ((select private.es_admin_mfa()));

create policy ra_semana_eliminar_master on public.ra_materiales_semana
for delete to authenticated using ((select private.es_admin_mfa()));

create view public.ra_materiales_semana_publicos
with (security_invoker = true)
as
select
 p.id as programacion_id, p.fecha_inicio, p.fecha_fin,
 case when p.fecha_fin < (now() at time zone 'America/Lima')::date
      then 'destacados' else 'semana' end as etiqueta,
 r1.id as material_1_id, r1.titulo as titulo_1, r1.descripcion as descripcion_1,
 r1.imagen_url as imagen_1, r1.imagen_alt as alt_1,
 r2.id as material_2_id, r2.titulo as titulo_2, r2.descripcion as descripcion_2,
 r2.imagen_url as imagen_2, r2.imagen_alt as alt_2,
 r3.id as material_3_id, r3.titulo as titulo_3, r3.descripcion as descripcion_3,
 r3.imagen_url as imagen_3, r3.imagen_alt as alt_3
from public.ra_materiales_semana p
join public.repositorio_recursos r1 on r1.id = p.material_1_id
join public.repositorio_recursos r2 on r2.id = p.material_2_id
join public.repositorio_recursos r3 on r3.id = p.material_3_id
where p.estado='programado'
  and p.fecha_inicio <= (now() at time zone 'America/Lima')::date
  and r1.estado_publicacion='publicado' and r1.visible
  and r2.estado_publicacion='publicado' and r2.visible
  and r3.estado_publicacion='publicado' and r3.visible
  and btrim(r1.imagen_url) <> '' and btrim(r1.descripcion) <> '' and btrim(r1.imagen_alt) <> ''
  and btrim(r2.imagen_url) <> '' and btrim(r2.descripcion) <> '' and btrim(r2.imagen_alt) <> ''
  and btrim(r3.imagen_url) <> '' and btrim(r3.descripcion) <> '' and btrim(r3.imagen_alt) <> ''
order by p.fecha_inicio desc,p.id desc
limit 1;

revoke all on public.ra_materiales_semana_publicos from public,anon,authenticated;
grant select on public.ra_materiales_semana_publicos to anon,authenticated;

comment on view public.ra_materiales_semana_publicos is 'Único grupo semanal vigente; si no hay grupo vigente, conserva la última terna válida como Materiales destacados. Solo datos publicados.';
