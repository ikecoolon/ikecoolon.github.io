const { config } = require("vuepress-theme-hope");

module.exports = config({
  base: '/docs/',
  lang: 'zh-CN',
  title: '新恒电力文档',
  description: '产品文档',
  
  locales: {
    '/': {
      lang: 'zh-CN',
      title: '新恒电力文档',
      description: '产品文档'
    }
  },
  
  theme: 'hope',
  host: 'localhost',
  port: 8080,
  themeConfig: {
    hostname: 'http://localhost:8080',
    
    locales: {
      '/': {
        lang: 'zh-CN',
        selectText: '选择语言',
        label: '简体中文',
    nav: [
      { text: '首页', link: '/' },
      { 
        text: '规范', 
        items: [
          { text: '规范介绍', link: '/rules/' },
          { text: '需求分析', link: '/rules/requirement-analysis' },
          { text: '产品设计', link: '/rules/product-design' },
          { text: '文档结构', link: '/rules/document-structure' },
          { text: '业务逻辑', link: '/rules/business-logic' },
          { text: '原型', link: '/rules/prototype' },
          { text: '迭代', link: '/rules/iteration' },
          { text: '上线', link: '/rules/launch' },
          { text: '协作', link: '/rules/collaboration' },
          { text: '内容', link: '/rules/content' },
          { text: '知识管理', link: '/rules/knowledge' }
        ]
      },
      { 
        text: '产品', 
        items: [
          { text: '产品目录', link: '/products/' },
          { 
            text: '按年份浏览',
            items: [
              { text: '2025年', link: '/products/2025/' },
              { text: '2024年', link: '/products/2024/' }
            ]
          },
          { 
            text: '按类型浏览',
            items: [
              { text: '充电产品', link: '/products/charging-products/'},
              { text: '虚拟电厂', link: '/products/virtual-power/' }
            ]
          }
        ]
          }
    ],
    sidebar: {
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
      '/products/': [
        {
          title: '产品文档',
          collapsable: false,
          children: [
            '',
          ]
        },
        {
          title: '按年份',
          collapsable: true,
          children: [
            '2025/',
            '2024/'
          ]
        },
        {
          title: '按类型',
          children: [
            'charging-products/',
            'virtual-power/'
          ]
        }
      ],
      '/products/charging-products/': [
        {
          title: '2025',
          collapsable: false,
          children: [
            '/products/charging-products/2025/5-merchant-mini-program/prd/ninth.md'
          ]
        }
          ]
    },
    lastUpdated: '上次更新',
        editLinkText: '编辑此页'
      }
    },
    
    repo: '',
    editLinks: false,
    blog: false,
    breadcrumb: true,
    author: "XH Product Team",
    darkmode: "switch",
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
    },
  },
  markdown: {
    tasklist: true,
    hint: true,
    lineNumbers: true,
    extractHeaders: ['h2', 'h3', 'h4'],
  },
  plugins: [
    '@vuepress/back-to-top',
    '@vuepress/medium-zoom'
  ],
}); 