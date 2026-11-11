-- Prueba exclusiva en PostgreSQL temporal. El evento Braille queda deshabilitado.
SET ROLE anon;
DO $$
DECLARE bloqueado boolean := false;
BEGIN
 BEGIN
  PERFORM public.registrar_accion_recurso_bda('c0000000-0000-4000-8000-000000000001','braille','impresion','impresion_iniciada');
 EXCEPTION WHEN OTHERS THEN bloqueado := true;
 END;
 IF NOT bloqueado THEN RAISE EXCEPTION 'El registro Braille sigue habilitado'; END IF;
END $$;
SELECT public.registrar_accion_recurso_bda('c0000000-0000-4000-8000-000000000002','lsp','png','descarga_solicitada');
RESET ROLE;
DO $$
DECLARE bda bigint; braille bigint; mea bigint;
BEGIN
 SELECT coalesce(sum(total),0) INTO bda FROM eva_recursos_api.bda_acciones_diarias WHERE herramienta='lsp';
 SELECT coalesce(sum(total),0) INTO braille FROM eva_recursos_api.bda_acciones_diarias WHERE herramienta='braille';
 SELECT coalesce(sum(total),0) INTO mea FROM eva_recursos_api.mea_acciones_diarias;
 IF bda <> 3 OR braille <> 0 OR mea <> 0 THEN
  RAISE EXCEPTION 'Regresión en contadores LSP %, Braille %, MEA %',bda,braille,mea;
 END IF;
END $$;
