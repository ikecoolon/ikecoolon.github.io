#!/usr/bin/env node
'use strict';

var store = require('../../shared/mock-store.js');
global.window = global;
global.location = { hash: '', href: '', search: '' };
global.confirm = function () { return true; };
global.document = {
  getElementById: function () { return null; },
  body: { appendChild: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; } },
  createElement: function () {
    return {
      className: '', classList: { add: function () {}, toggle: function () {}, remove: function () {} },
      setAttribute: function () {}, getAttribute: function () { return null; },
      addEventListener: function () {},
      querySelector: function () { return { onclick: null }; }, querySelectorAll: function () { return []; },
      appendChild: function () {}, remove: function () {}, removeChild: function () {}, closest: function () { return null; },
      parentNode: null, focus: function () {}, innerHTML: '', textContent: '', tagName: 'DIV', style: {}
    };
  }
};
require('./admin-permissions.js');
require('./admin-session.js');
require('./admin-common.js');

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
var Perms = global.PetAdminPermissions;
var Session = global.PetAdminSession;

Session.init({
  container: global.document.createElement('div'),
  tabbar: global.document.createElement('div'),
  onActivate: function (tab) {
    if (tab) Session.activateTab(tab.id);
  }
});

assertEqual(Perms.getActor().id, 'admin-demo', 'default actor id');
assert(Perms.can('submit'), 'default actor can submit');
assert(Perms.can('configure_products'), 'default actor can configure products');

Perms.setActorFixture('readonly');
assert(!Perms.can('submit'), 'readonly cannot submit');
assert(!Perms.can('edit_report'), 'readonly cannot edit report');

Perms.setActorFixture('editor');
assert(Perms.can('edit_report'), 'editor can edit');
assert(!Perms.can('publish'), 'editor cannot publish');

Perms.setActorFixture('reviewer');
assert(!Perms.can('edit_report'), 'reviewer cannot edit incomplete');
assert(Perms.can('publish'), 'reviewer can publish');

Perms.setActorFixture('default');

var tab1 = Session.openTab('report-center', { view: 'pending' }, { title: '报告中心', activate: true });
var tab2 = Session.openTab('report-review', { reportId: 'report-002' }, { title: '工作台', activate: true });
assertEqual(Session.getActiveTab().id, tab2.id, 'latest tab active');
Session.setTabDirty(tab1.id, true);
assert(Session.findTab(tab1.id).dirty, 'tab dirty flag set');
Session.activateTab(tab1.id);
assertEqual(Session.getActiveTab().id, tab1.id, 'activate existing tab');
Session.updateTabState(tab1.id, { listState: { view: 'published', page: 2 } });
assertEqual(Session.getTabState(tab1.id).listState.page, 2, 'list state preserved on tab');

var key1 = Session.makeTabKey('report-review', { reportId: 'report-002' });
var key2 = Session.makeTabKey('report-review', { reportId: 'report-003' });
assert(key1 !== key2, 'different entities get different tab keys');
var tabSame = Session.openTab('report-review', { reportId: 'report-002' }, { title: 'dup', activate: false });
assertEqual(tabSame.id, tab2.id, 'same entity reopens existing tab');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
