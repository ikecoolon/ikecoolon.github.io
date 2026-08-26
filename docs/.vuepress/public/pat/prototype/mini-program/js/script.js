/* global PetReportMockStore, PetMiniHelpers, PetMiniPages */
(function () {
  'use strict';

  var H = PetMiniHelpers;
  var P = PetMiniPages;

  var PAGE_TITLES = {
    home: '首页',
    reports: '报告',
    profile: '我的',
    pets: '宠物',
    'pet-reports': '宠物报告',
    'pet-detail': '宠物资料',
    claim: '领取',
    report: '报告详情',
    finding: '发现详情',
    metrics: '全部指标',
    recommendations: '建议与推荐',
    'recommendation-target': '推荐详情',
    'spu-detail': 'SPU 详情'
  };

  var MAIN_PAGES = ['home', 'reports', 'profile'];
  var DEPRECATED_PAGES = ['progress', 'history'];

  var navTitle = null;
  var backButton = null;
  var tabBar = null;
  var tabItems = [];
  var pageContainer = null;
  var unsubscribe = null;

  function parseRoute() {
    var raw = location.hash.replace(/^#\/?/, '') || 'home';
    var qIndex = raw.indexOf('?');
    var path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    var queryStr = qIndex >= 0 ? raw.slice(qIndex + 1) : '';
    var params = {};
    if (queryStr) {
      queryStr.split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    var segments = path.split('/').filter(Boolean);
    return {
      page: segments[0] || 'home',
      id: segments[1] || params.id || null,
      params: params
    };
  }

  function buildHash(page, id, params) {
    var base = page;
    if (id) base += '/' + encodeURIComponent(id);
    var queryParts = [];
    if (params) {
      Object.keys(params).forEach(function (key) {
        if (params[key] != null && params[key] !== '' && key !== 'id') {
          queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
      });
    }
    return '#' + base + (queryParts.length ? '?' + queryParts.join('&') : '');
  }

  function navigate(page, id, params, replace) {
    var hash = buildHash(page, id, params);
    if (replace) {
      location.replace(hash);
    } else if (location.hash !== hash) {
      location.hash = hash;
    } else {
      renderCurrentRoute();
    }
  }

  function isMainPage(page) {
    return MAIN_PAGES.indexOf(page) >= 0;
  }

  function setActiveTab(page) {
    tabItems.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.page === page);
    });
  }

  function updateChrome(route) {
    var main = isMainPage(route.page);
    navTitle.textContent = PAGE_TITLES[route.page] || 'PET 小程序';
    backButton.classList.toggle('hidden', main);
    tabBar.classList.toggle('hidden', !main);
    pageContainer.classList.toggle('main-tab', main);
    pageContainer.classList.toggle('sub-page', !main);
    if (main) setActiveTab(route.page);
  }

  function showClaimMessage(text, type) {
    var el = document.getElementById('claim-message');
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.className = 'form-message' + (type ? ' ' + type : '');
  }

  function goClaimConfirm(code) {
    navigate('claim', null, { step: 'confirm', code: code });
  }

  function handleClaimPreview() {
    var codeInput = document.getElementById('claim-code');
    var code = codeInput ? codeInput.value.trim() : '';
    showClaimMessage('', '');
    if (!code) {
      showClaimMessage('请输入认领码', 'error');
      return;
    }
    if (!H.previewClaimCode(code)) {
      showClaimMessage(H.CLAIM_INVALID_MSG, 'error');
      return;
    }
    goClaimConfirm(code);
  }

  function handleClaimConfirm(code) {
    showClaimMessage('', '');
    try {
      var result = H.bindClaimCodeForUser(code);
      var tr = result && result.claimCode && result.claimCode.testRecordId
        ? H.findTestRecord(result.claimCode.testRecordId)
        : null;
      var report = tr
        ? H.getState().reports.find(function (r) { return r.testRecordId === tr.id; })
        : null;

      if (report && H.canUserAccessPublishedReport(report.id)) {
        navigate('report', report.id);
        return;
      }
      navigate('reports');
    } catch (err) {
      showClaimMessage(err.message || H.CLAIM_INVALID_MSG, 'error');
    }
  }

  function bindClaimPage(route) {
    var previewBtn = document.getElementById('claim-preview-btn');
    if (previewBtn) previewBtn.addEventListener('click', handleClaimPreview);

    var confirmBtn = document.getElementById('claim-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        handleClaimConfirm(confirmBtn.getAttribute('data-code'));
      });
    }

    var backBtn = document.getElementById('claim-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        var code = route.params.code || '';
        navigate('claim', null, code ? { code: code } : null);
      });
    }

    document.querySelectorAll('.claim-scan-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-claim-code');
        if (!code) return;
        if (!H.previewClaimCode(code)) {
          showClaimMessage(H.CLAIM_INVALID_MSG, 'error');
          return;
        }
        goClaimConfirm(code);
      });
    });

    var codeInput = document.getElementById('claim-code');
    if (codeInput) {
      codeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleClaimPreview();
      });
    }
  }

  function bindPageEvents(route) {
    pageContainer.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var target = el.getAttribute('data-nav');
        if (!target) return;

        if (target === 'claim') return navigate('claim');
        if (target === 'pets') return navigate('pets');
        if (target === 'reports') return navigate('reports');
        if (target === 'pet-reports') return navigate('pet-reports', el.getAttribute('data-pet-id'));
        if (target === 'pet-detail') return navigate('pet-detail', el.getAttribute('data-pet-id'));
        if (target === 'report') return navigate('report', el.getAttribute('data-report-id'));
        if (target === 'finding') {
          var findingId = el.getAttribute('data-finding-id');
          if (findingId) return navigate('finding', findingId);
          var reportId = el.getAttribute('data-report-id');
          var indicatorKey = el.getAttribute('data-indicator-key');
          if (reportId && indicatorKey) {
            return navigate('finding', null, { reportId: reportId, indicatorKey: indicatorKey });
          }
          return;
        }
        if (target === 'metrics') return navigate('metrics', el.getAttribute('data-report-id'));
        if (target === 'recommendations') return navigate('recommendations', el.getAttribute('data-report-id'));
        if (target === 'recommendation-target') return navigate('recommendation-target', el.getAttribute('data-rec-id'));
        if (target === 'spu-detail') return navigate('spu-detail', el.getAttribute('data-product-id'));
      });
    });

    pageContainer.querySelectorAll('.filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var filter = chip.getAttribute('data-filter') || 'all';
        navigate('reports', null, { filter: filter });
      });
    });

    pageContainer.querySelectorAll('.module-head').forEach(function (head) {
      if (!head.querySelector('.fa-chevron-down')) return;
      head.addEventListener('click', function () {
        var body = head.nextElementSibling;
        var open = body.classList.toggle('open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        var icon = head.querySelector('.fa-chevron-down');
        if (icon) icon.style.transform = open ? 'rotate(180deg)' : '';
      });
    });

    var resetBtn = document.getElementById('reset-demo-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!window.confirm('确定重置演示数据？所有本地修改将恢复为种子数据。')) return;
        H.getStore().reset();
        renderCurrentRoute();
      });
    }

    if (route.page === 'claim') bindClaimPage(route);
  }

  function renderCurrentRoute() {
    var route = parseRoute();

    if (DEPRECATED_PAGES.indexOf(route.page) >= 0) {
      navigate('reports', null, null, true);
      return;
    }

    if (!PAGE_TITLES[route.page]) {
      navigate('home', null, null, true);
      return;
    }

    updateChrome(route);
    var html = '';

    try {
      switch (route.page) {
        case 'home':
          html = P.renderHome();
          break;
        case 'reports':
          html = P.renderReports({ filter: route.params.filter || 'all' });
          break;
        case 'profile':
          html = P.renderProfile();
          break;
        case 'pets':
          html = P.renderPets();
          break;
        case 'pet-reports':
          html = P.renderPetReports({ petId: route.id });
          break;
        case 'pet-detail':
          html = P.renderPetDetail({ petId: route.id });
          break;
        case 'claim': {
          var claimResult = P.renderClaim({
            step: route.params.step,
            code: route.params.code
          });
          html = claimResult.html;
          break;
        }
        case 'report':
          html = P.renderReport({ reportId: route.id });
          break;
        case 'finding':
          html = P.renderFinding({
            findingId: route.id,
            reportId: route.params.reportId,
            indicatorKey: route.params.indicatorKey
          });
          break;
        case 'metrics':
          html = P.renderMetrics({ reportId: route.id });
          break;
        case 'recommendations':
          html = P.renderRecommendations({ reportId: route.id });
          break;
        case 'recommendation-target':
          html = P.renderRecommendationTarget({ recId: route.id });
          break;
        case 'spu-detail':
          html = P.renderSpuDetail({ productId: route.id });
          break;
        default:
          html = '<div class="page-shell"><div class="empty-hint"><p>页面不存在</p></div></div>';
      }
    } catch (err) {
      console.error('[mini-program] render error:', err);
      html = '<div class="page-shell"><div class="alert-block">页面渲染失败：' + (err.message || '未知错误') + '</div></div>';
    }

    pageContainer.innerHTML = html;
    bindPageEvents(route);
    pageContainer.scrollTop = 0;
  }

  function init() {
    if (!window.PetReportMockStore) {
      document.body.innerHTML = '<p style="padding:24px;color:#c44d4d;">未加载共享 Mock Store，请通过静态服务访问。</p>';
      return;
    }

    navTitle = document.getElementById('nav-title');
    backButton = document.getElementById('back-button');
    tabBar = document.getElementById('tab-bar');
    tabItems = Array.prototype.slice.call(document.querySelectorAll('.tab-item'));
    pageContainer = document.getElementById('page-content-container');

    tabItems.forEach(function (tab) {
      tab.addEventListener('click', function () {
        navigate(tab.dataset.page);
      });
    });

    backButton.addEventListener('click', function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('home');
      }
    });

    window.addEventListener('hashchange', renderCurrentRoute);
    unsubscribe = H.getStore().subscribe(function () {
      renderCurrentRoute();
    });

    if (!location.hash || location.hash === '#') {
      navigate('home', null, null, true);
    } else {
      renderCurrentRoute();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
