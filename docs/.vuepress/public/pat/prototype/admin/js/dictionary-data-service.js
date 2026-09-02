/**
 * 专业基础资料 — 统一共享 Store 桥接
 * 品种字典、普通检测指标、菌群分类树、平台参考范围、标准单位换算
 */
(function (global) {
  'use strict';

  var CATALOG_KEY = 'professionalCatalog';

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

  function sortOrderHelpers() {
    var st = storeApi();
    if (st && typeof st.parseCatalogSortOrder === 'function') {
      return {
        parse: st.parseCatalogSortOrder,
        parentGroupKey: st.catalogParentGroupKey,
        backfill: st.backfillMissingCatalogSortOrders,
        reorder: st.reorderCatalogCollectionBySortOrder,
        validate: st.validateCatalogSiblingSortOrders
      };
    }
    function catalogParentGroupKey(item) {
      if (!item || item.parentKey == null || item.parentKey === '') return '';
      return String(item.parentKey);
    }
    function parseCatalogSortOrder(val) {
      var n = typeof val === 'number' ? val : parseInt(String(val == null ? '' : val).trim(), 10);
      return Number.isInteger(n) && n > 0 ? n : null;
    }
    return {
      parse: parseCatalogSortOrder,
      parentGroupKey: catalogParentGroupKey,
      backfill: function () {},
      reorder: function (items) { return items; },
      validate: function () { return []; }
    };
  }

  function nextSortOrderForSibling(list, parentKey) {
    var helpers = sortOrderHelpers();
    var pk = parentKey == null || parentKey === '' ? '' : String(parentKey);
    var max = 0;
    (list || []).forEach(function (row) {
      if (helpers.parentGroupKey(row) !== pk) return;
      var so = helpers.parse(row.sortOrder);
      if (so != null && so > max) max = so;
    });
    return max + 10;
  }

  function assertUniqueSiblingSortOrder(list, item, idField) {
    var helpers = sortOrderHelpers();
    if (item.sortOrder == null || item.sortOrder === '') return null;
    var so = helpers.parse(item.sortOrder);
    if (so == null) return '序号须为正整数';
    var pk = helpers.parentGroupKey(item);
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (String(row[idField]) === String(item[idField])) continue;
      if (helpers.parentGroupKey(row) !== pk) continue;
      if (helpers.parse(row.sortOrder) === so) return '同级序号不能重复（' + so + '）';
    }
    return null;
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

  function emptyTaxonEdu() {
    var st = storeApi();
    if (st && typeof st.emptyTaxonEdu === 'function') return st.emptyTaxonEdu();
    return {
      sceneCopy: '',
      introText: '',
      mainTasks: [],
      appearanceText: '',
      functionText: '',
      hint: '',
      knowledgeText: ''
    };
  }

  function defaultMicrobiotaPresentation() {
    var st = storeApi();
    if (st && typeof st.defaultMicrobiotaPresentation === 'function') {
      return st.defaultMicrobiotaPresentation();
    }
    return {
      low: '略显稀疏',
      normal: '生机适宜',
      high: '略显繁茂'
    };
  }

  function normalizeMicrobiotaPresentation(pres, fillDefaults) {
    var st = storeApi();
    if (st && typeof st.normalizeMicrobiotaPresentation === 'function') {
      return st.normalizeMicrobiotaPresentation(pres, fillDefaults);
    }
    var defaults = defaultMicrobiotaPresentation();
    var src = pres && typeof pres === 'object' ? pres : {};
    function val(key) {
      if (src[key] === undefined) return fillDefaults ? defaults[key] : '';
      if (src[key] == null) return '';
      return String(src[key]).trim();
    }
    return {
      low: val('low'),
      normal: val('normal'),
      high: val('high')
    };
  }

  function normalizeMainTasks(tasks) {
    if (!Array.isArray(tasks)) return [];
    var out = [];
    for (var i = 0; i < tasks.length; i++) {
      var task = String(tasks[i] == null ? '' : tasks[i]).trim();
      if (task) out.push(task);
    }
    return out;
  }

  function normalizeTaxonEdu(edu) {
    var st = storeApi();
    if (st && typeof st.normalizeTaxonEdu === 'function') return st.normalizeTaxonEdu(edu);
    var src = edu && typeof edu === 'object' ? edu : {};
    function pick() {
      for (var i = 0; i < arguments.length; i++) {
        var value = arguments[i];
        if (value != null && String(value).trim()) return String(value).trim();
      }
      return '';
    }
    var mainTasks = normalizeMainTasks(src.mainTasks);
    var knowledgeText = pick(src.knowledgeText);
    if (!knowledgeText && mainTasks.length) {
      knowledgeText = mainTasks.join('；');
    }
    return {
      sceneCopy: pick(src.sceneCopy, src.narrativeRole, src.metaphor, src.sceneRole),
      introText: pick(src.introText),
      mainTasks: mainTasks,
      appearanceText: pick(src.appearanceText, src.appearance),
      functionText: pick(src.functionText),
      // 迁移：旧 lowHint/normalHint/highHint 合并为单一 hint
      hint: pick(src.hint, src.normalHint, src.lowHint, src.highHint, src.tooLowHint, src.tooHighHint),
      knowledgeText: knowledgeText
    };
  }

  function defaultMicrobiotaTaxa() {
    return [
      {
        id: 'tax-actino',
        key: '放线菌门',
        label: '放线菌门',
        latinName: 'Actinobacteria',
        value: '主要包含有益菌群，对肠道健康至关重要',
        level: 'phylum',
        parentKey: null,
        edu: normalizeTaxonEdu({
          sceneCopy: '药草与苔藓',
          knowledgeText: '分解复杂有机物，参与有机酸代谢，维持菌群多样性。'
        })
      },
      {
        id: 'tax-bactero',
        key: '拟杆菌门',
        label: '拟杆菌门',
        latinName: 'Bacteroidetes',
        value: '肠道内重要菌群，参与营养物质消化吸收',
        level: 'phylum',
        parentKey: null,
        edu: normalizeTaxonEdu({
          sceneCopy: '活跃的采集者',
          knowledgeText: '处理脂肪和蛋白类食物，分解复杂多糖，参与营养物质的分解与转化。'
        })
      },
      {
        id: 'tax-firmi',
        key: '厚壁菌门',
        label: '厚壁菌门',
        latinName: 'Firmicutes',
        value: '包含多种重要菌属，需保持适当比例',
        level: 'phylum',
        parentKey: null,
        edu: normalizeTaxonEdu({
          sceneCopy: '强壮的食草者',
          knowledgeText: '发酵植物纤维，产生短链脂肪酸，参与能量代谢相关过程。'
        })
      },
      {
        id: 'tax-proteo',
        key: '变形菌门',
        label: '变形菌门',
        latinName: 'Proteobacteria',
        value: '包含潜在有害菌，应控制在较低水平',
        level: 'phylum',
        parentKey: null,
        edu: normalizeTaxonEdu({
          sceneCopy: '需要留意的过客',
          knowledgeText: '在肠道中数量通常较少，参与部分代谢产物处理。'
        })
      },
      {
        id: 'tax-fuso',
        key: '梭杆菌门',
        label: '梭杆菌门',
        latinName: 'Fusobacteria',
        value: '含量通常较低，过高可能提示菌群失衡',
        level: 'phylum',
        parentKey: null,
        edu: normalizeTaxonEdu({
          sceneCopy: '低调的清道夫',
          knowledgeText: '在肠道中数量通常较少，参与残留有机物分解。'
        })
      },
      {
        id: 'tax-bifi',
        key: '双歧杆菌',
        label: '双歧杆菌',
        latinName: 'Bifidobacterium',
        value: '肠道健康的关键指标，参与免疫调节',
        level: 'genus',
        parentKey: '放线菌门',
        edu: normalizeTaxonEdu({
          sceneCopy: '苔藓',
          knowledgeText: '体型较小的常见菌属，常出现在肠道菌群结构中。参与糖类发酵与有机酸代谢。'
        })
      },
      {
        id: 'tax-lacto',
        key: '乳酸菌',
        label: '乳酸菌',
        latinName: 'Lactobacillus',
        value: '产生乳酸，维持肠道酸性环境',
        level: 'genus',
        parentKey: '厚壁菌门',
        edu: normalizeTaxonEdu({
          sceneCopy: '食草者',
          knowledgeText: '产生乳酸的小型发酵者，帮助维持酸性环境。产生乳酸，参与碳水化合物发酵。'
        })
      },
      {
        id: 'tax-ecoli',
        key: '大肠杆菌',
        label: '大肠杆菌',
        latinName: 'Escherichia',
        value: '条件致病菌，正常情况下含量很少',
        level: 'genus',
        parentKey: '变形菌门',
        edu: normalizeTaxonEdu({
          sceneCopy: '过客',
          knowledgeText: '肠道中数量通常很少的常见菌属。参与肠道内部分代谢过程。'
        })
      },
      {
        id: 'tax-pept',
        key: 'Peptacetobacter',
        label: 'Peptacetobacter属',
        latinName: 'Peptacetobacter',
        value: '善于发酵碳水，产生短链脂肪酸',
        level: 'genus',
        parentKey: '厚壁菌门',
        edu: normalizeTaxonEdu({
          sceneCopy: '大象',
          knowledgeText: '厚壁菌门中的纤维发酵者，产出短链脂肪酸。善于发酵碳水，产生短链脂肪酸。'
        })
      },
      {
        id: 'tax-lach',
        key: 'Lachnoclostridium',
        label: 'Lachnoclostridium属',
        latinName: 'Lachnoclostridium',
        value: '厚壁菌门常见属',
        level: 'genus',
        parentKey: '厚壁菌门',
        edu: normalizeTaxonEdu({
          sceneCopy: '大猩猩',
          knowledgeText: '厚壁菌门常见属，参与纤维发酵。参与植物纤维发酵，协助能量代谢相关过程。'
        })
      },
      {
        id: 'tax-coll',
        key: 'Collinsella',
        label: 'Collinsella属',
        latinName: 'Collinsella',
        value: '放线菌门常见属',
        level: 'genus',
        parentKey: '放线菌门',
        edu: normalizeTaxonEdu({
          sceneCopy: '药草',
          knowledgeText: '放线菌门中常见的小型成员。参与碳水分解与胆汁酸相关代谢。'
        })
      },
      {
        id: 'tax-bact',
        key: 'Bacteroides',
        label: 'Bacteroides属',
        latinName: 'Bacteroides',
        value: '拟杆菌门常见属',
        level: 'genus',
        parentKey: '拟杆菌门',
        edu: normalizeTaxonEdu({
          sceneCopy: '野猪',
          knowledgeText: '迅速增殖的小团体，偶尔会惹麻烦。擅长处理蛋白质、脂肪和多糖，是核心代谢成员。'
        })
      },
      {
        id: 'tax-phoc',
        key: 'Phocaeicola',
        label: 'Phocaeicola属',
        latinName: 'Phocaeicola',
        value: '拟杆菌门常见属',
        level: 'genus',
        parentKey: '拟杆菌门',
        edu: normalizeTaxonEdu({
          sceneCopy: '浣熊',
          knowledgeText: '灵活的小型分解者，常与拟杆菌属共事。协助分解复杂多糖，扩展拟杆菌门的生态功能。'
        })
      }
    ];
  }

  function defaultPlatformRanges() {
    return [
      { id: 'pr-001', species: 'cat', targetType: 'microbiota', targetKey: '放线菌门', taxonomyLevel: 'phylum', minValue: 25, maxValue: 45, unit: '%', status: 'active', notes: '猫科放线菌门平台范围', createdAt: '2025-01-15T10:30:00.000Z' },
      { id: 'pr-002', species: 'cat', targetType: 'microbiota', targetKey: '双歧杆菌', taxonomyLevel: 'genus', minValue: 12, maxValue: 28, unit: '%', status: 'active', notes: '猫科双歧杆菌平台范围', createdAt: '2025-01-15T10:35:00.000Z' },
      { id: 'pr-003', species: 'dog', targetType: 'microbiota', targetKey: '放线菌门', taxonomyLevel: 'phylum', minValue: 30, maxValue: 50, unit: '%', status: 'active', notes: '犬科放线菌门平台范围', createdAt: '2025-01-15T11:00:00.000Z' },
      { id: 'pr-004', species: 'cat', targetType: 'microbiota', targetKey: '乳酸菌', taxonomyLevel: 'genus', minValue: 15, maxValue: 30, unit: '%', status: 'active', notes: '猫科通用乳酸菌范围', createdAt: '2025-01-15T11:05:00.000Z' },
      { id: 'pr-005', species: 'dog', targetType: 'microbiota', targetKey: '乳酸菌', taxonomyLevel: 'genus', minValue: 18, maxValue: 35, unit: '%', status: 'active', notes: '犬科通用乳酸菌范围', createdAt: '2025-01-15T11:10:00.000Z' },
      { id: 'pr-006', species: 'cat', targetType: 'indicator', targetKey: 'alpha-diversity', taxonomyLevel: null, minValue: 3, maxValue: 5.5, unit: 'index', status: 'active', notes: '猫 Alpha 多样性', createdAt: '2025-01-15T11:15:00.000Z' },
      { id: 'pr-007', species: 'cat', targetType: 'microbiota', targetKey: '拟杆菌门', taxonomyLevel: 'phylum', minValue: 15, maxValue: 40, unit: '%', status: 'active', notes: '猫科拟杆菌门平台范围', createdAt: '2025-01-15T11:20:00.000Z' },
      { id: 'pr-008', species: 'cat', targetType: 'microbiota', targetKey: '厚壁菌门', taxonomyLevel: 'phylum', minValue: 25, maxValue: 50, unit: '%', status: 'active', notes: '猫科厚壁菌门平台范围', createdAt: '2025-01-15T11:21:00.000Z' },
      { id: 'pr-009', species: 'cat', targetType: 'microbiota', targetKey: '梭杆菌门', taxonomyLevel: 'phylum', minValue: 0, maxValue: 8, unit: '%', status: 'active', notes: '猫科梭杆菌门平台范围', createdAt: '2025-01-15T11:22:00.000Z' },
      { id: 'pr-010', species: 'cat', targetType: 'microbiota', targetKey: '变形菌门', taxonomyLevel: 'phylum', minValue: 0, maxValue: 12, unit: '%', status: 'active', notes: '猫科变形菌门平台范围', createdAt: '2025-01-15T11:23:00.000Z' },
      { id: 'pr-011', species: 'cat', targetType: 'microbiota', targetKey: 'Collinsella', taxonomyLevel: 'genus', minValue: 3, maxValue: 8, unit: '%', status: 'active', notes: '猫科 Collinsella 平台范围', createdAt: '2025-01-15T11:24:00.000Z' },
      { id: 'pr-012', species: 'cat', targetType: 'microbiota', targetKey: 'Bacteroides', taxonomyLevel: 'genus', minValue: 12, maxValue: 20, unit: '%', status: 'active', notes: '猫科 Bacteroides 平台范围', createdAt: '2025-01-15T11:25:00.000Z' },
      { id: 'pr-013', species: 'cat', targetType: 'microbiota', targetKey: 'Phocaeicola', taxonomyLevel: 'genus', minValue: 2, maxValue: 10, unit: '%', status: 'active', notes: '猫科 Phocaeicola 平台范围', createdAt: '2025-01-15T11:26:00.000Z' },
      { id: 'pr-014', species: 'cat', targetType: 'microbiota', targetKey: 'Peptacetobacter', taxonomyLevel: 'genus', minValue: 3, maxValue: 8, unit: '%', status: 'active', notes: '猫科 Peptacetobacter 平台范围', createdAt: '2025-01-15T11:27:00.000Z' }
    ];
  }

  function defaultStandardUnits() {
    return [
      { id: 'su-001', templateId: 'ORG-LAB-GUT-001', fromUnit: '‰', toUnit: '%', factor: 0.1, note: '已知模板明确换算：千分比转百分比' }
    ];
  }

  function flattenSchemesToPlatformRanges(schemes) {
    var st = storeApi();
    if (st && typeof st.flattenSchemesToPlatformRanges === 'function') {
      return st.flattenSchemesToPlatformRanges(schemes);
    }
    var out = [];
    (schemes || []).forEach(function (scheme) {
      if (!scheme || scheme.status === 'disabled') return;
      (scheme.applicableSpecies || []).forEach(function (species) {
        (scheme.items || []).forEach(function (item) {
          if (item.minValue == null || item.maxValue == null || !item.unit) return;
          out.push({
            id: scheme.id + ':' + species + ':' + item.targetKey + ':' + (item.taxonomyLevel || ''),
            schemeId: scheme.id,
            species: species,
            templateId: scheme.templateId,
            targetType: item.targetType,
            targetKey: item.targetKey,
            taxonomyLevel: item.taxonomyLevel || null,
            minValue: item.minValue,
            maxValue: item.maxValue,
            unit: item.unit,
            notes: item.notes || scheme.evidenceRef || '',
            status: scheme.status,
            createdAt: scheme.createdAt,
            updatedAt: scheme.updatedAt
          });
        });
      });
    });
    return out;
  }

  function syncPlatformReferenceRangesFromSchemes(catalog) {
    if (!catalog) return;
    if (catalog.referenceRangeSchemes && catalog.referenceRangeSchemes.length) {
      catalog.platformReferenceRanges = flattenSchemesToPlatformRanges(catalog.referenceRangeSchemes);
    }
  }

  function schemeHasValidItems(scheme) {
    var st = storeApi();
    if (st && typeof st.schemeHasValidItems === 'function') return st.schemeHasValidItems(scheme);
    if (!scheme || !scheme.evidenceRef || !String(scheme.evidenceRef).trim()) return false;
    return (scheme.items || []).some(function (item) {
      return item.minValue != null && item.maxValue != null && item.unit && item.minValue < item.maxValue;
    });
  }

  function defaultCatalog() {
    var st = storeApi();
    if (st && st.peekState && st.peekState().professionalCatalog) {
      return clone(st.peekState().professionalCatalog);
    }
    return {
      breeds: defaultBreeds(),
      testIndicators: defaultTestIndicators(),
      microbiotaTaxa: defaultMicrobiotaTaxa(),
      microbiotaPresentation: defaultMicrobiotaPresentation(),
      referenceRangeSchemes: [],
      platformReferenceRanges: defaultPlatformRanges(),
      standardUnits: defaultStandardUnits(),
      meta: { version: 9, initializedAt: new Date().toISOString() }
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
      if (!cat.microbiotaPresentation) cat.microbiotaPresentation = defaultMicrobiotaPresentation();
      if (!cat.referenceRangeSchemes) cat.referenceRangeSchemes = [];
      if (!cat.platformReferenceRanges) cat.platformReferenceRanges = defaultPlatformRanges();
      if (!cat.standardUnits) cat.standardUnits = defaultStandardUnits();
      syncPlatformReferenceRangesFromSchemes(cat);
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
    if (!st || typeof st.commit !== 'function') return null;
    return st.commit(mutator);
  }

  function readState() {
    var st = storeApi();
    if (!st) return null;
    if (typeof st.peekState === 'function') return st.peekState();
    return st.getState ? st.getState() : null;
  }

  function getCatalog() {
    var state = readState();
    if (!state || !state[CATALOG_KEY]) return defaultCatalog();
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

  function getReferenceRangeSchemes(activeOnly) {
    var schemes = getCatalog().referenceRangeSchemes || [];
    if (activeOnly === false) return clone(schemes);
    return clone(schemes.filter(function (s) { return s.status !== 'disabled'; }));
  }

  function getPlatformReferenceRanges(activeOnly) {
    var catalog = getCatalog();
    if (catalog.referenceRangeSchemes && catalog.referenceRangeSchemes.length) {
      var flat = flattenSchemesToPlatformRanges(catalog.referenceRangeSchemes);
      if (activeOnly === false) return clone(flat);
      return clone(flat.filter(function (r) { return r.status !== 'disabled'; }));
    }
    var ranges = catalog.platformReferenceRanges || [];
    if (activeOnly === false) return clone(ranges);
    return clone(ranges.filter(function (r) { return r.status !== 'disabled'; }));
  }

  function saveReferenceRangeScheme(scheme) {
    return commitCatalog(function (catalog) {
      if (!catalog.referenceRangeSchemes) catalog.referenceRangeSchemes = [];
      var row = Object.assign({
        applicableSpecies: [],
        items: [],
        status: 'draft',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, scheme);
      if (row.status === 'active' && !schemeHasValidItems(row)) {
        throw new Error('启用方案需要专业依据且至少一条有效范围');
      }
      if (scheme.id) {
        var idx = catalog.referenceRangeSchemes.findIndex(function (s) { return s.id === scheme.id; });
        if (idx >= 0) {
          row.updatedAt = new Date().toISOString();
          if (scheme.bumpVersion) row.version = (catalog.referenceRangeSchemes[idx].version || 1) + 1;
          catalog.referenceRangeSchemes[idx] = Object.assign({}, catalog.referenceRangeSchemes[idx], row);
          syncPlatformReferenceRangesFromSchemes(catalog);
          return catalog.referenceRangeSchemes[idx];
        }
      }
      row.id = row.id || uid('rrs');
      catalog.referenceRangeSchemes.push(row);
      syncPlatformReferenceRangesFromSchemes(catalog);
      return row;
    });
  }

  function deleteReferenceRangeScheme(id) {
    commitCatalog(function (catalog) {
      catalog.referenceRangeSchemes = (catalog.referenceRangeSchemes || []).filter(function (s) { return s.id !== id; });
      syncPlatformReferenceRangesFromSchemes(catalog);
    });
  }

  function duplicateReferenceRangeScheme(id) {
    var source = (getCatalog().referenceRangeSchemes || []).find(function (s) { return s.id === id; });
    if (!source) throw new Error('scheme not found');
    var copy = clone(source);
    copy.id = uid('rrs');
    copy.name = (source.name || '未命名方案') + '（副本）';
    copy.status = 'draft';
    copy.version = 1;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    return saveReferenceRangeScheme(copy);
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
    var helpers = sortOrderHelpers();
    return commitCatalog(function (catalog) {
      var list = catalog[collection];
      if (item.sortOrder != null && item.sortOrder !== '') {
        var parsed = helpers.parse(item.sortOrder);
        if (parsed == null) throw new Error('序号须为正整数');
        item.sortOrder = parsed;
      }
      if (item[idField]) {
        var idx = list.findIndex(function (row) {
          return String(row[idField]) === String(item[idField]);
        });
        if (idx >= 0) {
          if (item.sortOrder == null || item.sortOrder === '') {
            item.sortOrder = helpers.parse(list[idx].sortOrder) || list[idx].sortOrder;
          }
          var uniqueErr = assertUniqueSiblingSortOrder(list, item, idField);
          if (uniqueErr) throw new Error(uniqueErr);
          list[idx] = Object.assign({}, list[idx], item);
          catalog[collection] = helpers.reorder(list);
          return list[idx];
        }
      }
      var row = Object.assign({}, item);
      if (!row[idField]) row[idField] = uid(collection.slice(0, 2));
      if (row.sortOrder == null || row.sortOrder === '') {
        row.sortOrder = nextSortOrderForSibling(list, row.parentKey);
      }
      var newUniqueErr = assertUniqueSiblingSortOrder(list, row, idField);
      if (newUniqueErr) throw new Error(newUniqueErr);
      list.push(row);
      catalog[collection] = helpers.reorder(list);
      return row;
    });
  }

  function saveCatalogOrder(collection, items) {
    var helpers = sortOrderHelpers();
    var draft = clone(items || []);
    var errors = helpers.validate(draft);
    if (errors.length) throw new Error(errors[0]);
    return commitCatalog(function (catalog) {
      var list = catalog[collection];
      var byId = {};
      draft.forEach(function (item) {
        byId[String(item.id)] = helpers.parse(item.sortOrder);
      });
      list.forEach(function (row) {
        if (byId[String(row.id)] != null) row.sortOrder = byId[String(row.id)];
      });
      catalog[collection] = helpers.reorder(list);
      catalog.meta = catalog.meta || {};
      catalog.meta.version = Math.max(catalog.meta.version || 0, 13);
      return catalog[collection];
    });
  }

  function saveTaxonEdu(key, patch) {
    var st = storeApi();
    if (!st || typeof st.saveTaxonEdu !== 'function') return null;
    return st.saveTaxonEdu(key, patch);
  }

  function getMicrobiotaPresentation() {
    var st = storeApi();
    if (st && typeof st.getMicrobiotaPresentation === 'function') {
      return st.getMicrobiotaPresentation();
    }
    return normalizeMicrobiotaPresentation(getCatalog().microbiotaPresentation, true);
  }

  function saveMicrobiotaPresentation(patch) {
    var st = storeApi();
    if (st && typeof st.saveMicrobiotaPresentation === 'function') {
      return st.saveMicrobiotaPresentation(patch);
    }
    return commitCatalog(function (catalog) {
      var current = catalog.microbiotaPresentation || defaultMicrobiotaPresentation();
      catalog.microbiotaPresentation = normalizeMicrobiotaPresentation(
        Object.assign({}, current, patch || {}),
        false
      );
      catalog.meta = catalog.meta || {};
      catalog.meta.version = Math.max(catalog.meta.version || 0, 9);
      return catalog.microbiotaPresentation;
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

  function resolveEffectiveRangeForIndicator(indicator, species) {
    var st = storeApi();
    if (st && typeof st.resolveEffectiveRangeForIndicator === 'function') {
      return st.resolveEffectiveRangeForIndicator(indicator, species);
    }
    return null;
  }

  function evaluateIndicatorResult(indicator, species) {
    var st = storeApi();
    var labels = adminCommon() ? adminCommon().DATA_STATUS_LABELS : {};
    var rangeLabels = (st && st.RANGE_STATUS_LABELS) || {
      low: '偏低',
      normal: '正常',
      high: '偏高',
      no_range: '暂无参考范围'
    };
    var decorated = (st && typeof st.evaluateResult === 'function')
      ? st.evaluateResult(indicator)
      : (indicator || {});
    var dataStatus = st && typeof st.normalizeDataStatus === 'function'
      ? st.normalizeDataStatus(decorated.dataStatus)
      : decorated.dataStatus;

    if (dataStatus === 'MISSING_COLUMN' || dataStatus === 'EMPTY') {
      return { status: 'missing', label: labels[dataStatus] || '缺失', canJudge: false, message: '缺失不参与正常性判定' };
    }
    if (dataStatus === 'NOT_DETECTED') {
      return { status: 'not_detected', label: labels.NOT_DETECTED || '未检出', canJudge: false, message: '未检出为有效状态，不等于 0 或缺失' };
    }
    if (dataStatus === 'NOT_APPLICABLE' || dataStatus === 'INVALID') {
      return { status: dataStatus.toLowerCase(), label: labels[dataStatus] || dataStatus, canJudge: false, message: '当前状态不参与正常性判定' };
    }
    var value = decorated.effectiveValue !== undefined && decorated.effectiveValue !== null
      ? decorated.effectiveValue
      : decorated.value;
    if (value == null || value === '') {
      return { status: 'no_value', label: '无有效值', canJudge: false, message: '无检测值' };
    }
    var range = resolveEffectiveRangeForIndicator(decorated, species);
    if (!range || range.source === 'none') {
      return {
        status: 'no_range',
        label: rangeLabels.no_range || '暂无参考范围',
        canJudge: false,
        value: value,
        message: '有值无范围时不判断正常、偏高或偏低'
      };
    }
    var num = Number(value);
    var status = 'normal';
    if (isFinite(num)) {
      if (num < range.min) status = 'low';
      else if (num > range.max) status = 'high';
    }
    var messages = { low: '低于有效参考范围', high: '高于有效参考范围', normal: '在有效参考范围内' };
    return {
      status: status,
      label: rangeLabels[status] || status,
      canJudge: true,
      value: value,
      range: range,
      message: messages[status] || ''
    };
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
          parentKey: params.newParentKey || 'Firmicutes'
        };
        catalog.microbiotaTaxa.push(taxon);
        linkedKey = taxon.key;
      }
      if (!linkedKey) throw new Error('must link or create catalog entry');
      ind.key = linkedKey;
      ind.pendingConfirm = false;
      return ind;
    });
  }

  function manualSupplementIndicator(params) {
    params = params || {};
    var st = storeApi();
    if (!st) return null;
    var reason = params.reason || params.note || '人工补录/修订';
    if (params.indicatorId || params.resultId) {
      if (typeof st.modifyResultValue !== 'function') throw new Error('modifyResultValue unavailable');
      return st.modifyResultValue({
        reportId: params.reportId,
        resultId: params.resultId || params.indicatorId,
        value: params.value,
        dataStatus: params.dataStatus,
        labNotice: params.labNotice,
        reason: reason,
        actor: params.actor
      });
    }
    if (typeof st.supplementResult !== 'function') throw new Error('supplementResult unavailable');
    return st.supplementResult({
      reportId: params.reportId,
      key: params.key,
      value: params.value,
      unit: params.unit,
      labNotice: params.labNotice,
      dataStatus: params.dataStatus,
      reason: reason
    });
  }

  var catalogNotifyDepth = 0;

  function notifyCatalogUpdated() {
    if (catalogNotifyDepth) return;
    if (typeof document === 'undefined') return;
    catalogNotifyDepth += 1;
    try {
      var catalog = getCatalog();
      document.dispatchEvent(new CustomEvent('professionalCatalogUpdated', {
        detail: { catalog: catalog }
      }));
      document.dispatchEvent(new CustomEvent('breedConfigUpdated', {
        detail: { customKeys: catalog.breeds }
      }));
    } finally {
      catalogNotifyDepth -= 1;
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
    getReferenceRangeSchemes: getReferenceRangeSchemes,
    getPlatformReferenceRanges: getPlatformReferenceRanges,
    saveReferenceRangeScheme: saveReferenceRangeScheme,
    deleteReferenceRangeScheme: deleteReferenceRangeScheme,
    duplicateReferenceRangeScheme: duplicateReferenceRangeScheme,
    schemeHasValidItems: schemeHasValidItems,
    savePlatformReferenceRange: savePlatformReferenceRange,
    deletePlatformReferenceRange: deletePlatformReferenceRange,
    saveCatalogItem: saveCatalogItem,
    saveCatalogOrder: saveCatalogOrder,
    saveTaxonEdu: saveTaxonEdu,
    getMicrobiotaPresentation: getMicrobiotaPresentation,
    saveMicrobiotaPresentation: saveMicrobiotaPresentation,
    deleteCatalogItem: deleteCatalogItem,
    findCatalogEntryByKey: findCatalogEntryByKey,
    resolveStandardUnit: resolveStandardUnit,
    resolveEffectiveRangeForIndicator: resolveEffectiveRangeForIndicator,
    evaluateIndicatorResult: evaluateIndicatorResult,
    getCurrentIndicatorsForReport: getCurrentIndicatorsForReport,
    getReportSpecies: getReportSpecies,
    confirmPendingIndicator: confirmPendingIndicator,
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
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      dictionaryDataService.dictionaryData = getCatalog().breeds;
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dictionaryDataService: dictionaryDataService };
  }
  global.dictionaryDataService = dictionaryDataService;
})(typeof window !== 'undefined' ? window : global);
