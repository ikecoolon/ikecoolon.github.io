'use strict';

function extractFixtureIds() {
  var store = window.PetReportMockStore;
  if (!store || typeof store.getState !== 'function') {
    return { ok: false, error: 'PetReportMockStore 未就绪' };
  }
  var state = store.getState();
  var reports = state.reports || [];

  function getCorrectionStage(report) {
    if (!report || !report.correctionDraftActive) return null;
    if (typeof store.getCorrectionDraftStage === 'function') {
      return store.getCorrectionDraftStage(report);
    }
    var ver = (report.versions || []).find(function (v) { return v.version === report.workingVersion; });
    if (!ver) return null;
    if (ver.status === 'pending_review') return 'pending_review';
    return 'incomplete';
  }

  function isAssessmentEditable(report) {
    if (!report || !report.id || report.status === 'voided') return false;
    if (report.status === 'incomplete') return true;
    if (report.status === 'published' && report.correctionDraftActive) {
      return getCorrectionStage(report) === 'incomplete';
    }
    return false;
  }

  function isAssessmentReadOnly(report) {
    if (!report || !report.id || report.status === 'voided') return false;
    if (report.status === 'published' && !report.correctionDraftActive) return true;
    if (report.status === 'pending_review') return true;
    if (report.status === 'published' && report.correctionDraftActive) {
      return getCorrectionStage(report) === 'pending_review';
    }
    return false;
  }

  var readOnlyReports = reports.filter(isAssessmentReadOnly);
  if (readOnlyReports.length < 2) {
    readOnlyReports = reports.filter(function (r) {
      return r && r.id && (r.status === 'pending_review' || (r.status === 'published' && !r.correctionDraftActive));
    });
  }
  var reportA = readOnlyReports[0];
  var reportB = readOnlyReports[1] || readOnlyReports[0];

  var editableReports = reports.filter(isAssessmentEditable);
  var editableReport = editableReports.find(function (r) {
    return reportA && reportB && r.id !== reportA.id && r.id !== reportB.id;
  }) || editableReports[0] || null;

  var activeRule = (state.analysisRuleCatalog || []).find(function (r) {
    return r && r.status === 'active' && r.lineageId;
  });
  var lineageId = activeRule ? activeRule.lineageId : null;
  var ruleId = activeRule ? activeRule.id : null;

  var users = state.users || [];
  var pets = state.pets || [];
  var userWithPet = users.find(function (u) {
    return pets.some(function (p) { return p.userId === u.id; });
  }) || users[0];
  var pet = pets.find(function (p) { return userWithPet && p.userId === userWithPet.id; }) || pets[0];

  var professional = state.professionalCatalog || {};
  var schemes = professional.referenceRangeSchemes || [];
  var scheme = schemes[0];

  var breeds = professional.breeds || [];
  var dictItem = breeds[0] || null;
  var dictItemId = dictItem ? (dictItem.id || dictItem.key) : null;

  var taxa = professional.microbiotaTaxa || [];
  var taxon = taxa.find(function (t) { return t && t.key; }) || taxa[0] || null;

  var petsBefore = (state.pets || []).length;
  var testRecordsBefore = (state.testRecords || []).length;

  function pickReportSearchKeyword(reportNumber) {
    if (!reportNumber) return 'RPT';
    var parts = String(reportNumber).split('-');
    if (parts[0] && parts[0].length >= 2) return parts[0];
    return String(reportNumber).slice(0, 3);
  }

  return {
    ok: true,
    reportA: reportA ? reportA.id : null,
    reportB: reportB ? reportB.id : null,
    editableReport: editableReport ? editableReport.id : null,
    reportNumberA: reportA ? reportA.reportNumber : null,
    reportNumberB: reportB ? reportB.reportNumber : null,
    lineageId: lineageId,
    ruleId: ruleId,
    userId: userWithPet ? userWithPet.id : null,
    petId: pet ? pet.id : null,
    schemeId: scheme ? scheme.id : null,
    dictItemId: dictItemId,
    taxonKey: taxon ? taxon.key : null,
    petsBefore: petsBefore,
    testRecordsBefore: testRecordsBefore,
    reportSearchKeyword: pickReportSearchKeyword(reportA && reportA.reportNumber)
  };
}

module.exports = {
  extractFixtureIdsBody: extractFixtureIds.toString().replace(/^function extractFixtureIds\s*\(\)\s*\{/, '').replace(/\}\s*$/, '')
};
