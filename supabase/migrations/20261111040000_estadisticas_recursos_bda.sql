-- Seguimiento agregado de solicitudes de descarga LSP en BDA.
-- Independiente de MEA y del contador de visitas de EVA.
BEGIN;
CREATE SCHEMA IF NOT EXISTS eva_recursos_api;

CREATE TABLE IF NOT EXISTS eva_recursos_api.bda_acciones_diarias (
 fecha date NOT NULL,
 herramienta text NOT NULL,
 formato text NOT NULL,
 accion text NOT NULL,
 total bigint NOT NULL DEFAULT 0 CHECK (total >= 0),
 PRIMARY KEY (fecha,herramienta,formato,accion)
);
CREATE TABLE IF NOT EXISTS eva_recursos_api.bda_eventos_recientes (
 evento_id uuid PRIMARY KEY,
 creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bda_eventos_recientes_fecha_idx
 ON eva_recursos_api.bda_eventos_recientes(creado_en);
REVOKE ALL ON eva_recursos_api.bda_acciones_diarias,eva_recursos_api.bda_eventos_recientes
 FROM PUBLIC,anon,authenticated;
ALTER TABLE eva_recursos_api.bda_acciones_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE eva_recursos_api.bda_eventos_recientes ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.registrar_accion_recurso_bda(
 p_evento_id uuid,p_herramienta text,p_formato text,p_accion text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$ SELECT eva_recursos_api.registrar_bda(p_evento_id,p_herramienta,p_formato,p_accion); $$;
REVOKE ALL ON FUNCTION public.registrar_accion_recurso_bda(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_accion_recurso_bda(uuid,text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION eva_recursos_api.consultar_bda(p_dias int)
RETURNS TABLE(fecha date,herramienta text,formato text,accion text,total bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF NOT private.es_admin_mfa() THEN
   RAISE EXCEPTION 'Se requiere master y MFA AAL2' USING errcode='42501';
 END IF;
 IF p_dias NOT IN (7,30,90,365) THEN RAISE EXCEPTION 'Periodo inválido'; END IF;
 RETURN QUERY
 SELECT d.fecha,d.herramienta,d.formato,d.accion,d.total
 FROM eva_recursos_api.bda_acciones_diarias d
 WHERE d.fecha >= (now() AT TIME ZONE 'America/Lima')::date-(p_dias-1)
 ORDER BY d.fecha DESC,d.herramienta,d.formato;
END;
$$;
REVOKE ALL ON FUNCTION eva_recursos_api.consultar_bda(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eva_recursos_api.consultar_bda(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_estadisticas_recursos_bda(p_dias int)
RETURNS TABLE(fecha date,herramienta text,formato text,accion text,total bigint)
LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$ SELECT * FROM eva_recursos_api.consultar_bda(p_dias); $$;
REVOKE ALL ON FUNCTION public.admin_estadisticas_recursos_bda(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_estadisticas_recursos_bda(int) TO authenticated;
COMMIT;
