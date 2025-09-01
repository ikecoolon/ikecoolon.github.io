document.addEventListener('DOMContentLoaded', () => {
    const navTitle = document.getElementById('nav-title');
    const backButton = document.getElementById('back-button');
    const tabItems = document.querySelectorAll('.tab-item');
    const pageContentContainer = document.getElementById('page-content-container');

    const pageTitles = {
        'home': '首页',
        'profile': '我的',
        'settings': '设置',
    };

    // Load ECharts dynamically if needed, or assume it's loaded in index.html head.
    // For this prototype, we'll assume it's loaded in the head of the main index.html file.
    function initMiniChart() {
        const miniChartDom = document.getElementById('mini-chart');
        if (miniChartDom) {
            const miniChart = echarts.init(miniChartDom);
            const miniOption = {
                xAxis: {
                    type: 'category',
                    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                },
                yAxis: {
                    type: 'value'
                },
                series: [{
                    data: [150, 230, 224, 218, 135, 147, 260],
                    type: 'line',
                    smooth: true
                }]
            };
            miniChart.setOption(miniOption);
        }
    }

    async function loadPage(pageId) {
        try {
            const response = await fetch(`./${pageId}.html`);
            const html = await response.text();
            pageContentContainer.innerHTML = html;
            navTitle.textContent = pageTitles[pageId];

            // Specific initialization for home page (ECharts)
            if (pageId === 'home') {
                initMiniChart();
            }
            // Hide back button for main tab pages, show for sub-pages if any were implemented
            backButton.classList.add('hidden'); // Simplified for this prototype
        } catch (error) {
            console.error(`Error loading page ${pageId}.html:`, error);
            pageContentContainer.innerHTML = '<p class="text-red-500 p-4">页面加载失败。</p>';
        }
    }

    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            tabItems.forEach(tab => tab.classList.remove('active'));
            item.classList.add('active');
            loadPage(item.dataset.page);
        });
    });

    // Initial page load
    loadPage('home');
});
