#!/usr/bin/env python3
"""Aperçu « découpé » d'une face de ticket : applique la forme zigzag (ticket_forme.py) au PNG HD (format fini),
fond transparent autour, ombre portée douce. Usage : python3 apercu_forme.py face_HD.png sortie.png [--contour] """
import sys
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import ticket_forme as F

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); W, H = im.size; sx, sy = W / F.W, H / F.H
pts = [(x * sx, y * sy) for x, y in F.contour()]
m = Image.new('L', im.size, 0); ImageDraw.Draw(m).polygon(pts, fill=255)
im.putalpha(m)
pad = int(0.08 * W)
fond = Image.new('RGBA', (W + 2 * pad, H + 2 * pad), (0, 0, 0, 0))
ombre = Image.new('L', fond.size, 0); ImageDraw.Draw(ombre).polygon([(x + pad + W * 0.012, y + pad + W * 0.02) for x, y in pts], fill=110)
fond.putalpha(ombre.filter(ImageFilter.GaussianBlur(W * 0.018)))
fond.alpha_composite(im, (pad, pad))
if '--contour' in sys.argv:
    ImageDraw.Draw(fond).line([(x + pad, y + pad) for x, y in pts] + [(pts[0][0] + pad, pts[0][1] + pad)], fill=(220, 0, 120, 255), width=max(2, W // 400))
fond.save(out)
print(out, fond.size)
