# MO'S SPACE

一个可直接使用的个人导航工作台，包含多引擎搜索、分类筛选、收藏、图库和文档编辑。未登录时数据保存在当前浏览器；登录后工作区和分享文档使用腾讯云 CloudBase。

## 本地运行

```bash
npm install
npm run dev
```

默认访问 `http://localhost:5173`。

上线前验证：

```bash
npm test
npm run build
```

## 自定义内容

- 默认网址：修改 `main.js` 中的 `baseSites`
- 品牌与文案：修改 `index.html`
- 颜色与视觉：修改 `styles.css` 顶部的 CSS 变量
- 部署版的浏览器书签导入使用 HTML 导出文件；直接扫描 Mac 浏览器只在本地开发环境提供

## CloudBase 配置

1. 在腾讯云 CloudBase 创建上海地域环境，在「API Key 配置」生成 Publishable Key。
2. 在「身份认证」开启邮箱密码登录和匿名登录。匿名登录只用于“可编辑分享链接”的无感访客会话。
3. 创建 `mos_workspaces` 和 `mos_note_shares` 两个文档型数据库集合，分别将 [cloudbase/rules/mos_workspaces.json](cloudbase/rules/mos_workspaces.json) 和 [cloudbase/rules/mos_note_shares.json](cloudbase/rules/mos_note_shares.json) 粘贴到集合的安全规则中。
4. 在「安全来源」添加 `localhost:5173` 和正式域名。
5. 复制 `.env.example` 为 `.env.local`，填写环境 ID、地域、Publishable Key 和正式站点 URL。Publishable Key 是 CloudBase 专门用于 Web 前端的可发布密钥，不要在前端放入 SecretId/SecretKey。
6. 将 `cloudbaserc.json` 中的 `envId` 替换为真实环境 ID。

## CloudBase 部署

```bash
npm run build
npx @cloudbase/cli@latest login
npx @cloudbase/cli@latest hosting deploy dist -e <你的环境ID>
```

正式对外使用时请绑定自己的域名，并把该域名同时写入 `VITE_PUBLIC_SITE_URL` 和 CloudBase 安全来源。部署后应在无痕窗口验证：分享链接直接打开、不出现登录页，且仅查看/可编辑权限分别生效。
