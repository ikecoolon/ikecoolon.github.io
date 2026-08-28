function initReportReview() {
  var C = window.PetAdminCommon;
  var HEALTH_LEVEL_THEMES = { A: '雨林', B: '森林', C: '草原', D: '苔藓', E: '沙漠' };
  var store = C.store();
  var ds = window.dictionaryDataService;
  var route = C.parseRoute();
  var currentReportId = route.params.reportId || 'report-002';
  var formInteracting = false;
  var lastChecks = { blockers: [], warnings: [] };
  var activeModule = 'source';
  var selectedIndicatorId = null;
  var resultsSearch = '';
  var resultsFilters = { abnormal: true, missing: true, modified: true };
  var previewTab = 'overview';
  var previewCollapsed = false;
  var versionView = 'working';
  var pickerState = { recId: null, slot: 'primary', page: 1, relatedIndex: -1 };
  var lastRenderedReportId = null;

  var MODULES = [
    { id: 'source', label: '来源与归属', icon: 'fa-link' },
    { id: 'results', label: '检测结果', icon: 'fa-vial' },
    { id: 'assessment', label: '综合评定', icon: 'fa-sliders' },
    { id: 'analysis', label: '分析解释', icon: 'fa-microscope' },
    { id: 'recommendations', label: '健康建议与推荐', icon: 'fa-lightbulb' },
    { id: 'checks', label: '发布检查', icon: 'fa-clipboard-check' },
    { id: 'versions', label: '版本与记录', icon: 'fa-clock-rotate-left' }
  ];

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

  var PRODUCT_STATUS_LABELS = {
    on_sale: '在售',
    off_shelf: '下架',
    zero_stock: '缺货',
    recycled: '回收'
  };

  var REC_AVAIL_LABELS = {
    AVAILABLE: '可展示',
    ZERO_STOCK: '零库存',
    UNAVAILABLE: '不可用',
    NO_CANDIDATES: '无候选'
  };

  var unsub = C.subscribeDemo(function () {
    if (!formInteracting) render(store.getState());
    else partialUpdate(store.getState());
  });
  window.__petAdminPageTeardown = function () {
    unsub();
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
  };

  bindStaticEvents();
  render(store.getState());

  function actorLabel() {
    return '审核员';
  }

  function bindStaticEvents() {
    document.getElementById('select-report').addEventListener('change', function () {
      formInteracting = false;
      currentReportId = this.value;
      selectedIndicatorId = null;
      C.navigate('report-review', { reportId: currentReportId });
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

    document.getElementById('btn-reanalysis-data').addEventListener('click', function () {
      if (!currentReportId) return;
      C.confirmDialog('确认模拟数据变更？将标记待重新分析。', function () {
        store.updateAnalysisState(function (state) {
          var report = state.reports.find(function (r) { return r.id === currentReportId; });
          if (!report) return;
          if (!report.todoFlags) report.todoFlags = [];
          if (report.todoFlags.indexOf('pending_reanalysis') < 0) {
            report.todoFlags.push('pending_reanalysis');
          }
        });
        C.toast('已标记待重新分析', 'warning');
        formInteracting = false;
        render(store.getState());
      });
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
    });
    document.getElementById('ver-toggle-published').addEventListener('click', function () {
      versionView = 'published';
      document.getElementById('ver-toggle-published').classList.add('active');
      document.getElementById('ver-toggle-working').classList.remove('active');
      renderVersionsPanel(store.getState());
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

    var resizer = document.getElementById('rw-preview-resizer');
    var resizing = false;
    resizer.addEventListener('mousedown', function (e) {
      resizing = true;
      resizer.classList.add('is-dragging');
      e.preventDefault();
    });
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
      resizer.classList.remove('is-dragging');
    }
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
    document.getElementById('indicators-list').addEventListener('click', function (e) {
      var row = e.target.closest('[data-indicator-id]');
      if (!row) return;
      selectedIndicatorId = row.getAttribute('data-indicator-id');
      renderIndicatorsPanel(store.getState());
    });
  }

  function defaultModuleForReport(report) {
    if (!report) return 'source';
    var wf = report.workflowStatus || store.getWorkflowStatus(report.id);
    if (wf === 'unassigned' || wf === 'incomplete' || report.status === 'draft' || report.status === 'rejected') {
      return 'source';
    }
    if (wf === 'published' || report.status === 'published') return 'versions';
    if (report.status === 'pending_review' || wf === 'pending_review') return 'checks';
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
    var data = collectAssessmentFromForm();
    var errors = C.validateAssessmentInput(data);
    if (errors.length) {
      if (!silent) C.toast(errors.join('；'), 'warning');
      return false;
    }
    C.saveReportAssessment(currentReportId, {
      reportSpecies: data.reportSpecies,
      healthLevel: data.healthLevel || null,
      healthScore: data.healthScore === '' ? null : Number(data.healthScore),
      percentile: data.percentile === '' ? null : Number(data.percentile),
      summary: data.summary,
      platformDimensions: data.platformDimensions
    }, actorLabel());
    return true;
  }

  function saveAnalysisFromForm(silent) {
    if (!currentReportId) return true;
    var pro = document.getElementById('analysis-professional');
    var con = document.getElementById('analysis-consumer');
    var adv = document.getElementById('analysis-advice');
    if (!pro) return true;
    try {
      C.saveAnalysisFinalContent(currentReportId, {
        professional: pro.value,
        consumer: con ? con.value : '',
        healthAdvice: adv ? adv.value : ''
      }, actorLabel());
      return true;
    } catch (e) {
      if (!silent) C.toast(e.message || '保存失败', 'error');
      return false;
    }
  }

  function saveDraft() {
    var okA = saveAssessmentFromForm(true);
    var okB = saveAnalysisFromForm(true);
    if (!okA) {
      C.toast('综合评定校验未通过', 'warning');
      return;
    }
    if (!okB) return;
    C.saveReviewDraft(currentReportId, {
      assessment: collectAssessmentFromForm(),
      savedAt: new Date().toISOString()
    });
    formInteracting = false;
    C.toast('已暂存评定与分析', 'success');
    render(store.getState());
  }

  function runWithChecks(actionLabel, callback) {
    saveAssessmentFromForm(true);
    saveAnalysisFromForm(true);
    var checks = C.buildPublicationChecks(store.getState(), currentReportId);
    lastChecks = checks;
    if (checks.blockers.length) {
      C.toast('存在阻断项，无法' + actionLabel, 'error');
      switchModule('checks');
      renderChecksPanel(checks);
      renderModuleNav(checks);
      return;
    }
    if (checks.warnings.length) {
      var warnText = '仍有 ' + checks.warnings.length + ' 项警告，确认继续' + actionLabel + '？\n' +
        checks.warnings.slice(0, 5).map(function (w) { return '· ' + w.message; }).join('\n') +
        (checks.warnings.length > 5 ? '\n…等' + checks.warnings.length + ' 项' : '');
      C.confirmDialog(warnText, callback);
      return;
    }
    callback();
  }

  function withdrawReport(reportId) {
    store.updateAnalysisState(function (state) {
      var report = state.reports.find(function (r) { return r.id === reportId; });
      if (!report) return;
      report.status = 'draft';
      report.workflowStatus = 'incomplete';
      report.updatedAt = new Date().toISOString();
      var ver = report.versions[report.versions.length - 1];
      if (ver) ver.status = 'draft';
      var tr = state.testRecords.find(function (t) { return t.id === report.testRecordId; });
      if (tr) {
        tr.status = 'import_failed';
        tr.updatedAt = new Date().toISOString();
      }
    });
  }

  function approveAndPublish(reportId) {
    store.approveReport(reportId);
    store.publishReport(reportId, { actor: actorLabel() });
  }

  function bindActionBar(state, report) {
    var bar = document.getElementById('action-bar');
    bar.innerHTML = '';
    if (!report) return;

    function addBtn(id, label, cls, icon, handler, hidden) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = id;
      btn.className = (cls || 'btn-secondary') + ' px-3 py-1.5 rounded-md text-sm';
      btn.innerHTML = '<i class="fas ' + icon + ' mr-1"></i>' + label;
      btn.onclick = handler;
      if (hidden) btn.classList.add('hidden');
      bar.appendChild(btn);
    }

    addBtn('btn-save-draft', '暂存', 'btn-secondary', 'fa-floppy-disk', saveDraft);

    var isCorrection = report.correctionDraftActive;
    var workVer = C.getWorkingReportVersion(state, report.id);

    if (!isCorrection) {
      if (report.status === 'draft' || report.status === 'rejected') {
        addBtn('btn-submit', report.status === 'rejected' ? '重新提交审核' : '提交审核', 'btn-primary', 'fa-paper-plane', function () {
          if (!saveAssessmentFromForm()) return;
          saveAnalysisFromForm(true);
          store.submitReport(report.id);
          C.toast('已提交审核', 'success');
          formInteracting = false;
          activeModule = 'checks';
          render(store.getState());
        });
      }
      if (report.status === 'pending_review') {
        addBtn('btn-withdraw', '撤回', 'border border-slate-300 text-slate-700 hover:bg-slate-50', 'fa-arrow-rotate-left', function () {
          C.confirmDialog('确认撤回至草稿？', function () {
            saveDraft();
            withdrawReport(report.id);
            C.toast('已撤回至草稿', 'info');
            formInteracting = false;
            activeModule = 'source';
            render(store.getState());
          });
        });
      }
      addBtn('btn-reject', '退回完善', 'border border-red-300 text-red-700 hover:bg-red-50', 'fa-undo', function () {
        C.promptDialog('退回原因', '请填写退回原因（必填）', function (reason) {
          saveAssessmentFromForm();
          C.rejectReportToIncomplete(report.id, reason, actorLabel());
          C.toast('已退回待完善', 'warning');
          formInteracting = false;
          render(store.getState());
        });
      }, report.status === 'published');
      addBtn('btn-approve-publish', '审核通过并发布', 'btn-primary', 'fa-check-double', function () {
        if (!saveAssessmentFromForm()) return;
        if (!saveAnalysisFromForm()) return;
        runWithChecks('审核通过并发布', function () {
          approveAndPublish(report.id);
          C.toast('报告已审核通过并发布', 'success');
          formInteracting = false;
          activeModule = 'versions';
          render(store.getState());
        });
      }, report.status === 'published');
    } else {
      addBtn('btn-reject-correction', '退回更正', 'border border-red-300 text-red-700 hover:bg-red-50', 'fa-undo', function () {
        C.promptDialog('退回更正原因', '请填写原因', function (reason) {
          saveAssessmentFromForm();
          C.reviewCorrectionDraft(report.id, 'rejected', reason, actorLabel());
          C.toast('更正草稿已退回', 'warning');
          formInteracting = false;
          render(store.getState());
        });
      });
      addBtn('btn-approve-correction', '审核通过更正', 'btn-primary', 'fa-check', function () {
        if (!saveAssessmentFromForm()) return;
        runWithChecks('通过更正', function () {
          C.reviewCorrectionDraft(report.id, 'approved', null, actorLabel());
          C.toast('更正草稿已审核通过，可发布', 'success');
          formInteracting = false;
          render(store.getState());
        });
      }, workVer && workVer.correctionReviewStatus === 'approved');
      addBtn('btn-publish-correction', '发布更正', 'btn-primary', 'fa-share-from-square', function () {
        if (!workVer || workVer.correctionReviewStatus !== 'approved') {
          C.toast('请先审核通过更正草稿', 'warning');
          return;
        }
        if (!saveAssessmentFromForm()) return;
        runWithChecks('发布更正', function () {
          store.publishCorrection(report.id, { actor: actorLabel() });
          C.toast('更正已发布，用户可见版本已替换', 'success');
          formInteracting = false;
          render(store.getState());
        });
      }, !workVer || workVer.correctionReviewStatus !== 'approved');
    }
  }

  function runMockAnalysis(reportId) {
    return store.updateAnalysisState(function (state) {
      var report = state.reports.find(function (r) { return r.id === reportId; });
      if (!report) throw new Error('report not found');
      var findings = (state.findings || []).filter(function (f) { return f.reportId === reportId; });
      var species = C.getReportSpeciesForChecks(state, report);
      var indicators = ds && ds.getCurrentIndicatorsForReport
        ? ds.getCurrentIndicatorsForReport(state, reportId)
        : C.getCurrentIndicators(state, report.testRecordId);

      var prof = findings.map(function (f) { return f.professional; }).filter(Boolean);
      var cons = findings.map(function (f) { return f.consumer; }).filter(Boolean);
      var adv = findings.map(function (f) { return f.description || f.consumer; }).filter(Boolean);

      if (!prof.length && indicators.length) {
        prof.push('基于 ' + indicators.length + ' 项指标的综合分析（原型模拟）。');
        cons.push('检测数据已录入，请结合参考范围综合判断。');
      }

      var combined = {
        primaryFindings: findings.map(function (f) {
          return { ruleName: f.indicatorKey, professional: f.professional, consumer: f.consumer };
        }),
        supplementaryFindings: [],
        professional: prof.join('\n'),
        consumer: cons.join('\n'),
        healthAdvice: adv.join('\n')
      };

      var runId = 'run-' + Date.now();
      var run = {
        id: runId,
        reportId: reportId,
        createdAt: new Date().toISOString(),
        inputSnapshot: {
          indicatorSignature: indicators.map(function (i) { return i.key + ':' + i.dataStatus; }).join('|'),
          species: species,
          workingVersion: report.workingVersion
        },
        rawHits: findings.map(function (f, idx) {
          return {
            id: 'hit-' + idx,
            ruleName: f.indicatorKey || '发现',
            matched: true,
            output: { professional: f.professional, consumer: f.consumer, healthAdvice: f.description }
          };
        }),
        combinedResult: combined,
        adjustments: {
          excludedHits: [],
          manualFindings: [],
          finalContent: {
            professional: combined.professional,
            consumer: combined.consumer,
            healthAdvice: combined.healthAdvice,
            updatedAt: new Date().toISOString()
          }
        }
      };

      if (!state.analysisRuns) state.analysisRuns = [];
      state.analysisRuns.push(run);
      if (!state.reportAnalysisAdjustments) state.reportAnalysisAdjustments = {};
      state.reportAnalysisAdjustments[reportId] = { latestRunId: runId };

      if (!report.todoFlags) report.todoFlags = [];
      var pIdx = report.todoFlags.indexOf('pending_reanalysis');
      if (pIdx >= 0) report.todoFlags.splice(pIdx, 1);
      return run;
    });
  }

  function indicatorFilterMatch(ind, species) {
    var status = store.normalizeDataStatus ? store.normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
    var isMissing = ['MISSING_COLUMN', 'EMPTY', 'INVALID', 'NOT_APPLICABLE'].indexOf(status) >= 0;
    var isModified = ind.correctedFrom || (ind.version && ind.version > 1);
    var isAbnormal = false;
    if (ds && ds.evaluateIndicatorResult) {
      var ev = ds.evaluateIndicatorResult(ind, species);
      if (ev && ev.label && ev.label !== '正常' && ev.label !== 'NORMAL' && ev.label !== '—') {
        isAbnormal = true;
      }
      if (ev && ev.isOutOfRange) isAbnormal = true;
    }
    if (status === 'PRESENT' && ind.value != null) {
      var range = ds && ds.resolveEffectiveRangeForIndicator
        ? ds.resolveEffectiveRangeForIndicator(ind, species)
        : null;
      if (range && isFinite(Number(ind.value))) {
        var v = Number(ind.value);
        if (v < range.min || v > range.max) isAbnormal = true;
      }
    }

    var anyFilter = resultsFilters.abnormal || resultsFilters.missing || resultsFilters.modified;
    if (!anyFilter) return true;
    return (resultsFilters.abnormal && isAbnormal) ||
      (resultsFilters.missing && isMissing) ||
      (resultsFilters.modified && isModified);
  }

  function getAdviceItems(state, report) {
    var items = [];
    var findings = (state.findings || []).filter(function (f) { return f.reportId === report.id; });
    findings.forEach(function (f) {
      var rec = (state.recommendations || []).find(function (r) {
        return r.reportId === report.id && r.findingId === f.id;
      });
      items.push({
        id: f.id,
        kind: 'finding',
        label: f.description || f.indicatorKey,
        findingId: f.id,
        rec: rec || null
      });
    });

    var run = C.getLatestAnalysisRun(state, report.id);
    var finalAdv = '';
    if (run) {
      finalAdv = ((run.adjustments && run.adjustments.finalContent && run.adjustments.finalContent.healthAdvice) ||
        (run.combinedResult && run.combinedResult.healthAdvice) || '');
    }
    if (finalAdv) {
      finalAdv.split(/\n+/).forEach(function (line, idx) {
        line = line.trim();
        if (!line) return;
        var existing = items.some(function (it) { return it.label === line; });
        if (existing) return;
        var rec = (state.recommendations || []).find(function (r) {
          return r.reportId === report.id && !r.findingId && (r.label || '').indexOf(line.slice(0, 12)) >= 0;
        });
        items.push({
          id: 'adv-' + idx,
          kind: 'analysis',
          label: line,
          findingId: null,
          rec: rec || null
        });
      });
    }
    return items;
  }

  function findProduct(state, id) {
    return (state.products || []).find(function (p) { return p.id === id; });
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
        '</p><p class="text-xs text-slate-500 mt-1">确认摘要：请逐项处理下方问题后再发布。</p>';
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

  function renderSourcePanel(state, report) {
    var tr = C.lookupTestRecord(state, report.testRecordId);
    var user = C.lookupUser(state, report.userId);
    var pet = C.lookupPet(state, report.petId);
    var st = tr ? C.lookupStore(state, tr.storeId) : null;
    var batch = tr && tr.importBatchId ? state.importBatches.find(function (b) { return b.id === tr.importBatchId; }) : null;

    document.getElementById('source-panel').innerHTML =
      '<p><span class="text-slate-500">报告号</span><br>' + C.escapeHtml(report.reportNumber) + '</p>' +
      '<p><span class="text-slate-500">检测记录</span><br><code class="text-xs">' + C.escapeHtml(report.testRecordId) + '</code></p>' +
      '<p><span class="text-slate-500">来源</span><br>' + C.escapeHtml(tr ? (tr.externalReportNumber || '—') + ' / ' + (tr.sampleNumber || '—') : '—') + '</p>' +
      '<p><span class="text-slate-500">用户</span><br>' + C.escapeHtml(user ? user.name : '—（未领取不阻断）') + '</p>' +
      '<p><span class="text-slate-500">宠物</span><br>' + C.escapeHtml(pet ? pet.name + ' / ' + pet.breed : '—') + '</p>' +
      '<p><span class="text-slate-500">机构</span><br>' + C.escapeHtml(st ? st.name : '—') + '</p>' +
      '<p><span class="text-slate-500">归属</span><br>' + C.escapeHtml(C.OWNERSHIP_STATUS_LABELS[report.ownershipStatus] || report.ownershipStatus || '—') + '</p>' +
      (batch ? '<p><span class="text-slate-500">导入批次</span><br>' + C.escapeHtml(batch.fileName) + '</p>' : '');
  }

  function renderAssessmentForm(state, report) {
    var workVer = C.getWorkingReportVersion(state, report.id);
    var species = C.getReportSpeciesForChecks(state, report);
    var dims = (workVer && workVer.platformDimensions) || {};

    document.getElementById('assessment-form').innerHTML =
      '<div><label class="text-xs text-slate-500">报告物种</label>' +
      '<select id="assess-species" data-preview-target="species" class="w-full border rounded px-2 py-1 mt-0.5">' +
      '<option value="cat"' + (species === 'cat' ? ' selected' : '') + '>猫</option>' +
      '<option value="dog"' + (species === 'dog' ? ' selected' : '') + '>狗</option></select></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-500">综合等级 A–E</label>' +
      '<select id="assess-level" data-preview-target="level" class="w-full border rounded px-2 py-1 mt-0.5">' +
      '<option value="">—</option>' + C.HEALTH_LEVELS.map(function (lv) {
        return '<option value="' + lv + '"' + (workVer && workVer.healthLevel === lv ? ' selected' : '') + '>' + lv + ' ' + (HEALTH_LEVEL_THEMES[lv] || '') + '</option>';
      }).join('') + '</select></div>' +
      '<div><label class="text-xs text-slate-500">综合分 0–100</label>' +
      '<input id="assess-score" data-preview-target="score" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5" value="' +
      (workVer && workVer.healthScore != null ? workVer.healthScore : '') + '"></div></div>' +
      '<div><label class="text-xs text-slate-500">人工百分位</label>' +
      '<input id="assess-percentile" data-preview-target="percentile" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5" value="' +
      (workVer && workVer.percentile != null ? workVer.percentile : '') + '"></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-500">平台维度·情绪</label>' +
      '<input id="assess-emotion" data-preview-target="emotion" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5" value="' +
      (dims.emotion != null ? dims.emotion : '') + '"></div>' +
      '<div><label class="text-xs text-slate-500">平台维度·免疫</label>' +
      '<input id="assess-immunity" data-preview-target="immunity" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5" value="' +
      (dims.immunity != null ? dims.immunity : '') + '"></div></div>' +
      '<div><label class="text-xs text-slate-500">综合摘要</label>' +
      '<textarea id="assess-summary" data-preview-target="summary" rows="3" class="w-full border rounded px-2 py-1 mt-0.5">' +
      C.escapeHtml(workVer && workVer.summary ? workVer.summary : '') + '</textarea></div>';

    bindFormPreviewListeners();
  }

  function bindFormPreviewListeners() {
    var ids = ['assess-species', 'assess-level', 'assess-score', 'assess-percentile', 'assess-emotion', 'assess-immunity', 'assess-summary',
      'analysis-professional', 'analysis-consumer', 'analysis-advice'];
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
    var species = C.getReportSpeciesForChecks(state, report);
    var indicators = C.getCurrentIndicators(state, report.testRecordId).filter(function (ind) {
      if (resultsSearch && ind.key.toLowerCase().indexOf(resultsSearch) < 0) return false;
      return indicatorFilterMatch(ind, species);
    });

    var listEl = document.getElementById('indicators-list');
    if (!indicators.length) {
      listEl.innerHTML = '<p class="text-slate-500 p-2">无匹配指标</p>';
      document.getElementById('indicator-detail').innerHTML = '';
      return;
    }

    if (!selectedIndicatorId || !indicators.some(function (i) { return i.id === selectedIndicatorId; })) {
      selectedIndicatorId = indicators[0].id;
    }

    listEl.innerHTML = indicators.map(function (ind) {
      var status = store.normalizeDataStatus ? store.normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
      var valid = C.isValidResultIndicator(ind);
      var sel = ind.id === selectedIndicatorId ? ' is-selected' : '';
      return '<button type="button" class="rw-indicator-row' + sel + '" data-indicator-id="' + ind.id + '">' +
        '<span class="font-medium">' + C.escapeHtml(ind.key) + '</span>' +
        '<span class="text-xs">' + C.statusBadge(status, C.DATA_STATUS_LABELS) + (valid ? ' <span class="text-emerald-700">有效</span>' : '') + '</span>' +
        '</button>';
    }).join('');

    var ind = indicators.find(function (i) { return i.id === selectedIndicatorId; });
    if (!ind) return;
    var evalResult = ds && ds.evaluateIndicatorResult ? ds.evaluateIndicatorResult(ind, species) : null;
    var rangeText = evalResult && evalResult.range
      ? evalResult.range.min + '–' + evalResult.range.max + (evalResult.range.unit || ind.unit || '')
      : '无参考范围';
    var valDisplay = ind.value != null && ind.value !== '' ? ind.value + (ind.unit || '') : '—';
    var modified = ind.correctedFrom || (ind.version && ind.version > 1);

    document.getElementById('indicator-detail').innerHTML =
      '<h4 class="font-medium mb-2">' + C.escapeHtml(ind.key) + '</h4>' +
      '<p><span class="text-slate-500">数据状态</span> ' + C.statusBadge(store.normalizeDataStatus ? store.normalizeDataStatus(ind.dataStatus) : ind.dataStatus, C.DATA_STATUS_LABELS) + '</p>' +
      '<p class="mt-1"><span class="text-slate-500">检测值</span> ' + C.escapeHtml(valDisplay) + '</p>' +
      '<p class="mt-1"><span class="text-slate-500">参考范围</span> ' + C.escapeHtml(rangeText) + '</p>' +
      (evalResult && evalResult.message ? '<p class="mt-1 text-xs text-slate-600">' + C.escapeHtml(evalResult.message) + '</p>' : '') +
      (modified ? '<p class="mt-2 text-xs text-indigo-700"><i class="fas fa-pen mr-1"></i>已修改（v' + (ind.version || 1) + '）</p>' : '') +
      '<div class="mt-3 flex gap-2">' +
      '<button type="button" class="btn-secondary px-2 py-1 rounded text-xs" id="btn-ind-reanalysis">模拟数据变更</button>' +
      '</div>';

    var btn = document.getElementById('btn-ind-reanalysis');
    if (btn) {
      btn.onclick = function () {
        C.confirmDialog('确认模拟该指标数据变更？将标记报告待重新分析。', function () {
          store.updateAnalysisState(function (s) {
            var r = s.reports.find(function (x) { return x.id === currentReportId; });
            if (!r) return;
            if (!r.todoFlags) r.todoFlags = [];
            if (r.todoFlags.indexOf('pending_reanalysis') < 0) r.todoFlags.push('pending_reanalysis');
          });
          C.toast('已标记待重新分析', 'warning');
          render(store.getState());
        });
      };
    }
  }

  function renderAnalysisPanel(state, report) {
    var run = C.getLatestAnalysisRun(state, report.id);
    var panel = document.getElementById('analysis-panel');
    if (!run) {
      panel.innerHTML =
        '<p class="text-slate-500 mb-3">尚未运行规则分析。</p>' +
        '<button type="button" id="btn-run-analysis" class="btn-primary px-4 py-2 rounded-md text-sm">' +
        '<i class="fas fa-play mr-1"></i>运行分析</button>';
      document.getElementById('btn-run-analysis').onclick = function () {
        try {
          runMockAnalysis(report.id);
          C.toast('分析运行完成', 'success');
          formInteracting = false;
          render(store.getState());
        } catch (e) {
          C.toast(e.message || '运行失败', 'error');
        }
      };
      return;
    }

    var combined = run.combinedResult || {};
    var final = (run.adjustments && run.adjustments.finalContent) || {};
    var pending = (report.todoFlags || []).indexOf('pending_reanalysis') >= 0;

    panel.innerHTML =
      (pending ? '<div class="bg-amber-50 border border-amber-200 text-amber-900 rounded px-3 py-2 text-xs mb-2"><i class="fas fa-clock mr-1"></i>待重新分析</div>' : '') +
      '<p class="text-xs text-slate-500">运行 ' + C.escapeHtml(run.id) + ' · ' + C.formatDate(run.createdAt) +
      ' <button type="button" id="btn-rerun-analysis" class="text-teal-700 ml-2 underline text-xs">重新运行</button></p>' +
      '<div class="bg-slate-50 rounded p-2 mb-2"><p class="text-xs font-medium text-slate-600 mb-1">组合结果（只读）</p>' +
      '<p class="text-xs"><strong>专业</strong> ' + C.escapeHtml(combined.professional || '—') + '</p>' +
      '<p class="text-xs mt-1"><strong>通俗</strong> ' + C.escapeHtml(combined.consumer || '—') + '</p></div>' +
      '<div class="space-y-2"><p class="text-xs font-medium text-slate-600">人工最终内容（可微调）</p>' +
      '<label class="text-xs text-slate-500">专业</label><textarea id="analysis-professional" data-preview-target="professional" rows="2" class="w-full border rounded px-2 py-1 text-xs">' + C.escapeHtml(final.professional || '') + '</textarea>' +
      '<label class="text-xs text-slate-500">通俗</label><textarea id="analysis-consumer" data-preview-target="consumer" rows="2" class="w-full border rounded px-2 py-1 text-xs">' + C.escapeHtml(final.consumer || '') + '</textarea>' +
      '<label class="text-xs text-slate-500">健康建议</label><textarea id="analysis-advice" data-preview-target="advice" rows="2" class="w-full border rounded px-2 py-1 text-xs">' + C.escapeHtml(final.healthAdvice || '') + '</textarea></div>';

    document.getElementById('btn-rerun-analysis').onclick = function () {
      C.confirmDialog('重新运行将生成新的分析结果，确认继续？', function () {
        runMockAnalysis(report.id);
        C.toast('分析已重新运行', 'success');
        formInteracting = false;
        render(store.getState());
      });
    };
    bindFormPreviewListeners();
  }

  function renderRecommendationsPanel(state, report) {
    var items = getAdviceItems(state, report);
    var panel = document.getElementById('recommendations-panel');
    if (!items.length) {
      panel.innerHTML = '<p class="text-slate-500">无健康建议项，请先运行分析或确认 findings。</p>';
      return;
    }

    panel.innerHTML = items.map(function (item) {
      var rec = item.rec;
      if (!rec) {
        return '<div class="border rounded p-3 bg-slate-50">' +
          '<p class="font-medium text-xs">' + C.escapeHtml(item.label) + '</p>' +
          '<p class="text-xs text-amber-700 mt-1">无关联推荐配置，请在数据层创建 recommendation。</p></div>';
      }

      var resolved = store.resolveRecommendationTarget({
        targetType: 'PRODUCT',
        primaryProductId: rec.primaryProductId || rec.productId,
        relatedProductIds: rec.relatedProductIds || [],
        label: rec.label
      }, state);

      var primary = findProduct(state, rec.primaryProductId || rec.productId);
      var related = (rec.relatedProductIds || []).map(function (pid, idx) {
        var p = findProduct(state, pid);
        return '<span class="rw-related-chip">' + C.escapeHtml(p ? p.name : pid) +
          ' <button type="button" class="rw-rec-remove-related" data-rec="' + rec.id + '" data-idx="' + idx + '">&times;</button></span>';
      }).join('');

      var errHtml = '';
      if (resolved.availability === 'UNAVAILABLE') {
        errHtml = '<p class="text-xs text-red-700 mt-1"><i class="fas fa-circle-exclamation mr-1"></i>主推商品不可用</p>';
      } else if (resolved.availability === 'ZERO_STOCK') {
        errHtml = '<p class="text-xs text-amber-700 mt-1"><i class="fas fa-triangle-exclamation mr-1"></i>主推商品零库存</p>';
      }

      return '<div class="border rounded p-3" data-rec-id="' + rec.id + '">' +
        '<p class="font-medium text-sm mb-1">' + C.escapeHtml(item.label) + '</p>' +
        '<p class="text-xs text-slate-500 mb-2">来源：' + (item.kind === 'finding' ? '检测发现' : '分析建议') + '</p>' +
        '<div class="space-y-2">' +
        '<div><span class="text-xs text-slate-500">主推商品</span>' +
        '<div class="flex items-center gap-2 mt-0.5">' +
        '<span class="text-sm">' + (primary ? C.escapeHtml(primary.name) : '<span class="text-slate-400">未选择</span>') + '</span>' +
        '<button type="button" class="rw-pick-product btn-secondary px-2 py-0.5 rounded text-xs" data-rec="' + rec.id + '" data-slot="primary">选择</button>' +
        (primary ? '<button type="button" class="rw-clear-primary text-xs text-red-600" data-rec="' + rec.id + '">清除</button>' : '') +
        '</div></div>' +
        '<div><span class="text-xs text-slate-500">关联商品（' + (rec.relatedProductIds || []).length + '/3）</span>' +
        '<div class="flex flex-wrap gap-1 mt-0.5">' + (related || '<span class="text-xs text-slate-400">无</span>') +
        ((rec.relatedProductIds || []).length < 3
          ? '<button type="button" class="rw-pick-product btn-secondary px-2 py-0.5 rounded text-xs" data-rec="' + rec.id + '" data-slot="related">+ 添加</button>'
          : '') +
        '</div></div>' +
        '<p class="text-xs mt-1">解析：<strong>' + C.escapeHtml(resolved.resolvedType) + '</strong> · ' +
        C.escapeHtml(REC_AVAIL_LABELS[resolved.availability] || resolved.availability) + '</p>' +
        errHtml +
        '<button type="button" class="rw-save-rec btn-primary px-3 py-1 rounded text-xs mt-2" data-rec="' + rec.id + '">保存推荐配置</button>' +
        '</div></div>';
    }).join('');
  }

  function handleRecommendationsClick(e) {
    var pickBtn = e.target.closest('.rw-pick-product');
    if (pickBtn) {
      openProductPicker(pickBtn.getAttribute('data-rec'), pickBtn.getAttribute('data-slot'));
      return;
    }
    var clearBtn = e.target.closest('.rw-clear-primary');
    if (clearBtn) {
      var recId = clearBtn.getAttribute('data-rec');
      try {
        store.updateRecommendation({ recommendationId: recId, primaryProductId: null, actor: actorLabel() });
        C.toast('已清除主推商品', 'info');
        render(store.getState());
      } catch (err) {
        C.toast(err.message, 'error');
      }
      return;
    }
    var removeBtn = e.target.closest('.rw-rec-remove-related');
    if (removeBtn) {
      var state = store.getState();
      var rec = state.recommendations.find(function (r) { return r.id === removeBtn.getAttribute('data-rec'); });
      if (!rec) return;
      var idx = parseInt(removeBtn.getAttribute('data-idx'), 10);
      var related = (rec.relatedProductIds || []).slice();
      related.splice(idx, 1);
      store.updateRecommendation({ recommendationId: rec.id, relatedProductIds: related, actor: actorLabel() });
      render(state);
      return;
    }
    var saveBtn = e.target.closest('.rw-save-rec');
    if (saveBtn) {
      C.toast('推荐配置已保存', 'success');
    }
  }

  function openProductPicker(recId, slot) {
    pickerState = { recId: recId, slot: slot, page: 1, relatedIndex: -1 };
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
    var rec = state.recommendations.find(function (r) { return r.id === pickerState.recId; });
    var includeIds = [];
    if (rec) {
      if (rec.primaryProductId) includeIds.push(rec.primaryProductId);
      (rec.relatedProductIds || []).forEach(function (id) { includeIds.push(id); });
    }
    var result = store.searchProductsForPicker(state, {
      q: document.getElementById('picker-search').value,
      categoryId: document.getElementById('picker-category').value || null,
      status: document.getElementById('picker-status').value || null,
      page: pickerState.page,
      pageSize: 8,
      includeProductIds: includeIds
    });

    var list = document.getElementById('picker-list');
    if (!result.items.length) {
      list.innerHTML = '<p class="text-slate-500 py-4 text-center">无匹配商品</p>';
    } else {
      list.innerHTML = result.items.map(function (p) {
        return '<button type="button" class="rw-picker-item w-full text-left border-b py-2 hover:bg-slate-50" data-product-id="' + p.id + '">' +
          '<div class="font-medium text-sm">' + C.escapeHtml(p.name) + '</div>' +
          '<div class="text-xs text-slate-500">SPU ' + C.escapeHtml(p.spuId) + ' · ' +
          C.escapeHtml(PRODUCT_STATUS_LABELS[p.status] || p.status) +
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
    var state = store.getState();
    var rec = state.recommendations.find(function (r) { return r.id === pickerState.recId; });
    if (!rec) return;
    try {
      if (pickerState.slot === 'primary') {
        store.updateRecommendation({
          recommendationId: rec.id,
          primaryProductId: productId,
          actor: actorLabel()
        });
      } else {
        var related = (rec.relatedProductIds || []).slice();
        if (related.indexOf(productId) < 0 && related.length < 3 && productId !== (rec.primaryProductId || rec.productId)) {
          related.push(productId);
        }
        store.updateRecommendation({
          recommendationId: rec.id,
          relatedProductIds: related,
          actor: actorLabel()
        });
      }
      closeProductPicker();
      render(store.getState());
    } catch (err) {
      C.toast(err.message, 'error');
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

    var ver = versionView === 'published' && pubVer ? pubVer : workVer;
    var label = versionView === 'published' ? '用户可见发布版' : '工作版';

    document.getElementById('versions-content').innerHTML = ver
      ? '<div class="border rounded p-3 ' + (versionView === 'published' ? 'bg-emerald-50/40' : 'bg-indigo-50/40') + '">' +
        '<h4 class="font-medium mb-2">' + label + ' v' + ver.version + '</h4>' +
        '<p>' + C.statusBadge(ver.status, C.REPORT_STATUS_LABELS) +
        (ver.healthLevel ? ' · 等级 ' + C.escapeHtml(ver.healthLevel) : '') +
        (ver.healthScore != null ? ' · 分 ' + ver.healthScore : '') + '</p>' +
        '<p class="text-slate-600 mt-2">' + C.escapeHtml(ver.summary || '—') + '</p>' +
        (ver.publishedAt ? '<p class="text-xs text-slate-400 mt-2">发布于 ' + C.formatDate(ver.publishedAt) + '</p>' : '') +
        (ver.correctionNote ? '<p class="text-xs text-indigo-600 mt-1">' + C.escapeHtml(ver.correctionNote) + '</p>' : '') +
        '</div>' +
        '<div class="mt-3"><h4 class="font-medium text-sm mb-2">版本时间线</h4>' +
        report.versions.slice().sort(function (a, b) { return b.version - a.version; }).map(function (v) {
          var isPub = v.version === report.publishedVersion;
          return '<div class="border-l-4 ' + (isPub ? 'border-emerald-500' : 'border-slate-200') + ' pl-3 py-1.5 text-xs">' +
            '<span class="font-medium">v' + v.version + '</span> ' + C.statusBadge(v.status, C.REPORT_STATUS_LABELS) +
            (isPub ? ' <span class="text-emerald-700">用户可见</span>' : '') +
            '<p class="text-slate-500 mt-0.5">' + C.escapeHtml((v.summary || '').slice(0, 80)) + '</p></div>';
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
      summary: el('assess-summary') ? el('assess-summary').value : '',
      professional: el('analysis-professional') ? el('analysis-professional').value : '',
      consumer: el('analysis-consumer') ? el('analysis-consumer').value : '',
      advice: el('analysis-advice') ? el('analysis-advice').value : ''
    };
  }

  function updatePreview(state) {
    var report = C.lookupReport(state, currentReportId);
    if (!report) return;
    var vals = getPreviewFormValues();
    var pet = C.lookupPet(state, report.petId);
    var species = vals.species || C.getReportSpeciesForChecks(state, report);
    var indicators = C.getCurrentIndicators(state, report.testRecordId).slice(0, 6);
    var levelTheme = HEALTH_LEVEL_THEMES[vals.level] || '草原';
    var items = getAdviceItems(state, report);

    var overviewHtml =
      '<div class="rw-mini-header">' +
      '<div class="rw-mini-title">' + C.escapeHtml(pet ? pet.name : '宠物报告') + '</div>' +
      '<div class="rw-mini-sub">肠道菌群 · ' + (species === 'dog' ? '狗' : '猫') + '</div></div>' +
      '<div class="rw-mini-card" data-preview-region="level" data-preview-focus="assess-level" data-preview-module="assessment">' +
      '<div class="rw-mini-level">' + C.escapeHtml(vals.level || '—') + '</div>' +
      '<div class="rw-mini-theme">' + C.escapeHtml(levelTheme) + '</div></div>' +
      '<div class="rw-mini-card" data-preview-region="score" data-preview-focus="assess-score" data-preview-module="assessment">' +
      '<div class="rw-mini-stat-label">综合分</div><div class="rw-mini-stat-value">' + C.escapeHtml(vals.score || '—') + '</div></div>' +
      '<div class="rw-mini-card" data-preview-region="summary" data-preview-focus="assess-summary" data-preview-module="assessment">' +
      '<div class="rw-mini-stat-label">摘要</div><p class="rw-mini-text">' + C.escapeHtml(vals.summary || '填写综合摘要…') + '</p></div>' +
      (vals.emotion || vals.immunity
        ? '<div class="rw-mini-dims">' +
          '<span data-preview-region="emotion" data-preview-focus="assess-emotion" data-preview-module="assessment">情绪 ' + C.escapeHtml(vals.emotion || '—') + '</span>' +
          '<span data-preview-region="immunity" data-preview-focus="assess-immunity" data-preview-module="assessment">免疫 ' + C.escapeHtml(vals.immunity || '—') + '</span></div>'
        : '');

    var resultsHtml = '<div class="rw-mini-list">' + indicators.map(function (ind) {
      var val = ind.value != null ? ind.value + (ind.unit || '') : '—';
      return '<div class="rw-mini-list-item"><span>' + C.escapeHtml(ind.key) + '</span><strong>' + C.escapeHtml(val) + '</strong></div>';
    }).join('') + '</div>';

    var adviceHtml =
      '<div class="rw-mini-card" data-preview-region="consumer" data-preview-focus="analysis-consumer" data-preview-module="analysis">' +
      '<div class="rw-mini-stat-label">通俗解读</div><p class="rw-mini-text">' + C.escapeHtml(vals.consumer || '—') + '</p></div>' +
      '<div class="rw-mini-card" data-preview-region="advice" data-preview-focus="analysis-advice" data-preview-module="analysis">' +
      '<div class="rw-mini-stat-label">健康建议</div><p class="rw-mini-text">' + C.escapeHtml(vals.advice || '—') + '</p></div>' +
      items.slice(0, 3).map(function (item) {
        var rec = item.rec;
        var pname = rec && rec.primaryProductId ? (findProduct(state, rec.primaryProductId) || {}).name : null;
        return '<div class="rw-mini-product">' + C.escapeHtml(pname || item.label.slice(0, 20)) + '</div>';
      }).join('');

    var tabContent = previewTab === 'results' ? resultsHtml : previewTab === 'advice' ? adviceHtml : overviewHtml;
    document.getElementById('preview-content').innerHTML =
      '<div class="rw-mini-shell">' + tabContent + '<div class="rw-mini-badge">本地预览</div></div>';
  }

  function partialUpdate(state) {
    lastChecks = C.buildPublicationChecks(state, currentReportId);
    renderModuleNav(lastChecks);
    renderChecksPanel(lastChecks);
    updatePreview(state);
  }

  function render(state) {
    var queue = state.reports.filter(C.isReportInReviewQueue);
    var select = document.getElementById('select-report');
    select.innerHTML = queue.map(function (r) {
      var tag = r.correctionDraftActive ? ' [更正草稿]' : '';
      return '<option value="' + r.id + '">' + C.escapeHtml(r.reportNumber) + tag + ' (' + (C.REPORT_STATUS_LABELS[r.status] || r.status) + ')</option>';
    }).join('') || '<option value="">无待审核报告</option>';

    if (currentReportId && queue.some(function (r) { return r.id === currentReportId; })) {
      select.value = currentReportId;
    } else if (queue.some(function (r) { return r.id === 'report-002'; })) {
      currentReportId = 'report-002';
      select.value = currentReportId;
    } else if (queue.length) {
      currentReportId = queue[0].id;
      select.value = currentReportId;
    }

    var report = currentReportId ? C.lookupReport(state, currentReportId) : null;
    if (!report) {
      document.getElementById('source-panel').innerHTML = '<p class="text-slate-500">请选择待审核报告。</p>';
      document.getElementById('action-bar').innerHTML = '';
      switchModule('source');
      return;
    }

    if (lastRenderedReportId !== report.id) {
      activeModule = defaultModuleForReport(report);
      lastRenderedReportId = report.id;
    }

    document.getElementById('report-status-badge').innerHTML = C.statusBadge(report.status, C.REPORT_STATUS_LABELS) +
      (report.correctionDraftActive ? ' <span class="text-xs text-indigo-600 ml-1">更正草稿</span>' : '');
    document.getElementById('version-badges').innerHTML =
      '工作版 v' + (report.workingVersion || '—') +
      ' · 发布版 v' + (report.publishedVersion != null ? report.publishedVersion : '—');

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
