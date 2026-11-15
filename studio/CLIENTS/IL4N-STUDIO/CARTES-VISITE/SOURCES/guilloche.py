#!/usr/bin/env python3
"""Motifs guillochés vectoriels (style billet de banque, dessin original IL4N) pour la carte « billet ».
Écrit rosace.svg, vagues_nuit.svg, vagues_papier.svg. Couleurs pleines (pas d'opacité : le PDF reste vectoriel)."""
import math

def path(points):
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in points) + " Z"

def rosace(cx, cy, R, r, d, n=1400, tours=None):
    # hypotrochoïde : courbe de « spirographe », base des guillochis
    k = math.gcd(int(R), int(r)); tours = tours or int(r // k)
    pts = []
    for i in range(n + 1):
        t = 2 * math.pi * tours * i / n
        x = (R - r) * math.cos(t) + d * math.cos((R - r) / r * t)
        y = (R - r) * math.sin(t) - d * math.sin((R - r) / r * t)
        pts.append((cx + x, cy + y))
    return path(pts)

# 1) rosace (médaillon du logo) : 3 couches décalées
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">']
for R, r, d, col, w in [(48, 13, 22, 'COL1', .45), (44, 11, 19, 'COL2', .4), (36, 7, 12, 'COL1', .35)]:
    svg.append(f'<path d="{rosace(0, 0, R, r, d, 2600)}" fill="none" stroke="{col}" stroke-width="{w}"/>')
svg.append('</svg>')
base = "\n".join(svg)
open('rosace_or.svg', 'w').write(base.replace('COL1', '#d6a96a').replace('COL2', '#9c7a4c'))

# 2) champ de vagues entrelacées (fond)
def vagues(w, h, col, n=26, amp=5.5, per=48, sw=.22):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="none">']
    for i in range(n):
        y0 = i * h / (n - 1); ph = i * 0.42
        for sens in (1, -1):
            pts = [(x, y0 + sens * amp * math.sin(2 * math.pi * x / per + ph) * math.sin(math.pi * x / w * 1.0 + .3)) for x in [j * w / 300 for j in range(301)]]
            out.append(f'<path d="M' + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + f'" fill="none" stroke="{col}" stroke-width="{sw}"/>')
    out.append('</svg>')
    return "\n".join(out)

open('vagues_nuit.svg', 'w').write(vagues(182, 122, '#2e2633'))
open('vagues_papier.svg', 'w').write(vagues(182, 122, '#e3d8c3'))
print('ok')
