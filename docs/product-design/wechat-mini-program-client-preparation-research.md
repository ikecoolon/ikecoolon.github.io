# 微信小程序甲方筹备事项研究

> 查阅日期：2026-08-28  
> 适用项目：宠物健康报告管理端与小程序  
> 证据范围：仅采用微信公众平台、微信开放文档、微信支付官方文档；项目范围事实引用本仓库产品设计。  
> 用途：将甲方需要提前完成的账号、资质、技术资源、合规材料和支付准备，整理为项目进度页可核验的前置事项。

## 1. 结论摘要

1. 当前 7 条“甲方筹备”不足以支持真实小程序联调和发布。至少还需要覆盖：账号主体与管理员、AppID/AppSecret 安全交付、开发者与体验成员权限、服务类目及资质、小程序备案、服务器和域名、服务器域名配置、隐私保护指引、审核测试数据，以及条件式微信支付准备。
2. “域名备案”和“小程序备案”是两件事。服务器域名必须使用 HTTPS/WSS 且经过 ICP 备案；小程序自身还需按微信公众平台流程办理小程序备案，备案成功后才能进入后续版本发布流程。[微信开放文档：网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)、[微信开放文档：小程序备案操作指引](https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html)
3. `request`、`uploadFile`、`downloadFile`、`socket` 域名不是四项都无条件需要。应按实际调用能力分别配置：本项目真实登录和报告查询至少需要 `request`；只有确实上传、下载或使用 WebSocket 时，才需要相应域名。微信要求小程序只能与已配置的域名通信。[微信开放文档：网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
4. H5 或 Mock 开发可以在账号、备案、域名尚未齐备时继续；微信开发者工具也可在开发阶段临时跳过域名、TLS 和 HTTPS 证书校验。但真实 `wx.login` 联调、体验版真机闭环、审核发布及微信支付不能据此验收。[微信开放文档：网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)、[微信开放文档：协同工作和发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)
5. 微信支付不能只列为一条“开通支付服务”。如果当前小程序直接承接交易，至少要核验商户号、JSAPI/小程序支付权限、商户号与当前 AppID 绑定、APIv3 安全材料、HTTPS 回调以及真实支付/退款闭环。[微信支付：开发接入准备](https://pay.wechatpay.cn/doc/v3/merchant/4015459512)
6. 当前实施方式已经确认：宠物健康报告在现有商城小程序同一 AppID 内二次开发，复用商城已有登录态、商品详情、购物车、订单、支付和退款能力，不新建报告小程序，也不做跨小程序跳转。[本项目业务设计](./pet-health-report-business-design.md) 因此微信认证、现有商户号、JSAPI/小程序支付权限、AppID 绑定、安全参数和支付退款闭环均为当前适用的核验或联调事项，但原则上复用现状，不默认重新申请商户号或重建支付后端。

## 2. 必需程度与对开发的影响

### 2.1 当前小程序真实联调和发布前必需

- 注册正确主体的小程序账号，指定长期可用的管理员，取得 AppID；需要服务端微信登录时，还需由甲方管理员安全生成并交付 AppSecret。注册时需选择主体类型、完善主体和管理员信息，主体信息确认后不可变更。[腾讯客服：小程序注册流程](https://kf.qq.com/faq/170109iQBJ3Q170109JbQfiu.html)、[微信开放文档：开始](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html)
- 给实施人员配置开发者权限，给产品、测试和甲方验收人员配置体验成员；只有对应成员才能使用开发版或体验版完成真机测试。[微信开放文档：协同工作和发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)
- 按小程序实际功能选择服务类目，准备该类目要求的许可证、合作协议或承诺材料；类目必须与页面实际服务一致。[微信开放文档：服务类目所需资质材料](https://developers.weixin.qq.com/miniprogram/product/material/)、[微信开放文档：常见拒绝情形](https://developers.weixin.qq.com/miniprogram/product/reject.html)
- 完成小程序备案。单位主体通常需准备单位证件、主体负责人和小程序负责人证件；涉及前置审批的服务还需对应审批材料。流程包含平台初审、工信部短信核验和通信管理局审核。[微信开放文档：小程序备案操作指引](https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html)
- 准备可运行的后端、数据库、合法域名、DNS、ICP 备案和有效 HTTPS 证书，并在小程序后台配置实际使用的服务器域名。[微信开放文档：网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- 整理真实个人信息处理清单、用途、保存期限、用户权利行使方式和联系人，完成小程序用户隐私保护指引；提审版本调用的隐私接口必须与指引相符。[微信开放文档：用户隐私保护指引填写说明](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/)、[微信开放文档：指引内容介绍](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/miniprogram-intro)
- 准备可供微信审核人员完整体验的测试数据或测试账号。小程序存在账号体系时，官方审核规则要求提供可以体验全部功能的测试号；提交版本还必须是可打开、可运行、无测试占位的完成品。[微信开放文档：常见拒绝情形](https://developers.weixin.qq.com/miniprogram/product/reject.html)

### 2.2 按功能条件必需

- **微信认证**：企业账号注册可用对公打款验证主体，微信认证不是所有本地开发的无条件前置；但微信支付官方明确要求，未认证小程序无法申请小程序支付权限。若本 AppID 需要直接支付或依赖其他要求认证的能力，则必须保持认证有效。[腾讯客服：小程序注册流程](https://kf.qq.com/faq/170109iQBJ3Q170109JbQfiu.html)、[腾讯客服：小程序微信认证方法](https://kf.qq.com/faq/170109by2mQB170109zUFfqe.html)、[微信支付：开发接入准备](https://pay.wechatpay.cn/doc/v3/merchant/4015459512)
- **`web-view` 业务域名**：只有把 H5 页面嵌入小程序时才需要。个人主体小程序不能使用 `web-view`；业务域名必须使用 HTTPS、完成 ICP 备案并在后台配置。若 H5 只是临时独立访问而不嵌入小程序，则不应把业务域名当成开发必需项。[微信开放文档：业务域名](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/domain.html)、[微信开放文档：web-view](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)
- **`uploadFile`、`downloadFile`、`socket` 域名**：只在对应能力被实现时配置。当前小程序是只读报告入口，不应因为平台提供这些配置栏就默认四项全开。[微信开放文档：网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- **微信支付**：当前已确认由现有商城小程序同一 AppID 承接。微信认证、商户号、JSAPI/小程序支付权限、AppID 绑定、安全参数和真实支付退款闭环均适用；但它们首先是对商城现有能力的核验和回归联调，不是要求为健康报告模块重新申请商户号或向前端复制支付密钥。

### 2.3 主要阻断审核发布，但不阻断普通 H5/Mock 开发

- 服务类目最终确认、类目资质审核、小程序备案、正式隐私保护指引、账号基本信息、审核测试账号、管理员提交审核和发布权限。
- 正式服务器域名和 `web-view` 业务域名可在本地开发阶段暂时绕过校验，但缺失时不能把真机正式环境验收为通过。[微信开放文档：网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)
- 微信支付商户权限和真实回调不阻断报告阅读页面的 Mock 开发，但会阻断任何“本 AppID 内真实下单支付”的支付闭环验收。

## 3. 账号、登录与权限准备

### 3.1 主体、管理员与 AppID

甲方应使用最终运营主体注册小程序，并指定能够长期处理扫码确认、成员权限、支付绑定、提审和发布的管理员。注册流程要求选择主体类型、填写主体和管理员信息；企业主体可通过对公打款或微信认证验证主体。[腾讯客服：小程序注册流程](https://kf.qq.com/faq/170109iQBJ3Q170109JbQfiu.html)

注册完成后，AppID 可在小程序后台“开发设置”查看。开发人员还需被添加为项目成员并取得开发者权限，甲方测试人员应作为体验成员加入。[微信开放文档：开始](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/getstart.html)、[微信开放文档：协同工作和发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)

### 3.2 微信登录联调

真实微信登录的链路是：小程序调用 `wx.login` 得到一次性 `code`，服务端使用 AppID、AppSecret 和 `code` 调用 `code2Session`，再以 OpenID 等结果建立业务登录态。AppSecret 和 `session_key` 都不得下发到小程序或提交到公开前端代码。[微信开放文档：小程序登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)、[微信开放文档：登录凭证校验](https://developers.weixin.qq.com/miniprogram/dev/server/API/user-login/api_code2session.html)、[微信开放文档：网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

因此，“开通微信授权登录能力”不应只理解为后台点一个开关。完成标准应是：真实 AppID 可用、开发者权限可用、AppSecret 已安全交付服务端、`wx.login → code2Session → 平台用户` 链路在体验版真机成功，并已有能看到宠物和报告的测试数据。

## 4. 服务类目与资质边界

微信要求服务类目与小程序实际服务一致，且核心功能页面必须能正常访问；涉及账号或受限功能时，审核人员还需能完整体验。[微信开放文档：常见拒绝情形](https://developers.weixin.qq.com/miniprogram/product/reject.html)

与本项目接近的官方类目包括：

- “生活服务—宠物（非医院类）”：适用于宠物美容预约、宠物资讯等，官方表格未列额外资质。
- “生活服务—宠物医院/兽医”：要求《动物诊疗许可证》，适用于宠物医院治疗预约、在线问诊。
- “生活服务—其他宠物健康服务”：官方适用范围写的是动物基因检测，要求《动物诊疗许可证》《检验检测机构资质认定证书》或省级农业农村主管部门公布的检测机构/实验室名单三选一。
- 当前同一商城小程序直接销售宠物商品，既有“商家自营—宠物食品/用品”等商城类目需要继续有效；新增宠物微生物组报告功能后，还必须按真实页面确认是否需要补充宠物健康相关服务类目及专项资质，不能只沿用商城原类目而不核验新增功能。

以上均见[微信开放文档：服务类目所需资质材料](https://developers.weixin.qq.com/miniprogram/product/material/)。

**证据边界**：官方“其他宠物健康服务”的适用范围明确写“动物基因检测”，没有直接说明宠物微生物组检测报告应归入哪个类目。本研究不能据此替甲方断定最终类目。甲方应尽早用真实页面说明在小程序后台选类目并提交平台确认；在确认前，进度页应写“服务类目与专项资质确认”，不能写成已经确定需要某一种许可证。

## 5. 备案、服务器与域名

### 5.1 小程序备案

小程序备案材料包括主体证件、主体负责人证件、小程序负责人证件，以及按业务需要提供的前置审批或补充材料；单位主体通常还需完成负责人核验、工信部短信核验和通信管理局审核。官方指引给出的管局审核时间为 1—20 个工作日，适合在项目第 1 周即启动，而不是等开发结束后办理。[微信开放文档：小程序备案操作指引](https://developers.weixin.qq.com/miniprogram/product/record_guidelines.html)

### 5.2 服务器域名

小程序的 `request`、`uploadFile`、`downloadFile` 和 WebSocket 通信只能访问后台已配置的域名。域名必须使用 HTTPS/WSS、完成 ICP 备案，不得使用 IP 或 localhost；HTTPS 证书必须有效、域名匹配、信任链完整。[微信开放文档：网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)

对本项目的最小准备是：

- 可公网访问的测试/生产 API 域名；
- 对应 DNS、ICP 备案和有效 HTTPS 证书；
- `request` 合法域名；
- 若报告图片或文件通过 `wx.downloadFile` 获取，则配置 `downloadFile` 合法域名；
- 只有实现用户上传或 WebSocket 时，再配置 `uploadFile` 或 `socket` 合法域名；
- AppSecret 只存放在服务端。

### 5.3 H5 内嵌的额外条件

若选择在小程序内通过 `web-view` 承载 H5，还需要单独配置业务域名。官方规则要求非个人主体、HTTPS、ICP 备案；配置成功后小程序才能打开该域名页面。[微信开放文档：业务域名](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/domain.html)

若当前所说的“H5 兜底”只是开发期间从浏览器独立访问，则它不需要小程序业务域名，也不应被描述为正式小程序发布条件已经满足。

## 6. 隐私合规与审核发布

甲方需要提供的不是一段泛化隐私政策，而是与真实功能一致的资料：开发者主体名称、实际处理的信息、处理目的、第三方插件或服务商、用户查阅/复制/更正/删除等权利的联系渠道、保存期限、对外提供规则、投诉联系方式和生效日期。微信会按提审版本的隐私接口调用情况检查指引内容。[微信开放文档：用户隐私保护指引填写说明](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/)、[微信开放文档：指引内容介绍](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/miniprogram-intro)

对当前项目，至少要确认商城既有微信身份与健康报告平台用户如何关联、手机号是否复用或新增处理、宠物与报告信息的保存期限、健康报告模块是否新增采集或向商城交易链路传递报告来源信息，以及用户请求删除或更正信息时由谁处理。未确定的接口不能先写入指引，实际调用的接口也不能漏报。

提交审核前还需：

- 名称、头像、简介和服务类目与真实功能一致；
- 首页能够在合理路径内到达提交的类目功能；
- 页面无“测试版”、空按钮、不可用功能或严重错误；
- 对账号受限内容提供能完整体验功能的测试账号或审核路径；
- 严格测试后再提审，审核通过后由管理员发布。[微信开放文档：常见拒绝情形](https://developers.weixin.qq.com/miniprogram/product/reject.html)、[微信开放文档：协同工作和发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)

## 7. 微信支付准备及当前项目边界

### 7.1 已确认：同一商城小程序 AppID 承接

当前产品设计明确：宠物健康报告作为现有商城小程序的新增模块实现；报告中的可购商品在同一小程序内进入现有商城 SPU 详情，购物车、订单、支付和退款继续由商城既有交易链路负责，首期不做报告来源的交易归因。[本项目业务设计](./pet-health-report-business-design.md)

因此支付承接方式不再待确认，按以下边界执行：

1. **不新建独立报告小程序**：报告与商城使用同一 AppID，不存在跨小程序跳转。
2. **不默认新申请商户号**：先核验商城现有商户号、JSAPI/小程序支付权限、主体、费率、风险状态和当前 AppID 绑定；仅在现状缺失或失效时补办。
3. **不向健康报告前端交付支付密钥**：商户 API 私钥/证书、APIv3 密钥和验签材料继续由商城支付后端安全管理。
4. **需要完整回归联调**：从健康报告推荐商品进入同一小程序商品详情，完成选 SKU、下单、支付、支付通知、订单更新、退款及退款结果确认。

### 7.2 新商户号与复用商户号

微信支付官方接入顺序为：小程序注册与认证、开通 JSAPI/小程序支付权限、商户号发起 AppID 绑定、小程序管理员确认绑定、配置技术负责人、准备开发参数。[微信支付：开发接入准备](https://pay.wechatpay.cn/doc/v3/merchant/4015459512)

- **新申请商户号**：当前方案原则上不需要；仅当核验发现商城没有可复用商户号，或现有商户号无法继续服务当前 AppID 时办理。需要按主体类型提交营业执照或登记证书、法人/经营者证件和结算账户等材料，完成资料提交、账户验证、审核和签约。[微信支付：小程序接入申请指引](https://pay.wechatpay.cn/static/applyment_guide/applyment_detail_miniapp.shtml)、[腾讯客服：微信支付商户入驻支持的主体类型](https://kf.qq.com/faq/180910IBZVnQ180910naQ77b.html)
- **复用现有商城商户号**：由商户超级管理员核验并开通 JSAPI 支付权限，发起当前小程序 AppID 关联；再由小程序管理员在公众平台确认。主体不一致时，官方流程还可能要求联合营运承诺材料。[微信支付：管理商户号绑定的 AppID](https://pay.wechatpay.cn/doc/v3/merchant/4013287504)、[微信支付：JSAPI 支付权限申请指引](https://pay.wechatpay.cn/doc/v3/merchant/4012791895)

### 7.3 安全参数、回调和真实验证

当前同一商城 AppID 支付时，甲方应先确认商城支付后端已经安全配置商户号、AppID、商户 API 证书、商户 API 私钥、证书序列号、APIv3 密钥，以及所采用的微信支付公钥或平台证书验签方案；健康报告前端不得接触这些安全材料。只有商城现有配置缺失、失效或本次需要调整支付后端时，才由商户超级管理员为技术负责人配置商户平台账号和安全联系人，并通过安全渠道补充材料。既有系统如果仍使用平台证书，则平台证书与微信支付公钥是方案选择，不应写成两套都必须提供。[微信支付：开发必要参数说明](https://pay.wechatpay.cn/doc/v3/merchant/4013070756)、[微信支付：APIv3 密钥](https://pay.wechatpay.cn/doc/v3/merchant/4012072195)、[微信支付：商户 API 证书](https://pay.wechatpay.cn/doc/v3/merchant/4012072428)、[微信支付：微信支付公钥](https://pay.wechatpay.cn/doc/v3/merchant/4012153196)

支付和退款通知必须使用完整、外网可访问的 HTTPS 地址，不能使用 localhost、内网 IP 或带查询参数的地址；服务器、防火墙或 WAF 不能拦截微信支付通知。[微信支付：回调通知注意事项](https://pay.wechatpay.cn/doc/v3/merchant/4012075420)、[微信支付：支付成功回调](https://pay.wechatpay.cn/doc/v3/merchant/4012791902)

微信支付官方没有提供线上支付回调测试接口，支付闭环要在真实环境用小额真实交易验证；不能只看前端 `requestPayment` 成功，还要核验后端查单和支付通知。退款接口受理成功也不等于最终退款成功，应以退款通知或退款查询结果为准。[微信支付：JSAPI 支付常见问题](https://pay.wechatpay.cn/doc/v3/merchant/4012791869)、[微信支付：小程序支付开发指引](https://pay.wechatpay.cn/doc/v3/merchant/4012791911)、[微信支付：订单退款开发指引](https://pay.wechatpay.cn/doc/v3/merchant/4013071031)、[微信支付：退款申请](https://pay.wechatpay.cn/doc/v3/merchant/4012791903)、[微信支付：退款结果通知](https://pay.wechatpay.cn/doc/v3/merchant/4012791906)

## 8. 建议呈现在项目进度页的精简前置事项

以下 15 条适合替换当前 7 条笼统事项。`必需程度` 为“条件项”的条目必须在标题或说明中明确条件，不能一律显示成甲方无条件欠缺。

| ID | 页面条目 | 必需程度 | 甲方责任角色 | 建议期望周次 | 可核验完成标准 | 受影响任务 ID |
| --- | --- | --- | --- | --- | --- | --- |
| `pre-mp-account` | 小程序主体、管理员与 AppID/AppSecret | 必需 | 甲方业务负责人、小程序管理员 | 第 1 周 | 最终运营主体账号已注册；管理员可登录；AppID 已提供；AppSecret 仅通过安全方式交给后端；真实 `code2Session` 可调用 | `mp-01`, `mp-05`, `ops-04` |
| `pre-mp-certification` | 微信认证状态 | 必需：复用商城小程序支付 | 甲方业务负责人、财务 | 第 1 周 | 公众平台显示当前商城小程序认证有效，认证主体与实际运营主体一致 | `mp-01`, `mp-05`, `ops-06` |
| `pre-mp-members` | 开发者与体验成员权限 | 必需 | 小程序管理员、甲方项目负责人 | 第 1 周 | 开发者能上传开发版；产品、测试和甲方验收人员能打开体验版；发布敏感权限只给指定人员 | `mp-05`, `ops-04`, `ops-06` |
| `pre-mp-category` | 服务类目与专项资质确认 | 必需 | 甲方业务负责人、法务/资质负责人 | 第 1 周 | 类目与真实宠物微生物组报告功能已获平台确认；所需许可证、合作协议或承诺材料已上传并通过；未把“基因检测”类目直接套用为既定结论 | `mp-02`, `mp-03`, `mp-05`, `ops-06` |
| `pre-mp-filing` | 小程序备案 | 必需 | 甲方行政/法务、小程序负责人 | 第 1 周启动 | 主体、负责人、专项材料与短信核验完成；后台取得小程序备案号 | `mp-05`, `ops-06` |
| `pre-server` | 测试/生产服务器、数据库与运维联系人 | 必需 | 甲方 IT 负责人 | 第 1 周 | 可公网访问的环境和数据库已交付；技术联系人明确；具备部署、日志、备份和恢复所需权限 | `ops-01`, `ops-04`, `ops-05` |
| `pre-domain` | 域名、ICP、DNS 与 HTTPS | 必需 | 甲方 IT 负责人、行政/法务 | 第 1 周启动，第 6 周前完成 | 域名可控；ICP 备案可查；DNS 指向目标环境；HTTPS 证书有效、域名匹配、链完整 | `ops-02`, `ops-04`, `ops-05` |
| `pre-mp-server-domains` | 小程序服务器域名配置 | 必需 | 甲方 IT 负责人、小程序管理员 | 第 6 周 | `request` 合法域名已配置并真机验证；按实际功能补充 `downloadFile`，仅在确有上传/Socket 时补充对应域名 | `mp-01`, `mp-02`, `mp-03`, `mp-04`, `mp-05`, `ops-02`, `ops-04` |
| `pre-mp-webview-domain` | H5 业务域名 | 条件项：H5 内嵌小程序时 | 甲方 IT 负责人、小程序管理员 | 第 6 周 | 已确认是否使用 `web-view`；若使用，非个人主体、HTTPS、ICP 和后台业务域名配置均通过，真机可打开；独立 H5 则标“不适用” | `mp-04`, `mp-05`, `ops-02`, `ops-04` |
| `pre-mp-privacy` | 隐私保护指引与用户权利联系人 | 必需 | 甲方法务、业务负责人、客服负责人 | 第 6 周 | 个人信息清单、用途、保存期限、第三方、删除/更正渠道、联系方式已确认；后台指引与提审代码实际接口一致并通过审核 | `mp-01`, `mp-02`, `mp-03`, `mp-05`, `ops-06` |
| `pre-mp-review` | 审核资料、测试账号与发布负责人 | 仅上线前核验 | 甲方业务负责人、测试负责人、小程序管理员 | 第 8 周 | 名称/头像/简介/类目一致；审核人员可通过测试账号或测试数据体验宠物与完整报告；无测试占位；提审和发布负责人已确认 | `mp-02`, `mp-03`, `mp-05`, `ops-04`, `ops-06` |
| `pre-pay-merchant` | 商户号与 JSAPI/小程序支付权限 | 必需：核验现状 | 甲方财务、商户超级管理员 | 第 1 周 | 现有商户号主体、费率、风险状态正常，JSAPI/小程序支付权限有效；原则上复用，不重复申请 | `mp-04`, `mp-05`, `ops-04` |
| `pre-pay-binding-security` | 商户号绑定 AppID 与支付安全参数 | 必需：核验现状 | 商户超级管理员、小程序管理员、技术负责人 | 第 6 周 | 当前商城 AppID 与商户号绑定有效；支付后端安全参数及验签方案可用且未进入前端或公开仓库；缺失时再安全补充 | `mp-04`, `mp-05`, `ops-04`, `ops-05` |
| `pre-pay-callback-test` | 支付回调与真实支付退款闭环 | 必需：回归联调 | 甲方财务、IT、测试负责人 | 第 8 周 | 从报告推荐商品进入同小程序商品详情后，真实小额支付、查单、支付通知、订单更新、退款及退款结果确认全部通过并留存结果 | `mp-04`, `mp-05`, `ops-04`, `ops-05`, `ops-06` |

## 9. 页面呈现建议

- 顶部“未完成待配合”只统计当前确实适用且尚未完成的事项。
- 支付承接方式（同一 AppID 复用商城交易）为产品技术结论，不作为甲方清单项；支付相关 3 条事项均按核验现有能力与真实回归联调维护。
- 每条事项至少展示：事项名、责任角色、期望周次、完成/未完成、受影响任务。详细办理材料可放在研究文档，不必把长篇说明塞入总控页。
- 甲方没有服务器、域名、备案或小程序账号时，可以继续展示 H5/Mock 开发，但受影响任务应明确为“真实微信登录/真机联调/审核发布/真实支付验证”，不要把整个前后端开发笼统标成停止。

## 10. 仍需甲方确认的证据边界

1. **最终服务类目**：官方类目没有直接写明“宠物微生物组检测报告”，不能仅凭相似名称确定。需由甲方以真实主体、实际页面和资质向微信平台确认。
2. **现有商城商户号与认证状态**：实施方式已确认同一 AppID 复用商城支付，但本研究未登录甲方公众平台和微信支付商户平台，仍无法确认认证有效期、认证主体、商户号、费率、风险状态、JSAPI 权限、AppID 绑定及安全参数现状。
3. **商城前端接入边界**：健康报告入口放在商城何处、是否使用分包、如何复用登录态和客服入口，以及商品详情返回路径，需要结合现有商城小程序代码确认。
4. **实际使用的域名类型**：是否需要 `downloadFile`、`uploadFile`、`socket` 或 `web-view` 取决于最终实现；官方规则只证明这些能力各自需要配置，不能据此断言当前项目全部需要。
5. **新增功能的类目与隐私变化**：同一商城小程序新增宠物健康报告后，需核验现有服务类目和隐私保护指引是否覆盖新增页面、宠物与报告数据处理，不能因商城已上线而默认无需变更。
