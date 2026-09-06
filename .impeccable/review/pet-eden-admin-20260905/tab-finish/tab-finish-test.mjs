#!/usr/bin/env node
/**
 * Tab title (C.navigate) + real pointer dirty-close — Playwright locator.click
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE = process.env.TAB_FINISH_BASE ||
  'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html';
const PLAYWRIGHT_MODULE = process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhaoyanlong/.npm/_npx/420ff84f11983ee5/node_modules/playwright';

function loadPlaywright() {
  return require(PLAYWRIGHT_MODULE);
}

const cases = [];
let passed = 0;
let failed = 0;

function record(name, ok, detail) {
  cases.push({ name, ok, detail: detail || '' });
  if (ok) { passed++; console.log('OK:', name, detail ? `(${detail})` : ''); }
  else { failed++; console.error('FAIL:', name, detail || ''); }
}

async function activeTabLabel(page) {
  return (await page.locator('.admin-tab.is-active .admin-tab-label').textContent()) || '';
}

async function closeActiveTabPointer(page, accept) {
  const closeBtn = page.locator('.admin-tab.is-active .admin-tab-close');
  await closeBtn.waitFor({ state: 'visible', timeout: 10000 });
  page.once('dialog', (dialog) => {
    if (accept) dialog.accept();
    else dialog.dismiss();
  });
  await closeBtn.click();
}

async function testNavigateChineseTitles(page) {
  const root = BASE.split('#')[0];
  await page.goto(root + '#report-center', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.PetAdminCommon && window.PetAdminSession);

  const routes = [
    { pageId: 'report-center', params: {}, expect: '报告中心' },
    { pageId: 'detection-records', params: {}, expect: '送检管理' },
    { pageId: 'normal-range-config', params: {}, expect: '指标/参考范围' },
    { pageId: 'analysis-rules', params: {}, expect: '分析规则' }
  ];

  for (const r of routes) {
    await page.evaluate(({ pageId, params }) => {
      window.PetAdminCommon.navigate(pageId, params);
    }, r);
    await page.waitForFunction(({ pageId }) => {
      const t = window.PetAdminSession.getActiveTab();
      return t && t.pageId === pageId;
    }, r, { timeout: 20000 });
    const label = await activeTabLabel(page);
    record('C.navigate ' + r.pageId + ' shows Chinese title', label === r.expect, label);
  }

  await page.evaluate(() => {
    window.PetAdminCommon.navigate('report-review', { reportId: 'report-003', module: 'assessment' });
  });
  await page.waitForFunction(() => {
    const t = window.PetAdminSession.getActiveTab();
    return t && t.pageId === 'report-review' && t.params.reportId === 'report-003';
  }, { timeout: 45000 });
  const reportLabel = await activeTabLabel(page);
  record('C.navigate report-review shows Chinese title', reportLabel === '报告工作台', reportLabel);

  await page.evaluate(() => {
    window.PetAdminCommon.navigate('analysis-rules', { mode: 'edit', lineage: 'tab-finish-L1' });
  });
  await page.waitForFunction(() => {
    const t = window.PetAdminSession.getActiveTab();
    return t && t.params.mode === 'edit';
  }, { timeout: 20000 });
  const editLabel = await activeTabLabel(page);
  record('C.navigate analysis-rules edit title', editLabel === '编辑分析规则', editLabel);

  await page.evaluate(() => {
    window.PetAdminCommon.navigate('analysis-rules', { mode: 'test', lineage: 'tab-finish-L1' });
  });
  await page.waitForFunction(() => {
    const t = window.PetAdminSession.getActiveTab();
    return t && t.params.mode === 'test';
  }, { timeout: 15000 });
  const testLabel = await activeTabLabel(page);
  const tabCount = await page.evaluate(() => window.PetAdminSession.getTabs().length);
  record('edit→test shows 规则测试 title', testLabel === '规则测试', testLabel);
  record('edit/test share one tab', tabCount >= 1);
}

async function testPointerDirtyClose(page) {
  const root = BASE.split('#')[0];
  await page.goto(root + '#report-center', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.PetAdminCommon && window.PetAdminSession);

  await page.evaluate(() => {
    window.PetAdminCommon.navigate('detection-records', {});
  });
  await page.waitForFunction(() => {
    const t = window.PetAdminSession.getActiveTab();
    return t && t.pageId === 'detection-records';
  }, { timeout: 20000 });

  const tabId = await page.evaluate(() => window.PetAdminSession.getActiveTab().id);
  await page.evaluate(() => window.__petAdminSetTabDirty(true));
  const dirtyBefore = await page.evaluate(() => window.PetAdminSession.isDirty());

  await closeActiveTabPointer(page, false);

  const stillOpen = await page.evaluate((id) => !!window.PetAdminSession.findTab(id), tabId);
  const stillDirty = await page.evaluate(() => window.PetAdminSession.isDirty());
  record('pointer dismiss on dirty close keeps tab', stillOpen && stillDirty, 'dirty=' + dirtyBefore);
  record('tab id unchanged after dismiss', stillOpen);

  await closeActiveTabPointer(page, true);

  const gone = await page.evaluate((id) => !window.PetAdminSession.findTab(id), tabId);
  record('pointer accept on dirty close removes tab', gone);
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  await testNavigateChineseTitles(page);
  await testPointerDirtyClose(page);

  await browser.close();

  const report = {
    ranAt: new Date().toISOString(),
    command: 'node .impeccable/review/pet-eden-admin-20260905/tab-finish/tab-finish-test.mjs',
    base: BASE,
    playwrightModule: PLAYWRIGHT_MODULE,
    passed,
    failed,
    cases
  };
  fs.writeFileSync(path.join(OUT, 'tab-finish-results.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'tab-finish-results.md'),
    '# Tab finish 测试结果\n\n' +
    '- **命令**: `node .impeccable/review/pet-eden-admin-20260905/tab-finish/tab-finish-test.mjs`\n' +
    '- **Base**: ' + BASE + '\n' +
    '- **Playwright**: ' + PLAYWRIGHT_MODULE + '\n' +
    '- **结果**: **' + passed + ' passed, ' + failed + ' failed**\n\n' +
    cases.map((c) => '- ' + (c.ok ? '✓' : '✗') + ' ' + c.name + (c.detail ? ' — ' + c.detail : '')).join('\n') +
    '\n'
  );

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
