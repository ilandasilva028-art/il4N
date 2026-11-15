#!/usr/bin/env python3
"""Planches A4 maison du ticket découpé (v4) : 9 tickets par feuille, forme zigzag avec 0,8 mm de « fond perdu »
autour du contour, et contour de coupe en gris clair à suivre (ciseaux cranteurs ou cutter). 600 ppp.
Usage : python3 planche_v4.py  → EXPORTS/IL4N_tickets_v4_planches_A4_0025-0051.pdf"""
import sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import ticket_forme as F
DPI = 600; MM = DPI / 25.4; B = 3                      # fond perdu des PNG (mm)
A4 = (round(210 * MM), round(297 * MM))
GAP = 7; X0 = (210 - 3 * 55 - 2 * GAP) / 2; Y0 = (297 - 3 * 85 - 2 * GAP) / 2
def forme(dx, dy, marge=0.0):
    pts = F.contour(); cx, cy = F.W / 2, F.H / 2
    out = []
    for x, y in pts:                                     # léger agrandissement pour la marge autour du contour
        ex = x + (marge if x > cx else -marge if x < cx else 0)
        ey = y + (marge if y > cy else -marge)
        out.append(((dx + ex) * MM, (dy + ey) * MM))
    return out
def planche(images, miroir=False, titre=''):
    page = Image.new('RGB', A4, 'white'); dr = ImageDraw.Draw(page)
    for k, src in enumerate(images):
        r, c = divmod(k, 3); c = 2 - c if miroir else c
        dx, dy = X0 + c * (55 + GAP), Y0 + r * (85 + GAP)
        im = Image.open(src).convert('RGB')
        masque = Image.new('L', A4, 0); ImageDraw.Draw(masque).polygon(forme(dx, dy, 0.8), fill=255)
        calque = Image.new('RGB', A4, 'white'); calque.paste(im, (round((dx - B) * MM), round((dy - B) * MM)))
        page.paste(calque, (0, 0), masque)
        dr.line(forme(dx, dy) + [forme(dx, dy)[0]], fill=(185, 178, 165), width=max(2, round(0.15 * MM)))
    police = ImageFont.truetype(__file__.rsplit('/', 1)[0] + '/fonts/JetBrainsMono-Regular.ttf', round(2.4 * MM))
    dr.text((round(12 * MM), round(4 * MM)), titre, fill=(140, 140, 140), font=police)
    return page
nums = [f"{i:04d}" for i in range(25, 52)]
pages = []
for f in range(3):
    lot = nums[f * 9:(f + 1) * 9]
    pages.append(planche([f"EXPORTS/numeros_tickets_v4/recto_{n}_bleed.png" for n in lot],
                         titre=f"il4n Studio · tickets 55x85 · recto n° {lot[0]}-{lot[-1]} · imprimer à 100 % · découper sur le contour gris (ciseaux cranteurs ou cutter)"))
    pages.append(planche(["EXPORTS/IL4N_ticket_verso_v4_bleed.png"] * 9, miroir=True,
                         titre="il4n Studio · tickets 55x85 · verso (recto-verso bord long)"))
pages[0].save("EXPORTS/IL4N_tickets_v4_planches_A4_0025-0051.pdf", save_all=True, append_images=pages[1:], resolution=DPI)
pages[0].resize((620, 877)).save(sys.argv[1] if len(sys.argv) > 1 else "APERCUS/planche_v4_p1.png")
print("planches :", len(pages), "pages")
