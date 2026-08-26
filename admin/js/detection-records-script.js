function initDetectionRecords() {
  var C = window.PetAdminCommon;
  var store = C.store();
  var filterEl = document.getElementById('filter-status');
  var searchEl = document.getElementById('search-records');
  var savedFilter = sessionStorage.getItem('pet-admin-detection-filter');
  if (savedFilter && filterEl) {
    filterEl.value = savedFilter;
    sessionStorage.removeItem('pet-admin-detection-filter');
  }

  var unsub = store.subscribe(render);
  window.__petAdminPageTeardown = function () { unsub(); };

  document.getElementById('btn-go-import').onclick = function () {
    C.navigate('excel-import');
  };

  document.getElementById('btn-register-test').onclick = function () {
    var state = store.getState();
    var pet = state.pets.find(function (p) { return p.claimStatus === 'bound'; });
    store.registerTest({ petId: pet ? pet.id : null });
    C.toast('已登记新检测记录', 'success');
  };

  filterEl.addEventListener('change', function () { render(store.getState()); });
  searchEl.addEventListener('input', function () { render(store.getState()); });

  render(store.getState());

  function sampleLabel(type) {
    return type === 'feces' ? '粪便' : type;
  }

  function claimLabel(status) {
    var map = { bound: '已绑定', unclaimed: '待认领', claimed: '认领码', pre_bound: '门店预绑' };
    return map[status] || status;
  }

  function render(state) {
    var statusFilter = filterEl.value;
    var q = (searchEl.value || '').trim().toLowerCase();
    var rows = state.testRecords.filter(function (tr) {
      if (statusFilter && tr.status !== statusFilter) return false;
      if (q && tr.id.toLowerCase().indexOf(q) < 0 && (tr.label || '').toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt); });

    var tbody = document.getElementById('records-tbody');
    var empty = document.getElementById('records-empty');
    if (!rows.length) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    tbody.innerHTML = rows.map(function (tr) {
      var user = C.lookupUser(state, tr.userId);
      var pet = C.lookupPet(state, tr.petId);
      var st = C.lookupStore(state, tr.storeId);
      var report = state.reports.find(function (r) { return r.testRecordId === tr.id; });

      var actions = [];
      if (tr.status === 'pending_result' || tr.status === 'pending_claim') {
        actions.push('<button type="button" class="text-teal-600 hover:underline mr-2" data-action="import" data-id="' + tr.id + '">导入</button>');
      }
      if (tr.status === 'pending_review' && report) {
        actions.push('<button type="button" class="text-teal-600 hover:underline mr-2" data-action="review" data-rid="' + report.id + '">审核</button>');
      }
      if (tr.status === 'published' && report) {
        actions.push('<button type="button" class="text-teal-600 hover:underline" data-action="view" data-rid="' + report.id + '">查看报告</button>');
      }
      if (tr.status === 'import_failed') {
        actions.push('<button type="button" class="text-amber-600 hover:underline" data-action="import" data-id="' + tr.id + '">重新导入</button>');
      }

      return '<tr class="hover:bg-slate-50">' +
        '<td class="px-3 py-2 font-mono text-xs">' + C.escapeHtml(tr.id) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(user ? user.name : '—') + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(pet ? pet.name : '—') + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(st ? st.name : '—') + '</td>' +
        '<td class="px-3 py-2">' + sampleLabel(tr.sampleType) + '</td>' +
        '<td class="px-3 py-2">' + C.escapeHtml(tr.testDate) + '</td>' +
        '<td class="px-3 py-2">' + claimLabel(tr.claimStatus) + '</td>' +
        '<td class="px-3 py-2">' + C.statusBadge(tr.status, C.TEST_STATUS_LABELS) + '</td>' +
        '<td class="px-3 py-2 whitespace-nowrap">' + (actions.join('') || '—') + '</td></tr>';
    }).join('');

    tbody.querySelectorAll('[data-action="import"]').forEach(function (btn) {
      btn.onclick = function () {
        sessionStorage.setItem('pet-admin-excel-tr', btn.dataset.id);
        C.navigate('excel-import');
      };
    });
    tbody.querySelectorAll('[data-action="review"]').forEach(function (btn) {
      btn.onclick = function () {
        C.navigate('report-review', { reportId: btn.dataset.rid });
      };
    });
    tbody.querySelectorAll('[data-action="view"]').forEach(function (btn) {
      btn.onclick = function () {
        C.navigate('published-reports', { reportId: btn.dataset.rid });
      };
    });
  }
}
