-- EVA 2.0 - Recursos y herramientas destacadas - Etapa 1.
-- Migracion aplicada en Supabase el 2026-11-14, version 20261114003031.
-- Alcance: almacenamiento eva-publico/destacados/, solo INSERT y DELETE.
-- No se alteran otras carpetas ni politicas existentes.
-- Los reemplazos utilizaran un nombre nuevo (sin UPSERT).

CREATE POLICY eva_publico_destacados_master_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'eva-publico'
  AND name ~ '^destacados/[A-Za-z0-9_-]+\.(webp|jpe?g|png)$'
  AND (SELECT private.es_admin_mfa())
);

CREATE POLICY eva_publico_destacados_master_delete
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'eva-publico'
  AND name ~ '^destacados/[A-Za-z0-9_-]+\.(webp|jpe?g|png)$'
  AND (SELECT private.es_admin_mfa())
);

-- Reversion manual exclusiva de esta etapa (NO ejecutar de oficio):
-- DROP POLICY IF EXISTS eva_publico_destacados_master_insert ON storage.objects;
-- DROP POLICY IF EXISTS eva_publico_destacados_master_delete ON storage.objects;
