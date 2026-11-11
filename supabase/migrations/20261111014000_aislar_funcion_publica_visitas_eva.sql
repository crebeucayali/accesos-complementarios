-- Cambio compatible: mantiene la firma pública del contador de hitos.
-- La función pública pasa a SECURITY INVOKER; la lógica privilegiada se
-- limita a una única función interna en un esquema NO expuesto en PostgREST.
-- No modifica ni reinicia estadísticas, tablas, permisos administrativos ni hitos.
BEGIN;
CREATE SCHEMA IF NOT EXISTS eva_counter_api;
REVOKE ALL ON SCHEMA eva_counter_api FROM PUBLIC;
GRANT USAGE ON SCHEMA eva_counter_api TO anon, authenticated;

CREATE OR REPLACE FUNCTION eva_counter_api.registrar_visita_eva_hito_interna(
  p_modulo text, p_nueva_sesion boolean, p_nuevo_modulo boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_total bigint; v_hito bigint := NULL;
BEGIN
  IF p_modulo IS NULL OR p_modulo NOT IN (
    'principal','capacitaciones','bda','mea','noti_inclusivos',
    'repositorio_accesible','dua_3','accesos_complementarios'
  ) THEN
    RAISE EXCEPTION 'Módulo EVA no permitido';
  END IF;
  IF NOT coalesce(p_nueva_sesion,false) AND NOT coalesce(p_nuevo_modulo,false) THEN
    RAISE EXCEPTION 'Evento EVA sin acción';
  END IF;
  IF coalesce(p_nueva_sesion,false) THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(20261030,1000);
  END IF;
  INSERT INTO public.eva_visitas_eventos(modulo,nueva_sesion,nuevo_modulo)
    VALUES (p_modulo,coalesce(p_nueva_sesion,false),coalesce(p_nuevo_modulo,false));
  IF coalesce(p_nueva_sesion,false) THEN
    SELECT coalesce(sum(visitas),0)::bigint INTO v_total
      FROM public.eva_visitas_diarias WHERE modulo='__eva__';
    IF v_total > 0 AND mod(v_total,1000)=0 THEN v_hito := v_total; END IF;
  END IF;
  RETURN jsonb_build_object('hito',v_hito);
END;
$$;
REVOKE ALL ON FUNCTION eva_counter_api.registrar_visita_eva_hito_interna(text,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eva_counter_api.registrar_visita_eva_hito_interna(text,boolean,boolean) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.registrar_visita_eva_hito(
  p_modulo text, p_nueva_sesion boolean, p_nuevo_modulo boolean
) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $$
  SELECT eva_counter_api.registrar_visita_eva_hito_interna(p_modulo,p_nueva_sesion,p_nuevo_modulo);
$$;
REVOKE ALL ON FUNCTION public.registrar_visita_eva_hito(text,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_visita_eva_hito(text,boolean,boolean) TO anon,authenticated;
COMMIT;
