function initCustomerManagement() {
  // DOM 元素
  const mainView = document.getElementById("main-view");
  const formView = document.getElementById("form-view");
  const detailView = document.getElementById("detail-view");
  const formTitle = document.getElementById("form-title");
  const detailTitle = document.getElementById("detail-title");
  const searchInput = document.getElementById("search-customer");
  const filterPetCount = document.getElementById("filter-pet-count");
  const filterRegistration = document.getElementById("filter-registration");
  const tableBody = document.getElementById("customer-table-body");
  const addNewCustomerButton = document.getElementById("add-new-customer");
  const backToListButton = document.getElementById("back-to-list");
  const backToListFromDetailButton = document.getElementById("back-to-list-from-detail");
  const customerForm = document.getElementById("customer-form");
  const cancelFormButton = document.getElementById("cancel-form");

  // 表单字段
  const formCustomerName = document.getElementById("form-customer-name");
  const formIdNumber = document.getElementById("form-id-number");
  const formPhone = document.getElementById("form-phone");
  const formWechat = document.getElementById("form-wechat");
  const formEmail = document.getElementById("form-email");
  const formEmergencyContact = document.getElementById("form-emergency-contact");
  const formAddress = document.getElementById("form-address");
  const formPreferredContact = document.getElementById("form-preferred-contact");
  const formServiceLevel = document.getElementById("form-service-level");
  const formNotes = document.getElementById("form-notes");

  // 详情视图相关
  const customerInfoCard = document.getElementById("customer-info-card");
  const customerPetsGrid = document.getElementById("customer-pets-grid");
  const noPetsMessage = document.getElementById("no-pets-message");
  const addPetForCustomerBtn = document.getElementById("add-pet-for-customer");
  const totalReportsEl = document.getElementById("total-reports");
  const lastServiceEl = document.getElementById("last-service");
  const serviceLevelDisplayEl = document.getElementById("service-level-display");

  // 数据存储
  let customers = [];
  let pets = []; // 将从宠物信息模块获取
  let reports = []; // 将从萌宠报告模块获取
  let currentEditIndex = -1;
  let currentCustomerId = null;

  // 初始化测试数据
  customers = [
    {
      id: 1,
      name: "张女士",
      idNumber: "110101199001011234",
      phone: "13812345678",
      wechat: "zhang_wechat",
      email: "zhang@email.com",
      emergencyContact: "张先生 - 13800001111",
      address: "北京市朝阳区某某小区1号楼101室",
      preferredContact: "wechat",
      serviceLevel: "premium",
      notes: "VIP客户，对服务质量要求较高，养猫经验丰富",
      createdAt: "2021-03-20 10:30:00",
      updatedAt: "2024-12-15 14:20:00",
      lastActiveAt: "2024-12-15 14:20:00"
    },
    {
      id: 2,
      name: "李先生",
      idNumber: "320101198501015678",
      phone: "13987654321",
      wechat: "li_wechat",
      email: "li@email.com",
      emergencyContact: "李太太 - 13900002222",
      address: "上海市浦东新区某某路88号",
      preferredContact: "phone",
      serviceLevel: "standard",
      notes: "首次养宠，需要更多指导和建议",
      createdAt: "2020-01-15 09:15:00",
      updatedAt: "2024-11-20 16:45:00",
      lastActiveAt: "2024-11-20 16:45:00"
    },
    {
      id: 3,
      name: "王女士",
      idNumber: "440101199203019876",
      phone: "13666888999",
      wechat: "wang_wechat",
      email: "wang@email.com",
      emergencyContact: "王妈妈 - 13700003333",
      address: "广州市天河区某某大厦2301室",
      preferredContact: "wechat",
      serviceLevel: "vip",
      notes: "对宠物非常关爱，经常咨询健康问题",
      createdAt: "2023-06-05 16:20:00",
      updatedAt: "2023-06-05 16:20:00",
      lastActiveAt: "2023-08-15 10:30:00"
    },
    {
      id: 4,
      name: "陈先生",
      idNumber: "510101199512015432",
      phone: "13555777888",
      wechat: "",
      email: "chen@email.com",
      emergencyContact: "",
      address: "成都市锦江区某某街道123号",
      preferredContact: "phone",
      serviceLevel: "standard",
      notes: "工作繁忙，偏好电话联系",
      createdAt: "2024-01-10 11:45:00",
      updatedAt: "2024-01-10 11:45:00",
      lastActiveAt: "2024-01-10 11:45:00"
    }
  ];

  // 模拟宠物数据（与宠物信息模块同步）
  pets = [
    {
      id: 1, name: "小花", majorBreed: "猫", minorBreed: "英国短毛猫", 
      currentOwnerId: 1, birthDate: "2021-03-15", gender: "female"
    },
    {
      id: 2, name: "阿黄", majorBreed: "狗", minorBreed: "金毛寻回犬", 
      currentOwnerId: 2, birthDate: "2020-01-10", gender: "male"
    },
    {
      id: 3, name: "咪咪", majorBreed: "猫", minorBreed: "布偶猫", 
      currentOwnerId: 3, birthDate: "2023-06-01", gender: "female"
    }
  ];

  // 模拟报告数据（与萌宠报告模块同步）
  reports = [
    { id: 1, petId: 1, ownerId: 1, createdAt: "2025-01-15", status: "completed" },
    { id: 2, petId: 2, ownerId: 2, createdAt: "2025-01-14", status: "reviewed" },
    { id: 3, petId: 3, ownerId: 3, createdAt: "2025-01-13", status: "processing" }
  ];

  function generateId() {
    return Math.max(...customers.map((c) => c.id || 0), 0) + 1;
  }

  function getCustomerPets(customerId) {
    return pets.filter(pet => pet.currentOwnerId === customerId);
  }

  function getCustomerReports(customerId) {
    return reports.filter(report => report.ownerId === customerId);
  }

  function getServiceLevelDisplay(level) {
    const levelMap = {
      'standard': { text: '标准', color: 'bg-gray-100 text-gray-800' },
      'premium': { text: '优质', color: 'bg-blue-100 text-blue-800' },
      'vip': { text: 'VIP', color: 'bg-purple-100 text-purple-800' }
    };
    return levelMap[level] || levelMap['standard'];
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

  function filterCustomersByPetCount(customers, petCountFilter) {
    if (!petCountFilter) return customers;
    
    return customers.filter(customer => {
      const petCount = getCustomerPets(customer.id).length;
      
      switch(petCountFilter) {
        case '0': return petCount === 0;
        case '1': return petCount === 1;
        case '2-5': return petCount >= 2 && petCount <= 5;
        case '5+': return petCount > 5;
        default: return true;
      }
    });
  }

  function filterCustomersByRegistration(customers, registrationFilter) {
    if (!registrationFilter) return customers;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch(registrationFilter) {
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        filterDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return customers;
    }
    
    return customers.filter(customer => {
      const createdDate = new Date(customer.createdAt);
      return createdDate >= filterDate;
    });
  }

  function renderTable(filter = "", petCountFilter = "", registrationFilter = "") {
    // 过滤数据
    let filteredCustomers = customers.filter((customer) => {
      const matchesSearch = !filter || 
        customer.name.toLowerCase().includes(filter.toLowerCase()) ||
        customer.phone.includes(filter) ||
        customer.idNumber.includes(filter) ||
        customer.wechat.toLowerCase().includes(filter.toLowerCase());
      
      return matchesSearch;
    });

    // 宠物数量筛选
    filteredCustomers = filterCustomersByPetCount(filteredCustomers, petCountFilter);
    
    // 注册时间筛选
    filteredCustomers = filterCustomersByRegistration(filteredCustomers, registrationFilter);

    // 按最后活跃时间倒序排列
    filteredCustomers.sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));

    tableBody.innerHTML = "";

    if (filteredCustomers.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">暂无客户信息</td>
        </tr>
      `;
      return;
    }

    filteredCustomers.forEach((customer) => {
      const customerPets = getCustomerPets(customer.id);
      const serviceLevel = getServiceLevelDisplay(customer.serviceLevel);
      
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="text-sm font-medium text-gray-900">${customer.name}</div>
            <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${serviceLevel.color}">
              ${serviceLevel.text}
            </span>
          </div>
          <div class="text-sm text-gray-500">${customer.idNumber ? customer.idNumber.substring(0, 6) + '****' + customer.idNumber.substring(14) : '未填写'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${customer.phone}</div>
          <div class="text-sm text-gray-500">${customer.wechat || '未填写微信'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ${customerPets.length} 只宠物
            </span>
          </div>
          ${customerPets.length > 0 ? `<div class="text-xs text-gray-500 mt-1">${customerPets.map(p => p.name).join(', ')}</div>` : ''}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${new Date(customer.createdAt).toLocaleDateString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${new Date(customer.lastActiveAt).toLocaleDateString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 mr-3 view-customer" data-id="${customer.id}">
            <i class="fas fa-eye mr-1"></i>查看
          </button>
          <button class="text-green-600 hover:text-green-900 mr-3 edit-customer" data-id="${customer.id}">
            <i class="fas fa-edit mr-1"></i>编辑
          </button>
          <button class="text-red-600 hover:text-red-900 delete-customer" data-id="${customer.id}">
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
    detailView.classList.add("hidden");
    renderTable();
  }

  function showFormView(isEdit = false, editId = null) {
    mainView.classList.add("hidden");
    formView.classList.remove("hidden");
    detailView.classList.add("hidden");

    if (isEdit && editId) {
      const customer = customers.find((c) => c.id === editId);
      if (customer) {
        formTitle.textContent = "编辑客户信息";
        
        formCustomerName.value = customer.name;
        formIdNumber.value = customer.idNumber || "";
        formPhone.value = customer.phone;
        formWechat.value = customer.wechat || "";
        formEmail.value = customer.email || "";
        formEmergencyContact.value = customer.emergencyContact || "";
        formAddress.value = customer.address || "";
        formPreferredContact.value = customer.preferredContact || "";
        formServiceLevel.value = customer.serviceLevel || "standard";
        formNotes.value = customer.notes || "";
        
        currentEditIndex = customers.findIndex((c) => c.id === editId);
      }
    } else {
      formTitle.textContent = "新增客户信息";
      customerForm.reset();
      formServiceLevel.value = "standard"; // 默认标准服务
      currentEditIndex = -1;
    }
  }

  function showDetailView(customerId) {
    mainView.classList.add("hidden");
    formView.classList.add("hidden");
    detailView.classList.remove("hidden");

    currentCustomerId = customerId;
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    detailTitle.textContent = `${customer.name} - 客户详情`;

    // 渲染客户信息卡片
    renderCustomerInfoCard(customer);
    
    // 渲染名下宠物
    renderCustomerPets(customerId);
    
    // 渲染服务历史统计
    renderServiceHistory(customerId);
  }

  function renderCustomerInfoCard(customer) {
    const serviceLevel = getServiceLevelDisplay(customer.serviceLevel);
    
    customerInfoCard.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-4">
          <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl border-2 border-blue-200">
            👤
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-900">${customer.name}</h3>
            <div class="mt-1 space-y-1">
              <p class="text-sm text-gray-600">
                <i class="fas fa-phone w-4 text-center mr-2"></i>${customer.phone}
              </p>
              ${customer.wechat ? `<p class="text-sm text-gray-600"><i class="fab fa-weixin w-4 text-center mr-2"></i>${customer.wechat}</p>` : ''}
              ${customer.email ? `<p class="text-sm text-gray-600"><i class="fas fa-envelope w-4 text-center mr-2"></i>${customer.email}</p>` : ''}
              ${customer.address ? `<p class="text-sm text-gray-600"><i class="fas fa-map-marker-alt w-4 text-center mr-2"></i>${customer.address}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="text-right">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${serviceLevel.color}">
            ${serviceLevel.text}服务
          </span>
          <p class="text-xs text-gray-500 mt-2">注册时间：${new Date(customer.createdAt).toLocaleDateString()}</p>
          <p class="text-xs text-gray-500">最后活跃：${new Date(customer.lastActiveAt).toLocaleDateString()}</p>
        </div>
      </div>
      ${customer.notes ? `<div class="mt-4 p-3 bg-white rounded border-l-4 border-blue-400"><p class="text-sm text-gray-700"><strong>备注：</strong>${customer.notes}</p></div>` : ''}
    `;
  }

  function renderCustomerPets(customerId) {
    const customerPets = getCustomerPets(customerId);
    
    if (customerPets.length === 0) {
      customerPetsGrid.classList.add("hidden");
      noPetsMessage.classList.remove("hidden");
      return;
    }
    
    customerPetsGrid.classList.remove("hidden");
    noPetsMessage.classList.add("hidden");
    
    customerPetsGrid.innerHTML = "";
    
    customerPets.forEach(pet => {
      const age = calculateAge(pet.birthDate);
      const genderIcon = pet.gender === 'male' ? '♂' : pet.gender === 'female' ? '♀' : '?';
      const genderColor = pet.gender === 'male' ? 'text-blue-500' : pet.gender === 'female' ? 'text-pink-500' : 'text-gray-500';
      
      const petCard = document.createElement("div");
      petCard.className = "bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer";
      petCard.innerHTML = `
        <div class="flex items-start justify-between mb-3">
          <div class="text-2xl">🐾</div>
          <span class="${genderColor} text-lg font-bold">${genderIcon}</span>
        </div>
        <h5 class="font-medium text-gray-900 mb-1">${pet.name}</h5>
        <p class="text-sm text-gray-600">${pet.majorBreed} • ${pet.minorBreed || '未知品种'}</p>
        <p class="text-sm text-gray-500">${age || '年龄未知'}</p>
        <div class="mt-3 flex space-x-2">
          <button class="flex-1 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 edit-pet-from-customer" data-pet-id="${pet.id}">
            编辑
          </button>
          <button class="flex-1 text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 view-pet-reports" data-pet-id="${pet.id}">
            报告
          </button>
        </div>
      `;
      
      customerPetsGrid.appendChild(petCard);
    });
  }

  function renderServiceHistory(customerId) {
    const customerReports = getCustomerReports(customerId);
    const customer = customers.find(c => c.id === customerId);
    
    totalReportsEl.textContent = customerReports.length;
    
    if (customerReports.length > 0) {
      const lastReport = customerReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      lastServiceEl.textContent = new Date(lastReport.createdAt).toLocaleDateString();
    } else {
      lastServiceEl.textContent = "无记录";
    }
    
    serviceLevelDisplayEl.textContent = getServiceLevelDisplay(customer.serviceLevel).text;
  }

  // 事件监听器
  addNewCustomerButton.addEventListener("click", () => {
    showFormView(false);
  });

  backToListButton.addEventListener("click", showMainView);
  backToListFromDetailButton.addEventListener("click", showMainView);
  cancelFormButton.addEventListener("click", showMainView);

  // 搜索和筛选
  searchInput.addEventListener("input", (e) => {
    renderTable(e.target.value.trim(), filterPetCount.value, filterRegistration.value);
  });

  filterPetCount.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), e.target.value, filterRegistration.value);
  });

  filterRegistration.addEventListener("change", (e) => {
    renderTable(searchInput.value.trim(), filterPetCount.value, e.target.value);
  });

  // 表单提交
  customerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const customerName = formCustomerName.value.trim();
    const phone = formPhone.value.trim();

    if (!customerName || !phone) {
      alert("客户姓名和联系电话不能为空！");
      return;
    }

    // 检查电话号码是否重复
    const existingCustomer = customers.find(
      (c) => c.phone === phone && 
      (currentEditIndex === -1 || c.id !== customers[currentEditIndex].id)
    );
    if (existingCustomer) {
      alert("该电话号码已存在，请检查是否重复添加！");
      return;
    }

    const customerData = {
      name: customerName,
      idNumber: formIdNumber.value.trim() || null,
      phone: phone,
      wechat: formWechat.value.trim() || null,
      email: formEmail.value.trim() || null,
      emergencyContact: formEmergencyContact.value.trim() || null,
      address: formAddress.value.trim() || null,
      preferredContact: formPreferredContact.value || null,
      serviceLevel: formServiceLevel.value || "standard",
      notes: formNotes.value.trim() || ""
    };

    if (currentEditIndex >= 0) {
      // 编辑
      customers[currentEditIndex] = {
        ...customers[currentEditIndex],
        ...customerData,
        updatedAt: new Date().toLocaleString('zh-CN'),
        lastActiveAt: new Date().toLocaleString('zh-CN')
      };
    } else {
      // 新增
      customers.push({
        id: generateId(),
        ...customerData,
        createdAt: new Date().toLocaleString('zh-CN'),
        updatedAt: new Date().toLocaleString('zh-CN'),
        lastActiveAt: new Date().toLocaleString('zh-CN')
      });
    }

    showMainView();
  });

  // 表格操作事件代理
  tableBody.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    const id = parseInt(button.dataset.id);

    if (button.classList.contains("view-customer")) {
      showDetailView(id);
    } else if (button.classList.contains("edit-customer")) {
      showFormView(true, id);
    } else if (button.classList.contains("delete-customer")) {
      const customer = customers.find(c => c.id === id);
      const customerPets = getCustomerPets(id);
      
      let confirmMessage = `确定要删除客户 "${customer.name}" 吗？`;
      if (customerPets.length > 0) {
        confirmMessage += `\n注意：该客户名下还有 ${customerPets.length} 只宠物，删除客户后这些宠物将变为无主状态。`;
      }
      
      if (confirm(confirmMessage)) {
        customers = customers.filter((c) => c.id !== id);
        // 更新相关宠物的主人信息
        pets = pets.map(pet => 
          pet.currentOwnerId === id 
            ? { ...pet, currentOwnerId: null }
            : pet
        );
        renderTable(searchInput.value.trim(), filterPetCount.value, filterRegistration.value);
      }
    }
  });

  // 客户详情页面的事件处理
  addPetForCustomerBtn.addEventListener("click", () => {
    alert("跳转到宠物信息模块添加新宠物功能（实际使用时会打开宠物信息页面并预选当前客户）");
  });

  // 宠物卡片事件代理
  customerPetsGrid.addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;

    const petId = parseInt(button.dataset.petId);

    if (button.classList.contains("edit-pet-from-customer")) {
      alert(`跳转到宠物信息模块编辑宠物 ID: ${petId}`);
    } else if (button.classList.contains("view-pet-reports")) {
      alert(`跳转到萌宠报告模块查看宠物 ID: ${petId} 的报告`);
    }
  });

  // 无宠物消息中的按钮事件
  noPetsMessage.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      alert(`为客户 ID: ${currentCustomerId} 添加第一只宠物`);
    }
  });

  // 初始化
  showMainView();
}

// 如果 DOM 已加载完成，立即执行；否则等待 DOMContentLoaded 事件
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCustomerManagement);
} else {
  initCustomerManagement();
}
