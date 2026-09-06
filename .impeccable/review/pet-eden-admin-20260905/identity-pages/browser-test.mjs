#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const outDir = path.join(__dirname, 'evidence');
const base = process.env.PET_ADMIN_BASE || 'http://127.0.0.1:8765/docs/.vuepress/public/prototype/admin/index.html';

function loadPlaywright() {
  for (const mod of ['/tmp/pet-eden-session-test/node_modules/playwright']) {
    try { return require(mod); } catch (e) { /* next */ }
  }
  throw new Error('playwright not found');
}

function assertOk(results, ok, msg) {
  (ok ? results.passed : results.failed).push(msg);
}

async function gotoHash(page, hash) {
  const url = base.split('#')[0] + (hash.startsWith('#') ? hash : '#' + hash);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
}

async function dismissAllModals(page) {
  for (let i = 0; i < 6; i++) {
    const count = await page.locator('.rondo-modal-root').count();
    if (!count) return;
    const root = page.locator('.rondo-modal-root').last();
    await root.locator('[data-action="cancel"]').click({ timeout: 2000 }).catch(async () => {
      await page.keyboard.press('Escape');
    });
    await page.waitForTimeout(200);
    const confirm = page.locator('.rondo-modal-root').last();
    if (await confirm.count()) {
      await confirm.locator('[data-action="ok"]').click({ timeout: 2000 }).catch(() => {});
    }
    await page.waitForTimeout(200);
  }
  if (await page.locator('.rondo-modal-root').count()) {
    await page.evaluate(() => {
      document.querySelectorAll('.rondo-modal-root').forEach((el) => el.remove());
    });
  }
}

async function collectCounts(page) {
  return page.evaluate(() => {
    const st = window.PetReportMockStore.getState();
    return { pets: (st.pets || []).length, records: (st.testRecords || []).length, users: (st.users || []).length };
  });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const pw = loadPlaywright();
  const results = { passed: [], failed: [], consoleErrors: [], pageErrors: [] };
  const browser = await pw.chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (/identity-pages\.css/.test(url)) return;
    results.consoleErrors.push('requestfailed: ' + url);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/identity-pages\.css|favicon/.test(text)) return;
    results.consoleErrors.push(text);
  });
  page.on('pageerror', (e) => results.pageErrors.push(String(e)));

  await gotoHash(page, '#user-pets?view=users');
  await page.waitForSelector('#up-users-list-mount button[data-row-action="view-user"]');
  assertOk(results, true, '用户列表加载');

  await page.fill('#rondo-search-user-pets-users-search', 'user');
  await page.click('#up-users-list-mount [data-search="submit"]');
  await page.waitForTimeout(300);
  await page.locator('#up-users-list-mount button[data-row-action="view-user"]').first().click();
  await page.waitForSelector('#up-user-detail:not(.hidden)');
  assertOk(results, true, '用户详情同页签打开');

  await page.click('#up-back-from-user');
  await page.waitForSelector('#up-list-view:not(.hidden)');
  assertOk(results, (await page.inputValue('#rondo-search-user-pets-users-search')) === 'user', '返回保留搜索');

  await page.click('#up-seg-pets');
  await page.waitForSelector('#up-pets-list-mount button[data-row-action="view-pet"]');
  assertOk(results, true, '宠物视图切换');

  const fixture = await page.evaluate(() => {
    const st = window.PetReportMockStore.getState();
    const user = (st.users || [])[0];
    const pet = (st.pets || []).find((p) => p.userId && p.claimStatus === 'bound');
    return { userId: user?.id, petId: pet?.id, userPhone: user?.phone };
  });

  await page.locator('#up-pets-list-mount button[data-row-action="view-pet"]').first().click();
  await page.waitForSelector('#up-pet-detail:not(.hidden)');
  const detailPetId = decodeURIComponent(await page.evaluate(() => window.location.hash.match(/id=([^&]+)/)[1]));
  await page.click('#up-btn-pet-register');
  await page.waitForSelector('.rondo-modal-root');
  assertOk(results, (await page.inputValue('#dr-reg-pet-id')) === detailPetId, '宠物详情预填 petId');
  await dismissAllModals(page);

  await gotoHash(page, '#user-pets?detail=user&id=' + encodeURIComponent(fixture.userId));
  await page.click('#up-btn-user-register');
  await page.waitForSelector('.rondo-modal-root');
  await page.locator('.rondo-modal-root').last().locator('input[name="dr-reg-mode"][value="new"]').click();
  assertOk(results, (await page.inputValue('#dr-reg-phone')) === fixture.userPhone, '用户详情新建模式预填手机号');
  await dismissAllModals(page);

  const dupPhone = '13900139001';
  await gotoHash(page, '#user-pets?view=users');
  await page.click('#up-btn-create-user');
  await page.fill('#up-create-phone', dupPhone);
  await page.fill('#up-create-name', '第一次');
  await page.locator('.rondo-modal-root [data-action="ok"]').click();
  await page.waitForSelector('#up-user-detail:not(.hidden)');
  const firstId = await page.evaluate(() => window.location.hash.match(/id=([^&]+)/)[1]);
  await page.click('#up-back-from-user');
  await page.click('#up-btn-create-user');
  await page.fill('#up-create-phone', dupPhone);
  await page.fill('#up-create-name', '第二次');
  await page.locator('.rondo-modal-root [data-action="ok"]').click();
  await page.waitForSelector('#up-user-detail:not(.hidden)');
  const secondId = await page.evaluate(() => window.location.hash.match(/id=([^&]+)/)[1]);
  const dupName = await page.evaluate((id) => window.PetAdminCommon.lookupUser(window.PetReportMockStore.getState(), decodeURIComponent(id)).name, firstId);
  assertOk(results, firstId === secondId, '同手机号复用同一 ID');
  assertOk(results, dupName !== '第二次', '已有资料不覆盖');

  const beforeCancel = await collectCounts(page);
  await gotoHash(page, '#detection-records?action=register');
  await page.waitForSelector('.rondo-modal-root');
  const regModal = page.locator('.rondo-modal-root').last();
  await regModal.locator('input[name="dr-reg-mode"][value="new"]').click();
  await page.fill('#dr-reg-phone', '13900990099');
  await page.fill('#dr-reg-pet-name', '取消测试宠');
  await dismissAllModals(page);
  const afterCancel = await collectCounts(page);
  assertOk(results, afterCancel.pets === beforeCancel.pets && afterCancel.records === beforeCancel.records, '登记取消无孤儿');

  const beforeOk = await collectCounts(page);
  await gotoHash(page, '#detection-records?action=register');
  await page.waitForSelector('.rondo-modal-root');
  await page.locator('.rondo-modal-root').last().locator('input[name="dr-reg-mode"][value="new"]').click();
  await page.fill('#dr-reg-phone', '13900990123');
  await page.fill('#dr-reg-pet-name', '成功测试宠');
  await page.locator('.rondo-modal-root').last().locator('[data-action="ok"]').click();
  await page.waitForTimeout(800);
  const afterOk = await collectCounts(page);
  assertOk(results, afterOk.pets === beforeOk.pets + 1, '登记成功新增宠物');
  assertOk(results, afterOk.records === beforeOk.records + 1, '登记成功新增送检记录');

  for (const vp of [{ width: 1440, height: 900, name: '1440' }, { width: 390, height: 844, name: '390' }]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await gotoHash(page, '#detection-records?action=register');
    await page.waitForSelector('.rondo-modal-root');
    await page.screenshot({ path: path.join(outDir, 'register-modal-' + vp.name + '.png') });
    await dismissAllModals(page);
    await gotoHash(page, '#user-pets?detail=pet&id=' + encodeURIComponent(detailPetId));
    await page.waitForSelector('#up-pet-detail:not(.hidden)');
    await page.screenshot({ path: path.join(outDir, 'pet-detail-' + vp.name + '.png') });
  }

  assertOk(results, results.pageErrors.length === 0, '无 pageerror');
  assertOk(results, results.consoleErrors.filter((e) => !/Failed to load resource|favicon|identity-pages/.test(e)).length === 0, '无业务 console.error');

  await browser.close();
  const report = { ok: results.failed.length === 0, passed: results.passed, failed: results.failed, consoleErrors: results.consoleErrors, pageErrors: results.pageErrors };
  fs.writeFileSync(path.join(outDir, 'identity-pages-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, passed: report.passed.length, failed: report.failed.length, failedItems: report.failed }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
