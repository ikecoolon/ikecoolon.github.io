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
  var addConfigBtn = document.getElementById('add-config-btn');
  var batchImportBtn = document.getElementById('batch-import-btn');
  var backToListBtn = document.getElementById('back-to-list-btn');
  var cancelFormBtn = document.getElementById('cancel-form-btn');
  var configForm = document.getElementById('config-form');
  var formTitle = document.getElementById('form-title');
  var tableBody = document.getElementById('table-body');
  var importModal = document.getElementById('import-modal');
  var confirmImportBtn = document.getElementById('confirm-import-btn');
  var cancelImportBtn = document.getElementById('cancel-import-btn');
  var downloadTemplateBtn = document.getElementById('download-template-btn');
  var searchBtn = document.getElementById('search-btn');
  var resetFilterBtn = document.getElementById('reset-filter-btn');
  var formMajorBreed = document.getElementById('form-major-breed');
  var formMinorBreed = document.getElementById('form-minor-breed');
  var formMinValue = document.getElementById('form-min-value');
  var formMaxValue = document.getElementById('form-max-value');
  var formUnit = document.getElementById('form-unit');
  var formNotes = document.getElementById('form-notes');
  var referenceSuggestions = document.getElementById('reference-suggestions');
  var referenceContent = document.getElementById('reference-content');
  var indicatorTree = document.getElementById('indicator-tree');
  var selectedIndicator = document.getElementById('selected-indicator');
  var selectedIndicatorText = document.getElementById('selected-indicator-text');
  var clearSelectionBtn = document.getElementById('clear-selection');
  var selectedIndicatorType = document.getElementById('selected-indicator-type');
  var selectedIndicatorName = document.getElementById('selected-indicator-name');
  var filterMajorBreed = document.getElementById('filter-major-breed');
  var filterMinorBreed = document.getElementById('filter-minor-breed');
  var filterIndicatorType = document.getElementById('filter-indicator-type');
  var filterIndicatorName = document.getElementById('filter-indicator-name');

  var currentEditId = null;
  var selectedTarget = null;

  function getRangeConfigs() {
    return svc.getPlatformReferenceRanges(false);
  }

  function speciesFromFormMajor(major) {
    return svc.speciesFromMajorBreed(major) || (major === '猫' ? 'cat' : major === '狗' ? 'dog' : null);
  }

  function getBreedConfig() {
    return svc.getFlatBreedConfig();
  }

  function updateMinorBreedOptions(selectElement, majorBreed) {
    selectElement.innerHTML = '<option value="">请选择小品种</option>';
    if (!majorBreed) return;
    var majorData = svc.getBreedByLabel(majorBreed + '科') || svc.getBreedByLabel(majorBreed);
    var minors = majorData ? svc.getPetMinorBreeds(majorData.key).map(function (b) { return b.label; }) : (getBreedConfig()[majorBreed] || []);
    minors.forEach(function (breed) {
      var option = document.createElement('option');
      option.value = breed;
      option.textContent = breed;
      selectElement.appendChild(option);
    });
  }

  function renderIndicatorTree() {
    indicatorTree.innerHTML = '';
    var tree = svc.getMicrobiotaTree();
    Object.keys(tree).forEach(function (phylumName) {
      var phylumData = tree[phylumName];
      var phylumDiv = document.createElement('div');
      phylumDiv.className = 'tree-node-phylum mb-2';
      var phylumHeader = document.createElement('div');
      phylumHeader.className = 'flex items-center p-3 rounded cursor-pointer group transition-all duration-200';
      phylumHeader.setAttribute('data-indicator-name', phylumName);
      phylumHeader.setAttribute('data-indicator-type', 'microbiota');
      phylumHeader.setAttribute('data-target-type', 'microbiota');
      phylumHeader.setAttribute('data-taxonomy-level', 'phylum');
      phylumHeader.innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-folder text-blue-600 mr-3"></i><div class="flex-1"><div class="font-semibold text-gray-900">' + C.escapeHtml(phylumName) + '</div><div class="text-sm text-gray-600 mt-1">' + C.escapeHtml(phylumData.description) + '</div></div><span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">门</span></div>';
      phylumHeader.addEventListener('click', function () { selectIndicator(phylumName, '门', 'microbiota', 'phylum'); });
      phylumDiv.appendChild(phylumHeader);
      if (phylumData.children.length) {
        var childrenDiv = document.createElement('div');
        childrenDiv.className = 'ml-8 mt-2 space-y-1';
        phylumData.children.forEach(function (genus) {
          var genusDiv = document.createElement('div');
          genusDiv.className = 'tree-node-genus flex items-center p-2 rounded cursor-pointer';
          genusDiv.setAttribute('data-indicator-name', genus.name);
          genusDiv.setAttribute('data-indicator-type', 'microbiota');
          genusDiv.setAttribute('data-target-type', 'microbiota');
          genusDiv.setAttribute('data-taxonomy-level', 'genus');
          genusDiv.innerHTML = '<div class="flex items-center flex-1"><i class="fas fa-leaf text-green-600 mr-3"></i><div class="flex-1"><div class="font-medium text-gray-800">' + C.escapeHtml(genus.name) + '</div></div><span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">属</span></div>';
          genusDiv.addEventListener('click', function (e) {
            e.stopPropagation();
            selectIndicator(genus.name, '属', 'microbiota', 'genus');
          });
          childrenDiv.appendChild(genusDiv);
        });
        phylumDiv.appendChild(childrenDiv);
      }
      indicatorTree.appendChild(phylumDiv);
    });

    var indicatorSection = document.createElement('div');
    indicatorSection.className = 'mt-4 border-t pt-4';
    indicatorSection.innerHTML = '<div class="text-sm font-semibold text-gray-700 mb-2">普通检测指标</div>';
    svc.getTestIndicators().forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'flex items-center p-2 rounded cursor-pointer hover:bg-gray-50';
      row.setAttribute('data-indicator-name', item.label);
      row.setAttribute('data-target-type', 'indicator');
      row.innerHTML = '<div class="flex-1 font-medium text-gray-800">' + C.escapeHtml(item.label) + '</div><span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">普通指标</span>';
      row.addEventListener('click', function () {
        selectIndicator(item.key, '普通指标', 'indicator', null);
      });
      indicatorSection.appendChild(row);
    });
    indicatorTree.appendChild(indicatorSection);
  }

  function selectIndicator(name, typeLabel, targetType, taxonomyLevel) {
    selectedTarget = { name: name, typeLabel: typeLabel, targetType: targetType, taxonomyLevel: taxonomyLevel };
    selectedIndicatorType.value = typeLabel;
    selectedIndicatorName.value = name;
    selectedIndicatorText.textContent = name + ' (' + typeLabel + ')';
    selectedIndicator.classList.remove('hidden');
    indicatorTree.querySelectorAll('.bg-blue-200').forEach(function (el) { el.classList.remove('bg-blue-200'); });
    var selectedElement = indicatorTree.querySelector('[data-indicator-name="' + name + '"]');
    if (selectedElement) selectedElement.classList.add('bg-blue-200');
    updateReferenceRanges();
  }

  function clearIndicatorSelection() {
    selectedTarget = null;
    selectedIndicatorType.value = '';
    selectedIndicatorName.value = '';
    selectedIndicator.classList.add('hidden');
    referenceSuggestions.classList.add('hidden');
  }

  function updateReferenceRanges() {
    if (!selectedTarget || !formMajorBreed.value) {
      referenceSuggestions.classList.add('hidden');
      return;
    }
    var species = speciesFromFormMajor(formMajorBreed.value);
    var platform = svc.getPlatformReferenceRanges().find(function (r) {
      return r.species === species && r.targetKey === selectedTarget.name && r.targetType === selectedTarget.targetType;
    });
    if (!platform) {
      referenceSuggestions.classList.add('hidden');
      return;
    }
    referenceContent.innerHTML = '<div class="bg-blue-100 p-3 rounded-md"><div class="flex items-center justify-between mb-2"><span class="font-medium text-blue-900">平台建议: ' + platform.minValue + ' - ' + platform.maxValue + platform.unit + '</span><button type="button" id="apply-reference" class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">应用</button></div><p class="text-sm text-blue-800">' + C.escapeHtml(platform.notes || '') + '</p></div>';
    document.getElementById('apply-reference').addEventListener('click', function () {
      formMinValue.value = platform.minValue;
      formMaxValue.value = platform.maxValue;
      formUnit.value = platform.unit;
      formNotes.value = platform.notes || '';
    });
    referenceSuggestions.classList.remove('hidden');
  }

  function renderTable(filteredData) {
    var data = filteredData || getRangeConfigs();
    if (!data.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">暂无平台参考范围配置</td></tr>';
      return;
    }
    tableBody.innerHTML = data.map(function (config) {
      return '<tr class="hover:bg-gray-50">' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + svc.speciesLabel(config.species) + '</div><div class="text-sm text-gray-500">' + C.escapeHtml(config.breedLabel || '物种通用') + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-gray-900">' + C.escapeHtml(config.targetKey) + '</div><div class="text-sm text-gray-500">' + (config.targetType === 'indicator' ? '普通指标' : svc.levelToLabel(config.taxonomyLevel)) + '</div></td>' +
        '<td class="px-6 py-4 whitespace-nowrap"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">' + config.minValue + ' - ' + config.maxValue + '</span></td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + C.escapeHtml(config.unit) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">' + C.escapeHtml((config.createdAt || '').slice(0, 19).replace('T', ' ')) + '</td>' +
        '<td class="px-6 py-4 whitespace-nowrap text-sm font-medium"><div class="flex space-x-2">' +
          '<button class="text-blue-600 hover:text-blue-900 edit-btn" data-id="' + C.escapeHtml(config.id) + '"><i class="fas fa-edit"></i></button>' +
          '<button class="text-red-600 hover:text-red-900 delete-btn" data-id="' + C.escapeHtml(config.id) + '"><i class="fas fa-trash"></i></button>' +
        '</div></td></tr>';
    }).join('');
  }

  function filterConfigs() {
    var majorBreed = filterMajorBreed.value;
    var indicatorType = filterIndicatorType.value;
    var indicatorName = filterIndicatorName.value.toLowerCase();
    var species = speciesFromFormMajor(majorBreed);
    var filtered = getRangeConfigs().filter(function (config) {
      var typeLabel = config.targetType === 'indicator' ? '普通指标' : svc.levelToLabel(config.taxonomyLevel);
      return (!species || config.species === species) &&
        (!indicatorType || typeLabel === indicatorType || (indicatorType === '门' && config.taxonomyLevel === 'phylum') || (indicatorType === '属' && config.taxonomyLevel === 'genus')) &&
        (!indicatorName || String(config.targetKey).toLowerCase().indexOf(indicatorName) >= 0);
    });
    renderTable(filtered);
  }

  function showMainView() {
    mainView.classList.remove('hidden');
    formView.classList.add('hidden');
    renderTable();
    if (window.rangeMatcher) window.rangeMatcher.reloadConfigs();
    svc.notifyCatalogUpdated();
  }

  function showFormView(isEdit, editId) {
    mainView.classList.add('hidden');
    formView.classList.remove('hidden');
    referenceSuggestions.classList.add('hidden');
    formTitle.textContent = isEdit ? '编辑平台参考范围' : '新增平台参考范围';
    renderIndicatorTree();
    currentEditId = isEdit ? editId : null;
    configForm.reset();
    clearIndicatorSelection();
    if (isEdit && editId) {
      var config = getRangeConfigs().find(function (c) { return c.id === editId; });
      if (!config) return;
      formMajorBreed.value = svc.speciesLabel(config.species);
      updateMinorBreedOptions(formMinorBreed, formMajorBreed.value);
      formMinorBreed.value = config.breedLabel || '';
      var typeLabel = config.targetType === 'indicator' ? '普通指标' : svc.levelToLabel(config.taxonomyLevel);
      selectIndicator(config.targetKey, typeLabel, config.targetType, config.taxonomyLevel);
      formMinValue.value = config.minValue;
      formMaxValue.value = config.maxValue;
      formUnit.value = config.unit;
      formNotes.value = config.notes || '';
    }
  }

  function validateForm() {
    if (!formMajorBreed.value || !selectedTarget) {
      C.toast('请选择报告物种与检测项', 'warning');
      return false;
    }
    var minValue = parseFloat(formMinValue.value);
    var maxValue = parseFloat(formMaxValue.value);
    if (isNaN(minValue) || isNaN(maxValue) || minValue >= maxValue) {
      C.toast('请输入有效的数值范围', 'warning');
      return false;
    }
    return true;
  }

  function refreshBreedOptions() {
    var majors = ['猫', '狗'];
    filterMajorBreed.innerHTML = '<option value="">全部物种</option>';
    formMajorBreed.innerHTML = '<option value="">请选择物种</option>';
    majors.forEach(function (breed) {
      [filterMajorBreed, formMajorBreed].forEach(function (sel) {
        var option = document.createElement('option');
        option.value = breed;
        option.textContent = breed;
        sel.appendChild(option);
      });
    });
  }

  addConfigBtn.addEventListener('click', function () { showFormView(false); });
  batchImportBtn.addEventListener('click', function () { importModal.classList.remove('hidden'); });
  backToListBtn.addEventListener('click', showMainView);
  cancelFormBtn.addEventListener('click', showMainView);
  clearSelectionBtn.addEventListener('click', clearIndicatorSelection);
  searchBtn.addEventListener('click', filterConfigs);
  resetFilterBtn.addEventListener('click', function () {
    filterMajorBreed.value = '';
    filterIndicatorType.value = '';
    filterIndicatorName.value = '';
    renderTable();
  });
  formMajorBreed.addEventListener('change', function (e) {
    updateMinorBreedOptions(formMinorBreed, e.target.value);
    updateReferenceRanges();
  });
  filterMajorBreed.addEventListener('change', function (e) {
    updateMinorBreedOptions(filterMinorBreed, e.target.value);
  });

  configForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm()) return;
    svc.savePlatformReferenceRange({
      id: currentEditId,
      species: speciesFromFormMajor(formMajorBreed.value),
      breedLabel: formMinorBreed.value || null,
      targetType: selectedTarget.targetType,
      targetKey: selectedTarget.name,
      taxonomyLevel: selectedTarget.taxonomyLevel,
      minValue: parseFloat(formMinValue.value),
      maxValue: parseFloat(formMaxValue.value),
      unit: formUnit.value || '%',
      notes: formNotes.value,
      status: 'active'
    });
    C.toast('平台参考范围已保存；新配置不追溯改变已发布报告冻结范围', 'success');
    showMainView();
  });

  tableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var id = btn.dataset.id;
    if (btn.classList.contains('edit-btn')) showFormView(true, id);
    if (btn.classList.contains('delete-btn')) {
      C.confirmDialog('确定删除该配置？', function () {
        svc.deletePlatformReferenceRange(id);
        renderTable();
        svc.notifyCatalogUpdated();
      });
    }
  });

  cancelImportBtn.addEventListener('click', function () { importModal.classList.add('hidden'); });
  confirmImportBtn.addEventListener('click', function () {
    var fileInput = document.getElementById('import-file');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      C.toast('请选择 CSV 文件', 'warning');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var lines = String(ev.target.result).split(/\r?\n/).filter(Boolean);
      var imported = 0;
      lines.slice(1).forEach(function (line) {
        var cols = line.split(',');
        if (cols.length < 6) return;
        svc.savePlatformReferenceRange({
          species: cols[0].trim(),
          targetType: cols[1].trim(),
          targetKey: cols[2].trim(),
          taxonomyLevel: cols[3].trim() || null,
          minValue: parseFloat(cols[4]),
          maxValue: parseFloat(cols[5]),
          unit: (cols[6] || '%').trim(),
          notes: (cols[7] || '').trim(),
          status: 'active'
        });
        imported += 1;
      });
      C.toast('已导入 ' + imported + ' 条平台参考范围', 'success');
      importModal.classList.add('hidden');
      showMainView();
    };
    reader.readAsText(fileInput.files[0]);
  });
  downloadTemplateBtn.addEventListener('click', function () {
    var csv = 'species,targetType,targetKey,taxonomyLevel,minValue,maxValue,unit,notes\ncat,microbiota,放线菌门,phylum,25,45,%,猫科放线菌门\n';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'platform-reference-ranges-template.csv';
    a.click();
  });

  document.addEventListener('professionalCatalogUpdated', function () {
    if (!formView.classList.contains('hidden')) renderIndicatorTree();
    else renderTable();
  });

  if (C.subscribeDemo) {
    window.__petAdminPageTeardown = C.subscribeDemo(function () {
      if (!formView.classList.contains('hidden')) return;
      renderTable();
    });
  }

  refreshBreedOptions();
  showMainView();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initNormalRangeConfig: initNormalRangeConfig };
}
