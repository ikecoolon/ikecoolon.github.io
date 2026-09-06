'use strict';

var path = require('path');

function repoRootFromScript(scriptDir) {
  return path.resolve(scriptDir, '../../../../../..');
}

function defaultOutDir(repoRoot) {
  return path.join(repoRoot, '.impeccable/review/pet-eden-admin-20260905/browser-final');
}

function harnessDir(repoRoot) {
  return path.join(repoRoot, '.impeccable/review/pet-eden-admin-20260905/browser-harness');
}

module.exports = {
  repoRootFromScript: repoRootFromScript,
  defaultOutDir: defaultOutDir,
  harnessDir: harnessDir
};
