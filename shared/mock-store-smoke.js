#!/usr/bin/env node
'use strict';

var store = require('./mock-store.js');

var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error('FAIL:', message);
    return;
  }
  passed += 1;
  console.log('OK:', message);
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, message + ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

function main() {
  store.reset();
  var state = store.getState();

  assert(state.meta.version >= 3, 'meta.version migrated to >= 3');
  assert(Array.isArray(state.healthTags) && state.healthTags.length >= 3, 'seed healthTags');
  assert(Array.isArray(state.healthTagProducts) && state.healthTagProducts.length >= 3, 'seed healthTagProducts');
  assert(state.professionalCatalog && state.professionalCatalog.microbiotaTaxa.length >= 3, 'seed professionalCatalog');
  var bacteroidetes = state.professionalCatalog.microbiotaTaxa.find(function (t) { return t.key === '拟杆菌门'; });
  assert(bacteroidetes && bacteroidetes.edu && bacteroidetes.edu.sceneCopy, '拟杆菌门 has edu.sceneCopy');
  assert(bacteroidetes.edu.narrativeRole === undefined, 'edu model omits narrativeRole');
  assert(bacteroidetes.edu.tooLowHint === undefined, 'edu model omits tooLowHint');
  assert(bacteroidetes.edu.tooHighHint === undefined, 'edu model omits tooHighHint');
  assert(state.meta.version >= 8, 'meta.version migrated to >= 8');
  assert(state.meta.version >= 9, 'meta.version migrated to >= 9');
  assert(state.professionalCatalog.meta && state.professionalCatalog.meta.version >= 7, 'catalog.meta.version migrated to >= 7');
  assert(state.professionalCatalog.meta.version >= 9, 'catalog.meta.version migrated to >= 9');
  assert(state.professionalCatalog.microbiotaPresentation, 'seed microbiotaPresentation');
  assertEqual(state.professionalCatalog.microbiotaPresentation.low, '略显稀疏', 'default low scene status word');
  assertEqual(state.professionalCatalog.microbiotaPresentation.normal, '生机适宜', 'default normal scene status word');
  assertEqual(state.professionalCatalog.microbiotaPresentation.high, '略显繁茂', 'default high scene status word');
  var stripped = store.normalizeTaxonEdu({
    narrativeRole: '活跃的采集者',
    functionText: '中性说明',
    tooLowHint: '旧偏低提示',
    tooHighHint: '旧偏高提示',
    mainTasks: ['一', '二']
  });
  assertEqual(stripped.sceneCopy, '活跃的采集者', 'normalizeTaxonEdu migrates sceneCopy from narrativeRole');
  assertEqual(stripped.functionText, '中性说明', 'normalizeTaxonEdu keeps functionText');
  assert(stripped.narrativeRole === undefined, 'normalizeTaxonEdu strips narrativeRole');
  assert(stripped.mainTasks && stripped.mainTasks.length === 2, 'normalizeTaxonEdu keeps mainTasks up to 3');
  assertEqual(stripped.lowHint, '旧偏低提示', 'normalizeTaxonEdu migrates lowHint from tooLowHint');
  assertEqual(stripped.highHint, '旧偏高提示', 'normalizeTaxonEdu migrates highHint from tooHighHint');
  assert(bacteroidetes.edu.introText, '拟杆菌门 has edu.introText after V11');
  assert(bacteroidetes.edu.mainTasks && bacteroidetes.edu.mainTasks.length >= 1, '拟杆菌门 has mainTasks after V11');
  var bacteroides = state.professionalCatalog.microbiotaTaxa.find(function (t) { return t.key === 'Bacteroides'; });
  assert(bacteroides && bacteroides.edu && bacteroides.edu.appearanceText, 'Bacteroides has appearanceText');
  assert(bacteroides.edu.functionText, 'Bacteroides has functionText');
  assert(store.peekState() === store.peekState(), 'peekState returns live state without cloning');
  assert(store.getState() !== store.peekState(), 'getState still returns a clone');
  var collinsella = state.professionalCatalog.microbiotaTaxa.find(function (t) { return t.key === 'Collinsella'; });
  var parentKeyBefore = collinsella && collinsella.parentKey;
  store.saveTaxonEdu('Collinsella', { edu: { sceneCopy: '药草（已修订）' } });
  var collinsellaAfter = store.getState().professionalCatalog.microbiotaTaxa.find(function (t) { return t.key === 'Collinsella'; });
  assertEqual(collinsellaAfter.parentKey, parentKeyBefore, 'saveTaxonEdu merges without changing parentKey');
  assertEqual(collinsellaAfter.edu.sceneCopy, '药草（已修订）', 'saveTaxonEdu merges edu.sceneCopy');
  store.saveTaxonEdu('Collinsella', { value: '字典短说明已修订' });
  var collinsellaValue = store.getState().professionalCatalog.microbiotaTaxa.find(function (t) { return t.key === 'Collinsella'; });
  assertEqual(collinsellaValue.value, '字典短说明已修订', 'saveTaxonEdu can update dictionary short value');
  assertEqual(collinsellaValue.edu.sceneCopy, '药草（已修订）', 'saveTaxonEdu value patch keeps edu');

  store.saveMicrobiotaPresentation({ high: '茂盛异常（已修订）' });
  assertEqual(
    store.getState().professionalCatalog.microbiotaPresentation.high,
    '茂盛异常（已修订）',
    'saveMicrobiotaPresentation persists high status word'
  );
  assertEqual(store.resolveMicrobiotaSceneStatusWord('status-high'), '茂盛异常（已修订）', 'resolveMicrobiotaSceneStatusWord maps status-high');
  assertEqual(store.resolveMicrobiotaSceneStatusWord('status-low'), '略显稀疏', 'resolveMicrobiotaSceneStatusWord maps status-low');
  assertEqual(store.resolveMicrobiotaSceneStatusWord('status-normal'), '生机适宜', 'resolveMicrobiotaSceneStatusWord maps status-normal');
  assertEqual(store.resolveMicrobiotaSceneStatusWord('status-no-range'), '', 'resolveMicrobiotaSceneStatusWord skips status-no-range');
  assertEqual(store.resolveMicrobiotaSceneStatusWord('status-not-detected'), '', 'resolveMicrobiotaSceneStatusWord skips status-not-detected');
  assertEqual(store.resolveMicrobiotaSceneStatusWord('status-invalid'), '', 'resolveMicrobiotaSceneStatusWord skips status-invalid');
  store.saveMicrobiotaPresentation({ high: '略显繁茂' });

  var liveState = store.peekState();
  delete liveState.professionalCatalog.microbiotaPresentation;
  liveState.meta.version = 8;
  liveState.professionalCatalog.meta.version = 8;
  store.getState();
  var migratedPres = store.getState().professionalCatalog.microbiotaPresentation;
  assert(migratedPres && migratedPres.high === '略显繁茂', 'migrateMicrobiotaPresentationV9 backfills defaults');

  assert(Array.isArray(state.professionalCatalog.referenceRangeSchemes) &&
    state.professionalCatalog.referenceRangeSchemes.length >= 2, 'seed referenceRangeSchemes');

  var manualRange = store.resolveEffectiveRangeForIndicator({
    key: '放线菌门',
    unit: '%',
    manualRange: { min: 1, max: 2, unit: '%' },
    sourceTemplateId: 'ORG-LAB-GUT-001'
  }, 'cat');
  assertEqual(manualRange.source, 'manual', 'resolver prefers manualRange');

  var importedRange = store.resolveEffectiveRangeForIndicator({
    key: '放线菌门',
    unit: '%',
    importedRange: { min: 10, max: 20, unit: '%' },
    sourceTemplateId: 'ORG-LAB-GUT-001'
  }, 'cat');
  assertEqual(importedRange.source, 'imported', 'resolver prefers importedRange over scheme');

  var schemeRange = store.resolveEffectiveRangeForIndicator({
    key: '放线菌门',
    unit: '%',
    sourceTemplateId: 'ORG-LAB-GUT-001'
  }, 'cat');
  assert(schemeRange && schemeRange.source === 'scheme', 'resolver matches active scheme');

  var missingRange = store.resolveEffectiveRangeForIndicator({
    key: '放线菌门',
    unit: '%'
  }, 'cat');
  assertEqual(missingRange, null, 'resolver returns null without sourceTemplateId');

  var wrongSpecies = store.resolveEffectiveRangeForIndicator({
    key: '放线菌门',
    unit: '%',
    sourceTemplateId: 'ORG-LAB-GUT-001'
  }, 'rabbit');
  assertEqual(wrongSpecies, null, 'resolver rejects species not in applicableSpecies');

  var wrongTemplate = store.resolveEffectiveRangeForIndicator({
    key: '放线菌门',
    unit: '%',
    sourceTemplateId: 'UNKNOWN-TEMPLATE'
  }, 'cat');
  assertEqual(wrongTemplate, null, 'resolver rejects template mismatch');

  var wrongUnit = store.resolveEffectiveRangeForIndicator({
    key: '放线菌门',
    unit: 'index',
    sourceTemplateId: 'ORG-LAB-GUT-001'
  }, 'cat');
  assertEqual(wrongUnit, null, 'resolver rejects unit mismatch');
  assert(Array.isArray(state.analysisRuleCatalog) && state.analysisRuleCatalog.length >= 3, 'seed analysisRuleCatalog');
  assert(store.RECOMMEND_TYPES.indexOf('CATEGORY') < 0, 'RECOMMEND_TYPES has no CATEGORY');

  var snap001 = store.getPublishedVersionSnapshot('report-001');
  assert(snap001 && snap001.contentSnapshot && snap001.contentSnapshot.assessment, 'report-001 published snapshot backfilled');
  var snap004 = store.getPublishedVersionSnapshot('report-004');
  assert(snap004 && snap004.contentSnapshot && snap004.contentSnapshot.indicators, 'report-004 published snapshot backfilled');
  var proj001 = store.getUserPublishedReportProjection('user-001', 'report-001');
  assert(proj001 && proj001.contentSnapshot, 'user projection includes contentSnapshot');

  assertEqual(store.getWorkflowStatus('report-004'), 'published', 'published unclaimed report workflow');
  assertEqual(store.getWorkflowStatus('report-002'), 'pending_review', 'pending review workflow');
  assertEqual(store.getWorkflowStatus('report-006'), 'voided', 'voided workflow');
  assert(state.testRecords.some(function (tr) { return tr.id === 'tr-009' && tr.status === 'unassigned'; }), 'seed unassigned import');

  var dup = store.checkDuplicateImport({
    sourceOrgId: store.DEFAULT_SOURCE_ORG_ID,
    externalReportNumber: 'EXT-2025-001'
  });
  assert(dup && dup.duplicate && dup.existingTestRecordId === 'tr-004', 'duplicate import by source org + external number');

  var notDetected = state.indicators.find(function (ind) {
    return ind.testRecordId === 'tr-003' && ind.key === '厚壁菌门';
  });
  assert(notDetected && notDetected.dataStatus === 'NOT_DETECTED' && notDetected.value == null, 'NOT_DETECTED is not zero or missing');

  assert(state.meta.version >= 14, 'meta.version migrated to >= 14');
  assert(state.meta.version >= 15, 'meta.version migrated to >= 15');

  var available = store.resolveRecommendationTarget({
    primaryProductId: 'prod-001',
    relatedProductIds: ['prod-003']
  });
  assertEqual(available.resolvedType, 'PRODUCT', 'manual recommendation primary PRODUCT when available');
  assertEqual(available.availability, 'AVAILABLE', 'normal product availability');
  assertEqual(available.relatedProductIds.join(','), 'prod-003', 'relatedProductIds order preserved');

  var zeroStock = store.resolveRecommendationTarget({
    primaryProductId: 'prod-004',
    relatedProductIds: []
  });
  assertEqual(zeroStock.resolvedType, 'PRODUCT', 'zero stock primary kept as PRODUCT');
  assertEqual(zeroStock.availability, 'ZERO_STOCK', 'zero stock availability');
  assertEqual(zeroStock.resolvedProductId, 'prod-004', 'zero stock keeps primary');

  var delisted = store.resolveRecommendationTarget({
    primaryProductId: 'prod-002',
    relatedProductIds: ['prod-001', 'prod-003']
  });
  assertEqual(delisted.resolvedType, 'PRODUCT', 'delisted primary still PRODUCT not auto-substituted');
  assertEqual(delisted.resolvedProductId, 'prod-002', 'delisted keeps primary');
  assertEqual(delisted.availability, 'UNAVAILABLE', 'delisted availability');
  assertEqual(delisted.relatedProductIds.join(','), 'prod-001,prod-003', 'relatedProductIds order preserved');

  var maxRelated = store.resolveRecommendationTarget({
    primaryProductId: 'prod-001',
    relatedProductIds: ['prod-003', 'prod-001', 'prod-004', 'prod-002']
  });
  assert(maxRelated.relatedProductIds.length <= 3, 'relatedProductIds max 3');
  assert(maxRelated.relatedProductIds.indexOf('prod-001') < 0, 'related excludes primary');

  var snapRec001 = snap001.contentSnapshot.recommendations.find(function (r) { return r.id === 'rec-001'; });
  assert(snapRec001 && snapRec001.resolution && snapRec001.resolution.liveRead, 'publish snapshot notes live product read');
  assert(!snapRec001.resolution.resolvedProductId, 'product config not frozen in publish snapshot');

  store.updateRecommendation({
    recommendationId: 'rec-001',
    relatedProductIds: ['prod-004'],
    actor: 'smoke'
  });
  var updatedRec = store.getState().recommendations.find(function (r) { return r.id === 'rec-001'; });
  assertEqual(updatedRec.relatedProductIds.join(','), 'prod-004', 'updateRecommendation after publish updates live store');
  var snapAfterUpdate = store.getPublishedVersionSnapshot('report-001');
  var frozenRecAfter = snapAfterUpdate.contentSnapshot.recommendations.find(function (r) { return r.id === 'rec-001'; });
  assertEqual(frozenRecAfter.relation.relatedProductIds.join(','), 'prod-003', 'publish snapshot relation unchanged until republish');

  var pickerOnSale = store.searchProductsForPicker(state, { status: 'on_sale' });
  assert(pickerOnSale.items.length >= 2, 'searchProductsForPicker filters on_sale');
  var pickerRecycled = store.searchProductsForPicker(state, { status: 'recycled' });
  assert(pickerRecycled.items.length === 0, 'searchProductsForPicker excludes recycled by default');
  var pickerIncludeMissing = store.searchProductsForPicker(state, {
    status: 'recycled',
    includeProductIds: ['prod-missing']
  });
  assert(pickerIncludeMissing.items.some(function (p) { return p.id === 'prod-missing'; }), 'searchProductsForPicker includes recycled when in relationship');

  var legacyCategory = store.resolveRecommendationTarget({
    targetType: 'CATEGORY',
    categoryId: 'cat-001'
  });
  assert(legacyCategory.resolvedType !== 'CATEGORY', 'legacy CATEGORY input never returns CATEGORY');

  var batch = store.simulateBatchImport({
    files: [
      { scenario: 'success', fileName: 'ok.xlsx', externalReportNumber: 'EXT-SMOKE-001', sampleNumber: 'SAMPLE-SMOKE-001' },
      { scenario: 'duplicate', fileName: 'dup.xlsx', sourceOrgId: store.DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-001' },
      { scenario: 'partial', fileName: 'partial.xlsx', externalReportNumber: 'EXT-SMOKE-002', sampleNumber: 'SAMPLE-SMOKE-002' },
      { scenario: 'failure', fileName: 'fail.xlsx', externalReportNumber: 'EXT-SMOKE-003', sampleNumber: 'SAMPLE-SMOKE-003' }
    ]
  });
  assert(batch.fileResults.length === 4, 'batch import processes 4 files');
  assert(batch.fileResults.some(function (r) { return r.status === 'duplicate'; }), 'batch duplicate result');
  assert(batch.fileResults.some(function (r) { return r.status === 'partial'; }), 'batch partial result');
  assert(batch.fileResults.some(function (r) { return r.status === 'failed'; }), 'batch failure result');
  var failedRow = batch.fileResults.find(function (r) { return r.status === 'failed'; });
  assertEqual(failedRow.testRecordId, null, 'batch failure does not create testRecord');

  var regPet = state.pets.find(function (p) { return p.userId === 'user-001' && p.claimStatus === 'bound'; });
  assert(regPet, 'seed has bound pet for registration');
  var registered = store.registerTest({
    petId: regPet.id,
    sampleNumber: 'SAMPLE-REG-SMOKE-001',
    testDate: '2025-08-28',
    storeId: regPet.storeId || 'store-001'
  });
  assertEqual(registered.status, 'pending_result', 'registerTest creates pending_result only');
  assert(!store.getState().reports.some(function (r) { return r.testRecordId === registered.id; }), 'registerTest does not create report');

  var beforeDirectedCount = store.getState().testRecords.length;
  var directed = store.simulateBatchImport({
    testRecordId: registered.id,
    files: [{ scenario: 'success', fileName: 'directed-ok.xlsx', externalReportNumber: 'EXT-DIR-001', sampleNumber: 'SAMPLE-REG-SMOKE-001' }]
  });
  var afterDirected = store.getState();
  assertEqual(afterDirected.testRecords.length, beforeDirectedCount, 'directed import reuses testRecord');
  assert(afterDirected.reports.filter(function (r) { return r.testRecordId === registered.id; }).length === 1, 'directed import creates single report');
  assert(directed.fileResults[0].status === 'success', 'directed import success');

  var directedFailBefore = store.getState().testRecords.length;
  var regForFail = store.registerTest({
    petId: regPet.id,
    sampleNumber: 'SAMPLE-REG-FAIL-001',
    testDate: '2025-08-28',
    storeId: regPet.storeId || 'store-001'
  });
  store.simulateBatchImport({
    testRecordId: regForFail.id,
    files: [{ scenario: 'failure', fileName: 'directed-fail.xlsx', errorCode: 'MISSING_COLUMN' }]
  });
  var regAfterFail = store.getState().testRecords.find(function (tr) { return tr.id === regForFail.id; });
  assertEqual(regAfterFail.status, 'pending_result', 'directed failure keeps pending_result');
  assertEqual(store.getState().testRecords.length, directedFailBefore + 1, 'directed failure does not add extra testRecord');

  var imported = store.simulateExcelImportSuccess({
    externalReportNumber: 'EXT-SMOKE-LIFE-001',
    sampleNumber: 'SAMPLE-SMOKE-LIFE-001',
    petId: 'pet-001',
    userId: 'user-001',
    sourceTemplateId: 'ORG-LAB-GUT-001',
    indicators: [{
      key: '放线菌门',
      value: 10,
      unit: '%',
      dataStatus: 'PRESENT',
      importedRange: { min: 8, max: 12, unit: '%' },
      sourceTemplateId: 'ORG-LAB-GUT-001'
    }]
  });
  var importedInd = store.getState().indicators.find(function (ind) {
    return ind.testRecordId === imported.testRecordId && ind.key === '放线菌门';
  });
  assert(importedInd && importedInd.importedRange && importedInd.importedRange.min === 8, 'simulateExcelImportSuccess keeps importedRange');
  assertEqual(importedInd.sourceTemplateId, 'ORG-LAB-GUT-001', 'simulateExcelImportSuccess keeps sourceTemplateId');
  var lifeReport = store.generateReport({ testRecordId: imported.testRecordId, healthLevel: 'B', healthScore: 80 });
  store.submitReport(lifeReport.id);
  store.approveReport(lifeReport.id);
  store.saveReportAssessment(lifeReport.id, {
    healthLevel: 'B',
    healthScore: 80,
    percentile: 55,
    summary: 'smoke assessment',
    platformDimensions: { emotion: 60, immunity: 62 }
  });
  store.publishReport(lifeReport.id, { actor: 'smoke' });
  assertEqual(store.getWorkflowStatus(lifeReport.id), 'published', 'lifecycle publish workflow');
  assertEqual(store.getUserReportStatus(lifeReport.id, 'user-001'), 'published', 'user sees published report');
  var pubSnap = store.getPublishedVersionSnapshot(lifeReport.id);
  assert(pubSnap && pubSnap.contentSnapshot && pubSnap.contentSnapshot.assessment.percentile === 55, 'publish atomically freezes contentSnapshot');

  var newUser = store.createPlatformUser({ name: 'Smoke User', phone: '13900001111' });
  assert(newUser && newUser.id, 'createPlatformUser');
  var opsPet = store.createOpsPet({ name: 'Smoke Pet', species: 'dog' });
  assert(opsPet && opsPet.id, 'createOpsPet prebuild');
  store.updateProfessionalCatalog(function (catalog) {
    catalog.meta = catalog.meta || {};
    catalog.meta.smokeTouched = true;
  });
  assert(store.getState().professionalCatalog.meta.smokeTouched, 'updateProfessionalCatalog');
  store.updateAnalysisState(function (s) {
    s.analysisRuns = s.analysisRuns || [];
    s.analysisRuns.push({
      id: 'run-smoke-001',
      reportId: lifeReport.id,
      createdAt: new Date().toISOString(),
      rawHits: [],
      combinedResult: {},
      adjustments: { excludedHits: [], manualFindings: [], finalContent: { professional: 'smoke' } }
    });
    s.reportAnalysisAdjustments = s.reportAnalysisAdjustments || {};
    s.reportAnalysisAdjustments[lifeReport.id] = { latestRunId: 'run-smoke-001' };
  });
  assert(store.getState().analysisRuns.some(function (r) { return r.id === 'run-smoke-001'; }), 'updateAnalysisState');

  var draft = store.createCorrectionDraftExtended(lifeReport.id, { summary: '更正草稿' });
  assert(draft.correctionDraftActive === true, 'correction draft active');
  var publishedBefore = store.getPublishedVersionSnapshot(lifeReport.id);
  var projDuring = store.getUserPublishedReportProjection('user-001', lifeReport.id);
  assert(publishedBefore && publishedBefore.version === draft.publishedVersion, 'user still sees old published version during correction');
  assert(projDuring && projDuring.contentSnapshot.assessment.percentile === 55, 'correction draft keeps old snapshot projection');
  store.reviewCorrectionDraft(lifeReport.id, 'approved', null, 'smoke');
  store.publishCorrection(lifeReport.id, { actor: 'smoke' });
  var publishedAfter = store.getPublishedVersionSnapshot(lifeReport.id);
  assert(publishedAfter.version > publishedBefore.version, 'published version replaced after correction publish');
  assert(publishedAfter.contentSnapshot, 'correction publish atomically freezes new snapshot');

  var voidTarget = store.generateReport({
    testRecordId: store.simulateExcelImportSuccess({
      externalReportNumber: 'EXT-SMOKE-VOID-001',
      sampleNumber: 'SAMPLE-SMOKE-VOID-001',
      petId: 'pet-002',
      userId: 'user-001'
    }).testRecordId
  });
  store.submitReport(voidTarget.id);
  store.publishReport(voidTarget.id);
  store.voidReport(voidTarget.id, 'smoke void');
  assertEqual(store.getUserReportStatus(voidTarget.id, 'user-001'), null, 'voided report hidden from user');
  assert(store.getState().reports.some(function (r) { return r.id === voidTarget.id && r.status === 'voided'; }), 'voided report trace data retained');

  var correction = store.correctOwnership({
    reportId: 'report-003',
    userId: 'user-002',
    petId: 'pet-003',
    reason: 'smoke ownership correction'
  });
  assert(correction && correction.reportId === 'report-003', 'ownership correction recorded');
  assertEqual(store.getState().reports.find(function (r) { return r.id === 'report-003'; }).userId, 'user-002', 'ownership correction updates report userId');

  assertEqual(store.getUserReportStatus('report-002', 'user-001'), null, 'pending review report hidden from user');
  assertEqual(store.getUserReportStatus('report-004', 'user-001'), null, 'unlinked pet report hidden before association');

  var claim = store.bindClaimCode({ code: 'CLAIM-PUBLISHED-2025', userId: 'user-001' });
  assert(claim.petId === 'pet-004', 'claim binds ops prebuilt pet only');
  assertEqual(store.getUserReportStatus('report-004', 'user-001'), 'published', 'claimed published report visible');

  var visible = store.getUserVisibleReports('user-001');
  assert(visible.some(function (item) { return item.report.id === 'report-004'; }), 'user visible reports includes claimed published report');
  assert(!visible.some(function (item) { return item.report.id === 'report-006'; }), 'voided report excluded from user visible reports');

  var petPublished = store.getPetPublishedReports('pet-001');
  assert(petPublished.length >= 1, 'getPetPublishedReports returns published reports for pet');

  var archivedPet = store.createOpsPet({ name: 'Smoke Archive Pet', species: 'dog', breed: '测试犬' });
  var archivedTr = store.simulateExcelImportSuccess({
    externalReportNumber: 'EXT-SMOKE-ARCHIVE-001',
    sampleNumber: 'SAMPLE-SMOKE-ARCHIVE-001'
  });
  store.assignReportOwnership({ testRecordId: archivedTr.testRecordId, petId: archivedPet.id });
  var archivedReport = store.generateReport({ testRecordId: archivedTr.testRecordId });
  store.submitReport(archivedReport.id);
  store.publishReport(archivedReport.id);
  assertEqual(store.getUserReportStatus(archivedReport.id, 'user-001'), null, 'published report hidden when pet has no user');
  store.updateOpsPet(archivedPet.id, { userId: 'user-001', reason: 'smoke bind user', actor: 'smoke' });
  assertEqual(store.getUserReportStatus(archivedReport.id, 'user-001'), 'published', 'visibility follows pet user association');

  assert(store.normalizeDataStatus('VALID') === 'PRESENT', 'VALID migrates to PRESENT');

  store.reset();
  var v10Baseline = store.getState();
  assert(v10Baseline.meta.version >= 10, 'meta.version migrated to >= 10');
  assert(JSON.stringify(v10Baseline).indexOf('[演示 Mock]') < 0, 'state JSON has no [演示 Mock] prefix');
  assert(!v10Baseline.meta.disclaimer || !/Mock|演示/.test(v10Baseline.meta.disclaimer), 'meta.disclaimer clean after reset');

  var liveV10 = store.peekState();
  liveV10.meta.version = 9;
  liveV10.meta.disclaimer = '演示环境免责声明';
  if (liveV10.users && liveV10.users.length) {
    liveV10.users[0].name = '[演示 Mock] 嵌套旧前缀用户';
  }
  if (liveV10.reports && liveV10.reports.length && liveV10.reports[0].versions && liveV10.reports[0].versions.length) {
    liveV10.reports[0].versions[0].summary = '[演示 Mock] 嵌套报告摘要';
  }
  var schemeTarget = liveV10.professionalCatalog &&
    liveV10.professionalCatalog.referenceRangeSchemes &&
    liveV10.professionalCatalog.referenceRangeSchemes[0];
  var schemeTargetId = schemeTarget && schemeTarget.id;
  if (schemeTarget) {
    schemeTarget.evidenceType = 'demo';
    schemeTarget.evidenceRef = '演示待专业确认';
    schemeTarget.name = '参考范围（演示）';
  }
  store.getState();
  var v10Migrated = store.getState();
  assert(v10Migrated.meta.version >= 10, 'downgrade to v9 triggers v10 migration');
  assertEqual(v10Migrated.meta.disclaimer, '', 'v10 migration clears demo disclaimer');
  if (v10Migrated.users && v10Migrated.users.length) {
    assert(v10Migrated.users[0].name.indexOf('[演示 Mock]') < 0, 'v10 migration strips nested demo prefix from user name');
    assert(v10Migrated.users[0].name.indexOf('嵌套旧前缀用户') >= 0, 'v10 migration keeps user name body');
  }
  if (v10Migrated.reports && v10Migrated.reports.length && v10Migrated.reports[0].versions && v10Migrated.reports[0].versions.length) {
    assert(v10Migrated.reports[0].versions[0].summary.indexOf('[演示 Mock]') < 0, 'v10 migration strips nested demo prefix from report summary');
  }
  if (schemeTargetId) {
    var migratedScheme = v10Migrated.professionalCatalog.referenceRangeSchemes.find(function (s) {
      return s.id === schemeTargetId;
    });
    assert(migratedScheme, 'v10 migration keeps reference range scheme');
    assertEqual(migratedScheme.evidenceType, 'internal', 'v10 migration maps demo evidenceType to internal');
    assertEqual(migratedScheme.evidenceRef, '检测机构内部参考范围', 'v10 migration normalizes demo evidenceRef');
    assert(migratedScheme.name.indexOf('演示') < 0, 'v10 migration strips demo marker from scheme name');
  }
  store.reset();

  var resetState = store.reset();
  assert(resetState.meta.resetAt, 'reset preserves resetAt');
  assert(resetState.reports.length >= 6, 'reset restores seed reports');

  console.log('\nSmoke summary: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

main();
