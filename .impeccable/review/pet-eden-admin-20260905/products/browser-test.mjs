#!/usr/bin/env node
/**
 * Report workbench — independent product save vs professional draft isolation
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const EVIDENCE = path.join(OUT, 'evidence');
const BASE = process.env.PRODUCTS_BASE || 'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html';

function loadPlaywright() {
  const candidates = [
    '/tmp/pet-eden-session-test/node_modules/playwright',
    'playwright'
  ];
  for (const base of candidates) {
    try {
      if (base === 'playwright') return require('playwright');
      if (fs.existsSync(path.join(base, 'package.json'))) return require(base);
    } catch (_e) { /* next */ }
  }
  throw new Error('playwright not found');
}

const cases = [];
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
let passed = 0;
let failed = 0;

function record(name, ok, detail) {
  cases.push({ name, ok, detail: detail || '' });
  if (ok) { passed++; console.log('OK:', name, detail ? `(${detail})` : ''); }
  else { failed++; console.error('FAIL:', name, detail || ''); }
}

function activeMount(page) {
  return page.evaluate(() => {
    const tab = window.PetAdminSession.getActiveTab();
    return tab && tab.mount ? tab.mount : null;
  });
}

async function gotoReview(page, reportId, moduleId) {
  const hash = `#report-review?reportId=${encodeURIComponent(reportId)}${moduleId ? '&module=' + moduleId : ''}`;
  await page.goto(BASE.split('#')[0] + hash, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.PetReportMockStore && typeof window.initReportReview === 'function');
  await page.waitForSelector('#rw-workbench', { timeout: 30000 });
  if (moduleId) {
    await page.evaluate((mod) => {
      const mount = window.PetAdminSession.getActiveTab().mount;
      const btn = mount.querySelector('[data-module-id="' + mod + '"]');
      if (btn) btn.click();
    }, moduleId);
  }
  await page.waitForFunction(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    return mount && mount.querySelector('#recommendations-panel');
  }, { timeout: 20000 });
}

async function switchModule(page, moduleId) {
  await page.evaluate((mod) => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const btn = mount.querySelector('[data-module-id="' + mod + '"]');
    if (btn) btn.click();
  }, moduleId);
  await page.waitForTimeout(200);
}

async function readStoreProducts(page, reportId) {
  return page.evaluate((rid) => {
    const store = window.PetReportMockStore;
    const report = store.getReport(rid);
    const units = store.getPhylumUnits(rid) || [];
    return {
      reportId: rid,
      status: report && report.status,
      workingVersion: report && report.workingVersion,
      publishedVersion: report && report.publishedVersion,
      correctionDraftActive: !!(report && report.correctionDraftActive),
      summary: (() => {
        const v = report && report.versions && report.versions.find((x) => x.version === report.workingVersion);
        return v ? v.summary : null;
      })(),
      units: units.map((u) => ({
        phylumKey: u.phylumKey,
        primaryProductId: u.primaryProductId || null,
        relatedProductIds: (u.relatedProductIds || []).slice()
      }))
    };
  }, reportId);
}

async function pickAlternateProduct(page) {
  return page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const pickBtn = mount.querySelector('.rw-pick-product[data-slot="primary"]');
    if (!pickBtn) return { ok: false, reason: 'no pick button' };
    const phylumKey = pickBtn.getAttribute('data-phylum');
    pickBtn.click();
    return { ok: true, phylumKey };
  });
}

async function chooseDifferentPrimaryProduct(page, reportId, phylumKey) {
  return page.evaluate(({ rid, pk }) => {
    const store = window.PetReportMockStore;
    const unit = (store.getPhylumUnits(rid) || []).find((u) => u.phylumKey === pk);
    const current = unit && unit.primaryProductId ? unit.primaryProductId : null;
    const candidates = ['prod-001', 'prod-003', 'prod-004', 'prod-002'].filter((id) => id !== current);
    return candidates[0] || 'prod-003';
  }, { rid: reportId, pk: phylumKey });
}

async function selectProductInModal(page, productId) {
  await page.waitForFunction(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const modal = mount.querySelector('#product-picker-modal');
    return modal && !modal.classList.contains('hidden');
  }, { timeout: 10000 });
  await page.evaluate((pid) => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const item = mount.querySelector('.rw-picker-item[data-product-id="' + pid + '"]');
    if (!item) throw new Error('picker item not found: ' + pid);
    item.click();
  }, productId);
  await page.waitForTimeout(250);
}

async function clickSaveProducts(page) {
  await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const btn = mount.querySelector('#btn-save-products');
    if (!btn || btn.classList.contains('hidden')) throw new Error('save products button unavailable');
    btn.click();
  });
  await page.waitForTimeout(500);
}

async function clickSaveDraft(page) {
  await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const btn = mount.querySelector('#btn-save-draft');
    if (!btn || btn.disabled) throw new Error('save draft button unavailable');
    btn.click();
  });
  await page.waitForTimeout(600);
}

async function sessionUiState(page) {
  return page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const saveBtn = mount.querySelector('#btn-save-products');
    const unsavedTag = mount.querySelector('.rw-session-tag');
    const primaryText = mount.querySelector('.rw-phylum-card .text-sm');
    return {
      saveVisible: !!(saveBtn && !saveBtn.classList.contains('hidden')),
      hasUnsavedTag: !!unsavedTag,
      primaryText: primaryText ? primaryText.textContent.trim() : null
    };
  });
}

async function main() {
  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText || 'failed' });
  });

  await page.goto(BASE.split('#')[0], { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PetReportMockStore && window.PetReportMockStore.reset);
  await page.evaluate(() => window.PetReportMockStore.reset());

  const fixture = await page.evaluate(() => {
    const store = window.PetReportMockStore;
    const published = (store.getState().reports || []).filter((r) => r.status === 'published' && r.status !== 'voided');
    const report001 = store.getReport('report-001');
    const report002 = store.getReport('report-002');
    const report004 = store.getReport('report-004');
    const units001 = store.getPhylumUnits('report-001') || [];
    const configurable = units001.find((u) => String(u.adviceDraft || u.advice || '').trim());
    return {
      publishedId: report001 && report001.status === 'published' ? 'report-001' : (published[0] && published[0].id),
      otherReportId: report002 ? 'report-002' : 'report-003',
      correctionReportId: report004 && report004.correctionDraftActive ? 'report-004' : null,
      targetPhylum: configurable ? configurable.phylumKey : (units001[0] && units001[0].phylumKey),
      baselinePrimary: configurable ? (configurable.primaryProductId || 'prod-001') : 'prod-001'
    };
  });
  record('fixture resolved published report', !!fixture.publishedId, fixture.publishedId);

  // ── A. Published report: select product, store unchanged, module switch preserves session ──
  await gotoReview(page, fixture.publishedId, 'recommendations');
  const beforeSelect = await readStoreProducts(page, fixture.publishedId);
  const otherBefore = await readStoreProducts(page, fixture.otherReportId);

  const pick = await pickAlternateProduct(page);
  record('open primary product picker', pick.ok, pick.reason || pick.phylumKey);
  const altProductId = await chooseDifferentPrimaryProduct(page, fixture.publishedId, pick.phylumKey);
  const altProductName = await page.evaluate((pid) => {
    const p = (window.PetReportMockStore.getState().products || []).find((x) => x.id === pid);
    return p ? p.name : pid;
  }, altProductId);
  await selectProductInModal(page, altProductId);

  const afterSelectStore = await readStoreProducts(page, fixture.publishedId);
  const storeUnchanged = JSON.stringify(afterSelectStore.units) === JSON.stringify(beforeSelect.units);
  record('store products unchanged after picker select', storeUnchanged);

  const uiAfterSelect = await sessionUiState(page);
  record('save products button visible after select', uiAfterSelect.saveVisible);
  record('recommendations shows unsaved tag', uiAfterSelect.hasUnsavedTag);
  record('recommendations shows selected product name', uiAfterSelect.primaryText === altProductName, uiAfterSelect.primaryText);

  await switchModule(page, 'assessment');
  await switchModule(page, 'recommendations');
  const uiAfterSwitch = await sessionUiState(page);
  record('module switch preserves unsaved product session', uiAfterSwitch.hasUnsavedTag && uiAfterSwitch.primaryText === altProductName, JSON.stringify(uiAfterSwitch));

  // ── B. Save products: updates current report only, versions/correction unchanged ──
  const versionBeforeSave = {
    workingVersion: beforeSelect.workingVersion,
    publishedVersion: beforeSelect.publishedVersion,
    correctionDraftActive: beforeSelect.correctionDraftActive
  };
  await clickSaveProducts(page);
  const afterSave = await readStoreProducts(page, fixture.publishedId);
  const otherAfterSave = await readStoreProducts(page, fixture.otherReportId);
  const targetUnit = afterSave.units.find((u) => u.phylumKey === pick.phylumKey) || afterSave.units[0];
  record('save updates primary product in store', targetUnit && targetUnit.primaryProductId === altProductId, targetUnit && targetUnit.primaryProductId);
  record('working version unchanged after product save', afterSave.workingVersion === versionBeforeSave.workingVersion, `${afterSave.workingVersion} vs ${versionBeforeSave.workingVersion}`);
  record('published version unchanged after product save', afterSave.publishedVersion === versionBeforeSave.publishedVersion);
  record('correction flag unchanged after product save', afterSave.correctionDraftActive === versionBeforeSave.correctionDraftActive);
  record('other report products unchanged', JSON.stringify(otherAfterSave.units) === JSON.stringify(otherBefore.units));

  const uiAfterSave = await sessionUiState(page);
  record('save clears unsaved product session UI', !uiAfterSave.hasUnsavedTag && !uiAfterSave.saveVisible);

  // ── C. Correction draft: product-only save does not publish professional edits ──
  if (fixture.correctionReportId) {
    await page.evaluate(() => window.PetReportMockStore.reset());
    await gotoReview(page, fixture.correctionReportId, 'assessment');
    const profBefore = await readStoreProducts(page, fixture.correctionReportId);
    const marker = 'PRODUCT-ISOLATION-MARKER-' + Date.now();
    await page.evaluate((text) => {
      const mount = window.PetAdminSession.getActiveTab().mount;
      const ta = mount.querySelector('#assess-summary');
      ta.value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, marker);

    await switchModule(page, 'recommendations');
    const pick2 = await pickAlternateProduct(page);
    record('correction report product picker opens', pick2.ok, pick2.reason || pick2.phylumKey);
    const alt2 = await chooseDifferentPrimaryProduct(page, fixture.correctionReportId, pick2.phylumKey);
    await selectProductInModal(page, alt2);

    const storeMid = await readStoreProducts(page, fixture.correctionReportId);
    record('professional summary unchanged in store before product save', storeMid.summary === profBefore.summary, `${storeMid.summary} vs ${profBefore.summary}`);
    record('products unchanged in store before product save', JSON.stringify(storeMid.units) === JSON.stringify(profBefore.units));

    await clickSaveProducts(page);
    const storeAfterProductOnly = await readStoreProducts(page, fixture.correctionReportId);
    record('product-only save updates store products', JSON.stringify(storeAfterProductOnly.units) !== JSON.stringify(profBefore.units));
    record('product-only save keeps professional summary', storeAfterProductOnly.summary === profBefore.summary, storeAfterProductOnly.summary);

    const domSummary = await page.evaluate(() => {
      const mount = window.PetAdminSession.getActiveTab().mount;
      const ta = mount.querySelector('#assess-summary');
      return ta ? ta.value : null;
    });
    record('unsaved professional text remains in form after product save', domSummary === marker, domSummary);

    // ── D. Professional draft save does not save product session ──
    await switchModule(page, 'recommendations');
    const pick3 = await pickAlternateProduct(page);
    const alt3 = await chooseDifferentPrimaryProduct(page, fixture.correctionReportId, pick3.phylumKey);
    await selectProductInModal(page, alt3);
    const prodBeforeDraft = await readStoreProducts(page, fixture.correctionReportId);
    await switchModule(page, 'assessment');
    await clickSaveDraft(page);
    const prodAfterDraft = await readStoreProducts(page, fixture.correctionReportId);
    record('draft save persists professional summary', prodAfterDraft.summary === marker, prodAfterDraft.summary);
    record('draft save does not persist unsaved product session', JSON.stringify(prodAfterDraft.units) === JSON.stringify(prodBeforeDraft.units));

    await switchModule(page, 'recommendations');
    const uiDraft = await sessionUiState(page);
    record('product session still dirty after draft save', uiDraft.saveVisible || uiDraft.hasUnsavedTag, JSON.stringify(uiDraft));
  } else {
    record('correction draft fixture available', false, 'report-004 missing');
  }

  await browser.close();

  const report = {
    base: BASE,
    fixture,
    passed,
    failed,
    total: passed + failed,
    cases,
    consoleErrors: [...new Set(consoleErrors)],
    pageErrors: [...new Set(pageErrors)],
    failedRequests: failedRequests.filter((r) => !/favicon|analytics/.test(r.url))
  };
  fs.writeFileSync(path.join(EVIDENCE, 'products-results.json'), JSON.stringify(report, null, 2));
  console.log('\n---', passed, 'passed,', failed, 'failed ---');
  if (consoleErrors.length) console.log('console errors:', [...new Set(consoleErrors)]);
  if (pageErrors.length) console.log('page errors:', [...new Set(pageErrors)]);
  if (failedRequests.length) console.log('failed requests:', failedRequests.slice(0, 5));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
