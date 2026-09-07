/**
 * PET 报告原型 — 跨端可重置 Mock 数据服务（v2）
 * 浏览器: window.PetReportMockStore（须先加载 analysis-engine.js）
 * Node:   require('./mock-store.js') → 内部 require('./analysis-engine.js')
 * 全部为演示 Mock 数据，非真实业务数据。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Engine = require('./analysis-engine.js');
    module.exports = factory(Engine);
  } else {
    if (!root.PetReportAnalysisEngine) {
      throw new Error('PetReportAnalysisEngine 未加载：请先引入 analysis-engine.js');
    }
    root.PetReportMockStore = factory(root.PetReportAnalysisEngine);
  }
})(typeof self !== 'undefined' ? self : this, function (Engine) {
  'use strict';

  if (!Engine || typeof Engine.evaluate !== 'function') {
    throw new Error('PetReportAnalysisEngine 不可用');
  }

  var STORAGE_KEY = 'pet-report-mock-store-v7';
  var LEGACY_STORAGE_KEYS = ['pet-report-mock-store-v5', 'pet-report-mock-store-v3'];
  var DATA_STATUSES = ['PRESENT', 'MISSING_COLUMN', 'EMPTY', 'NOT_DETECTED', 'INVALID', 'NOT_APPLICABLE'];
  var REPORT_STATUSES = ['unassigned', 'incomplete', 'pending_review', 'published', 'voided'];
  /** @deprecated 指向 REPORT_STATUSES */
  var WORKFLOW_STATUSES = REPORT_STATUSES;
  var OWNERSHIP_STATUSES = ['unassigned', 'bound'];
  var HEALTH_LEVELS = ['A', 'B', 'C', 'D', 'E'];
  var USER_REPORT_STATUSES = ['in_progress', 'published'];
  var DEFAULT_SOURCE_ORG_ID = 'ORG-LAB-GUT-001';
  var SECOND_SOURCE_ORG_ID = 'ORG-LAB-GUT-002';
  var VERSION_STATUSES = ['draft', 'pending_review', 'published', 'superseded'];
  var SUBMISSION_TYPES = ['in_store', 'customer_brought'];
  var SUBMISSION_TYPE_LABELS = { in_store: '本店送检', customer_brought: '客户自带报告' };
  var UNIT_CONFIRM_STATUSES = ['unconfirmed', 'confirmed', 'invalidated'];
  var RANGE_SOURCES = ['imported', 'platform', 'none'];
  var IMPORTED_RANGE_DECISIONS = ['pending', 'confirmed', 'rejected'];
  var VALUE_SOURCES = ['import', 'manual'];
  var MISSING_DATA_STATUSES = ['MISSING_COLUMN', 'EMPTY', 'INVALID', 'NOT_APPLICABLE'];

  var REPORT_STATUS_LABELS = {
    unassigned: '待归属',
    incomplete: '待完善',
    pending_review: '待审核',
    published: '已发布',
    voided: '已作废'
  };
  var OWNERSHIP_STATUS_LABELS = { unassigned: '待归属', bound: '已绑定' };
  var TODO_FLAG_LABELS = {
    pending_reanalysis: '待重新分析',
    missing_unresolved: '缺失未处理',
    product_unavailable: '商品失效',
    user_unlinked: '未关联用户'
  };
  var LAB_NOTICE_LABELS = Engine.LAB_NOTICE_LABELS || { high: '实验室标注偏高', low: '实验室标注偏低', unmarked: '未标注' };
  var RANGE_STATUS_LABELS = Engine.RANGE_STATUS_LABELS || {
    low: '低于参考范围', normal: '参考范围内', high: '高于参考范围', no_range: '无有效参考范围'
  };
  var RANGE_SOURCE_LABELS = { imported: '报告导入', platform: '平台配置', none: '无范围' };
  var IMPORTED_RANGE_DECISION_LABELS = { pending: '待确认', confirmed: '已确认可用', rejected: '已驳回' };
  /** 风险级别不再作为运营配置概念；仅保留存储占位，不参与裁决或商品。 */
  var RISK_LEVEL_LABELS = { low: '低', medium: '中', high: '高', notice: '仅提示' };
  var CONDITION_TYPE_LABELS = {
    LAB_NOTICE: '实验室标注',
    RANGE_STATUS: '相对有效参考范围',
    NOT_DETECTED: '未检出',
    VALUE_THRESHOLD: '有效值门槛',
    SPECIES: '报告物种',
    OTHER_TAXON_STATUS: '其他分类单元状态'
  };
  var UNIT_CONFIRM_LABELS = { unconfirmed: '未确认', confirmed: '已确认', invalidated: '依据变化失效' };
  var VERSION_STATUS_LABELS = { draft: '草稿', pending_review: '待审核', published: '已发布', superseded: '已替代' };
  var PRODUCT_STATUS_LABELS = { on_sale: '在售', off_shelf: '已下架', zero_stock: '零库存', recycled: '已回收' };

  var listeners = [];
  var memoryState = null;
  var localStorageAvailable = detectLocalStorage();
  var frozenNow = null;
  var DEFAULT_ACTOR_FIXTURE = { actorId: 'admin-demo', actor: '管理员', roles: ['editor', 'reviewer'] };
  var ACTOR_PROFILE_MAP = {
    default: { actorId: 'admin-demo', actor: '后台管理员（编制+审核）', roles: ['editor', 'reviewer'] },
    editor: { actorId: 'admin-editor', actor: '编制员', roles: ['editor'] },
    reviewer: { actorId: 'admin-reviewer', actor: '审核员', roles: ['reviewer'] },
    dual: { actorId: 'admin-dual', actor: '双权限账号', roles: ['editor', 'reviewer'] },
    readonly: { actorId: 'admin-readonly', actor: '只读账号', roles: ['readonly'], readOnly: true }
  };
  var actorFixture = clone(DEFAULT_ACTOR_FIXTURE);
  var ACTION_PERMISSIONS = {
    submitReport: ['editor'],
    withdrawReport: ['editor'],
    rejectReport: ['reviewer'],
    publishReport: ['reviewer'],
    voidReport: ['reviewer'],
    registerTest: ['editor'],
    savePhylumUnitProducts: ['editor', 'reviewer'],
    saveReportAssessment: ['editor', 'reviewer'],
    savePhylumUnitDraft: ['editor', 'reviewer'],
    saveProfessionalCatalog: ['editor']
  };

  function detectLocalStorage() {
    try {
      if (typeof localStorage === 'undefined') return false;
      var probe = '__pet_mock_probe_v2__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  function nowIso() {
    return frozenNow || new Date().toISOString();
  }

  function withTime(iso, fn) {
    var prev = frozenNow;
    frozenNow = iso;
    try { return fn(); } finally { frozenNow = prev; }
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function hashString(value) {
    var hash = 2166136261;
    var text = String(value || '');
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
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
    return out.slice(0, 3);
  }

  function emptyTaxonEdu() {
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

  function normalizeTaxonEdu(edu) {
    var src = edu && typeof edu === 'object' ? edu : {};
    return {
      sceneCopy: pickFirstNonEmpty(src.sceneCopy, src.narrativeRole, src.metaphor, src.sceneRole),
      introText: pickFirstNonEmpty(src.introText),
      mainTasks: normalizeMainTasks(src.mainTasks),
      appearanceText: pickFirstNonEmpty(src.appearanceText, src.appearance),
      functionText: pickFirstNonEmpty(src.functionText),
      hint: pickFirstNonEmpty(src.hint, src.normalHint, src.lowHint, src.highHint, src.tooLowHint, src.tooHighHint),
      knowledgeText: pickFirstNonEmpty(src.knowledgeText)
    };
  }

  function migrateLegacyEduFields(edu, level) {
    var out = normalizeTaxonEdu(edu);
    if (level === 'phylum' && !out.introText && out.knowledgeText) out.introText = out.knowledgeText;
    if (level !== 'phylum' && !out.functionText && out.knowledgeText) out.functionText = out.knowledgeText;
    return out;
  }

  function taxonEduForLevel(taxon, eduPatch) {
    return migrateLegacyEduFields(eduPatch || (taxon && taxon.edu) || {}, taxon && taxon.level);
  }

  function isEmptyEduField(key, value) {
    if (key === 'mainTasks') return !Array.isArray(value) || !value.length;
    return value == null || value === '';
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

  function defaultIndicators() {
    return [
      { id: 'ti-alpha', key: 'alpha-diversity', label: 'Alpha多样性', value: '菌群 Alpha 多样性指数', standardUnit: 'index', parentKey: null },
      { id: 'ti-evenness', key: 'evenness', label: '均匀度', value: '菌群均匀度指标', standardUnit: 'index', parentKey: null },
      { id: 'ti-richness', key: 'richness', label: '丰富度', value: '菌群丰富度指标', standardUnit: 'count', parentKey: null },
      { id: 'ti-shannon', key: 'Shannon指数', label: 'Shannon指数', value: 'Shannon 多样性指数', standardUnit: 'index', parentKey: null }
    ];
  }
  var defaultTestIndicators = defaultIndicators;

  function defaultMicrobiotaPresentation() {
    return { low: '略显稀疏', normal: '生机适宜', high: '略显繁茂' };
  }

  function normalizeMicrobiotaPresentation(pres, fillDefaults) {
    var defaults = defaultMicrobiotaPresentation();
    var src = pres && typeof pres === 'object' ? pres : {};
    function val(key) {
      if (src[key] === undefined) return fillDefaults ? defaults[key] : '';
      if (src[key] == null) return '';
      return String(src[key]).trim();
    }
    return { low: val('low'), normal: val('normal'), high: val('high') };
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
    return pres[key] ? String(pres[key]).trim() : '';
  }

  function taxon(spec) {
    return {
      id: spec.id,
      key: spec.key,
      label: spec.label,
      latinName: spec.latinName || spec.key,
      value: spec.value || '',
      level: spec.level,
      parentKey: spec.parentKey || null,
      edu: normalizeTaxonEdu(spec.edu || {})
    };
  }

  function defaultMicrobiotaTaxa() {
    return [
      taxon({ id: 'tax-firmi', key: 'Firmicutes', label: '厚壁菌门', latinName: 'Firmicutes', level: 'phylum',
        value: '包含多种重要菌属，需保持适当比例',
        edu: { sceneCopy: '强壮的食草者', knowledgeText: '发酵植物纤维，产生短链脂肪酸，参与能量代谢相关过程。' } }),
      taxon({ id: 'tax-bactero', key: 'Bacteroidetes', label: '拟杆菌门', latinName: 'Bacteroidetes', level: 'phylum',
        value: '肠道内重要菌群，参与营养物质消化吸收',
        edu: {
          sceneCopy: '活跃的采集者',
          introText: '拟杆菌门（Bacteroidetes）就像是灵活的杂食动物——比如浣熊或野猪。',
          mainTasks: ['吃各种食物（脂肪、肉类、纤维都吃）', '分解复杂的营养物质，制造营养', '维持肠道的多样性和平衡。'],
          hint: '如果这些「杂食动物」太少，可能说明饮食单一，肠道吸收不佳。',
          knowledgeText: '处理脂肪和蛋白类食物，分解复杂多糖，参与营养物质的分解与转化。'
        } }),
      taxon({ id: 'tax-proteo', key: 'Proteobacteria', label: '变形菌门', latinName: 'Proteobacteria', level: 'phylum',
        value: '包含潜在有害菌，应控制在较低水平',
        edu: { sceneCopy: '需要留意的过客', hint: '数量通常应保持较低水平。', knowledgeText: '在肠道中数量通常较少，参与部分代谢产物处理。' } }),
      taxon({ id: 'tax-actino', key: 'Actinobacteria', label: '放线菌门', latinName: 'Actinobacteria', level: 'phylum',
        value: '主要包含有益菌群，对肠道健康至关重要',
        edu: { sceneCopy: '药草与苔藓', hint: '放线菌门含量适宜有助于维持肠道屏障。', knowledgeText: '分解复杂有机物，参与有机酸代谢，维持菌群多样性。' } }),
      taxon({ id: 'tax-fuso', key: 'Fusobacteria', label: '梭杆菌门', latinName: 'Fusobacteria', level: 'phylum',
        value: '含量通常较低，过高可能提示菌群失衡',
        edu: { sceneCopy: '低调的清道夫', hint: '含量通常较低。', knowledgeText: '在肠道中数量通常较少，参与残留有机物分解。' } }),
      taxon({ id: 'tax-bact', key: 'Bacteroides', label: 'Bacteroides属', latinName: 'Bacteroides', level: 'genus', parentKey: 'Bacteroidetes',
        value: '拟杆菌门常见属',
        edu: { sceneCopy: '野猪', appearanceText: '迅速繁殖的小团体，偶尔会惹麻烦。', functionText: '擅长处理蛋白质、脂肪与多糖，是代谢核心成员。', hint: '核心代谢成员，数量需保持适中。', knowledgeText: '迅速增殖的小团体。擅长处理蛋白质、脂肪和多糖。' } }),
      taxon({ id: 'tax-fuso-g', key: 'Fusobacterium', label: 'Fusobacterium属', latinName: 'Fusobacterium', level: 'genus', parentKey: 'Fusobacteria',
        value: '梭杆菌门常见属',
        edu: { sceneCopy: '清道夫', hint: '未检出或过低时需结合其他指标判断。', knowledgeText: '梭杆菌门常见成员，参与残留有机物分解。' } }),
      taxon({ id: 'tax-esh', key: 'Escherichia-Shigella', label: 'Escherichia-Shigella属', latinName: 'Escherichia-Shigella', level: 'genus', parentKey: 'Proteobacteria',
        value: '变形菌门常见属',
        edu: { sceneCopy: '过客', hint: '正常情况下含量很少。', knowledgeText: '肠道中数量通常很少的常见菌属。' } }),
      taxon({ id: 'tax-coll', key: 'Collinsella', label: 'Collinsella属', latinName: 'Collinsella', level: 'genus', parentKey: 'Actinobacteria',
        value: '放线菌门常见属',
        edu: { sceneCopy: '药草', hint: '放线菌门中常见的小型成员。', knowledgeText: '参与碳水分解与胆汁酸相关代谢。' } }),
      taxon({ id: 'tax-strep', key: 'Streptococcus', label: 'Streptococcus属', latinName: 'Streptococcus', level: 'genus', parentKey: 'Firmicutes',
        value: '厚壁菌门常见属',
        edu: { sceneCopy: '小型发酵者', hint: '常见于口腔与肠道。', knowledgeText: '厚壁菌门常见属，参与糖类发酵。' } }),
      taxon({ id: 'tax-pept', key: 'Peptacetobacter', label: 'Peptacetobacter属', latinName: 'Peptacetobacter', level: 'genus', parentKey: 'Firmicutes',
        value: '善于发酵碳水，产生短链脂肪酸',
        edu: { sceneCopy: '大象', hint: '纤维发酵者，产出短链脂肪酸。', knowledgeText: '厚壁菌门中的纤维发酵者。' } }),
      taxon({ id: 'tax-proteus', key: 'Proteus', label: 'Proteus属', latinName: 'Proteus', level: 'genus', parentKey: 'Proteobacteria',
        value: '变形菌门条件致病属',
        edu: { sceneCopy: '需留意的过客', hint: '含量偏高时需关注。', knowledgeText: '变形菌门成员，正常情况下含量很低。' } }),
      taxon({ id: 'tax-kleb', key: 'Klebsiella', label: 'Klebsiella属', latinName: 'Klebsiella', level: 'genus', parentKey: 'Proteobacteria',
        value: '变形菌门条件致病属',
        edu: { sceneCopy: '需留意的过客', hint: '含量偏高时需关注。', knowledgeText: '变形菌门成员，正常情况下含量很低。' } }),
      taxon({ id: 'tax-medi', key: 'Mediterraneibacter', label: 'Mediterraneibacter属', latinName: 'Mediterraneibacter', level: 'genus', parentKey: 'Firmicutes',
        value: '厚壁菌门常见属',
        edu: { sceneCopy: '食草者', hint: '参与纤维发酵。', knowledgeText: '厚壁菌门常见属。' } }),
      taxon({ id: 'tax-pseudo', key: 'Pseudomonas', label: 'Pseudomonas属', latinName: 'Pseudomonas', level: 'genus', parentKey: 'Proteobacteria',
        value: '变形菌门常见属',
        edu: { sceneCopy: '过客', hint: '含量通常极低。', knowledgeText: '环境相关菌属，肠道中通常很少。' } })
    ];
  }

  function rangeItem(targetType, targetKey, taxonomyLevel, minValue, maxValue, unit, notes) {
    return {
      targetType: targetType,
      targetKey: targetKey,
      taxonomyLevel: taxonomyLevel,
      minValue: minValue,
      maxValue: maxValue,
      unit: unit,
      notes: notes || ''
    };
  }

  function defaultRangeItems() {
    return [
      rangeItem('microbiota', 'Actinobacteria', 'phylum', 25, 45, '%', '放线菌门'),
      rangeItem('microbiota', 'Bacteroidetes', 'phylum', 15, 40, '%', '拟杆菌门'),
      rangeItem('microbiota', 'Firmicutes', 'phylum', 25, 50, '%', '厚壁菌门'),
      rangeItem('microbiota', 'Fusobacteria', 'phylum', 0, 8, '%', '梭杆菌门'),
      rangeItem('microbiota', 'Proteobacteria', 'phylum', 0, 12, '%', '变形菌门'),
      rangeItem('microbiota', 'Bacteroides', 'genus', 12, 20, '%', 'Bacteroides'),
      rangeItem('microbiota', 'Fusobacterium', 'genus', 0, 5, '%', 'Fusobacterium'),
      rangeItem('microbiota', 'Escherichia-Shigella', 'genus', 0, 5, '%', 'Escherichia-Shigella'),
      rangeItem('microbiota', 'Collinsella', 'genus', 3, 8, '%', 'Collinsella'),
      rangeItem('microbiota', 'Streptococcus', 'genus', 1, 5, '%', 'Streptococcus'),
      rangeItem('microbiota', 'Peptacetobacter', 'genus', 3, 8, '%', 'Peptacetobacter'),
      rangeItem('microbiota', 'Proteus', 'genus', 0, 2, '%', 'Proteus'),
      rangeItem('microbiota', 'Klebsiella', 'genus', 0, 3, '%', 'Klebsiella'),
      rangeItem('microbiota', 'Mediterraneibacter', 'genus', 1, 8, '%', 'Mediterraneibacter'),
      rangeItem('microbiota', 'Pseudomonas', 'genus', 0, 1, '%', 'Pseudomonas'),
      rangeItem('indicator', 'alpha-diversity', null, 3, 5.5, 'index', 'Alpha 多样性')
    ];
  }

  function defaultPlatformRanges() {
    var items = defaultRangeItems();
    var out = [];
    ['cat', 'dog'].forEach(function (species) {
      items.forEach(function (item, idx) {
        out.push({
          id: 'pr-' + species + '-' + String(idx + 1).padStart(3, '0'),
          species: species,
          targetType: item.targetType,
          targetKey: item.targetKey,
          taxonomyLevel: item.taxonomyLevel,
          minValue: item.minValue,
          maxValue: item.maxValue,
          unit: item.unit,
          status: 'active',
          notes: (species === 'cat' ? '猫科 ' : '犬科 ') + (item.notes || item.targetKey),
          createdAt: '2025-01-15T10:30:00.000Z'
        });
      });
    });
    return out;
  }

  function platformRangeItemKey(item) {
    return [item.targetType || '', item.targetKey || '', item.taxonomyLevel || '', item.unit || ''].join('\0');
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
    var evidence = '检测机构内部参考范围';
    var flat = defaultPlatformRanges();
    var catItems = schemeItemsFromPlatformRanges(flat.filter(function (r) { return r.species === 'cat'; }));
    var dogItems = schemeItemsFromPlatformRanges(flat.filter(function (r) { return r.species === 'dog'; }));
    return [
      {
        id: 'rrs-cat-gut-001', name: '猫科肠道菌群检测', templateId: DEFAULT_SOURCE_ORG_ID,
        methodName: '16S 肠道菌群检测', applicableSpecies: ['cat'], evidenceType: 'internal',
        evidenceRef: evidence, status: 'active', version: 1, items: catItems,
        createdAt: '2025-01-15T10:00:00.000Z', updatedAt: '2025-01-15T10:00:00.000Z'
      },
      {
        id: 'rrs-dog-gut-001', name: '犬科肠道菌群检测', templateId: DEFAULT_SOURCE_ORG_ID,
        methodName: '16S 肠道菌群检测', applicableSpecies: ['dog'], evidenceType: 'internal',
        evidenceRef: evidence, status: 'active', version: 1, items: dogItems,
        createdAt: '2025-01-15T11:00:00.000Z', updatedAt: '2025-01-15T11:00:00.000Z'
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
            schemeId: scheme.id, species: species, templateId: scheme.templateId,
            targetType: item.targetType, targetKey: item.targetKey,
            taxonomyLevel: item.taxonomyLevel || null,
            minValue: item.minValue, maxValue: item.maxValue, unit: item.unit,
            notes: item.notes || scheme.evidenceRef || '', status: scheme.status,
            createdAt: scheme.createdAt, updatedAt: scheme.updatedAt
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
    return (scheme && scheme.items || []).some(function (item) {
      return item.minValue != null && item.maxValue != null && item.unit && item.minValue < item.maxValue;
    });
  }

  function speciesListsOverlap(a, b) {
    a = a || [];
    b = b || [];
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) >= 0) return true;
    }
    return false;
  }

  function findActiveSchemeConflict(schemes, candidate) {
    if (!candidate || candidate.status !== 'active') return null;
    var templateId = candidate.templateId;
    if (!templateId) return null;
    var species = candidate.applicableSpecies || [];
    if (!species.length) return null;
    for (var i = 0; i < (schemes || []).length; i++) {
      var other = schemes[i];
      if (!other || other.status !== 'active') continue;
      if (candidate.id && other.id === candidate.id) continue;
      if (other.templateId !== templateId) continue;
      if (speciesListsOverlap(other.applicableSpecies, species)) return other;
    }
    return null;
  }

  function listKnownDetectionTemplates() {
    return [
      { id: DEFAULT_SOURCE_ORG_ID, name: '已知模板 001（16S 肠道菌群）' },
      { id: SECOND_SOURCE_ORG_ID, name: '已知模板 002（16S 肠道菌群）' }
    ];
  }

  function schemeItemOrderMap(scheme) {
    var map = {};
    ((scheme && scheme.items) || []).forEach(function (item, idx) {
      if (!item || !item.targetKey) return;
      if (map[item.targetKey] == null) map[item.targetKey] = idx;
    });
    return map;
  }

  function sortBySchemeItemOrder(list, scheme, getKey) {
    getKey = getKey || function (row) { return row && row.key; };
    var map = schemeItemOrderMap(scheme);
    return (list || []).slice().sort(function (a, b) {
      var ka = getKey(a);
      var kb = getKey(b);
      var ia = Object.prototype.hasOwnProperty.call(map, ka) ? map[ka] : 1e9;
      var ib = Object.prototype.hasOwnProperty.call(map, kb) ? map[kb] : 1e9;
      if (ia !== ib) return ia - ib;
      return 0;
    });
  }

  function findMatchingActiveScheme(catalog, templateId, species) {
    if (!templateId || !species) return null;
    var schemes = (catalog && catalog.referenceRangeSchemes) || [];
    for (var i = 0; i < schemes.length; i++) {
      var scheme = schemes[i];
      if (!scheme || scheme.status !== 'active') continue;
      if (scheme.templateId !== templateId) continue;
      if (!scheme.applicableSpecies || scheme.applicableSpecies.indexOf(species) < 0) continue;
      if (!schemeHasValidItems(scheme)) continue;
      return scheme;
    }
    return null;
  }

  function resolveReportSourceTemplateId(state, report) {
    if (!report) return null;
    var tr = report.testRecordId ? findTestRecord(state, report.testRecordId) : null;
    return (tr && tr.sourceOrgId) || report.sourceOrgId || null;
  }

  function findMatchingActiveSchemeForReport(state, report) {
    if (!report) return null;
    var catalog = state.professionalCatalog || defaultCatalog();
    return findMatchingActiveScheme(
      catalog,
      resolveReportSourceTemplateId(state, report),
      getReportSpecies(state, report)
    );
  }

  function normalizeImportedRangeDecision(result) {
    if (!result || !result.importedRange) return null;
    if (result.importedRange.min == null || result.importedRange.max == null) return null;
    if (result.importedRangeDecision === 'confirmed' || result.importedRangeDecision === 'rejected') {
      return result.importedRangeDecision;
    }
    return 'pending';
  }

  function hasConfirmedImportedRange(result) {
    if (!result || !result.importedRange) return false;
    if (result.importedRange.min == null || result.importedRange.max == null) return false;
    return normalizeImportedRangeDecision(result) === 'confirmed';
  }

  function defaultStandardUnits() {
    return [
      { id: 'su-001', templateId: DEFAULT_SOURCE_ORG_ID, fromUnit: '‰', toUnit: '%', factor: 0.1, note: '已知模板明确换算：千分比转百分比' }
    ];
  }

  function defaultCatalog() {
    var schemes = defaultReferenceRangeSchemes();
    return {
      breeds: defaultBreeds(),
      testIndicators: defaultIndicators(),
      microbiotaTaxa: defaultMicrobiotaTaxa(),
      microbiotaPresentation: defaultMicrobiotaPresentation(),
      referenceRangeSchemes: schemes,
      platformReferenceRanges: flattenSchemesToPlatformRanges(schemes),
      standardUnits: defaultStandardUnits(),
      meta: { version: 16, initializedAt: nowIso() }
    };
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
      if (!groupMap[gk]) { groupMap[gk] = []; groupOrder.push(gk); }
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
      if (item.parentKey && itemMap[item.parentKey]) itemMap[item.parentKey].children.push(node);
      else roots.push(node);
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
        if (so == null) { errors.push('序号须为正整数：' + (item.key || item.id)); return; }
        if (seen[so]) { errors.push('同级序号重复：' + so); return; }
        seen[so] = true;
      });
    });
    return errors;
  }

  function normalizeActorOptions(options) {
    if (typeof options === 'string') return { actor: options };
    return options || {};
  }

  function setActorFixture(profile) {
    if (!profile) {
      actorFixture = clone(DEFAULT_ACTOR_FIXTURE);
      return clone(actorFixture);
    }
    if (typeof profile === 'string') {
      var mapped = ACTOR_PROFILE_MAP[profile];
      if (!mapped) throw new Error('unknown actor fixture: ' + profile);
      profile = mapped;
    }
    actorFixture = Object.assign(clone(DEFAULT_ACTOR_FIXTURE), profile);
    if (profile.roles) {
      actorFixture.roles = Array.isArray(profile.roles) ? profile.roles.slice() : profile.roles;
    }
    if (profile.readOnly) actorFixture.roles = ['readonly'];
    return clone(actorFixture);
  }

  function resolvePermissionContext(options) {
    options = normalizeActorOptions(options);
    if (options.permissionProfile) {
      return {
        actorId: options.permissionProfile.actorId || options.actorId || actorFixture.actorId,
        actor: options.permissionProfile.actor || options.actor || actorFixture.actor,
        roles: (options.permissionProfile.roles || options.roles || actorFixture.roles || []).slice()
      };
    }
    return {
      actorId: options.actorId || actorFixture.actorId,
      actor: options.actor || actorFixture.actor,
      roles: (options.roles || actorFixture.roles || []).slice()
    };
  }

  function hasRole(context, role) {
    return (context.roles || []).indexOf(role) >= 0;
  }

  function assertActionPermission(action, options, report) {
    var required = ACTION_PERMISSIONS[action];
    var ctx = resolvePermissionContext(options);
    if (!required || !required.length) return ctx;
    var roles = ctx.roles || [];
    if (roles.indexOf('readonly') >= 0) {
      throw new Error('当前账号无权限执行：' + action);
    }
    for (var i = 0; i < required.length; i += 1) {
      if (roles.indexOf(required[i]) >= 0) {
        if (action === 'withdrawReport' && report) assertWithdrawSubmitter(report, ctx);
        return ctx;
      }
    }
    throw new Error('当前账号无权限执行：' + action);
  }

  function assertWithdrawSubmitter(report, ctx) {
    var submittedBy = report.submittedByActorId;
    if (!submittedBy) return;
    if (!ctx.actorId) throw new Error('仅原提交人可撤回报告');
    if (ctx.actorId === submittedBy) return;
    throw new Error('仅原提交人可撤回报告');
  }

  function isPendingReviewLikeReport(report) {
    if (!report) return false;
    if (report.status === 'pending_review') return true;
    return report.status === 'published' && getCorrectionDraftStageFromReport(report) === 'pending_review';
  }

  function validateAssessmentParams(params) {
    params = params || {};
    var errors = [];
    if (params.healthScore != null && params.healthScore !== '') {
      var n = Number(params.healthScore);
      if (!isFinite(n) || n < 0 || n > 100) errors.push('综合分须为 0–100');
    }
    if (params.healthLevel && HEALTH_LEVELS.indexOf(params.healthLevel) < 0) {
      errors.push('等级须为 A–E');
    }
    if (errors.length) throw new Error(errors.join('；'));
  }

  function assertProfessionalEditPermission(report, ctx) {
    assertResultsEditable(report);
    if (isPendingReviewLikeReport(report)) {
      if (!hasRole(ctx, 'reviewer')) {
        throw new Error('待审核报告仅审核人员可修订专业内容');
      }
      return;
    }
    if (!hasRole(ctx, 'editor')) {
      throw new Error('当前账号无权限编辑专业内容');
    }
  }

  function assertProductConfigurable(report) {
    if (!report) throw new Error('report not found');
    if (report.status === 'voided') throw new Error('已作废报告不可配置商品');
  }

  function getPermissionProfile() {
    return {
      actorId: actorFixture.actorId,
      actor: actorFixture.actor,
      roles: (actorFixture.roles || []).slice()
    };
  }

  function assertCatalogEditPermission() {
    var profile = getPermissionProfile();
    var roles = profile.roles || [];
    if (roles.indexOf('readonly') >= 0) {
      throw new Error('当前账号无权限编辑专业配置');
    }
    if (roles.indexOf('editor') >= 0) {
      return profile;
    }
    throw new Error('当前账号无权限编辑专业配置');
  }

  function migrateLegacyAnalysisRules(state) {
    var rules = state.analysisRuleCatalog || [];
    var activeByLineage = {};
    rules.forEach(function (rule) {
      var lineageId = rule.lineageId || rule.id;
      rule.lineageId = lineageId;
      if (rule.status === 'active') activeByLineage[lineageId] = rule;
    });
    rules.forEach(function (rule) {
      if (rule.status !== 'draft') return;
      var active = activeByLineage[rule.lineageId];
      if (!active) {
        rule.status = 'active';
        activeByLineage[rule.lineageId] = rule;
      } else {
        rule.status = 'inactive';
        rule.archivedReason = '兼容迁移：旧规则草稿未继续作为领域状态保留';
      }
    });
    rules.forEach(function (rule, index) {
      if (rule.status !== 'active') rule.status = 'inactive';
      if (rule.stableOrder == null) rule.stableOrder = index + 1;
      if (!rule.maintainer) rule.maintainer = '原型维护人未接入';
      if (!rule.reviewStatus) rule.reviewStatus = 'prototype_unreviewed';
      if (!rule.professionalBasis) rule.professionalBasis = '';
      if (!rule.applicableSpecies) rule.applicableSpecies = ['cat'];
      if (!rule.sourceTemplateIds) rule.sourceTemplateIds = [DEFAULT_SOURCE_ORG_ID, SECOND_SOURCE_ORG_ID];
    });
  }

  function ensureDomainState(state) {
    if (!state.professionalCatalog) state.professionalCatalog = defaultCatalog();
    if (!state.analysisRuleCatalog) state.analysisRuleCatalog = [];
    if (!state.analysisRuns) state.analysisRuns = [];
    if (!state.phylumAnalysisUnits) state.phylumAnalysisUnits = [];
    if (!state.operationRecords) state.operationRecords = [];
    if (!state.ownershipCorrections) state.ownershipCorrections = [];
    if (!state.petUserAssociationChanges) state.petUserAssociationChanges = [];
    if (!state.indicators) state.indicators = [];
    migrateLegacyAnalysisRules(state);
    backfillMissingCatalogSortOrders(state.professionalCatalog.microbiotaTaxa);
    backfillMissingCatalogSortOrders(state.professionalCatalog.testIndicators);
    backfillMissingCatalogSortOrders(state.professionalCatalog.breeds);
    syncPlatformReferenceRangesFromSchemes(state.professionalCatalog);
    (state.testRecords || []).forEach(function (tr) {
      if (!tr.submissionType || SUBMISSION_TYPES.indexOf(tr.submissionType) < 0) {
        tr.submissionType = 'in_store';
      }
      if (tr.status === 'unassigned') {
        tr.status = tr.petId ? 'pending_review' : 'pending_result';
      }
      backfillTestRecordInstitutions(state, tr);
    });
    (state.reports || []).forEach(function (report) {
      if (report.status === 'unassigned') report.status = 'incomplete';
    });
  }

  function loadState() {
    if (localStorageAvailable) {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          for (var legacyIndex = 0; legacyIndex < LEGACY_STORAGE_KEYS.length; legacyIndex += 1) {
            raw = localStorage.getItem(LEGACY_STORAGE_KEYS[legacyIndex]);
            if (raw) break;
          }
        }
        if (raw) {
          var parsed = JSON.parse(raw);
          ensureDomainState(parsed);
          memoryState = parsed;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch (ignore) {}
          return parsed;
        }
      } catch (e) {
        localStorageAvailable = false;
      }
    }
    if (memoryState) {
      ensureDomainState(memoryState);
      return memoryState;
    }
    memoryState = buildSeedState();
    return memoryState;
  }

  function persistState(state) {
    memoryState = state;
    if (localStorageAvailable) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
      catch (e) { localStorageAvailable = false; }
    }
    notifyListeners(state);
  }

  function notifyListeners(state) {
    var snapshot = clone(state);
    listeners.forEach(function (fn) {
      try { fn(snapshot); }
      catch (e) { console.error('[PetReportMockStore] subscribe callback error:', e); }
    });
  }

  function findReport(state, reportId) {
    return (state.reports || []).find(function (r) { return r.id === reportId; });
  }
  function findTestRecord(state, testRecordId) {
    return (state.testRecords || []).find(function (t) { return t.id === testRecordId; });
  }
  function findPet(state, petId) {
    return (state.pets || []).find(function (p) { return p.id === petId; });
  }
  function findUser(state, userId) {
    return (state.users || []).find(function (u) { return u.id === userId; });
  }
  function findStore(state, storeId) {
    if (!storeId) return null;
    return (state.stores || []).find(function (s) { return s.id === storeId; }) || null;
  }

  function backfillTestRecordInstitutions(state, tr) {
    if (!tr) return;
    if (tr.labName == null) tr.labName = '';
    if (tr.labStoreId === undefined) tr.labStoreId = null;
    if (tr.submissionType !== 'customer_brought' && !tr.labStoreId && tr.storeId) {
      tr.labStoreId = tr.storeId;
    }
    if (!String(tr.labName || '').trim()) {
      var labStore = findStore(state, tr.labStoreId);
      if (labStore) tr.labName = labStore.name;
    }
  }

  function labDuplicateKey(record) {
    if (!record) return '';
    var name = String(record.labName || '').trim().toLowerCase();
    if (name) return 'name:' + name;
    if (record.labStoreId) return 'store:' + String(record.labStoreId).trim();
    return '';
  }

  function findLabScopedDuplicate(state, params) {
    params = params || {};
    var directed = params.testRecordId ? findTestRecord(state, params.testRecordId) : null;
    var probe = {
      labStoreId: params.labStoreId != null ? params.labStoreId : (directed ? directed.labStoreId : null),
      labName: (params.labName != null && String(params.labName).trim())
        ? String(params.labName).trim()
        : (directed ? directed.labName : '')
    };
    var labKey = labDuplicateKey(probe);
    if (!labKey && directed) labKey = labDuplicateKey(directed);
    var externalNo = String(params.externalReportNumber || params.externalNumber || '').trim();
    var sampleNo = String(params.sampleNumber || params.sampleNo || '').trim();
    if (!labKey || (!externalNo && !sampleNo)) return null;
    var existing = (state.testRecords || []).find(function (tr) {
      if (params.testRecordId && tr.id === params.testRecordId) return false;
      if (params.excludeId && tr.id === params.excludeId) return false;
      if (labDuplicateKey(tr) !== labKey) return false;
      if (externalNo && String(tr.externalReportNumber || '').trim() === externalNo) return true;
      if (sampleNo && String(tr.sampleNumber || '').trim() === sampleNo) return true;
      return false;
    });
    if (!existing) return null;
    return {
      duplicate: true,
      existingTestRecordId: existing.id,
      labName: probe.labName || existing.labName || null,
      labStoreId: probe.labStoreId || existing.labStoreId || null,
      sourceOrgId: params.sourceOrgId || existing.sourceOrgId || null,
      externalReportNumber: externalNo || null,
      sampleNumber: sampleNo || null
    };
  }
  function findProduct(state, productId) {
    return (state.products || []).find(function (p) { return p.id === productId; });
  }
  function findReportByTestRecord(state, testRecordId) {
    return (state.reports || []).find(function (r) { return r.testRecordId === testRecordId; });
  }

  function taxaByKeyMap(state) {
    var map = {};
    var taxa = (state.professionalCatalog && state.professionalCatalog.microbiotaTaxa) || [];
    taxa.forEach(function (t) { if (t && t.key) map[t.key] = t; });
    return map;
  }

  function findCatalogEntryByKey(state, key) {
    var catalog = state.professionalCatalog || defaultCatalog();
    var taxonItem = (catalog.microbiotaTaxa || []).find(function (t) { return t.key === key; });
    if (taxonItem) return { type: 'microbiota', item: taxonItem };
    var indicator = (catalog.testIndicators || []).find(function (t) { return t.key === key; });
    if (indicator) return { type: 'indicator', item: indicator };
    return null;
  }

  function classifyKey(state, key) {
    var entry = findCatalogEntryByKey(state, key);
    if (entry && entry.type === 'microbiota') {
      var item = entry.item;
      return {
        level: item.level,
        phylumKey: item.level === 'phylum' ? item.key : (item.parentKey || null)
      };
    }
    return { level: 'indicator', phylumKey: null };
  }

  function taxonLabel(state, key) {
    var entry = findCatalogEntryByKey(state, key);
    if (entry && entry.item) return entry.item.label || key;
    return key;
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
        return { min: item.minValue, max: item.maxValue, unit: item.unit, source: 'platform', schemeId: scheme.id };
      }
    }
    return null;
  }

  function resolveResultRange(state, result, species) {
    if (hasConfirmedImportedRange(result)) {
      return {
        range: {
          min: result.importedRange.min,
          max: result.importedRange.max,
          unit: result.importedRange.unit || result.unit
        },
        rangeSource: 'imported'
      };
    }
    var catalog = state.professionalCatalog || defaultCatalog();
    var entry = findCatalogEntryByKey(state, result.key || result.rawImportName);
    var schemeRange = resolveSchemeRangeForIndicator(catalog, result, species, entry);
    if (schemeRange) {
      return { range: { min: schemeRange.min, max: schemeRange.max, unit: schemeRange.unit }, rangeSource: 'platform' };
    }
    return { range: null, rangeSource: 'none' };
  }

  function isEffectiveResultRow(result) {
    if (!result) return false;
    var status = normalizeDataStatus(result.dataStatus);
    if (status === 'NOT_DETECTED') return true;
    if (status !== 'PRESENT') return false;
    var raw = result.effectiveValue !== undefined ? result.effectiveValue : result.value;
    if (raw == null || raw === '') return false;
    return isFinite(Number(raw));
  }

  function decorateResult(state, result, species) {
    var out = clone(result);
    if (!out.level || out.phylumKey === undefined) {
      var meta = classifyKey(state, out.key);
      out.level = out.level || meta.level;
      if (out.phylumKey == null) out.phylumKey = meta.phylumKey;
    }
    out.effectiveValue = out.effectiveValue !== undefined ? out.effectiveValue : out.value;
    out.value = out.effectiveValue;
    if (!out.labNotice) out.labNotice = 'unmarked';
    var resolved = resolveResultRange(state, out, species);
    out.importedRange = result.importedRange ? clone(result.importedRange) : null;
    out.importedRangeDecision = normalizeImportedRangeDecision(result);
    out.range = resolved.range;
    out.rangeSource = resolved.rangeSource;
    var status = normalizeDataStatus(out.dataStatus);
    if (status === 'NOT_DETECTED' || status !== 'PRESENT') {
      out.rangeStatus = null;
    } else if (!out.range) {
      out.rangeStatus = 'no_range';
    } else {
      var v = Number(out.effectiveValue);
      if (!isFinite(v)) out.rangeStatus = null;
      else if (v < out.range.min) out.rangeStatus = 'low';
      else if (v > out.range.max) out.rangeStatus = 'high';
      else out.rangeStatus = 'normal';
    }
    out.isEffective = isEffectiveResultRow(out);
    return out;
  }

  function currentResultsOf(state, reportId) {
    return (state.indicators || []).filter(function (r) {
      return r.reportId === reportId && r.isCurrent !== false;
    });
  }

  function getDecoratedCurrentResults(state, report) {
    var species = getReportSpecies(state, report);
    return currentResultsOf(state, report.id).map(function (r) {
      return decorateResult(state, r, species);
    });
  }

  function emptyPhylumUnit(reportId, phylumKey) {
    return {
      id: 'unit-' + reportId + '-' + phylumKey,
      reportId: reportId,
      phylumKey: phylumKey,
      hits: [],
      analysisDraft: '',
      adviceDraft: '',
      draftSource: 'auto',
      riskLevel: null,
      confirmStatus: 'unconfirmed',
      confirmedAt: null,
      confirmedBy: null,
      confirmedEvidenceSignature: null,
      invalidatedReason: null,
      primaryProductId: null,
      relatedProductIds: [],
      hitSignature: '',
      updatedAt: nowIso()
    };
  }

  function phylumEvidenceSignature(state, report, phylumKey) {
    return getDecoratedCurrentResults(state, report)
      .filter(function (r) { return r.phylumKey === phylumKey && r.isEffective; })
      .map(function (r) {
        return [r.key, r.dataStatus, String(r.effectiveValue), r.labNotice, r.rangeStatus, r.importedRangeDecision || ''].join(':');
      })
      .sort()
      .join('|');
  }

  function ensurePhylumUnits(state, report) {
    if (!state.phylumAnalysisUnits) state.phylumAnalysisUnits = [];
    if (!report) return;
    var needed = {};
    getDecoratedCurrentResults(state, report).forEach(function (r) {
      if (r.isEffective && r.phylumKey) needed[r.phylumKey] = true;
    });
    Object.keys(needed).forEach(function (pk) {
      var existing = state.phylumAnalysisUnits.find(function (u) {
        return u.reportId === report.id && u.phylumKey === pk;
      });
      if (!existing) state.phylumAnalysisUnits.push(emptyPhylumUnit(report.id, pk));
    });
  }

  function listPhylumUnits(state, reportId) {
    return (state.phylumAnalysisUnits || []).filter(function (u) { return u.reportId === reportId; });
  }

  function findPhylumUnit(state, reportId, phylumKey) {
    return (state.phylumAnalysisUnits || []).find(function (u) {
      return u.reportId === reportId && u.phylumKey === phylumKey;
    });
  }

  function listActiveRules(state) {
    return (state.analysisRuleCatalog || []).filter(function (r) { return r.status === 'active'; });
  }

  function computeResultSignature(results) {
    return (results || []).map(function (r) {
      return [r.key, r.dataStatus, String(r.effectiveValue), r.labNotice || '', r.rangeStatus || '', r.importedRangeDecision || ''].join(':');
    }).sort().join('|');
  }

  function computeRulesSignature(rules) {
    return (rules || []).map(function (r) {
      return r.id + '@' + (r.version || 1) + ':' + r.status;
    }).sort().join('|');
  }

  function currentSignatures(state, report) {
    var results = getDecoratedCurrentResults(state, report);
    return {
      resultSignature: computeResultSignature(results),
      rulesSignature: computeRulesSignature(listActiveRules(state))
    };
  }

  function getLatestAnalysisRunFromState(state, reportId) {
    var report = findReport(state, reportId);
    if (!report || !report.latestAnalysisRunId) return null;
    return (state.analysisRuns || []).find(function (r) { return r.id === report.latestAnalysisRunId; }) || null;
  }

  function isReportEditable(report) {
    if (!report || report.status === 'voided') return false;
    if (report.status === 'published' && !report.correctionDraftActive) return false;
    return true;
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

  function productIsUnavailable(product) {
    var status = getProductListingStatus(product);
    return status !== 'on_sale';
  }

  function unitHasUnavailableProduct(state, unit) {
    if (!unit) return false;
    var ids = [];
    if (unit.primaryProductId) ids.push(unit.primaryProductId);
    (unit.relatedProductIds || []).forEach(function (id) { ids.push(id); });
    return ids.some(function (id) { return productIsUnavailable(findProduct(state, id)); });
  }

  function maybeInvalidateUnits(state, report) {
    listPhylumUnits(state, report.id).forEach(function (unit) {
      if (unit.confirmStatus !== 'confirmed' && unit.confirmStatus !== 'invalidated') return;
      if (!unit.confirmedEvidenceSignature) return;
      var current = phylumEvidenceSignature(state, report, unit.phylumKey);
      if (current !== unit.confirmedEvidenceSignature) {
        unit.confirmStatus = 'invalidated';
        unit.invalidatedReason = '检测结果已变化，请重新分析并确认';
        unit.updatedAt = nowIso();
      }
    });
  }

  function buildTodoFlags(state, report) {
    var flags = [];
    if (!report) return flags;
    var run = getLatestAnalysisRunFromState(state, report.id);
    if (run && isReportEditable(report) && run.inputSnapshot) {
      var cur = currentSignatures(state, report);
      if (cur.resultSignature !== run.inputSnapshot.resultSignature ||
          cur.rulesSignature !== run.inputSnapshot.rulesSignature) {
        flags.push('pending_reanalysis');
      }
    }
    var results = currentResultsOf(state, report.id);
    var hasMissing = results.some(function (r) {
      return MISSING_DATA_STATUSES.indexOf(normalizeDataStatus(r.dataStatus)) >= 0;
    });
    if (hasMissing) flags.push('missing_unresolved');
    var hasBadProduct = listPhylumUnits(state, report.id).some(function (u) {
      return unitHasUnavailableProduct(state, u);
    });
    if (hasBadProduct) flags.push('product_unavailable');
    if (report.petId && !report.userId) flags.push('user_unlinked');
    return flags;
  }

  function syncReportVersionFields(report) {
    if (!report) return;
    if (report.workingVersion == null) report.workingVersion = report.currentVersion || 1;
    if (report.publishedVersion == null && report.status === 'published' && !report.correctionDraftActive) {
      report.publishedVersion = report.currentVersion || 1;
    }
  }

  function syncReportDerived(state, report) {
    if (!report) return;
    if (report.status === 'unassigned') setReportStatus(report, 'incomplete');
    report.ownershipStatus = report.petId ? 'bound' : 'unassigned';
    ensurePhylumUnits(state, report);
    maybeInvalidateUnits(state, report);
    report.todoFlags = buildTodoFlags(state, report);
    syncReportVersionFields(report);
  }

  function syncAllReportsDerived(state) {
    (state.reports || []).forEach(function (report) {
      syncReportDerived(state, report);
    });
  }

  function applyExcludedToHits(newHits, oldHits) {
    var oldByKey = {};
    (oldHits || []).forEach(function (h) {
      oldByKey[h.ruleId + '@' + (h.ruleVersion || 1)] = h;
    });
    (newHits || []).forEach(function (h) {
      var prev = oldByKey[h.ruleId + '@' + (h.ruleVersion || 1)];
      if (prev && prev.excluded) {
        h.excluded = true;
        h.excludedReason = prev.excludedReason || h.excludedReason;
      }
    });
    Engine.resolveConflicts(newHits);
    return newHits;
  }

  function runReportAnalysisInternal(state, reportId, options) {
    options = normalizeActorOptions(options);
    var actor = options.actor || '系统';
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = assertActionPermission('savePhylumUnitDraft', options, report);
    assertProfessionalEditPermission(report, ctx);
    ensurePhylumUnits(state, report);
    var results = getDecoratedCurrentResults(state, report);
    var rules = listActiveRules(state);
    var taxa = (state.professionalCatalog && state.professionalCatalog.microbiotaTaxa) || [];
    var species = getReportSpecies(state, report);
    var evaluated = Engine.evaluate({
      rules: rules,
      results: results,
      species: species,
      sourceTemplateId: report.sourceOrgId || null,
      taxa: taxa
    });
    var engineByPhylum = {};
    (evaluated.units || []).forEach(function (u) { engineByPhylum[u.phylumKey] = u; });

    listPhylumUnits(state, reportId).forEach(function (unit) {
      var incoming = engineByPhylum[unit.phylumKey];
      var oldHits = unit.hits || [];
      var oldSig = unit.hitSignature || Engine.hitSignature(oldHits);
      var newHits = incoming ? clone(incoming.hits) : [];
      applyExcludedToHits(newHits, oldHits);
      var drafts = Engine.composeDrafts(newHits);
      var newSig = Engine.hitSignature(newHits);
      var wasLocked = unit.confirmStatus === 'confirmed' || unit.confirmStatus === 'invalidated';
      unit.hits = newHits;
      unit.hitSignature = newSig;
      unit.riskLevel = Engine.unitRiskLevel(newHits);
      if (unit.draftSource !== 'manual') {
        unit.analysisDraft = drafts.analysis;
        unit.adviceDraft = drafts.advice;
      }
      if (wasLocked && newSig !== oldSig) {
        unit.confirmStatus = 'invalidated';
        unit.invalidatedReason = '分析结果命中已变化，请重新确认';
      }
      unit.updatedAt = nowIso();
    });

    var sigs = currentSignatures(state, report);
    var run = {
      id: uid('run'),
      reportId: reportId,
      createdAt: nowIso(),
      actor: actor,
      inputSnapshot: {
        resultSignature: sigs.resultSignature,
        rulesSignature: sigs.rulesSignature,
        workingVersion: report.workingVersion,
        species: species
      },
      ruleIds: rules.map(function (r) { return r.id; }),
      unitSummaries: listPhylumUnits(state, reportId).map(function (u) {
        var primaryCount = (u.hits || []).filter(function (h) {
          return !h.excluded && h.combineStatus === 'primary';
        }).length;
        return { phylumKey: u.phylumKey, hitCount: (u.hits || []).length, primaryCount: primaryCount, riskLevel: u.riskLevel };
      }),
      orphanHits: clone(evaluated.orphanHits || [])
    };
    if (!state.analysisRuns) state.analysisRuns = [];
    state.analysisRuns.push(run);
    report.latestAnalysisRunId = run.id;
    report.updatedAt = nowIso();
    syncReportDerived(state, report);
    return run;
  }

  function applyPhylumUnitDraftWrite(state, reportId, phylumKey, patch) {
    patch = patch || {};
    var report = findReport(state, reportId);
    var unit = findPhylumUnit(state, reportId, phylumKey);
    if (!unit) throw new Error('phylum unit not found: ' + phylumKey);
    if (patch.analysis != null) unit.analysisDraft = patch.analysis;
    if (patch.advice != null) unit.adviceDraft = patch.advice;
    unit.draftSource = 'manual';
    unit.confirmStatus = 'unconfirmed';
    unit.invalidatedReason = null;
    unit.updatedAt = nowIso();
    report.updatedAt = nowIso();
    return unit;
  }

  function savePhylumUnitDraftInternal(state, reportId, phylumKey, patch) {
    patch = patch || {};
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = assertActionPermission('savePhylumUnitDraft', patch, report);
    assertProfessionalEditPermission(report, ctx);
    return applyPhylumUnitDraftWrite(state, reportId, phylumKey, patch);
  }

  function confirmPhylumUnitInternal(state, reportId, phylumKey, options) {
    options = normalizeActorOptions(options);
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = assertActionPermission('savePhylumUnitDraft', options, report);
    assertProfessionalEditPermission(report, ctx);
    var unit = findPhylumUnit(state, reportId, phylumKey);
    if (!unit) throw new Error('phylum unit not found: ' + phylumKey);
    unit.confirmStatus = 'confirmed';
    unit.confirmedAt = nowIso();
    unit.confirmedBy = options.actor || '审核员';
    unit.confirmedEvidenceSignature = phylumEvidenceSignature(state, report, phylumKey);
    unit.invalidatedReason = null;
    unit.updatedAt = nowIso();
    report.updatedAt = nowIso();
    return unit;
  }

  function excludeHitInternal(state, reportId, phylumKey, hitId, params) {
    params = params || {};
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = assertActionPermission('savePhylumUnitDraft', params, report);
    assertProfessionalEditPermission(report, ctx);
    var unit = findPhylumUnit(state, reportId, phylumKey);
    if (!unit) throw new Error('phylum unit not found: ' + phylumKey);
    var hit = (unit.hits || []).find(function (h) { return h.id === hitId; });
    if (!hit) throw new Error('hit not found: ' + hitId);
    hit.excluded = !!params.excluded;
    hit.excludedReason = hit.excluded ? (params.reason || '人工排除') : null;
    Engine.resolveConflicts(unit.hits);
    unit.hitSignature = Engine.hitSignature(unit.hits);
    unit.riskLevel = Engine.unitRiskLevel(unit.hits);
    if (unit.draftSource !== 'manual') {
      var drafts = Engine.composeDrafts(unit.hits);
      unit.analysisDraft = drafts.analysis;
      unit.adviceDraft = drafts.advice;
    }
    unit.confirmStatus = 'unconfirmed';
    unit.updatedAt = nowIso();
    report.updatedAt = nowIso();
    return unit;
  }

  function savePhylumUnitProductsInternal(state, reportId, phylumKey, params) {
    params = params || {};
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    assertActionPermission('savePhylumUnitProducts', params, report);
    assertProductConfigurable(report);
    var unit = findPhylumUnit(state, reportId, phylumKey);
    if (!unit) throw new Error('phylum unit not found: ' + phylumKey);
    var primary = params.primaryProductId || null;
    if (primary && !findProduct(state, primary)) throw new Error('商品不存在: ' + primary);
    var related = [];
    (params.relatedProductIds || []).forEach(function (id) {
      if (!id || id === primary) return;
      if (!findProduct(state, id)) return;
      if (related.indexOf(id) < 0 && related.length < 3) related.push(id);
    });
    unit.primaryProductId = primary;
    unit.relatedProductIds = related;
    unit.updatedAt = nowIso();
    report.updatedAt = nowIso();
    return unit;
  }

  function getWorkingReportVersion(state, reportId) {
    var report = findReport(state, reportId);
    if (!report || !report.versions) return null;
    var versionNo = report.workingVersion != null ? report.workingVersion : report.currentVersion;
    return report.versions.find(function (v) { return v.version === versionNo; }) || null;
  }

  function getPublishedReportVersion(state, reportId) {
    var report = findReport(state, reportId);
    if (!report || !report.versions || report.publishedVersion == null) return null;
    return report.versions.find(function (v) { return v.version === report.publishedVersion; }) || null;
  }

  function getCorrectionDraftStageFromReport(report) {
    if (!report || !report.correctionDraftActive) return null;
    var ver = (report.versions || []).find(function (v) { return v.version === report.workingVersion; });
    if (!ver) return null;
    if (ver.status === 'pending_review') return 'pending_review';
    return 'incomplete';
  }

  function buildPresentationMock(report, version, species) {
    return {
      summaryItems: [
        { key: 'health_level', label: '综合等级', value: version.healthLevel || null },
        { key: 'health_score', label: '综合分', value: version.healthScore != null ? version.healthScore : null },
        { key: 'species', label: '物种', value: species || report.reportSpecies || null }
      ],
      benchmarks: [
        { key: 'peer_percentile', label: '同龄对比百分位', value: version.percentile != null ? version.percentile : null }
      ],
      dimensions: version.platformDimensions ? clone(version.platformDimensions) : { emotion: null, immunity: null }
    };
  }

  function hasAnyEffectiveRangeFromResults(results) {
    return (results || []).some(function (r) {
      return r.range && r.rangeSource && r.rangeSource !== 'none';
    });
  }

  function buildContentSnapshot(state, report, versionNo, actor) {
    var version = (report.versions || []).find(function (v) { return v.version === versionNo; });
    if (!version) return null;
    var species = getReportSpecies(state, report);
    var results = getDecoratedCurrentResults(state, report);
    var units = listPhylumUnits(state, report.id).map(function (u) { return clone(u); });
    return {
      reportSpecies: report.reportSpecies || species,
      assessment: {
        healthLevel: version.healthLevel,
        healthScore: version.healthScore,
        percentile: version.percentile != null ? version.percentile : null,
        platformDimensions: version.platformDimensions ? clone(version.platformDimensions) : null,
        summary: version.summary
      },
      results: results,
      phylumUnits: units,
      hasAnyEffectiveRange: hasAnyEffectiveRangeFromResults(results),
      presentationMock: buildPresentationMock(report, version, species),
      analysisRunId: report.latestAnalysisRunId || null,
      frozenAt: nowIso(),
      frozenBy: actor || '系统'
    };
  }

  function appendOperationRecord(state, record) {
    if (!state.operationRecords) state.operationRecords = [];
    state.operationRecords.push(Object.assign({ id: uid('op'), createdAt: nowIso() }, record));
  }

  function setReportStatus(report, nextStatus) {
    if (!report) return;
    if (nextStatus === 'unassigned') nextStatus = 'incomplete';
    if (report.status !== nextStatus) {
      report.status = nextStatus;
      report.statusChangedAt = nowIso();
    }
  }

  function assertResultsEditable(report) {
    if (!report) throw new Error('report not found');
    if (report.status === 'voided') throw new Error('已作废报告不可编辑');
    if (report.status === 'published' && !report.correctionDraftActive) {
      throw new Error('已发布报告需先创建更正草稿才能修改');
    }
  }

  function collectPublicationChecks(state, reportId) {
    var blockers = [];
    var warnings = [];
    function addBlocker(id, message, category) {
      blockers.push({ id: id, message: message, category: category || 'blocker' });
    }
    function addWarning(id, message, category) {
      warnings.push({ id: id, message: message, category: category || 'warning' });
    }
    var report = findReport(state, reportId);
    if (!report) {
      addBlocker('report_missing', '报告不存在', 'system');
      return { blockers: blockers, warnings: warnings };
    }
    var tr = findTestRecord(state, report.testRecordId);
    var pet = findPet(state, report.petId);
    var workingVer = getWorkingReportVersion(state, reportId);
    var species = getReportSpecies(state, report);
    var results = getDecoratedCurrentResults(state, report);
    var units = listPhylumUnits(state, reportId);

    if (!report.petId || !pet) addBlocker('pet_archive', '未完成宠物建档/报告归档（需 petId 且宠物存在）', 'archive');
    if (!tr) {
      addBlocker('test_record', '缺少检测记录 testRecord', 'traceability');
    } else {
      if (!tr.sourceOrgId) addBlocker('source_org', '来源机构标识缺失', 'traceability');
      if (!tr.externalReportNumber && !tr.sampleNumber) {
        addBlocker('source_ref', '来源不可追溯（需外部报告号或样本号）', 'traceability');
      }
    }
    if (!species) addBlocker('report_species', '报告物种未填写', 'assessment');
    if (!workingVer || !workingVer.healthLevel || HEALTH_LEVELS.indexOf(workingVer.healthLevel) < 0) {
      addBlocker('health_level', '综合等级 A–E 未填写或无效', 'assessment');
    }
    var score = workingVer ? workingVer.healthScore : null;
    if (score == null || score === '' || !isFinite(Number(score)) || Number(score) < 0 || Number(score) > 100) {
      addBlocker('health_score', '综合分须为 0–100 的数值', 'assessment');
    }
    var validResults = results.filter(function (r) { return r.isEffective; });
    if (!validResults.length) addBlocker('valid_results', '至少一项有效结果（PRESENT 有有限数值，或 NOT_DETECTED）', 'results');

    var unconfirmed = units.filter(function (u) { return u.confirmStatus !== 'confirmed'; });
    if (unconfirmed.length) addBlocker('unconfirmed_units', '存在未确认的菌门分析单元', 'analysis');
    var invalidated = units.some(function (u) { return u.confirmStatus === 'invalidated'; });
    var pending = (report.todoFlags || []).indexOf('pending_reanalysis') >= 0;
    if (pending || invalidated) addBlocker('pending_reanalysis', '依据变化后未重新分析', 'analysis');

    if (!report.userId) addWarning('unclaimed_user', '报告未关联用户', 'ownership');
    if ((report.todoFlags || []).indexOf('missing_unresolved') >= 0) {
      addWarning('missing_unresolved', '存在缺失未处理的检测结果', 'data_quality');
    }
    if (!hasAnyEffectiveRangeFromResults(results)) {
      addWarning('no_effective_range', '本报告无有效参考范围', 'range');
    }
    units.forEach(function (unit) {
      if (!String(unit.analysisDraft || '').trim()) {
        addWarning('phylum_empty_' + unit.phylumKey, '菌门 ' + taxonLabel(state, unit.phylumKey) + ' 分析为空', 'analysis');
      }
      if (unitHasUnavailableProduct(state, unit)) {
        addWarning('product_unavailable_' + unit.phylumKey, '菌门 ' + taxonLabel(state, unit.phylumKey) + ' 推荐商品失效', 'recommendation');
      }
    });
    results.forEach(function (ind) {
      var status = normalizeDataStatus(ind.dataStatus);
      if (MISSING_DATA_STATUSES.indexOf(status) >= 0) {
        addWarning('data_status_' + ind.id, '指标「' + ind.key + '」状态 ' + status, 'data_quality');
      }
    });
    if (workingVer) {
      if (workingVer.percentile == null || workingVer.percentile === '') {
        addWarning('percentile_empty', '人工百分位未填写', 'assessment');
      }
      var dims = workingVer.platformDimensions || {};
      if (dims.emotion == null || dims.emotion === '') addWarning('platform_emotion', '平台评估维度「情绪」未填写', 'assessment');
      if (dims.immunity == null || dims.immunity === '') addWarning('platform_immunity', '平台评估维度「免疫」未填写', 'assessment');
    }
    return { blockers: blockers, warnings: warnings };
  }

  function assertNoPublicationBlockers(state, reportId, actionLabel) {
    syncReportDerived(state, findReport(state, reportId));
    var checks = collectPublicationChecks(state, reportId);
    if (checks.blockers.length) {
      throw new Error((actionLabel || '操作') + '被阻断：' + checks.blockers.map(function (b) { return b.message; }).join('；'));
    }
  }

  function submitReportInternal(state, reportId, options) {
    options = normalizeActorOptions(options);
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = assertActionPermission('submitReport', options, report);
    var stage = getCorrectionDraftStageFromReport(report);
    var ok = report.status === 'incomplete' || (report.status === 'published' && stage === 'incomplete');
    if (!ok) throw new Error('当前状态不可提交审核');
    assertNoPublicationBlockers(state, reportId, '提交审核');
    var ver = getWorkingReportVersion(state, reportId);
    if (report.correctionDraftActive) {
      if (ver) ver.status = 'pending_review';
    } else {
      setReportStatus(report, 'pending_review');
      if (ver) ver.status = 'pending_review';
    }
    report.submittedByActorId = ctx.actorId;
    report.submittedBy = options.actor || ctx.actor || '审核员';
    report.rejectReason = null;
    report.updatedAt = nowIso();
    appendOperationRecord(state, { type: 'submit', reportId: reportId, actor: report.submittedBy, actorId: ctx.actorId });
    syncReportDerived(state, report);
    return report;
  }

  function withdrawReportInternal(state, reportId, options) {
    options = normalizeActorOptions(options);
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = assertActionPermission('withdrawReport', options, report);
    var stage = getCorrectionDraftStageFromReport(report);
    var ok = report.status === 'pending_review' || (report.status === 'published' && stage === 'pending_review');
    if (!ok) throw new Error('当前状态不可撤回');
    var ver = getWorkingReportVersion(state, reportId);
    if (report.correctionDraftActive) {
      if (ver) ver.status = 'draft';
    } else {
      setReportStatus(report, 'incomplete');
      if (ver) ver.status = 'draft';
    }
    report.updatedAt = nowIso();
    appendOperationRecord(state, { type: 'withdraw', reportId: reportId, actor: options.actor || ctx.actor || '审核员', actorId: ctx.actorId });
    syncReportDerived(state, report);
    return report;
  }

  function rejectReportInternal(state, reportId, reason, options) {
    options = normalizeActorOptions(options);
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    assertActionPermission('rejectReport', options, report);
    var stage = getCorrectionDraftStageFromReport(report);
    var ok = report.status === 'pending_review' || (report.status === 'published' && stage === 'pending_review');
    if (!ok) throw new Error('当前状态不可退回完善');
    var ver = getWorkingReportVersion(state, reportId);
    report.rejectReason = reason || '审核退回待完善';
    if (report.correctionDraftActive) {
      if (ver) ver.status = 'draft';
    } else {
      setReportStatus(report, 'incomplete');
      if (ver) ver.status = 'draft';
    }
    report.updatedAt = nowIso();
    appendOperationRecord(state, {
      type: 'reject', reportId: reportId, reason: report.rejectReason, actor: options.actor || '审核员'
    });
    syncReportDerived(state, report);
    return report;
  }

  function publishReportInternal(state, reportId, options) {
    options = normalizeActorOptions(options);
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    assertActionPermission('publishReport', options, report);
    var actor = options.actor || resolvePermissionContext(options).actor || '审核员';
    var stage = getCorrectionDraftStageFromReport(report);
    var ok = report.status === 'pending_review' || (report.status === 'published' && stage === 'pending_review');
    if (!ok) throw new Error('当前状态不可发布');
    assertNoPublicationBlockers(state, reportId, '发布');
    var publishVersion = report.workingVersion || report.currentVersion;
    var ver = getWorkingReportVersion(state, reportId);
    if (report.correctionDraftActive && report.publishedVersion != null) {
      var oldPub = (report.versions || []).find(function (v) { return v.version === report.publishedVersion; });
      if (oldPub) oldPub.status = 'superseded';
    }
    setReportStatus(report, 'published');
    report.publishedVersion = publishVersion;
    report.workingVersion = publishVersion;
    report.currentVersion = publishVersion;
    report.correctionDraftActive = false;
    report.rejectReason = null;
    report.updatedAt = nowIso();
    if (ver) {
      ver.status = 'published';
      ver.publishedAt = nowIso();
      ver.contentSnapshot = buildContentSnapshot(state, report, publishVersion, actor);
    }
    var tr = findTestRecord(state, report.testRecordId);
    if (tr) {
      tr.status = 'published';
      tr.updatedAt = nowIso();
    }
    appendOperationRecord(state, { type: 'publish', reportId: report.id, version: publishVersion, actor: actor });
    syncReportDerived(state, report);
    return report;
  }

  function createCorrectionDraftInternal(state, report, params) {
    params = params || {};
    if (report.status !== 'published') throw new Error('仅已发布报告可创建更正草稿');
    if (report.correctionDraftActive) return report;
    var base = getPublishedReportVersion(state, report.id) || (report.versions || [])[report.versions.length - 1];
    var newNo = (report.publishedVersion || report.currentVersion || 1) + 1;
    report.workingVersion = newNo;
    report.currentVersion = newNo;
    report.correctionDraftActive = true;
    report.versions.push({
      version: newNo,
      status: 'draft',
      healthLevel: base ? base.healthLevel : null,
      healthScore: base ? base.healthScore : null,
      percentile: base && base.percentile != null ? base.percentile : null,
      platformDimensions: base && base.platformDimensions ? clone(base.platformDimensions) : { emotion: null, immunity: null },
      summary: params.summary != null ? params.summary : (base ? base.summary : ''),
      createdAt: nowIso(),
      publishedAt: null,
      correctionNote: params.correctionNote || '更正草稿'
    });
    report.updatedAt = nowIso();
    return report;
  }

  function voidReportInternal(state, reportId, reason, options) {
    options = normalizeActorOptions(options);
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = assertActionPermission('voidReport', options, report);
    if (report.status === 'voided') return report;
    setReportStatus(report, 'voided');
    report.voidedAt = nowIso();
    report.voidReason = reason || '报告作废';
    report.correctionDraftActive = false;
    report.updatedAt = nowIso();
    var tr = findTestRecord(state, report.testRecordId);
    if (tr) {
      tr.status = 'voided';
      tr.updatedAt = nowIso();
    }
    appendOperationRecord(state, {
      type: 'void', reportId: report.id, reason: report.voidReason, actor: options.actor || ctx.actor || '运营专员', actorId: ctx.actorId
    });
    syncReportDerived(state, report);
    return report;
  }

  function assignReportOwnershipInternal(state, params) {
    params = params || {};
    var report = params.reportId ? findReport(state, params.reportId) : null;
    var tr = params.testRecordId
      ? findTestRecord(state, params.testRecordId)
      : (report ? findTestRecord(state, report.testRecordId) : null);
    if (!report && tr) report = findReportByTestRecord(state, tr.id);
    if (!tr && report) tr = findTestRecord(state, report.testRecordId);
    if (!tr) throw new Error('test record not found');
    var pet = params.petId ? findPet(state, params.petId) : null;
    if (!pet) throw new Error('pet not found: ' + params.petId);
    var userId = params.userId || pet.userId || null;
    if (userId && !findUser(state, userId)) throw new Error('user not found: ' + userId);
    if (userId && userId !== pet.userId) {
      pet.userId = userId;
      pet.claimStatus = 'bound';
    } else if (userId) {
      pet.claimStatus = 'bound';
    }
    tr.petId = pet.id;
    tr.userId = pet.userId || null;
    tr.claimStatus = pet.userId ? 'bound' : 'unassigned';
    tr.storeId = params.storeId || pet.storeId || tr.storeId;
    tr.updatedAt = nowIso();
    if (!report) report = generateReportInternal(state, tr, params);
    report.petId = pet.id;
    report.userId = pet.userId || null;
    report.reportSpecies = report.reportSpecies || pet.species;
    if (report.status === 'unassigned') setReportStatus(report, 'incomplete');
    report.updatedAt = nowIso();
    syncReportDerived(state, report);
    return { report: report, testRecord: tr, pet: pet };
  }

  function generateReportInternal(state, tr, params) {
    params = params || {};
    if (!tr.petId) throw new Error('送检记录必须已关联宠物，不能生成未挂宠物的报告');
    var reportId = bumpIds(state, 'reports', 'report');
    var status = 'incomplete';
    var report = {
      id: reportId,
      reportNumber: params.reportNumber || ('RPT-' + reportId.replace('report-', '')),
      externalReportNumber: tr.externalReportNumber,
      sampleNumber: tr.sampleNumber,
      sourceOrgId: tr.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
      testRecordId: tr.id,
      userId: tr.userId || null,
      petId: tr.petId || null,
      reportSpecies: params.reportSpecies || null,
      status: status,
      statusChangedAt: nowIso(),
      ownershipStatus: tr.petId ? 'bound' : 'unassigned',
      todoFlags: [],
      rejectReason: null,
      latestAnalysisRunId: null,
      currentVersion: 1,
      workingVersion: 1,
      publishedVersion: null,
      correctionDraftActive: false,
      versions: [{
        version: 1, status: 'draft', healthLevel: params.healthLevel || null,
        healthScore: params.healthScore || null, percentile: null,
        platformDimensions: { emotion: null, immunity: null },
        summary: params.summary || '', createdAt: nowIso(), publishedAt: null
      }],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    if (!report.reportSpecies && report.petId) {
      var pet = findPet(state, report.petId);
      if (pet) report.reportSpecies = pet.species;
    }
    state.reports.push(report);
    (state.indicators || []).forEach(function (ind) {
      if (ind.testRecordId === tr.id && ind.isCurrent) ind.reportId = report.id;
    });
    syncReportDerived(state, report);
    return report;
  }

  function bumpIds(state, collection, prefix) {
    var max = 0;
    (state[collection] || []).forEach(function (item) {
      var num = parseInt(String(item.id).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > max) max = num;
    });
    return prefix + '-' + String(max + 1).padStart(3, '0');
  }

  function normalizeStoredResult(state, row) {
    var meta = classifyKey(state, row.key);
    row.level = row.level || meta.level;
    if (row.phylumKey == null) row.phylumKey = meta.phylumKey;
    if (row.sourceValue === undefined) row.sourceValue = row.valueSource === 'manual' ? null : (row.effectiveValue != null ? row.effectiveValue : row.value);
    if (row.effectiveValue === undefined) row.effectiveValue = row.value;
    row.value = row.effectiveValue;
    if (!row.labNotice) row.labNotice = 'unmarked';
    if (!row.valueSource) row.valueSource = row.sourceValue == null && row.effectiveValue != null ? 'manual' : 'import';
    row.dataStatus = normalizeDataStatus(row.dataStatus || 'PRESENT');
    if (row.isCurrent == null) row.isCurrent = true;
    row.importedRangeDecision = normalizeImportedRangeDecision(row);
    return row;
  }

  function makeResult(state, spec) {
    var row = {
      id: spec.id || uid('ind'),
      testRecordId: spec.testRecordId,
      reportId: spec.reportId,
      key: spec.key,
      rawImportName: spec.rawImportName || spec.key,
      sourceTemplateId: spec.sourceTemplateId || DEFAULT_SOURCE_ORG_ID,
      unit: spec.unit || '%',
      dataStatus: spec.dataStatus || 'PRESENT',
      sourceValue: spec.sourceValue !== undefined ? spec.sourceValue : (spec.value != null ? spec.value : null),
      effectiveValue: spec.effectiveValue !== undefined ? spec.effectiveValue : (spec.value != null ? spec.value : null),
      modifiedReason: spec.modifiedReason || null,
      valueSource: spec.valueSource || 'import',
      labNotice: spec.labNotice || 'unmarked',
      importedRange: spec.importedRange ? clone(spec.importedRange) : null,
      importedRangeDecision: spec.importedRangeDecision || null,
      version: spec.version || 1,
      isCurrent: spec.isCurrent !== false,
      correctedFrom: spec.correctedFrom || null,
      createdAt: spec.createdAt || nowIso(),
      updatedBy: spec.updatedBy || null
    };
    return normalizeStoredResult(state, row);
  }

  function modifyResultValueInternal(state, params) {
    params = params || {};
    var report = findReport(state, params.reportId);
    if (!report) throw new Error('report not found: ' + params.reportId);
    var ctx = assertActionPermission('savePhylumUnitDraft', params, report);
    assertProfessionalEditPermission(report, ctx);
    var original = (state.indicators || []).find(function (i) { return i.id === params.resultId; });
    if (!original || original.reportId !== report.id) throw new Error('result not found');
    if (!params.reason || !String(params.reason).trim()) throw new Error('修改有效值须填写原因');
    original.isCurrent = false;
    var next = makeResult(state, {
      id: uid('ind'),
      testRecordId: original.testRecordId,
      reportId: original.reportId,
      key: original.key,
      rawImportName: original.rawImportName,
      sourceTemplateId: original.sourceTemplateId,
      unit: original.unit,
      dataStatus: params.dataStatus || original.dataStatus,
      sourceValue: original.sourceValue,
      effectiveValue: params.value !== undefined ? params.value : original.effectiveValue,
      modifiedReason: String(params.reason).trim(),
      valueSource: original.valueSource || 'import',
      labNotice: params.labNotice || original.labNotice,
      importedRange: original.importedRange,
      importedRangeDecision: original.importedRangeDecision,
      version: (original.version || 1) + 1,
      isCurrent: true,
      correctedFrom: original.id,
      updatedBy: params.actor || '审核员'
    });
    state.indicators.push(next);
    report.updatedAt = nowIso();
    syncReportDerived(state, report);
    return next;
  }

  function setImportedRangeDecisionInternal(state, params) {
    params = params || {};
    var report = findReport(state, params.reportId);
    if (!report) throw new Error('report not found: ' + params.reportId);
    var ctx = assertActionPermission('savePhylumUnitDraft', params, report);
    assertProfessionalEditPermission(report, ctx);
    var original = (state.indicators || []).find(function (i) { return i.id === params.resultId; });
    if (!original || original.reportId !== report.id) throw new Error('result not found');
    if (!original.importedRange || original.importedRange.min == null || original.importedRange.max == null) {
      throw new Error('该结果没有导入参考范围');
    }
    var decision = params.decision;
    if (decision !== 'confirmed' && decision !== 'rejected') {
      throw new Error('请确认导入范围可用或驳回');
    }
    original.isCurrent = false;
    var next = makeResult(state, {
      id: uid('ind'),
      testRecordId: original.testRecordId,
      reportId: original.reportId,
      key: original.key,
      rawImportName: original.rawImportName,
      sourceTemplateId: original.sourceTemplateId,
      unit: original.unit,
      dataStatus: original.dataStatus,
      sourceValue: original.sourceValue,
      effectiveValue: original.effectiveValue,
      modifiedReason: decision === 'confirmed' ? '确认导入参考范围可用' : '驳回导入参考范围，改用平台范围',
      valueSource: original.valueSource || 'import',
      labNotice: original.labNotice,
      importedRange: original.importedRange,
      importedRangeDecision: decision,
      version: (original.version || 1) + 1,
      isCurrent: true,
      correctedFrom: original.id,
      updatedBy: params.actor || '审核员'
    });
    state.indicators.push(next);
    report.updatedAt = nowIso();
    syncReportDerived(state, report);
    return next;
  }

  function supplementResultInternal(state, params) {
    params = params || {};
    var report = findReport(state, params.reportId);
    if (!report) throw new Error('report not found: ' + params.reportId);
    var ctx = assertActionPermission('savePhylumUnitDraft', params, report);
    assertProfessionalEditPermission(report, ctx);
    if (!params.key) throw new Error('请选择补录指标');
    if (!params.reason || !String(params.reason).trim()) throw new Error('补录须填写原因');
    var exists = currentResultsOf(state, report.id).some(function (r) { return r.key === params.key; });
    if (exists) throw new Error('该指标已有结果，请使用修改有效值');
    var tr = findTestRecord(state, report.testRecordId);
    var row = makeResult(state, {
      testRecordId: report.testRecordId,
      reportId: report.id,
      key: params.key,
      sourceTemplateId: (tr && tr.sourceOrgId) || report.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
      unit: params.unit || '%',
      dataStatus: params.dataStatus || 'PRESENT',
      sourceValue: null,
      effectiveValue: params.value,
      modifiedReason: String(params.reason).trim(),
      valueSource: 'manual',
      labNotice: params.labNotice || 'unmarked'
    });
    state.indicators.push(row);
    report.updatedAt = nowIso();
    syncReportDerived(state, report);
    return row;
  }

  function nextRuleId(state) {
    return bumpIds(state, 'analysisRuleCatalog', 'rule');
  }

  function nextRuleStableOrder(state) {
    return (state.analysisRuleCatalog || []).reduce(function (max, rule) {
      return Math.max(max, Number(rule.stableOrder) || 0);
    }, 0) + 1;
  }

  function archiveActiveLineageVersion(state, lineageId, exceptId, reason) {
    (state.analysisRuleCatalog || []).forEach(function (rule) {
      if (rule.lineageId !== lineageId || rule.id === exceptId || rule.status !== 'active') return;
      rule.status = 'inactive';
      rule.archivedAt = nowIso();
      rule.archivedReason = reason || '已有新版本启用';
      rule.updatedAt = nowIso();
    });
  }

  function activeRulesWithCandidate(state, candidate) {
    return Engine.buildCandidateRuleSet(listActiveRules(state), candidate).rules;
  }

  function validateRuleForActivation(state, candidate) {
    var details = Engine.validateRuleDetails(candidate, taxaByKeyMap(state));
    if (details.length) return details;
    var tieErrors = Engine.validateConflictTies(activeRulesWithCandidate(state, candidate));
    tieErrors.forEach(function (message) { details.push({ field: 'conflictGroup', message: message }); });
    return details;
  }

  function resolveSessionLineageId(state, sessionRule) {
    if (sessionRule.lineageId) return sessionRule.lineageId;
    if (sessionRule.basedOnRuleId) {
      var source = (state.analysisRuleCatalog || []).find(function (rule) { return rule.id === sessionRule.basedOnRuleId; });
      if (source && source.lineageId) return source.lineageId;
    }
    return null;
  }

  function saveAndActivateAnalysisRuleInternal(state, sessionRule, options) {
    sessionRule = clone(sessionRule || {});
    options = normalizeActorOptions(options);
    var now = nowIso();
    var lineageId = resolveSessionLineageId(state, sessionRule) || uid('lineage');
    var versions = (state.analysisRuleCatalog || []).filter(function (rule) { return rule.lineageId === lineageId; });
    var maxVersion = versions.reduce(function (max, rule) { return Math.max(max, Number(rule.version) || 0); }, 0);
    var active = versions.find(function (rule) { return rule.status === 'active'; }) || null;
    var created = {
      id: nextRuleId(state),
      lineageId: lineageId,
      version: maxVersion + 1 || 1,
      status: 'active',
      name: sessionRule.name,
      description: sessionRule.description || '',
      target: clone(sessionRule.target),
      conditionLogic: sessionRule.conditionLogic || 'ALL',
      conditions: clone(sessionRule.conditions || []),
      applicableSpecies: clone(sessionRule.applicableSpecies || ['cat']),
      sourceTemplateIds: clone(sessionRule.sourceTemplateIds || []),
      professionalBasis: sessionRule.professionalBasis || '',
      reviewStatus: sessionRule.reviewStatus || 'prototype_unreviewed',
      maintainer: options.actor || sessionRule.maintainer || '原型运营',
      riskLevel: sessionRule.riskLevel || Engine.DEFAULT_RISK_PLACEHOLDER,
      priority: Number(sessionRule.priority) || 0,
      stableOrder: active ? active.stableOrder : nextRuleStableOrder(state),
      conflictGroup: sessionRule.conflictGroup || null,
      output: clone(sessionRule.output),
      createdAt: now,
      updatedAt: now,
      activatedAt: now,
      activatedBy: options.actor || '原型运营',
      basedOnRuleId: active ? active.id : (sessionRule.basedOnRuleId || null)
    };
    var errors = validateRuleForActivation(state, created);
    if (errors.length) {
      var err = new Error(errors.map(function (item) { return item.message; }).join('；'));
      err.validationErrors = errors;
      throw err;
    }
    archiveActiveLineageVersion(state, lineageId, null, '新版本 v' + created.version + ' 已启用');
    state.analysisRuleCatalog.push(created);
    return {
      rule: created,
      previousRule: active ? clone(active) : null,
      impact: calculateRuleChangeImpact(state, { type: 'activate', candidate: created, previousRule: active })
    };
  }

  function copyAnalysisRuleToSpeciesInternal(state, ruleId, targetSpecies, options) {
    var source = (state.analysisRuleCatalog || []).find(function (rule) { return rule.id === ruleId; });
    if (!source) throw new Error('rule not found: ' + ruleId);
    var species = Engine.closedSpeciesList(targetSpecies);
    if (species.length !== 1) throw new Error('复制目标必须是一个当前能出报告的物种');
    var sourceSpecies = Engine.closedSpeciesList(source.applicableSpecies);
    if (sourceSpecies[0] === species[0]) throw new Error('复制目标物种须与原谱系不同');
    var session = clone(source);
    session.id = null;
    session.lineageId = null;
    session.basedOnRuleId = null;
    session.applicableSpecies = species;
    var judgment = Engine.decompileJudgment(source);
    session.name = Engine.suggestRuleName({
      observationKind: judgment.observationKind || Engine.DEFAULT_OBSERVATION_KIND,
      applicableSpecies: species
    }, taxonDisplayLabel(state, source.target && source.target.taxonKey));
    session.copiedFromLineageId = source.lineageId;
    return saveAndActivateAnalysisRuleInternal(state, session, options);
  }

  function deactivateAnalysisRuleLineageInternal(state, lineageId, options) {
    options = normalizeActorOptions(options);
    var active = (state.analysisRuleCatalog || []).find(function (rule) {
      return rule.lineageId === lineageId && rule.status === 'active';
    });
    if (!active) throw new Error('该规则谱系当前没有启用版本');
    active.status = 'inactive';
    active.archivedAt = nowIso();
    active.archivedReason = options.reason || '规则谱系已停用';
    active.updatedAt = nowIso();
    return {
      rule: active,
      impact: calculateRuleChangeImpact(state, { type: 'deactivate', previousRule: active })
    };
  }

  function calculateRuleChangeImpact(state, change) {
    var counts = { incomplete: 0, pending_review: 0, correction: 0, published: 0, affectedUnpublished: 0 };
    (state.reports || []).forEach(function (report) {
      if (report.status === 'voided') return;
      if (report.status === 'published' && !report.correctionDraftActive) {
        counts.published += 1;
        return;
      }
      counts.affectedUnpublished += 1;
      if (report.correctionDraftActive) counts.correction += 1;
      else if (report.status === 'pending_review') counts.pending_review += 1;
      else counts.incomplete += 1;
    });
    return {
      type: change.type,
      lineageId: (change.candidate && change.candidate.lineageId) || (change.previousRule && change.previousRule.lineageId) || null,
      fromVersion: change.previousRule ? change.previousRule.version : null,
      toVersion: change.candidate ? change.candidate.version : null,
      reportCounts: counts,
      publishedReportsUnchanged: counts.published,
      note: '已发布线上报告不会自动改变；未发布工作版本和活动更正版本需主动重新分析。'
    };
  }

  function getRuleChangeImpactInternal(state, sessionRule, type) {
    sessionRule = sessionRule || {};
    var lineageId = resolveSessionLineageId(state, sessionRule);
    var previous = (state.analysisRuleCatalog || []).find(function (rule) {
      return rule.lineageId === lineageId && rule.status === 'active';
    }) || null;
    return calculateRuleChangeImpact(state, {
      type: type || 'activate',
      candidate: type === 'deactivate' ? null : sessionRule,
      previousRule: previous
    });
  }

  function seedRule(spec, ts, stableOrder) {
    var conditions = (spec.conditions || []).map(function (c, i) {
      return Object.assign({ id: spec.id + '-c' + (i + 1) }, c);
    });
    return {
      id: spec.id,
      lineageId: spec.lineageId,
      version: spec.version || 1,
      status: spec.status === 'inactive' ? 'inactive' : 'active',
      name: spec.name,
      description: spec.description || '',
      target: spec.target,
      conditionLogic: spec.conditionLogic || 'ALL',
      conditions: conditions,
      applicableSpecies: spec.applicableSpecies || ['cat'],
      sourceTemplateIds: spec.sourceTemplateIds || [DEFAULT_SOURCE_ORG_ID, SECOND_SOURCE_ORG_ID],
      professionalBasis: spec.professionalBasis || '',
      reviewStatus: spec.reviewStatus || 'prototype_unreviewed',
      maintainer: spec.maintainer || '原型运营',
      riskLevel: spec.riskLevel || Engine.DEFAULT_RISK_PLACEHOLDER,
      priority: spec.priority || 10,
      stableOrder: stableOrder || 1,
      conflictGroup: spec.conflictGroup || null,
      output: spec.output,
      createdAt: ts,
      updatedAt: ts,
      activatedAt: spec.status === 'inactive' ? null : ts,
      activatedBy: spec.status === 'inactive' ? null : '原型运营'
    };
  }

  function numberSeedRules(rules) {
    return rules.map(function (rule, index) {
      rule.stableOrder = index + 1;
      return rule;
    });
  }

  function splitClosedSpeciesSeeds(base, ts) {
    return Engine.REPORTABLE_SPECIES.map(function (species) {
      var label = Engine.SPECIES_LABELS[species] || species;
      var spec = Object.assign({}, base, {
        id: base.id + '-' + species,
        lineageId: base.lineageId + '-' + species,
        applicableSpecies: [species],
        name: String(base.name || '').replace(/^猫和狗/, label)
      });
      return seedRule(spec, ts);
    });
  }

  function buildDefaultAnalysisRuleCatalog(ts) {
    var shared = [
      {
        id: 'rule-actino-low', lineageId: 'lineage-actino-low', name: '猫和狗 · 放线菌门 · 实验室标偏低',
        description: '单物种谱系演示文案；未经专业审核。',
        target: { level: 'phylum', taxonKey: 'Actinobacteria' },
        conditions: [{ type: 'LAB_NOTICE', notice: 'low' }],
        priority: 20, conflictGroup: 'actinobacteria',
        output: { analysis: '【演示·未审核】放线菌门被实验室标偏低，可能影响肠道屏障与免疫调节。', advice: '【演示·未审核】关注日常饮食多样性，可考虑益生菌补充。' }
      },
      {
        id: 'rule-firmi-unmarked', lineageId: 'lineage-firmi-unmarked', name: '猫和狗 · 厚壁菌门 · 实验室未标注',
        description: '单物种谱系演示文案；未经专业审核。',
        target: { level: 'phylum', taxonKey: 'Firmicutes' },
        conditions: [{ type: 'LAB_NOTICE', notice: 'unmarked' }],
        priority: 5, conflictGroup: 'firmicutes',
        output: { analysis: '【演示·未审核】厚壁菌门实验室未标注，不把它当成参考范围内。', advice: '【演示·未审核】保持当前饮食结构即可。' }
      },
      {
        id: 'rule-bactero-unmarked', lineageId: 'lineage-bactero-unmarked', name: '猫和狗 · 拟杆菌门 · 实验室未标注',
        description: '单物种谱系演示文案；未经专业审核。',
        target: { level: 'phylum', taxonKey: 'Bacteroidetes' },
        conditions: [{ type: 'LAB_NOTICE', notice: 'unmarked' }],
        priority: 5, conflictGroup: 'bacteroidetes',
        output: { analysis: '【演示·未审核】拟杆菌门实验室未标注。', advice: '【演示·未审核】继续维持饮食多样性。' }
      },
      {
        id: 'rule-fuso-nd', lineageId: 'lineage-fuso-nd', name: '猫和狗 · 梭杆菌属 · 未检出',
        description: '单物种谱系演示文案；未经专业审核。',
        target: { level: 'genus', taxonKey: 'Fusobacterium' },
        conditions: [{ type: 'NOT_DETECTED' }],
        priority: 25, conflictGroup: 'fusobacteria',
        output: { analysis: '【演示·未审核】梭杆菌属未检出，不可等同于偏低结论。', advice: '【演示·未审核】建议结合复检与其他指标综合判断。' }
      },
      {
        id: 'rule-proteus-high', lineageId: 'lineage-proteus-high', name: '猫和狗 · Proteus属 · 实验室标偏高',
        description: '单物种谱系演示文案；未经专业审核。',
        target: { level: 'genus', taxonKey: 'Proteus' },
        conditions: [{ type: 'LAB_NOTICE', notice: 'high' }],
        priority: 30, conflictGroup: 'proteobacteria-alert',
        output: { analysis: '【演示·未审核】Proteus 被实验室标偏高，变形菌门内潜在风险升高。', advice: '【演示·未审核】建议复查并关注消化道症状，必要时咨询兽医。' }
      },
      {
        id: 'rule-esh-high', lineageId: 'lineage-esh-high', name: '猫和狗 · Escherichia-Shigella属 · 实验室标偏高',
        description: '单物种谱系演示文案；未经专业审核。',
        target: { level: 'genus', taxonKey: 'Escherichia-Shigella' },
        conditions: [{ type: 'LAB_NOTICE', notice: 'high' }],
        priority: 20, conflictGroup: 'proteobacteria-alert',
        output: { analysis: '【演示·未审核】Escherichia-Shigella 被实验室标偏高。', advice: '【演示·未审核】减少易发酵零食，观察排便情况。' }
      },
      {
        id: 'rule-kleb-high', lineageId: 'lineage-kleb-high', name: '猫和狗 · Klebsiella属 · 实验室标偏高',
        description: '单物种谱系演示文案；未经专业审核。',
        target: { level: 'genus', taxonKey: 'Klebsiella' },
        conditions: [{ type: 'LAB_NOTICE', notice: 'high' }],
        priority: 10, conflictGroup: 'proteobacteria-alert',
        output: { analysis: '【演示·未审核】Klebsiella 被实验室标偏高。', advice: '【演示·未审核】持续观察，必要时复查。' }
      },
      {
        id: 'rule-kleb-present', lineageId: 'lineage-kleb-present', name: '猫和狗 · Klebsiella属 · 无有效范围',
        description: '次要观察演示：仅在报告对该菌没有有效范围时提示。建议栏空着。未经专业审核。',
        target: { level: 'genus', taxonKey: 'Klebsiella' },
        conditions: [{ type: 'RANGE_STATUS', rangeStatus: 'no_range' }],
        priority: 1, conflictGroup: 'klebsiella-notice',
        output: { analysis: '【演示·未审核】Klebsiella 已检出，但本报告无有效参考范围。', advice: '' }
      }
    ];
    var rules = [];
    shared.forEach(function (spec) {
      splitClosedSpeciesSeeds(spec, ts).forEach(function (rule) { rules.push(rule); });
    });
    rules.push(seedRule({
      id: 'rule-legacy-cross', lineageId: 'lineage-legacy-cross', name: '历史交叉条件（兼容）',
      description: '停用的历史多观察规则，供兼容视图演示；未经专业审核。',
      status: 'inactive',
      target: { level: 'phylum', taxonKey: 'Firmicutes' },
      conditionLogic: 'ALL',
      applicableSpecies: ['cat'],
      conditions: [
        { type: 'LAB_NOTICE', notice: 'high' },
        { type: 'SPECIES', species: ['cat'] },
        { type: 'OTHER_TAXON_STATUS', taxonKey: 'Bacteroidetes', statusKind: 'LAB_NOTICE', expected: 'unmarked' }
      ],
      priority: 8, conflictGroup: null,
      output: { analysis: '【演示·未审核】历史交叉条件规则，不参与当前启用集。', advice: '【演示·未审核】兼容保留，不作为新规则样例。' }
    }, ts));
    return numberSeedRules(rules);
  }

  function standardTaxonValues() {
    return {
      Firmicutes: 42.1,
      Bacteroidetes: 28.4,
      Proteobacteria: 11.2,
      Actinobacteria: 32.0,
      Fusobacteria: 6.0,
      Bacteroides: 18.0,
      Fusobacterium: 3.2,
      'Escherichia-Shigella': 6.5,
      Collinsella: 5.0,
      Streptococcus: 4.2,
      Peptacetobacter: 6.1,
      Proteus: 3.5,
      Klebsiella: 4.59,
      Mediterraneibacter: 4.0,
      Pseudomonas: 0.8
    };
  }

  function pushTaxonResults(state, list, spec) {
    var values = standardTaxonValues();
    Object.keys(values).forEach(function (key) {
      var override = (spec.overrides && spec.overrides[key]) || {};
      var value = override.value !== undefined ? override.value : values[key];
      var dataStatus = override.dataStatus || 'PRESENT';
      list.push(makeResult(state, {
        id: spec.idPrefix + '-' + key.replace(/[^A-Za-z0-9]/g, '') + '-v' + (override.version || 1),
        testRecordId: spec.testRecordId,
        reportId: spec.reportId,
        key: key,
        sourceTemplateId: spec.templateId,
        dataStatus: dataStatus,
        value: dataStatus === 'PRESENT' ? value : null,
        sourceValue: dataStatus === 'PRESENT' ? (override.sourceValue !== undefined ? override.sourceValue : value) : null,
        effectiveValue: dataStatus === 'PRESENT' ? value : null,
        labNotice: override.labNotice || 'unmarked',
        importedRange: override.importedRange || spec.importedRange || null,
        importedRangeDecision: override.importedRangeDecision || spec.importedRangeDecision || null,
        version: override.version || 1,
        isCurrent: override.isCurrent !== false,
        correctedFrom: override.correctedFrom || null,
        modifiedReason: override.modifiedReason || null,
        createdAt: spec.createdAt
      }));
    });
    (spec.extra || []).forEach(function (row) {
      list.push(makeResult(state, Object.assign({
        testRecordId: spec.testRecordId,
        reportId: spec.reportId,
        sourceTemplateId: spec.templateId,
        createdAt: spec.createdAt
      }, row)));
    });
  }

  function confirmAllUnitsInternal(state, reportId, actor) {
    listPhylumUnits(state, reportId).forEach(function (unit) {
      confirmPhylumUnitInternal(state, reportId, unit.phylumKey, { actor: actor });
    });
  }

  function assignDefaultProducts(state, reportId, mapping) {
    mapping = mapping || {};
    listPhylumUnits(state, reportId).forEach(function (unit) {
      var spec = mapping[unit.phylumKey] || { primaryProductId: 'prod-001', relatedProductIds: [] };
      try {
        savePhylumUnitProductsInternal(state, reportId, unit.phylumKey, spec);
      } catch (e) { /* 商品选择失败则跳过 */ }
    });
  }

  function saveAssessmentInternal(state, reportId, params) {
    params = params || {};
    var report = findReport(state, reportId);
    var ver = getWorkingReportVersion(state, reportId);
    if (params.reportSpecies != null) report.reportSpecies = params.reportSpecies;
    if (params.healthLevel != null) ver.healthLevel = params.healthLevel;
    if (params.healthScore != null) ver.healthScore = params.healthScore;
    if (params.percentile != null) ver.percentile = params.percentile;
    if (params.summary != null) ver.summary = params.summary;
    if (params.platformDimensions != null) ver.platformDimensions = clone(params.platformDimensions);
    report.updatedAt = nowIso();
  }

  function buildSeedState() {
    var ts = '2025-08-20T10:00:00.000Z';
    var catalog = defaultCatalog();
    backfillMissingCatalogSortOrders(catalog.microbiotaTaxa);
    backfillMissingCatalogSortOrders(catalog.testIndicators);
    backfillMissingCatalogSortOrders(catalog.breeds);

    var state = {
      meta: {
        version: 19,
        disclaimer: '',
        dataStatuses: DATA_STATUSES.slice(),
        reportStatuses: REPORT_STATUSES.slice(),
        initializedAt: ts
      },
      professionalCatalog: catalog,
      users: [
        { id: 'user-001', name: '张女士', phone: '13812345678', address: '北京市朝阳区某某小区', createdAt: ts },
        { id: 'user-002', name: '李先生', phone: '13987654321', address: '上海市浦东新区某某路', createdAt: ts },
        { id: 'user-003', name: '陈女士', phone: '13700001111', address: '广州市天河区某某街', createdAt: ts },
        { id: 'user-004', name: '周女士', phone: '13600002222', address: '杭州市西湖区某某苑', createdAt: ts }
      ],
      stores: [
        { id: 'store-001', name: '萌宠肠道健康中心（朝阳店）', code: 'STORE-BJ-CY-001', createdAt: ts },
        { id: 'store-002', name: '宠物医院肠道专科（浦东店）', code: 'STORE-SH-PD-002', createdAt: ts }
      ],
      pets: [
        { id: 'pet-001', userId: 'user-001', name: '小花', breed: '英国短毛猫', age: 3.5, gender: 'female', species: 'cat', storeId: 'store-001', claimStatus: 'bound', createdAt: ts },
        { id: 'pet-002', userId: 'user-001', name: '阿黄', breed: '金毛寻回犬', age: 5, gender: 'male', species: 'dog', storeId: 'store-002', claimStatus: 'bound', createdAt: ts },
        { id: 'pet-003', userId: 'user-002', name: '咪咪', breed: '布偶猫', age: 2, gender: 'female', species: 'cat', storeId: null, claimStatus: 'bound', opsCreated: true, createdAt: ts },
        { id: 'pet-004', userId: null, name: '旺仔', breed: '柯基', age: 4, gender: 'male', species: 'dog', storeId: 'store-001', claimStatus: 'unassigned', opsCreated: true, createdAt: ts },
        { id: 'pet-005', userId: 'user-002', name: '豆豆', breed: '中华田园猫', age: 1, gender: 'female', species: 'cat', storeId: 'store-001', claimStatus: 'bound', opsCreated: true, createdAt: ts },
        { id: 'pet-006', userId: 'user-004', name: '豆包', breed: '橘猫', age: 2.5, gender: 'male', species: 'cat', storeId: 'store-001', claimStatus: 'bound', createdAt: ts }
      ],
      categories: [
        { id: 'cat-001', name: '肠道健康', available: true, createdAt: ts },
        { id: 'cat-002', name: '益生菌调理', available: true, createdAt: ts },
        { id: 'cat-003', name: '已下架分类（兜底测试）', available: false, createdAt: ts }
      ],
      products: [
        { id: 'prod-001', spuId: 'prod-001', name: '益生菌套装 A', categoryId: 'cat-002', status: 'on_sale', available: true, stock: 25, price: 199, createdAt: ts },
        { id: 'prod-002', spuId: 'prod-002', name: '肠道调理粉（已下架）', categoryId: 'cat-001', status: 'off_shelf', available: false, stock: 0, price: 159, createdAt: ts },
        { id: 'prod-003', spuId: 'prod-003', name: '膳食纤维补充剂', categoryId: 'cat-001', status: 'on_sale', available: true, stock: 15, price: 89, createdAt: ts },
        { id: 'prod-004', spuId: 'prod-004', name: '益生菌套装 B（零库存）', categoryId: 'cat-002', status: 'zero_stock', available: true, stock: 0, price: 179, createdAt: ts },
        { id: 'prod-missing', spuId: 'prod-missing', name: '已回收商品（不存在）', categoryId: 'cat-001', status: 'recycled', deleted: true, available: false, stock: 0, price: 0, createdAt: ts }
      ],
      importBatches: [
        { id: 'batch-001', fileName: '检测结果导入_成功.xlsx', status: 'success', totalRows: 12, successRows: 12, failedRows: 0, errors: [], testRecordIds: ['tr-004'], createdAt: '2025-08-20T10:00:00.000Z' },
        { id: 'batch-002', fileName: '检测结果导入_失败.xlsx', status: 'failed', totalRows: 8, successRows: 0, failedRows: 8, errors: [{ row: 2, column: 'Actinobacteria', code: 'MISSING_COLUMN', message: '缺少必需列「Actinobacteria」' }], testRecordIds: ['tr-002'], createdAt: '2025-08-21T11:30:00.000Z' },
        { id: 'batch-harley', fileName: 'harley_final_microbiome_report.xlsx', status: 'success', totalRows: 16, successRows: 16, failedRows: 0, errors: [], testRecordIds: ['tr-006'], createdAt: '2025-08-19T09:00:00.000Z' },
        { id: 'batch-oscar', fileName: 'oscar_final_microbiome_report.xlsx', status: 'success', totalRows: 16, successRows: 16, failedRows: 0, errors: [], testRecordIds: ['tr-009'], createdAt: '2025-08-18T09:00:00.000Z' },
        { id: 'batch-007', fileName: '检测结果导入_豆包.xlsx', status: 'success', totalRows: 12, successRows: 12, failedRows: 0, errors: [], testRecordIds: ['tr-010'], createdAt: '2025-08-27T10:00:00.000Z' }
      ],
      testRecords: [
        { id: 'tr-001', petId: 'pet-001', userId: 'user-001', storeId: 'store-001', labStoreId: 'store-001', labName: '萌宠肠道健康中心（朝阳店）', sourceOrgId: DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-PARTIAL-001', sampleNumber: 'SAMPLE-PARTIAL-001', sampleType: 'feces', testDate: '2025-08-22', status: 'pending_result', importBatchId: null, claimStatus: 'bound', submissionType: 'in_store', label: 'SAMPLE-PARTIAL-001', createdAt: '2025-08-22T09:15:00.000Z', updatedAt: '2025-08-22T09:15:00.000Z' },
        { id: 'tr-002', petId: 'pet-002', userId: 'user-001', storeId: 'store-002', labStoreId: 'store-002', labName: '宠物医院肠道专科（浦东店）', sourceOrgId: DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-FAIL-002', sampleNumber: 'SAMPLE-FAIL-002', sampleType: 'feces', testDate: '2025-08-21', status: 'pending_review', importBatchId: 'batch-002', claimStatus: 'bound', submissionType: 'in_store', label: 'SAMPLE-FAIL-002', createdAt: '2025-08-21T11:30:00.000Z', updatedAt: '2025-08-21T11:30:00.000Z' },
        { id: 'tr-003', petId: 'pet-003', userId: 'user-002', storeId: null, labStoreId: null, labName: '', sourceOrgId: DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-REVIEW-003', sampleNumber: 'SAMPLE-REVIEW-003', sampleType: 'feces', testDate: '2025-08-23', status: 'pending_review', importBatchId: null, claimStatus: 'bound', submissionType: 'in_store', label: 'SAMPLE-REVIEW-003', createdAt: '2025-08-23T14:00:00.000Z', updatedAt: '2025-08-23T14:00:00.000Z' },
        { id: 'tr-004', petId: 'pet-001', userId: 'user-001', storeId: 'store-001', labStoreId: 'store-001', labName: '萌宠肠道健康中心（朝阳店）', sourceOrgId: DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-001', sampleNumber: 'SAMPLE-BJ-001', sampleType: 'feces', testDate: '2025-08-20', status: 'published', importBatchId: 'batch-001', claimStatus: 'bound', submissionType: 'in_store', label: 'SAMPLE-BJ-001', createdAt: '2025-08-20T10:00:00.000Z', updatedAt: '2025-08-24T16:00:00.000Z' },
        { id: 'tr-006', petId: 'pet-004', userId: null, storeId: 'store-001', labStoreId: 'store-001', labName: '萌宠肠道健康中心（朝阳店）', sourceOrgId: SECOND_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-HARLEY-006', sampleNumber: 'SAMPLE-HARLEY-006', sampleType: 'feces', testDate: '2025-08-18', status: 'published', importBatchId: 'batch-harley', claimStatus: 'unassigned', submissionType: 'in_store', label: 'SAMPLE-HARLEY-006', createdAt: '2025-08-19T09:00:00.000Z', updatedAt: '2025-08-19T16:00:00.000Z' },
        { id: 'tr-008', petId: 'pet-002', userId: 'user-001', storeId: 'store-002', labStoreId: 'store-002', labName: '宠物医院肠道专科（浦东店）', sourceOrgId: DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-VOID-008', sampleNumber: 'SAMPLE-VOID-008', sampleType: 'feces', testDate: '2025-08-10', status: 'voided', importBatchId: 'batch-001', claimStatus: 'bound', submissionType: 'in_store', label: 'SAMPLE-VOID-008', createdAt: '2025-08-10T09:00:00.000Z', updatedAt: '2025-08-12T10:00:00.000Z' },
        { id: 'tr-009', petId: 'pet-005', userId: 'user-002', storeId: 'store-001', labStoreId: null, labName: '', sourceOrgId: DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-OSCAR-009', sampleNumber: 'SAMPLE-OSCAR-009', sampleType: 'feces', testDate: '2025-08-25', status: 'pending_review', importBatchId: 'batch-oscar', claimStatus: 'bound', submissionType: 'customer_brought', label: 'SAMPLE-OSCAR-009', createdAt: '2025-08-18T09:00:00.000Z', updatedAt: '2025-08-18T09:00:00.000Z' },
        { id: 'tr-010', petId: 'pet-006', userId: 'user-004', storeId: 'store-001', labStoreId: 'store-001', labName: '萌宠肠道健康中心（朝阳店）', sourceOrgId: DEFAULT_SOURCE_ORG_ID, externalReportNumber: 'EXT-2025-007', sampleNumber: 'SAMPLE-HZ-007', sampleType: 'feces', testDate: '2025-08-27', status: 'published', importBatchId: 'batch-007', claimStatus: 'bound', submissionType: 'in_store', label: 'SAMPLE-HZ-007', createdAt: '2025-08-27T10:00:00.000Z', updatedAt: '2025-08-27T16:00:00.000Z' }
      ],
      indicators: [],
      reports: [],
      analysisRuleCatalog: buildDefaultAnalysisRuleCatalog(ts),
      analysisRuns: [],
      phylumAnalysisUnits: [],
      operationRecords: [],
      ownershipCorrections: [],
      petUserAssociationChanges: []
    };

    function baseReport(spec) {
      return {
        id: spec.id,
        reportNumber: spec.reportNumber,
        externalReportNumber: spec.externalReportNumber,
        sampleNumber: spec.sampleNumber,
        sourceOrgId: spec.sourceOrgId,
        testRecordId: spec.testRecordId,
        userId: spec.userId,
        petId: spec.petId,
        reportSpecies: spec.reportSpecies,
        status: spec.status,
        statusChangedAt: spec.statusChangedAt,
        ownershipStatus: spec.petId ? 'bound' : 'unassigned',
        todoFlags: [],
        rejectReason: spec.rejectReason || null,
        latestAnalysisRunId: null,
        currentVersion: 1,
        workingVersion: 1,
        publishedVersion: spec.publishedVersion != null ? spec.publishedVersion : null,
        correctionDraftActive: false,
        versions: [{
          version: 1, status: 'draft',
          healthLevel: spec.healthLevel || null,
          healthScore: spec.healthScore != null ? spec.healthScore : null,
          percentile: spec.percentile != null ? spec.percentile : null,
          platformDimensions: spec.platformDimensions || { emotion: 70, immunity: 72 },
          summary: spec.summary || '',
          createdAt: spec.createdAt, publishedAt: null
        }],
        createdAt: spec.createdAt,
        updatedAt: spec.updatedAt || spec.createdAt
      };
    }

    state.reports = [
      baseReport({
        id: 'report-001', reportNumber: 'RPT-2025-001', externalReportNumber: 'EXT-2025-001',
        sampleNumber: 'SAMPLE-BJ-001', sourceOrgId: DEFAULT_SOURCE_ORG_ID, testRecordId: 'tr-004',
        userId: 'user-001', petId: 'pet-001', reportSpecies: 'cat', status: 'incomplete',
        statusChangedAt: '2025-08-20T11:00:00.000Z', healthLevel: 'A', healthScore: 92, percentile: 80,
        platformDimensions: { emotion: 78, immunity: 82 }, summary: '肠道菌群整体良好。',
        createdAt: '2025-08-20T11:00:00.000Z'
      }),
      baseReport({
        id: 'report-002', reportNumber: 'RPT-2025-002', externalReportNumber: 'EXT-2025-REVIEW-003',
        sampleNumber: 'SAMPLE-REVIEW-003', sourceOrgId: DEFAULT_SOURCE_ORG_ID, testRecordId: 'tr-003',
        userId: 'user-002', petId: 'pet-003', reportSpecies: 'cat', status: 'incomplete',
        statusChangedAt: '2025-08-23T15:00:00.000Z', healthLevel: 'C', healthScore: 68, percentile: 45,
        platformDimensions: { emotion: 60, immunity: 58 }, summary: '部分指标异常，待审核发布。',
        createdAt: '2025-08-23T15:00:00.000Z'
      }),
      baseReport({
        id: 'report-003', reportNumber: 'RPT-2025-003', externalReportNumber: 'EXT-2025-FAIL-002',
        sampleNumber: 'SAMPLE-FAIL-002', sourceOrgId: DEFAULT_SOURCE_ORG_ID, testRecordId: 'tr-002',
        userId: 'user-001', petId: 'pet-002', reportSpecies: 'dog', status: 'incomplete',
        statusChangedAt: '2025-08-21T14:00:00.000Z', healthLevel: 'C', healthScore: 60, percentile: 40,
        platformDimensions: { emotion: 55, immunity: 50 }, summary: '导入数据不完整。',
        rejectReason: 'Excel 缺少放线菌门列，请补录后重新提交',
        createdAt: '2025-08-21T13:00:00.000Z', updatedAt: '2025-08-21T14:00:00.000Z'
      }),
      baseReport({
        id: 'report-004', reportNumber: 'RPT-2025-004', externalReportNumber: 'EXT-2025-HARLEY-006',
        sampleNumber: 'SAMPLE-HARLEY-006', sourceOrgId: SECOND_SOURCE_ORG_ID, testRecordId: 'tr-006',
        userId: null, petId: 'pet-004', reportSpecies: 'dog', status: 'incomplete',
        statusChangedAt: '2025-08-19T11:00:00.000Z', healthLevel: 'A', healthScore: 90, percentile: 70,
        platformDimensions: { emotion: 75, immunity: 80 }, summary: '肠道菌群整体良好。无平台参考范围。',
        createdAt: '2025-08-19T11:00:00.000Z'
      }),
      baseReport({
        id: 'report-005', reportNumber: 'RPT-2025-005', externalReportNumber: 'EXT-2025-VOID-008',
        sampleNumber: 'SAMPLE-VOID-008', sourceOrgId: DEFAULT_SOURCE_ORG_ID, testRecordId: 'tr-008',
        userId: 'user-001', petId: 'pet-002', reportSpecies: 'dog', status: 'incomplete',
        statusChangedAt: '2025-08-10T11:00:00.000Z', healthLevel: 'B', healthScore: 75, percentile: 55,
        platformDimensions: { emotion: 65, immunity: 70 }, summary: '曾发布后作废。',
        createdAt: '2025-08-10T11:00:00.000Z'
      }),
      baseReport({
        id: 'report-006', reportNumber: 'RPT-2025-006', externalReportNumber: 'EXT-2025-OSCAR-009',
        sampleNumber: 'SAMPLE-OSCAR-009', sourceOrgId: DEFAULT_SOURCE_ORG_ID, testRecordId: 'tr-009',
        userId: 'user-002', petId: 'pet-005', reportSpecies: 'cat', status: 'incomplete',
        statusChangedAt: '2025-08-18T09:00:00.000Z',
        createdAt: '2025-08-18T09:00:00.000Z'
      }),
      baseReport({
        id: 'report-007', reportNumber: 'RPT-2025-007', externalReportNumber: 'EXT-2025-007',
        sampleNumber: 'SAMPLE-HZ-007', sourceOrgId: DEFAULT_SOURCE_ORG_ID, testRecordId: 'tr-010',
        userId: 'user-004', petId: 'pet-006', reportSpecies: 'cat', status: 'incomplete',
        statusChangedAt: '2025-08-27T11:00:00.000Z', healthLevel: 'A', healthScore: 91, percentile: 58.1,
        platformDimensions: { emotion: 32.9, immunity: 67.2 }, summary: '肠道菌群整体良好。',
        createdAt: '2025-08-27T11:00:00.000Z'
      })
    ];

    var indicators = [];
    pushTaxonResults(state, indicators, {
      idPrefix: 'r1', testRecordId: 'tr-004', reportId: 'report-001',
      templateId: DEFAULT_SOURCE_ORG_ID, createdAt: '2025-08-20T10:30:00.000Z',
      overrides: {
        Actinobacteria: { value: 12.3 },
        Proteus: { value: 1.1 },
        'Escherichia-Shigella': { value: 2.0 },
        Klebsiella: { value: 1.2 }
      },
      extra: [
        { id: 'r1-alpha-v1', key: 'alpha-diversity', unit: 'index', value: 4.2, dataStatus: 'PRESENT' },
        { id: 'r1-evenness-v1', key: 'evenness', unit: 'index', value: 3.1, dataStatus: 'PRESENT' },
        { id: 'r1-richness-v1', key: 'richness', unit: 'count', value: 48, dataStatus: 'PRESENT' }
      ]
    });
    pushTaxonResults(state, indicators, {
      idPrefix: 'r2', testRecordId: 'tr-003', reportId: 'report-002',
      templateId: DEFAULT_SOURCE_ORG_ID, createdAt: '2025-08-23T14:30:00.000Z',
      overrides: {
        Actinobacteria: {
          value: 18.0, labNotice: 'low',
          importedRange: { min: 20, max: 40, unit: '%' }, importedRangeDecision: 'pending'
        },
        Fusobacterium: { value: null, dataStatus: 'NOT_DETECTED' },
        Proteus: { value: 3.5, labNotice: 'high' },
        'Escherichia-Shigella': { value: 6.5, labNotice: 'high' },
        Klebsiella: { value: 4.59, labNotice: 'high' },
        Firmicutes: { importedRange: { min: 20, max: 55, unit: '%' }, importedRangeDecision: 'pending' },
        Bacteroidetes: { importedRange: { min: 12, max: 36, unit: '%' }, importedRangeDecision: 'pending' }
      }
    });
    pushTaxonResults(state, indicators, {
      idPrefix: 'r3', testRecordId: 'tr-002', reportId: 'report-003',
      templateId: DEFAULT_SOURCE_ORG_ID, createdAt: '2025-08-21T12:00:00.000Z',
      overrides: {
        Actinobacteria: { value: null, dataStatus: 'MISSING_COLUMN' }
      }
    });
    pushTaxonResults(state, indicators, {
      idPrefix: 'r4', testRecordId: 'tr-006', reportId: 'report-004',
      templateId: SECOND_SOURCE_ORG_ID, createdAt: '2025-08-19T10:30:00.000Z',
      overrides: { Klebsiella: { value: 4.59 } }
    });
    pushTaxonResults(state, indicators, {
      idPrefix: 'r5', testRecordId: 'tr-008', reportId: 'report-005',
      templateId: DEFAULT_SOURCE_ORG_ID, createdAt: '2025-08-10T10:30:00.000Z',
      overrides: { Actinobacteria: { value: 28.0 }, Proteus: { value: 0.8 }, 'Escherichia-Shigella': { value: 1.5 }, Klebsiella: { value: 0.9 } }
    });
    pushTaxonResults(state, indicators, {
      idPrefix: 'r6', testRecordId: 'tr-009', reportId: 'report-006',
      templateId: DEFAULT_SOURCE_ORG_ID, createdAt: '2025-08-18T09:10:00.000Z',
      overrides: {
        Actinobacteria: { importedRange: { min: 20, max: 38, unit: '%' }, importedRangeDecision: 'pending' },
        Firmicutes: { importedRange: { min: 22, max: 48, unit: '%' }, importedRangeDecision: 'confirmed' },
        Bacteroidetes: { importedRange: { min: 10, max: 30, unit: '%' }, importedRangeDecision: 'rejected' }
      }
    });
    pushTaxonResults(state, indicators, {
      idPrefix: 'r7', testRecordId: 'tr-010', reportId: 'report-007',
      templateId: DEFAULT_SOURCE_ORG_ID, createdAt: '2025-08-27T10:30:00.000Z',
      extra: [
        { id: 'r7-alpha-v1', key: 'alpha-diversity', unit: 'index', value: 86.1, dataStatus: 'PRESENT' },
        { id: 'r7-evenness-v1', key: 'evenness', unit: 'index', value: 65.2, dataStatus: 'PRESENT' },
        { id: 'r7-richness-v1', key: 'richness', unit: 'count', value: 70.1, dataStatus: 'PRESENT' }
      ]
    });
    state.indicators = indicators;

    function prepareAndPublish(reportId, timeIso, productMap) {
      withTime(timeIso, function () {
        runReportAnalysisInternal(state, reportId, { actor: '系统' });
        confirmAllUnitsInternal(state, reportId, '审核员');
        assignDefaultProducts(state, reportId, productMap);
        var report = findReport(state, reportId);
        var ver = getWorkingReportVersion(state, reportId);
        if (ver) ver.status = 'pending_review';
        setReportStatus(report, 'pending_review');
        publishReportInternal(state, reportId, { actor: '审核员' });
      });
    }

    prepareAndPublish('report-001', '2025-08-20T16:00:00.000Z');
    withTime('2025-08-24T15:00:00.000Z', function () {
      createCorrectionDraftInternal(state, findReport(state, 'report-001'), { correctionNote: '放线菌门由实验室复核后更正' });
      var actino = currentResultsOf(state, 'report-001').find(function (r) { return r.key === 'Actinobacteria'; });
      modifyResultValueInternal(state, {
        reportId: 'report-001', resultId: actino.id, value: 18.5, reason: '实验室复核后更正放线菌门有效值'
      });
      runReportAnalysisInternal(state, 'report-001', { actor: '审核员' });
      confirmAllUnitsInternal(state, 'report-001', '审核员');
      assignDefaultProducts(state, 'report-001');
      saveAssessmentInternal(state, 'report-001', {
        healthLevel: 'B', healthScore: 85, percentile: 62,
        platformDimensions: { emotion: 75, immunity: 80 },
        summary: '放线菌门指标已更正，综合评级下调。'
      });
      submitReportInternal(state, 'report-001', { actor: '审核员' });
    });
    withTime('2025-08-24T16:00:00.000Z', function () {
      publishReportInternal(state, 'report-001', { actor: '审核员' });
    });

    withTime('2025-08-23T15:10:00.000Z', function () {
      runReportAnalysisInternal(state, 'report-002', { actor: '系统' });
      confirmAllUnitsInternal(state, 'report-002', '审核员');
      assignDefaultProducts(state, 'report-002', {
        Proteobacteria: { primaryProductId: 'prod-002', relatedProductIds: ['prod-004'] }
      });
      var r2 = findReport(state, 'report-002');
      var v = getWorkingReportVersion(state, 'report-002');
      v.status = 'pending_review';
      setReportStatus(r2, 'pending_review');
      r2.updatedAt = nowIso();
    });

    withTime('2025-08-21T13:30:00.000Z', function () {
      runReportAnalysisInternal(state, 'report-003', { actor: '系统' });
      var r3 = findReport(state, 'report-003');
      r3.rejectReason = 'Excel 缺少放线菌门列，请补录后重新提交';
      setReportStatus(r3, 'incomplete');
    });

    prepareAndPublish('report-004', '2025-08-19T16:00:00.000Z');
    withTime('2025-08-26T10:00:00.000Z', function () {
      createCorrectionDraftInternal(state, findReport(state, 'report-004'), { correctionNote: 'Klebsiella 有效值更正' });
      var kleb = currentResultsOf(state, 'report-004').find(function (r) { return r.key === 'Klebsiella'; });
      modifyResultValueInternal(state, {
        reportId: 'report-004', resultId: kleb.id, value: 6.10, reason: '更正草稿中将 Klebsiella 由 4.59 改为 6.10'
      });
    });

    prepareAndPublish('report-005', '2025-08-11T16:00:00.000Z');
    withTime('2025-08-12T10:00:00.000Z', function () {
      voidReportInternal(state, 'report-005', '客户要求作废重检');
    });

    prepareAndPublish('report-007', '2025-08-27T16:00:00.000Z');

    syncAllReportsDerived(state);
    return state;
  }

  function getState() { return clone(loadState()); }
  function peekState() { return loadState(); }

  function reset() {
    memoryState = null;
    setActorFixture(null);
    if (localStorageAvailable) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        LEGACY_STORAGE_KEYS.forEach(function (key) { localStorage.removeItem(key); });
      } catch (e) { localStorageAvailable = false; }
    }
    var state = buildSeedState();
    state.meta.resetAt = nowIso();
    persistState(state);
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
    var snapshot = clone(state);
    var result;
    try {
      result = mutator(state);
      syncAllReportsDerived(state);
      state.meta.lastModifiedAt = nowIso();
      persistState(state);
      return result !== undefined ? clone(result) : clone(state);
    } catch (err) {
      memoryState = snapshot;
      if (localStorageAvailable) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch (ignore) {}
      }
      throw err;
    }
  }

  function setReportStatusPublic(reportId, nextStatus) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      setReportStatus(report, nextStatus);
      report.updatedAt = nowIso();
      return report;
    });
  }

  function getReport(id) {
    var r = findReport(loadState(), id);
    return r ? clone(r) : null;
  }
  function listReports() { return clone(loadState().reports || []); }

  function getEffectiveResults(reportId) {
    var state = loadState();
    var report = findReport(state, reportId);
    if (!report) return [];
    return getDecoratedCurrentResults(state, report);
  }

  function getPhylumUnits(reportId) {
    return clone(listPhylumUnits(loadState(), reportId));
  }

  function decorateResultPublic(result, reportId) {
    var state = loadState();
    var report = reportId ? findReport(state, reportId) : (result && result.reportId ? findReport(state, result.reportId) : null);
    var species = report ? getReportSpecies(state, report) : null;
    return decorateResult(state, result, species);
  }

  function runReportAnalysis(reportId, options) {
    return commit(function (state) { return runReportAnalysisInternal(state, reportId, options); });
  }
  function savePhylumUnitDraft(reportId, phylumKey, patch) {
    return commit(function (state) { return savePhylumUnitDraftInternal(state, reportId, phylumKey, patch); });
  }
  function confirmPhylumUnit(reportId, phylumKey, options) {
    return commit(function (state) { return confirmPhylumUnitInternal(state, reportId, phylumKey, options); });
  }
  function excludeHit(reportId, phylumKey, hitId, params) {
    return commit(function (state) { return excludeHitInternal(state, reportId, phylumKey, hitId, params); });
  }
  function savePhylumUnitProducts(reportId, phylumKey, params) {
    return commit(function (state) { return savePhylumUnitProductsInternal(state, reportId, phylumKey, params); });
  }
  function modifyResultValue(params) {
    return commit(function (state) { return modifyResultValueInternal(state, params); });
  }
  function setImportedRangeDecision(params) {
    return commit(function (state) { return setImportedRangeDecisionInternal(state, params); });
  }
  function supplementResult(params) {
    return commit(function (state) { return supplementResultInternal(state, params); });
  }
  function submitReport(reportId, options) {
    return commit(function (state) { return submitReportInternal(state, reportId, options); });
  }
  function withdrawReport(reportId, options) {
    return commit(function (state) { return withdrawReportInternal(state, reportId, options); });
  }
  function rejectReport(reportId, reason, options) {
    return commit(function (state) { return rejectReportInternal(state, reportId, reason, options); });
  }
  function publishReport(reportId, options) {
    return commit(function (state) { return publishReportInternal(state, reportId, options); });
  }
  function createCorrectionDraft(reportId, params) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      createCorrectionDraftInternal(state, report, params);
      appendOperationRecord(state, {
        type: 'correction_draft',
        reportId: report.id,
        version: report.workingVersion,
        actor: (params && params.actor) || '审核员'
      });
      return report;
    });
  }
  function voidReport(reportId, reason, options) {
    return commit(function (state) { return voidReportInternal(state, reportId, reason, options); });
  }
  function assignReportOwnership(params) {
    return commit(function (state) { return assignReportOwnershipInternal(state, params); });
  }
  function saveAndActivateAnalysisRule(sessionRule, options) {
    return commit(function (state) { return saveAndActivateAnalysisRuleInternal(state, sessionRule, options); });
  }
  function copyAnalysisRuleToSpecies(ruleId, targetSpecies, options) {
    return commit(function (state) { return copyAnalysisRuleToSpeciesInternal(state, ruleId, targetSpecies, options); });
  }
  function deactivateAnalysisRuleLineage(lineageId, options) {
    return commit(function (state) { return deactivateAnalysisRuleLineageInternal(state, lineageId, options); });
  }
  function getRuleChangeImpact(sessionRule, type) {
    return clone(getRuleChangeImpactInternal(loadState(), sessionRule, type));
  }
  function validateAnalysisRuleDetailed(rule, includeActiveConflicts) {
    var state = loadState();
    var candidate = clone(rule || {});
    candidate.lineageId = resolveSessionLineageId(state, candidate) || candidate.lineageId;
    var errors = Engine.validateRuleDetails(candidate, taxaByKeyMap(state));
    if (includeActiveConflicts !== false && !errors.length) {
      Engine.validateConflictTies(activeRulesWithCandidate(state, candidate)).forEach(function (message) {
        errors.push({ field: 'conflictGroup', message: message });
      });
    }
    return errors;
  }
  function validateAnalysisRule(rule) {
    return validateAnalysisRuleDetailed(rule, true).map(function (item) { return item.message; });
  }
  function listTaxaForRuleTarget(level) {
    var taxa = (loadState().professionalCatalog && loadState().professionalCatalog.microbiotaTaxa) || [];
    return clone(taxa.filter(function (t) { return t.level === level; }));
  }
  function listConflictGroups() {
    var seen = {};
    return (loadState().analysisRuleCatalog || []).filter(function (rule) {
      if (!rule.conflictGroup || seen[rule.conflictGroup]) return false;
      seen[rule.conflictGroup] = true;
      return true;
    }).map(function (rule) { return rule.conflictGroup; }).sort();
  }
  function listRuleLineages() {
    var state = loadState();
    var groups = {};
    (state.analysisRuleCatalog || []).forEach(function (rule) {
      if (!groups[rule.lineageId]) groups[rule.lineageId] = [];
      groups[rule.lineageId].push(rule);
    });
    return Object.keys(groups).map(function (lineageId) {
      var versions = groups[lineageId].slice().sort(function (a, b) { return (b.version || 0) - (a.version || 0); });
      return {
        lineageId: lineageId,
        active: versions.find(function (rule) { return rule.status === 'active'; }) || null,
        history: versions.filter(function (rule) { return rule.status !== 'active'; }),
        latest: versions[0] || null
      };
    }).sort(function (a, b) {
      var ar = a.active || a.latest || {};
      var br = b.active || b.latest || {};
      return (Number(ar.stableOrder) || 0) - (Number(br.stableOrder) || 0) || String(ar.name || '').localeCompare(String(br.name || ''));
    });
  }
  function listRuleLibraryGroups(species) {
    var state = loadState();
    var taxaMap = taxaByKeyMap(state);
    var wanted = Engine.closedSpeciesList(species)[0];
    var lineages = listRuleLineages().filter(function (lineage) {
      var rule = lineage.active || lineage.latest || {};
      var list = Engine.normalizeSpeciesList(rule.applicableSpecies);
      return wanted && list.indexOf(wanted) >= 0;
    });
    var byPhylum = {};
    lineages.forEach(function (lineage) {
      var rule = lineage.active || lineage.latest || {};
      var target = rule.target || {};
      var taxon = taxaMap[target.taxonKey] || {};
      var phylumKey = target.level === 'phylum' ? target.taxonKey : (taxon.parentKey || 'unclassified');
      if (!byPhylum[phylumKey]) {
        byPhylum[phylumKey] = {
          phylumKey: phylumKey,
          label: taxonDisplayLabel(state, phylumKey),
          phylumLineages: [],
          genera: {}
        };
      }
      if (target.level === 'genus') {
        var gk = target.taxonKey;
        if (!byPhylum[phylumKey].genera[gk]) {
          byPhylum[phylumKey].genera[gk] = {
            genusKey: gk,
            label: taxonDisplayLabel(state, gk),
            lineages: []
          };
        }
        byPhylum[phylumKey].genera[gk].lineages.push(lineage);
      } else {
        byPhylum[phylumKey].phylumLineages.push(lineage);
      }
    });
    return Object.keys(byPhylum).sort(function (a, b) {
      return String(byPhylum[a].label || a).localeCompare(String(byPhylum[b].label || b), 'zh');
    }).map(function (pk) {
      var group = byPhylum[pk];
      group.genera = Object.keys(group.genera).sort(function (a, b) {
        return String(group.genera[a].label || a).localeCompare(String(group.genera[b].label || b), 'zh');
      }).map(function (gk) { return group.genera[gk]; });
      return group;
    });
  }
  function evaluateRuleSetForReport(state, report, rules) {
    var results = getDecoratedCurrentResults(state, report);
    var taxa = (state.professionalCatalog && state.professionalCatalog.microbiotaTaxa) || [];
    return Engine.evaluate({
      rules: rules,
      results: results,
      species: getReportSpecies(state, report),
      sourceTemplateId: report.sourceOrgId || null,
      taxa: taxa
    });
  }
  function summarizeEvaluationDiff(current, candidate) {
    function primaryMap(evaluation) {
      var map = {};
      (evaluation.units || []).forEach(function (unit) {
        (unit.hits || []).forEach(function (hit) {
          if (hit.combineStatus === 'primary' && !hit.excluded) map[hit.lineageId] = { hit: hit, phylumKey: unit.phylumKey };
        });
      });
      return map;
    }
    var currentHits = primaryMap(current);
    var candidateHits = primaryMap(candidate);
    var added = Object.keys(candidateHits).filter(function (key) { return !currentHits[key]; });
    var removed = Object.keys(currentHits).filter(function (key) { return !candidateHits[key]; });
    var changedUnits = [];
    var keys = {};
    (current.units || []).forEach(function (unit) { keys[unit.phylumKey] = true; });
    (candidate.units || []).forEach(function (unit) { keys[unit.phylumKey] = true; });
    Object.keys(keys).forEach(function (phylumKey) {
      var cu = (current.units || []).find(function (unit) { return unit.phylumKey === phylumKey; }) || { drafts: {}, riskLevel: null, hits: [] };
      var ca = (candidate.units || []).find(function (unit) { return unit.phylumKey === phylumKey; }) || { drafts: {}, riskLevel: null, hits: [] };
      var flags = [];
      if ((cu.drafts.analysis || '') !== (ca.drafts.analysis || '')) flags.push('analysis');
      if ((cu.drafts.advice || '') !== (ca.drafts.advice || '')) flags.push('advice');
      if ((cu.hits || []).length !== (ca.hits || []).length) flags.push('hits');
      if (flags.length) changedUnits.push({ phylumKey: phylumKey, changes: flags, current: cu, candidate: ca });
    });
    return { addedLineages: added, removedLineages: removed, changedUnits: changedUnits };
  }
  function previewRuleEvaluation(reportId, options) {
    options = options || {};
    var state = loadState();
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var activeRules = listActiveRules(state);
    var sessionCandidate = options.sessionCandidate ? clone(options.sessionCandidate) : null;
    if (sessionCandidate) sessionCandidate.lineageId = resolveSessionLineageId(state, sessionCandidate) || sessionCandidate.lineageId;
    var candidateSet = Engine.buildCandidateRuleSet(activeRules, sessionCandidate);
    var current = evaluateRuleSetForReport(state, report, activeRules);
    var candidate = evaluateRuleSetForReport(state, report, candidateSet.rules);
    var resultSignature = computeResultSignature(getDecoratedCurrentResults(state, report));
    var candidateRulesSignature = computeRulesSignature(candidateSet.rules);
    var createdAt = nowIso();
    var stableSeed = [reportId, report.workingVersion, resultSignature, candidateRulesSignature].join('|');
    return {
      runId: 'test-' + hashString(stableSeed),
      createdAt: createdAt,
      reportId: reportId,
      reportNumber: report.reportNumber || report.id,
      workingVersion: report.workingVersion || report.currentVersion || 1,
      species: getReportSpecies(state, report),
      sourceTemplateId: report.sourceOrgId || null,
      inputSignature: hashString(stableSeed),
      engineVersion: Engine.ENGINE_VERSION,
      baselineRules: activeRules.map(function (rule) { return { id: rule.id, lineageId: rule.lineageId, version: rule.version, name: rule.name }; }),
      candidateRules: candidateSet.rules.map(function (rule) { return { id: rule.id, lineageId: rule.lineageId, version: rule.version, name: rule.name, session: rule.status === 'session' }; }),
      replacement: candidateSet.replacement,
      current: current,
      candidate: candidate,
      diff: summarizeEvaluationDiff(current, candidate),
      readOnly: true
    };
  }
  function describeCondition(cond, rule) {
    return Engine.describeCondition(cond, rule);
  }

  function taxonDisplayLabel(state, key) {
    var taxa = (state.professionalCatalog && state.professionalCatalog.microbiotaTaxa) || [];
    var taxon = taxa.find(function (item) { return item.key === key; });
    if (!taxon) return key || '目标菌';
    return taxon.label || taxon.key;
  }

  function describeJudgmentSentenceForRule(rule) {
    var state = loadState();
    var key = rule && rule.target && rule.target.taxonKey;
    return Engine.describeJudgmentSentence(rule, taxonDisplayLabel(state, key));
  }

  function explainRuleForReport(reportId, rule) {
    var state = loadState();
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = Engine.buildContext({
      results: getDecoratedCurrentResults(state, report),
      species: getReportSpecies(state, report),
      sourceTemplateId: report.sourceOrgId || null,
      taxa: (state.professionalCatalog && state.professionalCatalog.microbiotaTaxa) || []
    });
    var key = rule && rule.target && rule.target.taxonKey;
    return Engine.explainRuleAgainstContext(rule, ctx, { taxonLabel: taxonDisplayLabel(state, key) });
  }

  function getWorkflowStatus(reportOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    return report ? report.status : null;
  }
  function getTodoFlags(reportOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    return report ? clone(report.todoFlags || []) : [];
  }
  function getCorrectionDraftStage(reportOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    return getCorrectionDraftStageFromReport(report);
  }
  function getPublishedVersionSnapshot(reportOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    if (!report) return null;
    return clone(getPublishedReportVersion(state, report.id));
  }
  function getWorkingVersionSnapshot(reportOrId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    if (!report) return null;
    return clone(getWorkingReportVersion(state, report.id));
  }
  function getLatestAnalysisRun(reportId) {
    var run = getLatestAnalysisRunFromState(loadState(), reportId);
    return run ? clone(run) : null;
  }
  function getUserReportStatus(reportOrId, userId) {
    var state = loadState();
    var report = typeof reportOrId === 'string' ? findReport(state, reportOrId) : reportOrId;
    if (!report || !userId) return null;
    var pet = findPet(state, report.petId);
    var bound = report.userId === userId || (pet && pet.userId === userId);
    if (!bound) return null;
    if (report.status === 'voided') return null;
    if (report.status === 'published') return 'published';
    return null;
  }
  function getPetPublishedReports(petId) {
    var state = loadState();
    return (state.reports || []).filter(function (report) {
      return report.petId === petId && report.status === 'published';
    }).sort(function (a, b) {
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    }).map(function (r) { return clone(r); });
  }
  function getUserVisibleReports(userId) {
    var state = loadState();
    return state.reports.filter(function (report) {
      return getUserReportStatus(report, userId) != null;
    }).map(function (report) {
      var publishedVersion = getPublishedReportVersion(state, report.id);
      return {
        report: clone(report),
        userStatus: getUserReportStatus(report, userId),
        publishedVersion: clone(publishedVersion),
        contentSnapshot: publishedVersion && publishedVersion.contentSnapshot ? clone(publishedVersion.contentSnapshot) : null
      };
    });
  }
  function getUserPublishedReportProjection(userId, reportId) {
    var state = loadState();
    var report = findReport(state, reportId);
    if (!report) return null;
    var userStatus = getUserReportStatus(report, userId);
    if (!userStatus) return null;
    var publishedVersion = getPublishedReportVersion(state, reportId);
    return {
      report: clone(report),
      publishedVersion: clone(publishedVersion),
      contentSnapshot: publishedVersion && publishedVersion.contentSnapshot ? clone(publishedVersion.contentSnapshot) : null,
      userStatus: userStatus
    };
  }

  function resolveProductAvailability(productId, stateOverride) {
    var state = stateOverride || loadState();
    var product = findProduct(state, productId);
    var status = getProductListingStatus(product);
    return {
      productId: productId || null,
      product: product ? clone(product) : null,
      status: status,
      available: status === 'on_sale',
      label: PRODUCT_STATUS_LABELS[status] || status
    };
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
      if (listingStatus === 'recycled' || product.deleted) return includeProductIds.indexOf(product.id) >= 0;
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
        id: product.id, spuId: product.spuId || product.id, name: product.name,
        categoryId: product.categoryId, status: getProductListingStatus(product),
        stock: product.stock, available: product.available
      };
    });
    return { items: items, total: total, page: page, pageSize: pageSize };
  }

  function checkDuplicateImportInternal(state, params) {
    return findLabScopedDuplicate(state, params || {});
  }
  function checkDuplicateImport(params) {
    return checkDuplicateImportInternal(loadState(), params || {});
  }

  function appendIndicatorsForTestRecord(state, testRecordId, indicators, source) {
    source = source || {};
    var rows = indicators || [
      { key: 'Actinobacteria', value: 22.5, unit: '%', dataStatus: 'PRESENT' },
      { key: 'Bacteroidetes', value: 33.1, unit: '%', dataStatus: 'PRESENT' },
      { key: 'Firmicutes', value: 41.0, unit: '%', dataStatus: 'PRESENT' }
    ];
    var report = findReportByTestRecord(state, testRecordId);
    rows.forEach(function (ind) {
      state.indicators.push(makeResult(state, {
        testRecordId: testRecordId,
        reportId: report ? report.id : null,
        key: ind.key,
        sourceTemplateId: ind.sourceTemplateId || source.sourceTemplateId || source.templateId || DEFAULT_SOURCE_ORG_ID,
        unit: ind.unit || '%',
        dataStatus: ind.dataStatus || 'PRESENT',
        value: ind.value,
        importedRange: ind.importedRange || null,
        importedRangeDecision: ind.importedRangeDecision || null,
        labNotice: ind.labNotice || 'unmarked'
      }));
    });
  }

  function updateTestRecordAfterImport(tr, file, batchId) {
    tr.importBatchId = batchId;
    tr.sourceOrgId = file.sourceOrgId || tr.sourceOrgId || DEFAULT_SOURCE_ORG_ID;
    if (file.externalReportNumber) tr.externalReportNumber = file.externalReportNumber;
    if (file.sampleNumber || file.sampleNo) {
      tr.sampleNumber = file.sampleNumber || file.sampleNo;
      tr.label = String(file.sampleNumber || file.sampleNo).trim();
    }
    if (tr.petId) {
      tr.status = 'pending_review';
      tr.claimStatus = tr.userId ? 'bound' : 'unassigned';
    } else {
      throw new Error('送检记录必须已关联宠物，不能导入后生成未挂宠物的报告');
    }
    tr.updatedAt = nowIso();
  }

  function ensureReportForImport(state, tr, params) {
    params = params || {};
    var report = findReportByTestRecord(state, tr.id);
    if (!report) report = generateReportInternal(state, tr, params);
    else {
      report.petId = tr.petId;
      report.userId = tr.userId;
      report.externalReportNumber = tr.externalReportNumber;
      report.sampleNumber = tr.sampleNumber;
      report.sourceOrgId = tr.sourceOrgId || report.sourceOrgId;
      report.updatedAt = nowIso();
      if (report.status === 'unassigned' && tr.petId) setReportStatus(report, 'incomplete');
    }
    state.indicators.forEach(function (ind) {
      if (ind.testRecordId === tr.id && ind.isCurrent) ind.reportId = report.id;
    });
    syncReportDerived(state, report);
    return report;
  }

  function registerTest(params) {
    params = params || {};
    return commit(function (state) {
      assertActionPermission('registerTest', params);
      var submissionType = params.submissionType;
      if (SUBMISSION_TYPES.indexOf(submissionType) < 0) throw new Error('请选择送检类型：本店送检或客户自带报告');
      if (!params.testDate) throw new Error('请选择送检日期');
      if (!params.storeId) throw new Error('请选择承接门店');
      var pet;
      if (params.petId) {
        pet = findPet(state, params.petId);
        if (!pet) throw new Error('宠物不存在');
      } else if (params.newPet) {
        var userId = params.userId;
        if (!userId && params.createUser) {
          var createdUser = createPlatformUserInternal(state, params.createUser);
          userId = createdUser.id;
        }
        if (!userId) throw new Error('新建宠物送检须指定用户或提供 createUser');
        var owner = findUser(state, userId);
        if (!owner) throw new Error('用户不存在');
        if (owner.disabled) throw new Error('用户已停用，无法登记送检');
        var newPet = params.newPet || {};
        pet = {
          id: bumpIds(state, 'pets', 'pet'),
          userId: userId,
          name: newPet.name || '新宠物',
          breed: newPet.breed || '未知品种',
          age: newPet.age != null ? newPet.age : null,
          gender: newPet.gender || 'unknown',
          species: newPet.species || 'dog',
          storeId: params.storeId || newPet.storeId || null,
          claimStatus: 'bound',
          opsCreated: true,
          createdAt: nowIso()
        };
        state.pets.push(pet);
      } else {
        throw new Error('请选择已关联用户的宠物');
      }
      if (!pet.userId) throw new Error('该宠物尚未关联平台用户，请先在客户管理或宠物档案完成关联');
      var sampleNumber = params.sampleNumber != null ? String(params.sampleNumber).trim() : '';
      var labStoreId = params.labStoreId || null;
      var labName = params.labName != null ? String(params.labName).trim() : '';
      if (submissionType === 'in_store') {
        if (!labStoreId) labStoreId = params.storeId || null;
        if (!labName && labStoreId) {
          var labStore = findStore(state, labStoreId);
          if (labStore) labName = labStore.name;
        }
      }
      var dup = findLabScopedDuplicate(state, {
        labStoreId: labStoreId,
        labName: labName,
        sampleNumber: sampleNumber,
        externalReportNumber: params.externalReportNumber
      });
      if (dup) throw new Error('同一检测机构下样本编号或外部报告编号已存在');
      var record = {
        id: bumpIds(state, 'testRecords', 'tr'),
        petId: pet.id, userId: pet.userId, storeId: params.storeId || pet.storeId || null,
        labStoreId: labStoreId,
        labName: labName,
        sourceOrgId: params.sourceOrgId || DEFAULT_SOURCE_ORG_ID,
        externalReportNumber: params.externalReportNumber || null,
        sampleNumber: sampleNumber, sampleType: params.sampleType || 'feces',
        testDate: params.testDate, status: 'pending_result', importBatchId: null,
        claimStatus: 'bound', submissionType: submissionType, label: sampleNumber || null, createdAt: nowIso(), updatedAt: nowIso()
      };
      state.testRecords.push(record);
      return record;
    });
  }

  function simulateExcelImportSuccess(params) {
    params = params || {};
    return commit(function (state) {
      var dup = checkDuplicateImportInternal(state, params);
      if (dup) throw new Error('duplicate import blocked: ' + dup.existingTestRecordId);
      var batchId = bumpIds(state, 'importBatches', 'batch');
      var testRecordId = params.testRecordId;
      var record = testRecordId ? findTestRecord(state, testRecordId) : null;
      if (!record) throw new Error('导入结果必须从已登记的送检记录发起，不做无预登记批量导入');
      if (!record.petId) throw new Error('送检记录必须已关联宠物');
      var hasPartial = (params.indicators || []).some(function (ind) {
        return ind.dataStatus && ind.dataStatus !== 'PRESENT';
      });
      var batchStatus = hasPartial ? 'partial' : 'success';
      updateTestRecordAfterImport(record, params, batchId);
      var rows = params.rows || 10;
      state.importBatches.push({
        id: batchId, fileName: params.fileName || '模拟导入成功.xlsx', status: batchStatus,
        totalRows: rows, successRows: batchStatus === 'partial' ? Math.max(1, rows - 1) : rows,
        failedRows: batchStatus === 'partial' ? 1 : 0,
        errors: batchStatus === 'partial' ? [{ row: rows, column: '局部字段', code: 'PARTIAL', message: '局部导入异常' }] : [],
        testRecordIds: [testRecordId], createdAt: nowIso()
      });
      appendIndicatorsForTestRecord(state, testRecordId, params.indicators, params);
      ensureReportForImport(state, record, params);
      return { batchId: batchId, testRecordId: testRecordId, batchStatus: batchStatus };
    });
  }

  function simulateBatchImport(params) {
    params = params || {};
    var files = params.files || [];
    var directedTestRecordId = params.testRecordId || null;
    if (!directedTestRecordId) {
      throw new Error('导入结果必须从已登记的送检记录发起，不做无预登记批量导入');
    }
    return commit(function (state) {
      var batchId = bumpIds(state, 'importBatches', 'batch');
      var fileResults = [];
      var directedRecord = directedTestRecordId ? findTestRecord(state, directedTestRecordId) : null;
      if (directedTestRecordId && !directedRecord) throw new Error('目标送检记录不存在: ' + directedTestRecordId);
      files.forEach(function (file) {
        file = file || {};
        var scenario = file.scenario || 'success';
        var fileName = file.fileName || '批量文件.xlsx';
        if (scenario === 'duplicate' || scenario === 'duplicate_force') {
          fileResults.push({ fileName: fileName, status: 'duplicate', error: { duplicate: true }, testRecordId: null });
          return;
        }
        if (scenario === 'failure') {
          fileResults.push({ fileName: fileName, status: 'failed', testRecordId: directedRecord ? directedRecord.id : null, errorCode: file.errorCode || 'MISSING_COLUMN' });
          return;
        }
        var partial = scenario === 'partial';
        var tr = directedRecord;
        if (!tr) throw new Error('导入结果必须从已登记的送检记录发起');
        if (!tr.petId) throw new Error('送检记录必须已关联宠物');
        var trId = tr.id;
        updateTestRecordAfterImport(tr, file, batchId);
        appendIndicatorsForTestRecord(state, trId, file.indicators, file);
        ensureReportForImport(state, tr, file);
        fileResults.push({ fileName: fileName, status: partial ? 'partial' : 'success', testRecordId: trId });
        if (directedRecord) directedRecord = null;
      });
      var successCount = fileResults.filter(function (r) { return r.status === 'success' || r.status === 'partial'; }).length;
      var failedCount = fileResults.filter(function (r) { return r.status === 'failed' || r.status === 'duplicate'; }).length;
      state.importBatches.push({
        id: batchId, fileName: params.fileName || '批量导入批次.xlsx',
        status: failedCount && successCount ? 'partial' : (failedCount ? 'failed' : 'success'),
        totalRows: files.length, successRows: successCount, failedRows: failedCount,
        errors: [], testRecordIds: fileResults.map(function (r) { return r.testRecordId; }).filter(Boolean),
        fileResults: fileResults, createdAt: nowIso()
      });
      return { batchId: batchId, fileResults: fileResults };
    });
  }

  function simulateExcelImportFailure(params) {
    params = params || {};
    return commit(function (state) {
      var batchId = bumpIds(state, 'importBatches', 'batch');
      var testRecordId = params.testRecordId;
      var record = testRecordId ? findTestRecord(state, testRecordId) : null;
      if (!record && testRecordId) throw new Error('testRecord not found: ' + testRecordId);
      if (record) {
        record.importBatchId = batchId;
        if (record.status !== 'pending_result') record.status = 'import_failed';
        record.updatedAt = nowIso();
        testRecordId = record.id;
      } else testRecordId = null;
      var errorCode = params.errorCode || 'MISSING_COLUMN';
      state.importBatches.push({
        id: batchId, fileName: params.fileName || '模拟导入失败.xlsx', status: 'failed',
        totalRows: params.totalRows || 5, successRows: 0, failedRows: params.totalRows || 5,
        errors: [{ row: params.errorRow || 2, column: params.errorColumn || 'Actinobacteria', code: errorCode, message: '导入失败: ' + errorCode }],
        testRecordIds: testRecordId ? [testRecordId] : [], createdAt: nowIso()
      });
      return { batchId: batchId, testRecordId: testRecordId, errorCode: errorCode };
    });
  }

  function generateReport(params) {
    params = params || {};
    if (!params.testRecordId) throw new Error('testRecordId is required');
    return commit(function (state) {
      var tr = findTestRecord(state, params.testRecordId);
      if (!tr) throw new Error('testRecord not found: ' + params.testRecordId);
      return generateReportInternal(state, tr, params);
    });
  }

  function createOpsPet(params) {
    params = params || {};
    return commit(function (state) {
      var pet = {
        id: bumpIds(state, 'pets', 'pet'), userId: params.userId || null,
        name: params.name || '运营建档宠物', breed: params.breed || '未知品种',
        age: params.age != null ? params.age : null, gender: params.gender || 'unknown',
        species: params.species || 'dog', storeId: params.storeId || null,
        claimStatus: params.userId ? 'bound' : 'unassigned', opsCreated: true, createdAt: nowIso()
      };
      state.pets.push(pet);
      return pet;
    });
  }

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
        reportId: report.id, fromUserId: report.userId, toUserId: params.userId,
        fromPetId: report.petId, toPetId: params.petId,
        actor: params.actor || '运营专员', reason: params.reason || '归属纠错', createdAt: nowIso()
      };
      state.ownershipCorrections.push(correction);
      report.userId = params.userId;
      report.petId = params.petId;
      report.updatedAt = nowIso();
      if (tr) {
        tr.userId = params.userId;
        tr.petId = params.petId;
        tr.claimStatus = 'bound';
        tr.updatedAt = nowIso();
      }
      syncReportDerived(state, report);
      appendOperationRecord(state, {
        type: 'ownership_correction',
        reportId: report.id,
        correctionId: correction.id,
        actor: correction.actor,
        reason: correction.reason
      });
      return correction;
    });
  }

  function syncPetLinkedEntities(state, petId, userId) {
    (state.reports || []).forEach(function (report) {
      if (report.petId !== petId) return;
      report.userId = userId || null;
      report.updatedAt = nowIso();
      syncReportDerived(state, report);
    });
    (state.testRecords || []).forEach(function (tr) {
      if (tr.petId !== petId) return;
      tr.userId = userId || null;
      tr.claimStatus = userId ? 'bound' : 'unassigned';
      tr.updatedAt = nowIso();
    });
  }

  function createPlatformUserInternal(state, params) {
    params = params || {};
    if (!params.phone || !String(params.phone).trim()) throw new Error('请填写手机号');
    var phone = String(params.phone).trim();
    var existing = (state.users || []).find(function (u) { return u.phone === phone; });
    if (existing) return existing;
    var user = {
      id: bumpIds(state, 'users', 'user'),
      name: params.name || '新用户',
      phone: phone,
      address: params.address || null,
      disabled: !!params.disabled,
      createdAt: nowIso()
    };
    state.users.push(user);
    return user;
  }

  function createPlatformUser(params) {
    params = params || {};
    return commit(function (state) {
      return createPlatformUserInternal(state, params);
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
        if (!params.reason || !String(params.reason).trim()) throw new Error('变更关联用户时必须填写原因');
        state.petUserAssociationChanges.push({
          id: bumpIds(state, 'petUserAssociationChanges', 'petuser'),
          petId: petId, fromUserId: pet.userId || null, toUserId: params.userId || null,
          actor: params.actor || '运营专员', reason: String(params.reason).trim(), createdAt: nowIso()
        });
        pet.userId = params.userId || null;
        pet.claimStatus = pet.userId ? 'bound' : 'unassigned';
        syncPetLinkedEntities(state, petId, pet.userId);
      }
      return pet;
    });
  }

  function updateProfessionalCatalog(mutator) {
    assertCatalogEditPermission();
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
      var item = catalog.microbiotaTaxa.find(function (t) { return t.key === taxonKey; });
      if (!item) throw new Error('taxon not found: ' + taxonKey);
      if (patch.latinName !== undefined) item.latinName = patch.latinName;
      if (patch.value !== undefined) item.value = patch.value;
      if (patch.edu !== undefined) item.edu = taxonEduForLevel(item, Object.assign({}, item.edu || {}, patch.edu || {}));
      return item;
    });
  }

  function getMicrobiotaPresentation() {
    var catalog = loadState().professionalCatalog || defaultCatalog();
    return clone(normalizeMicrobiotaPresentation(catalog.microbiotaPresentation, true));
  }

  function saveMicrobiotaPresentation(patch) {
    patch = patch || {};
    return updateProfessionalCatalog(function (catalog) {
      var current = catalog.microbiotaPresentation || defaultMicrobiotaPresentation();
      catalog.microbiotaPresentation = normalizeMicrobiotaPresentation(Object.assign({}, current, patch), false);
      catalog.meta = catalog.meta || {};
      catalog.meta.version = Math.max(catalog.meta.version || 0, 16);
      return catalog.microbiotaPresentation;
    });
  }

  function saveReportWorkVersionInternal(state, reportId, params, options) {
    params = params || {};
    options = normalizeActorOptions(options);
    var report = findReport(state, reportId);
    if (!report) throw new Error('report not found: ' + reportId);
    var ctx = assertActionPermission('saveReportAssessment', options, report);
    assertProfessionalEditPermission(report, ctx);
    if (params.assessment) validateAssessmentParams(params.assessment);
    var unitPatches = params.phylumUnits || [];
    unitPatches.forEach(function (patch) {
      if (!patch.phylumKey) throw new Error('phylumKey required');
      if (!findPhylumUnit(state, reportId, patch.phylumKey)) {
        throw new Error('phylum unit not found: ' + patch.phylumKey);
      }
    });
    if (params.assessment) saveAssessmentInternal(state, reportId, params.assessment);
    unitPatches.forEach(function (patch) {
      applyPhylumUnitDraftWrite(state, reportId, patch.phylumKey, patch);
    });
    report.contentUpdatedAt = report.updatedAt;
    report.contentUpdatedBy = options.actor || ctx.actor || '审核员';
    appendOperationRecord(state, {
      type: 'work_version_saved',
      reportId: reportId,
      actor: report.contentUpdatedBy,
      actorId: ctx.actorId
    });
    return report;
  }

  function saveReportAssessment(reportId, params, actor) {
    params = params || {};
    var actorOptions = typeof actor === 'object' && actor !== null ? actor : { actor: actor };
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found');
      var ctx = assertActionPermission('saveReportAssessment', actorOptions, report);
      assertProfessionalEditPermission(report, ctx);
      validateAssessmentParams(params);
      var ver = getWorkingReportVersion(state, reportId);
      if (!ver) throw new Error('working version not found');
      saveAssessmentInternal(state, reportId, params);
      report.contentUpdatedAt = report.updatedAt;
      report.contentUpdatedBy = actorOptions.actor || ctx.actor || '审核员';
      appendOperationRecord(state, {
        type: 'assessment_saved', reportId: reportId, version: ver.version,
        actor: report.contentUpdatedBy, actorId: ctx.actorId
      });
      return report;
    });
  }

  function saveReportWorkVersion(reportId, params, actor) {
    params = params || {};
    var actorOptions = typeof actor === 'object' && actor !== null ? actor : { actor: actor };
    return commit(function (state) {
      return saveReportWorkVersionInternal(state, reportId, params, actorOptions);
    });
  }

  function buildPublicationChecksPublic(reportId, stateOverride) {
    var state = stateOverride || loadState();
    var report = findReport(state, reportId);
    if (report) syncReportDerived(state, report);
    return collectPublicationChecks(state, reportId);
  }

  function hasAnyEffectiveRange(reportId) {
    var state = loadState();
    var report = findReport(state, reportId);
    if (!report) return false;
    return hasAnyEffectiveRangeFromResults(getDecoratedCurrentResults(state, report));
  }

  function removedApi(name) {
    return function () {
      throw new Error('[deprecated] ' + name + ' 已移除，请改用新状态机 / 菌门分析单元 API（见 issue 01 API 说明）');
    };
  }

  loadState();

  return {
    STORAGE_KEY: STORAGE_KEY,
    DATA_STATUSES: DATA_STATUSES,
    REPORT_STATUSES: REPORT_STATUSES,
    REPORT_STATUS_LABELS: REPORT_STATUS_LABELS,
    WORKFLOW_STATUSES: WORKFLOW_STATUSES,
    OWNERSHIP_STATUSES: OWNERSHIP_STATUSES,
    OWNERSHIP_STATUS_LABELS: OWNERSHIP_STATUS_LABELS,
    TODO_FLAG_LABELS: TODO_FLAG_LABELS,
    HEALTH_LEVELS: HEALTH_LEVELS,
    USER_REPORT_STATUSES: USER_REPORT_STATUSES,
    VERSION_STATUSES: VERSION_STATUSES,
    VERSION_STATUS_LABELS: VERSION_STATUS_LABELS,
    SUBMISSION_TYPES: SUBMISSION_TYPES,
    SUBMISSION_TYPE_LABELS: SUBMISSION_TYPE_LABELS,
    UNIT_CONFIRM_STATUSES: UNIT_CONFIRM_STATUSES,
    UNIT_CONFIRM_LABELS: UNIT_CONFIRM_LABELS,
    RANGE_SOURCES: RANGE_SOURCES,
    RANGE_SOURCE_LABELS: RANGE_SOURCE_LABELS,
    IMPORTED_RANGE_DECISIONS: IMPORTED_RANGE_DECISIONS,
    IMPORTED_RANGE_DECISION_LABELS: IMPORTED_RANGE_DECISION_LABELS,
    RANGE_STATUS_LABELS: RANGE_STATUS_LABELS,
    LAB_NOTICE_LABELS: LAB_NOTICE_LABELS,
    RISK_LEVEL_LABELS: RISK_LEVEL_LABELS,
    CONDITION_TYPE_LABELS: CONDITION_TYPE_LABELS,
    PRODUCT_STATUS_LABELS: PRODUCT_STATUS_LABELS,
    VALUE_SOURCES: VALUE_SOURCES,
    DEFAULT_SOURCE_ORG_ID: DEFAULT_SOURCE_ORG_ID,
    SECOND_SOURCE_ORG_ID: SECOND_SOURCE_ORG_ID,
    normalizeDataStatus: normalizeDataStatus,
    isPresentDataStatus: isPresentDataStatus,
    getState: getState,
    peekState: peekState,
    reset: reset,
    subscribe: subscribe,
    commit: commit,
    setActorFixture: setActorFixture,
    getPermissionProfile: getPermissionProfile,
    assertCatalogEditPermission: assertCatalogEditPermission,
    setReportStatus: setReportStatusPublic,
    getReport: getReport,
    listReports: listReports,
    getEffectiveResults: getEffectiveResults,
    getPhylumUnits: getPhylumUnits,
    decorateResult: decorateResultPublic,
    evaluateResult: decorateResultPublic,
    hasAnyEffectiveRange: hasAnyEffectiveRange,
    runReportAnalysis: runReportAnalysis,
    savePhylumUnitDraft: savePhylumUnitDraft,
    confirmPhylumUnit: confirmPhylumUnit,
    excludeHit: excludeHit,
    savePhylumUnitProducts: savePhylumUnitProducts,
    modifyResultValue: modifyResultValue,
    setImportedRangeDecision: setImportedRangeDecision,
    supplementResult: supplementResult,
    submitReport: submitReport,
    withdrawReport: withdrawReport,
    rejectReport: rejectReport,
    publishReport: publishReport,
    createCorrectionDraft: createCorrectionDraft,
    voidReport: voidReport,
    assignReportOwnership: assignReportOwnership,
    saveAndActivateAnalysisRule: saveAndActivateAnalysisRule,
    copyAnalysisRuleToSpecies: copyAnalysisRuleToSpecies,
    deactivateAnalysisRuleLineage: deactivateAnalysisRuleLineage,
    getRuleChangeImpact: getRuleChangeImpact,
    validateAnalysisRule: validateAnalysisRule,
    validateAnalysisRuleDetailed: validateAnalysisRuleDetailed,
    listTaxaForRuleTarget: listTaxaForRuleTarget,
    listConflictGroups: listConflictGroups,
    listRuleLineages: listRuleLineages,
    listRuleLibraryGroups: listRuleLibraryGroups,
    previewRuleEvaluation: previewRuleEvaluation,
    describeCondition: describeCondition,
    describeJudgmentSentenceForRule: describeJudgmentSentenceForRule,
    explainRuleForReport: explainRuleForReport,
    compileJudgment: Engine.compileJudgment,
    decompileJudgment: Engine.decompileJudgment,
    analyzeRuleShape: Engine.analyzeRuleShape,
    suggestRuleName: Engine.suggestRuleName,
    describeJudgmentSemantics: Engine.describeJudgmentSemantics,
    buildPublicationChecks: buildPublicationChecksPublic,
    getWorkflowStatus: getWorkflowStatus,
    getTodoFlags: getTodoFlags,
    getCorrectionDraftStage: getCorrectionDraftStage,
    getPublishedVersionSnapshot: getPublishedVersionSnapshot,
    getWorkingVersionSnapshot: getWorkingVersionSnapshot,
    getLatestAnalysisRun: getLatestAnalysisRun,
    getUserReportStatus: getUserReportStatus,
    getUserVisibleReports: getUserVisibleReports,
    getUserPublishedReportProjection: getUserPublishedReportProjection,
    getPetPublishedReports: getPetPublishedReports,
    resolveProductAvailability: resolveProductAvailability,
    searchProductsForPicker: searchProductsForPicker,
    normalizeRelatedProductIds: function (primaryProductId, relatedProductIds) {
      return normalizeRelatedProductIds(loadState(), primaryProductId, relatedProductIds);
    },
    registerTest: registerTest,
    simulateExcelImportSuccess: simulateExcelImportSuccess,
    simulateExcelImportFailure: simulateExcelImportFailure,
    simulateBatchImport: simulateBatchImport,
    checkDuplicateImport: checkDuplicateImport,
    generateReport: generateReport,
    createOpsPet: createOpsPet,
    correctOwnership: correctOwnership,
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
    resolveEffectiveRangeForIndicator: function (indicator, species) {
      var state = loadState();
      var decorated = decorateResult(state, indicator, species);
      return decorated.range ? { min: decorated.range.min, max: decorated.range.max, unit: decorated.range.unit, source: decorated.rangeSource } : null;
    },
    resolveSchemeRangeForIndicator: function (indicator, species) {
      var state = loadState();
      var catalog = state.professionalCatalog || defaultCatalog();
      var entry = findCatalogEntryByKey(state, indicator.key || indicator.rawImportName);
      return resolveSchemeRangeForIndicator(catalog, indicator, species, entry);
    },
    flattenSchemesToPlatformRanges: flattenSchemesToPlatformRanges,
    schemeHasValidItems: schemeHasValidItems,
    findActiveSchemeConflict: findActiveSchemeConflict,
    listKnownDetectionTemplates: listKnownDetectionTemplates,
    sortBySchemeItemOrder: sortBySchemeItemOrder,
    getActiveRangeSchemeForReport: function (reportId) {
      var state = loadState();
      var report = findReport(state, reportId);
      var scheme = findMatchingActiveSchemeForReport(state, report);
      return scheme ? clone(scheme) : null;
    },
    saveReportAssessment: saveReportAssessment,
    saveReportWorkVersion: saveReportWorkVersion,
    buildContentSnapshot: function (reportId, versionNo, actor) {
      var state = loadState();
      var report = findReport(state, reportId);
      return report ? clone(buildContentSnapshot(state, report, versionNo, actor)) : null;
    },
    defaultIndicators: defaultIndicators,
    defaultBreeds: defaultBreeds,
    defaultMicrobiotaTaxa: defaultMicrobiotaTaxa,
    ensurePhylumUnits: function (reportId) {
      return commit(function (state) {
        var report = findReport(state, reportId);
        ensurePhylumUnits(state, report);
        return listPhylumUnits(state, reportId);
      });
    },
    approveReport: removedApi('approveReport'),
    publishCorrection: removedApi('publishCorrection'),
    deriveWorkflowStatus: removedApi('deriveWorkflowStatus'),
    bindClaimCode: removedApi('bindClaimCode'),
    generateClaimCredential: removedApi('generateClaimCredential'),
    voidClaimCredential: removedApi('voidClaimCredential'),
    preBindPetToStore: removedApi('preBindPetToStore'),
    updateFinding: removedApi('updateFinding'),
    updateRecommendation: removedApi('updateRecommendation'),
    updateReportContent: removedApi('updateReportContent'),
    correctIndicator: removedApi('correctIndicator'),
    resolveRecommendationTarget: removedApi('resolveRecommendationTarget'),
    resolveHealthTagCandidates: removedApi('resolveHealthTagCandidates'),
    saveAnalysisFinalContent: removedApi('saveAnalysisFinalContent'),
    rejectReportToIncomplete: function (reportId, reason, actor) {
      return rejectReport(reportId, reason, { actor: actor });
    },
    createCorrectionDraftExtended: createCorrectionDraft,
    reviewCorrectionDraft: removedApi('reviewCorrectionDraft')
  };
});
