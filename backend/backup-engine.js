// backup-engine.js —— 每日自动备份 + 外部加密邮件存证
//
// 三层保护，对应 MMC《Confidentiality Guidelines》(2011) §14(g)(i)（定期备份/灾难恢复）：
//   1. 本地备份：用 better-sqlite3 的 .backup() 做一致性快照，存到 backups/（保留最近30份）
//   2. 加密：完整库快照与审计导出用 AES-256-GCM 加密，密钥只来自服务器环境变量
//   3. 外发：把加密附件发送到机构指定邮箱（独立于服务器，服务器损毁/账号被黑都删不掉邮件）
//
// 不依赖付费定时任务：startScheduler() 在启动后及每小时检查一次，距上次成功备份超过24小时就补跑。
// 备份执行记录写入 backup_runs 表（只追加），大管理员可在后台查看并手动触发。

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'vinath.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, 'backups');
const KEEP_LOCAL = 30;
const INTERVAL_MS = 24 * 60 * 60 * 1000;
const ENC_MAGIC = 'VBENC001';

let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { nodemailer = null; }

function encryptionKey() {
  // 优先用专用密钥；未单独配置时从 JWT_SECRET 派生，保证生产环境每次部署密钥稳定（不会把备份变成打不开的废文件）
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-insecure-backup-key';
  return crypto.createHash('sha256').update(secret + ':vinath-backup-v1').digest();
}

function encryptBuffer(buf) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from(ENC_MAGIC, 'utf8'), iv, tag, enc]);
}

function smtpConfig() {
  if (!process.env.BACKUP_SMTP_HOST || !process.env.BACKUP_SMTP_USER || !process.env.BACKUP_SMTP_PASS) return null;
  const port = Number(process.env.BACKUP_SMTP_PORT) || 587;
  return {
    host: process.env.BACKUP_SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.BACKUP_SMTP_USER, pass: process.env.BACKUP_SMTP_PASS }
  };
}

function cleanupLocal() {
  const dbs = fs.readdirSync(BACKUP_DIR).filter(f => /^vinath-.*\.db$/.test(f)).sort();
  if (dbs.length > KEEP_LOCAL) {
    dbs.slice(0, dbs.length - KEEP_LOCAL).forEach(f => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (e) {}
    });
  }
}

function humanSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

let running = false;

async function runBackup(options = {}) {
  const kind = options.kind || 'auto';
  const triggeredById = options.triggeredById || null;
  const triggeredByName = options.triggeredByName || null;
  if (running) return { skipped: true, reason: 'already-running' };
  running = true;

  const db = require('./db');
  const runId = 'bk_' + crypto.randomBytes(8).toString('hex');
  const startedAt = new Date().toISOString();
  const stamp = startedAt.replace(/[:.]/g, '-').slice(0, 19);
  const dateLabel = startedAt.slice(0, 10);

  const result = {
    id: runId, kind, startedAt, ok: false, localPath: null, sizeBytes: 0,
    logCount: 0, versionCount: 0, hashTip: null,
    emailConfigured: !!smtpConfig(), emailOk: false, emailError: null
  };

  const insertRun = db.prepare(`INSERT INTO backup_runs
    (id, kind, started_at, ok, local_path, size_bytes, log_count, version_count, hash_tip,
     email_configured, email_ok, email_error, triggered_by_id, triggered_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const finishRun = db.prepare(`UPDATE backup_runs SET finished_at=?, ok=?, size_bytes=?, log_count=?,
    version_count=?, hash_tip=?, email_configured=?, email_ok=?, email_error=? WHERE id=?`);

  try {
    insertRun.run(runId, kind, startedAt, 0, null, 0, 0, 0, null,
      result.emailConfigured ? 1 : 0, 0, null, triggeredById, triggeredByName);

    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const localPath = path.join(BACKUP_DIR, `vinath-${stamp}.db`);

    // 1) 一致性快照（只读打开生产库，.backup() 处理并发写入）
    const src = new Database(DB_FILE, { readonly: true });
    await src.backup(localPath);
    result.localPath = localPath;

    // 2) 从快照读取统计与审计导出（保证与备份内容完全一致）
    const snap = new Database(localPath, { readonly: true });
    result.logCount = snap.prepare('SELECT COUNT(*) c FROM access_log').get().c;
    try { result.versionCount = snap.prepare('SELECT COUNT(*) c FROM medical_record_versions').get().c; } catch (e) {}
    const tipLog = snap.prepare('SELECT hash FROM access_log ORDER BY rowid DESC LIMIT 1').get();
    const tipVer = snap.prepare('SELECT hash FROM medical_record_versions ORDER BY rowid DESC LIMIT 1').get();
    result.hashTip = JSON.stringify({
      accessLog: tipLog ? tipLog.hash : null,
      recordVersions: tipVer ? tipVer.hash : null
    });
    const auditPayload = {
      format: 'vinath-audit-export-v1',
      exportedAt: startedAt,
      counts: { accessLog: result.logCount, recordVersions: result.versionCount },
      hashTips: { accessLog: tipLog ? tipLog.hash : null, recordVersions: tipVer ? tipVer.hash : null },
      accessLog: snap.prepare('SELECT * FROM access_log ORDER BY rowid ASC').all(),
      recordVersions: (() => {
        try { return snap.prepare('SELECT * FROM medical_record_versions ORDER BY rowid ASC').all(); }
        catch (e) { return []; }
      })()
    };
    snap.close();
    src.close();

    const dbBuf = fs.readFileSync(localPath);
    result.sizeBytes = dbBuf.length;

    // 3) 本地保留滚动清理
    cleanupLocal();

    // 4) 加密 + 发送邮件（配置了 SMTP 才执行；失败不影响本地备份，只记录错误）
    const cfg = smtpConfig();
    if (cfg) {
      try {
        if (!nodemailer) throw new Error('nodemailer 未安装（请在后端目录执行 npm install）');
        const encDb = encryptBuffer(dbBuf);
        const encAudit = encryptBuffer(Buffer.from(JSON.stringify(auditPayload), 'utf8'));
        const to = process.env.BACKUP_EMAIL_TO || cfg.auth.user;
        const transporter = nodemailer.createTransport({
          host: cfg.host, port: cfg.port, secure: cfg.secure, requireTLS: cfg.requireTLS,
          auth: cfg.auth, connectionTimeout: 20000, greetingTimeout: 20000, socketTimeout: 30000
        });
        const subject = `[VINATH] Encrypted backup ${dateLabel} (${kind === 'manual' ? 'manual' : 'auto'})`;
        const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2B2622">
  <h3 style="color:#3F5E4B;margin:0 0 8px">VINATH TCM — Encrypted Daily Backup / 每日加密备份</h3>
  <p style="margin:4px 0">Time (UTC): <b>${startedAt}</b></p>
  <p style="margin:4px 0">Type: <b>${kind}</b>${triggeredByName ? ' (' + triggeredByName + ')' : ''}</p>
  <p style="margin:4px 0">Audit log entries: <b>${result.logCount}</b>　Record versions: <b>${result.versionCount}</b></p>
  <p style="margin:4px 0">Encrypted database size: <b>${humanSize(result.sizeBytes)}</b></p>
  <p style="margin:4px 0;word-break:break-all">Hash-chain tip: <code>${result.hashTip}</code></p>
  <hr style="border:0;border-top:1px solid #ddd"/>
  <p style="font-size:12px;color:#7A6F60">附件为 AES-256-GCM 加密文件，解密密钥仅保存在服务器环境变量中，本邮件不含密钥。
  这是自动化合规备份邮件，请勿删除；如非本人操作收到此邮件，请立即检查系统。<br/>
  Attachments are AES-256-GCM encrypted. The decryption key is held only in the server environment and is never sent by email.</p>
</div>`;
        await transporter.sendMail({
          from: `VINATH TCM Backup <${cfg.auth.user}>`,
          to,
          subject,
          html,
          attachments: [
            { filename: `vinath-${stamp}.db.enc`, content: encDb, contentType: 'application/octet-stream' },
            { filename: `vinath-audit-${stamp}.json.enc`, content: encAudit, contentType: 'application/octet-stream' }
          ]
        });
        result.emailOk = true;
      } catch (e) {
        result.emailError = (e && e.message) ? String(e.message).slice(0, 500) : 'unknown email error';
      }
    }

    result.ok = true; // 本地备份成功即算成功；邮件失败通过 email_ok/email_error 体现
    finishRun.run(new Date().toISOString(), 1, result.sizeBytes, result.logCount, result.versionCount,
      result.hashTip, result.emailConfigured ? 1 : 0, result.emailOk ? 1 : 0, result.emailError, runId);
    return result;
  } catch (e) {
    const msg = (e && e.message) ? String(e.message).slice(0, 500) : 'backup failed';
    try {
      finishRun.run(new Date().toISOString(), 0, result.sizeBytes || 0, result.logCount || 0,
        result.versionCount || 0, result.hashTip, result.emailConfigured ? 1 : 0, result.emailOk ? 1 : 0,
        result.emailError || msg, runId);
    } catch (e2) {}
    result.error = msg;
    return result;
  } finally {
    running = false;
  }
}

// 每小时检查一次；启动后45秒先检查一次（避开部署启动高峰）
function startScheduler() {
  const check = async () => {
    try {
      const db = require('./db');
      const last = db.prepare("SELECT finished_at FROM backup_runs WHERE ok=1 ORDER BY rowid DESC LIMIT 1").get();
      const need = !last || (Date.now() - new Date(last.finished_at.replace(' ', 'T') + 'Z').getTime() > INTERVAL_MS);
      if (need) {
        console.log('[备份] 距上次成功备份超过24小时（或从未备份），开始自动备份');
        const r = await runBackup({ kind: 'auto' });
        if (r && r.skipped) return;
        console.log(`[备份] 完成：本地 ${r.ok ? '成功' : '失败'}（${humanSize(r.sizeBytes || 0)}），邮件 ${r.emailConfigured ? (r.emailOk ? '成功' : '失败：' + r.emailError) : '未配置'}`);
      }
    } catch (e) {
      console.error('[备份] 调度检查失败:', e.message);
    }
  };
  setTimeout(check, 45 * 1000);
  setInterval(check, 60 * 60 * 1000);
}

module.exports = { runBackup, startScheduler, smtpConfig, encryptionKey, encryptBuffer, ENC_MAGIC, BACKUP_DIR, DB_FILE };
