#!/usr/bin/env python3
"""Ajoute le tracé de découpe à la forme (zigzag ticket_forme.py) sur chaque page d'un PDF imprimeur :
couleur d'accompagnement « CutContour » (nom standard des imprimeurs, 100 % magenta), filet 0,25 pt, en surimpression.
Le contenu d'origine n'est pas modifié : le tracé est ajouté en dernier flux de la page (pikepdf).
Usage : python3 decoupe.py entree.pdf sortie.pdf [fond_perdu_mm=3]"""
import sys
import pikepdf
from pikepdf import Name, Dictionary, Array
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import ticket_forme as F

src, dst = sys.argv[1], sys.argv[2]; b = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
MM = 72 / 25.4
pdf = pikepdf.open(src)
fn = pdf.make_indirect(Dictionary(FunctionType=2, Domain=[0, 1], C0=[0, 0, 0, 0], C1=[0, 1, 0, 0], N=1))
cut_cs = pdf.make_indirect(Array([Name.Separation, Name('/CutContour'), Name.DeviceCMYK, fn]))
cut_gs = pdf.make_indirect(Dictionary(Type=Name.ExtGState, OP=True, op=True, OPM=1))
for page in pdf.pages:
    H = float(page.mediabox[3]) - float(page.mediabox[1])
    pts = [((b + x) * MM, H - (b + y) * MM) for x, y in F.contour()]
    path = f"{pts[0][0]:.3f} {pts[0][1]:.3f} m " + " ".join(f"{x:.3f} {y:.3f} l" for x, y in pts[1:]) + " h"
    if Name.Resources not in page.obj: page.obj.Resources = Dictionary()
    res = page.obj.Resources
    if Name.ColorSpace not in res: res.ColorSpace = Dictionary()
    if Name.ExtGState not in res: res.ExtGState = Dictionary()
    res.ColorSpace[Name('/CutCS')] = cut_cs
    res.ExtGState[Name('/CutGS')] = cut_gs
    page.contents_add(pikepdf.Stream(pdf, b"q\n"), prepend=True)
    page.contents_add(pikepdf.Stream(pdf, f"Q\nq /CutGS gs /CutCS CS 1 SCN 0.25 w 1 j {path} S Q\n".encode()))
pdf.save(dst)
print(dst, f"{len(pdf.pages)} page(s), tracé CutContour {len(F.contour())} points")
