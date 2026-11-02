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

// 临时磁盘维护（诊断期）：WAL checkpoint TRUNCATE + 可选 VACUUM 压缩 + 磁盘占用报告；不删任何业务数据
router.post('/admin/db/maintenance', authMiddleware, requireRole('SENIOR'), (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const results = {};
    try { results.wal = db.pragma('wal_checkpoint(TRUNCATE)'); }
    catch(e){ results.wal = 'err: ' + e.message; }
    if (req.body && req.body.vacuum) {
      const before = fs.statSync(process.env.DB_PATH || path.join(__dirname, '..', 'vinath.db')).size;
      try {
        db.exec('VACUUM');
        const after = fs.statSync(process.env.DB_PATH || path.join(__dirname, '..', 'vinath.db')).size;
        results.vacuum = { beforeMb: (before / 1048576).toFixed(2), afterMb: (after / 1048576).toFixed(2), freedMb: ((before - after) / 1048576).toFixed(2) };
      } catch(e){ results.vacuum = 'err: ' + e.message; }
    }
    // 清理积压的 products 迁移安全备份（保留最近3份），释放磁盘
    if (req.body && req.body.cleanupBackups) {
      try {
        const backupDir = path.join(__dirname, '..', 'data', 'backups');
        if (fs.existsSync(backupDir)) {
          const files = fs.readdirSync(backupDir).filter(f => /^products_.*\.json$/.test(f)).sort();
          let removed = 0, freed = 0;
          while (files.length > 3) {
            const old = files.shift();
            const p = path.join(backupDir, old);
            try { freed += fs.statSync(p).size; fs.unlinkSync(p); removed++; } catch(e){}
          }
          results.cleanupBackups = { removed, freedMb: (freed / 1048576).toFixed(2) };
        } else results.cleanupBackups = 'no backups dir';
      } catch(e){ results.cleanupBackups = 'err: ' + e.message; }
    }
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'vinath.db');
    try {
      const st = fs.statSync(dbPath);
      results.db = { path: dbPath, mb: (st.size / 1048576).toFixed(2) };
    } catch(e){ results.db = 'err: ' + e.message; }
    const walPath = dbPath + '-wal';
    try {
      const st = fs.statSync(walPath);
      results.walFile = { mb: (st.size / 1048576).toFixed(2) };
    } catch(e){ results.walFile = 'none'; }
    const bdir = path.join(path.dirname(dbPath), 'backups');
    try {
      if (fs.existsSync(bdir)) {
        const files = fs.readdirSync(bdir).filter(f => /^vinath-.*\.db$/.test(f)).map(f => ({ f, size: fs.statSync(path.join(bdir, f)).size }));
        results.backupFiles = files.map(x => ({ name: x.f, mb: (x.size / 1048576).toFixed(2) }));
        results.backupTotalMb = (files.reduce((s, x) => s + x.size, 0) / 1048576).toFixed(2);
      } else { results.backupFiles = 'no dir'; }
    } catch(e){ results.backupErr = e.message; }
    // 动态枚举全部业务表：行数 + 最大 TEXT/BLOB 列总长（定位大字段归属）
    try {
      const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name);
      const sizes = [];
      for (const t of allTables) {
        try {
          const c = db.prepare(`SELECT COUNT(*) cnt FROM ${t}`).get().cnt;
          const cols = db.prepare(`PRAGMA table_info(${t})`).all();
          let big = 0, bigCol = null;
          for (const col of cols) {
            if (['TEXT','BLOB'].includes(String(col.type || '').toUpperCase())) {
              try {
                const v = db.prepare(`SELECT SUM(LENGTH("${col.name}")) x FROM ${t}`).get().x;
                if (v && v > big) { big = v; bigCol = col.name; }
              } catch(e){}
            }
          }
          sizes.push({ table: t, rows: c, bigMB: (big / 1048576).toFixed(1), bigCol });
        } catch(e){ sizes.push({ table: t, err: e.message }); }
      }
      sizes.sort((a, b) => Number(b.bigMB || 0) - Number(a.bigMB || 0));
      results.tables = sizes;
    } catch(e){ results.tablesErr = e.message; }
    // uploads / data 目录占用（相对 backend 目录）
    const backendDir = path.join(__dirname, '..');
    for (const d of ['uploads', 'data', 'backups', 'node_modules', 'logs']) {
      try {
        const dir = path.join(backendDir, d);
        if (fs.existsSync(dir)) {
          let total = 0, n = 0;
          (function walk(p){ fs.readdirSync(p).forEach(f => { const fp = path.join(p, f); const st = fs.statSync(fp); if (st.isDirectory()) walk(fp); else { total += st.size; n++; } }); })(dir);
          results[`dir_${d}`] = { mb: (total / 1048576).toFixed(2), files: n };
        } else results[`dir_${d}`] = 'no dir';
      } catch(e){ results[`dir_${d}`] = 'err: ' + e.message; }
    }
    // 磁盘整体空间 + 项目根目录顶层占用（找占盘大头）
    try {
      const cp = require('child_process');
      results.df = cp.execSync('df -h / 2>/dev/null || df -h /opt 2>/dev/null || echo no-df', { encoding: 'utf8', timeout: 8000 }).trim();
    } catch(e){ results.df = 'err: ' + e.message; }
    try {
      const root = path.join(__dirname, '..', '..');
      const dirs = fs.readdirSync(root).filter(d => { try { return fs.statSync(path.join(root, d)).isDirectory(); } catch(e){ return false; } });
      const sizes = dirs.map(d => {
        let t = 0;
        (function walk(p){ try { fs.readdirSync(p).forEach(f => { const fp = path.join(p, f); const st = fs.statSync(fp); if (st.isDirectory()) walk(fp); else t += st.size; }); } catch(e){} })(path.join(root, d));
        return { d: d, mb: (t / 1048576).toFixed(1) };
      }).sort((a, b) => Number(b.mb) - Number(a.mb));
      results.rootDirs = sizes;
    } catch(e){ results.rootErr = e.message; }
    // data 目录大文件列表（定位可清理项）
    try {
      const dataDir = path.join(backendDir, 'data');
      if (fs.existsSync(dataDir)) {
        const files = [];
        (function walk(p){ fs.readdirSync(p).forEach(f => { const fp = path.join(p, f); const st = fs.statSync(fp); if (st.isDirectory()) walk(fp); else files.push({ f: fp.replace(dataDir + path.sep, ''), mb: (st.size / 1048576).toFixed(2) }); }); })(dataDir);
        files.sort((a, b) => Number(b.mb) - Number(a.mb));
        results.dataFiles = files.slice(0, 30);
      } else results.dataFiles = 'no dir';
    } catch(e){ results.dataFiles = 'err: ' + e.message; }
    res.json({ success: true, results });
  } catch(e){ res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
