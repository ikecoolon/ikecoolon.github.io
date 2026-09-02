/*
 * 项目进度管理 · 唯一数据源
 * 维护方式：只需修改任务的 progress / status / startWeek / endWeek，
 * 以及前置事项的 status / expectedWeek，页面所有统计自动重算。
 * 约定：8 小时 = 1 人日，每周 5 个工作日，缓冲率 20% 单独计算。
 * progress 为人工填写的 0-100 整数；progress = 100 自动视为已完成。
 * 范围待确认与甲方前置事项不参与工作量与进度统计。
 *
 * 待甲方预备：14 条 prerequisites（账号与资质 5 / 技术资源 3 / 合规发布 2 / 微信支付 4）。
 * active=true 表示当前适用，共 10 条；active=false 为条件项（4 条），条件成立时改 active=true 再维护 status。
 * 顶部「待甲方预备」只统计 active=true 且 status≠complete；条件项显示「条件待确认」，不计入欠缺。
 * 维护前置事项：status（incomplete/complete）、expectedWeek、active（条件成立时）。
 *
 * 口径：1 前端 + 1 后端并行；每人带 AI 辅助；估期含联调、不含自测。
 * 基于 pet-eden 成熟框架（管理端壳、登录权限、文件、商城已有），只估健康报告增量；商城不改造。
 *
 * 分组小计（人日）：产品设计 2 / PC 管理端 18 / 小程序 8 / 后端 16 / 部署 5，合计 49 人日（392 人时）。
 * 含 20% 缓冲：9.8 人日（78.4 人时），总计 58.8 人日（470.4 人时）。
 */
window.PROJECT_PROGRESS_DATA = {
  meta: {
    title: '项目进度管理',
    hoursPerWorkday: 8,
    // 发布默认工作周口径（仅允许 5 或 6）；页面优先读取 URL ?workdays=5|6，无效值回退 5。
    workdaysPerWeek: 5,
    // 每个计划周固定承载的基准工作日数（只读，不随顶栏 5/6 天单选变化）。
    planWorkdaysPerWeek: 5,
    bufferRate: 0.2,
    devStartWeek: 1,
    devEndWeek: 9,
    bufferStartWeek: 10,
    bufferEndWeek: 11,
    totalWeeks: 11,
    // 可选：直接填写 YYYY-MM-DD 作为全站默认项目开始日期；留空表示尚未设定，页面保持相对周次。
    // URL 查询参数 ?start=YYYY-MM-DD 优先级高于此字段。
    projectStartDate: ''
  },
  lanes: [
    { id: 'product', name: '产品' },
    { id: 'frontend', name: '前端' },
    { id: 'backend', name: '后端' },
    { id: 'deploy', name: '部署' },
    { id: 'external', name: '待甲方预备' }
  ],
  tasks: [
    // 产品设计（1 条，2 人日）
    { id: 'pd-01', lane: 'product', group: '产品设计', name: '产品设计', owner: '产品经理', workdays: 2, startWeek: 1, endWeek: 1, progress: 100, status: 'done' },

    // 前端 · PC 管理端（14 条，18 人日）
    { id: 'adm-01', lane: 'frontend', group: '前端 · PC 管理端', name: '管理端菜单与权限接入（登录复用框架）', owner: '前端工程师', workdays: 0.5, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['be-01'] },
    { id: 'adm-02', lane: 'frontend', group: '前端 · PC 管理端', name: '送检登记、队列与筛选', owner: '前端工程师', workdays: 1.5, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['adm-01', 'be-03'] },
    { id: 'adm-03', lane: 'frontend', group: '前端 · PC 管理端', name: 'Excel 导入与异常反馈', owner: '前端工程师', workdays: 1, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['adm-02', 'be-04'] },
    { id: 'adm-04', lane: 'frontend', group: '前端 · PC 管理端', name: '报告中心多状态队列与操作入口', owner: '前端工程师', workdays: 1.5, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['adm-01', 'be-06'] },
    { id: 'adm-05', lane: 'frontend', group: '前端 · PC 管理端', name: '工作台：来源归属、检测结果、综合评定与菌门分析', owner: '前端工程师', workdays: 3, startWeek: 2, endWeek: 3, progress: 0, status: 'not-started', dependencyIds: ['adm-04', 'be-05', 'be-08'] },
    { id: 'adm-06', lane: 'frontend', group: '前端 · PC 管理端', name: '工作台：报告侧商品关联（调用商城只读接口）', owner: '前端工程师', workdays: 1, startWeek: 3, endWeek: 3, progress: 0, status: 'not-started', dependencyIds: ['adm-05', 'be-09'] },
    { id: 'adm-07', lane: 'frontend', group: '前端 · PC 管理端', name: '小程序实时预览与双向定位', owner: '前端工程师', workdays: 1.5, startWeek: 3, endWeek: 3, progress: 0, status: 'not-started', dependencyIds: ['adm-05'] },
    { id: 'adm-08', lane: 'frontend', group: '前端 · PC 管理端', name: '发布检查、版本记录与提交撤回退回发布作废更正', owner: '前端工程师', workdays: 1.5, startWeek: 4, endWeek: 4, progress: 0, status: 'not-started', dependencyIds: ['adm-05', 'be-06'] },
    { id: 'adm-09', lane: 'frontend', group: '前端 · PC 管理端', name: '客户管理', owner: '前端工程师', workdays: 1, startWeek: 4, endWeek: 4, progress: 0, status: 'not-started', dependencyIds: ['adm-01', 'be-03'] },
    { id: 'adm-10', lane: 'frontend', group: '前端 · PC 管理端', name: '宠物档案', owner: '前端工程师', workdays: 1, startWeek: 4, endWeek: 4, progress: 0, status: 'not-started', dependencyIds: ['adm-09', 'be-03'] },
    { id: 'adm-11', lane: 'frontend', group: '前端 · PC 管理端', name: '专业字典与菌群分类树', owner: '前端工程师', workdays: 1, startWeek: 4, endWeek: 4, progress: 0, status: 'not-started', dependencyIds: ['adm-01', 'be-07'] },
    { id: 'adm-12', lane: 'frontend', group: '前端 · PC 管理端', name: '参考范围方案与导入', owner: '前端工程师', workdays: 1, startWeek: 4, endWeek: 5, progress: 0, status: 'not-started', dependencyIds: ['adm-11', 'be-07'] },
    { id: 'adm-13', lane: 'frontend', group: '前端 · PC 管理端', name: '菌群科普模板', owner: '前端工程师', workdays: 1, startWeek: 5, endWeek: 5, progress: 0, status: 'not-started', dependencyIds: ['adm-11', 'be-07'] },
    { id: 'adm-14', lane: 'frontend', group: '前端 · PC 管理端', name: '分析规则编辑、冲突提示与测试运行', owner: '前端工程师', workdays: 1.5, startWeek: 5, endWeek: 5, progress: 0, status: 'not-started', dependencyIds: ['adm-12', 'adm-13', 'be-08'] },

    // 前端 · 小程序（7 条，8 人日）
    { id: 'mp-01', lane: 'frontend', group: '前端 · 小程序', name: '微信登录与账号绑定', owner: '前端工程师', workdays: 1, startWeek: 5, endWeek: 5, progress: 0, status: 'waiting', dependencyIds: ['be-10'] },
    { id: 'mp-02', lane: 'frontend', group: '前端 · 小程序', name: '首页、宠物列表、我的与底栏导航', owner: '前端工程师', workdays: 1.5, startWeek: 5, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['mp-01', 'be-10'] },
    { id: 'mp-03', lane: 'frontend', group: '前端 · 小程序', name: '宠物详情、报告归集与处理中可见性', owner: '前端工程师', workdays: 1, startWeek: 6, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['mp-02', 'be-10'] },
    { id: 'mp-04', lane: 'frontend', group: '前端 · 小程序', name: '报告阅读：概览、对比与菌门详情', owner: '前端工程师', workdays: 2.5, startWeek: 6, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['mp-03', 'be-10'] },
    { id: 'mp-05', lane: 'frontend', group: '前端 · 小程序', name: '菌群科普弹层', owner: '前端工程师', workdays: 0.5, startWeek: 6, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['mp-04'] },
    { id: 'mp-06', lane: 'frontend', group: '前端 · 小程序', name: '推荐商品卡与商城跳转（不改商城）', owner: '前端工程师', workdays: 0.5, startWeek: 6, endWeek: 6, progress: 0, status: 'not-started', dependencyIds: ['mp-04', 'be-09'] },
    { id: 'mp-07', lane: 'frontend', group: '前端 · 小程序', name: '空态、无权限与真机适配', owner: '前端工程师', workdays: 1, startWeek: 7, endWeek: 7, progress: 0, status: 'waiting', dependencyIds: ['mp-01', 'mp-04', 'mp-06'] },

    // 后端（10 条，16 人日）
    { id: 'be-01', lane: 'backend', group: '后端', name: '接入现有鉴权、文件与报告模块骨架', owner: '后端工程师', workdays: 1, startWeek: 1, endWeek: 1, progress: 0, status: 'not-started' },
    { id: 'be-02', lane: 'backend', group: '后端', name: '健康报告领域模型与数据库迁移', owner: '后端工程师', workdays: 1.5, startWeek: 1, endWeek: 1, progress: 0, status: 'not-started', dependencyIds: ['be-01'] },
    { id: 'be-03', lane: 'backend', group: '后端', name: '送检、平台用户、宠物与关联历史服务', owner: '后端工程师', workdays: 1.5, startWeek: 1, endWeek: 1, progress: 0, status: 'not-started', dependencyIds: ['be-02'] },
    { id: 'be-04', lane: 'backend', group: '后端', name: 'Excel 解析与导入流水线', owner: '后端工程师', workdays: 2, startWeek: 1, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['be-01', 'be-02'] },
    { id: 'be-05', lane: 'backend', group: '后端', name: '报告事实、有效结果与工作草稿服务', owner: '后端工程师', workdays: 2, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['be-03', 'be-04'] },
    { id: 'be-06', lane: 'backend', group: '后端', name: '报告生命周期、发布快照与更正作废', owner: '后端工程师', workdays: 2, startWeek: 2, endWeek: 2, progress: 0, status: 'not-started', dependencyIds: ['be-05'] },
    { id: 'be-07', lane: 'backend', group: '后端', name: '菌群字典、科普与参考范围服务', owner: '后端工程师', workdays: 1.5, startWeek: 3, endWeek: 3, progress: 0, status: 'not-started', dependencyIds: ['be-02'] },
    { id: 'be-08', lane: 'backend', group: '后端', name: '分析规则版本与正式分析运行', owner: '后端工程师', workdays: 2, startWeek: 3, endWeek: 3, progress: 0, status: 'not-started', dependencyIds: ['be-05', 'be-07'] },
    { id: 'be-09', lane: 'backend', group: '后端', name: '报告侧商品关联与商城只读状态接口', owner: '后端工程师', workdays: 1, startWeek: 3, endWeek: 3, progress: 0, status: 'not-started', dependencyIds: ['be-05'] },
    { id: 'be-10', lane: 'backend', group: '后端', name: '小程序登录投影与报告查询接口', owner: '后端工程师', workdays: 1.5, startWeek: 3, endWeek: 4, progress: 0, status: 'not-started', dependencyIds: ['be-03', 'be-06'] },

    // 部署（6 条，5 人日；含联调，不含自测）
    { id: 'ops-01', lane: 'deploy', group: '部署', name: '服务器/运行环境/数据库', owner: '后端工程师', workdays: 1, startWeek: 1, endWeek: 1, progress: 0, status: 'waiting' },
    { id: 'ops-02', lane: 'deploy', group: '部署', name: '域名/HTTPS/小程序配置', owner: '后端工程师', workdays: 1, startWeek: 7, endWeek: 7, progress: 0, status: 'waiting' },
    { id: 'ops-03', lane: 'deploy', group: '部署', name: '初始化数据与迁移', owner: '后端工程师', workdays: 0.5, startWeek: 7, endWeek: 7, progress: 0, status: 'not-started', dependencyIds: ['ops-01'] },
    { id: 'ops-04', lane: 'deploy', group: '部署', name: '管理端、小程序与商城跳转联调', owner: '全员', workdays: 1, startWeek: 8, endWeek: 8, progress: 0, status: 'not-started', dependencyIds: ['ops-03'] },
    { id: 'ops-05', lane: 'deploy', group: '部署', name: '生产部署与监控', owner: '后端工程师', workdays: 1, startWeek: 9, endWeek: 9, progress: 0, status: 'waiting', dependencyIds: ['ops-02'] },
    { id: 'ops-06', lane: 'deploy', group: '部署', name: '验收与发布', owner: '全员', workdays: 0.5, startWeek: 9, endWeek: 9, progress: 0, status: 'not-started', dependencyIds: ['ops-04', 'ops-05'] }
  ],
  prerequisites: [
    {
      id: 'pre-mp-account',
      title: '小程序主体、管理员与 AppID/AppSecret',
      category: '账号与资质',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 1,
      status: 'incomplete',
      completionCriteria: '最终运营主体账号已注册；管理员可登录；AppID 已提供；AppSecret 仅通过安全方式交给后端；真实 code2Session 可调用',
      sourceLabel: '微信开放文档：开始',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html',
      affectedTaskIds: ['mp-01', 'mp-07', 'ops-04']
    },
    {
      id: 'pre-mp-certification',
      title: '微信认证状态',
      category: '账号与资质',
      requirementLevel: '条件项',
      condition: '本 AppID 支付或能力要求认证时',
      active: false,
      ownerRole: '甲方',
      expectedWeek: 1,
      status: 'incomplete',
      completionCriteria: '后台显示认证有效；若不需要认证，形成「不适用」结论及依据，不能长期显示为未完成',
      sourceLabel: '微信支付：开发接入准备',
      sourceUrl: 'https://pay.wechatpay.cn/doc/v3/merchant/4015459512',
      affectedTaskIds: ['mp-01', 'mp-07', 'ops-06']
    },
    {
      id: 'pre-mp-members',
      title: '开发者与体验成员权限',
      category: '账号与资质',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 1,
      status: 'incomplete',
      completionCriteria: '开发者能上传开发版；产品、测试和甲方验收人员能打开体验版；发布敏感权限只给指定人员',
      sourceLabel: '微信开放文档：协同工作和发布',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html',
      affectedTaskIds: ['mp-07', 'ops-04', 'ops-06']
    },
    {
      id: 'pre-mp-category',
      title: '服务类目与专项资质确认',
      category: '账号与资质',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 1,
      status: 'incomplete',
      completionCriteria: '类目与真实宠物微生物组报告功能已获平台确认；所需许可证、合作协议或承诺材料已上传并通过；未把「基因检测」类目直接套用为既定结论',
      sourceLabel: '微信开放文档：服务类目所需资质材料',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/product/material/',
      affectedTaskIds: ['mp-02', 'mp-03', 'mp-04', 'mp-07', 'ops-06']
    },
    {
      id: 'pre-mp-filing',
      title: '小程序备案',
      category: '账号与资质',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 1,
      status: 'incomplete',
      completionCriteria: '主体、负责人、专项材料与短信核验完成；后台取得小程序备案号',
      sourceLabel: '微信开放文档：小程序备案操作指引',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html',
      affectedTaskIds: ['mp-07', 'ops-06']
    },
    {
      id: 'pre-server',
      title: '测试/生产服务器、数据库与运维联系人',
      category: '技术资源',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 1,
      status: 'incomplete',
      completionCriteria: '可公网访问的环境和数据库已交付；技术联系人明确；具备部署、日志、备份和恢复所需权限',
      sourceLabel: '微信开放文档：网络',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html',
      affectedTaskIds: ['ops-01', 'ops-04', 'ops-05']
    },
    {
      id: 'pre-domain',
      title: '域名、ICP、DNS 与 HTTPS',
      category: '技术资源',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 6,
      status: 'incomplete',
      completionCriteria: '域名可控；ICP 备案可查；DNS 指向目标环境；HTTPS 证书有效、域名匹配、链完整',
      sourceLabel: '微信开放文档：网络',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html',
      affectedTaskIds: ['ops-02', 'ops-04', 'ops-05']
    },
    {
      id: 'pre-mp-server-domains',
      title: '小程序服务器域名配置',
      category: '技术资源',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 6,
      status: 'incomplete',
      completionCriteria: 'request 合法域名已配置并真机验证；按实际功能补充 downloadFile，仅在确有上传/Socket 时补充对应域名',
      sourceLabel: '微信开放文档：网络',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html',
      affectedTaskIds: ['mp-01', 'mp-02', 'mp-03', 'mp-04', 'mp-05', 'mp-06', 'mp-07', 'ops-02', 'ops-04']
    },
    {
      id: 'pre-mp-privacy',
      title: '隐私保护指引与用户权利联系人',
      category: '合规发布',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 6,
      status: 'incomplete',
      completionCriteria: '个人信息清单、用途、保存期限、第三方、删除/更正渠道、联系方式已确认；后台指引与提审代码实际接口一致并通过审核',
      sourceLabel: '微信开放文档：用户隐私保护指引填写说明',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/',
      affectedTaskIds: ['mp-01', 'mp-02', 'mp-03', 'mp-07', 'ops-06']
    },
    {
      id: 'pre-mp-review',
      title: '审核资料、测试账号与发布负责人',
      category: '合规发布',
      requirementLevel: '仅上线前核验',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 8,
      status: 'incomplete',
      completionCriteria: '名称/头像/简介/类目一致；审核人员可通过测试账号或测试数据体验宠物与完整报告；无测试占位；提审和发布负责人已确认',
      sourceLabel: '微信开放文档：常见拒绝情形',
      sourceUrl: 'https://developers.weixin.qq.com/miniprogram/product/reject.html',
      affectedTaskIds: ['mp-02', 'mp-03', 'mp-04', 'mp-07', 'ops-04', 'ops-06']
    },
    {
      id: 'pre-pay-path',
      title: '商城支付承接方式确认',
      category: '微信支付',
      requirementLevel: '必需',
      active: true,
      ownerRole: '甲方',
      expectedWeek: 1,
      status: 'incomplete',
      completionCriteria: '书面确认「同 AppID 复用商城支付 / 跳转独立商城小程序 / 新增当前 AppID 直接支付」之一，并记录目标商城 AppID 和商户号；范围与产品设计一致',
      sourceLabel: '本项目业务设计',
      sourceUrl: 'https://ikecoolon.github.io/docs/product-design/pet-health-report-business-design.html',
      affectedTaskIds: ['mp-06', 'mp-07', 'ops-04', 'ops-06']
    },
    {
      id: 'pre-pay-merchant',
      title: '商户号与 JSAPI/小程序支付权限',
      category: '微信支付',
      requirementLevel: '条件项',
      condition: '本 AppID 直接支付',
      active: false,
      ownerRole: '甲方',
      expectedWeek: 1,
      status: 'incomplete',
      completionCriteria: '新申请：入驻、账户验证、审核、签约和权限开通完成；复用：现有商户号主体、费率、风险状态、JSAPI 权限核验通过，不重复申请',
      sourceLabel: '微信支付：开发接入准备',
      sourceUrl: 'https://pay.wechatpay.cn/doc/v3/merchant/4015459512',
      affectedTaskIds: ['mp-06', 'mp-07', 'ops-04']
    },
    {
      id: 'pre-pay-binding-security',
      title: '商户号绑定 AppID 与支付安全参数',
      category: '微信支付',
      requirementLevel: '条件项',
      condition: '本 AppID 直接支付',
      active: false,
      ownerRole: '甲方',
      expectedWeek: 6,
      status: 'incomplete',
      completionCriteria: '当前 AppID 绑定已由双方后台确认；技术账号已配置；商户 API 私钥/证书、序列号、APIv3 密钥及微信支付公钥方案安全交付，未进入前端或公开仓库',
      sourceLabel: '微信支付：开发必要参数说明',
      sourceUrl: 'https://pay.wechatpay.cn/doc/v3/merchant/4013070756',
      affectedTaskIds: ['mp-06', 'mp-07', 'ops-04', 'ops-05']
    },
    {
      id: 'pre-pay-callback-test',
      title: '支付回调与真实支付退款闭环',
      category: '微信支付',
      requirementLevel: '条件项',
      condition: '本 AppID 直接支付',
      active: false,
      ownerRole: '甲方',
      expectedWeek: 8,
      status: 'incomplete',
      completionCriteria: '公网 HTTPS 支付/退款通知可达；防火墙/WAF 不拦截；真实小额支付、查单、支付通知、退款、退款通知/查询全部通过并留存结果',
      sourceLabel: '微信支付：支付成功回调',
      sourceUrl: 'https://pay.wechatpay.cn/doc/v3/merchant/4012791902',
      affectedTaskIds: ['mp-06', 'mp-07', 'ops-04', 'ops-05', 'ops-06']
    }
  ],
  pendingScopes: [
    { id: 'scope-core', title: '报告核心模块最低范围', note: '确认后重新评估并更新当前计划。' },
    { id: 'scope-mp-home', title: '小程序默认首页', note: '确认后重新评估并更新当前计划。' },
    { id: 'scope-recommend', title: '推荐卡片形式 / 候选数量 / 排序', note: '确认后重新评估并更新当前计划。' },
    { id: 'scope-baseline', title: '微生物组对比基准', note: '确认后重新评估并更新当前计划。' },
    { id: 'scope-audit', title: '有效检测结果修改留痕', note: '确认后重新评估并更新当前计划。' }
  ]
};
