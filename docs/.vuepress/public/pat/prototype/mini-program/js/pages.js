/* global PetMiniHelpers */
(function (root) {
  'use strict';

  var H = PetMiniHelpers;

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function petSwitcher(selectedPetId) {
    var pets = H.getUserPets();
    if (!pets.length) {
      return '<div class="empty-hint"><i class="fas fa-paw"></i><p>暂无宠物，请先认领报告</p></div>';
    }
  var html = '<div class="pet-switcher" role="tablist" aria-label="切换宠物">';
    pets.forEach(function (pet) {
      var active = pet.id === selectedPetId ? ' active' : '';
      html += '<button type="button" class="pet-chip' + active + '" data-pet-id="' + esc(pet.id) + '" role="tab">' +
        '<i class="fas ' + H.petSpeciesIcon(pet) + '"></i>' +
        '<span>' + esc(H.stripDemo(pet.name)) + '</span>' +
        '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderHome() {
    var petId = H.getSelectedPetId();
    var pet = petId ? H.findPet(petId) : null;
    var latestReport = petId ? H.getLatestPublishedReport(petId) : null;
    var activeRecords = petId ? H.getActiveTestRecords(petId) : [];
    var version = latestReport ? H.getCurrentReportVersion(latestReport) : null;

    var html = '<div class="page-shell">';
    html += '<section class="hero-card">';
    html += '<div class="hero-text"><h2>宠物肠道健康</h2><p>线下检测 · 线上查看报告</p></div>';
    html += '<button type="button" class="btn-primary" data-nav="claim"><i class="fas fa-qrcode"></i>认领报告</button>';
    html += '</section>';

    html += petSwitcher(petId);

    if (pet) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>当前宠物</h3></div>';
      html += '<div class="info-row">';
      html += '<div class="pet-avatar"><i class="fas ' + H.petSpeciesIcon(pet) + '"></i></div>';
      html += '<div class="info-main">';
      html += '<div class="info-title">' + esc(H.stripDemo(pet.name)) + '</div>';
      html += '<div class="info-sub">' + esc(pet.breed) + ' · ' + H.genderLabel(pet.gender) + ' · ' + esc(String(pet.age)) + '岁</div>';
      var store = H.findStore(pet.storeId);
      if (store) html += '<div class="info-meta"><i class="fas fa-store"></i> ' + esc(H.stripDemo(store.name)) + '</div>';
      html += '</div></div></section>';
    }

    if (activeRecords.length) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>进行中检测</h3></div>';
      activeRecords.forEach(function (tr) {
        html += '<button type="button" class="list-card actionable" data-nav="progress" data-tr-id="' + esc(tr.id) + '">';
        html += '<div class="list-card-main">';
        html += '<div class="list-title">' + esc(H.formatDate(tr.testDate)) + ' 肠道检测</div>';
        html += '<div class="list-sub">' + esc(H.stripDemo(tr.label)) + '</div>';
        html += '</div>';
        html += '<span class="badge badge-warn">' + esc(H.testRecordStatusLabel(tr.status)) + '</span>';
        html += '<i class="fas fa-chevron-right list-chevron"></i>';
        html += '</button>';
      });
      html += '</section>';
    }

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>最新报告</h3>';
    if (latestReport) {
      html += '<button type="button" class="text-link" data-nav="history" data-report-id="' + esc(latestReport.id) + '">历史</button>';
    }
    html += '</div>';

    if (latestReport && version) {
      html += '<button type="button" class="report-summary-card actionable" data-nav="report" data-report-id="' + esc(latestReport.id) + '">';
      html += '<div class="report-grade grade-' + esc(version.healthLevel || 'C') + '">' + esc(version.healthLevel || '—') + '</div>';
      html += '<div class="report-summary-main">';
      html += '<div class="list-title">' + esc(H.stripDemo(latestReport.reportNumber)) + '</div>';
      html += '<div class="list-sub">' + esc(H.stripDemo(version.summary)) + '</div>';
      html += '<div class="report-meta">综合评分 ' + esc(String(version.healthScore != null ? version.healthScore : '—')) +
        ' · v' + esc(String(latestReport.currentVersion)) + ' · ' + esc(H.reportStatusLabel(latestReport.status)) + '</div>';
      html += '</div>';
      html += '<i class="fas fa-chevron-right list-chevron"></i>';
      html += '</button>';
    } else {
      html += '<div class="empty-inline">暂无已发布报告，完成检测并认领后可查看</div>';
    }
    html += '</section>';
    html += '</div>';
    return html;
  }

  function renderReports() {
    var petId = H.getSelectedPetId();
    var reports = petId ? H.getPetReports(petId) : [];
    var testRecords = petId ? H.getPetTestRecords(petId) : [];

    var html = '<div class="page-shell">';
    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>按宠物查看</h3></div>';
    html += petSwitcher(petId);
    html += '</section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>报告列表</h3></div>';

    if (!reports.length && !testRecords.length) {
      html += '<div class="empty-hint"><i class="fas fa-file-medical"></i><p>该宠物暂无报告记录</p></div>';
    }

    reports.forEach(function (report) {
      var ver = H.getCurrentReportVersion(report);
      var viewable = ['published', 'corrected', 'pending_review', 'approved', 'draft'].indexOf(report.status) >= 0;
      var tag = H.reportStatusLabel(report.status);
      var tr = H.findTestRecord(report.testRecordId);
      var testDate = tr ? tr.testDate : '—';

      if (viewable) {
        html += '<button type="button" class="list-card actionable" data-nav="report" data-report-id="' + esc(report.id) + '">';
      } else {
        html += '<div class="list-card">';
      }

      html += '<div class="list-card-main">';
      html += '<div class="list-title">' + esc(H.stripDemo(report.reportNumber)) + '</div>';
      html += '<div class="list-sub">检测日期 ' + esc(H.formatDate(testDate)) + ' · v' + esc(String(report.currentVersion)) + '</div>';
      if (ver && ver.correctionNote) {
        html += '<div class="list-note"><i class="fas fa-info-circle"></i> ' + esc(H.stripDemo(ver.correctionNote)) + '</div>';
      }
      html += '</div>';
      html += '<span class="badge ' + (report.status === 'corrected' ? 'badge-info' : report.status === 'rejected' ? 'badge-danger' : report.status === 'pending_review' ? 'badge-warn' : 'badge-muted') + '">' + esc(tag) + '</span>';
      if (viewable) html += '<i class="fas fa-chevron-right list-chevron"></i>';
      html += (viewable ? '</button>' : '</div>');
    });

    testRecords.filter(function (tr) {
      return !reports.some(function (r) { return r.testRecordId === tr.id; });
    }).forEach(function (tr) {
      html += '<button type="button" class="list-card actionable" data-nav="progress" data-tr-id="' + esc(tr.id) + '">';
      html += '<div class="list-card-main">';
      html += '<div class="list-title">' + esc(H.formatDate(tr.testDate)) + ' 检测记录</div>';
      html += '<div class="list-sub">' + esc(H.stripDemo(tr.label)) + '</div>';
      html += '</div>';
      html += '<span class="badge badge-warn">' + esc(H.testRecordStatusLabel(tr.status)) + '</span>';
      html += '<i class="fas fa-chevron-right list-chevron"></i>';
      html += '</button>';
    });

    html += '</section></div>';
    return html;
  }

  function renderProfile() {
    var user = H.getCurrentUser();
    var stats = H.countUserStats();
    var pets = H.getUserPets();

    var html = '<div class="page-shell">';
    html += '<section class="profile-header">';
    html += '<div class="profile-avatar"><i class="fas fa-user"></i></div>';
    html += '<div>';
    html += '<div class="profile-name">' + esc(H.stripDemo(user ? user.name : '用户')) + '</div>';
    html += '<div class="profile-phone">' + esc(user ? user.phone : '') + '</div>';
    html += '</div></section>';

    html += '<section class="stats-grid">';
    html += '<div class="stat-item"><div class="stat-num">' + stats.petCount + '</div><div class="stat-label">宠物</div></div>';
    html += '<div class="stat-item"><div class="stat-num">' + stats.reportCount + '</div><div class="stat-label">报告</div></div>';
    html += '<div class="stat-item"><div class="stat-num">' + stats.publishedCount + '</div><div class="stat-label">已发布</div></div>';
    html += '<div class="stat-item"><div class="stat-num">' + stats.inProgressCount + '</div><div class="stat-label">进行中</div></div>';
    html += '</section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>我的宠物</h3></div>';
    pets.forEach(function (pet) {
      html += '<div class="list-card">';
      html += '<div class="pet-avatar sm"><i class="fas ' + H.petSpeciesIcon(pet) + '"></i></div>';
      html += '<div class="list-card-main">';
      html += '<div class="list-title">' + esc(H.stripDemo(pet.name)) + '</div>';
      html += '<div class="list-sub">' + esc(pet.breed) + '</div>';
      html += '</div></div>';
    });
    html += '</section>';

    html += '<section class="section-block">';
    html += '<button type="button" class="btn-danger-outline" id="reset-demo-btn"><i class="fas fa-rotate-left"></i> 重置演示数据</button>';
    html += '<p class="hint-text">重置后将恢复种子数据，认领与本地修改将清除。</p>';
    html += '</section>';

    html += '<footer class="disclaimer">' + esc(H.stripDemo(H.getState().meta.disclaimer)) + '</footer>';
    html += '</div>';
    return html;
  }

  function renderClaim() {
    var user = H.getCurrentUser();
    var pets = H.getUserPets();
    var scenarios = H.getClaimDemoScenarios();

    var html = '<div class="page-shell">';
    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>门店预绑定</h3></div>';
    html += '<p class="hint-text">若门店已登记宠物信息，可选择已有宠物进行认领绑定。</p>';
    if (pets.length) {
      html += '<div class="field"><label>选择宠物（可选）</label>';
      html += '<select id="claim-pet-select" class="input">';
      html += '<option value="">创建新宠物（首次认领）</option>';
      pets.forEach(function (pet) {
        html += '<option value="' + esc(pet.id) + '">' + esc(H.stripDemo(pet.name)) + ' · ' + esc(pet.breed) + '</option>';
      });
      html += '</select></div>';
    }
    html += '</section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>认领码认领</h3></div>';
    html += '<div class="field"><label>手机号</label><input class="input" id="claim-phone" value="' + esc(user ? user.phone : '') + '" readonly /></div>';
    html += '<div class="field"><label>验证码</label><input class="input" id="claim-verify" placeholder="请输入验证码" inputmode="numeric" maxlength="6" /></div>';
    html += '<div class="field"><label>认领码</label><input class="input" id="claim-code" placeholder="请输入门店提供的认领码" /></div>';
    html += '<div id="claim-message" class="form-message" hidden></div>';
    html += '<button type="button" class="btn-primary" id="claim-submit-btn">确认认领</button>';
    html += '</section>';

    if (scenarios.length) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>演示快捷入口</h3></div>';
      scenarios.forEach(function (s, idx) {
        html += '<button type="button" class="demo-btn" data-demo-idx="' + idx + '">';
        html += '<div class="demo-btn-title">' + esc(s.label) + '</div>';
        html += '<div class="demo-btn-desc">' + esc(s.desc) + '</div>';
        html += '</button>';
      });
      html += '</section>';
    }

    html += '</div>';
    return { html: html, scenarios: scenarios };
  }

  function renderProgress(params) {
    var tr = H.findTestRecord(params.trId);
    if (!tr || tr.userId !== H.CURRENT_USER_ID) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到检测记录或无权查看</p></div></div>';
    }

    var pet = tr.petId ? H.findPet(tr.petId) : null;
    var store = H.findStore(tr.storeId);
    var steps = H.getProgressSteps(tr);
    var report = H.getState().reports.find(function (r) { return r.testRecordId === tr.id; });

    var html = '<div class="page-shell">';
    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>检测进度</h3></div>';
    if (pet) {
      html += '<div class="info-sub mb-2"><i class="fas ' + H.petSpeciesIcon(pet) + '"></i> ' + esc(H.stripDemo(pet.name)) + '</div>';
    }
    html += '<div class="info-sub">样本日期 ' + esc(H.formatDate(tr.testDate)) + '</div>';
    if (store) html += '<div class="info-sub"><i class="fas fa-store"></i> ' + esc(H.stripDemo(store.name)) + '</div>';
    html += '<div class="status-pill">' + esc(H.testRecordStatusLabel(tr.status)) + '</div>';
    html += '</section>';

    html += '<section class="section-block"><ol class="progress-timeline">';
    steps.forEach(function (step) {
      var cls = 'progress-step';
      if (step.done) cls += ' done';
      if (step.active) cls += ' active';
      if (step.failed) cls += ' failed';
      html += '<li class="' + cls + '">';
      html += '<div class="progress-dot"><i class="fas ' + (step.failed ? 'fa-circle-xmark' : step.done ? 'fa-check' : 'fa-circle') + '"></i></div>';
      html += '<div class="progress-content"><div class="progress-label">' + esc(step.label) + '</div>';
      html += '<div class="progress-desc">' + esc(step.desc) + '</div></div>';
      html += '</li>';
    });
    html += '</ol></section>';

    if (tr.status === 'import_failed') {
      html += '<section class="section-block alert-block"><i class="fas fa-triangle-exclamation"></i> 检测数据导入异常，请联系门店重新送检。</section>';
    }

    if (report && (report.status === 'published' || report.status === 'corrected')) {
      html += '<section class="section-block">';
      html += '<button type="button" class="btn-primary" data-nav="report" data-report-id="' + esc(report.id) + '">查看报告</button>';
      html += '</section>';
    } else if (report && report.status === 'pending_review') {
      html += '<section class="section-block">';
      html += '<button type="button" class="btn-primary" data-nav="report" data-report-id="' + esc(report.id) + '">预览报告（审核中）</button>';
      html += '<p class="hint-text" style="margin-top:8px;">报告正在审核，内容仅供预览。</p>';
      html += '</section>';
    }

    html += '</div>';
    return html;
  }

  function renderReport(params) {
    var report = H.findReport(params.reportId);
    if (!report || !H.canUserAccessReport(params.reportId)) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }

    var version = params.version
      ? H.getReportVersion(report, parseInt(params.version, 10))
      : H.getCurrentReportVersion(report);
    var verNum = version ? version.version : report.currentVersion;
    var pet = H.findPet(report.petId);
    var tr = H.findTestRecord(report.testRecordId);
    var findings = H.getReportFindings(report.id, verNum);
    var indicators = H.getReportIndicators(report.id, verNum);
    var recs = H.getReportRecommendations(report.id);

    var html = '<div class="page-shell">';
    if (report.status === 'pending_review') {
      html += '<section class="alert-block"><i class="fas fa-hourglass-half"></i> 报告审核中，当前内容为预览，正式发布前可能调整。</section>';
    }
    html += '<section class="section-block report-hero">';
    html += '<div class="report-grade lg grade-' + esc(version && version.healthLevel ? version.healthLevel : 'C') + '">' +
      esc(version && version.healthLevel ? version.healthLevel : '—') + '</div>';
    html += '<div>';
    html += '<h2 class="report-title">' + esc(H.stripDemo(report.reportNumber)) + '</h2>';
    html += '<div class="info-sub">v' + esc(String(verNum)) + ' · ' + esc(H.reportStatusLabel(report.status)) + '</div>';
    html += '</div></section>';

    html += '<section class="section-block"><div class="section-head"><h3>基本信息</h3></div>';
    html += '<dl class="detail-list">';
    html += '<div><dt>宠物</dt><dd>' + esc(pet ? H.stripDemo(pet.name) : '—') + '</dd></div>';
    html += '<div><dt>品种</dt><dd>' + esc(pet ? pet.breed : '—') + '</dd></div>';
    html += '<div><dt>检测日期</dt><dd>' + esc(tr ? H.formatDate(tr.testDate) : '—') + '</dd></div>';
    html += '<div><dt>综合评分</dt><dd>' + esc(version && version.healthScore != null ? String(version.healthScore) : '—') + '</dd></div>';
    html += '</dl></section>';

    html += '<section class="section-block"><div class="section-head"><h3>整体结论</h3></div>';
    html += '<p class="body-text">' + esc(version ? H.stripDemo(version.summary) : '暂无结论') + '</p>';
    if (version && version.correctionNote) {
      html += '<div class="note-box"><i class="fas fa-pen"></i> ' + esc(H.stripDemo(version.correctionNote)) + '</div>';
    }
    html += '</section>';

    html += '<section class="section-block"><div class="section-head"><h3>重点发现</h3></div>';
    if (!findings.length) {
      html += '<div class="empty-inline">暂无重点发现项</div>';
    }
    findings.forEach(function (f) {
      var invalid = H.isInvalidDataStatus(f.dataStatus);
      html += '<button type="button" class="finding-card actionable" data-nav="finding" data-finding-id="' + esc(f.id) + '">';
      html += '<div class="finding-card-main">';
      html += '<div class="list-title">' + esc(f.indicatorKey) + '</div>';
      html += '<div class="list-sub">' + esc(H.stripDemo(f.description)) + '</div>';
      html += '</div>';
      if (invalid) {
        html += '<span class="badge badge-invalid">本次无有效数据</span>';
      } else {
        html += '<span class="badge ' + H.conclusionClass(f.conclusion) + '">' + esc(H.conclusionLabel(f.conclusion)) + '</span>';
      }
      html += '<i class="fas fa-chevron-right list-chevron"></i></button>';
    });
    html += '</section>';

    html += '<section class="section-block"><div class="section-head"><h3>指标概览</h3>';
    html += '<button type="button" class="text-link" data-nav="metrics" data-report-id="' + esc(report.id) + '" data-version="' + esc(String(verNum)) + '">全部</button>';
    html += '</div>';
    indicators.slice(0, 4).forEach(function (ind) {
      var finding = findings.find(function (f) { return f.indicatorKey === ind.key; });
      var status = H.indicatorDisplayStatus(ind, finding);
      html += '<div class="metric-row">';
      html += '<div class="metric-name">' + esc(ind.key) + '</div>';
      html += '<div class="metric-value">' + esc(H.formatIndicatorValue(ind)) + '</div>';
      html += '<span class="badge ' + esc(status.className) + '">' + esc(status.text) + '</span>';
      html += '</div>';
    });
    html += '</section>';

    var validRecs = recs.filter(function (rec) {
      var finding = H.findFinding(rec.findingId);
      return !(finding && H.isInvalidDataStatus(finding.dataStatus));
    });
    html += '<section class="section-block"><div class="section-head"><h3>建议与推荐</h3>';
    if (validRecs.length) {
      html += '<button type="button" class="text-link" data-nav="recommendations" data-report-id="' + esc(report.id) + '">查看全部</button>';
    }
    html += '</div>';
    if (!validRecs.length) {
      html += '<div class="empty-inline">暂无推荐建议</div>';
    } else {
      validRecs.slice(0, 2).forEach(function (rec) {
        var display = H.resolveRecDisplay(rec);
        html += '<button type="button" class="list-card actionable" data-nav="recommendation-target" data-rec-id="' + esc(rec.id) + '">';
        html += '<div class="list-card-main"><div class="list-title">' + esc(display.label) + '</div>';
        html += '<div class="list-sub">类型：' + esc(display.resolvedType) + '</div></div>';
        html += '<i class="fas fa-chevron-right list-chevron"></i></button>';
      });
    }
    html += '</section>';

    html += '<section class="section-block">';
    html += '<button type="button" class="btn-secondary" data-nav="history" data-report-id="' + esc(report.id) + '"><i class="fas fa-clock-rotate-left"></i> 查看历史版本</button>';
    html += '</section>';

    html += '<footer class="disclaimer">' + esc(H.stripDemo(H.getState().meta.disclaimer)) + '</footer>';
    html += '</div>';
    return html;
  }

  function renderFinding(params) {
    var finding = H.findFinding(params.findingId);
    if (!finding) return '<div class="page-shell"><div class="empty-hint"><p>未发现详情</p></div></div>';

    var report = H.findReport(finding.reportId);
    if (!report || !H.canUserAccessReport(finding.reportId)) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }
    var indicators = report ? H.getReportIndicators(report.id, finding.reportVersion) : [];
    var indicator = indicators.find(function (i) { return i.key === finding.indicatorKey; });
    var rec = H.getFindingRecommendation(finding.id);
    var invalid = H.isInvalidDataStatus(finding.dataStatus);
    var modules = [];

    modules.push({
      id: 'plain',
      title: '通俗解释',
      body: H.stripDemo(finding.consumer || finding.description),
      alwaysOpen: true
    });

    if (indicator) {
      modules.push({
        id: 'pro-value',
        title: '检测数值',
        body: H.formatIndicatorValue(indicator) + (indicator.unit && !H.isInvalidDataStatus(indicator.dataStatus) ? '' : ''),
        detail: '数据状态：' + H.dataStatusLabel(indicator.dataStatus)
      });
    }

    modules.push({
      id: 'pro-conclusion',
      title: '专业结论',
      body: invalid ? '本次无有效数据，不能据此判断偏高或偏低。' : ('结论判定：' + H.conclusionLabel(finding.conclusion)),
      detail: '指标项：' + finding.indicatorKey + ' · 报告版本 v' + finding.reportVersion
    });

    if (indicator && !invalid) {
      modules.push({
        id: 'pro-range',
        title: '参考说明',
        body: '该指标反映肠道菌群构成，需结合整体报告与其他指标综合解读。',
        detail: '此为演示说明，非医疗诊断依据。'
      });
    }

    var html = '<div class="page-shell finding-page">';
    html += '<header class="finding-header">';
    html += '<h2>' + esc(finding.indicatorKey) + '</h2>';
    if (invalid) {
      html += '<span class="badge badge-invalid">本次无有效数据</span>';
    } else {
      html += '<span class="badge ' + H.conclusionClass(finding.conclusion) + '">' + esc(H.conclusionLabel(finding.conclusion)) + '</span>';
    }
    html += '</header>';

    modules.forEach(function (mod) {
      html += '<section class="module-card" data-module="' + esc(mod.id) + '">';
      html += '<button type="button" class="module-head" aria-expanded="' + (mod.alwaysOpen ? 'true' : 'false') + '">';
      html += '<span>' + esc(mod.title) + '</span>';
      if (!mod.alwaysOpen) html += '<i class="fas fa-chevron-down"></i>';
      html += '</button>';
      html += '<div class="module-body' + (mod.alwaysOpen ? ' open' : '') + '">';
      html += '<p class="body-text">' + esc(mod.body) + '</p>';
      if (mod.detail) html += '<p class="hint-text">' + esc(mod.detail) + '</p>';
      html += '</div></section>';
    });

    if (rec && !invalid) {
      html += '<section class="section-block">';
      html += '<button type="button" class="btn-primary" data-nav="recommendation-target" data-rec-id="' + esc(rec.id) + '">查看相关建议</button>';
      html += '</section>';
    } else if (invalid) {
      html += '<section class="section-block"><div class="hint-text">数据无效或未检出，不提供商品推荐。</div></section>';
    }

    html += '</div>';
    return html;
  }

  function renderMetrics(params) {
    var report = H.findReport(params.reportId);
    if (!report || !H.canUserAccessReport(params.reportId)) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }

    var verNum = params.version ? parseInt(params.version, 10) : report.currentVersion;
    var indicators = H.getReportIndicators(report.id, verNum);
    var findings = H.getReportFindings(report.id, verNum);

    var html = '<div class="page-shell">';
    html += '<section class="section-block"><div class="section-head"><h3>全部指标</h3></div>';
    html += '<p class="hint-text">' + esc(H.stripDemo(report.reportNumber)) + ' · v' + verNum + '</p>';

    if (!indicators.length) {
      html += '<div class="empty-hint"><p>暂无指标数据</p></div>';
    }

    indicators.forEach(function (ind) {
      var finding = findings.find(function (f) { return f.indicatorKey === ind.key; });
      var status = H.indicatorDisplayStatus(ind, finding);
      html += '<div class="metric-row full">';
      html += '<div class="metric-name">' + esc(ind.key) + '</div>';
      html += '<div class="metric-value">' + esc(H.formatIndicatorValue(ind)) + '</div>';
      html += '<span class="badge ' + esc(status.className) + '">' + esc(status.text) + '</span>';
      if (H.isInvalidDataStatus(ind.dataStatus)) {
        html += '<div class="metric-note">数据状态：' + esc(H.dataStatusLabel(ind.dataStatus)) + '，本次无有效数据</div>';
      }
      html += '</div>';
    });
    html += '</section></div>';
    return html;
  }

  function renderRecommendations(params) {
    var report = H.findReport(params.reportId);
    if (!report || !H.canUserAccessReport(params.reportId)) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }

    var recs = H.getReportRecommendations(report.id);
    var html = '<div class="page-shell">';
    html += '<section class="section-block"><div class="section-head"><h3>建议与推荐</h3></div>';

    if (!recs.length) {
      html += '<div class="empty-hint"><p>暂无建议</p></div>';
    }

    recs.forEach(function (rec) {
      var finding = H.findFinding(rec.findingId);
      var invalid = finding && H.isInvalidDataStatus(finding.dataStatus);
      var display = H.resolveRecDisplay(rec);

      html += '<div class="list-card' + (invalid ? ' disabled' : '') + '">';
      html += '<div class="list-card-main">';
      html += '<div class="list-title">' + esc(finding ? finding.indicatorKey : '综合') + '</div>';
      html += '<div class="list-sub">' + esc(display.label) + '</div>';
      if (invalid) {
        html += '<div class="list-note">关联指标无有效数据，不推荐商品</div>';
      }
      html += '</div>';
      if (!invalid) {
        html += '<button type="button" class="btn-text" data-nav="recommendation-target" data-rec-id="' + esc(rec.id) + '">查看</button>';
      }
      html += '</div>';
    });

    html += '</section></div>';
    return html;
  }

  function renderRecommendationTarget(params) {
    var rec = H.findRecommendation(params.recId);
    if (!rec) return '<div class="page-shell"><div class="empty-hint"><p>未找到推荐</p></div></div>';
    if (!H.canUserAccessReport(rec.reportId)) {
      return '<div class="page-shell"><div class="empty-hint"><p>无权查看该推荐</p></div></div>';
    }

    var finding = H.findFinding(rec.findingId);
    if (finding && H.isInvalidDataStatus(finding.dataStatus)) {
      return '<div class="page-shell"><section class="section-block"><div class="alert-block">该发现无有效检测数据，不提供商品推荐。</div>' +
        '<button type="button" class="btn-secondary" data-nav="report" data-report-id="' + esc(rec.reportId) + '">返回报告</button></section></div>';
    }

    var display = H.resolveRecDisplay(rec);
    var html = '<div class="page-shell">';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>健康建议</h3></div>';
    html += '<p class="body-text">' + esc(display.label) + '</p>';
    if (finding) {
      html += '<p class="hint-text">关联指标：' + esc(finding.indicatorKey) + ' · ' + esc(H.stripDemo(finding.description)) + '</p>';
    }
    html += '</section>';

    if (display.resolvedType === 'PRODUCT' && display.product) {
      html += '<section class="section-block product-card">';
      html += '<div class="product-icon"><i class="fas fa-box-open"></i></div>';
      html += '<h3>' + esc(H.stripDemo(display.product.name)) + '</h3>';
      html += '<p class="hint-text">适用原因：针对' + esc(finding ? finding.indicatorKey : '相关指标') + '的调理建议</p>';
      if (display.category) {
        html += '<div class="category-tag"><i class="fas fa-tag"></i> ' + esc(H.stripDemo(display.category.name)) + '</div>';
      }
      html += '<p class="hint-text">演示环境不展示价格与购买入口</p>';
      html += '</section>';
    } else if (display.resolvedType === 'CATEGORY' && display.category) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>分类推荐</h3></div>';
      html += '<div class="category-card"><i class="fas fa-layer-group"></i>';
      html += '<div><div class="list-title">' + esc(H.stripDemo(display.category.name)) + '</div>';
      html += '<div class="list-sub">目标产品不可用时，推荐同类调理方向</div></div></div>';
      html += '</section>';
    } else {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>健康建议</h3></div>';
      html += '<div class="advice-card"><i class="fas fa-heart-pulse"></i>';
      html += '<p>建议关注饮食与作息，必要时复检或咨询专业兽医。演示环境无商品推荐。</p></div>';
      if (display.downgradePath && display.downgradePath.length) {
        html += '<p class="hint-text">' + esc(display.downgradePath.join(' → ')) + '</p>';
      }
      html += '</section>';
    }

    html += '<section class="section-block">';
    html += '<button type="button" class="btn-secondary" data-nav="report" data-report-id="' + esc(rec.reportId) + '">返回报告</button>';
    html += '</section></div>';
    return html;
  }

  function renderHistory(params) {
    var report = H.findReport(params.reportId);
    if (!report || !H.canUserAccessReport(params.reportId)) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }

    var tr = H.findTestRecord(report.testRecordId);
    var html = '<div class="page-shell">';
    html += '<section class="section-block"><div class="section-head"><h3>报告历史</h3></div>';
    html += '<p class="hint-text">' + esc(H.stripDemo(report.reportNumber)) + ' · 检测日期 ' + esc(tr ? H.formatDate(tr.testDate) : '—') + '</p>';
    html += '<p class="hint-text">只读查看，专业数据不可修改</p>';

    html += '<ol class="history-timeline">';
    report.versions.slice().reverse().forEach(function (ver) {
      var isCurrent = ver.version === report.currentVersion;
      html += '<li class="history-item' + (isCurrent ? ' current' : '') + '">';
      html += '<div class="history-marker">v' + esc(String(ver.version)) + '</div>';
      html += '<div class="history-content">';
      html += '<div class="list-title">' + esc(H.reportStatusLabel(ver.status)) + (isCurrent ? '（当前）' : '') + '</div>';
      html += '<div class="list-sub">' + esc(H.formatDateTime(ver.publishedAt || ver.createdAt)) + '</div>';
      html += '<p class="body-text">' + esc(H.stripDemo(ver.summary)) + '</p>';
      if (ver.correctionNote) {
        html += '<div class="note-box"><i class="fas fa-pen"></i> ' + esc(H.stripDemo(ver.correctionNote)) + '</div>';
      }
      if (ver.rejectReason) {
        html += '<div class="note-box danger"><i class="fas fa-ban"></i> ' + esc(H.stripDemo(ver.rejectReason)) + '</div>';
      }
      if (ver.status === 'published' || ver.status === 'corrected') {
        html += '<button type="button" class="btn-text" data-nav="report" data-report-id="' + esc(report.id) + '" data-version="' + esc(String(ver.version)) + '">查看此版本</button>';
      }
      html += '</div></li>';
    });
    html += '</ol></section></div>';
    return html;
  }

  root.PetMiniPages = {
    renderHome: renderHome,
    renderReports: renderReports,
    renderProfile: renderProfile,
    renderClaim: renderClaim,
    renderProgress: renderProgress,
    renderReport: renderReport,
    renderFinding: renderFinding,
    renderMetrics: renderMetrics,
    renderRecommendations: renderRecommendations,
    renderRecommendationTarget: renderRecommendationTarget,
    renderHistory: renderHistory
  };
})(window);
