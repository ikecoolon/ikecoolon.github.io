#!/usr/bin/env node
/**
 * 剩余两项公共 CSS 契约：≤640 搜索单列宽度 + 资料 Modal 单行控件高度
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE =
  process.env.PET_ADMIN_BASE ||
  'http://127.0.0.1:8766/docs/.vuepress/public/prototype/admin/index.html';
const PLAYWRIGHT =
  process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhaoyanlong/.npm/_npx/420ff84f11983ee5/node_modules/playwright';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const LIST_PAGES = [
  { id: 'detection-records', hash: '#detection-records', wait: '.rondo-basic-table-wrap' },
  { id: 'report-center', hash: '#report-center', wait: '.rondo-basic-table-wrap' },
  {
    id: 'normal-range-config',
    hash: '#normal-range-config',
    wait: '#nrc-list-mount .rondo-basic-table-wrap'
  },
  { id: 'analysis-rules', hash: '#analysis-rules', wait: '.rondo-basic-table-wrap' },
  { id: 'user-pets', hash: '#user-pets?view=users', wait: '#up-users-list-mount .rondo-basic-table-wrap' },
  { id: 'dictionary-management', hash: '#dictionary-management', wait: '.rondo-basic-table-wrap' }
];

const NARROW_WIDTHS = [375, 390, 414, 430, 640];
const DESKTOP_CHECKS = [
  { width: 1024, minCols: 2, label: 'tablet' },
  { width: 1440, minCols: 3, label: 'desktop' }
];

const results = { passed: [], failed: [], screenshots: [] };

function record(ok, name, detail) {
  const entry = { name, ok, detail: detail || '' };
  if (ok) results.passed.push(entry);
  else results.failed.push(entry);
  console.log((ok ? 'OK' : 'FAIL') + ':', name, detail || '');
}

function loadPlaywright() {
  return require(PLAYWRIGHT);
}

async function gotoHash(page, hash) {
  const target = hash.startsWith('#') ? hash : '#' + hash;
  const baseUrl = BASE.split('#')[0];
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

async function probeSearch(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('.rondo-search-grid, .rondo-search-form');
    if (!grid) return { skipped: true, reason: 'no-search-grid' };
    const gridStyle = getComputedStyle(grid);
    const gridCols = gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length;
    const searchInnerWidth = Math.round(grid.clientWidth);
    const inputs = Array.from(
      grid.querySelectorAll(
        'input[type="text"], input[type="search"], input:not([type]), .rondo-input, .ant-input'
      )
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const labels = Array.from(grid.querySelectorAll('.rondo-search-form-label')).map((el) => {
      const field = el.closest('.rondo-search-form-field');
      const fieldStyle = field ? getComputedStyle(field) : null;
      const labelStyle = getComputedStyle(el);
      const labelRect = el.getBoundingClientRect();
      const control = field?.querySelector('.rondo-search-form-control');
      const controlRect = control?.getBoundingClientRect();
      const fieldRect = field?.getBoundingClientRect();
      return {
        id: el.getAttribute('for') || el.textContent?.trim() || '(anon)',
        fieldDirection: fieldStyle?.flexDirection || 'n/a',
        labelTop: Math.round(labelRect.top),
        controlTop: controlRect ? Math.round(controlRect.top) : null,
        labelHeight: Math.round(labelRect.height),
        flexBasis: labelStyle.flexBasis,
        controlWidth: controlRect ? Math.round(controlRect.width) : null,
        fieldWidth: fieldRect ? Math.round(fieldRect.width) : null,
        searchInnerWidth
      };
    });
    return {
      skipped: false,
      gridCols,
      searchInnerWidth,
      fields: inputs.map((el) => ({
        id: el.id || el.name || '(anon)',
        width: Math.round(el.getBoundingClientRect().width)
      })),
      labels
    };
  });
}

async function assertListSearchNarrow(page, pageId, viewportWidth) {
  await page.setViewportSize({ width: viewportWidth, height: 900 });
  const probe = await probeSearch(page);

  if (probe.skipped) {
    record(true, `${pageId}@${viewportWidth}: 搜索区`, '无搜索区，跳过');
    return;
  }

  record(
    probe.gridCols === 1,
    `${pageId}@${viewportWidth}: 搜索单列`,
    `gridCols=${probe.gridCols}`
  );

  const minReadable = Math.min(100, viewportWidth - 48);
  const narrow = probe.fields.filter((f) => f.width < minReadable);
  record(
    narrow.length === 0,
    `${pageId}@${viewportWidth}: 搜索字段可读宽度`,
    JSON.stringify({ minReadable, narrow, all: probe.fields })
  );

  if (probe.labels.length > 0) {
    const stacked = probe.labels.every(
      (l) => l.fieldDirection === 'column' && l.controlTop !== null && l.controlTop >= l.labelTop
    );
    record(
      stacked,
      `${pageId}@${viewportWidth}: 标签上置`,
      JSON.stringify(probe.labels)
    );

    const tallLabels = probe.labels.filter((l) => l.labelHeight > 0 && l.labelHeight >= 30);
    record(
      tallLabels.length === 0,
      `${pageId}@${viewportWidth}: 标签自然行高`,
      JSON.stringify(tallLabels.length ? tallLabels : probe.labels.map((l) => ({ id: l.id, labelHeight: l.labelHeight })))
    );

    const fixedBasis = probe.labels.filter((l) => {
      if (l.labelHeight === 0) return false;
      const basis = parseFloat(l.flexBasis);
      return basis >= 79 || l.flexBasis === '80px';
    });
    record(
      fixedBasis.length === 0,
      `${pageId}@${viewportWidth}: 标签无 80px flex-basis`,
      JSON.stringify(fixedBasis.length ? fixedBasis : probe.labels.map((l) => ({ id: l.id, flexBasis: l.flexBasis })))
    );

    const misaligned = probe.labels.filter((l) => {
      if (l.labelHeight === 0 || l.controlWidth == null || l.searchInnerWidth == null) return false;
      return Math.abs(l.controlWidth - l.searchInnerWidth) > 2;
    });
    record(
      misaligned.length === 0,
      `${pageId}@${viewportWidth}: 控件填满搜索区`,
      JSON.stringify(
        misaligned.length
          ? misaligned
          : probe.labels.map((l) => ({
              id: l.id,
              controlWidth: l.controlWidth,
              searchInnerWidth: l.searchInnerWidth
            }))
      )
    );
  }

  if (viewportWidth === 390 || viewportWidth === 640) {
    const shot = path.join(SCREENSHOT_DIR, `search-${pageId}-${viewportWidth}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    results.screenshots.push(shot);
  }
}

async function assertListSearchAtWidths(page, pageId) {
  for (const w of NARROW_WIDTHS) {
    await assertListSearchNarrow(page, pageId, w);
  }
}

async function assertDictModalInputs(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoHash(page, '#dictionary-management');
  await page.waitForSelector('#add-new-key', { timeout: 15000 });
  await page.locator('#add-new-key').click();
  await page.waitForSelector('.rondo-modal-root .rondo-modal', { timeout: 10000 });

  const metrics = await page.evaluate(() => {
    const modal = document.querySelector('.rondo-modal-root .rondo-modal');
    const inputs = Array.from(modal.querySelectorAll('input.rondo-input, textarea.rondo-input, select.rondo-select'));
    return inputs.map((el) => {
      const rect = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      return {
        id: el.id || el.name || '(anon)',
        tag,
        height: Math.round(rect.height),
        width: Math.round(rect.width)
      };
    });
  });

  const shot = path.join(SCREENSHOT_DIR, 'modal-dict-add-key-1440.png');
  await page.screenshot({ path: shot, fullPage: false });
  results.screenshots.push(shot);

  const singles = metrics.filter((m) => m.tag !== 'textarea');
  const textareas = metrics.filter((m) => m.tag === 'textarea');

  for (const m of singles) {
    record(
      m.height >= 28 && m.height <= 40,
      `dict-modal ${m.id}: 单行高度 32px`,
      `h=${m.height}`
    );
    record(m.width >= 200, `dict-modal ${m.id}: 标准宽度`, `w=${m.width}`);
  }

  for (const m of textareas) {
    record(m.height >= 70, `dict-modal ${m.id}: textarea 保留 80px`, `h=${m.height}`);
  }

  await page.locator('.rondo-modal-root .rondo-modal-footer .rondo-btn-default').first().click();
  await page.waitForTimeout(300);
}

async function assertDesktopUnchanged(page) {
  for (const check of DESKTOP_CHECKS) {
    await page.setViewportSize({ width: check.width, height: 900 });
    await gotoHash(page, '#detection-records');
    await page.waitForSelector('.rondo-search-form', { timeout: 15000 });
    const desktop = await page.evaluate(() => {
      const grid = document.querySelector('.rondo-search-form');
      const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
      const label = grid.querySelector('.rondo-search-form-label');
      const labelStyle = label ? getComputedStyle(label) : null;
      const field = label?.closest('.rondo-search-form-field');
      const fieldStyle = field ? getComputedStyle(field) : null;
      return {
        cols,
        labelFlexBasis: labelStyle?.flexBasis || 'n/a',
        fieldDirection: fieldStyle?.flexDirection || 'n/a'
      };
    });
    record(
      desktop.cols >= check.minCols,
      `${check.label}@${check.width}: 搜索保持多列`,
      `cols=${desktop.cols}, min=${check.minCols}`
    );
    record(
      desktop.fieldDirection === 'row' && (desktop.labelFlexBasis === '80px' || parseFloat(desktop.labelFlexBasis) >= 79),
      `${check.label}@${check.width}: 桌面标签 80px 宽`,
      JSON.stringify({ fieldDirection: desktop.fieldDirection, labelFlexBasis: desktop.labelFlexBasis })
    );

    const shot = path.join(SCREENSHOT_DIR, `search-detection-records-${check.width}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    results.screenshots.push(shot);
  }
}

async function assertMiniPreviewClean(page) {
  await gotoHash(page, '#report-review?reportId=report-003');
  await page.waitForSelector('.rw-mini-app', { timeout: 20000 });
  const mini = await page.evaluate(() => {
    const root = document.querySelector('.rw-mini-app');
    if (!root) return { exists: false };
    const style = getComputedStyle(root);
    return {
      exists: true,
      display: style.display,
      htmlLen: root.innerHTML.length,
      antInputCount: root.querySelectorAll('.ant-input').length
    };
  });
  record(mini.exists && mini.htmlLen > 100, 'report preview rw-mini-app 仍在', JSON.stringify(mini));
  record(mini.antInputCount === 0, 'rw-mini-app 内无 ant-input 污染', String(mini.antInputCount));
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const item of LIST_PAGES) {
    await gotoHash(page, item.hash);
    await page.waitForSelector(item.wait, { timeout: 20000 });
    await assertListSearchAtWidths(page, item.id);
    await context.clearCookies();
  }

  await assertDictModalInputs(page);
  await assertDesktopUnchanged(page);
  await assertMiniPreviewClean(page);

  await browser.close();

  const outPath = path.join(__dirname, 'remaining-css-contract-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('\nResults:', outPath);
  console.log('Screenshots:', SCREENSHOT_DIR);
  console.log('Passed:', results.passed.length, 'Failed:', results.failed.length);
  process.exit(results.failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
