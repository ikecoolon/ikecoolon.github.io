function initExcelImport() {
  var C = window.PetAdminCommon;
  var store = C.store();
  var wizard = { step: 1, scenario: null, fileName: '', testRecordId: null, previewRows: [], warnings: [], blocked: false, result: null, reportId: null };

  var preTr = sessionStorage.getItem('pet-admin-excel-tr');
  if (preTr) sessionStorage.removeItem('pet-admin-excel-tr');

  populateTestRecords();
  if (preTr) {
    var sel = document.getElementById('select-test-record');
    if (sel.querySelector('option[value="' + preTr + '"]')) sel.value = preTr;
  }

  document.getElementById('btn-download-template').onclick = downloadTemplate;

  document.querySelectorAll('.demo-file-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.demo-file-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      wizard.scenario = card.dataset.scenario;
      wizard.fileName = card.querySelector('.font-medium').textContent + '.csv';
      document.getElementById('selected-file-name').textContent = '已选择: ' + wizard.fileName;
      document.getElementById('btn-step1-next').disabled = false;
    });
  });

  document.getElementById('file-input').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    wizard.scenario = 'success_warn';
    wizard.fileName = f.name;
    document.getElementById('selected-file-name').textContent = '已上传: ' + f.name;
    document.getElementById('btn-step1-next').disabled = false;
    document.querySelectorAll('.demo-file-card').forEach(function (c) { c.classList.remove('selected'); });
  });

  document.getElementById('select-test-record').addEventListener('change', function () {
    wizard.testRecordId = this.value || null;
  });

  document.getElementById('btn-step1-next').onclick = function () {
    wizard.testRecordId = document.getElementById('select-test-record').value || null;
    if (!wizard.scenario) {
      C.toast('请选择演示文件或上传文件', 'warning');
      return;
    }
    buildPreview();
    goStep(2);
  };

  document.getElementById('btn-step2-next').onclick = function () {
    if (wizard.blocked) {
      C.toast('解析失败，无法继续', 'error');
      return;
    }
    renderMapping();
    goStep(3);
  };

  document.getElementById('btn-step3-next').onclick = function () {
    if (wizard.blocked) {
      goStep(4);
      renderResult();
      return;
    }
    executeImport();
    goStep(4);
    renderResult();
  };

  document.querySelectorAll('.wizard-back').forEach(function (btn) {
    btn.onclick = function () { goStep(parseInt(btn.dataset.to, 10)); };
  });

  document.getElementById('btn-generate-draft').onclick = function () {
    if (!wizard.result || !wizard.result.testRecordId) return;
    try {
      store.generateReport({
        testRecordId: wizard.result.testRecordId,
        summary: store.DEMO_LABEL + ' Excel 导入生成草稿'
      });
      var genState = store.getState();
      var report = genState.reports.filter(function (r) {
        return r.testRecordId === wizard.result.testRecordId;
      }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); })[0];
      if (!report) throw new Error('报告生成失败');
      wizard.reportId = report.id;
      C.toast('报告草稿已生成: ' + report.reportNumber, 'success');
      document.getElementById('btn-generate-draft').classList.add('hidden');
      document.getElementById('btn-submit-review').classList.remove('hidden');
    } catch (e) {
      C.toast(e.message, 'error');
    }
  };

  document.getElementById('btn-submit-review').onclick = function () {
    if (!wizard.reportId) return;
    store.submitReport(wizard.reportId);
    C.toast('已提交审核', 'success');
    document.getElementById('btn-submit-review').classList.add('hidden');
    document.getElementById('btn-go-review').classList.remove('hidden');
  };

  document.getElementById('btn-go-review').onclick = function () {
    C.navigate('report-review', { reportId: wizard.reportId });
  };

  function populateTestRecords() {
    var state = store.getState();
    var sel = document.getElementById('select-test-record');
    var opts = '<option value="">— 新建检测记录 —</option>';
    state.testRecords.forEach(function (tr) {
      if (tr.status === 'published' && wizard.scenario !== 'duplicate') return;
      opts += '<option value="' + tr.id + '">' + tr.id + ' (' + (C.TEST_STATUS_LABELS[tr.status] || tr.status) + ')</option>';
    });
    sel.innerHTML = opts;
  }

  function downloadTemplate() {
    var csv = '\uFEFF样本编号,宠物名,放线菌门,拟杆菌门,厚壁菌门,双歧杆菌,Shannon指数\n' +
      'SAMPLE-001,小花,22.5,33.1,41.0,8.2,3.45\n';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'PET检测导入模板.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    C.toast('模板已下载（可用 Excel 打开）', 'success');
  }

  function buildPreview() {
    wizard.blocked = false;
    wizard.warnings = [];
    wizard.previewRows = [];

    if (wizard.scenario === 'duplicate') {
      var dupId = wizard.testRecordId || 'tr-004';
      var dupTr = store.getState().testRecords.find(function (t) { return t.id === dupId; });
      if (dupTr && dupTr.importBatchId && dupTr.status === 'published') {
        wizard.blocked = true;
        wizard.previewRows = [];
        document.getElementById('parse-summary').innerHTML =
          '<div class="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-sm">' +
          '<i class="fas fa-ban mr-1"></i>重复导入：检测 ' + dupId + ' 已成功导入并发布，不可重复导入。</div>';
        document.getElementById('preview-table').innerHTML = '';
        document.getElementById('btn-step2-next').disabled = true;
        return;
      }
    }

    document.getElementById('btn-step2-next').disabled = false;

    if (wizard.scenario === 'failure') {
      wizard.blocked = true;
      wizard.previewRows = [
        { row: 1, col: '样本编号', value: 'SAMPLE-X', ok: true },
        { row: 2, col: '放线菌门', value: '(缺列)', ok: false, code: 'MISSING_COLUMN' },
        { row: 5, col: '双歧杆菌', value: '', ok: false, code: 'EMPTY' }
      ];
      document.getElementById('parse-summary').innerHTML =
        '<div class="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md text-sm">' +
        '<i class="fas fa-triangle-exclamation mr-1"></i>解析失败：2 处阻断错误，0 行可导入</div>';
    } else {
      wizard.previewRows = [
        { row: 1, col: '放线菌门', value: '22.5', ok: true },
        { row: 1, col: '拟杆菌门', value: '33.1', ok: true },
        { row: 1, col: '厚壁菌门', value: '', ok: false, code: 'EMPTY' },
        { row: 1, col: '双歧杆菌', value: 'ND', ok: false, code: 'NOT_DETECTED' }
      ];
      wizard.warnings = [
        { code: 'EMPTY', message: '厚壁菌门 为空，将标记 EMPTY' },
        { code: 'NOT_DETECTED', message: '双歧杆菌 未检出' }
      ];
      var warnHtml = wizard.warnings.map(function (w) {
        return '<li>' + C.escapeHtml(w.message) + '</li>';
      }).join('');
      document.getElementById('parse-summary').innerHTML =
        '<div class="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-md text-sm">' +
        '<i class="fas fa-circle-info mr-1"></i>解析成功（含警告）<ul class="mt-2 list-disc pl-5">' + warnHtml + '</ul></div>';
    }

    document.getElementById('preview-table').innerHTML =
      '<thead class="bg-slate-50"><tr><th class="px-3 py-1 text-left">行</th><th class="px-3 py-1 text-left">列</th><th class="px-3 py-1 text-left">值</th><th class="px-3 py-1 text-left">状态</th></tr></thead><tbody>' +
      wizard.previewRows.map(function (r) {
        return '<tr><td class="px-3 py-1">' + r.row + '</td><td class="px-3 py-1">' + C.escapeHtml(r.col) + '</td>' +
          '<td class="px-3 py-1">' + C.escapeHtml(r.value) + '</td><td class="px-3 py-1">' +
          (r.ok ? C.statusBadge('success', { success: 'OK' }) : C.statusBadge('failed', { failed: r.code })) + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function renderMapping() {
    var alerts = document.getElementById('mapping-alerts');
    if (wizard.blocked) {
      alerts.innerHTML = '<div class="bg-red-50 text-red-800 p-3 rounded-md text-sm">字段匹配已跳过：存在阻断错误</div>';
      document.getElementById('mapping-tbody').innerHTML = '';
      return;
    }
    alerts.innerHTML = wizard.warnings.map(function (w) {
      return '<div class="bg-amber-50 text-amber-900 px-3 py-2 rounded text-sm"><i class="fas fa-exclamation-triangle mr-1"></i>' + C.escapeHtml(w.message) + '</div>';
    }).join('');

    var mappings = [
      { src: '放线菌门', target: '放线菌门', status: 'PRESENT' },
      { src: '拟杆菌门', target: '拟杆菌门', status: 'PRESENT' },
      { src: '厚壁菌门', target: '厚壁菌门', status: 'EMPTY' },
      { src: '双歧杆菌', target: '双歧杆菌', status: 'NOT_DETECTED' }
    ];
    document.getElementById('mapping-tbody').innerHTML = mappings.map(function (m) {
      return '<tr><td class="px-3 py-2">' + C.escapeHtml(m.src) + '</td><td class="px-3 py-2">' + C.escapeHtml(m.target) + '</td>' +
        '<td class="px-3 py-2">' + C.statusBadge(m.status === 'PRESENT' ? 'published' : 'import_failed', C.DATA_STATUS_LABELS) + ' ' +
        (C.DATA_STATUS_LABELS[m.status] || m.status) + '</td></tr>';
    }).join('');
  }

  function executeImport() {
    var state = store.getState();
    var trId = wizard.testRecordId;
    var petId = null;
    var userId = null;
    var storeId = null;
    if (trId) {
      var tr = state.testRecords.find(function (t) { return t.id === trId; });
      if (tr) {
        petId = tr.petId;
        userId = tr.userId;
        storeId = tr.storeId;
        if (tr.importBatchId && tr.status === 'published') {
          wizard.blocked = true;
          wizard.result = { error: 'duplicate', testRecordId: trId };
          return;
        }
      }
    }

    if (wizard.scenario === 'failure' || wizard.blocked) {
      store.simulateExcelImportFailure({
        testRecordId: trId,
        fileName: wizard.fileName,
        errorCode: 'MISSING_COLUMN',
        errorColumn: '放线菌门'
      });
      var failState = store.getState();
      var failBatch = failState.importBatches[failState.importBatches.length - 1];
      wizard.result = {
        batchId: failBatch.id,
        testRecordId: failBatch.testRecordIds[0],
        failed: true
      };
      return;
    }

    var indicators = [
      { key: '放线菌门', value: 22.5, unit: '%', dataStatus: 'PRESENT' },
      { key: '拟杆菌门', value: 33.1, unit: '%', dataStatus: 'PRESENT' },
      { key: '厚壁菌门', value: null, unit: '%', dataStatus: 'EMPTY' },
      { key: '双歧杆菌', value: null, unit: '%', dataStatus: 'NOT_DETECTED' }
    ];
    store.simulateExcelImportSuccess({
      testRecordId: trId,
      petId: petId,
      userId: userId,
      storeId: storeId,
      fileName: wizard.fileName,
      rows: 4,
      indicators: indicators
    });
    var okState = store.getState();
    var okBatch = okState.importBatches[okState.importBatches.length - 1];
    wizard.result = {
      batchId: okBatch.id,
      testRecordId: okBatch.testRecordIds[0],
      failed: false,
      hasWarnings: true
    };
  }

  function renderResult() {
    var el = document.getElementById('import-result');
    var genBtn = document.getElementById('btn-generate-draft');
    var subBtn = document.getElementById('btn-submit-review');
    var revBtn = document.getElementById('btn-go-review');
    genBtn.classList.add('hidden');
    subBtn.classList.add('hidden');
    revBtn.classList.add('hidden');

    if (!wizard.result) {
      el.innerHTML = '<p class="text-slate-500">未执行导入</p>';
      return;
    }

    if (wizard.result.error === 'duplicate' || (wizard.result.failed && wizard.blocked)) {
      el.innerHTML = '<div class="bg-red-50 border border-red-200 p-4 rounded-md"><p class="font-medium text-red-800">重复导入已阻断</p>' +
        '<p class="text-sm text-red-700 mt-1">该检测记录已有成功导入批次，请选择其他记录或重置演示数据。</p></div>';
      return;
    }

    if (wizard.result.failed) {
      el.innerHTML = '<div class="bg-red-50 border border-red-200 p-4 rounded-md"><p class="font-medium text-red-800"><i class="fas fa-times-circle mr-1"></i>导入失败</p>' +
        '<p class="text-sm mt-1">批次 ' + C.escapeHtml(wizard.result.batchId) + '，检测 ' + C.escapeHtml(wizard.result.testRecordId) + '</p></div>';
      return;
    }

    el.innerHTML = '<div class="bg-emerald-50 border border-emerald-200 p-4 rounded-md"><p class="font-medium text-emerald-800"><i class="fas fa-check-circle mr-1"></i>导入成功（含警告）</p>' +
      '<p class="text-sm mt-1">批次 ' + C.escapeHtml(wizard.result.batchId) + ' → 检测 ' + C.escapeHtml(wizard.result.testRecordId) + '</p>' +
      '<p class="text-xs text-amber-700 mt-2">EMPTY / NOT_DETECTED 指标不会触发商品推荐</p></div>';
    genBtn.classList.remove('hidden');
  }

  function goStep(n) {
    wizard.step = n;
    document.querySelectorAll('.wizard-panel').forEach(function (p) { p.classList.add('hidden'); });
    document.getElementById('step-' + n).classList.remove('hidden');
    document.querySelectorAll('.step-pill').forEach(function (pill) {
      pill.classList.toggle('active', parseInt(pill.dataset.step, 10) === n);
    });
  }
}
