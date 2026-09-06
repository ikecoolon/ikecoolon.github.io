---
name: Pet Eden Admin
description: 沿用 Rondo 的浅色、紧凑、标准管理端设计，仅适用于 admin。
colors:
  primary: "#0960bd"
  primary-hover: "#2080d8"
  primary-active: "#074d96"
  danger: "#ff4d4f"
  success: "#52c41a"
  warning: "#faad14"
  text: "rgba(0, 0, 0, 0.88)"
  text-secondary: "rgba(0, 0, 0, 0.65)"
  text-tertiary: "rgba(0, 0, 0, 0.45)"
  border: "#d9d9d9"
  border-secondary: "#f0f0f0"
  bg-layout: "#f5f5f5"
  bg-container: "#ffffff"
  bg-subtle: "#fafafa"
  sider-bg: "#001529"
  sider-submenu-bg: "#000c17"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
  title:
    fontSize: "18px"
    fontWeight: 600
  section-title:
    fontSize: "15px"
    fontWeight: 600
  modal-title:
    fontSize: "16px"
    fontWeight: 600
  label:
    fontSize: "13px"
    fontWeight: 500
  caption:
    fontSize: "12px"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "12px"
rounded:
  control: "6px"
  container: "8px"
  tag: "4px"
spacing:
  compact: "4px"
  control-gap: "8px"
  group-gap: "12px"
  content-padding: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg-container}"
    rounded: "{rounded.control}"
    padding: "4px 15px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.bg-container}"
  button-default:
    backgroundColor: "{colors.bg-container}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "4px 15px"
  input:
    backgroundColor: "{colors.bg-container}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "4px 11px"
  panel:
    backgroundColor: "{colors.bg-container}"
    rounded: "{rounded.container}"
    padding: "{spacing.content-padding}"
  tag-default:
    backgroundColor: "{colors.bg-layout}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.tag}"
    padding: "2px 8px"
  application-tab:
    backgroundColor: "{colors.bg-subtle}"
    textColor: "{colors.text-secondary}"
    padding: "0 12px"
    height: "38px"
  application-tab-active:
    backgroundColor: "{colors.bg-container}"
    textColor: "{colors.primary}"
  sidebar:
    width: "224px"
  header:
    height: "50px"
---

# Design System: Pet Eden Admin

## Overview

**Creative North Star: "熟悉的 Rondo 浅色后台"**

保留 Pet Eden 品牌，以标准导航、紧凑表单和 BasicTable 帮助运营完成送检、编制与审核。蓝色标识主动作和当前上下文，白色内容容器与浅灰工作区建立层次。

本规范仅作用于 `docs/.vuepress/public/prototype/admin/` 的管理界面。工作台内的小程序预览及 `mini-program/` 保持自己的等级主题和样式，不继承本规范。静态 HTML / JavaScript 复现真实 Rondo 的可见契约，不要求引入 Vue 或替换技术栈。

**Key Characteristics:**

- 标准、紧凑、一致。
- 浅色工作区与蓝色主动作。
- 搜索、表格与编辑上下文分层。

来源：`admin/css/tokens.css`、`shell.css`、`components.css`；输入焦点补充来自 `admin/css/antd-prototype.css`。业务与组件选型以 [实施方案](docs/product-design/pet-health-admin-implementation-plan.md) 为准，页面方向见 [.impeccable surface](.impeccable/surfaces/docs-vuepress-public-prototype-admin-index-html.md)。这是设计规范，不是浏览器、真实接口或专业规则验收结论。

## Colors

主色沿用真实 Rondo 蓝色；中性色服务于阅读、边框与容器分层。

- Primary：`primary` 用于主按钮、选中页签与链接，交互变化使用对应 hover / active token。
- Neutral：`text` 为主要内容，`text-secondary` 为标签和辅助说明，`text-tertiary` 为次要元信息；`bg-container`、`bg-layout` 与 `bg-subtle` 分别用于内容、工作区、表头及轻量悬停。
- 边界：`border` 用于控件描边，`border-secondary` 用于卡片、分隔线和表格行。
- 语义：`danger`、`success`、`warning` 表达危险、成功和提示，不替代主操作色；状态始终配合文字。管理端状态色不定义小程序报告等级色。

## Typography

采用系统无衬线字体栈，中文沿系统回退；编号使用等宽字体。列表、输入与正文使用 `body`，页面标题使用 `title`，工具栏及表单分区使用 `section-title`，弹窗标题使用 `modal-title`，提示与分页使用 `caption`。表格列宽与省略承担密度控制，不以缩小整页字体容纳溢出。

## Layout

应用壳依次为侧栏、顶栏、页签与内容区；尺寸及内容间距见 frontmatter。标准列表遵循 `ListPage + BasicTable/useTable`：搜索卡、可换行工具栏、small 表格、分页。工具栏最小高度（56px），不锁死高度；搜索标签宽度（80px）。

PC 优先覆盖 1440、1280、1024px。共享搜索表单当前在 1280px 起切换三列，否则两列；既定组件契约为普通桌面两个条件加操作区、超宽三个条件加操作区，栅格间距（8px）。

640px 及以下的搜索表单使用单列、上置标签，标签保持自然行高，不继承桌面横排标签的 80px flex basis；控件填满字段宽度。Modal 的单行输入保持 32px，多行输入才使用至少 80px 高度。旧页面使用的 `--rondo-*` 兼容别名集中映射至既有 Ant tokens，不另设一套颜色或圆角。

壳在 768px 及以下取消内容的侧栏占位，侧栏宽度为 `min(280px, 85vw)`。窄屏保留导航、查看、填写与保存。表格横向滚动限定在自身容器；工作台按可用容器宽度先收起预览，必要时收起模块导航，优先保证编辑区可用。

## Elevation & Depth

日常列表与搜索面板以白色底和细边框分层；列配置、下拉菜单及 Modal 使用 `--ant-shadow-secondary`。`--ant-shadow` 为已有轻阴影 token；两种精确值存于 sidecar。表格固定操作列用局部阴影提示滚动边界。活动页签以内嵌顶部色线表达当前位置，键盘焦点使用可见内嵌描边。

## Shapes

控件使用 `control` 圆角，卡片和 Modal 使用 `container` 圆角，轻量标签使用 `tag` 圆角。表单以清晰标签、细边框及紧凑内距构成；不得用整块装饰卡片替代标准字段、表格行或动作。

## Components

- 按钮：主要操作用实心蓝，次要操作用白底描边；小按钮高度（28px）。loading 降低透明度并阻止重复动作，失败保留输入。仅提供有行为及可访问名称的图标按钮。
- 输入：显式标签、标准边框及 `input` 内距；焦点通过主色边框和光圈表达。校验信息留在对应编辑上下文。
- 容器：搜索卡、表格卡及普通面板使用 `panel`；表格内层可独立滚动。表头内距（8px 12px）、数据单元格内距（10px 12px），行悬停使用浅色底，操作列固定在右侧。
- 标签：中性标签承载辅助状态，更正等副标签附属于主状态，不生成额外主状态。
- 导航：侧栏承载主要业务入口；复杂详情和编辑进入内部路由及页签。活动页签使用主色文字、白底及顶部线；未保存状态以星号提示。
- Modal：简单 CRUD 使用标准弹窗，正文可滚动，底部动作始终可达；中号最大宽度（480px）、大号（720px）。焦点进入、约束、恢复与统一关闭防丢属于组件契约。

## Do's and Don'ts

- Do 沿用 Pet Eden 品牌和真实 Rondo 的标准组件语义。
- Do 使用 ListPage + BasicTable/useTable 可见契约并保留表格容器内滚动。
- Do 用共享 tokens 和显式组件类统一静态及动态节点。
- Don't 引入 VXE 表格规范或重建一套管理端视觉语言。
- Don't 让管理端样式覆盖小程序预览或 mini-program 等级主题。
- Don't 将本设计规范或旧 review 的通过声明当作本次验收证据。
