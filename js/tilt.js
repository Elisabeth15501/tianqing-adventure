/*
 * tilt.js —— 视差输入源适配层
 *
 * 目标：把「设备姿态 → 归一化偏移 (tx, ty)」这件事在两套运行环境里统一起来。
 *   A. 小红书小工具沙箱（window.xhs.miniTool）
 *      —— 只提供「角速度」陀螺仪（rad/s），没有姿态角，没有磁力计/加速度计。
 *      —— 「手机倾斜了多少度」在这里不可知，只能知道「此刻在往哪转、转多快」，
 *         因此不能走「积分成姿态角」的常规路线（会累积零漂），
 *         改用二阶弹簧把角速度直接兑换成位移，天然自归零。详见下方 SpringSystem。
 *   B. 普通浏览器（GitHub Pages / 桌面）
 *      —— 有 deviceorientation / devicemotion，但 iOS 13+ 需用户手势授权，
 *         且部分设备在 HTTPS 之外拿不到事件。
 *   C. 指针拖拽（预览页兜底，桌面可玩）
 *
 * 统一输出：tx, ty ∈ [-1, 1]，正值表示「内容应向右/向下偏移」。
 * 调用方只认这三个值，不关心来源。
 *
 * Chrome 61 基线：无 flex gap、无 :has()、无容器查询、无 clamp()/min()/max()、
 * 间距全部用 margin。ES2017。
 */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  /* ------------------------------------------------------------------
   * 弹簧-阻尼系统（角速度 → 位移）
   *
   * 关键认知：小红书平台陀螺仪只给「角速度」(rad/s)，不给「姿态角」，
   * 且平台的加速度计 / 磁力计 / 罗盘一律不提供。
   * 因此「手机倾斜了多少度」在小红书里根本不可知 —— 只能知道
   * 「手机此刻正在往哪个方向转、转多快」。
   *
   * 若用纯积分模拟姿态，会持续累积零漂、慢慢跑飞；
   * 若积分 + 强回中，又会把「持续倾斜」一并抹平，
   * 表现为「摇手机画面几乎不动」（实测偏移仅 1.1px，等于没动）。
   *
   * 正确模型是二阶弹簧：
   *     pos'' = gain·ω − k·pos − c·pos'
   * 旋转手机 → 场景朝该方向位移并带一点回弹；
   * 停止旋转 → 场景自行荡回中位。
   * 天然自归零，不累积漂移，且手感比积分更像「镜头被晃了一下」。
   * ------------------------------------------------------------------ */
  function SpringSystem(opts) {
    this.pos = 0;
    this.vel = 0;
    this.last = 0;                       // 上一帧时间戳，用于算真实 dt
    this.k = (opts && opts.k) || 42;        // 刚度（回中力）
    this.c = (opts && opts.c) || 8.5;       // 阻尼（略欠阻尼，留一点回弹）
    this.gain = (opts && opts.gain) || 34;  // 角速度 → 驱动力
    this.clamp = (opts && opts.clamp) || 1;
  }

  SpringSystem.prototype.push = function (omega, now) {
    // dt 必须取真实帧间隔：小红书 ui 档 60ms 一帧，浏览器 deviceorientation
    // 约 60Hz（16ms），两者相差近 4 倍。若写死 0.016，60ms 档会把物理时间
    // 压缩 3.7 倍 —— 表现为「该回中时迟迟不回」和「上限处黏着不下落」。
    // 首帧 / 同毫秒内重复 / 切后台超时间距，一律夹到安全区间。
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
   * 平台能力探测（严格按小红书小工具规范 §3.14 / §3.6）
   *
   * 规范要求四件事，缺一条就不算合规：
   *   ① 四个方法都要 typeof === 'function'（start/stop/on/off 缺一不可，
   *      少一个 off 会导致「只停采集、监听不摘」，泄漏回调）；
   *   ② 客户端版本 ≥ 9.50（buildVersion 末 3 位是打包序号，必须 floor(/1000)）；
   *   ③ 同步 buildVersion 缺失时退回 getLaunchOptions 异步取；
   *      同步/异步都取不到 ⇒ 按「不支持」处理（不硬上）；
   *   ④ 硬件有无靠「启动失败 errCode 10002」暴露，没有独立探测 API。
   * ------------------------------------------------------------------ */
  var MIN_CLIENT = 9500;   // 9.50.0
  var GYRO_APIS = ['startGyroscope', 'stopGyroscope', 'onGyroscopeChange', 'offGyroscopeChange'];

  function miniTool() {
    return (global.xhs && global.xhs.miniTool) || null;
  }

  function hasGyroApi(mt) {
    if (!mt) { return false; }
    for (var i = 0; i < GYRO_APIS.length; i += 1) {
      if (typeof mt[GYRO_APIS[i]] !== 'function') { return false; }
    }
    return true;
  }

  /* buildVersion → 客户端版本号。末 3 位是编译/打包序号，判断时必须忽略。 */
  function toClientVersion(bv) {
    var n = typeof bv === 'string' ? parseInt(bv, 10) : bv;
    return (typeof n === 'number' && isFinite(n) && n > 0) ? Math.floor(n / 1000) : null;
  }

  function readClientVersion() {
    return toClientVersion((global.xhs || {}).buildVersion);
  }

  /* 同步取不到再走 getLaunchOptions；两条路都取不到 ⇒ null（按不支持处理） */
  function resolveClientVersion() {
    var v = readClientVersion();
    if (v !== null) { return Promise.resolve(v); }
    var mt = miniTool();
    if (!mt || typeof mt.getLaunchOptions !== 'function') { return Promise.resolve(null); }
    var p;
    try { p = mt.getLaunchOptions(); } catch (e) { return Promise.resolve(null); }
    return Promise.resolve(p).then(function (opts) {
      var bv = opts && (opts.buildVersion ||
        (opts.query && opts.query.buildVersion) ||
        (opts.referrerInfo && opts.referrerInfo.buildVersion));
      return toClientVersion(bv);
    })['catch'](function () { return null; });
  }

  /* ------------------------------------------------------------------
   * 陀螺仪源（小红书小工具专用）
   * 平台 API 只给角速度 {x,y,z}（rad/s），不给姿态角，所以走弹簧兑换位移。
   * ------------------------------------------------------------------ */
  function GyroSource(onUpdate) {
    this.onUpdate = onUpdate;
    // gain 决定「晃多大角度 → 场景动多少」。实测 gain=34 时 L5 常打满上限，
    // 观感是「画面被甩」而非「镜头微晃」；34→16 又偏保守，竖屏下几乎看不出动。
    // 取中值 22/17：温和晃动也能走到中段，刻意大幅晃动才接近上限，跟手且不甩。
    this.sx = new SpringSystem({ k: 42, c: 8.5, gain: 22, clamp: 1 });
    this.sy = new SpringSystem({ k: 42, c: 8.5, gain: 17, clamp: 1 });
    this.running = false;
    this.state = 'idle';      // idle / running / stopped / no-hardware / old-client / unsupported / failed
    this.ver = null;          // 客户端版本号（floor(buildVersion/1000)）
    this.q = Promise.resolve();   // 串行闸门
    this.onFrame = this.handleFrame.bind(this);
  }

  GyroSource.prototype.isSupported = function () {
    return hasGyroApi(miniTool());
  };

  /* 串行闸门：规范要求「按交互串行调用，前一次操作结束后再执行下一次」。
     所有启停排进同一条 promise 链，避免连点导致并发 startGyroscope。 */
  GyroSource.prototype._chain = function (fn) {
    var self = this;
    var prev = this.q || Promise.resolve();
    this.q = prev.then(function () { return fn.call(self); },
                       function () { return fn.call(self); });
    return this.q;
  };

  GyroSource.prototype.start = function () {
    return this._chain(this._start);
  };

  GyroSource.prototype._start = function () {
    var self = this;
    var mt = miniTool();
    if (!hasGyroApi(mt)) { this.state = 'unsupported'; return Promise.resolve(false); }
    if (this.running) { return Promise.resolve(true); }
    return resolveClientVersion().then(function (ver) {
      self.ver = ver;
      /* 版本未知或 < 9.50 ⇒ 不上；调用方自然回落到 orientation / pointer */
      if (ver === null || ver < MIN_CLIENT) {
        self.state = 'old-client';
        return false;
      }
      /* 顺序是规范写死的：先注册监听，再开始采集（on 不启动采集） */
      mt.onGyroscopeChange(self.onFrame);
      var p;
      try {
        p = mt.startGyroscope({ interval: 'ui' });   // ui = 60ms，normal 默认 200ms
      } catch (e) {
        return self._fail(e);
      }
      return Promise.resolve(p).then(function () {
        self.running = true; self.state = 'running';
        return true;
      }, function (err) { return self._fail(err); });
    });
  };

  /* 启动失败：回滚监听 + 记录原因（10002 = 设备无陀螺仪） */
  GyroSource.prototype._fail = function (err) {
    var mt = miniTool();
    try { if (mt && typeof mt.offGyroscopeChange === 'function') { mt.offGyroscopeChange(this.onFrame); } } catch (e) {}
    this.running = false;
    this.state = (err && err.errCode === 10002) ? 'no-hardware' : 'failed';
    console.warn('[tilt] 陀螺仪启动失败：', err && (err.errCode || err.errMsg || err.message));
    return false;
  };

  GyroSource.prototype.handleFrame = function (frame) {
    // 绕 Y 轴 = 左右转；绕 X 轴 = 前后转。z（面内自旋）不参与，避免误触。
    // 帧里是角速度 rad/s，不是姿态角；不带 errMsg。
    var now = Date.now();
    var tx = this.sx.push(frame.y || 0, now);
    var ty = this.sy.push(frame.x || 0, now);
    this.onUpdate(tx, ty);
  };

  GyroSource.prototype.stop = function () {
    return this._chain(this._stop);
  };

  GyroSource.prototype._stop = function () {
    var self = this;
    var mt = miniTool();
    if (!mt) { this.running = false; this.state = 'stopped'; return Promise.resolve(false); }
    /* 规范顺序：先停采集，再解除监听；停止失败也要解除（finally 语义）。
       另外 stopGyroscope 是异步的，必须 catch，否则弱网/后台会抛 unhandled rejection。 */
    var p = null;
    try {
      if (typeof mt.stopGyroscope === 'function' && this.running) { p = mt.stopGyroscope(); }
    } catch (e) { p = null; }
    return Promise.resolve(p)['catch'](function (err) {
      console.warn('[tilt] 停止陀螺仪失败：', err && (err.errCode || err.errMsg || err.message));
    }).then(function () {
      try { if (typeof mt.offGyroscopeChange === 'function') { mt.offGyroscopeChange(self.onFrame); } } catch (e) {}
      self.running = false; self.state = 'stopped';
      return true;
    });
  };

  /* ------------------------------------------------------------------
   * 设备姿态源（普通浏览器 / GitHub Pages）
   * deviceorientation 直接给 beta/gamma 姿态角，无需积分，无漂移。
   * ------------------------------------------------------------------ */
  function OrientationSource(onUpdate) {
    this.onUpdate = onUpdate;
    this.baseBeta = null;
    this.baseGamma = null;
    this.enabled = false;
    this.onOri = this.handle.bind(this);
  }

  OrientationSource.prototype.isSupported = function () {
    return typeof global.DeviceOrientationEvent !== 'undefined';
  };

  OrientationSource.prototype.start = function () {
    if (!this.isSupported() || this.enabled) { return Promise.resolve(false); }
    var self = this;
    global.addEventListener('deviceorientation', this.onOri, true);
    this.enabled = true;
    // iOS 13+ 需要用户手势内显式授权；失败不致命，回落到指针/自动。
    if (typeof global.DeviceOrientationEvent.requestPermission === 'function') {
      return global.DeviceOrientationEvent.requestPermission()
        .then(function (r) { return r === 'granted'; })
        .catch(function () { return false; });
    }
    return Promise.resolve(true);
  };

  OrientationSource.prototype.handle = function (e) {
    if (e.beta === null && e.gamma === null) { return; }
    if (this.baseBeta === null) { this.baseBeta = e.beta || 0; this.baseGamma = e.gamma || 0; }
    // 以首次读数为中位，人再动就相对它偏移
    var dGamma = (e.gamma || 0) - this.baseGamma;
    var dBeta = (e.beta || 0) - this.baseBeta;
    var tx = clamp(dGamma / 22, -1, 1);
    var ty = clamp(dBeta / 22, -1, 1);
    this.onUpdate(tx, ty);
  };

  OrientationSource.prototype.recenter = function () {
    this.baseBeta = null; this.baseGamma = null;
  };

  OrientationSource.prototype.stop = function () {
    if (!this.enabled) { return; }
    global.removeEventListener('deviceorientation', this.onOri, true);
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
   *   优先级默认 gyro → orientation → pointer
   * ------------------------------------------------------------------ */
  function TiltController(opts) {
    opts = opts || {};
    this.onUpdate = opts.onUpdate || function () {};
    this.gyro = new GyroSource(this.forward.bind(this));
    this.orientation = new OrientationSource(this.forward.bind(this));
    this.pointer = null;
    this.active = 'none';
    this.tx = 0; this.ty = 0;
    this.idle = true;      // 无输入 → 交给自动游移
  }

  TiltController.prototype.forward = function (tx, ty) {
    this.tx = tx; this.ty = ty;
    this.idle = (Math.abs(tx) < 0.02 && Math.abs(ty) < 0.02);
    this.onUpdate(this.tx, this.ty);
  };

  TiltController.prototype.attachPointer = function (el) {
    this.pointer = new PointerSource(el, this.forward.bind(this));
  };

  TiltController.prototype.start = function (prefer) {
    var self = this;
    var order = prefer ? [prefer] : ['gyro', 'orientation', 'pointer'];
    function tryNext(i) {
      if (i >= order.length) { return Promise.resolve('none'); }
      var kind = order[i];
      if (kind === 'gyro') {
        return self.gyro.start().then(function (ok) {
          if (ok) { self.active = 'gyro'; return 'gyro'; }
          return tryNext(i + 1);
        });
      }
      if (kind === 'orientation') {
        return self.orientation.start().then(function (ok) {
          if (ok) { self.active = 'orientation'; return 'orientation'; }
          return tryNext(i + 1);
        });
      }
      if (kind === 'pointer') {
        if (self.pointer) { self.pointer.start(); self.active = 'pointer'; return 'pointer'; }
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
    this.active = 'none';
    return p;
  };

  /* 运行时自检：一眼看出「到底走的是哪个源、卡在哪一步」 */
  TiltController.prototype.status = function () {
    return {
      active: this.active,
      tx: +this.tx.toFixed(3),
      ty: +this.ty.toFixed(3),
      gyro: { supported: this.gyro.isSupported(), state: this.gyro.state,
              running: this.gyro.running, clientVersion: this.gyro.ver,
              minClient: MIN_CLIENT }
    };
  };

  /* ★手势内补申请姿态权限（2026-11-02 手机实测）：
   *   iOS 13+ 的 DeviceOrientationEvent.requestPermission() 必须**在用户手势里**调用。
   *   场景挂载发生在进入这一幕的点击里，但启动链是异步的（版本探测 → 启动），
   *   等轮到 orientation.start() 时手势上下文已经丢了 ⇒ 被拒 ⇒ 只剩 pointer，
   *   手机上表现就是「背景完全不随倾斜动」。
   *   这里在第一次真实触摸/点击时再申请一次；成功就把输入源切成 orientation。 */
  TiltController.prototype.retryOnGesture = function (el, onSwitch) {
    var self = this;
    var host = el || global;
    var done = false;
    function attempt() {
      if (done) { return; }
      done = true;
      if (self.active === 'gyro' || self.active === 'orientation') { return; }
      self.orientation.start().then(function (ok) {
        if (!ok) { return; }
        self.active = 'orientation';
        if (typeof onSwitch === 'function') { onSwitch('orientation'); }
      });
    }
    if (host && host.addEventListener) {
      host.addEventListener('touchend', attempt, { passive: true });
      host.addEventListener('click', attempt);
      host.addEventListener('pointerup', attempt);
    }
    return this;
  };

  TiltController.prototype.recenter = function () {
    this.gyro.sx.reset(); this.gyro.sy.reset();
    this.orientation.recenter();
    this.forward(0, 0);
    // 通知渲染层「立即归位」，避免靠 lerp 慢慢收敛（实测残留 ~10px）
    if (typeof this.onRecenter === 'function') { this.onRecenter(); }
  };

  global.TiltController = TiltController;
})(typeof window !== 'undefined' ? window : this);
