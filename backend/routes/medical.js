// routes/medical.js —— 电子病历：SENIOR+PRACTITIONER可用，具体问诊字段整体存JSON（字段还可能调整，不为每次调整都写数据库迁移）
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole, requireModuleAccess } = require('../middleware/auth');
const { visiblePatientPhonesFor } = require('./visibility');

const router = express.Router();

function serializeRecord(r){
  let data = {};
  try { data = JSON.parse(r.data || '{}'); } catch(e){ data = {}; }
  // 该病历是否已通过电子处方关联到某笔预约（用于当日交易报表判断"病历治疗项目是否已被预约记录覆盖"）
  let linkedBookingId = null;
  // 该病历关联的最近一份处方（药材/服法/配方类型）——编辑病历/再次开方时回填，避免处方空白
  let lastRx = null;
  try {
    const rxRow = db.prepare('SELECT * FROM prescriptions WHERE medical_record_id = ? ORDER BY created_at DESC LIMIT 1').get(r.id);
    if(rxRow){
      linkedBookingId = rxRow.booking_id || null;
      let rxItems = [];
      try { rxItems = JSON.parse(rxRow.items || '[]'); } catch(e){ rxItems = []; }
      lastRx = { id: rxRow.id, formulaType: rxRow.formula_type || 'granule', items: rxItems, usageInstructions: rxRow.usage_instructions || '', bookingId: rxRow.booking_id || null, doses: rxRow.doses || 1, dispenseMode: rxRow.dispense_mode || 'herb_pickup', herbTotal: rxRow.herb_total || 0, decoctFee: rxRow.decoct_fee || 0 };
    }
  } catch(e){}
  return { ...r, data, linkedBookingId, lastRx };
}
// 病历属于敏感健康数据，每次查看/创建/修改都记一笔——谁、什么时候、看了哪个患者的记录。
// 这不是完整的PDPA合规方案，但"数据访问可追溯"是其中的基础一环。
function logAccess(req, action, recordId, patientPhone){
  try {
    db.prepare('INSERT INTO access_log (id, admin_id, admin_name, action, resource_type, resource_id, patient_phone) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('log_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), req.admin.sub, req.admin.name, action, 'medical_record', recordId||null, patientPhone||null);
  } catch(e){ console.error('写入访问日志失败:', e); } // 日志写入失败不应该阻断正常业务流程
}

// 按患者手机号查这个人的全部病历——电子病历自己的时间轴用，也是"合并时间轴"
// （病历+预约+处方合并显示）那个功能要用到的三个数据源之一
router.get('/admin/medical-records', authMiddleware, requireModuleAccess('medicalRecords'), (req, res) => {
  const { patientPhone } = req.query;
  let rows;
  if(req.admin.role === 'PRACTITIONER'){
    // 小管理员：只能看到自己名下"未过期"预约的病人的病历（可见规则见 visibility.js）。
    // 有未过期预约的病人 → 能看到该病人的全部历史病历（不限书写者）。
    const visiblePhones = visiblePatientPhonesFor(req.admin.sub, Date.now());
    if(patientPhone){
      if(visiblePhones.indexOf(patientPhone) === -1) return res.json([]);
      rows = db.prepare("SELECT * FROM medical_records WHERE patient_phone = ? AND data NOT LIKE '%\"_deleted\":%' ORDER BY visit_date DESC").all(patientPhone);
      logAccess(req, 'view', null, patientPhone);
    } else {
      if(!visiblePhones.length) return res.json([]);
      const ph = visiblePhones.map(function(){ return '?'; }).join(',');
      rows = db.prepare("SELECT * FROM medical_records WHERE patient_phone IN (" + ph + ") AND data NOT LIKE '%\"_deleted\":%' ORDER BY visit_date DESC").all(...visiblePhones);
      logAccess(req, 'view', null, null);
    }
  } else if(patientPhone){
    rows = db.prepare("SELECT * FROM medical_records WHERE patient_phone = ? AND data NOT LIKE '%\"_deleted\":%' ORDER BY visit_date DESC").all(patientPhone);
    logAccess(req, 'view', null, patientPhone);
  } else {
    rows = db.prepare("SELECT * FROM medical_records WHERE data NOT LIKE '%\"_deleted\":%' ORDER BY visit_date DESC").all();
    logAccess(req, 'view', null, null); // 没传手机号=查看全部病历列表，这种更该记
  }
  res.json(rows.map(serializeRecord));
});

// 患者列表（按手机号去重，带就诊次数和最近一次日期）——电子病历首页的患者列表用
router.get('/admin/medical-records/patients', authMiddleware, requireModuleAccess('medicalRecords'), (req, res) => {
  let rows;
  if(req.admin.role === 'PRACTITIONER'){
    const visiblePhones = visiblePatientPhonesFor(req.admin.sub, Date.now());
    if(!visiblePhones.length) return res.json([]);
    const ph = visiblePhones.map(function(){ return '?'; }).join(',');
    rows = db.prepare("SELECT patient_phone, patient_name, visit_date, data FROM medical_records WHERE patient_phone IN (" + ph + ") AND data NOT LIKE '%\"_deleted\":%'").all(...visiblePhones);
  } else {
    rows = db.prepare("SELECT patient_phone, patient_name, visit_date, data FROM medical_records WHERE data NOT LIKE '%\"_deleted\":%'").all();
  }
  function ageFromDob(dob){
    if(!dob) return null;
    const d = new Date(dob);
    if(isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if(m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 ? age : null;
  }
  const byPhone = {};
  rows.forEach(r => {
    let d = {};
    try { d = JSON.parse(r.data || '{}'); } catch(e){ d = {}; }
    if(!byPhone[r.patient_phone]){
      byPhone[r.patient_phone] = { phone: r.patient_phone, name: r.patient_name, count: 0, lastVisit: r.visit_date, gender: null, dob: null, age: null };
    }
    byPhone[r.patient_phone].count++;
    if(r.visit_date >= byPhone[r.patient_phone].lastVisit){
      byPhone[r.patient_phone].lastVisit = r.visit_date;
      byPhone[r.patient_phone].name = r.patient_name;
      byPhone[r.patient_phone].gender = d.gender || null;
      byPhone[r.patient_phone].dob = d.dateOfBirth || null;
      byPhone[r.patient_phone].age = ageFromDob(d.dateOfBirth);
    }
  });
  const list = Object.values(byPhone).sort((a,b) => b.lastVisit.localeCompare(a.lastVisit));
  res.json(list);
});

router.post('/admin/medical-records', authMiddleware, requireModuleAccess('medicalRecords'), (req, res) => {
  const { patientPhone, patientName, visitDate, data } = req.body;
  if(!patientPhone || !patientName){
    return res.status(400).json({ error: '患者手机号和姓名是必填的' });
  }
  const id = 'mr_' + Date.now();
  db.prepare(`
    INSERT INTO medical_records (id, patient_phone, patient_name, practitioner_id, practitioner_name, visit_date, data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, patientPhone, patientName, req.admin.sub, req.admin.name, visitDate || new Date().toISOString().slice(0,10), JSON.stringify(data||{}));
  const row = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id);
  logAccess(req, 'create', id, patientPhone);
  res.status(201).json(serializeRecord(row));
});

router.put('/admin/medical-records/:id', authMiddleware, requireModuleAccess('medicalRecords'), (req, res) => {
  const existing = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '病历不存在' });
  const { visitDate, data } = req.body;
  db.prepare('UPDATE medical_records SET visit_date = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(visitDate || existing.visit_date, JSON.stringify(data||{}), req.params.id);
  const row = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(req.params.id);
  logAccess(req, 'update', req.params.id, existing.patient_phone);
  res.json(serializeRecord(row));
});

// 软删除单条病历（进回收箱）：只有大管理员能删。记录谁删的、什么时候删的
router.delete('/admin/medical-records/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '病历不存在' });
  let data = {};
  try { data = JSON.parse(row.data || '{}'); } catch(e){ data = {}; }
  data._deleted = { by: req.admin.name, byId: req.admin.sub, at: new Date().toISOString() };
  db.prepare('UPDATE medical_records SET data = ? WHERE id = ?').run(JSON.stringify(data), req.params.id);
  logAccess(req, 'delete', req.params.id, row.patient_phone);
  res.json({ ok: true });
});

// 批量软删除某患者全部病历（进回收箱）：病历管理"删除患者"用
router.delete('/admin/medical-records/patient/:phone', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const rows = db.prepare("SELECT * FROM medical_records WHERE patient_phone = ? AND data NOT LIKE '%\"_deleted\":%'").all(req.params.phone);
  const mark = { by: req.admin.name, byId: req.admin.sub, at: new Date().toISOString() };
  const upd = db.prepare('UPDATE medical_records SET data = ? WHERE id = ?');
  rows.forEach(r => {
    let data = {};
    try { data = JSON.parse(r.data || '{}'); } catch(e){ data = {}; }
    data._deleted = mark;
    upd.run(JSON.stringify(data), r.id);
    logAccess(req, 'delete', r.id, r.patient_phone);
  });
  res.json({ ok: true, count: rows.length });
});

// 回收箱列表：已删除的病历（含删除人/删除时间）
router.get('/admin/medical-records/trash', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const rows = db.prepare("SELECT * FROM medical_records WHERE data LIKE '%\"_deleted\":%' ORDER BY visit_date DESC").all();
  res.json(rows.map(serializeRecord));
});

// 恢复病历（从回收箱）
router.post('/admin/medical-records/:id/restore', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '病历不存在' });
  let data = {};
  try { data = JSON.parse(row.data || '{}'); } catch(e){ data = {}; }
  if(data._deleted) delete data._deleted;
  db.prepare('UPDATE medical_records SET data = ? WHERE id = ?').run(JSON.stringify(data), req.params.id);
  logAccess(req, 'restore', req.params.id, row.patient_phone);
  res.json({ ok: true });
});

// 永久删除（回收箱里彻底删除，同时删掉关联处方）
router.delete('/admin/medical-records/:id/permanent', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const row = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: '病历不存在' });
  try { db.prepare('DELETE FROM prescriptions WHERE medical_record_id = ?').run(req.params.id); } catch(e){}
  db.prepare('DELETE FROM medical_records WHERE id = ?').run(req.params.id);
  logAccess(req, 'purge', req.params.id, row.patient_phone);
  res.json({ ok: true });
});

// 访问日志查询——只有大管理员能看"谁在什么时候看过哪个患者的病历"，这本身也是敏感信息，
// 不开放给I类执业医师查看别人的访问记录
router.get('/admin/medical-records/access-log', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { patientPhone, limit } = req.query;
  let rows;
  if(patientPhone){
    rows = db.prepare("SELECT * FROM access_log WHERE resource_type = 'medical_record' AND patient_phone = ? ORDER BY created_at DESC LIMIT ?")
      .all(patientPhone, Number(limit) || 200);
  } else {
    rows = db.prepare("SELECT * FROM access_log WHERE resource_type = 'medical_record' ORDER BY created_at DESC LIMIT ?").all(Number(limit) || 200);
  }
  res.json(rows);
});

// 修改患者姓名 / 手机号：用于更正当初着急写错的信息。按"原手机号"定位这个人，
// 事务内同步更新其所有 病历 / 处方 / 收据 的姓名与手机号——只改一条会让同一人的记录分裂、复诊搜索不到。
// 与"删除患者"一样仅 SENIOR 可操作；小管理员写错可请大管理员更正
router.post('/admin/medical-records/patient/update', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { oldPhone, newPhone, newName } = req.body;
  if(!oldPhone) return res.status(400).json({ error: '缺少原手机号' });
  const cleanNewPhone = String(newPhone || '').trim().replace(/[^0-9]/g, '');
  const cleanNewName = String(newName || '').trim();
  if(!cleanNewPhone || !cleanNewName) return res.status(400).json({ error: '请填写正确的新手机号和姓名' });
  const hasRecords = db.prepare("SELECT COUNT(*) as c FROM medical_records WHERE patient_phone = ? AND data NOT LIKE '%\"_deleted\":%'").get(oldPhone).c;
  if(!hasRecords) return res.status(404).json({ error: '找不到这个患者的病历' });
  // 改手机号时，新号下不能已有"别人"的病历，否则会把两个不同的人合并
  if(cleanNewPhone !== oldPhone){
    const clash = db.prepare("SELECT COUNT(*) as c FROM medical_records WHERE patient_phone = ? AND data NOT LIKE '%\"_deleted\":%'").get(cleanNewPhone).c;
    if(clash) return res.status(409).json({ error: '新手机号下已有其他患者的病历，无法合并' });
  }
  const apply = db.transaction(() => {
    const rec = db.prepare('UPDATE medical_records SET patient_phone = ?, patient_name = ? WHERE patient_phone = ?')
      .run(cleanNewPhone, cleanNewName, oldPhone);
    const rx = db.prepare('UPDATE prescriptions SET patient_phone = ?, patient_name = ? WHERE patient_phone = ?')
      .run(cleanNewPhone, cleanNewName, oldPhone);
    const rc = db.prepare('UPDATE receipts SET patient_phone = ?, patient_name = ? WHERE patient_phone = ?')
      .run(cleanNewPhone, cleanNewName, oldPhone);
    return { records: rec.changes, prescriptions: rx.changes, receipts: rc.changes };
  });
  try {
    const updated = apply();
    logAccess(req, 'update-patient', null, oldPhone);
    res.json({ ok: true, updated });
  } catch(e){
    console.error('修改患者信息失败:', e);
    res.status(500).json({ error: '修改失败，请稍后重试' });
  }
});

function pad2(n){ return String(n).padStart(2, '0'); }
// 把 Date 转成 SQLite CURRENT_TIMESTAMP 同款的 UTC 字符串 'YYYY-MM-DD HH:MM:SS'
function toSqliteUtc(d){
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth()+1) + '-' + pad2(d.getUTCDate())
    + ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds());
}

// 病历账本：按日期范围聚合"已开具收据"的全部明细，供某日/月/季/年账本导出。
// 数据源是 receipts（实际已开票、已收款记录），line_items 带 category，可区分 处方(rx)/治疗(treatment)/商品(product)/折扣(discount)。
// 马来西亚为 UTC+8，查询边界把本地 00:00~次日00:00 换算成 UTC，避免跨天单据算错日子
router.get('/admin/medical-records/ledger', authMiddleware, requireModuleAccess('medicalRecords'), (req, res) => {
  const { from, to } = req.query;
  if(!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)){
    return res.status(400).json({ error: '请提供正确的起止日期（YYYY-MM-DD）' });
  }
  let start, end;
  try {
    start = new Date(from + 'T00:00:00+08:00');
    end = new Date(to + 'T00:00:00+08:00');
    if(isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('bad date');
    end.setDate(end.getDate() + 1); // 范围为 [from 00:00, to 次日 00:00)
  } catch(e){
    return res.status(400).json({ error: '日期格式不正确' });
  }
  let rows = db.prepare('SELECT * FROM receipts WHERE issued_at >= ? AND issued_at < ? ORDER BY issued_at ASC')
    .all(toSqliteUtc(start), toSqliteUtc(end));
  // 小管理员的账本只统计自己开具的收据
  if(req.admin.role === 'PRACTITIONER'){
    rows = rows.filter(function(r){ return r.practitioner_id === req.admin.sub; });
  }
  const entries = rows.map(function(r){
    let lineItems = [];
    try { lineItems = JSON.parse(r.line_items || '[]'); } catch(e){ lineItems = []; }
    return {
      receiptNo: r.receipt_no, issuedAt: r.issued_at,
      patientName: r.patient_name, patientPhone: r.patient_phone,
      practitionerName: r.practitioner_name_snapshot, diagnosis: r.tcm_diagnosis_snapshot,
      paymentMethod: r.payment_method, paymentStatus: r.payment_status,
      lineItems: lineItems, total: Number(r.total_amount) || 0
    };
  });
  const grandTotal = entries.reduce(function(s, e){ return s + e.total; }, 0);
  res.json({ from: from, to: to, count: entries.length, entries: entries, grandTotal: Number(grandTotal.toFixed(2)) });
});

module.exports = router;
