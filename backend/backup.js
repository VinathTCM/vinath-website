// backup.js —— 数据库备份脚本。用 better-sqlite3 内置的 .backup() 方法，而不是直接复制 vinath.db
// 这个文件——如果复制的瞬间正好有写入操作在进行，普通文件复制可能拿到一份损坏的数据库文件，
// .backup() 内部处理了这种并发情况，保证拿到的备份始终是完整、可用的。
//
// 用法：
//   node backup.js
//
// 建议配合系统的定时任务每天跑一次，具体怎么设置见本文件末尾的说明，或者部署文档里的
// "数据库备份"一节。

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'vinath.db');
const BACKUP_DIR = path.join(__dirname, 'backups');
const KEEP_LAST_N = 30; // 保留最近30份，配合"每天一次"大概是一个月的量，旧的自动清掉不占空间

async function main(){
  if(!fs.existsSync(DB_PATH)){
    console.error('找不到 vinath.db，确认这个脚本是不是跟数据库文件放在同一个目录下');
    process.exit(1);
  }
  if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23);
  const backupPath = path.join(BACKUP_DIR, `vinath-${timestamp}.db`);

  const db = new Database(DB_PATH, { readonly: true });
  await db.backup(backupPath);
  db.close();

  const sizeKb = (fs.statSync(backupPath).size / 1024).toFixed(1);
  console.log(`✓ 备份完成：${backupPath}（${sizeKb} KB）`);

  // 只保留最近 KEEP_LAST_N 份，按文件名排序（时间戳格式保证了字典序=时间顺序）
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('vinath-') && f.endsWith('.db')).sort();
  if(files.length > KEEP_LAST_N){
    const toDelete = files.slice(0, files.length - KEEP_LAST_N);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`  清理旧备份：${f}`);
    });
  }
}

main().catch(err => { console.error('备份失败:', err); process.exit(1); });

/*
=== 怎么让这个脚本定期自动跑 ===

如果部署在有 Linux shell 权限的服务器/VPS 上（用 crontab）：
  1. 在终端运行 `crontab -e`
  2. 加一行（每天凌晨3点跑一次，把下面的路径换成你实际的部署路径）：
     0 3 * * * cd /path/to/vinath-backend-full && node backup.js >> backup.log 2>&1

如果部署在 Railway / Render 这类托管平台：
  这两个平台目前都不直接提供"定时执行一个脚本"的功能（它们主要面向常驻的Web服务）。
  两个可行的路子：
  a) 用免费的定时触发服务（比如 cron-job.org、EasyCron），设置成每天调用一个你自己加的
     "触发备份"的 HTTP 接口——需要额外在 server.js 里加一个受保护的 /api/admin/trigger-backup
     接口，调用时执行这个脚本的逻辑。如果需要，我可以帮你加这个接口。
  b) 更简单：手动，每隔一段时间自己登录服务器跑一次 `node backup.js`。不自动，但总比没有强。

=== 备份存在哪里 ===

这个脚本默认把备份存在同一台服务器的 backups/ 目录下——这只解决了"数据库文件本身损坏"的
情况，如果服务器本身丢了（比如托管账号出问题、硬盘故障），存在同一台机器上的备份也一起没了。
更稳妥的做法是备份完成后，再把 backups/ 目录里的文件同步一份到别的地方，比如：
  - 云存储（AWS S3、Google Cloud Storage 等，多数有免费额度，小数据库文件的存储成本几乎为零）
  - 或者最简单的：定期手动下载 backups/ 目录到自己电脑

这部分要接到具体哪个云存储，需要看你们最终选择的部署平台和账号，如果需要我可以再帮你把这
一步也接上。
*/
