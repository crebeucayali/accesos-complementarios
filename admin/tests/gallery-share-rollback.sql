-- Pruebas reales con sesión master y registros sintéticos; ninguna cuenta nueva ni datos permanentes.
BEGIN;
CREATE TEMP TABLE eva_share_resultados(caso text,conforme boolean);
GRANT ALL ON eva_share_resultados TO authenticated,anon;
CREATE FUNCTION pg_temp.check_share(caso text,conforme boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF conforme IS DISTINCT FROM true THEN RAISE EXCEPTION 'Prueba fallida: %',caso; END IF;
INSERT INTO eva_share_resultados VALUES(caso,true); END $$;
DO $$ DECLARE m uuid; s uuid:=gen_random_uuid(); BEGIN
 SELECT user_id INTO STRICT m FROM admin_guard.admin_usuarios_autorizados WHERE rol='master' AND activo;
 INSERT INTO auth.sessions(id,user_id,aal,created_at,updated_at) VALUES(s,m,'aal2',now(),now());
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',m,'session_id',s,'role','authenticated','aal','aal2')::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE n int; i bigint; ids bigint[]:=ARRAY[]::bigint[]; BEGIN
 FOR n IN SELECT unnest(ARRAY[1,5,8]) LOOP
  INSERT INTO public.galeria_items(fecha,titulo,imagen_url,imagen_alt,visible,estado_publicacion,publicacion_autorizada)
  VALUES('2026-09-15','COMPARTIR PRUEBA '||n,'imagenes-galeria/prueba.jpg','Prueba',true,'publicado',true) RETURNING id INTO i;
  INSERT INTO public.galeria_item_imagenes(galeria_item_id,orden,imagen_url,imagen_alt)
  SELECT i,x,'imagenes-galeria/prueba-'||x||'.jpg','Prueba '||x FROM generate_series(1,n) x;
  ids:=array_append(ids,i);
  PERFORM pg_temp.check_share('actividad con '||n||' fotografías',(SELECT count(*)=n FROM public.galeria_item_imagenes WHERE galeria_item_id=i));
 END LOOP;
 PERFORM set_config('eva.share.ids',to_jsonb(ids)::text,true);
 PERFORM pg_temp.check_share('IDs distintos en una misma fecha',cardinality(ids)=3 AND ids[1]<>ids[2] AND ids[2]<>ids[3]);
END $$;
SET LOCAL ROLE anon;
DO $$ DECLARE i bigint; ruta text; BEGIN
 FOR i IN SELECT value::bigint FROM jsonb_array_elements_text(current_setting('eva.share.ids')::jsonb) LOOP
  ruta:='/accesos-complementarios/recursos/galeria.html#actividad-'||i;
  PERFORM pg_temp.check_share('lectura pública '||i,EXISTS(SELECT 1 FROM public.galeria_items WHERE id=i));
  INSERT INTO public.eva_compartidos_eventos(modulo,pagina) VALUES('galeria',ruta);
 END LOOP;
END $$;
RESET ROLE;
DO $$ DECLARE i bigint; ruta text; BEGIN
 FOR i IN SELECT value::bigint FROM jsonb_array_elements_text(current_setting('eva.share.ids')::jsonb) LOOP
  ruta:='/accesos-complementarios/recursos/galeria.html#actividad-'||i;
  PERFORM pg_temp.check_share('un evento incrementa una acción '||i,(SELECT acciones=1 FROM public.eva_compartidos_diarios WHERE pagina=ruta AND modulo='galeria'));
 END LOOP;
 PERFORM pg_temp.check_share('eventos individuales no se almacenan',NOT EXISTS(SELECT 1 FROM public.eva_compartidos_eventos WHERE modulo='galeria'));
END $$;
UPDATE public.eva_compartidos_diarios SET acciones=100000 WHERE modulo='galeria' AND split_part(pagina,'#actividad-',2) IN (SELECT value FROM jsonb_array_elements_text(current_setting('eva.share.ids')::jsonb));
SET LOCAL ROLE authenticated;
DO $$ DECLARE resumen jsonb; i bigint:=(current_setting('eva.share.ids')::jsonb->>1)::bigint; BEGIN
 resumen:=public.estadisticas_compartidos_eva_periodo('7d');
 PERFORM pg_temp.check_share('Galería en distribución por módulo',EXISTS(SELECT 1 FROM jsonb_array_elements(resumen->'modulos') x WHERE x->>'modulo'='galeria' AND (x->>'acciones')::bigint>=3));
 PERFORM pg_temp.check_share('Galería en total', (resumen->>'acciones')::bigint>=3);
 PERFORM pg_temp.check_share('RPC incluye destinos individuales entre más compartidos',EXISTS(SELECT 1 FROM jsonb_array_elements(resumen->'paginas_top') x WHERE x->>'modulo'='galeria' AND x->>'pagina'='/accesos-complementarios/recursos/galeria.html#actividad-'||i));
END $$;
RESET ROLE;
UPDATE public.eva_compartidos_diarios SET acciones=1 WHERE modulo='galeria' AND split_part(pagina,'#actividad-',2) IN (SELECT value FROM jsonb_array_elements_text(current_setting('eva.share.ids')::jsonb));
SET LOCAL ROLE authenticated;
DO $$ DECLARE i bigint:=(current_setting('eva.share.ids')::jsonb->>1)::bigint; BEGIN
 UPDATE public.galeria_items SET estado_publicacion='archivado',visible=false WHERE id=i;
 PERFORM pg_temp.check_share('archivado conserva fotografías',(SELECT count(*)=5 FROM public.galeria_item_imagenes WHERE galeria_item_id=i));
 PERFORM pg_temp.check_share('archivado conserva registro master',EXISTS(SELECT 1 FROM public.galeria_items WHERE id=i));
END $$;
SET LOCAL ROLE anon;
DO $$ DECLARE i bigint:=(current_setting('eva.share.ids')::jsonb->>1)::bigint; ok boolean:=false; BEGIN
 PERFORM pg_temp.check_share('archivado desaparece públicamente',NOT EXISTS(SELECT 1 FROM public.galeria_items WHERE id=i));
 BEGIN INSERT INTO public.eva_compartidos_eventos(modulo,pagina) VALUES('galeria','/accesos-complementarios/recursos/galeria.html#actividad-'||i); EXCEPTION WHEN raise_exception THEN ok:=true; END;
 PERFORM pg_temp.check_share('enlace archivado no admite registro',ok);
END $$;
SET LOCAL ROLE authenticated;
UPDATE public.galeria_items SET estado_publicacion='publicado',visible=true WHERE id=(current_setting('eva.share.ids')::jsonb->>1)::bigint;
SET LOCAL ROLE anon;
DO $$ DECLARE i bigint:=(current_setting('eva.share.ids')::jsonb->>1)::bigint; BEGIN
 PERFORM pg_temp.check_share('restauración conserva ID y reaparece',EXISTS(SELECT 1 FROM public.galeria_items WHERE id=i));
 INSERT INTO public.eva_compartidos_eventos(modulo,pagina) VALUES('galeria','/accesos-complementarios/recursos/galeria.html#actividad-'||i);
END $$;
RESET ROLE;
SELECT pg_temp.check_share('URL restaurada conserva contador', (SELECT acciones=2 FROM public.eva_compartidos_diarios WHERE modulo='galeria' AND pagina='/accesos-complementarios/recursos/galeria.html#actividad-'||(current_setting('eva.share.ids')::jsonb->>1)));
SET LOCAL ROLE anon;
DO $$ DECLARE ruta text; ok boolean; BEGIN
 FOREACH ruta IN ARRAY ARRAY['/accesos-complementarios/recursos/galeria.html','/accesos-complementarios/recursos/galeria.html#actividad-0','/accesos-complementarios/recursos/galeria.html#actividad-9999999999999999999','/otra#actividad-123','/accesos-complementarios/recursos/galeria.html?actividad=1','/accesos-complementarios/recursos/galeria.html#actividad-1?token=privado'] LOOP
  ok:=false;BEGIN INSERT INTO public.eva_compartidos_eventos(modulo,pagina) VALUES('galeria',ruta);EXCEPTION WHEN OTHERS THEN ok:=true;END;
  PERFORM pg_temp.check_share('rechaza ruta no autorizada: '||ruta,ok);
 END LOOP;
 INSERT INTO public.eva_compartidos_eventos(modulo,pagina) VALUES('capacitaciones','/capacitaciones/_prueba_compartir');
END $$;
RESET ROLE;
SELECT pg_temp.check_share('otros módulos siguen registrando',(SELECT acciones=1 FROM public.eva_compartidos_diarios WHERE modulo='capacitaciones' AND pagina='/capacitaciones/_prueba_compartir'));
SELECT * FROM eva_share_resultados;
ROLLBACK;
