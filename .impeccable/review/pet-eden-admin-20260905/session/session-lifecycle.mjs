#!/usr/bin/env node
/**
 * Pet Eden admin session lifecycle — DOM fixture + Playwright
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureUrl = 'file://' + path.join(__dirname, 'session-fixture.html');
const resultsPath = path.join(__dirname, 'session-results.json');

function loadPlaywright() {
  const candidates = [
    'playwright',
    '/tmp/pet-eden-session-test/node_modules/playwright',
    path.join(process.env.HOME || '', '.npm/_npx')
  ];
  for (const base of candidates) {
    try {
      if (base === 'playwright') return require('playwright');
      if (fs.existsSync(path.join(base, 'package.json'))) return require(base);
    } catch (_err) { /* try next */ }
  }
  throw new Error('playwright not installed; run: cd /tmp/pet-eden-session-test && npm install playwright');
}

let passed = 0;
let failed = 0;
const cases = [];

function record(name, ok, detail) {
  cases.push({ name, ok, detail: detail || '' });
  if (ok) {
    passed += 1;
    console.log('OK:', name, detail ? '(' + detail + ')' : '');
  } else {
    failed += 1;
    console.error('FAIL:', name, detail || '');
  }
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto(fixtureUrl, { waitUntil: 'domcontentloaded' });

  // canonical tab key — same entity, different noise params
  const keyCases = await page.evaluate(() => {
    const S = window.PetAdminSession;
    const k1 = S.makeTabKey('analysis-rules', { mode: 'edit', lineage: 'L1', source: 'list' });
    const k2 = S.makeTabKey('analysis-rules', { mode: 'test', lineage: 'L1', module: 'x' });
    const k3 = S.makeTabKey('report-review', { reportId: 'r-1', from: 'center' });
    const k4 = S.makeTabKey('report-review', { reportId: 'r-2' });
    const k5 = S.makeTabKey('user-pets', { detail: 'user', id: 'u-1', ref: 'nav' });
    const k6 = S.makeTabKey('user-pets', { detail: 'user', id: 'u-2' });
    return { k1, k2, k3, k4, k5, k6 };
  });
  record('analysis-rules edit/test share tab key', keyCases.k1 === keyCases.k2, keyCases.k1);
  record('different report entities differ', keyCases.k3 !== keyCases.k4);
  record('user detail canonical strips source', keyCases.k5 === 'user-pets?detail=user&id=u-1');
  record('different user ids differ', keyCases.k5 !== keyCases.k6);

  // entity reuse + state preservation
  const reuse = await page.evaluate(() => {
    const H = window.__fixtureHarness;
    const S = window.PetAdminSession;
    H.reset();
    const first = S.openTab('report-review', { reportId: 'r-1' }, { title: '报告A', activate: true });
    first.mount.innerHTML =
      '<div class="fixture-page"><p class="fixture-label">report-A</p>' +
      '<input id="fixture-field" class="fixture-input" type="text" value="" /></div>';
    H.setInput(first.id, 'draft-a');
    const dup = S.openTab('report-review', { reportId: 'r-1', from: 'other' }, { title: 'dup', activate: true });
    return {
      sameId: dup.id === first.id,
      preserved: H.getInput(first.id),
      tabCount: S.getTabs().length
    };
  });
  record('same report entity reuses tab', reuse.sameId && reuse.tabCount === 1, 'value=' + reuse.preserved);
  record('switch away preserves input', reuse.preserved === 'draft-a');

  // switch tabs keep independent state
  const switchState = await page.evaluate(() => {
    const H = window.__fixtureHarness;
    const S = window.PetAdminSession;
    H.reset();
    const ids = H.seedTabs();
    H.setInput(ids.a, 'state-a');
    H.setInput(ids.b, 'state-b');
    S.activateTab(ids.a);
    const aVal = H.getInput(ids.a);
    S.activateTab(ids.b);
    const bVal = H.getInput(ids.b);
    S.activateTab(ids.a);
    return { aVal, bVal, backA: H.getInput(ids.a), visible: H.visibleLabel() };
  });
  record('tab A state isolated', switchState.aVal === 'state-a' && switchState.backA === 'state-a');
  record('tab B state isolated', switchState.bVal === 'state-b');
  record('active mount switches visible label', switchState.visible === 'report-A');

  // no nested tab buttons
  const nested = await page.evaluate(() => {
    window.__fixtureHarness.reset();
    window.__fixtureHarness.seedTabs();
    return window.__fixtureHarness.tabbarNestedButtons();
  });
  record('tabbar has no button inside button', nested === false);

  // dirty close cancel / confirm
  const dirtyClose = await page.evaluate(() => {
    const H = window.__fixtureHarness;
    const S = window.PetAdminSession;
    H.reset();
    window.__fixtureConfirmQueue.length = 0;
    window.__fixtureConfirmQueue.push(false, true);
    const ids = H.seedTabs();
    S.setTabDirty(ids.a, true);
    const cancelled = !S.closeTab(ids.a);
    const stillThere = !!S.findTab(ids.a);
    const closed = S.closeTab(ids.a);
    return { cancelled, stillThere, closed, tabs: S.getTabs().length };
  });
  record('dirty close cancelled keeps tab', dirtyClose.cancelled && dirtyClose.stillThere);
  record('dirty close confirmed removes tab', dirtyClose.closed && dirtyClose.tabs === 1);

  // close other / close all with dirty guard
  const closeOthers = await page.evaluate(() => {
    const H = window.__fixtureHarness;
    const S = window.PetAdminSession;
    H.reset();
    window.__fixtureConfirmQueue.length = 0;
    window.__fixtureConfirmQueue.push(false);
    const ids = H.seedTabs();
    S.setTabDirty(ids.b, true);
    const blocked = !S.closeOtherTabs(ids.a);
    const countBlocked = S.getTabs().length;
    window.__fixtureConfirmQueue.push(true);
    S.setTabDirty(ids.b, false);
    const ok = S.closeOtherTabs(ids.a);
    return { blocked, countBlocked, ok, remaining: S.getTabs().length };
  });
  record('close other blocked by dirty tab', closeOthers.blocked && closeOthers.countBlocked === 2);
  record('close other succeeds when clean', closeOthers.ok && closeOthers.remaining === 1);

  const closeAll = await page.evaluate(() => {
    const H = window.__fixtureHarness;
    const S = window.PetAdminSession;
    H.reset();
    window.__fixtureConfirmQueue.length = 0;
    window.__fixtureConfirmQueue.push(false, true, true);
    H.seedTabs();
    S.setTabDirty(S.getTabs()[0].id, true);
    const blocked = !S.closeAllTabs();
    const ok = S.closeAllTabs();
    return { blocked, ok, remaining: S.getTabs().length };
  });
  record('close all blocked when dirty', closeAll.blocked);
  record('close all succeeds after confirm', closeAll.ok && closeAll.remaining === 0);

  // activate/deactivate hook log (real DOM callbacks)
  const hookLog = await page.evaluate(() => {
    const H = window.__fixtureHarness;
    const S = window.PetAdminSession;
    H.reset();
    window.__fixtureLog.length = 0;
    const ids = H.seedTabs();
    S.activateTab(ids.a);
    S.activateTab(ids.b);
    return window.__fixtureLog.slice();
  });
  record(
    'session activate/deactivate hooks fire on switch',
    hookLog.some((l) => l.startsWith('session-deactivate:')) && hookLog.some((l) => l.startsWith('session-activate:')),
    hookLog.join('|')
  );

  // detached mount blocks document.getElementById leak
  const leakProbe = await page.evaluate(() => {
    const H = window.__fixtureHarness;
    const S = window.PetAdminSession;
    H.reset();
    const ids = H.seedTabs();
    H.setInput(ids.a, 'clean');
    H.mountDetachedCallbackProbe(ids.a);
    S.activateTab(ids.b);
    return new Promise((resolve) => {
      setTimeout(() => {
        const leaked = H.liveFixtureFieldValue();
        H.stopProbe(ids.a);
        resolve({
          leaked,
          background: H.getInput(ids.a)
        });
      }, 80);
    });
  });
  record(
    'deactivate guard stops background mount callback',
    leakProbe.leaked !== 'LEAKED' && leakProbe.background === 'clean',
    'live=' + leakProbe.leaked + ' bg=' + leakProbe.background
  );

  await browser.close();

  const report = {
    ranAt: new Date().toISOString(),
    command: 'node .impeccable/review/pet-eden-admin-20260905/session/session-lifecycle.mjs',
    fixture: fixtureUrl,
    passed,
    failed,
    cases
  };
  fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2));
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
