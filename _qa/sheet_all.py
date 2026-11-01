from PIL import Image, ImageDraw, ImageFont
import os, glob
files = sorted(glob.glob('assets/chars/*_final.webp'))
font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)
CW, CH = 300, 450
cols = 6
rows = (len(files)+cols-1)//cols
sheet = Image.new('RGB', (cols*CW, rows*(CH+26)), (238,236,230))
d = ImageDraw.Draw(sheet)
for i,f in enumerate(files):
    im = Image.open(f).convert('RGBA')
    w,h = im.size
    s = min((CW-8)/w, (CH-8)/h)
    im = im.resize((int(w*s), int(h*s)), Image.LANCZOS)
    bg = Image.new('RGBA',(CW,CH),(238,236,230,255))
    bg.alpha_composite(im, ((CW-im.width)//2, CH-im.height-4))
    x,y = (i%cols)*CW, (i//cols)*(CH+26)
    sheet.paste(bg.convert('RGB'),(x,y))
    d.text((x+6, y+CH+3), os.path.basename(f).replace('tq_chars_','').replace('_final.webp','')+f' {w}x{h}', font=font, fill=(40,40,40))
sheet.save('_qa/sheet_all.png')
print('ok', len(files), sheet.size)
