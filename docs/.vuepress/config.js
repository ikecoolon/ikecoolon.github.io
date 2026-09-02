const { config } = require('vuepress-theme-hope')

module.exports = config({
  base: '/',
  lang: 'zh-CN',
  title: '宠物健康报告',
  description: '宠物健康报告的产品设计、需求文档、架构决策与交互原型',
  shouldPrefetch: false,

  locales: {
    '/': {
      lang: 'zh-CN',
      title: '宠物健康报告',
      description: '宠物健康报告的产品设计、需求文档、架构决策与交互原型'
    }
  },

  theme: 'hope',
  host: 'localhost',
  port: 8080,

  themeConfig: {
    hostname: 'https://ikecoolon.github.io',
    locales: {
      '/': {
        lang: 'zh-CN',
        selectText: '选择语言',
        label: '简体中文',
        nav: [
          { text: '首页', link: '/' },
          { text: '产品设计', link: '/product-design/' },
          { text: 'PRD', link: '/prd/' },
          { text: 'ADR', link: '/adr/' },
          { text: '规范', link: '/rules/' },
          { text: '原型', link: '/prototype/' }
        ],
        sidebar: {
          '/product-design/': [
            {
              title: '产品设计',
              collapsable: false,
              children: [
                '',
                'pet-health-report-business-design',
                'open-questions',
                'pet-microbiome-reference-and-content-configuration-research',
                'wechat-mini-program-client-preparation-research'
              ]
            }
          ],
          '/prd/': [
            {
              title: 'PRD',
              collapsable: false,
              children: ['', 'admin', 'mini-program']
            }
          ],
          '/adr/': [
            {
              title: '架构决策记录',
              collapsable: false,
              children: ['']
            }
          ],
          '/rules/': [
            {
              title: '规范',
              collapsable: false,
              children: [
                '',
                'requirement-analysis',
                'product-design',
                'document-structure',
                'business-logic',
                'prototype',
                'iteration',
                'launch',
                'collaboration',
                'content',
                'knowledge'
              ]
            }
          ],
          '/': []
        },
        lastUpdated: '上次更新',
        editLinkText: '编辑此页'
      }
    },

    repo: '',
    editLinks: false,
    blog: false,
    breadcrumb: true,
    author: 'Pet Eden',
    darkmode: 'switch',
    fullscreen: true,
    mdEnhance: {
      enableAll: false,
      presentation: true,
      flowchart: true,
      tabs: true,
      container: true,
      codegroup: true,
      mark: true,
      tasklist: true,
      align: true,
      sup: true,
      sub: true,
      footnote: true,
      katex: true,
      chart: true,
      demo: true,
      mermaid: false
    }
  },

  markdown: {
    tasklist: true,
    hint: true,
    lineNumbers: true,
    extractHeaders: ['h2', 'h3', 'h4']
  },

  plugins: [
    '@vuepress/back-to-top',
    '@vuepress/medium-zoom'
  ]
})
