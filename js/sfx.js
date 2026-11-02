/* 天清往事 · 音效层（2026-11-01 v1）
 * 设计约束：
 *  ① 零外部音频文件 —— 全部 WebAudio 现场合成。包体 <2MB 的硬上限下，
 *     一条 3 秒 mp3 就吃掉 5% 预算；合成音只占几百字节代码。
 *  ② Chrome 61 基线 —— 只用 createBufferSource / BiquadFilter / Gain / Oscillator，
 *     不用 AudioWorklet、不用 `?.`。
 *  ③ 无 BGM（作者偏好）—— 本层只做「动作反馈音」，不做环境/情绪铺底。
 *  ④ 音色取向：木质、纸页、玉石——短促、干、无混响尾，避免电子味盖过古意。
 *  ⑤ 自动播放策略：AudioContext 必须在用户手势里创建/恢复，故 ensure() 由首次点击触发。
 */
(function (global) {
  'use strict';

  var ctx = null, master = null;
  var enabled = true, vol = 0.55;
  var lastAt = {};            /* 同名音效节流，避免自动模式连响 */
  var THROTTLE = { advance: 55, tap: 30, select: 120, open: 80, close: 80, bead: 200, brush: 70 };

  function AC() { return global.AudioContext || global.webkitAudioContext; }

  function ensure() {
    if (!AC()) { return null; }
    if (!ctx) {
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      /* 2026-11-02 手机实测「听不到音效」：原来 master = vol×0.5 = 0.275，
       * 手机外放本来就轻，0.275 再乘各类音的 0.1~0.16 就接近听不见。
       * 提到 vol×0.9（默认 ≈0.50），并把各类音的相对比例保持不变。 */
      master.gain.value = vol * 0.9;
      master.connect(ctx.destination);
    }
    /* ★必须在用户手势里 resume（iOS/微信/小红书 WebView 都拦自动播放）。
     * 旧实现只在「要放某个音」时顺手 resume —— 而首次放音往往发生在自动推进
     * （setTimeout/rAF）里，不是手势，resume 被拒后 ctx 一直 suspended，
     * 之后所有音都静默。现在额外在 document 上挂一次性手势解锁（见 unlock）。 */
    if (ctx.state === 'suspended' && ctx.resume) {
      try { ctx.resume(); } catch (e) {}
    }
    return ctx;
  }

  /* 手势解锁：document 级监听，第一次真实触摸/点击就把 AudioContext 建起来并 resume。
   * 只挂一次、只解一次；无 AudioContext 环境静默跳过。 */
  var unlocked = false, bound = false;
  function unlock() {
    if (unlocked) { return; }
    var c = ensure();
    if (!c) { return; }
    if (c.state === 'running') { unlocked = true; return; }
    if (c.resume) {
      try {
        var p = c.resume();
        if (p && p.then) { p.then(function () { unlocked = (c.state === 'running'); }, function () {}); }
      } catch (e) {}
    }
  }
  function bindUnlock() {
    if (bound || typeof document === 'undefined') { return; }
    bound = true;
    var opts = false;
    var once = function () { unlock(); };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('touchstart', once, opts);
    document.addEventListener('click', once, true);
    document.addEventListener('keydown', once, true);
    /* 切回前台可能被系统挂起：再解一次 */
    if (document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') { unlock(); }
      });
    }
  }
  bindUnlock();

  /* 噪声源：一次性生成 0.5s 衰减白噪，复用作纸页/笔触的基底 */
  var noiseBuf = null;
  function noiseBufOf(c) {
    if (!noiseBuf) {
      var n = Math.floor(c.sampleRate * 0.5);
      noiseBuf = c.createBuffer(1, n, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < n; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / n); }
    }
    return noiseBuf;
  }

  /* 一段带通噪声（纸、笔、木） */
  function noiseHit(c, t0, dur, freq, q, gain, type) {
    var src = c.createBufferSource();
    src.buffer = noiseBufOf(c);
    var bp = c.createBiquadFilter();
    bp.type = type || 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    var g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.012, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /* 一个正弦/三角音（玉石、钟磬） */
  function tone(c, t0, dur, f, gain, type) {
    var o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    var g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  var SFX = {
    /* 推进对话：一页纸被轻轻掀过 */
    advance: function (c, t) {
      noiseHit(c, t, 0.075, 2400, 0.9, 0.16);
      noiseHit(c, t + 0.012, 0.05, 900, 1.1, 0.08);
    },
    /* 按钮按下：干木头一声 */
    tap: function (c, t) {
      noiseHit(c, t, 0.035, 1500, 1.4, 0.13);
      tone(c, t, 0.05, 320, 0.05, 'triangle');
    },
    /* 选择确认：宫→商，两声短磬 */
    select: function (c, t) {
      tone(c, t, 0.18, 587.33, 0.14);       /* D5 */
      tone(c, t + 0.09, 0.22, 880, 0.10);   /* A5 */
      noiseHit(c, t, 0.03, 3000, 2, 0.05);
    },
    /* 浮层开：纸卷展开 */
    open: function (c, t) {
      noiseHit(c, t, 0.16, 1200, 0.7, 0.10, 'lowpass');
    },
    /* 浮层关：纸页合上 */
    close: function (c, t) {
      noiseHit(c, t, 0.11, 800, 0.8, 0.09, 'lowpass');
    },
    /* 获得瓷片/完成：三音上行（宫·商·角） */
    bead: function (c, t) {
      tone(c, t, 0.28, 523.25, 0.13);          /* C5 */
      tone(c, t + 0.10, 0.30, 659.25, 0.11);   /* E5 */
      tone(c, t + 0.21, 0.40, 783.99, 0.09);   /* G5 */
      noiseHit(c, t + 0.02, 0.05, 2600, 1.6, 0.04);
    },
    /* 笔触：短促摩擦（描红/研墨用） */
    brush: function (c, t) {
      noiseHit(c, t, 0.045, 1700, 1.8, 0.07);
    }
  };

  var SFX_NAMES = ['advance', 'tap', 'select', 'open', 'close', 'bead', 'brush'];

  function play(name) {
    if (!enabled) { return; }
    if (SFX_NAMES.indexOf(name) < 0) { return; }
    var c = ensure();
    if (!c) { return; }
    var now = c.currentTime;
    var gap = (THROTTLE[name] || 40) / 1000;
    if (lastAt[name] && (now - lastAt[name]) < gap) { return; }  /* 节流：自动模式不会连成一片 */
    lastAt[name] = now;
    try { SFX[name](c, now + 0.002); } catch (e) { /* 音频失败不影响游戏 */ }
  }

  global.TQSFX = {
    play: play,
    names: SFX_NAMES,
    /* 静音开关（设置面板与存档都可调） */
    setEnabled: function (v) { enabled = !!v; if (enabled) { ensure(); } },
    isEnabled: function () { return enabled; },
    setVolume: function (v) {
      vol = Math.max(0, Math.min(1, v));
      if (master) { master.gain.value = vol * 0.9; }
    },
    /* 供设定页「试听」与探针调用：解锁 + 放一个短音 */
    unlock: function () { unlock(); return (ctx && ctx.state) || 'none'; },
    volume: function () { return vol; },
    /* 供探针/调试：不发声音，只报告当前状态 */
    status: function () {
      return { supported: !!AC(), ready: !!ctx, state: ctx ? ctx.state : 'none',
        enabled: enabled, volume: vol };
    }
  };
}(window));
