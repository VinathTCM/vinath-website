// routes/medical.js —— 电子病历：SENIOR+PRACTITIONER可用，具体问诊字段整体存JSON（字段还可能调整，不为每次调整都写数据库迁移）
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole, requireModuleAccess, appendAuditLog } = require('../middleware/auth');
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
  if(!req || !req.admin) return;
  appendAuditLog(req.admin.sub, req.admin.name, action, 'medical_record', recordId || null, patientPhone || null, null);
}

// ============ 病历修改留痕（版本快照 + 字段级变更摘要） ============
// 依据马来西亚医药理事会 MMC《Confidentiality Guidelines》(2011-10-11 批准) 第14条：
//   (c) 维护审计日志以支持病历新增/修改内容的真实性；
//   (d) 保护电子病历的任何部分不被删除。
// 配合 PDPA 2010 (Act 709) 安全原则与数据完整性原则：更正须可追溯、可追责。

// 病历字段中文标签——变更摘要用中文标明改了哪些栏目，便于日后举证与内部核查
const MR_FIELD_LABELS = {
  visitDate: '就诊日期', visitType: '就诊类型', voiceNotes: '语音备注',
  chiefComplaint: '主诉', presentIllness: '现病史', medicalHistory: '既往史',
  pulseNotes: '脉诊备注', pulseType: '脉象', tongueBodyColor: '舌质',
  tongueCoating: '舌苔', tongueShape: '舌形', tongueBodyColorCustom: '舌质(自定义)',
  tongueCoatingCustom: '舌苔(自定义)', tongueShapeCustom: '舌形(自定义)',
  constitutionType: '体质', constitutionTypeCustom: '体质(自定义)',
  tcmDiagnosis: '中医诊断', syndromePattern: '证型', treatmentPlan: '治法方案',
  treatmentPoints: '治疗穴位', treatments: '治疗项目', products: '商品',
  couponCode: '优惠码', manualDiscount: '手动折扣',
  gender: '性别', dateOfBirth: '出生日期', age: '年龄', photos: '照片'
};

function mrNorm(v){
  if(v === null || v === undefined) return '';
  if(Array.isArray(v)) return JSON.stringify(v.slice().sort());
  if(typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// 对比修改前后的病历，返回变更栏目中文标签数组（去重、保持稳定顺序）
function diffMedicalRecord(oldData, newData, oldVisitDate, newVisitDate){
  const changed = [];
  const keys = new Set([].concat(Object.keys(oldData || {}), Object.keys(newData || {})));
  keys.forEach(function(k){
    if(k === '_deleted') return; // 软删除标记由删除流程处理，不算普通修改
    if(mrNorm(oldData ? oldData[k] : undefined) !== mrNorm(newData ? newData[k] : undefined)){
      changed.push(MR_FIELD_LABELS[k] || k);
    }
  });
  if(newVisitDate && oldVisitDate !== newVisitDate && changed.indexOf('就诊日期') === -1){
    changed.unshift('就诊日期');
  }
  return changed;
}

// 修改前把完整旧内容写入只追加版本表（系统无 UPDATE/DELETE 接口），并挂到版本 hash 链上
function appendRecordVersion(existingRow, changedBy, changedFields){
  const last = db.prepare('SELECT MAX(version_no) AS v FROM medical_record_versions WHERE record_id = ?').get(existingRow.id);
  const versionNo = (last && last.v ? last.v : 0) + 1;
  const id = 'ver_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const createdAt = toSqliteUtc(new Date());
  const summary = JSON.stringify({ changed: changedFields });
  const prevRow = db.prepare('SELECT hash FROM medical_record_versions ORDER BY rowid DESC LIMIT 1').get();
  const prevHash = prevRow ? prevRow.hash : null;
  const hash = db.computeVersionHash(prevHash, existingRow.id, existingRow.patient_phone, existingRow.patient_name,
    versionNo, existingRow.visit_date, existingRow.data, changedBy.sub, changedBy.name, summary, createdAt);
  db.prepare(`INSERT INTO medical_record_versions
    (id, record_id, patient_phone, patient_name, version_no, visit_date, data, changed_by_id, changed_by_name, change_summary, prev_hash, hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, existingRow.id, existingRow.patient_phone, existingRow.patient_name, versionNo,
      existingRow.visit_date, existingRow.data, changedBy.sub, changedBy.name, summary, prevHash, hash, createdAt
    );
  return versionNo;
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
  const newData = data || {};
  const nextVisitDate = visitDate || existing.visit_date;
  let oldData = {};
  try { oldData = JSON.parse(existing.data || '{}'); } catch(e){ oldData = {}; }
  const changedFields = diffMedicalRecord(oldData, newData, existing.visit_date, nextVisitDate);

  // 有实质变更才存版本+写修改日志；只点保存但内容完全没变，不产生无意义的修改记录
  if(changedFields.length){
    db.transaction(() => {
      // 先把修改前的完整旧内容快照存档（只追加、不可覆盖），再写入新内容
      const versionNo = appendRecordVersion(existing, req.admin, changedFields);
      db.prepare('UPDATE medical_records SET visit_date = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(nextVisitDate, JSON.stringify(newData), req.params.id);
      // 审计日志记录"谁、什么时候、改了哪条病历的哪些栏目"，并关联版本号
      appendAuditLog(req.admin.sub, req.admin.name, 'update', 'medical_record',
        req.params.id, existing.patient_phone,
        JSON.stringify({ changed: changedFields, version: versionNo }));
    })();
  }
  const row = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(req.params.id);
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
    rows = db.prepare("SELECT * FROM access_log WHERE resource_type = 'medical_record' AND patient_phone = ? ORDER BY created_at DESC, rowid DESC LIMIT ?")
      .all(patientPhone, Number(limit) || 200);
  } else {
    rows = db.prepare("SELECT * FROM access_log WHERE resource_type = 'medical_record' ORDER BY created_at DESC, rowid DESC LIMIT ?").all(Number(limit) || 200);
  }
  res.json(rows);
});

// 病历版本历史：修改前的完整旧内容快照（只追加、不可删除）。仅大管理员可查。
// 每条含版本号、修改人、修改时间、变更栏目摘要，以及该版本的完整病历内容。
router.get('/admin/medical-records/:id/versions', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const rec = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(req.params.id);
  if(!rec) return res.status(404).json({ error: '病历不存在' });
  const rows = db.prepare('SELECT * FROM medical_record_versions WHERE record_id = ? ORDER BY version_no DESC').all(req.params.id);
  const out = rows.map(function(r){
    let snapshot = {};
    try { snapshot = JSON.parse(r.data || '{}'); } catch(e){ snapshot = {}; }
    let summary = null;
    try { summary = r.change_summary ? JSON.parse(r.change_summary) : null; } catch(e){ summary = null; }
    return {
      id: r.id, recordId: r.record_id, versionNo: r.version_no, visitDate: r.visit_date,
      snapshot: snapshot, changedById: r.changed_by_id, changedByName: r.changed_by_name,
      changeSummary: summary, hash: r.hash, createdAt: r.created_at
    };
  });
  // 同时返回当前版本，前端可对比"最后一次修改后 vs 修改前"
  let currentData = {};
  try { currentData = JSON.parse(rec.data || '{}'); } catch(e){ currentData = {}; }
  res.json({
    record: { id: rec.id, patientName: rec.patient_name, patientPhone: rec.patient_phone, visitDate: rec.visit_date, currentData: currentData, updatedAt: rec.updated_at },
    versions: out
  });
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
    const oldNameRow = db.prepare('SELECT patient_name FROM medical_records WHERE patient_phone = ? LIMIT 1').get(oldPhone);
    const updated = apply();
    // 记录更正前后的姓名/手机号，确保"谁改了患者身份信息"可追溯（PDPA 更正原则）
    appendAuditLog(req.admin.sub, req.admin.name, 'update-patient', 'medical_record', null, oldPhone,
      JSON.stringify({
        oldName: oldNameRow ? oldNameRow.patient_name : '',
        newName: cleanNewName,
        oldPhone: oldPhone,
        newPhone: cleanNewPhone,
        updated: updated
      }));
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
