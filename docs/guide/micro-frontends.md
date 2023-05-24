# 微前端
## 我们选择的方案
我们采用阿里qiankun库1.x版本作为初版微前端解决方案
([什么是微前端/qiankun是什么](https://v1.qiankun.umijs.org/zh/guide/))

## 我们有哪些价值场景
- 各产品管理/运营端灵活聚合<br> 例如：充电管理端与物流管理端可以各自迭代部署，按需聚合。

- 技术栈无关性，为未来接入三方系统提供更多可能性<br>
  
## 如何接入
### 子应用
- [qiankun1.x子应用官方快速上手](https://v1.qiankun.umijs.org/zh/guide/getting-started.html#%E5%AD%90%E5%BA%94%E7%94%A8)

- url模式（[是什么？](../tips/url-mode.html)）<br>
>如果你使用vue，可参照以下例子，其他框架请自行查阅文档
```javascript
// RouterMode = 'hash' | 'history' | 'abstract'
  router = new VueRouter({
    // url只能才使用[history模式](/)，请自行做好子应用的改造
    mode: 'history',
    //__POWERED_BY_QIANKUN__ 来自qiankun包或你可以全局自定义
    base: window.__POWERED_BY_QIANKUN__ ? '/sub-ec' : '/',
    routes,
  });
```

::: warning 为什么我们这样配base？举个栗子🌰
**主应用中的子应用xlist页路由：**

    https://www.x.com/base-project/sub-ec/xlist
**独立部署的子应用xlist页路由：**

    https://www.x.com/ec/xlist
    
以上两种路由同时有效互不干扰
:::
    
#### 路由&页面聚合
>为了提供给主应用集成的能力，请注意子应用前端路由的[配置规范/约定](../standard/micro-frontends-route.html)


### 主应用
- [qiankun1.x主应用官方快速上手](https://v1.qiankun.umijs.org/zh/guide/getting-started.html#%E4%B8%BB%E5%BA%94%E7%94%A8)<br>


- 想体验可下载我们的[demo工程](http://gitlab.aostarit.com.cn/sjxn/ui-common/micro-frontend-seed.git)

### 版本管理 [（是什么？）](../standard/micro-frontends-version-control.html)
