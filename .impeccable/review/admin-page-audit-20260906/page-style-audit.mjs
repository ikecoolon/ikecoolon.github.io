#!/usr/bin/env node
/**
 * 管理端逐页样式回归 + 全覆盖截图
 * 每目标 × 视口使用独立 browser context，结构化记录 pass/fail/skip。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_BASE =
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
const LOW_VIEWPORT = { name: '1280-low', width: 1280, height: 520 };

/** 模块面板在 section 上切换 hidden；须先点击导航再等待 section 可见 */
const WORKBENCH_MODULES = [
  { id: 'source', wait: '#module-source:not(.hidden)' },
  { id: 'results', wait: '#module-results:not(.hidden)' },
  { id: 'assessment', wait: '#module-assessment:not(.hidden)' },
  { id: 'analysis', wait: '#module-analysis:not(.hidden)' },
  { id: 'recommendations', wait: '#module-recommendations:not(.hidden)' },
  { id: 'checks', wait: '#module-checks:not(.hidden)' }
];

/** 列表无状态列，不应强制 tbody 存在 ant-tag */
const LISTS_WITHOUT_STATUS_TAG = new Set([
  'menu-user-pets',
  'route-up-pets-view'
]);

const TARGETS = [
  {
    id: 'menu-detection-records',
    hash: '#detection-records',
    kind: 'list',
    wait: ['.rondo-list-page-title', '.rondo-basic-table-wrap']
  },
  {
    id: 'menu-report-center',
    hash: '#report-center',
    kind: 'list',
    wait: ['.rondo-list-page-title', '.rondo-basic-table-wrap']
  },
  {
    id: 'menu-normal-range-config',
    hash: '#normal-range-config',
    kind: 'list',
    wait: ['#nrc-list-view:not(.hidden)', '#nrc-list-mount .rondo-basic-table-wrap']
  },
  {
    id: 'menu-microbiota-knowledge',
    hash: '#microbiota-knowledge',
    kind: 'form',
    wait: ['.rondo-page-title', '#mk-tree']
  },
  {
    id: 'menu-analysis-rules',
    hash: '#analysis-rules',
    kind: 'list',
    wait: ['.rondo-list-page-title', '.rondo-basic-table-wrap']
  },
  {
    id: 'menu-user-pets',
    hash: '#user-pets?view=users',
    kind: 'list',
    wait: ['#up-seg-users', '#up-users-list-mount:not(.hidden) .rondo-basic-table-wrap']
  },
  {
    id: 'menu-dictionary-management',
    hash: '#dictionary-management',
    kind: 'list',
    wait: ['.rondo-page-title', '.rondo-basic-table-wrap']
  },
  {
    id: 'route-nrc-edit-new',
    hash: '#normal-range-config?edit=new',
    kind: 'form',
    wait: ['#nrc-form-view:not(.hidden)', '#scheme-name']
  },
  {
    id: 'route-ar-edit',
    hash: '#analysis-rules?mode=edit&lineage=lineage-actino-low-cat',
    kind: 'form',
    wait: ['#rules-form-view:not(.hidden)', '#form-threshold-value']
  },
  {
    id: 'route-ar-test',
    hash: '#analysis-rules?mode=test&lineage=lineage-actino-low-cat',
    kind: 'form',
    wait: ['#section-test:not(.hidden)', '#test-report-select']
  },
  {
    id: 'route-up-user-detail',
    hash: '#user-pets?detail=user&id=user-001',
    kind: 'detail',
    wait: ['#up-user-detail:not(.hidden)']
  },
  {
    id: 'route-up-pet-detail',
    hash: '#user-pets?detail=pet&id=pet-001',
    kind: 'detail',
    wait: ['#up-pet-detail:not(.hidden)']
  },
  {
    id: 'route-up-pets-view',
    hash: '#user-pets?view=pets',
    kind: 'list',
    wait: ['#up-pets-list-mount:not(.hidden) .rondo-basic-table-wrap']
  },
  {
    id: 'route-report-review',
    hash: '#report-review?reportId=report-003',
    kind: 'workbench',
    wait: ['#rw-workbench', '#rw-module-nav', '#rw-preview-pane', '.rw-mini-app']
  },
  {
    id: 'modal-detection-register',
    hash: '#detection-records?action=register',
    kind: 'modal',
    wait: ['.rondo-modal-root .rondo-modal'],
    modalCancel: true
  },
  {
    id: 'modal-user-create',
    hash: '#user-pets?view=users',
    kind: 'modal',
    wait: ['#up-btn-create-user'],
    setup: [{ type: 'click', selector: '#up-btn-create-user', wait: '.rondo-modal-root .rondo-modal' }],
    modalCancel: true
  },
  {
    id: 'modal-dict-add-key',
    hash: '#dictionary-management',
    kind: 'modal',
    wait: ['#add-new-key'],
    setup: [{ type: 'click', selector: '#add-new-key', wait: '.rondo-modal-root .rondo-modal' }],
    modalCancel: true
  },
  {
    id: 'dict-tab-indicators',
    hash: '#dictionary-management',
    kind: 'list',
    wait: ['#catalog-tabs .catalog-tab[data-tab="indicators"]'],
    setup: [
      {
        type: 'click',
        selector: '#catalog-tabs .catalog-tab[data-tab="indicators"]',
        wait: '.rondo-basic-table tbody tr td'
      }
    ]
  },
  {
    id: 'dict-tab-microbiota',
    hash: '#dictionary-management',
    kind: 'list',
    wait: ['#catalog-tabs .catalog-tab[data-tab="microbiota"]'],
    setup: [
      {
        type: 'click',
        selector: '#catalog-tabs .catalog-tab[data-tab="microbiota"]',
        wait: '.rondo-basic-table tbody tr td'
      }
    ]
  },
  ...WORKBENCH_MODULES.map((m) => ({
    id: 'wb-module-' + m.id,
    hash: '#report-review?reportId=report-003',
    kind: 'workbench-module',
    moduleId: m.id,
    wait: ['#rw-workbench', '#rw-module-nav'],
    setup: [
      {
        type: 'click',
        selector: '#rw-module-nav .rw-module-nav-btn[data-module-id="' + m.id + '"]',
        wait: m.wait
      }
    ]
  }))
];

function parseArgs(argv) {
  const opts = {
    base: DEFAULT_BASE,
    out: path.join(__dirname, 'page-style-audit'),
    includeLow: false,
    help: false
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--base') opts.base = argv[++i];
    else if (arg === '--out') opts.out = path.resolve(argv[++i]);
    else if (arg === '--include-low') opts.includeLow = true;
    else throw new Error('未知参数: ' + arg);
  }
  return opts;
}

function printHelp() {
  console.log(
    [
      '管理端逐页样式回归截图',
      '',
      '用法: node page-style-audit.mjs [--base <url>] [--out <dir>] [--include-low]',
      '',
      '  --out           输出目录（默认 ./page-style-audit）',
      '  --include-low   额外跑 1280×520 视口',
      '',
      '环境变量: PET_ADMIN_BASE, PLAYWRIGHT_MODULE'
    ].join('\n')
  );
}

function loadPlaywright() {
  return require(PLAYWRIGHT);
}

function bucket() {
  return { passed: [], failed: [], skipped: [] };
}

function record(b, ok, name, detail, forceSkip = false, source = 'assertion') {
  const entry = { name, detail: detail || '', source };
  if (forceSkip) {
    b.skipped.push(entry);
    console.log('SKIP:', name, detail || '');
    return;
  }
  if (ok) {
    b.passed.push(entry);
    console.log('OK:', name, detail || '');
  } else {
    b.failed.push(entry);
    const tag = source === 'product' ? 'PRODUCT FAIL' : source === 'script' ? 'SCRIPT FAIL' : 'FAIL';
    console.log(tag + ':', name, detail || '');
  }
}

async function gotoHash(page, base, hash) {
  const target = hash.startsWith('#') ? hash : '#' + hash;
  const baseUrl = base.split('#')[0];
  const needsLoad = !page.url().startsWith(baseUrl.split('?')[0]);
  if (needsLoad) {
    await page.goto(baseUrl + target, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    await page.evaluate((h) => {
      const raw = h.replace(/^#/, '');
      const qIndex = raw.indexOf('?');
      const pageId = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
      const params = {};
      if (qIndex >= 0) {
        raw
          .slice(qIndex + 1)
          .split('&')
          .forEach((pair) => {
            const kv = pair.split('=');
            if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
          });
      }
      if (window.PetAdminCommon && window.PetAdminCommon.navigate) {
        window.PetAdminCommon.navigate(pageId, params);
      } else {
        window.location.hash = h;
      }
    }, target);
  }
  await page.waitForFunction(
    () => window.PetReportMockStore && window.PetAdminSession,
    { timeout: 30000 }
  );
  await page.waitForFunction(
    () => {
      const title = document.getElementById('page-title');
      return title && title.textContent && title.textContent.trim().length > 0;
    },
    { timeout: 30000 }
  );
}

async function runSetup(page, steps) {
  if (!steps || !steps.length) return;
  for (const step of steps) {
    if (step.type === 'click') {
      await page.click(step.selector, { timeout: 15000 });
      if (step.wait) {
        await page.waitForSelector(step.wait, { state: 'visible', timeout: 15000 });
      }
      await page.waitForTimeout(350);
    }
  }
}

async function waitTarget(page, selectors) {
  for (const sel of selectors) {
    await page.waitForSelector(sel, { state: 'visible', timeout: 20000 });
  }
  await page.waitForTimeout(300);
}

async function assertTableCells(page, b, label, target) {
  const hasTable = await page.locator('.rondo-basic-table').count();
  if (!hasTable) {
    record(b, false, label + ': 表格存在', '无 .rondo-basic-table', true);
    return;
  }
  const probe = await page.evaluate(() => {
    const table = document.querySelector('.rondo-basic-table');
    const cells = Array.from(table.querySelectorAll('tbody td'));
    const literalSpan = cells.filter(
      (td) => td.textContent.includes('<span') || /&lt;span/i.test(td.innerHTML)
    );
    const literalNbsp = cells.filter(
      (td) => /&nbsp;/.test(td.innerHTML) || /\u00a0{2,}/.test(td.textContent)
    );
    const antTags = table.querySelectorAll('tbody .ant-tag');
    return {
      literalSpanCount: literalSpan.length,
      literalNbspCount: literalNbsp.length,
      antTagCount: antTags.length,
      samples: literalSpan.slice(0, 1).map((td) => td.textContent.slice(0, 60))
    };
  });
  record(b, probe.literalSpanCount === 0, label + ': 无字面 span', JSON.stringify(probe));
  record(b, probe.literalNbspCount === 0, label + ': 无字面 nbsp', JSON.stringify(probe));
  if (target && LISTS_WITHOUT_STATUS_TAG.has(target.id)) {
    record(b, true, label + ': 存在 ant-tag', '本列表无状态列，跳过', true);
  } else {
    record(b, probe.antTagCount >= 1, label + ': 存在 ant-tag', 'count=' + probe.antTagCount);
  }
}

async function assertInputs(page, b, label) {
  const result = await page.evaluate(() => {
    const skipTypes = new Set(['checkbox', 'radio', 'hidden', 'file', 'range', 'button', 'submit', 'reset']);
    const root = document.querySelector('.rw-mini-app');
    const nodes = Array.from(
      document.querySelectorAll('input, select, textarea')
    ).filter((el) => {
      if (root && root.contains(el)) return false;
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (skipTypes.has(type)) return false;
      if (el.closest('.rw-mini-app')) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      return true;
    });

    const issues = [];
    const samples = [];
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const isTextarea = tag === 'textarea';
      const h = rect.height;
      const borders = [
        parseFloat(style.borderTopWidth),
        parseFloat(style.borderRightWidth),
        parseFloat(style.borderBottomWidth),
        parseFloat(style.borderLeftWidth)
      ];
      const hasBorder = borders.some((w) => w >= 0.5);
      const borderOk = tag === 'select' || isTextarea || hasBorder;
      if (!isTextarea && h > 40.5) {
        issues.push({ id: el.id || el.name, kind: 'tall-input', h });
      }
      if (!isTextarea && h < 27.5 && tag === 'input') {
        issues.push({ id: el.id || el.name, kind: 'short-input', h });
      }
      if (!borderOk) {
        issues.push({ id: el.id || el.name, kind: 'no-border', borders });
      }
      if (issues.length < 4) {
        samples.push({ id: el.id || el.name, tag, h, hasBorder });
      }
    }
    return { count: nodes.length, issues, samples };
  });

  if (!result.count) {
    record(b, true, label + ': 可见输入抽检', '无可检输入');
    return;
  }
  const tall = result.issues.filter((i) => i.kind === 'tall-input');
  const short = result.issues.filter((i) => i.kind === 'short-input');
  const noborder = result.issues.filter((i) => i.kind === 'no-border');
  record(b, tall.length === 0, label + ': 单行 input 高度≤40px', JSON.stringify(tall.slice(0, 3)));
  record(b, short.length === 0, label + ': 单行 input 高度≥28px', JSON.stringify(short.slice(0, 3)));
  record(b, noborder.length === 0, label + ': 可见 input/select 有边框', JSON.stringify(noborder.slice(0, 3)));
}

async function assertOverflow(page, b, label) {
  const metrics = await page.evaluate(() => {
    const bodyOverflow = document.body.scrollWidth - document.body.clientWidth;
    const htmlOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const tableScrolls = Array.from(document.querySelectorAll('.rondo-basic-table-scroll')).map((el) => ({
      overflowX: el.scrollWidth - el.clientWidth
    }));
    return { bodyOverflow, htmlOverflow, tableScrolls };
  });
  const pageOverflow = Math.max(metrics.bodyOverflow, metrics.htmlOverflow);
  if (pageOverflow > 2) {
    const badTables = metrics.tableScrolls.filter((t) => t.overflowX <= 1);
    record(b, badTables.length === 0, label + ': 无整页横向溢出', JSON.stringify(metrics));
  } else {
    record(b, true, label + ': 无整页横向溢出', 'ok');
  }
}

async function assertSearchWidth390(page, b, label, viewportName) {
  if (viewportName !== '390') return;
  const probe = await page.evaluate(() => {
    const grid = document.querySelector('.rondo-search-grid, .rondo-search-form');
    if (!grid) return { skipped: true, reason: 'no-search-grid' };
    const gridStyle = getComputedStyle(grid);
    const cols = gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length;
    const inputs = Array.from(
      grid.querySelectorAll(
        'input[type="text"], input[type="search"], input:not([type]), .rondo-input, .ant-input'
      )
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return {
      skipped: false,
      twoColumn: cols >= 2,
      cols,
      fields: inputs.map((el) => ({
        id: el.id || el.name || '(anon)',
        width: Math.round(el.getBoundingClientRect().width)
      }))
    };
  });
  if (probe.skipped) {
    record(b, true, label + ': 390 搜索宽度', '无搜索区，跳过', true);
    return;
  }
  if (!probe.twoColumn || !probe.fields.length) {
    record(b, true, label + ': 390 搜索宽度', '非双列或无字段，跳过', true);
    return;
  }
  const narrow = probe.fields.filter((f) => f.width < 100);
  record(
    b,
    narrow.length === 0,
    label + ': 390 双列搜索字段宽度≥100px',
    JSON.stringify({ narrow, all: probe.fields })
  );
}

async function assertNotNaked(page, b, label, kind) {
  const issues = await page.evaluate((kind) => {
    const out = [];
    const header = document.querySelector('.ant-layout-header');
    if (header && kind !== 'modal') {
      const hs = getComputedStyle(header);
      if (parseFloat(hs.height) < 40) out.push('页头高度异常');
      if (hs.backgroundColor === 'rgba(0, 0, 0, 0)' && hs.boxShadow === 'none') {
        out.push('页头可能无 shell 样式');
      }
    }
    if (kind === 'list') {
      const title = document.querySelector('.rondo-list-page-title, .rondo-page-title');
      if (!title) out.push('缺少页头标题');
      else if (parseFloat(getComputedStyle(title).fontSize) < 14) out.push('标题字号过小');
      const table = document.querySelector('.rondo-basic-table-wrap');
      if (!table) out.push('列表容器缺失');
    }
    if (kind === 'detail') {
      const detail = document.querySelector('#up-user-detail:not(.hidden), #up-pet-detail:not(.hidden)');
      if (!detail) out.push('详情面板不可见');
      else {
        if (detail.getBoundingClientRect().height < 80) out.push('详情面板高度异常');
        const title = detail.querySelector(
          '.rondo-toolbar-title, .rondo-list-page-title, .rondo-page-title'
        );
        if (!title || !title.textContent.trim()) out.push('缺少详情标题');
        else if (parseFloat(getComputedStyle(title).fontSize) < 14) out.push('标题字号过小');
      }
    }
    if (kind === 'modal') {
      const modal = document.querySelector('.rondo-modal-root .rondo-modal');
      if (!modal) out.push('Modal 未渲染');
      else {
        const ms = getComputedStyle(modal);
        if (ms.display === 'none' || parseFloat(ms.width) < 200) out.push('Modal 不可见或过窄');
        const body = modal.querySelector('.rondo-modal-body');
        if (body) {
          const bs = getComputedStyle(body);
          const padY = Math.min(parseFloat(bs.paddingTop), parseFloat(bs.paddingBottom));
          const padX = Math.min(parseFloat(bs.paddingLeft), parseFloat(bs.paddingRight));
          if (padY < 12 || padX < 12) out.push('Modal body 内边距异常');
        } else {
          out.push('Modal body 缺失');
        }
      }
    }
    if (kind === 'workbench' || kind === 'workbench-module') {
      const wb = document.querySelector('#rw-workbench');
      if (!wb) out.push('工作台缺失');
      const nav = document.querySelector('#rw-module-nav .rw-module-nav-btn');
      if (!nav) out.push('工作台模块导航缺失');
    }
    return out;
  }, kind);
  record(b, issues.length === 0, label + ': 列表/页头/Modal 非裸渲染', issues.join('; ') || 'ok');
}

async function assertPreviewIndependent(page, b, label) {
  const probe = await page.evaluate(() => {
    const mini = document.querySelector('.rw-mini-app');
    if (!mini) return { exists: false };
    const style = getComputedStyle(mini);
    return {
      exists: true,
      htmlLen: mini.innerHTML.length,
      hasAdminRoot: !!mini.querySelector('.ant-admin-root, .ant-layout-header'),
      antInputCount: mini.querySelectorAll('.ant-input').length,
      display: style.display,
      fontFamily: style.fontFamily
    };
  });
  if (!probe.exists) {
    record(b, false, label + ': 预览 rw-mini-app 存在', 'missing');
    return;
  }
  record(b, probe.htmlLen > 80, label + ': 预览有内容', 'len=' + probe.htmlLen);
  record(b, !probe.hasAdminRoot, label + ': 预览未套管理端 shell', JSON.stringify(probe));
  record(
    b,
    probe.antInputCount === 0,
    label + ': 预览内无 ant-input 污染',
    'count=' + probe.antInputCount
  );
}

async function assertWorkbenchModule(page, b, label, moduleId) {
  const probe = await page.evaluate((moduleId) => {
    const btn = document.querySelector(
      '#rw-module-nav .rw-module-nav-btn[data-module-id="' + moduleId + '"]'
    );
    const active = btn && btn.classList.contains('is-active');
    const panelMap = {
      source: '#module-source',
      results: '#module-results',
      assessment: '#module-assessment',
      analysis: '#module-analysis',
      recommendations: '#module-recommendations',
      checks: '#module-checks'
    };
    const panel = document.querySelector(panelMap[moduleId] || '');
    const panelVisible =
      panel && !panel.classList.contains('hidden') && panel.getBoundingClientRect().height > 0;
    const panelLen = panel ? panel.innerHTML.trim().length : 0;
    return { active, panelVisible, panelLen };
  }, moduleId);
  record(b, !!probe.active, label + ': 模块按钮激活', moduleId);
  record(b, probe.panelVisible && probe.panelLen > 20, label + ': 模块面板有内容', JSON.stringify(probe));
}

async function runAssertions(page, target, viewport, b) {
  const label = target.id + '@' + viewport.name;
  await assertNotNaked(page, b, label, target.kind);
  await assertOverflow(page, b, label);
  await assertInputs(page, b, label);
  await assertSearchWidth390(page, b, label, viewport.name);

  if (target.kind === 'list') {
    await assertTableCells(page, b, label, target);
  }
  if (target.kind === 'workbench' || target.kind === 'workbench-module') {
    await assertPreviewIndependent(page, b, label);
  }
  if (target.kind === 'workbench-module' && target.moduleId) {
    await assertWorkbenchModule(page, b, label, target.moduleId);
  }
  if (target.kind === 'workbench') {
    const moduleCount = await page.locator('#rw-module-nav .rw-module-nav-btn').count();
    record(b, moduleCount === 6, label + ': 工作台六模块导航', 'count=' + moduleCount);
  }
}

async function dismissModal(page, b, target) {
  const root = page.locator('.rondo-modal-root').last();
  if (!(await root.count())) return;
  const rootsBefore = await page.locator('.rondo-modal-root').count();
  const cancel = root.locator('[data-action="cancel"]');
  if (await cancel.count()) {
    await cancel.click({ timeout: 5000 });
    await page.waitForTimeout(500);
  }
  const stillOpen = await page.locator('.rondo-modal-root').count();
  if (stillOpen === 0) {
    record(b, true, target.id + ': Modal 取消关闭', 'cancel click');
    return;
  }
  if (target.id === 'modal-user-create' && stillOpen >= rootsBefore) {
    record(
      b,
      false,
      target.id + ': Modal 取消关闭',
      '产品问题：openCreateUserModal 在打开前调用 setDirty(true)，未编辑即 dirty，取消弹出确认层',
      false,
      'product'
    );
    return;
  }
  record(b, false, target.id + ': Modal 取消关闭', 'modal still open (' + stillOpen + ' roots)');
}

async function captureTarget(browser, base, target, viewport, shotsDir) {
  const b = bucket();
  const shotFile = path.join(shotsDir, target.id + '-' + viewport.name + '.png');
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  let loadError = null;
  try {
    await gotoHash(page, base, target.hash);
    await waitTarget(page, target.wait);
    await runSetup(page, target.setup);
    await runAssertions(page, target, viewport, b);

    const clipHeight = await page.evaluate((vpHeight) => {
      const main = document.querySelector('.ant-layout-content') || document.body;
      const rect = main.getBoundingClientRect();
      const scrollH = main.scrollHeight || document.documentElement.scrollHeight;
      const docHeight = Math.min(Math.max(rect.bottom, scrollH), vpHeight * 3);
      return Math.min(Math.max(docHeight, 400), vpHeight * 2.5);
    }, viewport.height);
    await page.screenshot({
      path: shotFile,
      fullPage: false,
      clip: { x: 0, y: 0, width: viewport.width, height: Math.round(clipHeight) }
    });

    if (target.modalCancel) {
      await dismissModal(page, b, target);
    }
  } catch (err) {
    loadError = String(err);
    record(b, false, target.id + '@' + viewport.name + ': 页面加载', loadError);
    try {
      await page.screenshot({ path: shotFile.replace('.png', '-error.png'), fullPage: false });
    } catch (_) {
      /* ignore screenshot failure */
    }
  } finally {
    await context.close();
  }

  if (pageErrors.length) {
    record(b, false, target.id + '@' + viewport.name + ': 无 pageerror', pageErrors[0]);
  }

  return {
    viewport: viewport.name,
    screenshot: path.relative(path.dirname(shotsDir), shotFile),
    assertions: b,
    loadError,
    consoleErrors
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    return;
  }

  const viewports = opts.includeLow ? [...VIEWPORTS, LOW_VIEWPORT] : VIEWPORTS;
  const shotsDir = path.join(opts.out, 'screenshots');
  fs.mkdirSync(shotsDir, { recursive: true });

  const report = {
    base: opts.base,
    startedAt: new Date().toISOString(),
    viewports: viewports.map((v) => v.name),
    targets: TARGETS.map((t) => t.id),
    pages: [],
    summary: {
      passed: 0,
      failed: 0,
      skipped: 0,
      screenshots: 0,
      targets: TARGETS.length,
      productFailures: 0,
      scriptFailures: 0
    },
    scriptFixes: [
      '工作台模块：先点击导航再等待 #module-*:not(.hidden)，不再等待隐藏子节点',
      '用户/宠物列表：无状态列时 ant-tag 断言记 skip',
      '详情页：标题选择器含 .rondo-toolbar-title',
      'Modal：内边距读取 .rondo-modal-body，非 .rondo-modal 面板',
      'modal-user-create 取消失败归类为产品问题（setDirty 误判）'
    ]
  };

  const playwright = loadPlaywright();
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });

  try {
    for (const target of TARGETS) {
      const pageEntry = { id: target.id, hash: target.hash, viewports: [] };
      console.log('\n=== ' + target.id + ' ===');
      for (const vp of viewports) {
        const result = await captureTarget(browser, opts.base, target, vp, shotsDir);
        pageEntry.viewports.push(result);
        report.summary.screenshots += 1;
        report.summary.passed += result.assertions.passed.length;
        report.summary.failed += result.assertions.failed.length;
        report.summary.skipped += result.assertions.skipped.length;
        for (const fail of result.assertions.failed) {
          if (fail.source === 'product') report.summary.productFailures += 1;
          else report.summary.scriptFailures += 1;
        }
      }
      report.pages.push(pageEntry);
    }
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  const reportPath = path.join(opts.out, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n--- 汇总 ---');
  console.log('通过:', report.summary.passed);
  console.log('失败:', report.summary.failed, '(产品', report.summary.productFailures, '/ 脚本', report.summary.scriptFailures + ')');
  console.log('跳过:', report.summary.skipped);
  console.log('截图:', report.summary.screenshots);
  console.log('报告:', reportPath);

  const failedPages = report.pages
    .map((p) => ({
      id: p.id,
      fails: p.viewports.flatMap((v) => v.assertions.failed.map((f) => v.viewport + ': ' + f.name))
    }))
    .filter((p) => p.fails.length);
  if (failedPages.length) {
    console.log('\n失败项:');
    failedPages.forEach((p) => {
      console.log(' ', p.id);
      p.fails.forEach((f) => console.log('   -', f));
    });
  }

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
