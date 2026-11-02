/*
 * tilt.js —— 视差输入源适配层（容器层 · 2026-11-02 按官方 §3.14 重写）
 *
 * 依据：小红书小工具容器能力清单（2026-10-30 版）
 *   §3.14 陀螺仪   四个接口需客户端 9.50+（9500）；先注册监听再开始采集；
 *                  interval 只认字符串 'ui'(60ms) / 'normal'(200ms 默认)；
 *                  on/off 是同步监听形态，不接受 success/fail/complete；
 *                  数据 {x,y,z} 为角速度 rad/s（不是姿态角）；无硬件靠 errCode 10002；
 *                  后台自动暂停、回前台续采；多组件共享时统一协调启停。
 *   §3.6  版本判断 版本号只在 launchOptions.miniToolEnv.buildVersion；
 *                  末 3 位是编译序号，判断时 floor(/1000)。
 *   §4.1  禁用能力 设备朝向 / 设备运动 等 Web 传感器在容器内禁用。
 *
 * 三个输入源：
 *   A. 平台陀螺仪（容器 + 9.50+）—— 只给角速度，不能积分成姿态角（会累积零漂），
 *      改用二阶弹簧把角速度直接兑换成位移，天然自归零。详见 SpringSystem。
 *   B. 设备姿态（普通浏览器 / GitHub Pages）—— 在 js/tilt-web.js，非容器环境按需加载，
 *      容器内绝不请求（§4.1 禁用，且静态校验会命中该标识符）。
 *   C. 指针拖拽（桌面兜底）
 *
 * 统一输出：tx, ty ∈ [-1, 1]，正值表示「内容应向右/向下偏移」。
 *
 * Chrome 61 基线：无 flex gap、无 :has()、无容器查询、无 clamp()/min()/max()，
 * 间距全部用 margin。ES2017（本文件只用 ES5 写法，避免转译）。
 */
(function (global) {
  'use strict';

  var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  /* ------------------------------------------------------------------
   * 弹簧-阻尼系统（角速度 → 位移）
   *
   * 平台陀螺仪只给「角速度」(rad/s)，不给姿态角；加速度计/磁力计一律不提供。
   * 「手机倾斜了多少度」在容器里不可知，只能知道「此刻往哪转、转多快」。
   *   纯积分 → 累积零漂、慢慢跑飞；
   *   积分 + 强回中 → 把「持续倾斜」一起抹平（实测偏移仅 1.1px）；
   *   二阶弹簧 pos'' = gain·ω − k·pos − c·pos' 才是对的：
   *   旋转 → 位移并带回弹；停止 → 自行荡回中位。
   * ------------------------------------------------------------------ */
  function SpringSystem(opts) {
    this.pos = 0;
    this.vel = 0;
    this.last = 0;
    this.k = (opts && opts.k) || 42;
    this.c = (opts && opts.c) || 8.5;
    this.gain = (opts && opts.gain) || 34;
    this.clamp = (opts && opts.clamp) || 1;
  }

  SpringSystem.prototype.push = function (omega, now) {
    // dt 取真实帧间隔：ui 档 60ms 一帧，浏览器姿态约 16ms，相差近 4 倍。
    // 写死 0.016 会让 60ms 档的物理时间被压缩 3.7 倍（该回中时迟迟不回）。
    var t = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
    var dt = 0.016;
    if (this.last > 0) {
      var d = (t - this.last) / 1000;
      if (d > 0.004 && d < 0.12) { dt = d; }
    }
    this.last = t;
    var acc = this.gain * omega - this.k * this.pos - this.c * this.vel;
    this.vel += acc * dt;
    this.pos += this.vel * dt;
    if (this.pos > this.clamp) { this.pos = this.clamp; this.vel = 0; }
    if (this.pos < -this.clamp) { this.pos = -this.clamp; this.vel = 0; }
    return this.pos;
  };

  SpringSystem.prototype.reset = function () { this.pos = 0; this.vel = 0; this.last = 0; };

  /* ------------------------------------------------------------------
   * 平台探测（§3.14 / §3.6）
   * ------------------------------------------------------------------ */
  var MIN_CLIENT = 9500;              // 9.50.0
  var INTERVAL = 'ui';                // 60ms；normal 为 200ms 默认档
  var FRAME_TIMEOUT = 1000;           // 首帧看门狗：start 成功却无数据也要有出路
  var GYRO_APIS = ['startGyroscope', 'stopGyroscope', 'onGyroscopeChange', 'offGyroscopeChange'];

  function miniTool() { return (global.xhs && global.xhs.miniTool) || null; }

  /* 容器判定：window.xhs 只在沙箱内注入（§4.1 的禁用项只在容器内生效） */
  function inContainer() { return !!(global.xhs && global.xhs.miniTool); }

  function hasGyroApi(mt) {
    if (!mt) { return false; }
    for (var i = 0; i < GYRO_APIS.length; i += 1) {
      if (typeof mt[GYRO_APIS[i]] !== 'function') { return false; }
    }
    return true;
  }

  /* §3.6：版本号只在 launchOptions.miniToolEnv.buildVersion，取不到返回 0 */
  function readBuildVersion(launchOptions) {
    var env = launchOptions && launchOptions.miniToolEnv;
    return Number(env && env.buildVersion) || 0;
  }

  function getClientVersion(buildVersion) { return Math.floor(buildVersion / 1000); }

  /* 同步读不到再走 getLaunchOptions；两路都空 ⇒ null（按不支持处理） */
  function resolveClientVersion() {
    var xhs = global.xhs;
    var sync = readBuildVersion(xhs && xhs.launchOptions);
    if (sync) { return Promise.resolve(getClientVersion(sync)); }
    var mt = miniTool();
    if (!mt || typeof mt.getLaunchOptions !== 'function') { return Promise.resolve(null); }
    var p;
    try { p = mt.getLaunchOptions(); } catch (e) { return Promise.resolve(null); }
    return Promise.resolve(p).then(function (opts) {
      var bv = readBuildVersion(opts);
      return bv ? getClientVersion(bv) : null;
    })['catch'](function () { return null; });
  }

  function safeOff(mt, fn) {
    try {
      if (mt && typeof mt.offGyroscopeChange === 'function') { mt.offGyroscopeChange(fn); }
    } catch (e) { /* 非法回调会同步抛 TypeError（§3.1），这里吞掉不影响业务 */ }
  }

  /* ------------------------------------------------------------------
   * 采集协调器（§3.14 末条：多组件共享陀螺仪时统一协调启停）
   *
   * 采集是**进程级全局**的，但监听是每个来源一份。所以：
   *   owners 记「谁还要用」，只有 0→1 才真正 on + start，归 0 才真正 stop；
   *   任何一方退场只摘自己的监听，不碰别人的。
   * 没有这层协调时，回忆舞台（s7）结束会把主场景的采集一起停掉，
   * 之后主线背景再也不随倾斜动 —— 这是实测到的问题，不是理论风险。
   * ------------------------------------------------------------------ */
  var HUB = { owners: 0, running: false, chain: Promise.resolve() };

  function hubStart(mt, fn) {
    HUB.chain = HUB.chain.then(function () {
      /* on 只注册不启动、可重复注册（同函数引用去重），所以**每个组件都要注册自己的监听**，
         否则「各组件只移除自己的监听」就无从谈起：第二个场景挂上时若跳过注册，
         它一帧数据也收不到，还以为是采集没起来。 */
      try { mt.onGyroscopeChange(fn); }
      catch (e) { return { ok: false, err: e }; }          // §3.1 非法回调同步抛 TypeError
      if (HUB.running) { return { ok: true }; }            // 采集已在跑，不必重复 start
      var p;
      try { p = mt.startGyroscope({ interval: INTERVAL }); }
      catch (e) { safeOff(mt, fn); return { ok: false, err: e }; }
      return Promise.resolve(p).then(function () {
        HUB.running = true;
        return { ok: true };
      }, function (err) {
        safeOff(mt, fn);                                    // 启失败要回滚监听，否则空转
        return { ok: false, err: err };
      });
    }, function () { return { ok: false, err: null }; });
    return HUB.chain;
  }

  function hubStop(mt) {
    HUB.chain = HUB.chain.then(function () {
      if (HUB.owners > 0) { return true; }                  // 还有组件在用，别停采集
      if (!HUB.running) {
        /* 未启动时调 stop 也成功（§3.14），故这里照样发一次，清掉可能的残留采集 */
        if (!mt || typeof mt.stopGyroscope !== 'function') { return true; }
        try { Promise.resolve(mt.stopGyroscope())['catch'](function () {}); } catch (e) {}
        return true;
      }
      HUB.running = false;
      if (!mt || typeof mt.stopGyroscope !== 'function') { return true; }
      var p;
      try { p = mt.stopGyroscope(); } catch (e) { return true; }
      return Promise.resolve(p).then(function () { return true; },
                                     function () { return true; });
    }, function () { return true; });
    return HUB.chain;
  }

  /* ------------------------------------------------------------------
   * 陀螺仪源
   * ------------------------------------------------------------------ */
  function GyroSource(onUpdate) {
    this.onUpdate = onUpdate;
    // gain 决定「晃多大角度 → 场景动多少」。34 时 L5 常打满上限（观感是「画面被甩」），
    // 16 又几乎看不出动。取 22/17：温和晃动走到中段，刻意大幅晃动才近上限。
    this.sx = new SpringSystem({ k: 42, c: 8.5, gain: 22, clamp: 1 });
    this.sy = new SpringSystem({ k: 42, c: 8.5, gain: 17, clamp: 1 });
    this.running = false;
    // idle / running / stopped / no-hardware / no-frames / old-client / version-unknown / unsupported / failed
    this.state = 'idle';
    this.ver = null;
    this.owned = false;       // 是否已向 HUB 登记占用
    this.gotFrame = false;
    this.frames = 0;
    this.firstFrameMs = 0;
    this._startedAt = 0;
    this._wd = 0;
    this.q = Promise.resolve();
    this.onFrame = this.handleFrame.bind(this);
    this.onDead = null;       // 采集存活但长期无数据时的回调（门面据此降级）
  }

  GyroSource.prototype.isSupported = function () { return hasGyroApi(miniTool()); };

  /* 串行闸门：同一实例内启停按交互排队，避免连点并发 start */
  GyroSource.prototype._chain = function (fn) {
    var self = this;
    var prev = this.q || Promise.resolve();
    this.q = prev.then(function () { return fn.call(self); },
                       function () { return fn.call(self); });
    return this.q;
  };

  GyroSource.prototype.start = function () { return this._chain(this._start); };
  GyroSource.prototype.stop = function () { return this._chain(this._stop); };

  GyroSource.prototype._start = function () {
    var self = this;
    var mt = miniTool();
    if (!hasGyroApi(mt)) { this.state = 'unsupported'; return Promise.resolve(false); }
    if (this.running) { return Promise.resolve(true); }
    return resolveClientVersion().then(function (ver) {
      self.ver = ver;
      if (ver === null) { self.state = 'version-unknown'; return false; }
      if (ver < MIN_CLIENT) { self.state = 'old-client'; return false; }
      if (!self.owned) { self.owned = true; HUB.owners += 1; }
      return hubStart(mt, self.onFrame).then(function (r) {
        if (!r || !r.ok) { return self._fail(r && r.err, null); }
        self.running = true;
        self.state = 'running';
        self.gotFrame = false;
        self.frames = 0;
        self.firstFrameMs = 0;
        self._startedAt = Date.now();
        self._armWatchdog();
        return true;
      });
    });
  };

  /* 启动失败 / 异常退出：只摘自己的监听，采集按 owners 归零才停 */
  GyroSource.prototype._fail = function (err, stateOverride) {
    var mt = miniTool();
    this.running = false;
    this._clearWatchdog();
    if (this.owned) {
      this.owned = false;
      if (HUB.owners > 0) { HUB.owners -= 1; }
    }
    safeOff(mt, this.onFrame);
    this.state = stateOverride || ((err && err.errCode === 10002) ? 'no-hardware' : 'failed');
    if (this.state !== 'no-hardware') {
      // no-hardware 是正常设备差异，不必刷屏
      console.warn('[tilt] 陀螺仪不可用：', this.state,
        err && (err.errCode || err.errMsg || err.message));
    }
    return hubStop(mt).then(function () { return false; });
  };

  GyroSource.prototype._clearWatchdog = function () {
    if (this._wd) { clearTimeout(this._wd); this._wd = 0; }
  };

  /* 看门狗：start 成功但一帧都不来（权限被拒 / 传感器被占用）也要有出路 */
  GyroSource.prototype._armWatchdog = function () {
    var self = this;
    this._clearWatchdog();
    this._wd = setTimeout(function () {
      self._wd = 0;
      if (self.gotFrame || !self.running) { return; }
      self._fail({ errMsg: 'startGyroscope:ok but no frame in ' + FRAME_TIMEOUT + 'ms' }, 'no-frames');
      if (typeof self.onDead === 'function') { self.onDead(self.state); }
    }, FRAME_TIMEOUT);
  };

  GyroSource.prototype.handleFrame = function (frame) {
    /* 帧只保证是 {x,y,z}；非数字（字符串/NaN）混进弹簧会让 pos 变 NaN、画面永久不动 */
    if (!frame || typeof frame !== 'object') { return; }
    var x = frame.x, y = frame.y;
    if (typeof x !== 'number' || !isFinite(x)) { x = 0; }
    if (typeof y !== 'number' || !isFinite(y)) { y = 0; }
    if (!this.gotFrame) {
      this.gotFrame = true;
      this.firstFrameMs = Date.now() - this._startedAt;
      this._clearWatchdog();
    }
    this.frames += 1;
    // 绕 Y 轴 = 左右转；绕 X 轴 = 前后转。z（面内自旋）不参与，避免误触。
    var now = Date.now();
    this.onUpdate(this.sx.push(y, now), this.sy.push(x, now));
  };

  GyroSource.prototype._stop = function () {
    var mt = miniTool();
    this.running = false;
    this.state = 'stopped';
    this._clearWatchdog();
    if (this.owned) {
      this.owned = false;
      if (HUB.owners > 0) { HUB.owners -= 1; }
    }
    /* 先摘自己的监听，再按 owners 决定要不要真停采集（两者都必须发生） */
    safeOff(mt, this.onFrame);
    return hubStop(mt).then(function () { return true; });
  };

  /* ------------------------------------------------------------------
   * 设备姿态源（普通浏览器 / GitHub Pages）—— 实现放在 js/tilt-web.js，
   * 非容器环境首次使用时按需加载；容器内绝不请求（§4.1）。这里只是门面。
   * ------------------------------------------------------------------ */
  /* 自身脚本 URL → 同目录下的 tilt-web.js。
     不能写死 './js/tilt-web.js'：那是相对**页面**解析的，页面换了目录层级就 404
     （实测 _qa/ 下的验证页直接把 Pages 用的姿态源加载失败）。 */
  var SELF_SRC = (function () {
    var doc = global.document;
    if (!doc) { return ''; }
    var cs = doc.currentScript;
    if (cs && cs.src) { return cs.src; }
    var list = doc.getElementsByTagName('script');
    for (var i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].src && /tilt\.js(\?|#|$)/.test(list[i].src)) { return list[i].src; }
    }
    return '';
  })();
  var WEB_SRC = SELF_SRC ? SELF_SRC.replace(/[^\/]*$/, 'tilt-web.js') : './js/tilt-web.js';
  var webPromise = null;

  function ensureWebOrientation() {
    if (inContainer()) { return Promise.resolve(false); }   // 容器禁用，连文件都不请求
    if (global.OrientationSource) { return Promise.resolve(true); }
    if (webPromise) { return webPromise; }
    webPromise = new Promise(function (resolve) {
      var doc = global.document;
      if (!doc || !doc.createElement) { resolve(false); return; }
      var s = doc.createElement('script');
      s.src = WEB_SRC;
      s.async = true;
      s.onload = function () { resolve(!!global.OrientationSource); };
      s.onerror = function () { resolve(false); };
      (doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement).appendChild(s);
    });
    return webPromise;
  }

  function OrientationSource(onUpdate) {
    this.onUpdate = onUpdate;
    this.impl = null;
    this.enabled = false;
    this._load = null;
  }

  OrientationSource.prototype.ready = function () {
    var self = this;
    if (this.impl) { return Promise.resolve(true); }
    if (this._load) { return this._load; }
    this._load = ensureWebOrientation().then(function (ok) {
      if (!ok || !global.OrientationSource) { return false; }
      self.impl = new global.OrientationSource(self.onUpdate);
      return true;
    });
    return this._load;
  };

  OrientationSource.prototype.isSupported = function () {
    return !!this.impl && this.impl.isSupported();
  };

  OrientationSource.prototype.start = function () {
    var self = this;
    return this.ready().then(function (ok) {
      if (!ok) { return false; }
      return Promise.resolve(self.impl.start()).then(function (r) {
        self.enabled = !!r;
        return self.enabled;
      });
    })['catch'](function () { return false; });
  };

  OrientationSource.prototype.recenter = function () {
    if (this.impl && typeof this.impl.recenter === 'function') { this.impl.recenter(); }
  };

  OrientationSource.prototype.stop = function () {
    if (this.impl && typeof this.impl.stop === 'function') { this.impl.stop(); }
    this.enabled = false;
  };

  /* ------------------------------------------------------------------
   * 指针源（桌面兜底）
   * ------------------------------------------------------------------ */
  function PointerSource(el, onUpdate) {
    this.el = el; this.onUpdate = onUpdate;
    this.active = false;
    this.onMove = this.handle.bind(this);
    this.onLeave = function () { this.active = false; this.onUpdate(0, 0); }.bind(this);
  }

  PointerSource.prototype.start = function () {
    if (!this.el) { return; }
    this.el.addEventListener('pointermove', this.onMove);
    this.el.addEventListener('pointerleave', this.onLeave);
    /* 老 WebView / iOS Safari 13 之前没有 PointerEvent：补 touchmove，保证"手指拖着画面"能动 */
    if (!global.PointerEvent && this.el.addEventListener) {
      this.el.addEventListener('touchmove', this.onTouch, { passive: true });
      this.el.addEventListener('touchend', this.onLeave);
    }
  };
  PointerSource.prototype.onTouch = function (e) {
    var t = e.touches && e.touches[0];
    if (t) { this.handle(t); }
  };

  PointerSource.prototype.handle = function (e) {
    this.active = true;
    var r = this.el.getBoundingClientRect();
    var tx = ((e.clientX - r.left) / r.width - 0.5) * -2;
    var ty = ((e.clientY - r.top) / r.height - 0.5) * -1;
    this.onUpdate(clamp(tx, -1, 1), clamp(ty, -1, 1));
  };

  PointerSource.prototype.stop = function () {
    if (!this.el) { return; }
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
    if (this.el.removeEventListener) {
      this.el.removeEventListener('touchmove', this.onTouch);
      this.el.removeEventListener('touchend', this.onLeave);
    }
  };

  /* ------------------------------------------------------------------
   * 门面：自动挑源
   *   prefer: 'gyro' | 'orientation' | 'pointer'
   *   优先级默认 gyro → orientation → pointer（容器内 orientation 自动跳过）
   * ------------------------------------------------------------------ */
  function TiltController(opts) {
    opts = opts || {};
    this.onUpdate = opts.onUpdate || function () {};
    this.onSwitch = opts.onSwitch || null;
    var self = this;
    this.gyro = new GyroSource(this.forward.bind(this));
    /* 采集活着但长时间没有数据 → 降级到指针，别让画面死着 */
    this.gyro.onDead = function () { self._degrade(); };
    this.orientation = new OrientationSource(this.forward.bind(this));
    this.pointer = null;
    this.active = 'none';
    this.tx = 0; this.ty = 0;
    this.idle = true;
    this._detachGesture = null;
  }

  TiltController.prototype.forward = function (tx, ty) {
    this.tx = tx; this.ty = ty;
    this.idle = (Math.abs(tx) < 0.02 && Math.abs(ty) < 0.02);
    this.onUpdate(this.tx, this.ty);
  };

  TiltController.prototype.attachPointer = function (el) {
    this.pointer = new PointerSource(el, this.forward.bind(this));
    return this;
  };

  TiltController.prototype._setActive = function (kind) {
    this.active = kind;
    if (typeof this.onSwitch === 'function') { this.onSwitch(kind); }
    return kind;
  };

  TiltController.prototype._degrade = function () {
    if (this.pointer) { this.pointer.start(); this._setActive('pointer'); }
    else { this._setActive('none'); }
    this.forward(0, 0);
  };

  TiltController.prototype.start = function (prefer) {
    var self = this;
    var order = prefer ? [prefer] : ['gyro', 'orientation', 'pointer'];
    function tryNext(i) {
      if (i >= order.length) { return Promise.resolve('none'); }
      var kind = order[i];
      if (kind === 'gyro') {
        return self.gyro.start().then(function (ok) {
          if (ok) { return self._setActive('gyro'); }
          return tryNext(i + 1);
        });
      }
      if (kind === 'orientation') {
        if (inContainer()) { return tryNext(i + 1); }   // §4.1：容器内禁用，直接跳过
        return Promise.resolve(self.orientation.start()).then(function (ok) {
          if (ok) { return self._setActive('orientation'); }
          return tryNext(i + 1);
        });
      }
      if (kind === 'pointer') {
        if (self.pointer) { self.pointer.start(); return self._setActive('pointer'); }
        return tryNext(i + 1);
      }
      return tryNext(i + 1);
    }
    return tryNext(0);
  };

  TiltController.prototype.stop = function () {
    var p = this.gyro.stop();          // 返回 promise：调用方可以等清理完成
    this.orientation.stop();
    if (this.pointer) { this.pointer.stop(); }
    if (this._detachGesture) { this._detachGesture(); this._detachGesture = null; }
    this.active = 'none';
    return p;
  };

  /* 运行时自检：一眼看出「走的是哪个源、卡在哪一步、有没有真收到帧」 */
  TiltController.prototype.status = function () {
    return {
      active: this.active,
      tx: +this.tx.toFixed(3),
      ty: +this.ty.toFixed(3),
      container: inContainer(),
      gyro: {
        supported: this.gyro.isSupported(),
        state: this.gyro.state,
        running: this.gyro.running,
        clientVersion: this.gyro.ver,
        minClient: MIN_CLIENT,
        frames: this.gyro.frames,
        firstFrameMs: this.gyro.firstFrameMs,
        owners: HUB.owners,
        collecting: HUB.running
      }
    };
  };

  /* ★手势内补申请姿态权限（2026-11-02 手机实测）：仅普通浏览器需要。
   *   容器内禁用设备姿态（§4.1），这里直接不挂监听。
   *   返回 detach，供场景销毁时摘除（原来三个监听挂上就再也没摘过）。 */
  TiltController.prototype.retryOnGesture = function (el, onSwitch) {
    var self = this;
    var host = el || global;
    var done = false;
    if (inContainer() || !host || !host.addEventListener) { return function () {}; }
    function detach() {
      if (!host.removeEventListener) { return; }
      host.removeEventListener('touchend', attempt);
      host.removeEventListener('click', attempt);
      host.removeEventListener('pointerup', attempt);
    }
    function attempt() {
      if (done) { return; }
      done = true;
      detach();
      if (self.active === 'gyro' || self.active === 'orientation') { return; }
      self.orientation.start().then(function (ok) {
        if (!ok) { return; }
        self._setActive('orientation');
        if (typeof onSwitch === 'function') { onSwitch('orientation'); }
      });
    }
    host.addEventListener('touchend', attempt, { passive: true });
    host.addEventListener('click', attempt);
    host.addEventListener('pointerup', attempt);
    this._detachGesture = detach;
    return detach;
  };

  TiltController.prototype.recenter = function () {
    this.gyro.sx.reset(); this.gyro.sy.reset();
    this.orientation.recenter();
    this.forward(0, 0);
    // 通知渲染层「立即归位」，避免靠 lerp 慢慢收敛（实测残留 ~10px）
    if (typeof this.onRecenter === 'function') { this.onRecenter(); }
  };

  global.TiltController = TiltController;
  /* 给自检页/测试用的只读探针：采集协调器的全局状态 */
  global.TQ_TILT_HUB = HUB;
  global.TQ_TILT_INFO = { MIN_CLIENT: MIN_CLIENT, INTERVAL: INTERVAL, FRAME_TIMEOUT: FRAME_TIMEOUT };
})(typeof window !== 'undefined' ? window : this);
