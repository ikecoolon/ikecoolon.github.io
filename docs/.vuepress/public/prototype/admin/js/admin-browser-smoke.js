#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');

var repoRoot = path.resolve(__dirname, '../../../../../..');
var harnessDir = path.join(repoRoot, '.impeccable/review/pet-eden-admin-20260905/browser-harness');
var paths = require(path.join(harnessDir, 'paths.js'));
var pwLoader = require(path.join(harnessDir, 'resolve-playwright.js'));
var contracts = require(path.join(harnessDir, 'page-contracts.js'));
var fixtureIdsMod = require(path.join(harnessDir, 'fixture-ids.js'));

var DEFAULT_BASE = 'http://127.0.0.1:8765/prototype/admin/index.html';
var DEFAULT_OUT = paths.defaultOutDir(repoRoot);

function printHelp() {
  console.log([
    'Pet Eden 管理端浏览器验收工具',
    '',
    '用法:',
    '  node admin-browser-smoke.js [选项]',
    '',
    '选项:',
    '  --base <url>       入口 URL（默认 ' + DEFAULT_BASE + '）',
    '  --out <dir>        输出目录（默认 .impeccable/.../browser-final）',
    '  --smoke-only       仅运行 harness 自检（路径/解析/最小加载）',
    '  --help             显示帮助',
    '',
    '环境变量:',
    '  PLAYWRIGHT_MODULE  指向已安装的 playwright 模块路径',
    '',
    '示例:',
    '  PLAYWRIGHT_MODULE="$HOME/.npm/_npx/420ff84f11983ee5/node_modules/playwright" \\',
    '    node admin-browser-smoke.js --smoke-only',
    '',
    '  PLAYWRIGHT_MODULE=... node admin-browser-smoke.js \\',
    '    --base http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html'
  ].join('\n'));
}

function parseArgs(argv) {
  var opts = {
    base: DEFAULT_BASE,
    out: DEFAULT_OUT,
    smokeOnly: false,
    help: false
  };
  for (var i = 2; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--smoke-only') opts.smokeOnly = true;
    else if (arg === '--base') opts.base = argv[++i];
    else if (arg === '--out') opts.out = path.resolve(argv[++i]);
    else throw new Error('未知参数: ' + arg);
  }
  return opts;
}

function assertOk(results, condition, message) {
  if (condition) {
    results.passed.push(message);
    return;
  }
  results.failed.push(message);
  throw new Error(message);
}

function softFail(results, condition, message) {
  if (condition) {
    results.passed.push(message);
  } else {
    results.failed.push(message);
  }
}

async function waitForStore(page, timeout) {
  await page.waitForFunction(function () {
    return window.PetReportMockStore && typeof window.PetReportMockStore.getState === 'function';
  }, { timeout: timeout || 30000 });
}

async function gotoHash(page, base, hash, timeout) {
  var target = hash.charAt(0) === '#' ? hash : '#' + hash;
  var baseUrl = base.split('#')[0];
  var needsLoad = !page.url().startsWith(baseUrl.split('?')[0]);
  if (needsLoad) {
    await page.goto(baseUrl + target, { waitUntil: 'domcontentloaded', timeout: timeout || 60000 });
  } else {
    await page.evaluate(function (h) {
      if (window.location.hash === h) return;
      var raw = h.replace(/^#/, '');
      var qIndex = raw.indexOf('?');
      var pageId = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
      var params = {};
      if (qIndex >= 0) {
        raw.slice(qIndex + 1).split('&').forEach(function (pair) {
          var kv = pair.split('=');
          if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        });
      }
      if (window.PetAdminCommon && window.PetAdminCommon.navigate) {
        window.PetAdminCommon.navigate(pageId, params);
      } else {
        window.location.hash = h;
      }
    }, target);
  }
  await waitForStore(page, timeout);
  await page.waitForFunction(function () {
    var title = document.getElementById('page-title');
    return title && title.textContent && title.textContent.trim().length > 0;
  }, { timeout: timeout || 30000 });
}

async function waitSelectors(page, selectors, timeout) {
  for (var i = 0; i < selectors.length; i++) {
    await page.waitForSelector(selectors[i], { state: 'visible', timeout: timeout || 15000 });
  }
}

async function dismissOpenModals(page) {
  for (var i = 0; i < 4; i++) {
    var roots = page.locator('.rondo-modal-root');
    if (!(await roots.count())) return;
    var root = roots.last();
    var cancel = root.locator('[data-action="cancel"]');
    if (await cancel.count()) {
      await cancel.click({ timeout: 2000 }).catch(function () {});
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(200);
    var confirm = page.locator('.rondo-modal-root').last();
    if (await confirm.count()) {
      await confirm.locator('[data-action="ok"]').click({ timeout: 2000 }).catch(function () {});
    }
    await page.waitForTimeout(200);
  }
}

async function collectIds(page) {
  return page.evaluate(new Function(fixtureIdsMod.extractFixtureIdsBody));
}

function trackPageEvents(page, bucket, label, baseOrigin) {
  page.on('console', function (msg) {
    if (msg.type() !== 'error') return;
    var loc = msg.location();
    bucket.consoleErrors.push({
      label: label,
      text: msg.text(),
      location: loc && loc.url ? loc.url : ''
    });
  });
  page.on('pageerror', function (err) {
    bucket.pageErrors.push({ label: label, text: err.message });
  });
  page.on('response', function (res) {
    var status = res.status();
    var url = res.url();
    if (status === 404 && /favicon\.ico/i.test(url)) {
      bucket.favicon404 = bucket.favicon404 || [];
      bucket.favicon404.push({ label: label, url: url, status: status });
      return;
    }
    if (status === 404 && contracts.isInternalPrototypeUrl(url, baseOrigin)) {
      bucket.internal404.push({ label: label, url: url, status: status });
    }
  });
  page.on('requestfailed', function (req) {
    var url = req.url();
    var failure = req.failure();
    var entry = {
      label: label,
      url: url,
      error: failure && failure.errorText,
      external: contracts.isExternalUrl(url)
    };
    bucket.failedResources.push(entry);
  });
}

async function checkOverflow(page, results, label) {
  var metrics = await page.evaluate(function () {
    var bodyOverflow = document.body.scrollWidth - document.body.clientWidth;
    var htmlOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    var tableScrolls = Array.prototype.slice.call(document.querySelectorAll('.rondo-basic-table-scroll')).map(function (el) {
      return {
        overflowX: el.scrollWidth - el.clientWidth,
        hasOverflowClass: el.scrollWidth > el.clientWidth + 1
      };
    });
    return {
      bodyOverflow: bodyOverflow,
      htmlOverflow: htmlOverflow,
      tableScrolls: tableScrolls
    };
  });
  var pageOverflow = Math.max(metrics.bodyOverflow, metrics.htmlOverflow);
  if (pageOverflow > 2) {
    var badTables = metrics.tableScrolls.filter(function (t) { return t.overflowX <= 1; });
    softFail(results, badTables.length === 0, label + ': 页面横向溢出且表格容器未承担滚动');
  } else {
    results.passed.push(label + ': 无整页横向溢出');
  }
}

async function assertNoInternalFailures(results, bucket, label) {
  if (bucket.pageErrors.length) {
    throw new Error(label + ': pageerror ' + bucket.pageErrors[0].text);
  }
  if (bucket.favicon404 && bucket.favicon404.length) {
    results.favicon404 = results.favicon404 || [];
    bucket.favicon404.forEach(function (entry) {
      results.favicon404.push(Object.assign({ phase: label }, entry));
    });
  }
  if (bucket.internal404.length) {
    throw new Error(label + ': 内部 404 ' + bucket.internal404[0].url);
  }
  var internalFails = bucket.failedResources.filter(function (r) { return !r.external; });
  var externalFails = bucket.failedResources.filter(function (r) { return r.external; });
  if (internalFails.length) {
    throw new Error(label + ': 内部资源加载失败 ' + internalFails[0].url);
  }
  results.externalFailures = results.externalFailures || [];
  externalFails.forEach(function (r) {
    results.externalFailures.push(Object.assign({ phase: label }, r));
  });
  var coreBroken = externalFails.some(function (r) {
    return /antd|reset\.css|tokens\.css|shell\.css|components\.css|mock-store\.js|admin-common\.js/i.test(r.url);
  });
  if (coreBroken) {
    throw new Error(label + ': 第三方 CDN 失败影响核心 UI: ' + externalFails[0].url);
  }
  if (bucket.consoleErrors.length) {
    var blocking = bucket.consoleErrors.filter(function (e) {
      if (/favicon/i.test(e.text) || /favicon/i.test(e.location || '')) return false;
      if (/Failed to load resource.*404/i.test(e.text) && /favicon\.ico/i.test(e.location || '')) return false;
      return true;
    });
    if (blocking.length) {
      var ignorable = blocking.every(function (e) {
        return /tailwind/i.test(e.text);
      });
      if (!ignorable) {
        throw new Error(label + ': console.error ' + blocking[0].text);
      }
    }
  }
}

async function runMenuLoads(page, base, results, ids) {
  for (var i = 0; i < contracts.MENU_PAGES.length; i++) {
    var item = contracts.MENU_PAGES[i];
    var bucket = { consoleErrors: [], pageErrors: [], internal404: [], failedResources: [] };
    trackPageEvents(page, bucket, item.pageId, new URL(base).origin);
    var hash = item.pageId === 'user-pets' ? '#user-pets?view=users' : '#' + item.pageId;
    await gotoHash(page, base, hash);
    await waitSelectors(page, item.selectors);
    var title = await page.textContent('#page-title');
    softFail(results, title.indexOf(item.title) >= 0, item.pageId + ': 页头标题包含「' + item.title + '」');
    var tableError = await page.locator('.rondo-basic-table-error').count();
    softFail(results, tableError === 0, item.pageId + ': 列表无错误态');
    await assertNoInternalFailures(results, bucket, item.pageId);
  }
}

async function runInternalRoutes(page, base, results, ids) {
  var routes = [
    { name: 'report-review-A', hash: '#report-review?reportId=' + encodeURIComponent(ids.reportA), selectors: ['#rw-workbench', '#rw-module-nav', '#rw-preview-pane', '#preview-content'], titlePart: '工作台' },
    { name: 'report-review-B', hash: '#report-review?reportId=' + encodeURIComponent(ids.reportB), selectors: ['#rw-workbench'], titlePart: '工作台' },
    { name: 'analysis-rules-edit', hash: '#analysis-rules?mode=edit&lineage=' + encodeURIComponent(ids.lineageId), selectors: ['#rules-form-view:not(.hidden)', '#form-threshold-value'], titlePart: '规则' },
    { name: 'analysis-rules-test', hash: '#analysis-rules?mode=test&lineage=' + encodeURIComponent(ids.lineageId), selectors: ['#section-test', '#test-report-select'], titlePart: '规则' },
    { name: 'user-detail', hash: '#user-pets?detail=user&id=' + encodeURIComponent(ids.userId), selectors: ['#up-user-detail:not(.hidden)'], titlePart: '用户' },
    { name: 'pet-detail', hash: '#user-pets?detail=pet&id=' + encodeURIComponent(ids.petId), selectors: ['#up-pet-detail:not(.hidden)'], titlePart: '宠物' }
  ];
  if (ids.schemeId) {
    routes.push({ name: 'normal-range-edit', hash: '#normal-range-config?edit=' + encodeURIComponent(ids.schemeId), selectors: ['#nrc-form-view:not(.hidden)'], titlePart: '参考范围' });
  }
  if (ids.dictItemId) {
    routes.push({ name: 'dictionary-edit', hash: '#dictionary-management?edit=' + encodeURIComponent(ids.dictItemId), selectors: ['.rondo-modal #dm-catalog-modal-form'], titlePart: '专业基础资料' });
  }
  if (ids.taxonKey) {
    routes.push({ name: 'microbiota-taxon', hash: '#microbiota-knowledge?taxon=' + encodeURIComponent(ids.taxonKey), selectors: ['#mk-editor'], titlePart: '菌群科普' });
  }

  routes.push(
    { name: 'legacy-customer-management', hash: '#customer-management', selectors: ['#up-seg-users'], titlePart: '用户与宠物' },
    { name: 'legacy-pet-information', hash: '#pet-information', selectors: ['#up-seg-pets'], titlePart: '用户与宠物' }
  );

  for (var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var bucket = { consoleErrors: [], pageErrors: [], internal404: [], failedResources: [] };
    trackPageEvents(page, bucket, route.name, new URL(base).origin);
    await gotoHash(page, base, route.hash);
    await waitSelectors(page, route.selectors);
    await assertNoInternalFailures(results, bucket, route.name);
    results.passed.push(route.name + ': 内部路由已加载');
  }
  await dismissOpenModals(page);
}

async function runListInteractions(page, base, results, ids) {
  await dismissOpenModals(page);
  await gotoHash(page, base, '#report-center');
  var listRoot = page.locator('#rc-list-table');
  var table = listRoot.locator('.rondo-basic-table-wrap').first();
  await table.waitFor({ state: 'visible' });
  var initialRows = await table.locator('tbody tr[data-row-key]').count();
  assertOk(results, initialRows > 0, 'report-center: 初始表格有数据行');

  await page.fill('#rc-list-table [name="search"]', ids.reportSearchKeyword || 'RPT');
  await page.click('#rc-list-table [data-search="submit"]');
  await page.waitForTimeout(400);
  var filtered = await table.locator('tbody tr[data-row-key]').count();
  assertOk(results, filtered >= 1 && filtered <= initialRows, 'report-center: 搜索过滤生效');

  await page.click('#rc-list-table [data-search="reset"]');
  await page.waitForTimeout(400);
  var resetRows = await table.locator('tbody tr[data-row-key]').count();
  assertOk(results, resetRows >= initialRows, 'report-center: 重置恢复行数');

  var nextBtn = table.locator('.rondo-pagination-next');
  if (await nextBtn.count() && !(await nextBtn.isDisabled())) {
    await nextBtn.click();
    await page.waitForFunction(function () {
      var active = document.querySelector('#rc-list-table .rondo-pagination-item.is-active');
      return active && active.textContent.trim() === '2';
    });
    assertOk(results, true, 'report-center: 分页下一页');
    await table.locator('.rondo-pagination-prev').click();
  } else {
    results.passed.push('report-center: 数据不足一页，跳过分页');
  }

  var colBtn = listRoot.locator('[aria-label="列配置"]');
  if (await colBtn.count()) {
    await colBtn.click();
    var panel = listRoot.locator('.rondo-column-config-panel');
    await panel.waitFor({ state: 'visible' });
    var toggleCheckbox = panel.locator('input[data-col-key]:not(:disabled)').first();
    if (!(await toggleCheckbox.count())) {
      toggleCheckbox = panel.locator('input[data-col-key="status"]');
    }
    var wasChecked = await toggleCheckbox.isChecked();
    await toggleCheckbox.setChecked(!wasChecked);
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden', timeout: 3000 }).catch(function () {
      return colBtn.click();
    });
    assertOk(results, true, 'report-center: 列配置可切换');
  }

  var fsBtn = listRoot.locator('.rondo-basic-table-card-tools [aria-label="全屏"]');
  if (await fsBtn.count()) {
    await fsBtn.click();
    assertOk(results, await listRoot.locator('.rondo-basic-table-wrap.is-fullscreen').count() === 1, 'report-center: 全屏开启');
    await listRoot.locator('.rondo-basic-table-card-tools [aria-label="退出全屏"]').click();
    assertOk(results, await listRoot.locator('.rondo-basic-table-wrap.is-fullscreen').count() === 0, 'report-center: 全屏关闭');
  } else {
    results.passed.push('report-center: 无全屏工具，跳过');
  }
}

async function runUserPetsSwitch(page, base, results) {
  await gotoHash(page, base, '#user-pets?view=users');
  await page.click('#up-seg-pets');
  await page.waitForSelector('#up-pets-list-mount:not(.hidden) .rondo-basic-table-wrap');
  assertOk(results, await page.locator('#up-pets-list-mount tbody tr[data-row-key]').count() > 0, 'user-pets: 宠物视图可见');

  await page.click('#up-seg-users');
  await page.waitForSelector('#up-users-list-mount:not(.hidden) .rondo-basic-table-wrap');
  assertOk(results, await page.locator('#up-users-list-mount tbody tr[data-row-key]').count() > 0, 'user-pets: 用户视图可切回');
}

async function runRuleEditRoundtrip(page, base, results, ids) {
  await gotoHash(page, base, '#analysis-rules?mode=edit&lineage=' + encodeURIComponent(ids.lineageId));
  await page.waitForSelector('#form-threshold-value');
  var original = await page.inputValue('#form-threshold-value');
  var marker = original === '7.77' ? '7.78' : '7.77';
  if (!(await page.isChecked('#form-threshold-enabled'))) {
    await page.check('#form-threshold-enabled');
  }
  await page.fill('#form-threshold-value', marker);
  await page.click('#tab-test');
  await page.waitForSelector('#section-test:not(.hidden)');
  await page.click('#ar-back-to-edit');
  await page.waitForSelector('#rules-form-view:not(.hidden)');
  var restored = await page.inputValue('#form-threshold-value');
  assertOk(results, restored === marker, 'analysis-rules: 编辑→测试→返回保留候选阈值');
}

async function runReportTabIsolation(page, base, results, ids) {
  await gotoHash(page, base, '#report-review?reportId=' + encodeURIComponent(ids.reportA));
  await page.waitForSelector('#rw-workbench');

  var tabIds = await page.evaluate(function (payload) {
    var S = window.PetAdminSession;
    var C = window.PetAdminCommon;
    var state = C.store().getState();
    var tabA = S.findTabByKey(S.buildTabKey('report-review', { reportId: payload.reportA }));
    window.PetAdminCommon.navigate('report-review', { reportId: payload.reportB });
    var tabB = S.findTabByKey(S.buildTabKey('report-review', { reportId: payload.reportB }));
    var reportA = C.lookupReport(state, payload.reportA);
    var reportB = C.lookupReport(state, payload.reportB);
    return {
      tabA: tabA && tabA.id,
      tabB: tabB && tabB.id,
      numberA: reportA && reportA.reportNumber,
      numberB: reportB && reportB.reportNumber
    };
  }, { reportA: ids.reportA, reportB: ids.reportB });

  assertOk(results, !!(tabIds.tabA && tabIds.tabB), 'report-review: 两个报告页签已打开');

  await page.evaluate(function (tabId) {
    window.PetAdminSession.activateTab(tabId);
  }, tabIds.tabA);
  await page.waitForSelector('#rw-workbench');
  var activeA = await page.evaluate(function (expected) {
    var C = window.PetAdminCommon;
    var tab = window.PetAdminSession.getActiveTab();
    var reportId = tab && tab.params && tab.params.reportId;
    var report = reportId ? C.lookupReport(C.store().getState(), reportId) : null;
    return report && report.reportNumber;
  }, tabIds.numberA);
  assertOk(results, activeA === tabIds.numberA, 'report-review: 页签 A 上下文');

  await page.evaluate(function (tabId) {
    window.PetAdminSession.activateTab(tabId);
  }, tabIds.tabB);
  await page.waitForSelector('#rw-workbench');
  var activeB = await page.evaluate(function () {
    var C = window.PetAdminCommon;
    var tab = window.PetAdminSession.getActiveTab();
    var reportId = tab && tab.params && tab.params.reportId;
    var report = reportId ? C.lookupReport(C.store().getState(), reportId) : null;
    return report && report.reportNumber;
  });
  assertOk(results, activeB === tabIds.numberB && activeB !== tabIds.numberA, 'report-review: 两个报告页签记录隔离');
}

async function clickTabClose(page, tabId) {
  await page.evaluate(function (id) {
    var btn = document.querySelector('#admin-tabbar .admin-tab[data-tab-id="' + id + '"] .admin-tab-close');
    if (!btn) throw new Error('未找到页签关闭按钮: ' + id);
    btn.click();
  }, tabId);
}

async function runDirtyCloseFlow(page, base, results, ids) {
  await gotoHash(page, base, '#report-review?reportId=' + encodeURIComponent(ids.editableReport));
  await page.click('#rw-module-nav [data-module-id="assessment"]');
  await page.waitForSelector('#assess-score');
  assertOk(results, !(await page.isDisabled('#assess-score')), 'report-review: 可编辑报告 assess-score 未禁用');

  var originalScore = await page.inputValue('#assess-score');
  var newScore = '77';
  if (originalScore === '77') newScore = '76';
  else if (originalScore === '76') newScore = '75';
  await page.fill('#assess-score', newScore);

  var tabMeta = await page.evaluate(function (reportId) {
    var S = window.PetAdminSession;
    var tab = S.findTabByKey(S.buildTabKey('report-review', { reportId: reportId }));
    return { tabId: tab && tab.id, dirty: !!(tab && tab.dirty) };
  }, ids.editableReport);
  assertOk(results, tabMeta.dirty && tabMeta.tabId, 'report-review: 目标页签已标记 dirty');

  var tab = page.locator('#admin-tabbar .admin-tab[data-tab-id="' + tabMeta.tabId + '"]');
  await Promise.all([
    page.waitForEvent('dialog').then(function (dialog) { return dialog.dismiss(); }),
    clickTabClose(page, tabMeta.tabId)
  ]);
  assertOk(results, await tab.count() === 1, 'report-review: dirty 关闭取消保留页签');
  assertOk(results, (await page.inputValue('#assess-score')) === newScore, 'report-review: 取消关闭后输入保留');

  await Promise.all([
    page.waitForEvent('dialog').then(function (dialog) { return dialog.accept(); }),
    clickTabClose(page, tabMeta.tabId)
  ]);
  await page.waitForFunction(function (reportId) {
    var S = window.PetAdminSession;
    return !S.findTabByKey(S.buildTabKey('report-review', { reportId: reportId }));
  }, ids.editableReport);
  assertOk(results, true, 'report-review: dirty 关闭确认可离开');
}

async function runRegisterCancelNoData(page, base, results, ids) {
  await dismissOpenModals(page);
  var before = await page.evaluate(function () {
    var st = window.PetReportMockStore.getState();
    return { pets: (st.pets || []).length, records: (st.testRecords || []).length };
  });
  await gotoHash(page, base, '#detection-records?action=register');
  await page.waitForSelector('.rondo-modal-root');
  var regModal = page.locator('.rondo-modal-root').last();
  await regModal.locator('input[name="dr-reg-mode"][value="new"]').click();
  await page.fill('#dr-reg-phone', '13900001234');
  await page.fill('#dr-reg-pet-name', '验收取消测试宠');
  await dismissOpenModals(page);
  await page.waitForSelector('.rondo-modal-root', { state: 'detached', timeout: 5000 });
  var after = await page.evaluate(function () {
    var st = window.PetReportMockStore.getState();
    return { pets: (st.pets || []).length, records: (st.testRecords || []).length };
  });
  assertOk(results, after.pets === before.pets && after.records === before.records,
    'detection-records: 登记取消不新增宠物与送检记录');
}

async function captureScreenshots(page, base, outDir, results) {
  var shots = [
    { name: 'report-center', hash: '#report-center' },
    { name: 'detection-records', hash: '#detection-records' },
    { name: 'user-pets', hash: '#user-pets?view=users' },
    { name: 'analysis-rules-edit', hash: '#analysis-rules?mode=edit&lineage=' + encodeURIComponent(results.fixture.lineageId) },
    { name: 'report-review', hash: '#report-review?reportId=' + encodeURIComponent(results.fixture.reportA) }
  ];
  results.screenshots = [];
  for (var v = 0; v < contracts.VIEWPORTS.length; v++) {
    var vp = contracts.VIEWPORTS[v];
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (var s = 0; s < shots.length; s++) {
      var shot = shots[s];
      await gotoHash(page, base, shot.hash);
      await page.waitForTimeout(400);
      await checkOverflow(page, results, shot.name + '@' + vp.name);
      var file = path.join(outDir, shot.name + '-' + vp.name + '.png');
      await page.screenshot({ path: file, fullPage: false });
      results.screenshots.push(file);
    }
  }
}

async function runSmokeOnly(opts, results) {
  assertOk(results, fs.existsSync(harnessDir), 'harness 目录存在: ' + harnessDir);
  var expectedDefaultOut = paths.defaultOutDir(repoRoot);
  assertOk(results, expectedDefaultOut.indexOf(path.join(repoRoot, '.impeccable')) === 0, '默认输出目录位于 .impeccable 下');
  assertOk(results, path.resolve(DEFAULT_OUT) === path.resolve(expectedDefaultOut), '默认 --out 解析到 browser-final');
  var mod = pwLoader.resolvePlaywrightModule();
  assertOk(results, !!mod, 'playwright 模块可解析: ' + (mod || '(未设置 PLAYWRIGHT_MODULE)'));
  var pw = pwLoader.loadPlaywright();
  assertOk(results, !!pw.chromium, 'playwright.chromium 可用');

  var reachable = await new Promise(function (resolve) {
    var req = http.get(opts.base.split('#')[0], function (res) {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', function () { resolve(false); });
    req.setTimeout(5000, function () { req.destroy(); resolve(false); });
  });
  assertOk(results, reachable, '入口 URL 可访问: ' + opts.base);

  var browser = await pw.chromium.launch({ channel: 'chrome', headless: true });
  var context = await browser.newContext();
  var page = await context.newPage();
  var bucket = { consoleErrors: [], pageErrors: [], internal404: [], failedResources: [] };
  trackPageEvents(page, bucket, 'smoke', new URL(opts.base).origin);
  await gotoHash(page, opts.base, '#report-center');
  var ids = await collectIds(page);
  assertOk(results, ids.ok, 'MockStore fixture ID 可读取');
  await browser.close();
  results.fixture = ids;
}

async function runFullSuite(opts, results) {
  fs.mkdirSync(opts.out, { recursive: true });
  var pw = pwLoader.loadPlaywright();
  var browser = await pw.chromium.launch({ channel: 'chrome', headless: true });
  try {
    var context = await browser.newContext();
    var page = await context.newPage();

    await gotoHash(page, opts.base, '#report-center');
    var ids = await collectIds(page);
    if (!ids.ok || !ids.reportA || !ids.reportB || !ids.editableReport || !ids.lineageId) {
      throw new Error('fixture ID 不完整: ' + JSON.stringify(ids));
    }
    results.fixture = ids;

    await runMenuLoads(page, opts.base, results, ids);
    await runInternalRoutes(page, opts.base, results, ids);
    await runListInteractions(page, opts.base, results, ids);
    await runUserPetsSwitch(page, opts.base, results);
    await runRuleEditRoundtrip(page, opts.base, results, ids);
    await runReportTabIsolation(page, opts.base, results, ids);
    await runDirtyCloseFlow(page, opts.base, results, ids);
    await runRegisterCancelNoData(page, opts.base, results, ids);
    await captureScreenshots(page, opts.base, opts.out, results);
  } finally {
    await browser.close().catch(function () {});
  }
}

async function main() {
  var opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  fs.mkdirSync(opts.out, { recursive: true });
  var results = {
    base: opts.base,
    out: opts.out,
    smokeOnly: opts.smokeOnly,
    passed: [],
    failed: [],
    externalFailures: [],
    capturedAt: new Date().toISOString()
  };

  try {
    if (opts.smokeOnly) {
      await runSmokeOnly(opts, results);
    } else {
      await runFullSuite(opts, results);
    }
  } catch (err) {
    if (err.message && results.failed.indexOf(err.message) < 0) {
      results.failed.push(err.message);
    }
    results.error = err.message;
  }

  results.ok = results.failed.length === 0 && !results.error;
  var reportPath = path.join(opts.out, 'browser-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log('out:', opts.out);
  console.log('passed:', results.passed.length);
  console.log('failed:', results.failed.length);
  results.passed.forEach(function (m) { console.log('  ✓', m); });
  results.failed.forEach(function (m) { console.log('  ✗', m); });
  if (results.externalFailures && results.externalFailures.length) {
    console.warn('external failures (non-blocking unless core UI):', results.externalFailures.length);
  }
  if (results.error) console.error('error:', results.error);

  process.exit(results.ok ? 0 : 1);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
