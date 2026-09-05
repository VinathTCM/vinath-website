// server.js —— 主入口，把各个模块的路由挂起来
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 付款截图是base64图片，默认1mb限制不够用

// 全局限流——防止整体滥用/爬虫，留足余量不误伤正常使用（聊天轮询每4秒一次算下来15分钟约225次，
// 一个人同时开着好几个页面、来回切换也很正常，所以给到一个明显宽松于正常用量的上限）
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求太频繁，请稍后再试' }
}));

// 登录/注册接口单独收紧——防暴力破解密码。按当前这个中间件的注册顺序，这条会在上面那条
// 全局限流之后再叠加一层，两条限制同时生效，登录接口实际受更严格的这条约束
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '尝试次数过多，请15分钟后再试' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/products'));
app.use('/api', require('./routes/orders'));
app.use('/api', require('./routes/bookings'));
app.use('/api', require('./routes/wholesale'));
app.use('/api', require('./routes/instant'));
app.use('/api', require('./routes/medical'));
app.use('/api', require('./routes/prescriptions'));
app.use('/api', require('./routes/formulas'));
app.use('/api', require('./routes/receipts'));
app.use('/api', require('./routes/schedule'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/analytics'));
app.use('/api', require('./routes/settings'));
app.use('/api', require('./routes/staff-chat'));
app.use('/api', require('./routes/reviews'));
app.use('/api', require('./routes/audit'));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`VINATH 后端已启动，监听端口 ${PORT}`);
});

module.exports = app;
