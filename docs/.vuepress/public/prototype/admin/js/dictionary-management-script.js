function initDictionaryManagement(mountRoot, tab) {
  var root = mountRoot || document;
  var svc = window.dictionaryDataService;
  var C = window.PetAdminCommon;
  var BT = window.PetAdminBasicTable;
  var Modal = window.PetAdminModal;
  var Perms = window.PetAdminPermissions;
  var Session = window.PetAdminSession;
  if (!svc || !C || !BT) return;

  var pageRoot = root.querySelector('#dictionary-management');
  if (!pageRoot) return;

  var cssLink = root.querySelector('link[href*="dictionary-management.css"]');
  if (cssLink && !document.getElementById('pet-admin-dictionary-management-css')) {
    var headLink = document.createElement('link');
    headLink.id = 'pet-admin-dictionary-management-css';
    headLink.rel = 'stylesheet';
    headLink.href = cssLink.getAttribute('href');
    document.head.appendChild(headLink);
  }

  var listMount = root.querySelector('#dm-list-mount');
  var catalogTabs = root.querySelector('#catalog-tabs');
  var batchSortToolbar = root.querySelector('#batch-sort-toolbar');
  var batchSortToggle = root.querySelector('#batch-sort-toggle');
  var addNewKeyButton = root.querySelector('#add-new-key');

  var currentTab = 'breeds';
  var currentEditId = null;
  var batchSortMode = false;
  var sortDraft = null;
  var draggedRowId = null;
  var batchSortDirty = false;
  var catalogModalDirty = false;
  var listApi = null;
  var tabActive = true;
  var activeCatalogModal = null;

  function q(sel) { return root.querySelector(sel); }

  function canEditCatalog() {
    return Perms ? Perms.can('edit_catalog') : true;
  }

  function syncReadOnly() {
    pageRoot.classList.toggle('dm-readonly', !canEditCatalog());
    if (addNewKeyButton) addNewKeyButton.disabled = !canEditCatalog();
    if (batchSortToggle) batchSortToggle.disabled = !canEditCatalog();
  }

  function syncTabDirty() {
    var dirty = !!(batchSortDirty || catalogModalDirty);
    if (tab && Session && Session.setTabDirty) {
      Session.setTabDirty(tab.id, dirty);
    } else if (typeof window.__petAdminSetTabDirty === 'function') {
      window.__petAdminSetTabDirty(dirty);
    }
  }

  function setCatalogModalDirty(dirty) {
    catalogModalDirty = !!dirty;
    syncTabDirty();
  }

  function setBatchSortDirty(dirty) {
    batchSortDirty = !!dirty;
    syncTabDirty();
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

  function parseSortOrder(val) {
    var n = typeof val === 'number' ? val : parseInt(String(val == null ? '' : val).trim(), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function siblingKey(item) {
    if (!item || item.parentKey == null || item.parentKey === '') return '';
    return String(item.parentKey);
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

  function keyCell(level, key) {
    var style = level > 0 ? ' style="padding-left:' + (level * 16) + 'px;display:inline-block"' : '';
    return '<span class="dm-tree-key"' + style + '>' + C.escapeHtml(key) + '</span>';
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
    setBatchSortDirty(true);
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
    setBatchSortDirty(true);
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

  function updateTabUi() {
    catalogTabs.querySelectorAll('.catalog-tab').forEach(function (btn) {
      var active = btn.dataset.tab === currentTab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    syncReadOnly();
  }

  function updateBatchSortUi() {
    pageRoot.classList.toggle('catalog-sort-mode', batchSortMode);
    batchSortToolbar.classList.toggle('hidden', !batchSortMode);
    batchSortToggle.classList.toggle('hidden', batchSortMode || !canEditCatalog());
    addNewKeyButton.classList.toggle('hidden', batchSortMode || !canEditCatalog());
    updateTabUi();
  }

  function enterBatchSortMode() {
    if (!canEditCatalog()) {
      C.toast('当前账号无编辑专业资料的权限', 'warning');
      return;
    }
    if (activeCatalogModal) {
      C.toast('请先完成或关闭当前编辑窗口', 'warning');
      return;
    }
    batchSortMode = true;
    sortDraft = cloneDraft(loadRows());
    setBatchSortDirty(false);
    listMount.classList.add('hidden');
    q('#dm-sort-mount').classList.remove('hidden');
    updateBatchSortUi();
    renderSortTable();
  }

  function exitBatchSortMode() {
    batchSortMode = false;
    sortDraft = null;
    draggedRowId = null;
    setBatchSortDirty(false);
    listMount.classList.remove('hidden');
    q('#dm-sort-mount').classList.add('hidden');
    q('#dm-sort-mount').innerHTML = '';
    updateBatchSortUi();
    initListPage();
  }

  function renderSortTable() {
    var mount = root.querySelector('#dm-sort-mount');
    if (!mount) return;
    var allRows = activeSource();
    var rows = buildHierarchy(allRows);
    mount.innerHTML = '<div class="rondo-basic-table-wrap"><table class="rondo-basic-table rondo-table-sm ant-table">' +
      '<thead><tr><th></th><th>序号</th><th>编码 Key</th><th>标签名称</th><th>说明/单位</th><th>父级/层级</th><th>类型</th><th>移动</th></tr></thead><tbody id="dm-sort-tbody"></tbody></table></div>';
    var tbody = mount.querySelector('#dm-sort-tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="rondo-basic-table-empty">暂无' + tabLabel() + '数据</td></tr>';
      return;
    }
    rows.forEach(function (item) {
      var level = getIndentLevel(item, allRows);
      var indent = '&nbsp;'.repeat(level * 4);
      var tr = document.createElement('tr');
      tr.className = 'catalog-sort-row';
      tr.draggable = true;
      tr.dataset.id = item.id;
      tr.dataset.parentKey = siblingKey(item);
      tr.innerHTML =
        '<td class="catalog-col-drag"><span class="catalog-sort-handle"><i class="fas fa-grip-vertical"></i></span></td>' +
        '<td><input type="number" min="1" class="batch-sort-order rondo-input ant-input" data-id="' + C.escapeHtml(item.id) + '" value="' + C.escapeHtml(item.sortOrder == null ? '' : item.sortOrder) + '"></td>' +
        '<td>' + indent + C.escapeHtml(item.key) + '</td>' +
        '<td>' + C.escapeHtml(item.label) + '</td>' +
        '<td>' + C.escapeHtml(item.value || item.standardUnit || '—') + '</td>' +
        '<td>' + C.escapeHtml(metaCell(item)) + '</td>' +
        '<td><span class="ant-tag ant-tag-processing">' + typeBadge(item) + '</span></td>' +
        '<td><button type="button" class="rondo-btn rondo-btn-sm rondo-btn-default sort-move-up" data-id="' + C.escapeHtml(item.id) + '">↑</button> ' +
        '<button type="button" class="rondo-btn rondo-btn-sm rondo-btn-default sort-move-down" data-id="' + C.escapeHtml(item.id) + '">↓</button></td>';
      tbody.appendChild(tr);
    });
    bindSortTableEvents(tbody);
  }

  function bindSortTableEvents(tbody) {
    tbody.addEventListener('click', function (e) {
      var upBtn = e.target.closest('.sort-move-up');
      if (upBtn) {
        moveSibling(sortDraft, upBtn.dataset.id, -1);
        renderSortTable();
        return;
      }
      var downBtn = e.target.closest('.sort-move-down');
      if (downBtn) {
        moveSibling(sortDraft, downBtn.dataset.id, 1);
        renderSortTable();
      }
    });
    tbody.addEventListener('change', function (e) {
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
      setBatchSortDirty(true);
    });
    tbody.addEventListener('dragstart', function (e) {
      var row = e.target.closest('.catalog-sort-row');
      if (!row) return;
      draggedRowId = row.dataset.id;
      row.classList.add('catalog-sort-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedRowId);
      }
    });
    tbody.addEventListener('dragend', function () {
      var row = tbody.querySelector('.catalog-sort-dragging');
      if (row) row.classList.remove('catalog-sort-dragging');
      tbody.querySelectorAll('.catalog-sort-row').forEach(function (tr) {
        tr.classList.remove('catalog-sort-drag-over', 'catalog-sort-drag-invalid');
      });
      draggedRowId = null;
    });
    tbody.addEventListener('dragover', function (e) {
      if (!draggedRowId) return;
      e.preventDefault();
      var row = e.target.closest('.catalog-sort-row');
      tbody.querySelectorAll('.catalog-sort-row').forEach(function (tr) {
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
    tbody.addEventListener('drop', function (e) {
      if (!draggedRowId) return;
      e.preventDefault();
      var row = e.target.closest('.catalog-sort-row');
      if (!row) return;
      if (siblingKey(sortDraft.find(function (r) { return String(r.id) === String(draggedRowId); })) !== row.dataset.parentKey) {
        C.toast('不能跨父级移动，请在同一父级下调整顺序', 'warning');
        return;
      }
      if (dragReorder(sortDraft, draggedRowId, row.dataset.id)) {
        renderSortTable();
      }
    });
  }

  function initListPage() {
    if (!listMount) return;
    listApi = null;
    listMount.innerHTML = '';
    listApi = BT.createListPage({
      container: listMount,
      stateKey: 'dictionary-' + currentTab,
      searchFields: batchSortMode ? [] : [
        { name: 'q', label: '搜索', placeholder: '编码 Key、标签名称或说明' }
      ],
      tableTools: { searchToggle: !batchSortMode, refresh: true, columnConfig: true, fullscreen: true },
      columns: [
        { title: '序号', dataIndex: 'sortOrder', width: '72px' },
        { title: '编码 Key', dataIndex: 'keyHtml', render: function (row) { return row.keyHtml; } },
        { title: '标签名称', dataIndex: 'label' },
        { title: '说明/单位', dataIndex: 'valueText' },
        { title: '父级/层级', dataIndex: 'metaText' },
        { title: '类型', dataIndex: 'typeHtml', render: function (row) { return row.typeHtml; } },
        { title: '操作', key: 'actions', action: true, required: true, render: function (row) {
          if (!canEditCatalog()) return '—';
          return '<button type="button" class="rondo-btn rondo-btn-link" data-row-action="edit" data-id="' + C.escapeHtml(row.id) + '">编辑</button>' +
            '<button type="button" class="rondo-btn rondo-btn-link rondo-btn-link-danger" data-row-action="delete" data-id="' + C.escapeHtml(row.id) + '">删除</button>';
        }}
      ],
      rowKey: 'id',
      fetchData: function (query) {
        if (batchSortMode) return { rows: [], total: 0 };
        var filter = String((query.filters && query.filters.q) || '').trim().toLowerCase();
        var allRows = loadRows();
        var rows = allRows.filter(function (item) {
          if (!filter) return true;
          return [item.key, item.label, item.value, item.standardUnit, item.level, item.sortOrder]
            .filter(Boolean).join(' ').toLowerCase().indexOf(filter) >= 0;
        });
        rows = buildHierarchy(rows).map(function (item) {
          var level = getIndentLevel(item, allRows);
          return {
            id: item.id,
            sortOrder: item.sortOrder == null ? '—' : item.sortOrder,
            keyHtml: keyCell(level, item.key),
            label: item.label,
            valueText: item.value || item.standardUnit || '—',
            metaText: metaCell(item),
            typeHtml: '<span class="ant-tag ant-tag-processing">' + C.escapeHtml(typeBadge(item)) + '</span>'
          };
        });
        var total = rows.length;
        var start = (query.page - 1) * query.pageSize;
        return { rows: rows.slice(start, start + query.pageSize), total: total };
      },
      onRowAction: function (action, row) {
        if (!canEditCatalog()) return;
        if (action === 'edit') openCatalogModal(true, row.id);
        if (action === 'delete') {
          C.confirmDialog('确定删除该资料项？', function () {
            svc.deleteCatalogItem(collectionName(), row.id);
            C.toast('已删除', 'success');
            if (listApi) listApi.reload();
          });
        }
      }
    });
  }

  function parentOptionsHtml(excludeId) {
    var html = '<option value="">无父级（顶级）</option>';
    loadRows().forEach(function (row) {
      if (excludeId && row.id === excludeId) return;
      if (currentTab === 'microbiota' && row.level === 'genus') return;
      html += '<option value="' + C.escapeHtml(row.key) + '">' +
        C.escapeHtml(row.label + ' (' + row.key + ')') + '</option>';
    });
    return html;
  }

  function buildCatalogModalBody() {
    var showParent = currentTab !== 'indicators';
    var showTaxonomy = currentTab === 'microbiota';
    var showUnit = currentTab === 'indicators';
    return '<form id="dm-catalog-modal-form" class="rondo-form dm-catalog-modal-form">' +
      '<div class="rondo-form-field">' +
      '<label class="rondo-form-label" for="dm-modal-key">编码 Key <span class="rondo-required">*</span></label>' +
      '<input type="text" id="dm-modal-key" class="rondo-input ant-input" placeholder="稳定编码，报告检测项引用" required>' +
      '</div>' +
      '<div class="rondo-form-field">' +
      '<label class="rondo-form-label" for="dm-modal-label">标签名称 <span class="rondo-required">*</span></label>' +
      '<input type="text" id="dm-modal-label" class="rondo-input ant-input" required>' +
      '</div>' +
      '<div class="rondo-form-field">' +
      '<label class="rondo-form-label" for="dm-modal-value">说明</label>' +
      '<input type="text" id="dm-modal-value" class="rondo-input ant-input">' +
      '</div>' +
      (showParent
        ? '<div class="rondo-form-field" id="dm-modal-parent-field">' +
          '<label class="rondo-form-label" for="dm-modal-parent">父级</label>' +
          '<select id="dm-modal-parent" class="rondo-select ant-select-native">' + parentOptionsHtml(currentEditId) + '</select>' +
          '</div>'
        : '') +
      (showTaxonomy
        ? '<div class="rondo-form-field" id="dm-modal-taxonomy-field">' +
          '<label class="rondo-form-label" for="dm-modal-taxonomy">分类层级</label>' +
          '<select id="dm-modal-taxonomy" class="rondo-select ant-select-native">' +
          '<option value="phylum">门</option><option value="genus">属</option>' +
          '</select></div>'
        : '') +
      (showUnit
        ? '<div class="rondo-form-field" id="dm-modal-unit-field">' +
          '<label class="rondo-form-label" for="dm-modal-unit">标准单位</label>' +
          '<input type="text" id="dm-modal-unit" class="rondo-input ant-input" placeholder="%">' +
          '</div>'
        : '') +
      '<div class="rondo-form-field">' +
      '<label class="rondo-form-label" for="dm-modal-sort">序号</label>' +
      '<input type="number" min="1" id="dm-modal-sort" class="rondo-input ant-input" placeholder="留空则自动追加">' +
      '</div></form>';
  }

  function fillCatalogModal(overlay, item) {
    var keyInput = overlay.querySelector('#dm-modal-key');
    var labelInput = overlay.querySelector('#dm-modal-label');
    var valueInput = overlay.querySelector('#dm-modal-value');
    var parentSelect = overlay.querySelector('#dm-modal-parent');
    var taxonomySelect = overlay.querySelector('#dm-modal-taxonomy');
    var unitInput = overlay.querySelector('#dm-modal-unit');
    var sortInput = overlay.querySelector('#dm-modal-sort');
    if (!item) {
      if (keyInput) keyInput.value = '';
      if (labelInput) labelInput.value = '';
      if (valueInput) valueInput.value = '';
      if (parentSelect) parentSelect.value = '';
      if (taxonomySelect) taxonomySelect.value = 'genus';
      if (unitInput) unitInput.value = '';
      if (sortInput) sortInput.value = '';
      return;
    }
    if (keyInput) keyInput.value = item.key || '';
    if (labelInput) labelInput.value = item.label || '';
    if (valueInput) valueInput.value = item.value || '';
    if (parentSelect) parentSelect.value = item.parentKey || '';
    if (taxonomySelect) taxonomySelect.value = item.level || 'genus';
    if (unitInput) unitInput.value = item.standardUnit || '';
    if (sortInput) sortInput.value = item.sortOrder != null ? item.sortOrder : '';
  }

  function closeCatalogModal() {
    if (activeCatalogModal) {
      activeCatalogModal.close();
      activeCatalogModal = null;
    }
    currentEditId = null;
    setCatalogModalDirty(false);
  }

  function openCatalogModal(isEdit, editId) {
    if (batchSortMode) return;
    if (!canEditCatalog()) {
      C.toast('当前账号无编辑专业资料的权限', 'warning');
      return;
    }
    if (!Modal || !Modal.open) {
      C.toast('标准弹窗组件不可用', 'error');
      return;
    }
    if (activeCatalogModal) {
      closeCatalogModal();
    }

    currentEditId = isEdit ? editId : null;
    var item = null;
    if (isEdit && editId) {
      item = loadRows().find(function (r) { return String(r.id) === String(editId); });
      if (!item) {
        C.toast('资料项不存在或已删除', 'warning');
        return;
      }
    }

    var modalDirtyFlag = false;
    activeCatalogModal = Modal.open({
      title: (isEdit ? '编辑' : '新增') + tabLabel(),
      width: 'md',
      bodyHtml: buildCatalogModalBody(),
      okLabel: '保存',
      isDirty: function () { return modalDirtyFlag; },
      onDirty: function () {
        modalDirtyFlag = true;
        setCatalogModalDirty(true);
      },
      onCancel: function (close) {
        close();
        activeCatalogModal = null;
        currentEditId = null;
        setCatalogModalDirty(false);
      },
      onClose: function () {
        activeCatalogModal = null;
        currentEditId = null;
        setCatalogModalDirty(false);
      },
      onOk: function (close, overlay, setLoading) {
        if (!canEditCatalog()) {
          C.toast('当前账号无编辑专业资料的权限', 'warning');
          return;
        }
        var keyInput = overlay.querySelector('#dm-modal-key');
        var labelInput = overlay.querySelector('#dm-modal-label');
        var valueInput = overlay.querySelector('#dm-modal-value');
        var parentSelect = overlay.querySelector('#dm-modal-parent');
        var taxonomySelect = overlay.querySelector('#dm-modal-taxonomy');
        var unitInput = overlay.querySelector('#dm-modal-unit');
        var sortInput = overlay.querySelector('#dm-modal-sort');
        var key = keyInput ? keyInput.value.trim() : '';
        var label = labelInput ? labelInput.value.trim() : '';
        if (!key || !label) {
          C.toast('编码 Key 和标签名称不能为空', 'warning');
          return false;
        }
        var payload = {
          id: currentEditId,
          key: key,
          label: label,
          value: valueInput ? valueInput.value.trim() : '',
          parentKey: currentTab === 'indicators' ? null : ((parentSelect && parentSelect.value) || null)
        };
        if (sortInput && sortInput.value.trim()) {
          var parsedSort = parseSortOrder(sortInput.value);
          if (!parsedSort) {
            C.toast('序号须为正整数', 'warning');
            return false;
          }
          payload.sortOrder = parsedSort;
        }
        if (currentTab === 'microbiota' && taxonomySelect) {
          payload.level = taxonomySelect.value;
          if (!payload.parentKey && payload.level === 'genus') {
            C.toast('属级分类需选择父级门', 'warning');
            return false;
          }
        }
        if (currentTab === 'indicators' && unitInput) {
          payload.standardUnit = unitInput.value.trim() || '%';
        }
        setLoading(true);
        try {
          svc.saveCatalogItem(collectionName(), payload);
          C.toast('已保存', 'success');
          close();
          activeCatalogModal = null;
          currentEditId = null;
          setCatalogModalDirty(false);
          if (listApi) listApi.reload();
        } catch (saveErr) {
          C.toast(saveErr.message || '保存失败', 'warning');
          return false;
        } finally {
          setLoading(false);
        }
      }
    });

    fillCatalogModal(activeCatalogModal.root, item);
  }

  function switchTab(nextTab) {
    if (nextTab === currentTab) return;
    if (activeCatalogModal) {
      C.toast('请先完成或关闭当前编辑窗口', 'warning');
      return;
    }
    if (batchSortMode) exitBatchSortMode();
    currentTab = nextTab;
    updateTabUi();
    C.navigate('dictionary-management', { tab: currentTab });
    initListPage();
  }

  function handleRoute() {
    var route = C.parseRoute();
    if (route.pageId !== 'dictionary-management') return;
    if (route.params.tab && route.params.tab !== currentTab) {
      currentTab = route.params.tab;
      updateTabUi();
      if (!batchSortMode) initListPage();
    }
    var editParam = route.params.edit;
    if (editParam) {
      C.navigate('dictionary-management', { tab: currentTab });
      if (editParam === 'new') openCatalogModal(false);
      else openCatalogModal(true, editParam);
    }
  }

  catalogTabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.catalog-tab');
    if (!btn || btn.dataset.tab === currentTab) return;
    switchTab(btn.dataset.tab);
  });

  if (addNewKeyButton) {
    addNewKeyButton.addEventListener('click', function () { openCatalogModal(false); });
  }
  if (batchSortToggle) {
    batchSortToggle.addEventListener('click', enterBatchSortMode);
  }
  q('#batch-sort-cancel').addEventListener('click', exitBatchSortMode);
  q('#batch-sort-renumber').addEventListener('click', function () {
    if (!sortDraft) return;
    renumberAllGroups(sortDraft);
    renderSortTable();
    setBatchSortDirty(true);
    C.toast('已按当前顺序重新编号', 'info');
  });
  q('#batch-sort-save').addEventListener('click', function () {
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

  function onHashChange() {
    if (tab && Session && Session.getActiveTab() !== tab) return;
    handleRoute();
  }
  window.addEventListener('hashchange', onHashChange);

  function onTabActivate() {
    tabActive = true;
    syncReadOnly();
    handleRoute();
    if (!batchSortMode && listApi) listApi.reload();
  }

  function onTabDeactivate() {
    tabActive = false;
  }

  function onTabDispose() {
    closeCatalogModal();
    if (batchSortMode) {
      batchSortMode = false;
      sortDraft = null;
      setBatchSortDirty(false);
    }
  }

  function onTabCanLeave() {
    if (batchSortMode) {
      return window.confirm('批量排序尚未保存，确定离开吗？');
    }
    if (catalogModalDirty && activeCatalogModal) {
      return window.confirm('资料尚未保存，确定离开吗？');
    }
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

  var unsub = C.subscribeDemo ? C.subscribeDemo(function () {
    if (!tabActive) return;
    if (tab && Session && Session.getActiveTab() !== tab) return;
    if (activeCatalogModal) return;
    if (batchSortMode) {
      sortDraft = cloneDraft(loadRows());
      renderSortTable();
    } else if (listApi) {
      listApi.reload();
    }
  }) : function () {};

  var route = C.parseRoute();
  if (route.params.tab) currentTab = route.params.tab;
  updateBatchSortUi();
  initListPage();
  handleRoute();

  return function teardown() {
    closeCatalogModal();
    unsub();
    window.removeEventListener('hashchange', onHashChange);
  };
}

window.initDictionaryManagement = initDictionaryManagement;
