#!/usr/bin/env node
'use strict';

var store = require('./mock-store.js');

global.window = global;
global.location = { hash: '', href: '' };
global.document = {
  getElementById: function () { return null; },
  body: {
    appendChild: function () {},
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  },
  createElement: function () {
    return {
      className: '',
      classList: { add: function () {}, toggle: function () {} },
      setAttribute: function () {},
      getAttribute: function () { return null; },
      querySelector: function () { return { onclick: null }; },
      querySelectorAll: function () { return []; },
      appendChild: function () {},
      remove: function () {},
      closest: function () { return null; },
      focus: function () {},
      innerHTML: '',
      textContent: '',
      tagName: 'DIV',
      style: {}
    };
  }
};
global.window.PetReportMockStore = store;
require('../admin/js/admin-common.js');
var C = global.PetAdminCommon;

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

function findReport(state, id) {
  return state.reports.find(function (r) { return r.id === id; });
}

function blockerIds(checks) {
  return (checks.blockers || []).map(function (b) { return b.id; });
}

function warningIds(checks) {
  return (checks.warnings || []).map(function (w) { return w.id; });
}

function testSeed() {
  store.reset();
  var state = store.getState();

  assert(!state.findings, 'no findings collection');
  assert(!state.recommendations, 'no recommendations collection');
  assert(!state.healthTags, 'no healthTags collection');
  assert(!state.healthTagProducts, 'no healthTagProducts collection');
  assert(!state.claimCodes, 'no claimCodes collection');
  assert(!state.reportAnalysisAdjustments, 'no reportAnalysisAdjustments collection');
  assertEqual(store.STORAGE_KEY, 'pet-report-mock-store-v4', 'storage key v4');
  assertEqual(store.REPORT_STATUSES.join(','), 'unassigned,incomplete,pending_review,published,voided', 'five report statuses remain in model');
  assertEqual(store.OWNERSHIP_STATUSES.join(','), 'unassigned,bound', 'ownership two values');
  assert(store.WORKFLOW_STATUSES === store.REPORT_STATUSES, 'WORKFLOW_STATUSES aliases REPORT_STATUSES');
  assertEqual(store.SUBMISSION_TYPES.join(','), 'in_store,customer_brought', 'submission types');

  var r1 = findReport(state, 'report-001');
  var r2 = findReport(state, 'report-002');
  var r3 = findReport(state, 'report-003');
  var r4 = findReport(state, 'report-004');
  var r5 = findReport(state, 'report-005');
  var r6 = findReport(state, 'report-006');

  assertEqual(r1.status, 'published', 'report-001 published');
  assertEqual(r1.publishedVersion, 2, 'report-001 publishedVersion=2');
  assertEqual(r1.versions[0].status, 'superseded', 'report-001 v1 superseded');
  assertEqual(r1.versions[1].status, 'published', 'report-001 v2 published');
  assertEqual(r1.petId, 'pet-001', 'report-001 小花');
  assertEqual(r1.userId, 'user-001', 'report-001 user-001');

  var actino = state.indicators.filter(function (i) {
    return i.reportId === 'report-001' && i.key === 'Actinobacteria';
  });
  var v1 = actino.find(function (i) { return i.version === 1; });
  var v2 = actino.find(function (i) { return i.version === 2 && i.isCurrent; });
  assert(v1 && v1.sourceValue === 12.3 && v1.isCurrent === false, 'report-001 Actinobacteria v1 12.3 archived');
  assert(v2 && v2.effectiveValue === 18.5 && v2.sourceValue === 12.3 && v2.modifiedReason, 'report-001 Actinobacteria v2 18.5 with reason');
  var snapActino = r1.versions[0].contentSnapshot.results.find(function (x) { return x.key === 'Actinobacteria'; });
  assertEqual(snapActino.effectiveValue, 12.3, 'report-001 v1 snapshot freezes 12.3');
  assert(r1.versions[0].contentSnapshot.phylumUnits && r1.versions[0].contentSnapshot.phylumUnits.length, 'report-001 v1 snapshot has phylumUnits');

  assertEqual(r2.status, 'pending_review', 'report-002 pending_review');
  var prot = store.getPhylumUnits('report-002').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assert(prot && prot.hits.length === 3, 'report-002 Proteobacteria has 3 hits');
  var primaries = prot.hits.filter(function (h) { return h.combineStatus === 'primary'; });
  var superseded = prot.hits.filter(function (h) { return h.combineStatus === 'superseded_by_conflict'; });
  assertEqual(primaries.length, 1, 'report-002 Proteobacteria 1 primary');
  assertEqual(superseded.length, 2, 'report-002 Proteobacteria 2 superseded_by_conflict');
  var fuso = store.getEffectiveResults('report-002').find(function (x) { return x.key === 'Fusobacterium'; });
  assertEqual(fuso.dataStatus, 'NOT_DETECTED', 'report-002 Fusobacterium 未检出');

  assertEqual(r3.status, 'incomplete', 'report-003 incomplete');
  assert(!!r3.rejectReason, 'report-003 has rejectReason');
  assert((r3.todoFlags || []).indexOf('missing_unresolved') >= 0, 'report-003 missing_unresolved');
  var actino3 = store.getEffectiveResults('report-003').find(function (x) { return x.key === 'Actinobacteria'; });
  assertEqual(actino3.dataStatus, 'MISSING_COLUMN', 'report-003 Actinobacteria MISSING_COLUMN');
  assert(store.getPhylumUnits('report-003').every(function (u) { return u.confirmStatus !== 'confirmed'; }), 'report-003 units unconfirmed');

  assertEqual(r4.status, 'published', 'report-004 published');
  assertEqual(r4.correctionDraftActive, true, 'report-004 correctionDraftActive');
  assertEqual(store.getCorrectionDraftStage('report-004'), 'incomplete', 'report-004 draft stage incomplete');
  assert(!r4.userId, 'report-004 无用户');
  assert((r4.todoFlags || []).indexOf('pending_reanalysis') >= 0, 'report-004 pending_reanalysis');
  assert((r4.todoFlags || []).indexOf('user_unlinked') >= 0, 'report-004 user_unlinked');
  assertEqual(store.hasAnyEffectiveRange('report-004'), false, 'report-004 无任何有效范围');
  var units4 = store.getPhylumUnits('report-004');
  var prot4 = units4.find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assertEqual(prot4.confirmStatus, 'invalidated', 'report-004 Proteobacteria invalidated');
  var kleb = store.getEffectiveResults('report-004').find(function (x) { return x.key === 'Klebsiella'; });
  assertEqual(kleb.sourceValue, 4.59, 'report-004 Klebsiella source 4.59');
  assert(Math.abs(Number(kleb.effectiveValue) - 6.10) < 1e-6, 'report-004 Klebsiella effective 6.10');
  var tr4 = state.testRecords.find(function (t) { return t.id === r4.testRecordId; });
  assertEqual(tr4.sourceOrgId, 'ORG-LAB-GUT-002', 'report-004 机构 ORG-LAB-GUT-002');
  var batchHarley = state.importBatches.find(function (b) { return b.id === tr4.importBatchId; });
  assertEqual(batchHarley.fileName, 'harley_final_microbiome_report.xlsx', 'report-004 harley file');

  assertEqual(r5.status, 'voided', 'report-005 voided');
  assertEqual(r5.petId, 'pet-002', 'report-005 阿黄');

  assertEqual(r6.status, 'incomplete', 'report-006 incomplete (oscar 已挂送检+宠物)');
  assertEqual(r6.petId, 'pet-005', 'report-006 豆豆');
  assertEqual(r6.userId, 'user-002', 'report-006 李先生');
  assert(!r6.latestAnalysisRunId, 'report-006 未运行分析');
  var units6 = store.getPhylumUnits('report-006');
  assert(units6.length >= 5, 'report-006 空壳菌门单元已懒创建');
  assert(units6.every(function (u) { return (u.hits || []).length === 0; }), 'report-006 单元 hits 为空');
  var tr6 = state.testRecords.find(function (t) { return t.id === 'tr-009'; });
  assertEqual(tr6.sampleNumber, 'SAMPLE-OSCAR-009', 'report-006 对应 tr-009');
  assertEqual(tr6.petId, 'pet-005', 'tr-009 已关联宠物');
  assertEqual(tr6.userId, 'user-002', 'tr-009 已关联用户');
  assertEqual(tr6.submissionType, 'customer_brought', 'oscar 为客户自带报告');
  var batchOscar = state.importBatches.find(function (b) { return b.id === tr6.importBatchId; });
  assertEqual(batchOscar.fileName, 'oscar_final_microbiome_report.xlsx', 'report-006 oscar file');
  assertEqual(tr6.claimStatus, 'bound', 'tr-009 claimStatus bound');
  assert(state.reports.every(function (r) { return r.status !== 'unassigned'; }), 'seed 无待归属报告');
  assertEqual(state.pets.filter(function (p) { return p.userId === 'user-002'; }).length, 2, 'user-002 两只宠物（咪咪+豆豆）');

  var r7 = findReport(state, 'report-007');
  assertEqual(r7.status, 'published', 'report-007 published');
  assertEqual(r7.userId, 'user-004', 'report-007 周女士');
  assertEqual(r7.petId, 'pet-006', 'report-007 豆包');
  assertEqual(state.pets.filter(function (p) { return p.userId === 'user-003'; }).length, 0, 'user-003 无宠物');
  assertEqual(state.pets.filter(function (p) { return p.userId === 'user-004'; }).length, 1, 'user-004 一只宠物');
  var vis002 = store.getUserVisibleReports('user-002');
  assert(vis002.every(function (item) { return item.userStatus !== 'published'; }), 'user-002 无已发布报告');

  try {
    store.simulateBatchImport({ files: [{ scenario: 'success', fileName: 'orphan.xlsx' }] });
    assert(false, '无送检记录的批量导入应被拒绝');
  } catch (err) {
    assert(/送检记录/.test(err.message), '无预登记批量导入抛错');
  }

  try {
    store.registerTest({ petId: 'pet-001', sampleNumber: 'S-1', testDate: '2025-09-01', storeId: 'store-001' });
    assert(false, '缺送检类型应被拒绝');
  } catch (err) {
    assert(/送检类型/.test(err.message), '登记送检必填送检类型');
  }
  var registered = store.registerTest({
    petId: 'pet-001',
    sampleNumber: 'S-BROUGHT-1',
    testDate: '2025-09-01',
    storeId: 'store-001',
    submissionType: 'customer_brought'
  });
  assertEqual(registered.submissionType, 'customer_brought', '可登记客户自带报告');
  store.setReportStatus('report-006', 'unassigned');
  assertEqual(store.getReport('report-006').status, 'incomplete', '不得把报告写入待归属');

  var bacteroidetes = state.professionalCatalog.microbiotaTaxa.find(function (t) { return t.key === 'Bacteroidetes'; });
  assert(bacteroidetes && bacteroidetes.edu && bacteroidetes.edu.hint, 'edu.hint 存在');
  assert(bacteroidetes.edu.lowHint === undefined, 'edu 无 lowHint');
  assert(bacteroidetes.edu.normalHint === undefined, 'edu 无 normalHint');
  assert(bacteroidetes.edu.highHint === undefined, 'edu 无 highHint');
  var emptyEdu = store.emptyTaxonEdu();
  assert(emptyEdu.hint === '' && emptyEdu.lowHint === undefined, 'emptyTaxonEdu 仅 hint');
  var migrated = store.normalizeTaxonEdu({ lowHint: '偏低', normalHint: '正常', highHint: '偏高' });
  assertEqual(migrated.hint, '正常', 'normalizeTaxonEdu 合并 hint = normalHint || lowHint || highHint');
  assert(migrated.lowHint === undefined, 'normalizeTaxonEdu 不输出 lowHint');

  assert(store.peekState() === store.peekState(), 'peekState returns live state');
  assert(store.getState() !== store.peekState(), 'getState returns clone');
}

function testStateMachine() {
  store.reset();
  var r2 = store.getReport('report-002');
  var trBefore = store.peekState().testRecords.find(function (t) { return t.id === r2.testRecordId; });
  var trStatusBefore = trBefore.status;
  var changedAtBefore = r2.statusChangedAt;

  store.withdrawReport('report-002', { actor: 'smoke' });
  var afterWithdraw = store.getReport('report-002');
  var trAfterWithdraw = store.peekState().testRecords.find(function (t) { return t.id === r2.testRecordId; });
  assertEqual(afterWithdraw.status, 'incomplete', 'withdraw → incomplete');
  assertEqual(trAfterWithdraw.status, trStatusBefore, 'withdraw 不改 testRecord.status');
  assert(afterWithdraw.statusChangedAt !== changedAtBefore, 'withdraw 写入 statusChangedAt');
  var frozenAt = afterWithdraw.statusChangedAt;
  store.setReportStatus('report-002', 'incomplete');
  assertEqual(store.getReport('report-002').statusChangedAt, frozenAt, 'status 未变则不写 statusChangedAt');

  var sameAt = store.getReport('report-002').statusChangedAt;
  store.submitReport('report-002', { actor: 'smoke' });
  var afterSubmit = store.getReport('report-002');
  assertEqual(afterSubmit.status, 'pending_review', 'submit → pending_review');
  assert(afterSubmit.statusChangedAt !== sameAt, 'submit 写入 statusChangedAt');
  assert(!afterSubmit.rejectReason, 'submit 清空 rejectReason');

  store.rejectReport('report-002', '需要补全建议', { actor: 'smoke' });
  var afterReject = store.getReport('report-002');
  assertEqual(afterReject.status, 'incomplete', 'reject → incomplete');
  assertEqual(afterReject.rejectReason, '需要补全建议', 'reject 写入 rejectReason');

  store.submitReport('report-002', { actor: 'smoke' });
  store.publishReport('report-002', { actor: 'smoke' });
  var afterPublish = store.getReport('report-002');
  assertEqual(afterPublish.status, 'published', 'publish → published');
  assertEqual(afterPublish.publishedVersion, 1, 'publish 冻结 publishedVersion');
  assert(afterPublish.versions[0].contentSnapshot, 'publish 写入 contentSnapshot');
  assert(afterPublish.versions[0].contentSnapshot.phylumUnits, 'snapshot.phylumUnits');
  assert(afterPublish.versions[0].contentSnapshot.results, 'snapshot.results');

  store.createCorrectionDraft('report-002', { correctionNote: 'smoke 更正' });
  var afterDraft = store.getReport('report-002');
  assertEqual(afterDraft.status, 'published', '更正草稿时主状态仍为 published');
  assertEqual(afterDraft.correctionDraftActive, true, 'correctionDraftActive');
  assertEqual(store.getCorrectionDraftStage('report-002'), 'incomplete', '更正草稿 stage=incomplete');

  store.voidReport('report-002', 'smoke 作废');
  assertEqual(store.getReport('report-002').status, 'voided', 'void → voided');
}

function testUnitsAndEngine() {
  store.reset();
  var prot = store.getPhylumUnits('report-002').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assertEqual(prot.confirmStatus, 'confirmed', 'seed 变形菌门已确认');

  store.savePhylumUnitDraft('report-002', 'Proteobacteria', { analysis: '手工改写分析', advice: prot.adviceDraft });
  var afterDraft = store.getPhylumUnits('report-002').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assertEqual(afterDraft.confirmStatus, 'unconfirmed', '改草稿回到 unconfirmed');
  assertEqual(afterDraft.draftSource, 'manual', '草稿来源 manual');

  store.confirmPhylumUnit('report-002', 'Proteobacteria', { actor: 'smoke' });
  assertEqual(store.getPhylumUnits('report-002').find(function (u) { return u.phylumKey === 'Proteobacteria'; }).confirmStatus, 'confirmed', '可再次确认');

  var kleb = store.getEffectiveResults('report-002').find(function (r) { return r.key === 'Klebsiella'; });
  store.modifyResultValue({
    reportId: 'report-002',
    resultId: kleb.id,
    value: 8.8,
    reason: 'smoke 修改 Klebsiella'
  });
  var afterMod = store.getReport('report-002');
  assert((afterMod.todoFlags || []).indexOf('pending_reanalysis') >= 0, '改结果 → pending_reanalysis');
  var protAfter = store.getPhylumUnits('report-002').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assertEqual(protAfter.confirmStatus, 'invalidated', '改结果 → invalidated');

  store.runReportAnalysis('report-002', { actor: 'smoke' });
  store.confirmPhylumUnit('report-002', 'Proteobacteria', { actor: 'smoke' });
  var protRe = store.getPhylumUnits('report-002').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assertEqual(protRe.confirmStatus, 'confirmed', '重跑后可再确认');
  assert((store.getReport('report-002').todoFlags || []).indexOf('pending_reanalysis') < 0, '重跑后 pending_reanalysis 清除');

  var previewRuns = store.peekState().analysisRuns.length;
  var previewUnits = JSON.stringify(store.getPhylumUnits('report-002'));
  var preview = store.previewRuleEvaluation('report-002', { includeDrafts: false });
  assert(preview.units && preview.units.length, 'previewRuleEvaluation 返回菌门单元');
  assertEqual(store.peekState().analysisRuns.length, previewRuns, 'preview 不写入 analysisRuns');
  assert(JSON.stringify(store.getPhylumUnits('report-002')) === previewUnits, 'preview 不写入 phylumUnits');

  store.deactivateAnalysisRule('rule-firmi-normal');
  assert((store.getReport('report-003').todoFlags || []).indexOf('pending_reanalysis') >= 0, '启用规则变化 → report-003 pending_reanalysis');
  assert((store.getReport('report-001').todoFlags || []).indexOf('pending_reanalysis') < 0, '已发布无草稿的报告不打 pending_reanalysis');
}

function testPublicationChecks() {
  store.reset();
  var checks4 = C.buildPublicationChecks(store.getState(), 'report-004');
  var ids4 = blockerIds(checks4);
  assert(ids4.indexOf('unconfirmed_units') >= 0, '发布检查：未确认/失效单元为阻断');
  assert(ids4.indexOf('pending_reanalysis') >= 0, '发布检查：pending_reanalysis 为阻断');
  var msgs = (checks4.blockers || []).map(function (b) { return b.message; }).join('|');
  assert(msgs.indexOf('未确认') >= 0, '阻断文案含未确认单元');
  assert(msgs.indexOf('依据变化') >= 0, '阻断文案含依据变化');
  var w4 = warningIds(checks4);
  assert(w4.indexOf('no_effective_range') >= 0 || (checks4.warnings || []).some(function (w) { return /无有效参考范围/.test(w.message); }), '警告：无有效范围');
  assert((checks4.warnings || []).some(function (w) { return w.id === 'unclaimed_user'; }), '警告：未关联用户');
  assert(!(checks4.blockers || []).some(function (b) { return /三类|findings|healthTag|综合摘要/.test(b.message); }), '发布检查不再引用三类文案/findings/healthTag');

  var checks3 = C.buildPublicationChecks(store.getState(), 'report-003');
  assert(blockerIds(checks3).indexOf('unconfirmed_units') >= 0, 'report-003 未确认单元为阻断');
  assert((checks3.warnings || []).some(function (w) { return w.id === 'missing_unresolved' || /缺失/.test(w.message); }), '警告：缺失未处理');
}

function testSnapshotFreeze() {
  store.reset();
  store.publishReport('report-002', { actor: 'smoke' });
  var published = store.getReport('report-002');
  var snap = published.versions.find(function (v) { return v.version === published.publishedVersion; }).contentSnapshot;
  var snapKleb = snap.results.find(function (r) { return r.key === 'Klebsiella'; });
  var snapVal = snapKleb.effectiveValue;
  assert(snap.phylumUnits && snap.phylumUnits.length, 'publish 后 snapshot.phylumUnits 冻结');
  assert(snap.results && snap.results.length, 'publish 后 snapshot.results 冻结');

  store.createCorrectionDraft('report-002', { correctionNote: '改值不影响快照' });
  var kleb = store.getEffectiveResults('report-002').find(function (r) { return r.key === 'Klebsiella'; });
  store.modifyResultValue({
    reportId: 'report-002',
    resultId: kleb.id,
    value: 9.99,
    reason: '验证快照冻结'
  });
  var after = store.getReport('report-002');
  var frozen = after.versions.find(function (v) { return v.version === 1; }).contentSnapshot;
  var frozenKleb = frozen.results.find(function (r) { return r.key === 'Klebsiella'; });
  assertEqual(frozenKleb.effectiveValue, snapVal, '之后再改有效值不影响已发布快照');
  var live = store.getEffectiveResults('report-002').find(function (r) { return r.key === 'Klebsiella'; });
  assert(Math.abs(Number(live.effectiveValue) - 9.99) < 1e-6, '工作版有效值已更新');
}

function testCatalogAndPicker() {
  store.reset();
  var parentKeyBefore = store.getState().professionalCatalog.microbiotaTaxa.find(function (t) { return t.key === 'Collinsella'; }).parentKey;
  store.saveTaxonEdu('Collinsella', { edu: { sceneCopy: '药草（已修订）', hint: '固定提示' } });
  var after = store.getState().professionalCatalog.microbiotaTaxa.find(function (t) { return t.key === 'Collinsella'; });
  assertEqual(after.parentKey, parentKeyBefore, 'saveTaxonEdu 不改 parentKey');
  assertEqual(after.edu.sceneCopy, '药草（已修订）', 'saveTaxonEdu 合并 sceneCopy');
  assertEqual(after.edu.hint, '固定提示', 'saveTaxonEdu 写入 hint');

  var pickerOnSale = store.searchProductsForPicker(store.getState(), { status: 'on_sale' });
  assert(pickerOnSale.items.length >= 2, 'searchProductsForPicker filters on_sale');
  var pickerRecycled = store.searchProductsForPicker(store.getState(), { status: 'recycled' });
  assertEqual(pickerRecycled.items.length, 0, 'searchProductsForPicker excludes recycled by default');
  var pickerIncludeMissing = store.searchProductsForPicker(store.getState(), {
    includeProductIds: ['prod-missing']
  });
  assert(pickerIncludeMissing.items.some(function (p) { return p.id === 'prod-missing'; }), 'searchProductsForPicker includes recycled when in relationship');

  var avail = store.resolveProductAvailability('prod-002');
  assertEqual(avail.status, 'off_shelf', 'resolveProductAvailability 下架');
  assertEqual(avail.available, false, '下架商品 available=false');

  var taxa = store.listTaxaForRuleTarget('phylum');
  assert(taxa.some(function (t) { return t.key === 'Firmicutes'; }), 'listTaxaForRuleTarget(phylum)');
  var genera = store.listTaxaForRuleTarget('genus');
  assert(genera.some(function (t) { return t.key === 'Klebsiella'; }), 'listTaxaForRuleTarget(genus)');

  var errors = store.validateAnalysisRule({
    name: '测试',
    target: { level: 'phylum', taxonKey: 'Firmicutes' },
    conditionLogic: 'ALL',
    conditions: [{ id: 'c1', type: 'RANGE_STATUS', rangeStatus: 'low' }],
    riskLevel: 'medium',
    output: { analysis: '分析', advice: '建议' }
  });
  assert(Array.isArray(errors) && errors.length === 0, 'validateAnalysisRule 合法规则');
}

function testDeprecatedAndLabels() {
  store.reset();
  assertEqual(C.REPORT_STATUS_LABELS.unassigned, '待归属', 'admin-common 仍保留待归属标签但不作为入口');
  assertEqual(C.REPORT_STATUS_LABELS.incomplete, '待完善', 'admin-common 待完善');
  assertEqual(C.REPORT_STATUS_LABELS.pending_review, '待审核', 'admin-common 待审核');
  assertEqual(C.REPORT_STATUS_LABELS.published, '已发布', 'admin-common 已发布');
  assertEqual(C.REPORT_STATUS_LABELS.voided, '已作废', 'admin-common 已作废');
  assert(!C.REPORT_STATUS_LABELS.draft, '删除 draft 标签');
  assert(!C.saveReviewDraft && !C.getReviewDraft, '删除 sessionStorage 审核草稿 API');
  assert(!C.lookupClaimCode && !C.getPendingClaimCodes && !C.canRecommend, '删除 claim/recommend throw 别名');
  assert(!C.saveAnalysisFinalContent && !C.reviewCorrectionDraft, '删除已移除审核 API');
  assert(!C.rejectReportToIncomplete && !C.createCorrectionDraftExtended, '删除状态机薄别名');

  var threw = false;
  try { store.approveReport('report-001'); } catch (e) { threw = /deprecated/.test(e.message); }
  assert(threw, 'approveReport 已删除并抛友好错误');

  var decorated = store.decorateResult(store.getEffectiveResults('report-001')[0]);
  assert(decorated.isEffective === true || decorated.isEffective === false, 'decorateResult 含 isEffective');
  assert(C.isValidResultIndicator(store.getEffectiveResults('report-001')[0]), 'isValidResultIndicator 基于 isEffective');
  assertEqual(store.getWorkflowStatus('report-001'), 'published', 'getWorkflowStatus → report.status');
}

function testIntakePipeline() {
  store.reset();
  var inStore = store.registerTest({
    petId: 'pet-001',
    sampleNumber: 'S-INSTORE-PIPE',
    testDate: '2025-09-02',
    storeId: 'store-001',
    submissionType: 'in_store'
  });
  var imported = store.simulateExcelImportSuccess({
    testRecordId: inStore.id,
    fileName: 'lab_in_store.xlsx',
    sampleNumber: 'S-INSTORE-PIPE'
  });
  var report = store.peekState().reports.find(function (r) { return r.testRecordId === inStore.id; });
  assert(report, '本店送检行上导入生成报告');
  assertEqual(report.status, 'incomplete', '本店送检导入后进入待完善');
  assertEqual(report.petId, 'pet-001', '导入后仍挂原宠物');
  assertEqual(inStore.submissionType, 'in_store', '本店送检类型保留');
  assertEqual(imported.testRecordId, inStore.id, '导入写入原送检记录');

  store.reset();
  var brought = store.registerTest({
    petId: 'pet-006',
    sampleNumber: 'S-BROUGHT-PIPE',
    testDate: '2025-09-02',
    storeId: 'store-001',
    submissionType: 'customer_brought'
  });
  store.simulateExcelImportSuccess({
    testRecordId: brought.id,
    fileName: 'customer_file.xlsx',
    sampleNumber: 'S-BROUGHT-PIPE'
  });
  var report2 = store.peekState().reports.find(function (r) { return r.testRecordId === brought.id; });
  assertEqual(report2.status, 'incomplete', '客户自带报告导入后进入待完善');
  assertEqual(report2.petId, 'pet-006', '客户自带报告仍挂原宠物');
  assertEqual(store.getReport(report2.id).status !== 'unassigned', true, '导入不进入待归属');
}

function main() {
  testSeed();
  testStateMachine();
  testUnitsAndEngine();
  testPublicationChecks();
  testSnapshotFreeze();
  testCatalogAndPicker();
  testDeprecatedAndLabels();
  testIntakePipeline();

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}

main();
