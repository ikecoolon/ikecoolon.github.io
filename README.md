# 营会中心产品资料库

`product/camp-center` 分支独立维护营会中心的产品资料、每轮需求和静态交互原型。当前为初始骨架，具体功能与业务规则将在后续需求中确认。

## 目录

```text
PRODUCT.md                               产品定位与待确认边界
docs/README.md                           文档站首页
docs/requirements/<专题>/README.md       每轮需求的一篇 PRD
docs/prototypes/README.md                当前可评审原型目录
docs/.vuepress/public/prototypes/        静态原型
docs/rules/                              PRD 与原型写法
```

## 本地预览

要求 Node.js 18 或更高版本。

```sh
npm install
npm run docs:dev
```

本地站点地址：`http://localhost:8081/`；原型目录：`http://localhost:8081/prototypes/`。

构建检查：

```sh
npm run docs:build
```

新增需求时，先按 [PRD 写法](docs/rules/prd.md)建立专题文档，再将可访问的原型入口放在正文顶部。需要原型时，按[原型维护规则](docs/rules/prototype.md)在对应端和能力下增补。

当前站点只配置本地预览；发布前需要确认目标网址，并同步调整 `docs/.vuepress/config.js` 的 `hostname`。此初始化不包含会覆盖其他产品页面的部署脚本。
