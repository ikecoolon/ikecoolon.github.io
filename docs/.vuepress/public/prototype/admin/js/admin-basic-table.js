/**
 * Pet Eden 管理端 — ListPage + BasicTable 工厂（静态原型）
 */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    if (global.PetAdminCommon && global.PetAdminCommon.escapeHtml) {
      return global.PetAdminCommon.escapeHtml(str);
    }
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(msg, type) {
    if (global.PetAdminCommon && global.PetAdminCommon.toast) {
      global.PetAdminCommon.toast(msg, type);
    }
  }

  function getOwnerTabId(ownerTabId) {
    if (ownerTabId) return ownerTabId;
    var session = global.PetAdminSession;
    if (!session || !session.getActiveTab) return null;
    var tab = session.getActiveTab();
    return tab ? tab.id : null;
  }

  function getSessionListState(key, ownerTabId) {
    var session = global.PetAdminSession;
    if (!session || !key) return null;
    var tabId = getOwnerTabId(ownerTabId);
    if (!tabId) return null;
    var tab = session.findTab && session.findTab(tabId);
    if (!tab || !tab.listState) return null;
    return tab.listState[key] || null;
  }

  function saveSessionListState(key, state, ownerTabId) {
    var session = global.PetAdminSession;
    if (!session || !key) return;
    var tabId = getOwnerTabId(ownerTabId);
    if (!tabId) return;
    var tab = session.findTab && session.findTab(tabId);
    if (!tab) return;
    if (!tab.listState) tab.listState = {};
    tab.listState[key] = state;
    session.updateTabState(tab.id, { listState: tab.listState });
  }

  function defaultRowKey(row, index) {
    return row.id != null ? row.id : index;
  }

  function renderCell(column, row, index) {
    if (typeof column.render === 'function') {
      return column.render(row, index);
    }
    var val = row[column.dataIndex];
    if (val == null || val === '') return '—';
    return escapeHtml(String(val));
  }

  function isFixedRightColumn(col) {
    return col.fixed === 'right' || col.action === true;
  }

  function toolButton(label, iconClass) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rondo-btn rondo-btn-sm rondo-btn-default rondo-btn-icon-only';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.innerHTML =
      '<i class="' + iconClass + '" aria-hidden="true"></i>' +
      '<span class="rondo-visually-hidden">' + escapeHtml(label) + '</span>';
    return btn;
  }

  /**
   * @param {Object} config
   * @param {HTMLElement} config.container
   * @param {string} [config.title]
   * @param {string} [config.stateKey]
   * @param {Array} [config.searchFields]
   * @param {Array} [config.toolbarActions]
   * @param {Object} [config.tableTools]
   * @param {Array} config.columns
   * @param {function|string} [config.rowKey]
   * @param {function} config.fetchData
   * @param {function} [config.onRowAction]
   */
  function createListPage(config) {
    if (!config || !config.container) {
      throw new Error('createListPage 需要 container');
    }

    var ownerTabId = getOwnerTabId(config.ownerTabId);
    var stateKey = config.stateKey || config.title || 'list';
    var saved = getSessionListState(stateKey, ownerTabId) || {};
    var state = {
      page: saved.page || 1,
      pageSize: saved.pageSize || 10,
      sortField: saved.sortField || null,
      sortOrder: saved.sortOrder || null,
      filters: Object.assign({}, saved.filters || {}),
      searchVisible: saved.searchVisible !== false,
      advancedOpen: !!saved.advancedOpen,
      visibleColumns: saved.visibleColumns || null,
      loading: false,
      error: null,
      total: 0,
      rows: []
    };

    var columns = (config.columns || []).slice();
    if (!state.visibleColumns) {
      state.visibleColumns = columns.filter(function (c) { return c.hidden !== true; }).map(function (c) {
        return c.key || c.dataIndex;
      });
    }

    var fetchSeq = 0;
    var destroyed = false;

    var container = config.container;
    container.innerHTML = '';
    container.classList.add('rondo-list-page');

    var root = document.createElement('div');
    root.className = 'rondo-list-page-inner';

    if (config.title) {
      var header = document.createElement('div');
      header.className = 'rondo-list-page-header';
      header.innerHTML = '<h2 class="rondo-list-page-title">' + escapeHtml(config.title) + '</h2>';
      root.appendChild(header);
    }

    var searchPanel = document.createElement('div');
    searchPanel.className = 'rondo-list-search-panel';
    if (!state.searchVisible) searchPanel.hidden = true;

    var searchForm = document.createElement('div');
    searchForm.className = 'rondo-search-form';
    if (state.advancedOpen) searchForm.classList.add('is-advanced-open');
    var fieldEls = {};
    var hasAdvancedFields = false;

    (config.searchFields || []).forEach(function (field) {
      var wrap = document.createElement('div');
      wrap.className = 'rondo-search-form-field';
      if (field.advanced) {
        wrap.classList.add('is-advanced');
        hasAdvancedFields = true;
      }
      var fieldId = 'rondo-search-' + stateKey + '-' + field.name;
      var label = document.createElement('label');
      label.className = 'rondo-search-form-label';
      label.setAttribute('for', fieldId);
      label.textContent = field.label;
      var control = document.createElement('div');
      control.className = 'rondo-search-form-control';
      var input;
      if (field.type === 'select') {
        input = document.createElement('select');
        input.className = 'rondo-select ant-select-native';
        (field.options || []).forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = field.type || 'text';
        input.className = 'rondo-input ant-input';
        if (field.placeholder) input.placeholder = field.placeholder;
      }
      input.id = fieldId;
      input.name = field.name;
      if (state.filters[field.name] != null) input.value = state.filters[field.name];
      fieldEls[field.name] = input;
      control.appendChild(input);
      wrap.appendChild(label);
      wrap.appendChild(control);
      searchForm.appendChild(wrap);
    });

    if (hasAdvancedFields) {
      var advancedToggle = document.createElement('button');
      advancedToggle.type = 'button';
      advancedToggle.className = 'rondo-search-advanced-toggle';
      advancedToggle.setAttribute('aria-expanded', state.advancedOpen ? 'true' : 'false');
      advancedToggle.innerHTML =
        '<i class="fas fa-chevron-right rc-advanced-chevron" aria-hidden="true"></i>高级筛选';
      advancedToggle.addEventListener('click', function () {
        state.advancedOpen = !state.advancedOpen;
        searchForm.classList.toggle('is-advanced-open', state.advancedOpen);
        advancedToggle.setAttribute('aria-expanded', state.advancedOpen ? 'true' : 'false');
        persistState();
      });
      searchForm.appendChild(advancedToggle);
    }

    var searchActions = document.createElement('div');
    searchActions.className = 'rondo-search-form-actions';
    searchActions.innerHTML =
      '<button type="button" class="rondo-btn rondo-btn-primary" data-search="submit">查询</button>' +
      '<button type="button" class="rondo-btn rondo-btn-default" data-search="reset">重置</button>';
    searchForm.appendChild(searchActions);
    searchPanel.appendChild(searchForm);
    root.appendChild(searchPanel);

    var toolbar = document.createElement('div');
    toolbar.className = 'rondo-list-toolbar';

    var toolbarPrimary = document.createElement('div');
    toolbarPrimary.className = 'rondo-list-toolbar-primary';
    (config.toolbarActions || []).forEach(function (action) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rondo-btn ' + (action.variant === 'primary' ? 'rondo-btn-primary' : 'rondo-btn-default');
      btn.textContent = action.label;
      btn.addEventListener('click', function () {
        if (typeof action.onClick === 'function') action.onClick(api);
      });
      toolbarPrimary.appendChild(btn);
    });

    var tableTools = document.createElement('div');
    tableTools.className = 'rondo-list-toolbar-table-tools';

    var tools = config.tableTools || {};
    var toolSearch = tools.searchToggle !== false;
    var toolRefresh = tools.refresh !== false;
    var toolColumns = tools.columnConfig !== false;
    var toolFullscreen = tools.fullscreen !== false;

    if (toolSearch) {
      var toggleSearchBtn = toolButton('切换搜索区', 'fas fa-search');
      toggleSearchBtn.addEventListener('click', function () {
        state.searchVisible = !state.searchVisible;
        searchPanel.hidden = !state.searchVisible;
        persistState();
      });
      tableTools.appendChild(toggleSearchBtn);
    }

    if (toolRefresh) {
      var refreshBtn = toolButton('刷新', 'fas fa-rotate-right');
      refreshBtn.addEventListener('click', function () { loadData(); });
      tableTools.appendChild(refreshBtn);
    }

    var columnConfigWrap = document.createElement('div');
    columnConfigWrap.className = 'rondo-table-tool-group';
    if (toolColumns) {
      var colBtn = toolButton('列配置', 'fas fa-table-columns');
      var colPanel = document.createElement('div');
      colPanel.className = 'rondo-column-config-panel';
      colPanel.hidden = true;
      colBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        renderColumnPanel();
        colPanel.hidden = !colPanel.hidden;
      });
      columnConfigWrap.appendChild(colBtn);
      columnConfigWrap.appendChild(colPanel);
      tableTools.appendChild(columnConfigWrap);
    }

    var tableWrap = document.createElement('div');
    tableWrap.className = 'rondo-basic-table-wrap';

    var fsBtn = null;
    if (toolFullscreen) {
      fsBtn = toolButton('全屏', 'fas fa-expand');
      fsBtn.addEventListener('click', function () {
        var isFs = tableWrap.classList.toggle('is-fullscreen');
        var icon = fsBtn.querySelector('i');
        if (icon) icon.className = isFs ? 'fas fa-compress' : 'fas fa-expand';
        fsBtn.setAttribute('aria-label', isFs ? '退出全屏' : '全屏');
        fsBtn.title = isFs ? '退出全屏' : '全屏';
        var hidden = fsBtn.querySelector('.rondo-visually-hidden');
        if (hidden) hidden.textContent = isFs ? '退出全屏' : '全屏';
      });
    }

    toolbar.appendChild(toolbarPrimary);
    toolbar.appendChild(tableTools);
    root.appendChild(toolbar);

    var tableCard = document.createElement('div');
    tableCard.className = 'rondo-basic-table-card';

    if (toolFullscreen && fsBtn) {
      var tableCardTools = document.createElement('div');
      tableCardTools.className = 'rondo-basic-table-card-tools';
      tableCardTools.appendChild(fsBtn);
      tableCard.appendChild(tableCardTools);
    }

    var scroll = document.createElement('div');
    scroll.className = 'rondo-basic-table-scroll';

    var table = document.createElement('table');
    table.className = 'rondo-basic-table rondo-table-sm ant-table';

    var thead = document.createElement('thead');
    var tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    scroll.appendChild(table);
    tableCard.appendChild(scroll);

    var footer = document.createElement('div');
    footer.className = 'rondo-basic-table-footer';
    tableCard.appendChild(footer);
    tableWrap.appendChild(tableCard);
    root.appendChild(tableWrap);
    container.appendChild(root);

    function persistState() {
      var existing = getSessionListState(stateKey, ownerTabId) || {};
      saveSessionListState(stateKey, Object.assign({}, existing, {
        page: state.page,
        pageSize: state.pageSize,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        filters: state.filters,
        searchVisible: state.searchVisible,
        advancedOpen: state.advancedOpen,
        visibleColumns: state.visibleColumns
      }), ownerTabId);
    }

    function readFiltersFromForm() {
      Object.keys(fieldEls).forEach(function (name) {
        state.filters[name] = fieldEls[name].value;
      });
    }

    function visibleCols() {
      return columns.filter(function (c) {
        var key = c.key || c.dataIndex;
        return state.visibleColumns.indexOf(key) >= 0;
      });
    }

    function renderColumnPanel() {
      var panel = columnConfigWrap.querySelector('.rondo-column-config-panel');
      if (!panel) return;
      panel.innerHTML = columns.map(function (c) {
        var key = c.key || c.dataIndex;
        var checked = state.visibleColumns.indexOf(key) >= 0;
        return '<label class="rondo-column-config-item">' +
          '<input type="checkbox" class="rondo-checkbox" data-col-key="' + escapeHtml(key) + '"' +
          (checked ? ' checked' : '') + (c.required ? ' disabled' : '') + ' />' +
          escapeHtml(c.title || key) + '</label>';
      }).join('');
      panel.querySelectorAll('[data-col-key]').forEach(function (input) {
        input.addEventListener('change', function () {
          var key = input.getAttribute('data-col-key');
          if (input.checked) {
            if (state.visibleColumns.indexOf(key) < 0) state.visibleColumns.push(key);
          } else {
            state.visibleColumns = state.visibleColumns.filter(function (k) { return k !== key; });
          }
          persistState();
          renderTable();
        });
      });
    }

    function renderTableHead() {
      var cols = visibleCols();
      var tr = document.createElement('tr');
      cols.forEach(function (col) {
        var th = document.createElement('th');
        th.textContent = col.title || col.dataIndex || '';
        if (col.width) th.style.width = col.width;
        if (isFixedRightColumn(col)) {
          th.classList.add('rondo-col-fixed-right', 'col-actions');
        }
        if (col.sortable) {
          th.classList.add('is-sortable');
          th.setAttribute('role', 'button');
          th.setAttribute('tabindex', '0');
          th.addEventListener('click', function () {
            var field = col.dataIndex || col.key;
            if (state.sortField === field) {
              state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
              state.sortField = field;
              state.sortOrder = 'asc';
            }
            state.page = 1;
            persistState();
            loadData();
          });
          if (state.sortField === (col.dataIndex || col.key)) {
            th.textContent += state.sortOrder === 'desc' ? ' ↓' : ' ↑';
          }
        }
        tr.appendChild(th);
      });
      thead.innerHTML = '';
      thead.appendChild(tr);
    }

    function renderTableBody() {
      tbody.innerHTML = '';
      if (state.error) {
        var errTr = document.createElement('tr');
        var errTd = document.createElement('td');
        errTd.colSpan = visibleCols().length || 1;
        errTd.className = 'rondo-basic-table-error';
        errTd.innerHTML =
          '<p class="rondo-basic-table-error-text">' + escapeHtml(state.error) + '</p>' +
          '<button type="button" class="rondo-btn rondo-btn-default rondo-btn-sm" data-table-retry>重试</button>';
        errTr.appendChild(errTd);
        tbody.appendChild(errTr);
        var retryBtn = errTd.querySelector('[data-table-retry]');
        if (retryBtn) retryBtn.addEventListener('click', function () { loadData(); });
        return;
      }
      if (!state.rows.length) {
        var emptyTr = document.createElement('tr');
        var emptyTd = document.createElement('td');
        emptyTd.colSpan = visibleCols().length || 1;
        emptyTd.className = 'rondo-basic-table-empty';
        emptyTd.textContent = state.loading ? '加载中…' : '暂无数据';
        emptyTr.appendChild(emptyTd);
        tbody.appendChild(emptyTr);
        return;
      }
      state.rows.forEach(function (row, index) {
        var tr = document.createElement('tr');
        var rk = typeof config.rowKey === 'function'
          ? config.rowKey(row, index)
          : (config.rowKey ? row[config.rowKey] : defaultRowKey(row, index));
        tr.setAttribute('data-row-key', rk);
        visibleCols().forEach(function (col) {
          var td = document.createElement('td');
          if (col.ellipsis) td.className = 'rondo-cell-ellipsis';
          if (isFixedRightColumn(col)) td.classList.add('rondo-col-fixed-right', 'col-actions');
          var html = renderCell(col, row, index);
          if (col.action) {
            td.innerHTML = html;
            td.querySelectorAll('[data-row-action]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                if (typeof config.onRowAction === 'function') {
                  config.onRowAction(btn.getAttribute('data-row-action'), row, index, api);
                }
              });
            });
          } else {
            td.innerHTML = html;
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    function renderPagination() {
      var totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
      footer.innerHTML =
        '<div class="rondo-pagination-info">共 ' + state.total + ' 条</div>' +
        '<div class="rondo-pagination ant-pagination">' +
        '<button type="button" class="rondo-pagination-prev ant-pagination-prev"' +
        (state.page <= 1 ? ' disabled' : '') + ' aria-label="上一页">上一页</button>' +
        '<span class="rondo-pagination-item is-active ant-pagination-item-active" aria-current="page">' +
        state.page + '</span>' +
        '<span class="rondo-pagination-total">/ ' + totalPages + '</span>' +
        '<button type="button" class="rondo-pagination-next ant-pagination-next"' +
        (state.page >= totalPages ? ' disabled' : '') + ' aria-label="下一页">下一页</button>' +
        '</div>' +
        '<div class="rondo-pagination-size">' +
        '<label for="rondo-page-size-' + escapeHtml(stateKey) + '">每页</label>' +
        '<select id="rondo-page-size-' + escapeHtml(stateKey) + '" class="rondo-select ant-select-native" aria-label="每页条数">' +
        [10, 20, 50].map(function (n) {
          return '<option value="' + n + '"' + (state.pageSize === n ? ' selected' : '') + '>' + n + '</option>';
        }).join('') +
        '</select> 条</div>';

      var prev = footer.querySelector('.rondo-pagination-prev');
      var next = footer.querySelector('.rondo-pagination-next');
      var sizeSelect = footer.querySelector('select');
      if (prev) prev.addEventListener('click', function () {
        if (state.page > 1) { state.page--; persistState(); loadData(); }
      });
      if (next) next.addEventListener('click', function () {
        if (state.page < totalPages) { state.page++; persistState(); loadData(); }
      });
      if (sizeSelect) sizeSelect.addEventListener('change', function () {
        state.pageSize = Number(sizeSelect.value) || 10;
        state.page = 1;
        persistState();
        loadData();
      });
    }

    function renderTable() {
      renderTableHead();
      renderTableBody();
      renderPagination();
    }

    function loadData() {
      if (typeof config.fetchData !== 'function' || destroyed) return;
      fetchSeq += 1;
      var seq = fetchSeq;
      state.loading = true;
      state.error = null;
      renderTableBody();
      var query = {
        page: state.page,
        pageSize: state.pageSize,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        filters: Object.assign({}, state.filters)
      };
      Promise.resolve(config.fetchData(query)).then(function (result) {
        if (destroyed || seq !== fetchSeq) return;
        result = result || {};
        state.rows = result.rows || result.list || [];
        state.total = result.total != null ? result.total : state.rows.length;
        state.loading = false;
        state.error = null;
        renderTable();
      }).catch(function (err) {
        if (destroyed || seq !== fetchSeq) return;
        state.loading = false;
        state.rows = [];
        state.total = 0;
        state.error = (err && err.message) || '加载失败';
        renderTable();
        toast(state.error, 'error');
      });
    }

    searchActions.querySelector('[data-search="submit"]').addEventListener('click', function () {
      readFiltersFromForm();
      state.page = 1;
      persistState();
      loadData();
    });
    searchActions.querySelector('[data-search="reset"]').addEventListener('click', function () {
      Object.keys(fieldEls).forEach(function (name) {
        fieldEls[name].value = '';
        state.filters[name] = '';
      });
      state.page = 1;
      persistState();
      loadData();
    });

    function onDocClick(e) {
      var panel = columnConfigWrap.querySelector('.rondo-column-config-panel');
      if (panel && !panel.hidden && !columnConfigWrap.contains(e.target)) {
        panel.hidden = true;
      }
    }
    document.addEventListener('click', onDocClick);

    var api = {
      reload: loadData,
      getState: function () { return state; },
      getOwnerTabId: function () { return ownerTabId; },
      setFilters: function (filters) {
        state.filters = Object.assign({}, state.filters, filters);
        Object.keys(fieldEls).forEach(function (name) {
          if (state.filters[name] != null) fieldEls[name].value = state.filters[name];
        });
        persistState();
      },
      setPage: function (page) {
        state.page = page;
        persistState();
        loadData();
      },
      setVisibleColumns: function (keys) {
        state.visibleColumns = (keys || []).slice();
        persistState();
        renderTable();
      },
      toggleSearchPanel: function (visible) {
        state.searchVisible = visible !== false;
        searchPanel.hidden = !state.searchVisible;
        persistState();
      },
      destroy: function () {
        destroyed = true;
        fetchSeq += 1;
        document.removeEventListener('click', onDocClick);
      }
    };

    loadData();
    return api;
  }

  global.PetAdminBasicTable = {
    createListPage: createListPage,
    getSessionListState: getSessionListState,
    saveSessionListState: saveSessionListState
  };
})(window);
