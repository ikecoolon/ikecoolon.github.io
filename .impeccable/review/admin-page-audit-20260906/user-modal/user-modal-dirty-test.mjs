#!/usr/bin/env node
/**
 * 登记平台用户 Modal dirty 行为回归（三视口）
 * 空表单取消直接关闭；有输入后取消需确认；拒绝确认保留值；新开干净；ownerTab 星号同步。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const outDir = path.join(__dirname, 'evidence');
const base =
  process.env.PET_ADMIN_BASE ||
  'http://127.0.0.1:8766/docs/.vuepress/public/prototype/admin/index.html';
const PLAYWRIGHT =
  process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhaoyanlong/.npm/_npx/420ff84f11983ee5/node_modules/playwright';

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 900 },
  { name: '390', width: 390, height: 900 }
];

function loadPlaywright() {
  return require(PLAYWRIGHT);
}

function record(results, ok, name, detail) {
  (ok ? results.passed : results.failed).push({ name, detail: detail || '' });
  console.log((ok ? 'OK' : 'FAIL') + ':', name, detail || '');
}

async function gotoHash(page, hash) {
  const url = base.split('#')[0] + (hash.startsWith('#') ? hash : '#' + hash);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function dismissAllModals(page) {
  for (let i = 0; i < 8; i++) {
    const count = await page.locator('.rondo-modal-root').count();
    if (!count) return;
    const root = page.locator('.rondo-modal-root').last();
    const title = await root.locator('.rondo-modal-header').textContent().catch(() => '');
    if (title && title.includes('确认')) {
      await root.locator('[data-action="ok"]').click({ timeout: 2000 }).catch(() => {});
    } else {
      await root.locator('[data-action="cancel"]').click({ timeout: 2000 }).catch(() => {});
    }
    await page.waitForTimeout(250);
  }
  if (await page.locator('.rondo-modal-root').count()) {
    await page.evaluate(() => {
      document.querySelectorAll('.rondo-modal-root').forEach((el) => el.remove());
    });
  }
}

async function openCreateModal(page) {
  await page.click('#up-btn-create-user');
  await page.waitForSelector('.rondo-modal-root .rondo-modal');
  return page.locator('.rondo-modal-root').last();
}

async function ownerTabDirty(page) {
  return page.evaluate(() => {
    const tab = document.querySelector('.admin-tab.is-active');
    return tab ? tab.classList.contains('is-dirty') : false;
  });
}

async function testViewport(browser, viewport, results) {
  const label = '@' + viewport.name;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }
  });
  const page = await context.newPage();

  await gotoHash(page, '#user-pets?view=users');
  await page.waitForSelector('#up-btn-create-user');

  // 空表单取消：直接关闭，无确认层
  const createModal = await openCreateModal(page);
  record(results, !(await ownerTabDirty(page)), label + ': 打开空 Modal 无 ownerTab 星号', '');
  await createModal.locator('[data-action="cancel"]').click();
  await page.waitForTimeout(400);
  const modalCountAfterEmptyCancel = await page.locator('.rondo-modal-root').count();
  record(results, modalCountAfterEmptyCancel === 0, label + ': 空表单取消直接关闭', 'roots=' + modalCountAfterEmptyCancel);

  // 新开干净：再次打开仍无星号
  await openCreateModal(page);
  record(results, !(await ownerTabDirty(page)), label + ': 再次打开空 Modal 仍无星号', '');
  await dismissAllModals(page);

  // 有输入：星号出现
  const dirtyModal = await openCreateModal(page);
  await page.fill('#up-create-phone', '13900001111');
  await page.waitForTimeout(150);
  record(results, await ownerTabDirty(page), label + ': 输入后 ownerTab 星号', '');

  // 取消 → 确认层；拒绝确认保留值
  await dirtyModal.locator('[data-action="cancel"]').click();
  await page.waitForTimeout(300);
  const confirmVisible = await page.locator('.rondo-modal-root').count() >= 2;
  record(results, confirmVisible, label + ': 有输入取消弹出确认层', 'roots=' + (await page.locator('.rondo-modal-root').count()));

  const confirmModal = page.locator('.rondo-modal-root').last();
  await confirmModal.locator('[data-action="cancel"]').click();
  await page.waitForTimeout(300);
  const stillOpen = await page.locator('.rondo-modal-root').count() === 1;
  const phoneKept = (await page.inputValue('#up-create-phone')) === '13900001111';
  record(results, stillOpen && phoneKept, label + ': 拒绝确认保留 Modal 与输入值', 'open=' + stillOpen + ' phone=' + phoneKept);

  // 确认关闭
  await dirtyModal.locator('[data-action="cancel"]').click();
  await page.waitForTimeout(300);
  await page.locator('.rondo-modal-root').last().locator('[data-action="ok"]').click();
  await page.waitForTimeout(400);
  record(results, (await page.locator('.rondo-modal-root').count()) === 0, label + ': 确认关闭后 Modal 消失', '');
  record(results, !(await ownerTabDirty(page)), label + ': 关闭后 ownerTab 星号清除', '');

  await context.close();
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const pw = loadPlaywright();
  const results = { passed: [], failed: [], base, viewports: VIEWPORTS.map((v) => v.name) };
  const browser = await pw.chromium.launch({ channel: 'chrome', headless: true });

  for (const vp of VIEWPORTS) {
    await testViewport(browser, vp, results);
  }

  await browser.close();
  const report = {
    ok: results.failed.length === 0,
    passed: results.passed,
    failed: results.failed,
    summary: { passed: results.passed.length, failed: results.failed.length }
  };
  fs.writeFileSync(path.join(outDir, 'user-modal-dirty-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, passed: report.summary.passed, failed: report.summary.failed }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
