function initPetInformation() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var mainView = document.getElementById('main-view');
  var formView = document.getElementById('form-view');
  var detailView = document.getElementById('detail-view');
  var formTitle = document.getElementById('form-title');
  var searchInput = document.getElementById('search-pet');
  var filterBreed = document.getElementById('filter-breed');
  var filterGender = document.getElementById('filter-gender');
  var filterAgeRange = document.getElementById('filter-age-range');
  var tableBody = document.getElementById('pet-table-body');
  var backToListButton = document.getElementById('back-to-list');
  var backFromDetailBtn = document.getElementById('back-from-detail');
  var petForm = document.getElementById('pet-form');
  var cancelFormButton = document.getElementById('cancel-form');

  var formPetName = document.getElementById('form-pet-name');
  var formPetSpecies = document.getElementById('form-pet-species');
  var formPetBreed = document.getElementById('form-pet-breed');
  var formBirthDate = document.getElementById('form-birth-date');
  var formGender = document.getElementById('form-gender');

  var detailTitle = document.getElementById('detail-title');
  var detailPetSummary = document.getElementById('detail-pet-summary');
  var detailUserInfo = document.getElementById('detail-user-info');
  var detailReportsList = document.getElementById('detail-reports-list');
  var detailUserHistory = document.getElementById('detail-user-history');
  var changeUserBtn = document.getElementById('change-user-btn');

  var assignModal = document.getElementById('assign-modal');
  var assignTestRecordId = document.getElementById('assign-test-record-id');
  var assignMode = document.getElementById('assign-mode');
  var assignNewPetFields = document.getElementById('assign-new-pet-fields');
  var assignExistingPetFields = document.getElementById('assign-existing-pet-fields');
  var assignPetSearch = document.getElementById('assign-pet-search');
  var assignPetName = document.getElementById('assign-pet-name');
  var assignPetBreed = document.getElementById('assign-pet-breed');
  var assignPetSpecies = document.getElementById('assign-pet-species');
  var assignPetGender = document.getElementById('assign-pet-gender');
  var assignExistingPet = document.getElementById('assign-existing-pet');
  var assignUserSearch = document.getElementById('assign-user-search');
  var assignUserId = document.getElementById('assign-user-id');
  var assignCancel = document.getElementById('assign-cancel');
  var assignSubmit = document.getElementById('assign-submit');

  var changeUserModal = document.getElementById('change-user-modal');
  var changeUserPetId = document.getElementById('change-user-pet-id');
  var changeUserSearch = document.getElementById('change-user-search');
  var changeUserId = document.getElementById('change-user-id');
  var changeUserReason = document.getElementById('change-user-reason');
  var changeUserCancel = document.getElementById('change-user-cancel');
  var changeUserSubmit = document.getElementById('change-user-submit');

  var currentEditPetId = null;
  var currentDetailPetId = null;

  var unsub = C.subscribeDemo(function (state) { renderAll(state); });
  window.__petAdminPageTeardown = function () { unsub(); };

  function getBreedConfig() {
    if (typeof window.dictionaryDataService !== 'undefined') {
      var config = window.dictionaryDataService.getFlatBreedConfig();
      Object.keys(config).forEach(function (breed) {
        if (!config[breed].includes('其他')) config[breed].push('其他');
      });
      return config;
    }
    return {
      '猫科': ['英国短毛猫', '波斯猫', '橘猫', '布偶猫', '暹罗猫', '缅因猫', '通用猫科', '其他'],
      '犬科': ['金毛寻回犬', '拉布拉多犬', '哈士奇', '萨摩耶', '边境牧羊犬', '德国牧羊犬', '泰迪', '比熊', '博美', '柯基', '法斗', '中华田园犬', '通用犬科', '其他']
    };
  }

  var breedConfig = getBreedConfig();

  document.addEventListener('breedConfigUpdated', function () {
    breedConfig = getBreedConfig();
    initBreedOptions();
  });

  function initBreedOptions() {
    var majorBreeds = Object.keys(breedConfig);
    filterBreed.innerHTML = '<option value="">全部品种</option>';
    majorBreeds.forEach(function (breed) {
      var option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      filterBreed.appendChild(option);
    });
  }

  function birthDateFromAge(age) {
    if (age == null) return '';
    var years = parseFloat(age);
    if (isNaN(years)) return '';
    var d = new Date();
    d.setFullYear(d.getFullYear() - Math.floor(years));
    return d.toISOString().split('T')[0];
  }

  function ageFromBirthDate(birthDate) {
    if (!birthDate) return null;
    var birth = new Date(birthDate);
    var today = new Date();
    var years = (today - birth) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.round(years * 10) / 10);
  }

  function calculateAgeDisplay(pet) {
    if (pet.birthDate) {
      var birth = new Date(pet.birthDate);
      var today = new Date();
      var diffDays = Math.ceil(Math.abs(today - birth) / (1000 * 60 * 60 * 24));
      if (diffDays < 30) return diffDays + '天';
      if (diffDays < 365) return Math.floor(diffDays / 30) + '个月';
      var years = Math.floor(diffDays / 365);
      var months = Math.floor((diffDays % 365) / 30);
      return months > 0 ? years + '岁' + months + '个月' : years + '岁';
    }
    if (pet.age != null) return pet.age + '岁';
    return '—';
  }

  function getOwnerName(state, userId) {
    var user = C.lookupUser(state, userId);
    return user ? user.name + ' (' + (user.phone || '') + ')' : '未关联';
  }

  function countPublishedReports(petId) {
    return store.getPetPublishedReports(petId).length;
  }

  function getLatestTestDate(state, petId) {
    var reports = store.getPetPublishedReports(petId);
    if (!reports.length) return '—';
    var latest = reports[0];
    var tr = C.lookupTestRecord(state, latest.testRecordId);
    return tr && tr.testDate ? tr.testDate : (latest.updatedAt || latest.createdAt || '—').slice(0, 10);
  }

  function populateUserSelect(selectEl, state, filterText, includeEmpty) {
    var users = (state.users || []).filter(function (u) {
      if (!filterText) return true;
      return (u.phone && u.phone.indexOf(filterText) >= 0) ||
        (u.name && u.name.indexOf(filterText) >= 0);
    });
    var html = includeEmpty ? '<option value="">暂不关联用户</option>' : '<option value="">解除关联（无用户）</option>';
    html += users.map(function (u) {
      return '<option value="' + C.escapeHtml(u.id) + '">' + C.escapeHtml(u.name) + ' (' + C.escapeHtml(u.phone || '') + ')</option>';
    }).join('');
    selectEl.innerHTML = html;
  }

  function populatePetSelect(selectEl, state, filterText) {
    var term = (filterText || '').toLowerCase();
    var pets = (state.pets || []).filter(function (p) {
      if (!term) return true;
      return (p.name && p.name.toLowerCase().indexOf(term) >= 0) ||
        (p.breed && p.breed.toLowerCase().indexOf(term) >= 0);
    });
    selectEl.innerHTML = pets.map(function (p) {
      return '<option value="' + C.escapeHtml(p.id) + '">' + C.escapeHtml(p.name) + ' · ' + C.escapeHtml(p.breed || '') + '</option>';
    }).join('');
  }

  function filterPetsByAge(pets, ageRange) {
    if (!ageRange) return pets;
    return pets.filter(function (pet) {
      var ageYears = pet.age != null ? parseFloat(pet.age) : null;
      if (ageYears == null && pet.birthDate) ageYears = ageFromBirthDate(pet.birthDate);
      if (ageYears == null) return false;
      switch (ageRange) {
        case '0-1': return ageYears <= 1;
        case '1-3': return ageYears > 1 && ageYears <= 3;
        case '3-7': return ageYears > 3 && ageYears <= 7;
        case '7+': return ageYears > 7;
        default: return true;
      }
    });
  }

  function renderTable(state, filter, breedFilter, genderFilter, ageFilter) {
    filter = filter || '';
    var pets = (state.pets || []).filter(function (pet) {
      var ownerName = getOwnerName(state, pet.userId);
      var major = C.speciesToMajorBreed(pet.species);
      var matchesSearch = !filter ||
        (pet.name && pet.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0) ||
        (pet.breed && pet.breed.toLowerCase().indexOf(filter.toLowerCase()) >= 0) ||
        ownerName.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      var matchesBreed = !breedFilter || major === breedFilter;
      var matchesGender = !genderFilter || pet.gender === genderFilter;
      return matchesSearch && matchesBreed && matchesGender;
    });
    pets = filterPetsByAge(pets, ageFilter);
    pets.sort(function (a, b) {
      return String(getLatestTestDate(state, b.id)).localeCompare(String(getLatestTestDate(state, a.id)));
    });

    if (!pets.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-4 text-center text-gray-500">暂无宠物信息</td></tr>';
      return;
    }

    tableBody.innerHTML = pets.map(function (pet) {
      var major = C.speciesToMajorBreed(pet.species);
      var ageText = calculateAgeDisplay(pet);
      var genderDisplay = pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知';
      return '<tr class="hover:bg-gray-50">' +
        '<td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">' + C.escapeHtml(pet.name) + '</td>' +
        '<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">' + C.escapeHtml(major) + ' / ' + C.escapeHtml(pet.breed || '—') + '</td>' +
        '<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">' + ageText + ' · ' + genderDisplay + '</td>' +
        '<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">' + C.escapeHtml(getOwnerName(state, pet.userId)) + '</td>' +
        '<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">' + countPublishedReports(pet.id) + '</td>' +
        '<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">' + C.escapeHtml(getLatestTestDate(state, pet.id)) + '</td>' +
        '<td class="px-4 py-3 whitespace-nowrap text-sm font-medium">' +
        '<button type="button" class="text-teal-600 hover:text-teal-900 mr-2 view-pet" data-id="' + C.escapeHtml(pet.id) + '">查看</button>' +
        '<button type="button" class="text-blue-600 hover:text-blue-900 edit-pet" data-id="' + C.escapeHtml(pet.id) + '">编辑</button></td></tr>';
    }).join('');
  }

  function showMainView() {
    mainView.classList.remove('hidden');
    formView.classList.add('hidden');
    detailView.classList.add('hidden');
    renderAll(store.getState());
  }

  function showFormView(petId) {
    var pet = C.lookupPet(store.getState(), petId);
    if (!pet) return;
    currentEditPetId = petId;
    mainView.classList.add('hidden');
    formView.classList.remove('hidden');
    detailView.classList.add('hidden');
    formTitle.textContent = '编辑宠物资料 · ' + pet.name;
    formPetName.value = pet.name;
    formPetSpecies.value = pet.species || 'dog';
    formPetBreed.value = pet.breed || '';
    formGender.value = pet.gender || 'unknown';
    formBirthDate.value = pet.birthDate || birthDateFromAge(pet.age);
  }

  function showDetailView(petId) {
    currentDetailPetId = petId;
    mainView.classList.add('hidden');
    formView.classList.add('hidden');
    detailView.classList.remove('hidden');
    renderDetailView(store.getState(), petId);
  }

  function renderDetailView(state, petId) {
    var pet = C.lookupPet(state, petId);
    if (!pet) return;
    detailTitle.textContent = pet.name + ' · 宠物详情';
    var speciesLabel = pet.species === 'cat' ? '猫' : '犬';
    detailPetSummary.innerHTML =
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">' +
      '<div><span class="text-gray-500">名称：</span>' + C.escapeHtml(pet.name) + '</div>' +
      '<div><span class="text-gray-500">物种/品种：</span>' + C.escapeHtml(speciesLabel) + ' / ' + C.escapeHtml(pet.breed || '—') + '</div>' +
      '<div><span class="text-gray-500">性别：</span>' + (pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知') + '</div>' +
      '<div><span class="text-gray-500">年龄：</span>' + calculateAgeDisplay(pet) + '</div>' +
      '</div>' +
      '<div class="mt-3"><button type="button" class="text-blue-600 hover:underline edit-pet-inline" data-id="' + C.escapeHtml(pet.id) + '">编辑资料</button></div>';

    var owner = C.lookupUser(state, pet.userId);
    detailUserInfo.innerHTML = owner
      ? '<p>' + C.escapeHtml(owner.name) + ' · ' + C.escapeHtml(owner.phone || '') + ' · ' + C.escapeHtml(owner.id) + '</p>'
      : '<p class="text-gray-500">当前未关联平台用户</p>';

    var reports = store.getPetPublishedReports(petId);
    if (!reports.length) {
      detailReportsList.innerHTML = '<p class="p-4 text-sm text-gray-500">暂无已发布报告</p>';
    } else {
      detailReportsList.innerHTML = '<table class="min-w-full text-sm"><thead class="bg-gray-50"><tr>' +
        '<th class="px-3 py-2 text-left">报告编号</th><th class="px-3 py-2 text-left">检测日期</th><th class="px-3 py-2 text-left">状态</th></tr></thead><tbody>' +
        reports.map(function (r) {
          var tr = C.lookupTestRecord(state, r.testRecordId);
          return '<tr class="border-t"><td class="px-3 py-2">' + C.escapeHtml(r.reportNumber || r.id) + '</td>' +
            '<td class="px-3 py-2">' + C.escapeHtml(tr && tr.testDate ? tr.testDate : '—') + '</td>' +
            '<td class="px-3 py-2">' + C.statusBadge(r.status, C.REPORT_STATUS_LABELS) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    var history = (state.petUserAssociationChanges || []).filter(function (item) {
      return item.petId === petId;
    }).sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    if (!history.length) {
      detailUserHistory.innerHTML = '<p class="text-gray-500">暂无变更记录</p>';
    } else {
      detailUserHistory.innerHTML = history.map(function (item) {
        var fromUser = C.lookupUser(state, item.fromUserId);
        var toUser = C.lookupUser(state, item.toUserId);
        return '<div class="border-b border-gray-100 py-2">' +
          '<div>' + C.escapeHtml(fromUser ? fromUser.name : '无') + ' → ' + C.escapeHtml(toUser ? toUser.name : '无') + '</div>' +
          '<div class="text-gray-500">' + C.escapeHtml(item.actor || '') + ' · ' + C.formatDate(item.createdAt) + ' · ' + C.escapeHtml(item.reason || '') + '</div></div>';
      }).join('');
    }

    var editBtn = detailPetSummary.querySelector('.edit-pet-inline');
    if (editBtn) editBtn.onclick = function () { showFormView(editBtn.dataset.id); };
  }

  function openAssignModal(testRecordId) {
    var state = store.getState();
    assignTestRecordId.value = testRecordId;
    assignMode.value = 'existing';
    assignNewPetFields.classList.add('hidden');
    assignExistingPetFields.classList.remove('hidden');
    assignPetSearch.value = '';
    assignPetName.value = '';
    assignPetBreed.value = '';
    assignUserSearch.value = '';
    populatePetSelect(assignExistingPet, state, '');
    populateUserSelect(assignUserId, state, '', true);
    assignModal.classList.remove('hidden');
  }

  function closeAssignModal() {
    assignModal.classList.add('hidden');
  }

  function openChangeUserModal(petId) {
    var state = store.getState();
    var pet = C.lookupPet(state, petId);
    if (!pet) return;
    changeUserPetId.value = petId;
    changeUserSearch.value = '';
    changeUserReason.value = '';
    populateUserSelect(changeUserId, state, '', false);
    if (pet.userId) changeUserId.value = pet.userId;
    changeUserModal.classList.remove('hidden');
  }

  function closeChangeUserModal() {
    changeUserModal.classList.add('hidden');
  }

  function renderAll(state) {
    if (!mainView.classList.contains('hidden')) {
      renderTable(state, searchInput.value.trim(), filterBreed.value, filterGender.value, filterAgeRange.value);
    }
    if (!detailView.classList.contains('hidden') && currentDetailPetId) {
      renderDetailView(state, currentDetailPetId);
    }
  }

  function handleRouteParams() {
    var route = C.parseRoute();
    if (route.pageId !== 'pet-information') return;
    if (route.params.action === 'assign' && route.params.testRecordId) {
      showMainView();
      openAssignModal(route.params.testRecordId);
    } else if (route.params.petId && (route.params.action === 'detail' || route.params.action === 'manage')) {
      showDetailView(route.params.petId);
    } else if (route.params.petId && route.params.action === 'edit') {
      showFormView(route.params.petId);
    }
  }

  backToListButton.addEventListener('click', showMainView);
  backFromDetailBtn.addEventListener('click', showMainView);
  cancelFormButton.addEventListener('click', function () {
    if (currentDetailPetId) showDetailView(currentDetailPetId);
    else showMainView();
  });

  searchInput.addEventListener('input', function (e) {
    renderTable(store.getState(), e.target.value.trim(), filterBreed.value, filterGender.value, filterAgeRange.value);
  });
  filterBreed.addEventListener('change', function (e) {
    renderTable(store.getState(), searchInput.value.trim(), e.target.value, filterGender.value, filterAgeRange.value);
  });
  filterGender.addEventListener('change', function (e) {
    renderTable(store.getState(), searchInput.value.trim(), filterBreed.value, e.target.value, filterAgeRange.value);
  });
  filterAgeRange.addEventListener('change', function (e) {
    renderTable(store.getState(), searchInput.value.trim(), filterBreed.value, filterGender.value, e.target.value);
  });

  petForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentEditPetId) return;
    var petName = formPetName.value.trim();
    var breed = formPetBreed.value.trim();
    if (!petName || !breed) {
      C.toast('请填写宠物名称和品种', 'warning');
      return;
    }
    try {
      C.updateOpsPet(currentEditPetId, {
        name: petName,
        breed: breed,
        species: formPetSpecies.value,
        gender: formGender.value || 'unknown',
        birthDate: formBirthDate.value || null,
        age: ageFromBirthDate(formBirthDate.value)
      });
      C.toast('宠物资料已更新', 'success');
      if (currentDetailPetId === currentEditPetId) showDetailView(currentEditPetId);
      else showMainView();
    } catch (err) {
      C.toast(err.message || '保存失败', 'error');
    }
  });

  tableBody.addEventListener('click', function (e) {
    var button = e.target.closest('button');
    if (!button) return;
    var id = button.dataset.id;
    if (button.classList.contains('view-pet')) showDetailView(id);
    else if (button.classList.contains('edit-pet')) showFormView(id);
  });

  changeUserBtn.addEventListener('click', function () {
    if (currentDetailPetId) openChangeUserModal(currentDetailPetId);
  });

  assignMode.addEventListener('change', function () {
    var isNew = assignMode.value === 'new';
    assignNewPetFields.classList.toggle('hidden', !isNew);
    assignExistingPetFields.classList.toggle('hidden', isNew);
  });

  assignPetSearch.addEventListener('input', function () {
    populatePetSelect(assignExistingPet, store.getState(), assignPetSearch.value.trim());
  });

  assignUserSearch.addEventListener('input', function () {
    populateUserSelect(assignUserId, store.getState(), assignUserSearch.value.trim(), true);
  });

  changeUserSearch.addEventListener('input', function () {
    populateUserSelect(changeUserId, store.getState(), changeUserSearch.value.trim(), false);
  });

  assignCancel.addEventListener('click', closeAssignModal);
  changeUserCancel.addEventListener('click', closeChangeUserModal);

  assignSubmit.addEventListener('click', function () {
    var trId = assignTestRecordId.value;
    var userId = assignUserId.value || null;
    try {
      var petId;
      if (assignMode.value === 'new') {
        if (!assignPetName.value.trim()) {
          C.toast('请填写宠物名称', 'warning');
          return;
        }
        var pet = store.createOpsPet({
          name: assignPetName.value.trim(),
          breed: assignPetBreed.value.trim() || '未知品种',
          species: assignPetSpecies.value,
          gender: assignPetGender.value,
          userId: userId
        });
        petId = pet.id;
      } else {
        petId = assignExistingPet.value;
        if (!petId) {
          C.toast('请选择宠物', 'warning');
          return;
        }
      }
      store.assignReportOwnership({
        testRecordId: trId,
        petId: petId,
        userId: userId
      });
      C.toast('报告已归档', 'success');
      closeAssignModal();
      showDetailView(petId);
    } catch (err) {
      C.toast(err.message || '归档失败', 'error');
    }
  });

  changeUserSubmit.addEventListener('click', function () {
    if (!changeUserReason.value.trim()) {
      C.toast('请填写变更原因', 'warning');
      return;
    }
    try {
      store.updateOpsPet(changeUserPetId.value, {
        userId: changeUserId.value || null,
        reason: changeUserReason.value.trim(),
        actor: '运营专员'
      });
      C.toast('关联用户已更新', 'success');
      closeChangeUserModal();
      renderDetailView(store.getState(), changeUserPetId.value);
    } catch (err) {
      C.toast(err.message || '变更失败', 'error');
    }
  });

  function onHashChange() {
    handleRouteParams();
  }
  window.addEventListener('hashchange', onHashChange);

  initBreedOptions();
  showMainView();
  handleRouteParams();

  var prevTeardown = window.__petAdminPageTeardown;
  window.__petAdminPageTeardown = function () {
    if (typeof prevTeardown === 'function') prevTeardown();
    window.removeEventListener('hashchange', onHashChange);
  };
}
