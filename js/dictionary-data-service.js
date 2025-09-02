/**
 * 字典数据服务
 * 提供统一的字典数据获取接口，确保各模块数据一致性
 */

class DictionaryDataService {
  constructor() {
    this.dictionaryData = [];
    this.loadDictionaryData();
  }

  /**
   * 加载字典数据
   * 实际应用中这里会从字典管理模块或API获取数据
   */
  loadDictionaryData() {
    // 模拟从字典管理模块获取数据
    // 实际使用时应该调用字典管理模块的数据或API
    this.dictionaryData = [
      {
        id: 1,
        key: "pet",
        label: "宠物类别",
        value: "宠物类别根节点",
        parentKey: null,
      },
      {
        id: 2,
        key: "cat",
        label: "猫科",
        value: "猫科动物",
        parentKey: "pet",
      },
      {
        id: 3,
        key: "dog",
        label: "犬科",
        value: "犬科动物",
        parentKey: "pet",
      },
      {
        id: 4,
        key: "british-short",
        label: "英短",
        value: "英国短毛猫",
        parentKey: "cat",
      },
      {
        id: 5,
        key: "orange-cat",
        label: "橘猫",
        value: "橘猫",
        parentKey: "cat",
      },
      {
        id: 6,
        key: "persian",
        label: "波斯猫",
        value: "波斯猫",
        parentKey: "cat",
      },
      {
        id: 7,
        key: "siamese",
        label: "暹罗猫",
        value: "暹罗猫",
        parentKey: "cat",
      },
      {
        id: 8,
        key: "ragdoll",
        label: "布偶猫",
        value: "布偶猫",
        parentKey: "cat",
      },
      {
        id: 9,
        key: "maine-coon",
        label: "缅因猫",
        value: "缅因猫",
        parentKey: "cat",
      },
      {
        id: 10,
        key: "common-cat",
        label: "通用猫科",
        value: "适用于大部分猫科动物",
        parentKey: "cat",
      },
      {
        id: 11,
        key: "golden-retriever",
        label: "金毛寻回犬",
        value: "金毛寻回犬",
        parentKey: "dog",
      },
      {
        id: 12,
        key: "labrador",
        label: "拉布拉多犬",
        value: "拉布拉多犬",
        parentKey: "dog",
      },
      {
        id: 13,
        key: "husky",
        label: "哈士奇",
        value: "哈士奇",
        parentKey: "dog",
      },
      {
        id: 14,
        key: "samoyed",
        label: "萨摩耶",
        value: "萨摩耶",
        parentKey: "dog",
      },
      {
        id: 15,
        key: "border-collie",
        label: "边境牧羊犬",
        value: "边境牧羊犬",
        parentKey: "dog",
      },
      {
        id: 16,
        key: "german-shepherd",
        label: "德国牧羊犬",
        value: "德国牧羊犬",
        parentKey: "dog",
      },
      {
        id: 17,
        key: "teddy",
        label: "泰迪",
        value: "泰迪",
        parentKey: "dog",
      },
      {
        id: 18,
        key: "bichon",
        label: "比熊",
        value: "比熊",
        parentKey: "dog",
      },
      {
        id: 19,
        key: "pomeranian",
        label: "博美",
        value: "博美",
        parentKey: "dog",
      },
      {
        id: 20,
        key: "corgi",
        label: "柯基",
        value: "柯基",
        parentKey: "dog",
      },
      {
        id: 21,
        key: "french-bulldog",
        label: "法斗",
        value: "法国斗牛犬",
        parentKey: "dog",
      },
      {
        id: 22,
        key: "chinese-rural-dog",
        label: "中华田园犬",
        value: "中华田园犬",
        parentKey: "dog",
      },
      {
        id: 23,
        key: "common-dog",
        label: "通用犬科",
        value: "适用于大部分犬科动物",
        parentKey: "dog",
      },
      {
        id: 24,
        key: "rabbit",
        label: "兔科",
        value: "兔科动物",
        parentKey: "pet",
      },
      {
        id: 25,
        key: "lop-rabbit",
        label: "垂耳兔",
        value: "垂耳兔",
        parentKey: "rabbit",
      },
      {
        id: 26,
        key: "dwarf-rabbit",
        label: "侏儒兔",
        value: "侏儒兔",
        parentKey: "rabbit",
      },
      {
        id: 27,
        key: "angora-rabbit",
        label: "安哥拉兔",
        value: "安哥拉兔",
        parentKey: "rabbit",
      },
      {
        id: 28,
        key: "dutch-rabbit",
        label: "荷兰兔",
        value: "荷兰兔",
        parentKey: "rabbit",
      },
      {
        id: 29,
        key: "lion-head-rabbit",
        label: "狮子兔",
        value: "狮子兔",
        parentKey: "rabbit",
      },
      {
        id: 30,
        key: "common-rabbit",
        label: "通用兔科",
        value: "适用于大部分兔科动物",
        parentKey: "rabbit",
      },
      {
        id: 31,
        key: "hamster",
        label: "仓鼠科",
        value: "仓鼠科动物",
        parentKey: "pet",
      },
      {
        id: 32,
        key: "golden-hamster",
        label: "金丝熊",
        value: "金丝熊",
        parentKey: "hamster",
      },
      {
        id: 33,
        key: "dwarf-hamster",
        label: "三线仓鼠",
        value: "三线仓鼠",
        parentKey: "hamster",
      },
      {
        id: 34,
        key: "chinese-hamster",
        label: "一线仓鼠",
        value: "一线仓鼠",
        parentKey: "hamster",
      },
      {
        id: 35,
        key: "common-hamster",
        label: "通用仓鼠",
        value: "适用于大部分仓鼠",
        parentKey: "hamster",
      },
      {
        id: 36,
        key: "bird",
        label: "鸟类",
        value: "鸟类动物",
        parentKey: "pet",
      },
      {
        id: 37,
        key: "parrot",
        label: "鹦鹉",
        value: "鹦鹉",
        parentKey: "bird",
      },
      {
        id: 38,
        key: "canary",
        label: "金丝雀",
        value: "金丝雀",
        parentKey: "bird",
      },
      {
        id: 39,
        key: "common-bird",
        label: "通用鸟类",
        value: "适用于大部分鸟类",
        parentKey: "bird",
      },
      {
        id: 40,
        key: "reptile",
        label: "爬行动物",
        value: "爬行动物",
        parentKey: "pet",
      },
      {
        id: 41,
        key: "turtle",
        label: "乌龟",
        value: "乌龟",
        parentKey: "reptile",
      },
      {
        id: 42,
        key: "lizard",
        label: "蜥蜴",
        value: "蜥蜴",
        parentKey: "reptile",
      },
      {
        id: 43,
        key: "common-reptile",
        label: "通用爬行动物",
        value: "适用于大部分爬行动物",
        parentKey: "reptile",
      }
    ];
  }

  /**
   * 获取所有宠物大品种
   * @returns {Array} 大品种列表
   */
  getPetMajorBreeds() {
    return this.dictionaryData
      .filter(item => item.parentKey === 'pet')
      .map(item => ({
        key: item.key,
        label: item.label,
        value: item.value
      }));
  }

  /**
   * 获取指定大品种下的小品种
   * @param {string} majorBreedKey - 大品种的key
   * @returns {Array} 小品种列表
   */
  getPetMinorBreeds(majorBreedKey) {
    return this.dictionaryData
      .filter(item => item.parentKey === majorBreedKey)
      .map(item => ({
        key: item.key,
        label: item.label,
        value: item.value
      }));
  }

  /**
   * 根据key获取品种信息
   * @param {string} breedKey - 品种key
   * @returns {Object|null} 品种信息
   */
  getBreedByKey(breedKey) {
    return this.dictionaryData.find(item => item.key === breedKey) || null;
  }

  /**
   * 根据label获取品种信息
   * @param {string} breedLabel - 品种label
   * @returns {Object|null} 品种信息
   */
  getBreedByLabel(breedLabel) {
    return this.dictionaryData.find(item => item.label === breedLabel) || null;
  }

  /**
   * 获取品种的层级路径
   * @param {string} breedKey - 品种key
   * @returns {Array} 层级路径
   */
  getBreedPath(breedKey) {
    const path = [];
    let current = this.getBreedByKey(breedKey);
    
    while (current) {
      path.unshift(current);
      if (current.parentKey) {
        current = this.getBreedByKey(current.parentKey);
      } else {
        break;
      }
    }
    
    return path;
  }

  /**
   * 构建品种层级树
   * @returns {Object} 品种树形结构
   */
  buildBreedTree() {
    const tree = {};
    const majorBreeds = this.getPetMajorBreeds();
    
    majorBreeds.forEach(majorBreed => {
      tree[majorBreed.label] = {
        key: majorBreed.key,
        label: majorBreed.label,
        value: majorBreed.value,
        children: this.getPetMinorBreeds(majorBreed.key)
      };
    });
    
    return tree;
  }

  /**
   * 从字典管理模块同步数据
   * 当字典管理模块数据更新时调用此方法
   */
  syncFromDictionaryManagement(customKeys = null) {
    if (customKeys) {
      // 更新宠物相关的字典数据
      this.dictionaryData = customKeys.filter(item => 
        item.parentKey === 'pet' || 
        this.findParentChain(item.key, customKeys).includes('pet')
      );
    } else if (typeof window !== 'undefined' && window.customKeys) {
      this.dictionaryData = window.customKeys.filter(item => 
        item.parentKey === 'pet' || 
        this.findParentChain(item.key, window.customKeys).includes('pet')
      );
    }
  }

  /**
   * 查找项目的父级链
   * @param {string} key - 项目key
   * @param {Array} data - 数据源
   * @returns {Array} 父级链
   */
  findParentChain(key, data) {
    const chain = [];
    let current = data.find(item => item.key === key);
    
    while (current && current.parentKey) {
      chain.unshift(current.parentKey);
      current = data.find(item => item.key === current.parentKey);
    }
    
    return chain;
  }

  /**
   * 获取扁平化的品种配置（向后兼容）
   * @returns {Object} 扁平化配置
   */
  getFlatBreedConfig() {
    const config = {};
    const majorBreeds = this.getPetMajorBreeds();
    
    majorBreeds.forEach(majorBreed => {
      config[majorBreed.label] = this.getPetMinorBreeds(majorBreed.key).map(minor => minor.label);
    });
    
    return config;
  }

  /**
   * 验证品种组合是否有效
   * @param {string} majorBreed - 大品种
   * @param {string} minorBreed - 小品种
   * @returns {boolean} 是否有效
   */
  validateBreedCombination(majorBreed, minorBreed) {
    const majorBreedData = this.getBreedByLabel(majorBreed);
    if (!majorBreedData) return false;
    
    const minorBreeds = this.getPetMinorBreeds(majorBreedData.key);
    return minorBreeds.some(minor => minor.label === minorBreed);
  }

  /**
   * 搜索品种
   * @param {string} searchTerm - 搜索词
   * @returns {Array} 搜索结果
   */
  searchBreeds(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.dictionaryData
      .filter(item => 
        item.parentKey === 'pet' || 
        this.dictionaryData.some(d => d.key === item.parentKey && d.parentKey === 'pet')
      )
      .filter(item => 
        item.label.toLowerCase().includes(term) || 
        item.value.toLowerCase().includes(term)
      )
      .map(item => ({
        key: item.key,
        label: item.label,
        value: item.value,
        type: item.parentKey === 'pet' ? '大品种' : '小品种'
      }));
  }
}

// 创建全局实例
const dictionaryDataService = new DictionaryDataService();

// 监听字典配置更新事件
if (typeof document !== 'undefined') {
  document.addEventListener('breedConfigUpdated', (event) => {
    dictionaryDataService.syncFromDictionaryManagement(event.detail.customKeys);
    console.log('字典数据服务已同步最新的品种配置');
  });
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DictionaryDataService, dictionaryDataService };
} else if (typeof window !== 'undefined') {
  window.DictionaryDataService = DictionaryDataService;
  window.dictionaryDataService = dictionaryDataService;
}
