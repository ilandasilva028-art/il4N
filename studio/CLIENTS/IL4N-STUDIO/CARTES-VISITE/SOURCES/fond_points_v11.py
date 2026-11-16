"""Recto v11 « CALENDRIER 2027 » A6 : le fond nuit = l'année 2027 en 365 points (1 rangée = 1 mois, 1 point = 1 jour),
ton sur ton, dimanches un peu plus clairs, jours fériés en or. Les lignes de texte sont posées ENTRE les rangées de points ;
les points qui touchent un élément (mesuré dans Chromium) sont retirés. Un jour férié ne doit jamais être retiré (contrôle).
Usage : python3 fond_points_v11.py   (écrit cal_recto_v11.html ; besoin de node + playwright pour la mesure)"""
import calendar, datetime as dt, os, re, subprocess
import numpy as np
from dateutil.easter import easter
D = os.path.dirname(os.path.abspath(__file__))
AN = 2027; p = easter(AN)
FERIES = {dt.date(AN,1,1), p+dt.timedelta(1), dt.date(AN,5,1), dt.date(AN,5,8), p+dt.timedelta(39), p+dt.timedelta(50),
          dt.date(AN,7,14), dt.date(AN,8,15), dt.date(AN,11,1), dt.date(AN,11,11), dt.date(AN,12,25)}
W, H = 154, 111                      # page avec fond perdu (mm)
x0, dx, y0, dy = 9.0, 4.55, 9.5, 8.4  # 31 colonnes × 12 rangées
R, RF, PAD = .95, 1.15, .45

def points():
    for m in range(1, 13):
        for d in range(1, calendar.monthrange(AN, m)[1] + 1):
            j = dt.date(AN, m, d)
            yield j, x0 + (d-1)*dx, y0 + (m-1)*dy

def page(masque):
    """masque : tableau booléen (20 px/mm) de l'encre des éléments, ou None (premier passage)."""
    pts = []; perdus = []
    for j, x, y in points():
        r = RF if j in FERIES else R
        touche = False
        if masque is not None:
            k = 20; rr = int((r+PAD)*k)+1; cx, cy = int(x*k), int(y*k)
            zone = masque[max(cy-rr,0):cy+rr+1, max(cx-rr,0):cx+rr+1]
            yy, xx = np.ogrid[-rr:rr+1, -rr:rr+1]
            disque = (xx*xx + yy*yy) <= rr*rr
            touche = bool((zone & disque[:zone.shape[0], :zone.shape[1]]).any())
        if touche:
            if j in FERIES: perdus.append(j.isoformat())
            continue
        col = '#d6a96a' if j in FERIES else ('#2b2738' if j.weekday() == 6 else '#211e2c')
        pts.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{col}"/>')
    # centre (page) des intervalles entre rangées : y0 + dy*(k+.5)  → en coordonnées « trim » : -3 mm
    gap = lambda k: y0 + dy*(k+.5) - 3
    s = open(os.path.join(D, 'cal_recto_v10.html')).read()
    s = s.replace('v10 « CALENDRIER 2027 » format A6 paysage 148×105 — recto : carte de visite sur fond nuit avec cercles ton sur ton.',
                  "v11 « CALENDRIER 2027 » A6 148×105 — recto : fond nuit = l'année 2027 en 365 points (généré par fond_points_v11.py, ne pas éditer).")
    svg = f'<svg viewBox="0 0 {W} {H}">\n      ' + ''.join(pts) + '\n    </svg>'
    s, n = re.subn(r'<!-- cercles.*?</svg>', lambda _: svg, s, flags=re.S); assert n == 1
    s = re.sub(r'\s*<div class="garde">.*?</div>', '', s, count=1, flags=re.S)
    css = f'''  .slogan {{ top: {gap(3)-2.5:.2f}mm !important; line-height: 5mm; }}
  .nom {{ top: {gap(5)-2.5:.2f}mm !important; line-height: 5mm; }}
  .metier {{ top: {gap(6)-2:.2f}mm !important; line-height: 4mm; }}
  .contacts {{ top: {gap(7)-2.5:.2f}mm !important; row-gap: {dy-5:.2f}mm !important; }}
  .contacts div {{ height: 5mm; line-height: 5mm; }}
  .qr {{ top: {gap(5)-3:.2f}mm !important; }}
  .legende {{ position: absolute; right: 10mm; top: {gap(10)-1.5:.2f}mm; line-height: 3mm; font-size: 6.6pt; font-weight: 700; letter-spacing: .04em; color: #77727f; white-space: nowrap; }}
  .legende b {{ display: inline-block; width: 1.8mm; height: 1.8mm; border-radius: 50%; background: #d6a96a; margin: 0 .9mm 0 0; vertical-align: -.15mm; }}
  .legende em {{ font-style: normal; color: #d6a96a; }}
</style>'''
    s = s.replace('</style>', css, 1)
    s = s.replace('<div class="qr">', '<div class="legende">2027 en 365 points · <b></b>jours fériés · <em>calendrier au dos</em></div>\n    <div class="qr">')
    open(os.path.join(D, 'cal_recto_v11.html'), 'w').write(s)
    return perdus

page(None)                                                   # 1) sans retrait, pour mesurer
import tempfile, numpy as np
from PIL import Image
png = os.path.join(tempfile.mkdtemp(), 'encre.png')
subprocess.run(['node', os.path.join(D, 'mesure_boites.js'), os.path.join(D, 'cal_recto_v11.html'), png], check=True)
im = np.asarray(Image.open(png).convert('RGB')).astype(int)
masque = np.abs(im - np.array([17, 16, 24])).sum(axis=2) > 60   # tout ce qui n'est pas le fond nuit
perdus = page(masque)                                         # 2) avec retrait des points qui touchent l'encre
print('jours fériés masqués :', perdus or 'aucun')
assert not perdus, perdus
