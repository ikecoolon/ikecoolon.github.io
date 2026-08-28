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
      { key: 'in_progress', label: '报告处理中' }
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
    var pets = H.getUserPets();
    var html = '<div class="page-shell">';

    html += '<section class="hero-card">';
    html += '<div class="hero-text"><h2>我的宠物</h2><p>查看关联宠物、报告处理中与已发布报告</p></div>';
    html += '<button type="button" class="btn-primary compact" data-nav="pets"><i class="fas fa-paw"></i>全部宠物</button>';
    html += '</section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>宠物列表</h3><span class="hint-text">' + stats.petCount + ' 只</span></div>';

    if (!pets.length) {
      html += '<div class="empty-hint"><i class="fas fa-paw"></i><p>暂无关联宠物</p></div>';
    } else {
      pets.forEach(function (pet) {
        var count = H.countVisibleReportsForPet(pet.id, H.CURRENT_USER_ID);
        html += '<button type="button" class="list-card actionable" data-nav="pet-reports" data-pet-id="' + esc(pet.id) + '">';
        html += '<div class="pet-avatar sm"><i class="fas ' + H.petSpeciesIcon(pet) + '"></i></div>';
        html += '<div class="list-card-main">';
        html += '<div class="list-title">' + esc(H.stripDemo(pet.name)) + '</div>';
        html += '<div class="list-sub">' + esc(pet.breed) + ' · ' + count + ' 份报告</div>';
        html += '</div>';
        html += '<i class="fas fa-chevron-right list-chevron"></i></button>';
      });
    }
    html += '</section>';

    if (pets.length) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>最近报告</h3><span class="hint-text">含处理中与已发布</span></div>';
      var recent = H.getUserVisibleCards(H.CURRENT_USER_ID).slice(0, 3);
      if (!recent.length) {
        html += '<div class="empty-inline">暂无报告记录</div>';
      } else {
        recent.forEach(function (card) { html += renderReportCard(card); });
      }
      html += '</section>';
    }

    html += '</div>';
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
      html += '<div class="empty-hint"><i class="fas fa-paw"></i><p>暂无关联宠物</p></div>';
    }

    pets.forEach(function (pet) {
      var count = H.countVisibleReportsForPet(pet.id, H.CURRENT_USER_ID);
      html += '<button type="button" class="list-card actionable" data-nav="pet-reports" data-pet-id="' + esc(pet.id) + '">';
      html += '<div class="pet-avatar sm"><i class="fas ' + H.petSpeciesIcon(pet) + '"></i></div>';
      html += '<div class="list-card-main">';
      html += '<div class="list-title">' + esc(H.stripDemo(pet.name)) + '</div>';
      html += '<div class="list-sub">' + esc(pet.breed) + ' · ' + count + ' 份已发布报告</div>';
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
    html += '<div class="section-head"><h3>' + esc(H.stripDemo(pet.name)) + '</h3><span class="readonly-tag">只读</span></div>';
    html += '<dl class="detail-list pet-detail-inline">';
    html += '<div><dt>物种</dt><dd>' + esc(pet.species === 'cat' ? '猫' : '犬') + '</dd></div>';
    html += '<div><dt>品种</dt><dd>' + esc(pet.breed || '—') + '</dd></div>';
    html += '<div><dt>性别</dt><dd>' + esc(H.genderLabel(pet.gender)) + '</dd></div>';
    html += '<div><dt>年龄</dt><dd>' + esc(pet.age != null ? String(pet.age) + ' 岁' : '—') + '</dd></div>';
    html += '</dl>';
    html += '</section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>检测报告</h3><span class="hint-text">' + cards.length + ' 份</span></div>';
    if (!cards.length) {
      html += '<div class="empty-inline">该宠物暂无报告记录</div>';
    } else {
      cards.forEach(function (card) { html += renderReportCard(card); });
    }
    html += '</section></div>';
    return html;
  }

  function renderPetDetail(params) {
    if (params && params.petId) {
      return renderPetReports({ petId: params.petId });
    }
    return '<div class="page-shell"><div class="empty-hint"><p>未找到宠物</p></div></div>';
  }

  function renderProfile() {
    var user = H.getCurrentUser();
    var stats = H.countUserStats();
    var html = '<div class="page-shell">';
    html += '<section class="profile-header">';
    html += '<div class="profile-avatar"><i class="fas fa-user"></i></div>';
    html += '<div>';
    html += '<div class="profile-name">' + esc(H.stripDemo(user ? user.name : '用户')) + '</div>';
    html += '<div class="profile-phone">' + esc(user ? user.phone : '') + '</div>';
    html += '</div></section>';

    html += '<section class="section-block">';
    html += '<div class="section-head"><h3>我的宠物</h3><span class="hint-text">' + stats.petCount + ' 只 · ' + stats.publishedCount + ' 份报告</span></div>';
    html += '<div class="menu-list">';
    html += '<button type="button" class="menu-item" data-nav="pets"><i class="fas fa-paw"></i><span>宠物列表</span><i class="fas fa-chevron-right"></i></button>';
    html += '</div></section>';

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
    html += '<p class="hint-text">输入门店提供的认领码，或使用扫码识别</p>';
    html += '<div class="field"><label for="claim-code">认领码</label>';
    html += '<input class="input" id="claim-code" placeholder="请输入认领码" value="' + esc(pendingCode) + '" /></div>';
    html += '<div id="claim-message" class="form-message" hidden></div>';
    html += '<button type="button" class="btn-primary" id="claim-preview-btn">下一步</button>';
    if (pendingClaims.length) {
      html += '<button type="button" class="btn-secondary claim-scan-btn"><i class="fas fa-qrcode"></i> 扫码识别</button>';
    }
    html += '</section>';

    html += '</div>';
    return { html: html, step: 'input', code: pendingCode };
  }

  var HERO_PILL_KEYS = ['alpha-diversity', 'evenness', 'richness'];
  var ORB_ICONS = ['fa-sun', 'fa-tree', 'fa-leaf', 'fa-cloud'];
  var PHYLUM_ACCENT = {
    '放线菌门': 'accent-green',
    '拟杆菌门': 'accent-teal',
    '厚壁菌门': 'accent-rose',
    '梭杆菌门': 'accent-olive',
    '变形菌门': 'accent-plum'
  };

  function greetingName() {
    var user = H.getCurrentUser();
    return H.stripDemo(user && user.name ? user.name : '你好');
  }

  function speciesNoun(species) {
    return species === 'dog' ? '狗狗' : '猫咪';
  }

  function dimTag(score) {
    if (score == null || score === '') return null;
    var n = Number(score);
    if (n >= 70) return { text: '强健', cls: 'qual-strong' };
    if (n >= 40) return { text: '中等', cls: 'qual-mid' };
    return { text: '偏弱', cls: 'qual-weak' };
  }

  function prettyNum(value) {
    var n = Number(value);
    if (isNaN(n)) return value == null ? '—' : String(value);
    if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
    return n.toFixed(1);
  }

  function clampPct(n) {
    var x = Number(n);
    if (isNaN(x)) return 0;
    return Math.max(0, Math.min(100, x));
  }

  function displayName(item) {
    if (!item) return '';
    var label = item.label || item.key || '';
    return String(label).replace(/属$/, '');
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

  function renderCompareRows(entries, species) {
    var html = '';
    entries.forEach(function (entry) {
      var ind = entry.indicator;
      if (!ind || !H.shouldShowIndicator(ind)) return;
      var pres = entry.presentation || H.evaluateIndicatorPresentation(ind, entry.finding, species);
      if (!pres.showValue) return;
      var range = H.resolveIndicatorRange(ind, species);
      var value = clampPct(ind.value);
      var out = pres.statusClass === 'status-high' || pres.statusClass === 'status-low';
      var min = range && range.min != null ? clampPct(range.min) : 0;
      var max = range && range.max != null ? clampPct(range.max) : 0;
      var bandWidth = range ? Math.max(2, max - min) : 0;
      html += '<div class="cmp-row">';
      html += '<div class="cmp-side is-range">';
      html += '<div class="cmp-track">';
      if (range) {
        html += '<span class="cmp-band" style="right:' + min + '%;width:' + bandWidth + '%"></span>';
      }
      html += '</div></div>';
      html += '<div class="cmp-name">' + esc(displayName(entry.taxon || { label: H.getIndicatorLabel(ind.key) })) + '</div>';
      html += '<div class="cmp-side is-actual">';
      html += '<div class="cmp-track">';
      html += '<span class="cmp-bar' + (out ? ' is-out' : '') + '" style="width:' + value + '%"></span>';
      html += '</div></div></div>';
    });
    return html;
  }

  function renderCompareSection(tree, petName, species) {
    var phylumEntries = tree.filter(function (n) { return n.hasResult; }).map(function (n) {
      return { taxon: n.taxon, indicator: n.indicator, finding: n.finding, presentation: n.presentation };
    });
    var genusEntries = [];
    tree.forEach(function (n) {
      n.genusResults.forEach(function (g) {
        genusEntries.push({ taxon: g.taxon, indicator: g.indicator, finding: g.finding, presentation: g.presentation });
      });
    });
    if (!phylumEntries.length && !genusEntries.length) return '';

    var html = '<section class="sheet-block compare-block">';
    html += '<div class="sheet-head">';
    html += '<h3>微生物组对比</h3>';
    html += '<p>理想菌群组合 VS ' + esc(petName) + '</p>';
    html += '</div>';
    html += '<div class="seg-tabs" role="tablist">';
    html += '<button type="button" class="seg-tab active" data-compare-tab="phylum">「门」检测数值</button>';
    html += '<button type="button" class="seg-tab" data-compare-tab="genus">「属」检测数值</button>';
    html += '</div>';
    html += '<div class="cmp-card" data-compare-panel="phylum">';
    html += '<div class="cmp-cols"><span>门（正常范围）</span><span>' + esc(petName) + '</span></div>';
    html += renderCompareRows(phylumEntries, species);
    html += '<div class="cmp-axis"><span>100%</span><span>0%</span><span>0%</span><span>100%</span></div>';
    html += '</div>';
    html += '<div class="cmp-card" data-compare-panel="genus" hidden>';
    html += '<div class="cmp-cols"><span>属（正常范围）</span><span>' + esc(petName) + '</span></div>';
    html += renderCompareRows(genusEntries, species);
    html += '<div class="cmp-axis"><span>100%</span><span>0%</span><span>0%</span><span>100%</span></div>';
    html += '</div></section>';
    return html;
  }

  function renderInlinePrimaryProduct(rec) {
    if (!rec) return '';
    var display = H.resolveRecDisplay(rec);
    if (!display.primaryProductId && !display.primaryProduct) return '';

    var product = display.primaryProduct;
    var name = product ? H.stripDemo(product.name) : '推荐商品';
    var navAttr = display.isPrimaryOnSale
      ? ' data-nav="spu-detail" data-product-id="' + esc(display.primaryProductId) + '"'
      : ' data-nav="recommendation-target" data-rec-id="' + esc(rec.id) + '"';

    var html = '<button type="button" class="advice-product-inline rec-primary-card"' + navAttr + '>';
    html += '<div class="rec-primary-icon"><i class="fas fa-box-open"></i></div>';
    html += '<div class="rec-primary-main">';
    html += '<div class="rec-primary-name">' + esc(name) + '</div>';
    html += '<span class="badge ' + H.productStatusClass(product) + '">' + esc(H.productStatusLabel(product)) + '</span>';
    html += '</div>';
    html += '<i class="fas fa-chevron-right list-chevron"></i>';
    html += '</button>';
    return html;
  }

  function renderAdvicePair(node, reportId) {
    var analysis = node.finding ? H.stripDemo(node.finding.professional || node.finding.description) : '';
    var advice = node.finding ? H.stripDemo(node.finding.consumer) : '';
    var rec = node.finding ? H.getFindingRecommendation(node.finding.id) : null;
    var productHtml = rec ? renderInlinePrimaryProduct(rec) : '';
    if (!analysis && !advice && !productHtml) return '';

    if (analysis && (advice || productHtml)) {
      var html = '<div class="advice-tabs">';
      html += '<button type="button" class="advice-tab" data-advice-tab="analysis"><i class="fas fa-clock-rotate-left"></i> 分析</button>';
      html += '<button type="button" class="advice-tab active" data-advice-tab="advice"><i class="fas fa-lightbulb"></i> 总体建议</button>';
      html += '</div>';
      html += '<div class="advice-panel" data-advice-panel="analysis" hidden>';
      html += '<p>' + esc(analysis) + '</p></div>';
      html += '<div class="advice-panel" data-advice-panel="advice">';
      if (advice) html += '<p>' + esc(advice) + '</p>';
      html += productHtml;
      html += '</div>';
      return html;
    }

    if (analysis) {
      return '<div class="advice-panel" data-advice-panel="analysis">' +
        '<p class="advice-single-label"><i class="fas fa-clock-rotate-left"></i> 分析</p>' +
        '<p>' + esc(analysis) + '</p></div>';
    }

    var adviceHtml = '<div class="advice-panel" data-advice-panel="advice">';
    adviceHtml += '<p class="advice-single-label"><i class="fas fa-lightbulb"></i> 总体建议</p>';
    if (advice) adviceHtml += '<p>' + esc(advice) + '</p>';
    adviceHtml += productHtml;
    adviceHtml += '</div>';
    return adviceHtml;
  }

  function renderPhylumPanels(tree, petName, theme, species, reportId) {
    if (!tree.length) return '';
    var html = '<section class="sheet-block phylum-block">';
    html += '<div class="phylum-tabs" role="tablist">';
    tree.forEach(function (node, idx) {
      var accent = PHYLUM_ACCENT[node.taxon.key] || 'accent-teal';
      html += '<button type="button" class="phylum-tab ' + accent + (idx === 0 ? ' active' : '') + '" data-phylum-tab="' + esc(node.taxon.key) + '">' +
        esc(node.taxon.label) + '</button>';
    });
    html += '</div>';

    tree.forEach(function (node, idx) {
      var accent = PHYLUM_ACCENT[node.taxon.key] || 'accent-teal';
      var packed = H.getTaxonEdu(node.taxon.key);
      var edu = packed ? packed.edu : H.emptyTaxonEdu();
      var latinName = packed && packed.latinName ? packed.latinName : '';
      var sceneCopy = String(edu.sceneCopy || '').trim();
      var genera = node.genusResults;
      html += '<div class="phylum-panel" data-phylum-panel="' + esc(node.taxon.key) + '"' + (idx === 0 ? '' : ' hidden') + '>';
      html += '<div class="phylum-hero ' + accent + '">';
      html += '<div class="phylum-mark"><i class="fas fa-bacteria"></i></div>';
      html += '<div class="phylum-hero-main">';
      html += '<div class="phylum-hero-name">' + esc(node.taxon.label);
      if (latinName) html += ' <span class="phylum-latin">(' + esc(latinName) + ')</span>';
      html += ' <button type="button" class="icon-q" data-open-know="intro" data-know-key="' + esc(node.taxon.key) + '"' +
        ' aria-label="了解' + esc(node.taxon.label) + '">?</button></div>';
      var valueAlert = node.presentation && (node.presentation.statusClass === 'status-high' || node.presentation.statusClass === 'status-low');
      html += '<div class="phylum-hero-value' + (valueAlert ? ' is-alert' : '') + '">' + esc(prettyNum(node.indicator && node.indicator.value)) + '<small>%</small></div>';
      if (node.presentation && node.presentation.rangeText) {
        html += '<div class="phylum-hero-range">正常范围: ' + esc(node.presentation.rangeText.replace(/%/g, '')) + '%</div>';
      }
      html += '</div></div>';

      if (sceneCopy) {
        var story = H.buildMicrobiotaStorySentence({
          petName: petName,
          themeName: theme.name,
          sceneCopy: sceneCopy,
          taxonLabel: node.taxon.label,
          statusClass: node.presentation && node.presentation.statusClass
        });
        if (story) {
          html += '<div class="story-card ' + accent + '">';
          html += '<p>' + esc(story) + '</p>';
          html += '</div>';
        }
      }

      html += '<div class="phylum-edu-actions">';
      html += '<button type="button" class="text-link" data-open-know="genera" data-know-key="' + esc(node.taxon.key) + '">包含哪些属</button>';
      html += '</div>';

      if (genera.length) {
        html += '<h4 class="genus-heading">' + esc(node.taxon.label) + '中属的分析：</h4>';
        html += '<div class="genus-pills">';
        genera.forEach(function (g, gi) {
          html += '<button type="button" class="genus-pill' + (gi === 0 ? ' active' : '') + '" data-genus-tab="' + esc(g.taxon.key) + '">' +
            esc(displayName(g.taxon)) +
            ' <span class="icon-q" data-open-know="genus" data-know-key="' + esc(g.taxon.key) + '"' +
            ' role="button" aria-label="了解' + esc(displayName(g.taxon)) + '">?</span></button>';
        });
        html += '</div>';
        genera.forEach(function (g, gi) {
          var gPacked = H.getTaxonEdu(g.taxon.key);
          var gEdu = gPacked ? gPacked.edu : H.emptyTaxonEdu();
          var gKnowledge = String(gEdu.functionText || gEdu.knowledgeText || '').trim();
          html += '<div class="genus-card" data-genus-panel="' + esc(g.taxon.key) + '"' + (gi === 0 ? '' : ' hidden') + '>';
          html += '<div class="genus-value-row">';
          html += '<span>检测值: <strong>' + esc(prettyNum(g.indicator && g.indicator.value)) + '%</strong></span>';
          if (g.presentation && g.presentation.rangeText) {
            html += '<span class="muted">（正常范围: ' + esc(g.presentation.rangeText.replace(/%/g, '')) + '%）</span>';
          }
          html += '</div>';
          if (gKnowledge) html += '<p>' + esc(gKnowledge) + '</p>';
          html += '<button type="button" class="text-link" data-open-know="genus" data-know-key="' + esc(g.taxon.key) + '">了解这个属</button>';
          html += '</div>';
        });
      }

      html += renderAdvicePair(node, reportId);
      html += '</div>';
    });

    html += '</section>';
    return html;
  }

  function renderReportHero(theme, pet, version, overlay, partitioned, tree, species) {
    var level = version.healthLevel || 'C';
    var petName = pet ? H.stripDemo(pet.name) : 'TA';
    var pills = HERO_PILL_KEYS.map(function (key) {
      return partitioned.regular.find(function (ind) { return ind.key === key; }) ||
        partitioned.microbiota.find(function (ind) { return ind.key === key; });
    }).filter(Boolean);
    var orbs = tree.slice(0, 4);
    var dims = overlay.dimensions || [];
    var emotion = dims.find(function (d) { return d.key === 'emotion'; });
    var immunity = dims.find(function (d) { return d.key === 'immunity'; });
    var percentile = overlay.percentile != null ? overlay.percentile : version.percentile;
    var html = '<section class="report-hero">';
    html += '<div class="hero-copy">';
    html += '<p class="hero-hi">Hi, ' + esc(greetingName()) + '</p>';
    html += '<p class="hero-grade">TA的健康综合评分 <strong>' + esc(level) + '等</strong> (' + esc(theme.name) + ')';
    html += ' <button type="button" class="icon-q on-dark" data-open-grade-info aria-label="等级说明">i</button></p>';
    html += '</div>';

    if (pills.length) {
      html += '<div class="hero-pills">';
      pills.forEach(function (ind) {
        html += '<div class="hero-pill"><span class="hero-pill-num">' + esc(prettyNum(ind.value)) + '</span>';
        html += '<span class="hero-pill-label">' + esc(H.getIndicatorLabel(ind.key)) + '</span></div>';
      });
      html += '</div>';
    }

    html += '<div class="hero-scene" aria-hidden="true">';
    html += '<div class="scene-glow"></div>';
    html += '<div class="scene-ground"></div>';
    html += '<div class="scene-pet"><i class="fas ' + (pet ? H.petSpeciesIcon(pet) : 'fa-paw') + '"></i></div>';
    orbs.forEach(function (node, idx) {
      var pres = node.presentation;
      var shortTag = '';
      if (pres && pres.statusClass === 'status-high') shortTag = '偏高';
      else if (pres && pres.statusClass === 'status-low') shortTag = '偏低';
      html += '<div class="scene-orb orb-' + idx + '">';
      html += '<i class="fas ' + ORB_ICONS[idx % ORB_ICONS.length] + '"></i>';
      html += '<em>' + esc(prettyNum(node.indicator && node.indicator.value)) + '</em>';
      if (shortTag) html += '<span class="orb-tag' + (shortTag === '偏低' ? ' is-low' : '') + '">' + esc(shortTag) + '</span>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="hero-dims">';
    if (emotion) {
      var eTag = dimTag(emotion.score);
      html += '<div class="dim-card"><span class="dim-kicker">情绪</span><strong>' + esc(prettyNum(emotion.score)) + '</strong>';
      if (eTag) html += '<span class="qual-tag ' + eTag.cls + '">' + esc(eTag.text) + '</span>';
      html += '</div>';
    }
    if (immunity) {
      var iTag = dimTag(immunity.score);
      html += '<div class="dim-card"><span class="dim-kicker">免疫</span><strong>' + esc(prettyNum(immunity.score)) + '</strong>';
      if (iTag) html += '<span class="qual-tag ' + iTag.cls + '">' + esc(iTag.text) + '</span>';
      html += '</div>';
    }
    html += '</div>';

    if (percentile != null && percentile !== '') {
      html += '<div class="hero-percentile">优于 <strong>' + esc(prettyNum(percentile)) + '%</strong> 的' + esc(speciesNoun(species)) + '</div>';
    }

    html += '<button type="button" class="hero-more" data-scroll-target="report-sheet">详细 <i class="fas fa-chevron-down"></i></button>';
    html += '</section>';

    html += '<div class="grade-info-layer" id="grade-info-layer" hidden>';
    html += '<div class="know-card">';
    html += '<button type="button" class="know-close" data-close-grade-info aria-label="关闭">×</button>';
    html += '<h3>综合等级</h3>';
    html += '<p>A 雨林 · B 森林 · C 草原 · D 苔藓 · E 沙漠。等级由审核填写，只决定报告主题，不与综合分强制对应。</p>';
    html += '</div></div>';
    return html;
  }

  function renderReport(params) {
    var ctx = H.getPublishedReportContext(params.reportId);
    if (!ctx) {
      return '<div class="page-shell"><div class="empty-hint"><p>未找到报告或无权查看</p></div></div>';
    }

    var report = ctx.report;
    var version = ctx.version;
    var pet = H.findPet(report.petId);
    var species = H.getReportSpecies(report.id);
    var level = version.healthLevel || 'C';
    var theme = H.getThemeConfig(level);
    var overlay = H.getSnapshotPresentation(report.id) || {
      percentile: null,
      dimensions: [],
      summaryItems: [],
      benchmarks: {}
    };
    var partitioned = H.partitionReportIndicators(report.id, ctx.verNum);
    var microbiotaTree = H.buildMicrobiotaTree(report.id, ctx.verNum);
    var petName = pet ? H.stripDemo(pet.name) : 'TA';

    var html = '<div class="report-reading ' + esc(theme.sceneClass) + '" data-report-theme="' + esc(theme.sceneClass) + '">';
    html += renderReportHero(theme, pet, version, overlay, partitioned, microbiotaTree, species);
    html += '<div class="report-sheet" id="report-sheet">';
    html += renderCompareSection(microbiotaTree, petName, species);
    html += renderPhylumPanels(microbiotaTree, petName, theme, species, report.id);

    html += '</div>';
    html += '<div class="know-layer" id="report-know" hidden>';
    html += '<div class="know-card">';
    html += '<button type="button" class="know-close" data-close-know aria-label="关闭">×</button>';
    html += '<h3 id="know-title"></h3>';
    html += '<div id="know-body"></div>';
    html += '</div></div>';
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

    if (rec) {
      var display = H.resolveRecDisplay(rec);
      html += '<section class="report-panel advice-panel">';
      html += '<div class="section-head"><h3>健康建议</h3></div>';
      html += '<p class="body-text">' + esc(display.label) + '</p>';
      if (display.reason && display.reason !== display.label) {
        html += '<p class="hint-text">' + esc(display.reason) + '</p>';
      }
      if (!H.isInvalidDataStatus(finding.dataStatus)) {
        html += renderInlinePrimaryProduct(rec);
      }
      html += '</section>';
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
      html += '<p class="hint-text">关联发现：' + esc(rec.findingId) + '</p>';
    }
    html += '</section>';

    if (display.primaryProductId || display.primaryProduct) {
      var primary = display.primaryProduct;
      var primaryName = primary ? H.stripDemo(primary.name) : '推荐商品';
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>推荐商品</h3></div>';
      html += '<div class="rec-primary-card rec-primary-card-static">';
      html += '<div class="rec-primary-icon"><i class="fas fa-box-open"></i></div>';
      html += '<div class="rec-primary-main">';
      html += '<div class="rec-primary-name">' + esc(primaryName) + '</div>';
      html += '<span class="badge ' + H.productStatusClass(primary) + '">' + esc(H.productStatusLabel(primary)) + '</span>';
      if (primary && primary.stock != null) {
        html += '<div class="rec-primary-stock hint-text">库存 ' + esc(String(primary.stock)) + '</div>';
      }
      html += '</div></div>';
      if (display.reason) {
        html += '<p class="hint-text rec-config-reason">配置原因：' + esc(display.reason) + '</p>';
      }
      if (primary) {
        html += '<button type="button" class="btn-secondary" data-nav="spu-detail" data-product-id="' + esc(display.primaryProductId) + '">查看 SPU 详情</button>';
      }
      html += '</section>';
    }

    if (display.relatedProducts && display.relatedProducts.length) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>相关推荐</h3></div>';
      html += '<div class="rec-related-list">';
      display.relatedProducts.forEach(function (item) {
        var prod = item.product;
        var prodName = prod ? H.stripDemo(prod.name) : String(item.productId);
        html += '<button type="button" class="rec-related-item actionable" data-nav="spu-detail" data-product-id="' + esc(item.productId) + '">';
        html += '<div class="rec-primary-icon sm"><i class="fas fa-box-open"></i></div>';
        html += '<div class="rec-primary-main">';
        html += '<div class="rec-primary-name">' + esc(prodName) + '</div>';
        html += '<span class="badge ' + H.productStatusClass(prod) + '">' + esc(H.productStatusLabel(prod)) + '</span>';
        html += '</div>';
        html += '<i class="fas fa-chevron-right list-chevron"></i>';
        html += '</button>';
      });
      html += '</div></section>';
    } else if (!display.primaryProductId && !display.primaryProduct) {
      html += '<section class="section-block">';
      html += '<div class="section-head"><h3>商品推荐</h3></div>';
      html += '<div class="advice-card"><i class="fas fa-heart-pulse"></i>';
      html += '<p>当前暂无可用商品，请优先参考健康建议</p></div>';
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
