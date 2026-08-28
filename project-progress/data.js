/*
 * 项目进度管理 · 唯一数据源
 * 维护方式：只需修改任务的 progress / status / startWeek / endWeek，
 * 以及前置事项的 status / expectedWeek，页面所有统计自动重算。
 * 约定：8 小时 = 1 人日，每周 5 个工作日，缓冲率 20% 单独计算。
 * progress 为人工填写的 0-100 整数；progress = 100 自动视为已完成。
 * 范围待确认与甲方前置事项不参与工作量与进度统计。
 */
window.PROJECT_PROGRESS_DATA = {
  meta: {
    title: '项目进度管理',
    hoursPerWorkday: 8,
    workdaysPerWeek: 5,
    bufferRate: 0.2,
    devStartWeek: 1,
    devEndWeek: 9,
    bufferStartWeek: 10,
    bufferEndWeek: 11,
    totalWeeks: 11
  },
  lanes: [
    { id: 'product', name: '产品' },
    { id: 'frontend', name: '前端' },
    { id: 'backend', name: '后端' },
    { id: 'deploy', name: '部署' },
    { id: 'external', name: '甲方筹备' }
  ],
  tasks: [
    // 产品设计（1 条，4 人日）
    { id: 'pd-01', lane: 'product', group: '产品设计', name: '产品设计', owner: '产品经理', workdays: 4, startWeek: 1, endWeek: 1, progress: 100, status: 'done' },

    // 前端 · PC 管理端（8 条，22 人日）
    { id: 'adm-01', lane: 'frontend', group: '前端 · PC 管理端', name: '管理端基础框架与登录', owner: '前端工程师', workdays: 2, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started' },
    { id: 'adm-02', lane: 'frontend', group: '前端 · PC 管理端', name: '报告中心', owner: '前端工程师', workdays: 3, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['adm-01'] },
    { id: 'adm-03', lane: 'frontend', group: '前端 · PC 管理端', name: 'Excel 导入与结果反馈', owner: '前端工程师', workdays: 2, startWeek: 3, endWeek: 3, progress: 0, status: 'not-started', dependencyIds: ['adm-02'] },
    { id: 'adm-04', lane: 'frontend', group: '前端 · PC 管理端', name: '报告工作台', owner: '前端工程师', workdays: 5, startWeek: 3, endWeek: 4, progress: 0, status: 'not-started', dependencyIds: ['adm-02'] },
    { id: 'adm-05', lane: 'frontend', group: '前端 · PC 管理端', name: '小程序实时预览与字段定位', owner: '前端工程师', workdays: 2, startWeek: 4, endWeek: 5, progress: 0, status: 'not-started', dependencyIds: ['adm-04'] },
    { id: 'adm-06', lane: 'frontend', group: '前端 · PC 管理端', name: '用户与宠物关联', owner: '前端工程师', workdays: 2, startWeek: 5, endWeek: 5, progress: 0, status: 'not-started', dependencyIds: ['adm-01'] },
    { id: 'adm-07', lane: 'frontend', group: '前端 · PC 管理端', name: '专业配置（字典/范围/规则/推荐）', owner: '前端工程师', workdays: 4, startWeek: 5, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['adm-04'] },
    { id: 'adm-08', lane: 'frontend', group: '前端 · PC 管理端', name: '审核发布更正作废', owner: '前端工程师', workdays: 2, startWeek: 6, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['adm-07'] },

    // 前端 · 小程序（5 条，12 人日）
    { id: 'mp-01', lane: 'frontend', group: '前端 · 小程序', name: '微信登录接入', owner: '前端工程师', workdays: 2, startWeek: 7, endWeek: 7, progress: 0, status: 'waiting' },
    { id: 'mp-02', lane: 'frontend', group: '前端 · 小程序', name: '宠物与报告入口', owner: '前端工程师', workdays: 2, startWeek: 7, endWeek: 7, progress: 0, status: 'not-started' },
    { id: 'mp-03', lane: 'frontend', group: '前端 · 小程序', name: '报告阅读', owner: '前端工程师', workdays: 4, startWeek: 7, endWeek: 8, progress: 0, status: 'not-started', dependencyIds: ['mp-02'] },
    { id: 'mp-04', lane: 'frontend', group: '前端 · 小程序', name: '健康建议与商城跳转', owner: '前端工程师', workdays: 2, startWeek: 8, endWeek: 8, progress: 0, status: 'not-started', dependencyIds: ['mp-03'] },
    { id: 'mp-05', lane: 'frontend', group: '前端 · 小程序', name: '微信环境适配与发布验证', owner: '前端工程师', workdays: 2, startWeek: 9, endWeek: 9, progress: 0, status: 'waiting', dependencyIds: ['mp-01'] },

    // 后端（9 条，30 人日）
    { id: 'be-01', lane: 'backend', group: '后端', name: '基础框架/鉴权/文件服务', owner: '后端工程师', workdays: 3, startWeek: 1, endWeek: 1, progress: 0, status: 'not-started' },
    { id: 'be-02', lane: 'backend', group: '后端', name: '用户宠物报告关联', owner: '后端工程师', workdays: 3, startWeek: 1, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['be-01'] },
    { id: 'be-03', lane: 'backend', group: '后端', name: 'Excel 解析与导入', owner: '后端工程师', workdays: 4, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['be-01'] },
    { id: 'be-04', lane: 'backend', group: '后端', name: '报告生命周期与草稿', owner: '后端工程师', workdays: 4, startWeek: 3, endWeek: 3, progress: 0, status: 'not-started', dependencyIds: ['be-02'] },
    { id: 'be-05', lane: 'backend', group: '后端', name: '字典/检测项/参考范围', owner: '后端工程师', workdays: 3, startWeek: 3, endWeek: 4, progress: 0, status: 'not-started', dependencyIds: ['be-01'] },
    { id: 'be-06', lane: 'backend', group: '后端', name: '分析规则与重新计算', owner: '后端工程师', workdays: 4, startWeek: 4, endWeek: 4, progress: 0, status: 'not-started', dependencyIds: ['be-05'] },
    { id: 'be-07', lane: 'backend', group: '后端', name: '推荐映射', owner: '后端工程师', workdays: 2, startWeek: 5, endWeek: 5, progress: 0, status: 'not-started', dependencyIds: ['be-05'] },
    { id: 'be-08', lane: 'backend', group: '后端', name: '审核发布更正作废追溯', owner: '后端工程师', workdays: 4, startWeek: 5, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['be-04'] },
    { id: 'be-09', lane: 'backend', group: '后端', name: '小程序查询接口', owner: '后端工程师', workdays: 3, startWeek: 6, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['be-02'] },

    // 部署（6 条，12 人日）
    { id: 'ops-01', lane: 'deploy', group: '部署', name: '服务器/运行环境/数据库', owner: '后端工程师', workdays: 2, startWeek: 1, endWeek: 1, progress: 0, status: 'waiting' },
    { id: 'ops-02', lane: 'deploy', group: '部署', name: '域名/HTTPS/小程序配置', owner: '后端工程师', workdays: 2, startWeek: 7, endWeek: 7, progress: 0, status: 'waiting' },
    { id: 'ops-03', lane: 'deploy', group: '部署', name: '初始化数据与迁移', owner: '后端工程师', workdays: 2, startWeek: 7, endWeek: 7, progress: 0, status: 'not-started', dependencyIds: ['ops-01'] },
    { id: 'ops-04', lane: 'deploy', group: '部署', name: '联调与回归', owner: '全员', workdays: 3, startWeek: 8, endWeek: 8, progress: 0, status: 'not-started', dependencyIds: ['ops-03'] },
    { id: 'ops-05', lane: 'deploy', group: '部署', name: '生产部署与监控', owner: '后端工程师', workdays: 2, startWeek: 9, endWeek: 9, progress: 0, status: 'waiting', dependencyIds: ['ops-02'] },
    { id: 'ops-06', lane: 'deploy', group: '部署', name: '验收与发布', owner: '全员', workdays: 1, startWeek: 9, endWeek: 9, progress: 0, status: 'not-started', dependencyIds: ['ops-04', 'ops-05'] }
  ],
  prerequisites: [
    { id: 'pre-server', title: '服务器', ownerRole: '甲方 IT 负责人', expectedWeek: 1, status: 'incomplete', affectedTaskIds: ['ops-01'] },
    { id: 'pre-domain', title: '域名', ownerRole: '甲方 IT 负责人', expectedWeek: 6, status: 'incomplete', affectedTaskIds: ['ops-02'] },
    { id: 'pre-icp', title: 'ICP 备案', ownerRole: '甲方行政/法务', expectedWeek: 6, status: 'incomplete', affectedTaskIds: ['ops-02'] },
    { id: 'pre-mp-entity', title: '小程序主体与正确行业', ownerRole: '甲方业务负责人', expectedWeek: 6, status: 'incomplete', affectedTaskIds: ['mp-01'] },
    { id: 'pre-mp-verify', title: '小程序认证', ownerRole: '甲方业务负责人', expectedWeek: 6, status: 'incomplete', affectedTaskIds: ['mp-01', 'mp-05'] },
    { id: 'pre-wx-login', title: '微信授权登录能力', ownerRole: '甲方业务负责人', expectedWeek: 7, status: 'incomplete', affectedTaskIds: ['mp-01'] },
    { id: 'pre-wx-pay', title: '微信支付服务', ownerRole: '甲方财务/业务负责人', expectedWeek: 8, status: 'incomplete', affectedTaskIds: ['mp-04', 'mp-05'] }
  ],
  pendingScopes: [
    { id: 'scope-core', title: '报告核心模块最低范围', note: '确认后重新评估并更新当前计划。' },
    { id: 'scope-mp-home', title: '小程序默认首页', note: '确认后重新评估并更新当前计划。' },
    { id: 'scope-recommend', title: '推荐卡片形式 / 候选数量 / 排序', note: '确认后重新评估并更新当前计划。' },
    { id: 'scope-baseline', title: '微生物组对比基准', note: '确认后重新评估并更新当前计划。' },
    { id: 'scope-audit', title: '有效检测结果修改留痕', note: '确认后重新评估并更新当前计划。' }
  ]
};
