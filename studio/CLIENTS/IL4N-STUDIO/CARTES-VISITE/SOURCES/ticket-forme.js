// Forme du ticket IL4N (55×85 mm) : bords haut et bas en zigzag. Partagé par les faces, l'aperçu et le tracé de découpe.
// Coordonnées en mm dans le format fini (0,0 = coin haut-gauche de la coupe).
export const W = 55, H = 85, DENT = 2.5, PROF = 1.5;
export function contour() {
  const n = Math.round(W / DENT), d = W / n, pts = [];
  for (let i = 0; i <= n; i++) pts.push([i * d, i % 2 ? PROF : 0]);          // haut : pointes à y=0, creux à y=PROF
  for (let i = n; i >= 0; i--) pts.push([i * d, i % 2 ? H - PROF : H]);      // bas
  return pts;
}
