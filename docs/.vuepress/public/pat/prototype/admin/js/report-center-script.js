function initReportCenter() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var VIEW_LABELS = {
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

  var currentView = 'all';
  var filterState = {};

  var viewTabs = document.querySelectorAll('.rc-view-tab');
  var filterForm = document.getElementById('rc-filter-form');
  var listTitle = document.getElementById('rc-list-title');
  var resultCount = document.getElementById('rc-result-count');
  var tbody = document.getElementById('rc-tbody');
  var emptyEl = document.getElementById('rc-empty');

  var unsub = store.subscribe(function () { render(store.getState()); });
  window.__petAdminPageTeardown = function () { unsub(); };

  function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function pickFirst(obj, keys) {
    if (!obj) return '';
    for (var i = 0; i < keys.length; i++) {
      var val = obj[keys[i]];
      if (val != null && val !== '') return val;
    }
    return '';
  }

  function normalizeWorkflowStatus(raw) {
    var map = {
      unassigned: 'unassigned',
      pending_assignment: 'unassigned',
      待归属: 'unassigned',
      incomplete: 'incomplete',
      pending_completion: 'incomplete',
      待完善: 'incomplete',
      pending_review: 'pending_review',
      待审核: 'pending_review',
      published: 'published',
      已发布: 'published',
      voided: 'voided',
      cancelled: 'voided',
      已作废: 'voided'
    };
    return map[raw] || raw;
  }

  function isUnassigned(report, testRecord) {
    if (report && (report.petId || report.userId)) return false;
    if (testRecord && (testRecord.petId || testRecord.userId)) return false;
    if (testRecord && testRecord.claimStatus === 'bound') return false;
    return true;
  }

  function resolveWorkflowStatus(report, testRecord) {
    var explicit = pickFirst(report, ['workflowStatus', 'mainStatus', 'lifecycleStatus']);
    if (explicit) return normalizeWorkflowStatus(explicit);

    var reportStatus = report ? report.status : '';
    if (reportStatus === 'voided' || reportStatus === 'cancelled') return 'voided';
    if (reportStatus === 'published' || reportStatus === 'corrected') return 'published';
    if (reportStatus === 'pending_review' || reportStatus === 'approved') return 'pending_review';

    if (isUnassigned(report, testRecord)) {
      if (testRecord && testRecord.status === 'import_failed') return 'incomplete';
      return 'unassigned';
    }

    if (reportStatus === 'draft' || reportStatus === 'rejected') return 'incomplete';

    if (testRecord) {
      if (testRecord.status === 'pending_claim' || testRecord.status === 'pending_result') return 'unassigned';
      if (testRecord.status === 'import_failed') return 'incomplete';
      if (testRecord.status === 'pending_review') return 'pending_review';
      if (testRecord.status === 'published') return 'published';
    }

    return 'incomplete';
  }

  var TODO_LABELS = {
    partial_import: '局部导入异常',
    import_error: '导入异常',
    unassigned: '待归属',
    rejected: '审核驳回'
  };

  function isPartialImport(state, testRecord) {
    if (!testRecord || !testRecord.importBatchId) return false;
    var batch = (state.importBatches || []).find(function (b) { return b.id === testRecord.importBatchId; });
    if (!batch || !batch.fileResults) return false;
    return batch.fileResults.some(function (fr) {
      return fr.testRecordId === testRecord.id && fr.status === 'partial';
    });
  }

  function getTodoFlags(state, report, testRecord) {
    var fromReport = asArray(pickFirst(report, ['todoFlags', 'todos', 'pendingTodos', 'todoMarks']));
    if (fromReport.length) {
      return fromReport.map(function (flag) {
        return TODO_LABELS[flag] || String(flag);
      });
    }

    var flags = [];
    if (testRecord && testRecord.status === 'import_failed') flags.push('导入异常');
    if (isPartialImport(state, testRecord)) flags.push('局部导入异常');
    if (report && report.status === 'rejected') flags.push('审核驳回');
    if (isUnassigned(report, testRecord) && testRecord && testRecord.status !== 'pending_result') {
      flags.push('待归属');
    }
    return flags;
  }

  function buildRows(state) {
    var rows = [];
    var reportByTestId = {};

    (state.reports || []).forEach(function (report) {
      if (report && report.testRecordId) reportByTestId[report.testRecordId] = report;
    });

    (state.reports || []).forEach(function (report) {
      var testRecord = (state.testRecords || []).find(function (tr) {
        return tr.id === report.testRecordId;
      }) || null;
      rows.push(assembleRow(state, report, testRecord));
    });

    (state.testRecords || []).forEach(function (testRecord) {
      if (reportByTestId[testRecord.id]) return;
      if (testRecord.status === 'pending_result') return;
      rows.push(assembleRow(state, null, testRecord));
    });

    return rows;
  }

  function assembleRow(state, report, testRecord) {
    var user = report ? C.lookupUser(state, report.userId) : C.lookupUser(state, testRecord ? testRecord.userId : null);
    if (!user && testRecord) user = C.lookupUser(state, testRecord.userId);

    var pet = report ? C.lookupPet(state, report.petId) : C.lookupPet(state, testRecord ? testRecord.petId : null);
    if (!pet && testRecord) pet = C.lookupPet(state, testRecord.petId);

    var storeEntity = C.lookupStore(state, testRecord ? testRecord.storeId : null);
    var workflow = resolveWorkflowStatus(report, testRecord);
    var todos = getTodoFlags(state, report, testRecord);

    return {
      id: report ? report.id : (testRecord ? testRecord.id : ''),
      reportId: report ? report.id : null,
      testRecordId: testRecord ? testRecord.id : (report ? report.testRecordId : null),
      reportNumber: pickFirst(report, ['reportNumber', 'platformReportNumber']) || '—',
      externalReportNumber: pickFirst(report, ['externalReportNumber', 'externalNumber', 'labReportNumber']) || '—',
      sampleNumber: pickFirst(testRecord, ['sampleNumber', 'sampleNo', 'label', 'id']) || (report ? report.testRecordId : '—'),
      userName: user ? user.name : '—',
      userPhone: user ? (user.phone || user.mobile || '') : '',
      petName: pet ? pet.name : '—',
      species: pet ? (pet.species || pet.type || '') : '',
      storeName: storeEntity ? storeEntity.name : '—',
      testDate: testRecord ? (testRecord.testDate || '') : '',
      workflow: workflow,
      todos: todos,
      rawReportStatus: report ? report.status : '',
      rawTestStatus: testRecord ? testRecord.status : ''
    };
  }

  function readFiltersFromForm() {
    return {
      reportNumber: (document.getElementById('rc-q-report').value || '').trim().toLowerCase(),
      externalReportNumber: (document.getElementById('rc-q-external').value || '').trim().toLowerCase(),
      sampleNumber: (document.getElementById('rc-q-sample').value || '').trim().toLowerCase(),
      phone: (document.getElementById('rc-q-phone').value || '').trim().toLowerCase(),
      petName: (document.getElementById('rc-q-pet').value || '').trim().toLowerCase(),
      species: document.getElementById('rc-q-species').value,
      storeName: (document.getElementById('rc-q-store').value || '').trim().toLowerCase(),
      status: document.getElementById('rc-q-status').value,
      dateFrom: document.getElementById('rc-q-date-from').value,
      dateTo: document.getElementById('rc-q-date-to').value,
      todo: document.getElementById('rc-q-todo').value
    };
  }

  function applyFilters(rows) {
    return rows.filter(function (row) {
      if (currentView !== 'all' && row.workflow !== currentView) return false;
      if (filterState.status && row.workflow !== filterState.status) return false;
      if (filterState.reportNumber && row.reportNumber.toLowerCase().indexOf(filterState.reportNumber) < 0) return false;
      if (filterState.externalReportNumber && row.externalReportNumber.toLowerCase().indexOf(filterState.externalReportNumber) < 0) return false;
      if (filterState.sampleNumber && String(row.sampleNumber).toLowerCase().indexOf(filterState.sampleNumber) < 0) return false;
      if (filterState.phone && row.userPhone.toLowerCase().indexOf(filterState.phone) < 0) return false;
      if (filterState.petName && row.petName.toLowerCase().indexOf(filterState.petName) < 0) return false;
      if (filterState.species && row.species !== filterState.species) return false;
      if (filterState.storeName && row.storeName.toLowerCase().indexOf(filterState.storeName) < 0) return false;
      if (filterState.dateFrom && row.testDate && row.testDate < filterState.dateFrom) return false;
      if (filterState.dateTo && row.testDate && row.testDate > filterState.dateTo) return false;
      if (filterState.todo === 'has_todo' && !row.todos.length) return false;
      if (filterState.todo === 'no_todo' && row.todos.length) return false;
      return true;
    });
  }

  function workflowBadge(workflow) {
    var label = VIEW_LABELS[workflow] || workflow;
    var cls = WORKFLOW_BADGE[workflow] || 'bg-gray-100 text-gray-700';
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + cls + '">' + C.escapeHtml(label) + '</span>';
  }

  function todoBadges(todos) {
    if (!todos.length) return '<span class="text-slate-400">—</span>';
    return todos.map(function (t) {
      return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 mr-1 mb-1">' + C.escapeHtml(t) + '</span>';
    }).join('');
  }

  function buildActions(row) {
    var actions = [];
    if (row.workflow === 'unassigned') {
      actions.push('<button type="button" class="text-teal-600 hover:underline mr-2 rc-action" data-action="records">检测记录</button>');
      actions.push('<button type="button" class="text-teal-600 hover:underline rc-action" data-action="import">导入</button>');
    } else if (row.workflow === 'incomplete') {
      actions.push('<button type="button" class="text-teal-600 hover:underline mr-2 rc-action" data-action="records">检测记录</button>');
      if (row.reportId) {
        actions.push('<button type="button" class="text-teal-600 hover:underline rc-action" data-action="review">完善</button>');
      }
    } else if (row.workflow === 'pending_review') {
      if (row.reportId) {
        actions.push('<button type="button" class="text-teal-600 hover:underline rc-action" data-action="review">审核</button>');
      }
    } else if (row.workflow === 'published') {
      if (row.reportId) {
        actions.push('<button type="button" class="text-teal-600 hover:underline rc-action" data-action="published">查看</button>');
      }
    } else if (row.workflow === 'voided') {
      actions.push('<button type="button" class="text-teal-600 hover:underline rc-action" data-action="records">追溯</button>');
    }
    return actions.join('') || '—';
  }

  function setActiveView(view) {
    currentView = view || 'all';
    viewTabs.forEach(function (tab) {
      var active = tab.dataset.view === currentView;
      tab.classList.toggle('bg-teal-600', active);
      tab.classList.toggle('text-white', active);
      tab.classList.toggle('border-teal-600', active);
      tab.classList.toggle('border-slate-200', !active);
      tab.classList.toggle('text-slate-600', !active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    listTitle.textContent = VIEW_LABELS[currentView] + '报告';
  }

  function syncViewFromRoute() {
    var route = C.parseRoute();
    var view = route.params.view || route.params.status || 'all';
    if (!VIEW_LABELS[view]) view = 'all';
    setActiveView(view);
  }

  function updateRouteView(view) {
    var route = C.parseRoute();
    var params = Object.assign({}, route.params);
    if (view === 'all') {
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
    if (action === 'import') {
      if (row.testRecordId) sessionStorage.setItem('pet-admin-excel-tr', row.testRecordId);
      C.navigate('excel-import');
      return;
    }
    if (action === 'records') {
      if (row.rawTestStatus) sessionStorage.setItem('pet-admin-detection-filter', row.rawTestStatus);
      C.navigate('detection-records');
    }
  }

  function render(state) {
    syncViewFromRoute();
    var rows = applyFilters(buildRows(state));
    resultCount.textContent = '共 ' + rows.length + ' 条';

    if (!rows.length) {
      tbody.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    tbody.innerHTML = rows.map(function (row) {
      return '<tr class="hover:bg-slate-50">' +
        '<td class="px-3 py-2">' + C.escapeHtml(row.reportNumber) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(row.externalReportNumber) + '</td>' +
        '<td class="px-3 py-2 font-mono text-xs">' + C.escapeHtml(String(row.sampleNumber)) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(row.userName) + ' / ' + C.escapeHtml(row.petName) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(row.species || '—') + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(row.storeName) + '</td>' +
        '<td class="px-3 py-2">' + workflowBadge(row.workflow) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(row.testDate || '—') + '</td>' +
        '<td class="px-3 py-2">' + todoBadges(row.todos) + '</td>' +
        '<td class="px-3 py-2 whitespace-nowrap">' + buildActions(row) + '</td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('.rc-action').forEach(function (btn) {
      btn.onclick = function () {
        var tr = btn.closest('tr');
        var idx = Array.prototype.indexOf.call(tbody.children, tr);
        handleAction(btn.dataset.action, rows[idx]);
      };
    });
  }

  viewTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var view = tab.dataset.view;
      setActiveView(view);
      updateRouteView(view);
      render(store.getState());
    });
  });

  filterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    filterState = readFiltersFromForm();
    render(store.getState());
  });

  document.getElementById('rc-btn-reset').addEventListener('click', function () {
    filterForm.reset();
    filterState = {};
    render(store.getState());
  });

  filterForm.querySelectorAll('input, select').forEach(function (el) {
    el.addEventListener('change', function () {
      filterState = readFiltersFromForm();
      render(store.getState());
    });
  });

  function onHashChange() {
    if (C.parseRoute().pageId === 'report-center') render(store.getState());
  }
  window.addEventListener('hashchange', onHashChange);

  filterState = readFiltersFromForm();
  render(store.getState());

  var prevTeardown = window.__petAdminPageTeardown;
  window.__petAdminPageTeardown = function () {
    if (typeof prevTeardown === 'function') prevTeardown();
    window.removeEventListener('hashchange', onHashChange);
  };
}
