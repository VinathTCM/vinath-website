// routes/formulas.js —— 个人协定方：每位管理员各自维护自己的协定方组合，互不互通。
// 开方时可一键载入基础方再加减。仅 SENIOR / PRACTITIONER（有 prescriptions 开关）可用。
const express = require('express');
const db = require('../db');
const { authMiddleware, requireModuleAccess } = require('../middleware/auth');

const router = express.Router();

function serializeFormula(f){
  return Object.assign({}, f, { items: JSON.parse(f.items || '[]') });
}

// 当前管理员的协定方列表（只返回自己的）
router.get('/admin/personal-formulas', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const rows = db.prepare('SELECT * FROM personal_formulas WHERE practitioner_id = ? ORDER BY updated_at DESC, created_at DESC').all(req.admin.sub);
  res.json(rows.map(serializeFormula));
});

router.post('/admin/personal-formulas', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const { name, formulaType, items, usageInstructions } = req.body;
  if(!name || !String(name).trim()) return res.status(400).json({ error: '请填写协定方名称' });
  const validItems = (items || []).filter(function(it){ return it && it.herbName && String(it.herbName).trim() && it.dosageGrams; });
  if(!validItems.length) return res.status(400).json({ error: '请至少填写一味药材及剂量' });
  const id = 'formula_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  db.prepare(`
    INSERT INTO personal_formulas (id, practitioner_id, practitioner_name, name, formula_type, items, usage_instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.admin.sub, req.admin.name, String(name).trim(), formulaType || 'granule', JSON.stringify(validItems), usageInstructions || '');
  const row = db.prepare('SELECT * FROM personal_formulas WHERE id = ?').get(id);
  res.status(201).json(serializeFormula(row));
});

router.put('/admin/personal-formulas/:id', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const existing = db.prepare('SELECT * FROM personal_formulas WHERE id = ? AND practitioner_id = ?').get(req.params.id, req.admin.sub);
  if(!existing) return res.status(404).json({ error: '协定方不存在或不属于你' });
  const { name, formulaType, items, usageInstructions } = req.body;
  if(name !== undefined && !String(name).trim()) return res.status(400).json({ error: '请填写协定方名称' });
  const validItems = (items || []).filter(function(it){ return it && it.herbName && String(it.herbName).trim() && it.dosageGrams; });
  if(items && !validItems.length) return res.status(400).json({ error: '请至少填写一味药材及剂量' });
  db.prepare(`
    UPDATE personal_formulas
    SET name = ?, formula_type = ?, items = ?, usage_instructions = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name !== undefined ? String(name).trim() : existing.name,
    formulaType || existing.formula_type,
    items ? JSON.stringify(validItems) : existing.items,
    usageInstructions !== undefined ? (usageInstructions || '') : existing.usage_instructions,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM personal_formulas WHERE id = ?').get(req.params.id);
  res.json(serializeFormula(row));
});

router.delete('/admin/personal-formulas/:id', authMiddleware, requireModuleAccess('prescriptions'), (req, res) => {
  const result = db.prepare('DELETE FROM personal_formulas WHERE id = ? AND practitioner_id = ?').run(req.params.id, req.admin.sub);
  if(result.changes === 0) return res.status(404).json({ error: '协定方不存在或不属于你' });
  res.json({ ok: true });
});

module.exports = router;
