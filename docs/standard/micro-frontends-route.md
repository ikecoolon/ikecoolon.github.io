# 微前端-路由规范
## 配置
::: warning 注意
如果你希望全部路由/功能无需改动顺利被主应用接入，请一定使用`相对路径！！`  
:::
>例子
```javascript
//这可能是你的route配置
export default [
  {
    //在根路径为主应用提供专属path
    path: window.__POWERED_BY_QIANKUN__ ? "/sub-ec/" : "/",
    component: AppLayout,
    meta: {
      label: "首页"
    },
    children: [
      {
        path: "",
        component: Home,
        meta: {
          label: "默认主页"
        }
      },
       //其他业务路由
      ...appRoutes

    ]
  },

//appRoutes
{
    path: "business",
    component: Layout,
    meta: {
      label: "我的业务",
      icon: "fa fa-cog"
    },
    children: [{
      path: "partOne",
      component: partOne,
      meta: {
        label: "第一部分",
        //path: "/business/partOne"    //bad ❌
        path: "business/partOne"    //nice ⭕️
      }
    }]
  },

```

## 跳转
```javascript
//bad ❌
this.$router.push({ name: "/createOrder", params: { id: id } });
//nice ⭕️
this.$router.push({ name: "createOrder", params: { id: id } });
```

## 页面聚合
**为了隐去子应用页面菜单等多余部分，请自行处理下模板结构**<br>
>例如上面route配置的AppLayout 可能有如下结构
```vue
//AppLayout.vue
<template>
 <!-- 原工程该有的结构-->
  <div v-if="!isChildApp">
    <el-container>
      ...
      ...
    </el-container>
  </div>
  <!-- 为主应用提供的结构 -->
  <div class="app-container" v-else>
    <router-view></router-view>
  </div>
</template>

export default{  
    data () {
       return {
        isChildApp: window.__POWERED_BY_QIANKUN__
         ....
         ....
        };
    }  
}
```

## 效果
**子应用**
<img :src="$withBase('/image/WX20200424-113313.png')" alt="foo">
**迁入微前端后**
<img :src="$withBase('/image/WX20200424-111049.png')" alt="foo">
