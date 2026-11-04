// routes/bookings.js —— 居家会诊预约：客户预约、查询，管理员查看与处理
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole, logAdminAction } = require('../middleware/auth');
const { isBookingVisibleNow } = require('./visibility');

const router = express.Router();

function findOrCreateCustomer(phone, name){
  let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if(!customer){
    const id = 'cust_' + Date.now();
    db.prepare('INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)').run(id, phone, name);
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  } else if(name && customer.name !== name){
    // 同一手机号再次预约时名字可能更新（如之前填测试、这次填真名），以最新填写为准
    db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name, customer.id);
    customer.name = name;
  }
  return customer;
}

function genBookingNo(){
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  return 'BK' + ymd + Math.floor(1000 + Math.random()*9000);
}

function serializeBooking(b){
  // 防御：treatments 损坏时回退为空数组；status 缺失时默认0（待确认）
  var treatments = [];
  try { treatments = JSON.parse(b.treatments || '[]'); } catch(e){ treatments = []; }
  if(!Array.isArray(treatments)) treatments = [];
  return { ...b, treatments: treatments, cancelled: !!b.cancelled, status: (b.status===null||b.status===undefined)?0:b.status };
}

// ---- 大管理员同步出诊：两位大管理员同一时段只服务一位客户 ----
// 开关存 site_settings（后端全局生效，所有客户设备都读到）；开启后任一大管理员某时段被预约，
// 另一位大管理员同一时段自动视为"已预约"（前端禁用 + 后端拒重复）
function getSyncFlag(){
  try {
    const row = db.prepare("SELECT value FROM site_settings WHERE key = 'senior_sync_schedule'").get();
    return !!(row && row.value && JSON.parse(row.value) === true);
  } catch(e){ return false; }
}
function isSeniorPractitioner(id){
  const row = db.prepare('SELECT role FROM admins WHERE id = ?').get(id);
  return !!(row && row.role === 'SENIOR');
}
function getOtherSeniorIds(excludeId){
  const rows = db.prepare("SELECT id FROM admins WHERE role = 'SENIOR'").all();
  return rows.map(function(r){ return r.id; }).filter(function(id){ return id !== excludeId; });
}
// 未取消、未软删、未完成的预约才算占用（status<2：0待确认/1已确认；>=2已完成不再占时段）
const TAKEN_WHERE = 'deleted_at IS NULL AND cancelled = 0 AND status < 2';
function takenSlotsOf(practitionerId, date){
  return db.prepare('SELECT slot FROM bookings WHERE practitioner_id = ? AND appt_date_iso = ? AND ' + TAKEN_WHERE)
    .all(practitionerId, date).map(function(r){ return r.slot; });
}
function slotAlreadyTaken(practitionerId, date, slot){
  const base = 'SELECT id FROM bookings WHERE appt_date_iso = ? AND slot = ? AND ' + TAKEN_WHERE;
  if(db.prepare(base + ' AND practitioner_id = ?').get(date, slot, practitionerId)) return true;
  // 同步开启且该医师是大管理员：任一位其他大管理员同一时段被约，也视为占用
  if(getSyncFlag() && isSeniorPractitioner(practitionerId)){
    const others = getOtherSeniorIds(practitionerId);
    if(others.length){
      const ph = others.map(function(){ return '?'; }).join(',');
      if(db.prepare(base + ' AND practitioner_id IN (' + ph + ')').get(date, slot, ...others)) return true;
    }
  }
  return false;
}

// slot id '9-10'/'11-12'/'2-3'/'4-5'：起始数字 1-5 为下午（12小时制），9-11 为上午
function slotStartHour24(slotId){
  var parts = String(slotId||'').split('-');
  if(parts.length < 2) return null;
  var start = parseInt(parts[0],10);
  if(isNaN(start)) return null;
  return start <= 5 ? start + 12 : start;
}
function toMin(t){
  var p = String(t||'').split(':');
  return Number(p[0])*60 + Number(p[1]||0);
}
// 医师 availability（服务时段）内判断：slot 为 1 小时段，要求完整落在 [start,end] 内
function slotInAvailability(slotId, days, dow){
  var dd = days[dow];
  if(!dd || !dd.enabled) return false;
  if(!dd.start || !dd.end) return true;
  var startH = slotStartHour24(slotId);
  if(startH == null) return false;
  var sMin = startH*60, eMin = sMin + 60;
  return sMin >= toMin(dd.start) && eMin <= toMin(dd.end);
}

// 公开接口：居家会诊页选时段用——返回该医师该日已占用时段；
// 同步开启时（且该医师是大管理员），同时返回其他大管理员同一日期的占用，前端一起锁掉
router.get('/bookings/availability', (req, res) => {
  const { practitionerId, date } = req.query;
  if(!practitionerId || !date) return res.status(400).json({ error: '缺少医师或日期参数' });
  const taken = [...new Set(takenSlotsOf(practitionerId, date))];
  const sync = getSyncFlag() && isSeniorPractitioner(practitionerId);
  let syncedFrom = [];
  if(sync){
    const others = getOtherSeniorIds(practitionerId);
    others.forEach(function(id){
      syncedFrom = syncedFrom.concat(takenSlotsOf(id, date));
    });
    syncedFrom = [...new Set(syncedFrom)];
  }
  // 附带该医师的服务时段与范围配置（智能排班页保存的 availability）：
  // 前端据此过滤可预约日期与时段。管理员从未设置过 availability 时 hasAvailability=false，
  // 前端保持宽松默认（不强制过滤），避免默认全关闭把可预约日期全锁掉。
  let hasAvailability = false, days = null, radiusKm = null;
  const adminRow = db.prepare('SELECT availability FROM admins WHERE id = ?').get(practitionerId);
  if(adminRow && adminRow.availability){
    try {
      const a = JSON.parse(adminRow.availability);
      if(a && Array.isArray(a.days) && a.days.length === 7){
        hasAvailability = true;
        days = a.days;
        radiusKm = (a.radiusKm != null) ? Number(a.radiusKm) : 15;
      }
    } catch(e){}
  }
  res.json({ sync, taken, syncedFrom, hasAvailability, days, radiusKm });
});

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
  // 时段占用校验：本人同日期同时段已约 → 拒绝；大管理员同步出诊开启时，对方大管理员已约也拒绝
  if(apptDateISO && slot && slotAlreadyTaken(practitionerId, apptDateISO, slot)){
    return res.status(409).json({ error: '这个时段刚刚已经被预约了，请重新选择其他时段。' });
  }
  // 服务时段校验：医师在智能排班页设置过 availability（服务时段与范围）时，非服务时段拒绝
  if(apptDateISO && slot && slot !== 'ASAP'){
    const availRow = db.prepare('SELECT availability FROM admins WHERE id = ?').get(practitionerId);
    if(availRow && availRow.availability){
      try {
        const av = JSON.parse(availRow.availability);
        if(av && Array.isArray(av.days) && av.days.length === 7){
          // 用 UTC 构造日期再取星期几，避免服务器时区（Render 为 UTC）导致星期偏移一天
          const dp = String(apptDateISO).split('-');
          const dow = new Date(Date.UTC(Number(dp[0]), Number(dp[1])-1, Number(dp[2]))).getUTCDay();
          if(!slotInAvailability(slot, av.days, dow)){
            return res.status(409).json({ error: '该时段不在医师服务时间内，请重新选择其他时段。' });
          }
        }
      } catch(e){}
    }
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
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_no = ? AND (SELECT phone FROM customers WHERE id = customer_id) = ? AND deleted_at IS NULL').get(bookingNo, phone);
  if(!booking) return res.status(404).json({ error: '找不到匹配的预约，请确认预约编号和手机号是否正确' });
  const result = serializeBooking(booking);
  // 该预约关联的中药处方（病人端显示煎药/配送进度）
  try {
    const rx = db.prepare('SELECT * FROM prescriptions WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1').get(booking.id);
    if(rx){
      let rxItems = [];
      try { rxItems = JSON.parse(rx.items || '[]'); } catch(e){ rxItems = []; }
      result.prescription = {
        status: rx.status, formulaType: rx.formula_type, items: rxItems,
        doses: rx.doses || 1, dispenseMode: rx.dispense_mode || '',
        logisticsProvider: rx.logistics_provider || '', trackingId: rx.tracking_id || '',
        herbTotal: rx.herb_total || 0, decoctFee: rx.decoct_fee || 0
      };
    }
  } catch(e){}
  res.json(result);
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
    FROM bookings LEFT JOIN customers ON bookings.customer_id = customers.id
  `;
  if(req.admin.role === 'SENIOR'){
    rows = db.prepare(baseQuery + ' WHERE bookings.deleted_at IS NULL ORDER BY bookings.created_at DESC').all();
  } else {
    // 小管理员：只能看到自己名下、且未过期的预约（预约时间段结束 +24h 内）。
    // 过期的预约从小管理员视图消失，大管理员仍能看到全部。
    const allMine = db.prepare(baseQuery + ' WHERE bookings.deleted_at IS NULL AND bookings.practitioner_id = ? ORDER BY bookings.created_at DESC').all(req.admin.sub);
    const nowMs = Date.now();
    rows = allMine.filter(function(b){ return isBookingVisibleNow(b, nowMs); });
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

// 只补写治疗项目（电子病历开具处方/治疗项目后写回预约），不覆盖医师补充病史
router.put('/admin/bookings/:id/treatments', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const row = db.prepare('SELECT id FROM bookings WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '预约不存在' });
  const { treatments } = req.body;
  db.prepare('UPDATE bookings SET treatments = ? WHERE id = ?')
    .run(JSON.stringify(Array.isArray(treatments) ? treatments : []), req.params.id);
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


// ===== 软删除 / 回收箱（仅大管理员）=====

// 软删除预约（移入回收箱，30天内可恢复）
router.delete('/admin/bookings/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '预约不存在' });
  if(row.deleted_at) return res.status(400).json({ error: '该预约已在回收箱中' });
  db.prepare('UPDATE bookings SET deleted_at = ?, deleted_by = ? WHERE id = ?').run(
    new Date().toISOString(), req.admin.name, req.params.id
  );
  logAdminAction(req, 'soft_delete', 'booking', req.params.id, '移入回收箱');
  res.json({ ok: true });
});

// 回收箱列表（已删除且30天内的预约）
router.get('/admin/bookings/trash', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const rows = db.prepare(`
    SELECT bookings.*, customers.phone AS customer_phone, customers.name AS customer_name
    FROM bookings LEFT JOIN customers ON bookings.customer_id = customers.id
    WHERE bookings.deleted_at IS NOT NULL AND bookings.deleted_at >= ?
    ORDER BY bookings.deleted_at DESC
  `).all(cutoff);
  res.json(rows.map(serializeBooking));
});

// 恢复预约（从回收箱）
router.post('/admin/bookings/:id/restore', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '预约不存在' });
  if(!row.deleted_at) return res.status(400).json({ error: '该预约不在回收箱中' });
  db.prepare('UPDATE bookings SET deleted_at = NULL, deleted_by = NULL WHERE id = ?').run(req.params.id);
  logAdminAction(req, 'restore', 'booking', req.params.id, '从回收箱恢复');
  res.json({ ok: true });
});

// 永久删除预约（回收箱里彻底删除）
router.delete('/admin/bookings/:id/permanent', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '预约不存在' });
  db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  logAdminAction(req, 'permanent_delete', 'booking', req.params.id, '回收箱永久删除');
  res.json({ ok: true });
});

module.exports = router;
