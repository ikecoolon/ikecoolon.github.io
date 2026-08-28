function initCustomerManagement() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var mainView = document.getElementById('main-view');
  var formView = document.getElementById('form-view');
  var detailView = document.getElementById('detail-view');
  var formTitle = document.getElementById('form-title');
  var detailTitle = document.getElementById('detail-title');
  var searchInput = document.getElementById('search-customer');
  var filterPetCount = document.getElementById('filter-pet-count');
  var filterRegistration = document.getElementById('filter-registration');
  var tableBody = document.getElementById('customer-table-body');
  var addNewCustomerButton = document.getElementById('add-new-customer');
  var backToListButton = document.getElementById('back-to-list');
  var backToListFromDetailButton = document.getElementById('back-to-list-from-detail');
  var customerForm = document.getElementById('customer-form');
  var cancelFormButton = document.getElementById('cancel-form');

  var formCustomerName = document.getElementById('form-customer-name');
  var formPhone = document.getElementById('form-phone');
  var formWechat = document.getElementById('form-wechat');
  var formWechatName = document.getElementById('form-wechat-name');
  var formEmail = document.getElementById('form-email');
  var formPreferredContact = document.getElementById('form-preferred-contact');
  var formNotes = document.getElementById('form-notes');
  var formAddress = document.getElementById('form-address');

  var phoneSuggestions = document.getElementById('phone-suggestions');
  var autoFillIndicator = document.getElementById('auto-fill-indicator');

  var customerInfoCard = document.getElementById('customer-info-card');
  var customerPetsGrid = document.getElementById('customer-pets-grid');
  var noPetsMessage = document.getElementById('no-pets-message');
  var totalReportsEl = document.getElementById('total-reports');
  var lastServiceEl = document.getElementById('last-service');
  var customerReportsList = document.getElementById('customer-reports-list');

  var currentEditUserId = null;
  var currentCustomerId = null;

  var unsub = C.subscribeDemo(function (state) { renderAll(state); });
  window.__petAdminPageTeardown = function () { unsub(); };

  function getUsers(state) {
    return state.users || [];
  }

  function getCustomerPets(state, userId) {
    return (state.pets || []).filter(function (p) { return p.userId === userId; });
  }

  function getCustomerReports(state, userId) {
    return store.getUserVisibleReports(userId);
  }

  function getAllUserReports(state, userId) {
    return (state.reports || []).filter(function (r) { return r.userId === userId; });
  }

  function calculatePetAge(pet) {
    if (pet.age != null) return pet.age + '岁';
    return '—';
  }

  function filterCustomersByPetCount(users, state, petCountFilter) {
    if (!petCountFilter) return users;
    return users.filter(function (user) {
      var petCount = getCustomerPets(state, user.id).length;
      switch (petCountFilter) {
        case '0': return petCount === 0;
        case '1': return petCount === 1;
        case '2-5': return petCount >= 2 && petCount <= 5;
        case '5+': return petCount > 5;
        default: return true;
      }
    });
  }

  function filterCustomersByRegistration(users, registrationFilter) {
    if (!registrationFilter) return users;
    var now = new Date();
    var filterDate = new Date();
    switch (registrationFilter) {
      case 'week': filterDate.setDate(now.getDate() - 7); break;
      case 'month': filterDate.setMonth(now.getMonth() - 1); break;
      case 'quarter': filterDate.setMonth(now.getMonth() - 3); break;
      case 'year': filterDate.setFullYear(now.getFullYear() - 1); break;
      default: return users;
    }
    return users.filter(function (user) {
      if (!user.createdAt) return false;
      return new Date(user.createdAt) >= filterDate;
    });
  }

  function searchPlatformUsers(phoneInput) {
    var phone = phoneInput.trim();
    if (phone.length < 3) {
      hideSuggestions();
      return;
    }
    var state = store.getState();
    var matched = getUsers(state).filter(function (u) {
      return u.phone && u.phone.indexOf(phone) >= 0;
    });
    if (matched.length) showSuggestions(matched);
    else hideSuggestions();
  }

  function showSuggestions(users) {
    phoneSuggestions.innerHTML = '';
    users.forEach(function (user) {
      var item = document.createElement('div');
      item.className = 'px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0';
      item.innerHTML =
        '<div class="flex items-center justify-between">' +
        '<div><div class="font-medium text-gray-900">' + C.escapeHtml(user.phone) + '</div>' +
        '<div class="text-sm text-gray-600">' + C.escapeHtml(user.name) + '</div>' +
        '<div class="text-xs text-gray-500">平台账号：' + C.escapeHtml(user.id) + '</div></div>' +
        '<div class="text-blue-600 text-sm"><i class="fas fa-mouse-pointer mr-1"></i>点击填充</div></div>';
      item.addEventListener('click', function () { selectPlatformUser(user); });
      phoneSuggestions.appendChild(item);
    });
    phoneSuggestions.classList.remove('hidden');
  }

  function hideSuggestions() {
    phoneSuggestions.classList.add('hidden');
    phoneSuggestions.innerHTML = '';
  }

  function selectPlatformUser(user) {
    formPhone.value = user.phone;
    formCustomerName.value = user.name;
    if (formAddress) formAddress.value = user.address || '';
    autoFillIndicator.classList.remove('hidden');
    setTimeout(function () { autoFillIndicator.classList.add('hidden'); }, 3000);
    hideSuggestions();
  }

  function renderTable(state, filter, petCountFilter, registrationFilter) {
    filter = filter || '';
    var users = getUsers(state);
    var filtered = users.filter(function (user) {
      if (!filter) return true;
      var term = filter.toLowerCase();
      return (user.name && user.name.toLowerCase().indexOf(term) >= 0) ||
        (user.phone && user.phone.indexOf(filter) >= 0) ||
        (user.id && user.id.toLowerCase().indexOf(term) >= 0);
    });
    filtered = filterCustomersByPetCount(filtered, state, petCountFilter);
    filtered = filterCustomersByRegistration(filtered, registrationFilter);
    filtered.sort(function (a, b) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    tableBody.innerHTML = '';
    if (!filtered.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">暂无平台用户</td></tr>';
      return;
    }

    filtered.forEach(function (user) {
      var pets = getCustomerPets(state, user.id);
      var reportCount = C.countUserReports(state, user.id);
      var row = document.createElement('tr');
      row.className = 'hover:bg-gray-50';
      row.innerHTML =
        '<td class="px-6 py-4 whitespace-nowrap">' +
        '<div class="text-sm font-medium text-gray-900">' + C.escapeHtml(user.name) + '</div>' +
        '<div class="text-sm text-gray-500">' + C.escapeHtml(user.id) + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + C.escapeHtml(user.phone || '—') + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">' +
        '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">' + pets.length + ' 只宠物</span></div>' +
        (pets.length ? '<div class="text-xs text-gray-500 mt-1">' + pets.map(function (p) { return C.escapeHtml(p.name); }).join(', ') + '</div>' : '') +
        '<div class="text-xs text-gray-500 mt-1">' + reportCount + ' 份可见报告</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + C.formatDate(user.createdAt).slice(0, 10) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + C.formatDate(user.createdAt).slice(0, 10) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">' +
        '<button class="text-blue-600 hover:text-blue-900 mr-3 view-customer" data-id="' + C.escapeHtml(user.id) + '"><i class="fas fa-eye mr-1"></i>查看</button>' +
        '<button class="text-green-600 hover:text-green-900 mr-3 edit-customer" data-id="' + C.escapeHtml(user.id) + '"><i class="fas fa-edit mr-1"></i>编辑</button></td>';
      tableBody.appendChild(row);
    });
  }

  function showMainView() {
    mainView.classList.remove('hidden');
    formView.classList.add('hidden');
    detailView.classList.add('hidden');
    renderTable(store.getState(), searchInput.value.trim(), filterPetCount.value, filterRegistration.value);
  }

  function showFormView(isEdit, userId) {
    mainView.classList.add('hidden');
    formView.classList.remove('hidden');
    detailView.classList.add('hidden');
    currentEditUserId = isEdit ? userId : null;

    if (isEdit && userId) {
      var user = C.lookupUser(store.getState(), userId);
      if (user) {
        formTitle.textContent = '编辑平台用户';
        formCustomerName.value = user.name || '';
        formPhone.value = user.phone || '';
        if (formAddress) formAddress.value = user.address || '';
      }
    } else {
      formTitle.textContent = '登记平台用户';
      customerForm.reset();
      currentEditUserId = null;
    }
  }

  function showDetailView(userId) {
    mainView.classList.add('hidden');
    formView.classList.add('hidden');
    detailView.classList.remove('hidden');
    currentCustomerId = userId;
    var state = store.getState();
    var user = C.lookupUser(state, userId);
    if (!user) return;
    detailTitle.textContent = user.name + ' - 用户详情';
    renderCustomerInfoCard(user);
    renderCustomerPets(state, userId);
    renderServiceHistory(state, userId);
    renderCustomerReports(state, userId);
  }

  function renderCustomerInfoCard(user) {
    customerInfoCard.innerHTML =
      '<div class="flex items-start justify-between">' +
      '<div class="flex items-start space-x-4"><div class="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl border-2 border-blue-200">👤</div>' +
      '<div><h3 class="text-xl font-semibold text-gray-900">' + C.escapeHtml(user.name) + '</h3>' +
      '<div class="mt-1 space-y-1"><p class="text-sm text-gray-600"><i class="fas fa-phone w-4 text-center mr-2"></i>' + C.escapeHtml(user.phone || '—') + '</p>' +
      '<p class="text-sm text-gray-600"><i class="fas fa-id-card w-4 text-center mr-2"></i>' + C.escapeHtml(user.id) + '</p>' +
      (user.address ? '<p class="text-sm text-gray-600"><i class="fas fa-map-marker-alt w-4 text-center mr-2"></i>' + C.escapeHtml(user.address) + '</p>' : '') +
      '</div></div></div>' +
      '<div class="text-right"><p class="text-xs text-gray-500">注册：' + C.formatDate(user.createdAt).slice(0, 10) + '</p></div></div>';
  }

  function renderCustomerPets(state, userId) {
    var pets = getCustomerPets(state, userId);
    if (!pets.length) {
      customerPetsGrid.classList.add('hidden');
      noPetsMessage.classList.remove('hidden');
      return;
    }
    customerPetsGrid.classList.remove('hidden');
    noPetsMessage.classList.add('hidden');
    customerPetsGrid.innerHTML = '';
    pets.forEach(function (pet) {
      var reportCount = store.getPetPublishedReports(pet.id).length;
      var genderIcon = pet.gender === 'male' ? '♂' : pet.gender === 'female' ? '♀' : '?';
      var genderColor = pet.gender === 'male' ? 'text-blue-500' : pet.gender === 'female' ? 'text-pink-500' : 'text-gray-500';
      var card = document.createElement('div');
      card.className = 'bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors';
      card.innerHTML =
        '<div class="flex items-start justify-between mb-3"><div class="text-2xl">🐾</div><span class="' + genderColor + ' text-lg font-bold">' + genderIcon + '</span></div>' +
        '<h5 class="font-medium text-gray-900 mb-1">' + C.escapeHtml(pet.name) + '</h5>' +
        '<p class="text-sm text-gray-600">' + C.escapeHtml(C.speciesToMajorBreed(pet.species)) + ' • ' + C.escapeHtml(pet.breed || '未知品种') + '</p>' +
        '<p class="text-sm text-gray-500">' + calculatePetAge(pet) + ' · ' + reportCount + ' 份报告</p>' +
        '<div class="mt-3 flex space-x-2">' +
        '<button type="button" class="flex-1 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 view-pet-profile" data-pet-id="' + C.escapeHtml(pet.id) + '">查看档案</button></div>';
      customerPetsGrid.appendChild(card);
    });
  }

  function renderServiceHistory(state, userId) {
    var visible = getCustomerReports(state, userId);
    var allReports = getAllUserReports(state, userId);
    totalReportsEl.textContent = visible.length;
    if (allReports.length) {
      var sorted = allReports.sort(function (a, b) { return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); });
      lastServiceEl.textContent = C.formatDate(sorted[0].updatedAt || sorted[0].createdAt).slice(0, 10);
    } else {
      lastServiceEl.textContent = '无记录';
    }
  }

  function renderCustomerReports(state, userId) {
    if (!customerReportsList) return;
    var visible = getCustomerReports(state, userId);
    if (!visible.length) {
      customerReportsList.innerHTML = '<p class="text-sm text-gray-500">暂无可见报告</p>';
      return;
    }
    customerReportsList.innerHTML = visible.map(function (item) {
      var r = item.report;
      var pet = C.lookupPet(state, r.petId);
      return '<div class="flex justify-between items-center py-2 border-b border-gray-100 text-sm">' +
        '<span>' + C.escapeHtml(r.reportNumber || r.id) + ' · ' + C.escapeHtml(pet ? pet.name : '—') + '</span>' +
        '<span class="text-gray-500">' + C.escapeHtml(item.userStatus || '') + '</span></div>';
    }).join('');
  }

  function renderAll(state) {
    if (!mainView.classList.contains('hidden')) {
      renderTable(state, searchInput.value.trim(), filterPetCount.value, filterRegistration.value);
    }
    if (!detailView.classList.contains('hidden') && currentCustomerId) {
      showDetailView(currentCustomerId);
    }
  }

  addNewCustomerButton.addEventListener('click', function () { showFormView(false); });
  backToListButton.addEventListener('click', showMainView);
  backToListFromDetailButton.addEventListener('click', showMainView);
  cancelFormButton.addEventListener('click', showMainView);

  searchInput.addEventListener('input', function (e) {
    renderTable(store.getState(), e.target.value.trim(), filterPetCount.value, filterRegistration.value);
  });
  filterPetCount.addEventListener('change', function (e) {
    renderTable(store.getState(), searchInput.value.trim(), e.target.value, filterRegistration.value);
  });
  filterRegistration.addEventListener('change', function (e) {
    renderTable(store.getState(), searchInput.value.trim(), filterPetCount.value, e.target.value);
  });

  var searchTimeout;
  formPhone.addEventListener('input', function (e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function () { searchPlatformUsers(e.target.value.trim()); }, 300);
  });
  document.addEventListener('click', function (e) {
    if (!formPhone.contains(e.target) && !phoneSuggestions.contains(e.target)) hideSuggestions();
  });

  customerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = formCustomerName.value.trim();
    var phone = formPhone.value.trim();
    if (!name || !phone) {
      C.toast('姓名和手机号不能为空', 'warning');
      return;
    }
    var state = store.getState();
    var dup = getUsers(state).find(function (u) {
      return u.phone === phone && u.id !== currentEditUserId;
    });
    if (dup) {
      C.toast('该手机号已绑定其他平台用户', 'warning');
      return;
    }
    try {
      if (currentEditUserId) {
        C.updatePlatformUser(currentEditUserId, {
          name: name,
          phone: phone,
          address: formAddress ? formAddress.value.trim() : null
        });
        C.toast('用户信息已更新', 'success');
      } else {
        C.createPlatformUser({
          name: name,
          phone: phone,
          address: formAddress ? formAddress.value.trim() : null
        });
        C.toast('平台用户已登记', 'success');
      }
      showMainView();
    } catch (err) {
      C.toast(err.message || '保存失败', 'error');
    }
  });

  tableBody.addEventListener('click', function (e) {
    var button = e.target.closest('button');
    if (!button) return;
    var id = button.dataset.id;
    if (button.classList.contains('view-customer')) showDetailView(id);
    else if (button.classList.contains('edit-customer')) showFormView(true, id);
  });

  customerPetsGrid.addEventListener('click', function (e) {
    var button = e.target.closest('button');
    if (!button) return;
    if (button.classList.contains('view-pet-profile')) {
      C.navigate('pet-information', { petId: button.dataset.petId, action: 'detail' });
    }
  });

  showMainView();
}
