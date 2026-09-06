#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');

var root = path.resolve(__dirname, '../../../..');
var outDir = path.join(__dirname, 'screenshots');
var testHtml = path.join(__dirname, 'basic-table-modal-test.html');
var reportPath = path.join(__dirname, 'test-results.json');

fs.mkdirSync(outDir, { recursive: true });

var base = 'http://127.0.0.1:8765/.impeccable/review/pet-eden-admin-20260905/components/basic-table-modal-test.html';

function assert(condition, message, results) {
  if (!condition) {
    results.failed.push(message);
    throw new Error(message);
  }
  results.passed.push(message);
}

async function waitForRows(page, minCount, timeout) {
  await page.waitForFunction(function (n) {
    var rows = document.querySelectorAll('#table-a tbody tr[data-row-key]');
    return rows.length >= n;
  }, minCount, { timeout: timeout || 8000 });
}

async function runAssertions(page, results) {
  await page.waitForFunction(function () { return window.__componentTest && window.__componentTest.apiA; });
  await waitForRows(page, 1);

  // Search
  await page.fill('#rondo-search-component-test-a-keyword', 'Alpha');
  await page.click('[data-search="submit"]');
  await page.waitForFunction(function () {
    return document.querySelectorAll('#table-a tbody tr[data-row-key]').length === 1;
  });
  assert(await page.locator('#table-a tbody tr[data-row-key] td').first().textContent() === 'Alpha', 'search filters rows', results);

  // Reset
  await page.click('[data-search="reset"]');
  await waitForRows(page, 10);
  assert((await page.locator('#table-a tbody tr[data-row-key]').count()) >= 10, 'reset restores rows', results);

  // Pagination
  await page.click('#table-a .rondo-pagination-next');
  await page.waitForFunction(function () {
    return document.querySelector('#table-a .rondo-pagination-item.is-active')?.textContent === '2';
  });
  assert(await page.textContent('#table-a .rondo-pagination-item.is-active') === '2', 'pagination next', results);

  // Hide column
  await page.click('#table-a [aria-label="列配置"]');
  await page.locator('#table-a .rondo-column-config-panel input[data-col-key="status"]').setChecked(false);
  await page.waitForFunction(function () {
    return !document.querySelector('#table-a thead th')?.textContent.includes('状态');
  });
  assert(!(await page.textContent('#table-a thead'))?.includes('状态'), 'column hidden', results);
  await page.click('#table-a .rondo-list-toolbar');
  await page.waitForFunction(function () {
    var panel = document.querySelector('#table-a .rondo-column-config-panel');
    return !panel || panel.hidden;
  });

  // Fullscreen
  await page.click('#table-a .rondo-basic-table-card-tools [aria-label="全屏"]');
  assert(await page.locator('#table-a .rondo-basic-table-wrap.is-fullscreen').count() === 1, 'fullscreen on', results);
  await page.click('#table-a .rondo-basic-table-card-tools [aria-label="退出全屏"]');
  assert(await page.locator('#table-a .rondo-basic-table-wrap.is-fullscreen').count() === 0, 'fullscreen off', results);

  // Error + retry
  await page.click('#btn-force-error');
  await page.waitForSelector('#table-a [data-table-retry]');
  assert((await page.textContent('#table-a .rondo-basic-table-error-text')).includes('失败'), 'error state shown', results);
  await page.evaluate(function () { window.__componentTest.setForceError(false); });
  await page.click('#table-a [data-table-retry]');
  await waitForRows(page, 1);
  assert((await page.locator('#table-a tbody tr[data-row-key]').count()) >= 1, 'retry after error', results);

  // Race: slow then fast — fast wins
  await page.click('[data-search="reset"]');
  await waitForRows(page, 10);
  await page.evaluate(function () { window.__componentTest.setRaceMode('slow'); });
  await page.click('#btn-race-slow');
  await page.evaluate(function () { window.__componentTest.setRaceMode('fast'); });
  await page.click('#btn-race-fast');
  await page.waitForTimeout(400);
  await waitForRows(page, 10, 10000);
  var rowCountAfterRace = await page.locator('#table-a tbody tr[data-row-key]').count();
  assert(rowCountAfterRace >= 10, 'race: fast response wins (' + rowCountAfterRace + ' rows)', results);

  // Tab ownership: write on tab A, switch to B, verify A state unchanged on tab object
  await page.evaluate(function () {
    var t = window.__componentTest;
    t.apiA.setFilters({ keyword: 'Beta' });
    t.apiA.reload();
  });
  await page.waitForFunction(function () {
    return document.querySelectorAll('#table-a tbody tr[data-row-key]').length === 1;
  });
  var tabAState = await page.evaluate(function () {
    return window.__componentTest.getTabState(window.__componentTest.tabA.id, 'component-test-a');
  });
  assert(tabAState && tabAState.filters.keyword === 'Beta', 'tab A state saved on owner tab', results);

  await page.click('#btn-switch-tab');
  var tabBState = await page.evaluate(function () {
    return window.__componentTest.getTabState(window.__componentTest.tabB.id, 'component-test-b');
  });
  assert(!tabBState || !tabBState.filters || tabBState.filters.keyword !== 'Beta', 'tab B state independent', results);

  await page.click('#btn-switch-tab');
  var tabAStateAgain = await page.evaluate(function () {
    return window.__componentTest.getTabState(window.__componentTest.tabA.id, 'component-test-a');
  });
  assert(tabAStateAgain && tabAStateAgain.filters.keyword === 'Beta', 'tab A state persists after switch', results);

  // Modal keyboard + fail retain
  await page.click('#btn-open-fail-modal');
  await page.waitForSelector('.rondo-modal');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  var focusedTag = await page.evaluate(function () { return document.activeElement.getAttribute('data-action'); });
  assert(focusedTag === 'ok' || focusedTag === 'cancel', 'modal focus trap cycles', results);

  await page.click('.rondo-modal [data-action="ok"]');
  await page.waitForTimeout(300);
  assert(await page.locator('.rondo-modal').count() === 1, 'modal stays open on fail', results);
  assert(await page.inputValue('#modal-fail-input') === '保留文本', 'modal retains input on fail', results);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // dirty confirm may appear — accept if present
  var confirmOk = page.locator('.rondo-modal [data-action="ok"]');
  if (await confirmOk.count()) {
    await confirmOk.last().click();
  }
  await page.waitForSelector('.rondo-modal', { state: 'detached', timeout: 3000 }).catch(function () {});
}

async function ensureServer() {
  var http = require('http');
  var serveRoot = root;
  var existing = await new Promise(function (resolve) {
    var req = http.get('http://127.0.0.1:8765/', function (res) {
      res.resume();
      resolve(true);
    });
    req.on('error', function () { resolve(false); });
    req.setTimeout(1500, function () { req.destroy(); resolve(false); });
  });
  if (existing) return { close: function () {} };

  var server = http.createServer(function (req, res) {
    var urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    var filePath = path.join(serveRoot, urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, ''));
    if (!filePath.startsWith(serveRoot)) {
      res.writeHead(403); res.end(); return;
    }
    fs.readFile(filePath, function (err, data) {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      var ext = path.extname(filePath);
      var types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise(function (resolve, reject) {
    server.on('error', reject);
    server.listen(8765, '127.0.0.1', resolve);
  });
  return server;
}
async function main() {
  var server = await ensureServer();
  var results = { passed: [], failed: [], consoleErrors: [], failedResources: [], screenshots: [] };

  try {
    var pw = require('playwright');
    var browser = await pw.chromium.launch({ channel: 'chrome', headless: true });

    for (var i = 0; i < 2; i++) {
      var width = i === 0 ? 1440 : 390;
      var page = await browser.newPage({ viewport: { width: width, height: 900 } });
      page.on('console', function (msg) {
        if (msg.type() === 'error') {
          var text = msg.text();
          if (/Failed to load resource|favicon/i.test(text)) return;
          results.consoleErrors.push(width + ': ' + text);
        }
      });
      page.on('response', function (res) {
        var url = res.url();
        if (res.status() === 404 && url.indexOf('favicon') < 0) {
          results.consoleErrors.push(width + ': 404 ' + url);
        }
      });
      page.on('pageerror', function (err) {
        results.consoleErrors.push(width + ' pageerror: ' + err.message);
      });
      page.on('requestfailed', function (req) {
        results.failedResources.push(width + ': ' + req.url());
      });

      await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(500);

      if (width === 1440) {
        await runAssertions(page, results);
      }

      var shot = path.join(outDir, 'component-test-' + width + '.png');
      await page.screenshot({ path: shot, fullPage: true });
      results.screenshots.push(shot);
      await page.close();
    }

    await browser.close();
  } finally {
    server.close();
  }

  results.capturedAt = new Date().toISOString();
  results.ok = results.failed.length === 0 && results.consoleErrors.length === 0;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log('passed:', results.passed.length);
  console.log('failed:', results.failed.length);
  results.passed.forEach(function (m) { console.log('  ✓', m); });
  results.failed.forEach(function (m) { console.log('  ✗', m); });
  if (results.consoleErrors.length) {
    console.error('console errors:', results.consoleErrors.length);
    results.consoleErrors.forEach(function (e) { console.error(' ', e); });
  }

  process.exit(results.ok ? 0 : 1);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
