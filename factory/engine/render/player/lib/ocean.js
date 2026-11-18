// Décor sous-marin vivant (fonction pure du temps et de la profondeur de caméra, en mètres).
// Surface au coucher du soleil vue d'en dessous, rayons de lumière, caustiques, bancs de poissons,
// algues qui ondulent, bulles, neige marine, méduses, parois de canyon en parallaxe, abîme.
import { drawStick } from './stick.js';
import { glow, cached } from './world.js';

export const W = 1080, H = 1920;
export const PX = 70;            // pixels par mètre (axe vertical)
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
function hash(i) { let a = (i * 374761393) | 0; a = Math.imul(a ^ (a >>> 13), 1274126177); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; }
const mixHex = (a, b, k) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };

// Profondeur (m) -> y écran pour une caméra centrée à camD (m), le centre de l'écran étant y = 960.
export const yOf = (d, camD) => 960 + (d - camD) * PX;

// ------------------------------------------------------------------ couches
function water(ctx, camD) {
  const k = clamp(camD / 80);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mixHex('#2a9ea3', '#062431', k));
  g.addColorStop(0.55, mixHex('#0f5f6e', '#03131c', k));
  g.addColorStop(1, mixHex('#073a48', '#010609', k));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function surface(ctx, t, camD) {
  const ys = yOf(0, camD);
  if (ys < -300) return;
  // ciel de coucher de soleil au-dessus de la surface
  if (ys > 0) {
    const g = ctx.createLinearGradient(0, ys - 700, 0, ys);
    g.addColorStop(0, '#2a1a3a'); g.addColorStop(0.6, '#c2553a'); g.addColorStop(1, '#ffb066');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, ys);
    glow(ctx, 760, ys - 40, 420, '255,170,90', 0.55);
  }
  // fenêtre de Snell : halo orangé sous la surface
  glow(ctx, 760, ys + 60, 650, '255,160,90', 0.28);
  // surface ondulée vue d'en dessous (miroir clair) + reflets
  ctx.fillStyle = 'rgba(255,214,170,0.35)';
  ctx.beginPath(); ctx.moveTo(0, ys - 30);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, ys + Math.sin(x / 70 + t * 2.2) * 9 + Math.sin(x / 23 - t * 3.1) * 4);
  ctx.lineTo(W, ys + 40); ctx.lineTo(0, ys + 40); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,215,0.75)'; ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) { const y = ys + 34 + Math.sin(x / 70 + t * 2.2) * 9 + Math.sin(x / 23 - t * 3.1) * 4; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
}

function caustics(ctx, t, camD) {
  const a = clamp(1 - camD / 18) * 0.12;
  if (a <= 0.005) return;
  ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const y = ((hash(i) * H + t * 25) % H), x = hash(i + 40) * W;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const px = x + k * 26, py = y + Math.sin(t * 2 + i + k) * 14; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
  }
  ctx.restore();
}

function rays(ctx, t, camD) {
  const a = clamp(1 - camD / 55);
  if (a <= 0.01) return;
  const ys = yOf(0, camD);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = 120 + i * 175 + Math.sin(t * 0.35 + i * 1.7) * 60, w = 60 + hash(i) * 90, sk = 220 + hash(i + 3) * 160;
    const top = Math.max(ys, -100);
    const g = ctx.createLinearGradient(0, top, 0, top + 1600);
    g.addColorStop(0, `rgba(255,220,170,${0.13 * a * (0.6 + 0.4 * Math.sin(t * 0.9 + i))})`); g.addColorStop(1, 'rgba(255,220,170,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top); ctx.lineTo(x + w / 2 + sk + w, top + 1600); ctx.lineTo(x - w / 2 + sk - w, top + 1600); ctx.fill();
  }
  ctx.restore();
}

// Parois du canyon (gauche et droite), découpées par du bruit, en 2 profondeurs de parallaxe.
function wallProfile(seed, d) { return 0.5 + 0.5 * Math.sin(d * 0.21 + seed) * 0.6 + 0.3 * Math.sin(d * 0.57 + seed * 3) + 0.15 * Math.sin(d * 1.31 + seed * 7); }
function canyon(ctx, camD, t) {
  const open = clamp((camD - 6) / 20); // le canyon apparaît en descendant
  if (open <= 0) return;
  for (const [par, color, base, amp, seed] of [[0.6, 'rgba(6,30,38,0.85)', 70, 140, 1], [1, 'rgba(2,14,19,0.97)', 30, 170, 4]]) {
    for (const side of [-1, 1]) {
      ctx.fillStyle = color; ctx.beginPath();
      const x0 = side < 0 ? 0 : W; ctx.moveTo(x0, -10);
      for (let y = -10; y <= H + 10; y += 30) {
        const d = camD * par + (y - 960) / PX;
        const w = (base + amp * wallProfile(seed + (side > 0 ? 9 : 0), d)) * open;
        ctx.lineTo(side < 0 ? w : W - w, y);
      }
      ctx.lineTo(x0, H + 10); ctx.closePath(); ctx.fill();
    }
  }
}

// Algues : tiges qui ondulent, accrochées aux parois.
function kelp(ctx, t, camD) {
  const open = clamp((camD - 8) / 14);
  if (open <= 0) return;
  for (let i = 0; i < 14; i++) {
    const d0 = Math.floor(camD) - 10 + i * 1.6 + hash(i) * 0.8, side = i % 2 ? 1 : -1;
    const y = yOf(Math.floor(d0 / 1.6) * 1.6 + 0.4, camD), x = side < 0 ? 40 + hash(i + 7) * 120 : W - 40 - hash(i + 7) * 120;
    const len = (120 + hash(i + 3) * 160) * open;
    ctx.strokeStyle = `rgba(30,${90 + hash(i) * 50},70,0.75)`; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 1; k <= 8; k++) { const f = k / 8; ctx.lineTo(x + Math.sin(t * 1.4 + i + f * 3) * 30 * f - side * 10 * f, y - len * f); }
    ctx.stroke();
  }
}

// Banc de poissons : silhouettes minuscules qui suivent un trajet sinueux, en groupe.
function fishSchool(ctx, t, camD, { seed = 1, d = 8, n = 34, color = '190,230,230', dir = 1, speed = 80 } = {}) {
  const cy = yOf(d, camD);
  if (cy < -300 || cy > H + 300) return;
  const cx = ((seed * 400 + dir * t * speed) % (W + 800) + W + 800) % (W + 800) - 400;
  for (let i = 0; i < n; i++) {
    const ox = (hash(seed * 50 + i) - 0.5) * 300 + Math.sin(t * 2 + i) * 14, oy = (hash(seed * 70 + i) - 0.5) * 160 + Math.sin(t * 1.3 + i * 0.7) * 20;
    const x = cx + ox + Math.sin(t * 0.8 + seed) * 60, y = cy + oy, s = 0.7 + hash(i) * 0.6;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
    ctx.fillStyle = `rgba(${color},0.55)`;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    const wag = Math.sin(t * 14 + i) * 3;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-17, -5 + wag); ctx.lineTo(-17, 5 + wag); ctx.fill();
    ctx.restore();
  }
}

// Méduse violette : cloche qui pulse, tentacules ondulants, halo.
export function jellyfish(ctx, x, y, t, s = 1, seed = 0) {
  const p = 0.5 + 0.5 * Math.sin(t * 2.4 + seed);
  glow(ctx, x, y, 110 * s, '180,110,255', 0.25);
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 + 0.08 * p), s * (1 - 0.1 * p));
  ctx.fillStyle = 'rgba(190,140,255,0.55)';
  ctx.beginPath(); ctx.ellipse(0, 0, 46, 36, 0, Math.PI, 0); ctx.quadraticCurveTo(30, 10, 0, 6); ctx.quadraticCurveTo(-30, 10, -46, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(210,170,255,0.5)'; ctx.lineWidth = 3;
  for (let k = 0; k < 6; k++) {
    const x0 = -30 + k * 12; ctx.beginPath(); ctx.moveTo(x0, 6);
    for (let j = 1; j <= 6; j++) ctx.lineTo(x0 + Math.sin(t * 3 + k + j * 0.8 + seed) * 8, 6 + j * 16);
    ctx.stroke();
  }
  ctx.restore();
}
function jellies(ctx, t, camD) {
  for (let i = 0; i < 5; i++) {
    const d = 26 + i * 9 + hash(i) * 4 - t * 0.25, y = yOf(d, camD);
    if (y < -200 || y > H + 200) continue;
    jellyfish(ctx, 140 + hash(i + 5) * 800 + Math.sin(t * 0.4 + i) * 40, y, t, 1.3 + hash(i + 2) * 0.8, i);
  }
}

// Neige marine + bulles ascendantes (repère écran, défilement lié à la caméra).
function snow(ctx, t, camD) {
  for (let i = 0; i < 70; i++) {
    const y = (((hash(i) * 2400 - camD * PX * 0.9 + t * 14) % 2400) + 2400) % 2400 - 240, x = hash(i + 100) * W + Math.sin(t * 0.5 + i) * 8;
    ctx.fillStyle = `rgba(220,240,240,${0.15 + 0.25 * hash(i + 3)})`; ctx.fillRect(x, y, 3, 3);
  }
}
export function bubbles(ctx, t, x, y, { n = 10, rate = 1, spread = 30, seed = 1, life = 2.5 } = {}) {
  for (let i = 0; i < n; i++) {
    const ph = ((t * rate + hash(seed * 30 + i) * life) % life) / life;
    const by = y - ph * 520, bx = x + Math.sin(t * 3 + i) * 10 + (hash(i + seed) - 0.5) * spread;
    const r = 4 + hash(i + seed * 9) * 9;
    ctx.strokeStyle = `rgba(230,250,255,${0.7 * (1 - ph)})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(bx, by, r * (1 + ph * 0.4), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; ctx.fillRect(bx - r * 0.4, by - r * 0.5, 3, 3);
  }
}

// Décor complet. camD : profondeur de la caméra (m). Renvoie l'éclairage ambiant (1 en surface, ~0 dans l'abîme).
export function ocean(ctx, t, camD) {
  water(ctx, camD);
  rays(ctx, t, camD);
  surface(ctx, t, camD);
  caustics(ctx, t, camD);
  fishSchool(ctx, t, camD, { seed: 1, d: 6, n: 36, dir: 1, speed: 70 });
  fishSchool(ctx, t, camD, { seed: 2, d: 14, n: 28, dir: -1, speed: 55, color: '150,210,215' });
  fishSchool(ctx, t, camD, { seed: 3, d: 30, n: 20, dir: 1, speed: 40, color: '120,170,190' });
  canyon(ctx, camD, t);
  kelp(ctx, t, camD);
  jellies(ctx, t, camD);
  snow(ctx, t, camD);
  // assombrissement progressif (abîme) + vignette froide
  const k = clamp(camD / 90);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, `rgba(0,6,10,${0.15 * k})`); v.addColorStop(1, `rgba(0,6,10,${0.35 + 0.45 * k})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  return 1 - k;
}

// Plongeur (héros au bandeau) : corps orienté par `angle` (π = tête en bas), battements de jambes.
export function diver(ctx, x, y, t, { angle = Math.PI, kick = 1, scale = 0.9, band = '#e3342c', mouth = null, arms = 'streamline', face = 1, alpha = 1 } = {}) {
  const f = Math.sin(t * 9) * 22 * kick;
  const pose = {
    lean: 0, head: arms === 'streamline' ? -10 : 0,
    armB: arms === 'streamline' ? [178, 0] : arms === 'reach' ? [150, 10] : [40, 60],
    armF: arms === 'streamline' ? [-176, 0] : arms === 'reach' ? [120, 20] : [30, 70],
    legB: [f, -10 - Math.abs(f) * 0.6], legF: [-f, -10 - Math.abs(f) * 0.6],
  };
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle - Math.PI);
  // le rig est dessiné tête en haut ; on le retourne pour plonger tête la première
  ctx.rotate(Math.PI);
  drawStick(ctx, 0, 0, pose, { scale, eyes: true, t, band, mouth, face, alpha, hands: true, feet: true });
  ctx.restore();
  return pose;
}
export { cached };
