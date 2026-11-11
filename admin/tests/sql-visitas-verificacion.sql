-- Verifica que el wrapper público no posea privilegios elevados y que anon
-- únicamente pueda ejecutar la entrada validada.
DO $$
BEGIN
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.registrar_visita_eva_hito(text,boolean,boolean)'::regprocedure) THEN
   RAISE EXCEPTION 'La función pública sigue siendo SECURITY DEFINER';
 END IF;
 IF NOT has_function_privilege('anon','public.registrar_visita_eva_hito(text,boolean,boolean)','EXECUTE') THEN
   RAISE EXCEPTION 'Se perdió el acceso público necesario';
 END IF;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='eva_counter_api' AND p.prosecdef) <> 1 THEN
   RAISE EXCEPTION 'Función interna incorrecta';
 END IF;
END $$;
SET ROLE anon;
SELECT public.registrar_visita_eva_hito('principal',true,true);
SELECT public.registrar_visita_eva_hito('bda',false,true);
RESET ROLE;
DO $$
DECLARE global_count bigint; main_count bigint; bda_count bigint;
BEGIN
 SELECT visitas INTO global_count FROM public.eva_visitas_diarias WHERE modulo='__eva__';
 SELECT visitas INTO main_count FROM public.eva_visitas_diarias WHERE modulo='principal';
 SELECT visitas INTO bda_count FROM public.eva_visitas_diarias WHERE modulo='bda';
 IF global_count<>1 OR main_count<>1 OR bda_count<>1 THEN
   RAISE EXCEPTION 'Agregación alterada: global=%, principal=%, BDA=%',global_count,main_count,bda_count;
 END IF;
END $$;

-- La función rechaza módulos inexistentes y eventos sin acción. Se ejecuta
-- la comprobación bajo el rol anónimo autorizado para el endpoint.
SET ROLE anon;
DO $$
DECLARE rechazado boolean := false;
BEGIN
 BEGIN
  PERFORM public.registrar_visita_eva_hito('modulo_no_permitido',true,true);
 EXCEPTION WHEN OTHERS THEN rechazado := true;
 END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Se admitió un módulo inválido'; END IF;
 rechazado := false;
 BEGIN
  PERFORM public.registrar_visita_eva_hito('principal',false,false);
 EXCEPTION WHEN OTHERS THEN rechazado := true;
 END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Se admitió un evento sin acción'; END IF;
END $$;
RESET ROLE;

-- Simular el hito sin alterar una base real: este contenedor será destruido.
UPDATE public.eva_visitas_diarias SET visitas=999 WHERE modulo='__eva__';
SET ROLE anon;
SELECT public.registrar_visita_eva_hito('principal',true,false) AS respuesta_hito;
RESET ROLE;
DO $$
DECLARE v_total bigint;
BEGIN
 SELECT visitas INTO v_total FROM public.eva_visitas_diarias WHERE modulo='__eva__';
 IF v_total <> 1000 THEN RAISE EXCEPTION 'Hito incorrecto: %',v_total; END IF;
END $$;
