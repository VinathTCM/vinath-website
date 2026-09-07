// routes/herb-prices.js —— 单味中药价格库：医师自己维护每克价格，开方计价用
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/admin/herb-prices', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const rows = db.prepare('SELECT * FROM herb_prices ORDER BY herb_name').all();
  res.json(rows);
});

// 新增或更新一味药材价格（按药名 upsert）
router.put('/admin/herb-prices', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { herbName, pricePerG, note } = req.body;
  if(!herbName || !String(herbName).trim()) return res.status(400).json({ error: '请填写药材名称' });
  const name = String(herbName).trim();
  const price = Math.max(0, Number(pricePerG) || 0);
  const existing = db.prepare('SELECT id FROM herb_prices WHERE herb_name = ?').get(name);
  if(existing){
    db.prepare('UPDATE herb_prices SET price_per_g = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(price, note !== undefined ? String(note).trim() : existing.note, existing.id);
  } else {
    const id = 'hp_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    db.prepare('INSERT INTO herb_prices (id, herb_name, price_per_g, note) VALUES (?, ?, ?, ?)').run(id, name, price, note !== undefined ? String(note).trim() : '');
  }
  const row = db.prepare('SELECT * FROM herb_prices WHERE herb_name = ?').get(name);
  res.json(row);
});

router.delete('/admin/herb-prices/:name', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const result = db.prepare('DELETE FROM herb_prices WHERE herb_name = ?').run(decodeURIComponent(req.params.name));
  if(result.changes === 0) return res.status(404).json({ error: '没有这条药材价格' });
  res.json({ ok: true });
});

module.exports = router;
