/**
 * 正常范围匹配工具类
 * 根据宠物品类动态匹配检测指标的正常范围
 */

class RangeMatcher {
  constructor() {
    // 从正常范围配置模块获取配置数据
    this.rangeConfigs = this.loadRangeConfigs();
  }

  /**
   * 加载正常范围配置数据
   * 实际应用中这里会从数据库或API获取
   */
  loadRangeConfigs() {
    // 模拟从正常范围配置模块获取的数据
    // 实际使用时应该从 normal-range-config 模块的数据源获取
    return [
      {
        id: 1,
        majorBreed: '猫',
        minorBreed: '英国短毛猫',
        indicatorType: '门',
        indicatorName: '放线菌门',
        minValue: 25.0,
        maxValue: 45.0,
        unit: '%'
      },
      {
        id: 2,
        majorBreed: '猫',
        minorBreed: '英国短毛猫',
        indicatorType: '属',
        indicatorName: '双歧杆菌',
        minValue: 12.0,
        maxValue: 28.0,
        unit: '%'
      },
      {
        id: 3,
        majorBreed: '狗',
        minorBreed: '金毛寻回犬',
        indicatorType: '门',
        indicatorName: '放线菌门',
        minValue: 30.0,
        maxValue: 50.0,
        unit: '%'
      },
      {
        id: 4,
        majorBreed: '猫',
        minorBreed: '通用猫科',
        indicatorType: '属',
        indicatorName: '乳酸菌',
        minValue: 15.0,
        maxValue: 30.0,
        unit: '%'
      },
      {
        id: 5,
        majorBreed: '狗',
        minorBreed: '通用犬科',
        indicatorType: '属',
        indicatorName: '乳酸菌',
        minValue: 18.0,
        maxValue: 35.0,
        unit: '%'
      },
      // 添加更多基于树形结构的配置...
    ];
  }

  /**
   * 根据宠物信息和检测指标获取正常范围
   * @param {Object} petInfo - 宠物信息 {majorBreed, minorBreed}
   * @param {string} indicatorType - 指标类型 ('门', '属')
   * @param {string} indicatorName - 指标名称
   * @returns {Object|null} - 正常范围信息 {minValue, maxValue, unit} 或 null
   */
  getNormalRange(petInfo, indicatorType, indicatorName) {
    const { majorBreed, minorBreed } = petInfo;

    // 1. 优先查找精确匹配（具体品种）
    let exactMatch = this.rangeConfigs.find(config =>
      config.majorBreed === majorBreed &&
      config.minorBreed === minorBreed &&
      config.indicatorType === indicatorType &&
      config.indicatorName === indicatorName
    );

    if (exactMatch) {
      return {
        minValue: exactMatch.minValue,
        maxValue: exactMatch.maxValue,
        unit: exactMatch.unit,
        source: 'exact', // 精确匹配
        sourceInfo: `${majorBreed} - ${minorBreed}`
      };
    }

    // 2. 查找通用品种匹配
    const generalBreedName = `通用${majorBreed}科`;
    let generalMatch = this.rangeConfigs.find(config =>
      config.majorBreed === majorBreed &&
      config.minorBreed === generalBreedName &&
      config.indicatorType === indicatorType &&
      config.indicatorName === indicatorName
    );

    if (generalMatch) {
      return {
        minValue: generalMatch.minValue,
        maxValue: generalMatch.maxValue,
        unit: generalMatch.unit,
        source: 'general', // 通用匹配
        sourceInfo: `${majorBreed}科通用标准`
      };
    }

    // 3. 如果没有找到，返回null
    return null;
  }

  /**
   * 批量获取多个指标的正常范围
   * @param {Object} petInfo - 宠物信息
   * @param {Array} indicators - 指标列表 [{type, name}, ...]
   * @returns {Object} - 指标名称映射到正常范围的对象
   */
  getBatchNormalRanges(petInfo, indicators) {
    const results = {};
    
    indicators.forEach(indicator => {
      const range = this.getNormalRange(petInfo, indicator.type, indicator.name);
      results[indicator.name] = range;
    });

    return results;
  }

  /**
   * 判断检测值是否在正常范围内
   * @param {number} value - 检测值
   * @param {Object} petInfo - 宠物信息
   * @param {string} indicatorType - 指标类型
   * @param {string} indicatorName - 指标名称
   * @returns {Object} - 判断结果 {isNormal, status, range, message}
   */
  evaluateValue(value, petInfo, indicatorType, indicatorName) {
    const range = this.getNormalRange(petInfo, indicatorType, indicatorName);

    if (!range) {
      return {
        isNormal: null,
        status: 'unknown',
        range: null,
        message: '暂无该品种的参考范围数据'
      };
    }

    const isNormal = value >= range.minValue && value <= range.maxValue;
    let status, message;

    if (isNormal) {
      status = 'normal';
      message = '正常范围内';
    } else if (value < range.minValue) {
      status = 'low';
      message = '低于正常范围';
    } else {
      status = 'high';
      message = '高于正常范围';
    }

    return {
      isNormal,
      status,
      range,
      message,
      value,
      deviation: isNormal ? 0 : Math.min(
        Math.abs(value - range.minValue),
        Math.abs(value - range.maxValue)
      )
    };
  }

  /**
   * 批量评估多个检测值
   * @param {Object} testData - 检测数据 {indicatorName: value, ...}
   * @param {Object} petInfo - 宠物信息
   * @param {Object} indicatorTypes - 指标类型映射 {indicatorName: type, ...}
   * @returns {Object} - 评估结果
   */
  batchEvaluate(testData, petInfo, indicatorTypes) {
    const results = {
      normal: [],
      abnormal: [],
      unknown: [],
      summary: {
        total: 0,
        normalCount: 0,
        abnormalCount: 0,
        unknownCount: 0,
        normalRate: 0
      }
    };

    Object.entries(testData).forEach(([indicatorName, value]) => {
      const indicatorType = indicatorTypes[indicatorName] || '门'; // 默认为门
      const evaluation = this.evaluateValue(value, petInfo, indicatorType, indicatorName);
      
      const resultItem = {
        indicatorName,
        indicatorType,
        value,
        evaluation
      };

      if (evaluation.status === 'normal') {
        results.normal.push(resultItem);
        results.summary.normalCount++;
      } else if (evaluation.status === 'unknown') {
        results.unknown.push(resultItem);
        results.summary.unknownCount++;
      } else {
        results.abnormal.push(resultItem);
        results.summary.abnormalCount++;
      }

      results.summary.total++;
    });

    // 计算正常率（排除unknown）
    const knownCount = results.summary.normalCount + results.summary.abnormalCount;
    results.summary.normalRate = knownCount > 0 ? 
      (results.summary.normalCount / knownCount * 100).toFixed(1) : 0;

    return results;
  }

  /**
   * 获取可用的宠物品种列表
   * @returns {Object} - 品种配置
   */
  getAvailableBreeds() {
    // 优先从字典数据服务获取
    if (typeof window.dictionaryDataService !== 'undefined') {
      return window.dictionaryDataService.getFlatBreedConfig();
    }
    
    // 降级方案：从配置数据中提取
    const breeds = {};
    
    this.rangeConfigs.forEach(config => {
      if (!breeds[config.majorBreed]) {
        breeds[config.majorBreed] = new Set();
      }
      breeds[config.majorBreed].add(config.minorBreed);
    });

    // 转换 Set 为 Array
    Object.keys(breeds).forEach(major => {
      breeds[major] = Array.from(breeds[major]);
    });

    return breeds;
  }

  /**
   * 获取可用的检测指标列表
   * @param {string} majorBreed - 大品种
   * @param {string} minorBreed - 小品种
   * @returns {Object} - 按类型分组的指标列表
   */
  getAvailableIndicators(majorBreed, minorBreed) {
    const indicators = {
      '门': new Set(),
      '属': new Set()
    };

    this.rangeConfigs
      .filter(config => 
        config.majorBreed === majorBreed && 
        (config.minorBreed === minorBreed || config.minorBreed === `通用${majorBreed}科`)
      )
      .forEach(config => {
        if (indicators[config.indicatorType]) {
          indicators[config.indicatorType].add(config.indicatorName);
        }
      });

    // 转换 Set 为 Array
    Object.keys(indicators).forEach(type => {
      indicators[type] = Array.from(indicators[type]);
    });

    return indicators;
  }

  /**
   * 重新加载配置数据
   * 当正常范围配置模块有更新时调用
   */
  reloadConfigs() {
    this.rangeConfigs = this.loadRangeConfigs();
  }

  /**
   * 添加新的配置
   * @param {Object} config - 新配置
   */
  addConfig(config) {
    this.rangeConfigs.push(config);
  }

  /**
   * 更新配置
   * @param {number} id - 配置ID
   * @param {Object} updates - 更新内容
   */
  updateConfig(id, updates) {
    const index = this.rangeConfigs.findIndex(config => config.id === id);
    if (index !== -1) {
      this.rangeConfigs[index] = { ...this.rangeConfigs[index], ...updates };
    }
  }

  /**
   * 删除配置
   * @param {number} id - 配置ID
   */
  removeConfig(id) {
    this.rangeConfigs = this.rangeConfigs.filter(config => config.id !== id);
  }
}

// 创建全局实例
const rangeMatcher = new RangeMatcher();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RangeMatcher, rangeMatcher };
} else if (typeof window !== 'undefined') {
  window.RangeMatcher = RangeMatcher;
  window.rangeMatcher = rangeMatcher;
}
