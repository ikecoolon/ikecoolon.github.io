# Session lifecycle 测试结果

- **命令**: `node .impeccable/review/pet-eden-admin-20260905/session/session-lifecycle.mjs`
- **依赖**: `/tmp/pet-eden-session-test` 内 `playwright@1.49.1`（系统 Chrome channel）
- **Fixture**: `.impeccable/review/pet-eden-admin-20260905/session/session-fixture.html`（真实 DOM + `admin-session.js`）
- **结果**: **18 passed, 0 failed**（详见 `session-results.json`）

覆盖项：

- canonical tab key（analysis-rules edit/test 同 lineage、report/user 实体隔离、strip source 参数）
- 同实体复用页签、切换保留 input
- 页签栏无嵌套 `button`
- dirty 关闭取消/确认、`closeOtherTabs` / `closeAllTabs` 防丢
- `onTabActivate` / `onTabDeactivate` 钩子
- deactivate 后后台 `tab.mount` 回调不再写入（`_sessionActive` 守卫）
