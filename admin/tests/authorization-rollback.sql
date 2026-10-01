-- PRUEBA HISTÓRICA OBSOLETA: contiene expectativas de CRUD editor previas al cierre.
-- No ejecutar para validar permisos actuales. Usar publication-rollback.sql y security-closure-rollback.sql.
-- Ejecutar completo. Todos los datos sintéticos, autorizaciones y contenidos se revierten.
-- No hay contraseñas, identidades de acceso ni correos enviados.
begin;
do $$
declare v_master uuid; v_editor uuid:=gen_random_uuid(); v_consulta uuid:=gen_random_uuid();
begin
  select user_id into strict v_master from admin_guard.admin_usuarios_autorizados where rol='master' and activo;
  perform set_config('eva.test.master',v_master::text,true);
  perform set_config('eva.test.editor',v_editor::text,true);
  perform set_config('eva.test.consulta',v_consulta::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_master,'role','authenticated','aal','aal2')::text,true);
  perform public.admin_autorizar_editor('editor-'||v_editor||'@example.invalid','Editor sintético',array['noticias']);
  perform public.admin_autorizar_editor('consulta-'||v_consulta||'@example.invalid','Consulta sintética',array['noticias']);
  insert into auth.users(id,email,email_confirmed_at) values
    (v_editor,'editor-'||v_editor||'@example.invalid',now()),(v_consulta,'consulta-'||v_consulta||'@example.invalid',now());
  update admin_guard.admin_usuarios_autorizados set rol='consulta' where user_id=v_consulta;
end $$;
set local role authenticated;
do $$
declare v_master uuid:=current_setting('eva.test.master')::uuid; v_editor uuid:=current_setting('eva.test.editor')::uuid;
  v_consulta uuid:=current_setting('eva.test.consulta')::uuid; v_noticia bigint; v_borrable bigint; v_objeto uuid; v_count integer; v_version timestamptz; v_bad boolean; v_qual text; v_permite boolean;
  v_tests text[]:='{}'; v_guardado jsonb;
begin
  assert private.es_admin_mfa(), 'Master AAL2 perdió acceso';
  assert private.permite_modulo('calendario',true), 'Master no puede escribir calendario';
  assert (public.perfil_panel_admin()->>'rol')='master', 'Perfil master incorrecto';
  assert jsonb_array_length(public.admin_listar_usuarios())=3, 'Listado master no incluye fixtures';
  v_tests:=v_tests||array['master AAL2 conserva acceso completo','perfil solo del usuario actual','listado master protegido'];
  v_bad:=false;
  begin perform public.admin_guardar_usuario(v_master,null,'Master','editor',false,'{}',now()); exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Se pudo degradar master'; v_tests:=array_append(v_tests,'RPC impide degradar o desactivar master');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_master,'role','authenticated','aal','aal1')::text,true);
  assert not private.es_admin_mfa() and not private.permite_modulo('noticias',true), 'Master AAL1 puede escribir';
  v_bad:=false; begin perform public.admin_listar_usuarios(); exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Listado master disponible en AAL1'; v_tests:=v_tests||array['AAL1 bloquea escritura','AAL1 bloquea gestión de usuarios'];

  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_editor,'role','authenticated','aal','aal2','user_metadata',jsonb_build_object('rol','master'))::text,true);
  assert private.es_admin_autorizado() and not private.es_admin_mfa(), 'Editor obtuvo privilegios master';
  assert private.permite_modulo('noticias',true) and not private.permite_modulo('galeria',true), 'Asignación de módulos incorrecta';
  assert not private.permite_modulo('usuarios',true) and not private.permite_modulo('materiales',true), 'Módulo crítico o no integrado accesible';
  v_tests:=v_tests||array['editor no hereda administración','metadatos editables no conceden master','editor solo escribe módulo asignado','módulos críticos y materiales no habilitados'];
  v_bad:=false; begin perform public.admin_listar_usuarios(); exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Editor listó usuarios';
  v_bad:=false; begin perform public.admin_autorizar_editor('otra@example.invalid','Otra cuenta',array['noticias']); exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Editor autorizó otra cuenta';
  v_bad:=false; begin perform public.admin_guardar_usuario(v_editor,null,'Editor','master',true,array['noticias','galeria'],now()); exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Editor se autoescaló';
  v_bad:=false; begin perform count(*) from admin_guard.admin_usuarios_autorizados; exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Tabla administrativa accesible directamente';
  v_tests:=v_tests||array['editor no lista usuarios','editor no autoriza cuentas','editor no cambia su rol o permisos','tabla administrativa sin acceso directo'];

  insert into public.noticias_destacadas(titulo,descripcion,visible,estado_publicacion)
    values('Prueba transaccional EVA','Contenido sintético que se revierte',false,'borrador') returning id into v_noticia;
  update public.noticias_destacadas set titulo='Prueba editada EVA' where id=v_noticia;
  get diagnostics v_count=row_count; assert v_count=1,'Editor no editó su módulo';
  v_tests:=v_tests||array['RLS permite crear en módulo asignado','RLS permite editar borrador asignado'];
  update public.noticias_destacadas set visible=true,estado_publicacion='publicado' where id=v_noticia;
  get diagnostics v_count=row_count; assert v_count=1,'Editor no publica módulo asignado';
  update public.noticias_destacadas set visible=false,estado_publicacion='borrador' where id=v_noticia;
  insert into public.noticias_destacadas(titulo,descripcion,visible,estado_publicacion) values('Borrable sintético','Prueba',false,'borrador') returning id into v_borrable;
  delete from public.noticias_destacadas where id=v_borrable; get diagnostics v_count=row_count; assert v_count=1,'Editor no elimina en módulo asignado';
  v_tests:=v_tests||array['editor publica módulo asignado','editor elimina cuando el módulo lo permite'];
  insert into storage.objects(bucket_id,name) values('eva-publico','noticias/_eva_test_'||v_editor||'.jpg') returning id into v_objeto;
  select count(*) into v_count from storage.objects where id=v_objeto; assert v_count=1,'Editor no lee objeto asignado';
  update storage.objects set name='noticias/_eva_test_update_'||v_editor||'.jpg' where id=v_objeto;
  get diagnostics v_count=row_count; assert v_count=1,'Editor no actualiza objeto asignado';
  v_bad:=false; begin update storage.objects set name='galeria/_eva_test_'||v_editor||'.jpg' where id=v_objeto; exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Storage permite cambiar objeto a otro módulo';
  v_bad:=false; begin insert into storage.objects(bucket_id,name) values('eva-publico','repositorio/_eva_test_'||v_editor||'.jpg'); exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Storage permite subir a otro módulo';
  -- Supabase obliga a borrar objetos mediante la API Storage; no se desactiva esa protección.
  select qual into strict v_qual from pg_policies where schemaname='storage' and tablename='objects' and policyname='eva_publico_admin_mfa_delete';
  execute 'select ('||v_qual||') from storage.objects where id=$1' into v_permite using v_objeto;
  assert v_permite,'Política DELETE no permite el objeto del módulo asignado';
  v_tests:=v_tests||array['Storage permite subir en módulo asignado','Storage permite leer objeto asignado','Storage permite actualizar objeto asignado','Storage bloquea cambio de carpeta no asignada','Storage bloquea subida a otro módulo','política DELETE Storage valida el módulo asignado'];
  v_bad:=false; begin insert into public.galeria_items(titulo,imagen_url,imagen_alt) values('Prueba','https://example.invalid/test.jpg','Sintética'); exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Editor creó galería sin asignación';
  v_bad:=false; begin perform public.admin_guardar_actividad_calendario(null,current_date,'["Prueba sintética"]'::jsonb); exception when others then if sqlerrm='Acceso administrativo no autorizado' then v_bad:=true; else raise; end if; end;
  assert v_bad,'RPC calendario elude asignación';
  select count(*) into v_count from public.eva_compartidos_diarios;
  assert v_count=0,'Editor obtiene estadísticas administrativas';
  v_tests:=v_tests||array['RLS rechaza otro módulo','RPC calendario rechaza módulo no asignado','estadísticas administrativas solo master'];

  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_consulta,'role','authenticated','aal','aal2')::text,true);
  assert private.permite_modulo('noticias',false) and not private.permite_modulo('noticias',true),'Consulta puede escribir';
  select count(*) into v_count from public.noticias_destacadas where id=v_noticia; assert v_count=1,'Consulta no lee módulo asignado';
  update public.noticias_destacadas set titulo='No permitido' where id=v_noticia; get diagnostics v_count=row_count; assert v_count=0,'Consulta modificó contenido';
  delete from public.noticias_destacadas where id=v_noticia; get diagnostics v_count=row_count; assert v_count=0,'Consulta eliminó contenido';
  v_tests:=v_tests||array['consulta lee borradores asignados','consulta no modifica','consulta no elimina'];

  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_master,'role','authenticated','aal','aal2')::text,true);
  select (value->>'actualizado_at')::timestamptz into v_version from jsonb_array_elements(public.admin_listar_usuarios()) where value->>'user_id'=v_editor::text;
  perform public.admin_guardar_usuario(v_editor,null,'Editor sintético','editor',true,'{}',v_version);
  v_bad:=false; begin perform public.admin_guardar_usuario(v_editor,null,'Editor sintético','editor',true,array['noticias'],v_version); exception when serialization_failure then v_bad:=true; end;
  assert v_bad,'Guardado obsoleto sobrescribe permisos';
  v_tests:=v_tests||array['master retira módulos','se detecta guardado simultáneo'];
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_editor,'role','authenticated','aal','aal2')::text,true);
  assert not private.permite_modulo('noticias',true),'Retiro exige renovar JWT';
  select count(*) into v_count from public.noticias_destacadas where id=v_noticia; assert v_count=0,'Editor conserva acceso al borrador retirado';
  update public.noticias_destacadas set titulo='No permitido' where id=v_noticia; get diagnostics v_count=row_count; assert v_count=0,'Editor escribe tras retiro';
  v_tests:=v_tests||array['retiro efectivo con el mismo JWT','RLS retira lectura privada','RLS retira escritura'];

  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_master,'role','authenticated','aal','aal2')::text,true);
  select (value->>'actualizado_at')::timestamptz into v_version from jsonb_array_elements(public.admin_listar_usuarios()) where value->>'user_id'=v_editor::text;
  perform public.admin_guardar_usuario(v_editor,null,'Editor sintético','editor',false,array['noticias'],v_version);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_editor,'role','authenticated','aal','aal2')::text,true);
  assert not private.es_admin_autorizado(),'Desactivación no efectiva'; v_tests:=array_append(v_tests,'desactivación efectiva con JWT vigente');
  perform set_config('eva.test.results',to_jsonb(v_tests)::text,true);
end $$;
reset role;
do $$
declare v_master uuid:=current_setting('eva.test.master')::uuid; v_bad boolean; v_editor uuid:=current_setting('eva.test.editor')::uuid;
begin
  v_bad:=false; begin update admin_guard.admin_usuarios_autorizados set activo=false where user_id=v_master; exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Trigger permite desactivar master';
  v_bad:=false; begin delete from admin_guard.admin_usuarios_autorizados where user_id=v_master; exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Trigger permite eliminar master';
  v_bad:=false; begin update admin_guard.admin_usuarios_autorizados set rol='editor' where user_id=v_master; exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Trigger permite degradar master';
  v_bad:=false; begin delete from auth.users where id=v_master; exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Cascade Auth elimina master';
  assert exists(select 1 from private.auditoria_administrativa where registro_clave=v_editor::text and actor_user_id=v_master and 'cambio_modulos'=any(eventos)), 'Falta auditoría de módulos';
  assert exists(select 1 from private.auditoria_administrativa where registro_clave=v_editor::text and 'desactivacion'=any(eventos)), 'Falta auditoría de desactivación';
  perform set_config('eva.test.results',((current_setting('eva.test.results')::jsonb)||to_jsonb(array['trigger impide desactivar master','trigger impide eliminar master','trigger impide degradar master','eliminación Auth también protege master','auditoría incluye actor y módulos','auditoría incluye desactivación']))::text,true);
end $$;
set local role anon;
do $$
declare v_bad boolean:=false;
begin
  begin perform public.admin_listar_usuarios(); exception when insufficient_privilege then v_bad:=true; end;
  assert v_bad,'Anónimo accede a usuarios';
end $$;
reset role;
select jsonb_array_length(current_setting('eva.test.results')::jsonb)+1 as pruebas_conformes,
  current_setting('eva.test.results')::jsonb||'["anónimo no accede a gestión de usuarios"]'::jsonb as resultados;
rollback;
