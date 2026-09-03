// routes/bookings.js —— 居家会诊预约：客户预约、查询，管理员查看与处理
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
  }
  return customer;
}

function genBookingNo(){
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'BK' + ymd + Math.floor(1000 + Math.random()*9000);
}

function serializeBooking(b){
  return { ...b, treatments: JSON.parse(b.treatments || '[]'), cancelled: !!b.cancelled };
}

// 客户填手机号是"0123456789"这种本地写法，黑名单存的可能是不带开头0的格式——
// 两边先都归一化成同一种形式再比对，跟之前前端 consult.html 里 normalizePhoneForMatch 逻辑一致
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
router.post('/bookings', (req, res) => {
  const { phone, name, area, addressDetail, practitionerId, practitionerName, apptDate, apptDateISO, slot, need } = req.body;
  if(!phone || !name || !area || !addressDetail){
    return res.status(400).json({ error: '姓名、手机号、地区、详细地址都是必填的' });
  }
  if(isBlacklisted(practitionerId, phone)){
    return res.status(403).json({ error: '抱歉，您选择的医师暂时无法为您提供服务，请重新选择一位医师。' });
  }
  const customer = findOrCreateCustomer(phone, name);
  const id = 'booking_' + Date.now();
  const bookingNo = genBookingNo();
  db.prepare(`
    INSERT INTO bookings (id, booking_no, customer_id, practitioner_id, practitioner_name, area, address_detail,
      appt_date, appt_date_iso, slot, need, consent_given_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, bookingNo, customer.id, practitionerId||null, practitionerName||null, area, addressDetail,
    apptDate||null, apptDateISO||null, slot||null, need||null, new Date().toISOString());
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.status(201).json(serializeBooking(row));
});

router.get('/bookings/lookup', (req, res) => {
  const { bookingNo, phone } = req.query;
  if(!bookingNo || !phone) return res.status(400).json({ error: '请提供预约编号和手机号' });
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_no = ? AND (SELECT phone FROM customers WHERE id = customer_id) = ?').get(bookingNo, phone);
  if(!booking) return res.status(404).json({ error: '找不到匹配的预约，请确认预约编号和手机号是否正确' });
  res.json(serializeBooking(booking));
});

// [stated] 客户自己取消预约——跟客户查询走一样的身份验证方式(预约号+手机号对上才行)，
// 不需要账号登录。已完成或已经取消过的预约不能再取消。
router.put('/bookings/:bookingNo/cancel', (req, res) => {
  const { phone } = req.body;
  if(!phone) return res.status(400).json({ error: '请提供手机号' });
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_no = ? AND (SELECT phone FROM customers WHERE id = customer_id) = ?').get(req.params.bookingNo, phone);
  if(!booking) return res.status(404).json({ error: '找不到匹配的预约，请确认预约编号和手机号是否正确' });
  if(booking.cancelled) return res.status(409).json({ error: '这个预约已经是取消状态了' });
  if(booking.status >= 2) return res.status(409).json({ error: '已完成的预约不能取消' });
  db.prepare('UPDATE bookings SET cancelled = 1 WHERE id = ?').run(booking.id);
  res.json({ ok: true });
});

// I类执业医师只能看分配给自己地区的；大管理员看全部——跟原本前端 admin.html 里的权限逻辑一致
router.get('/admin/bookings', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  let rows;
  const baseQuery = `
    SELECT bookings.*, customers.phone AS customer_phone, customers.name AS customer_name
    FROM bookings JOIN customers ON bookings.customer_id = customers.id
  `;
  if(req.admin.role === 'SENIOR'){
    rows = db.prepare(baseQuery + ' ORDER BY bookings.created_at DESC').all();
  } else {
    rows = db.prepare(baseQuery + ' WHERE bookings.practitioner_id = ? ORDER BY bookings.created_at DESC').all(req.admin.sub);
  }
  res.json(rows.map(serializeBooking));
});

router.put('/admin/bookings/:id/status', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const { status } = req.body;
  const result = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  if(result.changes === 0) return res.status(404).json({ error: '预约不存在' });
  res.json({ ok: true });
});

router.put('/admin/bookings/:id/note', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const { doctorNote, treatments } = req.body;
  db.prepare('UPDATE bookings SET doctor_note = ?, treatments = ? WHERE id = ?')
    .run(doctorNote||'', JSON.stringify(treatments||[]), req.params.id);
  res.json({ ok: true });
});

router.put('/admin/bookings/:id/deposit', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const { amount, method } = req.body;
  if(!amount || amount <= 0) return res.status(400).json({ error: '请输入有效金额' });
  const result = db.prepare(`
    UPDATE bookings SET deposit_amount = ?, deposit_method = ?, deposit_status = 'paid', deposit_requested_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(amount, method||null, req.params.id);
  if(result.changes === 0) return res.status(404).json({ error: '预约不存在' });
  res.json({ ok: true });
});

// ---- 黑名单管理：只有大管理员能操作 ----
router.get('/admin/blacklist', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const rows = db.prepare('SELECT * FROM blacklist ORDER BY added_date DESC').all();
  res.json(rows);
});

router.post('/admin/blacklist', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { practitionerId, phone, reason } = req.body;
  if(!practitionerId || !phone) return res.status(400).json({ error: '医师和手机号是必填的' });
  const existing = db.prepare('SELECT * FROM blacklist WHERE practitioner_id = ? AND phone = ?').get(practitionerId, phone);
  if(existing) return res.status(409).json({ error: '这一对医师和手机号已经在黑名单里了' });
  const id = 'bl_' + Date.now();
  db.prepare('INSERT INTO blacklist (id, practitioner_id, phone, reason) VALUES (?, ?, ?, ?)').run(id, practitionerId, phone, reason||null);
  res.status(201).json({ id });
});

router.delete('/admin/blacklist/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT phone FROM blacklist WHERE id = ?').get(req.params.id);
  const result = db.prepare('DELETE FROM blacklist WHERE id = ?').run(req.params.id);
  if(result.changes === 0) return res.status(404).json({ error: '记录不存在' });
  logAdminAction(req, 'delete', 'blacklist', req.params.id, existing ? existing.phone : null);
  res.json({ ok: true });
});

module.exports = router;
