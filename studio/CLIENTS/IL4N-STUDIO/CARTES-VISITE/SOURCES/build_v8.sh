#!/usr/bin/env bash
# Export carte v8 « LE BAT » : HTML -> PDF (Chromium) -> assemblage -> CMJN (Ghostscript) -> noirs corrigés.
# Usage : bash SOURCES/build_v8.sh   (depuis CARTES-VISITE/ ; besoin : node+playwright, ghostscript, python3+pikepdf)
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(mktemp -d)
node SOURCES/export_v8.js "$PWD/SOURCES" "$T"
python3 - "$T" <<'PY'
import sys,pikepdf
T=sys.argv[1]; srcs=[pikepdf.open(f'{T}/{f}.pdf') for f in ['bat_recto_v8','bat_verso_v8']]
out=pikepdf.new()
for s in srcs: out.pages.append(s.pages[0])
mm=72/25.4
for pg in out.pages:
    w=float(pg.MediaBox[2]);h=float(pg.MediaBox[3]); pg.TrimBox=[3*mm,3*mm,w-3*mm,h-3*mm]; pg.BleedBox=[0,0,w,h]
out.save('EXPORTS/IL4N_bat_v8_print.pdf')
PY
gs -q -dNOPAUSE -dBATCH -dSAFER -sDEVICE=pdfwrite -dCompatibilityLevel=1.6 -sColorConversionStrategy=CMYK \
  -sProcessColorModel=DeviceCMYK -dOverrideICC=true -sOutputICCProfile=default_cmyk.icc -dEmbedAllFonts=true \
  -dSubsetFonts=true -dAutoRotatePages=/None -o EXPORTS/IL4N_bat_v8_print_CMJN.pdf EXPORTS/IL4N_bat_v8_print.pdf
python3 - <<'PY'
import pikepdf
src='EXPORTS/IL4N_bat_v8_print_CMJN.pdf'; pdf=pikepdf.open(src,allow_overwriting_input=True)
# noirs riches 240 % pour les aplats, gris et repères sur une seule couche (net à l'impression)
R={b'0.745 0.714 0.612 0.796':b'0.6 0.4 0.4 1',b'0.741 0.733 0.592 0.773':b'0.6 0.4 0.4 1',
   b'0.475 0.443 0.341 0.031':b'0 0 0 0.5',b'0.471 0.443 0.31 0.02':b'0 0 0 0.5',
   b'0.565 0.537 0.431 0.141':b'0 0 0 0.62',b'0.639 0.106 0.11 0':b'0.75 0 0 0',b'0.184 0.18 0.263 0':b'0 0 0 0.22'}
for obj in pdf.objects:
    if isinstance(obj,pikepdf.Stream) and '/Length1' not in obj and obj.get('/Subtype')!='/Image':
        try: t=obj.read_bytes()
        except Exception: continue
        o=t
        for a,b in R.items(): t=t.replace(a,b)
        if t!=o: obj.write(t)
pdf.save(src)
PY
rm -rf "$T"; echo "OK : EXPORTS/IL4N_bat_v8_print_CMJN.pdf"
