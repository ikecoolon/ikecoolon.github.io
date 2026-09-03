/*
 * 项目进度管理 · 唯一数据源
 * 维护分两条路径，详见 docs/rules/project-progress.md。
 *
 * 人员 profile（staffingProfiles）为排期、负责人与周次标尺唯一配置源；script.js 只派生展示。
 * 默认 profile：1fe（1 前端 + 1 后端）；可选 2fe（2 前端 + 1 后端）。URL ?staffing=1fe|2fe。
 *
 * 原型或业务设计更新：只改研发任务的 name / group / workdays；
 * 功能增删时允许增删任务，并为新任务在两个 profile 的 taskSchedules 中补齐 planStart / duration / owner。
 * 不得因原型更新改既有任务的 progress / status。
 *
 * 代码提交：只更新任务的 progress / status。progress 为 0-100 整数；progress = 100 自动视为已完成。
 * 前置事项仅在条件成立或甲方交付时改 status / expectedWeek / active。
 * 可选 meta.projectStartDate 设定默认开始日期。页面所有统计自动重算。
 *
 * 约定：8 小时 = 1 人日，每个计划周 5 个基准工作日，缓冲率 20% 单独计算（11.3 人日 / 90.4 人时）。
 * 范围待确认与甲方前置事项不参与工作量与进度统计。
 *
 * 待甲方预备：13 条 prerequisites（账号与资质 5 / 技术资源 3 / 合规发布 2 / 微信支付 3），均为未完成。
 * 实施方式：在现有商城小程序同一 AppID 内二次开发并复用商城交易能力；支付承接为技术结论，不作为甲方清单项。
 *
 * 分组小计（人日）：产品设计 8 / PC 管理端 18 / 小程序 9 / 后端 16 / 部署 5.5，合计 56.5 人日（452 人时）。
 * 含 20% 缓冲：11.3 人日（90.4 人时），总计 67.8 人日（542.4 人时）。
 */
window.PROJECT_PROGRESS_DATA = {
  "meta": {
    "title": "项目进度管理",
    "hoursPerWorkday": 8,
    "workdaysPerWeek": 5,
    "planWorkdaysPerWeek": 5,
    "bufferRate": 0.2,
    "defaultStaffing": "1fe",
    "projectStartDate": ""
  },
  "staffingProfiles": {
    "1fe": {
      "meta": {
        "devEndWeek": 9,
        "bufferStartWeek": 10,
        "bufferEndWeek": 11,
        "totalWeeks": 11,
        "bufferCalendarWeeks": 2
      },
      "taskSchedules": {
        "pd-01": {
          "owner": "产品经理",
          "planStart": 0,
          "duration": 2
        },
        "be-01": {
          "owner": "后端工程师",
          "planStart": 0,
          "duration": 1
        },
        "ops-01": {
          "owner": "后端工程师",
          "planStart": 1,
          "duration": 1
        },
        "be-02": {
          "owner": "后端工程师",
          "planStart": 2,
          "duration": 1.5
        },
        "be-03": {
          "owner": "后端工程师",
          "planStart": 3.5,
          "duration": 1.5
        },
        "be-04": {
          "owner": "后端工程师",
          "planStart": 5,
          "duration": 2
        },
        "be-05": {
          "owner": "后端工程师",
          "planStart": 7,
          "duration": 2
        },
        "be-06": {
          "owner": "后端工程师",
          "planStart": 9,
          "duration": 2
        },
        "be-07": {
          "owner": "后端工程师",
          "planStart": 11,
          "duration": 1.5
        },
        "be-08": {
          "owner": "后端工程师",
          "planStart": 12.5,
          "duration": 2
        },
        "be-09": {
          "owner": "后端工程师",
          "planStart": 14.5,
          "duration": 1
        },
        "be-10": {
          "owner": "后端工程师",
          "planStart": 15.5,
          "duration": 1.5
        },
        "ops-02": {
          "owner": "后端工程师",
          "planStart": 30,
          "duration": 1
        },
        "ops-03": {
          "owner": "后端工程师",
          "planStart": 31,
          "duration": 0.5
        },
        "ops-04": {
          "owner": "全员",
          "planStart": 37,
          "duration": 1.5
        },
        "ops-05": {
          "owner": "后端工程师",
          "planStart": 40,
          "duration": 1
        },
        "ops-06": {
          "owner": "全员",
          "planStart": 41,
          "duration": 0.5
        },
        "adm-01": {
          "owner": "前端工程师",
          "planStart": 5,
          "duration": 0.5
        },
        "adm-02": {
          "owner": "前端工程师",
          "planStart": 5.5,
          "duration": 1.5
        },
        "adm-03": {
          "owner": "前端工程师",
          "planStart": 7,
          "duration": 1
        },
        "adm-04": {
          "owner": "前端工程师",
          "planStart": 11,
          "duration": 1.5
        },
        "adm-05": {
          "owner": "前端工程师",
          "planStart": 14.5,
          "duration": 3
        },
        "adm-06": {
          "owner": "前端工程师",
          "planStart": 17.5,
          "duration": 1
        },
        "adm-07": {
          "owner": "前端工程师",
          "planStart": 18.5,
          "duration": 1.5
        },
        "adm-08": {
          "owner": "前端工程师",
          "planStart": 20,
          "duration": 1.5
        },
        "adm-09": {
          "owner": "前端工程师",
          "planStart": 21.5,
          "duration": 1
        },
        "adm-10": {
          "owner": "前端工程师",
          "planStart": 22.5,
          "duration": 1
        },
        "adm-11": {
          "owner": "前端工程师",
          "planStart": 23.5,
          "duration": 1
        },
        "adm-12": {
          "owner": "前端工程师",
          "planStart": 24.5,
          "duration": 1
        },
        "adm-13": {
          "owner": "前端工程师",
          "planStart": 25.5,
          "duration": 1
        },
        "adm-14": {
          "owner": "前端工程师",
          "planStart": 26.5,
          "duration": 1.5
        },
        "mp-01": {
          "owner": "前端工程师",
          "planStart": 28,
          "duration": 1
        },
        "mp-02": {
          "owner": "前端工程师",
          "planStart": 29,
          "duration": 2
        },
        "mp-03": {
          "owner": "前端工程师",
          "planStart": 31,
          "duration": 1
        },
        "mp-04": {
          "owner": "前端工程师",
          "planStart": 32,
          "duration": 2.5
        },
        "mp-05": {
          "owner": "前端工程师",
          "planStart": 34.5,
          "duration": 0.5
        },
        "mp-06": {
          "owner": "前端工程师",
          "planStart": 35,
          "duration": 1
        },
        "mp-07": {
          "owner": "前端工程师",
          "planStart": 36,
          "duration": 1
        }
      },
      "prereqExpectedWeeks": {
        "pre-mp-review": 8,
        "pre-pay-callback-test": 8
      },
      "label": "1 前端 + 1 后端",
      "description": "同一前端串行承担 PC 管理端与小程序；研发完成第 9 周，20% 缓冲第 10–11 周。"
    },
    "2fe": {
      "meta": {
        "devEndWeek": 8,
        "bufferStartWeek": 9,
        "bufferEndWeek": 9,
        "totalWeeks": 9,
        "bufferCalendarWeeks": 1
      },
      "taskSchedules": {
        "pd-01": {
          "owner": "产品经理",
          "planStart": 0,
          "duration": 2
        },
        "be-01": {
          "owner": "后端工程师",
          "planStart": 0,
          "duration": 1
        },
        "ops-01": {
          "owner": "后端工程师",
          "planStart": 1,
          "duration": 1
        },
        "be-02": {
          "owner": "后端工程师",
          "planStart": 2,
          "duration": 1.5
        },
        "be-03": {
          "owner": "后端工程师",
          "planStart": 3.5,
          "duration": 1.5
        },
        "be-04": {
          "owner": "后端工程师",
          "planStart": 5,
          "duration": 2
        },
        "be-05": {
          "owner": "后端工程师",
          "planStart": 7,
          "duration": 2
        },
        "be-06": {
          "owner": "后端工程师",
          "planStart": 9,
          "duration": 2
        },
        "be-07": {
          "owner": "后端工程师",
          "planStart": 11,
          "duration": 1.5
        },
        "be-08": {
          "owner": "后端工程师",
          "planStart": 12.5,
          "duration": 2
        },
        "be-09": {
          "owner": "后端工程师",
          "planStart": 14.5,
          "duration": 1
        },
        "be-10": {
          "owner": "后端工程师",
          "planStart": 15.5,
          "duration": 1.5
        },
        "ops-02": {
          "owner": "后端工程师",
          "planStart": 30,
          "duration": 1
        },
        "ops-03": {
          "owner": "后端工程师",
          "planStart": 31,
          "duration": 0.5
        },
        "ops-04": {
          "owner": "全员",
          "planStart": 31.5,
          "duration": 1.5
        },
        "ops-05": {
          "owner": "后端工程师",
          "planStart": 35,
          "duration": 1
        },
        "ops-06": {
          "owner": "全员",
          "planStart": 36,
          "duration": 0.5
        },
        "adm-01": {
          "owner": "前端工程师 A",
          "planStart": 5,
          "duration": 0.5
        },
        "adm-02": {
          "owner": "前端工程师 A",
          "planStart": 5.5,
          "duration": 1.5
        },
        "adm-03": {
          "owner": "前端工程师 A",
          "planStart": 7,
          "duration": 1
        },
        "adm-04": {
          "owner": "前端工程师 A",
          "planStart": 11,
          "duration": 1.5
        },
        "adm-05": {
          "owner": "前端工程师 A",
          "planStart": 14.5,
          "duration": 3
        },
        "adm-06": {
          "owner": "前端工程师 A",
          "planStart": 17.5,
          "duration": 1
        },
        "adm-07": {
          "owner": "前端工程师 A",
          "planStart": 18.5,
          "duration": 1.5
        },
        "adm-08": {
          "owner": "前端工程师 A",
          "planStart": 20,
          "duration": 1.5
        },
        "adm-09": {
          "owner": "前端工程师 A",
          "planStart": 21.5,
          "duration": 1
        },
        "adm-10": {
          "owner": "前端工程师 A",
          "planStart": 22.5,
          "duration": 1
        },
        "mp-01": {
          "owner": "前端工程师 B",
          "planStart": 17,
          "duration": 1
        },
        "mp-02": {
          "owner": "前端工程师 B",
          "planStart": 18,
          "duration": 2
        },
        "mp-03": {
          "owner": "前端工程师 B",
          "planStart": 20,
          "duration": 1
        },
        "mp-04": {
          "owner": "前端工程师 B",
          "planStart": 21,
          "duration": 2.5
        },
        "mp-05": {
          "owner": "前端工程师 B",
          "planStart": 23.5,
          "duration": 0.5
        },
        "mp-06": {
          "owner": "前端工程师 B",
          "planStart": 24,
          "duration": 1
        },
        "mp-07": {
          "owner": "前端工程师 B",
          "planStart": 25,
          "duration": 1
        },
        "adm-11": {
          "owner": "前端工程师 B",
          "planStart": 26,
          "duration": 1
        },
        "adm-12": {
          "owner": "前端工程师 B",
          "planStart": 27,
          "duration": 1
        },
        "adm-13": {
          "owner": "前端工程师 B",
          "planStart": 28,
          "duration": 1
        },
        "adm-14": {
          "owner": "前端工程师 B",
          "planStart": 29,
          "duration": 1.5
        }
      },
      "prereqExpectedWeeks": {
        "pre-mp-review": 7,
        "pre-pay-callback-test": 7
      },
      "label": "2 前端 + 1 后端",
      "description": "前端 A/B 分担 PC，前端 B 独立承担全部小程序并与 PC 并行；小程序最迟第 6 周完成，联调第 7 周、生产/验收第 8 周；缓冲第 9 周。"
    }
  },
  "lanes": [
    {
      "id": "product",
      "name": "产品"
    },
    {
      "id": "frontend",
      "name": "前端"
    },
    {
      "id": "backend",
      "name": "后端"
    },
    {
      "id": "deploy",
      "name": "部署"
    },
    {
      "id": "external",
      "name": "待甲方预备"
    }
  ],
  "tasks": [
    {
      "id": "pd-01",
      "lane": "product",
      "group": "产品设计",
      "name": "产品设计",
      "workdays": 8,
      "progress": 100,
      "status": "done"
    },
    {
      "id": "adm-01",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "管理端菜单与权限接入（登录复用框架）",
      "workdays": 0.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-01"
      ]
    },
    {
      "id": "adm-02",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "送检登记、队列与筛选",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-01",
        "be-03"
      ]
    },
    {
      "id": "adm-03",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "Excel 导入与异常反馈",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-02",
        "be-04"
      ]
    },
    {
      "id": "adm-04",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "报告中心多状态队列与操作入口",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-01",
        "be-06"
      ]
    },
    {
      "id": "adm-05",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "工作台：来源归属、检测结果、综合评定与菌门分析",
      "workdays": 3,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-04",
        "be-05",
        "be-08"
      ]
    },
    {
      "id": "adm-06",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "工作台：报告侧商品关联（调用商城只读接口）",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-05",
        "be-09"
      ]
    },
    {
      "id": "adm-07",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "小程序实时预览与双向定位",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-05"
      ]
    },
    {
      "id": "adm-08",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "发布检查、版本记录与提交撤回退回发布作废更正",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-05",
        "be-06"
      ]
    },
    {
      "id": "adm-09",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "客户管理",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-01",
        "be-03"
      ]
    },
    {
      "id": "adm-10",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "宠物档案",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-09",
        "be-03"
      ]
    },
    {
      "id": "adm-11",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "专业字典与菌群分类树",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-01",
        "be-07"
      ]
    },
    {
      "id": "adm-12",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "参考范围方案与导入",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-11",
        "be-07"
      ]
    },
    {
      "id": "adm-13",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "菌群科普模板",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-11",
        "be-07"
      ]
    },
    {
      "id": "adm-14",
      "lane": "frontend",
      "group": "前端 · PC 管理端",
      "name": "分析规则编辑、冲突提示与测试运行",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "adm-12",
        "adm-13",
        "be-08"
      ]
    },
    {
      "id": "mp-01",
      "lane": "frontend",
      "group": "前端 · 小程序",
      "name": "复用商城登录态与健康报告账号绑定",
      "workdays": 1,
      "progress": 0,
      "status": "waiting",
      "dependencyIds": [
        "be-10"
      ]
    },
    {
      "id": "mp-02",
      "lane": "frontend",
      "group": "前端 · 小程序",
      "name": "健康报告首页、主导航与模块路由",
      "workdays": 2,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "mp-01",
        "be-10"
      ]
    },
    {
      "id": "mp-03",
      "lane": "frontend",
      "group": "前端 · 小程序",
      "name": "宠物切换、报告归集与处理中可见性",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "mp-02",
        "be-10"
      ]
    },
    {
      "id": "mp-04",
      "lane": "frontend",
      "group": "前端 · 小程序",
      "name": "报告阅读：主题首屏、对比与菌门详情",
      "workdays": 2.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "mp-03",
        "be-10"
      ]
    },
    {
      "id": "mp-05",
      "lane": "frontend",
      "group": "前端 · 小程序",
      "name": "菌群科普弹层",
      "workdays": 0.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "mp-04"
      ]
    },
    {
      "id": "mp-06",
      "lane": "frontend",
      "group": "前端 · 小程序",
      "name": "推荐商品卡与同小程序商品详情衔接",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "mp-04",
        "be-09"
      ]
    },
    {
      "id": "mp-07",
      "lane": "frontend",
      "group": "前端 · 小程序",
      "name": "商城壳兼容、空态、返回路径与真机适配",
      "workdays": 1,
      "progress": 0,
      "status": "waiting",
      "dependencyIds": [
        "mp-01",
        "mp-04",
        "mp-06"
      ]
    },
    {
      "id": "be-01",
      "lane": "backend",
      "group": "后端",
      "name": "接入现有鉴权、文件与报告模块骨架",
      "workdays": 1,
      "progress": 0,
      "status": "not-started"
    },
    {
      "id": "be-02",
      "lane": "backend",
      "group": "后端",
      "name": "健康报告领域模型与数据库迁移",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-01"
      ]
    },
    {
      "id": "be-03",
      "lane": "backend",
      "group": "后端",
      "name": "送检、平台用户、宠物与关联历史服务",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-02"
      ]
    },
    {
      "id": "be-04",
      "lane": "backend",
      "group": "后端",
      "name": "Excel 解析与导入流水线",
      "workdays": 2,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-01",
        "be-02"
      ]
    },
    {
      "id": "be-05",
      "lane": "backend",
      "group": "后端",
      "name": "报告事实、有效结果与工作草稿服务",
      "workdays": 2,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-03",
        "be-04"
      ]
    },
    {
      "id": "be-06",
      "lane": "backend",
      "group": "后端",
      "name": "报告生命周期、发布快照与更正作废",
      "workdays": 2,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-05"
      ]
    },
    {
      "id": "be-07",
      "lane": "backend",
      "group": "后端",
      "name": "菌群字典、科普与参考范围服务",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-02"
      ]
    },
    {
      "id": "be-08",
      "lane": "backend",
      "group": "后端",
      "name": "分析规则版本与正式分析运行",
      "workdays": 2,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-05",
        "be-07"
      ]
    },
    {
      "id": "be-09",
      "lane": "backend",
      "group": "后端",
      "name": "报告侧商品关联与商城只读状态接口",
      "workdays": 1,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-05"
      ]
    },
    {
      "id": "be-10",
      "lane": "backend",
      "group": "后端",
      "name": "小程序登录投影与报告查询接口",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "be-03",
        "be-06"
      ]
    },
    {
      "id": "ops-01",
      "lane": "deploy",
      "group": "部署",
      "name": "服务器/运行环境/数据库",
      "workdays": 1,
      "progress": 0,
      "status": "waiting"
    },
    {
      "id": "ops-02",
      "lane": "deploy",
      "group": "部署",
      "name": "域名/HTTPS/小程序配置",
      "workdays": 1,
      "progress": 0,
      "status": "waiting"
    },
    {
      "id": "ops-03",
      "lane": "deploy",
      "group": "部署",
      "name": "初始化数据与迁移",
      "workdays": 0.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "ops-01"
      ]
    },
    {
      "id": "ops-04",
      "lane": "deploy",
      "group": "部署",
      "name": "管理端、健康报告与商城交易链路联调",
      "workdays": 1.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "ops-03",
        "mp-07",
        "adm-03",
        "adm-06",
        "adm-07",
        "adm-08",
        "adm-10",
        "adm-14"
      ]
    },
    {
      "id": "ops-05",
      "lane": "deploy",
      "group": "部署",
      "name": "生产部署与监控",
      "workdays": 1,
      "progress": 0,
      "status": "waiting",
      "dependencyIds": [
        "ops-02"
      ]
    },
    {
      "id": "ops-06",
      "lane": "deploy",
      "group": "部署",
      "name": "验收与发布",
      "workdays": 0.5,
      "progress": 0,
      "status": "not-started",
      "dependencyIds": [
        "ops-04",
        "ops-05"
      ]
    }
  ],
  "prerequisites": [
    {
      "id": "pre-mp-account",
      "title": "商城小程序主体、管理员与 AppID/AppSecret",
      "category": "账号与资质",
      "requirementLevel": "必需",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 1,
      "status": "incomplete",
      "completionCriteria": "现有商城小程序管理员可登录；AppID 已提供；AppSecret 仅通过安全方式交给后端；商城登录态与健康报告账号绑定方案已确认，真实 code2Session 可调用",
      "sourceLabel": "微信开放文档：开始",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html",
      "affectedTaskIds": [
        "mp-01",
        "mp-07",
        "ops-04"
      ]
    },
    {
      "id": "pre-mp-certification",
      "title": "微信认证状态",
      "category": "账号与资质",
      "requirementLevel": "必需核验",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 1,
      "status": "incomplete",
      "completionCriteria": "公众平台显示当前商城小程序认证有效，认证主体与实际运营主体一致，可继续使用微信支付权限",
      "sourceLabel": "微信支付：开发接入准备",
      "sourceUrl": "https://pay.wechatpay.cn/doc/v3/merchant/4015459512",
      "affectedTaskIds": [
        "mp-01",
        "mp-07",
        "ops-06"
      ]
    },
    {
      "id": "pre-mp-members",
      "title": "开发者与体验成员权限",
      "category": "账号与资质",
      "requirementLevel": "必需",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 1,
      "status": "incomplete",
      "completionCriteria": "开发人员获得现有商城小程序代码与开发权限；产品、测试和甲方验收人员能打开体验版；发布敏感权限只给指定人员",
      "sourceLabel": "微信开放文档：协同工作和发布",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html",
      "affectedTaskIds": [
        "mp-07",
        "ops-04",
        "ops-06"
      ]
    },
    {
      "id": "pre-mp-category",
      "title": "服务类目与专项资质确认",
      "category": "账号与资质",
      "requirementLevel": "必需",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 1,
      "status": "incomplete",
      "completionCriteria": "类目与真实宠物微生物组报告功能已获平台确认；所需许可证、合作协议或承诺材料已上传并通过；未把「基因检测」类目直接套用为既定结论",
      "sourceLabel": "微信开放文档：服务类目所需资质材料",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/product/material/",
      "affectedTaskIds": [
        "mp-02",
        "mp-03",
        "mp-04",
        "mp-07",
        "ops-06"
      ]
    },
    {
      "id": "pre-mp-filing",
      "title": "小程序备案",
      "category": "账号与资质",
      "requirementLevel": "必需",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 1,
      "status": "incomplete",
      "completionCriteria": "主体、负责人、专项材料与短信核验完成；后台取得小程序备案号",
      "sourceLabel": "微信开放文档：小程序备案操作指引",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html",
      "affectedTaskIds": [
        "mp-07",
        "ops-06"
      ]
    },
    {
      "id": "pre-server",
      "title": "测试/生产服务器、数据库与运维联系人",
      "category": "技术资源",
      "requirementLevel": "必需",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 1,
      "status": "incomplete",
      "completionCriteria": "可公网访问的环境和数据库已交付；技术联系人明确；具备部署、日志、备份和恢复所需权限",
      "sourceLabel": "微信开放文档：网络",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html",
      "affectedTaskIds": [
        "ops-01",
        "ops-04",
        "ops-05"
      ]
    },
    {
      "id": "pre-domain",
      "title": "域名、ICP、DNS 与 HTTPS",
      "category": "技术资源",
      "requirementLevel": "必需",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 6,
      "status": "incomplete",
      "completionCriteria": "域名可控；ICP 备案可查；DNS 指向目标环境；HTTPS 证书有效、域名匹配、链完整",
      "sourceLabel": "微信开放文档：网络",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html",
      "affectedTaskIds": [
        "ops-02",
        "ops-04",
        "ops-05"
      ]
    },
    {
      "id": "pre-mp-server-domains",
      "title": "小程序服务器域名配置",
      "category": "技术资源",
      "requirementLevel": "必需",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 6,
      "status": "incomplete",
      "completionCriteria": "request 合法域名已配置并真机验证；按实际功能补充 downloadFile，仅在确有上传/Socket 时补充对应域名",
      "sourceLabel": "微信开放文档：网络",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html",
      "affectedTaskIds": [
        "mp-01",
        "mp-02",
        "mp-03",
        "mp-04",
        "mp-05",
        "mp-06",
        "mp-07",
        "ops-02",
        "ops-04"
      ]
    },
    {
      "id": "pre-mp-privacy",
      "title": "隐私保护指引与用户权利联系人",
      "category": "合规发布",
      "requirementLevel": "必需",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 6,
      "status": "incomplete",
      "completionCriteria": "个人信息清单、用途、保存期限、第三方、删除/更正渠道、联系方式已确认；后台指引与提审代码实际接口一致并通过审核",
      "sourceLabel": "微信开放文档：用户隐私保护指引填写说明",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/",
      "affectedTaskIds": [
        "mp-01",
        "mp-02",
        "mp-03",
        "mp-07",
        "ops-06"
      ]
    },
    {
      "id": "pre-mp-review",
      "title": "审核资料、测试账号与发布负责人",
      "category": "合规发布",
      "requirementLevel": "仅上线前核验",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 8,
      "status": "incomplete",
      "completionCriteria": "名称/头像/简介/类目一致；审核人员可通过测试账号或测试数据体验宠物与完整报告；无测试占位；提审和发布负责人已确认",
      "sourceLabel": "微信开放文档：常见拒绝情形",
      "sourceUrl": "https://developers.weixin.qq.com/miniprogram/product/reject.html",
      "affectedTaskIds": [
        "mp-02",
        "mp-03",
        "mp-04",
        "mp-07",
        "ops-04",
        "ops-06"
      ]
    },
    {
      "id": "pre-pay-merchant",
      "title": "商户号与 JSAPI/小程序支付权限",
      "category": "微信支付",
      "requirementLevel": "必需核验",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 1,
      "status": "incomplete",
      "completionCriteria": "现有商户号主体、费率、风险状态正常，JSAPI/小程序支付权限有效；原则上复用，不重复申请",
      "sourceLabel": "微信支付：开发接入准备",
      "sourceUrl": "https://pay.wechatpay.cn/doc/v3/merchant/4015459512",
      "affectedTaskIds": [
        "mp-06",
        "mp-07",
        "ops-04"
      ]
    },
    {
      "id": "pre-pay-binding-security",
      "title": "商户号绑定 AppID 与支付安全参数",
      "category": "微信支付",
      "requirementLevel": "必需核验",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 6,
      "status": "incomplete",
      "completionCriteria": "当前商城 AppID 与商户号绑定有效；商城支付后端的商户 API 私钥/证书、序列号、APIv3 密钥及验签方案可用且未进入前端或公开仓库；缺失时再安全补充",
      "sourceLabel": "微信支付：开发必要参数说明",
      "sourceUrl": "https://pay.wechatpay.cn/doc/v3/merchant/4013070756",
      "affectedTaskIds": [
        "mp-06",
        "mp-07",
        "ops-04",
        "ops-05"
      ]
    },
    {
      "id": "pre-pay-callback-test",
      "title": "支付回调与真实支付退款闭环",
      "category": "微信支付",
      "requirementLevel": "必需联调",
      "active": true,
      "ownerRole": "甲方",
      "expectedWeek": 8,
      "status": "incomplete",
      "completionCriteria": "从报告推荐商品进入同小程序商品详情后，公网 HTTPS 通知可达；真实小额支付、查单、支付通知、订单更新、退款及退款结果确认全部通过并留存结果",
      "sourceLabel": "微信支付：支付成功回调",
      "sourceUrl": "https://pay.wechatpay.cn/doc/v3/merchant/4012791902",
      "affectedTaskIds": [
        "mp-06",
        "mp-07",
        "ops-04",
        "ops-05",
        "ops-06"
      ]
    }
  ],
  "pendingScopes": [
    {
      "id": "scope-core",
      "title": "报告核心模块最低范围",
      "note": "确认后重新评估并更新当前计划。"
    },
    {
      "id": "scope-mp-home",
      "title": "小程序默认首页",
      "note": "确认后重新评估并更新当前计划。"
    },
    {
      "id": "scope-recommend",
      "title": "推荐卡片形式 / 候选数量 / 排序",
      "note": "确认后重新评估并更新当前计划。"
    },
    {
      "id": "scope-baseline",
      "title": "微生物组对比基准",
      "note": "确认后重新评估并更新当前计划。"
    },
    {
      "id": "scope-audit",
      "title": "有效检测结果修改留痕",
      "note": "确认后重新评估并更新当前计划。"
    }
  ]
};
