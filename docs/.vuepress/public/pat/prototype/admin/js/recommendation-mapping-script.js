function initRecommendationMapping() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var PRIMARY_STATUS_LABELS = {
    AVAILABLE: '上架有库存',
    ZERO_STOCK: '上架零库存',
    UNAVAILABLE: '已下架或不可用',
    MISSING: '商品不存在'
  };

  var DISPLAY_MODE_LABELS = {
    AVAILABLE: '展示主推商品',
    ZERO_STOCK: '主推零库存，展示标签候选商品',
    UNAVAILABLE: '主推不可用，按健康标签展示候选商品',
    NO_CANDIDATES: '无可用商品，仅展示健康建议'
  };

  var editRecId = document.getElementById('edit-rec-id');
  var editLabel = document.getElementById('edit-label');
  var editPrimaryProduct = document.getElementById('edit-primary-product');
  var editHealthTags = document.getElementById('edit-health-tags');
  var editSpecies = document.getElementById('edit-species');
  var resolveResult = document.getElementById('resolve-result');
  var tagMappingOverview = document.getElementById('tag-mapping-overview');

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

  function getSelectedHealthTagIds() {
    return Array.prototype.slice.call(editHealthTags.querySelectorAll('.health-tag-cb:checked'))
      .map(function (cb) { return cb.value; });
  }

  function primaryStatusKey(result, primaryProduct, primaryProductId) {
    if (!primaryProductId) return 'MISSING';
    if (!primaryProduct) return 'MISSING';
    if (!primaryProduct.available) return 'UNAVAILABLE';
    var stock = primaryProduct.stock != null ? primaryProduct.stock : 1;
    if (stock <= 0) return 'ZERO_STOCK';
    return 'AVAILABLE';
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
    var primaryStatus = primaryStatusKey(result, primaryProduct, primaryProductId);
    var primaryLine = primaryProduct
      ? C.escapeHtml(primaryProduct.name) + '（' + C.escapeHtml(PRIMARY_STATUS_LABELS[primaryStatus] || primaryStatus) + '）'
      : (primaryProductId ? '未找到商品' : '未配置主推 SPU');

    var displayMode = DISPLAY_MODE_LABELS[result.availability] || '按当前配置解析';

    var candidatesHtml = '';
    if (result.candidates && result.candidates.length) {
      candidatesHtml = '<ol class="list-decimal list-inside mt-1 space-y-1">' +
        result.candidates.map(function (c) {
          var p = c.product || findProduct(state, c.productId);
          var name = p ? p.name : c.productId;
          var status = p ? formatProductStatus(p) : '—';
          return '<li class="text-xs">' + C.escapeHtml(name) + ' · ' + C.escapeHtml(status) + '</li>';
        }).join('') +
        '</ol>';
    } else {
      candidatesHtml = '<p class="text-xs text-slate-500 mt-1">无标签候选商品</p>';
    }

    var healthAdviceHtml = labelText
      ? '<p class="mt-2 text-sm">' + C.escapeHtml(labelText) + '</p>'
      : '<p class="mt-2 text-sm text-slate-500">健康建议文案为空；无候选时仍应在此配置建议内容。</p>';

    resolveResult.innerHTML =
      '<p><span class="text-slate-500">主推商品状态：</span>' + primaryLine + '</p>' +
      '<p><span class="text-slate-500">实际展示方式：</span>' + C.escapeHtml(displayMode) + '</p>' +
      '<div class="mt-2"><span class="text-slate-500">候选商品顺序：</span>' + candidatesHtml + '</div>' +
      '<div class="mt-3 pt-3 border-t border-slate-100"><span class="text-slate-500">健康建议：</span>' + healthAdviceHtml + '</div>';
  }

  function findProduct(state, productId) {
    return state.products.find(function (p) { return p.id === productId; });
  }

  function formatProductStatus(product) {
    if (!product.available) return '已下架';
    var stock = product.stock != null ? product.stock : 1;
    if (stock <= 0) return '上架零库存';
    return '上架有库存';
  }
}
