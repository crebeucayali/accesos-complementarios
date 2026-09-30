-- Fixtures sin contraseñas ni invitaciones. Ejecutar completo: siempre ROLLBACK.
begin;
do $$
declare m uuid; e uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
begin
  select user_id into strict m from admin_guard.admin_usuarios_autorizados where rol='master' and activo;
  perform set_config('eva.fix.master',m::text,true); perform set_config('eva.fix.editor',e::text,true); perform set_config('eva.fix.consulta',c::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',m,'role','authenticated','aal','aal2')::text,true);
  insert into admin_guard.admin_correos_autorizados(email,nombre,rol,modulos,autorizado_por) values
    ('editor-'||e||'@example.invalid','Fixture editor','editor',array['capacitaciones','calendario','repositorio','noticias','galeria'],m),
    ('consulta-'||c||'@example.invalid','Fixture consulta','consulta',array['noticias'],m);
  insert into auth.users(id,email,email_confirmed_at) values
    (e,'editor-'||e||'@example.invalid',now()),(c,'consulta-'||c||'@example.invalid',now());
end $$;
set local role authenticated;
do $$
declare t text; v_modulo text; fila jsonb; id_fila bigint; cols text; vals text; mapa jsonb:='{}'; img bigint; obj uuid;
begin
  assert private.es_admin_mfa(),'El master perdió AAL2';
  for v_modulo,t in select * from (values ('capacitaciones','capacitaciones_sesiones'),('calendario','calendario_actividades'),
    ('repositorio','repositorio_recursos'),('noticias','noticias_destacadas'),('galeria','galeria_items')) as x(m,t) loop
    execute format('select to_jsonb(r) from public.%I r order by id limit 1',t) into strict fila;
    fila:=fila||jsonb_build_object('titulo','Fixture publicación','visible',true,'updated_at',now()-interval '1 day');
    if fila?'estado_publicacion' then fila:=fila||'{"estado_publicacion":"publicado"}'; end if;
    if v_modulo='capacitaciones' then fila:=fila||'{"jornada":2,"numero_sesion":49}'; end if;
    if v_modulo='calendario' then fila:=fila||'{"fecha":"2099-01-01","orden":999,"contenido_lineas":["Fixture publicación"]}'; end if;
    if v_modulo='galeria' then fila:=fila||'{"publicacion_autorizada":true}'; end if;
    select string_agg(format('%I',attname),',' order by attnum),string_agg(format('r.%I',attname),',' order by attnum)
      into cols,vals from pg_attribute where attrelid=format('public.%I',t)::regclass and attnum>0 and not attisdropped and attname<>'id';
    execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) r returning id',t,cols,vals,t)
      into id_fila using fila;
    mapa:=mapa||jsonb_build_object(v_modulo,jsonb_build_object('id',id_fila,'tabla',t));
  end loop;
  insert into public.noticias_destacadas(titulo,descripcion,visible,estado_publicacion)
    values('Fixture borrador','Preparación exclusiva del master',false,'borrador') returning id into id_fila;
  mapa:=mapa||jsonb_build_object('borrador',id_fila);
  insert into public.galeria_item_imagenes(galeria_item_id,imagen_url,imagen_alt,orden)
    select (mapa->'galeria'->>'id')::bigint,imagen_url,imagen_alt,1 from public.galeria_item_imagenes limit 1 returning id into img;
  insert into storage.objects(bucket_id,name) values('eva-publico','noticias/_fixture_'||gen_random_uuid()||'.jpg') returning id into obj;
  perform set_config('eva.fix.mapa',mapa::text,true); perform set_config('eva.fix.objeto',obj::text,true);
end $$;
do $$
declare m uuid:=current_setting('eva.fix.master')::uuid; e uuid:=current_setting('eva.fix.editor')::uuid; c uuid:=current_setting('eva.fix.consulta')::uuid;
  mapa jsonb:=current_setting('eva.fix.mapa')::jsonb; v_modulo text; t text; id_fila bigint; fila jsonb; antes jsonb; version timestamptz;
  resultado jsonb; n integer; bad boolean; qual text; permitido boolean; tests text[]:='{}';
begin
  for v_modulo in select unnest(array['capacitaciones','calendario','repositorio','noticias','galeria']) loop
    t:=mapa->v_modulo->>'tabla'; id_fila:=(mapa->v_modulo->>'id')::bigint;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',e,'role','authenticated','aal','aal2','user_metadata','{"rol":"master"}'::jsonb)::text,true);
    assert private.permite_modulo(v_modulo,false) and not private.permite_modulo(v_modulo,true),'Editor obtuvo escritura estructural';
    execute format('select to_jsonb(r) from public.%I r where id=$1',t) into antes using id_fila;
    assert antes is not null,'Editor no lee publicado asignado';
    n:=0; begin execute format('delete from public.%I where id=$1',t) using id_fila; get diagnostics n=row_count;
      exception when insufficient_privilege then n:=0; end;
    assert n=0,'Editor ejecutó DELETE';
    execute format('update public.%I set titulo=$1 where id=$2',t) using 'Cambio estructural prohibido',id_fila;
    get diagnostics n=row_count; assert n=0,'Editor modificó campos';
    execute format('update public.%I set visible=false where id=$1',t) using id_fila;
    get diagnostics n=row_count; assert n=0,'Editor eludió la RPC con PATCH';
    version:=(antes->>'updated_at')::timestamptz;
    resultado:=public.admin_cambiar_publicacion(v_modulo,id_fila,'archivar',version);
    assert resultado->>'estado'='archivado','Editor no archiva';
    execute format('select to_jsonb(r) from public.%I r where id=$1',t) into fila using id_fila;
    assert fila is not null and (fila->>'visible')::boolean=false,'Archivado desapareció del panel o se eliminó';
    assert (fila-array['visible','estado_publicacion','updated_at'])=(antes-array['visible','estado_publicacion','updated_at']),'Archivar alteró campos de contenido';
    bad:=false; begin perform public.admin_cambiar_publicacion(v_modulo,id_fila,'publicar',version); exception when serialization_failure then bad:=true; end;
    assert bad,'Una versión obsoleta no fue rechazada';
    version:=(fila->>'updated_at')::timestamptz;
    bad:=false; begin perform public.admin_cambiar_publicacion(v_modulo,id_fila,'restaurar',version); exception when insufficient_privilege then bad:=true; end;
    assert bad,'Editor accede a acción exclusiva Restaurar';
    resultado:=public.admin_cambiar_publicacion(v_modulo,id_fila,'publicar',version);
    assert resultado->>'estado'='publicado' and resultado->>'evento'='restaurado','Editor no publica archivado asignado';
    perform set_config('request.jwt.claims',jsonb_build_object('sub',m,'role','authenticated','aal','aal2')::text,true);
    execute format('select updated_at from public.%I where id=$1',t) into version using id_fila;
    resultado:=public.admin_cambiar_publicacion(v_modulo,id_fila,'archivar',version); assert resultado->>'estado'='archivado','Master no archiva';
    resultado:=public.admin_cambiar_publicacion(v_modulo,id_fila,'restaurar',(resultado->>'updated_at')::timestamptz);
    assert resultado->>'estado'='publicado','Master no restaura';
    resultado:=public.admin_cambiar_publicacion(v_modulo,id_fila,'publicar',(resultado->>'updated_at')::timestamptz);
    assert (resultado->>'sin_cambios')::boolean,'Publicación idempotente falló';
    tests:=tests||array[v_modulo||': editor lee publicados y archivados',v_modulo||': DELETE directo editor bloqueado',
      v_modulo||': PATCH estructural y de visibilidad bloqueados',v_modulo||': editor archiva sin alterar contenido',
      v_modulo||': versión obsoleta rechazada',v_modulo||': editor publica archivado; Restaurar explícito master',
      v_modulo||': master archiva/restaura/publica'];
  end loop;
  id_fila:=(mapa->>'borrador')::bigint;
  select updated_at into version from public.noticias_destacadas where id=id_fila;
  resultado:=public.admin_cambiar_publicacion('noticias',id_fila,'publicar',version);
  assert resultado->>'evento'='publicado','Master no publica borrador';
  perform public.admin_cambiar_publicacion('noticias',id_fila,'archivar',(resultado->>'updated_at')::timestamptz);
  insert into public.noticias_destacadas(titulo,descripcion,visible,estado_publicacion)
    values('Fixture exclusivo master','Borrador sin entregar',false,'borrador') returning id,updated_at into id_fila,version;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',e,'role','authenticated','aal','aal2')::text,true);
  select count(*) into n from public.noticias_destacadas where id=id_fila; assert n=0,'Editor ve borrador privado';
  bad:=false; begin perform public.admin_cambiar_publicacion('noticias',id_fila,'publicar',version); exception when insufficient_privilege then bad:=true; end;
  assert bad,'Editor publica borrador sin preparación del master';
  bad:=false; begin perform public.admin_cambiar_publicacion('noticias',(mapa->'noticias'->>'id')::bigint,'eliminar',version); exception when invalid_parameter_value then bad:=true; end;
  assert bad,'RPC acepta acción eliminar';
  id_fila:=(mapa->>'borrador')::bigint;
  bad:=false; begin insert into public.noticias_destacadas(titulo,descripcion) values('Editor crea','Prohibido'); exception when insufficient_privilege then bad:=true; end;
  assert bad,'Editor pudo crear contenido estructural';
  bad:=false; begin perform public.admin_guardar_actividad_calendario(null,current_date,'["Prohibido"]'); exception when others then
    if sqlerrm='Acceso administrativo no autorizado' then bad:=true; else raise; end if; end;
  assert bad,'RPC calendario permitió estructura';
  bad:=false; begin perform public.admin_listar_usuarios(); exception when insufficient_privilege then bad:=true; end; assert bad,'Editor listó usuarios';
  bad:=false; begin perform public.admin_autorizar_editor('nadie@example.invalid','Nadie',array['noticias']); exception when insufficient_privilege then bad:=true; end; assert bad,'Editor autorizó usuarios';
  bad:=false; begin perform public.admin_guardar_usuario(e,null,'Editor','master',true,array['noticias'],now()); exception when insufficient_privilege then bad:=true; end; assert bad,'Editor modificó roles/permisos';
  bad:=false; begin perform count(*) from admin_guard.admin_usuarios_autorizados; exception when insufficient_privilege then bad:=true; end; assert bad,'Editor leyó tabla administrativa';
  select count(*) into n from public.eva_compartidos_diarios; assert n=0,'Editor accedió a estadísticas';
  assert not private.permite_modulo('materiales',false) and not private.es_admin_mfa(),'Editor obtuvo Materiales/master';
  bad:=false; begin insert into storage.objects(bucket_id,name) values('eva-publico','noticias/_prohibido.jpg'); exception when insufficient_privilege then bad:=true; end; assert bad,'Editor subió Storage';
  update storage.objects set name='noticias/_cambio_prohibido.jpg' where id=current_setting('eva.fix.objeto')::uuid;
  get diagnostics n=row_count; assert n=0,'Editor modificó Storage';
  select p.qual into strict qual from pg_policies p where schemaname='storage' and tablename='objects' and policyname='eva_publico_admin_mfa_delete';
  execute 'select ('||qual||') from storage.objects where id=$1' into permitido using current_setting('eva.fix.objeto')::uuid;
  assert not permitido,'DELETE Storage permitido al editor';
  tests:=tests||array['master publica borrador','editor no ve ni publica borradores privados','RPC rechaza eliminar','editor no crea registros','RPC estructural calendario master',
    'editor no administra usuarios','editor no autoriza usuarios','editor no modifica roles/permisos','tabla administrativa privada',
    'editor sin estadísticas','Materiales no habilitado','Storage INSERT/UPDATE/DELETE editor bloqueados'];
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated','aal','aal2')::text,true);
  select updated_at into version from public.noticias_destacadas where id=id_fila;
  bad:=false; begin perform public.admin_cambiar_publicacion('noticias',id_fila,'publicar',version); exception when insufficient_privilege then bad:=true; end;
  assert bad,'Consulta publicó'; tests:=array_append(tests,'consulta solo lectura');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',e,'role','authenticated','aal','aal1')::text,true);
  bad:=false; begin perform public.admin_cambiar_publicacion('noticias',id_fila,'publicar',version); exception when insufficient_privilege then bad:=true; end;
  assert bad,'AAL1 publicó'; tests:=array_append(tests,'AAL2 obligatorio');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',m,'role','authenticated','aal','aal2')::text,true);
  select (value->>'actualizado_at')::timestamptz into version from jsonb_array_elements(public.admin_listar_usuarios()) where value->>'user_id'=e::text;
  perform public.admin_guardar_usuario(e,null,'Fixture editor','editor',true,array['noticias'],version);
  bad:=false; begin perform public.admin_autorizar_editor('nadie@example.invalid','Nadie',array['noticias']); exception when sqlstate '55000' then bad:=true; end;
  assert bad,'Invitaciones no están pausadas'; tests:=array_append(tests,'invitaciones bloqueadas también en servidor');
  bad:=false; begin perform public.admin_guardar_usuario(m,null,'Master','editor',false,'{}',now()); exception when insufficient_privilege then bad:=true; end;
  assert bad,'Master puede degradarse'; tests:=array_append(tests,'master protegido por RPC');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',e,'role','authenticated','aal','aal2')::text,true);
  bad:=false; begin perform public.admin_cambiar_publicacion('galeria',(mapa->'galeria'->>'id')::bigint,'archivar',now()); exception when insufficient_privilege then bad:=true; end;
  assert bad,'Editor opera módulo retirado'; tests:=array_append(tests,'módulo no asignado bloqueado con JWT vigente');
  perform set_config('eva.fix.tests',to_jsonb(tests)::text,true);
end $$;
reset role;
-- Auditoría y supervivencia física comprobadas como propietario, sin exponerlas al editor.
do $$
declare mapa jsonb:=current_setting('eva.fix.mapa')::jsonb; v_modulo text; t text; id_fila bigint; n integer; clave text; bad boolean; m uuid:=current_setting('eva.fix.master')::uuid;
begin
  for v_modulo in select unnest(array['capacitaciones','calendario','repositorio','noticias','galeria']) loop
    t:=mapa->v_modulo->>'tabla'; id_fila:=(mapa->v_modulo->>'id')::bigint;
    clave:=case when v_modulo='capacitaciones' then '2:49' else id_fila::text end;
    execute format('select count(*) from public.%I where id=$1',t) into n using id_fila; assert n=1,'Archivar eliminó registro';
    assert exists(select 1 from private.auditoria_administrativa a where a.modulo=v_modulo and a.registro_clave=clave and actor_rol='editor' and 'archivado'=any(eventos) and actor_user_id=current_setting('eva.fix.editor')::uuid),'Falta audit editor archivo';
    assert exists(select 1 from private.auditoria_administrativa a where a.modulo=v_modulo and a.registro_clave=clave and actor_rol='master' and 'restaurado'=any(eventos) and actor_user_id=m),'Falta audit master restaurado';
  end loop;
  assert exists(select 1 from public.galeria_item_imagenes where galeria_item_id=(mapa->'galeria'->>'id')::bigint),'Archivar borró imágenes';
  assert exists(select 1 from storage.objects where id=current_setting('eva.fix.objeto')::uuid),'Archivar borró Storage';
  assert exists(select 1 from private.auditoria_administrativa a where registro_clave=mapa->>'borrador' and a.modulo='noticias' and actor_rol='master' and 'publicado'=any(eventos)),'Falta audit publicación';
  bad:=false; begin update admin_guard.admin_usuarios_autorizados set rol='editor' where user_id=m; exception when insufficient_privilege then bad:=true; end; assert bad,'Master degradable por trigger';
  bad:=false; begin update admin_guard.admin_usuarios_autorizados set activo=false where user_id=m; exception when insufficient_privilege then bad:=true; end; assert bad,'Master desactivable';
  bad:=false; begin delete from admin_guard.admin_usuarios_autorizados where user_id=m; exception when insufficient_privilege then bad:=true; end; assert bad,'Master eliminable';
  perform set_config('eva.fix.tests',(current_setting('eva.fix.tests')::jsonb||to_jsonb(array['registros permanecen físicamente',
    'imágenes y Storage permanecen','auditoría publicar/archivar/restaurar con UUID/rol/módulo/registro/fecha','master protegido por trigger']))::text,true);
end $$;
-- Los cinco módulos se archivan antes de consultar como público real (rol anon).
set local role authenticated;
do $$
declare v_modulo text; mapa jsonb:=current_setting('eva.fix.mapa')::jsonb; version timestamptz; t text;
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('eva.fix.master'),'role','authenticated','aal','aal2')::text,true);
  for v_modulo in select unnest(array['capacitaciones','calendario','repositorio','noticias','galeria']) loop
    t:=mapa->v_modulo->>'tabla'; execute format('select updated_at from public.%I where id=$1',t) into version using (mapa->v_modulo->>'id')::bigint;
    perform public.admin_cambiar_publicacion(v_modulo,(mapa->v_modulo->>'id')::bigint,'archivar',version);
  end loop;
end $$;
set local role anon;
do $$
declare v_modulo text; mapa jsonb:=current_setting('eva.fix.mapa')::jsonb; n integer; bad boolean;
begin
  for v_modulo in select unnest(array['capacitaciones','calendario','repositorio','noticias','galeria']) loop
    execute format('select count(*) from public.%I where id=$1',mapa->v_modulo->>'tabla') into n using (mapa->v_modulo->>'id')::bigint;
    assert n=0,'Público ve archivado';
  end loop;
  select count(*) into n from public.calendario_publico where registro_id in ('actividad-'||(mapa->'calendario'->>'id'),'capacitacion-'||(mapa->'capacitaciones'->>'id'));
  assert n=0,'Vista pública incluye archivados';
  bad:=false; begin perform public.admin_cambiar_publicacion('noticias',1,'publicar',now()); exception when insufficient_privilege then bad:=true; end; assert bad,'Anónimo ejecuta RPC';
  perform set_config('eva.fix.tests',(current_setting('eva.fix.tests')::jsonb||'["anon no ve archivados en cinco módulos","vista calendario no incluye archivados","RPC anónima bloqueada"]')::text,true);
end $$;
set local role authenticated;
do $$
declare v_modulo text; mapa jsonb:=current_setting('eva.fix.mapa')::jsonb; t text; version timestamptz;
begin
  for v_modulo in select unnest(array['capacitaciones','calendario','repositorio','noticias','galeria']) loop
    t:=mapa->v_modulo->>'tabla'; execute format('select updated_at from public.%I where id=$1',t) into version using (mapa->v_modulo->>'id')::bigint;
    perform public.admin_cambiar_publicacion(v_modulo,(mapa->v_modulo->>'id')::bigint,'restaurar',version);
  end loop;
end $$;
set local role anon;
do $$
declare v_modulo text; mapa jsonb:=current_setting('eva.fix.mapa')::jsonb; n integer;
begin
  for v_modulo in select unnest(array['capacitaciones','calendario','repositorio','noticias','galeria']) loop
    execute format('select count(*) from public.%I where id=$1',mapa->v_modulo->>'tabla') into n using (mapa->v_modulo->>'id')::bigint;
    assert n=1,'Restaurado no regresa al público';
  end loop;
  perform set_config('eva.fix.tests',(current_setting('eva.fix.tests')::jsonb||'["restaurados vuelven a API pública en cinco módulos"]')::text,true);
end $$;
set local role authenticated;
do $$
declare v_modulo text; mapa jsonb:=current_setting('eva.fix.mapa')::jsonb; n integer;
begin
  for v_modulo in select unnest(array['repositorio','noticias','galeria']) loop
    execute format('delete from public.%I where id=$1',mapa->v_modulo->>'tabla') using (mapa->v_modulo->>'id')::bigint;
    get diagnostics n=row_count; assert n=1,'Master no puede eliminar definitivamente';
  end loop;
end $$;
reset role;
do $$
declare v_modulo text; mapa jsonb:=current_setting('eva.fix.mapa')::jsonb;
begin
  for v_modulo in select unnest(array['repositorio','noticias','galeria']) loop
    assert exists(select 1 from private.auditoria_administrativa a where a.modulo=v_modulo and registro_clave=mapa->v_modulo->>'id'
      and actor_rol='master' and actor_user_id=current_setting('eva.fix.master')::uuid and 'eliminado_definitivamente'=any(eventos)),'Falta audit eliminación';
  end loop;
  perform set_config('eva.fix.tests',(current_setting('eva.fix.tests')::jsonb||'["master DELETE en los tres módulos que lo permiten","auditoría eliminado_definitivamente"]')::text,true);
end $$;
select jsonb_array_length(current_setting('eva.fix.tests')::jsonb) as pruebas_conformes,current_setting('eva.fix.tests')::jsonb as resultados;
rollback;
