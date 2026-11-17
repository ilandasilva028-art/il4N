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
.col{{flex:1;display:flex;flex-direction:column;justify-content:space-between}}.col:first-child{{flex:1.12}}
.rit{{margin-top:.5cm}}.rit:first-child{{margin-top:0}}
.rit h2{{font-weight:700;font-size:{sh(.64)};line-height:1.2}}
.rit p{{font-weight:600;font-size:{s(.56)};line-height:1.36;margin-top:.08cm;color:#25222a}}
hr{{border:0;height:.1cm;background:#b5bea6;opacity:.85;margin:.6cm 0 .45cm}}
.mc h2{{font-weight:700;font-size:{sh(.7)};line-height:1.25}}
.mc p{{font-weight:600;font-size:{s(.53)};line-height:1.34;margin-top:.14cm}}
.ens h3{{white-space:nowrap;font-weight:800;font-size:{sh(.74)};letter-spacing:.01em}}
.ens .s2{{color:#a58fb4;font-weight:500;font-size:{s(.56)};margin-top:.05cm}}
.card{{border-radius:.7cm;padding:.34cm .7cm;margin-top:.4cm}}
.card h4{{font-weight:800;font-size:{sh(.66)};line-height:1.2}}.card p{{font-weight:600;font-size:{sh(.54)};line-height:1.32;margin-top:.06cm}}
.c1{{background:#cdbbd9}}.c2{{background:#cddbcb}}.c3{{background:#b6a3c2}}
.c3 h4{{font-size:{sh(.68)}}}.c3 small{{font-size:{sh(.46)};font-weight:700}}
ul{{list-style:none;margin-top:.38cm}}
li{{font-weight:600;font-size:{s(.54)};line-height:1.42;padding-left:.8cm;position:relative}}
li:before{{content:"";position:absolute;left:.2cm;top:.52em;width:.2cm;height:.2cm;border-radius:50%;background:#8b6fb0}}
.solo{{background:#eba9b1;border-radius:.6cm;font-weight:800;font-size:{sh(.62)};text-align:center;padding:.2cm 0;margin:.5cm auto 0;width:fit-content;padding:.2cm 1.2cm}}
.ul2 li{{font-size:{s(.52)}}}
.warn{{background:#f2d7de;border-radius:.6cm;text-align:center;font-weight:600;font-size:{s(.5)};line-height:1.38;padding:.28cm .6cm;margin-top:.5cm}}
.tiny{{text-align:center;font-weight:600;font-size:{s(.4)};margin-top:.15cm}}
.addr{{background:#eee8df;border:.04cm solid #cfc7bb;border-radius:.5cm;text-align:center;padding:.4cm .7cm;margin:.3cm 0 0;flex:none;width:{19.5*k}cm}}
.addr b{{font-weight:700;white-space:nowrap;font-size:{sh(.6)}}}.addr span{{display:block;font-weight:500;font-size:{sh(.44)};margin-top:.05cm}}
.sc{{font-family:Script;font-style:italic;text-align:center;font-size:{sh(.95)};margin-top:0;color:#3a343c}}
.end{{text-align:center;font-weight:700;font-size:{sh(.8)};margin-top:.08cm}}
.end2{{text-align:center;font-weight:600;font-size:{s(.46)};margin-top:.05cm}}
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
<div class="rit"><h2>RITUEL DÉCOUVERTE • 50 min • 75€</h2><p>Gommage cuir chevelu, shampooing, soins, massage shiatsu, luminothérapie, arche de pluie, bain vapeur, massage visage / nuque / buste / bras / mains, brushing</p></div>
<div class="rit"><h2>RITUEL PROMENADE • 90 min (1h15) • 90€</h2><p>Gommage cuir chevelu, shampooing, soins, massage shiatsu, arche de pluie, massage visage / buste / bras / mains, brushing + massage plus long</p></div>
<div class="rit"><h2>RITUEL ESCAPADE • 1h30 • 125€</h2><p>Gommage cuir chevelu, shampooing, soins, massage shiatsu, luminothérapie, arche de pluie, argile, bain de vapeur, massage visage / nuque / buste / bras / mains, soins et masque visage, brushing.</p></div>
<div class="rit"><h2>RITUEL FOOTSPA • 45 min • 45€</h2><p>Gommage pieds &amp; demi-jambes, bain sel d'Himalaya &amp; huile aromatique, massage demi-jambes &amp; pieds, massage cuir chevelu.</p></div>
<div class="rit"><h2>RITUEL DÉTENTE • 30 min • 45€</h2><p>Massage cuir chevelu, gommage, shampooings, massage nuque / buste / bras / mains.</p></div>
<div class="rit"><h2>RITUEL REVITALISANT • 45 min • 60€</h2><p>Massage cuir chevelu, gommage, argile, shampooings, massage nuque / buste / bras / mains.</p><p>Massage cuir chevelu, gommage, argile, shampooings.</p></div>

</div><div class="col">
<div class="ens"><h3>FORMULES ENFANTS &amp; ADOS</h3><div class="s2">Réservé 5 à 13 ans - doux &amp; adapté</div>
<div class="card c1"><h4>RITUEL DOUCEUR • 25€ • 30 MIN</h4><p>Gommage + Shampooing + Soin<br>douceur cuir chevelu sensible</p></div>
<div class="card c2"><h4>RITUEL ÉQUILIBRE • 35€ • 40 MIN</h4><p>Gommage • Shampooing • Argile • Soin<br>équilibre &amp; pureté cheveux jeunes</p></div></div>
<div class="card c3" style="margin-top:.8cm"><h4>L'EXCLUSIVITÉ LUZO HEADSPA + SAUNA DOME - EN COMPLÉMENT +25€ <small>(sauf Foot Spa)</small></h4></div>
<ul><li>Le corps se détoxifie pendant que la tête est massée &amp; chouchoutée</li><li>Chaleur enveloppante : relâchement musculaire total du corps</li><li>Booste circulation sanguine globale</li><li>Expérience holistique : corps léger + cuir chevelu sain &amp; apaisé</li><li>Amplifie la détente du Head Spa x2</li></ul>
<div class="solo">EN SOLO - 38€ - 30 MIN</div>
<ul class="ul2"><li>Détox profonde • élimine toxines</li><li>Brûle 300 à 600 kcal</li><li>Soulage douleurs &amp; tensions</li><li>Peau éclatante • sommeil amélioré</li></ul>
<div class="warn">Femme enceinte • problèmes cardiaques • hypertension • pacemaker • fièvre • plaies ouvertes • avis médical si doute</div>
<div class="tiny">ça commence à la racine • LUZOheadspa</div>
</div></div>
<div class="mcw"><hr><div class="mc"><h2>MASSAGE CRÂNIEN • 30 min • 25€ / 40 min • 30€ / 50 min • 40€</h2>
<p>30 min - 25€ : massage crânien relaxant, stimulation et détente du cuir chevelu, relâche tensions.</p>
<p>40 min - 30€ : massage crânien + massage visage, détente visage et cuir chevelu, soin visage relaxant.</p>
<p>50 min - 40€ : massage crânien + visage &amp; épaules, expérience complète, détente épaules, nuque et visage pour lâcher-prise total.</p></div></div>
<div class="bottom"><div class="addr"><b>3 rue du Midi • 13550 Noves • 06 61 07 66 36</b><span>LUZO Head Spa • Sur rendez-vous -</span></div><div class="sig"><div class="sc">ça commence à la racine</div><div class="end">Luzoheadspa bien plus qu'un Soin un Rituel</div><div class="end2">Votre moment de détente.</div></div></div>
</div></body></html>'''
open(out,'w',encoding='utf-8').write(html)
