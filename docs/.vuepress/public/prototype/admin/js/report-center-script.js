function initReportCenter(mountRoot, tab) {
  var root = mountRoot || document;
  var C = window.PetAdminCommon;
  var BT = window.PetAdminBasicTable;
  var Session = window.PetAdminSession;
  var Perms = window.PetAdminPermissions;
  var store = C.store();

  var cssLink = root.querySelector('link[href*="report-center.css"]');
  if (cssLink && !document.getElementById('pet-admin-report-center-css')) {
    var headLink = document.createElement('link');
    headLink.id = 'pet-admin-report-center-css';
    headLink.rel = 'stylesheet';
    headLink.href = cssLink.getAttribute('href');
    document.head.appendChild(headLink);
  }

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
  var STATE_KEY = 'report-center';

  var currentView = 'pending';
  var openMoreMenuId = null;
  var listApi = null;
  var allRowsCache = [];
  var tabActive = true;

  var viewTabs = root.querySelectorAll('.rc-view-tab');
  var listContainer = root.querySelector('#rc-list-table');

  function getOwnerTab() {
    if (tab && Session && Session.findTab) {
      return Session.findTab(tab.id) || tab;
    }
    return Session && Session.getActiveTab && Session.getActiveTab();
  }

  function getSavedListState() {
    if (!Session) return {};
    var ownerTab = getOwnerTab();
    if (!ownerTab || !ownerTab.listState) return {};
    return ownerTab.listState[STATE_KEY] || {};
  }

  function saveViewState(view) {
    if (!Session) return;
    var ownerTab = getOwnerTab();
    if (!ownerTab) return;
    if (!ownerTab.listState) ownerTab.listState = {};
    var prev = ownerTab.listState[STATE_KEY] || {};
    ownerTab.listState[STATE_KEY] = Object.assign({}, prev, { view: view });
    Session.updateTabState(ownerTab.id, { listState: ownerTab.listState });
  }

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
        statusChangedAt: report.statusChangedAt || report.updatedAt || report.createdAt || '',
        updatedAt: report.updatedAt || report.createdAt || ''
      };
    });
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

  function applyCommonFilters(rows, filters) {
    var search = (filters.search || '').trim().toLowerCase();
    var storeName = (filters.storeName || '').trim().toLowerCase();
    return rows.filter(function (row) {
      if (!matchesSearch(row, search)) return false;
      if (storeName && row.sourceName.toLowerCase().indexOf(storeName) < 0) return false;
      if (filters.species && row.species !== filters.species) return false;
      if (filters.dateFrom && row.testDate && row.testDate < filters.dateFrom) return false;
      if (filters.dateTo && row.testDate && row.testDate > filters.dateTo) return false;
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

  function sortRows(rows, view, query) {
    var sorted = rows.slice();
    if (query && query.sortField) {
      var field = query.sortField;
      var asc = query.sortOrder !== 'desc';
      sorted.sort(function (a, b) {
        var cmp = String(a[field] || '').localeCompare(String(b[field] || ''));
        return asc ? cmp : -cmp;
      });
      return sorted;
    }
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
    root.querySelectorAll('.rc-tab-count').forEach(function (el) {
      var view = el.getAttribute('data-count-for');
      var count = countForView(filteredRows, view);
      el.textContent = count ? '(' + count + ')' : '';
    });
  }

  function isPendingReviewLikeRow(row) {
    if (row.status === 'pending_review') return true;
    return row.correctionDraftActive && row.correctionStage === 'pending_review';
  }

  function canEditRow(row) {
    if (!Perms || (Perms.getActor && Perms.getActor().readOnly)) return false;
    if (row.status === 'voided') return false;
    if (row.status === 'published' && !row.correctionDraftActive) return false;
    if (isPendingReviewLikeRow(row)) return false;
    return Perms.can('edit');
  }

  function canReviewRow(row) {
    if (!Perms || !isPendingReviewLikeRow(row)) return false;
    return Perms.can('review');
  }

  function canVoidRow(row) {
    return row.status !== 'voided' && row.reportId && Perms && Perms.can('void');
  }

  function canCreateCorrectionRow(row) {
    return row.status === 'published' && !row.correctionDraftActive && row.reportId && Perms && Perms.can('edit');
  }

  function primaryActionForRow(row) {
    if (row.correctionDraftActive) {
      if (row.correctionStage === 'pending_review') {
        return canReviewRow(row)
          ? { label: '审核更正', primary: true }
          : { label: '查看', primary: false };
      }
      return canEditRow(row)
        ? { label: '处理更正', primary: true }
        : { label: '查看', primary: false };
    }
    if (row.status === 'incomplete') {
      return canEditRow(row)
        ? { label: '完善', primary: true }
        : { label: '查看', primary: false };
    }
    if (row.status === 'pending_review') {
      return canReviewRow(row)
        ? { label: '审核', primary: true }
        : { label: '查看', primary: false };
    }
    if (row.status === 'voided') {
      return { label: '追溯', primary: false };
    }
    return { label: '查看', primary: false };
  }

  function statusCell(row) {
    var html = C.statusBadge(row.status, C.REPORT_STATUS_LABELS);
    if (row.correctionDraftActive) {
      var sub = row.correctionStage === 'pending_review' ? '更正中·待审核' : '更正中·待完善';
      html += '<span class="rondo-tag-sub">' + C.escapeHtml(sub) + '</span>';
    }
    if (row.rejectReason && row.status === 'incomplete') {
      html += '<span class="rondo-tag-sub rondo-tag-danger-sub">已退回</span>';
    }
    return html;
  }

  function moreMenuItems(row) {
    var items = [];
    if (row.testRecordId) items.push({ action: 'records', label: '查看送检记录' });
    if (row.reportId) items.push({ action: 'versions', label: '版本' });
    if (canVoidRow(row)) items.push({ action: 'void', label: '作废' });
    if (canCreateCorrectionRow(row)) items.push({ action: 'correction', label: '创建更正草稿' });
    return items;
  }

  function buildActionsHtml(row) {
    var html = '';
    if (row.reportId) {
      var primary = primaryActionForRow(row);
      var btnClass = primary.primary ? 'ant-btn ant-btn-primary ant-btn-sm' : 'ant-btn ant-btn-default ant-btn-sm';
      html += '<button type="button" class="' + btnClass + '" data-row-action="review">' +
        C.escapeHtml(primary.label) + '</button> ';
    }
    var items = moreMenuItems(row);
    if (!items.length) return html || '—';
    var menuId = 'rc-more-' + row.id;
    var open = openMoreMenuId === menuId;
    html += '<span class="rondo-dropdown" data-menu-id="' + C.escapeHtml(menuId) + '">' +
      '<button type="button" class="ant-btn ant-btn-default ant-btn-sm rondo-more-toggle" data-row-action="toggle-more" data-menu-id="' +
      C.escapeHtml(menuId) + '" aria-haspopup="menu" aria-expanded="' + (open ? 'true' : 'false') + '">更多 <i class="fas fa-chevron-down"></i></button>';
    if (open) {
      html += '<div class="rondo-dropdown-menu is-fixed" role="menu">';
      items.forEach(function (item) {
        html += '<button type="button" class="rondo-dropdown-item" role="menuitem" data-row-action="' + item.action + '">' +
          C.escapeHtml(item.label) + '</button>';
      });
      html += '</div>';
    }
    html += '</span>';
    return html;
  }

  function reportIdentityCell(row) {
    var primary = C.escapeHtml(row.reportNumber);
    var secondary = row.sampleNumber ? C.escapeHtml(row.sampleNumber) : '';
    if (row.externalReportNumber && row.externalReportNumber !== row.reportNumber) {
      secondary = secondary
        ? secondary + ' · ' + C.escapeHtml(row.externalReportNumber)
        : C.escapeHtml(row.externalReportNumber);
    }
    var link = row.testRecordId
      ? '<div class="rondo-cell-sub"><button type="button" class="ant-btn ant-btn-link ant-btn-sm" data-row-action="records">查看送检信息</button></div>'
      : '';
    return '<div>' + primary + (secondary ? '<div class="rondo-cell-sub rondo-cell-mono">' + secondary + '</div>' : '') + link + '</div>';
  }

  function repositionOpenMenu() {
    if (!openMoreMenuId) return;
    var wrap = root.querySelector('[data-menu-id="' + openMoreMenuId + '"]');
    if (!wrap) return;
    var btn = wrap.querySelector('.rondo-more-toggle');
    var menu = wrap.querySelector('.rondo-dropdown-menu');
    if (!btn || !menu) return;
    var rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = Math.round(rect.bottom + 4) + 'px';
    menu.style.right = Math.round(window.innerWidth - rect.right) + 'px';
    menu.style.left = 'auto';
    menu.style.minWidth = Math.max(rect.width, 160) + 'px';
  }

  function withReturnView(params) {
    var next = Object.assign({}, params || {});
    next.returnView = currentView;
    return next;
  }

  function setActiveView(view) {
    currentView = view || 'pending';
    viewTabs.forEach(function (tabEl) {
      var active = tabEl.dataset.view === currentView;
      tabEl.setAttribute('aria-selected', active ? 'true' : 'false');
      tabEl.classList.toggle('ant-tabs-tab-active', active);
    });
    saveViewState(currentView);
    var titleEl = root.querySelector('.rondo-list-page-title');
    if (titleEl) titleEl.textContent = (VIEW_LABELS[currentView] || currentView) + '报告';
  }

  function syncViewFromRoute() {
    var route = C.parseRoute();
    var routeView = route.params.view || route.params.status;
    if (routeView) {
      if (routeView === 'pending_result') routeView = 'pending';
      if (routeView === 'unassigned' || !VIEW_LABELS[routeView]) routeView = null;
      if (routeView) {
        setActiveView(routeView);
        return;
      }
    }
    var saved = getSavedListState();
    if (saved.view && VIEW_LABELS[saved.view]) {
      setActiveView(saved.view);
      return;
    }
    setActiveView('pending');
  }

  function updateRouteView(view) {
    var route = C.parseRoute();
    var params = Object.assign({}, route.params);
    delete params.returnView;
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
    if (action === 'void') {
      if (!canVoidRow(row)) {
        C.toast('当前账号无权限执行此操作', 'error');
        return;
      }
      C.promptDialog('作废报告', '请填写作废原因', function (reason) {
        try {
          store.voidReport(row.reportId, reason);
          C.toast('报告已作废', 'success');
          if (listApi) listApi.reload();
        } catch (err) {
          C.toast(err.message || '作废失败', 'error');
        }
      });
      return;
    }
    if (action === 'correction') {
      if (!canCreateCorrectionRow(row)) {
        C.toast('当前账号无权限执行此操作', 'error');
        return;
      }
      C.promptDialog('创建更正草稿', '请填写更正说明', function (note) {
        try {
          store.createCorrectionDraft(row.reportId, { correctionNote: note });
          C.toast('已创建更正草稿', 'success');
          if (listApi) listApi.reload();
        } catch (err) {
          C.toast(err.message || '创建更正草稿失败', 'error');
        }
      });
    }
  }

  function setupAdvancedFilters() {
    var searchForm = listContainer.querySelector('.rondo-search-form');
    if (!searchForm) return;
    ['species', 'dateFrom', 'dateTo'].forEach(function (name) {
      var input = searchForm.querySelector('[name="' + name + '"]');
      if (!input) return;
      var field = input.closest('.rondo-search-form-field');
      if (field) field.classList.add('is-advanced');
    });
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'rondo-search-advanced-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<i class="fas fa-chevron-right rc-advanced-chevron" aria-hidden="true"></i>高级筛选';
    var actions = searchForm.querySelector('.rondo-search-form-actions');
    searchForm.insertBefore(toggle, actions);
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      expanded = !expanded;
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      searchForm.classList.toggle('is-advanced-open', expanded);
    });
  }

  listApi = BT.createListPage({
    container: listContainer,
    title: '待处理报告',
    stateKey: STATE_KEY,
    ownerTabId: tab && tab.id,
    searchFields: [
      { name: 'search', label: '关键词', placeholder: '报告号 / 外部报告号 / 样本号 / 手机号 / 宠物名' },
      { name: 'storeName', label: '来源机构', placeholder: '机构名称' },
      {
        name: 'species',
        label: '物种',
        type: 'select',
        options: [
          { value: '', label: '全部物种' },
          { value: '猫', label: '猫' },
          { value: '狗', label: '狗' }
        ]
      },
      { name: 'dateFrom', label: '检测日期起', type: 'date' },
      { name: 'dateTo', label: '检测日期止', type: 'date' }
    ],
    columns: [
      { key: 'reportNumber', title: '报告标识', dataIndex: 'reportNumber', required: true, render: reportIdentityCell },
      {
        key: 'userPet',
        title: '用户 / 宠物',
        render: function (row) {
          return '<div>' + C.escapeHtml(row.userName) + '<div class="rondo-cell-sub">' + C.escapeHtml(row.petName) + '</div></div>';
        }
      },
      { key: 'sourceName', title: '来源', dataIndex: 'sourceName', ellipsis: true },
      { key: 'status', title: '状态', render: function (row) { return statusCell(row); } },
      {
        key: 'updatedAt',
        title: '更新时间',
        dataIndex: 'updatedAt',
        sortable: true,
        render: function (row) { return C.escapeHtml(C.formatDate(row.updatedAt)); }
      },
      { key: 'actions', title: '操作', action: true, render: buildActionsHtml }
    ],
    rowKey: 'id',
    fetchData: function (query) {
      var state = store.getState();
      allRowsCache = buildRows(state);
      var filtered = applyCommonFilters(allRowsCache, query.filters || {});
      updateTabCounts(filtered);
      var viewRows = sortRows(
        filtered.filter(function (row) { return matchesView(row, currentView); }),
        currentView,
        query
      );
      var total = viewRows.length;
      var start = (query.page - 1) * query.pageSize;
      var pageRows = viewRows.slice(start, start + query.pageSize);
      return Promise.resolve({ rows: pageRows, total: total }).then(function (result) {
        if (openMoreMenuId) {
          setTimeout(repositionOpenMenu, 0);
        }
        return result;
      });
    },
    onRowAction: function (action, row) {
      if (action === 'toggle-more') {
        var menuId = 'rc-more-' + row.id;
        openMoreMenuId = openMoreMenuId === menuId ? null : menuId;
        listApi.reload();
        return;
      }
      openMoreMenuId = null;
      handleAction(action, row);
    }
  });

  setupAdvancedFilters();
  syncViewFromRoute();
  setActiveView(currentView);

  viewTabs.forEach(function (tabEl) {
    tabEl.addEventListener('click', function () {
      var view = tabEl.dataset.view;
      setActiveView(view);
      updateRouteView(view);
      openMoreMenuId = null;
      listApi.setPage(1);
    });
  });

  function onHashChange() {
    if (C.parseRoute().pageId !== 'report-center') return;
    if (!tabActive) return;
    if (tab && Session && Session.getActiveTab() !== tab) return;
    openMoreMenuId = null;
    syncViewFromRoute();
    listApi.reload();
  }

  function onDocumentClick(e) {
    if (!openMoreMenuId) return;
    if (e.target.closest('.rondo-dropdown')) return;
    openMoreMenuId = null;
    listApi.reload();
  }

  function onDocumentKeydown(e) {
    if (!openMoreMenuId) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      openMoreMenuId = null;
      listApi.reload();
      return;
    }
    var wrap = root.querySelector('[data-menu-id="' + openMoreMenuId + '"]');
    if (!wrap) return;
    var items = Array.prototype.slice.call(wrap.querySelectorAll('.rondo-dropdown-item'));
    if (!items.length) return;
    var focused = document.activeElement;
    var idx = items.indexOf(focused);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      var next = idx < 0 ? 0 : Math.min(idx + 1, items.length - 1);
      items[next].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      var prev = idx <= 0 ? items.length - 1 : idx - 1;
      items[prev].focus();
    } else if (e.key === 'Enter' && idx >= 0) {
      e.preventDefault();
      items[idx].click();
    }
  }

  function onWindowResize() {
    if (openMoreMenuId) repositionOpenMenu();
  }

  var unsub = store.subscribe(function () {
    if (!tabActive) return;
    if (tab && Session && Session.getActiveTab() !== tab) return;
    listApi.reload();
  });

  window.addEventListener('hashchange', onHashChange);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
  window.addEventListener('resize', onWindowResize);

  function onTabActivate() {
    tabActive = true;
    syncViewFromRoute();
    if (listApi) listApi.reload();
  }

  function onTabDeactivate() {
    tabActive = false;
    openMoreMenuId = null;
  }

  function onTabDispose() {
    openMoreMenuId = null;
    if (listApi && listApi.destroy) listApi.destroy();
  }

  if (tab && typeof window.__petAdminRegisterTabHooks === 'function') {
    window.__petAdminRegisterTabHooks(tab.id, {
      activate: onTabActivate,
      deactivate: onTabDeactivate,
      dispose: onTabDispose,
      canLeave: function () { return true; }
    });
  }

  return function teardown() {
    unsub();
    window.removeEventListener('hashchange', onHashChange);
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onDocumentKeydown);
    window.removeEventListener('resize', onWindowResize);
    if (listApi && listApi.destroy) listApi.destroy();
  };
}
