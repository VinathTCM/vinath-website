// routes/auth.js —— 管理员账号：注册（首次设置密码）、登录、改密码、重置他人密码
// ⚠️ 重要：这个文件整体挂载在 /api/auth 下（见server.js），跟其他11个路由文件都直接挂载在
// /api 下不一样！这意味着下面所有路由的真实访问路径都带着/auth前缀，比如这个文件里写的
// router.post('/admin/admins', ...) 真实路径是 POST /api/auth/admin/admins，不是
// /api/admin/admins——调这个文件里任何接口时，URL都要在API_BASE后面先加/auth再加剩下的路径。
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, requireRole, logAdminAction, signToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { adminId, password } = req.body;
  if(!adminId || !password || password.length < 4){
    return res.status(400).json({ error: '参数不完整，密码至少4位' });
  }
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
  if(!admin) return res.status(404).json({ error: '找不到这个管理员账号' });
  if(admin.password_hash) return res.status(409).json({ error: '这个账号已经设置过密码了，请直接登录' });

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, adminId);
  const token = signToken(admin);
  res.json({ token, admin: { id: admin.id, name: admin.name, role: admin.role, regions: JSON.parse(admin.regions || '[]') } });
});

router.post('/login', async (req, res) => {
  const { adminId, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
  if(!admin || !admin.password_hash){
    return res.status(401).json({ error: '账号不存在或还没设置密码' });
  }
  const valid = await bcrypt.compare(password, admin.password_hash);
  if(!valid) return res.status(401).json({ error: '密码不对' });

  const token = signToken(admin);
  res.json({ token, admin: { id: admin.id, name: admin.name, role: admin.role, regions: JSON.parse(admin.regions || '[]') } });
});

router.post('/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if(!newPassword || newPassword.length < 4){
    return res.status(400).json({ error: '新密码至少4位' });
  }
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.sub);
  const valid = await bcrypt.compare(oldPassword, admin.password_hash);
  if(!valid) return res.status(401).json({ error: '当前密码不对' });

  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.admin.sub);
  res.json({ ok: true });
});

router.post('/reset-password/:adminId', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT name FROM admins WHERE id = ?').get(req.params.adminId);
  db.prepare('UPDATE admins SET password_hash = NULL WHERE id = ?').run(req.params.adminId);
  logAdminAction(req, 'update', 'admin_password_reset', req.params.adminId, existing ? existing.name : null);
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  const admin = db.prepare('SELECT id, name, role, regions FROM admins WHERE id = ?').get(req.admin.sub);
  if(!admin) return res.status(404).json({ error: '账号不存在' });
  res.json({ ...admin, regions: JSON.parse(admin.regions || '[]') });
});

router.get('/admins', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const admins = db.prepare('SELECT id, name, role, regions, accepting_orders, coupon_code, license_expiry, avatar, specialty, title, creds, moh_reg_no, apc_no, description, tags FROM admins').all();
  res.json(admins.map(a => ({
    id: a.id, name: a.name, role: a.role, regions: JSON.parse(a.regions || '[]'),
    acceptingOrders: !!a.accepting_orders, couponCode: a.coupon_code, licenseExpiry: a.license_expiry,
    avatar: a.avatar, specialty: a.specialty, title: a.title, creds: a.creds,
    mohRegNo: a.moh_reg_no, apcNo: a.apc_no, desc: a.description, tags: JSON.parse(a.tags || '[]')
  })));
});

// ---- 公开接口：客户端居家会诊选医师用，不需要登录，只给看得见摸得着的展示字段 ----
router.get('/practitioners', (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, role, regions, moh_reg_no, apc_no, avatar, specialty, title, creds, description, tags FROM admins
    WHERE role IN ('SENIOR','PRACTITIONER') AND (accepting_orders = 1 OR role = 'SENIOR')
  `).all();
  res.json(rows.map(a => ({
    id: a.id, name: a.name, regions: JSON.parse(a.regions || '[]'), mohRegNo: a.moh_reg_no, apcNo: a.apc_no,
    avatar: a.avatar, specialty: a.specialty, title: a.title, creds: a.creds, desc: a.description, tags: JSON.parse(a.tags || '[]')
  })));
});

// 公开接口：结算页面验证客户输入的优惠码时用，只给"码对应谁"这两个字段，不泄露其他信息
router.get('/coupon-codes', (req, res) => {
  const rows = db.prepare("SELECT coupon_code, name FROM admins WHERE coupon_code IS NOT NULL").all();
  res.json(rows.map(a => ({ code: a.coupon_code, name: a.name })));
});

router.put('/admin/admins/:id/coupon-code', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { code } = req.body;
  if(!code || !/^[A-Z0-9]{3,20}$/.test(code)){
    return res.status(400).json({ error: '优惠码只能是3-20位英文字母或数字' });
  }
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if(!admin) return res.status(404).json({ error: '账号不存在' });
  const dup = db.prepare('SELECT id FROM admins WHERE coupon_code = ? AND id != ?').get(code, req.params.id);
  if(dup) return res.status(409).json({ error: '这个优惠码已经被别人用了，换一个试试' });
  db.prepare('UPDATE admins SET coupon_code = ? WHERE id = ?').run(code, req.params.id);
  logAdminAction(req, 'update', 'coupon_code', req.params.id, admin.name+'：'+(admin.coupon_code||'（无）')+' → '+code);
  res.json({ ok: true, code });
});

router.put('/admin/admins/:id/credentials', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { mohRegNo, apcNo } = req.body;
  const admin = db.prepare('SELECT id FROM admins WHERE id = ?').get(req.params.id);
  if(!admin) return res.status(404).json({ error: '账号不存在' });
  db.prepare('UPDATE admins SET moh_reg_no = ?, apc_no = ? WHERE id = ?').run(mohRegNo||null, apcNo||null, req.params.id);
  res.json({ ok: true });
});

// ---- 公开接口：登录界面用，列出全部真实存在的账号（不分大小管理员），不需要登录就能看到"有哪些人可以登录"
// 这是纯展示用途——真正登录还是要走 /login，光知道id和名字登不进去 ----
router.get('/login-options', (req, res) => {
  const rows = db.prepare('SELECT id, name, role, regions FROM admins ORDER BY (role=\'SENIOR\') DESC, rowid ASC').all();
  res.json(rows.map(a => ({ id: a.id, name: a.name, role: a.role, regions: JSON.parse(a.regions || '[]') })));
});

function genJuniorId(){
  // 简单粗暴地找一个还没被用过的 j2/j3/j4... 编号，跟种子数据里 j1 的命名方式保持一致
  let n = 2;
  while(db.prepare('SELECT id FROM admins WHERE id = ?').get('j' + n)) n++;
  return 'j' + n;
}

// ---- 小管理员（I类执业医师/II类出货员/III类客服）完整管理：只有大管理员能操作 ----
router.post('/admin/admins', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const { name, role, regions, licenseExpiry, specialty } = req.body;
  if(!name || !['PRACTITIONER','FULFILLMENT','SUPPORT'].includes(role)){
    return res.status(400).json({ error: '姓名和角色类型是必填的' });
  }
  if(role==='PRACTITIONER' && (!regions || !regions.length)){
    return res.status(400).json({ error: 'I类执业医师至少要分配一个服务地区' });
  }
  const id = genJuniorId();
  db.prepare(`
    INSERT INTO admins (id, name, role, regions, accepting_orders, license_expiry, specialty)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(id, name, role, JSON.stringify(role==='PRACTITIONER' ? regions : []), role==='PRACTITIONER' ? (licenseExpiry||null) : null, specialty||null);
  logAdminAction(req, 'create', 'admin_account', id, name+'（'+role+'）');
  res.status(201).json({ id, name, role });
});

router.put('/admin/admins/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '账号不存在' });
  if(existing.role === 'SENIOR') return res.status(403).json({ error: '大管理员账号不能通过这个接口修改' });
  const { name, regions, licenseExpiry, specialty, avatar } = req.body;
  db.prepare(`
    UPDATE admins SET name = ?, regions = ?, license_expiry = ?, specialty = ?, avatar = ? WHERE id = ?
  `).run(
    name ?? existing.name,
    regions ? JSON.stringify(existing.role==='PRACTITIONER' ? regions : []) : existing.regions,
    licenseExpiry !== undefined ? licenseExpiry : existing.license_expiry,
    specialty !== undefined ? specialty : existing.specialty,
    avatar !== undefined ? avatar : existing.avatar,
    req.params.id
  );
  res.json({ ok: true });
});

router.put('/admin/admins/:id/accepting-orders', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  // 医师自己也能关/开自己的接单开关（对应之前前端"接单开关"那个功能），大管理员能操作任何人的
  if(req.admin.role !== 'SENIOR' && req.admin.sub !== req.params.id){
    return res.status(403).json({ error: '只能操作自己的接单状态' });
  }
  const { accepting } = req.body;
  db.prepare('UPDATE admins SET accepting_orders = ? WHERE id = ?').run(accepting ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// 硬删除，跟原本localStorage版本的行为一致——历史订单/预约里引用的名字是当时的快照，
// 不会因为账号被删就跟着消失或报错，只是这个id以后再也登不进去、也不会再被匹配到新单
router.delete('/admin/admins/:id', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT role, name FROM admins WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '账号不存在' });
  if(existing.role === 'SENIOR') return res.status(403).json({ error: '大管理员账号不能删除' });
  db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
  logAdminAction(req, 'delete', 'admin_account', req.params.id, existing.name+'（'+existing.role+'）');
  res.json({ ok: true });
});

// 医师"公开展示资料"——职称/资质文字/简介/标签/擅长领域/头像/出诊地区/MOH注册号/APC号一次性保存。
// 不像上面几个接口那样限制"大管理员账号不能改"——这里存的是公开简介内容，不是账号结构，
// 大管理员编辑自己或任何人的资料都应该允许。
router.put('/admin/admins/:id/profile', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const existing = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if(!existing) return res.status(404).json({ error: '账号不存在' });
  const { title, creds, mohRegNo, apcNo, specialty, desc, tags, regions, avatar } = req.body;
  db.prepare(`
    UPDATE admins SET title = ?, creds = ?, moh_reg_no = ?, apc_no = ?, specialty = ?,
      description = ?, tags = ?, regions = ?, avatar = ? WHERE id = ?
  `).run(
    title ?? existing.title, creds ?? existing.creds,
    mohRegNo ?? existing.moh_reg_no, apcNo ?? existing.apc_no,
    specialty ?? existing.specialty, desc ?? existing.description,
    JSON.stringify(tags || []), JSON.stringify(regions || []),
    avatar ?? existing.avatar, req.params.id
  );
  res.json({ ok: true });
});

module.exports = router;
