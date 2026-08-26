/**
 * 正常范围匹配工具 — 读取共享 Store 平台参考范围，解析有效参考范围
 */
(function (global) {
  'use strict';

  function getService() {
    return global.dictionaryDataService;
  }

  function RangeMatcher() {
    this.reloadConfigs();
  }

  RangeMatcher.prototype.loadRangeConfigs = function () {
    var svc = getService();
    if (!svc) return [];
    return svc.getPlatformReferenceRanges().map(function (r) {
      return {
        id: r.id,
        species: r.species,
        majorBreed: svc.speciesLabel(r.species),
        minorBreed: null,
        targetType: r.targetType,
        indicatorType: r.taxonomyLevel === 'genus' ? '属' : (r.taxonomyLevel === 'phylum' ? '门' : ''),
        indicatorName: r.targetKey,
        targetKey: r.targetKey,
        minValue: r.minValue,
        maxValue: r.maxValue,
        unit: r.unit,
        status: r.status
      };
    });
  };

  RangeMatcher.prototype.reloadConfigs = function () {
    this.rangeConfigs = this.loadRangeConfigs();
  };

  RangeMatcher.prototype.resolveEffectiveRange = function (indicator, species, options) {
    var svc = getService();
    if (!svc) return null;
    return svc.resolveEffectiveRangeForIndicator(indicator, species, options);
  };

  RangeMatcher.prototype.getNormalRange = function (petInfo, indicatorType, indicatorName, speciesOverride) {
    var species = speciesOverride || getService().speciesFromMajorBreed(petInfo.majorBreed) || petInfo.species || 'cat';
    var indicator = {
      key: indicatorName,
      unit: '%',
      importedRange: petInfo.importedRanges && petInfo.importedRanges[indicatorName],
      manualRange: petInfo.manualRanges && petInfo.manualRanges[indicatorName],
      effectiveRange: petInfo.frozenRanges && petInfo.frozenRanges[indicatorName]
    };
    var resolved = this.resolveEffectiveRange(indicator, species);
    if (!resolved) return null;
    return {
      minValue: resolved.min,
      maxValue: resolved.max,
      unit: resolved.unit,
      source: resolved.source,
      sourceInfo: resolved.source
    };
  };

  RangeMatcher.prototype.evaluateValue = function (value, petInfo, indicatorType, indicatorName, indicatorContext) {
    var svc = getService();
    var species = (indicatorContext && indicatorContext.species) ||
      getService().speciesFromMajorBreed(petInfo.majorBreed) || petInfo.species || 'cat';
    var indicator = Object.assign({
      key: indicatorName,
      value: value,
      unit: '%',
      dataStatus: 'PRESENT'
    }, indicatorContext || {});
    var result = svc.evaluateIndicatorResult(indicator, species);
    if (!result.canJudge) {
      return {
        isNormal: null,
        status: result.status,
        range: result.range || null,
        message: result.message
      };
    }
    return {
      isNormal: result.status === 'normal',
      status: result.status,
      range: result.range ? {
        minValue: result.range.min,
        maxValue: result.range.max,
        unit: result.range.unit,
        source: result.range.source
      } : null,
      message: result.message,
      value: value
    };
  };

  RangeMatcher.prototype.evaluateIndicator = function (indicator, species) {
    var svc = getService();
    return svc.evaluateIndicatorResult(indicator, species);
  };

  RangeMatcher.prototype.getBatchNormalRanges = function (petInfo, indicators, species) {
    var results = {};
    var self = this;
    indicators.forEach(function (indicator) {
      results[indicator.name] = self.getNormalRange(petInfo, indicator.type, indicator.name, species);
    });
    return results;
  };

  RangeMatcher.prototype.batchEvaluate = function (testData, petInfo, indicatorTypes, indicatorContexts) {
    var results = { normal: [], abnormal: [], unknown: [], summary: { total: 0, normalCount: 0, abnormalCount: 0, unknownCount: 0, normalRate: 0 } };
    var self = this;
    Object.keys(testData).forEach(function (indicatorName) {
      var ctx = (indicatorContexts && indicatorContexts[indicatorName]) || { dataStatus: 'PRESENT' };
      var evaluation = self.evaluateValue(testData[indicatorName], petInfo, indicatorTypes[indicatorName] || '门', indicatorName, ctx);
      var item = { indicatorName: indicatorName, indicatorType: indicatorTypes[indicatorName] || '门', value: testData[indicatorName], evaluation: evaluation };
      if (evaluation.status === 'normal') {
        results.normal.push(item);
        results.summary.normalCount += 1;
      } else if (evaluation.status === 'low' || evaluation.status === 'high') {
        results.abnormal.push(item);
        results.summary.abnormalCount += 1;
      } else {
        results.unknown.push(item);
        results.summary.unknownCount += 1;
      }
      results.summary.total += 1;
    });
    var known = results.summary.normalCount + results.summary.abnormalCount;
    results.summary.normalRate = known > 0 ? (results.summary.normalCount / known * 100).toFixed(1) : 0;
    return results;
  };

  RangeMatcher.prototype.getAvailableBreeds = function () {
    var svc = getService();
    return svc ? svc.getFlatBreedConfig() : {};
  };

  RangeMatcher.prototype.getAvailableIndicators = function (species) {
    var svc = getService();
    var ranges = svc.getPlatformReferenceRanges().filter(function (r) { return !species || r.species === species; });
    var indicators = { '门': [], '属': [], '普通指标': [] };
    ranges.forEach(function (r) {
      if (r.targetType === 'indicator') indicators['普通指标'].push(r.targetKey);
      else if (r.taxonomyLevel === 'genus') indicators['属'].push(r.targetKey);
      else indicators['门'].push(r.targetKey);
    });
    return indicators;
  };

  var rangeMatcher = new RangeMatcher();

  if (typeof document !== 'undefined') {
    document.addEventListener('professionalCatalogUpdated', function () {
      rangeMatcher.reloadConfigs();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RangeMatcher: RangeMatcher, rangeMatcher: rangeMatcher };
  }
  global.RangeMatcher = RangeMatcher;
  global.rangeMatcher = rangeMatcher;
})(typeof window !== 'undefined' ? window : global);
