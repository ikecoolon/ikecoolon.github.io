/* global PetReportMockStore */
(function (root) {
  'use strict';

  var CURRENT_USER_KEY = 'pet-mini-demo-user';
  var SELECTED_PET_KEY = 'pet-mini-selected-pet';
  var DEFAULT_USER_ID = 'user-001';
  var DEMO_PERSONAS = [
    { id: 'multi', userId: 'user-001', label: '多宠切换' },
    { id: 'one-published', userId: 'user-004', label: '单宠已发布' },
    { id: 'one-processing', userId: 'user-002', label: '单宠处理中' },
    { id: 'empty', userId: 'user-003', label: '无宠物' }
  ];

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

  function getCurrentUserId() {
    var saved = null;
    try {
      saved = sessionStorage.getItem(CURRENT_USER_KEY);
    } catch (e) { /* ignore */ }
    if (saved && getState().users.some(function (u) { return u.id === saved; })) return saved;
    return DEFAULT_USER_ID;
  }

  function setCurrentUserId(userId) {
    try {
      sessionStorage.setItem(CURRENT_USER_KEY, userId);
      sessionStorage.removeItem(SELECTED_PET_KEY);
    } catch (e) { /* ignore */ }
  }

  function getCurrentUser() {
    var userId = getCurrentUserId();
    return getState().users.find(function (u) { return u.id === userId; }) || null;
  }

  function getUserPets() {
    var userId = getCurrentUserId();
    return getState().pets.filter(function (p) { return p.userId === userId; });
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

  function getProductById(productId) {
    if (!productId) return null;
    return getState().products.find(function (p) { return p.id === productId; }) || null;
  }

  function getTodoFlags(report, testRecord) {
    return getStore().getTodoFlags(report, testRecord);
  }

  function shouldExcludeUserCard(report, testRecord) {
    if (testRecord) {
      if (testRecord.status === 'import_failed' || testRecord.status === 'voided') return true;
    }
    if (report) {
      if (report.status === 'voided') return true;
      var flags = getTodoFlags(report, testRecord);
      if (flags.indexOf('import_error') >= 0) return true;
      if (flags.indexOf('rejected') >= 0) return true;
      if (flags.indexOf('unassigned') >= 0) return true;
    }
    return false;
  }

  function getCardTitle(report, testRecord) {
    if (report && report.reportNumber) return stripDemo(report.reportNumber);
    if (testRecord && testRecord.label) return stripDemo(testRecord.label);
    return '肠道检测';
  }

  function getCardTestDate(report, testRecord) {
    if (testRecord && testRecord.testDate) return testRecord.testDate;
    return null;
  }

  function buildCardFromReport(item) {
    var report = item.report;
    var testRecord = findTestRecord(report.testRecordId);
    var userStatus = item.userStatus || getStore().getUserReportStatus(report, getCurrentUserId());
    return {
      id: report.id,
      reportId: report.id,
      testRecordId: report.testRecordId,
      petId: report.petId,
      userStatus: userStatus,
      clickable: userStatus === 'published',
      title: getCardTitle(report, testRecord),
      testDate: getCardTestDate(report, testRecord),
      report: report,
      testRecord: testRecord,
      publishedVersion: item.publishedVersion || getStore().getPublishedVersionSnapshot(report)
    };
  }

  function buildCardFromTestRecord(testRecord, userStatus) {
    return {
      id: 'tr:' + testRecord.id,
      reportId: null,
      testRecordId: testRecord.id,
      petId: testRecord.petId,
      userStatus: userStatus || 'in_progress',
      clickable: false,
      title: getCardTitle(null, testRecord),
      testDate: getCardTestDate(null, testRecord),
      report: null,
      testRecord: testRecord,
      publishedVersion: null
    };
  }

  function getUserVisibleCards(userId, options) {
    options = options || {};
    var store = getStore();
    var state = getState();
    var cards = [];
    var seenTestRecords = {};
    var userPetIds = state.pets.filter(function (p) { return p.userId === userId; }).map(function (p) { return p.id; });

    store.getUserVisibleReports(userId).forEach(function (item) {
      var testRecord = findTestRecord(item.report.testRecordId);
      if (shouldExcludeUserCard(item.report, testRecord)) return;
      if (item.userStatus !== 'published') return;
      seenTestRecords[item.report.testRecordId] = true;
      cards.push(buildCardFromReport(item));
    });

    (state.reports || []).forEach(function (report) {
      if (!report.petId || userPetIds.indexOf(report.petId) < 0) return;
      if (seenTestRecords[report.testRecordId]) return;
      var pet = findPet(report.petId);
      if (!pet || pet.userId !== userId) return;
      var testRecord = findTestRecord(report.testRecordId);
      if (shouldExcludeUserCard(report, testRecord)) return;
      var workflow = store.getWorkflowStatus(report, testRecord);
      if (workflow === 'published' || workflow === 'voided' || report.status === 'voided') return;
      seenTestRecords[report.testRecordId] = true;
      cards.push({
        id: report.id,
        reportId: report.id,
        testRecordId: report.testRecordId,
        petId: report.petId,
        userStatus: 'in_progress',
        clickable: false,
        title: getCardTitle(report, testRecord),
        testDate: getCardTestDate(report, testRecord),
        report: report,
        testRecord: testRecord,
        publishedVersion: null
      });
    });

    (state.testRecords || []).forEach(function (tr) {
      if (seenTestRecords[tr.id]) return;
      if (tr.status !== 'pending_result') return;
      if (!tr.petId || userPetIds.indexOf(tr.petId) < 0) return;
      var pet = findPet(tr.petId);
      if (!pet || pet.userId !== userId) return;
      seenTestRecords[tr.id] = true;
      cards.push(buildCardFromTestRecord(tr, 'in_progress'));
    });

    if (options.petId) {
      cards = cards.filter(function (card) { return card.petId === options.petId; });
    }
    if (options.userStatus === 'published') {
      cards = cards.filter(function (card) { return card.userStatus === 'published'; });
    } else if (options.userStatus === 'in_progress') {
      cards = cards.filter(function (card) { return card.userStatus === 'in_progress'; });
    }

    cards.sort(function (a, b) {
      return String(b.testDate || '').localeCompare(String(a.testDate || ''));
    });

    return cards;
  }

  function countVisibleReportsForPet(petId, userId) {
    return getUserVisibleCards(userId, { petId: petId }).length;
  }

  function getPublishedReportContext(reportId) {
    var projection = getStore().getUserPublishedReportProjection(getCurrentUserId(), reportId);
    if (!projection || projection.userStatus !== 'published') return null;
    var version = projection.publishedVersion;
    if (!version) return null;
    return {
      report: projection.report,
      version: version,
      verNum: version.version,
      userStatus: projection.userStatus,
      snapshot: projection.contentSnapshot || null
    };
  }

  function canUserAccessPublishedReport(reportId) {
    return getPublishedReportContext(reportId) != null;
  }

  function publishedSnapshot(reportId) {
    var ctx = getPublishedReportContext(reportId);
    return ctx && ctx.snapshot ? ctx.snapshot : null;
  }

  function getReportResults(reportId) {
    var snap = publishedSnapshot(reportId);
    if (snap && Array.isArray(snap.results)) {
      return snap.results.map(function (row) {
        return Object.assign({ reportId: reportId }, row);
      });
    }
    var store = getStore();
    if (store && typeof store.getEffectiveResults === 'function') {
      return store.getEffectiveResults(reportId) || [];
    }
    return [];
  }

  function getPhylumUnitsForReport(reportId) {
    var snap = publishedSnapshot(reportId);
    if (snap && Array.isArray(snap.phylumUnits)) {
      return snap.phylumUnits.slice();
    }
    var store = getStore();
    if (store && typeof store.getPhylumUnits === 'function') {
      return store.getPhylumUnits(reportId) || [];
    }
    return [];
  }

  function getPhylumUnit(reportId, phylumKey) {
    if (!phylumKey) return null;
    return getPhylumUnitsForReport(reportId).find(function (unit) {
      return unit.phylumKey === phylumKey;
    }) || null;
  }

  function hasAnyEffectiveRange(reportId) {
    var snap = publishedSnapshot(reportId);
    if (snap && snap.hasAnyEffectiveRange != null) {
      return !!snap.hasAnyEffectiveRange;
    }
    var store = getStore();
    if (store && typeof store.hasAnyEffectiveRange === 'function') {
      return !!store.hasAnyEffectiveRange(reportId);
    }
    return false;
  }

  function resultNumericValue(result) {
    if (!result) return null;
    if (result.effectiveValue != null && result.effectiveValue !== '') return result.effectiveValue;
    if (result.value != null && result.value !== '') return result.value;
    return null;
  }

  function unitPublishedAnalysis(unit) {
    if (!unit || unit.confirmStatus !== 'confirmed') return '';
    return stripDemo(unit.analysis || unit.analysisDraft || '');
  }

  function unitPublishedAdvice(unit) {
    if (!unit) return '';
    return stripDemo(unit.advice || unit.adviceDraft || '');
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

  function userStatusLabel(status) {
    if (status === 'published') return '已发布';
    if (status === 'in_progress') return '报告处理中';
    return status || '—';
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

  var THEME_CONFIG = {
    A: { key: 'rainforest', name: '雨林', sceneClass: 'theme-A', icon: 'fa-cloud-rain' },
    B: { key: 'forest', name: '森林', sceneClass: 'theme-B', icon: 'fa-tree' },
    C: { key: 'grassland', name: '草原', sceneClass: 'theme-C', icon: 'fa-seedling' },
    D: { key: 'moss', name: '苔藓', sceneClass: 'theme-D', icon: 'fa-leaf' },
    E: { key: 'desert', name: '沙漠', sceneClass: 'theme-E', icon: 'fa-sun' }
  };

  var PRESENTATION_DIM_LABELS = {
    emotion: '情绪稳定',
    immunity: '免疫能力',
    diversity: '菌群多样性',
    balance: '菌群平衡',
    barrier: '屏障功能'
  };

  var PRESENTATION_SUMMARY_ICONS = {
    health_level: 'fa-star',
    health_score: 'fa-chart-line',
    species: 'fa-paw'
  };

  function getProfessionalCatalog() {
    var state = getState();
    var catalog = state.professionalCatalog;
    if (catalog && catalog.microbiotaTaxa) return catalog;
    return {
      testIndicators: [],
      microbiotaTaxa: [],
      platformReferenceRanges: []
    };
  }

  function getThemeConfig(level) {
    return THEME_CONFIG[level] || THEME_CONFIG.C;
  }

  function getReportSpecies(reportId) {
    var ctx = getPublishedReportContext(reportId);
    if (ctx && ctx.snapshot && ctx.snapshot.reportSpecies) return ctx.snapshot.reportSpecies;
    var report = findReport(reportId);
    if (!report) return 'cat';
    if (report.reportSpecies) return report.reportSpecies;
    var pet = report.petId ? findPet(report.petId) : null;
    if (pet && pet.species) return pet.species;
    if (pet && /犬|狗|金毛|拉布拉多|哈士奇|泰迪|柯基/.test(pet.breed || '')) return 'dog';
    return 'cat';
  }

  function findCatalogEntryByKey(key) {
    var catalog = getProfessionalCatalog();
    var indicator = (catalog.testIndicators || []).find(function (i) {
      return i.key === key || i.label === key;
    });
    if (indicator) return { type: 'indicator', item: indicator };
    var taxon = (catalog.microbiotaTaxa || []).find(function (t) {
      return t.key === key || t.label === key;
    });
    if (taxon) return { type: 'microbiota', item: taxon };
    return null;
  }

  function resolveIndicatorRange(result) {
    if (!result) return null;
    if (result.range && result.range.min != null && result.range.max != null) {
      return {
        min: result.range.min,
        max: result.range.max,
        unit: result.range.unit || result.unit || '',
        source: result.rangeSource || 'none'
      };
    }
    return null;
  }

  function formatRangeText(range) {
    if (!range || range.min == null || range.max == null) return null;
    return range.min + '–' + range.max + (range.unit || '');
  }

  function labNoticeLabel(notice) {
    var store = getStore();
    var labels = store && store.LAB_NOTICE_LABELS
      ? store.LAB_NOTICE_LABELS
      : { high: '实验室标注偏高', low: '实验室标注偏低', unmarked: '未标注' };
    if (!notice) return labels.unmarked || '未标注';
    return labels[notice] || notice;
  }

  function evaluateIndicatorPresentation(result) {
    result = result || {};
    var status = result.dataStatus === 'VALID' ? 'PRESENT' : result.dataStatus;
    var range = resolveIndicatorRange(result);
    var rangeStatus = result.rangeStatus;
    var rangeText = rangeStatus === 'no_range' ? null : formatRangeText(range);
    var raw = resultNumericValue(result);

    if (status === 'NOT_DETECTED') {
      return {
        valueText: '未检出',
        rangeText: rangeText,
        statusText: '未检出',
        statusClass: 'status-not-detected',
        canJudge: false,
        showValue: true
      };
    }
    if (isInvalidDataStatus(result.dataStatus)) {
      return {
        valueText: null,
        rangeText: rangeText,
        statusText: dataStatusLabel(result.dataStatus),
        statusClass: 'status-invalid',
        canJudge: false,
        showValue: false
      };
    }
    if (raw == null || raw === '') {
      return {
        valueText: null,
        rangeText: rangeText,
        statusText: '无有效值',
        statusClass: 'status-muted',
        canJudge: false,
        showValue: false
      };
    }

    var valueText = String(raw) + (result.unit || '');
    if (rangeStatus === 'no_range' || (rangeStatus == null && !range)) {
      return {
        valueText: valueText,
        rangeText: null,
        statusText: '暂无参考范围',
        statusClass: 'status-no-range',
        canJudge: false,
        showValue: true
      };
    }
    if (rangeStatus === 'low') {
      return {
        valueText: valueText,
        rangeText: rangeText,
        statusText: '偏低',
        statusClass: 'status-low',
        canJudge: true,
        showValue: true
      };
    }
    if (rangeStatus === 'high') {
      return {
        valueText: valueText,
        rangeText: rangeText,
        statusText: '偏高',
        statusClass: 'status-high',
        canJudge: true,
        showValue: true
      };
    }
    if (rangeStatus === 'normal') {
      return {
        valueText: valueText,
        rangeText: rangeText,
        statusText: '正常',
        statusClass: 'status-normal',
        canJudge: true,
        showValue: true
      };
    }
    return {
      valueText: valueText,
      rangeText: rangeText,
      statusText: '无有效值',
      statusClass: 'status-muted',
      canJudge: false,
      showValue: true
    };
  }

  function isMicrobiotaIndicator(result) {
    var entry = findCatalogEntryByKey(result.key);
    return entry && entry.type === 'microbiota';
  }

  function partitionReportIndicators(reportId) {
    var results = getReportResults(reportId);
    var regular = [];
    var microbiota = [];
    results.forEach(function (row) {
      if (isMicrobiotaIndicator(row)) microbiota.push(row);
      else regular.push(row);
    });
    return { regular: regular, microbiota: microbiota };
  }

  function buildMicrobiotaTree(reportId) {
    var catalog = getProfessionalCatalog();
    var results = getReportResults(reportId);
    var resultByKey = {};
    results.forEach(function (row) { resultByKey[row.key] = row; });

    var phyla = (catalog.microbiotaTaxa || []).filter(function (t) { return t.level === 'phylum'; });
    var genera = (catalog.microbiotaTaxa || []).filter(function (t) { return t.level === 'genus'; });

    return phyla.map(function (phylum) {
      var ind = resultByKey[phylum.key];
      var unit = getPhylumUnit(reportId, phylum.key);
      var hasResult = !!ind && (ind.dataStatus === 'NOT_DETECTED' || !isInvalidDataStatus(ind.dataStatus));
      var children = genera.filter(function (g) { return g.parentKey === phylum.key; }).map(function (genus) {
        var gInd = resultByKey[genus.key];
        var gHasResult = !!gInd && (gInd.dataStatus === 'NOT_DETECTED' || !isInvalidDataStatus(gInd.dataStatus));
        return {
          taxon: genus,
          indicator: gInd || null,
          hasResult: gHasResult,
          presentation: gInd ? evaluateIndicatorPresentation(gInd) : null
        };
      });
      var genusResults = children.filter(function (c) { return c.hasResult; });
      return {
        taxon: phylum,
        indicator: ind || null,
        unit: unit || null,
        hasResult: hasResult,
        presentation: ind ? evaluateIndicatorPresentation(ind) : null,
        children: children,
        genusResults: genusResults,
        knowledgeOnly: genusResults.length === 0 && children.length > 0
      };
    }).filter(function (node) { return node.hasResult; });
  }

  function normalizePresentationDimensions(presDimensions, assessmentDims) {
    var src = assessmentDims || presDimensions;
    if (!src) return [];
    if (Array.isArray(src)) {
      return src.filter(function (dim) { return dim && dim.score != null; });
    }
    return Object.keys(src).filter(function (key) {
      return key !== 'demo' && key !== 'note' && src[key] != null;
    }).map(function (key) {
      return {
        key: key,
        label: PRESENTATION_DIM_LABELS[key] || key,
        score: src[key]
      };
    });
  }

  function normalizePresentationSummaryItems(items) {
    if (!items || !items.length) return [];
    return items.filter(function (item) {
      return item && (item.text || item.value != null);
    }).map(function (item) {
      if (item.text) {
        return { icon: item.icon || 'fa-circle-info', text: item.text };
      }
      var text = item.label || item.key || '';
      if (item.value != null && item.value !== '') {
        text = text ? text + '：' + item.value : String(item.value);
      }
      return {
        icon: item.icon || PRESENTATION_SUMMARY_ICONS[item.key] || 'fa-circle-info',
        text: text
      };
    });
  }

  function normalizePresentationBenchmarkMap(benchmarks) {
    var map = {};
    if (!benchmarks) return map;
    if (Array.isArray(benchmarks)) {
      benchmarks.forEach(function (bench) {
        if (!bench || bench.key == null) return;
        if (bench.indicatorKey) {
          map[bench.indicatorKey] = { ideal: bench.ideal != null ? bench.ideal : bench.value, unit: bench.unit || '' };
        }
      });
      return map;
    }
    Object.keys(benchmarks).forEach(function (key) {
      map[key] = benchmarks[key];
    });
    return map;
  }

  function getSnapshotPresentation(reportId) {
    var ctx = getPublishedReportContext(reportId);
    if (!ctx || !ctx.snapshot) return null;
    var snap = ctx.snapshot;
    var assessment = snap.assessment || {};
    var pres = snap.presentationMock || {};
    return {
      percentile: assessment.percentile != null ? assessment.percentile : null,
      dimensions: normalizePresentationDimensions(pres.dimensions, assessment.platformDimensions),
      summaryItems: normalizePresentationSummaryItems(pres.summaryItems),
      benchmarks: normalizePresentationBenchmarkMap(pres.benchmarks),
      presentationBenchmarks: pres.benchmarks || []
    };
  }

  function getDemoBenchmark(reportId, indicatorKey) {
    var pres = getSnapshotPresentation(reportId);
    if (!pres || !pres.benchmarks) return null;
    return pres.benchmarks[indicatorKey] || null;
  }

  function getIndicatorLabel(key) {
    var entry = findCatalogEntryByKey(key);
    return entry ? entry.item.label || entry.item.key : key;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function localEmptyTaxonEdu() {
    return {
      sceneCopy: '',
      introText: '',
      mainTasks: [],
      appearanceText: '',
      functionText: '',
      hint: '',
      knowledgeText: ''
    };
  }

  function emptyTaxonEdu() {
    var store = getStore();
    if (store && typeof store.emptyTaxonEdu === 'function') {
      return store.emptyTaxonEdu();
    }
    return localEmptyTaxonEdu();
  }

  function normalizeEduForDisplay(edu) {
    var store = getStore();
    if (store && typeof store.normalizeTaxonEdu === 'function') {
      return store.normalizeTaxonEdu(edu);
    }
    var out = localEmptyTaxonEdu();
    if (!edu || typeof edu !== 'object') return out;
    function pick() {
      for (var i = 0; i < arguments.length; i++) {
        var value = arguments[i];
        if (value != null && String(value).trim()) return String(value).trim();
      }
      return '';
    }
    out.sceneCopy = pick(edu.sceneCopy, edu.narrativeRole, edu.metaphor, edu.sceneRole);
    out.introText = pick(edu.introText);
    out.appearanceText = pick(edu.appearanceText, edu.appearance);
    out.functionText = pick(edu.functionText);
    out.hint = pick(edu.hint);
    out.knowledgeText = pick(edu.knowledgeText);
    if (Array.isArray(edu.mainTasks)) {
      edu.mainTasks.forEach(function (task) {
        if (out.mainTasks.length >= 3) return;
        var line = String(task == null ? '' : task).trim();
        if (line) out.mainTasks.push(line);
      });
    }
    return out;
  }

  function normalizeTaxonEdu(edu) {
    return normalizeEduForDisplay(edu);
  }

  function resolveTaxonNodeHint(edu) {
    if (!edu) return '';
    var hint = edu.hint;
    return hint ? String(hint).trim() : '';
  }

  function getTaxonEdu(key) {
    if (!key) return null;
    var entry = findCatalogEntryByKey(key);
    if (!entry || entry.type !== 'microbiota') return null;
    var taxon = entry.item;
    return {
      taxon: taxon,
      latinName: taxon.latinName ? String(taxon.latinName) : '',
      edu: normalizeEduForDisplay(taxon.edu)
    };
  }

  function localDefaultMicrobiotaPresentation() {
    return {
      low: '略显稀疏',
      normal: '生机适宜',
      high: '略显繁茂'
    };
  }

  function normalizeMicrobiotaPresentation(pres, fillDefaults) {
    var store = getStore();
    if (store && typeof store.normalizeMicrobiotaPresentation === 'function') {
      return store.normalizeMicrobiotaPresentation(pres, fillDefaults);
    }
    var defaults = localDefaultMicrobiotaPresentation();
    var src = pres && typeof pres === 'object' ? pres : {};
    function val(key) {
      if (src[key] === undefined) return fillDefaults ? defaults[key] : '';
      if (src[key] == null) return '';
      return String(src[key]).trim();
    }
    return {
      low: val('low'),
      normal: val('normal'),
      high: val('high')
    };
  }

  function getMicrobiotaPresentation() {
    var store = getStore();
    if (store && typeof store.getMicrobiotaPresentation === 'function') {
      return store.getMicrobiotaPresentation();
    }
    var catalog = getProfessionalCatalog();
    return normalizeMicrobiotaPresentation(catalog.microbiotaPresentation, true);
  }

  function resolveMicrobiotaSceneStatusWord(statusClass, presentation) {
    var store = getStore();
    if (store && typeof store.resolveMicrobiotaSceneStatusWord === 'function') {
      return store.resolveMicrobiotaSceneStatusWord(statusClass, presentation);
    }
    var key = statusClass === 'status-low' ? 'low'
      : statusClass === 'status-normal' ? 'normal'
      : statusClass === 'status-high' ? 'high'
      : null;
    if (!key) return '';
    var pres = normalizeMicrobiotaPresentation(presentation || getMicrobiotaPresentation(), true);
    if (!pres[key]) return '';
    return String(pres[key]).trim();
  }

  function buildMicrobiotaStorySentence(params) {
    params = params || {};
    var sceneCopy = String(params.sceneCopy || '').trim();
    if (!sceneCopy) return '';
    var petName = params.petName || '';
    var themeName = params.themeName || '';
    var taxonLabel = params.taxonLabel || '';
    var sentence = petName + '的' + themeName + '上有' + sceneCopy + '——' + taxonLabel;
    var statusWord = '';
    if (params.forceStatusKey) {
      var pres = normalizeMicrobiotaPresentation(params.presentation || getMicrobiotaPresentation(), true);
      statusWord = pres[params.forceStatusKey] ? String(pres[params.forceStatusKey]).trim() : '';
    } else if (params.statusClass) {
      statusWord = resolveMicrobiotaSceneStatusWord(params.statusClass, params.presentation);
    }
    if (statusWord) sentence += '——' + statusWord;
    return sentence;
  }

  function listChildGenera(phylumKey) {
    if (!phylumKey) return [];
    return (getProfessionalCatalog().microbiotaTaxa || []).filter(function (taxon) {
      return taxon.level === 'genus' && taxon.parentKey === phylumKey;
    });
  }

  function fillEduTokens(text, vars) {
    if (text == null || text === '') return '';
    vars = vars || {};
    return String(text).replace(/\{(pet|theme|taxon|value|status|latin)\}/g, function (_, token) {
      if (!Object.prototype.hasOwnProperty.call(vars, token) || vars[token] == null) return '';
      return String(vars[token]);
    });
  }

  function getTaxonKnowledge(key) {
    var packed = getTaxonEdu(key);
    if (!packed) return null;
    var edu = packed.edu || emptyTaxonEdu();
    var taxon = packed.taxon || {};
    if (taxon.level === 'phylum') {
      return edu.introText || edu.knowledgeText || null;
    }
    return edu.functionText || edu.knowledgeText || null;
  }

  function shouldShowIndicator(result) {
    if (!result) return false;
    var status = result.dataStatus === 'VALID' ? 'PRESENT' : result.dataStatus;
    if (status === 'NOT_DETECTED') return true;
    if (isInvalidDataStatus(result.dataStatus)) return false;
    return true;
  }

  function getIndicatorDetailContext(reportId, indicatorKey) {
    var ctx = getPublishedReportContext(reportId);
    if (!ctx) return null;
    var results = getReportResults(reportId);
    var result = results.find(function (row) { return row.key === indicatorKey; });
    if (!result) return null;
    return {
      report: ctx.report,
      version: ctx.version,
      verNum: ctx.verNum,
      indicator: result,
      species: getReportSpecies(reportId),
      presentation: evaluateIndicatorPresentation(result),
      knowledge: getTaxonKnowledge(indicatorKey),
      label: getIndicatorLabel(indicatorKey),
      entry: findCatalogEntryByKey(indicatorKey)
    };
  }

  function availabilityStatusClass(status) {
    if (status === 'on_sale') return 'status-normal';
    if (status === 'off_shelf') return 'badge-danger';
    if (status === 'zero_stock') return 'badge-warn';
    return 'badge-muted';
  }

  function resolveUnitProductDisplay(unit) {
    if (!unit || !unit.primaryProductId) {
      return {
        primaryProductId: null,
        primaryProduct: null,
        isPrimaryOnSale: false,
        availability: null,
        label: '',
        statusClass: 'badge-muted'
      };
    }
    var store = getStore();
    var resolved = store && typeof store.resolveProductAvailability === 'function'
      ? store.resolveProductAvailability(unit.primaryProductId)
      : {
        productId: unit.primaryProductId,
        product: getProductById(unit.primaryProductId),
        status: null,
        available: false,
        label: ''
      };
    var product = resolved.product || getProductById(unit.primaryProductId);
    return {
      primaryProductId: unit.primaryProductId,
      primaryProduct: product || null,
      isPrimaryOnSale: !!resolved.available,
      availability: resolved.status || null,
      label: resolved.label || '',
      statusClass: availabilityStatusClass(resolved.status)
    };
  }

  function productStatusLabel(product) {
    if (!product) return '—';
    var store = getStore();
    if (store && typeof store.resolveProductAvailability === 'function') {
      var resolved = store.resolveProductAvailability(product.id);
      if (resolved && resolved.label) return resolved.label;
    }
    if (!product.available) return '已下架';
    var stock = product.stock != null ? product.stock : 1;
    if (stock <= 0) return '零库存';
    return '可售';
  }

  function productStatusClass(product) {
    if (!product) return 'badge-muted';
    var store = getStore();
    if (store && typeof store.resolveProductAvailability === 'function') {
      return availabilityStatusClass(store.resolveProductAvailability(product.id).status);
    }
    if (!product.available) return 'badge-danger';
    var stock = product.stock != null ? product.stock : 1;
    if (stock <= 0) return 'badge-warn';
    return 'status-normal';
  }

  function countUserStats() {
    var pets = getUserPets();
    var cards = getUserVisibleCards(getCurrentUserId());
    var publishedCount = cards.filter(function (c) { return c.userStatus === 'published'; }).length;
    var inProgressCount = cards.filter(function (c) { return c.userStatus === 'in_progress'; }).length;
    return {
      petCount: pets.length,
      reportCount: cards.length,
      publishedCount: publishedCount,
      inProgressCount: inProgressCount
    };
  }

  root.PetMiniHelpers = {
    CURRENT_USER_ID: DEFAULT_USER_ID,
    DEMO_PERSONAS: DEMO_PERSONAS,
    getCurrentUserId: getCurrentUserId,
    setCurrentUserId: setCurrentUserId,
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
    getProductById: getProductById,
    getUserVisibleCards: getUserVisibleCards,
    countVisibleReportsForPet: countVisibleReportsForPet,
    getPublishedReportContext: getPublishedReportContext,
    canUserAccessPublishedReport: canUserAccessPublishedReport,
    getReportResults: getReportResults,
    getPhylumUnit: getPhylumUnit,
    getPhylumUnitsForReport: getPhylumUnitsForReport,
    hasAnyEffectiveRange: hasAnyEffectiveRange,
    resultNumericValue: resultNumericValue,
    unitPublishedAnalysis: unitPublishedAnalysis,
    unitPublishedAdvice: unitPublishedAdvice,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    petSpeciesIcon: petSpeciesIcon,
    genderLabel: genderLabel,
    userStatusLabel: userStatusLabel,
    isInvalidDataStatus: isInvalidDataStatus,
    dataStatusLabel: dataStatusLabel,
    labNoticeLabel: labNoticeLabel,
    productStatusLabel: productStatusLabel,
    productStatusClass: productStatusClass,
    countUserStats: countUserStats,
    getProfessionalCatalog: getProfessionalCatalog,
    getThemeConfig: getThemeConfig,
    getReportSpecies: getReportSpecies,
    findCatalogEntryByKey: findCatalogEntryByKey,
    resolveIndicatorRange: resolveIndicatorRange,
    formatRangeText: formatRangeText,
    evaluateIndicatorPresentation: evaluateIndicatorPresentation,
    isMicrobiotaIndicator: isMicrobiotaIndicator,
    partitionReportIndicators: partitionReportIndicators,
    buildMicrobiotaTree: buildMicrobiotaTree,
    getSnapshotPresentation: getSnapshotPresentation,
    getDemoBenchmark: getDemoBenchmark,
    getIndicatorLabel: getIndicatorLabel,
    escapeHtml: escapeHtml,
    emptyTaxonEdu: emptyTaxonEdu,
    normalizeTaxonEdu: normalizeTaxonEdu,
    normalizeEduForDisplay: normalizeEduForDisplay,
    resolveTaxonNodeHint: resolveTaxonNodeHint,
    getTaxonEdu: getTaxonEdu,
    getMicrobiotaPresentation: getMicrobiotaPresentation,
    resolveMicrobiotaSceneStatusWord: resolveMicrobiotaSceneStatusWord,
    buildMicrobiotaStorySentence: buildMicrobiotaStorySentence,
    listChildGenera: listChildGenera,
    fillEduTokens: fillEduTokens,
    getTaxonKnowledge: getTaxonKnowledge,
    shouldShowIndicator: shouldShowIndicator,
    getIndicatorDetailContext: getIndicatorDetailContext,
    resolveUnitProductDisplay: resolveUnitProductDisplay
  };
})(window);
