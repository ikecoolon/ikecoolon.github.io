function initDetectionRecords() {
  var C = window.PetAdminCommon;
  var store = C.store();
  var searchEl = document.getElementById('search-records');
  var filterBar = document.getElementById('dr-filter-bar');
  var returnWrap = document.getElementById('btn-go-report-center-wrap');
  var linkedBanner = document.getElementById('dr-linked-context');
  var linkedDetail = document.getElementById('dr-linked-detail');
  var notFoundBanner = document.getElementById('dr-not-found');
  var notFoundDetail = document.getElementById('dr-not-found-detail');
  var registerModal = document.getElementById('register-modal');
  var registerForm = document.getElementById('register-form');
  var regPetId = document.getElementById('reg-pet-id');
  var regPetHint = document.getElementById('reg-pet-hint');
  var regSampleNumber = document.getElementById('reg-sample-number');
  var regTestDate = document.getElementById('reg-test-date');
  var regStoreId = document.getElementById('reg-store-id');
  var viewTabs = document.querySelectorAll('.dr-view-tab');

  var RETURN_VIEWS = ['all', 'incomplete', 'pending_review', 'published', 'voided', 'pending'];
  var VALID_VIEWS = ['pending_result', 'import_failed', 'all'];
  var STAGE_LABELS = {
    pending_result: '待导入结果',
    import_failed: '导入异常',
    report_generated: '已生成报告'
  };
  var STAGE_BADGE = {
    pending_result: 'bg-blue-100 text-blue-800',
    import_failed: 'bg-amber-100 text-amber-800',
    report_generated: 'bg-emerald-100 text-emerald-800'
  };

  var currentView = 'pending_result';

  function returnToReportCenter() {
    var route = C.parseRoute();
    var view = route.params.returnView;
    if (view && view !== 'pending' && RETURN_VIEWS.indexOf(view) >= 0) {
      C.navigate('report-center', { view: view });
    } else {
      C.navigate('report-center');
    }
  }

  document.getElementById('btn-go-report-center').onclick = returnToReportCenter;

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

  document.getElementById('dr-view-all').onclick = goToAllRecords;
  document.getElementById('dr-view-all-not-found').onclick = goToAllRecords;

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

  var unsub = store.subscribe(render);
  window.__petAdminPageTeardown = function () { unsub(); };

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
    var importParams = {
      fileName: '定向导入_' + testRecordId + '.xlsx',
      files: files,
      testRecordId: testRecordId
    };
    try {
      var result = store.simulateBatchImport(importParams);
      var okCount = (result.fileResults || []).filter(function (r) {
        return r.status === 'success' || r.status === 'partial';
      }).length;
      sessionStorage.removeItem('pet-admin-excel-tr');
      if (okCount) {
        C.toast('导入完成：已写入检测结果并生成报告草稿', 'success');
      } else {
        C.toast('导入失败，送检记录仍为待导入结果', 'warning');
      }
    } catch (err) {
      C.toast(err.message || '导入失败', 'error');
    }
  }

  function pickExcelFiles(testRecordId) {
    if (!testRecordId) {
      C.toast('请从待导入的送检记录发起「导入结果」', 'warning');
      return;
    }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.multiple = false;
    input.style.display = 'none';
    input.onchange = function () {
      runExcelImport(testRecordId || null, input.files);
      if (input.parentNode) input.parentNode.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
  }

  document.getElementById('btn-register-test').onclick = function () {
    openRegisterModal();
  };

  document.getElementById('reg-cancel').onclick = closeRegisterModal;

  registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    try {
      store.registerTest({
        petId: regPetId.value,
        sampleNumber: regSampleNumber.value.trim(),
        testDate: regTestDate.value,
        storeId: regStoreId.value || null,
        sourceOrgId: regStoreId.value ? null : store.DEFAULT_SOURCE_ORG_ID,
        submissionType: (registerForm.querySelector('input[name="reg-submission-type"]:checked') || {}).value
      });
      C.toast('送检记录已登记，状态为待导入结果', 'success');
      closeRegisterModal();
      render(store.getState());
    } catch (err) {
      C.toast(err.message || '登记失败', 'error');
    }
  });

  searchEl.addEventListener('input', function () { render(store.getState()); });

  function setActiveView(view) {
    currentView = view || 'pending_result';
    viewTabs.forEach(function (tab) {
      var active = tab.dataset.view === currentView;
      tab.classList.toggle('bg-teal-600', active);
      tab.classList.toggle('text-white', active);
      tab.classList.toggle('border-teal-600', active);
      tab.classList.toggle('border-slate-200', !active);
      tab.classList.toggle('text-slate-600', !active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function syncViewFromRoute() {
    var route = C.parseRoute();
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
    if (view === 'pending_result') {
      delete params.view;
    } else {
      params.view = view;
    }
    C.navigate('detection-records', params);
  }

  viewTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var view = tab.dataset.view;
      setActiveView(view);
      updateRouteView(view);
      render(store.getState());
    });
  });

  function eligiblePets(state) {
    return (state.pets || []).filter(function (p) {
      return p.userId && p.claimStatus === 'bound';
    });
  }

  function populateRegisterForm(state) {
    var pets = eligiblePets(state);
    if (!pets.length) {
      regPetId.innerHTML = '<option value="">暂无已关联用户的宠物</option>';
      regPetHint.classList.remove('hidden');
      regPetHint.innerHTML = '请先到 <button type="button" class="text-teal-600 underline" id="reg-go-customer">客户管理</button> 确认用户，或在 <button type="button" class="text-teal-600 underline" id="reg-go-pet">宠物档案</button> 创建并关联宠物。';
      var goCustomer = document.getElementById('reg-go-customer');
      var goPet = document.getElementById('reg-go-pet');
      if (goCustomer) goCustomer.onclick = function () { closeRegisterModal(); C.navigate('customer-management'); };
      if (goPet) goPet.onclick = function () { closeRegisterModal(); C.navigate('pet-information', { action: 'create' }); };
    } else {
      regPetHint.classList.add('hidden');
      regPetId.innerHTML = pets.map(function (p) {
        var user = C.lookupUser(state, p.userId);
        var userLabel = user ? user.name + ' (' + (user.phone || '') + ')' : p.userId;
        return '<option value="' + C.escapeHtml(p.id) + '">' + C.escapeHtml(p.name) + ' · ' + C.escapeHtml(userLabel) + '</option>';
      }).join('');
    }

    regStoreId.innerHTML = (state.stores || []).map(function (s) {
      return '<option value="' + C.escapeHtml(s.id) + '">' + C.escapeHtml(s.name) + '</option>';
    }).join('');

    if (!regTestDate.value) {
      regTestDate.value = new Date().toISOString().slice(0, 10);
    }
  }

  function openRegisterModal() {
    populateRegisterForm(store.getState());
    registerModal.classList.remove('hidden');
  }

  function closeRegisterModal() {
    registerModal.classList.add('hidden');
    registerForm.reset();
    regPetHint.classList.add('hidden');
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
    var cls = STAGE_BADGE[stage] || 'bg-gray-100 text-gray-700';
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + cls + '">' + C.escapeHtml(label) + '</span>';
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
    document.querySelectorAll('.dr-tab-count').forEach(function (el) {
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
      searchEl.disabled = true;
    } else {
      searchEl.disabled = false;
      linkedBanner.classList.add('hidden');
      notFoundBanner.classList.add('hidden');
      return;
    }

    var testRecord = (state.testRecords || []).find(function (tr) { return tr.id === testRecordId; });
    if (!testRecord) {
      linkedBanner.classList.add('hidden');
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
  }

  function handleRouteParams() {
    var route = C.parseRoute();
    if (route.pageId !== 'detection-records') return;
    if (route.params.action === 'register') {
      openRegisterModal();
    }
  }

  render(store.getState());
  handleRouteParams();

  function submissionTypeLabel(tr) {
    var map = C.SUBMISSION_TYPE_LABELS || { in_store: '本店送检', customer_brought: '客户自带报告' };
    return map[tr.submissionType] || map.in_store;
  }

  function buildActions(tr, state) {
    var stage = deriveStage(tr, state);
    var report = lookupLinkedReport(state, tr.id);
    var actions = [];

    if (stage === 'pending_result') {
      actions.push('<button type="button" class="text-teal-600 hover:underline mr-2" data-action="import" data-id="' + tr.id + '">导入结果</button>');
    } else if (stage === 'import_failed') {
      actions.push('<button type="button" class="text-amber-600 hover:underline" data-action="import" data-id="' + tr.id + '">重新导入</button>');
    } else if (stage === 'report_generated' && report) {
      actions.push('<button type="button" class="text-teal-600 hover:underline" data-action="review" data-rid="' + report.id + '">查看报告</button>');
    }

    return actions.join('') || '—';
  }

  function render(state) {
    syncViewFromRoute();
    var testRecordId = linkedTestRecordId();
    var isLinkedView = !!testRecordId;
    updateLinkedViewChrome(state, testRecordId);

    var rows;
    if (isLinkedView) {
      var matched = (state.testRecords || []).find(function (tr) { return tr.id === testRecordId; });
      rows = matched ? [matched] : [];
    } else {
      var q = (searchEl.value || '').trim().toLowerCase();
      rows = (state.testRecords || []).filter(function (tr) {
        var stage = deriveStage(tr, state);
        if (currentView !== 'all' && stage !== currentView) return false;
        if (q) {
          var hay = [tr.id, tr.label, tr.sampleNumber].join(' ').toLowerCase();
          if (hay.indexOf(q) < 0) return false;
        }
        return true;
      });
      updateTabCounts(state.testRecords || [], state);
    }

    rows = rows.slice().sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });

    var tbody = document.getElementById('records-tbody');
    var empty = document.getElementById('records-empty');
    if (!rows.length) {
      tbody.innerHTML = '';
      var linkedRecordMissing = isLinkedView && !(state.testRecords || []).some(function (tr) { return tr.id === testRecordId; });
      if (linkedRecordMissing) {
        empty.classList.add('hidden');
      } else {
        empty.classList.remove('hidden');
        empty.textContent = isLinkedView ? '未找到该报告关联的送检记录' : '无匹配送检记录';
      }
      return;
    }
    empty.classList.add('hidden');

    tbody.innerHTML = rows.map(function (tr) {
      var user = C.lookupUser(state, tr.userId);
      var pet = C.lookupPet(state, tr.petId);
      var st = C.lookupStore(state, tr.storeId);
      var stage = deriveStage(tr, state);

      return '<tr class="hover:bg-slate-50">' +
        '<td class="px-3 py-2 font-mono text-xs">' + C.escapeHtml(tr.id) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(user ? user.name : '—') + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(pet ? pet.name : '—') + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(st ? st.name : '—') + '</td>' +
        '<td class="px-3 py-2 font-mono text-xs">' + C.escapeHtml(tr.sampleNumber || '—') + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(tr.testDate) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(submissionTypeLabel(tr)) + '</td>' +
        '<td class="px-3 py-2">' + stageBadge(stage) + '</td>' +
        '<td class="px-3 py-2 whitespace-nowrap">' + buildActions(tr, state) + '</td></tr>';
    }).join('');

    tbody.querySelectorAll('[data-action="import"]').forEach(function (btn) {
      btn.onclick = function () {
        sessionStorage.removeItem('pet-admin-excel-tr');
        pickExcelFiles(btn.dataset.id);
      };
    });
    tbody.querySelectorAll('[data-action="review"]').forEach(function (btn) {
      btn.onclick = function () {
        C.navigate('report-review', { reportId: btn.dataset.rid });
      };
    });
  }

  function onHashChange() {
    handleRouteParams();
    render(store.getState());
  }
  window.addEventListener('hashchange', onHashChange);

  var prevTeardown = window.__petAdminPageTeardown;
  window.__petAdminPageTeardown = function () {
    if (typeof prevTeardown === 'function') prevTeardown();
    window.removeEventListener('hashchange', onHashChange);
    if (detectionNavItem) {
      detectionNavItem.removeEventListener('click', onDetectionNavClick, true);
    }
  };
}
