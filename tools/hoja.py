"""Arma una hoja de contacto (_hoja.jpg) con los fotogramas de una carpeta, con el segundo debajo."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; fs = sorted([f for f in os.listdir(d) if f.startswith("s_")], key=lambda x: float(x[2:-4]))
cols = 6; tw, th = 270, 480; rows = (len(fs) + cols - 1) // cols
o = Image.new("RGB", (cols * tw, rows * (th + 30)), (30, 30, 30)); dr = ImageDraw.Draw(o)
try: font = ImageFont.truetype("arial.ttf", 22)
except Exception: font = None
for k, f in enumerate(fs):
    im = Image.open(os.path.join(d, f)).convert("RGB").resize((tw, th)); x, y = (k % cols) * tw, (k // cols) * (th + 30)
    o.paste(im, (x, y)); dr.text((x + 6, y + th + 4), f[2:-4] + " s", fill="white", font=font)
o.save(os.path.join(d, "_hoja.jpg"), quality=82); print("hoja:", os.path.join(d, "_hoja.jpg"))
