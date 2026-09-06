#!/usr/bin/env node
'use strict';

var path = require('path');
var store = require(path.resolve(__dirname, '../../../../docs/.vuepress/public/prototype/shared/mock-store.js'));

global.window = global;
global.PetReportMockStore = store;
require(path.resolve(__dirname, '../../../../docs/.vuepress/public/prototype/admin/js/dictionary-data-service.js'));

var svc = global.dictionaryDataService;
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

function catalogSnapshot() {
  return JSON.stringify(store.getState().professionalCatalog);
}

function expectBlocked(label, fn) {
  var before = catalogSnapshot();
  var blocked = false;
  try {
    fn();
  } catch (err) {
    blocked = /权限/.test(err.message);
    if (!blocked) {
      console.error('FAIL:', label + ' threw unexpected error: ' + err.message);
      failed += 1;
      return;
    }
  }
  assert(blocked, label + ' blocked');
  assertEqual(catalogSnapshot(), before, label + ' leaves catalog unchanged');
}

function expectAllowed(label, fn) {
  var before = catalogSnapshot();
  try {
    fn();
    assert(true, label + ' allowed');
    assert(catalogSnapshot() !== before, label + ' mutates catalog');
  } catch (err) {
    failed += 1;
    console.error('FAIL:', label + ' should be allowed but threw: ' + err.message);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, message);
}

function writeAttemptsViaStore() {
  store.saveTaxonEdu('Collinsella', { edu: { sceneCopy: 'blocked-store' } });
  store.saveMicrobiotaPresentation({ low: 'blocked-store' });
  store.updateProfessionalCatalog(function (catalog) {
    catalog.microbiotaTaxa.push({
      id: 'tax-blocked',
      key: 'BlockedGenus',
      label: '阻断属',
      level: 'genus',
      parentKey: 'Firmicutes',
      sortOrder: 999
    });
  });
}

function writeAttemptsViaService() {
  svc.saveTaxonEdu('Collinsella', { edu: { sceneCopy: 'blocked-svc' } });
  svc.saveMicrobiotaPresentation({ low: 'blocked-svc' });
  svc.saveCatalogItem('microbiotaTaxa', {
    id: 'tax-svc-blocked',
    key: 'SvcBlocked',
    label: '服务阻断',
    level: 'genus',
    parentKey: 'Firmicutes',
    sortOrder: 998
  });
  svc.deleteCatalogItem('microbiotaTaxa', 'tax-fuso');
  svc.saveCatalogOrder('microbiotaTaxa', [
    { id: 'tax-firmi', sortOrder: 5 },
    { id: 'tax-bactero', sortOrder: 10 }
  ]);
  svc.saveReferenceRangeScheme({
    name: '阻断方案',
    evidenceRef: 'smoke-block',
    items: [{ indicatorKey: 'alpha-diversity', minValue: 1, maxValue: 2, unit: 'index' }]
  });
}

store.reset();
store.setActorFixture('readonly');
assert(Array.isArray(svc.getMicrobiotaTaxa()) && svc.getMicrobiotaTaxa().length > 0, 'readonly can read microbiota taxa');
assert(svc.getMicrobiotaPresentation() && svc.getMicrobiotaPresentation().low, 'readonly can read presentation');
assert(Array.isArray(svc.getReferenceRangeSchemes()), 'readonly can read reference range schemes');
assert(store.getState().professionalCatalog.meta, 'readonly reset initializes catalog');

expectBlocked('readonly store catalog writes', writeAttemptsViaStore);
store.reset();
store.setActorFixture('readonly');
expectBlocked('readonly service catalog writes', writeAttemptsViaService);

store.reset();
store.setActorFixture('reviewer');
expectBlocked('reviewer store catalog writes', writeAttemptsViaStore);
store.reset();
store.setActorFixture('reviewer');
expectBlocked('reviewer service catalog writes', writeAttemptsViaService);

store.reset();
store.setActorFixture('editor');
expectAllowed('editor saveTaxonEdu via store', function () {
  store.saveTaxonEdu('Collinsella', { edu: { sceneCopy: 'editor-ok' } });
});
var editorEdu = store.getState().professionalCatalog.microbiotaTaxa.find(function (t) {
  return t.key === 'Collinsella';
});
assertEqual(editorEdu.edu.sceneCopy, 'editor-ok', 'editor saveTaxonEdu persisted');

store.reset();
store.setActorFixture('dual');
expectAllowed('dual saveMicrobiotaPresentation via service', function () {
  svc.saveMicrobiotaPresentation({ low: 'dual-ok' });
});
assertEqual(svc.getMicrobiotaPresentation().low, 'dual-ok', 'dual presentation persisted');

store.reset();
store.setActorFixture('default');
expectAllowed('default saveCatalogItem via service', function () {
  svc.saveCatalogItem('testIndicators', {
    id: 'ti-smoke-new',
    key: 'smoke-indicator',
    label: 'Smoke指标',
    value: 'smoke',
    standardUnit: 'index',
    parentKey: null,
    sortOrder: 90
  });
});
assert(svc.getTestIndicators().some(function (i) { return i.key === 'smoke-indicator'; }), 'default catalog item saved');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
