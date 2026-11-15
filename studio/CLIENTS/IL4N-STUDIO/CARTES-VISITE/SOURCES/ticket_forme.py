"""Forme du ticket IL4N 55x85 mm (zigzag haut/bas) : version Python de ticket-forme.js."""
W, H, DENT, PROF = 55, 85, 2.5, 1.5
def contour():
    n = round(W / DENT); d = W / n; pts = []
    for i in range(n + 1): pts.append((i * d, PROF if i % 2 else 0))
    for i in range(n, -1, -1): pts.append((i * d, H - PROF if i % 2 else H))
    return pts
