-- Protocolo transaccional: una cuenta sintética sin contraseña/correo real, cinco registros y sesiones sintéticas.
-- No envía correo ni modifica archivos físicos. Ejecutar íntegramente: termina en ROLLBACK.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TEMP TABLE eva_publicador_resultados(caso text,conforme boolean);
CREATE TEMP TABLE eva_publicador_contenido(modulo text,tabla text,id bigint);
GRANT ALL ON eva_publicador_resultados,eva_publicador_contenido TO authenticated;
CREATE FUNCTION pg_temp.check_publicador(caso text,conforme boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF conforme IS DISTINCT FROM true THEN RAISE EXCEPTION 'Prueba fallida: %',caso;END IF;
INSERT INTO eva_publicador_resultados VALUES(caso,true);END $$;
CREATE FUNCTION pg_temp.claims_publicador(usuario uuid,sesion uuid,aal text) RETURNS void LANGUAGE sql AS $$
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'session_id',sesion,'role','authenticated','aal',aal)::text,true);$$;
DO $$ DECLARE m uuid; sm uuid:=gen_random_uuid();e uuid:=gen_random_uuid();se uuid:=gen_random_uuid();email text:='publicador-'||e||'@example.invalid'; BEGIN
 SELECT user_id INTO STRICT m FROM admin_guard.admin_usuarios_autorizados WHERE rol='master' AND activo;
 PERFORM pg_temp.check_publicador('un master activo', (SELECT count(*)=1 FROM admin_guard.admin_usuarios_autorizados WHERE rol='master' AND activo));
 PERFORM pg_temp.check_publicador('master conserva UUID',m='f356e335-8ba9-486a-b27c-3a24e7ca5257'::uuid);
 PERFORM pg_temp.check_publicador('master conserva TOTP verificado',EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=m AND status='verified' AND factor_type='totp'));
 INSERT INTO auth.sessions(id,user_id,aal,created_at,updated_at) VALUES(sm,m,'aal2',now(),now());
 PERFORM set_config('eva.test.master',m::text,true);PERFORM set_config('eva.test.ms',sm::text,true);
 PERFORM set_config('eva.test.publisher',e::text,true);PERFORM set_config('eva.test.ps',se::text,true);PERFORM set_config('eva.test.email',email,true);
 PERFORM pg_temp.claims_publicador(m,sm,'aal2');
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE email text:=current_setting('eva.test.email');resultado jsonb;bad boolean; BEGIN
 resultado:=public.admin_autorizar_editor('  '||upper(email)||'  ','Publicador sintético',ARRAY['galeria','noticias']);
 PERFORM pg_temp.check_publicador('master AAL2 autoriza editor, normaliza correo y módulos',resultado->>'email'=email AND resultado->>'rol'='editor');
 PERFORM public.admin_autorizar_editor(email,'Publicador sintético',ARRAY['galeria','noticias']);
 FOREACH resultado IN ARRAY ARRAY[jsonb_build_object('correo','correo invalido','modulos',ARRAY['galeria']),jsonb_build_object('correo',email,'modulos',ARRAY[]::text[]),jsonb_build_object('correo',email,'modulos',ARRAY['materiales']),jsonb_build_object('correo',email,'modulos',ARRAY['galeria','galeria'])] LOOP
  bad:=false;BEGIN PERFORM public.admin_autorizar_editor(resultado->>'correo','Publicador sintético',ARRAY(SELECT jsonb_array_elements_text(resultado->'modulos')));EXCEPTION WHEN SQLSTATE '22023' THEN bad:=true;END;
  PERFORM pg_temp.check_publicador('rechaza invitación inválida '||resultado::text,bad);
 END LOOP;
END $$;
RESET ROLE;
SELECT pg_temp.check_publicador('autorización repetida no duplica',(SELECT count(*)=1 FROM admin_guard.admin_correos_autorizados WHERE email=current_setting('eva.test.email')));
DO $$ DECLARE i bigint;j jsonb;t text;mod text;cols text;n int; BEGIN
 FOREACH mod IN ARRAY ARRAY['capacitaciones','calendario','repositorio','noticias','galeria'] LOOP
  t:=CASE mod WHEN 'capacitaciones' THEN 'capacitaciones_sesiones' WHEN 'calendario' THEN 'calendario_actividades' WHEN 'repositorio' THEN 'repositorio_recursos' WHEN 'noticias' THEN 'noticias_destacadas' ELSE 'galeria_items' END;
  EXECUTE format('select to_jsonb(x) from public.%I x where visible %s limit 1',t,CASE WHEN mod='capacitaciones' THEN 'and estado=''disponible''' ELSE '' END) INTO j;
  IF j IS NULL THEN RAISE EXCEPTION 'Falta un registro de referencia en %',t;END IF;
  j:=j||jsonb_build_object('titulo','PRUEBA TRANSACCIONAL PUBLICADOR','visible',true);
  IF mod='capacitaciones' THEN SELECT x INTO n FROM generate_series(1,50) x WHERE NOT EXISTS(SELECT 1 FROM public.capacitaciones_sesiones WHERE jornada=2 AND numero_sesion=x) ORDER BY x DESC LIMIT 1;j:=j||jsonb_build_object('jornada',2,'numero_sesion',n);
  ELSIF mod='calendario' THEN j:=j||jsonb_build_object('fecha','2099-01-01','orden',999,'contenido_lineas',jsonb_build_array('PRUEBA TRANSACCIONAL PUBLICADOR'));
  ELSE j:=j||jsonb_build_object('estado_publicacion','publicado');END IF;
  SELECT string_agg(quote_ident(attname),',' ORDER BY attnum) INTO cols FROM pg_attribute WHERE attrelid=('public.'||t)::regclass AND attnum>0 AND NOT attisdropped AND attgenerated='' AND attname<>'id';
  EXECUTE format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) returning id',t,cols,cols,t) INTO i USING j;
  INSERT INTO eva_publicador_contenido VALUES(mod,t,i);
 END LOOP;
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(current_setting('eva.test.publisher')::uuid,current_setting('eva.test.email'),now());
 INSERT INTO auth.sessions(id,user_id,aal,created_at,updated_at) VALUES(current_setting('eva.test.ps')::uuid,current_setting('eva.test.publisher')::uuid,'aal1',now(),now());
 PERFORM pg_temp.check_publicador('Auth vincula autorización sin promover rol',(SELECT rol='editor' AND modulos=ARRAY['galeria','noticias'] FROM admin_guard.admin_usuarios_autorizados WHERE user_id=current_setting('eva.test.publisher')::uuid));
 PERFORM pg_temp.claims_publicador(current_setting('eva.test.publisher')::uuid,current_setting('eva.test.ps')::uuid,'aal1');
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE fila record;v timestamptz;r jsonb;before jsonb;after jsonb;n int;ok boolean; BEGIN
 PERFORM pg_temp.check_publicador('publicador accede con AAL1',(public.perfil_panel_admin()->>'autorizado')::boolean AND public.perfil_panel_admin()->>'rol'='editor');
 PERFORM pg_temp.check_publicador('publicador no es master MFA',NOT private.es_admin_mfa());
 BEGIN PERFORM public.admin_listar_usuarios();EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('publicador sin Usuarios',ok);ok:=false;
 BEGIN PERFORM public.estadisticas_visitas_eva();EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('publicador sin Estadísticas visitas',ok);ok:=false;
 BEGIN PERFORM public.estadisticas_compartidos_eva();EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('publicador sin Estadísticas compartidos',ok);ok:=false;
 BEGIN PERFORM public.admin_autorizar_editor('sin-envio@example.invalid','No autorizado',ARRAY['galeria']);EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('publicador no invita',ok);
 FOR fila IN SELECT * FROM eva_publicador_contenido LOOP
  PERFORM pg_temp.check_publicador('permiso estructural bloqueado '||fila.modulo,NOT private.permite_modulo(fila.modulo,true));
  EXECUTE format('select updated_at,to_jsonb(x) from public.%I x where id=$1',fila.tabla) INTO v,before USING fila.id;
  BEGIN EXECUTE format('update public.%I set titulo=''No debe guardarse'' where id=$1',fila.tabla) USING fila.id;GET DIAGNOSTICS n=ROW_COUNT;EXCEPTION WHEN insufficient_privilege THEN n:=0;END;
  PERFORM pg_temp.check_publicador('UPDATE directo bloqueado '||fila.modulo,n=0);
  BEGIN EXECUTE format('delete from public.%I where id=$1',fila.tabla) USING fila.id;GET DIAGNOSTICS n=ROW_COUNT;EXCEPTION WHEN insufficient_privilege THEN n:=0;END;
  PERFORM pg_temp.check_publicador('DELETE directo bloqueado '||fila.modulo,n=0);
  ok:=false;BEGIN EXECUTE format('insert into public.%I overriding system value select * from public.%I where id=$1',fila.tabla,fila.tabla) USING fila.id;EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;
  PERFORM pg_temp.check_publicador('INSERT directo bloqueado '||fila.modulo,ok);
  IF fila.modulo IN ('galeria','noticias') THEN
   r:=public.admin_cambiar_publicacion(fila.modulo,fila.id,'archivar',v);PERFORM pg_temp.check_publicador('AAL1 archiva '||fila.modulo,r->>'estado'='archivado');
   EXECUTE format('select updated_at,to_jsonb(x) from public.%I x where id=$1',fila.tabla) INTO v,after USING fila.id;
   PERFORM pg_temp.check_publicador('archivado conserva estructura '||fila.modulo,before-ARRAY['updated_at','visible','estado_publicacion']=after-ARRAY['updated_at','visible','estado_publicacion']);
   ok:=false;BEGIN PERFORM public.admin_cambiar_publicacion(fila.modulo,fila.id,'restaurar',v);EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;
   PERFORM pg_temp.check_publicador('Restaurar reservado master '||fila.modulo,ok);
   r:=public.admin_cambiar_publicacion(fila.modulo,fila.id,'publicar',v);PERFORM pg_temp.check_publicador('AAL1 publica archivado '||fila.modulo,r->>'estado'='publicado');
  ELSE
   ok:=false;BEGIN PERFORM public.admin_cambiar_publicacion(fila.modulo,fila.id,'archivar',v);EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;
   PERFORM pg_temp.check_publicador('RPC rechaza módulo no asignado '||fila.modulo,ok);
  END IF;
 END LOOP;
 ok:=false;BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('eva-publico','galeria/_sin_envio.webp');EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('Storage INSERT bloqueado',ok);
 UPDATE storage.objects SET metadata=metadata WHERE bucket_id='eva-publico';GET DIAGNOSTICS n=ROW_COUNT;PERFORM pg_temp.check_publicador('Storage UPDATE bloqueado',n=0);
 BEGIN DELETE FROM storage.objects WHERE bucket_id='eva-publico';GET DIAGNOSTICS n=ROW_COUNT;EXCEPTION WHEN insufficient_privilege THEN n:=0;END;PERFORM pg_temp.check_publicador('Storage DELETE bloqueado',n=0);
END $$;
RESET ROLE;
DO $$ BEGIN
 PERFORM pg_temp.claims_publicador(current_setting('eva.test.master')::uuid,current_setting('eva.test.ms')::uuid,'aal2');
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE p uuid:=current_setting('eva.test.publisher')::uuid;v timestamptz;f record;ok boolean; BEGIN
 SELECT (x->>'actualizado_at')::timestamptz INTO v FROM jsonb_array_elements(public.admin_listar_usuarios()) x WHERE x->>'user_id'=p::text;
 PERFORM public.admin_guardar_usuario(p,null,'Publicador sintético','editor',true,ARRAY['capacitaciones','calendario','repositorio','noticias','galeria'],v);
 PERFORM pg_temp.claims_publicador(p,current_setting('eva.test.ps')::uuid,'aal1');
 FOR f IN SELECT * FROM eva_publicador_contenido LOOP
  PERFORM pg_temp.check_publicador('asignación múltiple permite módulo '||f.modulo,private.permite_modulo(f.modulo,false));
  EXECUTE format('select updated_at from public.%I where id=$1',f.tabla) INTO v USING f.id;
  PERFORM public.admin_cambiar_publicacion(f.modulo,f.id,'archivar',v);
  EXECUTE format('select updated_at from public.%I where id=$1',f.tabla) INTO v USING f.id;
  PERFORM public.admin_cambiar_publicacion(f.modulo,f.id,'publicar',v);
  PERFORM pg_temp.check_publicador('AAL1 publicar y archivar '||f.modulo,true);
 END LOOP;
 PERFORM pg_temp.claims_publicador(current_setting('eva.test.master')::uuid,current_setting('eva.test.ms')::uuid,'aal2');
 SELECT (x->>'actualizado_at')::timestamptz INTO v FROM jsonb_array_elements(public.admin_listar_usuarios()) x WHERE x->>'user_id'=p::text;
 ok:=false;BEGIN PERFORM public.admin_guardar_usuario(p,null,'Publicador sintético','master',true,ARRAY['galeria'],v);EXCEPTION WHEN SQLSTATE '22023' THEN ok:=true;END;
 PERFORM pg_temp.check_publicador('RPC no promueve publicador a master',ok);
 ok:=false;BEGIN PERFORM public.admin_autorizar_editor(current_setting('eva.test.email'),'Publicador sintético',ARRAY['galeria','noticias']);EXCEPTION WHEN SQLSTATE '22023' THEN ok:=true;END;
 PERFORM pg_temp.check_publicador('cuenta Auth existente no se invita otra vez',ok);
 PERFORM public.admin_guardar_usuario(p,null,'Publicador sintético','editor',true,ARRAY['galeria'],v);
 PERFORM pg_temp.claims_publicador(p,current_setting('eva.test.ps')::uuid,'aal1');
 PERFORM pg_temp.check_publicador('retiro de módulo afecta JWT vigente',NOT private.permite_modulo('noticias',false) AND private.permite_modulo('galeria',false));
 SELECT * INTO f FROM eva_publicador_contenido WHERE modulo='noticias';ok:=false;
 BEGIN PERFORM public.admin_cambiar_publicacion('noticias',f.id,'archivar',now());EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('retiro módulo bloquea próxima operación',ok);
 PERFORM pg_temp.claims_publicador(current_setting('eva.test.master')::uuid,current_setting('eva.test.ms')::uuid,'aal2');
 SELECT (x->>'actualizado_at')::timestamptz INTO v FROM jsonb_array_elements(public.admin_listar_usuarios()) x WHERE x->>'user_id'=p::text;
 PERFORM public.admin_guardar_usuario(p,null,'Publicador sintético','editor',false,ARRAY['galeria'],v);
 PERFORM pg_temp.claims_publicador(p,current_setting('eva.test.ps')::uuid,'aal1');
 PERFORM pg_temp.check_publicador('desactivación afecta JWT vigente',NOT private.es_admin_autorizado() AND NOT private.permite_modulo('galeria',false));
 SELECT * INTO f FROM eva_publicador_contenido WHERE modulo='galeria';ok:=false;
 BEGIN PERFORM public.admin_cambiar_publicacion('galeria',f.id,'archivar',now());EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;
 PERFORM pg_temp.check_publicador('desactivación bloquea próxima operación',ok);
 PERFORM pg_temp.claims_publicador(current_setting('eva.test.master')::uuid,current_setting('eva.test.ms')::uuid,'aal2');
 SELECT (x->>'actualizado_at')::timestamptz INTO v FROM jsonb_array_elements(public.admin_listar_usuarios()) x WHERE x->>'user_id'=p::text;
 PERFORM public.admin_guardar_usuario(p,null,'Consulta sintética','consulta',true,ARRAY['galeria'],v);
 PERFORM pg_temp.claims_publicador(p,current_setting('eva.test.ps')::uuid,'aal1');
 PERFORM pg_temp.check_publicador('consulta AAL1 conserva lectura',private.permite_modulo('galeria',false));
 SELECT * INTO f FROM eva_publicador_contenido WHERE modulo='galeria';SELECT updated_at INTO v FROM public.galeria_items WHERE id=f.id;ok:=false;
 BEGIN PERFORM public.admin_cambiar_publicacion('galeria',f.id,'archivar',v);EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('consulta no publica ni archiva',ok);
 PERFORM pg_temp.claims_publicador(current_setting('eva.test.master')::uuid,current_setting('eva.test.ms')::uuid,'aal1');
 PERFORM pg_temp.check_publicador('master AAL1 no recibe privilegios',NOT private.es_admin_mfa() AND NOT private.permite_modulo('galeria',false));ok:=false;
 BEGIN PERFORM public.admin_autorizar_editor('sin-envio@example.invalid','No autorizado',ARRAY['galeria']);EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('master AAL1 no invita',ok);
END $$;
RESET ROLE;
DO $$ DECLARE ok boolean;fila record; BEGIN
 -- Protección incluso en intentos directos desde la base de datos, sin alterar el master.
 ok:=false;BEGIN UPDATE admin_guard.admin_usuarios_autorizados SET activo=false WHERE rol='master';EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('master no se desactiva',ok);
 ok:=false;BEGIN UPDATE admin_guard.admin_usuarios_autorizados SET rol='editor' WHERE rol='master';EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('master no se degrada',ok);
 ok:=false;BEGIN DELETE FROM admin_guard.admin_usuarios_autorizados WHERE rol='master';EXCEPTION WHEN insufficient_privilege THEN ok:=true;END;PERFORM pg_temp.check_publicador('master no se elimina',ok);
 PERFORM pg_temp.check_publicador('master único permanece protegido',(SELECT count(*)=1 FROM admin_guard.admin_usuarios_autorizados WHERE rol='master'));
 PERFORM pg_temp.check_publicador('auditoría registra invitación y cambios sin secretos',EXISTS(SELECT 1 FROM private.auditoria_administrativa WHERE registro_clave=current_setting('eva.test.email') AND 'autorizacion_usuario'=ANY(eventos)) AND NOT EXISTS(SELECT 1 FROM private.auditoria_administrativa WHERE registro_clave IN (current_setting('eva.test.email'),current_setting('eva.test.publisher')) AND (datos_nuevos ?| ARRAY['password','access_token','refresh_token','totp','service_role'])));
END $$;
SELECT * FROM eva_publicador_resultados;
ROLLBACK;
