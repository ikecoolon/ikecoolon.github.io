function loadAdminScript(src) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[data-src="' + src + '"]')) {
      resolve();
      return;
    }
    var s = document.createElement('script');
    s.src = './js/' + src;
    s.dataset.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function initPetReportManagement() {
  Promise.all([
    loadAdminScript('range-matcher-util.js')
  ]).then(function () {
    initPetReportManagementCore();
  }).catch(function () {
    initPetReportManagementCore();
  });
}

function initPetReportManagementCore() {
  var C = window.PetAdminCommon;
  var store = C.store();
  var svc = window.dictionaryDataService;
  if (!C || !store || !svc) return;

  svc.ensureDemoCompletionScenario();

  var mainView = document.getElementById('main-view');
  var formView = document.getElementById('form-view');
  var importView = document.getElementById('import-view');
  var searchInput = document.getElementById('search-report');
  var filterHealthLevel = document.getElementById('filter-health-level');
  var filterStatus = document.getElementById('filter-status');
  var tableBody = document.getElementById('report-table-body');
  var batchImportButton = document.getElementById('batch-import-btn');
  var backToListButton = document.getElementById('back-to-list');
  var backToListFromImportButton = document.getElementById('back-to-list-from-import');
  var reportDetailModal = document.getElementById('report-detail-modal');
  var closeDetailModal = document.getElementById('close-detail-modal');
  var closeDetailBtn = document.getElementById('close-detail-btn');
  var detailTabs = document.getElementById('detail-tabs');
  var overviewBasicInfo = document.getElementById('overview-basic-info');
  var overviewHealthAssessment = document.getElementById('overview-health-assessment');
  var overviewKeyMetrics = document.getElementById('overview-key-metrics');
  var matchedRules = document.getElementById('matched-rules');
  var analysisContent = document.getElementById('analysis-content');
  var suggestionContent = document.getElementById('suggestion-content');
  var importFile = document.getElementById('import-file');
  var fileDropZone = document.getElementById('file-drop-zone');
  var fileSelected = document.getElementById('file-selected');
  var selectedFileName = document.getElementById('selected-file-name');
  var removeFileButton = document.getElementById('remove-file');
  var importPreview = document.getElementById('import-preview');
  var startImportButton = document.getElementById('start-import');
  var cancelImportButton = document.getElementById('cancel-import');
  var completionModal = document.getElementById('completion-modal');
  var completionBody = document.getElementById('completion-body');
  var completionSubtitle = document.getElementById('completion-subtitle');
  var closeCompletionModal = document.getElementById('close-completion-modal');
  var closeCompletionBtn = document.getElementById('close-completion-btn');
  var freezeRangesBtn = document.getElementById('freeze-ranges-btn');
  var addNewReportButton = document.getElementById('add-new-report');

  var currentReportData = null;
  var currentCompletionReportId = null;

  function getState() {
    return store.getState();
  }

  function getVersion(report) {
    if (!report || !report.versions || !report.versions.length) return null;
    return report.versions.find(function (v) { return v.version === (report.workingVersion || report.currentVersion); }) ||
      report.versions[report.versions.length - 1];
  }

  function buildViewModel(report) {
    var state = getState();
    var pet = C.lookupPet(state, report.petId);
    var user = C.lookupUser(state, report.userId);
    var tr = C.lookupTestRecord(state, report.testRecordId);
    var version = getVersion(report);
    var indicators = (state.indicators || []).filter(function (ind) {
      return ind.reportId === report.id && ind.isCurrent;
    });
    var species = svc.getReportSpecies(state, report);
    return {
      id: report.id,
      reportNumber: report.reportNumber,
      status: report.status,
      workflowStatus: report.workflowStatus,
      todoFlags: report.todoFlags || [],
      petInfo: {
        name: pet ? pet.name.replace(store.DEMO_LABEL + ' ', '') : '—',
        breed: pet ? pet.breed : '—',
        species: species
      },
      ownerInfo: {
        name: user ? user.name.replace(store.DEMO_LABEL + ' ', '') : '—',
        phone: user ? user.phone : '—'
      },
      testInfo: {
        testDate: tr ? tr.testDate : '—',
        status: tr ? tr.status : report.workflowStatus
      },
      healthAssessment: {
        level: version ? version.healthLevel : '',
        score: version ? version.healthScore : null,
        advice: version ? version.summary : ''
      },
      indicators: indicators,
      species: species,
      raw: report
    };
  }

  function listReports() {
    return getState().reports.map(buildViewModel);
  }

  function needsCompletion(report) {
    if ((report.todoFlags || []).indexOf('partial_import') >= 0) return true;
    return (report.indicators || []).some(function (ind) {
      return ind.pendingConfirm || !ind.effectiveRange;
    });
  }

  function statusDisplay(workflowStatus) {
    var map = {
      incomplete: { text: '待完善', color: 'bg-amber-100 text-amber-800' },
      pending_review: { text: '待审核', color: 'bg-blue-100 text-blue-800' },
      published: { text: '已发布', color: 'bg-emerald-100 text-emerald-800' },
      voided: { text: '已作废', color: 'bg-gray-100 text-gray-700' },
      unassigned: { text: '待归属', color: 'bg-purple-100 text-purple-800' }
    };
    return map[workflowStatus] || { text: workflowStatus, color: 'bg-gray-100 text-gray-700' };
  }

  function renderTable() {
    var filter = (searchInput.value || '').trim().toLowerCase();
    var healthFilter = filterHealthLevel.value;
    var statusFilter = filterStatus.value;
    var rows = listReports().filter(function (report) {
      var searchHay = [report.reportNumber, report.petInfo.name, report.ownerInfo.name].join(' ').toLowerCase();
      var matchesSearch = !filter || searchHay.indexOf(filter) >= 0;
      var matchesHealth = !healthFilter || report.healthAssessment.level === healthFilter;
      var matchesStatus = !statusFilter || report.workflowStatus === statusFilter;
      return matchesSearch && matchesHealth && matchesStatus;
    });

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">暂无报告数据</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map(function (report) {
      var st = statusDisplay(report.workflowStatus);
      var level = report.healthAssessment.level || '未评级';
      var completeBtn = needsCompletion(report)
        ? '<button class="text-amber-700 hover:text-amber-900 mr-3 complete-report" data-id="' + C.escapeHtml(report.id) + '"><i class="fas fa-wrench mr-1"></i>完善</button>'
        : '';
      return '<tr class="hover:bg-gray-50">' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">' + C.escapeHtml(report.reportNumber) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + C.escapeHtml(report.petInfo.name) + '</div><div class="text-sm text-gray-500">' + C.escapeHtml(report.petInfo.breed) + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + C.escapeHtml(report.ownerInfo.name) + '</div><div class="text-sm text-gray-500">' + C.escapeHtml(report.ownerInfo.phone) + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium ' + st.color + '">' + st.text + '</span></td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">' + level + (report.healthAssessment.score != null ? ' / ' + report.healthAssessment.score : '') + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + C.escapeHtml(report.testInfo.testDate) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">' +
          '<button class="text-blue-600 hover:text-blue-900 mr-3 view-report" data-id="' + C.escapeHtml(report.id) + '"><i class="fas fa-eye mr-1"></i>查看</button>' +
          completeBtn +
        '</td></tr>';
    }).join('');
  }

  function formatIndicatorValue(ind) {
    var normalized = store.normalizeDataStatus(ind.dataStatus);
    if (normalized === 'NOT_DETECTED') return '未检出';
    if (normalized === 'MISSING_COLUMN' || normalized === 'EMPTY') return '缺失';
    if (normalized === 'NOT_APPLICABLE') return '不适用';
    if (normalized === 'INVALID') return '无效';
    if (ind.value == null || ind.value === '') return '—';
    return ind.value + (ind.unit || '');
  }

  function formatRangeSource(ind, species) {
    if (ind.effectiveRange) {
      return '已冻结(' + ind.effectiveRange.source + ') ' + ind.effectiveRange.min + '-' + ind.effectiveRange.max + ind.effectiveRange.unit;
    }
    var resolved = svc.resolveEffectiveRangeForIndicator(ind, species, { respectFrozen: false });
    if (!resolved) return '暂无参考范围';
    var label = { imported: 'Excel导入', platform: '平台兜底', manual: '人工填写' }[resolved.source] || resolved.source;
    return label + ' ' + resolved.min + '-' + resolved.max + resolved.unit;
  }

  function renderIndicatorRow(ind, species, reportId) {
    var evalResult = svc.evaluateIndicatorResult(ind, species);
    var statusClass = evalResult.canJudge
      ? (evalResult.status === 'normal' ? 'text-emerald-700' : 'text-red-700')
      : 'text-gray-600';
    var original = ind.originalValue !== undefined ? ('原始: ' + (ind.originalValue == null ? '—' : ind.originalValue) + (ind.unit || '')) : '';
    var source = ind.valueSource ? ('来源: ' + ind.valueSource) : '';
    var pending = ind.pendingConfirm
      ? '<div class="mt-2 p-2 bg-amber-50 rounded text-xs">待确认检测项：' + C.escapeHtml(ind.rawImportName || ind.key) +
        ' <button class="ml-2 text-blue-600 confirm-link-btn" data-id="' + C.escapeHtml(ind.id) + '">关联 Peptacetobacter</button>' +
        ' <button class="ml-1 text-green-600 confirm-create-btn" data-id="' + C.escapeHtml(ind.id) + '">登记新菌群</button></div>'
      : '';
    var manualBtn = (!ind.pendingConfirm && (store.normalizeDataStatus(ind.dataStatus) === 'MISSING_COLUMN' || store.normalizeDataStatus(ind.dataStatus) === 'EMPTY'))
      ? '<button class="ml-2 text-green-600 manual-fill-btn" data-id="' + C.escapeHtml(ind.id) + '" data-key="' + C.escapeHtml(ind.key) + '">人工补录</button>'
      : '';
    var rangeBtn = !ind.effectiveRange
      ? '<button class="ml-2 text-indigo-600 set-range-btn" data-id="' + C.escapeHtml(ind.id) + '">确定有效范围</button>'
      : '';
    return '<div class="border rounded-lg p-3 bg-white">' +
      '<div class="flex justify-between gap-3"><div><div class="font-medium text-gray-900">' + C.escapeHtml(ind.key) + '</div>' +
      '<div class="text-xs text-gray-500">' + C.escapeHtml(C.DATA_STATUS_LABELS[store.normalizeDataStatus(ind.dataStatus)] || ind.dataStatus) + ' · ' + original + ' · ' + source + '</div></div>' +
      '<div class="text-right"><div class="text-sm font-semibold">' + C.escapeHtml(formatIndicatorValue(ind)) + '</div>' +
      '<div class="text-xs ' + statusClass + '">' + C.escapeHtml(evalResult.label || evalResult.message) + '</div></div></div>' +
      '<div class="text-xs text-gray-600 mt-2">有效参考范围：' + C.escapeHtml(formatRangeSource(ind, species)) + rangeBtn + manualBtn + '</div>' +
      pending + '</div>';
  }

  function openCompletionModal(reportId) {
    currentCompletionReportId = reportId;
    var report = listReports().find(function (r) { return r.id === reportId; });
    if (!report) return;
    completionSubtitle.textContent = report.reportNumber + ' · ' + report.petInfo.name + ' · 物种 ' + svc.speciesLabel(report.species);
    completionBody.innerHTML = '<div class="space-y-3">' + report.indicators.map(function (ind) {
      return renderIndicatorRow(ind, report.species, reportId);
    }).join('') + '</div>';
    completionModal.classList.remove('hidden');
  }

  function closeCompletion() {
    completionModal.classList.add('hidden');
    currentCompletionReportId = null;
    renderTable();
  }

  function showMainView() {
    mainView.classList.remove('hidden');
    formView.classList.add('hidden');
    importView.classList.add('hidden');
    renderTable();
  }

  function showImportView() {
    mainView.classList.add('hidden');
    formView.classList.add('hidden');
    importView.classList.remove('hidden');
    importFile.value = '';
    fileSelected.classList.add('hidden');
    fileDropZone.classList.remove('hidden');
    importPreview.classList.add('hidden');
    startImportButton.disabled = true;
  }

  function showReportDetailModal(report) {
    currentReportData = report;
    document.getElementById('report-detail-header').innerHTML =
      '<span><strong>报告编号：</strong>' + C.escapeHtml(report.reportNumber) + '</span> · <span><strong>物种：</strong>' + svc.speciesLabel(report.species) + '</span>';
    switchDetailTab('overview', report);
    reportDetailModal.classList.remove('hidden');
  }

  function closeReportDetailModal() {
    reportDetailModal.classList.add('hidden');
    currentReportData = null;
  }

  function switchDetailTab(tabName, report) {
    detailTabs.querySelectorAll('.tab-button').forEach(function (btn) {
      btn.classList.toggle('text-blue-600', btn.dataset.tab === tabName);
      btn.classList.toggle('border-b-2', btn.dataset.tab === tabName);
      btn.classList.toggle('border-blue-600', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.add('hidden'); });
    var tab = document.getElementById('tab-' + tabName);
    if (tab) tab.classList.remove('hidden');

    if (tabName === 'overview') {
      overviewBasicInfo.innerHTML =
        '<div><strong>宠物：</strong>' + C.escapeHtml(report.petInfo.name) + ' / ' + C.escapeHtml(report.petInfo.breed) + '</div>' +
        '<div><strong>主人：</strong>' + C.escapeHtml(report.ownerInfo.name) + ' ' + C.escapeHtml(report.ownerInfo.phone) + '</div>' +
        '<div><strong>检测日期：</strong>' + C.escapeHtml(report.testInfo.testDate) + '</div>';
      overviewHealthAssessment.innerHTML =
        '<div><strong>工作流：</strong>' + statusDisplay(report.workflowStatus).text + '</div>' +
        '<div><strong>等级/分数：</strong>' + (report.healthAssessment.level || '—') + ' / ' + (report.healthAssessment.score != null ? report.healthAssessment.score : '—') + '</div>';
      overviewKeyMetrics.innerHTML = report.indicators.slice(0, 6).map(function (ind) {
        var ev = svc.evaluateIndicatorResult(ind, report.species);
        return '<div class="bg-white rounded p-3 border"><div class="text-xs text-gray-500">' + C.escapeHtml(ind.key) + '</div><div class="font-semibold">' + C.escapeHtml(formatIndicatorValue(ind)) + '</div><div class="text-xs">' + C.escapeHtml(ev.label || ev.message) + '</div></div>';
      }).join('');
    }
    if (tabName === 'phylum' || tabName === 'genus') {
      var level = tabName === 'phylum' ? 'phylum' : 'genus';
      var taxa = svc.getMicrobiotaTaxa().filter(function (t) { return t.level === level; }).map(function (t) { return t.key; });
      var items = report.indicators.filter(function (ind) { return taxa.indexOf(ind.key) >= 0; });
      var container = document.getElementById('tab-' + tabName);
      container.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' + (items.length ? items.map(function (ind) {
        return renderIndicatorRow(ind, report.species, report.id);
      }).join('') : '<p class="text-gray-500">无对应指标</p>') + '</div>';
    }
    if (tabName === 'analysis') {
      var state = getState();
      var findings = (state.findings || []).filter(function (f) { return f.reportId === report.id; });
      matchedRules.innerHTML = findings.length ? findings.map(function (f) {
        return '<div class="bg-white rounded p-3 border text-sm"><strong>' + C.escapeHtml(f.indicatorKey) + '</strong> · ' + C.escapeHtml(f.conclusion) + '<div class="text-gray-600 mt-1">' + C.escapeHtml(f.professional) + '</div></div>';
      }).join('') : '<p class="text-gray-500">暂无规则命中</p>';
      analysisContent.innerHTML = findings.map(function (f) { return '<p class="text-sm text-gray-700">' + C.escapeHtml(f.consumer) + '</p>'; }).join('') || '<p class="text-gray-500">—</p>';
      suggestionContent.innerHTML = '<p class="text-sm text-gray-500">商品推荐与规则组合不在本票范围</p>';
    }
  }

  tableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var id = btn.dataset.id;
    var report = listReports().find(function (r) { return r.id === id; });
    if (btn.classList.contains('view-report') && report) showReportDetailModal(report);
    if (btn.classList.contains('complete-report')) openCompletionModal(id);
  });

  completionBody.addEventListener('click', function (e) {
    var report = listReports().find(function (r) { return r.id === currentCompletionReportId; });
    if (!report) return;
    var linkBtn = e.target.closest('.confirm-link-btn');
    if (linkBtn) {
      svc.confirmPendingIndicator({ indicatorId: linkBtn.dataset.id, linkExistingKey: 'Peptacetobacter' });
      C.toast('已关联正式菌群项', 'success');
      openCompletionModal(currentCompletionReportId);
      return;
    }
    var createBtn = e.target.closest('.confirm-create-btn');
    if (createBtn) {
      svc.confirmPendingIndicator({
        indicatorId: createBtn.dataset.id,
        createNew: true,
        newKey: 'Novibacillus',
        newLabel: 'Novibacillus',
        newLevel: 'genus',
        newParentKey: '厚壁菌门'
      });
      C.toast('已登记新菌群并关联', 'success');
      openCompletionModal(currentCompletionReportId);
      return;
    }
    var rangeBtn = e.target.closest('.set-range-btn');
    if (rangeBtn) {
      var ind = report.indicators.find(function (i) { return i.id === rangeBtn.dataset.id; });
      var resolved = svc.resolveEffectiveRangeForIndicator(ind, report.species, { respectFrozen: false });
      if (resolved) {
        svc.setIndicatorManualRange(rangeBtn.dataset.id, {
          min: resolved.min,
          max: resolved.max,
          unit: resolved.unit
        }, report.raw.workingVersion || report.raw.currentVersion);
        C.toast('已按 ' + resolved.source + ' 优先级确定有效范围', 'success');
      } else {
        C.promptDialog('人工填写有效范围', '格式：最小值,最大值,单位', function (text) {
          var parts = text.split(',');
          svc.setIndicatorManualRange(rangeBtn.dataset.id, {
            min: parseFloat(parts[0]),
            max: parseFloat(parts[1]),
            unit: (parts[2] || '%').trim()
          }, report.raw.workingVersion || report.raw.currentVersion);
          C.toast('已保存人工有效范围', 'success');
          openCompletionModal(currentCompletionReportId);
        });
        return;
      }
      openCompletionModal(currentCompletionReportId);
      return;
    }
    var manualBtn = e.target.closest('.manual-fill-btn');
    if (manualBtn) {
      C.promptDialog('人工补录有效结果', '输入数值', function (text) {
        var value = parseFloat(text);
        if (isNaN(value)) {
          C.toast('请输入有效数值', 'warning');
          return;
        }
        store.correctIndicator({
          indicatorId: manualBtn.dataset.id,
          value: value,
          dataStatus: 'PRESENT',
          correctionNote: '人工补录有效结果，保留原始缺失状态'
        });
        C.toast('已补录，原始事实未覆盖', 'success');
        openCompletionModal(currentCompletionReportId);
      });
    }
  });

  freezeRangesBtn.addEventListener('click', function () {
    if (!currentCompletionReportId) return;
    svc.freezeReportEffectiveRanges(currentCompletionReportId);
    C.toast('有效参考范围已随当前工作版本冻结', 'success');
    openCompletionModal(currentCompletionReportId);
  });
  closeCompletionModal.addEventListener('click', closeCompletion);
  closeCompletionBtn.addEventListener('click', closeCompletion);
  closeDetailModal.addEventListener('click', closeReportDetailModal);
  closeDetailBtn.addEventListener('click', closeReportDetailModal);
  detailTabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.tab-button');
    if (btn && currentReportData) switchDetailTab(btn.dataset.tab, currentReportData);
  });

  batchImportButton.addEventListener('click', showImportView);
  backToListButton.addEventListener('click', showMainView);
  backToListFromImportButton.addEventListener('click', showMainView);
  cancelImportButton.addEventListener('click', showMainView);
  if (addNewReportButton) addNewReportButton.classList.add('hidden');

  fileDropZone.addEventListener('click', function () { importFile.click(); });
  removeFileButton.addEventListener('click', function () {
    importFile.value = '';
    fileSelected.classList.add('hidden');
    fileDropZone.classList.remove('hidden');
    importPreview.classList.add('hidden');
    startImportButton.disabled = true;
  });
  importFile.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    selectedFileName.textContent = file.name;
    fileSelected.classList.remove('hidden');
    fileDropZone.classList.add('hidden');
    importPreview.classList.remove('hidden');
    document.getElementById('preview-summary').textContent = '演示模式：将调用共享 Store 批量导入（成功/重复/局部异常/失败）';
    document.getElementById('preview-header').innerHTML = '<tr><th class="px-2 py-1 text-left">场景</th><th class="px-2 py-1 text-left">说明</th></tr>';
    document.getElementById('preview-body').innerHTML =
      '<tr><td class="px-2 py-1">success</td><td class="px-2 py-1">完整导入</td></tr>' +
      '<tr><td class="px-2 py-1">duplicate</td><td class="px-2 py-1">重复检测文件拦截</td></tr>' +
      '<tr><td class="px-2 py-1">partial</td><td class="px-2 py-1">局部异常保留已解析项</td></tr>' +
      '<tr><td class="px-2 py-1">failure</td><td class="px-2 py-1">关键导入异常</td></tr>';
    startImportButton.disabled = false;
  });
  startImportButton.addEventListener('click', function () {
    var result = store.simulateBatchImport({
      files: [
        { scenario: 'success', fileName: 'demo-success.xlsx', externalReportNumber: 'EXT-PRM-SUCCESS', sampleNumber: 'SAMPLE-PRM-SUCCESS' },
        { scenario: 'duplicate', fileName: 'demo-dup.xlsx', sourceOrgId: store.DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-001' },
        { scenario: 'partial', fileName: 'demo-partial.xlsx', externalReportNumber: 'EXT-PRM-PARTIAL', sampleNumber: 'SAMPLE-PRM-PARTIAL', petId: 'pet-003', userId: 'user-002' },
        { scenario: 'failure', fileName: 'demo-fail.xlsx', externalReportNumber: 'EXT-PRM-FAIL', sampleNumber: 'SAMPLE-PRM-FAIL' }
      ]
    });
    C.toast('批量导入完成：' + result.fileResults.map(function (r) { return r.status; }).join(' / '), 'success');
    showMainView();
  });
  document.getElementById('download-template').addEventListener('click', function (e) {
    e.preventDefault();
    C.toast('请使用 Excel 导入页面上传已知模板文件', 'info');
  });

  searchInput.addEventListener('input', renderTable);
  filterHealthLevel.addEventListener('change', renderTable);
  filterStatus.addEventListener('change', renderTable);

  if (C.subscribeDemo) {
    window.__petAdminPageTeardown = C.subscribeDemo(function () {
      renderTable();
      if (currentCompletionReportId) openCompletionModal(currentCompletionReportId);
      if (currentReportData) {
        var refreshed = listReports().find(function (r) { return r.id === currentReportData.id; });
        if (refreshed) {
          currentReportData = refreshed;
          switchDetailTab('overview', refreshed);
        }
      }
    });
  }

  var route = C.parseRoute();
  showMainView();
  if (route.params && route.params.reportId) {
    var target = listReports().find(function (r) { return r.id === route.params.reportId; });
    if (target && needsCompletion(target)) openCompletionModal(target.id);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPetReportManagement);
} else {
  initPetReportManagement();
}
