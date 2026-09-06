function initUserPets(mountRoot, tab) {
  var root = mountRoot || document;
  var C = window.PetAdminCommon;
  var BT = window.PetAdminBasicTable;
  var Modal = window.PetAdminModal;
  var Perms = window.PetAdminPermissions;
  var Session = window.PetAdminSession;
  var store = C.store();

  var cssHref = (root.querySelector('[data-page-css]') || {}).getAttribute && root.querySelector('[data-page-css]').getAttribute('data-page-css');
  if (cssHref && !document.getElementById('pet-admin-identity-pages-css')) {
    var headLink = document.createElement('link');
    headLink.id = 'pet-admin-identity-pages-css';
    headLink.rel = 'stylesheet';
    headLink.href = new URL(cssHref, window.location.href).href;
    document.head.appendChild(headLink);
  }

  var listView = root.querySelector('#up-list-view');
  var userDetail = root.querySelector('#up-user-detail');
  var petDetail = root.querySelector('#up-pet-detail');
  var segUsers = root.querySelector('#up-seg-users');
  var segPets = root.querySelector('#up-seg-pets');
  var usersListMount = root.querySelector('#up-users-list-mount');
  var petsListMount = root.querySelector('#up-pets-list-mount');
  var btnCreateUser = root.querySelector('#up-btn-create-user');
  var btnRegisterTest = root.querySelector('#up-btn-register-test');
  var btnUserRegister = root.querySelector('#up-btn-user-register');
  var btnPetRegister = root.querySelector('#up-btn-pet-register');

  var currentView = 'users';
  var currentUserId = null;
  var currentPetId = null;
  var createFormDirty = false;
  var usersListApi = null;
  var petsListApi = null;
  var tabActive = true;

  function q(sel) { return root.querySelector(sel); }

  function canRegisterTest() {
    return Perms && Perms.can('register_test');
  }

  function canCreateUser() {
    return canRegisterTest();
  }

  function setDirty(dirty) {
    createFormDirty = !!dirty;
    if (tab && Session && Session.setTabDirty) {
      Session.setTabDirty(tab.id, dirty);
    } else if (typeof window.__petAdminSetTabDirty === 'function') {
      window.__petAdminSetTabDirty(dirty);
    }
  }

  function syncActionButtons() {
    btnCreateUser.classList.toggle('hidden', currentView !== 'users' || !canCreateUser());
    btnRegisterTest.classList.toggle('hidden', currentView !== 'pets' || !canRegisterTest());
    if (btnUserRegister) btnUserRegister.classList.toggle('hidden', !canRegisterTest());
    if (btnPetRegister) btnPetRegister.classList.toggle('hidden', !canRegisterTest());
  }

  function getBreedConfig() {
    if (typeof window.dictionaryDataService !== 'undefined') {
      var config = window.dictionaryDataService.getFlatBreedConfig();
      Object.keys(config).forEach(function (breed) {
        if (!config[breed].includes('其他')) config[breed].push('其他');
      });
      return config;
    }
    return {
      '猫科': ['英国短毛猫', '波斯猫', '橘猫', '布偶猫', '其他'],
      '犬科': ['金毛寻回犬', '拉布拉多犬', '哈士奇', '泰迪', '其他']
    };
  }

  function breedFilterOptions() {
    var breedConfig = getBreedConfig();
    var options = [{ value: '', label: '全部' }];
    Object.keys(breedConfig).forEach(function (major) {
      options.push({ value: major, label: major });
    });
    return options;
  }

  function petCountOptions() {
    return [
      { value: '', label: '全部' },
      { value: '0', label: '无宠物' },
      { value: '1', label: '1 只' },
      { value: '2-5', label: '2–5 只' },
      { value: '5+', label: '5 只以上' }
    ];
  }

  function getCustomerPets(state, userId) {
    return (state.pets || []).filter(function (p) { return p.userId === userId; });
  }

  function filterUsersByPetCount(users, state, petCountFilter) {
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

  function calculateAgeDisplay(pet) {
    if (pet.birthDate) {
      var birth = new Date(pet.birthDate);
      var today = new Date();
      var diffDays = Math.ceil(Math.abs(today - birth) / (1000 * 60 * 60 * 24));
      if (diffDays < 365) return Math.floor(diffDays / 30) + '个月';
      return Math.floor(diffDays / 365) + '岁';
    }
    if (pet.age != null) return pet.age + '岁';
    return '—';
  }

  function getOwnerLabel(state, userId) {
    var user = C.lookupUser(state, userId);
    return user ? user.name + ' (' + (user.phone || '') + ')' : '未关联';
  }

  function getLatestTestDate(state, petId) {
    var reports = store.getPetPublishedReports(petId);
    if (!reports.length) return '—';
    var latest = reports[0];
    var tr = C.lookupTestRecord(state, latest.testRecordId);
    return tr && tr.testDate ? tr.testDate : (latest.updatedAt || latest.createdAt || '—').slice(0, 10);
  }

  function memberNoteHtml() {
    return '<div class="up-member-note">' +
      '平台用户基础资料为只读。真实实现中，具备会员管理权限时可前往<strong>会员管理</strong>模块修改；' +
      '本原型未连接真实会员后台，不提供跳转。</div>';
  }

  function disabledBadgeHtml() {
    return '<span class="up-disabled-badge">已停用</span>';
  }

  function initUsersList() {
    if (usersListApi || !usersListMount) return;
    usersListApi = BT.createListPage({
      container: usersListMount,
      ownerTabId: tab && tab.id,
      stateKey: 'user-pets-users',
      title: '平台用户',
      searchFields: [
        { name: 'search', label: '关键词', placeholder: '姓名 / 手机号 / 用户 ID' },
        { name: 'petCount', label: '名下宠物', type: 'select', options: petCountOptions() }
      ],
      tableTools: { searchToggle: true, refresh: true, columnConfig: true, fullscreen: true },
      columns: [
        { key: 'user', title: '用户', required: true, render: function (row) {
          return '<div class="font-medium">' + C.escapeHtml(row.name) + '</div>' +
            '<div class="text-xs text-slate-500">' + C.escapeHtml(row.id) + '</div>';
        }},
        { key: 'phone', title: '手机号', dataIndex: 'phone' },
        { key: 'pets', title: '名下宠物', render: function (row) {
          return row.petCount + ' 只' +
            (row.petNames ? '<div class="text-xs text-slate-500">' + C.escapeHtml(row.petNames) + '</div>' : '');
        }},
        { key: 'reports', title: '可见报告', dataIndex: 'reportCount' },
        { key: 'createdAt', title: '注册时间', dataIndex: 'createdAt', sortable: true },
        { key: 'actions', title: '操作', action: true, required: true, render: function (row) {
          return '<button type="button" class="ant-btn ant-btn-link ant-btn-sm" data-row-action="view-user" data-id="' +
            C.escapeHtml(row.id) + '">查看</button>';
        }}
      ],
      rowKey: 'id',
      fetchData: function (query) {
        var state = store.getState();
        var term = String((query.filters && query.filters.search) || '').trim().toLowerCase();
        var petCountFilter = (query.filters && query.filters.petCount) || '';
        var users = (state.users || []).filter(function (user) {
          if (!term) return true;
          return (user.name && user.name.toLowerCase().indexOf(term) >= 0) ||
            (user.phone && user.phone.indexOf(term) >= 0) ||
            (user.id && user.id.toLowerCase().indexOf(term) >= 0);
        });
        users = filterUsersByPetCount(users, state, petCountFilter);
        users.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
        var mapped = users.map(function (user) {
          var pets = getCustomerPets(state, user.id);
          return {
            id: user.id,
            name: user.name || '—',
            phone: user.phone || '—',
            petCount: pets.length,
            petNames: pets.length ? pets.map(function (p) { return p.name; }).join('、') : '',
            reportCount: C.countUserReports(state, user.id),
            createdAt: C.formatDate(user.createdAt).slice(0, 10)
          };
        });
        var total = mapped.length;
        var start = (query.page - 1) * query.pageSize;
        return Promise.resolve({ rows: mapped.slice(start, start + query.pageSize), total: total });
      },
      onRowAction: function (action, row) {
        if (action === 'view-user') showUserDetail(row.id);
      }
    });
  }

  function initPetsList() {
    if (petsListApi || !petsListMount) return;
    petsListApi = BT.createListPage({
      container: petsListMount,
      ownerTabId: tab && tab.id,
      stateKey: 'user-pets-pets',
      title: '宠物档案',
      searchFields: [
        { name: 'search', label: '关键词', placeholder: '宠物名 / 品种 / 用户' },
        { name: 'breed', label: '物种', type: 'select', options: breedFilterOptions() },
        { name: 'gender', label: '性别', type: 'select', options: [
          { value: '', label: '全部' },
          { value: 'male', label: '公' },
          { value: 'female', label: '母' },
          { value: 'unknown', label: '未知' }
        ]}
      ],
      tableTools: { searchToggle: true, refresh: true, columnConfig: true, fullscreen: true },
      columns: [
        { key: 'name', title: '宠物', dataIndex: 'name', required: true },
        { key: 'breed', title: '物种/品种', dataIndex: 'breedLabel' },
        { key: 'ageGender', title: '年龄/性别', dataIndex: 'ageGender' },
        { key: 'owner', title: '关联用户', dataIndex: 'ownerLabel', ellipsis: true },
        { key: 'reports', title: '已发布报告', dataIndex: 'reportCount' },
        { key: 'latestTest', title: '最近检测', dataIndex: 'latestTest' },
        { key: 'actions', title: '操作', action: true, required: true, render: function (row) {
          return '<button type="button" class="ant-btn ant-btn-link ant-btn-sm" data-row-action="view-pet" data-id="' +
            C.escapeHtml(row.id) + '">查看</button>';
        }}
      ],
      rowKey: 'id',
      fetchData: function (query) {
        var state = store.getState();
        var term = String((query.filters && query.filters.search) || '').trim().toLowerCase();
        var breedFilter = (query.filters && query.filters.breed) || '';
        var genderFilter = (query.filters && query.filters.gender) || '';
        var pets = (state.pets || []).filter(function (pet) {
          var owner = getOwnerLabel(state, pet.userId).toLowerCase();
          var major = C.speciesToMajorBreed(pet.species);
          var matchesSearch = !term ||
            (pet.name && pet.name.toLowerCase().indexOf(term) >= 0) ||
            (pet.breed && pet.breed.toLowerCase().indexOf(term) >= 0) ||
            owner.indexOf(term) >= 0;
          var matchesBreed = !breedFilter || major === breedFilter;
          var matchesGender = !genderFilter || pet.gender === genderFilter;
          return matchesSearch && matchesBreed && matchesGender;
        });
        pets.sort(function (a, b) {
          return String(getLatestTestDate(state, b.id)).localeCompare(String(getLatestTestDate(state, a.id)));
        });
        var mapped = pets.map(function (pet) {
          var major = C.speciesToMajorBreed(pet.species);
          var genderDisplay = pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知';
          return {
            id: pet.id,
            name: pet.name,
            breedLabel: major + ' / ' + (pet.breed || '—'),
            ageGender: calculateAgeDisplay(pet) + ' · ' + genderDisplay,
            ownerLabel: getOwnerLabel(state, pet.userId),
            reportCount: store.getPetPublishedReports(pet.id).length,
            latestTest: getLatestTestDate(state, pet.id)
          };
        });
        var total = mapped.length;
        var start = (query.page - 1) * query.pageSize;
        return Promise.resolve({ rows: mapped.slice(start, start + query.pageSize), total: total });
      },
      onRowAction: function (action, row) {
        if (action === 'view-pet') showPetDetail(row.id);
      }
    });
  }

  function reloadActiveList() {
    if (currentView === 'users') {
      if (usersListApi) usersListApi.reload();
    } else if (petsListApi) {
      petsListApi.reload();
    }
  }

  function tabTitleForParams(params) {
    if (params.detail === 'user' && params.id) {
      var u = C.lookupUser(store.getState(), params.id);
      return (u && (u.name || u.phone)) ? (u.name || u.phone) + ' · 用户' : '用户详情';
    }
    if (params.detail === 'pet' && params.id) {
      var p = C.lookupPet(store.getState(), params.id);
      return p ? p.name + ' · 宠物' : '宠物详情';
    }
    return params.view === 'pets' ? '宠物档案' : '用户与宠物';
  }

  function navigateUserPets(params) {
    params = params || {};
    var pageId = 'user-pets';
    var hash = C.buildHash(pageId, params);
    if (tab && Session) {
      tab.params = Object.assign({}, params);
      tab.tabKey = Session.buildTabKey(pageId, tab.params);
      tab.key = tab.tabKey;
      tab.hash = hash;
      tab.title = tabTitleForParams(params);
      Session.updateTabState(tab.id, { params: tab.params });
      Session.renderTabbar();
    }
    var current = (window.location.hash || '').replace(/^#/, '');
    if (current !== hash) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#' + hash);
      } else {
        window.location.hash = hash;
      }
    }
    handleRoute();
  }

  function showListView() {
    setDirty(false);
    navigateUserPets({ view: currentView });
  }

  function showUserDetail(userId) {
    navigateUserPets({ detail: 'user', id: userId });
  }

  function showPetDetail(petId) {
    navigateUserPets({ detail: 'pet', id: petId });
  }

  function setSegment(view) {
    currentView = view === 'pets' ? 'pets' : 'users';
    segUsers.classList.toggle('is-active', currentView === 'users');
    segPets.classList.toggle('is-active', currentView === 'pets');
    segUsers.setAttribute('aria-selected', currentView === 'users' ? 'true' : 'false');
    segPets.setAttribute('aria-selected', currentView === 'pets' ? 'true' : 'false');
    usersListMount.classList.toggle('hidden', currentView !== 'users');
    petsListMount.classList.toggle('hidden', currentView !== 'pets');
    syncActionButtons();
    if (currentView === 'users') initUsersList();
    else initPetsList();
  }

  function navigateListView(view) {
    setSegment(view);
    navigateUserPets({ view: view });
    reloadActiveList();
  }

  function renderUserDetail(state, userId) {
    var user = C.lookupUser(state, userId);
    if (!user) {
      showListView();
      return;
    }
    q('#up-user-detail-title').innerHTML = C.escapeHtml(user.name || user.phone || '用户') + ' · 详情' +
      (user.disabled ? disabledBadgeHtml() : '');
    q('#up-user-detail-body').innerHTML =
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">' +
      '<div><span class="text-slate-500">姓名：</span>' + C.escapeHtml(user.name || '—') + '</div>' +
      '<div><span class="text-slate-500">手机号：</span>' + C.escapeHtml(user.phone || '—') + '</div>' +
      '<div><span class="text-slate-500">用户 ID：</span>' + C.escapeHtml(user.id) + '</div>' +
      '<div><span class="text-slate-500">注册时间：</span>' + C.formatDate(user.createdAt).slice(0, 10) + '</div>' +
      (user.disabled ? '<div class="md:col-span-2 text-red-600">该账号已停用，不可登记送检或修改资料。</div>' : '') +
      '</div>' + memberNoteHtml();

    var pets = getCustomerPets(state, userId);
    var grid = q('#up-user-pets-grid');
    var noPets = q('#up-user-no-pets');
    if (!pets.length) {
      grid.innerHTML = '';
      noPets.classList.remove('hidden');
    } else {
      noPets.classList.add('hidden');
      grid.innerHTML = pets.map(function (pet) {
        return '<div class="border border-slate-200 rounded-lg p-3 hover:border-blue-300">' +
          '<div class="font-medium">' + C.escapeHtml(pet.name) + '</div>' +
          '<div class="text-xs text-slate-500">' + C.escapeHtml(C.speciesToMajorBreed(pet.species)) + ' · ' + C.escapeHtml(pet.breed || '') + '</div>' +
          '<button type="button" class="ant-btn ant-btn-link ant-btn-sm mt-2" data-action="view-pet" data-id="' + C.escapeHtml(pet.id) + '">查看宠物</button>' +
          '</div>';
      }).join('');
    }

    var visible = store.getUserVisibleReports(userId);
    q('#up-user-reports').innerHTML = visible.length
      ? visible.map(function (item) {
        var r = item.report;
        var pet = C.lookupPet(state, r.petId);
        return '<div class="py-2 border-b border-slate-100">' + C.escapeHtml(r.reportNumber || r.id) +
          ' · ' + C.escapeHtml(pet ? pet.name : '—') + ' · ' + C.statusBadge(r.status, C.REPORT_STATUS_LABELS) + '</div>';
      }).join('')
      : '<p class="text-slate-500">暂无可见报告</p>';
  }

  function renderPetDetail(state, petId) {
    var pet = C.lookupPet(state, petId);
    if (!pet) {
      showListView();
      return;
    }
    q('#up-pet-detail-title').textContent = pet.name + ' · 详情';
    var owner = C.lookupUser(state, pet.userId);
    q('#up-pet-detail-body').innerHTML =
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">' +
      '<div><span class="text-slate-500">名称：</span>' + C.escapeHtml(pet.name) + '</div>' +
      '<div><span class="text-slate-500">物种/品种：</span>' + C.escapeHtml(C.speciesToMajorBreed(pet.species)) + ' / ' + C.escapeHtml(pet.breed || '—') + '</div>' +
      '<div><span class="text-slate-500">性别：</span>' + (pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知') + '</div>' +
      '<div><span class="text-slate-500">年龄：</span>' + calculateAgeDisplay(pet) + '</div>' +
      '<div class="md:col-span-2"><span class="text-slate-500">关联用户：</span>' +
      (owner ? C.escapeHtml(owner.name) + ' · ' + C.escapeHtml(owner.phone || '') + ' · ' + C.escapeHtml(owner.id) +
        (owner.disabled ? disabledBadgeHtml() : '') : '未关联') +
      '</div></div>';

    var reports = store.getPetPublishedReports(petId);
    var reportsEl = q('#up-pet-reports');
    if (!reports.length) {
      reportsEl.innerHTML = '<p class="rondo-empty">暂无已发布报告</p>';
    } else {
      reportsEl.innerHTML = '<table class="rondo-basic-table"><thead><tr>' +
        '<th>报告编号</th><th>检测日期</th><th>状态</th></tr></thead><tbody>' +
        reports.map(function (r) {
          var tr = C.lookupTestRecord(state, r.testRecordId);
          return '<tr><td>' + C.escapeHtml(r.reportNumber || r.id) + '</td>' +
            '<td>' + C.escapeHtml(tr && tr.testDate ? tr.testDate : '—') + '</td>' +
            '<td>' + C.statusBadge(r.status, C.REPORT_STATUS_LABELS) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    var history = (state.petUserAssociationChanges || []).filter(function (item) {
      return item.petId === petId;
    }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    q('#up-pet-user-history').innerHTML = history.length
      ? history.map(function (item) {
        var fromUser = C.lookupUser(state, item.fromUserId);
        var toUser = C.lookupUser(state, item.toUserId);
        return '<div class="py-2 border-b border-slate-100">' +
          C.escapeHtml(fromUser ? fromUser.name : '无') + ' → ' + C.escapeHtml(toUser ? toUser.name : '无') +
          '<div class="text-xs text-slate-500">' + C.formatDate(item.createdAt) + ' · ' + C.escapeHtml(item.reason || '') + '</div></div>';
      }).join('')
      : '<p class="text-slate-500">暂无变更记录</p>';
  }

  function renderAll(state) {
    if (!listView.classList.contains('hidden')) {
      reloadActiveList();
    }
    if (!userDetail.classList.contains('hidden') && currentUserId) {
      renderUserDetail(state, currentUserId);
    }
    if (!petDetail.classList.contains('hidden') && currentPetId) {
      renderPetDetail(state, currentPetId);
    }
  }

  function openCreateUserModal() {
    if (!canCreateUser()) {
      C.toast('当前账号无权限登记平台用户', 'warning');
      return;
    }
    setDirty(false);
    Modal.open({
      title: '登记平台用户',
      width: 'lg',
      bodyHtml:
        '<p class="text-sm text-slate-500 mb-4">手机号必填；姓名可选。同一手机号将返回已有账号，不重复创建、不覆盖已有资料。</p>' +
        '<div class="space-y-3">' +
        '<label class="block text-sm"><span class="text-slate-600">手机号 <span class="text-red-500">*</span></span>' +
        '<input type="tel" id="up-create-phone" class="ant-input w-full mt-1" placeholder="11 位手机号" required></label>' +
        '<label class="block text-sm"><span class="text-slate-600">姓名（可选）</span>' +
        '<input type="text" id="up-create-name" class="ant-input w-full mt-1" placeholder="选填"></label>' +
        '</div>',
      okLabel: '确认登记',
      isDirty: function () { return createFormDirty; },
      onDirty: function () { setDirty(true); },
      onClose: function () { setDirty(false); },
      onOk: function (close, overlay) {
        var phone = (overlay.querySelector('#up-create-phone').value || '').trim();
        var name = (overlay.querySelector('#up-create-name').value || '').trim();
        if (!phone) {
          C.toast('请填写手机号', 'warning');
          return;
        }
        try {
          var state = store.getState();
          var existing = (state.users || []).find(function (u) { return u.phone === phone; });
          if (existing) {
            if (existing.disabled) {
              C.toast('该手机号对应账号已停用，不会自动启用', 'warning');
            } else {
              C.toast('已匹配已有平台用户：' + (existing.name || existing.phone), 'info');
            }
            close();
            setDirty(false);
            showUserDetail(existing.id);
            return;
          }
          var created = C.createPlatformUser({ phone: phone, name: name || undefined });
          C.toast('平台用户已登记', 'success');
          close();
          setDirty(false);
          showUserDetail(created.id);
        } catch (err) {
          C.toast(err.message || '登记失败', 'error');
        }
      },
      onCancel: function (close) {
        close();
        setDirty(false);
      }
    });
  }

  function goRegisterTest(petId, userId) {
    if (!canRegisterTest()) {
      C.toast('当前账号无权限登记送检', 'warning');
      return;
    }
    if (userId) {
      var user = C.lookupUser(store.getState(), userId);
      if (user && user.disabled) {
        C.toast('该用户已停用，无法登记送检', 'warning');
        return;
      }
    }
    var params = { action: 'register' };
    if (petId) params.petId = petId;
    if (userId) params.userId = userId;
    C.navigate('detection-records', params);
  }

  function handleRoute() {
    var route = C.parseRoute();
    if (route.pageId !== 'user-pets' && route.pageId !== 'customer-management' && route.pageId !== 'pet-information') return;
    if (route.params.detail === 'user' && route.params.id) {
      currentUserId = route.params.id;
      currentPetId = null;
      listView.classList.add('hidden');
      userDetail.classList.remove('hidden');
      petDetail.classList.add('hidden');
      renderUserDetail(store.getState(), route.params.id);
      syncActionButtons();
      return;
    }
    if (route.params.detail === 'pet' && route.params.id) {
      currentPetId = route.params.id;
      currentUserId = null;
      listView.classList.add('hidden');
      userDetail.classList.add('hidden');
      petDetail.classList.remove('hidden');
      renderPetDetail(store.getState(), route.params.id);
      syncActionButtons();
      return;
    }
    listView.classList.remove('hidden');
    userDetail.classList.add('hidden');
    petDetail.classList.add('hidden');
    currentUserId = null;
    currentPetId = null;
    setSegment(route.params.view === 'pets' ? 'pets' : 'users');
    reloadActiveList();
  }

  segUsers.addEventListener('click', function () { navigateListView('users'); });
  segPets.addEventListener('click', function () { navigateListView('pets'); });
  btnCreateUser.addEventListener('click', openCreateUserModal);
  btnRegisterTest.addEventListener('click', function () { goRegisterTest(); });
  if (btnUserRegister) {
    btnUserRegister.addEventListener('click', function () {
      goRegisterTest(null, currentUserId);
    });
  }

  q('#up-back-from-user').addEventListener('click', showListView);
  q('#up-back-from-pet').addEventListener('click', showListView);
  if (btnPetRegister) {
    btnPetRegister.addEventListener('click', function () {
      var pet = C.lookupPet(store.getState(), currentPetId);
      goRegisterTest(currentPetId, pet ? pet.userId : null);
    });
  }

  q('#up-user-pets-grid').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action="view-pet"]');
    if (btn) showPetDetail(btn.getAttribute('data-id'));
  });

  var unsub = store.subscribe(function (state) {
    if (!tabActive) return;
    if (tab && Session && Session.getActiveTab() !== tab) return;
    renderAll(state);
  });

  function onHashChange() {
    if (tab && Session && Session.getActiveTab() !== tab) return;
    handleRoute();
  }
  window.addEventListener('hashchange', onHashChange);

  function onTabActivate() {
    tabActive = true;
    handleRoute();
  }

  function onTabDeactivate() {
    tabActive = false;
  }

  function onTabCanLeave() {
    if (!createFormDirty) return true;
    return confirm('登记表单尚未提交，确定离开吗？');
  }

  if (tab && typeof window.__petAdminRegisterTabHooks === 'function') {
    window.__petAdminRegisterTabHooks(tab.id, {
      activate: onTabActivate,
      deactivate: onTabDeactivate,
      canLeave: onTabCanLeave
    });
  }

  syncActionButtons();
  handleRoute();

  return function teardown() {
    unsub();
    window.removeEventListener('hashchange', onHashChange);
  };
}
