(function () {
  'use strict';
  var grid = document.getElementById('grid');
  var runBtn = document.getElementById('run');
  var cntEl = document.getElementById('cnt');
  var badEl = document.getElementById('bad');

  /* 环境探测复用 assets.js 的同一套判据（1×1 WebP + 2048 纹理） */
  var envDone = false;
  TQA.probeEnv(function (env) {
    envDone = true;
    var bits = ['WebP ' + (env.webp ? '可用' : '不可用'), '纹理上限 ' + (env.tex2048 ? '≥2048' : '<2048')];
    document.getElementById('env').textContent = bits.join(' · ');
    if (!env.webp) {
      document.getElementById('env').className = 'stat bad';
      document.getElementById('env').textContent += ' ← 立绘全部无法解码';
    }
  });

  /* 清单：TQA 注册表里所有 char-* 键（默认槽 + 派生槽），带中文名 */
  var nameOf = {}, base = {};
  var plist = [];
  try { plist = (window.TP && TP.list()) ? TP.list() : []; } catch (e) { plist = []; }
  plist.forEach(function (r) {
    nameOf['char-' + r.key] = r.label;
    base[r.key] = r.label;
    (r.slots || []).forEach(function (sl) { nameOf['char-' + r.key + '-' + sl] = r.label; });
  });
  /* 派生槽：名字沿用角色名，槽号单独显示在副行 */
  function labelOf(k) {
    if (nameOf[k]) { return nameOf[k]; }
    var m = k.match(/^char-(.+?)-([a-z]\d+)$/);
    if (m && base[m[1]]) { return base[m[1]]; }
    return k;
  }
  function slotOf(k) {
    var m = k.match(/^char-(.+?)-([a-z]\d+)$/);
    return m ? m[2] : '';
  }

  var keys = Object.keys(TQA.reg).filter(function (k) { return /^char-/.test(k); }).sort();
  var cards = {}, doneN = 0, okN = 0, badN = 0;

  keys.forEach(function (k) {
    var ent = TQA.reg[k];
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<div class="thumb"><span class="ph">待加载</span></div>' +
      '<div class="meta">' +
        '<div class="k">' + labelOf(k) + (slotOf(k) ? ' · ' + slotOf(k) : '') + '<span class="st wait">待载</span></div>' +
        '<div class="dim">' + k + '</div>' +
        '<div class="dim file"></div>' +
        '<div class="dim dimx"></div>' +
      '</div>';
    grid.appendChild(card);
    card.querySelector('.file').textContent = ent.src.split('/').pop();
    cards[k] = card;
  });

  function setStat(n) {
    cntEl.textContent = n.done + ' / ' + keys.length + ' 已检';
    if (n.bad) { badEl.style.display = ''; badEl.textContent = n.bad + ' 项失败'; }
  }
  setStat({ done: 0, bad: 0 });

  function loadOne(k, cb) {
    var card = cards[k];
    var st = card.querySelector('.st');
    var dim = card.querySelector('.dimx');
    var t0 = performance.now();
    var im = new Image();
    var fin = false;
    var to = setTimeout(function () {
      if (fin) { return; }
      fin = true;
      st.className = 'st bad'; st.textContent = '超时';
      dim.textContent = '8s 内未返回';
      card.className = 'card bad';
      cb('timeout');
    }, 8000);
    im.onload = function () {
      if (fin) { return; }
      fin = true; clearTimeout(to);
      var ms = Math.round(performance.now() - t0);
      var box = card.querySelector('.thumb');
      box.innerHTML = '';
      box.appendChild(im);
      st.className = 'st ok'; st.textContent = '正常';
      dim.textContent = im.naturalWidth + '×' + im.naturalHeight + ' · ' + ms + 'ms';
      cb('ok');
    };
    im.onerror = function () {
      if (fin) { return; }
      fin = true; clearTimeout(to);
      var ms = Math.round(performance.now() - t0);
      st.className = 'st bad'; st.textContent = '失败';
      dim.textContent = '加载失败（404 / 解码 / 被拦截）· ' + ms + 'ms';
      card.className = 'card bad';
      cb('fail');
    };
    im.src = TQA.reg[k].src;
  }

  function runAll() {
    runBtn.disabled = true;
    runBtn.textContent = '加载中…';
    var i = 0, live = 0;
    var CONC = 4;
    function pump() {
      if (i >= keys.length && live === 0) {
        runBtn.disabled = false;
        runBtn.textContent = doneN < keys.length ? '继续加载' : '重新加载';
        if (!doneN) { runBtn.textContent = '逐张加载'; }
        return;
      }
      while (live < CONC && i < keys.length) {
        var k = keys[i]; i += 1;
        if (cards[k].className.indexOf('bad') >= 0) { continue; }
        if (cards[k].querySelector('.st').className.indexOf('ok') >= 0) { continue; }
        live += 1;
        loadOne(k, function (r) {
          live -= 1; doneN += 1;
          if (r === 'ok') { okN += 1; } else { badN += 1; }
          setStat({ done: doneN, bad: badN });
          pump();
        });
      }
    }
    pump();
  }

  runBtn.addEventListener('click', runAll);
  runAll();
})();
