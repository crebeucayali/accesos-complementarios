-- Regresión de cierre: usuarios y sesiones sintéticos, sin contraseñas ni correo.
-- Ejecutar íntegramente. Todos los cambios terminan en ROLLBACK.
BEGIN;
CREATE TEMP TABLE eva_cierre_resultados(caso text PRIMARY KEY, conforme boolean NOT NULL);
GRANT SELECT, INSERT ON eva_cierre_resultados TO authenticated, anon;
CREATE FUNCTION pg_temp.eva_check(p_caso text, p_conforme boolean)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_conforme IS DISTINCT FROM true THEN RAISE EXCEPTION 'Prueba fallida: %',p_caso; END IF;
  INSERT INTO eva_cierre_resultados VALUES(p_caso,true);
END $$;
CREATE FUNCTION pg_temp.eva_claims(p_user uuid,p_session text,p_aal text DEFAULT 'aal2')
RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims',jsonb_build_object('sub',p_user,'role','authenticated','aal',p_aal,
    'session_id',p_session,'user_metadata',jsonb_build_object('rol','master'))::text,true);
$$;
CREATE FUNCTION pg_temp.eva_stats(p_caso text,p_permitido boolean)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE f text; resultado jsonb; rechazo boolean;
BEGIN
  FOR f IN SELECT unnest(ARRAY[
    'estadisticas_visitas_eva()','estadisticas_visitas_eva_periodo(''30d'')',
    'estadisticas_compartidos_eva()','estadisticas_compartidos_eva_periodo(''30d'')'
  ]) LOOP
    rechazo:=false; resultado:=null;
    BEGIN EXECUTE 'SELECT public.'||f INTO resultado;
    EXCEPTION WHEN insufficient_privilege THEN rechazo:=true; END;
    PERFORM pg_temp.eva_check(p_caso||': '||f,
      CASE WHEN p_permitido THEN NOT rechazo AND resultado IS NOT NULL ELSE rechazo END);
  END LOOP;
END $$;

DO $$
DECLARE m uuid; e uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); n uuid:=gen_random_uuid();
  sm uuid:=gen_random_uuid(); se uuid:=gen_random_uuid(); sc uuid:=gen_random_uuid(); sn uuid:=gen_random_uuid();
  counter jsonb;
BEGIN
  SELECT user_id INTO STRICT m FROM admin_guard.admin_usuarios_autorizados WHERE rol='master' AND activo;
  PERFORM set_config('eva.close.master',m::text,true);
  PERFORM set_config('eva.close.editor',e::text,true);
  PERFORM set_config('eva.close.consulta',c::text,true);
  PERFORM set_config('eva.close.no_autorizado',n::text,true);
  PERFORM set_config('eva.close.master_session',sm::text,true);
  PERFORM set_config('eva.close.editor_session',se::text,true);
  PERFORM set_config('eva.close.consulta_session',sc::text,true);
  PERFORM set_config('eva.close.no_autorizado_session',sn::text,true);
  INSERT INTO admin_guard.admin_correos_autorizados(email,nombre,rol,modulos,autorizado_por) VALUES
    ('cierre-editor-'||e||'@example.invalid','Editor transaccional','editor',ARRAY['noticias'],m),
    ('cierre-consulta-'||c||'@example.invalid','Consulta transaccional','consulta',ARRAY['noticias'],m),
    ('cierre-no-autorizado-'||n||'@example.invalid','Sin autorización final','consulta','{}',m);
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
    (e,'cierre-editor-'||e||'@example.invalid',now()),
    (c,'cierre-consulta-'||c||'@example.invalid',now()),
    (n,'cierre-no-autorizado-'||n||'@example.invalid',now());
  DELETE FROM admin_guard.admin_usuarios_autorizados WHERE user_id=n;
  DELETE FROM admin_guard.admin_correos_autorizados WHERE email='cierre-no-autorizado-'||n||'@example.invalid';
  INSERT INTO auth.sessions(id,user_id,aal,created_at,updated_at) VALUES
    (sm,m,'aal2',now(),now()),(se,e,'aal2',now(),now()),(sc,c,'aal2',now(),now()),(sn,n,'aal2',now(),now());
  SELECT jsonb_build_object('total',coalesce(sum(visitas),0)::bigint,'hoy',
    coalesce(sum(visitas) FILTER(WHERE fecha=(now() AT TIME ZONE 'America/Lima')::date),0)::bigint)
    INTO counter FROM public.eva_visitas_diarias WHERE modulo='__eva__';
  PERFORM set_config('eva.close.counter',counter::text,true);
  PERFORM pg_temp.eva_claims(m,sm::text);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE counter jsonb; registro bigint;
BEGIN
  PERFORM pg_temp.eva_check('master AAL2: sesión y perfil válidos',
    private.es_admin_autorizado() AND private.es_admin_mfa() AND public.perfil_panel_admin()->>'rol'='master');
  PERFORM pg_temp.eva_stats('master AAL2',true);
  PERFORM pg_temp.eva_check('master conserva lectura histórica',EXISTS(SELECT 1 FROM public.eva_visitas_diarias));
  SELECT to_jsonb(x) INTO counter FROM public.contador_visitas_eva() x;
  PERFORM pg_temp.eva_check('contador master conserva total/hoy',counter=current_setting('eva.close.counter')::jsonb);
  INSERT INTO public.noticias_destacadas(titulo,descripcion,visible,estado_publicacion)
    VALUES('PRUEBA TRANSACCIONAL CIERRE EVA','Sin publicación persistente',false,'archivado') RETURNING id INTO registro;
  PERFORM set_config('eva.close.registro',registro::text,true);
  PERFORM pg_temp.eva_claims(current_setting('eva.close.master')::uuid,current_setting('eva.close.master_session'),'aal1');
  PERFORM pg_temp.eva_check('AAL1 conserva autorización previa a MFA',
    private.es_admin_autorizado() AND NOT private.es_admin_mfa() AND NOT private.permite_modulo('noticias',false));
  PERFORM pg_temp.eva_stats('master AAL1',false);
  PERFORM pg_temp.eva_claims(current_setting('eva.close.editor')::uuid,current_setting('eva.close.editor_session'));
  PERFORM pg_temp.eva_check('editor solo lee módulo asignado',
    private.es_admin_autorizado() AND private.permite_modulo('noticias',false)
    AND NOT private.permite_modulo('galeria',false) AND NOT private.permite_modulo('noticias',true)
    AND NOT private.permite_modulo('materiales',false) AND NOT private.es_admin_mfa());
  PERFORM pg_temp.eva_stats('editor AAL2',false);
  PERFORM pg_temp.eva_check('editor sin lectura directa del historial',
    NOT EXISTS(SELECT 1 FROM public.eva_visitas_diarias) AND NOT EXISTS(SELECT 1 FROM public.eva_compartidos_diarios));
  SELECT to_jsonb(x) INTO counter FROM public.contador_visitas_eva() x;
  PERFORM pg_temp.eva_check('contador editor conserva total/hoy',counter=current_setting('eva.close.counter')::jsonb);
  PERFORM pg_temp.eva_claims(current_setting('eva.close.consulta')::uuid,current_setting('eva.close.consulta_session'));
  PERFORM pg_temp.eva_stats('consulta AAL2',false);
  PERFORM pg_temp.eva_claims(current_setting('eva.close.no_autorizado')::uuid,current_setting('eva.close.no_autorizado_session'));
  PERFORM pg_temp.eva_check('usuario Auth sin autorización bloqueado',NOT private.es_admin_autorizado());
  PERFORM pg_temp.eva_stats('usuario no autorizado',false);
END $$;
SET LOCAL ROLE anon;
DO $$
DECLARE counter jsonb; bloqueado boolean:=false;
BEGIN
  PERFORM set_config('request.jwt.claims','{}',true);
  PERFORM pg_temp.eva_stats('anon',false);
  BEGIN PERFORM count(*) FROM public.eva_visitas_diarias;
    EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('anon sin SELECT del historial',bloqueado);
  SELECT to_jsonb(x) INTO counter FROM public.contador_visitas_eva() x;
  PERFORM pg_temp.eva_check('contador anon conserva total/hoy',counter=current_setting('eva.close.counter')::jsonb);
  PERFORM pg_temp.eva_check('anon no obtiene USAGE en private',NOT has_schema_privilege('anon','private','USAGE'));
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE e uuid:=current_setting('eva.close.editor')::uuid; s text:=current_setting('eva.close.editor_session');
  valor text; resultado jsonb; version timestamptz; bloqueado boolean;
BEGIN
  FOR valor IN SELECT unnest(ARRAY[null::text,'','no-es-uuid','00000000-0000-0000-0000-000000000000']) LOOP
    PERFORM pg_temp.eva_claims(e,valor);
    PERFORM pg_temp.eva_check('session_id inválido: '||coalesce(valor,'ausente'),
      NOT private.es_admin_autorizado() AND (public.perfil_panel_admin()->>'autorizado')::boolean=false);
  END LOOP;
  PERFORM pg_temp.eva_claims(e,current_setting('eva.close.master_session'));
  PERFORM pg_temp.eva_check('sesión de otro usuario bloqueada',NOT private.es_admin_autorizado());
  PERFORM pg_temp.eva_claims(e,s);
  PERFORM pg_temp.eva_check('mismos claims vuelven a autorizar sesión válida',private.es_admin_autorizado());
  SELECT updated_at INTO version FROM public.noticias_destacadas WHERE id=current_setting('eva.close.registro')::bigint;
  resultado:=public.admin_cambiar_publicacion('noticias',current_setting('eva.close.registro')::bigint,'publicar',version);
  PERFORM pg_temp.eva_check('editor sesión válida publica archivado',resultado->>'estado'='publicado');
  resultado:=public.admin_cambiar_publicacion('noticias',current_setting('eva.close.registro')::bigint,'archivar',(resultado->>'updated_at')::timestamptz);
  PERFORM pg_temp.eva_check('editor sesión válida archiva',resultado->>'estado'='archivado');
  PERFORM set_config('eva.close.version',resultado->>'updated_at',true);
END $$;
RESET ROLE;
-- Solo se alteran sesiones y usuarios de prueba. Nunca la sesión real del master.
UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id=current_setting('eva.close.editor_session')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.eva_check('sesión vencida bloqueada',NOT private.es_admin_autorizado());
RESET ROLE;
UPDATE auth.sessions SET not_after=null,aal='aal1' WHERE id=current_setting('eva.close.editor_session')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.eva_check('JWT AAL2 sobre sesión AAL1 bloqueado',NOT private.es_admin_autorizado());
RESET ROLE;
UPDATE auth.sessions SET aal='aal2',refreshed_at=now() AT TIME ZONE 'UTC',updated_at=now()
WHERE id=current_setting('eva.close.editor_session')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.eva_check('renovación conserva autorización con el mismo session_id',private.es_admin_autorizado());
RESET ROLE;
UPDATE auth.users SET banned_until=now()+interval '1 hour' WHERE id=current_setting('eva.close.editor')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.eva_check('bloqueo Auth inmediato con JWT anterior',NOT private.es_admin_autorizado());
RESET ROLE;
UPDATE auth.users SET banned_until=now()-interval '1 second' WHERE id=current_setting('eva.close.editor')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.eva_check('bloqueo Auth vencido permite sesión vigente',private.es_admin_autorizado());
RESET ROLE;
UPDATE auth.users SET deleted_at=now() WHERE id=current_setting('eva.close.editor')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.eva_check('Auth soft delete bloqueado',NOT private.es_admin_autorizado());
RESET ROLE;
UPDATE auth.users SET deleted_at=null,email_confirmed_at=null WHERE id=current_setting('eva.close.editor')::uuid;
SET LOCAL ROLE authenticated;
SELECT pg_temp.eva_check('correo no confirmado bloqueado',NOT private.es_admin_autorizado());
RESET ROLE;
UPDATE auth.users SET email_confirmed_at=now() WHERE id=current_setting('eva.close.editor')::uuid;
SET LOCAL ROLE authenticated;
DO $$
DECLARE m uuid:=current_setting('eva.close.master')::uuid; e uuid:=current_setting('eva.close.editor')::uuid;
  sm text:=current_setting('eva.close.master_session'); se text:=current_setting('eva.close.editor_session');
  version timestamptz; fila jsonb; bloqueado boolean;
BEGIN
  PERFORM pg_temp.eva_claims(m,sm);
  SELECT value INTO fila FROM jsonb_array_elements(public.admin_listar_usuarios()) WHERE value->>'user_id'=e::text;
  PERFORM pg_temp.eva_check('listado de usuarios con campos completos',
    fila ?& ARRAY['user_id','nombre','email','rol','activo','modulos','actualizado_at']);
  PERFORM public.admin_guardar_usuario(e,null,'Editor transaccional','consulta',true,ARRAY['noticias'],(fila->>'actualizado_at')::timestamptz);
  PERFORM pg_temp.eva_claims(e,se);
  PERFORM pg_temp.eva_check('editor a consulta aplica con JWT anterior',public.perfil_panel_admin()->>'rol'='consulta');
  bloqueado:=false;
  BEGIN PERFORM public.admin_cambiar_publicacion('noticias',current_setting('eva.close.registro')::bigint,'publicar',current_setting('eva.close.version')::timestamptz);
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('consulta no publica',bloqueado);
  PERFORM pg_temp.eva_claims(m,sm);
  SELECT (value->>'actualizado_at')::timestamptz INTO version FROM jsonb_array_elements(public.admin_listar_usuarios()) WHERE value->>'user_id'=e::text;
  PERFORM public.admin_guardar_usuario(e,null,'Editor transaccional','editor',true,ARRAY['noticias'],version);
  PERFORM pg_temp.eva_claims(e,se);
  PERFORM pg_temp.eva_check('consulta a editor aplica con JWT anterior',public.perfil_panel_admin()->>'rol'='editor');
  PERFORM pg_temp.eva_claims(m,sm);
  SELECT (value->>'actualizado_at')::timestamptz INTO version FROM jsonb_array_elements(public.admin_listar_usuarios()) WHERE value->>'user_id'=e::text;
  PERFORM public.admin_guardar_usuario(e,null,'Editor transaccional','editor',true,'{}',version);
  PERFORM pg_temp.eva_claims(e,se);
  PERFORM pg_temp.eva_check('retirar módulo bloquea siguiente operación',NOT private.permite_modulo('noticias',false));
  bloqueado:=false;
  BEGIN PERFORM public.admin_cambiar_publicacion('noticias',current_setting('eva.close.registro')::bigint,'publicar',current_setting('eva.close.version')::timestamptz);
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('publicación rechazada tras retirar módulo',bloqueado);
  PERFORM pg_temp.eva_claims(m,sm);
  SELECT (value->>'actualizado_at')::timestamptz INTO version FROM jsonb_array_elements(public.admin_listar_usuarios()) WHERE value->>'user_id'=e::text;
  PERFORM public.admin_guardar_usuario(e,null,'Editor transaccional','editor',false,ARRAY['noticias'],version);
  PERFORM pg_temp.eva_claims(e,se);
  PERFORM pg_temp.eva_check('desactivación administrativa inmediata',NOT private.es_admin_autorizado());
  PERFORM pg_temp.eva_claims(m,sm);
  SELECT (value->>'actualizado_at')::timestamptz INTO version FROM jsonb_array_elements(public.admin_listar_usuarios()) WHERE value->>'user_id'=e::text;
  PERFORM public.admin_guardar_usuario(e,null,'Editor transaccional','editor',true,ARRAY['noticias'],version);
  PERFORM pg_temp.eva_claims(e,se);
  PERFORM pg_temp.eva_check('reactivación conserva usuario y sesión',private.es_admin_autorizado());
END $$;
RESET ROLE;
DELETE FROM auth.sessions WHERE id=current_setting('eva.close.editor_session')::uuid;
SET LOCAL ROLE authenticated;
DO $$
DECLARE bloqueado boolean; estado jsonb; total integer;
BEGIN
  PERFORM pg_temp.eva_check('revocación inmediata con mismos claims',
    NOT private.es_admin_autorizado() AND NOT private.permite_modulo('noticias',false)
    AND (public.perfil_panel_admin()->>'autorizado')::boolean=false);
  bloqueado:=false;
  BEGIN PERFORM public.admin_cambiar_publicacion('noticias',current_setting('eva.close.registro')::bigint,'publicar',current_setting('eva.close.version')::timestamptz);
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('RPC publicación rechaza sesión revocada',bloqueado);
  SELECT count(*) INTO total FROM public.estado_mfa_admin();
  PERFORM pg_temp.eva_check('MFA no expone factor tras revocación',total=0);
  bloqueado:=false;
  BEGIN PERFORM public.limpiar_mfa_no_verificado_admin();
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('limpieza MFA rechaza sesión revocada',bloqueado);
  PERFORM pg_temp.eva_stats('sesión revocada',false);
  PERFORM pg_temp.eva_claims(current_setting('eva.close.master')::uuid,current_setting('eva.close.master_session'));
  bloqueado:=false;
  BEGIN PERFORM public.admin_autorizar_editor('nadie@example.invalid','Nadie',ARRAY['noticias']);
  EXCEPTION WHEN sqlstate '55000' THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('invitaciones continúan pausadas en servidor',bloqueado);
  bloqueado:=false;
  BEGIN PERFORM public.admin_guardar_usuario(current_setting('eva.close.master')::uuid,null,'Master','editor',false,'{}',now());
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('RPC no permite degradar master',bloqueado);
END $$;
RESET ROLE;
DO $$
DECLARE m uuid:=current_setting('eva.close.master')::uuid; e uuid:=current_setting('eva.close.editor')::uuid;
  evento text; bloqueado boolean;
BEGIN
  FOREACH evento IN ARRAY ARRAY['cambio_rol','cambio_modulos','activacion','desactivacion'] LOOP
    PERFORM pg_temp.eva_check('auditoría usuario: '||evento,EXISTS(
      SELECT 1 FROM private.auditoria_administrativa
      WHERE registro_clave=e::text AND evento=ANY(eventos) AND actor_user_id=m AND actor_rol='master'
        AND modulo='usuarios' AND fecha IS NOT NULL));
  END LOOP;
  PERFORM pg_temp.eva_check('auditoría sin secretos ni session_id',NOT EXISTS(
    SELECT 1 FROM private.auditoria_administrativa WHERE registro_clave IN(e::text,current_setting('eva.close.registro'))
      AND (coalesce(datos_anteriores,'{}'::jsonb)::text||coalesce(datos_nuevos,'{}'::jsonb)::text)
        ~* '"(password|encrypted_password|access_token|refresh_token|session_id|service_role|mfa_code|secret)"\s*:'));
  bloqueado:=false;
  BEGIN UPDATE admin_guard.admin_usuarios_autorizados SET user_id=gen_random_uuid() WHERE user_id=m;
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('UUID master protegido',bloqueado);
  bloqueado:=false;
  BEGIN UPDATE admin_guard.admin_usuarios_autorizados SET rol='editor' WHERE user_id=m;
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('degradación master protegida',bloqueado);
  bloqueado:=false;
  BEGIN UPDATE admin_guard.admin_usuarios_autorizados SET activo=false WHERE user_id=m;
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('desactivación master protegida',bloqueado);
  bloqueado:=false;
  BEGIN DELETE FROM auth.users WHERE id=m;
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('eliminación Auth master protegida',bloqueado);
  bloqueado:=false;
  BEGIN UPDATE admin_guard.admin_usuarios_autorizados SET rol='master' WHERE user_id=e;
  EXCEPTION WHEN unique_violation THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('segundo master rechazado por índice',bloqueado);
  PERFORM pg_temp.eva_check('único master activo conserva UUID',(
    SELECT count(*)=1 AND bool_and(user_id=m AND activo) FROM admin_guard.admin_usuarios_autorizados WHERE rol='master'));
END $$;
DELETE FROM auth.sessions WHERE id=current_setting('eva.close.master_session')::uuid;
SET LOCAL ROLE authenticated;
DO $$
DECLARE bloqueado boolean:=false;
BEGIN
  PERFORM pg_temp.eva_check('master sesión revocada deja de autorizar',NOT private.es_admin_mfa() AND NOT private.es_admin_autorizado());
  PERFORM pg_temp.eva_stats('master sesión revocada',false);
  BEGIN PERFORM public.admin_listar_usuarios();
  EXCEPTION WHEN insufficient_privilege THEN bloqueado:=true; END;
  PERFORM pg_temp.eva_check('master revocado no administra usuarios',bloqueado);
END $$;
RESET ROLE;
SELECT count(*) AS pruebas_conformes,jsonb_agg(caso ORDER BY caso) AS resultados FROM eva_cierre_resultados;
ROLLBACK;
