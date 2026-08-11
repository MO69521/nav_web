# MO'S SPACE

一个可直接使用的个人导航工作台，包含多引擎搜索、分类筛选、收藏、图库和文档编辑。未登录时数据保存在当前浏览器；登录后工作区、图片和分享文档使用 Netlify 云端能力。

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

## Netlify 部署

1. 在 Netlify 中导入当前 GitHub 仓库。`netlify.toml` 已配置构建命令、SPA 回退、Functions 和安全响应头。
2. 在 Netlify 站点中开启 Identity，并按实际需求设置为“邀请制”或“开放注册”。
3. 部署预览后完成一次真实邮箱注册/登录，确认本机数据首次上云、图片上传和无痕窗口分享链接。

Netlify Blobs 由站点运行时自动提供，不需要把存储密钥写入前端。
