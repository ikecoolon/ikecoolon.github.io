# 项目进度

## 进度呈现

### 要求
- 项目进度必须以前端页面呈现，目录固定为 `docs/.vuepress/public/prototype/project-progress/`
- 唯一数据源必须是该目录下的 `data.js`；页面统计必须由脚本从数据派生，不得在 HTML 中硬编码工作量数字
- 不得把进度改成内部项目管理工具、表格文档或独立后台
- 产品设计任务 `pd-01` 必须保持已完成，不再占研发主路

### 示例
进度入口是原型第三按钮，打开后是面向甲方的工程总控墙：总控数据带、周次排期、任务明细、待甲方预备清单。工作量数字全部来自 `data.js` 实时计算。

## 原型更新后的维护范围

### 要求
- 管理端或小程序原型（`docs/.vuepress/public/prototype/admin`、`mini-program`）或业务设计更新后，必须同步进度墙的任务内容和工时
- 必须只改 `data.js`
- 允许改研发任务的 `name`、`group`、`workdays`；若原型新增或删除功能，允许增删任务，并为新任务补齐渲染必需字段（`id` / `lane` / `owner` / `dependencyIds` / `startWeek` / `endWeek`）
- 不得因原型更新改既有任务的 `progress`、`status`
- 不得改 `index.html`、`styles.css`、`script.js`
- 不得改待甲方预备事项、范围待确认、缓冲率、泳道结构、周次标尺，除非明确要求

### 示例
原型新增「报告工作台：菌门分析」页面对应更新 `adm-05` 的任务名称与工时；不得把该任务 `progress` 写成已完成。原型删掉商城改造相关页面时，删除对应任务，不得改 `mp-06` 已写明的「不改商城」边界。

管理端页面与任务对应关系：
- `detection-records.html` 对应 `adm-02`、`adm-03`、`be-03`、`be-04`
- `report-center.html` / `report-review.html` 对应 `adm-04` 至 `adm-08`、`be-05`、`be-06`、`be-08`
- `customer-management.html` / `pet-information.html` 对应 `adm-09`、`adm-10`、`be-03`
- `dictionary-management.html` / `normal-range-config.html` / `microbiota-knowledge.html` / `analysis-rules.html` 对应 `adm-11` 至 `adm-14`、`be-07`、`be-08`

小程序页面与任务对应关系：
- 登录与账号绑定 对应 `mp-01`、`be-10`
- `home.html` / 宠物列表 / `profile.html` 对应 `mp-02`、`mp-03`
- `report.html` 对应 `mp-04`、`mp-05`
- 推荐商品与商城跳转 对应 `mp-06`、`be-09`（只读，不改商城）

## 估期口径

### 要求
- 人力必须按 1 名前端工程师 + 1 名后端工程师估算
- 后端必须负责实施：领域模型、接口、导入、分析、部署与运维实施
- 两人都有 AI 辅助，估期必须按可交付的准确口径，不得按无 AI 或新手再加长
- 必须基于 pet-eden 已有框架（管理端壳、登录权限、文件、商城）只估健康报告增量；商城不得改造
- 估期必须含联调、不含自测
- 必须按 8 小时 = 1 人日；20% 缓冲必须由页面单独计算，不得摊入单条任务
- 前后端必须并行；前端可以先 Mock

### 示例
当前墙面合计 49 人日 / 392 人时：产品设计 2（已完成）/ PC 管理端 18 / 小程序 8 / 后端 16 / 部署 5。含 20% 缓冲后 58.8 人日 / 470.4 人时。新增一个「参考范围导入校验」若只是现有 `adm-12` / `be-07` 的补充交互，应调整这两条工时，而不是再加一条 3 人日的独立任务。

## 代码提交后的进度

### 要求
- 必须根据实际代码开发提交更新任务的 `progress` / `status`
- `progress` 必须是 0–100 的整数；`progress = 100` 必须视为已完成
- 不得把原型更新误当成开发完成
- 待甲方预备事项仅在条件成立或甲方交付时更新 `status` / `expectedWeek` / `active`

### 示例
后端提交健康报告领域模型迁移后，只把 `be-02` 的 `progress` / `status` 改为进行中或已完成，不得改 `workdays`。管理端原型改了工作台文案时，只改 `adm-05` 的 `name`，不得改其 `progress`。

## 相关文档

- [产品原型约束规则](./prototype.md)
- [产品迭代](./iteration.md)
- [跨部门协作](./collaboration.md)
