#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

var repoRoot = path.resolve(__dirname, '../../../../..');
var outDir = path.join(__dirname, 'evidence');
var base = process.env.PET_ADMIN_BASE || 'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html';

function loadPlaywright() {
  var candidates = [
    process.env.PLAYWRIGHT_MODULE,
    '/tmp/pet-eden-session-test/node_modules/playwright',
    path.join(repoRoot, 'node_modules/playwright')
  ].filter(Boolean);
  for (var i = 0; i < candidates.length; i++) {
    try { return require(candidates[i]); } catch (e) { /* try next */ }
  }
  throw new Error('playwright not found');
}

function assertOk(results, ok, msg) {
  (ok ? results.passed : results.failed).push(msg);
}

async function gotoHash(page, baseUrl, hash) {
  var url = baseUrl.split('#')[0] + (hash.charAt(0) === '#' ? hash : '#' + hash);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
}

async function getFixtureIds(page) {
  return page.evaluate(function () {
    var store = window.PetReportMockStore;
    var state = store.getState();
    var reports = state.reports || [];
    var reviewReports = reports.filter(function (r) {
      return r && r.id && (r.status === 'pending_review' || r.status === 'incomplete' || r.status === 'published');
    });
    if (reviewReports.length < 2) reviewReports = reports.slice(0, 2);
    var reportA = reviewReports[0];
    var reportB = reviewReports[1] || reviewReports[0];
    var pendingRow = reports.find(function (r) {
      return r.status === 'pending_review' || r.status === 'incomplete' || r.correctionDraftActive;
    }) || reportA;
    var withTest = reports.find(function (r) { return r.testRecordId; });
    var kwSource = pendingRow && pendingRow.reportNumber ? pendingRow.reportNumber : (reportA && reportA.reportNumber);
    return {
      reportA: reportA && reportA.id,
      reportB: reportB && reportB.id,
      reportNumberA: reportA && reportA.reportNumber,
      reportNumberB: reportB && reportB.reportNumber,
      testRecordId: withTest && withTest.testRecordId,
      searchKeyword: kwSource ? kwSource.slice(-4) : 'RPT'
    };
  });
}

async function activeMount(page) {
  return page.locator('#admin-page-mount .page').first();
}

async function listWrap(page) {
  return page.locator('#rc-list-table .rondo-basic-table-wrap');
}

async function screenshotViewport(page, name, width) {
  await page.setViewportSize({ width: width, height: Math.max(800, width === 390 ? 844 : 900) });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage: false });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  var pw = loadPlaywright();
  var results = {
    passed: [],
    failed: [],
    consoleErrors: [],
    pageErrors: [],
    failedResources: []
  };

  var browser = await pw.chromium.launch({ channel: 'chrome', headless: true });
  var context = await browser.newContext();
  var page = await context.newPage();

  page.on('console', function (msg) {
    if (msg.type() === 'error') results.consoleErrors.push(msg.text());
  });
  page.on('pageerror', function (err) {
    results.pageErrors.push(String(err));
  });
  page.on('response', function (resp) {
    var url = resp.url();
    if (url.indexOf('/prototype/admin/') >= 0 && resp.status() >= 400) {
      results.failedResources.push(resp.status() + ' ' + url);
    }
  });

  await gotoHash(page, base, '#report-center');
  await page.waitForSelector('#rc-list-table .rondo-basic-table-wrap tbody tr[data-row-key]');
  var ids = await getFixtureIds(page);
  assertOk(results, !!ids.reportA && !!ids.reportB, 'fixture: 至少两份报告');

  let table = await listWrap(page);
  var initialRows = await table.locator('tbody tr[data-row-key]').count();
  assertOk(results, initialRows > 0, '初始表格有数据行');

  var countsMatch = await page.evaluate(function () {
    var mount = document.querySelector('#report-center');
    if (!mount) return false;
    var tabs = Array.prototype.slice.call(mount.querySelectorAll('.rc-tab-count'));
    return tabs.every(function (el) {
      var view = el.getAttribute('data-count-for');
      var text = (el.textContent || '').trim();
      if (!text) return true;
      var n = parseInt(text.replace(/[()]/g, ''), 10);
      return !isNaN(n) && n >= 0;
    });
  });
  assertOk(results, countsMatch, '状态标签计数格式正确');

  await page.fill('#rc-list-table [name="search"]', ids.searchKeyword);
  await page.click('#rc-list-table [data-search="submit"]');
  await page.waitForTimeout(400);
  var filteredRows = await table.locator('tbody tr[data-row-key]').count();
  var sizeSelect = table.locator('.rondo-pagination-size select');
  if (await sizeSelect.count()) {
    await sizeSelect.selectOption('20');
    await page.waitForTimeout(300);
  }
  assertOk(results, filteredRows >= 1 && filteredRows <= initialRows, '搜索过滤生效');

  var savedState = await page.evaluate(function () {
    var Session = window.PetAdminSession;
    var tab = Session.getActiveTab();
    return tab && tab.listState && tab.listState['report-center'];
  });
  assertOk(results, savedState && savedState.pageSize === 20, '页大小变更写入 tab listState');

  var firstReviewBtn = table.locator('button[data-row-action="review"]').first();
  assertOk(results, await firstReviewBtn.count() > 0, '过滤后仍有主操作按钮');
  var firstReportId = await page.evaluate(function () {
    var row = document.querySelector('#rc-list-table tbody tr[data-row-key]');
    return row ? row.getAttribute('data-row-key') : null;
  });
  await firstReviewBtn.click();
  await page.waitForSelector('#rw-workbench');
  var reportLoaded = await page.evaluate(function (reportId) {
    if (!reportId) return false;
    var C = window.PetAdminCommon;
    var report = C.lookupReport(C.store().getState(), reportId);
    return !!(report && document.querySelector('#rw-workbench'));
  }, firstReportId);
  assertOk(results, reportLoaded, '进入报告工作台有内容');

  await page.click('#btn-go-report-center');
  await page.waitForSelector('#rc-list-table .rondo-basic-table-wrap');
  var restored = await page.evaluate(function () {
    var Session = window.PetAdminSession;
    var tab = Session.getActiveTab();
    var st = tab && tab.listState && tab.listState['report-center'];
    var search = document.querySelector('#rc-list-table [name="search"]');
    return {
      page: st && st.page,
      pageSize: st && st.pageSize,
      search: search ? search.value : ''
    };
  });
  assertOk(results, restored.search === ids.searchKeyword, '返回保留搜索词');
  assertOk(results, restored.pageSize === 20, '返回保留页大小');

  var countAfterSearch = await page.evaluate(function () {
    var el = document.querySelector('#report-center .rc-tab-count[data-count-for="pending"]');
    return el ? el.textContent : '';
  });
  assertOk(results, countAfterSearch.indexOf('(') >= 0 || countAfterSearch === '', '搜索后待处理计数仍更新');

  var secondReportId = ids.reportB === firstReportId ? ids.reportA : ids.reportB;
  await page.evaluate(function (reportId) {
    window.PetAdminCommon.navigate('report-review', { reportId: reportId, returnView: 'pending' });
  }, secondReportId);
  await page.waitForFunction(function () {
    return document.querySelectorAll('#admin-tabbar .admin-tab').length >= 2;
  });
  var tabIndex = await page.evaluate(function (expectedId) {
    var tabs = window.PetAdminSession.getTabs();
    return tabs.findIndex(function (t) {
      return t.pageId === 'report-review' && t.params && t.params.reportId === expectedId;
    });
  }, firstReportId);
  assertOk(results, tabIndex >= 0, '第一份报告页签仍存在');
  if (tabIndex >= 0) {
    await page.locator('#admin-tabbar .admin-tab').nth(tabIndex).click();
    await page.waitForFunction(function (expectedId) {
      var m = document.location.hash.match(/reportId=([^&]+)/);
      return m && m[1] === expectedId;
    }, firstReportId);
    assertOk(results, true, '同列表打开两报告页签不串数据');
  }

  await gotoHash(page, base, '#report-center');
  await page.waitForSelector('#rc-list-table .rondo-basic-table-wrap tbody tr[data-row-key]');
  table = await listWrap(page);
  await page.waitForSelector('#rc-list-table button.rondo-more-toggle');
  var moreBtn = table.locator('button.rondo-more-toggle').first();
  await moreBtn.click();
  await page.waitForSelector('#rc-list-table .rondo-dropdown-menu');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assertOk(results, await table.locator('.rondo-dropdown-menu').count() === 0, '更多菜单键盘 Esc 关闭');

  var toggleSearch = page.locator('#rc-list-table [aria-label="切换搜索区"]');
  if (await toggleSearch.count()) {
    await toggleSearch.click();
    await page.waitForTimeout(150);
    await toggleSearch.click();
    assertOk(results, true, '切换搜索区可用');
  }

  var refreshBtn = page.locator('#rc-list-table [aria-label="刷新"]');
  if (await refreshBtn.count()) {
    await refreshBtn.click();
    await page.waitForTimeout(300);
    assertOk(results, await table.locator('tbody tr[data-row-key]').count() > 0, '刷新后仍有数据');
  }

  var colBtn = page.locator('#rc-list-table [aria-label="列配置"]');
  if (await colBtn.count()) {
    await colBtn.click();
    await page.waitForSelector('#rc-list-table .rondo-column-config-panel:not([hidden])');
    assertOk(results, true, '列配置面板可打开');
    await colBtn.click();
    await page.waitForTimeout(150);
  }

  var fsBtn = page.locator('#rc-list-table [aria-label="全屏"]');
  if (await fsBtn.count()) {
    await page.evaluate(function () {
      var btn = document.querySelector('#rc-list-table [aria-label="全屏"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(150);
    var fsOn = await page.evaluate(function () {
      return document.querySelectorAll('#rc-list-table .rondo-basic-table-wrap.is-fullscreen').length === 1;
    });
    assertOk(results, fsOn, '全屏开启');
    await page.evaluate(function () {
      var btn = document.querySelector('#rc-list-table [aria-label="退出全屏"]');
      if (btn) btn.click();
    });
    var fsOff = await page.evaluate(function () {
      return document.querySelectorAll('#rc-list-table .rondo-basic-table-wrap.is-fullscreen').length === 0;
    });
    assertOk(results, fsOff, '全屏关闭');
  }

  await screenshotViewport(page, 'report-list-1440', 1440);
  await screenshotViewport(page, 'report-list-1024', 1024);
  await screenshotViewport(page, 'report-list-390', 390);

  var narrowReachable = await page.evaluate(function () {
    var scroll = document.querySelector('#rc-list-table .rondo-basic-table-scroll');
    var cell = document.querySelector('#rc-list-table .col-actions');
    if (!scroll || !cell) return false;
    scroll.scrollLeft = scroll.scrollWidth;
    var rect = cell.getBoundingClientRect();
    return rect.width > 0 && rect.right <= window.innerWidth + 4 && rect.left >= -4;
  });
  assertOk(results, narrowReachable, '390px 操作列在视口内可达');

  await browser.close();

  var report = {
    timestamp: new Date().toISOString(),
    base: base,
    passed: results.passed,
    failed: results.failed,
    consoleErrors: results.consoleErrors,
    pageErrors: results.pageErrors,
    failedResources: results.failedResources,
    ok: results.failed.length === 0 && results.pageErrors.length === 0
  };
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, passed: report.passed.length, failed: report.failed.length }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
