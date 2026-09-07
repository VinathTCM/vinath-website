// routes/prescriptions.js —— 电子处方：SENIOR+PRACTITIONER可用，关联预约时自动把处方摘要写入那条预约的treatments
const express = require('express');
const db = require('../db');
const { authMiddleware, requireModuleAccess } = require('../middleware/auth');
const { visiblePatientPhonesFor } = require('./visibility');

const router = express.Router();

const FORMULA_TYPE_LABELS = { granule:'颗粒剂', decoction:'饮片', pill:'丸剂', powder:'散剂' };

function serializePrescription(p){
  return { ...p, items: JSON.parse(p.items || '[]') };
}

router.get('/admin/prescriptions', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const { patientPhone } = req.query;
  let rows;
  if(req.admin.role === 'PRACTITIONER'){
    // 小管理员：只能看到自己名下"未过期"预约的病人的处方（可见规则见 visibility.js）
    const visiblePhones = visiblePatientPhonesFor(req.admin.sub, Date.now());
    if(patientPhone){
      if(visiblePhones.indexOf(patientPhone) === -1) return res.json([]);
      rows = db.prepare('SELECT * FROM prescriptions WHERE patient_phone = ? ORDER BY created_at DESC').all(patientPhone);
    } else {
      if(!visiblePhones.length) return res.json([]);
      const ph = visiblePhones.map(function(){ return '?'; }).join(',');
      rows = db.prepare('SELECT * FROM prescriptions WHERE patient_phone IN (' + ph + ') ORDER BY created_at DESC').all(...visiblePhones);
    }
  } else if(patientPhone){
    rows = db.prepare('SELECT * FROM prescriptions WHERE patient_phone = ? ORDER BY created_at DESC').all(patientPhone);
  } else {
    rows = db.prepare('SELECT * FROM prescriptions ORDER BY created_at DESC').all();
  }
  res.json(rows.map(serializePrescription));
});

router.post('/admin/prescriptions', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const { patientName, patientPhone, medicalRecordId, bookingId, formulaType, items, usageInstructions, treatments, doses, dispenseMode } = req.body;
  const validItems = (items||[]).filter(it => it.herbName && it.herbName.trim() && it.dosageGrams);
  const rxDoses = Math.max(1, Number(doses) || 1);
  const rxDispense = dispenseMode || 'herb_pickup';
  // 中药计价：单味药按价格库（RM/克 × 克数）；未定价的药材不计算并提示
  const herbTotal = validItems.reduce(function(sum, it){
    const row = db.prepare('SELECT price_per_g FROM herb_prices WHERE herb_name = ?').get(String(it.herbName).trim());
    if(row){ it.pricePerG = row.price_per_g; return sum + (row.price_per_g || 0) * (Number(it.dosageGrams) || 0); }
    it.pricePerG = null; return sum;
  }, 0);
  const pricedMissing = validItems.filter(function(it){ return it.pricePerG === null; }).map(function(it){ return it.herbName; });
  // 代煎费 RM8/剂：只有饮片(decoction)且选了代煎（自取或代送）才收
  const needsDecoct = formulaType === 'decoction' && (rxDispense === 'decoct_pickup' || rxDispense === 'decoct_delivery');
  const decoctFee = needsDecoct ? 8 * rxDoses : 0;
  const validTreatments = (treatments||[]).filter(t => t && t.name && String(t.name).trim()).map(t => ({ name: String(t.name).trim(), nameEn: t.nameEn ? String(t.nameEn).trim() : '', qty: Number(t.qty) || 1, price: Number(t.price) || 0 }));
  if(!patientName || !patientPhone) return res.status(400).json({ error: '请填写患者姓名和手机号' });
  // [fixed] 只开治疗项目（价目表）不开药材也允许保存；服法改为选填
  if(!validItems.length && !validTreatments.length) return res.status(400).json({ error: '请至少填写一味药材或一个治疗项目' });

  const createRx = db.transaction(() => {
    const id = 'rx_' + Date.now();
    db.prepare(`
      INSERT INTO prescriptions (id, patient_name, patient_phone, medical_record_id, booking_id,
        practitioner_id, practitioner_name, formula_type, items, usage_instructions,
        doses, dispense_mode, herb_total, decoct_fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, patientName, patientPhone, medicalRecordId||null, bookingId||null,
      req.admin.sub, req.admin.name, formulaType, JSON.stringify(validItems), usageInstructions,
      rxDoses, rxDispense, Number(herbTotal.toFixed(2)), Number(decoctFee.toFixed(2)));

    // [stated] 关联了预约的话，把这份处方自动加进那条预约的"治疗/商品"明细——这样订单预约管理
    // 那边现有的收据打印、当日交易统计才能看到这笔。金额留0，因为具体怎么收费是医师/管理员的
    // 判断，这里不替他们决定
    if(bookingId){
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
      if(booking){
        const bookingTreatments = JSON.parse(booking.treatments || '[]');
        const herbSummary = validItems.map(it => it.herbName + ' ' + it.dosageGrams + 'g').join('、');
        // 中药费 = 药材费 + 代煎费（写回预约明细带价格，收据/报表直接可见）
        const herbCharge = Number((herbTotal + decoctFee).toFixed(2));
        const dispenseText = { decoct_pickup:'代煎自取', decoct_delivery:'代煎代送', herb_delivery:'中药配送', herb_pickup:'中药自取' }[rxDispense] || rxDispense;
        bookingTreatments.push({ name: '中药（' + (FORMULA_TYPE_LABELS[formulaType]||formulaType) + '·' + dispenseText + '）：' + herbSummary, qty: 1, price: herbCharge });
        // 病历里勾选的价目表治疗项目也一并写入预约治疗明细（带价格，收据打印直接可见）
        validTreatments.forEach(t => bookingTreatments.push({ name: t.name, qty: t.qty, price: t.price }));
        db.prepare('UPDATE bookings SET treatments = ? WHERE id = ?').run(JSON.stringify(bookingTreatments), bookingId);
      }
    }
    return db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id);
  });

  try {
    const rx = createRx();
    const result = serializePrescription(rx);
    result.herbTotal = Number(herbTotal.toFixed(2));
    result.decoctFee = decoctFee;
    result.doses = rxDoses;
    result.dispenseMode = rxDispense;
    result.pricedMissing = pricedMissing;
    res.status(201).json(result);
  } catch(e){
    console.error(e);
    res.status(500).json({ error: '提交失败，请稍后重试' });
  }
});

router.put('/admin/prescriptions/:id', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const existing = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '处方不存在' });
  const { formulaType, items, usageInstructions, treatments, doses, dispenseMode, medicalRecordId, bookingId } = req.body;
  const validItems = (items||[]).filter(it => it.herbName && it.herbName.trim() && it.dosageGrams);
  const rxDoses = Math.max(1, Number(doses) || 1);
  const rxDispense = dispenseMode || existing.dispense_mode || 'herb_pickup';
  // 中药计价：单味药按价格库（RM/克 × 克数）；未定价的药材不计算并提示
  const herbTotal = validItems.reduce(function(sum, it){
    const row = db.prepare('SELECT price_per_g FROM herb_prices WHERE herb_name = ?').get(String(it.herbName).trim());
    if(row){ it.pricePerG = row.price_per_g; return sum + (row.price_per_g || 0) * (Number(it.dosageGrams) || 0); }
    it.pricePerG = null; return sum;
  }, 0);
  const pricedMissing = validItems.filter(function(it){ return it.pricePerG === null; }).map(function(it){ return it.herbName; });
  const needsDecoct = formulaType === 'decoction' && (rxDispense === 'decoct_pickup' || rxDispense === 'decoct_delivery');
  const decoctFee = needsDecoct ? 8 * rxDoses : 0;
  const validTreatments = (treatments||[]).filter(t => t && t.name && String(t.name).trim()).map(t => ({ name: String(t.name).trim(), nameEn: t.nameEn ? String(t.nameEn).trim() : '', qty: Number(t.qty) || 1, price: Number(t.price) || 0 }));
  db.prepare('UPDATE prescriptions SET formula_type = ?, items = ?, usage_instructions = ?, doses = ?, dispense_mode = ?, herb_total = ?, decoct_fee = ?, medical_record_id = ?, booking_id = ? WHERE id = ?')
    .run(formulaType || existing.formula_type, JSON.stringify(validItems), usageInstructions ?? existing.usage_instructions,
      rxDoses, rxDispense, Number(herbTotal.toFixed(2)), Number(decoctFee.toFixed(2)), medicalRecordId || null, bookingId || null, req.params.id);
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  const result = serializePrescription(rx);
  result.herbTotal = Number(herbTotal.toFixed(2));
  result.decoctFee = decoctFee;
  result.doses = rxDoses;
  result.dispenseMode = rxDispense;
  result.pricedMissing = pricedMissing;
  res.json(result);
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
