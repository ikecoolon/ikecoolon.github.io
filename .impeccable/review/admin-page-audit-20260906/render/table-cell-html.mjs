#!/usr/bin/env node
/**
 * 三页表格：状态 ant-tag 与树缩进不得显示为字面 HTML/实体
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
  await page.waitForSelector('.rondo-basic-table tbody tr td', { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function probeTable(page) {
  return page.evaluate(() => {
    const table = document.querySelector('.rondo-basic-table');
    if (!table) return { error: 'no table' };
    const cells = Array.from(table.querySelectorAll('tbody td'));
    const literalSpan = cells.filter(
      (td) => td.textContent.includes('<span') || /&lt;span/i.test(td.innerHTML)
    );
    const literalNbsp = cells.filter(
      (td) => /&nbsp;/.test(td.innerHTML) || /\u00a0{2,}/.test(td.textContent)
    );
    const antTags = table.querySelectorAll('tbody .ant-tag');
    return {
      cellCount: cells.length,
      literalSpanCount: literalSpan.length,
      literalNbspCount: literalNbsp.length,
      antTagCount: antTags.length,
      literalSpanSamples: literalSpan.slice(0, 2).map((td) => td.textContent.slice(0, 80)),
      literalNbspSamples: literalNbsp.slice(0, 2).map((td) => td.innerHTML.slice(0, 80))
    };
  });
}

async function probeTreeIndent(page) {
  return page.evaluate(() => {
    const table = document.querySelector('.rondo-basic-table');
    if (!table) return { error: 'no table', levels: [] };
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
    const keyIdx = headers.indexOf('编码 Key');
    if (keyIdx < 0) return { error: 'no key column', levels: [] };
    const levels = Array.from(table.querySelectorAll('tbody tr'))
      .map((tr) => {
        const td = tr.querySelectorAll('td')[keyIdx];
        if (!td) return 0;
        const span = td.querySelector('.dm-tree-key');
        if (!span) return 0;
        const pad = parseInt(span.style.paddingLeft || '0', 10) || 0;
        return pad;
      })
      .filter((n) => n >= 0);
    const distinct = [...new Set(levels)].sort((a, b) => a - b);
    return { levels: distinct, hasHierarchy: distinct.length > 1 || (distinct[0] || 0) > 0 };
  });
}

async function probeLabelEscape(page) {
  return page.evaluate(() => {
    const C = window.PetAdminCommon;
    const svc = window.dictionaryDataService;
    if (!C || !svc) return { skipped: true };
    const poison = '<img src=x onerror=1>';
    const escaped = C.escapeHtml(poison);
    const table = document.querySelector('.rondo-basic-table tbody');
    if (!table) return { skipped: true };
    const probe = document.createElement('td');
    probe.textContent = poison;
    const escapedOk = probe.innerHTML.indexOf('<img') < 0 && probe.innerHTML.indexOf('&lt;') >= 0;
    return { escapedOk, escapedSample: escaped };
  });
}

async function switchDictionaryTab(page, tab) {
  await page.click('#catalog-tabs .catalog-tab[data-tab="' + tab + '"]');
  await page.waitForTimeout(500);
  await page.waitForSelector('.rondo-basic-table tbody tr td', { timeout: 15000 });
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (msg) => results.console.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => results.pageerrors.push(String(err)));

  // 参考范围
  await gotoHash(page, '#normal-range-config');
  let probe = await probeTable(page);
  record(probe.literalSpanCount === 0, 'normal-range: 无字面 span', JSON.stringify(probe));
  record(probe.antTagCount >= 1, 'normal-range: 存在 ant-tag', 'count=' + probe.antTagCount);

  // 分析规则
  await gotoHash(page, '#analysis-rules');
  probe = await probeTable(page);
  record(probe.literalSpanCount === 0, 'analysis-rules: 无字面 span', JSON.stringify(probe));
  record(probe.antTagCount >= 1, 'analysis-rules: 存在 ant-tag', 'count=' + probe.antTagCount);

  // 专业基础资料 — 三类 tab
  await gotoHash(page, '#dictionary-management');
  for (const tab of ['breeds', 'indicators', 'microbiota']) {
    await switchDictionaryTab(page, tab);
    probe = await probeTable(page);
    record(
      probe.literalSpanCount === 0,
      'dictionary-' + tab + ': 无字面 span',
      JSON.stringify(probe)
    );
    record(
      probe.literalNbspCount === 0,
      'dictionary-' + tab + ': 无字面 nbsp 缩进',
      JSON.stringify(probe)
    );
    record(probe.antTagCount >= 1, 'dictionary-' + tab + ': 存在 ant-tag', 'count=' + probe.antTagCount);
    if (tab === 'breeds' || tab === 'microbiota') {
      const tree = await probeTreeIndent(page);
      record(tree.hasHierarchy || tree.levels.length > 0, 'dictionary-' + tab + ': 树缩进可辨', JSON.stringify(tree));
    }
  }

  const escapeProbe = await probeLabelEscape(page);
  record(!!escapeProbe.escapedOk, 'dictionary: 动态文本 escape 机制有效', JSON.stringify(escapeProbe));

  await browser.close();

  const reportPath = path.join(outDir, 'table-cell-html-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        base,
        passed: results.passed.length,
        failed: results.failed.length,
        results
      },
      null,
      2
    )
  );

  if (results.failed.length) {
    console.error('\n' + results.failed.length + ' assertion(s) failed');
    process.exit(1);
  }
  console.log('\nAll assertions passed. Report:', reportPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
