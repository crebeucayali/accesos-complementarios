-- Integra Galería en el contador existente: solo su ruta canónica con ID estable.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.eva_compartidos_eventos
 DROP CONSTRAINT eva_compartidos_eventos_modulo_check,
 ADD CONSTRAINT eva_compartidos_eventos_modulo_check CHECK (modulo IN ('principal','capacitaciones','bda','mea','noti_inclusivos','repositorio_accesible','dua_3','accesos_complementarios','galeria')),
 DROP CONSTRAINT eva_compartidos_eventos_pagina_check,
 ADD CONSTRAINT eva_compartidos_eventos_pagina_check CHECK (((char_length(pagina) BETWEEN 1 AND 300 AND pagina LIKE '/%' AND position('?' in pagina)=0 AND position('#' in pagina)=0 AND position('://' in pagina)=0) AND modulo IN ('principal','capacitaciones','bda','mea','noti_inclusivos','repositorio_accesible','dua_3','accesos_complementarios')) OR (modulo='galeria' AND pagina ~ '^/accesos-complementarios/recursos/galeria[.]html#actividad-[1-9][0-9]{0,18}$'));
ALTER TABLE public.eva_compartidos_diarios
 DROP CONSTRAINT eva_compartidos_diarios_modulo_check,
 ADD CONSTRAINT eva_compartidos_diarios_modulo_check CHECK (modulo IN ('principal','capacitaciones','bda','mea','noti_inclusivos','repositorio_accesible','dua_3','accesos_complementarios','galeria')),
 DROP CONSTRAINT eva_compartidos_diarios_pagina_check,
 ADD CONSTRAINT eva_compartidos_diarios_pagina_check CHECK (((char_length(pagina) BETWEEN 1 AND 300 AND pagina LIKE '/%' AND position('?' in pagina)=0 AND position('#' in pagina)=0 AND position('://' in pagina)=0) AND modulo IN ('principal','capacitaciones','bda','mea','noti_inclusivos','repositorio_accesible','dua_3','accesos_complementarios')) OR (modulo='galeria' AND pagina ~ '^/accesos-complementarios/recursos/galeria[.]html#actividad-[1-9][0-9]{0,18}$'));
ALTER POLICY eva_compartidos_eventos_insert_publico ON public.eva_compartidos_eventos
 WITH CHECK (((char_length(pagina) BETWEEN 1 AND 300 AND pagina LIKE '/%' AND position('?' in pagina)=0 AND position('#' in pagina)=0 AND position('://' in pagina)=0) AND modulo IN ('principal','capacitaciones','bda','mea','noti_inclusivos','repositorio_accesible','dua_3','accesos_complementarios')) OR (modulo='galeria' AND pagina ~ '^/accesos-complementarios/recursos/galeria[.]html#actividad-[1-9][0-9]{0,18}$'));
CREATE OR REPLACE FUNCTION private.registrar_compartir_eva_evento()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_fecha date := (now() AT TIME ZONE 'America/Lima')::date;
BEGIN
 IF new.modulo='galeria' THEN
   IF new.pagina IS NULL OR new.pagina !~ '^/accesos-complementarios/recursos/galeria[.]html#actividad-[1-9][0-9]{0,18}$' THEN
     RAISE EXCEPTION 'Ruta EVA no permitida';
   END IF;
   IF NOT EXISTS (SELECT 1 FROM public.galeria_items i
     WHERE i.id::text=split_part(new.pagina,'#actividad-',2)
       AND i.visible AND i.publicacion_autorizada AND i.estado_publicacion='publicado') THEN
     RAISE EXCEPTION 'Actividad no disponible públicamente';
   END IF;
 ELSE
   IF new.modulo NOT IN ('principal','capacitaciones','bda','mea','noti_inclusivos','repositorio_accesible','dua_3','accesos_complementarios') OR new.modulo IS NULL THEN
     RAISE EXCEPTION 'Módulo EVA no permitido';
   END IF;
   IF char_length(coalesce(new.pagina,'')) NOT BETWEEN 1 AND 300
     OR new.pagina NOT LIKE '/%' OR position('?' IN new.pagina)>0
     OR position('#' IN new.pagina)>0 OR position('://' IN new.pagina)>0 THEN
     RAISE EXCEPTION 'Ruta EVA no permitida';
   END IF;
 END IF;
 INSERT INTO public.eva_compartidos_diarios(fecha,modulo,pagina,acciones,updated_at)
 VALUES(v_fecha,new.modulo,new.pagina,1,now())
 ON CONFLICT(fecha,modulo,pagina) DO UPDATE SET
   acciones=public.eva_compartidos_diarios.acciones+1,updated_at=now();
 RETURN NULL;
END;
$function$;
