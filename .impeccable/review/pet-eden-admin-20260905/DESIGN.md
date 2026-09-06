# Pet Eden 管理端原型 · Design Record

**Surface:** `docs/.vuepress/public/prototype/admin/index.html`  
**Contract:** `docs/product-design/pet-health-admin-implementation-plan.md`  
**Direction:** `.impeccable/surfaces/docs-vuepress-public-prototype-admin-index-html.md`  
**Verdict:** 通过本轮静态 + Mock + 浏览器截图验收；未代表真实研发或 API 完成。

## Thesis

运营在熟悉的 Rondo 浅色后台里完成送检与报告编审，不再依赖 Tailwind 颜色猜测或整页销毁式路由。

## Layout shell

| 区域 | 规格 | 实现 |
| --- | --- | --- |
| 侧栏 | 224px，可折叠 | `css/shell.css` `.ant-layout-sider` |
| 顶栏 | 50px | `.ant-layout-header` |
| 页签 | 38px | `#admin-tabbar` + `PetAdminSession` |
| 内容边距 | 16px | `.ant-layout-content` |
| 主色 | `#0960bd` | `css/tokens.css` `--rondo-primary` |

## Component system

CSS 分层：

1. `tokens.css` — 颜色、间距、字号
2. `shell.css` — 应用壳
3. `components.css` — ListPage、BasicTable、Form、Modal、Tabs（`.rondo-*` 与 `.ant-*` 别名）
4. `antd-prototype.css` — 工作台六模块、小程序预览命名空间、遗留桥接

JS 共享：

- `PetAdminBasicTable.createListPage` — 搜索卡 + 工具栏 + small 表格 + 分页 + 表工具
- `PetAdminModal.openModal` — 焦点、Esc/遮罩、dirty、loading
- `PetAdminPermissions` — stable actorId + 动作校验（fixture：`?actor=default|editor|reviewer|dual|readonly`）
- `PetAdminSession` — 内存页签、dirty 防丢、列表状态保留

`enhanceDom` / `startEnhanceObserver` 已改为无操作；模板与脚本生成节点必须使用显式类。

## Information architecture

| 侧栏 | 页面 | 内部路由 |
| --- | --- | --- |
| 送检管理 | detection-records | `?view=`、`?testRecordId=`、`?action=register` |
| 报告中心 | report-center | `?view=` |
| 指标/参考范围 | normal-range-config | `?edit=` |
| 菌群科普 | microbiota-knowledge | `?taxon=` |
| 分析规则 | analysis-rules | `?mode=edit|test&lineage=` |
| 用户与宠物 | user-pets | `?view=users|pets`、`?detail=user|pet&id=` |
| 专业基础资料 | dictionary-management | `?tab=&edit=` |
| （无侧栏） | report-review | `?reportId=` |

旧 `#customer-management` / `#pet-information` 重定向至 `user-pets`。

## Domain boundaries (Mock)

- 平台用户 = 会员身份；`createPlatformUser` 手机号幂等
- `registerTest` 支持已有 pet 或原子 newPet+test
- 商品 `savePhylumUnitProducts` 独立于专业更正；已发布可配商品
- 编审动作为服务层 + UI 双层校验；`submittedByActorId` 约束撤回

## Workbench & preview

- 六模块左导航 + 单页滚动保留
- 预览 `.rw-mini-app` CSS 隔离；管理端蓝色不渗入
- `@container report-workbench` 控制预览/导航折叠（非视口 1100px 硬断）

## Provenance

截图均来自 `202609051` 构建，Playwright `--channel chrome`，见 `screenshots/`。  
不沿用 `/tmp/pet-eden-admin-before-20260905.png` 或旧 `.impeccable/review` 图作为本轮证据。

## Out of scope (by design)

- 真实 pet-eden 仓库、小程序源码、Wiki
- 真实微信登录成功态、会员 API 联调
- 角色切换生产菜单
