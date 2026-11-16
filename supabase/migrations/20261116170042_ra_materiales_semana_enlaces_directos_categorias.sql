-- 16/11/2026. Categorías de los tres materiales para enlazar su ficha individual.
-- Conserva filtros de publicación, orden, período y seguridad invoker.
create or replace view public.ra_materiales_semana_publicos
with (security_invoker = true)
as
select
  p.id as programacion_id,
  p.fecha_inicio,
  p.fecha_fin,
  case
    when p.fecha_fin < (now() at time zone 'America/Lima')::date then 'destacados'::text
    else 'semana'::text
  end as etiqueta,
  r1.id as material_1_id,
  r1.titulo as titulo_1,
  r1.descripcion as descripcion_1,
  r1.imagen_url as imagen_1,
  r1.imagen_alt as alt_1,
  r2.id as material_2_id,
  r2.titulo as titulo_2,
  r2.descripcion as descripcion_2,
  r2.imagen_url as imagen_2,
  r2.imagen_alt as alt_2,
  r3.id as material_3_id,
  r3.titulo as titulo_3,
  r3.descripcion as descripcion_3,
  r3.imagen_url as imagen_3,
  r3.imagen_alt as alt_3,
  r1.categoria as categoria_1,
  r2.categoria as categoria_2,
  r3.categoria as categoria_3
from public.ra_materiales_semana p
join public.repositorio_recursos r1 on r1.id = p.material_1_id
join public.repositorio_recursos r2 on r2.id = p.material_2_id
join public.repositorio_recursos r3 on r3.id = p.material_3_id
where p.estado = 'programado'
  and p.fecha_inicio <= (now() at time zone 'America/Lima')::date
  and r1.estado_publicacion = 'publicado' and r1.visible
  and r2.estado_publicacion = 'publicado' and r2.visible
  and r3.estado_publicacion = 'publicado' and r3.visible
  and btrim(r1.imagen_url) <> '' and btrim(r1.descripcion) <> '' and btrim(r1.imagen_alt) <> ''
  and btrim(r2.imagen_url) <> '' and btrim(r2.descripcion) <> '' and btrim(r2.imagen_alt) <> ''
  and btrim(r3.imagen_url) <> '' and btrim(r3.descripcion) <> '' and btrim(r3.imagen_alt) <> ''
order by p.fecha_inicio desc, p.id desc
limit 1;
