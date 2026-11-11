-- Banco aislado de GitHub Actions, nunca Supabase de producción.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA public TO anon,authenticated;
CREATE TABLE public.eva_visitas_diarias(
 fecha date NOT NULL, modulo text NOT NULL, visitas bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (fecha,modulo)
);
CREATE TABLE public.eva_visitas_eventos(
 modulo text, nueva_sesion boolean, nuevo_modulo boolean
);
CREATE OR REPLACE FUNCTION private.registrar_visita_eva_evento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE hoy date := (now() AT TIME ZONE 'America/Lima')::date;
BEGIN
 IF NEW.nueva_sesion THEN
   INSERT INTO public.eva_visitas_diarias(fecha,modulo,visitas)
   VALUES(hoy,'__eva__',1) ON CONFLICT(fecha,modulo)
   DO UPDATE SET visitas=public.eva_visitas_diarias.visitas+1;
 END IF;
 IF NEW.nuevo_modulo THEN
   INSERT INTO public.eva_visitas_diarias(fecha,modulo,visitas)
   VALUES(hoy,NEW.modulo,1) ON CONFLICT(fecha,modulo)
   DO UPDATE SET visitas=public.eva_visitas_diarias.visitas+1;
 END IF;
 RETURN NULL;
END;
$$;
CREATE TRIGGER eva_visitas_eventos_registrar
BEFORE INSERT ON public.eva_visitas_eventos
FOR EACH ROW EXECUTE FUNCTION private.registrar_visita_eva_evento();
