/**
 * 后台原型共享工具 — 只读/写入均通过 PetReportMockStore
 */
(function (global) {
  'use strict';

  var store = function () {
    return global.PetReportMockStore;
  };

  var ROLE_KEY = 'pet-admin-demo-role';

  function getRole() {
    return sessionStorage.getItem(ROLE_KEY) || 'reviewer';
  }

  function setRole(role) {
    sessionStorage.setItem(ROLE_KEY, role);
    global.dispatchEvent(new CustomEvent('pet-admin-role-change', { detail: { role: role } }));
  }

  function isDataReviser() {
    return getRole() === 'reviser';
  }

  function parseRoute() {
    var raw = (global.location.hash || '').replace(/^#/, '') || 'dashboard';
    var qIndex = raw.indexOf('?');
    var pageId = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    var params = {};
    if (qIndex >= 0) {
      var search = raw.slice(qIndex + 1);
      search.split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    return { pageId: pageId, params: params };
  }

  function navigate(pageId, params) {
    var hash = pageId;
    if (params && Object.keys(params).length) {
      hash += '?' + Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
    }
    global.location.hash = hash;
  }

  function toast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var el = document.createElement('div');
    var colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-600',
      warning: 'bg-amber-500',
      info: 'bg-slate-700'
    };
    el.className = 'toast-item px-4 py-3 rounded-md text-white text-sm shadow-lg ' + (colors[type] || colors.info);
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add('opacity-0');
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  }

  function confirmDialog(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4';
    overlay.innerHTML =
      '<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">' +
      '<p class="text-gray-800 mb-6">' + escapeHtml(message) + '</p>' +
      '<div class="flex justify-end gap-3">' +
      '<button type="button" class="btn-secondary px-4 py-2 rounded-md" data-action="cancel">取消</button>' +
      '<button type="button" class="btn-primary px-4 py-2 rounded-md" data-action="ok">确定</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').onclick = function () { overlay.remove(); };
    overlay.querySelector('[data-action="ok"]').onclick = function () {
      overlay.remove();
      if (onConfirm) onConfirm();
    };
  }

  function promptDialog(title, placeholder, onSubmit) {
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4';
    overlay.innerHTML =
      '<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">' +
      '<h3 class="font-semibold text-gray-900 mb-3">' + escapeHtml(title) + '</h3>' +
      '<textarea class="w-full border border-gray-300 rounded-md p-2 text-sm min-h-[80px]" id="prompt-input" placeholder="' + escapeHtml(placeholder || '') + '"></textarea>' +
      '<div class="flex justify-end gap-3 mt-4">' +
      '<button type="button" class="btn-secondary px-4 py-2 rounded-md" data-action="cancel">取消</button>' +
      '<button type="button" class="btn-primary px-4 py-2 rounded-md" data-action="ok">提交</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('#prompt-input');
    input.focus();
    overlay.querySelector('[data-action="cancel"]').onclick = function () { overlay.remove(); };
    overlay.querySelector('[data-action="ok"]').onclick = function () {
      var val = input.value.trim();
      if (!val) {
        toast('请填写内容', 'warning');
        return;
      }
      overlay.remove();
      if (onSubmit) onSubmit(val);
    };
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return iso.slice(0, 19).replace('T', ' ');
    } catch (e) {
      return iso;
    }
  }

  function lookupUser(state, userId) {
    if (!userId) return null;
    return state.users.find(function (u) { return u.id === userId; });
  }

  function lookupPet(state, petId) {
    if (!petId) return null;
    return state.pets.find(function (p) { return p.id === petId; });
  }

  function lookupStore(state, storeId) {
    if (!storeId) return null;
    return state.stores.find(function (s) { return s.id === storeId; });
  }

  function lookupReport(state, reportId) {
    return state.reports.find(function (r) { return r.id === reportId; });
  }

  function getCurrentIndicators(state, testRecordId) {
    return state.indicators.filter(function (i) {
      return i.testRecordId === testRecordId && i.isCurrent;
    });
  }

  var TEST_STATUS_LABELS = {
    pending_result: '待结果',
    pending_claim: '待认领',
    import_failed: '导入异常',
    pending_review: '待审核',
    published: '已发布'
  };

  var REPORT_STATUS_LABELS = {
    draft: '草稿',
    pending_review: '待审核',
    rejected: '已驳回',
    approved: '已批准',
    published: '已发布',
    corrected: '已更正'
  };

  var DATA_STATUS_LABELS = {
    PRESENT: '有效',
    MISSING_COLUMN: '缺列',
    EMPTY: '空值',
    NOT_DETECTED: '未检出',
    INVALID: '无效',
    NOT_APPLICABLE: '不适用'
  };

  function statusBadge(status, map) {
    var label = (map && map[status]) || status;
    var cls = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ';
    var colors = {
      pending_result: 'bg-blue-100 text-blue-800',
      pending_claim: 'bg-purple-100 text-purple-800',
      import_failed: 'bg-red-100 text-red-800',
      pending_review: 'bg-amber-100 text-amber-800',
      published: 'bg-emerald-100 text-emerald-800',
      draft: 'bg-gray-100 text-gray-700',
      rejected: 'bg-red-100 text-red-800',
      approved: 'bg-teal-100 text-teal-800',
      corrected: 'bg-indigo-100 text-indigo-800',
      success: 'bg-emerald-100 text-emerald-800',
      failed: 'bg-red-100 text-red-800',
      partial: 'bg-amber-100 text-amber-800'
    };
    return '<span class="' + cls + (colors[status] || 'bg-gray-100 text-gray-700') + '">' + escapeHtml(label) + '</span>';
  }

  function canRecommend(dataStatus) {
    var normalized = dataStatus === 'VALID' ? 'PRESENT' : dataStatus;
    return normalized === 'PRESENT';
  }

  var REVIEW_DRAFT_KEY = 'pet-admin-review-drafts-v1';

  function getReviewDrafts() {
    try {
      return JSON.parse(sessionStorage.getItem(REVIEW_DRAFT_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveReviewDraft(reportId, draft) {
    var all = getReviewDrafts();
    all[reportId] = draft;
    sessionStorage.setItem(REVIEW_DRAFT_KEY, JSON.stringify(all));
  }

  function getReviewDraft(reportId) {
    return getReviewDrafts()[reportId] || null;
  }

  /** 演示用分析规则（只读常量，非业务状态） */
  var DEMO_ANALYSIS_RULES = [
    {
      id: 'rule-001',
      name: '放线菌门偏低',
      species: '猫,狗',
      indicatorKey: '放线菌门',
      dataStatus: 'PRESENT',
      riskLevel: 'medium',
      priority: 10,
      module: 'gut_balance',
      recommendAction: 'PRODUCT',
      professional: '放线菌门占比低于参考范围，可能影响肠道屏障与免疫调节。',
      consumer: '肠道有益菌偏少，建议关注日常饮食与益生菌补充。',
      suppressProduct: false,
      isActive: true
    },
    {
      id: 'rule-002',
      name: '厚壁菌门未检出',
      species: '猫,狗',
      indicatorKey: '厚壁菌门',
      dataStatus: 'NOT_DETECTED',
      riskLevel: 'high',
      priority: 20,
      module: 'alert_banner',
      recommendAction: 'NONE',
      professional: '厚壁菌门未检出（NOT_DETECTED），不可等同于偏低结论。',
      consumer: '该项未检出，需结合复检与其他指标综合判断。',
      suppressProduct: true,
      isActive: true
    },
    {
      id: 'rule-003',
      name: '有害菌比例无效',
      species: '猫,狗',
      indicatorKey: '有害菌比例',
      dataStatus: 'INVALID',
      riskLevel: 'high',
      priority: 30,
      module: 'data_quality',
      recommendAction: 'NONE',
      professional: '指标值为无效数据（INVALID），禁止触发商品推荐。',
      consumer: '实验室数据异常，请联系机构复核。',
      suppressProduct: true,
      isActive: true
    }
  ];

  global.PetAdminCommon = {
    store: store,
    getRole: getRole,
    setRole: setRole,
    isDataReviser: isDataReviser,
    parseRoute: parseRoute,
    navigate: navigate,
    toast: toast,
    confirmDialog: confirmDialog,
    promptDialog: promptDialog,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    lookupUser: lookupUser,
    lookupPet: lookupPet,
    lookupStore: lookupStore,
    lookupReport: lookupReport,
    getCurrentIndicators: getCurrentIndicators,
    TEST_STATUS_LABELS: TEST_STATUS_LABELS,
    REPORT_STATUS_LABELS: REPORT_STATUS_LABELS,
    DATA_STATUS_LABELS: DATA_STATUS_LABELS,
    statusBadge: statusBadge,
    canRecommend: canRecommend,
    getReviewDraft: getReviewDraft,
    saveReviewDraft: saveReviewDraft,
    DEMO_ANALYSIS_RULES: DEMO_ANALYSIS_RULES
  };
})(window);
