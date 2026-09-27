# Storage institucional de imágenes EVA

## Etapa 1A — infraestructura base

Se preparó Supabase Storage para que, en una etapa posterior, el Panel Administrativo EVA pueda subir imágenes directamente sin pasar por GitHub.

### Bucket

- ID: `eva-publico`
- Acceso de lectura: público
- Tamaño máximo por archivo: 5 MB
- MIME permitidos:
  - `image/webp`
  - `image/jpeg`
  - `image/png`

### Carpetas funcionales admitidas

Las políticas de escritura solo permiten objetos bajo estos primeros segmentos:

- `noticias/`
- `capacitaciones/`
- `repositorio/`
- `galeria/`

Las carpetas son virtuales y aparecerán cuando el panel suba el primer archivo correspondiente.

### Seguridad de escritura

Las operaciones `INSERT`, `UPDATE` y `DELETE` sobre `storage.objects` para este bucket requieren:

1. sesión autenticada;
2. administrador autorizado;
3. MFA en nivel `aal2`;
4. ruta dentro de una de las carpetas funcionales admitidas.

La comprobación reutiliza `private.es_admin_mfa()`, la misma guardia del Panel Administrativo EVA.

La lectura pública se realiza mediante el bucket público; no se habilita escritura anónima.

### Alcance de esta etapa

Esta etapa **no modifica todavía el Panel Administrativo** y no migra imágenes existentes desde GitHub.

El siguiente paso controlado será integrar un único módulo piloto en el panel para validar el flujo:

`seleccionar imagen → vista previa → subir a Storage → guardar referencia → visualizar en EVA`.

No debe ampliarse a los demás módulos hasta validar ese circuito.
