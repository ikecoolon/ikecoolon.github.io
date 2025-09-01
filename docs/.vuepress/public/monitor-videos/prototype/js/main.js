// 页面路由管理
let currentPage = 'video-monitor';

// 页面显示函数
function showPage(pageId) {
    // 隐藏所有页面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    
    // 显示指定页面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        currentPage = pageId;
    }
}

// 商户入口
function showMerchantDashboard() {
    loadPageWithIframe('merchant-dashboard.html', 'merchant-dashboard');
}

// 运维入口
function showOperationDashboard() {
    loadPageWithIframe('operation-dashboard.html', 'operation-dashboard');
}

// 场站详情
function showStationDetail(stationId) {
    loadPageWithIframe('station-detail.html', 'station-detail', {stationId});
}

// 实时监控
function showRealTimeMonitor(stationId) {
    showToast(`打开 ${stationId} 场站实时监控`, 'info');
    loadPageWithIframe('station-detail.html', 'station-detail', {stationId, activeTab: 'monitor'});
}

// 历史回放
function showHistoricalPlayback(stationId) {
    showToast(`打开 ${stationId} 场站历史回放`, 'info');
    loadPageWithIframe('station-detail.html', 'station-detail', {stationId, activeTab: 'playback'});
}

// 下载任务概览
function showDownloadTasksOverview() {
    // 显示所有下载任务的汇总页面
    showToast('跳转到下载任务总览页面', 'info');
    // 这里可以实现一个专门的下载任务管理页面
    createDownloadTasksOverviewModal();
}

// 告警信息概览
function showAlertsOverview() {
    // 显示所有告警信息的汇总页面
    showToast('查看今日告警信息', 'info');
    createAlertsOverviewModal();
}

// 显示指定场站的下载管理
function showStationDownloads(stationId) {
    // 跳转到对应场站的下载任务选项卡
    loadPageWithIframe('station-detail.html', 'station-detail', {stationId, activeTab: 'downloads'});
    showToast(`跳转到 ${stationId} 场站的下载管理`, 'info');
}

// 下载文件
function downloadFile(filename) {
    showToast(`开始下载文件: ${filename}`, 'success');
    // 这里实现实际的文件下载逻辑
    console.log('下载文件:', filename);
}

// 创建下载任务概览弹窗
function createDownloadTasksOverviewModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div class="p-6 border-b">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-gray-900">
                        <i class="fas fa-download text-purple-600 mr-2"></i>下载任务管理
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-6 overflow-y-auto max-h-[70vh]">
                <!-- 任务状态统计 -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-clock text-blue-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-blue-600">进行中</p>
                                <p class="text-xl font-semibold text-blue-800">2</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-check-circle text-green-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-green-600">已完成</p>
                                <p class="text-xl font-semibold text-green-800">8</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-exclamation-circle text-red-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-red-600">失败</p>
                                <p class="text-xl font-semibold text-red-800">1</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-list text-gray-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-gray-600">总计</p>
                                <p class="text-xl font-semibold text-gray-800">11</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 任务列表 -->
                <div class="space-y-4">
                    ${generateDownloadTaskList()}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

// 创建告警信息概览弹窗
function createAlertsOverviewModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div class="p-6 border-b">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold text-gray-900">
                        <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>今日告警信息
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>
            <div class="p-6 overflow-y-auto max-h-[70vh]">
                <!-- 告警统计 -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-fire text-red-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-red-600">火情预警</p>
                                <p class="text-xl font-semibold text-red-800">1</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-hdd text-yellow-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-yellow-600">存储告警</p>
                                <p class="text-xl font-semibold text-yellow-800">1</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-camera text-blue-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-blue-600">设备异常</p>
                                <p class="text-xl font-semibold text-blue-800">0</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-list text-gray-600 mr-3"></i>
                            <div>
                                <p class="text-sm text-gray-600">今日总计</p>
                                <p class="text-xl font-semibold text-gray-800">2</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 告警列表 -->
                <div class="space-y-4">
                    <h3 class="text-lg font-medium text-gray-900 mb-3">详细告警信息</h3>
                    ${generateAlertsList()}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

// 生成下载任务列表
function generateDownloadTaskList() {
    const tasks = [
        {
            id: 'DT001',
            stationId: 'YKC001',
            stationName: '测试场站',
            cameraId: 'cam01',
            cameraName: '摄像头-01',
            timeRange: '2024-05-29 14:00-14:30',
            fileSize: '2.1GB',
            status: 'downloading',
            progress: 78,
            createTime: '2024-05-29 14:35',
            completeTime: null
        },
        {
            id: 'DT002',
            stationId: 'YFY002',
            stationName: '测试场站2',
            cameraId: 'cam03',
            cameraName: '摄像头-03',
            timeRange: '2024-05-29 10:00-10:45',
            fileSize: '3.2GB',
            status: 'downloading',
            progress: 45,
            createTime: '2024-05-29 13:20',
            completeTime: null
        },
        {
            id: 'DT003',
            stationId: 'CDK003',
            stationName: '测试场站3',
            cameraId: 'cam02',
            cameraName: '摄像头-02',
            timeRange: '2024-05-29 09:15-09:45',
            fileSize: '1.8GB',
            status: 'completed',
            progress: 100,
            createTime: '2024-05-29 09:50',
            completeTime: '2024-05-29 15:32'
        },
        {
            id: 'DT004',
            stationId: 'HSC004',
            stationName: '测试场站4',
            cameraId: 'cam05',
            cameraName: '摄像头-05',
            timeRange: '2024-05-28 16:00-17:00',
            fileSize: '4.5GB',
            status: 'completed',
            progress: 100,
            createTime: '2024-05-28 17:05',
            completeTime: '2024-05-28 20:15'
        },
        {
            id: 'DT005',
            stationId: 'YKC001',
            stationName: '测试场站',
            cameraId: 'cam02',
            cameraName: '摄像头-02',
            timeRange: '2024-05-28 11:30-12:00',
            fileSize: '2.8GB',
            status: 'failed',
            progress: 0,
            createTime: '2024-05-28 12:05',
            completeTime: null,
            errorMsg: '网络连接超时'
        }
    ];

    return tasks.map(task => {
        const statusConfig = {
            downloading: { 
                color: 'blue', 
                icon: 'fa-download', 
                text: '下载中',
                bgClass: 'bg-blue-50 border-blue-200',
                textClass: 'text-blue-800'
            },
            completed: { 
                color: 'green', 
                icon: 'fa-check-circle', 
                text: '已完成',
                bgClass: 'bg-green-50 border-green-200',
                textClass: 'text-green-800'
            },
            failed: { 
                color: 'red', 
                icon: 'fa-exclamation-circle', 
                text: '失败',
                bgClass: 'bg-red-50 border-red-200',
                textClass: 'text-red-800'
            }
        };

        const config = statusConfig[task.status];
        
        return `
            <div class="border ${config.bgClass} rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="goToStationDownloads('${task.stationId}')">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <h4 class="text-sm font-medium text-gray-900">${task.stationName} - ${task.cameraName}</h4>
                            <span class="px-2 py-1 bg-${config.color}-100 ${config.textClass} text-xs rounded-full border border-${config.color}-200">
                                <i class="fas ${config.icon} mr-1"></i>${config.text}
                            </span>
                        </div>
                        <p class="text-xs text-gray-600 mb-1">时间段: ${task.timeRange} | 文件大小: ${task.fileSize}</p>
                        <p class="text-xs text-gray-500">创建时间: ${task.createTime}</p>
                        ${task.completeTime ? `<p class="text-xs text-gray-500">完成时间: ${task.completeTime}</p>` : ''}
                        ${task.errorMsg ? `<p class="text-xs text-red-600">错误信息: ${task.errorMsg}</p>` : ''}
                        
                        ${task.status === 'downloading' ? `
                            <div class="flex items-center space-x-2 mt-2">
                                <div class="flex-1 bg-white rounded-full h-2 border">
                                    <div class="bg-${config.color}-600 h-2 rounded-full" style="width: ${task.progress}%"></div>
                                </div>
                                <span class="text-xs ${config.textClass} font-medium">${task.progress}%</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="ml-4 flex items-center space-x-2">
                        ${task.status === 'completed' ? `
                            <button onclick="event.stopPropagation(); downloadFile('${task.stationId}_${task.cameraId}_${task.timeRange.replace(/[:\s-]/g, '')}.mp4')" 
                                    class="text-green-600 hover:text-green-800" title="下载文件">
                                <i class="fas fa-download"></i>
                            </button>
                        ` : ''}
                        ${task.status === 'failed' ? `
                            <button onclick="event.stopPropagation(); retryDownload('${task.id}')" 
                                    class="text-blue-600 hover:text-blue-800" title="重新下载">
                                <i class="fas fa-redo"></i>
                            </button>
                        ` : ''}
                        <i class="fas fa-building text-gray-400 text-sm" title="前往场站"></i>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 生成告警信息列表
function generateAlertsList() {
    const alerts = [
        {
            id: 'AL001',
            stationId: 'YKC001',
            stationName: '测试场站',
            cameraId: 'cam02',
            cameraName: '摄像头-02 (充电区域)',
            type: 'fire_warning',
            typeName: '火情预警',
            level: 'high',
            levelName: '高危',
            description: '检测到疑似火情，请立即检查',
            time: '2024-05-29 11:42:15',
            status: 'pending',
            statusName: '待处理',
            imageUrl: 'alert_image_001.jpg'
        },
        {
            id: 'AL002',
            stationId: 'CDK003',
            stationName: '测试场站3',
            cameraId: null,
            cameraName: '系统监控',
            type: 'storage_warning',
            typeName: '存储告警',
            level: 'medium',
            levelName: '中危',
            description: '存储空间使用率超过95%，建议及时清理',
            time: '2024-05-29 14:30:22',
            status: 'pending',
            statusName: '待处理',
            imageUrl: null
        }
    ];

    return alerts.map(alert => {
        const levelConfig = {
            high: { 
                color: 'red', 
                icon: 'fa-exclamation-triangle',
                bgClass: 'bg-red-50 border-red-200',
                textClass: 'text-red-800'
            },
            medium: { 
                color: 'yellow', 
                icon: 'fa-exclamation-circle',
                bgClass: 'bg-yellow-50 border-yellow-200',
                textClass: 'text-yellow-800'
            },
            low: { 
                color: 'blue', 
                icon: 'fa-info-circle',
                bgClass: 'bg-blue-50 border-blue-200',
                textClass: 'text-blue-800'
            }
        };

        const typeIcons = {
            fire_warning: 'fa-fire',
            storage_warning: 'fa-hdd',
            device_error: 'fa-camera',
            network_error: 'fa-wifi'
        };

        const config = levelConfig[alert.level];
        const typeIcon = typeIcons[alert.type] || 'fa-exclamation-circle';
        
        return `
            <div class="border ${config.bgClass} rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="goToStationAlert('${alert.stationId}', '${alert.id}')">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <i class="fas ${typeIcon} text-${config.color}-600"></i>
                            <h4 class="text-sm font-medium text-gray-900">${alert.typeName}</h4>
                            <span class="px-2 py-1 bg-${config.color}-100 ${config.textClass} text-xs rounded-full border border-${config.color}-200">
                                ${alert.levelName}
                            </span>
                            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                ${alert.statusName}
                            </span>
                        </div>
                        
                        <div class="space-y-1 mb-3">
                            <p class="text-sm text-gray-800 font-medium">${alert.description}</p>
                            <p class="text-xs text-gray-600">
                                <i class="fas fa-building mr-1"></i>${alert.stationName}
                                ${alert.cameraName ? `| <i class="fas fa-video ml-2 mr-1"></i>${alert.cameraName}` : ''}
                            </p>
                            <p class="text-xs text-gray-500">
                                <i class="fas fa-clock mr-1"></i>发生时间: ${alert.time}
                            </p>
                        </div>
                        
                        ${alert.imageUrl ? `
                            <div class="mb-2">
                                <img src="${alert.imageUrl}" alt="告警截图" class="w-20 h-20 object-cover rounded border" 
                                     onerror="this.style.display='none'">
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="ml-4 flex flex-col items-center space-y-2">
                        <button onclick="event.stopPropagation(); handleAlert('${alert.id}')" 
                                class="text-blue-600 hover:text-blue-800 text-sm" title="处理告警">
                            <i class="fas fa-check-circle"></i>
                        </button>
                        <button onclick="event.stopPropagation(); viewAlertDetail('${alert.id}')" 
                                class="text-gray-600 hover:text-gray-800 text-sm" title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                        <i class="fas fa-building text-gray-400 text-sm" title="前往场站"></i>
                        <i class="fas fa-chevron-right text-gray-400"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 关闭弹窗
function closeModal() {
    const modal = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    if (modal) {
        modal.remove();
    }
}

// 前往场站下载管理
function goToStationDownloads(stationId) {
    closeModal();
    showStationDownloads(stationId);
}

// 重试下载
function retryDownload(taskId) {
    showToast(`重新启动下载任务: ${taskId}`, 'info');
    // 这里实现重新下载的逻辑
}

// 前往场站告警详情
function goToStationAlert(stationId, alertId) {
    closeModal();
    showToast(`跳转到 ${stationId} 场站的智能预警管理`, 'info');
    // 跳转到场站详情页面的告警管理选项卡
    loadPageWithIframe('station-detail.html', 'station-detail', {
        stationId: stationId, 
        activeTab: 'alerts',
        alertId: alertId
    });
}

// 处理告警
function handleAlert(alertId) {
    showToast(`标记告警 ${alertId} 为已处理`, 'success');
    // 这里实现告警处理逻辑
    console.log('处理告警:', alertId);
}

// 查看告警详情
function viewAlertDetail(alertId) {
    showToast(`查看告警 ${alertId} 的详细信息`, 'info');
    // 这里可以实现告警详情查看功能
    console.log('查看告警详情:', alertId);
}

// 使用iframe加载页面
function loadPageWithIframe(filename, pageId, params = {}) {
    try {
        showToast('正在加载页面...', 'info');
        
        const pageContainer = document.getElementById('page-container');
        
        // 创建iframe容器 - 去掉外层滚动条
        const iframeWrapper = document.createElement('div');
        iframeWrapper.className = 'w-full h-full overflow-hidden';
        
        // 创建iframe
        const iframe = document.createElement('iframe');
        iframe.src = filename;
        iframe.className = 'w-full h-full border-0';
        iframe.style.height = '100%';
        iframe.style.overflow = 'auto';
        iframe.scrolling = 'yes'; // 确保iframe内部可以滚动
        
        // iframe加载完成后的处理
        iframe.onload = function() {
            try {
                // 向iframe传递参数 - 增加延迟确保iframe内部JavaScript准备好
                if (iframe.contentWindow && params) {
                    setTimeout(() => {
                        iframe.contentWindow.postMessage({
                            type: 'pageParams',
                            params: params
                        }, '*');
                        console.log('发送页面参数到iframe:', params);
                    }, 200); // 增加延迟确保iframe内部脚本已加载
                }
                showToast('页面加载成功！', 'success');
            } catch (error) {
                console.log('跨域限制，无法传递参数:', error);
            }
        };
        
        // iframe加载错误处理
        iframe.onerror = function() {
            showToast('页面加载失败，请检查文件是否存在', 'error');
            showFallbackPage(pageId, params);
        };
        
        iframeWrapper.appendChild(iframe);
        pageContainer.innerHTML = '';
        pageContainer.appendChild(iframeWrapper);
        pageContainer.className = 'page h-full overflow-hidden';
        
        // 隐藏默认页面
        document.getElementById('video-monitor').style.display = 'none';
        pageContainer.style.display = 'block';
        
        currentPage = pageId;
        
    } catch (error) {
        console.error('创建iframe失败:', error);
        showToast('页面加载失败', 'error');
        showFallbackPage(pageId, params);
    }
}

// 降级显示页面
function showFallbackPage(pageId, params) {
    const pageContainer = document.getElementById('page-container');
    
    if (pageId === 'merchant-dashboard') {
        pageContainer.innerHTML = getMerchantDashboardHTML();
    } else if (pageId === 'operation-dashboard') {
        pageContainer.innerHTML = getOperationDashboardHTML();
    } else if (pageId === 'station-detail') {
        pageContainer.innerHTML = getStationDetailHTML(params.stationId);
    }
    
    pageContainer.className = 'page';
    document.getElementById('video-monitor').style.display = 'none';
    pageContainer.style.display = 'block';
    currentPage = pageId;
    
    // 初始化相关功能
    if (pageId === 'operation-dashboard') {
        initStatusChart();
    }
}

// 返回主页
function goHome() {
    document.getElementById('page-container').style.display = 'none';
    document.getElementById('video-monitor').style.display = 'block';
    currentPage = 'video-monitor';
}

// 页面初始化函数
function initMerchantDashboard(params) {
    // 初始化商户看板
    console.log('初始化商户看板');
}

function initOperationDashboard(params) {
    // 初始化运维看板
    console.log('初始化运维看板');
    initStatusChart();
}

function initStationDetail(params) {
    // 初始化场站详情
    console.log('初始化场站详情:', params.stationId);
}

function initRealTimeMonitor(params) {
    // 初始化实时监控
    console.log('初始化实时监控:', params.stationId);
}

function initHistoricalPlayback(params) {
    // 初始化历史回放
    console.log('初始化历史回放:', params.stationId);
}

// ECharts图表初始化
function initStatusChart() {
    setTimeout(() => {
        const chartDom = document.getElementById('status-chart');
        if (chartDom) {
            const myChart = echarts.init(chartDom);
            const option = {
                title: {
                    text: '设备在线状态'
                },
                tooltip: {},
                xAxis: {
                    data: ['在线设备', '离线设备', '异常设备']
                },
                yAxis: {},
                series: [{
                    name: '数量',
                    type: 'bar',
                    data: [85, 3, 2],
                    itemStyle: {
                        color: function(params) {
                            const colors = ['#10b981', '#ef4444', '#f59e0b'];
                            return colors[params.dataIndex];
                        }
                    }
                }]
            };
            myChart.setOption(option);
        }
    }, 100);
}

// HTML生成函数 - 商户看板
function getMerchantDashboardHTML() {
    return `
    <div class="merchant-dashboard">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">我的场站</h1>
                <p class="text-gray-600">管理您的充电场站视频监控设备</p>
            </div>
            <button onclick="goHome()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                <i class="fas fa-arrow-left mr-2"></i>返回
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-building text-blue-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">管理场站</p>
                        <p class="text-2xl font-semibold text-gray-900">5</p>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-video text-green-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">在线摄像头</p>
                        <p class="text-2xl font-semibold text-gray-900">18/20</p>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-exclamation-triangle text-yellow-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">今日告警</p>
                        <p class="text-2xl font-semibold text-gray-900">2</p>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-download text-purple-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">下载任务</p>
                        <p class="text-2xl font-semibold text-gray-900">3</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow">
            <div class="p-6 border-b">
                <h2 class="text-lg font-semibold text-gray-900">场站列表</h2>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${getStationCards()}
                </div>
            </div>
        </div>
    </div>`;
}

// HTML生成函数 - 运维看板
function getOperationDashboardHTML() {
    return `
    <div class="operation-dashboard">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">运维监控中心</h1>
                <p class="text-gray-600">全局监控视频监控系统运行状态</p>
            </div>
            <button onclick="goHome()" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                <i class="fas fa-arrow-left mr-2"></i>返回
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-building text-blue-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">管理场站</p>
                        <p class="text-2xl font-semibold text-gray-900">25</p>
                        <p class="text-xs text-green-600">+2 本月新增</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-video text-green-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">在线摄像头</p>
                        <p class="text-2xl font-semibold text-gray-900">85/90</p>
                        <p class="text-xs text-green-600">94.4% 在线率</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-exclamation-triangle text-red-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">系统告警</p>
                        <p class="text-2xl font-semibold text-gray-900">8</p>
                        <p class="text-xs text-red-600">需要处理</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-hdd text-yellow-600"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-600">存储使用率</p>
                        <p class="text-2xl font-semibold text-gray-900">72%</p>
                        <p class="text-xs text-yellow-600">预计30天满</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">设备在线状态</h3>
                <div id="status-chart" style="height: 300px;"></div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">近期系统告警</h3>
                <div class="space-y-3">
                    ${getAlertList()}
                </div>
            </div>
        </div>

        <div class="bg-white rounded-lg shadow">
            <div class="p-6 border-b">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-gray-900">场站状态总览</h2>
                    <div class="flex space-x-2">
                        <button class="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                            <i class="fas fa-sync-alt mr-1"></i>刷新
                        </button>
                        <button class="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600">
                            <i class="fas fa-filter mr-1"></i>筛选
                        </button>
                    </div>
                </div>
            </div>
            <div class="overflow-x-auto">
                ${getStationTable()}
            </div>
        </div>
    </div>`;
}

// HTML生成函数 - 场站详情
function getStationDetailHTML(stationId) {
    return `<div class="text-center py-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">场站详情页</h2>
        <p class="text-gray-600">场站ID: ${stationId}</p>
        <button onclick="goHome()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            返回首页
        </button>
    </div>`;
}

// 辅助函数 - 生成场站卡片
function getStationCards() {
    const stations = [
        { id: 'YKC001', name: 'YKC测试桩', cameras: '4/4', location: '四川省成都市', storage: '75%', status: 'normal' },
        { id: 'YFY002', name: 'YFY测试桩', cameras: '5/5', location: '四川省成都市', storage: '82%', status: 'normal' },
        { id: 'CDK003', name: '充电卡测试桩', cameras: '7/8', location: '四川省成都市', storage: '95%', status: 'warning' },
        { id: 'HSC004', name: '黑色充电测试桩', cameras: '9/9', location: '四川省成都市', storage: '68%', status: 'normal' },
        { id: 'XHTEST005', name: '1号桩', cameras: '3/3', location: '北京市市辖区', storage: '45%', status: 'normal' }
    ];

    return stations.map(station => `
        <div class="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer" onclick="showStationDetail('${station.id}')">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-medium text-gray-900">${station.name}</h3>
                <span class="px-2 py-1 bg-${station.status === 'normal' ? 'green' : 'yellow'}-100 text-${station.status === 'normal' ? 'green' : 'yellow'}-800 text-xs rounded-full">
                    ${station.status === 'normal' ? '正常' : '告警'}
                </span>
            </div>
            <div class="space-y-2 text-sm text-gray-600">
                <div class="flex justify-between">
                    <span>摄像头:</span>
                    <span class="text-${station.status === 'normal' ? 'green' : 'red'}-600">${station.cameras} 在线</span>
                </div>
                <div class="flex justify-between">
                    <span>位置:</span>
                    <span>${station.location}</span>
                </div>
                <div class="flex justify-between">
                    <span>存储空间:</span>
                    <span${station.status === 'warning' ? ' class="text-red-600"' : ''}>${station.storage} 已用</span>
                </div>
            </div>
            <div class="mt-4 flex space-x-2">
                <button onclick="event.stopPropagation(); showRealTimeMonitor('${station.id}')" class="flex-1 bg-blue-500 text-white px-3 py-2 text-sm rounded hover:bg-blue-600">
                    <i class="fas fa-eye mr-1"></i>实时监控
                </button>
                <button onclick="event.stopPropagation(); showHistoricalPlayback('${station.id}')" class="flex-1 bg-gray-500 text-white px-3 py-2 text-sm rounded hover:bg-gray-600">
                    <i class="fas fa-history mr-1"></i>历史回放
                </button>
            </div>
        </div>
    `).join('');
}

// 辅助函数 - 生成告警列表
function getAlertList() {
    return `
        <div class="flex items-center p-3 bg-red-50 border-l-4 border-red-400 rounded">
            <i class="fas fa-exclamation-circle text-red-500 mr-3"></i>
            <div class="flex-1">
                <p class="text-sm font-medium text-red-800">充电卡测试桩 - 存储空间不足</p>
                <p class="text-xs text-red-600">2024-05-29 14:30</p>
            </div>
            <button class="text-red-600 hover:text-red-800">
                <i class="fas fa-external-link-alt"></i>
            </button>
        </div>
        
        <div class="flex items-center p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <i class="fas fa-camera text-yellow-500 mr-3"></i>
            <div class="flex-1">
                <p class="text-sm font-medium text-yellow-800">充电卡测试桩 - 摄像头离线</p>
                <p class="text-xs text-yellow-600">2024-05-29 13:15</p>
            </div>
            <button class="text-yellow-600 hover:text-yellow-800">
                <i class="fas fa-external-link-alt"></i>
            </button>
        </div>
        
        <div class="flex items-center p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <i class="fas fa-fire text-blue-500 mr-3"></i>
            <div class="flex-1">
                <p class="text-sm font-medium text-blue-800">YKC测试桩 - 智能预警：疑似火情</p>
                <p class="text-xs text-blue-600">2024-05-29 11:42</p>
            </div>
            <button class="text-blue-600 hover:text-blue-800">
                <i class="fas fa-external-link-alt"></i>
            </button>
        </div>
        
        <div class="flex items-center p-3 bg-gray-50 border-l-4 border-gray-400 rounded">
            <i class="fas fa-network-wired text-gray-500 mr-3"></i>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">系统维护 - 例行检查完成</p>
                <p class="text-xs text-gray-600">2024-05-29 09:00</p>
            </div>
            <button class="text-gray-600 hover:text-gray-800">
                <i class="fas fa-external-link-alt"></i>
            </button>
        </div>
    `;
}

// 辅助函数 - 生成场站表格
function getStationTable() {
    return `
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">场站名称</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">位置</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">摄像头状态</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">存储使用</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <i class="fas fa-building text-gray-400 mr-2"></i>
                            <span class="text-sm font-medium text-gray-900">YKC测试桩</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">四川省成都市</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="text-sm text-green-600">4/4 在线</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="w-24 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: 75%"></div>
                        </div>
                        <span class="text-xs text-gray-500 mt-1">75%</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">正常</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="showStationDetail('YKC001')" class="text-blue-600 hover:text-blue-900 mr-3">详情</button>
                        <button onclick="showRealTimeMonitor('YKC001')" class="text-green-600 hover:text-green-900">监控</button>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

// 工具函数
function formatDateTime(date) {
    return date.toLocaleString('zh-CN');
}

function showToast(message, type = 'info') {
    // 简单的消息提示
    console.log(`${type.toUpperCase()}: ${message}`);
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('视频监控系统初始化完成');
    
    // 监听来自iframe的消息
    window.addEventListener('message', function(event) {
        console.log('接收到iframe消息:', event.data);
        
        if (event.data.type === 'navigation') {
            const action = event.data.action;
            const params = event.data.params || {};
            
            // 根据动作执行相应的导航
            switch (action) {
                case 'goHome':
                    goHome();
                    break;
                case 'showStationDetail':
                    showStationDetail(params.stationId);
                    break;
                case 'showRealTimeMonitor':
                    showRealTimeMonitor(params.stationId);
                    break;
                case 'showHistoricalPlayback':
                    showHistoricalPlayback(params.stationId);
                    break;
                case 'showDownloadTasksOverview':
                    showDownloadTasksOverview();
                    break;
                case 'showAlertsOverview':
                    showAlertsOverview();
                    break;
                case 'goToStationAlert':
                    goToStationAlert(params.stationId, params.alertId);
                    break;
                default:
                    console.log('未知的导航动作:', action);
            }
        } else if (event.data.type === 'action') {
            const action = event.data.action;
            const params = event.data.params || {};
            
            // 处理其他操作
            switch (action) {
                case 'downloadFile':
                    downloadFile(params.filename);
                    break;
                case 'retryDownload':
                    retryDownload(params.taskId);
                    break;
                default:
                    console.log('未知的操作:', action);
            }
        }
    });
}); 