import colorsys, glob, os
from PIL import Image
import numpy as np

def stat(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    rgb, al = a[...,:3], a[...,3]
    m = al > 200
    if m.sum() < 1000: return None
    px = rgb[m] / 255.0
    mx = px.max(1); mn = px.min(1)
    v = mx; s = np.where(mx > 0, (mx-mn)/np.maximum(mx,1e-6), 0)
    # luminance
    L = 0.2126*px[:,0] + 0.7152*px[:,1] + 0.0722*px[:,2]
    # warm/cool: mean b-r
    br = px[:,2].mean() - px[:,0].mean()
    return dict(L=L.mean(), Lstd=L.std(), S=s.mean(), V=v.mean(), br=br, area=m.sum())

files = sorted(glob.glob('assets/chars/*_final.webp'))
rows = []
for f in files:
    s = stat(f)
    if s: rows.append((os.path.basename(f).replace('tq_chars_','').replace('_final.webp',''), s))
Lm = np.median([r[1]['L'] for r in rows]); Sm = np.median([r[1]['S'] for r in rows]); Bm = np.median([r[1]['br'] for r in rows])
print("%-18s %6s %6s %6s %6s %7s" % ("key","L","Lstd","S","V","b-r"))
for k,s in rows:
    print("%-18s %6.3f %6.3f %6.3f %6.3f %7.3f %s" % (k,s['L'],s['Lstd'],s['S'],s['V'],s['br'], '<== 郭荣' if k.startswith('guorong') else ''))
print()
print("MEDIAN L=%.3f S=%.3f b-r=%.4f" % (Lm,Sm,Bm))
