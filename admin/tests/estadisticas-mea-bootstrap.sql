CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA public TO anon,authenticated;
CREATE OR REPLACE FUNCTION private.es_admin_mfa() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false;$$;
