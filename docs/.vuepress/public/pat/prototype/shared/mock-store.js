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

  var DATA_STATUSES = ['PRESENT', 'MISSING_COLUMN', 'EMPTY', 'NOT_DETECTED', 'INVALID', 'NOT_APPLICABLE'];
  var CONCLUSION_LEVELS = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];
  var REPORT_STATUSES = ['draft', 'pending_review', 'rejected', 'approved', 'published', 'corrected'];
  var RECOMMEND_TYPES = ['PRODUCT', 'CATEGORY', 'NONE'];

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

  function migrateState(state) {
    if (!state) return state;
    ['indicators', 'findings'].forEach(function (collection) {
      if (!state[collection]) return;
      state[collection].forEach(function (item) {
        if (item.dataStatus) item.dataStatus = normalizeDataStatus(item.dataStatus);
      });
    });
    if (state.meta && state.meta.dataStatuses) {
      state.meta.dataStatuses = DATA_STATUSES.slice();
    }
    return state;
  }

  // ─── Seed ───────────────────────────────────────────────────────────────

  function buildSeedState() {
    var ts = '2025-08-25T08:00:00.000Z';

    var users = [
      {
        id: 'user-001',
        name: DEMO_LABEL + ' 张女士',
        phone: '13812345678',
        address: DEMO_LABEL + ' 北京市朝阳区某某小区',
        createdAt: ts
      },
      {
        id: 'user-002',
        name: DEMO_LABEL + ' 李先生',
        phone: '13987654321',
        address: DEMO_LABEL + ' 上海市浦东新区某某路',
        createdAt: ts
      }
    ];

    var stores = [
      {
        id: 'store-001',
        name: DEMO_LABEL + ' 萌宠肠道健康中心（朝阳店）',
        code: 'STORE-BJ-CY-001',
        createdAt: ts
      },
      {
        id: 'store-002',
        name: DEMO_LABEL + ' 宠物医院肠道专科（浦东店）',
        code: 'STORE-SH-PD-002',
        createdAt: ts
      }
    ];

    var pets = [
      {
        id: 'pet-001',
        userId: 'user-001',
        name: DEMO_LABEL + ' 小花',
        breed: '英国短毛猫',
        age: 3.5,
        gender: 'female',
        storeId: 'store-001',
        claimStatus: 'bound',
        createdAt: ts
      },
      {
        id: 'pet-002',
        userId: 'user-001',
        name: DEMO_LABEL + ' 阿黄',
        breed: '金毛寻回犬',
        age: 5,
        gender: 'male',
        storeId: 'store-002',
        claimStatus: 'bound',
        createdAt: ts
      },
      {
        id: 'pet-003',
        userId: 'user-002',
        name: DEMO_LABEL + ' 咪咪',
        breed: '布偶猫',
        age: 2,
        gender: 'female',
        storeId: null,
        claimStatus: 'bound',
        createdAt: ts
      }
    ];

    var claimCodes = [
      {
        id: 'claim-001',
        code: 'CLAIM-PUBLISHED-2025',
        storeId: 'store-001',
        petId: null,
        testRecordId: 'tr-006',
        status: 'pending',
        expiresAt: '2026-12-31T23:59:59.000Z',
        createdAt: ts
      },
      {
        id: 'claim-002',
        code: 'CLAIM-PROGRESS-2025',
        storeId: 'store-001',
        petId: null,
        testRecordId: 'tr-007',
        status: 'pending',
        expiresAt: '2026-12-31T23:59:59.000Z',
        createdAt: ts
      },
      {
        id: 'claim-003',
        code: 'CLAIM-NEW-2025',
        storeId: 'store-001',
        petId: null,
        testRecordId: 'tr-005',
        status: 'pending',
        expiresAt: '2026-12-31T23:59:59.000Z',
        createdAt: ts
      }
    ];

    var categories = [
      {
        id: 'cat-001',
        name: DEMO_LABEL + ' 肠道健康',
        available: true,
        createdAt: ts
      },
      {
        id: 'cat-002',
        name: DEMO_LABEL + ' 益生菌调理',
        available: true,
        createdAt: ts
      },
      {
        id: 'cat-003',
        name: DEMO_LABEL + ' 已下架分类（兜底测试）',
        available: false,
        createdAt: ts
      }
    ];

    var products = [
      {
        id: 'prod-001',
        name: DEMO_LABEL + ' 益生菌套装 A',
        categoryId: 'cat-002',
        available: true,
        price: 199,
        createdAt: ts
      },
      {
        id: 'prod-002',
        name: DEMO_LABEL + ' 肠道调理粉（已下架）',
        categoryId: 'cat-001',
        available: false,
        price: 159,
        createdAt: ts
      },
      {
        id: 'prod-003',
        name: DEMO_LABEL + ' 膳食纤维补充剂',
        categoryId: 'cat-001',
        available: true,
        price: 89,
        createdAt: ts
      }
    ];

    var importBatches = [
      {
        id: 'batch-001',
        fileName: DEMO_LABEL + ' 检测结果导入_成功.xlsx',
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
        fileName: DEMO_LABEL + ' 检测结果导入_失败.xlsx',
        status: 'failed',
        totalRows: 8,
        successRows: 0,
        failedRows: 8,
        errors: [
          { row: 2, column: '放线菌门', code: 'MISSING_COLUMN', message: DEMO_LABEL + ' 缺少必需列「放线菌门」' },
          { row: 5, column: '双歧杆菌', code: 'EMPTY', message: DEMO_LABEL + ' 指标值为空' }
        ],
        testRecordIds: ['tr-002'],
        createdAt: '2025-08-21T11:30:00.000Z'
      },
      {
        id: 'batch-003',
        fileName: DEMO_LABEL + ' 检测结果导入_部分成功.xlsx',
        status: 'partial',
        totalRows: 5,
        successRows: 3,
        failedRows: 2,
        errors: [
          { row: 4, column: '厚壁菌门', code: 'NOT_DETECTED', message: DEMO_LABEL + ' 未检出' }
        ],
        testRecordIds: ['tr-001'],
        createdAt: '2025-08-22T09:15:00.000Z'
      }
    ];

    var testRecords = [
      {
        id: 'tr-001',
        petId: 'pet-001',
        userId: 'user-001',
        storeId: 'store-001',
        sampleType: 'feces',
        testDate: '2025-08-22',
        status: 'pending_result',
        importBatchId: 'batch-003',
        claimStatus: 'bound',
        label: DEMO_LABEL + ' 待结果',
        createdAt: '2025-08-22T09:15:00.000Z',
        updatedAt: '2025-08-22T09:15:00.000Z'
      },
      {
        id: 'tr-002',
        petId: 'pet-002',
        userId: 'user-001',
        storeId: 'store-002',
        sampleType: 'feces',
        testDate: '2025-08-21',
        status: 'import_failed',
        importBatchId: 'batch-002',
        claimStatus: 'bound',
        label: DEMO_LABEL + ' 导入失败',
        createdAt: '2025-08-21T11:30:00.000Z',
        updatedAt: '2025-08-21T11:30:00.000Z'
      },
      {
        id: 'tr-003',
        petId: 'pet-003',
        userId: 'user-002',
        storeId: null,
        sampleType: 'feces',
        testDate: '2025-08-23',
        status: 'pending_review',
        importBatchId: null,
        claimStatus: 'bound',
        label: DEMO_LABEL + ' 待审核',
        createdAt: '2025-08-23T14:00:00.000Z',
        updatedAt: '2025-08-23T14:00:00.000Z'
      },
      {
        id: 'tr-004',
        petId: 'pet-001',
        userId: 'user-001',
        storeId: 'store-001',
        sampleType: 'feces',
        testDate: '2025-08-20',
        status: 'published',
        importBatchId: 'batch-001',
        claimStatus: 'bound',
        label: DEMO_LABEL + ' 已发布',
        createdAt: '2025-08-20T10:00:00.000Z',
        updatedAt: '2025-08-24T16:00:00.000Z'
      },
      {
        id: 'tr-005',
        petId: null,
        userId: null,
        storeId: 'store-001',
        sampleType: 'feces',
        testDate: '2025-08-24',
        status: 'pending_claim',
        importBatchId: null,
        claimStatus: 'unclaimed',
        label: DEMO_LABEL + ' 待认领（新记录）',
        createdAt: '2025-08-24T08:00:00.000Z',
        updatedAt: '2025-08-24T08:00:00.000Z'
      },
      {
        id: 'tr-006',
        petId: null,
        userId: null,
        storeId: 'store-001',
        sampleType: 'feces',
        testDate: '2025-08-18',
        status: 'published',
        importBatchId: 'batch-001',
        claimStatus: 'unclaimed',
        label: DEMO_LABEL + ' 已发布待认领',
        createdAt: '2025-08-18T09:00:00.000Z',
        updatedAt: '2025-08-19T16:00:00.000Z'
      },
      {
        id: 'tr-007',
        petId: null,
        userId: null,
        storeId: 'store-001',
        sampleType: 'feces',
        testDate: '2025-08-23',
        status: 'pending_review',
        importBatchId: null,
        claimStatus: 'unclaimed',
        label: DEMO_LABEL + ' 审核中待认领',
        createdAt: '2025-08-23T10:00:00.000Z',
        updatedAt: '2025-08-23T14:00:00.000Z'
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
      },
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
    ];

    var reports = [
      {
        id: 'report-001',
        reportNumber: DEMO_LABEL + ' RPT-2025-001',
        testRecordId: 'tr-004',
        userId: 'user-001',
        petId: 'pet-001',
        status: 'corrected',
        currentVersion: 2,
        versions: [
          {
            version: 1,
            status: 'published',
            healthLevel: 'A',
            healthScore: 92,
            summary: DEMO_LABEL + ' 肠道菌群整体良好。',
            createdAt: '2025-08-20T11:00:00.000Z',
            publishedAt: '2025-08-20T16:00:00.000Z'
          },
          {
            version: 2,
            status: 'corrected',
            healthLevel: 'B',
            healthScore: 85,
            summary: DEMO_LABEL + ' 放线菌门指标已更正，综合评级下调。',
            createdAt: '2025-08-24T15:30:00.000Z',
            publishedAt: '2025-08-24T16:00:00.000Z',
            correctionNote: DEMO_LABEL + ' 原始指标放线菌门由实验室复核后更正'
          }
        ],
        createdAt: '2025-08-20T11:00:00.000Z',
        updatedAt: '2025-08-24T16:00:00.000Z'
      },
      {
        id: 'report-002',
        reportNumber: DEMO_LABEL + ' RPT-2025-002',
        testRecordId: 'tr-003',
        userId: 'user-002',
        petId: 'pet-003',
        status: 'pending_review',
        currentVersion: 1,
        versions: [
          {
            version: 1,
            status: 'pending_review',
            healthLevel: 'C',
            healthScore: 68,
            summary: DEMO_LABEL + ' 部分指标异常，待审核发布。',
            createdAt: '2025-08-23T15:00:00.000Z',
            publishedAt: null
          }
        ],
        createdAt: '2025-08-23T15:00:00.000Z',
        updatedAt: '2025-08-23T15:00:00.000Z'
      },
      {
        id: 'report-003',
        reportNumber: DEMO_LABEL + ' RPT-2025-003',
        testRecordId: 'tr-002',
        userId: 'user-001',
        petId: 'pet-002',
        status: 'rejected',
        currentVersion: 1,
        versions: [
          {
            version: 1,
            status: 'rejected',
            healthLevel: null,
            healthScore: null,
            summary: DEMO_LABEL + ' 导入数据不完整，报告驳回。',
            rejectReason: DEMO_LABEL + ' Excel 缺少必需列，无法生成有效报告',
            createdAt: '2025-08-21T13:00:00.000Z',
            publishedAt: null
          }
        ],
        createdAt: '2025-08-21T13:00:00.000Z',
        updatedAt: '2025-08-21T14:00:00.000Z'
      },
      {
        id: 'report-004',
        reportNumber: DEMO_LABEL + ' RPT-2025-004',
        testRecordId: 'tr-006',
        userId: null,
        petId: null,
        status: 'published',
        currentVersion: 1,
        versions: [
          {
            version: 1,
            status: 'published',
            healthLevel: 'A',
            healthScore: 90,
            summary: DEMO_LABEL + ' 肠道菌群整体良好，认领后可查看完整报告。',
            createdAt: '2025-08-19T11:00:00.000Z',
            publishedAt: '2025-08-19T16:00:00.000Z'
          }
        ],
        createdAt: '2025-08-19T11:00:00.000Z',
        updatedAt: '2025-08-19T16:00:00.000Z'
      },
      {
        id: 'report-005',
        reportNumber: DEMO_LABEL + ' RPT-2025-005',
        testRecordId: 'tr-007',
        userId: null,
        petId: null,
        status: 'pending_review',
        currentVersion: 1,
        versions: [
          {
            version: 1,
            status: 'pending_review',
            healthLevel: 'B',
            healthScore: 75,
            summary: DEMO_LABEL + ' 报告审核中，认领后可查看进度。',
            createdAt: '2025-08-23T12:00:00.000Z',
            publishedAt: null
          }
        ],
        createdAt: '2025-08-23T12:00:00.000Z',
        updatedAt: '2025-08-23T12:00:00.000Z'
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
        description: DEMO_LABEL + ' 放线菌门偏低，可能影响肠道屏障功能',
        professional: DEMO_LABEL + ' 放线菌门占比低于参考范围，可能影响肠道屏障与免疫调节。',
        consumer: DEMO_LABEL + ' 肠道有益菌偏少，建议关注日常饮食与益生菌补充。',
        riskLevel: 'medium',
        createdAt: '2025-08-24T15:30:00.000Z'
      },
      {
        id: 'finding-002',
        reportId: 'report-002',
        reportVersion: 1,
        indicatorKey: '厚壁菌门',
        conclusion: 'HIGH',
        dataStatus: 'NOT_DETECTED',
        description: DEMO_LABEL + ' 厚壁菌门未检出（数据状态 NOT_DETECTED ≠ 结论 LOW）',
        professional: DEMO_LABEL + ' 厚壁菌门未检出（NOT_DETECTED），不可等同于偏低结论。',
        consumer: DEMO_LABEL + ' 该项未检出，需结合复检与其他指标综合判断。',
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
        description: DEMO_LABEL + ' 放线菌门显著偏低',
        professional: DEMO_LABEL + ' 放线菌门显著低于参考范围。',
        consumer: DEMO_LABEL + ' 有益菌偏少，建议补充益生菌。',
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
        description: DEMO_LABEL + ' 放线菌门处于正常范围',
        professional: DEMO_LABEL + ' 放线菌门占比正常。',
        consumer: DEMO_LABEL + ' 该项指标良好，请继续保持。',
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
        description: DEMO_LABEL + ' 放线菌门偏低，待审核确认',
        professional: DEMO_LABEL + ' 放线菌门低于参考下限，待审核。',
        consumer: DEMO_LABEL + ' 有益菌略少，报告审核中。',
        riskLevel: 'medium',
        createdAt: '2025-08-23T12:30:00.000Z'
      }
    ];

    var recommendations = [
      {
        id: 'rec-001',
        findingId: 'finding-001',
        reportId: 'report-001',
        targetType: 'PRODUCT',
        productId: 'prod-001',
        categoryId: 'cat-002',
        resolvedType: 'PRODUCT',
        resolvedProductId: 'prod-001',
        resolvedCategoryId: 'cat-002',
        label: DEMO_LABEL + ' 推荐益生菌套装 A',
        createdAt: '2025-08-24T15:30:00.000Z'
      },
      {
        id: 'rec-002',
        findingId: 'finding-003',
        reportId: 'report-002',
        targetType: 'PRODUCT',
        productId: 'prod-002',
        categoryId: 'cat-001',
        resolvedType: 'CATEGORY',
        resolvedProductId: null,
        resolvedCategoryId: 'cat-001',
        label: DEMO_LABEL + ' 目标产品已下架，降级到分类推荐',
        createdAt: '2025-08-23T15:00:00.000Z'
      },
      {
        id: 'rec-003',
        findingId: 'finding-002',
        reportId: 'report-002',
        targetType: 'CATEGORY',
        productId: null,
        categoryId: 'cat-003',
        resolvedType: 'NONE',
        resolvedProductId: null,
        resolvedCategoryId: null,
        label: DEMO_LABEL + ' 分类亦不可用，降级为 NONE',
        createdAt: '2025-08-23T15:00:00.000Z'
      }
    ];

    return {
      meta: {
        version: 1,
        storageKey: STORAGE_KEY,
        disclaimer: DEMO_LABEL + ' 全部为演示 Mock 数据，非真实业务数据',
        dataStatuses: DATA_STATUSES,
        reportStatuses: REPORT_STATUSES,
        recommendTypes: RECOMMEND_TYPES,
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
      categories: categories
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

  function reset() {
    var state = buildSeedState();
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
        sampleType: params.sampleType || 'feces',
        testDate: params.testDate || new Date().toISOString().slice(0, 10),
        status: 'pending_result',
        importBatchId: null,
        claimStatus: pet ? 'bound' : 'unclaimed',
        label: DEMO_LABEL + ' 新登记检测',
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
          status: 'pending_review',
          importBatchId: batchId,
          claimStatus: params.petId ? 'bound' : 'unclaimed',
          label: DEMO_LABEL + ' 导入成功',
          createdAt: nowIso(),
          updatedAt: nowIso()
        };
        state.testRecords.push(record);
        testRecordId = newTrId;
      } else {
        record.status = 'pending_review';
        record.importBatchId = batchId;
        record.updatedAt = nowIso();
      }

      var rows = params.rows || 10;
      var batch = {
        id: batchId,
        fileName: params.fileName || (DEMO_LABEL + ' 模拟导入成功.xlsx'),
        status: 'success',
        totalRows: rows,
        successRows: rows,
        failedRows: 0,
        errors: [],
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
          version: 1,
          isCurrent: true,
          correctedFrom: null,
          createdAt: nowIso()
        });
      });

      return { batchId: batchId, testRecordId: testRecordId };
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
          label: DEMO_LABEL + ' 导入失败',
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
        fileName: params.fileName || (DEMO_LABEL + ' 模拟导入失败.xlsx'),
        status: 'failed',
        totalRows: params.totalRows || 5,
        successRows: 0,
        failedRows: params.totalRows || 5,
        errors: [
          {
            row: params.errorRow || 2,
            column: params.errorColumn || '放线菌门',
            code: errorCode,
            message: DEMO_LABEL + ' 导入失败: ' + errorCode
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
      var reportNumber = params.reportNumber || (DEMO_LABEL + ' RPT-' + reportId.replace('report-', ''));
      var report = {
        id: reportId,
        reportNumber: reportNumber,
        testRecordId: tr.id,
        userId: tr.userId,
        petId: tr.petId,
        status: 'draft',
        currentVersion: 1,
        versions: [
          {
            version: 1,
            status: 'draft',
            healthLevel: params.healthLevel || null,
            healthScore: params.healthScore || null,
            summary: params.summary || (DEMO_LABEL + ' 草稿报告'),
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

      return report;
    });
  }

  /** 提交审核 */
  function submitReport(reportId) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      report.status = 'pending_review';
      report.updatedAt = nowIso();
      var ver = report.versions[report.versions.length - 1];
      ver.status = 'pending_review';

      var tr = findTestRecord(state, report.testRecordId);
      if (tr) {
        tr.status = 'pending_review';
        tr.updatedAt = nowIso();
      }
      return report;
    });
  }

  /** 驳回报告 */
  function rejectReport(reportId, reason) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      report.status = 'rejected';
      report.updatedAt = nowIso();
      var ver = report.versions[report.versions.length - 1];
      ver.status = 'rejected';
      ver.rejectReason = reason || (DEMO_LABEL + ' 审核驳回');

      var tr = findTestRecord(state, report.testRecordId);
      if (tr) {
        tr.status = 'import_failed';
        tr.updatedAt = nowIso();
      }
      return report;
    });
  }

  /** 批准报告 */
  function approveReport(reportId) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      report.status = 'approved';
      report.updatedAt = nowIso();
      var ver = report.versions[report.versions.length - 1];
      ver.status = 'approved';
      return report;
    });
  }

  /** 发布报告 */
  function publishReport(reportId) {
    return commit(function (state) {
      var report = findReport(state, reportId);
      if (!report) throw new Error('report not found: ' + reportId);
      report.status = 'published';
      report.updatedAt = nowIso();
      var ver = report.versions[report.versions.length - 1];
      ver.status = 'published';
      ver.publishedAt = nowIso();

      var tr = findTestRecord(state, report.testRecordId);
      if (tr) {
        tr.status = 'published';
        tr.updatedAt = nowIso();
      }
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
          var newReportVersion = report.currentVersion + 1;
          report.currentVersion = newReportVersion;
          report.status = 'corrected';
          report.updatedAt = nowIso();
          report.versions.push({
            version: newReportVersion,
            status: 'corrected',
            healthLevel: report.versions[report.versions.length - 1].healthLevel,
            healthScore: report.versions[report.versions.length - 1].healthScore,
            summary: params.correctionNote || (DEMO_LABEL + ' 指标「' + original.key + '」已更正'),
            createdAt: nowIso(),
            publishedAt: null,
            correctionNote: params.correctionNote || (DEMO_LABEL + ' 原始指标更正')
          });
        }
      }

      return corrected;
    });
  }

  /** 认领码绑定（支持门店预绑定 + 认领码认领） */
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

      var petId = params.petId;
      if (!petId) {
        petId = bumpIds(state, 'pets', 'pet');
        var newPet = {
          id: petId,
          userId: params.userId,
          name: params.petName || (DEMO_LABEL + ' 新认领宠物'),
          breed: params.petBreed || '未知品种',
          age: params.petAge || null,
          gender: params.petGender || 'unknown',
          storeId: claim.storeId,
          claimStatus: 'claimed',
          createdAt: nowIso()
        };
        state.pets.push(newPet);
        claim.petId = petId;
      } else {
        var existingPet = findPet(state, petId);
        if (existingPet) {
          existingPet.userId = params.userId;
          existingPet.storeId = claim.storeId;
          existingPet.claimStatus = 'claimed';
        }
        claim.petId = petId;
      }

      if (claim.testRecordId) {
        var tr = findTestRecord(state, claim.testRecordId);
        if (tr) {
          tr.petId = petId;
          tr.userId = params.userId;
          tr.storeId = claim.storeId;
          tr.claimStatus = 'claimed';
          tr.status = tr.status === 'pending_claim' ? 'pending_review' : tr.status;
          tr.updatedAt = nowIso();
        }
        state.reports.forEach(function (r) {
          if (r.testRecordId === claim.testRecordId) {
            r.userId = params.userId;
            r.petId = petId;
            r.updatedAt = nowIso();
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
    var actor = params.actor || (DEMO_LABEL + ' 审核员');
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
    var actor = params.actor || (DEMO_LABEL + ' 审核员');
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

  /** 审核更新推荐映射 */
  function updateRecommendation(params) {
    params = params || {};
    if (!params.recommendationId) throw new Error('recommendationId is required');
    var actor = params.actor || (DEMO_LABEL + ' 审核员');
    return commit(function (state) {
      var rec = state.recommendations.find(function (r) { return r.id === params.recommendationId; });
      if (!rec) throw new Error('recommendation not found: ' + params.recommendationId);
      if (params.label != null) rec.label = params.label;
      if (params.targetType != null) rec.targetType = params.targetType;
      if (params.productId !== undefined) rec.productId = params.productId;
      if (params.categoryId !== undefined) rec.categoryId = params.categoryId;

      var targetType = rec.targetType || 'NONE';
      var productId = rec.productId || null;
      var categoryId = rec.categoryId || null;
      var resolvedType = 'NONE';
      var resolvedProductId = null;
      var resolvedCategoryId = null;

      if (targetType === 'PRODUCT' && productId) {
        var product = findProduct(state, productId);
        if (product && product.available) {
          resolvedType = 'PRODUCT';
          resolvedProductId = productId;
          resolvedCategoryId = product.categoryId;
        } else {
          categoryId = categoryId || (product ? product.categoryId : null);
          targetType = 'CATEGORY';
        }
      }
      if (targetType === 'CATEGORY' && categoryId) {
        var category = findCategory(state, categoryId);
        if (category && category.available) {
          resolvedType = 'CATEGORY';
          resolvedCategoryId = categoryId;
        }
      }
      rec.resolvedType = resolvedType;
      rec.resolvedProductId = resolvedProductId;
      rec.resolvedCategoryId = resolvedCategoryId;
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
   * 解析推荐目标：PRODUCT → CATEGORY → NONE 降级
   * @param {{ targetType: string, productId?: string, categoryId?: string }} params
   */
  function resolveRecommendationTarget(params) {
    params = params || {};
    var state = loadState();
    var targetType = params.targetType || 'NONE';
    var productId = params.productId || null;
    var categoryId = params.categoryId || null;

    var result = {
      requestedType: targetType,
      requestedProductId: productId,
      requestedCategoryId: categoryId,
      resolvedType: 'NONE',
      resolvedProductId: null,
      resolvedCategoryId: null,
      label: DEMO_LABEL + ' 无推荐',
      downgradePath: []
    };

    if (targetType === 'PRODUCT' && productId) {
      var product = findProduct(state, productId);
      if (product && product.available) {
        result.resolvedType = 'PRODUCT';
        result.resolvedProductId = productId;
        result.resolvedCategoryId = product.categoryId;
        result.label = DEMO_LABEL + ' 推荐产品: ' + product.name;
        return result;
      }
      result.downgradePath.push('PRODUCT unavailable → CATEGORY');
      categoryId = categoryId || (product ? product.categoryId : null);
      targetType = 'CATEGORY';
    }

    if (targetType === 'CATEGORY' && categoryId) {
      var category = findCategory(state, categoryId);
      if (category && category.available) {
        result.resolvedType = 'CATEGORY';
        result.resolvedCategoryId = categoryId;
        result.label = DEMO_LABEL + ' 推荐分类: ' + category.name;
        return result;
      }
      result.downgradePath.push('CATEGORY unavailable → NONE');
    }

    result.resolvedType = 'NONE';
    result.label = DEMO_LABEL + ' 无可用推荐目标';
    return result;
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
    getState: getState,
    reset: reset,
    subscribe: subscribe,
    registerTest: registerTest,
    simulateExcelImportSuccess: simulateExcelImportSuccess,
    simulateExcelImportFailure: simulateExcelImportFailure,
    generateReport: generateReport,
    submitReport: submitReport,
    rejectReport: rejectReport,
    approveReport: approveReport,
    publishReport: publishReport,
    updateReportContent: updateReportContent,
    updateFinding: updateFinding,
    updateRecommendation: updateRecommendation,
    correctIndicator: correctIndicator,
    bindClaimCode: bindClaimCode,
    preBindPetToStore: preBindPetToStore,
    resolveRecommendationTarget: resolveRecommendationTarget
  };
});
