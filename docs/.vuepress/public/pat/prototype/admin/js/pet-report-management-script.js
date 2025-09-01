function initPetReportManagement() {
  // DOM 元素
  const mainView = document.getElementById("main-view");
  const formView = document.getElementById("form-view");
  const importView = document.getElementById("import-view");
  const formTitle = document.getElementById("form-title");
  const searchInput = document.getElementById("search-report");
  const filterHealthLevel = document.getElementById("filter-health-level");
  const filterStatus = document.getElementById("filter-status");
  const tableBody = document.getElementById("report-table-body");
  const addNewReportButton = document.getElementById("add-new-report");
  const batchImportButton = document.getElementById("batch-import-btn");
  const backToListButton = document.getElementById("back-to-list");
  const backToListFromImportButton = document.getElementById("back-to-list-from-import");
  const reportForm = document.getElementById("report-form");
  const cancelFormButton = document.getElementById("cancel-form");

  // 健康评级模态框元素
  const healthRatingModal = document.getElementById("health-rating-modal");
  const closeRatingModalBtn = document.getElementById("close-rating-modal");
  const ratingPetInfo = document.getElementById("rating-pet-info");
  const healthLevelBtns = document.querySelectorAll(".health-level-btn");
  const healthScoreInput = document.getElementById("health-score-input");
  const cancelRatingBtn = document.getElementById("cancel-rating");
  const saveRatingBtn = document.getElementById("save-rating");

  // 宠物选择相关字段
  const formPetSelect = document.getElementById("form-pet-select");
  const selectFromPetsBtn = document.getElementById("select-from-pets-btn");
  const manualInputPetBtn = document.getElementById("manual-input-pet-btn");
  const petSelectionArea = document.getElementById("pet-selection-area");
  const petDetailsArea = document.getElementById("pet-details-area");
  const manualPetInputs = document.getElementById("manual-pet-inputs");
  
  // 宠物表单字段（自动填充）
  const formPetName = document.getElementById("form-pet-name");
  const formPetBreed = document.getElementById("form-pet-breed");
  const formPetAge = document.getElementById("form-pet-age");
  const formPetGender = document.getElementById("form-pet-gender");
  
  // 手动输入宠物字段
  const manualPetName = document.getElementById("manual-pet-name");
  const manualPetBreed = document.getElementById("manual-pet-breed");
  const manualPetAge = document.getElementById("manual-pet-age");
  const manualPetGender = document.getElementById("manual-pet-gender");
  
  // 客户选择相关字段
  const formCustomerSelect = document.getElementById("form-customer-select");
  const selectFromCustomersBtn = document.getElementById("select-from-customers-btn");
  const manualInputOwnerBtn = document.getElementById("manual-input-owner-btn");
  const customerSelectionArea = document.getElementById("customer-selection-area");
  const ownerDetailsArea = document.getElementById("owner-details-area");
  const manualOwnerInputs = document.getElementById("manual-owner-inputs");
  const linkInfo = document.getElementById("link-info");
  const linkInfoText = document.getElementById("link-info-text");
  
  // 主人表单字段（自动填充）
  const formOwnerName = document.getElementById("form-owner-name");
  const formOwnerPhone = document.getElementById("form-owner-phone");
  const formOwnerAddress = document.getElementById("form-owner-address");
  
  // 手动输入主人字段
  const manualOwnerName = document.getElementById("manual-owner-name");
  const manualOwnerPhone = document.getElementById("manual-owner-phone");
  const manualOwnerAddress = document.getElementById("manual-owner-address");
  
  // 其他表单字段
  const formSampleType = document.getElementById("form-sample-type");
  const formTestDate = document.getElementById("form-test-date");
  const formStatus = document.getElementById("form-status");
  const formHealthLevel = document.getElementById("form-health-level");
  const formHealthScore = document.getElementById("form-health-score");
  const formHealthAdvice = document.getElementById("form-health-advice");
  
  // 检测数据编辑相关
  const editTabs = document.getElementById("edit-tabs");
  const phylumEditContainer = document.getElementById("phylum-edit-container");
  const genusEditContainer = document.getElementById("genus-edit-container");

  // 批量导入相关
  const importFile = document.getElementById("import-file");
  const fileDropZone = document.getElementById("file-drop-zone");
  const fileSelected = document.getElementById("file-selected");
  const selectedFileName = document.getElementById("selected-file-name");
  const removeFileButton = document.getElementById("remove-file");
  const importPreview = document.getElementById("import-preview");
  const startImportButton = document.getElementById("start-import");
  const cancelImportButton = document.getElementById("cancel-import");
  
  // 报告详情模态框相关
  const reportDetailModal = document.getElementById("report-detail-modal");
  const closeDetailModal = document.getElementById("close-detail-modal");
  const closeDetailBtn = document.getElementById("close-detail-btn");
  const exportReportBtn = document.getElementById("export-report-btn");
  const reportDetailHeader = document.getElementById("report-detail-header");
  const detailTabs = document.getElementById("detail-tabs");
  
  // Tab内容区域
  const overviewBasicInfo = document.getElementById("overview-basic-info");
  const overviewHealthAssessment = document.getElementById("overview-health-assessment");
  const overviewKeyMetrics = document.getElementById("overview-key-metrics");
  const tabPhylum = document.getElementById("tab-phylum");
  const tabGenus = document.getElementById("tab-genus");
  const matchedRules = document.getElementById("matched-rules");
  const analysisContent = document.getElementById("analysis-content");
  const suggestionContent = document.getElementById("suggestion-content");

  // 数据存储
  let petReports = [];
  let pets = []; // 从宠物信息模块获取
  let customers = []; // 从客户管理模块获取
  let currentEditIndex = -1; // -1 表示新增，>=0 表示编辑
  let isManualPetMode = false; // 宠物输入模式：false=选择模式，true=手动模式
  let isManualOwnerMode = false; // 主人输入模式：false=自动模式，true=手动模式
  let currentSelectedPetId = null; // 当前选择的宠物ID
  let currentRatingReportId = null; // 当前评级的报告ID
  let currentSelectedCustomerId = null; // 当前选择的客户ID

  // 健康等级配置（从健康值管理模块获取）
  const healthLevels = {
    'A': { name: '优秀', color: '#22c55e', scoreRange: [90, 100] },
    'B': { name: '良好', color: '#84cc16', scoreRange: [75, 89] },
    'C': { name: '一般', color: '#f59e0b', scoreRange: [60, 74] },
    'D': { name: '较差', color: '#ef4444', scoreRange: [0, 59] }
  };
  
  // 门和属的配置信息 - 层级结构
  const microbiotaStructure = {
    phylum: {
      '放线菌门': {
        name: '放线菌门',
        key: '放线菌门',
        normalRange: [30, 50],
        unit: '%',
        category: 'beneficial',
        description: '主要包含有益菌群，对肠道健康有重要作用',
        genera: [
          { key: '双歧杆菌', name: '双歧杆菌', normalRange: [15, 35], unit: '%', category: 'beneficial' },
          { key: '短双歧杆菌', name: '短双歧杆菌', normalRange: [8, 20], unit: '%', category: 'beneficial' },
          { key: '长双歧杆菌', name: '长双歧杆菌', normalRange: [5, 15], unit: '%', category: 'beneficial' },
          { key: '青春双歧杆菌', name: '青春双歧杆菌', normalRange: [3, 12], unit: '%', category: 'beneficial' }
        ]
      },
      '拟杆菌门': {
        name: '拟杆菌门',
        key: '拟杆菌门',
        normalRange: [25, 45],
        unit: '%',
        category: 'beneficial',
        description: '重要的有益菌群，参与营养代谢和免疫调节',
        genera: [
          { key: '拟杆菌', name: '拟杆菌', normalRange: [12, 28], unit: '%', category: 'beneficial' },
          { key: '普氏菌', name: '普氏菌', normalRange: [8, 18], unit: '%', category: 'beneficial' },
          { key: '普雷沃菌', name: '普雷沃菌', normalRange: [3, 10], unit: '%', category: 'neutral' },
          { key: '脆弱拟杆菌', name: '脆弱拟杆菌', normalRange: [5, 15], unit: '%', category: 'beneficial' },
          { key: '多形拟杆菌', name: '多形拟杆菌', normalRange: [2, 8], unit: '%', category: 'beneficial' }
        ]
      },
      '厚壁菌门': {
        name: '厚壁菌门',
        key: '厚壁菌门',
        normalRange: [20, 40],
        unit: '%',
        category: 'neutral',
        description: '包含多种益生菌和致病菌，菌群平衡很重要',
        genera: [
          { key: '乳酸菌', name: '乳酸菌', normalRange: [10, 25], unit: '%', category: 'beneficial' },
          { key: '嗜酸乳杆菌', name: '嗜酸乳杆菌', normalRange: [5, 15], unit: '%', category: 'beneficial' },
          { key: '肠球菌', name: '肠球菌', normalRange: [3, 12], unit: '%', category: 'neutral' },
          { key: '链球菌', name: '链球菌', normalRange: [2, 10], unit: '%', category: 'neutral' },
          { key: '韦荣球菌', name: '韦荣球菌', normalRange: [2, 8], unit: '%', category: 'neutral' },
          { key: '毛螺菌', name: '毛螺菌', normalRange: [1, 6], unit: '%', category: 'neutral' },
          { key: '柔嫩梭菌', name: '柔嫩梭菌', normalRange: [1, 5], unit: '%', category: 'neutral' },
          { key: '梭菌', name: '梭菌', normalRange: [0, 5], unit: '%', category: 'harmful' },
          { key: '金黄色葡萄球菌', name: '金黄色葡萄球菌', normalRange: [0, 3], unit: '%', category: 'harmful' },
          { key: '产气荚膜梭菌', name: '产气荚膜梭菌', normalRange: [0, 2], unit: '%', category: 'harmful' },
          { key: '艰难梭菌', name: '艰难梭菌', normalRange: [0, 1], unit: '%', category: 'harmful' }
        ]
      },
      '变形菌门': {
        name: '变形菌门',
        key: '变形菌门',
        normalRange: [5, 15],
        unit: '%',
        category: 'harmful',
        description: '主要包含条件致病菌和病原菌，数量应控制在较低水平',
        genera: [
          { key: '大肠杆菌', name: '大肠杆菌', normalRange: [0, 8], unit: '%', category: 'harmful' },
          { key: '沙门氏菌', name: '沙门氏菌', normalRange: [0, 3], unit: '%', category: 'harmful' },
          { key: '志贺菌', name: '志贺菌', normalRange: [0, 2], unit: '%', category: 'harmful' },
          { key: '弯曲杆菌', name: '弯曲杆菌', normalRange: [0, 2], unit: '%', category: 'harmful' },
          { key: '幽门螺杆菌', name: '幽门螺杆菌', normalRange: [0, 1], unit: '%', category: 'harmful' },
          { key: '肺炎克雷伯菌', name: '肺炎克雷伯菌', normalRange: [0, 2], unit: '%', category: 'harmful' },
          { key: '铜绿假单胞菌', name: '铜绿假单胞菌', normalRange: [0, 1], unit: '%', category: 'harmful' }
        ]
      },
      '蓝藻菌门': {
        name: '蓝藻菌门',
        key: '蓝藻菌门',
        normalRange: [2, 8],
        unit: '%',
        category: 'neutral',
        description: '环境菌群，正常情况下数量较少',
        genera: [
          { key: '螺旋藻', name: '螺旋藻', normalRange: [1, 4], unit: '%', category: 'neutral' },
          { key: '小球藻', name: '小球藻', normalRange: [0.5, 3], unit: '%', category: 'neutral' }
        ]
      }
    },
    // 统计指标（不归属于特定门）
    summary: [
      { key: '有益菌总量', name: '有益菌总量', normalRange: [60, 85], unit: '%', category: 'beneficial' },
      { key: '有害菌总量', name: '有害菌总量', normalRange: [0, 10], unit: '%', category: 'harmful' },
      { key: '中性菌总量', name: '中性菌总量', normalRange: [10, 30], unit: '%', category: 'neutral' }
    ]
  };

  // 初始化基础数据（模拟从其他模块获取）
  pets = [
    {
      id: 1, name: "小花", nickname: "花花", majorBreed: "猫", minorBreed: "英国短毛猫",
      birthDate: "2021-03-15", gender: "female", currentOwnerId: 1
    },
    {
      id: 2, name: "阿黄", nickname: "大黄", majorBreed: "狗", minorBreed: "金毛寻回犬",
      birthDate: "2020-01-10", gender: "male", currentOwnerId: 2
    },
    {
      id: 3, name: "咪咪", nickname: "", majorBreed: "猫", minorBreed: "布偶猫",
      birthDate: "2023-06-01", gender: "female", currentOwnerId: 3
    }
  ];
  
  customers = [
    {
      id: 1, name: "张女士", phone: "13812345678", 
      address: "北京市朝阳区某某小区1号楼101室"
    },
    {
      id: 2, name: "李先生", phone: "13987654321", 
      address: "上海市浦东新区某某路88号"
    },
    {
      id: 3, name: "王女士", phone: "13666888999", 
      address: "广州市天河区某某大厦2301室"
    },
    {
      id: 4, name: "陈先生", phone: "13555777888", 
      address: "成都市锦江区某某街道123号"
    }
  ];

  // 生成完整的检测数据
  function generateFullTestData(isHealthy = true) {
    const testData = {};
    
    // 生成门指标数据
    Object.entries(microbiotaStructure.phylum).forEach(([phylumKey, phylum]) => {
      const [min, max] = phylum.normalRange;
      if (isHealthy) {
        // 健康情况下在正常范围内
        testData[phylumKey] = parseFloat((Math.random() * (max - min) + min).toFixed(1));
      } else {
        // 不健康情况下可能超出正常范围
        const deviation = Math.random() < 0.7 ? (Math.random() * 20 - 10) : 0; // 70%概率异常
        const value = Math.random() * (max - min) + min + deviation;
        testData[phylumKey] = parseFloat(Math.max(0, Math.min(100, value)).toFixed(1));
      }
      
      // 生成该门下的属指标数据
      phylum.genera.forEach(genus => {
        const [genusMin, genusMax] = genus.normalRange;
        if (isHealthy) {
          testData[genus.key] = parseFloat((Math.random() * (genusMax - genusMin) + genusMin).toFixed(1));
        } else {
          const deviation = Math.random() < 0.6 ? (Math.random() * 15 - 7.5) : 0; // 60%概率异常
          const value = Math.random() * (genusMax - genusMin) + genusMin + deviation;
          testData[genus.key] = parseFloat(Math.max(0, Math.min(100, value)).toFixed(1));
        }
      });
    });
    
    // 生成统计指标数据
    microbiotaStructure.summary.forEach(indicator => {
      const [min, max] = indicator.normalRange;
      if (isHealthy) {
        testData[indicator.key] = parseFloat((Math.random() * (max - min) + min).toFixed(1));
      } else {
        const deviation = Math.random() < 0.5 ? (Math.random() * 20 - 10) : 0;
        const value = Math.random() * (max - min) + min + deviation;
        testData[indicator.key] = parseFloat(Math.max(0, Math.min(100, value)).toFixed(1));
      }
    });
    
    return testData;
  }

  // 初始化测试数据
  petReports = [
    {
      id: 1,
      reportNumber: "RPT202501001",
      petInfo: {
        name: "小花",
        breed: "英国短毛猫",
        age: 3.5,
        gender: "female"
      },
      ownerInfo: {
        name: "张女士",
        phone: "13812345678",
        address: "北京市朝阳区某某小区"
      },
      testInfo: {
        sampleType: "feces",
        testDate: "2025-01-15",
        status: "completed",
        results: "肠道菌群多样性指标：Shannon指数4.2，丰富度165种，放线菌门12.3%，拟杆菌门35.2%，厚壁菌门48.5%"
      },
      testData: generateFullTestData(true), // 健康的检测数据
      healthAssessment: {
        level: "A",
        score: 92.5,
        advice: "肠道健康状况优秀，建议继续保持当前的饮食结构，定期补充益生菌。"
      },
      createdAt: "2025-01-15 09:30:00",
      updatedAt: "2025-01-15 14:20:00"
    },
    {
      id: 2,
      reportNumber: "RPT202501002",
      petInfo: {
        name: "阿黄",
        breed: "金毛寻回犬",
        age: 5.0,
        gender: "male"
      },
      ownerInfo: {
        name: "李先生",
        phone: "13987654321",
        address: "上海市浦东新区某某路"
      },
      testInfo: {
        sampleType: "feces",
        testDate: "2025-01-14",
        status: "reviewed",
        results: "肠道菌群失衡，放线菌门偏低8.1%，有害菌比例较高，炎症指标轻微异常"
      },
      testData: generateFullTestData(false), // 不健康的检测数据
      healthAssessment: {
        level: "C",
        score: 68.0,
        advice: "建议调整饮食结构，减少高脂食物，增加膳食纤维，配合益生菌调理3个月后复检。"
      },
      createdAt: "2025-01-14 11:15:00",
      updatedAt: "2025-01-14 16:45:00"
    },
    {
      id: 3,
      reportNumber: "RPT202501003",
      petInfo: {
        name: "咪咪",
        breed: "布偶猫",
        age: 2.0,
        gender: "female"
      },
      ownerInfo: {
        name: "王女士",
        phone: "13666888999",
        address: "广州市天河区某某大厦"
      },
      testInfo: {
        sampleType: "feces",
        testDate: "2025-01-13",
        status: "processing",
        results: ""
      },
      testData: generateFullTestData(true), // 健康的检测数据
      healthAssessment: {
        level: "",
        score: null,
        advice: ""
      },
      createdAt: "2025-01-13 16:20:00",
      updatedAt: "2025-01-13 16:20:00"
    }
  ];

  function generateId() {
    return Math.max(...petReports.map((r) => r.id || 0), 0) + 1;
  }

  // 健康评级相关函数
  function updateScoreByLevel(level) {
    const levelMap = {
      'A': { default: 95 },
      'B': { default: 82 },
      'C': { default: 67 },
      'D': { default: 45 }
    };
    
    if (levelMap[level]) {
      healthScoreInput.value = levelMap[level].default;
    }
  }

  function updateLevelByScore(score) {
    // 清除所有按钮的选中状态
    healthLevelBtns.forEach(btn => {
      btn.classList.remove('border-blue-500', 'bg-blue-50');
      btn.classList.add('border-gray-200');
    });
    
    // 根据分数确定等级
    let level;
    if (score >= 90) level = 'A';
    else if (score >= 75) level = 'B';
    else if (score >= 60) level = 'C';
    else level = 'D';
    
    // 设置对应按钮为选中状态
    const selectedBtn = document.querySelector(`[data-level="${level}"]`);
    if (selectedBtn) {
      selectedBtn.classList.remove('border-gray-200');
      selectedBtn.classList.add('border-blue-500', 'bg-blue-50');
    }
  }

  function showHealthRatingModal(reportId) {
    const report = petReports.find(r => r.id === reportId);
    if (!report) return;
    
    currentRatingReportId = reportId;
    
    // 填充宠物信息
    ratingPetInfo.innerHTML = `
      <i class="fas fa-paw text-blue-500 mr-2"></i>
      ${report.petInfo.name} • ${report.petInfo.breed} • ${report.ownerInfo.name}
    `;
    
    // 初始化当前评级数据
    const currentLevel = report.healthAssessment.level || 'A';
    const currentScore = report.healthAssessment.score || 85;
    
    // 设置健康等级
    healthLevelBtns.forEach(btn => {
      btn.classList.remove('border-blue-500', 'bg-blue-50');
      btn.classList.add('border-gray-200');
      if (btn.dataset.level === currentLevel) {
        btn.classList.remove('border-gray-200');
        btn.classList.add('border-blue-500', 'bg-blue-50');
      }
    });
    
    // 设置分数
    healthScoreInput.value = currentScore;
    
    // 显示模态框
    healthRatingModal.classList.remove('hidden');
    
    // 添加动画效果
    const modal = healthRatingModal.querySelector('.bg-white');
    modal.style.transform = 'scale(0.95)';
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.style.transform = 'scale(1)';
      modal.style.opacity = '1';
    }, 50);
  }

  function hideHealthRatingModal() {
    const modal = healthRatingModal.querySelector('.bg-white');
    modal.style.transform = 'scale(0.95)';
    modal.style.opacity = '0';
    setTimeout(() => {
      healthRatingModal.classList.add('hidden');
      currentRatingReportId = null;
    }, 200);
  }

  function saveHealthRating() {
    if (!currentRatingReportId) return;
    
    // 获取选中的等级
    const selectedLevelBtn = document.querySelector('.health-level-btn.border-blue-500');
    const level = selectedLevelBtn ? selectedLevelBtn.dataset.level : 'A';
    const score = parseFloat(healthScoreInput.value) || 0;
    
    // 验证分数范围
    if (score < 0 || score > 100) {
      alert('健康分数必须在0-100之间！');
      return;
    }
    
    // 更新报告数据
    const reportIndex = petReports.findIndex(r => r.id === currentRatingReportId);
    if (reportIndex >= 0) {
      petReports[reportIndex].healthAssessment.level = level;
      petReports[reportIndex].healthAssessment.score = score;
      petReports[reportIndex].updatedAt = new Date().toLocaleString('zh-CN');
      
      // 刷新表格
      renderTable(searchInput.value.trim(), filterHealthLevel.value, filterStatus.value);
      
      // 隐藏模态框
      hideHealthRatingModal();
      
      // 显示成功提示
      const petName = petReports[reportIndex].petInfo.name;
      alert(`✅ 已成功为 "${petName}" 设置健康评级：${level}级 (${score}分)`);
    }
  }

  function generateReportNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const sequence = String(petReports.length + 1).padStart(3, '0');
    return `RPT${year}${month}${day}${sequence}`;
  }
  
  function calculateAge(birthDate) {
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays}天`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}个月`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return remainingMonths > 0 ? `${years}岁${remainingMonths}个月` : `${years}岁`;
    }
  }
  
  function getCustomerById(customerId) {
    return customers.find(c => c.id === customerId);
  }
  
  function getPetById(petId) {
    return pets.find(p => p.id === petId);
  }
  
  function updatePetOptions() {
    formPetSelect.innerHTML = '<option value="">请选择宠物档案</option>';
    
    pets.forEach(pet => {
      const customer = getCustomerById(pet.currentOwnerId);
      const option = document.createElement("option");
      option.value = pet.id;
      option.textContent = `${pet.name} (${pet.majorBreed} • ${customer ? customer.name : '无主人'})`;
      formPetSelect.appendChild(option);
    });
  }
  
  function updateCustomerOptions() {
    formCustomerSelect.innerHTML = '<option value="">请选择客户档案</option>';
    
    customers.forEach(customer => {
      const option = document.createElement("option");
      option.value = customer.id;
      option.textContent = `${customer.name} (${customer.phone})`;
      formCustomerSelect.appendChild(option);
    });
  }
  
  function switchToPetSelectionMode() {
    isManualPetMode = false;
    petSelectionArea.classList.remove("hidden");
    petDetailsArea.classList.remove("hidden");
    manualPetInputs.classList.add("hidden");
    
    selectFromPetsBtn.classList.remove("bg-gray-500");
    selectFromPetsBtn.classList.add("bg-blue-500");
    manualInputPetBtn.classList.remove("bg-blue-500");
    manualInputPetBtn.classList.add("bg-gray-500");
    
    // 清空并设置字段为只读
    formPetName.value = "";
    formPetBreed.value = "";
    formPetAge.value = "";
    formPetGender.value = "";
    
    formPetName.readOnly = true;
    formPetBreed.readOnly = true;
    formPetAge.readOnly = true;
    formPetGender.readOnly = true;
    
    formPetName.classList.add("bg-gray-100");
    formPetBreed.classList.add("bg-gray-100");
    formPetAge.classList.add("bg-gray-100");
    formPetGender.classList.add("bg-gray-100");
  }
  
  function switchToPetManualMode() {
    isManualPetMode = true;
    petSelectionArea.classList.add("hidden");
    petDetailsArea.classList.add("hidden");
    manualPetInputs.classList.remove("hidden");
    
    manualInputPetBtn.classList.remove("bg-gray-500");
    manualInputPetBtn.classList.add("bg-blue-500");
    selectFromPetsBtn.classList.remove("bg-blue-500");
    selectFromPetsBtn.classList.add("bg-gray-500");
    
    // 清空手动输入字段
    manualPetName.value = "";
    manualPetBreed.value = "";
    manualPetAge.value = "";
    manualPetGender.value = "";
    
    currentSelectedPetId = null;
    linkInfo.classList.add("hidden");
  }
  
  function switchToOwnerAutoMode() {
    isManualOwnerMode = false;
    ownerDetailsArea.classList.remove("hidden");
    manualOwnerInputs.classList.add("hidden");
    
    selectFromCustomersBtn.classList.remove("bg-gray-500");
    selectFromCustomersBtn.classList.add("bg-green-500");
    manualInputOwnerBtn.classList.remove("bg-green-500");
    manualInputOwnerBtn.classList.add("bg-gray-500");
    
    // 设置字段为只读
    formOwnerName.readOnly = true;
    formOwnerPhone.readOnly = true;
    formOwnerAddress.readOnly = true;
    
    formOwnerName.classList.add("bg-gray-100");
    formOwnerPhone.classList.add("bg-gray-100");
    formOwnerAddress.classList.add("bg-gray-100");
  }
  
  function switchToOwnerManualMode() {
    isManualOwnerMode = true;
    customerSelectionArea.classList.add("hidden");
    ownerDetailsArea.classList.add("hidden");
    manualOwnerInputs.classList.remove("hidden");
    
    manualInputOwnerBtn.classList.remove("bg-gray-500");
    manualInputOwnerBtn.classList.add("bg-green-500");
    selectFromCustomersBtn.classList.remove("bg-green-500");
    selectFromCustomersBtn.classList.add("bg-gray-500");
    
    // 清空手动输入字段
    manualOwnerName.value = "";
    manualOwnerPhone.value = "";
    manualOwnerAddress.value = "";
    
    currentSelectedCustomerId = null;
    linkInfo.classList.add("hidden");
  }
  
  function fillPetInfo(pet) {
    if (!pet) return;
    
    const age = calculateAge(pet.birthDate);
    const genderDisplay = pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知';
    
    formPetName.value = pet.name;
    formPetBreed.value = `${pet.majorBreed} • ${pet.minorBreed || '未知品种'}`;
    formPetAge.value = age || '年龄未知';
    formPetGender.value = genderDisplay;
    
    // 同时填充主人信息
    if (pet.currentOwnerId) {
      const customer = getCustomerById(pet.currentOwnerId);
      if (customer) {
        fillOwnerInfo(customer);
        linkInfoText.textContent = `已关联宠物「${pet.name}」和主人「${customer.name}」`;
        linkInfo.classList.remove("hidden");
      }
    }
  }
  
  function fillOwnerInfo(customer) {
    if (!customer) return;
    
    formOwnerName.value = customer.name;
    formOwnerPhone.value = customer.phone || '';
    formOwnerAddress.value = customer.address || '';
  }

  function getStatusDisplay(status) {
    const statusMap = {
      'pending': { text: '待处理', color: 'bg-gray-100 text-gray-800' },
      'processing': { text: '检测中', color: 'bg-blue-100 text-blue-800' },
      'completed': { text: '已完成', color: 'bg-green-100 text-green-800' },
      'reviewed': { text: '已审核', color: 'bg-purple-100 text-purple-800' }
    };
    return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
  }

  function getHealthLevelDisplay(level) {
    if (!level || !healthLevels[level]) {
      return { text: '未评级', color: 'bg-gray-100 text-gray-800', badge: '' };
    }
    
    const config = healthLevels[level];
    return {
      text: `${level}级 - ${config.name}`,
      color: 'text-white',
      badge: `style="background-color: ${config.color}"`
    };
  }

  function renderTable(filter = "", healthFilter = "", statusFilter = "") {
    // 过滤数据
    let filteredReports = petReports.filter((report) => {
      const matchesSearch = !filter || 
        report.petInfo.name.toLowerCase().includes(filter.toLowerCase()) ||
        report.ownerInfo.name.toLowerCase().includes(filter.toLowerCase()) ||
        report.reportNumber.toLowerCase().includes(filter.toLowerCase());
      
      const matchesHealth = !healthFilter || report.healthAssessment.level === healthFilter;
      const matchesStatus = !statusFilter || report.testInfo.status === statusFilter;
      
      return matchesSearch && matchesHealth && matchesStatus;
    });

    // 按创建时间倒序排列
    filteredReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    tableBody.innerHTML = "";

    if (filteredReports.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-4 text-center text-gray-500">暂无报告数据</td>
        </tr>
      `;
      return;
    }

    filteredReports.forEach((report) => {
      const statusDisplay = getStatusDisplay(report.testInfo.status);
      const healthDisplay = getHealthLevelDisplay(report.healthAssessment.level);
      
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${report.reportNumber}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${report.petInfo.name}</div>
          <div class="text-sm text-gray-500">${report.petInfo.breed} • ${report.petInfo.age || '-'}岁 • ${report.petInfo.gender === 'male' ? '公' : report.petInfo.gender === 'female' ? '母' : '-'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${report.ownerInfo.name}</div>
          <div class="text-sm text-gray-500">${report.ownerInfo.phone || '-'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color}">
            ${statusDisplay.text}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthDisplay.color}" ${healthDisplay.badge}>
            ${healthDisplay.text}
          </span>
          ${report.healthAssessment.score ? `<div class="text-xs text-gray-500 mt-1">分数: ${report.healthAssessment.score}</div>` : ''}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${new Date(report.createdAt).toLocaleDateString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 mr-3 view-report" data-id="${report.id}">
            <i class="fas fa-eye mr-1"></i>查看
          </button>
          <button class="text-green-600 hover:text-green-900 mr-3 edit-report" data-id="${report.id}">
            <i class="fas fa-edit mr-1"></i>编辑
          </button>
          <button class="inline-flex items-center px-2 py-1 text-sm font-medium text-white bg-gradient-to-r from-orange-400 to-pink-500 rounded-md hover:from-orange-500 hover:to-pink-600 transition-all transform hover:scale-105 shadow-md mr-3 set-health-level" data-id="${report.id}">
            <i class="fas fa-heart mr-1"></i>评级
          </button>
          <button class="text-red-600 hover:text-red-900 delete-report" data-id="${report.id}">
            <i class="fas fa-trash mr-1"></i>删除
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  function showMainView() {
    mainView.classList.remove("hidden");
    formView.classList.add("hidden");
    importView.classList.add("hidden");
    renderTable();
  }
  

  
  // 关闭详情模态框
  function closeReportDetailModal() {
    reportDetailModal.classList.add('hidden');
  }
  
  // 切换详情Tab
  function switchDetailTab(tabName, report) {
    // 更新Tab按钮状态
    const tabButtons = detailTabs.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
      btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
      btn.classList.add('text-gray-500', 'hover:text-gray-700');
    });
    
    const activeBtn = detailTabs.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-500', 'hover:text-gray-700');
      activeBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    }
    
    // 隐藏所有Tab内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.add('hidden'));
    
    // 显示对应Tab内容
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
      targetTab.classList.remove('hidden');
      
      // 根据Tab类型渲染内容
      switch (tabName) {
        case 'overview':
          renderOverviewTab(report);
          break;
        case 'phylum':
          renderPhylumTab(report);
          break;
        case 'genus':
          renderGenusTab(report);
          break;
        case 'analysis':
          renderAnalysisTab(report);
          break;
      }
    }
  }
  
  // 渲染概览Tab
  function renderOverviewTab(report) {
    // 基本信息
    overviewBasicInfo.innerHTML = `
      <div class="text-gray-700"><strong>报告编号：</strong>${report.reportNumber}</div>
      <div class="text-gray-700"><strong>宠物姓名：</strong>${report.petInfo.name}</div>
      <div class="text-gray-700"><strong>品种：</strong>${report.petInfo.breed}</div>
      <div class="text-gray-700"><strong>年龄：</strong>${report.petInfo.age}岁</div>
      <div class="text-gray-700"><strong>性别：</strong>${report.petInfo.gender === 'male' ? '公' : '母'}</div>
      <div class="text-gray-700"><strong>主人：</strong>${report.ownerInfo.name}</div>
      <div class="text-gray-700"><strong>联系电话：</strong>${report.ownerInfo.phone}</div>
      <div class="text-gray-700"><strong>检测日期：</strong>${report.testInfo.testDate}</div>
      <div class="text-gray-700"><strong>样本类型：</strong>粪便样本</div>
    `;
    
    // 健康评估
    const healthDisplay = getHealthLevelDisplay(report.healthAssessment.level);
    overviewHealthAssessment.innerHTML = `
      <div class="text-gray-700"><strong>健康等级：</strong>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${healthDisplay.color}" ${healthDisplay.badge}>
          ${healthDisplay.text}
        </span>
      </div>
      ${report.healthAssessment.score ? `<div class="text-gray-700"><strong>健康分数：</strong>${report.healthAssessment.score}分</div>` : ''}
      <div class="text-gray-700"><strong>状态：</strong>${getStatusDisplay(report.testInfo.status).text}</div>
      ${report.healthAssessment.advice ? `<div class="text-gray-700"><strong>健康建议：</strong><br/><span class="text-sm">${report.healthAssessment.advice}</span></div>` : ''}
    `;
    
    // 关键指标概览
    renderKeyMetrics(report);
  }
  
  // 渲染关键指标
  function renderKeyMetrics(report) {
    const keyIndicators = ['放线菌门', '拟杆菌门', '厚壁菌门', '大肠杆菌', '有害菌总量'];
    
    overviewKeyMetrics.innerHTML = keyIndicators.map(indicator => {
      const value = report.testData[indicator] || 0;
      let config = null;
      
      // 先在门指标中查找
      if (microbiotaStructure.phylum[indicator]) {
        config = microbiotaStructure.phylum[indicator];
      } else {
        // 在属指标中查找
        for (const [phylumKey, phylum] of Object.entries(microbiotaStructure.phylum)) {
          const genus = phylum.genera.find(g => g.key === indicator);
          if (genus) {
            config = genus;
            break;
          }
        }
        
        // 在统计指标中查找
        if (!config) {
          config = microbiotaStructure.summary.find(s => s.key === indicator);
        }
      }
      
      if (!config) return '';
      
      const [min, max] = config.normalRange;
      const isNormal = value >= min && value <= max;
      const statusColor = isNormal ? 'text-green-600' : 'text-red-600';
      const bgColor = isNormal ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
      
      return `
        <div class="p-3 ${bgColor} border rounded-lg text-center">
          <div class="text-sm font-medium text-gray-900">${indicator}</div>
          <div class="text-lg font-bold ${statusColor}">${value}%</div>
          <div class="text-xs text-gray-500">正常: ${min}-${max}%</div>
          <div class="text-xs ${statusColor}">${isNormal ? '正常' : '异常'}</div>
        </div>
      `;
    }).join('');
  }
  
  // 渲染门指标Tab
  function renderPhylumTab(report) {
    tabPhylum.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        ${Object.entries(microbiotaStructure.phylum).map(([phylumKey, phylum]) => {
          const value = report.testData[phylumKey] || 0;
          const [min, max] = phylum.normalRange;
          const isNormal = value >= min && value <= max;
          const statusColor = isNormal ? 'text-green-600' : 'text-red-600';
          const bgColor = isNormal ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
          const categoryIcon = phylum.category === 'beneficial' ? 'fa-heart' : 
                              phylum.category === 'harmful' ? 'fa-exclamation-triangle' : 'fa-circle';
          const categoryColor = phylum.category === 'beneficial' ? 'text-green-600' : 
                               phylum.category === 'harmful' ? 'text-red-600' : 'text-yellow-600';
          
          return `
            <div class="p-4 ${bgColor} border rounded-lg">
              <div class="flex items-center justify-between mb-3">
                <h5 class="font-medium text-gray-900">${phylum.name}</h5>
                <i class="fas ${categoryIcon} ${categoryColor}"></i>
              </div>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">检测值：</span>
                  <span class="font-bold ${statusColor}">${value}%</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">正常范围：</span>
                  <span class="text-sm text-gray-500">${min}-${max}%</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">状态：</span>
                  <span class="text-sm font-medium ${statusColor}">${isNormal ? '正常' : '异常'}</span>
                </div>
                <div class="text-xs text-gray-500 mt-2 border-t pt-2">
                  ${phylum.description}
                </div>
                <div class="text-xs text-gray-400">
                  包含 ${phylum.genera.length} 种属菌
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  // 渲染属指标Tab（按门分组）
  function renderGenusTab(report) {
    tabGenus.innerHTML = `
      <div class="space-y-6">
        ${Object.entries(microbiotaStructure.phylum).map(([phylumKey, phylum]) => {
          const phylumValue = report.testData[phylumKey] || 0;
          const [phylumMin, phylumMax] = phylum.normalRange;
          const phylumIsNormal = phylumValue >= phylumMin && phylumValue <= phylumMax;
          const categoryColor = phylum.category === 'beneficial' ? 'text-green-600' : 
                               phylum.category === 'harmful' ? 'text-red-600' : 'text-yellow-600';
          const categoryBg = phylum.category === 'beneficial' ? 'bg-green-50' : 
                            phylum.category === 'harmful' ? 'bg-red-50' : 'bg-yellow-50';
          const categoryIcon = phylum.category === 'beneficial' ? 'fa-heart' : 
                              phylum.category === 'harmful' ? 'fa-exclamation-triangle' : 'fa-circle';
          
          return `
            <div class="${categoryBg} p-4 rounded-lg border">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-lg font-medium ${categoryColor}">${phylum.name}</h4>
                <div class="flex items-center space-x-3">
                  <i class="fas ${categoryIcon} ${categoryColor}"></i>
                  <span class="text-sm ${phylumIsNormal ? 'text-green-600' : 'text-red-600'} font-medium">
                    门总量: ${phylumValue}%
                  </span>
                </div>
              </div>
              <div class="text-xs text-gray-600 mb-3">${phylum.description}</div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                ${phylum.genera.map(genus => {
                  const value = report.testData[genus.key] || 0;
                  const [min, max] = genus.normalRange;
                  const isNormal = value >= min && value <= max;
                  const statusColor = isNormal ? 'text-green-600' : 'text-red-600';
                  const cardBg = isNormal ? 'bg-white border-green-200' : 'bg-white border-red-200';
                  const genusStatusColor = genus.category === 'beneficial' ? 'text-green-600' : 
                                         genus.category === 'harmful' ? 'text-red-600' : 'text-yellow-600';
                  const genusStatusIcon = genus.category === 'beneficial' ? 'fa-plus-circle' : 
                                        genus.category === 'harmful' ? 'fa-minus-circle' : 'fa-circle';
                  
                  return `
                    <div class="p-3 ${cardBg} border rounded-md">
                      <div class="flex items-center justify-between mb-2">
                        <div class="text-sm font-medium text-gray-900">${genus.name}</div>
                        <i class="fas ${genusStatusIcon} ${genusStatusColor} text-xs"></i>
                      </div>
                      <div class="space-y-1">
                        <div class="flex justify-between">
                          <span class="text-xs text-gray-600">检测值：</span>
                          <span class="text-sm font-bold ${statusColor}">${value}%</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-xs text-gray-600">正常：</span>
                          <span class="text-xs text-gray-500">${min}-${max}%</span>
                        </div>
                        <div class="text-center">
                          <span class="text-xs font-medium ${statusColor}">
                            <i class="fas ${isNormal ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1"></i>
                            ${isNormal ? '正常' : '异常'}
                          </span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
        
        <!-- 统计指标 -->
        <div class="bg-blue-50 p-4 rounded-lg border">
          <h4 class="text-lg font-medium text-blue-600 mb-4">
            <i class="fas fa-chart-pie mr-2"></i>统计指标
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${microbiotaStructure.summary.map(indicator => {
              const value = report.testData[indicator.key] || 0;
              const [min, max] = indicator.normalRange;
              const isNormal = value >= min && value <= max;
              const statusColor = isNormal ? 'text-green-600' : 'text-red-600';
              const cardBg = isNormal ? 'bg-white border-green-200' : 'bg-white border-red-200';
              const indicatorColor = indicator.category === 'beneficial' ? 'text-green-600' : 
                                   indicator.category === 'harmful' ? 'text-red-600' : 'text-yellow-600';
              
              return `
                <div class="p-4 ${cardBg} border rounded-md">
                  <div class="text-md font-medium ${indicatorColor} mb-3">${indicator.name}</div>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">检测值：</span>
                      <span class="text-lg font-bold ${statusColor}">${value}%</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">正常范围：</span>
                      <span class="text-sm text-gray-500">${min}-${max}%</span>
                    </div>
                    <div class="text-center">
                      <span class="text-sm font-medium ${statusColor}">
                        <i class="fas ${isNormal ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1"></i>
                        ${isNormal ? '正常' : '异常'}
                      </span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  // 渲染分析建议Tab
  function renderAnalysisTab(report) {
    // 获取分析规则（需要从分析规则模块获取）
    const analysisRules = getAnalysisRules();
    const evaluatedRules = evaluateReportAgainstRules(report, analysisRules);
    
    // 渲染匹配的规则
    matchedRules.innerHTML = evaluatedRules.length > 0 ? 
      evaluatedRules.map(rule => `
        <div class="border rounded-lg p-4 ${rule.matched ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}">
          <div class="flex items-center justify-between mb-2">
            <h5 class="font-medium text-gray-900">${rule.name}</h5>
            <span class="text-xs font-medium ${rule.matched ? 'text-orange-600' : 'text-gray-500'}">
              ${rule.matched ? '✓ 匹配' : '✗ 不匹配'}
            </span>
          </div>
          <div class="text-sm text-gray-600 mb-2">${rule.description}</div>
          <div class="text-xs text-gray-500">
            触发条件: ${rule.conditions.map(c => `${c.indicator} ${c.operator} ${c.value}${c.unit}`).join(rule.logicOperator === 'AND' ? ' 且 ' : ' 或 ')}
          </div>
        </div>
      `).join('') : 
      '<div class="text-center text-gray-500 py-8">暂无匹配的分析规则</div>';
    
    // 分析内容
    const analysisItems = evaluatedRules.filter(rule => rule.matched && rule.analysisContent);
    analysisContent.innerHTML = analysisItems.length > 0 ?
      analysisItems.map(rule => `
        <div class="p-3 bg-white border border-green-200 rounded">
          <div class="text-sm font-medium text-gray-900 mb-1">${rule.name}</div>
          <div class="text-sm text-gray-700">${rule.analysisContent}</div>
        </div>
      `).join('') :
      '<div class="text-center text-gray-500 py-4">暂无分析内容</div>';
    
    // 建议内容  
    const suggestionItems = evaluatedRules.filter(rule => rule.matched && rule.suggestionContent);
    suggestionContent.innerHTML = suggestionItems.length > 0 ?
      suggestionItems.map(rule => `
        <div class="p-3 bg-white border border-orange-200 rounded">
          <div class="text-sm font-medium text-gray-900 mb-1">${rule.name}</div>
          <div class="text-sm text-gray-700">${rule.suggestionContent}</div>
        </div>
      `).join('') :
      '<div class="text-center text-gray-500 py-4">暂无建议内容</div>';
  }
  
  // 获取分析规则（模拟从分析规则模块获取数据）
  function getAnalysisRules() {
    // 这里应该从分析规则模块获取实际数据，现在用模拟数据
    return [
      {
        id: 1,
        name: "肠道菌群失衡警告",
        description: "检测肠道菌群比例异常，及时提醒主人注意宠物肠道健康",
        conditions: [
          { indicator: "放线菌门", operator: ">", value: 50, unit: "%" },
          { indicator: "拟杆菌门", operator: "<", value: 30, unit: "%" }
        ],
        logicOperator: "AND",
        analysisContent: "检测显示您的宠物肠道菌群存在失衡情况，放线菌门比例过高且拟杆菌门不足",
        suggestionContent: "建议调整饮食结构，增加膳食纤维摄入，配合益生菌补充剂调理3个月后复检",
        outputType: "both",
        isActive: true
      },
      {
        id: 2,
        name: "有害菌超标提醒", 
        description: "监测有害菌群水平，预防肠道炎症",
        conditions: [
          { indicator: "大肠杆菌", operator: ">", value: 15, unit: "%" }
        ],
        logicOperator: "AND",
        analysisContent: "检测到有害菌大肠杆菌比例偏高，可能引起肠道炎症",
        suggestionContent: "建议立即调整饮食，避免高脂食物，增加益生菌摄入，必要时请咨询兽医",
        outputType: "both",
        isActive: true
      }
    ];
  }
  
  // 评估报告是否匹配规则
  function evaluateReportAgainstRules(report, rules) {
    return rules.map(rule => {
      const results = rule.conditions.map(condition => {
        const testValue = report.testData[condition.indicator];
        if (testValue === undefined) return false;
        
        switch (condition.operator) {
          case '>': return testValue > condition.value;
          case '>=': return testValue >= condition.value;
          case '<': return testValue < condition.value;
          case '<=': return testValue <= condition.value;
          case '=': return testValue === condition.value;
          case '!=': return testValue !== condition.value;
          default: return false;
        }
      });
      
      const matched = rule.logicOperator === 'AND' ? 
        results.every(r => r) : 
        results.some(r => r);
      
      return { ...rule, matched };
    });
  }

  // 切换编辑Tab
  function switchEditTab(tabName) {
    // 更新Tab按钮状态
    const tabButtons = editTabs.querySelectorAll('.edit-tab-button');
    tabButtons.forEach(btn => {
      btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
      btn.classList.add('text-gray-500', 'hover:text-gray-700');
    });
    
    const activeBtn = editTabs.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-500', 'hover:text-gray-700');
      activeBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    }
    
    // 隐藏所有Tab内容
    const tabContents = document.querySelectorAll('.edit-tab-content');
    tabContents.forEach(content => content.classList.add('hidden'));
    
    // 显示对应Tab内容
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
      targetTab.classList.remove('hidden');
    }
  }
  
  // 渲染门指标编辑字段
  function renderPhylumEditFields(testData = {}) {
    phylumEditContainer.innerHTML = Object.entries(microbiotaStructure.phylum).map(([phylumKey, phylum]) => {
      const value = testData[phylumKey] || '';
      const [min, max] = phylum.normalRange;
      const categoryColor = phylum.category === 'beneficial' ? 'text-green-600' : 
                           phylum.category === 'harmful' ? 'text-red-600' : 'text-yellow-600';
      const categoryIcon = phylum.category === 'beneficial' ? 'fa-heart' : 
                          phylum.category === 'harmful' ? 'fa-exclamation-triangle' : 'fa-circle';
      
      return `
        <div class="p-4 bg-white border rounded-lg">
          <div class="flex items-center justify-between mb-3">
            <label class="block text-sm font-medium text-gray-900">${phylum.name}</label>
            <i class="fas ${categoryIcon} ${categoryColor}"></i>
          </div>
          <div class="space-y-2">
            <input type="number" 
                   id="phylum-${phylumKey}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                   placeholder="0.0" 
                   min="0" 
                   max="100" 
                   step="0.1" 
                   value="${value}">
            <div class="text-xs text-gray-500">
              正常范围: ${min}-${max}%
            </div>
            <div class="text-xs text-gray-400">
              ${phylum.description}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // 渲染属指标编辑字段（按门分组）
  function renderGenusEditFields(testData = {}) {
    genusEditContainer.innerHTML = Object.entries(microbiotaStructure.phylum).map(([phylumKey, phylum]) => {
      const categoryColor = phylum.category === 'beneficial' ? 'text-green-600' : 
                           phylum.category === 'harmful' ? 'text-red-600' : 'text-yellow-600';
      const categoryBg = phylum.category === 'beneficial' ? 'bg-green-50' : 
                        phylum.category === 'harmful' ? 'bg-red-50' : 'bg-yellow-50';
      const categoryIcon = phylum.category === 'beneficial' ? 'fa-heart' : 
                          phylum.category === 'harmful' ? 'fa-exclamation-triangle' : 'fa-circle';
      
      return `
        <div class="${categoryBg} p-4 rounded-lg border">
          <div class="flex items-center justify-between mb-4">
            <h5 class="text-lg font-medium ${categoryColor}">${phylum.name}</h5>
            <div class="flex items-center space-x-2">
              <i class="fas ${categoryIcon} ${categoryColor}"></i>
              <span class="text-sm text-gray-600">${phylum.genera.length}种属菌</span>
            </div>
          </div>
          <div class="text-xs text-gray-600 mb-3">${phylum.description}</div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${phylum.genera.map(genus => {
              const value = testData[genus.key] || '';
              const [min, max] = genus.normalRange;
              const genusStatusColor = genus.category === 'beneficial' ? 'text-green-600' : 
                                     genus.category === 'harmful' ? 'text-red-600' : 'text-yellow-600';
              const genusStatusIcon = genus.category === 'beneficial' ? 'fa-plus-circle' : 
                                    genus.category === 'harmful' ? 'fa-minus-circle' : 'fa-circle';
              
              return `
                <div class="p-3 bg-white border border-gray-200 rounded-md">
                  <div class="flex items-center justify-between mb-2">
                    <label class="block text-sm font-medium text-gray-900">${genus.name}</label>
                    <i class="fas ${genusStatusIcon} ${genusStatusColor} text-xs"></i>
                  </div>
                  <input type="number" 
                         id="genus-${genus.key}" 
                         class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                         placeholder="0.0" 
                         min="0" 
                         max="100" 
                         step="0.1" 
                         value="${value}">
                  <div class="text-xs text-gray-500 mt-1">
                    正常: ${min}-${max}%
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('') + 
    // 添加统计指标
    `
      <div class="bg-blue-50 p-4 rounded-lg border">
        <h5 class="text-lg font-medium text-blue-600 mb-4">
          <i class="fas fa-chart-pie mr-2"></i>统计指标
        </h5>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${microbiotaStructure.summary.map(indicator => {
            const value = testData[indicator.key] || '';
            const [min, max] = indicator.normalRange;
            const statusColor = indicator.category === 'beneficial' ? 'text-green-600' : 
                               indicator.category === 'harmful' ? 'text-red-600' : 'text-yellow-600';
            
            return `
              <div class="p-3 bg-white border border-gray-200 rounded-md">
                <label class="block text-sm font-medium ${statusColor} mb-2">${indicator.name}</label>
                <input type="number" 
                       id="summary-${indicator.key}" 
                       class="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                       placeholder="0.0" 
                       min="0" 
                       max="100" 
                       step="0.1" 
                       value="${value}">
                <div class="text-xs text-gray-500 mt-1">
                  正常: ${min}-${max}%
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  // 收集检测数据
  function collectTestData() {
    const testData = {};
    
    // 收集门指标数据
    Object.entries(microbiotaStructure.phylum).forEach(([phylumKey, phylum]) => {
      const input = document.getElementById(`phylum-${phylumKey}`);
      if (input && input.value !== '') {
        testData[phylumKey] = parseFloat(input.value);
      }
      
      // 收集该门下的属指标数据
      phylum.genera.forEach(genus => {
        const genusInput = document.getElementById(`genus-${genus.key}`);
        if (genusInput && genusInput.value !== '') {
          testData[genus.key] = parseFloat(genusInput.value);
        }
      });
    });
    
    // 收集统计指标数据
    microbiotaStructure.summary.forEach(indicator => {
      const input = document.getElementById(`summary-${indicator.key}`);
      if (input && input.value !== '') {
        testData[indicator.key] = parseFloat(input.value);
      }
    });
    
    return testData;
  }

  function showFormView(isEdit = false, editId = null) {
    mainView.classList.add("hidden");
    formView.classList.remove("hidden");
    importView.classList.add("hidden");
    
    // 初始化数据选项
    updatePetOptions();
    updateCustomerOptions();
    
    // 默认为选择模式
    switchToPetSelectionMode();
    switchToOwnerAutoMode();
    customerSelectionArea.classList.add("hidden");
    linkInfo.classList.add("hidden");
    
    // 初始化编辑Tab（默认显示门指标）
    switchEditTab('phylum-edit');

    if (isEdit && editId) {
      const report = petReports.find((r) => r.id === editId);
      if (report) {
        formTitle.textContent = "编辑萌宠报告";
        
        // 检查是否能找到匹配的宠物档案
        const matchedPet = pets.find(p => 
          p.name === report.petInfo.name && 
          (p.majorBreed === report.petInfo.breed || 
           `${p.majorBreed} • ${p.minorBreed}` === report.petInfo.breed)
        );
        
        if (matchedPet) {
          // 找到匹配的宠物，使用选择模式
          formPetSelect.value = matchedPet.id;
          currentSelectedPetId = matchedPet.id;
          fillPetInfo(matchedPet);
        } else {
          // 没找到匹配的宠物，切换到手动模式
          switchToPetManualMode();
          manualPetName.value = report.petInfo.name;
          manualPetBreed.value = report.petInfo.breed;
          manualPetAge.value = report.petInfo.age || "";
          manualPetGender.value = report.petInfo.gender || "";
          
          // 检查是否能找到匹配的客户
          const matchedCustomer = customers.find(c => 
            c.name === report.ownerInfo.name || 
            c.phone === report.ownerInfo.phone
          );
          
          if (matchedCustomer) {
            formCustomerSelect.value = matchedCustomer.id;
            currentSelectedCustomerId = matchedCustomer.id;
            fillOwnerInfo(matchedCustomer);
            customerSelectionArea.classList.remove("hidden");
          } else {
            // 切换到手动主人输入模式
            switchToOwnerManualMode();
            manualOwnerName.value = report.ownerInfo.name;
            manualOwnerPhone.value = report.ownerInfo.phone || "";
            manualOwnerAddress.value = report.ownerInfo.address || "";
          }
        }
        
        // 填充检测信息
        formSampleType.value = report.testInfo.sampleType || "";
        formTestDate.value = report.testInfo.testDate || "";
        formStatus.value = report.testInfo.status;
        
        // 填充检测数据编辑字段
        renderPhylumEditFields(report.testData || {});
        renderGenusEditFields(report.testData || {});
        
        // 填充健康评级
        formHealthLevel.value = report.healthAssessment.level || "";
        formHealthScore.value = report.healthAssessment.score || "";
        formHealthAdvice.value = report.healthAssessment.advice || "";
        
        currentEditIndex = petReports.findIndex((r) => r.id === editId);
      }
    } else {
      formTitle.textContent = "新增萌宠报告";
      reportForm.reset();
      // 重置自定义字段
      formPetSelect.value = "";
      formCustomerSelect.value = "";
      currentSelectedPetId = null;
      currentSelectedCustomerId = null;
      
      // 设置默认检测日期为今天
      formTestDate.value = new Date().toISOString().split('T')[0];
      
      // 初始化空的检测数据编辑字段
      renderPhylumEditFields({});
      renderGenusEditFields({});
      
      currentEditIndex = -1;
    }
  }

  function showImportView() {
    mainView.classList.add("hidden");
    formView.classList.add("hidden");
    importView.classList.remove("hidden");
    
    // 重置导入界面
    importFile.value = "";
    fileSelected.classList.add("hidden");
    fileDropZone.classList.remove("hidden");
    importPreview.classList.add("hidden");
    startImportButton.disabled = true;
  }

  // 事件监听器
  addNewReportButton.addEventListener("click", () => {
    showFormView(false);
  });

  batchImportButton.addEventListener("click", () => {
    showImportView();
  });

  backToListButton.addEventListener("click", showMainView);
  backToListFromImportButton.addEventListener("click", showMainView);
  cancelFormButton.addEventListener("click", showMainView);
  cancelImportButton.addEventListener("click", showMainView);

  // 详情模态框事件监听器
  closeDetailModal.addEventListener("click", closeReportDetailModal);
  closeDetailBtn.addEventListener("click", closeReportDetailModal);
  
  // Tab切换事件监听器
  detailTabs.addEventListener("click", (e) => {
    const tabButton = e.target.closest('.tab-button');
    if (tabButton) {
      const tabName = tabButton.dataset.tab;
      const report = getCurrentReport(); // 需要获取当前报告数据
      if (report) {
        switchDetailTab(tabName, report);
      }
    }
  });
  
  // 编辑Tab切换事件监听器
  editTabs.addEventListener("click", (e) => {
    const tabButton = e.target.closest('.edit-tab-button');
    if (tabButton) {
      const tabName = tabButton.dataset.tab;
      switchEditTab(tabName);
    }
  });
  
  // 导出报告按钮
  exportReportBtn.addEventListener("click", () => {
    alert("导出功能开发中...");
  });
  
  // 存储当前显示的报告数据
  let currentReportData = null;
  
  function getCurrentReport() {
    return currentReportData;
  }
  
  // 更新显示报告详情模态框函数，保存当前报告数据
  function showReportDetailModal(report) {
    currentReportData = report; // 保存当前报告数据
    
    // 设置头部信息
    reportDetailHeader.innerHTML = `
      <div class="flex items-center space-x-4 text-sm">
        <span><strong>报告编号：</strong>${report.reportNumber}</span>
        <span><strong>宠物：</strong>${report.petInfo.name} (${report.petInfo.breed})</span>
        <span><strong>主人：</strong>${report.ownerInfo.name}</span>
        <span><strong>检测日期：</strong>${report.testInfo.testDate}</span>
      </div>
    `;
    
    // 初始化Tab（默认显示概览）
    switchDetailTab('overview', report);
    
    // 显示模态框
    reportDetailModal.classList.remove('hidden');
  }

  // 搜索和筛选
  searchInput.addEventListener("input", (e) => {
    renderTable(e.target.value.trim(), filterHealthLevel.value, filterStatus.value);
  });

  filterHealthLevel.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), e.target.value, filterStatus.value);
  });

  filterStatus.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), filterHealthLevel.value, e.target.value);
  });

  // 宠物选择和输入模式切换
  selectFromPetsBtn.addEventListener("click", () => {
    switchToPetSelectionMode();
  });
  
  manualInputPetBtn.addEventListener("click", () => {
    switchToPetManualMode();
  });
  
  // 客户选择和输入模式切换
  selectFromCustomersBtn.addEventListener("click", () => {
    switchToOwnerAutoMode();
    customerSelectionArea.classList.remove("hidden");
  });
  
  manualInputOwnerBtn.addEventListener("click", () => {
    switchToOwnerManualMode();
  });
  
  // 宠物选择变化
  formPetSelect.addEventListener("change", (e) => {
    const petId = parseInt(e.target.value);
    if (petId) {
      const pet = getPetById(petId);
      if (pet) {
        currentSelectedPetId = petId;
        fillPetInfo(pet);
      }
    } else {
      currentSelectedPetId = null;
      formPetName.value = "";
      formPetBreed.value = "";
      formPetAge.value = "";
      formPetGender.value = "";
      formOwnerName.value = "";
      formOwnerPhone.value = "";
      formOwnerAddress.value = "";
      linkInfo.classList.add("hidden");
    }
  });
  
  // 客户选择变化
  formCustomerSelect.addEventListener("change", (e) => {
    const customerId = parseInt(e.target.value);
    if (customerId) {
      const customer = getCustomerById(customerId);
      if (customer) {
        currentSelectedCustomerId = customerId;
        fillOwnerInfo(customer);
        linkInfoText.textContent = `已选择客户：${customer.name}`;
        linkInfo.classList.remove("hidden");
      }
    } else {
      currentSelectedCustomerId = null;
      formOwnerName.value = "";
      formOwnerPhone.value = "";
      formOwnerAddress.value = "";
      linkInfo.classList.add("hidden");
    }
  });
  
  // 健康等级改变时自动填入分数范围
  formHealthLevel.addEventListener("change", (e) => {
    const level = e.target.value;
    if (level && healthLevels[level]) {
      const scoreRange = healthLevels[level].scoreRange;
      const avgScore = (scoreRange[0] + scoreRange[1]) / 2;
      formHealthScore.value = avgScore;
    }
  });

  // 表单提交
  reportForm.addEventListener("submit", (e) => {
    e.preventDefault();

    let petData, ownerData;
    
    // 获取宠物信息
    if (isManualPetMode) {
      const petName = manualPetName.value.trim();
      const petBreed = manualPetBreed.value.trim();
      
      if (!petName || !petBreed) {
        alert("宠物姓名和品种不能为空！");
        return;
      }
      
      petData = {
        name: petName,
        breed: petBreed,
        age: manualPetAge.value ? parseFloat(manualPetAge.value) : null,
        gender: manualPetGender.value || null
      };
    } else {
      if (!currentSelectedPetId) {
        alert("请选择宠物档案或切换到手动输入模式！");
        return;
      }
      
      const selectedPet = getPetById(currentSelectedPetId);
      if (!selectedPet) {
        alert("选择的宠物档案无效！");
        return;
      }
      
      petData = {
        id: selectedPet.id,
        name: selectedPet.name,
        breed: `${selectedPet.majorBreed} • ${selectedPet.minorBreed || '未知品种'}`,
        age: calculateAge(selectedPet.birthDate) ? parseFloat(calculateAge(selectedPet.birthDate).replace(/[^0-9.]/g, '')) : null,
        gender: selectedPet.gender || null
      };
    }
    
    // 获取主人信息
    if (isManualOwnerMode) {
      const ownerName = manualOwnerName.value.trim();
      
      if (!ownerName) {
        alert("主人姓名不能为空！");
        return;
      }
      
      ownerData = {
        name: ownerName,
        phone: manualOwnerPhone.value.trim() || null,
        address: manualOwnerAddress.value.trim() || null
      };
    } else {
      // 如果是宠物选择模式且有关联的主人
      if (currentSelectedPetId) {
        const selectedPet = getPetById(currentSelectedPetId);
        const owner = getCustomerById(selectedPet.currentOwnerId);
        if (owner) {
          ownerData = {
            id: owner.id,
            name: owner.name,
            phone: owner.phone || null,
            address: owner.address || null
          };
        }
      }
      // 如果是客户选择模式
      else if (currentSelectedCustomerId) {
        const selectedCustomer = getCustomerById(currentSelectedCustomerId);
        if (selectedCustomer) {
          ownerData = {
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            phone: selectedCustomer.phone || null,
            address: selectedCustomer.address || null
          };
        }
      }
      
      if (!ownerData) {
        alert("请选择客户档案或切换到手动输入模式！");
        return;
      }
    }

    // 收集检测数据
    const testData = collectTestData();
    
    const reportData = {
      petInfo: petData,
      ownerInfo: ownerData,
      testInfo: {
        sampleType: formSampleType.value || null,
        testDate: formTestDate.value || null,
        status: formStatus.value,
        results: "" // 不再使用原始结果字段
      },
      testData: testData, // 新的检测数据结构
      healthAssessment: {
        level: formHealthLevel.value || "",
        score: formHealthScore.value ? parseFloat(formHealthScore.value) : null,
        advice: formHealthAdvice.value.trim() || ""
      },
      // 添加关联信息
      linkedPetId: currentSelectedPetId,
      linkedCustomerId: currentSelectedCustomerId || (ownerData && ownerData.id ? ownerData.id : null)
    };

    if (currentEditIndex >= 0) {
      // 编辑
      petReports[currentEditIndex] = {
        ...petReports[currentEditIndex],
        ...reportData,
        updatedAt: new Date().toLocaleString('zh-CN')
      };
    } else {
      // 新增
      petReports.push({
        id: generateId(),
        reportNumber: generateReportNumber(),
        ...reportData,
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
    const report = petReports.find(r => r.id === id);

    if (button.classList.contains("view-report")) {
      // 查看报告详情（详情模态框）
      if (report) {
        showReportDetailModal(report);
      }
    } else if (button.classList.contains("edit-report")) {
      showFormView(true, id);
    } else if (button.classList.contains("set-health-level")) {
      // 显示健康评级模态框
      showHealthRatingModal(id);
    } else if (button.classList.contains("delete-report")) {
      if (report && confirm(`确定要删除报告 "${report.reportNumber}" 吗？\n宠物: ${report.petInfo.name}\n主人: ${report.ownerInfo.name}`)) {
        petReports = petReports.filter((r) => r.id !== id);
        renderTable(searchInput.value.trim(), filterHealthLevel.value, filterStatus.value);
      }
    }
  });

  // 文件上传相关事件
  fileDropZone.addEventListener("click", () => {
    importFile.click();
  });

  removeFileButton.addEventListener("click", () => {
    importFile.value = "";
    fileSelected.classList.add("hidden");
    fileDropZone.classList.remove("hidden");
    importPreview.classList.add("hidden");
    startImportButton.disabled = true;
  });

  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedFileName.textContent = file.name;
      fileSelected.classList.remove("hidden");
      fileDropZone.classList.add("hidden");
      
      // 这里可以添加文件解析和预览功能
      // 暂时只是显示文件已选择
      importPreview.classList.remove("hidden");
      document.getElementById("preview-summary").textContent = `已选择文件: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      document.getElementById("preview-header").innerHTML = '<tr><th class="px-2 py-1">预览功能开发中...</th></tr>';
      document.getElementById("preview-body").innerHTML = '<tr><td class="px-2 py-1 text-gray-500">文件解析功能将在后续版本中实现</td></tr>';
      
      startImportButton.disabled = false;
    }
  });

  startImportButton.addEventListener("click", () => {
    alert("批量导入功能开发中，将在后续版本中实现完整的Excel/CSV解析功能。");
    showMainView();
  });

  // 下载模板
  document.getElementById("download-template").addEventListener("click", (e) => {
    e.preventDefault();
    alert("模板下载功能开发中，将提供标准的Excel导入模板。");
  });

  // 健康评级模态框事件监听器
  closeRatingModalBtn.addEventListener("click", hideHealthRatingModal);
  cancelRatingBtn.addEventListener("click", hideHealthRatingModal);
  saveRatingBtn.addEventListener("click", saveHealthRating);

  // 健康等级按钮点击事件
  healthLevelBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // 清除其他按钮的选中状态
      healthLevelBtns.forEach(b => {
        b.classList.remove('border-blue-500', 'bg-blue-50');
        b.classList.add('border-gray-200');
      });
      
      // 设置当前按钮为选中状态
      btn.classList.remove('border-gray-200');
      btn.classList.add('border-blue-500', 'bg-blue-50');
      
      // 根据等级更新分数范围
      updateScoreByLevel(btn.dataset.level);
    });
  });

  // 健康分数输入事件
  healthScoreInput.addEventListener("input", (e) => {
    const score = parseInt(e.target.value) || 0;
    updateLevelByScore(score);
  });

  // 点击模态框背景关闭
  healthRatingModal.addEventListener("click", (e) => {
    if (e.target === healthRatingModal) {
      hideHealthRatingModal();
    }
  });

  // 初始化
  showMainView();
}

// 如果 DOM 已加载完成，立即执行；否则等待 DOMContentLoaded 事件
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPetReportManagement);
} else {
  initPetReportManagement();
}
