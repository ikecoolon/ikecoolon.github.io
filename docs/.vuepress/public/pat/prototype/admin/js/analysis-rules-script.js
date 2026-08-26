function initAnalysisRules() {
  var C = window.PetAdminCommon;
  var store = C && C.store ? C.store() : null;
  var svc = window.dictionaryDataService;
  if (!C || !store || !svc) return;

  svc.ensureDemoCompletionScenario();

  var DEMO = (store.DEMO_LABEL || '[演示 Mock]');
  var RISK_ORDER = { high: 3, medium: 2, low: 1 };
  var STATUS_LABELS = { active: '启用', draft: '草稿', inactive: '停用' };
  var STATUS_COLORS = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-700'
  };

  var selectedReportId = 'report-002';
  var selectedRunId = null;
  var editingRuleId = null;
  var conditionCounter = 0;

  // DOM — tabs
  var tabRules = document.getElementById('tab-rules');
  var tabWorkbench = document.getElementById('tab-workbench');
  var sectionRules = document.getElementById('section-rules');
  var sectionWorkbench = document.getElementById('section-workbench');

  // DOM — rules list
  var rulesListView = document.getElementById('rules-list-view');
  var rulesFormView = document.getElementById('rules-form-view');
  var searchInput = document.getElementById('search-rule');
  var filterStatus = document.getElementById('filter-status');
  var rulesTableBody = document.getElementById('rules-table-body');
  var addNewRuleBtn = document.getElementById('add-new-rule');
  var backToRulesListBtn = document.getElementById('back-to-rules-list');
  var ruleForm = document.getElementById('rule-form');
  var cancelFormBtn = document.getElementById('cancel-form');
  var formTitle = document.getElementById('form-title');
  var conditionTemplate = document.getElementById('condition-template');
  var conditionsContainer = document.getElementById('conditions-container');
  var noConditions = document.getElementById('no-conditions');
  var addConditionBtn = document.getElementById('add-condition-btn');

  // DOM — workbench
  var wbReportSelect = document.getElementById('wb-report-select');
  var wbReportMeta = document.getElementById('wb-report-meta');
  var wbReanalysisBanner = document.getElementById('wb-reanalysis-banner');
  var wbReanalysisText = document.getElementById('wb-reanalysis-text');
  var wbRunAnalysisBtn = document.getElementById('wb-run-analysis');
  var wbRunFirstBtn = document.getElementById('wb-run-first');
  var wbIndicatorsSummary = document.getElementById('wb-indicators-summary');
  var wbRunHistory = document.getElementById('wb-run-history');
  var wbRunSelect = document.getElementById('wb-run-select');
  var wbRunMeta = document.getElementById('wb-run-meta');
  var wbNoRun = document.getElementById('wb-no-run');
  var wbResults = document.getElementById('wb-results');
  var wbRawHits = document.getElementById('wb-raw-hits');
  var wbCombinedResult = document.getElementById('wb-combined-result');
  var wbManualFindings = document.getElementById('wb-manual-findings');
  var wbAddManualFindingBtn = document.getElementById('wb-add-manual-finding');
  var wbFinalProfessional = document.getElementById('wb-final-professional');
  var wbFinalConsumer = document.getElementById('wb-final-consumer');
  var wbFinalHealthAdvice = document.getElementById('wb-final-health-advice');
  var wbSaveFinalBtn = document.getElementById('wb-save-final');

  function getState() {
    return store.getState();
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(str) {
    return C.escapeHtml ? C.escapeHtml(str) : String(str || '');
  }

  function ensureDomainState(state) {
    if (!state.analysisRuleCatalog) state.analysisRuleCatalog = [];
    if (!state.analysisRuns) state.analysisRuns = [];
    if (!state.reportAnalysisAdjustments) state.reportAnalysisAdjustments = {};
  }

  function getCatalog() {
    return getState().analysisRuleCatalog || [];
  }

  function getActiveRules() {
    return getCatalog().filter(function (r) { return r.status === 'active'; });
  }

  function getRunsForReport(reportId) {
    return (getState().analysisRuns || [])
      .filter(function (r) { return r.reportId === reportId; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  function getLatestRun(reportId) {
    var runs = getRunsForReport(reportId);
    return runs.length ? runs[0] : null;
  }

  function computeIndicatorSignature(state, reportId) {
    var indicators = svc.getCurrentIndicatorsForReport(state, reportId);
    return indicators
      .map(function (i) {
        return [i.key, i.dataStatus, i.value, i.version || 1, i.isCurrent].join(':');
      })
      .sort()
      .join('|');
  }

  function computeRulesSignature(state) {
    return getActiveRules()
      .map(function (r) { return r.lineageId + ':v' + r.version + ':' + r.id; })
      .sort()
      .join('|');
  }

  function signaturesChanged(state, reportId) {
    var latest = getLatestRun(reportId);
    if (!latest || !latest.inputSnapshot) return false;
    return latest.inputSnapshot.indicatorSignature !== computeIndicatorSignature(state, reportId) ||
      latest.inputSnapshot.rulesSignature !== computeRulesSignature(state);
  }

  function needsReanalysis(state, reportId) {
    var report = (state.reports || []).find(function (r) { return r.id === reportId; });
    if (!report) return false;
    if (!getLatestRun(reportId)) return false;
    return signaturesChanged(state, reportId);
  }

  function syncPendingReanalysisFlag(state, reportId) {
    var report = (state.reports || []).find(function (r) { return r.id === reportId; });
    if (!report) return;
    if (!report.todoFlags) report.todoFlags = [];
    var pending = signaturesChanged(state, reportId);
    var idx = report.todoFlags.indexOf('pending_reanalysis');
    if (pending && idx < 0) report.todoFlags.push('pending_reanalysis');
    if (!pending && idx >= 0) report.todoFlags.splice(idx, 1);
  }

  function checkAllReportsReanalysis(state) {
    (state.reports || []).forEach(function (r) {
      if (getLatestRun(r.id)) syncPendingReanalysisFlag(state, r.id);
    });
  }

  function buildIndicatorMap(indicators) {
    var map = {};
    indicators.forEach(function (ind) { map[ind.key] = ind; });
    return map;
  }

  function speciesMatches(conditionSpecies, reportSpecies) {
    if (!conditionSpecies) return true;
    var allowed = String(conditionSpecies).split(/[,，]/).map(function (s) { return s.trim().toLowerCase(); });
    var species = (reportSpecies || '').toLowerCase();
    var labels = { cat: '猫', dog: '狗' };
    return allowed.some(function (a) {
      return a === species || a === labels[species] || a === '通用' || a === 'all';
    });
  }

  function compareNumeric(value, operator, threshold) {
    switch (operator) {
      case '>': return value > threshold;
      case '>=': return value >= threshold;
      case '<': return value < threshold;
      case '<=': return value <= threshold;
      case '=': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  function evaluateCondition(condition, ctx) {
    var ind;
    var val;
    var msg;
    if (condition.type === 'SPECIES') {
      var ok = speciesMatches(condition.species, ctx.species);
      return {
        match: ok,
        message: '物种 ' + ctx.species + (ok ? ' 匹配' : ' 不匹配') + ' [' + (condition.species || '') + ']'
      };
    }
    if (condition.type === 'DATA_STATUS') {
      ind = ctx.indicatorMap[condition.indicatorKey];
      if (!ind) {
        return { match: false, message: '指标「' + condition.indicatorKey + '」不存在' };
      }
      var ds = ind.dataStatus;
      var match = ds === condition.dataStatus;
      return {
        match: match,
        message: condition.indicatorKey + ' 状态 ' + ds + (match ? ' = ' : ' ≠ ') + condition.dataStatus
      };
    }
    if (condition.type === 'NUMERIC_COMPARE') {
      ind = ctx.indicatorMap[condition.indicatorKey];
      if (!ind) {
        return { match: false, message: '指标「' + condition.indicatorKey + '」不存在' };
      }
      if (ind.dataStatus !== 'PRESENT') {
        return {
          match: false,
          message: condition.indicatorKey + ' 状态为 ' + ind.dataStatus + '，不参与数值比较'
        };
      }
      if (ind.value == null || ind.value === '') {
        return { match: false, message: condition.indicatorKey + ' 无有效数值' };
      }
      val = Number(ind.value);
      if (isNaN(val)) {
        return { match: false, message: condition.indicatorKey + ' 数值无效' };
      }
      var matched = compareNumeric(val, condition.operator, Number(condition.value));
      msg = condition.indicatorKey + ': ' + val + (condition.unit || '') + ' ' +
        condition.operator + ' ' + condition.value + (condition.unit || '');
      return { match: matched, message: msg + (matched ? ' ✓' : ' ✗') };
    }
    return { match: false, message: '未知条件类型' };
  }

  function evaluateRule(rule, ctx) {
    var results = (rule.conditions || []).map(function (c) {
      var r = evaluateCondition(c, ctx);
      return { condition: c, match: r.match, message: r.message };
    });
    var matched = rule.conditionLogic === 'ANY'
      ? results.some(function (r) { return r.match; })
      : results.every(function (r) { return r.match; });
    return { matched: matched, conditionResults: results };
  }

  function combineHits(rawHits) {
    var matched = rawHits.filter(function (h) { return h.matched; });
    var byGroup = {};
    matched.forEach(function (hit) {
      var g = hit.conflictGroup || ('solo-' + hit.id);
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(hit);
    });

    var primaryIds = {};
    var supplementary = [];

    Object.keys(byGroup).forEach(function (g) {
      var sorted = byGroup[g].slice().sort(function (a, b) {
        var rd = (RISK_ORDER[b.riskLevel] || 0) - (RISK_ORDER[a.riskLevel] || 0);
        if (rd !== 0) return rd;
        return (b.priority || 0) - (a.priority || 0);
      });
      primaryIds[sorted[0].id] = true;
      sorted.slice(1).forEach(function (h) {
        h.combineStatus = 'superseded_by_conflict';
        supplementary.push(h);
      });
    });

    rawHits.forEach(function (h) {
      if (!h.matched) {
        h.combineStatus = 'not_matched';
      } else if (primaryIds[h.id]) {
        h.combineStatus = 'primary';
      } else if (!h.combineStatus) {
        h.combineStatus = 'superseded_by_conflict';
      }
    });

    var primary = rawHits.filter(function (h) { return h.combineStatus === 'primary'; });

    function dedupeText(parts) {
      var seen = {};
      return parts.filter(function (p) {
        var k = (p || '').trim();
        if (!k || seen[k]) return false;
        seen[k] = true;
        return true;
      });
    }

    var prof = dedupeText(primary.map(function (h) { return h.output && h.output.professional; }));
    var cons = dedupeText(primary.map(function (h) { return h.output && h.output.consumer; }));
    var adv = dedupeText(primary.map(function (h) {
      return h.output && !h.output.isDataIntegrityOnly ? h.output.healthAdvice : '';
    }));

    var supProf = dedupeText(supplementary.map(function (h) { return h.output && h.output.professional; }));

    return {
      primaryFindings: primary.map(function (h) {
        return {
          hitId: h.id,
          ruleName: h.ruleName,
          riskLevel: h.riskLevel,
          professional: h.output.professional,
          consumer: h.output.consumer,
          healthAdvice: h.output.isDataIntegrityOnly ? '' : h.output.healthAdvice
        };
      }),
      supplementaryFindings: supplementary.map(function (h) {
        return { hitId: h.id, ruleName: h.ruleName, professional: h.output.professional };
      }),
      professional: prof.concat(supProf.length ? ['[补充] ' + supProf.join('；')] : []).join('\n'),
      consumer: cons.join('\n'),
      healthAdvice: adv.join('\n')
    };
  }

  function runAnalysis(reportId) {
    return store.updateAnalysisState(function (state) {
      ensureDomainState(state);
      var report = (state.reports || []).find(function (r) { return r.id === reportId; });
      if (!report) throw new Error('report not found');

      var indicators = svc.getCurrentIndicatorsForReport(state, reportId);
      var species = svc.getReportSpecies(state, report);
      var ctx = { species: species, indicators: indicators, indicatorMap: buildIndicatorMap(indicators) };
      var activeRules = (state.analysisRuleCatalog || []).filter(function (r) { return r.status === 'active'; });

      var rawHits = [];
      activeRules.forEach(function (rule) {
        var ev = evaluateRule(rule, ctx);
        if (!ev.matched) return;
        var out = rule.output || {};
        if (out.isDataIntegrityOnly) {
          out = {
            professional: out.professional,
            consumer: out.consumer,
            healthAdvice: '',
            outputMode: out.outputMode,
            isDataIntegrityOnly: true
          };
        }
        rawHits.push({
          id: uid('hit'),
          ruleVersionId: rule.id,
          ruleName: rule.name,
          ruleVersion: rule.version,
          lineageId: rule.lineageId,
          matched: true,
          conditionResults: ev.conditionResults,
          output: Object.assign({}, out),
          riskLevel: rule.riskLevel,
          priority: rule.priority,
          conflictGroup: rule.conflictGroup,
          combineStatus: 'pending',
          manualStatus: 'active'
        });
      });

      var combined = combineHits(rawHits);
      var snapshot = {
        indicatorSignature: computeIndicatorSignature(state, reportId),
        rulesSignature: computeRulesSignature(state),
        workingVersion: report.workingVersion,
        species: species
      };

      var run = {
        id: uid('run'),
        reportId: reportId,
        createdAt: new Date().toISOString(),
        inputSnapshot: snapshot,
        rawHits: rawHits,
        combinedResult: combined,
        adjustments: {
          excludedHits: [],
          manualFindings: [],
          finalContent: {
            professional: combined.professional,
            consumer: combined.consumer,
            healthAdvice: combined.healthAdvice,
            updatedAt: new Date().toISOString()
          }
        }
      };

      state.analysisRuns.push(run);
      state.reportAnalysisAdjustments[reportId] = {
        latestRunId: run.id
      };

      if (!report.todoFlags) report.todoFlags = [];
      var pIdx = report.todoFlags.indexOf('pending_reanalysis');
      if (pIdx >= 0) report.todoFlags.splice(pIdx, 1);

      return run;
    });
  }

  function formatConditions(rule) {
    var logic = rule.conditionLogic === 'ANY' ? 'ANY' : 'ALL';
    var parts = (rule.conditions || []).map(function (c) {
      if (c.type === 'SPECIES') return '物种∈' + (c.species || '');
      if (c.type === 'DATA_STATUS') return c.indicatorKey + ' 状态=' + c.dataStatus;
      if (c.type === 'NUMERIC_COMPARE') {
        return c.indicatorKey + ' ' + c.operator + ' ' + c.value + (c.unit || '');
      }
      return '?';
    });
    return '<span class="text-blue-600 font-medium">' + logic + '</span> ' +
      parts.map(function (p) {
        return '<span class="inline-block bg-gray-100 px-1.5 py-0.5 rounded mr-1 text-xs">' + escapeHtml(p) + '</span>';
      }).join('');
  }

  function formatOutput(rule) {
    var o = rule.output || {};
    var parts = [];
    if (o.professional) parts.push('专业: ' + o.professional.slice(0, 40) + (o.professional.length > 40 ? '…' : ''));
    if (o.consumer) parts.push('通俗: ' + o.consumer.slice(0, 40) + (o.consumer.length > 40 ? '…' : ''));
    if (o.healthAdvice && !o.isDataIntegrityOnly) {
      parts.push('建议: ' + o.healthAdvice.slice(0, 30) + (o.healthAdvice.length > 30 ? '…' : ''));
    }
    if (o.isDataIntegrityOnly) parts.push('<span class="text-amber-600">[数据完整性]</span>');
    return parts.join('<br>') || '—';
  }

  function renderRulesTable() {
    var filter = (searchInput.value || '').trim().toLowerCase();
    var statusF = filterStatus.value;
    var rules = getCatalog().slice().sort(function (a, b) {
      if (a.lineageId !== b.lineageId) return a.lineageId.localeCompare(b.lineageId);
      return b.version - a.version;
    });

    var filtered = rules.filter(function (rule) {
      var hay = [rule.name, rule.description, rule.lineageId].join(' ').toLowerCase();
      (rule.conditions || []).forEach(function (c) {
        hay += ' ' + (c.indicatorKey || '') + ' ' + (c.dataStatus || '') + ' ' + (c.species || '');
      });
      if (rule.output) {
        hay += ' ' + (rule.output.professional || '') + ' ' + (rule.output.consumer || '');
      }
      var matchSearch = !filter || hay.indexOf(filter) >= 0;
      var matchStatus = !statusF || rule.status === statusF;
      return matchSearch && matchStatus;
    });

    if (!filtered.length) {
      rulesTableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500">暂无规则</td></tr>';
      return;
    }

    rulesTableBody.innerHTML = filtered.map(function (rule) {
      return '<tr class="hover:bg-gray-50 align-top">' +
        '<td class="px-3 py-3">' +
          '<div class="font-medium text-sm">' + escapeHtml(rule.name) + '</div>' +
          '<div class="text-xs text-gray-500">谱系 ' + escapeHtml(rule.lineageId) + ' · v' + rule.version + '</div>' +
          '<div class="text-xs text-gray-400 mt-0.5">' + escapeHtml(rule.description || '') + '</div>' +
        '</td>' +
        '<td class="px-3 py-3 text-xs">' + formatConditions(rule) + '</td>' +
        '<td class="px-3 py-3 text-xs">' +
          '风险 <strong>' + escapeHtml(rule.riskLevel) + '</strong><br>' +
          '优先级 ' + rule.priority + '<br>' +
          '冲突组 ' + escapeHtml(rule.conflictGroup || '—') +
        '</td>' +
        '<td class="px-3 py-3 text-xs">' + formatOutput(rule) + '</td>' +
        '<td class="px-3 py-3">' +
          '<span class="inline-flex px-2 py-0.5 rounded text-xs ' + (STATUS_COLORS[rule.status] || '') + '">' +
          (STATUS_LABELS[rule.status] || rule.status) + '</span>' +
        '</td>' +
        '<td class="px-3 py-3 text-xs space-y-1">' +
          (rule.status === 'draft' ? '<button type="button" class="text-blue-600 block rule-edit" data-id="' + rule.id + '">编辑</button>' : '') +
          (rule.status === 'draft' ? '<button type="button" class="text-green-600 block rule-activate" data-id="' + rule.id + '">启用</button>' : '') +
          (rule.status === 'active' ? '<button type="button" class="text-orange-600 block rule-revise" data-id="' + rule.id + '">修订新版本</button>' : '') +
          (rule.status === 'active' ? '<button type="button" class="text-gray-600 block rule-deactivate" data-id="' + rule.id + '">停用</button>' : '') +
          '<button type="button" class="text-purple-600 block rule-copy" data-id="' + rule.id + '">复制草稿</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function showRulesList() {
    rulesListView.classList.remove('hidden');
    rulesFormView.classList.add('hidden');
    editingRuleId = null;
    renderRulesTable();
  }

  function showRulesForm(ruleId) {
    rulesListView.classList.add('hidden');
    rulesFormView.classList.remove('hidden');
    conditionsContainer.innerHTML = '';
    conditionCounter = 0;
    editingRuleId = ruleId || null;

    if (ruleId) {
      var rule = getCatalog().find(function (r) { return r.id === ruleId; });
      if (!rule) return;
      formTitle.textContent = '编辑草稿 v' + rule.version + ' — ' + rule.name;
      document.getElementById('form-rule-name').value = rule.name;
      document.getElementById('form-rule-description').value = rule.description || '';
      document.getElementById('form-conflict-group').value = rule.conflictGroup || '';
      document.getElementById('form-risk-level').value = rule.riskLevel || 'medium';
      document.getElementById('form-priority').value = rule.priority || 10;
      document.getElementById('logic-operator').value = rule.conditionLogic || 'ALL';
      document.getElementById('form-data-integrity-only').checked = !!(rule.output && rule.output.isDataIntegrityOnly);
      document.getElementById('form-professional').value = (rule.output && rule.output.professional) || '';
      document.getElementById('form-consumer').value = (rule.output && rule.output.consumer) || '';
      document.getElementById('form-health-advice').value = (rule.output && rule.output.healthAdvice) || '';
      document.getElementById('form-output-mode').value = (rule.output && rule.output.outputMode) || 'both';
      (rule.conditions || []).forEach(function (c) { addConditionRow(c); });
    } else {
      formTitle.textContent = '新增草稿规则';
      ruleForm.reset();
      document.getElementById('form-priority').value = 10;
      document.getElementById('logic-operator').value = 'ALL';
      addConditionRow({ type: 'NUMERIC_COMPARE', operator: '<', unit: '%' });
    }
    updateConditionsDisplay();
  }

  function updateConditionFields(item, type) {
    var show = function (sel, on) {
      var el = item.querySelector(sel);
      if (el) el.classList.toggle('hidden', !on);
    };
    show('.condition-field-indicator', type !== 'SPECIES');
    show('.condition-field-operator', type === 'NUMERIC_COMPARE');
    show('.condition-field-value', type === 'NUMERIC_COMPARE');
    show('.condition-field-unit', type === 'NUMERIC_COMPARE');
    show('.condition-field-status', type === 'DATA_STATUS');
    show('.condition-field-species', type === 'SPECIES');
  }

  function addConditionRow(data) {
    conditionCounter += 1;
    var node = conditionTemplate.content.cloneNode(true);
    var item = node.querySelector('.condition-item');
    item.dataset.conditionId = String(conditionCounter);
    item.querySelector('.condition-number').textContent = String(conditionCounter);

    var typeSel = item.querySelector('.condition-type');
    var type = (data && data.type) || 'NUMERIC_COMPARE';
    typeSel.value = type;
    updateConditionFields(item, type);

    typeSel.addEventListener('change', function () {
      updateConditionFields(item, typeSel.value);
    });

    if (data) {
      if (data.indicatorKey) item.querySelector('.condition-indicator').value = data.indicatorKey;
      if (data.operator) item.querySelector('.condition-operator').value = data.operator;
      if (data.value != null) item.querySelector('.condition-value').value = data.value;
      if (data.unit) item.querySelector('.condition-unit').value = data.unit;
      if (data.dataStatus) item.querySelector('.condition-data-status').value = data.dataStatus;
      if (data.species) item.querySelector('.condition-species').value = data.species;
    }

    item.querySelector('.remove-condition').addEventListener('click', function () {
      item.remove();
      updateConditionsDisplay();
    });

    conditionsContainer.appendChild(node);
    updateConditionsDisplay();
  }

  function updateConditionsDisplay() {
    var has = conditionsContainer.children.length > 0;
    noConditions.classList.toggle('hidden', has);
    conditionsContainer.classList.toggle('hidden', !has);
    Array.from(conditionsContainer.children).forEach(function (el, i) {
      var num = el.querySelector('.condition-number');
      if (num) num.textContent = String(i + 1);
    });
  }

  function readConditionsFromForm() {
    var list = [];
    conditionsContainer.querySelectorAll('.condition-item').forEach(function (item) {
      var type = item.querySelector('.condition-type').value;
      var cond = { id: uid('cond'), type: type };
      if (type === 'SPECIES') {
        cond.species = item.querySelector('.condition-species').value.trim();
      } else if (type === 'DATA_STATUS') {
        cond.indicatorKey = item.querySelector('.condition-indicator').value.trim();
        cond.dataStatus = item.querySelector('.condition-data-status').value;
      } else {
        cond.indicatorKey = item.querySelector('.condition-indicator').value.trim();
        cond.operator = item.querySelector('.condition-operator').value;
        cond.value = parseFloat(item.querySelector('.condition-value').value);
        cond.unit = item.querySelector('.condition-unit').value.trim();
      }
      if (type === 'SPECIES' ? cond.species : cond.indicatorKey) list.push(cond);
    });
    return list;
  }

  function saveRuleDraft() {
    var name = document.getElementById('form-rule-name').value.trim();
    if (!name) { alert('规则名称不能为空'); return; }
    var conditions = readConditionsFromForm();
    if (!conditions.length) { alert('至少配置一个条件'); return; }

    var payload = {
      name: name,
      description: document.getElementById('form-rule-description').value.trim(),
      conflictGroup: document.getElementById('form-conflict-group').value.trim() || 'general',
      riskLevel: document.getElementById('form-risk-level').value,
      priority: parseInt(document.getElementById('form-priority').value, 10) || 10,
      conditionLogic: document.getElementById('logic-operator').value,
      conditions: conditions,
      output: {
        professional: document.getElementById('form-professional').value.trim(),
        consumer: document.getElementById('form-consumer').value.trim(),
        healthAdvice: document.getElementById('form-health-advice').value.trim(),
        outputMode: document.getElementById('form-output-mode').value,
        isDataIntegrityOnly: document.getElementById('form-data-integrity-only').checked
      }
    };

    if (payload.output.isDataIntegrityOnly) {
      payload.output.healthAdvice = '';
    }

    store.updateAnalysisState(function (state) {
      ensureDomainState(state);
      var now = new Date().toISOString();
      if (editingRuleId) {
        var existing = state.analysisRuleCatalog.find(function (r) { return r.id === editingRuleId; });
        if (!existing || existing.status !== 'draft') {
          alert('只能编辑草稿版本');
          return;
        }
        Object.assign(existing, payload, { updatedAt: now });
      } else {
        state.analysisRuleCatalog.push(Object.assign({
          id: uid('rule'),
          lineageId: 'lineage-' + uid('ln'),
          version: 1,
          status: 'draft',
          createdAt: now,
          updatedAt: now
        }, payload));
      }
    });
    showRulesList();
  }

  function activateRule(ruleId) {
    store.updateAnalysisState(function (state) {
      ensureDomainState(state);
      var rule = state.analysisRuleCatalog.find(function (r) { return r.id === ruleId; });
      if (!rule || rule.status !== 'draft') return;
      state.analysisRuleCatalog.forEach(function (r) {
        if (r.lineageId === rule.lineageId && r.status === 'active') {
          r.status = 'inactive';
          r.updatedAt = new Date().toISOString();
        }
      });
      rule.status = 'active';
      rule.updatedAt = new Date().toISOString();
      checkAllReportsReanalysis(state);
    });
  }

  function deactivateRule(ruleId) {
    store.updateAnalysisState(function (state) {
      var rule = state.analysisRuleCatalog.find(function (r) { return r.id === ruleId; });
      if (!rule || rule.status !== 'active') return;
      rule.status = 'inactive';
      rule.updatedAt = new Date().toISOString();
      checkAllReportsReanalysis(state);
    });
  }

  function reviseRule(ruleId) {
    store.updateAnalysisState(function (state) {
      ensureDomainState(state);
      var source = state.analysisRuleCatalog.find(function (r) { return r.id === ruleId; });
      if (!source || source.status !== 'active') return;
      var maxVer = 0;
      state.analysisRuleCatalog.forEach(function (r) {
        if (r.lineageId === source.lineageId && r.version > maxVer) maxVer = r.version;
      });
      var now = new Date().toISOString();
      var draft = JSON.parse(JSON.stringify(source));
      draft.id = uid('rule');
      draft.version = maxVer + 1;
      draft.status = 'draft';
      draft.createdAt = now;
      draft.updatedAt = now;
      draft.name = source.name + ' (修订)';
      state.analysisRuleCatalog.push(draft);
    });
    C.toast && C.toast('已基于启用版本创建修订草稿', 'info');
  }

  function copyRule(ruleId) {
    store.updateAnalysisState(function (state) {
      ensureDomainState(state);
      var source = state.analysisRuleCatalog.find(function (r) { return r.id === ruleId; });
      if (!source) return;
      var now = new Date().toISOString();
      var copy = JSON.parse(JSON.stringify(source));
      copy.id = uid('rule');
      copy.lineageId = 'lineage-' + uid('ln');
      copy.version = 1;
      copy.status = 'draft';
      copy.name = source.name + ' (副本)';
      copy.createdAt = now;
      copy.updatedAt = now;
      state.analysisRuleCatalog.push(copy);
    });
  }

  function speciesLabel(species) {
    if (species === 'cat') return '猫';
    if (species === 'dog') return '狗';
    return species || '—';
  }

  function renderReportSelect() {
    var state = getState();
    var reports = (state.reports || []).slice();
    wbReportSelect.innerHTML = reports.map(function (r) {
      var pet = C.lookupPet(state, r.petId);
      var label = (r.reportNumber || r.id) + (pet ? ' · ' + pet.name.replace(DEMO + ' ', '') : '');
      return '<option value="' + r.id + '"' + (r.id === selectedReportId ? ' selected' : '') + '>' +
        escapeHtml(label) + '</option>';
    }).join('');
  }

  function renderWorkbench() {
    var state = getState();
    var report = (state.reports || []).find(function (r) { return r.id === selectedReportId; });
    if (!report) {
      wbReportMeta.innerHTML = '<span class="text-red-500">未找到报告</span>';
      return;
    }

    var pet = C.lookupPet(state, report.petId);
    var user = C.lookupUser(state, report.userId);
    var species = svc.getReportSpecies(state, report);
    var indicators = svc.getCurrentIndicatorsForReport(state, report.id);
    var pending = signaturesChanged(state, report.id) ||
      (report.todoFlags || []).indexOf('pending_reanalysis') >= 0;
    var latest = getLatestRun(report.id);
    var runs = getRunsForReport(report.id);

    wbReportMeta.innerHTML =
      '<div><strong>宠物：</strong>' + escapeHtml(pet ? pet.name.replace(DEMO + ' ', '') : '—') +
      '（' + escapeHtml(pet ? pet.breed : '') + '）</div>' +
      '<div><strong>物种：</strong>' + escapeHtml(speciesLabel(species)) + '</div>' +
      '<div><strong>工作版本：</strong>v' + (report.workingVersion || report.currentVersion || 1) + '</div>' +
      '<div><strong>主人：</strong>' + escapeHtml(user ? user.name.replace(DEMO + ' ', '') : '—') + '</div>' +
      '<div><strong>上次运行：</strong>' + (latest ? C.formatDate(latest.createdAt) : '尚无') + '</div>' +
      (pending ? '<div class="text-amber-700 font-medium mt-1"><i class="fas fa-clock mr-1"></i>待重新分析</div>' : '');

    wbReanalysisBanner.classList.toggle('hidden', !pending || !latest);
    wbRunFirstBtn.classList.toggle('hidden', !!latest && pending);
    wbRunAnalysisBtn.classList.toggle('hidden', !pending || !latest);

    if (pending && latest) {
      wbReanalysisText.textContent = '指标签名或启用规则版本已变化，需主动重新分析（不会自动覆盖人工文案）';
    }

    var rows = indicators.map(function (ind) {
      var ev = svc.evaluateIndicatorResult(ind, species);
      var statusCls = ind.dataStatus === 'PRESENT' ? 'text-green-700' :
        ind.dataStatus === 'NOT_DETECTED' ? 'text-orange-700' : 'text-gray-600';
      return '<tr class="border-b">' +
        '<td class="px-2 py-1">' + escapeHtml(ind.key) + '</td>' +
        '<td class="px-2 py-1 ' + statusCls + '">' + escapeHtml(ind.dataStatus) + '</td>' +
        '<td class="px-2 py-1">' + (ind.value != null ? ind.value + (ind.unit || '') : '—') + '</td>' +
        '<td class="px-2 py-1 text-gray-500">' + escapeHtml(ev.label || '') + '</td>' +
      '</tr>';
    }).join('');

    wbIndicatorsSummary.innerHTML = '<table class="min-w-full"><thead><tr class="bg-gray-50">' +
      '<th class="px-2 py-1 text-left">指标</th><th class="px-2 py-1 text-left">状态</th>' +
      '<th class="px-2 py-1 text-left">值</th><th class="px-2 py-1 text-left">判定</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="4" class="px-2 py-2 text-gray-400">无当前指标</td></tr>') +
      '</tbody></table>';

    if (runs.length) {
      wbRunHistory.classList.remove('hidden');
      wbRunSelect.innerHTML = runs.map(function (r, i) {
        return '<option value="' + r.id + '"' + (r.id === (selectedRunId || runs[0].id) ? ' selected' : '') + '>' +
          (i === 0 ? '最新 · ' : '') + C.formatDate(r.createdAt) + ' (' + r.rawHits.length + ' 命中)</option>';
      }).join('');
      if (!selectedRunId || !runs.find(function (r) { return r.id === selectedRunId; })) {
        selectedRunId = runs[0].id;
      }
    } else {
      wbRunHistory.classList.add('hidden');
      selectedRunId = null;
    }

    if (selectedRunId) {
      renderRunResults(selectedRunId);
    } else {
      wbNoRun.classList.remove('hidden');
      wbResults.classList.add('hidden');
    }
  }

  function getRunById(runId) {
    return (getState().analysisRuns || []).find(function (r) { return r.id === runId; });
  }

  function hitStatusLabel(hit, adjustments) {
    var excluded = (adjustments.excludedHits || []).find(function (e) { return e.hitId === hit.id; });
    if (excluded) return { text: '已人工排除', cls: 'bg-red-100 text-red-800', reason: excluded.reason };
    if (hit.combineStatus === 'superseded_by_conflict') {
      return { text: '冲突淘汰', cls: 'bg-gray-200 text-gray-600', reason: '' };
    }
    if (hit.combineStatus === 'primary') return { text: '主结论', cls: 'bg-green-100 text-green-800', reason: '' };
    if (!hit.matched) return { text: '未命中', cls: 'bg-gray-100 text-gray-500', reason: '' };
    return { text: '命中', cls: 'bg-blue-100 text-blue-800', reason: '' };
  }

  function renderRunResults(runId) {
    var run = getRunById(runId);
    if (!run) {
      wbNoRun.classList.remove('hidden');
      wbResults.classList.add('hidden');
      return;
    }

    wbNoRun.classList.add('hidden');
    wbResults.classList.remove('hidden');
    wbRunMeta.textContent = '运行 ' + run.id + ' · 指标签名 ' + (run.inputSnapshot.indicatorSignature || '').slice(0, 24) + '…';

    var adj = run.adjustments || { excludedHits: [], manualFindings: [], finalContent: {} };
    var excludedIds = {};
    (adj.excludedHits || []).forEach(function (e) { excludedIds[e.hitId] = e; });

    wbRawHits.innerHTML = (run.rawHits || []).map(function (hit) {
      var st = hitStatusLabel(hit, adj);
      var condHtml = (hit.conditionResults || []).map(function (cr) {
        return '<li class="text-xs text-gray-600">' + escapeHtml(cr.message || '') + '</li>';
      }).join('');
      return '<div class="border rounded p-3 ' + (excludedIds[hit.id] ? 'opacity-60 bg-red-50' : 'bg-white') + '">' +
        '<div class="flex flex-wrap justify-between gap-2 mb-1">' +
          '<span class="font-medium text-sm">' + escapeHtml(hit.ruleName) + ' <span class="text-gray-400">v' + hit.ruleVersion + '</span></span>' +
          '<span class="inline-flex px-2 py-0.5 rounded text-xs ' + st.cls + '">' + st.text + '</span>' +
        '</div>' +
        '<ul class="mb-2">' + condHtml + '</ul>' +
        '<div class="text-xs text-gray-700">' + escapeHtml((hit.output && hit.output.professional) || '') + '</div>' +
        (st.reason ? '<div class="text-xs text-red-600 mt-1">排除原因：' + escapeHtml(st.reason) + '</div>' : '') +
        '<div class="mt-2 flex gap-2">' +
          (excludedIds[hit.id]
            ? '<button type="button" class="text-xs text-green-600 wb-restore-hit" data-run="' + run.id + '" data-hit="' + hit.id + '">恢复命中</button>'
            : '<button type="button" class="text-xs text-red-600 wb-exclude-hit" data-run="' + run.id + '" data-hit="' + hit.id + '">排除命中</button>') +
        '</div>' +
      '</div>';
    }).join('') || '<p class="text-gray-500 text-sm">本次运行无规则命中</p>';

    var combined = run.combinedResult || {};
    wbCombinedResult.innerHTML =
      '<div><strong>主结论：</strong></div>' +
      '<ul class="list-disc ml-4">' +
      (combined.primaryFindings || []).map(function (f) {
        return '<li>' + escapeHtml(f.ruleName) + ' — ' + escapeHtml(f.professional || '') + '</li>';
      }).join('') +
      '</ul>' +
      (combined.supplementaryFindings && combined.supplementaryFindings.length
        ? '<div class="mt-2"><strong>补充：</strong><ul class="list-disc ml-4">' +
          combined.supplementaryFindings.map(function (f) {
            return '<li class="text-gray-600">' + escapeHtml(f.ruleName) + '</li>';
          }).join('') + '</ul></div>'
        : '') +
      '<div class="mt-2 whitespace-pre-wrap">' + escapeHtml(combined.professional || '') + '</div>' +
      '<div class="mt-1 text-gray-700 whitespace-pre-wrap">' + escapeHtml(combined.consumer || '') + '</div>' +
      (combined.healthAdvice ? '<div class="mt-1 text-teal-800 whitespace-pre-wrap">' + escapeHtml(combined.healthAdvice) + '</div>' : '');

    wbManualFindings.innerHTML = (adj.manualFindings || []).map(function (mf) {
      return '<div class="border border-teal-300 rounded p-2 bg-white text-sm">' +
        '<div class="font-medium text-teal-800">人工发现</div>' +
        '<div>' + escapeHtml(mf.professional || '') + '</div>' +
        (mf.reason ? '<div class="text-xs text-gray-500 mt-1">原因：' + escapeHtml(mf.reason) + '</div>' : '') +
        '<button type="button" class="text-xs text-red-500 mt-1 wb-remove-finding" data-run="' + run.id + '" data-fid="' + mf.id + '">删除</button>' +
      '</div>';
    }).join('');

    var final = adj.finalContent || {};
    wbFinalProfessional.value = final.professional || combined.professional || '';
    wbFinalConsumer.value = final.consumer || combined.consumer || '';
    wbFinalHealthAdvice.value = final.healthAdvice || combined.healthAdvice || '';
  }

  function excludeHit(runId, hitId, reason) {
    store.updateAnalysisState(function (state) {
      var run = (state.analysisRuns || []).find(function (r) { return r.id === runId; });
      if (!run) return;
      if (!run.adjustments) run.adjustments = { excludedHits: [], manualFindings: [], finalContent: {} };
      run.adjustments.excludedHits = (run.adjustments.excludedHits || []).filter(function (e) { return e.hitId !== hitId; });
      run.adjustments.excludedHits.push({ hitId: hitId, reason: reason || '', excludedAt: new Date().toISOString() });
    });
  }

  function restoreHit(runId, hitId) {
    store.updateAnalysisState(function (state) {
      var run = (state.analysisRuns || []).find(function (r) { return r.id === runId; });
      if (!run || !run.adjustments) return;
      run.adjustments.excludedHits = (run.adjustments.excludedHits || []).filter(function (e) { return e.hitId !== hitId; });
    });
  }

  function addManualFinding(runId) {
    var submit = function (professional) {
      var reason = window.prompt(DEMO + ' 补充原因（可选，直接确定跳过）：') || '';
      store.updateAnalysisState(function (state) {
        var run = (state.analysisRuns || []).find(function (r) { return r.id === runId; });
        if (!run) return;
        if (!run.adjustments) run.adjustments = { excludedHits: [], manualFindings: [], finalContent: {} };
        run.adjustments.manualFindings.push({
          id: uid('mf'),
          professional: professional,
          consumer: '',
          reason: reason,
          createdAt: new Date().toISOString()
        });
      });
      renderRunResults(runId);
    };
    if (C.promptDialog) {
      C.promptDialog('补充人工发现 — 专业描述', '', submit);
    } else {
      var text = window.prompt(DEMO + ' 请输入人工发现描述：');
      if (text) submit(text);
    }
  }

  function saveFinalContent(runId) {
    store.updateAnalysisState(function (state) {
      var run = (state.analysisRuns || []).find(function (r) { return r.id === runId; });
      if (!run) return;
      if (!run.adjustments) run.adjustments = { excludedHits: [], manualFindings: [], finalContent: {} };
      run.adjustments.finalContent = {
        professional: wbFinalProfessional.value.trim(),
        consumer: wbFinalConsumer.value.trim(),
        healthAdvice: wbFinalHealthAdvice.value.trim(),
        updatedAt: new Date().toISOString()
      };
    });
    C.toast && C.toast('人工调整已保存', 'success');
  }

  function switchTab(which) {
    var isRules = which === 'rules';
    tabRules.classList.toggle('border-blue-600', isRules);
    tabRules.classList.toggle('text-blue-600', isRules);
    tabRules.classList.toggle('border-transparent', !isRules);
    tabRules.classList.toggle('text-gray-600', !isRules);
    tabWorkbench.classList.toggle('border-blue-600', !isRules);
    tabWorkbench.classList.toggle('text-blue-600', !isRules);
    tabWorkbench.classList.toggle('border-transparent', isRules);
    tabWorkbench.classList.toggle('text-gray-600', isRules);
    sectionRules.classList.toggle('hidden', !isRules);
    sectionWorkbench.classList.toggle('hidden', isRules);
    if (!isRules) renderWorkbench();
  }

  function onStoreChange() {
    var state = getState();
    var flagChanged = false;
    (state.reports || []).forEach(function (r) {
      if (!getLatestRun(r.id)) return;
      var before = (r.todoFlags || []).indexOf('pending_reanalysis') >= 0;
      var after = signaturesChanged(state, r.id);
      if (before !== after) flagChanged = true;
    });
    if (flagChanged) {
      store.updateAnalysisState(function (s) { checkAllReportsReanalysis(s); });
    }
    renderRulesTable();
    if (!sectionWorkbench.classList.contains('hidden')) renderWorkbench();
  }

  // Event bindings
  tabRules.addEventListener('click', function () { switchTab('rules'); });
  tabWorkbench.addEventListener('click', function () { switchTab('workbench'); });

  addNewRuleBtn.addEventListener('click', function () { showRulesForm(null); });
  backToRulesListBtn.addEventListener('click', showRulesList);
  cancelFormBtn.addEventListener('click', showRulesList);
  addConditionBtn.addEventListener('click', function () { addConditionRow(); });

  ruleForm.addEventListener('submit', function (e) {
    e.preventDefault();
    saveRuleDraft();
  });

  searchInput.addEventListener('input', renderRulesTable);
  filterStatus.addEventListener('change', renderRulesTable);

  rulesTableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    if (btn.classList.contains('rule-edit')) showRulesForm(id);
    else if (btn.classList.contains('rule-activate')) activateRule(id);
    else if (btn.classList.contains('rule-deactivate')) deactivateRule(id);
    else if (btn.classList.contains('rule-revise')) reviseRule(id);
    else if (btn.classList.contains('rule-copy')) copyRule(id);
  });

  wbReportSelect.addEventListener('change', function () {
    selectedReportId = wbReportSelect.value;
    selectedRunId = null;
    renderWorkbench();
  });

  wbRunSelect.addEventListener('change', function () {
    selectedRunId = wbRunSelect.value;
    renderRunResults(selectedRunId);
  });

  function handleRunAnalysis() {
    try {
      var run = runAnalysis(selectedReportId);
      selectedRunId = run.id;
      switchTab('workbench');
      renderWorkbench();
      C.toast && C.toast(DEMO + ' 分析运行完成，共 ' + run.rawHits.length + ' 条命中', 'success');
    } catch (err) {
      alert('运行失败：' + (err.message || err));
    }
  }

  wbRunFirstBtn.addEventListener('click', handleRunAnalysis);
  wbRunAnalysisBtn.addEventListener('click', handleRunAnalysis);

  wbRawHits.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var runId = btn.getAttribute('data-run');
    var hitId = btn.getAttribute('data-hit');
    if (btn.classList.contains('wb-exclude-hit')) {
      var reason = window.prompt(DEMO + ' 排除原因（可选）：') || '';
      excludeHit(runId, hitId, reason);
      renderRunResults(runId);
    } else if (btn.classList.contains('wb-restore-hit')) {
      restoreHit(runId, hitId);
      renderRunResults(runId);
    }
  });

  wbAddManualFindingBtn.addEventListener('click', function () {
    if (selectedRunId) addManualFinding(selectedRunId);
  });

  wbManualFindings.addEventListener('click', function (e) {
    var btn = e.target.closest('.wb-remove-finding');
    if (!btn) return;
    var runId = btn.getAttribute('data-run');
    var fid = btn.getAttribute('data-fid');
    store.updateAnalysisState(function (state) {
      var run = (state.analysisRuns || []).find(function (r) { return r.id === runId; });
      if (!run || !run.adjustments) return;
      run.adjustments.manualFindings = (run.adjustments.manualFindings || []).filter(function (m) { return m.id !== fid; });
    });
    renderRunResults(runId);
  });

  wbSaveFinalBtn.addEventListener('click', function () {
    if (selectedRunId) saveFinalContent(selectedRunId);
  });

  var unsub = C.subscribeDemo(onStoreChange);
  window.__petAdminPageTeardown = function () { unsub(); };

  switchTab('workbench');
  renderReportSelect();
  renderRulesTable();
  (function syncInitialFlags() {
    var state = getState();
    var needsWrite = false;
    (state.reports || []).forEach(function (r) {
      if (!getLatestRun(r.id)) return;
      var hasFlag = (r.todoFlags || []).indexOf('pending_reanalysis') >= 0;
      if (signaturesChanged(state, r.id) !== hasFlag) needsWrite = true;
    });
    if (needsWrite) store.updateAnalysisState(function (s) { checkAllReportsReanalysis(s); });
  })();
  renderWorkbench();
}
