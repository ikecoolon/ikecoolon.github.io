/**
 * 后台原型共享工具 — 只读/写入均通过 PetReportMockStore
 */
(function (global) {
  'use strict';

  var store = function () {
    return global.PetReportMockStore;
  };

  function parseRoute() {
    var raw = (global.location.hash || '').replace(/^#/, '') || 'report-center';
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

  function buildHash(pageId, params) {
    var hash = pageId;
    if (params && Object.keys(params).length) {
      hash += '?' + Object.keys(params).sort().map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
    }
    return hash;
  }

  function navigate(pageId, params) {
    params = params || {};
    if (global.PetAdminSession && typeof global.PetAdminSession.openTab === 'function') {
      global.PetAdminSession.openTab({
        pageId: pageId,
        params: params,
        title: params.title || null
      });
    }
    global.location.hash = buildHash(pageId, params);
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

  function confirmDialog(message, onConfirm, onCancel) {
    var modalApi = modal();
    if (!modalApi || !modalApi.open) {
      if (global.confirm(message) && onConfirm) onConfirm();
      return null;
    }
    return modalApi.open({
      title: '确认',
      bodyHtml: '<p class="rondo-modal-message">' + escapeHtml(message) + '</p>',
      okLabel: '确定',
      cancelLabel: '取消',
      onOk: function (close) {
        close();
        if (onConfirm) onConfirm();
      },
      onCancel: function (close) {
        close();
        if (onCancel) onCancel();
      }
    });
  }

  function promptDialog(title, placeholder, onSubmit) {
    var modalApi = modal();
    var inputId = 'rondo-prompt-input-' + Date.now();
    if (!modalApi || !modalApi.open) return null;
    var handle = modalApi.open({
      title: title,
      bodyHtml:
        '<label class="rondo-form-field" for="' + inputId + '">' +
        '<textarea class="rondo-input" id="' + inputId + '" rows="4" placeholder="' +
        escapeHtml(placeholder || '') + '"></textarea></label>',
      okLabel: '提交',
      cancelLabel: '取消',
      onOk: function (close, root) {
        var input = root.querySelector('#' + inputId);
        var val = input ? input.value.trim() : '';
        if (!val) {
          toast('请填写内容', 'warning');
          return false;
        }
        close();
        if (onSubmit) onSubmit(val);
      }
    });
    var input = handle && handle.root ? handle.root.querySelector('#' + inputId) : null;
    if (input) input.focus();
    return handle;
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
    bound: '已绑定'
  };

  function getCurrentIndicators(state, testRecordId) {
    return state.indicators.filter(function (i) {
      return i.testRecordId === testRecordId && i.isCurrent;
    });
  }

  var TEST_STATUS_LABELS = {
    pending_result: '待导入结果',
    import_failed: '导入异常',
    pending_review: '待审核',
    published: '已发布',
    unassigned: '待归属',
    voided: '已作废'
  };

  var REPORT_STATUS_LABELS = {
    unassigned: '待归属',
    incomplete: '待完善',
    pending_review: '待审核',
    published: '已发布',
    voided: '已作废'
  };

  var HEALTH_LEVELS = ['A', 'B', 'C', 'D', 'E'];

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
    var st = store();
    if (st && typeof st.getLatestAnalysisRun === 'function') {
      return st.getLatestAnalysisRun(reportId);
    }
    var report = lookupReport(state, reportId);
    if (!report || !report.latestAnalysisRunId) return null;
    return (state.analysisRuns || []).find(function (r) { return r.id === report.latestAnalysisRunId; }) || null;
  }

  function isValidResultIndicator(ind) {
    var st = store();
    if (st && typeof st.decorateResult === 'function') {
      return !!st.decorateResult(ind).isEffective;
    }
    var status = st && st.normalizeDataStatus ? st.normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
    if (status === 'NOT_DETECTED') return true;
    if (status === 'PRESENT') {
      var raw = ind.effectiveValue !== undefined ? ind.effectiveValue : ind.value;
      var val = Number(raw);
      return raw != null && raw !== '' && isFinite(val);
    }
    return false;
  }

  function buildPublicationChecks(state, reportId) {
    var st = store();
    if (st && typeof st.buildPublicationChecks === 'function') {
      return st.buildPublicationChecks(reportId, state);
    }
    var report = lookupReport(state, reportId);
    var blockers = [];
    var warnings = [];
    if (!report) {
      blockers.push({ id: 'report_missing', message: '报告不存在', category: 'system' });
      return { blockers: blockers, warnings: warnings };
    }
    return { blockers: blockers, warnings: warnings };
  }

  function saveReportAssessment(reportId, params, actor) {
    var st = store();
    if (!st) return null;
    return st.saveReportAssessment(reportId, params, actor);
  }

  function isReportInReviewQueue(report) {
    if (!report || report.status === 'voided') return false;
    if (report.correctionDraftActive) return true;
    return report.status === 'incomplete' || report.status === 'pending_review';
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
      import_failed: 'ant-tag ant-tag-error',
      unassigned: 'ant-tag ant-tag-purple',
      incomplete: 'ant-tag ant-tag-warning',
      pending_review: 'ant-tag ant-tag-warning',
      published: 'ant-tag ant-tag-success',
      voided: 'ant-tag ant-tag-default',
      success: 'ant-tag ant-tag-success',
      failed: 'ant-tag ant-tag-error',
      partial: 'ant-tag ant-tag-warning'
    };
    return '<span class="' + (tagMap[status] || 'ant-tag ant-tag-default') + '">' + escapeHtml(label) + '</span>';
  }

  /** @deprecated 使用显式 rondo-* / ant-* 类，不再扫描 Tailwind 颜色类 */
  function enhanceDom(/* root */) {
    /* intentional no-op */
  }

  /** @deprecated 配合 enhanceDom 一并停用 */
  function startEnhanceObserver() {
    /* intentional no-op */
  }

  function permissions() {
    return global.PetAdminPermissions || null;
  }

  function session() {
    return global.PetAdminSession || null;
  }

  function basicTable() {
    return global.PetAdminBasicTable || null;
  }

  function modal() {
    return global.PetAdminModal || null;
  }

  global.PetAdminCommon = {
    store: store,
    parseRoute: parseRoute,
    buildHash: buildHash,
    navigate: navigate,
    toast: toast,
    confirmDialog: confirmDialog,
    promptDialog: promptDialog,
    enhanceDom: enhanceDom,
    startEnhanceObserver: startEnhanceObserver,
    permissions: permissions,
    session: session,
    basicTable: basicTable,
    modal: modal,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    lookupUser: lookupUser,
    lookupPet: lookupPet,
    lookupStore: lookupStore,
    lookupReport: lookupReport,
    lookupTestRecord: lookupTestRecord,
    speciesToMajorBreed: speciesToMajorBreed,
    majorBreedToSpecies: majorBreedToSpecies,
    countPetReports: countPetReports,
    countUserReports: countUserReports,
    getUnassignedTestRecords: getUnassignedTestRecords,
    subscribeDemo: subscribeDemo,
    createPlatformUser: createPlatformUser,
    updatePlatformUser: updatePlatformUser,
    updateOpsPet: updateOpsPet,
    OWNERSHIP_STATUS_LABELS: OWNERSHIP_STATUS_LABELS,
    SUBMISSION_TYPE_LABELS: {
      in_store: '本店送检',
      customer_brought: '客户自带报告'
    },
    getCurrentIndicators: getCurrentIndicators,
    TEST_STATUS_LABELS: TEST_STATUS_LABELS,
    REPORT_STATUS_LABELS: REPORT_STATUS_LABELS,
    DATA_STATUS_LABELS: DATA_STATUS_LABELS,
    statusBadge: statusBadge,
    HEALTH_LEVELS: HEALTH_LEVELS,
    getWorkingReportVersion: getWorkingReportVersion,
    getPublishedReportVersion: getPublishedReportVersion,
    getLatestAnalysisRun: getLatestAnalysisRun,
    buildPublicationChecks: buildPublicationChecks,
    saveReportAssessment: saveReportAssessment,
    isReportInReviewQueue: isReportInReviewQueue,
    validateAssessmentInput: validateAssessmentInput,
    getReportSpeciesForChecks: getReportSpeciesForChecks,
    isValidResultIndicator: isValidResultIndicator
  };
})(window);
