-- Retirar solamente la autorización estadística de impresión Braille en BDA.
-- Preservar agregados históricos y registro PNG LSP.
BEGIN;
CREATE OR REPLACE FUNCTION eva_recursos_api.registrar_bda(
 p_evento_id uuid,p_herramienta text,p_formato text,p_accion text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_nuevo boolean;
BEGIN
 IF p_evento_id IS NULL THEN RAISE EXCEPTION 'Identificador requerido'; END IF;
 IF (p_herramienta,p_formato,p_accion) IS DISTINCT FROM
 ('lsp','png','descarga_solicitada') THEN
   RAISE EXCEPTION 'Combinación de recurso no autorizada';
 END IF;

 INSERT INTO eva_recursos_api.bda_eventos_recientes(evento_id)
 VALUES(p_evento_id) ON CONFLICT DO NOTHING RETURNING true INTO v_nuevo;
 IF NOT coalesce(v_nuevo,false) THEN RETURN false; END IF;

 INSERT INTO eva_recursos_api.bda_acciones_diarias(fecha,herramienta,formato,accion,total)
 VALUES((now() AT TIME ZONE 'America/Lima')::date,p_herramienta,p_formato,p_accion,1)
 ON CONFLICT(fecha,herramienta,formato,accion) DO UPDATE
 SET total=eva_recursos_api.bda_acciones_diarias.total+1;

 IF get_byte(pg_catalog.uuid_send(p_evento_id),0)%64=0 THEN
  DELETE FROM eva_recursos_api.bda_eventos_recientes
  WHERE creado_en < now()-interval '72 hours';
 END IF;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION eva_recursos_api.registrar_bda(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eva_recursos_api.registrar_bda(uuid,text,text,text) TO anon,authenticated;

COMMIT;
