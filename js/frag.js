/* 天清往事 · 占位资产与回退版组件库（代码绘画 · Chrome 61 基线）
 * 素材 not_run 期间玩家看到的本文件生成的版本；轨①（AI 立绘/场景）与轨③（3D 预渲染帧）
 * 到位后按 manifest 原位替换，布局零改动。
 * 本文件全量代码生成、零外部请求（朱印为 data-URI 真实资产）；
 * ES2017、无 inline script、无 onclick 属性、全 addEventListener。
 */
(function (global) {
  'use strict';

  var TQ = {};

  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.textContent = text; }
    return n;
  }
  TQ.h = h;

  /* ========== 占位资产（轨① / 轨②） ========== */
  TQ.VESSEL = '<svg viewBox="0 0 240 375"><defs><linearGradient id="tqWm" gradientUnits="userSpaceOnUse" x1="0" y1="35" x2="0" y2="372"><stop offset="0" stop-color="#EFF5F3" stop-opacity=".05"/><stop offset=".31" stop-color="#EFF5F3" stop-opacity=".15"/><stop offset=".45" stop-color="#EFF5F3" stop-opacity=".24"/><stop offset=".55" stop-color="#EFF5F3" stop-opacity=".17"/><stop offset=".93" stop-color="#DDE9E5" stop-opacity=".08"/><stop offset="1" stop-color="#DDE9E5" stop-opacity=".03"/></linearGradient></defs><path d="M100 35 L99 145 Q97 153 89 157 L63 163 Q31 175 29 230 L29 263 Q29 315 47 347 Q57 363 77 369 L89 372 L151 372 L163 369 Q183 363 193 347 Q211 315 211 263 L211 230 Q209 175 177 163 L151 157 Q143 153 141 145 L140 35 Z" fill="url(#tqWm)"/></svg>';       /* 纸槌瓶水印（S9 样张正源 path，中轴 x=130） */
  TQ.SEAL = 'data:image/png;base64,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';           /* 朱印「天清节」（真实资产 data-URI） */
  TQ.FRACTURE = '<svg viewBox="0 0 120 110"><polygon points="18,44 34,30 42,20 60,24 78,14 92,26 96,38 82,52 88,74 70,82 58,96 40,88 26,84 20,62" fill="#8FB5B0" stroke="#5E8C8A" stroke-width="2"/></svg>';      /* 瓷片剪影 */
  TQ.BG_CHEN = '<svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice"><rect width="1000" height="420" fill="#24343B"/><path d="M120 284 L500 190 L880 284 L862 293 L138 293 Z" fill="#3D5960"/><rect x="436" y="186" width="128" height="8" rx="2" fill="#243840"/><rect y="293" width="1000" height="127" fill="#E6E0CE" opacity=".8"/><path d="M436 192 C426 191 419 184 419 173 C419 165 425 160 432 162 L438 168 C434 173 435 181 443 186 Z" fill="#243840"/><circle cx="500" cy="150" r="60" fill="#E9C98F" opacity=".18"/></svg>';          /* 广德殿场景（轨① 未到：代码预设背景） */

  /* 立绘剪影（6.5 头身 · 幞头圆领袍 · AI 立绘未到的诚实占位） */
  TQ.SIL = '<svg class="sil" viewBox="0 0 100 120"><circle cx="50" cy="34" r="20" fill="#5E8C8A"/>'
    + '<path d="M14 116 C14 78 86 78 86 116 Z" fill="#5E8C8A"/>'
    + '<rect x="30" y="10" width="40" height="10" rx="5" fill="#5E8C8A"/></svg>';

  /* ========== direct2d 道具（矢量，随进度 p∈[0,1] 变形） ========== */
  var PROPS = {
    /* 汤饼：面团（绕圈揉面 → 表面趋光）+ 碗 */
    dough: function (p) {
      var rough = Math.round(10 - p * 8);
      var g = '<svg viewBox="0 0 200 160" width="86%">'
        + '<defs><radialGradient id="dg" cx=".4" cy=".35" r=".8">'
        + '<stop offset="0" stop-color="#F2E9CF"/><stop offset=".6" stop-color="#E3D3B0"/><stop offset="1" stop-color="#C9B489"/></radialGradient></defs>'
        + '<ellipse cx="100" cy="128" rx="62" ry="12" fill="rgba(31,59,58,.18)"/>'
        + '<path d="M100 30 C140 30 158 62 152 96 C146 124 126 136 100 136 C74 136 54 124 48 96 C42 62 60 30 100 30 Z" fill="url(#dg)"/>';
      for (var i = 0; i < rough; i++) {
        g += '<path d="M' + (58 + i * 9) + ' ' + (52 + (i % 3) * 26) + ' q6 -5 12 0" fill="none" stroke="#B39C6E" stroke-width="1.4" opacity="' + (0.65 - p * 0.6) + '"/>';
      }
      g += '<ellipse cx="82" cy="62" rx="16" ry="10" fill="#FBF6E8" opacity="' + (0.25 + p * 0.45) + '" transform="rotate(-14 82 62)"/>';
      return g + '</svg>';
    },
    bowl: function (p) {
      return '<svg viewBox="0 0 200 160" width="86%">'
        + '<ellipse cx="100" cy="128" rx="66" ry="12" fill="rgba(31,59,58,.18)"/>'
        + '<path d="M34 78 L166 78 Q160 132 100 136 Q40 132 34 78 Z" fill="#DDE9E5" stroke="#5E8C8A" stroke-width="2"/>'
        + '<ellipse cx="100" cy="78" rx="66" ry="14" fill="#EFF5F3" stroke="#5E8C8A" stroke-width="2"/>'
        + '<ellipse cx="100" cy="78" rx="' + (58 - p * 40) + '" ry="' + (12 - p * 8) + '" fill="#AFC7C1" opacity=".8"/>'
        + '<g stroke="#5E8C8A" stroke-width="1.6">'
        + '<path d="M40 96 L' + (56 + p * 30) + ' 118" opacity=".7"/><path d="M160 96 L' + (144 - p * 30) + ' 118" opacity=".7"/></g>'
        + '</svg>';
    },
    roller: function (p) {
      var x = 46 + p * 66;
      return '<svg viewBox="0 0 200 160" width="86%">'
        + '<ellipse cx="100" cy="126" rx="70" ry="10" fill="rgba(31,59,58,.16)"/>'
        + '<rect x="30" y="96" width="140" height="10" rx="5" fill="#E3D3B0" stroke="#B39C6E"/>'
        + '<rect x="30" y="' + (96 + p * 6) + '" width="140" height="' + (10 - p * 6) + '" rx="4" fill="#F2E9CF"/>'
        + '<rect x="' + x + '" y="52" width="18" height="48" rx="9" fill="#A67C52" stroke="#7A5C3E" stroke-width="1.4"/>'
        + '<rect x="' + (x + 6) + '" y="34" width="6" height="20" rx="3" fill="#7A5C3E"/>'
        + '</svg>';
    },
    /* 金觞：倾酒 → 觞体倾斜、酒面下降 */
    cup: function (p) {
      return '<svg viewBox="0 0 200 160" width="72%">'
        + '<g transform="rotate(' + (-8 + p * 34) + ' 100 80)">'
        + '<path d="M62 52 L138 52 L130 108 Q100 122 70 108 Z" fill="#D9B36C" stroke="#8A6B45" stroke-width="2"/>'
        + '<path d="M66 60 L134 60 L128 100 Q100 112 72 100 Z" fill="#E9C98F"/>'
        + '<path d="M66 60 L134 60 L' + (131 - p * 2) + ' ' + (62 + p * 36) + ' L69 ' + (62 + p * 36) + ' Z" fill="#B98F4E" opacity=".9"/>'
        + '<ellipse cx="100" cy="60" rx="34" ry="6" fill="#F2E3C2"/>'
        + '<rect x="60" y="46" width="80" height="7" rx="3" fill="#8A6B45"/></g>'
        + '<path d="M150 ' + (96 + p * 26) + ' q14 ' + (10 + p * 16) + ' 4 ' + (26 + p * 20) + '" fill="none" stroke="#B98F4E" stroke-width="' + (2 + p * 3) + '" stroke-linecap="round" opacity="' + (0.25 + p * 0.6) + '"/>'
        + '</svg>';
    },
    /* 旧灯：拨火 → 焰苗随亮度变化 */
    lamp: function (p) {
      var fl = 0.4 + p * 0.6;
      return '<svg viewBox="0 0 200 160" width="72%">'
        + '<defs><radialGradient id="lg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F7E3B0" stop-opacity=".9"/><stop offset="1" stop-color="#F7E3B0" stop-opacity="0"/></radialGradient></defs>'
        + '<circle cx="100" cy="66" r="56" fill="url(#lg)" opacity="' + fl + '"/>'
        + '<path d="M100 22 C112 40 108 56 100 66 C92 56 88 40 100 22 Z" fill="#E9C98F" opacity="' + fl + '"/>'
        + '<path d="M78 96 L122 96 L114 128 L86 128 Z" fill="#3D5960" stroke="#22383C" stroke-width="1.6"/>'
        + '<rect x="88" y="128" width="24" height="10" fill="#22383C"/>'
        + '<rect x="94" y="70" width="12" height="26" fill="#5F7A77"/>'
        + '</svg>';
    },
    /* 承露囊：收口/装填 → 囊体渐满 */
    pouch: function (p) {
      return '<svg viewBox="0 0 200 160" width="72%">'
        + '<path d="M76 44 L124 44 L134 118 Q100 134 66 118 Z" fill="#DDE9E5" stroke="#5E8C8A" stroke-width="2"/>'
        + '<path d="M78 ' + (50 + p * 24) + ' L122 ' + (50 + p * 24) + ' L131 116 Q100 130 69 116 Z" fill="#AFC7C1" opacity=".85"/>'
        + '<path d="M76 44 Q100 60 124 44" fill="none" stroke="#B96A62" stroke-width="2.4"/>'
        + '<circle cx="100" cy="40" r="5" fill="#B96A62"/>'
        + '<path d="M100 34 q-10 -12 -18 -4 M100 34 q10 -12 18 -4" fill="none" stroke="#B96A62" stroke-width="2" stroke-linecap="round"/>'
        + '</svg>';
    },
    /* 瓷片：拖转 → 碎片随角度剪影变化（12 帧映射降为旋转角） */
    shard: function (p) {
      var a = p * 30;
      return '<svg viewBox="0 0 200 160" width="72%">'
        + '<g transform="rotate(' + (-15 + a) + ' 100 84)">'
        + '<polygon points="58,52 78,34 104,40 128,28 148,44 140,74 118,88 92,84 66,74" fill="#AFC7C1" stroke="#5E8C8A" stroke-width="2"/>'
        + '<polygon points="78,34 104,40 100,58 80,52" fill="#EFF5F3" opacity=".85"/>'
        + '<path d="M66 74 L92 84 L118 88" fill="none" stroke="#77948F" stroke-width="1.6"/>'
        + '</g>'
        + '<ellipse cx="100" cy="126" rx="46" ry="9" fill="rgba(31,59,58,.16)"/>'
        + '</svg>';
    },
    /* 纸槌瓶：转台 → 瓶身随角度的椭圆收张 */
    bottle: function (p) {
      var w = 30 + Math.abs(Math.cos(p * Math.PI * 2)) * 46;
      return '<svg viewBox="0 0 200 160" width="60%">'
        + '<ellipse cx="100" cy="132" rx="42" ry="9" fill="rgba(31,59,58,.18)"/>'
        + '<path d="M' + (100 - w * 0.22) + ' 34 L' + (100 + w * 0.22) + ' 34 L' + (100 + w * 0.3) + ' 62 Q' + (100 + w * 0.5) + ' 74 ' + (100 + w * 0.46) + ' 108 Q' + (100 + w * 0.4) + ' 130 100 130 Q' + (100 - w * 0.4) + ' 130 ' + (100 - w * 0.46) + ' 108 Q' + (100 - w * 0.5) + ' 74 ' + (100 - w * 0.3) + ' 62 Z" fill="#AFC7C1" stroke="#5E8C8A" stroke-width="2"/>'
        + '<ellipse cx="100" cy="36" rx="' + (w * 0.22) + '" ry="4" fill="#77948F"/>'
        + '<ellipse cx="' + (100 - w * 0.16) + ' cy="88" rx="' + (w * 0.12) + '" ry="26" fill="#EFF5F3" opacity=".4"/>'
        + '</svg>';
    },
    /* 投壶：壶（双耳尊形） */
    pot: function (p) {
      return '<svg viewBox="0 0 200 160" width="60%">'
        + '<ellipse cx="100" cy="136" rx="40" ry="8" fill="rgba(31,59,58,.18)"/>'
        + '<rect x="86" y="30" width="28" height="16" rx="4" fill="#5E8C8A"/>'
        + '<path d="M74 46 L126 46 Q136 76 128 104 Q100 122 72 104 Q64 76 74 46 Z" fill="#8FB5B0" stroke="#5E8C8A" stroke-width="2"/>'
        + '<ellipse cx="100" cy="46" rx="26" ry="7" fill="#22383C"/>'
        + '<ellipse cx="100" cy="46" rx="' + (18 + p * 8) + '" ry="' + (4 + p * 2) + '" fill="none" stroke="#D9B36C" stroke-width="2" opacity="' + (0.4 + p * 0.6) + '"/>'
        + '<path d="M74 60 q-16 12 -2 26 M126 60 q16 12 2 26" fill="none" stroke="#5E8C8A" stroke-width="3" stroke-linecap="round"/>'
        + '</svg>';
    },
    arrow: function (p) {
      return '<svg viewBox="0 0 200 160" width="52%">'
        + '<g transform="rotate(' + (-20 + p * 40) + ' 100 84)">'
        + '<rect x="96" y="40" width="8" height="76" rx="4" fill="#A67C52"/>'
        + '<path d="M100 26 L112 46 L88 46 Z" fill="#5E8C8A"/>'
        + '<path d="M88 108 L100 122 L112 108 Z" fill="#DDE9E5" stroke="#5E8C8A" stroke-width="1.4"/>'
        + '</g></svg>';
    },
    /* 文房（研墨/蘸笔）：墨环随进度蔓延 */
    ink: function (p) {
      return '<svg viewBox="0 0 200 160" width="72%">'
        + '<circle cx="100" cy="96" r="46" fill="#2E4240"/>'
        + '<circle cx="100" cy="96" r="46" fill="none" stroke="#5F7A77" stroke-width="2"/>'
        + '<circle cx="100" cy="96" r="' + (8 + p * 34) + '" fill="#1F3B3A" opacity=".9"/>'
        + '<circle cx="100" cy="96" r="' + (8 + p * 34) + '" fill="none" stroke="#AFC7C1" stroke-width="1" opacity="' + (0.3 + p * 0.5) + '"/>'
        + '</svg>';
    },
    /* 汴桥市井（观俗横拖扫看 · 位移→视口偏移，零新帧） */
    minjie: function (p) {
      var shift = -p * 150;
      var boats = '';
      for (var i = 0; i < 3; i++) {
        var bx = 30 + i * 62;
        boats += '<path d="M' + bx + ' 118 q' + (18 + i * 3) + ' 10 ' + (36 + i * 6) + ' 0 l-' + (30 + i * 5) + ' 0 Z" fill="#22383C"/>'
          + '<path d="M' + (bx + 14) + ' 118 L' + (bx + 14) + ' 100 L' + (bx + 26) + ' 108 L' + (bx + 26) + ' 118 Z" fill="#4A6B72"/>';
      }
      var folks = '';
      for (var k = 0; k < 5; k++) {
        var fx = 24 + k * 38 + (k % 2) * 9, fy = 92 + (k % 3) * 6;
        folks += '<circle cx="' + fx + '" cy="' + (fy - 12) + '" r="5" fill="#1F2E2B"/>'
          + '<path d="M' + (fx - 6) + ' ' + fy + ' q6 -12 12 0 Z" fill="#1F2E2B"/>';
      }
      return '<svg viewBox="0 0 200 160" width="92%">'
        + '<defs><clipPath id="mjc"><rect x="8" y="14" width="184" height="124" rx="6"/></clipPath></defs>'
        + '<rect x="8" y="14" width="184" height="124" rx="6" fill="#24343B"/>'
        + '<g clip-path="url(#mjc)" transform="translate(' + shift + ' 0)">'
        + '<rect x="0" y="104" width="200" height="34" fill="#3D5960"/>'
        + '<path d="M30 104 Q100 70 170 104 L170 108 L30 108 Z" fill="#4A6B72"/>'
        + boats
        + '<rect x="44" y="60" width="26" height="18" fill="#7A5C3E"/><path d="M40 60 L74 60 L70 52 L44 52 Z" fill="#8A6B45"/>'
        + '<rect x="120" y="62" width="30" height="16" fill="#7A5C3E"/><path d="M116 62 L154 62 L150 54 L120 54 Z" fill="#8A6B45"/>'
        + folks
        + '</g>'
        + '<rect x="8" y="14" width="184" height="124" rx="6" fill="none" stroke="#5E8C8A" stroke-width="2"/>'
        + '</svg>';
    },
    /* 残页（校字：界行 + 缺角 + 朱笔圈随进度亮 + 补阙补丁就位） */
    canji: function (p) {
      var rings = '';
      if (p > 0.28) {
        rings += '<circle cx="76" cy="52" r="9" fill="none" stroke="#B5402F" stroke-width="2.4" opacity="' + Math.min(1, (p - 0.28) * 4) + '"/>';
      }
      if (p > 0.6) {
        rings += '<circle cx="122" cy="86" r="9" fill="none" stroke="#B5402F" stroke-width="2.4" opacity="' + Math.min(1, (p - 0.6) * 4) + '"/>'
          + '<circle cx="88" cy="118" r="9" fill="none" stroke="#B5402F" stroke-width="2.4" opacity="' + Math.min(1, (p - 0.6) * 4) + '"/>';
      }
      var patch = p > 0.85
        ? '<rect x="128" y="96" width="26" height="30" rx="2" fill="#E6E0CE" stroke="#B39C6E" stroke-width="1.4" opacity="' + Math.min(1, (p - 0.85) * 6) + '"/>'
        : '';
      return '<svg viewBox="0 0 200 160" width="86%">'
        + '<rect x="46" y="14" width="108" height="132" rx="3" fill="#E6E0CE" stroke="#B39C6E"/>'
        + '<g stroke="#C9BFA4" stroke-width="1">'
        + '<path d="M56 44 L144 44 M56 66 L144 66 M56 88 L144 88 M56 110 L144 110 M56 132 L144 132"/></g>'
        + '<path d="M154 14 L154 34 L134 14 Z" fill="#F2EFE6"/>'
        + '<g fill="#8C8272" font-size="9">'
        + '<text x="62" y="41">顯</text><text x="62" y="63">德</text><text x="62" y="85">五</text><text x="62" y="107">年</text><text x="62" y="129">五</text>'
        + '<text x="80" y="41">九</text><text x="80" y="63">月</text><text x="80" y="107">天</text>'
        + '<text x="98" y="63">廿</text><text x="116" y="85">四</text><text x="98" y="85">日</text>'
        + '</g>'
        + rings + patch
        + '<path d="M140 12 L118 12 L140 34 Z" fill="none" stroke="#B39C6E" stroke-dasharray="3 3"/>'
        + '</svg>';
    }
  };
  TQ.PROPS = PROPS;

  /* ========== S9 加载页（游戏首屏 · 全构图同心于中轴） ========== */
  TQ.buildLoad = function (onEnter, onCredits) {
    var app = h('div', 'app load');
    var qw = h('div', 'quote-wrap');
    var wm = h('div', 'vessel-wm');
    wm.innerHTML = TQ.VESSEL;
    qw.appendChild(wm);
    var yp = h('div', 'yupi');
    function col(word) {
      var c = h('div', 'col');
      for (var i = 0; i < word.length; i++) { c.appendChild(h('span', '', word[i])); }
      return c;
    }
    yp.appendChild(col('雨过天青云破处'));
    yp.appendChild(col('这般颜色做将来'));
    qw.appendChild(yp);
    app.appendChild(qw);
    app.appendChild(h('div', 'yline'));
    var seal = h('div', 'seal');
    seal.innerHTML = '<img src="' + TQ.SEAL + '" alt="朱印">';
    app.appendChild(seal);
    app.appendChild(h('div', 'snote', '「世传御批」· 语出明·谢肇淛《五杂俎》'));
    var lt = h('div', 'lt');
    lt.appendChild(h('div', 'm', '天清往事'));
    lt.appendChild(h('div', 's', '显德五年 · 九月廿四 · 天清节'));
    var b = h('button', 'btn', '入宫当值');
    b.addEventListener('click', onEnter);
    lt.appendChild(b);
    app.appendChild(lt);
    var cr = h('button', 'credits-btn', '史实出处');
    cr.setAttribute('aria-label', '查看本作史实出处');
    cr.addEventListener('click', onCredits);
    app.appendChild(cr);
    return app;
  };

  /* ========== 时辰条（竖版横卡 / 横版顶栏 inline） ========== */
  TQ.timebar = function (nodes, curIdx) {
    var tb = h('div', 'timebar');
    var line = h('div', 'tb-line');
    line.appendChild(h('div', 'base'));
    line.appendChild(h('div', 'prog'));
    tb.appendChild(line);
    var row = h('div', 'tb-nodes');
    nodes.forEach(function (n, i) {
      var nd = h('div', 'tb-node' + (i === curIdx ? ' cur' : ''));
      nd.appendChild(h('div', 'tb-dot'));
      nd.appendChild(h('div', 'tb-t', n.t));
      if (n.n) { nd.appendChild(h('div', 'tb-n', n.n)); }
      row.appendChild(nd);
    });
    tb.appendChild(row);
    return tb;
  };
  TQ.timebarInline = function (nodes, curIdx) {
    var wrap = h('div', 'timebar-inline');
    nodes.forEach(function (n, i) {
      var s = h('span', i === curIdx ? 'cur' : '', n.t + (n.n ? ' · ' + n.n : ''));
      wrap.appendChild(s);
    });
    return wrap;
  };

  /* ========== VN 对话卡（名牌压框 + 打字机 + 推进指示 · Chrome 61 setInterval） ========== */
  function typeCard(speaker, text, onAdvance, opts) {
    opts = opts || {};
    var box = h('div', 'dlg-box');
    if (speaker) { box.appendChild(h('div', 'name-tab', speaker)); }
    var dt = h('div', 'dtext', '');
    box.appendChild(dt);
    var ind = h('div', 'cont-ind', '▼');
    box.appendChild(ind);
    var timer = 0, n = 0, full = false, advanced = false;
    function finish() {
      if (timer) { clearInterval(timer); timer = 0; }
      dt.textContent = text;
      full = true;
      ind.style.display = 'block';
    }
    function advance() {
      if (advanced) { return; }
      if (!full) { finish(); return; }
      advanced = true;
      onAdvance();
    }
    if (opts.noType) {
      finish();
      ind.style.display = 'none';
    } else {
      ind.style.display = 'none';
      timer = setInterval(function () {
        n += 1;
        dt.textContent = text.slice(0, n);
        if (n >= text.length) { finish(); }
      }, 40); /* 40ms/字（规范 30-50ms） */
    }
    box.addEventListener('click', advance);
    return box;
  }
  TQ.dlgCard = function (speaker, text, onAdvance) { return typeCard(speaker, text, onAdvance, null); };
  TQ.narrCard = function (text, onAdvance) { return typeCard('', text, onAdvance, { noType: true }); };

  /* ========== direct2d 小节引擎（回退版默认操作 · 零惩罚） ==========
   * cfg.steps[i]: { label, gest:'drag'|'sweep'|'tap'|'hold', goal, tip, prop, done }
   * 手势与等价按钮双轨并存；进度只增不清；「应节而动」切应节轨（外部回调）。
   */
  TQ.iv = function (main, cfg, cb, onJie) {
    var wrap = h('div', 'iv');
    var stage = h('div', 'iv-stage');
    var zone = h('div', 'zone-tag', cfg.zone || '第一视角');
    var stepTag = h('div', 'step-tag', '');
    var shadow = h('div', 'cshadow');
    var propBox = h('div', 'prop');
    var gest = h('div', 'gest');
    var target = h('div', 'target', '');
    stage.appendChild(zone); stage.appendChild(stepTag); stage.appendChild(shadow);
    stage.appendChild(propBox); stage.appendChild(target); stage.appendChild(gest);
    wrap.appendChild(stage);

    var stepsRow = h('div', 'iv-steps');
    var bar = h('div', 'iv-bar');
    var fill = h('div', 'fill');
    var bzone = h('div', 'zone');
    bar.appendChild(fill); bar.appendChild(bzone);
    var val = h('div', 'iv-val', '');
    var ctrl = h('div', 'iv-ctrl');
    var minus = h('button', 'iv-mini', '－ 一点');
    var plus = h('button', 'iv-mini', '＋ 一点');
    var sp = h('div', 'sp');
    var jie = h('button', 'iv-mini g', '应节而动');
    ctrl.appendChild(minus); ctrl.appendChild(plus); ctrl.appendChild(sp); ctrl.appendChild(jie);
    var hint = h('div', 'iv-hint', '');
    wrap.appendChild(stepsRow); wrap.appendChild(bar); wrap.appendChild(val); wrap.appendChild(ctrl); wrap.appendChild(hint);
    main.appendChild(wrap);

    var steps = cfg.steps || [];
    var si = 0, pct = 0, over = false, hits = 0;
    function pctClamp() { return Math.max(0, Math.min(100, pct)); }
    function renderProp() {
      var st = steps[si];
      var fn = PROPS[st && st.prop] || PROPS.dough;
      propBox.innerHTML = fn(pctClamp() / 100);
    }
    function renderSteps() {
      stepsRow.innerHTML = '';
      steps.forEach(function (st, i) {
        var d = h('div', 'st' + (i < si ? ' done' : (i === si ? ' cur' : '')), '');
        d.appendChild(h('i'));
        d.appendChild(document.createTextNode(st.label));
        stepsRow.appendChild(d);
      });
    }
    function renderBar() {
      var st0 = steps[si];
      if (st0 && st0.gest === 'toss') {
        bar.style.display = 'none';
      } else {
        bar.style.display = '';
        fill.style.width = pctClamp() + '%';
      }
      var st = steps[si];
      if (st && st.gest === 'drag') {
        bzone.style.left = '0'; bzone.style.width = '100%';
        bzone.style.background = 'rgba(217,179,108,.22)';
        target.style.display = 'flex';
        target.textContent = '拖够 ' + Math.round(st.goal) + ' 下';
      } else if (st && st.gest === 'toss') {
        bzone.style.display = 'none';
        target.style.display = 'flex';
        target.textContent = '拖矢 · 松手投出';
      } else {
        bzone.style.display = 'none';
        target.style.display = 'none';
      }
    }
    function renderTip(t) { val.textContent = t || ''; }
    /* ---- toss（投壶·拉弓式）：拖拽向量 → 投掷角 −25°~45° + 力度；预测虚线 + 命中判定 ---- */
    var tossStart = null;
    function aimBase() {
      gest.innerHTML = '<svg viewBox="0 0 120 90" width="100%">'
        + '<path d="M96 34 L104 30 L100 40 Z" fill="#5E8C8A" opacity=".5"/>'
        + '<polyline id="aimLine" points="96,34 60,20 30,30" fill="none" stroke="#D9B36C" stroke-width="2" stroke-dasharray="5 4"/>'
        + '<polygon id="aimZone" points="" fill="rgba(217,179,108,.18)" stroke="none"/>'
        + '<circle id="aimDot" cx="30" cy="30" r="4" fill="#D9B36C"/></svg>';
    }
    function aimUpdate(dx, dy) {
      var line = gest.querySelector('#aimLine');
      var dot = gest.querySelector('#aimDot');
      if (!line || !dot) { return; }
      var dist = Math.sqrt(dx * dx + dy * dy);
      var cap = Math.min(dist, 150);
      var ux = dist ? dx / dist : 1, uy = dist ? dy / dist : 0;
      var tipX = 96 - ux * cap * 0.8, tipY = 34 - uy * cap * 0.8;
      line.setAttribute('points', '96,34 ' + ((96 + tipX) / 2) + ',' + (Math.min(34, tipY) - 14) + ' ' + tipX + ',' + tipY);
      dot.setAttribute('cx', tipX); dot.setAttribute('cy', tipY);
      var ang = Math.atan2(-dy, dx) * 180 / Math.PI;
      var power = Math.round(Math.min(100, dist / 150 * 100));
      target.style.display = 'flex';
      target.textContent = '角 ' + Math.round(ang) + '° · 力 ' + power;
    }
    function tossClear() {
      tossStart = null;
      var t = target;
      t.style.display = 'none';
    }
    function tossThrow(dx, dy) {
      if (over) { return; }
      var st = steps[si];
      tossClear();
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) { renderTip('矢要脱手——拖一把，再投。'); return; }
      var power = Math.min(100, dist / 150 * 100);
      var angRaw = Math.atan2(-dy, dx) * 180 / Math.PI;
      var hit = power >= 35 && angRaw >= -25 && angRaw <= 45;
      aimBase();
      var line = gest.querySelector('#aimLine');
      var dot = gest.querySelector('#aimDot');
      var cap = Math.min(dist, 150);
      var ux = dx / dist, uy = dy / dist;
      var tipX = 96 - ux * cap * 0.8, tipY = 34 - uy * cap * 0.8;
      if (line) { line.setAttribute('points', '96,34 ' + ((96 + tipX) / 2) + ',' + (Math.min(34, tipY) - 14) + ' ' + tipX + ',' + tipY); line.setAttribute('stroke', hit ? '#5E8C8A' : '#B4B2A9'); }
      if (dot) { dot.setAttribute('fill', hit ? '#5E8C8A' : '#B4B2A9'); }
      if (hit) { renderProp(1); } else { renderProp(0); }
      finishStep(!hit);
    }
    function enterStep() {
      var st = steps[si];
      stepTag.textContent = (si + 1) + ' / ' + steps.length + ' · ' + st.label;
      pct = 0;
      renderSteps(); renderBar(); renderProp();
      hint.innerHTML = '<b>' + st.label + '</b>：' + (st.tip || cfg.hint || '');
      gest.style.cssText = 'position:absolute;right:12%;top:16%;width:34%;height:44%;opacity:.9';
      if (st.gest === 'toss') {
        aimBase();
      } else {
      gest.innerHTML = st.gest === 'drag'
        ? '<svg viewBox="0 0 120 90" width="100%"><path d="M20 45 q30 -30 60 0 q-30 30 -60 0" fill="none" stroke="#5E8C8A" stroke-width="2.5" stroke-dasharray="6 5"/><path d="M84 36 l10 9 -10 9" fill="none" stroke="#5E8C8A" stroke-width="2.5"/></svg>'
        : st.gest === 'sweep'
          ? '<svg viewBox="0 0 120 90" width="100%"><path d="M20 30 L100 30 M100 60 L20 60" stroke="#5E8C8A" stroke-width="2.5" stroke-dasharray="6 5"/><path d="M96 22 l8 8 -8 8 M24 54 l-8 8 8 8" fill="none" stroke="#5E8C8A" stroke-width="2.5"/></svg>'
          : st.gest === 'hold'
            ? '<svg viewBox="0 0 120 90" width="100%"><circle cx="60" cy="45" r="22" fill="none" stroke="#5E8C8A" stroke-width="2.5" stroke-dasharray="6 5"/><circle cx="60" cy="45" r="8" fill="#5E8C8A" opacity=".6"/></svg>'
            : '<svg viewBox="0 0 120 90" width="100%"><circle cx="60" cy="45" r="20" fill="none" stroke="#5E8C8A" stroke-width="2.5" stroke-dasharray="6 5"/><path d="M60 33 l6 12 -6 12 -6 -12 Z" fill="#5E8C8A" opacity=".6"/></svg>';
      }
    }
    function finishStep(missed) {
      var st = steps[si];
      if (!missed) { hits += 1; }
      renderTip(missed ? (cfg.retry || '矢落壶外。拾矢，再投。') : (st.done || '好。下一步。'));
      si += 1;
      if (si >= steps.length) {
        over = true;
        stepTag.textContent = '毕';
        if (cfg.decoName) {
          var t = h('div', 'shard-toast');
          t.appendChild(h('div', 'got', '长卷装饰件入手'));
          t.appendChild(h('div', 'name', cfg.decoName));
          main.appendChild(t);
          main.scrollTop = main.scrollHeight;
        }
        if (cb) { cb(hits); }
        return;
      }
      enterStep();
    }
    function bump(delta, why) {
      if (over) { return; }
      var st = steps[si];
      var goal = st.goal || 100;
      pct = pctClamp() + (delta * 100 / goal);
      renderBar(); renderProp();
      if (pctClamp() >= 100) { finishStep(); } else { renderTip(why || ''); }
    }
    /* ---- 手势绑定（pointer 双端通用；离场即停） ---- */
    var dragging = false, lastX = 0, lastY = 0, sweepDir = 0, holdTimer = 0, holdTick = 0, lastDX = 0, lastDY = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (over) { return; }
      var st = steps[si];
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      if (st.gest === 'tap') { bump(1, '好。再来。'); }
      if (st.gest === 'toss') { tossStart = { x: e.clientX, y: e.clientY }; aimBase(); }
      if (st.gest === 'hold') {
        holdTick = 0;
        holdTimer = setInterval(function () {
          holdTick += 1; bump(100 / ((st.goal || 100) / 12), '稳住——');
        }, 120);
      }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging || over) { return; }
      var st = steps[si];
      if (st.gest === 'toss') {
        if (tossStart) {
          lastDX = e.clientX - tossStart.x; lastDY = e.clientY - tossStart.y;
          aimUpdate(lastDX, lastDY);
        }
        return;
      }
      if (st.gest === 'drag') {
        var dx = Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
        lastX = e.clientX; lastY = e.clientY;
        bump(dx / 6, '有点劲了——');
      } else if (st.gest === 'sweep') {
        var dy = e.clientY - lastY;
        if (sweepDir >= 0 && dy < -8) { bump(1, '好。再擀。'); }
        if (sweepDir <= 0 && dy > 8) { bump(1, '好。再擀。'); }
        sweepDir = dy > 0 ? 1 : -1;
        lastY = e.clientY;
      }
    });
    function endDrag() {
      dragging = false;
      if (holdTimer) { clearInterval(holdTimer); holdTimer = 0; }
      if (tossStart) {
        var st = steps[si];
        if (st && st.gest === 'toss') { tossThrow(lastDX, lastDY); }
        tossClear();
      }
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    /* ---- 等价按钮双轨 ---- */
    minus.addEventListener('click', function () {
      if (over) { return; }
      var st = steps[si];
      if (!st) { return; }
      if (st.gest === 'toss') { renderTip('拾矢，再投。'); return; }
      bump(-20, '松半分，再来。');
    });
    plus.addEventListener('click', function () {
      if (over) { return; }
      var st = steps[si];
      if (!st) { return; }
      if (st.gest === 'toss') { tossThrow(120, -60); return; }
      bump(20, '补一把，无妨。');
    });
    jie.addEventListener('click', function () {
      if (over) { return; }
      if (onJie) { onJie(); }
    });
    enterStep();
    return wrap;
  };

  global.TQF = TQ;
})(window);
