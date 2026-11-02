// routes/receipts.js —— 电子收据：SENIOR+PRACTITIONER可用，开具时快照医师姓名/注册号/APC号（收据不该因为医师资料后续更新而跟着变）
// 兼容两种开票：e-Invoice分类金额式（items对象）+ 项目明细式（lineItems数组，病历页"保存并打印发票"用）
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole, requireModuleAccess, appendAuditLog } = require('../middleware/auth');

const router = express.Router();

function serializeReceipt(r){
  const out = { ...r, items: JSON.parse(r.items || '{}') };
  out.lineItems = [];
  try { out.lineItems = JSON.parse(r.line_items || '[]'); } catch(e){}
  return out;
}
// 全站唯一连续编号 VN-YYYY-NNNNN（马来西亚报税要求发票/小票编号连号、不重复、不跳号）。
// 计数器存 invoice_seq 表（事务内原子 +1）；同一年内删除某张票也不会回退，新号从最大继续。
function allocateInvoiceNo(){
  const year = new Date().getFullYear();
  const row = db.prepare('SELECT last_no FROM invoice_seq WHERE year = ?').get(year);
  const next = (row ? Number(row.last_no) : 0) + 1;
  db.prepare('INSERT INTO invoice_seq (year, last_no) VALUES (?, ?) ON CONFLICT(year) DO UPDATE SET last_no = excluded.last_no').run(year, next);
  return 'VN-' + year + '-' + String(next).padStart(5, '0');
}
function genReceiptNo(){ return allocateInvoiceNo(); }

router.get('/admin/receipts', authMiddleware, requireModuleAccess('receipts'), (req, res) => {
  const rows = db.prepare('SELECT * FROM receipts ORDER BY issued_at DESC').all();
  res.json(rows.map(serializeReceipt));
});

router.post('/admin/receipts', authMiddleware, requireModuleAccess('receipts'), (req, res) => {
  const { patientName, patientPhone, practitionerId, practitionerNameSnapshot, practitionerMohRegNo, practitionerApcNo,
    items, tcmDiagnosisSnapshot, paymentMethod, paymentStatus, lineItems, sourceType, sourceId } = req.body;
  if(!patientName || !patientPhone) return res.status(400).json({ error: '请填写患者姓名和手机号' });
  if(!practitionerNameSnapshot) return res.status(400).json({ error: '请选择医师' });

  // 兼容两种明细输入：分类金额对象（原有），或项目明细数组（病历页价目表直选）
  // 明细额外保留 category（rx 处方药材 / treatment 治疗 / product 商品 / discount 折扣）与 nameEn，
  // 这样账本导出、双语发票才能按类型分列；折扣行 price 为负数，下面 total 的求和会自动扣减
  let detailItems = (lineItems || []).filter(function(it){ return it && it.name && String(it.name).trim(); })
    .map(function(it){ return { name: String(it.name).trim(), nameEn: it.nameEn ? String(it.nameEn).trim() : '', category: it.category ? String(it.category).trim() : '', qty: Number(it.qty) || 1, price: Number(it.price) || 0 }; });
  const totalAmount = detailItems.length
    ? detailItems.reduce(function(s, it){ return s + it.price * it.qty; }, 0)
    : ['consultation','transport','medication','other'].reduce((s,k) => s + (Number(items && items[k]) || 0), 0);

  // 同一来源（病历/订单）重复打印：复用已有收据，更新明细与合计，保留原 receipt_no 与 issued_at——
  // 打印本身不占新编号，保证连号不被重复打印烧掉（报税连号要求）
  if(sourceType && sourceId){
    const reused = db.prepare('SELECT * FROM receipts WHERE source_type = ? AND source_id = ?').get(sourceType, sourceId);
    if(reused){
      db.prepare(`
        UPDATE receipts SET items = ?, line_items = ?, total_amount = ?, payment_method = ?, payment_status = ?, tcm_diagnosis_snapshot = ?
        WHERE id = ?
      `).run(JSON.stringify(items||{}), JSON.stringify(detailItems), totalAmount,
        paymentMethod || reused.payment_method, paymentStatus || reused.payment_status,
        tcmDiagnosisSnapshot !== undefined ? (tcmDiagnosisSnapshot || null) : reused.tcm_diagnosis_snapshot,
        reused.id);
      appendAuditLog(req.admin.sub, req.admin.name, 'update', 'receipt', reused.id, patientPhone,
        JSON.stringify({ oldTotal: reused.total_amount, newTotal: totalAmount, lineItemsCount: detailItems.length, receiptNo: reused.receipt_no, reused: 1 }));
      const row = db.prepare('SELECT * FROM receipts WHERE id = ?').get(reused.id);
      return res.json(serializeReceipt(row));
    }
  }

  const id = 'rc_' + Date.now();
  const receiptNo = genReceiptNo();
  db.prepare(`
    INSERT INTO receipts (id, receipt_no, patient_name, patient_phone, practitioner_id, practitioner_name_snapshot,
      practitioner_moh_reg_no, practitioner_apc_no, items, line_items, total_amount, tcm_diagnosis_snapshot, payment_method, payment_status, source_type, source_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, receiptNo, patientName, patientPhone, practitionerId||null, practitionerNameSnapshot,
    practitionerMohRegNo||null, practitionerApcNo||null, JSON.stringify(items||{}), JSON.stringify(detailItems),
    totalAmount, tcmDiagnosisSnapshot||null, paymentMethod||null, paymentStatus||null,
    sourceType||null, sourceId||null);
  const row = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
  res.status(201).json(serializeReceipt(row));
});

// 订单/批发发票取连号：首次打印发票时分配（存 orders.invoice_no / wholesale_orders.invoice_no），此后重复打印复用同一号码
router.post('/admin/invoices/alloc', authMiddleware, requireRole('SENIOR', 'FULFILLMENT', 'PRACTITIONER'), (req, res) => {
  const orderId = req.body && req.body.orderId;
  const table = (req.body && req.body.table) === 'wholesale' ? 'wholesale_orders' : 'orders';
  if(!orderId) return res.status(400).json({ error: '缺少订单ID' });
  const order = db.prepare('SELECT * FROM ' + table + ' WHERE id = ?').get(orderId);
  if(!order) return res.status(404).json({ error: '订单不存在' });
  if(order.invoice_no) return res.json({ invoiceNo: order.invoice_no });
  const invoiceNo = allocateInvoiceNo();
  db.prepare('UPDATE ' + table + ' SET invoice_no = ? WHERE id = ?').run(invoiceNo, orderId);
  res.json({ invoiceNo });
});

router.put('/admin/receipts/:id', authMiddleware, requireModuleAccess('receipts'), (req, res) => {
  const existing = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '收据不存在' });

  // 只更新明细 / 分类金额 / 付款信息；receipt_no、issued_at（原开单时间）、患者与医师快照全部保留——
  // 改明细重新导出时，收据号与开单时间不因补正而改变
  const { lineItems, items, paymentMethod, paymentStatus, tcmDiagnosisSnapshot } = req.body;

  // 明细清洗与 POST 完全一致（含负价折扣行）
  const detailItems = (lineItems || []).filter(function(it){ return it && it.name && String(it.name).trim(); })
    .map(function(it){ return { name: String(it.name).trim(), nameEn: it.nameEn ? String(it.nameEn).trim() : '', category: it.category ? String(it.category).trim() : '', qty: Number(it.qty) || 1, price: Number(it.price) || 0 }; });
  const totalAmount = detailItems.length
    ? detailItems.reduce(function(s, it){ return s + it.price * it.qty; }, 0)
    : ['consultation','transport','medication','other'].reduce((s,k) => s + (Number(items && items[k]) || 0), 0);

  const newItems = items ? JSON.stringify(items) : existing.items;
  const newLineItems = detailItems.length ? JSON.stringify(detailItems) : existing.line_items;

  db.prepare(`
    UPDATE receipts SET items = ?, line_items = ?, total_amount = ?, payment_method = ?, payment_status = ?, tcm_diagnosis_snapshot = ?
    WHERE id = ?
  `).run(newItems, newLineItems, totalAmount,
    paymentMethod !== undefined ? (paymentMethod || null) : existing.payment_method,
    paymentStatus !== undefined ? (paymentStatus || null) : existing.payment_status,
    tcmDiagnosisSnapshot !== undefined ? (tcmDiagnosisSnapshot || null) : existing.tcm_diagnosis_snapshot,
    req.params.id);

  // 收据修改同样留痕：谁、什么时候、把哪张收据的合计从多少改成了多少（与病历留痕同一张日志表）
  appendAuditLog(req.admin.sub, req.admin.name, 'update', 'receipt',
    req.params.id, existing.patient_phone,
    JSON.stringify({ oldTotal: existing.total_amount, newTotal: totalAmount, lineItemsCount: detailItems.length, receiptNo: existing.receipt_no }));

  const row = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id);
  res.json(serializeReceipt(row));
});

router.delete('/admin/receipts/:id', authMiddleware, requireModuleAccess('receipts'), (req, res) => {
  const info = db.prepare('DELETE FROM receipts WHERE id = ?').run(req.params.id);
  if(!info.changes) return res.status(404).json({ error: '收据不存在' });
  res.json({ ok: true, deleted: info.changes });
});

module.exports = router;
