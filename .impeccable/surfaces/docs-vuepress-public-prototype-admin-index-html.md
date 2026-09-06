---
version: 1
slug: "docs-vuepress-public-prototype-admin-index-html"
primary_target: "docs/.vuepress/public/prototype/admin/index.html"
related_targets: ["docs/.vuepress/public/prototype/admin/report-center.html","docs/.vuepress/public/prototype/admin/report-review.html"]
---

# 管理端统一后台规范

Mode: Operate. Audience: 日常编制与审核人员。Scope: admin 壳、业务页面与共享 Mock；真实 Rondo 只读，小程序主题不改。执行契约见 docs/product-design/pet-health-admin-implementation-plan.md。

## Direction contract

THESIS: 高频运营在熟悉后台里完成送检与报告，不再逐页猜测控件。

OWN-WORLD: 用户指定 Rondo 浅色后台、蓝色主动作、紧凑表单和标准 BasicTable；保留 Pet Eden 品牌。

STORY: 找到业务记录，保留上下文，编辑、确认并明确保存。

FIRST VIEWPORT: 224px 侧栏、50px 顶栏、38px 页签；16px 内容边距；搜索卡与表格分离，主动作和表工具分列。工作台编辑优先、预览可收起，保留双向定位，状态变化只用轻量反馈。

FORM: 用户固定真实项目范式，code-led；无新候选及 seed，不重新选择已确认方向。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
