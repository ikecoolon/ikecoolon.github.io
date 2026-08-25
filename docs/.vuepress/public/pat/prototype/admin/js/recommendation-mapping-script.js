function initRecommendationMapping() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var unsub = store.subscribe(render);
  window.__petAdminPageTeardown = function () { unsub(); };

  document.getElementById('btn-resolve').onclick = function () {
    var result = store.resolveRecommendationTarget({
      targetType: document.getElementById('sim-type').value,
      productId: document.getElementById('sim-product').value || null,
      categoryId: document.getElementById('sim-category').value || null
    });
    var el = document.getElementById('resolve-result');
    el.classList.remove('hidden');
    el.innerHTML =
      '<p class="font-medium">解析结果: <span class="text-teal-700">' + C.escapeHtml(result.resolvedType) + '</span></p>' +
      '<p class="mt-1">' + C.escapeHtml(result.label) + '</p>' +
      (result.downgradePath.length ? '<p class="text-amber-700 text-xs mt-2"><i class="fas fa-arrow-down mr-1"></i>' + result.downgradePath.join(' → ') + '</p>' : '');
    C.toast('推荐已解析为 ' + result.resolvedType, 'success');
  };

  render(store.getState());

  function render(state) {
    document.getElementById('products-list').innerHTML =
      state.products.map(function (p) {
        var cat = state.categories.find(function (c) { return c.id === p.categoryId; });
        var avail = p.available ? '<span class="text-emerald-600">可用</span>' : '<span class="text-red-600">已下架</span>';
        return '<div class="flex justify-between border border-slate-100 rounded p-2">' +
          '<span>' + C.escapeHtml(p.name) + '</span>' +
          '<span class="text-xs">' + avail + ' · 分类: ' + C.escapeHtml(cat ? cat.name : '—') + '</span></div>';
      }).join('') +
      '<h4 class="font-medium mt-4 mb-2 text-slate-600">分类</h4>' +
      state.categories.map(function (c) {
        return '<div class="flex justify-between border border-slate-100 rounded p-2 text-xs">' +
          C.escapeHtml(c.name) + (c.available ? '' : ' <span class="text-red-600">(不可用)</span>') + '</div>';
      }).join('');

    var rules = [
      { name: '益生菌套装 A（可用产品）', type: 'PRODUCT', productId: 'prod-001', categoryId: 'cat-002' },
      { name: '肠道调理粉（产品下架→分类）', type: 'PRODUCT', productId: 'prod-002', categoryId: 'cat-001' },
      { name: '已下架分类兜底', type: 'CATEGORY', productId: null, categoryId: 'cat-003' }
    ];

    document.getElementById('mapping-rules').innerHTML = rules.map(function (rule) {
      var resolved = store.resolveRecommendationTarget({
        targetType: rule.type,
        productId: rule.productId,
        categoryId: rule.categoryId
      });
      return '<div class="border border-slate-200 rounded-md p-3">' +
        '<p class="font-medium text-sm">' + C.escapeHtml(rule.name) + '</p>' +
        '<p class="text-xs text-slate-500 mt-1">请求 ' + rule.type + ' → 解析 <strong class="text-teal-700">' + resolved.resolvedType + '</strong></p>' +
        '<p class="text-xs mt-1">' + C.escapeHtml(resolved.label) + '</p></div>';
    }).join('');

    var prodSel = document.getElementById('sim-product');
    prodSel.innerHTML = '<option value="">—</option>' + state.products.map(function (p) {
      return '<option value="' + p.id + '">' + C.escapeHtml(p.name) + '</option>';
    }).join('');

    var catSel = document.getElementById('sim-category');
    catSel.innerHTML = '<option value="">—</option>' + state.categories.map(function (c) {
      return '<option value="' + c.id + '">' + C.escapeHtml(c.name) + '</option>';
    }).join('');
  }
}
