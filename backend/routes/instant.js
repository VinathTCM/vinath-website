// routes/instant.js —— 即时预约(立即匹配)：客户提交后端自动匹配医师，医师15分钟内接单/不接单
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

const RESPONSE_WINDOW_MS = 15 * 60 * 1000; // 15分钟

function normalizePhone(v){
  var digits = (v||'').replace(/\D/g,'');
  if(digits.charAt(0)==='0') digits = digits.slice(1);
  return digits;
}
function isBlacklisted(practitionerId, phone){
  if(!practitionerId || !phone) return false;
  var normPhone = normalizePhone(phone);
  var rows = db.prepare('SELECT phone FROM blacklist WHERE practitioner_id = ?').all(practitionerId);
  return rows.some(function(r){ return normalizePhone(r.phone) === normPhone; });
}
// [stated] 匹配逻辑从前端搬到这里——只挑"I类·执业中医师、负责这个地区、开着接单开关、执照没过期、
// 没被这位客户拉黑"的人，跟原来 consult.html 里 findJuniorForArea() 的判断条件完全对应
function findPractitionerForArea(area, phone){
  var todayISO = new Date().toISOString().slice(0,10);
  var rows = db.prepare(`
    SELECT * FROM admins WHERE role = 'PRACTITIONER' AND accepting_orders = 1
      AND (license_expiry IS NULL OR license_expiry >= ?)
  `).all(todayISO);
  var candidate = rows.find(function(a){
    var regions = JSON.parse(a.regions || '[]');
    if(regions.indexOf(area) === -1) return false;
    if(phone && isBlacklisted(a.id, phone)) return false;
    return true;
  });
  return candidate || null;
}
// 懒惰过期检查——没有真正的定时任务能在没人看的时候把状态改掉，所以每次有人读取列表
// （客户轮询或管理员看消息tab）就顺手查一次，跟之前前端 expireStaleInstantRequests() 逻辑一致
function expireStaleRequests(){
  var now = Date.now();
  var stale = db.prepare(`SELECT id, created_at FROM instant_requests WHERE status = 'pending_confirmation'`).all();
  stale.forEach(function(r){
    var createdMs = new Date(r.created_at.replace(' ', 'T') + 'Z').getTime();
    if(now - createdMs > RESPONSE_WINDOW_MS){
      db.prepare(`UPDATE instant_requests SET status = 'expired' WHERE id = ?`).run(r.id);
    }
  });
}
function serializeRequest(r){
  return { ...r, remainMs: r.status==='pending_confirmation' ? Math.max(0, RESPONSE_WINDOW_MS - (Date.now() - new Date(r.created_at.replace(' ','T')+'Z').getTime())) : 0 };
}

// ---- 客户提交即时预约请求：公开接口 ----
router.post('/instant-requests', (req, res) => {
  const { name, phone, area, need, consentGivenAt } = req.body;
  if(!name || !phone || !area){
    return res.status(400).json({ error: '姓名、手机号、地区都是必填的' });
  }
  const matched = findPractitionerForArea(area, phone);
  const id = 'ir_' + Date.now();
  db.prepare(`
    INSERT INTO instant_requests (id, customer_name, customer_contact, area, need, matched_practitioner_id, status, consent_given_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, phone, area, need||null, matched ? matched.id : null, matched ? 'pending_confirmation' : 'unmatched', consentGivenAt||null);
  const row = db.prepare('SELECT * FROM instant_requests WHERE id = ?').get(id);
  res.status(201).json(serializeRequest(row));
});

// ---- 客户轮询状态：公开接口，凭id查（id本身就是随机生成的、够长，够当轻量凭证用） ----
router.get('/instant-requests/:id', (req, res) => {
  expireStaleRequests();
  const row = db.prepare('SELECT * FROM instant_requests WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '找不到这个请求' });
  res.json(serializeRequest(row));
});

// ---- 管理员查看待处理的即时预约请求：SENIOR看全部，PRACTITIONER只看匹配给自己的 ----
router.get('/admin/instant-requests', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  expireStaleRequests();
  let rows;
  if(req.admin.role === 'SENIOR'){
    rows = db.prepare(`SELECT * FROM instant_requests WHERE status = 'pending_confirmation' ORDER BY created_at DESC`).all();
  } else {
    rows = db.prepare(`SELECT * FROM instant_requests WHERE status = 'pending_confirmation' AND matched_practitioner_id = ? ORDER BY created_at DESC`).all(req.admin.sub);
  }
  res.json(rows.map(serializeRequest));
});

router.put('/admin/instant-requests/:id/respond', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const { accept } = req.body;
  const row = db.prepare('SELECT * FROM instant_requests WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '找不到这个请求' });
  if(row.status !== 'pending_confirmation') return res.status(409).json({ error: '这个请求已经处理过了' });
  // I类医师只能处理系统真正匹配给自己的请求，不能抢别人的单/替别人拒绝——大管理员不受此限制，
  // 保留兜底介入任何请求的权限
  if(req.admin.role === 'PRACTITIONER' && req.admin.sub !== row.matched_practitioner_id){
    return res.status(403).json({ error: '这个请求不是分配给你的' });
  }
  const newStatus = accept ? 'accepted' : 'declined';
  db.prepare('UPDATE instant_requests SET status = ?, accepted_by = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newStatus, accept ? req.admin.name : null, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
