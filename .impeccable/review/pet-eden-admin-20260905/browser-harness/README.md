# Browser harness

Pet Eden 管理端浏览器验收工具的辅助模块，由 `docs/.vuepress/public/prototype/admin/js/admin-browser-smoke.js` 引用。

## 前置

1. 静态服务可访问管理端入口（当前仓库根目录起服时建议使用完整路径）。
2. 设置 `PLAYWRIGHT_MODULE` 指向本机已安装的 playwright（项目未声明依赖）。
3. 使用系统 Chrome（`channel: 'chrome'`）；每个运行使用独立 `browserContext`，不污染已有浏览器 LocalStorage。

## 命令

```bash
# 语法
node --check docs/.vuepress/public/prototype/admin/js/admin-browser-smoke.js

# harness 自检（路径 / playwright / MockStore / 最小加载）
PLAYWRIGHT_MODULE="$HOME/.npm/_npx/420ff84f11983ee5/node_modules/playwright" \
  node docs/.vuepress/public/prototype/admin/js/admin-browser-smoke.js --smoke-only \
  --base "http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html"

# 完整业务验收（待各页面任务完成后由整合任务执行）
PLAYWRIGHT_MODULE="$HOME/.npm/_npx/420ff84f11983ee5/node_modules/playwright" \
  node docs/.vuepress/public/prototype/admin/js/admin-browser-smoke.js \
  --base "http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html"
```

输出默认写入 `.impeccable/review/pet-eden-admin-20260905/browser-final/`（可用 `--out` 覆盖）。
