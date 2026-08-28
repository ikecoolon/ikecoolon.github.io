/* 项目进度管理 · 渲染逻辑
 * 所有统计均从 data.js 计算，页面不散落硬编码数字。
 * seed 2fc4dc8e
 */
(function () {
    'use strict';

    var DATA = window.PROJECT_PROGRESS_DATA;
    var META = DATA.meta;
    var COLS = META.totalWeeks;
    var WEEK_W = 86;
    var TRACK_W = COLS * WEEK_W;

    var STATUS_META = {
        'in-progress': { name: '进行中', defaultOpen: true },
        'waiting': { name: '等待外部条件', defaultOpen: true },
        'not-started': { name: '未开始', defaultOpen: false },
        'done': { name: '已完成', defaultOpen: false }
    };
    var STATUS_ORDER = ['in-progress', 'waiting', 'not-started', 'done'];

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function effectiveStatus(task) {
        return task.progress >= 100 ? 'done' : task.status;
    }

    function clampProgress(value) {
        var n = Math.round(Number(value) || 0);
        return Math.max(0, Math.min(100, n));
    }

    function averageProgress(tasks) {
        if (!tasks.length) return 0;
        var sum = tasks.reduce(function (acc, t) { return acc + clampProgress(t.progress); }, 0);
        return sum / tasks.length;
    }

    function formatPct(value) {
        var rounded = Math.round(value * 10) / 10;
        return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + '%';
    }

    function weekText(task) {
        return task.startWeek === task.endWeek
            ? '第' + task.startWeek + '周'
            : '第' + task.startWeek + '–' + task.endWeek + '周';
    }

    function laneTasks(laneId) {
        return DATA.tasks.filter(function (t) { return t.lane === laneId; });
    }

    function sumWorkdays(tasks) {
        return tasks.reduce(function (acc, t) { return acc + t.workdays; }, 0);
    }

    /* ---------- 最后更新时间：同源 HEAD 读 data.js 的 Last-Modified，失败回退 document.lastModified ---------- */

    function formatCnTime(date) {
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' +
            pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    function renderLastUpdated(date) {
        var time = document.getElementById('last-updated');
        time.textContent = formatCnTime(date);
        time.setAttribute('datetime', date.toISOString());
    }

    function resolveLastUpdated() {
        var fallback = new Date(document.lastModified);
        try {
            return fetch('data.js', { method: 'HEAD', cache: 'no-store' })
                .then(function (res) {
                    var lm = res.headers.get('Last-Modified');
                    var parsed = lm ? new Date(lm) : null;
                    if (parsed && !isNaN(parsed.getTime())) {
                        renderLastUpdated(parsed);
                    } else {
                        renderLastUpdated(fallback);
                    }
                })
                .catch(function () {
                    renderLastUpdated(fallback);
                });
        } catch (err) {
            renderLastUpdated(fallback);
            return Promise.resolve();
        }
    }

    /* ---------- 顶部总控数据带 ---------- */

    function overviewCell(label, value, unit, sub, extraClass, withTrack) {
        var cell = el('div', 'overview-cell' + (extraClass ? ' ' + extraClass : ''));
        cell.appendChild(el('span', 'overview-label', label));
        var valueWrap = el('div');
        var valueNode = el('span', 'overview-value num', String(value));
        valueWrap.appendChild(valueNode);
        if (unit) valueWrap.appendChild(el('span', 'overview-unit', unit));
        cell.appendChild(valueWrap);
        if (sub) cell.appendChild(el('span', 'overview-sub', sub));
        if (withTrack) {
            var track = el('div', 'progress-track');
            var fill = el('i');
            fill.style.width = Math.max(0, Math.min(100, withTrack)) + '%';
            track.appendChild(fill);
            cell.appendChild(track);
        }
        return cell;
    }

    function renderOverview() {
        var base = sumWorkdays(DATA.tasks);
        var buffer = Math.round(base * META.bufferRate);
        var total = base + buffer;
        var overall = averageProgress(DATA.tasks);
        var inProgress = DATA.tasks.filter(function (t) { return effectiveStatus(t) === 'in-progress'; }).length;
        var preIncomplete = DATA.prerequisites.filter(function (p) { return p.status !== 'complete'; }).length;

        var band = document.getElementById('overview-band');
        band.appendChild(overviewCell('基础工作量', base, '人日', '29 条研发任务合计'));
        band.appendChild(overviewCell('人力缓冲', buffer, '人日', '按基础工作量 ' + Math.round(META.bufferRate * 100) + '% 单独计算'));
        band.appendChild(overviewCell('合计工作量', total, '人日', '基础 + 缓冲，缓冲不摊入任务'));
        band.appendChild(overviewCell('总体进度', formatPct(overall), '', '29 条研发任务人工进度简单平均', 'is-green', overall));
        band.appendChild(overviewCell('进行中任务', inProgress, '项', '人工进度实时汇总'));
        band.appendChild(overviewCell('未完成待配合', preIncomplete, '项', '甲方前置事项，不计入进度', 'is-amber'));
    }

    /* ---------- 未完成待配合条带 ---------- */

    function renderAmberStrip() {
        var strip = document.getElementById('amber-strip');
        var incomplete = DATA.prerequisites.filter(function (p) { return p.status !== 'complete'; });
        if (!incomplete.length) {
            strip.classList.add('is-clear');
            strip.appendChild(el('span', 'strip-title', '待配合事项'));
            strip.appendChild(el('span', 'strip-items', '全部已完成，当前无外部前置事项阻塞研发。'));
            return;
        }
        strip.appendChild(el('span', 'strip-title', '待配合事项 ' + incomplete.length + ' 项未完成'));
        var items = el('div', 'strip-items');
        incomplete.forEach(function (p) {
            items.appendChild(el('span', null, p.title + '（期望第' + p.expectedWeek + '周）'));
        });
        strip.appendChild(items);
    }

    /* ---------- 周次排期总控板 ---------- */

    function isBufferWeek(w) {
        return w >= META.bufferStartWeek && w <= META.bufferEndWeek;
    }

    function buildRuler() {
        var row = el('div', 'sch-row sch-ruler');
        row.appendChild(el('div', 'sch-left', '工作线 / 任务'));
        var track = el('div', 'sch-track');
        var cells = el('div', 'ruler-cells');
        for (var w = 1; w <= COLS; w++) {
            var cell = el('div', 'ruler-cell' + (isBufferWeek(w) ? ' is-buffer' : ''));
            cell.appendChild(el('span', 'week-no', '第' + w + '周'));
            if (isBufferWeek(w)) cell.appendChild(el('span', 'week-tag', '20% 缓冲'));
            cells.appendChild(cell);
        }
        track.appendChild(cells);
        row.appendChild(track);
        return row;
    }

    function buildGridCells() {
        var grid = el('div', 'grid-cells');
        grid.setAttribute('aria-hidden', 'true');
        for (var w = 1; w <= COLS; w++) {
            grid.appendChild(el('i', isBufferWeek(w) ? 'is-buffer' : ''));
        }
        return grid;
    }

    function barLeft(week) {
        return (week - 1) * WEEK_W;
    }

    function buildTaskRow(task) {
        var status = effectiveStatus(task);
        var progress = clampProgress(task.progress);

        var row = el('div', 'sch-row task-row');

        var left = el('div', 'sch-left');
        left.appendChild(el('div', 'task-name', task.name));
        var meta = el('div', 'task-meta');
        meta.appendChild(el('span', 'group-tag', task.group.replace('前端 · ', '')));
        meta.appendChild(document.createTextNode(
            task.owner + ' · ' + task.workdays + ' 人日 · ' + weekText(task)
        ));
        left.appendChild(meta);
        row.appendChild(left);

        var track = el('div', 'sch-track');
        track.appendChild(buildGridCells());

        var bar = el('div', 'bar' + (status === 'done' ? ' is-done' : '') + (status === 'waiting' ? ' is-waiting' : ''));
        bar.style.left = barLeft(task.startWeek) + 'px';
        bar.style.width = ((task.endWeek - task.startWeek + 1) * WEEK_W) + 'px';
        bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', task.name + '，' + weekText(task) + '，进度 ' + progress + '%，' + STATUS_META[status].name);
        var fill = el('i');
        fill.style.width = progress + '%';
        bar.appendChild(fill);
        track.appendChild(bar);

        var pct = el('span', 'bar-pct' + (status === 'done' ? ' is-done' : '') + (status === 'waiting' ? ' is-waiting' : ''));
        var labelLeft = barLeft(task.endWeek + 1);
        if (labelLeft > TRACK_W - 110) {
            pct.style.right = (TRACK_W - barLeft(task.startWeek) + 6) + 'px';
        } else {
            pct.style.left = (labelLeft + 6) + 'px';
        }
        pct.textContent = status === 'done' ? '已完成'
            : status === 'waiting' ? '等待外部条件 · ' + progress + '%'
            : progress + '%';
        track.appendChild(pct);

        row.appendChild(track);
        return row;
    }

    function buildPrereqRow(pre) {
        var done = pre.status === 'complete';
        var row = el('div', 'sch-row task-row');

        var left = el('div', 'sch-left ext-left' + (done ? ' is-done' : ''));
        left.appendChild(el('div', 'task-name', pre.title));
        var meta = el('div', 'task-meta');
        meta.textContent = pre.ownerRole + ' · 期望第' + pre.expectedWeek + '周 · ' + (done ? '已完成' : '未完成');
        left.appendChild(meta);
        row.appendChild(left);

        var track = el('div', 'sch-track');
        track.appendChild(buildGridCells());

        var center = barLeft(pre.expectedWeek) + WEEK_W / 2;
        var pin = el('span', 'pin' + (done ? ' is-done' : ''));
        pin.style.left = center + 'px';
        pin.setAttribute('aria-hidden', 'true');
        track.appendChild(pin);

        var label = el('span', 'pin-label' + (done ? ' is-done' : ''), (done ? '已完成' : '待配合') + ' · 第' + pre.expectedWeek + '周');
        if (center > TRACK_W - 120) {
            label.style.right = (TRACK_W - center + 12) + 'px';
        } else {
            label.style.left = (center + 12) + 'px';
        }
        track.appendChild(label);

        row.setAttribute('aria-label', '待配合事项：' + pre.title + '，' + pre.ownerRole + '，期望第' + pre.expectedWeek + '周，' + (done ? '已完成' : '未完成'));
        row.appendChild(track);
        return row;
    }

    function renderSchedule() {
        var host = document.getElementById('schedule');
        host.appendChild(buildRuler());

        DATA.lanes.forEach(function (lane) {
            var head = el('div', 'sch-row lane-head');
            var headLeft = el('div', 'sch-left');
            headLeft.appendChild(el('span', 'lane-name', lane.name));

            var headTrack = el('div', 'sch-track');
            headTrack.appendChild(buildGridCells());

            if (lane.id === 'external') {
                var incomplete = DATA.prerequisites.filter(function (p) { return p.status !== 'complete'; }).length;
                headLeft.appendChild(el('span', 'lane-meta', DATA.prerequisites.length + ' 项前置 · ' + incomplete + ' 项未完成'));
            } else {
                var tasks = laneTasks(lane.id);
                headLeft.appendChild(el('span', 'lane-meta',
                    tasks.length + ' 条任务 · ' + sumWorkdays(tasks) + ' 人日 · 平均进度 ' + formatPct(averageProgress(tasks))));
            }

            head.appendChild(headLeft);
            head.appendChild(headTrack);
            host.appendChild(head);

            if (lane.id === 'external') {
                DATA.prerequisites.forEach(function (pre) {
                    host.appendChild(buildPrereqRow(pre));
                });
            } else {
                laneTasks(lane.id).forEach(function (task) {
                    host.appendChild(buildTaskRow(task));
                });
            }
        });
    }

    /* ---------- 任务明细（按状态分组） ---------- */

    function buildDetailTable(tasks) {
        var table = el('table', 'detail-table');
        var thead = el('thead');
        var headRow = el('tr');
        headRow.appendChild(el('th', null, '任务'));
        headRow.appendChild(el('th', 'col-days', '预计人日'));
        headRow.appendChild(el('th', 'col-progress', '人工进度'));
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = el('tbody');
        tasks.forEach(function (task) {
            var status = effectiveStatus(task);
            var progress = clampProgress(task.progress);
            var tr = el('tr');

            var tdTask = el('td', 'cell-task');
            tdTask.appendChild(el('div', 'task-name', task.name));
            var meta = el('div', 'task-meta');
            meta.appendChild(el('span', 'group-tag', task.group));
            meta.appendChild(document.createTextNode(task.owner + ' · ' + weekText(task)));
            tdTask.appendChild(meta);
            tr.appendChild(tdTask);

            tr.appendChild(el('td', 'col-days num', String(task.workdays)));

            var tdProgress = el('td', 'col-progress');
            var wrap = el('div', 'cell-progress');
            var track = el('div', 'progress-track');
            var fill = el('i');
            fill.style.width = progress + '%';
            track.appendChild(fill);
            wrap.appendChild(track);
            wrap.appendChild(el('span', 'pct num' + (status === 'done' ? ' is-done' : ''), progress + '%'));
            if (status === 'waiting') {
                wrap.appendChild(el('span', 'state-tag', '等待外部条件'));
            }
            tdProgress.appendChild(wrap);
            tr.appendChild(tdProgress);

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        return table;
    }

    function renderDetails() {
        var host = document.getElementById('detail-groups');
        STATUS_ORDER.forEach(function (statusKey) {
            var info = STATUS_META[statusKey];
            var tasks = DATA.tasks.filter(function (t) { return effectiveStatus(t) === statusKey; });

            var group = el('section', 'detail-group' + (info.defaultOpen ? ' is-open' : ''));
            var contentId = 'detail-body-' + statusKey;

            var toggle = el('button', 'group-toggle');
            toggle.type = 'button';
            toggle.setAttribute('aria-expanded', info.defaultOpen ? 'true' : 'false');
            toggle.setAttribute('aria-controls', contentId);
            var caret = el('span', 'caret');
            caret.setAttribute('aria-hidden', 'true');
            toggle.appendChild(caret);
            toggle.appendChild(el('span', 'g-name', info.name));
            toggle.appendChild(el('span', 'g-count num', tasks.length + ' 条'));

            var collapse = el('div', 'collapse');
            collapse.id = contentId;
            var inner = el('div', 'collapse-inner');
            if (tasks.length) {
                inner.appendChild(buildDetailTable(tasks));
            } else {
                inner.appendChild(el('p', 'empty-line', '当前没有' + info.name + '的任务。'));
            }
            collapse.appendChild(inner);

            toggle.addEventListener('click', function () {
                var open = group.classList.toggle('is-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });

            group.appendChild(toggle);
            group.appendChild(collapse);
            host.appendChild(group);
        });
    }

    /* ---------- 待配合事项完整清单 ---------- */

    function renderPrereqTable() {
        var wrap = document.getElementById('prereq-table-wrap');
        var taskById = {};
        DATA.tasks.forEach(function (t) { taskById[t.id] = t; });

        var table = el('table', 'prereq-table');
        var thead = el('thead');
        var headRow = el('tr');
        ['待配合事项', '责任角色', '期望周次', '状态', '受影响任务'].forEach(function (h) {
            headRow.appendChild(el('th', null, h));
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = el('tbody');
        DATA.prerequisites.forEach(function (pre) {
            var done = pre.status === 'complete';
            var tr = el('tr', done ? 'is-complete' : '');
            tr.appendChild(el('td', 'pre-name', pre.title));
            tr.appendChild(el('td', null, pre.ownerRole));
            tr.appendChild(el('td', 'num', '第' + pre.expectedWeek + '周'));
            var tdState = el('td');
            tdState.appendChild(el('span', 'state-chip ' + (done ? 'is-complete' : 'is-incomplete'), done ? '已完成' : '未完成'));
            tr.appendChild(tdState);
            var names = (pre.affectedTaskIds || []).map(function (id) {
                return taskById[id] ? taskById[id].name : id;
            }).join('、');
            tr.appendChild(el('td', 'affected', names || '—'));
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
    }

    /* ---------- 范围待确认 ---------- */

    function renderScopes() {
        var list = document.getElementById('scope-list');
        DATA.pendingScopes.forEach(function (scope) {
            var li = el('li');
            li.appendChild(el('span', 'scope-title', scope.title));
            li.appendChild(el('span', 'scope-note', scope.note));
            list.appendChild(li);
        });
    }

    /* ---------- 页脚排期说明 ---------- */

    function renderFootNotes() {
        var host = document.getElementById('foot-notes');
        var notes = [
            '人员配置：1 产品 + 1 前端 + 1 后端并行推进；PC 管理端与小程序由同一前端交叉推进。',
            '接口约定后前后端并行开发，前端可使用 Mock 数据先行。',
            '每周 ' + META.workdaysPerWeek + ' 个工作日，' + META.hoursPerWorkday + ' 小时计 1 人日。',
            '人力缓冲按基础工作量的 ' + Math.round(META.bufferRate * 100) + '% 单独计算，对应第' + META.bufferStartWeek + '–' + META.bufferEndWeek + '周，不摊入具体研发任务。',
            '范围待确认项不参与工作量与进度统计，确认后重新评估并更新当前计划。',
            '待配合事项为甲方前置条件，不进入研发进度；小程序外部条件未齐时公共功能经 H5 继续开发，H5 不是另一套正式产品。'
        ];
        notes.forEach(function (text) {
            host.appendChild(el('li', null, text));
        });
    }

    /* ---------- 启动 ---------- */

    renderLastUpdated(new Date(document.lastModified));
    resolveLastUpdated();
    renderOverview();
    renderAmberStrip();
    renderSchedule();
    renderDetails();
    renderPrereqTable();
    renderScopes();
    renderFootNotes();
})();
