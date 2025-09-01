function initAnalysisRules() {
  // DOM 元素
  const mainView = document.getElementById("main-view");
  const formView = document.getElementById("form-view");
  const formTitle = document.getElementById("form-title");
  const searchInput = document.getElementById("search-rule");
  const filterStatus = document.getElementById("filter-status");
  const filterType = document.getElementById("filter-type");
  const tableBody = document.getElementById("rules-table-body");
  const addNewRuleButton = document.getElementById("add-new-rule");
  const backToListButton = document.getElementById("back-to-list");
  const ruleForm = document.getElementById("rule-form");
  const cancelFormButton = document.getElementById("cancel-form");

  // 表单字段
  const formRuleName = document.getElementById("form-rule-name");
  const formRuleDescription = document.getElementById("form-rule-description");
  const formAnalysisContent = document.getElementById("form-analysis-content");
  const formSuggestionContent = document.getElementById("form-suggestion-content");
  const formOutputType = document.getElementById("form-output-type");
  const formRuleActive = document.getElementById("form-rule-active");
  
  // 条件配置相关
  const logicOperator = document.getElementById("logic-operator");
  const addConditionBtn = document.getElementById("add-condition-btn");
  const conditionsContainer = document.getElementById("conditions-container");
  const noConditions = document.getElementById("no-conditions");
  const conditionTemplate = document.getElementById("condition-template");
  
  // 规则测试相关
  const testRuleBtn = document.getElementById("test-rule-btn");
  const testResult = document.getElementById("test-result");
  const testResultContent = document.getElementById("test-result-content");
  
  // Tooltip 相关
  const contentTooltip = document.getElementById("content-tooltip");
  const tooltipContent = document.getElementById("tooltip-content");
  
  // 测试模态框相关
  const testModal = document.getElementById("test-modal");
  const closeTestModal = document.getElementById("close-test-modal");
  const cancelTest = document.getElementById("cancel-test");
  const ruleNameDisplay = document.getElementById("rule-name-display");
  const ruleConditionsDisplay = document.getElementById("rule-conditions-display");
  const reportsTableBody = document.getElementById("reports-table-body");
  const reportsCount = document.getElementById("reports-count");
  const testResultsContainer = document.getElementById("test-results-container");
  const testResultsContent = document.getElementById("test-results-content");
  const searchReports = document.getElementById("search-reports");
  const filterHealthStatus = document.getElementById("filter-health-status");
  const filterTestStatus = document.getElementById("filter-test-status");
  const refreshReports = document.getElementById("refresh-reports");
  
  // 分页相关
  const pageSizeSelect = document.getElementById("page-size");
  const currentPageSpan = document.getElementById("current-page");
  const totalPagesSpan = document.getElementById("total-pages");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");
  const pageNumbersDiv = document.getElementById("page-numbers");
  
  // 报告详情模态框相关
  const reportDetailModal = document.getElementById("report-detail-modal");
  const closeReportDetail = document.getElementById("close-report-detail");
  const closeReportDetailBtn = document.getElementById("close-report-detail-btn");
  const detailTabBtns = document.querySelectorAll(".detail-tab-btn");
  const detailTabContents = document.querySelectorAll(".detail-tab-content");

  // 数据存储
  let analysisRules = [];
  let currentEditIndex = -1;
  let conditionCounter = 0;
  let currentTestRule = null; // 当前测试的规则
  
  // 分页状态
  let currentPage = 1;
  let pageSize = 10;
  let filteredReports = [];
  
  // 微生物指标结构数据
  const microbiotaStructure = {
    phylum: {
      '放线菌门': {
        name: '放线菌门',
        description: '主要包含双歧杆菌等有益菌群，对肠道健康至关重要',
        normalRange: [30, 50],
        unit: '%',
        category: 'beneficial',
        genera: ['双歧杆菌', '短双歧杆菌']
      },
      '拟杆菌门': {
        name: '拟杆菌门',
        description: '肠道内重要的菌群之一，参与营养物质的消化吸收',
        normalRange: [25, 45],
        unit: '%',
        category: 'neutral',
        genera: ['拟杆菌']
      },
      '厚壁菌门': {
        name: '厚壁菌门',
        description: '包含多种菌属，需要保持适当比例',
        normalRange: [20, 40],
        unit: '%',
        category: 'neutral',
        genera: ['乳酸菌']
      },
      '变形菌门': {
        name: '变形菌门',
        description: '包含一些潜在有害菌，应控制在较低水平',
        normalRange: [5, 15],
        unit: '%',
        category: 'harmful',
        genera: ['大肠杆菌']
      },
      '蓝藻菌门': {
        name: '蓝藻菌门',
        description: '较为少见的菌群，正常情况下含量较少',
        normalRange: [1, 5],
        unit: '%',
        category: 'neutral',
        genera: []
      }
    },
    summary: [
      {
        key: '有益菌总量',
        name: '有益菌总量',
        description: '所有有益菌群的总含量',
        normalRange: [60, 85],
        unit: '%',
        category: 'beneficial'
      },
      {
        key: '有害菌总量',
        name: '有害菌总量',
        description: '所有有害菌群的总含量',
        normalRange: [5, 15],
        unit: '%',
        category: 'harmful'
      }
    ]
  };
  
  // 模拟萌宠报告数据（从萌宠报告模块获取）
  let mockPetReports = [
    {
      id: 1,
      reportNumber: "RPT202501001",
      petInfo: { name: "小花", breed: "英国短毛猫", age: 3.8, gender: "female" },
      ownerInfo: { name: "张女士", phone: "13812345678" },
      testInfo: { testDate: "2025-01-15", status: "completed" },
      healthAssessment: { level: "A", score: 92.5 },
      testData: {
        "放线菌门": 42.5, "拟杆菌门": 35.2, "厚壁菌门": 28.3, "变形菌门": 8.1, "蓝藻菌门": 3.2,
        "双歧杆菌": 22.1, "短双歧杆菌": 18.5, "乳酸菌": 15.3, "拟杆菌": 25.3, "大肠杆菌": 3.2,
        "有益菌总量": 78.5, "有害菌总量": 6.8
      }
    },
    {
      id: 2,
      reportNumber: "RPT202501002",
      petInfo: { name: "阿黄", breed: "金毛寻回犬", age: 5.0, gender: "male" },
      ownerInfo: { name: "李先生", phone: "13987654321" },
      testInfo: { testDate: "2025-01-14", status: "reviewed" },
      healthAssessment: { level: "C", score: 68.0 },
      testData: {
        "放线菌门": 28.2, "拟杆菌门": 22.8, "厚壁菌门": 35.5, "变形菌门": 18.1, "蓝藻菌门": 2.8,
        "双歧杆菌": 12.3, "短双歧杆菌": 8.5, "乳酸菌": 18.2, "拟杆菌": 18.3, "大肠杆菌": 12.3,
        "有益菌总量": 55.2, "有害菌总量": 15.8
      }
    },
    {
      id: 3,
      reportNumber: "RPT202501003",
      petInfo: { name: "咪咪", breed: "布偶猫", age: 2.0, gender: "female" },
      ownerInfo: { name: "王女士", phone: "13666888999" },
      testInfo: { testDate: "2025-01-13", status: "processing" },
      healthAssessment: { level: "", score: null },
      testData: {
        "放线菌门": 38.5, "拟杆菌门": 32.2, "厚壁菌门": 25.8, "变形菌门": 6.5, "蓝藻菌门": 4.2,
        "双歧杆菌": 19.8, "短双歧杆菌": 15.2, "乳酸菌": 12.8, "拟杆菌": 22.8, "大肠杆菌": 2.1,
        "有益菌总量": 72.3, "有害菌总量": 4.5
      }
    },
    {
      id: 4,
      reportNumber: "RPT202501004",
      petInfo: { name: "豆豆", breed: "比熊犬", age: 4.2, gender: "male" },
      ownerInfo: { name: "陈先生", phone: "13555777888" },
      testInfo: { testDate: "2025-01-12", status: "completed" },
      healthAssessment: { level: "B", score: 82.3 },
      testData: {
        "放线菌门": 45.8, "拟杆菌门": 28.5, "厚壁菌门": 22.2, "变形菌门": 11.8, "蓝藻菌门": 2.5,
        "双歧杆菌": 25.2, "短双歧杆菌": 16.8, "乳酸菌": 11.2, "拟杆菌": 20.8, "大肠杆菌": 8.5,
        "有益菌总量": 68.8, "有害菌总量": 9.2
      }
    },
    {
      id: 5,
      reportNumber: "RPT202501005", 
      petInfo: { name: "糖糖", breed: "博美犬", age: 1.5, gender: "female" },
      ownerInfo: { name: "刘女士", phone: "13444666888" },
      testInfo: { testDate: "2025-01-11", status: "completed" },
      healthAssessment: { level: "D", score: 45.2 },
      testData: {
        "放线菌门": 55.2, "拟杆菌门": 18.5, "厚壁菌门": 42.8, "变形菌门": 28.5, "蓝藻菌门": 1.8,
        "双歧杆菌": 8.2, "短双歧杆菌": 5.8, "乳酸菌": 25.2, "拟杆菌": 12.5, "大肠杆菌": 22.8,
        "有益菌总量": 35.2, "有害菌总量": 28.5
      }
    },
    {
      id: 6,
      reportNumber: "RPT202501006",
      petInfo: { name: "毛毛", breed: "萨摩耶", age: 2.5, gender: "female" },
      ownerInfo: { name: "赵先生", phone: "13333555777" },
      testInfo: { testDate: "2025-01-10", status: "completed" },
      healthAssessment: { level: "B", score: 76.8 },
      testData: {
        "放线菌门": 38.5, "拟杆菌门": 32.2, "厚壁菌门": 25.8, "变形菌门": 6.5, "蓝藻菌门": 4.2,
        "双歧杆菌": 19.8, "短双歧杆菌": 15.2, "乳酸菌": 12.8, "拟杆菌": 22.8, "大肠杆菌": 5.1,
        "有益菌总量": 65.8, "有害菌总量": 7.2
      }
    },
    {
      id: 7,
      reportNumber: "RPT202501007",
      petInfo: { name: "球球", breed: "法国斗牛犬", age: 4.5, gender: "male" },
      ownerInfo: { name: "孙女士", phone: "13777888999" },
      testInfo: { testDate: "2025-01-09", status: "reviewed" },
      healthAssessment: { level: "C", score: 62.3 },
      testData: {
        "放线菌门": 48.2, "拟杆菌门": 18.5, "厚壁菌门": 38.8, "变形菌门": 22.5, "蓝藻菌门": 2.2,
        "双歧杆菌": 14.2, "短双歧杆菌": 9.8, "乳酸菌": 22.5, "拟杆菌": 15.8, "大肠杆菌": 18.5,
        "有益菌总量": 52.8, "有害菌总量": 20.8
      }
    },
    {
      id: 8,
      reportNumber: "RPT202501008",
      petInfo: { name: "乐乐", breed: "哈士奇", age: 3.2, gender: "male" },
      ownerInfo: { name: "周先生", phone: "13888999000" },
      testInfo: { testDate: "2025-01-08", status: "pending" },
      healthAssessment: { level: "", score: null },
      testData: {
        "放线菌门": 35.8, "拟杆菌门": 28.5, "厚壁菌门": 32.2, "变形菌门": 8.8, "蓝藻菌门": 3.5,
        "双歧杆菌": 18.5, "短双歧杆菌": 14.2, "乳酸菌": 16.8, "拟杆菌": 20.5, "大肠杆菌": 6.8,
        "有益菌总量": 68.2, "有害菌总量": 8.5
      }
    },
    {
      id: 9,
      reportNumber: "RPT202501009",
      petInfo: { name: "妞妞", breed: "柯基犬", age: 1.8, gender: "female" },
      ownerInfo: { name: "吴女士", phone: "13999000111" },
      testInfo: { testDate: "2025-01-07", status: "completed" },
      healthAssessment: { level: "A", score: 88.9 },
      testData: {
        "放线菌门": 42.8, "拟杆菌门": 36.5, "厚壁菌门": 22.8, "变形菌门": 5.2, "蓝藻菌门": 4.8,
        "双歧杆菌": 24.5, "短双歧杆菌": 19.8, "乳酸菌": 13.5, "拟杆菌": 28.8, "大肠杆菌": 2.8,
        "有益菌总量": 82.5, "有害菌总量": 4.2
      }
    },
    {
      id: 10,
      reportNumber: "RPT202501010",
      petInfo: { name: "小黑", breed: "拉布拉多", age: 6.0, gender: "male" },
      ownerInfo: { name: "郑先生", phone: "13000111222" },
      testInfo: { testDate: "2025-01-06", status: "processing" },
      healthAssessment: { level: "", score: null },
      testData: {
        "放线菌门": 32.5, "拟杆菌门": 25.8, "厚壁菌门": 35.2, "变形菌门": 12.8, "蓝藻菌门": 2.8,
        "双歧杆菌": 16.8, "短双歧杆菌": 12.5, "乳酸菌": 19.2, "拟杆菌": 18.8, "大肠杆菌": 9.5,
        "有益菌总量": 58.8, "有害菌总量": 12.2
      }
    },
    {
      id: 11,
      reportNumber: "RPT202501011",
      petInfo: { name: "甜甜", breed: "贵宾犬", age: 2.8, gender: "female" },
      ownerInfo: { name: "何女士", phone: "13111222333" },
      testInfo: { testDate: "2025-01-05", status: "completed" },
      healthAssessment: { level: "B", score: 78.5 },
      testData: {
        "放线菌门": 40.2, "拟杆菌门": 30.8, "厚壁菌门": 26.5, "变形菌门": 7.8, "蓝藻菌门": 3.8,
        "双歧杆菌": 21.5, "短双歧杆菌": 16.8, "乳酸菌": 14.2, "拟杆菌": 24.5, "大肠杆菌": 4.8,
        "有益菌总量": 70.8, "有害菌总量": 6.5
      }
    },
    {
      id: 12,
      reportNumber: "RPT202501012",
      petInfo: { name: "大壮", breed: "德国牧羊犬", age: 5.5, gender: "male" },
      ownerInfo: { name: "马先生", phone: "13222333444" },
      testInfo: { testDate: "2025-01-04", status: "reviewed" },
      healthAssessment: { level: "D", score: 38.5 },
      testData: {
        "放线菌门": 58.5, "拟杆菌门": 12.8, "厚壁菌门": 48.5, "变形菌门": 32.8, "蓝藻菌门": 1.5,
        "双歧杆菌": 6.8, "短双歧杆菌": 4.2, "乳酸菌": 28.5, "拟杆菌": 8.5, "大肠杆菌": 28.5,
        "有益菌总量": 28.5, "有害菌总量": 35.8
      }
    }
  ];

  // 初始化测试数据
  analysisRules = [
    {
      id: 1,
      name: "肠道菌群失衡警告",
      description: "检测肠道菌群比例异常，及时提醒主人注意宠物肠道健康",
      conditions: [
        {
          indicator: "放线菌门",
          operator: ">",
          value: 50,
          unit: "%"
        },
        {
          indicator: "拟杆菌门",
          operator: "<",
          value: 30,
          unit: "%"
        }
      ],
      logicOperator: "AND",
      analysisContent: "检测显示您的宠物肠道菌群存在失衡情况，放线菌门比例过高且拟杆菌门不足",
      suggestionContent: "建议调整饮食结构，增加膳食纤维摄入，配合益生菌补充剂调理3个月后复检",
      outputType: "both",
      isActive: true,
      createdAt: "2025-01-15 10:30:00",
      updatedAt: "2025-01-16 14:20:00"
    },
    {
      id: 2,
      name: "有害菌超标提醒",
      description: "监测有害菌群水平，预防肠道炎症",
      conditions: [
        {
          indicator: "大肠杆菌",
          operator: ">",
          value: 15,
          unit: "%"
        }
      ],
      logicOperator: "AND",
      analysisContent: "检测到有害菌大肠杆菌比例偏高，可能引起肠道炎症",
      suggestionContent: "建议立即调整饮食，避免高脂食物，增加益生菌摄入，必要时请咨询兽医",
      outputType: "both",
      isActive: true,
      createdAt: "2025-01-14 09:15:00",
      updatedAt: "2025-01-14 09:15:00"
    },
    {
      id: 3,
      name: "肠道健康良好",
      description: "各项指标正常时的积极反馈",
      conditions: [
        {
          indicator: "双歧杆菌",
          operator: ">",
          value: 20,
          unit: "%"
        },
        {
          indicator: "乳酸菌",
          operator: ">",
          value: 15,
          unit: "%"
        },
        {
          indicator: "有害菌总量",
          operator: "<",
          value: 10,
          unit: "%"
        }
      ],
      logicOperator: "AND",
      analysisContent: "恭喜！您的宠物肠道健康状况良好，各项有益菌群比例均在理想范围内",
      suggestionContent: "请继续保持当前的饮食和生活习惯",
      outputType: "both",
      isActive: true,
      createdAt: "2025-01-13 16:20:00",
      updatedAt: "2025-01-13 16:20:00"
    }
  ];

  function generateId() {
    return Math.max(...analysisRules.map((r) => r.id || 0), 0) + 1;
  }



  function getOutputTypeDisplay(outputType) {
    const typeMap = {
      'analysis': '仅分析',
      'advice': '仅建议',
      'both': '分析+建议'
    };
    return typeMap[outputType] || '分析+建议';
  }

  function formatConditions(conditions, logicOperator, isDetailView = false) {
    if (!conditions || conditions.length === 0) return "无条件";
    
    if (isDetailView) {
      // 详细视图：显示所有条件，格式化更清晰
      const conditionTexts = conditions.map((condition, index) => 
        `<span class="inline-block bg-gray-100 px-2 py-1 rounded mr-1 mb-1 text-xs">${condition.indicator} ${condition.operator} ${condition.value}${condition.unit || ''}</span>`
      );
      
      const separator = logicOperator === 'AND' ? 
        '<span class="text-blue-600 font-medium mx-1">且</span>' : 
        '<span class="text-orange-600 font-medium mx-1">或</span>';
      
      return conditionTexts.join(separator);
    } else {
      // 简化视图：用于表格显示
      if (conditions.length === 1) {
        const condition = conditions[0];
        return `<div class="text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1">${condition.indicator} ${condition.operator} ${condition.value}${condition.unit || ''}</div>`;
      }
      
      const logicText = logicOperator === 'AND' ? '且' : '或';
      const logicColor = logicOperator === 'AND' ? 'text-blue-600' : 'text-orange-600';
      
      return `
        <div class="space-y-1">
          <div class="text-xs font-medium ${logicColor}">${logicText}关系 (${conditions.length}个条件)</div>
          ${conditions.slice(0, 2).map(condition => 
            `<div class="text-xs bg-gray-50 border rounded px-2 py-1 truncate">${condition.indicator} ${condition.operator} ${condition.value}${condition.unit || ''}</div>`
          ).join('')}
          ${conditions.length > 2 ? `<div class="text-xs text-gray-500">+${conditions.length - 2}个条件...</div>` : ''}
        </div>
      `;
    }
  }
  
  function truncateContent(content, maxLines = 3) {
    if (!content) return '';
    
    // 简单按字数估算行数 (假设每行约30个字符)
    const estimatedLines = Math.ceil(content.length / 30);
    
    if (estimatedLines <= maxLines) {
      return content;
    }
    
    // 截取内容并添加省略号
    const maxChars = maxLines * 30 - 3; // 减去省略号的位置
    return content.substring(0, maxChars) + '...';
  }
  
  function showTooltip(event, content) {
    if (!content || content.length <= 90) return; // 短内容不显示tooltip
    
    tooltipContent.textContent = content;
    contentTooltip.classList.remove('hidden');
    
    // 计算位置
    const rect = event.target.getBoundingClientRect();
    const tooltipRect = contentTooltip.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8;
    
    // 边界检查
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
      top = rect.bottom + 8;
    }
    
    contentTooltip.style.left = left + 'px';
    contentTooltip.style.top = top + 'px';
  }
  
  function showHtmlTooltip(event, htmlContent) {
    if (!htmlContent) return;
    
    tooltipContent.innerHTML = htmlContent;
    contentTooltip.classList.remove('hidden');
    
    // 重新计算tooltip尺寸（因为内容变了）
    contentTooltip.style.left = '0px';
    contentTooltip.style.top = '0px';
    
    // 计算位置
    const rect = event.target.getBoundingClientRect();
    const tooltipRect = contentTooltip.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - 8;
    
    // 边界检查
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
      top = rect.bottom + 8;
    }
    
    contentTooltip.style.left = left + 'px';
    contentTooltip.style.top = top + 'px';
  }
  
  function hideTooltip() {
    contentTooltip.classList.add('hidden');
    // 清空内容，避免HTML内容影响后续使用
    tooltipContent.innerHTML = '';
  }

  function renderTable(filter = "", statusFilter = "", typeFilter = "") {
    // 过滤数据
    let filteredRules = analysisRules.filter((rule) => {
      const matchesSearch = !filter || 
        rule.name.toLowerCase().includes(filter.toLowerCase()) ||
        rule.description.toLowerCase().includes(filter.toLowerCase()) ||
        (rule.analysisContent && rule.analysisContent.toLowerCase().includes(filter.toLowerCase())) ||
        (rule.suggestionContent && rule.suggestionContent.toLowerCase().includes(filter.toLowerCase()));
      
      const matchesStatus = !statusFilter || 
        (statusFilter === 'active' && rule.isActive) ||
        (statusFilter === 'inactive' && !rule.isActive);
        
      const matchesType = !typeFilter || 
        (typeFilter === 'analysis' && rule.outputType === 'analysis') ||
        (typeFilter === 'advice' && rule.outputType === 'advice') ||
        (typeFilter === 'both' && rule.outputType === 'both');
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // 按更新时间倒序排列
    filteredRules.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    tableBody.innerHTML = "";

    if (filteredRules.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-4 text-center text-gray-500">暂无规则配置</td>
        </tr>
      `;
      return;
    }

    filteredRules.forEach((rule) => {
      const conditionsText = formatConditions(rule.conditions, rule.logicOperator);
      const conditionsDetailText = formatConditions(rule.conditions, rule.logicOperator, true);
      const outputTypeDisplay = getOutputTypeDisplay(rule.outputType);
      
      // 处理内容截断和tooltip
      const analysisContent = rule.analysisContent || '';
      const suggestionContent = rule.suggestionContent || '';
      const truncatedAnalysis = truncateContent(analysisContent);
      const truncatedSuggestion = truncateContent(suggestionContent);
      
      // 判断是否需要为条件列显示tooltip（条件多于1个或者有长指标名称）
      const needConditionsTooltip = rule.conditions.length > 1 || 
        rule.conditions.some(c => c.indicator.length > 8);
      
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
        <td class="px-3 py-4">
          <div class="text-sm font-medium text-gray-900 break-words">${rule.name}</div>
          <div class="text-xs text-gray-500 mt-1 break-words">${rule.description || '无描述'}</div>
          <div class="mt-1">
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
              ${rule.isActive ? '启用' : '停用'}
            </span>
          </div>
        </td>
        <td class="px-3 py-4">
          <div class="text-xs text-gray-700 conditions-cell cursor-help" 
               ${needConditionsTooltip ? `data-tooltip-html="${conditionsDetailText.replace(/"/g, '&quot;')}"` : ''}>
            ${conditionsText}
          </div>
        </td>
        <td class="px-3 py-4">
          <div class="text-xs text-gray-900 break-words content-cell" 
               ${analysisContent.length > 90 ? `data-tooltip="${analysisContent}"` : ''}>
            ${truncatedAnalysis || '-'}
          </div>
        </td>
        <td class="px-3 py-4">
          <div class="text-xs text-gray-900 break-words content-cell" 
               ${suggestionContent.length > 90 ? `data-tooltip="${suggestionContent}"` : ''}>
            ${truncatedSuggestion || '-'}
          </div>
        </td>
        <td class="px-2 py-4 text-center">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
            ${rule.isActive ? '启用' : '停用'}
          </span>
        </td>
        <td class="px-2 py-4 text-xs text-gray-500 text-center">
          ${new Date(rule.updatedAt).toLocaleDateString('zh-CN', {month: 'numeric', day: 'numeric'})}
        </td>
        <td class="px-2 py-4 text-center">
          <div class="flex flex-col space-y-1">
            <button class="text-xs text-blue-600 hover:text-blue-900 edit-rule" data-id="${rule.id}">
              编辑
            </button>
            <button class="text-xs text-${rule.isActive ? 'orange' : 'green'}-600 hover:text-${rule.isActive ? 'orange' : 'green'}-900 toggle-status" data-id="${rule.id}">
              ${rule.isActive ? '停用' : '启用'}
            </button>
            <button class="text-xs text-purple-600 hover:text-purple-900 test-rule" data-id="${rule.id}">
              测试
            </button>
            <button class="text-xs text-red-600 hover:text-red-900 delete-rule" data-id="${rule.id}">
              删除
            </button>
          </div>
        </td>
      `;
      
      // 添加tooltip事件监听
      const contentCells = row.querySelectorAll('.content-cell');
      contentCells.forEach(cell => {
        const tooltipText = cell.getAttribute('data-tooltip');
        if (tooltipText) {
          cell.addEventListener('mouseenter', (e) => showTooltip(e, tooltipText));
          cell.addEventListener('mouseleave', hideTooltip);
        }
      });
      
      // 添加条件列的tooltip事件监听
      const conditionsCell = row.querySelector('.conditions-cell');
      if (conditionsCell) {
        const tooltipHtml = conditionsCell.getAttribute('data-tooltip-html');
        if (tooltipHtml) {
          conditionsCell.addEventListener('mouseenter', (e) => showHtmlTooltip(e, tooltipHtml));
          conditionsCell.addEventListener('mouseleave', hideTooltip);
        }
      }
      
      tableBody.appendChild(row);
    });
  }

  function showMainView() {
    mainView.classList.remove("hidden");
    formView.classList.add("hidden");
    renderTable();
  }

  function showFormView(isEdit = false, editId = null) {
    mainView.classList.add("hidden");
    formView.classList.remove("hidden");

    // 清空条件容器
    conditionsContainer.innerHTML = "";
    conditionCounter = 0;
    updateConditionsDisplay();

    if (isEdit && editId) {
      const rule = analysisRules.find((r) => r.id === editId);
      if (rule) {
        formTitle.textContent = "编辑分析规则";
        
        formRuleName.value = rule.name;
        formRuleDescription.value = rule.description || "";
        formAnalysisContent.value = rule.analysisContent || "";
        formSuggestionContent.value = rule.suggestionContent || "";
        formOutputType.value = rule.outputType || "both";
        formRuleActive.checked = rule.isActive;
        logicOperator.value = rule.logicOperator;
        
        // 加载条件
        rule.conditions.forEach(condition => {
          addCondition(condition);
        });
        
        currentEditIndex = analysisRules.findIndex((r) => r.id === editId);
      }
    } else {
      formTitle.textContent = "新增分析规则";
      ruleForm.reset();
      formRuleActive.checked = true;
      formOutputType.value = "both";
      logicOperator.value = "AND";
      currentEditIndex = -1;
    }
  }

  function addCondition(conditionData = null) {
    conditionCounter++;
    const template = conditionTemplate.content.cloneNode(true);
    const conditionDiv = template.querySelector('.condition-item');
    
    // 设置唯一ID
    conditionDiv.dataset.conditionId = conditionCounter;
    
    // 更新条件编号
    template.querySelector('.condition-number').textContent = conditionCounter;
    
    // 如果有数据，填充表单
    if (conditionData) {
      template.querySelector('.condition-indicator').value = conditionData.indicator || '';
      template.querySelector('.condition-operator').value = conditionData.operator || '>';
      template.querySelector('.condition-value').value = conditionData.value || '';
      template.querySelector('.condition-unit').value = conditionData.unit || '%';
    }
    
    // 绑定删除事件
    template.querySelector('.remove-condition').addEventListener('click', function() {
      conditionDiv.remove();
      updateConditionsDisplay();
    });
    
    conditionsContainer.appendChild(template);
    updateConditionsDisplay();
  }

  function updateConditionsDisplay() {
    const hasConditions = conditionsContainer.children.length > 0;
    noConditions.classList.toggle('hidden', hasConditions);
    conditionsContainer.classList.toggle('hidden', !hasConditions);
    
    // 更新条件编号
    Array.from(conditionsContainer.children).forEach((condition, index) => {
      condition.querySelector('.condition-number').textContent = index + 1;
    });
  }

  function getFormConditions() {
    const conditions = [];
    const conditionItems = conditionsContainer.querySelectorAll('.condition-item');
    
    conditionItems.forEach(item => {
      const indicator = item.querySelector('.condition-indicator').value.trim();
      const operator = item.querySelector('.condition-operator').value;
      const value = parseFloat(item.querySelector('.condition-value').value);
      const unit = item.querySelector('.condition-unit').value.trim();
      
      if (indicator && !isNaN(value)) {
        conditions.push({
          indicator,
          operator,
          value,
          unit
        });
      }
    });
    
    return conditions;
  }

  function validateRule() {
    const name = formRuleName.value.trim();
    const outputType = formOutputType.value;
    const analysisContent = formAnalysisContent.value.trim();
    const suggestionContent = formSuggestionContent.value.trim();
    const conditions = getFormConditions();
    
    if (!name) {
      alert("规则名称不能为空！");
      return false;
    }
    
    if (!outputType) {
      alert("请选择输出类型！");
      return false;
    }
    
    // 根据输出类型验证内容
    if (outputType === 'analysis' && !analysisContent) {
      alert("分析内容不能为空！");
      return false;
    }
    
    if (outputType === 'advice' && !suggestionContent) {
      alert("建议内容不能为空！");
      return false;
    }
    
    if (outputType === 'both' && !analysisContent && !suggestionContent) {
      alert("分析内容和建议内容至少需要填写一个！");
      return false;
    }
    
    if (conditions.length === 0) {
      alert("至少需要配置一个触发条件！");
      return false;
    }
    
    // 检查重复名称
    const existingRule = analysisRules.find(
      (r) => r.name === name && 
      (currentEditIndex === -1 || r.id !== analysisRules[currentEditIndex].id)
    );
    if (existingRule) {
      alert("规则名称已存在，请使用其他名称！");
      return false;
    }
    
    return true;
  }

  // 测试规则 - 打开测试模态框
  function testRule() {
    const conditions = getFormConditions();
    const logicOp = logicOperator.value;
    
    if (conditions.length === 0) {
      alert("请先配置触发条件再进行测试！");
      return;
    }
    
    // 准备当前测试规则
    currentTestRule = {
      name: formRuleName.value.trim() || "未命名规则",
      conditions: conditions,
      logicOperator: logicOp,
      analysisContent: formAnalysisContent.value.trim(),
      suggestionContent: formSuggestionContent.value.trim(),
      outputType: formOutputType.value
    };
    
    // 显示规则信息
    ruleNameDisplay.textContent = currentTestRule.name;
    ruleConditionsDisplay.textContent = formatConditionsForDisplay(conditions, logicOp);
    
    // 初始化数据并加载报告列表
    filteredReports = mockPetReports;
    currentPage = 1;
    pageSize = parseInt(pageSizeSelect.value);
    renderReportsForTest();
    
    // 隐藏测试结果
    testResultsContainer.classList.add('hidden');
    
    // 显示模态框
    testModal.classList.remove('hidden');
  }
  
  // 格式化条件用于显示
  function formatConditionsForDisplay(conditions, logicOp) {
    const logicText = logicOp === 'AND' ? ' 且 ' : ' 或 ';
    return conditions.map(c => `${c.indicator} ${c.operator} ${c.value}${c.unit}`).join(logicText);
  }
  
  // 过滤报告数据
  function filterReports(searchTerm = '', healthStatus = '', testStatus = '') {
    filteredReports = mockPetReports;
    
    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredReports = filteredReports.filter(report => 
        report.reportNumber.toLowerCase().includes(term) ||
        report.petInfo.name.toLowerCase().includes(term) ||
        report.petInfo.breed.toLowerCase().includes(term) ||
        report.ownerInfo.name.toLowerCase().includes(term)
      );
    }
    
    // 健康状态过滤
    if (healthStatus) {
      if (healthStatus === 'unrated') {
        filteredReports = filteredReports.filter(report => !report.healthAssessment.level);
      } else {
        filteredReports = filteredReports.filter(report => 
          report.healthAssessment.level === healthStatus
        );
      }
    }
    
    // 检测状态过滤
    if (testStatus) {
      filteredReports = filteredReports.filter(report => 
        report.testInfo.status === testStatus
      );
    }
    
    // 重置到第一页
    currentPage = 1;
  }
  
  // 渲染测试报告列表
  function renderReportsForTest(resetPage = false) {
    if (resetPage) {
      currentPage = 1;
    }
    
    const totalReports = filteredReports.length;
    const totalPages = Math.ceil(totalReports / pageSize);
    
    // 计算当前页数据
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageReports = filteredReports.slice(startIndex, endIndex);
    
    // 更新统计信息
    reportsCount.textContent = totalReports;
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    // 渲染表格
    if (currentPageReports.length === 0) {
      reportsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-4 py-8 text-center text-gray-500">
            <i class="fas fa-search text-2xl mb-2 block"></i>
            ${totalReports === 0 ? '没有找到符合条件的报告' : '当前页没有数据'}
          </td>
        </tr>
      `;
    } else {
      reportsTableBody.innerHTML = currentPageReports.map(report => {
        const healthLevel = report.healthAssessment.level || '未评级';
        const healthColor = getHealthLevelColor(report.healthAssessment.level);
        
        return `
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-sm">
              <button onclick="showReportDetail(${report.id})" class="text-blue-600 hover:text-blue-900 underline font-medium">
                ${report.reportNumber}
              </button>
            </td>
            <td class="px-4 py-3 text-sm">
              <div class="text-gray-900">${report.petInfo.name}</div>
              <div class="text-gray-500 text-xs">${report.petInfo.breed} • ${report.petInfo.age}岁 • ${report.petInfo.gender === 'male' ? '公' : '母'}</div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">${report.ownerInfo.name}</td>
            <td class="px-4 py-3 text-sm">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthColor}">
                ${healthLevel}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">${report.testInfo.testDate}</td>
            <td class="px-4 py-3 text-sm">
              <button onclick="testRuleWithReport(${report.id})" class="text-blue-600 hover:text-blue-900 text-sm font-medium">
                选择测试
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
    
    // 更新分页按钮状态
    updatePaginationButtons(totalPages);
  }
  
  // 更新分页按钮
  function updatePaginationButtons(totalPages) {
    // 更新上一页/下一页按钮状态
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // 生成页码按钮
    pageNumbersDiv.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // 计算显示的页码范围
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // 如果当前页靠近开始，显示更多后面的页码
    if (currentPage <= 3) {
      endPage = Math.min(totalPages, 5);
    }
    
    // 如果当前页靠近结束，显示更多前面的页码
    if (currentPage >= totalPages - 2) {
      startPage = Math.max(1, totalPages - 4);
    }
    
    // 添加第一页
    if (startPage > 1) {
      addPageButton(1);
      if (startPage > 2) {
        pageNumbersDiv.innerHTML += '<span class="px-2 py-1 text-gray-500">...</span>';
      }
    }
    
    // 添加页码按钮
    for (let i = startPage; i <= endPage; i++) {
      addPageButton(i);
    }
    
    // 添加最后一页
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbersDiv.innerHTML += '<span class="px-2 py-1 text-gray-500">...</span>';
      }
      addPageButton(totalPages);
    }
  }
  
  // 添加页码按钮
  function addPageButton(pageNum) {
    const isActive = pageNum === currentPage;
    const button = document.createElement('button');
    button.className = `px-3 py-1 text-sm border rounded ${isActive ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;
    button.textContent = pageNum;
    button.onclick = () => goToPage(pageNum);
    pageNumbersDiv.appendChild(button);
  }
  
  // 跳转到指定页
  function goToPage(pageNum) {
    currentPage = pageNum;
    renderReportsForTest();
  }
  
  // 更新每页显示数量
  function updatePageSize(newSize) {
    pageSize = parseInt(newSize);
    currentPage = 1;
    renderReportsForTest();
  }
  
  // 获取健康等级颜色
  function getHealthLevelColor(level) {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  // 使用选中的报告测试规则
  window.testRuleWithReport = function(reportId) {
    const report = mockPetReports.find(r => r.id === reportId);
    if (!report) return;
    
    // 评估每个条件
    const results = currentTestRule.conditions.map(condition => {
      const testValue = report.testData[condition.indicator];
      if (testValue === undefined) {
        return {
          condition,
          result: null,
          message: `报告中未找到指标"${condition.indicator}"`
        };
      }
      
      let result = false;
      switch (condition.operator) {
        case '>': result = testValue > condition.value; break;
        case '>=': result = testValue >= condition.value; break;
        case '<': result = testValue < condition.value; break;
        case '<=': result = testValue <= condition.value; break;
        case '=': result = testValue === condition.value; break;
        case '!=': result = testValue !== condition.value; break;
      }
      
      return {
        condition,
        testValue,
        result,
        message: `${condition.indicator}: ${testValue}${condition.unit} ${condition.operator} ${condition.value}${condition.unit} = ${result ? '✓' : '✗'}`
      };
    });
    
    // 计算最终结果
    const finalResult = currentTestRule.logicOperator === 'AND' ? 
      results.every(r => r.result === true) : 
      results.some(r => r.result === true);
    
    // 显示测试结果
    displayTestResults(report, results, finalResult);
  }
  
  // 显示测试结果
  function displayTestResults(report, results, finalResult) {
    let resultHtml = `
      <div class="bg-white border rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h5 class="font-medium text-gray-900">测试报告：${report.reportNumber}</h5>
            <span class="text-sm text-gray-500">${report.petInfo.name} (${report.petInfo.breed})</span>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="closeTestResults()" class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
              <i class="fas fa-redo mr-1"></i>重新选择报告
            </button>
            <button onclick="closeTestResults()" class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">
              <i class="fas fa-times mr-1"></i>关闭结果
            </button>
          </div>
        </div>
        
        <div class="space-y-3">
          <div class="flex items-center">
            <span class="text-sm text-gray-600">规则匹配结果:</span>
            <span class="ml-2 px-3 py-1 rounded-full text-sm font-medium ${finalResult ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              ${finalResult ? '✓ 匹配成功' : '✗ 不匹配'}
            </span>
          </div>
          
          <div class="bg-gray-50 p-3 rounded-lg">
            <div class="text-sm text-gray-600 mb-2"><strong>条件评估详情:</strong></div>
            <div class="space-y-1">
              ${results.map(r => `
                <div class="text-xs flex items-center ${r.result === null ? 'text-yellow-600' : r.result ? 'text-green-600' : 'text-red-600'}">
                  <i class="fas ${r.result === null ? 'fa-question-circle' : r.result ? 'fa-check-circle' : 'fa-times-circle'} mr-2"></i>
                  ${r.message}
                </div>
              `).join('')}
            </div>
            <div class="text-xs text-gray-500 mt-2">
              <strong>逻辑关系:</strong> ${currentTestRule.logicOperator === 'AND' ? '所有条件都必须满足' : '任意条件满足即可'}
            </div>
          </div>
        </div>
      </div>
    `;
    
    if (finalResult) {
      if (currentTestRule.outputType === 'analysis' || currentTestRule.outputType === 'both') {
        if (currentTestRule.analysisContent) {
          resultHtml += `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
              <h6 class="font-medium text-green-900 mb-2">
                <i class="fas fa-microscope mr-2"></i>分析内容
              </h6>
              <p class="text-sm text-green-800">${currentTestRule.analysisContent}</p>
            </div>
          `;
        }
      }
      
      if (currentTestRule.outputType === 'suggestion' || currentTestRule.outputType === 'both') {
        if (currentTestRule.suggestionContent) {
          resultHtml += `
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-3">
              <h6 class="font-medium text-orange-900 mb-2">
                <i class="fas fa-lightbulb mr-2"></i>建议内容
              </h6>
              <p class="text-sm text-orange-800">${currentTestRule.suggestionContent}</p>
            </div>
          `;
        }
      }
    } else {
      resultHtml += `
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
          <p class="text-sm text-gray-600">
            <i class="fas fa-info-circle mr-2"></i>
            该报告不满足规则条件，不会触发分析建议内容。
          </p>
        </div>
      `;
    }
    
    testResultsContent.innerHTML = resultHtml;
    testResultsContainer.classList.remove('hidden');
  }
  
  // 关闭测试结果
  window.closeTestResults = function() {
    testResultsContainer.classList.add('hidden');
    testResultsContent.innerHTML = '';
    
    // 滚动回到表格顶部，方便用户选择其他报告
    const tableContainer = document.querySelector('.flex-1.overflow-auto');
    if (tableContainer) {
      tableContainer.scrollTop = 0;
    }
  }
  
  // 显示报告详情
  window.showReportDetail = function(reportId) {
    const report = mockPetReports.find(r => r.id === reportId);
    if (!report) return;
    
    // 填充基本信息
    document.getElementById('detail-report-number').textContent = report.reportNumber;
    document.getElementById('detail-pet-info').textContent = `${report.petInfo.name} (${report.petInfo.breed}, ${report.petInfo.age}岁, ${report.petInfo.gender === 'male' ? '公' : '母'})`;
    document.getElementById('detail-owner-info').textContent = report.ownerInfo.name;
    document.getElementById('detail-test-date').textContent = report.testInfo.testDate;
    
    // 健康等级
    const healthLevel = report.healthAssessment.level || '未评级';
    const healthColor = getHealthLevelColor(report.healthAssessment.level);
    const healthElement = document.getElementById('detail-health-level');
    healthElement.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthColor}">${healthLevel}</span>`;
    
    // 检测状态
    const statusElement = document.getElementById('detail-test-status');
    const statusText = getTestStatusText(report.testInfo.status);
    const statusColor = getTestStatusColorClass(report.testInfo.status);
    statusElement.innerHTML = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">${statusText}</span>`;
    
    // 初始化标签页
    switchDetailTab('overview');
    
    // 渲染内容
    renderDetailOverview(report);
    renderDetailPhylum(report);
    renderDetailGenus(report);
    
    // 显示模态框
    reportDetailModal.classList.remove('hidden');
  }
  
  // 关闭报告详情
  function closeReportDetailModal() {
    reportDetailModal.classList.add('hidden');
  }
  
  // 切换详情标签页
  function switchDetailTab(tabName) {
    // 更新标签页按钮状态
    detailTabBtns.forEach(btn => {
      btn.classList.remove('text-blue-600', 'border-blue-600');
      btn.classList.add('text-gray-600', 'border-transparent');
    });
    
    // 隐藏所有内容
    detailTabContents.forEach(content => {
      content.classList.add('hidden');
    });
    
    // 显示选中的标签页
    const activeBtn = document.getElementById(`detail-tab-${tabName}`);
    const activeContent = document.getElementById(`detail-${tabName}-content`);
    
    if (activeBtn && activeContent) {
      activeBtn.classList.remove('text-gray-600', 'border-transparent');
      activeBtn.classList.add('text-blue-600', 'border-blue-600');
      activeContent.classList.remove('hidden');
    }
  }
  
  // 渲染概览内容
  function renderDetailOverview(report) {
    const keyMetrics = document.getElementById('detail-key-metrics');
    
    // 获取关键指标
    const metrics = [
      { name: '有益菌总量', value: report.testData['有益菌总量'], range: [60, 85], unit: '%' },
      { name: '有害菌总量', value: report.testData['有害菌总量'], range: [5, 15], unit: '%' },
      { name: '放线菌门', value: report.testData['放线菌门'], range: [30, 50], unit: '%' },
      { name: '拟杆菌门', value: report.testData['拟杆菌门'], range: [25, 45], unit: '%' },
      { name: '双歧杆菌', value: report.testData['双歧杆菌'], range: [15, 35], unit: '%' },
      { name: '大肠杆菌', value: report.testData['大肠杆菌'], range: [0, 10], unit: '%' }
    ];
    
    keyMetrics.innerHTML = metrics.map(metric => {
      const isNormal = metric.value >= metric.range[0] && metric.value <= metric.range[1];
      const statusColor = isNormal ? 'text-green-600' : 'text-red-600';
      const statusIcon = isNormal ? 'fa-check-circle' : 'fa-exclamation-triangle';
      const statusText = isNormal ? '正常' : '异常';
      
      return `
        <div class="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
          <div class="flex items-center">
            <span class="text-sm text-gray-700">${metric.name}</span>
            <i class="fas ${statusIcon} ml-2 ${statusColor} text-xs"></i>
          </div>
          <div class="text-right">
            <span class="text-sm font-medium">${metric.value}${metric.unit}</span>
            <div class="text-xs text-gray-500">
              正常: ${metric.range[0]}-${metric.range[1]}${metric.unit}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // 渲染门指标内容
  function renderDetailPhylum(report) {
    const phylumData = document.getElementById('detail-phylum-data');
    
    phylumData.innerHTML = Object.entries(microbiotaStructure.phylum).map(([key, phylum]) => {
      const value = report.testData[key] || 0;
      const isNormal = value >= phylum.normalRange[0] && value <= phylum.normalRange[1];
      const statusColor = isNormal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
      const statusText = isNormal ? '正常' : '异常';
      
      return `
        <div class="bg-white border rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <h5 class="font-medium text-gray-900">${phylum.name}</h5>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
              ${statusText}
            </span>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">检测值：</span>
              <span class="text-sm font-medium">${value}${phylum.unit}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">正常范围：</span>
              <span class="text-sm text-gray-700">${phylum.normalRange[0]}-${phylum.normalRange[1]}${phylum.unit}</span>
            </div>
            <div class="text-sm text-gray-600 mt-2">
              ${phylum.description}
            </div>
            ${phylum.genera.length > 0 ? `
              <div class="text-xs text-gray-500 mt-2">
                <strong>包含属：</strong>${phylum.genera.join('、')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  
  // 渲染属指标内容
  function renderDetailGenus(report) {
    const genusData = document.getElementById('detail-genus-data');
    
    const genusIndicators = ['双歧杆菌', '短双歧杆菌', '乳酸菌', '拟杆菌', '大肠杆菌'];
    
    genusData.innerHTML = genusIndicators.map(indicator => {
      const value = report.testData[indicator] || 0;
      // 简化的正常范围判断
      let normalRange, category;
      switch (indicator) {
        case '双歧杆菌':
          normalRange = [15, 35];
          category = 'beneficial';
          break;
        case '短双歧杆菌':
          normalRange = [10, 25];
          category = 'beneficial';
          break;
        case '乳酸菌':
          normalRange = [10, 25];
          category = 'beneficial';
          break;
        case '拟杆菌':
          normalRange = [15, 30];
          category = 'neutral';
          break;
        case '大肠杆菌':
          normalRange = [0, 10];
          category = 'harmful';
          break;
        default:
          normalRange = [0, 100];
          category = 'neutral';
      }
      
      const isNormal = value >= normalRange[0] && value <= normalRange[1];
      const statusColor = isNormal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
      const statusText = isNormal ? '正常' : '异常';
      
      const categoryColor = category === 'beneficial' ? 'text-green-600' : 
                           category === 'harmful' ? 'text-red-600' : 'text-gray-600';
      const categoryText = category === 'beneficial' ? '有益菌' : 
                          category === 'harmful' ? '有害菌' : '中性菌';
      
      return `
        <div class="bg-white border rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <h5 class="font-medium text-gray-900">${indicator}</h5>
              <span class="ml-2 text-xs ${categoryColor}">(${categoryText})</span>
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
              ${statusText}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">检测值：</span>
            <span class="text-sm font-medium">${value}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">正常范围：</span>
            <span class="text-sm text-gray-700">${normalRange[0]}-${normalRange[1]}%</span>
          </div>
        </div>
      `;
    }).join('');
    
    // 添加汇总指标
    genusData.innerHTML += microbiotaStructure.summary.map(summary => {
      const value = report.testData[summary.key] || 0;
      const isNormal = value >= summary.normalRange[0] && value <= summary.normalRange[1];
      const statusColor = isNormal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
      const statusText = isNormal ? '正常' : '异常';
      
      const categoryColor = summary.category === 'beneficial' ? 'text-green-600' : 'text-red-600';
      
      return `
        <div class="bg-white border rounded-lg p-4 border-l-4 ${summary.category === 'beneficial' ? 'border-l-green-500' : 'border-l-red-500'}">
          <div class="flex items-center justify-between mb-3">
            <h5 class="font-medium text-gray-900 ${categoryColor}">${summary.name}</h5>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}">
              ${statusText}
            </span>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">检测值：</span>
              <span class="text-sm font-medium">${value}${summary.unit}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">正常范围：</span>
              <span class="text-sm text-gray-700">${summary.normalRange[0]}-${summary.normalRange[1]}${summary.unit}</span>
            </div>
            <div class="text-sm text-gray-600 mt-2">
              ${summary.description}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // 获取检测状态文本
  function getTestStatusText(status) {
    switch (status) {
      case 'completed': return '已完成';
      case 'reviewed': return '已审核';
      case 'processing': return '检测中';
      case 'pending': return '待处理';
      default: return '未知';
    }
  }
  
  // 获取检测状态颜色类
  function getTestStatusColorClass(status) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // 事件监听器
  addNewRuleButton.addEventListener("click", () => {
    showFormView(false);
  });

  backToListButton.addEventListener("click", showMainView);
  cancelFormButton.addEventListener("click", showMainView);

  // 搜索和筛选
  searchInput.addEventListener("input", (e) => {
    renderTable(e.target.value.trim(), filterStatus.value, filterType.value);
  });

  filterStatus.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), e.target.value, filterType.value);
  });

  filterType.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), filterStatus.value, e.target.value);
  });

  // 条件管理
  addConditionBtn.addEventListener("click", () => {
    addCondition();
  });

  // 规则测试
  testRuleBtn.addEventListener("click", testRule);
  
  // 测试模态框事件
  closeTestModal.addEventListener("click", () => {
    testModal.classList.add('hidden');
  });
  
  cancelTest.addEventListener("click", () => {
    testModal.classList.add('hidden');
  });
  
  // 搜索和筛选报告
  searchReports.addEventListener("input", (e) => {
    filterReports(e.target.value.trim(), filterHealthStatus.value, filterTestStatus.value);
    renderReportsForTest(true);
  });
  
  filterHealthStatus.addEventListener("change", (e) => {
    filterReports(searchReports.value.trim(), e.target.value, filterTestStatus.value);
    renderReportsForTest(true);
  });
  
  filterTestStatus.addEventListener("change", (e) => {
    filterReports(searchReports.value.trim(), filterHealthStatus.value, e.target.value);
    renderReportsForTest(true);
  });
  
  refreshReports.addEventListener("click", () => {
    searchReports.value = '';
    filterHealthStatus.value = '';
    filterTestStatus.value = '';
    filteredReports = mockPetReports;
    renderReportsForTest(true);
  });
  
  // 报告详情模态框事件
  closeReportDetail.addEventListener("click", closeReportDetailModal);
  closeReportDetailBtn.addEventListener("click", closeReportDetailModal);
  
  // 详情标签页切换事件
  document.getElementById('detail-tab-overview').addEventListener("click", () => switchDetailTab('overview'));
  document.getElementById('detail-tab-phylum').addEventListener("click", () => switchDetailTab('phylum'));
  document.getElementById('detail-tab-genus').addEventListener("click", () => switchDetailTab('genus'));
  
  // 分页控件事件
  pageSizeSelect.addEventListener("change", (e) => {
    updatePageSize(e.target.value);
  });
  
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  });
  
  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredReports.length / pageSize);
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  });

  // 表单提交
  ruleForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validateRule()) {
      return;
    }

    const conditions = getFormConditions();
    const ruleData = {
      name: formRuleName.value.trim(),
      description: formRuleDescription.value.trim(),
      conditions: conditions,
      logicOperator: logicOperator.value,
      analysisContent: formAnalysisContent.value.trim(),
      suggestionContent: formSuggestionContent.value.trim(),
      outputType: formOutputType.value,
      isActive: formRuleActive.checked
    };

    if (currentEditIndex >= 0) {
      // 编辑
      analysisRules[currentEditIndex] = {
        ...analysisRules[currentEditIndex],
        ...ruleData,
        updatedAt: new Date().toLocaleString('zh-CN')
      };
    } else {
      // 新增
      analysisRules.push({
        id: generateId(),
        ...ruleData,
        createdAt: new Date().toLocaleString('zh-CN'),
        updatedAt: new Date().toLocaleString('zh-CN')
      });
    }

    showMainView();
  });

  // 表格操作事件代理
  tableBody.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    const id = parseInt(button.dataset.id);
    const rule = analysisRules.find(r => r.id === id);

    if (button.classList.contains("edit-rule")) {
      showFormView(true, id);
    } else if (button.classList.contains("toggle-status")) {
      if (rule) {
        const ruleIndex = analysisRules.findIndex(r => r.id === id);
        analysisRules[ruleIndex].isActive = !analysisRules[ruleIndex].isActive;
        analysisRules[ruleIndex].updatedAt = new Date().toLocaleString('zh-CN');
        renderTable(searchInput.value.trim(), filterStatus.value, filterType.value);
      }
    } else if (button.classList.contains("test-rule")) {
      if (rule) {
        // 使用现有规则进行测试
        currentTestRule = rule;
        
        // 显示规则信息
        ruleNameDisplay.textContent = rule.name;
        ruleConditionsDisplay.textContent = formatConditionsForDisplay(rule.conditions, rule.logicOperator);
        
        // 初始化数据并加载报告列表
        filteredReports = mockPetReports;
        currentPage = 1;
        pageSize = parseInt(pageSizeSelect.value);
        renderReportsForTest();
        
        // 隐藏测试结果
        testResultsContainer.classList.add('hidden');
        
        // 显示模态框
        testModal.classList.remove('hidden');
      }
    } else if (button.classList.contains("delete-rule")) {
      if (rule && confirm(`确定要删除规则"${rule.name}"吗？\n删除后将无法恢复。`)) {
        analysisRules = analysisRules.filter((r) => r.id !== id);
        renderTable(searchInput.value.trim(), filterStatus.value, filterType.value);
      }
    }
  });

  // 初始化
  showMainView();
}

// 如果 DOM 已加载完成，立即执行；否则等待 DOMContentLoaded 事件
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAnalysisRules);
} else {
  initAnalysisRules();
}
