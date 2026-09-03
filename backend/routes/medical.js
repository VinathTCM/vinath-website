// routes/medical.js —— 电子病历：SENIOR+PRACTITIONER可用，具体问诊字段整体存JSON（字段还可能调整，不为每次调整都写数据库迁移）
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();

function serializeRecord(r){
  return { ...r, data: JSON.parse(r.data || '{}') };
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
  if(patientPhone){
    rows = db.prepare('SELECT * FROM medical_records WHERE patient_phone = ? ORDER BY visit_date DESC').all(patientPhone);
    logAccess(req, 'view', null, patientPhone);
  } else {
    rows = db.prepare('SELECT * FROM medical_records ORDER BY visit_date DESC').all();
    logAccess(req, 'view', null, null); // 没传手机号=查看全部病历列表，这种更该记
  }
  res.json(rows.map(serializeRecord));
});

// 患者列表（按手机号去重，带就诊次数和最近一次日期）——电子病历首页的患者列表用
router.get('/admin/medical-records/patients', authMiddleware, requireModuleAccess('medicalRecords'), (req, res) => {
  const rows = db.prepare('SELECT patient_phone, patient_name, visit_date FROM medical_records').all();
  const byPhone = {};
  rows.forEach(r => {
    if(!byPhone[r.patient_phone]){
      byPhone[r.patient_phone] = { phone: r.patient_phone, name: r.patient_name, count: 0, lastVisit: r.visit_date };
    }
    byPhone[r.patient_phone].count++;
    if(r.visit_date > byPhone[r.patient_phone].lastVisit){
      byPhone[r.patient_phone].lastVisit = r.visit_date;
      byPhone[r.patient_phone].name = r.patient_name;
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

module.exports = router;
