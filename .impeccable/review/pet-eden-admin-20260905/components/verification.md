# BasicTable + Modal 组件验收

隔离页：`http://127.0.0.1:8765/.impeccable/review/pet-eden-admin-20260905/components/basic-table-modal-test.html`

## 静态检查

| 命令 | 结果 |
| --- | --- |
| `node --check` admin-basic-table.js / admin-modal.js / admin-common.js | 通过 |
| `git diff --check`（上述 4 个产物文件） | 通过 |

## 浏览器（Chrome + Playwright）

```bash
NODE_PATH=~/.npm/_npx/420ff84f11983ee5/node_modules \
  node .impeccable/review/pet-eden-admin-20260905/components/browser-test.js
```

| 断言 | 结果 |
| --- | --- |
| 搜索 / 重置 / 分页 / 隐藏列 / 全屏 | 15/15 通过 |
| 空态 / 错误+重试 | 通过 |
| 异步竞态（慢后快，快结果保留） | 通过 |
| 双实例 tab 归属（ownerTabId） | 通过 |
| Modal 焦点环 / 失败保留输入 | 通过 |

截图：`screenshots/component-test-1440.png`、`component-test-390.png`  
明细：`test-results.json`
