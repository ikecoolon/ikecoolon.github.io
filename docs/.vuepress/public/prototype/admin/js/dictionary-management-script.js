function initDictionaryManagement() {
  var svc = window.dictionaryDataService;
  var C = window.PetAdminCommon;
  if (!svc) return;

  var pageRoot = document.getElementById('dictionary-management');
  var mainView = document.getElementById('main-view');
  var formView = document.getElementById('form-view');
  var formTitle = document.getElementById('form-title');
  var searchInput = document.getElementById('search-custom-key');
  var tableBody = document.getElementById('custom-key-table-body');
  var catalogTable = document.getElementById('catalog-table');
  var addNewKeyButton = document.getElementById('add-new-key');
  var batchSortToggle = document.getElementById('batch-sort-toggle');
  var batchSortToolbar = document.getElementById('batch-sort-toolbar');
  var batchSortRenumber = document.getElementById('batch-sort-renumber');
  var batchSortSave = document.getElementById('batch-sort-save');
  var batchSortCancel = document.getElementById('batch-sort-cancel');
  var backToListButton = document.getElementById('back-to-list');
  var keyForm = document.getElementById('key-form');
  var formCustomKey = document.getElementById('form-custom-key');
  var formCustomLabel = document.getElementById('form-custom-label');
  var formSortOrder = document.getElementById('form-sort-order');
  var formParentKey = document.getElementById('form-parent-key');
  var formCustomValue = document.getElementById('form-custom-value');
  var formTaxonomyLevel = document.getElementById('form-taxonomy-level');
  var formStandardUnit = document.getElementById('form-standard-unit');
  var parentKeyField = document.getElementById('parent-key-field');
  var taxonomyLevelField = document.getElementById('taxonomy-level-field');
  var standardUnitField = document.getElementById('standard-unit-field');
  var catalogTabs = document.getElementById('catalog-tabs');
  var cancelFormButton = document.getElementById('cancel-form');

  var currentTab = 'breeds';
  var currentEditId = null;
  var batchSortMode = false;
  var sortDraft = null;
  var draggedRowId = null;

  function tableColspan() {
    return batchSortMode ? 8 : 7;
  }

  function parseSortOrder(val) {
    var n = typeof val === 'number' ? val : parseInt(String(val == null ? '' : val).trim(), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function siblingKey(item) {
    if (!item || item.parentKey == null || item.parentKey === '') return '';
    return String(item.parentKey);
  }

  function collectionName() {
    if (currentTab === 'breeds') return 'breeds';
    if (currentTab === 'indicators') return 'testIndicators';
    return 'microbiotaTaxa';
  }

  function loadRows() {
    var catalog = svc.getCatalog();
    if (currentTab === 'breeds') return catalog.breeds.slice();
    if (currentTab === 'indicators') return catalog.testIndicators.slice();
    return catalog.microbiotaTaxa.slice();
  }

  function tabLabel() {
    if (currentTab === 'breeds') return '品种';
    if (currentTab === 'indicators') return '普通指标';
    return '菌群分类';
  }

  function compareBySortOrder(a, b) {
    var aSo = parseSortOrder(a.sortOrder);
    var bSo = parseSortOrder(b.sortOrder);
    if (aSo == null && bSo == null) return String(a.key).localeCompare(String(b.key));
    if (aSo == null) return 1;
    if (bSo == null) return -1;
    if (aSo !== bSo) return aSo - bSo;
    return String(a.key).localeCompare(String(b.key));
  }

  function getIndentLevel(item, rows) {
    var level = 0;
    var current = item;
    while (current && current.parentKey) {
      level += 1;
      current = rows.find(function (r) { return r.key === current.parentKey; });
      if (level > 10) break;
    }
    return level;
  }

  function buildHierarchy(items) {
    var result = [];
    var itemMap = {};
    items.forEach(function (item) {
      itemMap[item.key] = Object.assign({}, item, { children: [] });
    });
    items.forEach(function (item) {
      if (item.parentKey && itemMap[item.parentKey]) {
        itemMap[item.parentKey].children.push(itemMap[item.key]);
      } else {
        result.push(itemMap[item.key]);
      }
    });
    function flatten(nodes, flat) {
      flat = flat || [];
      nodes.sort(compareBySortOrder);
      nodes.forEach(function (node) {
        var copy = Object.assign({}, node);
        delete copy.children;
        flat.push(copy);
        if (node.children && node.children.length) flatten(node.children, flat);
      });
      return flat;
    }
    return flatten(result);
  }

  function getSiblingGroup(source, parentKey) {
    var pk = parentKey == null ? '' : String(parentKey);
    return source.filter(function (item) { return siblingKey(item) === pk; });
  }

  function sortSiblingGroup(siblings) {
    return siblings.slice().sort(compareBySortOrder);
  }

  function renumberSiblingGroup(source, parentKey) {
    var sorted = sortSiblingGroup(getSiblingGroup(source, parentKey));
    sorted.forEach(function (item, idx) {
      item.sortOrder = (idx + 1) * 10;
    });
  }

  function renumberAllGroups(source) {
    var seen = {};
    source.forEach(function (item) {
      var pk = siblingKey(item);
      if (!seen[pk]) {
        seen[pk] = true;
        renumberSiblingGroup(source, pk === '' ? null : pk);
      }
    });
  }

  function moveSibling(source, itemId, direction) {
    var item = source.find(function (r) { return String(r.id) === String(itemId); });
    if (!item) return;
    var pk = siblingKey(item);
    var siblings = sortSiblingGroup(getSiblingGroup(source, pk));
    var idx = siblings.findIndex(function (r) { return String(r.id) === String(itemId); });
    if (idx < 0) return;
    var targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    var tmp = siblings[idx];
    siblings[idx] = siblings[targetIdx];
    siblings[targetIdx] = tmp;
    siblings.forEach(function (s, i) { s.sortOrder = (i + 1) * 10; });
  }

  function dragReorder(source, draggedId, targetId) {
    if (String(draggedId) === String(targetId)) return false;
    var dragged = source.find(function (r) { return String(r.id) === String(draggedId); });
    var target = source.find(function (r) { return String(r.id) === String(targetId); });
    if (!dragged || !target) return false;
    if (siblingKey(dragged) !== siblingKey(target)) return false;
    var pk = siblingKey(dragged);
    var siblings = sortSiblingGroup(getSiblingGroup(source, pk));
    var fromIdx = siblings.findIndex(function (r) { return String(r.id) === String(draggedId); });
    var toIdx = siblings.findIndex(function (r) { return String(r.id) === String(targetId); });
    if (fromIdx < 0 || toIdx < 0) return false;
    var moved = siblings.splice(fromIdx, 1)[0];
    siblings.splice(toIdx, 0, moved);
    siblings.forEach(function (s, i) { s.sortOrder = (i + 1) * 10; });
    return true;
  }

  function validateSortDraft(source) {
    var groups = {};
    source.forEach(function (item) {
      var pk = siblingKey(item);
      if (!groups[pk]) groups[pk] = [];
      groups[pk].push(item);
    });
    var keys = Object.keys(groups);
    for (var i = 0; i < keys.length; i++) {
      var seen = {};
      var group = groups[keys[i]];
      for (var j = 0; j < group.length; j++) {
        var so = parseSortOrder(group[j].sortOrder);
        if (!so) return '「' + (group[j].label || group[j].key) + '」序号须为正整数';
        if (seen[so]) return '同级序号不能重复（' + so + '）';
        seen[so] = true;
      }
    }
    return null;
  }

  function cloneDraft(rows) {
    return JSON.parse(JSON.stringify(rows));
  }

  function activeSource() {
    return batchSortMode && sortDraft ? sortDraft : loadRows();
  }

  function typeBadge(item) {
    if (currentTab === 'breeds') return item.parentKey ? '子品种' : '大类';
    if (currentTab === 'indicators') return '普通指标';
    return item.level === 'phylum' ? '门' : '属';
  }

  function metaCell(item) {
    if (currentTab === 'indicators') return item.standardUnit || '—';
    if (currentTab === 'microbiota') {
      return svc.levelToLabel(item.level) + (item.parentKey ? ' / ' + item.parentKey : '');
    }
    return item.parentKey || '—';
  }

  function renderSortCell(item) {
    if (batchSortMode) {
      return '<input type="number" min="1" step="1" class="catalog-sort-order-input batch-sort-order" data-id="' +
        C.escapeHtml(item.id) + '" value="' + C.escapeHtml(item.sortOrder == null ? '' : item.sortOrder) + '">';
    }
    return '<span class="text-sm text-gray-700 tabular-nums">' + C.escapeHtml(item.sortOrder == null ? '—' : item.sortOrder) + '</span>';
  }

  function renderTable(filter) {
    filter = batchSortMode ? '' : (filter || '').toLowerCase();
    var allRows = activeSource();
    var rows = allRows.filter(function (item) {
      if (!filter) return true;
      return [item.key, item.label, item.value, item.standardUnit, item.level, item.sortOrder]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .indexOf(filter) >= 0;
    });
    rows = buildHierarchy(rows);
    tableBody.innerHTML = '';
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="' + tableColspan() + '" class="px-6 py-4 text-center text-gray-500">暂无' + tabLabel() + '数据</td></tr>';
      return;
    }
    rows.forEach(function (item) {
      var level = getIndentLevel(item, allRows);
      var indent = '&nbsp;'.repeat(level * 4);
      var tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50' + (batchSortMode ? ' catalog-sort-row' : '');
      if (batchSortMode) {
        tr.draggable = true;
        tr.dataset.id = item.id;
        tr.dataset.parentKey = siblingKey(item);
      }
      var dragCell = batchSortMode
        ? '<td class="catalog-col-drag px-2 py-3"><span class="catalog-sort-handle" title="拖动排序" aria-hidden="true"><i class="fas fa-grip-vertical"></i></span></td>'
        : '';
      var actionsCell;
      if (batchSortMode) {
        actionsCell =
          '<td class="catalog-col-actions px-4 py-3 whitespace-nowrap text-sm">' +
            '<div class="catalog-sort-move-group">' +
              '<button type="button" class="ant-btn ant-btn-default ant-btn-sm sort-move-up" data-id="' + C.escapeHtml(item.id) + '" title="上移" aria-label="上移"><i class="fas fa-arrow-up"></i></button>' +
              '<button type="button" class="ant-btn ant-btn-default ant-btn-sm sort-move-down" data-id="' + C.escapeHtml(item.id) + '" title="下移" aria-label="下移"><i class="fas fa-arrow-down"></i></button>' +
            '</div>' +
          '</td>';
      } else {
        actionsCell =
          '<td class="catalog-col-actions px-6 py-4 whitespace-nowrap text-sm font-medium">' +
            '<button type="button" class="ant-btn ant-btn-link edit-key" data-id="' + C.escapeHtml(item.id) + '"><i class="fas fa-edit mr-1"></i>编辑</button>' +
            '<button type="button" class="ant-btn ant-btn-link ant-btn-link-danger delete-key" data-id="' + C.escapeHtml(item.id) + '"><i class="fas fa-trash mr-1"></i>删除</button>' +
          '</td>';
      }
      tr.innerHTML =
        (batchSortMode ? dragCell : '') +
        '<td class="catalog-col-sort px-4 py-4 whitespace-nowrap">' + renderSortCell(item) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + indent + C.escapeHtml(item.key) + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + C.escapeHtml(item.label) + '</td>' +
        '<td class="px-6 py-4 text-sm text-gray-700">' + C.escapeHtml(item.value || item.standardUnit || '—') + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + C.escapeHtml(metaCell(item)) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><span class="ant-tag ant-tag-processing">' + typeBadge(item) + '</span></td>' +
        actionsCell;
      tableBody.appendChild(tr);
    });
  }

  function syncTableHeader() {
    if (!catalogTable) return;
    var headRow = catalogTable.querySelector('thead tr');
    if (!headRow) return;
    var dragTh = headRow.querySelector('.catalog-col-drag');
    if (batchSortMode) {
      if (!dragTh) {
        dragTh = document.createElement('th');
        dragTh.className = 'catalog-col-drag px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        dragTh.innerHTML = '<span class="sr-only">拖动</span>';
        headRow.insertBefore(dragTh, headRow.firstChild);
      }
      var actionTh = headRow.querySelector('.catalog-col-actions');
      if (actionTh) actionTh.textContent = '移动';
    } else if (dragTh) {
      dragTh.remove();
      var actionThNormal = headRow.querySelector('.catalog-col-actions');
      if (actionThNormal) actionThNormal.textContent = '操作';
    }
  }

  function updateBatchSortUi() {
    if (!pageRoot) return;
    pageRoot.classList.toggle('catalog-sort-mode', batchSortMode);
    batchSortToolbar.classList.toggle('hidden', !batchSortMode);
    batchSortToggle.classList.toggle('hidden', batchSortMode);
    addNewKeyButton.classList.toggle('hidden', batchSortMode);
    searchInput.disabled = batchSortMode;
    if (batchSortMode) {
      searchInput.value = '';
      searchInput.placeholder = '批量排序模式下搜索已禁用';
    } else {
      searchInput.placeholder = '搜索编码 Key、标签名称或说明内容';
    }
    syncTableHeader();
  }

  function enterBatchSortMode() {
    batchSortMode = true;
    sortDraft = cloneDraft(loadRows());
    updateBatchSortUi();
    renderTable();
  }

  function exitBatchSortMode() {
    batchSortMode = false;
    sortDraft = null;
    draggedRowId = null;
    updateBatchSortUi();
    renderTable(searchInput.value.trim());
  }

  function updateParentKeyOptions(excludeId) {
    formParentKey.innerHTML = '<option value="">无父级（顶级）</option>';
    loadRows().forEach(function (row) {
      if (excludeId && row.id === excludeId) return;
      if (currentTab === 'microbiota' && row.level === 'genus') return;
      var option = document.createElement('option');
      option.value = row.key;
      option.textContent = row.label + ' (' + row.key + ')';
      formParentKey.appendChild(option);
    });
  }

  function updateTabUi() {
    catalogTabs.querySelectorAll('.catalog-tab').forEach(function (btn) {
      var active = btn.dataset.tab === currentTab;
      btn.className = 'catalog-tab px-4 py-2 rounded-md text-sm font-medium ' +
        (active ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700');
    });
    taxonomyLevelField.classList.toggle('hidden', currentTab !== 'microbiota');
    standardUnitField.classList.toggle('hidden', currentTab !== 'indicators');
    parentKeyField.classList.toggle('hidden', currentTab === 'indicators');
  }

  function showMainView() {
    mainView.classList.remove('hidden');
    formView.classList.add('hidden');
    renderTable(searchInput.value.trim());
  }

  function showFormView(isEdit, editId) {
    if (batchSortMode) return;
    mainView.classList.add('hidden');
    formView.classList.remove('hidden');
    updateTabUi();
    currentEditId = isEdit ? editId : null;
    formTitle.textContent = (isEdit ? '编辑' : '新增') + tabLabel();
    keyForm.reset();
    updateParentKeyOptions(editId);
    if (isEdit && editId) {
      var item = loadRows().find(function (r) { return String(r.id) === String(editId); });
      if (!item) return;
      formCustomKey.value = item.key;
      formCustomLabel.value = item.label;
      formCustomValue.value = item.value || '';
      formParentKey.value = item.parentKey || '';
      formSortOrder.value = item.sortOrder != null ? item.sortOrder : '';
      if (currentTab === 'microbiota') formTaxonomyLevel.value = item.level || 'genus';
      if (currentTab === 'indicators') formStandardUnit.value = item.standardUnit || '';
    }
  }

  function switchTab(nextTab) {
    if (batchSortMode) exitBatchSortMode();
    currentTab = nextTab;
    updateTabUi();
    renderTable(searchInput.value.trim());
  }

  catalogTabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.catalog-tab');
    if (!btn || btn.dataset.tab === currentTab) return;
    switchTab(btn.dataset.tab);
  });

  addNewKeyButton.addEventListener('click', function () { showFormView(false); });
  batchSortToggle.addEventListener('click', enterBatchSortMode);
  batchSortCancel.addEventListener('click', exitBatchSortMode);
  batchSortRenumber.addEventListener('click', function () {
    if (!sortDraft) return;
    renumberAllGroups(sortDraft);
    renderTable();
    C.toast('已按当前顺序重新编号', 'info');
  });
  batchSortSave.addEventListener('click', function () {
    if (!sortDraft) return;
    var err = validateSortDraft(sortDraft);
    if (err) {
      C.toast(err, 'warning');
      return;
    }
    try {
      svc.saveCatalogOrder(collectionName(), sortDraft);
      C.toast('排序已保存', 'success');
      exitBatchSortMode();
    } catch (saveErr) {
      C.toast(saveErr.message || '保存失败', 'warning');
    }
  });

  backToListButton.addEventListener('click', showMainView);
  cancelFormButton.addEventListener('click', showMainView);
  searchInput.addEventListener('input', function (e) {
    if (batchSortMode) return;
    renderTable(e.target.value.trim());
  });

  keyForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = formCustomKey.value.trim();
    var label = formCustomLabel.value.trim();
    if (!key || !label) {
      C.toast('编码 Key 和标签名称不能为空', 'warning');
      return;
    }
    var payload = {
      id: currentEditId,
      key: key,
      label: label,
      value: formCustomValue.value.trim(),
      parentKey: currentTab === 'indicators' ? null : (formParentKey.value || null)
    };
    var sortInput = formSortOrder.value.trim();
    if (sortInput) {
      var parsedSort = parseSortOrder(sortInput);
      if (!parsedSort) {
        C.toast('序号须为正整数', 'warning');
        return;
      }
      payload.sortOrder = parsedSort;
    }
    if (currentTab === 'microbiota') {
      payload.level = formTaxonomyLevel.value;
      if (!payload.parentKey && payload.level === 'genus') {
        C.toast('属级分类需选择父级门', 'warning');
        return;
      }
    }
    if (currentTab === 'indicators') {
      payload.standardUnit = formStandardUnit.value.trim() || '%';
    }
    try {
      svc.saveCatalogItem(collectionName(), payload);
      C.toast('已保存', 'success');
      showMainView();
    } catch (saveErr) {
      C.toast(saveErr.message || '保存失败', 'warning');
    }
  });

  tableBody.addEventListener('click', function (e) {
    if (batchSortMode) {
      var upBtn = e.target.closest('.sort-move-up');
      if (upBtn) {
        moveSibling(sortDraft, upBtn.dataset.id, -1);
        renderTable();
        return;
      }
      var downBtn = e.target.closest('.sort-move-down');
      if (downBtn) {
        moveSibling(sortDraft, downBtn.dataset.id, 1);
        renderTable();
        return;
      }
      return;
    }
    var editBtn = e.target.closest('.edit-key');
    if (editBtn) {
      showFormView(true, editBtn.dataset.id);
      return;
    }
    var delBtn = e.target.closest('.delete-key');
    if (delBtn) {
      C.confirmDialog('确定删除该资料项？', function () {
        svc.deleteCatalogItem(collectionName(), delBtn.dataset.id);
        C.toast('已删除', 'success');
        renderTable(searchInput.value.trim());
      });
    }
  });

  tableBody.addEventListener('change', function (e) {
    if (!batchSortMode) return;
    var input = e.target.closest('.batch-sort-order');
    if (!input || !sortDraft) return;
    var item = sortDraft.find(function (r) { return String(r.id) === String(input.dataset.id); });
    if (!item) return;
    var parsed = parseSortOrder(input.value);
    if (!parsed) {
      C.toast('序号须为正整数', 'warning');
      input.value = item.sortOrder == null ? '' : item.sortOrder;
      return;
    }
    item.sortOrder = parsed;
  });

  tableBody.addEventListener('dragstart', function (e) {
    if (!batchSortMode) return;
    var row = e.target.closest('.catalog-sort-row');
    if (!row) return;
    draggedRowId = row.dataset.id;
    row.classList.add('catalog-sort-dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedRowId);
    }
  });

  tableBody.addEventListener('dragend', function (e) {
    if (!batchSortMode) return;
    var row = e.target.closest('.catalog-sort-row');
    if (row) row.classList.remove('catalog-sort-dragging');
    tableBody.querySelectorAll('.catalog-sort-row').forEach(function (tr) {
      tr.classList.remove('catalog-sort-drag-over', 'catalog-sort-drag-invalid');
    });
    draggedRowId = null;
  });

  tableBody.addEventListener('dragover', function (e) {
    if (!batchSortMode || !draggedRowId) return;
    e.preventDefault();
    var row = e.target.closest('.catalog-sort-row');
    tableBody.querySelectorAll('.catalog-sort-row').forEach(function (tr) {
      tr.classList.remove('catalog-sort-drag-over', 'catalog-sort-drag-invalid');
    });
    if (!row || String(row.dataset.id) === String(draggedRowId)) return;
    var dragged = sortDraft.find(function (r) { return String(r.id) === String(draggedRowId); });
    if (!dragged) return;
    if (siblingKey(dragged) === row.dataset.parentKey) {
      row.classList.add('catalog-sort-drag-over');
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    } else {
      row.classList.add('catalog-sort-drag-invalid');
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
    }
  });

  tableBody.addEventListener('drop', function (e) {
    if (!batchSortMode || !draggedRowId) return;
    e.preventDefault();
    var row = e.target.closest('.catalog-sort-row');
    if (!row) return;
    if (siblingKey(sortDraft.find(function (r) { return String(r.id) === String(draggedRowId); })) !== row.dataset.parentKey) {
      C.toast('不能跨父级移动，请在同一父级下调整顺序', 'warning');
      return;
    }
    if (dragReorder(sortDraft, draggedRowId, row.dataset.id)) {
      renderTable();
    }
  });

  if (window.PetAdminCommon && window.PetAdminCommon.subscribeDemo) {
    window.__petAdminPageTeardown = window.PetAdminCommon.subscribeDemo(function () {
      if (!formView.classList.contains('hidden')) return;
      if (batchSortMode) {
        sortDraft = cloneDraft(loadRows());
      }
      renderTable(searchInput.value.trim());
    });
  }

  updateTabUi();
  updateBatchSortUi();
  showMainView();
}

window.initDictionaryManagement = initDictionaryManagement;
