const { config, db, rateLimitOrder } = require('../lib/supabase');
const { PRODUCTS, STORES, ZONES } = require('../lib/catalog');
const crypto = require('crypto');

async function notifyWhatsApp(order) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = process.env.WHATSAPP_STAFF_NUMBER;
  const template = process.env.WHATSAPP_TEMPLATE_NAME || 'alitas_new_order';
  if (!token || !phoneId || !recipient) return false;
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: recipient, type: 'template',
        template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_PT' },
          components: [{ type: 'body', parameters: [
            { type: 'text', text: String(order.id).slice(0, 8) },
            { type: 'text', text: order.customer_name },
            { type: 'text', text: String(order.total) }
          ] }] } })
    });
    if (!response.ok) console.error('WhatsApp API returned:', response.status);
    return response.ok;
  } catch (error) { console.error('WhatsApp notification failed:', error.message); return false; }
}

function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function validPhone(phone) { return /^\+?[0-9][0-9 ()-]{7,19}$/.test(phone); }
function setSecurity(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

module.exports = async (req, res) => {
  setSecurity(res);
  if (!config(res)) return;
  if (req.method === 'POST') {
    try {
      // Rate limit: no máximo 5 pedidos por IP em 10 minutos. O IP é guardado apenas como hash.
      const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
      const ipHash = crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY).update(ip).digest('hex');
      if (!(await rateLimitOrder(ipHash))) return res.status(429).json({ error: 'Recebeste muitos pedidos em pouco tempo. Aguarda alguns minutos e tenta novamente.' });

      const b = req.body || {};
      const customer_name = text(b.customer_name, 80);
      const phone = text(b.phone, 24);
      const store_id = text(b.store_id, 30);
      if (!customer_name || customer_name.length < 2 || !validPhone(phone) || !Array.isArray(b.items) || !b.items.length || b.items.length > 20 || !STORES[store_id]) {
        return res.status(400).json({ error: 'Confere o nome, telefone, loja e produtos do pedido.' });
      }
      if (!['Delivery', 'Levantamento na loja'].includes(b.fulfillment)) return res.status(400).json({ error: 'Método de recebimento inválido.' });
      const address = text(b.address, 300);
      if (b.fulfillment === 'Delivery' && address.length < 5) return res.status(400).json({ error: 'Indica um endereço de entrega válido.' });
      const zoneKey = text(b.zone_id || b.zone, 40).toLowerCase();
      if (b.fulfillment === 'Delivery' && zoneKey && !ZONES[zoneKey] && !Object.values(ZONES).some(z => z.name.toLowerCase() === zoneKey.toLowerCase())) {
        return res.status(400).json({ error: 'Zona de entrega inválida.' });
      }
      const zoneEntry = ZONES[zoneKey] || Object.values(ZONES).find(z => z.name.toLowerCase() === zoneKey.toLowerCase());
      if (b.fulfillment === 'Delivery' && zoneEntry && zoneEntry.store !== store_id) return res.status(400).json({ error: 'A loja seleccionada não corresponde à zona de entrega.' });

      // Preços e nomes vêm sempre do catálogo do servidor; nunca confiar nos valores enviados pelo browser.
      const items = [];
      for (const item of b.items) {
        const product = PRODUCTS[String(item.id || '')];
        const quantity = Number(item.quantity);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ error: 'Um dos produtos ou quantidades é inválido.' });
        const existing = items.find(x => x.id === String(item.id));
        if (existing) existing.quantity += quantity;
        else items.push({ id: String(item.id), name: product.name, quantity, unit_price: product.price });
      }
      if (items.some(x => x.quantity > 20)) return res.status(400).json({ error: 'Quantidade máxima por produto: 20.' });
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      // Taxas de entrega ainda não foram confirmadas pela ALITA'S; nunca aceitar taxa enviada pelo cliente.
      const delivery_fee = b.fulfillment === 'Delivery' ? null : 0;
      const total = subtotal + (delivery_fee || 0);
      const tracking_token = crypto.randomBytes(32).toString('hex');
      const row = {
        tracking_token, customer_name, phone, fulfillment: b.fulfillment,
        zone: zoneEntry?.name || text(b.zone, 80), address,
        coordinates: text(b.coordinates, 80), store_id, store_name: STORES[store_id],
        items, subtotal, delivery_fee, total, notes: text(b.notes, 500), status: 'Recebido'
      };
      const inserted = await db('orders?select=id,created_at', {
        method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row)
      });
      const order = { ...row, ...inserted[0] };
      const whatsapp = await notifyWhatsApp(order);
      return res.status(201).json({ id: order.id, tracking_token, status: order.status, whatsapp_notified: whatsapp });
    } catch (error) {
      console.error('Order creation failed:', error.message);
      return res.status(500).json({ error: 'Não foi possível registar o pedido. Tenta novamente.' });
    }
  }
  if (req.method === 'GET') {
    try {
      const id = String(req.query.id || '');
      const token = String(req.query.token || '');
      if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f]{64}$/i.test(token)) return res.status(400).json({ error: 'Link de acompanhamento inválido.' });
      const rows = await db(`orders?id=eq.${encodeURIComponent(id)}&tracking_token=eq.${encodeURIComponent(token)}&select=id,created_at,status,store_name,items,subtotal,delivery_fee,total,fulfillment,zone`);
      if (!rows.length) return res.status(404).json({ error: 'Pedido não encontrado.' });
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error('Order lookup failed:', error.message);
      return res.status(500).json({ error: 'Não foi possível consultar o pedido.' });
    }
  }
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Método não permitido.' });
};
