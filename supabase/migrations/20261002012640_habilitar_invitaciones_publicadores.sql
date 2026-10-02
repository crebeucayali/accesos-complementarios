-- Habilita autorizaciones de invitación solo para master AAL2, sin cambiar el rol interno editor.
-- Conserva roles, RLS, sesiones, Storage y la lógica de publicación; corrige mensajes visibles.
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION private.admin_autorizar_editor(p_email text, p_nombre text, p_modulos text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_email text:=lower(btrim(p_email)); v_actual admin_guard.admin_correos_autorizados;
begin
  if not private.es_admin_mfa() then raise exception 'Se requiere master y AAL2' using errcode='42501'; end if;
  perform private.validar_asignacion(p_nombre,'editor',p_modulos);
  if cardinality(p_modulos) not between 1 and 5
     or cardinality(p_modulos) <> (select count(distinct modulo) from unnest(p_modulos) modulo) then
    raise exception 'Selecciona al menos un módulo permitido, sin duplicados' using errcode='22023';
  end if;
  if v_email is null or char_length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
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
end $function$
;
CREATE OR REPLACE FUNCTION private.cambiar_publicacion_contenido(p_modulo text, p_id bigint, p_accion text, p_actualizado_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_tabla text; v_fila jsonb; v_resultado jsonb; v_rol text; v_estado text; v_visible boolean; v_version timestamptz;
begin
  if not private.permite_modulo(p_modulo,false) then raise exception 'Módulo no autorizado o sesión no válida' using errcode='42501'; end if;
  select rol into v_rol from admin_guard.admin_usuarios_autorizados where user_id=(select auth.uid()) and activo;
  if v_rol not in ('master','editor') then raise exception 'Esta cuenta no puede publicar ni archivar' using errcode='42501'; end if;
  if p_accion is null or p_accion not in ('publicar','archivar','restaurar') or p_id is null or p_actualizado_at is null then
    raise exception 'Operación, registro y versión obligatorios' using errcode='22023'; end if;
  if p_accion='restaurar' and v_rol<>'master' then raise exception 'La acción Restaurar está reservada al master; el publicador dispone de Publicar' using errcode='42501'; end if;
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
end $function$
;
