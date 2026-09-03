# VINATH 后端 · 商品与订单模块（真实可运行）

覆盖"接单"最核心的部分：管理员账号、商品、订单、居家会诊预约。已经用真实HTTP请求完整测试过，
包括：下单、库存扣减、超量下单拦截、客户凭订单号+手机号查询、管理员登录查看/处理订单、
标记付款核实、预约创建与查询。

## 本地跑起来

```bash
npm install
node seed.js      # 写入初始管理员账号(gong/yu/j1)、示例商品、分类
node server.js    # 启动，监听 3001 端口
```

## 目录结构

```
db.js              数据库连接与全部表结构
middleware/auth.js JWT 校验中间件
routes/auth.js     管理员账号：注册/登录/改密码/重置密码
routes/products.js 商品与商店分类
routes/orders.js   订单（含库存扣减）、付款方式
routes/bookings.js 居家会诊预约
server.js          主入口
seed.js            初始数据
```

## 前端怎么接

`VINATH_购物车结算.html` 已经改造完成，可以直接对照它的写法：
- 页面加载时先 `fetch(API_BASE + '/products')` 把商品拉下来，再渲染
- 下单时 `POST` 到 `/api/orders`，不再写 localStorage
- `API_BASE` 变量在文件里搜得到，本地测试是 `http://localhost:3001/api`，
  部署到生产环境时换成真实域名即可

其他前端页面（商店、商品详情、居家会诊等）还没有照这个模式改，思路是一样的，
可以直接参考购物车结算这份代码。

## 部署到生产环境需要做的事

1. **数据库换成 PostgreSQL**——现在用 SQLite 只是为了本地开发方便，不需要额外起数据库服务。
   生产环境建议用 Railway / Render / Supabase 这类平台自带的 Postgres，把 `db.js` 里
   `better-sqlite3` 的调用方式换成 `pg` 库（多数 SQL 语句可以直接复用，个别语法要调整）
2. **`JWT_SECRET` 换成真正随机生成的密钥**，通过环境变量注入，不要写死在代码里
3. **加 HTTPS**——大部分托管平台会自动处理
4. **加请求频率限制**，防止有人对着登录接口暴力破解密码
5. **把 `API_BASE` 从 localhost 换成真实域名**，在所有已经接入后端的前端页面里统一改
