// Runtime Deno: claves disponibles solo en el entorno de Supabase.
// Sin dependencias externas. No acepta roles, redirecciones ni credenciales del cliente.
const ORIGIN = 'https://crebeucayali.github.io';
const REDIRECT = ORIGIN + '/accesos-complementarios/admin/';
const headers = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Vary: 'Origin'
};
function reply(status, message) { return new Response(JSON.stringify(message), {status, headers}); }

export async function handle(req, env = Deno.env, request = fetch) {
  if (req.headers.get('Origin') && req.headers.get('Origin') !== ORIGIN) return reply(403, {message:'Origen no permitido.'});
  if (req.method === 'OPTIONS') return new Response(null, {status:204, headers});
  if (req.method !== 'POST') return reply(405, {message:'Método no permitido.'});
  const bearer = req.headers.get('Authorization') || '';
  if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(bearer)) return reply(401, {message:'Se requiere una sesión válida.'});
  const url = env.get('SUPABASE_URL');
  const publicKey = env.get('SUPABASE_ANON_KEY');
  if (!url || !publicKey) return reply(503, {message:'Servicio no disponible.'});
  let payload;
  try {
    const text = await req.text();
    if (text.length > 4096) return reply(400, {message:'Solicitud demasiado grande.'});
    payload = JSON.parse(text);
    if (!payload || Object.keys(payload).some(key => !['email','nombre','modulos'].includes(key))
      || typeof payload.email !== 'string' || typeof payload.nombre !== 'string'
      || !Array.isArray(payload.modulos) || payload.modulos.some(x => typeof x !== 'string')) {
      return reply(400, {message:'Datos de autorización no válidos.'});
    }
  } catch { return reply(400, {message:'Solicitud no válida.'}); }
  const allowed = ['capacitaciones','calendario','repositorio','noticias','galeria'];
  payload.email = payload.email.trim().toLowerCase();
  payload.nombre = payload.nombre.trim();
  if (!payload.nombre || payload.nombre.length > 160 || payload.email.length > 254
    || !/^[^\s@]+@[^\s@]+[.][^\s@]+$/.test(payload.email)
    || !payload.modulos.length || payload.modulos.length > allowed.length
    || payload.modulos.some(modulo => !allowed.includes(modulo))
    || new Set(payload.modulos).size !== payload.modulos.length) {
    return reply(400, {message:'Revisa el nombre, correo y módulos del publicador.'});
  }
  try {
    // PostgREST verifica el JWT y la RPC exige auth.uid() master activo + AAL2.
    const permitted = await request(url + '/rest/v1/rpc/admin_autorizar_editor', {
      method:'POST', headers:{apikey:publicKey, Authorization:bearer, 'Content-Type':'application/json'},
      body:JSON.stringify({p_email:payload.email,p_nombre:payload.nombre,p_modulos:payload.modulos}),
      signal:AbortSignal.timeout(12000)
    });
    if (!permitted.ok) {
      const data = await permitted.json().catch(() => ({}));
      const forbidden = permitted.status === 401 || permitted.status === 403 || data.code === '42501';
      return reply(forbidden ? 403 : 400, {message: forbidden ? 'Se requiere la cuenta master con AAL2.' : (data.message || 'Revisa la autorización antes de invitar.')});
    }
    const authorized = await permitted.json();
    const serverKey = env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serverKey) return reply(503, {message:'La autorización quedó guardada, pero el servicio de invitaciones no está disponible.'});
    const invited = await request(url + '/auth/v1/invite?redirect_to=' + encodeURIComponent(REDIRECT), {
      method:'POST', headers:{apikey:serverKey,Authorization:'Bearer '+serverKey,'Content-Type':'application/json'},
      body:JSON.stringify({email:authorized.email}), signal:AbortSignal.timeout(12000)
    });
    if (!invited.ok) return reply(502, {message:'La autorización quedó guardada. No se pudo confirmar el envío de la invitación; revisa el correo configurado en Supabase y el estado del usuario antes de reintentar.'});
    return reply(200, {invitado:true,message:'Invitación enviada. La cuenta comienza como Publicador. Debe activar su contraseña y después ingresar con correo y contraseña, sin autenticador.'});
  } catch { return reply(503, {message:'No se pudo confirmar la operación. Recarga Usuarios para consultar su estado antes de reintentar.'}); }
}

if (typeof Deno !== 'undefined') Deno.serve(req => handle(req));
