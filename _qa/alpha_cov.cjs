const { chromium } = require('playwright');
const EXE = 'C:/Users/elisa/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const files = [
  'assets/scenes/s1_wanshou_p/l3v.webp',
  'assets/scenes/s1_wanshou_p/l3v_gongmen.webp',
  'assets/scenes/s1_wanshou_p/l3v_paichazhu.webp',
  'assets/scenes/s2_guangde/l5v.webp'
];
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8951/index.html', { waitUntil: 'domcontentloaded' }).catch(()=>{});
  const out = await p.evaluate(async (files) => {
    const res = [];
    for (const f of files) {
      const img = new Image();
      img.src = './' + f;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      if (!img.naturalWidth) { res.push({ f, err: true }); continue; }
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let a0 = 0, aMid = 0, n = 0;
      for (let i = 3; i < d.length; i += 4) { n++; if (d[i] < 8) a0++; else if (d[i] < 200) aMid++; }
      res.push({ f, w: c.width, h: c.height,
        fullyTransparent: +(a0 / n * 100).toFixed(1),
        semi: +(aMid / n * 100).toFixed(1),
        opaque: +((n - a0 - aMid) / n * 100).toFixed(1) });
    }
    return res;
  }, files);
  out.forEach(r => console.log(JSON.stringify(r)));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
