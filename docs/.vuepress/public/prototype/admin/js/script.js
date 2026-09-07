document.addEventListener('DOMContentLoaded', function () {
  window.__PET_ADMIN_ASSET_VERSION = '20260907c';
  var C = window.PetAdminCommon;
  var Session = window.PetAdminSession;
  var Permissions = window.PetAdminPermissions;
  var navItems = document.querySelectorAll('#main-nav .nav-item');
  var pageContentContainer = document.getElementById('page-content-container');
  var pageTitle = document.getElementById('page-title');
  var sider = document.getElementById('admin-sider');
  var siderToggle = document.getElementById('sider-toggle');
  var siderMask = document.getElementById('sider-mask');
  var actorLabel = document.getElementById('admin-actor-label');
  var mobileNavQuery = window.matchMedia('(max-width: 768px)');
  var loadedScripts = {};
  var currentPageId = null;
  var lastLoadedHash = null;
  var loadGeneration = 0;
  var tabPageHooks = {};

  C.enhanceDom(document.body);
  C.startEnhanceObserver();

  if (actorLabel && Permissions) {
    actorLabel.textContent = Permissions.getActorLabel();
  }

  function isMobileNav() {
    return mobileNavQuery.matches;
  }

  function setSiderOpen(open) {
    if (!sider || !siderToggle) return;
    if (!isMobileNav()) {
      sider.classList.remove('is-open');
      if (siderMask) siderMask.classList.remove('is-visible');
      document.body.classList.remove('ant-sider-open');
      siderToggle.setAttribute('aria-expanded', 'false');
      sider.setAttribute('aria-hidden', 'false');
      if (siderMask) siderMask.setAttribute('aria-hidden', 'true');
      return;
    }
    sider.classList.toggle('is-open', open);
    if (siderMask) siderMask.classList.toggle('is-visible', open);
    document.body.classList.toggle('ant-sider-open', open);
    siderToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    sider.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (siderMask) siderMask.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  function closeSider() {
    setSiderOpen(false);
  }

  if (siderToggle && sider) {
    setSiderOpen(false);
    siderToggle.addEventListener('click', function () {
      if (!isMobileNav()) return;
      setSiderOpen(!sider.classList.contains('is-open'));
    });
    if (siderMask) {
      siderMask.addEventListener('click', closeSider);
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isMobileNav() && sider.classList.contains('is-open')) {
        closeSider();
      }
    });
    if (typeof mobileNavQuery.addEventListener === 'function') {
      mobileNavQuery.addEventListener('change', closeSider);
    } else if (typeof mobileNavQuery.addListener === 'function') {
      mobileNavQuery.addListener(closeSider);
    }
  }

  var DEFAULT_PAGE = 'report-center';

  var DEPRECATED_PAGE_REDIRECTS = {
    dashboard: { pageId: 'report-center' },
    'excel-import': { pageId: 'detection-records' },
    'published-reports': { pageId: 'report-center' },
    'pet-report-management': { pageId: 'report-center' },
    'recommendation-mapping': { pageId: 'report-center' },
    'customer-management': { pageId: 'user-pets', params: { view: 'users' } },
    'pet-information': { pageId: 'user-pets', params: { view: 'pets' } }
  };

  var PAGE_CONFIG = {
    'report-center': { title: '报告中心', script: 'report-center-script.js', init: 'initReportCenter' },
    'detection-records': { title: '送检管理', script: 'detection-records-script.js', init: 'initDetectionRecords' },
    'report-review': { title: '报告工作台', script: 'report-review-script.js', init: 'initReportReview' },
    'user-pets': { title: '用户与宠物', script: 'user-pets-script.js', init: 'initUserPets' },
    'customer-management': { title: '用户与宠物', script: 'user-pets-script.js', init: 'initUserPets', deprecated: true },
    'pet-information': { title: '用户与宠物', script: 'user-pets-script.js', init: 'initUserPets', deprecated: true },
    'analysis-rules': { title: '分析规则', script: 'analysis-rules-script.js', init: 'initAnalysisRules' },
    'dictionary-management': { title: '专业基础资料', script: 'dictionary-management-script.js', init: 'initDictionaryManagement' },
    'normal-range-config': { title: '指标/参考范围', script: 'normal-range-config-script.js', init: 'initNormalRangeConfig' },
    'microbiota-knowledge': { title: '菌群科普', script: 'microbiota-knowledge-script.js', init: 'initMicrobiotaKnowledge' }
  };

  function navPageId(pageId) {
    if (pageId === 'customer-management' || pageId === 'pet-information') return 'user-pets';
    return pageId;
  }

  function setActiveNav(pageId) {
    var navId = navPageId(pageId);
    navItems.forEach(function (nav) {
      nav.classList.toggle('active', nav.dataset.page === navId);
    });
  }

  function assetUrl(path) {
    var version = window.__PET_ADMIN_ASSET_VERSION || '';
    if (!version) return path;
    return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(version);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (loadedScripts[src]) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = assetUrl('./js/' + src);
      s.onload = function () {
        loadedScripts[src] = true;
        resolve();
      };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function canLeaveCurrentPage() {
    var active = Session.getActiveTab();
    if (active && !Session.canLeaveTab(active.id)) return false;
    if (typeof window.__petAdminCanLeavePage === 'function' && !window.__petAdminCanLeavePage()) {
      return false;
    }
    return true;
  }

  function suspendPageHooks() {
    window.__petAdminCanLeavePage = null;
    window.__petAdminActiveMount = null;
  }

  function restorePageHooks(tab) {
    var hooks = tab ? tabPageHooks[tab.id] : null;
    window.__petAdminCanLeavePage = hooks && hooks.canLeave ? hooks.canLeave : null;
    window.__petAdminActiveMount = tab && tab.mount ? tab.mount : null;
  }

  function runTabHook(tab, name) {
    if (!tab) return;
    var hooks = tabPageHooks[tab.id];
    if (hooks && typeof hooks[name] === 'function') hooks[name]();
    if (typeof tab[name] === 'function') tab[name]();
  }

  function deactivateTabSession(tab) {
    if (!tab || !tab._sessionActive) return;
    tab._sessionActive = false;
    suspendPageHooks();
    runTabHook(tab, 'deactivate');
  }

  function disposeTabSession(tab) {
    if (!tab) return;
    deactivateTabSession(tab);
    runTabHook(tab, 'dispose');
    if (typeof tab.teardown === 'function') {
      tab.teardown();
      tab.teardown = null;
    }
    delete tabPageHooks[tab.id];
  }

  function rawHash() {
    return (window.location.hash || '').replace(/^#/, '');
  }

  function buildHash(pageId, params) {
    var hash = pageId;
    var keys = params ? Object.keys(params).sort() : [];
    if (keys.length) {
      hash += '?' + keys.map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
    }
    return hash;
  }

  function resolveRoute(pageId, params) {
    params = params || {};
    if (pageId === 'pet-information') {
      if (params.petId && (params.action === 'detail' || params.action === 'manage' || params.action === 'edit')) {
        return {
          pageId: 'user-pets',
          params: { detail: 'pet', id: params.petId },
          redirected: true
        };
      }
      if (params.action === 'create' || params.action === 'assign') {
        return {
          pageId: 'detection-records',
          params: Object.assign({ action: 'register' }, params.testRecordId ? { testRecordId: params.testRecordId } : {}),
          redirected: true
        };
      }
      return { pageId: 'user-pets', params: { view: 'pets' }, redirected: true };
    }
    if (pageId === 'customer-management') {
      if (params.userId || params.customerId) {
        return {
          pageId: 'user-pets',
          params: { detail: 'user', id: params.userId || params.customerId },
          redirected: true
        };
      }
      return { pageId: 'user-pets', params: { view: 'users' }, redirected: true };
    }
    var redirect = DEPRECATED_PAGE_REDIRECTS[pageId];
    if (redirect) {
      var merged = Object.assign({}, redirect.params || {}, params);
      return { pageId: redirect.pageId, params: merged, redirected: true };
    }
    if (!PAGE_CONFIG[pageId]) {
      return { pageId: DEFAULT_PAGE, params: {}, redirected: true };
    }
    return { pageId: pageId, params: params, redirected: false };
  }

  function resolvePageId(pageId) {
    return resolveRoute(pageId, {}).pageId;
  }

  function tabTitleFor(pageId, params, config) {
    if (pageId === 'user-pets' && params && params.detail === 'user' && params.id) {
      return '用户详情';
    }
    if (pageId === 'user-pets' && params && params.detail === 'pet' && params.id) {
      return '宠物详情';
    }
    if (pageId === 'report-review' && params && params.reportId) {
      return '报告工作台';
    }
    if (pageId === 'analysis-rules' && params && params.mode === 'edit') {
      return '编辑分析规则';
    }
    if (pageId === 'analysis-rules' && params && params.mode === 'test') {
      return '规则测试';
    }
    if (pageId === 'normal-range-config' && params && params.edit) {
      return '编辑参考范围';
    }
    if (pageId === 'microbiota-knowledge' && params && params.taxon) {
      return '菌群科普';
    }
    if (pageId === 'dictionary-management' && params && params.edit) {
      return '编辑专业资料';
    }
    return config.title;
  }

  function shouldAbortTabMount(gen, tab) {
    if (gen !== loadGeneration && Session.getActiveTab() !== tab) return true;
    if (tab._disposed) return true;
    return false;
  }

  function ensureTabMounted(tab, config) {
    if (!tab || tab.initialized || tab._disposed) return Promise.resolve();
    if (tab._mountPromise) return tab._mountPromise;
    tab._mountPromise = mountTabContent(tab, config).then(function () {
      if (Session.getActiveTab() === tab) {
        restorePageHooks(tab);
      }
    }).finally(function () {
      tab._mountPromise = null;
    });
    return tab._mountPromise;
  }

  async function mountTabContent(tab, config) {
    var gen = ++loadGeneration;
    var htmlPageId = config.deprecated ? resolvePageId(tab.pageId) : tab.pageId;
    try {
      var response = await fetch(assetUrl('./' + htmlPageId + '.html'));
      if (!response.ok) throw new Error('HTTP ' + response.status);
      if (shouldAbortTabMount(gen, tab)) return;
      var html = await response.text();
      if (shouldAbortTabMount(gen, tab)) return;
      tab.mount.innerHTML = html;
      if (config.script) {
        await loadScript(config.script);
      }
      if (shouldAbortTabMount(gen, tab)) return;
      await runPageInit(config, tab);
      if (shouldAbortTabMount(gen, tab)) return;
      tab.initialized = true;
      C.enhanceDom(tab.mount);
    } catch (err) {
      console.error('Error loading page ' + tab.pageId, err);
      tab.mount.innerHTML =
        '<div class="ant-alert ant-alert-error">' +
        '<p>页面加载失败: ' + C.escapeHtml(config.title) + '</p>' +
        '<button type="button" class="btn-primary px-4 py-2 rounded-md text-sm mt-3" data-retry-tab="' + C.escapeHtml(tab.id) + '">重试</button>' +
        '</div>';
      var retryBtn = tab.mount.querySelector('[data-retry-tab]');
      if (retryBtn) {
        retryBtn.onclick = function () { mountTabContent(tab, config); };
      }
    }
  }

  async function runPageInit(config, tab) {
    suspendPageHooks();
    var initName = config.init;
    if (!initName || typeof window[initName] !== 'function') return;
    var result = window[initName](tab.mount, tab);
    if (result && typeof result.then === 'function') {
      await result;
    } else if (typeof result === 'function') {
      tab.teardown = result;
    }
    if (Session.getActiveTab() === tab) {
      restorePageHooks(tab);
      runTabHook(tab, 'activate');
    }
  }

  function activateTabSession(tab, updateHash) {
    if (!tab) return;
    Session.activateTab(tab.id);
    currentPageId = tab.pageId;
    var config = PAGE_CONFIG[tab.pageId] || PAGE_CONFIG[resolvePageId(tab.pageId)];
    var title = tabTitleFor(tab.pageId, tab.params, config);
    tab.title = title;
    pageTitle.textContent = title;
    Session.renderTabbar();
    setActiveNav(tab.pageId);
    lastLoadedHash = tab.hash;
    if (updateHash !== false && rawHash() !== tab.hash) {
      window.location.hash = tab.hash;
    }
  }

  async function loadPage(pageId, updateHash, routeParams) {
    if (updateHash === undefined) updateHash = true;
    var route = resolveRoute(pageId, routeParams);
    pageId = route.pageId;
    var params = route.params;
    var config = PAGE_CONFIG[pageId];
    if (!config) {
      pageId = DEFAULT_PAGE;
      config = PAGE_CONFIG[pageId];
      params = {};
    }

    var hash = buildHash(pageId, params);
    var tabKey = Session.buildTabKey(pageId, params);
    var existing = Session.findTabByKey(tabKey);
    if (existing) {
      var wasActive = Session.getActiveTab() === existing;
      existing.params = Object.assign({}, existing.params, params);
      existing.hash = hash;
      existing.title = tabTitleFor(pageId, existing.params, config);
      activateTabSession(existing, updateHash);
      if (!existing.initialized) {
        await ensureTabMounted(existing, config);
      } else if (wasActive) {
        restorePageHooks(existing);
        runTabHook(existing, 'activate');
      }
      return;
    }

    var tab = Session.ensureTab(pageId, params, tabTitleFor(pageId, params, config));
    tab.hash = hash;
    tab.tabKey = tabKey;
    tab.key = tabKey;
    activateTabSession(tab, updateHash);

    if (!tab.initialized) {
      await ensureTabMounted(tab, config);
    }
  }

  Session.init({
    container: pageContentContainer,
    tabbar: document.getElementById('admin-tabbar'),
    onActivate: function (tab) {
      if (!tab) {
        deactivateTabSession(Session.getActiveTab());
        suspendPageHooks();
        return;
      }
      if (!canLeaveCurrentPage()) return;
      var wasActive = Session.getActiveTab() === tab;
      activateTabSession(tab, true);
      if (!tab.initialized) {
        var cfg = PAGE_CONFIG[tab.pageId] || PAGE_CONFIG[resolvePageId(tab.pageId)];
        if (cfg) ensureTabMounted(tab, cfg);
      } else if (wasActive) {
        restorePageHooks(tab);
        runTabHook(tab, 'activate');
      }
    },
    onTabDeactivate: function (tab) {
      deactivateTabSession(tab);
    },
    onTabActivate: function (tab) {
      tab._sessionActive = true;
      restorePageHooks(tab);
      runTabHook(tab, 'activate');
    }
  });

  var origCloseTab = Session.closeTab;
  Session.closeTab = function (tabId) {
    var tab = Session.findTab(tabId);
    if (!tab) return false;
    if (!Session.canLeaveTab(tabId)) return false;
    tab._disposed = true;
    disposeTabSession(tab);
    return origCloseTab(tabId, { skipLeaveCheck: true });
  };

  var origCloseOtherTabs = Session.closeOtherTabs;
  Session.closeOtherTabs = function (keepTabId) {
    var keepId = keepTabId || (Session.getActiveTab() && Session.getActiveTab().id);
    var victims = Session.getTabs().filter(function (t) { return t.id !== keepId; });
    for (var i = 0; i < victims.length; i++) {
      if (!Session.canLeaveTab(victims[i].id)) return false;
    }
    victims.forEach(function (t) {
      t._disposed = true;
      disposeTabSession(t);
    });
    return origCloseOtherTabs(keepId, { skipLeaveCheck: true });
  };

  var origCloseAllTabs = Session.closeAllTabs;
  Session.closeAllTabs = function () {
    var all = Session.getTabs().slice();
    for (var i = 0; i < all.length; i++) {
      if (!Session.canLeaveTab(all[i].id)) return false;
    }
    all.forEach(function (t) {
      t._disposed = true;
      disposeTabSession(t);
    });
    return origCloseAllTabs({ skipLeaveCheck: true });
  };

  window.__petAdminRegisterTabHooks = function (tabId, hooks) {
    tabPageHooks[tabId] = hooks || {};
    var active = Session.getActiveTab();
    if (active && active.id === tabId && active._sessionActive !== false) {
      restorePageHooks(active);
    }
  };

  window.__petAdminCloseOtherTabs = function (keepTabId) {
    return Session.closeOtherTabs(keepTabId);
  };

  window.__petAdminCloseAllTabs = function () {
    return Session.closeAllTabs();
  };

  window.__petAdminSetTabDirty = function (dirty) {
    var active = Session.getActiveTab();
    if (active) Session.setDirty(active.id, dirty);
  };

  navItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      if (isMobileNav()) closeSider();
      if (!canLeaveCurrentPage()) return;
      var targetPage = item.dataset.page;
      var resolved = resolveRoute(targetPage, {});
      loadPage(resolved.pageId, true, resolved.params);
    });
  });

  function handleRoute() {
    var raw = rawHash() || DEFAULT_PAGE;
    if (raw === lastLoadedHash) return;
    if (!canLeaveCurrentPage()) {
      window.location.hash = lastLoadedHash || currentPageId || DEFAULT_PAGE;
      return;
    }
    var route = C.parseRoute();
    var resolved = resolveRoute(route.pageId, route.params);
    loadPage(resolved.pageId, resolved.redirected, resolved.params);
  }

  window.addEventListener('hashchange', handleRoute);

  window.addEventListener('beforeunload', function (e) {
    var active = Session.getActiveTab();
    if (active && Session.isDirty(active.id)) {
      e.preventDefault();
      e.returnValue = '';
    }
    if (typeof window.__petAdminCanLeavePage === 'function' && !window.__petAdminCanLeavePage()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  handleRoute();
});
