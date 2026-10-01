-- Cierre de sesiones y estadísticas. No crea usuarios ni habilita invitaciones.
-- Compatible con PostgreSQL 17 y con los contratos actuales del panel.
CREATE OR REPLACE FUNCTION private.es_admin_autorizado()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_claims jsonb := (SELECT auth.jwt());
  v_session_id text := v_claims->>'session_id';
BEGIN
  -- No convierte entradas arbitrarias en errores de servidor.
  IF v_user_id IS NULL OR v_session_id IS NULL
    OR v_session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM admin_guard.admin_usuarios_autorizados a
    JOIN auth.users u ON u.id = a.user_id
    JOIN auth.sessions s ON s.user_id = u.id
    WHERE a.user_id = v_user_id
      AND a.activo
      AND u.email_confirmed_at IS NOT NULL
      AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= now())
      AND s.id = v_session_id::uuid
      AND (s.not_after IS NULL OR s.not_after > now())
      AND (coalesce(v_claims->>'aal', '') <> 'aal2' OR s.aal::text = 'aal2')
  );
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$function$;
REVOKE ALL ON FUNCTION private.es_admin_autorizado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.es_admin_autorizado() TO authenticated, service_role;
COMMENT ON FUNCTION private.es_admin_autorizado() IS
  'Autoriza por usuario activo, correo confirmado y sesión Auth existente, propia y vigente; rechaza bloqueos Auth. No registra claims.';

CREATE OR REPLACE FUNCTION private.estado_mfa_admin_actual()
 RETURNS TABLE(aal text, factor_id uuid, tiene_factor_verificado boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    coalesce((select auth.jwt()->>'aal'), '') as aal,
    (
      select f.id
      from auth.mfa_factors f
      where f.user_id = (select auth.uid())
        and f.factor_type = 'totp'
        and f.status = 'verified'
      order by f.created_at
      limit 1
    ) as factor_id,
    exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = (select auth.uid())
        and f.factor_type = 'totp'
        and f.status = 'verified'
    ) as tiene_factor_verificado
  where private.es_admin_autorizado();
$function$;

CREATE OR REPLACE FUNCTION private.limpiar_mfa_no_verificado_admin()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_total integer;
begin
  if not private.es_admin_autorizado() then
    raise exception 'Cuenta o sesión no autorizada' using errcode='42501';
  end if;

  delete from auth.mfa_factors
  where user_id = (select auth.uid())
    and factor_type = 'totp'
    and status = 'unverified';

  get diagnostics v_total = row_count;
  return v_total;
end;
$function$;
-- El público conserva únicamente total y hoy. La elevación reside en private.
CREATE FUNCTION private.contador_visitas_eva_publico()
RETURNS TABLE(total bigint, hoy bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT coalesce(sum(visitas),0)::bigint AS total,
    coalesce(sum(visitas) FILTER (
      WHERE fecha = (now() AT TIME ZONE 'America/Lima')::date
    ),0)::bigint AS hoy
  FROM public.eva_visitas_diarias
  WHERE modulo = '__eva__';
$function$;
REVOKE ALL ON FUNCTION private.contador_visitas_eva_publico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.contador_visitas_eva_publico() TO anon, authenticated, service_role;
COMMENT ON FUNCTION private.contador_visitas_eva_publico() IS
  'Agregado público fijo: solo total y hoy de EVA. Sin parámetros ni historial o desglose por módulos.';

-- BEGIN ATOMIC resuelve dependencias al crear la función.
-- Mantiene SECURITY INVOKER y no concede USAGE anónimo sobre private.
CREATE OR REPLACE FUNCTION public.contador_visitas_eva()
RETURNS TABLE(total bigint, hoy bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
BEGIN ATOMIC
  SELECT total, hoy FROM private.contador_visitas_eva_publico();
END;
REVOKE ALL ON FUNCTION public.contador_visitas_eva() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contador_visitas_eva() TO anon, authenticated, service_role;

DROP POLICY eva_visitas_diarias_lectura_publica ON public.eva_visitas_diarias;
CREATE POLICY eva_visitas_diarias_admin_lectura ON public.eva_visitas_diarias
  FOR SELECT TO authenticated
  USING ((SELECT private.es_admin_mfa()));
REVOKE SELECT ON public.eva_visitas_diarias FROM PUBLIC, anon;
GRANT SELECT ON public.eva_visitas_diarias TO authenticated;

CREATE OR REPLACE FUNCTION public.estadisticas_visitas_eva()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_inicio_mes date := date_trunc('month', v_hoy::timestamp)::date;
  v_resultado jsonb;
begin
  if not private.es_admin_mfa() then
    raise exception 'Se requiere master y AAL2' using errcode='42501';
  end if;

  select jsonb_build_object(
    'total', coalesce(sum(visitas) filter (where modulo='__eva__'),0),
    'hoy', coalesce(sum(visitas) filter (where modulo='__eva__' and fecha=v_hoy),0),
    'ultimos_7_dias', coalesce(sum(visitas) filter (
      where modulo='__eva__' and fecha between v_hoy - 6 and v_hoy
    ),0),
    'mes_actual', coalesce(sum(visitas) filter (
      where modulo='__eva__'
        and date_trunc('month',fecha::timestamp)=date_trunc('month',v_hoy::timestamp)
    ),0),
    'inicio_medicion', (
      select min(fecha)
      from public.eva_visitas_diarias
      where modulo='__eva__'
    ),
    'modulos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'modulo', x.modulo,
          'visitas', x.visitas
        )
        order by x.visitas desc, x.modulo
      )
      from (
        select modulo, sum(visitas)::bigint as visitas
        from public.eva_visitas_diarias
        where modulo <> '__eva__'
        group by modulo
      ) x
    ), '[]'::jsonb),
    'diario_30_dias', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'fecha', d.fecha,
          'visitas', coalesce(x.visitas,0)
        )
        order by d.fecha
      )
      from generate_series(v_hoy - 29, v_hoy, interval '1 day') as serie(fecha_ts)
      cross join lateral (
        select serie.fecha_ts::date as fecha
      ) d
      left join (
        select fecha, sum(visitas)::bigint as visitas
        from public.eva_visitas_diarias
        where modulo='__eva__'
          and fecha between v_hoy - 29 and v_hoy
        group by fecha
      ) x on x.fecha=d.fecha
    ), '[]'::jsonb),
    'mensual_6_meses', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'mes', m.mes,
          'visitas', coalesce(x.visitas,0)
        )
        order by m.mes
      )
      from (
        select generate_series(
          (v_inicio_mes - interval '5 months')::date,
          v_inicio_mes,
          interval '1 month'
        )::date as mes
      ) m
      left join (
        select date_trunc('month',fecha::timestamp)::date as mes,
               sum(visitas)::bigint as visitas
        from public.eva_visitas_diarias
        where modulo='__eva__'
          and fecha >= (v_inicio_mes - interval '5 months')::date
          and fecha <= v_hoy
        group by 1
      ) x on x.mes=m.mes
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.eva_visitas_diarias;

  return coalesce(v_resultado, jsonb_build_object(
    'total',0,
    'hoy',0,
    'ultimos_7_dias',0,
    'mes_actual',0,
    'inicio_medicion',null,
    'modulos','[]'::jsonb,
    'diario_30_dias','[]'::jsonb,
    'mensual_6_meses','[]'::jsonb
  ));
end;
$function$;

CREATE OR REPLACE FUNCTION public.estadisticas_visitas_eva_periodo(p_periodo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_periodo text := lower(btrim(coalesce(p_periodo,'30d')));
  v_desde date;
  v_inicio_medicion date;
  v_resultado jsonb;
begin
  if not private.es_admin_mfa() then
    raise exception 'Se requiere master y AAL2' using errcode='42501';
  end if;

  if v_periodo not in ('7d','30d','90d','historico') then
    raise exception 'Periodo estadístico no válido';
  end if;

  select min(fecha)
    into v_inicio_medicion
  from public.eva_visitas_diarias
  where modulo='__eva__';

  v_desde := case v_periodo
    when '7d' then v_hoy - 6
    when '30d' then v_hoy - 29
    when '90d' then v_hoy - 89
    else v_inicio_medicion
  end;

  select jsonb_build_object(
    'periodo', v_periodo,
    'fecha_desde', v_desde,
    'fecha_hasta', v_hoy,
    'sesiones', coalesce(sum(visitas) filter (
      where modulo='__eva__'
        and (v_desde is null or fecha >= v_desde)
        and fecha <= v_hoy
    ),0),
    'modulos', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'modulo', x.modulo,
          'visitas', x.visitas
        )
        order by x.visitas desc, x.modulo
      )
      from (
        select modulo, sum(visitas)::bigint as visitas
        from public.eva_visitas_diarias
        where modulo <> '__eva__'
          and (v_desde is null or fecha >= v_desde)
          and fecha <= v_hoy
        group by modulo
      ) x
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.eva_visitas_diarias;

  return coalesce(v_resultado, jsonb_build_object(
    'periodo',v_periodo,
    'fecha_desde',v_desde,
    'fecha_hasta',v_hoy,
    'sesiones',0,
    'modulos','[]'::jsonb
  ));
end;
$function$;

CREATE OR REPLACE FUNCTION public.estadisticas_compartidos_eva()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_resultado jsonb;
begin
  if not private.es_admin_mfa() then
    raise exception 'Se requiere master y AAL2' using errcode='42501';
  end if;

  select jsonb_build_object(
    'total', coalesce(sum(acciones),0),
    'hoy', coalesce(sum(acciones) filter (where fecha=v_hoy),0),
    'ultimos_7_dias', coalesce(sum(acciones) filter (where fecha between v_hoy - 6 and v_hoy),0),
    'mes_actual', coalesce(sum(acciones) filter (
      where date_trunc('month',fecha::timestamp)=date_trunc('month',v_hoy::timestamp)
    ),0),
    'inicio_medicion', (select min(fecha) from public.eva_compartidos_diarios),
    'modulos', coalesce((
      select jsonb_agg(
        jsonb_build_object('modulo',x.modulo,'acciones',x.acciones)
        order by x.acciones desc, x.modulo
      )
      from (
        select modulo, sum(acciones)::bigint as acciones
        from public.eva_compartidos_diarios
        group by modulo
      ) x
    ), '[]'::jsonb),
    'paginas_top', coalesce((
      select jsonb_agg(
        jsonb_build_object('pagina',x.pagina,'modulo',x.modulo,'acciones',x.acciones)
        order by x.acciones desc, x.pagina
      )
      from (
        select pagina, modulo, sum(acciones)::bigint as acciones
        from public.eva_compartidos_diarios
        group by pagina, modulo
        order by acciones desc, pagina
        limit 20
      ) x
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.eva_compartidos_diarios;

  return coalesce(v_resultado, jsonb_build_object(
    'total',0,'hoy',0,'ultimos_7_dias',0,'mes_actual',0,
    'inicio_medicion',null,'modulos','[]'::jsonb,'paginas_top','[]'::jsonb
  ));
end;
$function$;

CREATE OR REPLACE FUNCTION public.estadisticas_compartidos_eva_periodo(p_periodo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_hoy date := (now() at time zone 'America/Lima')::date;
  v_periodo text := lower(btrim(coalesce(p_periodo,'30d')));
  v_desde date;
  v_inicio_medicion date;
  v_resultado jsonb;
begin
  if not private.es_admin_mfa() then
    raise exception 'Se requiere master y AAL2' using errcode='42501';
  end if;

  if v_periodo not in ('7d','30d','90d','historico') then
    raise exception 'Periodo estadístico no válido';
  end if;

  select min(fecha) into v_inicio_medicion
  from public.eva_compartidos_diarios;

  v_desde := case v_periodo
    when '7d' then v_hoy - 6
    when '30d' then v_hoy - 29
    when '90d' then v_hoy - 89
    else v_inicio_medicion
  end;

  select jsonb_build_object(
    'periodo',v_periodo,
    'fecha_desde',v_desde,
    'fecha_hasta',v_hoy,
    'acciones',coalesce(sum(acciones) filter (
      where (v_desde is null or fecha >= v_desde) and fecha <= v_hoy
    ),0),
    'modulos',coalesce((
      select jsonb_agg(
        jsonb_build_object('modulo',x.modulo,'acciones',x.acciones)
        order by x.acciones desc, x.modulo
      )
      from (
        select modulo, sum(acciones)::bigint as acciones
        from public.eva_compartidos_diarios
        where (v_desde is null or fecha >= v_desde) and fecha <= v_hoy
        group by modulo
      ) x
    ), '[]'::jsonb),
    'paginas_top',coalesce((
      select jsonb_agg(
        jsonb_build_object('pagina',x.pagina,'modulo',x.modulo,'acciones',x.acciones)
        order by x.acciones desc, x.pagina
      )
      from (
        select pagina, modulo, sum(acciones)::bigint as acciones
        from public.eva_compartidos_diarios
        where (v_desde is null or fecha >= v_desde) and fecha <= v_hoy
        group by pagina, modulo
        order by acciones desc, pagina
        limit 20
      ) x
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.eva_compartidos_diarios;

  return coalesce(v_resultado, jsonb_build_object(
    'periodo',v_periodo,'fecha_desde',v_desde,'fecha_hasta',v_hoy,
    'acciones',0,'modulos','[]'::jsonb,'paginas_top','[]'::jsonb
  ));
end;
$function$;

CREATE OR REPLACE FUNCTION private.admin_autorizar_editor(p_email text, p_nombre text, p_modulos text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_email text:=lower(btrim(p_email)); v_actual admin_guard.admin_correos_autorizados;
begin
  if not private.es_admin_mfa() then raise exception 'Se requiere master y AAL2' using errcode='42501'; end if;
  raise exception 'Invitaciones pausadas: requieren completar la verificación final de Auth y correo y autorización expresa' using errcode='55000';
  perform private.validar_asignacion(p_nombre,'editor',p_modulos);
  if v_email is null or char_length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Correo no válido' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('eva-autorizacion:'||v_email,0));
  if exists(select 1 from admin_guard.admin_usuarios_autorizados where email=v_email) then
    raise exception 'La cuenta ya está autorizada; utiliza Editar' using errcode='22023'; end if;
  if exists(select 1 from auth.users where lower(email)=v_email) then
    raise exception 'El correo ya tiene una cuenta Auth; requiere revisión antes de autorizar' using errcode='22023'; end if;
  select * into v_actual from admin_guard.admin_correos_autorizados where email=v_email for update;
  if found then
    if not v_actual.activo or v_actual.autorizado_por is null or v_actual.rol<>'editor'
      or v_actual.nombre is distinct from btrim(p_nombre) or v_actual.modulos is distinct from p_modulos then
      raise exception 'La autorización existente es diferente; revisa sus datos antes de invitar' using errcode='22023'; end if;
  else
    insert into admin_guard.admin_correos_autorizados(email,nombre,rol,activo,modulos,autorizado_por,nota)
    values(v_email,btrim(p_nombre),'editor',true,p_modulos,(select auth.uid()),'Autorización desde cuenta master');
  end if;
  return jsonb_build_object('email',v_email,'rol','editor');
end $function$;

-- Las comprobaciones de master, rol y módulo existentes heredan la guardia.
-- No se alteran Auth settings, contenido, Storage ni tablas de usuarios.
