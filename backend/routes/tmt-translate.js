// routes/tmt-translate.js —— 腾讯云TMT机器翻译中转接口
// 密钥存放在Render环境变量（TMT_SECRET_ID / TMT_SECRET_KEY），不会暴露到前端
const express = require('express');
const crypto = require('crypto');
const https = require('https');

const router = express.Router();

// 内存缓存——相同文本+目标语言直接返回缓存，减少API调用
// 简单LRU：最多存2000条，超出后按插入顺序淘汰
const CACHE_MAX = 2000;
const translationCache = new Map();

function getCache(text, target) {
  const key = target + '::' + text;
  return translationCache.get(key) || null;
}

function setCache(text, target, result) {
  const key = target + '::' + text;
  if (translationCache.size >= CACHE_MAX) {
    // 淘汰最旧的一条
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(key, result);
}

// 腾讯云TC3-HMAC-SHA256签名算法
function sha256(message) {
  return crypto.createHash('sha256').update(message).digest('hex');
}

function hmacSha256(key, message) {
  return crypto.createHmac('sha256', key).update(message).digest();
}

// 生成TC3签名
function buildAuthorization(secretId, secretKey, service, host, payload) {
  const algorithm = 'TC3-HMAC-SHA256';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = 'content-type:application/json; charset=utf-8\n' + 'host:' + host + '\n';
  const signedHeaders = 'content-type;host';
  const hashedRequestPayload = sha256(payload);
  const canonicalRequest = httpRequestMethod + '\n' +
    canonicalUri + '\n' +
    canonicalQueryString + '\n' +
    canonicalHeaders + '\n' +
    signedHeaders + '\n' +
    hashedRequestPayload;

  // 2. 拼接待签名字符串
  const credentialScope = date + '/' + service + '/tc3_request';
  const hashedCanonicalRequest = sha256(canonicalRequest);
  const stringToSign = algorithm + '\n' +
    timestamp + '\n' +
    credentialScope + '\n' +
    hashedCanonicalRequest;

  // 3. 计算签名
  const secretDate = hmacSha256('TC3' + secretKey, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

  // 4. 拼接Authorization
  const authorization = algorithm + ' ' +
    'Credential=' + secretId + '/' + credentialScope + ', ' +
    'SignedHeaders=' + signedHeaders + ', ' +
    'Signature=' + signature;

  return { authorization, timestamp };
}

// 调用腾讯TMT API
function callTMT(text, source, target) {
  return new Promise((resolve, reject) => {
    const secretId = process.env.TMT_SECRET_ID;
    const secretKey = process.env.TMT_SECRET_KEY;

    if (!secretId || !secretKey) {
      return reject(new Error('TMT密钥未配置，请在Render环境变量中设置TMT_SECRET_ID和TMT_SECRET_KEY'));
    }

    const service = 'tmt';
    const host = 'tmt.tencentcloudapi.com';
    const endpoint = 'https://' + host;

    const payload = JSON.stringify({
      SourceText: text,
      Source: source,
      Target: target,
      ProjectId: 0
    });

    const { authorization, timestamp } = buildAuthorization(secretId, secretKey, service, host, payload);

    const options = {
      hostname: host,
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json; charset=utf-8',
        'Host': host,
        'X-TC-Action': 'TextTranslate',
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Version': '2018-03-21',
        'X-TC-Region': 'ap-singapore',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.Response && result.Response.TargetText) {
            resolve(result.Response.TargetText);
          } else if (result.Response && result.Response.Error) {
            reject(new Error('TMT错误: ' + result.Response.Error.Code + ' - ' + result.Response.Error.Message));
          } else {
            reject(new Error('TMT返回格式异常: ' + data.substring(0, 200)));
          }
        } catch (e) {
          reject(new Error('TMT响应解析失败: ' + e.message));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error('TMT请求失败: ' + e.message));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('TMT请求超时'));
    });

    req.write(payload);
    req.end();
  });
}

// 语言代码映射
// 前端传 en / bm，TMT用 en / ms
const LANG_MAP = {
  'en': 'en',
  'bm': 'ms',
  'ms': 'ms'
};

// POST /api/tmt-translate
// body: { text: "要翻译的文本", target: "en" | "bm" }
router.post('/tmt-translate', async (req, res) => {
  try {
    const { text, target } = req.body;

    // 参数校验
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'text不能为空' });
    }
    if (!target || !LANG_MAP[target]) {
      return res.status(400).json({ error: 'target必须是en或bm' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: '文本过长，最多2000字符' });
    }

    const tmtTarget = LANG_MAP[target];

    // 查缓存
    const cached = getCache(text, tmtTarget);
    if (cached) {
      return res.json({ translated: cached, cached: true });
    }

    // 调用TMT
    const translated = await callTMT(text, 'zh', tmtTarget);

    // 存缓存
    setCache(text, tmtTarget, translated);

    res.json({ translated: translated, cached: false });

  } catch (e) {
    console.error('[TMT翻译] 失败:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tmt-translate/status —— 检查密钥是否配置
router.get('/tmt-translate/status', (req, res) => {
  const hasSecretId = !!process.env.TMT_SECRET_ID;
  const hasSecretKey = !!process.env.TMT_SECRET_KEY;
  res.json({
    configured: hasSecretId && hasSecretKey,
    hasSecretId: hasSecretId,
    hasSecretKey: hasSecretKey,
    cacheSize: translationCache.size
  });
});

module.exports = router;
