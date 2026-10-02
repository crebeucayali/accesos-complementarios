-- Conserva la tabla, las referencias, los permisos y el máximo de 5 MB por archivo.
-- UNIQUE (galeria_item_id, orden) y el rango 1–8 permiten como máximo ocho imágenes.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.galeria_item_imagenes
  DROP CONSTRAINT galeria_item_imagenes_orden_check,
  ADD CONSTRAINT galeria_item_imagenes_orden_check CHECK (orden BETWEEN 1 AND 8);
