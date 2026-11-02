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

  /* ---------- 场内提示条（各小节共用） ----------
     左一句"现在做什么"，右一句"做到几了"。画在画布里，因为 `.iv-hint` 在舞台下方，
     横屏时离画面两百多像素，第一次玩的人不会低头看。 */
  function hudBar(text, count, tone) {
    var tc = tone === 'warn' ? '#8A5A3A' : (tone === 'ok' ? '#3F6B58' : '#3A3A34');
    return '<g id="hud" pointer-events="none">' +
      '<rect x="14" y="178" width="272" height="24" rx="7" fill="rgba(255,253,246,.92)" stroke="#D8CFBA" stroke-width="1"/>' +
      '<text id="hudt" x="24" y="194" font-size="9.5" fill="' + tc + '">' + text + '</text>' +
      (count ? '<text id="hudc" x="276" y="194" font-size="9.5" text-anchor="end" fill="#3F6B58">' + count + '</text>' : '') +
      '</g>';
  }

  /* ---------- 过渡对话框（所有小游戏收尾共用） ----------
     ★钉在舞台下沿：不再画在画面中间压住成品。宽度/字号都是相对量，
       横屏（舞台更宽）、中屏、竖屏只靠 CSS 适配，不改坐标。
     整条都可点（手机上不必瞄准按钮），点完先 close 再回调，避免重复触发。 */
  function makeSheet(stage) {
    var box = null, fn = null;
    function close() {
      if (box && box.parentNode) { box.parentNode.removeChild(box); }
      box = null; fn = null;
    }
    function fire() {
      if (!fn) { return; }
      var f = fn; close(); f();
    }
    function show(o, cb) {
      close();
      o = o || {};
      box = document.createElement('div');
      box.className = 'mg-sheet';
      var tx = document.createElement('div'); tx.className = 'mg-sheet-tx';
      var t1 = document.createElement('div'); t1.className = 'mg-sheet-t1'; t1.textContent = o.title || '';
      var t2 = document.createElement('div'); t2.className = 'mg-sheet-t2'; t2.textContent = o.body || '';
      tx.appendChild(t1); tx.appendChild(t2);
      var go = document.createElement('button'); go.className = 'mg-sheet-go'; go.type = 'button';
      go.textContent = o.go || '继续';
      box.appendChild(tx); box.appendChild(go);
      box.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      box.addEventListener('pointerup', function (e) { e.stopPropagation(); });
      box.addEventListener('click', function (e) { e.stopPropagation(); fire(); });
      stage.appendChild(box);
      fn = cb || null;
    }
    return { show: show, close: close };
  }

  function playTang(cv, hooks, cfg, ui) {
    var st = {
      beat: 0, tier: 0, pressing: false, prT0: 0, pressN: 0,
      passes: 0, edge: -1, ry: 0,
      pieces: [{ x0: SLAB.x0, x1: SLAB.x1 }], used: [false, false], cutN: 0,
      dragging: false, sx: 0, sy: 0, dev: 0, gi: -1, endReach: false,
      gate: false, sent: false
    };
    var DUR = 700;

    /* ---- 场内提示条 ----
       为什么画进画布里：`.iv-hint` 在舞台下方、字号 11，横屏时离画面两百多像素，
       第一次玩的人根本不会低头看——「擀面不会推」「切面不知道从哪下手」多半是这个原因。
       左边一句"现在做什么"，右边一句"做到几了"，跟着状态换。 */
    function hud(text, count, tone) {
      var tc = tone === 'warn' ? '#8A5A3A' : (tone === 'ok' ? '#3F6B58' : '#3A3A34');
      return '<g id="hud" pointer-events="none">' +
        '<rect x="14" y="178" width="272" height="24" rx="7" fill="rgba(255,253,246,.92)" stroke="#D8CFBA" stroke-width="1"/>' +
        '<text x="24" y="194" font-size="9.5" fill="' + tc + '">' + text + '</text>' +
        (count ? '<text x="276" y="194" font-size="9.5" text-anchor="end" fill="#3F6B58">' + count + '</text>' : '') +
        '</g>';
    }

    /* ---- 擀面：面皮尺寸与行程端点 ---- */
    function sheet() {
      var t = clamp(st.passes / 3, 0, 1);
      return {
        w: ROLL_FROM.w + (ROLL_TO.w - ROLL_FROM.w) * t,
        h: ROLL_FROM.h + (ROLL_TO.h - ROLL_FROM.h) * t
      };
    }
    function reach() { return sheet().h / 2 + 5; }      /* 杖心能到的最远处 */
    function topY() { return ROLL_CY - reach(); }
    function botY() { return ROLL_CY + reach(); }

    /* ---- 擀面杖：杖身 + 两只木柄 + 接触影（影画在面皮之上，压在杖下） ---- */
    function rollerAt(y) {
      return '<g id="roller" transform="translate(150,' + n1(y) + ')">' +
        '<ellipse cy="4.2" rx="86" ry="4.4" fill="#7A5C2E" opacity=".2"/>' +
        '<rect x="-84" y="-7" width="168" height="9" rx="4.5" fill="#C9B48A" stroke="#8A6E33" stroke-width="1.1"/>' +
        '<path d="M-70 -4.4 h140" stroke="#FFFDF6" stroke-width="1.6" opacity=".45"/>' +
        '<rect x="-92" y="-9" width="10" height="13" rx="4" fill="#A8895A" stroke="#8A6E33" stroke-width="1"/>' +
        '<rect x="82" y="-9" width="10" height="13" rx="4" fill="#A8895A" stroke="#8A6E33" stroke-width="1"/>' +
        '</g>';
    }

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
          '<path d="M-3.2 0 h6.4 M0 -3.2 v6.4" stroke="#8A6A4A" stroke-width="1.3" stroke-linecap="round"/></g>' +
          hud('按住面团，等圈走满再松', st.pressN + '/3 下', st.pressN >= 3 ? 'ok' : null);
      }
      if (st.beat === 1) {
        var S = sheet(), w = S.w, h = S.h, tp = topY(), bt = botY();
        var ry = st.ry || tp;
        return '<ellipse cx="150" cy="150" rx="112" ry="17" fill="#DFD0AE" opacity=".7"/>' +
          '<ellipse cx="150" cy="' + ROLL_CY + '" rx="' + n1(w / 2 + 22) + '" ry="16" fill="#8A6A3A" opacity=".10"/>' +
          '<rect id="sheet" x="' + n1(150 - w / 2) + '" y="' + n1(ROLL_CY - h / 2) + '" width="' + n1(w) + '" height="' + n1(h) +
          '" rx="' + n1(h / 2) + '" fill="#F2E8D2" stroke="#C9B48A" stroke-width="1.6"/>' +
          '<path d="M' + n1(150 - w / 2 + 12) + ' ' + n1(ROLL_CY - 2) + ' h' + n1(w - 24) + '" stroke="#E6D6B4" stroke-width="1.2" opacity=".7"/>' +
          /* 行程条：杖能走到哪、现在走到哪，一眼看清（放在面皮右侧，不与杖打架） */
          '<path d="M272 ' + n1(tp) + ' V' + n1(bt) + '" stroke="#D8CFBA" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M267 ' + n1(tp) + ' h10 M267 ' + n1(bt) + ' h10" stroke="#8FB5B0" stroke-width="1.4" opacity=".9"/>' +
          '<circle id="rtrack" cx="272" cy="' + n1(ry) + '" r="3.8" fill="#527E79"/>' +
          rollerAt(ry) +
          hud(st.edge > 0 ? '推回上沿，再推下去' : '按住面皮，从上往下推到底',
              st.passes + '/3 趟', st.passes >= 3 ? 'ok' : null);
      }
      var out = '<ellipse cx="150" cy="150" rx="118" ry="16" fill="#DFD0AE" opacity=".6"/>' + slabHTML(st.pieces);
      if (!st.gate) {   /* 完成卡会把这一行压掉，卡上已经写了"三条面" */
        out += '<text x="268" y="112" font-size="9" text-anchor="end" fill="' + (st.cutN >= 2 ? '#3F6B58' : '#527E79') + '">面 ' + st.pieces.length + ' 条</text>';
      }
      for (var i = 0; i < GUIDES.length; i++) {
        if (st.used[i]) { continue; }                     /* ★按"这一刀切过没有"藏线，不按切了几刀 */
        out += '<path d="M' + GUIDES[i] + ' ' + (SLAB.y0 - 10) + ' v' + (SLAB.y1 - SLAB.y0 + 18) + '" stroke="#8FB5B0" stroke-width="1.2" stroke-dasharray="4 4" opacity=".7"/>' +
          '<path d="M' + (GUIDES[i] - 3) + ' ' + (SLAB.y0 - 10) + ' l6 0 M' + GUIDES[i] + ' ' + (SLAB.y0 - 10) + ' l0 5" stroke="#527E79" stroke-width="1.2" fill="none"/>';
      }
      out += '<g id="knife" opacity="0"><path d="M0 0 l0 -26" stroke="#8A8378" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M-2 -26 h4 l1 8 h-6 Z" fill="#B08A56" stroke="#7E5E32" stroke-width=".9"/></g>';
      /* 收尾时不画提示条：那块位置留给 DOM 的过渡对话框（钉在舞台下沿） */
      if (!st.gate) { out += hud('对着虚线，从上划到底', '还剩 ' + (2 - st.cutN) + ' 刀'); }
      return out;
    }
    function paint() { cv.html(scene()); }

    function progress() {
      if (st.gate) { return 1; }
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
      if (st.gate) { return; }                       /* 收尾态：交给底部的过渡对话框，画布不再接手势 */
      guardDown(st, st.beat);
      if (st.beat === 0) {
        st.pressing = true; st.prT0 = now();
        var hd = cv.q('#hand'); if (hd) { hd.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')'); hd.setAttribute('opacity', '1'); }
        return;
      }
      if (st.beat === 1) {
        st.dragging = true;
        st.ry = clamp(p.y, topY(), botY());
        var rr = cv.q('#roller'); if (rr) { rr.setAttribute('transform', 'translate(150,' + n1(st.ry) + ')'); }
        var rd = cv.q('#rtrack'); if (rd) { rd.setAttribute('cy', n1(st.ry)); }
        return;
      }
      st.dragging = true; st.sx = p.x; st.sy = p.y; st.dev = 0; st.endReach = false;
      /* 落刀时就把刀口锁死：之后不论往哪偏，都按这一条算，不再"就近挑一条没切过的" */
      st.gi = -1;
      var best = 20;
      for (var i = 0; i < GUIDES.length; i++) {
        if (st.used[i]) { continue; }
        var d = Math.abs(p.x - GUIDES[i]);
        if (d < best) { best = d; st.gi = i; }
      }
    }

    function move(p) {
      /* ★拍已换、手势还没抬手：这一串 move 属于上一拍，直接丢掉。
         （实测症状：第三趟擀完立刻换成"切面"，手指还按着，刀就跟着手指亮在提示条上） */
      if (st._downBeat !== st.beat) { return; }
      if (st.beat === 0) { return; }
      if (st.beat === 1) {
        if (!st.dragging) { return; }
        st.ry = clamp(p.y, topY(), botY());
        var rr = cv.q('#roller'); if (rr) { rr.setAttribute('transform', 'translate(150,' + n1(st.ry) + ')'); }
        var rd = cv.q('#rtrack'); if (rd) { rd.setAttribute('cy', n1(st.ry)); }
        /* 一趟 = 从一端真推到另一端（±9 的端点带内），不是"抖两下就算一趟" */
        var tp = topY(), bt = botY(), band = 9;
        var e = (Math.abs(st.ry - bt) <= band) ? 1 : ((Math.abs(st.ry - tp) <= band) ? -1 : 0);
        if (e && e !== st.edge) {
          if (st.edge && e === -st.edge) {
            st.passes = Math.min(3, st.passes + 1);
            st.edge = e;
            paint(); hooks.step(progress(), label());
            if (st.passes >= 3) { hooks.done(false); }
            return;
          }
          st.edge = e;
        }
        return;
      }
      var kn = cv.q('#knife');
      if (kn) { kn.setAttribute('opacity', '1'); kn.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')'); }
      if (st.gi >= 0) { st.dev = Math.max(st.dev, Math.abs(p.x - GUIDES[st.gi])); }
      if (p.y >= SLAB.y1 - 1) { st.endReach = true; }
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
      if (st.beat === 1) { st.dragging = false; return; }   /* 趟数在 move 里判，抬手不再判 */

      st.dragging = false;
      var kn = cv.q('#knife'); if (kn) { kn.setAttribute('opacity', '0'); }
      if (st.gi < 0) { hooks.tip('刀要落在一条竖虚线上——对着虚线往下划。'); return; }
      if (st.sy > SLAB.y0 + 14) { hooks.tip('落刀点要在面片上缘，别从半截起手。'); return; }
      if (!st.endReach) { hooks.tip('一刀要划到面片下缘——中途松手，面就断在半截。'); return; }
      if (st.dev > 16) { hooks.tip('切歪了——刀要直上直下。'); return; }
      var xc = GUIDES[st.gi], P0 = st.pieces, hit = -1, k;
      for (k = 0; k < P0.length; k++) { if (xc > P0[k].x0 + 4 && xc < P0[k].x1 - 4) { hit = k; break; } }
      if (hit < 0) { hooks.tip('这一刀落在缝里了。'); return; }
      P0.splice(hit, 1, { x0: P0[hit].x0, x1: xc }, { x0: xc, x1: P0[hit].x1 });
      st.used[st.gi] = true;
      st.cutN = st.cutN + 1;
      if (st.cutN >= 2) {
        st.gate = true;
        paint(); hooks.step(1, '已切 2 / 2 刀');
        /* 先停一下：成品（三条面）留在画面上方，对话框贴在舞台下沿，玩家点过才交棒 */
        ui.sheet({
          title: (cfg && cfg.steps && cfg.steps[2] && cfg.steps[2].done) || '这一步做完了。',
          body: (cfg && cfg.done) || '下一步。',
          go: '继续'
        }, function () {
          st.gate = false;
          hooks.done(false);
        });
        return;
      }
      paint(); hooks.step(progress(), label());
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
      beat: function (i) {
        st.beat = i; st.dragging = false; st.gi = -1; st.dev = 0; st.endReach = false; st.gate = false;
        st._downBeat = -1;                                  /* 换拍即作废上一手势的"配对码" */
        if (i === 1) { st.edge = -1; st.ry = 0; }
        if (i === 2) { st.used = [false, false]; st.cutN = 0; st.pieces = [{ x0: SLAB.x0, x1: SLAB.x1 }]; }
        paint(); hooks.step(progress(), label());
      },
      down: down, move: move, up: up,
      start: function () { st.live = true; if (!raf) { raf = requestAnimationFrame(loop); } },
      stop: function () { st.live = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
      progress: progress, label: label,
      state: function () {
        return { beat: st.beat, passes: st.passes, ry: Math.round(st.ry), pieces: st.pieces.length,
                 used: st.used.slice(), cutN: st.cutN, gate: st.gate };
      }
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

  function playProof(cv, hooks, cfg, ui) {
    /* ---- 本局三处讹字：第一行 1 处 + 第二行 2 处（两行都得看） ---- */
    var lines = PROOF_BASE.slice(), bad = {}, cells = [];
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
        (bad[c.l] = bad[c.l] || []).push({ i: c.i, note: c.n });
      }
      for (var l = 0; l < 2; l++) {
        for (var i = 0; i < 12; i++) {
          cells.push({ l: l, i: i, ch: lines[l].charAt(i),
            x: P_X0 + (i + 0.5) * P_ADV, y: P_Y0 + l * P_LH,
            bad: (bad[l] || []).some(function (b) { return b.i === i; }), note: null, marked: false });
        }
      }
      /* 每处讹字配一句校记（点对了才出） */
      for (var l2 = 0; l2 < 2; l2++) {
        for (var k = 0; k < (bad[l2] || []).length; k++) {
          var b2 = bad[l2][k];
          for (var m = 0; m < cells.length; m++) {
            if (cells[m].l === l2 && cells[m].i === b2.i) { cells[m].note = b2.note; }
          }
        }
      }
    })();

    /* ---- 版式（★2026-11-02 重排：这一段是"UI 元素重叠"的根因） ----
       旧版：纸 72..190（118 高）＋ 说明文字基线 y=200 ＋ 补纸 52×30 压在正文行上
         ⇒ 说明字贴着舞台下沿被圆角切、补纸横跨正文两行。
       新版：纸 78..174（96 高，只包住两行正文与一块空白纸脚）；
         说明文字一律不进画布（走 .iv-hint 与「原文对照」按钮）；补阙的缺口挪到纸脚空白处。 */
    var PAPER = { x0: 72, y0: 78, x1: 248, y1: 174 };
    var GAP = { x: 150, y: 156 };                 /* 补阙缺口（纸脚空白，不压字） */
    var PATCH_K = .82;                            /* 补纸多边形缩放：±23→±19，够不到第二行 */

    var st = { beat: 0, pulled: 0, hits: 0, wrong: 0, sx: 0, dragging: false,
      patch: { x: 58, y: 186 }, placed: false, src: false };

    /* ---------- 补纸/缺口共用一组顶点（画缺口与画补纸都调它，形状天然一致） ---------- */
    var PATCH_PTS = [[-23, -16], [-11, -14], [-4, -17], [6, -12], [14, -16], [21, -10], [18, -3], [23, 4],
      [16, 8], [20, 15], [8, 13], [2, 17], [-6, 13], [-13, 16], [-19, 10], [-14, 3], [-21, -3], [-15, -9]];
    function polyPath(cx, cy, k) {
      var s = '', i, p;
      for (i = 0; i < PATCH_PTS.length; i++) {
        p = PATCH_PTS[i];
        s += (i ? 'L' : 'M') + n1(cx + p[0] * k) + ' ' + n1(cy + p[1] * k);
      }
      return s + 'Z';
    }

    function paper() {
      var s = '';
      s += '<rect x="' + PAPER.x0 + '" y="' + PAPER.y0 + '" width="' + (PAPER.x1 - PAPER.x0) +
        '" height="' + (PAPER.y1 - PAPER.y0) + '" rx="2" fill="#FBF6EA" stroke="#DED7C9" stroke-width="1.2"/>';
      /* 纸面的两道纤维横线：给"残页"一点纸感，不压字 */
      s += '<path d="M' + (PAPER.x0 + 8) + ' ' + (PAPER.y0 + 44) + ' h' + (PAPER.x1 - PAPER.x0 - 16) +
        '" stroke="#EFE7D5" stroke-width=".8" opacity=".55"/>';
      s += '<path d="M' + (PAPER.x0 + 8) + ' ' + (PAPER.y0 + 45.4) + ' h' + (PAPER.x1 - PAPER.x0 - 16) +
        '" stroke="#EFE7D5" stroke-width=".8" opacity=".35"/>';
      return s;
    }

    function scene() {
      var s = '', i;
      if (st.beat === 0) {
        /* 展卷：纸从左侧抽出，卷轴跟手；拉到底停住 */
        var open = st.pulled;
        s += '<defs><clipPath id="pp"><rect x="72" y="78" width="176" height="96" rx="2"/></clipPath></defs>';
        s += '<g clip-path="url(#pp)"><g transform="translate(' + n1(-132 + 132 * open) + ',0)">' + paper() +
          '<text x="' + P_X0 + '" y="' + P_Y0 + '" font-size="12.6" text-anchor="start" fill="#3A3A34"></text></g></g>';
        s += '<rect x="72" y="78" width="176" height="96" rx="2" fill="none" stroke="#A8926A" stroke-width="1.6"/>';
        /* 卷轴：随拉动水平移，到底停在纸的右沿 */
        s += '<g transform="translate(' + n1(54 + 176 * open) + ',0)">' +
          '<rect x="-6" y="70" width="12" height="112" rx="5" fill="#C9B48A" stroke="#8A6E33" stroke-width="1.2"/>' +
          '<rect x="-9" y="66" width="18" height="9" rx="4" fill="#A8895A"/>' +
          '<rect x="-9" y="176" width="18" height="9" rx="4" fill="#A8895A"/></g>';
        s += '<path d="M66 188 h' + n1(168 * open) + '" stroke="#DED7C9" stroke-width="2"/>';
        return s;
      }

      s += paper();
      /* 残页题签：右上角一小行，不占正文 */
      if (st.beat === 1) {
        s += '<text x="242" y="' + (PAPER.y0 + 11) + '" font-size="7.6" text-anchor="end" fill="#B3A98E" opacity=".9">残页 · 卷一百二十一</text>';
      }

      if (st.beat === 1) {
        /* 核字：每个字都画，讹字与正字外观完全一致 —— 位置是读出来的，不是画出来的 */
        for (i = 0; i < cells.length; i++) {
          var c = cells[i];
          s += '<circle cx="' + n1(c.x) + '" cy="' + n1(c.y - 4) + '" r="7" fill="transparent"/>';
          s += '<text x="' + n1(c.x) + '" y="' + n1(c.y + 4.4) + '" font-size="12.6" text-anchor="middle" fill="#3A3A34">' + c.ch + '</text>';
        }
        /* 朱圈：点对了实线朱红，点错了灰虚线圈（都不遮字：圈径 9.4/11 由字框决定） */
        for (i = 0; i < cells.length; i++) {
          if (!cells[i].marked) { continue; }
          s += '<ellipse cx="' + n1(cells[i].x) + '" cy="' + n1(cells[i].y) + '" rx="7.2" ry="8.8" fill="none" stroke="' +
            (cells[i].bad ? '#B5503F' : '#9A9788') + '" stroke-width="' + (cells[i].bad ? '1.8' : '1.4') +
            '"' + (cells[i].bad ? '' : ' stroke-dasharray="3 3"') + '/>';
        }
        return s;
      }

      /* 补阙这一拍：正文照旧在（★2026-11-02 修：上一版漏画了，补阙变成"一张白纸"） */
      for (i = 0; i < cells.length; i++) {
        s += '<text x="' + n1(cells[i].x) + '" y="' + n1(cells[i].y + 4.4) + '" font-size="12.6" text-anchor="middle" fill="#3A3A34">' + cells[i].ch + '</text>';
      }
      s += '<text x="242" y="' + (PAPER.y0 + 11) + '" font-size="7.6" text-anchor="end" fill="#B3A98E" opacity=".9">残页 · 卷一百二十一</text>';
      /* 补阙：缺口是纸脚上的一块破口（不在字上），补纸用同一组顶点 */
      s += '<path d="' + polyPath(GAP.x, GAP.y, PATCH_K) + '" fill="#EFE7D5" stroke="#CBBE9C" stroke-width="1" opacity=".9"/>';
      s += '<path d="' + polyPath(GAP.x, GAP.y, PATCH_K * .62) + '" fill="#F7F1E2" opacity=".65"/>';
      s += '<g id="patch" transform="translate(' + n1(st.patch.x) + ',' + n1(st.patch.y) + ')">' +
        '<path d="' + polyPath(0, 0, PATCH_K) + '" fill="#F3EBD8" stroke="#B9A67C" stroke-width="1.3"/>' +
        '<path d="M-14 -5 q7 -3 13 1 M-13 4 q8 -2 15 1" fill="none" stroke="#CBBE9C" stroke-width=".9" opacity=".9"/>' +
        '</g>';
      return s;
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

    /* ---------- 「原文对照」抽屉（DOM 浮层，挂在 .iv-stage 里） ----------
       ★只给正字、不并排残页：逐字比对就是"核字"这一拍的玩法，把残页也排上来
         等于替玩家把比对做完了。行内 12 列均分，行断与原页一致，才对得上字位。 */
    var btn = null, panel = null;
    function srcRows() {
      var h = '', l, i, ch, maxLen = 12;
      for (l = 0; l < PROOF_BASE.length; l++) {
        h += '<div class="iv-src-row">';
        for (i = 0; i < maxLen; i++) {
          ch = PROOF_BASE[l].charAt(i) || '';
          h += '<span>' + (ch || '　') + '</span>';
        }
        h += '</div>';
      }
      return h;
    }
    function ensureSrc() {
      if (btn) { return; }
      btn = document.createElement('button');
      btn.className = 'iv-src-btn'; btn.type = 'button'; btn.textContent = '原文对照';
      /* ★关键定位写内联：这个抽屉的"整幅覆盖"是功能性的（同屏会替玩家比完），
         css/app.css 一旦被别的会话整体写回丢掉 .iv-src-btn，只剩一个裸按钮会把舞台挤乱。 */
      btn.style.cssText = 'position:absolute;right:8px;bottom:8px;z-index:6;' +
        'font:inherit;font-size:10px;line-height:1;padding:5px 9px;border-radius:11px;' +
        'background:rgba(255,253,246,.94);border:1px solid #E6DFCE;color:#6B6560;letter-spacing:.02em';
      btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      btn.addEventListener('pointerup', function (e) { e.stopPropagation(); });
      btn.addEventListener('click', function (e) { e.stopPropagation(); toggleSrc(); });
      cv.stage.appendChild(btn);

      panel = document.createElement('div');
      panel.className = 'iv-src';
      panel.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:6;' +
        'background:#F7F5EE;border-radius:11px;padding:14px 16px;display:flex;flex-direction:column;' +
        'opacity:0;pointer-events:none;transition:opacity .16s ease;overflow:auto';
      panel.innerHTML =
        '<div class="iv-src-h"><b>原文对照</b><em>《旧五代史》卷一百二十一</em>' +
          '<button class="iv-src-x" type="button">收起</button></div>' +
        '<div class="iv-src-sub">只有正字——残页上错了哪三个字，得你自己逐字比</div>' +
        '<div class="iv-src-tbl">' + srcRows() + '</div>' +
        '<div class="iv-src-f">对不上字的地方，就是誊录抄错的那一处 ·（宋）薛居正等撰</div>';
      panel.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      panel.addEventListener('pointerup', function (e) { e.stopPropagation(); });
      panel.querySelector('.iv-src-x').addEventListener('click', function (e) { e.stopPropagation(); toggleSrc(false); });
      cv.stage.appendChild(panel);
    }
    function toggleSrc(on) {
      if (!panel) { return; }
      st.src = (on == null) ? !st.src : !!on;
      panel.classList.toggle('on', st.src);
      panel.style.opacity = st.src ? '1' : '0';                 /* 内联与类双写，防 CSS 被冲掉 */
      panel.style.pointerEvents = st.src ? 'auto' : 'none';
      if (btn) { btn.textContent = st.src ? '收起对照' : '原文对照'; }
    }
    function killSrc() {
      if (btn && btn.parentNode) { btn.parentNode.removeChild(btn); }
      if (panel && panel.parentNode) { panel.parentNode.removeChild(panel); }
      btn = null; panel = null; st.src = false;
    }

    function down(p) {
      guardDown(st, st.beat);
      if (st.beat === 0) { st.dragging = true; st.sx = p.x; return; }
      if (st.beat === 2) { st.dragging = true; return; }
      /* 核字：点选。纵向必须落在同一行（±15），横向取最近的字（字距 13，各 6.5 容错） */
      if (st._done) { return; }
      var hit = null, i2, dd, bd = 1e9;
      for (i2 = 0; i2 < cells.length; i2++) {
        if (Math.abs(p.y - cells[i2].y) > 15) { continue; }
        dd = Math.abs(p.x - cells[i2].x);
        if (dd < bd) { bd = dd; hit = cells[i2]; }
      }
      if (!hit || hit.marked) { return; }
      hit.marked = true;
      if (hit.bad) {
        st.hits++;
        hooks.tip('错字：「' + PROOF_BASE[hit.l].charAt(hit.i) + '」误作「' + hit.ch + '」');
        sfx('select');
      } else {
        st.wrong++;
        hooks.tip('无讹——这一字本传如此。');
        sfx('tap');
      }
      paint(); hooks.step(progress(), label());
      if (st.hits >= 3 && !st._done) {
        st._done = true;
        /* 停 420ms 再交棒：让最后一道朱圈先被看见（这一拍不插过渡条，末尾才插） */
        setTimeout(function () { if (cv.svg.isConnected) { hooks.done(false); } }, 420);
      }
    }
    function move(p) {
      if (st.beat === 0 && st.dragging) {
        st.pulled = clamp((p.x - 70) / (250 - 70), 0, 1);
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
        if (dist(st.patch, GAP) < 24) {
          st.placed = true; st.patch = { x: GAP.x, y: GAP.y };
          paint(); hooks.step(1, label());
          if (ui && ui.sheet) {
            ui.sheet({ title: '阙已补', body: (cfg && cfg.done) || '校毕。', go: '收卷' }, function () {
              hooks.done(false);
            });
          } else { hooks.done(false); }
        } else if (st.patch.y < 140) {
          hooks.tip('离缺口还差一点——对上那道破口。');
        }
      }
    }

    return {
      beat: function (i) {
        st.beat = i; st.dragging = false;
        if (i === 1) { ensureSrc(); } else { toggleSrc(false); }
        if (i === 2) { killSrc(); }
        paint(); hooks.step(progress(), label());
      },
      down: down, move: move, up: up,
      start: function () { }, stop: function () { killSrc(); },
      progress: progress, label: label,
      /* 只读调试口（QA/探针）：bad 是本局讹字位置，玩家路径读不到 */
      state: function () {
        var bd = [];
        for (var i = 0; i < cells.length; i++) { if (cells[i].bad) { bd.push(cells[i].l + ':' + cells[i].i); } }
        return { beat: st.beat, pulled: Math.round(st.pulled * 100), hits: st.hits, wrong: st.wrong,
                 placed: st.placed, src: st.src, bad: bd };
      }
    };
  }

  /* ============================================================
     投壶对投（终幕 · 玉津园）—— 按演示页「投壶对投与动画」还原
     ------------------------------------------------------------
     两件事按演示页做到位：
     ① 他人的每一矢都有**过程**：执矢 → 后引 → 脱手 → 沿真实弹道飞 → 落定。
        顺序照剧情（群臣四人各二矢 → 礼官两矢 → 官家压轴两矢）；每一矢独立掷定，
        打偏时看得见它怎么歪出去；中／不中各有当场结果，不是事后一句总结。
     ② 玩家瞄准＝演示页那套「虚线就是这一矢真实的去向」：拖多远力道多大、
        拖多陡弧多高；虚线末端那个小圈套进壶口环里才算进——所见即所得，不用猜。
     降低难度的三处（都在演示页口径内，不改判定）：
       · 舞台任意处按下即起手，不必精确按在矢上（原来要按住那支小矢）；
       · 拖动时实时给「力/抛」读数与判定理由（力轻·力重·弧太平·弧太高），松手前就知道；
       · 拖不够 24 单位只提示、不算一次投（不扣次数，也不误记成失手）。
     ★一致性铁律：预览与飞行共用同一份点集（pathOf），否则"看到≠飞到"，判定就不讲理。
     ★台词、人名单、结果句全部从 cfg.story（data.js 的 D.touhu）取，不在本文件手抄。
     ============================================================ */
  function playTouhu(cv, hooks, cfg, ui) {
    var S = cfg.story || {};
    var POT = { x: 232, my: 106, rx: 13, ry: 6, half: 20, base: 167 };
    var HAND = { x: 88, y: 172 };          /* 玩家执矢的手（近处） */
    var FLOOR = 184;                       /* 未进时顺着切线落到这条地坪线 */
    /* 判定窗口：与演示页 THROW 逐字同源（46–78 力 / 0.58–0.93 上抛），
       只把长度单位从屏幕 px 换成画布单位（画布 300 宽）。 */
    var TH = { powMin: 46, powMax: 78, upMin: .58, upMax: .93, full: 150, min: 24 };
    TH.powMid = (TH.powMin + TH.powMax) / 2; TH.powHalf = (TH.powMax - TH.powMin) / 2;
    TH.upMid = (TH.upMin + TH.upMax) / 2; TH.upHalf = (TH.upMax - TH.upMin) / 2;

    var st = {
      beat: 0, stepMax: Math.max(1, (cfg.steps || []).length || 2),
      ph: 'idle', dead: false, armed: false,
      me: 0, rong: 0, pre: 0,
      ai: null, fig: null, arrows: [],
      potFx: 0, potT: 0, slowT: 0, dim: 0,
      fly: null, flash: null, aim: null,
      cap: { sp: '', tx: '' }, tag: '',
      drag: false, sx: 0, sy: 0, dx: 0, dy: 0,
      skip: null
    };

    /* ---------- 定时器 / 动画循环（单一 rAF，避免三套循环各自 paint） ---------- */
    var raf = 0, tms = [], gen = 0;
    /* ★定时器必须自带"这一节还在不在台上"的检查：
       整局投壶是**定时驱动**的（台词—投矢—落定—结算），玩家中途退台后，
       残留的定时器会把 hooks.done 打进下一段剧情 —— 等于替玩家把剧情点过去了。 */
    function after(ms, fn) {
      var g = gen;
      tms.push(setTimeout(function () {
        if (g !== gen || st.dead) { return; }
        if (!cv.svg.isConnected) { st.dead = true; clearTimers(); return; }
        fn();
      }, ms));
    }
    function clearTimers() { for (var i = 0; i < tms.length; i++) { clearTimeout(tms[i]); } tms.length = 0; gen += 1; }
    /* ★排帧 + 兜底：rAF 在某些环境（无头/后台/省电模式）会被吞掉一帧，
       一旦吞掉，回调就再也不来了 —— 动画会永久卡在中间。这里同时挂一根 140ms 的
       保险丝：帧没到点就手动推一帧。掉帧时退化成 ~7fps，画面仍然走完；
       正常环境里保险丝永远抢不到（帧在 16ms 就把它清了）。 */
    var gt = 0;
    function schedule() {
      raf = requestAnimationFrame(tick);
      if (gt) { clearTimeout(gt); }
      gt = setTimeout(function () {
        gt = 0;
        if (!raf) { return; }
        cancelAnimationFrame(raf); raf = 0;
        tick();
      }, 140);
    }
    function anim() { if (!raf && !gt && !st.dead) { schedule(); } }
    var FR = 0;                       /* 帧计数（只给探针看 rAF 有没有在跑） */
    function tick() {
      raf = 0; FR += 1;
      if (gt) { clearTimeout(gt); gt = 0; }
      var t = now(), live = false, cb = null;
      if (st.fly) {
        var k = clamp((t - st.fly.t0) / st.fly.dur, 0, 1);
        var want = st.fly.total * k, seg = st.fly.seg, i = 1;
        while (i < seg.length - 1 && seg[i] < want) { i += 1; }
        var s0 = seg[i - 1], s1 = seg[i];
        var u = (s1 - s0) > .001 ? (want - s0) / (s1 - s0) : 0;
        var p0 = st.fly.pts[i - 1], p1 = st.fly.pts[i];
        st.fly.pos = { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u,
                       a: Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI + 90 };
        if (k >= 1) { cb = st.fly.cb; st.fly = null; } else { live = true; }
      }
      if (st.potFx && t - st.potT > 320) { st.potFx = 0; } else if (st.potFx) { live = true; }
      if (st.slowT && t - st.slowT > 640) { st.slowT = 0; } else if (st.slowT) { live = true; }
      if (st.flash && t - st.flash.t0 > 760) { st.flash = null; } else if (st.flash) { live = true; }
      if (!cv.svg.isConnected) { st.dead = true; }       /* 小节被退台：停手，别去画不在树上的节点 */
      paint();
      if (cb) { cb(); }
      if ((live || st.fly) && !st.dead) { schedule(); }
    }

    function paint() { if (st.dead) { return; } cv.html(render()); }
    function esc(t) {
      return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function poly(pts) {
      var s = '', i;
      for (i = 0; i < pts.length; i++) { s += (i ? ' ' : '') + n1(pts[i].x) + ',' + n1(pts[i].y); }
      return s;
    }

    /* ---------- 服色：与 js/portraits.js 的 FIG 同源，不另抄一套 ---------- */
    var FIGKEY = { '王朴': 'wangpu', '张永德': 'zhangyongde', '赵匡胤': 'zhaokuangyin',
                   '殷崇义': 'yinchongyi', '官家': 'guorong' };
    function toneOf(who) {
      var F = global.TP && global.TP.FIG, f = F && F[FIGKEY[who] || ''];
      return f ? { robe: f.robe, collar: f.collar || '#EFE7D6' }
               : { robe: '#4B4E6B', collar: '#EFE7D6' };
    }

    /* ============================================================
       场景（300×210）：远墙与树冠 → 地坪 → 壶 → 掷者 → 手 → 预判层
       ============================================================ */
    function bg() {
      var s = '';
      s += '<rect x="0" y="0" width="300" height="128" fill="#EEF2EA"/>';
      s += '<g fill="#CBD8C4">' +
             '<ellipse cx="26" cy="98" rx="36" ry="28"/><ellipse cx="92" cy="107" rx="34" ry="21"/>' +
             '<ellipse cx="158" cy="105" rx="25" ry="16"/><ellipse cx="284" cy="96" rx="42" ry="30"/>' +
           '</g>';
      s += '<rect x="0" y="104" width="300" height="24" fill="#E2DDCB"/>';
      s += '<path d="M0 104 h300" stroke="#CBC4AE" stroke-width="1.2"/>';
      s += '<path d="M0 128 h300" stroke="#C9C3AC" stroke-width="1"/>';
      /* 幌子：园中设壶的记号（青底金线；不用朱色——帝袍绛红的红线在这儿没有道理） */
      s += '<path d="M86 104 v-32" stroke="#8A7B5E" stroke-width="1.4"/>' +
           '<path d="M86 72 h16 v22 h-16 Z" fill="#8FB5B0" opacity=".42" stroke="#527E79" stroke-width=".8"/>' +
           '<path d="M88 91 l3 4 3-4 3 4 3-4" fill="none" stroke="#527E79" stroke-width=".8" opacity=".7"/>';
      s += '<rect x="0" y="128" width="300" height="82" fill="#E4E3D2"/>';
      s += '<rect x="0" y="166" width="300" height="44" fill="#DCDBC7" opacity=".75"/>';
      /* 投壶线：虚线，告诉你站在哪儿 */
      s += '<path d="M8 ' + FLOOR + ' h284" stroke="#B9B49C" stroke-width="1" stroke-dasharray="5 5" opacity=".6"/>';
      return s;
    }

    /* 壶：颈细腹鼓双耳。受击时以**壶底**为支点压一下（不是整块平移，不然像贴纸在抖） */
    function potGroup() {
      var sx = 1, sy = 1, k;
      if (st.potFx) {
        k = clamp((now() - st.potT) / 320, 0, 1);
        if (k < .18) { sx = 1 + .06 * (k / .18); sy = 1 - .11 * (k / .18); }
        else if (k < .52) { sx = 1.06 - .16 * ((k - .18) / .34); sy = .89 + .17 * ((k - .18) / .34); }
        else { sx = .90 + .10 * ((k - .52) / .48); sy = 1.06 - .06 * ((k - .52) / .48); }
      }
      var s = '<g transform="translate(' + POT.x + ',' + POT.base + ') scale(' + n1(sx) + ',' + n1(sy) +
              ') translate(' + (-POT.x) + ',' + (-POT.base) + ')">';
      /* 投壶不是杯子：口小、颈细、腹鼓、底收 —— 这是"壶"，也是壶口判定环（rx13）比壶口略大的原因 */
      s += '<ellipse cx="232" cy="168" rx="19" ry="4" fill="#7C8A6E" opacity=".2"/>';
      s += '<path d="M221 110 H243 V120 C250 126 252 134 252 142 C252 150 249 157 244 161 L246 166 H218 L220 161 ' +
           'C215 157 212 150 212 142 C212 134 214 126 221 120 Z" fill="#A8B4AC" stroke="#5E6B64" stroke-width="1.5" stroke-linejoin="round"/>';
      /* 双耳（贯耳）：贴颈的两个小环 */
      s += '<path d="M220 121 q-8 1 -8 8 q0 7 8 7 M244 121 q8 1 8 8 q0 7 -8 7" fill="none" stroke="#5E6B64" stroke-width="2" stroke-linecap="round"/>';
      s += '<ellipse cx="232" cy="110" rx="11.4" ry="4" fill="#DDE4DE" stroke="#5E6B64" stroke-width="1.4"/>';
      s += '<ellipse cx="232" cy="110" rx="7.2" ry="2.4" fill="#3E4A44"/>';
      /* 颈上一道弦纹、腹上一道暗影：给曲面一点体积 */
      s += '<path d="M223 124 h18" stroke="#8A968E" stroke-width=".9" opacity=".55"/>';
      s += '<path d="M216 143 c4 8 28 8 32 0" fill="none" stroke="#8A968E" stroke-width=".9" opacity=".35"/>';
      s += '</g>';
      return s;
    }

    /* 掷者：半身侧影（幞头圆顶 + 左后软脚 / 交领 / 圆领袍），袍色取该角色 FIG.robe */
    function figure() {
      var f = st.fig;
      if (!f) { return ''; }
      var k = f.k, t = f.tone;
      var g = '<g transform="translate(' + n1(f.x) + ',178) scale(' + k + ')" opacity="' + n1(f.op) + '">';
      g += '<ellipse cx="0" cy="0" rx="17" ry="4.2" fill="#7C8A6E" opacity=".18"/>';
      g += '<path d="M-15 0 C-16 -30 -14 -58 -11 -74 L11 -74 C14 -58 16 -30 15 0 Z" fill="' + t.robe +
           '" stroke="' + shadeHex(t.robe, .62) + '" stroke-width="1.1"/>';
      g += '<path d="M-11 -73 L0 -62 L11 -73" fill="none" stroke="' + t.collar + '" stroke-width="2.6"/>';
      g += '<rect x="-3" y="-81" width="6" height="9" rx="2" fill="#C6A385"/>';
      g += '<ellipse cx="0" cy="-89" rx="7.4" ry="8.2" fill="#C6A385" stroke="#A8856A" stroke-width=".7"/>';
      g += '<path d="M-8.4 -91 a8.4 8.4 0 0 1 16.8 0 l0 2.8 h-16.8 Z" fill="#2A2622"/>';
      g += '<path d="M-8.4 -90 q-7 3 -11 11" fill="none" stroke="#2A2622" stroke-width="2.6" stroke-linecap="round"/>';
      g += '<g transform="rotate(' + n1(f.a) + ' 6 -72)">' +
             '<path d="M6 -72 q13 5 16 13" fill="none" stroke="' + t.robe + '" stroke-width="8.2" stroke-linecap="round"/>' +
             '<ellipse cx="24" cy="-58" rx="4.2" ry="3.6" fill="#C6A385"/>' +
             (f.sent ? '' :
               '<path d="M24 -58 L41 -77" stroke="#C9B48A" stroke-width="1.8" stroke-linecap="round"/>' +
               '<path d="M41 -77 l-1.6 5.2 5 -2 Z" fill="#8FA79E"/>' +
               '<path d="M26 -60 l-3.4 1 1 4 Z" fill="#B5503F"/>') +
           '</g>';
      g += '</g>';
      return g;
    }
    /* 脱手瞬间手的真实位置（手臂绕肩旋转后的坐标）——飞行起点必须与画面对得上 */
    function figHand() {
      var f = st.fig;
      if (!f) { return HAND; }
      var a = f.a * Math.PI / 180, px = 6, py = -72, x = 24, y = -58;
      var rx = px + (x - px) * Math.cos(a) - (y - py) * Math.sin(a);
      var ry = py + (x - px) * Math.sin(a) + (y - py) * Math.cos(a);
      return { x: f.x + rx * f.k, y: 178 + ry * f.k };
    }

    /* 玩家执矢的手：从右下伸进来，矢头朝壶 */
    function handSVG() {
      if (st.ph !== 'aim' || !st.armed) { return ''; }
      return '<g transform="translate(' + HAND.x + ',' + HAND.y + ')">' +
        /* 袖：一截布管从画面下沿斜插进来（第一视角的"我的手"），内衬露一道青缘 */
        '<path d="M-1 2 C-7 10 -14 18 -22 24" fill="none" stroke="#EFE8D8" stroke-width="13" stroke-linecap="round"/>' +
        '<path d="M-1 2 C-7 10 -14 18 -22 24" fill="none" stroke="#D6CBB2" stroke-width="13" stroke-linecap="round" opacity=".35"/>' +
        '<path d="M-5 5 C-9 10 -13 14 -17 17" fill="none" stroke="#527E79" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
        /* 握拳：斜握，不是一颗圆纽扣 */
        '<ellipse cx="0" cy="0" rx="5" ry="4.4" transform="rotate(-24)" fill="#C6A385" stroke="#A8856A" stroke-width=".8"/>' +
        '<path d="M-2.6 -3.4 q3.4 -1.4 5.6 1.2" fill="none" stroke="#A8856A" stroke-width=".7" opacity=".65"/>' +
        '<path d="M1.6 2.6 q2.6 -1.4 4.4 -3.6" fill="none" stroke="#A8856A" stroke-width=".8" opacity=".8"/>' +
        '<path d="M0 0 L5 -30" stroke="#C9B48A" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M5 -34.5 l2.8 6 -2.8 2.6 -2.8 -2.6 Z" fill="#8FA79E" stroke="#5E6B64" stroke-width=".5"/>' +
        '<path d="M1 2 l-4.2 -1.4 .8 -4.6 Z" fill="#B5503F"/>' +
        '</g>';
    }

    /* 矢：秆、镞、羽三段分色 —— 镞若与秆同色，飞起来就成"红屁股木棍"，看着像倒着飞 */
    function arrowSVG(p, ink, op) {
      return '<g transform="translate(' + n1(p.x) + ',' + n1(p.y) + ') rotate(' + n1(p.a) + ')" opacity="' +
        (op == null ? 1 : op) + '">' +
        '<path d="M0 7 L0 -10" stroke="' + ink + '" stroke-width="1.9" stroke-linecap="round"/>' +
        '<path d="M0 -15.5 l3.3 6.2 -3.3 2.9 -3.3 -2.9 Z" fill="#8FA79E" stroke="#5E6B64" stroke-width=".6"/>' +
        '<path d="M-3 3 l3 5.4 3 -5.4" fill="none" stroke="#B5503F" stroke-width="1.5" stroke-linejoin="round"/>' +
        '</g>';
    }

    /* ============================================================
       弹道：从 (力, 抛) 正向算出真实弧线 —— 预览与飞行共用
       ============================================================ */
    function aimOf(dx, dy) {
      var d = Math.sqrt(dx * dx + dy * dy);
      return { d: d, pow: Math.min(100, d / TH.full * 100), up: d > 2 ? clamp(-dy / d, -1, 1) : 0 };
    }
    function judge(pow, up) {
      if (pow < TH.powMin) { return { hit: false, why: '轻' }; }
      if (pow > TH.powMax) { return { hit: false, why: '重' }; }
      if (up < TH.upMin) { return { hit: false, why: '平' }; }
      if (up > TH.upMax) { return { hit: false, why: '高' }; }
      return { hit: true, why: null };
    }
    function whyText(w) {
      return w === '轻' ? '力不够 · 拖远些' : w === '重' ? '手重了 · 收一点'
        : w === '平' ? '弧太平 · 往上带' : w === '高' ? '弧太高 · 压一点' : '';
    }
    /* ★归一化量 ePow/eUp 把 (力, 抛) 映射到壶口口径内的偏移：
       幂等 —— "落点在口径环内"与 judge() 判进是同一个条件，所以虚线不会骗人。 */
    function traj(pow, up, from) {
      var ep = (pow - TH.powMid) / TH.powHalf;
      var eu = (up - TH.upMid) / TH.upHalf;
      var cx = POT.x + clamp(ep, -1.95, 1.95) * POT.rx;   /* 力过 → 越过壶（更右）；力轻 → 落在手这侧 */
      var cy = POT.my - clamp(eu, -1.95, 1.95) * POT.ry;  /* 抛太陡 → 过壶口上方；太平 → 撞壶身 */
      var lift = 15 + Math.max(0, up) * 66;
      from = from || HAND;
      var pts = [], N = 26, i, s;
      for (i = 0; i <= N; i++) {
        s = i / N;
        pts.push({ x: from.x + (cx - from.x) * s, y: from.y + (cy - from.y) * s - lift * 4 * s * (1 - s) });
      }
      return { pts: pts, cross: { x: cx, y: cy }, lift: lift,
               hit: Math.abs(ep) <= 1 && Math.abs(eu) <= 1,
               onBody: Math.abs(cx - POT.x) <= POT.half && cy > POT.my };
    }
    /* 未进时顺切线落到地上：让玩家看见"落在哪"，而不是矢凭空消失 */
    function extendToGround(t) {
      var pts = t.pts, n = pts.length, last = pts[n - 1], prev = pts[n - 2];
      var vx = (last.x - prev.x) / 3, vy = (last.y - prev.y) / 3;
      var x = last.x, y = last.y, out = [], i;
      for (i = 0; i < 60; i++) {
        vy += .42; x += vx; y += vy;
        if (x < 8 || x > 292) { out.push({ x: clamp(x, 8, 292), y: y }); break; }
        out.push({ x: x, y: y });
        if (y >= FLOOR) { break; }
      }
      return pts.concat(out);
    }
    function pathOf(a, from) {
      var t = traj(a.pow, a.up, from);
      return { pts: (t.hit || t.onBody) ? t.pts : extendToGround(t), t: t };
    }
    function fly(pts, dur, ink, cb) {
      var seg = [0], total = 0, i;
      for (i = 1; i < pts.length; i++) {
        total += Math.sqrt(Math.pow(pts[i].x - pts[i - 1].x, 2) + Math.pow(pts[i].y - pts[i - 1].y, 2));
        seg.push(total);
      }
      st.fly = { pts: pts, seg: seg, total: total, t0: now(), dur: dur, ink: ink, cb: cb, pos: null };
      anim();
    }

    /* ============================================================
       落定 / 判定浮字 / 慢镜
       ============================================================ */
    function flash(txt, tone) { st.flash = { txt: txt, tone: tone, t0: now() }; anim(); }
    function land(a, f, mine) {
      if (a.hit) {
        st.potFx = 1; st.potT = now(); st.slowT = now();
        flash('中', 'in'); sfx('select');
      } else {
        if (f.t.onBody) {
          st.potFx = 1; st.potT = now();
          st.arrows.push({ x: POT.x - 27, y: POT.base - 2, a: -34 });
          flash('撞壶', 'out');
        } else {
          var last = f.pts[f.pts.length - 1];
          st.arrows.push({ x: clamp(last.x, 14, 286), y: Math.min(last.y, FLOOR + 3), a: 54 });
          flash('偏', 'out');
        }
        sfx('tap');
      }
      if (mine) { if (a.hit) { st.me += 1; } } else if (st.ai) { st.ai.hits.push(!!a.hit); st.ai.resolved += 1; }
      if (st.arrows.length > 5) { st.arrows.shift(); }
      anim();
    }

    /* ============================================================
       他人投壶：执矢 → 后引 → 脱手 → 飞 → 落定（两矢一停）
       ============================================================ */
    /* 每一矢独立掷定（概率照演示页：群臣 0.75 / 0.55，官家 0.5）。
       掷定后反算成 (力, 抛) 交给同一套弹道 ⇒ 画面上的偏差就是随机性的证据。 */
    function rollAI(pHit) {
      if (Math.random() < pHit) {
        return { pow: TH.powMin + Math.random() * (TH.powMax - TH.powMin),
                 up: TH.upMin + Math.random() * (TH.upMax - TH.upMin), hit: true };
      }
      var k = Math.floor(Math.random() * 4), pow, up;
      if (k === 0) { pow = 20 + Math.random() * 22; up = .62 + Math.random() * .18; }        /* 轻 */
      else if (k === 1) { pow = 82 + Math.random() * 18; up = .62 + Math.random() * .18; }   /* 重 */
      else if (k === 2) { pow = 50 + Math.random() * 22; up = .24 + Math.random() * .30; }   /* 平 */
      else { pow = 50 + Math.random() * 22; up = .96 + Math.random() * .16; }                /* 高 */
      return { pow: pow, up: up, hit: false };
    }
    function aiRound(who, isRong, pArr, cb) {
      st.ph = 'ai'; st.armed = false; st.aim = null; st.drag = false;
      /* 舞台下方那一行说明此刻不归你投，以及怎么快进（四轮连播约 11 秒，不说就是罚站） */
      hooks.tip('看' + who + '投 · 轻点画面可快进这一轮');
      st.fig = { who: who, tone: toneOf(who), a: -6, op: 0,
                 k: isRong ? .92 : .86, x: isRong ? 32 : 36, sent: false };
      st.ai = { who: who, isRong: isRong, list: [], ix: 0, hits: [], resolved: 0 };
      for (var i = 0; i < 2; i++) { st.ai.list.push(rollAI(pArr[i] || .5)); }

      /* 轻点快进：剩下的矢直接落定（结果开轮时就掷定了，快进不改结果） */
      st.skip = function () {
        var ai = st.ai, j;
        clearTimers(); st.fly = null; st.skip = null;
        for (j = ai.resolved; j < ai.list.length; j++) { ai.hits.push(!!ai.list[j].hit); }
        ai.resolved = ai.list.length;
        st.fig = null; paint();
        if (cb) { cb(ai.hits.slice()); }
      };

      paint();
      after(150, function () {
        st.fig.op = 1; paint();
        after(200, function () { shoot(0); });
      });

      function shoot(i) {
        if (st.dead) { return; }
        if (i >= st.ai.list.length) { finish(); return; }
        var a = st.ai.list[i];
        st.ai.ix = i;
        st.tag = who + (isRong ? ' · 压轴' : '') + ' · 第' + (i ? '二' : '一') + '矢';
        st.fig.a = -42; st.fig.sent = false;
        paint();
        after(170, function () {
          st.fig.a = 14; st.fig.sent = true;
          var f = pathOf(a, figHand());
          paint(); sfx('brush');
          fly(f.pts, 400, a.hit ? '#C9A34E' : '#B08A56', function () {
            land(a, f, false);
            after(240, function () {
              if (st.dead) { return; }
              st.fig.a = -6;
              shoot(i + 1);
            });
          });
        });
      }
      function finish() {
        st.skip = null;
        st.fig = null;
        paint();
        if (cb) { cb(st.ai.hits.slice()); }
      }
    }

    /* ============================================================
       台词条（画在画布下沿，与演示页的 .dlg 同位；不挡交互面）
       ============================================================ */
    function cap(sp, tx) { st.cap = { sp: sp || '', tx: tx || '' }; }
    function wrapText(tx, per) {
      var out = [], i;
      tx = String(tx || '');
      for (i = 0; i < tx.length && out.length < 2; i += per) { out.push(tx.slice(i, i + per)); }
      if (out.length === 2 && tx.length > per * 2) { out[1] = out[1].slice(0, per - 1) + '…'; }
      return out;
    }
    function capSVG() {
      var c = st.cap;
      if (!c.tx) { return ''; }
      var head = c.sp ? c.sp + '｜' : '';
      var L = wrapText(head + c.tx, 32);
      /* 一条压在画面下沿的浅色台词条：地面花纹/袖口都不会钻到字里 */
      var s = '<rect x="0" y="186" width="300" height="24" fill="rgba(255,253,246,.9)"/>' +
              '<path d="M0 186 h300" stroke="#DED7C9" stroke-width="1"/>';
      s += '<text x="12" y="197" font-size="8.4" fill="#4A4640">';
      if (c.sp) {
        s += '<tspan fill="#8A5A3A" font-weight="700">' + esc(c.sp) + '</tspan><tspan fill="#B3A98E">｜</tspan>' +
             esc(L[0].length > head.length ? L[0].slice(head.length) : '');
      } else {
        s += esc(L[0]);
      }
      s += '</text>';
      if (L[1]) { s += '<text x="12" y="206" font-size="8.4" fill="#4A4640">' + esc(L[1]) + '</text>'; }
      return s;
    }
    function chrome() {
      var s = '';
      /* 比分：钉在上沿正中（左上 zone-tag、右上 step-tag 都占着，只有中间是空的） */
      s += '<g><rect x="100" y="5" width="96" height="17" rx="8" fill="rgba(255,253,246,.92)" stroke="#DED7C9" stroke-width="1"/>' +
           '<text x="148" y="17" font-size="8.6" text-anchor="middle" fill="#6B6560">礼官 ' +
           '<tspan fill="#3F6B58" font-weight="700">' + st.me + '</tspan> : ' +
           '<tspan fill="#8A5A3A" font-weight="700">' + st.rong + '</tspan> 官家</text></g>';
      if (st.tag) { s += '<text x="10" y="36" font-size="8.6" fill="#4A4640">' + esc(st.tag) + '</text>'; }
      return s + capSVG();
    }
    function flashSVG() {
      if (!st.flash) { return ''; }
      var k = clamp((now() - st.flash.t0) / 760, 0, 1);
      var op = k < .14 ? k / .14 : (k > .7 ? (1 - k) / .3 : 1);
      if (op <= 0) { return ''; }
      return '<text x="' + POT.x + '" y="' + n1(80 - 6 * k) + '" font-size="15" font-weight="700" ' +
        'text-anchor="middle" fill="' + (st.flash.tone === 'in' ? '#3F6B58' : '#8C8478') + '" ' +
        'opacity="' + n1(op) + '" letter-spacing="2">' + esc(st.flash.txt) + '</text>';
    }
    function slowSVG() {
      if (!st.slowT) { return ''; }
      var k = clamp((now() - st.slowT) / 640, 0, 1);
      return '<circle cx="' + POT.x + '" cy="' + POT.my + '" r="' + n1(16 + 32 * k) + '" fill="none" ' +
        'stroke="#C9A34E" stroke-width="' + n1(3 * (1 - k)) + '" opacity="' + n1(.5 * (1 - k)) + '"/>';
    }

    /* ---------- 预判层：口径环 + 真实虚线 + 末端圈 + 理由 ---------- */
    function aimSVG() {
      if (st.ph !== 'aim' || !st.armed) { return ''; }
      var s = '';
      /* 壶口口径环：只在瞄准时出现，是"套进去"的对齐基准。
         先垫一道白（压在壶身上也读得出），再画青虚线。 */
      s += '<ellipse cx="' + POT.x + '" cy="' + POT.my + '" rx="' + POT.rx + '" ry="' + POT.ry +
           '" fill="none" stroke="#FFFDF6" stroke-width="2.6" opacity=".55"/>' +
           '<ellipse cx="' + POT.x + '" cy="' + POT.my + '" rx="' + POT.rx + '" ry="' + POT.ry +
           '" fill="none" stroke="#527E79" stroke-width="1.3" stroke-dasharray="3 3" opacity=".8"/>';
      var A = st.aim;
      if (!A) {
        /* 未起手：一条很淡的示范弧（中档力度+中档上抛），告诉你该拖出多长、多陡 */
        var g = traj(TH.powMid, TH.upMid, HAND);
        s += '<polyline points="' + poly(g.pts) + '" fill="none" stroke="#8C9A8E" stroke-width="1.2" ' +
             'stroke-dasharray="2 6" stroke-linecap="round" opacity=".45"/>';
        s += '<text x="292" y="50" font-size="8.2" text-anchor="end" fill="#8A8378" opacity=".9">按住画面 · 向右上拖</text>';
        return s;
      }
      var f = pathOf(A, HAND), i, apex = f.pts[0], tc = f.t.cross;
      for (i = 1; i < f.pts.length; i++) { if (f.pts[i].y < apex.y) { apex = f.pts[i]; } }
      var col = A.hit ? '#3F6B58' : '#6B6560';
      /* ★手指遮挡（2026-11-02 手机实测）：起手在左下，拖拽时拇指正好压住抛物线的前段。
       *   这里在真弧上方 26 单位再画一条**同形副本**（细、淡、带引线），
       *   手指压住下半截时仍能看清整条弧的走向；两线同源，不会误导。 */
      var lift = [], k2;
      for (k2 = 0; k2 < f.pts.length; k2++) { lift.push({ x: f.pts[k2].x, y: f.pts[k2].y - 26 }); }
      s += '<polyline points="' + poly(lift) + '" fill="none" stroke="' + col + '" stroke-width="1" ' +
           'stroke-dasharray="3 5" stroke-linecap="round" opacity=".42"/>';
      s += '<polyline points="' + poly(f.pts) + '" fill="none" stroke="' + col + '" stroke-width="1.6" ' +
           'stroke-dasharray="6 5" stroke-linecap="round" opacity=".9"/>';
      s += '<circle cx="' + n1(apex.x) + '" cy="' + n1(apex.y) + '" r="1.6" fill="' + col + '" opacity=".45"/>';
      /* 末端圈：小圈套进环里＝进；进了就填实，不用玩家自己去比 */
      s += '<circle cx="' + n1(tc.x) + '" cy="' + n1(tc.y) + '" r="2.8" fill="' +
           (A.hit ? col : 'none') + '" stroke="' + col + '" stroke-width="1.4" opacity=".95"/>';
      if (A.hit) {
        s += '<text x="292" y="50" font-size="8.6" text-anchor="end" fill="#3F6B58" font-weight="700">正对壶口 · 松手</text>';
      } else {
        s += '<text x="292" y="50" font-size="8.6" text-anchor="end" fill="#8A5A3A">' + esc(whyText(A.why)) + '</text>';
      }
      return s;
    }

    function render() {
      var s = bg(), i;
      for (i = 0; i < st.arrows.length; i++) {
        s += arrowSVG({ x: st.arrows[i].x, y: st.arrows[i].y, a: st.arrows[i].a }, '#B9A67C', .8);
      }
      if (st.dim) { s += '<rect x="0" y="0" width="300" height="210" fill="#2A2A28" opacity="' + n1(.16 * st.dim) + '"/>'; }
      s += figure();
      s += potGroup();
      if (st.fly && st.fly.pos) { s += arrowSVG(st.fly.pos, st.fly.ink, 1); }
      s += handSVG();
      s += aimSVG();
      s += chrome();
      s += flashSVG();
      s += slowSVG();
      return s;
    }

    /* ============================================================
       剧情序列：司正报场 → 群臣四人各二矢 → 礼官两矢 → 官家压轴 → 结算
       ============================================================ */
    function label() { return '第 ' + (st.beat + 1) + ' / ' + st.stepMax + ' 矢 · 礼官 ' + st.me + ' : ' + st.rong + ' 官家'; }

    function prelude() {
      if (st.ph !== 'idle') { return; }
      st.ph = 'ai';
      st.tag = '群臣轮番 · 礼官亦预';
      /* 2026-11-02 修：data 里 intro 是对象 {speaker, text}（D.touhu.intro），
       * 原来直接当字符串塞进 cap ⇒ 画面上出现「[object Object]」，看起来就是
       * 「司正的开场白没了」。这里按对象取字段，字符串兼容旧写法。 */
      var it0 = S.intro;
      var itSp = (it0 && typeof it0 === 'object') ? (it0.speaker || '司正') : '司正';
      var itTx = (it0 && typeof it0 === 'object') ? (it0.text || '') : (it0 || '酒过三巡，园中设壶。');
      cap(itSp, itTx);
      paint();
      /* 1100→2400：这句 40 字，1.1 秒读不完就切下一句，观感等于「没出现」 */
      after(2400, function () { nextMinister(S.ministers || []); });
    }
    function nextMinister(M) {
      if (st.dead) { return; }
      if (st.pre >= M.length) { toPlayer(); return; }
      var m = M[st.pre];
      cap(m.speaker, m.line);
      paint();
      after(320, function () {
        aiRound(m.speaker, false, [.75, .55], function (hits) {
          var n = (hits[0] ? 1 : 0) + (hits[1] ? 1 : 0);
          var R = S.minResult || {};
          st.pre += 1;
          st.tag = m.speaker + ' · ' + n + ' / 2';
          cap(m.speaker, R[n] || '');
          paint();
          after(1000, function () { nextMinister(M); });
        });
      });
    }
    function toPlayer() {
      st.ph = 'aim'; st.armed = true; st.beat = 0;
      var f = st.fig;
      if (f) { f.op = 0; after(160, function () { if (st.fig === f) { st.fig = null; paint(); } }); }
      st.tag = '礼官 · 第一矢';
      cap('司正', S.toPlayer || '礼官请矢——两矢，中者为胜。');
      paint();
      hooks.step(0, label());
    }

    /* 未进的理由句：照演示页那四句（是判手感的反馈，不是剧情台词，故不进 data.js） */
    var WHY_LINE = { '轻': '力不够，矢在半途就垂了头。', '重': '手重了——矢越过壶口，落在壶那一侧。',
                     '平': '太平，矢撞在壶身上，弹开了。', '高': '高了半寸，越过壶口。' };
    function fire(pow, up, jd) {
      var f = pathOf({ pow: pow, up: up }, HAND);
      st.ph = 'fly'; st.armed = false; st.aim = null;
      st.tag = '礼官 · 第' + (st.beat ? '二' : '一') + '矢';
      paint(); sfx('brush');
      fly(f.pts, 430, '#C9B48E', function () {
        land({ hit: jd.hit, why: jd.why }, f, true);
        st.tag = '礼官 · ' + (jd.hit ? '中' : '偏');
        cap('', jd.hit ? (st.me >= 2 ? '两矢皆入。满园静了一瞬。' : '一矢入壶，四座轻呼。')
                       : (WHY_LINE[jd.why] || '矢落壶外。'));
        paint();
        after(1150, function () {
          if (st.beat >= st.stepMax - 1) { finale(); } else { hooks.done(!jd.hit); }
        });
      });
    }

    function finale() {
      st.ph = 'end'; st.dim = 1;
      st.tag = '官家 · 压轴';
      cap('官家', S.rongIntro || '轮到压轴——官家亲自下场。');
      paint();
      hooks.step(.55, '礼官 ' + st.me + ' 矢 · 官家未投');
      after(1150, function () {
        aiRound('官家', true, [.5, .5], function (hits) {
          st.rong = (hits[0] ? 1 : 0) + (hits[1] ? 1 : 0);
          var RT = S.rongThrow || { hit: ['', ''], miss: ['', ''] };
          st.tag = '官家 · ' + st.rong + ' / 2';
          cap('官家', RT[hits[0] ? 'hit' : 'miss'][0] + ' ' + RT[hits[1] ? 'hit' : 'miss'][1]);
          paint();
          after(1400, verdict);
        });
      });
    }
    function verdict() {
      st.dim = 0;
      var v = st.me > st.rong ? (S.verdictWin || '')
            : (st.me === st.rong ? (S.verdictDraw || '') : (S.verdictLose || ''));
      st.tag = '本局已毕';
      cap('园中', v);
      paint();
      hooks.step(1, '礼官 ' + st.me + ' : ' + st.rong + ' 官家 · 本局已毕');
      after(1000, function () {
        st.dead = true;
        ui.sheet({
          title: '本局已毕',
          body: '礼官 ' + st.me + ' : ' + st.rong + ' 官家 · ' +
                (st.me >= 2 ? '两矢皆中，上品金矢' : (st.me === 1 ? '一矢入壶' : '两矢未入，礼在壶外')),
          go: '收矢入园'
        }, function () { hooks.done(st.me === 0); });
      });
    }

    /* ============================================================
       输入
       ============================================================ */
    function down(p) {
      if (st.dead) { return; }
      if (st.ph === 'ai' || st.ph === 'end') {
        /* 看人投的时候，轻点画面＝快进这一轮（结果早已掷定，快进不改胜负） */
        if (st.skip) { var sk = st.skip; sk(); }
        return;
      }
      if (st.ph !== 'aim' || !st.armed) { return; }
      st.drag = true; st.sx = p.x; st.sy = p.y; st.dx = 0; st.dy = 0;
      guardDown(st, st.beat);
    }
    function move(p) {
      if (!st.drag || st.ph !== 'aim' || !st.armed) { return; }
      st.dx = p.x - st.sx; st.dy = p.y - st.sy;
      var a = aimOf(st.dx, st.dy);
      if (a.d < TH.min) { st.aim = null; paint(); return; }
      var jd = judge(a.pow, a.up);
      st.aim = { pow: a.pow, up: a.up, hit: jd.hit, why: jd.why };
      paint();
      /* 读数与理由给到舞台下方那一行：松手前就知道差在哪，不必靠猜 */
      hooks.step(.06, '力 ' + Math.round(a.pow) + ' · 抛 ' + a.up.toFixed(2) + ' · ' +
        (jd.hit ? '正对壶口' : whyText(jd.why)));
    }
    function up() {
      if (!st.drag || st.ph !== 'aim' || !st.armed) { return; }
      st.drag = false;
      if (!guardUp(st, st.beat)) { return; }
      var a = aimOf(st.dx, st.dy);
      if (a.d < TH.min) {
        st.aim = null; paint();
        hooks.tip('矢没脱手——按住拖远一点再松手。');
        return;
      }
      fire(a.pow, a.up, judge(a.pow, a.up));
    }

    return {
      beat: function (i) {
        st.beat = i;
        if (st.dead || st.ph === 'idle' || st.ph === 'ai') { return; }   /* 开场：群臣还在投，step 归位不算起手 */
        st.ph = 'aim'; st.armed = true; st.drag = false; st.dx = 0; st.dy = 0; st.aim = null;
        st.tag = '礼官 · 第' + (i ? '二' : '一') + '矢';
        cap('', i ? '还有一矢。壶口在那儿，矢在你手里。' : '按住画面，向右上拖——虚线就是这一矢的去向。');
        paint(); hooks.step(0, label());
      },
      down: down, move: move, up: up,
      start: function () { prelude(); },
      stop: function () { st.dead = true; clearTimers(); if (raf) { cancelAnimationFrame(raf); raf = 0; } },
      progress: function () { return st.ph === 'aim' ? .05 : (st.ph === 'fly' ? .6 : 1); },
      label: label,
      /* 只读调试口（QA / 探针）：不参与玩法 */
      state: function () {
        return { ph: st.ph, beat: st.beat, me: st.me, rong: st.rong, pre: st.pre,
                 armed: st.armed, cap: st.cap.sp + '|' + st.cap.tx, tag: st.tag,
                 ai: st.ai ? { who: st.ai.who, ix: st.ai.ix, n: st.ai.list.length,
                               hits: st.ai.hits.slice() } : null,
                 fig: st.fig ? st.fig.who : null, arrows: st.arrows.length,
                 fly: st.fly ? { x: Math.round(st.fly.pos ? st.fly.pos.x : -1),
                                 y: Math.round(st.fly.pos ? st.fly.pos.y : -1) } : null,
                 fr: FR, raf: raf,
                 aim: st.aim ? { pow: Math.round(st.aim.pow), up: Math.round(st.aim.up * 100) / 100,
                                 hit: st.aim.hit, why: st.aim.why } : null };
      }
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
  } else if (body === 1){ /* 锦缎：团花一朵 + 四角散点
       ★原来那两道云头一上一下（`q5.5 -8 11 -3`），缩到 58px 的格子里就成了一张苦脸 —— 换团花 */
    s += '<g stroke="' + tone[1] + '" fill="none" opacity=".7">' +
           '<circle cx="150" cy="133" r="3.2" stroke-width="1.3"/>' +
           '<path d="M150 124.6 q6.2 8.4 0 16.8 q-6.2 -8.4 0 -16.8" stroke-width="1.5"/>' +
           '<path d="M141.6 133 q8.4 -6.2 16.8 0 q-8.4 6.2 -16.8 0" stroke-width="1.5"/>' +
         '</g>' +
         '<g fill="' + tone[1] + '" opacity=".45">' +
           '<circle cx="137.5" cy="122.5" r="1.15"/><circle cx="162.5" cy="122.5" r="1.15"/>' +
           '<circle cx="137.5" cy="144" r="1.15"/><circle cx="162.5" cy="144" r="1.15"/>' +
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

  /* 绕丝：三道丝缠在颈部，一圈一色。
     ★原来三道挤在 y=100..107、半宽只有 8.6~13，全压在束口带上 —— 竖屏下读起来只是"带子厚了点"，
       玩家看不出丝绕上去了。现在：位置摊到颈→肩（101.4 / 105.8 / 110.4），半宽跟着袋身轮廓走
       （9 / 11.4 / 14.2），每道加暗底（浅色丝压米色袋才有边）、高光、两端"绕过去"的小转折。 */
  var WY = [101.4, 105.8, 110.4], WHW = [9, 11.4, 14.2];
  for (k = 0; k < Math.min(wound, 3); k++){
    var yy = WY[k], hw = WHW[k], ck = cols[k % cols.length];
    s += '<path d="M' + f(m - hw) + ' ' + f(yy) + ' q' + f(hw) + ' 4.2 ' + f(hw * 2) + ' 0" fill="none" stroke="' +
         dk + '" stroke-width="4.6" opacity=".2"/>';
    s += '<path d="M' + f(m - hw) + ' ' + f(yy) + ' q' + f(hw) + ' 4 ' + f(hw * 2) + ' 0" fill="none" stroke="' + ck +
         '" stroke-width="3.2" stroke-linecap="round"/>';
    s += '<path d="M' + f(m - hw + 1.2) + ' ' + f(yy - 0.6) + ' q' + f(hw - 1.2) + ' 3.4 ' + f(hw * 2 - 2.4) + ' 0" fill="none" stroke="#FFFDF6" stroke-width=".9" opacity=".38"/>';
    s += '<ellipse cx="' + f(m - hw) + '" cy="' + f(yy + 2) + '" rx="1.5" ry="2.6" fill="' + ck + '" opacity=".55"/>';
    s += '<ellipse cx="' + f(m + hw) + '" cy="' + f(yy + 2) + '" rx="1.5" ry="2.6" fill="' + ck + '" opacity=".55"/>';
  }

  /* 结：一枚纽结 + 两条垂尾（蝴蝶结读的是"礼品包装"，不是"扎口的结"） */
  if (bow >= 1){
    var cy2 = 97.6, kb = shadeHex(cols[0], 0.7), kl = shadeHex(cols[0], 1.15);
    /* ★先垫一层暗底：丝色若是月白（几乎白），结和垂尾压在米色囊身上会整块消失 ——
       同"浅色丝配暗底"一条规矩。 */
    s += '<g opacity=".34" stroke="#5A4526" fill="none" stroke-linecap="round">' +
           '<path d="M' + (m - 1.5) + ' ' + (cy2 + 2.5) + ' q-4 7 1.5 11" stroke-width="2.9"/>' +
           '<path d="M' + (m + 1.5) + ' ' + (cy2 + 2.5) + ' q4 7 -1.5 11" stroke-width="2.9"/>' +
           '<circle cx="' + m + '" cy="' + cy2 + '" r="3.9"/>' +
         '</g>';
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

/* ---------------- 执杯上寿：举觞（按住看圈）／献上（托觞落案） ----------------
   2026-11-02 美术重做（口径见 01_游戏UI/执觞上寿_美术优化意见_v1.md）：
   · 觞补三件：双耳 / 圈足 / 深内壁。形制取**漆耳杯（羽觞）**——战国至五代沿用，
     用作"觞"最贴；去掉这三件它就只是一只纸杯。
   · 案从"一个面"补成三层：案面（后沿收 6、抬 9 做透视）＋侧板厚 7＋两条板足，
     再补边抹亮线、两道木纹、案下投影。只有面没有厚，第一人称俯视下必被读成光斑。
   · 影分"举/放"：举时影小、实，且与杯底分开；放时影收紧贴底。不写字也能读出"举起来了"。
   · 手改掌托剪影（原 `M134 145 q16 6 32 0` 是 stroke 7 的孤弧，竖屏 8px，读作一块饼干）。
   两拍共用 tableAt()：同一张案的两个机位，不是两块不同的板。 */
function playShang(cv, hooks, cfg, ui) {
  var st = { beat: 0, down: false, held: 0, t0: 0, drag: false, cup: { x: 78, y: 164 }, placed: false, done: false };
  var DUR = 700;
  /* 案：y＝案面前沿；两拍只换机位（居中 220 / 右移 126） */
  var T = { y: 136, cx0: 150, w0: 220, cx1: 232, w1: 118, drop: { x: 232, y: 133 } };
  var CUP0 = { x: 150, y: 106 };                 /* 举觞时机位（杯底离案面 12 单位） */

  /* 觞：漆耳杯。宽 22 / 高 16.6，含耳总宽 32.8（竖屏 41px、横屏 74px，进"可辨"区间） */
  function cupSVG() {
    return '<g>' +
      /* 双耳先画：口沿压住它们的根，才像从杯身长出来，而不是贴上去两片饼干 */
      '<ellipse cx="-12.4" cy="-5" rx="4.1" ry="2.3" fill="#8E4632" stroke="#4E2618" stroke-width=".9" transform="rotate(-12 -12.4 -5)"/>' +
      '<ellipse cx="12.4" cy="-5" rx="4.1" ry="2.3" fill="#8E4632" stroke="#4E2618" stroke-width=".9" transform="rotate(12 12.4 -5)"/>' +
      /* 杯身：浅腹下收 */
      '<path d="M-11 -7 C-10.6 -1 -9 4.4 -4.8 7 H4.8 C9 4.4 10.6 -1 11 -7 Z" fill="#A8563C" stroke="#4E2618" stroke-width="1.2" stroke-linejoin="round"/>' +
      /* 圈足＋底沿：无足即碗，有足才是"器" */
      '<path d="M-4.8 7 h9.6 l-.9 2.5 h-7.8 Z" fill="#8E4632" stroke="#4E2618" stroke-width=".9"/>' +
      '<ellipse cx="0" cy="9.6" rx="3.9" ry="1.1" fill="#6E3324" opacity=".85"/>' +
      /* 口沿 / 深内壁 / 酒面反光：浅色内壁会被读成"盖"，必须深 */
      '<ellipse cx="0" cy="-7" rx="11" ry="3.4" fill="#C0704F" stroke="#4E2618" stroke-width="1"/>' +
      '<ellipse cx="0" cy="-6.8" rx="9.2" ry="2.7" fill="#3A231B"/>' +
      '<ellipse cx="0" cy="-6.3" rx="7.3" ry="1.9" fill="#5E382A"/>' +
      '<path d="M-6.4 -6.9 q2.6 -1 4.8 -.5" fill="none" stroke="#D8B394" stroke-width=".8" opacity=".55"/>' +
      /* 外壁左缘一道受光：圆的东西没有高光就是平面色块 */
      '<path d="M-9.4 -5.4 C-9 .2 -7.7 3.2 -5.3 5.4" fill="none" stroke="#E7C7A8" stroke-width="1.1" opacity=".45"/>' +
      '</g>';
  }
  /* ★不画手（意见书 §4.3 方案 B）：试过"掌托剪影"，但在竖屏 26px 的杯下，
     那条掌根弧被读成**杯垫**——"杯垫 + 杯"恰好否掉"举起来"。第一人称本来就看不见自己的手，
     靠"杯 + 落在案面上的影"表达，少一件画不好的东西。 */
  /* 案：投影 → 板足 → 侧板厚 → 案面顶 → 边抹 → 木纹 */
  function tableAt(cx, w, yT) {
    var x0 = cx - w / 2, x1 = cx + w / 2, s = '';
    s += '<ellipse cx="' + cx + '" cy="' + (yT + 24) + '" rx="' + n1(w * .46) + '" ry="5.4" fill="#8A6A3A" opacity=".14"/>';
    s += '<path d="M' + n1(x0 + 14) + ' ' + (yT + 5) + ' h8 v16 h-8 Z" fill="#8A6E45"/>' +
         '<path d="M' + n1(x1 - 22) + ' ' + (yT + 5) + ' h8 v16 h-8 Z" fill="#8A6E45"/>' +
         '<path d="M' + n1(x0 + 14.8) + ' ' + (yT + 8) + ' h1 v13 h-1 Z M' + n1(x1 - 21.2) + ' ' + (yT + 8) + ' h1 v13 h-1 Z" fill="#6E5732" opacity=".5"/>';
    s += '<path d="M' + n1(x0) + ' ' + yT + ' h' + n1(w) + ' v7 h-' + n1(w) + ' Z" fill="#A9873F"/>';
    s += '<path d="M' + n1(x0 + 6) + ' ' + (yT - 9) + ' H' + n1(x1 - 6) + ' L' + n1(x1) + ' ' + yT + ' H' + n1(x0) + ' Z" fill="#DCC38C" stroke="#B99A5E" stroke-width=".8" stroke-linejoin="round"/>';
    s += '<path d="M' + n1(x0 + 1.2) + ' ' + (yT - .7) + ' H' + n1(x1 - 1.2) + '" stroke="#F3E4C0" stroke-width="1.1" opacity=".7"/>';
    s += '<path d="M' + n1(x0 + 24) + ' ' + (yT - 6) + ' q' + n1(w * .17) + ' -1.8 ' + n1(w * .32) + ' .5" fill="none" stroke="#B99A5E" stroke-width=".8" opacity=".4"/>' +
         '<path d="M' + n1(x0 + w * .48) + ' ' + (yT - 2.6) + ' q' + n1(w * .15) + ' -1.6 ' + n1(w * .28) + ' .3" fill="none" stroke="#B99A5E" stroke-width=".8" opacity=".3"/>';
    return s;
  }

  function ring0() { return st.beat === 0 ? st.held / DUR : (st.placed ? 1 : 0); }
  function scene() {
    var s = '', p = Math.min(1, ring0());
    if (st.beat === 0) {
      var hr = 26, C = 2 * Math.PI * hr;
      /* 环在下、案在更下：环底被案面挡住是正常的（案是实体，环是标尺） */
      s += '<g id="hring"><circle cx="150" cy="111" r="' + hr + '" fill="none" stroke="#C9B48A" stroke-width="2.2" opacity=".32"/>' +
        '<circle id="harc" cx="150" cy="111" r="' + hr + '" fill="none" stroke="#7FA9A1" stroke-width="3.4" stroke-linecap="round" ' +
        'transform="rotate(-90 150 111)" stroke-dasharray="' + n1(C) + '" stroke-dashoffset="' + n1(C * (1 - p)) + '"/></g>';
      s += tableAt(T.cx0, T.w0, T.y);
      /* 影落在案面上：比杯小一号、实一点 —— 杯与影分开，"举"才成立 */
      s += '<ellipse cx="150" cy="' + (T.y - 4) + '" rx="' + n1(8 - 1 * p) + '" ry="' + n1(2.6 - .4 * p) +
           '" fill="#7A5C2E" opacity="' + n1(.22 - .06 * p) + '"/>';
      s += '<g id="cup" transform="translate(' + CUP0.x + ',' + n1(CUP0.y - 3 * p) + ')">' + cupSVG() + '</g>';
      if (ui && ui.hud) { s += ui.hud('按住觞，等外圈走满再松', Math.round(p * 100) + '%', p >= .99 ? 'ok' : null); }
    } else {
      s += tableAt(T.cx1, T.w1, T.y);
      /* 目标：案面上一个虚圈（落在案面里，不在案沿上） */
      s += '<ellipse cx="' + T.drop.x + '" cy="' + T.drop.y + '" rx="22" ry="7" fill="none" stroke="#8A7B5E" ' +
           'stroke-width="1.5" stroke-dasharray="4 4" opacity=".8"/>';
      if (st.placed) {
        s += '<ellipse cx="' + T.drop.x + '" cy="' + T.drop.y + '" rx="24" ry="8.2" fill="none" stroke="#8FB5B0" stroke-width="1.8" opacity=".85"/>';
      }
      /* 托着走时影跟着杯走；落定后影收紧贴底 */
      var shx = st.cup.x, shy = st.cup.y + 12.6, shr = st.placed ? 11 : 8.6;
      s += '<ellipse cx="' + n1(shx) + '" cy="' + n1(shy) + '" rx="' + n1(shr) + '" ry="2.6" fill="#7A5C2E" opacity="' + n1(st.placed ? .2 : .14) + '"/>';
      s += '<g id="cup" transform="translate(' + n1(st.cup.x) + ',' + n1(st.cup.y) + ')">' + cupSVG() + '</g>';
      /* 落案后不再画场内条：末尾过渡条就钉在这一带，两条叠在一起会互相透字 */
      if (ui && ui.hud && !st.placed) { s += ui.hud('托觞上前，杯底放进案上虚圈', '待落案', null); }
    }
    return s;
  }
  function paint() { cv.html(scene()); }

  function down(p) {
    guardDown(st, st.beat);
    if (st.done) { return; }
    if (st.beat === 0) {
      st.down = true; st.t0 = now(); st.held = 0;
      return;
    }
    if (dist(p, st.cup) < 34) { st.drag = true; }
  }
  function move(p) {
    if (st.beat === 1 && st.drag && !st.placed) {
      st.cup = { x: p.x, y: p.y };
      paint();
    }
  }
  function up(p) {
    if (!guardUp(st, st.beat)) { return; }
    if (st.beat === 0) {
      /* ★按住的时长直接取 now()−t0，不读 loop() 写的 st.held：
         rAF 在后台/省电/无头环境会被吞帧，靠它累加会让"明明按够了"判成没按够。 */
      var el = now() - st.t0;
      st.down = false; st.held = el;
      var ph = Math.min(1, el / DUR);
      if (ph >= 0.92) {
        st.done = true; paint();
        hooks.step(1, '觞已举稳');
        hooks.done(false);                 /* 交棒：F.iv 判过这一拍 → 迸献上拍 */
        return;
      }
      st.held = 0; paint();
      hooks.tip('再按住一会儿——等外圈走满。');
      return;
    }
    if (!st.drag) { return; }
    st.drag = false;
    if (dist(st.cup, T.drop) < 26) {
      st.placed = true;
      /* 2026-11-02 修「杯不在案上」：圈足底在 y+10.7，原吸附 drop.y-3 ⇒ 杯底 140.7，
       * 已落到案面前沿(y=136)之下，看着像悬空/插进案沿。改吸附到 y=123：
       * 杯底 ≈133.7，正好落在案面顶(127~136)中带，虚圈(dy=133)也套得住杯底。 */
      st.cup = { x: T.drop.x, y: T.drop.y - 10 };
      paint();
      hooks.step(1, '觞已落案');
      /* 末尾过渡条（与汤饼/丝结/史官线同一处、同一形制）：点掉才交棒 */
      if (ui && ui.sheet) {
        ui.sheet({
          title: (cfg && cfg.steps && cfg.steps[1] && cfg.steps[1].done) || '觞已献。',
          body: (cfg && cfg.done) || '四礼习毕。',
          go: '收觞'
        }, function () { hooks.done(false); });
      } else { hooks.done(false); }
    } else {
      hooks.tip('托到案上那个虚圈里。');
    }
  }

  var raf = 0;
  function loop() {
    raf = 0;
    if (st.beat === 0 && st.down && !st.done) {
      st.held = now() - st.t0;
      var ph = Math.min(1, st.held / DUR);
      var arc = cv.q('#harc');
      if (arc) {
        arc.setAttribute('stroke-dashoffset', n1(2 * Math.PI * 26 * (1 - ph)));
        arc.setAttribute('stroke', ph >= 0.99 ? '#6E9A94' : '#7FA9A1');
      }
      var cg = cv.q('#cup');
      if (cg) { cg.setAttribute('transform', 'translate(' + CUP0.x + ',' + n1(CUP0.y - 3 * ph) + ')'); }
      hooks.step(ph, '稳住… ' + Math.round(ph * 100) + '%');
    }
    if (st.live) { raf = requestAnimationFrame(loop); }
  }

  return {
    beat: function (i) {
      st.beat = i; st.down = false; st.drag = false; st.held = 0; st.done = false;
      st.cup = { x: 78, y: 164 }; st.placed = false;
      paint(); hooks.step(0, i === 0 ? '按住觞' : '托觞上前');
    },
    down: down, move: move, up: up,
    start: function () { st.live = true; if (!raf) { raf = requestAnimationFrame(loop); } },
    stop: function () { st.live = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    progress: ring0, label: function () { return st.beat === 0 ? '按住 ' + (st.held / 1000).toFixed(1) + ' / 0.7 秒' : '托觞'; },
    state: function () { return { beat: st.beat, held: Math.round(st.held), placed: st.placed, cup: st.cup }; }
  };
}

/* ---------------- 丝结承露囊：择丝 / 选囊 / 绕丝 / 放香药 / 结绳 ---------------- */
function playFolk(cv, hooks, cfg, ui) {
  var st = { beat: 0, silk: [], taken: [], body: 0, wound: 0, lastAng: 0, acc: 0, down: false,
    hits: 0, drag: false, dish: { x: 62, y: 164 }, spiced: false, knot: 0, fin: false, pt: null };

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
        /* 未选前谁都不高亮：st.body 默认就是 0，按 st.body 判会把素绢先点亮（＝替玩家选了） */
        var on = st.chosen && st.body === q;
        s += '<rect x="' + (PX[q] - 29) + '" y="84" width="58" height="78" rx="10" fill="none" stroke="' + (on ? '#527E79' : '#D8CFBA') + '" stroke-width="' + (on ? '2' : '1') + '"/>' +
          '<g transform="translate(' + PX[q] + ',106) scale(.58) translate(-150,-100)">' + bagSVG({ cols: colsOf(), body: q, wound: 3 }) + '</g>' +
          '<text x="' + PX[q] + '" y="178" font-size="10" text-anchor="middle" fill="#5A5750">' + nm[q] + '</text>';
      }
      return s;
    }
    /* ---- 成品页：结完就停在这里，不直接跳走 ---- */
    if (st.fin) { return finale(); }

    /* 后三拍都在囊上做 */
    s += bagSVG({ cols: colsOf(), body: st.body, wound: (st.beat === 2 ? st.wound : 3), spice: st.spiced, cinch: st.knot >= 1 ? 1 : (st.beat === 4 ? 0.35 : 1), bow: st.knot >= 2 ? 1 : 0 });
    if (st.beat === 2) {
      s += '<circle cx="150" cy="96" r="27" fill="none" stroke="#527E79" stroke-width="1.2" stroke-dasharray="4 4" opacity=".5"/>';
      /* 丝头跟手：绕到哪儿、线头在哪儿，一眼看得见（不然只有三道静态的线，"在绕"这件事没有证据） */
      if (st.down && st.pt) {
        var hw0 = [9, 11.4, 14.2][Math.min(2, st.wound)] || 9;
        var cy0 = [101.4, 105.8, 110.4][Math.min(2, st.wound)] || 101.4;
        var ck0 = colsOf()[st.wound % 3];
        s += '<path d="M' + n1(150 + hw0) + ' ' + n1(cy0 + 2) + ' Q' + n1(st.pt.x + 6) + ' ' + n1(st.pt.y - 6) + ' ' +
          n1(st.pt.x) + ' ' + n1(st.pt.y) + '" fill="none" stroke="' + ck0 + '" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>' +
          '<circle cx="' + n1(st.pt.x) + '" cy="' + n1(st.pt.y) + '" r="2.2" fill="' + ck0 + '" opacity=".9"/>';
      }
      s += hudBar('捏住丝头，绕囊口打圈', st.wound + '/3 圈', st.wound >= 3 ? 'ok' : null);
    }
    if (st.beat === 3) {
      s += '<g transform="translate(' + n1(st.dish.x) + ',' + n1(st.dish.y) + ')"><ellipse rx="15" ry="5.6" fill="#9FA8A2" stroke="#5E6B64" stroke-width="1.2"/>' +
        '<ellipse cy="-1" rx="11" ry="4" fill="#B39A6A"/><circle cx="-4" cy="-2" r="1.5" fill="#C9A34E"/><circle cx="2" cy="-3" r="1.3" fill="#B39A6A"/></g>' +
        '<circle cx="150" cy="96" r="22" fill="none" stroke="#9A7728" stroke-width="1.5" stroke-dasharray="4 4" opacity=".6"/>';
      s += hudBar('把香药倒进囊口', st.spiced ? '已入' : '待放', st.spiced ? 'ok' : null);
    }
    if (st.beat === 4) {
      s += '<circle cx="150" cy="86" r="18" fill="none" stroke="#527E79" stroke-width="1.3" stroke-dasharray="4 4" opacity=".55"/>';
      s += hudBar('在囊口连点两下：先收口，再打结', st.knot + '/2 下', st.knot >= 2 ? 'ok' : null);
    }
    return s;
  }
  /* 成品页：囊居中 + 题识（款式）+ 三色点。整体上移 8，底边停在 y≈149 ——
     底部那条过渡对话框钉在舞台下沿，不能压住成品。 */
  function finale() {
    var nm = ['素绢', '锦缎', '缂丝'][st.body] || '素绢';
    var cs = colsOf(), dots = '', i2;
    /* ★三色点上移（2026-11-02 实机反馈）：原来 cy=60，成品放大 1.12 + 上移 10 之后
       挂环顶已经到 y≈64 —— 三个点正好压在挂环上，读作"囊上有三颗钉"。
       现在 cy=52（点底 55.2、环顶 64，留 8.8 单位净空），题识也跟着上抬到 36。 */
    for (i2 = 0; i2 < 3; i2++) {
      dots += '<circle cx="' + (140 + i2 * 10) + '" cy="52" r="3.2" fill="' + (cs[i2] || '#8FB5B0') +
        '" stroke="#FFFDF6" stroke-width="1"/>';
    }
    return '<defs><radialGradient id="finG" cx=".5" cy=".45" r=".55">' +
        '<stop offset="0" stop-color="#FFFDF6" stop-opacity=".92"/>' +
        '<stop offset="1" stop-color="#FFFDF6" stop-opacity="0"/>' +
      '</radialGradient></defs>' +
      '<ellipse cx="150" cy="110" rx="88" ry="74" fill="url(#finG)"/>' +
      '<text x="150" y="36" font-size="9" text-anchor="middle" fill="#8A8378">承露囊 · ' + nm + '</text>' +
      dots +
      /* 成品比游戏里大 12%：这一页就是"给玩家看一眼"的，不能和过程图一个尺寸 */
      '<g transform="translate(0,-10)"><g transform="translate(150,122) scale(1.12) translate(-150,-122)">' +
        bagSVG({ cols: cs, body: st.body, wound: 3, spice: true, cinch: 1, bow: 1 }) +
      '</g></g>';
  }

  function paint() { cv.html(scene()); }
  function prog() {
    if (st.fin) { return 1; }
    if (st.beat === 0) { return st.silk.length / 3; }
    if (st.beat === 1) { return st.chosen ? 1 : 0; }
    if (st.beat === 2) { return st.wound / 3; }
    if (st.beat === 3) { return st.spiced ? 1 : 0; }
    return st.knot / 2;
  }
  function lab() {
    if (st.beat === 0) { return '已挑 ' + st.silk.length + ' / 3 束'; }
    if (st.beat === 1) { return st.chosen ? ('已选 ' + ['素绢', '锦缎', '缂丝'][st.body]) : '待选囊体'; }
    if (st.beat === 2) { return '已绕 ' + st.wound + ' / 3 圈'; }
    if (st.beat === 3) { return st.spiced ? '香药已入' : '待放香药'; }
    return '已结 ' + st.knot + ' / 2 下';
  }

  function down(p) {
    if (st.fin) { return; }                 /* 收尾态：底部对话框接管，画布不再吃手势 */
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
    if (st.beat === 2) {
      /* 2026-11-02 重写（任务9「绕丝太难」）：down 不再清 acc —— 原实现里
       * 一旦 down 重入（宿主 WebView 点控抖动会重发 pointerdown，实测 B 场景
       * acc 被清到 0），绕了一半全部作废。现在按住/松手只是暂停，进度保留。 */
      st.down = true; st.lastAng = 0; st.px = null;
      return;
    }
    if (st.beat === 3) { st.drag = dist(p, st.dish) < 24; return; }
    if (st.beat === 4) {
      if (dist(p, { x: 150, y: 86 }) > 20) { return; }
      st.knot = Math.min(2, st.knot + 1);
      paint(); hooks.step(prog(), lab());
      if (st.knot >= 2) {
        /* 不直接交棒：先进成品页，再把对话框贴到舞台下沿，玩家点过才走 */
        st.fin = true;
        paint(); hooks.step(1, '双结系牢');
        ui.sheet({
          title: (cfg && cfg.steps && cfg.steps[4] && cfg.steps[4].done) || '双结系牢。',
          body: (cfg && cfg.done) || '囊成。',
          go: '收下'
        }, function () { hooks.done(false); });
      }
    }
  }
  function move(p) {
    if (st.beat === 2 && st.down) {
      st._moves = (st._moves || 0) + 1;
      st.pt = { x: p.x, y: p.y };                 /* 丝头从这里牵出来 */
      /* ★转向累积：算「手指路径自己拐了多少弯」，而不是绕固定原点 (150,96) 转角度。
       * 旧实现的两个死穴（都实测复现过）：
       *   a) 手指路径必须包住原点——绕小圈(r15)或绕囊体的偏心圈，角度伸缩相抵，acc 恒 0；
       *   b) down 重入清 acc——见上。
       * 转向累积对圆心/半径完全不敏感：任何圆滑的环形动作都计数。
       * 急转向（折返）单步封顶 0.9 弧度：来回直线蹭不出一圈，防刷。 */
      if (st.px != null) {
        var dx0 = p.x - st.px, dy0 = p.y - st.py;
        if (Math.abs(dx0) > 0.8 || Math.abs(dy0) > 0.8) {
          var ha = Math.atan2(dy0, dx0);
          if (st.lastAng) {
            var da = ha - st.lastAng;
            while (da > Math.PI) { da -= 2 * Math.PI; }
            while (da < -Math.PI) { da += 2 * Math.PI; }
            st.acc += Math.min(Math.abs(da), 1.25);   /* 快绕时单步转角可能更大，也别截太狠 */
          }
          st.lastAng = ha;
        }
      }
      st.px = p.x; st.py = p.y;
      /* ★一圈手指动作 = 一圈丝（2026-11-02 用户要求「绕三圈」）。
       *   旧式 `acc / 2π × 3` 是「手指绕一圈就记三圈」——为了好过，但动作与结果对不上，
       *   玩家看到丝线一次性跳满三道。现在每绕满一个 2π 才记一圈，三道丝要绕三次。
       * ★TURN_R = 0.92：鼠标/手指按 15° 采样时，一圈实测只累到 0.98π×2（像素取整 +
       *   起点那一步不计角度，实测 2 圈 12.30 rad、3 圈 18.64 rad ≈ 少 2%）。按裸 2π 判
       *   会让「明明绕满三圈」停在 2/3，故留 8% 余量 —— 玩家不会数到小数点后两位。 */
      /* ★2026-11-02 手机实测「绕丝难以顺畅完成」再放宽一档：
       *   0.92 → 0.62，即「手指绕大约 225° 就记一圈」。理由：手机上囊口只有指甲盖大，
       *   拇指画一圈实际能落在画布上的采样点常只有十几个，取整与采样丢失会吃掉 10~20%；
       *   再加上玩家不敢画太大圈，实际弧长本就不足 2π。放宽后动作与结果仍然对得上
       *   （三个方向各绕一次才满三道丝），不改变"要绕"这件事。 */
      var TURN_R = Math.PI * 2 * 0.62;
      var w = Math.min(3, Math.floor(st.acc / TURN_R));
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
      st.beat = i; st.down = false; st.drag = false; st.lastAng = 0; st.acc = 0; st.pt = null; st.fin = false; st.px = null; st._moves = 0;
      if (ui && ui.sheet) { ui.sheet.close(); }
      if (i === 0) { st.silk = []; st.taken = []; st.body = 0; st.chosen = false; st.wound = 0; st.spiced = false; st.knot = 0; }
      if (i === 2) { st.wound = 0; }
      paint(); hooks.step(prog(), lab());
    },
    down: down, move: move, up: up,
    start: function () { }, stop: function () { },
    progress: prog, label: lab,
    state: function () {
      /* acc/lastAng/_moves：绕丝手势的调试口（QA 探针用） */
      return { beat: st.beat, silk: st.silk.slice(), body: st.body, chosen: !!st.chosen,
               wound: st.wound, spiced: st.spiced, knot: st.knot, fin: st.fin,
               acc: +st.acc.toFixed(2), down: st.down, pts: st._moves || 0 };
    }
  };
}

/* ---------------- 食单记注：研墨 / 蘸笔 / 临帖 ---------------- */
function playShiFood(cv, hooks, cfg, ui) {
  var st = { beat: 0, passes: 0, acc: 0, mx: 150, my: 104, tilt: 0, drag: false,
    brush: { x: 232, y: 62 }, ink: 0, gi: 0, trail: [], done: false, sT0: 0, fin: false, moDone: false };

  /* ★字帖几何单点定义（2026-11-01 修「说明文字压字」）
   * 原：by=12 / bh=186 ⇒ 底板 y 4~204，而说明文字基线 y=206、字号 9
   *     ⇒ 文字顶部 197 压进底板 7px，正好盖住「餅」字下半部。
   * 现：整体上移 6px 并压缩 14px（bh 172）⇒ 底板 y −2~184、文字基线 202（顶 193）
   *     ⇒ 净间距 9 个 viewBox 单位（≈14px @ 1.6×），字缩小约 8%，其余不变。
   * 底板 rect 与文字基线都从这里的常量派生，杜绝两处硬编码再次走散。 */
  var GB = { bx: 96, by: 6, bw: 110, bh: 172, pad: 3, plate: 8, plateBot: 14, noteY: 202 };
  var POOL = { x: 150, y: 120, rx: 30, ry: 24 };     /* 砚池 */
  var RUN = { x: 20, y: 9 };                          /* 墨条重心能到的最远（池内） */
  var PASS = 40;                                      /* 累计横移 40 单位＝推满一趟（往返一次约 40） */

  function glyph() {
    if (!st.chars) { st.chars = glyphPrep({ text: '湯餅', bx: GB.bx, by: GB.by, bw: GB.bw, bh: GB.bh, cols: 1, rows: 2, pad: GB.pad }); }
    return st.chars;
  }
  function inkCol() {
    /* 墨色随趟数递深：浅灰 → 近黑（一池水磨成墨，看得见） */
    var p = st.passes / 4;
    var r = Math.round(96 - 66 * p), g = Math.round(98 - 68 * p), b = Math.round(104 - 70 * p);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function moTiao() {
    /* 墨条：跟手 + 逐趟磨短（磨掉的那截是真会没的）+ 按移动方向微倾 */
    var wear = Math.min(6, st.passes * 1.5);
    return '<g id="mo" transform="translate(' + n1(st.mx) + ',' + n1(st.my) + ') rotate(' + n1(st.tilt) + ')">' +
      '<rect x="-6" y="' + n1(-34 + wear) + '" width="12" height="' + n1(34 - wear) + '" rx="2" fill="#2E2E34" stroke="#17171B"/>' +
      '<rect x="-6" y="' + n1(-37 + wear) + '" width="12" height="5" rx="1" fill="#5A5A64"/>' +
      /* 磨口：一道被磨白的斜面 */
      '<path d="M-6 0 h12 l-1.4 2.6 h-9.2 Z" fill="#6E6E78" opacity=".9"/>' +
      '<path d="M-4.4 -20 h1 v14 h-1" fill="#4A4A52" opacity=".7"/>' +
      '</g>';
  }

  function scene() {
    var s = '';
    if (st.beat === 0) {
      var p = st.passes / 4;
      s += '<rect x="104" y="86" width="92" height="68" rx="7" fill="#4A4A4E" stroke="#2C2C30" stroke-width="2"/>' +
        '<ellipse cx="' + POOL.x + '" cy="' + POOL.y + '" rx="' + POOL.rx + '" ry="' + POOL.ry + '" fill="#8A8A90"/>' +
        '<ellipse cx="' + POOL.x + '" cy="' + POOL.y + '" rx="27" ry="21" fill="' + inkCol() + '"/>' +
        '<ellipse cx="' + POOL.x + '" cy="' + POOL.y + '" rx="20" ry="14" fill="#191920" opacity="' + n1(.12 + .5 * p) + '"/>' +
        '<ellipse cx="141" cy="112" rx="8" ry="4" fill="#6E6E78" opacity="' + n1(.34 - .2 * p) + '"/>' +
        /* 目标：池心一圈虚线（不要求精确，只要在池里推） */
        '<circle cx="' + POOL.x + '" cy="' + POOL.y + '" r="20" fill="none" stroke="#E8E4D6" stroke-width="1.2" stroke-dasharray="4 4" opacity=".5"/>' +
        moTiao() +
        '<text x="150" y="200" font-size="9" text-anchor="middle" fill="#8A8378">按住墨条，在砚池里左右推——推满四趟</text>';
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
    if (!st.fin) { h += '<text x="150" y="' + GB.noteY + '" font-size="9" text-anchor="middle" fill="#527E79">照红字描「湯餅」· 从红圈起笔</text>'; }
    return h;
  }
  function paint() { cv.html(scene()); }

  /* ---------- 描字：按"这一笔被覆盖了多少"判，不按"抬手那一刻"判 ----------
     ★2026-11-02 支持连笔：原来只在 up() 里判当前一笔，手指不抬就换到下一笔时，
       整段轨迹被当作"只描了一笔"、其余全判没描到（实机反馈"笔画中断/识别不了"）。
       现在每次 move 都判：只要当前这一笔被覆盖满 55%，就即时判过、游标前移，
       剩下的轨迹继续拿去判下一笔 —— 一口气写下去也能过，抬不抬手都行。 */
  function coverOf(so, trail) {
    var hit = 0, i, j;
    for (i = 0; i < so.samp.length; i++) {
      for (j = 0; j < trail.length; j++) {
        if (dist(trail[j], so.samp[i]) <= 10) { hit++; break; }
      }
    }
    return hit / so.samp.length;
  }
  function checkStrokes() {
    var g = glyph(), moved = false;
    while (st.gi < g.flat.length && coverOf(g.flat[st.gi], st.trail) >= 0.55) {
      g.flat[st.gi].done = true;
      st.gi += 1;
      moved = true;
    }
    if (moved) {
      paint();
      hooks.step(st.gi / g.flat.length, '已写 ' + st.gi + ' / ' + g.flat.length + ' 笔');
      if (st.gi >= g.flat.length && !st.fin) {
        st.fin = true;
        /* 末尾过渡条（与女官线同款）：点掉才交棒 */
        if (ui && ui.sheet) {
          ui.sheet({ title: '两字写毕', body: (cfg && cfg.done) || '记毕。', go: '收笔' }, function () {
            hooks.done(false);
          });
        } else { hooks.done(false); }
      }
    }
    return moved;
  }

  function down(p) {
    guardDown(st, st.beat);
    if (st.beat === 0) {
      /* ★整块砚台都能按（原来只有按准那根 12×34 的墨条才算，实机很难按上） */
      if (dist(p, { x: POOL.x, y: POOL.y }) < 46 || dist(p, { x: st.mx, y: st.my }) < 30) {
        st.drag = true;
        st.mx = clamp(p.x, POOL.x - RUN.x, POOL.x + RUN.x);
        st.my = clamp(p.y, POOL.y - RUN.y, POOL.y + RUN.y);
        paint();
      }
      return;
    }
    if (st.beat === 1) { st.drag = dist(p, { x: 150, y: 120 }) < 34 || dist(p, st.brush) < 30; return; }
    if (st.fin) { return; }
    var g = glyph();
    if (st.gi >= g.flat.length) { return; }
    var so = g.flat[st.gi];
    if (dist(p, so.start) > 24) { hooks.tip('从红圈起笔。'); st.trail = []; return; }
    sfx('brush');
    st.trail = [p]; st.sT0 = now();
  }
  function move(p) {
    if (st.beat === 0 && st.drag) {
      /* 墨条跟手：夹在池内 → 累加横移 → 每 40 单位算一趟 */
      var nx = clamp(p.x, POOL.x - RUN.x, POOL.x + RUN.x);
      var ny = clamp(p.y, POOL.y - RUN.y, POOL.y + RUN.y);
      var dx = nx - st.mx;
      st.acc += Math.abs(dx);
      st.tilt = clamp(dx * .5, -7, 7);
      st.mx = nx; st.my = ny;
      var np = Math.min(4, Math.floor(st.acc / PASS));
      if (np !== st.passes) {
        st.passes = np;
        sfx('brush');
        hooks.step(np / 4, '已推 ' + np + ' / 4 趟');
      }
      paint();
      /* 研墨→蘸笔是一口气的工序，中间不插过渡条（过渡条只在本节末尾） */
      if (st.passes >= 4 && !st.moDone) { st.moDone = true; setTimeout(function () { hooks.done(false); }, 260); }
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
    if (st.beat === 2 && st.trail.length && !st.fin) {
      st.trail.push(p);
      if (st.trail.length > 420) { st.trail.shift(); }     /* 一口气连写也不让它无限长 */
      var pl = cv.q('#hzg');
      if (pl) { pl.setAttribute('points', st.trail.map(function (q) { return q.x.toFixed(1) + ',' + q.y.toFixed(1); }).join(' ')); }
      checkStrokes();                                       /* ★即时判：连笔不必抬手 */
    }
  }
  function up(p) {
    if (!guardUp(st, st.beat)) { return; }
    if (st.beat === 0) { st.drag = false; return; }
    if (st.beat === 1) {
      st.drag = false;
      var d = dist(st.brush, { x: 150, y: 120 });
      var k = Math.max(0, Math.min(1, (21 * 2.2 - d) / (21 * 1.6)));
      if (k >= 0.75) { st.ink = 1; paint(); hooks.step(1, '笔已蘸饱'); hooks.done(false); }
      else { hooks.tip('笔头要黑透——再往池心探一点。'); }
      return;
    }
    if (!st.trail.length) { return; }
    checkStrokes();                          /* 抬手时再判一次（收笔落在同一笔上也算） */
    st.trail = [];
    var pl = cv.q('#hzg'); if (pl) { pl.setAttribute('points', ''); }
    if (st.gi < glyph().flat.length) { hooks.tip('这一笔没描到——照着红线走。'); }
  }

  return {
    beat: function (i) {
      st.beat = i; st.drag = false; st.trail = []; st.fin = false;
      if (i === 0) { st.acc = 0; st.passes = 0; st.mx = 143; st.my = 110; st.tilt = -7; st.moDone = false; }
      paint(); hooks.step(0, '第 ' + (i + 1) + ' 拍');
    },
    down: down, move: move, up: up,
    start: function () { }, stop: function () { },
    progress: function () {
      return st.beat === 0 ? st.passes / 4 : (st.beat === 1 ? st.ink : (st.gi / (st.chars ? st.chars.flat.length : 26)));
    },
    label: function () { return st.beat === 2 ? '已写 ' + st.gi + ' 笔' : (st.beat === 0 ? '已推 ' + st.passes + ' 趟' : ''); },
    /* 只读调试口：cur 是"当前该写的这一笔"的起笔点与采样点（QA 用来走连笔） */
    state: function () {
      var g = st.chars, so = g && g.flat[st.gi], sm = [];
      if (so) { for (var i = 0; i < so.samp.length; i++) { sm.push([Math.round(so.samp[i].x * 10) / 10, Math.round(so.samp[i].y * 10) / 10]); } }
      return { beat: st.beat, passes: st.passes, acc: Math.round(st.acc), mx: Math.round(st.mx), my: Math.round(st.my),
               ink: Math.round(st.ink * 100) / 100, gi: st.gi, n: g ? g.flat.length : 0, fin: st.fin,
               cur: so ? { start: [Math.round(so.start.x * 10) / 10, Math.round(so.start.y * 10) / 10], samp: sm } : null };
    }
  };
}

/* ---------------- 民俗记注：观俗（横拖全景）／问俗（找三位摊主）／落笔（按三笔） ---------------- */
/* ---------- 民俗记注 · 桥市全景素材接口（S4） ----------
 * 占位态（cfg.s4.pano 为 null）用代码画：水面 / 勾栏 / 拱桥 / 幌子 / 行人 / 三个摊位。
 * 正式素材就位后**只改 data.js 的 s4 字段**，这里与全部交互、判定、俗记文案都不动：
 *   s4: { pano:'assets/scenes/s4_qiaoshi/pano.webp',
 *         screens: 3,                      // 全景等于几屏宽
 *         fit: 'xMidYMid slice',           // 纵向取景（preserveAspectRatio 原样下发）
 *         vend: [{fx:0.17,...},{fx:0.50,...},{fx:0.83,...}] }
 * · fx 是摊主在**全景宽度上的比例位置**（0~1），与素材分辨率无关 —— 换成 2880 宽不用改数。
 * · 加载失败自动退回代码占位，不白屏。
 * · 分层视差（S4 方案 L2~L5）留待素材到位后再加，接口形状不变：多张时同样按 fx 归一。 */
/* 三位摊主（默认值＝data.js s4.vend 的镜像）：分布与文案按《天清节_S4桥市全景_开发方案》
 * §5.1/§7.1 —— 同一件事问三个人（看的人 / 卖的人 / 外乡人）：
 *   say  ＝ 摊主台词（问俗气泡，2 句）
 *   note ＝ 落成的记注（记注体短句，落笔拍按玩家问到的顺序落纸） */
var DEF_VEND = [
  { fx: 0.17, name: '茶摊老板娘', say: '江陵的粗茶。官家没做官家的时候，也是这么喝的。',
    note: '桥头茶摊卖江陵粗茶，市人聚饮，不问官私。' },
  { fx: 0.50, name: '卖囊妇人', say: '今日卖空了三个架。买的不都是要送人——有买给自己的。',
    note: '士庶以丝结承露囊，更相遗问——唐千秋节旧俗，五代承之。' },
  { fx: 0.83, name: '南来客商', say: '库里的三百匹是贡的，我这些不是。贡的进不了这条街。',
    note: '占城贡香三百匹已入左藏库；桥市香摊所售非贡余，乃商舶私贩。' }
];
var PANO_CACHE = {};
function panoMeta(src) {
  var e = PANO_CACHE[src];
  if (e) { return e; }
  e = PANO_CACHE[src] = { src: src, ok: false, done: false, cb: null };
  var im = new Image();
  im.onload = function () { e.ok = true; e.done = true; if (e.cb) { e.cb(); } };
  im.onerror = function () { e.ok = false; e.done = true; if (e.cb) { e.cb(); } };
  im.src = src;
  return e;
}
function playShiFolk(cv, hooks, cfg, ui) {
  var S4 = (cfg && cfg.s4) || {};
  var st = { beat: 0, off: 0, seen: [false, false, false], drag: false, sx: 0, so: 0,
             asked: [], notes: 0, travel: 0, bub: -1, rep: -1, repT: 0 };
  var VW = 300, SW = VW * (S4.screens || 3);
  var pano = S4.pano ? panoMeta(S4.pano) : null;
  var VS = (S4.vend && S4.vend.length === 3) ? S4.vend : DEF_VEND;
  var VEND = [];
  (function () {
    for (var vi = 0; vi < 3; vi++) {
      var vv = VS[vi] || DEF_VEND[vi];
      var fx = (vv.fx != null) ? vv.fx : DEF_VEND[vi].fx;
      VEND.push({ x: fx * SW,
        name: vv.name || DEF_VEND[vi].name,
        say: vv.say || DEF_VEND[vi].say,
        note: vv.note || DEF_VEND[vi].note });
    }
  })();
  /* 记注换行：一行 per 字，优先在标点处断（记注体短句最长 29 字，便条一行装不下） */
  function folkWrap(tx, per) {
    tx = String(tx);
    var rows = [], i = 0, PUNCT = '，。；、——！？';
    while (i < tx.length) {
      if (tx.length - i <= per) { rows.push(tx.slice(i)); break; }
      var cut = -1, j;
      for (j = i + per; j > i + per - 6 && j > i + 1; j--) {
        if (PUNCT.indexOf(tx.charAt(j - 1)) >= 0) { cut = j; break; }
      }
      if (cut < 0) { cut = i + per; }
      rows.push(tx.slice(i, cut));
      i = cut;
    }
    return rows;
  }

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
    }
    return s;
  }
  /* 摊主标记（S4 方案 §5.2 三级渐进）：
     观俗这一拍**一个标记都不画**（要"找"才有意义）；问俗起，未问的给 6px 柔光点 +
     极细光圈呼吸（2.4s，SMIL）；已问的改一枚暗朱点常驻 —— 不复点，留下"我来过"的痕迹。
     点到已问：不计数，朱点闪一下（st.rep 记一次重画，重画时插一次性 animate）。 */
  function vendMarks() {
    var s = '', i, x;
    for (i = 0; i < 3; i++) {
      x = VEND[i].x;
      if (st.asked.indexOf(i) >= 0) {
        s += '<circle cx="' + x + '" cy="84" r="3.4" fill="#8A4A3A"/>';
        if (st.rep === i && now() - st.repT < 900) {
          s += '<circle cx="' + x + '" cy="84" r="10" fill="none" stroke="#8A4A3A" stroke-width="1.6" opacity=".9">' +
            '<animate attributeName="opacity" values=".9;0" dur="0.7s" fill="freeze"/></circle>';
        }
      } else if (st.beat >= 1) {
        s += '<circle cx="' + x + '" cy="84" r="3" fill="#E7EFEA" opacity=".9"/>' +
          '<circle cx="' + x + '" cy="84" r="13" fill="none" stroke="#527E79" stroke-width="1" stroke-dasharray="3 4" opacity=".3">' +
          '<animate attributeName="opacity" values=".18;.45;.18" dur="2.4s" repeatCount="indefinite"/></circle>';
      }
    }
    return s;
  }
  function scene() {
    var s = '<defs><clipPath id="panoClip"><rect x="0" y="40" width="' + VW + '" height="118"/></clipPath></defs>';
    s += '<g clip-path="url(#panoClip)"><g transform="translate(' + n1(-st.off) + ',0)">';
    if (pano && pano.ok) {
      /* 正式全景：一张图铺满 [0,SW]×[40,158]；纵向取景交给 fit，避免裁掉主体
       * ★2026-11-02 真机「长按道具弹出保存图片 / 被当成按到背景图」的**唯一根因**：
       *   全景是 SVG 里的 `<image>`，它铺满整个可视区、且默认可命中（pointer-events 默认 visiblePainted）。
       *   道具是代码画的 `<path>`，长按道具时只要指尖落点略偏出道具轮廓，
       *   命中的就是下面这张 `<image>` —— WebView 认为「按到了图片」，
       *   于是弹系统菜单，把动手小节打断（玩家描述成「卡住」）。
       *   修法：全景一律 pointer-events="none"，让它彻底不参与命中测试；
       *   拖拽与点击仍由 SVG 根节点接管，交互行为不变。 */
      s += '<image x="0" y="40" width="' + SW + '" height="118" href="' + pano.src +
        '" preserveAspectRatio="' + (S4.fit || 'xMidYMid slice') + '" pointer-events="none"/>';
      s += vendMarks();
    } else {
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
    s += vendMarks();
    }
    s += '</g></g>';
    s += '<rect x="0" y="40" width="' + VW + '" height="118" fill="none" stroke="#C9B48A" stroke-width="1"/>';
    /* 索引条（S4 方案 §5.2）：问俗拍钉在右下角，「茶 · 囊 · 香」三个字位，
       未问空心、问过实心 —— 只说"还有几个没问"，不指路。落笔拍让位给便条。 */
    if (st.beat === 1) {
      var IDX = ['茶', '囊', '香'];
      for (var k = 0; k < 3; k++) {
        var ax = 234 + k * 20, ad = st.asked.indexOf(k) >= 0;
        s += '<rect x="' + ax + '" y="163" width="16" height="16" rx="3" fill="' + (ad ? '#527E79' : 'none') +
          '" stroke="' + (ad ? '#527E79' : '#B9A67C') + '" stroke-width="1"/>' +
          '<text x="' + (ax + 8) + '" y="175" font-size="9" text-anchor="middle" fill="' +
          (ad ? '#FBF6EA' : '#8A7B5E') + '">' + IDX[k] + '</text>';
      }
    }
    /* 问俗气泡（S4 方案 §5.3）：点开摊主出 2 句对话，全景保留在背景、可继续拖动 */
    if (st.beat === 1 && st.bub >= 0) {
      var bv = VEND[st.bub];
      s += '<g pointer-events="none">' +
        '<rect x="16" y="142" width="268" height="32" rx="6" fill="rgba(251,246,234,.96)" stroke="#C9B48A" stroke-width="1"/>' +
        '<text x="26" y="154" font-size="7.4" fill="#527E79">' + bv.name + '</text>' +
        '<text x="26" y="167" font-size="8.2" fill="#3A3A34">' + bv.say + '</text>' +
        '</g>';
    }
    if (st.beat === 2) {
      /* 便条（S4 方案 §7.2）：三条俗记**按玩家问到的顺序**依次落到纸上；
       * 记注一行装不下（最长 29 字），按标点断成至多两行 */
      s += '<rect x="46" y="144" width="208" height="56" rx="4" fill="#FBF6EA" stroke="#DED7C9" stroke-width="1.2"/>';
      var row = 0, n2;
      for (n2 = 0; n2 < 3; n2++) {
        var vn = st.asked[n2];
        if (vn == null) { break; }
        if (n2 < st.notes) {
          var rows = folkWrap(VEND[vn].note, 20);
          for (var r2 = 0; r2 < rows.length; r2++) {
            s += '<text x="56" y="' + (157 + row * 8.8) + '" font-size="7.6" fill="#3A3A34">' + rows[r2] + '</text>';
            row += 1;
          }
        } else {
          s += '<path d="M56 ' + (154 + row * 8.8) + ' h188" stroke="#EFE7D5" stroke-width="1"/>';
          row += 1;
        }
      }
    }
    return s;
  }
  function paint() { cv.html(scene()); }
  function seenAll() { return st.seen[0] && st.seen[1] && st.seen[2]; }
  function markSeen() {
    var vc = st.off + VW / 2, tol = Math.max(40, Math.round(SW * 0.06));   /* 观察位容差 ±6%（S4 方案 G1） */
    for (var i = 0; i < 3; i++) {
      if (!st.seen[i] && Math.abs(vc - VEND[i].x) < tol) { st.seen[i] = true; }
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
          if (st.asked.indexOf(i) < 0) {
            st.asked.push(i); st.bub = i; sfx('select');
            paint(); hooks.step(prog(), lab()); hooks.tip(VEND[i].name + '：' + VEND[i].say);
            /* ★第三位摊主（2026-11-02 手机实测「问俗缺了第三位回答」）：
             *   旧实现问满三人**立刻** hooks.done —— 第三句台词只写在 hooks.tip 里，
             *   而 tip 落在 .iv-hint 上，关掉教学就整条不显示；即便开着，也只是一闪就被
             *   「落笔」这一拍顶掉。现在：先把第三位的话留在气泡里 1.1 秒，
             *   再走一张过渡条（把三句乡俗收成一句），玩家点「落笔」才进第三拍。 */
            if (st.asked.length >= 3) {
              var last = VEND[i];
              st.bub = i; paint();
              var goNext = function () {
                if (st._askDone) { return; }
                st._askDone = true;
                hooks.done(false);
              };
              setTimeout(function () {
                if (st.dead || !cv.svg.isConnected) { return; }
                st.bub = -1; paint();
                if (ui && ui.sheet) {
                  ui.sheet({
                    title: '三处问过',
                    body: last.name + '：' + last.say + '　——三句乡俗已记下，可以落笔了。',
                    go: '落笔'
                  }, goNext);
                } else { goNext(); }
              }, 1100);
            }
          } else {
            st.rep = i; st.repT = now(); paint();    /* 点到已问：不计数，朱点闪一下 */
          }
          return;
        }
      }
      st.askHit = false; st.drag = true; st.sx = p.x; st.so = st.off; st.moved = 0;
      return;
    }
    if (st.notes >= 3 || p.y < 150) { return; }
    st.notes++; paint(); hooks.step(prog(), lab());
    if (st.notes >= 3 && !st._finSheet) {
      /* 末尾过渡条（史官线统一：与 食单/校字 同一处、同一形制） */
      st._finSheet = true;
      if (ui && ui.sheet) {
        ui.sheet({ title: '三俗记毕', body: (cfg && cfg.done) || '记毕。', go: '收笔' }, function () { hooks.done(false); });
      } else { hooks.done(false); }
    }
  }
  function move(p) {
    if (!st.drag) { return; }
    st.moved = (st.moved || 0) + Math.abs(st.sx - p.x);
    st.travel = (st.travel || 0) + Math.abs(st.sx - p.x);
    st.off = Math.max(0, Math.min(SW - VW, st.so + (st.sx - p.x)));
    if (st.beat === 0) { markSeen(); }
    paint();
    hooks.step(prog(), lab());
    if (st.beat === 0 && !st._ok && (seenAll() || st.travel >= VW * 2)) {
      /* S4 方案 G1：三个观察位各入视口一次；保底＝累计位移 ≥ 2 屏（逛完了全程就算逛过） */
      st._ok = true;
      if (!seenAll()) { st.seen = [true, true, true]; }
      hooks.done(false);
    }
  }
  function up() {
    if (!guardUp(st, st.beat)) { return; }
    /* 问俗：几乎没动过就是"点了空处"（S4 方案 §5.3 气泡文案） */
    if (st.beat === 1 && !st.askHit && (st.moved || 0) < 8) { hooks.tip('桥上人多，摊主在幌子底下。'); }
    st.drag = false; st.moved = 0;
  }

  if (pano) {
    /* 图可能在这一拍挂载之后才解码完：回来重画一次即可，其它一律不动 */
    pano.cb = function () { try { paint(); } catch (e) { } };
    if (pano.done) { paint(); }
  }
  return {
    beat: function (i) { st.beat = i; st.drag = false; paint(); hooks.step(prog(), lab()); },
    down: down, move: move, up: up,
    start: function () { }, stop: function () { },
    progress: prog, label: lab,
    state: function () {
      return { beat: st.beat, off: Math.round(st.off), seen: st.seen.slice(),
               asked: st.asked.slice(), notes: st.notes,
               pano: !!(pano && pano.ok), panoSrc: pano ? pano.src : null, sw: SW,
               vend: VEND.map(function (v) { return Math.round(v.x); }) };
    }
  };
}

  /* ============================================================
     挑灯：擦罩（往复擦五处煤垢）／注油（按住油壶注进盂）／点灯（三下：引火→起焰→落罩）
     ------------------------------------------------------------
     从「手感校准页」原样移植（2026-11-02《挑灯_油灯机制改进方案_v1》重做版）：
     · 物理同页：油在盂里（LP.rimY..botY），罩只是挡风的烟囱 —— 罩内不出现油面；
       量程＝盂深（1 分 = 2px，盂深 20px = 10 分，七分线 y=124）；
       三拍是同一次使用：擦罩戴罩（dy=0）→ 注油提罩（dy=−34）→ 点灯第三下落罩（dy→0）。
     · 阈值同页：擦净判据 sm≤0.02／单帧擦除 0.05／命中半径 r+11；
       注速 3.2px/s（帧增量封顶 0.1s，切后台不会一次灌满）、油位下限盂沿上 8px；
       注油松手判定 >131 浅（重试）／≥124 七分／≥118 满／<118 溢（都过，零惩罚）；
       点灯芯口命中半径 22、油浅焰灭 620/1060/1400ms、落罩补间 320ms、提罩 350ms。
     · 与校准页同款「骨架一次画好 + patchLamp 逐帧补」：罩的升降走 JS 补间
       （CSS transition 在 SVG <g> 上不生效），抹布/油壶/焰逐帧改节点不重绘骨架。
     ============================================================ */
  var LP = {
    rimY: 118, botY: 138, mark7: 124,     /* 盂沿 / 内底 / 七分线 */
    pxPerFen: 2,                          /* 1 分 = 2px：盂深 20px = 10 分，七分线正好 7 分 */
    lift: 34,                             /* 罩提起高度 */
    rate: 3.2,                            /* 注速 px/s（空→溢约 6.2s，目标带 7px ≈ 2.2s 容错窗） */
    shade: 'M110 64 h80 l-8 76 h-64 Z',
    bowlOut: 'M124 118 h52 l-5 15 q-21 6 -42 0 Z',
    bowlIn: 'M128 119 h44 l-4 13 q-18 5 -36 0 Z'
  };
  /* 擦罩拍：五处煤垢（与校准页 SECTIONS.lamp 第一拍同一份坐标） */
  var LAMP_SM = [{ x: 124, y: 86, r: 9 }, { x: 150, y: 80, r: 10 }, { x: 176, y: 90, r: 8 },
                 { x: 134, y: 112, r: 9 }, { x: 170, y: 114, r: 8 }];
  function lampFen(y) { return Math.max(0, Math.min(10, (LP.botY - y) / LP.pxPerFen)); }
  function lampBand(y) { return y >= LP.mark7 && y <= 131; }        /* 3.5–7 分：目标带 */

  var LAMP_DEFS = '<defs>' +
    '<linearGradient id="glsG" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#FFFFFF" stop-opacity=".82"/>' +
      '<stop offset=".26" stop-color="#F0F6F1" stop-opacity=".46"/>' +
      '<stop offset=".72" stop-color="#DBE7E1" stop-opacity=".36"/>' +
      '<stop offset="1" stop-color="#FFFFFF" stop-opacity=".7"/>' +
    '</linearGradient>' +
    '<linearGradient id="sootG" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#5A4630" stop-opacity=".26"/>' +
      '<stop offset=".42" stop-color="#5A4630" stop-opacity=".09"/>' +
      '<stop offset="1" stop-color="#5A4630" stop-opacity=".04"/>' +
    '</linearGradient>' +
    '<filter id="smSoft" x="-90%" y="-90%" width="280%" height="280%">' +
      '<feGaussianBlur stdDeviation="1.1"/>' +
    '</filter>' +
  '</defs>';
  /* 底座：玻璃直接坐在一个矮铜脚上；顶/底铜箍收口 */
  var LAMP_BASE = '<path d="M117 138 h66 l-3 11 h-60 Z" fill="#CBB68C" stroke="#8A6E33" stroke-width="1.1"/>' +
    '<ellipse cx="150" cy="149" rx="31" ry="4.6" fill="#C3AB7E" stroke="#8A6E33" stroke-width="1"/>' +
    '<ellipse cx="150" cy="148.6" rx="20" ry="2.8" fill="#AE9468" opacity=".7"/>';
  var LAMP_RIMS = '<ellipse cx="150" cy="64" rx="40" ry="5.4" fill="#CBB68C" stroke="#8A6E33" stroke-width="1.2"/>' +
    '<ellipse cx="150" cy="64.8" rx="33" ry="3.2" fill="#7E6A4A" opacity=".42"/>' +
    '<path d="M120 138 h60 v3 h-60 Z" fill="#C3AB7E" opacity=".85"/>';

  function lampBenchHTML() {
    return '<ellipse cx="150" cy="150" rx="52" ry="7.4" fill="#7C6A4E" opacity=".1"/>';
  }
  /* 溢出来的油：必须画在灯之后（早先夹在案面影里被碗和底座压住，等于没画） */
  function lampSpillHTML() {
    return '<g id="spill" opacity="0">' +
      '<path d="M176 136 q11 5 7 11 q7 3 3 7 l-17 1 q-4 -6 2 -10 q-5 -5 5 -9 Z" fill="#C98F35" opacity=".62"/>' +
      '<ellipse cx="182" cy="152" rx="13" ry="3.2" fill="#C98F35" opacity=".55"/>' +
      '<ellipse cx="180" cy="151.2" rx="7" ry="1.6" fill="#E7B45C" opacity=".6"/>' +
    '</g>';
  }
  /* 油盂（灯盏）：油只在这里。oilY=null 表示空盂（液面贴底） */
  function lampBowlHTML(oilY) {
    var y = (oilY == null) ? LP.botY : oilY;
    var top = Math.min(y, LP.botY + 2);
    var h = Math.max(0, LP.botY + 2 - top);
    return '<defs><clipPath id="bowlClip"><path d="' + LP.bowlIn + '"/></clipPath></defs>' +
      '<path d="' + LP.bowlOut + '" fill="#C9A86A" stroke="#8A6E33" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="' + LP.bowlIn + '" fill="#6B5836"/>' +
      '<g clip-path="url(#bowlClip)">' +
        '<rect id="oilrect" x="120" y="' + top.toFixed(1) + '" width="60" height="' + h.toFixed(1) + '" fill="#D9A24A" opacity=".82"/>' +
        '<rect id="oilsurf" x="120" y="' + (top - .7).toFixed(1) + '" width="60" height="1.4" fill="#F2C97E" opacity="' + (h > 0 ? '.85' : '0') + '"/>' +
      '</g>' +
      '<path d="M129 ' + LP.mark7 + ' h42" stroke="#F0C070" stroke-width="1.2" opacity=".5" stroke-dasharray="5 3"/>' +
      '<ellipse cx="150" cy="' + LP.rimY + '" rx="26" ry="4" fill="none" stroke="#8A6E33" stroke-width="1.2"/>';
  }
  function lampWickHTML() {
    return '<rect x="145" y="112" width="10" height="7" rx="1.4" fill="#9A8459" stroke="#7E6A4A" stroke-width=".8"/>' +
      '<path d="M150 134 v-20" stroke="#3E3226" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M150 116 q1.6 -2 3.2 0" fill="none" stroke="#5E4E3A" stroke-width="1.4"/>';
  }
  /* 玻璃罩：可提可落。dy=0 戴着，dy=−34 提起 */
  function lampShadeHTML(dy, o) {
    o = o || {};
    return '<g id="shade" transform="translate(0,' + (dy || 0) + ')">' +
      '<path d="' + LP.shade + '" fill="url(#glsG)" stroke="#7E9A92" stroke-width="1.6"/>' +
      '<path id="soot" d="' + LP.shade + '" fill="url(#sootG)" opacity="' + (o.soot == null ? .9 : o.soot) + '"/>' +
      LAMP_RIMS +
      '<path d="M117 76 c-2 22 -2 42 0 58" stroke="#FFFFFF" stroke-width="4" opacity=".5" fill="none" stroke-linecap="round"/>' +
      '<path d="M183 80 c1 18 1 34 0 50" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".26" stroke-linecap="round"/>' +
      (o.inner || '') +
    '</g>';
  }
  /* 焰：0 / 0.55 / 1。焰根压在芯口 y=112 上 */
  function lampFlameHTML(k) {
    if (k <= 0.02) { return ''; }
    return '<g id="flame" transform="translate(150,112) scale(' + k.toFixed(2) + ')">' +
      '<path d="M0 1 C-7 -5 -5 -14 0 -21 C5 -14 7 -5 0 1 Z" fill="#F0A63C" opacity=".95"/>' +
      '<path d="M0 0 C-3.4 -4 -2.4 -10 0 -14 C2.4 -10 3.4 -4 0 0 Z" fill="#FFEFBF" opacity=".95"/>' +
      '<ellipse cx="0" cy="-4" rx="7" ry="9" fill="#F7C560" opacity=".22"/>' +
    '</g>';
  }
  /* 右侧刻线柱：量程＝盂深（不是罩高），三条刻线 0 / 七分 / 溢 */
  function lampGaugeHTML(oilY) {
    var y = (oilY == null) ? LP.botY : oilY;
    var top = Math.min(y, LP.botY);
    var h = Math.max(0, LP.botY - top);
    return '<rect x="248" y="' + LP.rimY + '" width="9" height="' + (LP.botY - LP.rimY) + '" rx="4" fill="#EFE7D4" stroke="#C9B48A" stroke-width="1"/>' +
      '<rect x="249" y="' + LP.mark7 + '" width="7" height="' + (131 - LP.mark7) + '" fill="#8FB5B0" opacity=".45"/>' +
      '<rect id="gauge" x="250" y="' + (LP.botY - h).toFixed(1) + '" width="5" height="' + h.toFixed(1) + '" rx="2.5" fill="#D9A24A"/>' +
      '<path d="M243 ' + LP.rimY + ' h5 M243 ' + LP.mark7 + ' h5 M243 ' + LP.botY + ' h5" stroke="#8A7B5E" stroke-width="1.1" opacity=".8"/>' +
      '<text class="gtxt" x="261" y="' + (LP.mark7 + 3.2) + '" font-size="6.6" fill="#527E79">七分</text>' +
      '<text class="gtxt" x="241" y="' + (LP.rimY - .6) + '" font-size="6.6" text-anchor="end" fill="#B06A3A">溢</text>';
  }
  function lampReadText(y) {
    var f = lampFen(y);
    return f > 7.02 ? ('油 ' + f.toFixed(1) + ' 分') : ('油 ' + f.toFixed(1) + ' / 7 分');
  }
  function lampReadHTML(oilY) {
    var y = (oilY == null) ? LP.botY : oilY;
    return '<text id="oillbl" class="gtxt" x="252" y="' + (LP.rimY - 14) + '" font-size="8.4" text-anchor="middle" fill="#7A5B1E">' + lampReadText(y) + '</text>' +
      '<text class="gtxt" x="252" y="' + (LP.rimY - 6) + '" font-size="6.4" text-anchor="middle" fill="#8A7B5E">盂内油位</text>';
  }

  /* ---------- 第一拍 · 擦罩（带罩，dy=0） ---------- */
  function lampScrubHTML(sm) {
    var sms = '', si, m;
    for (si = 0; si < sm.length; si++) {
      m = sm[si];
      sms += '<g id="smg' + si + '" filter="url(#smSoft)">' +
               '<ellipse cx="' + m.x + '" cy="' + m.y + '" rx="' + (m.r * 1.15).toFixed(1) + '" ry="' + (m.r * 0.62).toFixed(1) + '" fill="#54422C" opacity=".34"/>' +
               '<ellipse cx="' + (m.x + m.r * 0.5).toFixed(1) + '" cy="' + (m.y + m.r * 0.55).toFixed(1) + '" rx="' + (m.r * 0.62).toFixed(1) + '" ry="' + (m.r * 0.30).toFixed(1) + '" fill="#3E2F1E" opacity=".26"/>' +
               '<ellipse cx="' + (m.x - m.r * 0.5).toFixed(1) + '" cy="' + (m.y - m.r * 0.3).toFixed(1) + '" rx="' + (m.r * 0.5).toFixed(1) + '" ry="' + (m.r * 0.26).toFixed(1) + '" fill="#6E5A44" opacity=".18"/>' +
               '<circle cx="' + (m.x - m.r * 0.9).toFixed(1) + '" cy="' + (m.y + m.r * 0.7).toFixed(1) + '" r="' + (m.r * 0.16).toFixed(1) + '" fill="#4E3E29" opacity=".3"/>' +
               '<circle cx="' + (m.x + m.r * 0.95).toFixed(1) + '" cy="' + (m.y - m.r * 0.5).toFixed(1) + '" r="' + (m.r * 0.12).toFixed(1) + '" fill="#4E3E29" opacity=".24"/>' +
             '</g>' +
             '<g id="gl' + si + '" opacity="0">' +
               '<path d="M' + (m.x - m.r * 0.8).toFixed(1) + ' ' + (m.y + 1).toFixed(1) +
               ' q' + (m.r * 0.8).toFixed(1) + ' -5 ' + (m.r * 1.6).toFixed(1) + ' 0" fill="none" stroke="#FFFDF6" stroke-width="2.6" opacity=".85" stroke-linecap="round"/>' +
             '</g>';
    }
    return LAMP_DEFS + lampBenchHTML() + LAMP_BASE + lampBowlHTML(null) + lampWickHTML() +
      lampShadeHTML(0, { inner: sms + '<g id="wipetrail"></g>' }) + lampSpillHTML() +
      '<g id="tool" opacity="0"><path d="M134 88 h32 l-3 25 h-26 Z" fill="#E8E0CE" stroke="#B9A67C" stroke-width="1.2"/>' +
      '<path d="M137 96 q7 4 13 0 M137 104 q7 4 13 0" fill="none" stroke="#CBBE9C" stroke-width="1"/>' +
      '<path d="M134 88 h32" stroke="#FFFDF6" stroke-width="1.4"/></g>';
  }

  /* ---------- 第二拍 · 注油（提罩，油在盂里） ---------- */
  function lampOilHTML(oilY, dy) {
    return LAMP_DEFS + lampBenchHTML() + LAMP_BASE +
      lampBowlHTML(oilY) + lampWickHTML() +
      lampShadeHTML(dy) +
      lampGaugeHTML(oilY) + lampReadHTML(oilY) + lampSpillHTML() +
      '<g id="pot" transform="translate(222,74)">' +
        '<path d="M-13 -8 h17 a8 8 0 0 1 8 8 v8 a8 8 0 0 1 -8 8 h-17 Z" fill="#B99A55" stroke="#8A6E33" stroke-width="1.2"/>' +
        '<path d="M9 6 l-13 6" fill="none" stroke="#8A6E33" stroke-width="2.6"/>' +
        '<ellipse cx="-3" cy="-8" rx="9" ry="3" fill="#D8C48A" stroke="#8A6E33" stroke-width=".9"/>' +
      '</g>' +
      '<path id="stream" d="M196 92 Q182 98 172 106" fill="none" stroke="#D9A24A" stroke-width="2.4" opacity="0" stroke-linecap="round"/>' +
      '<circle id="drop" cx="172" cy="106" r="2" fill="#D9A24A" opacity="0"/>';
  }

  /* ---------- 第三拍 · 点灯（引火 → 起焰 → 落罩） ---------- */
  function lampLightHTML(oilY, dy, sooty) {
    return LAMP_DEFS + lampBenchHTML() + LAMP_BASE +
      lampBowlHTML(oilY) + lampWickHTML() +
      lampShadeHTML(dy, { soot: sooty ? 1 : .9 }) + lampSpillHTML() +
      '<g id="glow" opacity="0"><ellipse cx="150" cy="112" rx="30" ry="26" fill="#F7C560" opacity=".16"/>' +
        '<ellipse cx="150" cy="150" rx="40" ry="8" fill="#F0A63C" opacity=".12"/></g>' +
      '<g id="smokeBox" opacity="0">' +
        '<path d="M150 108 c-3 -6 3 -9 0 -15 c-3 -6 3 -9 0 -15" fill="none" stroke="#9AA6A2" stroke-width="1.4" opacity=".75" stroke-linecap="round"/>' +
        '<path d="M153 109 c-2 -5 2 -8 0 -13" fill="none" stroke="#B4BEB8" stroke-width="1" opacity=".55" stroke-linecap="round"/>' +
      '</g>' +
      '<g id="sparkBox" opacity="0">' +
        '<circle cx="146" cy="107" r="1.5" fill="#F0A63C"/><circle cx="154" cy="104" r="1.1" fill="#E7873A"/>' +
        '<circle cx="149" cy="100" r="1" fill="#F0A63C"/>' +
      '</g>' +
      '<g id="flameBox"></g>' +
      '<g id="tool" opacity="0"><path d="M0 0 l14 -6" stroke="#C9B48A" stroke-width="2.4" stroke-linecap="round"/>' +
        '<circle cx="0" cy="0" r="2.6" fill="#E7873A" opacity=".9"/></g>';
  }

  function playLamp(cv, hooks, cfg, ui) {
    var st = { beat: 0, down: false, tool: null, sm: [1, 1, 1, 1, 1],
      pour: false, oilT0: 0, lightN: 0, flameK: 0, shadeDy: 0, lightDone: false,
      gate: false, _downBeat: -1, dead: false, live: false, lift: null,
      trail: [] };   /* 擦痕：{x,y,t}，0.45s 淡出（#wipetrail 里画） */
    /* 油位跨拍存续：注油定下的那一盂油，点灯要用（数据死在上一拍就穿帮） */
    var RUN = { oilY: LP.botY, spilled: false, sooty: false };

    /* ★定时器自带退台检查：残留 setTimeout 不许把 hooks.done 打进下一段剧情 */
    function after(ms, fn) {
      setTimeout(function () {
        if (st.dead || !cv.svg.isConnected) { st.dead = true; return; }
        fn();
      }, ms);
    }
    /* 罩的升降：JS 补间（CSS transition 在 SVG 组上不生效），由主循环逐帧推 */
    function lampLift(from, to, ms, cb) {
      st.lift = { from: from, to: to, t0: now(), ms: ms, cb: cb || null };
    }

    function cleanN() { var n = 0, i; for (i = 0; i < st.sm.length; i++) { if (st.sm[i] <= 0.02) { n++; } } return n; }
    function oilNow() { return (RUN.oilY == null) ? LP.botY : RUN.oilY; }

    function scene() {
      var s;
      if (st.beat === 0) { s = lampScrubHTML(st.sm); }
      else if (st.beat === 1) { s = lampOilHTML(oilNow(), st.shadeDy || 0); }
      else { s = lampLightHTML(oilNow(), st.shadeDy || 0, RUN.sooty); }
      /* 收尾不画提示条：那块位置留给 DOM 的过渡对话框 */
      if (!st.gate) {
        if (st.beat === 0) {
          s += ui.hud('抹布压到玻璃上来回擦——五处污迹，擦到哪处哪处就透亮',
            cleanN() + '/5 处', cleanN() >= 5 ? 'ok' : null);
        } else if (st.beat === 1) {
          s += ui.hud('按住油壶，注到七分线——右边柱子涨进青区就是刚好，过了盂沿就溢',
            '油 ' + lampFen(oilNow()).toFixed(1) + ' / 7 分', lampBand(oilNow()) ? 'ok' : null);
        } else {
          s += ui.hud('在芯口点三下：一下引火，二下起焰，三下落罩',
            ['待引火', '已引火', '焰起了', '罩已落'][st.lightN || 0], null);
        }
      }
      return s;
    }
    function paint() { if (!st.dead) { cv.html(scene()); draw(); } }

    /* ---------- 逐帧补：骨架不重绘，只改会变的节点 ---------- */
    function patchLamp() {
      var y = oilNow();
      var top = Math.min(y, LP.botY + 2), h = Math.max(0, LP.botY + 2 - top);
      var r = cv.q('#oilrect');
      if (r) { r.setAttribute('y', top.toFixed(1)); r.setAttribute('height', h.toFixed(1)); }
      var sf = cv.q('#oilsurf');
      if (sf) { sf.setAttribute('y', (top - .7).toFixed(1)); sf.setAttribute('opacity', h > 0 ? '.85' : '0'); }
      var gg = cv.q('#gauge');
      if (gg) {
        var t2 = Math.min(y, LP.botY), h2 = Math.max(0, LP.botY - t2);
        gg.setAttribute('y', t2.toFixed(1)); gg.setAttribute('height', h2.toFixed(1));
        gg.setAttribute('fill', (y < LP.rimY) ? '#B06A3A' : (lampBand(y) ? '#5E8C86' : (y > 131 ? '#C9A97A' : '#D9A24A')));
      }
      var lb = cv.q('#oillbl');
      if (lb) {
        lb.textContent = lampReadText(y);
        lb.setAttribute('fill', (y < LP.rimY) ? '#B06A3A' : (lampBand(y) ? '#3F6B58' : '#7A5B1E'));
      }
      var sp = cv.q('#spill');
      if (sp) { sp.setAttribute('opacity', (RUN.spilled || y < LP.rimY) ? '1' : '0'); }
      var sd = cv.q('#shade');
      if (sd) { sd.setAttribute('transform', 'translate(0,' + (st.shadeDy || 0) + ')'); }
      var fb = cv.q('#flameBox');
      if (fb) { fb.innerHTML = lampFlameHTML(st.flameK || 0); }
      var smk = cv.q('#smokeBox');
      if (smk) { smk.setAttribute('opacity', (st.lightN || 0) >= 2 ? '.4' : ((st.lightN || 0) >= 1 ? '1' : '0')); }
      var spk = cv.q('#sparkBox');
      if (spk) { spk.setAttribute('opacity', (st.lightN || 0) === 1 ? '1' : '0'); }
      var gl = cv.q('#glow');
      if (gl) { gl.setAttribute('opacity', (st.lightN || 0) >= 3 ? '1' : '0'); }
      var pot = cv.q('#pot');
      if (pot) { pot.setAttribute('transform', 'translate(222,74) rotate(' + (st.pour ? -24 : 0) + ')'); }
      var stm = cv.q('#stream');
      if (stm) { stm.setAttribute('opacity', st.pour ? '.9' : '0'); }
      var dr = cv.q('#drop');
      if (dr) { dr.setAttribute('opacity', st.pour ? '.85' : '0'); }
      var tl = cv.q('#tool');
      if (tl && st.beat === 2) {
        tl.setAttribute('opacity', (st.lightN || 0) < 2 && st.tool ? '1' : '0');
        if (st.tool) { tl.setAttribute('transform', 'translate(' + st.tool.x.toFixed(1) + ',' + st.tool.y.toFixed(1) + ')'); }
      }
    }
    /* 擦罩：抹布跟手，扫过哪处哪处成组变淡；擦净的补一道反光，整罩煤垢跟着变透 */
    function drawScrub() {
      var rq = cv.q('#tool');
      if (rq) {
        rq.setAttribute('opacity', st.tool ? '1' : '0');
        if (st.tool) { rq.setAttribute('transform', 'translate(' + (st.tool.x - 150).toFixed(1) + ',' + (st.tool.y - 100).toFixed(1) + ')'); }
      }
      if (st.down && st.tool) {
        var i, sum = 0;
        for (i = 0; i < LAMP_SM.length; i++) {
          if (st.sm[i] <= 0) { continue; }
          if (dist(st.tool, LAMP_SM[i]) < LAMP_SM[i].r + 11) {
            /* 单帧擦除量 0.05 → 0.09：手机上按住一抹只走 1~2 帧，太细的步进看着"没反应" */
            var was = st.sm[i];
            st.sm[i] = Math.max(0, st.sm[i] - 0.09);
            if (was > 0 && st.sm[i] <= 0) { sfx('brush'); }
            /* 擦痕：记下这一下的位置，画出"抹布刚抹过"的一道亮痕（0.45s 淡出） */
            st.trail.push({ x: st.tool.x, y: st.tool.y, t: now() });
            if (st.trail.length > 10) { st.trail.shift(); }
          }
        }
        for (i = 0; i < LAMP_SM.length; i++) { sum += st.sm[i]; }
        if (st._smN !== Math.round(sum * 100)) {
          st._smN = Math.round(sum * 100);
          for (i = 0; i < LAMP_SM.length; i++) {
            var ge = cv.q('#smg' + i);
            if (ge) { ge.setAttribute('opacity', st.sm[i].toFixed(2)); }
            var gl2 = cv.q('#gl' + i);
            if (gl2) { gl2.setAttribute('opacity', st.sm[i] <= 0 ? '1' : '0'); }
          }
          var so = cv.q('#soot');
          if (so) { so.setAttribute('opacity', (0.92 * (sum / LAMP_SM.length)).toFixed(3)); }
          var hc = cv.q('#hudc');
          if (hc) { hc.textContent = label(); }
          hooks.step(progress(), label());
          /* 分次完成、擦净即过（同校准页 checkDone→judgeSweep：只按"还剩几处脏"判） */
          if (cleanN() >= LAMP_SM.length) { hooks.done(false); }
        }
      }
      /* 擦痕层：最近 0.45s 抹过的地方留一道浅亮弧，读起来就是"灰被抹走了" */
      var tr = st.trail || (st.trail = []);
      var tnow = now();
      var s2 = '';
      for (var q = 0; q < tr.length; q++) {
        var age = (tnow - tr[q].t) / 450;
        if (age >= 1) { continue; }
        s2 += '<ellipse cx="' + n1(tr[q].x) + '" cy="' + n1(tr[q].y) + '" rx="13" ry="6" ' +
              'fill="none" stroke="#FFFDF6" stroke-width="2.4" opacity="' + n1(0.45 * (1 - age)) + '"/>';
      }
      var tl2 = cv.q('#wipetrail');
      if (tl2) { tl2.innerHTML = s2; }
    }
    function draw() {
      if (st.dead) { return; }
      if (st.beat === 0) { drawScrub(); return; }
      patchLamp();
      if (st.beat === 1) {
        var hc1 = cv.q('#hudc');
        if (hc1) { hc1.textContent = label(); }
      }
    }

    function progress() {
      if (st.beat === 0) { return cleanN() / LAMP_SM.length; }
      if (st.beat === 1) { return clamp((LP.botY - oilNow()) / (LP.botY - LP.mark7), 0, 1); }
      return Math.min(1, (st.lightN || 0) / 3);
    }
    function label() {
      if (st.beat === 0) { return '已净 ' + cleanN() + ' / ' + LAMP_SM.length + ' 处'; }
      if (st.beat === 1) { return '油 ' + lampFen(oilNow()).toFixed(1) + ' / 7 分'; }
      return ['待引火', '已引火', '焰起了', '罩已落'][st.lightN || 0];
    }

    /* 注油松手判定（阈值与校准页 judgeOil 逐条一致） */
    function judgeOil() {
      var y = oilNow();
      if (y > 131) { hooks.tip('油浅了——芯吸不上，火立不住。再按住补一点。'); return; }
      RUN.spilled = RUN.spilled || y < LP.rimY;
      hooks.done(false);      /* 七分＝正好；满一点／溢了同样过（校准页判 good，零惩罚） */
    }

    /* 点灯三下：引火 → 起焰 → 落罩。三下各出一件新事，不再是一个火苗放大三次 */
    function lampTap(p) {
      if (st.gate) { return; }
      var n = st.lightN || 0;
      if (n === 0) {
        if (dist(p, { x: 150, y: 112 }) > 22) { hooks.tip('火要凑到芯口——点在芯上。'); return; }
        st.lightN = 1; st.tool = p; sfx('tap'); paint(); return;
      }
      if (n === 1) {
        st.lightN = 2; st.tool = p; st.flameK = .55; paint(); sfx('bead');
        if (oilNow() > 131) {
          /* 油浅：焰起两下自己灭（看得见的后果），零惩罚、不锁死 —— 第三下照样能落罩。
           * ★只在 lightN===2（等着第三下）时演熄灭：第三下已落就不再回头改焰，
           *   否则残留定时器会把落罩后的成品焰改小（校准页拍子即走没暴露这一层） */
          after(620, function () { if (st.dead || st.gate || (st.lightN || 0) !== 2) { return; } st.flameK = 0; draw(); hooks.tip('油浅了，芯吸不上——火立不住。'); });
          after(1060, function () { if (st.dead || st.gate || (st.lightN || 0) !== 2) { return; } st.flameK = .45; draw(); });
          after(1400, function () { if (st.dead || st.gate || (st.lightN || 0) !== 2) { return; } st.flameK = 0; draw(); });
        }
        return;
      }
      if (n === 2) {
        st.lightN = 3;
        st.flameK = (oilNow() > 131) ? .6 : 1;
        RUN.sooty = (oilNow() < LP.mark7);     /* 油满/溢 → 罩内积一层烟（接第一拍擦掉的那层） */
        sfx('select');
        /* ★先看罩落回去，再交棒：判定一落本拍就结束，动画会被腰斩 */
        lampLift(st.shadeDy || 0, 0, 320, function () { st.lightDone = true; finishLight(); });
      }
    }
    function finishLight() {
      if (st.gate) { return; }
      st.gate = true; paint(); hooks.step(1, '罩已落');
      if (ui && ui.sheet) {
        ui.sheet({ title: (cfg && cfg.steps && cfg.steps[2] && cfg.steps[2].done) || '火苗稳了。',
                   body: (cfg && cfg.done) || '灯亮了。', go: '收灯' },
          function () { st.gate = false; hooks.done(false); });
      } else { hooks.done(false); }
    }

    function down(p) {
      if (st.gate) { return; }                       /* 收尾态：交给过渡对话框 */
      guardDown(st, st.beat);
      st.down = true;
      if (st.beat === 0) { st.tool = p; }
      else if (st.beat === 1) { st.pour = true; st.oilT0 = now(); st.tool = p; }  /* 按住即注，不看手指在哪 */
      else { lampTap(p); }
    }
    function move(p) {
      /* ★拍已换、手势还没抬手：这一串 move 属于上一拍，直接丢掉 */
      if (st._downBeat !== st.beat) { return; }
      if (st.beat === 0) { if (st.down) { st.tool = p; } }
      else if (st.beat === 1) { /* 注油不看位置 */ }
      else { if (st.down) { st.tool = p; } }
    }
    function up() {
      if (!guardUp(st, st.beat)) { return; }
      st.down = false;
      if (st.beat === 1) { st.pour = false; judgeOil(); }
      /* 擦罩分次完成、抬手不清零；点灯三下各自成事 —— 都不在抬手时判 */
    }

    /* 主循环：单 rAF + 140ms 保险丝（无头/后台吞帧时手动推，画面仍走完） */
    var raf = 0, fuse = 0;
    function schedule() {
      raf = requestAnimationFrame(tick);
      if (fuse) { clearTimeout(fuse); }
      fuse = setTimeout(function () {
        fuse = 0;
        if (!raf) { return; }
        cancelAnimationFrame(raf); raf = 0;
        tick();
      }, 140);
    }
    function tick() {
      raf = 0;
      if (fuse) { clearTimeout(fuse); fuse = 0; }
      if (!st.live || st.dead) { return; }
      if (!cv.svg.isConnected) { st.dead = true; return; }
      if (st.lift) {
        var k = clamp((now() - st.lift.t0) / st.lift.ms, 0, 1);
        st.shadeDy = st.lift.from + (st.lift.to - st.lift.from) * (1 - Math.pow(1 - k, 3));
        var cb = null;
        if (k >= 1) { cb = st.lift.cb; st.lift = null; }
        draw();
        if (cb) { cb(); }
      } else if (st.beat === 1 && st.pour && !st.gate) {
        /* 油面按时间涨：3.2px/s，帧增量封顶 0.1s —— 切后台回来不会一次灌满 */
        var dt = Math.min(0.1, (now() - (st.oilT0 || now())) / 1000);
        st.oilT0 = now();
        RUN.oilY = Math.max(LP.rimY - 8, oilNow() - LP.rate * dt);
        if (RUN.oilY < LP.rimY - 1) { RUN.spilled = true; }
        draw();
        hooks.step(progress(), label());
      } else {
        draw();
      }
      if (st.live && !st.dead) { schedule(); }
    }

    return {
      beat: function (i) {
        st.beat = i; st.down = false; st.tool = null; st.gate = false;
        st._downBeat = -1; st.lightDone = false; st.lightN = 0; st.flameK = 0; st.lift = null;
        if (i === 0) { st.sm = [1, 1, 1, 1, 1]; st.shadeDy = 0; }
        else if (i === 1) {
          /* 罩戴着进拍，30ms 后提起来 —— 三拍是同一次使用 */
          RUN.oilY = LP.botY; RUN.spilled = false; RUN.sooty = false;
          st.shadeDy = 0; st.pour = false;
          paint();
          after(30, function () { lampLift(0, -LP.lift, 350); });
          hooks.step(progress(), label());
          return;
        }
        else { st.shadeDy = -LP.lift; }
        paint(); hooks.step(progress(), label());
      },
      down: down, move: move, up: up,
      start: function () { st.live = true; if (!raf && !fuse) { schedule(); } },
      stop: function () {
        st.live = false; st.dead = true;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (fuse) { clearTimeout(fuse); fuse = 0; }
      },
      progress: progress, label: label,
      state: function () {
        return { beat: st.beat, sm: st.sm.slice(), clean: cleanN(),
                 oilFen: +(lampFen(oilNow()).toFixed(2)), spilled: RUN.spilled, sooty: RUN.sooty,
                 shadeDy: Math.round(st.shadeDy), lightN: st.lightN || 0, flameK: st.flameK || 0,
                 lightDone: !!st.lightDone, gate: st.gate };
      }
    };
  }

  var MAKERS = { tang: playTang, proof: playProof, touhu: playTouhu,
    shifood: playShiFood, shang: playShang, folk: playFolk, shifolk: playShiFolk, lamp: playLamp };

  var TQM = {};
  TQM.has = function (k) { return !!MAKERS[k]; };
  TQM.play = function (kind, stage, cfg, hooks) {
    var mk = MAKERS[kind];
    if (!mk) { return null; }
    var cv = new Canvas(stage);
    var sheet = makeSheet(stage);
    /* ui.sheet(...) 直接调用，ui.sheet.close() 收掉 —— 两用，免得各小节写法不一样 */
    function uiSheet(o, cb) { sheet.show(o, cb); }
    uiSheet.close = sheet.close;
    var g = mk(cv, hooks, cfg || {}, { sheet: uiSheet, hud: hudBar });
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
        sheet.close();
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
