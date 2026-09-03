function initReportCenter() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var VIEW_LABELS = {
    pending: '待处理',
    all: '全部',
    incomplete: '待完善',
    pending_review: '待审核',
    published: '已发布',
    voided: '已作废'
  };

  var PENDING_STATUSES = ['incomplete', 'pending_review'];
  var QUEUE_SORT_VIEWS = ['pending', 'incomplete', 'pending_review'];
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

  function lookupBatch(state, testRecord) {
    if (!testRecord || !testRecord.importBatchId) return null;
    return (state.importBatches || []).find(function (b) { return b.id === testRecord.importBatchId; }) || null;
  }

  function buildRows(state) {
    return (state.reports || []).map(function (report) {
      var testRecord = C.lookupTestRecord(state, report.testRecordId);
      var user = C.lookupUser(state, report.userId) || C.lookupUser(state, testRecord ? testRecord.userId : null);
      var pet = C.lookupPet(state, report.petId) || C.lookupPet(state, testRecord ? testRecord.petId : null);
      var batch = lookupBatch(state, testRecord);
      var reportNumber = String(pickFirst(report, ['reportNumber', 'platformReportNumber']) || '—').trim();
      var sampleNumber = String(
        pickFirst(report, ['sampleNumber']) ||
        pickFirst(testRecord, ['sampleNumber', 'sampleNo', 'label']) ||
        ''
      ).trim();
      var todoFlags = report.todoFlags || [];
      var correctionStage = typeof store.getCorrectionDraftStage === 'function'
        ? store.getCorrectionDraftStage(report)
        : null;

      return {
        id: report.id,
        reportId: report.id,
        testRecordId: report.testRecordId || (testRecord ? testRecord.id : null),
        reportNumber: reportNumber,
        externalReportNumber: String(pickFirst(report, ['externalReportNumber', 'externalNumber', 'labReportNumber']) || '').trim(),
        sampleNumber: sampleNumber,
        batchFileName: batch && batch.fileName ? String(batch.fileName).trim() : '',
        userName: user ? user.name : '—',
        userPhone: user ? String(pickFirst(user, ['phone', 'mobile']) || '') : '',
        petName: pet ? pet.name : '—',
        species: speciesLabel(report, pet),
        sourceName: resolveSourceName(state, report, testRecord),
        testDate: testRecord ? (testRecord.testDate || '') : '',
        status: report.status || '',
        correctionDraftActive: !!report.correctionDraftActive,
        correctionStage: correctionStage,
        rejectReason: report.rejectReason || null,
        todoFlagCount: todoFlags.length,
        statusChangedAt: report.statusChangedAt || report.updatedAt || report.createdAt || '',
        updatedAt: report.updatedAt || report.createdAt || ''
      };
    });
  }

  function readFiltersFromForm() {
    return {
      search: (document.getElementById('rc-q-search').value || '').trim().toLowerCase(),
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
      row.externalReportNumber,
      row.sampleNumber,
      row.userPhone,
      row.petName
    ].join(' ').toLowerCase();
    return haystack.indexOf(search) >= 0;
  }

  function applyCommonFilters(rows) {
    return rows.filter(function (row) {
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
    if (view === 'pending') {
      return PENDING_STATUSES.indexOf(row.status) >= 0 || row.correctionDraftActive;
    }
    return row.status === view;
  }

  function isPendingSortView(view) {
    return QUEUE_SORT_VIEWS.indexOf(view) >= 0;
  }

  function sortRows(rows, view) {
    var sorted = rows.slice();
    if (isPendingSortView(view)) {
      sorted.sort(function (a, b) {
        return String(a.statusChangedAt).localeCompare(String(b.statusChangedAt));
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

  function statusCell(row) {
    var html = C.statusBadge(row.status, C.REPORT_STATUS_LABELS);
    if (row.correctionDraftActive) {
      var sub = row.correctionStage === 'pending_review' ? '更正中·待审核' : '更正中·待完善';
      html += ' <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800">' +
        C.escapeHtml(sub) + '</span>';
    }
    if (row.rejectReason && row.status === 'incomplete') {
      html += ' <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">已退回</span>';
    }
    if (row.todoFlagCount) {
      html += ' <span class="inline-flex items-center justify-center ml-0.5 min-w-[1rem] h-4 px-0.5 rounded-full bg-amber-500 text-white text-[10px] leading-none" title="待办 ' +
        row.todoFlagCount + '">' + row.todoFlagCount + '</span>';
    }
    return html;
  }

  function userPetCell(row) {
    return '<div class="text-slate-800">' + C.escapeHtml(row.userName) + '</div>' +
      '<div class="text-xs text-slate-500">' + C.escapeHtml(row.petName) + '</div>';
  }

  function primaryAction(row) {
    var label = '查看';
    if (row.correctionDraftActive) {
      label = row.correctionStage === 'pending_review' ? '审核更正' : '处理更正';
    } else if (row.status === 'incomplete') {
      label = '完善';
    } else if (row.status === 'pending_review') {
      label = '审核';
    } else if (row.status === 'voided') {
      label = '追溯';
    }
    if (!row.reportId) return '';
    return '<button type="button" class="btn-primary px-3 py-1 rounded text-xs rc-action" data-action="review" data-report-id="' +
      C.escapeHtml(row.reportId) + '">' + label + '</button>';
  }

  function moreMenuItems(row) {
    var items = [];
    if (row.testRecordId) {
      items.push({ action: 'records', label: '查看送检记录' });
    }
    if (row.reportId) {
      items.push({ action: 'versions', label: '版本' });
    }
    if (row.status !== 'voided' && row.reportId) {
      items.push({ action: 'void', label: '作废' });
    }
    if (row.status === 'published' && !row.correctionDraftActive && row.reportId) {
      items.push({ action: 'correction', label: '创建更正草稿' });
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
      '<div class="rc-more-menu absolute right-0 mt-1 min-w-[10rem] bg-white border border-slate-200 rounded-md shadow-lg z-10 text-xs' + (open ? '' : ' hidden') + '" data-menu-id="' + C.escapeHtml(menuId) + '">' +
      items.map(function (item) {
        return '<button type="button" class="block w-full text-left px-3 py-2 hover:bg-slate-50 rc-action" data-action="' + item.action +
          '" data-report-id="' + C.escapeHtml(row.reportId) +
          '" data-test-record-id="' + C.escapeHtml(row.testRecordId || '') + '">' + C.escapeHtml(item.label) + '</button>';
      }).join('') +
      '</div></div>';
  }

  function buildActions(row) {
    return '<div class="flex items-center justify-end gap-2">' + primaryAction(row) + buildMoreMenu(row) + '</div>';
  }

  function testRecordLink(row) {
    if (!row.testRecordId) return '';
    return '<div class="mt-1"><button type="button" class="text-teal-600 hover:underline text-xs rc-action" data-action="records">查看送检信息</button></div>';
  }

  function withReturnView(params) {
    var next = Object.assign({}, params || {});
    next.returnView = currentView;
    return next;
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
    if (view === 'unassigned' || !VIEW_LABELS[view]) view = 'pending';
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
      C.navigate('report-review', withReturnView({ reportId: row.reportId }));
      return;
    }
    if (action === 'versions' && row.reportId) {
      C.navigate('report-review', withReturnView({ reportId: row.reportId, module: 'source', focus: 'trace' }));
      return;
    }
    if (action === 'records' && row.testRecordId) {
      C.navigate('detection-records', withReturnView({ testRecordId: row.testRecordId }));
      return;
    }
    if (action === 'void' && row.reportId) {
      C.promptDialog('作废报告', '请填写作废原因', function (reason) {
        try {
          store.voidReport(row.reportId, reason);
          C.toast('报告已作废', 'success');
        } catch (err) {
          C.toast(err.message || '作废失败', 'error');
        }
      });
      return;
    }
    if (action === 'correction' && row.reportId) {
      C.promptDialog('创建更正草稿', '请填写更正说明', function (note) {
        try {
          store.createCorrectionDraft(row.reportId, { correctionNote: note });
          C.toast('已创建更正草稿', 'success');
        } catch (err) {
          C.toast(err.message || '创建更正草稿失败', 'error');
        }
      });
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
        '<div class="sm:col-span-2">' + userPetCell(row) + '</div>' +
        '<div class="sm:col-span-2 text-slate-700">' + C.escapeHtml(row.sourceName) + testRecordLink(row) + '</div>' +
        '<div class="sm:col-span-2">' + statusCell(row) + '</div>' +
        '<div class="sm:col-span-1 text-slate-600 text-xs">' + C.escapeHtml(C.formatDate(row.updatedAt)) + '</div>' +
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
