---
status: accepted for uniqueness scope; file-side identifiers still depend on client confirmation（见 docs/product-design/open-questions.md Q7）
---

# 禁止重复导入相同机构报告编号

同一检测机构（出具 Excel 的实验室，sourceOrg）下，外部报告编号或样本编号相同即禁止再次导入，即使文件内容已经变化；原始文件保持不变，后续差异由运营在原报告中通过可追溯的人工修订处理。空样本编号不参与判重。不同实验室的样本编号允许碰撞。平台送检 ID 与报告号全局唯一，不按实验室分域。判重不按承接门店对齐，也不再使用合并的「检测机构 / 来源」字段。

该选择优先保证当前导入和报告计数简单明确，代价是暂不接收机构重新出具的修正版文件。真实 Excel 不含任何机构报告编号或样本编号，重复判定当前只能依赖送检记录侧的编号；机构能否在文件名或文件内提供标识见 Q7，不改变先登记再挂文件。
