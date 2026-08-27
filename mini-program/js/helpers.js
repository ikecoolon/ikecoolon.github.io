/* global PetReportMockStore */
(function (root) {
  'use strict';

  var CURRENT_USER_ID = 'user-001';
  var SELECTED_PET_KEY = 'pet-mini-selected-pet';
  var CLAIM_INVALID_MSG = '该领取码已失效，请联系检测门店或运营人员';

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
    var userStatus = item.userStatus || getStore().getUserReportStatus(report, CURRENT_USER_ID);
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
    var coveredTestRecordIds = {};

    store.getUserVisibleReports(userId).forEach(function (item) {
      var testRecord = findTestRecord(item.report.testRecordId);
      if (shouldExcludeUserCard(item.report, testRecord)) return;
      cards.push(buildCardFromReport(item));
      coveredTestRecordIds[item.report.testRecordId] = true;
    });

    state.testRecords.forEach(function (tr) {
      if (tr.userId !== userId) return;
      if (coveredTestRecordIds[tr.id]) return;
      if (tr.status !== 'pending_result') return;
      if (shouldExcludeUserCard(null, tr)) return;
      cards.push(buildCardFromTestRecord(tr, 'in_progress'));
    });

    if (options.petId) {
      cards = cards.filter(function (card) { return card.petId === options.petId; });
    }
    if (options.userStatus) {
      cards = cards.filter(function (card) { return card.userStatus === options.userStatus; });
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
    var projection = getStore().getUserPublishedReportProjection(CURRENT_USER_ID, reportId);
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

  function evaluateSnapshotIndicatorConclusion(ind) {
    var status = ind.dataStatus === 'VALID' ? 'PRESENT' : ind.dataStatus;
    if (status === 'NOT_DETECTED') {
      return { dataStatus: 'NOT_DETECTED', conclusion: null };
    }
    if (isInvalidDataStatus(ind.dataStatus)) {
      return { dataStatus: ind.dataStatus, conclusion: null };
    }
    if (!ind.effectiveRange || ind.value == null || ind.value === '') {
      return { dataStatus: 'PRESENT', conclusion: null };
    }
    var num = Number(ind.value);
    if (num < ind.effectiveRange.min) {
      return { dataStatus: 'PRESENT', conclusion: 'LOW' };
    }
    if (num > ind.effectiveRange.max) {
      return { dataStatus: 'PRESENT', conclusion: 'HIGH' };
    }
    return { dataStatus: 'PRESENT', conclusion: 'NORMAL' };
  }

  function buildFindingsFromSnapshot(snapshot, reportId, verNum) {
    if (snapshot.findings && snapshot.findings.length) {
      return snapshot.findings.map(function (f) {
        return Object.assign({}, f);
      });
    }

    var findings = [];
    var recs = snapshot.recommendations || [];
    var analysis = snapshot.analysis && snapshot.analysis.finalContent || {};
    var liveById = {};
    getState().findings.forEach(function (f) {
      if (f.reportId === reportId && f.reportVersion === verNum) liveById[f.id] = f;
    });

    recs.forEach(function (frec) {
      if (!frec.findingId) return;
      var live = liveById[frec.findingId];
      if (live) {
        findings.push(Object.assign({}, live));
        return;
      }
      var rel = frec.relation || {};
      findings.push({
        id: frec.findingId,
        reportId: reportId,
        reportVersion: verNum,
        indicatorKey: rel.indicatorKey || '综合',
        conclusion: null,
        dataStatus: 'PRESENT',
        description: rel.reason || rel.label || '',
        professional: rel.reason || '',
        consumer: rel.label || ''
      });
    });

    (snapshot.indicators || []).forEach(function (ind) {
      if (findings.some(function (f) { return f.indicatorKey === ind.key; })) return;
      var evalResult = evaluateSnapshotIndicatorConclusion(ind);
      if (evalResult.dataStatus !== 'NOT_DETECTED' &&
          evalResult.conclusion !== 'LOW' &&
          evalResult.conclusion !== 'HIGH' &&
          evalResult.conclusion !== 'ABNORMAL') {
        return;
      }
      findings.push({
        id: 'snap-' + ind.key,
        reportId: reportId,
        reportVersion: verNum,
        indicatorKey: ind.key,
        conclusion: evalResult.conclusion,
        dataStatus: evalResult.dataStatus,
        description: analysis.professional || '',
        professional: analysis.professional || '',
        consumer: analysis.consumer || ''
      });
    });

    return findings;
  }

  function getReportIndicators(reportId, version) {
    var ctx = getPublishedReportContext(reportId);
    if (ctx && ctx.snapshot && ctx.snapshot.indicators) {
      return ctx.snapshot.indicators.map(function (ind) {
        return Object.assign({ reportId: reportId }, ind);
      });
    }

    var state = getState();
    var report = findReport(reportId);
    if (!report) return [];
    var ver = version;
    if (ver == null) {
      ver = ctx ? ctx.verNum : report.currentVersion;
    }
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

  function getReportFindings(reportId, version) {
    var ctx = getPublishedReportContext(reportId);
    if (ctx && ctx.snapshot) {
      return buildFindingsFromSnapshot(ctx.snapshot, reportId, ctx.verNum);
    }

    var ver = version;
    if (ver == null && ctx) ver = ctx.verNum;
    return getState().findings.filter(function (f) {
      if (f.reportId !== reportId) return false;
      if (ver != null && f.reportVersion !== ver) return false;
      return true;
    });
  }

  function mapFrozenRecommendation(frozen, reportId) {
    var rel = frozen.relation || {};
    return {
      id: frozen.id,
      findingId: frozen.findingId,
      reportId: reportId,
      targetType: rel.targetType,
      primaryProductId: rel.primaryProductId,
      productId: rel.primaryProductId,
      healthTagIds: (rel.healthTagIds || []).slice(),
      label: rel.label,
      reason: rel.reason,
      relation: rel,
      resolution: frozen.resolution || null,
      frozen: frozen
    };
  }

  function getReportRecommendations(reportId) {
    if (!canUserAccessPublishedReport(reportId)) return [];
    var ctx = getPublishedReportContext(reportId);
    if (ctx && ctx.snapshot && ctx.snapshot.recommendations) {
      return ctx.snapshot.recommendations.map(function (frozen) {
        return mapFrozenRecommendation(frozen, reportId);
      });
    }
    return getState().recommendations.filter(function (r) { return r.reportId === reportId; });
  }

  function getFrozenRecommendation(rec) {
    if (!rec) return null;
    var reportId = rec.reportId || (rec.frozen && rec.reportId);
    if (!reportId && rec.id) {
      var live = findRecommendation(rec.id);
      reportId = live ? live.reportId : null;
    }
    if (!reportId) return null;
    var ctx = getPublishedReportContext(reportId);
    if (!ctx || !ctx.snapshot) return null;
    var id = rec.id || rec;
    return (ctx.snapshot.recommendations || []).find(function (r) { return r.id === id; }) || null;
  }

  function getFrozenRecommendationRelation(rec) {
    var frozen = getFrozenRecommendation(rec);
    return frozen && frozen.relation ? frozen.relation : null;
  }

  function findReportFinding(reportId, findingId) {
    return getReportFindings(reportId).find(function (f) { return f.id === findingId; }) || null;
  }

  function getFindingRecommendation(findingId) {
    var live = findFinding(findingId);
    var reportId = live ? live.reportId : null;
    if (!reportId) {
      getState().reports.forEach(function (report) {
        if (!reportId && canUserAccessPublishedReport(report.id)) {
          var match = getReportRecommendations(report.id).find(function (r) { return r.findingId === findingId; });
          if (match) reportId = report.id;
        }
      });
    }
    if (!reportId) return null;
    return getReportRecommendations(reportId).find(function (r) { return r.findingId === findingId; }) || null;
  }

  function getPendingClaimCodes() {
    return getState().claimCodes.filter(function (c) { return c.status === 'pending'; });
  }

  function previewClaimCode(code) {
    if (!code) return null;
    var state = getState();
    var claim = state.claimCodes.find(function (c) {
      return String(c.code).toUpperCase() === String(code).trim().toUpperCase() && c.status === 'pending';
    });
    if (!claim) return null;
    var pet = claim.petId ? findPet(claim.petId) : null;
    var testRecord = claim.testRecordId ? findTestRecord(claim.testRecordId) : null;
    var report = testRecord
      ? state.reports.find(function (r) { return r.testRecordId === testRecord.id; })
      : null;
    return {
      code: claim.code,
      claim: claim,
      pet: pet,
      testRecord: testRecord,
      report: report,
      petName: pet ? stripDemo(pet.name) : '—',
      title: getCardTitle(report, testRecord),
      testDate: getCardTestDate(report, testRecord)
    };
  }

  function bindClaimCodeForUser(code) {
    try {
      return getStore().bindClaimCode({
        code: code,
        userId: CURRENT_USER_ID
      });
    } catch (err) {
      throw new Error(CLAIM_INVALID_MSG);
    }
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
    if (status === 'in_progress') return '进行中';
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

  function canRecommend(status) {
    var normalized = status === 'VALID' ? 'PRESENT' : status;
    return normalized === 'PRESENT';
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

  function resolveIndicatorRange(indicator, species) {
    if (!indicator) return null;
    var store = getStore();
    if (store && typeof store.resolveEffectiveRangeForIndicator === 'function') {
      return store.resolveEffectiveRangeForIndicator(indicator, species);
    }
    if (indicator.effectiveRange) {
      return {
        min: indicator.effectiveRange.min,
        max: indicator.effectiveRange.max,
        unit: indicator.effectiveRange.unit,
        source: indicator.effectiveRange.source || 'frozen'
      };
    }
    if (indicator.manualRange) {
      return {
        min: indicator.manualRange.min,
        max: indicator.manualRange.max,
        unit: indicator.manualRange.unit,
        source: 'manual'
      };
    }
    if (indicator.importedRange && indicator.importedRange.min != null && indicator.importedRange.max != null) {
      return {
        min: indicator.importedRange.min,
        max: indicator.importedRange.max,
        unit: indicator.importedRange.unit || indicator.unit,
        source: 'imported'
      };
    }
    return null;
  }

  function formatRangeText(range) {
    if (!range || range.min == null || range.max == null) return null;
    return range.min + '–' + range.max + (range.unit || '');
  }

  function formatIndicatorValue(indicator) {
    if (!indicator) return null;
    var status = indicator.dataStatus === 'VALID' ? 'PRESENT' : indicator.dataStatus;
    if (status === 'NOT_DETECTED') return '未检出';
    if (isInvalidDataStatus(indicator.dataStatus)) return null;
    if (indicator.value == null || indicator.value === '') return null;
    return String(indicator.value) + (indicator.unit || '');
  }

  function evaluateIndicatorPresentation(indicator, finding, species) {
    var status = indicator.dataStatus === 'VALID' ? 'PRESENT' : indicator.dataStatus;
    var range = resolveIndicatorRange(indicator, species);
    var rangeText = formatRangeText(range);

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
    if (isInvalidDataStatus(indicator.dataStatus)) {
      return {
        valueText: null,
        rangeText: rangeText,
        statusText: dataStatusLabel(indicator.dataStatus),
        statusClass: 'status-invalid',
        canJudge: false,
        showValue: false
      };
    }
    if (indicator.value == null || indicator.value === '') {
      return {
        valueText: null,
        rangeText: rangeText,
        statusText: '无有效值',
        statusClass: 'status-muted',
        canJudge: false,
        showValue: false
      };
    }

    var valueText = String(indicator.value) + (indicator.unit || '');
    if (!range) {
      return {
        valueText: valueText,
        rangeText: null,
        statusText: '暂无参考范围',
        statusClass: 'status-no-range',
        canJudge: false,
        showValue: true
      };
    }

    if (finding && finding.conclusion && finding.dataStatus !== 'NOT_DETECTED') {
      return {
        valueText: valueText,
        rangeText: rangeText,
        statusText: conclusionLabel(finding.conclusion),
        statusClass: conclusionClass(finding.conclusion),
        canJudge: true,
        showValue: true
      };
    }

    var num = Number(indicator.value);
    if (num < range.min) {
      return {
        valueText: valueText,
        rangeText: rangeText,
        statusText: '偏低',
        statusClass: 'status-low',
        canJudge: true,
        showValue: true
      };
    }
    if (num > range.max) {
      return {
        valueText: valueText,
        rangeText: rangeText,
        statusText: '偏高',
        statusClass: 'status-high',
        canJudge: true,
        showValue: true
      };
    }
    return {
      valueText: valueText,
      rangeText: rangeText,
      statusText: '正常',
      statusClass: 'status-normal',
      canJudge: true,
      showValue: true
    };
  }

  function indicatorDisplayStatus(indicator, finding, species) {
    var pres = evaluateIndicatorPresentation(indicator, finding, species || 'cat');
    return { text: pres.statusText, className: pres.statusClass };
  }

  function isMicrobiotaIndicator(indicator) {
    var entry = findCatalogEntryByKey(indicator.key);
    return entry && entry.type === 'microbiota';
  }

  function partitionReportIndicators(reportId, version) {
    var indicators = getReportIndicators(reportId, version);
    var regular = [];
    var microbiota = [];
    indicators.forEach(function (ind) {
      if (isMicrobiotaIndicator(ind)) microbiota.push(ind);
      else regular.push(ind);
    });
    return { regular: regular, microbiota: microbiota };
  }

  function buildMicrobiotaTree(reportId, version) {
    var catalog = getProfessionalCatalog();
    var indicators = getReportIndicators(reportId, version);
    var findings = getReportFindings(reportId, version);
    var species = getReportSpecies(reportId);
    var indicatorByKey = {};
    indicators.forEach(function (ind) { indicatorByKey[ind.key] = ind; });

    var phyla = (catalog.microbiotaTaxa || []).filter(function (t) { return t.level === 'phylum'; });
    var genera = (catalog.microbiotaTaxa || []).filter(function (t) { return t.level === 'genus'; });

    return phyla.map(function (phylum) {
      var ind = indicatorByKey[phylum.key];
      var finding = findings.find(function (f) { return f.indicatorKey === phylum.key; });
      var hasResult = !!ind && (ind.dataStatus === 'NOT_DETECTED' || !isInvalidDataStatus(ind.dataStatus));
      var children = genera.filter(function (g) { return g.parentKey === phylum.key; }).map(function (genus) {
        var gInd = indicatorByKey[genus.key];
        var gFinding = findings.find(function (f) { return f.indicatorKey === genus.key; });
        var gHasResult = !!gInd && (gInd.dataStatus === 'NOT_DETECTED' || !isInvalidDataStatus(gInd.dataStatus));
        return {
          taxon: genus,
          indicator: gInd || null,
          finding: gFinding || null,
          hasResult: gHasResult,
          presentation: gInd ? evaluateIndicatorPresentation(gInd, gFinding, species) : null
        };
      });
      var genusResults = children.filter(function (c) { return c.hasResult; });
      return {
        taxon: phylum,
        indicator: ind || null,
        finding: finding || null,
        hasResult: hasResult,
        presentation: ind ? evaluateIndicatorPresentation(ind, finding, species) : null,
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

  function normalizeTaxonEdu(edu) {
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
    out.knowledgeText = pick(edu.knowledgeText, edu.functionText, edu.appearance);
    if (!out.knowledgeText && Array.isArray(edu.mainTasks) && edu.mainTasks.length) {
      out.knowledgeText = edu.mainTasks.map(function (task) {
        return String(task == null ? '' : task).trim();
      }).filter(Boolean).join('；');
    }
    return out;
  }

  function getTaxonEdu(key) {
    if (!key) return null;
    var entry = findCatalogEntryByKey(key);
    if (!entry || entry.type !== 'microbiota') return null;
    var taxon = entry.item;
    return {
      taxon: taxon,
      latinName: taxon.latinName ? String(taxon.latinName) : '',
      edu: normalizeTaxonEdu(taxon.edu)
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
    return edu.knowledgeText || null;
  }

  function findFindingByIndicator(reportId, version, indicatorKey) {
    return getReportFindings(reportId, version).find(function (f) {
      return f.indicatorKey === indicatorKey;
    }) || null;
  }

  function shouldShowIndicator(indicator) {
    if (!indicator) return false;
    var status = indicator.dataStatus === 'VALID' ? 'PRESENT' : indicator.dataStatus;
    if (status === 'NOT_DETECTED') return true;
    if (isInvalidDataStatus(indicator.dataStatus)) return false;
    return true;
  }

  function getIndicatorDetailContext(reportId, indicatorKey) {
    var ctx = getPublishedReportContext(reportId);
    if (!ctx) return null;
    var indicators = getReportIndicators(reportId, ctx.verNum);
    var indicator = indicators.find(function (i) { return i.key === indicatorKey; });
    if (!indicator) return null;
    var finding = findFindingByIndicator(reportId, ctx.verNum, indicatorKey);
    var species = getReportSpecies(reportId);
    return {
      report: ctx.report,
      version: ctx.version,
      verNum: ctx.verNum,
      indicator: indicator,
      finding: finding,
      species: species,
      presentation: evaluateIndicatorPresentation(indicator, finding, species),
      knowledge: getTaxonKnowledge(indicatorKey),
      label: getIndicatorLabel(indicatorKey),
      entry: findCatalogEntryByKey(indicatorKey)
    };
  }

  function resolveRecDisplay(rec) {
    var store = getStore();
    var reportId = rec.reportId;
    var ctx = getPublishedReportContext(reportId);
    var species = ctx && ctx.snapshot
      ? (ctx.snapshot.reportSpecies || getReportSpecies(reportId))
      : getReportSpecies(reportId);
    var relation = getFrozenRecommendationRelation(rec) || {
      targetType: rec.targetType,
      primaryProductId: rec.primaryProductId || rec.productId,
      healthTagIds: rec.healthTagIds || [],
      label: rec.label,
      reason: rec.reason
    };

    var resolved = store.resolveRecommendationTarget({
      targetType: 'PRODUCT',
      primaryProductId: relation.primaryProductId,
      productId: relation.primaryProductId,
      healthTagIds: relation.healthTagIds || [],
      species: species
    });

    var product = resolved.resolvedProductId
      ? getProductById(resolved.resolvedProductId)
      : null;
    var candidates = (resolved.candidates || []).map(function (c) {
      return {
        productId: c.productId,
        product: c.product || getProductById(c.productId),
        sortOrder: c.sortOrder,
        healthTagId: c.healthTagId
      };
    });

    var adviceText = stripDemo(relation.label || rec.label || '');
    if (!adviceText && relation.reason) adviceText = stripDemo(relation.reason);

    return {
      resolvedType: resolved.resolvedType,
      availability: resolved.availability,
      product: product,
      candidates: candidates,
      candidateProductIds: resolved.candidateProductIds || [],
      label: adviceText || stripDemo(resolved.label),
      reason: stripDemo(relation.reason || ''),
      downgradePath: resolved.downgradePath
    };
  }

  function hasProductRecommendation(rec) {
    var display = resolveRecDisplay(rec);
    return display.resolvedType === 'PRODUCT' && display.product;
  }

  function productStatusLabel(product) {
    if (!product) return '—';
    if (!product.available) return '已下架';
    var stock = product.stock != null ? product.stock : 1;
    if (stock <= 0) return '零库存';
    return '可售';
  }

  function productStatusClass(product) {
    if (!product) return 'badge-muted';
    if (!product.available) return 'badge-danger';
    var stock = product.stock != null ? product.stock : 1;
    if (stock <= 0) return 'badge-warn';
    return 'status-normal';
  }

  function countUserStats() {
    var pets = getUserPets();
    var cards = getUserVisibleCards(CURRENT_USER_ID);
    var published = cards.filter(function (c) { return c.userStatus === 'published'; });
    var inProgress = cards.filter(function (c) { return c.userStatus === 'in_progress'; });
    return {
      petCount: pets.length,
      reportCount: cards.length,
      publishedCount: published.length,
      inProgressCount: inProgress.length
    };
  }

  root.PetMiniHelpers = {
    CURRENT_USER_ID: CURRENT_USER_ID,
    CLAIM_INVALID_MSG: CLAIM_INVALID_MSG,
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
    getProductById: getProductById,
    getUserVisibleCards: getUserVisibleCards,
    countVisibleReportsForPet: countVisibleReportsForPet,
    getPublishedReportContext: getPublishedReportContext,
    canUserAccessPublishedReport: canUserAccessPublishedReport,
    getReportIndicators: getReportIndicators,
    getReportFindings: getReportFindings,
    getReportRecommendations: getReportRecommendations,
    getFindingRecommendation: getFindingRecommendation,
    getPendingClaimCodes: getPendingClaimCodes,
    previewClaimCode: previewClaimCode,
    bindClaimCodeForUser: bindClaimCodeForUser,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    petSpeciesIcon: petSpeciesIcon,
    genderLabel: genderLabel,
    userStatusLabel: userStatusLabel,
    isInvalidDataStatus: isInvalidDataStatus,
    canRecommend: canRecommend,
    dataStatusLabel: dataStatusLabel,
    conclusionLabel: conclusionLabel,
    conclusionClass: conclusionClass,
    formatIndicatorValue: formatIndicatorValue,
    indicatorDisplayStatus: indicatorDisplayStatus,
    resolveRecDisplay: resolveRecDisplay,
    getFrozenRecommendationRelation: getFrozenRecommendationRelation,
    getFrozenRecommendation: getFrozenRecommendation,
    findReportFinding: findReportFinding,
    productStatusLabel: productStatusLabel,
    productStatusClass: productStatusClass,
    hasProductRecommendation: hasProductRecommendation,
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
    getTaxonEdu: getTaxonEdu,
    getMicrobiotaPresentation: getMicrobiotaPresentation,
    resolveMicrobiotaSceneStatusWord: resolveMicrobiotaSceneStatusWord,
    buildMicrobiotaStorySentence: buildMicrobiotaStorySentence,
    listChildGenera: listChildGenera,
    fillEduTokens: fillEduTokens,
    getTaxonKnowledge: getTaxonKnowledge,
    findFindingByIndicator: findFindingByIndicator,
    shouldShowIndicator: shouldShowIndicator,
    getIndicatorDetailContext: getIndicatorDetailContext
  };
})(window);
