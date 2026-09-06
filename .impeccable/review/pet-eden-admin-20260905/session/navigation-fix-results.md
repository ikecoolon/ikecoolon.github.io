# Navigation fix 测试结果

- **命令**: `node .impeccable/review/pet-eden-admin-20260905/session/navigation-fix-test.mjs`
- **Base**: http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html
- **结果**: **13 passed, 0 failed**

- ✓ first report mounts via C.navigate — ok
- ✓ second report mounts via C.navigate (not empty shell) — ok
- ✓ two distinct report tabs — tab-1788575616430-1n6fo vs tab-1788575616579-2f1e0
- ✓ first report tab still has content after switch back — ok
- ✓ second report tab retains mounted content — ok
- ✓ same report entity reuses tab on module change
- ✓ module param applied before UI reads — module=source
- ✓ rapid C.navigate does not duplicate HTML fetch — fetches=1
- ✓ rapid navigate ends with single mounted workbench — true
- ✓ edit/test share one tab
- ✓ activate hook sees test mode after edit→test — {"tabCount":1,"lastMode":"test","domMode":"test","paramsMode":"test","mounts":{"tab-1788575619779-p8pxt":1}}
- ✓ DOM reflects test mode from params
- ✓ fixture single mount per tab — {"tab-1788575619779-p8pxt":1}
