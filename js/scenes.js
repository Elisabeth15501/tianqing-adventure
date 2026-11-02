/*
 * scenes.js —— 场景素材注册表与挂载门面（2026-11-02）
 *
 * 为什么单开一份表：场景图长期只「躺在 assets/scenes/ 里」，没有任何 js 引用，
 * 谁是三层、谁整幅、谁可拖、层文件叫什么名字全靠文档记，换个人就接错。
 * 这份表把「素材事实」钉成唯一源：目录 / 文件 / 尺寸 / 层序 / 视差系数 / 混合模式。
 *
 * 三种 kind：
 *   parallax  三层（bg/mg/fg）→ 交给 SceneParallax 引擎，陀螺仪/指针驱动
 *   single    整幅单层（S3/S6 与 S1 竖版）→ 直接铺满，无位移
 *   pano      横向长卷（S4，2880×720）→ 指针拖动 camera，clamp 到两端
 *
 * 视差系数来源（不许现编）：
 *   S5 用实测定标 ks = 0.30 / 0.60 / 1.00（build_s5_v3_layers.py + 三层预览验收）
 *   S1 / S2 / S7 沿用旧「层深 d = 6 / 26 / 64」口径，按 dmax=64 归一 ⇒ 0.09 / 0.41 / 1.00
 *   全部 lim = 30（引擎按舞台宽再夹一次 limEff，防止 114% 溢出的层露直边）
 *
 * 兼容：Chrome 61 / ES2017 · 无 inline 样式（样式由本文件注入一次）· 零第三方依赖
 */
(function (global) {
  'use strict';

  var SC = {};
  var KEYS = [];
  var CSS_ID = 'tq-scenes-style';

  function def(key, cfg) {
    cfg.key = key;
    SC[key] = cfg;
    KEYS.push(key);
    return cfg;
  }

  /* ---------------- 注册表 ---------------- */

  /* S1 万寿门：横版三层全 AI；竖版只有门楼一层（天幕由引擎渐变、栏柱走矢量） */
  def('s1_wanshou', {
    title: 'S1 万寿门（寅夜→拂晓）',
    forms: {
      h: {
        kind: 'parallax', size: [1500, 630],
        dir: 'assets/scenes/s1_wanshou',
        files: { bg: 'assets/scenes/s1_wanshou/l1.webp',
                 mg: 'assets/scenes/s1_wanshou/l3.webp',
                 fg: 'assets/scenes/s1_wanshou/l5.webp' },
        ks: { bg: 0.09, mg: 0.41, fg: 1.00 }, lim: 30, additive: false,
        note: 'l3/l5 为键除 RGBA（不做加色 screen）；l1 天幕 1500×630'
      },
      v: {
        kind: 'single', size: [710, 1475],
        files: { main: 'assets/scenes/s1_wanshou_p/l3v.webp' },
        note: '竖版门楼单层；l3v_gongmen / l3v_paichazhu 为退役备选，不默认加载'
      }
    },
    alt: { v: [{ file: 'assets/scenes/s1_wanshou_p/l3v_gongmen.webp', size: [780, 1688], legacy: true },
               { file: 'assets/scenes/s1_wanshou_p/l3v_paichazhu.webp', size: [780, 1688], legacy: true }] }
  });

  /* S2 广德殿外景：横竖都是三层（l1 天幕 / l3 正殿 / l5 勾栏） */
  def('s2_guangde', {
    title: 'S2 广德殿外景（辰时）',
    forms: {
      h: {
        kind: 'parallax', size: [1500, 630],
        dir: 'assets/scenes/s2_guangde',
        files: { bg: 'assets/scenes/s2_guangde/l1.webp',
                 mg: 'assets/scenes/s2_guangde/l3.webp',
                 fg: 'assets/scenes/s2_guangde/l5.webp' },
        ks: { bg: 0.09, mg: 0.41, fg: 1.00 }, lim: 30, additive: false
      },
      v: {
        kind: 'parallax', size: [780, 1688],
        dir: 'assets/scenes/s2_guangde',
        files: { bg: 'assets/scenes/s2_guangde/l1v.webp',
                 mg: 'assets/scenes/s2_guangde/l3v.webp',
                 fg: 'assets/scenes/s2_guangde/l5v.webp' },
        ks: { bg: 0.09, mg: 0.41, fg: 1.00 }, lim: 30, additive: false,
        note: '竖版三层齐（l1v 天幕为程序化兜底，不调 AI）'
      }
    }
  });

  /* S3 广德殿内宴：整幅单层（拆切穿帮已裁定单层 + 镜头推移） */
  def('s3_banquet', {
    title: 'S3 广德殿内宴',
    forms: {
      h: { kind: 'single', size: [1500, 630], files: { main: 'assets/scenes/s3_banquet/l3.webp' } },
      v: { kind: 'single', size: [750, 1080], files: { main: 'assets/scenes/s3_banquet/l3v.webp' } }
    }
  });

  /* S4 汴州桥市：单层横向长卷（2026-11-02 裁定不分层，B2/B3 不入包） */
  def('s4_pano', {
    title: 'S4 汴州桥市（午时·可拖长卷）',
    forms: {
      h: { kind: 'pano', size: [2880, 720], world: 2880,
           files: { main: 'assets/scenes/s4_pano/pano_l4.webp' },
           note: '单层；camera ∈ [0, world − 可见宽]，不接陀螺仪' },
      v: { kind: 'pano', size: [2880, 720], world: 2880,
           files: { main: 'assets/scenes/s4_pano/pano_l4.webp' },
           note: '竖屏取同图的一段（可见宽更窄），非另出一张' }
    }
  });

  /* S5 滋德殿旧址：v3 真物体分层（bg 补全图 / mg 柱列供桌 / fg 烛台木箱） */
  def('s5_zide', {
    title: 'S5 滋德殿旧址（酉时暗釉）',
    forms: {
      h: {
        kind: 'parallax', size: [1500, 630],
        dir: 'assets/scenes/s5_zide_h',
        files: { bg: 'assets/scenes/s5_zide_h/bg.webp',
                 mg: 'assets/scenes/s5_zide_h/mg.webp',
                 fg: 'assets/scenes/s5_zide_h/fg.webp' },
        ks: { bg: 0.30, mg: 0.60, fg: 1.00 }, lim: 30, bgScale: 0.012, additive: false
      },
      v: {
        kind: 'parallax', size: [750, 1080],
        dir: 'assets/scenes/s5_zide',
        files: { bg: 'assets/scenes/s5_zide/bg.webp',
                 mg: 'assets/scenes/s5_zide/mg.webp',
                 fg: 'assets/scenes/s5_zide/fg.webp' },
        ks: { bg: 0.30, mg: 0.60, fg: 1.00 }, lim: 30, bgScale: 0.012, additive: false
      }
    }
  });

  /* S6 玉津园：整幅单层（同 S3；投壶套装已从底图删除，由引擎层单独呈现） */
  def('s6_yujin', {
    title: 'S6 玉津园（深秋巳时）',
    forms: {
      h: { kind: 'single', size: [1500, 630], files: { main: 'assets/scenes/s6_yujin/l3.webp' } },
      v: { kind: 'single', size: [750, 1080], files: { main: 'assets/scenes/s6_yujin/l3v.webp' } }
    }
  });

  /* S7 瓷心空间：横竖都是三层（黑底加色层，screen 混合） */
  def('s7_cixin', {
    title: 'S7 瓷心空间',
    forms: {
      h: {
        kind: 'parallax', size: [1500, 630],
        dir: 'assets/scenes/s7_cixin_h',
        files: { bg: 'assets/scenes/s7_cixin_h/bg.webp',
                 mg: 'assets/scenes/s7_cixin_h/mg.webp',
                 fg: 'assets/scenes/s7_cixin_h/fg.webp' },
        ks: { bg: 0.09, mg: 0.41, fg: 1.00 }, lim: 30, additive: true
      },
      v: {
        kind: 'parallax', size: [750, 1080],
        dir: 'assets/scenes/s7_cixin',
        files: { bg: 'assets/scenes/s7_cixin/bg.webp',
                 mg: 'assets/scenes/s7_cixin/mg.webp',
                 fg: 'assets/scenes/s7_cixin/fg.webp' },
        ks: { bg: 0.09, mg: 0.41, fg: 1.00 }, lim: 30, additive: true
      }
    }
  });

  /* ---------------- 查询 ---------------- */

  var SC_ = {
    base: '',
    list: function () { return KEYS.slice(); },
    get: function (key) { return SC[key] || null; },

    /* 某个形态的配置（缺省 h） */
    form: function (key, form) {
      var c = SC[key];
      if (!c) { return null; }
      return c.forms[form || 'h'] || null;
    },

    /* 该形态要加载的文件表 {层名: 路径}（单层是 {main: ...}） */
    files: function (key, form) {
      var f = SC_.form(key, form);
      return f ? f.files : null;
    },

    /* 全部素材清单（含退役备选），给自检页与打包脚本用 */
    allFiles: function () {
      var out = [];
      KEYS.forEach(function (k) {
        Object.keys(SC[k].forms).forEach(function (fm) {
          var f = SC[k].forms[fm];
          Object.keys(f.files).forEach(function (layer) {
            out.push({ key: k, form: fm, layer: layer, src: f.files[layer], size: f.size });
          });
        });
        (SC[k].alt ? Object.keys(SC[k].alt) : []).forEach(function (fm) {
          SC[k].alt[fm].forEach(function (a) {
            out.push({ key: k, form: fm, layer: 'alt', src: a.file, size: a.size, legacy: !!a.legacy });
          });
        });
      });
      return out;
    },

    /* 三层场景的引擎注册（唯一入口，避免引擎表与素材表两处漂移） */
    registerWith: function (SP) {
      if (!SP || typeof SP.register !== 'function') { return 0; }
      var n = 0;
      KEYS.forEach(function (k) {
        var forms = SC[k].forms;
        var dirs = {}, files = {}, ks = null, lim = 30, additive = true, bgScale = 0, title = SC[k].title;
        Object.keys(forms).forEach(function (fm) {
          var f = forms[fm];
          if (f.kind !== 'parallax') { return; }
          dirs[fm] = f.dir;
          files[fm] = {};
          Object.keys(f.files).forEach(function (l) { files[fm][l] = f.files[l]; });
          ks = f.ks;
          lim = (typeof f.lim === 'number') ? f.lim : lim;
          additive = (f.additive !== false);
          bgScale = f.bgScale || 0;
        });
        if (!ks) { return; }                 // 没有三层形态的场景不进引擎
        SP.register(k, { dir: dirs, size: { h: forms.h ? forms.h.size : null },
          files: files, ks: ks, lim: lim, bgScale: bgScale, additive: additive, title: title });
        n += 1;
      });
      return n;
    }
  };

  /* ---------------- 挂载门面 ---------------- */

  function injectStyle() {
    if (document.getElementById(CSS_ID)) { return; }
    var css = [
      '.tqs-stage{position:relative;overflow:hidden;background:#0B0908;touch-action:none}',
      '.tqs-stage img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 50%;',
      '  -webkit-user-drag:none;user-select:none}',
      '.tqs-pano{position:absolute;left:0;top:0;height:100%;will-change:transform}',
      '.tqs-pano img{width:100%;height:100%;object-fit:fill}'
    ].join('');
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(s);
  }

  /* 页面在仓库根时 base 为空；preview/ 下调用方设 TQScenes.base = '../' */
  function path(src) { return (SC_.base || '') + src; }

  /* 单层：铺满 */
  function mountSingle(el, cfg) {
    injectStyle();
    el.classList.add('tqs-stage');
    var im = el.querySelector('img');
    if (!im) { im = document.createElement('img'); el.appendChild(im); }
    im.setAttribute('alt', '');
    im.src = path(cfg.files.main);
    return {
      kind: 'single', el: el,
      src: im.src,
      loaded: function () { return im.complete && im.naturalWidth > 0; },
      destroy: function () { el.innerHTML = ''; el.classList.remove('tqs-stage'); }
    };
  }

  /* 长卷：单图横向拖动 + 两端 clamp（S4 单层裁定后的全部行为） */
  function mountPano(el, cfg) {
    injectStyle();
    el.classList.add('tqs-stage');
    var box = document.createElement('div');
    box.className = 'tqs-pano';
    var im = document.createElement('img');
    im.setAttribute('alt', '');
    im.src = path(cfg.files.main);
    box.appendChild(im);
    el.appendChild(box);

    var inst = {
      kind: 'pano', el: el, world: cfg.world || cfg.size[0],
      cam: 0, visible: 0, max: 0,
      camAt: function () { return inst.cam; },
      setCam: function (x) { inst.cam = clamp(x, 0, inst.max); apply(); },
      destroy: function () {
        global.removeEventListener('resize', inst.measure);
        el.innerHTML = ''; el.classList.remove('tqs-stage');
      }
    };

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    /* 可见宽 = 舞台宽 /（舞台高 / 720）；再乘缩放把「全景 px」换成屏幕 px */
    function measure() {
      var sw = el.clientWidth || 1, sh = el.clientHeight || 1;
      var scale = sh / cfg.size[1];                       // 屏幕 px / 全景 px
      inst.visible = sw / scale;
      inst.max = Math.max(0, inst.world - inst.visible);
      box.style.width = (inst.world * scale) + 'px';
      box.style.height = sh + 'px';
      inst.cam = clamp(inst.cam, 0, inst.max);
      apply();
    }

    function apply() {
      var sh = el.clientHeight || 1;
      var scale = sh / cfg.size[1];
      box.style.transform = 'translate3d(' + (-inst.cam * scale).toFixed(2) + 'px,0,0)';
    }

    var drag = null;
    el.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, cam: inst.cam };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) { return; }
      var sh = el.clientHeight || 1;
      var scale = sh / cfg.size[1];
      inst.setCam(drag.cam - (e.clientX - drag.x) / scale);
    });
    el.addEventListener('pointerup', function () { drag = null; });
    el.addEventListener('pointercancel', function () { drag = null; });

    global.addEventListener('resize', measure);
    measure();
    inst.measure = measure;
    return inst;
  }

  /* 统一入口：TQScenes.mount(el, 's5_zide', {form:'v', input:'pointer'}) */
  SC_.mount = function (el, key, opts) {
    opts = opts || {};
    if (typeof el === 'string') { el = document.querySelector(el); }
    if (!el) { throw new Error('[TQScenes] mount 找不到元素'); }
    var cfg = SC_.form(key, opts.form || 'h');
    if (!cfg) { throw new Error('[TQScenes] 未注册的场景/形态：' + key + '/' + (opts.form || 'h')); }
    if (cfg.kind === 'parallax') {
      var SP = global.SceneParallax;
      if (!SP) { throw new Error('[TQScenes] 需要先加载 scene-parallax.js'); }
      if (opts.base) { SP.base = opts.base; }
      var inst = SP.mount(el, key, opts);
      inst.form = opts.form || 'h';
      return inst;
    }
    if (cfg.kind === 'pano') { return mountPano(el, cfg); }
    return mountSingle(el, cfg);
  };

  /* 只读体检：逐个请求全部素材，回来报「尺寸对不对、有没有 404」 */
  SC_.audit = function (onRow) {
    var list = SC_.allFiles();
    var rows = [];
    return new Promise(function (resolve) {
      var left = list.length;
      if (!left) { resolve(rows); return; }
      list.forEach(function (it) {
        var im = new Image();
        im.onload = function () {
          rows.push({ key: it.key, form: it.form, layer: it.layer, src: it.src,
            ok: true, w: im.naturalWidth, h: im.naturalHeight,
            sizeOk: im.naturalWidth === it.size[0] && im.naturalHeight === it.size[1],
            legacy: !!it.legacy });
          if (onRow) { onRow(rows[rows.length - 1]); }
          if (--left === 0) { resolve(rows); }
        };
        im.onerror = function () {
          rows.push({ key: it.key, form: it.form, layer: it.layer, src: it.src,
            ok: false, w: 0, h: 0, sizeOk: false, legacy: !!it.legacy });
          if (onRow) { onRow(rows[rows.length - 1]); }
          if (--left === 0) { resolve(rows); }
        };
        im.src = path(it.src);
      });
    });
  };

  global.TQScenes = SC_;
  /* 自动把三层场景登记进引擎（script 顺序保证 scene-parallax.js 先加载） */
  if (global.SceneParallax) { SC_.registered = SC_.registerWith(global.SceneParallax); }
})(typeof window !== 'undefined' ? window : this);
