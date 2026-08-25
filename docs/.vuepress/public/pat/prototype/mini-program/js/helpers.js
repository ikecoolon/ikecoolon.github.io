/* global PetReportMockStore */
(function (root) {
  'use strict';

  var CURRENT_USER_ID = 'user-001';
  var VERIFY_CODE = '123456';
  var SELECTED_PET_KEY = 'pet-mini-selected-pet';

  function stripDemo(text) {
    if (!text) return '';
    return String(text).replace(/\[演示 Mock\]\s*/g, '').trim();
  }

  function getStore() {
    return root.PetReportMockStore;
  }

  function getState() {
    return getStore().getState();
  }

  function getCurrentUser() {
    return getState().users.find(function (u) { return u.id === CURRENT_USER_ID; }) || null;
  }

  function getUserPets() {
    return getState().pets.filter(function (p) { return p.userId === CURRENT_USER_ID; });
  }

  function getSelectedPetId() {
    var pets = getUserPets();
    var saved = null;
    try {
      saved = sessionStorage.getItem(SELECTED_PET_KEY);
    } catch (e) { /* ignore */ }
    if (saved && pets.some(function (p) { return p.id === saved; })) return saved;
    return pets.length ? pets[0].id : null;
  }

  function setSelectedPetId(petId) {
    try {
      sessionStorage.setItem(SELECTED_PET_KEY, petId);
    } catch (e) { /* ignore */ }
  }

  function findPet(petId) {
    return getState().pets.find(function (p) { return p.id === petId; }) || null;
  }

  function findStore(storeId) {
    if (!storeId) return null;
    return getState().stores.find(function (s) { return s.id === storeId; }) || null;
  }

  function findTestRecord(id) {
    return getState().testRecords.find(function (t) { return t.id === id; }) || null;
  }

  function findReport(id) {
    return getState().reports.find(function (r) { return r.id === id; }) || null;
  }

  function findFinding(id) {
    return getState().findings.find(function (f) { return f.id === id; }) || null;
  }

  function findRecommendation(id) {
    return getState().recommendations.find(function (r) { return r.id === id; }) || null;
  }

  function getPetTestRecords(petId) {
    return getState().testRecords
      .filter(function (t) { return t.petId === petId && t.userId === CURRENT_USER_ID; })
      .sort(function (a, b) { return String(b.testDate).localeCompare(String(a.testDate)); });
  }

  function getPetReports(petId) {
    return getState().reports
      .filter(function (r) { return r.petId === petId && r.userId === CURRENT_USER_ID; })
      .sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
  }

  function getLatestPublishedReport(petId) {
    var reports = getPetReports(petId).filter(function (r) {
      return r.status === 'published' || r.status === 'corrected';
    });
    return reports[0] || null;
  }

  function getActiveTestRecords(petId) {
    return getPetTestRecords(petId).filter(function (t) {
      return ['pending_result', 'pending_review', 'pending_claim', 'import_failed'].indexOf(t.status) >= 0;
    });
  }

  function getReportVersion(report, version) {
    if (!report || !report.versions) return null;
    return report.versions.find(function (v) { return v.version === version; }) || null;
  }

  function getCurrentReportVersion(report) {
    if (!report) return null;
    return getReportVersion(report, report.currentVersion);
  }

  function getReportIndicators(reportId, version) {
    var state = getState();
    var report = findReport(reportId);
    if (!report) return [];
    var ver = version || report.currentVersion;
    var relevant = state.indicators.filter(function (ind) {
      return ind.reportId === reportId && ind.version <= ver;
    });
    var byKey = {};
    relevant.forEach(function (ind) {
      if (!byKey[ind.key] || byKey[ind.key].version < ind.version) {
        byKey[ind.key] = ind;
      }
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; });
  }

  function getTestRecordIndicators(testRecordId) {
    return getState().indicators.filter(function (ind) {
      return ind.testRecordId === testRecordId && ind.isCurrent;
    });
  }

  function getReportFindings(reportId, version) {
    return getState().findings.filter(function (f) {
      if (f.reportId !== reportId) return false;
      if (version != null && f.reportVersion !== version) return false;
      return true;
    });
  }

  function getReportRecommendations(reportId) {
    return getState().recommendations.filter(function (r) { return r.reportId === reportId; });
  }

  function getFindingRecommendation(findingId) {
    return getState().recommendations.find(function (r) { return r.findingId === findingId; }) || null;
  }

  function formatDate(isoOrDate) {
    if (!isoOrDate) return '—';
    var d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return String(isoOrDate);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return formatDate(iso) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function petSpeciesIcon(pet) {
    var breed = (pet && pet.breed) || '';
    if (/猫/.test(breed)) return 'fa-cat';
    if (/犬|狗|金毛|拉布拉多|哈士奇|泰迪|柯基/.test(breed)) return 'fa-dog';
    return 'fa-paw';
  }

  function genderLabel(gender) {
    if (gender === 'female') return '母';
    if (gender === 'male') return '公';
    return '未知';
  }

  function isInvalidDataStatus(status) {
    return ['MISSING_COLUMN', 'EMPTY', 'NOT_DETECTED', 'INVALID', 'NOT_APPLICABLE'].indexOf(status) >= 0;
  }

  function dataStatusLabel(status) {
    var normalized = status === 'VALID' ? 'PRESENT' : status;
    var map = {
      PRESENT: '有效',
      MISSING_COLUMN: '缺失',
      EMPTY: '空值',
      NOT_DETECTED: '未检出',
      INVALID: '无效',
      NOT_APPLICABLE: '不适用'
    };
    return map[normalized] || normalized;
  }

  function canRecommend(status) {
    var normalized = status === 'VALID' ? 'PRESENT' : status;
    return normalized === 'PRESENT';
  }

  function canUserAccessReport(reportId) {
    var report = findReport(reportId);
    if (!report) return false;
    return report.userId === CURRENT_USER_ID;
  }

  function conclusionLabel(conclusion) {
    var map = { LOW: '偏低', HIGH: '偏高', NORMAL: '正常', ABNORMAL: '异常' };
    return map[conclusion] || conclusion || '—';
  }

  function conclusionClass(conclusion) {
    if (conclusion === 'LOW') return 'status-low';
    if (conclusion === 'HIGH') return 'status-high';
    if (conclusion === 'NORMAL') return 'status-normal';
    return 'status-muted';
  }

  function testRecordStatusLabel(status) {
    var map = {
      pending_result: '检测中',
      pending_review: '报告审核中',
      published: '已发布',
      pending_claim: '待认领',
      import_failed: '检测异常'
    };
    return map[status] || status;
  }

  function reportStatusLabel(status) {
    var map = {
      draft: '草稿',
      pending_review: '审核中',
      rejected: '已驳回',
      approved: '已批准',
      published: '已发布',
      corrected: '已更正'
    };
    return map[status] || status;
  }

  function getProgressSteps(testRecord) {
    var status = testRecord ? testRecord.status : '';
    var failed = status === 'import_failed';
    var steps = [
      { key: 'registered', label: '已登记', desc: '门店已登记样本信息' },
      { key: 'testing', label: '已送检', desc: '实验室检测进行中' },
      { key: 'review', label: '报告审核', desc: '专业团队审核报告' },
      { key: 'published', label: '已发布', desc: '报告可供查看' }
    ];

    steps.forEach(function (step, idx) {
      step.done = false;
      step.active = false;
      step.failed = false;
    });

    if (!testRecord) return steps;

    steps[0].done = true;

    if (failed) {
      steps[1].done = true;
      steps[1].failed = true;
      steps[1].active = true;
      return steps;
    }

    if (status === 'pending_claim') {
      steps[0].active = true;
      return steps;
    }

    if (status === 'pending_result') {
      steps[1].active = true;
      return steps;
    }

    if (status === 'pending_review') {
      steps[1].done = true;
      steps[2].active = true;
      return steps;
    }

    if (status === 'published') {
      steps[1].done = true;
      steps[2].done = true;
      steps[3].done = true;
      return steps;
    }

    return steps;
  }

  function formatIndicatorValue(indicator) {
    if (!indicator) return '—';
    if (isInvalidDataStatus(indicator.dataStatus)) return '本次无有效数据';
    if (indicator.value == null) return '—';
    return indicator.value + (indicator.unit || '');
  }

  function indicatorDisplayStatus(indicator, finding) {
    if (!indicator) return { text: '—', className: 'status-muted' };
    if (isInvalidDataStatus(indicator.dataStatus)) {
      return { text: '本次无有效数据', className: 'status-invalid' };
    }
    if (finding && finding.conclusion) {
      return { text: conclusionLabel(finding.conclusion), className: conclusionClass(finding.conclusion) };
    }
    return { text: '正常', className: 'status-normal' };
  }

  function resolveRecDisplay(rec) {
    var store = getStore();
    var state = getState();
    var resolved = store.resolveRecommendationTarget({
      targetType: rec.resolvedType || rec.targetType,
      productId: rec.resolvedProductId || rec.productId,
      categoryId: rec.resolvedCategoryId || rec.categoryId
    });
    var product = resolved.resolvedProductId
      ? state.products.find(function (p) { return p.id === resolved.resolvedProductId; })
      : null;
    var category = resolved.resolvedCategoryId
      ? state.categories.find(function (c) { return c.id === resolved.resolvedCategoryId; })
      : null;
    return {
      resolvedType: resolved.resolvedType,
      product: product,
      category: category,
      label: stripDemo(rec.label || resolved.label),
      downgradePath: resolved.downgradePath
    };
  }

  function hasProductRecommendation(rec) {
    var display = resolveRecDisplay(rec);
    return display.resolvedType === 'PRODUCT' && display.product;
  }

  function getClaimDemoScenarios() {
    return [
      {
        code: 'CLAIM-PUBLISHED-2025',
        verify: VERIFY_CODE,
        label: '已发布报告',
        desc: '认领已发布检测记录，成功后跳转报告详情',
        mode: 'claim-published'
      },
      {
        code: 'CLAIM-PROGRESS-2025',
        verify: VERIFY_CODE,
        label: '检测/审核中',
        desc: '认领审核中的记录，成功后跳转检测进度',
        mode: 'claim-progress'
      },
      {
        code: 'CLAIM-NEW-2025',
        verify: VERIFY_CODE,
        label: '首次认领新记录',
        desc: '绑定尚未关联宠物的新检测，成功后进入进度',
        mode: 'claim-new'
      },
      {
        code: 'CLAIM-INVALID-XXXX',
        verify: VERIFY_CODE,
        label: '无效认领码',
        desc: '演示认领码不存在时的错误提示',
        mode: 'invalid-code'
      },
      {
        code: 'CLAIM-NEW-2025',
        verify: '000000',
        label: '验证码错误',
        desc: '演示验证码错误（正确码为 123456）',
        mode: 'wrong-verify'
      }
    ];
  }

  function countUserStats() {
    var pets = getUserPets();
    var reports = getState().reports.filter(function (r) { return r.userId === CURRENT_USER_ID; });
    var published = reports.filter(function (r) { return r.status === 'published' || r.status === 'corrected'; });
    var inProgress = getState().testRecords.filter(function (t) {
      return t.userId === CURRENT_USER_ID && ['pending_result', 'pending_review', 'pending_claim'].indexOf(t.status) >= 0;
    });
    return { petCount: pets.length, reportCount: reports.length, publishedCount: published.length, inProgressCount: inProgress.length };
  }

  root.PetMiniHelpers = {
    CURRENT_USER_ID: CURRENT_USER_ID,
    VERIFY_CODE: VERIFY_CODE,
    stripDemo: stripDemo,
    getStore: getStore,
    getState: getState,
    getCurrentUser: getCurrentUser,
    getUserPets: getUserPets,
    getSelectedPetId: getSelectedPetId,
    setSelectedPetId: setSelectedPetId,
    findPet: findPet,
    findStore: findStore,
    findTestRecord: findTestRecord,
    findReport: findReport,
    findFinding: findFinding,
    findRecommendation: findRecommendation,
    getPetTestRecords: getPetTestRecords,
    getPetReports: getPetReports,
    getLatestPublishedReport: getLatestPublishedReport,
    getActiveTestRecords: getActiveTestRecords,
    getReportVersion: getReportVersion,
    getCurrentReportVersion: getCurrentReportVersion,
    getReportIndicators: getReportIndicators,
    getTestRecordIndicators: getTestRecordIndicators,
    getReportFindings: getReportFindings,
    getReportRecommendations: getReportRecommendations,
    getFindingRecommendation: getFindingRecommendation,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    petSpeciesIcon: petSpeciesIcon,
    genderLabel: genderLabel,
    isInvalidDataStatus: isInvalidDataStatus,
    canRecommend: canRecommend,
    canUserAccessReport: canUserAccessReport,
    dataStatusLabel: dataStatusLabel,
    conclusionLabel: conclusionLabel,
    conclusionClass: conclusionClass,
    testRecordStatusLabel: testRecordStatusLabel,
    reportStatusLabel: reportStatusLabel,
    getProgressSteps: getProgressSteps,
    formatIndicatorValue: formatIndicatorValue,
    indicatorDisplayStatus: indicatorDisplayStatus,
    resolveRecDisplay: resolveRecDisplay,
    hasProductRecommendation: hasProductRecommendation,
    getClaimDemoScenarios: getClaimDemoScenarios,
    countUserStats: countUserStats
  };
})(window);
