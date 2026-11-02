/*
 * tilt-web.js —— 设备姿态源（仅普通浏览器 / GitHub Pages）
 *
 * ★ 为什么单独一个文件：
 *   小红书小工具容器 §4.1 明确禁用「设备朝向 / 设备运动」等 Web 传感器，
 *   且小工具上传前的静态校验是**纯标识符扫描**（连注释里出现也会判 ERROR）。
 *   本文件因此不进入小工具包；tilt.js 只在检测不到 window.xhs 时才按需加载它。
 *   容器内既不请求、也不执行 —— 两道闸（tilt.js 的 inContainer + 本文件的 isSupported）。
 *
 * 数据来源：设备姿态事件直接给 beta/gamma 姿态角，无需积分，无漂移。
 * 与容器内的角速度弹簧是两套模型，别互相套用。
 */
(function (global) {
  'use strict';

  var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
  var hasOri = function () { return typeof global.DeviceOrientationEvent !== 'undefined'; };
  var inContainer = function () { return !!(global.xhs && global.xhs.miniTool); };

  function OrientationSource(onUpdate) {
    this.onUpdate = onUpdate;
    this.baseBeta = null;
    this.baseGamma = null;
    this.enabled = false;
    this.onOri = this.handle.bind(this);
  }

  OrientationSource.prototype.isSupported = function () {
    return !inContainer() && hasOri();
  };

  OrientationSource.prototype.start = function () {
    if (!this.isSupported() || this.enabled) { return Promise.resolve(false); }
    global.addEventListener('deviceorientation', this.onOri, true);
    this.enabled = true;
    /* iOS 13+ 需要用户手势内显式授权；失败不致命，回落到指针/自动。
       注意：这段授权必须在用户手势里调用，tilt.js 的 retryOnGesture 就是为此存在。 */
    if (typeof global.DeviceOrientationEvent.requestPermission === 'function') {
      return global.DeviceOrientationEvent.requestPermission()
        .then(function (r) { return r === 'granted'; })
        ['catch'](function () { return false; });
    }
    return Promise.resolve(true);
  };

  OrientationSource.prototype.handle = function (e) {
    if (!e) { return; }
    if (e.beta === null && e.gamma === null) { return; }
    if (this.baseBeta === null) { this.baseBeta = e.beta || 0; this.baseGamma = e.gamma || 0; }
    /* 以首次读数为中位，人再动就相对它偏移 */
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

  global.OrientationSource = OrientationSource;
})(typeof window !== 'undefined' ? window : this);
