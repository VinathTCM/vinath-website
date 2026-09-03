// routes/prescriptions.js —— 电子处方：SENIOR+PRACTITIONER可用，关联预约时自动把处方摘要写入那条预约的treatments
const express = require('express');
const db = require('../db');
const { authMiddleware, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();

const FORMULA_TYPE_LABELS = { granule:'颗粒剂', decoction:'饮片', pill:'丸剂', powder:'散剂' };

function serializePrescription(p){
  return { ...p, items: JSON.parse(p.items || '[]') };
}

router.get('/admin/prescriptions', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const { patientPhone } = req.query;
  let rows;
  if(patientPhone){
    rows = db.prepare('SELECT * FROM prescriptions WHERE patient_phone = ? ORDER BY created_at DESC').all(patientPhone);
  } else {
    rows = db.prepare('SELECT * FROM prescriptions ORDER BY created_at DESC').all();
  }
  res.json(rows.map(serializePrescription));
});

router.post('/admin/prescriptions', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const { patientName, patientPhone, medicalRecordId, bookingId, formulaType, items, usageInstructions } = req.body;
  const validItems = (items||[]).filter(it => it.herbName && it.herbName.trim() && it.dosageGrams);
  if(!patientName || !patientPhone) return res.status(400).json({ error: '请填写患者姓名和手机号' });
  if(!validItems.length) return res.status(400).json({ error: '请至少填写一味药材及剂量' });
  if(!usageInstructions) return res.status(400).json({ error: '请填写服法' });

  const createRx = db.transaction(() => {
    const id = 'rx_' + Date.now();
    db.prepare(`
      INSERT INTO prescriptions (id, patient_name, patient_phone, medical_record_id, booking_id,
        practitioner_id, practitioner_name, formula_type, items, usage_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientName, patientPhone, medicalRecordId||null, bookingId||null,
      req.admin.sub, req.admin.name, formulaType, JSON.stringify(validItems), usageInstructions);

    // [stated] 关联了预约的话，把这份处方自动加进那条预约的"治疗/商品"明细——这样订单预约管理
    // 那边现有的收据打印、当日交易统计才能看到这笔。金额留0，因为具体怎么收费是医师/管理员的
    // 判断，这里不替他们决定
    if(bookingId){
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
      if(booking){
        const treatments = JSON.parse(booking.treatments || '[]');
        const herbSummary = validItems.map(it => it.herbName + ' ' + it.dosageGrams + 'g').join('、');
        treatments.push({ name: '电子处方（' + (FORMULA_TYPE_LABELS[formulaType]||formulaType) + '）：' + herbSummary, qty: 1, price: 0 });
        db.prepare('UPDATE bookings SET treatments = ? WHERE id = ?').run(JSON.stringify(treatments), bookingId);
      }
    }
    return db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id);
  });

  try {
    const rx = createRx();
    res.status(201).json(serializePrescription(rx));
  } catch(e){
    console.error(e);
    res.status(500).json({ error: '提交失败，请稍后重试' });
  }
});

router.put('/admin/prescriptions/:id/status', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const { status, logisticsProvider, trackingId } = req.body;
  const existing = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '处方不存在' });
  db.prepare('UPDATE prescriptions SET status = ?, logistics_provider = ?, tracking_id = ? WHERE id = ?')
    .run(status || existing.status, logisticsProvider ?? existing.logistics_provider, trackingId ?? existing.tracking_id, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
