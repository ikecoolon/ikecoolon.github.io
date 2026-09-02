function initReportReview() {
  var C = window.PetAdminCommon;
  var HEALTH_LEVEL_THEMES = { A: '雨林', B: '森林', C: '草原', D: '苔藓', E: '沙漠' };
  var store = C.store();
  var route = C.parseRoute();
  var currentReportId = route.params.reportId || 'report-002';
  var formInteracting = false;
  var lastChecks = { blockers: [], warnings: [] };
  var activeModule = 'source';
  var selectedResultId = null;
  var resultsSearch = '';
  var resultsFilters = { abnormal: false, missing: false, modified: false };
  var previewTab = 'overview';
  var previewCollapsed = false;
  var versionView = 'working';
  var pickerState = { phylumKey: null, slot: 'primary', page: 1 };
  var expandedHits = {};
  var lastRenderedReportId = null;

  var RETURN_VIEWS = ['all', 'unassigned', 'incomplete', 'pending_review', 'published', 'voided'];
  var MISSING_STATUSES = ['MISSING_COLUMN', 'EMPTY', 'INVALID', 'NOT_APPLICABLE'];
  var HIT_STATUS_LABELS = {
    primary: '主命中',
    superseded_by_conflict: '被冲突替代',
    excluded: '已排除'
  };
  var CORRECTION_STAGE_LABELS = {
    incomplete: '更正中·待完善',
    pending_review: '更正中·待审核'
  };

  var MODULES = [
    { id: 'source', label: '来源与归属', icon: 'fa-link' },
    { id: 'results', label: '检测结果', icon: 'fa-vial' },
    { id: 'assessment', label: '综合评定', icon: 'fa-sliders' },
    { id: 'analysis', label: '分析与建议', icon: 'fa-microscope' },
    { id: 'recommendations', label: '商品推荐', icon: 'fa-box-open' },
    { id: 'checks', label: '发布检查', icon: 'fa-clipboard-check' },
    { id: 'versions', label: '版本与记录', icon: 'fa-clock-rotate-left' }
  ];
  var VALID_MODULE_IDS = MODULES.map(function (m) { return m.id; });

  function isValidReviewModule(id) {
    return VALID_MODULE_IDS.indexOf(id) >= 0;
  }

  function requestedModuleFromRoute() {
    var params = (C.parseRoute().params || {});
    return isValidReviewModule(params.module) ? params.module : null;
  }

  var CHECK_MODULE_MAP = {
    archive: 'source',
    traceability: 'source',
    ownership: 'source',
    results: 'results',
    data_quality: 'results',
    range: 'results',
    assessment: 'assessment',
    analysis: 'analysis',
    recommendation: 'recommendations',
    mock_module: 'checks',
    todo: 'checks',
    system: 'checks',
    blocker: 'checks',
    warning: 'checks'
  };

  var resizing = false;
  var resizer = null;

  function onResizeMove(e) {
    if (!resizing) return;
    var workbench = document.getElementById('rw-workbench');
    var rect = workbench.getBoundingClientRect();
    var previewWidth = Math.min(520, Math.max(280, rect.right - e.clientX));
    workbench.style.setProperty('--rw-preview-width', previewWidth + 'px');
  }

  function onResizeEnd() {
    if (!resizing) return;
    resizing = false;
    if (resizer) resizer.classList.remove('is-dragging');
  }

  var unsub = C.subscribeDemo(function () {
    if (!formInteracting) render(store.getState());
    else partialUpdate(store.getState());
  });
  window.__petAdminPageTeardown = function () {
    if (typeof unsub === 'function') {
      unsub();
      unsub = null;
    }
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    resizing = false;
    if (resizer) resizer.classList.remove('is-dragging');
  };

  bindStaticEvents();
  render(store.getState());

  function actorLabel() {
    return '审核员';
  }

  function labNoticeLabels() {
    return store.LAB_NOTICE_LABELS || { high: '实验室标注偏高', low: '实验室标注偏低', unmarked: '未标注' };
  }

  function rangeSourceLabels() {
    return store.RANGE_SOURCE_LABELS || { imported: '报告导入', platform: '平台配置', none: '无范围' };
  }

  function rangeStatusLabels() {
    return store.RANGE_STATUS_LABELS || {};
  }

  function unitConfirmLabels() {
    return store.UNIT_CONFIRM_LABELS || { unconfirmed: '未确认', confirmed: '已确认', invalidated: '依据变化失效' };
  }

  function riskLabels() {
    return store.RISK_LEVEL_LABELS || { low: '低', medium: '中', high: '高', notice: '仅提示' };
  }

  function versionStatusLabels() {
    return store.VERSION_STATUS_LABELS || {
      draft: '草稿', pending_review: '待审核', published: '已发布', superseded: '已替代'
    };
  }

  function productStatusLabels() {
    return store.PRODUCT_STATUS_LABELS || {
      on_sale: '在售', off_shelf: '已下架', zero_stock: '零库存', recycled: '已回收'
    };
  }

  function taxonLabel(state, key) {
    var taxa = (state.professionalCatalog && state.professionalCatalog.microbiotaTaxa) || [];
    var item = taxa.find(function (t) { return t.key === key; });
    if (item && item.label) return item.label;
    var indicators = (state.professionalCatalog && state.professionalCatalog.testIndicators) || [];
    var ind = indicators.find(function (t) { return t.key === key; });
    return (ind && ind.label) || key;
  }

  function correctionStage(report) {
    if (!report || !store.getCorrectionDraftStage) return null;
    return store.getCorrectionDraftStage(report);
  }

  function isEditable(report) {
    if (!report || report.status === 'voided') return false;
    if (report.status === 'published' && !report.correctionDraftActive) return false;
    return true;
  }

  function isPendingReviewLike(report) {
    if (!report) return false;
    if (report.status === 'pending_review') return true;
    return report.status === 'published' && correctionStage(report) === 'pending_review';
  }

  function canSubmit(report) {
    if (!report) return false;
    if (report.status === 'incomplete') return true;
    return report.status === 'published' && report.correctionDraftActive && correctionStage(report) === 'incomplete';
  }

  function canSaveDraft(report) {
    return !!report && isEditable(report);
  }

  function returnToReportCenter() {
    var current = C.parseRoute();
    var view = current.params.returnView;
    if (view && view !== 'pending' && RETURN_VIEWS.indexOf(view) >= 0) {
      C.navigate('report-center', { view: view });
    } else {
      C.navigate('report-center');
    }
  }

  function reviewNavParams(reportId) {
    var current = C.parseRoute();
    var params = { reportId: reportId };
    if (current.params.returnView) params.returnView = current.params.returnView;
    var moduleId = isValidReviewModule(activeModule)
      ? activeModule
      : (isValidReviewModule(current.params.module) ? current.params.module : null);
    if (moduleId) params.module = moduleId;
    return params;
  }

  function afterWrite(message, type) {
    formInteracting = false;
    if (message) C.toast(message, type || 'success');
    render(store.getState());
  }

  function handleStoreError(err) {
    C.toast((err && err.message) || '操作失败', 'error');
  }

  function bindStaticEvents() {
    document.getElementById('btn-go-report-center').addEventListener('click', returnToReportCenter);

    document.getElementById('select-report').addEventListener('change', function () {
      formInteracting = false;
      currentReportId = this.value;
      selectedResultId = null;
      expandedHits = {};
      versionView = 'working';
      C.navigate('report-review', reviewNavParams(currentReportId));
      var state = store.getState();
      activeModule = defaultModuleForReport(C.lookupReport(state, currentReportId));
      render(state);
    });

    document.getElementById('results-search').addEventListener('input', function () {
      resultsSearch = this.value.trim().toLowerCase();
      renderIndicatorsPanel(store.getState());
    });

    document.getElementById('results-filters').addEventListener('click', function (e) {
      var btn = e.target.closest('.rw-filter-btn');
      if (!btn) return;
      var key = btn.getAttribute('data-filter');
      resultsFilters[key] = !resultsFilters[key];
      btn.classList.toggle('active', resultsFilters[key]);
      renderIndicatorsPanel(store.getState());
    });

    document.getElementById('btn-supplement-result').addEventListener('click', function () {
      openSupplementModal(store.getState());
    });

    document.getElementById('rw-module-nav').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-module-id]');
      if (!btn) return;
      switchModule(btn.getAttribute('data-module-id'));
    });

    document.getElementById('ver-toggle-working').addEventListener('click', function () {
      versionView = 'working';
      document.getElementById('ver-toggle-working').classList.add('active');
      document.getElementById('ver-toggle-published').classList.remove('active');
      renderVersionsPanel(store.getState());
      updatePreview(store.getState());
    });
    document.getElementById('ver-toggle-published').addEventListener('click', function () {
      versionView = 'published';
      document.getElementById('ver-toggle-published').classList.add('active');
      document.getElementById('ver-toggle-working').classList.remove('active');
      renderVersionsPanel(store.getState());
      updatePreview(store.getState());
    });

    document.querySelectorAll('.rw-preview-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        previewTab = tab.getAttribute('data-preview-tab');
        document.querySelectorAll('.rw-preview-tab').forEach(function (t) {
          t.classList.toggle('active', t.getAttribute('data-preview-tab') === previewTab);
        });
        updatePreview(store.getState());
      });
    });

    document.getElementById('btn-preview-collapse').addEventListener('click', function () {
      previewCollapsed = true;
      document.getElementById('rw-preview-pane').classList.add('is-collapsed');
      document.getElementById('rw-preview-resizer').classList.add('hidden');
      document.getElementById('btn-preview-expand').classList.remove('hidden');
      document.getElementById('rw-workbench').classList.add('preview-collapsed');
    });

    document.getElementById('btn-preview-expand').addEventListener('click', function () {
      previewCollapsed = false;
      document.getElementById('rw-preview-pane').classList.remove('is-collapsed');
      document.getElementById('rw-preview-resizer').classList.remove('hidden');
      document.getElementById('btn-preview-expand').classList.add('hidden');
      document.getElementById('rw-workbench').classList.remove('preview-collapsed');
    });

    document.getElementById('btn-preview-drawer-open').addEventListener('click', function () {
      document.getElementById('rw-preview-pane').classList.add('is-drawer-open');
    });
    document.getElementById('btn-preview-drawer-close').addEventListener('click', function () {
      document.getElementById('rw-preview-pane').classList.remove('is-drawer-open');
    });

    resizer = document.getElementById('rw-preview-resizer');
    resizer.addEventListener('mousedown', function (e) {
      resizing = true;
      resizer.classList.add('is-dragging');
      e.preventDefault();
    });
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);

    document.getElementById('picker-close').addEventListener('click', closeProductPicker);
    document.getElementById('product-picker-modal').addEventListener('click', function (e) {
      if (e.target.id === 'product-picker-modal') closeProductPicker();
    });
    document.getElementById('picker-search').addEventListener('input', function () {
      pickerState.page = 1;
      renderProductPickerList(store.getState());
    });
    document.getElementById('picker-category').addEventListener('change', function () {
      pickerState.page = 1;
      renderProductPickerList(store.getState());
    });
    document.getElementById('picker-status').addEventListener('change', function () {
      pickerState.page = 1;
      renderProductPickerList(store.getState());
    });
    document.getElementById('picker-pagination').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-page]');
      if (!btn) return;
      pickerState.page = parseInt(btn.getAttribute('data-page'), 10);
      renderProductPickerList(store.getState());
    });

    document.getElementById('rw-preview-frame').addEventListener('click', function (e) {
      var region = e.target.closest('[data-preview-focus]');
      if (!region) return;
      var focusId = region.getAttribute('data-preview-focus');
      var module = region.getAttribute('data-preview-module') || 'assessment';
      switchModule(module);
      setTimeout(function () {
        var el = document.getElementById(focusId);
        if (el) el.focus();
      }, 50);
    });

    document.getElementById('recommendations-panel').addEventListener('click', handleRecommendationsClick);
    document.getElementById('analysis-panel').addEventListener('click', handleAnalysisClick);
    document.getElementById('analysis-panel').addEventListener('focusin', function () {
      formInteracting = true;
    });
    document.getElementById('source-panel').addEventListener('click', handleSourceClick);
    document.getElementById('source-panel').addEventListener('change', handleSourceChange);
    document.getElementById('indicators-list').addEventListener('click', function (e) {
      var row = e.target.closest('[data-result-id]');
      if (!row) return;
      selectedResultId = row.getAttribute('data-result-id');
      renderIndicatorsPanel(store.getState());
    });
    document.getElementById('indicator-detail').addEventListener('click', handleResultDetailClick);

    document.getElementById('supplement-close').addEventListener('click', closeSupplementModal);
    document.getElementById('supplement-cancel').addEventListener('click', closeSupplementModal);
    document.getElementById('supplement-modal').addEventListener('click', function (e) {
      if (e.target.id === 'supplement-modal') closeSupplementModal();
    });
    document.getElementById('supplement-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submitSupplement();
    });
  }

  function defaultModuleForReport(report) {
    var fromRoute = requestedModuleFromRoute();
    if (fromRoute) return fromRoute;
    if (!report) return 'source';
    var stage = correctionStage(report);
    if (report.status === 'unassigned' || report.status === 'incomplete') return 'source';
    if (report.status === 'pending_review' || stage === 'pending_review') return 'checks';
    if (report.status === 'published' && report.correctionDraftActive) return 'results';
    if (report.status === 'published' || report.status === 'voided') return 'versions';
    return 'assessment';
  }

  function switchModule(moduleId) {
    activeModule = moduleId;
    MODULES.forEach(function (m) {
      var panel = document.getElementById('module-' + m.id);
      if (panel) panel.classList.toggle('hidden', m.id !== moduleId);
    });
    document.querySelectorAll('#rw-module-nav [data-module-id]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-module-id') === moduleId);
    });
  }

  function moduleCounts(checks) {
    var counts = {};
    MODULES.forEach(function (m) { counts[m.id] = { blockers: 0, warnings: 0 }; });
    function add(item, type) {
      var mod = CHECK_MODULE_MAP[item.category] || 'checks';
      if (!counts[mod]) mod = 'checks';
      counts[mod][type]++;
    }
    (checks.blockers || []).forEach(function (b) { add(b, 'blockers'); });
    (checks.warnings || []).forEach(function (w) { add(w, 'warnings'); });
    return counts;
  }

  function collectAssessmentFromForm() {
    var el = function (id) { return document.getElementById(id); };
    var emotion = el('assess-emotion') ? el('assess-emotion').value : '';
    var immunity = el('assess-immunity') ? el('assess-immunity').value : '';
    return {
      reportSpecies: el('assess-species') ? el('assess-species').value : '',
      healthLevel: el('assess-level') ? el('assess-level').value : '',
      healthScore: el('assess-score') ? el('assess-score').value : '',
      percentile: el('assess-percentile') ? el('assess-percentile').value : '',
      summary: el('assess-summary') ? el('assess-summary').value : '',
      platformDimensions: {
        emotion: emotion === '' ? null : Number(emotion),
        immunity: immunity === '' ? null : Number(immunity)
      }
    };
  }

  function saveAssessmentFromForm(silent) {
    if (!currentReportId) return false;
    var report = C.lookupReport(store.getState(), currentReportId);
    if (!report || !isEditable(report)) return true;
    if (!document.getElementById('assess-species')) return true;
    var data = collectAssessmentFromForm();
    var errors = C.validateAssessmentInput(data);
    if (errors.length) {
      if (!silent) C.toast(errors.join('；'), 'warning');
      return false;
    }
    try {
      store.saveReportAssessment(currentReportId, {
        reportSpecies: data.reportSpecies,
        healthLevel: data.healthLevel || null,
        healthScore: data.healthScore === '' ? null : Number(data.healthScore),
        percentile: data.percentile === '' ? null : Number(data.percentile),
        summary: data.summary,
        platformDimensions: data.platformDimensions
      }, actorLabel());
      return true;
    } catch (err) {
      if (!silent) handleStoreError(err);
      return false;
    }
  }

  function saveAllPhylumDraftsFromDom(silent) {
    if (!currentReportId) return true;
    var report = C.lookupReport(store.getState(), currentReportId);
    if (!report || !isEditable(report)) return true;
    var units = store.getPhylumUnits(currentReportId) || [];
    var ok = true;
    units.forEach(function (unit) {
      var analysisEl = document.getElementById('unit-analysis-' + unit.phylumKey);
      var adviceEl = document.getElementById('unit-advice-' + unit.phylumKey);
      if (!analysisEl || !adviceEl) return;
      var analysis = analysisEl.value;
      var advice = adviceEl.value;
      if (analysis === (unit.analysisDraft || '') && advice === (unit.adviceDraft || '')) return;
      try {
        store.savePhylumUnitDraft(currentReportId, unit.phylumKey, { analysis: analysis, advice: advice });
      } catch (err) {
        ok = false;
        if (!silent) handleStoreError(err);
      }
    });
    return ok;
  }

  function persistWorkbench(silent) {
    formInteracting = true;
    var okB = saveAllPhylumDraftsFromDom(silent);
    var okA = saveAssessmentFromForm(silent);
    return okA && okB;
  }

  function saveDraft() {
    var report = C.lookupReport(store.getState(), currentReportId);
    if (!canSaveDraft(report)) return;
    var ok = persistWorkbench(true);
    if (!ok) {
      formInteracting = false;
      C.toast('综合评定校验未通过', 'warning');
      return;
    }
    afterWrite('已暂存', 'success');
  }

  function runWithChecks(actionLabel, callback) {
    if (!persistWorkbench(true)) {
      formInteracting = false;
      C.toast('综合评定校验未通过', 'warning');
      return;
    }
    var checks = C.buildPublicationChecks(store.getState(), currentReportId);
    lastChecks = checks;
    if (checks.blockers.length) {
      formInteracting = false;
      C.toast('存在阻断项，无法' + actionLabel, 'error');
      activeModule = 'checks';
      render(store.getState());
      return;
    }
    if (checks.warnings.length) {
      formInteracting = false;
      var warnText = '仍有 ' + checks.warnings.length + ' 项警告，确认继续' + actionLabel + '？\n' +
        checks.warnings.slice(0, 5).map(function (w) { return '· ' + w.message; }).join('\n') +
        (checks.warnings.length > 5 ? '\n…等' + checks.warnings.length + ' 项' : '');
      C.confirmDialog(warnText, callback);
      return;
    }
    callback();
  }

  function bindActionBar(state, report) {
    var bar = document.getElementById('action-bar');
    bar.innerHTML = '';
    if (!report) return;

    function addBtn(id, label, cls, icon, handler) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = id;
      btn.className = (cls || 'btn-secondary') + ' px-3 py-1.5 rounded-md text-sm';
      btn.innerHTML = '<i class="fas ' + icon + ' mr-1"></i>' + label;
      btn.onclick = handler;
      bar.appendChild(btn);
    }

    if (canSaveDraft(report)) {
      addBtn('btn-save-draft', '暂存', 'btn-secondary', 'fa-floppy-disk', saveDraft);
    }

    if (canSubmit(report)) {
      addBtn('btn-submit', '提交审核', 'btn-primary', 'fa-paper-plane', function () {
        runWithChecks('提交审核', function () {
          try {
            store.submitReport(report.id, { actor: actorLabel() });
            activeModule = 'checks';
            afterWrite('已提交审核', 'success');
          } catch (err) {
            handleStoreError(err);
            switchModule('checks');
            render(store.getState());
          }
        });
      });
    }

    if (isPendingReviewLike(report)) {
      addBtn('btn-withdraw', '撤回', 'border border-slate-300 text-slate-700 hover:bg-slate-50', 'fa-arrow-rotate-left', function () {
        C.confirmDialog('确认撤回？送检状态不会改变。', function () {
          try {
            store.withdrawReport(report.id, { actor: actorLabel() });
            activeModule = 'source';
            afterWrite('已撤回', 'info');
          } catch (err) {
            handleStoreError(err);
          }
        });
      });
      addBtn('btn-reject', '退回完善', 'border border-red-300 text-red-700 hover:bg-red-50', 'fa-undo', function () {
        C.promptDialog('退回原因', '请填写退回原因（必填）', function (reason) {
          try {
            store.rejectReport(report.id, reason, { actor: actorLabel() });
            afterWrite('已退回待完善', 'warning');
          } catch (err) {
            handleStoreError(err);
          }
        });
      });
      addBtn('btn-approve-publish', '审核通过并发布', 'btn-primary', 'fa-check-double', function () {
        runWithChecks('审核通过并发布', function () {
          try {
            store.publishReport(report.id, { actor: actorLabel() });
            activeModule = 'versions';
            afterWrite('报告已审核通过并发布', 'success');
          } catch (err) {
            handleStoreError(err);
            switchModule('checks');
            render(store.getState());
          }
        });
      });
    }

    if (report.status !== 'voided') {
      addBtn('btn-void', '作废', 'border border-slate-300 text-slate-600 hover:bg-slate-50', 'fa-ban', function () {
        C.promptDialog('作废原因', '请填写作废原因（必填）', function (reason) {
          try {
            store.voidReport(report.id, reason);
            afterWrite('报告已作废', 'warning');
          } catch (err) {
            handleStoreError(err);
          }
        });
      });
    }

    if (report.status === 'published' && !report.correctionDraftActive) {
      addBtn('btn-correction', '创建更正草稿', 'btn-primary', 'fa-pen-ruler', function () {
        C.promptDialog('更正说明', '请填写更正说明', function (note) {
          try {
            store.createCorrectionDraft(report.id, { correctionNote: note });
            versionView = 'working';
            activeModule = 'results';
            afterWrite('已创建更正草稿', 'success');
          } catch (err) {
            handleStoreError(err);
          }
        });
      });
    }
  }

  function resultFilterMatch(ind) {
    var status = store.normalizeDataStatus ? store.normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
    var isMissing = MISSING_STATUSES.indexOf(status) >= 0;
    var src = ind.sourceValue;
    var eff = ind.effectiveValue;
    var isModified = !!(ind.modifiedReason || ind.valueSource === 'manual' ||
      (src != null && eff != null && Number(src) !== Number(eff)));
    var isAbnormal = ind.rangeStatus === 'high' || ind.rangeStatus === 'low';
    var anyFilter = resultsFilters.abnormal || resultsFilters.missing || resultsFilters.modified;
    if (!anyFilter) return true;
    return (resultsFilters.abnormal && isAbnormal) ||
      (resultsFilters.missing && isMissing) ||
      (resultsFilters.modified && isModified);
  }

  function valuesDiffer(a, b) {
    if (a == null && b == null) return false;
    if (a == null || b == null) return true;
    return Number(a) !== Number(b) && String(a) !== String(b);
  }

  function formatNum(v) {
    if (v == null || v === '') return '—';
    return String(v);
  }

  function formatRange(ind) {
    if (!ind.range) return '—';
    return ind.range.min + '–' + ind.range.max + (ind.range.unit || ind.unit || '');
  }

  function findProduct(state, id) {
    return (state.products || []).find(function (p) { return p.id === id; });
  }

  function unitProductDisabled(unit) {
    return unit.riskLevel === 'notice' || !String(unit.adviceDraft || '').trim();
  }

  function renderModuleNav(checks) {
    var nav = document.getElementById('rw-module-nav');
    var counts = moduleCounts(checks || lastChecks);
    nav.innerHTML = MODULES.map(function (m) {
      var c = counts[m.id] || { blockers: 0, warnings: 0 };
      var badges = '';
      if (c.blockers) badges += '<span class="rw-nav-badge rw-nav-badge-blocker" title="阻断">' + c.blockers + '</span>';
      if (c.warnings) badges += '<span class="rw-nav-badge rw-nav-badge-warning" title="警告">' + c.warnings + '</span>';
      return '<button type="button" class="rw-module-nav-btn' + (activeModule === m.id ? ' is-active' : '') + '" data-module-id="' + m.id + '">' +
        '<i class="fas ' + m.icon + ' rw-module-icon"></i>' +
        '<span class="rw-module-label">' + m.label + '</span>' +
        (badges ? '<span class="rw-nav-badges">' + badges + '</span>' : '') +
        '</button>';
    }).join('');
  }

  function renderChecksPanel(checks) {
    var panel = document.getElementById('checks-panel');
    var summary = document.getElementById('checks-summary');
    if (!panel) return;
    var html = '';
    if (!checks.blockers.length && !checks.warnings.length) {
      html = '<p class="text-emerald-700"><i class="fas fa-circle-check mr-1"></i>检查通过，无阻断或警告</p>';
      summary.innerHTML = '<p class="text-emerald-800 font-medium"><i class="fas fa-shield-check mr-1"></i>可发布：全部检查项已通过</p>';
    } else {
      summary.innerHTML = '<p class="font-medium">' +
        (checks.blockers.length ? '<span class="text-red-700">' + checks.blockers.length + ' 项阻断</span>' : '') +
        (checks.blockers.length && checks.warnings.length ? ' · ' : '') +
        (checks.warnings.length ? '<span class="text-amber-700">' + checks.warnings.length + ' 项警告</span>' : '') +
        '</p><p class="text-xs text-slate-500 mt-1">请逐项处理后再提交或发布。</p>';
      if (checks.blockers.length) {
        html += '<div class="mb-2"><p class="text-xs font-medium text-red-700 mb-1">阻断（' + checks.blockers.length + '）</p><ul class="space-y-1">';
        checks.blockers.forEach(function (b) {
          var mod = CHECK_MODULE_MAP[b.category] || 'checks';
          html += '<li class="text-red-800 bg-red-50 rounded px-2 py-1 text-xs cursor-pointer rw-check-item" data-goto-module="' + mod + '">' +
            '<i class="fas fa-ban mr-1"></i>' + C.escapeHtml(b.message) + '</li>';
        });
        html += '</ul></div>';
      }
      if (checks.warnings.length) {
        html += '<div><p class="text-xs font-medium text-amber-700 mb-1">警告（' + checks.warnings.length + '，确认后可继续）</p><ul class="space-y-1">';
        checks.warnings.forEach(function (w) {
          var mod = CHECK_MODULE_MAP[w.category] || 'checks';
          html += '<li class="text-amber-900 bg-amber-50 rounded px-2 py-1 text-xs cursor-pointer rw-check-item" data-goto-module="' + mod + '">' +
            '<i class="fas fa-triangle-exclamation mr-1"></i>' + C.escapeHtml(w.message) + '</li>';
        });
        html += '</ul></div>';
      }
    }
    panel.innerHTML = html;
    panel.querySelectorAll('.rw-check-item').forEach(function (li) {
      li.addEventListener('click', function () {
        switchModule(li.getAttribute('data-goto-module'));
      });
    });
  }

  function templateRecognitionText(state, report, tr, batch) {
    var rec = (batch && batch.templateRecognition) || (tr && tr.templateRecognition) || (report && report.templateRecognition) || null;
    var resultLabel = '—';
    var sheet = '—';
    var templateId = (tr && tr.sourceOrgId) || report.sourceOrgId || '—';
    if (rec) {
      resultLabel = rec.result || rec.status || rec.recognized || resultLabel;
      sheet = rec.sheetName || rec.sheet || sheet;
      templateId = rec.templateId || rec.template || templateId;
    } else if (batch) {
      if (batch.status === 'success') resultLabel = '已识别';
      else if (batch.status === 'failed') resultLabel = '识别失败';
      else if (batch.status) resultLabel = batch.status;
      sheet = batch.sheetName || sheet;
    }
    var results = store.getEffectiveResults(report.id) || [];
    if (results[0] && results[0].sourceTemplateId) templateId = results[0].sourceTemplateId;
    return {
      resultLabel: resultLabel,
      sheet: sheet,
      templateId: templateId
    };
  }

  function renderSourcePanel(state, report) {
    var tr = C.lookupTestRecord(state, report.testRecordId);
    var user = C.lookupUser(state, report.userId);
    var pet = C.lookupPet(state, report.petId);
    var st = tr ? C.lookupStore(state, tr.storeId) : null;
    var batch = tr && tr.importBatchId ? (state.importBatches || []).find(function (b) { return b.id === tr.importBatchId; }) : null;
    var externalReportNumber = (tr && tr.externalReportNumber) || report.externalReportNumber || '—';
    var sampleNumber = (tr && tr.sampleNumber) || report.sampleNumber || '—';
    var testingOrg = '—';
    if (st && st.name) testingOrg = String(st.name).trim();
    else if (report.sourceOrgName || (tr && tr.sourceOrgName)) testingOrg = String(report.sourceOrgName || tr.sourceOrgName).trim();
    else if (report.sourceOrgId || (tr && tr.sourceOrgId)) testingOrg = String(report.sourceOrgId || tr.sourceOrgId);
    var fileName = batch ? (batch.fileName || '—') : '—';
    var uploadedAt = batch ? C.formatDate(batch.uploadedAt || batch.createdAt) : '—';
    var tpl = templateRecognitionText(state, report, tr, batch);
    var speciesWarn = '';
    if (pet && report.reportSpecies && pet.species && pet.species !== report.reportSpecies) {
      speciesWarn = '<div class="rw-mismatch">宠物档案物种（' +
        C.escapeHtml(pet.species === 'dog' ? '狗' : pet.species === 'cat' ? '猫' : pet.species) +
        '）与报告物种（' +
        C.escapeHtml(report.reportSpecies === 'dog' ? '狗' : report.reportSpecies === 'cat' ? '猫' : report.reportSpecies) +
        '）不一致，请确认后不要自动覆盖。</div>';
    }

    var html =
      '<div class="rw-source-grid">' +
      '<p><span class="text-slate-500">报告号</span><br>' + C.escapeHtml(report.reportNumber) + '</p>' +
      '<p><span class="text-slate-500">送检</span><br><code class="text-xs">' + C.escapeHtml(report.testRecordId) + '</code></p>' +
      '<p><span class="text-slate-500">外部报告号</span><br>' + C.escapeHtml(externalReportNumber) + '</p>' +
      '<p><span class="text-slate-500">样本号</span><br>' + C.escapeHtml(sampleNumber) + '</p>' +
      '<p><span class="text-slate-500">机构</span><br>' + C.escapeHtml(testingOrg) + '</p>' +
      '<p><span class="text-slate-500">宠物</span><br>' + C.escapeHtml(pet ? pet.name + ' / ' + (pet.breed || '') : '—') + '</p>' +
      '<p><span class="text-slate-500">用户</span><br>' + C.escapeHtml(user ? user.name : '—') + '</p>' +
      '<p><span class="text-slate-500">归属</span><br>' + C.escapeHtml(C.OWNERSHIP_STATUS_LABELS[report.ownershipStatus] || report.ownershipStatus || '—') + '</p>' +
      '<p><span class="text-slate-500">导入文件</span><br>' + C.escapeHtml(fileName) + '</p>' +
      '<p><span class="text-slate-500">上传时间</span><br>' + C.escapeHtml(uploadedAt) + '</p>' +
      '<p><span class="text-slate-500">模板识别</span><br>' + C.escapeHtml(tpl.resultLabel) +
      ' · sheet ' + C.escapeHtml(tpl.sheet) +
      ' · 模板 ' + C.escapeHtml(tpl.templateId) + '</p>' +
      speciesWarn +
      '</div>';

    if (report.status === 'unassigned' && isEditable(report)) {
      html += '<div class="mt-4 border rounded p-3 bg-slate-50" id="ownership-form">' +
        '<p class="font-medium text-sm mb-2">归属到宠物</p>' +
        '<label class="text-xs text-slate-500">宠物</label>' +
        '<select id="own-pet" class="w-full border rounded px-2 py-1 mt-0.5 mb-2">' +
        '<option value="">请选择宠物</option>' +
        (state.pets || []).map(function (p) {
          var u = C.lookupUser(state, p.userId);
          return '<option value="' + p.id + '">' + C.escapeHtml(p.name + ' · ' + (p.species === 'dog' ? '狗' : '猫') +
            (u ? ' · ' + u.name : ' · 未关联用户')) + '</option>';
        }).join('') + '</select>' +
        '<p id="own-species-hint" class="hidden rw-mismatch mb-2"></p>' +
        '<label class="text-xs text-slate-500">用户（可选）</label>' +
        '<select id="own-user" class="w-full border rounded px-2 py-1 mt-0.5 mb-2">' +
        '<option value="">不指定 / 跟随宠物</option>' +
        (state.users || []).map(function (u) {
          return '<option value="' + u.id + '">' + C.escapeHtml(u.name) + '</option>';
        }).join('') + '</select>' +
        '<button type="button" id="btn-assign-ownership" class="btn-primary px-3 py-1.5 rounded text-sm">绑定归属</button>' +
        '</div>';
    }

    document.getElementById('source-panel').innerHTML = html;
  }

  function handleSourceChange(e) {
    if (e.target.id !== 'own-pet') return;
    var state = store.getState();
    var report = C.lookupReport(state, currentReportId);
    var pet = C.lookupPet(state, e.target.value);
    var hint = document.getElementById('own-species-hint');
    var userSel = document.getElementById('own-user');
    if (userSel && pet && pet.userId) userSel.value = pet.userId;
    if (!hint) return;
    if (pet && report && report.reportSpecies && pet.species !== report.reportSpecies) {
      hint.classList.remove('hidden');
      hint.textContent = '所选宠物物种与报告物种不一致。';
    } else {
      hint.classList.add('hidden');
      hint.textContent = '';
    }
  }

  function handleSourceClick(e) {
    if (!e.target.closest('#btn-assign-ownership')) return;
    var petId = document.getElementById('own-pet') && document.getElementById('own-pet').value;
    var userId = document.getElementById('own-user') && document.getElementById('own-user').value;
    if (!petId) {
      C.toast('请选择宠物', 'warning');
      return;
    }
    try {
      store.assignReportOwnership({ reportId: currentReportId, petId: petId, userId: userId || undefined });
      afterWrite('已绑定归属', 'success');
    } catch (err) {
      handleStoreError(err);
    }
  }

  function renderAssessmentForm(state, report) {
    var workVer = C.getWorkingReportVersion(state, report.id);
    var species = C.getReportSpeciesForChecks(state, report);
    var dims = (workVer && workVer.platformDimensions) || {};
    var readonly = !isEditable(report);
    var dis = readonly ? ' disabled' : '';

    document.getElementById('assessment-form').innerHTML =
      '<div><label class="text-xs text-slate-500">报告物种</label>' +
      '<select id="assess-species" data-preview-target="species" class="w-full border rounded px-2 py-1 mt-0.5"' + dis + '>' +
      '<option value="cat"' + (species === 'cat' ? ' selected' : '') + '>猫</option>' +
      '<option value="dog"' + (species === 'dog' ? ' selected' : '') + '>狗</option></select></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-500">综合等级 A–E</label>' +
      '<select id="assess-level" data-preview-target="level" class="w-full border rounded px-2 py-1 mt-0.5"' + dis + '>' +
      '<option value="">—</option>' + C.HEALTH_LEVELS.map(function (lv) {
        return '<option value="' + lv + '"' + (workVer && workVer.healthLevel === lv ? ' selected' : '') + '>' + lv + ' ' + (HEALTH_LEVEL_THEMES[lv] || '') + '</option>';
      }).join('') + '</select></div>' +
      '<div><label class="text-xs text-slate-500">综合分 0–100</label>' +
      '<input id="assess-score" data-preview-target="score" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5"' + dis + ' value="' +
      (workVer && workVer.healthScore != null ? workVer.healthScore : '') + '"></div></div>' +
      '<div><label class="text-xs text-slate-500">百分位</label>' +
      '<input id="assess-percentile" data-preview-target="percentile" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5"' + dis + ' value="' +
      (workVer && workVer.percentile != null ? workVer.percentile : '') + '"></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-500">情绪</label>' +
      '<input id="assess-emotion" data-preview-target="emotion" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5"' + dis + ' value="' +
      (dims.emotion != null ? dims.emotion : '') + '"></div>' +
      '<div><label class="text-xs text-slate-500">免疫</label>' +
      '<input id="assess-immunity" data-preview-target="immunity" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5"' + dis + ' value="' +
      (dims.immunity != null ? dims.immunity : '') + '"></div></div>' +
      '<div><label class="text-xs text-slate-500">备注（可选）</label>' +
      '<textarea id="assess-summary" data-preview-target="summary" rows="3" class="w-full border rounded px-2 py-1 mt-0.5"' + dis + '>' +
      C.escapeHtml(workVer && workVer.summary ? workVer.summary : '') + '</textarea></div>';

    bindFormPreviewListeners();
  }

  function bindFormPreviewListeners() {
    var ids = ['assess-species', 'assess-level', 'assess-score', 'assess-percentile', 'assess-emotion', 'assess-immunity', 'assess-summary'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || el.getAttribute('data-rw-bound')) return;
      el.setAttribute('data-rw-bound', '1');
      el.addEventListener('focus', function () {
        formInteracting = true;
        highlightPreview(el.getAttribute('data-preview-target'));
      });
      el.addEventListener('blur', function () {
        clearPreviewHighlight();
      });
      el.addEventListener('input', function () {
        formInteracting = true;
        partialUpdate(store.getState());
        highlightPreview(el.getAttribute('data-preview-target'));
      });
    });
  }

  function highlightPreview(target) {
    clearPreviewHighlight();
    if (!target) return;
    document.querySelectorAll('[data-preview-region="' + target + '"]').forEach(function (el) {
      el.classList.add('is-preview-highlight');
    });
  }

  function clearPreviewHighlight() {
    document.querySelectorAll('.is-preview-highlight').forEach(function (el) {
      el.classList.remove('is-preview-highlight');
    });
  }

  function renderIndicatorsPanel(state) {
    var report = C.lookupReport(state, currentReportId);
    if (!report) return;
    var results = (store.getEffectiveResults(report.id) || []).filter(function (ind) {
      if (resultsSearch) {
        var label = (ind.key + ' ' + taxonLabel(state, ind.key) + ' ' + (ind.rawImportName || '')).toLowerCase();
        if (label.indexOf(resultsSearch) < 0) return false;
      }
      return resultFilterMatch(ind);
    });
    var readonly = !isEditable(report);
    var suppBtn = document.getElementById('btn-supplement-result');
    if (suppBtn) suppBtn.classList.toggle('hidden', readonly);

    var listEl = document.getElementById('indicators-list');
    if (!results.length) {
      listEl.innerHTML = '<p class="text-slate-500 p-2">无匹配结果</p>';
      document.getElementById('indicator-detail').innerHTML = '';
      return;
    }

    if (!selectedResultId || !results.some(function (i) { return i.id === selectedResultId; })) {
      selectedResultId = results[0].id;
    }

    var noticeMap = labNoticeLabels();
    var srcMap = rangeSourceLabels();
    var rsMap = rangeStatusLabels();

    listEl.innerHTML = results.map(function (ind) {
      var status = store.normalizeDataStatus ? store.normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
      var changed = valuesDiffer(ind.sourceValue, ind.effectiveValue);
      var sel = ind.id === selectedResultId ? ' is-selected' : '';
      return '<button type="button" class="rw-indicator-row' + sel + '" data-result-id="' + ind.id + '">' +
        '<span>' +
        '<span class="font-medium block">' + C.escapeHtml(taxonLabel(state, ind.key)) + '</span>' +
        '<span class="text-xs text-slate-500">原始 ' + C.escapeHtml(formatNum(ind.sourceValue)) +
        ' → <span class="' + (changed ? 'rw-value-changed' : '') + '">有效 ' + C.escapeHtml(formatNum(ind.effectiveValue)) +
        (ind.unit || '') + '</span></span></span>' +
        '<span class="text-xs">' + C.statusBadge(status, C.DATA_STATUS_LABELS) + '</span>' +
        '</button>';
    }).join('');

    var ind = results.find(function (i) { return i.id === selectedResultId; });
    if (!ind) return;
    var status = store.normalizeDataStatus ? store.normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
    var changed = valuesDiffer(ind.sourceValue, ind.effectiveValue);
    var missing = MISSING_STATUSES.indexOf(status) >= 0;
    var notice = noticeMap[ind.labNotice] || ind.labNotice || '—';
    var rangeSrc = srcMap[ind.rangeSource] || ind.rangeSource || '—';
    var rangeSt = ind.rangeStatus ? (rsMap[ind.rangeStatus] || ind.rangeStatus) : '—';

    var html =
      '<h4 class="font-medium mb-2">' + C.escapeHtml(taxonLabel(state, ind.key)) +
      ' <span class="text-xs text-slate-400">' + C.escapeHtml(ind.key) + '</span></h4>' +
      '<p><span class="text-slate-500">层级</span> ' + C.escapeHtml(ind.level || '—') +
      (ind.phylumKey ? ' · 菌门 ' + C.escapeHtml(taxonLabel(state, ind.phylumKey)) : '') + '</p>' +
      '<p class="mt-1"><span class="text-slate-500">原始值</span> ' + C.escapeHtml(formatNum(ind.sourceValue)) + (ind.unit || '') + '</p>' +
      '<p class="mt-1"><span class="text-slate-500">有效值</span> <span class="' + (changed ? 'rw-value-changed' : '') + '">' +
      C.escapeHtml(formatNum(ind.effectiveValue)) + (ind.unit || '') + '</span></p>' +
      (ind.modifiedReason ? '<p class="mt-1 text-xs text-indigo-700">修改原因：' + C.escapeHtml(ind.modifiedReason) + '</p>' : '') +
      '<p class="mt-1"><span class="text-slate-500">实验室标注</span> ' + C.escapeHtml(notice) + '</p>' +
      '<p class="mt-1"><span class="text-slate-500">参考范围</span> ' + C.escapeHtml(formatRange(ind)) +
      ' <span class="text-xs text-slate-500">（' + C.escapeHtml(rangeSrc) + '）</span></p>' +
      '<p class="mt-1"><span class="text-slate-500">范围状态</span> ' + C.escapeHtml(rangeSt) + '</p>' +
      '<p class="mt-1"><span class="text-slate-500">数据状态</span> ' + C.statusBadge(status, C.DATA_STATUS_LABELS) +
      (ind.isEffective ? ' <span class="text-emerald-700 text-xs">有效结果</span>' : '') + '</p>';

    if (!readonly) {
      html += '<div class="mt-3 border-t pt-3 space-y-2">' +
        '<p class="text-xs font-medium text-slate-600">' + (missing ? '补录有效值' : '修改有效值') + '</p>' +
        '<label class="text-xs text-slate-500">有效值</label>' +
        '<input id="result-edit-value" type="number" step="any" class="w-full border rounded px-2 py-1 text-sm" value="' +
        (ind.effectiveValue != null ? ind.effectiveValue : '') + '">' +
        '<label class="text-xs text-slate-500">数据状态</label>' +
        '<select id="result-edit-status" class="w-full border rounded px-2 py-1 text-sm">' +
        ['PRESENT', 'NOT_DETECTED', 'MISSING_COLUMN', 'EMPTY', 'INVALID', 'NOT_APPLICABLE'].map(function (s) {
          var selected = missing ? s === 'PRESENT' : status === s;
          return '<option value="' + s + '"' + (selected ? ' selected' : '') + '>' +
            C.escapeHtml((C.DATA_STATUS_LABELS && C.DATA_STATUS_LABELS[s]) || s) + '</option>';
        }).join('') + '</select>' +
        '<label class="text-xs text-slate-500">实验室标注</label>' +
        '<select id="result-edit-notice" class="w-full border rounded px-2 py-1 text-sm">' +
        ['unmarked', 'high', 'low'].map(function (n) {
          return '<option value="' + n + '"' + (ind.labNotice === n ? ' selected' : '') + '>' +
            C.escapeHtml(noticeMap[n] || n) + '</option>';
        }).join('') + '</select>' +
        '<label class="text-xs text-slate-500">原因（必填）</label>' +
        '<textarea id="result-edit-reason" rows="2" class="w-full border rounded px-2 py-1 text-sm"></textarea>' +
        '<button type="button" class="btn-primary px-3 py-1 rounded text-xs" id="btn-save-result">' +
        (missing ? '补录' : '保存修改') + '</button>' +
        '</div>';
    } else {
      html += '<p class="mt-3 text-xs text-slate-400">已发布且无更正草稿，检测结果只读。</p>';
    }

    document.getElementById('indicator-detail').innerHTML = html;
  }

  function handleResultDetailClick(e) {
    if (!e.target.closest('#btn-save-result')) return;
    var valueEl = document.getElementById('result-edit-value');
    var statusEl = document.getElementById('result-edit-status');
    var noticeEl = document.getElementById('result-edit-notice');
    var reasonEl = document.getElementById('result-edit-reason');
    var reason = reasonEl ? reasonEl.value.trim() : '';
    if (!reason) {
      C.toast('请填写修改原因', 'warning');
      return;
    }
    var raw = valueEl ? valueEl.value : '';
    var value = raw === '' ? null : Number(raw);
    var nextStatus = statusEl ? statusEl.value : undefined;
    if (nextStatus === 'PRESENT' && (value == null || !isFinite(value))) {
      C.toast('有效状态须填写数值', 'warning');
      return;
    }
    try {
      store.modifyResultValue({
        reportId: currentReportId,
        resultId: selectedResultId,
        value: value,
        dataStatus: nextStatus,
        labNotice: noticeEl ? noticeEl.value : undefined,
        reason: reason,
        actor: actorLabel()
      });
      afterWrite('已更新有效值', 'success');
    } catch (err) {
      handleStoreError(err);
    }
  }

  function openSupplementModal(state) {
    var report = C.lookupReport(state, currentReportId);
    if (!report || !isEditable(report)) {
      C.toast('当前报告不可补录', 'warning');
      return;
    }
    var existing = {};
    (store.getEffectiveResults(report.id) || []).forEach(function (r) { existing[r.key] = true; });
    var phylums = store.listTaxaForRuleTarget ? store.listTaxaForRuleTarget('phylum') : [];
    var genera = store.listTaxaForRuleTarget ? store.listTaxaForRuleTarget('genus') : [];
    var options = phylums.concat(genera).filter(function (t) { return t && !existing[t.key]; });
    var sel = document.getElementById('supplement-key');
    sel.innerHTML = options.length
      ? options.map(function (t) {
        return '<option value="' + C.escapeHtml(t.key) + '">' + C.escapeHtml((t.label || t.key) + ' (' + t.key + ')') + '</option>';
      }).join('')
      : '<option value="">无可用分类单元</option>';
    document.getElementById('supplement-value').value = '';
    document.getElementById('supplement-unit').value = '%';
    document.getElementById('supplement-datastatus').value = 'PRESENT';
    document.getElementById('supplement-labnotice').value = 'unmarked';
    document.getElementById('supplement-reason').value = '';
    document.getElementById('supplement-modal').classList.remove('hidden');
  }

  function closeSupplementModal() {
    document.getElementById('supplement-modal').classList.add('hidden');
  }

  function submitSupplement() {
    var key = document.getElementById('supplement-key').value;
    var reason = document.getElementById('supplement-reason').value.trim();
    var dataStatus = document.getElementById('supplement-datastatus').value;
    var raw = document.getElementById('supplement-value').value;
    if (!key) {
      C.toast('请选择分类单元', 'warning');
      return;
    }
    if (!reason) {
      C.toast('请填写补录原因', 'warning');
      return;
    }
    try {
      store.supplementResult({
        reportId: currentReportId,
        key: key,
        value: raw === '' ? null : Number(raw),
        unit: document.getElementById('supplement-unit').value || '%',
        labNotice: document.getElementById('supplement-labnotice').value,
        dataStatus: dataStatus,
        reason: reason
      });
      closeSupplementModal();
      afterWrite('已补录', 'success');
    } catch (err) {
      handleStoreError(err);
    }
  }

  function renderAnalysisPanel(state, report) {
    var panel = document.getElementById('analysis-panel');
    var units = store.getPhylumUnits(report.id) || [];
    var pending = (report.todoFlags || []).indexOf('pending_reanalysis') >= 0;
    var run = C.getLatestAnalysisRun(state, report.id);
    var readonly = !isEditable(report);
    var confirmMap = unitConfirmLabels();
    var riskMap = riskLabels();

    var html = '';
    if (pending) {
      html += '<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded px-3 py-2 text-xs mb-2">' +
        '<i class="fas fa-clock mr-1"></i>待重新分析：检测结果或规则已变化，请运行分析。</div>';
    }
    html += '<div class="flex flex-wrap items-center gap-2 mb-3">' +
      (readonly ? '' : '<button type="button" id="btn-run-analysis" class="btn-primary px-3 py-1.5 rounded text-sm">' +
        '<i class="fas fa-play mr-1"></i>运行分析</button>') +
      (run ? '<span class="text-xs text-slate-500">最近运行 ' + C.escapeHtml(run.id) + ' · ' + C.formatDate(run.createdAt) + '</span>' : '<span class="text-xs text-slate-500">尚未运行分析</span>') +
      '</div>';

    if (!units.length) {
      html += '<p class="text-slate-500">暂无菌门分析单元。补录有效结果后将自动生成空壳单元。</p>';
      panel.innerHTML = html;
      return;
    }

    html += units.map(function (unit) {
      var open = !!expandedHits[unit.phylumKey];
      var risk = unit.riskLevel ? (riskMap[unit.riskLevel] || unit.riskLevel) : '—';
      var confirm = confirmMap[unit.confirmStatus] || unit.confirmStatus;
      var cardClass = 'rw-phylum-card' + (unit.confirmStatus === 'invalidated' ? ' is-invalidated' : '');
      var hits = unit.hits || [];
      var hitHtml = '';
      if (open) {
        if (!hits.length) {
          hitHtml = '<p class="text-xs text-slate-400 mt-2">暂无命中</p>';
        } else {
          hitHtml = hits.map(function (hit) {
            var st = hit.excluded ? 'excluded' : hit.combineStatus;
            var rowClass = 'rw-hit-row' +
              (st === 'superseded_by_conflict' ? ' is-superseded' : '') +
              (hit.excluded ? ' is-excluded' : '');
            var conds = (hit.conditionResults || []).map(function (c) {
              return C.escapeHtml(c.message || (c.taxonKey || '') + ' ' + (c.actualValue != null ? c.actualValue : ''));
            }).join('；');
            var sources = (hit.sourceResultIds || []).map(function (rid) {
              var row = (store.getEffectiveResults(report.id) || []).find(function (r) { return r.id === rid; });
              return row ? taxonLabel(state, row.key) : rid;
            }).join('、');
            return '<div class="' + rowClass + '">' +
              '<p class="font-medium text-xs">' + C.escapeHtml(hit.ruleName || hit.ruleId) +
              ' <span class="text-slate-400">v' + C.escapeHtml(String(hit.ruleVersion || 1)) + '</span>' +
              ' · ' + C.escapeHtml(HIT_STATUS_LABELS[st] || st) + '</p>' +
              '<p class="text-xs text-slate-500 mt-0.5">条件实际值：' + (conds || '—') + '</p>' +
              '<p class="text-xs text-slate-500">来源结果：' + C.escapeHtml(sources || '—') + '</p>' +
              (readonly ? '' :
                (hit.excluded
                  ? '<button type="button" class="rw-hit-restore text-xs text-teal-700 mt-1" data-phylum="' + unit.phylumKey + '" data-hit="' + hit.id + '">恢复</button>'
                  : '<button type="button" class="rw-hit-exclude text-xs text-red-600 mt-1" data-phylum="' + unit.phylumKey + '" data-hit="' + hit.id + '">排除</button>')) +
              '</div>';
          }).join('');
        }
      }
      return '<div class="' + cardClass + '" data-phylum-card="' + unit.phylumKey + '">' +
        '<div class="flex flex-wrap items-center gap-2 mb-2">' +
        '<h4 class="font-medium">' + C.escapeHtml(taxonLabel(state, unit.phylumKey)) + '</h4>' +
        '<span class="text-xs px-2 py-0.5 rounded bg-slate-100">风险 ' + C.escapeHtml(risk) + '</span>' +
        '<span class="text-xs px-2 py-0.5 rounded ' +
        (unit.confirmStatus === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
          unit.confirmStatus === 'invalidated' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800') +
        '">' + C.escapeHtml(confirm) + '</span>' +
        '<button type="button" class="rw-toggle-hits text-xs text-teal-700 ml-auto" data-phylum="' + unit.phylumKey + '">' +
        (open ? '收起命中' : '展开命中（' + hits.length + '）') + '</button></div>' +
        (unit.confirmStatus === 'invalidated' && unit.invalidatedReason
          ? '<p class="text-xs text-red-700 mb-2">依据变化失效：' + C.escapeHtml(unit.invalidatedReason) + '</p>' : '') +
        hitHtml +
        '<div class="grid grid-cols-1 gap-2 mt-3">' +
        '<label class="text-xs text-slate-500">分析</label>' +
        '<textarea id="unit-analysis-' + unit.phylumKey + '" rows="2" class="w-full border rounded px-2 py-1 text-xs"' +
        (readonly ? ' disabled' : '') + '>' + C.escapeHtml(unit.analysisDraft || '') + '</textarea>' +
        '<label class="text-xs text-slate-500">建议</label>' +
        '<textarea id="unit-advice-' + unit.phylumKey + '" rows="2" class="w-full border rounded px-2 py-1 text-xs"' +
        (readonly ? ' disabled' : '') + '>' + C.escapeHtml(unit.adviceDraft || '') + '</textarea></div>' +
        (readonly ? '' : '<div class="flex gap-2 mt-2">' +
          '<button type="button" class="rw-save-unit-draft btn-secondary px-3 py-1 rounded text-xs" data-phylum="' + unit.phylumKey + '">保存草稿</button>' +
          '<button type="button" class="rw-confirm-unit btn-primary px-3 py-1 rounded text-xs" data-phylum="' + unit.phylumKey + '">' +
          (unit.confirmStatus === 'invalidated' ? '重新确认' : '确认') + '</button></div>') +
        '</div>';
    }).join('');

    panel.innerHTML = html;
  }

  function handleAnalysisClick(e) {
    var runBtn = e.target.closest('#btn-run-analysis');
    if (runBtn) {
      formInteracting = true;
      saveAllPhylumDraftsFromDom(true);
      C.confirmDialog('运行分析将按当前有效结果与启用规则重算命中。人工草稿不会被覆盖。', function () {
        try {
          store.runReportAnalysis(currentReportId, { actor: actorLabel() });
          afterWrite('分析运行完成', 'success');
        } catch (err) {
          handleStoreError(err);
        }
      });
      return;
    }
    var toggle = e.target.closest('.rw-toggle-hits');
    if (toggle) {
      var pk = toggle.getAttribute('data-phylum');
      expandedHits[pk] = !expandedHits[pk];
      renderAnalysisPanel(store.getState(), C.lookupReport(store.getState(), currentReportId));
      return;
    }
    var saveBtn = e.target.closest('.rw-save-unit-draft');
    if (saveBtn) {
      var key = saveBtn.getAttribute('data-phylum');
      var analysisEl = document.getElementById('unit-analysis-' + key);
      var adviceEl = document.getElementById('unit-advice-' + key);
      try {
        store.savePhylumUnitDraft(currentReportId, key, {
          analysis: analysisEl ? analysisEl.value : '',
          advice: adviceEl ? adviceEl.value : ''
        });
        afterWrite('已保存草稿（状态回到未确认）', 'success');
      } catch (err) {
        handleStoreError(err);
      }
      return;
    }
    var confirmBtn = e.target.closest('.rw-confirm-unit');
    if (confirmBtn) {
      var ckey = confirmBtn.getAttribute('data-phylum');
      var aEl = document.getElementById('unit-analysis-' + ckey);
      var dEl = document.getElementById('unit-advice-' + ckey);
      try {
        var unit = currentUnit(ckey);
        if (unit && aEl && dEl &&
            (aEl.value !== (unit.analysisDraft || '') || dEl.value !== (unit.adviceDraft || ''))) {
          store.savePhylumUnitDraft(currentReportId, ckey, { analysis: aEl.value, advice: dEl.value });
        }
        store.confirmPhylumUnit(currentReportId, ckey, { actor: actorLabel() });
        afterWrite('已确认菌门分析单元', 'success');
      } catch (err) {
        handleStoreError(err);
      }
      return;
    }
    var excludeBtn = e.target.closest('.rw-hit-exclude');
    if (excludeBtn) {
      C.promptDialog('排除原因', '请填写排除原因', function (reason) {
        try {
          store.excludeHit(currentReportId, excludeBtn.getAttribute('data-phylum'), excludeBtn.getAttribute('data-hit'), {
            excluded: true, reason: reason
          });
          afterWrite('已排除命中', 'info');
        } catch (err) {
          handleStoreError(err);
        }
      });
      return;
    }
    var restoreBtn = e.target.closest('.rw-hit-restore');
    if (restoreBtn) {
      try {
        store.excludeHit(currentReportId, restoreBtn.getAttribute('data-phylum'), restoreBtn.getAttribute('data-hit'), {
          excluded: false
        });
        afterWrite('已恢复命中', 'info');
      } catch (err) {
        handleStoreError(err);
      }
    }
  }

  function availabilityTag(productId) {
    var info = store.resolveProductAvailability(productId);
    if (!info) return '';
    var label = info.label || (productStatusLabels()[info.status] || info.status);
    if (info.available) return '<span class="text-xs text-slate-500">' + C.escapeHtml(label) + '</span>';
    return '<span class="text-xs text-slate-500">' + C.escapeHtml(label || '') + '</span>' +
      '<span class="rw-product-unavail">失效</span>';
  }

  function renderRecommendationsPanel(state, report) {
    var panel = document.getElementById('recommendations-panel');
    var units = store.getPhylumUnits(report.id) || [];
    var readonly = !isEditable(report);
    if (!units.length) {
      panel.innerHTML = '<p class="text-slate-500">暂无菌门分析单元。</p>';
      return;
    }
    panel.innerHTML = units.map(function (unit) {
      var disabled = unitProductDisabled(unit);
      var advice = String(unit.adviceDraft || '').trim();
      var summary = advice ? advice.slice(0, 40) + (advice.length > 40 ? '…' : '') : '（无建议）';
      var primary = findProduct(state, unit.primaryProductId);
      var related = (unit.relatedProductIds || []).map(function (pid, idx) {
        var p = findProduct(state, pid);
        return '<span class="rw-related-chip">' + C.escapeHtml(p ? p.name : pid) +
          (!readonly && !disabled
            ? ' <button type="button" class="rw-rec-remove-related" data-phylum="' + unit.phylumKey + '" data-idx="' + idx + '">&times;</button>'
            : '') +
          '</span>';
      }).join('');
      var cardClass = 'rw-phylum-card' + (disabled ? ' is-disabled-row' : '');
      var body;
      if (disabled) {
        body = '<p class="text-xs text-amber-700 mt-2">该菌门无建议，不配置商品</p>';
      } else {
        body = '<div class="mt-2 space-y-2">' +
          '<div><span class="text-xs text-slate-500">主推商品</span>' +
          '<div class="flex items-center gap-2 mt-0.5 flex-wrap">' +
          '<span class="text-sm">' + (primary ? C.escapeHtml(primary.name) : '<span class="text-slate-400">未选择</span>') + '</span>' +
          (unit.primaryProductId ? availabilityTag(unit.primaryProductId) : '') +
          (!readonly
            ? '<button type="button" class="rw-pick-product btn-secondary px-2 py-0.5 rounded text-xs" data-phylum="' + unit.phylumKey + '" data-slot="primary">选择</button>' +
              (primary ? '<button type="button" class="rw-clear-primary text-xs text-red-600" data-phylum="' + unit.phylumKey + '">清除</button>' : '')
            : '') +
          '</div></div>' +
          '<div><span class="text-xs text-slate-500">关联商品（' + (unit.relatedProductIds || []).length + '/3）</span>' +
          '<div class="flex flex-wrap gap-1 mt-0.5">' + (related || '<span class="text-xs text-slate-400">无</span>') +
          (!readonly && (unit.relatedProductIds || []).length < 3
            ? '<button type="button" class="rw-pick-product btn-secondary px-2 py-0.5 rounded text-xs" data-phylum="' + unit.phylumKey + '" data-slot="related">+ 添加</button>'
            : '') +
          '</div></div></div>';
      }
      return '<div class="' + cardClass + '" data-phylum="' + unit.phylumKey + '">' +
        '<p class="font-medium">' + C.escapeHtml(taxonLabel(state, unit.phylumKey)) + '</p>' +
        '<p class="text-xs text-slate-500 mt-1">建议摘要：' + C.escapeHtml(summary) + '</p>' +
        body + '</div>';
    }).join('');
  }

  function currentUnit(phylumKey) {
    return (store.getPhylumUnits(currentReportId) || []).find(function (u) { return u.phylumKey === phylumKey; });
  }

  function handleRecommendationsClick(e) {
    var pickBtn = e.target.closest('.rw-pick-product');
    if (pickBtn) {
      openProductPicker(pickBtn.getAttribute('data-phylum'), pickBtn.getAttribute('data-slot'));
      return;
    }
    var clearBtn = e.target.closest('.rw-clear-primary');
    if (clearBtn) {
      var unit = currentUnit(clearBtn.getAttribute('data-phylum'));
      if (!unit) return;
      try {
        store.savePhylumUnitProducts(currentReportId, unit.phylumKey, {
          primaryProductId: null,
          relatedProductIds: unit.relatedProductIds || []
        });
        afterWrite('已清除主推商品', 'info');
      } catch (err) {
        handleStoreError(err);
      }
      return;
    }
    var removeBtn = e.target.closest('.rw-rec-remove-related');
    if (removeBtn) {
      var u2 = currentUnit(removeBtn.getAttribute('data-phylum'));
      if (!u2) return;
      var related = (u2.relatedProductIds || []).slice();
      related.splice(parseInt(removeBtn.getAttribute('data-idx'), 10), 1);
      try {
        store.savePhylumUnitProducts(currentReportId, u2.phylumKey, {
          primaryProductId: u2.primaryProductId,
          relatedProductIds: related
        });
        render(store.getState());
      } catch (err) {
        handleStoreError(err);
      }
    }
  }

  function openProductPicker(phylumKey, slot) {
    pickerState = { phylumKey: phylumKey, slot: slot, page: 1 };
    document.getElementById('picker-title').textContent = slot === 'primary' ? '选择主推商品' : '选择关联商品';
    var state = store.getState();
    var catSel = document.getElementById('picker-category');
    catSel.innerHTML = '<option value="">全部分类</option>' +
      (state.categories || []).map(function (c) {
        return '<option value="' + c.id + '">' + C.escapeHtml(c.name) + '</option>';
      }).join('');
    document.getElementById('picker-search').value = '';
    document.getElementById('picker-status').value = '';
    document.getElementById('product-picker-modal').classList.remove('hidden');
    renderProductPickerList(state);
  }

  function closeProductPicker() {
    document.getElementById('product-picker-modal').classList.add('hidden');
  }

  function renderProductPickerList(state) {
    var unit = currentUnit(pickerState.phylumKey);
    var includeIds = [];
    if (unit) {
      if (unit.primaryProductId) includeIds.push(unit.primaryProductId);
      (unit.relatedProductIds || []).forEach(function (id) { includeIds.push(id); });
    }
    var result = store.searchProductsForPicker(state, {
      q: document.getElementById('picker-search').value,
      categoryId: document.getElementById('picker-category').value || null,
      status: document.getElementById('picker-status').value || null,
      page: pickerState.page,
      pageSize: 8,
      includeProductIds: includeIds
    });
    var labels = productStatusLabels();
    var list = document.getElementById('picker-list');
    if (!result.items.length) {
      list.innerHTML = '<p class="text-slate-500 py-4 text-center">无匹配商品</p>';
    } else {
      list.innerHTML = result.items.map(function (p) {
        return '<button type="button" class="rw-picker-item w-full text-left border-b py-2 hover:bg-slate-50" data-product-id="' + p.id + '">' +
          '<div class="font-medium text-sm">' + C.escapeHtml(p.name) + '</div>' +
          '<div class="text-xs text-slate-500">SPU ' + C.escapeHtml(p.spuId) + ' · ' +
          C.escapeHtml(labels[p.status] || p.status) +
          (p.stock != null ? ' · 库存 ' + p.stock : '') + '</div></button>';
      }).join('');
      list.querySelectorAll('.rw-picker-item').forEach(function (btn) {
        btn.onclick = function () {
          selectPickerProduct(btn.getAttribute('data-product-id'));
        };
      });
    }
    var totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
    var pag = document.getElementById('picker-pagination');
    pag.innerHTML = '<span>共 ' + result.total + ' 项</span><span>' +
      (pickerState.page > 1 ? '<button type="button" data-page="' + (pickerState.page - 1) + '" class="text-teal-700 mx-1">上一页</button>' : '') +
      pickerState.page + ' / ' + totalPages +
      (pickerState.page < totalPages ? '<button type="button" data-page="' + (pickerState.page + 1) + '" class="text-teal-700 mx-1">下一页</button>' : '') +
      '</span>';
  }

  function selectPickerProduct(productId) {
    var unit = currentUnit(pickerState.phylumKey);
    if (!unit) return;
    try {
      if (pickerState.slot === 'primary') {
        store.savePhylumUnitProducts(currentReportId, unit.phylumKey, {
          primaryProductId: productId,
          relatedProductIds: unit.relatedProductIds || []
        });
      } else {
        var related = (unit.relatedProductIds || []).slice();
        if (related.indexOf(productId) < 0 && related.length < 3 && productId !== unit.primaryProductId) {
          related.push(productId);
        }
        store.savePhylumUnitProducts(currentReportId, unit.phylumKey, {
          primaryProductId: unit.primaryProductId,
          relatedProductIds: related
        });
      }
      closeProductPicker();
      render(store.getState());
    } catch (err) {
      handleStoreError(err);
    }
  }

  function renderVersionsPanel(state) {
    var report = C.lookupReport(state, currentReportId);
    if (!report) return;
    var workVer = C.getWorkingReportVersion(state, report.id);
    var pubVer = C.getPublishedReportVersion(state, report.id);
    var toggleWrap = document.getElementById('versions-toggle-wrap');
    var showToggle = report.status === 'published' && report.correctionDraftActive;
    toggleWrap.classList.toggle('hidden', !showToggle);
    if (!showToggle) versionView = 'working';

    var ver = versionView === 'published' && pubVer ? pubVer : workVer;
    var label = versionView === 'published' ? '发布版' : '工作版';
    var vLabels = versionStatusLabels();

    document.getElementById('versions-content').innerHTML = ver
      ? '<div class="border rounded p-3 ' + (versionView === 'published' ? 'bg-emerald-50/40' : 'bg-indigo-50/40') + '">' +
        '<h4 class="font-medium mb-2">' + label + ' v' + ver.version + '</h4>' +
        '<p>' + C.statusBadge(ver.status, vLabels) +
        (ver.healthLevel ? ' · 等级 ' + C.escapeHtml(ver.healthLevel) : '') +
        (ver.healthScore != null ? ' · 分 ' + ver.healthScore : '') + '</p>' +
        (ver.summary ? '<p class="text-slate-600 mt-2">' + C.escapeHtml(ver.summary) + '</p>' : '') +
        (ver.publishedAt ? '<p class="text-xs text-slate-400 mt-2">发布于 ' + C.formatDate(ver.publishedAt) + '</p>' : '') +
        (ver.correctionNote ? '<p class="text-xs text-indigo-600 mt-1">' + C.escapeHtml(ver.correctionNote) + '</p>' : '') +
        '</div>' +
        '<div class="mt-3"><h4 class="font-medium text-sm mb-2">版本时间线</h4>' +
        report.versions.slice().sort(function (a, b) { return b.version - a.version; }).map(function (v) {
          var isPub = v.version === report.publishedVersion;
          return '<div class="border-l-4 ' + (isPub ? 'border-emerald-500' : 'border-slate-200') + ' pl-3 py-1.5 text-xs">' +
            '<span class="font-medium">v' + v.version + '</span> ' + C.statusBadge(v.status, vLabels) +
            (isPub ? ' <span class="text-emerald-700">用户可见</span>' : '') +
            '</div>';
        }).join('') + '</div>'
      : '<p class="text-slate-500">无版本信息</p>';

    var ops = (state.operationRecords || []).filter(function (op) { return op.reportId === report.id; })
      .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    document.getElementById('operation-log').innerHTML = ops.length
      ? ops.map(function (op) {
        return '<div class="border-b border-slate-100 py-1.5">' +
          C.formatDate(op.createdAt) + ' · <code>' + C.escapeHtml(op.type) + '</code>' +
          (op.reason ? ' — ' + C.escapeHtml(op.reason) : '') +
          (op.actor ? ' <span class="text-slate-400">(' + C.escapeHtml(op.actor) + ')</span>' : '') +
          '</div>';
      }).join('')
      : '<p class="text-slate-500">暂无操作记录</p>';
  }

  function getPreviewFormValues() {
    var el = function (id) { return document.getElementById(id); };
    return {
      species: el('assess-species') ? el('assess-species').value : '',
      level: el('assess-level') ? el('assess-level').value : '',
      score: el('assess-score') ? el('assess-score').value : '',
      percentile: el('assess-percentile') ? el('assess-percentile').value : '',
      emotion: el('assess-emotion') ? el('assess-emotion').value : '',
      immunity: el('assess-immunity') ? el('assess-immunity').value : '',
      summary: el('assess-summary') ? el('assess-summary').value : ''
    };
  }

  function getPreviewData(state, report) {
    var usePublished = versionView === 'published' && report.correctionDraftActive;
    var pub = usePublished ? C.getPublishedReportVersion(state, report.id) : null;
    var snap = pub && pub.contentSnapshot;
    if (usePublished && snap) {
      return {
        results: snap.results || [],
        units: snap.phylumUnits || [],
        hasRange: snap.hasAnyEffectiveRange === true,
        species: snap.reportSpecies || snap.assessment && snap.assessment.reportSpecies,
        assessment: snap.assessment || {},
        fromSnapshot: true
      };
    }
    return {
      results: store.getEffectiveResults(report.id) || [],
      units: store.getPhylumUnits(report.id) || [],
      hasRange: !!store.hasAnyEffectiveRange(report.id),
      species: C.getReportSpeciesForChecks(state, report),
      assessment: null,
      fromSnapshot: false
    };
  }

  function compareBarHtml(ind) {
    if (!ind.range || ind.effectiveValue == null || !isFinite(Number(ind.effectiveValue))) return '';
    var min = Number(ind.range.min);
    var max = Number(ind.range.max);
    var v = Number(ind.effectiveValue);
    var span = max - min;
    var pad = span === 0 ? 1 : Math.abs(span) * 0.2;
    var lo = Math.min(min, v) - pad;
    var hi = Math.max(max, v) + pad;
    var pct = function (x) { return ((x - lo) / (hi - lo)) * 100; };
    var left = pct(min);
    var width = Math.max(2, pct(max) - pct(min));
    var mark = pct(v);
    return '<div class="rw-compare-bar" title="' + C.escapeHtml(formatRange(ind)) + '">' +
      '<span class="rw-compare-range" style="left:' + left + '%;width:' + width + '%"></span>' +
      '<span class="rw-compare-marker" style="left:' + mark + '%"></span></div>';
  }

  function updatePreview(state) {
    var report = C.lookupReport(state, currentReportId);
    if (!report) return;
    var vals = getPreviewFormValues();
    var data = getPreviewData(state, report);
    var pet = C.lookupPet(state, report.petId);
    var species = data.fromSnapshot ? data.species : (vals.species || data.species);
    var level = data.fromSnapshot ? (data.assessment.healthLevel || '') : vals.level;
    var score = data.fromSnapshot ? (data.assessment.healthScore != null ? data.assessment.healthScore : '') : vals.score;
    var percentile = data.fromSnapshot ? (data.assessment.percentile != null ? data.assessment.percentile : '') : vals.percentile;
    var emotion = data.fromSnapshot
      ? ((data.assessment.platformDimensions && data.assessment.platformDimensions.emotion) || '')
      : vals.emotion;
    var immunity = data.fromSnapshot
      ? ((data.assessment.platformDimensions && data.assessment.platformDimensions.immunity) || '')
      : vals.immunity;
    var levelTheme = HEALTH_LEVEL_THEMES[level] || '草原';
    var noticeMap = labNoticeLabels();
    var viewTag = versionView === 'published' && report.correctionDraftActive ? '发布版预览' : '工作版预览';

    var overviewHtml =
      '<div class="rw-mini-header">' +
      '<div class="rw-mini-title">' + C.escapeHtml(pet ? pet.name : '宠物报告') + '</div>' +
      '<div class="rw-mini-sub">肠道菌群 · ' + (species === 'dog' ? '狗' : '猫') + '</div></div>' +
      '<div class="rw-mini-card" data-preview-region="level" data-preview-focus="assess-level" data-preview-module="assessment">' +
      '<div class="rw-mini-level">' + C.escapeHtml(level || '—') + '</div>' +
      '<div class="rw-mini-theme">' + C.escapeHtml(levelTheme) + '</div></div>' +
      '<div class="rw-mini-card" data-preview-region="score" data-preview-focus="assess-score" data-preview-module="assessment">' +
      '<div class="rw-mini-stat-label">综合分</div><div class="rw-mini-stat-value">' + C.escapeHtml(String(score || '—')) + '</div></div>' +
      '<div class="rw-mini-card" data-preview-region="percentile" data-preview-focus="assess-percentile" data-preview-module="assessment">' +
      '<div class="rw-mini-stat-label">百分位</div><div class="rw-mini-stat-value">' + C.escapeHtml(String(percentile || '—')) + '</div></div>' +
      '<div class="rw-mini-dims">' +
      '<span data-preview-region="emotion" data-preview-focus="assess-emotion" data-preview-module="assessment">情绪 ' + C.escapeHtml(String(emotion || '—')) + '</span>' +
      '<span data-preview-region="immunity" data-preview-focus="assess-immunity" data-preview-module="assessment">免疫 ' + C.escapeHtml(String(immunity || '—')) + '</span></div>';

    var compareHtml;
    if (!data.hasRange) {
      compareHtml = '<div class="rw-compare-placeholder">本报告无有效参考范围</div>';
    } else {
      var ranged = data.results.filter(function (r) { return r.range && r.rangeSource && r.rangeSource !== 'none'; });
      compareHtml = '<div class="rw-mini-list">' + ranged.map(function (ind) {
        return '<div class="rw-mini-list-item" style="display:block">' +
          '<div class="flex justify-between"><span>' + C.escapeHtml(taxonLabel(state, ind.key)) + '</span><strong>' +
          C.escapeHtml(formatNum(ind.effectiveValue)) + (ind.unit || '') + '</strong></div>' +
          compareBarHtml(ind) + '</div>';
      }).join('') + '</div>';
    }

    var phylumHtml = data.units.map(function (unit) {
      var rows = data.results.filter(function (r) { return r.phylumKey === unit.phylumKey; });
      var primary = unit.primaryProductId ? findProduct(state, unit.primaryProductId) : null;
      return '<div class="rw-mini-card">' +
        '<div class="font-medium text-sm">' + C.escapeHtml(taxonLabel(state, unit.phylumKey)) + '</div>' +
        rows.map(function (r) {
          return '<div class="text-xs mt-1 flex justify-between"><span>' + C.escapeHtml(taxonLabel(state, r.key)) + '</span>' +
            '<span>' + C.escapeHtml(r.dataStatus === 'NOT_DETECTED' ? '未检出' : formatNum(r.effectiveValue) + (r.unit || '')) +
            ' · ' + C.escapeHtml(formatRange(r)) +
            ' · ' + C.escapeHtml(noticeMap[r.labNotice] || r.labNotice || '') + '</span></div>';
        }).join('') +
        (unit.analysisDraft ? '<p class="rw-mini-text mt-2"><strong>分析</strong> ' + C.escapeHtml(unit.analysisDraft) + '</p>' : '') +
        (unit.adviceDraft ? '<p class="rw-mini-text mt-1"><strong>建议</strong> ' + C.escapeHtml(unit.adviceDraft) + '</p>' : '') +
        (primary ? '<div class="rw-mini-product mt-2">' + C.escapeHtml(primary.name) + '</div>' : '') +
        '</div>';
    }).join('') || '<p class="text-xs text-slate-400 p-3">暂无菌门分析单元</p>';

    var tabContent = previewTab === 'compare' ? compareHtml : previewTab === 'phylum' ? phylumHtml : overviewHtml;
    document.getElementById('preview-content').innerHTML =
      '<div class="rw-mini-shell">' + tabContent + '<div class="rw-mini-badge">' + viewTag + '</div></div>';
  }

  function partialUpdate(state) {
    lastChecks = C.buildPublicationChecks(state, currentReportId);
    renderModuleNav(lastChecks);
    renderChecksPanel(lastChecks);
    updatePreview(state);
  }

  function statusLabelHtml(report) {
    var html = C.statusBadge(report.status, C.REPORT_STATUS_LABELS);
    var stage = correctionStage(report);
    if (report.correctionDraftActive && stage && CORRECTION_STAGE_LABELS[stage]) {
      html += ' <span class="text-xs text-indigo-600 ml-1">' + CORRECTION_STAGE_LABELS[stage] + '</span>';
    }
    var flagLabels = store.TODO_FLAG_LABELS || {
      pending_reanalysis: '待重新分析',
      missing_unresolved: '缺失未处理',
      product_unavailable: '商品失效',
      user_unlinked: '未关联用户'
    };
    (report.todoFlags || []).forEach(function (flag) {
      html += ' <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 ml-1" data-todo-flag="' +
        C.escapeHtml(flag) + '">' + C.escapeHtml(flagLabels[flag] || flag) + '</span>';
    });
    return html;
  }

  function render(state) {
    var reports = (state.reports || []).slice().sort(function (a, b) {
      return String(a.reportNumber || '').localeCompare(String(b.reportNumber || ''));
    });
    var select = document.getElementById('select-report');
    select.innerHTML = reports.map(function (r) {
      var stage = correctionStage(r);
      var tag = r.correctionDraftActive && CORRECTION_STAGE_LABELS[stage]
        ? ' [' + CORRECTION_STAGE_LABELS[stage] + ']'
        : '';
      return '<option value="' + r.id + '">' + C.escapeHtml(r.reportNumber) + tag +
        ' (' + (C.REPORT_STATUS_LABELS[r.status] || r.status) + ')</option>';
    }).join('') || '<option value="">无报告</option>';

    if (currentReportId && reports.some(function (r) { return r.id === currentReportId; })) {
      select.value = currentReportId;
    } else if (reports.length) {
      currentReportId = reports[0].id;
      select.value = currentReportId;
    }

    var report = currentReportId ? C.lookupReport(state, currentReportId) : null;
    if (!report) {
      document.getElementById('source-panel').innerHTML = '<p class="text-slate-500">请选择报告。</p>';
      document.getElementById('action-bar').innerHTML = '';
      switchModule('source');
      return;
    }

    if (lastRenderedReportId !== report.id) {
      activeModule = defaultModuleForReport(report);
      lastRenderedReportId = report.id;
      selectedResultId = null;
      expandedHits = {};
      if (!(report.status === 'published' && report.correctionDraftActive)) versionView = 'working';
    }

    document.getElementById('report-status-badge').innerHTML = statusLabelHtml(report);
    document.getElementById('version-badges').innerHTML =
      '工作版 v' + (report.workingVersion || '—') +
      ' · 发布版 v' + (report.publishedVersion != null ? report.publishedVersion : '—');

    var rejectBanner = document.getElementById('reject-banner');
    if (report.status === 'incomplete' && report.rejectReason) {
      rejectBanner.classList.remove('hidden');
      document.getElementById('reject-reason-text').textContent = report.rejectReason;
    } else {
      rejectBanner.classList.add('hidden');
    }

    var corrBanner = document.getElementById('correction-banner');
    if (report.correctionDraftActive) {
      corrBanner.classList.remove('hidden');
      document.getElementById('correction-pub-ver').textContent = report.publishedVersion != null ? report.publishedVersion : '—';
    } else {
      corrBanner.classList.add('hidden');
    }

    bindActionBar(state, report);
    renderSourcePanel(state, report);
    renderAssessmentForm(state, report);
    renderIndicatorsPanel(state);
    renderAnalysisPanel(state, report);
    renderRecommendationsPanel(state, report);
    renderVersionsPanel(state);

    lastChecks = C.buildPublicationChecks(state, report.id);
    renderModuleNav(lastChecks);
    renderChecksPanel(lastChecks);
    switchModule(activeModule);
    updatePreview(state);

    if (C.enhanceDom) C.enhanceDom(document.getElementById('report-review'));
  }
}
