#!/usr/bin/env node
/**
 * Token 解析回归：admin CSS 中无 fallback 的 --rondo-* 须在 tokens.css 定义；
 * Playwright 校验菌群科普保存钮、规则编辑取消钮圆角/边框，以及 legacy overlay z-index。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const ADMIN_CSS_DIR = path.join(
  REPO_ROOT,
  'docs/.vuepress/public/prototype/admin/css'
);
const TOKENS_CSS = path.join(ADMIN_CSS_DIR, 'tokens.css');
const BASE =
  process.env.PET_ADMIN_BASE ||
  'http://127.0.0.1:8766/docs/.vuepress/public/prototype/admin/index.html';
const PLAYWRIGHT =
  process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhaoyanlong/.npm/_npx/420ff84f11983ee5/node_modules/playwright';

const SHELL_Z_INDEX_MAX = 200;
const MODAL_Z_INDEX = 1100;

const results = { passed: [], failed: [] };

function record(ok, name, detail) {
  const entry = { name, ok, detail: detail || '' };
  if (ok) results.passed.push(entry);
  else results.failed.push(entry);
  console.log((ok ? 'OK' : 'FAIL') + ':', name, detail || '');
}

function loadPlaywright() {
  return require(PLAYWRIGHT);
}

function readDefinedRondoTokens(tokensCss) {
  const defined = new Set();
  const re = /^\s*(--rondo-[a-z0-9-]+)\s*:/gm;
  let m;
  while ((m = re.exec(tokensCss)) !== null) {
    defined.add(m[1]);
  }
  return defined;
}

function collectBareRondoVarRefs(cssText) {
  const refs = new Set();
  const re = /var\(\s*(--rondo-[a-z0-9-]+)\s*(?:,|\))/g;
  let m;
  while ((m = re.exec(cssText)) !== null) {
    const tail = cssText.slice(m.index, m.index + 80);
    if (/var\(\s*--rondo-[a-z0-9-]+\s*,/.test(tail)) continue;
    refs.add(m[1]);
  }
  return refs;
}

function assertTokenDefinitions() {
  const tokensCss = fs.readFileSync(TOKENS_CSS, 'utf8');
  const defined = readDefinedRondoTokens(tokensCss);
  const cssFiles = fs
    .readdirSync(ADMIN_CSS_DIR)
    .filter((f) => f.endsWith('.css'))
    .map((f) => path.join(ADMIN_CSS_DIR, f));

  const missingByFile = {};
  for (const file of cssFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const bareRefs = collectBareRondoVarRefs(text);
    const missing = [...bareRefs].filter((name) => !defined.has(name));
    if (missing.length) missingByFile[path.basename(file)] = missing.sort();
  }

  const allMissing = Object.values(missingByFile).flat();
  record(
    allMissing.length === 0,
    'tokens: 无 fallback 的 --rondo-* 均在 tokens.css 定义',
    allMissing.length ? JSON.stringify(missingByFile) : `checked ${cssFiles.length} files`
  );

  record(
    defined.has('--rondo-radius') && defined.has('--rondo-z-modal'),
    'tokens: 桥接关键别名存在',
    `--rondo-radius=${defined.has('--rondo-radius')} --rondo-z-modal=${defined.has('--rondo-z-modal')}`
  );
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
  await page.waitForTimeout(400);
}

function parsePx(value) {
  const n = parseFloat(String(value || '0'));
  return Number.isFinite(n) ? n : 0;
}

async function assertMicrobiotaSaveButton(page) {
  await gotoHash(page, '#microbiota-knowledge');
  await page.waitForSelector('#mk-btn-save', { timeout: 20000 });
  const style = await page.locator('#mk-btn-save').evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      borderRadius: cs.borderRadius,
      borderTopWidth: cs.borderTopWidth,
      backgroundColor: cs.backgroundColor
    };
  });
  const radius = parsePx(style.borderRadius);
  record(radius >= 5, 'microbiota #mk-btn-save 圆角恢复', `borderRadius=${style.borderRadius}`);
  record(parsePx(style.borderTopWidth) >= 0, 'microbiota #mk-btn-save 可计算样式', JSON.stringify(style));
}

async function assertAnalysisRulesCancelButton(page) {
  await gotoHash(page, '#analysis-rules');
  await page.waitForSelector('#ar-list-mount .rondo-basic-table-wrap tbody tr', { timeout: 20000 });
  const editBtn = page.locator('[data-row-action="edit"]').first();
  if (await editBtn.count()) {
    await editBtn.click();
  } else {
    await page.locator('.rule-edit').first().click();
  }
  await page.waitForSelector('#cancel-form', { timeout: 15000 });
  const style = await page.locator('#cancel-form').evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      borderRadius: cs.borderRadius,
      borderTopWidth: cs.borderTopWidth,
      borderTopStyle: cs.borderTopStyle,
      borderTopColor: cs.borderTopColor
    };
  });
  const radius = parsePx(style.borderRadius);
  const borderW = parsePx(style.borderTopWidth);
  record(radius >= 5, 'analysis-rules #cancel-form 圆角恢复', `borderRadius=${style.borderRadius}`);
  record(
    borderW >= 1 && style.borderTopStyle !== 'none',
    'analysis-rules #cancel-form 边框恢复',
    JSON.stringify(style)
  );
}

async function assertLegacyOverlayZIndex(page) {
  await gotoHash(page, '#analysis-rules');
  const metrics = await page.evaluate((shellMax) => {
    const root = document.documentElement;
    const token = getComputedStyle(root).getPropertyValue('--rondo-z-modal').trim();
    const dialog = document.getElementById('rule-confirm-dialog');
    if (!dialog) return { token, error: 'no-dialog' };
    dialog.classList.remove('hidden');
    const z = parseInt(getComputedStyle(dialog).zIndex, 10);
    dialog.classList.add('hidden');
    const shellEls = Array.from(document.querySelectorAll('.rondo-sider, .rondo-header, .rondo-mobile-mask'));
    const shellMaxZ = shellEls.reduce((max, el) => {
      const zi = parseInt(getComputedStyle(el).zIndex, 10);
      return Number.isFinite(zi) ? Math.max(max, zi) : max;
    }, 0);
    return { token, z, shellMaxZ, shellMax };
  }, SHELL_Z_INDEX_MAX);

  const tokenZ = parseInt(metrics.token, 10);
  record(
    tokenZ === MODAL_Z_INDEX,
    'tokens --rondo-z-modal 对齐 rondo-modal-root',
    `token=${metrics.token} expected=${MODAL_Z_INDEX}`
  );
  record(
    metrics.z >= SHELL_Z_INDEX_MAX,
    'legacy overlay z-index 不低于壳层',
    JSON.stringify(metrics)
  );
}

async function main() {
  assertTokenDefinitions();

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  try {
    await assertMicrobiotaSaveButton(page);
    await assertAnalysisRulesCancelButton(page);
    await assertLegacyOverlayZIndex(page);
  } finally {
    await browser.close();
  }

  const outPath = path.join(__dirname, 'tokens-contract-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('\nResults:', outPath);
  console.log('Passed:', results.passed.length, 'Failed:', results.failed.length);
  process.exit(results.failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
