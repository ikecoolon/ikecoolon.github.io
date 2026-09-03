# 架构决策记录

本目录记录宠物健康报告的关键产品与领域决策。编号文件按决策形成顺序保存，后续决策通过新增 ADR 延续。

## 核心边界

- [ADR-0023：仅支持微生物组报告产品](./0023-support-only-the-microbiome-report-product.md)
- [ADR-0030：送检管理与报告中心分工](./0030-separate-test-submission-management-from-report-center.md)
- [ADR-0031：按菌门组织分析、建议与商品](./0031-organize-analysis-advice-and-products-by-phylum.md)
- [ADR-0032：在现有商城小程序内承载健康报告](./0032-embed-health-reports-in-the-existing-mall-mini-program.md)

## 数据与发布

- [ADR-0012：区分来源结果、有效结果与报告呈现](./0012-separate-source-results-effective-results-and-report-presentation.md)
- [ADR-0013：管理端保留版本、用户端只展示最新版本](./0013-retain-report-versions-in-admin-expose-only-the-latest-to-users.md)
- [ADR-0019：更正期间保持当前报告可见](./0019-keep-the-current-report-visible-while-preparing-a-correction.md)
- [ADR-0024：参考范围仅来自导入或平台配置](./0024-use-only-imported-or-platform-reference-ranges.md)

## 分析与商品

- [ADR-0014：人工审核前组合规则结果](./0014-compose-rule-results-before-human-review.md)
- [ADR-0029：人工选择商品，不建设推荐引擎](./0029-use-manual-product-selection-without-a-recommendation-engine.md)
