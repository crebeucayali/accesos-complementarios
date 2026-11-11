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
