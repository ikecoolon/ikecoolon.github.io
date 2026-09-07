function initReportReview(mountRoot, tab) {
  var root = mountRoot || document;
  var Session = window.PetAdminSession;
  var C = window.PetAdminCommon;
  var HEALTH_LEVEL_THEMES = { A: '雨林', B: '森林', C: '草原', D: '苔藓', E: '沙漠' };
  var store = C.store();
  var route = C.parseRoute();
  var currentReportId = (tab && tab.params && tab.params.reportId) || route.params.reportId || 'report-002';
  var tabActive = !tab || !Session || Session.getActiveTab() === tab;

  function el(id) {
    return root.querySelector('#' + id);
  }

  function isTabActive() {
    return tabActive && (!tab || !Session || Session.getActiveTab() === tab);
  }
  var formInteracting = false;
  var lastChecks = { blockers: [], warnings: [] };
  var activeModule = 'source';
  var selectedResultId = null;
  var resultsSearch = '';
  var resultsFilters = { abnormal: false, missing: false, modified: false };
  var previewCollapsed = false;
  var versionView = 'working';
  var pickerState = { phylumKey: null, slot: 'primary', page: 1 };
  var expandedHits = {};
  var lastRenderedReportId = null;
  var Perms = C.permissions();
  var productSession = {};
  var professionalBaseline = '';

  function mapRolesToStore(roles) {
    if (Perms && Perms.mapRolesToStore) return Perms.mapRolesToStore(roles);
    return (roles || []).map(function (r) {
      if (r === 'edit') return 'editor';
      if (r === 'review') return 'reviewer';
      return r;
    });
  }

  function actorOptions() {
    var actor = Perms ? Perms.getActor() : { id: 'admin-demo', label: '管理员', roles: ['edit', 'review'] };
    var label = Perms ? Perms.getActorLabel() : (actor.label || '管理员');
    var profile = Perms && Perms.getStorePermissionProfile
      ? Perms.getStorePermissionProfile()
      : { actorId: actor.id, actor: label, roles: mapRolesToStore(actor.roles) };
    return {
      actor: label,
      actorId: profile.actorId || actor.id,
      permissionProfile: profile
    };
  }

  function withActorPayload(payload) {
    var opts = actorOptions();
    return Object.assign({}, payload || {}, {
      actor: opts.actor,
      actorId: opts.actorId,
      permissionProfile: opts.permissionProfile
    });
  }

  function actorLabel() {
    return actorOptions().actor;
  }

  function canEditProfessionally() {
    if (!Perms) return true;
    if (Perms.getActor().readOnly) return false;
    return Perms.can('edit');
  }

  function canConfigureProducts(report) {
    if (!report || report.status === 'voided') return false;
    if (!Perms) return true;
    if (Perms.getActor().readOnly) return false;
    return Perms.can('configureProducts');
  }

  var RETURN_VIEWS = ['all', 'incomplete', 'pending_review', 'published', 'voided', 'pending'];
  var MISSING_STATUSES = ['MISSING_COLUMN', 'EMPTY', 'INVALID', 'NOT_APPLICABLE'];
  var HIT_STATUS_LABELS = {
    primary: '采用命中',
    superseded_by_conflict: '历史冲突标记',
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
    { id: 'checks', label: '发布检查', icon: 'fa-clipboard-check' }
  ];
  var VALID_MODULE_IDS = MODULES.map(function (m) { return m.id; });
  var pendingFocusTrace = false;

  function isValidReviewModule(id) {
    return VALID_MODULE_IDS.indexOf(id) >= 0;
  }

  function requestedModuleFromRoute() {
    var params = (C.parseRoute().params || {});
    if (params.module === 'versions' || params.focus === 'trace') {
      pendingFocusTrace = true;
      return 'source';
    }
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
    var workbench = el('rw-workbench');
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
    if (!isTabActive()) return;
    if (!formInteracting) render(store.getState());
    else partialUpdate(store.getState());
  });

  function onTabActivate() {
    tabActive = true;
    if (!isTabActive()) return;
    if (!formInteracting) render(store.getState());
    else partialUpdate(store.getState());
    syncDirtyState();
  }

  function onTabDeactivate() {
    tabActive = false;
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
    if (Perms && Perms.getActor().readOnly) return false;
    if (report.status === 'published' && !report.correctionDraftActive) return false;
    if (isPendingReviewLike(report)) return Perms && Perms.can('review');
    if (!canEditProfessionally()) return false;
    return true;
  }

  function isPendingReviewLike(report) {
    if (!report) return false;
    if (report.status === 'pending_review') return true;
    return report.status === 'published' && correctionStage(report) === 'pending_review';
  }

  function canSaveDraft(report) {
    return !!report && isEditable(report);
  }

  function canSubmit(report) {
    if (!report || !Perms || !Perms.can('submit')) return false;
    if (report.status === 'incomplete') return true;
    return report.status === 'published' && report.correctionDraftActive && correctionStage(report) === 'incomplete';
  }

  function canWithdraw(report) {
    if (!report || !isPendingReviewLike(report)) return false;
    if (!Perms || !Perms.can('withdraw')) return false;
    var actorId = Perms.getActor().id;
    if (report.submittedByActorId && report.submittedByActorId !== actorId) return false;
    return true;
  }

  function canReject(report) {
    return isPendingReviewLike(report) && Perms && Perms.can('reject');
  }

  function canPublish(report) {
    return isPendingReviewLike(report) && Perms && Perms.can('publish');
  }

  function canVoid(report) {
    return report && report.status !== 'voided' && Perms && Perms.can('void');
  }

  function canCreateCorrection(report) {
    return report && report.status === 'published' && !report.correctionDraftActive && Perms && Perms.can('edit');
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
    syncDirtyState();
    render(store.getState());
  }

  function handleStoreError(err) {
    C.toast((err && err.message) || '操作失败', 'error');
  }

  function bindStaticEvents() {
    el('btn-go-report-center').addEventListener('click', returnToReportCenter);

    el('select-report').addEventListener('change', function () {
      if (!confirmDiscardWorkbench()) {
        this.value = currentReportId;
        return;
      }
      formInteracting = false;
      currentReportId = this.value;
      selectedResultId = null;
      expandedHits = {};
      versionView = 'working';
      resetProductSession();
      C.navigate('report-review', reviewNavParams(currentReportId));
      var state = store.getState();
      activeModule = defaultModuleForReport(C.lookupReport(state, currentReportId));
      render(state);
    });

    el('results-search').addEventListener('input', function () {
      resultsSearch = this.value.trim().toLowerCase();
      renderIndicatorsPanel(store.getState());
    });

    el('results-filters').addEventListener('click', function (e) {
      var btn = e.target.closest('.rw-filter-btn');
      if (!btn) return;
      var key = btn.getAttribute('data-filter');
      resultsFilters[key] = !resultsFilters[key];
      btn.classList.toggle('active', resultsFilters[key]);
      renderIndicatorsPanel(store.getState());
    });

    el('btn-supplement-result').addEventListener('click', function () {
      openSupplementModal(store.getState());
    });

    el('rw-module-nav').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-module-id]');
      if (!btn) return;
      switchModule(btn.getAttribute('data-module-id'));
    });

    el('ver-toggle-working').addEventListener('click', function () {
      versionView = 'working';
      el('ver-toggle-working').classList.add('active');
      el('ver-toggle-published').classList.remove('active');
      syncPreviewVersionToggle(store.getState());
      updatePreview(store.getState());
    });
    el('ver-toggle-published').addEventListener('click', function () {
      versionView = 'published';
      el('ver-toggle-published').classList.add('active');
      el('ver-toggle-working').classList.remove('active');
      syncPreviewVersionToggle(store.getState());
      updatePreview(store.getState());
    });

    el('btn-preview-collapse').addEventListener('click', function () {
      previewCollapsed = true;
      el('rw-preview-pane').classList.add('is-collapsed');
      el('rw-preview-resizer').classList.add('hidden');
      el('btn-preview-expand').classList.remove('hidden');
      el('rw-workbench').classList.add('preview-collapsed');
    });

    el('btn-preview-expand').addEventListener('click', function () {
      previewCollapsed = false;
      el('rw-preview-pane').classList.remove('is-collapsed');
      el('rw-preview-resizer').classList.remove('hidden');
      el('btn-preview-expand').classList.add('hidden');
      el('rw-workbench').classList.remove('preview-collapsed');
    });

    el('btn-preview-drawer-open').addEventListener('click', function () {
      el('rw-preview-pane').classList.add('is-drawer-open');
    });
    el('btn-preview-drawer-close').addEventListener('click', function () {
      el('rw-preview-pane').classList.remove('is-drawer-open');
    });

    resizer = el('rw-preview-resizer');
    resizer.addEventListener('mousedown', function (e) {
      resizing = true;
      resizer.classList.add('is-dragging');
      e.preventDefault();
    });
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);

    el('picker-close').addEventListener('click', closeProductPicker);
    el('product-picker-modal').addEventListener('click', function (e) {
      if (e.target.id === 'product-picker-modal') closeProductPicker();
    });
    el('picker-search').addEventListener('input', function () {
      pickerState.page = 1;
      renderProductPickerList(store.getState());
    });
    el('picker-category').addEventListener('change', function () {
      pickerState.page = 1;
      renderProductPickerList(store.getState());
    });
    el('picker-status').addEventListener('change', function () {
      pickerState.page = 1;
      renderProductPickerList(store.getState());
    });
    el('picker-pagination').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-page]');
      if (!btn) return;
      pickerState.page = parseInt(btn.getAttribute('data-page'), 10);
      renderProductPickerList(store.getState());
    });

    el('rw-preview-frame').addEventListener('click', function (e) {
      var region = e.target.closest('[data-preview-focus]');
      if (!region) return;
      var focusId = region.getAttribute('data-preview-focus');
      var module = region.getAttribute('data-preview-module') || 'assessment';
      switchModule(module);
      setTimeout(function () {
        var targetEl = el(focusId);
        if (targetEl) targetEl.focus();
      }, 50);
    });

    el('recommendations-panel').addEventListener('click', handleRecommendationsClick);
    el('btn-save-products').addEventListener('click', saveProductConfiguration);
    el('analysis-panel').addEventListener('click', handleAnalysisClick);
    el('analysis-panel').addEventListener('focusin', function () {
      markFormDirty();
    });
    el('assessment-form').addEventListener('input', markFormDirty);
    el('assessment-form').addEventListener('change', markFormDirty);
    el('analysis-panel').addEventListener('input', markFormDirty);
    el('source-panel').addEventListener('click', handleSourceClick);
    el('source-panel').addEventListener('change', handleSourceChange);
    el('indicators-list').addEventListener('click', function (e) {
      var row = e.target.closest('[data-result-id]');
      if (!row) return;
      selectedResultId = row.getAttribute('data-result-id');
      renderIndicatorsPanel(store.getState());
    });
    el('indicator-detail').addEventListener('click', handleResultDetailClick);

    el('supplement-close').addEventListener('click', closeSupplementModal);
    el('supplement-cancel').addEventListener('click', closeSupplementModal);
    el('supplement-modal').addEventListener('click', function (e) {
      if (e.target.id === 'supplement-modal') closeSupplementModal();
    });
    el('supplement-form').addEventListener('submit', function (e) {
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
    if (report.status === 'published' || report.status === 'voided') return 'source';
    return 'assessment';
  }

  function switchModule(moduleId) {
    activeModule = moduleId;
    MODULES.forEach(function (m) {
      var panel = el('module-' + m.id);
      if (panel) panel.classList.toggle('hidden', m.id !== moduleId);
    });
    root.querySelectorAll('#rw-module-nav [data-module-id]').forEach(function (btn) {
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

  function collectPhylumDraftsFromDom() {
    var out = {};
    (store.getPhylumUnits(currentReportId) || []).forEach(function (unit) {
      var analysisEl = el('unit-analysis-' + unit.phylumKey);
      var adviceEl = el('unit-advice-' + unit.phylumKey);
      if (!analysisEl || !adviceEl) return;
      out[unit.phylumKey] = { analysis: analysisEl.value, advice: adviceEl.value };
    });
    return out;
  }

  function serializeProfessionalState() {
    return JSON.stringify({
      assessment: collectAssessmentFromForm(),
      phylum: collectPhylumDraftsFromDom()
    });
  }

  function captureProfessionalBaseline() {
    professionalBaseline = serializeProfessionalState();
  }

  function isProfessionalDirty() {
    if (!el('assess-species')) return false;
    return serializeProfessionalState() !== professionalBaseline;
  }

  function savedProducts(unit) {
    return {
      primaryProductId: unit.primaryProductId || null,
      relatedProductIds: (unit.relatedProductIds || []).slice()
    };
  }

  function productsEqual(a, b) {
    if (!a || !b) return false;
    if (a.primaryProductId !== b.primaryProductId) return false;
    var ra = a.relatedProductIds || [];
    var rb = b.relatedProductIds || [];
    if (ra.length !== rb.length) return false;
    for (var i = 0; i < ra.length; i++) {
      if (ra[i] !== rb[i]) return false;
    }
    return true;
  }

  function resetProductSession() {
    productSession = {};
  }

  function sessionProducts(phylumKey) {
    if (productSession[phylumKey]) return productSession[phylumKey];
    var unit = currentUnit(phylumKey);
    if (!unit) return { primaryProductId: null, relatedProductIds: [] };
    return savedProducts(unit);
  }

  function hasProductSessionDirty() {
    var units = store.getPhylumUnits(currentReportId) || [];
    for (var i = 0; i < units.length; i++) {
      var unit = units[i];
      if (productSession[unit.phylumKey] && !productsEqual(productSession[unit.phylumKey], savedProducts(unit))) {
        return true;
      }
    }
    return false;
  }

  function syncDirtyState() {
    var dirty = isProfessionalDirty() || hasProductSessionDirty();
    var indicator = el('rw-dirty-indicator');
    if (indicator) indicator.classList.toggle('hidden', !dirty);
    var productBtn = el('btn-save-products');
    if (productBtn) productBtn.classList.toggle('hidden', !hasProductSessionDirty());
    if (tab && Session) Session.setTabDirty(tab.id, dirty);
  }

  function confirmDiscardWorkbench() {
    if (!isProfessionalDirty() && !hasProductSessionDirty()) return true;
    return window.confirm('报告工作台有未保存的修改，确定离开吗？');
  }

  function markFormDirty() {
    formInteracting = true;
    syncDirtyState();
  }

  function collectAssessmentFromForm() {
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

  function buildPhylumUnitsPayload() {
    var patches = [];
    (store.getPhylumUnits(currentReportId) || []).forEach(function (unit) {
      var analysisEl = el('unit-analysis-' + unit.phylumKey);
      var adviceEl = el('unit-advice-' + unit.phylumKey);
      if (!analysisEl || !adviceEl) return;
      var analysis = analysisEl.value;
      var advice = adviceEl.value;
      if (analysis === (unit.analysisDraft || '') && advice === (unit.adviceDraft || '')) return;
      var patch = { phylumKey: unit.phylumKey };
      if (analysis !== (unit.analysisDraft || '')) patch.analysis = analysis;
      if (advice !== (unit.adviceDraft || '')) patch.advice = advice;
      patches.push(patch);
    });
    return patches;
  }

  function assessmentDiffersFromStore(data, report) {
    var workVer = C.getWorkingReportVersion(store.getState(), report.id);
    var dims = (workVer && workVer.platformDimensions) || {};
    var formDims = data.platformDimensions || {};
    return (data.reportSpecies || '') !== (workVer && workVer.reportSpecies ? workVer.reportSpecies : (report.reportSpecies || '')) ||
      (data.healthLevel || '') !== (workVer && workVer.healthLevel ? workVer.healthLevel : '') ||
      String(data.healthScore === '' ? '' : data.healthScore) !== String(workVer && workVer.healthScore != null ? workVer.healthScore : '') ||
      String(data.percentile === '' ? '' : data.percentile) !== String(workVer && workVer.percentile != null ? workVer.percentile : '') ||
      (data.summary || '') !== (workVer && workVer.summary ? workVer.summary : '') ||
      String(formDims.emotion == null ? '' : formDims.emotion) !== String(dims.emotion == null ? '' : dims.emotion) ||
      String(formDims.immunity == null ? '' : formDims.immunity) !== String(dims.immunity == null ? '' : dims.immunity);
  }

  function persistWorkbench(silent) {
    if (!currentReportId) return false;
    var report = C.lookupReport(store.getState(), currentReportId);
    if (!report || !isEditable(report)) return true;
    if (!el('assess-species')) return true;
    var data = collectAssessmentFromForm();
    var errors = C.validateAssessmentInput(data);
    if (errors.length) {
      if (!silent) C.toast(errors.join('；'), 'warning');
      return false;
    }
    var phylumUnits = buildPhylumUnitsPayload();
    var assessmentChanged = assessmentDiffersFromStore(data, report);
    if (!assessmentChanged && !phylumUnits.length) {
      captureProfessionalBaseline();
      syncDirtyState();
      return true;
    }
    formInteracting = true;
    var payload = {};
    if (assessmentChanged) {
      payload.assessment = {
        reportSpecies: data.reportSpecies,
        healthLevel: data.healthLevel || null,
        healthScore: data.healthScore === '' ? null : Number(data.healthScore),
        percentile: data.percentile === '' ? null : Number(data.percentile),
        summary: data.summary,
        platformDimensions: data.platformDimensions
      };
    }
    if (phylumUnits.length) payload.phylumUnits = phylumUnits;
    try {
      var opts = actorOptions();
      var actor = opts.permissionProfile || { actorId: opts.actorId, actor: opts.actor, roles: mapRolesToStore(Perms && Perms.getActor().roles) };
      store.saveReportWorkVersion(currentReportId, payload, actor);
      captureProfessionalBaseline();
      syncDirtyState();
      return true;
    } catch (err) {
      if (!silent) handleStoreError(err);
      return false;
    }
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
    afterWrite('专业内容已暂存', 'success');
  }

  function saveProductConfiguration() {
    var report = C.lookupReport(store.getState(), currentReportId);
    if (!report || !canConfigureProducts(report)) {
      C.toast('当前不可保存商品配置', 'warning');
      return;
    }
    var keys = Object.keys(productSession);
    if (!keys.length || !hasProductSessionDirty()) {
      C.toast('没有待保存的商品修改', 'info');
      return;
    }
    var keepProfessionalSession = isProfessionalDirty();
    try {
      keys.forEach(function (phylumKey) {
        var sess = productSession[phylumKey];
        var unit = currentUnit(phylumKey);
        if (!unit || productsEqual(sess, savedProducts(unit))) return;
        store.savePhylumUnitProducts(currentReportId, phylumKey, withActorPayload({
          primaryProductId: sess.primaryProductId,
          relatedProductIds: sess.relatedProductIds || []
        }));
      });
      resetProductSession();
      C.toast('商品配置已保存', 'success');
      var state = store.getState();
      var savedReport = C.lookupReport(state, currentReportId);
      renderRecommendationsPanel(state, savedReport);
      updatePreview(state);
      if (keepProfessionalSession) formInteracting = true;
      syncDirtyState();
    } catch (err) {
      handleStoreError(err);
    }
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
    var bar = el('action-bar');
    bar.innerHTML = '';
    if (!report) return;

    function addBtn(id, label, cls, icon, handler) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = id;
      btn.className = (cls || 'ant-btn ant-btn-default ant-btn-sm') + ' rw-action-btn';
      btn.innerHTML = '<i class="fas ' + icon + '" aria-hidden="true"></i> ' + label;
      btn.onclick = handler;
      bar.appendChild(btn);
    }

    if (canSaveDraft(report)) {
      addBtn('btn-save-draft', '暂存专业内容', 'ant-btn ant-btn-default ant-btn-sm', 'fa-floppy-disk', saveDraft);
    }

    if (canSubmit(report)) {
      addBtn('btn-submit', '提交审核', 'ant-btn ant-btn-primary ant-btn-sm', 'fa-paper-plane', function () {
        runWithChecks('提交审核', function () {
          try {
            store.submitReport(report.id, actorOptions());
            activeModule = 'checks';
            captureProfessionalBaseline();
            afterWrite('已提交审核', 'success');
          } catch (err) {
            handleStoreError(err);
            switchModule('checks');
            render(store.getState());
          }
        });
      });
    }

    if (canWithdraw(report)) {
      addBtn('btn-withdraw', '撤回', 'ant-btn ant-btn-default ant-btn-sm', 'fa-arrow-rotate-left', function () {
        C.confirmDialog('确认撤回？送检状态不会改变。', function () {
          try {
            store.withdrawReport(report.id, actorOptions());
            activeModule = 'source';
            captureProfessionalBaseline();
            afterWrite('已撤回', 'info');
          } catch (err) {
            handleStoreError(err);
          }
        });
      });
    }

    if (canReject(report)) {
      addBtn('btn-reject', '退回完善', 'ant-btn ant-btn-default ant-btn-sm rw-btn-danger', 'fa-undo', function () {
        C.promptDialog('退回原因', '请填写退回原因（必填）', function (reason) {
          try {
            store.rejectReport(report.id, reason, actorOptions());
            captureProfessionalBaseline();
            afterWrite('已退回待完善', 'warning');
          } catch (err) {
            handleStoreError(err);
          }
        });
      });
    }

    if (canPublish(report)) {
      addBtn('btn-approve-publish', '审核通过并发布', 'ant-btn ant-btn-primary ant-btn-sm', 'fa-check-double', function () {
        runWithChecks('审核通过并发布', function () {
          try {
            store.publishReport(report.id, actorOptions());
            activeModule = 'source';
            pendingFocusTrace = true;
            captureProfessionalBaseline();
            afterWrite('报告已审核通过并发布', 'success');
          } catch (err) {
            handleStoreError(err);
            switchModule('checks');
            render(store.getState());
          }
        });
      });
    }

    if (canVoid(report)) {
      addBtn('btn-void', '作废', 'ant-btn ant-btn-default ant-btn-sm', 'fa-ban', function () {
        C.promptDialog('作废原因', '请填写作废原因（必填）', function (reason) {
          try {
            store.voidReport(report.id, reason, actorOptions());
            captureProfessionalBaseline();
            resetProductSession();
            afterWrite('报告已作废', 'warning');
          } catch (err) {
            handleStoreError(err);
          }
        });
      });
    }

    if (canCreateCorrection(report)) {
      addBtn('btn-correction', '创建更正草稿', 'ant-btn ant-btn-primary ant-btn-sm', 'fa-pen-ruler', function () {
        C.promptDialog('更正说明', '请填写更正说明', function (note) {
          try {
            store.createCorrectionDraft(report.id, { correctionNote: note, actor: actorLabel() });
            versionView = 'working';
            activeModule = 'results';
            captureProfessionalBaseline();
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

  function formatImportedRange(range) {
    if (!range || range.min == null || range.max == null) return '—';
    return range.min + '–' + range.max + (range.unit || '');
  }

  function importedRangeDecisionLabel(decision) {
    var labels = store.IMPORTED_RANGE_DECISION_LABELS || {
      pending: '待确认', confirmed: '已确认可用', rejected: '已驳回'
    };
    return labels[decision] || decision || '—';
  }

  function importedRangeBlockHtml(ind, readonly) {
    if (!ind.importedRange || ind.importedRange.min == null || ind.importedRange.max == null) {
      return '<p class="mt-1 text-xs text-slate-400">无导入参考范围。有效范围只能来自已确认的导入范围或平台方案，不能手填第三套。</p>';
    }
    var decision = ind.importedRangeDecision || 'pending';
    var html = '<div class="rw-imported-range mt-3">' +
      '<p class="text-xs font-medium text-slate-600">Excel 导入参考范围</p>' +
      '<p class="mt-1">' + C.escapeHtml(formatImportedRange(ind.importedRange)) +
      ' <span class="ant-tag ' +
      (decision === 'confirmed' ? 'ant-tag-success' : decision === 'rejected' ? 'ant-tag-default' : 'ant-tag-warning') +
      '">' + C.escapeHtml(importedRangeDecisionLabel(decision)) + '</span></p>';
    if (decision === 'rejected') {
      html += '<p class="mt-1 text-xs text-slate-500">已驳回：对比与判定改用平台方案；无匹配平台范围则不展示该项对比。</p>';
    } else if (decision === 'confirmed') {
      html += '<p class="mt-1 text-xs text-slate-500">已确认可用，优先作为本报告有效范围。</p>';
    } else {
      html += '<p class="mt-1 text-xs text-slate-500">待确认期间暂用平台方案（若有）。系统不校验导入范围专业有效性，也不允许手填第三套范围。</p>';
    }
    if (!readonly && decision === 'pending') {
      html += '<div class="mt-2 flex flex-wrap gap-2">' +
        '<button type="button" class="ant-btn ant-btn-primary ant-btn-sm" id="btn-confirm-imported-range">确认可用</button>' +
        '<button type="button" class="ant-btn ant-btn-default ant-btn-sm" id="btn-reject-imported-range">驳回，改用平台范围</button>' +
        '</div>';
    }
    html += '</div>';
    return html;
  }

  function findProduct(state, id) {
    return (state.products || []).find(function (p) { return p.id === id; });
  }

  function unitProductDisabled() {
    return false;
  }

  function renderModuleNav(checks) {
    var nav = el('rw-module-nav');
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
    var panel = el('checks-panel');
    var summary = el('checks-summary');
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

  function submissionTypeLabel(tr) {
    var key = tr && tr.submissionType;
    var map = C.SUBMISSION_TYPE_LABELS || {};
    return map[key] || (key === 'customer_brought' ? '客户自带报告' : '本店送检');
  }

  function latestOp(ops, type) {
    for (var i = 0; i < ops.length; i++) {
      if (ops[i].type === type) return ops[i];
    }
    return null;
  }

  function renderTraceBlock(state, report) {
    var ops = (state.operationRecords || []).filter(function (op) { return op.reportId === report.id; })
      .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    var publishOp = latestOp(ops, 'publish');
    var voidOp = latestOp(ops, 'void');
    var corrOp = latestOp(ops, 'correction_draft');
    var ownOp = latestOp(ops, 'ownership_correction');
    var pubVer = C.getPublishedReportVersion(state, report.id);
    var workVer = C.getWorkingReportVersion(state, report.id);
    var lines = [];

    if (report.status === 'voided') {
      lines.push('已作废' +
        (report.voidedAt ? ' · ' + C.formatDate(report.voidedAt) : '') +
        (voidOp && voidOp.actor ? ' · ' + voidOp.actor : '') +
        (report.voidReason ? ' · ' + report.voidReason : ''));
    } else if (pubVer) {
      lines.push('当前发布版 v' + pubVer.version +
        (pubVer.publishedAt ? ' · ' + C.formatDate(pubVer.publishedAt) : '') +
        (publishOp && publishOp.actor ? ' · ' + publishOp.actor + ' 发布' : ''));
    } else {
      lines.push('尚无发布版本（用户仍见「报告处理中」）');
    }

    if (report.correctionDraftActive && workVer) {
      lines.push('更正草稿 v' + workVer.version + ' 进行中' +
        (workVer.createdAt ? ' · ' + C.formatDate(workVer.createdAt) : '') +
        (corrOp && corrOp.actor ? ' · ' + corrOp.actor : '') +
        (workVer.correctionNote ? ' · ' + workVer.correctionNote : '') +
        '；用户仍读取已发布版本');
    } else if (workVer) {
      lines.push('工作版 v' + workVer.version +
        (workVer.status ? ' · ' + (versionStatusLabels()[workVer.status] || workVer.status) : ''));
    }

    if (ownOp) {
      lines.push('最近纠错 · ' + C.formatDate(ownOp.createdAt) +
        (ownOp.actor ? ' · ' + ownOp.actor : ''));
    }

    return '<div id="rw-report-trace" class="rw-report-trace">' +
      '<h4 class="text-sm font-medium text-slate-800 mb-2"><i class="fas fa-clock-rotate-left text-teal-600 mr-1"></i>本报告追溯</h4>' +
      '<ul class="text-xs text-slate-600 space-y-1.5">' +
      lines.map(function (line) { return '<li>' + C.escapeHtml(line) + '</li>'; }).join('') +
      '</ul></div>';
  }

  function renderCorrectionForm(state, report) {
    if (report.status === 'voided' || !report.petId) return '';
    var petOptions = (state.pets || []).map(function (p) {
      var u = C.lookupUser(state, p.userId);
      return '<option value="' + p.id + '"' + (p.id === report.petId ? ' selected' : '') + '>' +
        C.escapeHtml(p.name + ' · ' + (p.species === 'dog' ? '狗' : '猫') +
          (u ? ' · ' + u.name : ' · 未关联用户')) + '</option>';
    }).join('');
    var userOptions = '<option value="">不指定 / 跟随宠物</option>' + (state.users || []).map(function (u) {
      return '<option value="' + u.id + '"' + (u.id === report.userId ? ' selected' : '') + '>' +
        C.escapeHtml(u.name) + '</option>';
    }).join('');
    return '<div class="mt-4 border rounded p-3 bg-slate-50" id="correction-form">' +
      '<p class="font-medium text-sm mb-1">纠错</p>' +
      '<p class="text-xs text-slate-500 mb-3">身份在送检登记时已确定。此处只修正归错宠物或换错用户，不是从 Excel 做归属。</p>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
      '<div><label class="text-xs text-slate-500">改归宠物</label>' +
      '<select id="own-pet" class="w-full border rounded px-2 py-1 mt-0.5">' + petOptions + '</select></div>' +
      '<div><label class="text-xs text-slate-500">换用户</label>' +
      '<select id="own-user" class="w-full border rounded px-2 py-1 mt-0.5">' + userOptions + '</select></div>' +
      '</div>' +
      '<label class="text-xs text-slate-500 mt-2 block">原因（必填）</label>' +
      '<input id="own-reason" class="w-full border rounded px-2 py-1 mt-0.5" placeholder="说明纠错原因">' +
      '<div class="flex flex-wrap gap-2 mt-2">' +
      '<button type="button" id="btn-correct-pet" class="btn-secondary px-3 py-1.5 rounded text-sm">改归宠物</button>' +
      '<button type="button" id="btn-correct-user" class="btn-secondary px-3 py-1.5 rounded text-sm">换用户</button>' +
      '</div></div>';
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
      '<p><span class="text-slate-500">送检</span><br><code class="text-xs">' + C.escapeHtml(report.testRecordId || '—') + '</code></p>' +
      '<p><span class="text-slate-500">送检类型</span><br>' + C.escapeHtml(submissionTypeLabel(tr)) + '</p>' +
      '<p><span class="text-slate-500">外部报告号</span><br>' + C.escapeHtml(externalReportNumber) + '</p>' +
      '<p><span class="text-slate-500">样本号</span><br>' + C.escapeHtml(sampleNumber) + '</p>' +
      '<p><span class="text-slate-500">机构</span><br>' + C.escapeHtml(testingOrg) + '</p>' +
      '<p><span class="text-slate-500">宠物</span><br>' + C.escapeHtml(pet ? pet.name + ' / ' + (pet.breed || '') : '—') + '</p>' +
      '<p><span class="text-slate-500">用户</span><br>' + C.escapeHtml(user ? user.name : '未关联用户') + '</p>' +
      '<p><span class="text-slate-500">导入文件</span><br>' + C.escapeHtml(fileName) + '</p>' +
      '<p><span class="text-slate-500">上传时间</span><br>' + C.escapeHtml(uploadedAt) + '</p>' +
      '<p><span class="text-slate-500">模板识别</span><br>' + C.escapeHtml(tpl.resultLabel) +
      ' · sheet ' + C.escapeHtml(tpl.sheet) +
      ' · 模板 ' + C.escapeHtml(tpl.templateId) + '</p>' +
      speciesWarn +
      '</div>' +
      renderCorrectionForm(state, report) +
      renderTraceBlock(state, report);

    el('source-panel').innerHTML = html;
  }

  function handleSourceChange(e) {
    if (e.target.id !== 'own-pet') return;
    var pet = C.lookupPet(store.getState(), e.target.value);
    var userSel = el('own-user');
    if (userSel && pet && pet.userId) userSel.value = pet.userId;
  }

  function handleSourceClick(e) {
    var correctPet = e.target.closest('#btn-correct-pet');
    var correctUser = e.target.closest('#btn-correct-user');
    if (!correctPet && !correctUser) return;
    var reasonEl = el('own-reason');
    var reason = reasonEl ? String(reasonEl.value || '').trim() : '';
    if (!reason) {
      C.toast('请填写纠错原因', 'warning');
      return;
    }
    var state = store.getState();
    var report = C.lookupReport(state, currentReportId);
    try {
      if (correctPet) {
        var petId = el('own-pet') && el('own-pet').value;
        if (!petId) {
          C.toast('请选择宠物', 'warning');
          return;
        }
        var pet = C.lookupPet(state, petId);
        var userId = (el('own-user') && el('own-user').value) ||
          (pet && pet.userId) || report.userId;
        if (!userId) {
          C.toast('目标宠物未关联用户，请同时选择用户', 'warning');
          return;
        }
        store.correctOwnership(withActorPayload({
          reportId: currentReportId,
          petId: petId,
          userId: userId,
          reason: reason
        }));
        afterWrite('已改归宠物', 'success');
        return;
      }
      var nextUserId = el('own-user') && el('own-user').value;
      if (!report.petId) {
        C.toast('当前报告未关联宠物', 'warning');
        return;
      }
      store.updateOpsPet(report.petId, withActorPayload({
        userId: nextUserId || null,
        reason: reason
      }));
      afterWrite('已更换关联用户', 'success');
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

    el('assessment-form').innerHTML =
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
      var node = el(id);
      if (!node || node.getAttribute('data-rw-bound')) return;
      node.setAttribute('data-rw-bound', '1');
      node.addEventListener('focus', function () {
        markFormDirty();
        highlightPreview(node.getAttribute('data-preview-target'));
      });
      node.addEventListener('blur', function () {
        clearPreviewHighlight();
      });
      node.addEventListener('input', function () {
        markFormDirty();
        partialUpdate(store.getState());
        highlightPreview(node.getAttribute('data-preview-target'));
      });
    });
  }

  function highlightPreview(target) {
    clearPreviewHighlight();
    if (!target) return;
    root.querySelectorAll('[data-preview-region="' + target + '"]').forEach(function (node) {
      node.classList.add('is-preview-highlight');
    });
  }

  function clearPreviewHighlight() {
    root.querySelectorAll('.is-preview-highlight').forEach(function (node) {
      node.classList.remove('is-preview-highlight');
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
    var suppBtn = el('btn-supplement-result');
    if (suppBtn) suppBtn.classList.toggle('hidden', readonly);

    var listEl = el('indicators-list');
    if (!results.length) {
      listEl.innerHTML = '<p class="text-slate-500 p-2">无匹配结果</p>';
      el('indicator-detail').innerHTML = '';
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
        '<span class="text-xs">' + C.statusBadge(status, C.DATA_STATUS_LABELS) +
        (ind.importedRange && ind.importedRangeDecision === 'pending'
          ? ' <span class="ant-tag ant-tag-warning">导入范围待确认</span>'
          : '') +
        '</span>' +
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
      importedRangeBlockHtml(ind, readonly) +
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

    el('indicator-detail').innerHTML = html;
  }

  function handleResultDetailClick(e) {
    var confirmBtn = e.target.closest('#btn-confirm-imported-range');
    var rejectBtn = e.target.closest('#btn-reject-imported-range');
    if (confirmBtn || rejectBtn) {
      try {
        var updated = store.setImportedRangeDecision(withActorPayload({
          reportId: currentReportId,
          resultId: selectedResultId,
          decision: confirmBtn ? 'confirmed' : 'rejected'
        }));
        if (updated && updated.id) selectedResultId = updated.id;
        afterWrite(confirmBtn ? '已确认导入范围可用' : '已驳回导入范围，改用平台方案', 'success');
      } catch (err) {
        handleStoreError(err);
      }
      return;
    }
    if (!e.target.closest('#btn-save-result')) return;
    var valueEl = el('result-edit-value');
    var statusEl = el('result-edit-status');
    var noticeEl = el('result-edit-notice');
    var reasonEl = el('result-edit-reason');
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
      store.modifyResultValue(withActorPayload({
        reportId: currentReportId,
        resultId: selectedResultId,
        value: value,
        dataStatus: nextStatus,
        labNotice: noticeEl ? noticeEl.value : undefined,
        reason: reason
      }));
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
    var sel = el('supplement-key');
    sel.innerHTML = options.length
      ? options.map(function (t) {
        return '<option value="' + C.escapeHtml(t.key) + '">' + C.escapeHtml((t.label || t.key) + ' (' + t.key + ')') + '</option>';
      }).join('')
      : '<option value="">无可用分类单元</option>';
    el('supplement-value').value = '';
    el('supplement-unit').value = '%';
    el('supplement-datastatus').value = 'PRESENT';
    el('supplement-labnotice').value = 'unmarked';
    el('supplement-reason').value = '';
    el('supplement-modal').classList.remove('hidden');
  }

  function closeSupplementModal() {
    el('supplement-modal').classList.add('hidden');
  }

  function submitSupplement() {
    var key = el('supplement-key').value;
    var reason = el('supplement-reason').value.trim();
    var dataStatus = el('supplement-datastatus').value;
    var raw = el('supplement-value').value;
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
        unit: el('supplement-unit').value || '%',
        labNotice: el('supplement-labnotice').value,
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
    var panel = el('analysis-panel');
    var units = store.getPhylumUnits(report.id) || [];
    var pending = (report.todoFlags || []).indexOf('pending_reanalysis') >= 0;
    var run = C.getLatestAnalysisRun(state, report.id);
    var readonly = !isEditable(report);
    var confirmMap = unitConfirmLabels();

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
      var confirm = confirmMap[unit.confirmStatus] || unit.confirmStatus;
      var cardClass = 'rw-phylum-card' + (unit.confirmStatus === 'invalidated' ? ' is-invalidated' : '');
      var hits = unit.hits || [];
      var adopted = hits.filter(function (hit) { return !hit.excluded && hit.combineStatus === 'primary'; }).length;
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
        '<span class="text-xs px-2 py-0.5 rounded bg-slate-100">采用 ' + adopted + ' 条命中</span>' +
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
      C.confirmDialog('运行分析将按当前有效结果与启用规则重算命中。人工草稿不会被覆盖。', function () {
        formInteracting = true;
        if (!persistWorkbench(true)) {
          formInteracting = false;
          C.toast('综合评定校验未通过，无法运行分析', 'warning');
          return;
        }
        try {
          store.runReportAnalysis(currentReportId, actorOptions());
          afterWrite('分析运行完成', 'success');
        } catch (err) {
          formInteracting = false;
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
      var analysisEl = el('unit-analysis-' + key);
      var adviceEl = el('unit-advice-' + key);
      try {
        store.savePhylumUnitDraft(currentReportId, key, {
          analysis: analysisEl ? analysisEl.value : '',
          advice: adviceEl ? adviceEl.value : ''
        });
        captureProfessionalBaseline();
        afterWrite('已保存草稿（状态回到未确认）', 'success');
      } catch (err) {
        handleStoreError(err);
      }
      return;
    }
    var confirmBtn = e.target.closest('.rw-confirm-unit');
    if (confirmBtn) {
      var ckey = confirmBtn.getAttribute('data-phylum');
      var aEl = el('unit-analysis-' + ckey);
      var dEl = el('unit-advice-' + ckey);
      try {
        var unit = currentUnit(ckey);
        if (unit && aEl && dEl &&
            (aEl.value !== (unit.analysisDraft || '') || dEl.value !== (unit.adviceDraft || ''))) {
          store.savePhylumUnitDraft(currentReportId, ckey, { analysis: aEl.value, advice: dEl.value });
        }
        store.confirmPhylumUnit(currentReportId, ckey, actorOptions());
        captureProfessionalBaseline();
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
    var panel = el('recommendations-panel');
    var units = store.getPhylumUnits(report.id) || [];
    var productEditable = canConfigureProducts(report);
    var productBtn = el('btn-save-products');
    if (productBtn) {
      productBtn.classList.toggle('hidden', !productEditable || !hasProductSessionDirty());
    }
    if (!units.length) {
      panel.innerHTML = '<p class="text-slate-500">暂无菌门分析单元。</p>';
      return;
    }
    panel.innerHTML = units.map(function (unit) {
      var disabled = unitProductDisabled(unit);
      var advice = String(unit.adviceDraft || '').trim();
      var summary = advice ? advice.slice(0, 40) + (advice.length > 40 ? '…' : '') : '（无建议）';
      var prod = sessionProducts(unit.phylumKey);
      var sessionDirty = productSession[unit.phylumKey] && !productsEqual(productSession[unit.phylumKey], savedProducts(unit));
      var primary = findProduct(state, prod.primaryProductId);
      var related = (prod.relatedProductIds || []).map(function (pid, idx) {
        var p = findProduct(state, pid);
        return '<span class="rw-related-chip">' + C.escapeHtml(p ? p.name : pid) +
          (productEditable && !disabled
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
          (prod.primaryProductId ? availabilityTag(prod.primaryProductId) : '') +
          (sessionDirty ? '<span class="rw-session-tag">未保存</span>' : '') +
          (productEditable
            ? '<button type="button" class="rw-pick-product ant-btn ant-btn-default ant-btn-sm" data-phylum="' + unit.phylumKey + '" data-slot="primary">选择</button>' +
              (primary ? '<button type="button" class="rw-clear-primary ant-btn ant-btn-link ant-btn-sm" data-phylum="' + unit.phylumKey + '">清除</button>' : '')
            : '') +
          '</div></div>' +
          '<div><span class="text-xs text-slate-500">关联商品（' + (prod.relatedProductIds || []).length + '/3）</span>' +
          '<div class="flex flex-wrap gap-1 mt-0.5">' + (related || '<span class="text-xs text-slate-400">无</span>') +
          (productEditable && (prod.relatedProductIds || []).length < 3
            ? '<button type="button" class="rw-pick-product ant-btn ant-btn-default ant-btn-sm" data-phylum="' + unit.phylumKey + '" data-slot="related">+ 添加</button>'
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
    var report = C.lookupReport(store.getState(), currentReportId);
    if (!report || !canConfigureProducts(report)) return;

    var pickBtn = e.target.closest('.rw-pick-product');
    if (pickBtn) {
      openProductPicker(pickBtn.getAttribute('data-phylum'), pickBtn.getAttribute('data-slot'));
      return;
    }
    var clearBtn = e.target.closest('.rw-clear-primary');
    if (clearBtn) {
      var unit = currentUnit(clearBtn.getAttribute('data-phylum'));
      if (!unit) return;
      var sess = sessionProducts(unit.phylumKey);
      productSession[unit.phylumKey] = {
        primaryProductId: null,
        relatedProductIds: (sess.relatedProductIds || []).slice()
      };
      syncDirtyState();
      renderRecommendationsPanel(store.getState(), report);
      updatePreview(store.getState());
      return;
    }
    var removeBtn = e.target.closest('.rw-rec-remove-related');
    if (removeBtn) {
      var u2 = currentUnit(removeBtn.getAttribute('data-phylum'));
      if (!u2) return;
      var base = sessionProducts(u2.phylumKey);
      var related = (base.relatedProductIds || []).slice();
      related.splice(parseInt(removeBtn.getAttribute('data-idx'), 10), 1);
      productSession[u2.phylumKey] = {
        primaryProductId: base.primaryProductId,
        relatedProductIds: related
      };
      syncDirtyState();
      renderRecommendationsPanel(store.getState(), report);
      updatePreview(store.getState());
    }
  }

  function openProductPicker(phylumKey, slot) {
    var report = C.lookupReport(store.getState(), currentReportId);
    if (!report || !canConfigureProducts(report)) {
      C.toast('当前不可配置商品', 'warning');
      return;
    }
    pickerState = { phylumKey: phylumKey, slot: slot, page: 1 };
    el('picker-title').textContent = slot === 'primary' ? '选择主推商品' : '选择关联商品';
    var state = store.getState();
    var catSel = el('picker-category');
    catSel.innerHTML = '<option value="">全部分类</option>' +
      (state.categories || []).map(function (c) {
        return '<option value="' + c.id + '">' + C.escapeHtml(c.name) + '</option>';
      }).join('');
    el('picker-search').value = '';
    el('picker-status').value = '';
    el('product-picker-modal').classList.remove('hidden');
    renderProductPickerList(state);
  }

  function closeProductPicker() {
    el('product-picker-modal').classList.add('hidden');
  }

  function renderProductPickerList(state) {
    var unit = currentUnit(pickerState.phylumKey);
    var includeIds = [];
    if (unit) {
      if (unit.primaryProductId) includeIds.push(unit.primaryProductId);
      (unit.relatedProductIds || []).forEach(function (id) { includeIds.push(id); });
    }
    var result = store.searchProductsForPicker(state, {
      q: el('picker-search').value,
      categoryId: el('picker-category').value || null,
      status: el('picker-status').value || null,
      page: pickerState.page,
      pageSize: 8,
      includeProductIds: includeIds
    });
    var labels = productStatusLabels();
    var list = el('picker-list');
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
    var pag = el('picker-pagination');
    pag.innerHTML = '<span>共 ' + result.total + ' 项</span><span>' +
      (pickerState.page > 1 ? '<button type="button" data-page="' + (pickerState.page - 1) + '" class="text-teal-700 mx-1">上一页</button>' : '') +
      pickerState.page + ' / ' + totalPages +
      (pickerState.page < totalPages ? '<button type="button" data-page="' + (pickerState.page + 1) + '" class="text-teal-700 mx-1">下一页</button>' : '') +
      '</span>';
  }

  function selectPickerProduct(productId) {
    var unit = currentUnit(pickerState.phylumKey);
    if (!unit) return;
    var sess = sessionProducts(unit.phylumKey);
    var next = {
      primaryProductId: sess.primaryProductId,
      relatedProductIds: (sess.relatedProductIds || []).slice()
    };
    try {
      if (pickerState.slot === 'primary') {
        next.primaryProductId = productId;
      } else {
        if (next.relatedProductIds.indexOf(productId) < 0 && next.relatedProductIds.length < 3 && productId !== next.primaryProductId) {
          next.relatedProductIds.push(productId);
        }
      }
      productSession[unit.phylumKey] = next;
      closeProductPicker();
      syncDirtyState();
      var state = store.getState();
      renderRecommendationsPanel(state, C.lookupReport(state, currentReportId));
      updatePreview(state);
    } catch (err) {
      handleStoreError(err);
    }
  }

  function syncPreviewVersionToggle(state) {
    var report = C.lookupReport(state, currentReportId);
    var toggleWrap = el('versions-toggle-wrap');
    if (!toggleWrap) return;
    var showToggle = !!(report && report.status === 'published' && report.correctionDraftActive);
    toggleWrap.classList.toggle('hidden', !showToggle);
    if (!showToggle) versionView = 'working';
    var workingBtn = el('ver-toggle-working');
    var publishedBtn = el('ver-toggle-published');
    if (workingBtn) workingBtn.classList.toggle('active', versionView !== 'published');
    if (publishedBtn) publishedBtn.classList.toggle('active', versionView === 'published');
  }

  function getPreviewFormValues() {
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

  function dimQual(score) {
    if (score == null || score === '') return '';
    var n = Number(score);
    if (isNaN(n)) return '';
    if (n >= 70) return '<span class="rw-qual is-strong">强健</span>';
    if (n >= 40) return '<span class="rw-qual is-mid">中等</span>';
    return '<span class="rw-qual is-weak">偏弱</span>';
  }

  function resultByKey(results, key) {
    return (results || []).find(function (r) { return r.key === key; }) || null;
  }

  function pillHtml(results, key, label) {
    var ind = resultByKey(results, key);
    var raw = ind && (ind.effectiveValue != null && ind.effectiveValue !== '' ? ind.effectiveValue : ind.value);
    var missing = raw == null || raw === '';
    return '<div class="rw-hero-pill"><span class="rw-hero-pill-num' + (missing ? ' is-empty' : '') + '">' +
      (missing ? '暂无有效结果' : C.escapeHtml(formatNum(raw))) +
      '</span><span class="rw-hero-pill-label">' + C.escapeHtml(label) + '</span></div>';
  }

  function bindPreviewReading(root) {
    if (!root) return;
    function activate(scope, btnSel, keyAttr, panelSel, panelAttr, key) {
      scope.querySelectorAll(btnSel).forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute(keyAttr) === key);
      });
      scope.querySelectorAll(panelSel).forEach(function (panel) {
        panel.hidden = panel.getAttribute(panelAttr) !== key;
      });
    }
    root.querySelectorAll('[data-compare-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activate(root, '[data-compare-tab]', 'data-compare-tab', '[data-compare-panel]', 'data-compare-panel', btn.getAttribute('data-compare-tab'));
      });
    });
    root.querySelectorAll('[data-phylum-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activate(root, '[data-phylum-tab]', 'data-phylum-tab', '[data-phylum-panel]', 'data-phylum-panel', btn.getAttribute('data-phylum-tab'));
      });
    });
    root.querySelectorAll('[data-advice-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = btn.closest('[data-phylum-panel]') || root;
        activate(panel, '[data-advice-tab]', 'data-advice-tab', '[data-advice-panel]', 'data-advice-panel', btn.getAttribute('data-advice-tab'));
      });
    });
    root.querySelectorAll('[data-scroll-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = root.querySelector('#' + btn.getAttribute('data-scroll-target'));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function unitsWithSessionProducts(units) {
    return (units || []).map(function (unit) {
      var sess = productSession[unit.phylumKey];
      if (!sess) return unit;
      return Object.assign({}, unit, {
        primaryProductId: sess.primaryProductId,
        relatedProductIds: (sess.relatedProductIds || []).slice()
      });
    });
  }

  function updatePreview(state) {
    var report = C.lookupReport(state, currentReportId);
    if (!report) return;
    var vals = getPreviewFormValues();
    var data = getPreviewData(state, report);
    if (!data.fromSnapshot) {
      data.units = unitsWithSessionProducts(data.units);
    }
    var pet = C.lookupPet(state, report.petId);
    var petName = pet ? pet.name : 'TA';
    var species = data.fromSnapshot ? data.species : (vals.species || data.species);
    var level = data.fromSnapshot ? (data.assessment.healthLevel || '') : vals.level;
    var percentile = data.fromSnapshot ? (data.assessment.percentile != null ? data.assessment.percentile : '') : vals.percentile;
    var emotion = data.fromSnapshot
      ? ((data.assessment.platformDimensions && data.assessment.platformDimensions.emotion) || '')
      : vals.emotion;
    var immunity = data.fromSnapshot
      ? ((data.assessment.platformDimensions && data.assessment.platformDimensions.immunity) || '')
      : vals.immunity;
    var levelTheme = HEALTH_LEVEL_THEMES[level] || '草原';
    var themeClass = 'theme-' + (level || 'C');
    var viewTag = versionView === 'published' && report.correctionDraftActive ? '发布版预览' : '工作版预览';
    var speciesNoun = species === 'dog' ? '狗狗' : '猫咪';
    var catalogPhyla = ((state.professionalCatalog && state.professionalCatalog.microbiotaTaxa) || [])
      .filter(function (t) { return t.level === 'phylum'; });
    var phylumKeys = {};
    catalogPhyla.forEach(function (t) { phylumKeys[t.key] = true; });

    var html = '<div class="rw-scroll-report ' + themeClass + '">';
    html += '<section class="rw-report-hero">';
    html += '<p class="rw-hero-hi">Hi, ' + C.escapeHtml(petName) + '</p>';
    html += '<p class="rw-hero-grade" data-preview-region="level" data-preview-focus="assess-level" data-preview-module="assessment">TA的健康综合评分 <strong>' +
      C.escapeHtml(level || '—') + '等</strong> (' + C.escapeHtml(levelTheme) + ')</p>';
    html += '<div class="rw-hero-pills" data-preview-region="score" data-preview-focus="assess-score" data-preview-module="assessment">';
    html += pillHtml(data.results, 'alpha-diversity', 'Alpha多样性');
    html += pillHtml(data.results, 'evenness', '均匀度');
    html += pillHtml(data.results, 'richness', '丰富度');
    html += '</div>';
    html += '<div class="rw-hero-dims">';
    html += '<div class="rw-dim-card" data-preview-region="emotion" data-preview-focus="assess-emotion" data-preview-module="assessment"><span>情绪</span><strong>' +
      C.escapeHtml(String(emotion === '' || emotion == null ? '—' : emotion)) + '</strong>' + dimQual(emotion) + '</div>';
    html += '<div class="rw-dim-card" data-preview-region="immunity" data-preview-focus="assess-immunity" data-preview-module="assessment"><span>免疫</span><strong>' +
      C.escapeHtml(String(immunity === '' || immunity == null ? '—' : immunity)) + '</strong>' + dimQual(immunity) + '</div>';
    html += '</div>';
    if (percentile !== '' && percentile != null) {
      html += '<div class="rw-hero-percentile" data-preview-region="percentile" data-preview-focus="assess-percentile" data-preview-module="assessment">优于 <strong>' +
        C.escapeHtml(String(percentile)) + '%</strong> 的' + speciesNoun + '</div>';
    }
    html += '<button type="button" class="rw-hero-more" data-scroll-target="rw-report-sheet">详细 <i class="fas fa-chevron-down"></i></button>';
    html += '</section>';

    html += '<div class="rw-report-sheet" id="rw-report-sheet">';
    if (data.hasRange) {
      var phylumRows = data.results.filter(function (r) {
        return phylumKeys[r.key] && r.range && r.rangeSource && r.rangeSource !== 'none';
      });
      var genusRows = data.results.filter(function (r) {
        return !phylumKeys[r.key] && r.range && r.rangeSource && r.rangeSource !== 'none' &&
          r.key !== 'alpha-diversity' && r.key !== 'evenness' && r.key !== 'richness';
      });
      if (store.sortBySchemeItemOrder && store.getActiveRangeSchemeForReport) {
        var scheme = store.getActiveRangeSchemeForReport(report.id);
        if (scheme) {
          phylumRows = store.sortBySchemeItemOrder(phylumRows, scheme);
          genusRows = store.sortBySchemeItemOrder(genusRows, scheme);
        }
      }
      html += '<section class="rw-compare-block" data-preview-region="compare">';
      html += '<h3>微生物组对比</h3><p>理想菌群组合 VS ' + C.escapeHtml(petName) + '</p>';
      html += '<div class="rw-seg"><button type="button" class="rw-seg-btn active" data-compare-tab="phylum">「门」检测数值</button>';
      html += '<button type="button" class="rw-seg-btn" data-compare-tab="genus">「属」检测数值</button></div>';
      html += '<div data-compare-panel="phylum">';
      phylumRows.forEach(function (ind) {
        html += '<div class="rw-cmp-row"><span>' + C.escapeHtml(taxonLabel(state, ind.key)) + '</span><strong>' +
          C.escapeHtml(formatNum(ind.effectiveValue)) + (ind.unit || '') + '</strong>' + compareBarHtml(ind) + '</div>';
      });
      html += '</div><div data-compare-panel="genus" hidden>';
      genusRows.forEach(function (ind) {
        html += '<div class="rw-cmp-row"><span>' + C.escapeHtml(taxonLabel(state, ind.key)) + '</span><strong>' +
          C.escapeHtml(formatNum(ind.effectiveValue)) + (ind.unit || '') + '</strong>' + compareBarHtml(ind) + '</div>';
      });
      html += '</div></section>';
    }

    var units = data.units || [];
    if (units.length) {
      html += '<section class="rw-phylum-block">';
      html += '<div class="rw-phylum-tabs">';
      units.forEach(function (unit, idx) {
        html += '<button type="button" class="rw-phylum-tab' + (idx === 0 ? ' active' : '') + '" data-phylum-tab="' +
          C.escapeHtml(unit.phylumKey) + '">' + C.escapeHtml(taxonLabel(state, unit.phylumKey)) + '</button>';
      });
      html += '</div>';
      units.forEach(function (unit, idx) {
        var primary = unit.primaryProductId ? findProduct(state, unit.primaryProductId) : null;
        var analysis = unit.analysisDraft || unit.analysis || '';
        var advice = unit.adviceDraft || unit.advice || '';
        var hero = resultByKey(data.results, unit.phylumKey);
        html += '<div class="rw-phylum-panel" data-phylum-panel="' + C.escapeHtml(unit.phylumKey) + '"' + (idx === 0 ? '' : ' hidden') + '>';
        html += '<div class="rw-phylum-hero"><div class="rw-phylum-name">' + C.escapeHtml(taxonLabel(state, unit.phylumKey)) +
          '</div><div class="rw-phylum-value">' +
          C.escapeHtml(hero && hero.dataStatus === 'NOT_DETECTED' ? '未检出' : formatNum(hero && hero.effectiveValue)) +
          (hero && hero.dataStatus !== 'NOT_DETECTED' && hero && hero.effectiveValue != null ? '%' : '') +
          '</div>';
        if (hero && hero.range) html += '<div class="rw-phylum-range">正常范围: ' + C.escapeHtml(formatRange(hero)) + '</div>';
        html += '</div>';
        if (analysis || advice || primary) {
          html += '<div class="rw-advice-tabs">';
          html += '<button type="button" class="rw-advice-tab" data-advice-tab="analysis">分析</button>';
          html += '<button type="button" class="rw-advice-tab active" data-advice-tab="advice">总体建议</button></div>';
          html += '<div class="rw-advice-panel" data-advice-panel="analysis" hidden><p>' + C.escapeHtml(analysis || '暂无分析') + '</p></div>';
          html += '<div class="rw-advice-panel" data-advice-panel="advice">';
          if (advice) html += '<p>' + C.escapeHtml(advice) + '</p>';
          if (primary) html += '<div class="rw-mini-product">' + C.escapeHtml(primary.name) + '</div>';
          if (!advice && !primary) html += '<p>暂无建议</p>';
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</section>';
    }
    html += '</div>';
    html += '<div class="rw-mini-badge">' + C.escapeHtml(viewTag) + '</div>';
    html += '</div>';

    var host = el('preview-content');
    host.innerHTML = html;
    bindPreviewReading(host);
  }

  function partialUpdate(state) {
    if (!isTabActive()) return;
    lastChecks = C.buildPublicationChecks(state, currentReportId);
    renderModuleNav(lastChecks);
    renderChecksPanel(lastChecks);
    updatePreview(state);
    syncDirtyState();
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
    if (!isTabActive()) return;
    var reports = (state.reports || []).slice().sort(function (a, b) {
      return String(a.reportNumber || '').localeCompare(String(b.reportNumber || ''));
    });
    var select = el('select-report');
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
      el('source-panel').innerHTML = '<p class="text-slate-500">请选择报告。</p>';
      el('action-bar').innerHTML = '';
      switchModule('source');
      return;
    }

    if (lastRenderedReportId !== report.id) {
      activeModule = defaultModuleForReport(report);
      lastRenderedReportId = report.id;
      selectedResultId = null;
      expandedHits = {};
      resetProductSession();
      if (!(report.status === 'published' && report.correctionDraftActive)) versionView = 'working';
    }

    el('report-status-badge').innerHTML = statusLabelHtml(report);
    el('version-badges').innerHTML =
      '工作版 v' + (report.workingVersion || '—') +
      ' · 发布版 v' + (report.publishedVersion != null ? report.publishedVersion : '—');

    var rejectBanner = el('reject-banner');
    if (report.status === 'incomplete' && report.rejectReason) {
      rejectBanner.classList.remove('hidden');
      el('reject-reason-text').textContent = report.rejectReason;
    } else {
      rejectBanner.classList.add('hidden');
    }

    var corrBanner = el('correction-banner');
    if (report.correctionDraftActive) {
      corrBanner.classList.remove('hidden');
      el('correction-pub-ver').textContent = report.publishedVersion != null ? report.publishedVersion : '—';
    } else {
      corrBanner.classList.add('hidden');
    }

    bindActionBar(state, report);
    renderSourcePanel(state, report);
    renderAssessmentForm(state, report);
    renderIndicatorsPanel(state);
    renderAnalysisPanel(state, report);
    renderRecommendationsPanel(state, report);
    syncPreviewVersionToggle(state);

    lastChecks = C.buildPublicationChecks(state, report.id);
    renderModuleNav(lastChecks);
    renderChecksPanel(lastChecks);
    switchModule(activeModule);
    updatePreview(state);

    if (pendingFocusTrace) {
      pendingFocusTrace = false;
      var traceEl = el('rw-report-trace');
      if (traceEl && typeof traceEl.scrollIntoView === 'function') {
        traceEl.scrollIntoView({ block: 'nearest' });
      }
    }

    if (!formInteracting) captureProfessionalBaseline();
    syncDirtyState();

    if (C.enhanceDom) C.enhanceDom(root.querySelector('#report-review') || root);
  }

  bindStaticEvents();
  render(store.getState());

  if (tab && typeof window.__petAdminRegisterTabHooks === 'function') {
    window.__petAdminRegisterTabHooks(tab.id, {
      activate: onTabActivate,
      deactivate: onTabDeactivate,
      canLeave: confirmDiscardWorkbench
    });
  }

  return function teardown() {
    if (typeof unsub === 'function') {
      unsub();
      unsub = null;
    }
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    resizing = false;
    if (resizer) resizer.classList.remove('is-dragging');
  };
}
