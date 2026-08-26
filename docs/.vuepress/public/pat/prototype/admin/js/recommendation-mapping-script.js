function initRecommendationMapping() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var AVAILABILITY_LABELS = {
    AVAILABLE: '正常上架有库存',
    ZERO_STOCK: '主推零库存（保留专业关系，展示标签候选）',
    UNAVAILABLE: '主推下架或不可用（按标签候选解析）',
    NO_CANDIDATES: '无可用候选商品（健康建议仍保留，商品承接为空）'
  };

  var DEMO_SCENARIOS = [
    {
      key: 'normal',
      label: '正常上架',
      primaryProductId: 'prod-001',
      healthTagIds: ['htag-001'],
      species: ''
    },
    {
      key: 'zero-stock',
      label: '零库存',
      primaryProductId: 'prod-004',
      healthTagIds: ['htag-001'],
      species: ''
    },
    {
      key: 'unavailable',
      label: '下架',
      primaryProductId: 'prod-002',
      healthTagIds: ['htag-001'],
      species: ''
    },
    {
      key: 'no-candidates',
      label: '无候选',
      primaryProductId: 'prod-004',
      healthTagIds: ['htag-003'],
      species: ''
    }
  ];

  var editRecId = document.getElementById('edit-rec-id');
  var editLabel = document.getElementById('edit-label');
  var editPrimaryProduct = document.getElementById('edit-primary-product');
  var editHealthTags = document.getElementById('edit-health-tags');
  var editSpecies = document.getElementById('edit-species');
  var resolveResult = document.getElementById('resolve-result');
  var tagMappingOverview = document.getElementById('tag-mapping-overview');
  var demoScenariosEl = document.getElementById('demo-scenarios');

  var unsub = store.subscribe(function (state) {
    render(state);
  });
  window.__petAdminPageTeardown = function () { unsub(); };

  document.getElementById('btn-save').onclick = function () {
    var recId = editRecId.value;
    if (!recId) {
      C.toast('请先选择推荐项', 'warning');
      return;
    }
    try {
      store.updateRecommendation({
        recommendationId: recId,
        label: editLabel.value,
        targetType: 'PRODUCT',
        primaryProductId: editPrimaryProduct.value || null,
        healthTagIds: getSelectedHealthTagIds(),
        species: editSpecies.value || null
      });
      C.toast('推荐项已保存', 'success');
      runPreview(store.getState());
    } catch (err) {
      C.toast(err.message || '保存失败', 'error');
    }
  };

  document.getElementById('btn-preview').onclick = function () {
    runPreview(store.getState());
  };

  editRecId.onchange = function () {
    loadRecommendationIntoForm(store.getState());
    runPreview(store.getState());
  };

  editLabel.oninput = function () { runPreview(store.getState()); };
  editPrimaryProduct.onchange = function () { runPreview(store.getState()); };
  editSpecies.onchange = function () { runPreview(store.getState()); };
  editHealthTags.addEventListener('change', function () { runPreview(store.getState()); });

  render(store.getState());

  function render(state) {
    renderDemoScenarios(state);
    renderRecommendationSelect(state);
    renderProductSelect(state);
    renderHealthTagCheckboxes(state);
    if (!editRecId.dataset.loaded) {
      loadRecommendationIntoForm(state);
      editRecId.dataset.loaded = '1';
    }
    renderTagMappingOverview(state);
    runPreview(state);
  }

  function renderDemoScenarios(state) {
    demoScenariosEl.innerHTML = DEMO_SCENARIOS.map(function (scenario) {
      var primary = findProduct(state, scenario.primaryProductId);
      var tag = findHealthTag(state, scenario.healthTagIds[0]);
      var hint = (primary ? primary.name : scenario.primaryProductId) +
        ' · ' + (tag ? tag.name : scenario.healthTagIds.join(','));
      return '<button type="button" class="px-3 py-1.5 text-xs rounded-md border border-slate-300 hover:bg-slate-50" data-scenario="' + scenario.key + '">' +
        C.escapeHtml(scenario.label) + '<span class="text-slate-400 ml-1">(' + C.escapeHtml(hint) + ')</span></button>';
    }).join('');

    demoScenariosEl.querySelectorAll('[data-scenario]').forEach(function (btn) {
      btn.onclick = function () {
        var scenario = DEMO_SCENARIOS.find(function (s) { return s.key === btn.getAttribute('data-scenario'); });
        if (!scenario) return;
        applyScenarioToForm(scenario);
        runPreview(store.getState());
        C.toast('已填充演示场景：' + scenario.label, 'info');
      };
    });
  }

  function renderRecommendationSelect(state) {
    var current = editRecId.value;
    editRecId.innerHTML = state.recommendations.map(function (rec) {
      var label = rec.label || rec.id;
      return '<option value="' + rec.id + '">' + C.escapeHtml(label) + '</option>';
    }).join('');
    if (current && state.recommendations.some(function (r) { return r.id === current; })) {
      editRecId.value = current;
    }
  }

  function renderProductSelect(state) {
    var current = editPrimaryProduct.value;
    editPrimaryProduct.innerHTML = '<option value="">— 未选择 —</option>' +
      state.products.map(function (p) {
        var status = formatProductStatus(p);
        return '<option value="' + p.id + '">' + C.escapeHtml(p.name) + ' (' + C.escapeHtml(status) + ')</option>';
      }).join('');
    if (current && state.products.some(function (p) { return p.id === current; })) {
      editPrimaryProduct.value = current;
    }
  }

  function renderHealthTagCheckboxes(state) {
    var selected = getSelectedHealthTagIds();
    editHealthTags.innerHTML = state.healthTags.map(function (tag) {
      var checked = selected.indexOf(tag.id) >= 0 ? ' checked' : '';
      var enabled = tag.enabled ? '启用' : '停用';
      return '<label class="flex items-center gap-2 border border-slate-100 rounded p-2">' +
        '<input type="checkbox" class="health-tag-cb" value="' + tag.id + '"' + checked + '>' +
        '<span>' + C.escapeHtml(tag.name) + '</span>' +
        '<span class="text-xs text-slate-400">' + C.escapeHtml(enabled) + ' · ' + C.escapeHtml(tag.species || '—') + '</span>' +
        '</label>';
    }).join('');
  }

  function renderTagMappingOverview(state) {
    tagMappingOverview.innerHTML = state.healthTags.map(function (tag) {
      var mappings = (state.healthTagProducts || [])
        .filter(function (m) { return m.healthTagId === tag.id; })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });

      var tagStatus = tag.enabled
        ? '<span class="text-emerald-600">启用</span>'
        : '<span class="text-red-600">停用</span>';

      var rows = mappings.length
        ? mappings.map(function (m) {
          var product = findProduct(state, m.productId);
          var mapEnabled = m.enabled ? '启用' : '停用';
          var productLine = product
            ? C.escapeHtml(product.name) + ' · ' + C.escapeHtml(formatProductStatus(product)) + ' · 库存 ' + (product.stock != null ? product.stock : '—')
            : C.escapeHtml(m.productId) + ' · <span class="text-red-600">商品不存在</span>';
          return '<li class="flex justify-between gap-2 border-b border-slate-100 py-1.5 text-xs">' +
            '<span><span class="text-slate-400">#' + m.sortOrder + '</span> ' + productLine + '</span>' +
            '<span class="text-slate-400 shrink-0">' + C.escapeHtml(m.species || '—') + ' · ' + mapEnabled + '</span>' +
            '</li>';
        }).join('')
        : '<li class="text-xs text-slate-400 py-1">无候选 SPU 映射</li>';

      return '<div class="border border-slate-200 rounded-md p-3">' +
        '<div class="flex justify-between items-start gap-2 mb-2">' +
        '<p class="font-medium text-sm">' + C.escapeHtml(tag.name) + '</p>' +
        '<span class="text-xs">' + tagStatus + ' · 物种 ' + C.escapeHtml(tag.species || '—') + '</span>' +
        '</div>' +
        '<ul class="list-none">' + rows + '</ul>' +
        '</div>';
    }).join('');
  }

  function loadRecommendationIntoForm(state) {
    var rec = state.recommendations.find(function (r) { return r.id === editRecId.value; });
    if (!rec) return;
    editLabel.value = rec.label || '';
    editPrimaryProduct.value = rec.primaryProductId || rec.productId || '';
    renderHealthTagCheckboxes(state);
    (rec.healthTagIds || []).forEach(function (tagId) {
      var cb = editHealthTags.querySelector('input[value="' + tagId + '"]');
      if (cb) cb.checked = true;
    });
    editSpecies.value = '';
  }

  function applyScenarioToForm(scenario) {
    editPrimaryProduct.value = scenario.primaryProductId;
    renderHealthTagCheckboxes(store.getState());
    scenario.healthTagIds.forEach(function (tagId) {
      var cb = editHealthTags.querySelector('input[value="' + tagId + '"]');
      if (cb) cb.checked = true;
    });
    editSpecies.value = scenario.species || '';
  }

  function getSelectedHealthTagIds() {
    return Array.prototype.slice.call(editHealthTags.querySelectorAll('.health-tag-cb:checked'))
      .map(function (cb) { return cb.value; });
  }

  function runPreview(state) {
    var primaryProductId = editPrimaryProduct.value || null;
    var healthTagIds = getSelectedHealthTagIds();
    var species = editSpecies.value || null;
    var labelText = editLabel.value || '';

    var result = store.resolveRecommendationTarget({
      targetType: 'PRODUCT',
      primaryProductId: primaryProductId,
      healthTagIds: healthTagIds,
      species: species
    });

    var primaryProduct = primaryProductId ? findProduct(state, primaryProductId) : null;
    var primaryRelation = primaryProduct
      ? C.escapeHtml(primaryProduct.name) + '（' + C.escapeHtml(formatProductStatus(primaryProduct)) + '，库存 ' + (primaryProduct.stock != null ? primaryProduct.stock : '—') + '）'
      : (primaryProductId ? C.escapeHtml(primaryProductId) + '（商品不存在）' : '未配置主推 SPU');

    var availabilityText = AVAILABILITY_LABELS[result.availability] || result.availability;

    var candidatesHtml = '';
    if (result.candidates && result.candidates.length) {
      candidatesHtml = '<ul class="list-none mt-1 space-y-1">' +
        result.candidates.map(function (c, idx) {
          var p = c.product || findProduct(state, c.productId);
          var name = p ? p.name : c.productId;
          var status = p ? formatProductStatus(p) : '—';
          return '<li class="text-xs border border-slate-100 rounded px-2 py-1">' +
            '<span class="text-slate-400">#' + (idx + 1) + ' sort=' + c.sortOrder + '</span> ' +
            C.escapeHtml(name) + ' · ' + C.escapeHtml(status) +
            ' · 标签 ' + C.escapeHtml(c.healthTagId || '—') +
            '</li>';
        }).join('') +
        '</ul>';
    } else {
      candidatesHtml = '<p class="text-xs text-slate-500 mt-1">无标签候选 SPU</p>';
    }

    var downgradeHtml = result.downgradePath.length
      ? '<p class="text-amber-700 text-xs mt-2"><i class="fas fa-arrow-down mr-1"></i>' + C.escapeHtml(result.downgradePath.join(' → ')) + '</p>'
      : '';

    var healthAdviceHtml = labelText
      ? '<p class="mt-2 text-sm"><span class="text-slate-500">健康建议（编辑区文案）：</span>' + C.escapeHtml(labelText) + '</p>'
      : '<p class="mt-2 text-sm text-slate-500">健康建议文案为空；无候选时仍应在此配置建议内容。</p>';

    var extraUnavailable = '';
    if (primaryProductId === 'prod-002') {
      var missing = findProduct(state, 'prod-missing');
      if (missing) {
        extraUnavailable = '<p class="text-xs text-slate-500 mt-1">参考：' + C.escapeHtml(missing.name) + '（' + C.escapeHtml(formatProductStatus(missing)) + '）亦为下架/不可用示例。</p>';
      }
    }

    resolveResult.innerHTML =
      '<p><span class="text-slate-500">主推 SPU 关系：</span>' + primaryRelation + extraUnavailable + '</p>' +
      '<p><span class="text-slate-500">availability：</span>' + C.escapeHtml(availabilityText) + ' <span class="text-xs text-slate-400">(' + C.escapeHtml(result.availability) + ')</span></p>' +
      '<p><span class="text-slate-500">解析结果：</span><strong class="text-teal-700">' + C.escapeHtml(result.resolvedType) + '</strong></p>' +
      '<p class="text-xs text-slate-500 mt-1">Store 解析 label：' + C.escapeHtml(result.label) + '</p>' +
      '<div class="mt-2"><span class="text-slate-500">标签候选 SPU：</span>' + candidatesHtml + '</div>' +
      downgradeHtml +
      healthAdviceHtml;
  }

  function findProduct(state, productId) {
    return state.products.find(function (p) { return p.id === productId; });
  }

  function findHealthTag(state, healthTagId) {
    return (state.healthTags || []).find(function (t) { return t.id === healthTagId; });
  }

  function formatProductStatus(product) {
    if (!product.available) return '已下架';
    var stock = product.stock != null ? product.stock : 1;
    if (stock <= 0) return '上架零库存';
    return '上架有库存';
  }
}
