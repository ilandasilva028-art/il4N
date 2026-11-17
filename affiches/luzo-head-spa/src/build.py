import sys
W=float(sys.argv[1]); H=float(sys.argv[2]); out=sys.argv[3]
k=W/40.0                       # échelle par rapport au 40 cm
F=float(sys.argv[4]) if len(sys.argv)>4 else 1.04
v=H/70.0
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
.pg{{position:absolute;inset:0;padding:{2.2*v}cm {2.2*k}cm 1.6cm {2.2*k}cm;z-index:1}}
.logo{{display:block;margin:0 0 0 {2.2*k}cm;height:{5.6*v}cm;align-self:flex-start}}
h1{{font-weight:400;font-size:2.1cm;letter-spacing:.06em;text-align:center;margin-top:.6cm;line-height:1;color:#2b2830}}
.sub{{text-align:center;color:#a58fb4;font-weight:500;font-size:.78cm;margin-top:.45cm}}
.rit{{margin-top:.62cm}}
.rit h2{{font-weight:700;font-size:.68cm;letter-spacing:.005em}}
.rit p{{font-weight:600;font-size:.47cm;line-height:1.38;margin-top:.1cm;color:#25222a}}
.list{{margin-top:.9cm;width:{35.4*k}cm}}
hr{{border:0;height:.1cm;background:#b5bea6;opacity:.85;margin:.85cm 0 .6cm;width:100%}}
.mc h2{{font-weight:700;font-size:.62cm;text-align:center}}
.mc p{{font-weight:600;font-size:.46cm;line-height:1.4;text-align:center;margin-top:.22cm}}
.ens h3{{font-weight:800;font-size:.95cm;text-align:center;margin-top:.8cm;letter-spacing:.01em}}
.ens .s{{text-align:center;color:#a58fb4;font-weight:500;font-size:.5cm;margin-top:.05cm}}
.card{{border-radius:.7cm;text-align:center;padding:.38cm .8cm;margin:.42cm auto 0;width:{34*k}cm}}
.card h4{{font-weight:800;font-size:.6cm}}.card p{{font-weight:600;font-size:.45cm;line-height:1.35;margin-top:.08cm}}
.c1{{background:#cdbbd9}}.c2{{background:#cddbcb}}.c3{{background:#b6a3c2}}
.c3 h4{{font-size:.62cm}}.c3 small{{font-size:.42cm;font-weight:700}}
ul{{list-style:none;margin:.42cm auto 0;width:{34*k}cm}}
li{{font-weight:600;font-size:.46cm;line-height:1.5;padding-left:.85cm;position:relative}}
li:before{{content:"";position:absolute;left:.25cm;top:.5em;width:.2cm;height:.2cm;border-radius:50%;background:#8b6fb0}}
.solo{{background:#eba9b1;border-radius:.6cm;font-weight:800;font-size:.56cm;text-align:center;padding:.22cm 0;width:{23*k}cm;margin:.5cm auto 0}}
.ul2{{margin-top:.28cm;width:{22*k}cm}}.ul2 li{{font-size:.43cm;line-height:1.45}}
.warn{{background:#f2d7de;border-radius:.6cm;text-align:center;font-weight:600;font-size:.43cm;line-height:1.4;padding:.28cm .8cm;margin:.45cm auto 0;width:{35*k}cm}}
.tiny{{text-align:center;font-weight:600;font-size:.36cm;margin-top:.2cm}}
.addr{{background:#eee8df;border:.04cm solid #cfc7bb;border-radius:.5cm;text-align:center;padding:.35cm .6cm;margin:.5cm auto 0;width:{34*k}cm}}
.addr b{{font-weight:700;font-size:.62cm}}.addr span{{display:block;font-weight:500;font-size:.4cm;margin-top:.06cm}}
.sc{{font-family:Script;font-style:italic;text-align:center;font-size:.85cm;margin-top:.55cm;color:#3a343c}}
.end{{text-align:center;font-weight:700;font-size:.72cm;margin-top:.15cm}}
.end2{{text-align:center;font-weight:600;font-size:.42cm;margin-top:.08cm}}
.wrap{{display:flex;flex-direction:column;align-items:center}}
'''
blobs=f'''
<div class="b" style="right:-{4*k}cm;top:-{3*k}cm;width:{26*k}cm;height:{23*k}cm;background:#ceb6ce;border-radius:60% 40% 55% 45%/55% 50% 50% 45%;transform:rotate(-14deg)"></div>
<div class="b" style="left:-{3.5*k}cm;top:{15.3*v}cm;width:{7*k}cm;height:{7*k}cm;background:#ad86b5;border-radius:50%"></div>
<div class="b" style="left:-{3.3*k}cm;top:{29*v}cm;width:{9*k}cm;height:{9*k}cm;background:#dfc7dc;border-radius:50%"></div>
<div class="b" style="right:-{5*k}cm;top:{23*v}cm;width:{15*k}cm;height:{9.5*k}cm;background:#b5bead;border-radius:50% 45% 52% 48%/55% 50% 50% 45%"></div>
<div class="b" style="right:-{5*k}cm;top:{44.5*v}cm;width:{13*k}cm;height:{11*k}cm;background:#dcc6dc;border-radius:50%"></div>
<div class="b" style="right:-{6*k}cm;top:{53.5*v}cm;width:{12*k}cm;height:{9*k}cm;background:#b9c3b1;border-radius:50%"></div>
<div class="b" style="left:-{6*k}cm;bottom:-{4}cm;width:{23*k}cm;height:{13*k}cm;background:#e4ebe0;border-radius:50%"></div>
'''
import re as _re
css=_re.sub(r'font-size:(\d*\.?\d+)cm',lambda m:'font-size:%.3fcm'%(float(m.group(1))*F),css)
html=f'''<!doctype html><html lang="fr"><meta charset="utf-8"><title>LUZO Head Spa — Nos prestations {W:g}x{H:g} cm</title><style>{css}</style><body>{blobs}
<div class="pg"><div class="wrap">
<img class="logo" src="logo.png" alt="LUZO Head Spa">
<h1>NOS PRESTATIONS</h1><div class="sub">Nos rituels - moments de bien-être &amp; détente</div>
<div class="list">
<div class="rit"><h2>RITUEL DÉCOUVERTE • 50 min • 75€</h2><p>Gommage cuir chevelu, shampooing, soins, massage shiatsu, luminothérapie, arche de pluie, bain vapeur, massage visage / nuque / buste / bras / mains, brushing</p></div>
<div class="rit"><h2>RITUEL PROMENADE • 90 min (1h15) • 90€</h2><p>Gommage cuir chevelu, shampooing, soins, massage shiatsu, arche de pluie, massage visage / buste / bras / mains, brushing + massage plus long</p></div>
<div class="rit"><h2>RITUEL ESCAPADE • 1h30 • 125€</h2><p>Gommage cuir chevelu, shampooing, soins, massage shiatsu, luminothérapie, arche de pluie, argile, bain de vapeur, massage visage / nuque / buste / bras / mains, soins et masque visage, brushing.</p></div>
<div class="rit"><h2>RITUEL FOOTSPA • 45 min • 45€</h2><p>Gommage pieds &amp; demi-jambes, bain sel d'Himalaya &amp; huile aromatique, massage demi-jambes &amp; pieds, massage cuir chevelu.</p></div>
<div class="rit"><h2>RITUEL DÉTENTE • 30 min • 45€</h2><p>Massage cuir chevelu, gommage, shampooings, massage nuque / buste / bras / mains.</p></div>
<div class="rit"><h2>RITUEL REVITALISANT • 45 min • 60€</h2><p>Massage cuir chevelu, gommage, argile, shampooings, massage nuque / buste / bras / mains.</p><p>Massage cuir chevelu, gommage, argile, shampooings.</p></div>
</div>
<hr style="width:{35*k}cm">
<div class="mc" style="width:{35*k}cm"><h2>MASSAGE CRÂNIEN • 30 min • 25€ / 40 min • 30€ / 50 min • 40€</h2>
<p>30 min - 25€ : massage crânien relaxant, stimulation et détente du cuir chevelu, relâche tensions.</p>
<p>40 min - 30€ : massage crânien + massage visage, détente visage et cuir chevelu, soin visage relaxant.</p>
<p>50 min - 40€ : massage crânien + visage &amp; épaules, expérience complète, détente épaules, nuque et visage pour lâcher-prise total.</p></div>
<div class="ens"><h3>FORMULES ENFANTS &amp; ADOS</h3><div class="s">Réservé 5 à 13 ans - doux &amp; adapté</div>
<div class="card c1"><h4>RITUEL DOUCEUR • 25€ • 30 MIN</h4><p>Gommage + Shampooing + Soin<br>douceur cuir chevelu sensible</p></div>
<div class="card c2"><h4>RITUEL ÉQUILIBRE • 35€ • 40 MIN</h4><p>Gommage • Shampooing • Argile • Soin<br>équilibre &amp; pureté cheveux jeunes</p></div></div>
<div class="card c3" style="margin-top:.7cm"><h4>L'EXCLUSIVITÉ LUZO HEADSPA + SAUNA DOME<br>- EN COMPLÉMENT +25€ <small>(sauf Foot Spa)</small></h4></div>
<ul><li>Le corps se détoxifie pendant que la tête est massée &amp; chouchoutée</li><li>Chaleur enveloppante : relâchement musculaire total du corps</li><li>Booste circulation sanguine globale</li><li>Expérience holistique : corps léger + cuir chevelu sain &amp; apaisé</li><li>Amplifie la détente du Head Spa x2</li></ul>
<div class="solo">EN SOLO - 38€ - 30 MIN</div>
<ul class="ul2"><li>Détox profonde • élimine toxines</li><li>Brûle 300 à 600 kcal</li><li>Soulage douleurs &amp; tensions</li><li>Peau éclatante • sommeil amélioré</li></ul>
<div class="warn">Femme enceinte • problèmes cardiaques • hypertension • pacemaker<br>• fièvre • plaies ouvertes • avis médical si doute</div>
<div class="tiny">ça commence à la racine • LUZOheadspa</div>
<div class="addr"><b>3 rue du Midi • 13550 Noves • 06 61 07 66 36</b><span>LUZO Head Spa • Sur rendez-vous -</span></div>
<div class="sc">ça commence à la racine</div>
<div class="end">Luzoheadspa bien plus qu'un Soin un Rituel</div><div class="end2">Votre moment de détente.</div>
</div></div></body></html>'''
open(out,'w',encoding='utf-8').write(html)
