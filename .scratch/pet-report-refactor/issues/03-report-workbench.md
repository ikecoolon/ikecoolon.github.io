# 03 — 报告工作台：按菌门分析单元重排模块与动作

**What to build:** `report-review` 改为七模块：来源与归属 / 检测结果 / 综合评定 / 分析与建议 / 商品推荐 / 发布检查 / 版本与记录；「分析与建议」按菌门卡片、每菌门单独确认；「商品推荐」行 = 菌门；检测结果支持原始值 / 有效值对照、修改 + 原因、补录；动作按新五值状态机；预览 tab 改为 概览 / 对比 / 菌门。

**Blocked by:** 01 — 共享数据层

**Status:** done

## 范围

### 模块
1. **来源与归属**：报告号 / 送检 / 外部报告号 / 样本号 / 机构 / 宠物 / 用户 + 导入批次 `fileName`、`uploadedAt`、`templateRecognition`（识别结果 + sheet 名 + 模板 id）；`status = unassigned` 时在此提供归属操作（选宠物 → `store.assignReportOwnership({ reportId, petId, userId? })`）；宠物物种与 `reportSpecies` 不一致时提示。
2. **检测结果**：列表用 `store.getEffectiveResults(reportId)`（已带 `level / phylumKey / rangeStatus / rangeSource / range / labNotice / isEffective`）。每行：名称、原始值 `sourceValue`、有效值 `effectiveValue`（不同则高亮 + `modifiedReason`）、labNotice 标签（`LAB_NOTICE_LABELS`）、范围 + 来源标签（`RANGE_SOURCE_LABELS`：报告导入 / 平台配置 / 无范围）、状态。动作：修改有效值（`store.modifyResultValue({ reportId, resultId, value, dataStatus?, labNotice?, reason })`，原因必填）、补录（`store.supplementResult({ reportId, key, value, unit, labNotice, dataStatus, reason })`，key 从字典树选）。把 `pet-report-management` 完善弹窗的表单能力搬进来，删除原「模拟数据变更」按钮。已发布且无更正草稿时结果只读（store 会抛错）。
3. **综合评定**：物种 / 等级 / 综合分 / 百分位 / 情绪 / 免疫（`saveReportAssessment`）。删除「综合摘要」textarea 的必填含义（可保留为可选备注）。
4. **分析与建议**：顶部「运行分析」（`store.runReportAnalysis(reportId, { actor })`）+ 待重新分析横幅（`todoFlags` 含 `pending_reanalysis`）。每个菌门单元一张卡片（`store.getPhylumUnits(reportId)`）：标题 = 菌门 label + 风险标签 + 确认状态标签（`UNIT_CONFIRM_LABELS`）；命中列表可展开（规则名 / 版本 / 条件实际值 / 来源结果行 / primary 或 superseded_by_conflict），每条可排除 / 恢复（`store.excludeHit(reportId, phylumKey, hitId, { excluded, reason })`）；两个草稿框（`analysisDraft` / `adviceDraft`，`store.savePhylumUnitDraft(reportId, phylumKey, { analysis, advice })`，保存后状态回未确认）；「确认」按钮（`store.confirmPhylumUnit`）；`invalidated` 时显示 `invalidatedReason` 与「重新确认」。
5. **商品推荐**：行 = 菌门单元；列：菌门、建议摘要（`adviceDraft` 前 40 字）、主推槽（0–1）、关联槽（0–3 有序）；复用现有商品选择器（`store.searchProductsForPicker`），保存 `store.savePhylumUnitProducts(reportId, phylumKey, { primaryProductId, relatedProductIds })`；`riskLevel = notice` 或建议为空的行禁用并提示「该菌门无建议，不配置商品」；商品可用性标签用 `store.resolveProductAvailability(productId)`。
6. **发布检查**：`C.buildPublicationChecks(state, reportId)` 阻断 / 警告分组渲染；阻断为 0 才允许提交 / 发布。
7. **版本与记录**：版本列表（`versions[].status` 中文：草稿 / 待审核 / 已发布 / 已替代）、`operationRecords`；更正草稿时可切换工作版 / 发布版查看。

### 动作（顶栏）
| 按钮 | 可见 | 调用 |
|---|---|---|
| 暂存 | 非 voided；非（published 且无草稿） | 各模块自身 save（单轨，删除 `C.saveReviewDraft` sessionStorage） |
| 提交审核 | `incomplete`；或 `published + correctionDraftActive` 且 `getCorrectionDraftStage() === 'incomplete'` | 先 `buildPublicationChecks`，有阻断则阻止；`store.submitReport(reportId, { actor })` |
| 撤回 | `pending_review`；或更正草稿 stage `pending_review` | `store.withdrawReport(reportId, { actor })`（不动 testRecord） |
| 退回完善 | 仅 `pending_review`（含更正草稿待审核） | 弹原因 → `store.rejectReport(reportId, reason, { actor })` |
| 审核通过并发布 | 仅 `pending_review`（含更正草稿待审核） | `store.publishReport(reportId, { actor })`（一次进入已发布） |
| 作废 | 非 voided | 弹原因 → `store.voidReport(reportId, reason)` |
| 创建更正草稿 | `published` 且 `!correctionDraftActive` | `store.createCorrectionDraft(reportId, { correctionNote })` |

顶部显示 `rejectReason`（`incomplete` 且有原因时）。状态标签用 `C.REPORT_STATUS_LABELS` / `C.statusBadge`。

### 预览（右栏）
tab 改为「概览 / 对比 / 菌门」：概览 = 综合评定；对比 = 有效范围的结果条形图（`hasAnyEffectiveRange === false` 时显示「本报告无有效参考范围」占位）；菌门 = 每菌门 值 / 范围 / labNotice + 单元的分析 / 建议 + 主推商品卡。数据源统一为工作版本（发布版切换时读 `contentSnapshot.results / phylumUnits`）。

### 命名统一
模块名 / 预览 tab / 按钮全部用：分析、建议、菌门分析单元、商品推荐、退回完善、作废、更正草稿。删除「分析解释 / 健康建议与推荐 / 通俗解读 / 专业结论 / 综合摘要」。

### 删除
`runMockAnalysis`、`state.findings / recommendations` 的全部读取、`C.saveReviewDraft / getReviewDraft`、`store.approveReport / publishCorrection / updateRecommendation / resolveRecommendationTarget / correctIndicator / C.saveAnalysisFinalContent / C.reviewCorrectionDraft`、「模拟数据变更」。

## 涉及文件

`admin/report-review.html`、`admin/js/report-review-script.js`（可新增 `admin/css` 样式）

## 验收标准

- [ ] 六份 seed 报告分别打开工作台，模块与顶栏按钮符合上表；无控制台错误 — **待 06**
- [ ] report-003：显示退回原因；补录放线菌门后 `missing_unresolved` 消失；运行分析后放线菌门卡片出现命中；确认全部单元、填评定后阻断项为 0，提交 → 待审核 — **待 06**（store API 路径已用 `/tmp/issue03-workbench-api.js` 验证）
- [ ] report-002：变形菌门卡片 3 条命中（1 primary / 2 superseded），排除 primary 后另一条自动变 primary 且草稿（auto）重新合成；审核通过并发布 → `published`，快照含 `phylumUnits` — **待 06**（排除 + auto 草稿已用上述脚本验证）
- [ ] report-004：变形菌门单元显示「依据变化失效」，发布检查含「依据变化后未重新分析」「存在未确认的菌门分析单元」两条阻断；重跑分析 + 重新确认后可提交 → 待审核 → 发布后 `publishedVersion = 2`、`correctionDraftActive = false` — **待 06**（失效标签与两条阻断已用上述脚本验证）
- [x] 撤回后 testRecord.status 不变；退回按钮仅在待审核可见
- [x] 商品推荐：notice / 无建议菌门禁用；主推下架商品时行内显示失效标签
- [x] `node --check` 通过

## 偏差 / 实现假设

1. Seed 批次只有 `fileName` / `createdAt`，没有独立 `uploadedAt` 或 `templateRecognition` 对象。来源模块展示 `uploadedAt || createdAt`；模板识别用批次 `status`（已识别/识别失败）、`sheetName`（无则 —）、结果行 `sourceTemplateId` 或送检 `sourceOrgId`。
2. 已存在的缺失行（如 report-003 放线菌门 `MISSING_COLUMN`）在详情区「补录」走 `modifyResultValue`；顶栏「补录」走 `supplementResult` 并从字典树选择尚无结果的 key。
3. 工作台报告下拉列出全部 seed（含已发布 / 已作废），便于六份报告切换，不再只显示审核队列。
4. 原「综合摘要」textarea 改为「备注（可选）」，仍写入 `versions[].summary`。
5. 本机 headless Chrome dump-dom 无输出；完整浏览器走查标待 06。
