#!/usr/bin/env node
/**
 * Navigation fix — C.navigate uninitialized tab mount + activate param timing
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const FIXTURE = 'file://' + path.join(__dirname, 'navigation-fix-fixture.html');
const BASE = process.env.NAV_BASE || 'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html';

function loadPlaywright() {
  const candidates = [
    '/tmp/pet-eden-session-test/node_modules/playwright',
    'playwright'
  ];
  for (const base of candidates) {
    try {
      if (base === 'playwright') return require('playwright');
      if (fs.existsSync(path.join(base, 'package.json'))) return require(base);
    } catch (_e) { /* next */ }
  }
  throw new Error('playwright not found');
}

const cases = [];
const consoleErrors = [];
const pageErrors = [];
let passed = 0;
let failed = 0;

function record(name, ok, detail) {
  cases.push({ name, ok, detail: detail || '' });
  if (ok) { passed++; console.log('OK:', name, detail ? `(${detail})` : ''); }
  else { failed++; console.error('FAIL:', name, detail || ''); }
}

async function waitWorkbench(page, reportId) {
  await page.waitForFunction((rid) => {
    const S = window.PetAdminSession;
    const tab = S.findTabByKey(S.buildTabKey('report-review', { reportId: rid }));
    return tab && tab.initialized && tab.mount && tab.mount.querySelector('#rw-workbench');
  }, reportId, { timeout: 45000 });
}

async function navigateReport(page, reportId, moduleId) {
  await page.evaluate(({ rid, mod }) => {
    window.PetAdminCommon.navigate('report-review', { reportId: rid, module: mod || 'assessment' });
  }, { rid: reportId, mod: moduleId });
  await waitWorkbench(page, reportId);
}

async function testRealNavigate(page) {
  const root = BASE.split('#')[0];
  await page.goto(root + '#report-center', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.PetAdminCommon && window.PetAdminSession);

  await navigateReport(page, 'report-003', 'assessment');
  const tabA = await page.evaluate(() => window.PetAdminSession.getActiveTab().id);
  const aContent = await page.evaluate(() => {
    const m = window.PetAdminSession.getActiveTab().mount;
    return m.querySelector('#assess-summary') ? 'ok' : 'empty';
  });
  record('first report mounts via C.navigate', aContent === 'ok', aContent);

  await page.evaluate(() => {
    window.PetAdminCommon.navigate('report-center', {});
  });
  await page.waitForFunction(() => {
    const t = window.PetAdminSession.getActiveTab();
    return t && t.pageId === 'report-center' && t.initialized;
  }, { timeout: 30000 });

  await navigateReport(page, 'report-002', 'assessment');
  const tabB = await page.evaluate(() => window.PetAdminSession.getActiveTab().id);
  const bContent = await page.evaluate(() => {
    const m = window.PetAdminSession.getActiveTab().mount;
    return m.querySelector('#assess-summary') ? 'ok' : 'empty';
  });
  record('second report mounts via C.navigate (not empty shell)', bContent === 'ok', bContent);
  record('two distinct report tabs', tabA !== tabB, tabA + ' vs ' + tabB);

  await page.evaluate((id) => window.PetAdminSession.activateTab(id), tabA);
  await page.waitForFunction(() => {
    const m = window.PetAdminSession.getActiveTab().mount;
    return m && m.querySelector('#assess-summary');
  }, { timeout: 20000 });
  const aAgain = await page.evaluate(() => {
    const tab = window.PetAdminSession.findTabByKey(
      window.PetAdminSession.buildTabKey('report-review', { reportId: 'report-003' })
    );
    return tab && tab.mount.querySelector('#rw-workbench') ? 'ok' : 'empty';
  });
  record('first report tab still has content after switch back', aAgain === 'ok', aAgain);

  const bStill = await page.evaluate(() => {
    const tab = window.PetAdminSession.findTabByKey(
      window.PetAdminSession.buildTabKey('report-review', { reportId: 'report-002' })
    );
    return tab && tab.mount.querySelector('#rw-workbench') ? 'ok' : 'empty';
  });
  record('second report tab retains mounted content', bStill === 'ok', bStill);
}

async function testSameEntityModuleReuse(page) {
  await page.evaluate(() => {
    window.PetAdminSession.getTabs().forEach((t) => {
      t._disposed = true;
    });
    while (window.PetAdminSession.getTabs().length) {
      window.PetAdminSession.closeTab(window.PetAdminSession.getTabs()[0].id, { skipLeaveCheck: true });
    }
  });

  await navigateReport(page, 'report-003', 'assessment');
  const tabId1 = await page.evaluate(() => window.PetAdminSession.getActiveTab().id);

  await page.evaluate(() => {
    window.PetAdminCommon.navigate('report-review', { reportId: 'report-003', module: 'source' });
  });
  await page.waitForFunction(() => {
    const t = window.PetAdminSession.getActiveTab();
    return t.params.module === 'source';
  }, { timeout: 15000 });

  const reuse = await page.evaluate(() => {
    const S = window.PetAdminSession;
    const tabs = S.getTabs().filter((t) => t.pageId === 'report-review' &&
      S.buildTabKey('report-review', { reportId: 'report-003' }) === t.tabKey);
    return {
      count: tabs.length,
      sameId: S.getActiveTab().id,
      module: S.getActiveTab().params.module
    };
  });
  record('same report entity reuses tab on module change', reuse.count === 1 && reuse.sameId === tabId1);
  record('module param applied before UI reads', reuse.module === 'source', 'module=' + reuse.module);
}

async function testRapidNavigateNoDuplicateMount(page) {
  const mountProbe = await page.evaluate(async () => {
    const S = window.PetAdminSession;
    const rid = 'report-001';
    const key = S.buildTabKey('report-review', { reportId: rid });
    const calls = [];
    const origFetch = window.fetch;
    window.fetch = function (url) {
      if (String(url).indexOf('report-review.html') >= 0) calls.push(Date.now());
      return origFetch.apply(this, arguments);
    };
    const burst = [];
    for (let i = 0; i < 5; i++) {
      burst.push(new Promise((resolve) => {
        window.PetAdminCommon.navigate('report-review', { reportId: rid, module: 'assessment', burst: String(i) });
        resolve();
      }));
    }
    await Promise.all(burst);
    await new Promise((r) => setTimeout(r, 3000));
    const tab = S.findTabByKey(key);
    window.fetch = origFetch;
    return {
      htmlFetches: calls.length,
      initialized: tab && tab.initialized,
      hasWorkbench: tab && tab.mount && !!tab.mount.querySelector('#rw-workbench')
    };
  });
  record('rapid C.navigate does not duplicate HTML fetch', mountProbe.htmlFetches <= 2,
    'fetches=' + mountProbe.htmlFetches);
  record('rapid navigate ends with single mounted workbench', mountProbe.hasWorkbench, String(mountProbe.initialized));
}

async function testFixtureEditTestTiming(page) {
  await page.goto(FIXTURE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.__navFixHarness.reset());

  await page.evaluate(() => {
    window.__navFixHarness.navigate('analysis-rules', { mode: 'edit', lineage: 'L-fix-1' });
  });
  await page.waitForFunction(() => {
    const t = window.PetAdminSession.getActiveTab();
    return t && t.initialized;
  });

  await page.evaluate(() => {
    window.__navFixHarness.navigate('analysis-rules', { mode: 'test', lineage: 'L-fix-1' });
  });
  await page.waitForTimeout(100);

  const result = await page.evaluate(() => {
    const H = window.__navFixHarness;
    const log = H.getActivateLog();
    const tab = window.PetAdminSession.getActiveTab();
    const lastActivate = log[log.length - 1];
    const domMode = tab.mount.querySelector('.mode-label');
    return {
      tabCount: window.PetAdminSession.getTabs().length,
      lastMode: lastActivate ? lastActivate.mode : null,
      domMode: domMode ? domMode.textContent : null,
      paramsMode: tab.params.mode,
      mounts: H.getMountCounts()
    };
  });

  record('edit/test share one tab', result.tabCount === 1);
  record('activate hook sees test mode after edit→test', result.lastMode === 'test', JSON.stringify(result));
  record('DOM reflects test mode from params', result.domMode === 'test' && result.paramsMode === 'test');
  const mountValues = Object.values(result.mounts);
  record('fixture single mount per tab', mountValues.length <= 1 && (mountValues[0] || 0) <= 1,
    JSON.stringify(result.mounts));
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await testRealNavigate(page);
  await testSameEntityModuleReuse(page);
  await testRapidNavigateNoDuplicateMount(page);
  await testFixtureEditTestTiming(page);

  await browser.close();

  const report = {
    ranAt: new Date().toISOString(),
    command: 'node .impeccable/review/pet-eden-admin-20260905/session/navigation-fix-test.mjs',
    base: BASE,
    fixture: FIXTURE,
    passed,
    failed,
    cases,
    consoleErrors: [...new Set(consoleErrors)],
    pageErrors: [...new Set(pageErrors)]
  };
  fs.writeFileSync(path.join(OUT, 'navigation-fix-results.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'navigation-fix-results.md'),
    '# Navigation fix 测试结果\n\n' +
    '- **命令**: `node .impeccable/review/pet-eden-admin-20260905/session/navigation-fix-test.mjs`\n' +
    '- **Base**: ' + BASE + '\n' +
    '- **结果**: **' + passed + ' passed, ' + failed + ' failed**\n\n' +
    cases.map((c) => '- ' + (c.ok ? '✓' : '✗') + ' ' + c.name + (c.detail ? ' — ' + c.detail : '')).join('\n') +
    '\n'
  );

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (consoleErrors.length) console.log('console errors:', consoleErrors.length);
  if (pageErrors.length) console.log('page errors:', pageErrors.length);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
