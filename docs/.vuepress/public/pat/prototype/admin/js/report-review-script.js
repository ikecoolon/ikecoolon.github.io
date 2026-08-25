function initReportReview() {
  var C = window.PetAdminCommon;
  var store = C.store();
  var route = C.parseRoute();
  var currentReportId = route.params.reportId || null;

  var unsub = store.subscribe(function () { render(store.getState()); });
  window.__petAdminPageTeardown = function () { unsub(); };

  document.getElementById('btn-reject').onclick = function () {
    if (!currentReportId) return;
    C.promptDialog('驳回原因', '请填写驳回原因（必填）', function (reason) {
      store.rejectReport(currentReportId, reason);
      C.toast('报告已驳回', 'warning');
    });
  };

  document.getElementById('btn-approve').onclick = function () {
    if (!currentReportId) return;
    persistReviewEdits();
    store.approveReport(currentReportId);
    C.toast('报告已批准，可发布', 'success');
    render(store.getState());
  };

  document.getElementById('btn-publish').onclick = function () {
    if (!currentReportId) return;
    C.confirmDialog('确认发布？发布后用户可在小程序查看。', function () {
      persistReviewEdits();
      store.publishReport(currentReportId);
      C.toast('报告已发布', 'success');
      render(store.getState());
    });
  };

  document.getElementById('btn-save-draft').onclick = function () {
    if (!currentReportId) return;
    persistReviewEdits();
    C.toast('审核修改已保存到共享数据', 'success');
  };

  document.getElementById('select-report').addEventListener('change', function () {
    currentReportId = this.value;
    C.navigate('report-review', { reportId: currentReportId });
  });

  render(store.getState());

  function collectDraftFromForm() {
    var draft = { findings: {}, recommendations: {} };
    document.querySelectorAll('[data-finding-id]').forEach(function (el) {
      var fid = el.dataset.findingId;
      var field = el.dataset.field;
      if (!draft.findings[fid]) draft.findings[fid] = {};
      draft.findings[fid][field] = el.value;
    });
    document.querySelectorAll('[data-rec-id]').forEach(function (el) {
      var rid = el.dataset.recId;
      var field = el.dataset.field;
      if (!draft.recommendations[rid]) draft.recommendations[rid] = {};
      draft.recommendations[rid][field] = el.value;
    });
    return draft;
  }

  function persistReviewEdits() {
    var draft = collectDraftFromForm();
    var actor = C.isDataReviser() ? (store.DEMO_LABEL + ' 数据修订员') : (store.DEMO_LABEL + ' 审核员');
    Object.keys(draft.findings).forEach(function (fid) {
      if (fid.indexOf('syn-') === 0) return;
      var f = draft.findings[fid];
      store.updateFinding({
        findingId: fid,
        professional: f.professional,
        consumer: f.consumer,
        description: f.description || f.consumer,
        actor: actor
      });
    });
    Object.keys(draft.recommendations).forEach(function (rid) {
      if (rid.indexOf('syn-rec-') === 0) return;
      var r = draft.recommendations[rid];
      store.updateRecommendation({
        recommendationId: rid,
        label: r.label,
        actor: actor
      });
    });
  }

  function getFindingDisplayText(finding, draft, field) {
    if (draft && draft.findings && draft.findings[finding.id] && draft.findings[finding.id][field]) {
      return draft.findings[finding.id][field];
    }
    if (field === 'professional') return finding.professional || '';
    if (field === 'consumer') return finding.consumer || finding.description || '';
    return finding.description || '';
  }

  function applyDraft(finding, draft) {
    return getFindingDisplayText(finding, draft, 'consumer') || finding.description;
  }

  function buildDisplayContext(state, report, indicators) {
    var reportFindings = state.findings.filter(function (f) { return f.reportId === report.id; });
    var reportRecs = state.recommendations.filter(function (r) { return r.reportId === report.id; });
    if (reportFindings.length) {
      return { findings: reportFindings, recs: reportRecs, fromStore: true };
    }
    reportFindings = indicators.map(function (ind) {
      var rule = C.DEMO_ANALYSIS_RULES.find(function (r) { return r.indicatorKey === ind.key; });
      return {
        id: 'syn-' + ind.id,
        reportId: report.id,
        indicatorKey: ind.key,
        conclusion: C.canRecommend(ind.dataStatus) ? 'NORMAL' : '',
        dataStatus: ind.dataStatus,
        description: rule ? rule.consumer : (C.DATA_STATUS_LABELS[ind.dataStatus] || ind.dataStatus)
      };
    });
    reportRecs = indicators.filter(function (ind) { return C.canRecommend(ind.dataStatus); }).map(function (ind) {
      var resolved = store.resolveRecommendationTarget({
        targetType: 'PRODUCT',
        productId: 'prod-001',
        categoryId: 'cat-002'
      });
      return {
        id: 'syn-rec-' + ind.id,
        findingId: 'syn-' + ind.id,
        reportId: report.id,
        targetType: 'PRODUCT',
        resolvedType: resolved.resolvedType,
        label: resolved.label
      };
    });
    return { findings: reportFindings, recs: reportRecs, fromStore: false };
  }

  function render(state) {
    var reviserBanner = document.getElementById('reviser-banner');
    reviserBanner.classList.toggle('hidden', !C.isDataReviser());

    var pending = state.reports.filter(function (r) {
      return r.status === 'pending_review' || r.status === 'draft' || r.status === 'approved';
    });
    var select = document.getElementById('select-report');
    select.innerHTML = pending.map(function (r) {
      return '<option value="' + r.id + '">' + C.escapeHtml(r.reportNumber) + ' (' + (C.REPORT_STATUS_LABELS[r.status] || r.status) + ')</option>';
    }).join('') || '<option value="">无待审核报告</option>';

    if (!currentReportId && pending.length) currentReportId = pending[0].id;
    if (currentReportId) select.value = currentReportId;

    var report = currentReportId ? C.lookupReport(state, currentReportId) : null;
    if (!report) {
      document.getElementById('source-panel').innerHTML = '<p class="text-slate-500">请选择待审核报告，或从 Excel 导入生成草稿。</p>';
      return;
    }

    document.getElementById('report-status-badge').innerHTML = C.statusBadge(report.status, C.REPORT_STATUS_LABELS);

    var approveBtn = document.getElementById('btn-approve');
    var publishBtn = document.getElementById('btn-publish');
    var rejectBtn = document.getElementById('btn-reject');
    approveBtn.classList.toggle('hidden', report.status === 'approved' || report.status === 'published');
    publishBtn.classList.toggle('hidden', report.status !== 'approved');
    rejectBtn.disabled = report.status === 'published';

    var tr = state.testRecords.find(function (t) { return t.id === report.testRecordId; });
    var user = C.lookupUser(state, report.userId);
    var pet = C.lookupPet(state, report.petId);
    var st = tr ? C.lookupStore(state, tr.storeId) : null;
    var batch = tr && tr.importBatchId ? state.importBatches.find(function (b) { return b.id === tr.importBatchId; }) : null;

    document.getElementById('source-panel').innerHTML =
      '<p><span class="text-slate-500">报告号</span><br>' + C.escapeHtml(report.reportNumber) + '</p>' +
      '<p><span class="text-slate-500">检测记录</span><br><code class="text-xs">' + C.escapeHtml(report.testRecordId) + '</code></p>' +
      '<p><span class="text-slate-500">用户</span><br>' + C.escapeHtml(user ? user.name : '—') + '</p>' +
      '<p><span class="text-slate-500">宠物</span><br>' + C.escapeHtml(pet ? pet.name + ' / ' + pet.breed : '—') + '</p>' +
      '<p><span class="text-slate-500">机构</span><br>' + C.escapeHtml(st ? st.name : '—') + '</p>' +
      '<p><span class="text-slate-500">样本</span><br>' + (tr ? (tr.sampleType === 'feces' ? '粪便' : tr.sampleType) : '—') + '</p>' +
      (batch ? '<p><span class="text-slate-500">导入批次</span><br>' + C.escapeHtml(batch.fileName) + '</p>' : '');

    var indicators = C.getCurrentIndicators(state, report.testRecordId);
    var draft = C.getReviewDraft(report.id);

    document.getElementById('indicators-panel').innerHTML = indicators.map(function (ind) {
      var statusLabel = C.DATA_STATUS_LABELS[ind.dataStatus] || ind.dataStatus;
      var valDisplay = ind.value != null ? ind.value + (ind.unit || '') : '—';
      var reviserBlock = '';
      if (C.isDataReviser() && C.canRecommend(ind.dataStatus)) {
        reviserBlock = '<div class="mt-1 flex gap-1 items-center">' +
          '<input type="number" step="0.1" class="correct-input border rounded px-1 py-0.5 w-20 text-xs" data-ind-id="' + ind.id + '" placeholder="新值" />' +
          '<button type="button" class="btn-correct text-xs text-indigo-600 hover:underline" data-ind-id="' + ind.id + '">新建修订</button></div>';
      }
      return '<div class="border border-slate-100 rounded p-2">' +
        '<div class="flex justify-between"><span class="font-medium">' + C.escapeHtml(ind.key) + '</span>' +
        '<span class="text-xs">' + C.statusBadge(C.canRecommend(ind.dataStatus) ? 'published' : 'import_failed', C.DATA_STATUS_LABELS) + '</span></div>' +
        '<p class="text-slate-600">值: ' + C.escapeHtml(valDisplay) + ' <span class="text-slate-400">v' + ind.version + '</span></p>' +
        reviserBlock + '</div>';
    }).join('') || '<p class="text-slate-500">无指标</p>';

    document.querySelectorAll('.btn-correct').forEach(function (btn) {
      btn.onclick = function () {
        var indId = btn.dataset.indId;
        var input = document.querySelector('.correct-input[data-ind-id="' + indId + '"]');
        var newVal = parseFloat(input.value);
        if (isNaN(newVal)) {
          C.toast('请输入有效数值', 'warning');
          return;
        }
        C.promptDialog('更正说明', '实验室复核说明', function (note) {
          store.correctIndicator({ indicatorId: indId, value: newVal, correctionNote: note });
          C.toast('已新建指标修订与报告 v' + (report.currentVersion + 1), 'success');
        });
      };
    });

    var ver = report.versions[report.versions.length - 1];
    var ctx = buildDisplayContext(state, report, indicators);
    var reportFindings = ctx.findings;
    var reportRecs = ctx.recs;

    var previewHtml = '<div class="text-center mb-4">' +
      '<div class="inline-block w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-2xl font-bold mx-auto">' +
      (ver.healthLevel || '?') + '</div>' +
      '<p class="mt-2 font-semibold">健康评分 ' + (ver.healthScore != null ? ver.healthScore : '—') + '</p></div>' +
      '<p class="text-slate-700 mb-3">' + C.escapeHtml(ver.summary || '') + '</p>' +
      (!ctx.fromStore ? '<p class="text-xs text-slate-500 mb-2"><i class="fas fa-wand-magic-sparkles mr-1"></i>根据指标与规则引擎生成的预览（草稿尚未持久化发现项）</p>' : '');

    reportFindings.forEach(function (f) {
      var desc = applyDraft(f, draft);
      var rule = C.DEMO_ANALYSIS_RULES.find(function (r) { return r.indicatorKey === f.indicatorKey; });
      var risk = rule ? rule.riskLevel : 'medium';
      var riskCls = risk === 'high' ? 'text-red-800' : (risk === 'medium' ? 'text-amber-800' : 'text-slate-800');
      previewHtml += '<div class="mb-2 p-2 rounded ' + (risk === 'high' ? 'bg-red-50' : (risk === 'medium' ? 'bg-amber-50' : 'bg-slate-100')) + ' ' + riskCls + '">' +
        '<p class="font-medium text-xs">' + C.escapeHtml(f.indicatorKey) + ' · ' + C.escapeHtml(f.conclusion || '') + '</p>' +
        '<p class="mt-1">' + C.escapeHtml(desc) + '</p></div>';
    });

    reportRecs.forEach(function (rec) {
      var linkedFinding = reportFindings.find(function (f) { return f.id === rec.findingId; });
      if (!C.canRecommend(linkedFinding && linkedFinding.dataStatus)) {
        previewHtml += '<p class="text-xs text-slate-400 italic">发现 ' + C.escapeHtml(rec.findingId) + ' 数据无效，已抑制推荐</p>';
        return;
      }
      var finding = reportFindings.find(function (f) { return f.id === rec.findingId; });
      var rule = finding && C.DEMO_ANALYSIS_RULES.find(function (r) { return r.indicatorKey === finding.indicatorKey; });
      if (rule && rule.suppressProduct) {
        previewHtml += '<p class="text-xs text-amber-600"><i class="fas fa-shield-halved mr-1"></i>高风险建议优先，已抑制商品推荐</p>';
        return;
      }
      var typeLabel = rec.resolvedType === 'PRODUCT' ? '产品' : (rec.resolvedType === 'CATEGORY' ? '分类' : '无');
      previewHtml += '<div class="mt-2 p-2 bg-teal-50 rounded text-teal-800 text-xs">' +
        '<i class="fas fa-lightbulb mr-1"></i>[' + typeLabel + '] ' + C.escapeHtml(rec.label) + '</div>';
    });

    document.getElementById('mini-preview').innerHTML = previewHtml;

    document.getElementById('version-timeline').innerHTML = '<p class="font-medium text-slate-600 mb-1">版本时间线</p>' +
      report.versions.map(function (v) {
        return '<div class="py-1 pl-2 mb-1 border-slate-200 border-l">' +
          'v' + v.version + ' · ' + (C.REPORT_STATUS_LABELS[v.status] || v.status) +
          (v.publishedAt ? ' · ' + C.formatDate(v.publishedAt) : '') +
          (v.correctionNote ? '<br><span class="text-indigo-600">' + C.escapeHtml(v.correctionNote) + '</span>' : '') +
          (v.rejectReason ? '<br><span class="text-red-600">' + C.escapeHtml(v.rejectReason) + '</span>' : '') +
          '</div>';
      }).join('');

    document.getElementById('findings-editor').innerHTML = reportFindings.map(function (f) {
      var rule = C.DEMO_ANALYSIS_RULES.find(function (r) { return r.indicatorKey === f.indicatorKey; });
      var draftDesc = getFindingDisplayText(f, draft, 'description') || f.description;
      var draftPro = getFindingDisplayText(f, draft, 'professional') || (rule ? rule.professional : '');
      var draftCon = getFindingDisplayText(f, draft, 'consumer') || (rule ? rule.consumer : f.description);
      var rec = reportRecs.find(function (r) { return r.findingId === f.id; });
      var recHtml = '';
      if (rec) {
        var canRec = C.canRecommend(f.dataStatus);
        recHtml = '<div class="mt-2 pt-2 border-t border-slate-100">' +
          '<label class="text-xs text-slate-500">推荐映射</label>' +
          '<p class="text-xs mb-1">请求: ' + (rec.targetType || 'PRODUCT') + ' → 解析: <strong>' + rec.resolvedType + '</strong></p>' +
          (canRec ? '' : '<p class="text-xs text-red-600 mb-1"><i class="fas fa-ban mr-1"></i>数据状态 ' + f.dataStatus + ' 不可推荐</p>') +
          '<input type="text" class="w-full border rounded px-2 py-1 text-xs mt-1" data-rec-id="' + rec.id + '" data-field="label" value="' + C.escapeHtml(rec.label) + '" ' + (canRec ? '' : 'disabled') + ' /></div>';
      } else if (C.canRecommend(f.dataStatus)) {
        var demoResolved = store.resolveRecommendationTarget({ targetType: 'PRODUCT', productId: 'prod-002', categoryId: 'cat-001' });
        recHtml = '<div class="mt-2 pt-2 border-t border-slate-100">' +
          '<label class="text-xs text-slate-500">推荐映射（演示解析）</label>' +
          '<p class="text-xs mb-1">PRODUCT prod-002 → <strong>' + demoResolved.resolvedType + '</strong></p>' +
          '<p class="text-xs text-amber-700">' + C.escapeHtml(demoResolved.label) + '</p></div>';
      }
      return '<div class="border border-slate-200 rounded-md p-3">' +
        '<p class="font-medium text-sm">' + C.escapeHtml(f.indicatorKey) + ' <span class="text-xs text-slate-400">' + f.dataStatus + '</span></p>' +
        '<label class="text-xs text-slate-500 mt-2 block">专业描述</label>' +
        '<textarea class="w-full border rounded px-2 py-1 text-xs mt-0.5" rows="2" data-finding-id="' + f.id + '" data-field="professional">' + C.escapeHtml(draftPro) + '</textarea>' +
        '<label class="text-xs text-slate-500 mt-2 block">通俗描述</label>' +
        '<textarea class="w-full border rounded px-2 py-1 text-xs mt-0.5" rows="2" data-finding-id="' + f.id + '" data-field="consumer">' + C.escapeHtml(draftCon) + '</textarea>' +
        '<label class="text-xs text-slate-500 mt-2 block">发现说明</label>' +
        '<textarea class="w-full border rounded px-2 py-1 text-xs mt-0.5" rows="2" data-finding-id="' + f.id + '" data-field="description">' + C.escapeHtml(draftDesc) + '</textarea>' +
        recHtml + '</div>';
    }).join('') || '<p class="text-slate-500 text-sm">暂无结构化发现，批准后将使用规则引擎输出。</p>';
  }
}
