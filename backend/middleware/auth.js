// middleware/auth.js —— JWT 校验中间件，各个路由文件共用这一套
const jwt = require('jsonwebtoken');
const db = require('../db');
const INSECURE_DEFAULT_SECRET = 'dev-only-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || INSECURE_DEFAULT_SECRET;

// 生产环境下，如果还在用这个写死在代码里、任何拿到这份代码的人都看得到的默认密钥，
// 直接拒绝启动——总比"静默用不安全密钥跑起来、谁都能伪造登录token"要好。
// 开发/测试环境下继续放行，但把警告打得足够醒目，不会被日志刷掉。
if(JWT_SECRET === INSECURE_DEFAULT_SECRET){
  if(process.env.NODE_ENV === 'production'){
    console.error('\n' + '='.repeat(70));
    console.error('❌ 致命错误：生产环境下检测到 JWT_SECRET 环境变量未设置');
    console.error('   现在如果继续启动，会使用代码里写死的默认密钥——任何拿到这份');
    console.error('   代码的人都能伪造任意账号的登录状态。已拒绝启动。');
    console.error('   请设置一个真实的随机密钥，例如：');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    console.error('   然后在部署平台的环境变量里设置 JWT_SECRET=<刚生成的值>');
    console.error('='.repeat(70) + '\n');
    process.exit(1);
  }
  console.warn('\n⚠️  警告：JWT_SECRET 环境变量未设置，正在使用仅供本地开发用的默认密钥。');
  console.warn('   部署到真实服务器前，必须设置一个真正随机的 JWT_SECRET，否则任何');
  console.warn('   拿到这份代码的人都能伪造登录状态。设置 NODE_ENV=production 后，');
  console.warn('   这个警告会变成直接拒绝启动。\n');
}

function authMiddleware(req, res, next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if(!token) return res.status(401).json({ error: '未登录或登录已过期' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch(e){
    return res.status(401).json({ error: '登录状态无效，请重新登录' });
  }
}

function requireRole(...allowedRoles){
  return (req, res, next) => {
    if(!allowedRoles.includes(req.admin.role)){
      return res.status(403).json({ error: '没有权限执行此操作' });
    }
    next();
  };
}

// [stated] 电子病历/电子处方/电子收据这三个工具，目前只想先给两位大管理员用，I类执业医师
// 要不要开放，由大管理员自己按运营需要决定、随时能开关，不是写死在代码里的。大管理员本人
// 不受这个开关影响，永远能用。
function requireModuleAccess(moduleName){
  return (req, res, next) => {
    if(req.admin.role === 'SENIOR') return next();
    if(req.admin.role !== 'PRACTITIONER'){
      return res.status(403).json({ error: '没有权限执行此操作' });
    }
    try {
      const row = db.prepare("SELECT value FROM site_settings WHERE key = 'module_access'").get();
      const access = row ? JSON.parse(row.value) : {};
      if(access[moduleName] === true) return next();
    } catch(e){ console.error('查询功能开关失败:', e); }
    return res.status(403).json({ error: '这个功能目前还没有对你开放，请联系大管理员' });
  };
}

// [stated] 通用审计日志——不只是病历访问，商品价格改动、订单状态/付款核实、账号管理、黑名单这些
// 敏感操作也要记下"谁在什么时候做了什么"。复用同一张access_log表(resource_type区分类型)，
// 各个路由文件都调用这一个函数，不用各自重复写记录逻辑。detail是给人看的一句话摘要（比如
// "价格从RM39改成RM45"），不是结构化数据，方便审计日志页面直接展示。
function logAdminAction(req, action, resourceType, resourceId, detail){
  try {
    db.prepare('INSERT INTO access_log (id, admin_id, admin_name, action, resource_type, resource_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('log_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), req.admin.sub, req.admin.name, action, resourceType, resourceId||null, detail||null);
  } catch(e){ console.error('写入审计日志失败:', e); } // 日志写入失败不应该阻断正常业务流程
}

function signToken(admin){
  return jwt.sign(
    { sub: admin.id, name: admin.name, role: admin.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = { authMiddleware, requireRole, requireModuleAccess, logAdminAction, signToken, JWT_SECRET };
