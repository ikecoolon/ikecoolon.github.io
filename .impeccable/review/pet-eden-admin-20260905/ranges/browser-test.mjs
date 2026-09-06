#!/usr/bin/env node
/**
 * 参考范围页 — Chrome + Playwright 验收
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

const results = { passed: [], failed: [], console: [], pageerrors: [], screenshots: [] };

function record(ok, name, detail) {
  const entry = { name, ok, detail: detail || '' };
  if (ok) results.passed.push(entry);
  else results.failed.push(entry);
  console.log((ok ? 'OK' : 'FAIL') + ':', name, detail || '');
}

async function gotoHash(page, hash, actor) {
  const target = hash.startsWith('#') ? hash : '#' + hash;
  let baseUrl = base.split('#')[0];
  if (actor) {
    const u = new URL(baseUrl);
    u.searchParams.set('actor', actor);
    baseUrl = u.toString();
  }
  const needsLoad = !page.url().startsWith(baseUrl.split('?')[0]);
  if (needsLoad) {
    await page.goto(baseUrl + target, { waitUntil: 'domcontentloaded' });
  } else {
    await page.evaluate((h) => {
      if (window.location.hash !== h) window.location.hash = h;
    }, target);
  }
  await page.waitForFunction(() => window.PetReportMockStore && window.PetAdminSession);
  await page.waitForTimeout(400);
}

async function fixtureIds(page) {
  return page.evaluate(() => {
    const schemes = window.dictionaryDataService.getReferenceRangeSchemes(false) || [];
    const ids = schemes.map((s) => s.id).filter(Boolean);
    return { schemeA: ids[0] || null, schemeB: ids[1] || ids[0] };
  });
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('dialog', async (dialog) => { await dialog.accept(); });
  page.on('console', (msg) => results.console.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => results.pageerrors.push(String(err)));

  await gotoHash(page, '#normal-range-config');
  const ids = await fixtureIds(page);
  record(!!ids.schemeA, 'fixture: 至少一个参考范围方案', ids.schemeA);

  // 列表 -> 编辑已有方案
  await gotoHash(page, '#normal-range-config?edit=' + encodeURIComponent(ids.schemeA));
  await page.waitForSelector('#nrc-form-view:not(.hidden)');
  const originalName = await page.inputValue('#scheme-name');
  const marker = originalName + '-会话标记';
  await page.fill('#scheme-name', marker);

  // 切别页再返回不丢
  await gotoHash(page, '#dictionary-management');
  await page.waitForTimeout(300);
  await gotoHash(page, '#normal-range-config?edit=' + encodeURIComponent(ids.schemeA));
  await page.waitForSelector('#nrc-form-view:not(.hidden)');
  const restoredName = await page.inputValue('#scheme-name');
  record(restoredName === marker, '切页返回保留编辑输入', restoredName);

  // 两个方案编辑隔离
  if (ids.schemeB && ids.schemeB !== ids.schemeA) {
    await page.evaluate((id) => window.__petAdminOpenRangeScheme(id), ids.schemeB);
    await page.waitForSelector('#scheme-name');
    await page.fill('#scheme-name', '方案B隔离标记');
    await page.evaluate((id) => window.__petAdminOpenRangeScheme(id), ids.schemeA);
    await page.waitForSelector('#scheme-name');
    const backName = await page.inputValue('#scheme-name');
    record(backName === marker, '不同方案会话隔离', backName);
  } else {
    record(true, '不同方案会话隔离', 'skipped: 仅一个方案');
  }

  // 无效上下限保留输入且不半保存
  await gotoHash(page, '#normal-range-config?edit=new');
  await page.waitForSelector('#nrc-form-view:not(.hidden)');
  await page.fill('#scheme-name', '验收失败保留');
  await page.fill('#scheme-template', 'ORG-TEST-001');
  const speciesCb = page.locator('.species-checkbox').first();
  if (await speciesCb.count()) await speciesCb.check();
  const minInput = page.locator('.item-min').first();
  await minInput.fill('90');
  await page.locator('.item-max').first().fill('10');
  await page.click('#scheme-form [type="submit"]');
  await page.waitForTimeout(300);
  const nameKept = await page.inputValue('#scheme-name');
  const minKept = await page.inputValue('.item-min');
  record(nameKept === '验收失败保留', '校验失败保留方案名称', nameKept);
  record(minKept === '90', '校验失败保留范围输入', minKept);
  const notSaved = await page.evaluate(() => {
    return !(window.dictionaryDataService.getReferenceRangeSchemes(false) || [])
      .some((s) => s.name === '验收失败保留');
  });
  record(notSaved, '校验失败不半保存', String(notSaved));

  // 导入 Modal 取消
  await gotoHash(page, '#normal-range-config');
  await page.waitForSelector('#nrc-list-view:not(.hidden)');
  const importBtn = page.locator('button:has-text("导入方案")');
  if (await importBtn.count()) {
    await importBtn.first().click();
    await page.waitForSelector('[data-admin-modal="true"]');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const modalGone = (await page.locator('[data-admin-modal="true"]').count()) === 0;
    record(modalGone, '导入 Modal Esc 关闭', String(modalGone));
  } else {
    record(true, '导入 Modal Esc 关闭', 'skipped: 无导入按钮');
  }

  // 只读不能写（整页重载以切换 actor fixture）
  const readonlyUrl = base.split('#')[0] + '?actor=readonly#normal-range-config';
  await page.goto(readonlyUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PetReportMockStore && window.PetAdminSession);
  await page.waitForTimeout(400);
  await page.waitForSelector('#nrc-list-mount');
  const addVisible = await page.locator('button:has-text("新增方案")').count();
  record(addVisible === 0, '只读账号无新增按钮', String(addVisible));
  if (ids.schemeA) {
    await page.goto(base.split('#')[0] + '?actor=readonly#normal-range-config?edit=' + encodeURIComponent(ids.schemeA), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.PetReportMockStore && window.PetAdminSession);
    await page.waitForTimeout(400);
    await page.waitForSelector('#nrc-form-view:not(.hidden)');
    const saveDisabled = await page.isDisabled('#scheme-form [type="submit"]');
    record(saveDisabled, '只读账号保存禁用', String(saveDisabled));
  }

  // 截图 1280 / 390 编辑界面
  await page.goto(base.split('#')[0] + '?actor=editor#normal-range-config?edit=' + encodeURIComponent(ids.schemeA), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#nrc-form-view:not(.hidden)');
  for (const vp of [{ w: 1280, h: 800, tag: '1280' }, { w: 390, h: 844, tag: '390' }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    const shot = path.join(outDir, 'edit-' + vp.tag + '.png');
    await page.screenshot({ path: shot, fullPage: true });
    results.screenshots.push(shot);
  }

  const report = {
    base,
    at: new Date().toISOString(),
    passed: results.passed.length,
    failed: results.failed.length,
    cases: results.passed.concat(results.failed),
    console: results.console.filter((c) => c.type === 'error' || c.type === 'warning'),
    pageerrors: results.pageerrors,
    screenshots: results.screenshots
  };
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(report, null, 2));
  await browser.close();
  if (results.failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
