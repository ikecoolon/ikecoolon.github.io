/**
 * 应用页签与会话 — 切换时不销毁 DOM，保留内存状态
 */
(function (global) {
  'use strict';

  var tabs = [];
  var activeTabId = null;
  var container = null;
  var tabbar = null;
  var onActivate = null;
  var onTabActivate = null;
  var onTabDeactivate = null;

  var STRIP_TAB_PARAMS = ['source', 'from', 'module', 'origin', 'ref', 'returnTo', 'title'];

  function canonicalTabParams(pageId, params) {
    var canonical = Object.assign({}, params || {});
    STRIP_TAB_PARAMS.forEach(function (k) {
      delete canonical[k];
    });

    if (pageId === 'analysis-rules') {
      if (canonical.lineage) return { lineage: canonical.lineage };
      return {};
    }
    if (pageId === 'report-review') {
      if (canonical.reportId) return { reportId: canonical.reportId };
      return {};
    }
    if (pageId === 'user-pets') {
      if (canonical.detail && canonical.id) {
        return { detail: canonical.detail, id: canonical.id };
      }
      if (canonical.view) return { view: canonical.view };
      return {};
    }
    if (pageId === 'normal-range-config') {
      if (canonical.edit) return { edit: canonical.edit };
      return {};
    }
    if (pageId === 'dictionary-management') {
      if (canonical.edit) return { edit: canonical.edit };
      return {};
    }
    if (pageId === 'microbiota-knowledge') {
      if (canonical.taxon) return { taxon: canonical.taxon };
      return {};
    }
    return canonical;
  }

  function buildTabKey(pageId, params) {
    var canonical = canonicalTabParams(pageId, params);
    var keys = Object.keys(canonical).sort();
    if (!keys.length) return pageId;
    return pageId + '?' + keys.map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(canonical[k]);
    }).join('&');
  }

  function findTabByKey(tabKey) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].tabKey === tabKey) return tabs[i];
    }
    return null;
  }

  function findTab(tabId) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === tabId) return tabs[i];
    }
    return null;
  }

  function renderTabbar() {
    if (!tabbar) return;
    tabbar.innerHTML = '';
    tabs.forEach(function (tab) {
      var tabEl = document.createElement('div');
      tabEl.className = 'admin-tab' + (tab.id === activeTabId ? ' is-active' : '') + (tab.dirty ? ' is-dirty' : '');
      tabEl.setAttribute('data-tab-id', tab.id);
      tabEl.setAttribute('role', 'tab');
      tabEl.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
      tabEl.tabIndex = tab.id === activeTabId ? 0 : -1;

      var label = document.createElement('span');
      label.className = 'admin-tab-label';
      label.textContent = tab.title;
      tabEl.appendChild(label);

      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'admin-tab-close';
      close.setAttribute('aria-label', '关闭页签');
      close.innerHTML = '&times;';
      close.addEventListener('click', function (e) {
        e.stopPropagation();
        closeTab(tab.id);
      });
      tabEl.appendChild(close);

      tabEl.addEventListener('click', function (e) {
        if (e.target.closest('.admin-tab-close')) return;
        if (tab.id !== activeTabId && onActivate) onActivate(tab);
      });
      tabEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (tab.id !== activeTabId && onActivate) onActivate(tab);
        }
      });

      tabbar.appendChild(tabEl);
    });
  }

  function detachActiveMount() {
    if (!container || !activeTabId) return;
    var tab = findTab(activeTabId);
    if (tab && tab.mount && tab.mount.parentNode === container) {
      container.removeChild(tab.mount);
    }
  }

  function attachMount(tab) {
    if (!container || !tab || !tab.mount) return;
    tab.mount.classList.add('is-active');
    container.appendChild(tab.mount);
  }

  function setDirty(tabId, dirty) {
    var tab = findTab(tabId);
    if (!tab) return;
    tab.dirty = !!dirty;
    renderTabbar();
  }

  function isDirty(tabId) {
    var tab = findTab(tabId || activeTabId);
    return tab ? !!tab.dirty : false;
  }

  function getActiveTab() {
    return findTab(activeTabId);
  }

  function canLeaveTab(tabId) {
    tabId = tabId || activeTabId;
    var tab = findTab(tabId);
    if (!tab) return true;
    if (tab.dirty) {
      return global.confirm('当前页签有未保存的修改，确定离开吗？');
    }
    return true;
  }

  function activateTab(tabId) {
    var tab = findTab(tabId);
    if (!tab) return false;
    if (activeTabId === tabId) return true;

    var prevTab = findTab(activeTabId);
    if (prevTab && onTabDeactivate) onTabDeactivate(prevTab, tab);

    detachActiveMount();
    tabs.forEach(function (t) {
      if (t.mount) t.mount.classList.remove('is-active');
    });
    activeTabId = tabId;
    attachMount(tab);
    if (onTabActivate) onTabActivate(tab, prevTab || null);
    renderTabbar();
    return true;
  }

  function ensureTab(pageId, params, title) {
    var tabKey = buildTabKey(pageId, params || {});
    var existing = findTabByKey(tabKey);
    if (existing) {
      if (title) existing.title = title;
      existing.params = Object.assign({}, existing.params || {}, params || {});
      existing.tabKey = tabKey;
      existing.key = tabKey;
      return existing;
    }

    var tab = {
      id: 'tab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      key: tabKey,
      tabKey: tabKey,
      pageId: pageId,
      params: Object.assign({}, params || {}),
      title: title || pageId,
      dirty: false,
      initialized: false,
      listState: {},
      pageState: {},
      mount: document.createElement('div'),
      hash: tabKey
    };
    tab.mount.className = 'page-mount';
    tab.mount.setAttribute('data-tab-id', tab.id);
    tab.mount.setAttribute('data-page-id', pageId);
    tabs.push(tab);
    return tab;
  }

  function disposeTabMount(tab) {
    if (!tab) return;
    if (tab.mount && tab.mount.parentNode) {
      tab.mount.parentNode.removeChild(tab.mount);
    }
    tab.mount = null;
  }

  function closeTab(tabId, opts) {
    opts = opts || {};
    var tab = findTab(tabId);
    if (!tab) return false;
    if (!opts.skipLeaveCheck && !canLeaveTab(tabId)) return false;

    var idx = tabs.indexOf(tab);
    var wasActive = activeTabId === tabId;
    tabs.splice(idx, 1);

    if (wasActive) {
      activeTabId = null;
    }

    disposeTabMount(tab);

    if (wasActive) {
      if (tabs.length) {
        var next = tabs[Math.max(0, idx - 1)];
        if (onActivate) onActivate(next);
      } else if (onActivate) {
        onActivate(null);
      }
    } else {
      renderTabbar();
    }
    return true;
  }

  function closeOtherTabs(keepTabId, opts) {
    opts = opts || {};
    keepTabId = keepTabId || activeTabId;
    var victims = tabs.filter(function (t) { return t.id !== keepTabId; });
    for (var i = 0; i < victims.length; i++) {
      if (!opts.skipLeaveCheck && !canLeaveTab(victims[i].id)) return false;
    }
    for (var j = 0; j < victims.length; j++) {
      closeTab(victims[j].id, { skipLeaveCheck: true });
    }
    return true;
  }

  function closeAllTabs(opts) {
    opts = opts || {};
    var snapshot = tabs.slice();
    for (var i = 0; i < snapshot.length; i++) {
      if (!opts.skipLeaveCheck && !canLeaveTab(snapshot[i].id)) return false;
    }
    while (tabs.length) {
      closeTab(tabs[0].id, { skipLeaveCheck: true });
    }
    return true;
  }

  function init(opts) {
    container = opts.container;
    tabbar = opts.tabbar;
    onActivate = opts.onActivate;
    onTabActivate = opts.onTabActivate || null;
    onTabDeactivate = opts.onTabDeactivate || null;
    renderTabbar();
  }

  function updateTabState(tabId, patch) {
    var tab = tabId ? (findTab(tabId) || findTabByKey(tabId)) : getActiveTab();
    if (!tab || !patch) return;
    if (patch.listState != null) tab.listState = patch.listState;
    if (patch.pageState != null) tab.pageState = Object.assign({}, tab.pageState || {}, patch.pageState);
    if (patch.dirty != null) tab.dirty = !!patch.dirty;
    if (patch.params != null) tab.params = Object.assign({}, tab.params, patch.params);
    renderTabbar();
  }

  function getTabState(tabId) {
    var tab = tabId ? (findTab(tabId) || findTabByKey(tabId)) : getActiveTab();
    if (!tab) return null;
    return {
      listState: tab.listState || {},
      pageState: tab.pageState || {},
      dirty: !!tab.dirty,
      params: Object.assign({}, tab.params || {})
    };
  }

  function openTab(pageId, params, opts) {
    if (pageId && typeof pageId === 'object') {
      opts = pageId;
      pageId = opts.pageId;
      params = opts.params;
    }
    opts = opts || {};
    var tab = ensureTab(pageId, params || {}, opts.title);
    if (opts.title != null && opts.title !== '') tab.title = opts.title;
    if (opts.activate !== false) {
      activateTab(tab.id);
      if (onActivate) onActivate(tab);
    }
    renderTabbar();
    return tab;
  }

  function makeTabKey(pageId, params) {
    return buildTabKey(pageId, params);
  }

  function setTabDirty(tabId, dirty) {
    setDirty(tabId, dirty);
  }

  global.PetAdminSession = {
    init: init,
    buildTabKey: buildTabKey,
    canonicalTabParams: canonicalTabParams,
    makeTabKey: makeTabKey,
    ensureTab: ensureTab,
    activateTab: activateTab,
    closeTab: closeTab,
    closeOtherTabs: closeOtherTabs,
    closeAllTabs: closeAllTabs,
    getActiveTab: getActiveTab,
    findTab: findTab,
    findTabByKey: findTabByKey,
    setDirty: setDirty,
    setTabDirty: setTabDirty,
    isDirty: isDirty,
    canLeaveTab: canLeaveTab,
    updateTabState: updateTabState,
    getTabState: getTabState,
    openTab: openTab,
    renderTabbar: renderTabbar,
    getTabs: function () { return tabs.slice(); }
  };
})(window);
