/**
 * PET 报告原型 — 跨端可重置 Mock 数据服务
 * 浏览器: window.PetReportMockStore
 * Node smoke: require('./mock-store.js')
 * 全部为演示 Mock 数据，非真实业务数据。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PetReportMockStore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STORAGE_KEY = 'pet-report-mock-store-v1';
  var DEMO_LABEL = '[演示 Mock]';

  function stripDemoPrefix(text) {
    if (text == null || typeof text !== 'string') return text;
    return text
      .replace(/\[演示 Mock\]\s*/g, '')
      .replace(/全部为演示 Mock 数据[^。]*。?/g, '')
      .replace(/本条为演示呈现[，,]?解读口径待确认。?/g, '')
      .replace(/演示呈现[，,]?最终位置与样式待甲方确认/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function migratePresentationCopyV10(state) {
    function walk(node) {
      if (node == null) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node !== 'object') return;
      Object.keys(node).forEach(function (key) {
        var val = node[key];
        if (typeof val === 'string') {
          node[key] = stripDemoPrefix(val);
        } else if (val && typeof val === 'object') {
          walk(val);
        }
      });
    }
    walk(state);
    if (state.meta) {
      var disclaimer = state.meta.disclaimer;
      if (!disclaimer || /Mock|演示|待甲方|非真实|非最终/.test(disclaimer)) {
        state.meta.disclaimer = '';
      } else {
        state.meta.disclaimer = stripDemoPrefix(disclaimer);
      }
    }
    var schemes = state.professionalCatalog && state.professionalCatalog.referenceRangeSchemes;
    if (schemes) {
      schemes.forEach(function (scheme) {
        if (scheme.evidenceType === 'demo') scheme.evidenceType = 'internal';
        if (!scheme.evidenceRef || /演示|待专业确认|Mock/.test(scheme.evidenceRef)) {
          scheme.evidenceRef = '检测机构内部参考范围';
        }
        if (scheme.name) {
          scheme.name = scheme.name.replace(/（演示）/g, '').replace(/\(演示\)/g, '').trim();
        }
      });
    }
  }

  var DATA_STATUSES = ['PRESENT', 'MISSING_COLUMN', 'EMPTY', 'NOT_DETECTED', 'INVALID', 'NOT_APPLICABLE'];
  var CONCLUSION_LEVELS = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];
  var REPORT_STATUSES = ['draft', 'pending_review', 'rejected', 'approved', 'published', 'corrected', 'voided'];
  var RECOMMEND_TYPES = ['PRODUCT', 'TAG_CANDIDATE', 'NONE'];
  var HEALTH_LEVELS = ['A', 'B', 'C', 'D', 'E'];
  var WORKFLOW_STATUSES = ['unassigned', 'incomplete', 'pending_review', 'published', 'voided'];
  var USER_REPORT_STATUSES = ['in_progress', 'published'];
  var OWNERSHIP_STATUSES = ['unassigned', 'pending_claim', 'bound', 'claimed'];
  var DEFAULT_SOURCE_ORG_ID = 'ORG-LAB-GUT-001';
  var TODO_FLAG_LABELS = {
    import_error: '导入异常',
    unassigned: '待归属',
    rejected: '审核驳回',
    partial_import: '局部导入异常',
    pending_reanalysis: '待重新分析',
    recommendation_invalid: '推荐商品失效',
    zero_stock: '主推零库存',
    no_candidates: '无候选商品',
    correction_draft: '更正草稿进行中'
  };

  var listeners = [];
  var memoryState = null;
  var localStorageAvailable = detectLocalStorage();

  function detectLocalStorage() {
    try {
      if (typeof localStorage === 'undefined') return false;
      var probe = '__pet_mock_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeDataStatus(status) {
    if (status === 'VALID') return 'PRESENT';
    return status;
  }

  function isPresentDataStatus(status) {
    return normalizeDataStatus(status) === 'PRESENT';
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
    return {
      sceneCopy: '',
      introText: '',
      mainTasks: [],
      appearanceText: '',
      functionText: '',
      lowHint: '',
      normalHint: '',
      highHint: '',
      knowledgeText: ''
    };
  }

  function defaultMicrobiotaPresentation() {
    return {
      low: '略显稀疏',
      normal: '生机适宜',
      high: '略显繁茂'
    };
  }

  function normalizeMicrobiotaPresentation(pres, fillDefaults) {
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

  function presentationKeyFromStatusClass(statusClass) {
    if (statusClass === 'status-low') return 'low';
    if (statusClass === 'status-normal') return 'normal';
    if (statusClass === 'status-high') return 'high';
    return null;
  }

  function resolveMicrobiotaSceneStatusWord(statusClass, presentation) {
    var key = presentationKeyFromStatusClass(statusClass);
    if (!key) return '';
    var pres = presentation;
    if (!pres) {
      var state = loadState();
      pres = state.professionalCatalog && state.professionalCatalog.microbiotaPresentation;
    }
    pres = normalizeMicrobiotaPresentation(pres, true);
    if (!pres[key]) return '';
    return String(pres[key]).trim();
  }

  function pickFirstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      if (value != null && String(value).trim()) return String(value).trim();
    }
    return '';
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
    var src = edu && typeof edu === 'object' ? edu : {};
    return {
      sceneCopy: pickFirstNonEmpty(src.sceneCopy, src.narrativeRole, src.metaphor, src.sceneRole),
      introText: pickFirstNonEmpty(src.introText),
      mainTasks: normalizeMainTasks(src.mainTasks),
      appearanceText: pickFirstNonEmpty(src.appearanceText, src.appearance),
      functionText: pickFirstNonEmpty(src.functionText),
      lowHint: pickFirstNonEmpty(src.lowHint, src.tooLowHint),
      normalHint: pickFirstNonEmpty(src.normalHint),
      highHint: pickFirstNonEmpty(src.highHint, src.tooHighHint),
      knowledgeText: pickFirstNonEmpty(src.knowledgeText)
    };
  }

  function migrateLegacyEduFields(edu, level) {
    var out = normalizeTaxonEdu(edu);
    if (level === 'phylum' && !out.introText && out.knowledgeText) {
      out.introText = out.knowledgeText;
    }
    if (level !== 'phylum' && !out.functionText && out.knowledgeText) {
      out.functionText = out.knowledgeText;
    }
    return out;
  }

  function isEmptyEduField(key, value) {
    if (key === 'mainTasks') return !Array.isArray(value) || !value.length;
    return value == null || value === '';
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
          introText: '拟杆菌门（Bacteroidetes）就像是灵活的杂食动物——比如浣熊或野猪。',
          mainTasks: [
            '吃各种食物（脂肪、肉类、纤维都吃）',
            '分解复杂的营养物质，制造营养',
            '维持肠道的多样性和平衡。'
          ],
          lowHint: '如果这些「杂食动物」太少，可能说明饮食单一，肠道吸收不佳。',
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
          appearanceText: '迅速繁殖的小团体，偶尔会惹麻烦。',
          functionText: '擅长处理蛋白质、脂肪与多糖，是代谢核心成员。',
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
    var demoNote = '';
    return [
      { id: 'pr-001', species: 'cat', targetType: 'microbiota', targetKey: '放线菌门', taxonomyLevel: 'phylum', minValue: 25, maxValue: 45, unit: '%', status: 'active', notes: demoNote + ' 猫科放线菌门', createdAt: '2025-01-15T10:30:00.000Z' },
      { id: 'pr-002', species: 'cat', targetType: 'microbiota', targetKey: '双歧杆菌', taxonomyLevel: 'genus', minValue: 12, maxValue: 28, unit: '%', status: 'active', notes: demoNote + ' 猫科双歧杆菌', createdAt: '2025-01-15T10:35:00.000Z' },
      { id: 'pr-003', species: 'dog', targetType: 'microbiota', targetKey: '放线菌门', taxonomyLevel: 'phylum', minValue: 30, maxValue: 50, unit: '%', status: 'active', notes: demoNote + ' 犬科放线菌门', createdAt: '2025-01-15T11:00:00.000Z' },
      { id: 'pr-004', species: 'cat', targetType: 'microbiota', targetKey: '乳酸菌', taxonomyLevel: 'genus', minValue: 15, maxValue: 30, unit: '%', status: 'active', notes: demoNote + ' 猫科乳酸菌', createdAt: '2025-01-15T11:05:00.000Z' },
      { id: 'pr-005', species: 'dog', targetType: 'microbiota', targetKey: '乳酸菌', taxonomyLevel: 'genus', minValue: 18, maxValue: 35, unit: '%', status: 'active', notes: demoNote + ' 犬科乳酸菌', createdAt: '2025-01-15T11:10:00.000Z' },
      { id: 'pr-006', species: 'cat', targetType: 'indicator', targetKey: 'alpha-diversity', taxonomyLevel: null, minValue: 3, maxValue: 5.5, unit: 'index', status: 'active', notes: demoNote + ' 猫 Alpha 多样性', createdAt: '2025-01-15T11:15:00.000Z' },
      { id: 'pr-007', species: 'cat', targetType: 'microbiota', targetKey: '拟杆菌门', taxonomyLevel: 'phylum', minValue: 15, maxValue: 40, unit: '%', status: 'active', notes: demoNote + ' 猫科拟杆菌门', createdAt: '2025-01-15T11:20:00.000Z' },
      { id: 'pr-008', species: 'cat', targetType: 'microbiota', targetKey: '厚壁菌门', taxonomyLevel: 'phylum', minValue: 25, maxValue: 50, unit: '%', status: 'active', notes: demoNote + ' 猫科厚壁菌门', createdAt: '2025-01-15T11:21:00.000Z' },
      { id: 'pr-009', species: 'cat', targetType: 'microbiota', targetKey: '梭杆菌门', taxonomyLevel: 'phylum', minValue: 0, maxValue: 8, unit: '%', status: 'active', notes: demoNote + ' 猫科梭杆菌门', createdAt: '2025-01-15T11:22:00.000Z' },
      { id: 'pr-010', species: 'cat', targetType: 'microbiota', targetKey: '变形菌门', taxonomyLevel: 'phylum', minValue: 0, maxValue: 12, unit: '%', status: 'active', notes: demoNote + ' 猫科变形菌门', createdAt: '2025-01-15T11:23:00.000Z' },
      { id: 'pr-011', species: 'cat', targetType: 'microbiota', targetKey: 'Collinsella', taxonomyLevel: 'genus', minValue: 3, maxValue: 8, unit: '%', status: 'active', notes: demoNote + ' 猫科 Collinsella', createdAt: '2025-01-15T11:24:00.000Z' },
      { id: 'pr-012', species: 'cat', targetType: 'microbiota', targetKey: 'Bacteroides', taxonomyLevel: 'genus', minValue: 12, maxValue: 20, unit: '%', status: 'active', notes: demoNote + ' 猫科 Bacteroides', createdAt: '2025-01-15T11:25:00.000Z' },
      { id: 'pr-013', species: 'cat', targetType: 'microbiota', targetKey: 'Phocaeicola', taxonomyLevel: 'genus', minValue: 2, maxValue: 10, unit: '%', status: 'active', notes: demoNote + ' 猫科 Phocaeicola', createdAt: '2025-01-15T11:26:00.000Z' },
      { id: 'pr-014', species: 'cat', targetType: 'microbiota', targetKey: 'Peptacetobacter', taxonomyLevel: 'genus', minValue: 3, maxValue: 8, unit: '%', status: 'active', notes: demoNote + ' 猫科 Peptacetobacter', createdAt: '2025-01-15T11:27:00.000Z' }
    ];
  }

  function platformRangeItemKey(item) {
    return [
      item.targetType || '',
      item.targetKey || '',
      item.taxonomyLevel || '',
      item.unit || ''
    ].join('\0');
  }

  function schemeItemsFromPlatformRanges(ranges) {
    var seen = {};
    var items = [];
    ranges.forEach(function (range) {
      var key = platformRangeItemKey(range);
      if (seen[key]) return;
      seen[key] = true;
      items.push({
        targetType: range.targetType,
        targetKey: range.targetKey,
        taxonomyLevel: range.taxonomyLevel || null,
        minValue: range.minValue,
        maxValue: range.maxValue,
        unit: range.unit,
        notes: range.notes || ''
      });
    });
    return items;
  }

  function defaultReferenceRangeSchemes() {
    var demoEvidence = '检测机构内部参考范围';
    var flat = defaultPlatformRanges();
    var catItems = schemeItemsFromPlatformRanges(flat.filter(function (r) { return r.species === 'cat'; }));
    var dogItems = schemeItemsFromPlatformRanges(flat.filter(function (r) { return r.species === 'dog'; }));
    return [
      {
        id: 'rrs-cat-gut-001',
        name: '猫科肠道菌群检测',
        templateId: 'ORG-LAB-GUT-001',
        methodName: '16S 肠道菌群检测',
        applicableSpecies: ['cat'],
        evidenceType: 'internal',
        evidenceRef: demoEvidence,
        status: 'active',
        version: 1,
        items: catItems,
        createdAt: '2025-01-15T10:00:00.000Z',
        updatedAt: '2025-01-15T10:00:00.000Z'
      },
      {
        id: 'rrs-dog-gut-001',
        name: '犬科肠道菌群检测',
        templateId: 'ORG-LAB-GUT-001',
        methodName: '16S 肠道菌群检测',
        applicableSpecies: ['dog'],
        evidenceType: 'internal',
        evidenceRef: demoEvidence,
        status: 'active',
        version: 1,
        items: dogItems,
        createdAt: '2025-01-15T11:00:00.000Z',
        updatedAt: '2025-01-15T11:00:00.000Z'
      }
    ];
  }

  function flattenSchemesToPlatformRanges(schemes) {
    var out = [];
    (schemes || []).forEach(function (scheme) {
      if (!scheme || scheme.status === 'disabled') return;
      var speciesList = scheme.applicableSpecies || [];
      (scheme.items || []).forEach(function (item) {
        if (item.minValue == null || item.maxValue == null || !item.unit) return;
        speciesList.forEach(function (species) {
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
    if (!scheme || !scheme.evidenceRef || !String(scheme.evidenceRef).trim()) return false;
    return (scheme.items || []).some(function (item) {
      return item.minValue != null && item.maxValue != null && item.unit &&
        item.minValue < item.maxValue;
    });
  }

  function defaultStandardUnits() {
    return [
      { id: 'su-001', templateId: 'ORG-LAB-GUT-001', fromUnit: '‰', toUnit: '%', factor: 0.1, note: '已知模板明确换算：千分比转百分比' }
    ];
  }

  function defaultCatalog() {
    var schemes = defaultReferenceRangeSchemes();
    return {
      breeds: defaultBreeds(),
      testIndicators: defaultTestIndicators(),
      microbiotaTaxa: defaultMicrobiotaTaxa(),
      microbiotaPresentation: defaultMicrobiotaPresentation(),
      referenceRangeSchemes: schemes,
      platformReferenceRanges: flattenSchemesToPlatformRanges(schemes),
      standardUnits: defaultStandardUnits(),
      meta: { version: 9, initializedAt: nowIso() }
    };
  }

  function extraReport001V2Indicators() {
    var ts = '2025-08-24T15:00:00.000Z';
    function row(id, key, value, unit) {
      return {
        id: id,
        testRecordId: 'tr-004',
        reportId: 'report-001',
        key: key,
        value: value,
        unit: unit,
        dataStatus: 'PRESENT',
        version: 2,
        isCurrent: true,
        correctedFrom: null,
        createdAt: ts
      };
    }
    return [
      row('ind-011-v2', 'alpha-diversity', 86.1, ''),
      row('ind-012-v2', 'evenness', 65.2, ''),
      row('ind-013-v2', 'richness', 70.1, ''),
      row('ind-014-v2', '厚壁菌门', 32.1, '%'),
      row('ind-015-v2', '梭杆菌门', 6.4, '%'),
      row('ind-016-v2', '变形菌门', 7.8, '%'),
      row('ind-017-v2', '双歧杆菌', 9.6, '%'),
      row('ind-018-v2', 'Collinsella', 9.6, '%'),
      row('ind-019-v2', 'Bacteroides', 20, '%'),
      row('ind-020-v2', 'Phocaeicola', 8, '%'),
      row('ind-021-v2', 'Peptacetobacter', 16, '%'),
      row('ind-022-v2', 'Lachnoclostridium', 5, '%'),
      row('ind-023-v2', '乳酸菌', 12, '%')
    ];
  }

  function extraReport001V2Findings() {
    return [
      {
        id: 'finding-006',
        reportId: 'report-001',
        reportVersion: 2,
        indicatorKey: 'Collinsella',
        conclusion: 'HIGH',
        dataStatus: 'PRESENT',
        description: ' Collinsella 高于参考范围（9.6% vs 3–8%）',
        professional: ' Collinsella 属占比 9.6%，高于猫科平台参考范围 3–8%。',
        consumer: '该菌属含量偏高。',
        riskLevel: 'medium',
        createdAt: '2025-08-24T15:30:00.000Z'
      },
      {
        id: 'finding-007',
        reportId: 'report-001',
        reportVersion: 2,
        indicatorKey: 'Peptacetobacter',
        conclusion: 'HIGH',
        dataStatus: 'PRESENT',
        description: ' Peptacetobacter 高于参考范围（16% vs 3–8%）',
        professional: ' Peptacetobacter 属占比 16%，高于猫科平台参考范围 3–8%。',
        consumer: '该菌属含量偏高。',
        riskLevel: 'medium',
        createdAt: '2025-08-24T15:30:00.000Z'
      }
    ];
  }

  function catalogItemKey(item) {
    return item && item.key != null ? String(item.key) : '';
  }

  function catalogParentGroupKey(item) {
    if (!item || item.parentKey == null || item.parentKey === '') return '';
    return String(item.parentKey);
  }

  function parseCatalogSortOrder(val) {
    var n = typeof val === 'number' ? val : parseInt(String(val == null ? '' : val).trim(), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function backfillMissingCatalogSortOrders(list) {
    if (!list || !list.length) return;
    var groupOrder = [];
    var groupMap = {};
    list.forEach(function (item, index) {
      var gk = catalogParentGroupKey(item);
      if (!groupMap[gk]) {
        groupMap[gk] = [];
        groupOrder.push(gk);
      }
      groupMap[gk].push({ item: item, index: index });
    });
    groupOrder.forEach(function (gk) {
      var siblings = groupMap[gk];
      var used = {};
      siblings.forEach(function (entry) {
        var so = parseCatalogSortOrder(entry.item.sortOrder);
        if (so != null) used[so] = true;
      });
      var next = 10;
      siblings.forEach(function (entry) {
        if (parseCatalogSortOrder(entry.item.sortOrder) != null) return;
        while (used[next]) next += 10;
        entry.item.sortOrder = next;
        used[next] = true;
        next += 10;
      });
    });
  }

  function compareCatalogItemsBySortOrder(a, b) {
    var aSo = parseCatalogSortOrder(a.sortOrder);
    var bSo = parseCatalogSortOrder(b.sortOrder);
    if (aSo == null && bSo == null) return String(a.key).localeCompare(String(b.key));
    if (aSo == null) return 1;
    if (bSo == null) return -1;
    if (aSo !== bSo) return aSo - bSo;
    return String(a.key).localeCompare(String(b.key));
  }

  function reorderCatalogCollectionBySortOrder(items) {
    if (!items || !items.length) return items || [];
    var itemMap = {};
    items.forEach(function (item) {
      itemMap[item.key] = Object.assign({}, item, { children: [] });
    });
    var roots = [];
    items.forEach(function (item) {
      var node = itemMap[item.key];
      if (item.parentKey && itemMap[item.parentKey]) {
        itemMap[item.parentKey].children.push(node);
      } else {
        roots.push(node);
      }
    });
    function flatten(nodes, flat) {
      flat = flat || [];
      nodes.sort(compareCatalogItemsBySortOrder);
      nodes.forEach(function (node) {
        var copy = Object.assign({}, node);
        delete copy.children;
        flat.push(copy);
        if (node.children && node.children.length) flatten(node.children, flat);
      });
      return flat;
    }
    return flatten(roots);
  }

  function validateCatalogSiblingSortOrders(list) {
    if (!list || !list.length) return [];
    var groups = {};
    var errors = [];
    list.forEach(function (item) {
      var gk = catalogParentGroupKey(item);
      if (!groups[gk]) groups[gk] = [];
      groups[gk].push(item);
    });
    Object.keys(groups).forEach(function (gk) {
      var seen = {};
      groups[gk].forEach(function (item) {
        var so = parseCatalogSortOrder(item.sortOrder);
        if (so == null) {
          errors.push('序号须为正整数：' + (item.key || item.id));
          return;
        }
        if (seen[so]) {
          errors.push('同级序号重复：' + so);
          return;
        }
        seen[so] = true;
      });
    });
    return errors;
  }

  function platformRangeMergeKey(range) {
    return [
      range.species || '',
      range.targetType || '',
      range.targetKey || '',
      range.taxonomyLevel || ''
    ].join('\0');
  }

  function mergeMissingByKey(list, defaults) {
    if (!list) return;
    var seen = {};
    list.forEach(function (item) {
      var key = catalogItemKey(item);
      if (key) seen[key] = true;
    });
    defaults.forEach(function (item) {
      var key = catalogItemKey(item);
      if (!key || seen[key]) return;
      list.push(clone(item));
      seen[key] = true;
    });
  }

  function mergeMissingPlatformRanges(list, defaults) {
    if (!list) return;
    var byId = {};
    var byTarget = {};
    list.forEach(function (range) {
      if (range.id) byId[range.id] = true;
      byTarget[platformRangeMergeKey(range)] = true;
    });
    defaults.forEach(function (range) {
      var targetKey = platformRangeMergeKey(range);
      if (range.id && byId[range.id]) return;
      if (byTarget[targetKey]) return;
      if (range.targetKey && list.some(function (existing) {
        return existing.targetKey === range.targetKey && existing.species === range.species;
      })) return;
      list.push(clone(range));
      if (range.id) byId[range.id] = true;
      byTarget[targetKey] = true;
    });
  }

  function mergeMissingIndicators(list, extras) {
    if (!list) return;
    extras.forEach(function (item) {
      var exists = list.some(function (ind) {
        return ind.id === item.id || (
          ind.reportId === item.reportId &&
          ind.key === item.key &&
          ind.version === item.version
        );
      });
      if (!exists) list.push(clone(item));
    });
  }

  function mergeMissingFindings(list, extras) {
    if (!list) return;
    extras.forEach(function (item) {
      var exists = list.some(function (finding) {
        return finding.id === item.id;
      });
      if (!exists) list.push(clone(item));
    });
  }

  function rebuildPublishedSnapshotsForReport(state, reportId) {
    var report = (state.reports || []).find(function (row) { return row.id === reportId; });
    if (!report) return;
    (report.versions || []).forEach(function (ver) {
      if (ver.status === 'published' || ver.status === 'corrected') {
        ver.contentSnapshot = buildContentSnapshot(state, report, ver.version, ' 迁移回填');
      }
    });
  }

  function migrateCatalogAndReport001V4(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (catalog) {
      if (!catalog.microbiotaTaxa) catalog.microbiotaTaxa = [];
      if (!catalog.platformReferenceRanges) catalog.platformReferenceRanges = [];
      mergeMissingByKey(catalog.microbiotaTaxa, defaultMicrobiotaTaxa());
      mergeMissingPlatformRanges(catalog.platformReferenceRanges, defaultPlatformRanges());
    }
    if (!state.indicators) state.indicators = [];
    if (!state.findings) state.findings = [];
    mergeMissingIndicators(state.indicators, extraReport001V2Indicators());
    mergeMissingFindings(state.findings, extraReport001V2Findings());
    rebuildPublishedSnapshotsForReport(state, 'report-001');
  }

  function taxonEduForLevel(taxon, eduPatch) {
    var src = eduPatch || (taxon && taxon.edu) || {};
    return normalizeTaxonEdu(src);
  }

  function migrateTaxonEduV7(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (!catalog || !Array.isArray(catalog.microbiotaTaxa)) return;
    catalog.microbiotaTaxa.forEach(function (taxon) {
      taxon.edu = normalizeTaxonEdu(taxon.edu);
    });
    catalog.meta = catalog.meta || {};
    catalog.meta.version = Math.max(catalog.meta.version || 0, 7);
  }

  function migrateTaxonEduV11(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (!catalog || !Array.isArray(catalog.microbiotaTaxa)) return;
    var seedByKey = {};
    defaultMicrobiotaTaxa().forEach(function (item) {
      seedByKey[item.key] = item;
    });
    catalog.microbiotaTaxa.forEach(function (taxon) {
      var edu = normalizeTaxonEdu(taxon.edu);
      if (taxon.level === 'phylum' && !edu.introText && edu.knowledgeText) {
        edu.introText = edu.knowledgeText;
      }
      if (taxon.level !== 'phylum' && !edu.functionText && edu.knowledgeText) {
        edu.functionText = edu.knowledgeText;
      }
      var seed = seedByKey[taxon.key];
      if (seed && seed.edu) {
        var seedEdu = normalizeTaxonEdu(seed.edu);
        Object.keys(seedEdu).forEach(function (key) {
          if (key === 'mainTasks') {
            if ((!edu.mainTasks || !edu.mainTasks.length) && seedEdu.mainTasks && seedEdu.mainTasks.length) {
              edu.mainTasks = seedEdu.mainTasks.slice();
            }
          } else if (isEmptyEduField(key, edu[key]) && !isEmptyEduField(key, seedEdu[key])) {
            edu[key] = seedEdu[key];
          }
        });
      }
      taxon.edu = edu;
    });
    catalog.meta = catalog.meta || {};
    catalog.meta.version = Math.max(catalog.meta.version || 0, 11);
  }

  function migrateCatalogSortOrderV13(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (!catalog) return;
    if (catalog.breeds) backfillMissingCatalogSortOrders(catalog.breeds);
    if (catalog.testIndicators) backfillMissingCatalogSortOrders(catalog.testIndicators);
    if (catalog.microbiotaTaxa) backfillMissingCatalogSortOrders(catalog.microbiotaTaxa);
    if (catalog.breeds) catalog.breeds = reorderCatalogCollectionBySortOrder(catalog.breeds);
    if (catalog.testIndicators) catalog.testIndicators = reorderCatalogCollectionBySortOrder(catalog.testIndicators);
    if (catalog.microbiotaTaxa) catalog.microbiotaTaxa = reorderCatalogCollectionBySortOrder(catalog.microbiotaTaxa);
    catalog.meta = catalog.meta || {};
    catalog.meta.version = Math.max(catalog.meta.version || 0, 13);
  }

  function migrateRecommendationManualRelatedV14(state) {
    (state.recommendations || []).forEach(function (rec) {
      if (!rec.relatedProductIds) {
        rec.relatedProductIds = [];
        (rec.candidateProductIds || []).forEach(function (id) {
          if (!id || rec.relatedProductIds.indexOf(id) >= 0) return;
          if (rec.relatedProductIds.length < 3) rec.relatedProductIds.push(id);
        });
      }
      if (!rec.candidateProductIds && rec.relatedProductIds.length) {
        rec.candidateProductIds = rec.relatedProductIds.slice();
      }
    });
  }

  function migrateTaxonEduV12(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (!catalog || !Array.isArray(catalog.microbiotaTaxa)) return;
    var staleHintsByKey = {
      '拟杆菌门': {
        normalHint: '数量适中时，说明饮食结构较均衡，营养分解能力稳定。',
        highHint: '若占比偏高，可能提示高脂高蛋白饮食偏多，需关注整体菌群平衡。'
      },
      'Bacteroides': {
        lowHint: '若该属偏少，可能提示蛋白/脂肪类食物分解能力不足。',
        normalHint: '数量适中时，说明复杂营养物质的分解与转化较稳定。',
        highHint: '若该属偏高，可能提示高脂高蛋白摄入偏多，需结合整体菌群观察。'
      }
    };
    catalog.microbiotaTaxa.forEach(function (taxon) {
      var stale = staleHintsByKey[taxon.key];
      var edu = normalizeTaxonEdu(taxon.edu);
      if (stale) {
        Object.keys(stale).forEach(function (field) {
          if (edu[field] === stale[field]) {
            edu[field] = '';
          }
        });
      }
      taxon.edu = edu;
    });
    catalog.meta = catalog.meta || {};
    catalog.meta.version = Math.max(catalog.meta.version || 0, 12);
  }

  function migrateMicrobiotaPresentationV9(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (!catalog) return;
    if (!catalog.microbiotaPresentation) {
      catalog.microbiotaPresentation = defaultMicrobiotaPresentation();
    } else {
      catalog.microbiotaPresentation = normalizeMicrobiotaPresentation(catalog.microbiotaPresentation, true);
    }
    catalog.meta = catalog.meta || {};
    catalog.meta.version = Math.max(catalog.meta.version || 0, 9);
  }

  function migrateReferenceRangeSchemesV8(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (!catalog) return;
    if (!catalog.referenceRangeSchemes || !catalog.referenceRangeSchemes.length) {
      var flat = catalog.platformReferenceRanges && catalog.platformReferenceRanges.length
        ? catalog.platformReferenceRanges
        : defaultPlatformRanges();
      var demoEvidence = '检测机构内部参考范围';
      var bySpecies = {};
      flat.forEach(function (range) {
        if (!range.species) return;
        if (!bySpecies[range.species]) bySpecies[range.species] = [];
        bySpecies[range.species].push(range);
      });
      catalog.referenceRangeSchemes = Object.keys(bySpecies).map(function (species) {
        return {
          id: 'rrs-migrated-' + species,
          name: (species === 'cat' ? '猫科' : species === 'dog' ? '犬科' : species) + '参考范围（迁移）',
          templateId: 'ORG-LAB-GUT-001',
          methodName: '16S 肠道菌群检测',
          applicableSpecies: [species],
          evidenceType: 'internal',
          evidenceRef: demoEvidence,
          status: 'active',
          version: 1,
          items: schemeItemsFromPlatformRanges(bySpecies[species]),
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
      });
      if (!catalog.referenceRangeSchemes.length) {
        catalog.referenceRangeSchemes = defaultReferenceRangeSchemes();
      }
    }
    syncPlatformReferenceRangesFromSchemes(catalog);
  }

  function migrateDemoIndicatorTemplateIds(state) {
    (state.indicators || []).forEach(function (ind) {
      if (!ind.sourceTemplateId && ind.key) {
        ind.sourceTemplateId = 'ORG-LAB-GUT-001';
      }
    });
  }

  function migrateTaxonEduV6(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (!catalog || !Array.isArray(catalog.microbiotaTaxa)) return;
    catalog.microbiotaTaxa.forEach(function (taxon) {
      taxon.edu = taxonEduForLevel(taxon);
    });
  }

  function migrateTaxonEduV5(state) {
    ensureDomainState(state);
    var catalog = state.professionalCatalog;
    if (!catalog || !Array.isArray(catalog.microbiotaTaxa)) return;
    var seedByKey = {};
    defaultMicrobiotaTaxa().forEach(function (item) {
      seedByKey[item.key] = item;
    });
    catalog.microbiotaTaxa.forEach(function (taxon) {
      var seed = seedByKey[taxon.key];
      if (seed && !taxon.latinName && seed.latinName) taxon.latinName = seed.latinName;
      if (!taxon.edu) {
        taxon.edu = seed && seed.edu ? normalizeTaxonEdu(clone(seed.edu)) : emptyTaxonEdu();
        return;
      }
      taxon.edu = normalizeTaxonEdu(taxon.edu);
      if (!seed || !seed.edu) return;
      var seedEdu = normalizeTaxonEdu(seed.edu);
      Object.keys(seedEdu).forEach(function (key) {
        if (isEmptyEduField(key, taxon.edu[key]) && !isEmptyEduField(key, seedEdu[key])) {
          taxon.edu[key] = key === 'mainTasks' ? seedEdu[key].slice() : seedEdu[key];
        }
      });
    });
  }

  var DEMO_ANALYSIS_RULE_SEEDS = [
    {
      id: 'rule-001',
      name: '放线菌门偏低',
      species: '猫,狗',
      indicatorKey: '放线菌门',
      dataStatus: 'PRESENT',
      riskLevel: 'medium',
      priority: 10,
      module: 'gut_balance',
      professional: '放线菌门占比低于参考范围，可能影响肠道屏障与免疫调节。',
      consumer: '肠道有益菌偏少，建议关注日常饮食与益生菌补充。',
      suppressProduct: false,
      isActive: true
    },
    {
      id: 'rule-002',
      name: '厚壁菌门未检出',
      species: '猫,狗',
      indicatorKey: '厚壁菌门',
      dataStatus: 'NOT_DETECTED',
      riskLevel: 'high',
      priority: 20,
      module: 'alert_banner',
      professional: '厚壁菌门未检出（NOT_DETECTED），不可等同于偏低结论。',
      consumer: '该项未检出，需结合复检与其他指标综合判断。',
      suppressProduct: true,
      isActive: true
    },
    {
      id: 'rule-003',
      name: '有害菌比例无效',
      species: '猫,狗',
      indicatorKey: '有害菌比例',
      dataStatus: 'INVALID',
      riskLevel: 'high',
      priority: 30,
      module: 'data_quality',
      professional: '指标值为无效数据（INVALID），禁止触发商品推荐。',
      consumer: '实验室数据异常，请联系机构复核。',
      suppressProduct: true,
      isActive: true
    }
  ];

  function buildDefaultAnalysisRuleCatalog() {
    var now = nowIso();
    return DEMO_ANALYSIS_RULE_SEEDS.map(function (dr, idx) {
      var lineageId = 'lineage-' + (dr.id || ('seed-' + idx));
      var conditions = [];
      if (dr.dataStatus && dr.dataStatus !== 'PRESENT') {
        conditions.push({
          id: uid('cond'),
          type: 'DATA_STATUS',
          indicatorKey: dr.indicatorKey,
          dataStatus: dr.dataStatus
        });
      } else {
        conditions.push({
          id: uid('cond'),
          type: 'NUMERIC_COMPARE',
          indicatorKey: dr.indicatorKey,
          operator: '<',
          value: 20,
          unit: '%'
        });
      }
      if (dr.species) {
        conditions.push({
          id: uid('cond'),
          type: 'SPECIES',
          species: dr.species
        });
      }
      var isIntegrity = dr.dataStatus === 'INVALID' || dr.dataStatus === 'MISSING_COLUMN' ||
        dr.dataStatus === 'EMPTY' || dr.dataStatus === 'NOT_APPLICABLE';
      return {
        id: uid('rule'),
        lineageId: lineageId,
        version: 1,
        status: dr.isActive === false ? 'inactive' : 'active',
        name: dr.name,
        description: ' ' + (dr.indicatorKey || '') + ' · ' + (dr.dataStatus || 'PRESENT'),
        conditionLogic: 'ALL',
        conditions: conditions,
        riskLevel: dr.riskLevel || 'medium',
        priority: dr.priority || (idx + 1) * 10,
        conflictGroup: dr.module || 'general',
        output: {
          professional: dr.professional || '',
          consumer: dr.consumer || '',
          healthAdvice: isIntegrity ? '' : (dr.consumer || ''),
          outputMode: 'both',
          isDataIntegrityOnly: isIntegrity || !!dr.suppressProduct
        },
        createdAt: now,
        updatedAt: now
      };
    });
  }

  function ensureDomainState(state) {
    if (!state.professionalCatalog) state.professionalCatalog = defaultCatalog();
    if (!state.analysisRuleCatalog || !state.analysisRuleCatalog.length) {
      state.analysisRuleCatalog = buildDefaultAnalysisRuleCatalog();
    }
    if (!state.analysisRuns) state.analysisRuns = [];
    if (!state.reportAnalysisAdjustments) state.reportAnalysisAdjustments = {};
  }

  function normalizeActorOptions(options) {
    if (typeof options === 'string') return { actor: options };
    return options || {};
  }

  function migrateState(state) {
    if (!state) return state;

    ['indicators', 'findings'].forEach(function (collection) {
      if (!state[collection]) return;
      state[collection].forEach(function (item) {
        if (item.dataStatus) item.dataStatus = normalizeDataStatus(item.dataStatus);
      });
    });

    if (!state.healthTags) state.healthTags = [];
    if (!state.healthTagProducts) state.healthTagProducts = [];
    if (!state.ownershipCorrections) state.ownershipCorrections = [];
    if (!state.petUserAssociationChanges) state.petUserAssociationChanges = [];
    if (!state.operationRecords) state.operationRecords = [];

    (state.products || []).forEach(function (product) {
      if (product.stock == null) product.stock = product.available === false ? 0 : 10;
    });

    (state.testRecords || []).forEach(function (tr) {
      if (!tr.sourceOrgId) tr.sourceOrgId = DEFAULT_SOURCE_ORG_ID;
      if (!tr.sampleNumber && tr.label) tr.sampleNumber = tr.label;
    });

    (state.reports || []).forEach(function (report) {
      syncReportVersionFields(report);
      if (!report.workflowStatus) {
        var tr = (state.testRecords || []).find(function (t) { return t.id === report.testRecordId; });
        report.workflowStatus = deriveWorkflowStatus(report, tr);
      }
      if (!report.todoFlags) report.todoFlags = deriveTodoFlags(report, findTestRecord(state, report.testRecordId));
      if (!report.ownershipStatus) {
        report.ownershipStatus = report.userId ? 'bound' : (report.petId ? 'pending_claim' : 'unassigned');
      }
      if (report.publishedVersion == null) {
        report.publishedVersion = (report.status === 'published' || report.status === 'corrected') ? report.currentVersion : null;
      }
      if (report.workingVersion == null) report.workingVersion = report.currentVersion;
    });

    (state.recommendations || []).forEach(function (rec) {
      if (!rec.healthTagIds) rec.healthTagIds = rec.healthTagId ? [rec.healthTagId] : [];
      if (!rec.primaryProductId && rec.productId) rec.primaryProductId = rec.productId;
    });

    ensureDomainState(state);

    if (!state.meta) state.meta = {};
    if (!state.meta.version || state.meta.version < 4) {
      migrateCatalogAndReport001V4(state);
    }
    if (!state.meta.version || state.meta.version < 5) {
      migrateTaxonEduV5(state);
    }
    if (!state.meta.version || state.meta.version < 6) {
      migrateTaxonEduV6(state);
    }
    if (!state.meta.version || state.meta.version < 7) {
      migrateTaxonEduV7(state);
    }
    if (!state.meta.version || state.meta.version < 8) {
      migrateReferenceRangeSchemesV8(state);
      migrateDemoIndicatorTemplateIds(state);
    }
    if (!state.meta.version || state.meta.version < 9) {
      migrateMicrobiotaPresentationV9(state);
    }
    if (!state.meta.version || state.meta.version < 10) {
      migratePresentationCopyV10(state);
    }
    if (!state.meta.version || state.meta.version < 11) {
      migrateTaxonEduV11(state);
    }
    if (!state.meta.version || state.meta.version < 12) {
      migrateTaxonEduV12(state);
    }
    if (!state.meta.version || state.meta.version < 13) {
      migrateCatalogSortOrderV13(state);
    }
    if (!state.meta.version || state.meta.version < 14) {
      migrateRecommendationManualRelatedV14(state);
    }

    (state.reports || []).forEach(function (report) {
      syncReportVersionFields(report);
      (report.versions || []).forEach(function (ver) {
        if ((ver.status === 'published' || ver.status === 'corrected') && !ver.contentSnapshot) {
          ver.contentSnapshot = buildContentSnapshot(state, report, ver.version, ' 迁移回填');
        }
      });
    });

    if (state.meta) {
      state.meta.dataStatuses = DATA_STATUSES.slice();
      state.meta.reportStatuses = REPORT_STATUSES.slice();
      state.meta.workflowStatuses = WORKFLOW_STATUSES.slice();
      state.meta.recommendTypes = RECOMMEND_TYPES.slice();
      if (!state.meta.version || state.meta.version < 3) state.meta.version = 3;
      if (state.meta.version < 4) state.meta.version = 4;
      if (state.meta.version < 5) state.meta.version = 5;
      if (state.meta.version < 6) state.meta.version = 6;
      if (state.meta.version < 7) state.meta.version = 7;
      if (state.meta.version < 8) state.meta.version = 8;
      if (state.meta.version < 9) state.meta.version = 9;
      if (state.meta.version < 10) state.meta.version = 10;
      if (state.meta.version < 11) state.meta.version = 11;
      if (state.meta.version < 12) state.meta.version = 12;
      if (state.meta.version < 13) state.meta.version = 13;
      if (state.meta.version < 14) state.meta.version = 14;
      if (state.professionalCatalog && state.professionalCatalog.meta) {
        if (state.professionalCatalog.meta.version < 7) state.professionalCatalog.meta.version = 7;
        if (state.professionalCatalog.meta.version < 9) state.professionalCatalog.meta.version = 9;
        if (state.professionalCatalog.meta.version < 11) state.professionalCatalog.meta.version = 11;
        if (state.professionalCatalog.meta.version < 12) state.professionalCatalog.meta.version = 12;
        if (state.professionalCatalog.meta.version < 13) state.professionalCatalog.meta.version = 13;
      }
    }

    return state;
  }

  function syncReportVersionFields(report) {
    if (!report) return;
    if (report.workingVersion == null) report.workingVersion = report.currentVersion || 1;
    if (report.publishedVersion == null && (report.status === 'published' || report.status === 'corrected')) {
      report.publishedVersion = report.currentVersion || 1;
    }
    if (report.correctionDraftActive == null) {
      report.correctionDraftActive = report.workingVersion > (report.publishedVersion || 0) &&
        report.versions && report.versions.some(function (v) {
          return v.version === report.workingVersion && v.status === 'draft';
        });
    }
  }

  function deriveWorkflowStatus(report, testRecord) {
    if (!report && !testRecord) return 'incomplete';
    if (report) {
      if (report.workflowStatus) return report.workflowStatus;
      if (report.status === 'voided') return 'voided';
      if (report.status === 'published' || report.status === 'corrected') return 'published';
      if (report.status === 'pending_review' || report.status === 'approved') return 'pending_review';
      if (report.status === 'draft' || report.status === 'rejected') return 'incomplete';
    }
    if (isUnassignedOwnership(report, testRecord)) {
      if (testRecord && testRecord.status === 'import_failed') return 'incomplete';
      return 'unassigned';
    }
    if (testRecord) {
      if (testRecord.status === 'import_failed') return 'incomplete';
      if (testRecord.status === 'pending_review') return 'pending_review';
      if (testRecord.status === 'published') return 'published';
    }
    return 'incomplete';
  }

  function isUnassignedOwnership(report, testRecord) {
    if (report && (report.petId || report.userId)) return false;
    if (testRecord && (testRecord.petId || testRecord.userId)) return false;
    if (testRecord && testRecord.claimStatus === 'bound') return false;
    return true;
  }

  function deriveTodoFlags(report, testRecord) {
    var flags = [];
    if (testRecord && testRecord.status === 'import_failed') flags.push('import_error');
    if (report && report.status === 'rejected') flags.push('rejected');
    if (isUnassignedOwnership(report, testRecord) && testRecord && testRecord.status !== 'pending_result') {
      flags.push('unassigned');
    }
    if (testRecord && testRecord.importBatchId) {
      var batch = null;
      // batch resolved lazily in getTodoFlags when state available
    }
    if (report && report.correctionDraftActive) flags.push('correction_draft');
    return flags;
  }

  // ─── Seed ───────────────────────────────────────────────────────────────

  function buildSeedState() {
    var ts = '2025-08-25T08:00:00.000Z';

    var users = [
      {
        id: 'user-001',
        name: ' 张女士',
        phone: '13812345678',
        address: ' 北京市朝阳区某某小区',
        createdAt: ts
      },
      {
        id: 'user-002',
        name: ' 李先生',
        phone: '13987654321',
        address: ' 上海市浦东新区某某路',
        createdAt: ts
      }
    ];

    var stores = [
      {
        id: 'store-001',
        name: ' 萌宠肠道健康中心（朝阳店）',
        code: 'STORE-BJ-CY-001',
        createdAt: ts
      },
      {
        id: 'store-002',
        name: ' 宠物医院肠道专科（浦东店）',
        code: 'STORE-SH-PD-002',
        createdAt: ts
      }
    ];

    var pets = [
      {
        id: 'pet-001',
        userId: 'user-001',
        name: ' 小花',
        breed: '英国短毛猫',
        age: 3.5,
        gender: 'female',
        species: 'cat',
        storeId: 'store-001',
        claimStatus: 'bound',
        createdAt: ts
      },
      {
        id: 'pet-002',
        userId: 'user-001',
        name: ' 阿黄',
        breed: '金毛寻回犬',
        age: 5,
        gender: 'male',
        species: 'dog',
        storeId: 'store-002',
        claimStatus: 'bound',
        createdAt: ts
      },
      {
        id: 'pet-003',
        userId: 'user-002',
        name: ' 咪咪',
        breed: '布偶猫',
        age: 2,
        gender: 'female',
        species: 'cat',
        storeId: null,
        claimStatus: 'bound',
        opsCreated: true,
        createdAt: ts
      },
      {
        id: 'pet-004',
        userId: null,
        name: ' 旺仔',
        breed: '柯基',
        age: 4,
        gender: 'male',
        species: 'dog',
        storeId: 'store-001',
        claimStatus: 'pending_claim',
        opsCreated: true,
        createdAt: ts
      },
      {
        id: 'pet-005',
        userId: null,
        name: ' 豆豆',
        breed: '中华田园猫',
        age: 1,
        gender: 'female',
        species: 'cat',
        storeId: 'store-001',
        claimStatus: 'pending_claim',
        opsCreated: true,
        createdAt: ts
      }
    ];

    var claimCodes = [
      {
        id: 'claim-001',
        code: 'CLAIM-PUBLISHED-2025',
        storeId: 'store-001',
        petId: 'pet-004',
        testRecordId: 'tr-006',
        status: 'pending',
        expiresAt: '2026-12-31T23:59:59.000Z',
        createdAt: ts
      },
      {
        id: 'claim-002',
        code: 'CLAIM-PROGRESS-2025',
        storeId: 'store-001',
        petId: 'pet-004',
        testRecordId: 'tr-007',
        status: 'pending',
        expiresAt: '2026-12-31T23:59:59.000Z',
        createdAt: ts
      },
      {
        id: 'claim-003',
        code: 'CLAIM-NEW-2025',
        storeId: 'store-001',
        petId: 'pet-005',
        testRecordId: 'tr-005',
        status: 'pending',
        expiresAt: '2026-12-31T23:59:59.000Z',
        createdAt: ts
      },
      {
        id: 'claim-004',
        code: 'CLAIM-VOIDED-DEMO',
        storeId: 'store-001',
        petId: 'pet-005',
        testRecordId: null,
        status: 'voided',
        voidedAt: '2025-08-24T12:00:00.000Z',
        voidReason: ' 运营手动作废重发',
        expiresAt: '2026-12-31T23:59:59.000Z',
        createdAt: ts
      }
    ];

    var categories = [
      {
        id: 'cat-001',
        name: ' 肠道健康',
        available: true,
        createdAt: ts
      },
      {
        id: 'cat-002',
        name: ' 益生菌调理',
        available: true,
        createdAt: ts
      },
      {
        id: 'cat-003',
        name: ' 已下架分类（兜底测试）',
        available: false,
        createdAt: ts
      }
    ];

    var healthTags = [
      {
        id: 'htag-001',
        name: ' 肠道菌群调理',
        species: 'cat,dog',
        enabled: true,
        createdAt: ts
      },
      {
        id: 'htag-002',
        name: ' 免疫支持',
        species: 'cat,dog',
        enabled: true,
        createdAt: ts
      },
      {
        id: 'htag-003',
        name: ' 无候选标签',
        species: 'cat,dog',
        enabled: true,
        createdAt: ts
      }
    ];

    var healthTagProducts = [
      { id: 'htp-001', healthTagId: 'htag-001', productId: 'prod-001', sortOrder: 1, species: 'cat,dog', enabled: true, createdAt: ts },
      { id: 'htp-002', healthTagId: 'htag-001', productId: 'prod-003', sortOrder: 2, species: 'cat,dog', enabled: true, createdAt: ts },
      { id: 'htp-003', healthTagId: 'htag-001', productId: 'prod-004', sortOrder: 3, species: 'cat,dog', enabled: true, createdAt: ts },
      { id: 'htp-004', healthTagId: 'htag-002', productId: 'prod-003', sortOrder: 1, species: 'cat,dog', enabled: true, createdAt: ts }
    ];

    var products = [
      {
        id: 'prod-001',
        spuId: 'prod-001',
        name: ' 益生菌套装 A',
        categoryId: 'cat-002',
        status: 'on_sale',
        available: true,
        stock: 25,
        price: 199,
        createdAt: ts
      },
      {
        id: 'prod-002',
        spuId: 'prod-002',
        name: ' 肠道调理粉（已下架）',
        categoryId: 'cat-001',
        status: 'off_shelf',
        available: false,
        stock: 0,
        price: 159,
        createdAt: ts
      },
      {
        id: 'prod-003',
        spuId: 'prod-003',
        name: ' 膳食纤维补充剂',
        categoryId: 'cat-001',
        status: 'on_sale',
        available: true,
        stock: 15,
        price: 89,
        createdAt: ts
      },
      {
        id: 'prod-004',
        spuId: 'prod-004',
        name: ' 益生菌套装 B（零库存）',
        categoryId: 'cat-002',
        status: 'zero_stock',
        available: true,
        stock: 0,
        price: 179,
        createdAt: ts
      },
      {
        id: 'prod-missing',
        spuId: 'prod-missing',
        name: ' 已回收商品（不存在）',
        categoryId: 'cat-001',
        status: 'recycled',
        deleted: true,
        available: false,
        stock: 0,
        price: 0,
        createdAt: ts
      }
    ];

    var importBatches = [
      {
        id: 'batch-001',
        fileName: ' 检测结果导入_成功.xlsx',
        status: 'success',
        totalRows: 12,
        successRows: 12,
        failedRows: 0,
        errors: [],
        testRecordIds: ['tr-004'],
        createdAt: '2025-08-20T10:00:00.000Z'
      },
      {
        id: 'batch-002',
        fileName: ' 检测结果导入_失败.xlsx',
        status: 'failed',
        totalRows: 8,
        successRows: 0,
        failedRows: 8,
        errors: [
          { row: 2, column: '放线菌门', code: 'MISSING_COLUMN', message: ' 缺少必需列「放线菌门」' },
          { row: 5, column: '双歧杆菌', code: 'EMPTY', message: ' 指标值为空' }
        ],
        testRecordIds: ['tr-002'],
        createdAt: '2025-08-21T11:30:00.000Z'
      },
      {
        id: 'batch-003',
        fileName: ' 检测结果导入_部分成功.xlsx',
        status: 'partial',
        totalRows: 5,
        successRows: 3,
        failedRows: 2,
        errors: [
          { row: 4, column: '厚壁菌门', code: 'NOT_DETECTED', message: ' 未检出' }
        ],
        testRecordIds: ['tr-001'],
        createdAt: '2025-08-22T09:15:00.000Z'
      },
      {
        id: 'batch-004',
        fileName: ' 批量导入_重复阻断.xlsx',
        status: 'duplicate',
        totalRows: 1,
        successRows: 0,
        failedRows: 1,
        errors: [
          { row: 1, column: '外部报告编号', code: 'DUPLICATE', message: ' 同机构 EXT-2025-001 已存在' }
        ],
        testRecordIds: [],
        createdAt: '2025-08-19T09:00:00.000Z'
      }
    ];

    var testRecords = [
      {
        id: 'tr-001',
        petId: 'pet-001',
        userId: 'user-001',
        storeId: 'store-001',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-PARTIAL-001',
        sampleNumber: 'SAMPLE-PARTIAL-001',
        sampleType: 'feces',
        testDate: '2025-08-22',
        status: 'pending_result',
        importBatchId: 'batch-003',
        claimStatus: 'bound',
        label: ' 待结果',
        createdAt: '2025-08-22T09:15:00.000Z',
        updatedAt: '2025-08-22T09:15:00.000Z'
      },
      {
        id: 'tr-002',
        petId: 'pet-002',
        userId: 'user-001',
        storeId: 'store-002',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-FAIL-002',
        sampleNumber: 'SAMPLE-FAIL-002',
        sampleType: 'feces',
        testDate: '2025-08-21',
        status: 'import_failed',
        importBatchId: 'batch-002',
        claimStatus: 'bound',
        label: ' 导入失败',
        createdAt: '2025-08-21T11:30:00.000Z',
        updatedAt: '2025-08-21T11:30:00.000Z'
      },
      {
        id: 'tr-003',
        petId: 'pet-003',
        userId: 'user-002',
        storeId: null,
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-REVIEW-003',
        sampleNumber: 'SAMPLE-REVIEW-003',
        sampleType: 'feces',
        testDate: '2025-08-23',
        status: 'pending_review',
        importBatchId: null,
        claimStatus: 'bound',
        label: ' 待审核',
        createdAt: '2025-08-23T14:00:00.000Z',
        updatedAt: '2025-08-23T14:00:00.000Z'
      },
      {
        id: 'tr-004',
        petId: 'pet-001',
        userId: 'user-001',
        storeId: 'store-001',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-001',
        sampleNumber: 'SAMPLE-BJ-001',
        sampleType: 'feces',
        testDate: '2025-08-20',
        status: 'published',
        importBatchId: 'batch-001',
        claimStatus: 'bound',
        label: ' 已发布',
        createdAt: '2025-08-20T10:00:00.000Z',
        updatedAt: '2025-08-24T16:00:00.000Z'
      },
      {
        id: 'tr-005',
        petId: 'pet-005',
        userId: null,
        storeId: 'store-001',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-UNASSIGNED-005',
        sampleNumber: 'SAMPLE-UNASSIGNED-005',
        sampleType: 'feces',
        testDate: '2025-08-24',
        status: 'pending_claim',
        importBatchId: null,
        claimStatus: 'pending_claim',
        label: ' 待认领（新记录）',
        createdAt: '2025-08-24T08:00:00.000Z',
        updatedAt: '2025-08-24T08:00:00.000Z'
      },
      {
        id: 'tr-006',
        petId: 'pet-004',
        userId: null,
        storeId: 'store-001',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-PUB-UNCLAIMED-006',
        sampleNumber: 'SAMPLE-PUB-UNCLAIMED-006',
        sampleType: 'feces',
        testDate: '2025-08-18',
        status: 'published',
        importBatchId: 'batch-001',
        claimStatus: 'pending_claim',
        label: ' 已发布待认领',
        createdAt: '2025-08-18T09:00:00.000Z',
        updatedAt: '2025-08-19T16:00:00.000Z'
      },
      {
        id: 'tr-007',
        petId: 'pet-004',
        userId: null,
        storeId: 'store-001',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-REVIEW-UNCLAIMED-007',
        sampleNumber: 'SAMPLE-REVIEW-UNCLAIMED-007',
        sampleType: 'feces',
        testDate: '2025-08-23',
        status: 'pending_review',
        importBatchId: null,
        claimStatus: 'pending_claim',
        label: ' 审核中待认领',
        createdAt: '2025-08-23T10:00:00.000Z',
        updatedAt: '2025-08-23T14:00:00.000Z'
      },
      {
        id: 'tr-008',
        petId: 'pet-002',
        userId: 'user-001',
        storeId: 'store-002',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-VOID-008',
        sampleNumber: 'SAMPLE-VOID-008',
        sampleType: 'feces',
        testDate: '2025-08-10',
        status: 'voided',
        importBatchId: 'batch-001',
        claimStatus: 'bound',
        label: ' 已作废',
        createdAt: '2025-08-10T09:00:00.000Z',
        updatedAt: '2025-08-12T10:00:00.000Z'
      },
      {
        id: 'tr-009',
        petId: null,
        userId: null,
        storeId: 'store-001',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: 'EXT-2025-NEW-UNASSIGNED-009',
        sampleNumber: 'SAMPLE-NEW-UNASSIGNED-009',
        sampleType: 'feces',
        testDate: '2025-08-25',
        status: 'unassigned',
        importBatchId: 'batch-001',
        claimStatus: 'unassigned',
        label: ' 批量导入成功待归属',
        createdAt: '2025-08-25T09:00:00.000Z',
        updatedAt: '2025-08-25T09:00:00.000Z'
      }
    ];

    var indicators = [
      {
        id: 'ind-001-v1',
        testRecordId: 'tr-004',
        reportId: 'report-001',
        key: '放线菌门',
        value: 12.3,
        unit: '%',
        dataStatus: 'PRESENT',
        version: 1,
        isCurrent: false,
        correctedFrom: null,
        createdAt: '2025-08-20T10:30:00.000Z'
      },
      {
        id: 'ind-001-v2',
        testRecordId: 'tr-004',
        reportId: 'report-001',
        key: '放线菌门',
        value: 18.5,
        unit: '%',
        dataStatus: 'PRESENT',
        version: 2,
        isCurrent: true,
        correctedFrom: 'ind-001-v1',
        createdAt: '2025-08-24T15:00:00.000Z'
      },
      {
        id: 'ind-002-v1',
        testRecordId: 'tr-004',
        reportId: 'report-001',
        key: '拟杆菌门',
        value: 35.2,
        unit: '%',
        dataStatus: 'PRESENT',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-20T10:30:00.000Z'
      }
    ].concat(extraReport001V2Indicators(), [
      {
        id: 'ind-003-v1',
        testRecordId: 'tr-003',
        reportId: 'report-002',
        key: '厚壁菌门',
        value: null,
        unit: '%',
        dataStatus: 'NOT_DETECTED',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-23T14:30:00.000Z'
      },
      {
        id: 'ind-004-v1',
        testRecordId: 'tr-002',
        reportId: 'report-003',
        key: '双歧杆菌',
        value: null,
        unit: '%',
        dataStatus: 'MISSING_COLUMN',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-21T12:00:00.000Z'
      },
      {
        id: 'ind-005-v1',
        testRecordId: 'tr-003',
        reportId: 'report-002',
        key: '放线菌门',
        value: 8.1,
        unit: '%',
        dataStatus: 'PRESENT',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-23T14:30:00.000Z'
      },
      {
        id: 'ind-006-v1',
        testRecordId: 'tr-001',
        reportId: null,
        key: 'Shannon指数',
        value: null,
        unit: '',
        dataStatus: 'EMPTY',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-22T09:20:00.000Z'
      },
      {
        id: 'ind-007-v1',
        testRecordId: 'tr-003',
        reportId: 'report-002',
        key: '炎症指标',
        value: null,
        unit: '',
        dataStatus: 'NOT_APPLICABLE',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-23T14:30:00.000Z'
      },
      {
        id: 'ind-008-v1',
        testRecordId: 'tr-002',
        reportId: 'report-003',
        key: '有害菌比例',
        value: -1,
        unit: '%',
        dataStatus: 'INVALID',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-21T12:00:00.000Z'
      },
      {
        id: 'ind-009-v1',
        testRecordId: 'tr-006',
        reportId: 'report-004',
        key: '放线菌门',
        value: 40.2,
        unit: '%',
        dataStatus: 'PRESENT',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-19T10:30:00.000Z'
      },
      {
        id: 'ind-010-v1',
        testRecordId: 'tr-007',
        reportId: 'report-005',
        key: '放线菌门',
        value: 15.0,
        unit: '%',
        dataStatus: 'PRESENT',
        version: 1,
        isCurrent: true,
        correctedFrom: null,
        createdAt: '2025-08-23T11:30:00.000Z'
      }
    ]);

    var reports = [
      {
        id: 'report-001',
        reportNumber: ' RPT-2025-001',
        externalReportNumber: 'EXT-2025-001',
        sampleNumber: 'SAMPLE-BJ-001',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        testRecordId: 'tr-004',
        userId: 'user-001',
        petId: 'pet-001',
        reportSpecies: 'cat',
        status: 'corrected',
        workflowStatus: 'published',
        ownershipStatus: 'bound',
        todoFlags: [],
        currentVersion: 2,
        workingVersion: 2,
        publishedVersion: 2,
        correctionDraftActive: false,
        versions: [
          {
            version: 1,
            status: 'published',
            healthLevel: 'A',
            healthScore: 92,
            summary: ' 肠道菌群整体良好。',
            createdAt: '2025-08-20T11:00:00.000Z',
            publishedAt: '2025-08-20T16:00:00.000Z'
          },
          {
            version: 2,
            status: 'corrected',
            healthLevel: 'B',
            healthScore: 85,
            percentile: 62,
            platformDimensions: { emotion: 75, immunity: 80 },
            summary: ' 放线菌门指标已更正，综合评级下调。',
            createdAt: '2025-08-24T15:30:00.000Z',
            publishedAt: '2025-08-24T16:00:00.000Z',
            correctionNote: ' 原始指标放线菌门由实验室复核后更正'
          }
        ],
        createdAt: '2025-08-20T11:00:00.000Z',
        updatedAt: '2025-08-24T16:00:00.000Z'
      },
      {
        id: 'report-002',
        reportNumber: ' RPT-2025-002',
        externalReportNumber: 'EXT-2025-REVIEW-003',
        sampleNumber: 'SAMPLE-REVIEW-003',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        testRecordId: 'tr-003',
        userId: 'user-002',
        petId: 'pet-003',
        status: 'pending_review',
        workflowStatus: 'pending_review',
        ownershipStatus: 'bound',
        todoFlags: ['partial_import'],
        currentVersion: 1,
        workingVersion: 1,
        publishedVersion: null,
        correctionDraftActive: false,
        versions: [
          {
            version: 1,
            status: 'pending_review',
            healthLevel: 'C',
            healthScore: 68,
            summary: ' 部分指标异常，待审核发布。',
            createdAt: '2025-08-23T15:00:00.000Z',
            publishedAt: null
          }
        ],
        createdAt: '2025-08-23T15:00:00.000Z',
        updatedAt: '2025-08-23T15:00:00.000Z'
      },
      {
        id: 'report-003',
        reportNumber: ' RPT-2025-003',
        externalReportNumber: 'EXT-2025-FAIL-002',
        sampleNumber: 'SAMPLE-FAIL-002',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        testRecordId: 'tr-002',
        userId: 'user-001',
        petId: 'pet-002',
        status: 'rejected',
        workflowStatus: 'incomplete',
        ownershipStatus: 'bound',
        todoFlags: ['import_error', 'rejected'],
        currentVersion: 1,
        workingVersion: 1,
        publishedVersion: null,
        correctionDraftActive: false,
        versions: [
          {
            version: 1,
            status: 'rejected',
            healthLevel: null,
            healthScore: null,
            summary: ' 导入数据不完整，报告驳回。',
            rejectReason: ' Excel 缺少必需列，无法生成有效报告',
            createdAt: '2025-08-21T13:00:00.000Z',
            publishedAt: null
          }
        ],
        createdAt: '2025-08-21T13:00:00.000Z',
        updatedAt: '2025-08-21T14:00:00.000Z'
      },
      {
        id: 'report-004',
        reportNumber: ' RPT-2025-004',
        externalReportNumber: 'EXT-2025-PUB-UNCLAIMED-006',
        sampleNumber: 'SAMPLE-PUB-UNCLAIMED-006',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        testRecordId: 'tr-006',
        userId: null,
        petId: 'pet-004',
        reportSpecies: 'dog',
        status: 'published',
        workflowStatus: 'published',
        ownershipStatus: 'pending_claim',
        todoFlags: [],
        currentVersion: 1,
        workingVersion: 1,
        publishedVersion: 1,
        correctionDraftActive: false,
        versions: [
          {
            version: 1,
            status: 'published',
            healthLevel: 'A',
            healthScore: 90,
            summary: ' 肠道菌群整体良好，认领后可查看完整报告。',
            createdAt: '2025-08-19T11:00:00.000Z',
            publishedAt: '2025-08-19T16:00:00.000Z'
          }
        ],
        createdAt: '2025-08-19T11:00:00.000Z',
        updatedAt: '2025-08-19T16:00:00.000Z'
      },
      {
        id: 'report-005',
        reportNumber: ' RPT-2025-005',
        externalReportNumber: 'EXT-2025-REVIEW-UNCLAIMED-007',
        sampleNumber: 'SAMPLE-REVIEW-UNCLAIMED-007',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        testRecordId: 'tr-007',
        userId: null,
        petId: 'pet-004',
        status: 'pending_review',
        workflowStatus: 'pending_review',
        ownershipStatus: 'pending_claim',
        todoFlags: [],
        currentVersion: 1,
        workingVersion: 1,
        publishedVersion: null,
        correctionDraftActive: false,
        versions: [
          {
            version: 1,
            status: 'pending_review',
            healthLevel: 'B',
            healthScore: 75,
            summary: ' 报告审核中，认领后可查看进度。',
            createdAt: '2025-08-23T12:00:00.000Z',
            publishedAt: null
          }
        ],
        createdAt: '2025-08-23T12:00:00.000Z',
        updatedAt: '2025-08-23T12:00:00.000Z'
      },
      {
        id: 'report-006',
        reportNumber: ' RPT-2025-006',
        externalReportNumber: 'EXT-2025-VOID-008',
        sampleNumber: 'SAMPLE-VOID-008',
        sourceOrgId: DEFAULT_SOURCE_ORG_ID,
        testRecordId: 'tr-008',
        userId: 'user-001',
        petId: 'pet-002',
        status: 'voided',
        workflowStatus: 'voided',
        ownershipStatus: 'bound',
        todoFlags: [],
        currentVersion: 1,
        workingVersion: 1,
        publishedVersion: 1,
        correctionDraftActive: false,
        voidedAt: '2025-08-12T10:00:00.000Z',
        voidReason: ' 客户要求作废重检',
        versions: [
          {
            version: 1,
            status: 'published',
            healthLevel: 'B',
            healthScore: 78,
            summary: ' 已发布后被作废。',
            createdAt: '2025-08-10T11:00:00.000Z',
            publishedAt: '2025-08-10T16:00:00.000Z'
          }
        ],
        createdAt: '2025-08-10T11:00:00.000Z',
        updatedAt: '2025-08-12T10:00:00.000Z'
      }
    ];

    var ownershipCorrections = [
      {
        id: 'owncorr-001',
        reportId: 'report-003',
        fromUserId: 'user-002',
        toUserId: 'user-001',
        fromPetId: 'pet-002',
        toPetId: 'pet-002',
        actor: ' 运营专员',
        reason: ' 线下核对后纠正错绑用户',
        createdAt: '2025-08-21T14:30:00.000Z'
      }
    ];

    var findings = [
      {
        id: 'finding-001',
        reportId: 'report-001',
        reportVersion: 2,
        indicatorKey: '放线菌门',
        conclusion: 'LOW',
        dataStatus: 'PRESENT',
        description: ' 放线菌门偏低，可能影响肠道屏障功能',
        professional: ' 放线菌门占比低于参考范围，可能影响肠道屏障与免疫调节。',
        consumer: ' 肠道有益菌偏少，建议关注日常饮食与益生菌补充。',
        riskLevel: 'medium',
        createdAt: '2025-08-24T15:30:00.000Z'
      }
    ].concat(extraReport001V2Findings(), [
      {
        id: 'finding-002',
        reportId: 'report-002',
        reportVersion: 1,
        indicatorKey: '厚壁菌门',
        conclusion: 'HIGH',
        dataStatus: 'NOT_DETECTED',
        description: ' 厚壁菌门未检出（数据状态 NOT_DETECTED ≠ 结论 LOW）',
        professional: ' 厚壁菌门未检出（NOT_DETECTED），不可等同于偏低结论。',
        consumer: ' 该项未检出，需结合复检与其他指标综合判断。',
        riskLevel: 'high',
        createdAt: '2025-08-23T15:00:00.000Z'
      },
      {
        id: 'finding-003',
        reportId: 'report-002',
        reportVersion: 1,
        indicatorKey: '放线菌门',
        conclusion: 'LOW',
        dataStatus: 'PRESENT',
        description: ' 放线菌门显著偏低',
        professional: ' 放线菌门显著低于参考范围。',
        consumer: ' 有益菌偏少，建议补充益生菌。',
        riskLevel: 'medium',
        createdAt: '2025-08-23T15:00:00.000Z'
      },
      {
        id: 'finding-004',
        reportId: 'report-004',
        reportVersion: 1,
        indicatorKey: '放线菌门',
        conclusion: 'NORMAL',
        dataStatus: 'PRESENT',
        description: ' 放线菌门处于正常范围',
        professional: ' 放线菌门占比正常。',
        consumer: ' 该项指标良好，请继续保持。',
        riskLevel: 'low',
        createdAt: '2025-08-19T11:30:00.000Z'
      },
      {
        id: 'finding-005',
        reportId: 'report-005',
        reportVersion: 1,
        indicatorKey: '放线菌门',
        conclusion: 'LOW',
        dataStatus: 'PRESENT',
        description: ' 放线菌门偏低，待审核确认',
        professional: ' 放线菌门低于参考下限，待审核。',
        consumer: ' 有益菌略少，报告审核中。',
        riskLevel: 'medium',
        createdAt: '2025-08-23T12:30:00.000Z'
      }
    ]);

    var recommendations = [
      {
        id: 'rec-001',
        findingId: 'finding-001',
        reportId: 'report-001',
        targetType: 'PRODUCT',
        productId: 'prod-001',
        primaryProductId: 'prod-001',
        relatedProductIds: ['prod-003'],
        healthTagIds: ['htag-001'],
        categoryId: 'cat-002',
        resolvedType: 'PRODUCT',
        resolvedProductId: 'prod-001',
        resolvedCategoryId: 'cat-002',
        availability: 'AVAILABLE',
        candidateProductIds: ['prod-003'],
        reason: ' 主推在售益生菌，手动关联膳食纤维作为搭配',
        label: ' 推荐益生菌套装 A',
        createdAt: '2025-08-24T15:30:00.000Z'
      },
      {
        id: 'rec-002',
        findingId: 'finding-003',
        reportId: 'report-002',
        targetType: 'PRODUCT',
        productId: 'prod-002',
        primaryProductId: 'prod-002',
        relatedProductIds: ['prod-001', 'prod-003'],
        healthTagIds: ['htag-001'],
        categoryId: 'cat-001',
        resolvedType: 'PRODUCT',
        resolvedProductId: 'prod-002',
        resolvedCategoryId: null,
        availability: 'UNAVAILABLE',
        candidateProductIds: ['prod-001', 'prod-003'],
        reason: ' 保留已下架主推品展示失效状态，手动指定替代浏览顺序',
        label: ' 目标产品已下架，展示手动关联商品',
        createdAt: '2025-08-23T15:00:00.000Z'
      },
      {
        id: 'rec-003',
        findingId: 'finding-002',
        reportId: 'report-002',
        targetType: 'PRODUCT',
        productId: 'prod-004',
        primaryProductId: 'prod-004',
        relatedProductIds: [],
        healthTagIds: ['htag-003'],
        categoryId: null,
        resolvedType: 'PRODUCT',
        resolvedProductId: 'prod-004',
        resolvedCategoryId: null,
        availability: 'ZERO_STOCK',
        candidateProductIds: [],
        reason: ' 主推零库存且无手动关联，仅展示零库存主推',
        label: ' 主推零库存，无关联商品',
        createdAt: '2025-08-23T15:00:00.000Z'
      },
      {
        id: 'rec-004',
        findingId: 'finding-004',
        reportId: 'report-004',
        targetType: 'PRODUCT',
        productId: 'prod-004',
        primaryProductId: 'prod-004',
        relatedProductIds: ['prod-001', 'prod-003'],
        healthTagIds: ['htag-001'],
        categoryId: 'cat-002',
        resolvedType: 'PRODUCT',
        resolvedProductId: 'prod-004',
        resolvedCategoryId: null,
        availability: 'ZERO_STOCK',
        candidateProductIds: ['prod-001', 'prod-003'],
        reason: ' 零库存主推保留，手动关联在售替代商品',
        label: ' 主推零库存，展示手动关联商品',
        createdAt: '2025-08-19T11:30:00.000Z'
      }
    ];

    var analysisRuns = [
      {
        id: 'run-001',
        reportId: 'report-001',
        createdAt: '2025-08-24T15:00:00.000Z',
        inputSnapshot: {
          indicatorSignature: '放线菌门:PRESENT:18.5:2|拟杆菌门:PRESENT:35.2:1',
          rulesSignature: 'lineage-rule-001:v1',
          workingVersion: 2,
          species: 'cat'
        },
        rawHits: [
          {
            ruleId: 'rule-seed-001',
            ruleName: '放线菌门偏低',
            matched: true,
            riskLevel: 'medium',
            output: {
              professional: ' 放线菌门显著低于参考范围。',
              consumer: ' 有益菌偏少，建议关注日常饮食。'
            }
          }
        ],
        combinedResult: {
          professional: ' 放线菌门显著低于参考范围。',
          consumer: ' 有益菌偏少，建议关注日常饮食。',
          healthAdvice: ' 可考虑益生菌补充，3 个月后复检。'
        },
        adjustments: {
          excludedHits: [],
          manualFindings: [],
          finalContent: {
            professional: ' 放线菌门显著低于参考范围。',
            consumer: ' 有益菌偏少，建议关注日常饮食。',
            healthAdvice: ' 可考虑益生菌补充，3 个月后复检。',
            updatedAt: '2025-08-24T15:30:00.000Z'
          }
        }
      }
    ];

    var reportAnalysisAdjustments = {
      'report-001': { latestRunId: 'run-001' }
    };

    return {
      meta: {
        version: 4,
        storageKey: STORAGE_KEY,
        disclaimer: '',
        dataStatuses: DATA_STATUSES,
        reportStatuses: REPORT_STATUSES,
        workflowStatuses: WORKFLOW_STATUSES,
        recommendTypes: RECOMMEND_TYPES,
        defaultSourceOrgId: DEFAULT_SOURCE_ORG_ID,
        resetAt: ts
      },
      users: users,
      pets: pets,
      stores: stores,
      claimCodes: claimCodes,
      testRecords: testRecords,
      importBatches: importBatches,
      indicators: indicators,
      reports: reports,
      findings: findings,
      recommendations: recommendations,
      products: products,
      categories: categories,
      healthTags: healthTags,
      healthTagProducts: healthTagProducts,
      ownershipCorrections: ownershipCorrections,
      petUserAssociationChanges: [],
      operationRecords: [],
      professionalCatalog: defaultCatalog(),
      analysisRuleCatalog: buildDefaultAnalysisRuleCatalog(),
      analysisRuns: analysisRuns,
      reportAnalysisAdjustments: reportAnalysisAdjustments
    };
  }

  // ─── Persistence ────────────────────────────────────────────────────────

  function loadState() {
    if (localStorageAvailable) {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = migrateState(JSON.parse(raw));
          memoryState = parsed;
          return parsed;
        }
      } catch (e) {
        localStorageAvailable = false;
      }
    }
    if (memoryState) return migrateState(memoryState);
    memoryState = buildSeedState();
    return memoryState;
  }

  function persistState(state) {
    memoryState = state;
    if (localStorageAvailable) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        localStorageAvailable = false;
      }
    }
    notifyListeners(state);
  }

  function notifyListeners(state) {
    var snapshot = clone(state);
    listeners.forEach(function (fn) {
      try {
        fn(snapshot);
      } catch (e) {
        console.error('[PetReportMockStore] subscribe callback error:', e);
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function findReport(state, reportId) {
    return state.reports.find(function (r) { return r.id === reportId; });
  }

  function findTestRecord(state, testRecordId) {
    return state.testRecords.find(function (t) { return t.id === testRecordId; });
  }

  function findPet(state, petId) {
    return state.pets.find(function (p) { return p.id === petId; });
  }

  function findUser(state, userId) {
    return state.users.find(function (u) { return u.id === userId; });
  }

  function findProduct(state, productId) {
    return state.products.find(function (p) { return p.id === productId; });
  }

  function findCategory(state, categoryId) {
    return state.categories.find(function (c) { return c.id === categoryId; });
  }

  function findHealthTag(state, healthTagId) {
    return (state.healthTags || []).find(function (h) { return h.id === healthTagId; });
  }

  function findReportByTestRecord(state, testRecordId) {
    return state.reports.find(function (r) { return r.testRecordId === testRecordId; });
  }

  function findCatalogEntryByKey(state, key) {
    var catalog = state.professionalCatalog || defaultCatalog();
    var taxon = (catalog.microbiotaTaxa || []).find(function (t) { return t.key === key; });
    if (taxon) return { type: 'microbiota', item: taxon };
    var indicator = (catalog.testIndicators || []).find(function (t) { return t.key === key; });
    if (indicator) return { type: 'indicator', item: indicator };
    return null;
  }

  function getReportSpecies(state, report) {
    if (!report) return null;
    if (report.reportSpecies) return report.reportSpecies;
    var pet = findPet(state, report.petId);
    return pet ? pet.species : null;
  }

  function resolveSchemeRangeForIndicator(catalog, indicator, species, entry) {
    var schemes = (catalog && catalog.referenceRangeSchemes) || [];
    var targetType = entry && entry.type === 'indicator' ? 'indicator' : 'microbiota';
    var targetKey = indicator.key;
    var taxonomyLevel = entry && entry.type === 'microbiota' ? entry.item.level : null;
    var indicatorUnit = indicator.unit;
    var sourceTemplateId = indicator.sourceTemplateId;
    if (!sourceTemplateId || !species) return null;

    for (var i = 0; i < schemes.length; i++) {
      var scheme = schemes[i];
      if (scheme.status !== 'active') continue;
      if (!scheme.applicableSpecies || scheme.applicableSpecies.indexOf(species) < 0) continue;
      if (scheme.templateId !== sourceTemplateId) continue;
      if (!schemeHasValidItems(scheme)) continue;
      var items = scheme.items || [];
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        if (item.targetType !== targetType) continue;
        if (item.targetKey !== targetKey) continue;
        if (taxonomyLevel && item.taxonomyLevel && item.taxonomyLevel !== taxonomyLevel) continue;
        if (indicatorUnit && item.unit && item.unit !== indicatorUnit) continue;
        if (item.minValue == null || item.maxValue == null) continue;
        return {
          min: item.minValue,
          max: item.maxValue,
          unit: item.unit,
          source: 'scheme',
          schemeId: scheme.id
        };
      }
    }
    return null;
  }

  function resolveEffectiveRangeForIndicator(state, indicator, species, options) {
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
    var catalog = state.professionalCatalog || defaultCatalog();
    var entry = findCatalogEntryByKey(state, indicator.key || indicator.rawImportName);
    var schemeRange = resolveSchemeRangeForIndicator(catalog, indicator, species, entry);
    if (schemeRange) return schemeRange;
    return null;
  }

  function getIndicatorsForReportVersion(state, report, versionNo) {
    var relevant = (state.indicators || []).filter(function (ind) {
      return ind.reportId === report.id && ind.version <= versionNo;
    });
    var byKey = {};
    relevant.forEach(function (ind) {
      if (!byKey[ind.key] || byKey[ind.key].version < ind.version) {
        byKey[ind.key] = ind;
      }
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; });
  }

  function getLatestAnalysisRun(state, reportId) {
    var adj = (state.reportAnalysisAdjustments || {})[reportId];
    if (!adj || !adj.latestRunId) return null;
    return (state.analysisRuns || []).find(function (r) { return r.id === adj.latestRunId; }) || null;
  }

  function getWorkingReportVersion(state, reportId) {
    var report = findReport(state, reportId);
    if (!report || !report.versions) return null;
    var versionNo = report.workingVersion != null ? report.workingVersion : report.currentVersion;
    return report.versions.find(function (v) { return v.version === versionNo; }) || null;
  }

  function getPublishedReportVersion(state, reportId) {
    var report = findReport(state, reportId);
    if (!report || !report.versions) return null;
    if (report.publishedVersion == null) return null;
    return report.versions.find(function (v) { return v.version === report.publishedVersion; }) || null;
  }

  function buildPresentationMock(report, version, species) {
    return {
      summaryItems: [
        { key: 'health_level', label: '综合等级', value: version.healthLevel || null },
        { key: 'health_score', label: '综合分', value: version.healthScore != null ? version.healthScore : null },
        { key: 'species', label: '物种', value: species || report.reportSpecies || null }
      ],
      benchmarks: [
        {
          key: 'peer_percentile',
          label: '同龄对比百分位',
          value: version.percentile != null ? version.percentile : null,
          demo: true,
          note: ''
        }
      ],
      dimensions: version.platformDimensions ? clone(version.platformDimensions) : {
        emotion: null,
        immunity: null,
        demo: true,
        note: ''
      }
    };
  }

  function buildContentSnapshot(state, report, versionNo, actor) {
    var version = (report.versions || []).find(function (v) { return v.version === versionNo; });
    if (!version) return null;
    var species = getReportSpecies(state, report);
    var indicators = getIndicatorsForReportVersion(state, report, versionNo).map(function (ind) {
      var effectiveRange = resolveEffectiveRangeForIndicator(state, ind, species, { respectFrozen: false });
      return {
        id: ind.id,
        key: ind.key,
        value: ind.value,
        unit: ind.unit,
        dataStatus: ind.dataStatus,
        version: ind.version,
        effectiveRange: effectiveRange ? clone(effectiveRange) : null
      };
    });
    var run = getLatestAnalysisRun(state, report.id);
    var recs = (state.recommendations || []).filter(function (r) { return r.reportId === report.id; });
    var frozenRecommendations = recs.map(function (rec) {
      return {
        id: rec.id,
        findingId: rec.findingId,
        relation: {
          targetType: rec.targetType,
          primaryProductId: rec.primaryProductId || rec.productId || null,
          relatedProductIds: (rec.relatedProductIds || []).slice(),
          healthTagIds: (rec.healthTagIds || []).slice(),
          reason: rec.reason || null,
          label: rec.label
        },
        resolution: {
          note: ' 产品解析为实时读取，发布快照仅冻结关系配置',
          liveRead: true
        }
      };
    });
    return {
      reportSpecies: report.reportSpecies || species,
      assessment: {
        healthLevel: version.healthLevel,
        healthScore: version.healthScore,
        percentile: version.percentile != null ? version.percentile : null,
        platformDimensions: version.platformDimensions ? clone(version.platformDimensions) : null,
        summary: version.summary
      },
      indicators: indicators,
      analysis: run ? {
        runId: run.id,
        createdAt: run.createdAt,
        rawHits: clone(run.rawHits || []),
        combinedResult: clone(run.combinedResult || null),
        finalContent: clone((run.adjustments && run.adjustments.finalContent) || null)
      } : null,
      recommendations: frozenRecommendations,
      findings: (state.findings || []).filter(function (f) {
        return f.reportId === report.id && f.reportVersion === versionNo;
      }).map(function (f) { return clone(f); }),
      presentationMock: buildPresentationMock(report, version, species),
      frozenAt: nowIso(),
      frozenBy: actor || (' 系统')
    };
  }

  function copyPublishedAssessmentFields(pubVer, workVer) {
    if (!pubVer || !workVer) return;
    if (pubVer.percentile != null) workVer.percentile = pubVer.percentile;
    if (pubVer.platformDimensions) workVer.platformDimensions = clone(pubVer.platformDimensions);
    if (!workVer.healthLevel && pubVer.healthLevel) workVer.healthLevel = pubVer.healthLevel;
    if (workVer.healthScore == null && pubVer.healthScore != null) workVer.healthScore = pubVer.healthScore;
    if (!workVer.summary && pubVer.summary) workVer.summary = pubVer.summary;
  }

  function appendOperationRecord(state, record) {
    if (!state.operationRecords) state.operationRecords = [];
    state.operationRecords.push(Object.assign({ id: uid('op'), createdAt: nowIso() }, record));
  }

  function syncReportWorkflow(report, testRecord, state) {
    if (!report) return;
    state = state || loadState();
    report.workflowStatus = deriveWorkflowStatus(report, testRecord);
    report.todoFlags = buildTodoFlags(report, testRecord, state);
    syncReportVersionFields(report);
  }

  function buildTodoFlags(report, testRecord, state) {
    var flags = deriveTodoFlags(report, testRecord);
    if (state && testRecord && testRecord.importBatchId) {
      var batch = state.importBatches.find(function (b) { return b.id === testRecord.importBatchId; });
      if (batch && batch.status === 'partial' && flags.indexOf('partial_import') < 0) {
        flags.push('partial_import');
      }
    }
    if (report && report.correctionDraftActive && flags.indexOf('correction_draft') < 0) {
      flags.push('correction_draft');
    }
    return flags;
  }

  function getTodoFlags(reportOrId, testRecordOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    var testRecord = null;
    if (typeof testRecordOrId === 'string') testRecord = findTestRecord(state, testRecordOrId);
    else if (testRecordOrId) testRecord = testRecordOrId;
    else if (report) testRecord = findTestRecord(state, report.testRecordId);
    return buildTodoFlags(report, testRecord, state);
  }

  function getWorkflowStatus(reportOrId, testRecordOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    var testRecord = null;
    if (typeof testRecordOrId === 'string') {
      testRecord = findTestRecord(state, testRecordOrId);
    } else if (testRecordOrId) {
      testRecord = testRecordOrId;
    } else if (report) {
      testRecord = findTestRecord(state, report.testRecordId);
    }
    if (report && report.workflowStatus) return report.workflowStatus;
    return deriveWorkflowStatus(report, testRecord);
  }

  function getPublishedVersionSnapshot(reportOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    if (!report || !report.versions || report.versions.length === 0) return null;
    var versionNo = report.publishedVersion;
    if (versionNo == null) {
      if (report.status === 'published' || report.status === 'corrected') versionNo = report.currentVersion;
      else return null;
    }
    return report.versions.find(function (v) { return v.version === versionNo; }) || null;
  }

  function getWorkingVersionSnapshot(reportOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    if (!report || !report.versions) return null;
    var versionNo = report.workingVersion != null ? report.workingVersion : report.currentVersion;
    return report.versions.find(function (v) { return v.version === versionNo; }) || null;
  }

  function getUserReportStatus(reportOrId, userId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    if (!report || !userId) return null;
    var pet = findPet(state, report.petId);
    if (!pet || pet.userId !== userId) return null;
    var workflow = getWorkflowStatus(report, findTestRecord(state, report.testRecordId));
    if (workflow === 'voided' || report.status === 'voided') return null;
    if (workflow === 'published' || report.status === 'published' || report.status === 'corrected') return 'published';
    return null;
  }

  function getPetPublishedReports(petId) {
    var state = loadState();
    return (state.reports || []).filter(function (report) {
      if (report.petId !== petId) return false;
      if (report.status === 'voided' || report.status === 'cancelled') return false;
      var workflow = getWorkflowStatus(report, findTestRecord(state, report.testRecordId));
      return workflow === 'published' || report.status === 'published' || report.status === 'corrected';
    }).sort(function (a, b) {
      var trA = findTestRecord(state, a.testRecordId);
      var trB = findTestRecord(state, b.testRecordId);
      var dateA = (trA && trA.testDate) || a.updatedAt || a.createdAt || '';
      var dateB = (trB && trB.testDate) || b.updatedAt || b.createdAt || '';
      return String(dateB).localeCompare(String(dateA));
    });
  }

  function syncPetLinkedEntities(state, petId, userId) {
    (state.reports || []).forEach(function (report) {
      if (report.petId !== petId) return;
      report.userId = userId || null;
      report.ownershipStatus = userId ? 'bound' : 'unassigned';
      report.updatedAt = nowIso();
      var tr = findTestRecord(state, report.testRecordId);
      if (tr) syncReportWorkflow(report, tr);
    });
    (state.testRecords || []).forEach(function (tr) {
      if (tr.petId !== petId) return;
      tr.userId = userId || null;
      tr.claimStatus = userId ? 'bound' : 'unassigned';
      tr.updatedAt = nowIso();
    });
  }

  function getUserVisibleReports(userId) {
    var state = loadState();
    return state.reports.filter(function (report) {
      return getUserReportStatus(report, userId) != null;
    }).map(function (report) {
      var publishedVersion = getPublishedVersionSnapshot(report);
      return {
        report: clone(report),
        userStatus: getUserReportStatus(report, userId),
        publishedVersion: clone(publishedVersion),
        contentSnapshot: publishedVersion && publishedVersion.contentSnapshot
          ? clone(publishedVersion.contentSnapshot)
          : null
      };
    });
  }

  function getUserPublishedReportProjection(userId, reportId) {
    var state = loadState();
    var report = findReport(state, reportId);
    if (!report) return null;
    var userStatus = getUserReportStatus(report, userId);
    if (!userStatus) return null;
    var publishedVersion = getPublishedVersionSnapshot(report);
    return {
      report: clone(report),
      publishedVersion: clone(publishedVersion),
      contentSnapshot: publishedVersion && publishedVersion.contentSnapshot
        ? clone(publishedVersion.contentSnapshot)
        : null,
      userStatus: userStatus
    };
  }

  function resolveHealthTagCandidates(state, healthTagIds, species) {
    healthTagIds = healthTagIds || [];
    var candidates = [];
    healthTagIds.forEach(function (tagId) {
      var tag = findHealthTag(state, tagId);
      if (!tag || !tag.enabled) return;
      (state.healthTagProducts || []).forEach(function (mapping) {
        if (mapping.healthTagId !== tagId || !mapping.enabled) return;
        if (species && mapping.species && mapping.species.indexOf(species) < 0) return;
        var product = findProduct(state, mapping.productId);
        if (!product || !product.available) return;
        if ((product.stock != null ? product.stock : 1) <= 0) return;
        candidates.push({
          productId: product.id,
          product: product,
          sortOrder: mapping.sortOrder || 0,
          healthTagId: tagId
        });
      });
    });
    candidates.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    return candidates;
  }

  function checkDuplicateImport(params) {
    params = params || {};
    var state = loadState();
    return checkDuplicateImportInternal(state, params);
  }

  function checkDuplicateImportInternal(state, params) {
    var sourceOrgId = params.sourceOrgId || DEFAULT_SOURCE_ORG_ID;
    var externalNo = params.externalReportNumber || params.externalNumber;
    var sampleNo = params.sampleNumber || params.sampleNo;
    if (!externalNo && !sampleNo) return null;
    var existing = state.testRecords.find(function (tr) {
      if ((tr.sourceOrgId || DEFAULT_SOURCE_ORG_ID) !== sourceOrgId) return false;
      if (externalNo && tr.externalReportNumber === externalNo) return true;
      if (sampleNo && tr.sampleNumber === sampleNo) return true;
      return false;
    });
    if (!existing) return null;
    return {
      duplicate: true,
      existingTestRecordId: existing.id,
      sourceOrgId: sourceOrgId,
      externalReportNumber: externalNo || null,
      sampleNumber: sampleNo || null
    };
  }

  function bumpIds(state, collection, prefix) {
    var max = 0;
    state[collection].forEach(function (item) {
      var num = parseInt(String(item.id).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > max) max = num;
    });
    return prefix + '-' + String(max + 1).padStart(3, '0');
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  function getState() {
    return clone(loadState());
  }

  function peekState() {
    return loadState();
  }

  function reset() {
    var state = migrateState(buildSeedState());
    state.meta.resetAt = nowIso();
    if (localStorageAvailable) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        localStorageAvailable = false;
      }
    }
    memoryState = state;
    notifyListeners(state);
    return clone(state);
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') return function () {};
    listeners.push(callback);
    return function () {
      var idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }

  function commit(mutator) {
    var state = loadState();
    var result = mutator(state);
    state.meta.lastModifiedAt = nowIso();
    persistState(state);
    return result !== undefined ? clone(result) : clone(state);
  }

  /** 检测登记 */
  function registerTest(params) {
    params = params || {};
    return commit(function (state) {
      var id = bumpIds(state, 'testRecords', 'tr');
      var pet = params.petId ? findPet(state, params.petId) : null;
      var record = {
        id: id,
        petId: params.petId || null,
        userId: pet ? pet.userId : (params.userId || null),
        storeId: params.storeId || (pet ? pet.storeId : null),
        sourceOrgId: params.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: params.externalReportNumber || null,
        sampleNumber: params.sampleNumber || null,
        sampleType: params.sampleType || 'feces',
        testDate: params.testDate || new Date().toISOString().slice(0, 10),
        status: 'pending_result',
        importBatchId: null,
        claimStatus: pet ? 'bound' : 'unassigned',
        label: ' 新登记检测',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.testRecords.push(record);
      return record;
    });
  }

  /** 模拟 Excel 导入成功 */
  function simulateExcelImportSuccess(params) {
    params = params || {};
    return commit(function (state) {
      var dup = checkDuplicateImportInternal(state, params);
      if (dup) throw new Error('duplicate import blocked: ' + dup.existingTestRecordId);

      var batchId = bumpIds(state, 'importBatches', 'batch');
      var testRecordId = params.testRecordId;
      var record = testRecordId ? findTestRecord(state, testRecordId) : null;
      var hasPartial = (params.indicators || []).some(function (ind) {
        return ind.dataStatus && ind.dataStatus !== 'PRESENT';
      });
      var batchStatus = hasPartial ? 'partial' : 'success';

      if (!record) {
        var newTrId = bumpIds(state, 'testRecords', 'tr');
        record = {
          id: newTrId,
          petId: params.petId || null,
          userId: params.userId || null,
          storeId: params.storeId || null,
          sourceOrgId: params.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
          externalReportNumber: params.externalReportNumber || null,
          sampleNumber: params.sampleNumber || params.sampleNo || null,
          sampleType: 'feces',
          testDate: new Date().toISOString().slice(0, 10),
          status: params.petId ? 'pending_review' : 'unassigned',
          importBatchId: batchId,
          claimStatus: params.petId ? 'bound' : (params.userId ? 'bound' : 'unassigned'),
          label: ' 导入成功',
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        state.testRecords.push(record);
        testRecordId = newTrId;
      } else {
        record.status = record.petId || record.userId ? 'pending_review' : 'unassigned';
        record.importBatchId = batchId;
        record.sourceOrgId = params.sourceOrgId || record.sourceOrgId || DEFAULT_SOURCE_ORG_ID;
        if (params.externalReportNumber) record.externalReportNumber = params.externalReportNumber;
        if (params.sampleNumber || params.sampleNo) record.sampleNumber = params.sampleNumber || params.sampleNo;
        record.updatedAt = nowIso();
      }

      var rows = params.rows || 10;
      var batch = {
        id: batchId,
        fileName: params.fileName || (' 模拟导入成功.xlsx'),
        status: batchStatus,
        totalRows: rows,
        successRows: batchStatus === 'partial' ? Math.max(1, rows - 1) : rows,
        failedRows: batchStatus === 'partial' ? 1 : 0,
        errors: batchStatus === 'partial' ? [{ row: rows, column: '局部字段', code: 'PARTIAL', message: ' 局部导入异常' }] : [],
        testRecordIds: [testRecordId],
        createdAt: nowIso()
      };
      state.importBatches.push(batch);

      var indicators = params.indicators || [
        { key: '放线菌门', value: 22.5, unit: '%', dataStatus: 'PRESENT' },
        { key: '拟杆菌门', value: 33.1, unit: '%', dataStatus: 'PRESENT' },
        { key: '厚壁菌门', value: 41.0, unit: '%', dataStatus: 'PRESENT' }
      ];
      indicators.forEach(function (ind, idx) {
        state.indicators.push({
          id: uid('ind'),
          testRecordId: testRecordId,
          reportId: null,
          key: ind.key,
          value: ind.value,
          unit: ind.unit || '%',
          dataStatus: ind.dataStatus || 'PRESENT',
          importedRange: ind.importedRange ? clone(ind.importedRange) : null,
          sourceTemplateId: ind.sourceTemplateId || params.sourceTemplateId || params.templateId || null,
          version: 1,
          isCurrent: true,
          correctedFrom: null,
          createdAt: nowIso()
        });
      });

      return { batchId: batchId, testRecordId: testRecordId, batchStatus: batchStatus };
    });
  }

  /** 模拟批量 Excel 导入（逐文件独立结果） */
  function simulateBatchImport(params) {
    params = params || {};
    var files = params.files || [];
    return commit(function (state) {
      var batchId = bumpIds(state, 'importBatches', 'batch');
      var fileResults = [];

      files.forEach(function (file) {
        file = file || {};
        var scenario = file.scenario || 'success';
        var fileName = file.fileName || (' 批量文件.xlsx');

        if (scenario === 'duplicate') {
          var dup = checkDuplicateImportInternal(state, file);
          if (dup) {
            fileResults.push({
              fileName: fileName,
              status: 'duplicate',
              error: dup,
              testRecordId: null
            });
            return;
          }
        }

        if (scenario === 'failure') {
          var failTrId = bumpIds(state, 'testRecords', 'tr');
          var failRecord = {
            id: failTrId,
            petId: null,
            userId: null,
            storeId: file.storeId || null,
            sourceOrgId: file.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
            externalReportNumber: file.externalReportNumber || null,
            sampleNumber: file.sampleNumber || null,
            sampleType: 'feces',
            testDate: new Date().toISOString().slice(0, 10),
            status: 'import_failed',
            importBatchId: batchId,
            claimStatus: 'unassigned',
            label: ' 批量导入失败',
            createdAt: nowIso(),
            updatedAt: nowIso()
          };
          state.testRecords.push(failRecord);
          fileResults.push({
            fileName: fileName,
            status: 'failed',
            testRecordId: failTrId,
            errorCode: file.errorCode || 'MISSING_COLUMN'
          });
          return;
        }

        if (scenario === 'duplicate_force') {
          fileResults.push({
            fileName: fileName,
            status: 'duplicate',
            error: { duplicate: true, reason: 'forced demo duplicate' },
            testRecordId: file.existingTestRecordId || null
          });
          return;
        }

        var partial = scenario === 'partial';
        var trId = bumpIds(state, 'testRecords', 'tr');
        var tr = {
          id: trId,
          petId: file.petId || null,
          userId: file.userId || null,
          storeId: file.storeId || null,
          sourceOrgId: file.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
          externalReportNumber: file.externalReportNumber || ('EXT-BATCH-' + trId),
          sampleNumber: file.sampleNumber || ('SAMPLE-BATCH-' + trId),
          sampleType: 'feces',
          testDate: new Date().toISOString().slice(0, 10),
          status: file.petId || file.userId ? 'pending_review' : 'unassigned',
          importBatchId: batchId,
          claimStatus: file.petId || file.userId ? 'bound' : 'unassigned',
          label: ' 批量导入' + (partial ? '（局部异常）' : '成功'),
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        state.testRecords.push(tr);

        var indicators = file.indicators || [
          { key: '放线菌门', value: 20.1, unit: '%', dataStatus: 'PRESENT' },
          { key: '厚壁菌门', value: null, unit: '%', dataStatus: partial ? 'NOT_DETECTED' : 'PRESENT' }
        ];
        indicators.forEach(function (ind) {
          state.indicators.push({
            id: uid('ind'),
            testRecordId: trId,
            reportId: null,
            key: ind.key,
            value: ind.value,
            unit: ind.unit || '%',
            dataStatus: ind.dataStatus || 'PRESENT',
            importedRange: ind.importedRange ? clone(ind.importedRange) : null,
            sourceTemplateId: ind.sourceTemplateId || file.sourceTemplateId || file.templateId || null,
            version: 1,
            isCurrent: true,
            correctedFrom: null,
            createdAt: nowIso()
          });
        });

        fileResults.push({
          fileName: fileName,
          status: partial ? 'partial' : 'success',
          testRecordId: trId
        });
      });

      var successCount = fileResults.filter(function (r) { return r.status === 'success' || r.status === 'partial'; }).length;
      var failedCount = fileResults.filter(function (r) { return r.status === 'failed' || r.status === 'duplicate'; }).length;
      var batch = {
        id: batchId,
        fileName: params.fileName || (' 批量导入批次.xlsx'),
        status: failedCount && successCount ? 'partial' : (failedCount ? 'failed' : 'success'),
        totalRows: files.length,
        successRows: successCount,
        failedRows: failedCount,
        errors: fileResults.filter(function (r) { return r.error || r.errorCode; }).map(function (r) {
          return { fileName: r.fileName, code: r.errorCode || 'DUPLICATE', message: ' ' + r.status };
        }),
        testRecordIds: fileResults.map(function (r) { return r.testRecordId; }).filter(Boolean),
        fileResults: fileResults,
        createdAt: nowIso()
      };
      state.importBatches.push(batch);
      return { batchId: batchId, fileResults: fileResults };
    });
  }

  /** 模拟 Excel 导入失败 */
  function simulateExcelImportFailure(params) {
    params = params || {};
    return commit(function (state) {
      var batchId = bumpIds(state, 'importBatches', 'batch');
      var testRecordId = params.testRecordId;
      var record = testRecordId ? findTestRecord(state, testRecordId) : null;

      if (!record) {
        var newTrId = bumpIds(state, 'testRecords', 'tr');
        record = {
          id: newTrId,
          petId: params.petId || null,
          userId: params.userId || null,
          storeId: params.storeId || null,
          sampleType: 'feces',
          testDate: new Date().toISOString().slice(0, 10),
          status: 'import_failed',
          importBatchId: batchId,
          claimStatus: params.petId ? 'bound' : 'unclaimed',
          label: ' 导入失败',
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        state.testRecords.push(record);
        testRecordId = newTrId;
      } else {
        record.status = 'import_failed';
        record.importBatchId = batchId;
        record.updatedAt = nowIso();
      }

      var errorCode = params.errorCode || 'MISSING_COLUMN';
      var batch = {
        id: batchId,
        fileName: params.fileName || (' 模拟导入失败.xlsx'),
        status: 'failed',
        totalRows: params.totalRows || 5,
        successRows: 0,
        failedRows: params.totalRows || 5,
        errors: [
          {
            row: params.errorRow || 2,
            column: params.errorColumn || '放线菌门',
            code: errorCode,
            message: ' 导入失败: ' + errorCode
          }
        ],
        testRecordIds: [testRecordId],
        createdAt: nowIso()
      };
      state.importBatches.push(batch);

      return { batchId: batchId, testRecordId: testRecordId, errorCode: errorCode };
    });
  }

  /** 生成报告（draft） */
  function generateReport(params) {
    params = params || {};
    if (!params.testRecordId) throw new Error('testRecordId is required');
    return commit(function (state) {
      var tr = findTestRecord(state, params.testRecordId);
      if (!tr) throw new Error('testRecord not found: ' + params.testRecordId);

      var reportId = bumpIds(state, 'reports', 'report');
      var reportNumber = params.reportNumber || (' RPT-' + reportId.replace('report-', ''));
      var report = {
        id: reportId,
        reportNumber: reportNumber,
        externalReportNumber: tr.externalReportNumber || null,
        sampleNumber: tr.sampleNumber || null,
        sourceOrgId: tr.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
        testRecordId: tr.id,
        userId: tr.userId,
        petId: tr.petId,
        status: 'draft',
        workflowStatus: tr.petId ? 'incomplete' : 'unassigned',
        ownershipStatus: tr.userId ? 'bound' : (tr.petId ? 'pending_claim' : 'unassigned'),
        todoFlags: [],
        currentVersion: 1,
        workingVersion: 1,
        publishedVersion: null,
        correctionDraftActive: false,
        versions: [
          {
            version: 1,
            status: 'draft',
            healthLevel: params.healthLevel || null,
            healthScore: params.healthScore || null,
            summary: params.summary || (' 草稿报告'),
            createdAt: nowIso(),
            publishedAt: null
          }
        ],
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.reports.push(report);

      state.indicators.forEach(function (ind) {
        if (ind.testRecordId === tr.id && ind.isCurrent) {
          ind.reportId = reportId;
        }
      });

      syncReportWorkflow(report, tr);
      return report;
    });
  }

  /** 提交审核 */
  function submitReport(reportId) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      report.status = 'pending_review';
      report.workflowStatus = 'pending_review';
      report.updatedAt = nowIso();
      var ver = report.versions[report.versions.length - 1];
      ver.status = 'pending_review';

      var tr = findTestRecord(state, report.testRecordId);
      if (tr) {
        tr.status = 'pending_review';
        tr.updatedAt = nowIso();
      }
      syncReportWorkflow(report, tr);
      return report;
    });
  }

  /** 驳回报告 */
  function rejectReport(reportId, reason) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      report.status = 'rejected';
      report.workflowStatus = 'incomplete';
      report.updatedAt = nowIso();
      if (!report.todoFlags) report.todoFlags = [];
      if (report.todoFlags.indexOf('rejected') < 0) report.todoFlags.push('rejected');
      var ver = report.versions[report.versions.length - 1];
      ver.status = 'rejected';
      ver.rejectReason = reason || (' 审核驳回');

      var tr = findTestRecord(state, report.testRecordId);
      if (tr) {
        tr.status = 'import_failed';
        tr.updatedAt = nowIso();
      }
      syncReportWorkflow(report, tr);
      return report;
    });
  }

  /** 批准报告 */
  function approveReport(reportId) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      report.status = 'approved';
      report.workflowStatus = 'pending_review';
      report.updatedAt = nowIso();
      var ver = report.versions[report.versions.length - 1];
      ver.status = 'approved';
      syncReportWorkflow(report, findTestRecord(state, report.testRecordId));
      return report;
    });
  }

  /** 发布报告（允许已发布待认领） */
  function publishReport(reportId, options) {
    options = normalizeActorOptions(options);
    var actor = options.actor || (' 审核员');
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      var tr = findTestRecord(state, report.testRecordId);
      var publishVersion = report.correctionDraftActive ? report.workingVersion : report.currentVersion;
      var ver = report.versions.find(function (v) { return v.version === publishVersion; }) ||
        report.versions[report.versions.length - 1];

      report.status = report.correctionDraftActive || (report.publishedVersion && report.publishedVersion < publishVersion)
        ? 'corrected'
        : 'published';
      report.workflowStatus = 'published';
      report.publishedVersion = publishVersion;
      report.workingVersion = publishVersion;
      report.currentVersion = publishVersion;
      report.correctionDraftActive = false;
      report.updatedAt = nowIso();
      ver.status = report.status === 'corrected' ? 'corrected' : 'published';
      ver.publishedAt = nowIso();
      ver.contentSnapshot = buildContentSnapshot(state, report, publishVersion, actor);

      if (tr) {
        tr.status = 'published';
        tr.updatedAt = nowIso();
      }
      syncReportWorkflow(report, tr, state);
      appendOperationRecord(state, {
        type: 'publish',
        reportId: report.id,
        version: publishVersion,
        ownershipStatus: report.ownershipStatus,
        actor: actor
      });
      return report;
    });
  }

  /** 指标更正 — 生成新版本，不覆盖原始 */
  function correctIndicator(params) {
    params = params || {};
    if (!params.indicatorId && !params.testRecordId) {
      throw new Error('indicatorId or testRecordId is required');
    }
    return commit(function (state) {
      var original = null;
      if (params.indicatorId) {
        original = state.indicators.find(function (i) { return i.id === params.indicatorId; });
      } else {
        original = state.indicators.find(function (i) {
          return i.testRecordId === params.testRecordId && i.key === params.key && i.isCurrent;
        });
      }
      if (!original) throw new Error('indicator not found');

      original.isCurrent = false;
      var newVersion = original.version + 1;
      var corrected = {
        id: uid('ind'),
        testRecordId: original.testRecordId,
        reportId: original.reportId,
        key: original.key,
        value: params.value !== undefined ? params.value : original.value,
        unit: original.unit,
        dataStatus: params.dataStatus || 'PRESENT',
        version: newVersion,
        isCurrent: true,
        correctedFrom: original.id,
        createdAt: nowIso()
      };
      state.indicators.push(corrected);

      if (original.reportId) {
        var report = findReport(state, original.reportId);
        if (report) {
          if (!report.correctionDraftActive) {
            createCorrectionDraftInternal(state, report, {
              summary: params.correctionNote || (' 指标「' + original.key + '」已更正'),
              correctionNote: params.correctionNote || (' 原始指标更正')
            });
          } else {
            var workingVer = report.versions.find(function (v) { return v.version === report.workingVersion; });
            if (workingVer) {
              workingVer.summary = params.correctionNote || workingVer.summary;
              workingVer.correctionNote = params.correctionNote || workingVer.correctionNote;
            }
          }
          report.status = 'corrected';
          report.updatedAt = nowIso();
          syncReportWorkflow(report, findTestRecord(state, report.testRecordId));
        }
      }

      return corrected;
    });
  }

  function createCorrectionDraftInternal(state, report, params) {
    params = params || {};
    var baseVersion = report.publishedVersion || report.currentVersion || 1;
    var base = report.versions.find(function (v) { return v.version === baseVersion; }) ||
      report.versions[report.versions.length - 1];
    var newReportVersion = (report.workingVersion || report.currentVersion || 1) + 1;
    report.workingVersion = newReportVersion;
    report.currentVersion = newReportVersion;
    report.correctionDraftActive = true;
    report.versions.push({
      version: newReportVersion,
      status: 'draft',
      healthLevel: base.healthLevel,
      healthScore: base.healthScore,
      summary: params.summary || (' 更正草稿'),
      createdAt: nowIso(),
      publishedAt: null,
      correctionNote: params.correctionNote || (' 更正草稿')
    });
    syncReportWorkflow(report, findTestRecord(state, report.testRecordId));
    return report;
  }

  /** 创建更正草稿（用户继续看旧发布版本） */
  function createCorrectionDraft(reportId, params) {
    params = params || {};
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      if (report.workflowStatus !== 'published' && report.status !== 'published' && report.status !== 'corrected') {
        throw new Error('only published reports can create correction draft');
      }
      if (report.correctionDraftActive) return report;
      createCorrectionDraftInternal(state, report, params);
      appendOperationRecord(state, { type: 'correction_draft', reportId: report.id, version: report.workingVersion });
      return report;
    });
  }

  /** 发布更正版本（替换当前发布版本） */
  function publishCorrection(reportId, options) {
    return publishReport(reportId, options);
  }

  /** 作废报告 */
  function voidReport(reportId, reason) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      report.status = 'voided';
      report.workflowStatus = 'voided';
      report.voidedAt = nowIso();
      report.voidReason = reason || (' 报告作废');
      report.updatedAt = nowIso();
      var tr = findTestRecord(state, report.testRecordId);
      if (tr) {
        tr.status = 'voided';
        tr.updatedAt = nowIso();
      }
      syncReportWorkflow(report, tr);
      appendOperationRecord(state, {
        type: 'void',
        reportId: report.id,
        reason: report.voidReason
      });
      return report;
    });
  }

  /** 运营归档：报告关联宠物，可选关联平台用户 */
  function assignReportOwnership(params) {
    params = params || {};
    if (!params.reportId && !params.testRecordId) {
      throw new Error('reportId or testRecordId is required');
    }
    return commit(function (state) {
      var report = params.reportId ? findReport(state, params.reportId) : null;
      var tr = params.testRecordId
        ? findTestRecord(state, params.testRecordId)
        : findTestRecord(state, report.testRecordId);
      if (!report && tr) report = findReportByTestRecord(state, tr.id);
      if (!tr && report) tr = findTestRecord(state, report.testRecordId);
      if (!tr) throw new Error('test record not found');

      var pet = params.petId ? findPet(state, params.petId) : null;
      if (!pet) throw new Error('pet not found: ' + params.petId);

      var userId = params.userId || null;
      if (userId && !findUser(state, userId)) throw new Error('user not found: ' + userId);

      tr.petId = pet.id;
      tr.storeId = params.storeId || pet.storeId || tr.storeId;
      if (userId && userId !== pet.userId) {
        if (!state.petUserAssociationChanges) state.petUserAssociationChanges = [];
        state.petUserAssociationChanges.push({
          id: bumpIds(state, 'petUserAssociationChanges', 'petuser'),
          petId: pet.id,
          fromUserId: pet.userId || null,
          toUserId: userId,
          actor: params.actor || '运营专员',
          reason: params.reason || '报告归档时关联用户',
          createdAt: nowIso()
        });
        pet.userId = userId;
        pet.claimStatus = 'bound';
      } else if (userId) {
        pet.userId = userId;
        pet.claimStatus = 'bound';
      }
      tr.userId = pet.userId || null;
      tr.claimStatus = pet.userId ? 'bound' : 'unassigned';
      if (tr.status === 'unassigned' || tr.status === 'pending_claim') {
        tr.status = 'pending_review';
      }
      tr.updatedAt = nowIso();

      if (!report) {
        report = generateReportInternal(state, tr, params);
      } else {
        report.petId = pet.id;
        report.userId = pet.userId || null;
        report.ownershipStatus = pet.userId ? 'bound' : 'unassigned';
        report.workflowStatus = pet.userId ? 'incomplete' : 'unassigned';
        report.updatedAt = nowIso();
      }
      syncReportWorkflow(report, tr);
      return { report: report, testRecord: tr, pet: pet };
    });
  }

  function generateReportInternal(state, tr, params) {
    params = params || {};
    var reportId = bumpIds(state, 'reports', 'report');
    var report = {
      id: reportId,
      reportNumber: params.reportNumber || (' RPT-' + reportId.replace('report-', '')),
      externalReportNumber: tr.externalReportNumber,
      sampleNumber: tr.sampleNumber,
      sourceOrgId: tr.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
      testRecordId: tr.id,
      userId: tr.userId,
      petId: tr.petId,
      status: 'draft',
      workflowStatus: tr.userId ? 'incomplete' : 'unassigned',
      ownershipStatus: tr.userId ? 'bound' : 'pending_claim',
      todoFlags: [],
      currentVersion: 1,
      workingVersion: 1,
      publishedVersion: null,
      correctionDraftActive: false,
      versions: [{
        version: 1,
        status: 'draft',
        healthLevel: null,
        healthScore: null,
        summary: params.summary || (' 归属后草稿'),
        createdAt: nowIso(),
        publishedAt: null
      }],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.reports.push(report);
    return report;
  }

  /** 运营创建宠物 */
  function createOpsPet(params) {
    params = params || {};
    return commit(function (state) {
      var petId = bumpIds(state, 'pets', 'pet');
      var pet = {
        id: petId,
        userId: params.userId || null,
        name: params.name || (' 运营建档宠物'),
        breed: params.breed || '未知品种',
        age: params.age != null ? params.age : null,
        gender: params.gender || 'unknown',
        species: params.species || 'dog',
        storeId: params.storeId || null,
        claimStatus: params.userId ? 'bound' : 'unassigned',
        opsCreated: true,
        createdAt: nowIso()
      };
      state.pets.push(pet);
      return pet;
    });
  }

  /** 生成领取凭证 */
  function generateClaimCredential(params) {
    params = params || {};
    return commit(function (state) {
      var report = params.reportId ? findReport(state, params.reportId) : null;
      var tr = params.testRecordId
        ? findTestRecord(state, params.testRecordId)
        : (report ? findTestRecord(state, report.testRecordId) : null);
      if (!tr) throw new Error('test record not found');
      if (!tr.petId) throw new Error('pet must be archived before generating claim credential');

      var code = params.code || ('CLAIM-' + Date.now().toString(36).toUpperCase());
      var claim = {
        id: bumpIds(state, 'claimCodes', 'claim'),
        code: code,
        storeId: params.storeId || tr.storeId,
        petId: tr.petId,
        testRecordId: tr.id,
        status: 'pending',
        expiresAt: params.expiresAt || '2099-12-31T23:59:59.000Z',
        createdAt: nowIso()
      };
      state.claimCodes.push(claim);
      if (report) {
        report.ownershipStatus = 'pending_claim';
        report.userId = null;
        syncReportWorkflow(report, tr);
      }
      tr.claimStatus = 'pending_claim';
      return claim;
    });
  }

  /** 作废领取凭证 */
  function voidClaimCredential(params) {
    params = params || {};
    return commit(function (state) {
      var claim = state.claimCodes.find(function (c) {
        if (params.id) return c.id === params.id;
        if (params.code) return c.code === params.code;
        return false;
      });
      if (!claim) throw new Error('claim credential not found');
      claim.status = 'voided';
      claim.voidedAt = nowIso();
      claim.voidReason = params.reason || (' 手动作废');
      return claim;
    });
  }

  /** 归属纠错 */
  function correctOwnership(params) {
    params = params || {};
    if (!params.reportId) throw new Error('reportId is required');
    if (!params.userId || !params.petId) throw new Error('userId and petId are required');
    return commit(function (state) {
      var report = findReport(state, params.reportId);
      if (!report) throw new Error('report not found: ' + params.reportId);
      var tr = findTestRecord(state, report.testRecordId);
      var correction = {
        id: bumpIds(state, 'ownershipCorrections', 'owncorr'),
        reportId: report.id,
        fromUserId: report.userId,
        toUserId: params.userId,
        fromPetId: report.petId,
        toPetId: params.petId,
        actor: params.actor || (' 运营专员'),
        reason: params.reason || (' 归属纠错'),
        createdAt: nowIso()
      };
      if (!state.ownershipCorrections) state.ownershipCorrections = [];
      state.ownershipCorrections.push(correction);

      report.userId = params.userId;
      report.petId = params.petId;
      report.ownershipStatus = 'bound';
      report.updatedAt = nowIso();
      if (tr) {
        tr.userId = params.userId;
        tr.petId = params.petId;
        tr.claimStatus = 'bound';
        tr.updatedAt = nowIso();
      }
      syncReportWorkflow(report, tr);
      appendOperationRecord(state, {
        type: 'ownership_correction',
        reportId: report.id,
        correctionId: correction.id
      });
      return correction;
    });
  }

  /** 认领码绑定 — 运营预建宠物，领取只绑定用户 */
  function bindClaimCode(params) {
    params = params || {};
    if (!params.code) throw new Error('code is required');
    if (!params.userId) throw new Error('userId is required');
    return commit(function (state) {
      var claim = state.claimCodes.find(function (c) {
        return c.code === params.code && c.status === 'pending';
      });
      if (!claim) throw new Error('claim code not found or already used: ' + params.code);

      var user = findUser(state, params.userId);
      if (!user) throw new Error('user not found: ' + params.userId);

      claim.status = 'used';
      claim.usedAt = nowIso();
      claim.usedByUserId = params.userId;

      var petId = params.petId || claim.petId;
      if (!petId && params.allowCreatePet) {
        petId = bumpIds(state, 'pets', 'pet');
        var newPet = {
          id: petId,
          userId: params.userId,
          name: params.petName || (' 新认领宠物'),
          breed: params.petBreed || '未知品种',
          age: params.petAge || null,
          gender: params.petGender || 'unknown',
          species: params.species || 'dog',
          storeId: claim.storeId,
          claimStatus: 'claimed',
          opsCreated: false,
          createdAt: nowIso()
        };
        state.pets.push(newPet);
        claim.petId = petId;
      } else if (!petId) {
        throw new Error('运营预建宠物不存在，无法认领');
      } else {
        var existingPet = findPet(state, petId);
        if (!existingPet) throw new Error('pet not found: ' + petId);
        existingPet.userId = params.userId;
        existingPet.storeId = claim.storeId || existingPet.storeId;
        existingPet.claimStatus = 'claimed';
        claim.petId = petId;
      }

      if (claim.testRecordId) {
        var tr = findTestRecord(state, claim.testRecordId);
        if (tr) {
          tr.petId = petId;
          tr.userId = params.userId;
          tr.storeId = claim.storeId;
          tr.claimStatus = 'claimed';
          if (tr.status === 'pending_claim' || tr.status === 'unassigned') {
            tr.status = tr.status === 'unassigned' ? 'pending_review' : 'pending_review';
          }
          tr.updatedAt = nowIso();
        }
        state.reports.forEach(function (r) {
          if (r.testRecordId === claim.testRecordId) {
            r.userId = params.userId;
            r.petId = petId;
            r.ownershipStatus = 'bound';
            r.updatedAt = nowIso();
            syncReportWorkflow(r, tr);
          }
        });
      }

      return { claimCode: claim, petId: petId, userId: params.userId };
    });
  }

  /** 审核更新报告摘要/评分 */
  function updateReportContent(params) {
    params = params || {};
    if (!params.reportId) throw new Error('reportId is required');
    var actor = params.actor || (' 审核员');
    return commit(function (state) {
      var report = findReport(state, params.reportId);
      if (!report) throw new Error('report not found: ' + params.reportId);
      var ver = report.versions[report.versions.length - 1];
      if (params.summary != null) ver.summary = params.summary;
      if (params.healthLevel != null) ver.healthLevel = params.healthLevel;
      if (params.healthScore != null) ver.healthScore = params.healthScore;
      report.updatedAt = nowIso();
      report.contentUpdatedAt = nowIso();
      report.contentUpdatedBy = actor;
      return report;
    });
  }

  /** 审核更新发现说明 */
  function updateFinding(params) {
    params = params || {};
    if (!params.findingId) throw new Error('findingId is required');
    var actor = params.actor || (' 审核员');
    return commit(function (state) {
      var finding = state.findings.find(function (f) { return f.id === params.findingId; });
      if (!finding) throw new Error('finding not found: ' + params.findingId);
      if (params.description != null) finding.description = params.description;
      if (params.consumer != null) {
        finding.consumer = params.consumer;
        finding.description = params.consumer;
      }
      if (params.professional != null) finding.professional = params.professional;
      if (params.conclusion != null) finding.conclusion = params.conclusion;
      if (params.riskLevel != null) finding.riskLevel = params.riskLevel;
      finding.updatedAt = nowIso();
      finding.updatedBy = actor;
      return finding;
    });
  }

  function getProductListingStatus(product) {
    if (!product) return 'recycled';
    if (product.deleted || product.status === 'recycled') return 'recycled';
    if (product.status) return product.status;
    if (!product.available) return 'off_shelf';
    var stock = product.stock != null ? product.stock : 1;
    if (stock <= 0) return 'zero_stock';
    return 'on_sale';
  }

  function normalizeRelatedProductIds(state, primaryProductId, relatedProductIds) {
    var seen = {};
    var normalized = [];
    (relatedProductIds || []).forEach(function (id) {
      if (!id || id === primaryProductId || seen[id]) return;
      if (!findProduct(state, id)) return;
      seen[id] = true;
      if (normalized.length < 3) normalized.push(id);
    });
    return normalized;
  }

  function searchProductsForPicker(state, options) {
    options = options || {};
    state = state || loadState();
    var q = (options.q || '').trim();
    var qLower = q.toLowerCase();
    var categoryId = options.categoryId || null;
    var status = options.status || null;
    var page = Math.max(1, parseInt(options.page, 10) || 1);
    var pageSize = Math.max(1, parseInt(options.pageSize, 10) || 20);
    var includeProductIds = options.includeProductIds || [];

    var filtered = (state.products || []).filter(function (product) {
      var listingStatus = getProductListingStatus(product);
      if (listingStatus === 'recycled' || product.deleted) {
        return includeProductIds.indexOf(product.id) >= 0;
      }
      if (categoryId && product.categoryId !== categoryId) return false;
      if (status && listingStatus !== status) return false;
      if (q) {
        var nameMatch = (product.name || '').toLowerCase().indexOf(qLower) >= 0;
        var spu = product.spuId || product.id;
        var idMatch = String(spu).toLowerCase() === qLower || String(product.id).toLowerCase() === qLower;
        if (!nameMatch && !idMatch) return false;
      }
      return true;
    });

    var total = filtered.length;
    var start = (page - 1) * pageSize;
    var items = filtered.slice(start, start + pageSize).map(function (product) {
      return {
        id: product.id,
        spuId: product.spuId || product.id,
        name: product.name,
        categoryId: product.categoryId,
        status: getProductListingStatus(product),
        stock: product.stock,
        available: product.available
      };
    });

    return {
      items: items,
      total: total,
      page: page,
      pageSize: pageSize
    };
  }

  /** 审核更新推荐映射 */
  function updateRecommendation(params) {
    params = params || {};
    if (!params.recommendationId) throw new Error('recommendationId is required');
    var actor = params.actor || (' 审核员');
    return commit(function (state) {
      var rec = state.recommendations.find(function (r) { return r.id === params.recommendationId; });
      if (!rec) throw new Error('recommendation not found: ' + params.recommendationId);
      if (params.label != null) rec.label = params.label;
      if (params.reason != null) rec.reason = params.reason;
      if (params.targetType != null) rec.targetType = params.targetType;
      if (params.primaryProductId !== undefined) {
        rec.primaryProductId = params.primaryProductId;
        rec.productId = params.primaryProductId;
      } else if (params.productId !== undefined) {
        rec.productId = params.productId;
        rec.primaryProductId = params.productId;
      }
      if (params.categoryId !== undefined) rec.categoryId = params.categoryId;
      if (params.relatedProductIds !== undefined) rec.relatedProductIds = params.relatedProductIds;

      var primaryProductId = rec.primaryProductId || rec.productId || null;
      rec.relatedProductIds = normalizeRelatedProductIds(state, primaryProductId, rec.relatedProductIds || []);

      var resolved = resolveRecommendationTarget({
        targetType: rec.targetType,
        primaryProductId: primaryProductId,
        relatedProductIds: rec.relatedProductIds,
        label: rec.label
      }, state);
      rec.resolvedType = resolved.resolvedType;
      rec.resolvedProductId = resolved.resolvedProductId;
      rec.availability = resolved.availability;
      rec.relatedProductIds = resolved.relatedProductIds;
      rec.candidateProductIds = resolved.candidateProductIds;
      rec.updatedAt = nowIso();
      rec.updatedBy = actor;
      return rec;
    });
  }

  /** 门店预绑定宠物 */
  function preBindPetToStore(params) {
    params = params || {};
    if (!params.petId || !params.storeId) {
      throw new Error('petId and storeId are required');
    }
    return commit(function (state) {
      var pet = findPet(state, params.petId);
      if (!pet) throw new Error('pet not found: ' + params.petId);
      var store = state.stores.find(function (s) { return s.id === params.storeId; });
      if (!store) throw new Error('store not found: ' + params.storeId);
      pet.storeId = params.storeId;
      pet.claimStatus = 'pre_bound';
      return pet;
    });
  }

  /**
   * 解析推荐目标：基于手动 primaryProductId + relatedProductIds
   * @param {{ targetType?: string, primaryProductId?: string, productId?: string, relatedProductIds?: string[], label?: string }} params
   * @param {object} [stateOverride]
   */
  function resolveRecommendationTarget(params, stateOverride) {
    params = params || {};
    var state = stateOverride || loadState();
    var targetType = params.targetType || 'PRODUCT';
    var primaryProductId = params.primaryProductId || params.productId || null;
    var relatedProductIds = normalizeRelatedProductIds(state, primaryProductId, params.relatedProductIds || []);

    var result = {
      requestedType: targetType,
      requestedProductId: primaryProductId,
      primaryProductId: primaryProductId,
      relatedProductIds: relatedProductIds.slice(),
      resolvedType: 'NONE',
      resolvedProductId: null,
      availability: 'NO_CANDIDATES',
      candidateProductIds: relatedProductIds.slice(),
      label: params.label || ' 无推荐'
    };

    if (targetType !== 'PRODUCT' || !primaryProductId) {
      return result;
    }

    var product = findProduct(state, primaryProductId);
    if (!product) {
      result.availability = 'UNAVAILABLE';
      return result;
    }

    result.resolvedType = 'PRODUCT';
    result.resolvedProductId = primaryProductId;

    if (!product.available) {
      result.availability = 'UNAVAILABLE';
      result.label = params.label || (' 推荐产品: ' + product.name + '（不可用）');
      return result;
    }

    var stock = product.stock != null ? product.stock : 1;
    if (stock <= 0) {
      result.availability = 'ZERO_STOCK';
      result.label = params.label || (' 推荐产品: ' + product.name + '（零库存）');
      return result;
    }

    result.availability = 'AVAILABLE';
    result.label = params.label || (' 推荐产品: ' + product.name);
    return result;
  }

  function createPlatformUser(params) {
    params = params || {};
    return commit(function (state) {
      var user = {
        id: bumpIds(state, 'users', 'user'),
        name: params.name || (' 新用户'),
        phone: params.phone,
        address: params.address || null,
        createdAt: nowIso()
      };
      state.users.push(user);
      return user;
    });
  }

  function updatePlatformUser(userId, params) {
    params = params || {};
    return commit(function (state) {
      var user = findUser(state, userId);
      if (!user) throw new Error('user not found');
      if (params.name != null) user.name = params.name;
      if (params.phone != null) user.phone = params.phone;
      if (params.address != null) user.address = params.address;
      return user;
    });
  }

  function updateOpsPet(petId, params) {
    params = params || {};
    return commit(function (state) {
      var pet = findPet(state, petId);
      if (!pet) throw new Error('pet not found');
      if (params.name != null) pet.name = params.name;
      if (params.breed != null) pet.breed = params.breed;
      if (params.age != null) pet.age = params.age;
      if (params.gender != null) pet.gender = params.gender;
      if (params.species != null) pet.species = params.species;
      if (params.birthDate != null) pet.birthDate = params.birthDate;
      if (params.storeId !== undefined) pet.storeId = params.storeId;
      if (params.userId !== undefined && params.userId !== pet.userId) {
        if (!params.reason || !String(params.reason).trim()) {
          throw new Error('变更关联用户时必须填写原因');
        }
        if (!state.petUserAssociationChanges) state.petUserAssociationChanges = [];
        state.petUserAssociationChanges.push({
          id: bumpIds(state, 'petUserAssociationChanges', 'petuser'),
          petId: petId,
          fromUserId: pet.userId || null,
          toUserId: params.userId || null,
          actor: params.actor || '运营专员',
          reason: String(params.reason).trim(),
          createdAt: nowIso()
        });
        pet.userId = params.userId || null;
        pet.claimStatus = pet.userId ? 'bound' : 'unassigned';
        syncPetLinkedEntities(state, petId, pet.userId);
      }
      return pet;
    });
  }

  function updateProfessionalCatalog(mutator) {
    return commit(function (state) {
      ensureDomainState(state);
      var result = mutator(state.professionalCatalog, state);
      return result !== undefined ? result : state.professionalCatalog;
    });
  }

  function saveTaxonEdu(taxonKey, patch) {
    patch = patch || {};
    return updateProfessionalCatalog(function (catalog) {
      if (!catalog.microbiotaTaxa) catalog.microbiotaTaxa = [];
      var taxon = catalog.microbiotaTaxa.find(function (item) {
        return item.key === taxonKey;
      });
      if (!taxon) throw new Error('taxon not found: ' + taxonKey);
      if (patch.latinName !== undefined) taxon.latinName = patch.latinName;
      if (patch.value !== undefined) taxon.value = patch.value;
      if (patch.edu !== undefined) {
        taxon.edu = taxonEduForLevel(taxon, Object.assign({}, taxon.edu || {}, patch.edu || {}));
      }
      return taxon;
    });
  }

  function getMicrobiotaPresentation() {
    var state = loadState();
    var catalog = state.professionalCatalog || defaultCatalog();
    return clone(normalizeMicrobiotaPresentation(catalog.microbiotaPresentation, true));
  }

  function saveMicrobiotaPresentation(patch) {
    patch = patch || {};
    return updateProfessionalCatalog(function (catalog) {
      var current = catalog.microbiotaPresentation || defaultMicrobiotaPresentation();
      catalog.microbiotaPresentation = normalizeMicrobiotaPresentation(
        Object.assign({}, current, patch),
        false
      );
      catalog.meta = catalog.meta || {};
      catalog.meta.version = Math.max(catalog.meta.version || 0, 9);
      return catalog.microbiotaPresentation;
    });
  }

  function updateAnalysisState(mutator) {
    return commit(function (state) {
      ensureDomainState(state);
      return mutator(state);
    });
  }

  function saveReportAssessment(reportId, params, actor) {
    params = params || {};
    actor = actor || (' 审核员');
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found');
      var ver = getWorkingReportVersion(state, reportId);
      if (!ver) throw new Error('working version not found');

      if (params.reportSpecies != null) report.reportSpecies = params.reportSpecies;
      if (params.healthLevel != null) ver.healthLevel = params.healthLevel;
      if (params.healthScore != null) ver.healthScore = params.healthScore;
      if (params.percentile != null) ver.percentile = params.percentile;
      if (params.summary != null) ver.summary = params.summary;
      if (params.platformDimensions != null) {
        ver.platformDimensions = clone(params.platformDimensions);
      }
      report.updatedAt = nowIso();
      report.contentUpdatedAt = report.updatedAt;
      report.contentUpdatedBy = actor;
      appendOperationRecord(state, {
        type: 'assessment_saved',
        reportId: reportId,
        version: ver.version,
        actor: actor
      });
      return report;
    });
  }

  function saveAnalysisFinalContent(reportId, finalContent, actor) {
    actor = actor || (' 审核员');
    finalContent = finalContent || {};
    return commit(function (state) {
      ensureDomainState(state);
      var run = getLatestAnalysisRun(state, reportId);
      if (!run) throw new Error('no analysis run for report');
      if (!run.adjustments) run.adjustments = { excludedHits: [], manualFindings: [], finalContent: {} };
      run.adjustments.finalContent = Object.assign({}, run.adjustments.finalContent || {}, finalContent, {
        updatedAt: nowIso(),
        updatedBy: actor
      });
      appendOperationRecord(state, {
        type: 'analysis_final_saved',
        reportId: reportId,
        runId: run.id,
        actor: actor
      });
      return run;
    });
  }

  function rejectReportToIncomplete(reportId, reason, actor) {
    actor = actor || (' 审核员');
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found');
      var ver = getWorkingReportVersion(state, reportId);
      report.status = 'rejected';
      report.workflowStatus = 'incomplete';
      report.updatedAt = nowIso();
      if (!report.todoFlags) report.todoFlags = [];
      if (report.todoFlags.indexOf('rejected') < 0) report.todoFlags.push('rejected');
      if (ver) {
        ver.status = 'rejected';
        ver.rejectReason = reason || (' 审核退回待完善');
      }
      var tr = findTestRecord(state, report.testRecordId);
      if (tr && tr.status === 'import_failed') {
        tr.status = 'pending_review';
        tr.updatedAt = nowIso();
      } else if (tr) {
        tr.updatedAt = nowIso();
      }
      syncReportWorkflow(report, tr, state);
      appendOperationRecord(state, {
        type: 'reject_to_incomplete',
        reportId: reportId,
        reason: reason,
        actor: actor
      });
      return report;
    });
  }

  function reviewCorrectionDraft(reportId, decision, reason, actor) {
    actor = actor || (' 审核员');
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report || !report.correctionDraftActive) throw new Error('no active correction draft');
      var ver = getWorkingReportVersion(state, reportId);
      if (!ver) throw new Error('working version not found');
      ver.correctionReviewStatus = decision === 'approved' ? 'approved' : 'rejected';
      if (decision === 'rejected') {
        ver.correctionRejectReason = reason || '';
      }
      report.updatedAt = nowIso();
      appendOperationRecord(state, {
        type: decision === 'approved' ? 'correction_review_approved' : 'correction_review_rejected',
        reportId: reportId,
        version: ver.version,
        reason: reason || null,
        actor: actor
      });
      return report;
    });
  }

  function createCorrectionDraftExtended(reportId, params) {
    params = params || {};
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      if (report.workflowStatus !== 'published' && report.status !== 'published' && report.status !== 'corrected') {
        throw new Error('only published reports can create correction draft');
      }
      var pubVer = getPublishedReportVersion(state, reportId);
      var reportSpecies = report.reportSpecies;
      if (!report.correctionDraftActive) {
        createCorrectionDraftInternal(state, report, params);
        appendOperationRecord(state, {
          type: 'correction_draft',
          reportId: report.id,
          version: report.workingVersion
        });
      }
      var workVer = getWorkingReportVersion(state, reportId);
      if (pubVer && workVer) copyPublishedAssessmentFields(pubVer, workVer);
      if (reportSpecies) report.reportSpecies = reportSpecies;
      return report;
    });
  }

  // Initialize from storage or seed on first load
  loadState();

  return {
    STORAGE_KEY: STORAGE_KEY,
    DEMO_LABEL: DEMO_LABEL,
    DATA_STATUSES: DATA_STATUSES,
    CONCLUSION_LEVELS: CONCLUSION_LEVELS,
    normalizeDataStatus: normalizeDataStatus,
    isPresentDataStatus: isPresentDataStatus,
    REPORT_STATUSES: REPORT_STATUSES,
    RECOMMEND_TYPES: RECOMMEND_TYPES,
    HEALTH_LEVELS: HEALTH_LEVELS,
    WORKFLOW_STATUSES: WORKFLOW_STATUSES,
    USER_REPORT_STATUSES: USER_REPORT_STATUSES,
    OWNERSHIP_STATUSES: OWNERSHIP_STATUSES,
    TODO_FLAG_LABELS: TODO_FLAG_LABELS,
    DEFAULT_SOURCE_ORG_ID: DEFAULT_SOURCE_ORG_ID,
    getState: getState,
    peekState: peekState,
    reset: reset,
    subscribe: subscribe,
    registerTest: registerTest,
    simulateExcelImportSuccess: simulateExcelImportSuccess,
    simulateExcelImportFailure: simulateExcelImportFailure,
    simulateBatchImport: simulateBatchImport,
    checkDuplicateImport: checkDuplicateImport,
    generateReport: generateReport,
    submitReport: submitReport,
    rejectReport: rejectReport,
    approveReport: approveReport,
    publishReport: publishReport,
    createCorrectionDraft: createCorrectionDraft,
    publishCorrection: publishCorrection,
    voidReport: voidReport,
    assignReportOwnership: assignReportOwnership,
    createOpsPet: createOpsPet,
    generateClaimCredential: generateClaimCredential,
    voidClaimCredential: voidClaimCredential,
    correctOwnership: correctOwnership,
    getWorkflowStatus: getWorkflowStatus,
    getTodoFlags: getTodoFlags,
    getPublishedVersionSnapshot: getPublishedVersionSnapshot,
    getWorkingVersionSnapshot: getWorkingVersionSnapshot,
    getUserReportStatus: getUserReportStatus,
    getUserVisibleReports: getUserVisibleReports,
    getUserPublishedReportProjection: getUserPublishedReportProjection,
    getPetPublishedReports: getPetPublishedReports,
    resolveHealthTagCandidates: resolveHealthTagCandidates,
    updateReportContent: updateReportContent,
    updateFinding: updateFinding,
    updateRecommendation: updateRecommendation,
    correctIndicator: correctIndicator,
    bindClaimCode: bindClaimCode,
    preBindPetToStore: preBindPetToStore,
    resolveRecommendationTarget: resolveRecommendationTarget,
    searchProductsForPicker: searchProductsForPicker,
    createPlatformUser: createPlatformUser,
    updatePlatformUser: updatePlatformUser,
    updateOpsPet: updateOpsPet,
    updateProfessionalCatalog: updateProfessionalCatalog,
    emptyTaxonEdu: emptyTaxonEdu,
    normalizeTaxonEdu: normalizeTaxonEdu,
    migrateLegacyEduFields: migrateLegacyEduFields,
    catalogParentGroupKey: catalogParentGroupKey,
    parseCatalogSortOrder: parseCatalogSortOrder,
    backfillMissingCatalogSortOrders: backfillMissingCatalogSortOrders,
    reorderCatalogCollectionBySortOrder: reorderCatalogCollectionBySortOrder,
    validateCatalogSiblingSortOrders: validateCatalogSiblingSortOrders,
    saveTaxonEdu: saveTaxonEdu,
    defaultMicrobiotaPresentation: defaultMicrobiotaPresentation,
    normalizeMicrobiotaPresentation: normalizeMicrobiotaPresentation,
    presentationKeyFromStatusClass: presentationKeyFromStatusClass,
    resolveMicrobiotaSceneStatusWord: resolveMicrobiotaSceneStatusWord,
    getMicrobiotaPresentation: getMicrobiotaPresentation,
    saveMicrobiotaPresentation: saveMicrobiotaPresentation,
    resolveEffectiveRangeForIndicator: function (indicator, species, options) {
      return resolveEffectiveRangeForIndicator(loadState(), indicator, species, options);
    },
    resolveSchemeRangeForIndicator: function (indicator, species) {
      var state = loadState();
      var catalog = state.professionalCatalog || defaultCatalog();
      var entry = findCatalogEntryByKey(state, indicator.key || indicator.rawImportName);
      return resolveSchemeRangeForIndicator(catalog, indicator, species, entry);
    },
    flattenSchemesToPlatformRanges: flattenSchemesToPlatformRanges,
    schemeHasValidItems: schemeHasValidItems,
    updateAnalysisState: updateAnalysisState,
    saveReportAssessment: saveReportAssessment,
    saveAnalysisFinalContent: saveAnalysisFinalContent,
    rejectReportToIncomplete: rejectReportToIncomplete,
    reviewCorrectionDraft: reviewCorrectionDraft,
    createCorrectionDraftExtended: createCorrectionDraftExtended,
    buildContentSnapshot: buildContentSnapshot
  };
});
