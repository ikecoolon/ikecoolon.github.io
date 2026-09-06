#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const SCREEN = path.join(OUT, 'screenshots');
const PW = '/Users/zhaoyanlong/.npm/_npx/420ff84f11983ee5/node_modules/playwright';
const BASE = 'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html#report-review?reportId=report-003';

const cases = [];
let passed = 0;
let failed = 0;

function record(name, ok, detail) {
  cases.push({ name, ok, detail: detail || '' });
  if (ok) { passed++; console.log('OK:', name, detail ? `(${detail})` : ''); }
  else { failed++; console.error('FAIL:', name, detail || ''); }
}

async function gotoReview(page) {
  await page.goto(BASE.split('#')[0] + '#' + BASE.split('#')[1], { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.PetReportMockStore && typeof window.initReportReview === 'function');
  await page.waitForSelector('#rw-workbench', { timeout: 30000 });
  await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const btn = mount.querySelector('[data-module-id="assessment"]');
    if (btn) btn.click();
  });
  await page.waitForFunction(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    return mount && mount.querySelector('#assess-summary');
  }, { timeout: 20000 });
}

async function screenshotWorkbench(page, name, width, height) {
  await page.setViewportSize({ width, height: height || 900 });
  await page.waitForTimeout(300);
  const clip = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const wb = mount.querySelector('#rw-workbench');
    if (!wb) return null;
    const r = wb.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: Math.min(r.height, 820) };
  });
  const file = path.join(SCREEN, `${name}-${width}.png`);
  if (clip && clip.width > 0) {
    await page.screenshot({ path: file, clip });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  return file;
}

async function main() {
  const playwright = require(PW);
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await gotoReview(page);

  const shots = [];
  for (const [w, h] of [[1440, 900], [1024, 900], [390, 844], [1280, 520]]) {
    shots.push(await screenshotWorkbench(page, 'report-review', w, h));
  }
  record('screenshots captured', shots.every((f) => fs.existsSync(f)), shots.map((f) => path.basename(f)).join(', '));

  const layout1440 = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const wb = mount.querySelector('#rw-workbench');
    const cs = getComputedStyle(wb);
    const center = mount.querySelector('.rw-center');
    const centerRect = center.getBoundingClientRect();
    const summary = mount.querySelector('#assess-summary');
    const summaryRect = summary ? summary.getBoundingClientRect() : null;
    const preview = mount.querySelector('#rw-preview-pane');
    const previewRect = preview ? preview.getBoundingClientRect() : null;
    return {
      gridCols: cs.gridTemplateColumns,
      centerWidth: centerRect.width,
      summaryVisible: summaryRect && summaryRect.width > 50 && summaryRect.height > 20,
      previewVisible: previewRect && previewRect.width > 50,
      pageContainer: getComputedStyle(mount.querySelector('.rw-page')).containerType
    };
  });
  record('1440 grid has preview column', /393px|var\(--rw-preview-width\)/.test(layout1440.gridCols) || layout1440.previewVisible, layout1440.gridCols);
  record('1440 center content visible', layout1440.centerWidth > 200 && layout1440.summaryVisible, JSON.stringify(layout1440));
  record('container on .rw-page not workbench', layout1440.pageContainer === 'inline-size', layout1440.pageContainer);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const layout390 = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const wb = mount.querySelector('#rw-workbench');
    const cs = getComputedStyle(wb);
    const center = mount.querySelector('.rw-center');
    const centerRect = center.getBoundingClientRect();
    const summary = mount.querySelector('#assess-summary');
    const summaryRect = summary ? summary.getBoundingClientRect() : null;
    const nav = mount.querySelector('#rw-module-nav');
    const navCs = getComputedStyle(nav);
    const toggle = mount.querySelector('#btn-preview-drawer-open');
    const toggleCs = getComputedStyle(toggle);
    const modules = [...mount.querySelectorAll('.rw-module-nav-btn')].map((b) => b.textContent.trim());
    return {
      gridCols: cs.gridTemplateColumns,
      navFlexDir: navCs.flexDirection,
      centerWidth: centerRect.width,
      summaryVisible: summaryRect && summaryRect.width > 50 && summaryRect.height > 20,
      toggleDisplay: toggleCs.display,
      moduleCount: modules.length
    };
  });
  record('390 single-column grid', layout390.gridCols.split(' ').length <= 2, layout390.gridCols);
  record('390 horizontal nav', layout390.navFlexDir === 'row', layout390.navFlexDir);
  record('390 center content visible', layout390.centerWidth > 100 && layout390.summaryVisible, JSON.stringify(layout390));
  record('390 all 6 modules reachable', layout390.moduleCount >= 6, String(layout390.moduleCount));
  record('390 preview toggle visible', layout390.toggleDisplay === 'flex', layout390.toggleDisplay);

  const drawerOpen = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const openBtn = mount.querySelector('#btn-preview-drawer-open');
    openBtn.click();
    const pane = mount.querySelector('#rw-preview-pane');
    return pane.classList.contains('is-drawer-open');
  });
  record('preview drawer opens on click', drawerOpen);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREEN, 'report-review-390-drawer-open.png'), fullPage: false });

  const drawerClose = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const closeBtn = mount.querySelector('#btn-preview-drawer-close');
    closeBtn.click();
    const pane = mount.querySelector('#rw-preview-pane');
    return !pane.classList.contains('is-drawer-open');
  });
  record('preview drawer closes on click', drawerClose);

  await page.setViewportSize({ width: 1280, height: 520 });
  await page.waitForTimeout(300);
  const layout1280low = await page.evaluate(() => {
    const mount = window.PetAdminSession.getActiveTab().mount;
    const summary = mount.querySelector('#assess-summary');
    const summaryRect = summary ? summary.getBoundingClientRect() : null;
    const center = mount.querySelector('.rw-center');
    const centerRect = center.getBoundingClientRect();
    return {
      centerWidth: centerRect.width,
      summaryVisible: summaryRect && summaryRect.width > 50 && summaryRect.height > 20
    };
  });
  record('1280x520 content visible', layout1280low.centerWidth > 100 && layout1280low.summaryVisible, JSON.stringify(layout1280low));

  await browser.close();

  const report = { base: BASE, passed, failed, total: passed + failed, cases, screenshots: fs.readdirSync(SCREEN) };
  fs.writeFileSync(path.join(OUT, 'workbench-finish-results.json'), JSON.stringify(report, null, 2));
  console.log('\n---', passed, 'passed,', failed, 'failed ---');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
