/* 受控实验：验证「舞台缺 touch-action:none ⇒ 拖动被滚动抢走 ⇒ pointercancel」这一机制。
   同一页面渲染两份舞台：A=1.1.5 真实写法（touch-action:auto），B=1.1.9 写法（none）。
   用 CDP 派发真实手指拖动（纵向，足以触发滚动），统计各自收到的 pointer 事件。 */
const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;height:100%;background:#EEE}
  /* 模拟 .vn-doc：剧情区可纵向滚动 */
  .doc{position:absolute;left:0;top:0;width:390px;height:844px;overflow-y:auto;-webkit-overflow-scrolling:touch}
  .doc .spacer{height:1400px;background:linear-gradient(#ddd,#999)}
  .stage{position:relative;width:360px;height:220px;margin:40px auto;background:#22383C;overflow:hidden}
  .stage.a{touch-action:auto}      /* 1.1.5 现状 */
  .stage.b{touch-action:none}      /* 1.1.9 修法 */
  .stage svg{position:absolute;left:0;top:0;right:0;bottom:0;width:100%;height:100%;touch-action:none}
  .tag{position:absolute;left:6px;top:6px;color:#fff;font:12px monospace;z-index:5}
</style></head><body>
<div class="doc">
  <div class="stage a" id="sa"><span class="tag">A: touch-action auto (v1.1.5)</span><svg></svg></div>
  <div class="stage b" id="sb"><span class="tag">B: touch-action none (v1.1.9)</span><svg></svg></div>
  <div class="spacer"></div>
</div>
<script>
  window.__ev = { a: { down:0, move:0, up:0, cancel:0 }, b: { down:0, move:0, up:0, cancel:0 } };
  function wire(id, key){
    var st = document.getElementById(id);
    st.addEventListener('pointerdown', function(e){ window.__ev[key].down++; try{ st.setPointerCapture(e.pointerId); }catch(e){} });
    st.addEventListener('pointermove', function(e){ if (window.__ev[key].down) window.__ev[key].move++; });
    st.addEventListener('pointerup', function(e){ window.__ev[key].up++; });
    st.addEventListener('pointercancel', function(e){ window.__ev[key].cancel++; });
  }
  wire('sa','a'); wire('sb','b');
</script></body></html>`;

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.setContent(PAGE, { waitUntil: 'load' });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  async function drag(sel) {
    const box = await p.evaluate((s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, sel);
    const sx = box.x + box.w * 0.5, sy = box.y + box.h * 0.8;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx, y: sy - i * 12, id: 1 }] });
      await p.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(200);
  }

  await drag('#sa');
  await drag('#sb');
  const ev = await p.evaluate(() => window.__ev);
  const ta = await p.evaluate(() => ({
    a: getComputedStyle(document.getElementById('sa')).touchAction,
    b: getComputedStyle(document.getElementById('sb')).touchAction
  }));
  console.log('computed touch-action  A=' + ta.a + '  B=' + ta.b);
  console.log('A (v1.1.5, auto): ' + JSON.stringify(ev.a));
  console.log('B (v1.1.9, none): ' + JSON.stringify(ev.b));
  console.log('判定 A 是否被取消: ' + (ev.a.cancel > 0 ? '是 ← 拖动被页面滚动抢走' : '否'));
  console.log('判定 B 是否被取消: ' + (ev.b.cancel > 0 ? '是' : '否 ← 拖动完整'));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
