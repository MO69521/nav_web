# MO'S SPACE

一个可直接使用的个人导航工作台，包含多引擎搜索、分类筛选、收藏、自定义网址、深浅主题和便笺。

## 本地运行

```bash
npm install
npm run dev
```

默认访问 `http://localhost:5173`。

## 自定义内容

- 默认网址：修改 `main.js` 中的 `baseSites`
- 品牌与文案：修改 `index.html`
- 颜色与视觉：修改 `styles.css` 顶部的 CSS 变量
- 页面内新增的网址、收藏、主题和便笺会保存在浏览器本地

## 微信扫码登录

微信登录使用微信开放平台“网站应用”扫码授权，并通过 Netlify Functions 在服务端交换用户信息。部署后在 Netlify 中配置：

```text
WECHAT_APP_ID=微信开放平台网站应用 AppID
WECHAT_APP_SECRET=微信开放平台网站应用 AppSecret
WECHAT_SESSION_SECRET=至少 32 位随机字符串
WECHAT_REDIRECT_URI=https://你的域名/api/auth/wechat/callback
```

同时把正式域名配置为微信开放平台网站应用的授权回调域。`AppSecret` 只保存在 Netlify 环境变量中，不要写进前端代码或提交到 Git。
