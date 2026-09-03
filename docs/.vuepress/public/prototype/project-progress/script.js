/* 项目进度管理 · 渲染逻辑
 * 所有统计均从 data.js 计算，页面不散落硬编码数字。
 * seed 2fc4dc8e
 */
(function () {
    'use strict';

    var DATA = window.PROJECT_PROGRESS_DATA;
    var BASE_META = DATA.meta;
    var profileMeta = {};
    var activeProfile = null;
    var staffingId = '1fe';
    var derivedTasks = [];
    var derivedPrereqs = [];
    var COLS = 11;
    var WEEK_W = 100;
    var TRACK_W = COLS * WEEK_W;

    function readWeekWidth() {
        var fallback = 100;
        try {
            var raw = getComputedStyle(document.documentElement).getPropertyValue('--week-w').trim();
            if (raw) {
                var parsed = parseFloat(raw);
                if (!isNaN(parsed) && parsed > 0) return parsed;
            }
        } catch (err) { /* ignore */ }
        return fallback;
    }

    function syncLayoutMetrics() {
        WEEK_W = readWeekWidth();
        TRACK_W = COLS * WEEK_W;
        document.documentElement.style.setProperty('--total-weeks', String(COLS));
        document.documentElement.style.setProperty('--track-w', TRACK_W + 'px');
    }

    var dateCtx = {
        selectedDate: null,
        effectiveStart: null,
        hasSchedule: false,
        weekendAdjusted: false,
        workdaysPerWeek: 5
    };

    /* ---------- 人员 profile 与任务派生 ---------- */

    function readStaffingFromUrl() {
        try {
            return new URLSearchParams(window.location.search).get('staffing');
        } catch (err) {
            return null;
        }
    }

    function resolveStaffingProfile() {
        var raw = readStaffingFromUrl();
        staffingId = raw === '2fe' ? '2fe' : '1fe';
        activeProfile = DATA.staffingProfiles[staffingId];
        profileMeta = Object.assign({}, BASE_META, activeProfile.meta);
        COLS = profileMeta.totalWeeks;
        syncLayoutMetrics();
        deriveTasks();
        derivePrereqs();
    }

    function planEndDay(schedule) {
        return schedule.planStart + schedule.duration - 0.5;
    }

    function weeksFromPlan(schedule) {
        var endDay = planEndDay(schedule);
        return {
            startWeek: Math.floor(schedule.planStart / profileMeta.planWorkdaysPerWeek) + 1,
            endWeek: Math.floor(endDay / profileMeta.planWorkdaysPerWeek) + 1,
            planEndDay: endDay
        };
    }

    function deriveTasks() {
        derivedTasks = DATA.tasks.map(function (task) {
            var schedule = activeProfile.taskSchedules[task.id];
            var weeks = weeksFromPlan(schedule);
            return Object.assign({}, task, {
                owner: schedule.owner,
                startWeek: weeks.startWeek,
                endWeek: weeks.endWeek,
                planStart: schedule.planStart,
                planDuration: schedule.duration,
                planEndDay: weeks.planEndDay
            });
        });
    }

    function derivePrereqs() {
        var overrides = activeProfile.prereqExpectedWeeks || {};
        derivedPrereqs = DATA.prerequisites.map(function (pre) {
            var expectedWeek = overrides[pre.id] !== undefined ? overrides[pre.id] : pre.expectedWeek;
            return Object.assign({}, pre, { expectedWeek: expectedWeek });
        });
    }

    function updateUrlStaffing(value) {
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('staffing', value);
            history.replaceState(null, '', url.pathname + url.search + url.hash);
        } catch (err) { /* ignore */ }
    }

    function syncStaffingRadios() {
        var value = staffingId;
        document.querySelectorAll('input[name="staffing-profile"]').forEach(function (radio) {
            radio.checked = radio.value === value;
        });
    }

    function staffingLeadWeeks() {
        var one = DATA.staffingProfiles['1fe'].meta;
        var two = DATA.staffingProfiles['2fe'].meta;
        return {
            dev: one.devEndWeek - two.devEndWeek,
            total: one.totalWeeks - two.totalWeeks
        };
    }

    function staffingDescriptionText() {
        return activeProfile.description || '';
    }

    function updateDynamicChrome() {
        var scrollHint = document.getElementById('schedule-scroll-hint');
        if (scrollHint) {
            scrollHint.textContent = '左侧任务固定，横向滑动查看第 1–' + COLS + ' 周。';
        }
        var scrollPanel = document.querySelector('.schedule-scroll');
        if (scrollPanel) {
            scrollPanel.setAttribute('aria-label', '周次排期总控板，左侧任务列固定，横向滑动查看第 1 至 ' + COLS + ' 周');
        }
        var bufferLegend = document.getElementById('legend-buffer-weeks');
        if (bufferLegend) {
            if (profileMeta.bufferStartWeek === profileMeta.bufferEndWeek) {
                bufferLegend.textContent = '第 ' + profileMeta.bufferStartWeek + ' 周';
            } else {
                bufferLegend.textContent = '第 ' + profileMeta.bufferStartWeek + '–' + profileMeta.bufferEndWeek + ' 周';
            }
        }
        var prereqDesc = document.getElementById('prereq-section-desc');
        if (prereqDesc) {
            prereqDesc.textContent = '共 ' + derivedPrereqs.length + ' 条甲方预备事项，当前均已判断适用且按实际交付状态核验。甲方预备事项不参与研发工作量与进度统计，本页不推演延期。支付相关事项优先核验并复用商城现状，不默认重新申请商户号或向前端交付支付密钥。';
        }
        var laneNote = document.getElementById('lane-note');
        if (laneNote) {
            laneNote.textContent = '健康报告在现有商城小程序同一 AppID 内二次开发；启动/登录默认进入健康报告首页，主导航按原型为「首页」「我的」，报告从首页打开。商城交易后端继续复用。外部条件未齐时可通过 H5 或 Mock 继续公共功能开发，但微信登录、真机支付与发布验证仍需真实环境。';
        }
    }

    /* ---------- 项目开始日期与工作周换算 ---------- */

    function parseLocalDateString(str) {
        if (!str || typeof str !== 'string') return null;
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
        if (!m) return null;
        var y = +m[1];
        var mo = +m[2] - 1;
        var d = +m[3];
        var dt = new Date(y, mo, d);
        if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
        return dt;
    }

    function formatDateISO(dt) {
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
    }

    function isWeekend(dt) {
        var dow = dt.getDay();
        if (dateCtx.workdaysPerWeek === 6) {
            return dow === 0;
        }
        return dow === 0 || dow === 6;
    }

    function getEffectiveStart(dt) {
        var d = new Date(dt.getTime());
        var adjusted = false;
        while (isWeekend(d)) {
            d.setDate(d.getDate() + 1);
            adjusted = true;
        }
        return { date: d, adjusted: adjusted };
    }

    function getWorkdayAt(start, workdayIndex) {
        var d = new Date(start.getTime());
        if (workdayIndex <= 0) return d;
        var count = 0;
        while (count < workdayIndex) {
            d.setDate(d.getDate() + 1);
            if (!isWeekend(d)) count++;
        }
        return d;
    }

    function weekStartDate(weekNo) {
        return getWorkdayAt(dateCtx.effectiveStart, (weekNo - 1) * profileMeta.planWorkdaysPerWeek);
    }

    function weekEndDate(weekNo) {
        return weekEndDateForPlan(weekNo, profileMeta.planWorkdaysPerWeek);
    }

    function weekEndDateForPlan(weekNo, planWorkdaysPerWeek) {
        return getWorkdayAt(dateCtx.effectiveStart, weekNo * planWorkdaysPerWeek - 1);
    }

    function formatCnFull(dt) {
        return dt.getFullYear() + '年' + (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
    }

    function formatCnMonthDay(dt) {
        return (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
    }

    function formatCompactMD(dt) {
        return (dt.getMonth() + 1) + '/' + dt.getDate();
    }

    function formatCompactRange(start, end) {
        return formatCompactMD(start) + '–' + formatCompactMD(end);
    }

    function formatFullRangeTitle(start, end) {
        return formatCnFull(start) + '至' + formatCnFull(end);
    }

    function readStartFromUrl() {
        try {
            return new URLSearchParams(window.location.search).get('start');
        } catch (err) {
            return null;
        }
    }

    function readWorkdaysFromUrl() {
        try {
            return new URLSearchParams(window.location.search).get('workdays');
        } catch (err) {
            return null;
        }
    }

    function resolveWorkdaysPerWeek() {
        var raw = readWorkdaysFromUrl();
        var value = raw !== null ? parseInt(raw, 10) : profileMeta.workdaysPerWeek;
        if (value !== 5 && value !== 6) value = 5;
        dateCtx.workdaysPerWeek = value;
    }

    function resolveStartDate() {
        var urlStart = readStartFromUrl();
        var chosen = null;

        if (urlStart) {
            var fromUrl = parseLocalDateString(urlStart);
            if (fromUrl) chosen = { str: urlStart, date: fromUrl };
        } else if (profileMeta.projectStartDate) {
            var fromMeta = parseLocalDateString(profileMeta.projectStartDate);
            if (fromMeta) chosen = { str: profileMeta.projectStartDate, date: fromMeta };
        }

        if (!chosen) {
            dateCtx.selectedDate = null;
            dateCtx.effectiveStart = null;
            dateCtx.hasSchedule = false;
            dateCtx.weekendAdjusted = false;
            return;
        }

        dateCtx.selectedDate = chosen.str;
        var eff = getEffectiveStart(chosen.date);
        dateCtx.effectiveStart = eff.date;
        dateCtx.hasSchedule = true;
        dateCtx.weekendAdjusted = eff.adjusted;
    }

    function updateUrlStart(value) {
        try {
            var url = new URL(window.location.href);
            if (value) {
                url.searchParams.set('start', value);
            } else {
                url.searchParams.delete('start');
            }
            history.replaceState(null, '', url.pathname + url.search + url.hash);
        } catch (err) { /* ignore */ }
    }

    function updateUrlWorkdays(value) {
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('workdays', String(value));
            history.replaceState(null, '', url.pathname + url.search + url.hash);
        } catch (err) { /* ignore */ }
    }

    function syncWorkdaysRadios() {
        var value = String(dateCtx.workdaysPerWeek);
        var radios = document.querySelectorAll('input[name="workdays-per-week"]');
        radios.forEach(function (radio) {
            radio.checked = radio.value === value;
        });
    }

    function workdaysHintText() {
        if (dateCtx.workdaysPerWeek === 6) {
            return '固定工作量，按每周 6 天工作制推算；周六计入工作日，仅跳过周日，完成节点会相应提前。';
        }
        return '固定工作量，按每周 5 天工作制推算；跳过周六、周日，不自动识别法定节假日。';
    }

    function workdaysSkipRuleText() {
        if (dateCtx.workdaysPerWeek === 6) {
            return '仅跳过周日';
        }
        return '仅跳过周六、周日';
    }

    function taskPlanEndDate(task) {
        return weekEndDate(task.endWeek);
    }

    function prereqDeadlineDate(pre) {
        return weekEndDate(pre.expectedWeek);
    }

    function clearHost(id) {
        var host = document.getElementById(id);
        while (host.firstChild) host.removeChild(host.firstChild);
    }

    function renderDateSummary() {
        var derived = document.getElementById('date-derived');
        var weekendNote = document.getElementById('date-weekend-note');
        var hint = document.getElementById('date-hint');
        derived.textContent = '';
        if (hint) hint.textContent = workdaysHintText();

        function addDerived(label, value, pending) {
            var item = el('div', 'date-derived-item');
            item.appendChild(el('span', 'derived-label', label));
            item.appendChild(el('span', 'derived-value' + (pending ? ' is-pending' : ''), value));
            derived.appendChild(item);
        }

        if (!dateCtx.hasSchedule) {
            addDerived('研发计划完成', '待选择', true);
            addDerived('含缓冲完成', '待选择', true);
            weekendNote.hidden = true;
            weekendNote.textContent = '';
        } else {
            addDerived('研发计划完成', formatCnFull(weekEndDate(profileMeta.devEndWeek)), false);
            addDerived('含缓冲完成', formatCnFull(weekEndDate(profileMeta.totalWeeks)), false);

            if (dateCtx.weekendAdjusted) {
                weekendNote.hidden = false;
                weekendNote.textContent = '所选日期为非工作日，排期从 ' + formatCnFull(dateCtx.effectiveStart) + ' 起算';
            } else {
                weekendNote.hidden = true;
                weekendNote.textContent = '';
            }
        }
    }

    function setupDateControls() {
        var input = document.getElementById('project-start-date');
        if (!input) return;

        input.value = dateCtx.selectedDate || '';
        syncWorkdaysRadios();
        renderDateSummary();

        input.addEventListener('change', function () {
            var value = input.value;
            if (!value) {
                updateUrlStart(null);
                resolveStartDate();
                refreshDateDependent();
                return;
            }
            var parsed = parseLocalDateString(value);
            if (!parsed) return;
            updateUrlStart(value);
            resolveStartDate();
            refreshDateDependent();
        });

        var radios = document.querySelectorAll('input[name="workdays-per-week"]');
        radios.forEach(function (radio) {
            radio.addEventListener('change', function () {
                if (!radio.checked) return;
                var next = parseInt(radio.value, 10);
                if (next !== 5 && next !== 6) return;
                dateCtx.workdaysPerWeek = next;
                updateUrlWorkdays(next);
                resolveStartDate();
                refreshDateDependent();
            });
        });
    }

    function refreshDateDependent() {
        var input = document.getElementById('project-start-date');
        if (input) input.value = dateCtx.selectedDate || '';
        syncWorkdaysRadios();
        syncStaffingRadios();
        renderDateSummary();
        refreshStaffingDependent();
    }

    function setupStaffingControls() {
        syncStaffingRadios();
        document.querySelectorAll('input[name="staffing-profile"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                if (!radio.checked) return;
                staffingId = radio.value === '2fe' ? '2fe' : '1fe';
                updateUrlStaffing(staffingId);
                resolveStaffingProfile();
                refreshStaffingDependent();
            });
        });
    }

    function refreshStaffingDependent() {
        updateDynamicChrome();
        clearHost('schedule');
        renderSchedule();
        clearHost('detail-groups');
        renderDetails();
        clearHost('prereq-table-wrap');
        renderPrereqTable();
        clearHost('foot-notes');
        renderFootNotes();
        renderDateSummary();
    }

    var STATUS_META = {
        'in-progress': { name: '进行中', defaultOpen: true },
        'waiting': { name: '等待外部条件', defaultOpen: true },
        'not-started': { name: '未开始', defaultOpen: false },
        'done': { name: '已完成', defaultOpen: false }
    };
    var STATUS_ORDER = ['in-progress', 'waiting', 'not-started', 'done'];

    var PREREQ_CATEGORIES = ['账号与资质', '技术资源', '合规发布', '微信支付'];

    function isPreActive(pre) {
        return pre.active !== false;
    }

    function isPreBlocking(pre) {
        return isPreActive(pre) && pre.status !== 'complete';
    }

    function isPreConditional(pre) {
        return !isPreActive(pre);
    }

    function countActiveIncomplete() {
        return derivedPrereqs.filter(isPreBlocking).length;
    }

    function countConditionalPending() {
        return derivedPrereqs.filter(isPreConditional).length;
    }

    function incompleteByCategory(category) {
        return derivedPrereqs.filter(function (p) {
            return p.category === category && isPreBlocking(p);
        }).length;
    }

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
        return derivedTasks.filter(function (t) { return t.lane === laneId; });
    }

    function sumWorkdays(tasks) {
        return tasks.reduce(function (acc, t) { return acc + t.workdays; }, 0);
    }

    function formatDecimal(value) {
        var rounded = Math.round(value * 10) / 10;
        return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    }

    function workdaysToHours(workdays) {
        return workdays * profileMeta.hoursPerWorkday;
    }

    function formatWorkload(workdays) {
        return formatDecimal(workdays) + ' 人日 / ' + formatDecimal(workdaysToHours(workdays)) + ' 人时';
    }

    function appendWorkloadValue(container, workdays) {
        container.appendChild(el('span', 'overview-value num', formatDecimal(workdays)));
        container.appendChild(el('span', 'overview-unit', '人日 / '));
        container.appendChild(el('span', 'overview-value num', formatDecimal(workdaysToHours(workdays))));
        container.appendChild(el('span', 'overview-unit', '人时'));
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

    function overviewCell(label, value, unit, sub, extraClass, withTrack, workloadDays) {
        var cell = el('div', 'overview-cell' + (extraClass ? ' ' + extraClass : ''));
        cell.appendChild(el('span', 'overview-label', label));
        var valueWrap = el('div', 'overview-value-wrap');
        if (workloadDays !== undefined) {
            appendWorkloadValue(valueWrap, workloadDays);
        } else {
            var valueNode = el('span', 'overview-value num', String(value));
            valueWrap.appendChild(valueNode);
            if (unit) valueWrap.appendChild(el('span', 'overview-unit', unit));
        }
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
        var base = sumWorkdays(derivedTasks);
        var buffer = base * profileMeta.bufferRate;
        var total = base + buffer;
        var overall = averageProgress(derivedTasks);
        var inProgress = derivedTasks.filter(function (t) { return effectiveStatus(t) === 'in-progress'; }).length;
        var preIncomplete = countActiveIncomplete();
        var conditionalCount = countConditionalPending();

        var band = document.getElementById('overview-band');
        band.appendChild(overviewCell('基础工作量', null, null, derivedTasks.length + ' 条研发任务合计', null, null, base));
        band.appendChild(overviewCell('人力缓冲', null, null, '按基础工作量 ' + Math.round(profileMeta.bufferRate * 100) + '% 单独计算', null, null, buffer));
        band.appendChild(overviewCell('合计工作量', null, null, '基础 + 缓冲，缓冲不摊入任务', null, null, total));
        band.appendChild(overviewCell('总体进度', formatPct(overall), '', derivedTasks.length + ' 条研发任务人工进度简单平均', 'is-green', overall));
        band.appendChild(overviewCell('进行中任务', inProgress, '项', '人工进度实时汇总'));
        band.appendChild(overviewCell(
            '待甲方预备',
            preIncomplete,
            '项',
            conditionalCount
                ? '甲方预备事项，不计入进度；另有 ' + conditionalCount + ' 项条件待确认'
                : '甲方预备事项，不计入进度；当前均已判定是否适用',
            'is-amber'
        ));
    }

    /* ---------- 待甲方预备条带 ---------- */

    function renderAmberStrip() {
        var strip = document.getElementById('amber-strip');
        var incomplete = countActiveIncomplete();
        var conditionalCount = countConditionalPending();

        if (!incomplete) {
            strip.classList.add('is-clear');
            strip.appendChild(el('span', 'strip-title', '待甲方预备'));
            var clearMsg = '当前适用事项全部已完成';
            if (conditionalCount) {
                clearMsg += '；另有 ' + conditionalCount + ' 项条件待确认（不计入当前欠缺）';
            } else {
                clearMsg += '，当前无外部前置事项阻塞研发';
            }
            strip.appendChild(el('span', 'strip-items', clearMsg + '。'));
            return;
        }

        strip.appendChild(el('span', 'strip-title', '待甲方预备 ' + incomplete + ' 项未完成'));
        var items = el('div', 'strip-items');
        PREREQ_CATEGORIES.forEach(function (cat, idx) {
            var count = incompleteByCategory(cat);
            if (idx > 0) {
                items.appendChild(el('span', 'strip-sep', ''));
            }
            items.appendChild(el('span', null, cat + ' ' + count + ' 项'));
        });
        if (conditionalCount) {
            items.appendChild(el('span', 'strip-sep', ''));
            items.appendChild(el('span', 'strip-conditional', '另有 ' + conditionalCount + ' 项条件待确认'));
        }
        strip.appendChild(items);
    }

    /* ---------- 周次排期总控板 ---------- */

    function isBufferWeek(w) {
        return w >= profileMeta.bufferStartWeek && w <= profileMeta.bufferEndWeek;
    }

    function buildRuler() {
        var row = el('div', 'sch-row sch-ruler');
        row.appendChild(el('div', 'sch-left', '工作线 / 任务'));
        var track = el('div', 'sch-track');
        var cells = el('div', 'ruler-cells' + (dateCtx.hasSchedule ? ' has-dates' : ''));
        for (var w = 1; w <= COLS; w++) {
            var cell = el('div', 'ruler-cell' + (isBufferWeek(w) ? ' is-buffer' : ''));
            cell.appendChild(el('span', 'week-no', '第' + w + '周'));
            if (dateCtx.hasSchedule) {
                var ws = weekStartDate(w);
                var we = weekEndDate(w);
                var rangeLabel = '第' + w + '周，' + formatFullRangeTitle(ws, we);
                var rangeEl = el('span', 'week-range', formatCompactRange(ws, we));
                rangeEl.setAttribute('title', rangeLabel);
                rangeEl.setAttribute('aria-label', rangeLabel);
                cell.appendChild(rangeEl);
                cell.setAttribute('title', rangeLabel);
                cell.setAttribute('aria-label', rangeLabel);
            }
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
        meta.appendChild(el('span', 'task-meta-detail',
            task.owner + ' · ' + formatWorkload(task.workdays) + ' · ' + weekText(task)));
        left.appendChild(meta);
        row.appendChild(left);

        var track = el('div', 'sch-track');
        track.appendChild(buildGridCells());

        var bar = el('div', 'bar' + (status === 'done' ? ' is-done' : '') + (status === 'waiting' ? ' is-waiting' : ''));
        bar.style.left = barLeft(task.startWeek) + 'px';
        bar.style.width = ((task.endWeek - task.startWeek + 1) * WEEK_W) + 'px';
        bar.setAttribute('role', 'img');
        var barLabel = task.name + '，' + weekText(task) + '，进度 ' + progress + '%，' + STATUS_META[status].name;
        if (dateCtx.hasSchedule) {
            barLabel += '，计划完成 ' + formatCnFull(taskPlanEndDate(task));
        }
        bar.setAttribute('aria-label', barLabel);
        bar.setAttribute('title', barLabel);
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

    function prereqStateLabel(pre) {
        if (isPreConditional(pre)) return '条件待确认';
        return pre.status === 'complete' ? '已完成' : '未完成';
    }

    function buildPrereqRow(pre) {
        var done = pre.status === 'complete';
        var conditional = isPreConditional(pre);
        var row = el('div', 'sch-row task-row');

        var leftClass = 'sch-left ext-left';
        if (done) leftClass += ' is-done';
        else if (conditional) leftClass += ' is-conditional';
        var left = el('div', leftClass);
        left.appendChild(el('div', 'task-name', pre.title));
        left.appendChild(el('div', 'prereq-owner-role', pre.ownerRole));
        var weekStatusClass = 'prereq-week-status';
        if (done) weekStatusClass += ' is-done';
        else if (conditional) weekStatusClass += ' is-conditional';
        var weekStatusText = '期望第' + pre.expectedWeek + '周';
        if (dateCtx.hasSchedule) {
            weekStatusText += ' · 最迟' + formatCnMonthDay(prereqDeadlineDate(pre));
        }
        weekStatusText += ' · ' + prereqStateLabel(pre);
        left.appendChild(el('div', weekStatusClass, weekStatusText));
        row.appendChild(left);

        var track = el('div', 'sch-track');
        track.appendChild(buildGridCells());

        var center = barLeft(pre.expectedWeek) + WEEK_W / 2;
        var pinClass = 'pin';
        if (done) pinClass += ' is-done';
        else if (conditional) pinClass += ' is-conditional';
        var pin = el('span', pinClass);
        pin.style.left = center + 'px';
        pin.setAttribute('aria-hidden', 'true');
        track.appendChild(pin);

        var statePrefix = done ? '已完成' : conditional ? '条件待确认' : '待预备';
        var labelText = dateCtx.hasSchedule
            ? statePrefix + ' · ' + formatCompactMD(prereqDeadlineDate(pre))
            : statePrefix + ' · 第' + pre.expectedWeek + '周';
        var labelClass = 'pin-label';
        if (done) labelClass += ' is-done';
        else if (conditional) labelClass += ' is-conditional';
        var label = el('span', labelClass, labelText);
        if (center > TRACK_W - 120) {
            label.style.right = (TRACK_W - center + 12) + 'px';
        } else {
            label.style.left = (center + 12) + 'px';
        }
        track.appendChild(label);

        var rowAria = '待甲方预备事项：' + pre.title + '，' + pre.ownerRole + '，期望第' + pre.expectedWeek + '周';
        if (dateCtx.hasSchedule) {
            rowAria += '，最迟' + formatCnFull(prereqDeadlineDate(pre));
        }
        rowAria += '，' + prereqStateLabel(pre);
        row.setAttribute('aria-label', rowAria);
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
                var activeIncomplete = countActiveIncomplete();
                var conditionalCount = countConditionalPending();
                var prereqMeta = derivedPrereqs.length + ' 项里程碑 · ' + activeIncomplete + ' 项当前未完成';
                prereqMeta += conditionalCount
                    ? ' · ' + conditionalCount + ' 项条件待确认'
                    : ' · 均已判定是否适用';
                headLeft.appendChild(el('span', 'lane-meta', prereqMeta));
            } else {
                var tasks = laneTasks(lane.id);
                headLeft.appendChild(el('span', 'lane-meta',
                    tasks.length + ' 条任务 · ' + formatWorkload(sumWorkdays(tasks)) + ' · 平均进度 ' + formatPct(averageProgress(tasks))));
            }

            head.appendChild(headLeft);
            head.appendChild(headTrack);
            host.appendChild(head);

            if (lane.id === 'external') {
                derivedPrereqs.forEach(function (pre) {
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
        headRow.appendChild(el('th', 'col-days', '预计人日 / 人时'));
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
            var metaText = task.owner + ' · ' + weekText(task);
            if (dateCtx.hasSchedule) {
                metaText += ' · 计划完成 ' + formatCnMonthDay(taskPlanEndDate(task));
            }
            meta.appendChild(document.createTextNode(metaText));
            tdTask.appendChild(meta);
            tr.appendChild(tdTask);

            tr.appendChild(el('td', 'col-days num', formatWorkload(task.workdays)));

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
            var tasks = derivedTasks.filter(function (t) { return effectiveStatus(t) === statusKey; });

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

    /* ---------- 待甲方预备事项完整清单 ---------- */

    function buildPrereqNameCell(pre) {
        var td = el('td', 'pre-name-cell');
        var title = el('div', 'pre-name' + (pre.status === 'complete' ? ' is-complete' : isPreConditional(pre) ? ' is-conditional' : ''));
        title.textContent = pre.title;
        td.appendChild(title);

        var meta = el('div', 'pre-meta');
        meta.appendChild(el('span', 'pre-tag', pre.category));
        if (pre.condition) {
            meta.appendChild(el('span', 'pre-tag is-condition', '条件：' + pre.condition));
        } else if (pre.requirementLevel && pre.requirementLevel !== '必需') {
            meta.appendChild(el('span', 'pre-tag', pre.requirementLevel));
        }
        td.appendChild(meta);

        if (pre.completionCriteria) {
            var criteria = el('div', 'pre-criteria');
            criteria.textContent = pre.completionCriteria;
            td.appendChild(criteria);
        }

        if (pre.sourceUrl) {
            var source = el('div', 'pre-source');
            var link = el('a', null, pre.sourceLabel || '官方依据');
            link.href = pre.sourceUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            source.appendChild(link);
            td.appendChild(source);
        }

        return td;
    }

    function prereqStateChipClass(pre) {
        if (isPreConditional(pre)) return 'is-conditional';
        return pre.status === 'complete' ? 'is-complete' : 'is-incomplete';
    }

    function renderPrereqTable() {
        var wrap = document.getElementById('prereq-table-wrap');
        var taskById = {};
        derivedTasks.forEach(function (t) { taskById[t.id] = t; });

        var table = el('table', 'prereq-table');
        var thead = el('thead');
        var headRow = el('tr');
        ['待甲方预备事项', '责任方', '期望周次', '状态', '受影响任务'].forEach(function (h) {
            headRow.appendChild(el('th', null, h));
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = el('tbody');
        derivedPrereqs.forEach(function (pre) {
            var done = pre.status === 'complete';
            var rowClass = done ? 'is-complete' : isPreConditional(pre) ? 'is-conditional' : '';
            var tr = el('tr', rowClass);
            tr.appendChild(buildPrereqNameCell(pre));
            tr.appendChild(el('td', null, pre.ownerRole));
            var tdWeek = el('td', 'num');
            tdWeek.appendChild(el('span', null, '第' + pre.expectedWeek + '周'));
            if (dateCtx.hasSchedule) {
                tdWeek.appendChild(el('span', 'week-deadline', '最迟' + formatCnMonthDay(prereqDeadlineDate(pre))));
            }
            tr.appendChild(tdWeek);
            var tdState = el('td');
            tdState.appendChild(el('span', 'state-chip ' + prereqStateChipClass(pre), prereqStateLabel(pre)));
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
        var w = dateCtx.workdaysPerWeek;
        var bufferWeekText = profileMeta.bufferStartWeek === profileMeta.bufferEndWeek
            ? '第' + profileMeta.bufferStartWeek + '周'
            : '第' + profileMeta.bufferStartWeek + '–' + profileMeta.bufferEndWeek + '周';
        var staffingNote = staffingId === '2fe'
            ? '人员配置：1 产品 + 2 前端 + 1 后端并行推进；' + staffingDescriptionText()
            : '人员配置：1 产品 + 1 前端 + 1 后端并行推进；' + staffingDescriptionText();
        var lead = staffingLeadWeeks();
        var notes = [
            staffingNote,
            '接口约定后前后端并行开发，前端可使用 Mock 数据先行。',
            '每周 ' + w + ' 个工作日，' + profileMeta.hoursPerWorkday + ' 小时计 1 人日。',
            '人力缓冲按基础工作量的 ' + Math.round(profileMeta.bufferRate * 100) + '% 单独计算（' + formatWorkload(sumWorkdays(derivedTasks) * profileMeta.bufferRate) + '），对应' + bufferWeekText + '，不摊入具体研发任务。',
            '范围待确认项不参与工作量与进度统计，确认后重新评估并更新当前计划。',
            '甲方预备事项不进入研发进度；外部条件未齐时公共功能可经 H5 或 Mock 继续开发，但 H5 不是另一套正式产品。',
            '实施方式已确认：健康报告在现有商城小程序同一 AppID 内二次开发；启动/登录默认进入健康报告首页，主导航按原型为「首页」「我的」。商城交易后端继续复用并完成从报告推荐到支付退款的真实回归联调。'
        ];
        if (staffingId === '2fe') {
            notes.push('与 1 前端方案相比，本方案研发完成提前 ' + lead.dev + ' 个计划周，含缓冲完成提前 ' + lead.total + ' 个计划周（日历日期随顶栏开始日与工作周口径派生）。');
        } else if (lead.dev > 0) {
            notes.push('若切换为 2 前端 + 1 后端，研发完成可提前 ' + lead.dev + ' 个计划周，含缓冲完成可提前 ' + lead.total + ' 个计划周。');
        }
        if (dateCtx.hasSchedule) {
            notes.push(
                '项目开始日期：顶栏选择或 URL 参数 ?start=YYYY-MM-DD（优先于 data.js 的 meta.projectStartDate）；人员配置由顶栏单选或 URL 参数 ?staffing=1fe|2fe（默认 1fe）；工作周口径由顶栏单选或 URL 参数 ?workdays=5|6（优先于 meta.workdaysPerWeek，无效值回退 5）；未设定开始日期时页面仅显示相对周次。',
                '工作日换算：每个计划周固定按 ' + profileMeta.planWorkdaysPerWeek + ' 个基准工作日；5/6 天选项只改变可工作的日历日，不改变任务工作量。第 N 周开始 = 起算日后 (N−1)×' + profileMeta.planWorkdaysPerWeek + ' 个工作日，第 N 周结束 = 起算日后 N×' + profileMeta.planWorkdaysPerWeek + '−1 个工作日；当前 ' + w + ' 天工作制下' + workdaysSkipRuleText() + '，不识别法定节假日。',
                '若所选开始日为当前口径下的非工作日，输入框保留原日期，排期从下一工作日顺延起算；研发计划完成取第 ' + profileMeta.devEndWeek + ' 周结束日，含缓冲完成取第 ' + profileMeta.totalWeeks + ' 周结束日；任务计划完成取 endWeek 周结束日，甲方事项最迟完成取 expectedWeek 周结束日。'
            );
        } else {
            notes.push(
                '项目开始日期：可在顶栏选择或通过 URL ?start=YYYY-MM-DD 设定；人员配置可通过顶栏单选或 URL ?staffing=1fe|2fe 设定；工作周口径可通过顶栏单选或 URL ?workdays=5|6 设定（默认 5 天）；亦可在 data.js 的 meta.projectStartDate 填写默认日期。未设定开始日期时排期仅显示相对周次，不换算具体日历日期。'
            );
        }
        notes.forEach(function (text) {
            host.appendChild(el('li', null, text));
        });
    }

    /* ---------- 启动 ---------- */

    resolveStaffingProfile();
    resolveWorkdaysPerWeek();
    resolveStartDate();
    renderLastUpdated(new Date(document.lastModified));
    resolveLastUpdated();
    setupDateControls();
    setupStaffingControls();
    updateDynamicChrome();
    renderOverview();
    renderAmberStrip();
    renderSchedule();
    renderDetails();
    renderPrereqTable();
    renderScopes();
    renderFootNotes();
})();
