#!/usr/bin/env node
/**
 * 管理端公共控件 CSS 契约 — Chrome + Playwright
 * 覆盖 ant-input / legacy Tailwind 输入、链接操作、列表标题、工作台 Modal
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;
const base =
  process.env.PET_ADMIN_BASE ||
  'http://127.0.0.1:8766/docs/.vuepress/public/prototype/admin/index.html';
const PLAYWRIGHT =
  process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhaoyanlong/.npm/_npx/420ff84f11983ee5/node_modules/playwright';

function loadPlaywright() {
  return require(PLAYWRIGHT);
}

const results = { passed: [], failed: [], console: [], pageerrors: [] };

function record(ok, name, detail) {
  const entry = { name, ok, detail: detail || '' };
  if (ok) results.passed.push(entry);
  else results.failed.push(entry);
  console.log((ok ? 'OK' : 'FAIL') + ':', name, detail || '');
}

function parseRgb(color) {
  const m = String(color || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3] };
}

function isPrimaryBlue(color) {
  const rgb = parseRgb(color);
  if (!rgb) return false;
  return rgb.r <= 20 && rgb.g >= 80 && rgb.g <= 110 && rgb.b >= 170 && rgb.b <= 210;
}

function isTransparentBg(color) {
  return (
    color === 'transparent' ||
    color === 'rgba(0, 0, 0, 0)' ||
    /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(color)
  );
}

async function gotoHash(page, hash) {
  const target = hash.startsWith('#') ? hash : '#' + hash;
  const baseUrl = base.split('#')[0];
  const needsLoad = !page.url().startsWith(baseUrl.split('?')[0]);
  if (needsLoad) {
    await page.goto(baseUrl + target, { waitUntil: 'domcontentloaded' });
  } else {
    await page.evaluate((h) => {
      if (window.location.hash !== h) window.location.hash = h;
    }, target);
  }
  await page.waitForFunction(() => window.PetReportMockStore && window.PetAdminSession);
  await page.waitForTimeout(500);
}

async function fieldMetrics(page, selector) {
  return page.locator(selector).evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      borderTopWidth: s.borderTopWidth,
      borderTopColor: s.borderTopColor,
      borderRadius: s.borderRadius,
      height: s.height,
      backgroundColor: s.backgroundColor,
      boxShadow: s.boxShadow
    };
  });
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', (msg) => results.console.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => results.pageerrors.push(String(err)));

  // ── 菌群科普：legacy Tailwind 输入 ──
  await gotoHash(page, '#microbiota-knowledge');
  await page.waitForSelector('#mk-latin-name');
  for (const id of ['mk-latin-name', 'mk-key', 'mk-scene-copy', 'mk-intro-text', 'mk-hint']) {
    const m = await fieldMetrics(page, '#' + id);
    record(parseFloat(m.borderTopWidth) >= 1, 'microbiota #' + id + ' 有边框', JSON.stringify(m));
    record(parseFloat(m.borderRadius) >= 5, 'microbiota #' + id + ' 圆角 6px', m.borderRadius);
  }
  const keyMetrics = await fieldMetrics(page, '#mk-key');
  record(
    keyMetrics.backgroundColor === 'rgb(250, 250, 250)' || keyMetrics.backgroundColor === 'rgb(245, 245, 245)',
    'microbiota #mk-key readonly 背景',
    keyMetrics.backgroundColor
  );

  await page.locator('#mk-latin-name').click();
  const mkFocus = await fieldMetrics(page, '#mk-latin-name');
  record(isPrimaryBlue(mkFocus.borderTopColor), 'microbiota legacy focus 边框主色', mkFocus.borderTopColor);
  record(mkFocus.boxShadow.includes('189'), 'microbiota legacy focus 外发光', mkFocus.boxShadow);

  await page.locator('#mk-search').focus();
  await page.waitForTimeout(150);
  const mkSearchFocus = await fieldMetrics(page, '#mk-search');
  record(
    isPrimaryBlue(mkSearchFocus.borderTopColor) || mkSearchFocus.boxShadow.includes('189'),
    'microbiota ant-input focus 态',
    mkSearchFocus.borderTopColor + ' | ' + mkSearchFocus.boxShadow
  );

  // ── 列表页：标题 + 链接操作 ──
  await gotoHash(page, '#normal-range-config');
  await page.waitForSelector('.rondo-list-page-title');
  const title = await page.locator('.rondo-list-page-title').evaluate((el) => {
    const s = getComputedStyle(el);
    return { fontSize: s.fontSize, fontWeight: s.fontWeight };
  });
  record(title.fontWeight === '600' || title.fontWeight === '700', 'normal-range 列表标题字重', title.fontWeight);
  record(parseFloat(title.fontSize) >= 15, 'normal-range 列表标题字号', title.fontSize);

  await gotoHash(page, '#dictionary-management');
  await page.waitForSelector('.rondo-basic-table .rondo-btn-link');
  const link = await page.locator('.rondo-basic-table .rondo-btn-link').first().evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      borderTopColor: s.borderTopColor,
      backgroundColor: s.backgroundColor,
      height: s.height,
      marginRight: s.marginRight
    };
  });
  record(isTransparentBg(link.backgroundColor), 'dictionary 行操作非白底', link.backgroundColor);
  record(
    link.borderTopColor === 'rgba(0, 0, 0, 0)' || link.borderTopColor === 'transparent',
    'dictionary 行操作透明边框',
    link.borderTopColor
  );
  record(parseFloat(link.height) <= 24, 'dictionary 行操作链接高度', link.height);
  record(parseFloat(link.marginRight) >= 4, 'dictionary 行操作间距', link.marginRight);

  // ── 参考范围：ant-input + disabled ──
  await gotoHash(page, '#normal-range-config');
  const nrcTitle = await page.locator('.rondo-list-page-title').evaluate((el) => getComputedStyle(el).fontWeight);
  record(nrcTitle === '600' || nrcTitle === '700', 'normal-range 列表标题字重复验', nrcTitle);

  const schemes = await page.evaluate(() => {
    const rows = window.dictionaryDataService.getReferenceRangeSchemes(false) || [];
    return rows.map((r) => r.id).filter(Boolean);
  });
  if (schemes[0]) {
    await gotoHash(page, '#normal-range-config?edit=' + encodeURIComponent(schemes[0]));
    await page.waitForSelector('#scheme-name');
    const schemeInput = await fieldMetrics(page, '#scheme-name');
    record(parseFloat(schemeInput.borderTopWidth) >= 1, 'normal-range 表单 ant-input 边框', JSON.stringify(schemeInput));
    await page.locator('#scheme-name').focus();
    await page.waitForTimeout(150);
    const schemeFocus = await fieldMetrics(page, '#scheme-name');
    record(
      isPrimaryBlue(schemeFocus.borderTopColor) || schemeFocus.boxShadow.includes('189'),
      'normal-range ant-input focus',
      schemeFocus.borderTopColor + ' | ' + schemeFocus.boxShadow
    );
  } else {
    record(false, 'normal-range fixture 方案', 'none');
  }

  // ── 分析规则：legacy 表单（列表模式下表单在 DOM 中） ──
  await gotoHash(page, '#analysis-rules');
  await page.waitForSelector('#form-rule-name', { state: 'attached' });
  const arInput = await fieldMetrics(page, '#form-rule-name');
  record(parseFloat(arInput.borderTopWidth) >= 1, 'analysis-rules legacy 输入边框', JSON.stringify(arInput));

  await page.waitForSelector('.rondo-list-page-title');
  const arTitle = await page.locator('.rondo-list-page-title').evaluate((el) => getComputedStyle(el).fontWeight);
  record(arTitle === '600' || arTitle === '700', 'analysis-rules 列表标题字重', arTitle);

  // ── 工作台 Modal：纯 ant-input ──
  await gotoHash(page, '#report-review?reportId=report-003');
  await page.waitForSelector('#rw-workbench', { timeout: 20000 });
  await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const btn = mount.querySelector('[data-module-id="results"]');
    if (btn) btn.click();
  });
  await page.waitForSelector('#module-results:not(.hidden)', { timeout: 10000 });
  await page.locator('#btn-supplement-result').click();
  await page.waitForSelector('#supplement-modal:not(.hidden)', { timeout: 10000 });
  await page.waitForSelector('#supplement-value', { state: 'visible', timeout: 10000 });
  const wbInput = await fieldMetrics(page, '#supplement-value');
  record(parseFloat(wbInput.borderTopWidth) >= 1, 'workbench modal ant-input 边框', JSON.stringify(wbInput));
  record(parseFloat(wbInput.borderRadius) >= 5, 'workbench modal ant-input 圆角', wbInput.borderRadius);
  await page.locator('#supplement-value').focus();
  await page.waitForTimeout(150);
  const wbFocus = await fieldMetrics(page, '#supplement-value');
  record(
    isPrimaryBlue(wbFocus.borderTopColor) || wbFocus.boxShadow.includes('189'),
    'workbench modal ant-input focus',
    wbFocus.borderTopColor + ' | ' + wbFocus.boxShadow
  );

  const miniProbe = await page.evaluate(() => {
    const mini = document.querySelector('.rw-mini-app');
    if (!mini) return { exists: false };
    const style = getComputedStyle(mini);
    return {
      exists: true,
      display: style.display,
      htmlLen: mini.innerHTML.length,
      touchedByAntInputRule: !!mini.querySelector('.ant-input')
    };
  });
  record(miniProbe.exists && miniProbe.htmlLen > 100, 'report preview rw-mini-app 仍在', JSON.stringify(miniProbe));
  record(!miniProbe.touchedByAntInputRule, 'rw-mini-app 内无 ant-input 污染', String(miniProbe.touchedByAntInputRule));

  await browser.close();

  const outPath = path.join(outDir, 'controls-contract-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('\nResults:', outPath);
  console.log('Passed:', results.passed.length, 'Failed:', results.failed.length);
  process.exit(results.failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
