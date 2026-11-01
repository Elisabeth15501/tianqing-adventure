/* ============================================================
   小游戏合集 · 从「手感校准页」移植（2026-11-01 第六轮）
   ------------------------------------------------------------
   三个：tang（一碗汤饼）／proof（校字）／touhu（投壶对投）。
   它们共用同一个坐标系 300×210（与校准页一致），画在 .iv-stage 里；
   进度、文案、结算通过 hooks 回给 F.iv，不自己管步骤条。

   为什么单开一个文件而不是塞进 frag.js：
     frag.js 的 iv 是「进度累加器」（gest=drag/sweep/tap/hold + goal 次数），
     这三个要的是"看形状变没变"（面坯档位／切开的片数／矢的落点），
     判定依据不同源，混在一起会把 iv 的那套语义搞糊。

   坐标换算：SVG 是 viewBox 0 0 300 210 + xMidYMid，
     指针坐标必须先减掉 letterbox 偏移再除以 scale，否则手指和图形对不上。
   ============================================================ */
(function (global) {
  'use strict';

  /* 音效入口：TQSFX 未加载/AudioContext 不可用时静默降级，不阻断手感 */
  function sfx(name) {
    if (global.TQSFX) { try { global.TQSFX.play(name); } catch (e) {} }
  }

  var NS = 'http://www.w3.org/2000/svg';
  var W = 300, H = 210;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function n1(v) { return (Math.round(v * 10) / 10).toFixed(1); }

  /* ---------- 画布：SVG + 指针换算 ---------- */
  function Canvas(stage) {
    var sv = document.createElementNS(NS, 'svg');
    sv.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    sv.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    sv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;z-index:1';
    stage.appendChild(sv);
    this.stage = stage;
    this.svg = sv;
    this.box = document.createElementNS(NS, 'g');
    sv.appendChild(this.box);
  }
  Canvas.prototype.map = function (e) {
    var r = this.svg.getBoundingClientRect();
    var sc = Math.min(r.width / W, r.height / H) || 1;
    var w = W * sc, h = H * sc;
    return {
      x: (e.clientX - r.left - (r.width - w) / 2) / sc,
      y: (e.clientY - r.top - (r.height - h) / 2) / sc,
      sc: sc
    };
  };
  Canvas.prototype.html = function (s) { this.box.innerHTML = s; };
  Canvas.prototype.q = function (sel) { return this.box.querySelector(sel); };

  /* ---------- 共用：目标虚圈 ---------- */
  function ring(cx, cy, r, color) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' +
      (color || '#527E79') + '" stroke-width="1.4" stroke-dasharray="4 4" opacity=".55"/>';
  }

  /* ============================================================
     一碗汤饼：揉面（三档跳变）／擀面（往复三趟）／切面（两刀三条）
     ============================================================ */
  var KNEAD = [
    { rx: 42, ry: 32 }, { rx: 52, ry: 26 }, { rx: 61, ry: 20 }, { rx: 68, ry: 15 }
  ];
  var ROLL_FROM = { w: 136, h: 26 }, ROLL_TO = { w: 220, h: 14 }, ROLL_CY = 125;
  var SLAB = { x0: 40, y0: 118, x1: 260, y1: 132 };
  var GUIDES = [113, 187];

  function doughPath(tier, sq) {
    var t = KNEAD[clamp(tier | 0, 0, 3)];
    var rx = t.rx * (1 + 0.045 * sq);
    var ryT = t.ry * (1 - 0.13 * sq);
    var ryB = ryT * 0.68, cy = 150 - ryB;
    var m = 150;
    return 'M' + n1(m - rx) + ' ' + n1(cy) +
      ' A' + n1(rx) + ' ' + n1(ryT) + ' 0 0 1 ' + n1(m + rx) + ' ' + n1(cy) +
      ' L' + n1(m + rx) + ' 150 L' + n1(m - rx) + ' 150 Z';
  }

  function piecePath(x0, x1, y0, y1, rL, rR) {
    function r(px, py, rad, sx) {
      return rad > 0 ? 'Q' + n1(px) + ' ' + n1(py) + ' ' + n1(px + sx * rad) + ' ' + n1(py + rad) : '';
    }
    return 'M' + n1(x0 + rL) + ' ' + n1(y0) +
      ' H' + n1(x1 - rR) +
      ' Q' + n1(x1) + ' ' + n1(y0) + ' ' + n1(x1) + ' ' + n1(y0 + rR) +
      ' V' + n1(y1 - rR) +
      ' Q' + n1(x1) + ' ' + n1(y1) + ' ' + n1(x1 - rR) + ' ' + n1(y1) +
      ' H' + n1(x0 + rL) +
      ' Q' + n1(x0) + ' ' + n1(y1) + ' ' + n1(x0) + ' ' + n1(y1 - rL) +
      ' V' + n1(y0 + rL) +
      ' Q' + n1(x0) + ' ' + n1(y0) + ' ' + n1(x0 + rL) + ' ' + n1(y0) + ' Z';
  }

  function slabHTML(pieces) {
    var out = '', i, n = pieces.length, gap = n >= 3 ? 4.4 : 3.2;
    for (i = 0; i < n; i++) {
      var p = pieces[i], li = i === 0 ? 0 : gap, ri = i === n - 1 ? 0 : gap;
      var rL = i === 0 ? 7 : 0, rR = i === n - 1 ? 7 : 0;
      var dy = 3;
      out += '<g class="pc" style="--o:' + (i === 0 ? -2 : (i === n - 1 ? 2 : 0)) + 'px;transform:translateX(' +
        (i === 0 ? -2 : (i === n - 1 ? 2 : 0)) + 'px)">' +
        '<path d="' + piecePath(p.x0 + li, p.x1 - ri, SLAB.y1 - dy, SLAB.y1 + 5, rL, rR) + '" fill="#DECBA4" stroke="#B89C6A" stroke-width="1"/>' +
        '<path d="' + piecePath(p.x0 + li, p.x1 - ri, SLAB.y0, SLAB.y1, rL, rR) + '" fill="#F2E8D2" stroke="#C9B48A" stroke-width="1.2"/>' +
        (li > 0 ? '<rect x="' + n1(p.x0) + '" y="' + SLAB.y0 + '" width="1.8" height="' + (SLAB.y1 - SLAB.y0) + '" fill="#D8C39B" opacity=".8"/>' : '') +
        (ri > 0 ? '<rect x="' + n1(p.x1 - 1.8) + '" y="' + SLAB.y0 + '" width="1.8" height="' + (SLAB.y1 - SLAB.y0) + '" fill="#D8C39B" opacity=".8"/>' : '') +
        '</g>';
    }
    return out;
  }

  /* ★配对守卫：结束某一拍的那一次 pointerup，会落在**下一拍**的 up() 里。
     每次 down 记下当前拍，up 时拍号对不上就直接丢弃 —— 否则一步能判掉两拍。 */
  function guardDown(st, beat) { st._downBeat = beat; }
  function guardUp(st, beat) { var ok = st._downBeat === beat; st._downBeat = -1; return ok; }

  function playTang(cv, hooks) {
    var st = { beat: 0, tier: 0, pressing: false, prT0: 0, pressN: 0, passes: 0, lastY: 0, dir: 0,
      pieces: [{ x0: SLAB.x0, x1: SLAB.x1 }], cutN: 0, dragging: false, sx: 0, sy: 0, ex: 0, ey: 0, dev: 0, endReach: false };
    var DUR = 700;

    function scene() {
      if (st.beat === 0) {
        return '<ellipse cx="150" cy="154" rx="112" ry="17" fill="#DFD0AE" opacity=".7"/>' +
          '<ellipse cx="150" cy="150" rx="96" ry="9" fill="#B99A6A" opacity=".12"/>' +
          '<ellipse cx="150" cy="153" rx="56" ry="8" fill="#8A6A3A" opacity=".16"/>' +
          '<path id="dflank" d="' + doughPath(st.tier, 0) + '" transform="translate(0,3)" fill="#DECBA4" stroke="#B89C6A" stroke-width="1.3"/>' +
          '<path id="dough" d="' + doughPath(st.tier, 0) + '" fill="#F2E8D2" stroke="#C9B48A" stroke-width="1.8"/>' +
          '<ellipse cx="130" cy="108" rx="12" ry="3.8" fill="#FFFDF6" opacity=".5"/>' +
          '<g id="pr" opacity="0"><circle r="15" fill="none" stroke="#B9B2A2" stroke-width="2.2" opacity=".35"/>' +
          '<circle id="prarc" r="15" fill="none" stroke="#7FA9A1" stroke-width="2.8" stroke-linecap="round" ' +
          'transform="rotate(-90)" stroke-dasharray="' + n1(2 * Math.PI * 15) + '" stroke-dashoffset="' + n1(2 * Math.PI * 15) + '"/></g>' +
          '<g id="hand" opacity="0"><circle r="7" fill="rgba(214,190,158,.45)" stroke="#A8896C" stroke-width="1.5"/>' +
          '<path d="M-3.2 0 h6.4 M0 -3.2 v6.4" stroke="#8A6A4A" stroke-width="1.3" stroke-linecap="round"/></g>';
      }
      if (st.beat === 1) {
        var t = clamp(st.passes / 3, 0, 1);
        var w = ROLL_FROM.w + (ROLL_TO.w - ROLL_FROM.w) * t;
        var h = ROLL_FROM.h + (ROLL_TO.h - ROLL_FROM.h) * t;
        return '<ellipse cx="150" cy="150" rx="112" ry="17" fill="#DFD0AE" opacity=".7"/>' +
          '<ellipse cx="150" cy="' + ROLL_CY + '" rx="' + n1(w / 2 + 22) + '" ry="16" fill="#8A6A3A" opacity=".10"/>' +
          '<rect id="sheet" x="' + n1(150 - w / 2) + '" y="' + n1(ROLL_CY - h / 2) + '" width="' + n1(w) + '" height="' + n1(h) +
          '" rx="' + n1(h / 2) + '" fill="#F2E8D2" stroke="#C9B48A" stroke-width="1.6"/>' +
          '<path d="M' + n1(150 - w / 2 + 12) + ' ' + n1(ROLL_CY - 2) + ' h' + n1(w - 24) + '" stroke="#E6D6B4" stroke-width="1.2" opacity=".7"/>' +
          '<g id="roller" transform="translate(0,-6)"><rect x="-84" y="-7" width="168" height="9" rx="4.5" fill="#C9B48A" stroke="#8A6E33" stroke-width="1.1"/>' +
          '<rect x="-92" y="-9" width="10" height="13" rx="4" fill="#A8895A" stroke="#8A6E33" stroke-width="1"/>' +
          '<rect x="82" y="-9" width="10" height="13" rx="4" fill="#A8895A" stroke="#8A6E33" stroke-width="1"/></g>';
      }
      var out = '<ellipse cx="150" cy="150" rx="118" ry="16" fill="#DFD0AE" opacity=".6"/>' + slabHTML(st.pieces);
      out += '<text x="270" y="112" font-size="9" text-anchor="end" fill="' + (st.cutN >= 2 ? '#3F6B58' : '#527E79') + '">面 ' + st.pieces.length + ' 条</text>';
      for (var i = 0; i < GUIDES.length; i++) {
        if (st.cutN > i) { continue; }
        out += '<path d="M' + GUIDES[i] + ' ' + (SLAB.y0 - 10) + ' v' + (SLAB.y1 - SLAB.y0 + 18) + '" stroke="#8FB5B0" stroke-width="1.2" stroke-dasharray="4 4" opacity=".7"/>' +
          '<path d="M' + (GUIDES[i] - 3) + ' ' + (SLAB.y0 - 10) + ' l6 0 M' + GUIDES[i] + ' ' + (SLAB.y0 - 10) + ' l0 5" stroke="#527E79" stroke-width="1.2" fill="none"/>';
      }
      out += '<g id="knife" opacity="0"><path d="M0 0 l0 -26" stroke="#8A8378" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M-2 -26 h4 l1 8 h-6 Z" fill="#B08A56" stroke="#7E5E32" stroke-width=".9"/></g>';
      return out;
    }
    function paint() { cv.html(scene()); }

    function progress() {
      if (st.beat === 0) { return st.pressN / 3; }
      if (st.beat === 1) { return st.passes / 3; }
      return st.cutN / 2;
    }
    function label() {
      if (st.beat === 0) { return '已按 ' + st.pressN + ' / 3 下'; }
      if (st.beat === 1) { return '已擀 ' + st.passes + ' / 3 趟'; }
      return '已切 ' + st.cutN + ' / 2 刀';
    }

    function down(p) {
      guardDown(st, st.beat);
      if (st.beat === 0) {
        st.pressing = true; st.prT0 = now();
        var hd = cv.q('#hand'); if (hd) { hd.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')'); hd.setAttribute('opacity', '1'); }
        return;
      }
      if (st.beat === 1) { st.dragging = true; st.lastY = p.y; return; }
      st.dragging = true; st.sx = p.x; st.sy = p.y; st.ex = p.x; st.ey = p.y; st.dev = 0; st.endReach = false;
    }

    function move(p) {
      if (st.beat === 0) { return; }
      if (st.beat === 1) {
        if (!st.dragging) { return; }
        var dy = p.y - st.lastY;
        if (Math.abs(dy) > 8) {
          if (st.dir * dy <= 0) { st.passes = Math.min(3, st.passes + 1); st.dir = dy > 0 ? 1 : -1; paint(); hooks.step(progress(), label()); }
        }
        st.lastY = p.y;
        return;
      }
      var kn = cv.q('#knife');
      if (kn) { kn.setAttribute('opacity', '1'); kn.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')'); }
      st.ex = p.x; st.ey = p.y;
      if (p.y > SLAB.y1) { st.endReach = true; }
      for (var i = 0; i < GUIDES.length; i++) {
        if (st.cutN > i && Math.abs(GUIDES[i] - st.sx) < 6) { continue; }
      }
      st.dev = Math.max(st.dev, Math.min(Math.abs(p.x - GUIDES[0]), Math.abs(p.x - GUIDES[1])));
    }

    function up(p) {
      if (!guardUp(st, st.beat)) { return; }
      if (st.beat === 0) {
        st.pressing = false;
        var hd = cv.q('#hand'); if (hd) { hd.setAttribute('opacity', '0'); }
        var held = now() - st.prT0, ph = Math.min(1, held / DUR);
        if (ph < 0.92) { hooks.tip('按住别放——等圈走满再松'); return; }
        st.pressN++; st.tier = Math.min(3, st.tier + 1);
        paint();
        var pr = cv.q('#pr'); if (pr) { pr.setAttribute('opacity', '0'); }
        hooks.step(progress(), label());
        if (st.pressN >= 3) { hooks.done(false); }
        return;
      }
      if (st.beat === 1) { st.dragging = false; if (st.passes >= 3) { hooks.done(false); } return; }

      st.dragging = false;
      var kn = cv.q('#knife'); if (kn) { kn.setAttribute('opacity', '0'); }
      /* 就近锁刀口 */
      var target = -1, best = 1e9;
      for (var i = 0; i < GUIDES.length; i++) {
        if (st.cutN > i) { continue; }
        var d = Math.abs(st.sx - GUIDES[i]);
        if (d < best) { best = d; target = i; }
      }
      if (target < 0) { hooks.tip('两条虚线都用过了。'); return; }
      if (best > 16) { hooks.tip('从虚线上缘往下划——刀要落在那条竖线上。'); return; }
      if (st.sy > SLAB.y0 + 14) { hooks.tip('落刀点要在面片上缘，别从半截起手。'); return; }
      if (!st.endReach) { hooks.tip('一刀要划到面片下缘——中途松手，面就断在半截。'); return; }
      if (st.dev > 16) { hooks.tip('切歪了——刀要直上直下。'); return; }
      var xc = GUIDES[target], P0 = st.pieces, hit = -1;
      for (var k = 0; k < P0.length; k++) { if (xc > P0[k].x0 + 4 && xc < P0[k].x1 - 4) { hit = k; break; } }
      if (hit < 0) { hooks.tip('这一刀落在缝里了。'); return; }
      P0.splice(hit, 1, { x0: P0[hit].x0, x1: xc }, { x0: xc, x1: P0[hit].x1 });
      st.cutN = (st.cutN || 0) + (target === 0 && st.cutN === 0 ? 1 : 1);
      st.cutN = Math.min(2, st.cutN);
      paint(); hooks.step(progress(), label());
      if (st.cutN >= 2) { hooks.done(false); }
    }

    var raf = 0;
    function loop() {
      raf = 0;
      if (st.beat === 0 && st.pressing) {
        var ph = Math.min(1, (now() - st.prT0) / DUR);
        var pr = cv.q('#pr'), arc = cv.q('#prarc');
        if (pr) {
          pr.setAttribute('opacity', '1');
          pr.setAttribute('transform', 'translate(150,' + (150 - KNEAD[clamp(st.tier, 0, 3)].ry * 0.6) + ')');
        }
        if (arc) {
          arc.setAttribute('stroke-dashoffset', n1(2 * Math.PI * 15 * (1 - ph)));
          arc.setAttribute('stroke', ph >= 0.92 ? '#6E9A94' : '#7FA9A1');
        }
        var dg = cv.q('#dough'), df = cv.q('#dflank');
        if (dg) { dg.setAttribute('d', doughPath(st.tier, ph)); }
        if (df) { df.setAttribute('d', doughPath(st.tier, ph)); }
        hooks.step(progress() + ph / 3 * 0.9, '按住…' + Math.round(ph * 100) + '%');
      }
      if (st.live) { raf = requestAnimationFrame(loop); }
    }

    return {
      beat: function (i) { st.beat = i; paint(); hooks.step(progress(), label()); },
      down: down, move: move, up: up,
      start: function () { st.live = true; if (!raf) { raf = requestAnimationFrame(loop); } },
      stop: function () { st.live = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
      progress: progress, label: label
    };
  }

  /* ============================================================
     校字：展卷（拉到底）／核字（点出错字，位置每局随机）／补阙（拖纸对缝）
     ============================================================ */
  var PROOF_BASE = ['世宗将南征，后常谏止之，', '久冒炎暑，后因忧恚成疾。'];
  var PROOF_POOL = [
    { l: 0, i: 8, bad: '练', n: '「谏」从言从柬，「练」从糸从柬——右旁全同，只差左旁。' },
    { l: 0, i: 7, bad: '尝', n: '「常」是常常，「尝」是曾经。音同形近，誊录最容易顺手写错。' },
    { l: 1, i: 3, bad: '署', n: '「暑」从日，「署」从罒。暑天误作官署，这一句就不通了。' },
    { l: 1, i: 10, bad: '疚', n: '「疾」是身病，「疚」是心愧。同从「疒」，久、矢一笔之差。' },
    { l: 1, i: 0, bad: '九', n: '「久」比「九」多一点。抄快了，那一笔就没了。' },
    { l: 1, i: 1, bad: '胃', n: '「冒」下从目，「胃」下从月（肉）。形近而义隔。' },
    { l: 1, i: 2, bad: '炙', n: '「炎」二火相叠，「炙」上肉下火——字形极近。' },
    { l: 1, i: 6, bad: '困', n: '「因」中为「大」，「困」中为「木」——框里那一笔不同。' },
    { l: 1, i: 9, bad: '戌', n: '「成」与「戌」差一横一点，是抄本里最常见的阑入。' },
    { l: 1, i: 8, bad: '恙', n: '「恚」是怒，「恙」是病。同以「心」为底，上部不同。' }
  ];
  var P_X0 = 86, P_ADV = 13.0, P_LH = 28, P_Y0 = 104;

  function playProof(cv, hooks) {
    var lines = PROOF_BASE.slice(), bad = {}, cells = [], cellsByLine = [[], []];
    (function roll() {
      var L0 = [], L1 = [], q;
      for (q = 0; q < PROOF_POOL.length; q++) { (PROOF_POOL[q].l === 0 ? L0 : L1).push(PROOF_POOL[q]); }
      var picked = [L0[Math.floor(Math.random() * L0.length)]];
      var rest = L1.slice();
      picked.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
      picked.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
      for (q = 0; q < picked.length; q++) {
        var c = picked[q];
        lines[c.l] = lines[c.l].slice(0, c.i) + c.bad + lines[c.l].slice(c.i + 1);
        (bad[c.l] = bad[c.l] || []).push(c.i);
      }
      for (var l = 0; l < 2; l++) {
        for (var i = 0; i < 12; i++) {
          var cell = { l: l, i: i, ch: lines[l].charAt(i), bad: (bad[l] || []).indexOf(i) >= 0,
            x: P_X0 + i * P_ADV, y: P_Y0 + l * P_LH, marked: false };
          cells.push(cell); cellsByLine[l].push(cell);
        }
      }
    })();

    var st = { beat: 0, pulled: 0, hits: 0, wrong: 0, sx: 0, sy: 0, dragging: false, patch: { x: 150, y: 96 }, placed: false };

    function paper() {
      var s = '<rect x="54" y="72" width="192" height="118" rx="3" fill="#FBF6EA" stroke="#DED7C9" stroke-width="1.2"/>';
      s += '<path d="M54 96 h192 M54 168 h192" stroke="#EFE7D5" stroke-width=".8" opacity=".7"/>';
      if (st.beat === 2) {
        s += '<rect x="' + (150 - 26) + '" y="' + (96 - 15) + '" width="52" height="30" rx="2" fill="#E7DFCC" stroke="#A8926A" stroke-width="1.2"/>';
        s += '<g id="patch"><path d="M-26 -15 h52 v30 h-52 Z" fill="#F3EBD8" stroke="#B9A67C" stroke-width="1.4"/>' +
          '<path d="M-18 -6 h12 M-20 2 h14" stroke="#CBBE9C" stroke-width="1" opacity=".9"/></g>';
      }
      if (st.beat === 1) {
        for (var i = 0; i < cells.length; i++) {
          var c = cells[i];
          s += '<circle class="hitarea" data-i="' + i + '" cx="' + n1(c.x) + '" cy="' + n1(c.y - 4) + '" r="7" fill="transparent"/>';
          s += '<text class="gtxt" data-i="' + i + '" x="' + n1(c.x) + '" y="' + n1(c.y) + '" font-size="12.6" text-anchor="middle" fill="#3A3A34">' + c.ch + '</text>';
        }
        for (var k = 0; k < cells.length; k++) {
          if (cells[k].marked) {
            s += '<ellipse cx="' + n1(cells[k].x) + '" cy="' + n1(cells[k].y - 4) + '" rx="9.4" ry="11" fill="none" stroke="' +
              (cells[k].bad ? '#B5503F' : '#9A9788') + '" stroke-width="1.6" stroke-dasharray="' + (cells[k].bad ? '0' : '3 3') + '"/>';
          }
        }
      } else {
        for (var m = 0; m < cells.length; m++) {
          /* 补阙这一拍：缺口覆盖的那几个字不画（缺口得真是空的） */
          if (st.beat === 2 && Math.abs(cells[m].x - 150) < 26 && Math.abs(cells[m].y - 96) < 16) { continue; }
          s += '<text class="gtxt" x="' + n1(cells[m].x) + '" y="' + n1(cells[m].y) + '" font-size="12.6" text-anchor="middle" fill="#3A3A34">' + cells[m].ch + '</text>';
        }
      }
      return s;
    }

    function scene() {
      if (st.beat === 0) {
        var open = st.pulled;
        return '<g clip-path="url(#pp)"><defs><clipPath id="pp"><rect x="54" y="70" width="192" height="122" rx="3"/></clipPath></defs>' +
          '<rect x="54" y="70" width="192" height="122" rx="3" fill="#FBF6EA" stroke="#DED7C9" stroke-width="1.2"/>' +
          '<g transform="translate(' + n1(-120 + 120 * open) + ',0)">' + paper() + '</g></g>' +
          '<rect x="54" y="70" width="192" height="122" rx="3" fill="none" stroke="#A8926A" stroke-width="1.6"/>' +
          '<g transform="translate(' + n1(60 + 180 * open) + ',0)"><rect x="-6" y="60" width="12" height="142" rx="5" fill="#C9B48A" stroke="#8A6E33" stroke-width="1.2"/>' +
          '<rect x="-9" y="60" width="18" height="9" rx="4" fill="#A8895A"/><rect x="-9" y="193" width="18" height="9" rx="4" fill="#A8895A"/></g>' +
          '<path d="M66 200 h' + n1(168 * open) + '" stroke="#DED7C9" stroke-width="2"/>';
      }
      if (st.beat === 1) { return paper() + '<text x="150" y="200" font-size="9.5" text-anchor="middle" fill="#8A8378">点出错字 · 一下一个</text>'; }
      return paper() + '<text x="150" y="200" font-size="9.5" text-anchor="middle" fill="#8A8378">把补纸拖到缺口上</text>';
    }
    function paint() {
      cv.html(scene());
      if (st.beat === 2) {
        var g = cv.q('#patch');
        if (g) { g.setAttribute('transform', 'translate(' + n1(st.patch.x) + ',' + n1(st.patch.y) + ')'); }
      }
    }
    function progress() {
      if (st.beat === 0) { return st.pulled; }
      if (st.beat === 1) { return st.hits / 3; }
      return st.placed ? 1 : 0;
    }
    function label() {
      if (st.beat === 0) { return '展卷 ' + Math.round(st.pulled * 100) + '%'; }
      if (st.beat === 1) { return '已点 ' + st.hits + ' / 3 处'; }
      return st.placed ? '已补' : '待补';
    }

    function down(p) {
      guardDown(st, st.beat);
      if (st.beat === 0) { st.dragging = true; st.sx = p.x; return; }
      if (st.beat === 2) { st.dragging = true; return; }
      /* 核字：点选 */
      var hit = null;
      for (var i = 0; i < cells.length; i++) {
        if (Math.abs(p.y - (cells[i].y - 4)) <= 15 && (!hit || Math.abs(p.x - cells[i].x) < Math.abs(p.x - hit.x))) { hit = cells[i]; }
      }
      if (!hit) { return; }
      if (hit.marked) { return; }
      hit.marked = true;
      if (hit.bad) { st.hits++; hooks.tip('错字：「' + PROOF_BASE[hit.l].charAt(hit.i) + '」误作「' + hit.ch + '」'); }
      else { st.wrong++; hooks.tip('无讹'); }
      paint(); hooks.step(progress(), label());
      if (st.hits >= 3 && !st._done) { st._done = true; hooks.done(false); }
    }
    function move(p) {
      if (st.beat === 0 && st.dragging) {
        st.pulled = clamp((p.x - 92) / (250 - 92), 0, 1);
        paint(); hooks.step(progress(), label());
        return;
      }
      if (st.beat === 2 && st.dragging) { st.patch.x = p.x; st.patch.y = p.y; paint(); }
    }
    function up(p) {
      if (!guardUp(st, st.beat)) { return; }
      if (st.beat === 0) {
        st.dragging = false;
        if (st.pulled > 0.94) { st.pulled = 1; paint(); hooks.done(false); }
        else { hooks.tip('卷要拉到底——到底会停住。'); }
        return;
      }
      if (st.beat === 2) {
        st.dragging = false;
        if (dist(st.patch, { x: 150, y: 96 }) < 20) {
          st.placed = true; st.patch = { x: 150, y: 96 }; paint(); hooks.step(1, label()); hooks.done(false);
        } else { hooks.tip('补纸要对上缺口。'); }
      }
    }

    return {
      beat: function (i) { st.beat = i; paint(); hooks.step(progress(), label()); },
      down: down, move: move, up: up,
      start: function () {}, stop: function () {},
      progress: progress, label: label
    };
  }

  /* ============================================================
     投壶对投：拖矢拉弓 → 抛物线 → 中或不中；与「客」轮流投，三矢定胜负
     ============================================================ */
  function playTouhu(cv, hooks) {
    var POTS = { x: 232, y: 128 };
    var st = { beat: 0, me: 0, ai: 0, phase: 'aim', dragging: false, sx: 0, sy: 0, dx: 0, dy: 0, log: '', flight: '' };

    function scene() {
      var s = '';
      s += '<path d="M0 150 h300" stroke="#D8CFBA" stroke-width="1"/>';
      s += '<ellipse cx="150" cy="196" rx="150" ry="18" fill="#E6DECB" opacity=".55"/>';
      /* 壶：颈细腹鼓，双耳 */
      s += '<path d="M' + (POTS.x - 15) + ' 132 q-2 30 5 38 h20 q7 -8 5 -38 Z" fill="#A8B4AC" stroke="#5E6B64" stroke-width="1.6"/>';
      s += '<ellipse cx="' + POTS.x + '" cy="132" rx="15" ry="5" fill="#DDE4DE" stroke="#5E6B64" stroke-width="1.4"/>';
      s += '<ellipse cx="' + POTS.x + '" cy="132" rx="8" ry="2.6" fill="#3E4A44"/>';
      s += '<path d="M' + (POTS.x - 13) + ' 152 q13 6 26 0" stroke="#8FA79E" stroke-width="1.2" fill="none" opacity=".8"/>';
      s += '<path d="M' + (POTS.x - 17) + ' 138 q-6 6 0 10 M' + (POTS.x + 17) + ' 138 q6 6 0 10" fill="none" stroke="#8FA79E" stroke-width="2"/>';
      /* 矢架：三矢，投过一支就淡一支 */
      s += '<path d="M40 190 h48" stroke="#8A7B5E" stroke-width="2"/>';
      for (var i = 0; i < 3; i++) {
        s += '<g opacity="' + (i < (3 - st.me - (st.phase === 'aim' ? 1 : 0)) ? '1' : '.18') + '">' +
          '<path d="M' + (48 + i * 12) + ' 190 l0 -34" stroke="#C9B48A" stroke-width="2.2"/>' +
          '<path d="M' + (48 + i * 12) + ' 156 l4 6 -4 3 -4 -3 Z" fill="#8FA79E"/></g>';
      }
      if (st.phase === 'aim') {
        s += '<g transform="translate(96,166)"><path d="M0 0 l0 -40" stroke="#C9B48A" stroke-width="2.6"/>' +
          '<path d="M0 -46 l5 8 -5 4 -5 -4 Z" fill="#8FA79E"/><path d="M-4 0 h8" stroke="#B5503F" stroke-width="2"/></g>';
        s += '<path id="aim" d="" fill="none" stroke="#D9B36C" stroke-width="1.6" stroke-dasharray="4 4" opacity=".85"/>';
        s += '<text x="96" y="196" font-size="8.5" text-anchor="middle" fill="#8A8378">向右上拖：拖多远＝力多大</text>';
      }
      /* 比分别压在矢架上：右上角一栏，和"我/客"对齐读 */
      s += '<text x="286" y="196" font-size="10" text-anchor="end" fill="#527E79">我 ' + st.me + ' · 客 ' + st.ai + '</text>';
      if (st.log) { s += '<text x="150" y="36" font-size="10.5" text-anchor="middle" fill="#5A5750">' + st.log + '</text>'; }
      s += st.flight;
      return s;
    }
    function paint() { cv.html(scene()); }
    function progress() { return st.phase === 'aim' ? 0 : (st.phase === 'fly' ? 0.5 : 1); }
    function label() { return '第 ' + (st.beat + 1) + ' / 2 矢 · 我 ' + st.me + ' : ' + st.ai + ' 客'; }

    function aimVec() {
      var d = Math.sqrt(st.dx * st.dx + st.dy * st.dy);
      var pow = Math.min(1, d / 140);
      var up = d > 2 ? clamp(-st.dy / d, -1, 1) : 0;   /* 往上带得越多，弧越高 */
      return { pow: pow, up: up, d: d };
    }
    function updateAim() {
      var a = cv.q('#aim');
      if (!a) { return; }
      var A = aimVec();
      var vx = 150 + A.pow * 130, vy = -34 - Math.max(0, A.up) * 120 * A.pow;
      var pts = [];
      for (var t = 0; t < 50; t++) {
        var tt = t * 0.1;
        var px = 96 + vx * tt, py = 166 + vy * tt + 0.5 * 230 * tt * tt;
        if (py > 198 || px > 300) { break; }
        pts.push(n1(px) + ' ' + n1(py));
      }
      a.setAttribute('d', pts.length ? 'M' + pts.join(' L') : '');
      hooks.step(0.05, '力 ' + Math.round(A.pow * 100) + ' · 弧 ' + Math.round(Math.max(0, A.up) * 100));
    }

    /* 一矢：抛物飞出去，落点由中/不中决定 */
    function flyArc(from, to, hi, dur, ink, cb) {
      var t0 = now();
      (function step() {
        var k = Math.min(1, (now() - t0) / dur);
        var x = from.x + (to.x - from.x) * k;
        var y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * hi;
        st.flight = '<g transform="translate(' + n1(x) + ',' + n1(y) + ') rotate(' + n1(k * 210) + ')">' +
          '<path d="M0 0 l0 -26" stroke="' + ink + '" stroke-width="2.6"/>' +
          '<path d="M0 -32 l5 8 -5 4 -5 -4 Z" fill="' + (ink === '#C9B48A' ? '#8FA79E' : '#C9A34E') + '"/></g>';
        paint();
        if (k < 1) { requestAnimationFrame(step); }
        else { st.flight = ''; cb(); }
      })();
    }

    function myTurnEnd(hit) {
      if (hit) { st.me++; }
      st.log = hit ? '我：中！' : '我：偏了。';
      st.phase = 'fly'; paint();
      setTimeout(function () { aiTurn(hit); }, 480);
    }
    function aiTurn(myHit) {
      st.phase = 'ai'; paint();
      setTimeout(function () {
        var hit = Math.random() < 0.5;
        flyArc({ x: 62, y: 170 }, hit ? { x: POTS.x, y: POTS.y } : { x: POTS.x - 30, y: 174 }, hit ? 92 : 66, 540, '#B08A56', function () {
          if (hit) { st.ai++; }
          st.log = (myHit ? '我中' : '我失') + ' · 客' + (hit ? '中。' : '失。');
          st.phase = 'done'; paint();
          hooks.step(1, label());
          hooks.done(!myHit);
        });
      }, 520);
    }

    function down(p) {
      if (st.phase !== 'aim') { return; }
      st.dragging = true; st.sx = p.x; st.sy = p.y; st.dx = 0; st.dy = 0;
      guardDown(st, st.beat);
    }
    function move(p) {
      if (!st.dragging || st.phase !== 'aim') { return; }
      st.dx = p.x - st.sx; st.dy = p.y - st.sy;
      updateAim();
    }
    function up() {
      if (!st.dragging || st.phase !== 'aim') { return; }
      if (!guardUp(st, st.beat)) { return; }
      st.dragging = false;
      var A = aimVec();
      if (A.pow < 0.25) { hooks.tip('矢要脱手——按住矢拖远一点。'); return; }
      var hit = A.pow >= 0.42 && A.up >= 0.22 && A.up <= 0.95;
      st.phase = 'fly';
      flyArc({ x: 96, y: 166 }, hit ? { x: POTS.x, y: POTS.y } : { x: POTS.x + 28, y: 178 }, hit ? 92 : 58, 600, '#C9B48A', function () {
        myTurnEnd(hit);
      });
    }

    return {
      beat: function (i) { st.beat = i; st.phase = 'aim'; st.dragging = false; st.dx = 0; st.dy = 0; st.log = ''; paint(); hooks.step(0, label()); },
      down: down, move: move, up: up,
      start: function () {}, stop: function () {},
      progress: progress, label: label
    };
  }


  /* ===== 承露囊 / 丝束（从校准页原样搬） ===== */
/* 颜色加/减亮度（%）：系带、合缝这些要用同一色系的深一档 */
function shadeHex(h, k){
  var n = parseInt(String(h).replace('#', ''), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  function f2(v){ v = Math.round(v * k); v = v < 0 ? 0 : (v > 255 ? 255 : v); return ('0' + v.toString(16)).slice(-2); }
  return '#' + f2(r) + f2(g) + f2(b);
}

function bagSVG(o){
  o = o || {};
  var cols = o.cols && o.cols.length ? o.cols : ['#8FB5B0', '#B08A8A', '#DCD6CA'];
  var body = o.body == null ? 0 : (o.body | 0);
  var wound = o.wound || 0, spice = !!o.spice, bow = o.bow || 0;
  var cinch = o.cinch == null ? 1 : o.cinch;
  var m = 150, s = '', k, pi;
  var neck = 10 - 3 * cinch;                  /* 腰线半宽：收口 7、开口 10 */
  var W = 24 + 2 * cinch;                     /* 腹半宽（52 宽 / 46 高） */
  var yW = 104, yB = 150;
  var tone = [['#F4EEE2', '#A89678'], ['#E8C68C', '#8E6428'], ['#D9E2DA', '#6F7D74']][body] ||
             ['#F4EEE2', '#A89678'];
  var dk = shadeHex(tone[1], 0.74);
  function f(v){ return v.toFixed(1); }

  /* 挂环：一小圈（大环就是双耳瓶的耳） */
  s += '<path d="M150 93 C143.5 89 143.5 79 150 79 C156.5 79 156.5 89 150 93 Z" fill="none" stroke="#A28D66" stroke-width="1.9"/>';

  /* 布头：那一撮被抽紧的布是**鼓**的（收成锥形就成了瓶颈） */
  s += '<path d="M' + f(m - neck) + ' 106 C' + f(m - neck - 1.5) + ' 100 ' + f(m - neck - 3) + ' 96 ' + f(m - 5) + ' 93.4' +
       ' C' + f(m - 1.6) + ' 92.2 ' + f(m + 1.6) + ' 92.2 ' + f(m + 5) + ' 93.4' +
       ' C' + f(m + neck + 3) + ' 96 ' + f(m + neck + 1.5) + ' 100 ' + f(m + neck) + ' 106 Z"' +
       ' fill="' + tone[0] + '" stroke="' + tone[1] + '" stroke-width="1.1"/>';
  /* 布头上的两道褶：这一撮布被攥过 */
  s += '<path d="M' + (m - 3) + ' 95.6 L' + (m - 4) + ' 104 M' + (m + 3) + ' 95.6 L' + (m + 4) + ' 104" fill="none" stroke="' + tone[1] + '" stroke-width=".8" opacity=".3"/>';

  /* 袋身：腰上一收，肩迅速张开，底是一段圆弧 */
  s += '<path d="M' + f(m - neck) + ' ' + yW +
       ' C' + f(m - 19) + ' 107 ' + f(m - W) + ' 113 ' + f(m - W) + ' 126' +
       ' C' + f(m - W) + ' 140 ' + f(m - 15) + ' ' + yB + ' ' + m + ' ' + yB +
       ' C' + f(m + 15) + ' ' + yB + ' ' + f(m + W) + ' 140 ' + f(m + W) + ' 126' +
       ' C' + f(m + W) + ' 113 ' + f(m + 19) + ' 107 ' + f(m + neck) + ' ' + yW + ' Z"' +
       ' fill="' + tone[0] + '" stroke="' + tone[1] + '" stroke-width="1.5"/>';

  if (spice) s += '<ellipse cx="150" cy="132" rx="16" ry="12" fill="#C9A34E" opacity=".11"/>';

  /* 纹样：三种囊体三种花，只占腹心一小块（铺满就成灯笼） */
  if (body === 0){        /* 素绢：团花 */
    s += '<g fill="none" stroke="' + tone[1] + '" stroke-width=".9" opacity=".42">' +
           '<circle cx="150" cy="132" r="6"/>' +
           '<path d="M150 126 l6 6 l-6 6 l-6 -6 Z"/>' +
         '</g>' +
         '<circle cx="150" cy="132" r="1.9" fill="' + tone[1] + '" opacity=".32"/>';
  } else if (body === 1){ /* 锦缎：云头两道 */
    s += '<g stroke="' + tone[1] + '" stroke-width="1.5" fill="none" opacity=".6">' +
           '<path d="M139 130 q5.5 -8 11 -3 q5.5 5 11 -3"/>' +
           '<path d="M141 139 q4.5 -7 9 -2.5 q4.5 4.5 9 -2.5"/>' +
         '</g>';
  } else {                /* 缂丝：织纹（横线是梭路，不是花纹） */
    s += '<g stroke="' + tone[1] + '" stroke-width=".85" opacity=".3">' +
           '<path d="M130 124 h40 M129 129 h42 M129 134 h42 M130 139 h40"/>' +
         '</g>';
  }

  /* 抽褶：只留腰下三道很短的（放射到腹中＋底 V＋虚线轮廓＝一张网，全撤） */
  for (pi = -1; pi <= 1; pi++){
    var xa = m + pi * (neck - 2) / 1.6, xb = m + pi * 6;
    s += '<path d="M' + f(xa) + ' 107 Q' + f((xa + xb) / 2) + ' 112 ' + f(xb) + ' 118" fill="none" stroke="' +
         tone[1] + '" stroke-width=".8" opacity=".22"/>';
  }
  /* 亮面：只一道，沿左上 */
  s += '<path d="M' + (m - 15) + ' 116 C' + (m - 19) + ' 125 ' + (m - 18) + ' 136 ' + (m - 12) + ' 143" fill="none" stroke="#FFFDF6" stroke-width="2.6" opacity=".42"/>';

  /* 束口带：横在腰线上 */
  s += '<rect x="' + f(m - neck - 2) + '" y="99" width="' + f(neck * 2 + 4) + '" height="6.8" rx="3.4" fill="' +
       tone[1] + '" opacity=".58"/>';
  s += '<ellipse cx="150" cy="99" rx="' + f(neck + 2) + '" ry="2.2" fill="' + dk + '" opacity=".4"/>';
  if (spice) s += '<ellipse cx="150" cy="100.2" rx="' + f(neck - 1.6) + '" ry="1.6" fill="#B39A6A"/>';

  /* 抽绳：贴着袋身两侧垂下，末端一个小结 */
  s += '<path d="M' + f(m - neck - 1.6) + ' 106 C' + f(m - 15) + ' 112 ' + f(m - 16) + ' 119 ' + f(m - 14) + ' 124" fill="none" stroke="' + cols[0] + '" stroke-width="1.3" opacity=".72"/>' +
       '<path d="M' + f(m + neck + 1.6) + ' 106 C' + f(m + 15) + ' 112 ' + f(m + 16) + ' 119 ' + f(m + 14) + ' 124" fill="none" stroke="' + cols[0] + '" stroke-width="1.3" opacity=".72"/>' +
       '<path d="M' + f(m - 14) + ' 123 l-2.4 5 M' + f(m - 14) + ' 123 l0 5.6 M' + f(m - 14) + ' 123 l2.4 5" stroke="' + cols[0] + '" stroke-width=".9" opacity=".7" fill="none"/>' +
       '<path d="M' + f(m + 14) + ' 123 l-2.4 5 M' + f(m + 14) + ' 123 l0 5.6 M' + f(m + 14) + ' 123 l2.4 5" stroke="' + cols[0] + '" stroke-width=".9" opacity=".7" fill="none"/>';

  /* 绕丝：三道细丝缠在腰上，宽度跟着腰走（横贯腹部就成了旗子） */
  for (k = 0; k < wound; k++){
    var yy = 100 + k * 3.6, hw = neck + 1.6 + k * 2.2, ck = cols[k % cols.length];
    s += '<path d="M' + f(m - hw) + ' ' + f(yy) + ' q' + f(hw) + ' 4 ' + f(hw * 2) + ' 0" fill="none" stroke="' + ck + '" stroke-width="2.6"/>';
    s += '<path d="M' + f(m - hw) + ' ' + f(yy + 0.9) + ' q' + f(hw) + ' -1.6 ' + f(hw * 2) + ' 0" fill="none" stroke="' + ck + '" stroke-width="1" opacity=".4"/>';
  }

  /* 结：一枚纽结 + 两条垂尾（蝴蝶结读的是"礼品包装"，不是"扎口的结"） */
  if (bow >= 1){
    var cy2 = 96, kb = shadeHex(cols[0], 0.7), kl = shadeHex(cols[0], 1.2);
    s += '<path d="M' + (m - 1.5) + ' ' + (cy2 + 2.5) + ' q-4 7 1.5 11" fill="none" stroke="' + cols[0] + '" stroke-width="1.6" stroke-linecap="round"/>' +
         '<path d="M' + (m + 1.5) + ' ' + (cy2 + 2.5) + ' q4 7 -1.5 11" fill="none" stroke="' + cols[0] + '" stroke-width="1.6" stroke-linecap="round"/>' +
         '<circle cx="' + m + '" cy="' + cy2 + '" r="3.2" fill="' + kl + '" stroke="' + kb + '" stroke-width="1"/>' +
         '<path d="M' + (m - 2.2) + ' ' + (cy2 - 1.6) + ' q2.2 -1.6 4.4 0" fill="none" stroke="' + kb + '" stroke-width=".7" opacity=".7"/>';
  }
  return s;
}

/* ---------- 面团几何 ----------
   面团不是一片扁平的椭圆，是"有厚度的一团"：顶面（可形变的闭合轮廓）＋前缘厚度带。
   凹陷按**弧长**定位（不是极角）：坑宽稳定在 ~26px，不会因为按在边缘就变成被咬掉一块。
   按点靠边 → 局部内凹 + 两侧挤出鼓包（捏边）；按点靠中 → 以整体压扁为主（按下去）。 */
function doughShape(g, tier, squash){
  var t = KNEAD_TIERS[clamp(tier | 0, 0, KNEAD_TIERS.length - 1)];
  var N = 48, i, th, sn, pts = [], top = '', flank = '';
  var sq = squash || 0;

  /* 按住时的"预览下压"：只压一点点（13%），松手就回档位原样 ——
     真正换形是在"按满松手"那一下，不在按的过程中连续塌陷 */
  var rx = t.rx * (1 + 0.045 * sq);
  var ryT = t.ry * (1 - 0.13 * sq);          /* 上半弧：面团隆起的高度 */
  var ryB = ryT * 0.68;                       /* 下半弧：贴着案面，更扁 */
  var cy = 150 - ryB;                         /* 底边钉在 y=150，不上浮 */

  for (i = 0; i < N; i++){
    th = i / N * Math.PI * 2;
    sn = Math.sin(th);
    pts.push({ x: 150 + rx * Math.cos(th), y: cy + (sn > 0 ? ryB : ryT) * sn, th: th });
  }
  for (i = 0; i < N; i++){ top += (i ? 'L' : 'M') + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1); }
  top += 'Z';

  /* 前缘厚度带：下半弧往下拉出厚度再折回 —— 面团才有"体积"，不是一张贴纸 */
  var half = [], thk = t.thk;
  for (i = 0; i < N; i++){ if (pts[i].th >= -0.02 && pts[i].th <= Math.PI + 0.02) { half.push(pts[i]); } }
  for (i = 0; i < half.length; i++){ flank += (i ? 'L' : 'M') + half[i].x.toFixed(1) + ' ' + half[i].y.toFixed(1); }
  for (i = half.length - 1; i >= 0; i--){ flank += 'L' + half[i].x.toFixed(1) + ' ' + (half[i].y + thk).toFixed(1); }
  flank += 'Z';

  return { top: top, flank: flank, rx: rx, ryT: ryT, ryB: ryB, cy: cy, thk: thk, tier: (tier | 0) };
}

/* ---------- 补纸路径：缺口与补纸共用同一组顶点 ---------- */
function patchPath(cx, cy){
  var d = '', i, p;
  for (i = 0; i < PATCH_PTS.length; i++){
    p = PATCH_PTS[i];
    d += (i ? 'L' : 'M') + (cx + p[0]) + ' ' + (cy + p[1]);
  }
  return d + 'Z';
}

/* ---------- 描字：把笔顺数据铺进格框，算出每一笔的几何 ---------- */
function glyphPrep(g){
  if (g.chars) { return g; }
  var N = g.text.length, cols = g.cols || N, rows = g.rows || 1;
  var cw = g.bw / cols, chh = g.bh / rows, pad = g.pad == null ? 4 : g.pad;
  var chars = [], flat = [], i, j, q;
  for (i = 0; i < N; i++){
    var ch = g.text.charAt(i), d = HZ[ch];
    if (!d) { continue; }
    var ox = g.bx + (i % cols) * cw + pad, oy = g.by + Math.floor(i / cols) * chh + pad;
    var boxW = cw - pad * 2, boxH = chh - pad * 2;
    var k = Math.min(boxW, boxH) / 100;
    var cx = ox + (boxW - 100 * k) / 2, cy = oy + (boxH - 100 * k) / 2;
    var sts = [];
    for (j = 0; j < d.m.length; j++){
      var pts = [];
      for (q = 0; q < d.m[j].length; q++){
        pts.push({ x: cx + d.m[j][q][0] * k, y: cy + d.m[j][q][1] * k });
      }
      var cum = [0], tot = 0;
      for (q = 1; q < pts.length; q++){ tot += dist(pts[q - 1], pts[q]); cum.push(tot); }
      /* 采样点：约 3.5px 一个，供覆盖率判定 */
      var samp = [{ x: pts[0].x, y: pts[0].y }];
      for (q = 1; q < pts.length; q++){
        var seg = cum[q] - cum[q - 1], cnt = Math.max(1, Math.round(seg / 3.5));
        for (var u = 1; u <= cnt; u++){
          var t2 = u / cnt;
          samp.push({ x: pts[q - 1].x + (pts[q].x - pts[q - 1].x) * t2,
                      y: pts[q - 1].y + (pts[q].y - pts[q - 1].y) * t2 });
        }
      }
      var so = { ch: ch, ci: i, si: j, gi: flat.length, pts: pts, len: tot, samp: samp,
                 start: pts[0], end: pts[pts.length - 1], d: d.s[j],
                 cx: cx, cy: cy, k: k, done: false };
      sts.push(so); flat.push(so);
    }
    chars.push({ ch: ch, cx: cx, cy: cy, k: k, strokes: sts });
  }
  g.chars = chars; g.flat = flat; g.nStroke = flat.length;
  if (!g.TS) { g.TS = 9000; }
  g.T = g.nStroke * g.TS + 30000;          /* 全局只作兜底，真正的时限是每笔 TS */
  return g;
}

/* 点到某笔画中线的最近距离 */
function distStroke(p, so){
  var best = 1e9, i, a, b, dx, dy, L2, t2, px, py, d2;
  for (i = 1; i < so.pts.length; i++){
    a = so.pts[i - 1]; b = so.pts[i];
    dx = b.x - a.x; dy = b.y - a.y; L2 = dx * dx + dy * dy;
    t2 = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0;
    t2 = t2 < 0 ? 0 : (t2 > 1 ? 1 : t2);
    px = a.x + dx * t2; py = a.y + dy * t2;
    d2 = (p.x - px) * (p.x - px) + (p.y - py) * (p.y - py);
    if (d2 < best) { best = d2; }
  }
  if (so.pts.length === 1) { best = (p.x - so.pts[0].x) * (p.x - so.pts[0].x) + (p.y - so.pts[0].y) * (p.y - so.pts[0].y); }
  return Math.sqrt(best);
}

/* ---------- 残页版式：两行正文里三处错字的位置（与 <text> 同源） ---------- */
function proofLayout(g, force){
  if (g.cells && !force) { return g; }
  /* 掷本轮的三处错字：第一行 1 处 + 第二行 2 处（两行都得看，不能只扫一行） */
  if (force || !g.cells){
    var L0 = [], L1 = [], q1;
    for (q1 = 0; q1 < PROOF_POOL.length; q1++){ (PROOF_POOL[q1].l === 0 ? L0 : L1).push(PROOF_POOL[q1]); }
    var chosen = [L0[Math.floor(Math.random() * L0.length)]];
    var rest = L1.slice();
    for (q1 = 0; q1 < 2; q1++){
      chosen.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    }
    var nl = PROOF_BASE.slice(), nb = {}, q2;
    for (q2 = 0; q2 < chosen.length; q2++){
      var cc = chosen[q2];
      nl[cc.l] = nl[cc.l].slice(0, cc.i) + cc.bad + nl[cc.l].slice(cc.i + 1);
      if (!nb[cc.l]) { nb[cc.l] = []; }
      nb[cc.l].push(cc.i);
    }
    PROOF.lines = nl; PROOF.bad = nb; PROOF.right = PROOF_BASE.slice(); PROOF.tl = PROOF_BASE.slice();
    /* 三条校记跟着本轮的错字走（不再写死 chk0-2） */
    var NUM = ['一', '二', '三'];
    for (q2 = 0; q2 < chosen.length; q2++){
      var c9 = chosen[q2];
      LORE['chk' + q2] = {
        h: '错字' + NUM[q2] + '：「' + PROOF_BASE[c9.l].charAt(c9.i) + '」误作「' + c9.bad + '」（形近）',
        b: '《旧五代史》卷一百二十一：「' + c9.b + '」',
        n: c9.n
      };
    }
  }
  var cells = [], l, i, line, ch;
  for (l = 0; l < PROOF.lines.length; l++){
    line = PROOF.lines[l];
    for (i = 0; i < line.length; i++){
      ch = line.charAt(i);
      cells.push({
        x: +(PROOF.x0 + (i + 0.5) * PROOF.adv).toFixed(1),
        y: PROOF.y0 + l * PROOF.lh,
        r: PROOF.r, ch: ch, tch: (PROOF.tl[l] || '') .charAt(i) || ch,
        l: l, i: i, idx: cells.length,
        bad: !!(PROOF.bad[l] && PROOF.bad[l].indexOf(i) >= 0)
      });
    }
  }
  g.cells = cells;
  g.targets = [];
  for (i = 0; i < cells.length; i++){ if (cells[i].bad) { g.targets.push(cells[i]); } }
  return g;
}

/* ---------- 载入前置：派生数据只算一次 ---------- */
function prepSection(sec){
  for (var i = 0; i < sec.beats.length; i++){
    var g = sec.beats[i].g;
    if (sec.id === 'folk' && g.lay === 'silk' && !g.skeins){
      /* 十二束 = 六色各二，分挂两排，位置打乱：同色有两束但只许拿一束，
         所以玩家要"读色"而不是"点数"——这是"挑"和"点三下"的分界 */
      var pool = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5], q, r2, tmp;
      for (q = pool.length - 1; q > 0; q--){
        r2 = Math.floor(Math.random() * (q + 1));
        tmp = pool[q]; pool[q] = pool[r2]; pool[r2] = tmp;
      }
      g.skeins = [];
      for (q = 0; q < pool.length; q++){
        /* 两排各六束，x 从 56 到 246，行高 52 */
        g.skeins.push({ x: 56 + (q % 6) * 38, y: (q < 6 ? 42 : 94), c: pool[q], id: q });
      }
      g.targets = g.skeins.map(function(sk){ return { x: sk.x, y: sk.y + 20, r: 15 }; });
    }
    if (g.t === 'glyph') { glyphPrep(g); }
    if (g.t === 'pick' && g.lay === 'proof') { proofLayout(g, true); }
  }
}

/* ---------- 原文对照面板 ---------- */
function srcToggle(on){
  var sb = document.getElementById('srcbox'), bs = document.getElementById('btnsrc');
  if (!sb) { return; }
  var want = (on == null) ? !sb.classList.contains('on') : !!on;
  if (want) {
    srcTable();
    /* 抽屉是 fixed 的：先把舞台顶对齐视口，残页才不会被压在抽屉底下 */
    var stg = document.getElementById('stage');
    if (stg && stg.scrollIntoView) { stg.scrollIntoView({ block: 'start', behavior: 'auto' }); }
  }
  sb.classList.toggle('on', want);
  if (bs) { bs.classList.toggle('primary', want); }
}

/* ---------- 史料卡 ---------- */
var LORE_T = 0;
function loreShow(id){
  var L = LORE[id], box = document.getElementById('lorecard');
  if (!L || !box) { return; }
  box.innerHTML = '<div class="lc-h">' + L.h + '</div>' +
                  '<div class="lc-b">' + L.b + '</div>' +
                  '<div class="lc-n">' + L.n + '</div>' +
                  '<div class="lc-x">点此收起</div>';
  box.classList.add('on');
  if (LORE_T) { clearTimeout(LORE_T); }
  LORE_T = setTimeout(loreHide, 7000);
}
function loreHide(){
  var box = document.getElementById('lorecard');
  if (box) { box.classList.remove('on'); }
  if (LORE_T) { clearTimeout(LORE_T); LORE_T = 0; }
}


/* ---------- 丝束：一束＝六股丝 + 束腰 + 散头 ---------- */
/* 六色：青 / 月白 / 胭脂 / 藕荷 / 藤黄 / 黛蓝。
   原来是五色、架上八束（四色各二），可选面太窄——反馈说"颜色过于单调"。
   六个色相在两排架子上才排得开，也不至于多到挑不出来。 */
var SILK_COLS = ['#3F9187', '#E7E0D1', '#C05D6C', '#9670A6', '#CE9426', '#3F5F86'];
var SILK_NAMES = ['青', '月白', '胭脂', '藕荷', '藤黄', '黛蓝'];
var SILK_OFF = [-6.4, -3.8, -1.3, 1.3, 3.8, 6.4];

function skeinSVG2(x, y, id, col, h){
  var c0 = col || '#CFC7B8';
  var H = h || 38;                       /* 束长：一排架子放六束，矮一点才排得开 */
  var out = '<g id="sk' + id + '">', i, o, w;
  for (i = 0; i < SILK_OFF.length; i++){
    o = SILK_OFF[i];
    w = (i === 2 || i === 3) ? 1.8 : 1.2;
    out += '<path d="M' + (x + o).toFixed(1) + ' ' + y +
           ' C' + (x + o - 3).toFixed(1) + ' ' + (y + H * 0.34).toFixed(1) + ' ' +
           (x + o + 3).toFixed(1) + ' ' + (y + H * 0.68).toFixed(1) + ' ' +
           (x + o).toFixed(1) + ' ' + (y + H) + '" fill="none" stroke="' + c0 + '" stroke-width="' + w + '"/>';
  }
  /* 束腰：一道纸箍 */
  out += '<rect x="' + (x - 7.8).toFixed(1) + '" y="' + (y + H * 0.4).toFixed(1) + '" width="15.6" height="5" rx="2.5" fill="#F2EADA" stroke="#B9A67C" stroke-width=".8"/>';
  out += '<path data-fix="1" d="M' + (x - 7.4).toFixed(1) + ' ' + (y + H * 0.42).toFixed(1) + ' q7.4 3 14.8 0" fill="none" stroke="#B9A67C" stroke-width="1"/>';
  /* 散头 */
  out += '<path d="M' + (x - 6).toFixed(1) + ' ' + (y + H) + ' q-4 5 -7 9 M' + (x + 6).toFixed(1) + ' ' + (y + H) + ' q4 5 7 9" fill="none" stroke="' + c0 + '" stroke-width="1.1" opacity=".9"/>';
  /* 高光 */
  out += '<path data-fix="1" d="M' + (x - 3.9).toFixed(1) + ' ' + (y + 4) + ' q-2.2 ' + (H * 0.45).toFixed(1) + ' 0 ' + (H * 0.6).toFixed(1) + '" fill="none" stroke="#FFFDF6" stroke-width="1.1" opacity=".55"/>';
  /* 描边：月白这类浅色在白底上看不见，加一道极淡的外沿 */
  out += '<path data-fix="1" d="M' + (x - 6.4).toFixed(1) + ' ' + y + ' v' + H + '" stroke="' + c0 + '" stroke-width=".6" opacity=".35" fill="none"/>' +
         '<path data-fix="1" d="M' + (x + 6.4).toFixed(1) + ' ' + y + ' v' + H + '" stroke="' + c0 + '" stroke-width=".6" opacity=".35" fill="none"/>';
  return out + '</g>';
}


  /* ===== 以下画法/字模从校准页原样搬过来（避免手抄走形） ===== */
/* ---------- 毛笔 ----------
   笔尖在 (0,0)，笔身向上长：笔头（浅毛→含墨变深）→ 笔斗 → 竹杆。
   旧版是「圆球 + 一根直条」，看着像棉签；笔头是一个有腰的锥，才认得出是笔。
   ink 0..1：0 = 干笔（浅毫），1 = 饱墨（墨色）；
   wrap 0..1：笔头根部的「墨位」——含墨越多，墨线爬得越高。 */
function brushSVG(ink, sc){
  var k = ink == null ? 0 : Math.max(0, Math.min(1, ink));
  var hair = k > 0.66 ? '#1E1E24' : (k > 0.2 ? '#4A4A52' : '#D8CBB4');
  var hairEdge = k > 0.2 ? '#14141A' : '#B9A67C';
  return '<g class="brush" transform="scale(' + (sc || 1) + ')">' +
    /* 笔头：从尖到根，两侧收腰 */
    '<path d="M0 0 C-3.2 -7 -3.6 -12 -2.2 -16 L2.2 -16 C3.6 -12 3.2 -7 0 0 Z" fill="' + hair + '" stroke="' + hairEdge + '" stroke-width=".9"/>' +
    /* 笔头含墨的那一截（深色） */
    '<path d="M0 0 C-2.6 -5 -2.9 -9 -2.2 -12 L2.2 -12 C2.9 -9 2.6 -5 0 0 Z" fill="#1E1E24" opacity="' + (0.15 + 0.8 * k).toFixed(2) + '"/>' +
    /* 笔尖一点高光，别糊成一团 */
    '<path d="M-1 -3 C-1.6 -7 -1.5 -10 -1 -12" stroke="#F2EADA" stroke-width=".7" opacity=".45" fill="none"/>' +
    /* ★含墨的笔头压在墨面上，同色相接就看不见轮廓 —— 沿左缘描一道冷调亮边，
       笔尖才有边。这是"笔在墨上"和"墨糊成一团"的唯一区别 */
    '<path d="M-2.5 -5 C-3 -9 -2.9 -12.4 -2 -15" stroke="#D6DCE4" stroke-width=".9" fill="none" opacity="' +
      (k > 0.2 ? '.6' : '0') + '"/>' +
    /* 笔斗 */
    '<rect x="-3.4" y="-21" width="6.8" height="6" rx="1.4" fill="#8A6E33" stroke="#5E4A22" stroke-width=".7"/>' +
    /* 笔杆 */
    '<rect x="-2.2" y="-52" width="4.4" height="32" rx="2.2" fill="#C9B48A" stroke="#8A6E33" stroke-width=".8"/>' +
    '<path d="M-1.4 -50 V-24" stroke="#EFE4CE" stroke-width="1" opacity=".7"/>' +
    /* 杆顶挂绳 */
    '<path d="M0 -52 q-5 -4 0 -7 q5 3 0 7" fill="none" stroke="#B5503F" stroke-width="1.1"/>' +
  '</g>';
}

function glyphPrep(g){
  if (g.chars) { return g; }
  var N = g.text.length, cols = g.cols || N, rows = g.rows || 1;
  var cw = g.bw / cols, chh = g.bh / rows, pad = g.pad == null ? 4 : g.pad;
  var chars = [], flat = [], i, j, q;
  for (i = 0; i < N; i++){
    var ch = g.text.charAt(i), d = HZ[ch];
    if (!d) { continue; }
    var ox = g.bx + (i % cols) * cw + pad, oy = g.by + Math.floor(i / cols) * chh + pad;
    var boxW = cw - pad * 2, boxH = chh - pad * 2;
    var k = Math.min(boxW, boxH) / 100;
    var cx = ox + (boxW - 100 * k) / 2, cy = oy + (boxH - 100 * k) / 2;
    var sts = [];
    for (j = 0; j < d.m.length; j++){
      var pts = [];
      for (q = 0; q < d.m[j].length; q++){
        pts.push({ x: cx + d.m[j][q][0] * k, y: cy + d.m[j][q][1] * k });
      }
      var cum = [0], tot = 0;
      for (q = 1; q < pts.length; q++){ tot += dist(pts[q - 1], pts[q]); cum.push(tot); }
      /* 采样点：约 3.5px 一个，供覆盖率判定 */
      var samp = [{ x: pts[0].x, y: pts[0].y }];
      for (q = 1; q < pts.length; q++){
        var seg = cum[q] - cum[q - 1], cnt = Math.max(1, Math.round(seg / 3.5));
        for (var u = 1; u <= cnt; u++){
          var t2 = u / cnt;
          samp.push({ x: pts[q - 1].x + (pts[q].x - pts[q - 1].x) * t2,
                      y: pts[q - 1].y + (pts[q].y - pts[q - 1].y) * t2 });
        }
      }
      var so = { ch: ch, ci: i, si: j, gi: flat.length, pts: pts, len: tot, samp: samp,
                 start: pts[0], end: pts[pts.length - 1], d: d.s[j],
                 cx: cx, cy: cy, k: k, done: false };
      sts.push(so); flat.push(so);
    }
    chars.push({ ch: ch, cx: cx, cy: cy, k: k, strokes: sts });
  }
  g.chars = chars; g.flat = flat; g.nStroke = flat.length;
  if (!g.TS) { g.TS = 9000; }
  g.T = g.nStroke * g.TS + 30000;          /* 全局只作兜底，真正的时限是每笔 TS */
  return g;
}

/* 点到某笔画中线的最近距离 */
function distStroke(p, so){
  var best = 1e9, i, a, b, dx, dy, L2, t2, px, py, d2;
  for (i = 1; i < so.pts.length; i++){
    a = so.pts[i - 1]; b = so.pts[i];
    dx = b.x - a.x; dy = b.y - a.y; L2 = dx * dx + dy * dy;
    t2 = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0;
    t2 = t2 < 0 ? 0 : (t2 > 1 ? 1 : t2);
    px = a.x + dx * t2; py = a.y + dy * t2;
    d2 = (p.x - px) * (p.x - px) + (p.y - py) * (p.y - py);
    if (d2 < best) { best = d2; }
  }
  if (so.pts.length === 1) { best = (p.x - so.pts[0].x) * (p.x - so.pts[0].x) + (p.y - so.pts[0].y) * (p.y - so.pts[0].y); }
  return Math.sqrt(best);
}


  var HZ = {
    "湯":{ s:["M 25.1 13.6 Q 27.3 15.8 29.6 18.4 Q 30.9 19.8 32.7 19.9 Q 34.0 19.9 34.6 18.4 Q 35.0 16.9 34.3 13.5 Q 33.9 11.7 30.9 10.3 Q 23.8 7.7 22.4 8.2 Q 21.8 8.6 22.0 10.0 Q 22.3 11.2 25.1 13.6 Z","M 14.7 36.1 Q 18.9 41.5 22.2 43.2 Q 23.8 43.5 24.8 42.2 Q 25.5 40.8 25.3 39.1 Q 24.7 36.5 22.9 35.1 Q 20.3 33.2 16.1 32.1 Q 14.5 31.5 13.4 31.9 Q 12.7 32.0 12.9 33.3 Q 13.0 34.6 14.7 36.1 Z","M 13.9 70.7 Q 12.6 71.1 12.9 72.9 Q 14.8 80.4 18.1 82.2 Q 18.8 82.8 19.8 82.5 Q 20.5 82.4 20.6 79.8 Q 21.0 75.1 28.9 52.6 Q 29.5 50.9 29.4 50.4 Q 29.3 49.4 28.3 50.1 Q 27.7 50.4 17.3 67.1 Q 16.2 69.0 13.9 70.7 Z","M 47.2 8.2 Q 45.3 6.9 43.3 6.4 Q 42.7 6.2 42.3 6.7 Q 41.6 7.1 42.4 8.1 Q 45.5 13.5 45.9 27.3 Q 46.2 33.5 49.4 35.4 Q 50.7 35.7 51.0 33.3 L 50.9 30.2 Q 50.8 28.6 50.4 27.1 Q 50.3 24.8 49.9 21.8 L 49.7 19.6 Q 49.4 15.1 49.4 11.5 Q 49.4 11.4 49.5 11.2 C 49.6 9.9 49.6 9.9 47.2 8.2 Z","M 62.3 31.9 Q 62.4 32.0 62.7 32.4 Q 64.9 35.6 66.7 36.4 Q 67.7 37.1 69.3 34.8 Q 70.8 31.9 73.2 15.6 Q 74.0 12.5 76.2 9.9 Q 77.5 8.5 76.4 7.2 Q 74.7 5.5 70.3 3.1 Q 68.6 2.5 62.1 4.3 Q 61.8 4.3 61.7 4.4 Q 52.6 6.6 47.2 8.2 C 44.2 9.2 46.6 12.3 49.5 11.2 Q 64.2 6.2 66.5 8.0 Q 68.1 9.1 67.9 11.6 Q 65.6 28.9 63.9 30.3 C 62.7 32.4 61.9 31.4 62.3 31.9 Z","M 49.9 21.8 L 61.3 20.2 Q 63.2 19.9 62.5 18.8 Q 61.6 17.5 59.4 17.2 Q 55.6 16.9 49.7 19.6 C 46.9 20.8 46.8 22.2 49.9 21.8 Z","M 51.0 33.3 Q 51.5 33.3 52.1 33.2 Q 55.3 32.5 62.3 31.9 C 65.1 31.7 65.1 31.7 63.9 30.3 Q 63.2 29.6 61.4 28.4 Q 59.8 27.7 50.9 30.2 C 47.9 31.0 47.9 33.5 51.0 33.3 Z","M 48.3 44.8 Q 67.8 39.8 95.5 39.7 Q 97.7 39.7 98.2 38.8 Q 98.6 37.5 97.1 36.2 Q 91.8 32.5 87.9 33.4 Q 72.6 37.2 31.0 43.8 Q 29.1 44.1 30.6 45.7 Q 32.0 47.1 33.9 47.5 Q 35.5 47.8 43.4 45.9 L 48.3 44.8 Z","M 46.6 53.6 Q 48.5 50.8 50.4 48.6 Q 51.5 47.6 50.2 46.1 Q 49.3 45.4 48.3 44.8 C 45.7 43.0 43.5 42.8 43.4 45.9 Q 43.4 54.1 33.9 63.1 Q 33.1 63.1 29.6 67.1 Q 28.9 68.3 30.2 68.0 Q 31.9 67.9 34.1 66.4 Q 40.9 61.9 45.0 55.8 L 46.6 53.6 Z","M 69.0 54.7 Q 74.0 54.0 79.1 53.9 Q 81.0 53.8 81.4 54.8 Q 82.0 56.1 81.2 60.0 Q 79.1 73.5 75.8 80.7 Q 74.2 85.2 72.5 86.5 Q 70.8 88.0 67.7 87.0 Q 64.9 86.6 62.5 85.9 Q 59.9 85.2 61.8 87.6 Q 65.6 92.4 67.7 96.1 Q 68.4 98.1 70.5 97.7 Q 72.2 97.7 74.8 95.4 Q 81.8 89.8 87.2 65.1 Q 88.2 59.7 90.8 56.6 Q 92.8 54.6 92.0 53.4 Q 90.6 51.5 87.2 49.4 Q 84.7 47.7 81.9 48.6 Q 65.3 54.0 46.6 53.6 C 43.4 53.6 42.4 54.1 45.0 55.8 Q 47.5 58.3 50.3 57.6 Q 50.7 57.5 51.1 57.6 L 54.8 56.9 Q 59.9 55.8 65.2 55.1 L 69.0 54.7 Z","M 51.1 57.6 Q 49.8 66.0 32.6 79.3 Q 30.7 80.2 30.5 81.1 Q 30.4 81.6 30.8 81.6 Q 34.9 82.0 45.1 73.1 Q 49.9 69.0 52.9 65.3 Q 54.9 63.0 56.0 61.9 Q 56.8 61.1 56.4 59.8 Q 55.6 57.9 54.8 56.9 C 53.0 54.3 51.8 54.6 51.1 57.6 Z","M 65.2 55.1 Q 65.2 68.5 40.0 90.4 Q 38.4 91.1 38.3 92.3 Q 38.2 92.7 38.8 92.8 Q 41.2 92.8 49.0 86.8 Q 49.1 86.7 49.4 86.5 Q 60.0 77.7 67.5 66.2 Q 70.0 62.5 71.6 60.8 Q 72.3 59.9 71.7 58.5 Q 70.4 55.9 69.0 54.7 C 66.8 52.4 65.4 52.0 65.2 55.1 Z"], m:[[[22.8,9.0],[30.1,13.8],[32.6,17.9]],[[14.2,32.9],[21.0,38.0],[22.7,41.1]],[[19.3,81.5],[18.0,78.6],[17.6,73.3],[28.7,50.7]],[[43.0,7.4],[45.4,9.6],[46.8,12.2],[48.0,26.0],[49.6,34.2]],[[47.9,8.4],[50.4,9.3],[61.0,6.1],[66.0,5.5],[69.6,6.4],[71.8,8.9],[67.2,31.1],[66.4,32.2],[62.9,31.8]],[[50.6,21.1],[51.1,20.1],[56.1,19.1],[59.7,18.8],[61.7,19.3]],[[51.5,32.5],[52.7,31.2],[60.3,30.1],[63.0,30.3]],[[30.9,44.8],[33.9,45.4],[37.6,45.0],[61.3,40.3],[89.8,36.5],[97.1,38.2]],[[49.3,47.5],[46.4,48.5],[42.9,55.3],[39.6,59.8],[36.5,62.9],[30.6,67.1]],[[46.1,55.8],[55.2,55.2],[82.0,51.5],[84.3,52.2],[85.9,54.0],[85.9,56.0],[81.0,76.4],[78.0,84.5],[76.0,88.0],[72.7,91.4],[70.7,92.0],[61.8,86.7]],[[51.9,58.2],[53.4,60.4],[45.8,70.1],[35.2,79.1],[31.2,80.9]],[[65.9,55.6],[67.9,57.7],[68.1,59.5],[62.5,69.5],[57.7,75.7],[51.2,82.5],[44.0,88.9],[39.1,92.2]]] },
    "餅":{ s:["M 20.5 36.8 Q 25.5 30.2 29.8 23.1 L 30.5 21.8 Q 32.8 17.6 35.7 12.4 L 36.8 10.2 L 37.0 10.0 Q 37.9 8.1 38.6 7.3 Q 39.4 6.7 39.1 5.6 Q 39.0 4.6 37.4 3.4 Q 35.7 2.1 33.6 1.7 Q 31.4 1.0 30.2 1.5 Q 29.3 1.8 29.7 3.0 Q 32.2 12.1 18.9 31.7 Q 17.6 33.0 16.5 34.7 Q 12.0 40.4 0.7 51.9 Q 0.0 52.5 1.0 52.7 Q 2.3 52.4 5.0 50.5 Q 9.8 47.6 14.1 43.8 Q 16.2 41.8 18.4 39.3 L 20.5 36.8 Z","M 35.7 12.4 Q 36.5 13.1 38.4 14.6 Q 41.0 16.6 43.9 19.0 Q 45.2 20.0 46.6 19.8 Q 47.6 19.7 47.9 18.5 Q 48.2 17.2 47.3 14.5 Q 46.0 11.6 37.7 10.3 Q 37.1 10.2 36.8 10.2 C 33.6 10.0 33.4 10.3 35.7 12.4 Z","M 29.8 23.1 Q 30.1 24.1 34.5 27.4 Q 36.5 28.7 38.1 28.4 Q 39.5 28.3 39.7 26.2 Q 39.6 24.9 38.1 23.2 Q 35.9 21.0 30.6 21.7 Q 30.5 21.7 30.5 21.8 C 29.3 22.3 29.3 22.3 29.8 23.1 Z","M 36.0 57.6 Q 37.4 59.3 38.8 60.0 Q 39.8 60.7 41.2 58.8 Q 42.6 56.5 45.2 44.4 Q 45.9 41.6 48.0 39.2 Q 49.1 38.1 48.0 36.8 Q 46.7 35.2 42.5 33.0 Q 40.6 32.3 36.0 34.2 Q 34.4 34.2 25.1 38.3 C 22.3 39.6 24.0 42.5 26.8 41.1 Q 37.4 35.8 39.4 37.0 Q 40.6 37.9 40.2 39.7 Q 37.7 53.4 35.8 54.4 C 34.6 55.9 34.6 55.9 36.0 57.6 Z","M 26.4 50.5 Q 30.8 49.2 34.5 48.2 Q 36.7 47.5 35.5 46.4 Q 34.3 45.1 31.8 45.1 Q 29.6 45.2 26.5 46.7 C 23.6 48.0 23.3 51.5 26.4 50.5 Z","M 26.1 60.2 Q 28.6 59.0 36.0 57.6 C 39.2 57.1 38.6 55.8 35.8 54.4 Q 35.7 54.3 35.4 54.2 Q 34.1 53.5 26.1 56.8 C 23.2 57.9 23.3 61.6 26.1 60.2 Z","M 35.5 68.4 Q 32.9 70.0 27.6 73.6 Q 26.9 74.1 26.6 74.0 Q 25.8 73.3 26.1 60.2 L 26.1 56.8 Q 26.1 53.2 26.4 50.5 L 26.5 46.7 Q 26.6 42.5 26.8 41.6 Q 26.8 41.2 26.8 41.1 C 27.0 39.1 27.0 39.1 25.1 38.3 Q 23.8 37.6 20.5 36.8 C 17.5 35.9 16.7 36.7 18.4 39.3 Q 18.5 39.3 18.6 39.5 Q 21.8 43.2 22.1 56.1 Q 22.1 67.4 20.5 72.4 Q 20.1 75.9 16.7 80.2 Q 15.6 81.5 16.4 83.5 Q 17.4 86.4 18.9 87.5 Q 20.1 88.4 21.4 86.9 Q 25.1 81.5 36.5 70.2 C 38.6 68.0 38.1 66.8 35.5 68.4 Z","M 36.5 70.2 Q 38.0 73.0 40.3 74.6 Q 41.6 75.2 42.8 74.2 Q 43.5 73.1 43.8 71.6 Q 43.4 67.5 36.8 63.5 Q 35.4 62.6 34.4 62.8 Q 33.8 62.8 33.6 64.0 Q 33.5 64.9 35.5 68.4 L 36.5 70.2 Z","M 55.4 14.0 Q 58.2 19.6 61.5 21.9 Q 63.1 22.6 64.4 21.2 Q 65.3 20.0 65.4 18.1 Q 65.3 15.3 63.5 13.6 Q 60.1 10.2 55.7 9.4 Q 55.1 9.3 54.8 9.4 Q 54.1 9.4 54.1 10.7 Q 54.1 12.1 55.4 14.0 Z","M 78.2 9.7 Q 77.0 13.8 71.5 24.5 Q 70.8 26.5 72.6 25.6 Q 77.4 21.1 79.9 18.0 Q 85.2 11.4 87.8 9.5 Q 89.8 7.8 88.2 6.2 Q 86.2 4.9 83.1 4.0 Q 80.2 3.0 79.0 3.6 Q 77.6 4.1 78.4 5.5 Q 79.2 7.4 78.2 9.7 Z","M 75.6 33.0 Q 85.1 30.7 85.6 30.3 Q 86.6 29.6 86.0 28.5 Q 85.3 27.3 82.2 26.6 Q 79.4 25.9 69.3 29.3 Q 54.3 31.9 53.4 32.1 Q 49.6 32.8 52.3 34.6 Q 53.5 35.3 55.3 35.7 L 60.9 36.1 Q 62.5 35.5 70.8 34.0 L 75.6 33.0 Z","M 79.2 51.7 Q 85.4 50.9 93.1 50.6 Q 99.1 50.2 99.6 49.5 Q 100.0 48.2 98.3 47.1 Q 92.7 43.2 85.8 45.5 Q 82.7 46.1 79.2 47.1 L 73.6 48.3 Q 71.7 48.4 62.8 50.6 L 57.5 51.6 Q 51.5 52.6 45.1 53.9 Q 43.1 54.2 44.7 55.7 Q 47.6 58.3 53.3 56.7 Q 55.0 56.0 57.2 55.6 L 62.4 54.4 Q 68.4 52.8 73.8 52.4 L 79.2 51.7 Z","M 55.3 35.7 Q 55.4 36.1 56.0 37.1 Q 58.0 40.5 57.5 51.6 L 57.2 55.6 Q 57.2 69.8 47.1 81.7 Q 43.6 83.9 41.7 87.0 Q 41.2 87.4 41.0 87.8 Q 40.9 88.4 42.0 88.4 Q 45.7 88.4 52.2 81.7 Q 60.1 73.1 62.4 54.4 L 62.8 50.6 Q 63.4 41.9 63.9 39.7 Q 64.5 37.7 62.5 36.8 Q 61.8 36.4 60.9 36.1 C 58.0 35.0 54.0 33.2 55.3 35.7 Z","M 73.8 52.4 Q 73.0 95.3 75.1 98.6 Q 75.7 99.4 76.5 99.2 Q 78.3 97.9 78.6 92.2 Q 79.4 84.6 79.2 77.1 Q 78.9 71.4 79.2 51.7 L 79.2 47.1 Q 79.2 44.2 80.3 37.8 Q 80.6 35.9 79.2 35.0 Q 77.2 33.6 75.6 33.0 C 72.8 31.7 69.6 31.0 70.8 34.0 Q 70.8 34.4 71.2 34.8 Q 73.4 40.4 73.6 47.1 Q 73.6 47.5 73.6 48.3 L 73.8 52.4 Z"], m:[[[30.8,2.5],[33.4,5.0],[34.3,6.4],[34.1,7.3],[31.4,14.6],[25.7,25.4],[19.3,34.8],[14.3,40.7],[6.4,48.2],[2.3,51.4],[1.7,51.2],[1.4,52.1]],[[36.6,12.1],[38.5,12.2],[42.0,13.9],[44.6,15.6],[46.5,18.3]],[[30.9,22.8],[35.4,24.7],[37.7,26.6]],[[26.5,38.4],[27.6,39.2],[37.6,35.1],[40.8,35.1],[43.1,36.9],[44.0,38.2],[39.2,55.7],[39.4,58.2]],[[27.0,49.9],[28.3,47.9],[31.5,47.0],[34.8,47.2]],[[26.4,59.6],[28.0,57.6],[34.1,56.0],[35.1,55.2]],[[19.2,38.8],[22.4,40.1],[23.8,44.0],[24.2,64.2],[23.3,72.9],[23.6,77.2],[28.5,75.5],[35.0,70.4],[35.3,69.2]],[[34.9,64.0],[38.9,68.4],[41.2,72.6]],[[55.3,10.5],[61.3,16.6],[62.5,19.8]],[[79.2,4.7],[81.6,6.4],[82.9,8.2],[72.7,24.4]],[[52.6,33.2],[55.0,33.8],[60.4,33.5],[80.0,29.2],[84.9,29.2]],[[44.9,54.8],[52.0,54.9],[68.6,51.0],[88.8,47.8],[92.6,47.7],[98.9,49.0]],[[55.9,36.2],[60.4,39.6],[59.7,57.1],[57.6,67.6],[54.0,75.7],[50.1,81.2],[41.8,87.7]],[[71.7,34.1],[75.2,36.4],[76.5,38.2],[76.0,98.1]]] }
  };

  /* ===== 入口 ===== */
/* ============================================================
   以下四段：食单记注 / 执杯上寿 / 丝结承露囊 / 民俗记注
   （与 tang / proof / touhu 同一套 Canvas + hooks；坐标仍 300×210）
   ============================================================ */

/* ---------------- 执杯上寿：举觞（按住停晃）／献上（托觞落案） ---------------- */
function playShang(cv, hooks) {
  var st = { beat: 0, down: false, held: 0, t0: 0, drag: false, cup: { x: 86, y: 180 }, done: false };
  var DUR = 700;

  function cupSVG() {
    return '<path d="M-9 -8 h18 l-2 11 q-7 4 -14 0 Z" fill="#D8C8A6" stroke="#8A6E33" stroke-width="1.2"/>' +
      '<ellipse cx="0" cy="-8" rx="9" ry="2.6" fill="#F0E6CE" stroke="#8A6E33" stroke-width="1"/>' +
      '<ellipse cx="0" cy="-8" rx="7" ry="1.9" fill="#B9C6BE"/>' +
      '<path d="M-4 3 q4 3 8 0" stroke="#8A6E33" stroke-width="1" fill="none"/>';
  }
  function scene() {
    var s = '<ellipse cx="150" cy="158" rx="86" ry="12" fill="#DFD0AE" opacity=".55"/>';
    if (st.beat === 0) {
      var hr = 34, C = 2 * Math.PI * hr;
      s += '<ellipse cx="150" cy="150" rx="13" ry="3.8" fill="rgba(80,64,32,.16)"/>' +
        '<g id="hring"><circle cx="150" cy="122" r="' + hr + '" fill="none" stroke="#C9B48A" stroke-width="2.4" opacity=".34"/>' +
        '<circle id="harc" cx="150" cy="122" r="' + hr + '" fill="none" stroke="#7FA9A1" stroke-width="3.6" stroke-linecap="round" ' +
        'transform="rotate(-90 150 122)" stroke-dasharray="' + n1(C) + '" stroke-dashoffset="' + n1(C) + '"/></g>' +
        '<g id="cup" transform="translate(150,138)">' + cupSVG() + '</g>' +
        '<path d="M134 145 q16 6 32 0" fill="none" stroke="#C6A385" stroke-width="7" opacity=".9"/>' +
        '<text x="150" y="200" font-size="9" text-anchor="middle" fill="#8A8378">按住觞 · 稳住不晃</text>';
    } else {
      s += '<rect x="196" y="140" width="92" height="16" rx="4" fill="#D8C8A6" stroke="#8A6E33" stroke-width="1.2"/>' +
        '<ellipse cx="238" cy="148" rx="26" ry="11" fill="none" stroke="#8A7B5E" stroke-width="1.5" stroke-dasharray="4 4" opacity=".75"/>' +
        '<g id="cup" transform="translate(' + n1(st.cup.x) + ',' + n1(st.cup.y) + ')">' + cupSVG() + '</g>' +
        '<text x="150" y="200" font-size="9" text-anchor="middle" fill="#8A8378">托觞送上案面</text>';
    }
    return s;
  }
  function paint() { cv.html(scene()); }
  function ring0() { return st.beat === 0 ? st.held / DUR : (st.done ? 1 : 0); }

  function down(p) {
    guardDown(st, st.beat);
    if (st.beat === 0) {
      st.down = true; st.t0 = now(); st.held = 0;
      var c = cv.q('#cup'); if (c) { c.style.animation = 'none'; }
      return;
    }
    if (dist(p, st.cup) < 30) { st.drag = true; }
  }
  function move(p) {
    if (st.beat === 1 && st.drag) { st.cup = { x: p.x, y: p.y }; paint(); }
  }
  function up(p) {
    if (!guardUp(st, st.beat)) { return; }
    if (st.beat === 0) {
      st.down = false;
      var ph = Math.min(1, st.held / DUR);
      var c = cv.q('#cup'); if (c) { c.style.animation = ''; }
      if (ph >= 0.92) { st.done = true; hooks.step(1, '觞已举稳'); hooks.done(false); }
      else { st.held = 0; hooks.tip('再按住一会儿——等外圈走满。'); paint(); }
      return;
    }
    if (!st.drag) { return; }
    st.drag = false;
    if (dist(st.cup, { x: 238, y: 148 }) < 26) { st.done = true; hooks.step(1, '觞已落案'); hooks.done(false); }
    else { hooks.tip('托到案上那个虚圈里。'); }
  }

  var raf = 0;
  function loop() {
    raf = 0;
    if (st.beat === 0 && st.down) {
      st.held = now() - st.t0;
      var ph = Math.min(1, st.held / DUR);
      var arc = cv.q('#harc');
      if (arc) {
        arc.setAttribute('stroke-dashoffset', n1(2 * Math.PI * 34 * (1 - ph)));
        arc.setAttribute('stroke', ph >= 0.99 ? '#6E9A94' : '#7FA9A1');
      }
      hooks.step(ph, '稳住… ' + Math.round(ph * 100) + '%');
    }
    if (st.live) { raf = requestAnimationFrame(loop); }
  }

  return {
    beat: function (i) { st.beat = i; st.down = false; st.drag = false; st.held = 0; st.done = false;
      st.cup = { x: 86, y: 180 }; paint(); hooks.step(0, i === 0 ? '按住觞' : '托觞上前'); },
    down: down, move: move, up: up,
    start: function () { st.live = true; if (!raf) { raf = requestAnimationFrame(loop); } },
    stop: function () { st.live = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    progress: ring0, label: function () { return st.beat === 0 ? '按住 ' + (st.held / 1000).toFixed(1) + ' / 0.7 秒' : '托觞'; }
  };
}

/* ---------------- 丝结承露囊：择丝 / 选囊 / 绕丝 / 放香药 / 结绳 ---------------- */
function playFolk(cv, hooks) {
  var st = { beat: 0, silk: [], taken: [], body: 0, wound: 0, lastAng: 0, acc: 0, down: false,
    hits: 0, drag: false, dish: { x: 62, y: 164 }, spiced: false, knot: 0 };

  /* 十二束六色，两排 */
  var SK = [];
  (function () {
    var pool = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5], i, j, t;
    for (i = pool.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    for (i = 0; i < 12; i++) { SK.push({ x: 56 + (i % 6) * 38, y: (i < 6 ? 42 : 94), c: pool[i], id: i }); }
  })();
  function colsOf() { return st.silk.length ? st.silk.map(function (c) { return SILK_COLS[c]; }) : ['#8FB5B0', '#B08A8A', '#DCD6CA']; }
  function slots(picked) {
    var out = '', q, gi, pc, sx;
    picked = picked || [];
    for (q = 0; q < 3; q++) {
      gi = picked[q]; pc = (gi != null) ? SILK_COLS[gi] : null; sx = 108 + q * 42;
      out += '<circle cx="' + sx + '" cy="162" r="11.5" fill="' + (pc || '#FBF7EE') + '" stroke="' +
        (pc ? shadeHex(pc, .72) : '#C9B48A') + '" stroke-width="1.6"' + (pc ? '' : ' stroke-dasharray="3 3"') + '/>' +
        (pc ? '<path d="M' + (sx - 4.4) + ' 162 l3.2 4.2 l5.6 -8.4" fill="none" stroke="rgba(255,253,246,.92)" stroke-width="1.7" stroke-linecap="round"/>' : '') +
        '<text x="' + sx + '" y="181" font-size="9.5" text-anchor="middle" fill="' + (gi != null ? '#5A5750' : '#B3A98E') + '">' +
        (gi != null ? SILK_NAMES[gi] : '—') + '</text>';
    }
    return out;
  }
  function scene() {
    var s = '', i;
    if (st.beat === 0) {
      s += '<rect x="30" y="36" width="240" height="4.6" rx="2.3" fill="#C9B48A" stroke="#A8926A" stroke-width="1"/>' +
        '<rect x="30" y="88" width="240" height="4.6" rx="2.3" fill="#C9B48A" stroke="#A8926A" stroke-width="1"/>';
      for (i = 0; i < SK.length; i++) {
        s += '<g opacity="' + (st.taken[i] ? '.12' : '1') + '">' + skeinSVG2(SK[i].x, SK[i].y, i, SILK_COLS[SK[i].c], 38) + '</g>';
      }
      s += '<rect x="24" y="140" width="252" height="50" rx="8" fill="#EFE8D8" stroke="#C9B48A" stroke-width="1.4"/>' +
        '<text x="72" y="154" font-size="9" text-anchor="middle" fill="#8A8378">已挑</text>' +
        '<text x="72" y="170" font-size="12" text-anchor="middle" fill="#3F6B58">' + st.silk.length + '/3</text>' +
        slots(st.silk) +
        '<text x="150" y="202" font-size="9" text-anchor="middle" fill="#8A8378">三色各一 · 同色不能拿两束</text>';
      return s;
    }
    if (st.beat === 1) {
      var nm = ['素绢', '锦缎', '缂丝'], PX = [86, 150, 214], q;
      for (q = 0; q < 3; q++) {
        s += '<rect x="' + (PX[q] - 29) + '" y="84" width="58" height="78" rx="10" fill="none" stroke="' + (st.body === q ? '#527E79' : '#D8CFBA') + '" stroke-width="' + (st.body === q ? '2' : '1') + '"/>' +
          '<g transform="translate(' + PX[q] + ',106) scale(.58) translate(-150,-100)">' + bagSVG({ cols: colsOf(), body: q, wound: 3 }) + '</g>' +
          '<text x="' + PX[q] + '" y="178" font-size="10" text-anchor="middle" fill="#5A5750">' + nm[q] + '</text>';
      }
      return s;
    }
    /* 后三拍都在囊上做 */
    s += bagSVG({ cols: colsOf(), body: st.body, wound: (st.beat === 2 ? st.wound : 3), spice: st.spiced, cinch: st.knot >= 1 ? 1 : (st.beat === 4 ? 0.35 : 1), bow: st.knot >= 2 ? 1 : 0 });
    if (st.beat === 2) {
      s += '<circle cx="150" cy="96" r="27" fill="none" stroke="#527E79" stroke-width="1.2" stroke-dasharray="4 4" opacity=".5"/>' +
        '<text x="150" y="200" font-size="9" text-anchor="middle" fill="#8A8378">捏住丝头绕三圈</text>';
    }
    if (st.beat === 3) {
      s += '<g transform="translate(' + n1(st.dish.x) + ',' + n1(st.dish.y) + ')"><ellipse rx="15" ry="5.6" fill="#9FA8A2" stroke="#5E6B64" stroke-width="1.2"/>' +
        '<ellipse cy="-1" rx="11" ry="4" fill="#B39A6A"/><circle cx="-4" cy="-2" r="1.5" fill="#C9A34E"/><circle cx="2" cy="-3" r="1.3" fill="#B39A6A"/></g>' +
        '<circle cx="150" cy="96" r="22" fill="none" stroke="#9A7728" stroke-width="1.5" stroke-dasharray="4 4" opacity=".6"/>' +
        '<text x="150" y="200" font-size="9" text-anchor="middle" fill="#8A8378">把香药倒进囊口</text>';
    }
    if (st.beat === 4) {
      s += '<circle cx="150" cy="86" r="18" fill="none" stroke="#527E79" stroke-width="1.3" stroke-dasharray="4 4" opacity=".55"/>' +
        '<text x="150" y="200" font-size="9" text-anchor="middle" fill="#8A8378">在囊口连点两下：先收口，再打结</text>';
    }
    return s;
  }
  function paint() { cv.html(scene()); }
  function prog() {
    if (st.beat === 0) { return st.silk.length / 3; }
    if (st.beat === 1) { return st.body || st.body === 0 ? 1 : 0; }
    if (st.beat === 2) { return st.wound / 3; }
    if (st.beat === 3) { return st.spiced ? 1 : 0; }
    return st.knot / 2;
  }
  function lab() {
    if (st.beat === 0) { return '已挑 ' + st.silk.length + ' / 3 束'; }
    if (st.beat === 1) { return '已选 ' + ['素绢', '锦缎', '缂丝'][st.body]; }
    if (st.beat === 2) { return '已绕 ' + st.wound + ' / 3 圈'; }
    if (st.beat === 3) { return st.spiced ? '香药已入' : '待放香药'; }
    return '已结 ' + st.knot + ' / 2 下';
  }

  function down(p) {
    guardDown(st, st.beat);
    if (st.beat === 0) {
      var best = -1, bd = 1e9, i, d2;
      for (i = 0; i < SK.length; i++) {
        if (st.taken[i]) { continue; }
        d2 = dist(p, { x: SK[i].x, y: SK[i].y + 20 });
        if (d2 <= 15 && d2 < bd) { bd = d2; best = i; }
      }
      if (best < 0) { return; }
      var c = SK[best].c;
      if (st.silk.indexOf(c) >= 0) { hooks.tip('这一色已经有一束了'); return; }
      st.silk.push(c); st.taken[best] = true;
      paint(); hooks.step(prog(), lab());
      if (st.silk.length >= 3) { hooks.done(false); }
      return;
    }
    if (st.beat === 1) {
      for (var q = 0; q < 3; q++) {
        if (Math.abs(p.x - [86, 150, 214][q]) < 31 && Math.abs(p.y - 112) < 42) {
          st.body = q; st.chosen = true; paint(); hooks.step(1, lab()); hooks.done(false); return;
        }
      }
      return;
    }
    if (st.beat === 2) { st.down = true; st.lastAng = 0; st.acc = 0; return; }
    if (st.beat === 3) { st.drag = dist(p, st.dish) < 24; return; }
    if (st.beat === 4) {
      if (dist(p, { x: 150, y: 86 }) > 20) { return; }
      st.knot = Math.min(2, st.knot + 1);
      paint(); hooks.step(prog(), lab());
      if (st.knot >= 2) { hooks.done(false); }
    }
  }
  function move(p) {
    if (st.beat === 2 && st.down) {
      var a = Math.atan2(p.y - 96, p.x - 150);
      if (st.lastAng) {
        var da = a - st.lastAng;
        while (da > Math.PI) { da -= 2 * Math.PI; }
        while (da < -Math.PI) { da += 2 * Math.PI; }
        if (Math.abs(da) < 1.2) { st.acc += Math.abs(da); }
      }
      st.lastAng = a;
      var w = Math.min(3, Math.floor(st.acc / (Math.PI * 2) * 3));
      if (w !== st.wound) { st.wound = w; paint(); hooks.step(prog(), lab()); }
      return;
    }
    if (st.beat === 3 && st.drag) { st.dish = { x: p.x, y: p.y }; paint(); }
  }
  function up(p) {
    if (!guardUp(st, st.beat)) { return; }
    if (st.beat === 2) {
      st.down = false;
      if (st.wound >= 3) { hooks.done(false); }
      else { hooks.tip('还差一点——捏住丝头绕满三圈。'); }
      return;
    }
    if (st.beat === 3) {
      if (!st.drag) { return; }
      st.drag = false;
      if (dist(st.dish, { x: 150, y: 96 }) < 22) { st.spiced = true; st.dish = { x: 150, y: 96 }; paint(); hooks.step(1, lab()); hooks.done(false); }
      else { hooks.tip('香药要倒进囊口。'); }
    }
  }

  return {
    beat: function (i) {
      st.beat = i; st.down = false; st.drag = false; st.lastAng = 0; st.acc = 0;
      if (i === 0) { st.silk = []; st.taken = []; st.body = 0; st.wound = 0; st.spiced = false; st.knot = 0; }
      if (i === 2) { st.wound = 0; }
      paint(); hooks.step(prog(), lab());
    },
    down: down, move: move, up: up,
    start: function () { }, stop: function () { },
    progress: prog, label: lab
  };
}

/* ---------------- 食单记注：研墨 / 蘸笔 / 临帖 ---------------- */
function playShiFood(cv, hooks) {
  var st = { beat: 0, passes: 0, dir: 0, lastX: 0, drag: false, brush: { x: 232, y: 62 },
    ink: 0, gi: 0, trail: [], cov: {}, done: false, sT0: 0 };

  /* ★字帖几何单点定义（2026-11-01 修「说明文字压字」）
   * 原：by=12 / bh=186 ⇒ 底板 y 4~204，而说明文字基线 y=206、字号 9
   *     ⇒ 文字顶部 197 压进底板 7px，正好盖住「餅」字下半部。
   * 现：整体上移 6px 并压缩 14px（bh 172）⇒ 底板 y −2~184、文字基线 202（顶 193）
   *     ⇒ 净间距 9 个 viewBox 单位（≈14px @ 1.6×），字缩小约 8%，其余不变。
   * 底板 rect 与文字基线都从这里的常量派生，杜绝两处硬编码再次走散。 */
  var GB = { bx: 96, by: 6, bw: 110, bh: 172, pad: 3, plate: 8, plateBot: 14, noteY: 202 };
  function glyph() {
    if (!st.chars) { st.chars = glyphPrep({ text: '湯餅', bx: GB.bx, by: GB.by, bw: GB.bw, bh: GB.bh, cols: 1, rows: 2, pad: GB.pad }); }
    return st.chars;
  }
  function scene() {
    var s = '';
    if (st.beat === 0) {
      s += '<rect x="104" y="86" width="92" height="68" rx="7" fill="#4A4A4E" stroke="#2C2C30" stroke-width="2"/>' +
        '<ellipse cx="150" cy="120" rx="30" ry="24" fill="#8A8A90"/>' +
        '<ellipse cx="150" cy="120" rx="27" ry="21" fill="' + (st.passes >= 4 ? '#33333A' : '#5A5A62') + '"/>' +
        '<circle cx="150" cy="120" r="20" fill="none" stroke="#E8E4D6" stroke-width="1.2" stroke-dasharray="4 4" opacity=".55"/>' +
        '<g id="motiao" transform="translate(' + (150 + (st.passes % 2 ? -22 : 22)) + ',100)">' +
        '<rect x="-6" y="0" width="12" height="34" rx="2" fill="#2E2E34" stroke="#17171B"/><rect x="-6" y="-3" width="12" height="5" rx="1" fill="#5A5A64"/></g>' +
        '<text x="150" y="200" font-size="9" text-anchor="middle" fill="#8A8378">按住墨条，在砚池里左右推</text>';
      return s;
    }
    if (st.beat === 1) {
      s += '<rect x="104" y="86" width="92" height="68" rx="7" fill="#4A4A4E" stroke="#2C2C30" stroke-width="2"/>' +
        '<ellipse cx="150" cy="120" rx="30" ry="24" fill="#8A8A90"/>' +
        '<ellipse cx="150" cy="120" rx="27" ry="21" fill="#2E2E36"/>' +
        '<ellipse cx="150" cy="120" rx="24" ry="18" fill="#191920" opacity=".9"/>' +
        '<ellipse cx="142" cy="112" rx="9" ry="5" fill="#6E6E78" opacity=".38"/>' +
        '<circle cx="150" cy="120" r="21" fill="none" stroke="#D9B36C" stroke-width="1.6" stroke-dasharray="4 4" opacity=".8"/>' +
        '<g id="ripple" opacity="0"><ellipse id="rp1" rx="5" ry="2.2" fill="none" stroke="#C6CDD4" stroke-width="1.3"/>' +
        '<ellipse id="rp2" rx="5" ry="2.2" fill="none" stroke="#C6CDD4" stroke-width="1"/></g>' +
        '<g id="token" transform="translate(' + n1(st.brush.x) + ',' + n1(st.brush.y) + ')">' +
        '<g id="brushwrap">' + brushSVG(st.ink, 1.3) + '</g></g>' +
        '<text x="150" y="200" font-size="9" text-anchor="middle" fill="#8A8378">把笔尖拖进墨池</text>';
      return s;
    }
    var g = glyph(), h = '', ci, c, sj, so;
    h += '<rect x="' + (GB.bx - 9) + '" y="' + (GB.by - GB.plate) + '" width="' + (GB.bw + 18) +
      '" height="' + (GB.bh + GB.plateBot) + '" rx="3" fill="#FBF6EC" stroke="#DED7C9" stroke-width="1.2"/>';
    for (ci = 0; ci < g.chars.length; ci++) {
      c = g.chars[ci];
      h += '<g transform="translate(' + c.cx.toFixed(2) + ',' + c.cy.toFixed(2) + ') scale(' + c.k.toFixed(4) + ')">';
      for (sj = 0; sj < c.strokes.length; sj++) {
        so = c.strokes[sj];
        h += '<path d="' + so.d + '" fill="' + (so.done ? 'rgba(63,74,69,.55)' : 'rgba(181,80,63,.14)') +
          '" stroke="rgba(181,80,63,.40)" stroke-width="0.6" stroke-linejoin="round"/>';
      }
      h += '</g>';
    }
    h += '<g id="hzinkg"><polyline id="hzg" fill="none" stroke="#3F4A45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>';
    h += '<circle id="hzstart" cx="' + (st.chars && st.chars.flat[st.gi] ? st.chars.flat[st.gi].start.x.toFixed(1) : 150) + '" cy="' +
      (st.chars && st.chars.flat[st.gi] ? st.chars.flat[st.gi].start.y.toFixed(1) : 40) + '" r="9" fill="none" stroke="#B5503F" stroke-width="1.6" stroke-dasharray="3 3"/>';
    h += '<text x="150" y="' + GB.noteY + '" font-size="9" text-anchor="middle" fill="#527E79">照红字描「湯餅」· 从红圈起笔</text>';
    return h;
  }
  function paint() { cv.html(scene()); }

  function down(p) {
    guardDown(st, st.beat);
    if (st.beat === 0) { st.drag = true; st.lastX = p.x; return; }
    if (st.beat === 1) { st.drag = dist(p, { x: 150, y: 120 }) < 34 || dist(p, st.brush) < 30; return; }
    var g = glyph();
    if (st.gi >= g.flat.length) { return; }
    var so = g.flat[st.gi];
    if (dist(p, so.start) > 18) { hooks.tip('从红圈起笔。'); st.trail = []; return; }
    sfx('brush');   /* 落笔：短促摩擦声（描红/研墨共用同一音色族） */
    st.trail = [p]; st.sT0 = now();
  }
  function move(p) {
    if (st.beat === 0 && st.drag) {
      var dx = p.x - st.lastX;
      if (Math.abs(dx) > 10) {
        if (st.dir * dx <= 0) { st.passes = Math.min(4, st.passes + 1); st.dir = dx > 0 ? 1 : -1; sfx('brush'); paint(); hooks.step(st.passes / 4, '已推 ' + st.passes + ' / 4 趟'); }
      }
      st.lastX = p.x;
      return;
    }
    if (st.beat === 1 && st.drag) {
      st.brush = { x: p.x, y: p.y };
      var d = dist(p, { x: 150, y: 120 });
      var k = Math.max(0, Math.min(1, (21 * 2.2 - d) / (21 * 1.6)));
      var tk = cv.q('#token'); if (tk) { tk.setAttribute('transform', 'translate(' + n1(p.x) + ',' + n1(p.y) + ')'); }
      if (Math.abs(k - st.ink) > 0.08) { st.ink = k; var bw = cv.q('#brushwrap'); if (bw) { bw.innerHTML = brushSVG(k, 1.3); } }
      var rp = cv.q('#ripple');
      if (rp) {
        var near = d < 21 * 1.75;
        rp.setAttribute('opacity', near ? '1' : '0');
        if (near) { rp.setAttribute('transform', 'translate(' + n1(p.x) + ',' + n1(p.y) + ')'); }
      }
      return;
    }
    if (st.beat === 2 && st.trail.length) {
      st.trail.push(p);
      var pl = cv.q('#hzg');
      if (pl) { pl.setAttribute('points', st.trail.map(function (q) { return q.x.toFixed(1) + ',' + q.y.toFixed(1); }).join(' ')); }
    }
  }
  function up(p) {
    if (!guardUp(st, st.beat)) { return; }
    if (st.beat === 0) {
      st.drag = false;
      if (st.passes >= 4) { hooks.done(false); }
      return;
    }
    if (st.beat === 1) {
      st.drag = false;
      var d = dist(st.brush, { x: 150, y: 120 });
      var k = Math.max(0, Math.min(1, (21 * 2.2 - d) / (21 * 1.6)));
      if (k >= 0.75) { st.ink = 1; paint(); hooks.step(1, '笔已蘸饱'); hooks.done(false); }
      else { hooks.tip('笔头要黑透——再往池心探一点。'); }
      return;
    }
    var g = glyph();
    if (!st.trail.length) { return; }
    var so = g.flat[st.gi], hit = 0, i;
    for (i = 0; i < so.samp.length; i++) {
      for (var j = 0; j < st.trail.length; j++) {
        if (dist(st.trail[j], so.samp[i]) <= 10) { hit++; break; }
      }
    }
    var cov = hit / so.samp.length;
    st.trail = [];
    var pl = cv.q('#hzg'); if (pl) { pl.setAttribute('points', ''); }
    if (cov < 0.55) { hooks.tip('这一笔没描到——照着红线走。'); return; }
    so.done = true; st.gi++;
    paint();
    hooks.step(st.gi / g.flat.length, '已写 ' + st.gi + ' / ' + g.flat.length + ' 笔');
    if (st.gi >= g.flat.length) { hooks.done(false); }
  }

  return {
    beat: function (i) { st.beat = i; st.drag = false; st.trail = []; paint(); hooks.step(0, '第 ' + (i + 1) + ' 拍'); },
    down: down, move: move, up: up,
    start: function () { }, stop: function () { },
    progress: function () { return st.beat === 0 ? st.passes / 4 : (st.beat === 1 ? st.ink : (st.gi / (st.chars ? st.chars.flat.length : 26))); },
    label: function () { return st.beat === 2 ? '已写 ' + st.gi + ' 笔' : ''; }
  };
}

/* ---------------- 民俗记注：观俗（横拖全景）／问俗（找三位摊主）／落笔（按三笔） ---------------- */
var VEND = [
  { x: 153, name: '卖囊妇人', note: '士庶以丝结承露囊，更相遗问。' },
  { x: 450, name: '茶摊老板娘', note: '桥头茶摊卖江陵粗茶，市人聚饮。' },
  { x: 747, name: '南来客商', note: '占城贡香在礼部库，桥市所售非贡余。' }
];
function playShiFolk(cv, hooks) {
  var st = { beat: 0, off: 0, seen: [false, false, false], drag: false, sx: 0, so: 0, asked: [], notes: 0 };
  var VW = 300, SW = 900;

  function stalls() {
    var s = '', i;
    /* 远处的桥：只在最左一段露出来，给"这是桥市"一个交代 */
    s += '<path d="M20 112 Q90 62 160 112" fill="none" stroke="#B9C6BE" stroke-width="7" opacity=".55"/>';
    s += '<path d="M20 112 Q90 68 160 112" fill="none" stroke="#CFDAD4" stroke-width="2" opacity=".7"/>';
    /* 行人：每段两三个，纯剪影 */
    var WALK = [[70, 0], [110, 1], [205, 0], [330, 1], [380, 0], [520, 1], [560, 0], [660, 1], [700, 0]];
    for (i = 0; i < WALK.length; i++) {
      var wx = WALK[i][0], wh = WALK[i][1] ? 16 : 14;
      s += '<g transform="translate(' + wx + ',0)" opacity=".55">' +
        '<circle cx="0" cy="' + (100 - wh) + '" r="3.4" fill="#8A9A92"/>' +
        '<path d="M0 ' + (104 - wh) + ' v' + (wh - 4) + ' M0 ' + (104 - wh) + ' l-4 8 M0 ' + (104 - wh) + ' l4 8" stroke="#8A9A92" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>';
    }
    for (i = 0; i < 3; i++) {
      var v = VEND[i], x = v.x;
      /* 幌子：挂在棚前的布招 */
      s += '<g transform="translate(' + (x + 30) + ',0)"><path d="M0 62 v6" stroke="#8A7B5E" stroke-width="1.4"/>' +
        '<path d="M0 68 h14 l-2 22 h-10 Z" fill="' + (i === 1 ? '#C7B58C' : '#B9C6BE') + '" opacity=".9" stroke="#A8926A" stroke-width="1"/>' +
        '<path d="M3 74 h8 M3 80 h8" stroke="#8A7B5E" stroke-width=".9" opacity=".6"/></g>';
      s += '<ellipse cx="' + (x - 34) + '" cy="104" rx="9" ry="4" fill="#C9A34E" opacity=".35"/>' +
        '<path d="M' + (x - 40) + ' 104 q6 -5 12 0" fill="none" stroke="#A8926A" stroke-width="1.2"/>';
      s += '<g transform="translate(' + x + ',0)">' +
        '<rect x="-40" y="96" width="80" height="10" rx="2" fill="#C9B48A" stroke="#A8926A"/>' +
        '<path d="M-36 96 v-30 h72 v30" fill="#EFE7D5" stroke="#C9B48A" stroke-width="1.2"/>' +
        '<path d="M-40 66 h80 l-6 -8 h-68 Z" fill="' + (i === 1 ? '#C7B58C' : '#B9C6BE') + '" stroke="#A8926A" stroke-width="1"/>' +
        '<circle cx="0" cy="84" r="7" fill="#C6A385" stroke="#8A6E33" stroke-width="1"/>' +
        '<path d="M-9 96 q9 -8 18 0" fill="#8A7B5E" opacity=".85"/>' +
        '<rect x="-24" y="78" width="12" height="8" rx="2" fill="#D8C8A6" stroke="#A8926A"/>' +
        '<rect x="10" y="80" width="14" height="7" rx="2" fill="#D8C8A6" stroke="#A8926A"/>' +
        '</g>';
      if (st.asked.indexOf(i) >= 0) {
        s += '<circle cx="' + x + '" cy="84" r="13" fill="none" stroke="#3F6B58" stroke-width="1.6" opacity=".8"/>';
      }
    }
    return s;
  }
  function scene() {
    var s = '<defs><clipPath id="panoClip"><rect x="0" y="40" width="' + VW + '" height="118"/></clipPath></defs>';
    s += '<g clip-path="url(#panoClip)"><g transform="translate(' + n1(-st.off) + ',0)">';
    s += '<rect x="0" y="40" width="' + SW + '" height="118" fill="#EAF0EC"/>';
    /* 水 */
    s += '<rect x="0" y="126" width="' + SW + '" height="32" fill="#C9D8D2"/>';
    for (var w = 0; w < SW; w += 46) { s += '<path d="M' + w + ' 132 q10 4 20 0 M' + (w + 19) + ' 142 q10 4 20 0" stroke="#B3C6BE" stroke-width="1.2" fill="none"/>'; }
    /* 岸与勾栏 */
    s += '<rect x="0" y="112" width="' + SW + '" height="16" fill="#D8C8A6"/>';
    s += '<path d="M0 112 h' + SW + '" stroke="#A8926A" stroke-width="1.4"/>';
    for (var p = 8; p < SW; p += 26) { s += '<path d="M' + p + ' 112 v-12" stroke="#B9A67C" stroke-width="1.6"/>'; }
    s += '<path d="M0 100 h' + SW + '" stroke="#A8926A" stroke-width="2"/>';
    s += stalls();
    s += '</g></g>';
    s += '<rect x="0" y="40" width="' + VW + '" height="118" fill="none" stroke="#C9B48A" stroke-width="1"/>';
    /* 观察位刻度：只说"还有几段没看"，不指路 */
    for (var k = 0; k < 3; k++) {
      s += '<rect x="' + (12 + k * 18) + '" y="166" width="12" height="5" rx="2.5" fill="' + (st.seen[k] ? '#7FA9A1' : '#DED7C9') + '"/>';
    }
    if (st.beat === 2) {
      s += '<rect x="54" y="150" width="192" height="46" rx="4" fill="#FBF6EA" stroke="#DED7C9" stroke-width="1.2"/>';
      for (var n = 0; n < 3; n++) {
        if (n < st.notes) {
          s += '<text x="64" y="' + (164 + n * 12) + '" font-size="9" fill="#3A3A34">' + VEND[n].note + '</text>';
        } else {
          s += '<path d="M64 ' + (161 + n * 12) + ' h172" stroke="#EFE7D5" stroke-width="1"/>';
        }
      }
    }
    return s;
  }
  function paint() { cv.html(scene()); }
  function seenAll() { return st.seen[0] && st.seen[1] && st.seen[2]; }
  function markSeen() {
    var vc = st.off + VW / 2;
    for (var i = 0; i < 3; i++) {
      if (!st.seen[i] && Math.abs(vc - VEND[i].x) < 60) { st.seen[i] = true; }
    }
  }
  function prog() {
    if (st.beat === 0) { return st.seen.filter(Boolean).length / 3; }
    if (st.beat === 1) { return st.asked.length / 3; }
    return st.notes / 3;
  }
  function lab() {
    if (st.beat === 0) { return '已看 ' + st.seen.filter(Boolean).length + ' / 3 段'; }
    if (st.beat === 1) { return '已问 ' + st.asked.length + ' / 3 位'; }
    return '已落 ' + st.notes + ' / 3 笔';
  }

  function down(p) {
    guardDown(st, st.beat);
    if (st.beat === 0) { st.drag = true; st.sx = p.x; st.so = st.off; return; }
    if (st.beat === 1) {
      /* 先判点没点中摊主；点空不急着报"这里没人"——先让他拖（问俗这一拍要能继续逛） */
      for (var i = 0; i < 3; i++) {
        if (Math.abs(p.x + st.off - VEND[i].x) < 26 && p.y > 60 && p.y < 104) {
          st.moved = 0; st.askHit = true;
          if (st.asked.indexOf(i) < 0) { st.asked.push(i); paint(); hooks.step(prog(), lab()); hooks.tip(VEND[i].name + '：' + VEND[i].note); }
          if (st.asked.length >= 3) { hooks.done(false); }
          return;
        }
      }
      st.askHit = false; st.drag = true; st.sx = p.x; st.so = st.off; st.moved = 0;
      return;
    }
    if (st.notes >= 3 || p.y < 150) { return; }
    st.notes++; paint(); hooks.step(prog(), lab());
    if (st.notes >= 3) { hooks.done(false); }
  }
  function move(p) {
    if (!st.drag) { return; }
    st.moved = (st.moved || 0) + Math.abs(st.sx - p.x);
    st.off = Math.max(0, Math.min(SW - VW, st.so + (st.sx - p.x)));
    if (st.beat === 0) { markSeen(); }
    paint();
    hooks.step(prog(), lab());
    if (st.beat === 0 && seenAll() && !st._ok) { st._ok = true; hooks.done(false); }
  }
  function up() {
    if (!guardUp(st, st.beat)) { return; }
    /* 问俗：几乎没动过就是"点了空处" */
    if (st.beat === 1 && !st.askHit && (st.moved || 0) < 8) { hooks.tip('这里没人。'); }
    st.drag = false; st.moved = 0;
  }

  return {
    beat: function (i) { st.beat = i; st.drag = false; paint(); hooks.step(prog(), lab()); },
    down: down, move: move, up: up,
    start: function () { }, stop: function () { },
    progress: prog, label: lab,
    state: function () { return { beat: st.beat, off: st.off, asked: st.asked.slice(), notes: st.notes }; }
  };
}

  var MAKERS = { tang: playTang, proof: playProof, touhu: playTouhu,
    shifood: playShiFood, shang: playShang, folk: playFolk, shifolk: playShiFolk };

  var TQM = {};
  TQM.has = function (k) { return !!MAKERS[k]; };
  TQM.play = function (kind, stage, cfg, hooks) {
    var mk = MAKERS[kind];
    if (!mk) { return null; }
    var cv = new Canvas(stage);
    var g = mk(cv, hooks);
    TQM.cur = g;                       /* 只读调试口：测试/QA 读当前游戏状态 */
    var startBeat = 0;
    g.beat(startBeat);
    g.start();

    function onDown(e) { e.preventDefault(); var p = cv.map(e); g.down(p); try { stage.setPointerCapture(e.pointerId); } catch (err) { } }
    function onMove(e) { var p = cv.map(e); g.move(p); }
    function onUp(e) { var p = cv.map(e); g.up(p); }

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);

    return {
      next: function (i) { g.beat(i); },
      destroy: function () {
        g.stop();
        stage.removeEventListener('pointerdown', onDown);
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerup', onUp);
        stage.removeEventListener('pointercancel', onUp);
        /* ★不删 SVG：结束时要停在这一拍的成品上（三条面 / 补好的卷 / 壶与比分）。
           删掉就是一个空舞台，玩家以为自己什么都没做。 */
        cv.svg.style.pointerEvents = 'none';
      }
    };
  };

  global.TQM = TQM;
})(window);
