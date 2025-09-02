function initNormalRangeConfig() {
  // DOM 元素
  const mainView = document.getElementById("main-view");
  const formView = document.getElementById("form-view");
  const addConfigBtn = document.getElementById("add-config-btn");
  const batchImportBtn = document.getElementById("batch-import-btn");
  const backToListBtn = document.getElementById("back-to-list-btn");
  const cancelFormBtn = document.getElementById("cancel-form-btn");
  const configForm = document.getElementById("config-form");
  const formTitle = document.getElementById("form-title");
  const tableBody = document.getElementById("table-body");
  const importModal = document.getElementById("import-modal");
  const confirmImportBtn = document.getElementById("confirm-import-btn");
  const cancelImportBtn = document.getElementById("cancel-import-btn");
  const downloadTemplateBtn = document.getElementById("download-template-btn");
  const searchBtn = document.getElementById("search-btn");
  const resetFilterBtn = document.getElementById("reset-filter-btn");

  // 表单元素
  const formMajorBreed = document.getElementById("form-major-breed");
  const formMinorBreed = document.getElementById("form-minor-breed");

  const formMinValue = document.getElementById("form-min-value");
  const formMaxValue = document.getElementById("form-max-value");
  const formUnit = document.getElementById("form-unit");
  const formNotes = document.getElementById("form-notes");
  const referenceSuggestions = document.getElementById("reference-suggestions");
  const referenceContent = document.getElementById("reference-content");

  // 树形选择器元素
  const indicatorTree = document.getElementById("indicator-tree");
  const selectedIndicator = document.getElementById("selected-indicator");
  const selectedIndicatorText = document.getElementById("selected-indicator-text");
  const clearSelectionBtn = document.getElementById("clear-selection");
  const selectedIndicatorType = document.getElementById("selected-indicator-type");
  const selectedIndicatorName = document.getElementById("selected-indicator-name");
  const treeSelector = document.getElementById("tree-selector");


  // 筛选元素
  const filterMajorBreed = document.getElementById("filter-major-breed");
  const filterMinorBreed = document.getElementById("filter-minor-breed");
  const filterIndicatorType = document.getElementById("filter-indicator-type");
  const filterIndicatorName = document.getElementById("filter-indicator-name");

  // 数据存储
  let rangeConfigs = [];
  let currentEditIndex = -1;

  // 从字典数据服务获取宠物品种配置
  function getBreedConfig() {
    if (typeof window.dictionaryDataService !== 'undefined') {
      return window.dictionaryDataService.getFlatBreedConfig();
    }
    
    // 降级方案：如果字典服务不可用，使用默认配置
    return {
      '猫科': ['英国短毛猫', '波斯猫', '橘猫', '布偶猫', '暹罗猫', '缅因猫', '通用猫科'],
      '犬科': ['金毛寻回犬', '拉布拉多犬', '哈士奇', '萨摩耶', '边境牧羊犬', '德国牧羊犬', '泰迪', '比熊', '博美', '柯基', '法斗', '中华田园犬', '通用犬科'],
      '兔科': ['垂耳兔', '侏儒兔', '安哥拉兔', '荷兰兔', '狮子兔', '通用兔科'],
      '仓鼠科': ['金丝熊', '三线仓鼠', '一线仓鼠', '通用仓鼠'],
      '鸟类': ['鹦鹉', '金丝雀', '通用鸟类'],
      '爬行动物': ['乌龟', '蜥蜴', '通用爬行动物']
    };
  }

  // 获取动态品种配置
  const breedConfig = getBreedConfig();

  // 检测指标树形配置（按照微生物分类学层级组织）
  const indicatorTreeConfig = {
    '放线菌门': {
      type: '门',
      description: '主要包含有益菌群，对肠道健康至关重要',
      children: [
        { name: '双歧杆菌', type: '属', description: '肠道健康的关键指标，参与免疫调节' },
        { name: '短双歧杆菌', type: '属', description: '双歧杆菌的亚种，有助消化' },
        { name: '长双歧杆菌', type: '属', description: '常见的有益菌，维持肠道平衡' },
        { name: '青春双歧杆菌', type: '属', description: '年轻动物肠道中的主要菌群' }
      ]
    },
    '拟杆菌门': {
      type: '门',
      description: '肠道内重要菌群，参与营养物质消化吸收',
      children: [
        { name: '拟杆菌', type: '属', description: '主要的蛋白质分解菌' },
        { name: '普氏菌', type: '属', description: '参与复杂碳水化合物代谢' },
        { name: '普雷沃菌', type: '属', description: '中性菌群，适量即可' },
        { name: '脆弱拟杆菌', type: '属', description: '重要的免疫调节菌' },
        { name: '多形拟杆菌', type: '属', description: '多样化的有益菌群' }
      ]
    },
    '厚壁菌门': {
      type: '门',
      description: '包含多种重要菌属，需保持适当比例',
      children: [
        { name: '乳酸菌', type: '属', description: '产生乳酸，维持肠道酸性环境' },
        { name: '嗜酸乳杆菌', type: '属', description: '耐酸性强的有益菌' },
        { name: '植物乳杆菌', type: '属', description: '来源于植物的乳酸菌' },
        { name: '干酪乳杆菌', type: '属', description: '发酵类食品中的常见菌' }
      ]
    },
    '变形菌门': {
      type: '门',
      description: '包含潜在有害菌，应控制在较低水平',
      children: [
        { name: '大肠杆菌', type: '属', description: '条件致病菌，正常情况下含量很少' },
        { name: '肠杆菌', type: '属', description: '肠道常见菌，需控制数量' },
        { name: '克雷伯菌', type: '属', description: '潜在致病菌，应保持低水平' },
        { name: '变形杆菌', type: '属', description: '可能引起肠道不适' }
      ]
    },
    '蓝藻菌门': {
      type: '门',
      description: '较少见菌群，正常情况下含量极少',
      children: []
    },
    '脱铁杆菌门': {
      type: '门',
      description: '专性厌氧菌群，参与特殊代谢过程',
      children: []
    },
    '螺旋体门': {
      type: '门',
      description: '形态独特的菌群，正常情况下极少',
      children: []
    },
    '衣原体门': {
      type: '门',
      description: '专性细胞内寄生菌，需要密切监控',
      children: []
    }
  };

  // 扁平化指标配置（向后兼容）
  const indicatorConfig = {
    '门': Object.keys(indicatorTreeConfig),
    '属': Object.values(indicatorTreeConfig).reduce((acc, phylum) => {
      return acc.concat(phylum.children.map(genus => genus.name));
    }, [])
  };

  // 参考范围数据库（基于科学研究和临床经验）
  const referenceRanges = {
    // 猫科参考范围
    '猫': {
      '门': {
        '放线菌门': { min: 25, max: 45, notes: '猫科动物肠道中重要的有益菌群' },
        '拟杆菌门': { min: 20, max: 35, notes: '参与蛋白质和脂肪代谢' },
        '厚壁菌门': { min: 30, max: 50, notes: '包含多种有益乳酸菌' },
        '变形菌门': { min: 2, max: 10, notes: '应控制在较低水平' }
      },
      '属': {
        '双歧杆菌': { min: 12, max: 28, notes: '猫科肠道健康的关键指标' },
        '乳酸菌': { min: 15, max: 30, notes: '维持肠道酸性环境' },
        '大肠杆菌': { min: 0, max: 5, notes: '正常情况下应很少' }
      }
    },
    // 犬科参考范围
    '狗': {
      '门': {
        '放线菌门': { min: 30, max: 50, notes: '犬科消化系统重要菌群' },
        '拟杆菌门': { min: 15, max: 30, notes: '犬科肠道主要菌群之一' },
        '厚壁菌门': { min: 25, max: 45, notes: '包含重要的有益菌' },
        '变形菌门': { min: 3, max: 12, notes: '需要适度控制' }
      },
      '属': {
        '双歧杆菌': { min: 15, max: 35, notes: '犬科肠道健康核心指标' },
        '乳酸菌': { min: 18, max: 35, notes: '维持犬类消化健康' },
        '大肠杆菌': { min: 0, max: 8, notes: '正常范围内的条件致病菌' }
      }
    },
    // 兔科参考范围
    '兔子': {
      '门': {
        '放线菌门': { min: 35, max: 55, notes: '草食动物重要的纤维分解菌' },
        '拟杆菌门': { min: 25, max: 40, notes: '参与复杂碳水化合物消化' },
        '厚壁菌门': { min: 20, max: 35, notes: '维持肠道微环境' }
      },
      '属': {
        '双歧杆菌': { min: 20, max: 40, notes: '兔类盲肠发酵重要菌群' },
        '乳酸菌': { min: 10, max: 25, notes: '辅助纤维消化' }
      }
    }
  };

  // 初始化测试数据
  rangeConfigs = [
    {
      id: 1,
      majorBreed: '猫',
      minorBreed: '英国短毛猫',
      indicatorType: '门',
      indicatorName: '放线菌门',
      minValue: 25.0,
      maxValue: 45.0,
      unit: '%',
      notes: '英短猫放线菌门的正常范围，基于临床数据统计',
      createdAt: '2024-01-15 10:30:00'
    },
    {
      id: 2,
      majorBreed: '猫',
      minorBreed: '英国短毛猫',
      indicatorType: '属',
      indicatorName: '双歧杆菌',
      minValue: 12.0,
      maxValue: 28.0,
      unit: '%',
      notes: '英短猫双歧杆菌正常水平',
      createdAt: '2024-01-15 10:35:00'
    },
    {
      id: 3,
      majorBreed: '狗',
      minorBreed: '金毛寻回犬',
      indicatorType: '门',
      indicatorName: '放线菌门',
      minValue: 30.0,
      maxValue: 50.0,
      unit: '%',
      notes: '金毛犬种特异性放线菌门范围',
      createdAt: '2024-01-15 11:00:00'
    },

  ];

  function generateId() {
    return Math.max(...rangeConfigs.map(c => c.id || 0), 0) + 1;
  }

  // 更新小品种选项
  function updateMinorBreedOptions(selectElement, majorBreed) {
    selectElement.innerHTML = '<option value="">请选择小品种</option>';
    
    if (majorBreed) {
      let minorBreeds = [];
      
      // 优先从字典数据服务获取
      if (typeof window.dictionaryDataService !== 'undefined') {
        const majorBreedData = window.dictionaryDataService.getBreedByLabel(majorBreed);
        if (majorBreedData) {
          minorBreeds = window.dictionaryDataService.getPetMinorBreeds(majorBreedData.key)
            .map(breed => breed.label);
        }
      }
      
      // 降级到静态配置
      if (minorBreeds.length === 0 && breedConfig[majorBreed]) {
        minorBreeds = breedConfig[majorBreed];
      }
      
      minorBreeds.forEach(breed => {
        const option = document.createElement('option');
        option.value = breed;
        option.textContent = breed;
        selectElement.appendChild(option);
      });
    }
  }



  // 渲染树形选择器
  function renderIndicatorTree() {
    indicatorTree.innerHTML = '';
    
    Object.entries(indicatorTreeConfig).forEach(([phylumName, phylumData]) => {
      const phylumDiv = document.createElement('div');
      phylumDiv.className = 'tree-node-phylum mb-2';
      
      // 门类别节点
      const phylumHeader = document.createElement('div');
      phylumHeader.className = 'flex items-center p-3 rounded cursor-pointer group transition-all duration-200';
      phylumHeader.setAttribute('data-indicator-name', phylumName);
      phylumHeader.setAttribute('data-indicator-type', '门');
      phylumHeader.innerHTML = `
        <div class="flex items-center flex-1">
          <i class="fas fa-folder${phylumData.children.length > 0 ? '' : '-open'} text-blue-600 mr-3 text-lg"></i>
          <div class="flex-1">
            <div class="font-semibold text-gray-900 text-base">${phylumName}</div>
            <div class="text-sm text-gray-600 mt-1">${phylumData.description}</div>
          </div>
          <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">门</span>
        </div>
      `;
      
      // 门类别点击事件
      phylumHeader.addEventListener('click', () => {
        selectIndicator(phylumName, '门');
      });
      
      phylumDiv.appendChild(phylumHeader);
      
      // 属类别节点
      if (phylumData.children.length > 0) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'ml-8 mt-2 space-y-1';
        
        phylumData.children.forEach(genus => {
          const genusDiv = document.createElement('div');
          genusDiv.className = 'tree-node-genus flex items-center p-2 rounded cursor-pointer group transition-all duration-200';
          genusDiv.setAttribute('data-indicator-name', genus.name);
          genusDiv.setAttribute('data-indicator-type', '属');
          genusDiv.innerHTML = `
            <div class="flex items-center flex-1">
              <i class="fas fa-leaf text-green-600 mr-3"></i>
              <div class="flex-1">
                <div class="font-medium text-gray-800">${genus.name}</div>
                <div class="text-xs text-gray-500 mt-1">${genus.description}</div>
              </div>
              <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">属</span>
            </div>
          `;
          
          // 属类别点击事件
          genusDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            selectIndicator(genus.name, '属');
          });
          
          childrenDiv.appendChild(genusDiv);
        });
        
        phylumDiv.appendChild(childrenDiv);
      }
      
      indicatorTree.appendChild(phylumDiv);
    });
  }

  // 选择指标
  function selectIndicator(name, type) {
    selectedIndicatorType.value = type;
    selectedIndicatorName.value = name;
    
    selectedIndicatorText.textContent = `${name} (${type})`;
    selectedIndicator.classList.remove('hidden');
    
    // 高亮选中项
    indicatorTree.querySelectorAll('.bg-blue-200').forEach(el => {
      el.classList.remove('bg-blue-200');
    });
    
    // 使用data属性精确匹配
    const selectedElement = indicatorTree.querySelector(
      `[data-indicator-name="${name}"][data-indicator-type="${type}"]`
    );
    
    if (selectedElement) {
      selectedElement.classList.add('bg-blue-200');
      // 滚动到选中项
      selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // 触发参考范围建议更新
    updateReferenceRanges();
  }

  // 清除选择
  function clearIndicatorSelection() {
    selectedIndicatorType.value = '';
    selectedIndicatorName.value = '';
    selectedIndicator.classList.add('hidden');
    
    // 移除高亮
    indicatorTree.querySelectorAll('.bg-blue-200').forEach(el => {
      el.classList.remove('bg-blue-200');
    });
    
    // 隐藏参考范围建议
    referenceSuggestions.classList.add('hidden');
  }



  // 更新参考范围建议
  function updateReferenceRanges() {
    const majorBreed = formMajorBreed.value;
    const indicatorType = selectedIndicatorType.value;
    const indicatorName = selectedIndicatorName.value;

    showReferenceRanges(majorBreed, indicatorType, indicatorName);
  }

  // 显示参考范围建议
  function showReferenceRanges(majorBreed, indicatorType, indicatorName) {
    if (!majorBreed || !indicatorType || !indicatorName) {
      referenceSuggestions.classList.add('hidden');
      return;
    }

    const reference = referenceRanges[majorBreed]?.[indicatorType]?.[indicatorName];
    if (reference) {
      referenceContent.innerHTML = `
        <div class="bg-blue-100 p-3 rounded-md">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-blue-900">建议范围: ${reference.min}% - ${reference.max}%</span>
            <button type="button" id="apply-reference" class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
              应用建议
            </button>
          </div>
          <p class="text-sm text-blue-800">${reference.notes}</p>
        </div>
      `;
      
      // 添加应用建议的事件监听
      document.getElementById('apply-reference').addEventListener('click', () => {
        formMinValue.value = reference.min;
        formMaxValue.value = reference.max;
        formNotes.value = reference.notes;
      });

      referenceSuggestions.classList.remove('hidden');
    } else {
      referenceSuggestions.classList.add('hidden');
    }
  }

  // 渲染表格
  function renderTable(filteredData = null) {
    const data = filteredData || rangeConfigs;
    
    if (data.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">
            ${filteredData !== null ? '没有符合条件的配置' : '暂无正常范围配置'}
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = data.map(config => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${config.majorBreed}</div>
          <div class="text-sm text-gray-500">${config.minorBreed}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${config.indicatorName}</div>
          <div class="text-sm text-gray-500">${config.indicatorType}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            ${config.minValue} - ${config.maxValue}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${config.unit}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${config.createdAt}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div class="flex space-x-2">
            <button class="text-blue-600 hover:text-blue-900 edit-btn" data-id="${config.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="text-red-600 hover:text-red-900 delete-btn" data-id="${config.id}">
              <i class="fas fa-trash"></i>
            </button>
            <button class="text-green-600 hover:text-green-900 copy-btn" data-id="${config.id}" title="复制配置">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // 搜索和筛选
  function filterConfigs() {
    const majorBreed = filterMajorBreed.value;
    const minorBreed = filterMinorBreed.value;
    const indicatorType = filterIndicatorType.value;
    const indicatorName = filterIndicatorName.value.toLowerCase();

    const filtered = rangeConfigs.filter(config => {
      return (
        (!majorBreed || config.majorBreed === majorBreed) &&
        (!minorBreed || config.minorBreed === minorBreed) &&
        (!indicatorType || config.indicatorType === indicatorType) &&
        (!indicatorName || config.indicatorName.toLowerCase().includes(indicatorName))
      );
    });

    renderTable(filtered);
  }

  // 显示主视图
  function showMainView() {
    mainView.classList.remove('hidden');
    formView.classList.add('hidden');
    renderTable();
  }

  // 显示表单视图
  function showFormView(isEdit = false, editId = null) {
    mainView.classList.add('hidden');
    formView.classList.remove('hidden');
    referenceSuggestions.classList.add('hidden');

    formTitle.textContent = isEdit ? '编辑正常范围配置' : '新增正常范围配置';

    // 渲染树形选择器
    renderIndicatorTree();
    
    if (isEdit && editId) {
      const config = rangeConfigs.find(c => c.id === editId);
      if (config) {
        currentEditIndex = rangeConfigs.indexOf(config);
        formMajorBreed.value = config.majorBreed;
        updateMinorBreedOptions(formMinorBreed, config.majorBreed);
        formMinorBreed.value = config.minorBreed;
        
        // 设置指标选择（树形选择器）
        selectIndicator(config.indicatorName, config.indicatorType);
        
        formMinValue.value = config.minValue;
        formMaxValue.value = config.maxValue;
        formUnit.value = config.unit;
        formNotes.value = config.notes;
      }
    } else {
      currentEditIndex = -1;
      configForm.reset();
      clearIndicatorSelection();
      updateMinorBreedOptions(formMinorBreed, '');

    }
  }

  // 删除配置
  function deleteConfig(id) {
    if (confirm('确定要删除这个正常范围配置吗？')) {
      rangeConfigs = rangeConfigs.filter(c => c.id !== id);
      renderTable();
    }
  }

  // 复制配置
  function copyConfig(id) {
    const config = rangeConfigs.find(c => c.id === id);
    if (config) {
      const newConfig = {
        ...config,
        id: generateId(),
        createdAt: new Date().toLocaleString()
      };
      rangeConfigs.push(newConfig);
      renderTable();
    }
  }

  // 验证表单
  function validateForm() {
    const majorBreed = formMajorBreed.value;
    const minorBreed = formMinorBreed.value;
    
    // 获取指标信息（只从树形选择器获取）
    const indicatorType = selectedIndicatorType.value;
    const indicatorName = selectedIndicatorName.value;
    
    const minValue = parseFloat(formMinValue.value);
    const maxValue = parseFloat(formMaxValue.value);

    if (!majorBreed || !minorBreed || !indicatorType || !indicatorName) {
      alert('请填写所有必填字段，包括选择检测指标！');
      return false;
    }

    if (isNaN(minValue) || isNaN(maxValue)) {
      alert('请输入有效的数值范围！');
      return false;
    }

    if (minValue >= maxValue) {
      alert('最小值必须小于最大值！');
      return false;
    }

    if (minValue < 0 || maxValue > 100) {
      alert('范围值必须在0-100之间！');
      return false;
    }

    // 检查是否已存在相同配置
    const existing = rangeConfigs.find(c => 
      c.majorBreed === majorBreed &&
      c.minorBreed === minorBreed &&
      c.indicatorType === indicatorType &&
      c.indicatorName === indicatorName &&
      (currentEditIndex === -1 || c.id !== rangeConfigs[currentEditIndex].id)
    );

    if (existing) {
      alert('该配置已存在，请检查后重新提交！');
      return false;
    }

    return true;
  }

  // 事件监听器设置
  function setupEventListeners() {
    // 主要按钮事件
    addConfigBtn.addEventListener('click', () => showFormView(false));
    batchImportBtn.addEventListener('click', () => importModal.classList.remove('hidden'));
    backToListBtn.addEventListener('click', showMainView);
    cancelFormBtn.addEventListener('click', showMainView);

    // 大品种变化事件
    formMajorBreed.addEventListener('change', (e) => {
      updateMinorBreedOptions(formMinorBreed, e.target.value);
      formMinorBreed.value = '';
      updateReferenceRanges();
    });

    // 筛选大品种变化
    filterMajorBreed.addEventListener('change', (e) => {
      updateMinorBreedOptions(filterMinorBreed, e.target.value);
      filterMinorBreed.value = '';
    });

    // 初始化品种选项
    initBreedOptions();





    // 清除选择事件
    clearSelectionBtn.addEventListener('click', clearIndicatorSelection);

    // 搜索和重置
    searchBtn.addEventListener('click', filterConfigs);
    resetFilterBtn.addEventListener('click', () => {
      filterMajorBreed.value = '';
      filterMinorBreed.value = '';
      filterIndicatorType.value = '';
      filterIndicatorName.value = '';
      updateMinorBreedOptions(filterMinorBreed, '');
      renderTable();
    });

    // 表单提交
    configForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (!validateForm()) return;

      const configData = {
        majorBreed: formMajorBreed.value,
        minorBreed: formMinorBreed.value,
        indicatorType: selectedIndicatorType.value,
        indicatorName: selectedIndicatorName.value,
        minValue: parseFloat(formMinValue.value),
        maxValue: parseFloat(formMaxValue.value),
        unit: formUnit.value,
        notes: formNotes.value,
        createdAt: new Date().toLocaleString()
      };

      if (currentEditIndex >= 0) {
        // 编辑
        rangeConfigs[currentEditIndex] = {
          ...rangeConfigs[currentEditIndex],
          ...configData
        };
      } else {
        // 新增
        rangeConfigs.push({
          id: generateId(),
          ...configData
        });
      }

      showMainView();
    });

    // 表格操作事件代理
    tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const id = parseInt(btn.dataset.id);

      if (btn.classList.contains('edit-btn')) {
        showFormView(true, id);
      } else if (btn.classList.contains('delete-btn')) {
        deleteConfig(id);
      } else if (btn.classList.contains('copy-btn')) {
        copyConfig(id);
      }
    });

    // 导入模态框事件
    cancelImportBtn.addEventListener('click', () => {
      importModal.classList.add('hidden');
    });

    confirmImportBtn.addEventListener('click', () => {
      // 这里实现批量导入逻辑
      alert('批量导入功能开发中...');
      importModal.classList.add('hidden');
    });

    downloadTemplateBtn.addEventListener('click', () => {
      // 这里实现模板下载逻辑
      alert('模板下载功能开发中...');
    });
  }

  // 初始化品种选项
  function initBreedOptions() {
    refreshBreedOptions();
  }

  // 刷新品种选项
  function refreshBreedOptions() {
    // 获取最新的品种配置
    const currentBreedConfig = getBreedConfig();
    const majorBreeds = Object.keys(currentBreedConfig);
    
    // 清空现有选项
    filterMajorBreed.innerHTML = '<option value="">全部大品种</option>';
    formMajorBreed.innerHTML = '<option value="">请选择大品种</option>';
    
    // 更新筛选器的大品种选项
    majorBreeds.forEach(breed => {
      const option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      filterMajorBreed.appendChild(option);
    });

    // 更新表单的大品种选项
    majorBreeds.forEach(breed => {
      const option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      formMajorBreed.appendChild(option);
    });
  }

  // 监听品种配置更新事件
  document.addEventListener('breedConfigUpdated', () => {
    refreshBreedOptions();
    console.log('正常范围配置模块已更新品种选项');
  });

  // 初始化
  function init() {
    setupEventListeners();
    renderIndicatorTree(); // 初始化树形选择器
    showMainView();
  }

  // 启动初始化
  init();
}

// 导出函数供外部调用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initNormalRangeConfig };
}
