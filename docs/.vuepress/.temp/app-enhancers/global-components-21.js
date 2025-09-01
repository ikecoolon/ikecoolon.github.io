import Vue from 'vue'
Vue.component("HtmlPreview", () => import("/Users/zhaoyanlong/Documents/xh-prd-docs/docs/.vuepress/components/HtmlPreview"))
Vue.component("PdfPreview", () => import("/Users/zhaoyanlong/Documents/xh-prd-docs/docs/.vuepress/components/PdfPreview"))
Vue.component("StickyHtmlPreview", () => import("/Users/zhaoyanlong/Documents/xh-prd-docs/docs/.vuepress/components/StickyHtmlPreview"))
Vue.component("ProductList", () => import("/Users/zhaoyanlong/Documents/xh-prd-docs/docs/.vuepress/components/ProductList"))
Vue.component("CodeBlock", () => import("/Users/zhaoyanlong/Documents/xh-prd-docs/node_modules/@vuepress/theme-default/global-components/CodeBlock"))
Vue.component("CodeGroup", () => import("/Users/zhaoyanlong/Documents/xh-prd-docs/node_modules/@vuepress/theme-default/global-components/CodeGroup"))
Vue.component("Badge", () => import("/Users/zhaoyanlong/Documents/xh-prd-docs/node_modules/@vuepress/theme-default/global-components/Badge"))


export default {}