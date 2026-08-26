function initPetInformation() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var mainView = document.getElementById('main-view');
  var formView = document.getElementById('form-view');
  var manageView = document.getElementById('manage-view');
  var ownershipWorkbench = document.getElementById('ownership-workbench');
  var correctionHistoryEl = document.getElementById('correction-history');
  var formTitle = document.getElementById('form-title');
  var searchInput = document.getElementById('search-pet');
  var filterBreed = document.getElementById('filter-breed');
  var filterGender = document.getElementById('filter-gender');
  var filterAgeRange = document.getElementById('filter-age-range');
  var tableBody = document.getElementById('pet-table-body');
  var addNewPetButton = document.getElementById('add-new-pet');
  var backToListButton = document.getElementById('back-to-list');
  var backFromManageBtn = document.getElementById('back-from-manage');
  var petForm = document.getElementById('pet-form');
  var cancelFormButton = document.getElementById('cancel-form');

  var unassignedTbody = document.getElementById('unassigned-tbody');
  var unassignedCount = document.getElementById('unassigned-count');
  var unassignedEmpty = document.getElementById('unassigned-empty');

  var formPetName = document.getElementById('form-pet-name');
  var formPetNickname = document.getElementById('form-pet-nickname');
  var formPetImage = document.getElementById('form-pet-image');
  var imagePreview = document.getElementById('image-preview');
  var previewImg = document.getElementById('preview-img');
  var formMajorBreed = document.getElementById('form-major-breed');
  var formMinorBreed = document.getElementById('form-minor-breed');
  var formBirthDate = document.getElementById('form-birth-date');
  var formGender = document.getElementById('form-gender');
  var formSterilized = document.getElementById('form-sterilized');
  var formOwner = document.getElementById('form-owner');
  var selectedOwnerDisplay = document.getElementById('selected-owner-display');
  var selectOwnerBtn = document.getElementById('select-owner-btn');
  var clearOwnerBtn = document.getElementById('clear-owner-btn');
  var formOwnershipStart = document.getElementById('form-ownership-start');
  var formNotes = document.getElementById('form-notes');
  var ageDisplay = document.getElementById('age-display');

  var ownerSelectionModal = document.getElementById('owner-selection-modal');
  var closeOwnerModalBtn = document.getElementById('close-owner-modal');
  var ownerSearch = document.getElementById('owner-search');
  var searchOwnersBtn = document.getElementById('search-owners');
  var ownersList = document.getElementById('owners-list');
  var cancelOwnerSelectionBtn = document.getElementById('cancel-owner-selection');
  var addNewOwnerBtn = document.getElementById('add-new-owner-btn');
  var newOwnerModal = document.getElementById('new-owner-modal');
  var closeNewOwnerModalBtn = document.getElementById('close-new-owner-modal');
  var newOwnerForm = document.getElementById('new-owner-form');
  var cancelNewOwnerBtn = document.getElementById('cancel-new-owner');

  var assignModal = document.getElementById('assign-modal');
  var assignTestRecordId = document.getElementById('assign-test-record-id');
  var assignMode = document.getElementById('assign-mode');
  var assignNewPetFields = document.getElementById('assign-new-pet-fields');
  var assignExistingPetFields = document.getElementById('assign-existing-pet-fields');
  var assignPetName = document.getElementById('assign-pet-name');
  var assignPetBreed = document.getElementById('assign-pet-breed');
  var assignPetSpecies = document.getElementById('assign-pet-species');
  var assignPetGender = document.getElementById('assign-pet-gender');
  var assignExistingPet = document.getElementById('assign-existing-pet');
  var assignBindMode = document.getElementById('assign-bind-mode');
  var assignUserFields = document.getElementById('assign-user-fields');
  var assignUserSearch = document.getElementById('assign-user-search');
  var assignUserId = document.getElementById('assign-user-id');
  var assignCancel = document.getElementById('assign-cancel');
  var assignSubmit = document.getElementById('assign-submit');

  var correctModal = document.getElementById('correct-modal');
  var correctReportId = document.getElementById('correct-report-id');
  var correctUserId = document.getElementById('correct-user-id');
  var correctPetId = document.getElementById('correct-pet-id');
  var correctReason = document.getElementById('correct-reason');
  var correctCancel = document.getElementById('correct-cancel');
  var correctSubmit = document.getElementById('correct-submit');

  var manageTitle = document.getElementById('manage-title');
  var managePetSummary = document.getElementById('manage-pet-summary');
  var manageReportsList = document.getElementById('manage-reports-list');
  var manageClaimsList = document.getElementById('manage-claims-list');

  var currentEditPetId = null;
  var currentManagePetId = null;
  var petImageCache = null;

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
      '犬科': ['金毛寻回犬', '拉布拉多犬', '哈士奇', '萨摩耶', '边境牧羊犬', '德国牧羊犬', '泰迪', '比熊', '博美', '柯基', '法斗', '中华田园犬', '通用犬科', '其他'],
      '兔科': ['垂耳兔', '侏儒兔', '安哥拉兔', '荷兰兔', '狮子兔', '通用兔科', '其他'],
      '仓鼠科': ['金丝熊', '三线仓鼠', '一线仓鼠', '通用仓鼠', '其他'],
      '鸟类': ['鹦鹉', '金丝雀', '通用鸟类', '其他'],
      '爬行动物': ['乌龟', '蜥蜴', '通用爬行动物', '其他'],
      '其他': ['其他']
    };
  }

  var breedConfig = getBreedConfig();

  document.addEventListener('breedConfigUpdated', function () {
    breedConfig = getBreedConfig();
    initBreedOptions();
  });

  function initBreedOptions() {
    var majorBreeds = Object.keys(breedConfig);
    formMajorBreed.innerHTML = '<option value="">请选择大品种</option>';
    majorBreeds.forEach(function (breed) {
      var option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      formMajorBreed.appendChild(option);
    });
    filterBreed.innerHTML = '<option value="">全部品种</option>';
    majorBreeds.forEach(function (breed) {
      var option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      filterBreed.appendChild(option);
    });
  }

  function updateMinorBreedOptions(majorBreed) {
    formMinorBreed.innerHTML = '<option value="">请选择小品种</option>';
    if (majorBreed && breedConfig[majorBreed]) {
      breedConfig[majorBreed].forEach(function (breed) {
        var option = document.createElement('option');
        option.value = breed;
        option.textContent = breed;
        formMinorBreed.appendChild(option);
      });
    }
  }

  function birthDateFromAge(age) {
    if (age == null) return null;
    var years = parseFloat(age);
    if (isNaN(years)) return null;
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

  function calculateAgeDisplay(birthDate, age) {
    if (birthDate) {
      var birth = new Date(birthDate);
      var today = new Date();
      var diffDays = Math.ceil(Math.abs(today - birth) / (1000 * 60 * 60 * 24));
      if (diffDays < 30) return diffDays + '天';
      if (diffDays < 365) return Math.floor(diffDays / 30) + '个月';
      var years = Math.floor(diffDays / 365);
      var months = Math.floor((diffDays % 365) / 30);
      return months > 0 ? years + '岁' + months + '个月' : years + '岁';
    }
    if (age != null) return age + '岁';
    return '—';
  }

  function getOwnerName(state, userId) {
    var user = C.lookupUser(state, userId);
    return user ? user.name : '无主';
  }

  function claimStatusLabel(status) {
    return C.OWNERSHIP_STATUS_LABELS[status] || status || '—';
  }

  function populateUserSelect(selectEl, state, filterPhone) {
    var users = (state.users || []).filter(function (u) {
      if (!filterPhone) return true;
      return (u.phone && u.phone.indexOf(filterPhone) >= 0) ||
        (u.name && u.name.indexOf(filterPhone) >= 0);
    });
    selectEl.innerHTML = users.map(function (u) {
      return '<option value="' + C.escapeHtml(u.id) + '">' + C.escapeHtml(u.name) + ' (' + C.escapeHtml(u.phone || '') + ')</option>';
    }).join('');
  }

  function populatePetSelect(selectEl, state) {
    selectEl.innerHTML = (state.pets || []).map(function (p) {
      return '<option value="' + C.escapeHtml(p.id) + '">' + C.escapeHtml(p.name) + ' · ' + C.escapeHtml(p.breed || '') + '</option>';
    }).join('');
  }

  function renderUnassigned(state) {
    var records = C.getUnassignedTestRecords(state);
    unassignedCount.textContent = records.length + ' 条待处理';
    if (!records.length) {
      unassignedTbody.innerHTML = '';
      unassignedEmpty.classList.remove('hidden');
      return;
    }
    unassignedEmpty.classList.add('hidden');
    unassignedTbody.innerHTML = records.map(function (tr) {
      return '<tr>' +
        '<td class="px-3 py-2 font-mono text-xs">' + C.escapeHtml(tr.sampleNumber || tr.id) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(tr.externalReportNumber || '—') + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(tr.testDate || '—') + '</td>' +
        '<td class="px-3 py-2">' + C.statusBadge(tr.status, C.TEST_STATUS_LABELS) + '</td>' +
        '<td class="px-3 py-2"><button type="button" class="text-teal-700 hover:underline btn-assign" data-tr-id="' + C.escapeHtml(tr.id) + '">建档归档</button></td></tr>';
    }).join('');
    unassignedTbody.querySelectorAll('.btn-assign').forEach(function (btn) {
      btn.onclick = function () { openAssignModal(btn.dataset.trId); };
    });
  }

  function renderCorrectionHistory(state) {
    var list = (state.ownershipCorrections || []).slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    if (!list.length) {
      correctionHistoryEl.innerHTML = '<p class="text-gray-500">暂无纠错记录</p>';
      return;
    }
    correctionHistoryEl.innerHTML = list.map(function (c) {
      var fromUser = C.lookupUser(state, c.fromUserId);
      var toUser = C.lookupUser(state, c.toUserId);
      var fromPet = C.lookupPet(state, c.fromPetId);
      var toPet = C.lookupPet(state, c.toPetId);
      return '<div class="border-b border-gray-100 py-2">' +
        '<div class="font-medium">' + C.escapeHtml(c.reportId) + '</div>' +
        '<div>用户：' + C.escapeHtml(fromUser ? fromUser.name : '—') + ' → ' + C.escapeHtml(toUser ? toUser.name : '—') + '</div>' +
        '<div>宠物：' + C.escapeHtml(fromPet ? fromPet.name : '—') + ' → ' + C.escapeHtml(toPet ? toPet.name : '—') + '</div>' +
        '<div class="text-gray-500">' + C.escapeHtml(c.actor || '') + ' · ' + C.formatDate(c.createdAt) + ' · ' + C.escapeHtml(c.reason || '') + '</div></div>';
    }).join('');
  }

  function filterPetsByAge(pets, ageRange) {
    if (!ageRange) return pets;
    return pets.filter(function (pet) {
      var ageYears = pet.age != null ? parseFloat(pet.age) : null;
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
    pets.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });

    tableBody.innerHTML = '';
    if (!pets.length) {
      tableBody.innerHTML = '<tr><td colspan="9" class="px-6 py-4 text-center text-gray-500">暂无宠物信息</td></tr>';
      return;
    }

    pets.forEach(function (pet) {
      var major = C.speciesToMajorBreed(pet.species);
      var ageText = calculateAgeDisplay(null, pet.age);
      var genderDisplay = pet.gender === 'male' ? '公' : pet.gender === 'female' ? '母' : '未知';
      var ownerName = getOwnerName(state, pet.userId);
      var reportCount = C.countPetReports(state, pet.id);
      var row = document.createElement('tr');
      row.className = 'hover:bg-gray-50';
      row.innerHTML =
        '<td class="px-6 py-4 whitespace-nowrap"><div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400"><i class="fas fa-paw text-xl"></i></div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + C.escapeHtml(pet.name) + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + C.escapeHtml(major) + '</div><div class="text-sm text-gray-500">' + C.escapeHtml(pet.breed || '—') + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-gray-900">' + ageText + '</div><div class="text-sm text-gray-500">' + genderDisplay + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + C.escapeHtml(ownerName) + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + reportCount + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">' + C.escapeHtml(claimStatusLabel(pet.claimStatus)) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + C.formatDate(pet.createdAt).slice(0, 10) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">' +
        '<button type="button" class="text-blue-600 hover:text-blue-900 mr-2 edit-pet" data-id="' + C.escapeHtml(pet.id) + '"><i class="fas fa-edit mr-1"></i>编辑</button>' +
        '<button type="button" class="text-teal-600 hover:text-teal-900 manage-pet" data-id="' + C.escapeHtml(pet.id) + '"><i class="fas fa-link mr-1"></i>归属</button></td>';
      tableBody.appendChild(row);
    });
  }

  function showMainView() {
    mainView.classList.remove('hidden');
    formView.classList.add('hidden');
    if (manageView) manageView.classList.add('hidden');
    if (ownershipWorkbench) ownershipWorkbench.classList.remove('hidden');
    correctionHistoryEl.parentElement.classList.remove('hidden');
    renderAll(store.getState());
  }

  function showFormView(isEdit, petId, presetUserId) {
    mainView.classList.add('hidden');
    formView.classList.remove('hidden');
    if (manageView) manageView.classList.add('hidden');
    currentEditPetId = isEdit ? petId : null;
    petImageCache = null;

    if (isEdit && petId) {
      var pet = C.lookupPet(store.getState(), petId);
      if (pet) {
        formTitle.textContent = '编辑宠物信息';
        formPetName.value = pet.name;
        formPetNickname.value = '';
        updateImagePreview(null);
        formMajorBreed.value = C.speciesToMajorBreed(pet.species);
        updateMinorBreedOptions(formMajorBreed.value);
        formMinorBreed.value = pet.breed || '';
        formBirthDate.value = birthDateFromAge(pet.age) || '';
        formGender.value = pet.gender || '';
        formSterilized.value = '';
        if (pet.userId) {
          var owner = C.lookupUser(store.getState(), pet.userId);
          formOwner.value = pet.userId;
          selectedOwnerDisplay.value = owner ? owner.name + ' (' + owner.phone + ')' : pet.userId;
          clearOwnerBtn.classList.remove('hidden');
        } else {
          clearSelectedOwner();
        }
        formOwnershipStart.value = new Date().toISOString().split('T')[0];
        formNotes.value = '';
      }
    } else {
      formTitle.textContent = '新增宠物信息';
      petForm.reset();
      updateImagePreview(null);
      updateMinorBreedOptions('');
      clearSelectedOwner();
      formOwnershipStart.value = new Date().toISOString().split('T')[0];
      if (presetUserId) {
        var u = C.lookupUser(store.getState(), presetUserId);
        if (u) {
          formOwner.value = presetUserId;
          selectedOwnerDisplay.value = u.name + ' (' + u.phone + ')';
          clearOwnerBtn.classList.remove('hidden');
        }
      }
    }
  }

  function showManageView(petId) {
    currentManagePetId = petId;
    mainView.classList.add('hidden');
    formView.classList.add('hidden');
    if (ownershipWorkbench) ownershipWorkbench.classList.add('hidden');
    correctionHistoryEl.parentElement.classList.add('hidden');
    manageView.classList.remove('hidden');
    renderManageView(store.getState(), petId);
  }

  function renderManageView(state, petId) {
    var pet = C.lookupPet(state, petId);
    if (!pet) return;
    var owner = C.lookupUser(state, pet.userId);
    manageTitle.textContent = pet.name + ' - 归属管理';
    managePetSummary.innerHTML =
      '<div><strong>宠物：</strong>' + C.escapeHtml(pet.name) + ' · ' + C.escapeHtml(pet.breed || '') + '</div>' +
      '<div><strong>主人：</strong>' + C.escapeHtml(owner ? owner.name + ' (' + owner.phone + ')' : '待领取/无主') + '</div>' +
      '<div><strong>归属状态：</strong>' + C.escapeHtml(claimStatusLabel(pet.claimStatus)) + '</div>';

    var reports = (state.reports || []).filter(function (r) { return r.petId === petId; });
    if (!reports.length) {
      manageReportsList.innerHTML = '<p class="p-4 text-sm text-gray-500">暂无报告</p>';
    } else {
      manageReportsList.innerHTML = '<table class="min-w-full text-sm"><thead class="bg-gray-50"><tr>' +
        '<th class="px-3 py-2 text-left">报告编号</th><th class="px-3 py-2 text-left">归属</th><th class="px-3 py-2 text-left">状态</th><th class="px-3 py-2 text-left">操作</th></tr></thead><tbody>' +
        reports.map(function (r) {
          var user = C.lookupUser(state, r.userId);
          var actions = [];
          if (!r.userId || r.ownershipStatus === 'pending_claim') {
            actions.push('<button type="button" class="text-teal-600 mr-2 btn-gen-claim" data-report-id="' + C.escapeHtml(r.id) + '">生成领取码</button>');
          }
          actions.push('<button type="button" class="text-red-600 btn-correct" data-report-id="' + C.escapeHtml(r.id) + '">纠错</button>');
          return '<tr class="border-t"><td class="px-3 py-2">' + C.escapeHtml(r.reportNumber || r.id) + '</td>' +
            '<td class="px-3 py-2">' + C.escapeHtml(user ? user.name : '待领取') + ' · ' + C.escapeHtml(C.OWNERSHIP_STATUS_LABELS[r.ownershipStatus] || r.ownershipStatus || '') + '</td>' +
            '<td class="px-3 py-2">' + C.statusBadge(r.status, C.REPORT_STATUS_LABELS) + '</td>' +
            '<td class="px-3 py-2">' + actions.join('') + '</td></tr>';
        }).join('') + '</tbody></table>';
      manageReportsList.querySelectorAll('.btn-gen-claim').forEach(function (btn) {
        btn.onclick = function () {
          try {
            var claim = store.generateClaimCredential({ reportId: btn.dataset.reportId });
            C.toast('领取码已生成：' + claim.code, 'success');
            renderManageView(store.getState(), petId);
          } catch (err) {
            C.toast(err.message || '生成失败', 'error');
          }
        };
      });
      manageReportsList.querySelectorAll('.btn-correct').forEach(function (btn) {
        btn.onclick = function () { openCorrectModal(btn.dataset.reportId); };
      });
    }

    var claims = (state.claimCodes || []).filter(function (c) { return c.petId === petId; });
    if (!claims.length) {
      manageClaimsList.innerHTML = '<p class="p-4 text-sm text-gray-500">暂无领取凭证</p>';
    } else {
      manageClaimsList.innerHTML = '<table class="min-w-full text-sm"><thead class="bg-gray-50"><tr>' +
        '<th class="px-3 py-2">领取码</th><th class="px-3 py-2">状态</th><th class="px-3 py-2">操作</th></tr></thead><tbody>' +
        claims.map(function (c) {
          var ops = c.status === 'pending'
            ? '<button type="button" class="text-amber-600 btn-void-claim" data-claim-id="' + C.escapeHtml(c.id) + '">作废</button> ' +
              '<button type="button" class="text-teal-600 btn-resend-claim" data-tr-id="' + C.escapeHtml(c.testRecordId || '') + '">重发</button>'
            : '—';
          return '<tr class="border-t"><td class="px-3 py-2 font-mono">' + C.escapeHtml(c.code) + '</td>' +
            '<td class="px-3 py-2">' + C.escapeHtml(c.status) + '</td><td class="px-3 py-2">' + ops + '</td></tr>';
        }).join('') + '</tbody></table>';
      manageClaimsList.querySelectorAll('.btn-void-claim').forEach(function (btn) {
        btn.onclick = function () {
          C.promptDialog('作废领取码', '请填写作废原因', function (reason) {
            try {
              store.voidClaimCredential({ id: btn.dataset.claimId, reason: reason });
              C.toast('领取码已作废', 'success');
              renderManageView(store.getState(), petId);
            } catch (err) {
              C.toast(err.message || '作废失败', 'error');
            }
          });
        };
      });
      manageClaimsList.querySelectorAll('.btn-resend-claim').forEach(function (btn) {
        btn.onclick = function () {
          try {
            var st = store.getState();
            var pending = C.getPendingClaimCodes(st, petId, btn.dataset.trId);
            pending.forEach(function (c) {
              store.voidClaimCredential({ id: c.id, reason: '[演示 Mock] 作废重发' });
            });
            var claim = store.generateClaimCredential({ testRecordId: btn.dataset.trId });
            C.toast('新领取码：' + claim.code, 'success');
            renderManageView(store.getState(), petId);
          } catch (err) {
            C.toast(err.message || '重发失败', 'error');
          }
        };
      });
    }
  }

  function openAssignModal(testRecordId) {
    var state = store.getState();
    assignTestRecordId.value = testRecordId;
    assignMode.value = 'new';
    assignNewPetFields.classList.remove('hidden');
    assignExistingPetFields.classList.add('hidden');
    assignBindMode.value = 'claim';
    assignUserFields.classList.add('hidden');
    assignPetName.value = '';
    assignPetBreed.value = '';
    populatePetSelect(assignExistingPet, state);
    populateUserSelect(assignUserId, state, '');
    assignModal.classList.remove('hidden');
  }

  function closeAssignModal() {
    assignModal.classList.add('hidden');
  }

  function openCorrectModal(reportId) {
    var state = store.getState();
    correctReportId.value = reportId;
    populateUserSelect(correctUserId, state, '');
    populatePetSelect(correctPetId, state);
    correctReason.value = '';
    correctModal.classList.remove('hidden');
  }

  function closeCorrectModal() {
    correctModal.classList.add('hidden');
  }

  function handleImageUpload(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { resolve(null); return; }
      if (!file.type.startsWith('image/')) {
        C.toast('请选择图片文件', 'warning');
        reject(new Error('invalid'));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        C.toast('图片不能超过 2MB', 'warning');
        reject(new Error('large'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = function () { reject(new Error('read')); };
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

  function showOwnerSelectionModal() {
    ownerSelectionModal.classList.remove('hidden');
    renderOwnersList(store.getState());
  }

  function hideOwnerSelectionModal() {
    ownerSelectionModal.classList.add('hidden');
    ownerSearch.value = '';
  }

  function renderOwnersList(state, searchTerm) {
    searchTerm = (searchTerm || '').toLowerCase();
    var users = (state.users || []).filter(function (user) {
      if (!searchTerm) return true;
      return (user.name && user.name.toLowerCase().indexOf(searchTerm) >= 0) ||
        (user.phone && user.phone.indexOf(searchTerm) >= 0);
    });
    ownersList.innerHTML = '';
    if (!users.length) {
      ownersList.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">暂无匹配用户</td></tr>';
      return;
    }
    users.forEach(function (user) {
      var row = document.createElement('tr');
      row.className = 'hover:bg-gray-50';
      row.innerHTML =
        '<td class="px-4 py-2"><button type="button" class="select-owner-btn px-3 py-1 bg-blue-500 text-white rounded text-sm" data-owner-id="' + C.escapeHtml(user.id) + '">选择</button></td>' +
        '<td class="px-4 py-2">' + C.escapeHtml(user.name) + '</td>' +
        '<td class="px-4 py-2">' + C.escapeHtml(user.phone || '') + '</td>' +
        '<td class="px-4 py-2">—</td>';
      ownersList.appendChild(row);
    });
    ownersList.querySelectorAll('.select-owner-btn').forEach(function (btn) {
      btn.onclick = function () { selectOwner(btn.dataset.ownerId); };
    });
  }

  function selectOwner(ownerId) {
    var user = C.lookupUser(store.getState(), ownerId);
    if (user) {
      formOwner.value = ownerId;
      selectedOwnerDisplay.value = user.name + ' (' + user.phone + ')';
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

  function renderAll(state) {
    renderUnassigned(state);
    renderCorrectionHistory(state);
    if (!mainView.classList.contains('hidden')) {
      renderTable(state, searchInput.value.trim(), filterBreed.value, filterGender.value, filterAgeRange.value);
    }
    if (!manageView.classList.contains('hidden') && currentManagePetId) {
      renderManageView(state, currentManagePetId);
    }
  }

  function handleRouteParams() {
    var route = C.parseRoute();
    if (route.pageId !== 'pet-information') return;
    if (route.params.petId && route.params.action === 'manage') {
      showManageView(route.params.petId);
    } else if (route.params.action === 'new-pet' && route.params.userId) {
      showFormView(false, null, route.params.userId);
    }
  }

  addNewPetButton.addEventListener('click', function () { showFormView(false); });
  backToListButton.addEventListener('click', showMainView);
  if (backFromManageBtn) backFromManageBtn.addEventListener('click', showMainView);
  cancelFormButton.addEventListener('click', showMainView);

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

  formMajorBreed.addEventListener('change', function (e) {
    updateMinorBreedOptions(e.target.value);
    formMinorBreed.value = '';
  });

  selectOwnerBtn.addEventListener('click', showOwnerSelectionModal);
  clearOwnerBtn.addEventListener('click', clearSelectedOwner);
  closeOwnerModalBtn.addEventListener('click', hideOwnerSelectionModal);
  cancelOwnerSelectionBtn.addEventListener('click', hideOwnerSelectionModal);
  searchOwnersBtn.addEventListener('click', function () {
    renderOwnersList(store.getState(), ownerSearch.value.trim());
  });
  ownerSearch.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') renderOwnersList(store.getState(), e.target.value.trim());
  });
  addNewOwnerBtn.addEventListener('click', function () {
    hideOwnerSelectionModal();
    showNewOwnerModal();
  });
  closeNewOwnerModalBtn.addEventListener('click', hideNewOwnerModal);
  cancelNewOwnerBtn.addEventListener('click', hideNewOwnerModal);

  newOwnerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('new-owner-name').value.trim();
    var phone = document.getElementById('new-owner-phone').value.trim();
    if (!name || !phone) {
      C.toast('请填写姓名和手机号', 'warning');
      return;
    }
    var dup = (store.getState().users || []).find(function (u) { return u.phone === phone; });
    if (dup) {
      C.toast('手机号已存在', 'warning');
      return;
    }
    var user = C.createPlatformUser({ name: name, phone: phone });
    selectOwner(user.id);
    hideNewOwnerModal();
    C.toast('平台用户已创建', 'success');
  });

  formBirthDate.addEventListener('change', function (e) {
    var age = calculateAgeDisplay(e.target.value, null);
    ageDisplay.textContent = age !== '—' ? '当前年龄：' + age : '年龄将自动计算';
  });

  formPetImage.addEventListener('change', async function (e) {
    var file = e.target.files[0];
    if (file) {
      try {
        petImageCache = await handleImageUpload(file);
        updateImagePreview(petImageCache);
      } catch (err) {
        updateImagePreview(null);
        formPetImage.value = '';
      }
    } else {
      updateImagePreview(null);
    }
  });

  petForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var petName = formPetName.value.trim();
    var majorBreed = formMajorBreed.value;
    if (!petName || !majorBreed) {
      C.toast('宠物姓名和品种不能为空', 'warning');
      return;
    }
    var species = C.majorBreedToSpecies(majorBreed);
    var age = ageFromBirthDate(formBirthDate.value);
    var userId = formOwner.value || null;
    try {
      if (currentEditPetId) {
        C.updateOpsPet(currentEditPetId, {
          name: petName,
          breed: formMinorBreed.value || majorBreed,
          species: species,
          age: age,
          gender: formGender.value || 'unknown',
          userId: userId
        });
        C.toast('宠物信息已更新', 'success');
      } else {
        store.createOpsPet({
          name: petName,
          breed: formMinorBreed.value || majorBreed,
          species: species,
          age: age,
          gender: formGender.value || 'unknown',
          userId: userId
        });
        C.toast('宠物已建档', 'success');
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
    if (button.classList.contains('edit-pet')) showFormView(true, id);
    else if (button.classList.contains('manage-pet')) showManageView(id);
  });

  assignMode.addEventListener('change', function () {
    var isNew = assignMode.value === 'new';
    assignNewPetFields.classList.toggle('hidden', !isNew);
    assignExistingPetFields.classList.toggle('hidden', isNew);
  });

  assignBindMode.addEventListener('change', function () {
    assignUserFields.classList.toggle('hidden', assignBindMode.value !== 'direct');
  });

  assignUserSearch.addEventListener('input', function () {
    populateUserSelect(assignUserId, store.getState(), assignUserSearch.value.trim());
  });

  assignCancel.addEventListener('click', closeAssignModal);
  assignSubmit.addEventListener('click', function () {
    var trId = assignTestRecordId.value;
    var directBind = assignBindMode.value === 'direct';
    var userId = directBind ? assignUserId.value : null;
    if (directBind && !userId) {
      C.toast('请选择平台用户', 'warning');
      return;
    }
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
          userId: directBind ? userId : null
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
        directBind: directBind,
        userId: userId
      });
      if (!directBind) {
        var claim = store.generateClaimCredential({ testRecordId: trId });
        C.toast('已归档并生成领取码：' + claim.code, 'success');
      } else {
        C.toast('已归档并直接绑定用户', 'success');
      }
      closeAssignModal();
    } catch (err) {
      C.toast(err.message || '归档失败', 'error');
    }
  });

  correctCancel.addEventListener('click', closeCorrectModal);
  correctSubmit.addEventListener('click', function () {
    if (!correctReason.value.trim()) {
      C.toast('请填写纠错原因', 'warning');
      return;
    }
    try {
      store.correctOwnership({
        reportId: correctReportId.value,
        userId: correctUserId.value,
        petId: correctPetId.value,
        reason: correctReason.value.trim(),
        actor: '[演示 Mock] 运营专员'
      });
      C.toast('归属已更正', 'success');
      closeCorrectModal();
    } catch (err) {
      C.toast(err.message || '纠错失败', 'error');
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
