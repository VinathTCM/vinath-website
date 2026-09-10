// routes/cleanup.js —— 清除测试数据（仅大管理员 SENIOR 可调用）
// 清除范围：病人、订单、预约、即时预约、病历、处方、收据、评价、客户聊天、统计数据
// 保留范围：管理员、商品、商品分类、支付方式、站点设置(公告/政策/电话/区域)、协定方、药材价格、黑名单、员工聊天、审计日志
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole, logAdminAction } = require('../middleware/auth');

// 需要清除的表（按外键依赖顺序，先清子表再清主表）
const TABLES_TO_CLEAR = [
  'chat_messages',        // 客户聊天消息
  'chat_threads',         // 客户聊天会话
  'wishlist_events',      // 收藏事件
  'product_interest',     // 商品兴趣
  'pageviews',            // 页面访问统计
  'service_reviews',      // 服务评价
  'receipts',             // 收据/发票
  'prescriptions',        // 处方
  'medical_records',      // 病历
  'instant_requests',     // 即时预约
  'bookings',             // 预约
  'orders',               // 订单
  'wholesale_orders',     // 批发订单
  'customers',            // 病人/客户
];

// 保留的表（不清除）：admins, shop_categories, products, payment_methods,
// site_settings, personal_formulas, herb_prices, blacklist,
// staff_threads, staff_messages, access_log

router.post('/admin/cleanup-test-data', authMiddleware, requireRole('SENIOR'), (req, res) => {
  try {
    const results = {};
    // 开启事务，确保要么全部清除要么全部不清除
    const tx = db.transaction(() => {
      for (const table of TABLES_TO_CLEAR) {
        try {
          const countBefore = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get().cnt;
          db.prepare(`DELETE FROM ${table}`).run();
          results[table] = countBefore;
        } catch(e) {
          console.error(`清除表 ${table} 失败:`, e.message);
          results[table] = 'error: ' + e.message;
        }
      }
    });
    tx();

    // 记录审计日志（注意：access_log表不清除，所以这条记录会保留）
    logAdminAction(req, 'cleanup_test_data', 'system', null,
      `清除测试数据：病人和交易记录。删除行数：${JSON.stringify(results)}`);

    const totalDeleted = Object.values(results).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    res.json({
      success: true,
      message: `测试数据清除完成，共删除 ${totalDeleted} 条记录`,
      deleted: results,
      total: totalDeleted,
      preserved: ['admins(管理员账号)', 'products(商品)', 'shop_categories(商品分类)',
        'payment_methods(支付方式)', 'site_settings(公告/政策/电话/区域)',
        'personal_formulas(协定方)', 'herb_prices(药材价格)', 'blacklist(黑名单)',
        'staff_threads/staff_messages(员工聊天)', 'access_log(审计日志)']
    });
  } catch(e) {
    console.error('清除测试数据失败:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// 查询各表当前记录数（用于清除前确认）
router.get('/admin/cleanup-test-data/preview', authMiddleware, requireRole('SENIOR'), (req, res) => {
  try {
    const counts = {};
    for (const table of TABLES_TO_CLEAR) {
      try {
        counts[table] = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get().cnt;
      } catch(e) {
        counts[table] = 'error';
      }
    }
    const total = Object.values(counts).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    res.json({ tables: counts, total, willBePreserved: ['admins','products','site_settings','personal_formulas','herb_prices'] });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
