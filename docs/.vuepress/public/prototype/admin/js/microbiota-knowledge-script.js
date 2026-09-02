function initMicrobiotaKnowledge() {
  var C = window.PetAdminCommon;
  if (!C) return;

  var PREVIEW_PET = '小花';
  var PREVIEW_THEME = '草原';
  var PREVIEW_STATUS_KEY = 'low';

  var selectedKey = '';
  var formInteracting = false;
  var previewRaf = 0;
  var drawerOpen = false;
  var drawerReturnFocus = null;

  var searchInput = document.getElementById('mk-search');
  var treeEl = document.getElementById('mk-tree');
  var editorEl = document.getElementById('mk-editor');
  var previewEl = document.getElementById('mk-preview');
  var globalSummaryEl = document.getElementById('mk-global-summary');
  var presLowInput = document.getElementById('mk-pres-low');
  var presNormalInput = document.getElementById('mk-pres-normal');
  var presHighInput = document.getElementById('mk-pres-high');
  var drawerRoot = document.getElementById('mk-drawer-root');
  var drawerPanel = drawerRoot ? drawerRoot.querySelector('.ant-drawer') : null;
  var phylumFields = document.getElementById('mk-phylum-fields');
  var genusFields = document.getElementById('mk-genus-fields');
  var sceneCopyLabel = document.getElementById('mk-scene-copy-label');
  var mainTasksListEl = document.getElementById('mk-main-tasks-list');
  var mainTasksEmptyEl = document.getElementById('mk-main-tasks-empty');
  var mainTasksAddBtn = document.getElementById('mk-main-tasks-add');

  var route = C.parseRoute();
  if (route.params && route.params.taxon) {
    selectedKey = route.params.taxon;
  }

  bindEvents();

  if (!selectedKey) {
    var initialTaxa = getTaxa();
    var firstPhylum = initialTaxa.find(function (t) { return t.level === 'phylum'; });
    selectedKey = (firstPhylum && firstPhylum.key) || (initialTaxa[0] && initialTaxa[0].key) || '';
  }

  var unsub = function () {};
  if (typeof C.subscribeDemo === 'function') {
    unsub = C.subscribeDemo(onStoreTick);
  } else {
    var store = C.store();
    if (store && typeof store.subscribe === 'function') {
      unsub = store.subscribe(onStoreTick);
    }
  }
  window.__petAdminPageTeardown = function () {
    unsub();
    closeDrawer(false);
  };

  renderTree();
  refreshGlobalSummary();
  loadPresentationIntoForm();
  loadSelectedIntoForm();

  function onStoreTick() {
    renderTree();
    refreshGlobalSummary();
    if (!formInteracting && !drawerOpen) {
      loadPresentationIntoForm();
      loadSelectedIntoForm();
    }
  }

  function bindEvents() {
    searchInput.addEventListener('input', function () {
      renderTree();
    });

    treeEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-taxon-key]');
      if (!btn) return;
      selectTaxon(btn.getAttribute('data-taxon-key'));
    });

    document.getElementById('mk-btn-save').addEventListener('click', saveCurrentNode);
    document.getElementById('mk-btn-open-global').addEventListener('click', openDrawer);
    document.getElementById('mk-btn-save-global').addEventListener('click', saveGlobalSettings);

    if (drawerRoot) {
      drawerRoot.querySelectorAll('[data-mk-drawer-close]').forEach(function (btn) {
        btn.addEventListener('click', function () { closeDrawer(true); });
      });
    }

    document.addEventListener('keydown', onDocumentKeydown);

    editorEl.addEventListener('focusin', function () { formInteracting = true; });
    editorEl.addEventListener('input', schedulePreviewUpdate);

    bindMainTasksEvents();

    if (drawerRoot) {
      drawerRoot.addEventListener('focusin', function () { formInteracting = true; });
      drawerRoot.addEventListener('input', function () {
        formInteracting = true;
        schedulePreviewUpdate();
      });
    }
  }

  function onDocumentKeydown(e) {
    if (!drawerOpen || e.key !== 'Escape') return;
    e.preventDefault();
    closeDrawer(true);
  }

  function schedulePreviewUpdate() {
    formInteracting = true;
    if (previewRaf) cancelAnimationFrame(previewRaf);
    previewRaf = requestAnimationFrame(function () {
      previewRaf = 0;
      updatePreview();
    });
  }

  function openDrawer() {
    if (!drawerRoot) return;
    drawerReturnFocus = document.activeElement;
    loadPresentationIntoForm();
    drawerOpen = true;
    drawerRoot.hidden = false;
    drawerRoot.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mk-drawer-open');
    if (drawerPanel) drawerPanel.focus();
  }

  function closeDrawer(restoreFocus) {
    if (!drawerRoot || !drawerOpen) return;
    drawerOpen = false;
    drawerRoot.hidden = true;
    drawerRoot.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mk-drawer-open');
    formInteracting = false;
    if (restoreFocus && drawerReturnFocus && typeof drawerReturnFocus.focus === 'function') {
      drawerReturnFocus.focus();
    }
    drawerReturnFocus = null;
  }

  function getSvc() {
    return window.dictionaryDataService || null;
  }

  function getTaxa() {
    var store = C.store();
    if (store && typeof store.peekState === 'function') {
      var live = store.peekState();
      var cat = live && live.professionalCatalog;
      return (cat && cat.microbiotaTaxa) ? cat.microbiotaTaxa : [];
    }
    var svc = getSvc();
    if (svc && typeof svc.getMicrobiotaTaxa === 'function') {
      return svc.getMicrobiotaTaxa() || [];
    }
    var state = store && store.getState ? store.getState() : null;
    var fallback = state && state.professionalCatalog;
    return (fallback && fallback.microbiotaTaxa) ? fallback.microbiotaTaxa : [];
  }

  function nodeClass(taxon) {
    var selected = taxon.key === selectedKey;
    return 'mk-node w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md border ' +
      (selected ? 'is-selected' : '');
  }

  function markTreeSelection() {
    if (!treeEl) return;
    var buttons = treeEl.querySelectorAll('[data-taxon-key]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var selected = btn.getAttribute('data-taxon-key') === selectedKey;
      btn.classList.toggle('is-selected', selected);
      if (selected) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    }
  }

  function findTaxon(taxa, key) {
    if (!key) return null;
    return taxa.find(function (t) { return t.key === key; })
      || taxa.find(function (t) { return t.label === key; })
      || taxa.find(function (t) { return t.latinName === key; })
      || null;
  }

  function eduOf(taxon) {
    return (taxon && taxon.edu) || {};
  }

  function hasText(value) {
    return !!String(value || '').trim();
  }

  function isComplete(taxon) {
    if (!taxon) return false;
    var edu = eduOf(taxon);
    var hint = hasText(edu.hint);
    if (taxon.level === 'phylum') {
      return hasText(edu.sceneCopy) || hasText(edu.introText) ||
        (Array.isArray(edu.mainTasks) && edu.mainTasks.length) || hint;
    }
    return hasText(edu.sceneCopy) || hasText(edu.appearanceText) ||
      hasText(edu.functionText) || hint;
  }

  function completenessBadge(taxon) {
    if (isComplete(taxon)) {
      return '<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">已填</span>';
    }
    return '';
  }

  function renderTree() {
    var taxa = getTaxa();
    var q = (searchInput.value || '').trim().toLowerCase();
    var phyla = taxa.filter(function (t) { return t.level === 'phylum'; });
    var genera = taxa.filter(function (t) { return t.level !== 'phylum'; });

    function matches(taxon) {
      if (!q) return true;
      return [taxon.label, taxon.key, taxon.latinName, taxon.value]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .indexOf(q) >= 0;
    }

    if (!taxa.length) {
      treeEl.innerHTML = '<p class="text-xs text-slate-400 px-1 py-6 text-center">暂无菌群分类，请先在字典管理中维护。</p>';
      return;
    }

    var html = '';
    var shown = 0;
    var usedGenus = {};

    phyla.forEach(function (phylum) {
      var children = genera.filter(function (g) { return g.parentKey === phylum.key; });
      children.forEach(function (g) { usedGenus[g.key] = true; });
      var phylumMatch = matches(phylum);
      var visibleChildren = q
        ? children.filter(function (g) { return matches(g); })
        : children;
      if (q && !phylumMatch && !visibleChildren.length) return;
      if (q && phylumMatch) visibleChildren = children;
      shown += 1;
      html += '<div class="mb-1">';
      html += '<button type="button" class="' + nodeClass(phylum) + '" data-taxon-key="' + C.escapeHtml(phylum.key) + '">';
      html += '<i class="fas fa-layer-group text-slate-400 text-xs w-3.5 text-center"></i>';
      html += '<span class="flex-1 truncate font-medium">' + C.escapeHtml(phylum.label || phylum.key) + '</span>';
      html += completenessBadge(phylum);
      html += '</button>';
      if (visibleChildren.length) {
        html += '<div class="ml-3 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">';
        visibleChildren.forEach(function (genus) {
          shown += 1;
          html += '<button type="button" class="' + nodeClass(genus) + '" data-taxon-key="' + C.escapeHtml(genus.key) + '">';
          html += '<i class="fas fa-bacteria text-slate-400 text-xs w-3.5 text-center"></i>';
          html += '<span class="flex-1 truncate">' + C.escapeHtml(genus.label || genus.key) + '</span>';
          html += completenessBadge(genus);
          html += '</button>';
        });
        html += '</div>';
      }
      html += '</div>';
    });

    var orphans = genera.filter(function (g) { return !usedGenus[g.key]; });
    var visibleOrphans = q ? orphans.filter(matches) : orphans;
    if (visibleOrphans.length) {
      shown += 1;
      html += '<p class="text-[11px] text-slate-400 px-1 pt-2">未分组</p>';
      visibleOrphans.forEach(function (genus) {
        shown += 1;
        html += '<button type="button" class="' + nodeClass(genus) + '" data-taxon-key="' + C.escapeHtml(genus.key) + '">';
        html += '<i class="fas fa-bacteria text-slate-400 text-xs w-3.5 text-center"></i>';
        html += '<span class="flex-1 truncate">' + C.escapeHtml(genus.label || genus.key) + '</span>';
        html += completenessBadge(genus);
        html += '</button>';
      });
    }

    treeEl.innerHTML = shown
      ? html
      : '<p class="text-xs text-slate-400 px-1 py-6 text-center">无匹配分类</p>';
    markTreeSelection();
  }

  function selectTaxon(key) {
    if (key === selectedKey) return;
    selectedKey = key;
    formInteracting = false;
    syncHash(key);
    markTreeSelection();
    loadSelectedIntoForm();
  }

  function syncHash(taxonKey) {
    var hash = 'microbiota-knowledge';
    if (taxonKey) hash += '?taxon=' + encodeURIComponent(taxonKey);
    if (history.replaceState) {
      history.replaceState(null, '', '#' + hash);
    }
  }

  function el(id) {
    return document.getElementById(id);
  }

  function setLevelFields(isPhylum) {
    if (phylumFields) phylumFields.classList.toggle('hidden', !isPhylum);
    if (genusFields) genusFields.classList.toggle('hidden', isPhylum);
    if (sceneCopyLabel) {
      sceneCopyLabel.textContent = isPhylum
        ? '场景句核心短语（可选）'
        : '在菌群中的角色（可选）';
    }
    if (el('mk-scene-copy')) {
      el('mk-scene-copy').placeholder = isPhylum
        ? '如「敏捷的采集者」—— 拼入用户端场景句，留空则不显示'
        : '如「活跃的分解者」—— 属详情与轮播中展示，留空则不显示';
    }
  }

  function loadSelectedIntoForm() {
    var taxa = getTaxa();
    var taxon = findTaxon(taxa, selectedKey);
    if (taxon) selectedKey = taxon.key;
    if (!taxon) {
      if (editorEl) editorEl.classList.add('opacity-50');
      return;
    }
    if (editorEl) editorEl.classList.remove('opacity-50');

    var edu = eduOf(taxon);
    var isPhylum = taxon.level === 'phylum';
    var levelLabel = isPhylum ? '门' : '属';

    el('mk-label').textContent = taxon.label || taxon.key;
    el('mk-level-badge').textContent = levelLabel;
    el('mk-level-badge').className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' +
      (isPhylum ? 'bg-teal-50 text-teal-800' : 'bg-sky-50 text-sky-800');
    el('mk-latin-name').value = taxon.latinName || '';
    el('mk-key').value = taxon.key || '';
    setLevelFields(isPhylum);

    var parentLine = el('mk-parent-line');
    if (!isPhylum && taxon.parentKey) {
      var parent = findTaxon(taxa, taxon.parentKey);
      parentLine.textContent = '所属门：' + ((parent && parent.label) || taxon.parentKey);
      parentLine.classList.remove('hidden');
    } else {
      parentLine.textContent = '';
      parentLine.classList.add('hidden');
    }

    el('mk-scene-copy').value = edu.sceneCopy || '';
    el('mk-intro-text').value = edu.introText || '';
    var tasks = Array.isArray(edu.mainTasks) ? edu.mainTasks.slice() : [];
    renderMainTasksList(tasks);
    el('mk-appearance-text').value = edu.appearanceText || '';
    el('mk-function-text').value = edu.functionText || '';
    el('mk-hint').value = edu.hint || '';
    updatePreview(taxon);
  }

  function createMainTasksRow(value, index, total) {
    var row = document.createElement('div');
    row.className = 'mk-main-tasks-row';
    row.setAttribute('role', 'listitem');

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'ant-input mk-main-tasks-input text-sm';
    input.placeholder = '主要工作内容';
    input.value = value;

    var actions = document.createElement('div');
    actions.className = 'mk-main-tasks-actions';

    var upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'ant-btn ant-btn-default ant-btn-sm mk-main-tasks-up';
    upBtn.title = '上移';
    upBtn.setAttribute('aria-label', '上移');
    upBtn.textContent = '\u2191';
    if (index === 0) upBtn.disabled = true;

    var downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'ant-btn ant-btn-default ant-btn-sm mk-main-tasks-down';
    downBtn.title = '下移';
    downBtn.setAttribute('aria-label', '下移');
    downBtn.textContent = '\u2193';
    if (index === total - 1) downBtn.disabled = true;

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'ant-btn ant-btn-default ant-btn-sm mk-main-tasks-del';
    delBtn.title = '删除';
    delBtn.setAttribute('aria-label', '删除');
    delBtn.textContent = '\u00D7';

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(delBtn);
    row.appendChild(input);
    row.appendChild(actions);
    return row;
  }

  function syncMainTasksEmptyState(count) {
    if (!mainTasksEmptyEl) return;
    var n = count != null ? count : (mainTasksListEl ? mainTasksListEl.querySelectorAll('.mk-main-tasks-row').length : 0);
    mainTasksEmptyEl.classList.toggle('hidden', n > 0);
    if (mainTasksListEl) mainTasksListEl.classList.toggle('hidden', n === 0);
  }

  function renderMainTasksList(taskValues) {
    if (!mainTasksListEl) return;
    var values = Array.isArray(taskValues) ? taskValues : [];
    mainTasksListEl.innerHTML = '';
    values.forEach(function (val, index) {
      mainTasksListEl.appendChild(createMainTasksRow(String(val == null ? '' : val), index, values.length));
    });
    syncMainTasksEmptyState(values.length);
  }

  function readMainTaskValues() {
    if (!mainTasksListEl) return [];
    var inputs = mainTasksListEl.querySelectorAll('.mk-main-tasks-input');
    var out = [];
    for (var i = 0; i < inputs.length; i++) {
      out.push(inputs[i].value);
    }
    return out;
  }

  function addMainTaskRow(focus) {
    var values = readMainTaskValues();
    values.push('');
    renderMainTasksList(values);
    if (focus && mainTasksListEl) {
      var inputs = mainTasksListEl.querySelectorAll('.mk-main-tasks-input');
      var last = inputs[inputs.length - 1];
      if (last) last.focus();
    }
    schedulePreviewUpdate();
  }

  function moveMainTaskRow(index, delta) {
    var values = readMainTaskValues();
    var newIndex = index + delta;
    if (newIndex < 0 || newIndex >= values.length) return;
    var tmp = values[index];
    values[index] = values[newIndex];
    values[newIndex] = tmp;
    renderMainTasksList(values);
    schedulePreviewUpdate();
  }

  function deleteMainTaskRow(index) {
    var values = readMainTaskValues();
    values.splice(index, 1);
    renderMainTasksList(values);
    schedulePreviewUpdate();
  }

  function bindMainTasksEvents() {
    if (mainTasksAddBtn) {
      mainTasksAddBtn.addEventListener('click', function () {
        addMainTaskRow(true);
      });
    }
    if (mainTasksListEl) {
      mainTasksListEl.addEventListener('click', function (e) {
        var row = e.target.closest('.mk-main-tasks-row');
        if (!row || !mainTasksListEl.contains(row)) return;
        var rows = mainTasksListEl.querySelectorAll('.mk-main-tasks-row');
        var index = -1;
        for (var i = 0; i < rows.length; i++) {
          if (rows[i] === row) { index = i; break; }
        }
        if (index < 0) return;
        if (e.target.closest('.mk-main-tasks-up')) {
          e.preventDefault();
          moveMainTaskRow(index, -1);
        } else if (e.target.closest('.mk-main-tasks-down')) {
          e.preventDefault();
          moveMainTaskRow(index, 1);
        } else if (e.target.closest('.mk-main-tasks-del')) {
          e.preventDefault();
          deleteMainTaskRow(index);
        }
      });
    }
  }

  function readMainTasks() {
    var tasks = [];
    readMainTaskValues().forEach(function (line) {
      var trimmed = String(line).trim();
      if (trimmed) tasks.push(trimmed);
    });
    return tasks;
  }

  function readFormEdu(isPhylum) {
    var edu = {
      sceneCopy: el('mk-scene-copy').value.trim(),
      hint: el('mk-hint').value.trim()
    };
    if (isPhylum) {
      edu.introText = el('mk-intro-text').value.trim();
      edu.mainTasks = readMainTasks();
    } else {
      edu.appearanceText = el('mk-appearance-text').value.trim();
      edu.functionText = el('mk-function-text').value.trim();
    }
    return edu;
  }

  function resolveSaveTaxonEdu() {
    var store = C.store();
    if (store && typeof store.saveTaxonEdu === 'function') {
      return function (key, patch) { return store.saveTaxonEdu(key, patch); };
    }
    var svc = getSvc();
    if (svc && typeof svc.saveTaxonEdu === 'function') {
      return function (key, patch) { return svc.saveTaxonEdu(key, patch); };
    }
    return null;
  }

  function saveCurrentNode() {
    var taxa = getTaxa();
    var taxon = findTaxon(taxa, selectedKey);
    if (!taxon) {
      C.toast('请先选择一个分类节点', 'warning');
      return;
    }
    var saveFn = resolveSaveTaxonEdu();
    if (!saveFn) {
      C.toast('科普保存接口不可用（saveTaxonEdu 未就绪）', 'error');
      return;
    }
    var isPhylum = taxon.level === 'phylum';
    var patch = {
      latinName: el('mk-latin-name').value.trim(),
      edu: readFormEdu(isPhylum)
    };
    formInteracting = true;
    try {
      saveFn(taxon.key, patch);
      formInteracting = false;
      C.toast('当前节点科普模板已保存', 'success');
      renderTree();
      loadSelectedIntoForm();
    } catch (err) {
      formInteracting = false;
      C.toast((err && err.message) || '保存失败，请检查填写后重试', 'error');
    }
  }

  function saveGlobalSettings() {
    var savePresentationFn = resolveSavePresentation();
    if (!savePresentationFn) {
      C.toast('全局设置保存接口不可用（saveMicrobiotaPresentation 未就绪）', 'error');
      return;
    }
    var presentationPatch = readFormPresentation();
    formInteracting = true;
    try {
      savePresentationFn(presentationPatch);
      formInteracting = false;
      C.toast('全局场景词已保存', 'success');
      refreshGlobalSummary();
      closeDrawer(false);
      updatePreview();
    } catch (err) {
      formInteracting = false;
      C.toast((err && err.message) || '保存失败，请检查填写后重试', 'error');
    }
  }

  function getPresentationDefaults() {
    return {
      low: '略显稀疏',
      normal: '生机适宜',
      high: '略显繁茂'
    };
  }

  function readPresentationFromStore() {
    var store = C.store();
    if (store && typeof store.getMicrobiotaPresentation === 'function') {
      return store.getMicrobiotaPresentation();
    }
    var svc = getSvc();
    if (svc && typeof svc.getMicrobiotaPresentation === 'function') {
      return svc.getMicrobiotaPresentation();
    }
    var state = store && store.getState ? store.getState() : null;
    var catalog = state && state.professionalCatalog;
    var pres = catalog && catalog.microbiotaPresentation;
    if (!pres) return getPresentationDefaults();
    return {
      low: pres.low != null ? String(pres.low) : getPresentationDefaults().low,
      normal: pres.normal != null ? String(pres.normal) : getPresentationDefaults().normal,
      high: pres.high != null ? String(pres.high) : getPresentationDefaults().high
    };
  }

  function loadPresentationIntoForm() {
    if (!presLowInput || !presNormalInput || !presHighInput) return;
    var pres = readPresentationFromStore();
    presLowInput.value = pres.low || '';
    presNormalInput.value = pres.normal || '';
    presHighInput.value = pres.high || '';
    refreshGlobalSummary(pres);
  }

  function readFormPresentation() {
    if (!presLowInput || !presNormalInput || !presHighInput) return getPresentationDefaults();
    return {
      low: presLowInput.value.trim(),
      normal: presNormalInput.value.trim(),
      high: presHighInput.value.trim()
    };
  }

  function refreshGlobalSummary(pres) {
    if (!globalSummaryEl) return;
    pres = pres || readPresentationFromStore();
    function clip(text) {
      var s = String(text || '').trim();
      if (!s) return '（空）';
      return s.length > 8 ? s.slice(0, 8) + '…' : s;
    }
    globalSummaryEl.textContent =
      '偏低「' + clip(pres.low) + '」· 正常「' + clip(pres.normal) + '」· 偏高「' + clip(pres.high) + '」';
  }

  function resolveSavePresentation() {
    var store = C.store();
    if (store && typeof store.saveMicrobiotaPresentation === 'function') {
      return function (patch) { return store.saveMicrobiotaPresentation(patch); };
    }
    var svc = getSvc();
    if (svc && typeof svc.saveMicrobiotaPresentation === 'function') {
      return function (patch) { return svc.saveMicrobiotaPresentation(patch); };
    }
    return null;
  }

  function buildStorySentence(taxon, edu, presentation, previewStatusKey) {
    var label = taxon.label || taxon.key;
    var sceneCopy = String(edu.sceneCopy || '').trim();
    if (!sceneCopy) return '';
    var sentence = PREVIEW_PET + '的' + PREVIEW_THEME + '上有' + sceneCopy + '——' + label;
    var pres = presentation || readFormPresentation();
    var statusKey = previewStatusKey || PREVIEW_STATUS_KEY;
    var statusWord = pres[statusKey] ? String(pres[statusKey]).trim() : '';
    if (statusWord) sentence += '——' + statusWord;
    return sentence;
  }

  function previewHint(edu) {
    return String((edu && edu.hint) || '').trim();
  }

  function previewStatusLabel(statusKey) {
    if (statusKey === 'low') return '偏低';
    if (statusKey === 'normal') return '正常';
    if (statusKey === 'high') return '偏高';
    return statusKey;
  }

  function updatePreview(taxon) {
    if (!taxon) taxon = findTaxon(getTaxa(), selectedKey);
    if (!taxon || !previewEl) return;

    var isPhylum = taxon.level === 'phylum';
    var edu = readFormEdu(isPhylum);
    var presentation = readFormPresentation();
    var story = buildStorySentence(taxon, edu, presentation, PREVIEW_STATUS_KEY);
    var html = '';

    html += '<p class="text-[11px] text-slate-500 mb-2">' +
      '<i class="fas fa-eye mr-1"></i>预览状态：<strong>' + previewStatusLabel(PREVIEW_STATUS_KEY) + '</strong>（与用户端结构一致）</p>';

    if (story) {
      html += '<div class="rounded-md bg-teal-50/70 border border-teal-100 px-3 py-2 text-teal-900">' +
        C.escapeHtml(story) + '</div>';
    } else {
      html += '<p class="text-slate-400 text-xs">填写场景句核心短语后，可预览用户端场景句。</p>';
    }

    if (isPhylum) {
      if (edu.introText) {
        html += '<div class="mt-3"><p class="text-[11px] text-slate-400 mb-1">什么是弹层 · 导语</p>' +
          '<p class="leading-relaxed">' + C.escapeHtml(edu.introText) + '</p></div>';
      }
      if (edu.mainTasks && edu.mainTasks.length) {
        html += '<div class="mt-3"><p class="text-[11px] text-slate-400 mb-1">主要工作</p><ul class="list-disc pl-5 space-y-1">';
        edu.mainTasks.forEach(function (task) {
          html += '<li>' + C.escapeHtml(task) + '</li>';
        });
        html += '</ul></div>';
      }
    } else {
      if (edu.sceneCopy) {
        html += '<div class="mt-3"><p class="text-[11px] text-slate-400 mb-1">在菌群中的角色</p>' +
          '<p class="leading-relaxed">' + C.escapeHtml(edu.sceneCopy) + '</p></div>';
      }
      if (edu.appearanceText) {
        html += '<div class="mt-3"><p class="text-[11px] text-slate-400 mb-1">外观</p>' +
          '<p class="leading-relaxed">' + C.escapeHtml(edu.appearanceText) + '</p></div>';
      }
      if (edu.functionText) {
        html += '<div class="mt-3"><p class="text-[11px] text-slate-400 mb-1">功能</p>' +
          '<p class="leading-relaxed">' + C.escapeHtml(edu.functionText) + '</p></div>';
      }
    }

    var hint = previewHint(edu);
    if (hint) {
      html += '<div class="mt-3 rounded-md bg-amber-50 border border-amber-100 px-3 py-2">' +
        '<p class="text-[11px] text-amber-700 mb-1">提示条（不随状态变化）</p>' +
        '<p class="leading-relaxed text-amber-900">' + C.escapeHtml(hint) + '</p></div>';
    }

    previewEl.innerHTML = html;
  }
}

window.initMicrobiotaKnowledge = initMicrobiotaKnowledge;
