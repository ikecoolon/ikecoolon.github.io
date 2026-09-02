# 宠物微生物组报告原型 · 数据模型改造 Spec

**日期：** 2026-09-02　**依据：** 产品负责人决议 D1–D11 + 《pet-report-prototype-audit》审计
**范围：** `docs/.vuepress/public/prototype/`（纯静态 HTML + 原生 JS，IIFE / 全局对象，无构建）
**约束：** 不 git commit；不碰 `docs/.vuepress/dist`；临时脚本放 `/tmp`；UI 文案中文；沿用现有代码风格。

---

## 1. 目标模型

### 1.1 术语

| 术语 | 含义 |
|---|---|
| 菌门分析单元（phylum analysis unit, 简称「单元」） | 每份报告 × 每个有检测结果的菌门 → 一组内容：规则命中列表、分析草稿、建议草稿、确认状态、商品推荐 |
| 有效检测结果（effective result） | `dataStatus = PRESENT` 且有有限数值，或 `dataStatus = NOT_DETECTED` 的当前版本结果行；`labNotice = unmarked` 仍是有效结果 |
| 依据 | 单元所属菌门（含其下菌属）的全部当前有效结果（值 / 状态 / labNotice / rangeStatus） |

### 1.2 报告 `report`（D7）

```
status:               'unassigned' | 'incomplete' | 'pending_review' | 'published' | 'voided'   // 单一主状态字段
                      待归属          待完善         待审核             已发布         已作废
statusChangedAt:      ISO           // 每次 status 变化时赋值
correctionDraftActive: boolean      // 已发布 + 更正草稿进行中
rejectReason:         string|null   // 退回原因；提交时清空
ownershipStatus:      'unassigned' | 'bound'     // 由 petId 派生，OWNERSHIP_STATUSES 仅两值
todoFlags:            ('pending_reanalysis' | 'missing_unresolved' | 'product_unavailable' | 'user_unlinked')[]
latestAnalysisRunId:  string|null
currentVersion / workingVersion / publishedVersion
versions[]:           { version, status: 'draft'|'pending_review'|'published'|'superseded', healthLevel, healthScore, percentile,
                        platformDimensions:{emotion,immunity}, summary, correctionNote, createdAt, publishedAt, contentSnapshot }
```

- 删除：`workflowStatus` 字段与 `deriveWorkflowStatus()`（改为单一字段 `status`）；`REPORT_STATUSES` 中 draft / rejected / approved / corrected；`OWNERSHIP_STATUSES` 中 pending_claim / claimed；`todoFlags` 其余 5 种；`reportAnalysisAdjustments`。
- 更正草稿：`status` 始终 `published`，子阶段由工作版本 `versions[workingVersion].status`（draft = 更正中·待完善，pending_review = 更正中·待审核）表达，读取用 `getCorrectionDraftStage()`。
- 状态迁移（全部写 `statusChangedAt`）：

| 动作 | 前置 | 结果 |
|---|---|---|
| 导入生成报告 | testRecord 无 pet | `unassigned` |
| 导入生成报告 | testRecord 有 pet | `incomplete` |
| `assignReportOwnership` | unassigned | `incomplete`（无 userId 则 todo `user_unlinked`） |
| `submitReport` | incomplete；或 published+更正草稿(draft) | `pending_review`；更正草稿→版本 status `pending_review`；先跑阻断检查 |
| `withdrawReport` | pending_review；或更正草稿(pending_review) | `incomplete`；更正草稿→版本 status `draft`；**不改 testRecord** |
| `rejectReport(reason)` | pending_review（含更正草稿待审核） | `incomplete` + `rejectReason`；更正草稿→版本 `draft` + rejectReason |
| `publishReport` | pending_review（含更正草稿待审核） | `published`，approve+publish 合并；更正草稿发布：版本号 +1、旧发布版本 `superseded`、`correctionDraftActive=false`；冻结 contentSnapshot |
| `createCorrectionDraft` | published 且无进行中草稿 | 仍 `published`，`correctionDraftActive=true`，新增版本(draft) 复制评定字段 |
| `voidReport(reason)` | 非 voided | `voided` |

### 1.3 检测结果 `results[]`（原 `indicators[]`，D6）

```
id, testRecordId, reportId, key, rawImportName, sourceTemplateId
level:            'phylum' | 'genus' | 'indicator'     // 由字典分类树派生
phylumKey:        string|null                           // genus → parentKey；phylum → 自身；indicator → null
unit
dataStatus:       'PRESENT' | 'NOT_DETECTED' | 'MISSING_COLUMN' | 'EMPTY' | 'INVALID' | 'NOT_APPLICABLE'
sourceValue:      number|null      // Excel 原始值（补录行为 null）
effectiveValue:   number|null      // 当前有效值
value:            = effectiveValue // @deprecated 镜像，供未改造页面读取
modifiedReason:   string|null      // 有效值≠原始值时必填
valueSource:      'import' | 'manual'
labNotice:        'high' | 'low' | 'unmarked'           // Excel `vs AVG notice`；'-' → unmarked
importedRange:    {min,max,unit}|null
version, isCurrent, correctedFrom, createdAt, updatedBy
```

派生（读取时由 `decorateResult` 计算，不落库；发布时冻结进快照）：
`rangeStatus: 'low'|'normal'|'high'|'no_range'|null`（NOT_DETECTED/缺失 → null）、`rangeSource: 'imported'|'platform'|'none'`、`range:{min,max,unit}|null`、`isEffective`。
参考范围解析顺序：importedRange → 平台参考范围方案（按 species + sourceTemplateId）→ none。删除 manualRange / effectiveRange 冻结。

### 1.4 菌门分析单元 `phylumAnalysisUnits[]`（D1）

```
id, reportId, phylumKey
hits[]:  { id, ruleId, ruleVersion, lineageId, ruleName, riskLevel, priority, conflictGroup,
           target:{level,taxonKey}, sourceResultIds:[结果行 id], conditionResults:[{conditionId,type,taxonKey,actualValue,expected,matched,message}],
           output:{analysis,advice}, combineStatus:'primary'|'superseded_by_conflict', excluded:boolean, excludedReason }
analysisDraft, adviceDraft:  string
draftSource:      'auto' | 'manual'     // manual 后重跑分析不覆盖草稿
riskLevel:        单元内 primary 命中的最高风险 | null
confirmStatus:    'unconfirmed' | 'confirmed' | 'invalidated'
confirmedAt, confirmedBy, confirmedEvidenceSignature, invalidatedReason
primaryProductId: string|null；relatedProductIds: string[]（0–3 有序，不含主推）
hitSignature, updatedAt
```

- 单元由 `ensurePhylumUnits` 按「有有效结果的菌门」懒创建（含尚未运行分析的报告，此时 hits 为空）。
- 属级命中归入所属菌门单元；目标菌门无结果的命中被丢弃并记入 run.orphanHits。
- 依据变化（该菌门任一结果的 值/状态/labNotice/rangeStatus 改变）→ 已确认单元置 `invalidated`；重跑分析时命中签名变化亦置 `invalidated`。
- 编辑草稿 → 回到 `unconfirmed`；`riskLevel = notice` 或 `adviceDraft` 为空的单元不可配商品。
- 删除：报告级 `analysisRuns.combinedResult / finalContent`、`findings[]`、按 findingId 的 `recommendations[]`（含 healthTagIds / reason / label）。

### 1.5 分析规则 `analysisRuleCatalog[]`（D2–D4）

```
id, lineageId, version, status:'draft'|'active'|'inactive', name, description
target:          { level:'phylum'|'genus', taxonKey }        // 来自字典分类树 key
conditionLogic:  'ALL' | 'ANY'
conditions[]:    { id, type:'LAB_NOTICE',        notice:'high'|'low'|'unmarked' }
                 { id, type:'RANGE_STATUS',      rangeStatus:'low'|'normal'|'high'|'no_range' }
                 { id, type:'NOT_DETECTED' }
                 { id, type:'SPECIES',           species:['cat','dog'] }              // 兼容旧字符串 '猫,狗'
                 { id, type:'OTHER_TAXON_STATUS', taxonKey, statusKind:'LAB_NOTICE'|'RANGE_STATUS', expected }
riskLevel:       'low' | 'medium' | 'high' | 'notice'     // notice = 仅提示，不出建议、不配商品
priority, conflictGroup
output:          { analysis, advice }
```

- 删除：NUMERIC_COMPARE / DATA_STATUS 条件、output.professional / consumer / healthAdvice / outputMode / isDataIntegrityOnly、suppressProduct、自由文本 indicatorKey。
- 同谱系最多一个 active；启用规则集变化 → 所有可编辑报告（非 voided、非「已发布且无草稿」）打 `pending_reanalysis`。

### 1.6 规则引擎（D5）— 新建 `shared/analysis-engine.js`

UMD：浏览器 `window.PetReportAnalysisEngine`，Node `require('./analysis-engine.js')`。纯函数，不读 store：
`evaluate({ rules, results, species, taxa }) → { units:[{phylumKey, hits}], orphanHits, evaluatedRules }`、`evaluateCondition`、`evaluateRule`、`resolveConflicts(hits)`、`composeDrafts(hits)`、`hitSignature(hits)`、`RISK_ORDER`。
冲突：同一菌门单元内、同 conflictGroup（无组则独立）按 风险(high>medium>low>notice) → priority 留一条 primary，其余 `superseded_by_conflict`；被排除命中不参与。
mock-store 的 `runReportAnalysis` 与规则页只读 `previewRuleEvaluation` 共用该引擎。**mock-store 在 seed 与 runReportAnalysis 时依赖引擎，`shared/analysis-engine.js` 必须先于 `shared/mock-store.js` 引入。**

### 1.7 分析运行 `analysisRuns[]`

`{ id, reportId, createdAt, actor, inputSnapshot:{ resultSignature, rulesSignature, workingVersion, species }, ruleIds, unitSummaries:[{phylumKey, hitCount, primaryCount, riskLevel}], orphanHits }`；`report.latestAnalysisRunId` 指向最新。`pending_reanalysis` = 最新 run 存在且 resultSignature 或 rulesSignature 与当前不一致。

### 1.8 菌群科普 `edu`（D10）

`{ sceneCopy, introText, mainTasks[], appearanceText, functionText, hint, knowledgeText }`；`lowHint/normalHint/highHint/tooLowHint/tooHighHint` 一次性迁移：`hint = normalHint || lowHint || highHint`。

### 1.9 删除的数据（D9）

`healthTags`、`healthTagProducts`、`claimCodes`、`findings`、`recommendations`、`reportAnalysisAdjustments`；`pets/testRecords.claimStatus` 仅剩 `'bound'|'unassigned'`；testRecord.status 去掉 `pending_claim`。
存储键升级为 `pet-report-mock-store-v2`（旧 v1 本地数据直接丢弃，不做跨模型迁移）。

### 1.10 Seed 覆盖（D11）

| 报告 | 状态 | 宠物 / 用户 | 说明 |
|---|---|---|---|
| report-001 | published（v1 superseded，v2 published） | 小花 cat / user-001 | 有范围；放线菌门 v1 12.3 → v2 18.5（修改原因）；单元全部确认，含商品 |
| report-002 | pending_review | 咪咪 cat / user-002 | 有范围；Fusobacterium 未检出；变形菌门单元内 3 条命中冲突（Proteus / Escherichia-Shigella / Klebsiella）；主推含下架 / 零库存商品 |
| report-003 | incomplete + rejectReason | 阿黄 dog / user-001 | 放线菌门 MISSING_COLUMN → `missing_unresolved`；单元未确认 |
| report-004 | published + correctionDraftActive（v2 draft） | 旺仔 dog / 无用户 | 机构 ORG-LAB-GUT-002，**无任何有效范围**；文件 `harley_final_microbiome_report.xlsx`；Klebsiella 4.59→6.10 使变形菌门单元 `invalidated` + `pending_reanalysis`；`user_unlinked` |
| report-005 | voided | 阿黄 dog / user-001 | 曾发布后作废 |
| report-006 | unassigned | — | tr-009，文件 `oscar_final_microbiome_report.xlsx`，未运行分析，单元为空壳 |

菌门 / 菌属采用真实 Excel 名称：Firmicutes / Bacteroidetes / Proteobacteria / Actinobacteria / Fusobacteria；Bacteroides / Fusobacterium / Escherichia-Shigella / Collinsella / Streptococcus / Peptacetobacter / Proteus / Klebsiella / Mediterraneibacter / Pseudomonas。labNotice 多数为 unmarked。

---

## 2. 按文件改造项

### 2.1 共享层（issue 01）
- `shared/analysis-engine.js`（新建）
- `shared/mock-store.js`：枚举、seed、结果模型、单元模型、规则模型、状态机、全部 API、快照、删除 D9 数据与 API
- `shared/mock-store-smoke.js`：按新模型重写断言
- `admin/js/admin-common.js`：状态标签、`buildPublicationChecks`、删 sessionStorage 草稿、删 claim / finding / healthTag 逻辑、新增单元 / 结果读取封装
- `admin/index.html`、`mini-program/app.html`：加 `<script src="../shared/analysis-engine.js">`（先于 mock-store）

### 2.2 分析规则页（issue 02）
`admin/analysis-rules.html`、`admin/js/analysis-rules-script.js`：删「报告分析工作台」tab；表单目标改字典下拉、条件类型改 D4、输出改 D2；新增只读「规则测试」tab。

### 2.3 报告工作台（issue 03）
`admin/report-review.html`、`admin/js/report-review-script.js`：七模块重排；分析与建议按菌门卡片；商品推荐行 = 菌门；检测结果原始 / 有效值对照 + 补录；来源与归属含归属操作；动作按新状态机。

### 2.4 报告中心与清理（issue 04）
`admin/report-center.html`、`admin/js/report-center-script.js`、`admin/js/script.js`、`admin/index.html`；删除 `published-reports` / `pet-report-management` / `excel-import` / `dashboard` / `recommendation-mapping` 的 html + js；`admin/css` 中相关引用；`dictionary-data-service.js` 遗留（manualRange / freezeEffectiveRange / ensureDemoCompletionScenario / correctIndicator 调用）。

### 2.5 小程序与科普（issue 05）
`mini-program/js/pages.js`、`helpers.js`、`script.js`、`admin/js/microbiota-knowledge-script.js`、`admin/microbiota-knowledge.html`。

### 2.6 验证（issue 06）
`node --check`、smoke、headless Chrome 加载、人工走查。

---

## 3. 删除项总表

| 类别 | 删除 |
|---|---|
| 数据集合 | findings、recommendations、healthTags、healthTagProducts、claimCodes、reportAnalysisAdjustments、analysisRuns.combinedResult / adjustments |
| 报告字段 | workflowStatus、versions[].rejectReason（上移到 report.rejectReason）、versions[].status = corrected / rejected / approved |
| 结果字段 | manualRange、effectiveRange（冻结）、originalValue / originalDataStatus（→ sourceValue） |
| 规则字段 | indicatorKey、dataStatus、NUMERIC_COMPARE、DATA_STATUS、output.professional / consumer / healthAdvice / outputMode / isDataIntegrityOnly |
| 科普字段 | lowHint / normalHint / highHint |
| store API | approveReport、publishCorrection、rejectReportToIncomplete、reviewCorrectionDraft、createCorrectionDraftExtended、saveAnalysisFinalContent、updateFinding、updateRecommendation、updateReportContent、correctIndicator、resolveRecommendationTarget、resolveHealthTagCandidates、bindClaimCode、generateClaimCredential、voidClaimCredential、preBindPetToStore、deriveWorkflowStatus、CONCLUSION_LEVELS、RECOMMEND_TYPES、DEMO_LABEL |
| admin-common | saveReviewDraft / getReviewDraft、lookupClaimCode、getPendingClaimCodes、canRecommend、saveAnalysisFinalContent、reviewCorrectionDraft、getLatestAnalysisRun（改走 store）、REC_AVAILABILITY_WARNINGS、REPORT_STATUS_LABELS 旧值、statusBadge 中 draft / rejected / approved / corrected / pending_claim |
| 页面 | published-reports、pet-report-management、excel-import、dashboard、recommendation-mapping（html + js + PAGE_CONFIG + 菜单）；小程序 claim / reports / progress / history / finding / metrics / recommendations |

---

## 4. 验证方式

1. `node --check` 全部 `shared/*.js`、`admin/js/*.js`、`mini-program/js/*.js`。
2. `node shared/mock-store-smoke.js` 全绿：状态迁移、单元生成、引擎命中与冲突、依据变化失效、发布检查阻断项、快照冻结、seed 覆盖。
3. headless Chrome（若本机有）：加载 `admin/index.html#report-center`、`#report-review?reportId=…`、`#analysis-rules`、`#detection-records`、`#microbiota-knowledge` 与 `mini-program/app.html`，控制台无未捕获错误。
4. 人工走查：六种 seed 报告各走 报告中心 → 工作台 → （提交 / 退回 / 发布 / 作废 / 更正）→ 小程序。
