-- PostgreSQL TEMPORAL, después de la migración original y sus pruebas.
SET ROLE anon;
SELECT public.registrar_accion_recurso_bda('b0000000-0000-4000-8000-000000000011','braille','impresion','impresion_iniciada');
SELECT public.registrar_accion_recurso_bda('b0000000-0000-4000-8000-000000000011','braille','impresion','impresion_iniciada');
SELECT public.registrar_accion_recurso_bda('b0000000-0000-4000-8000-000000000012','lsp','png','descarga_solicitada');
DO $$
DECLARE error_esperado boolean:=false;
BEGIN
 BEGIN
  PERFORM public.registrar_accion_recurso_bda('b0000000-0000-4000-8000-000000000013','braille','pdf','descarga_solicitada');
 EXCEPTION WHEN OTHERS THEN error_esperado:=true; END;
 IF NOT error_esperado THEN RAISE EXCEPTION 'No se bloqueó intento de simular PDF descargado'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE lsp bigint; braille bigint; mea bigint; uuids int; fecha_peru date;
BEGIN
 fecha_peru:=(now() AT TIME ZONE 'America/Lima')::date;
 SELECT COALESCE(sum(total),0) INTO lsp FROM eva_recursos_api.bda_acciones_diarias WHERE herramienta='lsp';
 SELECT COALESCE(sum(total),0) INTO braille FROM eva_recursos_api.bda_acciones_diarias WHERE herramienta='braille';
 SELECT COALESCE(sum(total),0) INTO mea FROM eva_recursos_api.mea_acciones_diarias;
 SELECT COUNT(*) INTO uuids FROM eva_recursos_api.bda_eventos_recientes;
 IF lsp<>3 OR braille<>1 OR mea<>0 OR uuids<>4 THEN
  RAISE EXCEPTION 'Contadores esperados LSP=3, Braille=1, MEA=0, UUID=4: %, %, %, %',lsp,braille,mea,uuids;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM eva_recursos_api.bda_acciones_diarias
  WHERE fecha=fecha_peru AND herramienta='braille' AND formato='impresion'
  AND accion='impresion_iniciada' AND total=1) THEN
  RAISE EXCEPTION 'No se generó agregado Braille con fecha local Perú';
 END IF;
 RAISE NOTICE 'Contraste temporal correcto: LSP=3, Braille=1, MEA=0, cuatro UUID sin duplicados';
END $$;
