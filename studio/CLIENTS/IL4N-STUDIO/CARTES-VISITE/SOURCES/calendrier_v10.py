"""Génère cal_verso_v10.html : calendrier 2027 (semaines du lundi au dimanche, jours fériés France métropolitaine)."""
import calendar, datetime as dt
from dateutil.easter import easter
AN = 2027
p = easter(AN)
FERIES = {dt.date(AN,1,1), p+dt.timedelta(1), dt.date(AN,5,1), dt.date(AN,5,8), p+dt.timedelta(39),
          p+dt.timedelta(50), dt.date(AN,7,14), dt.date(AN,8,15), dt.date(AN,11,1), dt.date(AN,11,11), dt.date(AN,12,25)}
MOIS = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE']
cal = calendar.Calendar(firstweekday=0)
blocs = []
for m in range(1, 13):
    cells = ''.join(f'<i>{j}</i>' for j in 'LMMJVSD')
    for sem in cal.monthdatescalendar(AN, m):
        for d in sem:
            if d.month != m: cells += '<u></u>'; continue
            cls = 'f' if d in FERIES else ('w' if d.weekday() == 6 else '')
            cells += f'<u class="{cls}">{d.day}</u>' if cls else f'<u>{d.day}</u>'
    blocs.append(f'<div class="mois"><h3>{MOIS[m-1]}</h3><div class="g">{cells}</div></div>')
html = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<!-- Carte de visite IL4N v10 « CALENDRIER 2027 » A6 148×105 — verso : calendrier 2027 (généré par calendrier_v10.py, ne pas éditer à la main). -->
<link rel="stylesheet" href="print-base.css">
<style>
  @font-face {{ font-family: Inter; src: url(fonts/Inter-900.ttf); font-weight: 900; }}
  @font-face {{ font-family: Inter; src: url(fonts/Inter-800.ttf); font-weight: 800; }}
  @font-face {{ font-family: Inter; src: url(fonts/Inter-700.ttf); font-weight: 700; }}
  @font-face {{ font-family: Inter; src: url(fonts/Inter-600.ttf); font-weight: 600; }}
  @font-face {{ font-family: Accent; src: url(fonts/Gelasio-Italic-400.ttf); font-weight: 400; }}
  :root {{ --w: 148mm; --h: 105mm; --bleed: 3mm; --safe: 5mm; --bg: #f4f0e8; --or: #b8853f; }}
  .bleed {{ background: #f4f0e8; }}
  .trim {{ font-family: Inter, sans-serif; color: #17131d; }}
  .tete {{ position: absolute; left: 8mm; right: 8mm; top: 7.5mm; height: 8mm; display: flex; align-items: baseline; justify-content: space-between; border-bottom: .3mm solid #17131d; }}
  .tete b {{ font-size: 18pt; font-weight: 900; letter-spacing: -.02em; line-height: 1; }}
  .tete b em {{ font-style: normal; color: var(--or); }}
  .tete .tel {{ font-size: 12pt; font-weight: 900; }}
  .tete .leg {{ display: flex; align-items: center; gap: 1.6mm; font-size: 8.5pt; font-weight: 700; color: #6f6a73; }}
  .tete .leg i {{ display: inline-block; width: 3.6mm; height: 2.7mm; background: var(--or); border-radius: .9mm; }}
  /* calendrier dessiné ×4 puis réduit (scale .25) : évite l'arrondi au pixel de Chromium sur des corps de 4 pt */
  .grille {{ position: absolute; left: 8mm; top: 18mm; width: 264mm; transform: scale(.5); transform-origin: 0 0;
            display: grid; grid-template-columns: repeat(4, 1fr); column-gap: 10mm; row-gap: 3.4mm; }}
  .mois h3 {{ font-size: 17pt; font-weight: 900; letter-spacing: .06em; line-height: 1; margin-bottom: 1mm; }}
  .g {{ display: grid; grid-template-columns: repeat(7, 1fr); }}
  .g i, .g u {{ display: block; text-align: center; text-decoration: none; font-style: normal; font-size: 16pt; height: 6.4mm; line-height: 6.4mm; font-weight: 600; font-variant-numeric: tabular-nums; }}
  .g i {{ font-weight: 800; color: #8b8590; font-size: 12.6pt; }}
  .g u.w {{ color: #8b8590; }}
  .g u.f {{ color: #fffdf8; font-weight: 800; background: var(--or); border-radius: 2.2mm; }}
  .pied {{ position: absolute; left: 4.4mm; right: 4.4mm; bottom: 4.2mm; display: flex; justify-content: space-between; align-items: center; font-size: 4.8pt; font-weight: 700; }}
  .pied .leg {{ display: flex; align-items: center; gap: .9mm; color: #6f6a73; }}
  .pied .leg b {{ display: inline-block; width: 2mm; height: 1.6mm; background: var(--or); border-radius: .5mm; }}
</style></head>
<body><div class="page">
  <div class="bleed"></div>
  <div class="trim">
    <div class="tete"><b>2027 <em>·</em> il4n.</b><span class="leg"><i></i>Jours fériés</span><span class="tel">06 10 55 71 25</span></div>
    <div class="grille">{''.join(blocs)}</div>
  </div>
</div></body></html>
'''
open(__import__('os').path.join(__import__('os').path.dirname(__file__) or '.', 'cal_verso_v10.html'), 'w').write(html)
print('ok', sorted(d.isoformat() for d in FERIES))
