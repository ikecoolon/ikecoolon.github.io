/**
 * 标准 Modal 辅助（静态原型）
 */
(function (global) {
  'use strict';

  var C = function () { return global.PetAdminCommon; };

  function escapeHtml(str) {
    if (C() && C().escapeHtml) return C().escapeHtml(str);
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getFocusable(root) {
    return Array.prototype.slice.call(
      root.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) {
      return !el.hasAttribute('disabled') && (el.offsetParent !== null || el === document.activeElement);
    });
  }

  /**
   * @param {Object} options
   * @param {string} [options.title]
   * @param {string} [options.bodyHtml]
   * @param {string} [options.okLabel]
   * @param {string} [options.cancelLabel]
   * @param {boolean} [options.hideOk]
   * @param {boolean} [options.hideCancel]
   * @param {string} [options.width] md|lg
   * @param {boolean} [options.closeOnOverlay]
   * @param {function} [options.isDirty]
   * @param {function} [options.onDirty]
   * @param {function} [options.onOk] (close, root, setLoading) => void|Promise
   * @param {function} [options.onCancel] (close) => void
   * @param {function} [options.onClose]
   */
  function open(options) {
    options = options || {};
    var previousFocus = document.activeElement;
    var overlay = document.createElement('div');
    overlay.className = 'rondo-modal-root';
    overlay.setAttribute('data-admin-modal', 'true');

    var widthClass = options.width === 'lg' ? 'rondo-modal-lg' : 'rondo-modal-md';
    var titleId = 'rondo-modal-title-' + Date.now();
    overlay.innerHTML =
      '<div class="rondo-modal ' + widthClass + '" role="dialog" aria-modal="true"' +
      (options.title ? ' aria-labelledby="' + titleId + '"' : '') + '>' +
      (options.title
        ? '<div class="rondo-modal-header" id="' + titleId + '">' + escapeHtml(options.title) + '</div>'
        : '') +
      '<div class="rondo-modal-body">' + (options.bodyHtml || '') + '</div>' +
      '<div class="rondo-modal-footer">' +
      (options.hideCancel ? '' :
        '<button type="button" class="rondo-btn rondo-btn-default" data-action="cancel">' +
        escapeHtml(options.cancelLabel || '取消') + '</button>') +
      (options.hideOk ? '' :
        '<button type="button" class="rondo-btn rondo-btn-primary" data-action="ok">' +
        escapeHtml(options.okLabel || '确定') + '</button>') +
      '</div></div>';

    document.body.appendChild(overlay);

    var modalEl = overlay.querySelector('.rondo-modal');
    var dirty = false;
    var closed = false;
    var submitting = false;

    function markDirty() {
      dirty = true;
      if (typeof options.onDirty === 'function') options.onDirty(true);
    }

    overlay.addEventListener('input', markDirty);
    overlay.addEventListener('change', markDirty);

    function isDirty() {
      if (typeof options.isDirty === 'function') return !!options.isDirty();
      return dirty;
    }

    function setLoading(loading) {
      submitting = !!loading;
      var okBtn = overlay.querySelector('[data-action="ok"]');
      var cancelBtn = overlay.querySelector('[data-action="cancel"]');
      if (okBtn) {
        okBtn.disabled = !!loading;
        okBtn.classList.toggle('is-loading', !!loading);
        okBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
      }
      if (cancelBtn) cancelBtn.disabled = !!loading;
    }

    function restoreFocus() {
      if (previousFocus && typeof previousFocus.focus === 'function') {
        try { previousFocus.focus(); } catch (e) { /* ignore */ }
      }
    }

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      restoreFocus();
      if (typeof options.onClose === 'function') options.onClose();
    }

    function doCancel() {
      if (options.onCancel) options.onCancel(close);
      else close();
    }

    function tryCancel() {
      if (submitting) return;
      if (isDirty()) {
        var confirmFn = C() && C().confirmDialog;
        if (confirmFn) {
          confirmFn('表单尚未提交，确定关闭吗？', doCancel);
        } else if (global.confirm('表单尚未提交，确定关闭吗？')) {
          doCancel();
        }
        return;
      }
      doCancel();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        tryCancel();
        return;
      }
      if (e.key !== 'Tab' || !modalEl) return;
      var focusable = getFocusable(modalEl);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    var cancelBtn = overlay.querySelector('[data-action="cancel"]');
    if (cancelBtn) cancelBtn.onclick = tryCancel;

    var okBtn = overlay.querySelector('[data-action="ok"]');
    if (okBtn) {
      okBtn.onclick = function () {
        if (submitting) return;
        if (!options.onOk) {
          close();
          return;
        }
        var result;
        try {
          result = options.onOk(close, overlay, setLoading);
        } catch (err) {
          if (C() && C().toast) C().toast(err.message || '操作失败', 'error');
          return;
        }
        if (result && typeof result.then === 'function') {
          setLoading(true);
          result.then(function (res) {
            if (closed) return;
            if (res !== false) close();
          }).catch(function (err) {
            if (C() && C().toast) C().toast((err && err.message) || '操作失败', 'error');
          }).finally(function () {
            if (!closed) setLoading(false);
          });
        }
      };
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && options.closeOnOverlay !== false) {
        tryCancel();
      }
    });

    var focusable = getFocusable(modalEl);
    if (focusable.length) focusable[0].focus();

    return { close: close, root: overlay, setLoading: setLoading, markDirty: markDirty };
  }

  global.PetAdminModal = { open: open, openModal: open };
})(window);
