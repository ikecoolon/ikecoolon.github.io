module.exports = {
    title: 'sgse文档共享',
    description: '🤔你有什么想说？写进来吧！😎',
    base: '/',
    locales: {
        '/': {
            lang: 'zh-CN'
        }
    },
    plugins:[
        ['@vuepress/last-updated', {
            transformer: (timestamp, lang) => {
                // 不要忘了安装 moment
                const moment = require('moment');
                moment.locale('zh-CN');
                return moment(timestamp).fromNow()
            },
            dateOptions: {
                hour12: false
            }

        }],
        ['@vuepress/back-to-top'],
        ['@vuepress/active-header-links', {
            sidebarLinkSelector: '.sidebar-link',
            headerAnchorSelector: '.header-anchor'
        }],
        ['@vuepress/medium-zoom'],
        ['vuepress-plugin-code-copy', true]
    ],
    themeConfig: {
        smoothScroll: true,
        nav: [
            {text: '首页', link: '/'},
            {
                text: '指南',
                items: [
                    {text: '参与写作', link: '/guide/getting-started.md'},
                    {text: '系统速查', link: '/guide/getting-address.md'},
                    {text: 'ios开发版安装指南', link: '/guide/ios-dev-install.md'},
                    {text: '后台系统标准库', link: '/guide/admin-common.md'},
                    {text: '微前端', link: '/guide/micro-frontends.md'},
                    {text: '微前端FAQ', link: '/guide/micro-frontends-faq.md'},
                    {text: '项目启动脚手架vue+微信小程序', link: '/guide/rondo-cli.md'},
                    {text: '工作流', link: '/guide/git-flow.md'},
                ]
            },
            {
                text: '规范',
                items: [
                    {text: '浏览器本地存储', link: '/standard/browser.md'},
                    {text: '微前端-路由规范', link: '/standard/micro-frontends-route.md'},
                    {text: '微前端-版本管理', link: '/standard/micro-frontends-version-control.md'},
                    {text: '代码分支管理', link: '/standard/code-version-control.md'},

                ],
            },
            {
                text: 'tips',
                items: [
                    {text: '路由模式', link: '/tips/url-mode.md'},
                    {text: '前端线上多版本', link: '/tips/how-to-keep-multiple-frontends-version-online.md'},
                ]
            },

            {
                text: '组件',
                items: [

                    {text: '[pc]地图看板', link: '/components/map-dashboard.md'},
                    {text: '[pc]动态条件框', link: '/components/dynamic-query.md'}
                ]
            },
        ],
        sidebar: {
            '/guide/': [
                {
                    collapsable: false,
                    sidebarDepth: 3,
                    children: [
                        'getting-started',
                        'getting-address',
                        'ios-dev-install',
                        'admin-common',
                        'micro-frontends',
                        'micro-frontends-faq',
                        'rondo-cli',
                        'git-flow'
                    ],
                },

            ],
            '/tips/': [
                {
                    collapsable: false,
                    sidebarDepth: 3,
                    children: [
                        'url-mode',
                        'how-to-keep-multiple-frontends-version-online'
                    ],
                },
            ],
            '/standard/': [
                {
                    collapsable: false,
                    sidebarDepth: 3,
                    children: [
                        'browser',
                        'micro-frontends-route',
                        'micro-frontends-version-control',
                        'code-version-control',
                    ],
                },
            ]
        },
        // displayAllHeaders: true,
        // lastUpdated: '最后更新时间',
        // editLinks: true,

    },
};
