import sys
W=float(sys.argv[1]); H=float(sys.argv[2]); out=sys.argv[3]; F=float(sys.argv[4]) if len(sys.argv)>4 else 1.0
v=H/70.0; k=W/40.0
def s(x): return f'{x*F:.3f}cm'
Fh=F*0.9
def sh(x): return f'{x*Fh:.3f}cm'
css=f'''
@font-face{{font-family:Inter;font-weight:400;src:url(Inter-Regular.ttf)}}
@font-face{{font-family:Inter;font-weight:500;src:url(Inter-Medium.ttf)}}
@font-face{{font-family:Inter;font-weight:600;src:url(Inter-SemiBold.ttf)}}
@font-face{{font-family:Inter;font-weight:700;src:url(Inter-Bold.ttf)}}
@font-face{{font-family:Inter;font-weight:800;src:url(Inter-ExtraBold.ttf)}}
@font-face{{font-family:Script;font-style:italic;src:url(accent.ttf)}}
@page{{size:{W}cm {H}cm;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{W}cm;height:{H}cm}}
body{{background:#f7efef;color:#1d1a1f;font-family:Inter,sans-serif;position:relative;overflow:hidden}}
.b{{position:absolute;z-index:0}}
.pg{{position:absolute;inset:0;padding:1.5cm {1.7*k}cm 1.7cm {1.7*k}cm;z-index:1;display:flex;flex-direction:column}}
.head{{display:flex;align-items:center;gap:1.4cm}}
.logo{{height:{3.9*v}cm;flex:none}}
.ttl{{flex:1;text-align:center}}
h1{{font-weight:400;font-size:{2.2*1.12:.3f}cm;white-space:nowrap;letter-spacing:.06em;line-height:1;color:#2b2830}}
.sub{{color:#a58fb4;font-weight:500;font-size:{s(.74)};margin-top:.35cm}}
.cols{{display:flex;gap:{2.0*k}cm;margin-top:.7cm;align-items:stretch;flex:1;min-height:0}}
.mcw{{margin-top:.5cm}}.mcw .mc p{{margin-top:.12cm}}.bottom{{margin-top:.6cm;display:flex;align-items:center;justify-content:space-between;gap:1.2cm}}.sig{{text-align:center;flex:1}}
.col{{flex:1;display:flex;flex-direction:column;justify-content:space-between}}.col:first-child{{flex:1.0}}
.rit{{margin-top:.5cm}}.rit:first-child{{margin-top:0}}
.rit h2{{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;column-gap:.6cm;font-weight:800;font-size:{sh(.62)};line-height:1.2}}.rit h2 span:first-child{{white-space:nowrap}}.rit h2 .m{{white-space:nowrap;color:#6b4a8a;font-weight:700}}
.rit p{{font-weight:600;font-size:{s(.5)};line-height:1.36;margin-top:.08cm;color:#25222a}}
hr{{border:0;height:.1cm;background:#b5bea6;opacity:.85;margin:.6cm 0 .45cm}}
.mc h2{{font-weight:700;font-size:{sh(.7)};line-height:1.25}}
.mc p{{font-weight:600;font-size:{s(.53)};line-height:1.34;margin-top:.14cm}}
.ens h3{{white-space:nowrap;font-weight:800;font-size:{sh(.74)};letter-spacing:.01em}}
.ens .s2{{color:#a58fb4;font-weight:500;font-size:{s(.56)};margin-top:.05cm}}
.card{{border-radius:.7cm;padding:.34cm .7cm;margin-top:.4cm}}
.card h4{{font-weight:800;font-size:{sh(.5)};line-height:1.2}}.card p{{font-weight:600;font-size:{sh(.54)};line-height:1.32;margin-top:.06cm}}
.c1{{background:#cdbbd9}}.c2{{background:#cddbcb}}.c3{{background:#b6a3c2}}
.c3 h4{{font-size:{sh(.56)}}}.c3 small{{font-size:{sh(.46)};font-weight:700}}
ul{{list-style:none;margin-top:.38cm}}
li{{font-weight:600;font-size:{s(.54)};line-height:1.42;padding-left:.8cm;position:relative}}
li:before{{content:"";position:absolute;left:.2cm;top:.52em;width:.2cm;height:.2cm;border-radius:50%;background:#8b6fb0}}
.solo{{background:#eba9b1;border-radius:.6cm;font-weight:800;font-size:{sh(.62)};text-align:center;padding:.2cm 0;margin:.5cm auto 0;width:fit-content;padding:.2cm 1.2cm}}
.ul2 li{{font-size:{s(.52)}}}
.warn{{background:#f2d7de;border-radius:.6cm;text-align:center;font-weight:600;font-size:{s(.5)};line-height:1.38;padding:.28cm .6cm;margin-top:.5cm}}
.tiny{{text-align:center;font-weight:600;font-size:{s(.4)};margin-top:.15cm}}
.addr{{background:#eee8df;border:.04cm solid #cfc7bb;border-radius:.5cm;text-align:center;padding:.4cm .7cm;margin:.3cm 0 0;flex:none;width:{19.5*k}cm}}
.addr b{{font-weight:700;white-space:nowrap;font-size:.85cm}}.addr span{{display:block;font-weight:500;font-size:.55cm;margin-top:.05cm}}
.sc{{font-family:Script;font-style:italic;text-align:center;font-size:1.25cm;margin-top:0;color:#3a343c}}
.end{{text-align:center;font-weight:700;font-size:.95cm;margin-top:.05cm;line-height:1.15}}
.end2{{text-align:center;font-weight:600;font-size:.6cm;margin-top:.05cm}}
'''
blobs=f'''
<div class="b" style="right:-{4*k}cm;top:-{3*k}cm;width:{26*k}cm;height:{18*k}cm;background:#ceb6ce;border-radius:60% 40% 55% 45%/55% 50% 50% 45%;transform:rotate(-14deg)"></div>
<div class="b" style="left:-{5.4*k}cm;top:{17*v}cm;width:{7*k}cm;height:{7*k}cm;background:#ad86b5;border-radius:50%"></div>
<div class="b" style="left:-{6.2*k}cm;top:{31*v}cm;width:{9*k}cm;height:{9*k}cm;background:#dfc7dc;border-radius:50%"></div>
<div class="b" style="right:-{5*k}cm;top:{22*v}cm;width:{13*k}cm;height:{9*k}cm;background:#b5bead;border-radius:50% 45% 52% 48%/55% 50% 50% 45%"></div>
<div class="b" style="right:-{5*k}cm;top:{40*v}cm;width:{12*k}cm;height:{10*k}cm;background:#dcc6dc;border-radius:50%"></div>
<div class="b" style="left:-{6*k}cm;bottom:-{4}cm;width:{18*k}cm;height:{13*k}cm;background:#e4ebe0;border-radius:50%"></div>
'''
html=f'''<!doctype html><html lang="fr"><meta charset="utf-8"><title>LUZO Head Spa — Nos prestations {W:g}x{H:g} cm</title><style>{css}</style><body>{blobs}
<div class="pg"><div class="head"><img class="logo" src="logo.png" alt="LUZO Head Spa"><div class="ttl"><h1>NOS PRESTATIONS</h1><div class="sub">Nos rituels - moments de bien-être &amp; détente</div></div></div>
<div class="cols"><div class="col">
<div class="rit"><h2><span>RITUEL DÉCOUVERTE</span><span class="m">50 min • 75€</span></h2><p>Gommage, shampooing, soins, shiatsu, luminothérapie, arche de pluie, bain vapeur, massages, brushing</p></div>
<div class="rit"><h2><span>RITUEL PROMENADE</span><span class="m">1h15 • 90€</span></h2><p>Gommage, shampooing, soins, shiatsu, arche de pluie, massages visage, buste, bras, mains, brushing, massage plus long</p></div>
<div class="rit"><h2><span>RITUEL ESCAPADE</span><span class="m">1h30 • 125€</span></h2><p>Gommage, shampooing, soins, shiatsu, luminothérapie, arche de pluie, argile, bain de vapeur, massages, soins et masque visage, brushing</p></div>
<div class="rit"><h2><span>RITUEL FOOTSPA</span><span class="m">45 min • 45€</span></h2><p>Gommage pieds et demi-jambes, bain sel d'Himalaya, massage pieds et cuir chevelu</p></div>
<div class="rit"><h2><span>RITUEL DÉTENTE</span><span class="m">30 min • 45€</span></h2><p>Massage cuir chevelu, gommage, shampooings, massages nuque, buste, bras, mains</p></div>
<div class="rit"><h2><span>RITUEL REVITALISANT</span><span class="m">45 min • 60€</span></h2><p>Massage cuir chevelu, gommage, argile, shampooings, massages nuque, buste, bras, mains</p></div>
</div><div class="col">
<div class="ens"><h3>ENFANTS &amp; ADOS</h3><div class="s2">Réservé 5 à 13 ans - doux &amp; adapté</div>
<div class="card c1"><h4>RITUEL DOUCEUR • 25€ • 30 MIN</h4><p>Gommage • Shampooing • Soin doux</p></div>
<div class="card c2"><h4>RITUEL ÉQUILIBRE • 35€ • 40 MIN</h4><p>Gommage • Shampooing • Argile • Soin</p></div></div>
<div class="card c3" style="margin-top:.8cm"><h4>SAUNA DOME • +25€ en complément <small>(sauf Foot Spa)</small></h4></div>
<ul><li>Détoxifie le corps pendant le massage</li><li>Chaleur enveloppante, détente musculaire</li><li>Booste la circulation</li><li>Amplifie la détente du Head Spa</li></ul>
<div class="solo">EN SOLO - 38€ - 30 MIN</div>
<ul class="ul2"><li>Détox profonde • élimine toxines</li><li>Brûle 300 à 600 kcal</li><li>Soulage douleurs &amp; tensions</li><li>Peau éclatante • sommeil amélioré</li></ul>
<div class="warn">Contre-indications : femme enceinte • problèmes cardiaques • hypertension • pacemaker • fièvre • plaies ouvertes • avis médical si doute</div>
</div></div>
<div class="mcw"><hr><div class="mc"><h2>MASSAGE CRÂNIEN • 30 min • 25€ / 40 min • 30€ / 50 min • 40€</h2>
<p>30 min : massage relaxant, détente du cuir chevelu</p>
<p>40 min : + massage et soin du visage</p>
<p>50 min : + visage et épaules, lâcher-prise total</p></div></div>
<div class="bottom"><div class="addr"><b>3 rue du Midi • 13550 Noves • 06 61 07 66 36</b><span>LUZO Head Spa • Sur rendez-vous -</span></div><div class="sig"><div class="sc">ça commence à la racine</div><div class="end">Luzoheadspa bien plus qu'un Soin un Rituel</div><div class="end2">Votre moment de détente.</div></div></div>
</div></body></html>'''
open(out,'w',encoding='utf-8').write(html)
