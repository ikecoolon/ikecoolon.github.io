# 05 — 小程序读菌门分析单元 + 菌群科普单一 hint

**What to build:** 小程序报告页从发布快照的 `phylumUnits` 读每菌门的分析 / 建议与主推商品；问候用宠物档案名；无有效范围时隐藏对比模块与菌门卡范围；删除 claim / reports / progress / history / finding / metrics / recommendations 死页面；菌群科普页与弹窗改用单个 `hint`。

**Blocked by:** 01 — 共享数据层

**Status:** done

## 范围

### `mini-program/js/helpers.js`
- 删除 `getFindingById / getRecommendationById / getReportFindings / buildFindingsFromSnapshot / getFindingForIndicator / listRecommendations / getRecommendationFromSnapshot / getPendingClaimCodes / previewClaimCode / bindClaimCodeForUser / resolveRecommendationDisplay(基于 rec)` 等读 `findings / recommendations / claimCodes` 的函数。
- `getReportIndicators` → `getReportResults`：优先 `ctx.snapshot.results`（已含 `rangeStatus / rangeSource / range / labNotice / level / phylumKey`），非发布态回退 `store.getEffectiveResults(reportId)`。
- 新增 `getPhylumUnit(reportId, phylumKey)`：读 `ctx.snapshot.phylumUnits`；`buildMicrobiotaTree` 中 `finding` 字段替换为 `unit`。
- `evaluateIndicatorPresentation`：直接用 `result.rangeStatus`（no_range → `status-no-range`，null → 未检出 / 无值）。
- `hasAnyEffectiveRange(reportId)`：读 `snapshot.hasAnyEffectiveRange`。
- 科普：`normalizeEduForDisplay`（原 L890–960）删除 `lowHint / normalHint / highHint` 与按状态挑选提示的逻辑，改为单个 `hint`。
- 商品：`resolveUnitProductDisplay(unit)` 用 `store.resolveProductAvailability(unit.primaryProductId)`（替代 `resolveRecommendationTarget`，原 L1143）。

### `mini-program/js/pages.js`
- `renderReportHero`（原 L573）：问候名 = `pet.name`（宠物档案名），不再用登录用户名。
- `renderCompareSection`：`hasAnyEffectiveRange === false` 时整块不渲染。
- `renderPhylumPanels` 菌门卡：无范围时不显示范围文案；「分析」tab 读 `unit.analysis`（仅 `confirmStatus === 'confirmed'` 的快照单元，否则不渲染 tab），「总体建议」tab 读 `unit.advice`，建议 tab 下商品卡读 `unit.primaryProductId`（`renderInlinePrimaryProduct` 改参）。
- 弹窗「什么是 X 门」提示条读 `edu.hint`（不随状态变化）。
- 删除 `renderClaim / renderReports / renderProgress / renderHistory / renderFinding / renderMetrics / renderRecommendations / renderRecommendationTarget` 及路由表中对应项；`script.js` 中 L477 `H.getPendingClaimCodes()` 等调用与 claim 相关事件删除。
- 删除 `mini-program/claim.html / reports.html / progress.html / history.html / finding.html / metrics.html / recommendations.html / recommendation-target.html`（1 行重定向文件）。

### `mini-program/app.html`
- 已由 01 加入 `../shared/analysis-engine.js`；确认加载顺序 analysis-engine → mock-store → helpers → pages → script。

### 菌群科普 `admin/microbiota-knowledge.html` + `admin/js/microbiota-knowledge-script.js`
- 表单：偏低 / 正常 / 偏高三个提示输入 → 一个「提示条（不随状态变化）」输入，绑定 `edu.hint`；保存走 `store.saveTaxonEdu(key, { edu: { hint } })`。
- 预览弹窗渲染改读 `hint`。
- 页面所有 `lowHint / normalHint / highHint` 引用为 0。

## 涉及文件

`mini-program/js/helpers.js`、`mini-program/js/pages.js`、`mini-program/js/script.js`、`mini-program/*.html`（死页面）、`admin/microbiota-knowledge.html`、`admin/js/microbiota-knowledge-script.js`

## 验收标准

- [ ] 以 user-001 登录小程序：报告列表出现 report-001（小花）与 report-004 不出现（旺仔无用户）；打开 report-001：问候「Hi, 小花」，对比模块显示，放线菌门卡「分析 / 总体建议」tab 内容 = 该单元确认后的 `analysis / advice`，建议 tab 下主推卡为 `prod-001`（待 06）
- [ ] 将 pet-004 关联 user-001 后打开 report-004：无对比模块，菌门卡不显示范围，仍显示 labNotice 与分析 / 建议（读发布版 v1 快照，不受更正草稿影响）（待 06）
- [ ] 弹窗提示条为固定 `hint`，切换菌门状态不变（待 06）
- [x] `rg "findings|recommendations|claimCodes|lowHint|normalHint|highHint" mini-program/js admin/js/microbiota-knowledge-script.js` 为 0
- [x] `node --check` 三个 mini-program js + `microbiota-knowledge-script.js` 通过；控制台无错误（待 06）

## 实现备注

- 发布快照里的菌门单元仍是 `analysisDraft / adviceDraft`（issue 01 按确认后草稿冻结）。小程序展示读 `unit.analysis || unit.analysisDraft`、`unit.advice || unit.adviceDraft`，且分析 tab 仅在 `confirmStatus === 'confirmed'` 时渲染。
- 无范围菌门卡隐藏「正常范围」文案；`labNotice !== unmarked` 或当前无范围时显示实验室标注。
- seed 数据断言见 `/tmp/issue05-mini-check.js`（user-001 可见 report-001、问候小花、对比模块、放线菌门分析/建议/prod-001；关联 pet-004 后 report-004 无对比/无范围文案、Klebsiella 快照 4.59 而非草稿 6.1）。
