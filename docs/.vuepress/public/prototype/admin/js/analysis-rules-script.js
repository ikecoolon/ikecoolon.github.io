function initAnalysisRules() {
  var C = window.PetAdminCommon;
  var store = C && C.store ? C.store() : null;
  if (!C || !store) return;

  var STATUS_LABELS = { active: '启用', draft: '草稿', inactive: '停用' };
  var STATUS_COLORS = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-700'
  };
  var COMBINE_LABELS = {
    primary: '主命中（primary）',
    superseded_by_conflict: '冲突淘汰（superseded_by_conflict）',
    excluded: '已排除',
    orphan: '无归属菌门'
  };
  var CONDITION_TYPES = ['LAB_NOTICE', 'RANGE_STATUS', 'NOT_DETECTED', 'SPECIES', 'OTHER_TAXON_STATUS'];
  var LEVEL_LABELS = { phylum: '门', genus: '属' };

  var selectedReportId = 'report-002';
  var editingRuleId = null;
  var conditionCounter = 0;

  var tabRules = document.getElementById('tab-rules');
  var tabTest = document.getElementById('tab-test');
  var sectionRules = document.getElementById('section-rules');
  var sectionTest = document.getElementById('section-test');

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
  var formTargetLevel = document.getElementById('form-target-level');
  var formTargetTaxon = document.getElementById('form-target-taxon');
  var formRiskLevel = document.getElementById('form-risk-level');
  var formAdvice = document.getElementById('form-advice');
  var formAdviceHint = document.getElementById('form-advice-hint');

  var testReportSelect = document.getElementById('test-report-select');
  var testRuleChecks = document.getElementById('test-rule-checks');
  var testRunBtn = document.getElementById('test-run-btn');
  var testEmpty = document.getElementById('test-empty');
  var testResults = document.getElementById('test-results');
  var testSetActive = document.getElementById('test-set-active');
  var testSetDrafts = document.getElementById('test-set-drafts');

  function getState() {
    return store.getState();
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(str) {
    return C.escapeHtml ? C.escapeHtml(str) : String(str || '');
  }

  function getCatalog() {
    return (getState().analysisRuleCatalog || []).slice();
  }

  function typeLabels() {
    return store.CONDITION_TYPE_LABELS || {};
  }

  function riskLabels() {
    return store.RISK_LEVEL_LABELS || { low: '低', medium: '中', high: '高', notice: '仅提示' };
  }

  function noticeLabels() {
    return store.LAB_NOTICE_LABELS || { high: '实验室标注偏高', low: '实验室标注偏低', unmarked: '未标注' };
  }

  function rangeLabels() {
    return store.RANGE_STATUS_LABELS || {
      low: '低于参考范围', normal: '参考范围内', high: '高于参考范围', no_range: '无有效参考范围'
    };
  }

  function reportStatusLabels() {
    return C.REPORT_STATUS_LABELS || store.REPORT_STATUS_LABELS || {};
  }

  function fillSelect(selectEl, entries, selected) {
    if (!selectEl) return;
    selectEl.innerHTML = (entries || []).map(function (e) {
      return '<option value="' + escapeHtml(e.value) + '">' + escapeHtml(e.label) + '</option>';
    }).join('');
    if (selected != null && selected !== '') selectEl.value = selected;
  }

  function mapToEntries(map, order) {
    return order.map(function (k) {
      return { value: k, label: map[k] || k };
    });
  }

  function taxonOptionLabel(t) {
    if (!t) return '';
    var extra = t.latinName || t.key || '';
    return (t.label || t.key || '') + (extra ? ' (' + extra + ')' : '');
  }

  function listTaxa(level) {
    return store.listTaxaForRuleTarget(level) || [];
  }

  function allTaxa() {
    return listTaxa('phylum').concat(listTaxa('genus'));
  }

  function findTaxon(key) {
    if (!key) return null;
    var list = allTaxa();
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].key === key) return list[i];
    }
    return null;
  }

  function formatTaxon(key) {
    var t = findTaxon(key);
    return t ? taxonOptionLabel(t) : (key || '—');
  }

  function fillTargetTaxonSelect(level, selectedKey) {
    var taxa = listTaxa(level);
    fillSelect(formTargetTaxon, taxa.map(function (t) {
      return { value: t.key, label: taxonOptionLabel(t) };
    }), selectedKey);
    if (selectedKey && formTargetTaxon.value !== selectedKey && taxa.length) {
      formTargetTaxon.selectedIndex = 0;
    }
  }

  function fillRiskSelect(selected) {
    fillSelect(formRiskLevel, mapToEntries(riskLabels(), ['low', 'medium', 'high', 'notice']), selected || 'medium');
  }

  function syncAdviceDisabled() {
    var notice = formRiskLevel.value === 'notice';
    formAdvice.disabled = notice;
    formAdvice.classList.toggle('bg-gray-100', notice);
    if (formAdviceHint) formAdviceHint.classList.toggle('hidden', !notice);
  }

  function truncate(text, n) {
    var s = String(text || '');
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  function formatConditions(rule) {
    var logic = rule.conditionLogic === 'ANY' ? 'ANY' : 'ALL';
    var parts = (rule.conditions || []).map(function (c) {
      return store.describeCondition ? store.describeCondition(c, rule) : (c.type || '?');
    });
    return '<span class="text-blue-600 font-medium">' + logic + '</span> ' +
      parts.map(function (p) {
        return '<span class="inline-block bg-gray-100 px-1.5 py-0.5 rounded mr-1 text-xs">' + escapeHtml(p) + '</span>';
      }).join('');
  }

  function formatOutput(rule) {
    var o = rule.output || {};
    var parts = [];
    if (o.analysis) parts.push('分析: ' + escapeHtml(truncate(o.analysis, 40)));
    if (rule.riskLevel === 'notice') {
      parts.push('<span class="text-amber-700">[仅提示，无建议]</span>');
    } else if (o.advice) {
      parts.push('建议: ' + escapeHtml(truncate(o.advice, 40)));
    }
    return parts.join('<br>') || '—';
  }

  function renderRulesTable() {
    var filter = (searchInput.value || '').trim().toLowerCase();
    var statusF = filterStatus.value;
    var rules = getCatalog().sort(function (a, b) {
      if (a.lineageId !== b.lineageId) return String(a.lineageId).localeCompare(String(b.lineageId));
      return (b.version || 0) - (a.version || 0);
    });

    var filtered = rules.filter(function (rule) {
      var hay = [rule.name, rule.description, rule.lineageId, (rule.target && rule.target.taxonKey) || ''].join(' ').toLowerCase();
      (rule.conditions || []).forEach(function (c) {
        hay += ' ' + (store.describeCondition ? store.describeCondition(c, rule) : '') + ' ' + (c.type || '');
      });
      if (rule.output) hay += ' ' + (rule.output.analysis || '') + ' ' + (rule.output.advice || '');
      var matchSearch = !filter || hay.indexOf(filter) >= 0;
      var matchStatus = !statusF || rule.status === statusF;
      return matchSearch && matchStatus;
    });

    if (!filtered.length) {
      rulesTableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500">暂无规则</td></tr>';
      return;
    }

    var rLabels = riskLabels();
    rulesTableBody.innerHTML = filtered.map(function (rule) {
      var target = rule.target || {};
      return '<tr class="hover:bg-gray-50 align-top">' +
        '<td class="px-3 py-3">' +
          '<div class="font-medium text-sm">' + escapeHtml(rule.name) + '</div>' +
          '<div class="text-xs text-gray-500">谱系 ' + escapeHtml(rule.lineageId) + ' · v' + rule.version + '</div>' +
          '<div class="text-xs text-gray-600 mt-0.5">目标 ' +
            escapeHtml(LEVEL_LABELS[target.level] || target.level || '—') + ' · ' +
            escapeHtml(formatTaxon(target.taxonKey)) + '</div>' +
          '<div class="text-xs text-gray-400 mt-0.5">' + escapeHtml(rule.description || '') + '</div>' +
        '</td>' +
        '<td class="px-3 py-3 text-xs">' + formatConditions(rule) + '</td>' +
        '<td class="px-3 py-3 text-xs">' +
          '风险 <strong>' + escapeHtml(rLabels[rule.riskLevel] || rule.riskLevel) + '</strong><br>' +
          '优先级 ' + (rule.priority == null ? '—' : rule.priority) + '<br>' +
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
          (rule.status !== 'active' ? '<button type="button" class="text-red-600 block rule-delete" data-id="' + rule.id + '">删除</button>' : '') +
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

  function updateConditionFields(item, type) {
    var show = function (sel, on) {
      var el = item.querySelector(sel);
      if (el) el.classList.toggle('hidden', !on);
    };
    show('.condition-field-notice', type === 'LAB_NOTICE');
    show('.condition-field-range', type === 'RANGE_STATUS');
    show('.condition-field-species', type === 'SPECIES');
    show('.condition-field-other-taxon', type === 'OTHER_TAXON_STATUS');
    show('.condition-field-status-kind', type === 'OTHER_TAXON_STATUS');
    show('.condition-field-expected', type === 'OTHER_TAXON_STATUS');
  }

  function fillExpectedSelect(item, statusKind, selected) {
    var sel = item.querySelector('.condition-expected');
    if (!sel) return;
    if (statusKind === 'RANGE_STATUS') {
      fillSelect(sel, mapToEntries(rangeLabels(), ['low', 'normal', 'high', 'no_range']), selected);
    } else {
      fillSelect(sel, mapToEntries(noticeLabels(), ['high', 'low', 'unmarked']), selected);
    }
  }

  function fillConditionSelects(item) {
    var typeSel = item.querySelector('.condition-type');
    fillSelect(typeSel, CONDITION_TYPES.map(function (t) {
      return { value: t, label: typeLabels()[t] || t };
    }), typeSel.value || 'RANGE_STATUS');
    fillSelect(item.querySelector('.condition-notice'), mapToEntries(noticeLabels(), ['high', 'low', 'unmarked']));
    fillSelect(item.querySelector('.condition-range-status'), mapToEntries(rangeLabels(), ['low', 'normal', 'high', 'no_range']));
    fillSelect(item.querySelector('.condition-other-taxon'), allTaxa().map(function (t) {
      return { value: t.key, label: taxonOptionLabel(t) };
    }));
    var kindSel = item.querySelector('.condition-status-kind');
    fillExpectedSelect(item, kindSel ? kindSel.value : 'LAB_NOTICE');
  }

  function addConditionRow(data) {
    conditionCounter += 1;
    var node = conditionTemplate.content.cloneNode(true);
    var item = node.querySelector('.condition-item');
    item.dataset.conditionUid = (data && data.id) || uid('cond');
    item.querySelector('.condition-number').textContent = String(conditionCounter);

    fillConditionSelects(item);

    var typeSel = item.querySelector('.condition-type');
    var type = (data && data.type) || 'RANGE_STATUS';
    typeSel.value = type;
    updateConditionFields(item, type);

    typeSel.addEventListener('change', function () {
      updateConditionFields(item, typeSel.value);
    });

    var kindSel = item.querySelector('.condition-status-kind');
    kindSel.addEventListener('change', function () {
      fillExpectedSelect(item, kindSel.value);
    });

    if (data) {
      if (data.notice) item.querySelector('.condition-notice').value = data.notice;
      if (data.rangeStatus) item.querySelector('.condition-range-status').value = data.rangeStatus;
      var species = Array.isArray(data.species)
        ? data.species
        : String(data.species || '').split(/[,，]/).map(function (s) { return s.trim().toLowerCase(); });
      var hasCat = species.some(function (s) { return s === 'cat' || s === '猫'; });
      var hasDog = species.some(function (s) { return s === 'dog' || s === '狗' || s === '犬'; });
      item.querySelector('.condition-species-cat').checked = hasCat;
      item.querySelector('.condition-species-dog').checked = hasDog;
      if (data.taxonKey) item.querySelector('.condition-other-taxon').value = data.taxonKey;
      if (data.statusKind) {
        kindSel.value = data.statusKind;
        fillExpectedSelect(item, data.statusKind, data.expected);
      } else if (data.expected) {
        fillExpectedSelect(item, kindSel.value, data.expected);
      }
    }

    item.querySelector('.remove-condition').addEventListener('click', function () {
      item.remove();
      updateConditionsDisplay();
    });

    conditionsContainer.appendChild(item);
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
      var cond = { id: item.dataset.conditionUid || uid('cond'), type: type };
      if (type === 'LAB_NOTICE') {
        cond.notice = item.querySelector('.condition-notice').value;
        list.push(cond);
      } else if (type === 'RANGE_STATUS') {
        cond.rangeStatus = item.querySelector('.condition-range-status').value;
        list.push(cond);
      } else if (type === 'NOT_DETECTED') {
        list.push(cond);
      } else if (type === 'SPECIES') {
        var species = [];
        if (item.querySelector('.condition-species-cat').checked) species.push('cat');
        if (item.querySelector('.condition-species-dog').checked) species.push('dog');
        cond.species = species;
        list.push(cond);
      } else if (type === 'OTHER_TAXON_STATUS') {
        cond.taxonKey = item.querySelector('.condition-other-taxon').value;
        cond.statusKind = item.querySelector('.condition-status-kind').value;
        cond.expected = item.querySelector('.condition-expected').value;
        list.push(cond);
      }
    });
    return list;
  }

  function showRulesForm(ruleId) {
    rulesListView.classList.add('hidden');
    rulesFormView.classList.remove('hidden');
    conditionsContainer.innerHTML = '';
    conditionCounter = 0;
    editingRuleId = ruleId || null;
    fillRiskSelect('medium');

    if (ruleId) {
      var rule = getCatalog().find(function (r) { return r.id === ruleId; });
      if (!rule) return;
      formTitle.textContent = '编辑草稿 v' + rule.version + ' — ' + rule.name;
      document.getElementById('form-rule-name').value = rule.name;
      document.getElementById('form-rule-description').value = rule.description || '';
      document.getElementById('form-conflict-group').value = rule.conflictGroup || '';
      fillRiskSelect(rule.riskLevel || 'medium');
      document.getElementById('form-priority').value = rule.priority == null ? 10 : rule.priority;
      document.getElementById('logic-operator').value = rule.conditionLogic || 'ALL';
      document.getElementById('form-analysis').value = (rule.output && rule.output.analysis) || '';
      document.getElementById('form-advice').value = (rule.output && rule.output.advice) || '';
      var target = rule.target || {};
      formTargetLevel.value = target.level === 'genus' ? 'genus' : 'phylum';
      fillTargetTaxonSelect(formTargetLevel.value, target.taxonKey);
      (rule.conditions || []).forEach(function (c) { addConditionRow(c); });
    } else {
      formTitle.textContent = '新增草稿规则';
      ruleForm.reset();
      document.getElementById('form-priority').value = 10;
      document.getElementById('logic-operator').value = 'ALL';
      formTargetLevel.value = 'phylum';
      fillTargetTaxonSelect('phylum');
      fillRiskSelect('medium');
      addConditionRow({ type: 'RANGE_STATUS', rangeStatus: 'normal' });
    }
    syncAdviceDisabled();
    updateConditionsDisplay();
  }

  function collectRulePayload() {
    var name = document.getElementById('form-rule-name').value.trim();
    var riskLevel = formRiskLevel.value;
    var advice = document.getElementById('form-advice').value.trim();
    return {
      name: name,
      description: document.getElementById('form-rule-description').value.trim(),
      conflictGroup: document.getElementById('form-conflict-group').value.trim() || null,
      riskLevel: riskLevel,
      priority: parseInt(document.getElementById('form-priority').value, 10) || 0,
      conditionLogic: document.getElementById('logic-operator').value,
      target: {
        level: formTargetLevel.value,
        taxonKey: formTargetTaxon.value
      },
      conditions: readConditionsFromForm(),
      output: {
        analysis: document.getElementById('form-analysis').value.trim(),
        advice: riskLevel === 'notice' ? '' : advice
      }
    };
  }

  function saveRuleDraft() {
    var payload = collectRulePayload();
    if (!payload.name) { alert('规则名称不能为空'); return; }
    if (!payload.target.taxonKey) { alert('请选择目标分类单元'); return; }
    if (!payload.conditions.length) { alert('至少配置一个条件'); return; }

    var toSave = payload;
    if (editingRuleId) {
      var existing = getCatalog().find(function (r) { return r.id === editingRuleId; });
      if (!existing || existing.status !== 'draft') {
        alert('只能编辑草稿版本');
        return;
      }
      toSave = Object.assign({}, existing, payload, { id: existing.id, lineageId: existing.lineageId, version: existing.version, status: 'draft' });
    } else {
      toSave = Object.assign({}, payload, { status: 'draft', version: 1 });
    }

    var errors = store.validateAnalysisRule(toSave) || [];
    if (errors.length) {
      alert(errors.join('\n'));
      return;
    }

    try {
      store.saveAnalysisRule(toSave);
      C.toast && C.toast('草稿已保存', 'success');
      showRulesList();
    } catch (err) {
      alert('保存失败：' + (err.message || err));
    }
  }

  function callStore(action, successMsg) {
    try {
      var result = action();
      if (successMsg) C.toast && C.toast(successMsg, 'success');
      return result;
    } catch (err) {
      alert(err.message || String(err));
      return null;
    }
  }

  function activateRule(ruleId) {
    callStore(function () { return store.activateAnalysisRule(ruleId); }, '规则已启用');
  }

  function deactivateRule(ruleId) {
    callStore(function () { return store.deactivateAnalysisRule(ruleId); }, '规则已停用');
  }

  function reviseRule(ruleId) {
    var draft = callStore(function () { return store.createRuleRevision(ruleId); }, '已基于启用版本创建修订草稿');
    if (draft && draft.id) showRulesForm(draft.id);
  }

  function copyRule(ruleId) {
    callStore(function () { return store.duplicateAnalysisRule(ruleId); }, '已复制为新草稿');
  }

  function deleteRule(ruleId) {
    var rule = getCatalog().find(function (r) { return r.id === ruleId; });
    var name = rule ? rule.name : ruleId;
    var run = function () {
      callStore(function () { return store.deleteAnalysisRule(ruleId); }, '已删除规则');
    };
    if (C.confirmDialog) C.confirmDialog('确定删除规则「' + name + '」？此操作不可恢复。', run);
    else if (window.confirm('确定删除规则「' + name + '」？')) run();
  }

  function testableReports() {
    return (getState().reports || []).filter(function (r) { return r.status !== 'voided'; });
  }

  function includeDraftsSelected() {
    return !!(testSetDrafts && testSetDrafts.checked);
  }

  function candidateRules() {
    var includeDrafts = includeDraftsSelected();
    return getCatalog().filter(function (r) {
      if (includeDrafts) return r.status === 'active' || r.status === 'draft';
      return r.status === 'active';
    });
  }

  function selectedTestRuleIds() {
    var ids = [];
    testRuleChecks.querySelectorAll('input[type="checkbox"]:checked').forEach(function (el) {
      if (el.value) ids.push(el.value);
    });
    return ids;
  }

  function renderReportSelect() {
    var state = getState();
    var reports = testableReports();
    if (!reports.some(function (r) { return r.id === selectedReportId; })) {
      selectedReportId = reports.length ? reports[0].id : '';
    }
    var labels = reportStatusLabels();
    testReportSelect.innerHTML = reports.map(function (r) {
      var pet = C.lookupPet(state, r.petId);
      var label = (r.reportNumber || r.id) +
        (pet ? ' · ' + pet.name : '') +
        '（' + (labels[r.status] || r.status) + '）';
      return '<option value="' + r.id + '"' + (r.id === selectedReportId ? ' selected' : '') + '>' +
        escapeHtml(label) + '</option>';
    }).join('');
  }

  function renderRuleChecks() {
    var rules = candidateRules().sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name)) || (a.version || 0) - (b.version || 0);
    });
    if (!rules.length) {
      testRuleChecks.innerHTML = '<div class="text-gray-500 text-xs">当前候选集没有规则</div>';
      return;
    }
    testRuleChecks.innerHTML = rules.map(function (r) {
      return '<label class="flex items-start gap-2">' +
        '<input type="checkbox" class="mt-0.5" value="' + escapeHtml(r.id) + '">' +
        '<span>' + escapeHtml(r.name) + ' · v' + r.version + ' · ' +
        escapeHtml(STATUS_LABELS[r.status] || r.status) + '</span></label>';
    }).join('');
  }

  function phylumKeysForReport(reportId) {
    var keys = [];
    var seen = {};
    (store.getEffectiveResults(reportId) || []).forEach(function (r) {
      if (!r || !r.isEffective || !r.phylumKey) return;
      if (seen[r.phylumKey]) return;
      seen[r.phylumKey] = true;
      keys.push(r.phylumKey);
    });
    var order = listTaxa('phylum').map(function (t) { return t.key; });
    keys.sort(function (a, b) {
      var ia = order.indexOf(a);
      var ib = order.indexOf(b);
      if (ia < 0) ia = 999;
      if (ib < 0) ib = 999;
      return ia - ib;
    });
    return keys;
  }

  function formatActual(cr) {
    if (!cr) return '—';
    var v = cr.actualValue;
    var mapped = v == null ? '' : ((noticeLabels()[v] || rangeLabels()[v] || v));
    if (cr.message) return mapped && String(mapped) !== String(cr.message) ? mapped + ' · ' + cr.message : cr.message;
    return mapped || '—';
  }

  function combineBadge(status) {
    var cls = status === 'primary' ? 'bg-green-100 text-green-800'
      : status === 'superseded_by_conflict' ? 'bg-gray-200 text-gray-700'
        : 'bg-slate-100 text-slate-600';
    return '<span class="inline-flex px-2 py-0.5 rounded text-xs ' + cls + '">' +
      escapeHtml(COMBINE_LABELS[status] || status || '—') + '</span>';
  }

  function renderTestResults() {
    if (!selectedReportId) {
      testEmpty.classList.remove('hidden');
      testResults.classList.add('hidden');
      testEmpty.textContent = '没有可测试的报告';
      return;
    }

    var includeDrafts = includeDraftsSelected();
    var ruleIds = selectedTestRuleIds();
    var opts = { includeDrafts: includeDrafts };
    if (ruleIds.length) opts.ruleIds = ruleIds;

    var preview;
    try {
      preview = store.previewRuleEvaluation(selectedReportId, opts);
    } catch (err) {
      testEmpty.classList.remove('hidden');
      testResults.classList.add('hidden');
      testEmpty.textContent = '测试失败：' + (err.message || err);
      return;
    }

    var unitsByKey = {};
    (preview.units || []).forEach(function (u) { unitsByKey[u.phylumKey] = u; });
    var keys = phylumKeysForReport(selectedReportId);
    (preview.units || []).forEach(function (u) {
      if (keys.indexOf(u.phylumKey) < 0) keys.push(u.phylumKey);
    });

    var rLabels = riskLabels();
    var cards = keys.map(function (pk) {
      var unit = unitsByKey[pk] || { phylumKey: pk, hits: [], drafts: { analysis: '', advice: '' }, riskLevel: null };
      var hits = unit.hits || [];
      var drafts = unit.drafts || {};
      var hitHtml = hits.length
        ? hits.map(function (hit) {
          var condHtml = (hit.conditionResults || []).map(function (cr) {
            return '<li>' + escapeHtml(formatActual(cr)) + '</li>';
          }).join('');
          return '<div class="border rounded p-3 bg-white mb-2">' +
            '<div class="flex flex-wrap justify-between gap-2 mb-1">' +
              '<span class="font-medium text-sm">' + escapeHtml(hit.ruleName) +
                ' <span class="text-gray-400">v' + escapeHtml(String(hit.ruleVersion || '')) + '</span></span>' +
              combineBadge(hit.combineStatus) +
            '</div>' +
            '<div class="text-xs text-gray-500 mb-1">条件实际值</div>' +
            '<ul class="list-disc ml-4 text-xs text-gray-700 mb-2">' + (condHtml || '<li>—</li>') + '</ul>' +
          '</div>';
        }).join('')
        : '<p class="text-sm text-gray-500">无命中</p>';

      return '<div class="border border-gray-200 rounded-lg p-4 bg-slate-50">' +
        '<div class="flex flex-wrap justify-between gap-2 mb-3">' +
          '<h4 class="font-semibold text-sm">' + escapeHtml(formatTaxon(pk)) + '</h4>' +
          '<span class="text-xs text-gray-600">风险 ' +
            escapeHtml(unit.riskLevel ? (rLabels[unit.riskLevel] || unit.riskLevel) : '—') + '</span>' +
        '</div>' +
        hitHtml +
        '<div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">' +
          '<div class="bg-white border rounded p-3">' +
            '<div class="text-xs font-medium text-gray-500 mb-1">合成分析草稿</div>' +
            '<div class="whitespace-pre-wrap">' + escapeHtml(drafts.analysis || '—') + '</div>' +
          '</div>' +
          '<div class="bg-white border rounded p-3">' +
            '<div class="text-xs font-medium text-gray-500 mb-1">合成建议草稿</div>' +
            '<div class="whitespace-pre-wrap">' + escapeHtml(drafts.advice || '—') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    var orphan = (preview.orphanHits || []).length
      ? '<div class="border border-dashed rounded p-3 text-xs text-gray-600">未归入菌门的命中 ' +
        preview.orphanHits.length + ' 条</div>'
      : '';

    testEmpty.classList.add('hidden');
    testResults.classList.remove('hidden');
    testResults.innerHTML = (cards || '<p class="text-gray-500 text-sm">该报告没有有效检测结果对应的菌门</p>') + orphan;
  }

  function refreshTestPane(runPreview) {
    renderReportSelect();
    renderRuleChecks();
    if (runPreview) renderTestResults();
  }

  function switchTab(which) {
    var isRules = which === 'rules';
    tabRules.classList.toggle('border-blue-600', isRules);
    tabRules.classList.toggle('text-blue-600', isRules);
    tabRules.classList.toggle('border-transparent', !isRules);
    tabRules.classList.toggle('text-gray-600', !isRules);
    tabTest.classList.toggle('border-blue-600', !isRules);
    tabTest.classList.toggle('text-blue-600', !isRules);
    tabTest.classList.toggle('border-transparent', isRules);
    tabTest.classList.toggle('text-gray-600', isRules);
    sectionRules.classList.toggle('hidden', !isRules);
    sectionTest.classList.toggle('hidden', isRules);
    if (!isRules) refreshTestPane(true);
  }

  function onStoreChange() {
    renderRulesTable();
    if (!sectionTest.classList.contains('hidden')) refreshTestPane(true);
  }

  tabRules.addEventListener('click', function () { switchTab('rules'); });
  tabTest.addEventListener('click', function () { switchTab('test'); });

  addNewRuleBtn.addEventListener('click', function () { showRulesForm(null); });
  backToRulesListBtn.addEventListener('click', showRulesList);
  cancelFormBtn.addEventListener('click', showRulesList);
  addConditionBtn.addEventListener('click', function () { addConditionRow(); });
  formTargetLevel.addEventListener('change', function () {
    fillTargetTaxonSelect(formTargetLevel.value, formTargetTaxon.value);
  });
  formRiskLevel.addEventListener('change', syncAdviceDisabled);

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
    else if (btn.classList.contains('rule-delete')) deleteRule(id);
  });

  testReportSelect.addEventListener('change', function () {
    selectedReportId = testReportSelect.value;
    renderTestResults();
  });
  testSetActive.addEventListener('change', function () { refreshTestPane(true); });
  testSetDrafts.addEventListener('change', function () { refreshTestPane(true); });
  testRuleChecks.addEventListener('change', function () { renderTestResults(); });
  testRunBtn.addEventListener('click', function () { renderTestResults(); });

  var unsub = C.subscribeDemo ? C.subscribeDemo(onStoreChange) : function () {};
  window.__petAdminPageTeardown = function () { unsub(); };

  fillRiskSelect('medium');
  switchTab('rules');
  renderRulesTable();
}
