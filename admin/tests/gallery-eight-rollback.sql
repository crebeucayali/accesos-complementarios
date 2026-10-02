-- Galería 1–8: pruebas con usuarios y sesiones sintéticos exclusivamente transaccionales.
-- Ejecutar íntegramente. Sin contraseñas, tokens reales, correos ni subidas físicas.
-- Los objetos de Storage son metadatos de prueba; todo termina en ROLLBACK.
BEGIN;
CREATE TEMP TABLE eva_galeria_resultados(caso text PRIMARY KEY, conforme boolean NOT NULL);
GRANT SELECT,INSERT ON eva_galeria_resultados TO authenticated,anon;
CREATE FUNCTION pg_temp.galeria_check(caso text, conforme boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF conforme IS DISTINCT FROM true THEN RAISE EXCEPTION 'Prueba fallida: %',caso; END IF;
 INSERT INTO eva_galeria_resultados VALUES(caso,true);
END $$;
CREATE FUNCTION pg_temp.galeria_claims(usuario uuid,sesion uuid) RETURNS void LANGUAGE sql AS $$
 SELECT set_config('request.jwt.claims',jsonb_build_object('sub',usuario,'session_id',sesion,'role','authenticated','aal','aal2')::text,true);
$$;
DO $$
DECLARE m uuid; e uuid:=gen_random_uuid(); sm uuid:=gen_random_uuid(); se uuid:=gen_random_uuid();
BEGIN
 SELECT user_id INTO STRICT m FROM admin_guard.admin_usuarios_autorizados WHERE rol='master' AND activo;
 PERFORM set_config('eva.gallery.master',m::text,true);PERFORM set_config('eva.gallery.editor',e::text,true);
 PERFORM set_config('eva.gallery.master_session',sm::text,true);PERFORM set_config('eva.gallery.editor_session',se::text,true);
 INSERT INTO admin_guard.admin_correos_autorizados(email,nombre,rol,modulos,autorizado_por)
 VALUES('galeria-test-'||e||'@example.invalid','Editor transaccional Galería','editor',ARRAY['galeria'],m);
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(e,'galeria-test-'||e||'@example.invalid',now());
 INSERT INTO auth.sessions(id,user_id,aal,created_at,updated_at) VALUES(sm,m,'aal2',now(),now()),(se,e,'aal2',now(),now());
 PERFORM pg_temp.galeria_claims(m,sm);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE id_actividad bigint; n integer; i integer; agregado integer; afectadas integer; rechazado boolean; version timestamptz;
 antes jsonb; despues jsonb; resultado jsonb; ruta text; ruta_base text:='galeria/_eva_limite_'||gen_random_uuid();
BEGIN
 PERFORM pg_temp.galeria_check('master AAL2 conserva gestión',private.es_admin_mfa() AND private.permite_modulo('galeria',true));
 -- Cada creación usa IDs generados normalmente; las filas se revierten, sin modificar contenido existente.
 FOR n IN 1..8 LOOP
  INSERT INTO public.galeria_items(titulo,imagen_url,imagen_alt,visible,estado_publicacion,publicacion_autorizada)
   VALUES('PRUEBA TRANSACCIONAL GALERÍA '||n,'imagenes-galeria/prueba.jpg','Fotografía sintética',false,'borrador',true) RETURNING id INTO id_actividad;
  INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt)
   SELECT id_actividad,gs.numero,'https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/'||ruta_base||'/'||gs.numero||'.webp','Alternativo '||gs.numero FROM generate_series(1,n) AS gs(numero);
  PERFORM pg_temp.galeria_check('guardar actividad con '||n||' fotografías',(SELECT count(*)=n FROM public.galeria_item_imagenes WHERE galeria_item_id=id_actividad));
  IF n=8 THEN
   PERFORM set_config('eva.gallery.record',id_actividad::text,true);
   rechazado:=false;
   BEGIN
    INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt) VALUES(id_actividad,9,'imagenes-galeria/novena.jpg','Novena');
   EXCEPTION WHEN check_violation THEN rechazado:=true; END;
   PERFORM pg_temp.galeria_check('SQL bloquea una novena y conserva ocho',rechazado AND (SELECT count(*)=8 FROM public.galeria_item_imagenes WHERE galeria_item_id=id_actividad));
   rechazado:=false;
   BEGIN INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt) VALUES(id_actividad,8,'imagenes-galeria/duplicada.jpg','Duplicada');
   EXCEPTION WHEN unique_violation THEN rechazado:=true; END;
   PERFORM pg_temp.galeria_check('orden repetido no permite eludir el máximo',rechazado);
   rechazado:=false;
   BEGIN INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt) VALUES(id_actividad,0,'imagenes-galeria/cero.jpg','Cero');
   EXCEPTION WHEN check_violation THEN rechazado:=true; END;
   PERFORM pg_temp.galeria_check('orden cero permanece rechazado',rechazado);
  END IF;
 END LOOP;
 FOR agregado IN 1..4 LOOP
  INSERT INTO public.galeria_items(titulo,imagen_url,imagen_alt,visible,estado_publicacion,publicacion_autorizada)
   VALUES('PRUEBA EDICIÓN 5+'||agregado,'imagenes-galeria/prueba.jpg','Sintética',false,'borrador',true) RETURNING id INTO id_actividad;
  INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt)
   SELECT id_actividad,gs.numero,'imagenes-galeria/edicion-'||gs.numero||'.jpg','Alternativo '||gs.numero FROM generate_series(1,5) AS gs(numero);
  rechazado:=false;
  BEGIN
   INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt)
    SELECT id_actividad,gs.numero,'imagenes-galeria/edicion-'||gs.numero||'.jpg','Alternativo '||gs.numero FROM generate_series(6,5+agregado) AS gs(numero);
  EXCEPTION WHEN check_violation THEN rechazado:=true; END;
  PERFORM pg_temp.galeria_check('edición 5+'||agregado||' y atomicidad del lote',CASE WHEN agregado<=3 THEN NOT rechazado AND (SELECT count(*)=5+agregado FROM public.galeria_item_imagenes WHERE galeria_item_id=id_actividad) ELSE rechazado AND (SELECT count(*)=5 FROM public.galeria_item_imagenes WHERE galeria_item_id=id_actividad) END);
 END LOOP;
 -- La edición retira una referencia y renumera como el flujo existente del panel.
 DELETE FROM public.galeria_item_imagenes WHERE galeria_item_id=id_actividad AND orden=5;
 INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt)
  SELECT id_actividad,gs.numero,'imagenes-galeria/nueva-'||gs.numero||'.jpg','Nueva '||gs.numero FROM generate_series(5,8) AS gs(numero);
 PERFORM pg_temp.galeria_check('5 - 1 + 4 conserva ocho y las otras referencias',(SELECT count(*)=8 FROM public.galeria_item_imagenes WHERE galeria_item_id=id_actividad) AND (SELECT count(*)=4 FROM public.galeria_item_imagenes WHERE galeria_item_id=id_actividad AND imagen_url LIKE 'imagenes-galeria/edicion-%'));
 id_actividad:=current_setting('eva.gallery.record')::bigint;
 FOR i IN 6..8 LOOP
  rechazado:=false;
  BEGIN UPDATE public.galeria_item_imagenes SET imagen_alt=' ' WHERE galeria_item_id=id_actividad AND orden=i;
  EXCEPTION WHEN check_violation THEN rechazado:=true; END;
  PERFORM pg_temp.galeria_check('SQL exige alternativo para foto '||i,rechazado);
 END LOOP;
 FOR i IN 1..8 LOOP
  ruta:=ruta_base||'/'||i||'.webp';
  INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('eva-publico',ruta,'{"mimetype":"image/webp","size":100}'::jsonb);
 END LOOP;
 PERFORM set_config('eva.gallery.storage_prefix',ruta_base,true);
 PERFORM pg_temp.galeria_check('Storage permite ocho referencias en la misma carpeta',(SELECT count(*)=8 FROM storage.objects WHERE bucket_id='eva-publico' AND name LIKE ruta_base||'/%'));
 SELECT updated_at INTO version FROM public.galeria_items WHERE id=id_actividad;
 resultado:=public.admin_cambiar_publicacion('galeria',id_actividad,'publicar',version);
 PERFORM pg_temp.galeria_check('master publica actividad de ocho',resultado->>'estado'='publicado');
END $$;
SET LOCAL ROLE anon;
SELECT pg_temp.galeria_check('público ve las ocho fotografías publicadas',
 (SELECT count(*)=8 FROM public.galeria_item_imagenes WHERE galeria_item_id=current_setting('eva.gallery.record')::bigint));
SET LOCAL ROLE authenticated;
DO $$
DECLARE actividad bigint:=current_setting('eva.gallery.record')::bigint; version timestamptz; resultado jsonb; rechazado boolean; n integer; foto bigint;
BEGIN
 PERFORM pg_temp.galeria_claims(current_setting('eva.gallery.editor')::uuid,current_setting('eva.gallery.editor_session')::uuid);
 PERFORM pg_temp.galeria_check('editor solo consulta estructura de Galería',private.permite_modulo('galeria',false) AND NOT private.permite_modulo('galeria',true) AND NOT private.es_admin_mfa());
 rechazado:=false;BEGIN INSERT INTO public.galeria_items(titulo,imagen_url,imagen_alt) VALUES('No permitido','imagenes-galeria/no.jpg','No permitido');EXCEPTION WHEN insufficient_privilege THEN rechazado:=true;END;
 PERFORM pg_temp.galeria_check('editor no crea actividades',rechazado);
 UPDATE public.galeria_items SET titulo='No permitido' WHERE id=actividad;GET DIAGNOSTICS n=ROW_COUNT;
 PERFORM pg_temp.galeria_check('editor no edita estructura',n=0);
 DELETE FROM public.galeria_items WHERE id=actividad;GET DIAGNOSTICS n=ROW_COUNT;
 PERFORM pg_temp.galeria_check('editor sin DELETE de actividad',n=0);
 rechazado:=false;BEGIN INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt) VALUES(actividad,1,'imagenes-galeria/no.jpg','No permitido');EXCEPTION WHEN insufficient_privilege THEN rechazado:=true;END;
 PERFORM pg_temp.galeria_check('editor no agrega imágenes',rechazado);
 UPDATE public.galeria_item_imagenes SET imagen_alt='No permitido' WHERE galeria_item_id=actividad;GET DIAGNOSTICS n=ROW_COUNT;
 PERFORM pg_temp.galeria_check('editor no cambia alternativos',n=0);
 DELETE FROM public.galeria_item_imagenes WHERE galeria_item_id=actividad;GET DIAGNOSTICS n=ROW_COUNT;
 PERFORM pg_temp.galeria_check('editor no retira imágenes',n=0);
 rechazado:=false;BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('eva-publico',current_setting('eva.gallery.storage_prefix')||'/editor.webp');EXCEPTION WHEN insufficient_privilege THEN rechazado:=true;END;
 PERFORM pg_temp.galeria_check('editor sin INSERT de Storage',rechazado);
 UPDATE storage.objects SET name=name||'.webp' WHERE bucket_id='eva-publico' AND name LIKE current_setting('eva.gallery.storage_prefix')||'/%';GET DIAGNOSTICS n=ROW_COUNT;
 PERFORM pg_temp.galeria_check('editor sin UPDATE de Storage',n=0);
 SELECT updated_at INTO version FROM public.galeria_items WHERE id=actividad;
 resultado:=public.admin_cambiar_publicacion('galeria',actividad,'archivar',version);
 PERFORM pg_temp.galeria_check('editor archiva y conserva ocho fotografías',resultado->>'estado'='archivado' AND (SELECT count(*)=8 FROM public.galeria_item_imagenes WHERE galeria_item_id=actividad));
 PERFORM pg_temp.galeria_check('archivar conserva los ocho objetos',(SELECT count(*)=8 FROM storage.objects WHERE bucket_id='eva-publico' AND name LIKE current_setting('eva.gallery.storage_prefix')||'/%'));
END $$;
SET LOCAL ROLE anon;
SELECT pg_temp.galeria_check('público no ve actividad ni fotos archivadas',
 NOT EXISTS(SELECT 1 FROM public.galeria_items WHERE id=current_setting('eva.gallery.record')::bigint)
 AND NOT EXISTS(SELECT 1 FROM public.galeria_item_imagenes WHERE galeria_item_id=current_setting('eva.gallery.record')::bigint));
SET LOCAL ROLE authenticated;
DO $$
DECLARE actividad bigint:=current_setting('eva.gallery.record')::bigint; version timestamptz; resultado jsonb;
BEGIN
 SELECT updated_at INTO version FROM public.galeria_items WHERE id=actividad;
 resultado:=public.admin_cambiar_publicacion('galeria',actividad,'publicar',version);
 PERFORM pg_temp.galeria_check('editor vuelve a publicar archivado y conserva ocho',resultado->>'estado'='publicado' AND (SELECT count(*)=8 FROM public.galeria_item_imagenes WHERE galeria_item_id=actividad));
END $$;
SET LOCAL ROLE anon;
SELECT pg_temp.galeria_check('las ocho fotos reaparecen públicamente',
 (SELECT count(*)=8 FROM public.galeria_item_imagenes WHERE galeria_item_id=current_setting('eva.gallery.record')::bigint));
SET LOCAL ROLE authenticated;
DO $$
DECLARE actividad bigint:=current_setting('eva.gallery.record')::bigint; version timestamptz; resultado jsonb;
BEGIN
 PERFORM pg_temp.galeria_claims(current_setting('eva.gallery.master')::uuid,current_setting('eva.gallery.master_session')::uuid);
 SELECT updated_at INTO version FROM public.galeria_items WHERE id=actividad;
 PERFORM public.admin_cambiar_publicacion('galeria',actividad,'archivar',version);
 SELECT updated_at INTO version FROM public.galeria_items WHERE id=actividad;
 resultado:=public.admin_cambiar_publicacion('galeria',actividad,'restaurar',version);
 PERFORM pg_temp.galeria_check('master restaura con las ocho referencias',resultado->>'estado'='publicado' AND (SELECT count(*)=8 FROM public.galeria_item_imagenes WHERE galeria_item_id=actividad));
 DELETE FROM public.galeria_items WHERE id=actividad;
 PERFORM pg_temp.galeria_check('master elimina definitivamente con cascada existente',NOT EXISTS(SELECT 1 FROM public.galeria_item_imagenes WHERE galeria_item_id=actividad));
 PERFORM pg_temp.galeria_check('eliminar referencias no introduce borrado físico de Storage',(SELECT count(*)=8 FROM storage.objects WHERE bucket_id='eva-publico' AND name LIKE current_setting('eva.gallery.storage_prefix')||'/%'));
END $$;
RESET ROLE;
SELECT pg_temp.galeria_check('auditoría conserva eventos publicar, archivar, restaurar y eliminar',
 (SELECT count(DISTINCT evento)=4 FROM private.auditoria_administrativa a CROSS JOIN LATERAL unnest(a.eventos)evento
 WHERE a.tabla='public.galeria_items' AND a.registro_clave=current_setting('eva.gallery.record')
 AND evento IN('publicado','archivado','restaurado','eliminado_definitivamente')));
SELECT pg_temp.galeria_check('auditoría identifica actor, rol y módulo',NOT EXISTS(
 SELECT 1 FROM private.auditoria_administrativa WHERE tabla='public.galeria_items' AND registro_clave=current_setting('eva.gallery.record')
 AND (actor_user_id IS NULL OR actor_rol IS NULL OR modulo<>'galeria')));
SELECT * FROM eva_galeria_resultados ORDER BY caso;
ROLLBACK;
