const { config, db, requireStaff } = require('../lib/supabase');
const STATUSES = ['Recebido', 'Confirmado', 'Em preparação', 'Saiu para entrega', 'Pronto para levantamento', 'Entregue', 'Cancelado'];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!config(res)) return;
  try {
    const staff = await requireStaff(req);
    if (!staff) return res.status(401).json({ error: 'Acesso reservado aos funcionários autorizados.' });
    if (req.method === 'GET') {
      const rows = await db('orders?select=id,created_at,customer_name,phone,fulfillment,zone,address,store_name,items,subtotal,delivery_fee,total,notes,status&order=created_at.desc&limit=100');
      return res.status(200).json(rows);
    }
    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.includes(status)) return res.status(400).json({ error: 'Pedido ou estado inválido.' });
      const rows = await db(`orders?id=eq.${encodeURIComponent(id)}&select=id,status`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status, updated_at: new Date().toISOString() })
      });
      if (!rows.length) return res.status(404).json({ error: 'Pedido não encontrado.' });
      return res.status(200).json(rows[0]);
    }
    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar ou atualizar pedidos.' });
  }
};
