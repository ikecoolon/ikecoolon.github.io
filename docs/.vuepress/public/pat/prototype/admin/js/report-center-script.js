function initReportCenter() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var VIEW_LABELS = {
    pending: '待处理',
    all: '全部',
    unassigned: '待归属',
    incomplete: '待完善',
    pending_review: '待审核',
    published: '已发布',
    voided: '已作废'
  };

  var WORKFLOW_BADGE = {
    unassigned: 'bg-purple-100 text-purple-800',
    incomplete: 'bg-blue-100 text-blue-800',
    pending_review: 'bg-amber-100 text-amber-800',
    published: 'bg-emerald-100 text-emerald-800',
    voided: 'bg-gray-200 text-gray-600'
  };

  var PENDING_WORKFLOWS = ['unassigned', 'incomplete', 'pending_review'];
  var COUNT_VIEWS = ['pending', 'all', 'unassigned', 'incomplete', 'pending_review', 'published', 'voided'];

  var SPECIES_LABEL = { cat: '猫', dog: '狗', 猫: '猫', 狗: '狗' };

  var currentView = 'pending';
  var filterState = {};
  var openMoreMenuId = null;

  var viewTabs = document.querySelectorAll('.rc-view-tab');
  var filterForm = document.getElementById('rc-filter-form');
  var listTitle = document.getElementById('rc-list-title');
  var resultCount = document.getElementById('rc-result-count');
  var listEl = document.getElementById('rc-list');
  var emptyEl = document.getElementById('rc-empty');
  var advancedToggle = document.getElementById('rc-advanced-toggle');
  var advancedPanel = document.getElementById('rc-advanced-filters');

  var unsub = store.subscribe(function () { render(store.getState()); });
  window.__petAdminPageTeardown = function () { unsub(); };

  function pickFirst(obj, keys) {
    if (!obj) return '';
    for (var i = 0; i < keys.length; i++) {
      var val = obj[keys[i]];
      if (val != null && val !== '') return val;
    }
    return '';
  }

  function resolveWorkflow(report, testRecord) {
    if (typeof store.getWorkflowStatus === 'function') {
      return store.getWorkflowStatus(report, testRecord);
    }
    return report.workflowStatus || 'incomplete';
  }

  function speciesLabel(report, pet) {
    var raw = pickFirst(report, ['reportSpecies']) || (pet ? pickFirst(pet, ['species', 'type']) : '');
    return SPECIES_LABEL[raw] || raw || '';
  }

  function resolveSourceName(state, report, testRecord) {
    var storeEntity = C.lookupStore(state, testRecord ? testRecord.storeId : null);
    if (storeEntity && storeEntity.name) return String(storeEntity.name).trim();
    var orgId = pickFirst(report, ['sourceOrgId']) || (testRecord ? testRecord.sourceOrgId : '');
    return orgId ? String(orgId) : '—';
  }

  function statusEnteredAt(report) {
    return pickFirst(report, ['statusChangedAt', 'statusEnteredAt']) || report.updatedAt || report.createdAt || '';
  }

  function buildRows(state) {
    return (state.reports || []).map(function (report) {
      var testRecord = C.lookupTestRecord(state, report.testRecordId);
      var user = C.lookupUser(state, report.userId) || C.lookupUser(state, testRecord ? testRecord.userId : null);
      var pet = C.lookupPet(state, report.petId) || C.lookupPet(state, testRecord ? testRecord.petId : null);
      var workflow = resolveWorkflow(report, testRecord);
      var reportNumber = String(pickFirst(report, ['reportNumber', 'platformReportNumber']) || '—').trim();
      var sampleNumber = String(
        pickFirst(report, ['sampleNumber']) ||
        pickFirst(testRecord, ['sampleNumber', 'sampleNo', 'label']) ||
        ''
      ).trim();

      return {
        id: report.id,
        reportId: report.id,
        testRecordId: report.testRecordId || (testRecord ? testRecord.id : null),
        reportNumber: reportNumber,
        externalReportNumber: String(pickFirst(report, ['externalReportNumber', 'externalNumber', 'labReportNumber']) || '').trim(),
        sampleNumber: sampleNumber,
        userName: user ? user.name : '—',
        userPhone: user ? String(pickFirst(user, ['phone', 'mobile']) || '') : '',
        petName: pet ? pet.name : '—',
        species: speciesLabel(report, pet),
        sourceName: resolveSourceName(state, report, testRecord),
        testDate: testRecord ? (testRecord.testDate || '') : '',
        workflow: workflow,
        statusEnteredAt: statusEnteredAt(report),
        updatedAt: report.updatedAt || report.createdAt || '',
        rawReportStatus: report.status || '',
        rawTestStatus: testRecord ? testRecord.status : ''
      };
    });
  }

  function readFiltersFromForm() {
    return {
      search: (document.getElementById('rc-q-search').value || '').trim().toLowerCase(),
      status: document.getElementById('rc-q-status').value,
      storeName: (document.getElementById('rc-q-store').value || '').trim().toLowerCase(),
      species: document.getElementById('rc-q-species').value,
      dateFrom: document.getElementById('rc-q-date-from').value,
      dateTo: document.getElementById('rc-q-date-to').value
    };
  }

  function matchesSearch(row, search) {
    if (!search) return true;
    var haystack = [
      row.reportNumber,
      row.sampleNumber,
      row.userPhone,
      row.petName
    ].join(' ').toLowerCase();
    return haystack.indexOf(search) >= 0;
  }

  function applyCommonFilters(rows) {
    return rows.filter(function (row) {
      if (filterState.status && row.workflow !== filterState.status) return false;
      if (!matchesSearch(row, filterState.search)) return false;
      if (filterState.storeName && row.sourceName.toLowerCase().indexOf(filterState.storeName) < 0) return false;
      if (filterState.species && row.species !== filterState.species) return false;
      if (filterState.dateFrom && row.testDate && row.testDate < filterState.dateFrom) return false;
      if (filterState.dateTo && row.testDate && row.testDate > filterState.dateTo) return false;
      return true;
    });
  }

  function matchesView(row, view) {
    if (view === 'all') return true;
    if (view === 'pending') return PENDING_WORKFLOWS.indexOf(row.workflow) >= 0;
    return row.workflow === view;
  }

  function isPendingSortView(view) {
    return view === 'pending' || PENDING_WORKFLOWS.indexOf(view) >= 0;
  }

  function sortRows(rows, view) {
    var sorted = rows.slice();
    if (isPendingSortView(view)) {
      sorted.sort(function (a, b) {
        return String(a.statusEnteredAt).localeCompare(String(b.statusEnteredAt));
      });
      return sorted;
    }
    sorted.sort(function (a, b) {
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
    return sorted;
  }

  function countForView(rows, view) {
    var count = 0;
    rows.forEach(function (row) {
      if (matchesView(row, view)) count += 1;
    });
    return count;
  }

  function updateTabCounts(filteredRows) {
    document.querySelectorAll('.rc-tab-count').forEach(function (el) {
      var view = el.getAttribute('data-count-for');
      var count = countForView(filteredRows, view);
      el.textContent = count ? '(' + count + ')' : '';
    });
  }

  function workflowBadge(workflow) {
    var label = VIEW_LABELS[workflow] || workflow;
    var cls = WORKFLOW_BADGE[workflow] || 'bg-gray-100 text-gray-700';
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + cls + '">' + C.escapeHtml(label) + '</span>';
  }

  function primaryAction(row) {
    var map = {
      unassigned: { action: 'review', label: '处理归属' },
      incomplete: { action: 'review', label: '完善' },
      pending_review: { action: 'review', label: '审核' },
      published: { action: 'review', label: '查看' },
      voided: { action: 'review', label: '追溯' }
    };
    var cfg = map[row.workflow];
    if (!cfg || !row.reportId) return '';
    return '<button type="button" class="btn-primary px-3 py-1 rounded text-xs rc-action" data-action="' + cfg.action + '" data-report-id="' + C.escapeHtml(row.reportId) + '">' + cfg.label + '</button>';
  }

  function moreMenuItems(row) {
    var items = [];
    if (row.workflow === 'unassigned' && row.testRecordId) {
      items.push({ action: 'assign', label: '宠物档案归属' });
    }
    if (row.workflow === 'incomplete' && row.testRecordId) {
      items.push({ action: 'import', label: '重新导入' });
    }
    if (row.workflow === 'published' && row.reportId) {
      items.push({ action: 'published', label: '已发布列表' });
    }
    if (row.testRecordId) {
      items.push({ action: 'records', label: '检测记录' });
    }
    return items;
  }

  function buildMoreMenu(row) {
    var items = moreMenuItems(row);
    if (!items.length) return '';
    var menuId = 'rc-more-' + row.id;
    var open = openMoreMenuId === menuId;
    return '<div class="relative inline-block rc-more-wrap" data-menu-id="' + C.escapeHtml(menuId) + '">' +
      '<button type="button" class="btn-secondary px-2 py-1 rounded text-xs rc-more-toggle" data-menu-id="' + C.escapeHtml(menuId) + '">更多 <i class="fas fa-chevron-down text-[10px]"></i></button>' +
      '<div class="rc-more-menu absolute right-0 mt-1 min-w-[8rem] bg-white border border-slate-200 rounded-md shadow-lg z-10 text-xs' + (open ? '' : ' hidden') + '" data-menu-id="' + C.escapeHtml(menuId) + '">' +
      items.map(function (item) {
        return '<button type="button" class="block w-full text-left px-3 py-2 hover:bg-slate-50 rc-action" data-action="' + item.action + '" data-report-id="' + C.escapeHtml(row.reportId) + '" data-test-record-id="' + C.escapeHtml(row.testRecordId || '') + '">' + C.escapeHtml(item.label) + '</button>';
      }).join('') +
      '</div></div>';
  }

  function buildActions(row) {
    return '<div class="flex items-center justify-end gap-2">' + primaryAction(row) + buildMoreMenu(row) + '</div>';
  }

  function reportIdentity(row) {
    var primary = C.escapeHtml(row.reportNumber);
    var secondary = row.sampleNumber ? C.escapeHtml(row.sampleNumber) : '';
    if (row.externalReportNumber && row.externalReportNumber !== row.reportNumber) {
      secondary = secondary ? secondary + ' · ' + C.escapeHtml(row.externalReportNumber) : C.escapeHtml(row.externalReportNumber);
    }
    return '<div class="font-medium text-slate-800">' + primary + '</div>' +
      (secondary ? '<div class="text-xs text-slate-500 font-mono mt-0.5">' + secondary + '</div>' : '');
  }

  function setActiveView(view) {
    currentView = view || 'pending';
    viewTabs.forEach(function (tab) {
      var active = tab.dataset.view === currentView;
      tab.classList.toggle('bg-teal-600', active);
      tab.classList.toggle('text-white', active);
      tab.classList.toggle('border-teal-600', active);
      tab.classList.toggle('border-slate-200', !active);
      tab.classList.toggle('text-slate-600', !active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    listTitle.textContent = (VIEW_LABELS[currentView] || currentView) + '报告';
  }

  function syncViewFromRoute() {
    var route = C.parseRoute();
    var view = route.params.view || route.params.status || 'pending';
    if (view === 'pending_result') view = 'pending';
    if (!VIEW_LABELS[view]) view = 'pending';
    setActiveView(view);
  }

  function updateRouteView(view) {
    var route = C.parseRoute();
    var params = Object.assign({}, route.params);
    if (view === 'pending') {
      delete params.view;
      delete params.status;
    } else {
      params.view = view;
      delete params.status;
    }
    C.navigate('report-center', params);
  }

  function handleAction(action, row) {
    if (action === 'review' && row.reportId) {
      C.navigate('report-review', { reportId: row.reportId });
      return;
    }
    if (action === 'published' && row.reportId) {
      C.navigate('published-reports', { reportId: row.reportId });
      return;
    }
    if (action === 'assign' && row.testRecordId) {
      C.navigate('pet-information', { action: 'assign', testRecordId: row.testRecordId });
      return;
    }
    if (action === 'import' && row.testRecordId) {
      sessionStorage.setItem('pet-admin-excel-tr', row.testRecordId);
      C.navigate('excel-import');
      return;
    }
    if (action === 'records') {
      if (row.rawTestStatus) sessionStorage.setItem('pet-admin-detection-filter', row.rawTestStatus);
      C.navigate('detection-records');
    }
  }

  function bindRowActions(rows) {
    listEl.querySelectorAll('.rc-action').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var card = btn.closest('.rc-card');
        var idx = card ? Number(card.getAttribute('data-row-index')) : -1;
        if (idx < 0 || !rows[idx]) return;
        openMoreMenuId = null;
        handleAction(btn.dataset.action, rows[idx]);
      };
    });

    listEl.querySelectorAll('.rc-more-toggle').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var menuId = btn.getAttribute('data-menu-id');
        openMoreMenuId = openMoreMenuId === menuId ? null : menuId;
        render(store.getState());
      };
    });
  }

  function render(state) {
    syncViewFromRoute();
    var allRows = buildRows(state);
    var filteredRows = applyCommonFilters(allRows);
    updateTabCounts(filteredRows);

    var rows = sortRows(
      filteredRows.filter(function (row) { return matchesView(row, currentView); }),
      currentView
    );

    resultCount.textContent = '共 ' + rows.length + ' 条';

    if (!rows.length) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    listEl.innerHTML = rows.map(function (row, index) {
      return '<article class="rc-card border border-slate-200 rounded-lg px-3 py-2.5 hover:border-slate-300 hover:bg-slate-50/50" data-row-index="' + index + '">' +
        '<div class="rc-card-grid grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center text-sm">' +
        '<div class="sm:col-span-3">' + reportIdentity(row) + '</div>' +
        '<div class="sm:col-span-2"><div class="text-slate-800">' + C.escapeHtml(row.userName) + '</div><div class="text-xs text-slate-500">' + C.escapeHtml(row.petName) + '</div></div>' +
        '<div class="sm:col-span-2 text-slate-700">' + C.escapeHtml(row.sourceName) + '</div>' +
        '<div class="sm:col-span-1">' + workflowBadge(row.workflow) + '</div>' +
        '<div class="sm:col-span-2 text-slate-600 text-xs">' + C.escapeHtml(C.formatDate(row.updatedAt)) + '</div>' +
        '<div class="sm:col-span-2">' + buildActions(row) + '</div>' +
        '</div></article>';
    }).join('');

    bindRowActions(rows);
  }

  viewTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var view = tab.dataset.view;
      setActiveView(view);
      updateRouteView(view);
      openMoreMenuId = null;
      render(store.getState());
    });
  });

  filterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    filterState = readFiltersFromForm();
    openMoreMenuId = null;
    render(store.getState());
  });

  document.getElementById('rc-btn-reset').addEventListener('click', function () {
    filterForm.reset();
    filterState = {};
    openMoreMenuId = null;
    render(store.getState());
  });

  filterForm.querySelectorAll('input, select').forEach(function (el) {
    el.addEventListener('change', function () {
      filterState = readFiltersFromForm();
      openMoreMenuId = null;
      render(store.getState());
    });
  });

  document.getElementById('btn-go-import').addEventListener('click', function () {
    C.navigate('excel-import');
  });

  advancedToggle.addEventListener('click', function () {
    var expanded = advancedToggle.getAttribute('aria-expanded') === 'true';
    expanded = !expanded;
    advancedToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    advancedPanel.classList.toggle('hidden', !expanded);
    var chevron = advancedToggle.querySelector('.rc-advanced-chevron');
    if (chevron) chevron.classList.toggle('rotate-90', expanded);
  });

  function onHashChange() {
    if (C.parseRoute().pageId === 'report-center') {
      openMoreMenuId = null;
      render(store.getState());
    }
  }

  function onDocumentClick() {
    if (openMoreMenuId) {
      openMoreMenuId = null;
      render(store.getState());
    }
  }

  window.addEventListener('hashchange', onHashChange);
  document.addEventListener('click', onDocumentClick);

  filterState = readFiltersFromForm();
  render(store.getState());

  var prevTeardown = window.__petAdminPageTeardown;
  window.__petAdminPageTeardown = function () {
    if (typeof prevTeardown === 'function') prevTeardown();
    window.removeEventListener('hashchange', onHashChange);
    document.removeEventListener('click', onDocumentClick);
  };
}
