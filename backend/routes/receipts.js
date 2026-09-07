// routes/receipts.js —— 电子收据：SENIOR+PRACTITIONER可用，开具时快照医师姓名/注册号/APC号（收据不该因为医师资料后续更新而跟着变）
// 兼容两种开票：e-Invoice分类金额式（items对象）+ 项目明细式（lineItems数组，病历页"保存并打印发票"用）
const express = require('express');
const db = require('../db');
const { authMiddleware, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();

function serializeReceipt(r){
  const out = { ...r, items: JSON.parse(r.items || '{}') };
  out.lineItems = [];
  try { out.lineItems = JSON.parse(r.line_items || '[]'); } catch(e){}
  return out;
}
function genReceiptNo(){
  const year = new Date().getFullYear();
  const count = db.prepare("SELECT COUNT(*) as c FROM receipts WHERE receipt_no LIKE ?").get('VN-' + year + '-%').c;
  return 'VN-' + year + '-' + String(count + 1).padStart(5, '0');
}

router.get('/admin/receipts', authMiddleware, requireModuleAccess('receipts'), (req, res) => {
  const rows = db.prepare('SELECT * FROM receipts ORDER BY issued_at DESC').all();
  res.json(rows.map(serializeReceipt));
});

router.post('/admin/receipts', authMiddleware, requireModuleAccess('receipts'), (req, res) => {
  const { patientName, patientPhone, practitionerId, practitionerNameSnapshot, practitionerMohRegNo, practitionerApcNo,
    items, tcmDiagnosisSnapshot, paymentMethod, paymentStatus, lineItems } = req.body;
  if(!patientName || !patientPhone) return res.status(400).json({ error: '请填写患者姓名和手机号' });
  if(!practitionerNameSnapshot) return res.status(400).json({ error: '请选择医师' });

  // 兼容两种明细输入：分类金额对象（原有），或项目明细数组（病历页价目表直选）
  let detailItems = (lineItems || []).filter(function(it){ return it && it.name && String(it.name).trim(); })
    .map(function(it){ return { name: String(it.name).trim(), qty: Number(it.qty) || 1, price: Number(it.price) || 0 }; });
  const totalAmount = detailItems.length
    ? detailItems.reduce(function(s, it){ return s + it.price * it.qty; }, 0)
    : ['consultation','transport','medication','other'].reduce((s,k) => s + (Number(items && items[k]) || 0), 0);

  const id = 'rc_' + Date.now();
  const receiptNo = genReceiptNo();
  db.prepare(`
    INSERT INTO receipts (id, receipt_no, patient_name, patient_phone, practitioner_id, practitioner_name_snapshot,
      practitioner_moh_reg_no, practitioner_apc_no, items, line_items, total_amount, tcm_diagnosis_snapshot, payment_method, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, receiptNo, patientName, patientPhone, practitionerId||null, practitionerNameSnapshot,
    practitionerMohRegNo||null, practitionerApcNo||null, JSON.stringify(items||{}), JSON.stringify(detailItems),
    totalAmount, tcmDiagnosisSnapshot||null, paymentMethod||null, paymentStatus||null);
  const row = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
  res.status(201).json(serializeReceipt(row));
});

module.exports = router;
