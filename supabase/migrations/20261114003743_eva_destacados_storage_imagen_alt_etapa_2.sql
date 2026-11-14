-- EVA 2.0 / Recursos y herramientas destacadas / Etapa 2
-- Proyecto institucional CREBE Ucayali
-- Ejecutada en Supabase: 20261114003743_eva_destacados_storage_imagen_alt_etapa_2
-- Alcance exclusivo: public.eva_recursos_destacados.
-- No modifica registros, políticas, visibilidad ni archivos.
-- Conserva el uso histórico de imágenes en GitHub institucional.
-- Para nuevas URL de Storage se limita a eva-publico/destacados/.

ALTER TABLE public.eva_recursos_destacados
  ADD COLUMN imagen_alt text NOT NULL DEFAULT '';

ALTER TABLE public.eva_recursos_destacados
  DROP CONSTRAINT eva_recursos_destacados_imagen_url_check;

ALTER TABLE public.eva_recursos_destacados
  ADD CONSTRAINT eva_recursos_destacados_imagen_url_check CHECK (
    char_length(imagen_url) <= 500
    AND (
      imagen_url = ''
      OR starts_with(imagen_url, 'https://crebeucayali.github.io/')
      OR (
        starts_with(
          imagen_url,
          'https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/destacados/'
        )
        AND substring(
          imagen_url FROM char_length(
            'https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/destacados/'
          ) + 1
        ) ~ '^[A-Za-z0-9_-]+\.(webp|jpe?g|png)$'
      )
    )
  );

ALTER TABLE public.eva_recursos_destacados
  ADD CONSTRAINT eva_recursos_destacados_imagen_alt_check CHECK (
    imagen_alt = ''
    OR (
      char_length(btrim(imagen_alt)) BETWEEN 8 AND 220
      AND char_length(imagen_alt) <= 220
    )
  );

-- Para nuevas imágenes de Storage, el texto alternativo es obligatorio.
-- Las históricas de GitHub pueden mantenerlo vacío temporalmente.
ALTER TABLE public.eva_recursos_destacados
  ADD CONSTRAINT eva_recursos_destacados_imagen_alt_storage_check CHECK (
    NOT starts_with(
      imagen_url,
      'https://dteimbhwtzghhsijeeld.supabase.co/storage/v1/object/public/eva-publico/destacados/'
    )
    OR char_length(btrim(imagen_alt)) BETWEEN 8 AND 220
  );

COMMENT ON COLUMN public.eva_recursos_destacados.imagen_alt
  IS 'Descripción textual accesible asociada a la imagen del recurso destacado. Para nuevas imágenes de Supabase Storage, entre 8 y 220 caracteres; las imágenes GitHub históricas pueden conservarse sin descripción hasta la adaptación administrativa.';

-- Verificación realizada después de aplicar:
-- * 3 constraints de imágenes vigentes y validados.
-- * 4 registros preexistentes conservados, sin cambios en firma MD5.
-- * 15/15 casos de URL y texto alternativo validados con SELECT de prueba.
-- Pendiente para etapa 3: formulario de carga con descripción accesible.
-- Pendiente para etapa 4: lector de imágenes de Storage en portada.
