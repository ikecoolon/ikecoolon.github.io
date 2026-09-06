# 管理端逐页视觉收尾复核 · 2026-09-06

**模式：** 只读独立复核（图像工具逐帧查看 + `final/report.json` / 契约结果交叉核对）  
**契约：** `DESIGN.md`（Rondo 标准紧凑后台；`mini-program/` 独立主题，不继承 admin 规范）  
**证据源：** `final/screenshots/`（25 状态 × 1440/1024/390 = 75 图）、`final/report.json`、`tokens/`、`controls/`、`remaining-css/`  
**未执行：** 全矩阵重跑、VuePress build、新启服务（沿用既有 `:8766` 产出）

---

## 1. 总结论

**条件 Ship（原型视觉范围）。**

对 25 个目标状态逐一图像复核：7 侧栏列表页、参考范围/规则 edit·test、用户/宠物详情与宠物档案视图、三 Modal、资料两分类 Tab、报告工作台六模块，桌面与 390 代表帧均符合 Rondo 浅色紧凑后台可见契约（侧栏深色、白底内容区、控件细边框、状态 Tag 中文展示、表格容器内滚动）。自动化：`final/report.json` **546 passed / 3 failed / 31 skipped**；3 失败均为同一产品问题（`modal-user-create` 取消 dirty），样式断言与脚本侧均已通过。

**阻塞项（产品，非本轮视觉修源码）：** `modal-user-create` 打开即 dirty，点「取消」弹出确认层而非直接关闭——独立修复中，本报告不重复实现要求。

**证据帧说明：**

| 证据集 | 时刻 | 圆角/Token | 用途 |
| --- | --- | --- | --- |
| `final/screenshots/*` | 2026-09-06 06:44–06:48 | **当前帧**；按钮/输入 `border-radius: 6px`（`--rondo-radius` → `--ant-radius`）与截图一致 | 本轮逐页结论主证据 |
| `page-style-audit/screenshots/*` | 更早跑批 | **旧帧**；token 别名补齐前部分按钮圆角未反映 | 仅作历史对比，**不得**替代 `final/` |
| `remaining-css/screenshots/search-*-390.png` | 契约专拍 | 当前帧；补证 390 搜索单列/标签上置/控件满宽 | 窄屏搜索布局补充 |

Token 契约：`tokens/tokens-contract-results.json` 全通过；`controls-contract-results.json` 抽检 `#mk-btn-save`、`#cancel-form` 等为 **6px** 圆角 + 1px 边框。

---

## 2. 复核方法

1. **7 菜单桌面（1440）：** 逐张图像查看侧栏高亮、页头/Tab、搜索区、表格 Tag/操作列、控件边框与圆角。
2. **7 菜单窄屏（390）：** 逐张查看汉堡壳、搜索单列、表格横向滚动、操作可达性；`remaining-css` 补证搜索字段布局。
3. **18 内部状态：** 各取 ≥1 张代表图（多数为 1440；Modal 含 390）。
4. **判定边界：** 仅记录真实布局/样式/阻挡任务缺陷；不把个人审美重设计、Mock 文案、原型黄条说明计为缺陷。
5. **限制：** 图像描述无法像素级度量溢出；对「无横向溢出」结论以自动化断言 + 可见截断/滚动行为为准，不冒充像素级检测。

---

## 3. 二十五状态清单（证据图 + 结论）

路径均相对于 `final/screenshots/`。视口未注明时为 **1440** 代表帧。

### 3.1 七侧栏菜单

| # | 状态 ID | 证据图 | 视觉观察 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | `menu-detection-records` | `menu-detection-records-1440.png`；390：`menu-detection-records-390.png` | 待导入/异常/全部 Tab、关键词搜索、登记送检、状态 Tag「待导入结果」、行内「导入结果」；控件有边框；390 汉堡壳、搜索单列，表内「机构」列随容器截断可横滚 | **ship** |
| 2 | `menu-report-center` | `menu-report-center-1440.png`；390：`menu-report-center-390.png` | 状态 chips、双字段搜索+高级筛选、多状态 Tag（待完善/已发布/已退回/待审核）、行内完善/审核/处理更正；390 筛选与行操作仍可达 | **ship** |
| 3 | `menu-normal-range-config` | `menu-normal-range-config-1440.png`；390：`menu-normal-range-config-390.png` + `remaining-css/.../search-normal-range-config-390.png` | 四条件搜索、状态列绿色「启用」Tag（非字面 HTML）、新增/导入；390 标签上置单列满宽 | **ship** |
| 4 | `menu-microbiota-knowledge` | `menu-microbiota-knowledge-1440.png`；390：`menu-microbiota-knowledge-390.png` | 左树右表单、输入/textarea 细边框、保存按钮圆角、预览区；390 树列表「已填」Tag 与搜索可用 | **ship** |
| 5 | `menu-analysis-rules` | `menu-analysis-rules-1440.png`；390：`menu-analysis-rules-390.png` | 规则库搜索、谱系/物种筛选、状态 Tag「当前启用/停用·归档」、行内编辑并测试；390 黄条+搜索卡无挤压破损 | **ship** |
| 6 | `menu-user-pets` | `menu-user-pets-1440.png`；390：`menu-user-pets-390.png` | 平台用户/宠物档案分段、登记平台用户入口、列表与查看链接；390 表头「可见报告」略截为「可见报…」，列内横滚可辨，不挡查看 | **ship** |
| 7 | `menu-dictionary-management` | `menu-dictionary-management-1440.png`；390：`menu-dictionary-management-390.png` | 品种字典 Tab、树形缩进为样式非 `&nbsp;` 字面量、类型 Tag「大类/子品种」、批量排序+新增；390 搜索占位略截断，功能可达 | **ship** |

### 3.2 参考范围 / 分析规则

| # | 状态 ID | 证据图 | 视觉观察 | 判定 |
| --- | --- | --- | --- | --- |
| 8 | `route-nrc-edit-new` | `route-nrc-edit-new-1440.png` | 新增方案表单、物种 checkbox、范围项表内 select/input 有边框、保存/取消按钮 6px 圆角 | **ship** |
| 9 | `route-ar-edit` | `route-ar-edit-1440.png` | 规则库/编辑子导航、判断句 builder 下拉有边框、分析/建议 textarea 可读 | **ship** |
| 10 | `route-ar-test` | `route-ar-test-1440.png` | 单报告测试实验室、报告/规则选择与「开始测试」主按钮、空态提示区 | **ship** |

### 3.3 用户与宠物

| # | 状态 ID | 证据图 | 视觉观察 | 判定 |
| --- | --- | --- | --- | --- |
| 11 | `route-up-user-detail` | `route-up-user-detail-1440.png` | 用户摘要卡、名下宠物卡、可见报告状态为中文「已发布」绿 Tag（非内部码 `published`） | **ship** |
| 12 | `route-up-pet-detail` | `route-up-pet-detail-1440.png` | 宠物字段网格、已发布报告表、关联变更空态 | **ship** |
| 13 | `route-up-pets-view` | `route-up-pets-view-1440.png` | 宠物档案 Tab 激活、多列筛选、6 行宠物列表与查看 | **ship** |

### 3.4 报告工作台

| # | 状态 ID | 证据图 | 视觉观察 | 判定 |
| --- | --- | --- | --- | --- |
| 14 | `route-report-review` | `route-report-review-1440.png` | 三栏：模块导航 + 来源与归属编辑 + 小程序预览（深色 mini 主题，与 admin 分离）；顶栏暂存/提交/作废、退回黄条 | **ship** |
| 20 | `wb-module-source` | `wb-module-source-1440.png` | 来源元数据、纠错区下拉/原因框有边框、预览列 Actinobacteria 缺列与黄条一致 | **ship** |
| 21 | `wb-module-results` | `wb-module-results-1440.png` | 检测结果列表+右侧编辑、缺列/有效 Tag、保存修改 | **ship** |
| 22 | `wb-module-assessment` | `wb-module-assessment-1440.png` | 综合评定表单字段、预览同步等级 C | **ship** |
| 23 | `wb-module-analysis` | `wb-module-analysis-1440.png` | 分析与建议卡片、运行分析、未确认 Tag、草稿/确认 | **ship** |
| 24 | `wb-module-recommendations` | `wb-module-recommendations-1440.png` | 商品推荐按菌门卡片、主品/关联品选择入口 | **ship** |
| 25 | `wb-module-checks` | `wb-module-checks-1440.png` | 发布检查阻断/警告列表、与模块角标数字一致 | **ship** |

### 3.5 Modal 与资料分类 Tab

| # | 状态 ID | 证据图 | 视觉观察 | 判定 |
| --- | --- | --- | --- | --- |
| 15 | `modal-detection-register` | `modal-detection-register-1440.png`；390：`modal-detection-register-390.png` | 登记送检 Modal、单选/下拉/日期有边框、底栏取消/确认；390 居中无整页溢出 | **ship** |
| 16 | `modal-user-create` | `modal-user-create-1440.png`；390：`modal-user-create-390.png` | **视觉：** Modal 表单、输入边框与 6px 圆角正常；390 Tab 带 `*` dirty 标记。**行为：** 未编辑点取消仍触发确认层（`report.json` 3 failed） | **fix**（产品；独立修复中） |
| 17 | `modal-dict-add-key` | `modal-dict-add-key-1440.png` | 新增品种 Modal、编码 Key 焦点蓝框、单行高度正常（非 80px 误高） | **ship** |
| 18 | `dict-tab-indicators` | `dict-tab-indicators-1440.png` | 普通检测指标 Tab、类型 Tag「普通指标」、编辑/删除 | **ship** |
| 19 | `dict-tab-microbiota` | `dict-tab-microbiota-1440.png` | 菌群分类树 Tab、层级缩进、类型 Tag「门/属」 | **ship** |

---

## 4. 七菜单 390 窄屏汇总

| 菜单 | 证据图 | 壳层 | 搜索区 | 表格/内容 | 判定 |
| --- | --- | --- | --- | --- | --- |
| 送检管理 | `menu-detection-records-390.png` | 汉堡 + 顶栏标题 | 单列关键词 + 查询/重置 | 表横滚；机构列截断属容器滚动 | ship |
| 报告中心 | `menu-report-center-390.png` | 同上 | 双字段竖排 + 高级筛选链 | 行内完善/更多可达 | ship |
| 指标/参考范围 | `menu-normal-range-config-390.png` | 同上 | 四字段标签上置单列（`remaining-css` 补证） | 操作列编辑/复制/删除可见 | ship |
| 菌群科普 | `menu-microbiota-knowledge-390.png` | 同上 | 树内搜索 | 分类树 + 已填 Tag；编辑表单在树选节点后同页下半（本帧为树视图） | ship |
| 分析规则 | `menu-analysis-rules-390.png` | 同上 | 搜索+两下拉竖排 | 新增规则 + 表头可见 | ship |
| 用户与宠物 | `menu-user-pets-390.png` | 同上 | 关键词+名下宠物竖排 | 列头略截断；查看链接可达 | ship |
| 专业基础资料 | `menu-dictionary-management-390.png` | 同上 | 搜索单列 | 品种表序号/Key/操作可见 | ship |

自动化对 390「搜索宽度」多项记 **skip**（无双列压缩场景或无搜索区），与目视「单列/无挤压」一致，不记为失败。

---

## 5. 必须修复项（阻塞 Ship 完整闭环）

| 严重度 | 状态 | 控件/区域 | 证据 | 说明 | 建议 |
| --- | --- | --- | --- | --- | --- |
| **产品** | `modal-user-create` | Modal 底栏「取消」；Tab dirty `*` | `modal-user-create-1440.png`、`modal-user-create-390.png`（Tab 可见 `*`）；`report.json` ×3 failed | `openCreateUserModal` 打开前 `setDirty(true)`，未编辑即 dirty | **fix**（独立进行中，非本轮视觉改源码） |

**非阻塞备注（不计 fix）：**

| 项 | 证据 | 说明 |
| --- | --- | --- |
| `menu-detection-records@1440` 控制台 404 | `report.json` `consoleErrors` | 单资源 404；截图布局未受影响 |
| 390 表头/列文本截断 | `menu-detection-records-390.png`、`menu-user-pets-390.png` | 表格容器内横滚预期行为，操作仍可达 |
| `page-style-audit/screenshots/*-error.png` | 旧跑批 | **旧帧**；以 `final/` 为准 |
| `remaining-css/.../search-detection-records-390.png` 侧栏展开 | 契约专拍（侧栏未收） | 仅用于搜索字段度量；用户态窄屏以 `final/` 汉堡壳为准 |

---

## 6. Rondo 契约抽检（目视 + 契约）

| 项 | 期望 | 证据 | 判定 |
| --- | --- | --- | --- |
| 壳层 | 深色侧栏 + 白/灰内容区 | 七菜单 1440 全系 | OK |
| 控件圆角 | `control` = 6px | `tokens.css`；`controls-contract`；`final/*` 主/次按钮 | OK（**当前帧**） |
| 输入边框 | 可见 1px 灰边 | 菌群科普、规则编辑、三 Modal、`controls-contract` | OK |
| 状态 Tag | 中文 ant-tag，无字面 `<span>` | 参考范围/规则/报告中心/送检；`report.json` literalSpan=0 | OK |
| 资料树 | 缩进为样式，类型为 Tag | `menu-dictionary-management-1440.png`、`dict-tab-microbiota-1440.png` | OK |
| 工作台 mini 预览 | 独立深色主题，不污染 admin | `route-report-review-1440.png`、`wb-module-*-1440.png` | OK |
| 窄屏搜索 | 390 单列、标签上置 | `remaining-css-contract-results.json` + 七菜单 390 图 | OK |

---

## 7. 验收边界

**本轮已验收：**

- 25 状态各 ≥1 张代表截图的逐页目视结论（上表）
- 七侧栏菜单 1440 桌面 + 390 窄屏全套（21 图）
- 参考范围 edit、规则 edit/test、用户/宠物详情、登记/新增 Modal、资料两 Tab、工作台六模块代表图
- Token/控件圆角与边框契约与 `final/` 帧一致性

**本轮未声称：**

- 75 图逐张像素级溢出扫描（依赖自动化 + 代表帧目视）
- `modal-user-create` 取消行为修复（独立任务）
- 全站 a11y / 生产 API / VuePress build 重跑
- 修改业务源码或提交

**最终判定：**

- 除 `modal-user-create` 取消 dirty 外，**24/25 状态视觉 ship**
- 完整产品闭环：**条件 ship**，待 `modal-user-create` fix 合并后升为 **ship**

---

## 复核签名

- **执行：** 图像工具查看 `final/screenshots/` 75 图 + `remaining-css/screenshots/` 窄屏补证 + 只读 `report.json`/契约 JSON
- **日期：** 2026-09-06
- **改动范围：** 仅本文件；未改源码、未 commit、未启新服务
