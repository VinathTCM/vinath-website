# VINATH 中医平台 — 前端站点

VINATH 中医健康管理平台的网页前端，包含首页、商店、商品详情、旅程介绍、居家会诊、预约/订单查询、后台管理概念示意等页面。

## 在线访问

- 站点地址：https://vinathtcm.github.io/vinath-website/
- 首页入口：`index.html`（自动跳转到 `VINATH_首页.html`）

## 目录说明

| 文件 | 说明 |
| --- | --- |
| `VINATH_首页.html` | 网站首页 |
| `VINATH_商店.html` / `VINATH_商品详情.html` / `VINATH_购物车结算.html` / `VINATH_订单查询.html` | 商城流程页面 |
| `VINATH_居家会诊.html` / `VINATH_预约查询.html` | 预约会诊流程页面 |
| `VINATH_关于.html` / `VINATH_政策页面.html` / `VINATH_支持.html` | 品牌与说明页面 |
| `VINATH_六大旅程详情页_*.html` / `VINATH_*_细节页.html` | 六大调理旅程详情 |
| `VINATH_*_概念示意.html` | 后台管理界面概念稿（电子病历/处方/收据/排班/订单预约/商品/内容管理） |
| `vinath-backend-v29.zip` | Node.js 后端源码存档（部署后端时解压使用，配置见其中 `.env.example`） |

## 技术说明

- 纯静态 HTML / CSS / JavaScript，无构建步骤，可直接由 GitHub Pages 托管。
- 页面中的接口请求默认指向本地后端 `http://localhost:3001/api`（开发原型）。前端已预留 `window.VINATH_API_BASE` 覆盖入口，对接线上后端时设置该全局变量即可。
- 后端部署说明见 `vinath-backend-v29.zip` 内的 `README.md`。

## 本地预览

直接双击 HTML 文件，或在本目录运行本地静态服务器（如 `npx serve .`）后访问。
