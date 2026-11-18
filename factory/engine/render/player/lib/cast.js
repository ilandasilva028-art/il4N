// Distribution de personnages « traits de caractère » (création originale) : chacun a une couleur,
// un accessoire et une attitude reconnaissables. DISCIPLINE = le héros de la série (bandeau rouge).
import { drawStick, label, COLORS } from './stick.js';
import { brows, glow, headPos } from './world.js';

export const CAST = {
  discipline: { name: 'DISCIPLINE', color: '#f1f1f1', band: COLORS.red, labelColor: '#f1f1f1' },
  ego: { name: 'L’EGO', color: '#e9d9a6', band: null, labelColor: '#e9c75a', labelDy: 30 },
  obsession: { name: 'L’OBSESSION', color: '#b9a3e3', band: null, labelColor: '#b28cff', labelDy: 36 },
  chance: { name: 'LA CHANCE', color: '#b7e4c2', band: null, labelColor: '#7fdc9a' },
};

// Dessine un membre de la distribution avec ses accessoires. Renvoie la position de la tête.
export function drawMember(ctx, who, x, y, pose, { scale = 0.75, face = 1, t = 0, mouth = null, mood = null, ground = null, alpha = 1, showLabel = true, eyesClosed = false, spiral = false } = {}) {
  const c = CAST[who];
  drawStick(ctx, x, y, pose, { color: c.color, band: c.band, scale, face, t, mouth, ground, alpha, eyes: !eyesClosed && !spiral, hands: true, feet: true });
  const h = headPos(x, y, pose, scale, face);
  const R = 52 * scale;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (eyesClosed) { ctx.strokeStyle = '#111'; ctx.lineWidth = 4 * scale; for (const dx of [6, 24]) { ctx.beginPath(); ctx.arc(h.x + dx * face * scale, h.y - 6 * scale, 6 * scale, 0.2, Math.PI - 0.2); ctx.stroke(); } }
  if (spiral) { ctx.strokeStyle = '#111'; ctx.lineWidth = 3 * scale; for (const dx of [6, 24]) { ctx.beginPath(); for (let a = 0; a < 12; a += 0.4) { const r = a * 0.7 * scale; ctx.lineTo(h.x + dx * face * scale + Math.cos(a + t * 6) * r, h.y - 6 * scale + Math.sin(a + t * 6) * r); } ctx.stroke(); } }
  if (who === 'ego') {
    // couronne dorée + lunettes de soleil
    ctx.fillStyle = '#e2b53e'; const cx = h.x, cy = h.y - R * 0.95;
    ctx.beginPath(); ctx.moveTo(cx - R * 0.7, cy + R * 0.25); ctx.lineTo(cx - R * 0.7, cy - R * 0.25); ctx.lineTo(cx - R * 0.35, cy); ctx.lineTo(cx, cy - R * 0.45); ctx.lineTo(cx + R * 0.35, cy); ctx.lineTo(cx + R * 0.7, cy - R * 0.25); ctx.lineTo(cx + R * 0.7, cy + R * 0.25); ctx.fill();
    glow(ctx, cx, cy, R * 1.4, '226,181,62', 0.25);
    if (!eyesClosed) { ctx.fillStyle = '#121212'; ctx.beginPath(); ctx.roundRect(h.x + (face > 0 ? -2 : -40) * scale, h.y - 16 * scale, 42 * scale, 15 * scale, 6 * scale); ctx.fill(); }
  }
  if (who === 'obsession') {
    // cernes sombres + mèche ébouriffée
    ctx.fillStyle = 'rgba(70,30,110,0.55)'; for (const dx of [6, 24]) { ctx.beginPath(); ctx.ellipse(h.x + dx * face * scale, h.y + 6 * scale, 8 * scale, 5 * scale, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = c.color; ctx.lineWidth = 7 * scale; ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(h.x - R * 0.5 + k * R * 0.33, h.y - R * 0.85); ctx.lineTo(h.x - R * 0.6 + k * R * 0.33 + Math.sin(t * 8 + k) * 6, h.y - R * 1.35); ctx.stroke(); }
  }
  if (who === 'chance') {
    // trèfle à quatre feuilles sur la tête
    const cx = h.x, cy = h.y - R * 1.15;
    ctx.strokeStyle = '#3c8d55'; ctx.lineWidth = 4 * scale; ctx.beginPath(); ctx.moveTo(cx, h.y - R * 0.85); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.fillStyle = '#4fbf6c';
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.sin(t * 2) * 0.15; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 9 * scale, cy + Math.sin(a) * 9 * scale, 9 * scale, 7 * scale, a, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  if (mood) brows(ctx, x, y, pose, { scale, face, mood });
  if (showLabel) label(ctx, c.name, h.x, h.y - R - (who === 'chance' || who === 'ego' ? 40 : 22) * scale - 18 - (c.labelDy || 0), { size: Math.round(30 * scale / 0.75), color: c.labelColor, alpha, track: 4 }); // labelDy : décale les noms voisins
  return h;
}
