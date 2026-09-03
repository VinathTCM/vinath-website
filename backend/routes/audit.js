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

module.exports = router;
