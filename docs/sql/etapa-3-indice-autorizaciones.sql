-- Índice de la clave administrativa señalada por el asesor de rendimiento.
create index admin_correos_autorizado_por_idx on admin_guard.admin_correos_autorizados(autorizado_por);
