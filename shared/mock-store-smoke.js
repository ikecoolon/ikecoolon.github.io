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

  var available = store.resolveRecommendationTarget({
    targetType: 'PRODUCT',
    productId: 'prod-001',
    healthTagIds: ['htag-001']
  });
  assertEqual(available.resolvedType, 'PRODUCT', 'normal product recommendation');
  assertEqual(available.availability, 'AVAILABLE', 'normal product availability');

  var zeroStock = store.resolveRecommendationTarget({
    targetType: 'PRODUCT',
    productId: 'prod-004',
    healthTagIds: ['htag-001']
  });
  assertEqual(zeroStock.availability, 'ZERO_STOCK', 'zero stock availability');
  assert(zeroStock.candidateProductIds.length > 0, 'zero stock yields tag candidates');

  var delisted = store.resolveRecommendationTarget({
    targetType: 'PRODUCT',
    productId: 'prod-002',
    healthTagIds: ['htag-001']
  });
  assert(delisted.resolvedType === 'TAG_CANDIDATE' || delisted.candidateProductIds.length > 0, 'delisted product falls back to tag candidates');

  var noCandidates = store.resolveRecommendationTarget({
    targetType: 'PRODUCT',
    productId: 'prod-004',
    healthTagIds: ['htag-003']
  });
  assertEqual(noCandidates.availability, 'NO_CANDIDATES', 'no tag candidates');
  assertEqual(noCandidates.resolvedType, 'NONE', 'no candidates resolves to NONE not CATEGORY');

  var legacyCategory = store.resolveRecommendationTarget({
    targetType: 'CATEGORY',
    categoryId: 'cat-001',
    healthTagIds: ['htag-001']
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

  var imported = store.simulateExcelImportSuccess({
    externalReportNumber: 'EXT-SMOKE-LIFE-001',
    sampleNumber: 'SAMPLE-SMOKE-LIFE-001',
    petId: 'pet-001',
    userId: 'user-001',
    indicators: [{ key: '放线菌门', value: 10, unit: '%', dataStatus: 'PRESENT' }]
  });
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

  var claim = store.bindClaimCode({ code: 'CLAIM-PUBLISHED-2025', userId: 'user-001' });
  assert(claim.petId === 'pet-004', 'claim binds ops prebuilt pet only');
  assertEqual(store.getUserReportStatus('report-004', 'user-001'), 'published', 'claimed published report visible');

  var visible = store.getUserVisibleReports('user-001');
  assert(visible.some(function (item) { return item.report.id === 'report-004'; }), 'user visible reports includes claimed published report');
  assert(!visible.some(function (item) { return item.report.id === 'report-006'; }), 'voided report excluded from user visible reports');

  assert(store.normalizeDataStatus('VALID') === 'PRESENT', 'VALID migrates to PRESENT');

  var resetState = store.reset();
  assert(resetState.meta.resetAt, 'reset preserves resetAt');
  assert(resetState.reports.length >= 6, 'reset restores seed reports');

  console.log('\nSmoke summary: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

main();
