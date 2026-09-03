// routes/products.js —— 商品与商店分类
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole, logAdminAction } = require('../middleware/auth');

const router = express.Router();

// 公开给客户端看的字段——绝不能包含成本价、批发价这些内部数据，
// 不然客户打开浏览器网络请求面板就能看到进货成本，这是真实的商业机密泄露风险
function serializePublicProduct(p){
  return {
    id:p.id, name:p.name, nameEn:p.name_en, type:p.type, price:p.price, trial_price:p.trial_price,
    couponPrice:p.coupon_price, couponPriceTrial:p.coupon_trial_price,
    stock_qty:p.stock_qty, active: !!p.active, featured: !!p.featured,
    description:p.description, usage_note:p.usage_note, herbs: JSON.parse(p.herbs||'[]'), form:p.form,
    tags: JSON.parse(p.tags||'[]'), journeys: JSON.parse(p.journeys||'[]'), images: JSON.parse(p.images||'[]')
  };
}
// 管理员能看到全部字段，包括成本价、批发价、优惠码价这些定价决策数据
function serializeAdminProduct(p){
  return { ...serializePublicProduct(p), cost:p.cost, costTrial:p.cost_trial,
    wholesalePrice:p.wholesale_price, wholesaleTrialPrice:p.wholesale_trial_price,
    couponPrice:p.coupon_price, couponTrialPrice:p.coupon_trial_price };
}

// ---- 公开接口：客户端商店/商品详情页调用，不需要登录 ----
router.get('/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC').all();
  res.json(rows.map(serializePublicProduct));
});

router.get('/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '商品不存在' });
  res.json(serializePublicProduct(row));
});

router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT * FROM shop_categories ORDER BY sort_order ASC').all();
  res.json(rows.map(c => ({ id: c.id, key: c.key, name: c.name, artUrl: c.art_url })));
});

// ---- 管理接口：需要大管理员登录，对应之前"商品管理"后台的功能 ----
router.get('/admin/products', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json(rows.map(serializeAdminProduct));
});

function productFieldsFromBody(b){
  return {
    name: b.name, name_en: b.nameEn||null, type: b.type, price: b.price, trial_price: b.trialPrice||null,
    cost: b.cost||null, cost_trial: b.costTrial||null,
    wholesale_price: b.wholesalePrice||null, wholesale_trial_price: b.wholesaleTrialPrice||null,
    coupon_price: b.couponPrice||null, coupon_trial_price: b.couponTrialPrice||null,
    stock_qty: b.stockQty||0, description: b.description||null, usage_note: b.usageNote||null,
    herbs: JSON.stringify(b.herbs||[]), form: b.form||null,
    tags: JSON.stringify(b.tags||[]), journeys: JSON.stringify(b.journeys||[]), images: JSON.stringify(b.images||[])
  };
}

router.post('/admin/products', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { name, type, price } = req.body;
  if(!name || !type || price==null){
    return res.status(400).json({ error: '商品名称、类型、价格是必填的' });
  }
  const f = productFieldsFromBody(req.body);
  const id = 'prod_' + Date.now();
  db.prepare(`
    INSERT INTO products (id, name, name_en, type, price, trial_price, cost, cost_trial,
      wholesale_price, wholesale_trial_price, coupon_price, coupon_trial_price,
      stock_qty, description, usage_note, herbs, form, tags, journeys, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, f.name, f.name_en, f.type, f.price, f.trial_price, f.cost, f.cost_trial,
    f.wholesale_price, f.wholesale_trial_price, f.coupon_price, f.coupon_trial_price,
    f.stock_qty, f.description, f.usage_note, f.herbs, f.form, f.tags, f.journeys, f.images);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json(serializeAdminProduct(row));
});

router.put('/admin/products/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '商品不存在' });
  const b = req.body;
  db.prepare(`
    UPDATE products SET name=?, name_en=?, type=?, price=?, trial_price=?, cost=?, cost_trial=?,
      wholesale_price=?, wholesale_trial_price=?, coupon_price=?, coupon_trial_price=?,
      stock_qty=?, active=?, featured=?, description=?, usage_note=?, herbs=?, form=?, tags=?, journeys=?, images=?,
      updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(
    b.name ?? existing.name, b.nameEn ?? existing.name_en, b.type ?? existing.type,
    b.price ?? existing.price, b.trialPrice ?? existing.trial_price,
    b.cost ?? existing.cost, b.costTrial ?? existing.cost_trial,
    b.wholesalePrice ?? existing.wholesale_price, b.wholesaleTrialPrice ?? existing.wholesale_trial_price,
    b.couponPrice ?? existing.coupon_price, b.couponTrialPrice ?? existing.coupon_trial_price,
    b.stockQty ?? existing.stock_qty,
    b.active!=null ? (b.active?1:0) : existing.active, b.featured!=null ? (b.featured?1:0) : existing.featured,
    b.description ?? existing.description, b.usageNote ?? existing.usage_note, b.herbs ? JSON.stringify(b.herbs) : existing.herbs,
    b.form ?? existing.form, b.tags ? JSON.stringify(b.tags) : existing.tags, b.journeys ? JSON.stringify(b.journeys) : existing.journeys,
    b.images ? JSON.stringify(b.images) : existing.images, req.params.id
  );
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  var priceChanged = b.price!=null && Number(b.price)!==existing.price;
  var costChanged = b.cost!=null && Number(b.cost)!==existing.cost;
  if(priceChanged || costChanged){
    var parts = [];
    if(priceChanged) parts.push('售价 RM'+existing.price+' → RM'+b.price);
    if(costChanged) parts.push('成本价 RM'+existing.cost+' → RM'+b.cost);
    logAdminAction(req, 'update', 'product_price', req.params.id, existing.name+'：'+parts.join('，'));
  }
  res.json(serializeAdminProduct(row));
});

// 商品不做真删除——已经被历史订单引用了的话，删掉会导致订单里的商品信息断链，改成下架（active=0）
router.delete('/admin/products/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT name FROM products WHERE id = ?').get(req.params.id);
  const result = db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  if(result.changes === 0) return res.status(404).json({ error: '商品不存在' });
  logAdminAction(req, 'delete', 'product', req.params.id, existing ? existing.name : null);
  res.json({ ok: true, note: '商品已下架（软删除，历史订单不受影响）' });
});

router.post('/admin/categories', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { key, name, artUrl } = req.body;
  if(!key || !name) return res.status(400).json({ error: 'key 和 name 是必填的' });
  const id = 'cat_' + Date.now();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM shop_categories').get().m || 0;
  db.prepare('INSERT INTO shop_categories (id, key, name, art_url, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(id, key, name, artUrl||null, maxOrder+1);
  res.status(201).json({ id, key, name, artUrl });
});

router.delete('/admin/categories/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const inUse = db.prepare('SELECT COUNT(*) as c FROM products WHERE type = (SELECT key FROM shop_categories WHERE id = ?) AND active = 1').get(req.params.id);
  if(inUse.c > 0) return res.status(409).json({ error: `还有 ${inUse.c} 件在架商品用着这个分类，请先转移这些商品的分类再删除` });
  db.prepare('DELETE FROM shop_categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

