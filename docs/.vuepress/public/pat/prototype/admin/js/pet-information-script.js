function initPetInformation() {
  // DOM 元素
  const mainView = document.getElementById("main-view");
  const formView = document.getElementById("form-view");
  const formTitle = document.getElementById("form-title");
  const searchInput = document.getElementById("search-pet");
  const filterBreed = document.getElementById("filter-breed");
  const filterGender = document.getElementById("filter-gender");
  const filterAgeRange = document.getElementById("filter-age-range");
  const tableBody = document.getElementById("pet-table-body");
  const addNewPetButton = document.getElementById("add-new-pet");
  const backToListButton = document.getElementById("back-to-list");
  const petForm = document.getElementById("pet-form");
  const cancelFormButton = document.getElementById("cancel-form");

  // 表单字段
  const formPetName = document.getElementById("form-pet-name");
  const formPetNickname = document.getElementById("form-pet-nickname");
  const formPetImage = document.getElementById("form-pet-image");
  const imagePreview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");
  const formMajorBreed = document.getElementById("form-major-breed");
  const formMinorBreed = document.getElementById("form-minor-breed");
  const formBirthDate = document.getElementById("form-birth-date");
  const formGender = document.getElementById("form-gender");
  const formSterilized = document.getElementById("form-sterilized");
  const formOwner = document.getElementById("form-owner");
  const selectedOwnerDisplay = document.getElementById("selected-owner-display");
  const selectOwnerBtn = document.getElementById("select-owner-btn");
  const clearOwnerBtn = document.getElementById("clear-owner-btn");
  const formOwnershipStart = document.getElementById("form-ownership-start");
  const formNotes = document.getElementById("form-notes");
  const ageDisplay = document.getElementById("age-display");

  // 主人选择相关
  const ownerSelectionModal = document.getElementById("owner-selection-modal");
  const closeOwnerModalBtn = document.getElementById("close-owner-modal");
  const ownerSearch = document.getElementById("owner-search");
  const searchOwnersBtn = document.getElementById("search-owners");
  const ownersList = document.getElementById("owners-list");
  const cancelOwnerSelectionBtn = document.getElementById("cancel-owner-selection");
  const addNewOwnerBtn = document.getElementById("add-new-owner-btn");
  
  // 新建主人相关
  const newOwnerModal = document.getElementById("new-owner-modal");
  const closeNewOwnerModalBtn = document.getElementById("close-new-owner-modal");
  const newOwnerForm = document.getElementById("new-owner-form");
  const cancelNewOwnerBtn = document.getElementById("cancel-new-owner");

  // 数据存储
  let pets = [];
  let customers = []; // 将从客户管理模块获取
  let currentEditIndex = -1;

  // 从字典数据服务获取品种配置
  function getBreedConfig() {
    if (typeof window.dictionaryDataService !== 'undefined') {
      const config = window.dictionaryDataService.getFlatBreedConfig();
      // 为每个品种添加"其他"选项
      Object.keys(config).forEach(breed => {
        if (!config[breed].includes('其他')) {
          config[breed].push('其他');
        }
      });
      return config;
    }
    
    // 降级方案：如果字典服务不可用，使用默认配置
    return {
      '猫科': ['英国短毛猫', '波斯猫', '橘猫', '布偶猫', '暹罗猫', '缅因猫', '通用猫科', '其他'],
      '犬科': ['金毛寻回犬', '拉布拉多犬', '哈士奇', '萨摩耶', '边境牧羊犬', '德国牧羊犬', '泰迪', '比熊', '博美', '柯基', '法斗', '中华田园犬', '通用犬科', '其他'],
      '兔科': ['垂耳兔', '侏儒兔', '安哥拉兔', '荷兰兔', '狮子兔', '通用兔科', '其他'],
      '仓鼠科': ['金丝熊', '三线仓鼠', '一线仓鼠', '通用仓鼠', '其他'],
      '鸟类': ['鹦鹉', '金丝雀', '通用鸟类', '其他'],
      '爬行动物': ['乌龟', '蜥蜴', '通用爬行动物', '其他'],
      '其他': ['其他']
    };
  }

  // 获取动态品种配置
  let breedConfig = getBreedConfig();

  // 监听品种配置更新事件
  document.addEventListener('breedConfigUpdated', () => {
    breedConfig = getBreedConfig();
    initBreedOptions();
    console.log('宠物信息模块已更新品种配置');
  });

  // 初始化品种选项
  function initBreedOptions() {
    const majorBreeds = Object.keys(breedConfig);
    
    // 更新表单的大品种选项
    formMajorBreed.innerHTML = '<option value="">请选择大品种</option>';
    majorBreeds.forEach(breed => {
      const option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      formMajorBreed.appendChild(option);
    });

    // 更新筛选器的品种选项
    filterBreed.innerHTML = '<option value="">全部品种</option>';
    majorBreeds.forEach(breed => {
      const option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      filterBreed.appendChild(option);
    });
  }

  // 更新小品种选项
  function updateMinorBreedOptions(majorBreed) {
    formMinorBreed.innerHTML = '<option value="">请选择小品种</option>';
    
    if (majorBreed && breedConfig[majorBreed]) {
      breedConfig[majorBreed].forEach(breed => {
        const option = document.createElement('option');
        option.value = breed;
        option.textContent = breed;
        formMinorBreed.appendChild(option);
      });
    }
  }

  // 初始化测试数据
  customers = [
    { id: 1, name: "张女士", phone: "13812345678" },
    { id: 2, name: "李先生", phone: "13987654321" },
    { id: 3, name: "王女士", phone: "13666888999" },
    { id: 4, name: "陈先生", phone: "13555777888" }
  ];

  pets = [
    {
      id: 1,
      name: "小花",
      nickname: "花花",
      image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop",
      majorBreed: "猫科",
      minorBreed: "英国短毛猫",
      birthDate: "2021-03-15",
      gender: "female",
      sterilized: "yes",
      currentOwnerId: 1,
      ownershipStartDate: "2021-03-20",
      notes: "性格温顺，喜欢晒太阳，对鱼类过敏",
      createdAt: "2021-03-20 10:30:00",
      updatedAt: "2024-12-15 14:20:00"
    },
    {
      id: 2,
      name: "阿黄",
      nickname: "大黄",
      image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop",
      majorBreed: "犬科",
      minorBreed: "金毛寻回犬",
      birthDate: "2020-01-10",
      gender: "male",
      sterilized: "no",
      currentOwnerId: 2,
      ownershipStartDate: "2020-01-15",
      notes: "活泼好动，需要大量运动，喜欢游泳",
      createdAt: "2020-01-15 09:15:00",
      updatedAt: "2024-11-20 16:45:00"
    },
    {
      id: 3,
      name: "咪咪",
      nickname: "",
      image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=200&h=200&fit=crop",
      majorBreed: "猫科",
      minorBreed: "布偶猫",
      birthDate: "2023-06-01",
      gender: "female",
      sterilized: "unknown",
      currentOwnerId: 3,
      ownershipStartDate: "2023-06-05",
      notes: "刚领养不久，比较胆小，正在适应新环境",
      createdAt: "2023-06-05 16:20:00",
      updatedAt: "2023-06-05 16:20:00"
    }
  ];

  ownershipHistory = [
    {
      id: 1,
      petId: 2,
      fromOwnerId: null,
      toOwnerId: 2,
      changeReason: "收养",
      changeDate: "2020-01-15",
      notes: "从救助站收养",
      operatorName: "系统管理员",
      changeTime: "2020-01-15 09:15:00"
    }
  ];

  function generateId() {
    return Math.max(...pets.map((p) => p.id || 0), 0) + 1;
  }

  // 图片处理函数
  function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }

      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件！');
        reject(new Error('Invalid file type'));
        return;
      }

      // 检查文件大小 (2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('图片文件不能超过 2MB！');
        reject(new Error('File too large'));
        return;
      }

      // 创建 FileReader 来读取文件
      const reader = new FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.onerror = function() {
        reject(new Error('Error reading file'));
      };
      reader.readAsDataURL(file);
    });
  }

  function updateImagePreview(imageSrc) {
    if (imageSrc) {
      previewImg.src = imageSrc;
      imagePreview.classList.remove('hidden');
    } else {
      previewImg.src = '';
      imagePreview.classList.add('hidden');
    }
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

  function getOwnerName(ownerId) {
    const owner = customers.find(c => c.id === ownerId);
    return owner ? owner.name : "未知主人";
  }

  function updateMinorBreedOptions() {
    const majorBreed = formMajorBreed.value;
    formMinorBreed.innerHTML = '<option value="">请选择具体品种</option>';
    
    if (majorBreed && breedConfig[majorBreed]) {
      breedConfig[majorBreed].forEach(breed => {
        const option = document.createElement("option");
        option.value = breed;
        option.textContent = breed;
        formMinorBreed.appendChild(option);
      });
    }
  }

  // 主人选择相关功能
  function showOwnerSelectionModal() {
    ownerSelectionModal.classList.remove('hidden');
    renderOwnersList();
  }

  function hideOwnerSelectionModal() {
    ownerSelectionModal.classList.add('hidden');
    ownerSearch.value = '';
  }

  function renderOwnersList(searchTerm = '') {
    const filteredCustomers = customers.filter(customer => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return customer.name.toLowerCase().includes(term) || 
             customer.phone.includes(term);
    });

    ownersList.innerHTML = '';
    
    if (filteredCustomers.length === 0) {
      ownersList.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-4 text-center text-gray-500">
            ${searchTerm ? '未找到匹配的客户' : '暂无客户数据'}
          </td>
        </tr>
      `;
      return;
    }

    filteredCustomers.forEach(customer => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50';
      row.innerHTML = `
        <td class="px-4 py-2">
          <button type="button" class="select-owner-btn px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600" data-owner-id="${customer.id}">
            选择
          </button>
        </td>
        <td class="px-4 py-2">${customer.name}</td>
        <td class="px-4 py-2">${customer.phone}</td>
        <td class="px-4 py-2">${customer.wechat || '-'}</td>
      `;
      ownersList.appendChild(row);
    });

    // 添加选择按钮事件监听
    ownersList.querySelectorAll('.select-owner-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ownerId = parseInt(e.target.dataset.ownerId);
        selectOwner(ownerId);
      });
    });
  }

  function selectOwner(ownerId) {
    const owner = customers.find(c => c.id === ownerId);
    if (owner) {
      formOwner.value = ownerId;
      selectedOwnerDisplay.value = `${owner.name} (${owner.phone})`;
      clearOwnerBtn.classList.remove('hidden');
      hideOwnerSelectionModal();
    }
  }

  function clearSelectedOwner() {
    formOwner.value = '';
    selectedOwnerDisplay.value = '';
    clearOwnerBtn.classList.add('hidden');
  }

  function showNewOwnerModal() {
    newOwnerModal.classList.remove('hidden');
    newOwnerForm.reset();
  }

  function hideNewOwnerModal() {
    newOwnerModal.classList.add('hidden');
  }

  function createNewOwner(ownerData) {
    const newId = Math.max(...customers.map(c => c.id), 0) + 1;
    const newOwner = {
      id: newId,
      name: ownerData.name,
      phone: ownerData.phone,
      wechat: ownerData.wechat || null,
      email: ownerData.email || null,
      preferredContact: 'phone',
      serviceLevel: 'standard',
      notes: '通过宠物档案创建',
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
      lastActiveAt: new Date().toLocaleString()
    };
    
    customers.push(newOwner);
    selectOwner(newId);
    hideNewOwnerModal();
    
    // 触发客户数据更新事件（如果需要同步到客户管理模块）
    document.dispatchEvent(new CustomEvent('customerDataUpdated', {
      detail: { customers, newCustomer: newOwner }
    }));
  }

  function filterPetsByAge(pets, ageRange) {
    if (!ageRange) return pets;
    
    return pets.filter(pet => {
      if (!pet.birthDate) return false;
      
      const birth = new Date(pet.birthDate);
      const today = new Date();
      const ageInYears = (today - birth) / (1000 * 60 * 60 * 24 * 365.25);
      
      switch(ageRange) {
        case '0-1': return ageInYears <= 1;
        case '1-3': return ageInYears > 1 && ageInYears <= 3;
        case '3-7': return ageInYears > 3 && ageInYears <= 7;
        case '7+': return ageInYears > 7;
        default: return true;
      }
    });
  }

  function renderTable(filter = "", breedFilter = "", genderFilter = "", ageFilter = "") {
    // 过滤数据
    let filteredPets = pets.filter((pet) => {
      const matchesSearch = !filter || 
        pet.name.toLowerCase().includes(filter.toLowerCase()) ||
        pet.nickname.toLowerCase().includes(filter.toLowerCase()) ||
        pet.majorBreed.toLowerCase().includes(filter.toLowerCase()) ||
        pet.minorBreed.toLowerCase().includes(filter.toLowerCase()) ||
        getOwnerName(pet.currentOwnerId).toLowerCase().includes(filter.toLowerCase());
      
      const matchesBreed = !breedFilter || pet.majorBreed === breedFilter;
      const matchesGender = !genderFilter || pet.gender === genderFilter;
      
      return matchesSearch && matchesBreed && matchesGender;
    });

    // 年龄筛选
    filteredPets = filterPetsByAge(filteredPets, ageFilter);

    // 按创建时间倒序排列
    filteredPets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    tableBody.innerHTML = "";

    if (filteredPets.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-4 text-center text-gray-500">暂无宠物信息</td>
        </tr>
      `;
      return;
    }

    filteredPets.forEach((pet) => {
      const age = calculateAge(pet.birthDate);
      const genderDisplay = pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知';
      const ownerName = getOwnerName(pet.currentOwnerId);
      
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center justify-center">
            ${pet.image ? 
              `<img src="${pet.image}" alt="${pet.name}" class="w-12 h-12 object-cover rounded-full border">` : 
              `<div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                <i class="fas fa-paw text-xl"></i>
              </div>`
            }
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="text-sm font-medium text-gray-900">${pet.name}</div>
            ${pet.nickname ? `<div class="text-xs text-gray-500 ml-2">(${pet.nickname})</div>` : ''}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${pet.majorBreed}</div>
          <div class="text-sm text-gray-500">${pet.minorBreed || '-'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">${age || '-'}</div>
          <div class="text-sm text-gray-500">${genderDisplay}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${ownerName}</div>
          <div class="text-sm text-gray-500">
            ${pet.ownershipStartDate ? new Date(pet.ownershipStartDate).toLocaleDateString() : '-'}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${new Date(pet.createdAt).toLocaleDateString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 mr-3 edit-pet" data-id="${pet.id}">
            <i class="fas fa-edit mr-1"></i>编辑
          </button>
          <button class="text-red-600 hover:text-red-900 delete-pet" data-id="${pet.id}">
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
    renderTable();
  }

  function showFormView(isEdit = false, editId = null) {
    mainView.classList.add("hidden");
    formView.classList.remove("hidden");

    if (isEdit && editId) {
      const pet = pets.find((p) => p.id === editId);
      if (pet) {
        formTitle.textContent = "编辑宠物信息";
        
        formPetName.value = pet.name;
        formPetNickname.value = pet.nickname || "";
        updateImagePreview(pet.image);
        formMajorBreed.value = pet.majorBreed;
        updateMinorBreedOptions();
        formMinorBreed.value = pet.minorBreed || "";
        formBirthDate.value = pet.birthDate || "";
        formGender.value = pet.gender || "";
        formSterilized.value = pet.sterilized || "";
        // 设置主人信息
        if (pet.currentOwnerId) {
          const owner = customers.find(c => c.id === pet.currentOwnerId);
          if (owner) {
            formOwner.value = pet.currentOwnerId;
            selectedOwnerDisplay.value = `${owner.name} (${owner.phone})`;
            clearOwnerBtn.classList.remove('hidden');
          }
        } else {
          clearSelectedOwner();
        }
        formOwnershipStart.value = pet.ownershipStartDate || "";
        formNotes.value = pet.notes || "";
        
        currentEditIndex = pets.findIndex((p) => p.id === editId);
      }
    } else {
      formTitle.textContent = "新增宠物信息";
      petForm.reset();
      updateImagePreview(null);
      updateMinorBreedOptions('');
      clearSelectedOwner();
      // 设置默认拥有开始时间为今天
      formOwnershipStart.value = new Date().toISOString().split('T')[0];
      currentEditIndex = -1;
    }
  }




  // 事件监听器
  addNewPetButton.addEventListener("click", () => {
    showFormView(false);
  });

  backToListButton.addEventListener("click", showMainView);
  cancelFormButton.addEventListener("click", showMainView);

  // 搜索和筛选
  searchInput.addEventListener("input", (e) => {
    renderTable(e.target.value.trim(), filterBreed.value, filterGender.value, filterAgeRange.value);
  });

  filterBreed.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), e.target.value, filterGender.value, filterAgeRange.value);
  });

  filterGender.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), filterBreed.value, e.target.value, filterAgeRange.value);
  });

  filterAgeRange.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), filterBreed.value, filterGender.value, e.target.value);
  });

  // 品种联动
  formMajorBreed.addEventListener("change", (e) => {
    updateMinorBreedOptions(e.target.value);
    formMinorBreed.value = '';
  });

  // 主人选择相关事件
  selectOwnerBtn.addEventListener("click", showOwnerSelectionModal);
  clearOwnerBtn.addEventListener("click", clearSelectedOwner);
  closeOwnerModalBtn.addEventListener("click", hideOwnerSelectionModal);
  cancelOwnerSelectionBtn.addEventListener("click", hideOwnerSelectionModal);
  
  // 主人搜索
  searchOwnersBtn.addEventListener("click", () => {
    renderOwnersList(ownerSearch.value.trim());
  });
  
  ownerSearch.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') {
      renderOwnersList(e.target.value.trim());
    }
  });

  // 新建主人相关事件
  addNewOwnerBtn.addEventListener("click", () => {
    hideOwnerSelectionModal();
    showNewOwnerModal();
  });
  
  closeNewOwnerModalBtn.addEventListener("click", hideNewOwnerModal);
  cancelNewOwnerBtn.addEventListener("click", hideNewOwnerModal);
  
  newOwnerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const ownerData = {
      name: formData.get("new-owner-name") || document.getElementById("new-owner-name").value,
      phone: formData.get("new-owner-phone") || document.getElementById("new-owner-phone").value,
      wechat: formData.get("new-owner-wechat") || document.getElementById("new-owner-wechat").value,
      email: formData.get("new-owner-email") || document.getElementById("new-owner-email").value
    };
    
    if (!ownerData.name || !ownerData.phone) {
      alert("请填写姓名和手机号");
      return;
    }
    
    // 检查手机号是否已存在
    const existingCustomer = customers.find(c => c.phone === ownerData.phone);
    if (existingCustomer) {
      alert("该手机号已存在，请检查是否重复添加！");
      return;
    }
    
    createNewOwner(ownerData);
  });

  // 年龄计算
  formBirthDate.addEventListener("change", (e) => {
    const age = calculateAge(e.target.value);
    ageDisplay.textContent = age ? `当前年龄：${age}` : "年龄将自动计算";
  });

  // 图片预览
  formPetImage.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const imageUrl = await handleImageUpload(file);
        updateImagePreview(imageUrl);
      } catch (error) {
        console.error('图片预览失败:', error);
        updateImagePreview(null);
        formPetImage.value = '';
      }
    } else {
      updateImagePreview(null);
    }
  });

  // 表单提交
  petForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const petName = formPetName.value.trim();
    const majorBreed = formMajorBreed.value;

    if (!petName || !majorBreed) {
      alert("宠物姓名和大品种不能为空！");
      return;
    }

    // 处理图片上传
    let imageUrl = null;
    if (formPetImage.files && formPetImage.files[0]) {
      try {
        imageUrl = await handleImageUpload(formPetImage.files[0]);
      } catch (error) {
        console.error('图片上传失败:', error);
        return;
      }
    } else if (currentEditIndex >= 0) {
      // 编辑模式下，如果没有新图片，保持原有图片
      imageUrl = pets[currentEditIndex].image;
    }

    const petData = {
      name: petName,
      nickname: formPetNickname.value.trim() || "",
      image: imageUrl,
      majorBreed: majorBreed,
      minorBreed: formMinorBreed.value || "",
      birthDate: formBirthDate.value || null,
      gender: formGender.value || null,
      sterilized: formSterilized.value || null,
      currentOwnerId: formOwner.value ? parseInt(formOwner.value) : null,
      ownershipStartDate: formOwnershipStart.value || null,
      notes: formNotes.value.trim() || ""
    };

    if (currentEditIndex >= 0) {
      // 编辑
      const oldPet = pets[currentEditIndex];
      pets[currentEditIndex] = {
        ...oldPet,
        ...petData,
        updatedAt: new Date().toLocaleString('zh-CN')
      };

      // 如果主人发生变更，记录历史
      if (oldPet.currentOwnerId !== petData.currentOwnerId && petData.currentOwnerId) {
        ownershipHistory.push({
          id: ownershipHistory.length + 1,
          petId: oldPet.id,
          fromOwnerId: oldPet.currentOwnerId,
          toOwnerId: petData.currentOwnerId,
          changeReason: "编辑更新",
          changeDate: new Date().toISOString().split('T')[0],
          notes: "通过编辑宠物信息变更主人",
          operatorName: "系统管理员",
          changeTime: new Date().toLocaleString('zh-CN')
        });
      }
    } else {
      // 新增
      const newPetId = generateId();
      pets.push({
        id: newPetId,
        ...petData,
        createdAt: new Date().toLocaleString('zh-CN'),
        updatedAt: new Date().toLocaleString('zh-CN')
      });

      // 如果有主人，记录初始拥有记录
      if (petData.currentOwnerId) {
        ownershipHistory.push({
          id: ownershipHistory.length + 1,
          petId: newPetId,
          fromOwnerId: null,
          toOwnerId: petData.currentOwnerId,
          changeReason: "初始录入",
          changeDate: petData.ownershipStartDate || new Date().toISOString().split('T')[0],
          notes: "宠物信息初始录入",
          operatorName: "系统管理员",
          changeTime: new Date().toLocaleString('zh-CN')
        });
      }
    }

    showMainView();
  });

  // 表格操作事件代理
  tableBody.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    const id = parseInt(button.dataset.id);

    if (button.classList.contains("edit-pet")) {
      showFormView(true, id);
    } else if (button.classList.contains("delete-pet")) {
      const pet = pets.find(p => p.id === id);
      if (pet && confirm(`确定要删除宠物 "${pet.name}" 的信息吗？\n删除后将无法恢复。`)) {
        pets = pets.filter((p) => p.id !== id);
        renderTable(searchInput.value.trim(), filterBreed.value, filterGender.value, filterAgeRange.value);
      }
    }
  });


  // 初始化
  initBreedOptions();
  showMainView();
}

// 如果 DOM 已加载完成，立即执行；否则等待 DOMContentLoaded 事件
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPetInformation);
} else {
  initPetInformation();
}
