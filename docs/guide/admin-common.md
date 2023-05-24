# 后台系统标准库

## 依赖

```shell
#npm
$ npm i element-ui axios vue-router vuex --save
$ npm i svg-sprite-loader svg-transform-loader svgo-loader --save-dev

#yarn
$ yarn add element-ui axios vue-router vuex
$ yarn add svg-sprite-loader svg-transform-loader svgo-loader -D
```

## 安装

需要使用公司vpn，最新npm包请在[公司私有仓库](https://nexus.aostarit.com.cn/#browse/search/npm)查看

```shell
#npm
$ npm i --save https://nexus.aostarit.com.cn/repository/npm-public/aostar-vue-common/-/aostar-vue-common-0.4.10.tgz

#yarn
$ yarn add https://nexus.aostarit.com.cn/repository/npm-public/aostar-vue-common/-/aostar-vue-common-0.4.10.tgz
```

## 使用

```javascript
import Vue from "vue";
import AdminCommon from "aostar-vue-common";

Vue.use(AdminCommon, {
  // 必填，系统标题，默认为 "后台管理公共样式"
  title: "",
  // 必填
  microServerConfig: {
    // 客户端身份标识，一般不需要修改(商户平台)
    clientId: "",
    // 单点登录的请求地址
    ssoUriPrefix: "",
    // 请求域名
    baseUri: "",
    // 国密加密公钥
    publicKey: ""
  },
  routerConfig: {
    // 路由模式， 默认为'history'
    mode: process.env.NODE_ENV === "production" ? "history" : "hash",
    // 选填, 不需要权限的路由, 当传入路由和默认路由相同时替换为传入的路由
    // 一般只替换 "/" 的路由
    // 库中含有默认路由, 详见下方
    constantRoutes: [
      {
        path: "/",
        component: AdminCommon.Layout,
        children: [
          {
            path: "",
            component: () => import(/* Home */ "@/layout/views/Home"),
            name: "Home",
            meta: { title: "首页", icon: "icon_bjq", affix: true }
          }
        ]
      }
    ],
    // 选填, 需要权限的路由
    asyncRoutes: []
  },
  // 选填, 以module的形式传入, 不能注册为根模块, 所以必须是命名模块
  storeModule: {}
});

Vue.prototype.$axios = AdminCommon.axios;

new Vue({
  el: "#app",
  router: AdminCommon.router,
  store: AdminCommon.store,
  render: h => h(App)
});
```

## AdminCommon

### Layout 组件

标准布局组件，未注册全局组件，包含`侧边栏`, `Tab导航栏`, `内容显示区域`, 一般用在某一业务路由的最外层中

```javascript
import AdminCommon from "aostar-vue-common";

{
  path: '/xxx',
  component: AdminCommon.Layout,
  children:''
  // ...
}
```

### SvgIcon 组件

侧边栏中显示图标使用了此组件

svg 组件，全局注册名为`svg-icon`，效果类似于字体图标。若需使用请查看[详细介绍](https://panjiachen.gitee.io/vue-element-admin-site/zh/feature/component/svg-icon.html#%E4%BD%BF%E7%94%A8%E6%96%B9%E5%BC%8F)

### routerConfig

`vue-router` 配置，暂时只支持配置路由信息，而不是传入 router 实例

#### 路由配置项

```javascript
{
  // 当设置 true 的时候该路由不会在侧边栏出现 如401，login等页面，或者如一些编辑页面/edit/1
  hidden: true, // (默认 false)

  //当设置 noRedirect 的时候该路由在面包屑导航中不可被点击
  redirect: 'noRedirect',

  // 当你一个路由下面的 children 声明的路由大于1个时，自动会变成嵌套的模式--如组件页面
  // 只有一个时，会将那个子路由当做根路由显示在侧边栏--如引导页面
  // 若你想不管路由下面的 children 声明的个数都显示你的根路由
  // 你可以设置 alwaysShow: true，这样它就会忽略之前定义的规则，一直显示根路由
  alwaysShow: true,

  name: 'router-name', // 设定路由的名字，一定要填写不然使用<keep-alive>时会出现各种问题
  meta: {
    roles: ['admin', 'editor'], // 设置该路由进入的权限，支持多个权限叠加
    title: 'title', // 设置该路由在侧边栏和面包屑中展示的名字
    icon: 'svg-name', // 设置该路由的图标，支持 svg-class，也支持 el-icon-x element-ui 的 icon
    noCache: true, // 如果设置为true，则不会被 <keep-alive> 缓存(默认 false)
    breadcrumb: false, //  如果设置为false，则不会在breadcrumb面包屑中显示(默认 true)
    affix: true, // 如果设置为true，它则会固定在tags-view中(默认 false)

    // 当路由设置了该属性，则会高亮相对应的侧边栏。
    // 这在某些场景非常有用，比如：一个文章的列表页路由为：/article/list
    // 点击文章进入文章详情页，这时候路由为/article/1，但你想在侧边栏高亮文章列表的路由，就可以进行如下设置
    activeMenu: '/article/list', //高亮该侧边栏和标签页

    noCheck: false, // 如果设置为true，则该路由将会和constantRoutes效果一样不需要权限即可访问
    category: false, // 如果设置为true，则显示在主功能侧边栏中
    alias: '简称', // 路由的中文简称
  }
}
```

#### mode

路由模式，默认为`history`，建议配置为

```javascript
{
  // ...
  routerConfig: {
    mode: process.env.NODE_ENV === "production" ? "history" : "hash";
    // ...
  }
}
```

#### constantRoutes

```javascript
import AdminCommon from "aostar-vue-common";

// constantRoutes默认包含的路由, 当传入路由和默认路由path相同时替换为传入的路由
[
  {
    // 重定向
    path: "/redirect",
    component: AdminCommon.Layout,
    hidden: true,
    children: [
      {
        path: "/redirect/:path(.*)",
        component: redirect
      }
    ]
  },
  {
    path: "/404",
    component: error404,
    hidden: true
  },
  {
    path: "/401",
    component: error401,
    hidden: true
  },
  {
    // 默认的首页, 一般只替换当前路由
    path: "/",
    component: AdminCommon.Layout,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        component: dashboard,
        name: "Dashboard",
        meta: { title: "首页", icon: "icon_bjq", affix: true }
      }
    ]
  },
  // 登陆后的中转页
  {
    path: "/init",
    component: Init,
    name: "init",
    meta: { title: "init", icon: "init" },
    hidden: true
  }
];
```

#### asyncRoutes

需要权限验证的路由页面

#### 注意点

- 路由的配置项

  - 想要将`asyncRoutes`**显示**侧边栏在导航项的话，`name`，`title`必须填写
  - 其中配置`meta.icon`时, 需将对应的 svg 文件移动到`src\icons\svg\`目录下，再使用文件名。

    - 如使用‘xxx.svg’, `meta:{icon: 'xxx'}`
    - 原因：使用了`svg-sprite-loader`把 svg 文件处理为 svg 元素
    - vue.config.js 添加如下代码

    ```javascript
    module.exports = {
      // ...
      chainWebpack(config) {
        // ...
        // set svg-sprite-loader
        config.module.rule("svg").exclude.add(resolve("src/icons")).end();
        config.module
          .rule("icons")
          .test(/\.svg$/)
          .include.add(resolve("src/icons"))
          .end()
          .use("svg-sprite-loader")
          .loader("svg-sprite-loader")
          .options({
            symbolId: "icon-[name]"
          })
          .end()
          .before("svg-sprite-loader")
          .use("svg-transform-loader")
          .loader("svg-transform-loader")
          .end()
          .before("svg-sprite-loader")
          .use("svgo-loader")
          .loader("svgo-loader")
          .options({
            plugins: [
              {
                name: "removeAttrs",
                params: {
                  attrs: "fill"
                }
              }
            ]
          })
          .end();
      }
    };
    ```

### storeModule

`vuex` 的 `modules` 的形式传入, 注意加上`namespaced: true`，暂时只支持配置仓储信息，而不是传入 store 实例

### axios（暂不支持配置）

处理过`request`的 axios，包含`加密`，`防重放`等

```javascript
Vue.prototype.$axios = AostarVueCommon.axios;
```

## 参考文档

- [vuex - modules](https://vuex.vuejs.org/zh/guide/modules.html)

- [vue-admin-element](https://panjiachen.gitee.io/vue-element-admin-site/zh/guide/)
