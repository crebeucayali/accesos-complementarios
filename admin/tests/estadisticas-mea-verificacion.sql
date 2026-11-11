DO $$
BEGIN
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.registrar_accion_recurso_mea(uuid,text,text,text)'::regprocedure)
 THEN RAISE EXCEPTION 'RPC pública con privilegios elevados'; END IF;
 IF NOT has_function_privilege('anon','public.registrar_accion_recurso_mea(uuid,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'RPC público inaccesible'; END IF;
 IF has_table_privilege('anon','eva_recursos_api.mea_acciones_diarias','SELECT')
 THEN RAISE EXCEPTION 'Tabla privada expuesta'; END IF;
END $$;
SET ROLE anon;
SELECT public.registrar_accion_recurso_mea('c11b3e6a-1c9e-4ae9-8faf-816667e8bc16','rutinas','pdf','exportacion_iniciada');
SELECT public.registrar_accion_recurso_mea('c11b3e6a-1c9e-4ae9-8faf-816667e8bc16','rutinas','pdf','exportacion_iniciada');
SELECT public.registrar_accion_recurso_mea('44444444-4444-4444-8444-444444444444','pictogramas','png','descarga_solicitada');
RESET ROLE;
DO $$
DECLARE n bigint; counts bigint;
BEGIN
 SELECT total INTO n FROM eva_recursos_api.mea_acciones_diarias WHERE herramienta='rutinas' AND formato='pdf';
 SELECT count(*) INTO counts FROM eva_recursos_api.mea_eventos_recientes;
 IF n<>1 OR counts<>2 THEN RAISE EXCEPTION 'Idempotencia incumplida % %',n,counts; END IF;
END $$;
SET ROLE anon;
DO $$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN PERFORM public.registrar_accion_recurso_mea('55555555-5555-4555-8555-555555555555','rutinas','txt','exportacion_iniciada');
 EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Formato no permitido'; END IF;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN PERFORM * FROM public.admin_estadisticas_recursos_mea(30);
 EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Se permitió consulta sin MFA'; END IF;
END $$;
RESET ROLE;

-- Etapa 2: contraste de siete acciones reales del código contra agregados
-- ÚNICAMENTE en PostgreSQL temporal de GitHub Actions.
SET ROLE anon;
SELECT public.registrar_accion_recurso_mea('10000000-0000-4000-8000-000000000003','rutinas','jpg','exportacion_iniciada');
SELECT public.registrar_accion_recurso_mea('10000000-0000-4000-8000-000000000004','braille','pdf','exportacion_iniciada');
SELECT public.registrar_accion_recurso_mea('10000000-0000-4000-8000-000000000005','dactilologia_lsp','pdf','exportacion_iniciada');
SELECT public.registrar_accion_recurso_mea('10000000-0000-4000-8000-000000000006','apoyos_lsp','pdf','exportacion_iniciada');
SELECT public.registrar_accion_recurso_mea('10000000-0000-4000-8000-000000000007','conciencia_fonologica','html','exportacion_iniciada');
-- Repetición de una de las siete acciones: debe devolver false y no incrementar.
SELECT public.registrar_accion_recurso_mea('10000000-0000-4000-8000-000000000007','conciencia_fonologica','html','exportacion_iniciada');
RESET ROLE;

DO $$
DECLARE v_total bigint; v_grupos int; v_eventos int; v_err int; v_fecha date;
BEGIN
 SELECT coalesce(sum(total),0),count(*) INTO v_total,v_grupos
 FROM eva_recursos_api.mea_acciones_diarias;
 SELECT count(*) INTO v_eventos FROM eva_recursos_api.mea_eventos_recientes;
 IF v_total<>7 OR v_grupos<>7 OR v_eventos<>7 THEN
 RAISE EXCEPTION 'Error de correspondencia: suma=%, grupos=%, UUID=%',v_total,v_grupos,v_eventos;
 END IF;
 SELECT count(*) INTO v_err FROM eva_recursos_api.mea_acciones_diarias
 WHERE total<>1 OR fecha<>(now() AT TIME ZONE 'America/Lima')::date
 OR (herramienta,formato,accion) NOT IN (
 ('pictogramas','png','descarga_solicitada'),
 ('rutinas','jpg','exportacion_iniciada'),
 ('rutinas','pdf','exportacion_iniciada'),
 ('braille','pdf','exportacion_iniciada'),
 ('dactilologia_lsp','pdf','exportacion_iniciada'),
 ('apoyos_lsp','pdf','exportacion_iniciada'),
 ('conciencia_fonologica','html','exportacion_iniciada'));
 IF v_err<>0 THEN RAISE EXCEPTION 'Inconsistencia de fecha o herramienta: %',v_err; END IF;
 RAISE NOTICE 'MEA validado en base TEMPORAL: 7 combinaciones, 7 acciones, 7 UUID, 1 solicitud repetida sin duplicado';
END $$;

SET ROLE anon;
DO $$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
 PERFORM * FROM public.admin_estadisticas_recursos_mea(30);
 EXCEPTION WHEN OTHERS THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Consulta administrativa accesible a anon'; END IF;
END $$;
RESET ROLE;
