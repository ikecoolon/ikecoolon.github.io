function initDashboard() {
  var C = window.PetAdminCommon;
  var store = C.store();
  var unsub = store.subscribe(render);
  window.__petAdminPageTeardown = function () { unsub(); };

  document.getElementById('btn-reset-demo').onclick = function () {
    C.confirmDialog('确定重置为种子演示数据？所有本地 Mock 状态将恢复初始值。', function () {
      store.reset();
      C.toast('演示数据已重置', 'success');
    });
  };

  render(store.getState());

  function render(state) {
    var disclaimer = document.getElementById('dashboard-disclaimer');
    if (disclaimer) disclaimer.textContent = state.meta.disclaimer;

    var pendingImport = state.testRecords.filter(function (t) {
      return t.status === 'pending_result' || t.status === 'pending_claim';
    }).length;
    var importErrors = state.testRecords.filter(function (t) { return t.status === 'import_failed'; }).length;
    var pendingReview = state.reports.filter(function (r) {
      return r.status === 'pending_review' || r.status === 'draft';
    }).length;
    var published = state.reports.filter(function (r) {
      return r.status === 'published' || r.status === 'corrected';
    }).length;

    var cards = [
      { label: '待导入/待结果', count: pendingImport, icon: 'fa-upload', color: 'text-blue-600', page: 'detection-records', filter: 'pending_result' },
      { label: '导入异常', count: importErrors, icon: 'fa-triangle-exclamation', color: 'text-red-600', page: 'detection-records', filter: 'import_failed' },
      { label: '待审核', count: pendingReview, icon: 'fa-clipboard-check', color: 'text-amber-600', page: 'report-review' },
      { label: '已发布', count: published, icon: 'fa-file-medical', color: 'text-emerald-600', page: 'published-reports' }
    ];

    document.getElementById('stat-cards').innerHTML = cards.map(function (c) {
      return '<button type="button" class="stat-card bg-white rounded-lg border border-slate-200 p-4 text-left hover:border-teal-400 transition-colors" data-page="' + c.page + '" data-filter="' + (c.filter || '') + '">' +
        '<div class="flex items-center justify-between">' +
        '<span class="text-sm text-slate-500">' + C.escapeHtml(c.label) + '</span>' +
        '<i class="fas ' + c.icon + ' ' + c.color + '"></i></div>' +
        '<p class="text-3xl font-bold text-slate-800 mt-2">' + c.count + '</p></button>';
    }).join('');

    document.querySelectorAll('.stat-card').forEach(function (btn) {
      btn.onclick = function () {
        var page = btn.dataset.page;
        var filter = btn.dataset.filter;
        if (filter) {
          sessionStorage.setItem('pet-admin-detection-filter', filter);
        }
        C.navigate(page);
      };
    });

    var todos = [];
    state.testRecords.forEach(function (tr) {
      if (tr.status === 'pending_result') {
        todos.push({ text: '检测 ' + tr.id + ' 待导入结果', action: function () { sessionStorage.setItem('pet-admin-excel-tr', tr.id); C.navigate('excel-import'); } });
      }
      if (tr.status === 'import_failed') {
        todos.push({ text: '检测 ' + tr.id + ' 导入异常需处理', action: function () { C.navigate('detection-records'); } });
      }
    });
    state.reports.forEach(function (r) {
      if (r.status === 'pending_review') {
        todos.push({ text: '报告 ' + r.reportNumber + ' 待审核', action: function () { C.navigate('report-review', { reportId: r.id }); } });
      }
      if (r.status === 'draft') {
        todos.push({ text: '报告草稿 ' + r.reportNumber, action: function () { C.navigate('report-review', { reportId: r.id }); } });
      }
    });

    var todoEl = document.getElementById('todo-list');
    if (!todos.length) {
      todoEl.innerHTML = '<p class="text-slate-500">暂无待办</p>';
    } else {
      todoEl.innerHTML = todos.slice(0, 8).map(function (t, i) {
        return '<button type="button" class="todo-item w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200" data-idx="' + i + '">' +
          '<i class="fas fa-chevron-right text-teal-600 mr-2 text-xs"></i>' + C.escapeHtml(t.text) + '</button>';
      }).join('');
      todoEl.querySelectorAll('.todo-item').forEach(function (btn) {
        btn.onclick = function () { todos[parseInt(btn.dataset.idx, 10)].action(); };
      });
    }

    var activities = [];
    state.importBatches.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 5).forEach(function (b) {
      activities.push({ at: b.createdAt, text: '导入批次 ' + b.fileName + ' — ' + b.status });
    });
    state.reports.slice().sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); }).slice(0, 5).forEach(function (r) {
      activities.push({ at: r.updatedAt, text: '报告 ' + r.reportNumber + ' → ' + (C.REPORT_STATUS_LABELS[r.status] || r.status) });
    });
    activities.sort(function (a, b) { return b.at.localeCompare(a.at); });

    document.getElementById('recent-activity').innerHTML = activities.slice(0, 10).map(function (a) {
      return '<div class="flex gap-2 py-1.5 border-b border-slate-100 last:border-0">' +
        '<span class="text-slate-400 shrink-0">' + C.formatDate(a.at) + '</span>' +
        '<span class="text-slate-700">' + C.escapeHtml(a.text) + '</span></div>';
    }).join('') || '<p class="text-slate-500">暂无动态</p>';

    var links = [
      { label: '检测记录', page: 'detection-records' },
      { label: 'Excel 导入', page: 'excel-import' },
      { label: '审核 report-002', page: 'report-review', params: { reportId: 'report-002' } },
      { label: '已发布与更正', page: 'published-reports' }
    ];
    document.getElementById('quick-links').innerHTML = links.map(function (l) {
      return '<button type="button" class="quick-link btn-primary px-3 py-2 rounded-md text-sm" data-page="' + l.page + '" data-params="' + C.escapeHtml(JSON.stringify(l.params || {})) + '">' + C.escapeHtml(l.label) + '</button>';
    }).join('');
    document.querySelectorAll('.quick-link').forEach(function (btn) {
      btn.onclick = function () {
        var params = JSON.parse(btn.dataset.params || '{}');
        C.navigate(btn.dataset.page, params);
      };
    });
  }
}
