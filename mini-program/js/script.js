/* global PetReportMockStore, PetMiniHelpers, PetMiniPages */
(function () {
  'use strict';

  var H = PetMiniHelpers;
  var P = PetMiniPages;

  var PAGE_TITLES = {
    home: '首页',
    profile: '我的',
    pets: '宠物',
    'pet-reports': '宠物详情',
    'pet-detail': '宠物详情',
    report: '报告详情',
    finding: '发现详情',
    metrics: '全部指标',
    recommendations: '建议与推荐',
    'recommendation-target': '推荐详情',
    'spu-detail': 'SPU 详情'
  };

  var MAIN_PAGES = ['home', 'pets', 'profile'];
  var DEPRECATED_PAGES = ['progress', 'history', 'reports', 'claim'];

  var navTitle = null;
  var backButton = null;
  var tabBar = null;
  var navBar = null;
  var statusBar = null;
  var frame = null;
  var tabItems = [];
  var pageContainer = null;
  var unsubscribe = null;

  function parseRoute() {
    var raw = location.hash.replace(/^#\/?/, '') || 'home';
    var qIndex = raw.indexOf('?');
    var path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    var queryStr = qIndex >= 0 ? raw.slice(qIndex + 1) : '';
    var params = {};
    if (queryStr) {
      queryStr.split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    var segments = path.split('/').filter(Boolean);
    return {
      page: segments[0] || 'home',
      id: segments[1] || params.id || null,
      params: params
    };
  }

  function buildHash(page, id, params) {
    var base = page;
    if (id) base += '/' + encodeURIComponent(id);
    var queryParts = [];
    if (params) {
      Object.keys(params).forEach(function (key) {
        if (params[key] != null && params[key] !== '' && key !== 'id') {
          queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
      });
    }
    return '#' + base + (queryParts.length ? '?' + queryParts.join('&') : '');
  }

  function navigate(page, id, params, replace) {
    var hash = buildHash(page, id, params);
    if (replace) {
      location.replace(hash);
    } else if (location.hash !== hash) {
      location.hash = hash;
    } else {
      renderCurrentRoute();
    }
  }

  function isMainPage(page) {
    return MAIN_PAGES.indexOf(page) >= 0;
  }

  function redirectLegacyRoute(route) {
    if (route.page === 'reports' || route.page === 'claim') {
      navigate('pets', null, null, true);
      return true;
    }
    if (route.page === 'pet-detail' && route.id) {
      navigate('pet-reports', route.id, null, true);
      return true;
    }
    if (DEPRECATED_PAGES.indexOf(route.page) >= 0) {
      navigate('pets', null, null, true);
      return true;
    }
    return false;
  }

  function setActiveTab(page) {
    tabItems.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.page === page);
    });
  }

  function updateChrome(route) {
    var main = isMainPage(route.page);
    var immersive = route.page === 'report';
    navTitle.textContent = immersive ? '' : (PAGE_TITLES[route.page] || 'PET 小程序');
    backButton.classList.toggle('hidden', main);
    tabBar.classList.toggle('hidden', !main);
    pageContainer.classList.toggle('main-tab', main);
    pageContainer.classList.toggle('sub-page', !main);
    if (frame) {
      if (!immersive) {
        frame.classList.remove('is-immersive');
        frame.removeAttribute('data-report-theme');
      }
    }
    if (main) setActiveTab(route.page);
  }

  function applyImmersiveTheme() {
    if (!frame) return;
    var reading = pageContainer.querySelector('.report-reading');
    if (!reading) {
      frame.classList.remove('is-immersive');
      frame.removeAttribute('data-report-theme');
      frame.querySelectorAll('.know-layer, .grade-info-layer').forEach(function (el) { el.remove(); });
      return;
    }
    frame.classList.add('is-immersive');
    frame.setAttribute('data-report-theme', reading.getAttribute('data-report-theme') || '');
  }

  function bindReportSurface(route) {
    var root = pageContainer.querySelector('.report-reading');
    if (!root) return;

    function activate(scope, btnSel, keyAttr, panelSel, panelAttr, key) {
      scope.querySelectorAll(btnSel).forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute(keyAttr) === key);
      });
      scope.querySelectorAll(panelSel).forEach(function (panel) {
        panel.hidden = panel.getAttribute(panelAttr) !== key;
      });
    }

    root.querySelectorAll('[data-compare-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.compare-block') || root;
        activate(block, '[data-compare-tab]', 'data-compare-tab', '[data-compare-panel]', 'data-compare-panel', btn.getAttribute('data-compare-tab'));
      });
    });

    root.querySelectorAll('[data-phylum-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.phylum-block') || root;
        activate(block, '[data-phylum-tab]', 'data-phylum-tab', '[data-phylum-panel]', 'data-phylum-panel', btn.getAttribute('data-phylum-tab'));
      });
    });

    root.querySelectorAll('[data-genus-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = btn.closest('.phylum-panel') || root;
        activate(panel, '[data-genus-tab]', 'data-genus-tab', '[data-genus-panel]', 'data-genus-panel', btn.getAttribute('data-genus-tab'));
      });
    });

    root.querySelectorAll('[data-advice-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = btn.closest('.phylum-panel') || root;
        activate(panel, '[data-advice-tab]', 'data-advice-tab', '[data-advice-panel]', 'data-advice-panel', btn.getAttribute('data-advice-tab'));
      });
    });

    var know = document.getElementById('report-know');
    var knowTitle = document.getElementById('know-title');
    var knowBody = document.getElementById('know-body');
    var knowCarousel = null;
    if (know) (frame || pageContainer).appendChild(know);

    function reportThemeContext() {
      var ctx = H.getPublishedReportContext(route.id);
      var pet = ctx && ctx.report ? H.findPet(ctx.report.petId) : null;
      var level = ctx && ctx.version && ctx.version.healthLevel ? ctx.version.healthLevel : 'C';
      return {
        pet: pet ? H.stripDemo(pet.name) : 'TA',
        theme: H.getThemeConfig(level).name
      };
    }

    function knowFillVars(packed) {
      var themeCtx = reportThemeContext();
      var detail = packed && packed.taxon && route.id
        ? H.getIndicatorDetailContext(route.id, packed.taxon.key)
        : null;
      var value = '';
      if (detail && detail.indicator && detail.indicator.value != null && detail.indicator.value !== '') {
        value = String(detail.indicator.value);
      }
      return {
        pet: themeCtx.pet,
        theme: themeCtx.theme,
        taxon: packed && packed.taxon ? (packed.taxon.label || packed.taxon.key || '') : '',
        value: value,
        latin: packed && packed.latinName ? packed.latinName : ''
      };
    }

    function escText(text) {
      return H.escapeHtml(text == null ? '' : String(text));
    }

    function statusClassForTaxon(key) {
      if (!route.id || !key) return '';
      var detail = H.getIndicatorDetailContext(route.id, key);
      return detail && detail.presentation ? detail.presentation.statusClass : '';
    }

    function renderStatusHint(edu, statusClass) {
      var hint = H.resolveTaxonNodeHint(edu, statusClass);
      if (!hint) return '';
      return '<div class="know-section know-alert"><h4>当前状态提示</h4><p class="know-body-text">' +
        escText(hint) + '</p></div>';
    }

    function renderPhylumIntroBody(packed, statusClass) {
      var edu = packed.edu || H.emptyTaxonEdu();
      var html = '';
      var intro = String(edu.introText || edu.knowledgeText || '').trim();
      if (intro) {
        html += '<p class="know-body-text">' + escText(intro) + '</p>';
      }
      var tasks = Array.isArray(edu.mainTasks)
        ? edu.mainTasks.filter(function (task) { return String(task || '').trim(); })
        : [];
      if (tasks.length) {
        html += '<div class="know-section"><h4>主要工作</h4><ul class="know-tasks">';
        tasks.forEach(function (task) {
          html += '<li>' + escText(task) + '</li>';
        });
        html += '</ul></div>';
      }
      html += renderStatusHint(edu, statusClass);
      return html;
    }

    function renderGenusBody(packed, statusClass) {
      var edu = packed.edu || H.emptyTaxonEdu();
      var html = '';
      var role = String(edu.sceneCopy || '').trim();
      if (role) {
        html += '<div class="know-section"><h4>在菌群中的角色</h4><p class="know-body-text">' +
          escText(role) + '</p></div>';
      }
      var appearance = String(edu.appearanceText || '').trim();
      if (appearance) {
        html += '<div class="know-section"><h4>外观</h4><p class="know-body-text">' +
          escText(appearance) + '</p></div>';
      }
      var func = String(edu.functionText || edu.knowledgeText || '').trim();
      if (func) {
        html += '<div class="know-section"><h4>功能</h4><p class="know-body-text">' +
          escText(func) + '</p></div>';
      }
      html += renderStatusHint(edu, statusClass);
      return html;
    }

    function genusHeading(packed) {
      var label = packed.taxon.label || packed.taxon.key || '';
      if (packed.latinName && packed.latinName !== label) {
        return label + ' (' + packed.latinName + ')';
      }
      return label;
    }

    function renderGeneraSlide(items, index, phylumVars) {
      var taxon = items[index];
      var packed = H.getTaxonEdu(taxon.key) || {
        taxon: taxon,
        latinName: taxon.latinName || '',
        edu: H.emptyTaxonEdu()
      };
      var statusClass = statusClassForTaxon(taxon.key);
      var html = '<div class="know-carousel">';
      html += '<div class="know-slide">';
      html += '<div class="know-slide-name">' + H.escapeHtml(taxon.label || taxon.key || '');
      if (packed.latinName) {
        html += ' <span class="know-latin">(' + H.escapeHtml(packed.latinName) + ')</span>';
      }
      html += '</div>';
      html += renderGenusBody(packed, statusClass);
      html += '</div>';
      if (items.length > 1) {
        html += '<div class="know-pager">';
        html += '<button type="button" class="know-pager-btn" data-know-prev>上一属</button>';
        html += '<div class="know-dots">';
        items.forEach(function (_, i) {
          html += '<button type="button" class="know-dot' + (i === index ? ' active' : '') + '" data-know-dot="' + i + '" aria-label="第' + (i + 1) + '属"></button>';
        });
        html += '</div>';
        html += '<button type="button" class="know-pager-btn" data-know-next>下一属</button>';
        html += '</div>';
      }
      html += '</div>';
      return html;
    }

    function paintKnow(mode, key) {
      if (!know) return;
      knowCarousel = null;
      var packed = H.getTaxonEdu(key);
      if (mode === 'genera') {
        var children = H.listChildGenera(key);
        var titleLabel = packed && packed.taxon ? (packed.taxon.label || packed.taxon.key) : key;
        if (knowTitle) knowTitle.textContent = titleLabel + '包含哪些属';
        if (!children.length) {
          if (knowBody) knowBody.innerHTML = '';
        } else {
          var phylumVars = packed ? knowFillVars(packed) : knowFillVars({
            taxon: { key: key, label: key },
            latinName: '',
            edu: H.emptyTaxonEdu()
          });
          knowCarousel = { items: children, index: 0, vars: phylumVars };
          if (knowBody) knowBody.innerHTML = renderGeneraSlide(children, 0, phylumVars);
        }
        know.hidden = false;
        return;
      }
      if (!packed) {
        if (knowTitle) knowTitle.textContent = key || '';
        if (knowBody) knowBody.innerHTML = '';
        know.hidden = false;
        return;
      }
      if (mode === 'genus') {
        if (knowTitle) knowTitle.textContent = genusHeading(packed);
        if (knowBody) knowBody.innerHTML = renderGenusBody(packed, statusClassForTaxon(key));
      } else {
        if (knowTitle) knowTitle.textContent = '什么是' + (packed.taxon.label || packed.taxon.key || '') + '？';
        if (knowBody) knowBody.innerHTML = renderPhylumIntroBody(packed, statusClassForTaxon(key));
      }
      know.hidden = false;
    }

    root.querySelectorAll('[data-open-know]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!know) return;
        var mode = btn.getAttribute('data-open-know') || 'intro';
        var key = btn.getAttribute('data-know-key') || '';
        paintKnow(mode, key);
      });
    });
    if (know) {
      know.querySelectorAll('[data-close-know]').forEach(function (btn) {
        btn.addEventListener('click', function () { know.hidden = true; });
      });
      know.addEventListener('click', function (e) {
        if (e.target === know) {
          know.hidden = true;
          return;
        }
        if (!knowCarousel || !knowCarousel.items || !knowCarousel.items.length) return;
        var prev = e.target.closest('[data-know-prev]');
        var next = e.target.closest('[data-know-next]');
        var dot = e.target.closest('[data-know-dot]');
        if (!prev && !next && !dot) return;
        e.preventDefault();
        var len = knowCarousel.items.length;
        var idx = knowCarousel.index;
        if (prev) idx = (idx - 1 + len) % len;
        else if (next) idx = (idx + 1) % len;
        else idx = Number(dot.getAttribute('data-know-dot')) || 0;
        knowCarousel.index = idx;
        if (knowBody) knowBody.innerHTML = renderGeneraSlide(knowCarousel.items, idx, knowCarousel.vars);
      });
    }

    var gradeLayer = document.getElementById('grade-info-layer');
    if (gradeLayer) (frame || pageContainer).appendChild(gradeLayer);
    root.querySelectorAll('[data-open-grade-info]').forEach(function (btn) {
      btn.addEventListener('click', function () { if (gradeLayer) gradeLayer.hidden = false; });
    });
    if (gradeLayer) {
      gradeLayer.querySelectorAll('[data-close-grade-info]').forEach(function (btn) {
        btn.addEventListener('click', function () { gradeLayer.hidden = true; });
      });
      gradeLayer.addEventListener('click', function (e) {
        if (e.target === gradeLayer) gradeLayer.hidden = true;
      });
    }

    root.querySelectorAll('[data-scroll-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = document.getElementById(btn.getAttribute('data-scroll-target'));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function showClaimMessage(text, type) {
    var el = document.getElementById('claim-message');
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.className = 'form-message' + (type ? ' ' + type : '');
  }

  function goClaimConfirm(code) {
    navigate('claim', null, { step: 'confirm', code: code });
  }

  function handleClaimPreview() {
    var codeInput = document.getElementById('claim-code');
    var code = codeInput ? codeInput.value.trim() : '';
    showClaimMessage('', '');
    if (!code) {
      showClaimMessage('请输入认领码', 'error');
      return;
    }
    if (!H.previewClaimCode(code)) {
      showClaimMessage(H.CLAIM_INVALID_MSG, 'error');
      return;
    }
    goClaimConfirm(code);
  }

  function handleClaimConfirm(code) {
    showClaimMessage('', '');
    try {
      var result = H.bindClaimCodeForUser(code);
      var tr = result && result.claimCode && result.claimCode.testRecordId
        ? H.findTestRecord(result.claimCode.testRecordId)
        : null;
      var report = tr
        ? H.getState().reports.find(function (r) { return r.testRecordId === tr.id; })
        : null;

      if (report && H.canUserAccessPublishedReport(report.id)) {
        navigate('report', report.id);
        return;
      }
      navigate('reports');
    } catch (err) {
      showClaimMessage(err.message || H.CLAIM_INVALID_MSG, 'error');
    }
  }

  function bindClaimPage(route) {
    var previewBtn = document.getElementById('claim-preview-btn');
    if (previewBtn) previewBtn.addEventListener('click', handleClaimPreview);

    var confirmBtn = document.getElementById('claim-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        handleClaimConfirm(confirmBtn.getAttribute('data-code'));
      });
    }

    var backBtn = document.getElementById('claim-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        var code = route.params.code || '';
        navigate('claim', null, code ? { code: code } : null);
      });
    }

    document.querySelectorAll('.claim-scan-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-claim-code');
        if (!code) {
          var pending = H.getPendingClaimCodes();
          if (!pending.length) {
            showClaimMessage('暂无可识别的待领取检测', 'error');
            return;
          }
          code = pending[0].code;
        }
        if (!H.previewClaimCode(code)) {
          showClaimMessage(H.CLAIM_INVALID_MSG, 'error');
          return;
        }
        goClaimConfirm(code);
      });
    });

    var codeInput = document.getElementById('claim-code');
    if (codeInput) {
      codeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleClaimPreview();
      });
    }
  }

  function bindPageEvents(route) {
    pageContainer.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var target = el.getAttribute('data-nav');
        if (!target) return;

        if (target === 'pets') return navigate('pets');
        if (target === 'pet-reports') return navigate('pet-reports', el.getAttribute('data-pet-id'));
        if (target === 'pet-detail') {
          var legacyPetId = el.getAttribute('data-pet-id');
          if (legacyPetId) return navigate('pet-reports', legacyPetId);
          return navigate('pets');
        }
        if (target === 'report') return navigate('report', el.getAttribute('data-report-id'));
        if (target === 'finding') {
          var findingId = el.getAttribute('data-finding-id');
          if (findingId) return navigate('finding', findingId);
          var reportId = el.getAttribute('data-report-id');
          var indicatorKey = el.getAttribute('data-indicator-key');
          if (reportId && indicatorKey) {
            return navigate('finding', null, { reportId: reportId, indicatorKey: indicatorKey });
          }
          return;
        }
        if (target === 'metrics') return navigate('metrics', el.getAttribute('data-report-id'));
        if (target === 'recommendations') return navigate('recommendations', el.getAttribute('data-report-id'));
        if (target === 'recommendation-target') return navigate('recommendation-target', el.getAttribute('data-rec-id'));
        if (target === 'spu-detail') return navigate('spu-detail', el.getAttribute('data-product-id'));
      });
    });

    pageContainer.querySelectorAll('.module-head').forEach(function (head) {
      if (!head.querySelector('.fa-chevron-down')) return;
      head.addEventListener('click', function () {
        var body = head.nextElementSibling;
        var open = body.classList.toggle('open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        var icon = head.querySelector('.fa-chevron-down');
        if (icon) icon.style.transform = open ? 'rotate(180deg)' : '';
      });
    });

    if (route.page === 'report') bindReportSurface(route);
  }

  function renderCurrentRoute() {
    var route = parseRoute();

    if (redirectLegacyRoute(route)) return;

    if (!PAGE_TITLES[route.page]) {
      navigate('home', null, null, true);
      return;
    }

    updateChrome(route);
    var html = '';

    try {
      switch (route.page) {
        case 'home':
          html = P.renderHome();
          break;
        case 'profile':
          html = P.renderProfile();
          break;
        case 'pets':
          html = P.renderPets();
          break;
        case 'pet-reports':
          html = P.renderPetReports({ petId: route.id });
          break;
        case 'pet-detail':
          html = P.renderPetDetail({ petId: route.id });
          break;
        case 'report':
          html = P.renderReport({ reportId: route.id });
          break;
        case 'finding':
          html = P.renderFinding({
            findingId: route.id,
            reportId: route.params.reportId,
            indicatorKey: route.params.indicatorKey
          });
          break;
        case 'metrics':
          html = P.renderMetrics({ reportId: route.id });
          break;
        case 'recommendations':
          html = P.renderRecommendations({ reportId: route.id });
          break;
        case 'recommendation-target':
          html = P.renderRecommendationTarget({ recId: route.id });
          break;
        case 'spu-detail':
          html = P.renderSpuDetail({ productId: route.id });
          break;
        default:
          html = '<div class="page-shell"><div class="empty-hint"><p>页面不存在</p></div></div>';
      }
    } catch (err) {
      console.error('[mini-program] render error:', err);
      html = '<div class="page-shell"><div class="alert-block">页面渲染失败：' + (err.message || '未知错误') + '</div></div>';
    }

    pageContainer.innerHTML = html;
    applyImmersiveTheme();
    bindPageEvents(route);
    pageContainer.scrollTop = 0;
    if (route.page === 'report' && route.params.view === 'sheet') {
      requestAnimationFrame(function () {
        var sheet = document.getElementById('report-sheet');
        if (sheet) sheet.scrollIntoView({ block: 'start' });
      });
    }
  }

  function init() {
    if (!window.PetReportMockStore) {
      document.body.innerHTML = '<p style="padding:24px;color:#c44d4d;">数据服务未加载，请通过静态服务访问。</p>';
      return;
    }

    navTitle = document.getElementById('nav-title');
    backButton = document.getElementById('back-button');
    tabBar = document.getElementById('tab-bar');
    navBar = document.querySelector('.nav-bar');
    statusBar = document.querySelector('.status-bar');
    frame = document.querySelector('.iphone-frame');
    tabItems = Array.prototype.slice.call(document.querySelectorAll('.tab-item'));
    pageContainer = document.getElementById('page-content-container');

    tabItems.forEach(function (tab) {
      tab.addEventListener('click', function () {
        navigate(tab.dataset.page);
      });
    });

    backButton.addEventListener('click', function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('home');
      }
    });

    window.addEventListener('hashchange', renderCurrentRoute);
    unsubscribe = H.getStore().subscribe(function () {
      renderCurrentRoute();
    });

    if (!location.hash || location.hash === '#') {
      navigate('home', null, null, true);
    } else {
      renderCurrentRoute();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
