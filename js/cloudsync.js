/* 天清往事 · 云存储镜像层（2026-10-26 按《云存储接入开发方案》实装）
 * 原则：local-first——云任何失败只影响镜像同步，本地三层链路一行不改。
 * 数据映射：collection 'tianqing_save_v1' 单用户单记录，content=存档 v1 全量，
 *           updated 时间戳新者胜；2004/UNKNOWN 禁止重发→本会话挂起，下次启动对账。
 * Chrome 61 基线：ES2017、无 inline、全回调/Promise 双形态判空。
 */
(function (global) {
  'use strict';

  var COLLECTION = 'tianqing_save_v1';
  var st = {
    on: false,        /* 能力可用且未被禁用（1005/1006 未授权、连续失败→关闸，本地照常） */
    syncing: false,   /* 单飞标记 */
    dirty: null,      /* 待推的最新全量存档 */
    cloudId: null,    /* 会话内已定位的记录 id（null=未定位，写前先查一次） */
    pending: false,   /* UNKNOWN：本会话禁重发，下次启动 query 对账 */
    failCount: 0      /* 连续失败计数（>3 本会话关闸） */
  };

  function mt() {
    var m = global.xhs && global.xhs.miniTool;
    return m || null;
  }
  function hasCloud() {
    var m = mt();
    return !!(m && typeof m.addCloudStorage === 'function' && typeof m.queryCloudStorage === 'function');
  }
  function init() {
    st.on = hasCloud();
    return st.on;
  }
  function available() { return st.on; }
  function statusText() {
    if (!st.on) { return '仅本机'; }
    if (st.syncing) { return '同步中…'; }
    if (st.pending) { return '待确认（下次进入对账）'; }
    if (st.failCount > 0) { return '暂时不可用（本地已保存）'; }
    return '已开启';
  }

  /* 分类内取 updated 最新一条（读侧永远新者胜，不做删除清理——保守策略） */
  function pickNewest(items) {
    var best = null;
    (items || []).forEach(function (it) {
      var c = it && it.content;
      if (c && typeof c === 'object' && typeof c.updated === 'number') {
        if (!best || c.updated > best.content.updated) { best = it; }
      }
    });
    return best;
  }

  function queryAll(cb) { /* cb(err|null, items|null)；err 带 errCode */
    var m = mt();
    if (!m || typeof m.queryCloudStorage !== 'function') { cb({ errCode: -1 }, null); return; }
    m.queryCloudStorage({ collection: COLLECTION }).then(function (res) {
      cb(null, (res && res.items) || []);
    }).catch(function (err) {
      cb(err || { errCode: -1 }, null);
    });
  }
  function gateOnError(err) { /* 1005/1006 未授权、10003 未开通：本会话关闸，隐藏云状态 */
    var code = err && err.errCode;
    if (code === 1005 || code === 1006 || code === 10003 || code === 10001) { st.on = false; }
  }

  /* ---------- 启动恢复：cb(cloudSave|null)，云较新的判定由调用方做 ---------- */
  function restore(localSave, cb) {
    if (!st.on) { cb(null); return; }
    queryAll(function (err, items) {
      if (err) { gateOnError(err); cb(null); return; }
      var best = pickNewest(items);
      if (best) {
        st.cloudId = best.id || null;
        cb(best.content || null);
      } else {
        st.cloudId = null;
        cb(null); /* 云端无档：本地档将成为首次云备份候选 */
      }
    });
  }

  /* ---------- 推送（单飞 + 防抖） ---------- */
  var debounceTimer = 0;
  function markDirty(saveObj) {
    st.dirty = saveObj;
    if (debounceTimer) { clearTimeout(debounceTimer); }
    debounceTimer = setTimeout(function () {
      debounceTimer = 0;
      checkpoint(st.dirty);
    }, 4000); /* [PLACEHOLDER] 防抖窗：persist 突发合并；真机按配额/手感调 */
  }
  function checkpoint(saveObj) {
    if (saveObj) { st.dirty = saveObj; }
    if (!st.on || st.syncing || !st.dirty || st.pending) { return; }
    push(st.dirty);
  }
  function push(saveObj) {
    var m = mt();
    if (!m) { return; }
    st.syncing = true;
    function write(id) {
      var req = id
        ? m.updateCloudStorage({ collection: COLLECTION, items: [{ id: id, content: saveObj }] })
        : m.addCloudStorage({ collection: COLLECTION, items: [{ content: saveObj }] });
      req.then(function (res) {
        var item = res && res.data && res.data[0];
        var status = item && item.status;
        if (item && item.id) { st.cloudId = item.id; }
        if (status === 'SUCCESS') {
          st.dirty = null;
          st.failCount = 0;
        } else if (status === 'FAILED') {
          st.failCount += 1; /* 下个 checkpoint 重试（≤3 次后本会话关闸） */
          if (st.failCount > 3) { st.on = false; }
        } else { /* UNKNOWN 或未登记：结果未知，禁重发 */
          st.pending = true;
        }
      }).catch(function (err) {
        var code = err && err.errCode;
        if (code === 1005 || code === 1006) { st.on = false; }
        else if (code === 2004) { st.pending = true; }
        else {
          st.failCount += 1;
          if (st.failCount > 3) { st.on = false; }
        }
      }).then(function () {
        st.syncing = false;
        if (st.dirty && st.on && !st.pending) {
          var d = st.dirty;
          st.dirty = null;
          push(d); /* 飞行期间有新脏数据：补推一次 */
        }
        /* 有脏但被关闸/挂起：保留，等下个 checkpoint 或下次启动 */
      });
    }
    if (st.cloudId) { write(st.cloudId); return; }
    /* id 未定位：先查一次（同时兜住「别处已建档」的情况） */
    queryAll(function (err, items) {
      if (err) {
        gateOnError(err);
        st.syncing = false;
        st.failCount += 1;
        return;
      }
      var best = pickNewest(items);
      if (best && best.id) { st.cloudId = best.id; }
      write(st.cloudId);
    });
  }

  global.TQCloud = {
    init: init,
    available: available,
    statusText: statusText,
    restore: restore,
    markDirty: markDirty,
    checkpoint: checkpoint
  };
})(window);
