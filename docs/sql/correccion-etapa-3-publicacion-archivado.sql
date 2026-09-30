-- Corrección autorizada: editores solo publican/archivan mediante una RPC acotada.
-- No crea cuentas ni cambia al master o sus factores MFA.
alter table public.capacitaciones_sesiones add column visible boolean not null default true;
comment on column public.capacitaciones_sesiones.visible is 'Publicado cuando true; archivado cuando false. No altera la disponibilidad de materiales.';

-- Usa los estados existentes; no añade otro campo de estado a estos módulos.
alter table public.noticias_destacadas add constraint noticias_publicacion_visible_consistente check (visible = (estado_publicacion='publicado'));
alter table public.repositorio_recursos add constraint repositorio_publicacion_visible_consistente check (visible = (estado_publicacion='publicado'));
alter table public.galeria_items add constraint galeria_publicacion_visible_consistente check (visible = (estado_publicacion='publicado'));

-- Las escrituras genéricas, incluidos Storage y las imágenes de galería, son master.
create or replace function private.permite_modulo(p_modulo text,p_escritura boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
  select p_modulo=any(array['capacitaciones','calendario','repositorio','noticias','galeria'])
    and private.es_admin_autorizado() and coalesce((select auth.jwt()->>'aal'),'')='aal2'
    and exists(select 1 from admin_guard.admin_usuarios_autorizados a where a.user_id=(select auth.uid())
      and (a.rol='master' or (not p_escritura and a.rol in ('editor','consulta') and p_modulo=any(a.modulos))));
$$;

create or replace function private.estado_publicacion_registro(p_tabla text,p_fila jsonb)
returns text language sql immutable set search_path='' as $$
  select case when p_fila is null then null
    when p_tabla in ('capacitaciones_sesiones','calendario_actividades') then
      case when coalesce((p_fila->>'visible')::boolean,true) then 'publicado' else 'archivado' end
    else coalesce(p_fila->>'estado_publicacion',case when (p_fila->>'visible')::boolean then 'publicado' else 'archivado' end) end;
$$;
revoke all on function private.estado_publicacion_registro(text,jsonb) from public,anon,authenticated;

-- Amplía la misma auditoría; los registros históricos no reciben un rol supuesto.
alter table private.auditoria_administrativa add column actor_rol text, add column modulo text;
create or replace function private.contexto_auditoria_administrativa()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.actor_rol is null and new.actor_user_id is not null then
    select rol into new.actor_rol from admin_guard.admin_usuarios_autorizados where user_id=new.actor_user_id;
  end if;
  new.modulo:=coalesce(new.modulo,case new.tabla
    when 'public.capacitaciones_sesiones' then 'capacitaciones'
    when 'public.calendario_actividades' then 'calendario'
    when 'public.repositorio_recursos' then 'repositorio'
    when 'public.noticias_destacadas' then 'noticias'
    when 'public.galeria_items' then 'galeria'
    when 'public.galeria_item_imagenes' then 'galeria'
    when 'admin_guard.admin_usuarios_autorizados' then 'usuarios'
    when 'admin_guard.admin_correos_autorizados' then 'usuarios' end);
  return new;
end $$;
revoke all on function private.contexto_auditoria_administrativa() from public,anon,authenticated;
create trigger contexto_auditoria_administrativa before insert on private.auditoria_administrativa
for each row execute function private.contexto_auditoria_administrativa();

create or replace function private.registrar_auditoria_admin()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_antes jsonb; v_despues jsonb; v_clave text; v_estado_antes text; v_estado_despues text; v_eventos text[]:='{}';
begin
  if tg_op in ('UPDATE','DELETE') then v_antes:=to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_despues:=to_jsonb(new); end if;
  if tg_table_name='capacitaciones_sesiones' then
    v_clave:=coalesce(v_despues->>'jornada',v_antes->>'jornada')||':'||coalesce(v_despues->>'numero_sesion',v_antes->>'numero_sesion');
  else v_clave:=coalesce(v_despues->>'id',v_antes->>'id',''); end if;
  if tg_op='DELETE' then v_eventos:=array['eliminado_definitivamente'];
  elsif tg_table_name<>'galeria_item_imagenes' then
    v_estado_antes:=private.estado_publicacion_registro(tg_table_name,v_antes);
    v_estado_despues:=private.estado_publicacion_registro(tg_table_name,v_despues);
    if v_estado_despues='archivado' and v_estado_antes is distinct from 'archivado' then v_eventos:=array['archivado'];
    elsif v_estado_despues='publicado' and v_estado_antes='archivado' then v_eventos:=array['restaurado'];
    elsif v_estado_despues='publicado' and v_estado_antes is distinct from 'publicado' then v_eventos:=array['publicado'];
    else v_eventos:=array[case when tg_op='INSERT' then 'contenido_creado' else 'contenido_actualizado' end]; end if;
  else v_eventos:=array['imagenes_actualizadas']; end if;
  insert into private.auditoria_administrativa(tabla,operacion,registro_clave,actor_user_id,aal,datos_anteriores,datos_nuevos,eventos)
  values(tg_table_schema||'.'||tg_table_name,tg_op,v_clave,(select auth.uid()),coalesce((select auth.jwt()->>'aal'),''),v_antes,v_despues,v_eventos);
  if tg_op='DELETE' then return old; end if; return new;
end $$;

-- Lista blanca de tablas y operaciones. El editor no proporciona campos a actualizar.
create or replace function private.cambiar_publicacion_contenido(p_modulo text,p_id bigint,p_accion text,p_actualizado_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_tabla text; v_fila jsonb; v_resultado jsonb; v_rol text; v_estado text; v_visible boolean; v_version timestamptz;
begin
  if not private.permite_modulo(p_modulo,false) then raise exception 'Módulo no autorizado o falta AAL2' using errcode='42501'; end if;
  select rol into v_rol from admin_guard.admin_usuarios_autorizados where user_id=(select auth.uid()) and activo;
  if v_rol not in ('master','editor') then raise exception 'Esta cuenta no puede publicar ni archivar' using errcode='42501'; end if;
  if p_accion is null or p_accion not in ('publicar','archivar','restaurar') or p_id is null or p_actualizado_at is null then
    raise exception 'Operación, registro y versión obligatorios' using errcode='22023'; end if;
  if p_accion='restaurar' and v_rol<>'master' then raise exception 'La acción Restaurar está reservada al master; el editor dispone de Publicar' using errcode='42501'; end if;
  v_tabla:=case p_modulo when 'capacitaciones' then 'capacitaciones_sesiones' when 'calendario' then 'calendario_actividades'
    when 'repositorio' then 'repositorio_recursos' when 'noticias' then 'noticias_destacadas' when 'galeria' then 'galeria_items' end;
  if v_tabla is null then raise exception 'Módulo no permitido' using errcode='22023'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',v_tabla) into v_fila using p_id;
  if v_fila is null then raise exception 'Contenido no encontrado' using errcode='22023'; end if;
  v_version:=(v_fila->>'updated_at')::timestamptz;
  if v_version is distinct from p_actualizado_at then raise exception 'El contenido cambió. Actualiza el listado antes de operar' using errcode='40001'; end if;
  v_estado:=private.estado_publicacion_registro(v_tabla,v_fila);
  if v_rol='editor' and v_estado not in ('publicado','archivado') then
    raise exception 'El contenido continúa en preparación del master' using errcode='42501'; end if;
  if p_accion='restaurar' and v_estado<>'archivado' then raise exception 'Solo se restaura contenido archivado' using errcode='22023'; end if;
  v_visible:=p_accion<>'archivar';
  if p_modulo='galeria' and v_visible and not (v_fila->>'publicacion_autorizada')::boolean then
    raise exception 'La publicación de Galería requiere autorización preparada por el master' using errcode='42501'; end if;
  if (v_visible and v_estado='publicado') or (not v_visible and v_estado='archivado') then
    return jsonb_build_object('id',p_id,'modulo',p_modulo,'estado',v_estado,'sin_cambios',true,'updated_at',v_version);
  end if;
  if p_modulo in ('capacitaciones','calendario') then
    execute format('update public.%I t set visible=$1 where id=$2 returning to_jsonb(t)',v_tabla) into v_resultado using v_visible,p_id;
  else
    execute format('update public.%I t set visible=$1,estado_publicacion=$2 where id=$3 returning to_jsonb(t)',v_tabla)
      into v_resultado using v_visible,case when v_visible then 'publicado' else 'archivado' end,p_id;
  end if;
  return jsonb_build_object('id',p_id,'modulo',p_modulo,'estado',case when v_visible then 'publicado' else 'archivado' end,
    'evento',case when v_visible and v_estado='archivado' then 'restaurado' when v_visible then 'publicado' else 'archivado' end,
    'updated_at',v_resultado->'updated_at');
end $$;
create or replace function public.admin_cambiar_publicacion(p_modulo text,p_id bigint,p_accion text,p_actualizado_at timestamptz)
returns jsonb language sql security invoker set search_path='' as $$ select private.cambiar_publicacion_contenido(p_modulo,p_id,p_accion,p_actualizado_at); $$;
revoke all on function private.cambiar_publicacion_contenido(text,bigint,text,timestamptz),public.admin_cambiar_publicacion(text,bigint,text,timestamptz) from public,anon;
grant execute on function private.cambiar_publicacion_contenido(text,bigint,text,timestamptz),public.admin_cambiar_publicacion(text,bigint,text,timestamptz) to authenticated;

-- Capacitaciones: permite al panel leer archivados; la lectura anónima filtra visible.
alter policy capacitaciones_lectura_publica on public.capacitaciones_sesiones to anon using (visible);
create policy capacitaciones_lectura_authenticated on public.capacitaciones_sesiones for select to authenticated
using (visible or (select private.permite_modulo('capacitaciones',false)));

-- La vista del calendario excluye también capacitaciones archivadas aunque la consulte un master.
-- Se conserva security_invoker y su firma pública.
alter policy "galeria_admin_insert" on public.galeria_items with check ((select private.es_admin_mfa()));

alter policy "capacitaciones_admin_insert" on public.capacitaciones_sesiones with check ((select private.es_admin_mfa()));

alter policy "calendario_admin_insert" on public.calendario_actividades with check ((select private.es_admin_mfa()));

alter policy "calendario_admin_update" on public.calendario_actividades using ((select private.es_admin_mfa())) with check ((select private.es_admin_mfa()));

alter policy "repositorio_admin_update" on public.repositorio_recursos using ((select private.es_admin_mfa())) with check ((select private.es_admin_mfa()));

alter policy "galeria_admin_update" on public.galeria_items using ((select private.es_admin_mfa())) with check ((select private.es_admin_mfa()));

alter policy "galeria_admin_delete" on public.galeria_items using ((select private.es_admin_mfa()));

alter policy "capacitaciones_admin_update" on public.capacitaciones_sesiones using ((select private.es_admin_mfa())) with check ((select private.es_admin_mfa()));

alter policy "galeria_imagenes_admin_insert" on public.galeria_item_imagenes with check ((select private.es_admin_mfa()));

alter policy "repositorio_admin_insert" on public.repositorio_recursos with check ((select private.es_admin_mfa()));

alter policy "galeria_imagenes_admin_update" on public.galeria_item_imagenes using ((select private.es_admin_mfa())) with check ((select private.es_admin_mfa()));

alter policy "galeria_imagenes_admin_delete" on public.galeria_item_imagenes using ((select private.es_admin_mfa()));

alter policy "repositorio_admin_delete" on public.repositorio_recursos using ((select private.es_admin_mfa()));

alter policy "noticias_destacadas_admin_insert" on public.noticias_destacadas with check ((select private.es_admin_mfa()));

alter policy "noticias_destacadas_admin_update" on public.noticias_destacadas using ((select private.es_admin_mfa())) with check ((select private.es_admin_mfa()));

alter policy "noticias_destacadas_admin_delete" on public.noticias_destacadas using ((select private.es_admin_mfa()));

alter policy "eva_publico_admin_mfa_delete" on storage.objects using (bucket_id='eva-publico' and (storage.foldername(name))[1]=any(array['noticias','capacitaciones','repositorio','galeria']) and (select private.es_admin_mfa()));

alter policy "eva_publico_admin_mfa_insert" on storage.objects with check (bucket_id='eva-publico' and (storage.foldername(name))[1]=any(array['noticias','capacitaciones','repositorio','galeria']) and (select private.es_admin_mfa()));

alter policy "eva_publico_admin_mfa_update" on storage.objects using (bucket_id='eva-publico' and (storage.foldername(name))[1]=any(array['noticias','capacitaciones','repositorio','galeria']) and (select private.es_admin_mfa())) with check (bucket_id='eva-publico' and (storage.foldername(name))[1]=any(array['noticias','capacitaciones','repositorio','galeria']) and (select private.es_admin_mfa()));

alter policy "repositorio_lectura_authenticated" on public.repositorio_recursos using ((((estado_publicacion = 'publicado'::text) AND (visible = true)) OR (private.es_admin_mfa() or (private.permite_modulo('repositorio',false) and estado_publicacion in ('publicado','archivado')))));

alter policy "galeria_lectura_authenticated" on public.galeria_items using ((((estado_publicacion = 'publicado'::text) AND (visible = true) AND (publicacion_autorizada = true)) OR (private.es_admin_mfa() or (private.permite_modulo('galeria',false) and estado_publicacion in ('publicado','archivado')))));

alter policy "galeria_imagenes_lectura_authenticated" on public.galeria_item_imagenes using (((private.es_admin_mfa() or (private.permite_modulo('galeria',false) and exists(select 1 from public.galeria_items g where g.id=galeria_item_imagenes.galeria_item_id and g.estado_publicacion in ('publicado','archivado')))) OR (EXISTS ( SELECT 1
   FROM galeria_items g
  WHERE ((g.id = galeria_item_imagenes.galeria_item_id) AND (g.estado_publicacion = 'publicado'::text) AND (g.visible = true) AND (g.publicacion_autorizada = true))))));

alter policy "noticias_destacadas_lectura_authenticated" on public.noticias_destacadas using ((((estado_publicacion = 'publicado'::text) AND (visible = true)) OR (private.es_admin_mfa() or (private.permite_modulo('noticias',false) and estado_publicacion in ('publicado','archivado')))));

create or replace view public.calendario_publico with (security_invoker=true) as SELECT ('actividad-'::text || (a.id)::text) AS registro_id,
    a.fecha,
    'calendario'::text AS fuente,
    (a.orden)::integer AS orden,
    a.estado,
    a.clase_css,
    a.contenido_lineas,
    NULL::smallint AS jornada,
    NULL::smallint AS numero_sesion,
    a.updated_at
   FROM calendario_actividades a
  WHERE (a.visible = true)
UNION ALL
 SELECT ('capacitacion-'::text || (c.id)::text) AS registro_id,
    c.fecha,
    'capacitaciones'::text AS fuente,
    ((900 + ((c.jornada)::integer * 50)) + (c.numero_sesion)::integer) AS orden,
    c.estado,
    ''::text AS clase_css,
    to_jsonb(array_remove(ARRAY['Capacitación virtual'::text,
        CASE
            WHEN (c.jornada = 1) THEN ('Primera jornada · Sesión '::text || (c.numero_sesion)::text)
            ELSE ('Segunda jornada · Sesión '::text || (c.numero_sesion)::text)
        END, c.titulo,
        CASE
            WHEN ((btrim(c.tema) = ''::text) OR (c.tema ~~* 'Los materiales de esta sesión%'::text)) THEN NULL::text
            ELSE regexp_replace(c.tema, '^Tema:[[:space:]]*'::text, ''::text, 'i'::text)
        END], NULL::text)) AS contenido_lineas,
    c.jornada,
    c.numero_sesion,
    c.updated_at
   FROM capacitaciones_sesiones c where c.visible=true;

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
  if not (select private.es_admin_mfa()) then
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

CREATE OR REPLACE FUNCTION private.admin_autorizar_editor(p_email text, p_nombre text, p_modulos text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_email text:=lower(btrim(p_email)); v_actual admin_guard.admin_correos_autorizados;
begin
  if not private.es_admin_mfa() then raise exception 'Se requiere master y AAL2' using errcode='42501'; end if;
  raise exception 'Invitaciones pausadas: falta completar el filtro público de Capacitaciones dentro del alcance autorizado' using errcode='55000';
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
end $function$;

notify pgrst, 'reload schema';
