// backup-restore.js —— 解密邮件备份附件，恢复成可用的数据库文件
//
// 用法（在后端目录）：
//   1. 把邮件里的 vinath-xxxx.db.enc 下载到本目录（或任意位置，填完整路径）
//   2. Windows PowerShell：
//        $env:BACKUP_ENCRYPTION_KEY="你在Render配置的同一个密钥（没配过则用JWT_SECRET）"
//        node backup-restore.js vinath-2026-10-16T01-00-00.db.enc vinath-restored.db
//   3. 恢复：先停掉后端服务，用 vinath-restored.db 替换 vinath.db（建议先把原文件改名留存），再启动
//
// 审计 JSON 附件同样可解密：
//   node backup-restore.js vinath-audit-2026-10-16T01-00-00.json.enc audit.json

const fs = require('fs');
const crypto = require('crypto');

const [,, inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('用法: node backup-restore.js <加密文件 .enc> <输出文件>');
  process.exit(1);
}

const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET;
if (!secret) {
  console.error('缺少密钥：请先设置环境变量 BACKUP_ENCRYPTION_KEY（与备份时一致；未单独配置时用 JWT_SECRET）');
  process.exit(1);
}
const key = crypto.createHash('sha256').update(secret + ':vinath-backup-v1').digest();

const raw = fs.readFileSync(inPath);
const magic = raw.slice(0, 8).toString('utf8');
if (magic !== 'VBENC001') {
  console.error('文件头不是 VINATH 加密备份格式，无法解密');
  process.exit(1);
}
const iv = raw.slice(8, 20);
const tag = raw.slice(20, 36);
const data = raw.slice(36);
try {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  fs.writeFileSync(outPath, plain);
  console.log(`✓ 解密成功：${outPath}（${(plain.length / 1024).toFixed(1)} KB）`);
} catch (e) {
  console.error('解密失败：密钥不正确或文件已损坏（', e.message, '）');
  process.exit(1);
}
