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
      case 'jin': /* 巾帼软巾（尚食令 · 灶事） */
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
       * 张永德 / 赵匡胤 已置 armor:false，改走缺胯袍（两侧开衩证武臣身份），保留武人体量但不露甲片。
       * 李重进（侍卫亲军）仍画甲，留作 a2 戎服差分。
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
    if (p === 'shao') { /* 灶勺（尚食令） */
      return '<g><path d="M70 120 L58 96" stroke="#8A6B3E" stroke-width="2.6" stroke-linecap="round"/>'
        + '<ellipse cx="56" cy="93" rx="6.4" ry="4.4" fill="#C9C2B4"/></g>';
    }
    if (p === 'gong') { /* 拱手（江南使 · 全礼） */
      return '<path d="M34 114 q10 -12 20 -4 q10 -8 16 4 q-12 -2 -18 8 q-12 -6 -18 -8 Z" fill="' + lt(c.robe, 0.34) + '"/>';
    }
    return '';
  }

  /* ============ 合成一幅绘像 ============ */
  function figure(key) {
    var c = FIG[key] || FIG.DEFAULT;
    c = ObjectAssign({ k: 'DEFAULT' }, c);
    if (!c.k) { c.k = 'unknown'; }
    var kid = c.k;
    var s = '<svg class="fig-art" viewBox="0 0 100 120" preserveAspectRatio="xMidYMax meet" '
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
      title: '小符后 · 宣慈皇后（959 立）'
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
      k: 'shaonian', label: '少年柴荣', head: 'futou', build: 'c', beard: 'none',
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
      belt: '#544568', buckle: '#B79A55', prop: 'jian',
      /* 从二品侍卫亲军马步军都指挥使 + 同平章事（使相）；与殿前都点检同级、高于殿前都指挥使。
       * 用户 10-27 裁定：张/赵去甲，**李重进留甲作 a2 差分** ⇒ armor 保持默认（有甲）。
       * 冠改平巾帻：武官常服冠（《旧唐书·舆服志》「武官及卫官服之」），不用武弁（朝服冠）。 */
      title: '侍卫亲军马步军都指挥使 + 同平章事 · 从二品'
    },
    /* ===== 10-27 品级核查（宫官/礼官四人；用户口径「要注意他们的官职和品级」）=====
     * ★ 关键分辨：唐制有**两个「尚食」**，勿混——
     *   ① 外廷殿中省尚食局：设「尚食奉御」二人，**正五品下**，属南衙男官系统；
     *   ② 内廷宫官六尚之尚食局：设「尚食」二人，**正五品**，女官。
     *   「尚食**令**」这个称谓属外廷令式系统（令/丞），故本作按**男官·正五品下**画，
     *   与 memory 已载「尚食令须为男（45 岁圆胖厨师）」一致。
     * 品色衣：正五品 ⇒ **绯**（四五品绯）。之前画成青绿 #5E6E62 是错的，已改。 */
    shangshiling: {
      k: 'shangshiling', label: '尚食令 · 灶事', head: 'jin', build: 'm', beard: 'short',
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
    '尚食令': 'shangshiling', '司正': 'sizheng', '黄衣小皇子': 'zongxun',
    '符后': 'fuhou', '郭威': 'guowei', '冯道': 'fengdao', '郭荣': 'guorong', '柴荣': 'shaonian',
    '浇头未定': 'nvguan', '六岁的眼睛': 'nvguan',
    '尚宫': 'shanggong', '起居郎': 'qijulang',
    '殷崇义举觞，满殿安静': 'yinchongyi',
    '誊样在手': '@self', '笔悬纸上': '@self', '史官在此': '@self',
    '残页在灯下': '@self', '史笔之终': '@self'
  };

  /* ============ 真实素材注册（素材入包即自动升级） ============ */
  /* 10-27 服色 v2 四人入仓：王朴/张永德/赵匡胤/殷崇义（用户已过目）。
   * 未入仓者继续走本文件的矢量绘像：符后 / 郭威 / 冯道 / 少年（均属「回忆」语境，
   * 其立绘要等瓷心回忆界面改成叙事/对话界面之后再接，见 memory 10-27）。 */
  var CHAR_ASSETS = {
    guorong: 'a1', nvguan: 'a1', shiguan: 'a1',
    wangpu: 'a1', zhangyongde: 'a1', zhaokuangyin: 'a1', yinchongyi: 'a1'
  };
  (function register() {
    if (!TQA) { return; }
    Object.keys(CHAR_ASSETS).forEach(function (k) {
      var pose = CHAR_ASSETS[k];
      TQA.reg['char-' + k] = { kind: 'image', src: './assets/chars/tq_chars_' + k + '_' + pose + '_final.webp' };
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
    /* 名牌文本：speaker 原样优先，缺省用角色称谓 */
    labelOf: function (speaker, selfKey) {
      if (speaker) { return speaker; }
      return this.meta(selfKey || 'shiguan').label;
    },
    figure: figure,

    /* ---- 立绘槽：先画占位，再异步升级真图（永不空槽） ---- */
    _slot: null,
    bindSlot: function (node) { TP._slot = node; },
    show: function (key) {
      var slot = TP._slot;
      if (!slot) { return; }
      if (slot._tqKey === key) { return; }
      var first = !slot._tqKey;
      slot._tqKey = key;
      var c = TP.meta(key);
      slot.innerHTML = figure(key);
      var ifig = document.createElement('div');
      ifig.className = 'fig-meta';
      ifig.innerHTML = '<div class="tag">' + c.label + '</div>'
        + '<div class="sub">' + (c.title || '') + '</div>';
      slot.appendChild(ifig);
      if (first) { slot.classList.add('fig-fade'); } /* 首次不做渐显，避免首帧闪 */
      /* 真图升级（未注册 → resolve 'none'，维持占位） */
      var ak = 'char-' + key;
      if (TQA && TQA.reg[ak]) {
        TQA.resolve(ak, function (stt) {
          if (stt !== 'ok' || slot._tqKey !== key) { return; }
          var im = TQA.image(ak);
          if (!im) { return; }
          var pic = document.createElement('img');
          pic.className = 'fig-real';
          pic.src = im.src;
          pic.alt = (TP.meta(key).label || '') + ' 立绘';
          slot.insertBefore(pic, slot.firstChild);
          var art = slot.querySelector('.fig-art');
          if (art && art.parentNode) { art.parentNode.removeChild(art); }
          var m = slot.querySelector('.fig-meta .sub');
          if (m) { m.textContent = (TP.meta(key).title || '') + ' · AI 立绘已入仓'; }
          slot.classList.add('has-real');
        });
      } else {
        slot.classList.remove('has-real');
      }
    },
    /* 供 dev/验证：全部 key 与是否有素材 */
    list: function () {
      return Object.keys(FIG).filter(function (k) { return k !== 'DEFAULT'; }).map(function (k) {
        return { key: k, label: FIG[k].label, real: !!(TQA && TQA.reg['char-' + k]) };
      });
    }
  };

  global.TP = TP;
})(window);
