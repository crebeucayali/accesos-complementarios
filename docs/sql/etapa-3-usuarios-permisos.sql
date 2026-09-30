-- Etapa 3: ejecutar mediante apply_migration; no crea cuentas Auth ni envía correo.
-- Preserva el UUID del único administrador activo existente.
do $$
begin
  if (select count(*) from admin_guard.admin_usuarios_autorizados where activo) <> 1 then
    raise exception 'Se requiere revisar la identidad del administrador principal antes de migrar';
  end if;
end $$;

alter table admin_guard.admin_usuarios_autorizados
  add column email text,
  add column nombre text not null default '',
  add column rol text not null default 'editor',
  add column modulos text[] not null default '{}';
update admin_guard.admin_usuarios_autorizados a
set email = lower(btrim(u.email)),
    nombre = case when a.activo then 'Administración principal CREBE' else '' end,
    rol = case when a.activo then 'master' else 'editor' end
from auth.users u where u.id = a.user_id;
alter table admin_guard.admin_usuarios_autorizados
  alter column email set not null,
  add constraint admin_usuarios_email_valido check (email = lower(btrim(email)) and position('@' in email) > 1),
  add constraint admin_usuarios_roles check (rol in ('master','editor','consulta')),
  add constraint admin_usuarios_modulos check (modulos <@ array['capacitaciones','calendario','noticias','galeria','repositorio','materiales']::text[] and array_position(modulos,null) is null),
  add constraint admin_usuarios_master_activo check (rol <> 'master' or activo);
create unique index admin_usuarios_unico_master on admin_guard.admin_usuarios_autorizados (rol) where rol = 'master';
create unique index admin_usuarios_email_unico on admin_guard.admin_usuarios_autorizados (email);
alter table admin_guard.admin_usuarios_autorizados enable row level security;
revoke all on admin_guard.admin_usuarios_autorizados from public, anon, authenticated;

-- Amplía la preautorización existente; nunca se usa el correo como identidad de sesión.
alter table admin_guard.admin_correos_autorizados
  add column nombre text not null default '',
  add column rol text not null default 'editor' check (rol in ('editor','consulta')),
  add column modulos text[] not null default '{}',
  add column autorizado_por uuid references auth.users(id),
  add constraint admin_correos_modulos check (modulos <@ array['capacitaciones','calendario','noticias','galeria','repositorio','materiales']::text[] and array_position(modulos,null) is null);
alter table admin_guard.admin_correos_autorizados enable row level security;
revoke all on admin_guard.admin_correos_autorizados from public, anon, authenticated;
alter table private.auditoria_administrativa add column eventos text[] not null default '{}';
create index auditoria_admin_usuario_fecha on private.auditoria_administrativa (tabla,registro_clave,fecha desc);

create or replace function private.proteger_cuenta_master()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.rol = 'master' then
    if tg_op = 'DELETE' then raise exception 'La cuenta master está protegida' using errcode='42501'; end if;
    if new.user_id is distinct from old.user_id or new.rol is distinct from old.rol
       or new.activo is distinct from old.activo or new.email is distinct from old.email
       or new.modulos is distinct from old.modulos then
      raise exception 'Los privilegios e identidad del master no pueden cambiar desde operaciones normales' using errcode='42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  new.actualizado_at := clock_timestamp();
  return new;
end $$;
revoke all on function private.proteger_cuenta_master() from public, anon, authenticated;
create trigger proteger_cuenta_master before update or delete on admin_guard.admin_usuarios_autorizados
for each row execute function private.proteger_cuenta_master();

create or replace function private.es_admin_autorizado()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from admin_guard.admin_usuarios_autorizados a join auth.users u on u.id=a.user_id
    where a.user_id=(select auth.uid()) and a.activo and u.email_confirmed_at is not null
  );
$$;
-- La puerta administrativa antigua pasa a ser exclusiva del master.
create or replace function private.es_admin_mfa()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.es_admin_autorizado() and coalesce((select auth.jwt()->>'aal'),'')='aal2'
  and exists(select 1 from admin_guard.admin_usuarios_autorizados where user_id=(select auth.uid()) and rol='master');
$$;
create or replace function private.permite_modulo(p_modulo text, p_escritura boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_modulo = any(array['capacitaciones','calendario','noticias','galeria','repositorio'])
  and private.es_admin_autorizado() and coalesce((select auth.jwt()->>'aal'),'')='aal2'
  and exists(select 1 from admin_guard.admin_usuarios_autorizados a where a.user_id=(select auth.uid())
    and (a.rol='master' or (p_modulo=any(a.modulos) and (a.rol='editor' or (a.rol='consulta' and not p_escritura)))));
$$;
revoke all on function private.permite_modulo(text,boolean) from public, anon;
grant execute on function private.permite_modulo(text,boolean) to authenticated, service_role;

create or replace function private.perfil_panel_admin()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_build_object('autorizado',true,'aal',coalesce((select auth.jwt()->>'aal'),''),
    'user_id',a.user_id,'email',a.email,'nombre',a.nombre,'rol',a.rol,
    'modulos',case when a.rol='master' then array['capacitaciones','calendario','noticias','galeria','repositorio'] else a.modulos end)
    from admin_guard.admin_usuarios_autorizados a where a.user_id=(select auth.uid()) and private.es_admin_autorizado()),
    jsonb_build_object('autorizado',false,'aal',coalesce((select auth.jwt()->>'aal'),'')));
$$;
create or replace function public.perfil_panel_admin()
returns jsonb language sql stable security invoker set search_path='' as $$ select private.perfil_panel_admin(); $$;
revoke all on function private.perfil_panel_admin(), public.perfil_panel_admin() from public, anon;
grant execute on function private.perfil_panel_admin(), public.perfil_panel_admin() to authenticated, service_role;

create or replace function private.validar_asignacion(p_nombre text,p_rol text,p_modulos text[])
returns void language plpgsql set search_path='' as $$
begin
  if p_nombre is null or char_length(btrim(p_nombre)) not between 1 and 160
     or p_rol is null or p_rol not in ('editor','consulta')
     or p_modulos is null or not p_modulos <@ array['capacitaciones','calendario','noticias','galeria','repositorio']::text[]
     or array_position(p_modulos,null) is not null then
    raise exception 'Nombre, rol o módulos no permitidos' using errcode='22023';
  end if;
end $$;
revoke all on function private.validar_asignacion(text,text,text[]) from public, anon;
grant execute on function private.validar_asignacion(text,text,text[]) to authenticated,service_role;

create or replace function private.auditar_autorizacion_usuario()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_antes jsonb; v_despues jsonb; v_eventos text[] := '{}'; v_actor uuid; v_clave text;
begin
  if tg_op in ('UPDATE','DELETE') then v_antes:=to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_despues:=to_jsonb(new); end if;
  if tg_op='INSERT' then v_eventos:=array['autorizacion_usuario','asignacion_rol','asignacion_modulos','modificacion_permisos'];
  elsif tg_op='DELETE' then v_eventos:=array['retiro_autorizacion','modificacion_permisos'];
  else
    if v_antes->'activo' is distinct from v_despues->'activo' then
      v_eventos:=array_append(v_eventos,case when (v_despues->>'activo')::boolean then 'activacion' else 'desactivacion' end);
    end if;
    if v_antes->'rol' is distinct from v_despues->'rol' then v_eventos:=array_append(v_eventos,'cambio_rol'); end if;
    if v_antes->'modulos' is distinct from v_despues->'modulos' then v_eventos:=array_append(v_eventos,'cambio_modulos'); end if;
    if cardinality(v_eventos)>0 then v_eventos:=array_append(v_eventos,'modificacion_permisos'); else v_eventos:=array['actualizacion_usuario']; end if;
  end if;
  v_clave:=coalesce(v_despues->>'user_id',v_antes->>'user_id',v_despues->>'email',v_antes->>'email');
  v_actor:=(select auth.uid());
  if v_actor is null and tg_table_name='admin_usuarios_autorizados' and tg_op='INSERT' then
    select autorizado_por into v_actor from admin_guard.admin_correos_autorizados where email=v_despues->>'email';
  end if;
  insert into private.auditoria_administrativa(tabla,operacion,registro_clave,actor_user_id,aal,datos_anteriores,datos_nuevos,eventos)
  values(tg_table_schema||'.'||tg_table_name,tg_op,v_clave,v_actor,coalesce((select auth.jwt()->>'aal'),''),v_antes,v_despues,v_eventos);
  if tg_op='DELETE' then return old; end if; return new;
end $$;
revoke all on function private.auditar_autorizacion_usuario() from public,anon,authenticated;
create trigger auditoria_usuarios after insert or update or delete on admin_guard.admin_usuarios_autorizados
for each row execute function private.auditar_autorizacion_usuario();
create trigger auditoria_correos after insert or update or delete on admin_guard.admin_correos_autorizados
for each row execute function private.auditar_autorizacion_usuario();

create or replace function private.admin_listar_usuarios()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_resultado jsonb;
begin
  if not private.es_admin_mfa() then raise exception 'Se requiere master y AAL2' using errcode='42501'; end if;
  select coalesce(jsonb_agg(x.fila order by x.email),'[]'::jsonb) into v_resultado from (
    select a.email, to_jsonb(a)-'nota' || jsonb_build_object('pendiente',false,'confirmado',u.email_confirmed_at is not null,
      'ultima_modificacion',l.fecha,'ultimo_actor',l.actor_user_id,'ultimos_eventos',l.eventos) as fila
    from admin_guard.admin_usuarios_autorizados a join auth.users u on u.id=a.user_id
    left join lateral (select fecha,actor_user_id,eventos from private.auditoria_administrativa
      where tabla='admin_guard.admin_usuarios_autorizados' and registro_clave=a.user_id::text order by fecha desc,id desc limit 1) l on true
    union all
    select c.email,jsonb_build_object('user_id',null,'email',c.email,'nombre',c.nombre,'rol',c.rol,'activo',c.activo,'modulos',c.modulos,
      'creado_at',c.created_at,'actualizado_at',c.updated_at,'pendiente',true,'confirmado',false,
      'ultima_modificacion',l.fecha,'ultimo_actor',l.actor_user_id,'ultimos_eventos',l.eventos)
    from admin_guard.admin_correos_autorizados c
    left join lateral (select fecha,actor_user_id,eventos from private.auditoria_administrativa
      where tabla='admin_guard.admin_correos_autorizados' and registro_clave=c.email order by fecha desc,id desc limit 1) l on true
    where c.autorizado_por is not null and not exists(select 1 from admin_guard.admin_usuarios_autorizados a where a.email=c.email)
  ) x;
  return v_resultado;
end $$;
create or replace function public.admin_listar_usuarios()
returns jsonb language sql stable security invoker set search_path='' as $$ select private.admin_listar_usuarios(); $$;

-- Autorización inicial siempre editor. La invitación solo la envía el servidor tras esta comprobación.
create or replace function private.admin_autorizar_editor(p_email text,p_nombre text,p_modulos text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_email text:=lower(btrim(p_email)); v_actual admin_guard.admin_correos_autorizados;
begin
  if not private.es_admin_mfa() then raise exception 'Se requiere master y AAL2' using errcode='42501'; end if;
  perform private.validar_asignacion(p_nombre,'editor',p_modulos);
  if v_email is null or char_length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Correo no válido' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('eva-autorizacion:'||v_email,0));
  if exists(select 1 from admin_guard.admin_usuarios_autorizados where email=v_email) then
    raise exception 'La cuenta ya está autorizada; utiliza Editar' using errcode='22023'; end if;
  if exists(select 1 from auth.users where lower(email)=v_email) then
    raise exception 'El correo ya tiene una cuenta Auth; requiere revisión antes de autorizar' using errcode='22023'; end if;
  select * into v_actual from admin_guard.admin_correos_autorizados where email=v_email for update;
  if found then
    if not v_actual.activo or v_actual.autorizado_por is null or v_actual.rol<>'editor'
      or v_actual.nombre is distinct from btrim(p_nombre) or v_actual.modulos is distinct from p_modulos then
      raise exception 'La autorización existente es diferente; revisa sus datos antes de invitar' using errcode='22023'; end if;
  else
    insert into admin_guard.admin_correos_autorizados(email,nombre,rol,activo,modulos,autorizado_por,nota)
    values(v_email,btrim(p_nombre),'editor',true,p_modulos,(select auth.uid()),'Autorización desde cuenta master');
  end if;
  return jsonb_build_object('email',v_email,'rol','editor');
end $$;
create or replace function public.admin_autorizar_editor(p_email text,p_nombre text,p_modulos text[])
returns jsonb language sql security invoker set search_path='' as $$ select private.admin_autorizar_editor(p_email,p_nombre,p_modulos); $$;

create or replace function private.admin_guardar_usuario(p_user_id uuid,p_email text,p_nombre text,p_rol text,p_activo boolean,p_modulos text[],p_actualizado_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_usuario admin_guard.admin_usuarios_autorizados; v_correo admin_guard.admin_correos_autorizados; v_email text;
begin
  if not private.es_admin_mfa() then raise exception 'Se requiere master y AAL2' using errcode='42501'; end if;
  perform private.validar_asignacion(p_nombre,p_rol,p_modulos);
  if p_activo is null or p_actualizado_at is null then raise exception 'Estado y versión obligatorios' using errcode='22023'; end if;
  if p_user_id is not null then
    select * into v_usuario from admin_guard.admin_usuarios_autorizados where user_id=p_user_id for update;
    if not found then raise exception 'Usuario no encontrado' using errcode='22023'; end if;
    if v_usuario.rol='master' or p_user_id=(select auth.uid()) then
      raise exception 'La cuenta master está protegida' using errcode='42501'; end if;
    if v_usuario.actualizado_at is distinct from p_actualizado_at then
      raise exception 'La cuenta cambió en otra operación. Recarga antes de guardar' using errcode='40001'; end if;
    v_email:=v_usuario.email;
    update admin_guard.admin_usuarios_autorizados set nombre=btrim(p_nombre),rol=p_rol,activo=p_activo,modulos=p_modulos where user_id=p_user_id;
  else
    v_email:=lower(btrim(p_email));
    select * into v_correo from admin_guard.admin_correos_autorizados where email=v_email for update;
    if not found or v_correo.autorizado_por is null then raise exception 'Autorización no encontrada' using errcode='22023'; end if;
    if exists(select 1 from admin_guard.admin_usuarios_autorizados where email=v_email) then
      raise exception 'La invitación ya se convirtió en cuenta. Recarga antes de guardar' using errcode='40001'; end if;
    if v_correo.updated_at is distinct from p_actualizado_at then
      raise exception 'La autorización cambió en otra operación. Recarga antes de guardar' using errcode='40001'; end if;
  end if;
  update admin_guard.admin_correos_autorizados set nombre=btrim(p_nombre),rol=p_rol,activo=p_activo,modulos=p_modulos,updated_at=clock_timestamp()
  where email=v_email;
  return jsonb_build_object('guardado',true);
end $$;
create or replace function public.admin_guardar_usuario(p_user_id uuid,p_email text,p_nombre text,p_rol text,p_activo boolean,p_modulos text[],p_actualizado_at timestamptz)
returns jsonb language sql security invoker set search_path='' as $$ select private.admin_guardar_usuario(p_user_id,p_email,p_nombre,p_rol,p_activo,p_modulos,p_actualizado_at); $$;

create or replace function private.vincular_usuario_autorizado()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_correo admin_guard.admin_correos_autorizados;
begin
  select * into v_correo from admin_guard.admin_correos_autorizados where email=lower(btrim(new.email)) and activo for update;
  if not found or v_correo.autorizado_por is null then
    raise exception 'La creación requiere una autorización del master' using errcode='42501'; end if;
  insert into admin_guard.admin_usuarios_autorizados(user_id,email,nombre,rol,activo,modulos,nota)
  values(new.id,lower(btrim(new.email)),v_correo.nombre,v_correo.rol,true,v_correo.modulos,'Cuenta autorizada desde panel master');
  return new;
end $$;
revoke all on function private.vincular_usuario_autorizado() from public,anon,authenticated;
create trigger vincular_usuario_autorizado after insert on auth.users for each row execute function private.vincular_usuario_autorizado();

revoke all on function private.admin_listar_usuarios(),public.admin_listar_usuarios(),
  private.admin_autorizar_editor(text,text,text[]),public.admin_autorizar_editor(text,text,text[]),
  private.admin_guardar_usuario(uuid,text,text,text,boolean,text[],timestamptz),public.admin_guardar_usuario(uuid,text,text,text,boolean,text[],timestamptz)
from public,anon;
grant execute on function private.admin_listar_usuarios(),public.admin_listar_usuarios(),
  private.admin_autorizar_editor(text,text,text[]),public.admin_autorizar_editor(text,text,text[]),
  private.admin_guardar_usuario(uuid,text,text,text,boolean,text[],timestamptz),public.admin_guardar_usuario(uuid,text,text,text,boolean,text[],timestamptz)
to authenticated;

-- No elimina sesiones al cambiar permisos: las consultas de cada petición usan la tabla vigente.
alter policy "repositorio_lectura_authenticated" on public.repositorio_recursos using ((((estado_publicacion = 'publicado'::text) AND (visible = true)) OR private.permite_modulo('repositorio', false)));

alter policy "galeria_admin_update" on public.galeria_items using (( SELECT private.permite_modulo('galeria', true) AS es_admin_mfa)) with check (( SELECT private.permite_modulo('galeria', true) AS es_admin_mfa));

alter policy "galeria_admin_delete" on public.galeria_items using (( SELECT private.permite_modulo('galeria', true) AS es_admin_mfa));

alter policy "galeria_lectura_authenticated" on public.galeria_items using ((((estado_publicacion = 'publicado'::text) AND (visible = true) AND (publicacion_autorizada = true)) OR private.permite_modulo('galeria', false)));

alter policy "galeria_imagenes_lectura_authenticated" on public.galeria_item_imagenes using ((private.permite_modulo('galeria', false) OR (EXISTS ( SELECT 1
   FROM galeria_items g
  WHERE ((g.id = galeria_item_imagenes.galeria_item_id) AND (g.estado_publicacion = 'publicado'::text) AND (g.visible = true) AND (g.publicacion_autorizada = true))))));

alter policy "capacitaciones_admin_insert" on public.capacitaciones_sesiones with check (( SELECT private.permite_modulo('capacitaciones', true) AS es_admin_mfa));

alter policy "capacitaciones_admin_update" on public.capacitaciones_sesiones using (( SELECT private.permite_modulo('capacitaciones', true) AS es_admin_mfa)) with check (( SELECT private.permite_modulo('capacitaciones', true) AS es_admin_mfa));

alter policy "calendario_admin_insert" on public.calendario_actividades with check (( SELECT private.permite_modulo('calendario', true) AS es_admin_mfa));

alter policy "galeria_imagenes_admin_insert" on public.galeria_item_imagenes with check (private.permite_modulo('galeria', true));

alter policy "calendario_admin_update" on public.calendario_actividades using (( SELECT private.permite_modulo('calendario', true) AS es_admin_mfa)) with check (( SELECT private.permite_modulo('calendario', true) AS es_admin_mfa));

alter policy "repositorio_admin_insert" on public.repositorio_recursos with check (( SELECT private.permite_modulo('repositorio', true) AS es_admin_mfa));

alter policy "galeria_imagenes_admin_update" on public.galeria_item_imagenes using (private.permite_modulo('galeria', true)) with check (private.permite_modulo('galeria', true));

alter policy "galeria_imagenes_admin_delete" on public.galeria_item_imagenes using (private.permite_modulo('galeria', true));

alter policy "calendario_lectura_authenticated" on public.calendario_actividades using (((visible = true) OR ( SELECT private.permite_modulo('calendario', false) AS es_admin_mfa)));

alter policy "repositorio_admin_update" on public.repositorio_recursos using (( SELECT private.permite_modulo('repositorio', true) AS es_admin_mfa)) with check (( SELECT private.permite_modulo('repositorio', true) AS es_admin_mfa));

alter policy "repositorio_admin_delete" on public.repositorio_recursos using (( SELECT private.permite_modulo('repositorio', true) AS es_admin_mfa));

alter policy "noticias_destacadas_admin_insert" on public.noticias_destacadas with check (( SELECT private.permite_modulo('noticias', true) AS es_admin_mfa));

alter policy "noticias_destacadas_admin_update" on public.noticias_destacadas using (( SELECT private.permite_modulo('noticias', true) AS es_admin_mfa)) with check (( SELECT private.permite_modulo('noticias', true) AS es_admin_mfa));

alter policy "noticias_destacadas_admin_delete" on public.noticias_destacadas using (( SELECT private.permite_modulo('noticias', true) AS es_admin_mfa));

alter policy "galeria_admin_insert" on public.galeria_items with check (( SELECT private.permite_modulo('galeria', true) AS es_admin_mfa));

alter policy "noticias_destacadas_lectura_authenticated" on public.noticias_destacadas using ((((estado_publicacion = 'publicado'::text) AND (visible = true)) OR private.permite_modulo('noticias', false)));

alter policy eva_compartidos_diarios_admin_lectura on public.eva_compartidos_diarios using ((select private.es_admin_mfa()));

alter policy "eva_publico_admin_mfa_delete" on storage.objects using (bucket_id='eva-publico' and (storage.foldername(name))[1] = any(array['noticias','capacitaciones','repositorio','galeria']) and private.permite_modulo((storage.foldername(name))[1], true));

alter policy "eva_publico_admin_mfa_select" on storage.objects using (bucket_id='eva-publico' and (private.es_admin_mfa() or private.permite_modulo((storage.foldername(name))[1], false)));

alter policy "eva_publico_admin_mfa_insert" on storage.objects with check (bucket_id='eva-publico' and (storage.foldername(name))[1] = any(array['noticias','capacitaciones','repositorio','galeria']) and private.permite_modulo((storage.foldername(name))[1], true));

alter policy "eva_publico_admin_mfa_update" on storage.objects using (bucket_id='eva-publico' and (storage.foldername(name))[1] = any(array['noticias','capacitaciones','repositorio','galeria']) and private.permite_modulo((storage.foldername(name))[1], true)) with check (bucket_id='eva-publico' and (storage.foldername(name))[1] = any(array['noticias','capacitaciones','repositorio','galeria']) and private.permite_modulo((storage.foldername(name))[1], true));

CREATE OR REPLACE FUNCTION public.admin_guardar_actividad_calendario(p_id bigint, p_fecha date, p_contenido_lineas jsonb, p_estado text DEFAULT 'confirmada'::text, p_clase_css text DEFAULT ''::text, p_visible boolean DEFAULT true)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id bigint;
  v_titulo text;
  v_orden smallint;
begin
  if not (select private.permite_modulo('calendario', true)) then
    raise exception 'Acceso administrativo no autorizado';
  end if;

  if p_fecha is null then
    raise exception 'La fecha es obligatoria';
  end if;

  if jsonb_typeof(p_contenido_lineas) <> 'array'
     or jsonb_array_length(p_contenido_lineas) = 0 then
    raise exception 'contenido_lineas debe ser un arreglo no vacío';
  end if;

  v_titulo := btrim(coalesce(p_contenido_lineas->>0, ''));
  if v_titulo = '' then
    raise exception 'La primera línea debe contener el título';
  end if;

  if p_estado not in ('confirmada','planificacion','interna','feriado','cancelada') then
    raise exception 'Estado no válido';
  end if;

  if p_clase_css not in ('','feriado','lunes-colegiado','sin-foto-consentimiento') then
    raise exception 'Clase CSS no válida';
  end if;

  if p_id is not null then
    update public.calendario_actividades
    set fecha = p_fecha,
        titulo = v_titulo,
        contenido_lineas = p_contenido_lineas,
        clase_css = p_clase_css,
        estado = p_estado,
        visible = p_visible,
        origen = case
          when origen = 'calendario_html_2026' then origen
          else 'panel_admin'
        end
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Actividad no encontrada';
    end if;

    return v_id;
  end if;

  select id
  into v_id
  from public.calendario_actividades
  where fecha = p_fecha
    and visible = true
    and estado = 'planificacion'
    and lower(btrim(titulo)) = 'en planificación'
  order by orden, id
  limit 1
  for update;

  if v_id is not null then
    update public.calendario_actividades
    set titulo = v_titulo,
        contenido_lineas = p_contenido_lineas,
        clase_css = p_clase_css,
        estado = p_estado,
        origen = 'panel_admin',
        visible = p_visible
    where id = v_id;

    return v_id;
  end if;

  if exists (
    select 1
    from public.calendario_actividades
    where fecha = p_fecha
      and visible = true
      and lower(btrim(titulo)) = lower(v_titulo)
  ) then
    raise exception 'Ya existe una actividad visible con ese título en la fecha indicada';
  end if;

  select coalesce(max(orden), 0) + 1
  into v_orden
  from public.calendario_actividades
  where fecha = p_fecha;

  insert into public.calendario_actividades
    (fecha, orden, titulo, contenido_lineas, clase_css, estado, origen, visible)
  values
    (p_fecha, v_orden, v_titulo, p_contenido_lineas, p_clase_css, p_estado, 'panel_admin', p_visible)
  returning id into v_id;

  return v_id;
end;
$function$;


insert into private.auditoria_administrativa(tabla,operacion,registro_clave,datos_nuevos,eventos) select 'admin_guard.admin_usuarios_autorizados','UPDATE',user_id::text,to_jsonb(a),array['cuenta_master_establecida','cambio_rol','modificacion_permisos'] from admin_guard.admin_usuarios_autorizados a where rol='master';

notify pgrst, 'reload schema';
