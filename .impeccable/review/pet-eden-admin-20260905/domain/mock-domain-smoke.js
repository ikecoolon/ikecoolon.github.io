#!/usr/bin/env node
'use strict';

var path = require('path');
var store = require(path.resolve(__dirname, '../../../../docs/.vuepress/public/prototype/shared/mock-store.js'));

global.window = global;
global.location = { hash: '', href: '', search: '' };
global.localStorage = {
  _data: {},
  getItem: function (k) { return this._data[k] || null; },
  setItem: function (k, v) { this._data[k] = String(v); },
  removeItem: function (k) { delete this._data[k]; }
};
require(path.resolve(__dirname, '../../../../docs/.vuepress/public/prototype/admin/js/admin-permissions.js'));

var Perms = global.PetAdminPermissions;
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

store.reset();
Perms.setActorFixture('default');
assertEqual(Perms.getActor().id, 'admin-demo', 'default profile stable actorId');
assert(Perms.can('submit'), 'dual default can submit');
assert(Perms.can('publish'), 'dual default can publish');
assert(!Perms.can('totally_unknown_action'), 'unknown action denied');

Perms.setActorFixture('editor');
assert(Perms.can('edit_report'), 'editor can edit');
assert(!Perms.can('publish'), 'editor cannot publish');
assert(!Perms.can('withdraw', { submittedByActorId: 'editor-a', actorId: 'editor-b' }), 'withdraw mismatch denied');
assert(!Perms.can('withdraw', { submittedByActorId: 'editor-a' }), 'withdraw without actorId denied');
assert(Perms.can('withdraw', { submittedByActorId: 'editor-a', actorId: 'editor-a' }), 'withdraw submitter match allowed');

Perms.setActorFixture('reviewer');
assert(!Perms.can('edit_report'), 'reviewer cannot edit incomplete');
assert(Perms.can('publish'), 'reviewer can publish');
assert(Perms.can('configure_products', { reportStatus: 'published' }), 'reviewer can configure products');
assert(!Perms.can('configure_products', { reportStatus: 'voided' }), 'voided products blocked');

Perms.setActorFixture('readonly');
assert(!Perms.can('submit'), 'readonly cannot submit');
assert(!Perms.can('edit_report'), 'readonly cannot edit');
assert(Perms.can('read'), 'readonly can read');

global.localStorage.setItem('pet-admin-actor-fixture', 'readonly');
store.reset();
Perms.setActorFixture('default');
assertEqual(Perms.getActor().id, 'admin-demo', 'localStorage does not override explicit default fixture');

store.setActorFixture('editor');
assertEqual(store.peekState().meta.version, store.getState().meta.version, 'store profile key maps to editor fixture');

store.reset();
store.setActorFixture({ actorId: 'admin-editor', roles: ['editor'] });
var blocked = false;
try {
  store.savePhylumUnitDraft('report-002', 'Proteobacteria', { analysis: 'blocked' });
} catch (err) {
  blocked = /待审核|权限/.test(err.message);
}
assert(blocked, 'store blocks editor professional edit on pending_review');

store.reset();
store.setActorFixture({ actorId: 'admin-reviewer', roles: ['reviewer'] });
store.savePhylumUnitDraft('report-002', 'Proteobacteria', { analysis: 'reviewer edit', advice: '' });
var unit = store.getPhylumUnits('report-002').find(function (u) { return u.phylumKey === 'Proteobacteria'; });
assertEqual(unit.analysisDraft, 'reviewer edit', 'store allows reviewer pending_review edit');

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
assert(withdrawBlocked, 'store withdraw requires submitter actorId');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
