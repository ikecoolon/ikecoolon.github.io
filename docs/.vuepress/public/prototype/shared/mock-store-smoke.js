#!/usr/bin/env node
'use strict';

var store = require('./mock-store.js');
var Engine = require('./analysis-engine.js');

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
  assertEqual(store.STORAGE_KEY, 'pet-report-mock-store-v6', 'storage key v6');
  assertEqual(store.REPORT_STATUSES.join(','), 'unassigned,incomplete,pending_review,published,voided', 'five report statuses remain in model');
  assertEqual(store.OWNERSHIP_STATUSES.join(','), 'unassigned,bound', 'ownership two values');
  assert(store.WORKFLOW_STATUSES === store.REPORT_STATUSES, 'WORKFLOW_STATUSES aliases REPORT_STATUSES');
  assertEqual(store.SUBMISSION_TYPES.join(','), 'in_store,customer_brought', 'submission types');
  var tr1 = state.testRecords.find(function (t) { return t.id === 'tr-001'; });
  assertEqual(tr1.storeId, 'store-001', 'seed 承接门店 storeId');
  assertEqual(tr1.labStoreId, 'store-001', 'seed 本店送检检测机构默认同门店');
  assert(!!tr1.labName, 'seed 本店送检写入检测机构名称');
  var tr9 = state.testRecords.find(function (t) { return t.id === 'tr-009'; });
  assertEqual(tr9.storeId, 'store-001', 'seed 客户自带报告仍有承接门店');
  assertEqual(tr9.labName, '', 'seed 客户自带报告检测机构可为空');

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
  assertEqual(primaries.length, 3, 'report-002 Proteobacteria 全部命中均采用');
  assertEqual(superseded.length, 0, 'report-002 Proteobacteria 不再按风险淘汰');
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
  var preview = store.previewRuleEvaluation('report-002');
  assert(preview.current && preview.candidate && preview.current.units.length, 'previewRuleEvaluation 返回当前与候选结果');
  assertEqual(preview.readOnly, true, 'preview 标明只读');
  assertEqual(store.peekState().analysisRuns.length, previewRuns, 'preview 不写入 analysisRuns');
  assert(JSON.stringify(store.getPhylumUnits('report-002')) === previewUnits, 'preview 不写入 phylumUnits');
}

function makeEngineRule(spec) {
  return {
    id: spec.id,
    lineageId: spec.lineageId || ('lineage-' + spec.id),
    version: spec.version || 1,
    status: spec.status || 'active',
    name: spec.name || spec.id,
    target: spec.target || { level: 'phylum', taxonKey: 'Firmicutes' },
    conditionLogic: spec.conditionLogic || 'ALL',
    conditions: spec.conditions || [{ id: spec.id + '-condition', type: 'LAB_NOTICE', notice: 'high' }],
    applicableSpecies: spec.applicableSpecies || ['cat'],
    sourceTemplateIds: spec.sourceTemplateIds || [store.DEFAULT_SOURCE_ORG_ID, store.SECOND_SOURCE_ORG_ID],
    riskLevel: spec.riskLevel || 'medium',
    priority: spec.priority == null ? 10 : spec.priority,
    stableOrder: spec.stableOrder == null ? 1 : spec.stableOrder,
    conflictGroup: spec.conflictGroup || null,
    output: spec.output || { analysis: '分析-' + spec.id, advice: '建议-' + spec.id }
  };
}

function engineContext(results, species, sourceTemplateId) {
  return Engine.buildContext({
    results: results,
    species: species || 'cat',
    sourceTemplateId: sourceTemplateId || store.DEFAULT_SOURCE_ORG_ID,
    taxa: [
      { key: 'Firmicutes', level: 'phylum' },
      { key: 'Bacteroidetes', level: 'phylum' },
      { key: 'Proteobacteria', level: 'phylum' },
      { key: 'Actinobacteria', level: 'phylum' },
      { key: 'Fusobacterium', level: 'genus', parentKey: 'Fusobacteria' }
    ]
  });
}

function testRuleLifecycleAndCandidateSet() {
  store.reset();
  var initial = store.getState();
  assert(initial.analysisRuleCatalog.every(function (rule) { return rule.status === 'active' || rule.status === 'inactive'; }), '规则持久状态仅 active / inactive');
  assert(!initial.analysisRuleCatalog.some(function (rule) { return rule.status === 'draft' || rule.status === 'session'; }), 'store 不保留规则 draft / session 状态');
  assert(!store.saveAnalysisRule && !store.activateAnalysisRule && !store.deactivateAnalysisRule && !store.deleteAnalysisRule, '删除旧规则草稿与单版本启停 API');

  var active = initial.analysisRuleCatalog.filter(function (rule) { return rule.status === 'active'; });
  var source = active[0];
  var sessionRevision = JSON.parse(JSON.stringify(source));
  sessionRevision.id = 'session-revision';
  sessionRevision.status = 'session';
  sessionRevision.version = source.version + 1;
  sessionRevision.output.analysis = source.output.analysis + '（会话修改）';
  var replaced = Engine.buildCandidateRuleSet(active, sessionRevision);
  assertEqual(replaced.rules.length, active.length, '编辑会话替换同谱系且保留规则总数');
  assertEqual(replaced.rules.filter(function (rule) { return rule.lineageId === source.lineageId; }).length, 1, '候选集中同谱系至多一版');
  assert(replaced.rules.some(function (rule) { return rule.id === 'session-revision'; }), '候选集中使用会话修订版');
  assert(active.slice(1).every(function (rule) { return replaced.rules.some(function (candidate) { return candidate.lineageId === rule.lineageId; }); }), '其他启用谱系全部保留');
  assertEqual(replaced.replacement.fromRuleId, source.id, '替换关系记录原启用规则');
  assertEqual(replaced.replacement.isNewLineage, false, '修订候选不是新谱系');

  var newSession = makeEngineRule({ id: 'session-new', lineageId: 'lineage-session-new', status: 'session', stableOrder: 999 });
  var added = Engine.buildCandidateRuleSet(active, newSession);
  assertEqual(added.rules.length, active.length + 1, '新规则会话临时加入启用基线');
  assertEqual(added.replacement.isNewLineage, true, '新规则候选标记新谱系');
  var unsavedNew = makeEngineRule({ id: null, lineageId: null, name: '未保存新规则', status: 'session', stableOrder: 1000 });
  unsavedNew.id = null;
  unsavedNew.lineageId = null;
  var unsavedPreview = Engine.buildCandidateRuleSet(active, unsavedNew);
  assertEqual(unsavedPreview.rules.length, active.length + 1, '无持久 ID 的新规则会话仍临时加入');
  assert(/^session-new-/.test(unsavedPreview.replacement.lineageId), '无持久 ID 的新规则使用稳定会话谱系标识');

  var duplicateActive = active.concat([Object.assign({}, source, { id: 'duplicate-active' })]);
  var duplicateThrew = false;
  try { Engine.buildCandidateRuleSet(duplicateActive, null); } catch (error) { duplicateThrew = /多个启用版本/.test(error.message); }
  assert(duplicateThrew, '候选深模块拒绝同谱系多个启用版本');

  var beforeCatalog = JSON.stringify(store.getState().analysisRuleCatalog);
  var beforeRuns = store.peekState().analysisRuns.length;
  var beforeUnits = JSON.stringify(store.getPhylumUnits('report-002'));
  var preview = store.previewRuleEvaluation('report-002', { sessionCandidate: sessionRevision });
  assertEqual(preview.baselineRules.length, active.length, '单报告测试固定使用全部启用规则基线');
  assertEqual(preview.candidateRules.length, active.length, '编辑候选只替换同谱系');
  assertEqual(preview.replacement.lineageId, source.lineageId, '测试运行记录替换谱系');
  assertEqual(preview.readOnly, true, '测试运行明确只读');
  assertEqual(store.peekState().analysisRuns.length, beforeRuns, '候选测试不写 analysisRuns');
  assertEqual(JSON.stringify(store.getPhylumUnits('report-002')), beforeUnits, '候选测试不写 phylumUnits');
  assertEqual(JSON.stringify(store.getState().analysisRuleCatalog), beforeCatalog, '候选测试不写规则目录');

  var impactBefore = store.getRuleChangeImpact(sessionRevision, 'activate');
  assertEqual(impactBefore.fromVersion, source.version, '保存影响预览包含原版本');
  assertEqual(impactBefore.toVersion, sessionRevision.version, '保存影响预览包含候选版本');
  assert(impactBefore.reportCounts.affectedUnpublished > 0, '保存影响预览包含未发布工作数量');
  assert(impactBefore.reportCounts.published > 0, '保存影响预览包含不自动变化的已发布报告数量');

  var saved = store.saveAndActivateAnalysisRule(sessionRevision, { actor: 'smoke' });
  assertEqual(saved.rule.version, source.version + 1, '保存新版本递增版本号');
  assertEqual(saved.rule.status, 'active', '新版本保存后立即启用');
  var lineage = store.listRuleLineages().find(function (item) { return item.lineageId === source.lineageId; });
  assert(lineage && lineage.active && lineage.active.id === saved.rule.id, '谱系当前启用版切换为新版本');
  assert(lineage.history.some(function (rule) { return rule.id === source.id && rule.status === 'inactive'; }), '旧启用版本转停用归档');
  assertEqual(lineage.active.stableOrder, source.stableOrder, '同谱系新版本继承稳定顺序');
  assertEqual(lineage.history.filter(function (rule) { return rule.id === source.id; }).length, 1, '历史版本未物理删除');
  assert(store.getReport('report-003').todoFlags.indexOf('pending_reanalysis') >= 0, '规则版本切换使未发布旧运行待重新分析');
  assert(store.getReport('report-001').todoFlags.indexOf('pending_reanalysis') < 0, '已发布且无更正工作的报告不追加待重新分析');

  var impactDeactivate = store.getRuleChangeImpact(lineage.active, 'deactivate');
  assertEqual(impactDeactivate.fromVersion, lineage.active.version, '停用影响预览包含当前版本');
  assertEqual(impactDeactivate.toVersion, null, '停用影响预览没有目标版本');
  var deactivated = store.deactivateAnalysisRuleLineage(source.lineageId, { actor: 'smoke', reason: 'smoke 停用' });
  assertEqual(deactivated.rule.status, 'inactive', '停用规则谱系归档当前版本');
  var afterDeactivate = store.listRuleLineages().find(function (item) { return item.lineageId === source.lineageId; });
  assertEqual(afterDeactivate.active, null, '停用后谱系没有启用版本');
  assert(afterDeactivate.history.length >= 2, '停用后全部历史版本继续保留');
  assertEqual(deactivated.impact.reportCounts.affectedUnpublished, impactDeactivate.reportCounts.affectedUnpublished, '停用执行返回一致的影响数量');
}

function testEngineConditionsAndOrdering() {
  var ctx = engineContext([
    { id: 'result-firmi', key: 'Firmicutes', level: 'phylum', phylumKey: 'Firmicutes', dataStatus: 'PRESENT', effectiveValue: 50, unit: '%', labNotice: 'high', rangeStatus: 'high', isCurrent: true },
    { id: 'result-bactero', key: 'Bacteroidetes', level: 'phylum', phylumKey: 'Bacteroidetes', dataStatus: 'PRESENT', effectiveValue: 20, unit: '%', labNotice: 'unmarked', rangeStatus: 'normal', isCurrent: true },
    { id: 'result-fuso', key: 'Fusobacterium', level: 'genus', phylumKey: 'Fusobacteria', dataStatus: 'NOT_DETECTED', effectiveValue: null, unit: '%', labNotice: 'unmarked', rangeStatus: null, isCurrent: true }
  ], 'cat');

  var labRule = makeEngineRule({ id: 'condition-lab', conditions: [{ id: 'c-lab', type: 'LAB_NOTICE', notice: 'high' }] });
  var rangeRule = makeEngineRule({ id: 'condition-range', conditions: [{ id: 'c-range', type: 'RANGE_STATUS', rangeStatus: 'high' }] });
  var notDetectedRule = makeEngineRule({ id: 'condition-nd', target: { level: 'genus', taxonKey: 'Fusobacterium' }, conditions: [{ id: 'c-nd', type: 'NOT_DETECTED' }] });
  var speciesRule = makeEngineRule({ id: 'condition-species', conditions: [{ id: 'c-species', type: 'SPECIES', species: ['cat'] }] });
  var otherRule = makeEngineRule({ id: 'condition-other', conditions: [{ id: 'c-other', type: 'OTHER_TAXON_STATUS', taxonKey: 'Bacteroidetes', statusKind: 'RANGE_STATUS', expected: 'normal' }] });
  [labRule, rangeRule, notDetectedRule, speciesRule, otherRule].forEach(function (rule) {
    assertEqual(Engine.evaluateRule(rule, ctx).matched, true, '条件类型 ' + rule.conditions[0].type + ' 可命中');
  });

  var allRule = makeEngineRule({
    id: 'logic-all',
    conditionLogic: 'ALL',
    conditions: [
      { id: 'all-1', type: 'LAB_NOTICE', notice: 'high' },
      { id: 'all-2', type: 'SPECIES', species: ['dog'] }
    ]
  });
  var anyRule = Object.assign({}, allRule, { id: 'logic-any', lineageId: 'lineage-logic-any', conditionLogic: 'ANY' });
  assertEqual(Engine.evaluateRule(allRule, ctx).matched, false, 'ALL 有一项失败则不命中');
  assertEqual(Engine.evaluateRule(anyRule, ctx).matched, true, 'ANY 有一项成功即可命中');

  var failed = Engine.evaluateRule(makeEngineRule({ id: 'condition-failed', conditions: [{ id: 'failed-1', type: 'RANGE_STATUS', rangeStatus: 'low' }] }), ctx);
  assertEqual(failed.matched, false, '不满足条件时规则未命中');
  assert(/高于参考范围/.test(failed.conditionResults[0].message) && failed.conditionResults[0].actualValue === 'high', '未命中解释包含实际范围状态');
  var missingTarget = Engine.evaluateRule(makeEngineRule({ id: 'target-missing', target: { level: 'phylum', taxonKey: 'Actinobacteria' } }), ctx);
  assertEqual(missingTarget.matched, false, '目标无结果时不命中');
  assert(/无检测结果/.test(missingTarget.reason), '目标无结果给出明确原因');

  var orderedRules = [
    makeEngineRule({ id: 'order-low', lineageId: 'order-low', stableOrder: 3, output: { analysis: 'LOW', advice: 'LOW-A' } }),
    makeEngineRule({ id: 'order-mid', lineageId: 'order-mid', stableOrder: 2, output: { analysis: 'MID', advice: 'MID-A' } }),
    makeEngineRule({ id: 'order-first', lineageId: 'order-first', stableOrder: 1, output: { analysis: 'FIRST', advice: 'FIRST-A' } }),
    makeEngineRule({ id: 'order-empty-advice', lineageId: 'order-empty-advice', stableOrder: 4, output: { analysis: 'EMPTY', advice: '' } })
  ];
  var ordered = Engine.evaluate({ rules: orderedRules, results: ctx.results, species: ctx.species, sourceTemplateId: ctx.sourceTemplateId, taxa: Object.keys(ctx.taxaByKey).map(function (key) { return ctx.taxaByKey[key]; }) });
  var firmi = ordered.units.find(function (unit) { return unit.phylumKey === 'Firmicutes'; });
  assertEqual(firmi.drafts.analysis, 'FIRST\nMID\nLOW\nEMPTY', '采用命中按谱系稳定顺序合成');
  assertEqual(firmi.drafts.advice, 'FIRST-A\nMID-A\nLOW-A', '建议栏空着不进入草稿');
  assertEqual(firmi.hits.filter(function (hit) { return hit.combineStatus === 'primary'; }).length, 4, '同菌多条命中全部采用');

  var tieRuleA = makeEngineRule({ id: 'tie-a', lineageId: 'tie-a', conflictGroup: 'same-group' });
  var tieRuleB = makeEngineRule({ id: 'tie-b', lineageId: 'tie-b', conflictGroup: 'same-group' });
  assertEqual(Engine.validateConflictTies([tieRuleA, tieRuleB]).length, 0, '冲突组不再阻断保存');
  store.saveAndActivateAnalysisRule(tieRuleA, { actor: 'smoke' });
  var tieSaveBlocked = false;
  try { store.saveAndActivateAnalysisRule(tieRuleB, { actor: 'smoke' }); } catch (error) { tieSaveBlocked = true; }
  assert(!tieSaveBlocked, '同冲突组两条都可保存启用');

  var emptyAdvice = makeEngineRule({ id: 'empty-advice', output: { analysis: '只有分析', advice: '' } });
  assertEqual(Engine.validateRuleDetails(emptyAdvice).length, 0, '建议可空且通过校验');
}

function testJudgmentSentenceCompileAndClinicalDefaults() {
  store.reset();
  var compiledDefault = Engine.compileJudgment(Engine.defaultJudgment());
  assertEqual(compiledDefault.conditionLogic, 'ALL', '判断句编译为全部满足');
  assertEqual(compiledDefault.conditions.length, 1, '判断句编译为单观察');
  assertEqual(compiledDefault.conditions[0].type, 'LAB_NOTICE', '新增默认不是范围条件');
  assertEqual(compiledDefault.conditions[0].notice, 'high', '新增默认是实验室标偏高');
  assertEqual(compiledDefault.applicableSpecies.join(','), 'cat', '判断句默认只属于一个封闭物种');
  assert(!compiledDefault.conditions.some(function (condition) { return condition.type === 'SPECIES'; }), '判断句不写入物种条件行');

  var roundTrip = Engine.decompileJudgment(Object.assign(makeEngineRule({
    id: 'judgment-roundtrip',
    conditions: compiledDefault.conditions,
    applicableSpecies: compiledDefault.applicableSpecies
  }), { conditionLogic: compiledDefault.conditionLogic }));
  assertEqual(roundTrip.mode, 'sentence', '单观察规则反编译为判断句');
  assertEqual(roundTrip.observationKind, 'lab_high', '反编译观察种类正确');

  var labLow = Engine.compileJudgment({ observationKind: 'lab_low', applicableSpecies: ['cat'] });
  var noRangeCtx = engineContext([
    { id: 'result-actino', key: 'Actinobacteria', level: 'phylum', phylumKey: 'Actinobacteria', dataStatus: 'PRESENT', effectiveValue: 18, unit: '%', labNotice: 'low', rangeStatus: 'no_range', isCurrent: true }
  ], 'cat');
  var labLowRule = makeEngineRule({
    id: 'judgment-lab-low',
    target: { level: 'phylum', taxonKey: 'Actinobacteria' },
    conditionLogic: labLow.conditionLogic,
    conditions: labLow.conditions,
    applicableSpecies: labLow.applicableSpecies
  });
  assertEqual(Engine.evaluateRule(labLowRule, noRangeCtx).matched, true, '实验室标注可在无范围报告命中');
  var semantics = Engine.describeJudgmentSemantics({ mode: 'sentence', observationKind: 'lab_low' });
  assert(/没有参考范围也能说/.test(semantics) && /不要理解成参考范围偏低/.test(semantics), '人话回译说明无范围仍可命中且不是参考范围');

  var notDetected = Engine.compileJudgment({ observationKind: 'not_detected', applicableSpecies: ['cat'] });
  var ndCtx = engineContext([
    { id: 'result-fuso', key: 'Fusobacterium', level: 'genus', phylumKey: 'Fusobacteria', dataStatus: 'NOT_DETECTED', effectiveValue: null, unit: '%', labNotice: 'unmarked', rangeStatus: null, isCurrent: true }
  ], 'cat');
  var ndRule = makeEngineRule({
    id: 'judgment-nd',
    target: { level: 'genus', taxonKey: 'Fusobacterium' },
    riskLevel: 'notice',
    conditionLogic: notDetected.conditionLogic,
    conditions: notDetected.conditions,
    applicableSpecies: notDetected.applicableSpecies,
    output: { analysis: '【演示·未审核】未检出分析', advice: '' }
  });
  assertEqual(Engine.evaluateRule(ndRule, ndCtx).matched, true, '未检出观察可命中');
  assertEqual(ndRule.output.advice, '', '建议栏空着 = 不给建议');
  assertEqual(Engine.validateRuleDetails(ndRule).length, 0, '建议可空通过校验');

  var dogCtx = engineContext(noRangeCtx.results, 'dog');
  assertEqual(Engine.evaluateRule(labLowRule, dogCtx).matched, false, '物种不在范围不命中');
  assert(/报告物种不在规则适用范围/.test(Engine.evaluateRule(labLowRule, dogCtx).reason), '物种不匹配给出适用范围原因');
  var doctor = Engine.explainRuleAgainstContext(labLowRule, dogCtx, { taxonLabel: '放线菌门' });
  assert(doctor.says === false && /物种不符/.test(doctor.missingObservation), '医生语言解释未命中是物种不符');

  var advanced = Engine.decompileJudgment(makeEngineRule({
    id: 'legacy-advanced',
    conditionLogic: 'ALL',
    conditions: [
      { id: 'c1', type: 'LAB_NOTICE', notice: 'high' },
      { id: 'c2', type: 'SPECIES', species: ['cat'] },
      { id: 'c3', type: 'OTHER_TAXON_STATUS', taxonKey: 'Bacteroidetes', statusKind: 'LAB_NOTICE', expected: 'unmarked' }
    ]
  }));
  assertEqual(advanced.mode, 'advanced', '历史多条件规则进入兼容模式');
  assert(advanced.reasons.some(function (reason) { return /物种条件/.test(reason); }), '兼容原因包含物种条件');
  assert(advanced.reasons.some(function (reason) { return /其他分类单元/.test(reason); }), '兼容原因包含其他分类单元');

  var catalog = store.getState().analysisRuleCatalog;
  var actino = catalog.find(function (rule) { return rule.id === 'rule-actino-low-cat'; });
  var actinoDog = catalog.find(function (rule) { return rule.id === 'rule-actino-low-dog'; });
  assert(actino && actino.conditions[0].type === 'LAB_NOTICE' && actino.conditions[0].notice === 'low', '演示偏低规则改为实验室标注');
  assert(actinoDog && actino.lineageId !== actinoDog.lineageId, '猫狗共用种子已拆成两条谱系');
  assertEqual(actino.applicableSpecies.join(','), 'cat', '猫规则只属于猫');
  assertEqual(actinoDog.applicableSpecies.join(','), 'dog', '狗规则只属于狗');
  assert(!catalog.filter(function (rule) { return rule.status === 'active'; }).some(function (rule) {
    return rule.conditions.length === 1 && rule.conditions[0].type === 'RANGE_STATUS' && (rule.conditions[0].rangeStatus === 'low' || rule.conditions[0].rangeStatus === 'normal');
  }), '启用演示规则不再默认低于/处于参考范围');
  var legacy = catalog.find(function (rule) { return rule.id === 'rule-legacy-cross'; });
  assert(legacy && legacy.status === 'inactive' && Engine.analyzeRuleShape(legacy).advanced, '历史交叉条件规则停用并标为高级');

  var session = Object.assign({}, labLowRule, {
    id: null,
    lineageId: 'lineage-judgment-smoke',
    name: '猫 · 放线菌门 · 实验室标偏低',
    status: 'session'
  });
  var beforeRuns = store.peekState().analysisRuns.length;
  var beforeUnits = JSON.stringify(store.getPhylumUnits('report-002'));
  var preview = store.previewRuleEvaluation('report-002', { sessionCandidate: session });
  assertEqual(preview.readOnly, true, '测试只读');
  assertEqual(store.peekState().analysisRuns.length, beforeRuns, '判断句候选测试不写 analysisRuns');
  assertEqual(JSON.stringify(store.getPhylumUnits('report-002')), beforeUnits, '测试不写菌门分析单元');
  var saved = store.saveAndActivateAnalysisRule(session, { actor: 'smoke' });
  assertEqual(saved.rule.status, 'active', '判断句保存并启用');
  assertEqual(saved.rule.conditions[0].type, 'LAB_NOTICE', '保存后仍是实验室标注条件');
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
    applicableSpecies: ['cat'],
    sourceTemplateIds: [store.DEFAULT_SOURCE_ORG_ID, store.SECOND_SOURCE_ORG_ID],
    riskLevel: 'medium',
    priority: 31,
    conflictGroup: 'catalog-smoke-unique',
    output: { analysis: '分析', advice: '建议' }
  });
  assert(Array.isArray(errors) && errors.length === 0, 'validateAnalysisRule 合法规则');
  var bothSpecies = store.validateAnalysisRule({
    name: '测试跨物种',
    target: { level: 'phylum', taxonKey: 'Firmicutes' },
    conditionLogic: 'ALL',
    conditions: [{ id: 'c1', type: 'LAB_NOTICE', notice: 'high' }],
    applicableSpecies: ['cat', 'dog'],
    sourceTemplateIds: [store.DEFAULT_SOURCE_ORG_ID, store.SECOND_SOURCE_ORG_ID],
    output: { analysis: '分析', advice: '建议' }
  });
  assert(bothSpecies.some(function (message) { return /一个当前能出报告的物种/.test(message); }), '校验拒绝跨物种共用谱系');
}

function testClosedSpeciesValueThresholdCopyAndLibrary() {
  store.reset();
  var compiledAnd = Engine.compileJudgment({
    observationKind: 'lab_high',
    applicableSpecies: ['cat'],
    valueThreshold: { enabled: true, comparator: 'gt', threshold: 10 }
  });
  assertEqual(compiledAnd.conditions.length, 2, '状态+数值编译为两条 AND 条件');
  assertEqual(compiledAnd.conditionLogic, 'ALL', '状态+数值必须全部满足');
  assertEqual(compiledAnd.conditions[1].type, 'VALUE_THRESHOLD', '第二条件是有效值门槛');

  var highCtx = engineContext([
    { id: 'result-firmi', key: 'Firmicutes', level: 'phylum', phylumKey: 'Firmicutes', dataStatus: 'PRESENT', effectiveValue: 50, unit: '%', labNotice: 'high', rangeStatus: 'high', isCurrent: true }
  ], 'cat');
  var andRule = makeEngineRule({
    id: 'and-threshold',
    conditionLogic: compiledAnd.conditionLogic,
    conditions: compiledAnd.conditions,
    applicableSpecies: compiledAnd.applicableSpecies
  });
  assertEqual(Engine.evaluateRule(andRule, highCtx).matched, true, '状态和有效值都满足则命中');

  var lowValueCtx = engineContext([
    { id: 'result-firmi-low', key: 'Firmicutes', level: 'phylum', phylumKey: 'Firmicutes', dataStatus: 'PRESENT', effectiveValue: 4, unit: '%', labNotice: 'high', rangeStatus: 'low', isCurrent: true }
  ], 'cat');
  var valueMiss = Engine.evaluateRule(andRule, lowValueCtx);
  assertEqual(valueMiss.matched, false, '状态满足但有效值不满足则不命中');
  var doctorValue = Engine.explainRuleAgainstContext(andRule, lowValueCtx, { taxonLabel: '厚壁菌门' });
  assert(/有效值不满足/.test(doctorValue.missingObservation), '医生语言说明有效值不满足');

  var unmarkedCtx = engineContext([
    { id: 'result-firmi-unmarked', key: 'Firmicutes', level: 'phylum', phylumKey: 'Firmicutes', dataStatus: 'PRESENT', effectiveValue: 50, unit: '%', labNotice: 'unmarked', rangeStatus: 'high', isCurrent: true }
  ], 'cat');
  var statusMiss = Engine.explainRuleAgainstContext(andRule, unmarkedCtx, { taxonLabel: '厚壁菌门' });
  assert(statusMiss.says === false && /状态不满足/.test(statusMiss.missingObservation), '医生语言说明状态不满足');

  var turtleCtx = engineContext(highCtx.results, 'turtle');
  assertEqual(Engine.evaluateRule(andRule, turtleCtx).matched, false, '未列入封闭名单的物种不命中');
  assert(/报告物种不在规则适用范围/.test(Engine.evaluateRule(andRule, turtleCtx).reason), '未来物种不会自动命中');

  var allOpen = makeEngineRule({ id: 'open-all', applicableSpecies: ['all'] });
  assertEqual(Engine.evaluateRule(allOpen, highCtx).matched, false, '禁止开放全部物种');
  assert(Engine.validateRuleDetails(allOpen).some(function (error) { return error.field === 'applicableSpecies'; }), '开放全部物种无法保存');

  var catGroups = store.listRuleLibraryGroups('cat');
  var dogGroups = store.listRuleLibraryGroups('dog');
  assert(catGroups.length > 0 && dogGroups.length > 0, '规则库可按物种分组');
  var catIds = [];
  catGroups.forEach(function (group) {
    group.phylumLineages.forEach(function (lineage) { catIds.push(lineage.lineageId); });
    group.genera.forEach(function (genus) {
      genus.lineages.forEach(function (lineage) { catIds.push(lineage.lineageId); });
    });
  });
  var dogIds = [];
  dogGroups.forEach(function (group) {
    group.phylumLineages.forEach(function (lineage) { dogIds.push(lineage.lineageId); });
    group.genera.forEach(function (genus) {
      genus.lineages.forEach(function (lineage) { dogIds.push(lineage.lineageId); });
    });
  });
  assert(catIds.every(function (id) { return dogIds.indexOf(id) < 0; }), '一条规则只出现在它那个物种列表里');
  var proteo = catGroups.find(function (group) { return group.phylumKey === 'Proteobacteria'; });
  assert(proteo && proteo.genera.some(function (genus) { return genus.genusKey === 'Klebsiella' && genus.lineages.length >= 1; }), '组内再按菌属归类');

  var source = store.getState().analysisRuleCatalog.find(function (rule) { return rule.id === 'rule-actino-low-cat'; });
  var copied = store.copyAnalysisRuleToSpecies(source.id, 'dog', { actor: 'smoke' });
  assert(copied.rule.lineageId !== source.lineageId, '复制到另一物种生成新谱系');
  assertEqual(copied.rule.applicableSpecies.join(','), 'dog', '复制后只属于目标物种');
  assertEqual(copied.rule.output.analysis, source.output.analysis, '复制后文案可以相同');
  var dogActino = store.listRuleLibraryGroups('dog').reduce(function (count, group) {
    return count + group.phylumLineages.filter(function (lineage) {
      return lineage.active && lineage.active.target && lineage.active.target.taxonKey === 'Actinobacteria';
    }).length;
  }, 0);
  assert(dogActino >= 2, '复制后狗列表里放线菌门有两条独立谱系');
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
  assertEqual(inStore.labStoreId, 'store-001', '本店送检默认检测机构=承接门店');
  assert(!!inStore.labName, '本店送检写入检测机构名称');
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
  assertEqual(brought.labStoreId, null, '客户自带报告不把承接门店当作检测机构');
}

function testLabScopedSampleDuplicates() {
  store.reset();
  var first = store.registerTest({
    petId: 'pet-001',
    sampleNumber: 'S-LAB-DUP',
    testDate: '2025-09-04',
    storeId: 'store-001',
    submissionType: 'in_store'
  });
  assertEqual(first.labStoreId, 'store-001', '本店送检默认 labStoreId=storeId');
  assert(first.labName.indexOf('朝阳') >= 0, '本店送检 labName 取门店名');

  var sameLabThrew = false;
  try {
    store.registerTest({
      petId: 'pet-006',
      sampleNumber: 'S-LAB-DUP',
      testDate: '2025-09-04',
      storeId: 'store-001',
      submissionType: 'in_store'
    });
  } catch (err) {
    sameLabThrew = /同一检测机构/.test(err.message);
  }
  assert(sameLabThrew, '同检测机构同样本编号拒绝登记');

  var otherLab = store.registerTest({
    petId: 'pet-002',
    sampleNumber: 'S-LAB-DUP',
    testDate: '2025-09-04',
    storeId: 'store-002',
    submissionType: 'in_store'
  });
  assert(otherLab.id !== first.id, '不同检测机构可共用样本编号');
  assertEqual(otherLab.sampleNumber, 'S-LAB-DUP', '跨机构样本编号原样保留');
  assert(otherLab.id !== first.id && /^tr-\d+$/.test(otherLab.id), '平台送检 ID 仍全局唯一');

  var emptyA = store.registerTest({
    petId: 'pet-001',
    sampleNumber: '',
    testDate: '2025-09-04',
    storeId: 'store-001',
    submissionType: 'in_store'
  });
  var emptyB = store.registerTest({
    petId: 'pet-006',
    sampleNumber: '',
    testDate: '2025-09-04',
    storeId: 'store-001',
    submissionType: 'in_store'
  });
  assert(emptyA.id !== emptyB.id, '空样本编号不参与重复校验');

  store.reset();
  var broughtA = store.registerTest({
    petId: 'pet-001',
    sampleNumber: 'S-FREE-LAB',
    testDate: '2025-09-04',
    storeId: 'store-001',
    labName: '外院实验室甲',
    submissionType: 'customer_brought'
  });
  assertEqual(broughtA.storeId, 'store-001', '客户自带报告仍写入承接门店');
  assertEqual(broughtA.labName, '外院实验室甲', '客户自带报告写入手填检测机构');
  assertEqual(broughtA.labStoreId, null, '客户自带报告不绑定门店为检测机构');

  var broughtSameThrew = false;
  try {
    store.registerTest({
      petId: 'pet-006',
      sampleNumber: 'S-FREE-LAB',
      testDate: '2025-09-04',
      storeId: 'store-002',
      labName: '外院实验室甲',
      submissionType: 'customer_brought'
    });
  } catch (err) {
    broughtSameThrew = /同一检测机构/.test(err.message);
  }
  assert(broughtSameThrew, '手填同一检测机构同样本编号拒绝登记');

  var broughtOther = store.registerTest({
    petId: 'pet-006',
    sampleNumber: 'S-FREE-LAB',
    testDate: '2025-09-04',
    storeId: 'store-002',
    labName: '外院实验室乙',
    submissionType: 'customer_brought'
  });
  assert(!!broughtOther.id, '不同手填检测机构可共用样本编号');

  var emptyLabA = store.registerTest({
    petId: 'pet-001',
    sampleNumber: 'S-NO-LAB',
    testDate: '2025-09-04',
    storeId: 'store-001',
    submissionType: 'customer_brought'
  });
  var emptyLabB = store.registerTest({
    petId: 'pet-006',
    sampleNumber: 'S-NO-LAB',
    testDate: '2025-09-04',
    storeId: 'store-001',
    submissionType: 'customer_brought'
  });
  assert(emptyLabA.id !== emptyLabB.id, '未填检测机构时样本编号不参与重复校验');

  store.reset();
  var rec = store.registerTest({
    petId: 'pet-001',
    sampleNumber: 'S-IMPORT-DUP',
    testDate: '2025-09-04',
    storeId: 'store-001',
    submissionType: 'in_store'
  });
  var rec2 = store.registerTest({
    petId: 'pet-006',
    sampleNumber: 'S-IMPORT-OTHER',
    testDate: '2025-09-04',
    storeId: 'store-001',
    submissionType: 'in_store'
  });
  var importDup = store.checkDuplicateImport({
    testRecordId: rec2.id,
    sampleNumber: 'S-IMPORT-DUP'
  });
  assert(importDup && importDup.existingTestRecordId === rec.id, '导入重复校验按检测机构+样本编号');

  store.registerTest({
    petId: 'pet-002',
    sampleNumber: 'S-IMPORT-CROSS',
    testDate: '2025-09-04',
    storeId: 'store-002',
    submissionType: 'in_store'
  });
  var recSameSampleOtherLab = store.registerTest({
    petId: 'pet-001',
    sampleNumber: 'S-IMPORT-CROSS',
    testDate: '2025-09-04',
    storeId: 'store-001',
    submissionType: 'in_store'
  });
  var cross = store.checkDuplicateImport({
    testRecordId: recSameSampleOtherLab.id,
    sampleNumber: 'S-IMPORT-CROSS'
  });
  assert(cross == null, '导入重复校验不跨检测机构');
}

function testPermissionsUsersAndProducts() {
  store.reset();

  var created = store.createPlatformUser({ phone: '19900001111', name: '甲用户', address: '地址甲' });
  var duplicate = store.createPlatformUser({ phone: '19900001111', name: '乙用户', address: '地址乙' });
  assertEqual(duplicate.id, created.id, 'duplicate phone returns same id');
  var storedDup = store.peekState().users.find(function (u) { return u.id === created.id; });
  assertEqual(storedDup.name, '甲用户', 'duplicate phone does not overwrite name');
  assertEqual(storedDup.address, '地址甲', 'duplicate phone does not overwrite address');

  store.commit(function (state) {
    state.users.push({
      id: 'user-disabled-smoke',
      name: '停用用户',
      phone: '18800000000',
      disabled: true,
      createdAt: '2025-09-01T00:00:00.000Z'
    });
  });
  var revived = store.createPlatformUser({ phone: '18800000000', name: '试图启用' });
  assertEqual(revived.disabled, true, 'disabled user not re-enabled');
  assertEqual(revived.name, '停用用户', 'disabled user name unchanged on duplicate phone');

  var petCountBefore = store.peekState().pets.length;
  var registered = store.registerTest({
    newPet: { name: '原子新宠', species: 'cat', breed: '测试猫' },
    userId: 'user-001',
    testDate: '2025-09-03',
    storeId: 'store-001',
    submissionType: 'in_store',
    sampleNumber: ''
  });
  assertEqual(store.peekState().pets.length, petCountBefore + 1, 'registerTest with newPet creates pet atomically');
  assertEqual(registered.sampleNumber, '', 'registerTest allows empty sample number');
  var newPet = store.peekState().pets.find(function (p) { return p.id === registered.petId; });
  assert(newPet && newPet.name === '原子新宠', 'new pet linked to test record');

  var petCountAfterSuccess = store.peekState().pets.length;
  try {
    store.registerTest({
      newPet: { name: '孤儿宠' },
      userId: 'user-001',
      testDate: '2025-09-03',
      storeId: 'store-001'
    });
    assert(false, 'registerTest newPet failure should throw');
  } catch (err) {
    assert(/送检类型/.test(err.message), 'registerTest failure rolls back orphan pet');
  }
  assertEqual(store.peekState().pets.length, petCountAfterSuccess, 'no orphan pets after registerTest failure');

  store.setActorFixture({ actorId: 'admin-demo', roles: ['editor', 'reviewer'] });
  store.savePhylumUnitProducts('report-007', 'Actinobacteria', { primaryProductId: 'prod-003', relatedProductIds: [] });
  var unit007 = store.getPhylumUnits('report-007').find(function (u) { return u.phylumKey === 'Actinobacteria'; });
  assertEqual(unit007.primaryProductId, 'prod-003', 'product save on published report without correction');

  store.reset();
  store.commit(function (state) {
    var report = state.reports.find(function (r) { return r.id === 'report-002'; });
    report.submittedByActorId = 'editor-a';
  });
  store.setActorFixture({ actorId: 'editor-b', roles: ['editor'] });
  var withdrawBlocked = false;
  try {
    store.withdrawReport('report-002', { actorId: 'editor-b' });
  } catch (err) {
    withdrawBlocked = /提交人|撤回/.test(err.message);
  }
  assert(withdrawBlocked, 'withdraw by non-submitter fails');

  store.reset();
  store.setActorFixture({ actorId: 'readonly-1', roles: ['readonly'] });
  var submitBlocked = false;
  try {
    store.submitReport('report-003', { actorId: 'readonly-1' });
  } catch (err) {
    submitBlocked = /权限/.test(err.message);
  }
  assert(submitBlocked, 'readonly cannot submit');
  store.setActorFixture(null);
}

function prepareReportForPublish(reportId) {
  store.reset();
  store.withdrawReport(reportId, { actor: 'smoke', actorId: 'admin-demo' });
  store.runReportAnalysis(reportId, { actor: 'smoke' });
  var units = store.getPhylumUnits(reportId);
  units.forEach(function (unit) {
    store.confirmPhylumUnit(reportId, unit.phylumKey, { actor: 'smoke' });
  });
  var report = store.getReport(reportId);
  store.saveReportAssessment(reportId, {
    reportSpecies: report.reportSpecies || 'cat',
    healthLevel: 'B',
    healthScore: 80,
    percentile: 50,
    summary: 'smoke summary',
    platformDimensions: { emotion: 70, immunity: 75 }
  }, { actor: 'smoke', actorId: 'admin-demo' });
}

function testDomainAtomicityAndPermissions() {
  store.reset();
  store.setActorFixture({ actorId: 'admin-editor', roles: ['editor'] });
  var editorBlocked = false;
  try {
    store.savePhylumUnitDraft('report-002', 'Proteobacteria', { analysis: '编制员不可改待审核' });
  } catch (err) {
    editorBlocked = /待审核|权限/.test(err.message);
  }
  assert(editorBlocked, 'editor cannot save draft on pending_review report');

  store.reset();
  store.setActorFixture({ actorId: 'admin-reviewer', roles: ['reviewer'] });
  store.savePhylumUnitDraft('report-002', 'Proteobacteria', { analysis: '审核员可修订待审核', advice: '建议' });
  var protReview = store.getPhylumUnits('report-002').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assertEqual(protReview.analysisDraft, '审核员可修订待审核', 'reviewer can save draft on pending_review');

  store.reset();
  store.setActorFixture({ actorId: 'admin-reviewer', roles: ['reviewer'] });
  var reviewerIncompleteBlocked = false;
  try {
    store.savePhylumUnitDraft('report-003', 'Proteobacteria', { analysis: '审核员不可改待完善' });
  } catch (err) {
    reviewerIncompleteBlocked = /权限/.test(err.message);
  }
  assert(reviewerIncompleteBlocked, 'reviewer cannot save draft on incomplete report');

  store.reset();
  var protBefore = store.getPhylumUnits('report-003').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  var beforeAnalysis = protBefore ? protBefore.analysisDraft : '';
  var beforeScore = store.getReport('report-003').versions[0].healthScore;
  try {
    store.saveReportWorkVersion('report-003', {
      assessment: { healthScore: 999 },
      phylumUnits: [{ phylumKey: 'Proteobacteria', analysis: '不应写入' }]
    }, { actorId: 'admin-demo' });
    assert(false, 'invalid work version should throw');
  } catch (err) {
    assert(/综合分/.test(err.message), 'work version validates assessment before write');
  }
  var protAfter = store.getPhylumUnits('report-003').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assertEqual(protAfter.analysisDraft, beforeAnalysis, 'work version failure leaves phylum drafts unchanged');
  assertEqual(store.getReport('report-003').versions[0].healthScore, beforeScore, 'work version failure leaves assessment unchanged');

  store.reset();
  store.saveReportWorkVersion('report-003', {
    assessment: { healthLevel: 'C', healthScore: 66, summary: '原子暂存' },
    phylumUnits: [{ phylumKey: 'Proteobacteria', analysis: '原子分析', advice: '原子建议' }]
  }, { actorId: 'admin-demo' });
  var saved = store.getReport('report-003');
  assertEqual(saved.versions[0].healthScore, 66, 'work version saves assessment atomically');
  var protSaved = store.getPhylumUnits('report-003').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
  assertEqual(protSaved.analysisDraft, '原子分析', 'work version saves phylum drafts atomically');

  store.reset();
  var r7 = store.getReport('report-007');
  var snapBefore = JSON.stringify(store.getPublishedVersionSnapshot('report-007'));
  var unitBefore = store.getPhylumUnits('report-007').find(function (u) { return u.phylumKey === 'Actinobacteria'; });
  var draftBefore = unitBefore.analysisDraft;
  store.setActorFixture({ actorId: 'admin-demo', roles: ['editor', 'reviewer'] });
  store.savePhylumUnitProducts('report-007', 'Actinobacteria', { primaryProductId: 'prod-001', relatedProductIds: [] });
  var unitAfter = store.getPhylumUnits('report-007').find(function (u) { return u.phylumKey === 'Actinobacteria'; });
  assertEqual(unitAfter.analysisDraft, draftBefore, 'product save does not change professional draft');
  assertEqual(JSON.stringify(store.getPublishedVersionSnapshot('report-007')), snapBefore, 'product save does not change published snapshot');
  assertEqual(r7.correctionDraftActive, false, 'product save does not create correction draft');

  store.reset();
  var voidedBlocked = false;
  try {
    store.savePhylumUnitProducts('report-005', 'Proteobacteria', { primaryProductId: 'prod-001' });
  } catch (err) {
    voidedBlocked = /作废/.test(err.message);
  }
  assert(voidedBlocked, 'voided report cannot configure products');

  prepareReportForPublish('report-002');
  store.setActorFixture({ actorId: 'admin-dual', roles: ['editor', 'reviewer'] });
  store.submitReport('report-002', { actorId: 'admin-dual', actor: '双权限' });
  assertEqual(store.getReport('report-002').submittedByActorId, 'admin-dual', 'dual submits with stable actorId');
  store.publishReport('report-002', { actorId: 'admin-dual', actor: '双权限' });
  assertEqual(store.getReport('report-002').status, 'published', 'dual can publish own submission');

  store.reset();
  store.createCorrectionDraft('report-001', { correctionNote: 'smoke correction' });
  assertEqual(store.getCorrectionDraftStage('report-001'), 'incomplete', 'correction draft starts incomplete');
  store.setActorFixture({ actorId: 'admin-editor', roles: ['editor'] });
  store.savePhylumUnitDraft('report-001', 'Actinobacteria', { analysis: '更正编制', advice: '' });
  store.getPhylumUnits('report-001').forEach(function (unit) {
    store.confirmPhylumUnit('report-001', unit.phylumKey, { actor: 'editor' });
  });
  store.submitReport('report-001', { actorId: 'admin-editor' });
  assertEqual(store.getCorrectionDraftStage('report-001'), 'pending_review', 'correction submit enters pending_review stage');
  store.setActorFixture({ actorId: 'admin-reviewer', roles: ['reviewer'] });
  store.publishReport('report-001', { actorId: 'admin-reviewer' });
  assertEqual(store.getReport('report-001').status, 'published', 'correction publish keeps published status');
  assertEqual(store.getReport('report-001').correctionDraftActive, false, 'correction publish clears draft flag');

  store.setActorFixture('editor');
  assertEqual(store.peekState().meta.version, store.getState().meta.version, 'setActorFixture accepts profile key');
  store.setActorFixture(null);
}

function main() {
  testSeed();
  testStateMachine();
  testUnitsAndEngine();
  testRuleLifecycleAndCandidateSet();
  testEngineConditionsAndOrdering();
  testJudgmentSentenceCompileAndClinicalDefaults();
  testPublicationChecks();
  testSnapshotFreeze();
  testCatalogAndPicker();
  testClosedSpeciesValueThresholdCopyAndLibrary();
  testDeprecatedAndLabels();
  testIntakePipeline();
  testLabScopedSampleDuplicates();
  testPermissionsUsersAndProducts();
  testDomainAtomicityAndPermissions();

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
}

main();
