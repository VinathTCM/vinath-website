// routes/schedule.js —— 智能排班：医师自己的服务半径+每周接单时段设置
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_AVAILABILITY = {
  radiusKm: 15,
  days: ['周一','周二','周三','周四','周五','周六','周日'].map(() => ({ enabled: false, start: '09:00', end: '18:00' }))
};

router.get('/admin/availability', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const admin = db.prepare('SELECT availability FROM admins WHERE id = ?').get(req.admin.sub);
  res.json(admin.availability ? JSON.parse(admin.availability) : DEFAULT_AVAILABILITY);
});

router.put('/admin/availability', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const { radiusKm, days } = req.body;
  db.prepare('UPDATE admins SET availability = ? WHERE id = ?')
    .run(JSON.stringify({ radiusKm: radiusKm||15, days: days||DEFAULT_AVAILABILITY.days }), req.admin.sub);
  res.json({ ok: true });
});

module.exports = router;
