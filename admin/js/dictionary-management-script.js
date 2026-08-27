function initDictionaryManagement() {
  var svc = window.dictionaryDataService;
  var C = window.PetAdminCommon;
  if (!svc) return;

  var mainView = document.getElementById('main-view');
  var formView = document.getElementById('form-view');
  var formTitle = document.getElementById('form-title');
  var searchInput = document.getElementById('search-custom-key');
  var tableBody = document.getElementById('custom-key-table-body');
  var addNewKeyButton = document.getElementById('add-new-key');
  var backToListButton = document.getElementById('back-to-list');
  var keyForm = document.getElementById('key-form');
  var formCustomKey = document.getElementById('form-custom-key');
  var formCustomLabel = document.getElementById('form-custom-label');
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
      nodes.sort(function (a, b) { return String(a.key).localeCompare(String(b.key)); });
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

  function renderTable(filter) {
    filter = (filter || '').toLowerCase();
    var allRows = loadRows();
    var rows = allRows.filter(function (item) {
      if (!filter) return true;
      return [item.key, item.label, item.value, item.standardUnit, item.level]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .indexOf(filter) >= 0;
    });
    rows = buildHierarchy(rows);
    tableBody.innerHTML = '';
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">暂无' + tabLabel() + '数据</td></tr>';
      return;
    }
    rows.forEach(function (item) {
      var level = getIndentLevel(item, allRows);
      var indent = '&nbsp;'.repeat(level * 4);
      var meta = currentTab === 'indicators'
        ? (item.standardUnit || '—')
        : (currentTab === 'microbiota' ? (svc.levelToLabel(item.level) + (item.parentKey ? ' / ' + item.parentKey : '')) : (item.parentKey || '—'));
      var typeBadge = currentTab === 'breeds'
        ? (item.parentKey ? '子品种' : '大类')
        : (currentTab === 'indicators' ? '普通指标' : (item.level === 'phylum' ? '门' : '属'));
      var tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50';
      tr.innerHTML =
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + indent + C.escapeHtml(item.key) + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + C.escapeHtml(item.label) + '</td>' +
        '<td class="px-6 py-4 text-sm text-gray-700">' + C.escapeHtml(item.value || item.standardUnit || '—') + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + C.escapeHtml(meta) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">' + typeBadge + '</span></td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">' +
          '<button class="text-blue-600 hover:text-blue-900 mr-3 edit-key" data-id="' + C.escapeHtml(item.id) + '"><i class="fas fa-edit mr-1"></i>编辑</button>' +
          '<button class="text-red-600 hover:text-red-900 delete-key" data-id="' + C.escapeHtml(item.id) + '"><i class="fas fa-trash mr-1"></i>删除</button>' +
        '</td>';
      tableBody.appendChild(tr);
    });
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
      if (currentTab === 'microbiota') formTaxonomyLevel.value = item.level || 'genus';
      if (currentTab === 'indicators') formStandardUnit.value = item.standardUnit || '';
    }
  }

  catalogTabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.catalog-tab');
    if (!btn) return;
    currentTab = btn.dataset.tab;
    updateTabUi();
    renderTable(searchInput.value.trim());
  });

  addNewKeyButton.addEventListener('click', function () { showFormView(false); });
  backToListButton.addEventListener('click', showMainView);
  cancelFormButton.addEventListener('click', showMainView);
  searchInput.addEventListener('input', function (e) { renderTable(e.target.value.trim()); });

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
    svc.saveCatalogItem(collectionName(), payload);
    C.toast('已保存', 'success');
    showMainView();
  });

  tableBody.addEventListener('click', function (e) {
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

  if (window.PetAdminCommon && window.PetAdminCommon.subscribeDemo) {
    window.__petAdminPageTeardown = window.PetAdminCommon.subscribeDemo(function () {
      if (!formView.classList.contains('hidden')) return;
      renderTable(searchInput.value.trim());
    });
  }

  updateTabUi();
  showMainView();
}

window.initDictionaryManagement = initDictionaryManagement;
