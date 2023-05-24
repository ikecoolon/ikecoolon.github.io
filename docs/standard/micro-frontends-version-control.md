# 微前端-版本管理

::: tip 说明
该规范是指导性的故而不提供具体实践，如有需要，请移至[🧩前端实践线上多版本](../tips/how-to-keep-multiple-frontends-version-online.html)
:::

## 介绍
>为什么是版本管理？

::: tip 理想常态

<ClientOnly>
<microfontends-version-g6 id="status1"></microfontends-version-g6>
</ClientOnly>

:::

::: warning 子应用不断自迭代更新

<ClientOnly>
<microfontends-version-g6 id="status2"></microfontends-version-g6>
</ClientOnly>

:::

微前端的聚合本质上是主应用动态加载线上子应用(js)，以上图示中，
主应用下的2-子应用1.1不断自迭代，如何保证主应用的质量可控，如何接入的子应用数远大于图示呢？
可以考量以下几个方面
- **对约定负责**
    
   主应用与子应用，对`路由规则`、`有父子通讯的部分`等做出约定。发生新增、改动前需与主应用开发团队及时同步

- **保留线上旧版本**
    
    主应用可以根据自己的迭代周期决定引入哪一版子应用，开发迭代中的质量管理


