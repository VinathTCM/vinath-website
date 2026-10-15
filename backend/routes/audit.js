// routes/audit.js —— 统一查询access_log这张表——病历访问记录、商品价格改动、订单状态/付款核实、
// 账号管理、黑名单这些敏感操作，都写进了同一张表(resource_type区分类型)，这里提供统一的查询入口。
// 只有大管理员能看——包括"谁查看过谁的病历"这类信息本身也敏感，不适合开放给I类/II类/III类小管理员。
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/admin/audit-log', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { resourceType, adminId, limit } = req.query;
  let sql = 'SELECT * FROM access_log WHERE 1=1';
  const params = [];
  if(resourceType){ sql += ' AND resource_type = ?'; params.push(resourceType); }
  if(adminId){ sql += ' AND admin_id = ?'; params.push(adminId); }
  sql += ' ORDER BY created_at DESC, rowid DESC LIMIT ?';
  params.push(Number(limit) || 300);
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// 筛选下拉框用——这张表里实际出现过哪些resource_type，不用前端硬编码猜
router.get('/admin/audit-log/resource-types', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const rows = db.prepare('SELECT DISTINCT resource_type FROM access_log ORDER BY resource_type').all();
  res.json(rows.map(r => r.resource_type));
});

// 日志完整性校验：按写入顺序重算整条 hash 链，任何一条被修改/删除/插入，
// 都会在对应位置产生断链。返回断点清单，便于管理员核对日志是否被人动过。
router.get('/admin/audit-log/integrity', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const rows = db.prepare('SELECT rowid, id, admin_id, admin_name, action, resource_type, resource_id, patient_phone, detail, prev_hash, hash, created_at FROM access_log ORDER BY rowid ASC').all();
  let prev = null;
  const broken = [];
  rows.forEach(r => {
    const expected = db.computeLogHash(prev, r.admin_id, r.admin_name, r.action, r.resource_type, r.resource_id, r.patient_phone, r.detail, r.created_at);
    if(expected !== r.hash) broken.push({ rowid: r.rowid, id: r.id, action: r.action, resourceType: r.resource_type });
    prev = r.hash;
  });
  res.json({ ok: broken.length === 0, total: rows.length, broken: broken.slice(0, 50), brokenCount: broken.length });
});

module.exports = router;
