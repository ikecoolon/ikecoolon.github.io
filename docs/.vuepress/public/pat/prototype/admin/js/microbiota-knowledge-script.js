function initMicrobiotaKnowledge() {
  var C = window.PetAdminCommon;
  if (!C) return;

  var PREVIEW_PET = '小花';
  var PREVIEW_THEME = '草原';

  var selectedKey = '';
  var formInteracting = false;
  var previewRaf = 0;
  var presentationDraft = null;

  var searchInput = document.getElementById('mk-search');
  var treeEl = document.getElementById('mk-tree');
  var emptyEl = document.getElementById('mk-empty');
  var editorEl = document.getElementById('mk-editor');
  var previewEl = document.getElementById('mk-preview');
  var presLowInput = document.getElementById('mk-pres-low');
  var presNormalInput = document.getElementById('mk-pres-normal');
  var presHighInput = document.getElementById('mk-pres-high');

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
  window.__petAdminPageTeardown = function () { unsub(); };

  renderTree();
  loadPresentationIntoForm();
  loadSelectedIntoForm();

  function onStoreTick() {
    renderTree();
    if (!formInteracting) {
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

    document.getElementById('mk-btn-save').addEventListener('click', saveCurrent);

    var presSection = document.getElementById('mk-global-pres');
    if (presSection) {
      presSection.addEventListener('focusin', function () { formInteracting = true; });
      presSection.addEventListener('input', function () {
        formInteracting = true;
        if (previewRaf) cancelAnimationFrame(previewRaf);
        previewRaf = requestAnimationFrame(function () {
          previewRaf = 0;
          updatePreview();
        });
      });
    }

    editorEl.addEventListener('focusin', function () { formInteracting = true; });
    editorEl.addEventListener('input', function () {
      formInteracting = true;
      if (previewRaf) cancelAnimationFrame(previewRaf);
      previewRaf = requestAnimationFrame(function () {
        previewRaf = 0;
        updatePreview();
      });
    });
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

  function isComplete(taxon) {
    if (!taxon) return false;
    var edu = eduOf(taxon);
    return !!(String(edu.sceneCopy || '').trim() || String(edu.knowledgeText || '').trim());
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

  function loadSelectedIntoForm() {
    var taxa = getTaxa();
    var taxon = findTaxon(taxa, selectedKey);
    if (taxon) selectedKey = taxon.key;
    if (!taxon) {
      emptyEl.classList.remove('hidden');
      editorEl.classList.add('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    editorEl.classList.remove('hidden');

    var edu = eduOf(taxon);
    var isPhylum = taxon.level === 'phylum';
    var levelLabel = isPhylum ? '门' : '属';

    el('mk-label').textContent = taxon.label || taxon.key;
    el('mk-level-badge').textContent = levelLabel;
    el('mk-level-badge').className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' +
      (isPhylum ? 'bg-teal-50 text-teal-800' : 'bg-sky-50 text-sky-800');
    el('mk-latin-name').value = taxon.latinName || '';
    el('mk-key').value = taxon.key || '';

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
    el('mk-knowledge-text').value = edu.knowledgeText || '';
    updatePreview(taxon);
  }

  function readFormEdu() {
    return {
      sceneCopy: el('mk-scene-copy').value.trim(),
      knowledgeText: el('mk-knowledge-text').value.trim()
    };
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

  function saveCurrent() {
    var taxa = getTaxa();
    var taxon = findTaxon(taxa, selectedKey);
    if (!taxon) {
      C.toast('请先选择一个分类节点', 'warning');
      return;
    }
    var saveFn = resolveSaveTaxonEdu();
    var savePresentationFn = resolveSavePresentation();
    if (!saveFn || !savePresentationFn) {
      C.toast('科普保存接口不可用（saveTaxonEdu / saveMicrobiotaPresentation 未就绪）', 'error');
      return;
    }
    var patch = {
      latinName: el('mk-latin-name').value.trim(),
      edu: readFormEdu()
    };
    var presentationPatch = readFormPresentation();
    formInteracting = true;
    try {
      savePresentationFn(presentationPatch);
      saveFn(taxon.key, patch);
      formInteracting = false;
      presentationDraft = null;
      C.toast('科普模板与场景状态词已保存', 'success');
      renderTree();
      loadPresentationIntoForm();
      loadSelectedIntoForm();
    } catch (err) {
      formInteracting = false;
      presentationDraft = readFormPresentation();
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
    presentationDraft = null;
  }

  function readFormPresentation() {
    if (!presLowInput || !presNormalInput || !presHighInput) return getPresentationDefaults();
    return {
      low: presLowInput.value.trim(),
      normal: presNormalInput.value.trim(),
      high: presHighInput.value.trim()
    };
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
    var statusKey = previewStatusKey || 'high';
    var statusWord = pres[statusKey] ? String(pres[statusKey]).trim() : '';
    if (statusWord) sentence += '——' + statusWord;
    return sentence;
  }

  function updatePreview(taxon) {
    if (!taxon) taxon = findTaxon(getTaxa(), selectedKey);
    if (!taxon || !previewEl) return;

    var edu = readFormEdu();
    var presentation = readFormPresentation();
    var story = buildStorySentence(taxon, edu, presentation, 'high');
    var html = '';

    if (story) {
      html += '<p class="text-[11px] text-slate-500 mb-2">' +
        '<i class="fas fa-eye mr-1"></i>预览状态：偏高</p>';
      html += '<div class="rounded-md bg-teal-50/70 border border-teal-100 px-3 py-2 text-teal-900">' +
        C.escapeHtml(story) + '</div>';
    } else {
      html += '<p class="text-slate-400 text-xs">填写场景句核心短语后，可预览用户端场景句。</p>';
    }

    if (edu.knowledgeText) {
      html += '<div class="mt-3"><p class="text-[11px] text-slate-400 mb-1">科普弹层正文</p>' +
        '<p class="leading-relaxed">' + C.escapeHtml(edu.knowledgeText) + '</p></div>';
    }

    previewEl.innerHTML = html;
  }
}

window.initMicrobiotaKnowledge = initMicrobiotaKnowledge;
