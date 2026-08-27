/**
 * 后台原型共享工具 — 只读/写入均通过 PetReportMockStore
 */
(function (global) {
  'use strict';

  var store = function () {
    return global.PetReportMockStore;
  };

  function parseRoute() {
    var raw = (global.location.hash || '').replace(/^#/, '') || 'dashboard';
    var qIndex = raw.indexOf('?');
    var pageId = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    var params = {};
    if (qIndex >= 0) {
      var search = raw.slice(qIndex + 1);
      search.split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    return { pageId: pageId, params: params };
  }

  function navigate(pageId, params) {
    var hash = pageId;
    if (params && Object.keys(params).length) {
      hash += '?' + Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
    }
    global.location.hash = hash;
  }

  function toast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var el = document.createElement('div');
    var colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-600',
      warning: 'bg-amber-500',
      info: 'bg-slate-700'
    };
    el.className = 'toast-item px-4 py-3 rounded-md text-white text-sm shadow-lg ' + (colors[type] || colors.info);
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add('opacity-0');
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  }

  function confirmDialog(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4';
    overlay.innerHTML =
      '<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">' +
      '<p class="text-gray-800 mb-6">' + escapeHtml(message) + '</p>' +
      '<div class="flex justify-end gap-3">' +
      '<button type="button" class="btn-secondary px-4 py-2 rounded-md" data-action="cancel">取消</button>' +
      '<button type="button" class="btn-primary px-4 py-2 rounded-md" data-action="ok">确定</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').onclick = function () { overlay.remove(); };
    overlay.querySelector('[data-action="ok"]').onclick = function () {
      overlay.remove();
      if (onConfirm) onConfirm();
    };
  }

  function promptDialog(title, placeholder, onSubmit) {
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4';
    overlay.innerHTML =
      '<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">' +
      '<h3 class="font-semibold text-gray-900 mb-3">' + escapeHtml(title) + '</h3>' +
      '<textarea class="w-full border border-gray-300 rounded-md p-2 text-sm min-h-[80px]" id="prompt-input" placeholder="' + escapeHtml(placeholder || '') + '"></textarea>' +
      '<div class="flex justify-end gap-3 mt-4">' +
      '<button type="button" class="btn-secondary px-4 py-2 rounded-md" data-action="cancel">取消</button>' +
      '<button type="button" class="btn-primary px-4 py-2 rounded-md" data-action="ok">提交</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('#prompt-input');
    input.focus();
    overlay.querySelector('[data-action="cancel"]').onclick = function () { overlay.remove(); };
    overlay.querySelector('[data-action="ok"]').onclick = function () {
      var val = input.value.trim();
      if (!val) {
        toast('请填写内容', 'warning');
        return;
      }
      overlay.remove();
      if (onSubmit) onSubmit(val);
    };
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return iso.slice(0, 19).replace('T', ' ');
    } catch (e) {
      return iso;
    }
  }

  function lookupUser(state, userId) {
    if (!userId) return null;
    return state.users.find(function (u) { return u.id === userId; });
  }

  function lookupPet(state, petId) {
    if (!petId) return null;
    return state.pets.find(function (p) { return p.id === petId; });
  }

  function lookupStore(state, storeId) {
    if (!storeId) return null;
    return state.stores.find(function (s) { return s.id === storeId; });
  }

  function lookupReport(state, reportId) {
    return state.reports.find(function (r) { return r.id === reportId; });
  }

  function lookupTestRecord(state, testRecordId) {
    if (!testRecordId) return null;
    return (state.testRecords || []).find(function (t) { return t.id === testRecordId; });
  }

  function lookupClaimCode(state, claimIdOrCode) {
    return (state.claimCodes || []).find(function (c) {
      return c.id === claimIdOrCode || c.code === claimIdOrCode;
    });
  }

  function speciesToMajorBreed(species) {
    if (species === 'cat') return '猫科';
    if (species === 'dog') return '犬科';
    return species || '其他';
  }

  function majorBreedToSpecies(major) {
    if (major === '猫科') return 'cat';
    if (major === '犬科') return 'dog';
    return 'dog';
  }

  function countPetReports(state, petId) {
    return (state.reports || []).filter(function (r) { return r.petId === petId; }).length;
  }

  function countUserReports(state, userId) {
    var st = store();
    if (!st || !userId) return 0;
    return st.getUserVisibleReports(userId).length;
  }

  function getUnassignedTestRecords(state) {
    return (state.testRecords || []).filter(function (tr) {
      if (tr.status === 'pending_result' || tr.status === 'voided') return false;
      if (tr.petId || tr.userId) return false;
      if (tr.claimStatus === 'bound') return false;
      return true;
    });
  }

  function getPendingClaimCodes(state, petId, testRecordId) {
    return (state.claimCodes || []).filter(function (c) {
      if (c.status !== 'pending') return false;
      if (petId && c.petId === petId) return true;
      if (testRecordId && c.testRecordId === testRecordId) return true;
      return false;
    });
  }

  function subscribeDemo(callback) {
    var st = store();
    if (!st || typeof callback !== 'function') return function () {};
    return st.subscribe(callback);
  }

  function createPlatformUser(params) {
    var st = store();
    if (!st) return null;
    return st.createPlatformUser(params);
  }

  function updatePlatformUser(userId, params) {
    var st = store();
    if (!st) return null;
    return st.updatePlatformUser(userId, params);
  }

  function updateOpsPet(petId, params) {
    var st = store();
    if (!st) return null;
    return st.updateOpsPet(petId, params);
  }

  var OWNERSHIP_STATUS_LABELS = {
    unassigned: '待归属',
    pending_claim: '待领取',
    bound: '已绑定',
    claimed: '已领取'
  };

  function getCurrentIndicators(state, testRecordId) {
    return state.indicators.filter(function (i) {
      return i.testRecordId === testRecordId && i.isCurrent;
    });
  }

  var TEST_STATUS_LABELS = {
    pending_result: '待结果',
    pending_claim: '待认领',
    import_failed: '导入异常',
    pending_review: '待审核',
    published: '已发布'
  };

  var REPORT_STATUS_LABELS = {
    draft: '草稿',
    pending_review: '待审核',
    rejected: '已驳回',
    approved: '已批准',
    published: '已发布',
    corrected: '已更正',
    voided: '已作废'
  };

  var HEALTH_LEVELS = ['A', 'B', 'C', 'D', 'E'];

  var REC_AVAILABILITY_WARNINGS = {
    UNAVAILABLE: '推荐目标已下架',
    ZERO_STOCK: '推荐商品零库存',
    NO_CANDIDATES: '推荐无可用候选',
    NONE: '推荐无法解析到有效目标'
  };

  function dictService() {
    return global.dictionaryDataService || null;
  }

  function getWorkingReportVersion(state, reportId) {
    var st = store();
    if (st && typeof st.getWorkingVersionSnapshot === 'function') {
      return st.getWorkingVersionSnapshot(reportId);
    }
    var report = lookupReport(state, reportId);
    if (!report || !report.versions) return null;
    var versionNo = report.workingVersion != null ? report.workingVersion : report.currentVersion;
    return report.versions.find(function (v) { return v.version === versionNo; }) || null;
  }

  function getPublishedReportVersion(state, reportId) {
    var st = store();
    if (st && typeof st.getPublishedVersionSnapshot === 'function') {
      return st.getPublishedVersionSnapshot(reportId);
    }
    var report = lookupReport(state, reportId);
    if (!report || !report.versions) return null;
    if (report.publishedVersion == null) return null;
    return report.versions.find(function (v) { return v.version === report.publishedVersion; }) || null;
  }

  function getReportSpeciesForChecks(state, report) {
    var ds = dictService();
    if (ds && typeof ds.getReportSpecies === 'function') {
      return ds.getReportSpecies(state, report);
    }
    if (report.reportSpecies) return report.reportSpecies;
    var pet = lookupPet(state, report.petId);
    return pet ? pet.species : null;
  }

  function getLatestAnalysisRun(state, reportId) {
    var adj = (state.reportAnalysisAdjustments || {})[reportId];
    if (!adj || !adj.latestRunId) return null;
    return (state.analysisRuns || []).find(function (r) { return r.id === adj.latestRunId; }) || null;
  }

  function isValidResultIndicator(ind) {
    var st = store();
    var status = st && st.normalizeDataStatus ? st.normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
    if (status === 'NOT_DETECTED') return true;
    if (status === 'PRESENT') {
      var val = Number(ind.value);
      return ind.value != null && ind.value !== '' && isFinite(val);
    }
    return false;
  }

  function buildPublicationChecks(state, reportId) {
    var report = lookupReport(state, reportId);
    var blockers = [];
    var warnings = [];
    if (!report) {
      blockers.push({ id: 'report_missing', message: '报告不存在', category: 'system' });
      return { blockers: blockers, warnings: warnings };
    }

    var tr = lookupTestRecord(state, report.testRecordId);
    var pet = lookupPet(state, report.petId);
    var workingVer = getWorkingReportVersion(state, reportId);
    var species = getReportSpeciesForChecks(state, report);
    var indicators = getCurrentIndicators(state, report.testRecordId);
    var ds = dictService();

    function addBlocker(id, message, category) {
      blockers.push({ id: id, message: message, category: category || 'blocker' });
    }
    function addWarning(id, message, category) {
      warnings.push({ id: id, message: message, category: category || 'warning' });
    }

    if (!report.petId || !pet) {
      addBlocker('pet_archive', '未完成宠物建档/报告归档（需 petId 且宠物存在）', 'archive');
    }
    if (!tr) {
      addBlocker('test_record', '缺少检测记录 testRecord', 'traceability');
    } else {
      if (!tr.sourceOrgId) {
        addBlocker('source_org', '来源机构标识缺失', 'traceability');
      }
      if (!tr.externalReportNumber && !tr.sampleNumber) {
        addBlocker('source_ref', '来源不可追溯（需外部报告号或样本号）', 'traceability');
      }
    }
    if (!species) {
      addBlocker('report_species', '报告物种未填写', 'assessment');
    }
    if (!workingVer || !workingVer.healthLevel || HEALTH_LEVELS.indexOf(workingVer.healthLevel) < 0) {
      addBlocker('health_level', '综合等级 A–E 未填写或无效', 'assessment');
    }
    var score = workingVer ? workingVer.healthScore : null;
    if (score == null || score === '' || !isFinite(Number(score)) || Number(score) < 0 || Number(score) > 100) {
      addBlocker('health_score', '综合分须为 0–100 的数值', 'assessment');
    }

    var validResults = indicators.filter(isValidResultIndicator);
    if (!validResults.length) {
      addBlocker('valid_results', '至少一项有效结果（PRESENT 有有限数值，或 NOT_DETECTED）', 'results');
    }

    var overviewOk = workingVer &&
      (workingVer.summary || '').trim() &&
      workingVer.healthLevel &&
      workingVer.healthScore != null && workingVer.healthScore !== '';
    if (!overviewOk) {
      addBlocker('mock_overview', '综合概览必备：摘要 + 等级 + 分数', 'mock_module');
    }
    if (!validResults.length) {
      addBlocker('mock_results_module', '专业检测结果必备：至少一项有效结果', 'mock_module');
    }

    if (!report.userId) {
      addWarning('unclaimed_user', '报告未绑定用户/未领取', 'ownership');
    }
    if (report.ownershipStatus === 'pending_claim' || (tr && tr.claimStatus === 'pending_claim')) {
      addWarning('pending_claim', '归属状态为待领取', 'ownership');
    }

    indicators.forEach(function (ind) {
      var status = store().normalizeDataStatus ? store().normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
      if (['MISSING_COLUMN', 'EMPTY', 'INVALID', 'NOT_APPLICABLE'].indexOf(status) >= 0) {
        addWarning('data_status_' + ind.id, '指标「' + ind.key + '」状态 ' + (DATA_STATUS_LABELS[status] || status), 'data_quality');
      }
      if (status === 'PRESENT' && ind.value != null && ind.value !== '' && isFinite(Number(ind.value))) {
        var range = ds && ds.resolveEffectiveRangeForIndicator
          ? ds.resolveEffectiveRangeForIndicator(ind, species)
          : null;
        if (!range) {
          addWarning('no_range_' + ind.id, '指标「' + ind.key + '」有值但无有效参考范围', 'range');
        }
      }
    });

    if (workingVer) {
      if (workingVer.percentile == null || workingVer.percentile === '') {
        addWarning('percentile_empty', '人工百分位未填写', 'assessment');
      }
      var dims = workingVer.platformDimensions || {};
      if (dims.emotion == null || dims.emotion === '') {
        addWarning('platform_emotion', '平台评估维度「情绪」未填写', 'assessment');
      }
      if (dims.immunity == null || dims.immunity === '') {
        addWarning('platform_immunity', '平台评估维度「免疫」未填写', 'assessment');
      }
    }

    var run = getLatestAnalysisRun(state, reportId);
    if (!run) {
      addWarning('no_analysis_run', '规则分析尚未运行', 'analysis');
    } else if (report.todoFlags && report.todoFlags.indexOf('pending_reanalysis') >= 0) {
      addWarning('pending_reanalysis', '指标或规则变更，待重新分析', 'analysis');
    } else {
      var final = (run.adjustments && run.adjustments.finalContent) || {};
      var hasFinal = (final.professional || '').trim() || (final.consumer || '').trim() || (final.healthAdvice || '').trim();
      if (!hasFinal) {
        addWarning('empty_final_content', '规则分析最终解释或建议为空', 'analysis');
      }
    }

    (state.recommendations || []).filter(function (r) { return r.reportId === reportId; }).forEach(function (rec) {
      var msg = REC_AVAILABILITY_WARNINGS[rec.availability] || REC_AVAILABILITY_WARNINGS[rec.resolvedType];
      if (msg) {
        addWarning('rec_' + rec.id, '推荐「' + (rec.label || rec.id) + '」：' + msg, 'recommendation');
      }
    });

    (report.todoFlags || []).forEach(function (flag) {
      if (flag === 'rejected' || flag === 'correction_draft') return;
      addWarning('todo_' + flag, '待办标记：' + flag, 'todo');
    });

    return { blockers: blockers, warnings: warnings };
  }

  function saveReportAssessment(reportId, params, actor) {
    var st = store();
    if (!st) return null;
    return st.saveReportAssessment(reportId, params, actor);
  }

  function saveAnalysisFinalContent(reportId, finalContent, actor) {
    var st = store();
    if (!st) return null;
    return st.saveAnalysisFinalContent(reportId, finalContent, actor);
  }

  function rejectReportToIncomplete(reportId, reason, actor) {
    var st = store();
    if (!st) return null;
    return st.rejectReportToIncomplete(reportId, reason, actor);
  }

  function reviewCorrectionDraft(reportId, decision, reason, actor) {
    var st = store();
    if (!st) return null;
    return st.reviewCorrectionDraft(reportId, decision, reason, actor);
  }

  function createCorrectionDraftExtended(reportId, params) {
    var st = store();
    if (!st) throw new Error('store unavailable');
    return st.createCorrectionDraftExtended(reportId, params);
  }

  function isReportInReviewQueue(report) {
    if (!report || report.status === 'voided') return false;
    if (report.correctionDraftActive) return true;
    return ['draft', 'pending_review', 'approved', 'rejected'].indexOf(report.status) >= 0;
  }

  function validateAssessmentInput(params) {
    var errors = [];
    if (params.healthScore != null && params.healthScore !== '') {
      var n = Number(params.healthScore);
      if (!isFinite(n) || n < 0 || n > 100) errors.push('综合分须为 0–100');
    }
    if (params.healthLevel && HEALTH_LEVELS.indexOf(params.healthLevel) < 0) {
      errors.push('等级须为 A–E');
    }
    return errors;
  }

  var DATA_STATUS_LABELS = {
    PRESENT: '有效',
    MISSING_COLUMN: '缺列',
    EMPTY: '空值',
    NOT_DETECTED: '未检出',
    INVALID: '无效',
    NOT_APPLICABLE: '不适用'
  };

  function statusBadge(status, map) {
    var label = (map && map[status]) || status;
    var cls = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ';
    var colors = {
      pending_result: 'bg-blue-100 text-blue-800',
      pending_claim: 'bg-purple-100 text-purple-800',
      import_failed: 'bg-red-100 text-red-800',
      pending_review: 'bg-amber-100 text-amber-800',
      published: 'bg-emerald-100 text-emerald-800',
      draft: 'bg-gray-100 text-gray-700',
      rejected: 'bg-red-100 text-red-800',
      approved: 'bg-teal-100 text-teal-800',
      corrected: 'bg-indigo-100 text-indigo-800',
      voided: 'bg-gray-200 text-gray-600',
      success: 'bg-emerald-100 text-emerald-800',
      failed: 'bg-red-100 text-red-800',
      partial: 'bg-amber-100 text-amber-800'
    };
    return '<span class="' + cls + (colors[status] || 'bg-gray-100 text-gray-700') + '">' + escapeHtml(label) + '</span>';
  }

  function canRecommend(dataStatus) {
    var normalized = dataStatus === 'VALID' ? 'PRESENT' : dataStatus;
    return normalized === 'PRESENT';
  }

  var REVIEW_DRAFT_KEY = 'pet-admin-review-drafts-v1';

  function getReviewDrafts() {
    try {
      return JSON.parse(sessionStorage.getItem(REVIEW_DRAFT_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveReviewDraft(reportId, draft) {
    var all = getReviewDrafts();
    all[reportId] = draft;
    sessionStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify(all));
  }

  function getReviewDraft(reportId) {
    return getReviewDrafts()[reportId] || null;
  }

  global.PetAdminCommon = {
    store: store,
    parseRoute: parseRoute,
    navigate: navigate,
    toast: toast,
    confirmDialog: confirmDialog,
    promptDialog: promptDialog,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    lookupUser: lookupUser,
    lookupPet: lookupPet,
    lookupStore: lookupStore,
    lookupReport: lookupReport,
    lookupTestRecord: lookupTestRecord,
    lookupClaimCode: lookupClaimCode,
    speciesToMajorBreed: speciesToMajorBreed,
    majorBreedToSpecies: majorBreedToSpecies,
    countPetReports: countPetReports,
    countUserReports: countUserReports,
    getUnassignedTestRecords: getUnassignedTestRecords,
    getPendingClaimCodes: getPendingClaimCodes,
    subscribeDemo: subscribeDemo,
    createPlatformUser: createPlatformUser,
    updatePlatformUser: updatePlatformUser,
    updateOpsPet: updateOpsPet,
    OWNERSHIP_STATUS_LABELS: OWNERSHIP_STATUS_LABELS,
    getCurrentIndicators: getCurrentIndicators,
    TEST_STATUS_LABELS: TEST_STATUS_LABELS,
    REPORT_STATUS_LABELS: REPORT_STATUS_LABELS,
    DATA_STATUS_LABELS: DATA_STATUS_LABELS,
    statusBadge: statusBadge,
    canRecommend: canRecommend,
    getReviewDraft: getReviewDraft,
    saveReviewDraft: saveReviewDraft,
    HEALTH_LEVELS: HEALTH_LEVELS,
    getWorkingReportVersion: getWorkingReportVersion,
    getPublishedReportVersion: getPublishedReportVersion,
    getLatestAnalysisRun: getLatestAnalysisRun,
    buildPublicationChecks: buildPublicationChecks,
    saveReportAssessment: saveReportAssessment,
    saveAnalysisFinalContent: saveAnalysisFinalContent,
    rejectReportToIncomplete: rejectReportToIncomplete,
    reviewCorrectionDraft: reviewCorrectionDraft,
    createCorrectionDraftExtended: createCorrectionDraftExtended,
    isReportInReviewQueue: isReportInReviewQueue,
    validateAssessmentInput: validateAssessmentInput,
    getReportSpeciesForChecks: getReportSpeciesForChecks,
    isValidResultIndicator: isValidResultIndicator
  };
})(window);
