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
    el.className = 'ant-message-notice ant-message-' + (type === 'error' ? 'error' : type);
    el.setAttribute('role', 'alert');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  }

  function confirmDialog(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'ant-modal-root flex items-center justify-center p-4';
    overlay.innerHTML =
      '<div class="ant-modal max-w-md w-full">' +
      '<div class="ant-modal-body"><p style="margin:0">' + escapeHtml(message) + '</p></div>' +
      '<div class="ant-modal-footer">' +
      '<button type="button" class="ant-btn ant-btn-default" data-action="cancel">取消</button>' +
      '<button type="button" class="ant-btn ant-btn-primary" data-action="ok">确定</button>' +
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
    overlay.className = 'ant-modal-root flex items-center justify-center p-4';
    overlay.innerHTML =
      '<div class="ant-modal max-w-md w-full">' +
      '<div class="ant-modal-header">' + escapeHtml(title) + '</div>' +
      '<div class="ant-modal-body">' +
      '<textarea class="ant-input" id="prompt-input" placeholder="' + escapeHtml(placeholder || '') + '"></textarea>' +
      '</div>' +
      '<div class="ant-modal-footer">' +
      '<button type="button" class="ant-btn ant-btn-default" data-action="cancel">取消</button>' +
      '<button type="button" class="ant-btn ant-btn-primary" data-action="ok">提交</button>' +
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
    pending_result: '待导入结果',
    pending_claim: '待认领',
    import_failed: '导入异常',
    pending_review: '待审核',
    published: '已发布',
    unassigned: '待归属',
    voided: '已作废'
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
    var tagMap = {
      pending_result: 'ant-tag ant-tag-processing',
      pending_claim: 'ant-tag ant-tag-purple',
      import_failed: 'ant-tag ant-tag-error',
      pending_review: 'ant-tag ant-tag-warning',
      published: 'ant-tag ant-tag-success',
      draft: 'ant-tag ant-tag-default',
      rejected: 'ant-tag ant-tag-error',
      approved: 'ant-tag ant-tag-cyan',
      corrected: 'ant-tag ant-tag-indigo',
      voided: 'ant-tag ant-tag-default',
      success: 'ant-tag ant-tag-success',
      failed: 'ant-tag ant-tag-error',
      partial: 'ant-tag ant-tag-warning'
    };
    return '<span class="' + (tagMap[status] || 'ant-tag ant-tag-default') + '">' + escapeHtml(label) + '</span>';
  }

  var ENHANCE_SKIP_SELECTOR = '#toast-container, .ant-modal-root, script, style, svg';

  function hasClassToken(cls, token) {
    return (' ' + cls + ' ').indexOf(' ' + token + ' ') >= 0;
  }

  function classifyButtonType(btn) {
    var cls = btn.className || '';
    if (hasClassToken(cls, 'rc-view-tab') || hasClassToken(cls, 'ar-tab') || hasClassToken(cls, 'health-level-btn')) {
      return null;
    }
    if (hasClassToken(cls, 'ant-btn-primary') || hasClassToken(cls, 'btn-primary')) return 'primary';
    if (/\bbg-(blue|green|emerald)-[567]00\b/.test(cls)) return 'primary';
    if (hasClassToken(cls, 'btn-secondary') || /\bbg-gray-[456]00\b/.test(cls) || /\bbg-slate-[456]00\b/.test(cls)) {
      return 'default';
    }
    if (/\bbg-red-[567]00\b/.test(cls) || /\bborder-red-300\b/.test(cls)) return 'danger';
    if (/\b(delete-btn|remove-item-btn|btn-correct|btn-void|btn-reject)\b/.test(cls)) return 'link-danger';
    if (/\btext-red-[567]00\b/.test(cls) && !/\bbg-/.test(cls)) return 'link-danger';
    if (/\btext-(blue|teal|green|indigo|amber)-[567]00\b/.test(cls) && !/\bbg-/.test(cls)) return 'link';
    if (btn.type === 'submit' && !/\b(btn-secondary|danger|red|gray)\b/.test(cls)) return 'primary';
    return 'default';
  }

  function enhanceButton(btn) {
    if (btn.getAttribute('data-antd-enhanced') === 'button') return;
    if (btn.closest(ENHANCE_SKIP_SELECTOR)) return;
    var tabType = classifyButtonType(btn);
    if (tabType === null) return;
    btn.classList.add('ant-btn');
    if (tabType === 'link' || tabType === 'link-danger') {
      btn.classList.add(tabType === 'link-danger' ? 'ant-btn-link-danger' : 'ant-btn-link');
    } else {
      btn.classList.add('ant-btn-' + tabType);
    }
    if (/\btext-xs\b/.test(btn.className)) btn.classList.add('ant-btn-sm');
  }

  function enhanceFormControl(el) {
    if (el.getAttribute('data-antd-enhanced') === 'input') return;
    if (el.closest(ENHANCE_SKIP_SELECTOR)) return;
    var type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden') return;
    if (type === 'checkbox' || type === 'radio') {
      el.classList.add('ant-checkbox');
      el.setAttribute('data-antd-enhanced', 'input');
      return;
    }
    if (type === 'file') {
      el.classList.add('ant-upload-input');
      el.setAttribute('data-antd-enhanced', 'input');
      return;
    }
    el.classList.add('ant-input');
    if (el.tagName === 'SELECT') el.classList.add('ant-select-native');
    el.setAttribute('data-antd-enhanced', 'input');
  }

  function enhanceTable(table) {
    if (table.getAttribute('data-antd-enhanced') === 'table') return;
    table.classList.add('ant-table');
    table.setAttribute('data-antd-enhanced', 'table');
  }

  function enhanceCard(el) {
    if (el.getAttribute('data-antd-enhanced') === 'card') return;
    if (!/\bbg-white\b/.test(el.className)) return;
    el.classList.add('ant-card');
    el.setAttribute('data-antd-enhanced', 'card');
  }

  function enhanceAlert(el) {
    if (el.getAttribute('data-antd-enhanced') === 'alert') return;
    var cls = el.className || '';
    var variant = null;
    if (/\bbg-red-50\b/.test(cls) || /\bborder-red-/.test(cls)) variant = 'error';
    else if (/\bbg-green-50\b/.test(cls) || /\bborder-green-/.test(cls)) variant = 'success';
    else if (/\bbg-amber-50\b/.test(cls) || /\bborder-amber-/.test(cls)) variant = 'warning';
    if (!variant) return;
    el.classList.add('ant-alert', 'ant-alert-' + variant);
    el.setAttribute('data-antd-enhanced', 'alert');
  }

  function enhanceModalRoot(el) {
    if (el.getAttribute('data-antd-enhanced') === 'modal') return;
    if (!/\bfixed\b/.test(el.className) || !/\binset-0\b/.test(el.className)) return;
    el.classList.add('ant-modal-root');
    el.setAttribute('data-antd-enhanced', 'modal');
  }

  function enhanceTab(btn) {
    var cls = btn.className || '';
    if (!hasClassToken(cls, 'rc-view-tab') && !hasClassToken(cls, 'ar-tab')) return;
    btn.classList.add('ant-tabs-tab');
    syncTabActiveState(btn);
    btn.setAttribute('data-antd-enhanced', 'tab');
  }

  function syncTabActiveState(btn) {
    if (!hasClassToken(btn.className, 'rc-view-tab') && !hasClassToken(btn.className, 'ar-tab')) return;
    var active = btn.getAttribute('aria-selected') === 'true' ||
      /\bbg-teal-600\b/.test(btn.className) ||
      (hasClassToken(btn.className, 'ar-tab') && /\bborder-blue-600\b/.test(btn.className));
    btn.classList.toggle('ant-tabs-tab-active', active);
  }

  function enhanceTag(el) {
    if (el.getAttribute('data-antd-enhanced') === 'tag') return;
    var cls = el.className || '';
    if (!/\binline-flex\b/.test(cls) || !/\brounded/.test(cls)) return;
    if (!/\b(px-2|px-2\.5|py-0\.5|py-1)\b/.test(cls)) return;
    el.classList.add('ant-tag');
    el.setAttribute('data-antd-enhanced', 'tag');
  }

  function enhancePaginationRoot(el) {
    if (el.getAttribute('data-antd-enhanced') === 'pagination') return;
    if (!hasClassToken(el.className, 'ant-pagination') && !hasClassToken(el.className, 'pagination')) return;
    el.classList.add('ant-pagination');
    el.setAttribute('data-antd-enhanced', 'pagination');
  }

  function enhanceDom(root) {
    root = root || document.body;
    if (!root || root.nodeType !== 1) return;

    var scope = root === document.body ? document : root;
    var buttons = scope.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if (root !== document.body && !root.contains(buttons[i])) continue;
      enhanceTab(buttons[i]);
      enhanceButton(buttons[i]);
    }

    var inputs = scope.querySelectorAll('input, textarea, select');
    for (var j = 0; j < inputs.length; j++) {
      if (root !== document.body && !root.contains(inputs[j])) continue;
      enhanceFormControl(inputs[j]);
    }

    var tables = scope.querySelectorAll('table');
    for (var k = 0; k < tables.length; k++) {
      if (root !== document.body && !root.contains(tables[k])) continue;
      enhanceTable(tables[k]);
    }

    var cards = scope.querySelectorAll('[class*="bg-white"]');
    for (var c = 0; c < cards.length; c++) {
      if (root !== document.body && !root.contains(cards[c])) continue;
      enhanceCard(cards[c]);
    }

    var alerts = scope.querySelectorAll('[class*="bg-red-50"], [class*="bg-green-50"], [class*="bg-amber-50"]');
    for (var a = 0; a < alerts.length; a++) {
      if (root !== document.body && !root.contains(alerts[a])) continue;
      enhanceAlert(alerts[a]);
    }

    var modals = scope.querySelectorAll('[class*="fixed"][class*="inset-0"]');
    for (var m = 0; m < modals.length; m++) {
      if (root !== document.body && !root.contains(modals[m])) continue;
      enhanceModalRoot(modals[m]);
    }

    var tags = scope.querySelectorAll('span.inline-flex, span[class*="inline-flex"]');
    for (var t = 0; t < tags.length; t++) {
      if (root !== document.body && !root.contains(tags[t])) continue;
      enhanceTag(tags[t]);
    }

    var paginations = scope.querySelectorAll('.pagination, .ant-pagination');
    for (var p = 0; p < paginations.length; p++) {
      if (root !== document.body && !root.contains(paginations[p])) continue;
      enhancePaginationRoot(paginations[p]);
    }
  }

  var enhanceObserver = null;

  function startEnhanceObserver() {
    if (enhanceObserver || typeof MutationObserver === 'undefined') return;
    var targets = [
      document.getElementById('page-content-container'),
      document.getElementById('toast-container'),
      document.body
    ].filter(Boolean);

    enhanceObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes') {
          var target = mutation.target;
          if (target && target.nodeType === 1 && target.tagName === 'BUTTON') {
            syncTabActiveState(target);
          }
          return;
        }
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          enhanceDom(node);
        });
      });
    });

    targets.forEach(function (target) {
      enhanceObserver.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'aria-selected']
      });
    });
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
    enhanceDom: enhanceDom,
    startEnhanceObserver: startEnhanceObserver,
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
