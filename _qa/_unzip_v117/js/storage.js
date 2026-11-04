/* 天清往事 · 存档系统（2026-10-11）
 * 平台规范（小红书小工具）：window.xhs.miniTool.setStorage/getStorage，
 * 数据必须为 JSON 字符串，单 key ≤1MB；bridge 持久性优于 localStorage。
 * 三层降级：bridge → localStorage(try/catch，仅非 XHS 环境) → 内存态。
 * 注意：bridge 的确切签名（对象/位置参数）在真机核验前做双形态兼容。
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'tianqing_save_v1';
  var memoryStore = null; // 最后一层兜底（进程内）

  function bridge() {
    return (global.xhs && global.xhs.miniTool) ? global.xhs.miniTool : null;
  }

  function safeParse(raw) {
    if (!raw || typeof raw !== 'string') { return null; }
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* ---------- 写档（形态A 带回调确认：success 到手才算 bridge 成功，200ms 未确认降级本地） ---------- */
  function saveGame(saveObj, cb) {
    var json;
    try { json = JSON.stringify(saveObj); } catch (e) { if (cb) { cb(false, 'stringify'); } return; }
    var done = false;
    var timer = 0;
    function finish(ok, via) {
      if (done) { return; }
      done = true;
      if (timer) { clearTimeout(timer); timer = 0; }
      if (cb) { cb(ok, via); }
    }
    function fallbackLocal() {
      try {
        global.localStorage.setItem(SAVE_KEY, json);
        finish(true, 'local');
        return;
      } catch (e2) { /* localStorage 禁用/满 */ }
      memoryStore = json;
      finish(true, 'memory');
    }
    var mt = bridge();
    if (mt && typeof mt.setStorage === 'function') {
      try {
        /* 形态A：对象参数 + success/fail 回调；若桥为同步语义不回调，200ms 超时降级本地（双写无害） */
        mt.setStorage({ key: SAVE_KEY, data: json, success: function () { finish(true, 'bridge'); }, fail: function () { fallbackLocal(); } });
        timer = setTimeout(function () { fallbackLocal(); }, 200);
        return;
      } catch (eA) { /* 落到形态B */ }
      try {
        mt.setStorage(SAVE_KEY, json);
        finish(true, 'bridge');
        return;
      } catch (eB) { /* bridge 不可用，降级 */ }
    }
    fallbackLocal();
  }

  /* ---------- 读档（settled 守卫：修 60ms 兜底与桥回调竞态导致的二次 settle） ---------- */
  function loadGame(cb) {
    var settled = false;
    function settle(res, via) {
      if (settled) { return; }
      settled = true;
      var obj = null;
      if (res && typeof res === 'object' && typeof res.data === 'string') {
        obj = safeParse(res.data);
      } else if (typeof res === 'string') {
        obj = safeParse(res);
      }
      if (!obj && memoryStore) { obj = safeParse(memoryStore); }
      if (cb) { cb(obj, via); }
    }
    function fallback() {
      var raw = null;
      try { raw = global.localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
      if (raw) { settle(raw, 'local'); } else { settle(null, 'memory'); }
    }
    var mt = bridge();
    if (mt && typeof mt.getStorage === 'function') {
      // 形态A：{key, success, fail}
      try {
        mt.getStorage({
          key: SAVE_KEY,
          success: function (res) { settle(res, 'bridge'); },
          fail: function () { fallback(); }
        });
        // 若同步抛错或非回调式实现，会走到 catch / 或直接 settle 不了——用微任务兜底判定
        setTimeout(function () { if (!settled) { fallback(); } }, 60);
        return;
      } catch (eA) { /* 落到形态B */ }
      try {
        mt.getStorage(SAVE_KEY, function (res) { settle(res, 'bridge'); }, function () { fallback(); });
        return;
      } catch (eB) { fallback(); return; }
    }
    fallback();
  }

  /* ---------- 清档（重新开始） ---------- */
  function clearSave(cb) {
    memoryStore = null;
    var mt = bridge();
    if (mt && typeof mt.removeStorage === 'function') {
      try { mt.removeStorage({ key: SAVE_KEY }); } catch (eA) {
        try { mt.removeStorage(SAVE_KEY); } catch (eB) { /* ignore */ }
      }
    }
    try { global.localStorage.removeItem(SAVE_KEY); } catch (e2) { /* ignore */ }
    if (cb) { cb(true); }
  }

  /* ---------- 存档数据结构（v1） ---------- */
  function newSave(roleId) {
    return {
      v: 1,
      role: roleId || null,          // 'nv' | 'shi'
      actIndex: 0,                   // 0=寅 1=辰 2=午 3=酉 4=终幕
      step: 0,                       // 幕内步数
      shards: {},                    // { shardId: true }
      deco: {},                      // 长卷装饰件 { decoId: true }
      memories: {},                  // 已看回忆 { memoryId: true }
      taskDone: {},                  // 差事帖勾销 { actId: true }
      choices: {},                   // 关键选择（殷崇义辞令等）
      updated: 0
    };
  }

  global.TQStorage = {
    saveGame: saveGame,
    loadGame: loadGame,
    clearSave: clearSave,
    newSave: newSave,
    SAVE_KEY: SAVE_KEY
  };
})(window);
