function loadAdminScript(src) {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[data-src="' + src + '"]')) {
      resolve();
      return;
    }
    var version = window.__PET_ADMIN_ASSET_VERSION || '';
    var url = './js/' + src + (version ? '?v=' + encodeURIComponent(version) : '');
    var s = document.createElement('script');
    s.src = url;
    s.dataset.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function initNormalRangeConfig(mountRoot, tab) {
  function runCore() {
    var teardown = initNormalRangeConfigCore(mountRoot, tab);
    if (tab && typeof teardown === 'function') {
      tab.teardown = teardown;
    }
    return teardown;
  }
  return loadAdminScript('range-matcher-util.js').then(runCore).catch(runCore);
}

function initNormalRangeConfigCore(mountRoot, tab) {
  var root = mountRoot || document;
  var svc = window.dictionaryDataService;
  var C = window.PetAdminCommon;
  var BT = window.PetAdminBasicTable;
  var Modal = window.PetAdminModal;
  var Perms = window.PetAdminPermissions;
  var Session = window.PetAdminSession;
  if (!svc || !C || !BT) return;

  var pageEl = root.querySelector('#normal-range-config');
  if (!pageEl) return;

  var cssLink = root.querySelector('link[href*="normal-range-config.css"]');
  if (cssLink && !document.getElementById('pet-admin-normal-range-config-css')) {
    var headLink = document.createElement('link');
    headLink.id = 'pet-admin-normal-range-config-css';
    headLink.rel = 'stylesheet';
    headLink.href = cssLink.getAttribute('href');
    document.head.appendChild(headLink);
  }

  var listView = root.querySelector('#nrc-list-view');
  var formView = root.querySelector('#nrc-form-view');
  var listMount = root.querySelector('#nrc-list-mount');
  var schemeForm = root.querySelector('#scheme-form');
  var formTitle = root.querySelector('#form-title');
  var itemsBody = root.querySelector('#items-body');
  var speciesCheckboxes = root.querySelector('#species-checkboxes');

  var currentEditId = null;
  var formItems = [];
  var formDirty = false;
  var listApi = null;
  var tabActive = true;
  var activeImportModal = null;

  var STATUS_LABELS = {
    active: '启用',
    draft: '草稿',
    disabled: '停用'
  };

  function q(sel) { return root.querySelector(sel); }

  function entityKey(editId) {
    return editId ? String(editId) : 'new';
  }

  function canEditCatalog() {
    return Perms ? Perms.can('edit_catalog') : true;
  }

  function getFormSessions() {
    if (!tab) return {};
    tab.pageState = tab.pageState || {};
    if (!tab.pageState.normalRangeForms) tab.pageState.normalRangeForms = {};
    return tab.pageState.normalRangeForms;
  }

  function setDirty(dirty) {
    formDirty = !!dirty;
    if (tab && Session && Session.setTabDirty) {
      Session.setTabDirty(tab.id, formDirty);
    } else if (typeof window.__petAdminSetTabDirty === 'function') {
      window.__petAdminSetTabDirty(formDirty);
    }
  }

  function syncFormReadOnly() {
    var ro = !canEditCatalog();
    pageEl.classList.toggle('nrc-readonly', ro);
    schemeForm.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.disabled = ro;
    });
    var saveBtn = schemeForm.querySelector('[type="submit"]');
    if (saveBtn) saveBtn.disabled = ro;
    var addBtn = q('#add-item-btn');
    if (addBtn) addBtn.disabled = ro;
    itemsBody.querySelectorAll('.remove-item-btn').forEach(function (btn) {
      btn.disabled = ro;
    });
  }

  function persistFormSession(forEditId) {
    if (!tab) return;
    if (!formView.classList.contains('hidden')) {
      formItems = collectItemsFromTable();
    }
    var key = entityKey(forEditId !== undefined ? forEditId : currentEditId);
    var sessions = getFormSessions();
    sessions[key] = {
      editId: forEditId !== undefined ? forEditId : currentEditId,
      formItems: formItems.map(function (item) { return Object.assign({}, item); }),
      formSnapshot: {
        name: q('#scheme-name').value,
        template: q('#scheme-template').value,
        method: q('#scheme-method').value,
        status: q('#scheme-status').value,
        evidenceType: q('#scheme-evidence-type').value,
        evidenceRef: q('#scheme-evidence-ref').value,
        species: selectedSpeciesFromForm()
      }
    };
    if (Session) {
      Session.updateTabState(tab.id, { pageState: tab.pageState });
    }
  }

  function restoreFormSession(editId) {
    var key = entityKey(editId !== undefined ? editId : currentEditId);
    var saved = getFormSessions()[key];
    if (!saved) return false;
    currentEditId = saved.editId || null;
    formItems = (saved.formItems || []).map(function (item) { return Object.assign({}, item); });
    if (saved.formSnapshot) {
      q('#scheme-name').value = saved.formSnapshot.name || '';
      q('#scheme-template').value = saved.formSnapshot.template || '';
      q('#scheme-method').value = saved.formSnapshot.method || '';
      q('#scheme-status').value = saved.formSnapshot.status || 'draft';
      q('#scheme-evidence-type').value = saved.formSnapshot.evidenceType || 'internal';
      q('#scheme-evidence-ref').value = saved.formSnapshot.evidenceRef || '';
      renderSpeciesCheckboxes(saved.formSnapshot.species || []);
    }
    renderItemsTable();
    syncFormReadOnly();
    return true;
  }

  function clearFormSession(editId) {
    if (!tab || !tab.pageState) return;
    var key = entityKey(editId !== undefined ? editId : currentEditId);
    if (tab.pageState.normalRangeForms) {
      delete tab.pageState.normalRangeForms[key];
    }
    if (Session) {
      Session.updateTabState(tab.id, { pageState: tab.pageState });
    }
  }

  function hasSessionForEntity(editParam) {
    var targetKey = editParam === 'new' ? 'new' : String(editParam);
    return !!getFormSessions()[targetKey];
  }

  function getSchemes() {
    return svc.getReferenceRangeSchemes(false);
  }

  function speciesOptions() {
    return svc.getPetMajorBreeds();
  }

  function speciesLabels(keys) {
    return (keys || []).map(function (key) {
      var major = speciesOptions().find(function (m) { return m.key === key; });
      return major ? major.label.replace(/科$/, '') : svc.speciesLabel(key);
    }).join('、') || '—';
  }

  function statusTag(status) {
    var cls = status === 'active' ? 'ant-tag ant-tag-success' :
      status === 'disabled' ? 'ant-tag ant-tag-default' : 'ant-tag ant-tag-warning';
    return '<span class="' + cls + '">' + C.escapeHtml(STATUS_LABELS[status] || status) + '</span>';
  }

  function renderSpeciesCheckboxes(selected) {
    selected = selected || [];
    var majors = speciesOptions();
    speciesCheckboxes.innerHTML = majors.map(function (major) {
      var checked = selected.indexOf(major.key) >= 0 ? ' checked' : '';
      return '<label class="rondo-checkbox-card">' +
        '<input type="checkbox" class="species-checkbox rondo-checkbox" value="' + C.escapeHtml(major.key) + '"' + checked + '>' +
        '<span>' + C.escapeHtml(major.label) + '</span></label>';
    }).join('');
  }

  function selectedSpeciesFromForm() {
    return Array.prototype.slice.call(root.querySelectorAll('.species-checkbox:checked'))
      .map(function (el) { return el.value; });
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
        '<td class="rondo-table-cell"><select class="item-target rondo-select ant-select-native">' + indicatorOptionsHtml(item.targetKey) + '</select></td>' +
        '<td class="rondo-table-cell"><select class="item-type rondo-select ant-select-native">' +
          '<option value="microbiota"' + (item.targetType === 'microbiota' ? ' selected' : '') + '>菌群</option>' +
          '<option value="indicator"' + (item.targetType === 'indicator' ? ' selected' : '') + '>普通指标</option>' +
        '</select></td>' +
        '<td class="rondo-table-cell"><select class="item-level rondo-select ant-select-native">' +
          '<option value="phylum"' + (item.taxonomyLevel === 'phylum' ? ' selected' : '') + '>门</option>' +
          '<option value="genus"' + (item.taxonomyLevel === 'genus' ? ' selected' : '') + '>属</option>' +
          '<option value=""' + (!item.taxonomyLevel ? ' selected' : '') + '>—</option>' +
        '</select></td>' +
        '<td class="rondo-table-cell"><input type="number" class="item-min rondo-input ant-input" step="0.01" value="' + C.escapeHtml(item.minValue) + '"></td>' +
        '<td class="rondo-table-cell"><input type="number" class="item-max rondo-input ant-input" step="0.01" value="' + C.escapeHtml(item.maxValue) + '"></td>' +
        '<td class="rondo-table-cell"><input type="text" class="item-unit rondo-input ant-input" value="' + C.escapeHtml(item.unit || '%') + '"></td>' +
        '<td class="rondo-table-cell"><input type="text" class="item-notes rondo-input ant-input" value="' + C.escapeHtml(item.notes || '') + '"></td>' +
        '<td class="rondo-table-cell"><button type="button" class="rondo-btn rondo-btn-link rondo-btn-link-danger remove-item-btn" data-idx="' + idx + '"><i class="fas fa-times"></i></button></td>' +
      '</tr>';
    }).join('');
    syncFormReadOnly();
  }

  function collectItemsFromTable() {
    return Array.prototype.slice.call(itemsBody.querySelectorAll('tr')).map(function (row) {
      var targetSelect = row.querySelector('.item-target');
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

  function confirmLeaveForm() {
    if (!formDirty) return true;
    return window.confirm('参考范围方案尚未保存，确定离开吗？');
  }

  function showListView(force) {
    if (!force && !confirmLeaveForm()) return;
    var leavingId = currentEditId;
    setDirty(false);
    clearFormSession(leavingId);
    currentEditId = null;
    listView.classList.remove('hidden');
    formView.classList.add('hidden');
    C.navigate('normal-range-config', {});
    if (listApi) listApi.reload();
    if (window.rangeMatcher) window.rangeMatcher.reloadConfigs();
  }

  function loadFormFromScheme(scheme) {
    q('#scheme-name').value = scheme.name || '';
    q('#scheme-template').value = scheme.templateId || '';
    q('#scheme-method').value = scheme.methodName || '';
    q('#scheme-status').value = scheme.status || 'draft';
    q('#scheme-evidence-type').value = scheme.evidenceType === 'demo' ? 'internal' : (scheme.evidenceType || 'internal');
    q('#scheme-evidence-ref').value = scheme.evidenceRef || '';
    renderSpeciesCheckboxes(scheme.applicableSpecies || []);
    formItems = (scheme.items || []).length
      ? scheme.items.map(function (item) { return Object.assign({}, item); })
      : [defaultItemRow()];
  }

  function showFormView(isEdit, editId, opts) {
    opts = opts || {};
    var targetKey = isEdit ? String(editId) : 'new';
    var currentKey = entityKey(currentEditId);

    if (!formView.classList.contains('hidden') && currentKey !== targetKey) {
      persistFormSession(currentEditId);
    }

    if (!opts.forceReload && hasSessionForEntity(isEdit ? editId : 'new')) {
      listView.classList.add('hidden');
      formView.classList.remove('hidden');
      currentEditId = isEdit ? editId : null;
      formTitle.textContent = isEdit ? '编辑参考范围方案' : '新增参考范围方案';
      restoreFormSession(isEdit ? editId : null);
      C.navigate('normal-range-config', { edit: isEdit ? editId : 'new' });
      return;
    }

    listView.classList.add('hidden');
    formView.classList.remove('hidden');
    currentEditId = isEdit ? editId : null;
    formTitle.textContent = isEdit ? '编辑参考范围方案' : '新增参考范围方案';
    schemeForm.reset();
    formItems = [defaultItemRow()];
    setDirty(false);

    if (isEdit && editId) {
      var scheme = getSchemes().find(function (s) { return s.id === editId; });
      if (!scheme) {
        C.toast('方案不存在', 'warning');
        showListView(true);
        return;
      }
      loadFormFromScheme(scheme);
      C.navigate('normal-range-config', { edit: editId });
    } else {
      renderSpeciesCheckboxes([]);
      q('#scheme-evidence-type').value = 'internal';
      q('#scheme-evidence-ref').value = '检测机构内部参考范围';
      C.navigate('normal-range-config', { edit: 'new' });
    }
    renderItemsTable();
    persistFormSession();
  }

  function validateSchemeForm() {
    var name = q('#scheme-name').value.trim();
    var templateId = q('#scheme-template').value.trim();
    var evidenceRef = q('#scheme-evidence-ref').value.trim();
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
      C.toast('请检查范围项数值（最小值须小于最大值）', 'warning');
      return false;
    }
    if (q('#scheme-status').value === 'active' && !svc.schemeHasValidItems({
      evidenceRef: evidenceRef,
      items: items
    })) {
      C.toast('启用方案需要专业依据且至少一条有效范围', 'warning');
      return false;
    }
    return true;
  }

  function initListPage() {
    if (!listMount || listApi) return;
    var speciesFieldOptions = [{ value: '', label: '全部物种' }].concat(
      speciesOptions().map(function (major) {
        return { value: major.key, label: major.label.replace(/科$/, '') };
      })
    );
    var toolbarActions = [];
    if (canEditCatalog()) {
      toolbarActions.push(
        { label: '新增方案', variant: 'primary', onClick: function () { showFormView(false); } },
        { label: '导入方案', onClick: openImportModal }
      );
    }
    listApi = BT.createListPage({
      container: listMount,
      title: '平台参考范围方案',
      stateKey: 'normal-range-schemes',
      searchFields: [
        { name: 'species', label: '适用物种', type: 'select', options: speciesFieldOptions },
        { name: 'status', label: '状态', type: 'select', options: [
          { value: '', label: '全部状态' },
          { value: 'active', label: '启用' },
          { value: 'draft', label: '草稿' },
          { value: 'disabled', label: '停用' }
        ]},
        { name: 'template', label: '检测模板', placeholder: '模板 ID' },
        { name: 'name', label: '方案名称', placeholder: '搜索方案名称' }
      ],
      toolbarActions: toolbarActions,
      columns: [
        { title: '方案名称', dataIndex: 'name', sortable: true },
        { title: '检测模板', dataIndex: 'templateId' },
        { title: '适用物种', dataIndex: 'speciesText' },
        { title: '专业依据', dataIndex: 'evidenceRef', ellipsis: true },
        { title: '范围项', dataIndex: 'itemCount' },
        { title: '版本', dataIndex: 'versionText' },
        { title: '状态', dataIndex: 'statusHtml', render: function (row) { return row.statusHtml; } },
        { title: '操作', key: 'actions', action: true, render: function (row) {
          if (!canEditCatalog()) return '—';
          return '<button type="button" class="rondo-btn rondo-btn-link" data-row-action="edit" data-id="' + C.escapeHtml(row.id) + '">编辑</button>' +
            '<button type="button" class="rondo-btn rondo-btn-link" data-row-action="copy" data-id="' + C.escapeHtml(row.id) + '">复制</button>' +
            '<button type="button" class="rondo-btn rondo-btn-link rondo-btn-link-danger" data-row-action="delete" data-id="' + C.escapeHtml(row.id) + '">删除</button>';
        }}
      ],
      rowKey: 'id',
      fetchData: function (query) {
        var filters = query.filters || {};
        var species = filters.species || '';
        var status = filters.status || '';
        var template = String(filters.template || '').trim().toLowerCase();
        var name = String(filters.name || '').trim().toLowerCase();
        var rows = getSchemes().filter(function (scheme) {
          if (species && (!scheme.applicableSpecies || scheme.applicableSpecies.indexOf(species) < 0)) return false;
          if (status && scheme.status !== status) return false;
          if (template && String(scheme.templateId || '').toLowerCase().indexOf(template) < 0) return false;
          if (name && String(scheme.name || '').toLowerCase().indexOf(name) < 0) return false;
          return true;
        }).map(function (scheme) {
          return {
            id: scheme.id,
            name: scheme.name || '—',
            templateId: scheme.templateId || '—',
            speciesText: speciesLabels(scheme.applicableSpecies),
            evidenceRef: scheme.evidenceRef || '—',
            itemCount: (scheme.items || []).length,
            versionText: 'v' + (scheme.version || 1),
            statusHtml: statusTag(scheme.status)
          };
        });
        if (query.sortField) {
          rows.sort(function (a, b) {
            var av = a[query.sortField];
            var bv = b[query.sortField];
            if (av == null) return 1;
            if (bv == null) return -1;
            var cmp = String(av).localeCompare(String(bv));
            return query.sortOrder === 'desc' ? -cmp : cmp;
          });
        }
        var total = rows.length;
        var start = (query.page - 1) * query.pageSize;
        return { rows: rows.slice(start, start + query.pageSize), total: total };
      },
      onRowAction: function (action, row) {
        if (!canEditCatalog()) return;
        if (action === 'edit') showFormView(true, row.id);
        if (action === 'copy') {
          try {
            svc.duplicateReferenceRangeScheme(row.id);
            C.toast('方案已复制为草稿', 'success');
            svc.notifyCatalogUpdated();
            if (listApi) listApi.reload();
          } catch (err) {
            C.toast((err && err.message) || '复制失败', 'error');
          }
        }
        if (action === 'delete') {
          C.confirmDialog('确定删除该方案？', function () {
            svc.deleteReferenceRangeScheme(row.id);
            svc.notifyCatalogUpdated();
            if (listApi) listApi.reload();
          });
        }
      }
    });
  }

  function handleRoute() {
    var route = C.parseRoute();
    if (route.pageId !== 'normal-range-config') return;
    var editParam = route.params.edit;
    if (editParam) {
      var sameEntity = !formView.classList.contains('hidden') &&
        entityKey(currentEditId) === (editParam === 'new' ? 'new' : String(editParam));
      if (sameEntity) return;
      if (!formView.classList.contains('hidden') && formDirty && !confirmLeaveForm()) {
        C.navigate('normal-range-config', { edit: currentEditId || 'new' });
        return;
      }
      if (editParam === 'new') {
        showFormView(false);
      } else {
        showFormView(true, editParam);
      }
      return;
    }
    if (!formView.classList.contains('hidden')) {
      showListView(true);
    }
  }

  function importCsvText(text) {
    var lines = String(text).split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      throw new Error('文件无有效数据');
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
    return imported;
  }

  function downloadImportTemplate() {
    var csv = 'schemeName,templateId,methodName,species,evidenceType,evidenceRef,status,targetType,targetKey,taxonomyLevel,minValue,maxValue,unit,notes\n' +
      '猫科肠道检测,ORG-LAB-GUT-001,16S肠道菌群,cat,internal,检测机构内部参考范围,draft,microbiota,放线菌门,phylum,25,45,%,\n';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reference-range-scheme-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function openImportModal() {
    if (!canEditCatalog()) {
      C.toast('当前账号无编辑参考范围的权限', 'warning');
      return;
    }
    if (!Modal) {
      C.toast('导入组件未加载', 'error');
      return;
    }
    if (activeImportModal) {
      activeImportModal.close();
      activeImportModal = null;
    }
    var bodyHtml =
      '<div class="rondo-form-field">' +
      '<label class="rondo-form-label" for="nrc-import-file">选择 CSV 文件</label>' +
      '<input type="file" id="nrc-import-file" accept=".csv,.xlsx,.xls" class="rondo-input ant-input">' +
      '</div>' +
      '<p class="rondo-form-hint">CSV 表头：schemeName,templateId,methodName,species,evidenceType,evidenceRef,status,targetType,targetKey,taxonomyLevel,minValue,maxValue,unit,notes</p>' +
      '<button type="button" id="nrc-download-template-btn" class="rondo-btn rondo-btn-link">' +
      '<i class="fas fa-download"></i> 下载模板</button>';
    activeImportModal = Modal.open({
      title: '导入完整参考范围方案',
      bodyHtml: bodyHtml,
      okLabel: '确认导入',
      cancelLabel: '取消',
      onOk: function (close, overlay) {
        var fileInput = overlay.querySelector('#nrc-import-file');
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
          C.toast('请选择 CSV 文件', 'warning');
          return false;
        }
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function (ev) {
            try {
              var imported = importCsvText(ev.target.result);
              C.toast('已导入 ' + imported + ' 套参考范围方案', 'success');
              svc.notifyCatalogUpdated();
              if (listApi) listApi.reload();
              resolve(true);
            } catch (err) {
              C.toast((err && err.message) || '导入失败', 'warning');
              resolve(false);
            }
          };
          reader.onerror = function () {
            C.toast('文件读取失败', 'error');
            resolve(false);
          };
          reader.readAsText(fileInput.files[0]);
        });
      },
      onClose: function () {
        activeImportModal = null;
      }
    });
    var tplBtn = activeImportModal.root.querySelector('#nrc-download-template-btn');
    if (tplBtn) {
      tplBtn.addEventListener('click', function (e) {
        e.preventDefault();
        downloadImportTemplate();
      });
    }
  }

  function onBackToListClick() { showListView(false); }
  function onCancelFormClick() { showListView(false); }
  function onAddItemClick() {
    if (!canEditCatalog()) return;
    formItems = collectItemsFromTable();
    formItems.push(defaultItemRow());
    renderItemsTable();
    setDirty(true);
    persistFormSession();
  }
  function onItemsBodyClick(e) {
    var btn = e.target.closest('.remove-item-btn');
    if (!btn || !canEditCatalog()) return;
    formItems = collectItemsFromTable();
    formItems.splice(Number(btn.getAttribute('data-idx')), 1);
    if (!formItems.length) formItems = [defaultItemRow()];
    renderItemsTable();
    setDirty(true);
    persistFormSession();
  }
  function onItemsBodyChange(e) {
    if (!e.target.classList.contains('item-target')) return;
    var row = e.target.closest('tr');
    var opt = e.target.options[e.target.selectedIndex];
    row.querySelector('.item-type').value = opt.getAttribute('data-type') || 'microbiota';
    row.querySelector('.item-level').value = opt.getAttribute('data-level') || '';
    setDirty(true);
    persistFormSession();
  }
  function onFormInput() {
    setDirty(true);
    persistFormSession();
  }
  function onFormSubmit(e) {
    e.preventDefault();
    if (!canEditCatalog()) {
      C.toast('当前账号无编辑参考范围的权限', 'warning');
      return;
    }
    if (!validateSchemeForm()) return;
    try {
      svc.saveReferenceRangeScheme({
        id: currentEditId,
        name: q('#scheme-name').value.trim(),
        templateId: q('#scheme-template').value.trim(),
        methodName: q('#scheme-method').value.trim(),
        applicableSpecies: selectedSpeciesFromForm(),
        evidenceType: q('#scheme-evidence-type').value,
        evidenceRef: q('#scheme-evidence-ref').value.trim(),
        status: q('#scheme-status').value,
        items: collectItemsFromTable(),
        bumpVersion: !!currentEditId
      });
      C.toast('参考范围方案已保存；新配置不追溯改变已发布报告冻结范围', 'success');
      svc.notifyCatalogUpdated();
      showListView(true);
    } catch (err) {
      C.toast((err && err.message) || '保存失败', 'error');
    }
  }
  function onCatalogUpdated() {
    if (!tabActive) return;
    if (!formView.classList.contains('hidden')) {
      renderSpeciesCheckboxes(selectedSpeciesFromForm());
      syncFormReadOnly();
    } else if (listApi) {
      listApi.reload();
    }
  }

  q('#back-to-list-btn').addEventListener('click', onBackToListClick);
  q('#cancel-form-btn').addEventListener('click', onCancelFormClick);
  q('#add-item-btn').addEventListener('click', onAddItemClick);
  itemsBody.addEventListener('click', onItemsBodyClick);
  itemsBody.addEventListener('change', onItemsBodyChange);
  schemeForm.addEventListener('input', onFormInput);
  schemeForm.addEventListener('change', onFormInput);
  schemeForm.addEventListener('submit', onFormSubmit);
  document.addEventListener('professionalCatalogUpdated', onCatalogUpdated);

  function onHashChange() {
    if (tab && Session && Session.getActiveTab() !== tab) return;
    handleRoute();
  }
  window.addEventListener('hashchange', onHashChange);

  function onTabActivate() {
    tabActive = true;
    handleRoute();
  }

  function onTabDeactivate() {
    if (!formView.classList.contains('hidden')) {
      persistFormSession();
    }
    tabActive = false;
  }

  function onTabDispose() {
    if (tab && tab.pageState) {
      delete tab.pageState.normalRangeForms;
      if (Session) {
        Session.updateTabState(tab.id, { pageState: tab.pageState });
      }
    }
  }

  function onTabCanLeave() {
    return confirmLeaveForm();
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
    if (!formView.classList.contains('hidden')) return;
    if (listApi) listApi.reload();
  }) : function () {};

  window.__petAdminOpenRangeScheme = function (schemeId) {
    if (schemeId === 'new') showFormView(false);
    else showFormView(true, schemeId);
  };

  initListPage();
  handleRoute();

  return function teardown() {
    delete window.__petAdminOpenRangeScheme;
    if (activeImportModal) {
      activeImportModal.close();
      activeImportModal = null;
    }
    unsub();
    document.removeEventListener('professionalCatalogUpdated', onCatalogUpdated);
    window.removeEventListener('hashchange', onHashChange);
    q('#back-to-list-btn').removeEventListener('click', onBackToListClick);
    q('#cancel-form-btn').removeEventListener('click', onCancelFormClick);
    q('#add-item-btn').removeEventListener('click', onAddItemClick);
    itemsBody.removeEventListener('click', onItemsBodyClick);
    itemsBody.removeEventListener('change', onItemsBodyChange);
    schemeForm.removeEventListener('input', onFormInput);
    schemeForm.removeEventListener('change', onFormInput);
    schemeForm.removeEventListener('submit', onFormSubmit);
  };
}

window.initNormalRangeConfig = initNormalRangeConfig;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initNormalRangeConfig: initNormalRangeConfig };
}
