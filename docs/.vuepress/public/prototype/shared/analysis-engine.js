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

  var ENGINE_VERSION = '2.0.0';

  var RISK_ORDER = { high: 3, medium: 2, low: 1, notice: 0 };
  var RISK_LEVELS = ['low', 'medium', 'high', 'notice'];
  var CONDITION_TYPES = ['LAB_NOTICE', 'RANGE_STATUS', 'NOT_DETECTED', 'SPECIES', 'OTHER_TAXON_STATUS'];
  var LAB_NOTICES = ['high', 'low', 'unmarked'];
  var RANGE_STATUSES = ['low', 'normal', 'high', 'no_range'];

  var LAB_NOTICE_LABELS = { high: '实验室标注偏高', low: '实验室标注偏低', unmarked: '未标注' };
  var RANGE_STATUS_LABELS = { low: '低于参考范围', normal: '参考范围内', high: '高于参考范围', no_range: '无有效参考范围' };
  var SPECIES_LABELS = { cat: '猫', dog: '狗' };

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
    var allowed = normalizeSpeciesList(conditionSpecies);
    if (!allowed.length || allowed.indexOf('all') >= 0) return true;
    var species = String(reportSpecies || '').toLowerCase();
    return allowed.indexOf(species) >= 0;
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
    if (!conditions.length) reason = '规则没有条件';
    else if (!targetResult) reason = '目标「' + (target.taxonKey || '?') + '」无检测结果';
    return {
      matched: matched && !!targetResult,
      conditionResults: results,
      sourceResultIds: sourceIds,
      phylumKey: phylumKeyForTarget(target, ctx),
      reason: reason
    };
  }

  function buildHit(rule, evaluation) {
    return {
      id: uid('hit'),
      ruleId: rule.id,
      ruleVersion: rule.version || 1,
      lineageId: rule.lineageId || rule.id,
      ruleName: rule.name || rule.id,
      riskLevel: rule.riskLevel || 'medium',
      priority: rule.priority || 0,
      conflictGroup: rule.conflictGroup || null,
      target: { level: rule.target && rule.target.level, taxonKey: rule.target && rule.target.taxonKey },
      sourceResultIds: evaluation.sourceResultIds.slice(),
      conditionResults: evaluation.conditionResults,
      output: {
        analysis: (rule.output && rule.output.analysis) || '',
        advice: rule.riskLevel === 'notice' ? '' : ((rule.output && rule.output.advice) || '')
      },
      combineStatus: 'pending',
      excluded: false,
      excludedReason: null
    };
  }

  /**
   * 同一菌门单元内的冲突处理：同 conflictGroup 按 风险 → priority 留一条 primary，
   * 其余 superseded_by_conflict。被人工排除的命中不参与。会原地修改 hits[].combineStatus。
   */
  function resolveConflicts(hits) {
    var groups = {};
    var order = [];
    (hits || []).forEach(function (h) {
      if (h.excluded) {
        h.combineStatus = 'excluded';
        return;
      }
      var g = h.conflictGroup || ('solo-' + h.id);
      if (!groups[g]) {
        groups[g] = [];
        order.push(g);
      }
      groups[g].push(h);
    });
    order.forEach(function (g) {
      var sorted = groups[g].slice().sort(function (a, b) {
        var rd = (RISK_ORDER[b.riskLevel] || 0) - (RISK_ORDER[a.riskLevel] || 0);
        if (rd !== 0) return rd;
        var pd = (b.priority || 0) - (a.priority || 0);
        if (pd !== 0) return pd;
        return String(a.ruleName || '').localeCompare(String(b.ruleName || ''));
      });
      sorted[0].combineStatus = 'primary';
      sorted.slice(1).forEach(function (h) { h.combineStatus = 'superseded_by_conflict'; });
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

  /** 由 primary 且未排除的命中合成分析 / 建议草稿；notice 级不出建议。 */
  function composeDrafts(hits) {
    var primary = (hits || []).filter(function (h) { return !h.excluded && h.combineStatus === 'primary'; });
    var analysis = dedupeText(primary.map(function (h) { return h.output && h.output.analysis; }));
    var advice = dedupeText(primary.filter(function (h) { return h.riskLevel !== 'notice'; })
      .map(function (h) { return h.output && h.output.advice; }));
    return { analysis: analysis.join('\n'), advice: advice.join('\n') };
  }

  /** 单元风险：primary 且未排除命中的最高风险；无则 null。 */
  function unitRiskLevel(hits) {
    var best = null;
    (hits || []).forEach(function (h) {
      if (h.excluded || h.combineStatus !== 'primary') return;
      if (best == null || (RISK_ORDER[h.riskLevel] || 0) > (RISK_ORDER[best] || 0)) best = h.riskLevel;
    });
    return best;
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
      evaluatedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleVersion: rule.version,
        matched: ev.matched,
        reason: ev.reason,
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

  /** 规则结构校验，返回错误信息数组（空数组 = 合法）。 */
  function validateRule(rule, taxaByKey) {
    var errors = [];
    if (!rule || typeof rule !== 'object') return ['规则为空'];
    if (!rule.name || !String(rule.name).trim()) errors.push('请填写规则名称');
    var target = rule.target || {};
    if (target.level !== 'phylum' && target.level !== 'genus') errors.push('目标层级须为 门 或 属');
    if (!target.taxonKey) errors.push('请选择目标分类单元');
    else if (taxaByKey && !taxaByKey[target.taxonKey]) errors.push('目标「' + target.taxonKey + '」不在字典分类树中');
    else if (taxaByKey && taxaByKey[target.taxonKey].level !== target.level) errors.push('目标层级与字典不一致');
    if (rule.conditionLogic !== 'ALL' && rule.conditionLogic !== 'ANY') errors.push('条件逻辑须为 ALL 或 ANY');
    if (!Array.isArray(rule.conditions) || !rule.conditions.length) errors.push('至少一个条件');
    (rule.conditions || []).forEach(function (c, idx) {
      var label = '条件 ' + (idx + 1);
      if (CONDITION_TYPES.indexOf(c.type) < 0) {
        errors.push(label + '：不支持的类型 ' + c.type);
        return;
      }
      if (c.type === 'LAB_NOTICE' && LAB_NOTICES.indexOf(c.notice) < 0) errors.push(label + '：实验室标注须为 high / low / unmarked');
      if (c.type === 'RANGE_STATUS' && RANGE_STATUSES.indexOf(c.rangeStatus) < 0) errors.push(label + '：范围状态须为 low / normal / high / no_range');
      if (c.type === 'SPECIES' && !normalizeSpeciesList(c.species).length) errors.push(label + '：请选择物种');
      if (c.type === 'OTHER_TAXON_STATUS') {
        if (!c.taxonKey) errors.push(label + '：请选择引用的分类单元');
        else if (taxaByKey && !taxaByKey[c.taxonKey]) errors.push(label + '：「' + c.taxonKey + '」不在字典分类树中');
        if (c.statusKind !== 'LAB_NOTICE' && c.statusKind !== 'RANGE_STATUS') errors.push(label + '：状态类型须为 LAB_NOTICE 或 RANGE_STATUS');
        var pool = c.statusKind === 'RANGE_STATUS' ? RANGE_STATUSES : LAB_NOTICES;
        if (pool.indexOf(c.expected) < 0) errors.push(label + '：期望值无效');
      }
    });
    if (RISK_LEVELS.indexOf(rule.riskLevel) < 0) errors.push('风险等级须为 low / medium / high / notice');
    if (!rule.output || typeof rule.output !== 'object') errors.push('缺少输出');
    else {
      if (!String(rule.output.analysis || '').trim()) errors.push('请填写「分析」输出');
      if (rule.riskLevel !== 'notice' && !String(rule.output.advice || '').trim()) errors.push('非 notice 规则须填写「建议」输出');
    }
    return errors;
  }

  return {
    ENGINE_VERSION: ENGINE_VERSION,
    RISK_ORDER: RISK_ORDER,
    RISK_LEVELS: RISK_LEVELS,
    CONDITION_TYPES: CONDITION_TYPES,
    LAB_NOTICES: LAB_NOTICES,
    RANGE_STATUSES: RANGE_STATUSES,
    LAB_NOTICE_LABELS: LAB_NOTICE_LABELS,
    RANGE_STATUS_LABELS: RANGE_STATUS_LABELS,
    isEffectiveResult: isEffectiveResult,
    normalizeSpeciesList: normalizeSpeciesList,
    speciesMatches: speciesMatches,
    buildContext: buildContext,
    evaluateCondition: evaluateCondition,
    evaluateRule: evaluateRule,
    resolveConflicts: resolveConflicts,
    composeDrafts: composeDrafts,
    unitRiskLevel: unitRiskLevel,
    hitSignature: hitSignature,
    evaluate: evaluate,
    describeCondition: describeCondition,
    validateRule: validateRule
  };
});
