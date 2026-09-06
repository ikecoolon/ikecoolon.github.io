'use strict';

var path = require('path');

function resolvePlaywrightModule() {
  if (process.env.PLAYWRIGHT_MODULE) {
    return process.env.PLAYWRIGHT_MODULE;
  }
  try {
    return require.resolve('playwright');
  } catch (e) {
    return null;
  }
}

function loadPlaywright() {
  var modPath = resolvePlaywrightModule();
  if (!modPath) {
    var err = new Error(
      '未找到 playwright 模块。请设置 PLAYWRIGHT_MODULE 指向已安装的 playwright 目录，例如：\n' +
      '  PLAYWRIGHT_MODULE="$HOME/.npm/_npx/420ff84f11983ee5/node_modules/playwright" node admin-browser-smoke.js'
    );
    err.code = 'PLAYWRIGHT_NOT_FOUND';
    throw err;
  }
  return require(modPath);
}

module.exports = {
  resolvePlaywrightModule: resolvePlaywrightModule,
  loadPlaywright: loadPlaywright
};
