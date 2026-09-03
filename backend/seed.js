// seed.js —— 写入初始数据：两位大管理员账号、几个示例商品、一个付款方式
const db = require('./db');

const insertAdmin = db.prepare('INSERT OR IGNORE INTO admins (id, name, role, regions, coupon_code) VALUES (?, ?, ?, ?, ?)');
insertAdmin.run('gong', '龚诗宏医师', 'SENIOR', '[]', 'VINCENT');
insertAdmin.run('yu', '余采恩医师', 'SENIOR', '[]', 'NATALIA');
insertAdmin.run('j1', '测试医师', 'PRACTITIONER', JSON.stringify(['Klang', 'Petaling Jaya']), null);

const updateProfile = db.prepare('UPDATE admins SET title = ?, creds = ?, description = ?, tags = ? WHERE id = ? AND title IS NULL');
updateProfile.run('中医师', '中医骨伤科学硕士 · 马来西亚卫生部认证',
  '持有中国上海高级推拿师执照10年之久，并有新加坡中医理疗相关工作经历。专注颈肩腰腿痛、旧伤劳损、关节淤堵、跌打损伤调理，擅用中药外敷、经络调理改善各类慢性骨伤病痛，自研骨伤专用敷贴配方，适配日常劳损、运动损伤、陈年旧患。',
  JSON.stringify(['舒缓疼痛','中医塑体','日常养生','美容养颜','优质睡眠']), 'gong');
updateProfile.run('中医师', '中医妇科学硕士 · 马来西亚卫生部认证',
  '曾在中国上海、马来西亚等地开展中医研究活动，擅长更年期不适、睡眠质量不佳等相关调理。专攻女性内分泌、经期不适、产后体虚、气血失衡等妇科问题，搭配草本外用膏方内调外养，温和调理女性各类亚健康症状。',
  JSON.stringify(['女性调理','日常养生','优质睡眠','美容养颜','中医塑体']), 'yu');

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (id, name, name_en, type, price, stock_qty, description)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
insertProduct.run('prod_seed_1', '月舒贴', 'Moon Ease Patch', 'plaster', 9, 200, '经期外用贴敷，草本温感配方');
insertProduct.run('prod_seed_2', '弦月茶', 'Crescent Tea', 'tea', 18, 150, '日常调理茶饮');

const insertCategory = db.prepare('INSERT OR IGNORE INTO shop_categories (id, key, name, sort_order) VALUES (?, ?, ?, ?)');
insertCategory.run('cat_plaster', 'plaster', '膏药系列', 0);
insertCategory.run('cat_tea', 'tea', '茶饮系列', 1);
insertCategory.run('cat_soak', 'soak', '汤包系列', 2);
insertCategory.run('cat_mask', 'mask', '外用系列', 3);

db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)')
  .run('business_info', JSON.stringify({whatsapp:'60138092888', taxId:'IG55173378000'}));
db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)')
  .run('module_access', JSON.stringify({medicalRecords:false, prescriptions:false, receipts:false}));

console.log('种子数据写入完成');
console.log('管理员账号:', db.prepare('SELECT id, name, role FROM admins').all());
console.log('商品:', db.prepare('SELECT id, name, price, stock_qty FROM products').all());
