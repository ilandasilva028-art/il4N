#!/usr/bin/env bash
# Export carte v12 A6 (recto 365 points, verso infos + tarifs) : HTML -> PDF (Chromium) -> assemblage -> CMJN (Ghostscript) -> noirs corrigés.
# Usage : bash SOURCES/build_v8.sh   (depuis CARTES-VISITE/ ; besoin : node+playwright, ghostscript, python3+pikepdf)
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(mktemp -d)
python3 SOURCES/fond_points_v11.py && node SOURCES/export_v12.js "$PWD/SOURCES" "$T"
python3 - "$T" <<'PY'
import sys,pikepdf
T=sys.argv[1]; srcs=[pikepdf.open(f'{T}/{f}.pdf') for f in ['cal_recto_v11','infos_verso_v12']]
out=pikepdf.new()
for s in srcs: out.pages.append(s.pages[0])
mm=72/25.4
for pg in out.pages:
    w=float(pg.MediaBox[2]);h=float(pg.MediaBox[3]); pg.TrimBox=[3*mm,3*mm,w-3*mm,h-3*mm]; pg.BleedBox=[0,0,w,h]
out.save('EXPORTS/IL4N_carte-A6_v12_print.pdf')
PY
gs -q -dNOPAUSE -dBATCH -dSAFER -sDEVICE=pdfwrite -dCompatibilityLevel=1.6 -sColorConversionStrategy=CMYK \
  -sProcessColorModel=DeviceCMYK -dOverrideICC=true -sOutputICCProfile=default_cmyk.icc -dEmbedAllFonts=true \
  -dSubsetFonts=true -dAutoRotatePages=/None -o EXPORTS/IL4N_carte-A6_v12_print_CMJN.pdf EXPORTS/IL4N_carte-A6_v12_print.pdf
python3 - <<'PY'
import pikepdf
src='EXPORTS/IL4N_carte-A6_v12_print_CMJN.pdf'; pdf=pikepdf.open(src,allow_overwriting_input=True)
# noirs riches 240 % pour les aplats, gris et repères sur une seule couche (net à l'impression)
R={b'0.745 0.714 0.612 0.796':b'0.6 0.4 0.4 1',b'0.741 0.733 0.592 0.773':b'0 0 0 1',
   b'0.475 0.443 0.341 0.031':b'0 0 0 0.5',b'0.471 0.443 0.31 0.02':b'0 0 0 0.5',
   b'0.565 0.537 0.431 0.141':b'0 0 0 0.62',b'0.639 0.106 0.11 0':b'0.75 0 0 0',b'0.184 0.18 0.263 0':b'0 0 0 0.22',
   # cercles ton sur ton du recto : un peu plus clairs que le fond (240 %), toujours < 240 %
   b'0.757 0.733 0.584 0.757':b'0.6 0.44 0.4 0.93',b'0.773 0.757 0.557 0.725':b'0.62 0.48 0.4 0.86',
   # v11 : points de l'année (jours / dimanches) ton sur ton, légende grise en noir seul
   b'0.769 0.761 0.541 0.671':b'0.62 0.48 0.4 0.8',b'0.769 0.765 0.51 0.573':b'0.62 0.5 0.4 0.68',b'0.549 0.518 0.384 0.094':b'0 0 0 0.55',
   # v12 : petit texte clair sur le bloc noir « Site internet » sur une seule encre
   b'0.196 0.204 0.098 0':b'0 0 0 0.2'}
for obj in pdf.objects:
    if isinstance(obj,pikepdf.Stream) and '/Length1' not in obj and obj.get('/Subtype')!='/Image':
        try: t=obj.read_bytes()
        except Exception: continue
        o=t
        for a,b in R.items(): t=t.replace(a,b)
        if t!=o: obj.write(t)
pdf.save(src)
PY
python3 - <<'PY'
import pikepdf
# aplat de fond pleine page (sous tout le reste) : supprime le liseré blanc d'1 px au bord du PDF Chromium
src='EXPORTS/IL4N_carte-A6_v12_print_CMJN.pdf'; pdf=pikepdf.open(src,allow_overwriting_input=True)
for pg,col in zip(pdf.pages,[b'0.6 0.4 0.4 1',b'0.024 0.035 0.075 0']):
    w=float(pg.MediaBox[2]); h=float(pg.MediaBox[3])
    pg.contents_add(pdf.make_stream(b'q '+col+b' k -2 -2 %.2f %.2f re f Q\n'%(w+4,h+4)),prepend=True)
pdf.save(src)
PY
rm -rf "$T"; echo "OK : EXPORTS/IL4N_carte-A6_v12_print_CMJN.pdf"
