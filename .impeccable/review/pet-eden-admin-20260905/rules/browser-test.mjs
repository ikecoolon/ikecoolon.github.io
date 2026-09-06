#!/usr/bin/env node
/**
 * 分析规则工作会话 — Chrome + Playwright 验收
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../..');
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

async function gotoHash(page, hash) {
  const target = hash.startsWith('#') ? hash : '#' + hash;
  const baseUrl = base.split('#')[0];
  const needsLoad = !page.url().startsWith(baseUrl);
  if (needsLoad) {
    await page.goto(baseUrl + target, { waitUntil: 'domcontentloaded' });
  } else {
    await page.evaluate((h) => {
      if (window.location.hash !== h) window.location.hash = h;
    }, target);
  }
  await page.waitForFunction(() => window.PetReportMockStore && window.PetAdminSession);
  await page.waitForTimeout(350);
}

async function fixtureIds(page) {
  return page.evaluate(() => {
    const state = window.PetReportMockStore.getState();
    const active = (state.analysisRuleCatalog || []).filter((r) => r.status === 'active' && r.lineageId);
    const lineages = active.map((r) => r.lineageId);
    const uniq = [...new Set(lineages)];
    return {
      lineageA: uniq[0] || null,
      lineageB: uniq[1] || uniq[0],
      ruleA: active.find((r) => r.lineageId === uniq[0])?.id || active[0]?.id || null,
      ruleB: active.find((r) => r.lineageId === uniq[1])?.id || active[1]?.id || active[0]?.id || null
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

  await gotoHash(page, '#analysis-rules');
  const ids = await fixtureIds(page);
  record(!!ids.lineageA, 'fixture: 至少一个启用谱系', ids.lineageA);

  // 编辑→测试→返回保留候选
  await gotoHash(page, '#analysis-rules?mode=edit&lineage=' + encodeURIComponent(ids.lineageA));
  await page.waitForSelector('#form-threshold-value');
  const original = await page.inputValue('#form-threshold-value');
  const marker = original === '7.77' ? '7.78' : '7.77';
  await page.check('#form-threshold-enabled');
  await page.fill('#form-threshold-value', marker);
  await page.fill('#form-analysis', '会话验收分析-' + marker);
  await page.click('#tab-test');
  await page.waitForFunction(() => window.location.hash.indexOf('mode=test') >= 0);
  await page.waitForSelector('#section-test:not(.hidden)');
  const catalogBefore = await page.evaluate(() => {
    const r = window.PetReportMockStore.getState().analysisRuleCatalog.find((x) => x.status === 'active' && x.lineageId === document.location.hash.match(/lineage=([^&]+)/)[1]);
    return r && r.output && r.output.analysis;
  });
  await page.click('#ar-back-to-edit');
  await page.waitForSelector('#rules-form-view:not(.hidden)');
  const restoredThreshold = await page.inputValue('#form-threshold-value');
  const restoredAnalysis = await page.inputValue('#form-analysis');
  record(restoredThreshold === marker, '编辑→测试→返回保留阈值', restoredThreshold);
  record(restoredAnalysis === '会话验收分析-' + marker, '编辑→测试→返回保留分析', restoredAnalysis);
  record(catalogBefore !== '会话验收分析-' + marker, '未保存候选未写入启用规则');

  // 两个谱系隔离
  if (ids.lineageB && ids.lineageB !== ids.lineageA) {
    await page.evaluate((lineageB) => window.__petAdminOpenRuleLineage(lineageB), ids.lineageB);
    await page.waitForSelector('#form-analysis');
    await page.fill('#form-analysis', '谱系B隔离标记');
    await page.evaluate((lineageA) => window.__petAdminOpenRuleLineage(lineageA), ids.lineageA);
    await page.waitForSelector('#form-analysis');
    const backAnalysis = await page.inputValue('#form-analysis');
    record(backAnalysis === '会话验收分析-' + marker, '不同谱系会话隔离', backAnalysis);
  } else {
    record(true, '不同谱系会话隔离', 'skipped: 仅一个谱系');
  }

  // 失败校验不丢表单
  await gotoHash(page, '#analysis-rules?mode=edit&lineage=__new__');
  await page.waitForSelector('#form-rule-name');
  await page.fill('#form-rule-name', '验收失败保留');
  await page.fill('#form-analysis', '');
  await page.click('#preview-candidate-btn');
  await page.waitForSelector('#form-error-summary:not(.hidden)');
  const nameKept = await page.inputValue('#form-rule-name');
  record(nameKept === '验收失败保留', '校验失败保留表单输入', nameKept);

  // 截图 1280 / 390
  for (const vp of [{ w: 1280, h: 800, tag: '1280' }, { w: 390, h: 844, tag: '390' }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await gotoHash(page, '#analysis-rules?mode=edit&lineage=' + encodeURIComponent(ids.lineageA));
    await page.waitForSelector('#rules-form-view:not(.hidden)');
    const editShot = path.join(outDir, 'edit-' + vp.tag + '.png');
    await page.screenshot({ path: editShot, fullPage: true });
    results.screenshots.push(editShot);
    await page.click('#tab-test');
    await page.waitForSelector('#section-test:not(.hidden)');
    const testShot = path.join(outDir, 'test-' + vp.tag + '.png');
    await page.screenshot({ path: testShot, fullPage: true });
    results.screenshots.push(testShot);
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
