/*
 * 项目进度管理 · 唯一数据源
 * 维护分两条路径，详见 docs/rules/project-progress.md。
 *
 * 原型或业务设计更新：只改研发任务的 name / group / workdays；
 * 功能增删时允许增删任务，并为新任务补齐渲染字段（id/lane/owner/dependencyIds/startWeek/endWeek）。
 * 不得因原型更新改既有任务的 progress / status。
 * 不得改 index.html / styles.css / script.js。
 * 不得改待甲方预备、范围待确认、缓冲率、泳道和周次标尺，除非明确要求。
 *
 * 代码提交：只更新任务的 progress / status。progress 为 0-100 整数；progress = 100 自动视为已完成。
 * 前置事项仅在条件成立或甲方交付时改 status / expectedWeek / active。
 * 可选 meta.projectStartDate 设定默认开始日期。页面所有统计自动重算。
 *
 * 约定：8 小时 = 1 人日，每周 5 个工作日，缓冲率 20% 单独计算。
 * 范围待确认与甲方前置事项不参与工作量与进度统计。
 *
 * 待甲方预备：14 条 prerequisites（账号与资质 5 / 技术资源 3 / 合规发布 2 / 微信支付 4）。
 * active=true 表示当前适用，共 10 条；active=false 为条件项（4 条），条件成立时改 active=true 再维护 status。
 * 顶部「待甲方预备」只统计 active=true 且 status≠complete；条件项显示「条件待确认」，不计入欠缺。
 *
 * 口径：1 前端 + 1 后端并行；产品设计已完成；后端负责实施；每人带 AI 辅助，估期按可交付压准。
 * 估期含联调、不含自测。基于 pet-eden 成熟框架（管理端壳、登录权限、文件、商城已有），只估健康报告增量；商城不改造。
 *
 * 分组小计（人日）：产品设计 2 / PC 管理端 18 / 小程序 8 / 后端 16 / 部署 5，合计 49 人日（392 人时）。
 * 含 20% 缓冲：9.8 人日（78.4 人时），总计 58.8 人日（470.4 人时）。
 */
