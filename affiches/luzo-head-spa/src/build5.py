import sys
W0=float(sys.argv[1]); H0=float(sys.argv[2]); out=sys.argv[3]; F=float(sys.argv[4]); BL=float(sys.argv[5]) if len(sys.argv)>5 else 0.0
W=W0+2*BL; H=H0+2*BL
def s(x): return f'{x*F:.3f}cm'
css=f'''
@font-face{{font-family:Inter;font-weight:400;src:url(Inter-Regular.ttf)}}
@font-face{{font-family:Inter;font-weight:500;src:url(Inter-Medium.ttf)}}
@font-face{{font-family:Inter;font-weight:600;src:url(Inter-SemiBold.ttf)}}
@font-face{{font-family:Inter;font-weight:700;src:url(Inter-Bold.ttf)}}
@font-face{{font-family:Inter;font-weight:800;src:url(Inter-ExtraBold.ttf)}}
@font-face{{font-family:Script;font-style:italic;src:url(accent.ttf)}}
@page{{size:{W}cm {H}cm;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{W}cm;height:{H}cm;overflow:hidden}}
.bg{{position:absolute;left:0;top:0;width:{W}cm;height:{H}cm;overflow:hidden;z-index:0}}
body{{background:#f7efef;color:#1d1a1f;font-family:Inter,sans-serif;position:relative;overflow:hidden;text-align:center}}
.b{{position:absolute;z-index:0}}
.pg{{position:absolute;inset:0;padding:{1.4+BL:.2f}cm {2+BL:.2f}cm {1.4+BL:.2f}cm {2+BL:.2f}cm;z-index:1;display:flex;flex-direction:column;justify-content:space-between;align-items:center}}
.pg>*{{width:100%}}
.logo{{height:{s(3.2)};display:block;margin:0 auto}}
h1{{font-weight:400;font-size:{s(1.55)};letter-spacing:.08em;line-height:1;color:#2b2830;margin-top:.15cm}}
.sub{{color:#9a80ad;font-weight:500;font-size:{s(.55)};margin-top:.15cm}}
.rit h2{{font-weight:800;font-size:{s(.5)}}}
.rit p{{font-weight:600;font-size:{s(.4)};line-height:1.3;margin-top:.05cm;color:#25222a}}
hr{{border:0;height:.08cm;background:#b5bea6;width:60%;margin:0 auto}}
.mc h2{{font-weight:800;font-size:{s(.5)}}}
.mc p{{font-weight:600;font-size:{s(.4)};line-height:1.3;margin-top:.04cm}}
.ens h3{{font-weight:800;font-size:{s(.68)}}}
.ens .s2{{color:#9a80ad;font-weight:500;font-size:{s(.4)}}}
.cards{{display:flex;gap:.8cm;justify-content:center;margin-top:.3cm}}
.card{{border-radius:.6cm;padding:.25cm .6cm}}
.cards .card{{flex:1}}
.card h4{{font-weight:800;font-size:{s(.46)}}}.card p{{font-weight:600;font-size:{s(.38)};line-height:1.3;margin-top:.04cm}}
.c1{{background:#cdbbd9}}.c2{{background:#cddbcb}}.c3{{background:#b6a3c2;width:80%;margin:0 auto}}
.c3 small{{font-size:{s(.34)};font-weight:700}}
.bul{{font-weight:600;font-size:{s(.4)};line-height:1.42;margin-top:.15cm}}
.bul span{{color:#8b6fb0}}
.solo{{display:inline-block;background:#eba9b1;border-radius:.5cm;font-weight:800;font-size:{s(.46)};padding:.12cm 1cm;margin-top:.15cm}}
.warn{{background:#f2d7de;border-radius:.5cm;font-weight:600;font-size:{s(.36)};line-height:1.35;padding:.18cm .6cm;width:85%;margin:.15cm auto 0}}
.rit p,.mc p,.warn,.bul,h2,h4{{text-wrap:balance}}
.rit h2 .m,.card h4 .m{{color:#6b4a8a}}
.ens h3 .s2{{display:inline;font-size:.7em}}
.tiny{{font-weight:600;font-size:{s(.3)};margin-top:.08cm}}
.addr{{background:#eee8df;border:.04cm solid #cfc7bb;border-radius:.5cm;padding:.22cm .6cm;width:70%;margin:0 auto}}
.addr b{{font-weight:700;font-size:{s(.5)}}}.addr span{{display:block;font-weight:500;font-size:{s(.32)}}}
.sc{{font-family:Script;font-style:italic;font-size:{s(.62)};color:#3a343c}}
.end{{font-weight:700;font-size:{s(.52)}}}
.end2{{font-weight:600;font-size:{s(.34)}}}
'''
blobs=f'''
<div class="b" style="right:-5cm;top:-4cm;width:22cm;height:15cm;background:#ceb6ce;border-radius:60% 40% 55% 45%/55% 50% 50% 45%;transform:rotate(-14deg)"></div>
<div class="b" style="left:-5.5cm;top:13cm;width:8cm;height:8cm;background:#ad86b5;border-radius:50%"></div>
<div class="b" style="right:-6cm;top:20cm;width:11cm;height:8cm;background:#b5bead;border-radius:50% 45% 52% 48%/55% 50% 50% 45%"></div>
<div class="b" style="left:-6cm;top:29cm;width:10cm;height:10cm;background:#dfc7dc;border-radius:50%"></div>
<div class="b" style="right:-6cm;top:40cm;width:11cm;height:10cm;background:#dcc6dc;border-radius:50%"></div>
<div class="b" style="left:-7cm;bottom:-5cm;width:16cm;height:12cm;background:#e4ebe0;border-radius:50%"></div>
'''
html=f'''<!doctype html><html lang="fr"><meta charset="utf-8"><title>LUZO Head Spa — Nos prestations {W:g}x{H:g} cm</title><style>{css}</style><body><div class="bg">{blobs}</div>
<div class="pg">
<div><img class="logo" src="logo.png" alt="LUZO Head Spa"><h1>NOS PRESTATIONS</h1><div class="sub">Nos rituels - moments de bien-être &amp; détente</div></div>
<div class="rit"><h2>RITUEL DÉCOUVERTE <span class="m">• 50 min • 75€</span></h2><p>Gommage, shampooing, soins, shiatsu, luminothérapie, arche de pluie, bain vapeur, massages, brushing</p></div>
<div class="rit"><h2>RITUEL PROMENADE <span class="m">• 1h15 • 90€</span></h2><p>Gommage, shampooing, soins, shiatsu, arche de pluie, massages visage, buste, bras, mains plus longs, brushing</p></div>
<div class="rit"><h2>RITUEL ESCAPADE <span class="m">• 1h30 • 125€</span></h2><p>Gommage, shampooing, soins, shiatsu, luminothérapie, arche de pluie, argile, bain de vapeur, massages, soin et masque visage, brushing</p></div>
<div class="rit"><h2>RITUEL FOOTSPA <span class="m">• 45 min • 45€</span></h2><p>Gommage et bain des pieds au sel d'Himalaya, massage jambes, pieds et cuir chevelu</p></div>
<div class="rit"><h2>RITUEL DÉTENTE <span class="m">• 30 min • 45€</span></h2><p>Gommage, shampooings, massage cuir chevelu, nuque, buste, bras, mains</p></div>
<div class="rit"><h2>RITUEL REVITALISANT <span class="m">• 45 min • 60€</span></h2><p>Gommage, argile, shampooings, massage cuir chevelu, nuque, buste, bras, mains</p></div>
<hr>
<div class="mc"><h2>MASSAGE CRÂNIEN</h2><p>30 min • 25€ &nbsp;|&nbsp; 40 min + visage • 30€ &nbsp;|&nbsp; 50 min + visage &amp; épaules • 40€</p></div>
<div class="ens"><h3>ENFANTS &amp; ADOS <span class="s2">(5 à 13 ans)</span></h3>
<div class="cards"><div class="card c1"><h4>RITUEL DOUCEUR • 30 min • 25€</h4><p>Gommage • Shampooing • Soin</p></div>
<div class="card c2"><h4>RITUEL ÉQUILIBRE • 40 min • 35€</h4><p>Gommage • Shampooing • Argile • Soin</p></div></div></div>
<div><div class="card c3"><h4>SAUNA DÔME • +25€ en complément <small>(sauf Footspa)</small> • En solo 38€ / 30 min</h4></div>
<div class="bul">Détox • chaleur enveloppante • détente musculaire • sommeil amélioré</div>
<div class="warn">Contre-indications : femme enceinte • problèmes cardiaques • hypertension • pacemaker • fièvre • plaies ouvertes • avis médical si doute</div></div>
<div><div class="sc">ça commence à la racine</div><div class="end">Votre moment de détente.</div></div>
</div></body></html>'''
open(out,'w',encoding='utf-8').write(html)
