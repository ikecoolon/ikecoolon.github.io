'use strict';

var MENU_PAGES = [
  { pageId: 'detection-records', title: '送检管理', selectors: ['.rondo-list-page-title', '.rondo-basic-table-wrap'] },
  { pageId: 'report-center', title: '报告中心', selectors: ['.rondo-list-page-title', '.rondo-basic-table-wrap'] },
  { pageId: 'normal-range-config', title: '指标/参考范围', selectors: ['#nrc-list-view:not(.hidden)', '#nrc-list-mount .rondo-basic-table-wrap'] },
  { pageId: 'microbiota-knowledge', title: '菌群科普', selectors: ['.rondo-page-title', '#mk-tree'] },
  { pageId: 'analysis-rules', title: '分析规则', selectors: ['.rondo-list-page-title', '.rondo-basic-table-wrap'] },
  { pageId: 'user-pets', title: '用户与宠物', selectors: ['#up-seg-users', '#up-users-list-mount:not(.hidden) .rondo-basic-table-wrap'] },
  { pageId: 'dictionary-management', title: '专业基础资料', selectors: ['.rondo-page-title'] }
];

var VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844 },
  { name: '1280-low', width: 1280, height: 520 }
];

var EXTERNAL_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

function isExternalUrl(url) {
  try {
    var host = new URL(url).hostname;
    return EXTERNAL_HOSTS.some(function (h) { return host === h || host.endsWith('.' + h); });
  } catch (e) {
    return false;
  }
}

function isInternalPrototypeUrl(url, baseOrigin) {
  if (!url || url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) return false;
  try {
    var parsed = new URL(url, baseOrigin);
    if (parsed.origin !== baseOrigin) return false;
    return parsed.pathname.indexOf('/prototype/') >= 0 || parsed.pathname.indexOf('/docs/.vuepress/public/prototype/') >= 0;
  } catch (e) {
    return false;
  }
}

module.exports = {
  MENU_PAGES: MENU_PAGES,
  VIEWPORTS: VIEWPORTS,
  EXTERNAL_HOSTS: EXTERNAL_HOSTS,
  isExternalUrl: isExternalUrl,
  isInternalPrototypeUrl: isInternalPrototypeUrl
};
