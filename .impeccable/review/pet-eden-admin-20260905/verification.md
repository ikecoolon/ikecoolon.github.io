# Pet Eden 管理端原型验收 · 2026-09-05

依据：`docs/product-design/pet-health-admin-implementation-plan.md` 第 1–7 节  
服务：`http://127.0.0.1:8765/prototype/admin/index.html`  
资产版本：`202609051`

## 修改文件

### 新增

- `docs/.vuepress/public/prototype/admin/css/tokens.css`
- `docs/.vuepress/public/prototype/admin/css/shell.css`
- `docs/.vuepress/public/prototype/admin/css/components.css`
- `docs/.vuepress/public/prototype/admin/js/admin-permissions.js`
- `docs/.vuepress/public/prototype/admin/js/admin-session.js`
- `docs/.vuepress/public/prototype/admin/js/admin-basic-table.js`
- `docs/.vuepress/public/prototype/admin/js/admin-modal.js`
- `docs/.vuepress/public/prototype/admin/js/admin-domain-smoke.js`
- `docs/.vuepress/public/prototype/admin/js/admin-browser-smoke.js`
- `docs/.vuepress/public/prototype/admin/js/user-pets-script.js`
- `docs/.vuepress/public/prototype/admin/user-pets.html`

### 修改

- `docs/.vuepress/public/prototype/admin/index.html` — Rondo 壳、页签栏、合一菜单、共享脚本栈
- `docs/.vuepress/public/prototype/admin/js/script.js` — 页签会话路由、旧 URL 映射
- `docs/.vuepress/public/prototype/admin/js/admin-common.js` — 去猜测增强、会话导航
- `docs/.vuepress/public/prototype/admin/css/antd-prototype.css` — 拆分 import，保留工作台/预览域
- 9 个既有页面 HTML + 对应 `*-script.js`（报告中心、送检、工作台、规则、范围、科普、专业基础资料）
- `docs/.vuepress/public/prototype/shared/mock-store.js` — 身份/权限/商品/登记闭环
- `docs/.vuepress/public/prototype/shared/mock-store-smoke.js` — 权限与登记回归
- `docs/.vuepress/public/prototype/project-progress/data.js` — 仅 name 具体化（adm/be/mp 指定任务）

## 静态检查

| 命令 | 结果 |
| --- | --- |
| `node --check`（admin/js 全部 + mock-store.js） | 通过 |
| `node docs/.vuepress/public/prototype/shared/mock-store-smoke.js` | **272 passed, 0 failed** |
| `node docs/.vuepress/public/prototype/admin/js/admin-domain-smoke.js` | **15 passed, 0 failed** |
| `pnpm docs:build` | 成功 |
| `git diff --check` | 无 trailing/conflict 标记 |
| `detect.mjs --json`（admin 目标） | DEGRADED（缺 htmlparser2 依赖，regex 回退）；**[] 机械问题**；Rondo 圆角/系统字体已按 pinned 规范豁免 |

## 浏览器验证（Chrome channel Playwright CLI）

截图目录：`.impeccable/review/pet-eden-admin-20260905/screenshots/`

| 场景 | 视口 | 文件 |
| --- | --- | --- |
| 报告中心 | 1440 / 1280 / 1024 / 390 | `report-center-*.png` |
| 送检管理 | 1440 | `detection-records-1440.png` |
| 用户与宠物 | 1440 | `user-pets-1440.png` |
| 分析规则 | 1280 | `analysis-rules-1280.png` |
| 报告工作台+预览 | 1280 / 1024 / 390 | `report-review-*.png` |

观察（基于截图，非历史 `.impeccable/review` 旧图）：

- 侧栏 224px、顶栏 50px、页签 38px、主色 `#0960bd`、搜索标签约 80px
- 报告中心为真表格 + 分页 + 状态视图计数 + 表工具（搜索切换/刷新/列配置/全屏）
- 390px 侧栏可折叠，表格横向滚动在容器内，核心操作可达
- 工作台保留六模块导航；1280/1024 编辑区可用；预览区可收起
- 控制台：CLI 截图流程未捕获 JS error（Playwright screenshot 无 console hook）

## 契约回归（Mock / 源码）

| 项 | 证据 |
| --- | --- |
| 同手机号复用、不覆盖、不禁用静默启用 | mock-store-smoke `testPermissionsUsersAndProducts` |
| 登记原子 newPet+test、取消无孤儿 | mock-store-smoke |
| 已发布独立商品保存不建更正 | mock-store-smoke + report-review 商品会话分离 |
| 非提交人撤回失败 | mock-store-smoke |
| 只读不可提交 | mock-store-smoke + admin-domain-smoke |
| 页签 dirty / 列表状态 / 同实体复用 | admin-domain-smoke |
| 规则 edit↔test 共享会话 | `__petAdminRuleWorkSessions` + 内部 hash 路由 |
| 旧 hash 兼容 | script.js `DEPRECATED_PAGE_REDIRECTS` + customer/pet 映射 |

## 剩余阻塞 / 未验收范围

1. **真实 API / 微信登录 / 会员后台联通** — 原型刻意不伪造；「前往会员管理」为说明性入口。
2. **专业规则医学正确性** — 未在本轮验收。
3. **detect.mjs 完整 AST** — 环境缺 parser 模块，仅 regex 回退；需在 CI 装依赖后复跑才具完整对比度/选择器检查。
4. **生产权限** — 仅 `?actor=` / localStorage fixture；正式 UI 无角色切换菜单（符合契约）。
5. **Tailwind CDN** — 仍加载于 index.html 供遗留类名兼容；新页面以 `rondo-*` / `ant-*` 显式类为主。

## 进度墙

仅更新 `data.js` 中 adm-01/02/04/06/09/10/11/14、be-03/10、mp-01 的 `name`；progress/status/workdays 未改。
