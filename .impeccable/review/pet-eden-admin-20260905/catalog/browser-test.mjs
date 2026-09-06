#!/usr/bin/env node
/**
 * 专业基础资料 + 菌群科普 — Chrome 验收
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;
const base = process.env.PET_ADMIN_BASE || 'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html';

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    '/tmp/pet-eden-session-test/node_modules/playwright',
    'playwright'
  ].filter(Boolean);
  for (const mod of candidates) {
    try {
      return mod === 'playwright' ? require('playwright') : require(mod);
    } catch (_e) { /* next */ }
  }
  throw new Error('playwright not found');
}

const results = { passed: [], failed: [], console: [], pageerrors: [], resourceFailed: [], screenshots: [] };

function record(ok, name, detail) {
  const entry = { name, ok, detail: detail || '' };
  if (ok) results.passed.push(entry);
  else results.failed.push(entry);
  console.log((ok ? 'OK' : 'FAIL') + ':', name, detail || '');
}

async function gotoHash(page, hash, actor, forceReload) {
  const target = hash.startsWith('#') ? hash : '#' + hash;
  let baseUrl = base.split('#')[0];
  if (actor) {
    const u = new URL(baseUrl);
    u.searchParams.set('actor', actor);
    baseUrl = u.toString();
  }
  const needsLoad = forceReload || !page.url().startsWith(baseUrl.split('?')[0]);
  if (needsLoad) {
    await page.goto(baseUrl + target, { waitUntil: 'domcontentloaded' });
  } else {
    await page.evaluate((h) => {
      if (window.location.hash !== h) window.location.hash = h;
    }, target);
  }
  await page.waitForFunction(() => window.PetReportMockStore && window.PetAdminSession && window.dictionaryDataService);
  await page.waitForTimeout(500);
}

async function screenshot(page, name, width, height) {
  if (width && height) await page.setViewportSize({ width, height });
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  results.screenshots.push(file);
  return file;
}

async function fixtureIds(page) {
  return page.evaluate(() => {
    const catalog = window.dictionaryDataService.getCatalog();
    const taxa = catalog.microbiotaTaxa || [];
    const phylum = taxa.find((t) => t.level === 'phylum');
    const genus = taxa.find((t) => t.level !== 'phylum');
    const breed = (catalog.breeds || [])[0];
    return {
      dictItemId: breed && breed.id,
      taxonPhylum: phylum && phylum.key,
      taxonGenus: genus && genus.key
    };
  });
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('dialog', async (dialog) => { await dialog.accept(); });
  page.on('console', (msg) => results.console.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => results.pageerrors.push(String(err)));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!/favicon|analytics/i.test(url)) {
      results.resourceFailed.push({ url, error: req.failure() && req.failure().errorText });
    }
  });

  const ids = await (async () => {
    await gotoHash(page, '#dictionary-management');
    return fixtureIds(page);
  })();
  record(!!ids.dictItemId, 'fixture: 专业资料项', ids.dictItemId);
  record(!!ids.taxonPhylum, 'fixture: 菌门节点', ids.taxonPhylum);
  record(!!ids.taxonGenus, 'fixture: 菌属节点', ids.taxonGenus);

  // --- 专业基础资料 ---
  await gotoHash(page, '#dictionary-management');
  await page.waitForSelector('#dm-list-mount .rondo-basic-table-wrap');
  await screenshot(page, 'catalog-list-1280.png', 1280, 800);

  await page.click('.catalog-tab[data-tab="indicators"]');
  await page.waitForTimeout(300);
  record(true, 'catalog: 切换普通检测指标 tab');

  await page.click('#add-new-key');
  await page.waitForSelector('.rondo-modal-root');
  await page.fill('#dm-modal-key', '');
  await page.fill('#dm-modal-label', '');
  await page.click('.rondo-modal-root [data-action="ok"]');
  await page.waitForTimeout(200);
  const modalStillOpen = await page.$('.rondo-modal-root');
  record(!!modalStillOpen, 'catalog: 校验失败保留弹窗');

  const testKey = 'test-catalog-' + Date.now();
  await page.fill('#dm-modal-key', testKey);
  await page.fill('#dm-modal-label', '测试指标项');
  await page.click('.rondo-modal-root [data-action="ok"]');
  await page.waitForFunction(() => !document.querySelector('.rondo-modal-root'), null, { timeout: 5000 });
  record(true, 'catalog: 新建保存成功关闭 Modal');

  await page.click('#batch-sort-toggle');
  await page.waitForSelector('#dm-sort-mount:not(.hidden)');
  await page.click('#batch-sort-cancel');
  await page.waitForSelector('#dm-list-mount .rondo-basic-table-wrap');
  record(true, 'catalog: 批量排序进入并取消');

  await gotoHash(page, '#dictionary-management', 'readonly', true);
  const addDisabled = await page.evaluate(() => {
    const root = document.querySelector('#dictionary-management');
    const btn = document.querySelector('#add-new-key');
    return root && root.classList.contains('dm-readonly') && btn && btn.disabled;
  });
  record(!!addDisabled, 'catalog: 只读账号禁用新增', String(addDisabled));

  await screenshot(page, 'catalog-readonly-390.png', 390, 844);

  // --- 菌群科普（恢复默认编制权限）---
  await gotoHash(page, '#microbiota-knowledge?taxon=' + encodeURIComponent(ids.taxonPhylum), null, true);
  await page.waitForSelector('#mk-editor');
  await screenshot(page, 'microbiota-phylum-1280.png', 1280, 800);

  const originalScene = await page.inputValue('#mk-scene-copy');
  await page.fill('#mk-scene-copy', (originalScene || '测试') + '-dirty');
  const dirtyAfterEdit = await page.evaluate(() => {
    const tabs = window.PetAdminSession.getTabs();
    const active = window.PetAdminSession.getActiveTab();
    return active && active.dirty;
  });
  record(!!dirtyAfterEdit, 'microbiota: 编辑后页签 dirty');

  await page.click('[data-taxon-key="' + ids.taxonGenus + '"]');
  await page.waitForTimeout(400);
  const genusScene = await page.inputValue('#mk-scene-copy');
  record(genusScene !== (originalScene || '测试') + '-dirty', 'microbiota: 切节点后加载属级内容');

  await page.fill('#mk-scene-copy', '属级测试文案');
  await page.click('#mk-btn-save', { force: true });
  await page.waitForTimeout(400);
  const dirtyAfterSave = await page.evaluate(() => {
    const active = window.PetAdminSession.getActiveTab();
    return active && active.dirty;
  });
  record(!dirtyAfterSave, 'microbiota: 保存后清除 dirty');

  await gotoHash(page, '#dictionary-management');
  await page.waitForTimeout(300);
  await gotoHash(page, '#microbiota-knowledge?taxon=' + encodeURIComponent(ids.taxonGenus));
  await page.waitForTimeout(300);
  await page.fill('#mk-scene-copy', '页签往返未保存');
  await gotoHash(page, '#dictionary-management');
  await page.waitForTimeout(200);
  await gotoHash(page, '#microbiota-knowledge?taxon=' + encodeURIComponent(ids.taxonGenus));
  await page.waitForTimeout(400);
  const restoredDraft = await page.inputValue('#mk-scene-copy');
  record(restoredDraft === '页签往返未保存', 'microbiota: 页签切换保留未保存', restoredDraft);

  await gotoHash(page, '#microbiota-knowledge?taxon=' + encodeURIComponent(ids.taxonGenus), 'readonly', true);
  const saveHidden = await page.evaluate(() => {
    const root = document.querySelector('#microbiota-knowledge');
    const btn = document.querySelector('#mk-btn-save');
    return root && root.classList.contains('mk-readonly') && btn && window.getComputedStyle(btn).display === 'none';
  });
  record(!!saveHidden, 'microbiota: 只读隐藏保存按钮');

  await screenshot(page, 'microbiota-readonly-390.png', 390, 844);

  await browser.close();

  const report = {
    timestamp: new Date().toISOString(),
    base,
    summary: { passed: results.passed.length, failed: results.failed.length },
    passed: results.passed,
    failed: results.failed,
    pageerrors: results.pageerrors,
    resourceFailed: results.resourceFailed,
    screenshots: results.screenshots
  };
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(report, null, 2));
  console.log('\nReport:', path.join(outDir, 'results.json'));
  if (results.failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
