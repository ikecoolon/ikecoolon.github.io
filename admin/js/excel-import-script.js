function initExcelImport() {
  var C = window.PetAdminCommon;
  var store = C.store();

  var STATUS_LABELS = {
    success: '成功',
    partial: '局部异常',
    failed: '关键失败',
    duplicate: '重复阻断'
  };

  var directedTestRecordId = sessionStorage.getItem('pet-admin-excel-tr') || null;
  var directedRecord = null;
  if (directedTestRecordId) {
    directedRecord = (store.getState().testRecords || []).find(function (tr) {
      return tr.id === directedTestRecordId;
    }) || null;
    if (!directedRecord) {
      sessionStorage.removeItem('pet-admin-excel-tr');
      directedTestRecordId = null;
    }
  }

  var wizard = { step: 1, files: [], batchResult: null, directedTestRecordId: directedTestRecordId };

  var fileInput = document.getElementById('file-input');
  var dropZone = document.getElementById('drop-zone');
  var fileQueueWrap = document.getElementById('file-queue-wrap');
  var fileQueue = document.getElementById('file-queue');
  var fileQueueCount = document.getElementById('file-queue-count');
  var btnStartImport = document.getElementById('btn-start-import');
  var directedBanner = document.getElementById('directed-target-banner');
  var importIntro = document.getElementById('import-intro-text');

  function renderDirectedBanner() {
    if (!directedRecord) {
      directedBanner.classList.add('hidden');
      directedBanner.innerHTML = '';
      fileInput.multiple = true;
      btnStartImport.innerHTML = '<i class="fas fa-play mr-1"></i>开始批量导入';
      importIntro.textContent = '每个 Excel 文件对应一只宠物的一次检测。系统仅解析已知模板，逐文件独立处理；成功或局部异常将生成报告草稿并进入报告中心处理流程。';
      return;
    }

    var state = store.getState();
    var user = C.lookupUser(state, directedRecord.userId);
    var pet = C.lookupPet(state, directedRecord.petId);
    var st = C.lookupStore(state, directedRecord.storeId);
    var isRetry = directedRecord.status === 'import_failed';
    directedBanner.classList.remove('hidden');
    directedBanner.innerHTML =
      '<p class="font-medium"><i class="fas fa-bullseye mr-1"></i>定向导入目标送检记录：' + C.escapeHtml(directedRecord.id) + '</p>' +
      '<p class="mt-1">用户 ' + C.escapeHtml(user ? user.name : '—') + ' · 宠物 ' + C.escapeHtml(pet ? pet.name : '—') +
      ' · 样本 ' + C.escapeHtml(directedRecord.sampleNumber || '—') + ' · 送检日 ' + C.escapeHtml(directedRecord.testDate || '—') +
      (st ? ' · ' + C.escapeHtml(st.name) : '') + '</p>' +
      '<p class="mt-1 text-teal-800">成功导入后将复用该送检记录并生成唯一报告草稿，不会产生重复记录。</p>' +
      '<button type="button" id="btn-clear-directed" class="mt-2 text-xs text-teal-700 underline">取消定向，改为批量导入</button>';

    fileInput.multiple = false;
    btnStartImport.innerHTML = '<i class="fas fa-play mr-1"></i>' + (isRetry ? '重新导入' : '导入结果');
    importIntro.textContent = isRetry
      ? '针对上方送检记录重新导入 Excel 结果；关键失败时记录保持待导入结果。'
      : '针对上方待导入结果送检记录导入 Excel；仅允许选择一个文件。';

    var clearBtn = document.getElementById('btn-clear-directed');
    if (clearBtn) {
      clearBtn.onclick = function () {
        sessionStorage.removeItem('pet-admin-excel-tr');
        directedTestRecordId = null;
        directedRecord = null;
        wizard.directedTestRecordId = null;
        wizard.files = [];
        renderQueue();
        renderDirectedBanner();
      };
    }
  }

  document.getElementById('btn-download-template').onclick = downloadTemplate;
  document.getElementById('btn-clear-queue').onclick = clearQueue;
  btnStartImport.onclick = startImport;
  document.getElementById('btn-go-unassigned').onclick = function () {
    C.navigate('report-center', { view: 'unassigned' });
  };
  document.getElementById('btn-go-report-center').onclick = function () {
    C.navigate('detection-records');
  };

  document.querySelectorAll('.wizard-back').forEach(function (btn) {
    btn.onclick = function () { goStep(parseInt(btn.dataset.to, 10)); };
  });

  fileInput.addEventListener('change', function (e) {
    addUploadedFiles(e.target.files);
    fileInput.value = '';
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    addUploadedFiles(e.dataTransfer.files);
  });

  function inferScenario(fileName) {
    var name = String(fileName || '').toLowerCase();
    if (/重复|dup|duplicate/.test(name)) return 'duplicate';
    if (/失败|fail|缺列|阻断/.test(name)) return 'failure';
    if (/异常|partial|warn|警告/.test(name)) return 'partial';
    return 'success';
  }

  function makeUploadMeta(file, index) {
    var seq = Date.now().toString(36) + '-' + index;
    var scenario = inferScenario(file.name);
    var meta = {
      scenario: scenario,
      fileName: file.name,
      externalReportNumber: 'EXT-UP-' + seq,
      sampleNumber: directedRecord && directedRecord.sampleNumber ? directedRecord.sampleNumber : ('SAMPLE-UP-' + seq),
      _upload: file
    };
    if (scenario === 'duplicate') {
      meta.sourceOrgId = store.DEFAULT_SOURCE_ORG_ID;
      meta.externalReportNumber = 'EXT-2025-001';
      delete meta.sampleNumber;
    }
    if (scenario === 'failure') meta.errorCode = 'MISSING_COLUMN';
    return meta;
  }

  function addUploadedFiles(fileList) {
    if (!fileList || !fileList.length) return;
    if (wizard.directedTestRecordId) {
      wizard.files = [makeUploadMeta(fileList[0], 0)];
    } else {
      Array.prototype.forEach.call(fileList, function (file, idx) {
        wizard.files.push(makeUploadMeta(file, wizard.files.length + idx));
      });
    }
    renderQueue();
  }

  function clearQueue() {
    wizard.files = [];
    renderQueue();
  }

  function removeFile(index) {
    wizard.files.splice(index, 1);
    renderQueue();
  }

  function renderQueue() {
    if (!wizard.files.length) {
      fileQueueWrap.classList.add('hidden');
      btnStartImport.disabled = true;
      fileQueue.innerHTML = '';
      return;
    }

    fileQueueWrap.classList.remove('hidden');
    fileQueueCount.textContent = '（' + wizard.files.length + '）';
    btnStartImport.disabled = false;

    fileQueue.innerHTML = wizard.files.map(function (f, idx) {
      return '<li class="file-queue-item">' +
        '<div class="min-w-0">' +
        '<p class="truncate text-slate-800"><i class="fas fa-file-excel text-emerald-600 mr-1"></i>' + C.escapeHtml(f.fileName) + '</p>' +
        '<p class="text-xs text-slate-500 mt-0.5">待解析</p>' +
        '</div>' +
        (wizard.directedTestRecordId ? '' : '<button type="button" class="remove-file shrink-0" data-index="' + idx + '" title="移除"><i class="fas fa-times"></i></button>') +
        '</li>';
    }).join('');

    fileQueue.querySelectorAll('.remove-file').forEach(function (btn) {
      btn.onclick = function () { removeFile(parseInt(btn.dataset.index, 10)); };
    });
  }

  function startImport() {
    if (!wizard.files.length) {
      C.toast('请先选择文件', 'warning');
      return;
    }

    var payload = wizard.files.map(function (f) {
      return {
        scenario: f.scenario,
        fileName: f.fileName,
        sourceOrgId: f.sourceOrgId,
        externalReportNumber: f.externalReportNumber,
        sampleNumber: f.sampleNumber,
        errorCode: f.errorCode,
        storeId: f.storeId || (directedRecord ? directedRecord.storeId : null)
      };
    });

    var importParams = {
      fileName: wizard.directedTestRecordId
        ? ('定向导入_' + wizard.directedTestRecordId + '.xlsx')
        : ('批量导入批次_' + new Date().toISOString().slice(0, 10) + '.zip'),
      files: payload
    };
    if (wizard.directedTestRecordId) {
      importParams.testRecordId = wizard.directedTestRecordId;
    }

    try {
      var beforeCount = store.getState().testRecords.length;
      wizard.batchResult = store.simulateBatchImport(importParams);
      renderResults();
      goStep(2);

      var okCount = wizard.batchResult.fileResults.filter(function (r) {
        return r.status === 'success' || r.status === 'partial';
      }).length;
      var afterCount = store.getState().testRecords.length;
      if (wizard.directedTestRecordId && okCount) {
        sessionStorage.removeItem('pet-admin-excel-tr');
        C.toast('导入完成：已写入检测结果并生成报告草稿', 'success');
      } else if (okCount) {
        C.toast('导入完成：' + okCount + ' 个文件已生成送检记录与报告草稿', 'success');
      } else if (wizard.directedTestRecordId) {
        C.toast('导入失败，送检记录仍为待导入结果', 'warning');
      } else {
        C.toast('导入完成，无成功文件', 'warning');
      }
      if (wizard.directedTestRecordId && okCount && afterCount === beforeCount) {
        // directed reuse confirmed silently
      }
    } catch (e) {
      C.toast(e.message || '导入失败', 'error');
    }
  }

  function describeResult(row, testRecord) {
    if (row.status === 'duplicate') {
      var dup = row.error || {};
      var ref = dup.existingTestRecordId ? ('已有记录 ' + dup.existingTestRecordId) : '已有记录';
      if (dup.externalReportNumber) return '来源机构 + 外部报告号 ' + dup.externalReportNumber + ' 重复（' + ref + '）';
      if (dup.sampleNumber) return '来源机构 + 样本号 ' + dup.sampleNumber + ' 重复（' + ref + '）';
      return '重复导入已阻断，未新建送检记录或报告';
    }
    if (row.status === 'failed') {
      return '关键异常：' + (row.errorCode || 'MISSING_COLUMN') + '，整份文件失败，未新建送检记录或报告';
    }
    if (row.status === 'partial') {
      return '局部异常已保留，已复用送检记录并生成唯一报告草稿';
    }
    if (testRecord && testRecord.label) return '解析成功，已生成报告草稿';
    return '解析成功，已生成送检记录与报告草稿';
  }

  function renderResults() {
    var result = wizard.batchResult;
    if (!result) return;

    var state = store.getState();
    var batch = (state.importBatches || []).find(function (b) { return b.id === result.batchId; }) || {};
    var successCount = result.fileResults.filter(function (r) { return r.status === 'success' || r.status === 'partial'; }).length;
    var failCount = result.fileResults.length - successCount;

    var batchStatusLabel = batch.status === 'partial' ? '部分成功' : (batch.status === 'failed' ? '全部失败' : '全部成功');
    var batchCls = batch.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
      (batch.status === 'partial' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900');

    document.getElementById('batch-summary').innerHTML =
      '<div class="border rounded-md p-4 text-sm ' + batchCls + '">' +
      '<p class="font-medium"><i class="fas fa-layer-group mr-1"></i>批次 ' + C.escapeHtml(result.batchId) + ' — ' + batchStatusLabel + '</p>' +
      '<p class="mt-1">共 ' + result.fileResults.length + ' 个文件，成功/保留 ' + successCount + '，失败/阻断 ' + failCount + '</p>' +
      '</div>';

    document.getElementById('result-tbody').innerHTML = result.fileResults.map(function (row) {
      var testRecord = row.testRecordId
        ? (state.testRecords || []).find(function (tr) { return tr.id === row.testRecordId; })
        : null;
      var report = testRecord
        ? (state.reports || []).find(function (r) { return r.testRecordId === testRecord.id; })
        : null;
      var extNo = testRecord ? (testRecord.externalReportNumber || '—') : (row.error && row.error.externalReportNumber) || '—';
      var sampleNo = testRecord ? (testRecord.sampleNumber || '—') : (row.error && row.error.sampleNumber) || '—';
      var reportCell = '—';
      if (testRecord) {
        reportCell = C.escapeHtml(testRecord.id);
        if (report) reportCell += '<br><span class="text-slate-500">' + C.escapeHtml(report.reportNumber || report.id) + '</span>';
      }
      return '<tr class="hover:bg-slate-50">' +
        '<td class="px-3 py-2">' +
        '<p class="font-medium text-slate-800">' + C.escapeHtml(row.fileName) + '</p>' +
        '<p class="text-xs text-slate-500 mt-0.5">原文件已归档</p>' +
        '</td>' +
        '<td class="px-3 py-2 font-mono text-xs">' + C.escapeHtml(extNo) + '<br>' + C.escapeHtml(sampleNo) + '</td>' +
        '<td class="px-3 py-2">' + C.statusBadge(row.status, STATUS_LABELS) + '</td>' +
        '<td class="px-3 py-2 text-slate-600">' + C.escapeHtml(describeResult(row, testRecord)) + '</td>' +
        '<td class="px-3 py-2 font-mono text-xs">' + reportCell + '</td>' +
        '</tr>';
    }).join('');
  }

  function downloadTemplate() {
    var csv = '\uFEFF外部报告编号,样本编号,宠物名,放线菌门,拟杆菌门,厚壁菌门,双歧杆菌,Shannon指数\n' +
      'EXT-TPL-001,SAMPLE-TPL-001,小花,22.5,33.1,41.0,8.2,3.45\n';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PET检测导入模板.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    C.toast('模板已下载（可用 Excel 打开）', 'success');
  }

  function goStep(n) {
    wizard.step = n;
    document.querySelectorAll('.wizard-panel').forEach(function (p) { p.classList.add('hidden'); });
    document.getElementById('step-' + n).classList.remove('hidden');
    document.querySelectorAll('.step-pill').forEach(function (pill) {
      pill.classList.toggle('active', parseInt(pill.dataset.step, 10) === n);
    });
  }

  renderDirectedBanner();
}
