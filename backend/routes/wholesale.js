// routes/wholesale.js —— 拿货订单：I类执业医师向总部申请拿货，走库存扣减但不涉及客户身份
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

function serializeWholesaleOrder(o){
  return { ...o, items: JSON.parse(o.items), total: (Number(o.subtotal)||0) + (Number(o.shipping)||0) };
}
function genWholesaleOrderNo(){
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'WO' + ymd + Math.floor(1000 + Math.random()*9000);
}

// [stated] 拿货是医师自己找总部申请库存，价格用商品的"拿货价"这一档——跟客户下单一样，
// 服务端自己去查这个价格，不采信客户端传来的任何金额，同一套安全考虑
router.post('/admin/wholesale-orders', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const { items, address, region, payMethod } = req.body;
  if(!address || !items || !items.length){
    return res.status(400).json({ error: '地址和商品明细都是必填的' });
  }
  const createOrder = db.transaction(() => {
    var subtotal = 0;
    var validatedItems = [];
    for(const it of items){
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(it.productId);
      if(!product) throw { status: 400, message: `商品 ${it.productId} 不存在或已下架` };
      if(!product.wholesale_price) throw { status: 400, message: `「${product.name}」没有设置拿货价，无法拿货` };
      if(product.stock_qty < it.qty) throw { status: 409, message: `「${product.name}」库存不足，剩余 ${product.stock_qty} 件` };
      validatedItems.push({ productId: it.productId, name: product.name, qty: it.qty, price: product.wholesale_price });
      subtotal += product.wholesale_price * it.qty;
      db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?').run(it.qty, product.id);
    }
    const id = 'wo_' + Date.now();
    const orderNo = genWholesaleOrderNo();
    db.prepare(`
      INSERT INTO wholesale_orders (id, order_no, ordered_by_id, ordered_by_name, address, items, subtotal, region, shipping, pay_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, orderNo, req.admin.sub, req.admin.name, address, JSON.stringify(validatedItems), subtotal, region||'west', req.body.shipping||0, payMethod||null);
    return db.prepare('SELECT * FROM wholesale_orders WHERE id = ?').get(id);
  });

  try {
    const order = createOrder();
    res.status(201).json(serializeWholesaleOrder(order));
  } catch(e){
    if(e.status) return res.status(e.status).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: '提交失败，请稍后重试' });
  }
});

// SENIOR看全部；PRACTITIONER只看自己申请的；FULFILLMENT(II类打包出货员)看全部，因为要负责发货
router.get('/admin/wholesale-orders', authMiddleware, requireRole('SENIOR', 'PRACTITIONER', 'FULFILLMENT'), (req, res) => {
  let rows;
  if(req.admin.role === 'PRACTITIONER'){
    rows = db.prepare('SELECT * FROM wholesale_orders WHERE ordered_by_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').all(req.admin.sub);
  } else {
    rows = db.prepare('SELECT * FROM wholesale_orders WHERE deleted_at IS NULL ORDER BY created_at DESC').all();
  }
  res.json(rows.map(serializeWholesaleOrder));
});

router.put('/admin/wholesale-orders/:id/status', authMiddleware, requireRole('SENIOR', 'FULFILLMENT'), (req, res) => {
  const { status } = req.body;
  if(![0,1,2,3].includes(status)) return res.status(400).json({ error: '状态值不对' });
  const result = db.prepare('UPDATE wholesale_orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if(result.changes === 0) return res.status(404).json({ error: '订单不存在' });
  res.json({ ok: true });
});

// 软删除拿货订单（移入回收箱，30天内可恢复）——删除时回退拿货库存
function restoreWholesaleStock(orderId){
  try {
    const row = db.prepare('SELECT items FROM wholesale_orders WHERE id = ?').get(orderId);
    if(!row) return;
    const items = JSON.parse(row.items);
    for(const it of items){
      if(it.productId && it.qty){
        db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?').run(it.qty, it.productId);
      }
    }
  } catch(e){ console.error('回退拿货库存失败:', e); }
}
function deductWholesaleStock(orderId){
  try {
    const row = db.prepare('SELECT items FROM wholesale_orders WHERE id = ?').get(orderId);
    if(!row) return;
    const items = JSON.parse(row.items);
    for(const it of items){
      if(it.productId && it.qty){
        db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?').run(it.qty, it.productId);
      }
    }
  } catch(e){ console.error('恢复拿货库存扣减失败:', e); }
}

router.delete('/admin/wholesale-orders/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM wholesale_orders WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '拿货订单不存在' });
  if(row.deleted_at) return res.status(400).json({ error: '该拿货订单已在回收箱中' });
  db.prepare('UPDATE wholesale_orders SET deleted_at = ?, deleted_by = ? WHERE id = ?').run(
    new Date().toISOString(), req.admin.name, req.params.id
  );
  restoreWholesaleStock(req.params.id);
  res.json({ ok: true });
});

// 拿货订单回收箱列表（已删除且30天内）
router.get('/admin/wholesale-orders/trash', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const rows = db.prepare('SELECT * FROM wholesale_orders WHERE deleted_at IS NOT NULL AND deleted_at >= ? ORDER BY deleted_at DESC').all(cutoff);
  res.json(rows.map(serializeWholesaleOrder));
});

// 恢复拿货订单（从回收箱）
router.post('/admin/wholesale-orders/:id/restore', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM wholesale_orders WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '拿货订单不存在' });
  if(!row.deleted_at) return res.status(400).json({ error: '该拿货订单不在回收箱中' });
  db.prepare('UPDATE wholesale_orders SET deleted_at = NULL, deleted_by = NULL WHERE id = ?').run(req.params.id);
  deductWholesaleStock(req.params.id);
  res.json({ ok: true });
});

// 永久删除拿货订单（回收箱里彻底删除）
router.delete('/admin/wholesale-orders/:id/permanent', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM wholesale_orders WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '拿货订单不存在' });
  if(!row.deleted_at){
    restoreWholesaleStock(req.params.id);
  }
  db.prepare('DELETE FROM wholesale_orders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
