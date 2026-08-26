/**
 * 专业基础资料 — 统一共享 Store 桥接
 * 品种字典、普通检测指标、菌群分类树、平台参考范围、标准单位换算
 */
(function (global) {
  'use strict';

  var CATALOG_KEY = 'professionalCatalog';
  var DEMO_COMPLETION_FLAG = 'demoCompletionSeeded';

  function storeApi() {
    return global.PetReportMockStore;
  }

  function adminCommon() {
    return global.PetAdminCommon;
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function defaultBreeds() {
    return [
      { id: 1, key: 'pet', label: '宠物类别', value: '宠物类别根节点', parentKey: null },
      { id: 2, key: 'cat', label: '猫科', value: '猫科动物', parentKey: 'pet' },
      { id: 3, key: 'dog', label: '犬科', value: '犬科动物', parentKey: 'pet' },
      { id: 4, key: 'british-short', label: '英短', value: '英国短毛猫', parentKey: 'cat' },
      { id: 5, key: 'orange-cat', label: '橘猫', value: '橘猫', parentKey: 'cat' },
      { id: 6, key: 'persian', label: '波斯猫', value: '波斯猫', parentKey: 'cat' },
      { id: 7, key: 'siamese', label: '暹罗猫', value: '暹罗猫', parentKey: 'cat' },
      { id: 8, key: 'ragdoll', label: '布偶猫', value: '布偶猫', parentKey: 'cat' },
      { id: 9, key: 'maine-coon', label: '缅因猫', value: '缅因猫', parentKey: 'cat' },
      { id: 10, key: 'common-cat', label: '通用猫科', value: '适用于大部分猫科动物', parentKey: 'cat' },
      { id: 11, key: 'golden-retriever', label: '金毛寻回犬', value: '金毛寻回犬', parentKey: 'dog' },
      { id: 12, key: 'labrador', label: '拉布拉多犬', value: '拉布拉多犬', parentKey: 'dog' },
      { id: 13, key: 'husky', label: '哈士奇', value: '哈士奇', parentKey: 'dog' },
      { id: 14, key: 'samoyed', label: '萨摩耶', value: '萨摩耶', parentKey: 'dog' },
      { id: 15, key: 'border-collie', label: '边境牧羊犬', value: '边境牧羊犬', parentKey: 'dog' },
      { id: 16, key: 'german-shepherd', label: '德国牧羊犬', value: '德国牧羊犬', parentKey: 'dog' },
      { id: 17, key: 'teddy', label: '泰迪', value: '泰迪', parentKey: 'dog' },
      { id: 18, key: 'bichon', label: '比熊', value: '比熊', parentKey: 'dog' },
      { id: 19, key: 'pomeranian', label: '博美', value: '博美', parentKey: 'dog' },
      { id: 20, key: 'corgi', label: '柯基', value: '柯基', parentKey: 'dog' },
      { id: 21, key: 'french-bulldog', label: '法斗', value: '法国斗牛犬', parentKey: 'dog' },
      { id: 22, key: 'chinese-rural-dog', label: '中华田园犬', value: '中华田园犬', parentKey: 'dog' },
      { id: 23, key: 'common-dog', label: '通用犬科', value: '适用于大部分犬科动物', parentKey: 'dog' }
    ];
  }

  function defaultTestIndicators() {
    return [
      { id: 'ti-alpha', key: 'alpha-diversity', label: 'Alpha多样性', value: '菌群 Alpha 多样性指数', standardUnit: 'index', parentKey: null },
      { id: 'ti-evenness', key: 'evenness', label: '均匀度', value: '菌群均匀度指标', standardUnit: 'index', parentKey: null },
      { id: 'ti-richness', key: 'richness', label: '丰富度', value: '菌群丰富度指标', standardUnit: 'count', parentKey: null },
      { id: 'ti-shannon', key: 'Shannon指数', label: 'Shannon指数', value: 'Shannon 多样性指数', standardUnit: 'index', parentKey: null },
      { id: 'ti-harmful', key: '有害菌比例', label: '有害菌比例', value: '有害菌占比', standardUnit: '%', parentKey: null }
    ];
  }

  function defaultMicrobiotaTaxa() {
    return [
      { id: 'tax-actino', key: '放线菌门', label: '放线菌门', value: '主要包含有益菌群，对肠道健康至关重要', level: 'phylum', parentKey: null },
      { id: 'tax-bactero', key: '拟杆菌门', label: '拟杆菌门', value: '肠道内重要菌群，参与营养物质消化吸收', level: 'phylum', parentKey: null },
      { id: 'tax-firmi', key: '厚壁菌门', label: '厚壁菌门', value: '包含多种重要菌属，需保持适当比例', level: 'phylum', parentKey: null },
      { id: 'tax-proteo', key: '变形菌门', label: '变形菌门', value: '包含潜在有害菌，应控制在较低水平', level: 'phylum', parentKey: null },
      { id: 'tax-bifi', key: '双歧杆菌', label: '双歧杆菌', value: '肠道健康的关键指标，参与免疫调节', level: 'genus', parentKey: '放线菌门' },
      { id: 'tax-lacto', key: '乳酸菌', label: '乳酸菌', value: '产生乳酸，维持肠道酸性环境', level: 'genus', parentKey: '厚壁菌门' },
      { id: 'tax-ecoli', key: '大肠杆菌', label: '大肠杆菌', value: '条件致病菌，正常情况下含量很少', level: 'genus', parentKey: '变形菌门' },
      { id: 'tax-pept', key: 'Peptacetobacter', label: 'Peptacetobacter属', value: '善于发酵碳水，产生短链脂肪酸', level: 'genus', parentKey: '厚壁菌门' },
      { id: 'tax-lach', key: 'Lachnoclostridium', label: 'Lachnoclostridium属', value: '厚壁菌门常见属', level: 'genus', parentKey: '厚壁菌门' }
    ];
  }

  function defaultPlatformRanges() {
    return [
      { id: 'pr-001', species: 'cat', targetType: 'microbiota', targetKey: '放线菌门', taxonomyLevel: 'phylum', minValue: 25, maxValue: 45, unit: '%', status: 'active', notes: '猫科放线菌门平台范围', createdAt: '2025-01-15T10:30:00.000Z' },
      { id: 'pr-002', species: 'cat', targetType: 'microbiota', targetKey: '双歧杆菌', taxonomyLevel: 'genus', minValue: 12, maxValue: 28, unit: '%', status: 'active', notes: '猫科双歧杆菌平台范围', createdAt: '2025-01-15T10:35:00.000Z' },
      { id: 'pr-003', species: 'dog', targetType: 'microbiota', targetKey: '放线菌门', taxonomyLevel: 'phylum', minValue: 30, maxValue: 50, unit: '%', status: 'active', notes: '犬科放线菌门平台范围', createdAt: '2025-01-15T11:00:00.000Z' },
      { id: 'pr-004', species: 'cat', targetType: 'microbiota', targetKey: '乳酸菌', taxonomyLevel: 'genus', minValue: 15, maxValue: 30, unit: '%', status: 'active', notes: '猫科通用乳酸菌范围', createdAt: '2025-01-15T11:05:00.000Z' },
      { id: 'pr-005', species: 'dog', targetType: 'microbiota', targetKey: '乳酸菌', taxonomyLevel: 'genus', minValue: 18, maxValue: 35, unit: '%', status: 'active', notes: '犬科通用乳酸菌范围', createdAt: '2025-01-15T11:10:00.000Z' },
      { id: 'pr-006', species: 'cat', targetType: 'indicator', targetKey: 'alpha-diversity', taxonomyLevel: null, minValue: 3, maxValue: 5.5, unit: 'index', status: 'active', notes: '猫 Alpha 多样性', createdAt: '2025-01-15T11:15:00.000Z' }
    ];
  }

  function defaultStandardUnits() {
    return [
      { id: 'su-001', templateId: 'ORG-LAB-GUT-001', fromUnit: '‰', toUnit: '%', factor: 0.1, note: '已知模板明确换算：千分比转百分比' }
    ];
  }

  function defaultCatalog() {
    return {
      breeds: defaultBreeds(),
      testIndicators: defaultTestIndicators(),
      microbiotaTaxa: defaultMicrobiotaTaxa(),
      platformReferenceRanges: defaultPlatformRanges(),
      standardUnits: defaultStandardUnits(),
      meta: { version: 1, initializedAt: new Date().toISOString() }
    };
  }

  function ensureCatalog(state) {
    if (!state[CATALOG_KEY]) {
      state[CATALOG_KEY] = defaultCatalog();
    } else {
      var cat = state[CATALOG_KEY];
      if (!cat.breeds || !cat.breeds.length) cat.breeds = defaultBreeds();
      if (!cat.testIndicators || !cat.testIndicators.length) cat.testIndicators = defaultTestIndicators();
      if (!cat.microbiotaTaxa || !cat.microbiotaTaxa.length) cat.microbiotaTaxa = defaultMicrobiotaTaxa();
      if (!cat.platformReferenceRanges) cat.platformReferenceRanges = defaultPlatformRanges();
      if (!cat.standardUnits) cat.standardUnits = defaultStandardUnits();
    }
    return state[CATALOG_KEY];
  }

  function commitCatalog(mutator) {
    var st = storeApi();
    if (!st || !st.updateProfessionalCatalog) return null;
    return st.updateProfessionalCatalog(function (catalog, state) {
      ensureCatalog(state);
      return mutator(catalog, state);
    });
  }

  function commitState(mutator) {
    var st = storeApi();
    if (!st || !st.updateAnalysisState) return null;
    return st.updateAnalysisState(mutator);
  }

  function getCatalog() {
    var st = storeApi();
    if (!st) return defaultCatalog();
    var state = st.getState();
    if (!state[CATALOG_KEY]) return defaultCatalog();
    return state[CATALOG_KEY];
  }

  function levelToLabel(level) {
    if (level === 'phylum') return '门';
    if (level === 'genus') return '属';
    return level || '';
  }

  function labelToLevel(label) {
    if (label === '门') return 'phylum';
    if (label === '属') return 'genus';
    return label;
  }

  function speciesLabel(species) {
    if (species === 'cat') return '猫';
    if (species === 'dog') return '狗';
    return species;
  }

  function speciesFromMajorBreed(major) {
    if (!major) return null;
    if (major === '猫' || major === '猫科') return 'cat';
    if (major === '狗' || major === '犬科') return 'dog';
    return null;
  }

  function getPetMajorBreeds() {
    return getCatalog().breeds
      .filter(function (item) { return item.parentKey === 'pet'; })
      .map(function (item) { return { key: item.key, label: item.label, value: item.value }; });
  }

  function getPetMinorBreeds(majorBreedKey) {
    return getCatalog().breeds
      .filter(function (item) { return item.parentKey === majorBreedKey; })
      .map(function (item) { return { key: item.key, label: item.label, value: item.value }; });
  }

  function getBreedByKey(breedKey) {
    return getCatalog().breeds.find(function (item) { return item.key === breedKey; }) || null;
  }

  function getBreedByLabel(breedLabel) {
    return getCatalog().breeds.find(function (item) { return item.label === breedLabel; }) || null;
  }

  function getFlatBreedConfig() {
    var config = {};
    getPetMajorBreeds().forEach(function (major) {
      var shortLabel = major.label.replace(/科$/, '');
      config[shortLabel] = getPetMinorBreeds(major.key).map(function (m) { return m.label; });
    });
    return config;
  }

  function buildBreedTree() {
    var tree = {};
    getPetMajorBreeds().forEach(function (major) {
      tree[major.label] = {
        key: major.key,
        label: major.label,
        value: major.value,
        children: getPetMinorBreeds(major.key)
      };
    });
    return tree;
  }

  function getTestIndicators() {
    return clone(getCatalog().testIndicators);
  }

  function getMicrobiotaTaxa() {
    return clone(getCatalog().microbiotaTaxa);
  }

  function getMicrobiotaTree() {
    var taxa = getCatalog().microbiotaTaxa;
    var phyla = taxa.filter(function (t) { return t.level === 'phylum'; });
    var tree = {};
    phyla.forEach(function (phylum) {
      tree[phylum.label] = {
        type: '门',
        key: phylum.key,
        description: phylum.value || '',
        children: taxa
          .filter(function (t) { return t.parentKey === phylum.key && t.level === 'genus'; })
          .map(function (g) {
            return { name: g.label, key: g.key, type: '属', description: g.value || '' };
          })
      };
    });
    return tree;
  }

  function getPlatformReferenceRanges(activeOnly) {
    var ranges = getCatalog().platformReferenceRanges || [];
    if (activeOnly === false) return clone(ranges);
    return clone(ranges.filter(function (r) { return r.status !== 'disabled'; }));
  }

  function savePlatformReferenceRange(config) {
    return commitCatalog(function (catalog) {
      if (config.id) {
        var idx = catalog.platformReferenceRanges.findIndex(function (r) { return r.id === config.id; });
        if (idx >= 0) {
          catalog.platformReferenceRanges[idx] = Object.assign({}, catalog.platformReferenceRanges[idx], config);
          return catalog.platformReferenceRanges[idx];
        }
      }
      var row = Object.assign({
        id: uid('pr'),
        status: 'active',
        createdAt: new Date().toISOString()
      }, config);
      catalog.platformReferenceRanges.push(row);
      return row;
    });
  }

  function deletePlatformReferenceRange(id) {
    commitCatalog(function (catalog) {
      catalog.platformReferenceRanges = catalog.platformReferenceRanges.filter(function (r) { return r.id !== id; });
    });
  }

  function saveCatalogItem(collection, item, idField) {
    idField = idField || 'id';
    return commitCatalog(function (catalog) {
      var list = catalog[collection];
      if (item[idField]) {
        var idx = list.findIndex(function (row) {
          return String(row[idField]) === String(item[idField]);
        });
        if (idx >= 0) {
          list[idx] = Object.assign({}, list[idx], item);
          return list[idx];
        }
      }
      var row = Object.assign({}, item);
      if (!row[idField]) row[idField] = uid(collection.slice(0, 2));
      list.push(row);
      return row;
    });
  }

  function deleteCatalogItem(collection, id) {
    commitCatalog(function (catalog) {
      catalog[collection] = catalog[collection].filter(function (row) {
        return String(row.id) !== String(id);
      });
    });
  }

  function findCatalogEntryByKey(key) {
    var catalog = getCatalog();
    var indicator = catalog.testIndicators.find(function (i) { return i.key === key || i.label === key; });
    if (indicator) return { type: 'indicator', item: indicator };
    var taxon = catalog.microbiotaTaxa.find(function (t) { return t.key === key || t.label === key; });
    if (taxon) return { type: 'microbiota', item: taxon };
    return null;
  }

  function resolveStandardUnit(templateId, fromUnit, value) {
    var rules = getCatalog().standardUnits || [];
    var rule = rules.find(function (r) {
      return r.templateId === templateId && r.fromUnit === fromUnit;
    });
    if (!rule || value == null || value === '') return { converted: value, unit: fromUnit, convertedOk: false };
    return {
      converted: Number(value) * rule.factor,
      unit: rule.toUnit,
      convertedOk: true,
      rule: rule
    };
  }

  function freezeEffectiveRange(indicator, range, reportVersion) {
    if (!range) return null;
    return {
      min: range.min,
      max: range.max,
      unit: range.unit,
      source: range.source,
      frozenAtVersion: reportVersion || null,
      frozenAt: new Date().toISOString()
    };
  }

  function resolveEffectiveRangeForIndicator(indicator, species, options) {
    options = options || {};
    if (indicator.effectiveRange && options.respectFrozen !== false) {
      return clone(indicator.effectiveRange);
    }
    if (indicator.manualRange) {
      return {
        min: indicator.manualRange.min,
        max: indicator.manualRange.max,
        unit: indicator.manualRange.unit,
        source: 'manual'
      };
    }
    if (indicator.importedRange && indicator.importedRange.min != null && indicator.importedRange.max != null) {
      return {
        min: indicator.importedRange.min,
        max: indicator.importedRange.max,
        unit: indicator.importedRange.unit || indicator.unit,
        source: 'imported'
      };
    }
    var entry = findCatalogEntryByKey(indicator.key || indicator.rawImportName);
    var targetType = entry && entry.type === 'indicator' ? 'indicator' : 'microbiota';
    var targetKey = indicator.key;
    var taxonomyLevel = entry && entry.type === 'microbiota' ? entry.item.level : null;
    var platform = (getCatalog().platformReferenceRanges || []).find(function (r) {
      return r.status !== 'disabled' &&
        r.species === species &&
        r.targetKey === targetKey &&
        r.targetType === targetType &&
        (!taxonomyLevel || !r.taxonomyLevel || r.taxonomyLevel === taxonomyLevel);
    });
    if (platform) {
      return {
        min: platform.minValue,
        max: platform.maxValue,
        unit: platform.unit,
        source: 'platform',
        platformRangeId: platform.id
      };
    }
    return null;
  }

  function evaluateIndicatorResult(indicator, species) {
    var st = storeApi();
    var dataStatus = st ? st.normalizeDataStatus(indicator.dataStatus) : indicator.dataStatus;
    var labels = adminCommon() ? adminCommon().DATA_STATUS_LABELS : {};

    if (dataStatus === 'MISSING_COLUMN' || dataStatus === 'EMPTY') {
      return { status: 'missing', label: labels[dataStatus] || '缺失', canJudge: false, message: '缺失不参与正常性判定' };
    }
    if (dataStatus === 'NOT_DETECTED') {
      return { status: 'not_detected', label: labels.NOT_DETECTED || '未检出', canJudge: false, message: '未检出为有效状态，不等于 0 或缺失' };
    }
    if (dataStatus === 'NOT_APPLICABLE' || dataStatus === 'INVALID') {
      return { status: dataStatus.toLowerCase(), label: labels[dataStatus] || dataStatus, canJudge: false, message: '当前状态不参与正常性判定' };
    }
    if (indicator.value == null || indicator.value === '') {
      return { status: 'no_value', label: '无有效值', canJudge: false, message: '无检测值' };
    }
    var range = resolveEffectiveRangeForIndicator(indicator, species);
    if (!range) {
      return {
        status: 'no_range',
        label: '暂无参考范围',
        canJudge: false,
        value: indicator.value,
        message: '有值无范围时不判断正常、偏高或偏低'
      };
    }
    var value = Number(indicator.value);
    if (value === 0) {
      var inRange = value >= range.min && value <= range.max;
      return {
        status: inRange ? 'normal' : (value < range.min ? 'low' : 'high'),
        label: inRange ? '正常' : (value < range.min ? '偏低' : '偏高'),
        canJudge: true,
        value: value,
        range: range,
        message: '0 是正常数值'
      };
    }
    if (value < range.min) {
      return { status: 'low', label: '偏低', canJudge: true, value: value, range: range, message: '低于有效参考范围' };
    }
    if (value > range.max) {
      return { status: 'high', label: '偏高', canJudge: true, value: value, range: range, message: '高于有效参考范围' };
    }
    return { status: 'normal', label: '正常', canJudge: true, value: value, range: range, message: '在有效参考范围内' };
  }

  function getCurrentIndicatorsForReport(state, reportId) {
    var report = (state.reports || []).find(function (r) { return r.id === reportId; });
    if (!report) return [];
    return (state.indicators || []).filter(function (ind) {
      return ind.reportId === reportId && ind.isCurrent;
    });
  }

  function getReportSpecies(state, report) {
    if (report.reportSpecies) return report.reportSpecies;
    var pet = report.petId ? (state.pets || []).find(function (p) { return p.id === report.petId; }) : null;
    return pet ? pet.species : 'cat';
  }

  function ensureDemoCompletionScenario() {
    var st = storeApi();
    if (!st || !st.updateAnalysisState) return;
    st.updateAnalysisState(function (state) {
      ensureCatalog(state);
      if (state.meta && state.meta[DEMO_COMPLETION_FLAG]) return;
      var report = (state.reports || []).find(function (r) { return r.id === 'report-002'; });
      if (!report) return;

      (state.indicators || []).forEach(function (ind) {
        if (ind.reportId !== 'report-002' || !ind.isCurrent) return;
        if (ind.originalValue === undefined) ind.originalValue = ind.value;
        if (!ind.originalDataStatus) ind.originalDataStatus = ind.dataStatus;
        if (!ind.valueSource) ind.valueSource = 'import';

        if (ind.key === '放线菌门') {
          ind.importedRange = ind.importedRange || { min: 20, max: 35, unit: '%' };
        }
        if (ind.key === '厚壁菌门') {
          ind.importedRange = ind.importedRange || null;
        }
      });

      var unknown = (state.indicators || []).find(function (ind) {
        return ind.reportId === 'report-002' && ind.isCurrent && ind.rawImportName === 'Novibacillus_sp';
      });
      if (!unknown) {
        state.indicators.push({
          id: uid('ind'),
          testRecordId: report.testRecordId,
          reportId: 'report-002',
          key: 'Novibacillus_sp',
          rawImportName: 'Novibacillus_sp',
          pendingConfirm: true,
          value: 2.4,
          unit: '%',
          dataStatus: 'PRESENT',
          importedRange: { min: 1, max: 4, unit: '%' },
          valueSource: 'import',
          originalValue: 2.4,
          originalDataStatus: 'PRESENT',
          version: 1,
          isCurrent: true,
          correctedFrom: null,
          createdAt: new Date().toISOString()
        });
      }

      state.meta = state.meta || {};
      state.meta[DEMO_COMPLETION_FLAG] = true;
    });
  }

  function confirmPendingIndicator(params) {
    params = params || {};
    return commitState(function (state) {
      var ind = (state.indicators || []).find(function (i) { return i.id === params.indicatorId; });
      if (!ind) throw new Error('indicator not found');
      ensureCatalog(state);
      var catalog = state[CATALOG_KEY];
      var linkedKey = params.linkExistingKey;
      if (!linkedKey && params.createNew) {
        var taxon = {
          id: uid('tax'),
          key: params.newKey || ind.rawImportName || ind.key,
          label: params.newLabel || ind.rawImportName || ind.key,
          value: params.newDescription || '',
          level: params.newLevel || 'genus',
          parentKey: params.newParentKey || '厚壁菌门'
        };
        catalog.microbiotaTaxa.push(taxon);
        linkedKey = taxon.key;
      }
      if (!linkedKey) throw new Error('must link or create catalog entry');
      ind.key = linkedKey;
      ind.linkedCatalogKey = linkedKey;
      ind.pendingConfirm = false;
      ind.valueSource = ind.valueSource || 'import';
      return ind;
    });
  }

  function setIndicatorManualRange(indicatorId, range, reportVersion) {
    return commitState(function (state) {
      var ind = (state.indicators || []).find(function (i) { return i.id === indicatorId; });
      if (!ind) throw new Error('indicator not found');
      ind.manualRange = range;
      ind.effectiveRange = freezeEffectiveRange(ind, {
        min: range.min,
        max: range.max,
        unit: range.unit,
        source: 'manual'
      }, reportVersion);
      return ind;
    });
  }

  function freezeReportEffectiveRanges(reportId) {
    return commitState(function (state) {
      var report = (state.reports || []).find(function (r) { return r.id === reportId; });
      if (!report) throw new Error('report not found');
      var species = getReportSpecies(state, report);
      var version = report.workingVersion || report.currentVersion || 1;
      (state.indicators || []).forEach(function (ind) {
        if (ind.reportId !== reportId || !ind.isCurrent || ind.effectiveRange) return;
        var resolved = resolveEffectiveRangeForIndicator(ind, species, { respectFrozen: false });
        if (resolved) {
          ind.effectiveRange = freezeEffectiveRange(ind, resolved, version);
        }
      });
      return report;
    });
  }

  function manualSupplementIndicator(params) {
    params = params || {};
    var st = storeApi();
    if (!st) return null;
    if (params.indicatorId) {
      return st.correctIndicator({
        indicatorId: params.indicatorId,
        value: params.value,
        dataStatus: params.dataStatus || 'PRESENT',
        correctionNote: params.note || '人工补录/修订'
      });
    }
    return commitState(function (state) {
      var row = {
        id: uid('ind'),
        testRecordId: params.testRecordId,
        reportId: params.reportId,
        key: params.key,
        value: params.value,
        unit: params.unit || '%',
        dataStatus: params.dataStatus || 'PRESENT',
        valueSource: 'manual',
        originalValue: null,
        originalDataStatus: 'MISSING_COLUMN',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: new Date().toISOString()
      };
      if (params.manualRange) {
        row.manualRange = params.manualRange;
        row.effectiveRange = freezeEffectiveRange(row, {
          min: params.manualRange.min,
          max: params.manualRange.max,
          unit: params.manualRange.unit,
          source: 'manual'
        }, params.reportVersion);
      }
      state.indicators.push(row);
      return row;
    });
  }

  function notifyCatalogUpdated() {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('professionalCatalogUpdated', {
        detail: { catalog: getCatalog() }
      }));
      document.dispatchEvent(new CustomEvent('breedConfigUpdated', {
        detail: { customKeys: getCatalog().breeds }
      }));
    }
  }

  var dictionaryDataService = {
    CATALOG_KEY: CATALOG_KEY,
    ensureCatalog: ensureCatalog,
    commitCatalog: commitCatalog,
    getCatalog: getCatalog,
    getPetMajorBreeds: getPetMajorBreeds,
    getPetMinorBreeds: getPetMinorBreeds,
    getBreedByKey: getBreedByKey,
    getBreedByLabel: getBreedByLabel,
    getFlatBreedConfig: getFlatBreedConfig,
    buildBreedTree: buildBreedTree,
    getTestIndicators: getTestIndicators,
    getMicrobiotaTaxa: getMicrobiotaTaxa,
    getMicrobiotaTree: getMicrobiotaTree,
    getPlatformReferenceRanges: getPlatformReferenceRanges,
    savePlatformReferenceRange: savePlatformReferenceRange,
    deletePlatformReferenceRange: deletePlatformReferenceRange,
    saveCatalogItem: saveCatalogItem,
    deleteCatalogItem: deleteCatalogItem,
    findCatalogEntryByKey: findCatalogEntryByKey,
    resolveStandardUnit: resolveStandardUnit,
    resolveEffectiveRangeForIndicator: resolveEffectiveRangeForIndicator,
    evaluateIndicatorResult: evaluateIndicatorResult,
    freezeEffectiveRange: freezeEffectiveRange,
    getCurrentIndicatorsForReport: getCurrentIndicatorsForReport,
    getReportSpecies: getReportSpecies,
    ensureDemoCompletionScenario: ensureDemoCompletionScenario,
    confirmPendingIndicator: confirmPendingIndicator,
    setIndicatorManualRange: setIndicatorManualRange,
    freezeReportEffectiveRanges: freezeReportEffectiveRanges,
    manualSupplementIndicator: manualSupplementIndicator,
    notifyCatalogUpdated: notifyCatalogUpdated,
    levelToLabel: levelToLabel,
    labelToLevel: labelToLevel,
    speciesLabel: speciesLabel,
    speciesFromMajorBreed: speciesFromMajorBreed,
    dictionaryData: []
  };

  dictionaryDataService.syncFromDictionaryManagement = function (customKeys) {
    if (customKeys) {
      commitCatalog(function (catalog) {
        catalog.breeds = customKeys;
      });
    }
    dictionaryDataService.dictionaryData = getCatalog().breeds;
    notifyCatalogUpdated();
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      dictionaryDataService.dictionaryData = getCatalog().breeds;
    });
    document.addEventListener('breedConfigUpdated', function (event) {
      if (event.detail && event.detail.customKeys) {
        dictionaryDataService.syncFromDictionaryManagement(event.detail.customKeys);
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dictionaryDataService: dictionaryDataService };
  }
  global.dictionaryDataService = dictionaryDataService;
})(typeof window !== 'undefined' ? window : global);
