// routes/analytics.js —— 网站访问统计：客户端匿名事件上报（不跟任何客户身份绑定），管理员查聚合结果
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

function periodCutoffISO(period){
  var d = new Date();
  if(period==='today'){ d.setHours(0,0,0,0); }
  else if(period==='week'){ d = new Date(Date.now() - 7*86400000); }
  else if(period==='month'){ d = new Date(Date.now() - 30*86400000); }
  else return '0000-00-00'; // 'all'：比任何真实时间戳都小，等于不过滤
  return d.toISOString().slice(0,19).replace('T',' ');
}

// ---- 公开接口：客户端页面匿名上报，不需要登录，不记录是谁 ----
router.post('/analytics/pageview', (req, res) => {
  const { page } = req.body;
  if(!page) return res.status(400).json({ error: '缺少page参数' });
  db.prepare('INSERT INTO pageviews (id, page) VALUES (?, ?)').run('pv_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), page);
  res.status(201).json({ ok: true });
});

router.post('/analytics/product-interest', (req, res) => {
  const { productId, productName, dwellMs } = req.body;
  if(!productName) return res.status(400).json({ error: '缺少productName参数' });
  db.prepare('INSERT INTO product_interest (id, product_id, product_name, dwell_ms) VALUES (?, ?, ?, ?)')
    .run('pi_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), productId||null, productName, dwellMs||0);
  res.status(201).json({ ok: true });
});

router.post('/analytics/wishlist-event', (req, res) => {
  const { productId, productName, action } = req.body;
  if(!productName || !['add','remove'].includes(action)) return res.status(400).json({ error: '参数不对' });
  db.prepare('INSERT INTO wishlist_events (id, product_id, product_name, action) VALUES (?, ?, ?, ?)')
    .run('we_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), productId||null, productName, action);
  res.status(201).json({ ok: true });
});

// ---- 管理员：查聚合结果，只有大管理员能看 ----
router.get('/admin/analytics/summary', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const cutoff = periodCutoffISO(req.query.period || 'week');

  const pageviews = db.prepare('SELECT page, COUNT(*) as cnt FROM pageviews WHERE created_at >= ? GROUP BY page ORDER BY cnt DESC').all(cutoff);
  const totalPageviews = pageviews.reduce((s, r) => s + r.cnt, 0);

  const productRows = db.prepare(`
    SELECT product_name, COUNT(*) as cnt, AVG(dwell_ms) as avg_dwell
    FROM product_interest WHERE created_at >= ? GROUP BY product_name ORDER BY avg_dwell DESC
  `).all(cutoff);

  // 收藏当前净值（加-减），不是"这段时间内收藏了多少次"——因为收藏可以取消，
  // 净值更能反映"现在还有多少人真的收藏着这件商品"
  const wishlistRows = db.prepare(`
    SELECT product_name,
      SUM(CASE WHEN action='add' THEN 1 ELSE 0 END) - SUM(CASE WHEN action='remove' THEN 1 ELSE 0 END) as net_count
    FROM wishlist_events WHERE created_at >= ? GROUP BY product_name HAVING net_count > 0 ORDER BY net_count DESC
  `).all(cutoff);

  res.json({
    totalPageviews, uniquePages: pageviews.length,
    totalProductViews: productRows.reduce((s, r) => s + r.cnt, 0),
    pageviews: pageviews.map(r => ({ page: r.page, count: r.cnt })),
    productInterest: productRows.map(r => ({ name: r.product_name, count: r.cnt, avgDwellMs: Math.round(r.avg_dwell||0) })),
    wishlist: wishlistRows.map(r => ({ name: r.product_name, count: r.net_count }))
  });
});

module.exports = router;
