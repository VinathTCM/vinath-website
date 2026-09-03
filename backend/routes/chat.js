// routes/chat.js —— 客户咨询聊天：客户端公开接口(凭customerId，浏览器生成的随机id，不是真实账号体系)+管理员认证接口
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

const WELCOME_TEXT = '您好，欢迎咨询VINATH！我们会尽快回复您的消息。如果比较着急，也可以点击「相约」直接预约医师上门，或拨打客服电话。';

function serializeThread(t){
  return { ...t, unreadForAdmin: !!t.unread_for_admin, unreadForCustomer: !!t.unread_for_customer };
}
function serializeMessage(m){
  return { from: m.from_role, fromName: m.from_name, text: m.text, time: m.created_at };
}
// 第一线联系人——固定用大管理员里第一个（跟原本前端 getDefaultSenior() 的兜底逻辑一致，
// 这里没有做成"可配置"是因为目前只有这一种默认分配规则在用）
function getDefaultAssignee(){
  return db.prepare("SELECT id, name FROM admins WHERE role = 'SENIOR' ORDER BY rowid ASC LIMIT 1").get();
}

// ---- 客户端：公开接口，凭customerId(浏览器随机生成、存在localStorage里)标识身份 ----
router.post('/chat/ensure-thread', (req, res) => {
  const { customerId, customerName } = req.body;
  if(!customerId) return res.status(400).json({ error: '缺少customerId' });
  let thread = db.prepare('SELECT * FROM chat_threads WHERE customer_id = ?').get(customerId);
  if(!thread){
    const assignee = getDefaultAssignee();
    if(!assignee) return res.status(500).json({ error: '系统还没有配置任何客服人员' });
    const id = 'cc_' + Date.now();
    db.prepare('INSERT INTO chat_threads (id, customer_id, customer_name, assigned_to_id, assigned_to_name) VALUES (?, ?, ?, ?, ?)')
      .run(id, customerId, customerName||null, assignee.id, assignee.name);
    db.prepare('INSERT INTO chat_messages (id, thread_id, from_role, from_name, text) VALUES (?, ?, ?, ?, ?)')
      .run('msg_' + Date.now(), id, 'admin', '系统', WELCOME_TEXT);
    thread = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(id);
  } else if(customerName && !thread.customer_name){
    db.prepare('UPDATE chat_threads SET customer_name = ? WHERE id = ?').run(customerName, thread.id);
    thread = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(thread.id);
  }
  const messages = db.prepare('SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC').all(thread.id);
  res.json({ thread: serializeThread(thread), messages: messages.map(serializeMessage) });
});

// 客户端轮询：看有没有新回复；同时清掉"客户未读"标记（客户看了就不算未读了）
router.get('/chat/threads/:customerId', (req, res) => {
  const thread = db.prepare('SELECT * FROM chat_threads WHERE customer_id = ?').get(req.params.customerId);
  if(!thread) return res.status(404).json({ error: '还没有开始对话' });
  if(thread.unread_for_customer){
    db.prepare('UPDATE chat_threads SET unread_for_customer = 0 WHERE id = ?').run(thread.id);
    thread.unread_for_customer = 0; // 数据库更新了，内存里这份也要同步改，不然下面序列化返回的还是旧值
  }
  const messages = db.prepare('SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC').all(thread.id);
  res.json({ thread: serializeThread(thread), messages: messages.map(serializeMessage) });
});

router.post('/chat/threads/:customerId/messages', (req, res) => {
  const { text } = req.body;
  if(!text || !text.trim()) return res.status(400).json({ error: '消息不能为空' });
  const thread = db.prepare('SELECT * FROM chat_threads WHERE customer_id = ?').get(req.params.customerId);
  if(!thread) return res.status(404).json({ error: '还没有开始对话，请先调用ensure-thread' });
  db.prepare('INSERT INTO chat_messages (id, thread_id, from_role, text) VALUES (?, ?, ?, ?)')
    .run('msg_' + Date.now(), thread.id, 'customer', text.trim());
  db.prepare('UPDATE chat_threads SET unread_for_admin = 1, last_message_at = CURRENT_TIMESTAMP WHERE id = ?').run(thread.id);
  res.status(201).json({ ok: true });
});

// ---- 管理员：SENIOR/SUPPORT(III类客服)看得到全部，PRACTITIONER(I类)只看转接给自己的 ----
router.get('/admin/chat/threads', authMiddleware, requireRole('SENIOR', 'PRACTITIONER', 'SUPPORT'), (req, res) => {
  let rows;
  if(req.admin.role !== 'SENIOR'){
    rows = db.prepare('SELECT * FROM chat_threads WHERE assigned_to_id = ? ORDER BY last_message_at DESC').all(req.admin.sub);
  } else {
    rows = db.prepare('SELECT * FROM chat_threads ORDER BY last_message_at DESC').all();
  }
  const withPreview = rows.map(t => {
    const last = db.prepare('SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(t.id);
    return { ...serializeThread(t), lastMessageText: last ? last.text : '' };
  });
  res.json(withPreview);
});

router.get('/admin/chat/threads/:id/messages', authMiddleware, requireRole('SENIOR', 'PRACTITIONER', 'SUPPORT'), (req, res) => {
  const thread = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(req.params.id);
  if(!thread) return res.status(404).json({ error: '对话不存在' });
  // 小管理员（医师/客服）只能看分配给自己的客户咨询，不能翻看别人客户的对话内容——
  // 大管理员不受此限制，保留监督/介入任何会话的权限
  if(req.admin.role !== 'SENIOR' && thread.assigned_to_id !== req.admin.sub){
    return res.status(403).json({ error: '这个咨询不是分配给你的' });
  }
  if(thread.unread_for_admin){
    db.prepare('UPDATE chat_threads SET unread_for_admin = 0 WHERE id = ?').run(thread.id);
    thread.unread_for_admin = 0;
  }
  const messages = db.prepare('SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC').all(thread.id);
  res.json({ thread: serializeThread(thread), messages: messages.map(serializeMessage) });
});

router.post('/admin/chat/threads/:id/messages', authMiddleware, requireRole('SENIOR', 'PRACTITIONER', 'SUPPORT'), (req, res) => {
  const { text } = req.body;
  if(!text || !text.trim()) return res.status(400).json({ error: '消息不能为空' });
  const thread = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(req.params.id);
  if(!thread) return res.status(404).json({ error: '对话不存在' });
  if(req.admin.role !== 'SENIOR' && thread.assigned_to_id !== req.admin.sub){
    return res.status(403).json({ error: '这个咨询不是分配给你的' });
  }
  db.prepare('INSERT INTO chat_messages (id, thread_id, from_role, from_name, text) VALUES (?, ?, ?, ?, ?)')
    .run('msg_' + Date.now(), thread.id, 'admin', req.admin.name, text.trim());
  db.prepare('UPDATE chat_threads SET unread_for_customer = 1, last_message_at = CURRENT_TIMESTAMP WHERE id = ?').run(thread.id);
  res.status(201).json({ ok: true });
});

router.put('/admin/chat/threads/:id/handoff', authMiddleware, requireRole('SENIOR', 'PRACTITIONER', 'SUPPORT'), (req, res) => {
  const { newAssigneeId } = req.body;
  const newAssignee = db.prepare('SELECT id, name FROM admins WHERE id = ?').get(newAssigneeId);
  if(!newAssignee) return res.status(404).json({ error: '目标账号不存在' });
  const thread = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(req.params.id);
  if(!thread) return res.status(404).json({ error: '对话不存在' });
  db.prepare('UPDATE chat_threads SET assigned_to_id = ?, assigned_to_name = ?, unread_for_customer = 1 WHERE id = ?')
    .run(newAssignee.id, newAssignee.name, thread.id);
  db.prepare('INSERT INTO chat_messages (id, thread_id, from_role, from_name, text) VALUES (?, ?, ?, ?, ?)')
    .run('msg_' + Date.now(), thread.id, 'admin', '系统', '（已为您转接给 ' + newAssignee.name + '）');
  res.json({ ok: true });
});

module.exports = router;
