// routes/settings.js —— 站点级内容设置：基本信息/公告栏/政策页面/健康旅程，概念上都是"整站共享一份"的内容，
// 用同一张key-value表存，每个key对应的value是什么JSON形状由各自的用法决定（对象/数组/映射都可以）
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// 白名单——不是任意key都能存，避免这个通用接口被当成不受限的任意键值存储用
const ALLOWED_KEYS = ['business_info', 'announcements', 'policy_pages', 'health_journeys', 'module_access', 'service_areas', 'price_list', 'shop_categories', 'shipping_settings', 'consult_price_images', 'consult_price_images_by_doc', 'senior_sync_schedule'];

router.get('/site-settings/:key', (req, res) => {
  if(!ALLOWED_KEYS.includes(req.params.key)) return res.status(404).json({ error: '不存在这个设置项' });
  const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(req.params.key);
  res.json(row ? JSON.parse(row.value) : null);
});

router.put('/admin/site-settings/:key', authMiddleware, requireRole('SENIOR', 'PRACTITIONER'), (req, res) => {
  if(!ALLOWED_KEYS.includes(req.params.key)) return res.status(404).json({ error: '不存在这个设置项' });
  // 按医师的居家会诊价格表：PRACTITIONER 只能写自己名下的那份，SENIOR 可管理全部
  if(req.params.key === 'consult_price_images_by_doc'){
    const body = req.body || {};
    const docIds = Object.keys(body);
    if(req.admin.role !== 'SENIOR'){
      if(docIds.length !== 1 || docIds[0] !== req.admin.sub){
        return res.status(403).json({ error: '只能保存自己名下的价格表' });
      }
    }
  }
  // 大管理员同步出诊开关：只有大管理员能改；值本身是布尔（express 严格 JSON 解析不接受顶层裸布尔，
  // 前端传 {enabled:true/false} 对象，这里归一化后存裸布尔，GET 时语义清晰）
  if(req.params.key === 'senior_sync_schedule'){
    if(req.admin.role !== 'SENIOR'){
      return res.status(403).json({ error: '只有大管理员可以设置同步出诊' });
    }
    const raw = req.body;
    const enabled = (typeof raw === 'object' && raw !== null) ? !!raw.enabled : !!raw;
    db.prepare(`
      INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(req.params.key, JSON.stringify(enabled));
    return res.json({ ok: true, enabled });
  }
  db.prepare(`
    INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(req.params.key, JSON.stringify(req.body));
  res.json({ ok: true });
});

module.exports = router;
