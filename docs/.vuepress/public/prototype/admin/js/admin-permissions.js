/**
 * 后台原型权限与稳定 actorId（测试 fixture，无正式角色切换菜单）
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pet-admin-actor-fixture';

  var PROFILES = {
    default: {
      id: 'admin-demo',
      label: '后台管理员（编制+审核）',
      roles: { editor: true, reviewer: true },
      readOnly: false
    },
    editor: {
      id: 'admin-editor',
      label: '编制员',
      roles: { editor: true, reviewer: false },
      readOnly: false
    },
    reviewer: {
      id: 'admin-reviewer',
      label: '审核员',
      roles: { editor: false, reviewer: true },
      readOnly: false
    },
    dual: {
      id: 'admin-dual',
      label: '双权限账号',
      roles: { editor: true, reviewer: true },
      readOnly: false
    },
    readonly: {
      id: 'admin-readonly',
      label: '只读账号',
      roles: { editor: false, reviewer: false },
      readOnly: true
    }
  };

  var activeKey = 'default';

  function readUrlFixture() {
    try {
      var search = (global.location && global.location.search) || '';
      var match = search.match(/[?&]actor=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function resolveFixtureKey() {
    var url = readUrlFixture();
    if (url && PROFILES[url]) return url;
    return 'default';
  }

  function currentProfile() {
    return PROFILES[activeKey] || PROFILES.default;
  }

  function setActorFixture(key) {
    if (!PROFILES[key]) throw new Error('unknown actor fixture: ' + key);
    activeKey = key;
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, key);
    } catch (e) { /* ignore */ }
    var store = global.PetReportMockStore;
    if (store && typeof store.setActorFixture === 'function') {
      store.setActorFixture(key);
    }
  }

  activeKey = resolveFixtureKey();

  function getActor() {
    var p = currentProfile();
    return {
      id: p.id,
      label: p.label,
      profileKey: activeKey,
      roles: Object.assign({}, p.roles),
      readOnly: !!p.readOnly
    };
  }

  function getActorLabel() {
    return currentProfile().label;
  }

  function hasEditorRole() {
    return !!currentProfile().roles.editor;
  }

  function hasReviewerRole() {
    return !!currentProfile().roles.reviewer;
  }

  function isReadOnly() {
    return !!currentProfile().readOnly;
  }

  function can(action, context) {
    context = context || {};
    if (isReadOnly()) {
      return action === 'read';
    }
    switch (action) {
      case 'read':
        return true;
      case 'register_test':
      case 'import':
      case 'reimport':
      case 'edit_report':
      case 'edit':
      case 'submit':
      case 'save_rule':
      case 'edit_catalog':
        return hasEditorRole();
      case 'withdraw':
        if (!hasEditorRole()) return false;
        if (context.submittedByActorId) {
          if (!context.actorId) return false;
          return context.submittedByActorId === context.actorId;
        }
        return true;
      case 'review':
      case 'review_edit':
      case 'reject':
      case 'publish':
      case 'void_report':
      case 'void':
        return hasReviewerRole();
      case 'configure_products':
      case 'configureProducts':
        if (context.reportStatus === 'voided') return false;
        return hasEditorRole() || hasReviewerRole();
      default:
        return false;
    }
  }

  function assertCan(action, context) {
    if (!can(action, context)) {
      throw new Error('当前账号无权限执行此操作：' + action);
    }
  }

  function mapRolesToStore(roles) {
    if (roles && roles.editor !== undefined) {
      var out = [];
      if (roles.editor) out.push('editor');
      if (roles.reviewer) out.push('reviewer');
      return out;
    }
    return (roles || []).map(function (r) {
      if (r === 'edit') return 'editor';
      if (r === 'review') return 'reviewer';
      return r;
    });
  }

  function getStorePermissionProfile() {
    var actor = getActor();
    return {
      actorId: actor.id,
      actor: actor.label,
      roles: mapRolesToStore(actor.roles),
      readOnly: actor.readOnly
    };
  }

  global.PetAdminPermissions = {
    PROFILES: PROFILES,
    getActor: getActor,
    getActorLabel: getActorLabel,
    setActorFixture: setActorFixture,
    can: can,
    assertCan: assertCan,
    mapRolesToStore: mapRolesToStore,
    getStorePermissionProfile: getStorePermissionProfile
  };
})(typeof window !== 'undefined' ? window : global);
