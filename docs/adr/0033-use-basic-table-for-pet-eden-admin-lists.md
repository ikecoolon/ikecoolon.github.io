# Pet Eden 管理端列表统一使用 BasicTable

Pet Eden 新增的管理端列表页统一采用 Rondo 现有兼容层的 `ListPage + BasicTable/useTable`，不采用商城新页面使用的 VXE Grid。静态原型不引入 Vue 组件，但搜索区、工具栏、表格、分页、状态与行操作必须按同一可见契约呈现，避免原型与后续真实实现使用两套页面结构。
