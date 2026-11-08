-- Pruebas transaccionales de seguridad del recurso diario.
-- Ejecutar por rol postgres; todo se revierte al finalizar.
begin;
insert into public.eva_recurso_dia_programacion(
 fecha,tipo,arasaac_ids,titulo,descripcion,texto_alternativo,fuente_url,
 atribucion,licencia,derechos_verificados,referencia_derechos,revision_pedagogica,estado)
values ((now() at time zone 'America/Lima')::date,'arasaac',array[12345::bigint],
 'FICHA PRUEBA NO PUBLICAR','Descripcion prueba','Imagen prueba','https://arasaac.org',
 'Atribucion prueba','CC BY-NC-SA',true,'Referencia simulada',true,'programado');
insert into public.eva_recurso_dia_programacion(fecha,tipo,arasaac_ids,titulo,estado)
values ((now() at time zone 'America/Lima')::date + 1,'arasaac',array[12346::bigint],'Borrador prueba','borrador');
do $$
declare n integer;
begin
 select count(*) into n from public.eva_recurso_dia_publico;
 if n<>1 then raise exception 'Falla vista pública: %',n; end if;
 begin
  insert into public.eva_recurso_dia_programacion(fecha,tipo,arasaac_ids,titulo,descripcion,texto_alternativo,
     fuente_url,atribucion,licencia,derechos_verificados,referencia_derechos,revision_pedagogica,estado)
  values ((now() at time zone 'America/Lima')::date,'arasaac',array[12347::bigint],'Duplicado','Descripcion',
   'Alt','https://arasaac.org','Creditos','CC',true,'Ref',true,'programado');
  raise exception 'Duplicado permitido: error';
 exception when unique_violation then null; end;
 begin
  insert into public.eva_recurso_dia_programacion(fecha,tipo,arasaac_ids,titulo,descripcion,texto_alternativo,
    fuente_url,atribucion,licencia,derechos_verificados,referencia_derechos,revision_pedagogica,estado)
  values ('2080-01-01','arasaac',array[12347::bigint],'Sin validar','descripcion','alt',
    'https://arasaac.org','crédito','CC',false,'',true,'programado');
  raise exception 'Derechos sin verificar permitidos: error';
 exception when check_violation then null; end;
end $$;
set local role anon;
do $$
declare n integer;
begin
 select count(*) into n from public.eva_recurso_dia_publico;
 if n<>1 then raise exception 'anon vista pública: %',n; end if;
 select count(*) into n from public.eva_recurso_dia_programacion;
 if n<>1 then raise exception 'anon lee futuros o borradores: %',n; end if;
 begin
  insert into public.eva_recurso_dia_programacion(fecha,tipo,arasaac_ids)
  values ('2080-01-03','arasaac',array[123::bigint]);
  raise exception 'Escritura anon permitida: error';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$
declare n integer;
begin
 select count(*) into n from public.eva_recurso_dia_programacion;
 if n<>0 then raise exception 'Autenticado sin MFA ve registros: %',n; end if;
 begin
  insert into public.eva_recurso_dia_programacion(fecha,tipo,arasaac_ids)
  values ('2080-01-04','arasaac',array[123::bigint]);
  raise exception 'Escritura sin MFA permitida: error';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
