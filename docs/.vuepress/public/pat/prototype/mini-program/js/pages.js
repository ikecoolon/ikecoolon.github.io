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

  function renderDemoDisclaimer() {
    return '<p class="demo-disclaimer">演示呈现，最终位置与样式待甲方确认</p>';
  }

  function renderReportCard(card) {
    var pet = card.petId ? H.findPet(card.petId) : null;
    var petName = pet ? H.stripDemo(pet.name) : '—';
    var statusLabel = H.userStatusLabel(card.userStatus);
    var badgeClass = card.userStatus === 'published' ? 'badge-info' : 'badge-warn';
    var html = '';

    if (card.clickable && card.reportId) {
      html += '<button type="button" class="list-card actionable" data-nav="report" data-report-id="' + esc(card.reportId) + '">';
    } else {
      html += '<div class="list-card static-card">';
    }

    html += '<div class="list-card-main">';
    html += '<div class="list-title">' + esc(card.title) + '</div>';
    html += '<div class="list-sub">' + esc(petName) + ' · 检测日期 ' + esc(H.formatDate(card.testDate)) + '</div>';
    html += '</div>';
    html += '<span class="badge ' + badgeClass + '">' + esc(statusLabel) + '</span>';
    if (card.clickable) html += '<i class="fas fa-chevron-right list-chevron"></i>';
    html += card.clickable ? '</button>' : '</div>';
    return html;
  }

  function renderFilterChips(activeFilter) {
    var filters = [
      { key: 'all', label: '全部' },
      { key: 'published', label: '已发布' },
      { key: 'in_progress', label: '进行中' }
    ];
    var html = '<div class="filter-chips" role="tablist" aria-label="报告筛选">';
    filters.forEach(function (f) {
      var active = activeFilter === f.key ? ' active' : '';
      html += '<button type="button" class="filter-chip' + active + '" data-filter="' + esc(f.key) + '" role="tab">' +
        esc(f.label) + '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderHome() {
    var stats = H.countUserStats();
    var html = '<div class="page-shell">';
    html += '<section class="notice-banner"><i class="fas fa-circle-info"></i> 默认首页待甲方确认</section>';

    html += '<section class="hero-card">';
    html += '<div class="hero-text"><h2>宠物肠道健康</h2><p>线下检测 · 线上查看报告</p></div>';
    html += '<button type="button" class="btn-primary compact" data-nav="claim"><i class="fas fa-qrcode"></i>领取</button>';
    html += '</section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>快捷入口</h3></div>';
    html += '<div class="entry-grid">';
    html += '<button type="button" class="entry-card" data-nav="pets"><i class="fas fa-paw"></i><span>宠物</span><em>' + stats.petCount + ' 只</em></button>';
    html += '<button type="button" class="entry-card" data-nav="reports"><i class="fas fa-file-medical"></i><span>报告</span><em>' + stats.reportCount + ' 份</em></button>';
    html += '<button type="button" class="entry-card" data-nav="claim"><i class="fas fa-gift"></i><span>领取</span><em>认领码</em></button>';
    html += '</div></section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>最近报告</h3>';
    html += '<button type="button" class="text-link" data-nav="reports">查看全部</button></div>';
    var recent = H.getUserVisibleCards(H.CURRENT_USER_ID).slice(0, 3);
    if (!recent.length) {
      html += '<div class="empty-inline">暂无可见报告，领取检测后可在此查看</div>';
    } else {
      recent.forEach(function (card) { html += renderReportCard(card); });
    }
    html += '</section></div>';
    return html;
  }

  function renderReports(params) {
    params = params || {};
    var filter = params.filter || 'all';
    var options = {};
    if (filter === 'published' || filter === 'in_progress') options.userStatus = filter;
    var cards = H.getUserVisibleCards(H.CURRENT_USER_ID, options);

    var html = '<div class="page-shell">';
    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>全部报告</h3></div>';
    html += renderFilterChips(filter);
    html += '</section>';

    html += '<section class="section-block">';
    if (!cards.length) {
      html += '<div class="empty-hint"><i class="fas fa-file-medical"></i><p>暂无符合条件的报告</p></div>';
    } else {
      cards.forEach(function (card) { html += renderReportCard(card); });
    }
    html += '</section></div>';
    return html;
  }

  function renderPets() {
    var pets = H.getUserPets();
    var html = '<div class="page-shell">';
    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>我的宠物</h3></div>';

    if (!pets.length) {
      html += '<div class="empty-hint"><i class="fas fa-paw"></i><p>暂无宠物，领取检测后可查看</p></div>';
    }

    pets.forEach(function (pet) {
      var count = H.countVisibleReportsForPet(pet.id, H.CURRENT_USER_ID);
      html += '<button type="button" class="list-card actionable" data-nav="pet-reports" data-pet-id="' + esc(pet.id) + '">';
      html += '<div class="pet-avatar sm"><i class="fas ' + H.petSpeciesIcon(pet) + '"></i></div>';
      html += '<div class="list-card-main">';
      html += '<div class="list-title">' + esc(H.stripDemo(pet.name)) + '</div>';
      html += '<div class="list-sub">' + esc(pet.breed) + ' · ' + count + ' 份可见报告</div>';
      html += '</div>';
      html += '<i class="fas fa-chevron-right list-chevron"></i></button>';
    });

    html += '</section></div>';
    return html;
  }

  function renderPetReports(params) {
    var pet = params.petId ? H.findPet(params.petId) : null;
    if (!pet || pet.userId !== H.CURRENT_USER_ID) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到宠物或无权查看</p></div></div>';
    }

    var cards = H.getUserVisibleCards(H.CURRENT_USER_ID, { petId: pet.id });
    var html = '<div class="page-shell">';
    html += '<section class="section-block">';
    html += '<button type="button" class="pet-profile-link" data-nav="pet-detail" data-pet-id="' + esc(pet.id) + '">';
    html += '<div class="pet-avatar"><i class="fas ' + H.petSpeciesIcon(pet) + '"></i></div>';
    html += '<div class="info-main">';
    html += '<div class="info-title">' + esc(H.stripDemo(pet.name)) + '</div>';
    html += '<div class="info-sub">' + esc(pet.breed) + ' · 查看宠物资料</div>';
    html += '</div><i class="fas fa-chevron-right list-chevron"></i></button>';
    html += '</section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>检测报告</h3><span class="hint-text">' + cards.length + ' 份</span></div>';
    if (!cards.length) {
      html += '<div class="empty-inline">该宠物暂无可查看报告</div>';
    } else {
      cards.forEach(function (card) { html += renderReportCard(card); });
    }
    html += '</section></div>';
    return html;
  }

  function renderPetDetail(params) {
    var pet = params.petId ? H.findPet(params.petId) : null;
    if (!pet || pet.userId !== H.CURRENT_USER_ID) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到宠物或无权查看</p></div></div>';
    }

    var store = H.findStore(pet.storeId);
    var html = '<div class="page-shell">';
    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>宠物资料</h3><span class="readonly-tag">只读</span></div>';
    html += '<div class="info-row">';
    html += '<div class="pet-avatar lg"><i class="fas ' + H.petSpeciesIcon(pet) + '"></i></div>';
    html += '<div class="info-main">';
    html += '<div class="info-title">' + esc(H.stripDemo(pet.name)) + '</div>';
    html += '<div class="info-sub">' + esc(pet.breed) + '</div>';
    html += '</div></div>';
    html += '<dl class="detail-list">';
    html += '<div><dt>性别</dt><dd>' + esc(H.genderLabel(pet.gender)) + '</dd></div>';
    html += '<div><dt>年龄</dt><dd>' + esc(pet.age != null ? String(pet.age) + ' 岁' : '—') + '</dd></div>';
  if (store) html += '<div><dt>登记门店</dt><dd>' + esc(H.stripDemo(store.name)) + '</dd></div>';
    html += '</dl></section></div>';
    return html;
  }

  function renderProfile() {
    var user = H.getCurrentUser();
    var html = '<div class="page-shell">';
    html += '<section class="profile-header">';
    html += '<div class="profile-avatar"><i class="fas fa-user"></i></div>';
    html += '<div>';
    html += '<div class="profile-name">' + esc(H.stripDemo(user ? user.name : '用户')) + '</div>';
    html += '<div class="profile-phone">' + esc(user ? user.phone : '') + '</div>';
    html += '</div></section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>我的服务</h3></div>';
    html += '<div class="menu-list">';
    html += '<button type="button" class="menu-item" data-nav="pets"><i class="fas fa-paw"></i><span>宠物</span><i class="fas fa-chevron-right"></i></button>';
    html += '<button type="button" class="menu-item" data-nav="reports"><i class="fas fa-file-medical"></i><span>报告</span><i class="fas fa-chevron-right"></i></button>';
    html += '<button type="button" class="menu-item" data-nav="claim"><i class="fas fa-gift"></i><span>领取</span><i class="fas fa-chevron-right"></i></button>';
    html += '</div></section>';

    html += '<section class="section-block">';
    html += '<button type="button" class="btn-danger-outline" id="reset-demo-btn"><i class="fas fa-rotate-left"></i> 重置演示数据</button>';
    html += '<p class="hint-text">重置后将恢复种子数据，认领与本地修改将清除。</p>';
    html += '</section>';

    html += '<footer class="disclaimer">' + esc(H.stripDemo(H.getState().meta.disclaimer)) + '</footer>';
    html += '</div>';
    return html;
  }

  function renderClaim(params) {
    params = params || {};
    var step = params.step || 'input';
    var pendingCode = params.code || '';
    var pendingClaims = H.getPendingClaimCodes();

    var html = '<div class="page-shell">';

    if (step === 'confirm' && pendingCode) {
      var preview = H.previewClaimCode(pendingCode);
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>确认领取信息</h3></div>';
      if (!preview) {
        html += '<div class="form-message error">' + esc(H.CLAIM_INVALID_MSG) + '</div>';
        html += '<button type="button" class="btn-secondary" id="claim-back-btn">返回重新输入</button>';
      } else {
        html += '<dl class="detail-list claim-preview">';
        html += '<div><dt>宠物</dt><dd>' + esc(preview.petName) + '</dd></div>';
        html += '<div><dt>检测项目</dt><dd>' + esc(preview.title) + '</dd></div>';
        html += '<div><dt>检测日期</dt><dd>' + esc(H.formatDate(preview.testDate)) + '</dd></div>';
        html += '</dl>';
        html += '<div id="claim-message" class="form-message" hidden></div>';
        html += '<button type="button" class="btn-primary" id="claim-confirm-btn" data-code="' + esc(preview.code) + '">确认领取</button>';
        html += '<button type="button" class="btn-secondary" id="claim-back-btn">返回修改</button>';
      }
      html += '</section>';
      html += '</div>';
      return { html: html, step: step, code: pendingCode };
    }

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>领取检测</h3></div>';
    html += '<p class="hint-text">输入门店提供的认领码，或模拟扫码选择演示码。</p>';
    html += '<div class="field"><label for="claim-code">认领码</label>';
    html += '<input class="input" id="claim-code" placeholder="请输入认领码" value="' + esc(pendingCode) + '" /></div>';
    html += '<div id="claim-message" class="form-message" hidden></div>';
    html += '<button type="button" class="btn-primary" id="claim-preview-btn">下一步</button>';
    html += '</section>';

    if (pendingClaims.length) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>模拟扫码</h3></div>';
      pendingClaims.forEach(function (claim) {
        var preview = H.previewClaimCode(claim.code);
        if (!preview) return;
        html += '<button type="button" class="demo-btn claim-scan-btn" data-claim-code="' + esc(claim.code) + '">';
        html += '<div class="demo-btn-title">' + esc(preview.petName) + ' · ' + esc(preview.title) + '</div>';
        html += '<div class="demo-btn-desc">认领码 ' + esc(claim.code) + ' · ' + esc(H.formatDate(preview.testDate)) + '</div>';
        html += '</button>';
      });
      html += '</section>';
    }

    html += '</div>';
    return { html: html, step: 'input', code: pendingCode };
  }

  function renderEcoScene(theme, pet) {
    var petIcon = pet ? H.petSpeciesIcon(pet) : 'fa-paw';
    return '<div class="eco-scene" aria-hidden="true">' +
      '<div class="eco-layer eco-sky"></div>' +
      '<div class="eco-layer eco-back-hills"></div>' +
      '<div class="eco-layer eco-mid-trees"></div>' +
      '<div class="eco-layer eco-front-ground"></div>' +
      '<div class="eco-pet"><i class="fas ' + petIcon + '"></i></div>' +
      '<div class="eco-microbe eco-microbe-a"><i class="fas fa-bacteria"></i></div>' +
      '<div class="eco-microbe eco-microbe-b"><i class="fas fa-virus"></i></div>' +
      '<div class="eco-microbe eco-microbe-c"><i class="fas fa-circle-dot"></i></div>' +
      '</div>';
  }

  function renderIndicatorRow(ind, finding, species, options) {
    options = options || {};
    if (!H.shouldShowIndicator(ind)) return '';
    var pres = H.evaluateIndicatorPresentation(ind, finding, species);
    var label = H.getIndicatorLabel(ind.key);
    var navAttrs = '';
    if (finding) {
      navAttrs = ' data-nav="finding" data-finding-id="' + esc(finding.id) + '"';
    } else if (options.navigable) {
      navAttrs = ' data-nav="finding" data-report-id="' + esc(ind.reportId) + '" data-indicator-key="' + esc(ind.key) + '"';
    }
    var tag = (finding || options.navigable) ? 'button' : 'div';
    var cls = 'result-row' + ((finding || options.navigable) ? ' actionable' : '');
    var typeAttr = tag === 'button' ? ' type="button"' : '';
    var html = '<' + tag + typeAttr + ' class="' + cls + '"' + navAttrs + '>';
    html += '<div class="result-row-main">';
    html += '<div class="result-name">' + esc(label) + '</div>';
    if (pres.valueText) html += '<div class="result-value">' + esc(pres.valueText) + '</div>';
    if (pres.rangeText) html += '<div class="result-range">参考 ' + esc(pres.rangeText) + '</div>';
    html += '</div>';
    html += '<span class="badge ' + esc(pres.statusClass) + '">' + esc(pres.statusText) + '</span>';
    if (finding || options.navigable) html += '<i class="fas fa-chevron-right list-chevron"></i>';
    html += '</' + tag + '>';
    return html;
  }

  function renderMicrobiotaNode(node, reportId, species) {
    if (!node.hasResult) return '';
    var html = '<div class="microbiota-phylum">';
    html += renderIndicatorRow(node.indicator, node.finding, species, {
      navigable: true
    });
    if (node.genusResults.length) {
      html += '<div class="microbiota-genus-list">';
      node.genusResults.forEach(function (child) {
        html += renderIndicatorRow(child.indicator, child.finding, species, {
          navigable: true
        });
      });
      html += '</div>';
    } else if (node.knowledgeOnly) {
      html += '<div class="knowledge-note"><i class="fas fa-book-open"></i> 本次未包含属级检测</div>';
      html += '<div class="knowledge-cards">';
      node.children.forEach(function (child) {
        html += '<div class="knowledge-card">';
        html += '<div class="knowledge-title"><i class="fas fa-lightbulb"></i> ' + esc(child.taxon.label) + ' <span class="knowledge-tag">科普</span></div>';
        html += '<p class="knowledge-text">' + esc(child.taxon.value) + '</p>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderBenchmarkSection(reportId, indicators, species) {
    var items = indicators.filter(function (ind) {
      return H.getDemoBenchmark(reportId, ind.key);
    });
    if (!items.length) return '';
    var html = '<section class="report-panel benchmark-panel">';
    html += '<div class="section-head"><h3>理想菌群对比</h3>';
    html += '<span class="temp-badge">演示临时基准</span></div>';
    items.forEach(function (ind) {
      var bench = H.getDemoBenchmark(reportId, ind.key);
      var pres = H.evaluateIndicatorPresentation(ind, null, species);
      if (!pres.showValue) return;
      var actual = Number(ind.value);
      var diff = actual - bench.ideal;
      var diffText = (diff >= 0 ? '+' : '') + diff.toFixed(1) + bench.unit;
      html += '<div class="benchmark-row">';
      html += '<div class="benchmark-name">' + esc(H.getIndicatorLabel(ind.key)) + '</div>';
      html += '<div class="benchmark-bars">';
      html += '<div class="benchmark-bar actual"><span>本次 ' + esc(pres.valueText) + '</span><em style="width:' + Math.min(100, actual) + '%"></em></div>';
      html += '<div class="benchmark-bar ideal"><span>基准 ' + bench.ideal + bench.unit + '</span><em style="width:' + Math.min(100, bench.ideal) + '%"></em></div>';
      html += '</div>';
      html += '<div class="benchmark-diff">' + esc(diffText) + '</div>';
      html += '</div>';
    });
    html += '</section>';
    return html;
  }

  function renderReport(params) {
    var ctx = H.getPublishedReportContext(params.reportId);
    if (!ctx) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }

    var report = ctx.report;
    var version = ctx.version;
    var verNum = ctx.verNum;
    var pet = H.findPet(report.petId);
    var tr = H.findTestRecord(report.testRecordId);
    var species = H.getReportSpecies(report.id);
    var level = version.healthLevel || 'C';
    var theme = H.getThemeConfig(level);
    var overlay = H.getSnapshotPresentation(report.id) || {
      percentile: null,
      dimensions: [],
      summaryItems: [],
      benchmarks: {}
    };
    var partitioned = H.partitionReportIndicators(report.id, verNum);
    var microbiotaTree = H.buildMicrobiotaTree(report.id, verNum);
    var findings = H.getReportFindings(report.id, verNum);

    var html = '<div class="page-shell report-reading ' + esc(theme.sceneClass) + '">';

    html += '<section class="report-eco-hero ' + esc(theme.sceneClass) + '">';
    html += renderEcoScene(theme, pet);
    html += '<div class="eco-overlay">';
    html += '<div class="eco-grade-badge">' + esc(level) + '</div>';
    html += '<div class="eco-meta">';
    html += '<h2 class="report-title">' + esc(H.stripDemo(report.reportNumber)) + '</h2>';
    html += '<div class="eco-theme-label"><i class="fas ' + theme.icon + '"></i> ' + esc(theme.name) + '</div>';
    html += '<div class="info-sub">' + esc(pet ? H.stripDemo(pet.name) : '—') + ' · ' + esc(H.formatDate(tr ? tr.testDate : null)) + '</div>';
    html += '</div></div></section>';

    html += '<section class="report-panel score-panel">';
    html += '<div class="score-grid">';
    if (version.healthScore != null) {
      html += '<div class="score-item"><span class="score-num">' + esc(String(version.healthScore)) + '</span><span class="score-label">综合分</span></div>';
    }
    html += '<div class="score-item"><span class="score-num">' + esc(String(overlay.percentile != null ? overlay.percentile : '—')) + (overlay.percentile != null ? '<small>%</small>' : '') + '</span>';
    html += '<span class="score-label">百分位 <em class="temp-label">临时展示</em></span></div>';
    html += '<div class="score-item"><span class="score-num grade-inline">' + esc(level) + '</span><span class="score-label">健康等级</span></div>';
    html += '</div></section>';

    if (overlay.dimensions && overlay.dimensions.length) {
      html += '<section class="report-panel dimensions-panel">';
      html += '<div class="section-head"><h3>平台评估维度</h3><span class="temp-badge">临时展示</span></div>';
      html += '<div class="dimension-grid">';
      overlay.dimensions.forEach(function (dim) {
        html += '<div class="dimension-item">';
        html += '<div class="dimension-ring" style="--dim-score:' + dim.score + '"><span>' + dim.score + '</span></div>';
        html += '<div class="dimension-label">' + esc(dim.label) + '</div>';
        html += '</div>';
      });
      html += '</div></section>';
    }

    var summary = H.stripDemo(version.summary);
    if (summary) {
      html += '<section class="report-panel"><div class="section-head"><h3>整体解读</h3></div>';
      html += '<p class="body-text">' + esc(summary) + '</p></section>';
    }

    if (overlay.summaryItems && overlay.summaryItems.length) {
      html += '<section class="report-panel summary-trio">';
      html += '<div class="section-head"><h3>要点速览</h3><span class="temp-badge">临时展示</span></div>';
      html += '<div class="trio-list">';
      overlay.summaryItems.forEach(function (item) {
        html += '<div class="trio-item"><i class="fas ' + esc(item.icon) + '"></i><span>' + esc(item.text) + '</span></div>';
      });
      html += '</div></section>';
    }

    if (partitioned.regular.length) {
      html += '<section class="report-panel">';
      html += '<div class="section-head"><h3>普通指标</h3>';
      html += '<button type="button" class="text-link" data-nav="metrics" data-report-id="' + esc(report.id) + '">全部</button></div>';
      partitioned.regular.forEach(function (ind) {
        var finding = findings.find(function (f) { return f.indicatorKey === ind.key; });
        html += renderIndicatorRow(ind, finding, species, { navigable: true });
      });
      html += '</section>';
    }

    if (microbiotaTree.length) {
      html += '<section class="report-panel microbiota-panel">';
      html += '<div class="section-head"><h3>菌群门级</h3>';
      html += '<button type="button" class="text-link" data-nav="metrics" data-report-id="' + esc(report.id) + '">浏览</button></div>';
      microbiotaTree.forEach(function (node) {
        html += renderMicrobiotaNode(node, report.id, species);
      });
      html += '</section>';
    }

    html += renderBenchmarkSection(report.id, partitioned.microbiota.concat(partitioned.regular), species);

    var validFindings = findings.filter(function (f) {
      return f.dataStatus === 'NOT_DETECTED' || !H.isInvalidDataStatus(f.dataStatus);
    });
    if (validFindings.length) {
      html += '<section class="report-panel">';
      html += '<div class="section-head"><h3>重点发现</h3></div>';
      validFindings.forEach(function (f) {
        var invalid = H.isInvalidDataStatus(f.dataStatus) && f.dataStatus !== 'NOT_DETECTED';
        html += '<button type="button" class="finding-card actionable" data-nav="finding" data-finding-id="' + esc(f.id) + '">';
        html += '<div class="finding-card-main">';
        html += '<div class="list-title">' + esc(H.getIndicatorLabel(f.indicatorKey)) + '</div>';
        html += '<div class="list-sub">' + esc(H.stripDemo(f.description)) + '</div>';
        html += '</div>';
        if (f.dataStatus === 'NOT_DETECTED') {
          html += '<span class="badge status-not-detected">未检出</span>';
        } else if (invalid) {
          html += '<span class="badge badge-invalid">' + esc(H.dataStatusLabel(f.dataStatus)) + '</span>';
        } else {
          html += '<span class="badge ' + H.conclusionClass(f.conclusion) + '">' + esc(H.conclusionLabel(f.conclusion)) + '</span>';
        }
        html += '<i class="fas fa-chevron-right list-chevron"></i></button>';
      });
      html += '</section>';
    }

    html += '</div>';
    return html;
  }

  function renderFinding(params) {
    var finding = null;
    var detailCtx = null;
    var reportId = params.reportId;

    if (params.findingId) {
      var liveFinding = H.findFinding(params.findingId);
      reportId = liveFinding ? liveFinding.reportId : reportId;
      if (reportId) {
        finding = H.findReportFinding(reportId, params.findingId);
      }
      if (!finding) finding = liveFinding;
      if (!finding) return '<div class="page-shell"><div class="empty-hint"><p>未发现详情</p></div></div>';
      if (!reportId) reportId = finding.reportId;
      var ctx = H.getPublishedReportContext(reportId);
      if (!ctx || finding.reportVersion !== ctx.verNum) {
        return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
      }
      detailCtx = H.getIndicatorDetailContext(reportId, finding.indicatorKey);
    } else if (params.reportId && params.indicatorKey) {
      detailCtx = H.getIndicatorDetailContext(params.reportId, params.indicatorKey);
      if (!detailCtx) {
        return '<div class="page-shell"><div class="empty-hint"><p>未找到指标或无权查看</p></div></div>';
      }
      finding = detailCtx.finding;
    } else {
      return '<div class="page-shell"><div class="empty-hint"><p>未发现详情</p></div></div>';
    }

    var report = detailCtx.report;
    var version = detailCtx.version;
    var indicator = detailCtx.indicator;
    var pres = detailCtx.presentation;
    var rec = finding ? H.getFindingRecommendation(finding.id) : null;
    var level = version.healthLevel || 'C';
    var theme = H.getThemeConfig(level);
    var parentTaxon = null;
    if (detailCtx.entry && detailCtx.entry.type === 'microbiota' && detailCtx.entry.item.parentKey) {
      parentTaxon = H.findCatalogEntryByKey(detailCtx.entry.item.parentKey);
    }

    var html = '<div class="page-shell finding-page ' + esc(theme.sceneClass) + '">';
    html += '<header class="finding-header">';
    html += '<div><h2>' + esc(detailCtx.label) + '</h2>';
    if (parentTaxon) {
      html += '<div class="finding-hierarchy"><i class="fas fa-sitemap"></i> ' + esc(parentTaxon.item.label) + ' → ' + esc(detailCtx.label) + '</div>';
    }
    html += '</div>';
    html += '<span class="badge ' + esc(pres.statusClass) + '">' + esc(pres.statusText) + '</span>';
    html += '</header>';

    html += '<section class="detail-value-card">';
    html += '<div class="detail-value-row">';
    html += '<span class="detail-label">检测数值</span>';
    html += '<span class="detail-value">' + esc(pres.valueText || '—') + '</span>';
    html += '</div>';
    if (indicator && indicator.unit && pres.showValue && indicator.dataStatus !== 'NOT_DETECTED') {
      html += '<div class="detail-value-row"><span class="detail-label">单位</span><span class="detail-value">' + esc(indicator.unit) + '</span></div>';
    }
    if (pres.rangeText) {
      html += '<div class="detail-value-row"><span class="detail-label">参考范围</span><span class="detail-value">' + esc(pres.rangeText) + '</span></div>';
    } else if (pres.showValue && indicator.dataStatus !== 'NOT_DETECTED') {
      html += '<div class="detail-value-row"><span class="detail-label">参考范围</span><span class="detail-value muted">暂无参考范围</span></div>';
    }
    html += '</section>';

    var consumerText = finding ? H.stripDemo(finding.consumer) : null;
    if (!consumerText && detailCtx.knowledge) consumerText = detailCtx.knowledge;
    if (consumerText) {
      html += '<section class="report-panel">';
      html += '<div class="section-head"><h3>通俗解释</h3></div>';
      html += '<p class="body-text">' + esc(consumerText) + '</p></section>';
    }

    if (finding && H.stripDemo(finding.professional || finding.description)) {
      html += '<section class="report-panel">';
      html += '<div class="section-head"><h3>本次分析</h3></div>';
      html += '<p class="body-text">' + esc(H.stripDemo(finding.professional || finding.description)) + '</p></section>';
    }

    if (detailCtx.entry && detailCtx.entry.type === 'microbiota' && detailCtx.knowledge) {
      html += '<section class="report-panel knowledge-panel">';
      html += '<div class="section-head"><h3>菌群科普</h3></div>';
      html += '<p class="body-text">' + esc(detailCtx.knowledge) + '</p></section>';
    }

    var bench = H.getDemoBenchmark(report.id, indicator.key);
    if (bench && pres.showValue) {
      html += '<section class="report-panel benchmark-panel">';
      html += '<div class="section-head"><h3>单报告对比</h3><span class="temp-badge">演示临时基准</span></div>';
      var actual = Number(indicator.value);
      var diff = actual - bench.ideal;
      html += '<div class="benchmark-inline">';
      html += '<div><strong>本次</strong> ' + esc(pres.valueText) + '</div>';
      html += '<div><strong>基准</strong> ' + bench.ideal + bench.unit + '</div>';
      html += '<div><strong>差值</strong> ' + (diff >= 0 ? '+' : '') + diff.toFixed(1) + bench.unit + '</div>';
      html += '</div></section>';
    }

    if (rec) {
      var display = H.resolveRecDisplay(rec);
      html += '<section class="report-panel advice-panel">';
      html += '<div class="section-head"><h3>健康建议</h3></div>';
      html += '<p class="body-text">' + esc(display.label) + '</p>';
      if (display.reason && display.reason !== display.label) {
        html += '<p class="hint-text">' + esc(display.reason) + '</p>';
      }
      html += renderDemoDisclaimer();
      if (!H.isInvalidDataStatus(finding.dataStatus)) {
        html += '<button type="button" class="btn-primary" data-nav="recommendation-target" data-rec-id="' + esc(rec.id) + '">查看相关建议</button>';
      }
      html += '</section>';
    } else if (finding && H.stripDemo(finding.consumer) && !rec) {
      html += '<section class="report-panel advice-panel">';
      html += '<div class="section-head"><h3>健康建议</h3></div>';
      html += '<p class="body-text">建议关注饮食与作息，必要时咨询专业兽医。</p></section>';
    }

    html += '</div>';
    return html;
  }

  function renderMetrics(params) {
    var ctx = H.getPublishedReportContext(params.reportId);
    if (!ctx) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }

    var species = H.getReportSpecies(ctx.report.id);
    var partitioned = H.partitionReportIndicators(ctx.report.id, ctx.verNum);
    var microbiotaTree = H.buildMicrobiotaTree(ctx.report.id, ctx.verNum);
    var findings = H.getReportFindings(ctx.report.id, ctx.verNum);
    var level = ctx.version.healthLevel || 'C';
    var theme = H.getThemeConfig(level);

    var html = '<div class="page-shell metrics-page ' + esc(theme.sceneClass) + '">';
    html += '<header class="metrics-header">';
    html += '<h2>检测指标</h2>';
    html += '<p class="hint-text">' + esc(H.stripDemo(ctx.report.reportNumber)) + '</p>';
    html += '</header>';

    if (partitioned.regular.length) {
      html += '<section class="report-panel">';
      html += '<div class="section-head"><h3>普通指标</h3></div>';
      partitioned.regular.forEach(function (ind) {
        var finding = findings.find(function (f) { return f.indicatorKey === ind.key; });
        html += renderIndicatorRow(ind, finding, species, { navigable: true });
      });
      html += '</section>';
    }

    if (microbiotaTree.length) {
      html += '<section class="report-panel microbiota-panel">';
      html += '<div class="section-head"><h3>菌群检测</h3></div>';
      microbiotaTree.forEach(function (node) {
        html += renderMicrobiotaNode(node, ctx.report.id, species);
      });
      html += '</section>';
    }

    html += renderBenchmarkSection(ctx.report.id, partitioned.microbiota.concat(partitioned.regular), species);
    html += '</div>';
    return html;
  }

  function renderRecommendations(params) {
    var ctx = H.getPublishedReportContext(params.reportId);
    if (!ctx) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }

    var recs = H.getReportRecommendations(ctx.report.id);
    var html = '<div class="page-shell">';
    html += '<section class="section-block"><div class="section-head"><h3>建议与推荐</h3></div>';

    if (!recs.length) {
      html += '<div class="empty-hint"><p>暂无建议</p></div>';
    }

    recs.forEach(function (rec) {
      var finding = rec.findingId ? H.findReportFinding(ctx.report.id, rec.findingId) : null;
      if (!finding && rec.findingId) finding = H.findFinding(rec.findingId);
      var invalid = finding && H.isInvalidDataStatus(finding.dataStatus);
      var display = H.resolveRecDisplay(rec);

      html += '<div class="list-card' + (invalid ? ' disabled' : '') + '">';
      html += '<div class="list-card-main">';
      html += '<div class="list-title">' + esc(finding ? H.getIndicatorLabel(finding.indicatorKey) : '综合') + '</div>';
      html += '<div class="list-sub">' + esc(display.label) + '</div>';
      if (display.reason && display.reason !== display.label) {
        html += '<div class="list-note">' + esc(display.reason) + '</div>';
      }
      if (invalid) {
        html += '<div class="list-note">关联指标无有效数据，不推荐商品</div>';
      }
      html += '</div>';
      if (!invalid) {
        html += '<button type="button" class="btn-text" data-nav="recommendation-target" data-rec-id="' + esc(rec.id) + '">查看</button>';
      }
      html += '</div>';
    });

    html += renderDemoDisclaimer();
    html += '</section></div>';
    return html;
  }

  function renderRecommendationTarget(params) {
    var rec = H.findRecommendation(params.recId);
    if (!rec) {
      var reportIds = H.getUserVisibleCards(H.CURRENT_USER_ID)
        .filter(function (c) { return c.reportId; })
        .map(function (c) { return c.reportId; });
      reportIds.forEach(function (rid) {
        if (!rec) {
          rec = H.getReportRecommendations(rid).find(function (r) { return r.id === params.recId; }) || null;
        }
      });
    }
    if (!rec) return '<div class="page-shell"><div class="empty-hint"><p>未找到推荐</p></div></div>';
    if (!H.canUserAccessPublishedReport(rec.reportId)) {
      return '<div class="page-shell"><div class="empty-hint"><p>无权查看该推荐</p></div></div>';
    }

    var finding = rec.findingId ? H.findReportFinding(rec.reportId, rec.findingId) : null;
    if (!finding && rec.findingId) finding = H.findFinding(rec.findingId);
    if (finding && H.isInvalidDataStatus(finding.dataStatus)) {
      return '<div class="page-shell"><section class="section-block"><div class="alert-block">该发现无有效检测数据，不提供商品推荐。</div>' +
        '<button type="button" class="btn-secondary" data-nav="report" data-report-id="' + esc(rec.reportId) + '">返回报告</button></section></div>';
    }

    var display = H.resolveRecDisplay(rec);
    var html = '<div class="page-shell">';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>健康建议</h3></div>';
    html += '<p class="body-text">' + esc(display.label) + '</p>';
    if (display.reason && display.reason !== display.label) {
      html += '<p class="hint-text">' + esc(display.reason) + '</p>';
    }
    if (finding) {
      html += '<p class="hint-text">关联指标：' + esc(H.getIndicatorLabel(finding.indicatorKey)) + ' · ' + esc(H.stripDemo(finding.description)) + '</p>';
    } else if (rec.findingId) {
      html += '<p class="hint-text">关联发现：' + esc(rec.findingId) + '（快照中无详细发现，已展示冻结建议）</p>';
    }
    html += renderDemoDisclaimer();
    html += '</section>';

    if (display.resolvedType === 'PRODUCT' && display.product) {
      html += '<section class="section-block product-card">';
      html += '<div class="product-icon"><i class="fas fa-box-open"></i></div>';
      html += '<h3>' + esc(H.stripDemo(display.product.name)) + '</h3>';
      html += '<p class="hint-text">适用原因：针对' + esc(finding ? H.getIndicatorLabel(finding.indicatorKey) : '相关指标') + '的调理建议</p>';
      html += '<div class="spu-status-row">';
      html += '<span class="badge ' + H.productStatusClass(display.product) + '">' + esc(H.productStatusLabel(display.product)) + '</span>';
      html += '<span class="hint-text">库存 ' + esc(String(display.product.stock != null ? display.product.stock : '—')) + '</span>';
      html += '</div>';
      html += '<button type="button" class="btn-secondary" data-nav="spu-detail" data-product-id="' + esc(display.product.id) + '">查看 SPU 详情</button>';
      html += '<p class="hint-text">演示环境不展示价格与购买入口</p>';
      html += '</section>';
    } else if (display.resolvedType === 'TAG_CANDIDATE' && display.candidates.length) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>标签候选商品</h3></div>';
      display.candidates.forEach(function (candidate) {
        var prod = candidate.product;
        if (!prod) return;
        html += '<button type="button" class="list-card actionable spu-candidate-card" data-nav="spu-detail" data-product-id="' + esc(prod.id) + '">';
        html += '<div class="list-card-main">';
        html += '<div class="list-title">' + esc(H.stripDemo(prod.name)) + '</div>';
        html += '<div class="list-sub">';
        html += '<span class="badge ' + H.productStatusClass(prod) + '">' + esc(H.productStatusLabel(prod)) + '</span>';
        html += ' · 库存 ' + esc(String(prod.stock != null ? prod.stock : '—'));
        html += '</div></div>';
        html += '<i class="fas fa-chevron-right list-chevron"></i></button>';
      });
      html += '</section>';
    } else {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>商品推荐</h3></div>';
      html += '<div class="advice-card"><i class="fas fa-heart-pulse"></i>';
      html += '<p>当前无可用商品展示，请优先参考上方健康建议。演示环境无购买入口。</p></div>';
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

  function renderSpuDetail(params) {
    var productId = params.productId;
    var product = productId ? H.getProductById(productId) : null;
    if (!product) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到商品</p></div></div>';
    }

    var html = '<div class="page-shell spu-detail-page">';
    html += '<section class="section-block spu-detail-card">';
    html += '<div class="spu-detail-icon"><i class="fas fa-box-open"></i></div>';
    html += '<h2 class="spu-detail-name">' + esc(H.stripDemo(product.name)) + '</h2>';
    html += '<p class="hint-text">SPU ID：' + esc(product.id) + '</p>';
    html += '<dl class="detail-list spu-detail-meta">';
    html += '<div><dt>销售状态</dt><dd><span class="badge ' + H.productStatusClass(product) + '">' + esc(H.productStatusLabel(product)) + '</span></dd></div>';
    html += '<div><dt>库存</dt><dd>' + esc(String(product.stock != null ? product.stock : '—')) + '</dd></div>';
    html += '<div><dt>可售</dt><dd>' + esc(product.available ? '是' : '否') + '</dd></div>';
    html += '</dl>';
    html += renderDemoDisclaimer();
    html += '<p class="hint-text">演示环境不展示价格、规格与购买入口</p>';
    html += '</section>';
    html += '</div>';
    return html;
  }

  root.PetMiniPages = {
    renderHome: renderHome,
    renderReports: renderReports,
    renderPets: renderPets,
    renderPetReports: renderPetReports,
    renderPetDetail: renderPetDetail,
    renderProfile: renderProfile,
    renderClaim: renderClaim,
    renderReport: renderReport,
    renderFinding: renderFinding,
    renderMetrics: renderMetrics,
    renderRecommendations: renderRecommendations,
    renderRecommendationTarget: renderRecommendationTarget,
    renderSpuDetail: renderSpuDetail
  };
})(window);
