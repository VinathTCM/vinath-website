// routes/reviews.js —— 服务评价：客户在预约完成后提交，一个预约编号只能评价一次；后台只读展示，不能代客户创建/修改
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/reviews', (req, res) => {
  const { bookingNo, doctor, area, rating, comment } = req.body;
  if(!bookingNo || !rating || rating < 1 || rating > 5){
    return res.status(400).json({ error: '参数不完整' });
  }
  const booking = db.prepare('SELECT id, status FROM bookings WHERE booking_no = ? AND cancelled = 0').get(bookingNo);
  if(!booking) return res.status(404).json({ error: '找不到这个预约，或这个预约已经取消' });
  if(booking.status !== 2) return res.status(400).json({ error: '这个预约还没完成，暂时不能评价' });
  const existing = db.prepare('SELECT id FROM service_reviews WHERE booking_no = ?').get(bookingNo);
  if(existing) return res.status(409).json({ error: '这个预约已经评价过了' });

  const id = 'rv_' + Date.now();
  db.prepare('INSERT INTO service_reviews (id, booking_no, doctor, area, rating, comment) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, bookingNo, doctor||null, area||null, rating, comment||null);
  const row = db.prepare('SELECT * FROM service_reviews WHERE id = ?').get(id);
  res.status(201).json(row);
});

router.get('/reviews/:bookingNo', (req, res) => {
  const row = db.prepare('SELECT * FROM service_reviews WHERE booking_no = ?').get(req.params.bookingNo);
  res.json(row || null);
});

// 管理员批量查看——按预约编号建索引返回，admin.html展示预约列表时用来标星,不用逐条单独请求
router.get('/admin/reviews', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  const rows = db.prepare('SELECT * FROM service_reviews').all();
  const byBookingNo = {};
  rows.forEach(r => { byBookingNo[r.booking_no] = r; });
  res.json(byBookingNo);
});

module.exports = router;
