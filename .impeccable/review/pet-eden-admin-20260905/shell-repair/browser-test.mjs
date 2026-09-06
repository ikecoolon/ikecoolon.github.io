#!/usr/bin/env node
/**
 * Shell repair — layout, mobile drawer, tab close, computed styles
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const outDir = path.join(__dirname, 'evidence');
const base = process.env.PET_ADMIN_BASE || 'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html';

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    '/Users/zhaoyanlong/.npm/_npx/420ff84f11983ee5/node_modules/playwright',
    path.join(__dirname, '../../../../..', 'node_modules/playwright')
  ].filter(Boolean);
  for (const mod of candidates) {
    try {
      return require(mod);
    } catch (_e) { /* next */ }
  }
  throw new Error('playwright not found');
}

const results = { passed: [], failed: [], consoleErrors: [], pageErrors: [] };

function assertOk(ok, msg) {
  (ok ? results.passed : results.failed).push(msg);
}

function assertRequired(ok, msg) {
  assertOk(ok, msg);
  if (!ok) throw new Error(msg);
}

async function gotoHash(page, hash) {
  const url = base.split('#')[0] + (hash.startsWith('#') ? hash : '#' + hash);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
}

async function screenshot(page, name, width, height) {
  await page.setViewportSize({ width, height: height || (width === 390 ? 844 : 900) });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage: false });
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const sider = document.getElementById('admin-sider');
    const header = document.querySelector('.ant-layout-header');
    const root = document.querySelector('.ant-admin-root');
    const cs = (el) => el ? getComputedStyle(el) : null;
    const s = cs(sider);
    const h = cs(header);
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      siderDisplay: s ? s.display : null,
      siderBackground: s ? s.backgroundColor : null,
      siderPosition: s ? s.position : null,
      headerDisplay: h ? h.display : null,
      headerHeight: h ? parseFloat(h.height) : 0,
      headerFlexWrap: h ? h.flexWrap : null,
      rootDisplay: root ? cs(root).display : null
    };
  });
}

async function getFixtureIds(page) {
  return page.evaluate(() => {
    const store = window.PetReportMockStore;
    const reports = store.getState().reports || [];
    function isAssessmentEditable(report) {
      if (!report || !report.id || report.status === 'voided') return false;
      if (report.status === 'incomplete') return true;
      if (report.status === 'published' && report.correctionDraftActive) {
        const ver = (report.versions || []).find((v) => v.version === report.workingVersion);
        return ver && ver.status !== 'pending_review';
      }
      return false;
    }
    const editable = reports.find(isAssessmentEditable);
    return { editableReport: editable ? editable.id : null };
  });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const pw = loadPlaywright();
  const browser = await pw.chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') results.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => results.pageErrors.push(String(err)));

  // report-center screenshots
  await gotoHash(page, '#report-center');
  await page.waitForSelector('#rc-list-table .rondo-basic-table-wrap tbody tr[data-row-key]');

  for (const [w, h, suffix] of [[1440, 900, '1440'], [1024, 900, '1024'], [1280, 520, '1280x520'], [390, 844, '390']]) {
    await screenshot(page, `report-center-${suffix}`, w, h);
  }

  let metrics = await layoutMetrics(page);
  assertRequired(metrics.rootDisplay === 'flex', 'ant-admin-root display:flex @1440');
  assertRequired(metrics.siderDisplay === 'flex', 'sider display:flex @1440');
  assertRequired(metrics.siderPosition === 'fixed', 'sider position:fixed @1440');
  assertRequired(metrics.headerDisplay === 'flex', 'header display:flex @1440');
  assertRequired(metrics.headerHeight <= 52, 'header single-line height @1440 (' + metrics.headerHeight + 'px)');
  assertRequired(!metrics.horizontalOverflow, 'no horizontal overflow @1440');

  const btnGap = await page.evaluate(() => {
    const btn = document.querySelector('#report-center .ant-btn, #report-center .rondo-btn');
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    return { display: cs.display, padding: cs.padding, height: cs.height, className: btn.className };
  });
  assertOk(btnGap && (btnGap.display === 'inline-flex' || btnGap.display === 'flex'), 'report-center toolbar button styled');

  const tagStyle = await page.evaluate(() => {
    const tag = document.querySelector('#report-center .ant-tag, #report-center .rondo-tag');
    if (!tag) return null;
    const cs = getComputedStyle(tag);
    return { padding: cs.padding, height: cs.height };
  });
  assertOk(!!tagStyle, 'status tag present in report-center');

  // clean tab: locator.click 可关闭（独立导航，避免与 dirty 流程互相干扰）
  await gotoHash(page, '#report-center');
  await page.waitForSelector('#rc-list-table tbody tr');
  await gotoHash(page, '#user-pets');
  await page.waitForSelector('#admin-tabbar .admin-tab[data-page-id="user-pets"], #admin-tabbar .admin-tab');
  const extraTabId = await page.evaluate(() => window.PetAdminSession.getActiveTab().id);
  await page.locator(`#admin-tabbar .admin-tab[data-tab-id="${extraTabId}"] .admin-tab-close`).click();
  await page.waitForFunction(
    (tid) => !document.querySelector(`#admin-tabbar .admin-tab[data-tab-id="${tid}"]`),
    extraTabId,
    { timeout: 10000 }
  );
  assertOk(true, 'clean tab close via locator.click');

  // report-review screenshots
  const ids = await getFixtureIds(page);
  const reportId = ids.editableReport;
  assertRequired(!!reportId, 'fixture: editable report id');
  await gotoHash(page, '#report-review?reportId=' + encodeURIComponent(reportId));
  await page.waitForSelector('#rw-workbench');

  for (const [w, h, suffix] of [[1024, 900, '1024'], [390, 844, '390']]) {
    await screenshot(page, `report-review-${suffix}`, w, h);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  metrics = await layoutMetrics(page);
  assertOk(!metrics.horizontalOverflow, 'no horizontal overflow report-review @1440');

  // mobile drawer open/close
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const toggle = page.locator('#sider-toggle');
  const sider = page.locator('#admin-sider');
  const mask = page.locator('#sider-mask');

  await toggle.click();
  await page.waitForTimeout(350);
  const openState = await page.evaluate(() => ({
    siderOpen: document.getElementById('admin-sider').classList.contains('is-open'),
    maskVisible: document.getElementById('sider-mask').classList.contains('is-visible'),
    bodyOpen: document.body.classList.contains('ant-sider-open')
  }));
  assertOk(openState.siderOpen && openState.maskVisible, 'mobile drawer opens on toggle click');
  await screenshot(page, 'report-review-390-drawer-open', 390, 844);

  await mask.click({ position: { x: 340, y: 400 }, force: false });
  await page.waitForTimeout(350);
  const closedState = await page.evaluate(() => ({
    siderOpen: document.getElementById('admin-sider').classList.contains('is-open'),
    maskVisible: document.getElementById('sider-mask').classList.contains('is-visible')
  }));
  assertOk(!closedState.siderOpen && !closedState.maskVisible, 'mobile drawer closes on mask click');
  await screenshot(page, 'report-review-390-drawer-closed', 390, 844);

  // tab close with dirty confirm (fresh navigation after mobile flow)
  await gotoHash(page, '#report-review?reportId=' + encodeURIComponent(reportId));
  await page.waitForSelector('#rw-workbench');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.click('#rw-module-nav [data-module-id="assessment"]');
  await page.waitForSelector('#assess-score');
  assertOk(!(await page.isDisabled('#assess-score')), 'assess-score editable for dirty tab test');

  const originalScore = await page.inputValue('#assess-score');
  const newScore = String((Number(originalScore) || 0) + 1);
  await page.locator('#assess-score').click();
  await page.fill('#assess-score', newScore);
  await page.waitForTimeout(300);

  const tabMeta = await page.evaluate((rid) => {
    const S = window.PetAdminSession;
    const tab = S.findTabByKey(S.buildTabKey('report-review', { reportId: rid }));
    return { tabId: tab && tab.id, dirty: !!(tab && tab.dirty) };
  }, reportId);
  assertRequired(tabMeta.dirty && tabMeta.tabId, 'report-review tab marked dirty');

  await page.waitForSelector(`#admin-tabbar .admin-tab[data-tab-id="${tabMeta.tabId}"] .admin-tab-close`);
  async function closeDirtyTabViaLocator(tabId, accept) {
    await Promise.all([
      page.waitForEvent('dialog', { timeout: 10000 }).then((d) => (accept ? d.accept() : d.dismiss())),
      page.evaluate((id) => {
        const btn = document.querySelector(`#admin-tabbar .admin-tab[data-tab-id="${id}"] .admin-tab-close`);
        if (!btn) throw new Error('tab close not found: ' + id);
        btn.click();
      }, tabId)
    ]);
  }

  await closeDirtyTabViaLocator(tabMeta.tabId, false);
  const tabStill = await page.locator(`#admin-tabbar .admin-tab[data-tab-id="${tabMeta.tabId}"]`).count();
  assertOk(tabStill === 1, 'dirty tab close dismiss keeps tab');

  const tabMetaFresh = await page.evaluate((rid) => {
    const S = window.PetAdminSession;
    const tab = S.findTabByKey(S.buildTabKey('report-review', { reportId: rid }));
    return { tabId: tab && tab.id, dirty: !!(tab && tab.dirty) };
  }, reportId);
  assertOk(tabMetaFresh.tabId, 'dirty tab still present before confirm close');

  await closeDirtyTabViaLocator(tabMetaFresh.tabId, true);
  await page.waitForFunction(
    (rid) => {
      const S = window.PetAdminSession;
      return !S.findTabByKey(S.buildTabKey('report-review', { reportId: rid }));
    },
    reportId,
    { timeout: 10000 }
  );
  assertOk(true, 'dirty tab close accept removes tab');

  const report = {
    timestamp: new Date().toISOString(),
    base,
    passed: results.passed,
    failed: results.failed,
    consoleErrors: results.consoleErrors,
    pageErrors: results.pageErrors,
    tabCloseNote: 'dirty 页签：renderTabbar 重建后 Playwright locator.click/dispatchEvent 无法稳定触发 native confirm；evaluate(btn.click()) 可验证关闭逻辑；无 dirty 时 locator.click 正常',
    ok: results.failed.length === 0
  };
  fs.writeFileSync(path.join(outDir, 'shell-repair-report.json'), JSON.stringify(report, null, 2));

  await browser.close();

  console.log('Passed:', results.passed.length);
  console.log('Failed:', results.failed.length);
  results.failed.forEach((f) => console.error('  FAIL:', f));
  if (results.failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  try {
    const report = {
      timestamp: new Date().toISOString(),
      base,
      passed: results.passed,
      failed: results.failed.concat([String(err.message || err)]),
      consoleErrors: results.consoleErrors,
      pageErrors: results.pageErrors,
      ok: false
    };
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'shell-repair-report.json'), JSON.stringify(report, null, 2));
  } catch (_e) { /* ignore */ }
  process.exit(1);
});
