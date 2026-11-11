-- Validación en PostgreSQL TEMPORAL, sin tocar métricas de producción.
DO $$
BEGIN
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.registrar_accion_recurso_bda(uuid,text,text,text)'::regprocedure)
 THEN RAISE EXCEPTION 'La RPC pública no debe usar SECURITY DEFINER'; END IF;
 IF NOT has_function_privilege('anon','public.registrar_accion_recurso_bda(uuid,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Registro anónimo no disponible'; END IF;
 IF has_table_privilege('anon','eva_recursos_api.bda_acciones_diarias','SELECT') OR
 has_table_privilege('authenticated','eva_recursos_api.bda_acciones_diarias','SELECT')
 THEN RAISE EXCEPTION 'Tabla agregada expuesta'; END IF;
 IF has_function_privilege('anon','public.admin_estadisticas_recursos_bda(integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Consulta administrativa expuesta'; END IF;
END $$;
SET ROLE anon;
SELECT public.registrar_accion_recurso_bda('b0000000-0000-4000-8000-000000000001','lsp','png','descarga_solicitada');
SELECT public.registrar_accion_recurso_bda('b0000000-0000-4000-8000-000000000001','lsp','png','descarga_solicitada');
SELECT public.registrar_accion_recurso_bda('b0000000-0000-4000-8000-000000000002','lsp','png','descarga_solicitada');
DO $$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN PERFORM public.registrar_accion_recurso_bda('b0000000-0000-4000-8000-000000000003','lsp','pdf','descarga_solicitada');
 EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Formato fuera de inventario permitido'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE bda_total bigint; eventos int; mea_total bigint;
BEGIN
 SELECT coalesce(sum(total),0) INTO bda_total FROM eva_recursos_api.bda_acciones_diarias;
 SELECT count(*) INTO eventos FROM eva_recursos_api.bda_eventos_recientes;
 SELECT coalesce(sum(total),0) INTO mea_total FROM eva_recursos_api.mea_acciones_diarias;
 IF bda_total<>2 OR eventos<>2 OR mea_total<>0 THEN
 RAISE EXCEPTION 'Conteo BDA o aislamiento MEA incorrecto: %, %, %',bda_total,eventos,mea_total;
 END IF;
 IF NOT EXISTS (
 SELECT 1 FROM eva_recursos_api.bda_acciones_diarias
 WHERE fecha=(now() AT TIME ZONE 'America/Lima')::date
 AND herramienta='lsp' AND formato='png' AND accion='descarga_solicitada' AND total=2
 ) THEN RAISE EXCEPTION 'Fecha Perú o agregación incorrecta'; END IF;
 RAISE NOTICE 'BDA temporal: 2 acciones, 2 UUID, duplicado ignorado, MEA sin cambios';
END $$;
SET ROLE authenticated;
DO $$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN PERFORM * FROM public.admin_estadisticas_recursos_bda(30);
 EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Consulta sin master MFA fue admitida'; END IF;
END $$;
RESET ROLE;
