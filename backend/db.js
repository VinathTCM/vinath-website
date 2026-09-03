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
`);

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

module.exports = db;
