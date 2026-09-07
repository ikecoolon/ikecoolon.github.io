function initMicrobiotaKnowledge(mountRoot, tab) {
  var root = mountRoot || document;
  var C = window.PetAdminCommon;
  var Perms = window.PetAdminPermissions;
  var Session = window.PetAdminSession;
  if (!C) return;

  var pageEl = root.querySelector('#microbiota-knowledge');
  if (!pageEl) return;

  var cssLink = root.querySelector('link[href*="microbiota-knowledge.css"]');
  if (cssLink && !document.getElementById('pet-admin-microbiota-knowledge-css')) {
    var headLink = document.createElement('link');
    headLink.id = 'pet-admin-microbiota-knowledge-css';
    headLink.rel = 'stylesheet';
    headLink.href = cssLink.getAttribute('href');
    document.head.appendChild(headLink);
  }

  var PREVIEW_PET = '小花';
  var PREVIEW_THEME = '草原';
  var PREVIEW_STATUS_KEYS = { low: true, normal: true, high: true, none: true };

  var selectedKey = '';
  var nodeDirty = false;
  var drawerDirty = false;
  var tabActive = true;
  var previewRaf = 0;
  var drawerOpen = false;
  var drawerReturnFocus = null;
  var presentationBaseline = null;
  var previewStatusKey = 'low';
  var drawerHomeParent = null;
  var drawerHomeNext = null;

  var searchInput = root.querySelector('#mk-search');
  var treeEl = root.querySelector('#mk-tree');
  var editorEl = root.querySelector('#mk-editor');
  var previewEl = root.querySelector('#mk-preview');
  var globalSummaryEl = root.querySelector('#mk-global-summary');
  var presLowInput = root.querySelector('#mk-pres-low');
  var presNormalInput = root.querySelector('#mk-pres-normal');
  var presHighInput = root.querySelector('#mk-pres-high');
  var drawerRoot = root.querySelector('#mk-drawer-root');
  var drawerPanel = drawerRoot ? drawerRoot.querySelector('.ant-drawer') : null;
  var previewStatusGroup = root.querySelector('#mk-preview-status');
  if (drawerRoot) {
    drawerHomeParent = drawerRoot.parentNode;
    drawerHomeNext = drawerRoot.nextSibling;
  }
  if (tab && tab.pageState && PREVIEW_STATUS_KEYS[tab.pageState.mkPreviewStatus]) {
    previewStatusKey = tab.pageState.mkPreviewStatus;
  }
  var phylumFields = root.querySelector('#mk-phylum-fields');
  var genusFields = root.querySelector('#mk-genus-fields');
  var sceneCopyLabel = root.querySelector('#mk-scene-copy-label');
  var mainTasksListEl = root.querySelector('#mk-main-tasks-list');
  var mainTasksEmptyEl = root.querySelector('#mk-main-tasks-empty');
  var mainTasksAddBtn = root.querySelector('#mk-main-tasks-add');

  var route = C.parseRoute();
  if (route.params && route.params.taxon) {
    selectedKey = route.params.taxon;
  }
  if (tab && tab.pageState && tab.pageState.mkSearch) {
    searchInput.value = tab.pageState.mkSearch;
  }

  function canEditCatalog() {
    return Perms ? Perms.can('edit_catalog') : true;
  }

  function syncReadOnly() {
    var readonly = !canEditCatalog();
    pageEl.classList.toggle('mk-readonly', readonly);
    if (drawerRoot) drawerRoot.classList.toggle('mk-readonly', readonly);
    var saveBtn = root.querySelector('#mk-btn-save');
    var saveGlobalBtn = (drawerRoot && drawerRoot.querySelector('#mk-btn-save-global'))
      || root.querySelector('#mk-btn-save-global');
    if (saveBtn) saveBtn.disabled = readonly;
    if (saveGlobalBtn) saveGlobalBtn.disabled = readonly;
    if (mainTasksAddBtn) mainTasksAddBtn.disabled = readonly;
  }

  function syncTabDirty() {
    var dirty = !!(nodeDirty || drawerDirty);
    if (tab && Session && Session.setTabDirty) {
      Session.setTabDirty(tab.id, dirty);
    } else if (typeof window.__petAdminSetTabDirty === 'function') {
      window.__petAdminSetTabDirty(dirty);
    }
  }

  function setNodeDirty(dirty) {
    nodeDirty = !!dirty;
    syncTabDirty();
  }

  function setDrawerDirty(dirty) {
    drawerDirty = !!dirty;
    syncTabDirty();
  }

  function getNodeDrafts() {
    if (!tab) return {};
    tab.pageState = tab.pageState || {};
    if (!tab.pageState.mkNodeDrafts) tab.pageState.mkNodeDrafts = {};
    return tab.pageState.mkNodeDrafts;
  }

  function persistTabState() {
    if (!tab || !Session) return;
    Session.updateTabState(tab.id, { pageState: tab.pageState });
  }

  function persistNodeDraft(key) {
    if (!key || !tab) return;
    var taxa = getTaxa();
    var taxon = findTaxon(taxa, key);
    if (!taxon) return;
    var isPhylum = taxon.level === 'phylum';
    getNodeDrafts()[key] = {
      latinName: el('mk-latin-name').value,
      edu: readFormEdu(isPhylum),
      mainTaskValues: readMainTaskValues()
    };
    persistTabState();
  }

  function clearNodeDraft(key) {
    if (!key || !tab || !tab.pageState || !tab.pageState.mkNodeDrafts) return;
    delete tab.pageState.mkNodeDrafts[key];
    persistTabState();
  }

  function getPresentationDraft() {
    if (!tab || !tab.pageState) return null;
    return tab.pageState.mkPresentationDraft || null;
  }

  function persistPresentationDraft() {
    if (!tab) return;
    tab.pageState = tab.pageState || {};
    tab.pageState.mkPresentationDraft = readFormPresentation();
    persistTabState();
  }

  function clearPresentationDraft() {
    if (!tab || !tab.pageState) return;
    delete tab.pageState.mkPresentationDraft;
    persistTabState();
  }

  bindEvents();
  syncReadOnly();

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
  renderTree();
  refreshGlobalSummary();
  loadPresentationIntoForm();
  loadSelectedIntoForm();

  function onStoreTick() {
    if (!tabActive) return;
    if (tab && Session && Session.getActiveTab() !== tab) return;
    renderTree();
    if (!drawerOpen) {
      refreshGlobalSummary();
    }
    if (!nodeDirty && !drawerOpen) {
      loadPresentationIntoForm();
      loadSelectedIntoForm();
    } else if (!nodeDirty) {
      updatePreview();
    }
  }

  function bindEvents() {
    searchInput.addEventListener('input', function () {
      if (tab) {
        tab.pageState = tab.pageState || {};
        tab.pageState.mkSearch = searchInput.value;
        persistTabState();
      }
      renderTree();
    });

    treeEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-taxon-key]');
      if (!btn) return;
      selectTaxon(btn.getAttribute('data-taxon-key'));
    });

    root.querySelector('#mk-btn-save').addEventListener('click', saveCurrentNode);
    root.querySelector('#mk-btn-open-global').addEventListener('click', openDrawer);
    root.querySelector('#mk-btn-save-global').addEventListener('click', saveGlobalSettings);

    if (drawerRoot) {
      drawerRoot.querySelectorAll('[data-mk-drawer-close]').forEach(function (btn) {
        btn.addEventListener('click', function () { closeDrawer(true); });
      });
    }

    document.addEventListener('keydown', onDocumentKeydown);

    editorEl.addEventListener('input', onEditorInput);

    bindMainTasksEvents();

    if (drawerRoot) {
      drawerRoot.addEventListener('input', onDrawerInput);
    }

    if (previewStatusGroup) {
      previewStatusGroup.addEventListener('click', onPreviewStatusClick);
      previewStatusGroup.addEventListener('keydown', onPreviewStatusKeydown);
    }
    syncPreviewStatusUi();
  }

  function onEditorInput() {
    if (!canEditCatalog()) return;
    persistNodeDraft(selectedKey);
    setNodeDirty(true);
    schedulePreviewUpdate();
  }

  function onDrawerInput() {
    if (!canEditCatalog()) return;
    persistPresentationDraft();
    setDrawerDirty(true);
    schedulePreviewUpdate();
  }

  function onPreviewStatusClick(e) {
    var btn = e.target.closest('[data-mk-preview-status]');
    if (!btn || !previewStatusGroup.contains(btn)) return;
    setPreviewStatus(btn.getAttribute('data-mk-preview-status'));
  }

  function onPreviewStatusKeydown(e) {
    if (!previewStatusGroup) return;
    var keys = ['low', 'normal', 'high', 'none'];
    var idx = keys.indexOf(previewStatusKey);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setPreviewStatus(keys[(idx + 1) % keys.length], true);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setPreviewStatus(keys[(idx - 1 + keys.length) % keys.length], true);
    }
  }

  function setPreviewStatus(key, focusBtn) {
    if (!PREVIEW_STATUS_KEYS[key]) return;
    previewStatusKey = key;
    if (tab) {
      tab.pageState = tab.pageState || {};
      tab.pageState.mkPreviewStatus = key;
      persistTabState();
    }
    syncPreviewStatusUi();
    if (focusBtn && previewStatusGroup) {
      var btn = previewStatusGroup.querySelector('[data-mk-preview-status="' + key + '"]');
      if (btn) btn.focus();
    }
    updatePreview();
  }

  function syncPreviewStatusUi() {
    if (!previewStatusGroup) return;
    var buttons = previewStatusGroup.querySelectorAll('[data-mk-preview-status]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var active = btn.getAttribute('data-mk-preview-status') === previewStatusKey;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    }
  }

  function getDrawerFocusable() {
    if (!drawerRoot || drawerRoot.hidden) return [];
    var nodes = drawerRoot.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    return Array.prototype.filter.call(nodes, function (node) {
      if (node.hasAttribute('disabled') || node.getAttribute('aria-hidden') === 'true') return false;
      if (node.classList.contains('ant-drawer-mask')) return false;
      var style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return true;
    });
  }

  function flyDrawerToBody() {
    if (!drawerRoot || drawerRoot.parentNode === document.body) return;
    document.body.appendChild(drawerRoot);
  }

  function parkDrawer() {
    if (!drawerRoot || !drawerHomeParent) return;
    if (drawerRoot.parentNode === drawerHomeParent) return;
    if (drawerHomeNext && drawerHomeNext.parentNode === drawerHomeParent) {
      drawerHomeParent.insertBefore(drawerRoot, drawerHomeNext);
    } else {
      drawerHomeParent.appendChild(drawerRoot);
    }
  }

  function syncDrawerBodyLock() {
    document.body.classList.toggle('mk-drawer-open', !!(drawerOpen && tabActive));
  }

  function onDocumentKeydown(e) {
    if (!drawerOpen || !tabActive) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDrawer(true);
      return;
    }
    if (e.key !== 'Tab' || !drawerPanel) return;
    var focusable = getDrawerFocusable();
    if (!focusable.length) {
      e.preventDefault();
      drawerPanel.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = document.activeElement;
    if (e.shiftKey && (active === first || active === drawerPanel || active === drawerRoot)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function schedulePreviewUpdate() {
    if (previewRaf) cancelAnimationFrame(previewRaf);
    previewRaf = requestAnimationFrame(function () {
      previewRaf = 0;
      updatePreview();
    });
  }

  function confirmDiscard(message) {
    return window.confirm(message || '当前修改尚未保存，确定放弃吗？');
  }

  function openDrawer() {
    if (!drawerRoot) return;
    if (nodeDirty && !confirmDiscard('节点科普尚未保存，打开全局设置将保留当前编辑。确定继续吗？')) {
      return;
    }
    drawerReturnFocus = document.activeElement;
    loadPresentationIntoForm();
    presentationBaseline = JSON.stringify(readFormPresentation());
    drawerOpen = true;
    flyDrawerToBody();
    drawerRoot.hidden = false;
    drawerRoot.setAttribute('aria-hidden', 'false');
    syncDrawerBodyLock();
    if (drawerPanel) drawerPanel.focus();
  }

  function closeDrawer(restoreFocus) {
    if (!drawerRoot || !drawerOpen) return;
    if (drawerDirty) {
      if (!confirmDiscard('全局场景词尚未保存，确定关闭吗？')) return;
      loadPresentationIntoForm();
      clearPresentationDraft();
      setDrawerDirty(false);
    }
    drawerOpen = false;
    drawerRoot.hidden = true;
    drawerRoot.setAttribute('aria-hidden', 'true');
    parkDrawer();
    syncDrawerBodyLock();
    presentationBaseline = null;
    if (restoreFocus && drawerReturnFocus && typeof drawerReturnFocus.focus === 'function') {
      drawerReturnFocus.focus();
    }
    drawerReturnFocus = null;
    updatePreview();
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
    var complete = isComplete(taxon);
    return 'mk-node w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-md border ' +
      (selected ? 'is-selected ' : '') +
      (complete ? 'is-complete' : 'is-incomplete');
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
      return '<span class="mk-node-badge mk-node-badge-complete">已填</span>';
    }
    return '<span class="mk-node-badge mk-node-badge-incomplete">未齐</span>';
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
    if (nodeDirty && !confirmDiscard('当前节点科普尚未保存，确定切换分类吗？')) {
      return;
    }
    if (nodeDirty) {
      clearNodeDraft(selectedKey);
    } else {
      persistNodeDraft(selectedKey);
    }
    selectedKey = key;
    setNodeDirty(false);
    syncRoute(key);
    markTreeSelection();
    loadSelectedIntoForm();
  }

  function syncRoute(taxonKey) {
    if (taxonKey) {
      C.navigate('microbiota-knowledge', { taxon: taxonKey });
    } else {
      C.navigate('microbiota-knowledge', {});
    }
  }

  function handleRoute() {
    var route = C.parseRoute();
    if (route.pageId !== 'microbiota-knowledge') return;
    var nextKey = route.params.taxon || selectedKey;
    if (nextKey && nextKey !== selectedKey) {
      if (nodeDirty && !confirmDiscard('当前节点科普尚未保存，确定切换分类吗？')) {
        syncRoute(selectedKey);
        return;
      }
      if (nodeDirty) clearNodeDraft(selectedKey);
      selectedKey = nextKey;
      setNodeDirty(false);
      markTreeSelection();
      loadSelectedIntoForm();
    }
  }

  function onHashChange() {
    if (tab && Session && Session.getActiveTab() !== tab) return;
    handleRoute();
  }
  window.addEventListener('hashchange', onHashChange);

  function el(id) {
    return root.querySelector('#' + id) || (drawerRoot && drawerRoot.querySelector('#' + id));
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

  function applyDraftToForm(draft, taxon) {
    var isPhylum = taxon.level === 'phylum';
    el('mk-latin-name').value = taxon.latinName || '';
    setLevelFields(isPhylum);
    var edu = draft.edu || {};
    el('mk-scene-copy').value = edu.sceneCopy || '';
    el('mk-intro-text').value = edu.introText || '';
    var tasks = Array.isArray(draft.mainTaskValues)
      ? draft.mainTaskValues.slice()
      : (Array.isArray(edu.mainTasks) ? edu.mainTasks.slice() : []);
    renderMainTasksList(tasks);
    el('mk-appearance-text').value = edu.appearanceText || '';
    el('mk-function-text').value = edu.functionText || '';
    el('mk-hint').value = edu.hint || '';
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

    var draft = getNodeDrafts()[selectedKey];
    var isPhylum = taxon.level === 'phylum';
    var levelLabel = isPhylum ? '门' : '属';

    el('mk-label').textContent = taxon.label || taxon.key;
    el('mk-level-badge').textContent = levelLabel;
    el('mk-level-badge').className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' +
      (isPhylum ? 'bg-teal-50 text-teal-800' : 'bg-sky-50 text-sky-800');
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

    if (draft) {
      applyDraftToForm(draft, taxon);
      setNodeDirty(true);
    } else {
      var edu = eduOf(taxon);
      el('mk-latin-name').value = taxon.latinName || '';
      el('mk-scene-copy').value = edu.sceneCopy || '';
      el('mk-intro-text').value = edu.introText || '';
      var tasks = Array.isArray(edu.mainTasks) ? edu.mainTasks.slice() : [];
      renderMainTasksList(tasks);
      el('mk-appearance-text').value = edu.appearanceText || '';
      el('mk-function-text').value = edu.functionText || '';
      el('mk-hint').value = edu.hint || '';
      setNodeDirty(false);
    }
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
    if (!canEditCatalog()) input.disabled = true;

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
    if (!canEditCatalog()) return;
    var values = readMainTaskValues();
    values.push('');
    renderMainTasksList(values);
    if (focus && mainTasksListEl) {
      var inputs = mainTasksListEl.querySelectorAll('.mk-main-tasks-input');
      var last = inputs[inputs.length - 1];
      if (last) last.focus();
    }
    onEditorInput();
  }

  function moveMainTaskRow(index, delta) {
    if (!canEditCatalog()) return;
    var values = readMainTaskValues();
    var newIndex = index + delta;
    if (newIndex < 0 || newIndex >= values.length) return;
    var tmp = values[index];
    values[index] = values[newIndex];
    values[newIndex] = tmp;
    renderMainTasksList(values);
    onEditorInput();
  }

  function deleteMainTaskRow(index) {
    if (!canEditCatalog()) return;
    var values = readMainTaskValues();
    values.splice(index, 1);
    renderMainTasksList(values);
    onEditorInput();
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
      mainTasksListEl.addEventListener('input', onEditorInput);
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
    if (!canEditCatalog()) {
      C.toast('当前账号无编辑科普模板的权限', 'warning');
      return;
    }
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
      edu: readFormEdu(isPhylum)
    };
    try {
      saveFn(taxon.key, patch);
      clearNodeDraft(selectedKey);
      setNodeDirty(false);
      C.toast('当前节点科普模板已保存', 'success');
      renderTree();
      loadSelectedIntoForm();
    } catch (err) {
      C.toast((err && err.message) || '保存失败，请检查填写后重试', 'error');
    }
  }

  function saveGlobalSettings() {
    if (!canEditCatalog()) {
      C.toast('当前账号无编辑科普模板的权限', 'warning');
      return;
    }
    var savePresentationFn = resolveSavePresentation();
    if (!savePresentationFn) {
      C.toast('全局设置保存接口不可用（saveMicrobiotaPresentation 未就绪）', 'error');
      return;
    }
    var presentationPatch = readFormPresentation();
    try {
      savePresentationFn(presentationPatch);
      clearPresentationDraft();
      setDrawerDirty(false);
      C.toast('全局场景词已保存', 'success');
      refreshGlobalSummary();
      closeDrawer(false);
      updatePreview();
    } catch (err) {
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
    var pres = getPresentationDraft() || readPresentationFromStore();
    presLowInput.value = pres.low || '';
    presNormalInput.value = pres.normal || '';
    presHighInput.value = pres.high || '';
    refreshGlobalSummary(pres);
    if (getPresentationDraft()) {
      setDrawerDirty(true);
    }
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

  function buildStorySentence(taxon, edu, presentation, statusKey) {
    var label = taxon.label || taxon.key;
    var sceneCopy = String(edu.sceneCopy || '').trim();
    if (!sceneCopy) return '';
    var sentence = PREVIEW_PET + '的' + PREVIEW_THEME + '上有' + sceneCopy + '——' + label;
    var key = statusKey || previewStatusKey;
    if (key === 'none') return sentence;
    var pres = presentation || readFormPresentation();
    var statusWord = pres[key] ? String(pres[key]).trim() : '';
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
    if (statusKey === 'none') return '无范围';
    return statusKey;
  }

  function updatePreview(taxon) {
    if (!taxon) taxon = findTaxon(getTaxa(), selectedKey);
    if (!taxon || !previewEl) return;

    var isPhylum = taxon.level === 'phylum';
    var edu = readFormEdu(isPhylum);
    var presentation = readFormPresentation();
    var story = buildStorySentence(taxon, edu, presentation, previewStatusKey);
    var html = '';

    if (story) {
      html += '<div class="rounded-md bg-teal-50/70 border border-teal-100 px-3 py-2 text-teal-900">' +
        C.escapeHtml(story) + '</div>';
      if (previewStatusKey === 'none') {
        html += '<p class="mk-preview-note">无范围：不追加全局场景词</p>';
      } else {
        var appended = presentation[previewStatusKey] ? String(presentation[previewStatusKey]).trim() : '';
        html += '<p class="mk-preview-note">预览状态「' + previewStatusLabel(previewStatusKey) + '」' +
          (appended ? '：已追加「' + C.escapeHtml(appended) + '」' : '：该状态全局词为空，未追加') +
          '</p>';
      }
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

  function onTabActivate() {
    tabActive = true;
    syncReadOnly();
    handleRoute();
    renderTree();
    syncPreviewStatusUi();
    if (drawerOpen) {
      flyDrawerToBody();
      if (drawerRoot) {
        drawerRoot.hidden = false;
        drawerRoot.setAttribute('aria-hidden', 'false');
      }
    }
    syncDrawerBodyLock();
    if (!nodeDirty && !drawerOpen) {
      loadSelectedIntoForm();
    } else {
      updatePreview();
    }
  }

  function onTabDeactivate() {
    if (nodeDirty) persistNodeDraft(selectedKey);
    if (drawerDirty) persistPresentationDraft();
    if (drawerOpen) parkDrawer();
    tabActive = false;
    syncDrawerBodyLock();
  }

  function onTabDispose() {
    if (drawerOpen) {
      drawerDirty = false;
      closeDrawer(false);
    }
    parkDrawer();
    if (tab && tab.pageState) {
      delete tab.pageState.mkNodeDrafts;
      delete tab.pageState.mkPresentationDraft;
      if (Session) Session.updateTabState(tab.id, { pageState: tab.pageState });
    }
    setNodeDirty(false);
    setDrawerDirty(false);
  }

  function onTabCanLeave() {
    if (nodeDirty && !confirmDiscard('当前节点科普尚未保存，确定离开吗？')) return false;
    if (drawerDirty && !confirmDiscard('全局场景词尚未保存，确定离开吗？')) return false;
    return true;
  }

  if (tab && typeof window.__petAdminRegisterTabHooks === 'function') {
    window.__petAdminRegisterTabHooks(tab.id, {
      activate: onTabActivate,
      deactivate: onTabDeactivate,
      dispose: onTabDispose,
      canLeave: onTabCanLeave
    });
  }

  handleRoute();

  return function teardown() {
    unsub();
    if (drawerOpen) {
      drawerDirty = false;
      closeDrawer(false);
    }
    parkDrawer();
    window.removeEventListener('hashchange', onHashChange);
    document.removeEventListener('keydown', onDocumentKeydown);
  };
}

window.initMicrobiotaKnowledge = initMicrobiotaKnowledge;
