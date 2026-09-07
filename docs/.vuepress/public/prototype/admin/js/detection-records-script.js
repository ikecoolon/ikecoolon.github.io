function initDetectionRecords(mountRoot, tab) {
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

  var STATE_KEY = 'detection-records';
  var RETURN_VIEWS = ['all', 'incomplete', 'pending_review', 'published', 'voided', 'pending'];
  var VALID_VIEWS = ['pending_result', 'import_failed', 'all'];
  var STAGE_LABELS = {
    pending_result: '待导入结果',
    import_failed: '导入异常',
    report_generated: '已生成报告'
  };

  var currentView = 'pending_result';
  var listApi = null;
  var registerModalHandle = null;
  var registerFormDirty = false;
  var tabActive = true;
  var registerRouteHandled = '';

  function canRegisterTest() {
    return Perms && Perms.can('register_test');
  }

  function canImportResult(isReimport) {
    if (!Perms) return true;
    return Perms.can(isReimport ? 'reimport' : 'import');
  }

  var returnWrap = root.querySelector('#btn-go-report-center-wrap');
  var linkedBanner = root.querySelector('#dr-linked-context');
  var linkedDetail = root.querySelector('#dr-linked-detail');
  var notFoundBanner = root.querySelector('#dr-not-found');
  var notFoundDetail = root.querySelector('#dr-not-found-detail');
  var filterBar = root.querySelector('#dr-filter-bar');
  var listContainer = root.querySelector('#dr-list-table');
  var viewTabs = root.querySelectorAll('.dr-view-tab');

  function setRegisterDirty(dirty) {
    registerFormDirty = !!dirty;
    if (tab && Session && Session.setTabDirty) {
      Session.setTabDirty(tab.id, dirty);
    } else if (typeof window.__petAdminSetTabDirty === 'function' && tab) {
      window.__petAdminSetTabDirty(dirty);
    }
  }

  function returnToReportCenter() {
    var route = C.parseRoute();
    var view = route.params.returnView;
    if (view && view !== 'pending' && RETURN_VIEWS.indexOf(view) >= 0) {
      C.navigate('report-center', { view: view });
    } else {
      C.navigate('report-center');
    }
  }

  root.querySelector('#btn-go-report-center').onclick = returnToReportCenter;

  function linkedTestRecordId() {
    var route = C.parseRoute();
    if (route.pageId !== 'detection-records') return '';
    return String(route.params.testRecordId || '').trim();
  }

  function deriveStage(tr, state) {
    var report = lookupLinkedReport(state, tr.id);
    if (report) return 'report_generated';
    if (tr.status === 'import_failed') return 'import_failed';
    return 'pending_result';
  }

  function restoreLegacyFilter() {
    if (linkedTestRecordId()) {
      if (sessionStorage.getItem('pet-admin-detection-filter')) {
        sessionStorage.removeItem('pet-admin-detection-filter');
      }
      return;
    }
    var savedFilter = sessionStorage.getItem('pet-admin-detection-filter');
    sessionStorage.removeItem('pet-admin-detection-filter');
    if (!savedFilter || VALID_VIEWS.indexOf(savedFilter) < 0) return;
    if (savedFilter === 'pending_result') return;
    C.navigate('detection-records', { view: savedFilter });
  }

  restoreLegacyFilter();

  function goToAllRecords() {
    C.navigate('detection-records', { view: 'all' });
  }

  root.querySelector('#dr-view-all').onclick = goToAllRecords;
  root.querySelector('#dr-view-all-not-found').onclick = goToAllRecords;

  var detectionNavItem = document.querySelector('#main-nav .nav-item[data-page="detection-records"]');
  function onDetectionNavClick(e) {
    if (!linkedTestRecordId()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    C.navigate('detection-records');
  }
  if (detectionNavItem) {
    detectionNavItem.addEventListener('click', onDetectionNavClick, true);
  }

  function inferImportScenario(fileName) {
    var name = String(fileName || '').toLowerCase();
    if (/重复|dup|duplicate/.test(name)) return 'duplicate';
    if (/失败|fail|缺列|阻断/.test(name)) return 'failure';
    if (/异常|partial|warn|警告/.test(name)) return 'partial';
    return 'success';
  }

  function makeImportFileMeta(file, index, directedRecord) {
    var seq = Date.now().toString(36) + '-' + index;
    var scenario = inferImportScenario(file.name);
    var meta = {
      scenario: scenario,
      fileName: file.name,
      externalReportNumber: 'EXT-UP-' + seq,
      sampleNumber: directedRecord && directedRecord.sampleNumber ? directedRecord.sampleNumber : ('SAMPLE-UP-' + seq)
    };
    if (scenario === 'duplicate') {
      meta.sourceOrgId = store.DEFAULT_SOURCE_ORG_ID;
      meta.externalReportNumber = 'EXT-2025-001';
      delete meta.sampleNumber;
    }
    if (scenario === 'failure') meta.errorCode = 'MISSING_COLUMN';
    if (directedRecord) meta.storeId = directedRecord.storeId;
    return meta;
  }

  function runExcelImport(testRecordId, fileList) {
    if (!testRecordId) {
      C.toast('请从待导入的送检记录发起「导入结果」', 'warning');
      return;
    }
    if (!fileList || !fileList.length) {
      C.toast('请选择文件', 'warning');
      return;
    }
    var state = store.getState();
    var directedRecord = (state.testRecords || []).find(function (tr) { return tr.id === testRecordId; }) || null;
    var files = [makeImportFileMeta(fileList[0], 0, directedRecord)];
    try {
      var result = store.simulateBatchImport({
        fileName: '定向导入_' + testRecordId + '.xlsx',
        files: files,
        testRecordId: testRecordId
      });
      var okCount = (result.fileResults || []).filter(function (r) {
        return r.status === 'success' || r.status === 'partial';
      }).length;
      sessionStorage.removeItem('pet-admin-excel-tr');
      if (okCount) {
        C.toast('导入完成：已写入检测结果并生成报告草稿', 'success');
      } else {
        C.toast('导入失败，送检记录仍为待导入结果', 'warning');
      }
      if (listApi) listApi.reload();
    } catch (err) {
      C.toast(err.message || '导入失败', 'error');
    }
  }

  function pickExcelFiles(testRecordId, options) {
    options = options || {};
    if (!testRecordId) {
      C.toast('请从待导入的送检记录发起「导入结果」', 'warning');
      return;
    }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.multiple = false;
    input.style.display = 'none';
    var settled = false;
    function cleanup() {
      window.removeEventListener('focus', onWindowFocus);
      if (input.parentNode) input.parentNode.removeChild(input);
    }
    function finish(files) {
      if (settled) return;
      settled = true;
      cleanup();
      if (files && files.length) {
        runExcelImport(testRecordId, files);
      } else if (typeof options.onCancel === 'function') {
        options.onCancel();
      }
    }
    function onWindowFocus() {
      setTimeout(function () {
        if (!settled) finish(input.files && input.files.length ? input.files : null);
      }, 400);
    }
    input.addEventListener('change', function () {
      finish(input.files);
    });
    input.addEventListener('cancel', function () {
      finish(null);
    });
    document.body.appendChild(input);
    input.click();
    if (typeof options.onCancel === 'function') {
      setTimeout(function () {
        if (!settled) window.addEventListener('focus', onWindowFocus);
      }, 0);
    }
  }

  function displayLabName(state, tr) {
    var name = String((tr && tr.labName) || '').trim();
    if (name) return name;
    var labStore = C.lookupStore(state, tr && tr.labStoreId);
    if (labStore) return labStore.name;
    return '—';
  }

  function highlightRecordRow(recordId) {
    if (!recordId || !listContainer) return;
    var attempts = 0;
    function tryHighlight() {
      attempts += 1;
      var row = listContainer.querySelector('tr[data-row-key="' + recordId + '"]');
      if (row) {
        row.classList.add('is-new-record');
        row.querySelectorAll('td').forEach(function (td) {
          td.style.background = '#fff7e6';
        });
        if (typeof row.scrollIntoView === 'function') {
          row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        setTimeout(function () {
          if (row.classList) row.classList.remove('is-new-record');
          row.querySelectorAll('td').forEach(function (td) {
            td.style.background = '';
          });
        }, 2400);
        return;
      }
      if (attempts < 24) setTimeout(tryHighlight, 50);
    }
    tryHighlight();
  }

  function revealNewRecord(recordId) {
    if (currentView === 'import_failed') {
      setActiveView('pending_result');
      updateRouteView('pending_result');
    }
    if (listApi) {
      if (typeof listApi.setFilters === 'function') listApi.setFilters({ search: '' });
      listApi.setPage(1);
    }
    highlightRecordRow(recordId);
  }

  function eligiblePets(state, userId) {
    return (state.pets || []).filter(function (p) {
      if (!p.userId || p.claimStatus !== 'bound') return false;
      if (userId && p.userId !== userId) return false;
      return true;
    });
  }

  function lookupLinkedReport(state, testRecordId) {
    return (state.reports || []).find(function (r) { return r.testRecordId === testRecordId; }) || null;
  }

  function pickReportNumber(report) {
    if (!report) return '';
    return String(report.reportNumber || report.platformReportNumber || '').trim();
  }

  function stageBadge(stage) {
    var label = STAGE_LABELS[stage] || stage;
    var tagClass = 'ant-tag ant-tag-default';
    if (stage === 'pending_result') tagClass = 'ant-tag ant-tag-processing';
    else if (stage === 'import_failed') tagClass = 'ant-tag ant-tag-warning';
    else if (stage === 'report_generated') tagClass = 'ant-tag ant-tag-success';
    return '<span class="' + tagClass + '">' + C.escapeHtml(label) + '</span>';
  }

  function submissionTypeLabel(tr) {
    var map = C.SUBMISSION_TYPE_LABELS || { in_store: '本店送检', customer_brought: '客户自带报告' };
    return map[tr.submissionType] || map.in_store;
  }

  function countForView(records, state, view) {
    var count = 0;
    records.forEach(function (tr) {
      var stage = deriveStage(tr, state);
      if (view === 'all' || stage === view) count += 1;
    });
    return count;
  }

  function updateTabCounts(records, state) {
    root.querySelectorAll('.dr-tab-count').forEach(function (el) {
      var view = el.getAttribute('data-count-for');
      var count = countForView(records, state, view);
      el.textContent = count ? '(' + count + ')' : '';
    });
  }

  function updateLinkedViewChrome(state, testRecordId) {
    var isLinkedView = !!testRecordId;
    returnWrap.classList.toggle('hidden', !isLinkedView);
    filterBar.classList.toggle('hidden', isLinkedView);
    if (isLinkedView) {
      linkedBanner.classList.add('hidden');
      notFoundBanner.classList.add('hidden');
      var testRecord = (state.testRecords || []).find(function (tr) { return tr.id === testRecordId; });
      if (!testRecord) {
        notFoundBanner.classList.remove('hidden');
        notFoundDetail.textContent = '送检 ID「' + testRecordId + '」不存在或已被移除，请返回查看全部送检记录。';
        return;
      }
      notFoundBanner.classList.add('hidden');
      linkedBanner.classList.remove('hidden');
      var report = lookupLinkedReport(state, testRecordId);
      var reportNumber = pickReportNumber(report);
      var sampleNumber = String(testRecord.sampleNumber || testRecord.sampleNo || testRecord.label || '').trim();
      var detailParts = [];
      if (reportNumber) detailParts.push('报告号：' + reportNumber);
      if (sampleNumber) detailParts.push('样本编号：' + sampleNumber);
      detailParts.push('送检 ID：' + testRecordId);
      linkedDetail.textContent = detailParts.join(' · ');
      return;
    }
    linkedBanner.classList.add('hidden');
    notFoundBanner.classList.add('hidden');
  }

  function setActiveView(view) {
    currentView = view || 'pending_result';
    viewTabs.forEach(function (tabEl) {
      var active = tabEl.dataset.view === currentView;
      tabEl.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (Session) {
      var activeTab = Session.getActiveTab && Session.getActiveTab();
      if (activeTab) {
        if (!activeTab.listState) activeTab.listState = {};
        var prev = activeTab.listState[STATE_KEY] || {};
        activeTab.listState[STATE_KEY] = Object.assign({}, prev, { view: currentView });
        Session.updateTabState(activeTab.id, { listState: activeTab.listState });
      }
    }
  }

  function syncViewFromRoute() {
    var route = C.parseRoute();
    if (linkedTestRecordId()) {
      setActiveView('all');
      return;
    }
    var activeTab = Session && Session.getActiveTab && Session.getActiveTab();
    var saved = activeTab && activeTab.listState ? activeTab.listState[STATE_KEY] : null;
    if (saved && saved.view && VALID_VIEWS.indexOf(saved.view) >= 0) {
      setActiveView(saved.view);
      return;
    }
    var view = route.params.view || 'pending_result';
    if (VALID_VIEWS.indexOf(view) < 0) view = 'pending_result';
    setActiveView(view);
  }

  function updateRouteView(view) {
    var route = C.parseRoute();
    var params = Object.assign({}, route.params);
    delete params.testRecordId;
    delete params.returnView;
    delete params.action;
    if (view === 'pending_result') delete params.view;
    else params.view = view;
    C.navigate('detection-records', params);
  }

  viewTabs.forEach(function (tabEl) {
    tabEl.addEventListener('click', function () {
      var view = tabEl.dataset.view;
      setActiveView(view);
      updateRouteView(view);
      if (listApi) listApi.setPage(1);
    });
  });

  function buildActionsHtml(tr, state) {
    var stage = deriveStage(tr, state);
    var report = lookupLinkedReport(state, tr.id);
    if (stage === 'pending_result') {
      if (!canImportResult(false)) return '—';
      return '<button type="button" class="ant-btn ant-btn-link ant-btn-sm" data-row-action="import">导入结果</button>';
    }
    if (stage === 'import_failed') {
      if (!canImportResult(true)) return '—';
      return '<button type="button" class="ant-btn ant-btn-link ant-btn-sm" data-row-action="import">重新导入</button>';
    }
    if (stage === 'report_generated' && report) {
      return '<button type="button" class="ant-btn ant-btn-link ant-btn-sm" data-row-action="review">查看报告</button>';
    }
    return '—';
  }

  function registerModalBody(state, scopeUserId) {
    var pets = eligiblePets(state, scopeUserId);
    var petOptions = pets.length
      ? pets.map(function (p) {
        var user = C.lookupUser(state, p.userId);
        var userLabel = user ? user.name + ' (' + (user.phone || '') + ')' : p.userId;
        return '<option value="' + C.escapeHtml(p.id) + '">' + C.escapeHtml(p.name) + ' · ' + C.escapeHtml(userLabel) + '</option>';
      }).join('')
      : '<option value="">暂无已关联用户的宠物</option>';

    var storeOptions = (state.stores || []).map(function (s) {
      return '<option value="' + C.escapeHtml(s.id) + '">' + C.escapeHtml(s.name) + '</option>';
    }).join('');

  var today = new Date().toISOString().slice(0, 10);

    return '<p class="rondo-form-hint" style="margin-bottom:12px">支持选择已有宠物，或一次性登记用户+宠物+送检。样本编号可选。</p>' +
      '<div class="rondo-form-field">' +
      '<label>登记方式</label>' +
      '<div class="rondo-radio-group">' +
      '<label class="rondo-radio-option"><input type="radio" name="dr-reg-mode" value="existing" checked> 选择已有宠物</label>' +
      '<label class="rondo-radio-option"><input type="radio" name="dr-reg-mode" value="new"> 新建用户与宠物</label>' +
      '</div></div>' +
      '<div id="dr-reg-existing-panel">' +
      '<div class="rondo-form-field"><label for="dr-reg-pet-id">已关联用户的宠物 <span style="color:var(--ant-danger)">*</span></label>' +
      '<select id="dr-reg-pet-id" class="ant-input ant-select-native">' + petOptions + '</select>' +
      '<p id="dr-reg-pet-hint" class="rondo-form-hint is-warning hidden"></p></div>' +
      '</div>' +
      '<div id="dr-reg-new-panel" class="hidden">' +
      '<div class="rondo-form-field"><label for="dr-reg-phone">手机号 <span style="color:var(--ant-danger)">*</span></label>' +
      '<input type="tel" id="dr-reg-phone" class="ant-input" placeholder="11 位手机号"></div>' +
      '<div id="dr-reg-existing-user" class="rondo-existing-user-card hidden"></div>' +
      '<div class="rondo-form-field"><label for="dr-reg-user-name">用户姓名（可选）</label>' +
      '<input type="text" id="dr-reg-user-name" class="ant-input" placeholder="选填"></div>' +
      '<div class="rondo-form-field"><label for="dr-reg-pet-name">宠物名称 <span style="color:var(--ant-danger)">*</span></label>' +
      '<input type="text" id="dr-reg-pet-name" class="ant-input" placeholder="宠物名"></div>' +
      '<div class="rondo-form-field"><label for="dr-reg-species">物种</label>' +
      '<select id="dr-reg-species" class="ant-input ant-select-native">' +
      '<option value="dog">狗</option><option value="cat">猫</option></select></div>' +
      '<div class="rondo-form-field"><label for="dr-reg-breed">品种</label>' +
      '<input type="text" id="dr-reg-breed" class="ant-input" placeholder="选填"></div>' +
      '<div class="rondo-form-field"><label for="dr-reg-gender">性别</label>' +
      '<select id="dr-reg-gender" class="ant-input ant-select-native">' +
      '<option value="unknown">未知</option><option value="male">公</option><option value="female">母</option></select></div>' +
      '</div>' +
      '<fieldset class="rondo-form-field"><legend>送检类型 <span style="color:var(--ant-danger)">*</span></legend>' +
      '<div class="rondo-radio-group">' +
      '<label class="rondo-radio-option"><input type="radio" name="dr-reg-submission-type" value="in_store" checked> <span><strong>本店送检</strong><span class="rondo-form-hint">本店已登记样本，等待实验室交付 Excel。</span></span></label>' +
      '<label class="rondo-radio-option"><input type="radio" name="dr-reg-submission-type" value="customer_brought"> <span><strong>客户自带报告</strong><span class="rondo-form-hint">客户已在他处检测并带来文件；仍须先选定宠物并登记，再在该行导入。</span></span></label>' +
      '</div></fieldset>' +
      '<div class="rondo-form-field"><label for="dr-reg-sample-number">样本编号（可选）</label>' +
      '<input type="text" id="dr-reg-sample-number" class="ant-input" placeholder="线下样本标签编号"></div>' +
      '<div class="rondo-form-field"><label for="dr-reg-test-date">送检日期 <span style="color:var(--ant-danger)">*</span></label>' +
      '<input type="date" id="dr-reg-test-date" class="ant-input" value="' + today + '" required></div>' +
      '<div class="rondo-form-field"><label for="dr-reg-store-id">承接门店 <span style="color:var(--ant-danger)">*</span></label>' +
      '<select id="dr-reg-store-id" class="ant-input ant-select-native" required>' + storeOptions + '</select></div>' +
      '<div class="rondo-form-field" id="dr-reg-lab-store-field">' +
      '<label for="dr-reg-lab-store-id">检测机构 <span style="color:var(--ant-danger)">*</span></label>' +
      '<select id="dr-reg-lab-store-id" class="ant-input ant-select-native">' + storeOptions + '</select></div>' +
      '<div class="rondo-form-field hidden" id="dr-reg-lab-name-field">' +
      '<label for="dr-reg-lab-name">检测机构</label>' +
      '<input type="text" id="dr-reg-lab-name" class="ant-input" placeholder="出具 Excel 的实验室名称，选填"></div>';
  }

  function wireRegisterModal(overlay, state, preset) {
    preset = preset || {};
    var presetPetId = preset.petId || '';
    var presetUserId = preset.userId || '';
    var contextUserId = presetUserId || null;
    var existingPanel = overlay.querySelector('#dr-reg-existing-panel');
    var newPanel = overlay.querySelector('#dr-reg-new-panel');
    var petSelect = overlay.querySelector('#dr-reg-pet-id');
    var petHint = overlay.querySelector('#dr-reg-pet-hint');
    var phoneInput = overlay.querySelector('#dr-reg-phone');
    var existingUserCard = overlay.querySelector('#dr-reg-existing-user');
    var userNameInput = overlay.querySelector('#dr-reg-user-name');

    function setMode(mode) {
      var isNew = mode === 'new';
      existingPanel.classList.toggle('hidden', isNew);
      newPanel.classList.toggle('hidden', !isNew);
    }

    function rebuildPetOptions(userId) {
      var pets = eligiblePets(state, userId);
      petSelect.innerHTML = pets.length
        ? pets.map(function (p) {
          var user = C.lookupUser(state, p.userId);
          var userLabel = user ? user.name + ' (' + (user.phone || '') + ')' : p.userId;
          return '<option value="' + C.escapeHtml(p.id) + '">' + C.escapeHtml(p.name) + ' · ' + C.escapeHtml(userLabel) + '</option>';
        }).join('')
        : '<option value="">暂无已关联用户的宠物</option>';
      if (petHint) {
        if (!pets.length) {
          petHint.classList.remove('hidden');
          petHint.textContent = userId
            ? '该用户暂无已关联宠物，请使用「新建用户与宠物」登记新宠。'
            : '暂无已关联用户的宠物，请使用「新建用户与宠物」或前往用户与宠物页完成关联。';
        } else {
          petHint.classList.add('hidden');
          petHint.textContent = '';
        }
      }
    }

    overlay.querySelectorAll('input[name="dr-reg-mode"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        setMode(radio.value);
        if (radio.value === 'new' && presetUserId) {
          var scopedUser = C.lookupUser(state, presetUserId);
          if (scopedUser && !(phoneInput.value || '').trim()) {
            phoneInput.value = scopedUser.phone || '';
          }
          refreshExistingUser();
        }
      });
    });

    rebuildPetOptions(contextUserId);

    if (presetPetId && eligiblePets(state, contextUserId).some(function (p) { return p.id === presetPetId; })) {
      setMode('existing');
      overlay.querySelector('input[name="dr-reg-mode"][value="existing"]').checked = true;
      petSelect.value = presetPetId;
    } else if (presetUserId) {
      var presetUser = C.lookupUser(state, presetUserId);
      if (presetUser) {
        var scopedPets = eligiblePets(state, presetUserId);
        if (scopedPets.length) {
          setMode('existing');
          overlay.querySelector('input[name="dr-reg-mode"][value="existing"]').checked = true;
        } else {
          setMode('new');
          overlay.querySelector('input[name="dr-reg-mode"][value="new"]').checked = true;
          phoneInput.value = presetUser.phone || '';
        }
        refreshExistingUser();
      }
    }

    function refreshExistingUser() {
      var phone = (phoneInput.value || '').trim();
      if (!phone) {
        existingUserCard.classList.add('hidden');
        existingUserCard.classList.remove('is-disabled');
        existingUserCard.innerHTML = '';
        contextUserId = presetUserId || null;
        rebuildPetOptions(contextUserId);
        return;
      }
      var existing = (state.users || []).find(function (u) { return u.phone === phone; });
      if (!existing) {
        existingUserCard.classList.add('hidden');
        existingUserCard.classList.remove('is-disabled');
        existingUserCard.innerHTML = '';
        contextUserId = null;
        rebuildPetOptions(null);
        if (petSelect.value) petSelect.value = '';
        return;
      }
      if (contextUserId && contextUserId !== existing.id && petSelect.value) {
        var selectedPet = C.lookupPet(state, petSelect.value);
        if (selectedPet && selectedPet.userId !== existing.id) {
          petSelect.value = '';
        }
      }
      contextUserId = existing.id;
      rebuildPetOptions(contextUserId);
      existingUserCard.classList.remove('hidden');
      existingUserCard.classList.toggle('is-disabled', !!existing.disabled);
      existingUserCard.innerHTML = '已匹配已有平台用户：<strong>' + C.escapeHtml(existing.name || existing.phone) +
        '</strong>（' + C.escapeHtml(existing.id) + '）— 将关联此账号，不会覆盖已有资料。' +
        (existing.disabled ? '<div class="text-red-600 mt-1">该账号已停用，无法登记送检。</div>' : '');
      if (!userNameInput.value.trim()) {
        userNameInput.placeholder = '已有用户：' + (existing.name || '未填姓名');
      }
    }

    phoneInput.addEventListener('input', refreshExistingUser);
    phoneInput.addEventListener('blur', refreshExistingUser);

    petSelect.addEventListener('change', function () {
      if (!petSelect.value) return;
      var pet = C.lookupPet(state, petSelect.value);
      if (contextUserId && pet && pet.userId !== contextUserId) {
        petSelect.value = '';
        C.toast('所选宠物不属于当前用户', 'warning');
      }
    });

    var storeSelect = overlay.querySelector('#dr-reg-store-id');
    var labSelect = overlay.querySelector('#dr-reg-lab-store-id');
    var labStoreField = overlay.querySelector('#dr-reg-lab-store-field');
    var labNameField = overlay.querySelector('#dr-reg-lab-name-field');
    var labFollowsStore = true;

    function syncRegisterPrimary() {
      var type = (overlay.querySelector('input[name="dr-reg-submission-type"]:checked') || {}).value;
      var isBrought = type === 'customer_brought';
      if (labStoreField) labStoreField.classList.toggle('hidden', isBrought);
      if (labNameField) labNameField.classList.toggle('hidden', !isBrought);
      if (registerModalHandle && typeof registerModalHandle.setOkLabel === 'function') {
        registerModalHandle.setOkLabel(isBrought ? '登记并导入' : '确认登记');
      } else {
        var okBtn = overlay.querySelector('[data-action="ok"]');
        if (okBtn) okBtn.textContent = isBrought ? '登记并导入' : '确认登记';
      }
    }

    if (labSelect && storeSelect) {
      labSelect.value = storeSelect.value;
      labSelect.addEventListener('change', function () {
        labFollowsStore = labSelect.value === storeSelect.value;
      });
      storeSelect.addEventListener('change', function () {
        if (labFollowsStore) labSelect.value = storeSelect.value;
      });
    }
    overlay.querySelectorAll('input[name="dr-reg-submission-type"]').forEach(function (radio) {
      radio.addEventListener('change', syncRegisterPrimary);
    });
    syncRegisterPrimary();

    overlay._registerContextUserId = function () { return contextUserId; };
  }

  function collectRegisterPayload(overlay) {
    var mode = (overlay.querySelector('input[name="dr-reg-mode"]:checked') || {}).value || 'existing';
    var submissionType = (overlay.querySelector('input[name="dr-reg-submission-type"]:checked') || {}).value;
    var sampleNumber = (overlay.querySelector('#dr-reg-sample-number').value || '').trim();
    var testDate = overlay.querySelector('#dr-reg-test-date').value;
    var storeId = overlay.querySelector('#dr-reg-store-id').value;
    var contextUserId = overlay._registerContextUserId ? overlay._registerContextUserId() : null;

    if (!submissionType) throw new Error('请选择送检类型：本店送检或客户自带报告');
    if (!testDate) throw new Error('请选择送检日期');
    if (!storeId) throw new Error('请选择承接门店');

    var payload = {
      sampleNumber: sampleNumber,
      testDate: testDate,
      storeId: storeId || null,
      submissionType: submissionType
    };
    if (submissionType === 'in_store') {
      var labStoreId = (overlay.querySelector('#dr-reg-lab-store-id') || {}).value || storeId;
      payload.labStoreId = labStoreId || null;
      var labStore = C.lookupStore(store.getState(), labStoreId);
      payload.labName = labStore ? labStore.name : '';
    } else {
      payload.labStoreId = null;
      payload.labName = (overlay.querySelector('#dr-reg-lab-name').value || '').trim();
    }
    if (mode === 'existing') {
      payload.petId = overlay.querySelector('#dr-reg-pet-id').value;
      if (!payload.petId) throw new Error('请选择已关联用户的宠物');
      var state = store.getState();
      var pet = C.lookupPet(state, payload.petId);
      if (!pet || !pet.userId) throw new Error('所选宠物尚未关联平台用户');
      if (contextUserId && pet.userId !== contextUserId) {
        throw new Error('所选宠物不属于当前用户，请重新选择');
      }
      var owner = C.lookupUser(state, pet.userId);
      if (owner && owner.disabled) throw new Error('用户已停用，无法登记送检');
    } else {
      var phone = (overlay.querySelector('#dr-reg-phone').value || '').trim();
      var petName = (overlay.querySelector('#dr-reg-pet-name').value || '').trim();
      if (!phone) throw new Error('请填写手机号');
      if (!petName) throw new Error('请填写宠物名称');
      var stateNew = store.getState();
      var existing = (stateNew.users || []).find(function (u) { return u.phone === phone; });
      if (existing) {
        if (existing.disabled) throw new Error('用户已停用，无法登记送检');
        payload.userId = existing.id;
      } else {
        payload.createUser = {
          phone: phone,
          name: (overlay.querySelector('#dr-reg-user-name').value || '').trim() || undefined
        };
      }
      payload.newPet = {
        name: petName,
        species: overlay.querySelector('#dr-reg-species').value,
        breed: (overlay.querySelector('#dr-reg-breed').value || '').trim() || undefined,
        gender: overlay.querySelector('#dr-reg-gender').value
      };
    }
    return payload;
  }

  function registerRoutePreset() {
    var route = C.parseRoute();
    return {
      petId: route.params.petId || '',
      userId: route.params.userId || ''
    };
  }

  function clearRegisterRouteAction() {
    var route = C.parseRoute();
    if (route.pageId !== 'detection-records' || route.params.action !== 'register') return;
    var params = Object.assign({}, route.params);
    delete params.action;
    delete params.petId;
    delete params.userId;
    C.navigate('detection-records', params);
  }

  function openRegisterModal(force) {
    if (!canRegisterTest()) {
      C.toast('当前账号无权限登记送检', 'warning');
      clearRegisterRouteAction();
      return;
    }
    if (registerModalHandle && !force) return;
    var preset = registerRoutePreset();
    var state = store.getState();
    setRegisterDirty(false);
    registerModalHandle = Modal.open({
      title: '登记送检',
      width: 'lg',
      bodyHtml: registerModalBody(state, preset.userId || null),
      okLabel: '确认登记',
      isDirty: function () { return registerFormDirty; },
      onCancel: function (close) {
        close();
        setRegisterDirty(false);
        registerModalHandle = null;
        clearRegisterRouteAction();
      },
      onOk: function (close, overlay, setLoading) {
        try {
          if (Perms) Perms.assertCan('register_test');
        } catch (err) {
          C.toast(err.message, 'error');
          return;
        }
        var payload;
        try {
          payload = collectRegisterPayload(overlay);
        } catch (err) {
          C.toast(err.message, 'warning');
          return;
        }
        setLoading(true);
        try {
          var record = store.registerTest(payload);
          var openImport = payload.submissionType === 'customer_brought';
          close();
          setRegisterDirty(false);
          registerModalHandle = null;
          clearRegisterRouteAction();
          revealNewRecord(record.id);
          if (openImport) {
            pickExcelFiles(record.id, {
              onCancel: function () {
                C.toast('已登记，可稍后在该行导入', 'info');
              }
            });
          } else {
            C.toast('送检记录已登记，状态为待导入结果', 'success');
          }
        } catch (err) {
          C.toast(err.message || '登记失败', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
    wireRegisterModal(registerModalHandle.root, state, preset);
    registerModalHandle.root.addEventListener('input', function () { setRegisterDirty(true); });
    registerModalHandle.root.addEventListener('change', function () { setRegisterDirty(true); });
  }

  function handleRouteParams() {
    var route = C.parseRoute();
    if (route.pageId !== 'detection-records') return;
    if (route.params.action !== 'register') {
      registerRouteHandled = '';
      return;
    }
    var key = [route.params.action, route.params.userId || '', route.params.petId || ''].join('|');
    if (registerRouteHandled === key && registerModalHandle) return;
    registerRouteHandled = key;
    openRegisterModal(true);
  }

  listApi = BT.createListPage({
    container: listContainer,
    ownerTabId: tab && tab.id,
    title: '送检记录',
    stateKey: STATE_KEY,
    searchFields: [{ name: 'search', label: '关键词', placeholder: '送检 ID / 样本编号 / 手机号 / 宠物名' }],
    toolbarActions: canRegisterTest() ? [{
      label: '登记送检',
      variant: 'primary',
      onClick: function () { openRegisterModal(true); }
    }] : [],
    columns: [
      { key: 'id', title: '送检 ID', dataIndex: 'id', required: true, render: function (row) {
        return '<span class="rondo-cell-mono">' + C.escapeHtml(row.id) + '</span>';
      }},
      { key: 'userName', title: '用户', dataIndex: 'userName' },
      { key: 'petName', title: '宠物', dataIndex: 'petName' },
      { key: 'storeName', title: '承接门店', dataIndex: 'storeName', ellipsis: true },
      { key: 'labName', title: '检测机构', dataIndex: 'labName', ellipsis: true },
      { key: 'sampleNumber', title: '样本编号', render: function (row) {
        return '<span class="rondo-cell-mono">' + C.escapeHtml(row.sampleNumber || '—') + '</span>';
      }},
      { key: 'testDate', title: '送检日', dataIndex: 'testDate', sortable: true },
      { key: 'submissionType', title: '送检类型', dataIndex: 'submissionTypeLabel' },
      { key: 'stage', title: '状态', render: function (row) { return stageBadge(row.stage); } },
      { key: 'actions', title: '操作', action: true, render: function (row) { return row.actionsHtml; } }
    ],
    rowKey: 'id',
    fetchData: function (query) {
      var state = store.getState();
      var testRecordId = linkedTestRecordId();
      updateLinkedViewChrome(state, testRecordId);
      var isLinkedView = !!testRecordId;
      var searchPanel = listContainer.querySelector('.rondo-list-search-panel');
      var toolbarPrimary = listContainer.querySelector('.rondo-list-toolbar-primary');
      if (searchPanel) searchPanel.hidden = isLinkedView;
      if (toolbarPrimary) toolbarPrimary.hidden = isLinkedView;
      var rows;
      if (isLinkedView) {
        var matched = (state.testRecords || []).find(function (tr) { return tr.id === testRecordId; });
        rows = matched ? [matched] : [];
      } else {
        var q = (query.filters.search || '').trim().toLowerCase();
        rows = (state.testRecords || []).filter(function (tr) {
          var stage = deriveStage(tr, state);
          if (currentView !== 'all' && stage !== currentView) return false;
          if (q) {
            var user = C.lookupUser(state, tr.userId);
            var pet = C.lookupPet(state, tr.petId);
            var hay = [
              tr.id,
              tr.label,
              tr.sampleNumber,
              user && user.phone,
              pet && pet.name
            ].join(' ').toLowerCase();
            if (hay.indexOf(q) < 0) return false;
          }
          return true;
        });
        updateTabCounts(state.testRecords || [], state);
      }
      rows = rows.slice().sort(function (a, b) {
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });
      var mapped = rows.map(function (tr) {
        var user = C.lookupUser(state, tr.userId);
        var pet = C.lookupPet(state, tr.petId);
        var st = C.lookupStore(state, tr.storeId);
        var stage = deriveStage(tr, state);
        return {
          id: tr.id,
          userName: user ? user.name : '—',
          petName: pet ? pet.name : '—',
          storeName: st ? st.name : '—',
          labName: displayLabName(state, tr),
          sampleNumber: tr.sampleNumber,
          testDate: tr.testDate,
          submissionTypeLabel: submissionTypeLabel(tr),
          stage: stage,
          actionsHtml: buildActionsHtml(tr, state),
          _tr: tr,
          _report: lookupLinkedReport(state, tr.id)
        };
      });
      var total = mapped.length;
      var start = (query.page - 1) * query.pageSize;
      return Promise.resolve({ rows: mapped.slice(start, start + query.pageSize), total: total });
    },
    onRowAction: function (action, row) {
      if (action === 'import') {
        var isReimport = row.stage === 'import_failed';
        if (!canImportResult(isReimport)) {
          C.toast('当前账号无权限执行导入', 'warning');
          return;
        }
        sessionStorage.removeItem('pet-admin-excel-tr');
        pickExcelFiles(row.id);
        return;
      }
      if (action === 'review' && row._report) {
        C.navigate('report-review', { reportId: row._report.id });
      }
    }
  });

  syncViewFromRoute();
  handleRouteParams();

  function onHashChange() {
    if (C.parseRoute().pageId !== 'detection-records') return;
    if (tab && Session && Session.getActiveTab() !== tab) return;
    syncViewFromRoute();
    handleRouteParams();
    if (listApi) listApi.reload();
  }

  var unsub = store.subscribe(function () {
    if (!tabActive) return;
    if (tab && Session && Session.getActiveTab() !== tab) return;
    if (listApi) listApi.reload();
  });

  window.addEventListener('hashchange', onHashChange);

  function onTabActivate() {
    tabActive = true;
    syncViewFromRoute();
    handleRouteParams();
    if (listApi) listApi.reload();
  }

  function onTabDeactivate() {
    tabActive = false;
  }

  function onTabCanLeave() {
    if (!registerFormDirty) return true;
    return confirm('登记表单尚未提交，确定离开吗？');
  }

  if (tab && typeof window.__petAdminRegisterTabHooks === 'function') {
    window.__petAdminRegisterTabHooks(tab.id, {
      activate: onTabActivate,
      deactivate: onTabDeactivate,
      canLeave: onTabCanLeave
    });
  }

  return function teardown() {
    unsub();
    window.removeEventListener('hashchange', onHashChange);
    if (detectionNavItem) {
      detectionNavItem.removeEventListener('click', onDetectionNavClick, true);
    }
    if (registerModalHandle && registerModalHandle.close) {
      registerModalHandle.close();
    }
  };
}
