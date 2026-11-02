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

  /* ========== 轨③ sprite 适配器（碎片转台 · 10-24 回退机制实装） ==========
   * shardStage：拾得视图用，12 帧慢速转台（canvas 2D 切 atlas，6fps，离场即停）；
   * shardStill：图鉴格用，静态首帧。
   * ★ 2026-10-28 回退链改为「四段」，末段之前一律**仍有 3D 素材**：
   *   latlong 多向（可自由旋转）→ 12 帧转台（可拖擦洗）→ **内壁静态帧**（含整张画）→ 矢量剪影。
   *   旧链只有三段，末段是矢量剪影 ⇒ 一旦素材缺失玩家就彻底看不到瓷片，
   *   与本项目「回退也要能看到内壁图案」的要求冲突，故补第 3 段。
   * 帧时看门狗：30 帧均值 >33ms 喂给 TQA.watchFeed（同类两连退 → 会话内降 vector）。 */
  function drawAtlasFrame(ctx, ent, img, f, w, hgt) {
    var fx = (f % ent.cols) * ent.fw, fy = Math.floor(f / ent.cols) * ent.fh;
    ctx.clearRect(0, 0, w, hgt);
    ctx.drawImage(img, fx, fy, ent.fw, ent.fh, 0, 0, w, hgt);
  }

  /* ★2026-11-02 真机「瓷片不显示 / 只剩一条边」的第二层原因：
   *   12 帧转台里必然有几帧是**侧看成一条线**的（瓷片是薄片，转到 90° 就是这个样子）。
   *   从第 0 帧开始播，如果第 0 帧恰好是侧视，玩家第一眼看到的就是一条细边，
   *   判定成「图没加载出来 / 素材缺失」——#14 就是这种（实测起始帧不透明面积仅 4%）。
   *   这里在开播前扫一遍图集，把「不透明面积最大」的那一帧作为起始帧：
   *   每帧缩到 24×24 数 alpha，12~36 帧合计几万次像素读，一次性、可忽略。
   *   找不到就退回 0，绝不因为这件事报错。 */
  function bestFrameOf(ent, img) {
    try {
      var N = (typeof ent.frames === 'number') ? ent.frames
        : (ent.frames && ent.frames.length) || (ent.cols * ent.rows) || 12;
      var S = 24;
      var c = document.createElement('canvas');
      c.width = S; c.height = S;
      var g = c.getContext('2d');
      var best = -1, bi = 0;
      for (var i = 0; i < N; i += 1) {
        var fx = (i % ent.cols) * ent.fw, fy = Math.floor(i / ent.cols) * ent.fh;
        g.clearRect(0, 0, S, S);
        g.drawImage(img, fx, fy, ent.fw, ent.fh, 0, 0, S, S);
        var d = g.getImageData(0, 0, S, S).data, on = 0;
        for (var k = 3; k < d.length; k += 4) { if (d[k] > 40) { on += 1; } }
        if (on > best) { best = on; bi = i; }
      }
      return bi;
    } catch (e) { return 0; }
  }

  /* 设备像素比：canvas 的 backing store 必须按 DPR 放大，否则 160px 图集
   * 被 CSS 拉到 200px 再乘 3 倍屏 ⇒ 实测约 4.7× 插值，内壁暗纹糊成一片。
   * 上限 3 是性能与内存的折中（3 倍屏已到收益拐点）。 */
  function dprOf() {
    var d = global.devicePixelRatio || 1;
    return Math.max(1, Math.min(3, d));
  }
  function fitCanvas(cv, ent) {
    var d = dprOf();
    cv.width = Math.round(ent.fw * d);
    cv.height = Math.round(ent.fh * d);
    return d;
  }

  function vecShard(mount, label) {
    mount.innerHTML = '';
    var box = h('div', 'shard-vec');
    box.innerHTML = TQ.FRACTURE;
    if (label !== false) { box.appendChild(h('div', 'prop-badge', '预设图样')); }
    mount.appendChild(box);
  }

  /* 内壁静态帧（回退第 3 段 / 双击细看）：整张画、可缩放平移。
   * 判据：注册表里的 innerRatio = 可见内壁面积 / 内壁总面积（16 片实测 ≥0.864）。 */
  TQ.shardInner = function (mount, id) {
    var key = 'shard-inner-' + id;
    var tqa = global.TQA;
    if (!tqa || !tqa.reg[key]) { vecShard(mount, false); return; }
    tqa.resolve(key, function (stt) {
      if (!mount.isConnected) { return; }
      if (stt !== 'ok') { vecShard(mount, stt === 'fail'); return; }
      var ent = tqa.reg[key], img = tqa.image(key);
      if (!img) { vecShard(mount, false); return; }
      mount.innerHTML = '';
      var cv = h('canvas', 'shard-ll');
      var d = dprOf();
      /* ★2026-11-02 桌面实测「收到瓷片时显示异常（拉成一块怪形状）」：
       *   旧代码按 `mount.clientWidth/clientHeight` 定 backing —— mount 是 .shard-stage，
       *   桌面上它是整列宽的 flex 容器（≈852×236），而 canvas 的**显示尺寸**由 CSS
       *   .shard-ll 固定为 200×200 ⇒ 按 852×236 画、再压进 200×200，纵向被压扁。
       *   改成：先把 canvas 挂进去，按它自己的 CSS 显示尺寸（×DPR）定 backing，
       *   两者同源，任何断点都不会变形。 */
      mount.appendChild(cv);
      /* ★ 清晰度修复（2026-11-02）：旧 backing = img.width*d/2 ≈146px 且固定，
       *   zoom 只是把这块 146px 拉伸到 ~320px 显示 ⇒ 放大永远只有 ~146px 有效像素（糊）。
       *   现 backing 一次开到「显示区尺寸 × dpr」（z=1 满分辨率）。draw() 仍用
       *   cv.width*zoom 作目标矩形 —— dest 超出 backing 即被画布裁切，等价于「放大看局部」，
       *   而源图始终按真实分辨率绘制 ⇒ 任意倍率都见真实像素，不再凭空拉伸。
       *   配合 1024px 高分辨率内壁帧（旧 292px），放大细节提升约 3.5×。 */
      var dispW = cv.clientWidth || 200, dispH = cv.clientHeight || 200;
      cv.width = Math.round(dispW * d);
      cv.height = Math.round(dispH * d);
      cv.style.touchAction = 'none';
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', '瓷片内壁（静态·可缩放）');
      /* ★2026-11-02（玩家反馈）：这里原来挂了一个「内壁 86%」的角标。
       *   那个百分比是**制作侧的验收指标**（可见内壁面积 / 内壁总面积），
       *   对玩家没有任何意义，反而像"这块瓷片有问题"的提示。
       *   「内壁待重绘」的提示已在上游删除，这个角标一并撤掉——
       *   拾得界面里不再出现任何关于素材完成度的文字。 */
      var ctx = cv.getContext('2d');
      if ('imageSmoothingQuality' in ctx) { ctx.imageSmoothingQuality = 'high'; }
      var zoom = 1, panX = 0, panY = 0;
      /* 正方形源按 contain 居中（不拉伸）：以较短边为缩放基准，pan 夹紧到画布内 */
      function scNow() { return Math.min(cv.width, cv.height) * zoom; }
      function clampPan() {
        var w = scNow();
        panX = Math.max(-(cv.width - w) / 2, Math.min((cv.width - w) / 2, panX));
        panY = Math.max(-(cv.height - w) / 2, Math.min((cv.height - w) / 2, panY));
      }
      function draw() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        var w = scNow();
        ctx.drawImage(img, 0, 0, img.width, img.height,
          (cv.width - w) / 2 + panX, (cv.height - w) / 2 + panY, w, w);
      }
      draw();
      /* 拖动平移 + 双指缩放 + 双击切换 1×/2× */
      var pts = {}, lastX = 0, lastY = 0, pinch0 = 0, zoom0 = 1, tapT = 0;
      function nPts() { var k, c = 0; for (k in pts) { if (pts[k]) { c += 1; } } return c; }
      cv.addEventListener('pointerdown', function (e) {
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        lastX = e.clientX; lastY = e.clientY;
        if (nPts() === 2) { pinch0 = pinchDist(); zoom0 = zoom; }
        e.preventDefault();
      });
      function pinchDist() {
        var ids = [], k;
        for (k in pts) { if (pts[k]) { ids.push(pts[k]); } }
        if (ids.length < 2) { return 0; }
        return Math.hypot(ids[0].x - ids[1].x, ids[0].y - ids[1].y);
      }
      cv.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) { return; }
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (nPts() >= 2) {
          var pd = pinchDist();
          if (pinch0 > 4) { zoom = Math.max(1, Math.min(3, zoom0 * pd / pinch0)); clampPan(); draw(); }
          return;
        }
        panX += e.clientX - lastX; panY += e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        clampPan(); draw();
      });
      function up(e) {
        var wasOne = nPts() === 1;
        delete pts[e.pointerId];
        if (wasOne) {
          var now = Date.now();
          if (now - tapT < 320) {
            zoom = zoom > 1.2 ? 1 : 2; panX = 0; panY = 0; draw();
            tapT = 0;
          } else { tapT = now; }
        }
      }
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
    });
  };

  /* ---------- 预设转台（预渲染帧序列，拾得占台与手札近看共用） ----------
   * 为什么用「预设」而不是实时 3D：
   *   ① 帧是离线渲好的，运行期只做一次 drawImage，低端机也不掉帧；
   *   ② 状态只有「第几列」，没有可累积的位移/缩放 ⇒ 结构上不可能跑出画布；
   *   ③ 帧序固定，每次打开看到的都是同一套（不是随机起点）。
   *
   * ★两种图集，选法固定：
   *   shard-LL-<id>（12 yaw × 3 pitch，1920×480）—— 优先，横向 12 帧更顺；
   *   shard-<id>   （ 4 yaw × 3 pitch， 640×480）—— LL 缺失时退到它。
   * ★纵向必须**锁一行**：3 行分别是「俯视 +45° / 平视 0° / 仰视 −45°」，
   *   对薄片来说平视那行几乎是侧看 ⇒ 整行都是一条线（#14 实测覆盖 5~8%，
   *   而它的俯视/仰视行是 15~22%）。旧代码 f=(f+1)%frames 是**纵向串行**，
   *   转一圈必然经过这一行 ⇒ 每两秒碎成一条边，玩家看到的就是
   *   「瓷片一会儿有一会儿没了 / 图没加载出来」。现在锁行 + 行内循环，
   *   并把起始列取成覆盖最大那一列（bestFrameOf）⇒ 第一眼就是完整的瓷片。 */
  function atlasFrames(ent) {
    return (typeof ent.frames === 'number') ? ent.frames
      : (ent.frames && ent.frames.length) || (ent.cols * (ent.rows || 1));
  }
  function playAtlas(mount, ent, img, opt) {
    if (mount.__tqStop) { try { mount.__tqStop(); } catch (e) {} mount.__tqStop = null; }
    mount.innerHTML = '';
    var cv = h('canvas', 'shard-sprite');
    fitCanvas(cv, ent);
    cv.style.touchAction = 'none';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', (opt && opt.label) || '瓷片转台');
    mount.appendChild(cv);
    var ctx = cv.getContext('2d');
    var cols = Math.max(1, ent.cols || 1);
    var start = bestFrameOf(ent, img);
    var base = Math.floor(start / cols) * cols;   /* 锁行：整轮只在 base..base+cols-1 里循环 */
    var i = start - base;
    function draw() { drawAtlasFrame(ctx, ent, img, base + i, cv.width, cv.height); }
    var auto = true, drag = false, lx = 0, last = 0, prev = 0, n = 0, sum = 0, dead = false;
    function loop(now) {
      if (dead || !cv.isConnected) { return; }    /* 离场即停 */
      if (prev) {
        sum += (now - prev); n += 1;
        if (n === 30) { if (global.TQA && global.TQA.watchFeed) { global.TQA.watchFeed('shard', sum / n); } }
      }
      prev = now;
      if (auto && (!last || now - last >= 166)) { i = (i + 1) % cols; last = now; draw(); }
      requestAnimationFrame(loop);
    }
    function down(e) { drag = true; auto = false; lx = e.clientX; e.preventDefault(); }
    function up() { drag = false; }
    function move(e) {
      if (!drag) { return; }
      var df = Math.round((e.clientX - lx) / 20);   /* 20px ≈ 半列，12 列约 240px 走半圈 */
      if (df !== 0) { i = ((i + df) % cols + cols) % cols; lx = e.clientX; draw(); }
    }
    cv.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    cv.addEventListener('pointermove', move);
    mount.__tqStop = function () {
      dead = true;
      cv.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      cv.removeEventListener('pointermove', move);
    };
    draw();
    requestAnimationFrame(loop);
  }
  /* 取「优先 LL、退 4×3 图集、再退内壁帧」那一条链，成功就交给 playAtlas。 */
  function mountAtlas(mount, id, cb) {
    var tqa = global.TQA;
    if (!tqa || tqa.kindOut('shard')) { cb(false); return; }
    var keys = ['shard-LL-' + id, 'shard-' + id];
    function tryAt(k) {
      if (k >= keys.length) { cb(false); return; }
      var key = keys[k];
      if (!tqa.reg[key]) { tryAt(k + 1); return; }
      tqa.resolve(key, function (stt) {
        if (!mount.isConnected) { return; }
        if (stt !== 'ok') { tryAt(k + 1); return; }
        var img = tqa.image(key);
        if (!img) { tryAt(k + 1); return; }
        playAtlas(mount, tqa.reg[key], img, { label: '瓷片预设转台' });
        cb(true);
      }, { hot: true });
    }
    tryAt(0);
  }
  TQ.shardStage = function (mount, id) {
    mountAtlas(mount, id, function (ok) { if (!ok) { TQ.shardInner(mount, id); } });
  };
  TQ.shardStill = function (mount, id) {
    var key = 'shard-' + id;
    var tqa = global.TQA;
    if (!tqa) { mount.innerHTML = TQ.FRACTURE; return; }
    tqa.resolve(key, function (stt) {
      if (!mount.isConnected) { return; }
      if (stt !== 'ok') { mount.innerHTML = TQ.FRACTURE; return; }
      var ent = tqa.reg[key], img = tqa.image(key);
      mount.innerHTML = '';
      var cv = h('canvas', 'shard-still');
      fitCanvas(cv, ent);
      mount.appendChild(cv);
      drawAtlasFrame(cv.getContext('2d'), ent, img, bestFrameOf(ent, img), cv.width, cv.height);
    });
  };
  /* 近看 / 拾得占台的「转动看看」：同一条预设转台。
   * 与旧版的差别：不再纵向串行扫 36 格，也不再有任何可累积的缩放/平移状态。 */
  TQ.shardViewer = function (mount, id) {
    mountAtlas(mount, id, function (ok) { if (!ok) { TQ.shardInner(mount, id); } });
  };

  /* ========== S8 手札 · lat-long 全方位自由旋转（yaw×pitch 最近格 · 拖拽 + 惯性 + 独立状态） ==========
   * 面向「近看单枚瓷片 / 纸槌瓶」的多向图集（kind:latlong，12yaw×3pitch，12列×3行）。
   * id='vessel' → 瓶(vessel-LL)；否则瓷片(shard-LL-<id>)。
   * 拖拽：水平分量 → yaw、垂直分量 → pitch；松手带惯性缓停；键盘方向键可达。
   * 每实例独立状态（互不影响）；切帧一律 canvas drawImage（Chrome61 红线，禁 background-position）。
   * 侦测失败 / 未注册 → 瓷片回退 12 帧转台 shardViewer；瓶无转台则回退矢量瓶剪影（永不白屏）。 */
  TQ.spin3d = function (mount, id) {
    var isVessel = (id === 'vessel');
    var key = isVessel ? 'vessel-LL' : 'shard-LL-' + id;
    var tqa = global.TQA;
    function fallback() {
      if (isVessel) {
        /* 瓶无 12 帧转台 → 矢量瓶剪影（VESSEL）诚实回退 */
        mount.innerHTML = '';
        mount.appendChild(h('div', 'shard-vec'));
        mount.lastChild.innerHTML = TQ.VESSEL;
        mount.lastChild.className = 'vessel-vec';
        if (tqa && tqa.reg[key]) { mount.appendChild(h('div', 'prop-badge', '预设图样')); }
        return;
      }
      if (tqa && tqa.reg['shard-' + id]) { TQ.shardViewer(mount, id); }
      else { TQ.shardInner(mount, id); }
    }
    /* 未注册多向图集 → 诚实回退 */
    if (!tqa || !tqa.reg[key] || tqa.kindOut('shard-LL')) { fallback(); return; }
    tqa.resolve(key, function (stt) {
      if (!mount.isConnected) { return; }
      if (stt !== 'ok') { fallback(); return; }
      var ent = tqa.reg[key], img = tqa.image(key);
      if (!img) { fallback(); return; }
      mount.innerHTML = '';
      var cv = h('canvas', 'shard-ll');
      fitCanvas(cv, ent);
      cv.style.touchAction = 'none';
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', (isVessel ? '纸槌瓶' : '瓷片') + '全方位旋转');
      cv.tabIndex = 0;
      mount.appendChild(cv);
      var ctx = cv.getContext('2d');
      if ('imageSmoothingQuality' in ctx) { ctx.imageSmoothingQuality = 'high'; }
      var YAW = ent.yaw, PIT = ent.pitch, COLS = ent.cols || YAW, ROWS = ent.rows || PIT;
      var anchor = ent.anchor || { yaw: 0, pitch: Math.floor(PIT / 2) };
      /* 连续角度态（度）：yaw∈[0,360)、pitch∈[-pitchMax,+pitchMax] */
      var pmax = (ent.pitchMax || 60) * (PIT - 1) / 2.0;
      var yaw = anchor.yaw * (360 / YAW);
      var pitch = pitchOfIndex(anchor.pitch, PIT, pmax);
      var vy = 0, vp = 0;            /* 惯性角速度（度/帧） */
      var auto = true, drag = false, lx = 0, ly = 0;
      var zoom = 1, panX = 0, panY = 0;   /* 缩放/平移（双指捏合、双击 1↔2×） */
      var last = 0, prev = 0, n = 0, sum = 0;

      function pitchOfIndex(q, pit, m) { /* 索引0=+m（俯视）… 末位=-m（仰视） */
        if (pit <= 1) { return 0; }
        var step = 2 * m / (pit - 1);
        return m - q * step;
      }
      function idxYaw() {
        return Math.round(((yaw % 360) + 360) % 360 / (360 / YAW)) % YAW;
      }
      function idxPitch() {
        /* 与 pitchOfIndex 严格互逆：q = (pmax - pitch) / (pmax - pitchOfIndex(1)) */
        var step = (PIT > 1) ? pmax - pitchOfIndex(1, PIT, pmax) : 1;
        var q = Math.round((pmax - pitch) / (step || 1));
        return Math.max(0, Math.min(PIT - 1, q));
      }
      function draw() {
        /* 多向布局（pack_latlong）：列 = yaw、行 = pitch。行内 12 yaw 连续，跨行换 pitch。
         * 缩放直接改目标矩形（不重采样源），保持切帧语义不变。 */
        var p = idxYaw(), q = idxPitch();
        var fx = p * ent.fw, fy = q * ent.fh;
        var maxX = cv.width * (zoom - 1) / 2, maxY = cv.height * (zoom - 1) / 2;
        panX = Math.max(-maxX, Math.min(maxX, panX));
        panY = Math.max(-maxY, Math.min(maxY, panY));
        var w = cv.width * zoom, hgt = cv.height * zoom;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, fx, fy, ent.fw, ent.fh,
          (cv.width - w) / 2 + panX, (cv.height - hgt) / 2 + panY, w, hgt);
      }
      /* 供自动化测试读取的只读状态（不参与逻辑，不改变任何行为） */
      mount.__tq = function () {
        return { kind: 'latlong', yaw: yaw, pitch: pitch, zoom: zoom, auto: !!auto,
          yawIdx: idxYaw(), pitchIdx: idxPitch(), rows: PIT, cols: YAW, pitchMax: pmax };
      };
      /* 外部视角指令（查看器工具条用）：把「按一下」翻译成与拖拽完全等价的状态变更，
       * 改的仍是同一组 (yaw, pitch, zoom, pan, auto)，下一帧走同一个 draw()。 */
      mount.__cmd = function (c) {
        if (!c) { return mount.__tq(); }
        var touched = false;
        if (c.pitchAbs !== undefined) { pitch = Math.max(-pmax, Math.min(pmax, c.pitchAbs)); vp = 0; auto = false; touched = true; }
        if (c.yawStep) { yaw = (yaw + c.yawStep * (360 / YAW) + 360) % 360; vy = 0; auto = false; touched = true; }
        if (c.yawAbs !== undefined) { yaw = ((c.yawAbs % 360) + 360) % 360; vy = 0; auto = false; touched = true; }
        if (c.zoom !== undefined) {
          zoom = Math.max(1, Math.min(2.5, c.zoom));
          if (zoom <= 1.001) { panX = 0; panY = 0; }
          touched = true;
        }
        if (c.auto !== undefined) { auto = !!c.auto; vy = 0; vp = 0; touched = true; }
        if (c.reset) {
          yaw = anchor.yaw * (360 / YAW);
          pitch = pitchOfIndex(anchor.pitch, PIT, pmax);
          zoom = 1; panX = 0; panY = 0; vy = 0; vp = 0; auto = false;
          touched = true;
        }
        if (touched) { draw(); }
        return mount.__tq();
      };
      function tick(now) {
        if (!cv.isConnected) { return; }
        if (prev) { sum += (now - prev); n += 1; if (n === 30) { tqa.watchFeed('shard-LL', sum / n); } }
        prev = now;
        if (!drag) {
          vy *= 0.90; vp *= 0.90;             /* 惯性衰减 */
          yaw = (yaw + vy + (auto ? 0.35 : 0) + 360) % 360;
          pitch = Math.max(-pmax, Math.min(pmax, pitch + vp));
          if (Math.abs(vy) < 0.05 && Math.abs(vp) < 0.05) { vy = 0; vp = 0; }
          if (!last || now - last >= 33) { last = now; draw(); } /* ~30fps 切帧（拖拽态逐帧，惯性态限频） */
        } else {
          draw();
        }
        requestAnimationFrame(tick);
      }
      draw(); requestAnimationFrame(tick);

      var pts = {}, pinch0 = 0, zoom0 = 1, tapT = 0, downX = 0, downY = 0, lastMoveT = 0;
      function nPts() { var k, c = 0; for (k in pts) { if (pts[k]) { c += 1; } } return c; }
      function pinchDist() {
        var ids = [], k;
        for (k in pts) { if (pts[k]) { ids.push(pts[k]); } }
        if (ids.length < 2) { return 0; }
        return Math.hypot(ids[0].x - ids[1].x, ids[0].y - ids[1].y);
      }
      cv.addEventListener('pointerdown', function (e) {
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        drag = true; auto = false; vy = 0; vp = 0;
        lx = e.clientX; ly = e.clientY; downX = e.clientX; downY = e.clientY;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        if (nPts() === 2) { pinch0 = pinchDist(); zoom0 = zoom; }
        e.preventDefault();
      });
      cv.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) { return; }
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (nPts() >= 2) {                      /* 双指 = 缩放，不做旋转 */
          var pd = pinchDist();
          if (pinch0 > 4) { zoom = Math.max(1, Math.min(2.5, zoom0 * pd / pinch0)); draw(); }
          return;
        }
        if (!drag) { return; }
        var dx = e.clientX - lx, dy = e.clientY - ly;
        var k = 0.6;                              /* 拖动手感系数（度/px） */
        yaw = (yaw + dx * k) % 360; if (yaw < 0) { yaw += 360; }
        pitch = Math.max(-pmax, Math.min(pmax, pitch - dy * k));
        vy = dx * k; vp = -dy * k;                 /* 记末速 → 松手惯性 */
        lastMoveT = Date.now();
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { lx = e.clientX; ly = e.clientY; }
        draw();
      });
      function endDrag(e) {
        var was = nPts();
        if (e && e.pointerId !== undefined) { delete pts[e.pointerId]; }
        if (nPts() === 0) {
          drag = false;
          /* ★ 2026-10-28：抬手前若已**停手 >80ms**，就不给惯性。
           *   旧行为是「无论停多久都把最后一次位移当末速甩出去」——
           *   玩家想停在一个角度看内壁时，画面总会多转 15~20°，
           *   既违反直觉，也让「停在指定角度」不可能。
           *   甩手（连续移动中抬手）仍然保留惯性。 */
          if (Date.now() - lastMoveT > 80) { vy = 0; vp = 0; }
        }
        /* 双击（两次抬起间隔 <320ms 且位移 <14px）⇒ 1× / 2× 切换 */
        if (was === 1 && e) {
          var moved = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
          if (moved < 14) {
            var now = Date.now();
            if (now - tapT < 320) { zoom = zoom > 1.2 ? 1 : 2; panX = 0; panY = 0; draw(); tapT = 0; }
            else { tapT = now; }
          }
        }
      }
      cv.addEventListener('pointerup', endDrag);
      cv.addEventListener('pointercancel', endDrag);
      cv.addEventListener('keydown', function (e) { /* 方向键可达：微调 + 即时切格 */
        var d = 360 / YAW;
        if (e.key === 'ArrowLeft') { yaw = (yaw - d + 360) % 360; auto = false; vy = 0; vp = 0; draw(); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { yaw = (yaw + d) % 360; auto = false; vy = 0; vp = 0; draw(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { pitch = Math.max(-pmax, pitch - (2 * pmax / (PIT - 1) || 0)); auto = false; vp = 0; draw(); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { pitch = Math.min(pmax, pitch + (2 * pmax / (PIT - 1) || 0)); auto = false; vp = 0; draw(); e.preventDefault(); }
      });
    });
  };

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
    yp.appendChild(h('div', 'comma', '·'));
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
      if (!full) {
        full = true;
        ind.style.display = 'block';
        if (opts.onFull) { opts.onFull(); } /* 自动挡：显完即挂自动推进定时 */
      }
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
    /* 外部控制 API（自动/跳过键驱动）：查询显完状态 / 立即显完 / 外部推进 */
    box._tqIsFull = function () { return full; };
    box._tqFinish = function () { if (!full) { finish(); } };
    box._tqAdvance = function () { advance(); };
    return box;
  }
  TQ.dlgCard = function (speaker, text, onAdvance, opts) { return typeCard(speaker, text, onAdvance, opts || null); };
  TQ.narrCard = function (text, onAdvance) { return typeCard('', text, onAdvance, { noType: true }); };

  /* ========== direct2d 小节引擎（回退版默认操作 · 零惩罚） ==========
   * cfg.steps[i]: { label, gest:'drag'|'sweep'|'tap'|'hold', goal, tip, prop, done }
   * 手势与等价按钮双轨并存；进度只增不清；「应节而动」切应节轨（外部回调）。
   * ★11-01 起：应节按钮默认不挂（单轨），onJie 回调与整条应节轨保留备用。
   */
  TQ.iv = function (main, cfg, cb, onJie, sect) {
    /* ★rich：这三个小游戏（tang / proof / touhu）不从这套"进度累加器"里走，
       判定依据是"形状变没变"（面坯档位／切开的片数／矢的落点），
       交给 js/minigame.js 自己画、自己判；这里只保留步骤条与文案。 */
    var RICH = !!(cfg.rich && global.TQM && global.TQM.has(cfg.rich));
    var mg = null;
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

    /* ---- 操作教学开关（2026-11-02 · 每小节独立） ----
     * 关掉只藏「教怎么玩」的部分：步骤条 .iv-steps、提示 .iv-hint、手势示意 .gest、
     * 落点框 .target、画布内提示条 #hud；器具本体、进度读数、成品都保留。
     * ★开关按钮自己不能藏 —— 藏了玩家就找不回来。所以它单独占一行、放在舞台之外，
     *   RICH 分支把 .iv-ctrl 整行 display:none 也不影响它。
     * ★小节 id 用 data.js 的 cfg 键（tang / shi_food / …）：史官线与女官线同名小节
     *   配置与画面都不同，必须是两份开关。 */
    var SECT = sect || cfg.id || cfg.rich || '';
    var tutRow = h('div', 'iv-tutrow');
    var tutBtn = h('button', 'iv-tut', '');
    tutBtn.type = 'button';
    var everMounted = false;
    function tutSync() {
      if (wrap.parentNode) { everMounted = true; }
      else if (everMounted) {
        if (global.TQSET && global.TQSET.offChange) { global.TQSET.offChange(tutSync); }
        return;                                    /* 已退场：摘订阅，别攥着 DOM */
      }
      var on = (!global.TQSET || !SECT) ? true : global.TQSET.tutOn(SECT);
      if (on) { wrap.classList.remove('tut-off'); } else { wrap.classList.add('tut-off'); }
      tutBtn.textContent = on ? '教学 · 开' : '教学 · 关';
      tutBtn.setAttribute('data-on', on ? '1' : '0');
      tutBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      tutBtn.title = on ? '本小节的操作提示：开（点一下关掉）' : '本小节的操作提示：关（点一下恢复）';
    }
    function onTutClick(e) {
      if (e && e.stopPropagation) { e.stopPropagation(); }
      if (!global.TQSET || !SECT) { return; }
      global.TQSET.setTut(SECT, !global.TQSET.tutOn(SECT));   /* 订阅回调会重画 */
      if (global.TQSFX) { try { global.TQSFX.play('tap'); } catch (err) {} }
    }
    tutBtn.addEventListener('click', onTutClick);
    /* 舞台的 pointerdown 会被小游戏当成一次操作 ⇒ 按钮上的指针事件必须挡住冒泡 */
    tutBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    tutBtn.addEventListener('pointerup', function (e) { e.stopPropagation(); });
    tutRow.appendChild(tutBtn);
    tutSync();
    if (global.TQSET && global.TQSET.onChange) { global.TQSET.onChange(tutSync); }

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
    ctrl.appendChild(minus); ctrl.appendChild(plus);
    /* 应节入口：只在应节轨启用时挂出来（第一版单轨，故不出现）。
       ★不删代码：TQA.GSYS.jie.on 置真即原样恢复这个入口与 onJie 回调。 */
    if (global.TQA && TQA.modeOpen && TQA.modeOpen('jie')) { ctrl.appendChild(sp); ctrl.appendChild(jie); }
    var hint = h('div', 'iv-hint', '');
    /* 说明区收进一张纸卡（2026-11-02）：场景底图铺满之后，步骤条/读数/提示直接压在
     * 门楼与殿柱上，字是"看得见但读不清"。纸卡只管排版与对比，不改任何判定。 */
    var board = h('div', 'iv-guide');
    board.appendChild(stepsRow); board.appendChild(bar); board.appendChild(val);
    board.appendChild(hint); board.appendChild(ctrl); board.appendChild(tutRow);
    wrap.appendChild(board);
    /* 挂载与退场由调用方占台管理（VN 占台机制）；节点不再自行 append 进文档流 */

    var steps = cfg.steps || [];
    var si = 0, pct = 0, over = false, hits = 0;
    function pctClamp() { return Math.max(0, Math.min(100, pct)); }
    /* ---- 道具双态适配器（§10.5 绑定核心：sprite 实装态 / vector 占位态共用同一容器与进度源） ----
     * spriteUse={si,img,ent,cv}；素材侦测失败或未注册 → PROPS 代码绘画（先占位后升级，永不白屏）。 */
    var spriteUse = null;
    function drawSpriteFrame() {
      var ent = spriteUse.ent, img = spriteUse.img, cv = spriteUse.cv;
      var f = Math.min(ent.frames - 1, Math.floor(pctClamp() / 100 * ent.frames));
      var fx = (f % ent.cols) * ent.fw, fy = Math.floor(f / ent.cols) * ent.fh;
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, fx, fy, ent.fw, ent.fh, 0, 0, cv.width, cv.height);
      if (cv.parentNode !== propBox) { propBox.innerHTML = ''; propBox.appendChild(cv); }
    }
    function renderProp() {
      var st = steps[si];
      if (spriteUse && spriteUse.si === si && spriteUse.img && spriteUse.img.complete) {
        drawSpriteFrame();
        return;
      }
      var fn = PROPS[st && st.prop] || PROPS.dough;
      propBox.innerHTML = fn(pctClamp() / 100);
      /* 回退角标：仅当该道具「注册过素材但不可用」（真回退态）才诚实标注；未接入不标 */
      var akey = (global.TQA && global.TQA.propAsset[st && st.prop]) || null;
      if (akey && global.TQA.state(akey) === 'fail' && !propBox.querySelector('.prop-badge')) {
        propBox.appendChild(h('div', 'prop-badge', '预设图样'));
      }
    }
    function probeSprite() {
      spriteUse = null;
      if (!global.TQA) { return; }
      var st = steps[si];
      var akey = global.TQA.propAsset[st && st.prop];
      if (!akey || global.TQA.kindOut('prop')) { return; }
      var reqSi = si;
      global.TQA.resolve(akey, function (stt) {
        if (stt !== 'ok' || reqSi !== si || over) { return; }
        spriteUse = { si: si, img: global.TQA.image(akey), ent: global.TQA.reg[akey],
          cv: h('canvas', 'prop-sprite') };
        spriteUse.cv.width = spriteUse.ent.fw;
        spriteUse.cv.height = spriteUse.ent.fh;
        renderProp();
      });
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
      /* ★进度条常显（2026-11-02 手机实测「关掉教学连进度条也没了」）：
       *   进度条是**状态**，不是教学。旧版在 toss 与 RICH 两处把它 display:none，
       *   关掉教学后（HUD 也藏了）玩家就彻底看不到自己做到哪一步。
       *   现在一律显示；只有「本步无可量化进度」时才让 fill 停住。 */
      bar.style.display = '';
      fill.style.width = pctClamp() + '%';
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
      renderSteps();
      if (RICH && mg) {
        mg.next(si);
        hint.innerHTML = '<b>' + st.label + '</b>：' + (st.tip || cfg.hint || '');
        return;
      }
      renderBar(); renderProp();
      probeSprite();
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
        if (mg) { try { mg.destroy(); } catch (e) { /* noop */ } mg = null; }
        stepTag.textContent = '毕';
        if (cfg.decoName) {
          var t = h('div', 'shard-toast');
          t.appendChild(h('div', 'got', '长卷装饰件入手'));
          t.appendChild(h('div', 'name', cfg.decoName));
          wrap.appendChild(t);
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
      if (over || RICH) { return; }
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
      if (!dragging || over || RICH) { return; }
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
      if (RICH) { return; }
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
    /* ---------- 舞台定高（2026-11-02 修 · 真机无法进入动手小节） ----------
     * 原本靠 CSS `aspect-ratio:300/210` 给 .iv-stage 定高。宿主 WebView 基线是
     * Chrome 61，不支持 aspect-ratio（Chrome 88+ 才有）；配合 flex:0 0 auto +
     * 子元素全绝对定位，高度直接算成 0（实测 2px）⇒ 画布看不见；更致命的是
     * Canvas.map() 的缩放比 `min(w/300, h/210)` 掉到 0.0095，任何点击/拖动都被
     * 映射到 300×210 画幅之外，表现为「进得去、点不动」，与「进不去」同感。
     * 这里按画幅比把高度算成 px 写进 style：不依赖任何新 CSS 特性，老 WebView 一致。
     * 尺寸来源与 CSS 保持一致：宽取实际可用宽，高 = min(宽×210/300, 58vh)。 */
    function fitStage() {
      if (!RICH || !stage || !stage.parentNode) { return false; }
      var w = stage.clientWidth;
      if (!w) { return false; }                      /* 尚未入文档：等下一拍 */
      var vh = global.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 800;
      var h = Math.round(Math.min(w * 210 / 300, vh * 0.58));
      if (h > 0 && Math.abs(stage.clientHeight - h) > 1) { stage.style.height = h + 'px'; }
      return true;
    }

    if (RICH) {
      wrap.classList.add('rich');
      /* 进度条保留（hooks.step 会把真实进度写进 fill），只收起用不上的通用控件 */
      bar.style.display = '';
      ctrl.style.display = 'none';
      propBox.style.display = 'none';
      gest.style.display = 'none';
      target.style.display = 'none';
      if (shadow) { shadow.style.display = 'none'; }
      mg = global.TQM.play(cfg.rich, stage, cfg, {
        step: function (p, label) {
          pct = Math.max(0, Math.min(100, p * 100));
          fill.style.width = pct + '%';
          if (label) { val.textContent = label; }
        },
        tip: function (t) { val.textContent = t || ''; },
        done: function (missed) { if (!over) { finishStep(!!missed); } }
      });
      /* TQ.iv 返回时 wrap 还没被 occupyNode 挂进文档（clientWidth=0），故下一帧再量；
       * 再补一帧兜住真机首帧字体/安全区导致的二次布局。 */
      (function schedule() {
        var raf = global.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
        raf(function () { fitStage(); raf(function () { fitStage(); }); });
      }());
      /* 旋屏/分屏/软键盘收起都会改可用宽：重算。
       * 退场后 self-detach，避免每进一次小节就多挂一对监听。 */
      var onResizeIv = function () {
        if (!stage.parentNode) {
          global.removeEventListener('resize', onResizeIv);
          global.removeEventListener('orientationchange', onResizeIv);
          return;
        }
        fitStage();
      };
      global.addEventListener('resize', onResizeIv);
      global.addEventListener('orientationchange', onResizeIv);
    }
    enterStep();
    /* 开发/QA 用具：直接把当前拍判过（截"第 N 拍的画面"用；玩法本身不走这里）。
       只影响这一份 wrap，不可达玩家路径。 */
    wrap._tqForce = function () { if (!over) { finishStep(false); } };
    return wrap;
  };

  global.TQF = TQ;
  /* ★ 2026-10-28 修：app.js 里所有精灵渲染都被 `if (window.F) {...}` 守着，
   *   但本文件过去只暴露 TQF（`var F = global.TQF` 在 app.js 内是闭包变量，
   *   不是 window.F）⇒ 守卫恒为假，**详情页的旋转区一直是空的**，
   *   玩家点开瓷片只看得到文字，看不到任何 3D 素材（也就看不到内壁）。
   *   这里补上 window.F 别名；TQF 保留以兼容既有调用。 */
  global.F = TQ;
})(window);
