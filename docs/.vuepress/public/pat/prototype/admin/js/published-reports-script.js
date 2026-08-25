function initPublishedReports() {
  var C = window.PetAdminCommon;
  var store = C.store();
  var route = C.parseRoute();
  var highlightId = route.params.reportId || null;

  var unsub = store.subscribe(function () { render(store.getState()); });
  window.__petAdminPageTeardown = function () { unsub(); };

  document.getElementById('search-published').addEventListener('input', function () {
    render(store.getState());
  });

  document.getElementById('btn-close-detail').onclick = function () {
    document.getElementById('detail-drawer').classList.add('hidden');
  };

  render(store.getState());

  function showDetail(state, reportId) {
    var report = C.lookupReport(state, reportId);
    if (!report) return;
    var user = C.lookupUser(state, report.userId);
    var pet = C.lookupPet(state, report.petId);
    var drawer = document.getElementById('detail-drawer');
    drawer.classList.remove('hidden');
    document.getElementById('detail-title').textContent = report.reportNumber;

    var indicators = C.getCurrentIndicators(state, report.testRecordId);
    var findings = state.findings.filter(function (f) { return f.reportId === report.id; });
    var recs = state.recommendations.filter(function (r) { return r.reportId === report.id; });

    var html = '<p class="text-slate-600">' + C.escapeHtml(user ? user.name : '') + ' / ' + C.escapeHtml(pet ? pet.name : '') + '</p>' +
      '<p>状态: ' + C.statusBadge(report.status, C.REPORT_STATUS_LABELS) + ' · 版本 v' + report.currentVersion + '</p>' +
      '<h4 class="font-medium mt-3">版本时间线</h4><div class="space-y-2">' +
      report.versions.map(function (v) {
        return '<div class="border-l border-teal-500 pl-3 py-1">' +
          '<span class="font-medium">v' + v.version + '</span> ' + (C.REPORT_STATUS_LABELS[v.status] || v.status) +
          '<p class="text-slate-600 mt-0.5">' + C.escapeHtml(v.summary || '') + '</p>' +
          (v.correctionNote ? '<p class="text-indigo-600 text-xs">' + C.escapeHtml(v.correctionNote) + '</p>' : '') +
          (v.publishedAt ? '<p class="text-xs text-slate-400">发布于 ' + C.formatDate(v.publishedAt) + '</p>' : '') +
          '</div>';
      }).join('') + '</div>' +
      '<h4 class="font-medium mt-3">当前指标</h4><ul class="list-disc pl-5">' +
      indicators.map(function (i) {
        return '<li>' + C.escapeHtml(i.key) + ': ' + (i.value != null ? i.value : '—') + ' (' + i.dataStatus + ') v' + i.version + '</li>';
      }).join('') + '</ul>' +
      '<h4 class="font-medium mt-3">发现与推荐</h4>' +
      findings.map(function (f) {
        var rec = recs.find(function (r) { return r.findingId === f.id; });
        return '<div class="border rounded p-2 mb-2"><p>' + C.escapeHtml(f.description) + '</p>' +
          (rec ? '<p class="text-teal-700 text-xs mt-1">推荐: ' + rec.resolvedType + ' — ' + C.escapeHtml(rec.label) + '</p>' : '') + '</div>';
      }).join('');

    if (C.isDataReviser() && report.status === 'published') {
      html += '<button type="button" id="btn-open-revise" class="btn-primary mt-4 px-4 py-2 rounded-md text-sm">数据修订员：更正指标</button>';
    }

    document.getElementById('detail-content').innerHTML = html;

    var reviseBtn = document.getElementById('btn-open-revise');
    if (reviseBtn) {
      reviseBtn.onclick = function () {
        C.navigate('report-review', { reportId: report.id });
        C.setRole('reviser');
        C.toast('已切换数据修订员并打开审核页', 'info');
      };
    }
  }

  function render(state) {
    var q = (document.getElementById('search-published').value || '').trim().toLowerCase();
    var rows = state.reports.filter(function (r) {
      return r.status === 'published' || r.status === 'corrected';
    }).filter(function (r) {
      if (!q) return true;
      return (r.reportNumber || '').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });

    document.getElementById('published-tbody').innerHTML = rows.map(function (r) {
      var user = C.lookupUser(state, r.userId);
      var pet = C.lookupPet(state, r.petId);
      return '<tr class="hover:bg-slate-50' + (r.id === highlightId ? ' bg-teal-50' : '') + '">' +
        '<td class="px-3 py-2">' + C.escapeHtml(r.reportNumber) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml((user ? user.name : '—') + ' / ' + (pet ? pet.name : '—')) + '</td>' +
        '<td class="px-3 py-2">' + C.statusBadge(r.status, C.REPORT_STATUS_LABELS) + '</td>' +
        '<td class="px-3 py-2">v' + r.currentVersion + '</td>' +
        '<td class="px-3 py-2">' + C.formatDate(r.updatedAt) + '</td>' +
        '<td class="px-3 py-2"><button type="button" class="text-teal-600 hover:underline btn-view" data-id="' + r.id + '">查看</button></td></tr>';
    }).join('') || '<tr><td colspan="6" class="px-3 py-8 text-center text-slate-500">暂无已发布报告</td></tr>';

    document.querySelectorAll('.btn-view').forEach(function (btn) {
      btn.onclick = function () { showDetail(state, btn.dataset.id); };
    });

    if (highlightId) showDetail(state, highlightId);
  }
}
