function initReportReview() {
  var C = window.PetAdminCommon;
  var HEALTH_LEVEL_THEMES = { A: '雨林', B: '森林', C: '草原', D: '苔藓', E: '沙漠' };
  var store = C.store();
  var ds = window.dictionaryDataService;
  var route = C.parseRoute();
  var currentReportId = route.params.reportId || 'report-002';
  var formInteracting = false;
  var lastChecks = { blockers: [], warnings: [] };

  var unsub = C.subscribeDemo(function () {
    if (!formInteracting) render(store.getState());
    else renderChecksOnly(store.getState());
  });
  window.__petAdminPageTeardown = function () { unsub(); };

  document.getElementById('select-report').addEventListener('change', function () {
    formInteracting = false;
    currentReportId = this.value;
    C.navigate('report-review', { reportId: currentReportId });
    render(store.getState());
  });

  document.getElementById('btn-save-assessment').onclick = function () {
    saveAssessmentFromForm();
  };

  document.getElementById('btn-save-analysis').onclick = function () {
    saveAnalysisFromForm();
  };

  render(store.getState());

  function actorLabel() {
    return '审核员';
  }

  function collectAssessmentFromForm() {
    var el = function (id) { return document.getElementById(id); };
    var emotion = el('assess-emotion') ? el('assess-emotion').value : '';
    var immunity = el('assess-immunity') ? el('assess-immunity').value : '';
    return {
      reportSpecies: el('assess-species') ? el('assess-species').value : '',
      healthLevel: el('assess-level') ? el('assess-level').value : '',
      healthScore: el('assess-score') ? el('assess-score').value : '',
      percentile: el('assess-percentile') ? el('assess-percentile').value : '',
      summary: el('assess-summary') ? el('assess-summary').value : '',
      platformDimensions: {
        emotion: emotion === '' ? null : Number(emotion),
        immunity: immunity === '' ? null : Number(immunity)
      }
    };
  }

  function saveAssessmentFromForm() {
    if (!currentReportId) return false;
    var data = collectAssessmentFromForm();
    var errors = C.validateAssessmentInput(data);
    if (errors.length) {
      C.toast(errors.join('；'), 'warning');
      return false;
    }
    C.saveReportAssessment(currentReportId, {
      reportSpecies: data.reportSpecies,
      healthLevel: data.healthLevel || null,
      healthScore: data.healthScore === '' ? null : Number(data.healthScore),
      percentile: data.percentile === '' ? null : Number(data.percentile),
      summary: data.summary,
      platformDimensions: data.platformDimensions
    }, actorLabel());
    formInteracting = false;
    C.toast('综合评定已保存', 'success');
    render(store.getState());
    return true;
  }

  function saveAnalysisFromForm() {
    if (!currentReportId) return;
    var pro = document.getElementById('analysis-professional');
    var con = document.getElementById('analysis-consumer');
    var adv = document.getElementById('analysis-advice');
    if (!pro) return;
    try {
      C.saveAnalysisFinalContent(currentReportId, {
        professional: pro.value,
        consumer: con.value,
        healthAdvice: adv.value
      }, actorLabel());
      formInteracting = false;
      C.toast('规则分析最终内容已保存', 'success');
      render(store.getState());
    } catch (e) {
      C.toast(e.message || '保存失败', 'error');
    }
  }

  function runWithChecks(actionLabel, callback) {
    var checks = C.buildPublicationChecks(store.getState(), currentReportId);
    lastChecks = checks;
    if (checks.blockers.length) {
      C.toast('存在阻断项，无法' + actionLabel, 'error');
      renderChecksPanel(checks);
      return;
    }
    if (checks.warnings.length) {
      var warnText = '仍有 ' + checks.warnings.length + ' 项警告，确认继续' + actionLabel + '？\n' +
        checks.warnings.slice(0, 5).map(function (w) { return '· ' + w.message; }).join('\n') +
        (checks.warnings.length > 5 ? '\n…等' + checks.warnings.length + ' 项' : '');
      C.confirmDialog(warnText, callback);
      return;
    }
    callback();
  }

  function bindActionBar(state, report) {
    var bar = document.getElementById('action-bar');
    bar.innerHTML = '';
    if (!report) return;

    function addBtn(id, label, cls, icon, handler, hidden) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = id;
      btn.className = (cls || 'btn-secondary') + ' px-3 py-1.5 rounded-md text-sm';
      btn.innerHTML = '<i class="fas ' + icon + ' mr-1"></i>' + label;
      btn.onclick = handler;
      if (hidden) btn.classList.add('hidden');
      bar.appendChild(btn);
    }

    var isCorrection = report.correctionDraftActive;
    var workVer = C.getWorkingReportVersion(state, report.id);

    if (!isCorrection) {
      if (report.status === 'draft' || report.status === 'rejected') {
        addBtn('btn-submit', report.status === 'rejected' ? '重新提交审核' : '提交审核', 'btn-primary', 'fa-paper-plane', function () {
          if (!saveAssessmentFromForm()) return;
          store.submitReport(report.id);
          C.toast('已提交审核', 'success');
          render(store.getState());
        });
      }
      addBtn('btn-reject', '退回完善', 'border border-red-300 text-red-700 hover:bg-red-50', 'fa-undo', function () {
        C.promptDialog('退回原因', '请填写退回原因（必填）', function (reason) {
          saveAssessmentFromForm();
          C.rejectReportToIncomplete(report.id, reason, actorLabel());
          C.toast('已退回待完善', 'warning');
          formInteracting = false;
          render(store.getState());
        });
      }, report.status === 'published');
      addBtn('btn-approve', '审核通过', 'btn-primary', 'fa-check', function () {
        if (!saveAssessmentFromForm()) return;
        runWithChecks('批准', function () {
          store.approveReport(report.id);
          C.toast('报告已批准，可发布', 'success');
          formInteracting = false;
          render(store.getState());
        });
      }, report.status === 'approved' || report.status === 'published');
      addBtn('btn-publish', '发布', 'btn-primary', 'fa-share-from-square', function () {
        if (!saveAssessmentFromForm()) return;
        runWithChecks('发布', function () {
          store.publishReport(report.id, { actor: actorLabel() });
          C.toast('报告已发布', 'success');
          formInteracting = false;
          render(store.getState());
        });
      }, report.status !== 'approved');
    } else {
      addBtn('btn-reject-correction', '退回更正', 'border border-red-300 text-red-700 hover:bg-red-50', 'fa-undo', function () {
        C.promptDialog('退回更正原因', '请填写原因', function (reason) {
          saveAssessmentFromForm();
          C.reviewCorrectionDraft(report.id, 'rejected', reason, actorLabel());
          C.toast('更正草稿已退回', 'warning');
          formInteracting = false;
          render(store.getState());
        });
      });
      addBtn('btn-approve-correction', '审核通过更正', 'btn-primary', 'fa-check', function () {
        if (!saveAssessmentFromForm()) return;
        runWithChecks('通过更正', function () {
          C.reviewCorrectionDraft(report.id, 'approved', null, actorLabel());
          C.toast('更正草稿已审核通过，可发布', 'success');
          formInteracting = false;
          render(store.getState());
        });
      }, workVer && workVer.correctionReviewStatus === 'approved');
      addBtn('btn-publish-correction', '发布更正', 'btn-primary', 'fa-share-from-square', function () {
        if (!workVer || workVer.correctionReviewStatus !== 'approved') {
          C.toast('请先审核通过更正草稿', 'warning');
          return;
        }
        if (!saveAssessmentFromForm()) return;
        runWithChecks('发布更正', function () {
          store.publishCorrection(report.id, { actor: actorLabel() });
          C.toast('更正已发布，用户可见版本已替换', 'success');
          formInteracting = false;
          render(store.getState());
        });
      }, !workVer || workVer.correctionReviewStatus !== 'approved');
    }
  }

  function renderChecksOnly(state) {
    lastChecks = C.buildPublicationChecks(state, currentReportId);
    renderChecksPanel(lastChecks);
  }

  function renderChecksPanel(checks) {
    var panel = document.getElementById('checks-panel');
    if (!panel) return;
    var html = '';
    if (!checks.blockers.length && !checks.warnings.length) {
      html = '<p class="text-emerald-700"><i class="fas fa-circle-check mr-1"></i>检查通过，无阻断或警告</p>';
    } else {
      if (checks.blockers.length) {
        html += '<div class="mb-2"><p class="text-xs font-medium text-red-700 mb-1">阻断（' + checks.blockers.length + '）</p><ul class="space-y-1">';
        checks.blockers.forEach(function (b) {
          html += '<li class="text-red-800 bg-red-50 rounded px-2 py-1 text-xs"><i class="fas fa-ban mr-1"></i>' + C.escapeHtml(b.message) + '</li>';
        });
        html += '</ul></div>';
      }
      if (checks.warnings.length) {
        html += '<div><p class="text-xs font-medium text-amber-700 mb-1">警告（' + checks.warnings.length + '，确认后可继续）</p><ul class="space-y-1">';
        checks.warnings.forEach(function (w) {
          html += '<li class="text-amber-900 bg-amber-50 rounded px-2 py-1 text-xs"><i class="fas fa-triangle-exclamation mr-1"></i>' + C.escapeHtml(w.message) + '</li>';
        });
        html += '</ul></div>';
      }
    }
    panel.innerHTML = html;
  }

  function render(state) {
    var queue = state.reports.filter(C.isReportInReviewQueue);
    var select = document.getElementById('select-report');
    select.innerHTML = queue.map(function (r) {
      var tag = r.correctionDraftActive ? ' [更正草稿]' : '';
      return '<option value="' + r.id + '">' + C.escapeHtml(r.reportNumber) + tag + ' (' + (C.REPORT_STATUS_LABELS[r.status] || r.status) + ')</option>';
    }).join('') || '<option value="">无待审核报告</option>';

    if (currentReportId && queue.some(function (r) { return r.id === currentReportId; })) {
      select.value = currentReportId;
    } else if (queue.some(function (r) { return r.id === 'report-002'; })) {
      currentReportId = 'report-002';
      select.value = currentReportId;
    } else if (queue.length) {
      currentReportId = queue[0].id;
      select.value = currentReportId;
    }

    var report = currentReportId ? C.lookupReport(state, currentReportId) : null;
    if (!report) {
      document.getElementById('source-panel').innerHTML = '<p class="text-slate-500">请选择待审核报告。</p>';
      document.getElementById('action-bar').innerHTML = '';
      return;
    }

    var workVer = C.getWorkingReportVersion(state, report.id);
    var pubVer = C.getPublishedReportVersion(state, report.id);

    document.getElementById('report-status-badge').innerHTML = C.statusBadge(report.status, C.REPORT_STATUS_LABELS) +
      (report.correctionDraftActive ? ' <span class="text-xs text-indigo-600 ml-1">更正草稿</span>' : '');
    document.getElementById('version-badges').innerHTML =
      '工作版 v' + (report.workingVersion || '—') +
      ' · 发布版 v' + (report.publishedVersion != null ? report.publishedVersion : '—');

    var corrBanner = document.getElementById('correction-banner');
    if (report.correctionDraftActive) {
      corrBanner.classList.remove('hidden');
      document.getElementById('correction-pub-ver').textContent = report.publishedVersion != null ? report.publishedVersion : '—';
    } else {
      corrBanner.classList.add('hidden');
    }

    bindActionBar(state, report);

    var tr = C.lookupTestRecord(state, report.testRecordId);
    var user = C.lookupUser(state, report.userId);
    var pet = C.lookupPet(state, report.petId);
    var st = tr ? C.lookupStore(state, tr.storeId) : null;
    var batch = tr && tr.importBatchId ? state.importBatches.find(function (b) { return b.id === tr.importBatchId; }) : null;
    var species = C.getReportSpeciesForChecks(state, report);

    document.getElementById('source-panel').innerHTML =
      '<p><span class="text-slate-500">报告号</span><br>' + C.escapeHtml(report.reportNumber) + '</p>' +
      '<p><span class="text-slate-500">检测记录</span><br><code class="text-xs">' + C.escapeHtml(report.testRecordId) + '</code></p>' +
      '<p><span class="text-slate-500">来源</span><br>' + C.escapeHtml(tr ? (tr.externalReportNumber || '—') + ' / ' + (tr.sampleNumber || '—') : '—') + '</p>' +
      '<p><span class="text-slate-500">用户</span><br>' + C.escapeHtml(user ? user.name : '—（未领取不阻断）') + '</p>' +
      '<p><span class="text-slate-500">宠物</span><br>' + C.escapeHtml(pet ? pet.name + ' / ' + pet.breed : '—') + '</p>' +
      '<p><span class="text-slate-500">机构</span><br>' + C.escapeHtml(st ? st.name : '—') + '</p>' +
      '<p><span class="text-slate-500">归属</span><br>' + C.escapeHtml(C.OWNERSHIP_STATUS_LABELS[report.ownershipStatus] || report.ownershipStatus || '—') + '</p>' +
      (batch ? '<p><span class="text-slate-500">导入批次</span><br>' + C.escapeHtml(batch.fileName) + '</p>' : '');

    var dims = (workVer && workVer.platformDimensions) || {};
    document.getElementById('assessment-form').innerHTML =
      '<div><label class="text-xs text-slate-500">报告物种</label>' +
      '<select id="assess-species" class="w-full border rounded px-2 py-1 mt-0.5">' +
      '<option value="cat"' + (species === 'cat' ? ' selected' : '') + '>猫</option>' +
      '<option value="dog"' + (species === 'dog' ? ' selected' : '') + '>狗</option></select></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-500">综合等级 A–E</label>' +
      '<select id="assess-level" class="w-full border rounded px-2 py-1 mt-0.5">' +
      '<option value="">—</option>' + C.HEALTH_LEVELS.map(function (lv) {
        return '<option value="' + lv + '"' + (workVer && workVer.healthLevel === lv ? ' selected' : '') + '>' + lv + ' ' + (HEALTH_LEVEL_THEMES[lv] || '') + '</option>';
      }).join('') + '</select></div>' +
      '<div><label class="text-xs text-slate-500">综合分 0–100</label>' +
      '<input id="assess-score" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5" value="' +
      (workVer && workVer.healthScore != null ? workVer.healthScore : '') + '"></div></div>' +
      '<div><label class="text-xs text-slate-500">人工百分位</label>' +
      '<input id="assess-percentile" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5" value="' +
      (workVer && workVer.percentile != null ? workVer.percentile : '') + '"></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-xs text-slate-500">平台维度·情绪</label>' +
      '<input id="assess-emotion" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5" value="' +
      (dims.emotion != null ? dims.emotion : '') + '"></div>' +
      '<div><label class="text-xs text-slate-500">平台维度·免疫</label>' +
      '<input id="assess-immunity" type="number" min="0" max="100" class="w-full border rounded px-2 py-1 mt-0.5" value="' +
      (dims.immunity != null ? dims.immunity : '') + '"></div></div>' +
      '<div><label class="text-xs text-slate-500">综合摘要</label>' +
      '<textarea id="assess-summary" rows="3" class="w-full border rounded px-2 py-1 mt-0.5">' +
      C.escapeHtml(workVer && workVer.summary ? workVer.summary : '') + '</textarea></div>';

    ['assess-species', 'assess-level', 'assess-score', 'assess-percentile', 'assess-emotion', 'assess-immunity', 'assess-summary'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('focus', function () { formInteracting = true; });
        el.addEventListener('input', function () {
          formInteracting = true;
          renderChecksOnly(state);
        });
      }
    });

    var indicators = C.getCurrentIndicators(state, report.testRecordId);
    document.getElementById('indicators-panel').innerHTML = indicators.map(function (ind) {
      var status = store.normalizeDataStatus ? store.normalizeDataStatus(ind.dataStatus) : ind.dataStatus;
      var valid = C.isValidResultIndicator(ind);
      var evalResult = ds && ds.evaluateIndicatorResult ? ds.evaluateIndicatorResult(ind, species) : null;
      var rangeText = evalResult && evalResult.range
        ? evalResult.range.min + '–' + evalResult.range.max + (evalResult.range.unit || ind.unit || '')
        : '无参考范围';
      var valDisplay = ind.value != null && ind.value !== '' ? ind.value + (ind.unit || '') : '—';
      return '<div class="border border-slate-100 rounded p-2 ' + (valid ? 'bg-emerald-50/50' : '') + '">' +
        '<div class="flex justify-between"><span class="font-medium">' + C.escapeHtml(ind.key) + '</span>' +
        '<span class="text-xs">' + C.statusBadge(status, C.DATA_STATUS_LABELS) + (valid ? ' <span class="text-emerald-700">有效</span>' : '') + '</span></div>' +
        '<p class="text-slate-600 text-xs mt-1">值: ' + C.escapeHtml(valDisplay) + ' · 范围: ' + C.escapeHtml(rangeText) + '</p>' +
        (evalResult && evalResult.message ? '<p class="text-xs text-slate-500">' + C.escapeHtml(evalResult.message) + '</p>' : '') +
        '</div>';
    }).join('') || '<p class="text-slate-500">无指标</p>';

    var run = C.getLatestAnalysisRun(state, report.id);
    var analysisPanel = document.getElementById('analysis-panel');
    var saveAnalysisBtn = document.getElementById('btn-save-analysis');
    if (!run) {
      analysisPanel.innerHTML = '<p class="text-slate-500">尚未运行规则分析。请在「分析规则」页执行分析。</p>';
      saveAnalysisBtn.classList.add('hidden');
    } else {
      saveAnalysisBtn.classList.remove('hidden');
      var combined = run.combinedResult || {};
      var final = (run.adjustments && run.adjustments.finalContent) || {};
      var hitsHtml = (run.rawHits || []).map(function (h) {
        return '<li class="text-xs text-slate-600">' + C.escapeHtml(h.ruleName || h.ruleId || '规则') + ' · ' + C.escapeHtml((h.output && h.output.consumer) || '') + '</li>';
      }).join('') || '<li class="text-xs text-slate-400">无原始命中</li>';
      analysisPanel.innerHTML =
        '<p class="text-xs text-slate-500">运行 ' + C.escapeHtml(run.id) + ' · ' + C.formatDate(run.createdAt) + '</p>' +
        '<div class="bg-slate-50 rounded p-2"><p class="text-xs font-medium text-slate-600 mb-1">组合结果（只读）</p>' +
        '<p class="text-xs"><strong>专业</strong> ' + C.escapeHtml(combined.professional || '—') + '</p>' +
        '<p class="text-xs mt-1"><strong>通俗</strong> ' + C.escapeHtml(combined.consumer || '—') + '</p>' +
        '<p class="text-xs mt-1"><strong>建议</strong> ' + C.escapeHtml(combined.healthAdvice || '—') + '</p></div>' +
        '<div><p class="text-xs font-medium text-slate-600 mb-1">原始命中（只读）</p><ul class="list-disc pl-4">' + hitsHtml + '</ul></div>' +
        '<div class="space-y-2"><p class="text-xs font-medium text-slate-600">人工最终内容（可微调）</p>' +
        '<label class="text-xs text-slate-500">专业</label><textarea id="analysis-professional" rows="2" class="w-full border rounded px-2 py-1 text-xs">' + C.escapeHtml(final.professional || '') + '</textarea>' +
        '<label class="text-xs text-slate-500">通俗</label><textarea id="analysis-consumer" rows="2" class="w-full border rounded px-2 py-1 text-xs">' + C.escapeHtml(final.consumer || '') + '</textarea>' +
        '<label class="text-xs text-slate-500">健康建议</label><textarea id="analysis-advice" rows="2" class="w-full border rounded px-2 py-1 text-xs">' + C.escapeHtml(final.healthAdvice || '') + '</textarea></div>';
      ['analysis-professional', 'analysis-consumer', 'analysis-advice'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.addEventListener('focus', function () { formInteracting = true; });
          el.addEventListener('input', function () {
            formInteracting = true;
            renderChecksOnly(state);
          });
        }
      });
    }

    var recs = state.recommendations.filter(function (r) { return r.reportId === report.id; });
    document.getElementById('recommendations-panel').innerHTML = recs.length ? recs.map(function (rec) {
      var availCls = rec.availability === 'AVAILABLE' ? 'text-emerald-700' : 'text-amber-700';
      var tags = (rec.healthTagIds || []).join(', ') || '—';
      return '<div class="border rounded p-2">' +
        '<p class="font-medium text-xs">' + C.escapeHtml(rec.label || rec.id) + '</p>' +
        '<p class="text-xs text-slate-500 mt-1">主推: ' + C.escapeHtml(rec.primaryProductId || rec.productId || '—') + ' · 标签: ' + C.escapeHtml(tags) + '</p>' +
        '<p class="text-xs mt-1">解析: <strong>' + C.escapeHtml(rec.resolvedType) + '</strong> · <span class="' + availCls + '">' + C.escapeHtml(rec.availability || '—') + '</span></p>' +
        '</div>';
    }).join('') : '<p class="text-slate-500">无推荐配置</p>';

    lastChecks = C.buildPublicationChecks(state, report.id);
    renderChecksPanel(lastChecks);
  }
}
