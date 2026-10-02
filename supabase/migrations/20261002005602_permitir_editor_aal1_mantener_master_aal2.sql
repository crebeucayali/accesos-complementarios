-- EVA · autenticación diferenciada por rol
-- Master: AAL2 obligatorio.
-- Editor/consulta: AAL1 o AAL2 para lectura de módulos asignados y flujo controlado de publicación/archivo.
-- p_escritura=true continúa reservado al master.

create or replace function private.permite_modulo(p_modulo text, p_escritura boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_modulo = any(array['capacitaciones','calendario','repositorio','noticias','galeria'])
    and private.es_admin_autorizado()
    and exists(
      select 1
      from admin_guard.admin_usuarios_autorizados a
      where a.user_id = (select auth.uid())
        and a.activo
        and (
          (
            a.rol = 'master'
            and coalesce((select auth.jwt()->>'aal'),'') = 'aal2'
          )
          or
          (
            not p_escritura
            and a.rol in ('editor','consulta')
            and p_modulo = any(a.modulos)
            and coalesce((select auth.jwt()->>'aal'),'') in ('aal1','aal2')
          )
        )
    );
$function$;

comment on function private.permite_modulo(text, boolean) is
'Autoriza módulos EVA: master requiere AAL2; editor/consulta pueden acceder a módulos asignados con AAL1 o AAL2. p_escritura=true queda reservado al master.';
