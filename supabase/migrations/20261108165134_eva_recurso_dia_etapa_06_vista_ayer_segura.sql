-- EVA Etapa 06: ventana publica limitada a hoy y ayer (America/Lima).
-- Los borradores, las fechas futuras y las ilustraciones LSP continuan bloqueados.
drop policy if exists eva_dia_publico_hoy on public.eva_recurso_dia_programacion;
create policy eva_dia_publico_hoy_ayer
  on public.eva_recurso_dia_programacion
  for select to anon
  using (
    estado = 'programado'
    and tipo = 'arasaac'
    and fecha in (
      (now() at time zone 'America/Lima')::date,
      (now() at time zone 'America/Lima')::date - 1
    )
    and derechos_verificados and revision_pedagogica
  );
create view public.eva_recurso_ayer_publico
with (security_invoker = true) as
select fecha, tipo, lsp_id, arasaac_ids, titulo, descripcion,
       texto_alternativo, imagen_lsp_url, fuente_url, atribucion, licencia
from public.eva_recurso_dia_programacion
where estado = 'programado'
  and tipo = 'arasaac'
  and fecha = (now() at time zone 'America/Lima')::date - 1
  and derechos_verificados and revision_pedagogica;
revoke all on public.eva_recurso_ayer_publico from public, anon, authenticated;
grant select on public.eva_recurso_ayer_publico to anon, authenticated;
comment on view public.eva_recurso_ayer_publico
is 'Recurso aprobado exclusivamente del dia anterior en Peru. Vista de solo lectura, security_invoker, protegida por RLS, no muestra borradores ni fechas anteriores.';
