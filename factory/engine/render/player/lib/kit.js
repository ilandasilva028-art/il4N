// Boîte à outils du style « mentality » (fond noir, gris, accent unique) pour les films quotidiens.
// Un film importe ce kit + lib/stick.js et exporte : W, H, DURATION, MUSIC, draw(ctx, t), post, samples, HITS.
// Voir films/discipline.js (film de référence validé) et docs/ROUTINE-VIDEO-QUOTIDIENNE.md.
import { drawStick, POSES, label, COLORS } from './stick.js';

export const W = 1080, H = 1920;
export const SAFE = { top: 250, bottom: 1490, right: 930, left: 72 }; // zone sûre TikTok

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = {
  out: (x) => 1 - (1 - x) ** 3,
  in: (x) => x * x * x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  back: (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2,
};
export function hash(i) { let a = (i * 374761393) | 0; a = Math.imul(a ^ (a >>> 13), 1274126177); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; }
export const noise = (x, s = 1) => { const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f); return (hash(i + s * 997) * (1 - k) + hash(i + 1 + s * 997) * k) * 2 - 1; };
export const pop = (t, t0, d = 0.25) => ease.back(prog(t, t0, t0 + d));

// Grille rythmique : beats(bpm) -> durée d'un temps ; scenes([['nom', nbTemps], ...]) -> débuts en secondes.
export function timeline(bpm, list) {
  const B = 60 / bpm; let t = 0; const S = {};
  for (const [name, beats] of list) { S[name] = t; t += beats * B; }
  S.end = t;
  return { B, S };
}

// ------------------------------------------------------------------ décors
export function bg(ctx, c = '#050505') { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
export function floor(ctx, y = 1250, c = '#18181a') { ctx.fillStyle = c; ctx.fillRect(0, y, W, H - y); ctx.fillStyle = '#2c2c2f'; ctx.fillRect(0, y, W, 8); }
export function bricks(ctx, x0, y0, w, h) {
  ctx.fillStyle = '#1d1d1f'; ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = '#121213'; ctx.lineWidth = 5;
  const bh = 62, bw = 150;
  for (let r = Math.floor(y0 / bh) - 1; r * bh < y0 + h; r++) {
    const y = r * bh;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
    for (let x = x0 - bw + (r & 1) * (bw / 2); x < x0 + w; x += bw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke(); }
  }
}
export function ledge(ctx, x, y, w) { ctx.fillStyle = '#5c5c5e'; ctx.fillRect(x, y, w, 22); ctx.fillStyle = '#3a3a3c'; ctx.fillRect(x, y + 22, w, 10); }
export function ladder(ctx, x, y1, y2) {
  ctx.strokeStyle = '#9a9a9c'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 70, y1); ctx.lineTo(x - 70, y2); ctx.moveTo(x + 70, y1); ctx.lineTo(x + 70, y2); ctx.stroke();
  ctx.lineWidth = 9;
  for (let y = Math.ceil(y2 / 95) * 95; y < y1; y += 95) { ctx.beginPath(); ctx.moveTo(x - 70, y); ctx.lineTo(x + 70, y); ctx.stroke(); }
}
export function city(ctx, ox, base) {
  for (let i = -2; i < 14; i++) {
    const k = i + Math.floor(ox / 170), x = i * 170 - (ox % 170);
    const h = 260 + hash(k) * 520, w = 140 + hash(k + 50) * 40;
    ctx.fillStyle = '#141416'; ctx.fillRect(x, base - h, w, h);
    ctx.fillStyle = '#2a2a2d';
    for (let wy = base - h + 30; wy < base - 40; wy += 70) for (let wx = x + 20; wx < x + w - 30; wx += 46) if (hash(k * 31 + wy + wx) > 0.72) ctx.fillRect(wx, wy, 20, 30);
  }
}
export function road(ctx, y, scroll) {
  ctx.fillStyle = '#232325'; ctx.fillRect(0, y, W, 260);
  ctx.fillStyle = '#3c3c3f'; ctx.fillRect(0, y, W, 10);
  ctx.fillStyle = '#6f6f72';
  for (let x = -(((scroll % 200) + 200) % 200); x < W; x += 200) ctx.fillRect(x, y + 128, 110, 14);
}
export function flag(ctx, x, y, t, glow = 0, color = COLORS.red) {
  ctx.fillStyle = '#b5b5b7'; ctx.fillRect(x - 5, y - 330, 10, 330);
  ctx.save(); if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 40 * glow; }
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x + 5, y - 325);
  for (let i = 0; i <= 10; i++) ctx.lineTo(x + 5 + i * 14, y - 325 + Math.sin(t * 7 - i * 0.6) * 6 * (i / 10));
  for (let i = 10; i >= 0; i--) ctx.lineTo(x + 5 + i * 14, y - 245 + Math.sin(t * 7 - i * 0.6) * 6 * (i / 10));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
export function spotlight(ctx, x, top, bottom, width = 680, a = 0.18) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 70, top); ctx.lineTo(x + 70, top); ctx.lineTo(x + width / 2, bottom); ctx.lineTo(x - width / 2, bottom); ctx.fill();
}
export function box(ctx, x, y, w, h, c = '#3d3d40', text = null) {
  ctx.fillStyle = c; ctx.fillRect(x, y, w, h);
  if (text) label(ctx, text, x + w / 2, y + h / 2 + 10, { size: 26, color: '#d0d0d2', track: 3 });
}
// Accessoires vectoriels simples (même trait épais que les personnages).
export function phone(ctx, x, y, s = 1, glow = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (glow) { ctx.shadowColor = '#9fc3ff'; ctx.shadowBlur = 50 * glow; }
  ctx.fillStyle = '#2b2b2e'; ctx.beginPath(); ctx.roundRect(-60, -110, 120, 220, 18); ctx.fill();
  ctx.fillStyle = glow ? '#cfe0ff' : '#58585c'; ctx.beginPath(); ctx.roundRect(-48, -92, 96, 180, 8); ctx.fill();
  ctx.restore();
}
export function bed(ctx, x, y) { ctx.fillStyle = '#2b2b2e'; ctx.fillRect(x, y, 520, 70); ctx.fillRect(x, y - 90, 36, 160); ctx.fillStyle = '#5c5c5f'; ctx.fillRect(x + 40, y - 26, 110, 30); }
export function door(ctx, x, y, open = 0, text = null, light = false) {
  ctx.fillStyle = light ? '#e8e8ea' : '#0d0d0e'; ctx.fillRect(x, y - 420, 230, 420);
  ctx.fillStyle = '#4a4a4d'; ctx.save(); ctx.translate(x, y - 420); ctx.scale(1 - open * 0.85, 1); ctx.fillRect(0, 0, 230, 420); ctx.restore();
  ctx.strokeStyle = '#6f6f72'; ctx.lineWidth = 10; ctx.strokeRect(x - 5, y - 425, 240, 425);
  if (text) label(ctx, text, x + 115, y - 450, { size: 30 });
}
export function hourglass(ctx, x, y, k, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#bdbdbf'; ctx.lineWidth = 12; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-110, -180); ctx.lineTo(110, -180); ctx.lineTo(10, 0); ctx.lineTo(110, 180); ctx.lineTo(-110, 180); ctx.lineTo(-10, 0); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = COLORS.red;
  const top = 1 - k;
  ctx.beginPath(); ctx.moveTo(-90 * top, -170 + 160 * (1 - top)); ctx.lineTo(90 * top, -170 + 160 * (1 - top)); ctx.lineTo(0, -10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-95 * k, 170); ctx.lineTo(95 * k, 170); ctx.lineTo(0, 170 - 120 * k); ctx.closePath(); ctx.fill();
  if (k < 1) ctx.fillRect(-4, -10, 8, 180 - 120 * k);
  ctx.restore();
}
// Foule grise (spectateurs, moqueurs…) : n silhouettes serrées, option « HA HA ».
export function crowd(ctx, x, y, n, t, { laugh = false, color = '#5a5a5d', scale = 0.62, face = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const bob = laugh ? Math.abs(Math.sin(t * 9 + i)) * 10 : 0;
    drawStick(ctx, x + i * 58 * face, y - bob, { ...POSES.stand, lean: laugh ? -8 + Math.sin(t * 9 + i) * 6 : 0 }, { color, scale: scale * (0.9 + hash(i) * 0.2), face });
  }
  if (laugh) label(ctx, 'HA HA', x + (n * 58 * face) / 2, y - 260 - Math.abs(Math.sin(t * 6)) * 12, { size: 28, color: '#9a9a9c' });
}

// ------------------------------------------------------------------ texte
// Journal des textes visibles à chaque image (lu par le rendu pour contrôler la lisibilité).
export const TEXTLOG = { frame: [] };
if (typeof window !== 'undefined') window.__frameTexts = () => TEXTLOG.frame;
export function caption(ctx, parts, y, size = 64, alpha = 1, k = 1) {
  if (alpha >= 0.5) TEXTLOG.frame.push(parts.map(([s]) => s).join('').trim());
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  ctx.font = `900 ${size}px Display`; ctx.letterSpacing = '3px'; ctx.textBaseline = 'alphabetic';
  const total = parts.reduce((a, [s]) => a + ctx.measureText(s).width, 0);
  let x = W / 2 - total / 2;
  ctx.translate(W / 2, y); ctx.scale(k, k); ctx.translate(-W / 2, -y);
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 18;
  for (const [s, c] of parts) { ctx.fillStyle = c; ctx.fillText(s, x, y); x += ctx.measureText(s).width; }
  ctx.restore();
}
export function topBand(ctx) {
  const band = ctx.createLinearGradient(0, 250, 0, 640);
  band.addColorStop(0, 'rgba(0,0,0,0.85)'); band.addColorStop(0.7, 'rgba(0,0,0,0.6)'); band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band; ctx.fillRect(0, 250, W, 390);
}
// Carte « définition » (police à empattements, machine à écrire).
export function definition(ctx, tl, lines, cps = 60) {
  bg(ctx, '#030303');
  const z = 1 + tl * 0.07;
  ctx.save(); ctx.translate(W / 2 + Math.sin(tl * 1.3) * 6, 820); ctx.scale(z, z); ctx.translate(-W / 2, -820);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const sizes = [196, 60, 78, 78, 78, 78], ys = [650, 750, 890, 990, 1090, 1190], cols = ['#f4f4f4', '#9d9d9f', '#e6e6e6', '#e6e6e6', '#e6e6e6', '#e6e6e6'];
  let used = 0; const chars = Math.floor(tl * cps) + lines[0].length + (lines[1]?.length || 0);
  lines.forEach((s, i) => {
    const n = clamp(chars - used, 0, s.length); used += s.length;
    ctx.font = `${sizes[i]}px Serif`; ctx.fillStyle = cols[i]; ctx.fillText(s.slice(0, n), 80, ys[i]);
  });
  ctx.restore();
}
// Mot géant flou qui se précise (« TOI. », « HIER. »…).
export function bigWord(ctx, tl, word, sub = null) {
  bg(ctx, '#020202');
  const k = ease.out(prog(tl, 0, 0.5));
  const blur = 22 * (1 - k) + 3 * Math.max(0, Math.sin(tl * 9)) * (1 - prog(tl, 0.8, 1.6));
  const sh = 14 * Math.exp(-tl * 6);
  ctx.save();
  ctx.translate(W / 2 + noise(tl * 40) * sh, 900 + noise(tl * 40, 3) * sh);
  const sc = 1.25 - 0.25 * k + tl * 0.03; ctx.scale(sc, sc);
  ctx.font = `${word.length > 5 ? 230 : 330}px Serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.filter = `blur(${blur.toFixed(1)}px)`; ctx.shadowColor = 'rgba(255,255,255,0.65)'; ctx.shadowBlur = 60;
  ctx.fillStyle = '#f7f7f7'; ctx.fillText(word, 0, 0);
  ctx.restore(); ctx.filter = 'none';
  if (sub) caption(ctx, sub, 1180, 58, prog(tl, 0.8, 1.0));
}

// ------------------------------------------------------------------ assemblage, post, sons
// scenes : [[début, fn(ctx, tempsLocal)], ...] ; ajoute pulsation sur le temps, secousse + flash aux coupes.
export function compose(ctx, t, scenes, { B, pulseFrom = 0, noPulse = [] } = {}) {
  TEXTLOG.frame = [];
  let k = 0;
  for (let i = 0; i < scenes.length; i++) if (t >= scenes[i][0]) k = i;
  const [t0, fn] = scenes[k];
  const beatPh = (t % B) / B;
  const pulse = t >= pulseFrom && !noPulse.some(([a, b]) => t >= a && t < b) ? 0.012 * Math.exp(-beatPh * 6) : 0;
  const since = t - t0, sh = k > 0 ? 16 * Math.exp(-since * 9) : 0;
  ctx.save();
  ctx.translate(W / 2 + noise(t * 50, 5) * sh, H / 2 + noise(t * 50, 9) * sh);
  ctx.scale(1 + pulse, 1 + pulse); ctx.translate(-W / 2, -H / 2);
  fn(ctx, since);
  ctx.restore();
  if (k > 0 && since < 0.08) { ctx.fillStyle = `rgba(255,255,255,${(0.35 * (1 - since / 0.08)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}
let grainCv = null;
export function grainVignette(ctx, t) {
  if (!grainCv) {
    grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = 256;
    const g = grainCv.getContext('2d'); const im = g.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.floor(hash(i) * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
  }
  const f = Math.floor(t * 30);
  ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainCv, 'repeat');
  ctx.translate(-hash(f) * 256, -hash(f + 7) * 256); ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// Paramètres d'URL du lecteur : ?v=b → variante d'accroche B.
export const VARIANT = typeof location !== 'undefined' ? (new URLSearchParams(location.search).get('v') || 'a') : 'a';

// Caméra : zoom + décalage + légère rotation autour d'un point.
export function camera(ctx, { zoom = 1, x = W / 2, y = H / 2, dx = 0, dy = 0, rot = 0 } = {}) {
  ctx.translate(x + dx, y + dy); ctx.rotate(rot); ctx.scale(zoom, zoom); ctx.translate(-x, -y);
}

// Étiquette de série (en haut à gauche, zone sûre) : « LES RÈGLES · #1 ».
export function seriesTag(ctx, text, alpha = 1) {
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  ctx.font = '800 26px Display'; ctx.letterSpacing = '4px';
  const w = ctx.measureText(text).width + 40;
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(72, 262, w, 46, 23); ctx.fill();
  ctx.fillStyle = '#d0d0d2'; ctx.textBaseline = 'middle'; ctx.fillText(text, 92, 286);
  ctx.restore();
}

// Carte de fin : abonnement + teaser de la suite. handle = '@…' confirmé, sinon texte générique.
export function endCard(ctx, tl, { teaser = 'LA RÈGLE DE DEMAIN', handle = null, series = null, t = 0 } = {}) {
  bg(ctx, '#050505');
  const k = pop(tl, 0, 0.3);
  ctx.save(); ctx.globalAlpha = clamp(k);
  const r = 150 + 8 * Math.sin(tl * 6);
  ctx.fillStyle = COLORS.red; ctx.beginPath(); ctx.arc(W / 2, 760, r, 0, Math.PI * 2); ctx.fill();
  drawStick(ctx, W / 2, 790, { lean: 0, head: -6, armB: [140 + 10 * Math.sin(tl * 8), 0], armF: [-140 - 10 * Math.sin(tl * 8), 0], legB: [20, 0], legF: [-20, 0] }, { scale: 0.8, eyes: true, t });
  ctx.restore();
  caption(ctx, [['ABONNE-TOI', '#f1f1f1']], 1040, 78, pop(tl, 0.2), 0.8 + 0.2 * pop(tl, 0.2));
  caption(ctx, [['POUR ', '#9a9a9c'], [teaser, '#f1f1f1']], 1120, 44, pop(tl, 0.45), 1);
  if (handle) caption(ctx, [[handle, COLORS.red]], 1200, 50, pop(tl, 0.7), 1);
  if (series) seriesTag(ctx, series, pop(tl, 0.1));
  // flèche qui pulse vers le bouton « suivre » (côté droit de l'interface TikTok)
  ctx.save(); ctx.globalAlpha = clamp(pop(tl, 0.9)); ctx.strokeStyle = COLORS.red; ctx.lineWidth = 14; ctx.lineCap = 'round';
  const ax = 860 + 14 * Math.sin(tl * 9);
  ctx.beginPath(); ctx.moveTo(ax - 90, 1300); ctx.lineTo(ax, 1300); ctx.moveTo(ax - 30, 1260); ctx.lineTo(ax, 1300); ctx.lineTo(ax - 30, 1340); ctx.stroke();
  ctx.restore();
}

export { drawStick, POSES, label, COLORS };
