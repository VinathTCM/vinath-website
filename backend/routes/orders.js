// routes/orders.js —— 订单：客户下单、查询，管理员查看与处理
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole, logAdminAction } = require('../middleware/auth');

const router = express.Router();

function findOrCreateCustomer(phone, name){
  let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if(!customer){
    const id = 'cust_' + Date.now();
    db.prepare('INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)').run(id, phone, name);
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  } else if(name && customer.name !== name){
    db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name, customer.id);
  }
  return customer;
}

function genOrderNo(){
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'VN' + ymd + Math.floor(1000 + Math.random()*9000);
}

function serializeOrder(o){
  return { ...o, items: JSON.parse(o.items), paymentVerified: !!o.payment_verified };
}

// ---- 客户下单：真正"接单"的入口，不需要登录，前端购物车结算页面调这个 ----
router.post('/orders', (req, res) => {
  const { phone, name, address, city, postcode, state, region, items, shipping, payMethod, paymentScreenshot, couponCode } = req.body;
  if(!phone || !name || !address || !items || !items.length){
    return res.status(400).json({ error: '姓名、手机号、地址、商品明细都是必填的' });
  }

  // 用事务包起来：库存校验+扣减+建订单，要么一起成功，要么一起失败，避免出现"扣了库存但订单没建成"这种半吊子状态
  const createOrder = db.transaction(() => {
    const customer = findOrCreateCustomer(phone, name);

    // 优惠码是否真实存在，服务端自己查一遍——不相信客户端传来的"这个码有效"这件事本身，
    // 价格折扣也是服务端自己算，不用客户端传来的任何金额数字，防止有人绕过前端直接调接口伪造折扣
    var couponValid = false;
    if(couponCode){
      const couponOwner = db.prepare('SELECT id FROM admins WHERE coupon_code = ?').get(couponCode);
      couponValid = !!couponOwner;
    }

    var validatedItems = [];
    for(const it of items){
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(it.productId);
      if(!product) throw { status: 400, message: `商品 ${it.productId} 不存在或已下架` };
      if(product.stock_qty < it.qty) throw { status: 409, message: `「${product.name}」库存不足，剩余 ${product.stock_qty} 件` };
      var regularPrice = it.isTrial && product.trial_price ? product.trial_price : product.price;
      var couponPrice = it.isTrial ? product.coupon_trial_price : product.coupon_price;
      var finalPrice = (couponValid && couponPrice != null) ? couponPrice : regularPrice;
      validatedItems.push({ name: product.name, qty: it.qty, price: finalPrice });
      db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?').run(it.qty, product.id);
    }

    const id = 'order_' + Date.now();
    const orderNo = genOrderNo();
    db.prepare(`
      INSERT INTO orders (id, order_no, customer_id, contact, recipient_name, address, city, postcode, state, region,
        items, shipping, pay_method, coupon_code, payment_screenshot, consent_given_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, orderNo, customer.id, phone, name, address, city||null, postcode||null, state||null, region||null,
      JSON.stringify(validatedItems), shipping||0, payMethod||null, couponValid ? couponCode : null, paymentScreenshot||null, new Date().toISOString());

    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  });

  try {
    const order = createOrder();
    res.status(201).json(serializeOrder(order));
  } catch(e){
    if(e.status) return res.status(e.status).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: '下单失败，请稍后重试' });
  }
});

// ---- 客户查询自己的订单：订单号 + 手机号核实身份，不需要账号系统 ----
router.get('/orders/lookup', (req, res) => {
  const { orderNo, phone } = req.query;
  if(!orderNo || !phone) return res.status(400).json({ error: '请提供订单编号和手机号' });
  const order = db.prepare('SELECT * FROM orders WHERE order_no = ? AND contact = ?').get(orderNo, phone);
  if(!order) return res.status(404).json({ error: '找不到匹配的订单，请确认订单编号和手机号是否正确' });
  res.json(serializeOrder(order));
});

// ---- 管理员查看/处理订单 ----
router.get('/admin/orders', authMiddleware, requireRole('SENIOR', 'FULFILLMENT'), (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(rows.map(serializeOrder));
});

router.put('/admin/orders/:id/status', authMiddleware, requireRole('SENIOR', 'FULFILLMENT'), (req, res) => {
  const { status } = req.body;
  if(![0,1,2,3].includes(status)) return res.status(400).json({ error: '状态值不对' });
  const ORDER_STATUS_LABELS = ['已提交','备货中','已发货','已送达'];
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if(result.changes === 0) return res.status(404).json({ error: '订单不存在' });
  logAdminAction(req, 'update', 'order_status', req.params.id, '状态改为：'+ORDER_STATUS_LABELS[status]);
  res.json({ ok: true });
});

router.put('/admin/orders/:id/verify-payment', authMiddleware, requireRole('SENIOR', 'FULFILLMENT'), (req, res) => {
  const result = db.prepare('UPDATE orders SET payment_verified = 1 WHERE id = ?').run(req.params.id);
  if(result.changes === 0) return res.status(404).json({ error: '订单不存在' });
  logAdminAction(req, 'update', 'order_payment', req.params.id, '确认已收到付款');
  res.json({ ok: true });
});

// ---- 付款方式：客户结算页面读取，管理员在内容管理里维护 ----
router.get('/payment-methods', (req, res) => {
  const rows = db.prepare('SELECT * FROM payment_methods WHERE active = 1').all();
  res.json(rows.map(m => ({ id: m.id, type: m.type, bankName: m.bank_name, accountName: m.account_name, accountNumber: m.account_number, qrImage: m.qr_image, customNote: m.custom_note })));
});

// 管理员看全部（含已停用的），客户端那个 /payment-methods 只给激活的
router.get('/admin/payment-methods', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const rows = db.prepare('SELECT * FROM payment_methods ORDER BY rowid DESC').all();
  res.json(rows.map(m => ({ id: m.id, type: m.type, bankName: m.bank_name, accountName: m.account_name, accountNumber: m.account_number, qrImage: m.qr_image, customNote: m.custom_note, active: !!m.active })));
});

router.post('/admin/payment-methods', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { type, bankName, accountName, accountNumber, qrImage, customNote } = req.body;
  if(type==='bank_transfer' && (!bankName || !accountName || !accountNumber)){
    return res.status(400).json({ error: '银行转账需要银行名称、账户名称、账户号码' });
  }
  if(type==='duitnow' && !qrImage){
    return res.status(400).json({ error: 'DuitNow 需要上传收款码图片' });
  }
  if(type==='other' && !qrImage && !(customNote||'').trim()){
    return res.status(400).json({ error: '至少需要填写说明文字，或者上传一张收款码/收款信息图片' });
  }
  const id = 'pm_' + Date.now();
  db.prepare('INSERT INTO payment_methods (id, type, bank_name, account_name, account_number, qr_image, custom_note) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, type, bankName||null, accountName||null, accountNumber||null, qrImage||null, customNote||null);
  res.status(201).json({ id });
});

router.put('/admin/payment-methods/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '付款方式不存在' });
  const b = req.body;
  db.prepare(`
    UPDATE payment_methods SET bank_name=?, account_name=?, account_number=?, qr_image=?, custom_note=?, active=? WHERE id=?
  `).run(
    b.bankName ?? existing.bank_name, b.accountName ?? existing.account_name,
    b.accountNumber ?? existing.account_number, b.qrImage ?? existing.qr_image,
    b.customNote ?? existing.custom_note,
    b.active!=null ? (b.active?1:0) : existing.active, req.params.id
  );
  res.json({ ok: true });
});

router.delete('/admin/payment-methods/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT type, bank_name FROM payment_methods WHERE id = ?').get(req.params.id);
  const result = db.prepare('DELETE FROM payment_methods WHERE id = ?').run(req.params.id);
  if(result.changes === 0) return res.status(404).json({ error: '付款方式不存在' });
  logAdminAction(req, 'delete', 'payment_method', req.params.id, existing ? (existing.bank_name||existing.type) : null);
  res.json({ ok: true });
});

module.exports = router;
