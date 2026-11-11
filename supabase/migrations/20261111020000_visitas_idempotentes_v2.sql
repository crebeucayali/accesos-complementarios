-- Idempotencia de eventos de contador, sin identidad del visitante.
-- Las solicitudes repetidas usan la misma UUID aleatoria y producen
-- exactamente un incremento durante la ventana temporal de retención.
BEGIN;
CREATE TABLE IF NOT EXISTS eva_counter_api.eva_operaciones_recientes (
  evento_id uuid PRIMARY KEY,
  resultado jsonb,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eva_operaciones_recientes_fecha_idx
 ON eva_counter_api.eva_operaciones_recientes(creado_en);
REVOKE ALL ON eva_counter_api.eva_operaciones_recientes FROM PUBLIC,anon,authenticated;
ALTER TABLE eva_counter_api.eva_operaciones_recientes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION eva_counter_api.registrar_visita_eva_hito_idempotente(
 p_evento_id uuid, p_modulo text, p_nueva_sesion boolean, p_nuevo_modulo boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_nueva boolean; v_total bigint; v_hito bigint := NULL; v_resultado jsonb;
BEGIN
 IF p_evento_id IS NULL THEN RAISE EXCEPTION 'Evento sin identificador'; END IF;
 IF p_modulo IS NULL OR p_modulo NOT IN
 ('principal','capacitaciones','bda','mea','noti_inclusivos','repositorio_accesible','dua_3','accesos_complementarios')
 THEN RAISE EXCEPTION 'Módulo EVA no permitido'; END IF;
 IF NOT coalesce(p_nueva_sesion,false) AND NOT coalesce(p_nuevo_modulo,false)
 THEN RAISE EXCEPTION 'Evento EVA sin acción'; END IF;
 -- La restricción UNIQUE serializa dos solicitudes con la misma UUID.
 INSERT INTO eva_counter_api.eva_operaciones_recientes(evento_id)
 VALUES(p_evento_id)
 ON CONFLICT (evento_id) DO NOTHING
 RETURNING true INTO v_nueva;
 IF NOT coalesce(v_nueva,false) THEN
  SELECT resultado INTO v_resultado
   FROM eva_counter_api.eva_operaciones_recientes
   WHERE evento_id=p_evento_id;
  RETURN v_resultado;
 END IF;
 IF coalesce(p_nueva_sesion,false) THEN
  PERFORM pg_catalog.pg_advisory_xact_lock(20261030,1000);
 END IF;
 INSERT INTO public.eva_visitas_eventos(modulo,nueva_sesion,nuevo_modulo)
 VALUES(p_modulo,coalesce(p_nueva_sesion,false),coalesce(p_nuevo_modulo,false));
 IF coalesce(p_nueva_sesion,false) THEN
  SELECT coalesce(sum(visitas),0)::bigint INTO v_total
  FROM public.eva_visitas_diarias WHERE modulo='__eva__';
  IF v_total>0 AND mod(v_total,1000)=0 THEN v_hito:=v_total; END IF;
 END IF;
 v_resultado:=jsonb_build_object('hito',v_hito);
 UPDATE eva_counter_api.eva_operaciones_recientes
 SET resultado=v_resultado WHERE evento_id=p_evento_id;
 -- Purgar con frecuencia baja para conservar sólo tokens temporales.
 -- El cliente reintenta durante un máximo de 24 h, inferior a 72 h.
 IF (get_byte(pg_catalog.uuid_send(p_evento_id),0) % 64)=0 THEN
  DELETE FROM eva_counter_api.eva_operaciones_recientes
  WHERE creado_en < now()-interval '72 hours';
 END IF;
 RETURN v_resultado;
END;
$$;
REVOKE ALL ON FUNCTION eva_counter_api.registrar_visita_eva_hito_idempotente(uuid,text,boolean,boolean)
 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eva_counter_api.registrar_visita_eva_hito_idempotente(uuid,text,boolean,boolean)
 TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.registrar_visita_eva_hito_v2(
 p_evento_id uuid, p_modulo text, p_nueva_sesion boolean, p_nuevo_modulo boolean
) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$
 SELECT eva_counter_api.registrar_visita_eva_hito_idempotente(
 p_evento_id,p_modulo,p_nueva_sesion,p_nuevo_modulo);
$$;
REVOKE ALL ON FUNCTION public.registrar_visita_eva_hito_v2(uuid,text,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_visita_eva_hito_v2(uuid,text,boolean,boolean) TO anon,authenticated;
COMMIT;
