/*
 * scene-parallax.js —— 场景三层视差引擎层（S5 滋德殿旧址首用 · 2026-11-02）
 *
 * 职责：把「一张场景图」变成「可被陀螺仪驱动的三层结构」，并把「到底几层真的生效了」
 *      这件事变成可以在运行时读出来的数（SP.audit / SP.selftest），而不是靠肉眼判断。
 *
 * ── 层从哪来（构建侧，见 artdraft/ai_gen/build_s5_layers.py）──────────────
 *   bg  data-k=0.30  原图，一个像素都不改
 *   mg  data-k=0.60  暖光场：原图暖色高光的超低频版本（高斯 r=46px），黑底 RGB
 *   fg  data-k=1.00  浮尘层：程序化微尘 + 低位暖雾，黑底 RGB
 *   mg/fg 用 mix-blend-mode:screen 叠在 bg 上 —— 黑在 screen 下等于透明，
 *   所以静止态三层合成 == 原图（实测平均 Δ1.3/255），不会出现「一开预览画质就掉」。
 *
 * ── 为什么位移量用 k 系数而不是层深 d ─────────────────────────────────────
 *   S7 瓷心用 d=6/26/64（相对 dmax=64 归一 → 0.09/0.41/1.00），bg 只走 2.4px。
 *   那套在 S7 成立是因为瓷片本身就是离散物体；搬到 S5 这种整幅平图上，
 *   bg 几乎不动 = 整幅没动，手感为零。S5 改 k=0.30/0.60/1.00 × LIM30
 *   ⇒ BG 9 / MG 18 / FG 30px，单层场景靠整幅平移量撑手感。
 *
 * ── 兼容 ────────────────────────────────────────────────────────────────
 *   Chrome 61 / ES2017 · 无箭头函数以外的新语法 · 不依赖任何第三方库 · 不写 inline
 *   样式（样式由本文件以 <style id="sp-style"> 注入一次，预览页与游戏内共用同一份，
 *   避免「预览好看、实装走样」）。
 */
(function (global) {
  'use strict';

  var SP = { version: '1.0.0' };

  /* 资产根前缀。游戏内页面在仓库根 ⇒ 保持 ''；
     预览页在 preview/ 子目录 ⇒ 调用方在 mount 前设 SceneParallax.base = '../'。
     注意不能用「相对 js 文件」推导 —— 模块是 <script src> 引入的，路径基准是页面，不是模块。 */
  SP.base = '';
  var REG = {};
  var INST = {};            // el 的唯一 id -> instance（用属性存，不用 Map，兼容更老内核）

  /* 层序固定：bg 在下，mg 中，fg 上。缺一层就不是三层结构，mount 会报错而不是静默降级。 */
  var ORDER = ['bg', 'mg', 'fg'];

  var CSS = [
    '.spl-stage{position:relative;overflow:hidden;background:#0B0908;touch-action:none}',
    /* 层比舞台大 14%（六面各溢 7%）：LIM30 最坏位移占舞台宽 2%，永远看不到层的直边 */
    '.spl{position:absolute;left:-7%;top:-7%;width:114%;height:114%;',
    '  will-change:transform;pointer-events:none;transform:translate3d(0,0,0)}',
    '.spl img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 50%;',
    '  -webkit-user-drag:none;user-select:none}',
    /* 加色层：黑=透明。注意 bg 必须保持 normal —— 这是「静止态==原图」的结构前提。
       真物体分层（cfg.additive=false）时 mg/fg 是 RGBA 贴片，用 normal + alpha。
       特异性 (0,3,0) > (0,2,0)，按实例属性覆盖。 */
    '.spl[data-l="mg"],.spl[data-l="fg"]{mix-blend-mode:screen}',
    '.spl[data-l="bg"]{mix-blend-mode:normal}',
    '[data-sp-additive="0"] .spl[data-l="mg"],[data-sp-additive="0"] .spl[data-l="fg"]{mix-blend-mode:normal}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('sp-style')) { return; }
    var s = document.createElement('style');
    s.id = 'sp-style';
    s.appendChild(document.createTextNode(CSS));
    (document.head || document.documentElement).appendChild(s);
  }

  /* ------------------------------------------------------------------ */
  /* 注册表                                                              */
  /* ------------------------------------------------------------------ */
  function def(key, cfg) { REG[key] = cfg; return SP; }

  /* S5 滋德殿旧址（750×1080 竖 / 1500×630 横，资产在 assets/scenes/s5_zide{,_h}/）
     v3 真·物体分层：bg=补全图（RGB），mg/fg=轮廓贴片（RGBA）⇒ additive:false */
  def('s5_zide', {
    dir: { h: 'assets/scenes/s5_zide_h', v: 'assets/scenes/s5_zide' },
    size: { h: [1500, 630], v: [750, 1080] },
    ks: { bg: 0.30, mg: 0.60, fg: 1.00 },
    lim: 30,          // 单层最大位移 px（k=1 那层）
    bgScale: 0.012,   // bg 额外缩放：|cx| 最大时 +1.2%，补「镜头在推」的错觉
    additive: false,  // mg/fg 用 normal+alpha（物体贴片），非黑底 screen
    title: 'S5 滋德殿旧址'
  });

  SP.register = def;

  /* ------------------------------------------------------------------ */
  /* 实例                                                                */
  /* ------------------------------------------------------------------ */
  var uid = 0;

  function Parallax(el, key, opts) {
    opts = opts || {};
    var cfg = REG[key];
    if (!cfg) { throw new Error('[SP] 未注册的场景：' + key); }
    this.el = el;
    this.key = key;
    this.cfg = cfg;
    this.form = opts.form || 'h';
    this.base = (typeof opts.base === 'string') ? opts.base : (SP.base || '');
    this.lim = opts.lim || cfg.lim;
    /* 加色模式（v2 黑底 screen 层）默认开；真·物体分层（RGBA normal）置 false */
    this.additive = (cfg.additive !== false);
    this.enabled = { bg: true, mg: true, fg: true };
    this.tx = 0; this.ty = 0;      // 目标（来自 tilt）
    this.cx = 0; this.cy = 0;      // 当前（lerp 后）
    this.raf = 0;
    this._lastProbe = null;
    this.el.__sp = this;
    this.el.setAttribute('data-spl-key', key);
    this.el.setAttribute('data-sp-additive', this.additive ? '1' : '0');
    this._build();
    this._measure();
    var self = this;
    global.addEventListener('resize', function () { self._measure(); });
    this._start();
    this._inputKind = 'none';
    this._ctrl = null;
    /* 输入源：默认自动（陀螺仪 → 设备姿态 → 指针）。
       opts.input = false 关闭；'pointer' 强制只走指针（桌面调试）。
       ★ 生命周期按小红书规范「业务结束时主动清理」：mount 即启，destroy 即停，
         不依赖卸载阶段的异步调用。 */
    if (opts.input !== false && global.TiltController) {
      var ctrl = new global.TiltController({
        onUpdate: function (a, b) { self.setInput(a, b); }
      });
      ctrl.attachPointer(this.el);
      this._ctrl = ctrl;
      ctrl.start(opts.input === 'pointer' ? 'pointer' : null).then(function (kind) {
        self._inputKind = kind;
        self.el.setAttribute('data-spl-input', kind);
      });
    }
  }

  /* 拆场：停输入源（含陀螺仪采集与监听）+ 停帧 + 摘引用 */
  Parallax.prototype.destroy = function () {
    if (this._ctrl) {
      try { this._ctrl.stop(); } catch (e) { /* noop */ }
      this._ctrl = null;
      this._inputKind = 'none';
    }
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    if (this.el) {
      try { delete this.el.__sp; } catch (e) { this.el.__sp = null; }
      this.el.removeAttribute('data-spl-ready');
      this.el.removeAttribute('data-spl-input');
    }
    return true;
  };

  /* 输入源自检：界面/控制台一行就能问「现在是谁在驱动、陀螺仪卡在哪」 */
  Parallax.prototype.inputStatus = function () {
    var st = { kind: this._inputKind, hasController: !!this._ctrl };
    if (this._ctrl && typeof this._ctrl.status === 'function') { st.detail = this._ctrl.status(); }
    return st;
  };

  /* 舞台尺寸 → 实际可用位移。
   * 层四边各溢 7%（114% 层），所以「k=1 那层的位移」必须小于 舞台宽×0.07，
   * 否则层被推出舞台、露出直边（实测 390 宽手机上 LIM30 就会溢出 3px）。
   * 0.92 = 亚像素与圆角的安全余量。y 只用 0.35 倍，等效上限按 0.35 折算。 */
  Parallax.prototype._measure = function () {
    this._w = this.el.clientWidth || 0;
    this._h = this.el.clientHeight || 0;
    var capX = this._w * 0.07 * 0.92;
    var capY = (this._h * 0.07 * 0.92) / 0.35;
    this.limEff = Math.min(this.lim, capX || this.lim, capY || this.lim);
    return this;
  };

  Parallax.prototype._build = function () {
    injectStyle();
    var el = this.el, i, l, box, img;
    if (!el.classList.contains('spl-stage')) { el.classList.add('spl-stage'); }
    el.setAttribute('data-spl-form', this.form);

    /* 幂等：重复 mount 只复用已有层，不叠第二套 img（否则包体白涨一倍） */
    this.layers = {};
    for (i = 0; i < ORDER.length; i += 1) {
      l = ORDER[i];
      box = el.querySelector('.spl[data-l="' + l + '"]');
      if (!box) {
        box = document.createElement('div');
        box.className = 'spl';
        box.setAttribute('data-l', l);
        box.setAttribute('data-k', String(this.cfg.ks[l]));
        img = document.createElement('img');
        img.setAttribute('data-l', l);
        img.alt = l.toUpperCase() + ' 层';
        box.appendChild(img);
        el.appendChild(box);
      }
      this.layers[l] = box;
    }
    this._srcs = {};
    this._load();
  };

  Parallax.prototype._src = function (l, form) {
    /* files 覆盖表：允许「层名 ≠ 文件名」的场景（S1 的 l1/l3/l5、S2 的 l3v 等）。
       未提供时与旧实现逐字节一致：dir + '/' + 层名 + '.webp' */
    var fm = this.cfg.files && this.cfg.files[form];
    var p = this.base + ((fm && fm[l]) ? fm[l] : (this.cfg.dir[form] + '/' + l + '.webp'));
    /* srcMap：可选的「路径 → 直出 src」映射（预览页内嵌 data URI 用）。
       map 不存在或未命中时行为与原实现逐字节一致（w=0）。 */
    if (SP.srcMap && SP.srcMap[p]) { return SP.srcMap[p]; }
    return p;
  };

  Parallax.prototype._load = function () {
    var self = this, i, l, img;
    this.loaded = {};
    for (i = 0; i < ORDER.length; i += 1) {
      l = ORDER[i];
      img = this.layers[l].querySelector('img');
      (function (ll, im) {
        var src = self._src(ll, self.form);
        if (im.getAttribute('src') === src) {
          self.loaded[ll] = im.complete && im.naturalWidth > 0;
          return;
        }
        self.loaded[ll] = false;
        im.onload = function () { self.loaded[ll] = im.naturalWidth > 0; };
        im.onerror = function () { self.loaded[ll] = false; };
        im.setAttribute('src', src);
      }(l, img));
      this._srcs[l] = this._src(l, this.form);
    }
  };

  /* 改位移强度必须重测：limEff 是「请求值与舞台宽夹紧」的较小者，
     只改 lim 不重测会沿用旧的上限（实测漏了这个，LIM60 在竖屏仍然按 30 走）。 */
  Parallax.prototype.setLim = function (v) {
    this.lim = parseFloat(v) || this.lim;
    this._measure();
    this._apply();
    return this;
  };

  Parallax.prototype.setForm = function (form) {    if (form !== 'h' && form !== 'v') { return this; }
    if (this.form === form) { return this; }
    this.form = form;
    this.el.setAttribute('data-spl-form', form);
    this._load();
    this._measure();
    return this;
  };

  Parallax.prototype.setLayer = function (l, on) {
    if (!this.layers[l]) { return this; }
    this.enabled[l] = !!on;
    this.layers[l].style.display = on ? '' : 'none';
    return this;
  };

  /* tilt.js 的 onUpdate 直接接这里 */
  Parallax.prototype.setInput = function (tx, ty) {
    this.tx = tx; this.ty = ty;
    return this;
  };

  Parallax.prototype.attach = function (ctrl) {
    var self = this;
    this.ctrl = ctrl;
    ctrl.onUpdate = function (a, b) { self.setInput(a, b); };
    return this;
  };

  Parallax.prototype._frame = function () {
    this.cx += (this.tx - this.cx) * 0.08;
    this.cy += (this.ty - this.cy) * 0.08;
    if (Math.abs(this.tx - this.cx) < 0.0005) { this.cx = this.tx; }
    if (Math.abs(this.ty - this.cy) < 0.0005) { this.cy = this.ty; }
    this._apply();
  };

  /* 单层位移：ox = cx · LIM · k；oy 取 0.35 倍（竖向观感更稳，避免「画面被上下甩」）
     LIM 用 limEff（按舞台宽夹紧过的），不是请求值 —— 否则小屏会露边。 */
  Parallax.prototype.offset = function (l, cx, cy) {
    var k = this.cfg.ks[l];
    var lim = (typeof this.limEff === 'number' && this.limEff > 0) ? this.limEff : this.lim;
    return {
      x: cx * lim * k,
      y: cy * lim * k * 0.35,
      k: k
    };
  };

  Parallax.prototype._apply = function (cx, cy) {
    var x = (typeof cx === 'number') ? cx : this.cx;
    var y = (typeof cy === 'number') ? cy : this.cy;
    var i, l, o, box, t;
    for (i = 0; i < ORDER.length; i += 1) {
      l = ORDER[i];
      box = this.layers[l];
      if (!box) { continue; }
      o = this.offset(l, x, y);
      t = 'translate3d(' + o.x.toFixed(2) + 'px,' + o.y.toFixed(2) + 'px,0)';
      if (l === 'bg') {
        /* bg 兼做「推镜」：位移最小，再补一点缩放，否则大平图只有 9px 会很闷 */
        var sc = 1 + Math.abs(x) * this.cfg.bgScale;
        t += ' scale(' + sc.toFixed(4) + ')';
      }
      box.style.transform = t;
    }
    return this;
  };

  Parallax.prototype._loop = function () {
    var self = this;
    function tick() {
      self._frame();
      self.raf = global.requestAnimationFrame(tick);
    }
    this.raf = global.requestAnimationFrame(tick);
    return this;
  };

  Parallax.prototype._start = function () {
    if (this.raf) { return this; }
    return this._loop();
  };

  Parallax.prototype.stop = function () {
    if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = 0; }
    return this;
  };

  Parallax.prototype.resume = function () {
    return this._start();
  };

  /* 手动推进：无头 Chrome 会吞 rAF（吞一帧后回调不再来），截图/自检必须能手动排帧 */
  Parallax.prototype.step = function (n) {
    var i;
    for (i = 0; i < (n || 1); i += 1) { this._frame(); }
    return this;
  };

  /* 瞬时贴位（不 lerp）：自检与「?tx= 复现姿态」用，保证读到的就是目标姿态 */
  Parallax.prototype.snap = function (tx, ty) {
    this.tx = tx; this.ty = ty;
    this.cx = tx; this.cy = ty;
    this._apply();
    return this;
  };

  Parallax.prototype.reset = function () {
    this.tx = 0; this.ty = 0; this.cx = 0; this.cy = 0;
    this._apply();
    return this;
  };

  /* ------------------------------------------------------------------ */
  /* 探针：读「真实渲染值」，不读自己记的变量                              */
  /* ------------------------------------------------------------------ */
  function readX(el) {
    var t = global.getComputedStyle ? global.getComputedStyle(el).transform : '';
    if (!t || t === 'none') { return 0; }
    var m = t.match(/matrix\(([^)]+)\)/);
    if (m) {
      var a = m[1].split(',');
      return parseFloat(a[4]) || 0;
    }
    m = t.match(/matrix3d\(([^)]+)\)/);
    if (m) {
      var b = m[1].split(',');
      return parseFloat(b[12]) || 0;
    }
    return 0;
  }

  function readY(el) {
    var t = global.getComputedStyle ? global.getComputedStyle(el).transform : '';
    if (!t || t === 'none') { return 0; }
    var m = t.match(/matrix\(([^)]+)\)/);
    if (m) { return parseFloat(m[1].split(',')[5]) || 0; }
    m = t.match(/matrix3d\(([^)]+)\)/);
    if (m) { return parseFloat(m[1].split(',')[13]) || 0; }
    return 0;
  }

  function rect(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  /* 把「几层真的生效」压成一个可断言的 JSON */
  Parallax.prototype.audit = function () {
    var i, l, box, img, cs, st, out, cover, n;
    st = rect(this.el);
    out = {
      key: this.key,
      form: this.form,
      layers: [],
      count: 0,
      allLoaded: true,
      blendsOk: true,
      coverOk: true,
      stage: { w: Math.round(st.w), h: Math.round(st.h) },
      lim: { req: this.lim, eff: +((this.limEff || this.lim)).toFixed(1) },
      input: { tx: +this.tx.toFixed(3), ty: +this.ty.toFixed(3) }
    };
    for (i = 0; i < ORDER.length; i += 1) {
      l = ORDER[i];
      box = this.layers[l];
      if (!box) { continue; }
      img = box.querySelector('img');
      cs = global.getComputedStyle ? global.getComputedStyle(box) : null;
      n = rect(box);
      /* ★ 必须比「位置」而不是只比「尺寸」：getBoundingClientRect 已包含 transform，
         所以位移把层推出舞台时，这里会立刻变 false。只比 n.w>=st.w 永远为 true，
         等于没验（LIM60 在竖屏会把 FG 推出 26px，旧写法放过了）。 */
      cover = (n.x <= st.x + 0.5) && (n.y <= st.y + 0.5) &&
              (n.x + n.w >= st.x + st.w - 0.5) &&
              (n.y + n.h >= st.y + st.h - 0.5);
      var row = {
        l: l,
        k: this.cfg.ks[l],
        display: box.style.display === 'none' ? 'none' : 'on',
        nat: img ? (img.naturalWidth + 'x' + img.naturalHeight) : '0x0',
        loaded: !!(img && img.complete && img.naturalWidth > 0),
        blend: cs ? cs.getPropertyValue('mix-blend-mode') : '',
        x: +readX(box).toFixed(2),
        y: +readY(box).toFixed(2),
        cover: cover,
        src: img ? String(img.getAttribute('src') || '').split('/').pop() : ''
      };
      out.layers.push(row);
      out.count += 1;
      if (!row.loaded) { out.allLoaded = false; }
      if (!cover) { out.coverOk = false; }
      if (l === 'bg' && row.blend !== 'normal') { out.blendsOk = false; }
      if (l !== 'bg' && row.blend !== (this.additive ? 'screen' : 'normal')) { out.blendsOk = false; }
    }

    var bg = out.layers[0] || { x: 0 }, mg = out.layers[1] || { x: 0 }, fg = out.layers[2] || { x: 0 };
    out.spread = {
      mg_over_bg: bg.x ? +(mg.x / bg.x).toFixed(2) : null,
      fg_over_mg: mg.x ? +(fg.x / mg.x).toFixed(2) : null,
      fg_minus_bg: +(fg.x - bg.x).toFixed(2)
    };

    /* 判据：三层齐 → 都加载出真图 → 位移严格分档（不是整幅平移）→ 层盖住舞台 */
    var moved = Math.abs(fg.x - bg.x) >= 0.5;
    var tierOk = (!moved) ? null
      : (Math.abs(out.spread.mg_over_bg - 2) <= 0.30 &&
         Math.abs(out.spread.fg_over_mg - 5 / 3) <= 0.25);
    out.verdict = (out.count === 3 && out.allLoaded && out.blendsOk && out.coverOk)
      ? (tierOk === false ? 'flat' : 'ok')
      : 'incomplete';
    out.tierOk = tierOk;
    this._lastProbe = out;
    return out;
  };

  /* 一键自检：写姿态 → 读 computed → 断言分档 → 复位。不需要晃手机，也不依赖 rAF。 */
  Parallax.prototype.selftest = function () {
    var was = { tx: this.tx, ty: this.ty };
    var snaps = [];
    var poses = [[0.6, 0.4], [-0.6, -0.4], [0, 0]];
    var i, rep;
    for (i = 0; i < poses.length; i += 1) {
      this.snap(poses[i][0], poses[i][1]);
      /* 读之前强制一次样式重算：transform 是同步生效的，computed 会立刻是新值 */
      void this.el.offsetWidth;
      snaps.push(this.audit());
    }
    this.snap(was.tx, was.ty);
    rep = {
      ok: true,
      reason: [],
      poses: snaps.map(function (s) {
        return { tx: s.input.tx, ty: s.input.ty, verdict: s.verdict,
                 x: s.layers.map(function (r) { return r.x; }),
                 spread: s.spread };
      })
    };
    for (i = 0; i < snaps.length; i += 1) {
      if (snaps[i].count !== 3) { rep.ok = false; rep.reason.push('第' + i + '档层数 != 3'); }
      if (!snaps[i].allLoaded) { rep.ok = false; rep.reason.push('第' + i + '档有层未加载'); }
      if (!snaps[i].blendsOk) { rep.ok = false; rep.reason.push('第' + i + '档混合模式不对'); }
    }
    /* 静止档必须严格归零，否则「回中」是假的 */
    var still = snaps[2];
    if (Math.abs(still.layers[0].x) > 0.05 || Math.abs(still.layers[2].x) > 0.05) {
      rep.ok = false; rep.reason.push('静止档未归零');
    }
    /* 正负两档的位移必须反号（方向跟手，不是单边漂移） */
    if (snaps[0].layers[2].x * snaps[1].layers[2].x >= 0) {
      rep.ok = false; rep.reason.push('正负姿态位移未反号');
    }
    /* 只在「层齐 + 已加载」的前提下判分档，否则 incomplete 会重复报同一条 */
    if (snaps[0].tierOk === false || snaps[1].tierOk === false) {
      rep.ok = false; rep.reason.push('分档比例越界（疑似整幅平移）');
    }
    if (snaps[0].verdict === 'incomplete' || snaps[1].verdict === 'incomplete') {
      rep.ok = false;
      if (rep.reason.indexOf('结构不全') < 0) { rep.reason.push('结构不全'); }
    }
    rep.verdict = rep.ok ? 'ok' : 'fail';
    this._selftest = rep;
    return rep;
  };

  /* ------------------------------------------------------------------ */
  /* 门面                                                                */
  /* ------------------------------------------------------------------ */
  SP.mount = function (el, key, opts) {
    if (typeof el === 'string') { el = document.querySelector(el); }
    if (!el) { throw new Error('[SP] mount 找不到元素'); }
    if (el.__sp) { return el.__sp; }
    var inst = new Parallax(el, key, opts);
    uid += 1;
    inst._uid = uid;
    INST['i' + uid] = inst;
    el.setAttribute('data-spl-ready', '1');
    return inst;
  };

  /* 手动拆场（owner 是元素或其选择器）；SP.destroyAll() 一次收全部 */
  SP.destroy = function (el) {
    if (typeof el === 'string') { el = document.querySelector(el); }
    var i = el && el.__sp;
    if (!i) { return false; }
    if (i._uid) { delete INST['i' + i._uid]; }
    return i.destroy();
  };

  SP.destroyAll = function () {
    var n = 0, k;
    for (k in INST) { if (INST.hasOwnProperty(k) && INST[k]) { INST[k].destroy(); delete INST[k]; n += 1; } }
    return n;
  };

  /* 输入源总览（排查「为什么不动」时先看这里） */
  SP.inputStatus = function (el) {
    var i = SP.instance(el || '.spl-stage');
    return i ? i.inputStatus() : { kind: 'none', hasController: false };
  };

  SP.instance = function (el) {
    if (typeof el === 'string') { el = document.querySelector(el); }
    return el && el.__sp ? el.__sp : null;
  };

  SP.audit = function (el) {
    var i = SP.instance(el);
    return i ? i.audit() : { verdict: 'incomplete', reason: '未 mount' };
  };

  /* 全局断言入口：控制台一行 `SP.check()` 就能判定三层是否生效 */
  SP.check = function (el) {
    var i = SP.instance(el || '.spl-stage');
    if (!i) { return { verdict: 'incomplete', reason: '未 mount' }; }
    return i.selftest();
  };

  SP.list = function () { return Object.keys(REG); };

  global.SceneParallax = SP;
})(typeof window !== 'undefined' ? window : this);
