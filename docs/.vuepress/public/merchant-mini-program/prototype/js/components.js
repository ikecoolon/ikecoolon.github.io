// 页面通用组件模板
const components = {
  // 小程序导航栏模板
  miniAppNav: (title, showBack = false) => `
    <div class="fixed top-0 left-0 right-0 bg-white z-40 mini-nav" style="height: 88px; padding-top: 44px;">
      <div class="flex items-center px-4 h-11">
        ${showBack ? `
          <button onclick="history.back()" class="mr-2">
            <i class="fas fa-chevron-left text-gray-700"></i>
          </button>
        ` : ''}
        <div class="text-center flex-1 ${showBack ? 'text-left' : ''}">
          <h1 class="text-lg font-medium text-gray-800">${title}</h1>
        </div>
        ${!showBack ? `
          <button class="text-gray-600">
            <i class="fas fa-ellipsis-h"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `,

  // 底部标签栏模板
  tabBar: (active) => `
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40" style="padding-bottom: env(safe-area-inset-bottom, 0);">
      <div class="grid grid-cols-4 py-1">
        <a href="home.html" class="flex flex-col items-center py-2 ${active === 'home' ? 'text-blue-500' : 'text-gray-500'}">
          <i class="fas fa-chart-line mb-1 text-lg"></i>
          <span class="text-xs">经营概况</span>
        </a>
        <a href="station.html" class="flex flex-col items-center py-2 ${active === 'station' ? 'text-blue-500' : 'text-gray-500'}">
          <i class="fas fa-map-marker-alt mb-1 text-lg"></i>
          <span class="text-xs">场站监测</span>
        </a>
        <a href="device.html" class="flex flex-col items-center py-2 ${active === 'device' ? 'text-blue-500' : 'text-gray-500'}">
          <i class="fas fa-sliders-h mb-1 text-lg"></i>
          <span class="text-xs">设备分析</span>
        </a>
        <a href="profile.html" class="flex flex-col items-center py-2 ${active === 'profile' ? 'text-blue-500' : 'text-gray-500'}">
          <i class="fas fa-user mb-1 text-lg"></i>
          <span class="text-xs">我的</span>
        </a>
      </div>
    </div>
  `,

  // iOS 状态栏模板
  statusBar: () => `
    <div class="fixed top-0 left-0 right-0 bg-white z-50" style="height: 44px;">
      <div class="flex justify-between items-center px-4 h-full text-sm">
        <div>12:42</div>
        <div class="flex items-center space-x-2">
          <i class="fas fa-signal"></i>
          <i class="fas fa-wifi"></i>
          <i class="fas fa-battery-three-quarters"></i>
        </div>
      </div>
    </div>
  `,

  // 页面容器模板
  pageContainer: (content) => `
    <div class="page-container pb-20 pt-20" style="min-height: 100vh; padding-top: 88px; padding-bottom: calc(env(safe-area-inset-bottom, 0) + 60px);">
      ${content}
    </div>
  `,

  // 数据卡片模板
  dataCard: (title, value, unit, change = null, icon = null) => `
    <div class="bg-white rounded-lg shadow-sm p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-500">${title}</span>
        ${icon ? `<i class="fas ${icon} text-gray-400"></i>` : ''}
      </div>
      <div class="flex items-baseline">
        <span class="text-xl font-semibold text-gray-800">${value}</span>
        <span class="text-xs text-gray-500 ml-1">${unit}</span>
      </div>
      ${change !== null ? `
        <div class="mt-1 text-xs ${parseFloat(change) >= 0 ? 'text-green-500' : 'text-red-500'}">
          <i class="fas ${parseFloat(change) >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
          ${Math.abs(parseFloat(change))}%
        </div>
      ` : ''}
    </div>
  `,

  // 饼图配置生成器
  createPieChartOption: (data, title) => {
    return {
      title: {
        text: title,
        left: 'center',
        top: 0,
        textStyle: {
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        data: data.map(item => item.name),
        textStyle: {
          fontSize: 12
        }
      },
      series: [
        {
          name: title,
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '12',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: data
        }
      ]
    };
  },

  // 折线图配置生成器
  createLineChartOption: (xData, seriesData, title, yAxisName) => {
    return {
      title: {
        text: title,
        left: 'center',
        top: 0,
        textStyle: {
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value',
        name: yAxisName,
        nameTextStyle: {
          padding: [0, 0, 0, 40]
        }
      },
      series: [
        {
          data: seriesData,
          type: 'line',
          smooth: true,
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#1890ff'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
              ]
            }
          }
        }
      ]
    };
  }
}; 