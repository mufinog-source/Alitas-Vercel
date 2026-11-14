const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

function config(res) {
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    res.status(500).json({ error: 'Servidor ainda não está configurado. Contacta a ALITA’S.' });
    return false;
  }
  return true;
}

async function db(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.message || data?.error || 'Erro na base de dados');
  return data;
}

async function rateLimitOrder(ipHash) {
  const result = await db('rpc/check_order_rate_limit', { method: 'POST', body: JSON.stringify({ p_ip_hash: ipHash }) });
  return result === true;
}

async function requireStaff(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  const admins = await db(`admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`);
  return admins.length ? user : null;
}

module.exports = { config, db, requireStaff, rateLimitOrder };
