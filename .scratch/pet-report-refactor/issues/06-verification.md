# 06 — 验证：语法、smoke、无头加载、人工走查

**What to build:** 02–05 合并后做一次全量验证并修复回归。

**Blocked by:** 02、03、04、05

**Status:** done

## 范围

1. 语法：`for f in shared/*.js admin/js/*.js mini-program/js/*.js; do node --check "$f"; done`（在 `docs/.vuepress/public/prototype` 下执行）。
2. Smoke：`node shared/mock-store-smoke.js` 全绿；若 02–05 新增了 store API，补断言。
3. 无头加载（本机若有 Chrome / Chromium）：
   ```bash
   cd docs/.vuepress/public/prototype && python3 -m http.server 8765 &
   for hash in report-center 'report-review?reportId=report-002' analysis-rules detection-records customer-management pet-information dictionary-management normal-range-config microbiota-knowledge; do
     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --virtual-time-budget=4000 --enable-logging=stderr --v=0 "http://localhost:8765/admin/index.html#$hash" 2>&1 | rg -i "uncaught|TypeError|ReferenceError|404" || echo "OK $hash"
   done
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --virtual-time-budget=4000 --enable-logging=stderr "http://localhost:8765/mini-program/app.html" 2>&1 | rg -i "uncaught|TypeError|ReferenceError|404" || echo "OK mini"
   ```
   任何 `Uncaught` / `TypeError` / `ReferenceError` / 资源 404 视为失败。
4. `rg` 清零：`findings|recommendations\b|healthTag|claimCodes|reportAnalysisAdjustments|workflowStatus|lowHint|normalHint|highHint|NUMERIC_COMPARE|DATA_STATUS|isDataIntegrityOnly|saveReviewDraft` 在 `admin/js`、`mini-program/js`、`shared` 中除注释与迁移函数外为 0。
5. 人工走查（每条在浏览器完成，重置 store 后从 seed 开始）：

| # | 路径 | 期望 |
|---|---|---|
| A | 报告中心「待归属」→ report-006 → 工作台 来源与归属 归属到 pet-005 | 状态 → 待完善；报告中心「待完善」可见；`user_unlinked` 角标 |
| B | report-003 工作台：补录放线菌门 → 运行分析 → 逐菌门确认 → 填评定 → 提交 | 阻断为 0 才能提交；→ 待审核；退回原因消失 |
| C | report-002 工作台：退回（填原因） | → 待完善，顶部显示原因；再提交 → 待审核；审核通过并发布 → 已发布；小程序 user-002 可见 |
| D | report-002 已发布后：撤回按钮不可见；创建更正草稿 → 修改一个结果值 → 该菌门单元失效 + 待重新分析阻断 → 重跑 → 重新确认 → 提交 → 发布 | `publishedVersion` +1，小程序读到新快照，旧版本 `superseded` |
| E | report-004（已发布·更正中）：报告中心副标签「更正中·待完善」；撤回 / 退回不可见；工作台可继续编辑 | 提交后副标签变「更正中·待审核」 |
| F | report-001 更多 → 作废（填原因） | → 已作废；小程序 user-001 不再显示；工作台只读 |
| G | 分析规则页：新建属级 LAB_NOTICE 规则并启用 | report-002 / 003 / 004 打 pending_reanalysis；规则测试对 report-004 显示命中且不写入 |
| H | 小程序 report-001：问候宠物名、对比模块、菌门 tab 分析 / 建议、商品卡；report-004（关联用户后）无对比模块 | 与 05 验收一致 |
| I | 菌群科普：编辑拟杆菌门 hint → 小程序弹窗提示条更新 | 单一 hint |
| J | 撤回 report 后查看送检管理 | testRecord.status 未变 |

## 涉及文件

无新增文件；修复回归时可改任意页面脚本。

## 验收标准

- [x] 1–4 全部通过
- [x] 走查 A–J 全部符合期望，并把结果记录在本文件末尾「## 走查记录」

## 本轮修复

1. **工作台 `params.module`**：`defaultModuleForReport` 优先使用合法 `route.params.module`（source / results / assessment / analysis / recommendations / checks / versions）。`reviewNavParams` 切换报告时保留当前 `activeModule`。报告中心「更多 → 版本」已在无头 Chrome 验证打开版本模块。
2. **工作台 `todoFlags` 角标**：顶栏状态旁渲染 `TODO_FLAG_LABELS`（含 `user_unlinked` → 未关联用户），满足走查 A。
3. **缺失行补录**：检测结果详情在缺失态下数据状态下拉默认 `PRESENT`，避免只填数值却仍为 `MISSING_COLUMN`。
4. **删除 admin-common `@deprecated` throw / 薄别名**：`lookupClaimCode` / `getPendingClaimCodes` / `canRecommend` / `saveAnalysisFinalContent` / `reviewCorrectionDraft` / `rejectReportToIncomplete` / `createCorrectionDraftExtended`。保留仍在用的 `isValidResultIndicator`。smoke 同步断言这些导出已删除。
5. **`dictionary-data-service` 科普回退**：`emptyTaxonEdu` / `normalizeTaxonEdu` 与 store 对齐为单一 `hint`；`lowHint/normalHint/highHint` 仅作读入迁移。

## `rg` 残留（允许项）

在 `admin/js`、`mini-program/js`、`shared` 中：

| 模式 | 残留 | 说明 |
|---|---|---|
| `recommendations\b` | 工作台模块 id / `recommendations-panel` | 商品推荐模块，非已删 `recommendations[]` 集合 |
| `lowHint` 等 | `normalizeTaxonEdu` 读入合并；smoke 负向/迁移断言 | 迁移函数 + 验证 |
| `findings` / `healthTag` / `claimCodes` / `reportAnalysisAdjustments` / `saveReviewDraft` | 仅 `mock-store-smoke.js` 负向断言 | 确认集合/API 已不存在 |
| `DATA_STATUS` | `DATA_STATUSES` / `DATA_STATUS_LABELS` / `MISSING_DATA_STATUSES` | 结果行 `dataStatus` 枚举与中文标签，**不是**已删规则条件类型 `DATA_STATUS` |
| `workflowStatus` / `NUMERIC_COMPARE` / `isDataIntegrityOnly` | 0 | — |

`mini-program/js/script.js` 用 `'recommendation' + 's'` 拼旧路由名，避免误伤模块 id。

## 走查记录

脚本：`/tmp/issue06-walkthrough.js`（store + 小程序 `renderReport` HTML）、`/tmp/issue06-headless.js`（Chrome CDP）。每条从 `store.reset()` seed 开始。发布快照菌门字段按 `analysisDraft`/`adviceDraft`（兼容 `analysis`/`advice`）断言。

| # | 结果 | 覆盖方式 | 说明 |
|---|---|---|---|
| A | **通过** | Node + 无头点击 | 归属 pet-005 → `incomplete`；待完善视图可见；工作台角标「未关联用户」。无头已点绑定归属。 |
| B | **通过** | Node（store） | 补录放线菌门 `12.3`+`PRESENT`（低于平台范围才命中 `RANGE_STATUS=low`）；`missing_unresolved` 消失；运行分析后有命中；确认全部单元后阻断 0；提交 → `pending_review`，退回原因清空。 |
| C | **通过** | Node（store + 投影） | 退回 → 待完善+原因；提交 → 待审核；发布 → 已发布；`getUserVisibleReports('user-002')` 含 report-002 / 宠物咪咪。原型小程序固定登录 user-001，未在浏览器切用户。 |
| D | **通过** | Node（store） | 发布后撤回按钮逻辑不可见；更正草稿 → 改厚壁菌门有效值 → 单元 `invalidated` + `pending_reanalysis` 阻断 → 重跑确认提交发布；`publishedVersion` 1→2，旧版 `superseded`，快照为新值。 |
| E | **通过** | Node + 无头 DOM | 副标签「更正中·待完善」；无撤回/退回；可编辑。提交前按阻断先重跑+确认；提交后「更正中·待审核」。无头确认按钮可见性与更正横幅。 |
| F | **通过** | Node（store + `renderReport`） | 作废后 user-001 列表不再含 report-001；详情「无权查看」；`isEditable=false`。 |
| G | **通过** | Node（store） | 新建属级 Klebsiella `LAB_NOTICE=unmarked` 并启用；002/003/004 打 `pending_reanalysis`，001 不打；`previewRuleEvaluation(report-004)` 命中且 `analysisRuns` / `phylumUnits` 条数不变。 |
| H | **通过** | Node HTML + 无头 | user-001：问候「Hi, 小花」、对比模块、放线菌门分析/建议、主推「益生菌套装 A」。关联 pet-004 后 report-004 无对比/无「正常范围」、快照 Klebsiella `4.59`。无头打开 `#/report/report-001`。 |
| I | **通过** | Node（store + helpers） | `saveTaxonEdu(Bacteroidetes, {hint})` 后 `resolveTaxonNodeHint` 为新文案，无 low/normal/highHint。 |
| J | **通过** | Node（store） | 撤回 report-002 后 `testRecord.status` 仍为 seed 的 `pending_review`。 |

### 无头加载（Chrome CDP，`python3 -m http.server 8765`）

全部无 Uncaught / TypeError / ReferenceError / 业务资源 404：report-center、report-review（002 / 006+module=versions）、analysis-rules、detection-records、customer-management、pet-information、dictionary-management、normal-range-config、microbiota-knowledge、mini-program/app.html。旧 hash `dashboard` / `published-reports` / `pet-report-management` / `recommendation-mapping` → `#report-center`；`excel-import` → `#detection-records`。

### 仍未覆盖的浏览器交互

- B：补录表单填写、逐菌门点「确认」、提交时警告确认框
- C：退回/发布的 prompt 与警告确认框（未在 Chrome 点按钮）
- D：创建更正草稿 prompt、改值表单、运行分析按钮、重新确认
- E：工作台「提交审核」点击（数据路径已走 store）
- F：报告中心「更多 → 作废」prompt
- G：分析规则页表单 UI 新建（只验了 store API + 页面无工作台文案）
- H：菌门 tab / 分析·建议 tab 点击切换、科普弹窗打开
- I：科普页保存按钮、小程序「?」弹窗打开
- J：工作台「撤回」确认框、再打开送检管理页核对（store 已断言 status 未变）
- 商品选择器、命中排除/恢复、预览工作版/发布版切换

## 验证命令

```
cd docs/.vuepress/public/prototype
for f in shared/*.js admin/js/*.js mini-program/js/*.js; do node --check "$f"; done
node shared/mock-store-smoke.js          # 130 passed
node /tmp/issue06-walkthrough.js         # 79 passed
node /tmp/issue06-headless.js            # Headless checks passed
```
