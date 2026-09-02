# Pet Eden Wiki VAULT

当前 `product/pet-eden` 分支只服务宠物健康报告，所有 Wiki 操作固定使用同一个 VAULT：

- 本地路径：`/Users/zhaoyanlong/Documents/personal/pet-eden-wiki`
- GitHub 远程：`https://github.com/ikecoolon/pet-eden-wiki`

本产品文档仓库不是 Wiki VAULT，普通文档变更不会自动同步到 Wiki。

## Agent 操作顺序

执行 `inspool`、`query-wiki` 或 `lint-wiki` 前：

1. 进入 `/Users/zhaoyanlong/Documents/personal/pet-eden-wiki`。
2. 阅读目标 VAULT 的 `AGENTS.md`。
3. 阅读目标 VAULT 的 `wiki/index.md`。
4. 仅在该 VAULT 内查询、创建、更新或检查 Wiki 页面。

## Git 边界

产品文档仓库和 Wiki 仓库是两个独立 Git 仓库，分别执行 `commit` 与 `push`；提交其中一个不会同步另一个。

推送 Wiki 前，在 Wiki 工作目录运行远程核对，确认 `origin` 为 `https://github.com/ikecoolon/pet-eden-wiki`，再按目标 VAULT 的规则操作。
