// Décors, lumière, atmosphère, foules et transitions (niveau « production »).
// Tout reste une fonction pure du temps. Les couches statiques sont dessinées une seule fois dans des
// canvas en cache (et pré-floutées pour la profondeur de champ) : le rendu reste rapide.
import { drawStick, POSES, COLORS, label } from './stick.js';
import { gait } from './anim.js';

export const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
function hash(i) { let a = (i * 374761393) | 0; a = Math.imul(a ^ (a >>> 13), 1274126177); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; }

// ------------------------------------------------------------------ cache + profondeur de champ
const CACHE = new Map();
export function cached(key, w, h, paint) {
  if (CACHE.has(key)) return CACHE.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  CACHE.set(key, c);
  return c;
}
export function blurred(key, src, px) {
  return cached(`${key}|blur${px}`, src.width, src.height, (g) => { g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); });
}

// Ligne d'horizon de ville (couche répétable), fenêtres allumées aléatoires.
export function skyline(seed, { w = 2160, h = 900, base = '#141418', win = '#3a3a40', lit = 0.25, minH = 200, maxH = 760, bw = [110, 220] } = {}) {
  return cached(`sky${seed}${base}${win}${lit}${h}`, w, h, (g) => {
    let x = 0, i = 0;
    while (x < w) {
      const bwid = bw[0] + hash(seed * 97 + i) * (bw[1] - bw[0]), bh = minH + hash(seed * 31 + i) * (maxH - minH);
      g.fillStyle = base; g.fillRect(x, h - bh, bwid, bh);
      if (hash(seed + i * 7) > 0.6) g.fillRect(x + bwid * 0.4, h - bh - 60, 8, 60); // antenne
      for (let wy = h - bh + 26; wy < h - 30; wy += 46) for (let wx = x + 16; wx < x + bwid - 24; wx += 34)
        if (hash(seed * 13 + i * 101 + wx * 3 + wy) < lit) { g.fillStyle = win; g.fillRect(wx, wy, 14, 22); }
      x += bwid + 6 + hash(seed + i) * 20; i++;
    }
  });
}
// Couches en parallaxe : [{ canvas, depth, y, alpha }] ; camX = position caméra dans le monde.
export function parallax(ctx, layers, camX, camY = 0) {
  for (const L of layers) {
    const off = -((camX * L.depth) % L.canvas.width + L.canvas.width) % L.canvas.width;
    ctx.save(); ctx.globalAlpha = L.alpha ?? 1;
    for (let x = off; x < W; x += L.canvas.width) ctx.drawImage(L.canvas, x, (L.y ?? 0) - camY * L.depth);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ lumière et atmosphère
export function skyGrad(ctx, top = '#07080d', bottom = '#151622', y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
}
export function glow(ctx, x, y, r, color = '255,255,255', a = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// Cône de lumière (projecteur, réverbère, fenêtre) avec halo au sol.
export function lightCone(ctx, x, yTop, yBottom, wBottom, { color = '255,255,255', a = 0.16, wTop = 40, skew = 0 } = {}) {
  const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
  g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},${a * 0.25})`);
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(x - wTop / 2, yTop); ctx.lineTo(x + wTop / 2, yTop); ctx.lineTo(x + skew + wBottom / 2, yBottom); ctx.lineTo(x + skew - wBottom / 2, yBottom); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(x + skew, yBottom); ctx.scale(1, 0.18); glow(ctx, 0, 0, wBottom * 0.6, color, a * 1.6); ctx.restore();
}
export function fog(ctx, y, h, a = 0.25, color = '30,30,38') {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(0.5, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, y, W, h);
}
// Pluie : traits inclinés en 2 profondeurs + éclaboussures au sol.
export function rain(ctx, t, { n = 140, angle = 0.18, speed = 2200, ground = 1300, a = 0.35 } = {}) {
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const near = i % 3 === 0, sp = speed * (near ? 1.3 : 0.8), len = near ? 70 : 38;
    const y = ((hash(i) * 2400 + t * sp) % 2400) - 300, x = (hash(i + 500) * (W + 400) - 200 + y * angle) % (W + 200);
    ctx.strokeStyle = `rgba(190,200,220,${near ? a : a * 0.5})`; ctx.lineWidth = near ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * angle, y - len); ctx.stroke();
    if (y > ground - 10 && y < ground + 30 && near) { ctx.fillStyle = `rgba(190,200,220,${a * 0.6})`; ctx.fillRect(x - 8, ground - 2, 16, 3); }
  }
  ctx.restore();
}
// Reflet au sol mouillé : rejoue un dessin à l'envers, écrasé et transparent.
export function reflect(ctx, ground, drawFn, a = 0.18) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, ground * 2); ctx.scale(1, -1);
  ctx.beginPath(); ctx.rect(0, ground, W, H - ground); ctx.clip();
  drawFn(ctx); ctx.restore();
}

// Poussière en suspension dans un faisceau (polygone approximé par un rectangle incliné).
export function motes(ctx, t, { x = 540, y = 600, w = 400, h = 700, n = 40, skew = 0, a = 0.5, seed = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const u = hash(seed * 50 + i), v = (hash(seed * 70 + i) + t * (0.02 + 0.04 * hash(i + 3))) % 1;
    const px = x - w / 2 + u * w + skew * v + Math.sin(t * 0.8 + i) * 12, py = y + v * h;
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
    ctx.fillStyle = `rgba(255,255,255,${(a * tw * (0.3 + 0.7 * hash(i + 9))).toFixed(3)})`;
    ctx.fillRect(px, py, 3, 3);
  }
}
// Enseigne néon qui grésille (accent rouge).
export function neon(ctx, text, x, y, t, { size = 46, color = '227,52,44', seed = 1 } = {}) {
  const flick = hash(Math.floor(t * 12) + seed * 100) > 0.93 ? 0.25 : 1;
  ctx.save(); ctx.font = `900 ${size}px Display`; ctx.textAlign = 'center'; ctx.letterSpacing = '4px';
  ctx.shadowColor = `rgba(${color},${0.9 * flick})`; ctx.shadowBlur = 30;
  ctx.fillStyle = `rgba(${color},${flick})`; ctx.fillText(text, x, y);
  ctx.shadowBlur = 0; ctx.fillStyle = `rgba(255,230,230,${0.6 * flick})`; ctx.fillText(text, x, y);
  ctx.restore();
  glow(ctx, x, y - size / 3, size * 4, color, 0.12 * flick);
}
// Bulle de dialogue (logguée pour le contrôle de lisibilité via le callback log).
export function bubble(ctx, text, x, y, tl, t0, { tail = 'down', dx = 0, size = 38, dark = false, log = null } = {}) {
  const k = Math.min(1, Math.max(0, (tl - t0) / 0.22));
  if (k <= 0) return;
  const e = 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;
  // Projection du point d'ancrage à l'écran : la bulle garde une taille fixe (lisible même en plan serré)
  // et reste dans la zone sûre ; seule la pointe vise le personnage.
  const p = ctx.getTransform().transformPoint(new DOMPoint(x + dx, y));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `900 ${size}px Display`; ctx.letterSpacing = '1px';
  const w = ctx.measureText(text).width + 56, h = size + 40;
  const bx = Math.min(Math.max(p.x, 72 + w / 2), 930 - w / 2), by = Math.min(Math.max(p.y, 300 + h), 1480);
  const tx = Math.max(-w / 2 + 30, Math.min(w / 2 - 30, p.x - bx));
  ctx.translate(bx, by); ctx.scale(e, e);
  ctx.fillStyle = dark ? '#1c1c21' : '#f4f4f4'; ctx.strokeStyle = dark ? '#f4f4f4' : '#111'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 22);
  ctx.moveTo(tx - 14, 0); ctx.lineTo(tx + (tail === 'down' ? -12 : 12), 30); ctx.lineTo(tx + 14, 0);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = dark ? '#f4f4f4' : '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, -h / 2 + 2);
  ctx.restore();
  if (log && k >= 0.6) log(text);
}
// Effet « rembobinage » (VHS) : lignes, décalages horizontaux, icône ◀◀ et horodatage.
export function rewind(ctx, t, k = 1) {
  ctx.save();
  for (let y = 0; y < H; y += 6) { ctx.fillStyle = `rgba(0,0,0,${0.22 * k})`; ctx.fillRect(0, y, W, 2); }
  for (let i = 0; i < 6; i++) {
    const y = (hash(Math.floor(t * 30) + i * 7) * H) | 0, h = 20 + hash(i + Math.floor(t * 30)) * 60;
    const img = ctx.getImageData(0, y, W, Math.min(h, H - y));
    ctx.putImageData(img, (hash(i * 3 + Math.floor(t * 30)) - 0.5) * 80 * k, y);
  }
  ctx.globalAlpha = k; ctx.fillStyle = '#f1f1f1';
  ctx.beginPath(); for (const ox of [0, 46]) { ctx.moveTo(130 + ox, 300); ctx.lineTo(90 + ox, 325); ctx.lineTo(130 + ox, 350); } ctx.fill();
  ctx.font = '700 36px Display'; ctx.fillText('REW', 200, 338);
  ctx.restore();
}

// ------------------------------------------------------------------ vie en arrière-plan
// Silhouettes lointaines qui marchent (passants), cycliques, en parallaxe ; teinte sombre = profondeur.
export function passersby(ctx, t, camX, { n = 9, depth = 0.6, ground = 1296, scale = 0.52, color = '#3a3b46', seed = 7, span = 2600 } = {}) {
  for (let i = 0; i < n; i++) {
    const dir = hash(seed + i) > 0.5 ? 1 : -1, sp = 70 + hash(seed + i + 9) * 60, sc = scale * (0.85 + hash(i + seed * 3) * 0.3);
    const raw = hash(seed * 7 + i) * span + dir * sp * t - camX * depth;
    const x = ((raw % span) + span) % span - 300;
    if (x < -150 || x > W + 150) continue;
    const g = gait(t + i * 0.37, { x0: 0, speed: sp, ground, scale: sc, face: dir });
    drawStick(ctx, x, g.y, g.pose, { color, scale: sc, face: dir, hands: false, feet: false });
  }
}
// Petites lumières de circulation au loin (paires de phares / feux arrière).
export function farTraffic(ctx, t, { y = 1190, n = 7, seed = 2 } = {}) {
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1, sp = 160 + hash(seed + i) * 140;
    const x = (((hash(seed * 5 + i) * 1800 + dir * sp * t) % 1800) + 1800) % 1800 - 360;
    const c = dir > 0 ? '255,240,210' : '227,52,44';
    glow(ctx, x, y + (i % 2) * 14, 40, c, 0.7); glow(ctx, x + 26 * dir, y + (i % 2) * 14, 40, c, 0.7);
  }
}
// Train aérien qui traverse au loin toutes les `period` secondes.
export function farTrain(ctx, t, camX, { y = 1010, period = 6, offset = 2 } = {}) {
  ctx.fillStyle = '#101117'; ctx.fillRect(0, y + 46, W, 10);
  for (let x = -((camX * 0.25) % 180); x < W; x += 180) ctx.fillRect(x, y + 56, 10, 120);
  const ph = ((t + offset) % period) / period;
  if (ph > 0.45) return;
  const head = -900 + (ph / 0.45) * (W + 1800);
  for (let c = 0; c < 5; c++) {
    const x = head - c * 190;
    ctx.fillStyle = '#16171e'; ctx.fillRect(x, y, 180, 44);
    for (let w = 0; w < 6; w++) { ctx.fillStyle = 'rgba(255,236,190,0.8)'; ctx.fillRect(x + 12 + w * 28, y + 10, 16, 14); }
    glow(ctx, x + 90, y + 20, 120, '255,236,190', 0.12);
  }
  glow(ctx, head + 180, y + 22, 90, '255,245,220', 0.4);
}
// Fenêtres qui s'allument et s'éteignent sur la couche de ville moyenne.
export function blinkingWindows(ctx, t, camX, { n = 18, depth = 0.4, seed = 4, y0 = 450, y1 = 1150 } = {}) {
  for (let i = 0; i < n; i++) {
    const on = hash(seed * 11 + i * 7 + Math.floor((t + hash(i) * 5) / (2.5 + hash(i + 2) * 3))) > 0.45;
    if (!on) continue;
    const x = (((hash(seed + i * 3) * 2160 - camX * depth) % 2160) + 2160) % 2160 - 40;
    const y = y0 + hash(seed + i * 5) * (y1 - y0);
    ctx.fillStyle = 'rgba(255,220,160,0.55)'; ctx.fillRect(x, y, 14, 22);
    glow(ctx, x + 7, y + 11, 30, '255,220,160', 0.12);
  }
}
// Passant au premier plan : grande silhouette floue qui traverse devant la caméra (profondeur de cinéma).
// À dessiner APRÈS les personnages. Passe toutes les `period` secondes, dure ~1,1 s.
export function foregroundPasser(ctx, t, { period = 6.5, offset = 1.2, dir = 1, seed = 1 } = {}) {
  const ph = ((t + offset) % period);
  if (ph > 1.1) return;
  const k = ph / 1.1, x = dir > 0 ? -400 + k * (W + 800) : W + 400 - k * (W + 800);
  const g = gait(ph, { x0: 0, speed: 900, ground: 2150, scale: 2.6, face: dir });
  ctx.save(); ctx.filter = 'blur(10px)'; ctx.globalAlpha = 0.92;
  drawStick(ctx, x, g.y, g.pose, { color: '#070709', scale: 2.6, face: dir, hands: false, feet: false });
  ctx.restore();
  void seed;
}
// Avion : feu clignotant qui traverse lentement le ciel.
export function airplane(ctx, t, { y = 330, speed = 40 } = {}) {
  const x = ((t * speed) % (W + 200)) - 100;
  if (Math.floor(t * 1.5) % 2 === 0) glow(ctx, x, y + Math.sin(t * 0.2) * 10, 20, '227,52,44', 0.9);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x - 2, y - 1 + Math.sin(t * 0.2) * 10, 4, 2);
}
// Éclair : bref flash bleuté (toutes les ~`period` s), à dessiner après le décor.
export function lightning(ctx, t, { period = 7.3, offset = 3 } = {}) {
  const ph = (t + offset) % period;
  const f = ph < 0.08 ? 1 : ph > 0.16 && ph < 0.22 ? 0.6 : 0;
  if (f) { ctx.fillStyle = `rgba(190,205,255,${0.16 * f})`; ctx.fillRect(0, 0, W, 1300); }
  return f > 0;
}

// ------------------------------------------------------------------ décors complets
export function bedroom(ctx, t, { night = true, alarm = null } = {}) {
  const wall = cached('bedroomWall', W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 1300); gr.addColorStop(0, '#0c0d12'); gr.addColorStop(1, '#16171e'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 60) { g.fillStyle = 'rgba(255,255,255,0.015)'; g.fillRect(x, 0, 30, 1300); }
    g.fillStyle = '#121216'; g.fillRect(0, 1300, W, 620);
    for (let y = 1300; y < H; y += 46) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(0, y, W, 3); }
    // fenêtre + ville
    g.fillStyle = '#0a0f1e'; g.fillRect(620, 520, 330, 470);
    g.drawImage(skyline(4, { w: 330, h: 300, base: '#10131c', win: '#4a4f66', lit: 0.3, minH: 80, maxH: 280, bw: [40, 80] }), 620, 690);
    g.fillStyle = '#d9d9db'; g.beginPath(); g.arc(860, 600, 30, 0, 7); g.fill();
    g.strokeStyle = '#2a2a30'; g.lineWidth = 18; g.strokeRect(620, 520, 330, 470); g.lineWidth = 10; g.beginPath(); g.moveTo(785, 520); g.lineTo(785, 990); g.moveTo(620, 755); g.lineTo(950, 755); g.stroke();
    // lit + table de nuit
    g.fillStyle = '#22232a'; g.fillRect(80, 1160, 470, 140); g.fillStyle = '#2e3038'; g.fillRect(80, 1130, 470, 50); g.fillStyle = '#3c3e48'; g.fillRect(100, 1100, 140, 46);
    g.fillStyle = '#1a1b20'; g.fillRect(80, 1040, 26, 260);
    g.fillStyle = '#26272e'; g.fillRect(580, 1180, 120, 120);
    // rideaux
    g.fillStyle = '#1b1c24'; g.fillRect(585, 500, 40, 520); g.fillRect(945, 500, 40, 520);
    for (const x0 of [585, 945]) for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(x0 + 6 + k * 9, 500, 3, 520); }
    // cadre au mur (photo floue d'une montagne : l'objectif)
    g.fillStyle = '#23242c'; g.fillRect(180, 640, 230, 170); g.fillStyle = '#2f313b'; g.fillRect(194, 654, 202, 142);
    g.fillStyle = '#3d404c'; g.beginPath(); g.moveTo(200, 790); g.lineTo(280, 690); g.lineTo(330, 745); g.lineTo(360, 715); g.lineTo(392, 790); g.fill();
    // plante
    g.fillStyle = '#26272e'; g.fillRect(960, 1220, 70, 80);
    for (let k = 0; k < 7; k++) { g.save(); g.translate(995, 1222); g.rotate(-1.1 + k * 0.36); g.fillStyle = '#2b3b33'; g.beginPath(); g.ellipse(0, -60, 16, 60, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    // tapis
    g.fillStyle = '#1b1b21'; g.beginPath(); g.ellipse(720, 1420, 330, 50, 0, 0, Math.PI * 2); g.fill();
  });
  ctx.drawImage(wall, 0, 0);
  // pluie sur la vitre
  if (night) for (let i = 0; i < 14; i++) {
    const x = 632 + hash(i) * 305, v = (hash(i + 20) + t * (0.15 + hash(i + 40) * 0.2)) % 1, y = 530 + v * 440;
    ctx.fillStyle = 'rgba(180,200,240,0.35)'; ctx.fillRect(x, y, 3, 14); ctx.fillStyle = 'rgba(180,200,240,0.12)'; ctx.fillRect(x + 1, y - 40, 1, 40);
  }
  // lumière froide de la fenêtre au sol + poussière dans le faisceau
  ctx.fillStyle = 'rgba(140,160,220,0.07)'; ctx.beginPath(); ctx.moveTo(620, 990); ctx.lineTo(950, 990); ctx.lineTo(1020, 1460); ctx.lineTo(560, 1460); ctx.fill();
  motes(ctx, t, { x: 790, y: 980, w: 330, h: 460, n: 26, skew: 60, a: 0.45, seed: 2 });
  // phares d'une voiture dehors : la lumière balaie le plafond et le mur toutes les ~5 s
  const ph = (t % 5.2) / 5.2;
  if (ph < 0.4) {
    const k = ph / 0.4, x = 1100 - k * 1400;
    const g = ctx.createLinearGradient(x - 160, 0, x + 160, 0); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(0.5, 'rgba(255,240,210,0.08)'); g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 120, 120); ctx.lineTo(x + 200, 120); ctx.lineTo(x + 80, 520); ctx.lineTo(x - 220, 520); ctx.fill();
  }
  // rideaux qui ondulent légèrement (courant d'air)
  for (const [x0, sgn] of [[585, 1], [945, -1]]) {
    ctx.fillStyle = 'rgba(10,10,14,0.55)';
    ctx.beginPath(); ctx.moveTo(x0, 500);
    for (let y = 500; y <= 1020; y += 20) ctx.lineTo(x0 + sgn * (6 + 8 * Math.sin(t * 1.3 + y / 60)) , y);
    ctx.lineTo(x0, 1020); ctx.fill();
  }
  // téléphone posé sur le lit : notification toutes les ~4 s
  const nt = t % 4.1;
  ctx.fillStyle = '#0b0b0e'; ctx.fillRect(250, 1118, 44, 14);
  if (nt < 0.9) { const a = nt < 0.1 ? nt / 0.1 : 1 - (nt - 0.1) / 0.8; glow(ctx, 272, 1118, 120, '150,180,255', 0.45 * a); ctx.fillStyle = `rgba(200,215,255,${0.9 * a})`; ctx.fillRect(252, 1119, 40, 10); }
  // ombres des gouttes de la vitre projetées au sol dans le faisceau de lune
  for (let i = 0; i < 16; i++) {
    const v = (hash(i + 70) + t * (0.12 + hash(i + 90) * 0.15)) % 1;
    const x = 600 + hash(i + 60) * 380 + v * 70, y = 1010 + v * 430;
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, 5, 9, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // réveil à LED rouge
  if (alarm) {
    const on = alarm.blink ? Math.floor(t * 4) % 2 === 0 : true;
    ctx.fillStyle = '#0b0b0d'; ctx.fillRect(598, 1130, 86, 50);
    if (on) { glow(ctx, 641, 1155, 90, '227,52,44', 0.35); ctx.font = '700 30px Display'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.red; ctx.fillText(alarm.text, 641, 1166); }
  }
}

export function gym(ctx, t) {
  const bgc = cached('gym', W, H, (g) => {
    g.fillStyle = '#0d0d10'; g.fillRect(0, 0, W, H);
    for (let r = 0; r * 60 < 1300; r++) for (let x = -(r % 2) * 70; x < W; x += 140) { g.fillStyle = (r + x) % 3 ? '#16161a' : '#18181c'; g.fillRect(x + 3, r * 60 + 3, 134, 54); }
    g.fillStyle = '#101013'; g.fillRect(0, 1300, W, 620);
    g.fillStyle = '#1c1c21'; g.fillRect(0, 1300, W, 14);
    // râtelier d'haltères
    g.fillStyle = '#2a2a30'; g.fillRect(700, 1060, 300, 16); g.fillRect(720, 1076, 14, 224); g.fillRect(966, 1076, 14, 224);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#3a3a42'; g.beginPath(); g.arc(750 + i * 52, 1040, 20 + i * 2, 0, 7); g.fill(); }
    g.fillStyle = '#d0d0d4'; g.font = '900 64px Display'; g.globalAlpha = 0.06; g.fillText('NO EXCUSES', 80, 640); g.globalAlpha = 1;
    // miroir (reflet sombre) + disques au sol + tapis de sol
    g.fillStyle = '#121218'; g.fillRect(60, 760, 300, 440); g.strokeStyle = '#2a2a30'; g.lineWidth = 10; g.strokeRect(60, 760, 300, 440);
    g.fillStyle = 'rgba(255,255,255,0.04)'; g.beginPath(); g.moveTo(80, 780); g.lineTo(170, 780); g.lineTo(90, 1180); g.lineTo(80, 1180); g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = '#26262c'; g.beginPath(); g.ellipse(840 + i * 26, 1288 - i * 4, 18, 60, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#18181d'; g.fillRect(330, 1302, 420, 22);
  });
  ctx.drawImage(bgc, 0, 0);
  // sac de frappe qui se balance doucement
  const sw = Math.sin(t * 1.6) * 0.05;
  ctx.save(); ctx.translate(980, 420); ctx.rotate(sw);
  ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 140); ctx.stroke();
  ctx.fillStyle = '#5a1f1c'; ctx.beginPath(); ctx.roundRect(-48, 140, 96, 300, 30); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-48, 200, 96, 10); ctx.fillRect(-48, 370, 96, 10);
  ctx.restore();
  for (const x of [270, 810]) lightCone(ctx, x, 250, 1300, 520, { a: 0.07 + 0.01 * Math.sin(t * 50 + x) });
  motes(ctx, t, { x: 270, y: 300, w: 300, h: 950, n: 22, a: 0.35, seed: 5 });
  motes(ctx, t, { x: 810, y: 300, w: 300, h: 950, n: 22, a: 0.35, seed: 6 });
  // ventilateur au plafond
  ctx.save(); ctx.translate(540, 290); ctx.fillStyle = '#26262c';
  for (let b = 0; b < 3; b++) { ctx.save(); ctx.rotate(t * 7 + b * 2.094); ctx.scale(1, 0.25); ctx.beginPath(); ctx.ellipse(70, 0, 70, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.fillRect(-4, -40, 8, 40); ctx.restore();
  // télé murale (images qui changent)
  ctx.fillStyle = '#0a0a0d'; ctx.fillRect(400, 560, 230, 140);
  const ch = Math.floor(t * 0.8);
  ctx.fillStyle = `rgba(${120 + hash(ch) * 80},${130 + hash(ch + 1) * 60},${170 + hash(ch + 2) * 60},${0.18 + 0.05 * Math.sin(t * 20)})`; ctx.fillRect(408, 568, 214, 124);
  glow(ctx, 515, 630, 160, '150,170,220', 0.08);
  // deux sportifs en arrière-plan (silhouettes sombres) : course sur tapis + curl d'haltère
  const run1 = gait(t, { x0: 0, speed: 300, ground: 1240, scale: 0.55, run: true });
  ctx.fillStyle = '#1d1d22'; ctx.fillRect(110, 1240, 200, 16); ctx.fillRect(290, 1120, 10, 120);
  drawStick(ctx, 200, run1.y, run1.pose, { color: '#2a2a31', scale: 0.55, hands: false, feet: false });
  const curl = 0.5 - 0.5 * Math.cos(t * 3.2);
  drawStick(ctx, 930, 1240 - 158 * 0.55, { ...POSES.stand, armF: [10 + 110 * curl, -140 * curl], armB: [6, 10] }, { color: '#2a2a31', scale: 0.55, face: -1, hands: false, feet: false });
}

export function stage(ctx, t, { on = 1, sweep = 20 } = {}) {
  skyGrad(ctx, '#040406', '#0b0b10');
  // rideaux de scène (plis) + lambrequin
  const cur = cached('curtains', W, 1320, (g) => {
    for (const [x0, x1] of [[0, 170], [910, W]]) for (let x = x0; x < x1; x += 34) {
      const gr = g.createLinearGradient(x, 0, x + 34, 0); gr.addColorStop(0, '#1a0c0d'); gr.addColorStop(0.5, '#331416'); gr.addColorStop(1, '#1a0c0d');
      g.fillStyle = gr; g.fillRect(x, 0, 34, 1320);
    }
    g.fillStyle = '#2a1112'; for (let x = 0; x < W; x += 90) { g.beginPath(); g.ellipse(x + 45, 150, 60, 70, 0, 0, Math.PI); g.fill(); }
    g.fillRect(0, 0, W, 150);
  });
  // mur LED derrière la scène : barres verticales qui pulsent (lumière très discrète)
  for (let i = 0; i < 18; i++) {
    const x = 190 + i * 40, h = 220 + 160 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.7));
    ctx.fillStyle = `rgba(227,52,44,${(0.1 + 0.06 * Math.sin(t * 3 + i)).toFixed(3)})`; ctx.fillRect(x, 1290 - h, 24, h);
  }
  ctx.drawImage(cur, 0, 0);
  // plancher en lames avec reflets
  ctx.fillStyle = '#151317'; ctx.fillRect(0, 1300, W, 620);
  for (let y = 1300; y < H; y += 34) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(0, y, W, 2); }
  ctx.fillStyle = '#1d1d23'; ctx.fillRect(0, 1300, W, 18);
  for (const [x, sk] of [[180, 220], [540, 0], [900, -220]]) lightCone(ctx, x, 200, 1300, 360, { a: 0.12 * on, wTop: 30, skew: sk + Math.sin(t * (sweep > 20 ? 1.6 : 0.7) + x) * sweep });
  glow(ctx, 540, 1290, 380, '255,255,255', 0.18 * on);
  motes(ctx, t, { x: 540, y: 220, w: 500, h: 1080, n: 50, a: 0.4 * on, seed: 8 });
  // brume qui dérive
  for (let i = 0; i < 5; i++) {
    const x = ((hash(i + 30) * 1600 + t * (20 + i * 8)) % 1600) - 260, y = 900 + hash(i + 40) * 300;
    glow(ctx, x, y, 260, '200,200,215', 0.05 * on);
  }
  // téléphones levés dans le public + flashs photo
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 120 + Math.sin(t * 1.2 + i) * 14, y = 1390 + hash(i + 3) * 70 + Math.sin(t * 0.9 + i * 2) * 10;
    if (hash(i + 11) > 0.45) { ctx.fillStyle = 'rgba(210,225,255,0.55)'; ctx.fillRect(x - 9, y - 16, 18, 30); glow(ctx, x, y, 50, '160,190,255', 0.25); }
  }
  const fl = Math.floor(t * 5);
  if (hash(fl + 77) > 0.86) { const x = 80 + hash(fl) * 920, y = 1520 + hash(fl + 5) * 260; glow(ctx, x, y, 140, '255,255,255', 0.55); }
}

export function street(ctx, camX, t, { wet = true } = {}) {
  skyGrad(ctx, '#05060a', '#141623', 0, 1300);
  const far = skyline(1, { h: 900, base: '#0f1016', win: '#262833', lit: 0.18 });
  const mid = skyline(2, { h: 1000, base: '#15161c', win: '#5a5c6a', lit: 0.22, minH: 280, maxH: 880, bw: [160, 300] });
  airplane(ctx, t);
  parallax(ctx, [{ canvas: blurred('farSky', far, 4), depth: 0.15, y: 420 }], camX);
  farTrain(ctx, t, camX);
  parallax(ctx, [{ canvas: blurred('midSky', mid, 1.5), depth: 0.4, y: 330 }], camX);
  blinkingWindows(ctx, t, camX);
  fog(ctx, 950, 400, 0.35 + 0.08 * Math.sin(t * 0.4));
  farTraffic(ctx, t);
  if (wet) lightning(ctx, t);
  passersby(ctx, t, camX);
  ctx.fillStyle = '#18191f'; ctx.fillRect(0, 1300, W, 620);
  ctx.fillStyle = wet ? '#23252e' : '#202126'; ctx.fillRect(0, 1300, W, 12);
  // réverbères (premier plan, parallaxe 1)
  for (let k = Math.floor((camX - 200) / 560); k < Math.floor((camX + W + 200) / 560) + 1; k++) {
    const x = k * 560 - camX + 120;
    ctx.fillStyle = '#2c2d34'; ctx.fillRect(x - 7, 760, 14, 540); ctx.fillRect(x - 7, 760, 70, 10);
    glow(ctx, x + 60, 775, 120, '255,220,170', 0.35);
    lightCone(ctx, x + 60, 778, 1300, 380, { color: '255,220,170', a: 0.08, wTop: 26 });
  }
  // bande de trottoir
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let x = -((camX % 140) + 140) % 140; x < W; x += 140) ctx.fillRect(x, 1340, 70, 6);
  // enseigne néon sur une façade (parallaxe 0,7)
  for (let k = Math.floor((camX * 0.7 - 400) / 1400); k < Math.floor((camX * 0.7 + W) / 1400) + 1; k++) {
    const x = k * 1400 - camX * 0.7 + 700;
    ctx.fillStyle = '#121318'; ctx.fillRect(x - 170, 840, 340, 120);
    neon(ctx, 'OUVERT 24H', x, 920, t, { size: 44, seed: k + 3 });
  }
  // flaques qui reflètent les réverbères
  if (wet) for (let k = Math.floor((camX - 300) / 460); k < Math.floor((camX + W) / 460) + 2; k++) {
    const x = k * 460 - camX + 260 + hash(k) * 80, w = 120 + hash(k + 9) * 140;
    ctx.save(); ctx.translate(x, 1395 + hash(k + 4) * 60); ctx.scale(1, 0.16);
    ctx.fillStyle = 'rgba(40,44,58,0.9)'; ctx.beginPath(); ctx.arc(0, 0, w, 0, Math.PI * 2); ctx.fill();
    glow(ctx, 0, 0, w * 0.9, '255,220,170', 0.22 + 0.05 * Math.sin(t * 3 + k));
    ctx.restore();
  }
  // voiture qui passe au loin : phares qui balaient la rue toutes les ~6 s
  const ph = (t % 6) / 6;
  if (ph < 0.35) {
    const cx = -300 + ph / 0.35 * (W + 600);
    ctx.fillStyle = '#0d0e12'; ctx.beginPath(); ctx.roundRect(cx - 150, 1215, 300, 70, 20); ctx.fill(); ctx.beginPath(); ctx.roundRect(cx - 90, 1170, 170, 60, 20); ctx.fill();
    glow(ctx, cx + 150, 1250, 260, '255,245,220', 0.35); glow(ctx, cx - 150, 1250, 60, '227,52,44', 0.5);
    lightCone(ctx, cx + 300, 1250, 1320, 420, { color: '255,245,220', a: 0.07, wTop: 20 });
  }
  // vapeur d'une bouche d'égout
  for (let i = 0; i < 8; i++) {
    const v = (t * 0.25 + i / 8) % 1, x = 640 - camX * 1 % 2000 + 900 + Math.sin(t + i) * 30 + v * 40;
    const xx = ((x % (W + 400)) + W + 400) % (W + 400) - 200;
    ctx.fillStyle = `rgba(200,205,215,${(0.08 * (1 - v)).toFixed(3)})`; ctx.beginPath(); ctx.arc(xx, 1300 - v * 300, 40 + v * 90, 0, Math.PI * 2); ctx.fill();
  }
}

// Confettis (Matter.js) : feuilles qui tombent en voletant (forte résistance de l'air).
export function confettiBake({ n = 40, seed = 4, duration = 6, colors = ['#f1f1f1', '#e3342c', '#9a9a9c'] } = {}) {
  const M = globalThis.Matter; let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const engine = M.Engine.create(); engine.gravity.y = 0.35;
  const items = Array.from({ length: n }, (_, i) => {
    const w = 14 + rnd() * 12, h = 8 + rnd() * 6;
    const body = M.Bodies.rectangle(rnd() * W, -40 - rnd() * 900, w, h, { frictionAir: 0.045 + rnd() * 0.03 });
    M.Body.setVelocity(body, { x: (rnd() - 0.5) * 6, y: rnd() * 2 }); M.Body.setAngularVelocity(body, (rnd() - 0.5) * 0.4);
    return { body, w, h, color: colors[i % colors.length], ph: rnd() * 6 };
  });
  M.Composite.add(engine.world, items.map((i) => i.body));
  const fps = 60, N = Math.ceil(duration * fps), frames = [];
  for (let f = 0; f <= N; f++) {
    // voletage : petite force latérale sinusoïdale, propre à chaque feuille
    items.forEach((it) => M.Body.applyForce(it.body, it.body.position, { x: Math.sin(f / 9 + it.ph) * 0.00004 * it.w, y: 0 }));
    frames.push(items.map((it) => [it.body.position.x, it.body.position.y, it.body.angle]));
    M.Engine.update(engine, 1000 / fps);
  }
  return { at(t) { const fr = frames[Math.min(N, Math.max(0, Math.round(t * fps)))]; return items.map((it, k) => ({ x: fr[k][0], y: fr[k][1], a: fr[k][2], item: it })); } };
}
export function drawConfetti(ctx, frame) {
  for (const p of frame) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(1, Math.cos(p.a * 3)); // retournement de la feuille
    ctx.fillStyle = p.item.color; ctx.fillRect(-p.item.w / 2, -p.item.h / 2, p.item.w, p.item.h);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ personnages
// Foule variée : chaque membre a sa taille, sa teinte, son décalage de temps et un comportement.
export function makeCrowd(n, seed, { x0 = 100, spacing = 95, ground = 1300, scale = 0.8, jitter = 0.18 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const r = (k) => hash(seed * 131 + i * 17 + k);
    const g = Math.round(85 + r(1) * 70);
    return { x: x0 + i * spacing + (r(2) - 0.5) * spacing * 0.4, ground, scale: scale * (1 - jitter / 2 + r(3) * jitter), color: `rgb(${g},${g},${g + 3})`, phase: r(4) * 6, face: r(5) > 0.5 ? 1 : -1 };
  });
}
export function drawCrowd(ctx, crowd, t, behavior = 'watch', { face = null, alpha = 1, blur = 0 } = {}) {
  ctx.save(); if (blur) ctx.filter = `blur(${blur}px)`;
  for (const m of crowd) {
    const tt = t + m.phase, f = face ?? m.face;
    let pose = POSES.stand, dy = 0;
    if (behavior === 'laugh') { const b = Math.abs(Math.sin(tt * 9)); pose = { ...POSES.stand, lean: -10 - 6 * b, head: -16, armB: [40, 70], armF: [30, 80] }; dy = -6 * b; }
    else if (behavior === 'point') { const b = Math.abs(Math.sin(tt * 8)); pose = { ...POSES.stand, lean: -6 - 4 * b, head: -8, armF: [92, 0], armB: [30, 60] }; dy = -4 * b; }
    else if (behavior === 'phone') pose = { ...POSES.phone, head: 28 + 3 * Math.sin(tt) };
    else if (behavior === 'clap') { const c = Math.abs(Math.sin(tt * 11)); pose = { ...POSES.stand, armB: [70 + 14 * c, 60 - 30 * c], armF: [70 + 14 * c, 60 - 30 * c] }; }
    else if (behavior === 'sit') pose = { ...POSES.sit, head: 18 };
    else pose = { ...POSES.stand, lean: Math.sin(tt * 1.3) * 2, head: Math.sin(tt * 0.9) * 6 };
    const hipY = m.ground - (BODY_LEG * m.scale) + dy - (behavior === 'sit' ? -60 * m.scale : 0);
    drawStick(ctx, m.x, hipY, pose, { color: m.color, scale: m.scale, face: f, ground: m.ground, alpha, eyes: !blur, t: tt, mouth: behavior === 'laugh' ? 'happy' : null });
    if (behavior === 'phone') glow(ctx, m.x + 40 * f * m.scale, hipY - 90 * m.scale, 60 * m.scale, '150,180,255', 0.35);
  }
  ctx.restore();
  if (behavior === 'laugh' && crowd.length) {
    const cx = crowd.reduce((a, m) => a + m.x, 0) / crowd.length;
    for (let k = 0; k < 3; k++) label(ctx, 'HA', cx - 160 + k * 160 + Math.sin(t * 7 + k) * 10, crowd[0].ground - 330 - Math.abs(Math.sin(t * 6 + k)) * 18, { size: 30, color: '#8c8c90' });
  }
}
const BODY_LEG = 158;

// Expressions (sourcils) : à dessiner juste après drawStick, avec les mêmes paramètres de tête.
export function headPos(x, y, pose, scale = 1, face = 1) {
  const D = Math.PI / 180, lean = pose.lean * D * face;
  const nx = Math.sin(lean) * 112, ny = -Math.cos(lean) * 112;
  const ha = (pose.lean + pose.head * 0.6) * D * face;
  return { x: x + (nx + Math.sin(ha) * 50) * scale, y: y + (ny - Math.cos(ha) * 50) * scale };
}
export function brows(ctx, x, y, pose, { scale = 1, face = 1, mood = 'determined' } = {}) {
  const h = headPos(x, y, pose, scale, face);
  const tilt = mood === 'determined' || mood === 'angry' ? 0.45 : mood === 'sad' ? -0.45 : 0;
  ctx.save(); ctx.strokeStyle = '#111'; ctx.lineWidth = 5 * scale; ctx.lineCap = 'round';
  for (const [dx, s] of [[6, 1], [24, -1]]) {
    const cx = h.x + dx * face * scale, cy = h.y - 22 * scale;
    ctx.beginPath(); ctx.moveTo(cx - 8 * scale, cy - tilt * 8 * s * face * scale); ctx.lineTo(cx + 8 * scale, cy + tilt * 8 * s * face * scale); ctx.stroke();
  }
  ctx.restore();
}
// Sueur (effort) : gouttes qui perlent et tombent.
export function sweat(ctx, x, y, pose, t, { scale = 1, face = 1 } = {}) {
  const h = headPos(x, y, pose, scale, face);
  for (let k = 0; k < 2; k++) {
    const ph = (t * 1.4 + k * 0.5) % 1;
    ctx.fillStyle = `rgba(160,200,255,${(1 - ph) * 0.9})`;
    ctx.beginPath(); ctx.ellipse(h.x - 40 * face * scale + k * 10, h.y - 10 * scale + ph * 60 * scale, 5 * scale, 8 * scale, 0, 0, 7); ctx.fill();
  }
}

// ------------------------------------------------------------------ transitions
// Panoramique filé : la scène A part, la B arrive (avec flou de bougé via les sous-images du harnais).
export function whip(ctx, t, tb, dur, drawA, drawB, dir = -1) {
  const k = clamp((t - (tb - dur / 2)) / dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  ctx.save(); ctx.translate(dir * W * e, 0); drawA(ctx); ctx.restore();
  ctx.save(); ctx.translate(dir * W * e - dir * W, 0); drawB(ctx); ctx.restore();
}
export { gait };
