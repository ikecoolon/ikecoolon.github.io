function initAnalysisRules() {
  var C = window.PetAdminCommon;
  var store = C && C.store ? C.store() : null;
  var Engine = window.PetReportAnalysisEngine;
  if (!C || !store || !Engine) return;

  var LEVEL_LABELS = { phylum: '菌门', genus: '菌属' };
  var STATUS_LABELS = { active: '当前启用', inactive: '停用 / 归档' };
  var ADDABLE_CONDITION_TYPES = ['LAB_NOTICE', 'RANGE_STATUS', 'NOT_DETECTED', 'VALUE_THRESHOLD', 'OTHER_TAXON_STATUS'];
  var selectedReportId = 'report-002';
  var librarySpecies = 'cat';
  var editingSource = null;
  var sessionCandidate = null;
  var formBaseline = '';
  var dirty = false;
  var conditionCounter = 0;
  var frozenTestRun = null;
  var testInputDirty = false;
  var lastFocusedBeforeDialog = null;
  var pendingConfirmedAction = null;
  var editorMode = 'sentence';
  var nameTouched = false;
  var copyingToNewLineage = false;

  function byId(id) { return document.getElementById(id); }
  function state() { return store.getState(); }
  function escapeHtml(value) { return C.escapeHtml ? C.escapeHtml(value) : String(value || ''); }
  function formatDate(value) { return C.formatDate ? C.formatDate(value) : value || '—'; }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }

  var tabRules = byId('tab-rules');
  var tabTest = byId('tab-test');
  var sectionRules = byId('section-rules');
  var sectionTest = byId('section-test');
  var rulesListView = byId('rules-list-view');
  var rulesFormView = byId('rules-form-view');
  var lineageList = byId('rules-lineage-list');
  var searchInput = byId('search-rule');
  var filterStatus = byId('filter-status');
  var ruleForm = byId('rule-form');
  var conditionTemplate = byId('condition-template');
  var conditionsContainer = byId('conditions-container');
  var noConditions = byId('no-conditions');
  var formTargetLevel = byId('form-target-level');
  var formTargetTaxon = byId('form-target-taxon');
  var formAdvice = byId('form-advice');
  var formObservation = byId('form-observation');
  var formSpeciesScope = byId('form-species-scope');
  var formThresholdEnabled = byId('form-threshold-enabled');
  var formThresholdComparator = byId('form-threshold-comparator');
  var formThresholdValue = byId('form-threshold-value');
  var testReportSelect = byId('test-report-select');
  var testActiveRuleSelect = byId('test-active-rule-select');
  var testResults = byId('test-results');
  var testEmpty = byId('test-empty');
  var confirmDialog = byId('rule-confirm-dialog');
  var confirmCancel = byId('rule-confirm-cancel');
  var confirmOk = byId('rule-confirm-ok');

  function listTaxa(level) { return store.listTaxaForRuleTarget(level) || []; }
  function allTaxa() { return listTaxa('phylum').concat(listTaxa('genus')); }
  function findTaxon(key) { return allTaxa().find(function (taxon) { return taxon.key === key; }) || null; }
  function taxonLabel(key) {
    var taxon = findTaxon(key);
    if (!taxon) return key || '—';
    return (taxon.label || taxon.key) + (taxon.latinName && taxon.latinName !== taxon.label ? '（' + taxon.latinName + '）' : '');
  }
  function taxonShortLabel(key) {
    var taxon = findTaxon(key);
    return (taxon && (taxon.label || taxon.key)) || key || '目标菌';
  }
  function fillSelect(select, entries, selected) {
    select.innerHTML = entries.map(function (entry) {
      return '<option value="' + escapeHtml(entry.value) + '">' + escapeHtml(entry.label) + '</option>';
    }).join('');
    if (selected != null) select.value = selected;
  }
  function mapEntries(map, keys) {
    return keys.map(function (key) { return { value: key, label: map[key] || key }; });
  }
  function noticeLabels() { return store.LAB_NOTICE_LABELS || Engine.LAB_NOTICE_LABELS || {}; }
  function rangeLabels() { return store.RANGE_STATUS_LABELS || Engine.RANGE_STATUS_LABELS || {}; }
  function conditionTypeLabels() { return store.CONDITION_TYPE_LABELS || {}; }
  function reportStatusLabels() { return C.REPORT_STATUS_LABELS || store.REPORT_STATUS_LABELS || {}; }

  function scopeSummary(rule) {
    var speciesText = Engine.speciesScopeLabel(rule.applicableSpecies || []);
    var templates = rule.sourceTemplateIds || [];
    var templateText = templates.length > 1 ? '全部已知 Mock 模板' : (templates[0] ? templates[0].replace('ORG-LAB-GUT-', '模板 ') : '未限定检测方案');
    return (speciesText || '未设置物种') + ' · ' + templateText;
  }

  function currentRule(lineage) { return lineage.active || lineage.latest || {}; }

  function isAdvancedRule(rule) {
    return Engine.analyzeRuleShape(rule).advanced;
  }

  function fillObservation(selected) {
    var groups = {
      lab: '实验室标注 / 未检出（主证据）',
      range: '相对范围（次要；真实报告常常没有范围，不要当默认）'
    };
    var html = ['lab', 'range'].map(function (group) {
      var options = Engine.OBSERVATION_KINDS.filter(function (kind) { return kind.group === group; }).map(function (kind) {
        return '<option value="' + escapeHtml(kind.id) + '">' + escapeHtml(kind.label) + '</option>';
      }).join('');
      return '<optgroup label="' + escapeHtml(groups[group]) + '">' + options + '</optgroup>';
    }).join('');
    formObservation.innerHTML = html;
    formObservation.value = selected || Engine.DEFAULT_OBSERVATION_KIND;
  }

  function readSpeciesScope() {
    var value = formSpeciesScope.value === 'dog' ? 'dog' : 'cat';
    return [value];
  }

  function setSpeciesScope(species) {
    var list = Engine.closedSpeciesList(species || []);
    formSpeciesScope.value = list[0] === 'dog' ? 'dog' : 'cat';
  }

  function readValueThreshold() {
    if (!formThresholdEnabled.checked) return null;
    var threshold = Number(formThresholdValue.value);
    if (!formThresholdComparator.value || !isFinite(threshold)) {
      return { enabled: true, comparator: formThresholdComparator.value || 'gt', threshold: formThresholdValue.value };
    }
    return { enabled: true, comparator: formThresholdComparator.value, threshold: threshold };
  }

  function setValueThreshold(threshold) {
    var enabled = !!(threshold && threshold.enabled !== false && threshold.comparator);
    formThresholdEnabled.checked = enabled;
    formThresholdComparator.value = (threshold && threshold.comparator) || 'gt';
    formThresholdValue.value = enabled && threshold.threshold != null ? threshold.threshold : '';
    syncThresholdFields();
  }

  function syncThresholdFields() {
    var enabled = formThresholdEnabled.checked;
    byId('threshold-comparator-field').classList.toggle('is-disabled', !enabled);
    byId('threshold-value-field').classList.toggle('is-disabled', !enabled);
    formThresholdComparator.disabled = !enabled;
    formThresholdValue.disabled = !enabled;
  }

  function suggestedNameFromForm() {
    return Engine.suggestRuleName({
      observationKind: formObservation.value || Engine.DEFAULT_OBSERVATION_KIND,
      applicableSpecies: readSpeciesScope()
    }, taxonShortLabel(formTargetTaxon.value));
  }

  function updateGeneratedName() {
    if (editorMode !== 'sentence' || nameTouched) return;
    byId('form-rule-name').value = suggestedNameFromForm();
  }

  function syncEditorMode() {
    var advanced = editorMode === 'advanced';
    byId('compat-banner').classList.toggle('hidden', !advanced);
    byId('compat-editor').classList.toggle('hidden', !advanced);
    byId('observation-clause').classList.toggle('hidden', advanced);
    byId('observation-hint').classList.toggle('hidden', advanced);
    byId('threshold-clause').classList.toggle('hidden', advanced);
    byId('threshold-hint').classList.toggle('hidden', advanced);
  }

  function renderSpeciesSwitch() {
    var container = byId('library-species-switch');
    if (!container) return;
    container.innerHTML = (Engine.REPORTABLE_SPECIES || ['cat', 'dog']).map(function (species) {
      var selected = species === librarySpecies;
      return '<button type="button" class="ar-species-chip' + (selected ? ' is-selected' : '') + '" role="tab" aria-selected="' +
        (selected ? 'true' : 'false') + '" data-species="' + escapeHtml(species) + '">' +
        escapeHtml(Engine.SPECIES_LABELS[species] || species) + '</button>';
    }).join('');
  }

  function lineageCardHtml(lineage) {
    var rule = currentRule(lineage);
    var target = rule.target || {};
    var history = lineage.history || [];
    var active = !!lineage.active;
    var advanced = isAdvancedRule(rule);
    var sentence = store.describeJudgmentSentenceForRule(rule);
    var others = Engine.otherReportableSpecies(rule.applicableSpecies || []);
    var copyLabel = others[0] ? ('复制到' + (Engine.SPECIES_LABELS[others[0]] || others[0])) : '';
    return '<article class="ar-lineage-card rounded-lg border border-slate-200 bg-white p-4" data-lineage="' + escapeHtml(lineage.lineageId) + '">' +
      '<div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(200px,.7fr)_auto] gap-4 items-start">' +
        '<div>' +
          '<div class="flex flex-wrap items-center gap-2">' +
            '<h4 class="font-semibold text-base">' + escapeHtml(rule.name || '未命名规则') + '</h4>' +
            '<span class="inline-flex px-2 py-0.5 rounded text-xs ' + (active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700') + '">' + STATUS_LABELS[active ? 'active' : 'inactive'] + '</span>' +
            (advanced ? '<span class="inline-flex px-2 py-0.5 rounded text-xs ar-advanced-badge">含高级条件</span>' : '') +
          '</div>' +
          '<p class="text-sm text-slate-800 mt-2">' + escapeHtml(sentence) + '</p>' +
          '<p class="text-sm text-slate-600 mt-2">目标：' + escapeHtml(LEVEL_LABELS[target.level] || '—') + ' · ' + escapeHtml(taxonLabel(target.taxonKey)) + '</p>' +
        '</div>' +
        '<dl class="text-sm space-y-1"><div><dt class="text-slate-500 inline">当前版本：</dt><dd class="inline">v' + escapeHtml(String(rule.version || 1)) + '</dd></div>' +
          '<div><dt class="text-slate-500 inline">更新时间：</dt><dd class="inline">' + escapeHtml(formatDate(rule.updatedAt)) + '</dd></div>' +
          '<div><dt class="text-slate-500 inline">维护人：</dt><dd class="inline">' + escapeHtml(rule.maintainer || '原型未接入') + '</dd></div></dl>' +
        '<div class="flex xl:flex-col gap-2 xl:items-stretch">' +
          (active ? '<button type="button" class="rule-edit px-3 py-1.5 border border-blue-600 text-blue-700 rounded text-sm" data-id="' + escapeHtml(rule.id) + '">编辑并测试</button>' : '') +
          (active && others[0] ? '<button type="button" class="rule-copy-species px-3 py-1.5 border border-slate-300 text-slate-700 rounded text-sm" data-id="' + escapeHtml(rule.id) + '" data-species="' + escapeHtml(others[0]) + '">' + escapeHtml(copyLabel) + '</button>' : '') +
          (active ? '<button type="button" class="rule-deactivate px-3 py-1.5 border border-slate-300 text-slate-700 rounded text-sm" data-lineage="' + escapeHtml(lineage.lineageId) + '">停用谱系</button>' : '') +
          (!active ? '<button type="button" class="rule-edit px-3 py-1.5 border border-blue-600 text-blue-700 rounded text-sm" data-id="' + escapeHtml(rule.id) + '">基于归档版新建</button>' : '') +
        '</div>' +
      '</div>' +
      '<details class="mt-3 border-t border-slate-100 pt-3"><summary class="cursor-pointer text-sm font-medium text-blue-700">历史版本（' + history.length + '）</summary>' +
        '<div class="mt-2 overflow-x-auto"><table class="min-w-full text-sm"><thead><tr><th>版本</th><th>归档时间</th><th>归档原因</th><th>分析输出</th></tr></thead><tbody>' +
        (history.length ? history.map(function (item) {
          return '<tr><td>v' + escapeHtml(String(item.version)) + '</td><td>' + escapeHtml(formatDate(item.archivedAt || item.updatedAt)) + '</td><td>' + escapeHtml(item.archivedReason || '历史版本') + '</td><td>' + escapeHtml((item.output && item.output.analysis) || '—') + '</td></tr>';
        }).join('') : '<tr><td colspan="4" class="text-slate-600">暂无历史版本</td></tr>') +
        '</tbody></table></div></details>' +
    '</article>';
  }

  function matchesLibraryQuery(lineage, query) {
    if (!query) return true;
    var current = currentRule(lineage);
    var sentence = store.describeJudgmentSentenceForRule(current);
    var hay = [current.name, current.description, sentence, taxonLabel(current.target && current.target.taxonKey), scopeSummary(current), current.output && current.output.analysis, current.output && current.output.advice].join(' ').toLowerCase();
    return hay.indexOf(query) >= 0;
  }

  function renderLineages() {
    renderSpeciesSwitch();
    var query = String(searchInput.value || '').trim().toLowerCase();
    var statusFilter = filterStatus.value;
    var groups = store.listRuleLibraryGroups(librarySpecies) || [];
    var filteredGroups = groups.map(function (group) {
      function keep(lineage) {
        var status = lineage.active ? 'active' : 'inactive';
        if (statusFilter && status !== statusFilter) return false;
        return matchesLibraryQuery(lineage, query);
      }
      return {
        phylumKey: group.phylumKey,
        label: group.label,
        phylumLineages: (group.phylumLineages || []).filter(keep),
        genera: (group.genera || []).map(function (genus) {
          return { genusKey: genus.genusKey, label: genus.label, lineages: (genus.lineages || []).filter(keep) };
        }).filter(function (genus) { return genus.lineages.length; })
      };
    }).filter(function (group) {
      return group.phylumLineages.length || group.genera.length;
    });
    if (!filteredGroups.length) {
      lineageList.innerHTML = '<div class="rounded border border-dashed p-8 text-center text-slate-600">这个物种还没有符合条件的判断。可新增，或从另一物种复制成新谱系。</div>';
      return;
    }
    lineageList.innerHTML = filteredGroups.map(function (group) {
      return '<section class="ar-taxon-group" aria-labelledby="phylum-' + escapeHtml(group.phylumKey) + '">' +
        '<h3 id="phylum-' + escapeHtml(group.phylumKey) + '" class="ar-taxon-title">菌门 · ' + escapeHtml(group.label) + '</h3>' +
        (group.phylumLineages.length ? '<div class="space-y-3 mt-3">' + group.phylumLineages.map(lineageCardHtml).join('') + '</div>' : '') +
        group.genera.map(function (genus) {
          return '<div class="ar-genus-group mt-4">' +
            '<h4 class="ar-genus-title">菌属 · ' + escapeHtml(genus.label) + '</h4>' +
            '<div class="space-y-3 mt-2">' + genus.lineages.map(lineageCardHtml).join('') + '</div></div>';
        }).join('') +
      '</section>';
    }).join('');
  }

  function fillTargetTaxon(level, selected) {
    fillSelect(formTargetTaxon, listTaxa(level).map(function (taxon) {
      return { value: taxon.key, label: taxonLabel(taxon.key) };
    }), selected);
  }

  function fillConflictGroups() {
    byId('conflict-group-options').innerHTML = store.listConflictGroups().map(function (group) {
      return '<option value="' + escapeHtml(group) + '"></option>';
    }).join('');
  }

  function syncAdvice() {
    formAdvice.disabled = false;
    formAdvice.classList.remove('bg-slate-100');
  }

  function updateConditionFields(item, type) {
    var fields = {
      '.condition-field-notice': type === 'LAB_NOTICE',
      '.condition-field-range': type === 'RANGE_STATUS',
      '.condition-field-threshold-cmp': type === 'VALUE_THRESHOLD',
      '.condition-field-threshold-val': type === 'VALUE_THRESHOLD',
      '.condition-field-species': type === 'SPECIES',
      '.condition-field-other-taxon': type === 'OTHER_TAXON_STATUS',
      '.condition-field-status-kind': type === 'OTHER_TAXON_STATUS',
      '.condition-field-expected': type === 'OTHER_TAXON_STATUS'
    };
    Object.keys(fields).forEach(function (selector) {
      var element = item.querySelector(selector);
      if (element) element.classList.toggle('hidden', !fields[selector]);
    });
  }

  function fillExpected(item, kind, selected) {
    fillSelect(item.querySelector('.condition-expected'), kind === 'RANGE_STATUS'
      ? mapEntries(rangeLabels(), ['low', 'normal', 'high', 'no_range'])
      : mapEntries(noticeLabels(), ['high', 'low', 'unmarked']), selected);
  }

  function conditionTypesForRow(existingType) {
    var types = ADDABLE_CONDITION_TYPES.slice();
    if (existingType === 'SPECIES' && types.indexOf('SPECIES') < 0) types.push('SPECIES');
    return types;
  }

  function addCondition(data) {
    conditionCounter += 1;
    var fragment = conditionTemplate.content.cloneNode(true);
    var item = fragment.querySelector('.condition-item');
    item.dataset.conditionUid = data && data.id ? data.id : uid('cond');
    var selectedType = data && data.type ? data.type : 'LAB_NOTICE';
    fillSelect(item.querySelector('.condition-type'), conditionTypesForRow(selectedType).map(function (type) {
      return { value: type, label: conditionTypeLabels()[type] || type };
    }), selectedType);
    fillSelect(item.querySelector('.condition-notice'), mapEntries(noticeLabels(), ['high', 'low', 'unmarked']), data && data.notice);
    fillSelect(item.querySelector('.condition-range-status'), mapEntries(rangeLabels(), ['low', 'normal', 'high', 'no_range']), data && data.rangeStatus);
    if (item.querySelector('.condition-threshold-comparator')) {
      item.querySelector('.condition-threshold-comparator').value = (data && data.comparator) || 'gt';
    }
    if (item.querySelector('.condition-threshold-value')) {
      item.querySelector('.condition-threshold-value').value = data && data.threshold != null ? data.threshold : '';
    }
    fillSelect(item.querySelector('.condition-other-taxon'), allTaxa().map(function (taxon) {
      return { value: taxon.key, label: taxonLabel(taxon.key) };
    }), data && data.taxonKey);
    var kind = data && data.statusKind ? data.statusKind : 'LAB_NOTICE';
    item.querySelector('.condition-status-kind').value = kind;
    fillExpected(item, kind, data && data.expected);
    if (data && data.species) {
      item.querySelector('.condition-species-cat').checked = data.species.indexOf('cat') >= 0;
      item.querySelector('.condition-species-dog').checked = data.species.indexOf('dog') >= 0;
    }
    updateConditionFields(item, item.querySelector('.condition-type').value);
    item.querySelector('.condition-type').addEventListener('change', function (event) {
      updateConditionFields(item, event.target.value);
      markDirty();
      updateNaturalSummary();
    });
    item.querySelector('.condition-status-kind').addEventListener('change', function (event) {
      fillExpected(item, event.target.value);
      markDirty();
      updateNaturalSummary();
    });
    item.querySelector('.remove-condition').addEventListener('click', function () {
      item.remove();
      updateConditionNumbers();
      markDirty();
      updateNaturalSummary();
    });
    conditionsContainer.appendChild(item);
    updateConditionNumbers();
  }

  function updateConditionNumbers() {
    var children = Array.from(conditionsContainer.querySelectorAll('.condition-item'));
    children.forEach(function (item, index) { item.querySelector('.condition-number').textContent = String(index + 1); });
    noConditions.classList.toggle('hidden', children.length > 0);
  }

  function readConditions() {
    return Array.from(conditionsContainer.querySelectorAll('.condition-item')).map(function (item) {
      var type = item.querySelector('.condition-type').value;
      var condition = { id: item.dataset.conditionUid, type: type };
      if (type === 'LAB_NOTICE') condition.notice = item.querySelector('.condition-notice').value;
      if (type === 'RANGE_STATUS') condition.rangeStatus = item.querySelector('.condition-range-status').value;
      if (type === 'VALUE_THRESHOLD') {
        condition.comparator = item.querySelector('.condition-threshold-comparator').value;
        condition.threshold = Number(item.querySelector('.condition-threshold-value').value);
      }
      if (type === 'SPECIES') {
        condition.species = [];
        if (item.querySelector('.condition-species-cat').checked) condition.species.push('cat');
        if (item.querySelector('.condition-species-dog').checked) condition.species.push('dog');
      }
      if (type === 'OTHER_TAXON_STATUS') {
        condition.taxonKey = item.querySelector('.condition-other-taxon').value;
        condition.statusKind = item.querySelector('.condition-status-kind').value;
        condition.expected = item.querySelector('.condition-expected').value;
      }
      return condition;
    });
  }

  function collectCandidate() {
    var templateValue = byId('form-source-template').value;
    var base = editingSource || {};
    var compiled = editorMode === 'sentence'
      ? Engine.compileJudgment({
        observationKind: formObservation.value || Engine.DEFAULT_OBSERVATION_KIND,
        applicableSpecies: readSpeciesScope(),
        valueThreshold: readValueThreshold()
      }, { conditionId: (base.conditions && base.conditions[0] && base.conditions[0].id) || 'obs-1' })
      : {
        conditionLogic: byId('logic-operator').value,
        conditions: readConditions(),
        applicableSpecies: readSpeciesScope()
      };
    return {
      id: copyingToNewLineage ? null : (base.id ? 'session-' + base.id : null),
      lineageId: copyingToNewLineage ? null : (base.lineageId || null),
      basedOnRuleId: copyingToNewLineage ? null : (base.id || null),
      version: copyingToNewLineage ? 1 : (base.version ? base.version + 1 : 1),
      status: 'session',
      name: byId('form-rule-name').value.trim(),
      description: byId('form-rule-description').value.trim(),
      target: { level: formTargetLevel.value, taxonKey: formTargetTaxon.value },
      conditionLogic: compiled.conditionLogic,
      conditions: compiled.conditions,
      applicableSpecies: compiled.applicableSpecies,
      sourceTemplateIds: templateValue === 'all' ? [store.DEFAULT_SOURCE_ORG_ID, store.SECOND_SOURCE_ORG_ID] : [templateValue],
      professionalBasis: byId('form-professional-basis').value.trim(),
      reviewStatus: 'prototype_unreviewed',
      maintainer: '原型运营',
      riskLevel: Engine.DEFAULT_RISK_PLACEHOLDER,
      priority: Number(byId('form-priority').value) || 0,
      stableOrder: copyingToNewLineage ? 0 : (base.stableOrder || 0),
      conflictGroup: byId('form-conflict-group').value.trim() || null,
      output: {
        analysis: byId('form-analysis').value.trim(),
        advice: formAdvice.value.trim()
      }
    };
  }

  function serializeForm() {
    if (rulesFormView.classList.contains('hidden')) return '';
    return JSON.stringify(collectCandidate());
  }

  function setDirty(value) {
    dirty = !!value;
    var indicator = byId('dirty-indicator');
    indicator.textContent = dirty ? '有未保存修改' : '尚未修改';
    indicator.className = 'inline-flex px-2 py-1 rounded text-xs ' + (dirty ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700');
  }

  function markDirty() {
    if (rulesFormView.classList.contains('hidden')) return;
    setDirty(serializeForm() !== formBaseline);
    sessionCandidate = collectCandidate();
    testInputDirty = true;
    syncTestInputDirty();
  }

  function confirmDiscard() {
    if (!dirty) return true;
    return window.confirm('本次规则修改尚未保存。离开后将丢弃当前编辑会话，是否继续？');
  }

  function clearErrors() {
    byId('form-error-summary').classList.add('hidden');
    byId('form-error-list').innerHTML = '';
    Array.from(ruleForm.querySelectorAll('.field-error')).forEach(function (element) {
      element.textContent = '';
      element.classList.add('hidden');
    });
    Array.from(ruleForm.querySelectorAll('[aria-invalid="true"]')).forEach(function (element) { element.removeAttribute('aria-invalid'); });
  }

  function errorElementForField(field) {
    if (field === 'name') return { input: byId('form-rule-name'), error: byId('error-name') };
    if (field.indexOf('target') === 0) return { input: formTargetTaxon, error: byId('error-target') };
    if (field === 'applicableSpecies') return { input: formSpeciesScope, error: byId('error-applicable-species') };
    if (field === 'conflictGroup') return { input: byId('form-conflict-group'), error: byId('error-conflict-group') };
    if (field.indexOf('conditions') === 0 && field.indexOf('threshold') >= 0) {
      return { input: formThresholdValue, error: byId('error-value-threshold') };
    }
    if (field === 'output.analysis') return { input: byId('form-analysis'), error: byId('error-analysis') };
    if (field === 'output.advice') return { input: formAdvice, error: byId('error-advice') };
    if (field.indexOf('conditions') === 0) {
      return {
        input: editorMode === 'sentence' ? formObservation : byId('add-condition-btn'),
        error: byId('error-conditions')
      };
    }
    return null;
  }

  function validateCandidate(candidate) {
    var errors = store.validateAnalysisRuleDetailed(candidate, true) || [];
    if (!candidate.applicableSpecies.length) errors.push({ field: 'applicableSpecies', message: '请选择这条判断给谁用' });
    if (editorMode === 'sentence' && formThresholdEnabled.checked && !isFinite(Number(formThresholdValue.value))) {
      errors.push({ field: 'conditions.1.threshold', message: '勾选有效值门槛后请填写百分比数字' });
    }
    return errors;
  }

  function showErrors(errors) {
    clearErrors();
    if (!errors.length) return;
    byId('form-error-list').innerHTML = errors.map(function (item) { return '<li>' + escapeHtml(item.message) + '</li>'; }).join('');
    byId('form-error-summary').classList.remove('hidden');
    errors.forEach(function (item) {
      var mapped = errorElementForField(item.field || '');
      if (!mapped) return;
      mapped.input.setAttribute('aria-invalid', 'true');
      mapped.error.textContent = item.message;
      mapped.error.classList.remove('hidden');
    });
    byId('form-error-summary').focus();
  }

  function updateNaturalSummary() {
    if (rulesFormView.classList.contains('hidden')) return;
    var candidate = collectCandidate();
    byId('rule-natural-summary').textContent = editorMode === 'sentence'
      ? Engine.describeJudgmentSemantics({
        mode: 'sentence',
        observationKind: formObservation.value,
        valueThreshold: readValueThreshold()
      })
      : Engine.describeJudgmentSemantics(candidate);
  }

  function showForm(rule) {
    rulesListView.classList.add('hidden');
    rulesFormView.classList.remove('hidden');
    clearErrors();
    editingSource = rule || null;
    conditionsContainer.innerHTML = '';
    conditionCounter = 0;
    fillConflictGroups();
    fillObservation(Engine.DEFAULT_OBSERVATION_KIND);
    nameTouched = false;
    copyingToNewLineage = !!(rule && rule.__copyToSpecies);
    byId('copy-lineage-banner').classList.toggle('hidden', !copyingToNewLineage);
    if (rule) {
      var judgment = Engine.decompileJudgment(rule);
      editorMode = judgment.mode === 'advanced' ? 'advanced' : 'sentence';
      byId('form-title').textContent = copyingToNewLineage
        ? '复制到另一物种（新谱系）'
        : (rule.status === 'active' ? '编辑启用规则' : '基于归档版本新建');
      byId('form-version-source').textContent = copyingToNewLineage
        ? '保存后形成独立新谱系 v1 并立即启用，与原规则身份分开'
        : ('基于 ' + rule.name + ' v' + rule.version + '；保存后形成 v' + (rule.version + 1) + ' 并启用');
      byId('form-rule-name').value = rule.name || '';
      byId('form-rule-description').value = rule.description || '';
      formTargetLevel.value = rule.target && rule.target.level === 'genus' ? 'genus' : 'phylum';
      fillTargetTaxon(formTargetLevel.value, rule.target && rule.target.taxonKey);
      setSpeciesScope(rule.applicableSpecies);
      var templates = rule.sourceTemplateIds || [];
      byId('form-source-template').value = templates.length > 1 ? 'all' : (templates[0] || 'all');
      byId('form-professional-basis').value = rule.professionalBasis || '';
      byId('logic-operator').value = rule.conditionLogic || 'ALL';
      byId('form-priority').value = rule.priority == null ? 10 : rule.priority;
      byId('form-conflict-group').value = rule.conflictGroup || '';
      byId('form-analysis').value = rule.output && rule.output.analysis || '';
      formAdvice.value = rule.output && rule.output.advice || '';
      if (editorMode === 'sentence') {
        formObservation.value = judgment.observationKind || Engine.DEFAULT_OBSERVATION_KIND;
        setValueThreshold(judgment.valueThreshold);
        nameTouched = (rule.name || '') !== suggestedNameFromForm();
      } else {
        (rule.conditions || []).forEach(addCondition);
        setValueThreshold(null);
        nameTouched = true;
      }
    } else {
      editorMode = 'sentence';
      byId('form-title').textContent = '新增规则';
      byId('form-version-source').textContent = '首次保存将形成 v1 并立即启用';
      ruleForm.reset();
      formTargetLevel.value = 'phylum';
      fillTargetTaxon('phylum');
      fillObservation(Engine.DEFAULT_OBSERVATION_KIND);
      formSpeciesScope.value = librarySpecies === 'dog' ? 'dog' : 'cat';
      byId('form-source-template').value = 'all';
      byId('logic-operator').value = 'ALL';
      byId('form-priority').value = 10;
      setValueThreshold(null);
      updateGeneratedName();
    }
    syncEditorMode();
    syncAdvice();
    updateNaturalSummary();
    formBaseline = serializeForm();
    sessionCandidate = collectCandidate();
    setDirty(false);
    frozenTestRun = null;
    byId('last-session-test').textContent = '本次编辑尚未运行候选测试。';
    window.setTimeout(function () {
      (editorMode === 'sentence' ? formSpeciesScope : byId('form-rule-name')).focus();
    }, 0);
  }

  function showList(force) {
    if (!force && !confirmDiscard()) return;
    setDirty(false);
    editingSource = null;
    sessionCandidate = null;
    copyingToNewLineage = false;
    rulesFormView.classList.add('hidden');
    rulesListView.classList.remove('hidden');
    renderLineages();
  }

  function switchTab(name) {
    if (name === 'test' && !rulesFormView.classList.contains('hidden')) {
      sessionCandidate = collectCandidate();
    }
    var rulesActive = name === 'rules';
    [tabRules, tabTest].forEach(function (tab, index) {
      var selected = rulesActive ? index === 0 : index === 1;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.setAttribute('tabindex', selected ? '0' : '-1');
      tab.classList.toggle('border-blue-600', selected);
      tab.classList.toggle('text-blue-600', selected);
      tab.classList.toggle('border-transparent', !selected);
      tab.classList.toggle('text-gray-600', !selected);
    });
    sectionRules.classList.toggle('hidden', !rulesActive);
    sectionTest.classList.toggle('hidden', rulesActive);
    if (!rulesActive) refreshTestControls();
  }

  function testableReports() { return (state().reports || []).filter(function (report) { return report.status !== 'voided'; }); }

  function renderReportSelect() {
    var currentState = state();
    var reports = testableReports();
    if (!reports.some(function (report) { return report.id === selectedReportId; })) selectedReportId = reports[0] ? reports[0].id : '';
    var labels = reportStatusLabels();
    fillSelect(testReportSelect, reports.map(function (report) {
      var pet = C.lookupPet(currentState, report.petId);
      return { value: report.id, label: (report.reportNumber || report.id) + (pet ? ' · ' + pet.name : '') + '（' + (labels[report.status] || report.status) + '）' };
    }), selectedReportId);
  }

  function renderActiveRuleSelect() {
    var active = store.listRuleLineages().map(function (lineage) { return lineage.active; }).filter(Boolean);
    fillSelect(testActiveRuleSelect, active.map(function (rule) {
      return { value: rule.id, label: rule.name + ' · v' + rule.version };
    }), testActiveRuleSelect.value);
  }

  function renderCandidateSummary() {
    var container = byId('test-candidate-summary');
    if (!sessionCandidate) {
      container.innerHTML = '<strong>当前没有未保存候选。</strong> 本次测试的当前与候选使用同一启用基线，不会构造任意规则组合。';
      return;
    }
    var source = editingSource;
    container.innerHTML = '<strong>本次未保存候选：</strong> ' + escapeHtml(sessionCandidate.name || '未命名规则') +
      ' · 预计 v' + escapeHtml(String(sessionCandidate.version || 1)) + '。' +
      (source && source.status === 'active' ? '测试时临时替换同谱系当前启用版 v' + source.version + '；其他启用谱系保持不变。' : '测试时临时加入启用基线；其他启用谱系保持不变。');
  }

  function refreshTestControls() {
    renderReportSelect();
    renderActiveRuleSelect();
    renderCandidateSummary();
    syncTestInputDirty();
  }

  function syncTestInputDirty() {
    byId('test-input-dirty').classList.toggle('hidden', !testInputDirty);
  }

  function findUnit(evaluation, phylumKey) {
    return (evaluation.units || []).find(function (unit) { return unit.phylumKey === phylumKey; }) || { phylumKey: phylumKey, hits: [], drafts: {}, riskLevel: null };
  }

  function hitStatusText(hit) {
    if (hit.combineStatus === 'primary') return '采用命中';
    if (hit.combineStatus === 'superseded_by_conflict') return '历史冲突标记（当前不再淘汰）';
    if (hit.combineStatus === 'excluded') return '已人工排除';
    return '命中';
  }

  function ruleForEvaluatedItem(item) {
    if (sessionCandidate && (sessionCandidate.id === item.ruleId || (sessionCandidate.lineageId && sessionCandidate.lineageId === item.lineageId))) {
      return sessionCandidate;
    }
    return (state().analysisRuleCatalog || []).find(function (rule) { return rule.id === item.ruleId; }) ||
      (state().analysisRuleCatalog || []).find(function (rule) { return rule.lineageId === item.lineageId && rule.status === 'active'; }) ||
      null;
  }

  function doctorTextForEvaluatedRule(item, hit) {
    var rule = ruleForEvaluatedItem(item);
    if (rule) {
      try {
        return store.explainRuleForReport(selectedReportId, rule).doctorText;
      } catch (ignore) { /* fall through */ }
    }
    var targetLabel = taxonShortLabel(item.target && item.target.taxonKey);
    if (item.scope && item.scope.speciesMatched === false) {
      return '目标菌「' + targetLabel + '」不是这条要给的物种，所以不说。';
    }
    if (item.scope && item.scope.templateMatched === false) {
      return '检测方案对不上，这条不说。';
    }
    return (item.matched ? '说。' : '不说。') + (item.reason ? item.reason : '');
  }

  function renderRuleEvaluationCard(item, hit) {
    var status = hit ? hitStatusText(hit) : '已评估未命中';
    var statusClass = hit && hit.combineStatus === 'primary' ? 'bg-green-100 text-green-800' : (hit ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700');
    return '<div class="test-rule-row border border-slate-200 rounded p-3 bg-white" data-failed="' + (!item.matched ? 'true' : 'false') + '">' +
      '<div class="flex flex-wrap justify-between gap-2"><strong>' + escapeHtml(item.ruleName) + ' · v' + escapeHtml(String(item.ruleVersion || 1)) + '</strong>' +
      '<span class="inline-flex px-2 py-0.5 rounded text-xs ' + statusClass + '">' + status + '</span></div>' +
      '<p class="text-sm text-slate-800 mt-2">' + escapeHtml(doctorTextForEvaluatedRule(item, hit)) + '</p>' +
      (hit && hit.combineReason ? '<p class="text-sm text-slate-600 mt-1">' + escapeHtml(hit.combineReason) + '</p>' : '') +
    '</div>';
  }

  function renderRunMeta(run) {
    var replacement = run.replacement;
    var replacementText = !replacement ? '无替换' : (replacement.isNewLineage ? '临时加入新谱系' : 'v' + replacement.fromVersion + ' → 会话候选 v' + replacement.toVersion);
    byId('test-run-meta').innerHTML = '<div class="rounded border border-slate-200 bg-slate-50 p-4"><h3 class="font-semibold">冻结运行信息</h3>' +
      '<dl class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mt-2 text-sm">' +
      '<div><dt class="text-slate-500">运行编号</dt><dd>' + escapeHtml(run.runId) + '</dd></div>' +
      '<div><dt class="text-slate-500">运行时间</dt><dd>' + escapeHtml(formatDate(run.createdAt)) + '</dd></div>' +
      '<div><dt class="text-slate-500">报告 / 工作版本</dt><dd>' + escapeHtml(run.reportNumber) + ' / v' + escapeHtml(String(run.workingVersion)) + '</dd></div>' +
      '<div><dt class="text-slate-500">物种 / 来源模板</dt><dd>' + escapeHtml(run.species === 'cat' ? '猫' : run.species === 'dog' ? '狗' : '未知') + ' / ' + escapeHtml(run.sourceTemplateId || '—') + '</dd></div>' +
      '<div><dt class="text-slate-500">输入签名</dt><dd>' + escapeHtml(run.inputSignature) + '</dd></div>' +
      '<div><dt class="text-slate-500">引擎版本</dt><dd>' + escapeHtml(run.engineVersion) + '</dd></div>' +
      '<div><dt class="text-slate-500">启用规则数</dt><dd>' + run.baselineRules.length + '</dd></div>' +
      '<div><dt class="text-slate-500">替换关系</dt><dd>' + escapeHtml(replacementText) + '</dd></div></dl></div>';
  }

  function renderDiffSummary(run) {
    var diff = run.diff;
    var analysisChanges = diff.changedUnits.filter(function (unit) { return unit.changes.indexOf('analysis') >= 0; }).length;
    var adviceChanges = diff.changedUnits.filter(function (unit) { return unit.changes.indexOf('advice') >= 0; }).length;
    var hitChanges = diff.changedUnits.filter(function (unit) { return unit.changes.indexOf('hits') >= 0; }).length;
    byId('test-diff-summary').innerHTML = '<div class="rounded border border-blue-200 bg-blue-50 p-4"><h3 class="font-semibold text-blue-950">当前启用结果 vs 候选结果</h3>' +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">' +
      '<div><strong>' + diff.addedLineages.length + '</strong><br>新增采用命中</div><div><strong>' + diff.removedLineages.length + '</strong><br>消失采用命中</div>' +
      '<div><strong>' + hitChanges + '</strong><br>命中数变化菌门</div>' +
      '<div><strong>' + analysisChanges + '</strong><br>分析变化菌门</div><div><strong>' + adviceChanges + '</strong><br>建议变化菌门</div></div></div>';
  }

  function renderPhylumResults(run) {
    var keys = {};
    (run.current.units || []).forEach(function (unit) { keys[unit.phylumKey] = true; });
    (run.candidate.units || []).forEach(function (unit) { keys[unit.phylumKey] = true; });
    (run.current.evaluatedRules || []).forEach(function (rule) {
      var taxon = rule.target && findTaxon(rule.target.taxonKey);
      var phylumKey = taxon && (taxon.level === 'phylum' ? taxon.key : taxon.parentKey);
      if (phylumKey) keys[phylumKey] = true;
    });
    var changedMap = {};
    run.diff.changedUnits.forEach(function (unit) { changedMap[unit.phylumKey] = unit; });
    var html = Object.keys(keys).map(function (phylumKey) {
      var current = findUnit(run.current, phylumKey);
      var candidate = findUnit(run.candidate, phylumKey);
      var candidateHitByLineage = {};
      (candidate.hits || []).forEach(function (hit) { candidateHitByLineage[hit.lineageId] = hit; });
      var relevantRules = (run.candidate.evaluatedRules || []).filter(function (item) {
        var taxon = item.target && findTaxon(item.target.taxonKey);
        return taxon && (taxon.level === 'phylum' ? taxon.key : taxon.parentKey) === phylumKey;
      });
      var changed = !!changedMap[phylumKey];
      return '<article class="test-phylum-card rounded-lg border border-slate-200 p-4" data-changed="' + (changed ? 'true' : 'false') + '">' +
        '<div class="flex flex-wrap justify-between gap-2"><h3 class="font-semibold">' + escapeHtml(taxonLabel(phylumKey)) + '</h3>' +
        '<span class="text-sm ' + (changed ? 'text-blue-800 font-medium' : 'text-slate-600') + '">' + (changed ? '存在变化' : '无变化') + '</span></div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3 text-sm"><div class="rounded bg-slate-50 p-3"><strong>当前启用结果</strong><p class="mt-2 whitespace-pre-wrap">分析：' + escapeHtml(current.drafts.analysis || '—') + '</p><p class="mt-2 whitespace-pre-wrap">建议：' + escapeHtml(current.drafts.advice || '—') + '</p></div>' +
        '<div class="rounded bg-blue-50 p-3"><strong>候选结果</strong><p class="mt-2 whitespace-pre-wrap">分析：' + escapeHtml(candidate.drafts.analysis || '—') + '</p><p class="mt-2 whitespace-pre-wrap">建议：' + escapeHtml(candidate.drafts.advice || '—') + '</p></div></div>' +
        '<details class="mt-3" open><summary class="cursor-pointer text-sm font-medium text-blue-700">候选逐规则判定（' + relevantRules.length + '）</summary><div class="space-y-2 mt-2">' +
        (relevantRules.length ? relevantRules.map(function (item) { return renderRuleEvaluationCard(item, candidateHitByLineage[item.lineageId]); }).join('') : '<p class="text-sm text-slate-600">该菌门没有可评估规则</p>') +
        '</div></details></article>';
    }).join('');
    byId('test-phylum-results').innerHTML = html || '<p class="text-slate-600">该报告没有可展示的菌门结果。</p>';
    applyTestFilters();
  }

  function renderFrozenTest(run) {
    frozenTestRun = run;
    testEmpty.classList.add('hidden');
    testResults.classList.remove('hidden');
    renderRunMeta(run);
    renderDiffSummary(run);
    renderPhylumResults(run);
    byId('last-session-test').textContent = '最近测试：' + run.runId + ' · ' + formatDate(run.createdAt) + ' · ' + run.diff.changedUnits.length + ' 个菌门发生变化。';
    testResults.setAttribute('aria-label', '测试完成，' + run.diff.changedUnits.length + ' 个菌门发生变化');
  }

  function runTest() {
    if (!selectedReportId) return;
    if (sessionCandidate) {
      var errors = validateCandidate(sessionCandidate);
      if (errors.length) {
        switchTab('rules');
        showErrors(errors);
        return;
      }
    }
    try {
      var run = store.previewRuleEvaluation(selectedReportId, { sessionCandidate: sessionCandidate });
      renderFrozenTest(run);
      testInputDirty = false;
      syncTestInputDirty();
    } catch (error) {
      testResults.classList.add('hidden');
      testEmpty.classList.remove('hidden');
      testEmpty.textContent = '测试失败：' + (error.message || error);
    }
  }

  function applyTestFilters() {
    var onlyChanges = byId('test-only-changes').checked;
    var onlyFailures = byId('test-only-failures').checked;
    Array.from(byId('test-phylum-results').querySelectorAll('.test-phylum-card')).forEach(function (card) {
      var show = !onlyChanges || card.dataset.changed === 'true';
      card.classList.toggle('hidden', !show);
      Array.from(card.querySelectorAll('.test-rule-row')).forEach(function (row) {
        row.classList.toggle('hidden', onlyFailures && row.dataset.failed !== 'true');
      });
    });
  }

  function exportTestJson() {
    if (!frozenTestRun) return;
    var blob = new Blob([JSON.stringify(frozenTestRun, null, 2)], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = frozenTestRun.runId + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function openImpactDialog(title, bodyHtml, onConfirm) {
    lastFocusedBeforeDialog = document.activeElement;
    pendingConfirmedAction = onConfirm;
    byId('rule-confirm-title').textContent = title;
    byId('rule-confirm-body').innerHTML = bodyHtml;
    confirmDialog.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    confirmCancel.focus();
  }

  function closeImpactDialog() {
    confirmDialog.classList.add('hidden');
    document.body.style.overflow = '';
    pendingConfirmedAction = null;
    if (lastFocusedBeforeDialog && lastFocusedBeforeDialog.focus) lastFocusedBeforeDialog.focus();
  }

  function impactHtml(impact, actionText) {
    var counts = impact.reportCounts;
    var testText = frozenTestRun ? frozenTestRun.runId + '，' + frozenTestRun.diff.changedUnits.length + ' 个菌门变化' : '本次尚未运行候选测试';
    return '<p><strong>' + escapeHtml(actionText) + '</strong></p>' +
      '<ul class="list-disc ml-5 space-y-1"><li>版本变化：' + (impact.fromVersion ? 'v' + impact.fromVersion : '首次保存') + ' → ' + (impact.toVersion ? 'v' + impact.toVersion : '无启用版本') + '</li>' +
      '<li>当前测试摘要：' + escapeHtml(testText) + '</li>' +
      '<li>需要主动重新分析的未发布工作：待完善/其他 ' + counts.incomplete + '，待审核 ' + counts.pending_review + '，活动更正版本 ' + counts.correction + '</li>' +
      '<li>已发布线上报告 ' + counts.published + ' 份不会自动改变。</li></ul>' +
      '<p class="rounded bg-amber-50 border border-amber-200 p-3">下一步：执行后由运营进入受影响的未发布报告，主动重新分析并重新确认菌门内容。本原型只能按当前 store 状态计算数量，不伪造审核结论。</p>';
  }

  function requestSave() {
    var candidate = collectCandidate();
    sessionCandidate = candidate;
    var errors = validateCandidate(candidate);
    if (errors.length) { showErrors(errors); return; }
    var impact = store.getRuleChangeImpact(candidate, 'activate');
    openImpactDialog('确认保存并启用', impactHtml(impact, editingSource && editingSource.status === 'active' ? '原子创建新版本并替换当前启用版，旧版本转为只读归档。' : '创建首个启用版本；不会产生持久未启用版本。'), function () {
      try {
        store.saveAndActivateAnalysisRule(candidate, { actor: '原型运营' });
        setDirty(false);
        closeImpactDialog();
        C.toast && C.toast('新版本已保存并启用，旧启用版已归档', 'success');
        showList(true);
      } catch (error) {
        closeImpactDialog();
        showErrors(error.validationErrors || [{ field: 'rule', message: error.message || String(error) }]);
      }
    });
  }

  function requestDeactivate(lineageId) {
    var lineage = store.listRuleLineages().find(function (item) { return item.lineageId === lineageId; });
    if (!lineage || !lineage.active) return;
    var impact = store.getRuleChangeImpact(lineage.active, 'deactivate');
    openImpactDialog('确认停用规则谱系', impactHtml(impact, '停用“' + lineage.active.name + '”当前启用版；历史版本继续保留，只是不再参与之后的正式分析。'), function () {
      try {
        store.deactivateAnalysisRuleLineage(lineageId, { actor: '原型运营', reason: '运营确认停用规则谱系' });
        closeImpactDialog();
        C.toast && C.toast('规则谱系已停用，历史版本已保留', 'success');
        renderLineages();
      } catch (error) {
        closeImpactDialog();
        C.toast && C.toast(error.message || String(error), 'error');
      }
    });
  }

  function requestCopyToSpecies(ruleId, species) {
    var rule = (state().analysisRuleCatalog || []).find(function (item) { return item.id === ruleId; });
    if (!rule) return;
    var label = Engine.SPECIES_LABELS[species] || species;
    openImpactDialog('复制到另一物种', '<p>将把「' + escapeHtml(rule.name) + '」复制为 <strong>' + escapeHtml(label) + '</strong> 的新谱系并立即启用。文案先保持相同，身份与原规则分开；漏改文案可接受。</p>', function () {
      try {
        store.copyAnalysisRuleToSpecies(ruleId, species, { actor: '原型运营' });
        closeImpactDialog();
        librarySpecies = species;
        C.toast && C.toast('已复制为新谱系，可再按该物种改文案', 'success');
        renderLineages();
      } catch (error) {
        closeImpactDialog();
        C.toast && C.toast(error.message || String(error), 'error');
      }
    });
  }

  function editRuleById(ruleId) {
    var rule = (state().analysisRuleCatalog || []).find(function (item) { return item.id === ruleId; });
    if (rule) {
      switchTab('rules');
      showForm(rule);
    }
  }

  function previewCandidate() {
    sessionCandidate = collectCandidate();
    var errors = validateCandidate(sessionCandidate);
    if (errors.length) { showErrors(errors); return; }
    testInputDirty = true;
    switchTab('test');
    runTest();
  }

  function onBeforeUnload(event) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function onDialogKeydown(event) {
    if (confirmDialog.classList.contains('hidden')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeImpactDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = Array.from(confirmDialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'));
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  tabRules.addEventListener('click', function () { switchTab('rules'); });
  tabTest.addEventListener('click', function () { switchTab('test'); });
  [tabRules, tabTest].forEach(function (tab) {
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var next = tab === tabRules ? tabTest : tabRules;
      next.focus();
      next.click();
    });
  });
  byId('add-new-rule').addEventListener('click', function () { showForm(null); });
  byId('cancel-form').addEventListener('click', function () { showList(false); });
  byId('preview-candidate-btn').addEventListener('click', previewCandidate);
  byId('add-condition-btn').addEventListener('click', function () { addCondition(); markDirty(); updateNaturalSummary(); });
  formTargetLevel.addEventListener('change', function () {
    fillTargetTaxon(formTargetLevel.value);
    updateGeneratedName();
    markDirty();
    updateNaturalSummary();
  });
  formTargetTaxon.addEventListener('change', function () {
    updateGeneratedName();
    markDirty();
    updateNaturalSummary();
  });
  formObservation.addEventListener('change', function () {
    updateGeneratedName();
    markDirty();
    updateNaturalSummary();
  });
  formSpeciesScope.addEventListener('change', function () {
    updateGeneratedName();
    markDirty();
    updateNaturalSummary();
  });
  formThresholdEnabled.addEventListener('change', function () {
    syncThresholdFields();
    markDirty();
    updateNaturalSummary();
  });
  formThresholdComparator.addEventListener('change', function () {
    markDirty();
    updateNaturalSummary();
  });
  formThresholdValue.addEventListener('input', function () {
    markDirty();
    updateNaturalSummary();
  });
  byId('form-rule-name').addEventListener('input', function () {
    nameTouched = byId('form-rule-name').value.trim() !== suggestedNameFromForm();
  });
  ruleForm.addEventListener('input', function () { markDirty(); updateNaturalSummary(); });
  ruleForm.addEventListener('change', function () { markDirty(); updateNaturalSummary(); });
  ruleForm.addEventListener('submit', function (event) { event.preventDefault(); requestSave(); });
  searchInput.addEventListener('input', renderLineages);
  filterStatus.addEventListener('change', renderLineages);
  byId('library-species-switch').addEventListener('click', function (event) {
    var button = event.target.closest('[data-species]');
    if (!button) return;
    librarySpecies = button.dataset.species;
    renderLineages();
  });
  lineageList.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) return;
    if (button.classList.contains('rule-edit')) editRuleById(button.dataset.id);
    if (button.classList.contains('rule-copy-species')) requestCopyToSpecies(button.dataset.id, button.dataset.species);
    if (button.classList.contains('rule-deactivate')) requestDeactivate(button.dataset.lineage);
  });
  testReportSelect.addEventListener('change', function () { selectedReportId = testReportSelect.value; testInputDirty = true; syncTestInputDirty(); });
  testActiveRuleSelect.addEventListener('change', function () { testInputDirty = true; syncTestInputDirty(); });
  byId('test-edit-active-btn').addEventListener('click', function () { editRuleById(testActiveRuleSelect.value); });
  byId('test-run-btn').addEventListener('click', runTest);
  byId('test-only-changes').addEventListener('change', applyTestFilters);
  byId('test-only-failures').addEventListener('change', applyTestFilters);
  byId('test-export-json').addEventListener('click', exportTestJson);
  confirmCancel.addEventListener('click', closeImpactDialog);
  confirmOk.addEventListener('click', function () { if (pendingConfirmedAction) pendingConfirmedAction(); });
  confirmDialog.addEventListener('mousedown', function (event) { if (event.target === confirmDialog) closeImpactDialog(); });
  document.addEventListener('keydown', onDialogKeydown);
  window.addEventListener('beforeunload', onBeforeUnload);

  var unsubscribe = C.subscribeDemo ? C.subscribeDemo(function () {
    if (!rulesListView.classList.contains('hidden')) renderLineages();
    if (!sectionTest.classList.contains('hidden')) refreshTestControls();
  }) : function () {};

  window.__petAdminCanLeavePage = function () { return confirmDiscard(); };
  window.__petAdminPageTeardown = function () {
    unsubscribe();
    document.removeEventListener('keydown', onDialogKeydown);
    window.removeEventListener('beforeunload', onBeforeUnload);
    window.__petAdminCanLeavePage = null;
  };

  fillTargetTaxon('phylum');
  fillObservation(Engine.DEFAULT_OBSERVATION_KIND);
  setValueThreshold(null);
  renderLineages();
  refreshTestControls();
  switchTab('rules');
}
