/* 天清往事 · 角色绘像（代码绘画占位 · speaker → 立绘槽 接入映射）
 * ------------------------------------------------------------------
 * 职责（三件事）：
 *   ① speaker 映射：剧情 speaker（含玩家抽象自称）→ 角色 key 的唯一事实源；
 *   ② 程序化绘像：每个角色一幅由代码画出的差异化半身像（不是统一剪影、不是空位）；
 *   ③ 立绘槽填充：先画占位（永不空槽/白屏），再经 TQA.resolve 侦测真实 webp 原位升级。
 *
 * 纪律：
 *   - 真实素材以 `assets/chars/tq_chars_<id>_final.webp` 为准，本文件的绘像只是「轨①未到」的落点；
 *   - 素材入包只需在 REGISTERED 里加一行 key → 立绘自动升级，布局零改动；
 *   - 未知 speaker 也必有像（走 DEFAULT 通用 anx 人形），杜绝空位。
 * 兼容：Chrome 61 / ES2017 · 无 inline script · 无 onclick · 零外部请求（除白名单同源 webp）。
 * 造型律：肤色 #C6A385 · 有耳 + 弧线眼 · 幞头圆顶双卷角 + 左后软脚 · 胡须裹颌让嘴。
 */
(function (global) {
  'use strict';

  var TQA = global.TQA;
  var TP_SHIFT = null; /* 视觉重心补偿计算器（下方赋值） */

  /* ============ 颜色小工具 ============ */
  function rgb(c) {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b), o = '#', v, k;
    for (k = 0; k < 3; k += 1) {
      v = Math.round(x[k] + (y[k] - x[k]) * t);
      o += (v < 16 ? '0' : '') + v.toString(16);
    }
    return o;
  }
  function lt(c, t) { return mix(c, '#FFFFFF', t); }
  function dk(c, t) { return mix(c, '#000000', t); }
  /* 左右镜像：x → 100-x（viewBox 宽 100，中轴 50） */
  function mir(s) { return '<g transform="translate(100,0) scale(-1,1)">' + s + '</g>'; }

  var SKIN = '#C6A385';
  var INK = '#3A2E28';

  /* ============ 部件：头面（男女通用，差异由 cfg 驱动） ============ */
  function face(c) {
    var h = c.hair;
    var s = '';
    s += '<path d="M43 52 L57 52 L58 72 L42 72 Z" fill="' + dk(SKIN, 0.16) + '"/>';
    s += '<ellipse cx="33" cy="39" rx="3" ry="4.6" fill="' + dk(SKIN, 0.06) + '"/>';
    s += mir('<ellipse cx="33" cy="39" rx="3" ry="4.6" fill="' + dk(SKIN, 0.06) + '"/>');
    s += '<ellipse cx="50" cy="38" rx="17" ry="20" fill="' + SKIN + '"/>';
    if (c.old) {
      /* 老人：额纹 + 眼角（「亲眼见数次改朝」的冯道/郭威线） */
      s += '<path d="M40 27 q10 -3 20 0" stroke="' + dk(SKIN, 0.22) + '" stroke-width="1" fill="none" opacity=".7"/>';
      s += '<path d="M41 24.5 q9 -2.6 18 0" stroke="' + dk(SKIN, 0.18) + '" stroke-width="0.9" fill="none" opacity=".6"/>';
    }
    s += '<path d="M41.5 31.5 q4 -2.6 8 -0.6" stroke="' + h + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>';
    s += mir('<path d="M41.5 31.5 q4 -2.6 8 -0.6" stroke="' + h + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>');
    s += '<path d="M41.5 36.8 q3.6 -3.2 7.6 0" stroke="' + INK + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
    s += mir('<path d="M41.5 36.8 q3.6 -3.2 7.6 0" stroke="' + INK + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    s += '<path d="M50 38.6 L50 43.6 q-1.3 1.7 0.7 2.3" stroke="' + dk(SKIN, 0.3) + '" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
    s += '<path d="M46.4 49.2 q3.6 2.3 7.2 0" stroke="#7A4B3E" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    return s;
  }

  /* 胡须：short=唇上短须 / long=及胸长髯 / 与头同色或白（old） */
  function beard(c) {
    if (!c.beard || c.beard === 'none') { return ''; }
    var h = c.old ? '#E6E1D6' : c.hair;
    if (c.beard === 'short') {
      return '<path d="M45.6 51.4 q4.4 3 8.8 0 l0 1.8 q-4.4 3.4 -8.8 0 Z" fill="' + h + '"/>'
        + '<path d="M46.6 54.4 q3.4 3.2 6.8 0 l-0.4 1.6 q-3 2.8 -6 0 Z" fill="' + h + '" opacity=".92"/>';
    }
    /* long：裹颌 + 垂髯（造型律：胡须裹颌让嘴） */
    return '<path d="M36 44 q1.6 12 6.4 16 q2.4 2 3.2 5.6 q1.6 3 3.2 5.6 q1.8 -3.4 3.4 -6 q1 -3.6 3 -5 q4.6 -3.6 6.2 -15.6'
      + ' q-4.6 5.6 -12.7 5.6 q-8.2 0 -12.7 -5.6 Z" fill="' + h + '"/>'
      + '<path d="M45.8 51.6 q4.2 2.8 8.4 0" stroke="' + dk(h, 0.35) + '" stroke-width="1.2" fill="none" opacity=".55"/>';
  }

  /* ============ 部件：头饰 ============ */
  function futou(c) {
    /* 幞头：圆顶双卷角 + 左后软脚（项目造型律 10-14 定稿） */
    var f = c.headColor || '#2A2F33';
    var s = '';
    s += '<path d="M32 33 C29.6 19 37.6 12.6 50 12.6 C62.4 12.6 70.4 19 68 33 C60 27.6 40 27.6 32 33 Z" fill="' + f + '"/>';
    s += '<path d="M32 29.4 q-11 -2.6 -13.4 3.6 q10.4 2.6 13.4 0.4 Z" fill="' + f + '"/>';
    s += mir('<path d="M32 29.4 q-11 -2.6 -13.4 3.6 q10.4 2.6 13.4 0.4 Z" fill="' + f + '"/>');
    /* 左后软脚（仅一侧，镜像会变成右侧——古制两脚分垂，此处保留对称内卷脚已足够辨识） */
    s += '<path d="M33.6 31 q-4.6 9.4 -4 17.4 q4.6 -1.6 5.6 -7.4 Z" fill="' + dk(f, 0.12) + '"/>';
    s += '<path d="M35 17.6 q15 -4.6 30 0" stroke="' + lt(f, 0.28) + '" stroke-width="1.4" fill="none" opacity=".75"/>';
    return s;
  }

  function headdress(c) {
    var f = c.headColor || '#2A2F33';
    var hc = c.hair || '#2A2622';
    var s = '';
    switch (c.head) {
      case 'mian': /* 通天冠（帝王 · 郭荣）：覆顶高冠 + 金缘 + 两侧卷翅，不遮脸 */
        s += '<path d="M34 32 C33 20 40 13 50 13 C60 13 67 20 66 32 C58 27.4 42 27.4 34 32 Z" fill="' + f + '"/>';
        s += '<rect x="32" y="10.4" width="36" height="4.6" rx="2.2" fill="' + dk(f, 0.1) + '"/>';
        s += '<path d="M44 26.4 L47.4 18.6 L50 22.4 L52.6 18.6 L56 26.4 Z" fill="#C9A227"/>';
        s += '<path d="M34 29 q-10 -2.4 -12.4 3.4 q9.6 2.4 12.4 0.4 Z" fill="' + f + '"/>';
        s += mir('<path d="M34 29 q-10 -2.4 -12.4 3.4 q9.6 2.4 12.4 0.4 Z" fill="' + f + '"/>');
        s += '<path d="M36 20.6 q14 -5 28 0" stroke="#C9A227" stroke-width="1.4" fill="none" opacity=".85"/>';
        break;
      case 'chuiji': /* 垂髻（《宫乐图》仕女 · 女官/宫人） */
        s += '<path d="M30 40 q-3.6 -14 6 -22 q8 -8 28 0 q9.6 8 6 22 q-4 -10 -12 -13 q-8 4 -20 0 q-4.6 5 -8 13 Z" fill="' + hc + '"/>';
        s += '<path d="M32 33 q-6.6 3 -7.4 13 q6.6 2.6 9.4 -3 Z" fill="' + hc + '"/>';
        s += mir('<path d="M32 33 q-6.6 3 -7.4 13 q6.6 2.6 9.4 -3 Z" fill="' + hc + '"/>');
        s += '<path d="M42 18.6 q8 -4.4 16 0" stroke="' + lt(hc, 0.22) + '" stroke-width="1.3" fill="none" opacity=".6"/>';
        if (c.pin) { s += '<path d="M60 22 L70 17" stroke="#C9A227" stroke-width="1.6" stroke-linecap="round"/>'; }
        break;
      case 'huacha': /* 巾帼 + 花钗（符后） */
        s += '<path d="M30 41 q-3.4 -15 6 -23 q10 -8.6 28 0 q9.4 8 6 23 q-4.4 -10 -12 -13.4 q-8.6 4.4 -20 0 q-4.4 5.4 -8 13.4 Z" fill="' + hc + '"/>';
        s += '<path d="M42 17 q8 -5 16 0 l-2 4 q-6 -3.4 -12 0 Z" fill="#C9A227"/>';
        s += '<circle cx="38" cy="21" r="2.2" fill="#C9A227"/>';
        s += '<circle cx="62" cy="21" r="2.2" fill="#C9A227"/>';
        s += '<path d="M36 24.6 q-5 5 -5.6 11" stroke="' + lt(hc, 0.3) + '" stroke-width="1.1" fill="none" opacity=".5"/>';
        break;
      case 'jin': /* 巾帼软巾（尚食奉御 · 灶事） */
        s += '<path d="M31 40 q-3.2 -13.6 5.6 -21.6 q9.4 -8 26.8 0 q8.8 8 5.6 21.6 q-4.2 -9.6 -11.6 -12.6 q-7.6 4.2 -18.6 0 q-4 5 -7.8 12.6 Z" fill="' + hc + '"/>';
        s += '<path d="M31 30 q-3.4 8 -2.6 14.6 q5.4 -1 7 -6.6 Z" fill="' + dk(hc, 0.1) + '"/>';
        s += '<path d="M41 19.4 q9 -4.4 18 0" stroke="' + (c.bandColor || '#8A7A63') + '" stroke-width="3.2" fill="none"/>';
        break;
      case 'xiaoguan': /* 小冠（宗训 · 黄衣小皇子）：发只覆顶、中分露额，不遮脸 */
        s += '<path d="M33 34 C32 21 40 14 50 14 C60 14 68 21 67 34 C60 29.4 55 27 50 27 C45 27 40 29.4 33 34 Z" fill="' + hc + '"/>';
        s += '<path d="M42 19 q8 -7 16 0 l-1.2 3.4 q-6.8 -5 -13.6 0 Z" fill="' + f + '"/>';
        s += '<path d="M41.6 21.8 q8.4 -5.8 16.8 0" stroke="' + dk(f, 0.05) + '" stroke-width="2" fill="none"/>';
        break;
      case 'bai': /* 白首老人（冯道 / 郭威追忆） */
        s += futou({ headColor: '#6E6A63' });
        break;
      case 'pingjin': /* 平巾帻（武官 · 《旧唐书·舆服志》「武官及卫官服之」）
        * 10-27 服色礼制决议：常服（圆领/缺胯袍）须配常服首服——
        * 进贤冠/武弁是「朝服」冠，与常服紫袍并装反而制造新的失礼，
        * 故武臣用平巾帻（巾帻类，软顶覆额、后垂两软脚），文臣用幞头。
        * 造型：低平软顶（比幞头矮）+ 额前横带 + 后垂两条软脚，无卷角。 */
        s += '<path d="M33 30.4 C31.4 20.4 38.4 15.4 50 15.4 C61.6 15.4 68.6 20.4 67 30.4 C59 26 41 26 33 30.4 Z" fill="' + f + '"/>';
        s += '<path d="M31.6 29.6 q18.4 -5.6 36.8 0 l-0.6 3.6 q-17.8 -5 -35.6 0 Z" fill="' + dk(f, 0.14) + '"/>';
        s += '<path d="M34 32.4 q-3.4 8.6 -2.6 16.4 q4.2 -1.4 5 -7.6 Z" fill="' + dk(f, 0.1) + '"/>';
        s += '<path d="M66 32.4 q3.4 8.6 2.6 16.4 q-4.2 -1.4 -5 -7.6 Z" fill="' + dk(f, 0.1) + '"/>';
        s += '<path d="M36.6 19 q13.4 -4 26.8 0" stroke="' + lt(f, 0.26) + '" stroke-width="1.2" fill="none" opacity=".7"/>';
        break;
      default:
        s += futou(c);
    }
    return s;
  }

  /* ============ 部件：身服 ============ */
  function body(c) {
    var g = 'url(#tg' + c.k + ')';
    var s = '';
    /* 袍身：肩 → 腰下（半身像，下沿被立绘槽裁切） */
    s += '<path d="M14 120 C14 96 30 80 50 77.6 C70 80 86 96 86 120 Z" fill="' + g + '"/>';
    if (c.build === 'f') {
      /* 女：窄肩 + 披帛（斜带）+ 上襦缘 */
      s = '<path d="M18 120 C18 98 32 82 50 79.6 C68 82 82 98 82 120 Z" fill="' + g + '"/>';
      s += '<path d="M20 120 C24 104 34 92 50 88 C66 92 76 104 80 120 Z" fill="' + lt(c.robe, 0.24) + '"/>';
      s += '<path d="M22 120 q10 -18 28 -20 q18 2 28 20" fill="none" stroke="' + (c.sash || lt(c.robe, 0.45)) + '" stroke-width="6" opacity=".55"/>';
    }
    if (c.build === 'w') {
      /* 武：甲胄（肩甲 + 胸甲 + 甲片纹）
       * ⚠️ 10-27 服色礼制决议：甲胄入嘉礼寿宴是硬伤，天清节（显德五年九月廿四·广德殿上寿）
       * 属嘉礼，凡现实席上的武臣一律禁甲。故甲胄改为「可选」——只有 c.armor !== false 才绘制。
       * 张永德 / 赵匡胤 / 李重进 均已置 armor:false，改走缺胯袍（两侧开衩证武臣身份），保留武人体量但不露甲片。
       * （李重进 10-28 用户裁定与张/赵同制去甲，不再留甲作 a2 戎服差分。）
       * 判据：build 只决定「体量/版型」，甲胄由 armor 单独控制，二者解耦。
       * data-armor 属性供 QA 探针做 DOM 级断言（像素级判据见 .probe_qa/qa_zi_colors.js）。 */
      if (c.armor !== false) {
        s += '<g data-armor="1">';
        s += '<path d="M14 120 C14 102 20 92 30 86 L44 84 L44 120 Z" fill="' + dk(c.robe, 0.18) + '"/>';
        s += '<path d="M86 120 C86 102 80 92 70 86 L56 84 L56 120 Z" fill="' + dk(c.robe, 0.18) + '"/>';
        s += '<path d="M22 94 L78 94 M24 103 L76 103 M26 112 L74 112" stroke="' + dk(c.robe, 0.34) + '" stroke-width="1.2" opacity=".55"/>';
        s += '<path d="M50 84 L50 120" stroke="' + dk(c.robe, 0.3) + '" stroke-width="1.4" opacity=".5"/>';
        s += '</g>';
      } else {
        /* 缺胯袍：肩线略宽以存武人体量 + 两侧开衩（《旧唐书·舆服志》武官及卫官服缺胯袍）
         * 不加甲片纹、不加胸甲分割线、不加护心镜——与 AI 立绘（平巾帻+缺胯袍+去甲）同源。 */
        s += '<g data-que="1">';
        s += '<path d="M11 120 C11 104 22 91 50 87 C78 91 89 104 89 120 Z" fill="' + lt(c.robe, 0.06) + '"/>';
        s += '<path d="M24 110 L24 120 M76 110 L76 120" stroke="' + dk(c.robe, 0.26) + '" stroke-width="1.2" opacity=".4"/>';
        s += '</g>';
      }
    }
    if (c.build === 'c') {
      /* 童：袍身收窄 */
      s = '<path d="M22 120 C22 100 34 86 50 84 C66 86 78 100 78 120 Z" fill="' + g + '"/>';
    }
    /* 圆领（交领：帝王/文官为方心圆领，V 形内衬） */
    s += '<path d="M40.6 77.6 Q50 90 59.4 77.6 L56.4 76 Q50 84 43.6 76 Z" fill="' + (c.collar || '#EFEAE0') + '"/>';
    /* 革带（只系腰线以下 · 造型律） */
    if (c.build !== 'f') {
      s += '<rect x="20" y="102" width="60" height="5.4" fill="' + (c.belt || '#3C332B') + '"/>';
      s += '<rect x="46" y="101.4" width="8" height="6.6" fill="' + (c.buckle || '#C9A227') + '" opacity=".9"/>';
    }
    /* 袖（两侧下垂） */
    s += '<path d="M14 88 C10 100 10 112 12 120 L26 120 C21 108 21 96 24 86 Z" fill="' + dk(c.robe, 0.1) + '"/>';
    s += mir('<path d="M14 88 C10 100 10 112 12 120 L26 120 C21 108 21 96 24 86 Z" fill="' + dk(c.robe, 0.1) + '"/>');
    return s;
  }

  /* ============ 部件：手持道具 ============ */
  function propOf(c) {
    var p = c.prop;
    if (!p || p === 'xiu') {
      /* 袖手（朝堂常仪）：胸前交叠 */
      return '<path d="M30 116 q10 -10 20 -2 q10 -8 20 2 q-10 -2 -20 6 q-10 -8 -20 -6 Z" fill="' + lt(c.robe, 0.32) + '"/>';
    }
    if (p === 'hu') { /* 笏板（文官）×2 斜举于胸 */
      return '<g><path d="M33 96 L45 91 L47 96 L35 101 Z" fill="#EFE7D6" stroke="' + dk('#EFE7D6', 0.3) + '" stroke-width="0.7"/>'
        + mir('<path d="M33 96 L45 91 L47 96 L35 101 Z" fill="#EFE7D6" stroke="' + dk('#EFE7D6', 0.3) + '" stroke-width="0.7"/>') + '</g>';
    }
    if (p === 'bi') { /* 笔 + 卷（史官） */
      return '<g><path d="M58 92 L74 88 L76 100 L60 104 Z" fill="#F1EADA" stroke="' + dk('#F1EADA', 0.28) + '" stroke-width="0.7"/>'
        + '<rect x="61.6" y="86" width="2.4" height="20" rx="1.2" fill="#4A3A2E"/>'
        + '<path d="M62 86 l3 0 l-1.5 5 Z" fill="#2A2622"/></g>';
    }
    if (p === 'zhou') { /* 仪注卷轴（女官） */
      return '<g><rect x="30" y="94" width="14" height="26" rx="7" fill="#F1EADA" stroke="' + dk('#F1EADA', 0.26) + '" stroke-width="0.7"/>'
        + '<rect x="29" y="92" width="16" height="3" rx="1.5" fill="#8A6B3E"/>'
        + '<rect x="29" y="119" width="16" height="3" rx="1.5" fill="#8A6B3E"/></g>';
    }
    if (p === 'shi') { /* 矢（投壶） */
      return '<g><path d="M64 116 L36 88" stroke="#8A6B3E" stroke-width="2.6" stroke-linecap="round"/>'
        + '<path d="M36 88 l-4 6 l7 -1 Z" fill="#C9C2B4"/></g>';
    }
    if (p === 'jian') { /* 剑 / 刀（武将） */
      return '<path d="M70 118 L26 86" stroke="#B9B3A6" stroke-width="3" stroke-linecap="round"/>'
        + '<path d="M26 86 l-5 -3 l7 -3 Z" fill="#D8D2C4"/>'
        + '<circle cx="70" cy="118" r="3.2" fill="#8A6B3E"/>';
    }
    if (p === 'shang') { /* 金觞（举觞）：小盏斜擎于胸前 */
      return '<g><path d="M34 106 q6.8 8.6 13.6 0 Z" fill="#C9A227"/>'
        + '<ellipse cx="40.8" cy="106" rx="6.8" ry="2.2" fill="#E2BC4A"/>'
        + '<path d="M40.8 109 L40.8 115.6" stroke="#C9A227" stroke-width="1.8"/>'
        + '<ellipse cx="40.8" cy="116.6" rx="3.4" ry="1.2" fill="#C9A227"/></g>';
    }
    if (p === 'zhan') { /* 茶盏（少年茶事） */
      return '<g><ellipse cx="36" cy="104" rx="9" ry="3.2" fill="#EFE9DA"/>'
        + '<path d="M27 104 q9 11 18 0 Z" fill="#DCD5C6"/>'
        + '<path d="M40 96 q3 -4 0 -8" stroke="' + lt(c.robe, 0.5) + '" stroke-width="1.4" fill="none" opacity=".7"/></g>';
    }
    if (p === 'wan') { /* 面碗（宗训） */
      return '<g><path d="M27 104 q13 16 26 0 Z" fill="#EFE9DA"/>'
        + '<ellipse cx="40" cy="104" rx="13" ry="3.6" fill="#F7F2E6"/>'
        + '<path d="M32 100 q8 -4 16 0" stroke="#DCD5C6" stroke-width="1.2" fill="none"/></g>';
    }
    if (p === 'zhang') { /* 杖（老臣） */
      return '<path d="M72 120 L72 78" stroke="#8A6B3E" stroke-width="3" stroke-linecap="round"/>'
        + '<circle cx="72" cy="76" r="3.4" fill="#A6834C"/>';
    }
    if (p === 'shao') { /* 灶勺（尚食奉御） */
      return '<g><path d="M70 120 L58 96" stroke="#8A6B3E" stroke-width="2.6" stroke-linecap="round"/>'
        + '<ellipse cx="56" cy="93" rx="6.4" ry="4.4" fill="#C9C2B4"/></g>';
    }
    if (p === 'gong') { /* 拱手（江南使 · 全礼） */
      return '<path d="M34 114 q10 -12 20 -4 q10 -8 16 4 q-12 -2 -18 8 q-12 -6 -18 -8 Z" fill="' + lt(c.robe, 0.34) + '"/>';
    }
    return '';
  }

  /* ============ 合成一幅绘像 ============ */
  /* mode='fill' → slice 裁切填满（VN 立绘舞台用，避免 meet 在满框里 letterbox 变小）；
   * 缺省 meet 保持原样（手札小图/回忆舞台按整身显示，不被裁）。 */
  function figure(key, mode) {
    var c = FIG[key] || FIG.DEFAULT;
    c = ObjectAssign({ k: 'DEFAULT' }, c);
    if (!c.k) { c.k = 'unknown'; }
    var kid = c.k;
    var par = 'xMidYMax meet'; /* 一律 meet：整幅可见，底对齐，绝不裁切 */
    var s = '<svg class="fig-art" viewBox="0 0 100 120" preserveAspectRatio="' + par + '" '
      + 'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + (c.label || '角色绘像') + '">';
    s += '<defs><linearGradient id="tg' + kid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="' + lt(c.robe, 0.2) + '"/>'
      + '<stop offset="1" stop-color="' + dk(c.robe, 0.14) + '"/></linearGradient></defs>';
    var inner = '';
    inner += body(c);
    inner += face(c);
    inner += beard(c);
    inner += headdress(c);
    if (c.plume) { /* 红缨（赵匡胤 · 武人标） */
      inner += '<path d="M50 13 q-6 -8 -12 -6 q7 2 9 8 Z" fill="' + c.plume + '"/>';
    }
    inner += propOf(c);
    if (c.build === 'c') {
      /* 童：整体缩小、居中（脚位不离槽底） */
      s += '<g transform="translate(50,120) scale(0.82) translate(-50,-120)">' + inner + '</g>';
    } else {
      s += inner;
    }
    s += '</svg>';
    return s;
  }

  function ObjectAssign(target, src) {
    Object.keys(src).forEach(function (key) { target[key] = src[key]; });
    return target;
  }

  /* ============ 角色表（生图清单 §二 同源 · 18 角色） ============
   * robe 色取自清单既定子弹色赴型/锚点色：郭荣赭红 #63332A、其下青灰系；
   * prop/key 与 prompts.py 的键名一致，素材就位后直接注册升级。 */
  var FIG = {
    guorong: {
      k: 'guorong', label: '郭荣 · 官家', head: 'mian', build: 'm', beard: 'short',
      hair: '#2A2622', headColor: '#241F1D', robe: '#63332A', collar: '#EFE7D6',
      belt: '#3C332B', buckle: '#C9A227', prop: 'xiu', title: '后周世宗 · 38 岁'
    },
    nvguan: {
      k: 'nvguan', label: '女官 · 玩家', head: 'chuiji', build: 'f', beard: 'none',
      hair: '#2A2622', robe: '#4A6B72', sash: '#C9D6D1', collar: '#EFEAE0', prop: 'zhou',
      title: '宫中女官 · 玩家（A 线）'
    },
    shiguan: {
      k: 'shiguan', label: '史官 · 玩家', head: 'futou', build: 'm', beard: 'none',
      hair: '#2A2622', headColor: '#24282B', robe: '#35505A', collar: '#EFE7D6',
      belt: '#2E3026', buckle: '#9AA79B', prop: 'bi', title: '随驾史官 · 玩家（B 线）'
    },
    wangpu: {
      k: 'wangpu', label: '王朴 · 枢密使', head: 'futou', build: 'm', beard: 'short',
      hair: '#2A2622', headColor: '#2C3134', robe: '#3B3A78', collar: '#E7E1D4',
      belt: '#26244F', buckle: '#A8B0A6', prop: 'hu', title: '枢密使 · 45 岁 ·《平边策》'
    },
    wangpu2: {
      k: 'wangpu2', label: '王溥 · 宰相', head: 'futou', build: 'm', beard: 'none',
      hair: '#2A2622', headColor: '#31383A', robe: '#4B4E6B', collar: '#E7E1D4',
      belt: '#353850', buckle: '#B0A98F', prop: 'shang',
      /* ★与 A 级王朴（枢密使）是**不同人**，须防串脸：王溥 919 生（958 时 29 岁）无须、
       * 清瘦文弱（史称「酷好学，手不释卷」，后修《唐会要》《五代会要》）；
       * 王朴 906 生有须体瘦。两人同字不同人，运行时是 wangpu2 / wangpu 两键。 */
      title: '中书侍郎兼礼部尚书、同平章事 · 正二品 · 29 岁'
    },
    zhangyongde: {
      k: 'zhangyongde', label: '张永德 · 殿前都点检', head: 'pingjin', build: 'w', armor: false,
      beard: 'short', hair: '#2A2622', headColor: '#2A302F', robe: '#724E88', collar: '#E4DED2',
      belt: '#4B3359', buckle: '#B79A55', prop: 'jian', title: '殿前诸班 · 高平旧臣'
    },
    zhaokuangyin: {
      k: 'zhaokuangyin', label: '赵匡胤 · 殿前都指挥使', head: 'pingjin', build: 'w', armor: false,
      beard: 'short', hair: '#2A2622', headColor: '#2B2A27', robe: '#7F3A8A', collar: '#E4DED2',
      belt: '#5A2A63', buckle: '#C9A227', prop: 'shi',
      /* 10-27 去红缨（原 plume:'#9E3B32'）：①红缨属戎服配件，与「张/赵不穿戎服」决议冲突；
       * ②该色 H=5.0°，距帝袍绛红 #63332A(H=9.5°) 仅 4.5° —— 在缂丝/彩绘层上是红线隐患
       * （画面里出现第二处近朱红，会与官家袍色抢识别）。武人身份已由平巾帻+缺胯袍+佩剑承载。
       * 袍色 #7F3A8A 由 palette_zi.js 求解：从二品明度段 L=36.7、H=291.8°，
       * 与张永德(#724E88) ΔE=16.6、与李重进(#79668A) 同段拉开。 */
      title: '殿前都指挥使 · 从二品 · 后周殿前将（红线：不预赵宋）'
    },
    yinchongyi: {
      k: 'yinchongyi', label: '殷崇义 · 江南使', head: 'futou', build: 'm', beard: 'long',
      hair: '#2A2622', headColor: '#33302F', robe: '#D8D2CE', collar: '#9FB0AE',
      belt: '#6E6A66', buckle: '#B9A66A', prop: 'gong', title: '南唐吏部尚书 · 入贺天清节'
    },
    fuhou: {
      k: 'fuhou', label: '符后', head: 'huacha', build: 'f', beard: 'none',
      hair: '#2A2622', robe: '#8A6070', sash: '#E2CFD6', collar: '#F2EAE0', prop: 'xiu',
      /* ⚠️ 10-27 史实修正（勿回滚）：原写「小符后 · 宣慈皇后（959 立）」——错。
       * 「瓷心 · 碎瓮记」发生在**显德三年（956）春**，说话的是**宣懿皇后大符氏**：
       * 天雄军节度使符彦卿长女，显德元年(954)册后，显德三年七月廿一崩(956)，谥宣懿。
       * 小符后（宣慈）是她的妹妹，显德六年(959)才立——956 年她还不是皇后，
       * 把 959 的封号挂到 956 的回忆里，既是时序硬伤，也把两个人混成一个。
       * （唯一确证：朱厚照式的「同名两后」在五代只有符氏这一对姐妹，极易串。） */
      title: '宣懿皇后 · 大符氏（954 册 · 956 崩）'
    },
    guowei: {
      k: 'guowei', label: '郭威 · 先帝', head: 'bai', build: 'm', beard: 'long', old: true,
      hair: '#E6E1D6', headColor: '#6E6A63', robe: '#6B4230', collar: '#E7DFD0',
      belt: '#3A2E26', buckle: '#C9A227', prop: 'zhang', title: '周太祖 · 追忆（954 崩）'
    },
    fengdao: {
      k: 'fengdao', label: '冯道', head: 'bai', build: 'm', beard: 'long', old: true,
      hair: '#E6E1D6', headColor: '#706C64', robe: '#3A3048', collar: '#EDE6D8',
      belt: '#241C2E', buckle: '#9AA79B', prop: 'zhang', title: '历仕四朝十帝 · 追忆'
    },
    shaonian: {
      k: 'shaonian', label: '少年郭荣', head: 'futou', build: 'c', beard: 'none',
      hair: '#2A2622', headColor: '#2C3335', robe: '#4A6B72', collar: '#EFE7D6',
      belt: '#33403F', buckle: '#A8B0A6', prop: 'zhan', title: '少年茶事 · 追忆'
    },
    /* ===== 10-27 品色衣落地（辰时七人全在三品以上 ⇒ 依制全紫，颜色不能表达品级差）=====
     * 判据不是审美，是三条可测约束（脚本 .probe_qa/palette_zi.js 求解并验证）：
     *  ① 深色上限 V≤56% —— 真紫袍是沉紫；首版搜索为了凑 ΔE 出过 #a16bd6(V=84%) 亮薰衣草，不像五代常服。
     *  ② 品级 ↔ 明度**不重叠区段**，明度本身就是品级信号：
     *     正一品 L∈[19,25] < 正二品 L∈[26,34] < 从二品 L∈[35,48]（区段由已过目锚点反推，非先验假设）
     *  ③ 全部 21 对 ΔE(CIE76) ≥ 10（实测最小 13.2）—— 立绘槽是**单例**（TP._slot 单槽，
     *     TP.show 每句只显当前说话人），所以无需「并排同框可分」，但换人时观者要能认出换了人。
     * 色相收敛在紫核带 H∈[234,292]，天然避开帝袍绛红 #63332A(H9.5°) 的 345–20° 红线窗口。 */
    fanzhi: {
      k: 'fanzhi', label: '范质 · 守司徒', head: 'futou', build: 'm', beard: 'long',
      hair: '#2A2622', headColor: '#28323A', robe: '#4F2D61', collar: '#E7E1D4',
      belt: '#392046', buckle: '#A8B0A6', prop: 'hu',
      title: '守司徒兼门下侍郎、同平章事 · 正一品 · 宰相班首'
    },
    ligu: {
      k: 'ligu', label: '李谷 · 守司空', head: 'futou', build: 'm', beard: 'short',
      hair: '#2A2622', headColor: '#322F2A', robe: '#332947', collar: '#E7DFD0',
      belt: '#241C33', buckle: '#B0A98F', prop: 'hu',
      /* ★ 显德四年已罢相（守司空）。品级仍正一品、服色仍紫，但仪位低于现任三相
       *   ⇒ 剧情里排在范质之后说话。这是史实，不是编排。 */
      title: '守司空 · 正一品虚衔（显德四年罢相）'
    },
    lichongjin: {
      k: 'lichongjin', label: '李重进 · 侍卫亲军', head: 'pingjin', build: 'w', beard: 'short',
      hair: '#2A2622', headColor: '#2A2F2A', robe: '#79668A', collar: '#E4DED2',
      belt: '#544568', buckle: '#B79A55', prop: 'jian', armor: false,
      /* 从二品侍卫亲军马步军都指挥使 + 同平章事（使相）；与殿前都点检同级、高于殿前都指挥使。
       * 用户 10-28 裁定（更新 10-27）：李重进与张/赵同制**去甲**——甲胄入嘉礼寿宴是硬伤，
       * 不再留甲作 a2 差分 ⇒ armor:false，走缺胯袍。佩剑属朝会常制保留（prop:'jian'）。
       * 冠用平巾帻：武官常服冠（《旧唐书·舆服志》「武官及卫官服之」），不用武弁（朝服冠）。 */
      title: '侍卫亲军马步军都指挥使 + 同平章事 · 从二品'
    },
    /* ===== 10-27 品级核查（宫官/礼官四人；用户口径「要注意他们的官职和品级」）=====
     * ★ 关键分辨：唐制有**两个「尚食」**，勿混——
     *   ① 外廷殿中省尚食局：设「尚食奉御」二人，**正五品下**，属南衙男官系统；
     *   ② 内廷宫官六尚之尚食局：设「尚食」二人，**正五品**，女官。
     *   「尚食**令**」这个称谓属外廷令式系统（令/丞），故本作按**男官·正五品下**画，
     *   与 memory 已载「尚食奉御须为男（45 岁圆胖厨师）」一致。
     * 品色衣：正五品 ⇒ **绯**（四五品绯）。之前画成青绿 #5E6E62 是错的，已改。 */
    shangshiling: {
      k: 'shangshiling', label: '尚食奉御 · 灶事', head: 'jin', build: 'm', beard: 'short',
      hair: '#332C26', headColor: '#332C26', bandColor: '#8A7A63', robe: '#8E4A3C', collar: '#EFEAE0',
      belt: '#5E3128', buckle: '#B79A55', prop: 'shao',
      title: '殿中省尚食局 · 尚食奉御 · 正五品下（45 岁圆胖）'
    },
    zongxun: {
      k: 'zongxun', label: '宗训 · 黄衣小皇子', head: 'xiaoguan', build: 'c', beard: 'none',
      hair: '#2A2622', headColor: '#2A2622', robe: '#8A6B2E', collar: '#F2EADA',
      belt: '#4A3A1E', buckle: '#C9A227', prop: 'wan',
      /* ★史实更正（10-27 用户口径）：郭宗训是**950 后汉隐帝灭门之后**的第一子，
       * 生母正史不载（《新五代史·周家人传》「世宗子七人…皆不知其母为谁氏」）；
       * 用户口径与同人通说默认生母**符氏**，本作采此并标演义。
       * 被汉隐帝所杀的是前三子宗谊/宗诚/宗諴与元配刘氏，**不是宗训**。
       * 958 年虚岁六岁（959 即位七岁）—— 正合午时汴桥「六岁的眼睛」。
       * 皇子常服**黄衣**（非紫非绯、无官品），故保留杏黄不动。 */
      title: '皇子郭宗训 · 958 虚岁六岁（959 即位七岁）· 演义：生母符氏'
    },
    sizheng: {
      k: 'sizheng', label: '司正 · 投壶礼官', head: 'futou', build: 'm', beard: 'short',
      hair: '#2A2622', headColor: '#2E3431', robe: '#4E6E60', collar: '#EDE8DC',
      belt: '#33473D', buckle: '#A8B0A6', prop: 'shi',
      /* 「司正」非品级官，是《仪礼·乡饮酒礼》体系里的**宴饮监礼者**（「工告乐备…乃立司正」），
       * 投壶礼中与「司射」（司仪/裁判）分职：司射计筹、司正监礼罚酒（《礼记·投壶》）。
       * 故本作不给他套品级，按**礼官通用像**画，服色取深青绿（礼官执事色）。 */
      title: '投壶监礼官（《礼记·投壶》司正）· 通用礼官像'
    },
    shanggong: {
      k: 'shanggong', label: '尚宫 · 六尚之首', head: 'jin', build: 'f', beard: 'none',
      hair: '#332C26', bandColor: '#7A6A54', robe: '#8E4A3C', sash: '#D8D0C2', collar: '#EFE9DC',
      prop: 'zhou',
      /* 唐六尚皆**正五品**（《唐六典》卷十二「尚宫二人，正五品。六尚皆如之」），
       * 掌导引中宫，「凡六尚事物出纳文籍，皆印署之」——故她签发差事帖是有依据的。
       * 品色衣：正五品 ⇒ **绯**。原画灰褐 #6E5F52 无品级依据，已改。 */
      title: '宫官六尚之首 · 正五品 · 六尚文籍皆印署'
    },
    qijulang: {
      k: 'qijulang', label: '起居郎 · 门下省左史', head: 'futou', build: 'm', beard: 'short',
      hair: '#2A2622', headColor: '#2C3235', robe: '#3F6B58', collar: '#E7E1D4',
      belt: '#2A4739', buckle: '#A8B0A6', prop: 'bi',
      /* 起居郎二人，**从六品上**（《旧唐书·职官志》「起居郎二员，从六品上…掌起居注，
       * 录天子之言动法度，以修记事之史」）。品色衣：六七品 ⇒ **绿**（原深青不合制）。
       * 后周起居院实存：广顺二年诏「逐月给纸五百幅，付起居院」——本作史官线差事帖依据。 */
      title: '门下省起居郎 · 从六品上 · 掌修记事之史'
    },
    DEFAULT: {
      k: 'unknown', label: '未名 · 席间', head: 'futou', build: 'm', beard: 'none',
      hair: '#2A2622', headColor: '#2F3538', robe: '#5E8C8A', collar: '#E7E1D4',
      belt: '#3A352C', buckle: '#A8B0A6', prop: 'xiu', title: '未注册说话人（通用像）'
    }
  };

  /* ============ speaker → 角色 key 映射（唯一事实源） ============
   * 键 = js/data.js 里出现的 speaker 字面量；值 = 角色 key 或 '@self'（按玩家所选角色动态取）。
   * 抽象自称（「笔悬纸上」等）是选择项的视角名，归属玩家；⑥/⑦ 为女官线专属。 */
  var MAP = {
    '王朴': 'wangpu', '王溥': 'wangpu2', '张永德': 'zhangyongde', '赵匡胤': 'zhaokuangyin',
    '范质': 'fanzhi', '李谷': 'ligu', '李重进': 'lichongjin', '殷崇义': 'yinchongyi',
    '尚食奉御': 'shangshiling', '司正': 'sizheng', '黄衣小皇子': 'zongxun',
    '符后': 'fuhou', '郭威': 'guowei', '冯道': 'fengdao', '郭荣': 'guorong',
    /* 2026-11-01：原此处有 '柴荣': 'shaonian' —— 已删。郭荣随养父郭威改姓郭，
     * 本作对其一律称「郭荣」；「柴荣」是宋人追称，只出现在史实出处的引文里，
     * 不作 speaker。少年茶一幕要少年立绘，走 step 的显式 fig:'shaonian'。 */
    /* 10-27 补：回忆内以称谓出场的两位——漏在此表会掉 DEFAULT 通用像。
     * 「官家」＝在世宗本人（guorong）；「皇后」＝宣懿皇后大符氏（fuhou，956 崩）。
     * 注意：小符后（宣慈，959 立）绝不可套进 956 那段回忆——故 fuhou 的 title 已改为大符氏。 */
    '官家': 'guorong', '皇后': 'fuhou',
    '浇头未定': 'nvguan', '六岁的眼睛': 'nvguan',
    '尚宫': 'shanggong', '起居郎': 'qijulang',
    '殷崇义举觞，满殿安静': 'yinchongyi',
    '誊样在手': '@self', '笔悬纸上': '@self', '史官在此': '@self',
    '@self': '@self',   /* 2026-11-02：旁白 figs 通道用——['@self','官家'] 即「玩家+官家」同框 */
    '残页在灯下': '@self', '史笔之终': '@self'
  };

  /* ============ 真实素材注册（素材入包即自动升级） ============ */
  /* 当前 20 张已入仓且已过目：
   *   3 张锚点：郭荣(a1) / 女官 / 史官（双玩家 A/B 线基础形象）；
   *   12 张 10-28 审核入库（commit 478724c）：王朴/张永德/赵匡胤/殷崇义（A 级服色 v2）
   *     ＋ 符后/郭威/冯道（回忆语境像）＋ 司正/尚宫/起居郎/尚食奉御/郭宗训（B 级）；
   *   5 张 10-28 晚重生入库：范质（禁烛火）/李谷（双手捧觞）/王溥（单手举觞）/李重进（去甲）
   *     ＋ 少年郭荣（肩挑茶担，替换手提花篮旧版）。
   *   尚食奉御 10-28 晚由全身版裁切为半身重入仓（FIT 已按裁切版重测）。
   *   ★键名坑：生图侧 prompts.py 用 `shangling`，运行时图键是 `shangshiling`
   *     （prompts 键按「尚食奉御」字面，运行时按 FIG 定义），入包脚本里做了映射，
   *     这里必须写运行时键，否则 TQA.resolve 找不到文件、静默回落矢量像。 */
  /* ============ 立绘视觉居中表（2026-10-28 实测） ============
   * cx = 「头肩重心」归一化横坐标（alpha 包围盒上半段中心 / 图宽）。
   * ★为什么不用整体包围盒：B 级半身像衣摆/袖幅极宽（整体重心 0.39~0.657），
   *   但头肩重心都落在 0.48~0.56——用整体会把脸推歪。故统一按头肩重心对齐。
   * ratio = 图宽/图高：0.667=全身（A级），1=半身（B级）。
   * 新增立绘须补一行（缺省 cx=0.5 / ratio=0.667，不崩但不居中）。 */
  /* headW = 头宽/图宽；y0 = 头顶/图高（均由 alpha 实测）。
   * ★这两个值支撑「跨角色/跨景别头宽统一 + 眼线对齐」——见 applyFit。
   * headW 超过 0.30 的多半是近景/特殊构图（guorong_a2/a3、zongxun），
   * 归一化时会被 clamp，避免整张图被过度缩小。 */
  /* 半身像 anchor='dock-top' ⇒ 浮在对话框上方（不被压住）；可逐角色改
   * anchor（dock-top / dock-left / dock-right / stage-bottom）或补 dx/dy 像素微调。
   * 全身像不写 anchor，由 anchorOf() 按 ratio 兜底为 stage-bottom（脚被框压）。
   * ★kneel（2026-10-31 · 跪像分类，不是缩放系数）：标记**跪坐/盘坐**的立绘。
   *   实测：跪像在**单人档**里比例是对的（头宽 87~88px，与立像 88px 一致）——
   *   单人是按 headW 归一化的，跪像的头一样被拉到槽宽的 0.255。
   *   问题出在**双人档**：duoGeom 只按「铺满槽高 + 不溢半幅」求 k，完全不管 headW，
   *   于是头大的角色（跪像 headW 0.25~0.30、王孙 0.32）在高度受限的断点上会被放大
   *   25%（768 宽实测：王朴 129 vs 郭荣 103）。故 ⑵ 双人档补 headW 归一化。
   *   ⑶ 跪像还要免于「身高差 12% 封顶」——跪着的人本来就矮一截，不该把站着的那位拖下来。 */
  var FIT = {
    'fengdao_a1':      { cx: 0.550, ratio: 0.667, headW: 0.196, y0: 0.096, bw: 0.462, y1: 0.958, bwv: 0.444},
    'fuhou_a1':        { cx: 0.550, ratio: 0.667, headW: 0.300, y0: 0.081, bw: 0.786, y1: 0.954, bwv: 0.554, kneel: 1},
    'fuhou_e2':       { cx: 0.528, ratio: 0.667, headW: 0.250, y0: 0.074, bw: 0.715, y1: 0.955, bwv: 0.473, kneel: 1},
    'guorong_a1':      { cx: 0.504, ratio: 0.667, headW: 0.219, y0: 0.079, bw: 0.432, y1: 0.948, bwv: 0.431},
    'guorong_n1':     { cx: 0.491, ratio: 0.667, headW: 0.255, y0: 0.078, bw: 0.535, y1: 0.954, bwv: 0.529},
    'guorong_a2':      { cx: 0.512, ratio: 0.667, headW: 0.280, y0: 0.124, bw: 0.947, y1: 0.893, bwv: 0.610, kneel: 1},
    'guorong_a3':      { cx: 0.501, ratio: 0.667, headW: 0.282, y0: 0.136, bw: 0.833, y1: 0.905, bwv: 0.646, kneel: 1},
    'guorong_t':       { cx: 0.506, ratio: 0.667, headW: 0.264, y0: 0.078, bw: 0.445, y1: 0.949, bwv: 0.444},
    'guowei_a1':       { cx: 0.537, ratio: 0.667, headW: 0.181, y0: 0.082, bw: 0.505, y1: 0.955, bwv: 0.450},
    'guowei_e3':      { cx: 0.525, ratio: 0.667, headW: 0.243, y0: 0.089, bw: 0.960, y1: 0.939, bwv: 0.635, kneel: 1},
    'nvguan_a1':       { cx: 0.563, ratio: 0.667, headW: 0.175, y0: 0.080, bw: 0.375, y1: 0.965, bwv: 0.374},
    'shiguan_a1':      { cx: 0.561, ratio: 0.667, headW: 0.165, y0: 0.072, bw: 0.441, y1: 0.972, bwv: 0.440},
    'wangpu_a1':       { cx: 0.520, ratio: 0.667, headW: 0.259, y0: 0.130, bw: 0.755, y1: 0.947, bwv: 0.496, kneel: 1},
    'wangpu_e2':      { cx: 0.503, ratio: 0.667, headW: 0.315, y0: 0.109, bw: 0.432, y1: 0.927, bwv: 0.419},
    'yinchongyi_a1':   { cx: 0.581, ratio: 0.667, headW: 0.169, y0: 0.081, bw: 0.437, y1: 0.975, bwv: 0.436},
    'yinchongyi_e2':  { cx: 0.544, ratio: 0.667, headW: 0.180, y0: 0.079, bw: 0.436, y1: 0.976, bwv: 0.437},
    'yinchongyi_e3':  { cx: 0.475, ratio: 0.667, headW: 0.180, y0: 0.079, bw: 0.496, y1: 0.976, bwv: 0.497},
    'yinchongyi_e1':  { cx: 0.544, ratio: 0.667, headW: 0.180, y0: 0.079, bw: 0.443, y1: 0.976, bwv: 0.444},
    /* 2026-11-02：a1 换成重绘版（举觞 + 佩刀，见 _qa/_bak_zyd_regen），bwv 由 0.611 重测为 0.568。
     * 旧值沿用旧图的张臂姿势，把 kSide 压到 1.40 ⇒ 同框时比郭荣小一圈（用户反馈「张永德太小」）。 */
    'zhangyongde_a1':  { cx: 0.596, ratio: 0.667, headW: 0.178, y0: 0.075, bw: 0.636, y1: 0.97, bwv: 0.568},
    'zhangyongde_e1': { cx: 0.536, ratio: 0.667, headW: 0.160, y0: 0.081, bw: 0.479, y1: 0.970, bwv: 0.479},
    'zhaokuangyin_a1': { cx: 0.552, ratio: 0.667, headW: 0.199, y0: 0.072, bw: 0.529, y1: 0.971, bwv: 0.502},
    'zhaokuangyin_e3': { cx: 0.539, ratio: 0.667, headW: 0.212, y0: 0.077, bw: 0.523, y1: 0.973, bwv: 0.524},
    'zhaokuangyin_e1': { cx: 0.544, ratio: 0.667, headW: 0.199, y0: 0.071, bw: 0.514, y1: 0.973, bwv: 0.488},
    'qijulang_a1':     { cx: 0.488, ratio: 1,     headW: 0.216, y0: 0.041, anchor: 'dock-top', bw: 0.881, y1: 0.998, bwv: 0.723},
    'shanggong_a1':    { cx: 0.517, ratio: 1,     headW: 0.194, y0: 0.078, anchor: 'dock-top', bw: 0.781, y1: 0.998, bwv: 0.739},
    'shangshiling_a1': { cx: 0.495, ratio: 1,     headW: 0.211, y0: 0.077, anchor: 'dock-top', bw: 0.716, y1: 0.998, bwv: 0.659},
    'sizheng_a1':      { cx: 0.523, ratio: 1,     headW: 0.183, y0: 0.141, anchor: 'dock-top', bw: 0.97, y1: 0.998, bwv: 0.967},
    /* —— 2026-10-31 B 级半身 → A 级全身重出（用户裁定：与 A 级并排时景别不通约）——
     * 原 640² 胸像（ratio=1、anchor=dock-top）已作废，改为 1024×1536 全身（ratio=0.667、
     * 不写 anchor ⇒ anchorOf 按 ratio 兜底 stage-bottom，脚被对话框压住）。
     * ★headW 口径：自动量测（头顶 20% 段最大行宽）会被「举到肩高的觞」污染
     *   （lichongjin 量到 0.401、ligu 0.315），故改用「头顶定列、排除侧向器物」的净头宽
     *   × 1.40 的锚定换算（1.40 = 既有 guorong_a1 表值 0.219 / 同法实测 0.156），
     *   使五个值与同列同姿态的王朴 0.259、张永德 0.259 落在同一区间。 */
    'fanzhi_a1':       { cx: 0.474, ratio: 0.667, headW: 0.232, y0: 0.021, bw: 0.475, y1: 0.964, bwv: 0.472},
    'ligu_a1':         { cx: 0.480, ratio: 0.667, headW: 0.237, y0: 0.023, bw: 0.533, y1: 0.964, bwv: 0.533},
    'wangpu2_a1':      { cx: 0.467, ratio: 0.667, headW: 0.221, y0: 0.040, bw: 0.528, y1: 0.965, bwv: 0.528},
    'lichongjin_a1':   { cx: 0.577, ratio: 0.667, headW: 0.224, y0: 0.021, bw: 0.671, y1: 0.966, bwv: 0.657},
    'zongxun_a1':      { cx: 0.486, ratio: 0.667, headW: 0.265, y0: 0.041, bw: 0.534, y1: 0.953, bwv: 0.534},
    'shaonian_a1':     { cx: 0.556, ratio: 0.667, headW: 0.160, y0: 0.064, bw: 0.911, y1: 0.944, bwv: 0.910}
  };
  /* 归一化参数（[PLACEHOLDER] 有依据但需真机微调）：
   * HEAD_TARGET 0.235 → 槽宽 329 时头宽 ≈ 77px（手机上一张脸的可辨识下限之上）；
   * EYE_LINE 0.20 → 眼睛落在槽高 20% 处（三分法上三分之一略上），视线不压字。
   * HEAD_ASPECT 1.28 → 古风含发髻的头高/头宽近似比（用于由头宽推眼线高度）。 */
  var HEAD_TARGET = 0.255, HEAD_MIN_K = 0.60, HEAD_ASPECT = 1.28, HEADW_CLAMP = 0.32;
  /* 视觉重心补偿：按当前槽尺寸与 fit 模式，算出把「头肩重心」推到槽中线所需的位移。
   * cover 时内容宽度 = 槽高×ratio（图更瘦高则按高贴合）；contain 时内容宽度 = 槽宽。 */
  /* 视觉归一化：一次算出「横向补偿 shiftX / 纵向补偿 shiftY / 缩放 scale」。
   * 三个目标（调研结论：成熟 VN 切换角色时「相机、裁切、头宽、眼线」四者固定）：
   *  ① 头宽统一：headW×baseW×k = slotW×HEAD_TARGET ⇒ 不同角色/景别头部一样大；
   *  ② 眼线对齐：眼线 = y0 + 0.55×(头高)，头高 ≈ headW×ratio×HEAD_ASPECT；缩放后再平移，
   *     使所有角色眼睛落在槽高同一水平线 ⇒ 切换不跳；
   *  ③ 横向：按头肩重心推到槽中线（治朝左偏右/朝右偏左）。 */
  /* ★立绘定位（2026-10-28 三修 · 以「绝不裁切」为第一目标）
   * 前两版的问题：
   *   v1 按头宽放大 k，v2 按「脚踩槽底」上推 —— 当 k>1（窄头角色如史官 1.126）
   *   图片渲染高 703 > 槽高 624，上推 79px 后**头顶被切**（截图症状）。
   * 本版规则（顺序即优先级）：
   *   ① 完整显示：一律 contain 语义，s=1 不放大 —— 图片永远整个落在槽内，数学上不可能裁掉人物；
   *   ② 不插值放大：只缩不放（浏览器缩图质量远好于放大），保持清晰度；
   *   ③ 底对齐：图片底 = 槽底（全身像脚被对话框压住；半身像立在对话框上沿）；
   *   ④ 横向按头肩重心微调，但夹紧到「人物包围盒(bw)不出槽」，避免横向裁切。
   * 代价：头宽不再强行统一（会差 10~20%），这是"不裁切"的必然让步；
   * 要根治统一性须在**资产层**统一头部在画布中的位置。 */
  /* ★槽位解析（2026-10-31 接线）：显式 slot 优先，但**必须已注册**，否则回落默认槽。
   * 规则来自「槽位永不为空」：data.js 可以先挂上 slot，图还没出的槽自动退回 a1，
   * 等图入仓再跑一次什么都不用改（TQA.reg 里有了就升级）。 */
  function pickSlot(key, slot) {
    if (slot && TQA && TQA.reg && TQA.reg['char-' + key + '-' + slot]) { return slot; }
    return CHAR_ASSETS[key] || null;
  }
  function fitRow(key, slot) {
    var a = pickSlot(key, slot);
    return a ? (FIT[key + '_' + a] || null) : null;
  }

  /* ★双人同框（2026-10-31 建 · 2026-11-02 改按「身高标准表」驱动）
   * 三条硬规则，顺序即优先级：
   *  ① 身高按 STATURE 表：同景别的两人**不再被拉平**，而是各自落到自己的目标身高。
   *     v1 的做法是「共用 k + 身高差封顶 6%」，封顶换来的是「人人等高」，与史实身份、
   *     与用户逐条裁定的身高秩序全都对不上（玩家/张永德 两例即由此而来）。
   *  ② 可见带约束：全身像的衣摆落在对话框后面（看不见），横向只按「上半 60% 的实测宽度」
   *     bwv 约束；用整幅 bw 会把 390 屏上的两个人压到 340px 高（王朴 bw 0.754 全在衣摆上）。
   *     半身像整体在框上方，宽处就是可见处，仍用 bw。
   *  ③ 各留中缝：本体与半幅边缘至少 DUO_GAP 像素 ⇒ 两人之间恒定留 ≥2×DUO_GAP，
   *     且是「可见部分」不交叠，不是靠调数值碰运气。 */
  var DUO_GAP = 14;      /* 人物本体与半幅边缘的最小像素间隙 */
  var DUO_BLEED = 0.12;  /* 半身像允许向「画面外侧」多占的屏宽比例 */
  var DUO_BODY_BLEED = 0.05; /* 全身像双人档外溢额度。
   * ★11-02 下午起**全断点生效**（原只给横版宽屏）：因为口径改成"统一尺寸"后，
   *   举觞/佩刀一类宽姿势会把整对拖小（张永德 0.568 把两人压到 408px，比基准小 16%）。
   *   中缝不会因此变窄 —— 外溢额度一半用来放宽 kSide、一半用来把人物往外推（tc），
   *   两者相抵后**内缘位置不动**（数学上：宽度 +bleed、中心外移 +bleed/2）。
   *   多出来的是外侧的袖子/衣摆，落在屏幕边被裁，观感是"贴边"而不是"交叠"。 */
  var WIDE_MQ = (typeof matchMedia === 'function') ? matchMedia('(min-aspect-ratio:6/5) and (min-width:900px)') : null;

  /* ★身高标准表（2026-11-02 用户第二次裁定 · **现行**）
   * 量纲是「人物渲染高度 ÷ 郭荣的渲染高度」，不是缩放比：各张图在画布里本来就大小不一
   * （王朴 e2 头顶在 10.9%、范质 a1 在 2.1%，同一 k 出来能差一成）。
   * 分档留出可读台阶：相若 1.00 / 稍高 1.05 / 稍矮 0.94~0.95 / 矮 0.89~0.90 / 明显矮 0.86。
   * 390 档下 5% ≈ 24px、10% ≈ 49px 头顶差，一眼能排序；再小就与素材误差混在一起。
   * ★同日中午曾改口径为「同框大小一致」（DUO_K_REF 那套），下午用户又裁定回到本表 ——
   *   开关就是 USE_STATURE，两套都保留，切换只改一个布尔。 */
  var USE_STATURE = true;
  var STATURE = {
    guorong: 1.00,                                              /* 基准 · 官家 */
    ligu: 1.00, guowei: 1.00,                                   /* 与郭荣身高相若 */
    zhaokuangyin: 1.05,                                         /* 稍高于郭荣 */
    fengdao: 0.95, zhangyongde: 0.94, lichongjin: 0.94,         /* 稍矮于郭荣 */
    fanzhi: 0.90, yinchongyi: 0.90,                             /* 矮于郭荣 */
    /* 2026-11-02 手机实测定档：王朴要「接近张永德」（0.94）⇒ 0.93；王溥同为四相取 0.92 */
    wangpu: 0.93, wangpu2: 0.92,
    fuhou: 0.97,                                                /* 符后调大：原 0.89 偏小（坐姿另乘 KNEE_K） */
    nvguan: 0.86, shiguan: 0.86,                                /* 玩家：明显矮于郭荣 */
    shaonian: 0.80, zongxun: 0.60,                              /* 少年郭荣 / 六岁宗训 */
    sizheng: 0.94, shanggong: 0.94, shangshiling: 0.94, qijulang: 0.94   /* 配角（暂无同框） */
  };
  var STATURE_DEF = 0.94;
  function stature(key) {
    var s = STATURE[key];
    return (typeof s === 'number' && s > 0) ? s : STATURE_DEF;
  }

  /* ★统一尺寸（2026-11-02 下午口径，现行）
   * 基准 = 「郭荣 × 范质」同框时两人的大小：该对 cap 取小者 1.814，取整 1.81。
   * 落地不按 k 相等、按**渲染高度相等**：各图头顶在画布里的位置不同（y0 0.021~0.13），
   * 同一个 k 出来范质会比郭荣高 6%，所以用 k = C × REF_HF ÷ hf 把高度拉齐。
   * 一对里谁空间更紧就按谁让（C 取两者 cap 折算后的较小值）⇒ 两人始终一样高、也不会裁切。 */
  var DUO_K_REF = 1.81;
  /* 跪姿/坐姿系数（2026-11-02 用户要求「按跪姿实际体量」）：
   * 跪坐的人头顶约在站立者的 0.75 处；素材是「跪着但把画布撑满」，只能整体缩放表达，
   * 代价是头也跟着小 25%（读起来像"坐得稍靠后"，可接受）。只在**同框里有站立者**时生效，
   * 两边都跪或单人时不动 —— 那时没有参照物，缩了反而莫名其妙。 */
  var KNEE_K = 0.75;
  /* 参照身长：郭荣 a1 的「头顶→图底」占比（0.921）。全库以它为 1 个"标准身高"。 */
  var REF_HF = 1 - ((FIT.guorong_a1 && FIT.guorong_a1.y0) || 0.079);

  /* 双人档几何：只依赖「槽宽高」的纯函数 —— 验收页/对照图要离线算同一份 k，
   * 不能靠临时造 DOM 去量（那是另一条会漂移的实现）。 */
  function duoGeomWH(key, useSlot, W, H, stageW) {
    var f = fitRow(key, useSlot);
    if (!f) { return null; }
    if (!W || !H) { return null; }
    var baseW = Math.min(W, H * f.ratio);
    var baseH = baseW / f.ratio;
    var y0 = (typeof f.y0 === 'number') ? f.y0 : 0.08;
    var headW = Math.max(0.08, f.headW || 0.20);
    var bwFull = Math.max(0.10, Math.min(1, f.bw || 0.6));
    var bwVis = (f.ratio < 0.9 && f.bwv) ? Math.min(bwFull, f.bwv) : bwFull;
    /* 半身像（640² 胸像）整幅就是「脸+肩」，若同样按半幅硬夹，390 屏上两张脸只剩 38px。
     * 胸像的正确取景本来就允许肩部出画：给一个外溢额度，且只算在**靠屏幕边那一侧**
     * （见 duoPlan 的 tc 外推）——溢出的部分是肩，被画框裁掉；中缝交叠因此减半。
     * 全身像（2026-11-02 试验额度 DUO_BODY_BLEED）：衣摆不给额度，但「举臂/佩刀」
     *   一类姿势会把 bwv 撑宽（张永德 0.612），kSide 被压到 1.40，同框头宽比郭荣
     *   小 27%。给 5% 额度让 kSide 松一档：外侧多出画的是后背/衣摆，可接受。 */
    var bleed = (f.ratio >= 0.9) ? Math.round((stageW || W * 2) * DUO_BLEED)
              : Math.round((stageW || W * 2) * DUO_BODY_BLEED);
    var kTop = H / Math.max(1, baseH * (1 - y0));
    var kSide = (W + bleed - DUO_GAP * 2) / Math.max(1, bwVis * baseW);
    /* ★头宽归一化（10-31 加 · 11-02 撤出双人档）
     *   它曾是双人档的第三道帽：让所有人的头都落在 0.134×槽高。撤掉的理由是它**测错了**——
     *   FIT.headW 里有一批是自动量测被「举到肩高的觞 / 佩刀 / 张开的袖」污染的值
     *   （王朴 e2 记 0.315，实测净头宽 0.147；张永德记 0.178，实测 0.138），
     *   于是「头宽对齐」这件事在不同人身上要求了完全不同的 k：王朴被压到 1.36、
     *   郭荣被他的 1.06 倍上限拖到 1.08（实测头顶 553 vs 489，郭荣反而矮 22%）。
     *   现行口径改为信任素材本身的比例（33 张实测头宽 0.13~0.19、六到七头身，彼此差 ≤15%），
     *   身高只由 STATURE + 几何上限决定 ⇒ 头的大小自动随身高走，物理上也更对。 */
    var cap = Math.min(kTop * 0.96, kSide);
    if (!isFinite(cap) || cap <= 0) { cap = 1; }
    return {
      ratio: f.ratio, bw: bwVis, bleed: bleed, kneel: !!f.kneel,
      /* hf = 头顶 → 图底 占整幅的比例：底对齐渲染下，它就是「这个人占了多少槽高」 */
      hf: Math.max(0.5, 1 - y0),
      head: headW * baseW,               /* k=1 时的头宽（px）· 仅供 QA 打印 */
      cap: cap
    };
  }
  function duoGeom(slot, key, useSlot, stageW) {
    return duoGeomWH(key, useSlot, slot.clientWidth, slot.clientHeight, stageW);
  }
  /* 离线算一对的 k（对照图/验收页用）：与 duoPlan 同一份数学，不经 DOM。 */
  function duoKFor(key, useSlot, otherKey, otherSlot, W, H, stageW) {
    var me = duoGeomWH(key, useSlot, W, H, stageW);
    if (!me) { return null; }
    var ot = otherKey ? duoGeomWH(otherKey, otherSlot, W, H, stageW) : null;
    var sameCam = !!(ot && Math.abs(ot.ratio - me.ratio) < 0.05);
    var cutMe = (me.kneel && ot && !ot.kneel) ? KNEE_K : 1;
    var cutOt = (ot && ot.kneel && !me.kneel) ? KNEE_K : 1;
    var C;
    if (USE_STATURE) {
      /* 身高口径：把「郭荣的身长」当 1 个单位（= baseH × DUO_K_REF × REF_HF，与统一口径的
       * 尺寸一致），各人 k = C × REF_HF × S ÷ hf ⇒ 渲染高度 = 基准 × S，顺序即表里的顺序。
       * ★C 仍受 DUO_K_REF 封顶：不封顶时几何上限会把最高的一位顶到「几乎占满槽高」
       *   （实测郭荣 599/624），同框两人各自都有单人像那么大，画面立刻拥挤。 */
      var sMe = stature(key);
      C = Math.min(DUO_K_REF, me.cap * me.hf / (REF_HF * sMe));
      if (sameCam) { C = Math.min(C, ot.cap * ot.hf / (REF_HF * stature(otherKey))); }
      return { k: C * REF_HF * sMe / me.hf * cutMe, C: C, S: sMe, cut: cutMe,
               hf: me.hf, cap: me.cap, kneel: me.kneel, bw: me.bw };
    }
    C = Math.min(DUO_K_REF, me.cap * me.hf / (REF_HF * cutMe));
    if (sameCam) { C = Math.min(C, ot.cap * ot.hf / (REF_HF * cutOt)); }
    return { k: C * REF_HF / me.hf * cutMe, C: C, S: cutMe, cut: cutMe,
             hf: me.hf, cap: me.cap, kneel: me.kneel, bw: me.bw };
  }
  function duoPlan(slot) {
    var stageW = (slot.parentNode && slot.parentNode.clientWidth) || slot.clientWidth * 2;
    var me = duoGeom(slot, slot._tqKey, slot._tqSlot, stageW);
    if (!me) { return null; }
    var map = TP._sides || {};
    var other = null;
    Object.keys(map).forEach(function (k) {
      if (map[k] !== slot && map[k] && map[k]._tqKey) { other = map[k]; }
    });
    /* 数学全在 duoKFor 里（与对照图/验收页同一份实现），这里只负责取对手 + 外溢推位。
     * ★跪姿折扣要先折进上限（÷cut）：王朴跪坐档 cap 只有 1.73，若不折算，他会把
     *   站着的郭荣一起拖小 —— 明明他自己要乘 0.75，本来就占不满。 */
    var r = duoKFor(slot._tqKey, slot._tqSlot,
                    other ? other._tqKey : null, other ? other._tqSlot : null,
                    slot.clientWidth, slot.clientHeight, stageW);
    var k = r ? r.k : me.cap;
    if (!isFinite(k) || k <= 0) { k = 1; }
    if (k < 0.55) { k = 0.55; }   /* 兜底：再小就没有可读性了 */
    /* 有外溢额度时把人物往画面外侧推：溢出的落在屏幕边（被裁），中缝交叠减半 */
    var side = slot.getAttribute('data-side');
    var W = slot.clientWidth || 1;
    var tc = 0.5;
    if (me.bleed > 0) { tc = (side === 'l') ? 0.5 - me.bleed / (2 * W) : 0.5 + me.bleed / (2 * W); }
    return { k: k, bw: me.bw, bleed: me.bleed, tc: tc,
             C: r ? r.C : null, S: r ? r.S : 1, cut: r ? r.cut : 1, cap: me.cap };
  }

  function fitFor(key, slotW, slotH, fit, useSlot, opt) {
    var a = pickSlot(key, useSlot);
    var f = a ? FIT[key + '_' + a] : null;
    if (!f || !slotW || !slotH) { return { x: 0, y: 0, s: 1 }; }
    /* ① contain 基准：整幅先完整放进槽（宽高比更瘦高则按高贴合） */
    var baseW = Math.min(slotW, slotH * f.ratio);
    var baseH = baseW / f.ratio;
    var headW = Math.max(0.08, f.headW || 0.20);
    var bw = Math.max(0.10, Math.min(1, f.bw || 0.6));
    /* 双人档传入的可见带宽度（bwv）；单人不传 ⇒ 与接线前完全一致 */
    var bwUse = (opt && opt.bw) ? Math.max(0.10, Math.min(1, opt.bw)) : bw;
    var y0 = (typeof f.y0 === 'number') ? f.y0 : 0.08;
    /* ② 想放大到「头宽统一」需要多少倍 */
    var kHead = (slotW * HEAD_TARGET) / (headW * baseW);
    /* ③ 但放大有硬上限：放大后「人物包围盒」仍须完整落在槽内（裁的是空白不算裁）
     *    顶部：baseH*k*(1-y0) ≤ slotH；水平：bw*baseW*k ≤ slotW
     *    × 0.94 留 6% 安全余量：alpha bbox 量的是 24 阈值的实体，
     *    发丝/衣角半透明边缘还会再宽 2~4px。 */
    var kTop = slotH / Math.max(1, baseH * (1 - y0));
    var kSide = slotW / Math.max(1, bwUse * baseW) * 0.88;
    var kMax = Math.min(kTop * 0.94, kSide);
    /* ④ 缩小同样必要（宽头角色 k=1 时头就 99px，会明显比同场角色大一圈）；
     *    缩小永不产生裁切，只损失一点画面占比，故下限放到 HEAD_MIN_K。 */
    var k = Math.max(HEAD_MIN_K, Math.min(kHead, kMax));
    if (opt && opt.k) { k = opt.k; }   /* 双人档：头宽归一化后的共用基准 k 由 duoPlan 算好 */
    if (!isFinite(k) || k <= 0) { k = 1; }
    /* ⑤ 横向：按头肩重心推到槽中线（tc=0.5），再夹紧到「人物包围盒不出槽」。
     *    双人档可给 tc ≠ 0.5，把人物推到半幅内侧，但夹紧不变。 */
    var half = bwUse / 2;
    var cx = (typeof f.cx === 'number') ? f.cx : 0.5;
    /* ⑤b 水平镜像（双人档右位）：镜像以「图心」为轴，人物包围盒随之翻到 1-cx，
     *    故重心与夹紧边界都必须按 1-cx 重算 —— 只翻图不改 cx 的话，
     *    本来朝左的角色镜像后会更贴边，极端情况下被裁掉半张脸。 */
    if (opt && opt.mir) { cx = 1 - cx; }
    var pad = (slotW - baseW * k) / 2;
    var tc = (opt && typeof opt.tc === 'number') ? opt.tc : 0.5;
    var want = (tc - 0.5) * slotW - (cx - 0.5) * baseW * k;
    var bleed = (opt && opt.bleed) ? opt.bleed : 0;
    var xMin = -(cx - half) * baseW * k - pad - bleed;
    var xMax = slotW - pad - (cx + half) * baseW * k + bleed;
    /* 再内缩 3px：抗锯齿/半透明边缘不贴槽边 */
    xMin += 3; xMax -= 3;
    if (xMax < xMin) { xMin = xMax = (xMin + xMax) / 2; }
    var x = Math.max(xMin, Math.min(xMax, want));
    /* ⑥ 纵向：底对齐（脚踩槽底 / 半身像立在对话框上沿），scale 原点 bottom center */
    return { x: Math.round(x), y: 0, s: +k.toFixed(4), sx: (opt && opt.mir) ? -+k.toFixed(4) : +k.toFixed(4) };
  }
  function shiftFor(key, slotW, slotH, fit) { return fitFor(key, slotW, slotH, fit).x; }
  TP_SHIFT = shiftFor;

  /* ---- 原生朝向表（2026-11-02 **第三版**：程序化量测 + 大图人工复核）----
   * 'l' = 原图脸朝左；'r' = 朝右；'' = 端正正面。
   *
   * ★★ 前两版为什么是反的：判读用错了线索 —— 「看得见哪只耳朵」被读成了「朝哪边」。
   *     正确关系恰好相反：**看得见左耳 ⇒ 头转向观者右**（露出的是枕侧之外的那半张脸）。
   *     两版把这条读反，于是 12 个「朝右」被记成「朝左」，双人档按表去镜像，
   *     结果**郭荣在每一场都面朝画外**（用户反馈「人物均为背向屏幕」）。
   *
   * 现口径（可复算，不靠眼睛）：`_qa/facing_probe.py` 取头顶往下 20% 头身带，
   *   以幞头（暗部 max(RGB)<96）重心为颅轴，看皮肤（暖亮部）重心偏向哪侧 ——
   *   3/4 侧脸时脸整体朝鼻尖一侧偏移。偏移量按幞头宽度归一，|dx|<0.02 记「正面」。
   *   33 张全量跑过一遍，并与 760px 超特写人工核对 **10/10 一致**（郭荣 a1 / 范质 /
   *   王朴 a1+e2 / 张永德 / 赵匡胤 / 郭荣 a2+a3 / 王溥 / 符后 / 李重进）。
   *
   * 结论：本批素材**几乎全部原生朝右**，例外只有王溥(0.32 版)与郭荣的跪坐档 a2/a3。
   * 双人档镜像规则不变（左槽朝右、右槽朝左）：左槽「朝左才翻」，右槽「朝右才翻」。 */
  var FACE = {
    guorong: 'r', fuhou: 'r', guowei: 'r', fengdao: 'r',
    fanzhi: 'r', ligu: 'r', wangpu: 'r', wangpu2: 'l',
    zhangyongde: 'r', zhaokuangyin: 'r', yinchongyi: 'r', lichongjin: 'r',
    nvguan: 'r', shiguan: 'r', shaonian: 'r', zongxun: 'r',
    qijulang: 'l', shanggong: 'r', sizheng: 'r', shangshiling: 'r'
  };
  /* 同名不同档会有不同朝向（郭荣跪坐档 a2/a3 是朝左画的）—— 按「角色_槽」覆盖。 */
  var FACE_SLOT = { guorong_a2: 'l', guorong_a3: 'l' };
  function faceOfKey(key, slot) {
    if (slot) { var o = FACE_SLOT[key + '_' + slot]; if (o) { return o; } }
    return FACE[key] || '';
  }

  /* 把 fit 模式与横向补偿写到槽上：
   * - 全身像（ratio<0.9）→ cover：铺满舞台，人物本就不宽，左右裁到的是空白；
   * - 半身像（ratio≥0.9）→ contain：1:1 图在竖版窄槽里若用 cover 会被裁掉近半宽，
   *   半身像必须完整显示；尺寸比全身小是「景别」差异（近景 vs 中景），不是错误。
   * --fig-shift-x：按头肩重心把人物推到槽中线（治「朝左的偏右、朝右的偏左」）。 */
  function applyFit(slot, key, useSlot) {
    if (!slot) { return; }
    var fit = 'contain'; /* 2026-10-28：统一 contain（cover 会在窄头角色上裁掉头顶） */
    slot.setAttribute('data-fit', fit);
    /* 景别标记（2026-11-02）：ratio≥0.9 的 640² 胸像标记 bust——
     * 横屏 CSS 据此单独压半身像尺寸（全身像不受影响）。 */
    var _row = fitRow(key, useSlot);
    slot.setAttribute('data-body', (_row && _row.ratio >= 0.9) ? 'bust' : 'full');
    var w = slot.clientWidth, h = slot.clientHeight;
    if (!w || !h) { /* 尚未布局：下一帧再算 */ requestAnimationFrame(function () { applyFit(slot, key, useSlot); }); return; }
    /* 双人档：槽上带 data-duo="1" 时改用「同景别等高 + 可见带不出半幅」的一套参数。
     * plan 依赖「对面那个槽」当前是谁，所以两边算出来的 k 必然相同；
     * 换人后要两边一起重算 —— 见 TP.refit()（app.js 每次双人换人后都会调用）。 */
    var opt = null;
    /* 双人档镜像（2026-11-02 v2）：不再「右位一律镜像」，改按 FACE 原生朝向
     * 决定谁翻——目标是两人脸朝向彼此。判定放在这里而不是 CSS，
     * 因为镜像会改变包围盒重心，位姿必须一起重算（见 fitFor ⑤b）。 */
    var mir = false;
    if (slot.getAttribute('data-duo') === '1') {
      var dSide = slot.getAttribute('data-side');
      var nf = faceOfKey(key, useSlot);
      if (dSide === 'l') { mir = (nf === 'l'); }
      else if (dSide === 'r') { mir = (nf === 'r'); }
    }
    if (slot.getAttribute('data-duo') === '1') {
      var plan = duoPlan(slot);
      opt = plan ? { k: plan.k, bw: plan.bw, tc: plan.tc, bleed: plan.bleed, mir: mir } : null;
    }
    if (!opt && mir) { opt = { mir: mir }; }
    var m = fitFor(key, w, h, fit, useSlot, opt);
    slot.style.setProperty('--fig-shift-x', m.x + 'px');
    slot.style.setProperty('--fig-shift-y', m.y + 'px');
    slot.style.setProperty('--fig-scale', m.s);
    slot.style.setProperty('--fig-sx', m.sx == null ? m.s : m.sx);
  }
  var TP_APPLY = applyFit;

  /* 素材缺失角标（只在真的 fail 时出现；矢量模式不算「缺失」，是玩家自己选的） */
  function markMissing(slot, stt) {
    if (!slot || stt === 'none') { return; }
    if (TQA && TQA.assetsMode && TQA.assetsMode() === 'vector') { return; }
    if (slot.querySelector('.fig-miss')) { return; }
    var a = document.createElement('a');
    a.className = 'fig-miss';
    a.setAttribute('href', './assets-check.html');
    a.setAttribute('title', '素材自检');
    a.textContent = '立绘未载入 · 自检';
    slot.appendChild(a);
  }

  var CHAR_ASSETS = {
    guorong: 'a1', nvguan: 'a1', shiguan: 'a1',
    wangpu: 'a1', zhangyongde: 'a1', zhaokuangyin: 'a1', yinchongyi: 'a1',
    fuhou: 'a1', guowei: 'a1', fengdao: 'a1',
    fanzhi: 'a1', ligu: 'a1', wangpu2: 'a1', lichongjin: 'a1', shaonian: 'a1',
    sizheng: 'a1', shanggong: 'a1', qijulang: 'a1', shangshiling: 'a1', zongxun: 'a1'
  };
  /* 已入仓的派生槽。资源键 = char-<key>-<slot>，与 assets/chars/tq_chars_<key>_<slot>_final.webp 一一对应；
   * FIT 表已按同一 head_frac 口径补齐（33 条）。未指定 slot 时走 CHAR_ASSETS 默认槽。
   * ★guorong 的 a2/a3/t 早就入仓却一直没注册（只注册了 a1）——「guorong_t 已入仓未接线」
   *   的真实成因就在这里：不是没写 if，是资源根本没进 TQA.reg。10-31 一并补上。 */
  var DERIV = {
    guorong: ['a2', 'a3', 't', 'n1'], fuhou: ['e2'],
    zhaokuangyin: ['e1', 'e3'], yinchongyi: ['e1', 'e2', 'e3'],
    guowei: ['e3'], wangpu: ['e2'], zhangyongde: ['e1']
  };
  (function register() {
    if (!TQA) { return; }
    Object.keys(CHAR_ASSETS).forEach(function (k) {
      var pose = CHAR_ASSETS[k];
      TQA.reg['char-' + k] = { kind: 'image', src: './assets/chars/tq_chars_' + k + '_' + pose + '_final.webp' };
    });
    Object.keys(DERIV).forEach(function (k) {
      DERIV[k].forEach(function (slot) {
        TQA.reg['char-' + k + '-' + slot] = {
          kind: 'image', src: './assets/chars/tq_chars_' + k + '_' + slot + '_final.webp'
        };
      });
    });
  }());

  /* ============ 对外 API ============ */
  var TP = {
    FIG: FIG,
    MAP: MAP,
    /* speaker（含抽象自称）+ 存档角色 → 角色 key；未知也给 DEFAULT，绝不为空 */
    keyOf: function (speaker, selfKey) {
      if (!speaker) { return selfKey || 'shiguan'; }
      var k = MAP[speaker];
      if (k === '@self') { return selfKey || 'shiguan'; }
      if (!k) { return 'DEFAULT'; }
      return k;
    },
    meta: function (key) { return FIG[key] || FIG.DEFAULT; },
    /* 原生朝向：'l' 脸朝左 / 'r' 朝右 / '' 正面（回忆舞台镜像也用它，与双人档同一事实源） */
    faceOf: function (key, slot) { return faceOfKey(key, slot); },
    /* 身高系数（郭荣=1.00）：双人档与回忆舞台共用同一张表 */
    statureOf: function (key) { return stature(key); },
    /* 回忆舞台的缩放系数：目标是「人物渲染高度 = 正文双人档同款」（390 档 487px）。
     * 传入盒子尺寸后按像素目标反解 k —— 所以盒宽怎么变，人物都一样高（旧版写死 298px 盒高，
     * 2:3 的图在窄盒里由宽度决定高度，人物只有 234px，比正文小一半）。
     * 跪姿折扣与 STATURE 与正文同一套。 */
    frameScale: function (key, slot, partnerStanding, W, H) {
      var f = fitRow(key, slot);
      if (!f) { return 1; }
      var kn = !!f.kneel;
      var cut = (kn && partnerStanding) ? KNEE_K : 1;
      var s = (USE_STATURE ? stature(key) : 1) * cut;
      if (!W || !H) { return s; }                  /* 没给盒子尺寸时退回纯系数（兼容旧调用） */
      var baseW = Math.min(W, H * f.ratio);
      var baseH = baseW / f.ratio;
      var hf = Math.max(0.5, 1 - ((typeof f.y0 === 'number') ? f.y0 : 0.08));
      var vw = (global.innerWidth || 390);
      /* 正文同款目标高度：292 × DUO_K_REF × REF_HF ≈ 487（390 档），随屏宽小幅缩放 */
      var target = 292 * DUO_K_REF * REF_HF * Math.max(0.86, Math.min(1.35, vw / 390));
      var k = target * s / Math.max(1, baseH * hf);
      var kTop = H / Math.max(1, baseH * hf);
      if (k > kTop * 0.98) { k = kTop * 0.98; }
      return k;
    },
    /* QA 口：把某槽的双人档内部量（cap / hf / C / k）吐出来，验收脚本按它核对身高比 */
    duoDebug: function (slot) { return duoPlan(slot); },
    /* 离线算 k：对照图/验收页用（与 duoPlan 同一份数学，不经过 DOM） */
    duoKFor: duoKFor,
    stature: STATURE,
    useStature: function () { return USE_STATURE; },
    kneeK: function () { return KNEE_K; },
    /* 名牌文本：speaker 原样优先，缺省用角色称谓 */
    labelOf: function (speaker, selfKey) {
      if (speaker) { return speaker; }
      return this.meta(selfKey || 'shiguan').label;
    },
    figure: figure,
    /* 停靠方位：优先角色配置，否则按宽高比兜底（半身浮框上 / 全身踩舞台底） */
    anchorOf: function (key, slot) {
      var f = fitRow(key, slot);
      if (!f) { return null; }
      return f.anchor || (f.ratio >= 0.9 ? 'dock-top' : 'stage-bottom');
    },
    /* 像素微调（dx 正=右，dy 正=下） */
    offsetOf: function (key, slot) {
      var f = fitRow(key, slot);
      return f ? { dx: f.dx || 0, dy: f.dy || 0 } : { dx: 0, dy: 0 };
    },
    fitFor: fitFor, /* 供验收脚本核对头宽/眼线 */
    fitOf: function (key, slot) { return fitRow(key, slot); },
    /* 断点/旋屏/单↔双切换后槽尺寸变化：重算所有在场立绘（不改当前角色） */
    refit: function () {
      var map = TP._sides || (TP._slot ? { main: TP._slot } : {});
      Object.keys(map).forEach(function (k) {
        var n = map[k];
        if (n && n._tqKey) {
          applyFit(n, n._tqKey, n._tqSlot);
          /* 记下这次算 k 用的槽尺寸：applyFit 依赖 clientWidth/clientHeight，
           * 锚点（--fig-dock-lift）一变槽高就变，上一版没有回头重算的机制（见 refitIfResized） */
          n._tqFitW = n.clientWidth; n._tqFitH = n.clientHeight;
        }
      });
    },
    /* ★槽尺寸变了但没被 refit 覆盖时补一次（2026-11-02 实测到的真 bug）：
     *   setPortrait 的顺序是 show(l) → show(r) → refit() → reAnchorSoon()，而
     *   reAnchorSoon 里才写 --fig-dock-lift、才逐槽写 data-anchor —— 也就是 refit 时
     *   槽高还是「对话框未测量」时的初值（实测 507），之后长到 624 就没人重算了。
     *   症状：整场第一对同框的 k 停在旧高度上（王朴那对郭荣 1.81，正确值 1.987），
     *   两人身高比因此偏 1%（王朴反而高），而后续场景全对 —— 最难查的一类错。 */
    refitIfResized: function () {
      var map = TP._sides || {}, dirty = false;
      Object.keys(map).forEach(function (k) {
        var n = map[k];
        if (!n || !n._tqKey) { return; }
        if (n._tqFitW !== n.clientWidth || n._tqFitH !== n.clientHeight) { dirty = true; }
      });
      if (dirty) { TP.refit(); }
    },

    /* ---- 立绘槽：先画占位，再异步升级真图（永不空槽） ----
     * 2026-10-31：由「单槽」扩成「舞台 + 若干按侧的槽」。_sides 是 side→节点 的映射
     * （main 单人 / l 左 / r 右），TP.show(key,{side:'r'}) 即可分别驱动。
     * 兼容：老的 bindSlot(node) 仍然可用，等价于「只有一个 main 槽」。 */
    _slot: null,
    _sides: null,
    _zone: null,
    bindSlot: function (node) { TP._slot = node; TP._sides = node ? { main: node } : null; },
    bindStage: function (zone) {
      TP._zone = zone || null;
      TP._sides = {};
      if (!zone) { TP._slot = null; return; }
      [].slice.call(zone.querySelectorAll('.slot.sp-fig')).forEach(function (n) {
        var s = n.getAttribute('data-side') || 'main';
        if (s === 'off') { return; }   /* off = 空槽，不参与渲染与锚定 */
        TP._sides[s] = n;
      });
      TP._slot = TP._sides.main || TP._sides.r || TP._sides.l || null;
    },
    slotOf: function (side) {
      if (TP._sides && TP._sides[side]) { return TP._sides[side]; }
      return side === 'main' ? TP._slot : null;
    },
    show: function (key, opts) {
      var side = opts && opts.side;
      var slot = (side && TP.slotOf(side)) || TP._slot;
      if (!slot) { return; }
      /* ★派生槽（2026-10-31）：opts.slot 指定表情/姿态档，如 'e2' 'n1' 't'。
       * 未注册或未指定 → 回落 CHAR_ASSETS 默认槽，渲染行为与接线前完全一致。 */
      var useSlot = pickSlot(key, opts && opts.slot);
      if (slot._tqKey === key && slot._tqSlot === useSlot) { return; }
      var first = !slot._tqKey;
      slot._tqKey = key;
      slot._tqSlot = useSlot;
      var gen = (slot._tqGen || 0) + 1; /* 世代号：异步 resolve 回来时若已换人或换槽则丢弃 */
      slot._tqGen = gen;
      var c = TP.meta(key);
      var ak = 'char-' + key + (useSlot && useSlot !== CHAR_ASSETS[key] ? '-' + useSlot : '');
      /* ★热路径（2026-11-02）：该角色的图已经解过（预取命中 / 本局已出过场），
       *   就**不画矢量占位**——旧版无条件先 `innerHTML = figure()`，
       *   即使真图在内存里也要付一次「建 SVG 串 + 解析 + 弃掉 + 0.26s 淡入」，
       *   玩家看到的是「占位闪一下再换成真人」，切换显得又慢又跳。
       *   命中时直接上图，并打 data-instant 关掉入场动画（见 css .fig-real[data-instant]）。 */
      var hot = !!(TQA && TQA.reg[ak] && TQA.status[ak] === 'ok' && TQA.imgs[ak]);
      var canReal = !!(TQA && TQA.reg[ak]);
      /* ★占位闪现（2026-11-02 手机实测）：旧逻辑「没命中热路径就先画矢量剪影」，
       *   于是每次换人都先冒一张代码绘像，几十毫秒后再被真图顶掉 —— 玩家看到的是闪一下。
       *   现在分三种：
       *     hot       已在内存 ⇒ 直接上图；
       *     canReal   真图可期（已注册、没被设成 vector）⇒ **先留空**，图到即上；
       *               404 / 超时 / 解码失败时再补矢量占位（那时是"回退"，不是"闪现"）；
       *     其余      没有素材（纯矢量角色）⇒ 直接画矢量。 */
      function paintVector() {
        slot.innerHTML = figure(key, opts && opts.fill ? 'fill' : null);
        slot.removeAttribute('data-fit');
        applyFit(slot, key, useSlot);
      }
      if (hot) {
        slot.innerHTML = '';
        slot.removeAttribute('data-fit');
      } else if (!canReal) {
        paintVector();
      } else {
        slot.innerHTML = '';           /* 真空窗：宁可空一瞬，也不要先给假图 */
        slot.removeAttribute('data-fit');
      }
      applyFit(slot, key, useSlot);
      /* 名牌先就位：paintReal 要往 .fig-meta .sub 里写「已入仓」标记 */
      var ifig = document.createElement('div');
      ifig.className = 'fig-meta';
      ifig.innerHTML = '<div class="tag">' + c.label + '</div>'
        + '<div class="sub">' + (c.title || '') + '</div>';
      slot.appendChild(ifig);
      function paintReal(src, instant) {
        var old = slot.querySelector('.fig-real');
        if (old) { old.parentNode.removeChild(old); }
        var pic = document.createElement('img');
        pic.className = 'fig-real';
        if (instant) { pic.setAttribute('data-instant', '1'); }
        pic.src = src;
        pic.alt = (TP.meta(key).label || '') + ' 立绘';
        slot.insertBefore(pic, slot.firstChild);
        var art = slot.querySelector('.fig-art');
        if (art && art.parentNode) { art.parentNode.removeChild(art); }
        var m = slot.querySelector('.fig-meta .sub');
        if (m) { m.textContent = (TP.meta(key).title || '') + ' · AI 立绘已入仓'; }
        slot.classList.add('has-real');
        applyFit(slot, key, useSlot);
      }
      if (hot) { paintReal(TQA.imgs[ak].src, true); }
      else if (canReal) {
        TQA.resolve(ak, function (stt) {
          if (slot._tqGen !== gen || slot._tqKey !== key || slot._tqSlot !== useSlot) { return; }
          if (stt === 'timeout') {
            /* 只是慢：先补一张矢量占位兜住，图一到就地换成真图 */
            if (!slot.querySelector('.fig-real')) { paintVector(); }
            TQA.onLate(ak, function (st2) {
              if (st2 !== 'ok' || slot._tqGen !== gen || slot._tqKey !== key || slot._tqSlot !== useSlot) { return; }
              if (TQA.imgs[ak]) { paintReal(TQA.imgs[ak].src, true); }
            });
            return;
          }
          if (stt !== 'ok') {
            /* 真失败（404 / 解码失败 / 矢量模式）：在槽角上挂一个可见角标。
             * 以前这里只是静默 `return`，玩家看到的是「一张矢量剪影」，
             * 分不清是「设计如此」还是「素材没载入」——实机排障全靠猜。 */
            if (!slot.querySelector('.fig-real')) { paintVector(); }
            markMissing(slot, stt);
            return;
          }
          var im = TQA.image(ak);
          if (!im) { return; }
          paintReal(im.src, false);
        }, { hot: true });   /* 屏上优先：预取队列见到 _hot 就让路 */
      } else {
        slot.classList.remove('has-real');
      }
      if (first) { slot.classList.add('fig-fade'); } /* 首次不做渐显，避免首帧闪 */
      /* 通知宿主重算「立绘↔对话框」锚点：角色切换可能改变停靠方位（全身/半身） */
      if (typeof global.TQ_ON_FIG_CHANGE === 'function') { global.TQ_ON_FIG_CHANGE(key, useSlot); }
    },
    /* 把真立绘画进任意节点（回忆舞台 mem-fig 等自定义容器）：
     * 未注册返回 false，调用方的矢量占位保留。node._tqTok 防「快速连点换人」时旧图后到。 */
    /* 有没有真素材（= 已注册到 TQA.reg）。回忆舞台据此决定「先留空」还是「画矢量」，
     * 与 realInto 用同一个键规则，避免两处判断漂移。 */
    hasAsset: function (key, slot) {
      if (!TQA || !key || key === 'DEFAULT') { return false; }
      var a = pickSlot(key, slot);
      if (!a) { return false; }
      return !!TQA.reg['char-' + key + (a !== CHAR_ASSETS[key] ? '-' + a : '')];
    },
    /* opts.fallback：真图失败/超时时画矢量占位（只在"回退"时调用，不在首帧调用） */
    realInto: function (node, key, slot, opts) {
      if (!node || !TQA) { return false; }
      var a = pickSlot(key, slot);
      if (!a) { return false; }
      var ak = 'char-' + key + (a !== CHAR_ASSETS[key] ? '-' + a : '');
      if (!TQA.reg[ak]) { return false; }
      var fb = opts && typeof opts.fallback === 'function' ? opts.fallback : null;
      var tok = (node._tqTok || 0) + 1;
      node._tqTok = tok;
      function put(im) {
        var pic = document.createElement('img');
        pic.className = 'mem-fig-real';
        /* ★2026-11-02 真机：立绘是 50~70KB 的 webp，解码在主线程同步做会掉帧，
         *   挂上去的那一瞬最容易「卡一下」。decoding=async 让它异步解；
         *   draggable=false + pointer-events:none（css 全局）确保它既不能被拖，
         *   也不会成为长按的命中目标（宿主会把 <img> 认成「图片」弹保存菜单）。 */
        pic.setAttribute('decoding', 'async');
        pic.setAttribute('draggable', 'false');
        pic.src = im.src;
        pic.alt = (TP.meta(key).label || '') + ' 立绘';
        node.innerHTML = '';
        node.appendChild(pic);
      }
      /* 命中内存里的图：同步落图，回忆舞台不闪占位 */
      if (TQA.status[ak] === 'ok' && TQA.imgs[ak]) { put(TQA.imgs[ak]); return true; }
      TQA.resolve(ak, function (stt) {
        if (node._tqTok !== tok) { return; }
        if (stt === 'timeout') {
          /* 慢网：先补一张矢量兜住（此时是"回退"，不是首帧闪现），图到即换真图 */
          if (fb && !node.querySelector('img.mem-fig-real')) { fb(); }
          TQA.onLate(ak, function (st2) {
            if (st2 !== 'ok' || node._tqTok !== tok) { return; }
            if (TQA.imgs[ak]) { put(TQA.imgs[ak]); }
          });
          return;
        }
        if (stt !== 'ok') { if (fb) { fb(); } return; }
        var im = TQA.image(ak);
        if (!im) { return; }
        put(im);
      }, { hot: true });
      return true;
    },
    /* 资源键：'char-<key>[-<slot>]'（默认槽不带后缀）——宿主做预取/预热时用，
     * 不要在外面自己拼字符串，槽名规则一改就会对不上。 */
    akOf: function (key, slot) {
      var a = pickSlot(key, slot);
      return a ? ('char-' + key + (a !== CHAR_ASSETS[key] ? '-' + a : '')) : null;
    },
    /* 批量预热：把「接下来的几个说话人」提前拉进内存，切人时直接命中热路径。
     * opt = { conc: 3, done: fn }；未注册的角色自动跳过。 */
    prefetch: function (keys, opt) {
      if (!TQA || !TQA.preload) { return; }
      var ak = [];
      (keys || []).forEach(function (k) {
        var a = TP.akOf(k);
        if (a) { ak.push(a); }
      });
      TQA.preload(ak, opt);
    },
    /* 供 dev/验证：全部 key、默认槽、已注册的派生槽（接线盘点用） */
    list: function () {
      return Object.keys(FIG).filter(function (k) { return k !== 'DEFAULT'; }).map(function (k) {
        var slots = (DERIV[k] || []).slice();
        return {
          key: k, label: FIG[k].label, slot: CHAR_ASSETS[k] || null,
          real: !!(TQA && TQA.reg['char-' + k]),
          slots: slots,
          slotsReal: slots.filter(function (s) { return !!(TQA && TQA.reg['char-' + k + '-' + s]); })
        };
      });
    }
  };

  global.TP = TP;
})(window);
