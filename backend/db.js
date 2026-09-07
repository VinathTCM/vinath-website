// db.js —— 数据库连接与表结构定义
// 本地开发用 SQLite（不需要额外起数据库服务，克隆下来直接能跑）。
// 真正部署到生产环境时，建议换成 PostgreSQL：
//   1. npm uninstall better-sqlite3 && npm install pg
//   2. 把下面这个文件里的 db.prepare(...).run(...) / .get(...) / .all(...) 调用方式
//      换成 pg 的 query 写法（语法上 CREATE TABLE 基本通用，少数类型要调整，
//      比如 TEXT 数组字段、AUTOINCREMENT 写法在 Postgres 里不一样）
//   3. 云托管平台（Railway / Render / Supabase 等）通常一键就能起一个 Postgres 实例，
//      拿到连接字符串填进 .env 就行，不需要自己维护数据库服务器

const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径：优先读 DB_PATH 环境变量（生产环境挂载持久磁盘时指向磁盘目录），
// 默认存到本文件同目录（本地开发用）。
const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'vinath.db');
if (process.env.DB_PATH) {
  const fs = require('fs');
  const dir = path.dirname(process.env.DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SENIOR','PRACTITIONER','FULFILLMENT','SUPPORT')),
    password_hash TEXT,
    regions TEXT DEFAULT '[]',
    accepting_orders INTEGER DEFAULT 1,
    coupon_code TEXT UNIQUE,
    license_expiry TEXT,
    moh_reg_no TEXT,
    apc_no TEXT,
    availability TEXT,
    avatar TEXT,
    specialty TEXT,
    title TEXT,
    creds TEXT,
    description TEXT,
    tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shop_categories (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    art_url TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    type TEXT NOT NULL,
    price REAL NOT NULL,
    trial_price REAL,
    cost REAL,
    cost_trial REAL,
    wholesale_price REAL,
    wholesale_trial_price REAL,
    coupon_price REAL,
    coupon_trial_price REAL,
    stock_qty INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    featured INTEGER DEFAULT 0,
    description TEXT,
    usage_note TEXT,
    herbs TEXT DEFAULT '[]',
    form TEXT,
    tags TEXT DEFAULT '[]',
    journeys TEXT DEFAULT '[]',
    images TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    contact TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    postcode TEXT,
    state TEXT,
    region TEXT,
    items TEXT NOT NULL,
    shipping REAL DEFAULT 0,
    pay_method TEXT,
    status INTEGER DEFAULT 0,
    coupon_code TEXT,
    payment_verified INTEGER DEFAULT 0,
    payment_screenshot TEXT,
    consent_given_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    booking_no TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    practitioner_id TEXT,
    practitioner_name TEXT,
    area TEXT NOT NULL,
    address_detail TEXT NOT NULL,
    appt_date TEXT,
    appt_date_iso TEXT,
    slot TEXT,
    need TEXT,
    doctor_note TEXT,
    treatments TEXT DEFAULT '[]',
    status INTEGER DEFAULT 0,
    cancelled INTEGER DEFAULT 0,
    deposit_amount REAL,
    deposit_method TEXT,
    deposit_status TEXT,
    deposit_requested_at TEXT,
    consent_given_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('bank_transfer','duitnow','other')),
    bank_name TEXT,
    account_name TEXT,
    account_number TEXT,
    qr_image TEXT,
    custom_note TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    id TEXT PRIMARY KEY,
    practitioner_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    reason TEXT,
    added_date TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(practitioner_id, phone)
  );

  CREATE TABLE IF NOT EXISTS wholesale_orders (
    id TEXT PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE,
    ordered_by_id TEXT NOT NULL,
    ordered_by_name TEXT NOT NULL,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    region TEXT DEFAULT 'west',
    shipping REAL DEFAULT 0,
    pay_method TEXT,
    status INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS instant_requests (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    area TEXT NOT NULL,
    need TEXT,
    matched_practitioner_id TEXT,
    status TEXT NOT NULL DEFAULT 'unmatched' CHECK(status IN ('unmatched','pending_confirmation','accepted','declined','expired')),
    accepted_by TEXT,
    consent_given_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    responded_at TEXT
  );

  CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY,
    patient_phone TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    practitioner_id TEXT NOT NULL,
    practitioner_name TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    patient_phone TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    medical_record_id TEXT,
    booking_id TEXT,
    practitioner_id TEXT NOT NULL,
    practitioner_name TEXT NOT NULL,
    formula_type TEXT NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    usage_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'awaiting_pharmacy' CHECK(status IN ('awaiting_pharmacy','brewing','shipping','delivered')),
    logistics_provider TEXT,
    tracking_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    receipt_no TEXT NOT NULL UNIQUE,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    practitioner_id TEXT,
    practitioner_name_snapshot TEXT NOT NULL,
    practitioner_moh_reg_no TEXT,
    practitioner_apc_no TEXT,
    items TEXT NOT NULL DEFAULT '{}',
    total_amount REAL NOT NULL,
    tcm_diagnosis_snapshot TEXT,
    payment_method TEXT,
    payment_status TEXT,
    issued_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    assigned_to_id TEXT NOT NULL,
    assigned_to_name TEXT NOT NULL,
    unread_for_admin INTEGER DEFAULT 0,
    unread_for_customer INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_message_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES chat_threads(id),
    from_role TEXT NOT NULL CHECK(from_role IN ('customer','admin')),
    from_name TEXT,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pageviews (
    id TEXT PRIMARY KEY,
    page TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_interest (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    product_name TEXT NOT NULL,
    dwell_ms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wishlist_events (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    product_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('add','remove')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS staff_threads (
    id TEXT PRIMARY KEY,
    admin_a_id TEXT NOT NULL,
    admin_b_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_a_id, admin_b_id)
  );

  CREATE TABLE IF NOT EXISTS staff_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES staff_threads(id),
    from_admin_id TEXT NOT NULL,
    from_admin_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS staff_thread_reads (
    thread_id TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    last_read_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_id, admin_id)
  );

  CREATE TABLE IF NOT EXISTS service_reviews (
    id TEXT PRIMARY KEY,
    booking_no TEXT NOT NULL UNIQUE,
    doctor TEXT,
    area TEXT,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS access_log (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('view','create','update','delete')),
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    patient_phone TEXT,
    detail TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS personal_formulas (
    id TEXT PRIMARY KEY,
    practitioner_id TEXT NOT NULL,
    practitioner_name TEXT,
    name TEXT NOT NULL,
    formula_type TEXT NOT NULL DEFAULT 'granule',
    items TEXT NOT NULL DEFAULT '[]',
    usage_instructions TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    receipt_no TEXT NOT NULL UNIQUE,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    practitioner_id TEXT,
    practitioner_name_snapshot TEXT NOT NULL,
    practitioner_moh_reg_no TEXT,
    practitioner_apc_no TEXT,
    items TEXT NOT NULL DEFAULT '{}',
    total_amount REAL NOT NULL,
    tcm_diagnosis_snapshot TEXT,
    payment_method TEXT,
    payment_status TEXT,
    line_items TEXT DEFAULT '[]',
    issued_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// 处方扩展字段 + 协定方价格 + 药材价格表 的幂等迁移：旧库缺列就补，新库直接跳过
(function migratePrescriptionExt(){
  const pcols = db.prepare('PRAGMA table_info(prescriptions)').all().map(c => c.name);
  const padd = (col, ddl) => { if(!pcols.includes(col)) db.exec('ALTER TABLE prescriptions ADD COLUMN ' + ddl); };
  padd('doses', "doses INTEGER DEFAULT 1");
  padd('dispense_mode', "dispense_mode TEXT DEFAULT 'herb_pickup'");
  padd('herb_total', "herb_total REAL DEFAULT 0");
  padd('decoct_fee', "decoct_fee REAL DEFAULT 0");
  const fcols = db.prepare('PRAGMA table_info(personal_formulas)').all().map(c => c.name);
  if(!fcols.includes('price')) db.exec('ALTER TABLE personal_formulas ADD COLUMN price REAL DEFAULT 0');
  db.exec(`CREATE TABLE IF NOT EXISTS herb_prices (
    id TEXT PRIMARY KEY,
    herb_name TEXT NOT NULL UNIQUE,
    price_per_g REAL NOT NULL DEFAULT 0,
    note TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
})();

// [stated] SQLite的 CREATE TABLE IF NOT EXISTS 只在表不存在时生效——如果这台机器上已经跑过
// 旧版本、payment_methods 表已经建好了，上面新加的 CHECK 约束（允许 'other' 类型）不会自动
// 应用到这张已存在的旧表。SQLite 本身不支持直接修改一个已有列的 CHECK 约束，标准做法是：
// 建一张新结构的临时表 → 把旧表数据原样搬过去 → 删掉旧表 → 把临时表改名成正式表名。
// 这段迁移逻辑是幂等的：新建的数据库（表还没建过旧版本）会跳过，不会重复执行。
(function migratePaymentMethodsTable(){
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payment_methods'").get();
  if(!tableSql || tableSql.sql.includes("'other'")) return; // 表不存在(全新数据库,上面的CREATE会建好)，或者已经是新版本，不用迁移
  console.log('检测到 payment_methods 表是旧版本（不支持"其他"类型），正在自动迁移…');
  db.exec(`
    CREATE TABLE payment_methods_new (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('bank_transfer','duitnow','other')),
      bank_name TEXT, account_name TEXT, account_number TEXT, qr_image TEXT, custom_note TEXT,
      active INTEGER DEFAULT 1
    );
    INSERT INTO payment_methods_new (id, type, bank_name, account_name, account_number, qr_image, active)
      SELECT id, type, bank_name, account_name, account_number, qr_image, active FROM payment_methods;
    DROP TABLE payment_methods;
    ALTER TABLE payment_methods_new RENAME TO payment_methods;
  `);
  console.log('迁移完成，已有的付款方式记录都保留了。');
})();

// [stated] receipts 表增加 line_items 列（病历页"保存并打印发票"的项目明细）。
// 已有旧表（无该列）时用 ALTER TABLE 补列；全新数据库直接走上面 CREATE 建好，幂等跳过。
(function migrateReceiptsLineItems(){
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='receipts'").get();
  if(!tableSql) return; // 全新数据库，上面 CREATE 已建好
  if(tableSql.sql.includes('line_items')) return; // 已有该列
  console.log('检测到 receipts 表缺少 line_items 列，正在补列…');
  db.exec("ALTER TABLE receipts ADD COLUMN line_items TEXT DEFAULT '[]'");
  console.log('receipts 表 line_items 列已补充。');
})();


// [stated] 药材零售价初始导入（46 味 + 常用别名）。幂等：ON CONFLICT DO NOTHING，
// 已存在（含医师后续手动调过价）的记录一律不动，只补缺失的。
(function migrateHerbPricesSeed(){
  const seed = [
    // 主名（RM/g） + 别名（同价，保证开方时处方名能精确匹配）
    ['当归',0.30,'AA干切片'],['丹参',0.09,'丹参片'],['南沙参',0.28,'原色南沙参'],
    ['三七',0.29,'田七切片'],['田七',0.29,'三七别名'],
    ['白芍',0.11,'机切白芍'],['生白芍',0.11,'白芍别名'],
    ['杜仲',0.07,'600g/包 RM40'],['续断',0.09,'川断片'],['川断',0.09,'续断别名'],
    ['白术',0.05,'白术片'],['炒白术',0.05,'白术别名'],['茯苓',0.05,'茯苓粒/方伏立'],
    ['川芎',0.09,'600g/包 RM52'],['淮小麦',0.03,'佛小麦/浮小麦'],['浮小麦',0.03,'淮小麦别名'],
    ['柴胡',0.12,'柴胡片'],['炙甘草',0.07,'炙甘草片'],['党参',0.36,'3星无磺纹党'],
    ['山药',0.09,'铁棍河南淮山'],['珍珠母',0.03,'珍珠母片'],['牛膝',0.09,'600g/包 RM56'],['淮牛七',0.09,'牛膝别名'],
    ['桔梗',0.09,'桔梗片'],['熟地黄',0.08,'采购价19.00/500g'],['熟地',0.08,'熟地黄别名'],
    ['生地黄',0.08,'采购价19.00/500g'],['生地',0.08,'生地黄别名'],['泽泻',0.06,'泽泻片'],
    ['黄芪',0.09,'黄芪小片'],['生黄芪',0.09,'黄芪别名'],
    ['生甘草',0.07,'丙甘草片'],['丙草',0.07,'生甘草别名'],['麦冬',0.13,'正绵冬'],
    ['山茱萸',0.14,'AA枣皮'],['山萸肉',0.14,'山茱萸别名'],['远志',0.12,'远志肉/远志通'],
    ['陈皮',0.03,'陈皮/果皮'],['桂枝',0.03,'AA桂枝片'],['牡丹皮',0.17,'牡丹皮'],
    ['车前子',0.06,'车前子'],['酸枣仁',0.10,'缅甸酸枣仁'],['五灵脂',0.21,'五灵脂'],
    ['生蒲黄',0.17,'草蒲黄'],['吴茱萸',0.08,'左力子/吴茱萸'],
    ['半夏',0.07,'半夏片/姜半夏'],['姜半夏',0.07,'半夏别名'],['法半夏',0.07,'半夏别名'],
    ['黄芩',0.08,'黄芩片'],['栀子',0.05,'山支子'],['山栀子',0.05,'栀子别名'],
    ['苍术',0.09,'炒苍术'],['炒苍术',0.09,'苍术别名'],['木香',0.08,'木香片/广木香'],
    ['桃仁',0.17,'光桃仁'],['木通',0.07,'原色川木通'],['川木通',0.07,'木通别名'],
    ['薄荷',0.05,'薄荷片'],['炮姜',0.12,'炒黑姜/黑姜炭'],['黑姜炭',0.12,'炮姜别名'],
    ['枸杞子',0.08,'杞子AAA'],['杞子',0.08,'枸杞子别名'],['芡实',0.06,'8厘茨实'],['茨实',0.06,'芡实别名'],
    ['莲子',0.07,'磨皮莲子']
  ];
  const stmt = db.prepare('INSERT INTO herb_prices (id, herb_name, price_per_g, note) VALUES (?, ?, ?, ?) ON CONFLICT(herb_name) DO NOTHING');
  let added = 0;
  seed.forEach(function(row){
    const info = stmt.run('hp_seed_' + row[0], row[0], row[1], row[2]);
    if(info.changes) added++;
  });
  if(added) console.log('药材零售价初始导入完成：新增 ' + added + ' 条（已存在的价格保持不变）。');
})();


// [stated] 药材最低零售价 RM0.10/g：把已导入价格里低于 0.10 的（含 46 味初始导入中的低价项）
// 统一调整为 0.10。幂等：执行一次后没有 <0.10 的记录，后续部署自动跳过；不影响用户后续手动调价。
(function migrateHerbMinPrice(){
  const info = db.prepare("UPDATE herb_prices SET price_per_g = 0.10 WHERE price_per_g < 0.10").run();
  if(info.changes) console.log('已将 ' + info.changes + ' 味低于 RM0.10 的药材价格统一调整为 RM0.10/g。');
})();

module.exports = db;
