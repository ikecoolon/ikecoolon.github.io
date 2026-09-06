# 商品独立保存验收

- 基址：`http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html`
- 脚本：`.impeccable/review/pet-eden-admin-20260905/products/browser-test.mjs`
- 结果：22/22 通过（Chrome headless，系统 Chrome channel）

## 覆盖项

1. 已发布 `report-001`：选商品 → store 未变 → 切模块回来会话保留 → 点「保存商品配置」→ 当前报告商品更新，working/published 版本号与 correction 标志不变，其他报告不变。
2. 更正草稿 `report-004`：未保存专业文本 + 选商品 → 仅保存商品 → 线上专业 summary 不变，表单草稿保留。
3. 更正草稿：专业暂存 → summary 写入 store，未保存商品会话不入库且 UI 仍 dirty。

## 代码修正

`saveProductConfiguration` 不再调用 `afterWrite()`（会全量 `render()` 冲掉未保存专业表单）；改为局部刷新推荐面板与预览，并在存在专业 dirty 时保持 `formInteracting`。

## 检查

- `node --check docs/.vuepress/public/prototype/admin/js/report-review-script.js`：通过
- `git diff --check`（本页 JS + 测试脚本）：通过

## Console / 404

- 无 `pageerror`
- 控制台 404：`http://127.0.0.1:8765/favicon.ico`（站点 favicon，与本页业务无关）
