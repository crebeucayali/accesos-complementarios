-- Idempotent correction of the ARASAAC domain regular expression.
-- Previous SQL string escaping could reject valid source URLs.
alter table public.eva_recurso_dia_programacion drop constraint if exists eva_dia_etapa05_aprobacion_ck;
alter table public.eva_recurso_dia_programacion add constraint eva_dia_etapa05_aprobacion_ck check (
  estado not in ('programado','publicado') or (estado='programado' and (
  (tipo='arasaac' and fuente_url ~ '^https://(www[.])?arasaac[.]org(/|$)'
    and licencia='CC BY-NC-SA 4.0' and position('Sergio Palao' in atribucion)>0
    and position('ARASAAC' in atribucion)>0 and position('Gobierno de Aragón' in atribucion)>0
    and referencia_derechos='https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es')
  or (tipo='lsp' and fuente_url like 'https://crebeucayali.github.io/banco-digital-accesible/lsp/%'
    and imagen_lsp_url like 'https://crebeucayali.github.io/banco-digital-accesible/lsp/imagenes/%'
    and position('Ministerio de Educación del Perú' in atribucion)>0
    and length(btrim(referencia_derechos))>0))));
