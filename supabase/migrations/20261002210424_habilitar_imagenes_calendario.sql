alter table public.calendario_actividades
  add column if not exists imagen_url text,
  add column if not exists imagen_alt text;

alter table public.calendario_actividades
  drop constraint if exists calendario_imagen_url_valida,
  add constraint calendario_imagen_url_valida check (
    imagen_url is null
    or imagen_url = ''
    or imagen_url ~ '^https://dteimbhwtzghhsijeeld[.]supabase[.]co/storage/v1/object/public/eva-publico/calendario/[A-Za-z0-9._/-]+[.](jpg|jpeg|png|webp)$'
    or imagen_url ~ '^imagenes-calendario/[A-Za-z0-9._/-]+[.](jpg|jpeg|png|webp)$'
  ),
  drop constraint if exists calendario_imagen_alt_requerido,
  add constraint calendario_imagen_alt_requerido check (
    imagen_url is null or imagen_url = '' or length(btrim(coalesce(imagen_alt,''))) > 0
  );

create or replace view public.calendario_publico
with (security_invoker = true)
as
select
  'actividad-'::text || a.id::text as registro_id,
  a.fecha,
  'calendario'::text as fuente,
  a.orden::integer as orden,
  a.estado,
  a.clase_css,
  a.contenido_lineas,
  null::smallint as jornada,
  null::smallint as numero_sesion,
  a.updated_at,
  nullif(a.imagen_url,'') as imagen_url,
  nullif(a.imagen_alt,'') as imagen_alt
from public.calendario_actividades a
where a.visible = true
union all
select
  'capacitacion-'::text || c.id::text as registro_id,
  c.fecha,
  'capacitaciones'::text as fuente,
  900 + c.jornada::integer * 50 + c.numero_sesion::integer as orden,
  c.estado,
  ''::text as clase_css,
  to_jsonb(array_remove(array[
    'Capacitación virtual'::text,
    case when c.jornada = 1 then 'Primera jornada · Sesión '::text || c.numero_sesion::text
         else 'Segunda jornada · Sesión '::text || c.numero_sesion::text end,
    c.titulo,
    case when btrim(c.tema) = ''::text or c.tema ilike 'Los materiales de esta sesión%'
         then null::text
         else regexp_replace(c.tema, '^Tema:[[:space:]]*'::text, ''::text, 'i'::text) end
  ], null::text)) as contenido_lineas,
  c.jornada,
  c.numero_sesion,
  c.updated_at,
  null::text as imagen_url,
  null::text as imagen_alt
from public.capacitaciones_sesiones c
where c.visible = true;

alter policy "eva_publico_admin_mfa_insert" on storage.objects
with check (
  bucket_id = 'eva-publico'
  and (storage.foldername(name))[1] = any (array['noticias','capacitaciones','repositorio','galeria','calendario'])
  and (select private.es_admin_mfa())
);

alter policy "eva_publico_admin_mfa_update" on storage.objects
using (
  bucket_id = 'eva-publico'
  and (storage.foldername(name))[1] = any (array['noticias','capacitaciones','repositorio','galeria','calendario'])
  and (select private.es_admin_mfa())
)
with check (
  bucket_id = 'eva-publico'
  and (storage.foldername(name))[1] = any (array['noticias','capacitaciones','repositorio','galeria','calendario'])
  and (select private.es_admin_mfa())
);

alter policy "eva_publico_admin_mfa_delete" on storage.objects
using (
  bucket_id = 'eva-publico'
  and (storage.foldername(name))[1] = any (array['noticias','capacitaciones','repositorio','galeria','calendario'])
  and (select private.es_admin_mfa())
);
