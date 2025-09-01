function initPetInformation() {
  // DOM 元素
  const mainView = document.getElementById("main-view");
  const formView = document.getElementById("form-view");
  const historyView = document.getElementById("history-view");
  const formTitle = document.getElementById("form-title");
  const searchInput = document.getElementById("search-pet");
  const filterBreed = document.getElementById("filter-breed");
  const filterGender = document.getElementById("filter-gender");
  const filterAgeRange = document.getElementById("filter-age-range");
  const tableBody = document.getElementById("pet-table-body");
  const addNewPetButton = document.getElementById("add-new-pet");
  const backToListButton = document.getElementById("back-to-list");
  const backToListFromHistoryButton = document.getElementById("back-to-list-from-history");
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
  const formOwnershipStart = document.getElementById("form-ownership-start");
  const formNotes = document.getElementById("form-notes");
  const ageDisplay = document.getElementById("age-display");

  // 主人变更相关
  const changeOwnerModal = document.getElementById("change-owner-modal");
  const changeOwnerBtn = document.getElementById("change-owner-btn");
  const changeOwnerForm = document.getElementById("change-owner-form");
  const cancelChangeOwnerBtn = document.getElementById("cancel-change-owner");
  const modalNewOwner = document.getElementById("modal-new-owner");
  const modalChangeReason = document.getElementById("modal-change-reason");
  const modalChangeDate = document.getElementById("modal-change-date");
  const modalNotes = document.getElementById("modal-notes");

  // 数据存储
  let pets = [];
  let customers = []; // 将从客户管理模块获取
  let ownershipHistory = []; // 主人变更历史
  let currentEditIndex = -1;
  let currentPetId = null; // 用于主人变更

  // 品种数据配置
  const breedConfig = {
    '猫': [
      '英国短毛猫', '美国短毛猫', '苏格兰折耳猫', '布偶猫', '波斯猫', 
      '暹罗猫', '缅因猫', '挪威森林猫', '俄罗斯蓝猫', '土耳其安哥拉猫',
      '孟加拉猫', '阿比西尼亚猫', '加菲猫', '橘猫', '狸花猫', '其他'
    ],
    '狗': [
      '金毛寻回犬', '拉布拉多犬', '哈士奇', '萨摩耶', '边境牧羊犬',
      '德国牧羊犬', '泰迪', '比熊', '博美', '柯基', '法斗', '英斗',
      '阿拉斯加犬', '松狮', '藏獒', '中华田园犬', '其他'
    ],
    '兔子': [
      '垂耳兔', '侏儒兔', '安哥拉兔', '荷兰兔', '狮子兔', '熊猫兔', '其他'
    ],
    '仓鼠': [
      '金丝熊', '三线仓鼠', '一线仓鼠', '紫仓', '银狐', '布丁仓鼠', '其他'
    ],
    '鸟类': [
      '鹦鹉', '金丝雀', '八哥', '文鸟', '相思鸟', '珍珠鸟', '其他'
    ],
    '爬行动物': [
      '乌龟', '巴西龟', '蜥蜴', '变色龙', '守宫', '蛇类', '其他'
    ],
    '其他': ['其他']
  };

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
      majorBreed: "猫",
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
      majorBreed: "狗",
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
      majorBreed: "猫",
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

  function updateOwnerOptions() {
    formOwner.innerHTML = '<option value="">请选择主人</option>';
    modalNewOwner.innerHTML = '<option value="">请选择新主人</option>';
    
    customers.forEach(customer => {
      const option1 = document.createElement("option");
      option1.value = customer.id;
      option1.textContent = `${customer.name} (${customer.phone})`;
      formOwner.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = customer.id;
      option2.textContent = `${customer.name} (${customer.phone})`;
      modalNewOwner.appendChild(option2);
    });
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
          <button class="text-purple-600 hover:text-purple-900 mr-3 view-history" data-id="${pet.id}">
            <i class="fas fa-history mr-1"></i>历史
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
    historyView.classList.add("hidden");
    renderTable();
  }

  function showFormView(isEdit = false, editId = null) {
    mainView.classList.add("hidden");
    formView.classList.remove("hidden");
    historyView.classList.add("hidden");

    updateOwnerOptions();

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
        formOwner.value = pet.currentOwnerId || "";
        formOwnershipStart.value = pet.ownershipStartDate || "";
        formNotes.value = pet.notes || "";
        
        currentEditIndex = pets.findIndex((p) => p.id === editId);
      }
    } else {
      formTitle.textContent = "新增宠物信息";
      petForm.reset();
      updateImagePreview(null);
      updateMinorBreedOptions();
      // 设置默认拥有开始时间为今天
      formOwnershipStart.value = new Date().toISOString().split('T')[0];
      currentEditIndex = -1;
    }
  }

  function showHistoryView(petId) {
    mainView.classList.add("hidden");
    formView.classList.add("hidden");
    historyView.classList.remove("hidden");

    currentPetId = petId;
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;

    // 显示宠物基本信息
    const petBasicInfo = document.getElementById("pet-basic-info");
    const age = calculateAge(pet.birthDate);
    const ownerName = getOwnerName(pet.currentOwnerId);
    
    petBasicInfo.innerHTML = `
      <div class="flex items-center space-x-4">
        <div class="flex-shrink-0">
          ${pet.image ? 
            `<img src="${pet.image}" alt="${pet.name}" class="w-16 h-16 object-cover rounded-full border">` : 
            `<div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
              <i class="fas fa-paw text-2xl"></i>
            </div>`
          }
        </div>
        <div>
          <h4 class="text-lg font-medium">${pet.name} ${pet.nickname ? `(${pet.nickname})` : ''}</h4>
          <p class="text-gray-600">${pet.majorBreed} • ${pet.minorBreed || '未知品种'} • ${age || '年龄未知'}</p>
          <p class="text-gray-600">当前主人：${ownerName}</p>
        </div>
      </div>
    `;

    // 渲染主人变更历史
    renderOwnershipHistory(petId);
  }

  function renderOwnershipHistory(petId) {
    const historyTableBody = document.getElementById("history-table-body");
    const petHistory = ownershipHistory.filter(h => h.petId === petId);
    
    historyTableBody.innerHTML = "";

    if (petHistory.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-gray-500">暂无主人变更记录</td>
        </tr>
      `;
      return;
    }

    petHistory.sort((a, b) => new Date(b.changeTime) - new Date(a.changeTime));

    petHistory.forEach((record) => {
      const fromOwnerName = record.fromOwnerId ? getOwnerName(record.fromOwnerId) : "无";
      const toOwnerName = getOwnerName(record.toOwnerId);
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${new Date(record.changeTime).toLocaleString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${fromOwnerName}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${toOwnerName}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          ${record.changeReason}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${record.operatorName}
        </td>
      `;
      historyTableBody.appendChild(row);
    });
  }

  // 事件监听器
  addNewPetButton.addEventListener("click", () => {
    showFormView(false);
  });

  backToListButton.addEventListener("click", showMainView);
  backToListFromHistoryButton.addEventListener("click", showMainView);
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
  formMajorBreed.addEventListener("change", updateMinorBreedOptions);

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
    } else if (button.classList.contains("view-history")) {
      showHistoryView(id);
    } else if (button.classList.contains("delete-pet")) {
      const pet = pets.find(p => p.id === id);
      if (pet && confirm(`确定要删除宠物 "${pet.name}" 的信息吗？\n删除后将无法恢复。`)) {
        pets = pets.filter((p) => p.id !== id);
        // 同时删除相关的主人变更历史
        ownershipHistory = ownershipHistory.filter(h => h.petId !== id);
        renderTable(searchInput.value.trim(), filterBreed.value, filterGender.value, filterAgeRange.value);
      }
    }
  });

  // 主人变更相关事件
  changeOwnerBtn.addEventListener("click", () => {
    updateOwnerOptions();
    modalChangeDate.value = new Date().toISOString().split('T')[0];
    changeOwnerModal.classList.remove("hidden");
  });

  cancelChangeOwnerBtn.addEventListener("click", () => {
    changeOwnerModal.classList.add("hidden");
    changeOwnerForm.reset();
  });

  changeOwnerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const newOwnerId = parseInt(modalNewOwner.value);
    const changeReason = modalChangeReason.value;
    const changeDate = modalChangeDate.value;
    const notes = modalNotes.value.trim();

    if (!newOwnerId || !changeReason) {
      alert("新主人和变更原因不能为空！");
      return;
    }

    const pet = pets.find(p => p.id === currentPetId);
    if (!pet) return;

    // 检查是否真的发生了变更
    if (pet.currentOwnerId === newOwnerId) {
      alert("新主人与当前主人相同，无需变更！");
      return;
    }

    // 记录变更历史
    ownershipHistory.push({
      id: ownershipHistory.length + 1,
      petId: currentPetId,
      fromOwnerId: pet.currentOwnerId,
      toOwnerId: newOwnerId,
      changeReason: changeReason,
      changeDate: changeDate || new Date().toISOString().split('T')[0],
      notes: notes,
      operatorName: "系统管理员",
      changeTime: new Date().toLocaleString('zh-CN')
    });

    // 更新宠物的当前主人
    const petIndex = pets.findIndex(p => p.id === currentPetId);
    pets[petIndex].currentOwnerId = newOwnerId;
    pets[petIndex].ownershipStartDate = changeDate || new Date().toISOString().split('T')[0];
    pets[petIndex].updatedAt = new Date().toLocaleString('zh-CN');

    changeOwnerModal.classList.add("hidden");
    changeOwnerForm.reset();
    showHistoryView(currentPetId); // 刷新历史视图
  });

  // 点击模态框背景关闭
  changeOwnerModal.addEventListener("click", (e) => {
    if (e.target === changeOwnerModal) {
      changeOwnerModal.classList.add("hidden");
      changeOwnerForm.reset();
    }
  });

  // 初始化
  showMainView();
}

// 如果 DOM 已加载完成，立即执行；否则等待 DOMContentLoaded 事件
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPetInformation);
} else {
  initPetInformation();
}
