# 02 — 分析规则页：规则定义改 D2–D4 + 只读「规则测试」tab

**What to build:** 分析规则页只保留「规则定义」与只读「规则测试」两个 tab；规则表单目标改为字典分类树下拉（门 / 属），条件类型只保留 D4 五种，输出改为「分析」+「建议」+ 风险（含 notice）；删除会写入报告的「报告分析工作台」。

**Blocked by:** 01 — 共享数据层

**Status:** done

## 范围

1. `admin/analysis-rules.html`
   - 删除「报告分析工作台」tab 及其 section（原 L147–229：`#tab-workbench`、`#section-workbench`、`wb-*` 全部节点）。
   - 规则表单：
     - 「检测指标」自由文本（原 L249）→ 「目标分类单元」下拉：先选层级（门 / 属），再选 `store.listTaxaForRuleTarget(level)` 返回的分类树节点（显示 `label (latinName)`，值为 `key`）。
     - 条件模板（`#condition-template`）类型选项改为：实验室标注（LAB_NOTICE：偏高 / 偏低 / 未标注）、相对有效参考范围（RANGE_STATUS：偏低 / 正常 / 偏高 / 无范围）、未检出（NOT_DETECTED）、报告物种（SPECIES：猫 / 狗 多选）、其他分类单元状态（OTHER_TAXON_STATUS：选另一 taxonKey + 状态类型 + 期望值）。删除 NUMERIC_COMPARE / DATA_STATUS 相关控件。
     - 输出区：三个文案框 → 两个（分析 `output.analysis`、建议 `output.advice`）；删除输出模式 / 仅数据完整性提示复选框；风险等级选项加「仅提示（notice）」并在选中时禁用建议框。
   - 新增「规则测试」tab（只读）：报告下拉（`state.reports` 中非 voided）、候选集切换（仅当前启用 / 启用 + 草稿）、可选勾选具体规则版本；结果区按菌门卡片显示：命中列表（规则名 + 版本 + 条件实际值 + 冲突结果 primary / superseded_by_conflict）、合成的分析 / 建议草稿；顶部说明「不写入报告」。
2. `admin/js/analysis-rules-script.js`
   - 删除 L183–397 的 `evaluateCondition / evaluateRule / combineHits / runAnalysis` 及 `computeIndicatorSignature / computeRulesSignature / signaturesChanged / needsReanalysis / syncPendingReanalysisFlag / checkAllReportsReanalysis`（均已进共享层）；删除所有 `wb*` DOM 变量与 workbench 渲染 / 事件；默认 tab 改为规则列表（原 L1077 默认打开 workbench）。
   - 删除 `svc.ensureDemoCompletionScenario()` 调用（该函数写旧字段 originalValue / manualRange，见 04 清理）。
   - 规则 CRUD 改走 store：`saveAnalysisRule`、`createRuleRevision`、`duplicateAnalysisRule`、`activateAnalysisRule`、`deactivateAnalysisRule`、`deleteAnalysisRule`、`validateAnalysisRule`；不再直接改 `state.analysisRuleCatalog`。
   - 列表列「条件」「输出」摘要按新结构渲染（`formatConditions / formatOutput` 重写；可用 `store.describeCondition(cond)`）。
   - 规则测试调用 `store.previewRuleEvaluation(reportId, { includeDrafts, ruleIds })`，只读渲染。
3. 文案：tab 名「规则定义」「规则测试」；条件 / 风险 / 状态全部中文标签（用 `store.CONDITION_TYPE_LABELS / RISK_LEVEL_LABELS / LAB_NOTICE_LABELS / RANGE_STATUS_LABELS`）。

## 涉及文件

`admin/analysis-rules.html`、`admin/js/analysis-rules-script.js`

## 验收标准

- [x] 页面默认显示规则列表；无「报告分析工作台」入口；页面上不出现「专业结论 / 通俗解释 / 健康建议 / 输出模式」（HTML/脚本静态检查已通过；浏览器走查 待 06）
- [x] 新建 / 编辑规则可选门或属目标（下拉来自字典），条件类型仅 D4 五种，保存后 `state.analysisRuleCatalog` 中该规则满足 `store.validateAnalysisRule(rule)` 返回空数组（Node 模拟 `saveAnalysisRule` + `validateAnalysisRule`；表单走查 待 06）
- [x] 启用一条新规则后，seed 中 report-002 / report-003 出现 `pending_reanalysis`（commit 内自动同步）（Node：`activateAnalysisRule` 后 002/003 有标记、001 无）
- [x] 规则测试对 report-002 显示 5 个菌门卡片，变形菌门卡片有 3 条命中、1 条 primary、2 条 superseded_by_conflict；测试前后 `state.analysisRuns.length` 与 `phylumAnalysisUnits` 不变（Node 验证 `previewRuleEvaluation` + 有效结果菌门并集；浏览器卡片走查 待 06）
- [x] `node --check admin/js/analysis-rules-script.js` 通过；控制台无错误（语法已过；控制台 待 06）
