---
title: 充电商户小程序九稿
date: 2025-05-12 18:30:00
type: charging-products
tags: ['商户小程序', '数据分析', '经营监测']
---

# 充电商户小程序

## 总览 <a :href="$withBase('/merchant-mini-program/prototype/index.html')" target="_blank" style="font-size:16px">太小？在新窗口中打开</a>
<HtmlPreview :src="$withBase('/merchant-mini-program/prototype/index.html')" type="overview" />

<StickyHtmlPreview :src="$withBase('/merchant-mini-program/prototype/home.html')" type="mobile">

## 经营概况
### 记录和确认点
::: info 
- [X] 定位因高德api付费问题，暂无法从定位获取指定区域，改为由用户自行选择，默认全国
- [X] 销量卡片中的环比指标， 接口需调整或新增
- [X] 营收时段饼图以尖峰平谷划分,增加24小时折线图时段(尖峰平谷)充电量(需新增接口)
- [X] 如果返回无意义数据，则不展示
- [X] 列举具体已有接口名
:::

### 功能描述
#### 搜索
- 区域可以单独作为条件
- 场站名仅支持搜索单场站,作查询条件
#### 销量环比指标
- 计算方式：
    - 环比 = (本期销量 - 上期销量) / 上期销量
    - 例如：
        - 近7天环比：<Badge text="相比天数相同" type="info"/>
            - 最近7天（今日往前推7天）vs 前7天（第8-14天前）
            - 计算公式：(最近7天销量 - 前7天销量) / 前7天销量
            - 示例：今天是5月15日，则最近7天为5月9-15日，前7天为5月2-8日

        - 本月环比：<Badge text="相比天数可能不同" color="purple" />
            - 本月 vs 上月
            - 计算公式：(本月销量 - 上月销量) / 上月销量

        - 上月环比：<Badge text="相比天数可能不同" color="purple"/>
            - 上月 vs 上上月
            - 计算公式：(上月销量 - 上上月销量) / 上上月销量

        - 自定义环比：<Badge text="相比天数相同" type="info"/>
            - 计算公式：(自定义时间段销量 - 对比时间段销量) / 对比时间段销量
            - 示例：选择5月1-10日（10天），则对比4月21-30日（10天）
- 特殊情况说明：
    - 如果环比数据无意义，例如环比本月，但上月没有数据，则展示 "-"

                
#### 24小时电量折线图 
- 计算方式：
    - 在选定时段(近7天、本月、上月、自定义)内，查询以24小时(00:00-23:59)为周期，返回的平均电量
- 特殊情况：
    - 不足24小时，则以实际小时数计算

### 接口需求

| 待开发的接口 | 优先级 |
| --- | --- |
| 销量环比增长数据(新增字段) <br/>scharge-datastat/dataBoard/sales | P0 |
| 营收时段24小时折线图时段平均充电量 | P0 |


</StickyHtmlPreview>

## 场站监测

### 记录和确认点
::: info 
- [X] 异常枪桩分为离线、故障
- [X] 补齐已有接口名,便于后端迁移

:::
### 功能描述
<StickyHtmlPreview :src="$withBase('/merchant-mini-program/prototype/station.html')" type="mobile">

#### 场站列表
- 原有接口

| 用途 | 路径 | 
| --- | --- |
| xxx | /bigdata-bi-service/ops/station/deviceStatusStatistics |
| xxx | /awl-optm-mv-control/sgn/areaCode/ipcState |
| xxx | /bigdata-bi-service/ops/station/find-od-device-status-list |
| 收藏场站 | /ncharge-user-service/favorite/operation |

</StickyHtmlPreview>

<StickyHtmlPreview :src="$withBase('/merchant-mini-program/prototype/station-detail.html')" type="mobile">

#### 场站详情
##### 说明
::: info 待确认指标
- [X] 日均单枪使用率,确认接口是否有该指标
- [X] 负载情况，确认是否有接口？当天站容量功率利用率
- [X] 补齐已有接口路径，便于后端迁移
:::

#### 功能描述


##### 负载折线图
- 公式：负载率(t) = (∑实际输出功率(t)) / (∑额定功率) × 100%
    - 其中：
    - t 为统计时间点
    - ∑实际输出功率(t) = 该时间点所有充电枪的实际输出功率之和
    - ∑额定功率 = 所有充电枪的额定功率之和

- 数据采集频率：
    - 建议每15分钟采集一次实时功率数据
    - 按小时计算平均值用于图表显示
    
- 特殊情况：
    - 充电枪离线：计算时将该充电枪的实际输出功率记为0
    - 功率超限：若实际输出功率超过额定功率，按额定功率计算
    
| 待开发的接口 | 优先级 |
| --- | --- |
| 今日数据 | P0 |
| 场站负载率折线图 | P0 |

- 原有接口

| 用途 | 路径 | 
| --- | --- |
| xxx | ncharge-stat-service/ops/station/find-pile-hole-info-list |
| xxx | /bigdata-bi-service/ops/station/deviceStatusSum |


</StickyHtmlPreview>


## 设备分析

<StickyHtmlPreview :src="$withBase('/merchant-mini-program/prototype/device.html')" type="mobile">

### 记录和确认点

::: info 
- [X] 设备健康度，状态分布包括充电、空闲、故障和离线等基于原有接口
- [X] 使用率分布，确认接口是否有该指标
:::
### 功能描述

#### 健康度总览

#### 效能分析
- **卡片总览**：
  - 筛选条件：时间
  - 设备使用率、设备可用率、场站设备可用性接口已有，与PC看板一致

- **效率分析**：
  - 卡片总览，使用现有接口，与PC看板一致
  - 单枪日均充电量(kWh/枪/日)指标
  - 单枪日均订单数(单/枪/日)指标

#### 故障分析<Badge text="暂不实现，还需整理及详细设计" type="warning"/>
- **故障类型分布**
  - 按故障类型统计频率

#### 异常预警
  - 仅给出最近2条，具体到枪，没有则不展示本卡片


### 接口需求

| 待开发的接口 | 优先级 |
| --- | --- |
| 单枪日均充电量(kWh/枪/日)指标 | P0 |
| 单枪日均订单数(单/枪/日)指标 | P0 |
| 枪故障告警 | P0 |


</StickyHtmlPreview>

<StickyHtmlPreview :src="$withBase('/merchant-mini-program/prototype/device-alerts.html')" type="mobile">

## 设备预警
### 记录和确认点
::: info 
- [X] 暂时不展示故障类型
- [ ] 预警分级需重新设计
:::
### 功能描述
| 待开发的接口 | 优先级 |
| --- | --- |
| 枪故障告警 | P0 |

</StickyHtmlPreview>

<StickyHtmlPreview :src="$withBase('/merchant-mini-program/prototype/login.html')" type="mobile">

## 登录
### 账密登录
- 只做账密登录，不做其他
### ~~微信授权登录~~
### ~~短信登录~~

</StickyHtmlPreview>

