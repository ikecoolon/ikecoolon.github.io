document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('#main-nav .nav-item');
    const pageContentContainer = document.getElementById('page-content-container');
    const pageTitle = document.getElementById('page-title');

    const pageTitlesMap = {
        'pet-information': '宠物信息',
        'customer-management': '客户管理',
        'pet-report-management': '萌宠报告',
        'analysis-rules': '分析建议规则',
        'dictionary-management': '字典管理',
        'normal-range-config': '正常范围配置',
        'health-level-management': '健康值分级'
    };

    function initMainChart() {
        const chartDom = document.getElementById('main-chart');
        if (chartDom) {
            const myChart = echarts.init(chartDom);
            const option = {
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    data: ['访问量', '交易额']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
                },
                yAxis: {
                    type: 'value'
                },
                series: [
                    {
                        name: '访问量',
                        type: 'line',
                        stack: '总量',
                        data: [120, 132, 101, 134, 90, 230, 210]
                    },
                    {
                        name: '交易额',
                        type: 'line',
                        stack: '总量',
                        data: [220, 182, 191, 234, 290, 330, 310]
                    }
                ]
            };
            myChart.setOption(option);
        }
    }

    async function loadPage(pageId, updateHash = true) {
        try {
            const response = await fetch(`./${pageId}.html`);
            const html = await response.text();
            pageContentContainer.innerHTML = html;
            pageTitle.textContent = pageTitlesMap[pageId];

            // Update active state of nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
            if (activeNavItem) {
                activeNavItem.classList.add('active');
            }

            if (pageId === 'dashboard') {
                initMainChart();
            } else if (pageId === 'pet-information') {
                if (typeof FontAwesomeConfig !== 'undefined' && FontAwesomeConfig.autoReplaceSvg) {
                    FontAwesomeConfig.autoReplaceSvg();
                } else if (typeof FontAwesome !== 'undefined' && FontAwesome.dom && FontAwesome.dom.i2svg) {
                    FontAwesome.dom.i2svg();
                } else if (document.head.querySelector('link[href*="font-awesome"]')) {
                    document.querySelectorAll('.fas, .far, .fal, .fab').forEach(icon => {
                        icon.classList.add('fa-fw');
                    });
                }
                // Dynamically load pet-information-script.js
                const petInfoScript = document.createElement('script');
                petInfoScript.src = './js/pet-information-script.js';
                petInfoScript.onload = () => {
                    console.log('Pet information script loaded successfully');
                };
                petInfoScript.onerror = () => {
                    console.error('Failed to load pet information script');
                };
                document.head.appendChild(petInfoScript);
            } else if (pageId === 'customer-management') {
                if (typeof FontAwesomeConfig !== 'undefined' && FontAwesomeConfig.autoReplaceSvg) {
                    FontAwesomeConfig.autoReplaceSvg();
                } else if (typeof FontAwesome !== 'undefined' && FontAwesome.dom && FontAwesome.dom.i2svg) {
                    FontAwesome.dom.i2svg();
                } else if (document.head.querySelector('link[href*="font-awesome"]')) {
                    document.querySelectorAll('.fas, .far, .fal, .fab').forEach(icon => {
                        icon.classList.add('fa-fw');
                    });
                }
                // Dynamically load customer-management-script.js
                const customerMgmtScript = document.createElement('script');
                customerMgmtScript.src = './js/customer-management-script.js';
                customerMgmtScript.onload = () => {
                    console.log('Customer management script loaded successfully');
                };
                customerMgmtScript.onerror = () => {
                    console.error('Failed to load customer management script');
                };
                document.head.appendChild(customerMgmtScript);
            } else if (pageId === 'analysis-rules') {
                if (typeof FontAwesomeConfig !== 'undefined' && FontAwesomeConfig.autoReplaceSvg) {
                    FontAwesomeConfig.autoReplaceSvg();
                } else if (typeof FontAwesome !== 'undefined' && FontAwesome.dom && FontAwesome.dom.i2svg) {
                    FontAwesome.dom.i2svg();
                } else if (document.head.querySelector('link[href*="font-awesome"]')) {
                    document.querySelectorAll('.fas, .far, .fal, .fab').forEach(icon => {
                        icon.classList.add('fa-fw');
                    });
                }
                // Dynamically load analysis-rules-script.js
                const analysisRulesScript = document.createElement('script');
                analysisRulesScript.src = './js/analysis-rules-script.js';
                analysisRulesScript.onload = () => {
                    console.log('Analysis rules script loaded successfully');
                };
                analysisRulesScript.onerror = () => {
                    console.error('Failed to load analysis rules script');
                };
                document.head.appendChild(analysisRulesScript);
            } else if (pageId === 'dictionary-management') {
                if (typeof FontAwesomeConfig !== 'undefined' && FontAwesomeConfig.autoReplaceSvg) {
                    FontAwesomeConfig.autoReplaceSvg();
                } else if (typeof FontAwesome !== 'undefined' && FontAwesome.dom && FontAwesome.dom.i2svg) {
                    FontAwesome.dom.i2svg();
                } else if (document.head.querySelector('link[href*="font-awesome"]')) {
                    document.querySelectorAll('.fas, .far, .fal, .fab').forEach(icon => {
                        icon.classList.add('fa-fw');
                    });
                }
                // Dynamically load dictionary-management-script.js
                const script = document.createElement('script');
                script.src = './js/dictionary-management-script.js';
                script.onload = () => {
                    console.log('Dictionary management script loaded successfully');
                };
                script.onerror = () => {
                    console.error('Failed to load dictionary management script');
                };
                document.head.appendChild(script);
            } else if (pageId === 'pet-report-management') {
                if (typeof FontAwesomeConfig !== 'undefined' && FontAwesomeConfig.autoReplaceSvg) {
                    FontAwesomeConfig.autoReplaceSvg();
                } else if (typeof FontAwesome !== 'undefined' && FontAwesome.dom && FontAwesome.dom.i2svg) {
                    FontAwesome.dom.i2svg();
                } else if (document.head.querySelector('link[href*="font-awesome"]')) {
                    document.querySelectorAll('.fas, .far, .fal, .fab').forEach(icon => {
                        icon.classList.add('fa-fw');
                    });
                }
                // Dynamically load pet-report-management-script.js
                const petReportScript = document.createElement('script');
                petReportScript.src = './js/pet-report-management-script.js';
                petReportScript.onload = () => {
                    console.log('Pet report management script loaded successfully');
                };
                petReportScript.onerror = () => {
                    console.error('Failed to load pet report management script');
                };
                document.head.appendChild(petReportScript);
            } else if (pageId === 'health-level-management') {
                if (typeof FontAwesomeConfig !== 'undefined' && FontAwesomeConfig.autoReplaceSvg) {
                    FontAwesomeConfig.autoReplaceSvg();
                } else if (typeof FontAwesome !== 'undefined' && FontAwesome.dom && FontAwesome.dom.i2svg) {
                    FontAwesome.dom.i2svg();
                } else if (document.head.querySelector('link[href*="font-awesome"]')) {
                    document.querySelectorAll('.fas, .far, .fal, .fab').forEach(icon => {
                        icon.classList.add('fa-fw');
                    });
                }
                // Dynamically load health-level-management-script.js
                const healthScript = document.createElement('script');
                healthScript.src = './js/health-level-management-script.js';
                healthScript.onload = () => {
                    console.log('Health level management script loaded successfully');
                };
                healthScript.onerror = () => {
                    console.error('Failed to load health level management script');
                };
                document.head.appendChild(healthScript);
            } else if (pageId === 'normal-range-config') {
                // Dynamically load normal-range-config-script.js
                const rangeConfigScript = document.createElement('script');
                rangeConfigScript.src = './js/normal-range-config-script.js';
                rangeConfigScript.onload = () => {
                    console.log('Normal range config script loaded successfully');
                    if (typeof initNormalRangeConfig === 'function') {
                        initNormalRangeConfig();
                    }
                };
                rangeConfigScript.onerror = () => {
                    console.error('Failed to load normal range config script');
                };
                document.head.appendChild(rangeConfigScript);
            }

            if (updateHash) {
                window.location.hash = pageId;
            }
        } catch (error) {
            console.error(`Error loading page ${pageId}.html:`, error);
            pageContentContainer.innerHTML = `<p class="text-red-500 p-4">页面加载失败: ${pageTitlesMap[pageId]}。</p>`;
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;
            loadPage(pageId);
        });
    });

    // Handle initial page load and hash changes
    const initialPageId = window.location.hash ? window.location.hash.substring(1) : 'dictionary-management';
    loadPage(initialPageId, false); // Load page without updating hash again

    window.addEventListener('hashchange', () => {
        const pageIdFromHash = window.location.hash.substring(1);
        if (pageIdFromHash) {
            loadPage(pageIdFromHash, false); // Load page from hash without updating hash again
        } else {
            loadPage('dictionary-management', false); // Default to dashboard if hash is empty
        }
    });
});
