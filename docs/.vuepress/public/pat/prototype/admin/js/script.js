document.addEventListener('DOMContentLoaded', function () {
  var C = window.PetAdminCommon;
  var navItems = document.querySelectorAll('#main-nav .nav-item');
  var pageContentContainer = document.getElementById('page-content-container');
  var pageTitle = document.getElementById('page-title');
  var loadedScripts = {};
  var currentPageId = null;
  var unsubscribe = null;

  var DEFAULT_PAGE = 'report-center';

  var DEPRECATED_PAGES = {
    'pet-report-management': 'report-center'
  };

  var PAGE_CONFIG = {
    'report-center': { title: '报告中心', script: 'report-center-script.js', init: 'initReportCenter' },
    dashboard: { title: '工作台', script: 'dashboard-script.js', init: 'initDashboard' },
    'detection-records': { title: '检测记录', script: 'detection-records-script.js', init: 'initDetectionRecords' },
    'excel-import': { title: 'Excel 导入', script: 'excel-import-script.js', init: 'initExcelImport' },
    'report-review': { title: '报告审核', script: 'report-review-script.js', init: 'initReportReview' },
    'published-reports': { title: '已发布报告', script: 'published-reports-script.js', init: 'initPublishedReports' },
    'recommendation-mapping': { title: '推荐映射', script: 'recommendation-mapping-script.js', init: 'initRecommendationMapping' },
    'customer-management': { title: '客户管理', script: 'customer-management-script.js', init: 'initCustomerManagement' },
    'pet-information': { title: '宠物档案', script: 'pet-information-script.js', init: 'initPetInformation' },
    'pet-report-management': { title: '萌宠报告', script: 'pet-report-management-script.js', init: 'initPetReportManagement' },
    'analysis-rules': { title: '分析规则', script: 'analysis-rules-script.js', init: 'initAnalysisRules' },
    'dictionary-management': { title: '字典管理', script: 'dictionary-management-script.js', init: 'initDictionaryManagement' },
    'normal-range-config': { title: '指标/参考范围', script: 'normal-range-config-script.js', init: 'initNormalRangeConfig' },
    'health-level-management': { title: '健康分级', script: 'health-level-management-script.js', init: 'initHealthLevelManagement' }
  };

  function setActiveNav(pageId) {
    navItems.forEach(function (nav) {
      nav.classList.toggle('active', nav.dataset.page === pageId);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (loadedScripts[src]) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = './js/' + src;
      s.onload = function () {
        loadedScripts[src] = true;
        resolve();
      };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function teardownPage() {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
      unsubscribe = null;
    }
    window.__petAdminPageTeardown && window.__petAdminPageTeardown();
    window.__petAdminPageTeardown = null;
  }

  function runPageInit(config) {
    var initName = config.init;
    if (initName && typeof window[initName] === 'function') {
      window[initName]();
    }
  }

  function resolvePageId(pageId) {
    if (!pageId || pageId === 'dashboard') return DEFAULT_PAGE;
    if (DEPRECATED_PAGES[pageId]) return DEPRECATED_PAGES[pageId];
    return PAGE_CONFIG[pageId] ? pageId : DEFAULT_PAGE;
  }

  async function loadPage(pageId, updateHash) {
    if (updateHash === undefined) updateHash = true;
    pageId = resolvePageId(pageId);
    var config = PAGE_CONFIG[pageId];

    teardownPage();
    currentPageId = pageId;

    try {
      var response = await fetch('./' + pageId + '.html');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var html = await response.text();
      pageContentContainer.innerHTML = html;
      pageTitle.textContent = config.title;
      setActiveNav(pageId);

      if (config.script) {
        await loadScript(config.script);
      }
      runPageInit(config);

      if (updateHash) {
        var route = C.parseRoute();
        var resolvedRoutePage = resolvePageId(route.pageId);
        var params = resolvedRoutePage === pageId ? route.params : {};
        var hash = pageId;
        if (Object.keys(params).length) {
          hash += '?' + Object.keys(params).map(function (k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
          }).join('&');
        }
        if (window.location.hash.replace(/^#/, '') !== hash) {
          window.location.hash = hash;
        }
      }
    } catch (err) {
      console.error('Error loading page ' + pageId, err);
      pageContentContainer.innerHTML =
        '<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">页面加载失败: ' +
        C.escapeHtml(config.title) + '</div>';
    }
  }

  navItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      loadPage(item.dataset.page, true);
    });
  });

  function handleRoute() {
    var route = C.parseRoute();
    loadPage(resolvePageId(route.pageId), false);
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
});
