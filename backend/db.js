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
  // instant_requests 软删除字段（回收箱30天）——幂等添加，列已存在时跳过
  const ircols = db.prepare('PRAGMA table_info(instant_requests)').all().map(c => c.name);
  if(!ircols.includes('deleted_at')) db.exec('ALTER TABLE instant_requests ADD COLUMN deleted_at TEXT');
  if(!ircols.includes('deleted_by')) db.exec('ALTER TABLE instant_requests ADD COLUMN deleted_by TEXT');

  // products：1正装=N试用装（不设置为null，前台不提示）
  const prodcols = db.prepare('PRAGMA table_info(products)').all().map(c => c.name);
  if(!prodcols.includes('trial_per_full')) db.exec('ALTER TABLE products ADD COLUMN trial_per_full INTEGER');

  const pcols = db.prepare('PRAGMA table_info(prescriptions)').all().map(c => c.name);
  const padd = (col, ddl) => { if(!pcols.includes(col)) db.exec('ALTER TABLE prescriptions ADD COLUMN ' + ddl); };
  padd('doses', "doses INTEGER DEFAULT 1");
  padd('dispense_mode', "dispense_mode TEXT DEFAULT 'herb_pickup'");
  padd('herb_total', "herb_total REAL DEFAULT 0");
  padd('decoct_fee', "decoct_fee REAL DEFAULT 0");
  padd('decoct_doses', "decoct_doses INTEGER DEFAULT 0");
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



// [stated] 常用中药大全补全（价格待定 0，仅用于开方联想）。幂等：ON CONFLICT DO NOTHING，
// 已存在（含已定价/用户手动调价）的记录一律不动；未定价的新药以 0 入库，之后在价格库手动填价。
(function migrateHerbPricesCommon(){
  const seed = [
    "人参",
    "太子参",
    "西洋参",
    "党参",
    "黄芪",
    "白术",
    "山药",
    "白扁豆",
    "甘草",
    "大枣",
    "饴糖",
    "蜂蜜",
    "当归",
    "熟地黄",
    "白芍",
    "阿胶",
    "何首乌",
    "龙眼肉",
    "鹿茸",
    "巴戟天",
    "淫羊藿",
    "仙茅",
    "补骨脂",
    "益智仁",
    "菟丝子",
    "沙苑子",
    "韭菜子",
    "杜仲",
    "续断",
    "肉苁蓉",
    "锁阳",
    "冬虫夏草",
    "核桃仁",
    "海马",
    "蛤蚧",
    "北沙参",
    "南沙参",
    "麦冬",
    "天冬",
    "玉竹",
    "黄精",
    "石斛",
    "百合",
    "枸杞子",
    "女贞子",
    "墨旱莲",
    "龟甲",
    "鳖甲",
    "桑椹",
    "黑芝麻",
    "麻黄",
    "桂枝",
    "紫苏叶",
    "生姜",
    "香薷",
    "荆芥",
    "防风",
    "羌活",
    "白芷",
    "细辛",
    "藁本",
    "苍耳子",
    "辛夷",
    "薄荷",
    "牛蒡子",
    "蝉蜕",
    "桑叶",
    "菊花",
    "蔓荆子",
    "柴胡",
    "升麻",
    "葛根",
    "淡豆豉",
    "浮萍",
    "石膏",
    "知母",
    "芦根",
    "天花粉",
    "竹叶",
    "淡竹叶",
    "栀子",
    "夏枯草",
    "决明子",
    "谷精草",
    "密蒙花",
    "青葙子",
    "黄芩",
    "黄连",
    "黄柏",
    "龙胆",
    "秦皮",
    "苦参",
    "白鲜皮",
    "金银花",
    "连翘",
    "蒲公英",
    "紫花地丁",
    "野菊花",
    "穿心莲",
    "大青叶",
    "板蓝根",
    "青黛",
    "贯众",
    "重楼",
    "鱼腥草",
    "射干",
    "山豆根",
    "马勃",
    "白头翁",
    "马齿苋",
    "鸦胆子",
    "生地黄",
    "玄参",
    "牡丹皮",
    "赤芍",
    "紫草",
    "青蒿",
    "白薇",
    "地骨皮",
    "银柴胡",
    "胡黄连",
    "大黄",
    "芒硝",
    "番泻叶",
    "芦荟",
    "火麻仁",
    "郁李仁",
    "松子仁",
    "甘遂",
    "京大戟",
    "芫花",
    "商陆",
    "牵牛子",
    "巴豆霜",
    "独活",
    "威灵仙",
    "防己",
    "秦艽",
    "豨莶草",
    "臭梧桐",
    "木瓜",
    "海风藤",
    "青风藤",
    "络石藤",
    "雷公藤",
    "桑枝",
    "桑寄生",
    "五加皮",
    "狗脊",
    "千年健",
    "鹿衔草",
    "穿山龙",
    "路路通",
    "伸筋草",
    "藿香",
    "佩兰",
    "苍术",
    "厚朴",
    "砂仁",
    "白豆蔻",
    "草豆蔻",
    "草果",
    "紫苏梗",
    "茯苓",
    "猪苓",
    "泽泻",
    "薏苡仁",
    "车前子",
    "滑石",
    "木通",
    "通草",
    "瞿麦",
    "萹蓄",
    "地肤子",
    "海金沙",
    "石韦",
    "冬葵子",
    "灯心草",
    "茵陈",
    "金钱草",
    "虎杖",
    "垂盆草",
    "玉米须",
    "冬瓜皮",
    "附子",
    "干姜",
    "肉桂",
    "吴茱萸",
    "小茴香",
    "丁香",
    "高良姜",
    "花椒",
    "胡椒",
    "荜茇",
    "荜澄茄",
    "红豆蔻",
    "陈皮",
    "青皮",
    "枳实",
    "枳壳",
    "木香",
    "沉香",
    "檀香",
    "川楝子",
    "乌药",
    "荔枝核",
    "香附",
    "佛手",
    "香橼",
    "玫瑰花",
    "绿萼梅",
    "薤白",
    "柿蒂",
    "甘松",
    "大腹皮",
    "山楂",
    "神曲",
    "麦芽",
    "谷芽",
    "莱菔子",
    "鸡内金",
    "使君子",
    "苦楝皮",
    "槟榔",
    "南瓜子",
    "鹤草芽",
    "雷丸",
    "榧子",
    "大蓟",
    "小蓟",
    "地榆",
    "槐花",
    "侧柏叶",
    "白茅根",
    "三七",
    "茜草",
    "蒲黄",
    "花蕊石",
    "白及",
    "仙鹤草",
    "棕榈炭",
    "血余炭",
    "藕节",
    "降香",
    "川芎",
    "延胡索",
    "郁金",
    "姜黄",
    "乳香",
    "没药",
    "五灵脂",
    "丹参",
    "红花",
    "桃仁",
    "益母草",
    "泽兰",
    "牛膝",
    "鸡血藤",
    "王不留行",
    "苏木",
    "骨碎补",
    "血竭",
    "莪术",
    "三棱",
    "水蛭",
    "虻虫",
    "土鳖虫",
    "自然铜",
    "马钱子",
    "半夏",
    "天南星",
    "禹白附",
    "芥子",
    "皂荚",
    "旋覆花",
    "白前",
    "前胡",
    "桔梗",
    "川贝母",
    "浙贝母",
    "瓜蒌",
    "竹茹",
    "竹沥",
    "天竺黄",
    "海藻",
    "昆布",
    "黄药子",
    "海蛤壳",
    "海浮石",
    "瓦楞子",
    "礞石",
    "苦杏仁",
    "紫苏子",
    "百部",
    "紫菀",
    "款冬花",
    "马兜铃",
    "枇杷叶",
    "桑白皮",
    "葶苈子",
    "白果",
    "胖大海",
    "罗汉果",
    "朱砂",
    "磁石",
    "龙骨",
    "琥珀",
    "酸枣仁",
    "柏子仁",
    "灵芝",
    "缬草",
    "远志",
    "合欢皮",
    "合欢花",
    "首乌藤",
    "茯神",
    "石决明",
    "珍珠母",
    "牡蛎",
    "代赭石",
    "刺蒺藜",
    "罗布麻",
    "羚羊角",
    "牛黄",
    "钩藤",
    "天麻",
    "地龙",
    "全蝎",
    "蜈蚣",
    "僵蚕",
    "麝香",
    "冰片",
    "苏合香",
    "石菖蒲",
    "五味子",
    "乌梅",
    "五倍子",
    "罂粟壳",
    "诃子",
    "石榴皮",
    "肉豆蔻",
    "赤石脂",
    "禹余粮",
    "覆盆子",
    "桑螵蛸",
    "金樱子",
    "海螵蛸",
    "莲子",
    "芡实",
    "山茱萸",
    "椿皮",
    "鸡冠花",
    "麻黄根",
    "糯稻根须",
    "雄黄",
    "硫黄",
    "白矾",
    "蛇床子",
    "蟾酥",
    "樟脑",
    "木鳖子",
    "土荆皮",
    "蜂房",
    "大蒜",
    "升药",
    "轻粉",
    "砒石",
    "铅丹",
    "炉甘石",
    "硼砂",
  ];
  const stmt = db.prepare('INSERT INTO herb_prices (id, herb_name, price_per_g, note) VALUES (?, ?, ?, ?) ON CONFLICT(herb_name) DO NOTHING');
  let added = 0;
  seed.forEach(function(nm){
    const info = stmt.run('hp_common_' + nm, nm, 0, '价格待定（仅联想）');
    if(info.changes) added++;
  });
  if(added) console.log('常用中药大全补全：新增 ' + added + ' 味（价格待定，可联想）。');
})();

// [stated] 药材最低零售价 RM0.10/g：把已导入价格里低于 0.10 的（含 46 味初始导入中的低价项）
// 统一调整为 0.10。幂等：执行一次后没有 <0.10 的记录，后续部署自动跳过；不影响用户后续手动调价。
(function migrateHerbMinPrice(){
  const info = db.prepare("UPDATE herb_prices SET price_per_g = 0.10 WHERE price_per_g > 0 AND price_per_g < 0.10").run();
  if(info.changes) console.log('已将 ' + info.changes + ' 味低于 RM0.10 的药材价格统一调整为 RM0.10/g。');
})();


// 软删除字段迁移：bookings / orders 表加 deleted_at、deleted_by
// 已删除的记录从正常列表隐藏，进入回收箱；30天后自动永久删除。
(function migrateSoftDeleteColumns(){
  function ensureColumn(table, col, type){
    try {
      const cols = db.prepare("PRAGMA table_info(" + table + ")").all();
      if(!cols.find(function(c){ return c.name === col; })){
        db.prepare("ALTER TABLE " + table + " ADD COLUMN " + col + " " + type).run();
        console.log('[软删除] 已为 ' + table + ' 表添加 ' + col + ' 字段');
      }
    } catch(e){ console.log('[软删除] 迁移 ' + table + '.' + col + ' 失败:', e.message); }
  }
  ensureColumn('bookings', 'deleted_at', 'TEXT');
  ensureColumn('bookings', 'deleted_by', 'TEXT');
  ensureColumn('orders', 'deleted_at', 'TEXT');
  ensureColumn('orders', 'deleted_by', 'TEXT');
})();

// 启动时清理回收箱中超过30天的记录（永久删除）
(function purgeOldSoftDeleted(){
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  try {
    const bInfo = db.prepare("DELETE FROM bookings WHERE deleted_at IS NOT NULL AND deleted_at < ?").run(cutoff);
    if(bInfo.changes) console.log('[回收箱] 已永久删除 ' + bInfo.changes + ' 条超过30天的预约记录');
  } catch(e){}
  try {
    const oInfo = db.prepare("DELETE FROM orders WHERE deleted_at IS NOT NULL AND deleted_at < ?").run(cutoff);
    if(oInfo.changes) console.log('[回收箱] 已永久删除 ' + oInfo.changes + ' 条超过30天的订单记录');
  } catch(e){}
})();



// ===== 数据迁移：更新旧医师档案的description和tags（合规修改） =====
try {
  const gong = db.prepare("SELECT id, description, tags FROM admins WHERE id = 'gong'").get();
  if (gong) {
    const needUpdateDesc = !gong.description || !gong.description.includes('中国上海');
    const needUpdateTags = !gong.tags || gong.tags.includes('止痛');
    if (needUpdateDesc || needUpdateTags) {
      const newDesc = '持有中国上海高级推拿师执照10年之久，并有新加坡中医理疗相关工作经历。专注颈肩腰腿痛、旧伤劳损、关节淤堵、跌打损伤调理，擅用中药外敷、经络调理改善各类慢性骨伤病痛，自研骨伤专用敷贴配方，适配日常劳损、运动损伤、陈年旧患。';
      const newTags = JSON.stringify(['舒缓疼痛','中医塑体','日常养生','美容养颜','优质睡眠']);
      db.prepare("UPDATE admins SET description = ?, tags = ? WHERE id = 'gong'").run(
        needUpdateDesc ? newDesc : gong.description,
        needUpdateTags ? newTags : gong.tags
      );
      console.log('[迁移] 已更新龚诗宏医师档案:', needUpdateDesc ? 'description' : '', needUpdateTags ? 'tags' : '');
    }
  }
} catch(e) {
  console.log('[迁移] 医师档案迁移跳过:', e.message);
}



// ===== 迁移：茶饮系列商品 v2 — 广告法合规重命名 + 双语 + 重新定价（2026-09-11） =====
(function migrateTeaProductsV2(){
  try {
    // 添加双语字段
    const pcols = db.prepare("PRAGMA table_info(products)").all().map(c=>c.name);
    if(!pcols.includes('description_en')) db.exec("ALTER TABLE products ADD COLUMN description_en TEXT");
    if(!pcols.includes('usage_note_en')) db.exec("ALTER TABLE products ADD COLUMN usage_note_en");

    const teaProducts = [
      {
        id:'tea_fuxiaomai', name:'浮小麦白芍茶', nameEn:'Wheat & Peony Calming Tea',
        price:38, trial_price:12, cost:5.91, cost_trial:1.69,
        wholesale_price:18, wholesale_trial_price:5,
        description:'精神紧绷、夜里睡不安稳时，一杯温茶慢慢放松下来。适合日常压力大、思虑过多的人群饮用。',
        description_en:'A warm cup to help you unwind when the mind feels tight and restless. Suitable for those with daily stress and busy thoughts.',
        usage_note:'浸泡10-20分钟，代茶饮。忌：虚寒腹痛泄泻者慎服。',
        usage_note_en:'Steep 10-20 minutes, drink as tea. Caution: Not suitable for those with cold-deficiency abdominal pain or diarrhea.',
        herbs:JSON.stringify([{herb:'浮小麦',amt:'7g'},{herb:'白芍',amt:'3.5g'},{herb:'甘草',amt:'1.5g'}]),
        form:'茶包', tags:JSON.stringify(['精神紧张','睡不好']), journeys:JSON.stringify(['优质睡眠','日常养生'])
      },
      {
        id:'tea_duzhong', name:'杜仲续断茶', nameEn:'Eucommia & Teasel Tea',
        price:40, trial_price:13, cost:7.03, cost_trial:2.01,
        wholesale_price:20, wholesale_trial_price:5,
        description:'久坐久站后腰背发酸，日常养护肝肾、强健筋骨。适合长期伏案、站立工作的人群日常调理。',
        description_en:'Daily support for lower back and joints after long hours sitting or standing. Nourishes and strengthens for those with desk-bound or standing jobs.',
        usage_note:'加水煮沸，转小火煮30分钟，去渣取汁，代茶饮。忌：阴虚火旺者慎服。',
        usage_note_en:'Boil then simmer 30 mins, strain and drink. Caution: Not suitable for those with yin-deficiency heat signs.',
        herbs:JSON.stringify([{herb:'杜仲',amt:'4g'},{herb:'怀牛膝',amt:'4g'},{herb:'续断',amt:'4g'}]),
        form:'茶包', tags:JSON.stringify(['腰酸背痛']), journeys:JSON.stringify(['舒缓疼痛'])
      },
      {
        id:'tea_siwu', name:'四物滋养茶', nameEn:'Four Substances Nourishing Tea',
        price:45, trial_price:15, cost:9.84, cost_trial:2.81,
        wholesale_price:23, wholesale_trial_price:6,
        description:'经典妇科调理基础方，温和滋养气血，适合日常女性养护、经期后调理饮用。',
        description_en:'A classic women\'s wellness formula, gently nourishing from within. Suitable for daily women\'s care and post-cycle support.',
        usage_note:'加水煎煮，去渣取汁，可作茶饮/炖肉/熬汤。忌：牛奶、绿豆。',
        usage_note_en:'Decoct in water, strain. Can be used as tea, in soups or stews. Avoid: milk, mung bean.',
        herbs:JSON.stringify([{herb:'当归',amt:'3.3g'},{herb:'熟地黄',amt:'3.3g'},{herb:'白芍',amt:'3.3g'},{herb:'川芎',amt:'2.1g'}]),
        form:'茶包', tags:JSON.stringify(['女性保健']), journeys:JSON.stringify(['女性调理'])
      },
      {
        id:'tea_tongjing', name:'经期舒缓茶', nameEn:'Cycle Soothing Tea',
        price:48, trial_price:16, cost:11.23, cost_trial:3.21,
        wholesale_price:25, wholesale_trial_price:6,
        description:'经期前小腹坠胀、经血不畅时，益气活血、温和舒缓经期不适。适合经期前一周开始饮用。',
        description_en:'Gentle support for pre-cycle discomfort and bloating. Nourishes qi and blood flow. Best enjoyed the week before your cycle.',
        usage_note:'开水冲泡5分钟，茶饮。忌：月经量多者禁用。',
        usage_note_en:'Steep 5 minutes in boiling water, drink as tea. Contraindication: Not for heavy menstrual flow.',
        herbs:JSON.stringify([{herb:'黄芪',amt:'2.4g'},{herb:'党参',amt:'2.4g'},{herb:'川芎',amt:'2.4g'},{herb:'当归',amt:'2.4g'},{herb:'枸杞',amt:'2.4g'}]),
        form:'茶包', tags:JSON.stringify(['经期不适']), journeys:JSON.stringify(['女性调理'])
      },
      {
        id:'tea_qinghua', name:'清润祛湿茶', nameEn:'Dampness Balancing Tea',
        price:36, trial_price:12, cost:5.66, cost_trial:1.62,
        wholesale_price:17, wholesale_trial_price:5,
        description:'身体困重、舌苔黄腻时，健脾利湿、清润祛湿，清爽过一天。适合湿热体质日常调理。',
        description_en:'Helps the body feel lighter when sluggish and heavy. Supports spleen and dampness balance for daily wellness.',
        usage_note:'开水冲泡或轻煎10分钟，代茶饮。',
        usage_note_en:'Steep or lightly simmer 10 minutes, drink as tea.',
        herbs:JSON.stringify([{herb:'茯苓',amt:'6g'},{herb:'泽泻',amt:'3g'},{herb:'陈皮',amt:'2g'},{herb:'甘草',amt:'1g'}]),
        form:'茶包', tags:JSON.stringify(['湿热体质']), journeys:JSON.stringify(['日常养生'])
      },
      {
        id:'tea_qingliang', name:'清心舒缓茶', nameEn:'Heart Calming Tea',
        price:38, trial_price:12, cost:6.40, cost_trial:1.83,
        wholesale_price:18, wholesale_trial_price:5,
        description:'心烦口干、咽喉燥热时，清心除烦、清凉舒缓，让身体静下来。建议喝2-4天休息。',
        description_en:'Cooling and calming for restlessness, dry mouth and throat irritation. Helps the body settle. Suggest 2-4 days on, then rest.',
        usage_note:'开水冲泡5-10分钟，代茶饮。忌：脾胃虚寒、容易拉肚子的人、经期女性、孕妇。',
        usage_note_en:'Steep 5-10 minutes, drink as tea. Caution: Not for cold-deficiency digestion, diarrhea-prone, during cycle, or pregnancy.',
        herbs:JSON.stringify([{herb:'莲子',amt:'8g'},{herb:'薄荷',amt:'2g'},{herb:'甘草',amt:'2g'}]),
        form:'茶包', tags:JSON.stringify(['心烦燥热']), journeys:JSON.stringify(['日常养生','优质睡眠'])
      },
      {
        id:'tea_yiqi', name:'气血滋养茶', nameEn:'Qi & Blood Nourishing Tea',
        price:42, trial_price:14, cost:8.19, cost_trial:2.34,
        wholesale_price:21, wholesale_trial_price:5,
        description:'容易疲劳、气短懒言时，益气养血、慢慢补足精气神。适合气虚体质日常养护。',
        description_en:'Gentle nourishment for fatigue and low energy. Slowly restores vitality for daily wellness.',
        usage_note:'开水冲泡或轻煎15分钟，代茶饮。忌：感冒发热、经量大者。',
        usage_note_en:'Steep or simmer 15 minutes, drink as tea. Caution: Not during cold/fever or heavy cycle.',
        herbs:JSON.stringify([{herb:'黄芪',amt:'7.5g'},{herb:'当归',amt:'1.5g'},{herb:'红枣',amt:'3g'}]),
        form:'茶包', tags:JSON.stringify(['气虚疲劳']), journeys:JSON.stringify(['日常养生','女性调理'])
      }
    ];

    const upsert = db.prepare(`
      INSERT OR REPLACE INTO products
        (id, name, name_en, type, price, trial_price, cost, cost_trial,
         wholesale_price, wholesale_trial_price, stock_qty, active, featured,
         description, description_en, usage_note, usage_note_en, herbs, form, tags, journeys, images)
      VALUES
        (@id, @name, @nameEn, 'tea', @price, @trial_price, @cost, @cost_trial,
         @wholesale_price, @wholesale_trial_price, 100, 1, 0,
         @description, @description_en, @usage_note, @usage_note_en, @herbs, @form, @tags, @journeys, '[]')
    `);

    let count = 0;
    teaProducts.forEach(function(p){
      upsert.run(p);
      count++;
    });
    console.log('[迁移] 茶饮系列商品 v2 已更新 ' + count + ' 个（合规重命名+双语+重新定价）');
  } catch(e) {
    console.log('[迁移] 茶饮商品v2迁移跳过:', e.message);
  }
})();


module.exports = db;
