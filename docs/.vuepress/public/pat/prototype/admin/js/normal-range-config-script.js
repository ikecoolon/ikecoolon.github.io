function loadAdminScript(src) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[data-src="' + src + '"]')) {
      resolve();
      return;
    }
    var s = document.createElement('script');
    s.src = './js/' + src;
    s.dataset.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function initNormalRangeConfig() {
  loadAdminScript('range-matcher-util.js').then(function () {
    initNormalRangeConfigCore();
  }).catch(function () {
    initNormalRangeConfigCore();
  });
}

function initNormalRangeConfigCore() {
  var svc = window.dictionaryDataService;
  var C = window.PetAdminCommon;
  if (!svc || !C) return;

  var mainView = document.getElementById('main-view');
  var formView = document.getElementById('form-view');
  var tableBody = document.getElementById('table-body');
  var schemeForm = document.getElementById('scheme-form');
  var formTitle = document.getElementById('form-title');
  var itemsBody = document.getElementById('items-body');
  var speciesCheckboxes = document.getElementById('species-checkboxes');
  var importModal = document.getElementById('import-modal');
  var filterSpecies = document.getElementById('filter-species');

  var currentEditId = null;
  var formItems = [];

  var STATUS_LABELS = {
    active: '启用',
    draft: '草稿',
    disabled: '停用'
  };

  function getSchemes() {
    return svc.getReferenceRangeSchemes(false);
  }

  function speciesOptions() {
    return svc.getPetMajorBreeds();
  }

  function renderSpeciesFilters() {
    var majors = speciesOptions();
    filterSpecies.innerHTML = '<option value="">全部物种</option>';
    majors.forEach(function (major) {
      var option = document.createElement('option');
      option.value = major.key;
      option.textContent = major.label.replace(/科$/, '');
      filterSpecies.appendChild(option);
    });
  }

  function renderSpeciesCheckboxes(selected) {
    selected = selected || [];
    var majors = speciesOptions();
    speciesCheckboxes.innerHTML = majors.map(function (major) {
      var checked = selected.indexOf(major.key) >= 0 ? ' checked' : '';
      return '<label class="inline-flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-50">' +
        '<input type="checkbox" class="species-checkbox" value="' + C.escapeHtml(major.key) + '"' + checked + '>' +
        '<span>' + C.escapeHtml(major.label) + '</span></label>';
    }).join('');
  }

  function selectedSpeciesFromForm() {
    return Array.prototype.slice.call(document.querySelectorAll('.species-checkbox:checked'))
      .map(function (el) { return el.value; });
  }

  function statusBadge(status) {
    var cls = status === 'active' ? 'bg-green-100 text-green-800' :
      status === 'disabled' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-800';
    return '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ' + cls + '">' +
      (STATUS_LABELS[status] || status) + '</span>';
  }

  function speciesLabels(keys) {
    return (keys || []).map(function (key) {
      var major = speciesOptions().find(function (m) { return m.key === key; });
      return major ? major.label.replace(/科$/, '') : svc.speciesLabel(key);
    }).join('、') || '—';
  }

  function filterSchemes() {
    var species = filterSpecies.value;
    var status = document.getElementById('filter-status').value;
    var template = document.getElementById('filter-template').value.trim().toLowerCase();
    var name = document.getElementById('filter-name').value.trim().toLowerCase();
    return getSchemes().filter(function (scheme) {
      if (species && (!scheme.applicableSpecies || scheme.applicableSpecies.indexOf(species) < 0)) return false;
      if (status && scheme.status !== status) return false;
      if (template && String(scheme.templateId || '').toLowerCase().indexOf(template) < 0) return false;
      if (name && String(scheme.name || '').toLowerCase().indexOf(name) < 0) return false;
      return true;
    });
  }

  function renderTable() {
    var data = filterSchemes();
    if (!data.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">暂无参考范围方案</td></tr>';
      return;
    }
    tableBody.innerHTML = data.map(function (scheme) {
      var itemCount = (scheme.items || []).length;
      return '<tr class="hover:bg-gray-50">' +
        '<td class="px-6 py-4"><div class="text-sm font-medium text-gray-900">' + C.escapeHtml(scheme.name || '—') + '</div></td>' +
        '<td class="px-6 py-4 text-sm text-gray-700 font-mono">' + C.escapeHtml(scheme.templateId || '—') + '</td>' +
        '<td class="px-6 py-4 text-sm text-gray-700">' + C.escapeHtml(speciesLabels(scheme.applicableSpecies)) + '</td>' +
        '<td class="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title="' + C.escapeHtml(scheme.evidenceRef || '') + '">' + C.escapeHtml(scheme.evidenceRef || '—') + '</td>' +
        '<td class="px-6 py-4 text-sm text-gray-700">' + itemCount + '</td>' +
        '<td class="px-6 py-4 text-sm text-gray-700">v' + (scheme.version || 1) + '</td>' +
        '<td class="px-6 py-4">' + statusBadge(scheme.status) + '</td>' +
        '<td class="px-6 py-4 text-sm font-medium"><div class="flex space-x-2">' +
          '<button type="button" class="text-blue-600 hover:text-blue-900 edit-btn" data-id="' + C.escapeHtml(scheme.id) + '" title="编辑"><i class="fas fa-edit"></i></button>' +
          '<button type="button" class="text-teal-600 hover:text-teal-900 copy-btn" data-id="' + C.escapeHtml(scheme.id) + '" title="复制"><i class="fas fa-copy"></i></button>' +
          '<button type="button" class="text-red-600 hover:text-red-900 delete-btn" data-id="' + C.escapeHtml(scheme.id) + '" title="删除"><i class="fas fa-trash"></i></button>' +
        '</div></td></tr>';
    }).join('');
  }

  function defaultItemRow() {
    return {
      targetType: 'microbiota',
      targetKey: '',
      taxonomyLevel: 'phylum',
      minValue: '',
      maxValue: '',
      unit: '%',
      notes: ''
    };
  }

  function indicatorOptionsHtml(selectedKey) {
    var html = '<optgroup label="菌群门">';
    Object.keys(svc.getMicrobiotaTree()).forEach(function (phylum) {
      html += '<option value="' + C.escapeHtml(phylum) + '" data-type="microbiota" data-level="phylum"' +
        (selectedKey === phylum ? ' selected' : '') + '>' + C.escapeHtml(phylum) + '</option>';
    });
    html += '</optgroup><optgroup label="菌群属">';
    svc.getMicrobiotaTaxa().filter(function (t) { return t.level === 'genus'; }).forEach(function (genus) {
      html += '<option value="' + C.escapeHtml(genus.key) + '" data-type="microbiota" data-level="genus"' +
        (selectedKey === genus.key ? ' selected' : '') + '>' + C.escapeHtml(genus.label) + '</option>';
    });
    html += '</optgroup><optgroup label="普通指标">';
    svc.getTestIndicators().forEach(function (item) {
      html += '<option value="' + C.escapeHtml(item.key) + '" data-type="indicator" data-level=""' +
        (selectedKey === item.key ? ' selected' : '') + '>' + C.escapeHtml(item.label) + '</option>';
    });
    html += '</optgroup>';
    return html;
  }

  function renderItemsTable() {
    if (!formItems.length) formItems = [defaultItemRow()];
    itemsBody.innerHTML = formItems.map(function (item, idx) {
      return '<tr data-item-idx="' + idx + '">' +
        '<td class="px-2 py-2"><select class="item-target w-full border rounded px-2 py-1">' + indicatorOptionsHtml(item.targetKey) + '</select></td>' +
        '<td class="px-2 py-2"><select class="item-type w-full border rounded px-2 py-1">' +
          '<option value="microbiota"' + (item.targetType === 'microbiota' ? ' selected' : '') + '>菌群</option>' +
          '<option value="indicator"' + (item.targetType === 'indicator' ? ' selected' : '') + '>普通指标</option>' +
        '</select></td>' +
        '<td class="px-2 py-2"><select class="item-level w-full border rounded px-2 py-1">' +
          '<option value="phylum"' + (item.taxonomyLevel === 'phylum' ? ' selected' : '') + '>门</option>' +
          '<option value="genus"' + (item.taxonomyLevel === 'genus' ? ' selected' : '') + '>属</option>' +
          '<option value=""' + (!item.taxonomyLevel ? ' selected' : '') + '>—</option>' +
        '</select></td>' +
        '<td class="px-2 py-2"><input type="number" class="item-min w-20 border rounded px-2 py-1" step="0.01" value="' + C.escapeHtml(item.minValue) + '"></td>' +
        '<td class="px-2 py-2"><input type="number" class="item-max w-20 border rounded px-2 py-1" step="0.01" value="' + C.escapeHtml(item.maxValue) + '"></td>' +
        '<td class="px-2 py-2"><input type="text" class="item-unit w-16 border rounded px-2 py-1" value="' + C.escapeHtml(item.unit || '%') + '"></td>' +
        '<td class="px-2 py-2"><input type="text" class="item-notes border rounded px-2 py-1 w-full" value="' + C.escapeHtml(item.notes || '') + '"></td>' +
        '<td class="px-2 py-2"><button type="button" class="text-red-500 remove-item-btn" data-idx="' + idx + '"><i class="fas fa-times"></i></button></td>' +
      '</tr>';
    }).join('');
  }

  function collectItemsFromTable() {
    return Array.prototype.slice.call(itemsBody.querySelectorAll('tr')).map(function (row) {
      var targetSelect = row.querySelector('.item-target');
      var selectedOpt = targetSelect.options[targetSelect.selectedIndex];
      return {
        targetType: row.querySelector('.item-type').value,
        targetKey: targetSelect.value,
        taxonomyLevel: row.querySelector('.item-level').value || null,
        minValue: parseFloat(row.querySelector('.item-min').value),
        maxValue: parseFloat(row.querySelector('.item-max').value),
        unit: row.querySelector('.item-unit').value.trim() || '%',
        notes: row.querySelector('.item-notes').value.trim()
      };
    }).filter(function (item) { return item.targetKey; });
  }

  function showMainView() {
    mainView.classList.remove('hidden');
    formView.classList.add('hidden');
    renderTable();
    if (window.rangeMatcher) window.rangeMatcher.reloadConfigs();
  }

  function showFormView(isEdit, editId) {
    mainView.classList.add('hidden');
    formView.classList.remove('hidden');
    currentEditId = isEdit ? editId : null;
    formTitle.textContent = isEdit ? '编辑参考范围方案' : '新增参考范围方案';
    schemeForm.reset();
    formItems = [defaultItemRow()];

    if (isEdit && editId) {
      var scheme = getSchemes().find(function (s) { return s.id === editId; });
      if (!scheme) return;
      document.getElementById('scheme-name').value = scheme.name || '';
      document.getElementById('scheme-template').value = scheme.templateId || '';
      document.getElementById('scheme-method').value = scheme.methodName || '';
      document.getElementById('scheme-status').value = scheme.status || 'draft';
      document.getElementById('scheme-evidence-type').value = scheme.evidenceType === 'demo' ? 'internal' : (scheme.evidenceType || 'internal');
      document.getElementById('scheme-evidence-ref').value = scheme.evidenceRef || '';
      renderSpeciesCheckboxes(scheme.applicableSpecies || []);
      formItems = (scheme.items || []).length ? scheme.items.map(function (item) { return Object.assign({}, item); }) : [defaultItemRow()];
    } else {
      renderSpeciesCheckboxes([]);
      document.getElementById('scheme-evidence-type').value = 'internal';
      document.getElementById('scheme-evidence-ref').value = '检测机构内部参考范围';
    }
    renderItemsTable();
  }

  function validateSchemeForm() {
    var name = document.getElementById('scheme-name').value.trim();
    var templateId = document.getElementById('scheme-template').value.trim();
    var evidenceRef = document.getElementById('scheme-evidence-ref').value.trim();
    var species = selectedSpeciesFromForm();
    var items = collectItemsFromTable();
    if (!name || !templateId) {
      C.toast('请填写方案名称与检测模板', 'warning');
      return false;
    }
    if (!species.length) {
      C.toast('请至少勾选一个适用物种', 'warning');
      return false;
    }
    if (!evidenceRef) {
      C.toast('请填写专业依据', 'warning');
      return false;
    }
    if (!items.length) {
      C.toast('请至少添加一条有效范围项', 'warning');
      return false;
    }
    var invalid = items.some(function (item) {
      return isNaN(item.minValue) || isNaN(item.maxValue) || item.minValue >= item.maxValue;
    });
    if (invalid) {
      C.toast('请检查范围项数值', 'warning');
      return false;
    }
    if (document.getElementById('scheme-status').value === 'active' && !svc.schemeHasValidItems({
      evidenceRef: evidenceRef,
      items: items
    })) {
      C.toast('启用方案需要专业依据且至少一条有效范围', 'warning');
      return false;
    }
    return true;
  }

  document.getElementById('add-scheme-btn').addEventListener('click', function () { showFormView(false); });
  document.getElementById('batch-import-btn').addEventListener('click', function () { importModal.classList.remove('hidden'); });
  document.getElementById('back-to-list-btn').addEventListener('click', showMainView);
  document.getElementById('cancel-form-btn').addEventListener('click', showMainView);
  document.getElementById('search-btn').addEventListener('click', renderTable);
  document.getElementById('reset-filter-btn').addEventListener('click', function () {
    filterSpecies.value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-template').value = '';
    document.getElementById('filter-name').value = '';
    renderTable();
  });
  document.getElementById('add-item-btn').addEventListener('click', function () {
    formItems = collectItemsFromTable();
    formItems.push(defaultItemRow());
    renderItemsTable();
  });
  itemsBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.remove-item-btn');
    if (!btn) return;
    formItems = collectItemsFromTable();
    var idx = Number(btn.getAttribute('data-idx'));
    formItems.splice(idx, 1);
    if (!formItems.length) formItems = [defaultItemRow()];
    renderItemsTable();
  });
  itemsBody.addEventListener('change', function (e) {
    if (!e.target.classList.contains('item-target')) return;
    var row = e.target.closest('tr');
    var opt = e.target.options[e.target.selectedIndex];
    row.querySelector('.item-type').value = opt.getAttribute('data-type') || 'microbiota';
    row.querySelector('.item-level').value = opt.getAttribute('data-level') || '';
  });

  schemeForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateSchemeForm()) return;
    try {
      svc.saveReferenceRangeScheme({
        id: currentEditId,
        name: document.getElementById('scheme-name').value.trim(),
        templateId: document.getElementById('scheme-template').value.trim(),
        methodName: document.getElementById('scheme-method').value.trim(),
        applicableSpecies: selectedSpeciesFromForm(),
        evidenceType: document.getElementById('scheme-evidence-type').value,
        evidenceRef: document.getElementById('scheme-evidence-ref').value.trim(),
        status: document.getElementById('scheme-status').value,
        items: collectItemsFromTable(),
        bumpVersion: !!currentEditId
      });
      C.toast('参考范围方案已保存；新配置不追溯改变已发布报告冻结范围', 'success');
      svc.notifyCatalogUpdated();
      showMainView();
    } catch (err) {
      C.toast((err && err.message) || '保存失败', 'error');
    }
  });

  tableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var id = btn.dataset.id;
    if (btn.classList.contains('edit-btn')) showFormView(true, id);
    if (btn.classList.contains('copy-btn')) {
      try {
        svc.duplicateReferenceRangeScheme(id);
        C.toast('方案已复制为草稿', 'success');
        svc.notifyCatalogUpdated();
        renderTable();
      } catch (err) {
        C.toast((err && err.message) || '复制失败', 'error');
      }
    }
    if (btn.classList.contains('delete-btn')) {
      C.confirmDialog('确定删除该方案？', function () {
        svc.deleteReferenceRangeScheme(id);
        svc.notifyCatalogUpdated();
        renderTable();
      });
    }
  });

  document.getElementById('cancel-import-btn').addEventListener('click', function () { importModal.classList.add('hidden'); });
  document.getElementById('confirm-import-btn').addEventListener('click', function () {
    var fileInput = document.getElementById('import-file');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      C.toast('请选择 CSV 文件', 'warning');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var lines = String(ev.target.result).split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        C.toast('文件无有效数据', 'warning');
        return;
      }
      var headers = lines[0].split(',').map(function (h) { return h.trim(); });
      var grouped = {};
      lines.slice(1).forEach(function (line) {
        var cols = line.split(',');
        if (cols.length < 8) return;
        var row = {};
        headers.forEach(function (header, idx) {
          row[header] = (cols[idx] || '').trim();
        });
        var groupKey = (row.schemeName || '导入方案') + '\0' + (row.templateId || '');
        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            name: row.schemeName || '导入方案',
            templateId: row.templateId,
            methodName: row.methodName || '',
            applicableSpecies: [],
            evidenceType: row.evidenceType === 'demo' ? 'internal' : (row.evidenceType || 'internal'),
            evidenceRef: row.evidenceRef || '检测机构内部参考范围',
            status: row.status || 'draft',
            items: []
          };
        }
        (row.species || '').split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (sp) {
          if (grouped[groupKey].applicableSpecies.indexOf(sp) < 0) {
            grouped[groupKey].applicableSpecies.push(sp);
          }
        });
        grouped[groupKey].items.push({
          targetType: row.targetType || 'microbiota',
          targetKey: row.targetKey,
          taxonomyLevel: row.taxonomyLevel || null,
          minValue: parseFloat(row.minValue),
          maxValue: parseFloat(row.maxValue),
          unit: row.unit || '%',
          notes: row.notes || ''
        });
      });
      var imported = 0;
      Object.keys(grouped).forEach(function (key) {
        svc.saveReferenceRangeScheme(grouped[key]);
        imported += 1;
      });
      C.toast('已导入 ' + imported + ' 套参考范围方案', 'success');
      importModal.classList.add('hidden');
      svc.notifyCatalogUpdated();
      showMainView();
    };
    reader.readAsText(fileInput.files[0]);
  });

  document.getElementById('download-template-btn').addEventListener('click', function () {
    var csv = 'schemeName,templateId,methodName,species,evidenceType,evidenceRef,status,targetType,targetKey,taxonomyLevel,minValue,maxValue,unit,notes\n' +
      '猫科肠道检测,ORG-LAB-GUT-001,16S肠道菌群,cat,internal,检测机构内部参考范围,draft,microbiota,放线菌门,phylum,25,45,%,\n';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reference-range-scheme-template.csv';
    a.click();
  });

  document.addEventListener('professionalCatalogUpdated', function () {
    renderSpeciesFilters();
    if (!formView.classList.contains('hidden')) {
      var selected = selectedSpeciesFromForm();
      renderSpeciesCheckboxes(selected);
    } else {
      renderTable();
    }
  });

  if (C.subscribeDemo) {
    window.__petAdminPageTeardown = C.subscribeDemo(function () {
      if (!formView.classList.contains('hidden')) return;
      renderTable();
    });
  }

  renderSpeciesFilters();
  showMainView();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initNormalRangeConfig: initNormalRangeConfig };
}
