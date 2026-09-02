# 04 — 报告中心按新状态改造 + 删除旧页面 + 遗留清理

**What to build:** 报告中心按五值主状态过滤与排序，补更正中副标签、待归属行信息、外部报告号搜索、更多菜单动作；删除 published-reports / pet-report-management / excel-import / dashboard / recommendation-mapping 五个页面及其路由、菜单、样式；清理 admin-common 与 dictionary-data-service 中对旧模型的引用。

**Blocked by:** 01 — 共享数据层

**Status:** done

## 范围

### 报告中心 `admin/report-center.html` + `admin/js/report-center-script.js`
- 视图 tab：待处理（unassigned + incomplete + pending_review + 更正中）/ 全部 / 待归属 / 待完善 / 待审核 / 已发布 / 已作废，按 `report.status` 过滤（删除 `workflowStatus` 读取，原 L57）。
- 状态列：`C.statusBadge(report.status, C.REPORT_STATUS_LABELS)`；`correctionDraftActive` 时追加副标签「更正中·待完善 / 更正中·待审核」（`store.getCorrectionDraftStage(report)`）；`rejectReason` 有值且 `incomplete` 时显示「已退回」小标签。
- 待归属行「用户 / 宠物」列显示：`未归属 · <batch.fileName> · <testRecord.sampleNumber>`。
- 综合搜索加 `externalReportNumber`（原 L121–129）。
- 排序：待处理视图按 `statusChangedAt` 升序；档案视图按 `updatedAt` 倒序（删除 `statusEnteredAt` 回退，原 L73）。
- 操作：主动作 = 打开工作台；「更多」菜单：查看送检记录（跳 `detection-records`，替换原「重新导入」）、版本（跳工作台版本模块）、作废（非 voided，`store.voidReport`）、创建更正草稿（published 且无草稿，`store.createCorrectionDraft`）。删除「已发布列表」等跳旧页项。
- 列表不显示待办标记（仅工作台角标），可保留 `todoFlags` 数量小圆点。

### 路由与菜单
- `admin/js/script.js`：`PAGE_CONFIG` 删除 dashboard / excel-import / published-reports / pet-report-management；`DEPRECATED_PAGES` 增加 `dashboard → report-center`、`excel-import → detection-records`、`published-reports → report-center`、`pet-report-management → report-center`、`recommendation-mapping → report-center`；`resolvePageId` 中对 `dashboard` 的特判可删。
- `admin/index.html`：菜单确认无上述页面入口（当前已无）；`admin-common.parseRoute` 默认页 `'dashboard'` 改 `'report-center'`。
- 删除文件：`admin/published-reports.html`、`admin/pet-report-management.html`、`admin/excel-import.html`、`admin/dashboard.html`、`admin/recommendation-mapping.html`、`admin/js/published-reports-script.js`、`admin/js/pet-report-management-script.js`、`admin/js/excel-import-script.js`、`admin/js/dashboard-script.js`、`admin/js/recommendation-mapping-script.js`；`admin/css/*.css` 中仅这些页使用的选择器。
- 送检管理 `detection-records-script.js` 若有跳 `excel-import` 的链接，改为页内导入或跳报告中心。

### 遗留清理
- `admin/js/admin-common.js`：删除 01 保留的 `@deprecated` 别名（`rejectReportToIncomplete`、`createCorrectionDraftExtended`、`isValidResultIndicator`）——在 03 完成后执行。
- `admin/js/dictionary-data-service.js`：删除 `ensureDemoCompletionScenario`、`confirmPendingIndicator` 中 `pendingConfirm / rawImportName` 之外的旧字段、`setIndicatorManualRange`、`freezeEffectiveRange`、`freezeReportEffectiveRanges`、`manualSupplementIndicator`（改为调用 `store.supplementResult / modifyResultValue`）；`evaluateIndicatorResult` 改用 `store.evaluateResult`；`resolveEffectiveRangeForIndicator` 直接代理 store（source 值现为 `'imported' | 'platform'`）。
- 全局搜索并删除对 `state.findings / recommendations / healthTags / healthTagProducts / claimCodes / reportAnalysisAdjustments` 的引用（`rg` 确认为 0）。

## 涉及文件

`admin/report-center.html`、`admin/js/report-center-script.js`、`admin/js/script.js`、`admin/index.html`、`admin/js/admin-common.js`、`admin/js/dictionary-data-service.js`、`admin/js/detection-records-script.js`、`admin/css/*`、删除的 5 组页面文件

## 验收标准

- [x] 报告中心默认「待处理」视图列出 report-006（待归属）、report-003（待完善）、report-002（待审核）、report-004（已发布·更正中·待完善），按 `statusChangedAt` 升序；「已发布」视图列出 report-001、report-004；「已作废」列出 report-005
  - 种子过滤已用 `/tmp/issue-04-report-center-check.js` 验证；待处理实际顺序为 006 → 004 → 003 → 002（`statusChangedAt` 升序）。浏览器走查标 **待 06**。
- [x] 待归属行显示「未归属 · oscar_final_microbiome_report.xlsx · SAMPLE-NEW-UNASSIGNED-009」（种子拼接已验证；浏览器走查标 **待 06**）
- [x] 搜索 `EXT-2025-001` 命中 report-001（过滤逻辑已验证；浏览器走查标 **待 06**）
- [ ] `#dashboard`、`#excel-import`、`#published-reports`、`#pet-report-management`、`#recommendation-mapping` 全部重定向，控制台无 404 — **待 06**（`DEPRECATED_PAGES` + `parseRoute` 默认页已改，hash 会改写到目标页）
- [x] `rg "findings|healthTag|claimCodes|reportAnalysisAdjustments|workflowStatus"` 在本 issue 负责文件中为 0（除 `admin-common.js` 中 `@deprecated` 注释/报错文案）。02/03/05 文件未清零。
- [x] `node --check` 全部现存 `admin/js/*.js` 通过

## 偏差

- `@deprecated` 别名按指示留给 06，未删。
- 未改 `index.html`（菜单本无旧入口；script 顺序保持 analysis-engine → mock-store → admin-common）。
- 已删除 `ensureDemoCompletionScenario`；issue 02 合入前分析规则页若仍调用会报错。
- 「版本」跳 `report-review?module=versions`；工作台读该参数由 03 对接。
- 待归属/待完善/待审核 tab 与待处理一样按 `statusChangedAt` 升序；全部/已发布/已作废按 `updatedAt` 倒序。
