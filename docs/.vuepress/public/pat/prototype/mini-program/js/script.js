/* global PetReportMockStore, PetMiniHelpers, PetMiniPages */
(function () {
  'use strict';

  var H = PetMiniHelpers;
  var P = PetMiniPages;

  var PAGE_TITLES = {
    home: '首页',
    reports: '报告',
    profile: '我的',
    claim: '认领报告',
    progress: '检测进度',
    report: '报告详情',
    finding: '发现详情',
    metrics: '全部指标',
    recommendations: '建议与推荐',
    'recommendation-target': '推荐详情',
    history: '报告历史'
  };

  var MAIN_PAGES = ['home', 'reports', 'profile'];
  var claimScenarios = [];

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

  function handleClaimSubmit() {
    var codeInput = document.getElementById('claim-code');
    var verifyInput = document.getElementById('claim-verify');
    var petSelect = document.getElementById('claim-pet-select');
    var code = codeInput ? codeInput.value.trim() : '';
    var verify = verifyInput ? verifyInput.value.trim() : '';
    var petId = petSelect ? petSelect.value : '';

    showClaimMessage('', '');

    if (!code) {
      showClaimMessage('请输入认领码', 'error');
      return;
    }
    if (verify !== H.VERIFY_CODE) {
      showClaimMessage('验证码错误，演示环境请使用 123456', 'error');
      return;
    }

    try {
      var result = H.getStore().bindClaimCode({
        code: code,
        userId: H.CURRENT_USER_ID,
        petId: petId || undefined
      });
      showClaimMessage('认领成功', 'success');

      var tr = result && result.claimCode && result.claimCode.testRecordId
        ? H.findTestRecord(result.claimCode.testRecordId)
        : null;
      var report = tr
        ? H.getState().reports.find(function (r) { return r.testRecordId === tr.id; })
        : null;

      setTimeout(function () {
        if (report && (report.status === 'published' || report.status === 'corrected')) {
          navigate('report', report.id);
        } else if (tr) {
          navigate('progress', tr.id);
        } else {
          navigate('home');
        }
      }, 500);
    } catch (err) {
      showClaimMessage(err.message || '认领失败，请检查认领码', 'error');
    }
  }

  function bindClaimPage() {
    var submitBtn = document.getElementById('claim-submit-btn');
    if (submitBtn) submitBtn.addEventListener('click', handleClaimSubmit);

    document.querySelectorAll('.demo-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-demo-idx'), 10);
        var scenario = claimScenarios[idx];
        if (!scenario) return;

        if (scenario.mode === 'invalid-code') {
          var codeInput = document.getElementById('claim-code');
          var verifyInput = document.getElementById('claim-verify');
          if (codeInput) codeInput.value = scenario.code;
          if (verifyInput) verifyInput.value = scenario.verify;
          showClaimMessage('已填入无效认领码，点击确认认领查看错误提示', 'success');
          return;
        }

        if (scenario.mode === 'wrong-verify') {
          var codeInput2 = document.getElementById('claim-code');
          var verifyInput2 = document.getElementById('claim-verify');
          if (codeInput2) codeInput2.value = scenario.code;
          if (verifyInput2) verifyInput2.value = scenario.verify;
          showClaimMessage('已填入错误验证码，点击确认认领查看错误提示', 'success');
          return;
        }

        if (scenario.code) {
          var codeInput3 = document.getElementById('claim-code');
          var verifyInput3 = document.getElementById('claim-verify');
          var petSelect = document.getElementById('claim-pet-select');
          if (codeInput3) codeInput3.value = scenario.code;
          if (verifyInput3) verifyInput3.value = scenario.verify;

          if (scenario.mode === 'claim-new' && petSelect) {
            petSelect.value = '';
          }

          showClaimMessage('已填入演示认领码，点击确认认领继续', 'success');
        }
      });
    });
  }

  function bindPageEvents() {
    pageContainer.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var target = el.getAttribute('data-nav');
        if (!target) return;

        if (target === 'claim') return navigate('claim');
        if (target === 'progress') return navigate('progress', el.getAttribute('data-tr-id'));
        if (target === 'report') {
          var reportId = el.getAttribute('data-report-id');
          var version = el.getAttribute('data-version');
          return navigate('report', reportId, version ? { v: version } : null);
        }
        if (target === 'finding') return navigate('finding', el.getAttribute('data-finding-id'));
        if (target === 'metrics') {
          return navigate('metrics', el.getAttribute('data-report-id'), {
            v: el.getAttribute('data-version') || ''
          });
        }
        if (target === 'recommendations') return navigate('recommendations', el.getAttribute('data-report-id'));
        if (target === 'recommendation-target') return navigate('recommendation-target', el.getAttribute('data-rec-id'));
        if (target === 'history') return navigate('history', el.getAttribute('data-report-id'));
      });
    });

    pageContainer.querySelectorAll('.pet-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        H.setSelectedPetId(chip.getAttribute('data-pet-id'));
        renderCurrentRoute();
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

    if (document.getElementById('claim-submit-btn')) bindClaimPage();
  }

  function renderCurrentRoute() {
    var route = parseRoute();
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
          html = P.renderReports();
          break;
        case 'profile':
          html = P.renderProfile();
          break;
        case 'claim': {
          var claimResult = P.renderClaim();
          html = claimResult.html;
          claimScenarios = claimResult.scenarios;
          break;
        }
        case 'progress':
          html = P.renderProgress({ trId: route.id });
          break;
        case 'report':
          html = P.renderReport({ reportId: route.id, version: route.params.v });
          break;
        case 'finding':
          html = P.renderFinding({ findingId: route.id });
          break;
        case 'metrics':
          html = P.renderMetrics({ reportId: route.id, version: route.params.v });
          break;
        case 'recommendations':
          html = P.renderRecommendations({ reportId: route.id });
          break;
        case 'recommendation-target':
          html = P.renderRecommendationTarget({ recId: route.id });
          break;
        case 'history':
          html = P.renderHistory({ reportId: route.id });
          break;
        default:
          html = '<div class="page-shell"><div class="empty-hint"><p>页面不存在</p></div></div>';
      }
    } catch (err) {
      console.error('[mini-program] render error:', err);
      html = '<div class="page-shell"><div class="alert-block">页面渲染失败：' + (err.message || '未知错误') + '</div></div>';
    }

    pageContainer.innerHTML = html;
    bindPageEvents();
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
