const { config } = require('vuepress-theme-hope')

module.exports = config({
  base: '/',
  lang: 'zh-CN',
  title: '营会中心',
  description: '营会中心产品资料、需求专题与交互原型',
  port: 8081,
  shouldPrefetch: false,
  devServer: {
    watchOptions: { poll: 1000, ignored: /node_modules/ }
  },
  theme: 'hope',
  themeConfig: {
    hostname: 'http://localhost:8081',
    locales: {
      '/': {
        lang: 'zh-CN',
        nav: [
          { text: '首页', link: '/' },
          { text: '需求专题', link: '/requirements/' },
          { text: '原型目录', link: '/prototypes/' },
          { text: '写作规则', link: '/rules/' }
        ],
        sidebar: {
          '/rules/': [
            { title: '写作规则', collapsable: false, children: ['', 'prd', 'prototype'] }
          ],
          '/': []
        },
        lastUpdated: '上次更新'
      }
    },
    repo: '',
    editLinks: false,
    blog: false,
    breadcrumb: true,
    darkmode: 'switch',
    fullscreen: true
  },
  markdown: {
    lineNumbers: true,
    extractHeaders: ['h2', 'h3']
  }
})
