from PIL import Image, ImageDraw, ImageFont
import os
keys = ['fuhou_a1','fuhou_e2','guorong_a2','guorong_a3','guowei_e3','wangpu_a1','guorong_a1','wangpu_e2']
font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
CW, CH = 340, 510
sheet = Image.new('RGB', (CW*4, (CH+28)*2), (240,238,232))
d = ImageDraw.Draw(sheet)
for i,k in enumerate(keys):
    f = 'assets/chars/tq_chars_%s_final.webp' % k
    im = Image.open(f).convert('RGBA')
    s = min((CW-10)/im.width, (CH-10)/im.height)
    im = im.resize((int(im.width*s), int(im.height*s)), Image.LANCZOS)
    bg = Image.new('RGBA',(CW,CH),(240,238,232,255))
    bg.alpha_composite(im, ((CW-im.width)//2, CH-im.height-6))
    x,y = (i%4)*CW, (i//4)*(CH+28)
    sheet.paste(bg.convert('RGB'),(x,y))
    d.text((x+8,y+CH+4), k, font=font, fill=(30,30,30))
sheet.save('_qa/sheet_kneel.png')
print('ok')
