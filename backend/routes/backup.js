// routes/backup.js —— 备份状态查询与手动触发（仅大管理员）
const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const backupEngine = require('../backup-engine');

const router = express.Router();

function localBackupFiles() {
  try {
    const dir = backupEngine.BACKUP_DIR;
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => /^vinath-.*\.db$/.test(f))
      .sort()
      .slice(-10)
      .reverse()
      .map(f => {
        const st = fs.statSync(path.join(dir, f));
        return { name: f, sizeBytes: st.size, modifiedAt: st.mtime.toISOString() };
      });
  } catch (e) {
    return [];
  }
}

// 备份状态：最近执行记录、外部邮箱是否配置、本地备份文件清单
router.get('/admin/backup/status', authMiddleware, requireRole('SENIOR'), (req, res) => {
  const runs = db.prepare('SELECT * FROM backup_runs ORDER BY rowid DESC LIMIT 20').all();
  const lastOk = runs.find(r => r.ok === 1);
  res.json({
    configured: {
      email: !!backupEngine.smtpConfig(),
      emailTo: process.env.BACKUP_EMAIL_TO || (process.env.BACKUP_SMTP_USER || null),
      customEncryptionKey: !!process.env.BACKUP_ENCRYPTION_KEY,
      backupDir: backupEngine.BACKUP_DIR
    },
    lastSuccessAt: lastOk ? lastOk.finished_at : null,
    runs,
    localBackups: localBackupFiles()
  });
});

// 手动立即备份（本地快照 + 加密邮件外发）
router.post('/admin/backup/trigger', authMiddleware, requireRole('SENIOR'), async (req, res) => {
  try {
    const r = await backupEngine.runBackup({
      kind: 'manual',
      triggeredById: req.admin && req.admin.sub,
      triggeredByName: req.admin && req.admin.name
    });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: '备份失败：' + (e.message || 'unknown') });
  }
});

module.exports = router;
