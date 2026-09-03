// routes/staff-chat.js —— 内部员工1对1聊天：任意两个不同管理员账号之间的对话，不限定角色配对
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function pairKey(a, b){
  // 用固定顺序存admin_a_id/admin_b_id，这样查询时不用管"谁是发起人"，任意顺序传两个id都能查到同一条
  return a < b ? [a, b] : [b, a];
}
function serializeMessage(m){ return { fromAdminId: m.from_admin_id, fromName: m.from_admin_name, text: m.text, time: m.created_at }; }

function ensureThread(a, b){
  const [x, y] = pairKey(a, b);
  let thread = db.prepare('SELECT * FROM staff_threads WHERE admin_a_id = ? AND admin_b_id = ?').get(x, y);
  if(!thread){
    const id = 'st_' + Date.now();
    db.prepare('INSERT INTO staff_threads (id, admin_a_id, admin_b_id) VALUES (?, ?, ?)').run(id, x, y);
    thread = db.prepare('SELECT * FROM staff_threads WHERE id = ?').get(id);
  }
  return thread;
}
function otherPartyId(thread, myId){ return thread.admin_a_id === myId ? thread.admin_b_id : thread.admin_a_id; }
function isUnread(threadId, adminId){
  const readRow = db.prepare('SELECT last_read_at FROM staff_thread_reads WHERE thread_id = ? AND admin_id = ?').get(threadId, adminId);
  const cutoff = readRow ? readRow.last_read_at : '0000-00-00';
  const unreadCount = db.prepare('SELECT COUNT(*) as c FROM staff_messages WHERE thread_id = ? AND from_admin_id != ? AND created_at > ?').get(threadId, adminId, cutoff).c;
  return unreadCount > 0;
}
function markRead(threadId, adminId){
  db.prepare(`
    INSERT INTO staff_thread_reads (thread_id, admin_id, last_read_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(thread_id, admin_id) DO UPDATE SET last_read_at = CURRENT_TIMESTAMP
  `).run(threadId, adminId);
}

router.get('/admin/staff-threads', authMiddleware, (req, res) => {
  const me = req.admin.sub;
  const rows = db.prepare('SELECT * FROM staff_threads WHERE admin_a_id = ? OR admin_b_id = ? ORDER BY last_message_at DESC').all(me, me);
  const withPreview = rows.map(t => {
    const otherId = otherPartyId(t, me);
    const other = db.prepare('SELECT id, name, role FROM admins WHERE id = ?').get(otherId);
    const last = db.prepare('SELECT * FROM staff_messages WHERE thread_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(t.id);
    return {
      id: t.id, otherAdminId: otherId, otherAdminName: other ? other.name : '（账号已删除）', otherAdminRole: other ? other.role : null,
      lastMessageText: last ? last.text : '', unread: isUnread(t.id, me)
    };
  });
  res.json(withPreview);
});

// 列出"可以对话的其他管理员"——发起新对话时选人用
router.get('/admin/staff-threads/contacts', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT id, name, role FROM admins WHERE id != ?').all(req.admin.sub);
  res.json(rows);
});

router.post('/admin/staff-threads/ensure', authMiddleware, (req, res) => {
  const { otherAdminId } = req.body;
  const other = db.prepare('SELECT id FROM admins WHERE id = ?').get(otherAdminId);
  if(!other) return res.status(404).json({ error: '账号不存在' });
  const thread = ensureThread(req.admin.sub, otherAdminId);
  res.json({ id: thread.id });
});

router.get('/admin/staff-threads/:id/messages', authMiddleware, (req, res) => {
  const thread = db.prepare('SELECT * FROM staff_threads WHERE id = ?').get(req.params.id);
  if(!thread || (thread.admin_a_id !== req.admin.sub && thread.admin_b_id !== req.admin.sub)){
    return res.status(404).json({ error: '对话不存在' });
  }
  markRead(thread.id, req.admin.sub);
  const messages = db.prepare('SELECT * FROM staff_messages WHERE thread_id = ? ORDER BY created_at ASC').all(thread.id);
  res.json({ messages: messages.map(serializeMessage) });
});

router.post('/admin/staff-threads/:id/messages', authMiddleware, (req, res) => {
  const { text } = req.body;
  if(!text || !text.trim()) return res.status(400).json({ error: '消息不能为空' });
  const thread = db.prepare('SELECT * FROM staff_threads WHERE id = ?').get(req.params.id);
  if(!thread || (thread.admin_a_id !== req.admin.sub && thread.admin_b_id !== req.admin.sub)){
    return res.status(404).json({ error: '对话不存在' });
  }
  db.prepare('INSERT INTO staff_messages (id, thread_id, from_admin_id, from_admin_name, text) VALUES (?, ?, ?, ?, ?)')
    .run('sm_' + Date.now(), thread.id, req.admin.sub, req.admin.name, text.trim());
  db.prepare('UPDATE staff_threads SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?').run(thread.id);
  res.status(201).json({ ok: true });
});

module.exports = router;
