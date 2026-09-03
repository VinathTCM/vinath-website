// routes/settings.js —— 站点级内容设置：基本信息/公告栏/政策页面/健康旅程，概念上都是"整站共享一份"的内容，
// 用同一张key-value表存，每个key对应的value是什么JSON形状由各自的用法决定（对象/数组/映射都可以）
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// 白名单——不是任意key都能存，避免这个通用接口被当成不受限的任意键值存储用
const ALLOWED_KEYS = ['business_info', 'announcements', 'policy_pages', 'health_journeys', 'module_access'];

router.get('/site-settings/:key', (req, res) => {
  if(!ALLOWED_KEYS.includes(req.params.key)) return res.status(404).json({ error: '不存在这个设置项' });
  const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(req.params.key);
  res.json(row ? JSON.parse(row.value) : null);
});

router.put('/admin/site-settings/:key', authMiddleware, requireRole('SENIOR'), (req, res) => {
  if(!ALLOWED_KEYS.includes(req.params.key)) return res.status(404).json({ error: '不存在这个设置项' });
  db.prepare(`
    INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(req.params.key, JSON.stringify(req.body));
  res.json({ ok: true });
});

module.exports = router;
