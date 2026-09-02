# 01 — 共享数据层：菌门分析单元模型 + 规则引擎抽离 + 新状态机

**What to build:** 按 spec §1 重写 `shared/mock-store.js` 的数据模型、seed、状态机与 API；新建 `shared/analysis-engine.js`；改造 `admin/js/admin-common.js` 的状态标签与发布检查；重写 `shared/mock-store-smoke.js`。

**Blocked by:** —（02–05 全部依赖本项）

**Status:** done

## 范围

- 决议 D1–D11 全部落到共享层；页面脚本（`*-script.js`、`pages.js`、`helpers.js`）**不改**。
- 允许的薄兼容层（均标 `@deprecated`，02–05 完成后删除）：`result.value` 镜像 `effectiveValue`；`store.getWorkflowStatus()` 返回 `report.status`；`store.WORKFLOW_STATUSES` 指向 `REPORT_STATUSES`；admin-common `rejectReportToIncomplete` / `createCorrectionDraftExtended` / `isValidResultIndicator` 别名。

## 涉及文件

- `shared/analysis-engine.js`（新建）
- `shared/mock-store.js`
- `shared/mock-store-smoke.js`
- `admin/js/admin-common.js`
- `admin/index.html`、`mini-program/app.html`（仅加一行 `<script src="../shared/analysis-engine.js">`）

## 验收标准

- [x] `node --check` 通过：`shared/*.js`、`admin/js/admin-common.js`
- [x] `node shared/mock-store-smoke.js` 全部通过，覆盖：五值状态迁移（提交 / 撤回 / 退回 / 发布 / 作废 / 更正草稿）、`statusChangedAt` 赋值、单元懒生成、引擎命中 + 属级归门、同单元冲突处理、依据变化失效、`pending_reanalysis`、发布检查阻断项（未确认单元 / 待重新分析）、快照冻结、seed 覆盖 D11 六种报告
- [x] seed 至少一份报告无任何有效范围（report-004），一份待归属报告（report-006 ← tr-009）
- [x] `edu.hint` 迁移；`emptyTaxonEdu / normalizeTaxonEdu / defaultMicrobiotaTaxa` 无 low/normal/highHint
- [x] 删除 healthTags / healthTagProducts / claimCodes / findings / recommendations 及相关 API
- [x] `buildPublicationChecks` 阻断项含「存在未确认的菌门分析单元」「依据变化后未重新分析」；警告项含「菌门 X 分析为空」；不再引用三类文案 / findings / healthTag
- [x] 文末追加「## API 说明」

## API 说明

数据模型与字段以 spec §1 为唯一真相，此处只列共享层实际导出与调用约定，供 02–05 对接。

### 新数据结构（字段级摘要）

见 spec §1.2–1.8。落地时的集合名：

| 集合 / 对象 | 说明 |
|---|---|
| `state.reports[]` | 单一 `status` 五值；`statusChangedAt` / `correctionDraftActive` / `rejectReason` / `ownershipStatus`（仅 `unassigned\|bound`，由 petId 派生）/ `todoFlags`（四值）/ `latestAnalysisRunId` / `versions[].contentSnapshot` |
| `state.indicators[]` | **历史集合名保留**，实际是结果行。字段：`sourceValue` / `effectiveValue` / `value`（deprecated 镜像）/ `labNotice` / `level` / `phylumKey` / `modifiedReason` / `valueSource`。`rangeStatus` / `rangeSource` / `range` / `isEffective` 由 `decorateResult` 计算，不落库；发布时冻进快照 |
| `state.phylumAnalysisUnits[]` | 菌门分析单元；`ensurePhylumUnits` 按有效结果菌门懒创建 |
| `state.analysisRuleCatalog[]` | D2–D4 条件类型；同谱系最多一个 `active` |
| `state.analysisRuns[]` | 无 `combinedResult` / `finalContent` |
| 已删除集合 | `findings` / `recommendations` / `healthTags` / `healthTagProducts` / `claimCodes` / `reportAnalysisAdjustments` |
| `edu` | `{ sceneCopy, introText, mainTasks, appearanceText, functionText, hint, knowledgeText }`；旧 `low/normal/highHint` 读入时合并为 `hint` |
| 存储键 | `pet-report-mock-store-v2`（旧 v1 直接丢弃） |

结果行读取请用 `store.getEffectiveResults(reportId)`（已 decorate）。菌门卡片用 `store.getPhylumUnits(reportId)`。

### 引擎入口

`shared/analysis-engine.js` UMD：Node `require('./analysis-engine.js')`，浏览器 `window.PetReportAnalysisEngine`。

```
evaluate({ rules, results, species, taxa })
  → { units:[{ phylumKey, hits, riskLevel, drafts, hitSignature }], orphanHits, evaluatedRules, engineVersion }
```

另导出：`evaluateCondition` / `evaluateRule` / `resolveConflicts` / `composeDrafts` / `hitSignature` / `unitRiskLevel` / `validateRule` / `describeCondition` / `RISK_ORDER`。纯函数，不读 store。mock-store 的 `runReportAnalysis` 与 `previewRuleEvaluation` 共用。

### 页面 script 顺序

```
analysis-engine.js → mock-store.js → admin-common.js
```

- 后台：`admin/index.html` 已按此顺序（engine 先于 mock-store，再 admin-common）
- 小程序：`mini-program/app.html` 为 engine → mock-store → helpers → pages → script（无 admin-common）

缺失引擎时 mock-store 会 throw：「PetReportAnalysisEngine 未加载」。

### mock-store 导出

**新增**

- 结果：`getEffectiveResults` / `decorateResult`（别名 `evaluateResult`）/ `modifyResultValue({ reportId, resultId, value, dataStatus?, labNotice?, reason })` / `supplementResult({ reportId, key, value, unit, labNotice, dataStatus, reason })` / `hasAnyEffectiveRange`
- 单元：`getPhylumUnits` / `ensurePhylumUnits` / `runReportAnalysis(reportId, { actor })` / `savePhylumUnitDraft` / `confirmPhylumUnit` / `excludeHit` / `savePhylumUnitProducts`
- 规则：`saveAnalysisRule` / `createRuleRevision` / `duplicateAnalysisRule` / `activateAnalysisRule` / `deactivateAnalysisRule` / `deleteAnalysisRule` / `validateAnalysisRule`（代理 `Engine.validateRule`）/ `listTaxaForRuleTarget(level)` / `previewRuleEvaluation(reportId, { includeDrafts, ruleIds })`（只读）/ `describeCondition`
- 状态机：`setReportStatus`（变了才写 `statusChangedAt`）/ `submitReport` / `withdrawReport`（**不改 testRecord**）/ `rejectReport(id, reason, { actor })` / `publishReport`（一次进入 published，冻结 `contentSnapshot.results` + `phylumUnits`）/ `createCorrectionDraft` / `voidReport` / `assignReportOwnership` / `getCorrectionDraftStage`
- 检查 / 商品：`buildPublicationChecks(reportId, state?)` / `resolveProductAvailability(productId)`
- 常量：`REPORT_STATUS_LABELS` / `OWNERSHIP_STATUS_LABELS` / `TODO_FLAG_LABELS`（仅四值）/ `LAB_NOTICE_LABELS` / `RANGE_STATUS_LABELS` / `RANGE_SOURCE_LABELS` / `RISK_LEVEL_LABELS` / `CONDITION_TYPE_LABELS` / `UNIT_CONFIRM_STATUSES` / `UNIT_CONFIRM_LABELS` / `VERSION_STATUSES` / `VERSION_STATUS_LABELS` / `PRODUCT_STATUS_LABELS` / `VALUE_SOURCES` / `RANGE_SOURCES`
- 便利：`getReport` / `listReports`

**保留（旧页面仍在用）**

`state.indicators` / `getState` / `peekState` / `subscribe` / `reset` / `commit` / 用户宠物字典 API（`createPlatformUser` / `updatePlatformUser` / `updateOpsPet` / `createOpsPet` / `saveTaxonEdu` / `emptyTaxonEdu` / `normalizeTaxonEdu` / catalog 排序函数 / 参考范围方案 / `searchProductsForPicker` / 送检导入 `registerTest` / `simulateExcelImport*` / `checkDuplicateImport` / `generateReport`）/ `saveReportAssessment` / `getUserVisibleReports` / `getUserPublishedReportProjection` / `getPetPublishedReports` / `getPublishedVersionSnapshot` / `getWorkingVersionSnapshot` / `getLatestAnalysisRun`

**删除（调用即 throw `[deprecated] … 已移除`）**

`approveReport` / `publishCorrection` / `deriveWorkflowStatus` / `bindClaimCode` / `generateClaimCredential` / `voidClaimCredential` / `preBindPetToStore` / `updateFinding` / `updateRecommendation` / `updateReportContent` / `correctIndicator` / `resolveRecommendationTarget` / `resolveHealthTagCandidates` / `saveAnalysisFinalContent` / `reviewCorrectionDraft`

不再导出：`CONCLUSION_LEVELS` / `RECOMMEND_TYPES` / `DEMO_LABEL`。

### admin-common 导出

**改**

- `REPORT_STATUS_LABELS`：待归属 / 待完善 / 待审核 / 已发布 / 已作废
- `OWNERSHIP_STATUS_LABELS`：仅 待归属 / 已绑定
- `buildPublicationChecks(state, reportId)`：委托 `store.buildPublicationChecks`。阻断含宠物归档、来源可追溯、报告物种、等级+综合分、至少一项有效结果、**未确认菌门分析单元**、**依据变化后未重新分析**（`pending_reanalysis` 或 `confirmStatus===invalidated`）。警告含未关联用户、缺失未处理、无有效范围、菌门 X 分析为空、商品失效
- `isValidResultIndicator`：基于 decorate 后的 `isEffective`
- `getLatestAnalysisRun`：走 `store.getLatestAnalysisRun`（不再读 `reportAnalysisAdjustments`）
- `isReportInReviewQueue`：`unassigned|incomplete|pending_review` 或 `correctionDraftActive`
- `statusBadge`：五值主状态（去掉 draft/rejected/approved/corrected/pending_claim）

**薄别名（@deprecated）**

- `rejectReportToIncomplete` → `store.rejectReport`
- `createCorrectionDraftExtended` → `store.createCorrectionDraft`

**删除**

- `saveReviewDraft` / `getReviewDraft` 及 sessionStorage（不再导出）

**删除但留 throw 友好错误（@deprecated）**

- `lookupClaimCode` / `getPendingClaimCodes` / `canRecommend` / `saveAnalysisFinalContent` / `reviewCorrectionDraft`

### @deprecated 兼容层清单

| 符号 | 行为 |
|---|---|
| `result.value` | 镜像 `effectiveValue`，读写结果请用 `effectiveValue` |
| `store.getWorkflowStatus()` | 返回 `report.status` |
| `store.WORKFLOW_STATUSES` | 指向 `REPORT_STATUSES` |
| `store.rejectReportToIncomplete` / `createCorrectionDraftExtended` | 转发新状态机 |
| `C.rejectReportToIncomplete` / `C.createCorrectionDraftExtended` / `C.isValidResultIndicator` | 同上 |
| 上表 throw 的旧 API | 02–05 完成后删除 |

### 与 spec 的偏差 / 实现假设

1. **菌门/菌属 key 用 Excel 拉丁名**（`Firmicutes` / `Bacteroidetes` / `Proteobacteria` / `Actinobacteria` / `Fusobacteria` 及 spec 所列菌属）；`label` 仍为中文。字典里不再保留「放线菌门」等中文 key（02–05 改读 `listTaxaForRuleTarget` / 结果行 `key`）。
2. **Klebsiella 6.10** 以 JS number 存储（`6.1`）；比较请用数值而非字符串 `'6.10'`。
3. **`commit` 末尾一律 `syncAllReportsDerived`**，因此启用/停用规则后可编辑报告会自动出现 `pending_reanalysis`（需已有 `latestAnalysisRunId`）。已发布且无更正草稿的报告不打该标记。
4. **`withdrawReport` / `submitReport` / `rejectReport` 不改 `testRecord.status`**；`publishReport` 会把送检标为 `published`，`voidReport` 标为 `voided`（spec 只强制撤回不动送检）。
5. **更正草稿驳回**：报告主状态保持 `published`，工作版本回到 `draft`，`rejectReason` 写在报告级。
6. Seed 增加一条 **Klebsiella `RANGE_STATUS=no_range` 的 notice 规则**（`rule-kleb-present`），仅命中无范围报告，不进入 report-002 的变形菌门冲突组，以保证 3 命中 / 1 primary / 2 superseded。
7. 科普字典未再 seed 双歧杆菌 / 乳酸菌 / Phocaeicola / Lachnoclostridium（不在 spec 1.10 名单）；需要时可经字典 CRUD 补。
8. `admin-common.buildPublicationChecks` **委托 store 实现**，避免两套规则分叉。
9. 未做 v1→v2 本地数据迁移；浏览器若仍有 `pet-report-mock-store-v1` 会被忽略，刷新后走 v2 seed（或调用 `store.reset()`）。
