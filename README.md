# 宠物健康报告文档工程

本地分支 `product/pet-eden` 固定服务宠物健康报告（Pet Eden），用于维护产品设计、PRD、架构决策、通用文档规范和静态交互原型；内容使用不含日期层级的稳定目录。

## 目录

- `CONTEXT.md`：领域语言与关键术语
- `PRODUCT.md`：产品边界、能力与原则
- `docs/product-design/`：业务设计、研究材料与待确认事项
- `docs/prd/`：管理端和小程序 PRD
- `docs/adr/`：架构决策记录
- `docs/rules/`：保留的通用产品文档规范
- `docs/.vuepress/public/prototype/`：可直接访问的静态交互原型
- `.scratch/`：本地规格与实施票据

## 本地开发

```sh
npm install
npm run docs:dev
```

构建站点：

```sh
npm run docs:build
```

## 发布

- `npm run deploy`：构建完整 VuePress 站点，并强制推送构建产物到 GitHub Pages 的 `main`。
- `npm run deploy-prototype`：直接发布 `docs/.vuepress/public/prototype/`，同样覆盖 Pages `main`。

发布脚本会在产物目录建立独立 Git 仓库。运行前应确认工作区变更、远程地址和待发布内容；日常文档分支不会由脚本自动提交或推送。

## Wiki

本仓库不是 Wiki VAULT。执行 `inspool`、`query-wiki` 或 `lint-wiki` 前，先阅读 `docs/agents/wiki.md`，再进入固定的 Pet Eden Wiki 仓库并遵守其 `AGENTS.md` 与 `wiki/index.md`。
