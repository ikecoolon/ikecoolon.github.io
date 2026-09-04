/**
 * PET 报告原型 — 分析规则引擎（共享层，纯函数）
 * 浏览器: window.PetReportAnalysisEngine
 * Node:   require('./analysis-engine.js')
 *
 * 不读写 store。输入为「已装饰的有效检测结果」（由 mock-store.decorateResult 产出，
 * 含 level / phylumKey / labNotice / rangeStatus / rangeSource）与规则列表，
 * 输出按菌门分组的命中列表（属级命中归入所属菌门单元）。
 *
 * 报告工作台的正式运行（mock-store.runReportAnalysis）与分析规则页的只读测试
 * （mock-store.previewRuleEvaluation）共用本引擎。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PetReportAnalysisEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ENGINE_VERSION = '4.0.0';

  var RISK_ORDER = { high: 3, medium: 2, low: 1, notice: 0 };
  var RISK_LEVELS = ['low', 'medium', 'high', 'notice'];
  var DEFAULT_RISK_PLACEHOLDER = 'medium';
  var CONDITION_TYPES = ['LAB_NOTICE', 'RANGE_STATUS', 'NOT_DETECTED', 'VALUE_THRESHOLD', 'SPECIES', 'OTHER_TAXON_STATUS'];
  var LAB_NOTICES = ['high', 'low', 'unmarked'];
  var RANGE_STATUSES = ['low', 'normal', 'high', 'no_range'];
  var VALUE_COMPARATORS = ['lt', 'gt', 'lte', 'gte'];
  var REPORTABLE_SPECIES = ['cat', 'dog'];

  var LAB_NOTICE_LABELS = { high: '实验室标注偏高', low: '实验室标注偏低', unmarked: '未标注' };
  var RANGE_STATUS_LABELS = { low: '低于参考范围', normal: '参考范围内', high: '高于参考范围', no_range: '无有效参考范围' };
  var SPECIES_LABELS = { cat: '猫', dog: '狗' };
  var VALUE_COMPARATOR_LABELS = { lt: '低于', gt: '高于', lte: '≤', gte: '≥' };
  var DEFAULT_OBSERVATION_KIND = 'lab_high';
  var OBSERVATION_KINDS = [
    { id: 'lab_high', group: 'lab', type: 'LAB_NOTICE', notice: 'high', label: '实验室标了偏高', shortLabel: '实验室标偏高' },
    { id: 'lab_low', group: 'lab', type: 'LAB_NOTICE', notice: 'low', label: '实验室标了偏低', shortLabel: '实验室标偏低' },
    { id: 'lab_unmarked', group: 'lab', type: 'LAB_NOTICE', notice: 'unmarked', label: '实验室未标注', shortLabel: '实验室未标注' },
    { id: 'not_detected', group: 'lab', type: 'NOT_DETECTED', label: '未检出', shortLabel: '未检出' },
    { id: 'range_low', group: 'range', type: 'RANGE_STATUS', rangeStatus: 'low', label: '相对范围偏低', shortLabel: '相对范围偏低' },
    { id: 'range_normal', group: 'range', type: 'RANGE_STATUS', rangeStatus: 'normal', label: '相对范围正常', shortLabel: '相对范围正常' },
    { id: 'range_high', group: 'range', type: 'RANGE_STATUS', rangeStatus: 'high', label: '相对范围偏高', shortLabel: '相对范围偏高' },
    { id: 'range_none', group: 'range', type: 'RANGE_STATUS', rangeStatus: 'no_range', label: '无有效范围', shortLabel: '无有效范围' }
  ];
  var OBSERVATION_SEMANTICS = {
    lab_high: '这条只认实验室在目标菌上标了偏高。没有参考范围也能说。实验室未标注、标偏低或未检出时不说。不要理解成参考范围偏高。',
    lab_low: '这条只认实验室在目标菌上标了偏低。没有参考范围也能说。实验室未标注、标偏高或未检出时不说。不要理解成参考范围偏低。',
    lab_unmarked: '这条只认实验室未标注。没有参考范围也能说。实验室标了偏高或偏低、以及未检出时不说。未标注不是「参考范围内」，也不是正常。',
    not_detected: '这条只认实验室明确未检出。只要有可比较的检测值就不说，不论实验室标注或相对范围如何。',
    range_low: '这条只认目标菌相对有效参考范围偏低。当前真实报告常常没有范围——没有有效范围时不说。实验室标注不参与这条，也不要把实验室偏低当成这条。',
    range_normal: '这条只认目标菌落在有效参考范围内。当前真实报告常常没有范围——没有有效范围时不说。不要把实验室未标注理解成范围内。',
    range_high: '这条只认目标菌相对有效参考范围偏高。当前真实报告常常没有范围——没有有效范围时不说。不要把实验室偏高当成这条。',
    range_none: '这条只认这份报告对该目标菌没有有效参考范围。只要有有效范围就不说。这不是实验室未标注，也不是未检出。'
  };

  var hitCounter = 0;

  function uid(prefix) {
    hitCounter += 1;
    return prefix + '-' + Date.now().toString(36) + '-' + hitCounter.toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  function isEffectiveResult(result) {
    if (!result) return false;
    if (result.dataStatus === 'NOT_DETECTED') return true;
    if (result.dataStatus !== 'PRESENT') return false;
    var raw = result.effectiveValue !== undefined ? result.effectiveValue : result.value;
    if (raw == null || raw === '') return false;
    return isFinite(Number(raw));
  }

  function normalizeSpeciesList(species) {
    if (species == null || species === '') return [];
    var list = Array.isArray(species) ? species : String(species).split(/[,，、\s]+/);
    var out = [];
    list.forEach(function (item) {
      var s = String(item == null ? '' : item).trim().toLowerCase();
      if (!s) return;
      if (s === '猫' || s === 'cat') s = 'cat';
      else if (s === '狗' || s === '犬' || s === 'dog') s = 'dog';
      else if (s === '通用' || s === 'all' || s === '*') s = 'all';
      if (out.indexOf(s) < 0) out.push(s);
    });
    return out;
  }

  function speciesMatches(conditionSpecies, reportSpecies) {
    var allowed = normalizeSpeciesList(conditionSpecies).filter(function (s) {
      return s !== 'all';
    });
    if (!allowed.length) return false;
    var species = String(reportSpecies || '').toLowerCase();
    return allowed.indexOf(species) >= 0;
  }

  function closedSpeciesList(species) {
    return normalizeSpeciesList(species).filter(function (s) {
      return REPORTABLE_SPECIES.indexOf(s) >= 0;
    });
  }

  function compareEffectiveValue(value, comparator, threshold) {
    if (comparator === 'lt') return value < threshold;
    if (comparator === 'gt') return value > threshold;
    if (comparator === 'lte') return value <= threshold;
    if (comparator === 'gte') return value >= threshold;
    return false;
  }

  function readEffectiveNumber(result) {
    if (!result) return NaN;
    var raw = result.effectiveValue !== undefined ? result.effectiveValue : result.value;
    return Number(raw);
  }

  function describeValue(result) {
    if (!result) return '无结果';
    if (result.dataStatus === 'NOT_DETECTED') return '未检出';
    if (result.dataStatus !== 'PRESENT') return '状态 ' + result.dataStatus;
    var v = result.effectiveValue !== undefined ? result.effectiveValue : result.value;
    return (v == null ? '—' : v) + (result.unit || '');
  }

  /**
   * 构建评估上下文。
   * @param {{ results: object[], species: string|null, taxa: object[] }} input
   */
  function buildContext(input) {
    input = input || {};
    var results = (input.results || []).filter(function (r) { return r && r.isCurrent !== false; });
    var byKey = {};
    results.forEach(function (r) {
      if (!byKey[r.key]) byKey[r.key] = r;
    });
    var taxaByKey = {};
    (input.taxa || []).forEach(function (t) {
      if (t && t.key != null) taxaByKey[t.key] = t;
    });
    return {
      species: input.species || null,
      sourceTemplateId: input.sourceTemplateId || null,
      results: results,
      resultByKey: byKey,
      taxaByKey: taxaByKey
    };
  }

  function phylumKeyForTarget(target, ctx) {
    if (!target || !target.taxonKey) return null;
    var res = ctx.resultByKey[target.taxonKey];
    if (res && res.phylumKey) return res.phylumKey;
    var taxon = ctx.taxaByKey[target.taxonKey];
    if (!taxon) return target.level === 'phylum' ? target.taxonKey : null;
    if (taxon.level === 'phylum') return taxon.key;
    return taxon.parentKey || null;
  }

  /**
   * 评估单个条件。
   * @returns {{ conditionId, type, taxonKey, actualValue, expected, matched, message, sourceResultId }}
   */
  function evaluateCondition(condition, rule, ctx) {
    condition = condition || {};
    var target = (rule && rule.target) || {};
    var base = {
      conditionId: condition.id || null,
      type: condition.type,
      taxonKey: target.taxonKey || null,
      actualValue: null,
      expected: null,
      matched: false,
      message: '',
      sourceResultId: null
    };
    var res;

    if (condition.type === 'SPECIES') {
      var allowed = normalizeSpeciesList(condition.species);
      base.taxonKey = null;
      base.expected = allowed.map(function (s) { return SPECIES_LABELS[s] || s; }).join(' / ');
      base.actualValue = SPECIES_LABELS[ctx.species] || ctx.species || '未知';
      base.matched = !!ctx.species && speciesMatches(condition.species, ctx.species);
      base.message = '报告物种 ' + base.actualValue + (base.matched ? ' ∈ ' : ' ∉ ') + '[' + base.expected + ']';
      return base;
    }

    if (condition.type === 'OTHER_TAXON_STATUS') {
      base.taxonKey = condition.taxonKey || null;
      res = base.taxonKey ? ctx.resultByKey[base.taxonKey] : null;
      base.expected = condition.expected || null;
      if (!res || !isEffectiveResult(res)) {
        base.message = '「' + (base.taxonKey || '?') + '」无有效结果';
        return base;
      }
      base.sourceResultId = res.id || null;
      if (condition.statusKind === 'RANGE_STATUS') {
        base.actualValue = res.rangeStatus || null;
        base.matched = !!base.actualValue && base.actualValue === condition.expected;
        base.message = '「' + base.taxonKey + '」' + (RANGE_STATUS_LABELS[base.actualValue] || '无范围判定') +
          (base.matched ? ' = ' : ' ≠ ') + (RANGE_STATUS_LABELS[condition.expected] || condition.expected);
      } else {
        base.actualValue = res.labNotice || 'unmarked';
        base.matched = base.actualValue === condition.expected;
        base.message = '「' + base.taxonKey + '」' + (LAB_NOTICE_LABELS[base.actualValue] || base.actualValue) +
          (base.matched ? ' = ' : ' ≠ ') + (LAB_NOTICE_LABELS[condition.expected] || condition.expected);
      }
      return base;
    }

    // 以下条件均作用于规则目标分类单元
    res = target.taxonKey ? ctx.resultByKey[target.taxonKey] : null;
    if (!res) {
      base.message = '目标「' + (target.taxonKey || '?') + '」无检测结果';
      return base;
    }
    base.sourceResultId = res.id || null;

    if (condition.type === 'NOT_DETECTED') {
      base.expected = 'NOT_DETECTED';
      base.actualValue = res.dataStatus;
      base.matched = res.dataStatus === 'NOT_DETECTED';
      base.message = '「' + target.taxonKey + '」' + describeValue(res) + (base.matched ? '（未检出 ✓）' : '（非未检出）');
      return base;
    }

    if (condition.type === 'VALUE_THRESHOLD') {
      var comparator = condition.comparator;
      var threshold = Number(condition.threshold);
      base.expected = (VALUE_COMPARATOR_LABELS[comparator] || comparator || '?') + ' ' +
        (isFinite(threshold) ? threshold : '?') + '%';
      if (res.dataStatus === 'NOT_DETECTED') {
        base.message = '「' + target.taxonKey + '」未检出，没有可比较的有效值';
        return base;
      }
      var effective = readEffectiveNumber(res);
      base.actualValue = isFinite(effective) ? effective : null;
      if (!isEffectiveResult(res) || !isFinite(effective)) {
        base.message = '「' + target.taxonKey + '」没有可比较的有效值，数值门槛不满足';
        return base;
      }
      if (VALUE_COMPARATORS.indexOf(comparator) < 0 || !isFinite(threshold)) {
        base.message = '「' + target.taxonKey + '」有效值门槛不完整，不能比较';
        return base;
      }
      base.matched = compareEffectiveValue(effective, comparator, threshold);
      base.message = '「' + target.taxonKey + '」有效值 ' + effective + '% ' +
        (base.matched ? '满足' : '不满足') + ' ' + base.expected;
      return base;
    }

    if (!isEffectiveResult(res)) {
      base.actualValue = res.dataStatus;
      base.message = '「' + target.taxonKey + '」状态 ' + res.dataStatus + '，不参与判定';
      return base;
    }

    if (condition.type === 'LAB_NOTICE') {
      base.expected = condition.notice || null;
      base.actualValue = res.labNotice || 'unmarked';
      base.matched = base.actualValue === condition.notice;
      base.message = '「' + target.taxonKey + '」' + describeValue(res) + ' · ' +
        (LAB_NOTICE_LABELS[base.actualValue] || base.actualValue) +
        (base.matched ? ' = ' : ' ≠ ') + (LAB_NOTICE_LABELS[condition.notice] || condition.notice);
      return base;
    }

    if (condition.type === 'RANGE_STATUS') {
      base.expected = condition.rangeStatus || null;
      if (res.dataStatus === 'NOT_DETECTED') {
        base.actualValue = null;
        base.message = '「' + target.taxonKey + '」未检出，不做范围判定';
        return base;
      }
      base.actualValue = res.rangeStatus || 'no_range';
      base.matched = base.actualValue === condition.rangeStatus;
      var rangeText = res.range ? '（范围 ' + res.range.min + '–' + res.range.max + (res.range.unit || '') + '）' : '';
      base.message = '「' + target.taxonKey + '」' + describeValue(res) + rangeText + ' · ' +
        (RANGE_STATUS_LABELS[base.actualValue] || base.actualValue) +
        (base.matched ? ' = ' : ' ≠ ') + (RANGE_STATUS_LABELS[condition.rangeStatus] || condition.rangeStatus);
      return base;
    }

    base.message = '未知条件类型 ' + condition.type;
    return base;
  }

  /**
   * 评估单条规则。
   * @returns {{ matched, conditionResults, sourceResultIds, phylumKey, reason }}
   */
  function evaluateRule(rule, ctx) {
    rule = rule || {};
    var target = rule.target || {};
    var conditions = rule.conditions || [];
    var results = conditions.map(function (c) { return evaluateCondition(c, rule, ctx); });
    var speciesInScope = speciesMatches(rule.applicableSpecies, ctx.species);
    var templates = Array.isArray(rule.sourceTemplateIds) ? rule.sourceTemplateIds : [];
    var templateInScope = !templates.length || templates.indexOf(ctx.sourceTemplateId) >= 0;
    var matched;
    if (!conditions.length) {
      matched = false;
    } else if (rule.conditionLogic === 'ANY') {
      matched = results.some(function (r) { return r.matched; });
    } else {
      matched = results.every(function (r) { return r.matched; });
    }
    var targetResult = target.taxonKey ? ctx.resultByKey[target.taxonKey] : null;
    var sourceIds = [];
    if (targetResult && targetResult.id) sourceIds.push(targetResult.id);
    results.forEach(function (r) {
      if (r.sourceResultId && sourceIds.indexOf(r.sourceResultId) < 0) sourceIds.push(r.sourceResultId);
    });
    var reason = null;
    if (!speciesInScope) reason = '报告物种不在规则适用范围';
    else if (!templateInScope) reason = '检测方案或来源模板不在规则适用范围';
    else if (!conditions.length) reason = '规则没有条件';
    else if (!targetResult) reason = '目标「' + (target.taxonKey || '?') + '」无检测结果';
    return {
      matched: matched && !!targetResult && speciesInScope && templateInScope,
      conditionResults: results,
      sourceResultIds: sourceIds,
      phylumKey: phylumKeyForTarget(target, ctx),
      reason: reason,
      scope: {
        speciesMatched: speciesInScope,
        templateMatched: templateInScope,
        reportSpecies: ctx.species,
        sourceTemplateId: ctx.sourceTemplateId
      }
    };
  }

  function buildHit(rule, evaluation) {
    return {
      id: uid('hit'),
      ruleId: rule.id,
      ruleVersion: rule.version || 1,
      lineageId: rule.lineageId || rule.id,
      ruleName: rule.name || rule.id,
      stableOrder: rule.stableOrder == null ? 0 : Number(rule.stableOrder),
      riskLevel: rule.riskLevel || DEFAULT_RISK_PLACEHOLDER,
      priority: rule.priority || 0,
      conflictGroup: rule.conflictGroup || null,
      target: { level: rule.target && rule.target.level, taxonKey: rule.target && rule.target.taxonKey },
      sourceResultIds: evaluation.sourceResultIds.slice(),
      conditionResults: evaluation.conditionResults,
      output: {
        analysis: (rule.output && rule.output.analysis) || '',
        advice: (rule.output && rule.output.advice) || ''
      },
      combineStatus: 'pending',
      combineReason: '',
      excluded: false,
      excludedReason: null
    };
  }

  function compareByComposeOrder(a, b) {
    var sd = (Number(a.stableOrder) || 0) - (Number(b.stableOrder) || 0);
    if (sd !== 0) return sd;
    var ld = String(a.lineageId || '').localeCompare(String(b.lineageId || ''));
    if (ld !== 0) return ld;
    var vd = (Number(a.ruleVersion) || 0) - (Number(b.ruleVersion) || 0);
    if (vd !== 0) return vd;
    return String(a.ruleId || '').localeCompare(String(b.ruleId || ''));
  }

  function compareByDecisionOrder(a, b) {
    return compareByComposeOrder(a, b);
  }

  /**
   * 同一菌门单元内不再按风险或冲突组淘汰命中。排除命中仍标记为 excluded。
   */
  function resolveConflicts(hits) {
    (hits || []).forEach(function (h) {
      if (h.excluded) {
        h.combineStatus = 'excluded';
        h.combineReason = h.excludedReason || '已由审核人员排除';
        return;
      }
      h.combineStatus = 'primary';
      h.combineReason = '规则命中，全部采用，不按风险淘汰';
    });
    return hits;
  }

  function dedupeText(parts) {
    var seen = {};
    return parts.filter(function (p) {
      var k = String(p == null ? '' : p).trim();
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    }).map(function (p) { return String(p).trim(); });
  }

  /** 由采用命中按谱系稳定顺序合成分析 / 建议；建议空则不进入草稿。 */
  function composeDrafts(hits) {
    var primary = (hits || []).filter(function (h) {
      return !h.excluded && h.combineStatus === 'primary';
    }).slice().sort(compareByComposeOrder);
    var analysis = dedupeText(primary.map(function (h) { return h.output && h.output.analysis; }));
    var advice = dedupeText(primary.map(function (h) { return h.output && h.output.advice; }));
    return { analysis: analysis.join('\n'), advice: advice.join('\n') };
  }

  /** 当前启用基线 + 至多一个编辑会话候选，返回确定性的候选规则集。 */
  function buildCandidateRuleSet(activeRules, sessionCandidate) {
    var byLineage = {};
    (activeRules || []).forEach(function (rule) {
      if (!rule || rule.status !== 'active') return;
      var lineageId = rule.lineageId || rule.id;
      if (byLineage[lineageId]) throw new Error('同一规则谱系存在多个启用版本：' + lineageId);
      byLineage[lineageId] = rule;
    });
    var replacement = null;
    if (sessionCandidate) {
      var candidate = JSON.parse(JSON.stringify(sessionCandidate));
      var candidateLineage = candidate.lineageId || candidate.id || '__new__';
      if (candidateLineage === '__new__') {
        var fingerprint = [candidate.name || '', candidate.target && candidate.target.level || '', candidate.target && candidate.target.taxonKey || '', candidate.stableOrder || ''].join('|');
        var hash = 0;
        for (var i = 0; i < fingerprint.length; i += 1) hash = ((hash << 5) - hash + fingerprint.charCodeAt(i)) | 0;
        candidateLineage = 'session-new-' + Math.abs(hash).toString(36);
      }
      var previous = byLineage[candidateLineage] || null;
      candidate.lineageId = candidateLineage;
      candidate.status = 'session';
      byLineage[candidateLineage] = candidate;
      replacement = {
        lineageId: candidateLineage,
        fromRuleId: previous ? previous.id : null,
        fromVersion: previous ? previous.version : null,
        toRuleId: candidate.id || null,
        toVersion: candidate.version || (previous ? (previous.version || 0) + 1 : 1),
        isNewLineage: !previous
      };
    }
    var rules = Object.keys(byLineage).map(function (key) { return byLineage[key]; });
    rules.sort(function (a, b) {
      var sd = (Number(a.stableOrder) || 0) - (Number(b.stableOrder) || 0);
      if (sd !== 0) return sd;
      return String(a.lineageId || a.id || '').localeCompare(String(b.lineageId || b.id || ''));
    });
    return { rules: rules, replacement: replacement };
  }

  /** 单元风险占位：不再参与裁决；无命中则为 null。 */
  function unitRiskLevel(hits) {
    var adopted = (hits || []).some(function (h) {
      return !h.excluded && h.combineStatus === 'primary';
    });
    return adopted ? DEFAULT_RISK_PLACEHOLDER : null;
  }

  /** 命中签名：用于判断重跑后单元依据是否变化（忽略 hit id）。 */
  function hitSignature(hits) {
    return (hits || []).map(function (h) {
      return [h.ruleId, h.ruleVersion, (h.sourceResultIds || []).slice().sort().join(','), h.excluded ? 'x' : ''].join(':');
    }).sort().join('|');
  }

  /**
   * 主入口。
   * @param {{ rules: object[], results: object[], species: string|null, taxa: object[] }} input
   * @returns {{ units: [{ phylumKey, hits, riskLevel, drafts }], orphanHits, evaluatedRules, engineVersion }}
   */
  function evaluate(input) {
    input = input || {};
    var ctx = buildContext(input);
    var unitsByPhylum = {};
    var unitOrder = [];
    var orphanHits = [];
    var evaluatedRules = [];

    (input.rules || []).forEach(function (rule) {
      var ev = evaluateRule(rule, ctx);
      var failedConditions = ev.conditionResults.filter(function (r) { return !r.matched; });
      evaluatedRules.push({
        ruleId: rule.id,
        lineageId: rule.lineageId || rule.id,
        ruleName: rule.name,
        ruleVersion: rule.version,
        riskLevel: rule.riskLevel,
        priority: rule.priority || 0,
        conflictGroup: rule.conflictGroup || null,
        target: rule.target || null,
        matched: ev.matched,
        reason: ev.reason || (ev.matched ? '全部触发条件满足' : failedConditions.map(function (r) { return r.message; }).join('；')),
        scope: ev.scope,
        conditionResults: ev.conditionResults
      });
      if (!ev.matched) return;
      var hit = buildHit(rule, ev);
      if (!ev.phylumKey) {
        hit.combineStatus = 'orphan';
        orphanHits.push(hit);
        return;
      }
      if (!unitsByPhylum[ev.phylumKey]) {
        unitsByPhylum[ev.phylumKey] = [];
        unitOrder.push(ev.phylumKey);
      }
      unitsByPhylum[ev.phylumKey].push(hit);
    });

    var units = unitOrder.map(function (phylumKey) {
      var hits = resolveConflicts(unitsByPhylum[phylumKey]);
      return {
        phylumKey: phylumKey,
        hits: hits,
        riskLevel: unitRiskLevel(hits),
        drafts: composeDrafts(hits),
        hitSignature: hitSignature(hits)
      };
    });

    return {
      engineVersion: ENGINE_VERSION,
      species: ctx.species,
      units: units,
      orphanHits: orphanHits,
      evaluatedRules: evaluatedRules
    };
  }

  /** 供页面显示的条件描述（中文）。 */
  function describeCondition(condition, rule) {
    condition = condition || {};
    var target = (rule && rule.target && rule.target.taxonKey) || '目标';
    switch (condition.type) {
      case 'LAB_NOTICE':
        return target + ' ' + (LAB_NOTICE_LABELS[condition.notice] || condition.notice || '?');
      case 'RANGE_STATUS':
        return target + ' ' + (RANGE_STATUS_LABELS[condition.rangeStatus] || condition.rangeStatus || '?');
      case 'NOT_DETECTED':
        return target + ' 未检出';
      case 'VALUE_THRESHOLD':
        return target + ' 有效值 ' + (VALUE_COMPARATOR_LABELS[condition.comparator] || condition.comparator || '?') +
          ' ' + (condition.threshold != null ? condition.threshold : '?') + '%';
      case 'SPECIES':
        return '物种 ∈ ' + normalizeSpeciesList(condition.species).map(function (s) { return SPECIES_LABELS[s] || s; }).join('/');
      case 'OTHER_TAXON_STATUS':
        return (condition.taxonKey || '?') + ' ' + (condition.statusKind === 'RANGE_STATUS'
          ? (RANGE_STATUS_LABELS[condition.expected] || condition.expected)
          : (LAB_NOTICE_LABELS[condition.expected] || condition.expected));
      default:
        return '未知条件';
    }
  }

  /** 规则结构校验，返回可用于字段定位的错误对象数组。 */
  function validateRuleDetails(rule, taxaByKey) {
    var errors = [];
    function add(field, message) { errors.push({ field: field, message: message }); }
    if (!rule || typeof rule !== 'object') return [{ field: 'rule', message: '规则为空' }];
    if (!rule.name || !String(rule.name).trim()) add('name', '请填写规则名称');
    var target = rule.target || {};
    if (target.level !== 'phylum' && target.level !== 'genus') add('target.level', '目标层级须为门或属');
    if (!target.taxonKey) add('target.taxonKey', '请选择目标分类单元');
    else if (taxaByKey && !taxaByKey[target.taxonKey]) add('target.taxonKey', '目标「' + target.taxonKey + '」不在字典分类树中');
    else if (taxaByKey && taxaByKey[target.taxonKey].level !== target.level) add('target.level', '目标层级与字典不一致');
    if (rule.conditionLogic !== 'ALL' && rule.conditionLogic !== 'ANY') add('conditionLogic', '条件逻辑须为全部满足或任一满足');
    if (!Array.isArray(rule.conditions) || !rule.conditions.length) add('conditions', '至少添加一个状态条件');
    (rule.conditions || []).forEach(function (c, idx) {
      var field = 'conditions.' + idx;
      var label = '条件 ' + (idx + 1);
      if (CONDITION_TYPES.indexOf(c.type) < 0) {
        add(field + '.type', label + '：不支持的条件类型');
        return;
      }
      if (c.type === 'LAB_NOTICE' && LAB_NOTICES.indexOf(c.notice) < 0) add(field + '.notice', label + '：请选择有效的实验室标注');
      if (c.type === 'RANGE_STATUS' && RANGE_STATUSES.indexOf(c.rangeStatus) < 0) add(field + '.rangeStatus', label + '：请选择有效的范围状态');
      if (c.type === 'VALUE_THRESHOLD') {
        if (VALUE_COMPARATORS.indexOf(c.comparator) < 0) add(field + '.comparator', label + '：请选择有效值比较符');
        if (!isFinite(Number(c.threshold))) add(field + '.threshold', label + '：请填写有效值百分比');
      }
      if (c.type === 'SPECIES' && !normalizeSpeciesList(c.species).length) add(field + '.species', label + '：至少选择一个报告物种');
      if (c.type === 'OTHER_TAXON_STATUS') {
        if (!c.taxonKey) add(field + '.taxonKey', label + '：请选择引用的分类单元');
        else if (taxaByKey && !taxaByKey[c.taxonKey]) add(field + '.taxonKey', label + '：引用的分类单元不在字典中');
        if (c.statusKind !== 'LAB_NOTICE' && c.statusKind !== 'RANGE_STATUS') add(field + '.statusKind', label + '：请选择状态类型');
        var pool = c.statusKind === 'RANGE_STATUS' ? RANGE_STATUSES : LAB_NOTICES;
        if (pool.indexOf(c.expected) < 0) add(field + '.expected', label + '：请选择有效的期望值');
      }
    });
    var species = closedSpeciesList(rule.applicableSpecies);
    if (species.length !== 1) add('applicableSpecies', '一条规则只属于一个当前能出报告的物种');
    if (rule.riskLevel && RISK_LEVELS.indexOf(rule.riskLevel) < 0) add('riskLevel', '风险占位字段无效');
    if (!isFinite(Number(rule.priority)) || Number(rule.priority) < 0) add('priority', '优先级须为不小于 0 的数字');
    if (!rule.output || typeof rule.output !== 'object') add('output', '缺少规则输出');
    else {
      if (!String(rule.output.analysis || '').trim()) add('output.analysis', '请填写分析输出');
    }
    return errors;
  }

  function validateRule(rule, taxaByKey) {
    return validateRuleDetails(rule, taxaByKey).map(function (item) { return item.message; });
  }

  function validateConflictTies(rules) {
    return [];
  }

  function findObservationKind(id) {
    for (var i = 0; i < OBSERVATION_KINDS.length; i += 1) {
      if (OBSERVATION_KINDS[i].id === id) return OBSERVATION_KINDS[i];
    }
    return null;
  }

  function observationKindFromCondition(condition) {
    condition = condition || {};
    if (condition.type === 'NOT_DETECTED') return findObservationKind('not_detected');
    if (condition.type === 'LAB_NOTICE') {
      if (condition.notice === 'high') return findObservationKind('lab_high');
      if (condition.notice === 'low') return findObservationKind('lab_low');
      if (condition.notice === 'unmarked') return findObservationKind('lab_unmarked');
    }
    if (condition.type === 'RANGE_STATUS') {
      if (condition.rangeStatus === 'low') return findObservationKind('range_low');
      if (condition.rangeStatus === 'normal') return findObservationKind('range_normal');
      if (condition.rangeStatus === 'high') return findObservationKind('range_high');
      if (condition.rangeStatus === 'no_range') return findObservationKind('range_none');
    }
    return null;
  }

  function speciesScopeLabel(species) {
    var list = closedSpeciesList(species);
    if (list.length === 1) return SPECIES_LABELS[list[0]] || list[0];
    var raw = normalizeSpeciesList(species);
    if (!raw.length) return '未指定物种';
    if (raw.indexOf('all') >= 0) return '未指定封闭物种';
    return raw.map(function (s) { return SPECIES_LABELS[s] || s; }).join('和');
  }

  function valueThresholdFromConditions(conditions) {
    var found = null;
    (conditions || []).forEach(function (condition) {
      if (condition && condition.type === 'VALUE_THRESHOLD' && !found) found = condition;
    });
    if (!found) return null;
    var threshold = Number(found.threshold);
    if (VALUE_COMPARATORS.indexOf(found.comparator) < 0 || !isFinite(threshold)) return null;
    return { enabled: true, comparator: found.comparator, threshold: threshold };
  }

  function analyzeRuleShape(rule) {
    var conditions = (rule && rule.conditions) || [];
    var reasons = [];
    var observationCount = 0;
    var thresholdCount = 0;
    conditions.forEach(function (condition) {
      if (condition.type === 'SPECIES' && reasons.indexOf('含报告物种条件') < 0) reasons.push('含报告物种条件');
      if (condition.type === 'OTHER_TAXON_STATUS' && reasons.indexOf('含其他分类单元状态') < 0) reasons.push('含其他分类单元状态');
      if (condition.type === 'VALUE_THRESHOLD') thresholdCount += 1;
      else if (observationKindFromCondition(condition)) observationCount += 1;
      else if (condition.type !== 'SPECIES' && condition.type !== 'OTHER_TAXON_STATUS' && reasons.indexOf('无法识别的观察') < 0) {
        reasons.push('无法识别的观察');
      }
    });
    if (thresholdCount > 1) reasons.push('含多条有效值门槛');
    if (observationCount > 1) reasons.push('含多条观察');
    if (observationCount === 0) reasons.push('缺少状态观察');
    if ((rule && rule.conditionLogic) === 'ANY' && conditions.length > 1) {
      reasons.push('按任一满足组合');
    }
    var obsCond = conditions.filter(function (c) { return observationKindFromCondition(c); })[0];
    var kind = observationCount === 1 ? observationKindFromCondition(obsCond) : null;
    var extraTypes = conditions.some(function (condition) {
      return condition.type === 'SPECIES' || condition.type === 'OTHER_TAXON_STATUS';
    });
    var logicOk = (rule && rule.conditionLogic) !== 'ANY';
    var sentenceReady = !extraTypes && observationCount === 1 && thresholdCount <= 1 && logicOk && !!kind;
    return {
      advanced: !sentenceReady,
      reasons: sentenceReady ? [] : reasons,
      observationKind: sentenceReady ? kind : null,
      valueThreshold: sentenceReady ? valueThresholdFromConditions(conditions) : null
    };
  }

  function defaultJudgment() {
    return {
      mode: 'sentence',
      applicableSpecies: ['cat'],
      observationKind: DEFAULT_OBSERVATION_KIND,
      target: { level: 'phylum', taxonKey: '' },
      valueThreshold: null
    };
  }

  function compileJudgment(judgment, options) {
    options = options || {};
    var kind = findObservationKind(judgment && judgment.observationKind) || findObservationKind(DEFAULT_OBSERVATION_KIND);
    var condition = { id: options.conditionId || 'obs-1', type: kind.type };
    if (kind.type === 'LAB_NOTICE') condition.notice = kind.notice;
    if (kind.type === 'RANGE_STATUS') condition.rangeStatus = kind.rangeStatus;
    var species = closedSpeciesList((judgment && judgment.applicableSpecies) || []);
    if (species.length !== 1) species = ['cat'];
    var conditions = [condition];
    var threshold = judgment && judgment.valueThreshold;
    if (threshold && threshold.enabled !== false && VALUE_COMPARATORS.indexOf(threshold.comparator) >= 0 &&
      isFinite(Number(threshold.threshold))) {
      conditions.push({
        id: options.thresholdConditionId || 'obs-threshold',
        type: 'VALUE_THRESHOLD',
        comparator: threshold.comparator,
        threshold: Number(threshold.threshold)
      });
    }
    return {
      conditionLogic: 'ALL',
      conditions: conditions,
      applicableSpecies: species
    };
  }

  function decompileJudgment(rule) {
    var shape = analyzeRuleShape(rule);
    var species = closedSpeciesList((rule && rule.applicableSpecies) || []);
    if (shape.advanced || !shape.observationKind) {
      return {
        mode: 'advanced',
        reasons: shape.reasons.length ? shape.reasons : ['无法还原为单观察判断句'],
        applicableSpecies: species.length ? species : normalizeSpeciesList((rule && rule.applicableSpecies) || []),
        observationKind: null,
        valueThreshold: null,
        target: (rule && rule.target) || null
      };
    }
    return {
      mode: 'sentence',
      reasons: [],
      applicableSpecies: species,
      observationKind: shape.observationKind.id,
      valueThreshold: shape.valueThreshold,
      target: (rule && rule.target) || null
    };
  }

  function suggestRuleName(input, taxonLabel) {
    var judgment = input && input.observationKind ? input : decompileJudgment(input || {});
    var species = judgment.applicableSpecies || (input && input.applicableSpecies) || [];
    var kind = findObservationKind(judgment.observationKind);
    return speciesScopeLabel(species) + ' · ' + (taxonLabel || '目标菌') + ' · ' + (kind ? kind.shortLabel : '观察');
  }

  function describeValueThreshold(threshold) {
    if (!threshold || threshold.enabled === false) return '';
    if (VALUE_COMPARATORS.indexOf(threshold.comparator) < 0 || !isFinite(Number(threshold.threshold))) return '';
    return '，且有效值' + VALUE_COMPARATOR_LABELS[threshold.comparator] + Number(threshold.threshold) + '%';
  }

  function describeJudgmentSemantics(input) {
    var judgment = input && input.mode === 'sentence' && input.observationKind
      ? input
      : (input && input.observationKind && !input.conditions ? input : decompileJudgment(input || {}));
    if (judgment.mode === 'advanced' || !judgment.observationKind) {
      return '这条含历史高级条件，不能用单观察判断句完整回译。编辑时进入兼容视图，系统不会丢掉已有条件。';
    }
    var base = OBSERVATION_SEMANTICS[judgment.observationKind] || '请选择看见的状态后，系统会用一句话说明这条何时会说。';
    if (judgment.valueThreshold && judgment.valueThreshold.enabled !== false) {
      return base + ' 同时还要有效值满足该百分比门槛，两边都满足才说。同一个数字对所有已知检测方案和实验室生效。';
    }
    return base;
  }

  function describeJudgmentSentence(rule, taxonLabel) {
    var judgment = decompileJudgment(rule || {});
    if (judgment.mode === 'advanced') {
      return '含高级条件的历史规则，不能写成一句单观察判断';
    }
    var kind = findObservationKind(judgment.observationKind);
    var level = (judgment.target && judgment.target.level === 'genus') ? '菌属' : '菌门';
    return '当' + speciesScopeLabel(judgment.applicableSpecies) + '的报告里，' +
      level + '「' + (taxonLabel || '目标菌') + '」' + (kind ? kind.label : '看见的状态') +
      describeValueThreshold(judgment.valueThreshold);
  }

  function describeResultClinicalState(result) {
    if (!result) {
      return { summary: '这份报告里没有该目标菌的检测结果', labLabel: null, rangeLabel: null, notDetected: false };
    }
    if (result.dataStatus === 'NOT_DETECTED') {
      return { summary: '未检出，没有可比较的检测值', labLabel: null, rangeLabel: null, notDetected: true };
    }
    if (!isEffectiveResult(result)) {
      return { summary: '该目标菌当前不是有效检测结果，不能据此下判断', labLabel: null, rangeLabel: null, notDetected: false };
    }
    var labShort = result.labNotice === 'high' ? '标了偏高' : (result.labNotice === 'low' ? '标了偏低' : '未标注');
    var rangeFriendly = { low: '相对范围偏低', normal: '相对范围正常', high: '相对范围偏高', no_range: '没有有效参考范围' };
    var rangeLabel = rangeFriendly[result.rangeStatus] || '没有有效参考范围';
    return {
      summary: '实验室' + labShort + '；' + rangeLabel,
      labLabel: '实验室' + labShort,
      rangeLabel: rangeLabel,
      notDetected: false
    };
  }

  function explainRuleAgainstContext(rule, ctx, options) {
    options = options || {};
    var taxonLabel = options.taxonLabel || (rule && rule.target && rule.target.taxonKey) || '目标菌';
    var ev = evaluateRule(rule, ctx);
    var res = rule && rule.target && rule.target.taxonKey ? ctx.resultByKey[rule.target.taxonKey] : null;
    var actual = describeResultClinicalState(res);
    var judgment = decompileJudgment(rule);
    var expectedKind = findObservationKind(judgment.observationKind);
    var expectedText = expectedKind ? expectedKind.label : '一组历史高级条件';
    var missing = null;
    var statusFailed = false;
    var valueFailed = false;
    (ev.conditionResults || []).forEach(function (item) {
      if (item.matched) return;
      if (item.type === 'VALUE_THRESHOLD') valueFailed = true;
      else statusFailed = true;
    });
    if (!ev.scope.speciesMatched) {
      missing = '物种不符：这条给' + speciesScopeLabel(rule.applicableSpecies) + '用，这份报告是' + (SPECIES_LABELS[ctx.species] || '未知物种');
    } else if (!ev.scope.templateMatched) {
      missing = '检测方案对不上，这条不会说';
    } else if (!res) {
      missing = '缺了目标菌本身：这份报告里没有「' + taxonLabel + '」的检测结果';
    } else if (!ev.matched && judgment.mode === 'sentence') {
      if (statusFailed && valueFailed) {
        missing = '状态不满足，有效值也不满足：要的是「' + expectedText + describeValueThreshold(judgment.valueThreshold) + '」，实际是「' + actual.summary + '」';
      } else if (valueFailed) {
        missing = '有效值不满足：' + ((ev.conditionResults || []).filter(function (item) {
          return item.type === 'VALUE_THRESHOLD' && !item.matched;
        }).map(function (item) { return item.message; })[0] || '有效值没有跨过这条的百分比门槛');
      } else if (statusFailed) {
        missing = '状态不满足：要的是「' + expectedText + '」，实际是「' + actual.summary + '」';
      } else {
        missing = ev.reason || '未命中';
      }
    } else if (!ev.matched) {
      var failed = (ev.conditionResults || []).filter(function (item) { return !item.matched; });
      missing = failed.length
        ? ('缺了这些观察：' + failed.map(function (item) { return item.message; }).join('；'))
        : (ev.reason || '未命中');
    }
    var verdict = ev.matched ? '说。' : '不说。';
    return {
      says: !!ev.matched,
      verdictText: verdict,
      actualSummary: actual.summary,
      expectedSummary: expectedText,
      missingObservation: missing,
      doctorText: '目标菌「' + taxonLabel + '」在这份报告里实际是：' + actual.summary + '。这条认的是：' + expectedText +
        describeValueThreshold(judgment.valueThreshold) + '。' +
        verdict + (ev.matched ? '' : (missing || '')),
      evaluation: ev
    };
  }

  return {
    ENGINE_VERSION: ENGINE_VERSION,
    RISK_ORDER: RISK_ORDER,
    RISK_LEVELS: RISK_LEVELS,
    DEFAULT_RISK_PLACEHOLDER: DEFAULT_RISK_PLACEHOLDER,
    CONDITION_TYPES: CONDITION_TYPES,
    LAB_NOTICES: LAB_NOTICES,
    RANGE_STATUSES: RANGE_STATUSES,
    VALUE_COMPARATORS: VALUE_COMPARATORS,
    VALUE_COMPARATOR_LABELS: VALUE_COMPARATOR_LABELS,
    REPORTABLE_SPECIES: REPORTABLE_SPECIES,
    LAB_NOTICE_LABELS: LAB_NOTICE_LABELS,
    RANGE_STATUS_LABELS: RANGE_STATUS_LABELS,
    SPECIES_LABELS: SPECIES_LABELS,
    DEFAULT_OBSERVATION_KIND: DEFAULT_OBSERVATION_KIND,
    OBSERVATION_KINDS: OBSERVATION_KINDS,
    isEffectiveResult: isEffectiveResult,
    normalizeSpeciesList: normalizeSpeciesList,
    closedSpeciesList: closedSpeciesList,
    speciesMatches: speciesMatches,
    speciesScopeLabel: speciesScopeLabel,
    otherReportableSpecies: function (species) {
      var current = closedSpeciesList(species)[0];
      return REPORTABLE_SPECIES.filter(function (s) { return s !== current; });
    },
    buildContext: buildContext,
    evaluateCondition: evaluateCondition,
    evaluateRule: evaluateRule,
    compareByDecisionOrder: compareByDecisionOrder,
    compareByComposeOrder: compareByComposeOrder,
    resolveConflicts: resolveConflicts,
    composeDrafts: composeDrafts,
    buildCandidateRuleSet: buildCandidateRuleSet,
    unitRiskLevel: unitRiskLevel,
    hitSignature: hitSignature,
    evaluate: evaluate,
    describeCondition: describeCondition,
    validateRuleDetails: validateRuleDetails,
    validateRule: validateRule,
    validateConflictTies: validateConflictTies,
    findObservationKind: findObservationKind,
    observationKindFromCondition: observationKindFromCondition,
    analyzeRuleShape: analyzeRuleShape,
    defaultJudgment: defaultJudgment,
    compileJudgment: compileJudgment,
    decompileJudgment: decompileJudgment,
    suggestRuleName: suggestRuleName,
    describeJudgmentSemantics: describeJudgmentSemantics,
    describeJudgmentSentence: describeJudgmentSentence,
    describeResultClinicalState: describeResultClinicalState,
    explainRuleAgainstContext: explainRuleAgainstContext
  };
});
