"""Cartes de fidélité « Les gourmandises Pellegrino » — planche v3 (3 pistes recto/verso, 85 × 55 mm).
Reprend la planche v2 (mêmes pistes, mêmes couleurs) en y mettant les vraies infos d'Alex
(source : ses publications Facebook fournies par Ilan, 16/11/2026) :
  - nom commercial : « Les gourmandises Pellegrino »
  - marchés 7j/7 : mar. Vaison-la-Romaine · mer. Saint-Rémy-de-Provence · jeu. Nyons · ven. Velleron · sam. Uzès · dim. L'Isle-sur-la-Sorgue
  - commandes : 06 73 61 57 65 — envoi possible ou retrait sur place
  - produits vus : cookies (pépites de chocolat et bonbons colorés), biscuits en sachets
Usage : python3 planche_v3.py  -> planche_v3.html (rendu PNG par rendu_planche.js)"""
import os
D = os.path.dirname(os.path.abspath(__file__))

TEL = '06 73 61 57 65'
MARCHES = [('Mar.', 'Vaison-la-Romaine'), ('Mer.', 'Saint-Rémy-de-Provence'), ('Jeu.', 'Nyons'),
           ('Ven.', 'Velleron'), ('Sam.', 'Uzès'), ('Dim.', "L'Isle-sur-la-Sorgue")]
marches_ligne = ' · '.join(f'<span style="white-space:nowrap"><b>{j}</b> {v}</span>' for j, v in MARCHES)

# ---------- pictos (viewBox 24×24) ----------
def gateau(c, bougie=None):
    b = bougie or c
    return f'<rect x="5" y="11" width="14" height="8" rx="1.2" fill="{c}"/><rect x="11.3" y="6.5" width="1.4" height="4.5" fill="{b}"/><path d="M12 3.6c.9 1 .9 2 0 2.6-.9-.6-.9-1.6 0-2.6z" fill="{b}"/>'
def tarte(c, d='#c0613e'):
    return f'<path d="M3 17 12 7l9 10z" fill="{c}"/><rect x="3" y="17" width="18" height="2" fill="{c}"/><circle cx="11" cy="14" r="1" fill="{d}"/><circle cx="13.5" cy="13" r=".9" fill="{d}"/><circle cx="12.6" cy="15.4" r=".8" fill="{d}"/>'
def cupcake(c):
    return f'<path d="M7 12h10l-1.6 8H8.6z" fill="{c}"/><path d="M6 12a6 4 0 0 1 12 0z" fill="{c}"/><circle cx="12" cy="6.6" r="1.6" fill="{c}"/>'
def cake(c, h='#fff'):
    return f'<path d="M4 18v-5a8 6 0 0 1 16 0v5z" fill="{c}"/><path d="M7 12.5a5.5 3.6 0 0 1 10 0" fill="none" stroke="{h}" stroke-opacity=".55" stroke-width="1"/>'
def chou(c):
    return f'<ellipse cx="12" cy="15" rx="7.5" ry="4.5" fill="{c}"/><circle cx="12" cy="9.6" r="2.4" fill="{c}"/>'
def cookie(c, couleurs=True, chips='#6b4a33'):
    pts = [(9, 9, '#d8473a'), (14.5, 8.5, '#2f6fd1'), (8.5, 14.5, '#f2c531'), (15, 14, '#3a9a4b'), (12, 12, chips), (11.5, 16.5, '#e5822f')]
    if not couleurs:
        pts = [(9, 9, chips), (14.5, 9, chips), (9, 14.5, chips), (15, 14, chips), (12, 12, chips)]
    dots = ''.join(f'<circle cx="{x}" cy="{y}" r="1.25" fill="{k}"/>' for x, y, k in pts)
    return f'<circle cx="12" cy="12" r="8" fill="{c}"/>{dots}'
def sachet(c, lien='#8a5a2b'):
    return f'<path d="M6.5 8h11l1.2 12H5.3z" fill="{c}"/><path d="M8 8l1-3h6l1 3" fill="{c}"/><path d="M9.5 8.2c1.6 1.4 3.4 1.4 5 0" fill="none" stroke="{lien}" stroke-width="1.1" stroke-linecap="round"/><circle cx="10" cy="13" r=".9" fill="{lien}" opacity=".5"/><circle cx="13.6" cy="15.2" r=".9" fill="{lien}" opacity=".5"/><circle cx="11.6" cy="17.2" r=".9" fill="{lien}" opacity=".5"/>'
def panier(c):
    return f'<path d="M8 10a4 4 0 0 1 8 0" fill="none" stroke="{c}" stroke-width="1.8"/><path d="M3.5 10h17l-2 9h-13z" fill="{c}"/><rect x="6.5" y="13" width="11" height="1" fill="#d8b892"/><rect x="7" y="15.6" width="10" height="1" fill="#d8b892"/>'
def ic(body, size='100%'):
    return f'<svg viewBox="0 0 24 24" style="width:{size};height:{size}">{body}</svg>'
# pictos UI
I_FETE = '<rect x="4" y="12" width="16" height="7" rx="1" fill="currentColor"/><rect x="7" y="8" width="1.4" height="4" fill="currentColor"/><rect x="11.3" y="8" width="1.4" height="4" fill="currentColor"/><rect x="15.6" y="8" width="1.4" height="4" fill="currentColor"/>'
I_AMIS = '<circle cx="8.5" cy="9" r="3" fill="currentColor"/><path d="M3 19a5.5 5 0 0 1 11 0z" fill="currentColor"/><circle cx="16" cy="9.5" r="2.6" fill="currentColor" opacity=".7"/><path d="M13 19a4.5 4.5 0 0 1 9 0z" fill="currentColor" opacity=".7"/>'
I_FB = '<rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/><path d="M13.2 20v-6h2l.4-2.4h-2.4v-1.5c0-.7.3-1.2 1.3-1.2h1.2V6.8c-.4 0-1.1-.1-1.8-.1-1.9 0-3 1.1-3 3v1.9H9v2.4h1.9v6z" fill="#fff"/>'
I_TEL = '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
def ui(body): return f'<svg viewBox="0 0 24 24" class="ui">{body}</svg>'

# ---------- PISTE A : marché provençal ----------
A_BG, A_TER, A_INK, A_OLI, A_MIEL, A_PALE = '#f6ecdc', '#c8643b', '#3a2e22', '#5e6e3a', '#e6a43b', '#eac3ae'
banne = ''.join(f'<rect x="{i*9.6-1}" y="-4" width="5.6" height="12.5" rx="2.8" fill="{A_TER}"/>' for i in range(10))
A_recto = f'''
<div class="carte" style="background:{A_BG}">
  <svg class="banne" viewBox="0 0 91 10" preserveAspectRatio="none">{banne}</svg>
  <div style="position:absolute;left:7mm;top:13mm;font-family:Accent;font-size:20pt;color:{A_TER};line-height:1">Les gourmandises</div>
  <div style="position:absolute;left:7mm;top:21.5mm;font-size:21pt;font-weight:900;color:{A_INK};letter-spacing:-.01em;line-height:1">PELLEGRINO</div>
  <div style="position:absolute;left:7.2mm;top:30.5mm;font-size:5.6pt;font-weight:700;letter-spacing:.2em;color:{A_OLI}">COOKIES · BISCUITS · GÂTEAUX</div>
  <div style="position:absolute;left:7.2mm;bottom:9.6mm;font-size:5.4pt;font-weight:800;letter-spacing:.16em;color:{A_TER}">MARCHÉS DE PROVENCE · 7J/7</div>
  <div style="position:absolute;left:7.2mm;bottom:5.4mm;font-size:6.6pt;font-weight:800;color:{A_INK};display:flex;align-items:center;gap:1mm;--c:{A_TER}">{ui(I_TEL)}Commandes : {TEL}</div>
  <div style="position:absolute;right:6mm;bottom:15.4mm;display:flex;align-items:flex-end;gap:1.6mm">
    <div style="width:8mm;height:8mm">{ic(tarte(A_PALE, A_TER))}</div>
    <div style="width:9.5mm;height:9.5mm">{ic(gateau(A_OLI))}</div>
    <div style="width:8.5mm;height:8.5mm">{ic(cookie('#b9875a'))}</div>
    <div style="width:8mm;height:8mm">{ic(cake(A_MIEL))}</div>
  </div>
  <div style="position:absolute;right:5.5mm;bottom:15mm;width:38mm;height:.7mm;background:#6b6152;border-radius:.4mm"></div>
</div>'''
A_pictos = [gateau(A_PALE), tarte(A_PALE, A_TER), cupcake(A_PALE), cookie(A_PALE), chou(A_PALE),
            sachet(A_PALE, A_TER), tarte(A_PALE, A_TER), gateau(A_PALE), cupcake(A_PALE)]
def rond_A(i, body):
    return f'<div class="rond" style="border:.45mm dashed {A_TER}"><div class="pic">{ic(body)}</div><span style="color:{A_TER}">{i}</span></div>'
A_verso = f'''
<div class="carte" style="background:{A_BG};color:{A_INK}">
  <div style="position:absolute;left:5.5mm;top:4.2mm;font-size:9.6pt;font-weight:900">Votre carte gourmande</div>
  <div style="position:absolute;left:5.5mm;top:8.9mm;font-size:5.4pt;font-weight:500">Un tampon par achat. Le 10<sup>e</sup> achat : une gourmandise offerte.</div>
  <div class="grille" style="left:5.5mm;top:12.6mm">{''.join(rond_A(i+1, b) for i, b in enumerate(A_pictos))}
    <div class="rond" style="background:{A_TER};color:#fff"><div class="pic" style="width:42%;height:42%">{ic(gateau('#fff'))}</div><b>OFFERT</b></div></div>
  <div class="bonus" style="top:36.6mm">
    <div style="background:#ebdfcc;--c:{A_OLI}">{ui(I_FETE)}<p>Commande de fête : <b>2 tampons</b></p></div>
    <div style="background:#ebdfcc;--c:{A_OLI}">{ui(I_AMIS)}<p>+1 tampon pour vous et l’ami amené</p></div>
    <div style="background:#ebdfcc;--c:{A_OLI}">{ui(I_FB)}<p>+1 tampon en suivant la page Facebook</p></div>
  </div>
  <div class="pied" style="border-top:.25mm solid #e2d3bd;--c:{A_TER}">
    <div class="marches">{marches_ligne}</div>
    <div class="tel">{ui(I_TEL)}{TEL}<small>envoi ou retrait sur place</small></div>
  </div>
</div>'''

# ---------- PISTE B : pâtisserie chic ----------
B_BG, B_OR, B_PRUNE, B_ROSE = '#f3d9d7', '#b9884f', '#6e2238', '#f8e6e4'
B_recto = f'''
<div class="carte" style="background:{B_BG}">
  <div style="position:absolute;inset:2.2mm;border:.4mm solid {B_OR};border-radius:1.6mm"></div>
  <div style="position:absolute;left:50%;top:7mm;transform:translateX(-50%);width:15mm;height:15mm;border-radius:50%;border:.4mm solid {B_OR};background:{B_ROSE};
       display:flex;align-items:center;justify-content:center;font-family:Accent;font-size:25pt;color:{B_PRUNE}">P</div>
  <div style="position:absolute;left:50%;top:20.2mm;transform:translateX(-50%);width:5.4mm;height:5.4mm;border-radius:50%;background:{B_ROSE};padding:.7mm">{ic(cookie('#b9875a'))}</div>
  <div style="position:absolute;left:0;right:0;top:27.6mm;text-align:center;font-family:Serif;font-size:5.6pt;letter-spacing:.32em;color:{B_OR}">LES GOURMANDISES</div>
  <div style="position:absolute;left:0;right:0;top:30.8mm;text-align:center;font-family:Serif;font-size:13pt;letter-spacing:.22em;color:{B_PRUNE}">PELLEGRINO</div>
  <div style="position:absolute;left:0;right:0;top:37.6mm;text-align:center;font-size:4.9pt;font-weight:600;letter-spacing:.3em;color:{B_OR}">COOKIES · BISCUITS · GÂTEAUX</div>
  <div style="position:absolute;left:0;right:0;top:41.6mm;display:flex;justify-content:center;gap:3mm">
    <div style="width:3.6mm;height:3.6mm">{ic(tarte(B_OR, B_PRUNE))}</div><div style="width:3.6mm;height:3.6mm">{ic(cookie(B_OR, False, B_PRUNE))}</div>
    <div style="width:3.6mm;height:3.6mm">{ic(sachet(B_OR, B_PRUNE))}</div></div>
  <div style="position:absolute;left:0;right:0;bottom:4.6mm;text-align:center;font-size:5.4pt;font-weight:700;color:{B_PRUNE};letter-spacing:.04em">Commandes · {TEL}</div>
</div>'''
B_items = [('Cookies', cookie(B_OR, False, B_PRUNE)), ('Biscuits', sachet(B_OR, B_PRUNE)), ('Tarte', tarte(B_OR, B_PRUNE)), ('Cake', cake(B_OR)),
           ('Chou', chou(B_OR)), ('Cupcake', cupcake(B_OR)), ('Spécialité du mois', gateau(B_OR))]
B_verso = f'''
<div class="carte" style="background:{B_BG};color:{B_PRUNE}">
  <div style="position:absolute;inset:2.2mm;border:.4mm solid {B_OR};border-radius:1.6mm"></div>
  <div style="position:absolute;left:5.6mm;top:5mm;font-family:Serif;font-size:8.4pt;letter-spacing:.14em">MA COLLECTION GOURMANDE</div>
  <div style="position:absolute;left:5.6mm;top:9.6mm;font-size:5.2pt;font-weight:500">Goûtez-les toutes : la carte complète, une gourmandise au choix offerte.</div>
  <div style="position:absolute;left:5.6mm;right:5.6mm;top:13.4mm;display:grid;grid-template-columns:repeat(4,1fr);gap:1.4mm">
    {''.join(f'<div class="case" style="border:.3mm solid {B_OR}"><div class="pic">{ic(b)}</div><span>{n}</span></div>' for n, b in B_items)}
    <div class="case" style="background:{B_PRUNE};color:#fff"><div class="pic">{ic(gateau('#fff'))}</div><span style="font-family:Inter;font-weight:800">OFFERT</span></div>
  </div>
  <div class="pied" style="left:5.6mm;right:5.6mm;bottom:4.2mm;border-top:.25mm solid #e3bdb5;--c:{B_OR}">
    <div class="marches">{marches_ligne}</div>
    <div class="tel">{ui(I_TEL)}{TEL}<small>envoi ou retrait sur place</small></div>
  </div>
</div>'''

# ---------- PISTE C : artisan gourmand (kraft) ----------
C_BG, C_INK, C_CREME, C_TON = '#d9b88f', '#3c2418', '#f6ecdc', '#b38d66'
C_recto = f'''
<div class="carte" style="background:{C_BG}">
  <div style="position:absolute;left:7mm;top:10mm;font-size:6.2pt;font-weight:800;letter-spacing:.22em;color:{C_INK}">LES GOURMANDISES</div>
  <div style="position:absolute;left:6.6mm;top:14mm;font-size:22pt;font-weight:900;letter-spacing:-.04em;line-height:.9;color:{C_INK}">ALEX</div>
  <div style="position:absolute;left:6.6mm;top:22.4mm;font-size:22pt;font-weight:900;letter-spacing:-.04em;line-height:.9;color:{C_CREME}">PELLEGRINO</div>
  <div style="position:absolute;right:6mm;top:6.5mm;width:17mm;height:17mm;border-radius:50%;border:.35mm solid {C_INK};box-shadow:0 0 0 .7mm {C_BG}, 0 0 0 .95mm {C_INK};
       display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-10deg);color:{C_INK}">
    <b style="font-size:5.2pt;font-weight:900;letter-spacing:.1em;line-height:1.15;text-align:center">FAIT<br>MAISON</b>
    <div style="width:5.6mm;height:5.6mm;margin-top:.4mm">{ic(cookie(C_INK, False, C_BG))}</div></div>
  <div style="position:absolute;left:7mm;bottom:10.2mm;font-size:5.6pt;font-weight:800;letter-spacing:.2em;color:{C_INK}">GOURMANDISES DE MARCHÉ · 7J/7</div>
  <div style="position:absolute;left:7mm;bottom:5.4mm;font-size:6.6pt;font-weight:800;color:{C_INK};display:flex;align-items:center;gap:1mm;--c:{C_INK}">{ui(I_TEL)}{TEL}</div>
  <div style="position:absolute;right:6.5mm;bottom:5mm;width:9mm;height:9mm">{ic(sachet(C_INK, C_BG))}</div>
</div>'''
C_pictos = [gateau(C_TON), tarte(C_TON, C_INK), cupcake(C_TON), cookie(C_TON, False, C_INK), None,
            sachet(C_TON, C_INK), tarte(C_TON, C_INK), gateau(C_TON), cupcake(C_TON)]
def rond_C(i, body):
    if body is None:
        return f'<div class="rond" style="background:{C_CREME};border:.55mm solid {C_INK};color:{C_INK}"><b style="font-size:3.7pt;line-height:1.2;text-align:center;letter-spacing:0">5<br>DOUCEUR</b></div>'
    return f'<div class="rond" style="border:.55mm solid {C_INK}"><div class="pic">{ic(body)}</div><span style="color:{C_INK}">{i}</span></div>'
C_verso = f'''
<div class="carte" style="background:{C_BG};color:{C_INK}">
  <div style="position:absolute;left:5.5mm;top:4.2mm;font-size:9.6pt;font-weight:900;letter-spacing:-.02em">CARTE DE FIDÉLITÉ</div>
  <div style="position:absolute;left:5.5mm;top:8.9mm;font-size:5.4pt;font-weight:500">5 tampons : une petite douceur. 10 tampons : une gourmandise offerte.</div>
  <div class="grille" style="left:5.5mm;top:12.6mm">{''.join(rond_C(i+1, b) for i, b in enumerate(C_pictos))}
    <div class="rond" style="background:{C_INK};color:{C_CREME}"><div class="pic" style="width:42%;height:42%">{ic(gateau(C_CREME))}</div><b>OFFERT</b></div></div>
  <div class="bonus deux" style="top:36.6mm">
    <div style="background:#cfa979;--c:{C_INK}">{ui(I_FETE)}<p>Le mois de votre anniversaire : <b>1 part offerte</b></p></div>
    <div style="background:#cfa979;--c:{C_INK}">{ui(I_AMIS)}<p>Parrainage : 1 tampon pour vous, 1 pour votre ami</p></div>
  </div>
  <div class="pied" style="border-top:.25mm solid #c49c6d;--c:{C_INK}">
    <div class="marches">{marches_ligne}</div>
    <div class="tel">{ui(I_TEL)}{TEL}<small>envoi ou retrait sur place</small></div>
  </div>
</div>'''

PISTES = [
    ('Piste A', 'Marché provençal : banne de marché, étal de gourmandises.', 'Verso : tampons + bonus', A_recto, A_verso),
    ('Piste B', 'Pâtisserie chic : monogramme, filet doré.', 'Verso : collection gourmande (goûter toute la gamme)', B_recto, B_verso),
    ('Piste C', 'Artisan gourmand : kraft, tampon « fait maison », sachet.', 'Verso : 2 paliers + anniversaire', C_recto, C_verso),
]
lignes = ''.join(f'''<div class="ligne"><div class="leg"><h2>{t}</h2><p>{d}</p><p class="v">{v}</p></div>{r}{vv}</div>''' for t, d, v, r, vv in PISTES)

html = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Cartes de fidélité · Les gourmandises Pellegrino (v3)</title>
<style>
@font-face {{ font-family: Inter; src: url(fonts/Inter-900.ttf); font-weight: 900; }}
@font-face {{ font-family: Inter; src: url(fonts/Inter-800.ttf); font-weight: 800; }}
@font-face {{ font-family: Inter; src: url(fonts/Inter-700.ttf); font-weight: 700; }}
@font-face {{ font-family: Inter; src: url(fonts/Inter-600.ttf); font-weight: 600; }}
@font-face {{ font-family: Inter; src: url(fonts/Inter-500.ttf); font-weight: 500; }}
@font-face {{ font-family: Accent; src: url(fonts/Gelasio-Italic-400.ttf); }}
@font-face {{ font-family: Serif; src: local("Liberation Serif"), local("DejaVu Serif"); }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: #ebe7e2; font-family: Inter, sans-serif; color: #1f1b18; padding: 7mm 8mm 8mm; width: 214mm; }}
h1 {{ font-size: 11pt; font-weight: 800; }}
.sous {{ font-size: 5.6pt; color: #6b655e; margin: 1mm 0 5mm; }}
.ligne {{ display: grid; grid-template-columns: 22mm 85mm 85mm; gap: 5mm; margin-bottom: 5mm; align-items: start; }}
.leg h2 {{ font-size: 7.4pt; font-weight: 800; margin-bottom: 1mm; }}
.leg p {{ font-size: 5pt; line-height: 1.4; color: #3b3632; }}
.leg p.v {{ color: #a2472a; font-weight: 700; margin-top: 1.4mm; }}
.carte {{ position: relative; width: 85mm; height: 55mm; border-radius: 2.6mm; overflow: hidden; box-shadow: 0 .8mm 2.4mm rgba(60,40,20,.14); }}
.banne {{ position: absolute; left: -1mm; top: 0; width: 87mm; height: 9mm; }}
.ui {{ width: 2.6mm; height: 2.6mm; flex: none; color: var(--c); }}
.grille {{ position: absolute; display: grid; grid-template-columns: repeat(5, 9.6mm); column-gap: 5.2mm; row-gap: 1.4mm; }}
.rond {{ position: relative; width: 9.6mm; height: 9.6mm; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }}
.rond .pic {{ width: 52%; height: 52%; }}
.rond span {{ position: absolute; right: -.6mm; bottom: -.4mm; font-size: 4pt; font-weight: 800; }}
.rond b {{ font-size: 4.4pt; font-weight: 900; margin-top: .3mm; letter-spacing: .02em; }}
.bonus {{ position: absolute; left: 5.5mm; right: 5.5mm; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2mm; }}
.bonus.deux {{ grid-template-columns: 1fr 1fr; }}
.bonus > div {{ display: flex; align-items: center; gap: 1mm; border-radius: 1mm; padding: 1mm 1.2mm; min-height: 5.4mm; }}
.bonus p {{ font-size: 4.2pt; font-weight: 600; line-height: 1.25; }}
.bonus b {{ font-weight: 800; }}
.pied {{ position: absolute; left: 5.5mm; right: 5.5mm; bottom: 3.6mm; padding-top: 1.1mm; display: flex; justify-content: space-between; align-items: flex-end; gap: 2mm; }}
.marches {{ font-size: 4pt; line-height: 1.4; font-weight: 500; max-width: 47mm; }}
.marches b {{ font-weight: 800; }}
.tel {{ display: grid; grid-template-columns: auto auto; column-gap: .8mm; align-items: center; font-size: 7pt; font-weight: 900; white-space: nowrap; text-align: right; }}
.tel small {{ grid-column: 1 / 3; font-size: 4pt; font-weight: 600; opacity: .8; }}
.case {{ height: 10.6mm; border-radius: 1.2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5mm; }}
.case .pic {{ width: 4.6mm; height: 4.6mm; }}
.case span {{ font-family: Serif; font-size: 4.2pt; text-align: center; line-height: 1.1; }}
.note {{ font-size: 5pt; color: #6b655e; margin-top: 1mm; }}
</style></head><body>
<h1>Cartes de fidélité · Les gourmandises Pellegrino — 3 pistes, 3 façons de fidéliser (v3)</h1>
<p class="sous">Maquettes 85 × 55 mm recto/verso, avec les infos d’Alex (Facebook) : nom, marchés 7j/7, commandes au {TEL}, envoi ou retrait sur place. Récompenses et bonus : propositions à valider avec Alex.</p>
{lignes}
<p class="note">Sources : publications Facebook d’Alex Don Pellegrino (marchés, téléphone, produits). Les noms « Cake, Chou, Cupcake, Tarte, Spécialité du mois » de la piste B sont à remplacer par ses vrais produits.</p>
</body></html>'''
open(os.path.join(D, 'planche_v3.html'), 'w').write(html)
print('ok')
