#!/usr/bin/env node
/**
 * Report workbench — multi-tab DOM isolation, atomic persist, permissions
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const SCREEN = path.join(OUT, 'screenshots');
const BASE = process.env.WB_BASE || 'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html';

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

async function gotoReview(page, reportId, moduleId) {
  const hash = `#report-review?reportId=${encodeURIComponent(reportId)}${moduleId ? '&module=' + moduleId : ''}`;
  await page.goto(BASE.split('#')[0] + hash, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.PetReportMockStore && typeof window.initReportReview === 'function');
  await page.waitForSelector('#rw-workbench', { timeout: 30000 });
  if (moduleId) {
    await page.evaluate((mod) => {
      const mount = window.PetAdminSession.getActiveTab().mount;
      const btn = mount.querySelector('[data-module-id="' + mod + '"]');
      if (btn) btn.click();
    }, moduleId);
  }
  await page.waitForFunction(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    return mount && mount.querySelector('#assess-summary');
  }, { timeout: 20000 });
}

async function openSecondReportTab(page, reportId) {
  await page.evaluate((rid) => {
    window.location.hash = '#report-review?reportId=' + encodeURIComponent(rid) + '&module=assessment';
  }, reportId);
  await page.waitForFunction(() => document.querySelectorAll('#admin-tabbar .admin-tab').length >= 2, { timeout: 30000 });
  await page.waitForFunction((rid) => {
    const S = window.PetAdminSession;
    const tab = S.findTabByKey(S.buildTabKey('report-review', { reportId: rid }));
    return tab && tab.initialized && tab.mount && tab.mount.querySelector('#rw-workbench');
  }, reportId, { timeout: 45000 });
  await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const btn = mount.querySelector('[data-module-id="assessment"]');
    if (btn) btn.click();
  });
  await page.waitForFunction(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const panel = mount.querySelector('#module-assessment');
    return panel && !panel.classList.contains('hidden') && mount.querySelector('#assess-summary');
  }, { timeout: 20000 });
  return page.evaluate(() => window.PetAdminSession.getActiveTab().id);
}

async function getActiveMountField(page, selector) {
  return page.evaluate((sel) => {
    const active = window.PetAdminSession.getActiveTab();
    if (!active || !active.mount) return null;
    const el = active.mount.querySelector(sel);
    return el ? el.value : null;
  }, selector);
}

async function setActiveMountField(page, selector, value) {
  return page.evaluate(({ sel, val }) => {
    const active = window.PetAdminSession.getActiveTab();
    const el = active.mount.querySelector(sel);
    if (!el) return false;
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, { sel: selector, val: value });
}

async function isTabDirty(page, tabId) {
  return page.evaluate((id) => window.PetAdminSession.isDirty(id), tabId);
}

async function clickTab(page, tabId) {
  await page.evaluate((id) => window.PetAdminSession.activateTab(id), tabId);
  await page.waitForFunction(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    return mount && mount.querySelector('#assess-summary');
  }, { timeout: 20000 });
  await page.waitForTimeout(200);
}

async function screenshotViewport(page, name, width, height) {
  await page.setViewportSize({ width, height: height || 900 });
  await page.waitForTimeout(250);
  const clip = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const wb = mount.querySelector('#rw-workbench');
    if (!wb) return null;
    const r = wb.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 820) };
  });
  const file = path.join(SCREEN, `${name}-${width}.png`);
  if (clip && clip.width > 0) {
    await page.screenshot({ path: file, clip });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  return file;
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // ── 1. Multi-tab DOM isolation ──
  await gotoReview(page, 'report-003', 'assessment');
  const tabA = await page.evaluate(() => window.PetAdminSession.getActiveTab().id);

  const tabB = await openSecondReportTab(page, 'report-002');
  await setActiveMountField(page, '#assess-summary', 'TAB-B-UNIQUE-SUMMARY-002');
  const bOnB = await getActiveMountField(page, '#assess-summary');
  record('tab B holds its own summary', bOnB === 'TAB-B-UNIQUE-SUMMARY-002', bOnB);

  await clickTab(page, tabA);
  await setActiveMountField(page, '#assess-summary', 'TAB-A-UNIQUE-SUMMARY-003');
  const dirtyA = await isTabDirty(page, tabA);
  record('tab A dirty after edit', dirtyA);
  const aBack = await getActiveMountField(page, '#assess-summary');
  record('tab A keeps its summary after switch', aBack === 'TAB-A-UNIQUE-SUMMARY-003', aBack);

  await clickTab(page, tabB);
  const bAgain = await getActiveMountField(page, '#assess-summary');
  record('switch to B again preserves B draft', bAgain === 'TAB-B-UNIQUE-SUMMARY-002', bAgain);

  // store broadcast while inactive
  await page.evaluate(() => {
    window.PetReportMockStore.commit((state) => {
      const r = state.reports.find((x) => x.id === 'report-003');
      if (r) r.updatedAt = new Date().toISOString();
      return state.reports[0];
    });
  });
  await page.waitForTimeout(400);
  const bAfterStore = await getActiveMountField(page, '#assess-summary');
  record('store update on inactive tab does not clobber active DOM', bAfterStore === 'TAB-B-UNIQUE-SUMMARY-002', bAfterStore);

  // ── 2. Atomic persist clears dirty ──
  await clickTab(page, tabA);
  const dirtyBeforeSave = await isTabDirty(page, tabA);
  record('tab A still dirty before save', dirtyBeforeSave);
  await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const btn = mount.querySelector('#btn-save-draft');
    if (btn) btn.click();
  });
  await page.waitForTimeout(600);
  const dirtyAfterSave = await isTabDirty(page, tabA);
  record('atomic save clears professional dirty', !dirtyAfterSave);

  const savedSummary = await page.evaluate(() => {
    const r = window.PetReportMockStore.getReport('report-003');
    const v = r.versions && r.versions[0];
    return v && v.summary;
  });
  record('save persisted summary to store', savedSummary === 'TAB-A-UNIQUE-SUMMARY-003', savedSummary);

  // ── 3. Permissions: editor blocked on pending_review, reviewer allowed ──
  await page.evaluate(() => window.PetReportMockStore.reset());
  const editorBase = BASE.split('#')[0].split('?')[0] + '?actor=editor';
  await page.goto(editorBase + '#report-review?reportId=report-002&module=assessment', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    return mount && mount.querySelector('#assess-summary');
  }, { timeout: 20000 });
  const editorReadonly = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const ta = mount.querySelector('#assess-summary');
    return ta ? ta.disabled : null;
  });
  record('editor cannot edit pending_review report', editorReadonly === true, String(editorReadonly));

  const reviewerBase = BASE.split('#')[0].split('?')[0] + '?actor=reviewer';
  await page.goto(reviewerBase + '#report-review?reportId=report-002&module=assessment', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    return mount && mount.querySelector('#assess-summary');
  }, { timeout: 20000 });
  const reviewerEditable = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const ta = mount.querySelector('#assess-summary');
    return ta ? !ta.disabled : false;
  });
  record('reviewer can edit pending_review report', reviewerEditable);

  // ── 4. Responsive screenshots with visible edit + preview ──
  await page.evaluate(() => window.PetReportMockStore.reset());
  await gotoReview(page, 'report-003', 'assessment');
  await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const btn = mount.querySelector('[data-module-id="assessment"]');
    if (btn) btn.click();
  });
  const shots = [];
  for (const w of [1440, 1280, 1024, 390]) {
    shots.push(await screenshotViewport(page, 'workbench-assessment', w, w < 500 ? 844 : 900));
  }
  record('responsive screenshots captured', shots.every((f) => fs.existsSync(f)), shots.map((f) => path.basename(f)).join(', '));

  const previewVisible = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const preview = mount.querySelector('#preview-content .rw-scroll-report');
    const form = mount.querySelector('#assess-species');
    return !!(preview && form);
  });
  record('edit area and preview both present', previewVisible);

  await browser.close();

  const report = {
    base: BASE,
    passed,
    failed,
    total: passed + failed,
    cases,
    consoleErrors: [...new Set(consoleErrors)],
    pageErrors: [...new Set(pageErrors)],
    screenshots: fs.readdirSync(SCREEN).filter((f) => f.endsWith('.png'))
  };
  fs.writeFileSync(path.join(OUT, 'workbench-results.json'), JSON.stringify(report, null, 2));
  console.log('\n---', passed, 'passed,', failed, 'failed ---');
  if (consoleErrors.length) console.log('console errors:', consoleErrors.length);
  if (pageErrors.length) console.log('page errors:', pageErrors.length);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
