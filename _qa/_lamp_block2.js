/* ============================================================
   挑灯 · 一盏灯六件（2026-11-02 按《挑灯_油灯机制改进方案_v1》重做）
   ------------------------------------------------------------
   改的是**物理**，不是画风：
   ① 油在盂里（y118..138），罩只是挡风的烟囱 —— 罩内不再出现油面；
   ② 量程＝盂深，读数＝「分」（10 分到盂沿、七分线在 y=124），不是"罩高百分比"；
   ③ 三拍是同一次使用：擦罩（带罩 dy=0）→ 提罩注油（dy=−34）→ 引火/起焰/落罩（dy→0）。
   一眼判据：任一帧里"油面"的上下边界只可能落在盂内。
   ★实现上分两块：`lamp*HTML()` 只在进拍时画一次骨架；
     会随帧变的那几个节点（油面 / 刻线柱 / 读数 / 焰 / 罩）由 `patchLamp()` 逐帧补 ——
     罩要留 CSS transition，整块重绘会把"提罩"和"落罩"变成硬切。 */
var LP = {
  rimY: 118, botY: 138, mark7: 124,     /* 盂沿 / 内底 / 七分线 */
  pxPerFen: 2,                          /* 1 分 = 2px：盂深 20px = 10 分，七分线正好 7 分 */
  lift: 34,                             /* 罩提起高度 */
  rate: 3.2,                            /* 注速 px/s（空→溢约 6.2s，目标带 7px ≈ 2.2s 容错窗） */
  shade: 'M110 64 h80 l-8 76 h-64 Z',
  bowlOut: 'M124 118 h52 l-5 15 q-21 6 -42 0 Z',
  bowlIn: 'M128 119 h44 l-4 13 q-18 5 -36 0 Z'
};
function lampFen(y){ return Math.max(0, Math.min(10, (LP.botY - y) / LP.pxPerFen)); }
function lampBand(y){ return y >= LP.mark7 && y <= 131; }        /* 3.5–7 分：目标带 */

/* 案面：灯坐在这儿，油溢出来也流在这儿 */
function lampBenchHTML(){
  return '<ellipse cx="150" cy="150" rx="52" ry="7.4" fill="#7C6A4E" opacity=".1"/>' +
    /* 溢出来的油：先画着、透明度 0；真溢了由 patchLamp() 亮起来（判据 L5） */
    '<g id="spill" opacity="0">' +
      '<path d="M172 139 q6 5 3 10 q5 3 2 6 l-12 1 q-3 -6 1 -9 q-4 -5 6 -8 Z" fill="#C98F35" opacity=".6"/>' +
      '<ellipse cx="168" cy="150" rx="13" ry="3" fill="#C98F35" opacity=".5"/>' +
      '<ellipse cx="166" cy="149.4" rx="7" ry="1.6" fill="#E7B45C" opacity=".55"/>' +
    '</g>';
}
/* 油盂（灯盏）：油只在这里。oilY=null 表示空盂（液面贴底） */
function lampBowlHTML(oilY){
  var y = (oilY == null) ? LP.botY : oilY;
  var top = Math.min(y, LP.botY + 2);
  var h = Math.max(0, LP.botY + 2 - top);
  return '<defs><clipPath id="bowlClip"><path d="' + LP.bowlIn + '"/></clipPath></defs>' +
    '<path d="' + LP.bowlOut + '" fill="#C9A86A" stroke="#8A6E33" stroke-width="1.3" stroke-linejoin="round"/>' +
    '<path d="' + LP.bowlIn + '" fill="#6B5836"/>' +
    /* 油面：一个矩形被盂内轮廓裁住，顶边就是液面 —— 椭圆变大读不出"液面" */
    '<g clip-path="url(#bowlClip)">' +
      '<rect id="oilrect" x="120" y="' + top.toFixed(1) + '" width="60" height="' + h.toFixed(1) + '" fill="#D9A24A" opacity=".82"/>' +
      '<rect id="oilsurf" x="120" y="' + (top - .7).toFixed(1) + '" width="60" height="1.4" fill="#F2C97E" opacity="' + (h > 0 ? '.85' : '0') + '"/>' +
    '</g>' +
    /* 七分线：刻在盂内壁上，不是画在罩上 */
    '<path d="M129 ' + LP.mark7 + ' h42" stroke="#F0C070" stroke-width="1.2" opacity=".5" stroke-dasharray="5 3"/>' +
    '<ellipse cx="150" cy="' + LP.rimY + '" rx="26" ry="4" fill="none" stroke="#8A6E33" stroke-width="1.2"/>';
}
/* 芯座 + 灯芯（露头 y=112，浸到盂内 y=134） */
function lampWickHTML(){
  return '<rect x="145" y="112" width="10" height="7" rx="1.4" fill="#9A8459" stroke="#7E6A4A" stroke-width=".8"/>' +
    '<path d="M150 134 v-20" stroke="#3E3226" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M150 116 q1.6 -2 3.2 0" fill="none" stroke="#5E4E3A" stroke-width="1.4"/>';
}
/* 玻璃罩：可提可落。dy=0 戴着，dy=−34 提起 */
function lampShadeHTML(dy, o){
  o = o || {};
  return '<g id="shade" style="transform:translate(0,' + (dy || 0) + 'px);transition:transform .35s ease-out">' +
    '<path d="' + LP.shade + '" fill="url(#glsG)" stroke="#7E9A92" stroke-width="1.6"/>' +
    '<path id="soot" d="' + LP.shade + '" fill="url(#sootG)" opacity="' + (o.soot == null ? .9 : o.soot) + '"/>' +
    LAMP_RIMS +
    '<path d="M117 76 c-2 22 -2 42 0 58" stroke="#FFFFFF" stroke-width="4" opacity=".5" fill="none" stroke-linecap="round"/>' +
    '<path d="M183 80 c1 18 1 34 0 50" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".26" stroke-linecap="round"/>' +
    (o.inner || '') +
  '</g>';
}
/* 焰：0 / 0.55 / 1。焰根压在芯口 y=112 上 */
function lampFlameHTML(k){
  if (k <= 0.02) { return ''; }
  return '<g id="flame" transform="translate(150,112) scale(' + k.toFixed(2) + ')">' +
    '<path d="M0 1 C-7 -5 -5 -14 0 -21 C5 -14 7 -5 0 1 Z" fill="#F0A63C" opacity=".95"/>' +
    '<path d="M0 0 C-3.4 -4 -2.4 -10 0 -14 C2.4 -10 3.4 -4 0 0 Z" fill="#FFEFBF" opacity=".95"/>' +
    '<ellipse cx="0" cy="-4" rx="7" ry="9" fill="#F7C560" opacity=".22"/>' +
  '</g>';
}
/* 右侧刻线柱：量程＝盂深（不是罩高），三条刻线 0 / 七分 / 溢 */
function lampGaugeHTML(oilY){
  var y = (oilY == null) ? LP.botY : oilY;
  var top = Math.min(y, LP.botY);
  var h = Math.max(0, LP.botY - top);
  return '<rect x="198" y="' + LP.rimY + '" width="9" height="' + (LP.botY - LP.rimY) + '" rx="4" fill="#EFE7D4" stroke="#C9B48A" stroke-width="1"/>' +
    /* 目标带：七分线到 3.5 分那一段，浅青底 */
    '<rect x="199" y="' + LP.mark7 + '" width="7" height="' + (131 - LP.mark7) + '" fill="#8FB5B0" opacity=".35"/>' +
    '<rect id="gauge" x="200" y="' + (LP.botY - h).toFixed(1) + '" width="5" height="' + h.toFixed(1) + '" rx="2.5" fill="#D9A24A"/>' +
    '<path d="M194 ' + LP.rimY + ' h4 M194 ' + LP.mark7 + ' h4 M194 ' + LP.botY + ' h4" stroke="#8A7B5E" stroke-width="1.1" opacity=".8"/>' +
    '<text class="gtxt" x="211" y="' + (LP.mark7 + 3) + '" font-size="6.6" fill="#527E79">七分</text>' +
    '<text class="gtxt" x="211" y="' + (LP.rimY + 2.6) + '" font-size="6.6" fill="#B06A3A">溢</text>';
}
/* 读数：单位是「分」，量程是盂深（旧版「油 63%」量纲错） */
function lampReadText(y){
  var f = lampFen(y);
  return f > 7.02 ? ('油 ' + f.toFixed(1) + ' 分') : ('油 ' + f.toFixed(1) + ' / 7 分');
}
function lampReadHTML(oilY){
  var y = (oilY == null) ? LP.botY : oilY;
  return '<text id="oillbl" class="gtxt" x="202" y="' + (LP.rimY - 12) + '" font-size="8.2" text-anchor="middle" fill="#7A5B1E">' + lampReadText(y) + '</text>' +
    '<text class="gtxt" x="202" y="' + (LP.rimY - 4) + '" font-size="6.4" text-anchor="middle" fill="#8A7B5E">盂内油位</text>';
}

/* ---------- 第一拍 · 擦罩（带罩，dy=0） ---------- */
function lampScrubHTML(g){
  var sms = '', si, m;
  for (si = 0; si < g.sm.length; si++){
    m = g.sm[si];
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
    lampShadeHTML(0, { inner: sms }) +
    '<g id="tool" opacity="0"><path d="M134 88 h32 l-3 25 h-26 Z" fill="#E8E0CE" stroke="#B9A67C" stroke-width="1.2"/>' +
    '<path d="M137 96 q7 4 13 0 M137 104 q7 4 13 0" fill="none" stroke="#CBBE9C" stroke-width="1"/>' +
    '<path d="M134 88 h32" stroke="#FFFDF6" stroke-width="1.4"/></g>';
}

/* ---------- 第二拍 · 注油（提罩，油在盂里） ---------- */
function lampOilHTML(){
  var oilY = (RUN.oilY == null) ? LP.botY : RUN.oilY;
  var dy = st.shadeDy || 0;
  return LAMP_DEFS + lampBenchHTML() + LAMP_BASE +
    lampBowlHTML(oilY) + lampWickHTML() +
    lampShadeHTML(dy) +
    lampGaugeHTML(oilY) + lampReadHTML(oilY) +
    /* 油壶：按住才倾倒（油线只在按住时出现） */
    '<g id="pot" transform="translate(196,84)">' +
      '<path d="M-13 -8 h17 a8 8 0 0 1 8 8 v8 a8 8 0 0 1 -8 8 h-17 Z" fill="#B99A55" stroke="#8A6E33" stroke-width="1.2"/>' +
      '<path d="M11 -2 q12 3 14 12" fill="none" stroke="#8A6E33" stroke-width="2.6"/>' +
      '<ellipse cx="-3" cy="-8" rx="9" ry="3" fill="#D8C48A" stroke="#8A6E33" stroke-width=".9"/>' +
    '</g>' +
    '<path id="stream" d="M184 88 Q172 96 160 106" fill="none" stroke="#D9A24A" stroke-width="2.4" opacity="0" stroke-linecap="round"/>' +
    '<circle id="drop" cx="160" cy="106" r="2" fill="#D9A24A" opacity="0"/>';
}

/* ---------- 第三拍 · 点灯（引火 → 起焰 → 落罩） ---------- */
function lampLightHTML(){
  var oilY = (RUN.oilY == null) ? LP.botY : RUN.oilY;
  var dy = st.shadeDy || 0;
  return LAMP_DEFS + lampBenchHTML() + LAMP_BASE +
    lampBowlHTML(oilY) + lampWickHTML() +
    lampShadeHTML(dy, { soot: RUN.sooty ? 1 : .9 }) +
    /* 暖光：落罩后罩内一圈暖光（只换 opacity） */
    '<g id="glow" opacity="0"><ellipse cx="150" cy="112" rx="30" ry="26" fill="#F7C560" opacity=".16"/>' +
      '<ellipse cx="150" cy="150" rx="40" ry="8" fill="#F0A63C" opacity=".12"/></g>' +
    /* 青烟 / 火星 / 焰：三个空容器，逐帧由 patchLamp() 填 */
    '<g id="smokeBox" opacity="0">' +
      '<path d="M150 108 c-3 -6 3 -9 0 -15 c-3 -6 3 -9 0 -15" fill="none" stroke="#9AA6A2" stroke-width="1.4" opacity=".75" stroke-linecap="round"/>' +
      '<path d="M153 109 c-2 -5 2 -8 0 -13" fill="none" stroke="#B4BEB8" stroke-width="1" opacity=".55" stroke-linecap="round"/>' +
    '</g>' +
    '<g id="sparkBox" opacity="0">' +
      '<circle cx="146" cy="107" r="1.5" fill="#F0A63C"/><circle cx="154" cy="104" r="1.1" fill="#E7873A"/>' +
      '<circle cx="149" cy="100" r="1" fill="#F0A63C"/>' +
    '</g>' +
    '<g id="flameBox"></g>' +
    /* 纸媒：跟手 */
    '<g id="tool" opacity="0"><path d="M0 0 l14 -6" stroke="#C9B48A" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="0" cy="0" r="2.6" fill="#E7873A" opacity=".9"/></g>';
}

/* 逐帧补：只改会变的那几个节点（罩留 transition，不能整块重绘） */
function patchLamp(){
  var y = (RUN.oilY == null) ? LP.botY : RUN.oilY;
  var top = Math.min(y, LP.botY + 2), h = Math.max(0, LP.botY + 2 - top);
  var r = document.getElementById('oilrect');
  if (r){ r.setAttribute('y', top.toFixed(1)); r.setAttribute('height', h.toFixed(1)); }
  var sf = document.getElementById('oilsurf');
  if (sf){ sf.setAttribute('y', (top - .7).toFixed(1)); sf.setAttribute('opacity', h > 0 ? '.85' : '0'); }
  var gg = document.getElementById('gauge');
  if (gg){
    var t2 = Math.min(y, LP.botY), h2 = Math.max(0, LP.botY - t2);
    gg.setAttribute('y', t2.toFixed(1)); gg.setAttribute('height', h2.toFixed(1));
    gg.setAttribute('fill', (y < LP.rimY) ? '#B06A3A' : (lampBand(y) ? '#5E8C86' : (y > 131 ? '#C9A97A' : '#D9A24A')));
  }
  var lb = document.getElementById('oillbl');
  if (lb){
    lb.textContent = lampReadText(y);
    lb.setAttribute('fill', (y < LP.rimY) ? '#B06A3A' : (lampBand(y) ? '#3F6B58' : '#7A5B1E'));
  }
  var sp = document.getElementById('spill');
  if (sp){ sp.setAttribute('opacity', RUN.spilled ? '1' : '0'); }
  var sd = document.getElementById('shade');
  if (sd){ sd.style.transform = 'translate(0,' + (st.shadeDy || 0) + 'px)'; }
  var fb = document.getElementById('flameBox');
  if (fb){ fb.innerHTML = lampFlameHTML(st.flameK || 0); }
  var smk = document.getElementById('smokeBox');
  if (smk){ smk.setAttribute('opacity', (st.lightN || 0) >= 2 ? '.4' : ((st.lightN || 0) >= 1 ? '1' : '0')); }
  var spk = document.getElementById('sparkBox');
  if (spk){ spk.setAttribute('opacity', (st.lightN || 0) === 1 ? '1' : '0'); }
  var gl = document.getElementById('glow');
  if (gl){ gl.setAttribute('opacity', (st.lightN || 0) >= 3 ? '1' : '0'); }
  var pot = document.getElementById('pot');
  if (pot){ pot.setAttribute('transform', 'translate(196,84) rotate(' + (st.pour && !st.done ? 26 : 0) + ')'); }
  var stm = document.getElementById('stream');
  if (stm){ stm.setAttribute('opacity', st.pour && !st.done ? '.9' : '0'); }
  var dr = document.getElementById('drop');
  if (dr){ dr.setAttribute('opacity', st.pour && !st.done ? '.85' : '0'); }
  var tl = document.getElementById('tool');
  if (tl && st.g && st.g.t === 'light'){
    tl.setAttribute('opacity', (st.lightN || 0) < 2 && st.tool ? '1' : '0');
    if (st.tool){ tl.setAttribute('transform', 'translate(' + (st.tool.x - 140).toFixed(1) + ',' + (st.tool.y + 8).toFixed(1) + ')'); }
  }
}
