function initPublishedReports() {
  var C = window.PetAdminCommon;
  var store = C.store();
  var route = C.parseRoute();
  var highlightId = route.params.reportId || null;
  var detailReportId = highlightId;

  var unsub = C.subscribeDemo(function () { render(store.getState()); });
  window.__petAdminPageTeardown = function () { unsub(); };

  document.getElementById('search-published').addEventListener('input', function () {
    render(store.getState());
  });
  document.getElementById('filter-status').addEventListener('change', function () {
    render(store.getState());
  });

  document.getElementById('btn-close-detail').onclick = function () {
    document.getElementById('detail-drawer').classList.add('hidden');
    detailReportId = null;
  };

  render(store.getState());

  function actorLabel() {
    return '运营专员';
  }

  function formatSnapshotSummary(snap) {
    if (!snap) return '—';
    var a = snap.assessment || {};
    var parts = [];
    if (a.healthLevel) parts.push('等级 ' + a.healthLevel);
    if (a.healthScore != null) parts.push('分 ' + a.healthScore);
    if (a.summary) parts.push(a.summary.slice(0, 60) + (a.summary.length > 60 ? '…' : ''));
    if (snap.indicators) parts.push(snap.indicators.length + ' 项指标');
    if (snap.frozenAt) parts.push('冻结 ' + C.formatDate(snap.frozenAt));
    return parts.join(' · ') || '无快照摘要';
  }

  function showDetail(state, reportId) {
    detailReportId = reportId;
    var report = C.lookupReport(state, reportId);
    if (!report) return;
    var user = C.lookupUser(state, report.userId);
    var pet = C.lookupPet(state, report.petId);
    var tr = C.lookupTestRecord(state, report.testRecordId);
    var batch = tr && tr.importBatchId ? state.importBatches.find(function (b) { return b.id === tr.importBatchId; }) : null;
    var pubVer = C.getPublishedReportVersion(state, report.id);
    var workVer = C.getWorkingReportVersion(state, report.id);
    var drawer = document.getElementById('detail-drawer');
    drawer.classList.remove('hidden');
    document.getElementById('detail-title').textContent = report.reportNumber;
    document.getElementById('detail-subtitle').innerHTML =
      C.statusBadge(report.status, C.REPORT_STATUS_LABELS) +
      ' · 工作版 v' + (report.workingVersion || '—') +
      ' · 用户可见发布版 v' + (report.publishedVersion != null ? report.publishedVersion : '—');

    var ops = (state.operationRecords || []).filter(function (op) { return op.reportId === report.id; })
      .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });

    var html = '';

    if (report.status === 'voided') {
      html += '<div class="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">' +
        '<i class="fas fa-eye-slash mr-1"></i>用户不可见（已作废）' +
        (report.voidReason ? '：' + C.escapeHtml(report.voidReason) : '') + '</div>';
    }

    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="border rounded p-3 bg-emerald-50/40">' +
      '<h4 class="font-medium text-emerald-900 mb-2">当前用户可见发布版</h4>' +
      (pubVer
        ? '<p>v' + pubVer.version + ' · ' + C.escapeHtml(pubVer.healthLevel || '—') + ' · 分 ' + (pubVer.healthScore != null ? pubVer.healthScore : '—') + '</p>' +
          '<p class="text-slate-600 mt-1">' + C.escapeHtml(pubVer.summary || '') + '</p>' +
          (pubVer.publishedAt ? '<p class="text-xs text-slate-400 mt-1">发布于 ' + C.formatDate(pubVer.publishedAt) + '</p>' : '')
        : '<p class="text-slate-500">无发布版本</p>') +
      '</div>' +
      '<div class="border rounded p-3 bg-indigo-50/40">' +
      '<h4 class="font-medium text-indigo-900 mb-2">后台工作版</h4>' +
      (workVer
        ? '<p>v' + workVer.version + ' · ' + (C.REPORT_STATUS_LABELS[workVer.status] || workVer.status) +
          (report.correctionDraftActive ? ' · <span class="text-indigo-700">更正草稿</span>' : '') + '</p>' +
          '<p class="text-slate-600 mt-1">' + C.escapeHtml(workVer.summary || '') + '</p>' +
          (workVer.correctionReviewStatus ? '<p class="text-xs mt-1">更正审核: ' + C.escapeHtml(workVer.correctionReviewStatus) + '</p>' : '')
        : '<p class="text-slate-500">—</p>') +
      '</div></div>';

    html += '<div><h4 class="font-medium mt-2 mb-2">归属与来源</h4>' +
      '<p class="text-slate-600">' + C.escapeHtml(user ? user.name : '—') + ' / ' + C.escapeHtml(pet ? pet.name : '—') + '</p>' +
      (tr ? '<p class="text-xs text-slate-500 mt-1">检测 ' + C.escapeHtml(tr.id) + ' · ' + C.escapeHtml(tr.externalReportNumber || '') + ' / ' + C.escapeHtml(tr.sampleNumber || '') + '</p>' : '') +
      (batch ? '<p class="text-xs text-slate-500">Excel 批次: ' + C.escapeHtml(batch.fileName) + '（保留不删除）</p>' : '') +
      '</div>';

    html += '<div><h4 class="font-medium mb-2">版本时间线</h4><div class="space-y-2">';
    report.versions.slice().sort(function (a, b) { return b.version - a.version; }).forEach(function (v) {
      var isPub = v.version === report.publishedVersion;
      html += '<div class="border-l-4 ' + (isPub ? 'border-emerald-500' : 'border-slate-200') + ' pl-3 py-2">' +
        '<div class="flex flex-wrap gap-2 items-center">' +
        '<span class="font-medium">v' + v.version + '</span> ' +
        C.statusBadge(v.status, C.REPORT_STATUS_LABELS) +
        (isPub ? ' <span class="text-xs text-emerald-700">用户当前可见</span>' : '') +
        '</div>' +
        '<p class="text-slate-600 mt-1 text-xs">' + C.escapeHtml(v.summary || '') + '</p>';
      if (v.contentSnapshot) {
        html += '<p class="text-xs text-indigo-700 mt-1"><i class="fas fa-camera mr-1"></i>快照: ' + C.escapeHtml(formatSnapshotSummary(v.contentSnapshot)) + '</p>';
      }
      if (v.correctionNote) html += '<p class="text-xs text-indigo-600">' + C.escapeHtml(v.correctionNote) + '</p>';
      if (v.publishedAt) html += '<p class="text-xs text-slate-400">发布于 ' + C.formatDate(v.publishedAt) + '</p>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div><h4 class="font-medium mb-2">操作记录</h4>';
    if (ops.length) {
      html += '<ul class="space-y-1 text-xs text-slate-600">';
      ops.forEach(function (op) {
        html += '<li class="border-b border-slate-50 py-1">' +
          C.formatDate(op.createdAt) + ' · <code>' + C.escapeHtml(op.type) + '</code>' +
          (op.reason ? ' — ' + C.escapeHtml(op.reason) : '') +
          (op.actor ? ' <span class="text-slate-400">(' + C.escapeHtml(op.actor) + ')</span>' : '') +
          '</li>';
      });
      html += '</ul>';
    } else {
      html += '<p class="text-slate-500 text-xs">暂无操作记录</p>';
    }
    html += '</div>';

    document.getElementById('detail-content').innerHTML = html;

    var actions = document.getElementById('detail-actions');
    actions.innerHTML = '';
    if (report.status !== 'voided') {
      if (report.correctionDraftActive) {
        var btnReview = document.createElement('button');
        btnReview.type = 'button';
        btnReview.className = 'btn-primary px-4 py-2 rounded-md text-sm';
        btnReview.innerHTML = '<i class="fas fa-pen-to-square mr-1"></i>进入更正审核';
        btnReview.onclick = function () { C.navigate('report-review', { reportId: report.id }); };
        actions.appendChild(btnReview);
      } else if (report.status === 'published' || report.status === 'corrected') {
        var btnDraft = document.createElement('button');
        btnDraft.type = 'button';
        btnDraft.className = 'btn-primary px-4 py-2 rounded-md text-sm';
        btnDraft.innerHTML = '<i class="fas fa-file-pen mr-1"></i>创建更正草稿';
        btnDraft.onclick = function () {
          C.promptDialog('更正原因', '请填写创建更正草稿的原因', function (reason) {
            C.createCorrectionDraftExtended(report.id, { summary: reason, correctionNote: reason });
            C.toast('更正草稿已创建，用户仍可见旧发布版', 'success');
            C.navigate('report-review', { reportId: report.id });
          });
        };
        actions.appendChild(btnDraft);
      }
      var btnVoid = document.createElement('button');
      btnVoid.type = 'button';
      btnVoid.className = 'px-4 py-2 rounded-md text-sm border border-red-300 text-red-700 hover:bg-red-50';
      btnVoid.innerHTML = '<i class="fas fa-ban mr-1"></i>作废报告';
      btnVoid.onclick = function () {
        C.promptDialog('作废原因', '作废后用户立即不可见，数据保留', function (reason) {
          store.voidReport(report.id, reason);
          C.toast('报告已作废', 'warning');
          render(store.getState());
        });
      };
      actions.appendChild(btnVoid);
    } else {
      var voidNote = document.createElement('p');
      voidNote.className = 'text-sm text-slate-500';
      voidNote.textContent = '已作废报告不可创建更正草稿。';
      actions.appendChild(voidNote);
    }
  }

  function render(state) {
    var q = (document.getElementById('search-published').value || '').trim().toLowerCase();
    var statusFilter = document.getElementById('filter-status').value;
    var rows = state.reports.filter(function (r) {
      return r.status === 'published' || r.status === 'corrected' || r.status === 'voided';
    }).filter(function (r) {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      var pet = C.lookupPet(state, r.petId);
      var hay = (r.reportNumber || '').toLowerCase() + ' ' + (pet ? pet.name.toLowerCase() : '');
      return hay.indexOf(q) >= 0;
    }).sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });

    document.getElementById('published-tbody').innerHTML = rows.map(function (r) {
      var user = C.lookupUser(state, r.userId);
      var pet = C.lookupPet(state, r.petId);
      var draftLabel = r.correctionDraftActive
        ? '<span class="text-indigo-700 text-xs">草稿 v' + r.workingVersion + '</span>'
        : '<span class="text-slate-400 text-xs">—</span>';
      return '<tr class="hover:bg-slate-50' + (r.id === highlightId ? ' bg-teal-50' : '') + '">' +
        '<td class="px-3 py-2">' + C.escapeHtml(r.reportNumber) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml((user ? user.name : '—') + ' / ' + (pet ? pet.name : '—')) + '</td>' +
        '<td class="px-3 py-2">' + C.statusBadge(r.status, C.REPORT_STATUS_LABELS) + '</td>' +
        '<td class="px-3 py-2">v' + (r.publishedVersion != null ? r.publishedVersion : '—') + '</td>' +
        '<td class="px-3 py-2">' + draftLabel + '</td>' +
        '<td class="px-3 py-2">' + C.formatDate(r.updatedAt) + '</td>' +
        '<td class="px-3 py-2"><button type="button" class="text-teal-600 hover:underline btn-view" data-id="' + r.id + '">查看</button></td></tr>';
    }).join('') || '<tr><td colspan="7" class="px-3 py-8 text-center text-slate-500">暂无匹配报告</td></tr>';

    document.querySelectorAll('.btn-view').forEach(function (btn) {
      btn.onclick = function () { showDetail(state, btn.dataset.id); };
    });

    if (detailReportId && C.lookupReport(state, detailReportId)) {
      showDetail(state, detailReportId);
    } else if (highlightId && C.lookupReport(state, highlightId)) {
      showDetail(state, highlightId);
    }
  }
}
