# 微前端FAQ
## qiankun官方答疑
[链接](https://v1.qiankun.umijs.org/zh/faq/#application-died-in-status-loading-source-code-you-need-to-export-the-functional-lifecycles-in-xxx-entry)
## 其他问题
### babel-polyfill 重复引入问题
>如图

<img :src="$withBase('/image/1586934185041.jpg')" alt="foo">

**子应用注意使用如下引入方式**
```javascript
// create js ==>named check-repeat-babel-polyfill.js
export default (() => {
  if (!global || !global._babelPolyfill) {
    require("babel-polyfill")
  }
})()

// 使用
import "./check-repeat-babel-polyfill";
// 代替
import "babel-polyfill";
// 即可避免主应用报错
```

