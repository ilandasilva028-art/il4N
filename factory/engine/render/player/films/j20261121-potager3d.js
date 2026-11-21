// « 4 graines, 1 récolte » — film ORIGINAL, série Toi contre toi #12. Coupe de terrain d'un potager en 3D
// (Blender, engine/blender/potager.py → plates/potager/coupe.jpg) ; arrosoirs, fleurs en plastique, graines, tiges, racines
// qui poussent sous terre, pluie et personnages sont animés ici (canvas).
// L'EGO plante des fleurs en plastique ; L'OBSESSION arrose dix fois par jour et noie ses graines ;
// LA CHANCE attend la pluie ; DISCIPLINE arrose une fois par jour : ses racines descendent sous terre avant de se voir.
// Rétention : compteur d'élimination, transitions, boucle parfaite (la fin rejoue l'avant du coup de vent de l'image 0).
import { W, H, timeline, topBand, POSES, COLORS, clamp, prog, ease, pop, lerp, noise, hash, VARIANT, seriesTag, dust, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
import { glow, bubble, rewind, sweat, rain } from '../lib/world.js';
import { drawMember, CAST } from '../lib/cast.js';
import { cinema } from '../lib/light.js';
import { transition } from '../lib/trans.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['ouverture', 7], ['jour1', 7], ['visite', 16], ['jour60', 7], ['pluie', 5], ['recolte', 6], ['chute', 5], ['boucle', 3]]);
export const DURATION = S.end;
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #12';
const log = (s) => TEXTLOG.frame.push(s);

export const SCRIPT = {
  premiere: 'raté',
  accroche: VARIANT === 'b' ? ['QUI VA VOIR', 'POUSSER QUOI ?'] : ['4 GRAINES.', '1 SEULE RÉCOLTE.'],
  structure: ['ouverture', 'conflit', 'effort', 'progression', 'obstacle', 'retournement', 'chute'],
  dialogues: ['REGARDEZ MES FLEURS !', 'J’ARROSE DIX FOIS !', 'BIENTÔT, LA PLUIE !', 'ENFIN LA PLUIE !'],
  conseils: ['ARROSE UN PEU, CHAQUE JOUR.', 'LES RACINES AVANT LES FEUILLES.', 'NE DÉTERRE PAS POUR VÉRIFIER.'],
  details: ['JOUR 1', 'JOUR 60', 'JOUR 180', 'fleurs en plastique', '10 arrosages', 'arrosoir', 'racines'],
  chute: ['CE QUI POUSSE SOUS TERRE', 'FINIT PAR SE VOIR.'],
};

// ------------------------------------------------------------------ plaque Blender (repère logique 1080 × 2880, 1 m = 100 px)
let IMG = null;
export async function init() { IMG = new Image(); IMG.src = 'plates/potager/coupe.jpg'; await IMG.decode(); }
const PH = 2880, GY = 900, PPM = 100;
const COL = { ego: 150, obsession: 410, chance: 670, discipline: 930 };
const SUN = [860, 770];
let CAM = { x: 540, y: 960, z: 1 };
const toScreen = (x, y) => ({ x: (x - CAM.x) * CAM.z + W / 2, y: (y - CAM.y) * CAM.z + H / 2 });
function view(ctx, { x = 540, y = 960, z = 1 } = {}) {
  const hw = W / (2 * z), hh = H / (2 * z);
  x = clamp(x, hw, W - hw); y = clamp(y, hh, PH - hh);
  CAM = { x, y, z };
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-x, -y);
  ctx.drawImage(IMG, 0, 0, W, PH);
  ctx.fillStyle = 'rgba(2,3,8,0.55)'; ctx.fillRect(0, 0, W, PH);
}
const keys = (tl, list) => { let [, x, y, z] = list[0]; for (let i = 1; i < list.length; i++) { const k = ease.inOut(prog(tl, list[i][0], list[i][0] + 0.6)); x = lerp(x, list[i][1], k); y = lerp(y, list[i][2], k); z = lerp(z, list[i][3], k); } return { x, y, z }; };
const interp = (pts, t) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])); return pts[pts.length - 1][1]; };

// ------------------------------------------------------------------ évolution du potager (profondeurs et hauteurs en m)
const rD = (t) => interp([[0, 0], [S.jour1, 0.05], [S.visite, 0.6], [S.jour60, 1.3], [S.pluie, 2.4], [S.recolte, 3.0], [S.recolte + 2, 4.2], [S.end, 4.4]], t);
const hD = (t) => interp([[0, 0], [S.jour1 + 2.2, 0], [S.visite, 0.08], [S.jour60, 0.2], [S.pluie, 0.3], [S.recolte, 0.45], [S.recolte + 1.8, 1.3], [S.end, 1.3]], t);
const flood = (t) => interp([[0, 0.7], [S.jour1, 0.1], [S.visite, 0.5], [S.jour60, 1], [S.end, 1]], t);
const fade = (t) => interp([[0, 0], [S.visite, 0.1], [S.jour60, 0.3], [S.pluie, 0.6], [S.recolte + 0.5, 1], [S.end, 1]], t);
const OUT = { obsession: S.jour60 + 0.7, chance: S.pluie + 1.2, ego: S.recolte + 0.5 };

// ------------------------------------------------------------------ personnages, arrosoir
const SC = (1.9 * PPM) / 424, LEG = 158 * SC, D = Math.PI / 180;
function handPos(x, y, pose, sc, face = 1) {
  const lean = pose.lean * D * face, sx = Math.sin(lean) * 112 * 0.9, sy = -Math.cos(lean) * 112 * 0.9;
  const a1 = (pose.armF[0] + pose.lean) * D, a2 = (pose.armF[0] + pose.lean + pose.armF[1]) * D;
  return { x: x + (sx + Math.sin(a1) * 66 * face + Math.sin(a2) * 62 * face) * sc, y: y + (sy + Math.cos(a1) * 66 + Math.cos(a2) * 62) * sc };
}
function canDraw(ctx, x, y, face, tilt, t, pouring, sc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face, 1); ctx.rotate(tilt * 0.9);
  ctx.fillStyle = '#4a8fd0'; ctx.strokeStyle = '#2d5f95'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-20 * sc, -14 * sc, 40 * sc, 28 * sc, 5); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16 * sc, 2 * sc); ctx.lineTo(46 * sc, -16 * sc); ctx.lineTo(50 * sc, -12 * sc); ctx.lineTo(18 * sc, 10 * sc); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-20 * sc, -2 * sc, 14 * sc, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.restore();
  if (!pouring) return;
  const c = Math.cos(tilt * 0.9), s = Math.sin(tilt * 0.9), tx = x + face * (48 * sc * c - (-14 * sc) * s), ty = y + (48 * sc * s + (-14 * sc) * c);
  const drop = Math.max(20, GY - 5 - ty);
  ctx.fillStyle = 'rgba(170,215,255,0.85)';
  for (let i = 0; i < 16; i++) { const ph = (t * 2.6 + i / 16) % 1; ctx.globalAlpha = 0.9 - ph * 0.3; ctx.beginPath(); ctx.ellipse(tx + face * ph * 26, ty + ph * ph * drop, 2.4, 4, 0, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  const px = tx + face * 26; ctx.strokeStyle = 'rgba(170,215,255,0.6)'; ctx.lineWidth = 2; const r = 6 + 6 * ((t * 3) % 1); ctx.beginPath(); ctx.ellipse(px, GY - 3, r * 2, r * 0.5, 0, 0, 7); ctx.stroke();
}
function waterer(ctx, who, x, tl, { period = 1.0, off = 0, mood = 'determined', mouth = 'grit', lean0 = 8, pour = true } = {}) {
  const ph = ((tl + off) / period) % 1, k = pour ? Math.sin(Math.PI * clamp(ph / 0.75)) : 0;
  const pose = { ...POSES.stand, lean: lean0 + 10 * k, head: 14 + 10 * k, armF: [70 + 10 * k, 40], armB: [64, 42] };
  const y = GY - LEG;
  drawMember(ctx, who, x, y, pose, { scale: SC, t: tl, mood, mouth, showLabel: false });
  const h = handPos(x, y, pose, SC);
  canDraw(ctx, h.x + 6, h.y, 1, 0.15 + 0.85 * k, tl, k > 0.3);
  return k;
}

// ------------------------------------------------------------------ plantes, racines, fleurs en plastique, chaise, pot, nuages
function roots(ctx, cx, d, t) {
  const dp = d * PPM; if (dp < 5) return;
  const wob = (y) => cx + Math.sin(y * 0.04 + 1) * 5;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#e8cfa0'; ctx.shadowColor = 'rgba(255,225,170,0.7)'; ctx.shadowBlur = 9;
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, GY + 2); for (let y = 8; y <= dp; y += 8) ctx.lineTo(wob(y), GY + y); ctx.stroke();
  const nb = Math.floor(dp / 30);
  for (let i = 0; i < nb; i++) {
    const y = 22 + i * 30, side = i % 2 ? 1 : -1, grow = clamp((dp - y) / 70);
    const len = (46 + hash(i + 3) * 74) * grow * (1 - y / (dp + 320));
    if (len < 4) continue;
    ctx.lineWidth = Math.max(1.6, 3.4 * (1 - i / (nb + 4)));
    const x0 = wob(y);
    ctx.beginPath(); ctx.moveTo(x0, GY + y); ctx.quadraticCurveTo(x0 + side * len * 0.55, GY + y + len * 0.08, x0 + side * len, GY + y + len * 0.42); ctx.stroke();
    if (len > 56) { ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x0 + side * len * 0.6, GY + y + len * 0.2); ctx.lineTo(x0 + side * len * 0.95, GY + y + len * 0.2 + len * 0.34); ctx.stroke(); }
  }
  ctx.restore();
  glow(ctx, wob(dp), GY + dp, 34, '255,235,190', 0.65);
  void t;
}
function stemPlant(ctx, x, hpx, t, fruit = 0) {
  if (hpx < 3) return;
  const sw = Math.sin(t * 2 + x) * Math.min(6, hpx * 0.05);
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#4fbf3a'; ctx.lineWidth = Math.max(3, hpx * 0.04);
  ctx.beginPath(); ctx.moveTo(x, GY); ctx.quadraticCurveTo(x + sw * 0.4, GY - hpx * 0.5, x + sw, GY - hpx); ctx.stroke();
  const n = Math.floor(hpx / 22);
  for (let i = 0; i < n; i++) {
    const u = (i + 1) / (n + 1), side = i % 2 ? 1 : -1, ly = GY - hpx * u, lx = x + sw * u * u, s = (9 + 15 * Math.min(1, hpx / 110)) * (1 - u * 0.35);
    ctx.fillStyle = i % 3 === 0 ? '#3fa832' : '#58cc44'; ctx.save(); ctx.translate(lx, ly); ctx.rotate(side * 0.7 + Math.sin(t * 2 + i) * 0.06);
    ctx.beginPath(); ctx.ellipse(side * s, 0, s, s * 0.45, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.beginPath(); ctx.fillStyle = '#58cc44'; ctx.ellipse(x + sw, GY - hpx, 7, 12, 0, 0, 7); ctx.fill();
  if (fruit > 0) for (let k = 0; k < 4; k++) {
    const u = 0.32 + k * 0.16, side = k % 2 ? 1 : -1, fx = x + sw * u * u + side * 17, fy = GY - hpx * u + 14, r = 13 * fruit;
    ctx.strokeStyle = '#3fa832'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + sw * u * u, GY - hpx * u); ctx.lineTo(fx, fy - r); ctx.stroke();
    ctx.fillStyle = '#e3342c'; ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(fx - r * 0.35, fy - r * 0.35, r * 0.28, 0, 7); ctx.fill();
  }
  ctx.restore();
}
const mixHex = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, k)); return `rgb(${c(16)},${c(8)},${c(0)})`; };
const FCOL = ['#ff4d8d', '#ffd23a', '#4dc3ff', '#ff8a3a', '#b28cff'];
function flowerHead(ctx, x, y, r, col, rot, fd) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = mixHex(col, '#b8b8b2', fd);
  for (let p = 0; p < 6; p++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.ellipse(r * 0.62, 0, r * 0.5, r * 0.34, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = mixHex('#fff8c8', '#d8d8d0', fd); ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - fd)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.12, 0, 7); ctx.fill();
  ctx.restore();
}
const FXS = [95, 122, 150, 178, 206], FHS = [74, 92, 62, 84, 70];
function egoPatch(ctx, t, { n = 5, fd = 0, fly = null, wind = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    if (fly !== null && fly >= 0) {
      const x = FXS[i] + 340 * fly * (0.8 + 0.15 * i), y = GY - FHS[i] - (560 + 40 * i) * fly + 760 * fly * fly, rot = fly * (5 + i);
      ctx.save(); ctx.strokeStyle = '#2fbf5a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(rot) * 48, y + Math.cos(rot) * 48); ctx.stroke(); ctx.restore();
      flowerHead(ctx, x, y, 17, FCOL[i], rot, fd);
      continue;
    }
    const sw = Math.sin(t * 3 + i) * (2 + wind * 11), fx = FXS[i] + sw, fy = GY - FHS[i] * (fd > 0.9 ? 0.82 : 1);
    ctx.strokeStyle = mixHex('#2fbf5a', '#8a8a82', fd); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(FXS[i], GY); ctx.lineTo(fx, fy); ctx.stroke();
    flowerHead(ctx, fx, fy, 17, FCOL[i], sw * 0.04, fd);
  }
}
function deckChair(ctx, x) {
  ctx.save(); ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 50, GY); ctx.lineTo(x - 10, GY - 48); ctx.lineTo(x + 55, GY - 26); ctx.moveTo(x + 55, GY); ctx.lineTo(x + 10, GY - 48); ctx.moveTo(x - 10, GY - 48); ctx.lineTo(x - 58, GY - 92); ctx.stroke();
  ctx.strokeStyle = '#2fa59a'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x - 52, GY - 88); ctx.lineTo(x - 12, GY - 46); ctx.lineTo(x + 52, GY - 28); ctx.stroke(); ctx.restore();
}
function pot(ctx, x, y, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = '#b5532f'; ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(20, -30); ctx.lineTo(15, 0); ctx.lineTo(-15, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a3c20'; ctx.fillRect(-23, -36, 46, 8); ctx.fillStyle = '#4a2c18'; ctx.beginPath(); ctx.ellipse(0, -36, 20, 4, 0, 0, 7); ctx.fill(); ctx.restore();
}
function cloud(ctx, x, y, s, a = 1, dark = 0) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = mixHex('#f3eef0', '#555a68', dark);
  for (const [dx, dy, r] of [[0, 0, 60], [55, -12, 70], [115, 4, 56], [60, 18, 62]]) { ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, r * s, r * s * 0.62, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

// monde commun : soleil, plantes, racines, fleurs, flaque, pot, chaise
function world(ctx, t, { egoN = 5, egoFly = null, wind = 0, noPot = false, potX = 0, dug = 0 } = {}) {
  glow(ctx, SUN[0], SUN[1], 300, '255,205,140', 0.5);
  ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(SUN[0], SUN[1], 38, 0, 7); ctx.fill();
  // L'OBSESSION : sol noyé, graines qui pourrissent, flaque
  const fl = flood(t), cx = COL.obsession;
  const g = ctx.createLinearGradient(0, GY, 0, GY + 55 + fl * 150); g.addColorStop(0, `rgba(10,14,30,${(0.55 * fl).toFixed(2)})`); g.addColorStop(1, 'rgba(10,14,30,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - 130, GY, 260, 55 + fl * 150);
  for (let i = 0; i < 6; i++) { if (dug && i === 2) continue; ctx.fillStyle = mixHex('#d8b878', '#4a4a3c', fl); ctx.beginPath(); ctx.ellipse(cx - 85 + i * 34, GY + 22 + (i % 3) * 14 - fl * 4, 6, 4, 0.5, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(110,170,225,0.72)'; ctx.beginPath(); ctx.ellipse(cx, GY - 2, 40 + fl * 100, 7 + fl * 5, 0, 0, 7); ctx.fill();
  if (dug > 0) { ctx.fillStyle = '#1b130d'; ctx.beginPath(); ctx.ellipse(cx - 17, GY + 6, 28 * dug, 9 * dug, 0, 0, 7); ctx.fill(); ctx.fillRect(cx - 17 - 28 * dug, GY + 6, 56 * dug, 22 * dug); }
  // L'EGO : fleurs en plastique
  egoPatch(ctx, t, { n: egoN, fd: fade(t), fly: egoFly, wind });
  // LA CHANCE : chaise, pot oublié
  deckChair(ctx, COL.chance - 12);
  if (!noPot) pot(ctx, COL.chance + 95 + potX, GY, 0);
  // DISCIPLINE : racines et tige
  roots(ctx, COL.discipline, rD(t), t);
  if (rD(t) < 0.3) { ctx.fillStyle = '#d8b878'; ctx.beginPath(); ctx.ellipse(COL.discipline, GY + 16, 6, 4, 0.4, 0, 7); ctx.fill(); }
  stemPlant(ctx, COL.discipline, hD(t) * PPM, t, clamp((t - (S.recolte + 1.4)) / 0.5));
}

// ------------------------------------------------------------------ textes
function tip(ctx, n, text, tl, t0) {
  const k = pop(tl, t0, 0.3);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 1480); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
  ctx.font = '900 40px Display'; ctx.letterSpacing = '2px';
  const w = ctx.measureText(text).width + 130;
  ctx.fillStyle = 'rgba(12,12,15,0.9)'; ctx.beginPath(); ctx.roundRect(-w / 2, -44, w, 88, 44); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(-w / 2 + 46, 0, 28, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), -w / 2 + 47, 2);
  ctx.textAlign = 'left'; ctx.fillStyle = '#f1f1f1'; ctx.fillText(text, -w / 2 + 92, 2);
  ctx.restore();
  if (k >= 0.5) log(text);
}
function title(ctx, tl, parts, t0 = 0.05, size = 90) { topBand(ctx); kinetic(ctx, parts, 420, size, tl, t0, { stagger: 0.1, rise: 50 }); }
function card(ctx, who, tag, u) {
  const c = CAST[who]; topBand(ctx);
  kinetic(ctx, [[c.name, c.labelColor]], 430, 92, u, 0.05, { stagger: 0.08, rise: 40 });
  kinetic(ctx, [[tag, '#f1f1f1']], 525, 50, u, 0.1, { stagger: 0.06 });
}

// ------------------------------------------------------------------ 1. ouverture : un coup de vent arrache les fleurs de l'Ego (image 0)
const HOOK = VARIANT === 'b' ? [[['QUI VA VOIR', '#f1f1f1']], [['POUSSER ', '#f1f1f1'], ['QUOI ?', RED]]] : [[['4 GRAINES.', '#f1f1f1']], [['1 SEULE ', '#f1f1f1'], ['RÉCOLTE.', RED]]];
const BOUCLE = 3 * B;
function ouverture(ctx, tl) {
  const cam = keys(tl, [[-9, 330, 820, 2.0], [0, 330, 830, 1.65], [1.4, 430, 880, 1.4]]);
  const quake = tl > 0 && tl < 0.7 ? 24 * Math.exp(-tl * 6) : 0;
  ctx.save(); ctx.translate(noise(tl * 70, 3) * quake, noise(tl * 70, 8) * quake);
  view(ctx, cam);
  const wind = clamp((tl + 3) / 3.2);
  world(ctx, S.jour1 + 1.5, { egoFly: tl >= 0 ? tl : null, wind: tl < 0 ? wind : 1 });
  // L'EGO : fier avant le coup de vent, il bondit pour rattraper ses fleurs
  const rk = ease.out(prog(tl, 0, 0.25));
  const pose = tl < 0 ? { ...POSES.stand, lean: -4, armF: [20, 30], armB: [-20, 30], head: -6 } : { ...POSES.stand, lean: -8 - 26 * rk + Math.sin(tl * 12) * 3, head: -10, armF: [-150 + Math.sin(tl * 10) * 12, -20], armB: [-140 - Math.sin(tl * 10) * 12, -20] };
  const jump = tl > 0 ? Math.abs(Math.sin(tl * 5.2)) * 46 * Math.exp(-tl * 0.7) : 0;
  drawMember(ctx, 'ego', 255 + (tl > 0 ? Math.min(60, tl * 90) : 0), GY - LEG - jump, pose, { scale: SC, t: tl, mouth: tl < 0 ? 'smirk' : 'open', mood: tl < 0 ? null : 'sad', showLabel: false });
  // L'OBSESSION arrose frénétiquement derrière
  waterer(ctx, 'obsession', COL.obsession + 10, tl, { period: 0.5, mood: 'angry', mouth: 'grit' });
  // rafales de vent et feuilles
  if (tl > -0.4) for (let k = 0; k < 12; k++) {
    const y = GY - 30 - k * 34, x = ((tl * 1700 + k * 190) % 1500) - 300, len = 140 + hash(k) * 110;
    ctx.strokeStyle = `rgba(255,255,255,${(0.3 * clamp(tl + 0.4)).toFixed(2)})`; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - len * 0.08); ctx.stroke();
  }
  if (tl > 0) { for (let k = 0; k < 18; k++) { const x = (tl * 900 * (0.6 + hash(k)) + k * 70) % 900, y = GY - 120 - k * 36 + Math.sin(tl * 9 + k) * 30; ctx.fillStyle = k % 2 ? '#58cc44' : '#3fa832'; ctx.save(); ctx.translate(x, y); ctx.rotate(tl * 8 + k); ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, 7); ctx.fill(); ctx.restore(); } dust(ctx, 240, GY, tl, 0.05, { n: 12, spread: 280, color: '170,140,110' }); }
  ctx.restore();
  const rw = prog(tl, 7 * B - 0.5, 7 * B);
  if (rw > 0) rewind(ctx, tl * 8, rw);
  seriesTag(ctx, SERIES, pop(tl, 1.0));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 92, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 505, 96, tl, 2 * B, { stagger: 0.1, rise: 60 });
}

// ------------------------------------------------------------------ 2. jour 1 : chacun plante à sa façon (travelling)
function jour1(ctx, tl) {
  const t = S.jour1 + tl, pan = ease.inOut(prog(tl, 0.2, 3.1));
  ctx.save(); view(ctx, { x: lerp(210, 880, pan), y: 790, z: 1.7 });
  world(ctx, t, { egoN: Math.min(5, 1 + Math.floor(tl / 0.55)) });
  // L'EGO plante ses fleurs en plastique, une à une
  const ph = (tl / 0.55) % 1, plant = ph < 0.35;
  const ep = { ...POSES.stand, lean: 16, head: 12, armF: [40, 50], armB: [20, 30] };
  drawMember(ctx, 'ego', 255, GY - LEG, ep, { scale: SC, t, mouth: 'smirk', face: -1, showLabel: true });
  if (plant && tl < 2.8) { const h = handPos(255, GY - LEG, ep, SC, -1); flowerHead(ctx, h.x, h.y - 6, 14, FCOL[Math.floor(tl / 0.55) % 5], 0.3, 0); }
  if (tl > 0.3 && tl < 1.25) bubble(ctx, 'REGARDEZ MES FLEURS !', 235, GY - LEG - 150, tl, 0.3, { log, size: 26 });
  // L'OBSESSION arrose, arrose, arrose
  waterer(ctx, 'obsession', COL.obsession + 10, tl, { period: 0.55, mood: 'angry', mouth: 'grit' });
  // LA CHANCE attend, vautrée dans sa chaise
  drawMember(ctx, 'chance', COL.chance - 12, GY - 52, { ...POSES.sit, lean: -34, head: -22, armF: [20, 30], armB: [10, 30] }, { scale: SC, t, mouth: null, showLabel: true });
  cloud(ctx, 560 + tl * 12, 640, 1.0, 0.9);
  if (tl > 1.1 && tl < 2.1) bubble(ctx, 'J’ATTENDS LA PLUIE.', COL.chance, GY - 170, tl, 1.1, { log, size: 26 });
  // DISCIPLINE : une graine, puis un seul arrosage
  if (tl < 1.3) { const k = Math.sin(Math.min(1, tl / 1.2) * Math.PI); drawMember(ctx, 'discipline', COL.discipline - 40, GY - LEG + 22, { ...POSES.crouch, lean: 26 + 6 * k, armF: [60 + 16 * k, 30], armB: [56, 36] }, { scale: SC, t, mood: 'determined', mouth: 'grit', showLabel: true }); }
  else waterer(ctx, 'discipline', COL.discipline - 40, tl - 1.3, { period: 1.3, mood: 'determined' });
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['1', RED]]);
  tip(ctx, 1, 'ARROSE UN PEU, CHAQUE JOUR.', tl, 1.2);
}

// ------------------------------------------------------------------ 3. visite des quatre parcelles
const TOUR = [
  { who: 'ego', beats: 4, tag: 'TOUT EN FAÇADE.' },
  { who: 'obsession', beats: 4, tag: '10 ARROSAGES PAR JOUR.' },
  { who: 'chance', beats: 4, tag: 'ELLE ATTEND LA PLUIE.' },
  { who: 'discipline', beats: 4, tag: 'UNE FOIS PAR JOUR.' },
];
let acc = 0; for (const s of TOUR) { s.t0 = acc * B; s.len = s.beats * B; acc += s.beats; }
function visite(ctx, tl) {
  let k = 0; for (let i = 0; i < TOUR.length; i++) if (tl >= TOUR[i].t0) k = i;
  const sh = TOUR[k], u = tl - sh.t0, pr = u / sh.len, t = S.visite + tl;
  const frames = { ego: { x: 200, y: 785, z: 2.2 }, obsession: { x: 420, y: 785, z: 2.1 }, chance: { x: 665, y: 785, z: 2.2 }, discipline: { x: 930, y: lerp(800, GY + rD(t) * PPM * 0.45, ease.inOut(pr)), z: 1.9 } };
  const f = frames[sh.who];
  ctx.save(); view(ctx, { ...f, z: f.z + 0.12 * pr });
  world(ctx, t);
  if (sh.who === 'ego') {
    const p = { ...POSES.stand, lean: -10, head: -12, armF: [150, 30], armB: [30, 60] };
    drawMember(ctx, 'ego', 265, GY - LEG, p, { scale: SC, t, mouth: 'smirk', face: -1, showLabel: false });
    if (Math.floor(u * 3) % 2 === 0) glow(ctx, 235, GY - LEG - 120, 100, '255,255,255', 0.75);
    if (u > 0.3) bubble(ctx, 'REGARDEZ MES FLEURS !', 250, GY - LEG - 150, u, 0.3, { log, size: 26 });
  } else if (sh.who === 'obsession') {
    const k2 = waterer(ctx, 'obsession', COL.obsession + 10, u, { period: 0.32, mood: 'angry', mouth: 'grit' });
    sweat(ctx, COL.obsession + 10, GY - LEG, POSES.stand, u * 2, { scale: SC });
    if (u > 0.1) bubble(ctx, 'J’ARROSE DIX FOIS !', COL.obsession, GY - LEG - 150, u, 0.1, { log, size: 26 });
    void k2;
  } else if (sh.who === 'chance') {
    drawMember(ctx, 'chance', COL.chance - 12, GY - 52, { ...POSES.sit, lean: -36, head: -26, armF: [20, 30], armB: [10, 30] }, { scale: SC, t, mouth: null, showLabel: false });
    cloud(ctx, 380 + u * 230, 650, 1.3, 0.95); cloud(ctx, 760 - u * 150, 590, 0.9, 0.85);
    if (u > 0.25) bubble(ctx, 'BIENTÔT, LA PLUIE !', COL.chance, GY - 170, u, 0.25, { log, size: 26 });
  } else {
    waterer(ctx, 'discipline', COL.discipline - 40, u, { period: 1.9, mood: 'determined' });
  }
  ctx.restore();
  card(ctx, sh.who, sh.tag, u);
  if (k === 3) tip(ctx, 2, 'LES RACINES AVANT LES FEUILLES.', u, 0.0);
}

// ------------------------------------------------------------------ 4. jour 60 : l'Obsession déterre ses graines pour vérifier
function jour60(ctx, tl) {
  const t = S.jour60 + tl, cam = keys(tl, [[-9, 400, 800, 1.7], [2.0, 820, 850, 1.6]]);
  ctx.save(); view(ctx, cam);
  const dug = ease.out(prog(tl, 0.3, 0.9));
  world(ctx, t, { dug });
  drawMember(ctx, 'ego', 255, GY - LEG, { ...POSES.stand, lean: 6, head: 30, armF: [20, 30], armB: [10, 30] }, { scale: SC, t, mouth: 'sad', mood: 'sad', face: -1, showLabel: false });
  // L'OBSESSION creuse avec les mains, trouve une graine noire, s'effondre
  const ko = ease.out(prog(tl, 0.9, 1.3));
  const sw = Math.sin(tl * 14) * (ko < 0.1 ? 1 : 0);
  drawMember(ctx, 'obsession', COL.obsession + 40, GY - LEG + ko * 50, ko > 0.5 ? POSES.lie : { ...POSES.crouch, lean: 34 + sw * 4, armF: [50, 40], armB: [46, 42] }, { scale: SC, t, spiral: ko > 0.5, mood: 'sad', showLabel: false });
  if (tl > 0.9 && tl < 2.2) { ctx.fillStyle = '#1b1b18'; ctx.beginPath(); ctx.arc(COL.obsession + 4, GY - 10 - 38 * ease.out(prog(tl, 0.5, 0.9)), 7, 0, 7); ctx.fill(); }
  drawMember(ctx, 'chance', COL.chance - 12, GY - 52, { ...POSES.sit, lean: -34, head: 12, armF: [20, 30], armB: [10, 30] }, { scale: SC, t, eyesClosed: true, showLabel: false });
  cloud(ctx, 470 + tl * 20, 640, 1.1, 0.5);
  waterer(ctx, 'discipline', COL.discipline - 40, tl, { period: 1.4, mood: 'determined' });
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['60', RED]]);
  tip(ctx, 3, 'NE DÉTERRE PAS POUR VÉRIFIER.', tl, 1.3);
}

// ------------------------------------------------------------------ 5. la pluie arrive enfin… trop tard pour le pot de la Chance
function pluie(ctx, tl) {
  const t = S.pluie + tl, pk = Math.max(0, tl - 0.55);
  ctx.save(); view(ctx, keys(tl, [[-9, 600, 800, 1.5], [1.2, 660, 830, 1.8]]));
  world(ctx, t, { noPot: true });
  ctx.fillStyle = `rgba(14,18,34,${(0.45 * clamp(tl / 0.5)).toFixed(2)})`; ctx.fillRect(0, 0, W, GY);
  cloud(ctx, 430, 620, 1.7, 1, 0.8); cloud(ctx, 700, 580, 1.5, 1, 0.8);
  // le pot est emporté par un ruisseau
  const px = COL.chance + 95 + pk * pk * 330, py = GY - 4 - Math.abs(Math.sin(pk * 9)) * 10 * clamp(pk * 3);
  pot(ctx, px, py, pk * 1.6);
  ctx.fillStyle = 'rgba(110,170,225,0.55)'; ctx.fillRect(COL.chance - 200, GY - 5, 520, 6 + pk * 6);
  const up = ease.out(prog(tl, 0.2, 0.5));
  const run = prog(tl, 0.9, 1.8);
  drawMember(ctx, 'chance', COL.chance - 12 + run * 130, up > 0.5 ? GY - LEG : GY - 52, up > 0.5 ? { ...POSES.victory, armF: [-150, -10], lean: 4 } : { ...POSES.sit, lean: -34, head: -26 }, { scale: SC, t, mouth: tl > 0.9 ? 'sad' : 'happy', mood: tl > 0.9 ? 'sad' : null, showLabel: false });
  if (tl > 0.2 && tl < 1.9) bubble(ctx, 'ENFIN LA PLUIE !', COL.chance, GY - LEG - 140, tl, 0.2, { log, size: 26 });
  drawMember(ctx, 'ego', 255, GY - LEG, { ...POSES.stand, lean: 6, head: 30, armF: [20, 30], armB: [10, 30] }, { scale: SC, t, mouth: 'sad', mood: 'sad', face: -1, showLabel: false });
  drawMember(ctx, 'obsession', COL.obsession + 40, GY - 40, POSES.lie, { scale: SC, t, spiral: true, showLabel: false });
  drawMember(ctx, 'discipline', COL.discipline - 40, GY - LEG, { ...POSES.stand, head: -10, armF: [-30, 20], armB: [-20, 20] }, { scale: SC, t, mouth: 'happy', mood: 'determined', showLabel: false });
  rain(ctx, tl, { n: 210, angle: 0.3, speed: 2500, ground: GY, a: 0.5 });
  if (tl > 0.55 && tl < 0.7) { ctx.fillStyle = `rgba(210,225,255,${(0.5 * (1 - (tl - 0.55) / 0.15)).toFixed(2)})`; ctx.fillRect(0, 0, W, GY); }
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['90', RED]]);
}

// ------------------------------------------------------------------ 6. jour 180 : la récolte
function recolte(ctx, tl, extra = 0) {
  const T = tl + extra, t = S.recolte + Math.min(T, 4.2);
  const cam = keys(T, [[-9, 930, GY + 230, 1.7], [0.9, 800, 780, 1.3]]);
  const dr = Math.max(0, T - 2.2); cam.z += 0.05 * dr; cam.x += 14 * Math.sin(T * 1.3); cam.y += 12 * dr;
  ctx.save(); view(ctx, cam);
  world(ctx, t);
  drawMember(ctx, 'ego', 255, GY - LEG, { ...POSES.stand, lean: 8 + Math.sin(T * 2.2) * 2, head: 34 }, { scale: SC, t: T, mouth: 'sad', mood: 'sad', face: -1, showLabel: false });
  if (T > 0.5) for (let i = 0; i < 5; i++) { const ph = clamp((T - 0.5 - i * 0.12) / 0.9), x = FXS[i] + Math.sin(T * 4 + i) * 10 * ph, y = GY - FHS[i] + ph * ph * (FHS[i] - 6); if (ph > 0 && ph < 1) flowerHead(ctx, x, y, 14 * (1 - ph * 0.3), FCOL[i], ph * 5, 1); }
  drawMember(ctx, 'obsession', COL.obsession + 60, GY - LEG + 46 * SC, { ...POSES.sit, lean: 6 + Math.sin(T * 2.4) * 2, head: 34 }, { scale: SC, t: T, mouth: 'sad', mood: 'sad', showLabel: false });
  drawMember(ctx, 'chance', COL.chance - 12, GY - LEG, { ...POSES.stand, lean: 6 + Math.sin(T * 2 + 1) * 2, head: 32 }, { scale: SC, t: T, mouth: 'sad', mood: 'sad', showLabel: false });
  const hold = { ...POSES.victory, lean: Math.sin(T * 3) * 2.5, armF: [-170 + Math.sin(T * 5) * 7, -10], armB: [160 + Math.sin(T * 5 + 1) * 7, 20] };
  drawMember(ctx, 'discipline', COL.discipline + 70, GY - LEG, hold, { scale: SC, t: T, mouth: 'happy', showLabel: false });
  if (T > 1.5) { impactRing(ctx, COL.discipline, GY - 80, T, 1.5, { r: 220, color: '#ffd9a0' }); dust(ctx, COL.discipline, GY - 60, T, 1.5, { n: 12, spread: 240, color: '255,225,160' }); }
  ctx.restore();
}
function recolteScene(ctx, tl) { recolte(ctx, tl); title(ctx, tl, [['JOUR ', '#f1f1f1'], ['180', RED]]); }

// ------------------------------------------------------------------ 7. chute
function chute(ctx, tl) {
  recolte(ctx, tl, 6 * B);
  topBand(ctx);
  kinetic(ctx, [['CE QUI POUSSE ', '#f1f1f1'], ['SOUS TERRE', '#9a9a9c']], 410, 62, tl, 0.1);
  kinetic(ctx, [['FINIT PAR ', '#f1f1f1'], ['SE VOIR.', RED]], 510, 84, tl, 0.8, { rise: 60 });
}

// ------------------------------------------------------------------ compteur d'élimination
const ORDER = ['ego', 'obsession', 'chance', 'discipline'];
function tracker(ctx, t) {
  const show = clamp((t - 1.2) / 0.3) * (t < S.boucle ? 1 : 0);
  if (show <= 0) return;
  ctx.save(); ctx.globalAlpha = show; ctx.translate(826, 300); ctx.scale(1.25, 1.25); ctx.translate(-826, -300);
  const y = 300, x0 = 712;
  ctx.fillStyle = 'rgba(8,8,12,0.72)'; ctx.beginPath(); ctx.roundRect(x0 - 40, y - 42, 4 * 74 + 10, 84, 42); ctx.fill();
  ORDER.forEach((who, i) => {
    const c = CAST[who], x = x0 + i * 74, out = OUT[who] !== undefined && t >= OUT[who], k = out ? clamp((t - OUT[who]) / 0.25) : 0;
    const win = who === 'discipline' && t >= S.recolte + 1.7;
    ctx.save(); ctx.translate(x, y);
    if (out) { const sh = (1 - k) * 8; ctx.translate(noise(t * 80, i) * sh, 0); }
    if (win) { const p = 1 + 0.08 * Math.sin(t * 9); ctx.scale(p, p); glow(ctx, 0, 0, 70, '255,215,140', 0.5); }
    ctx.globalAlpha *= out ? 0.45 : 1;
    ctx.fillStyle = out ? '#55555c' : c.color; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(6, -4, 3.5, 0, 7); ctx.arc(16, -4, 3.5, 0, 7); ctx.fill();
    if (who === 'discipline') { ctx.fillStyle = RED; ctx.fillRect(-26, -16, 52, 8); }
    if (who === 'ego') { ctx.fillStyle = out ? '#77777c' : '#e2b53e'; ctx.beginPath(); ctx.moveTo(-16, -22); ctx.lineTo(-16, -34); ctx.lineTo(-6, -26); ctx.lineTo(0, -38); ctx.lineTo(6, -26); ctx.lineTo(16, -34); ctx.lineTo(16, -22); ctx.fill(); }
    if (who === 'chance') { ctx.fillStyle = out ? '#77777c' : '#4fbf6c'; for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(Math.cos(q * 1.57) * 6, -32 + Math.sin(q * 1.57) * 6, 5, 0, 7); ctx.fill(); } }
    if (who === 'obsession') { ctx.strokeStyle = out ? '#77777c' : c.color; ctx.lineWidth = 4; for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(-10 + q * 10, -24); ctx.lineTo(-13 + q * 10, -36); ctx.stroke(); } }
    ctx.globalAlpha = show;
    if (out) { const s2 = 1.8 - 0.8 * ease.out(k); ctx.scale(s2, s2); ctx.strokeStyle = RED; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); ctx.stroke(); }
    ctx.restore();
  });
  ctx.restore();
}

// ------------------------------------------------------------------ 8. boucle : juste avant le coup de vent de l'image 0
function boucle(ctx, tl) {
  ouverture(ctx, tl - BOUCLE);
  const k = pop(tl, 0.15, 0.25) * (1 - clamp((tl - (BOUCLE - 0.55)) / 0.3));
  if (k > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 1480); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
    ctx.font = '900 44px Display'; ctx.letterSpacing = '3px'; const w = ctx.measureText('ABONNE-TOI').width + 90;
    ctx.fillStyle = RED; ctx.beginPath(); ctx.roundRect(-w / 2, -42, w, 84, 42); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ABONNE-TOI', 0, 2); ctx.restore();
    if (k >= 0.5) log('ABONNE-TOI');
  }
}

const SCENES = [[S.ouverture, ouverture], [S.jour1, jour1], [S.visite, visite], [S.jour60, jour60], [S.pluie, pluie], [S.recolte, recolteScene], [S.chute, chute], [S.boucle, boucle]];
const CUTS = [
  { t: S.jour1, type: 'glitch', d: 0.26 },
  { t: S.visite, type: 'whip', dir: 1 },
  { t: S.visite + TOUR[1].t0, type: 'whip', dir: -1 },
  { t: S.visite + TOUR[2].t0, type: 'whip', dir: 1 },
  { t: S.visite + TOUR[3].t0, type: 'zoom', d: 0.3 },
  { t: S.jour60, type: 'glitch', d: 0.26 },
  { t: S.pluie, type: 'whip', dir: -1 },
  { t: S.recolte, type: 'zoom', d: 0.3 },
  { t: S.boucle, type: 'zoom', d: 0.3 },
];
function renderAt(ctx, t) {
  TEXTLOG.frame = [];
  CAM = { x: 540, y: 960, z: 1 };
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
  const [t0, fn] = SCENES[k];
  const since = t - t0, sh = k > 0 && k !== 7 ? 10 * Math.exp(-since * 9) : 0;
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(noise(t * 50, 5) * sh, noise(t * 50, 9) * sh);
  fn(ctx, since);
  ctx.restore();
  tracker(ctx, t);
}
export function draw(ctx, t) {
  if (transition(ctx, t, renderAt, CUTS)) return;
  renderAt(ctx, t);
}
export const samples = (t) => (t < S.jour1 || t >= S.boucle ? 2 : 1);

// Lumière : soleil bas à travers la brume du matin, orage, rayons dorés de la récolte
export const post = cinema((t) => ({ threshold: 0.8, ...look(t) }));
function look(t) {
  const sun = toScreen(SUN[0], SUN[1]);
  if (t >= S.pluie && t < S.recolte) return { bloom: 0.8, fog: { density: 0.5, height: 0.5, color: '#232a3c', speed: 2.2 }, warm: 0.6 };
  if (t >= S.recolte && t < S.boucle) return { bloom: 1.0, threshold: 0.75, rays: { x: sun.x, y: sun.y, strength: 0.9, color: '#ffd9a0', radius: 0.07 }, fog: { density: 0.15, height: 0.4, color: '#4a3a28' }, warm: 1.4 };
  return { bloom: 0.9, rays: { x: sun.x, y: sun.y, strength: 0.55, color: '#ffd9a0', radius: 0.07 }, fog: { density: 0.15, height: 0.35, color: '#3a3020' }, warm: 1.2 };
}

// ------------------------------------------------------------------ son
const strikes = (t0, t1, period, off, sfx, gain) => { const out = []; for (let n = 0; ; n++) { const t = t0 + (n + 0.3) * period - off; if (t >= t1) break; if (t >= t0) out.push({ t, sfx, gain }); } return out; };
const CUT_SFX = CUTS.flatMap((c) => c.type === 'whip' ? [{ t: c.t, sfx: 'whip', gain: 0.55 }] : c.type === 'glitch' ? [{ t: c.t, sfx: 'glitch', gain: 0.4, len: c.d }] : [{ t: c.t, sfx: 'whoosh', gain: 0.45, len: 0.3 }, { t: c.t + 0.1, sfx: 'sub', gain: 0.45 }]);
export const HITS = [
  { t: 0, sfx: 'room', gain: 0.4, len: S.end },
  ...CUT_SFX,
  // ouverture : coup de vent, fleurs arrachées
  { t: 0, sfx: 'whoosh', gain: 0.7, len: 0.7 }, { t: 0, sfx: 'thud', gain: 0.3 }, { t: 0.02, sfx: 'sub', gain: 0.55 }, ...Array.from({ length: 5 }, (_, i) => ({ t: 0.2 + i * 0.13, sfx: 'tick', gain: 0.2 })),
  ...strikes(0, 3.2, 0.5, 0, 'swish', 0.2), { t: 2 * B, sfx: 'pop', gain: 0.3 }, { t: 7 * B - 0.4, sfx: 'riser', gain: 0.3, len: 0.6 },
  // jour 1 : fleurs plantées, arrosages
  ...Array.from({ length: 5 }, (_, i) => ({ t: S.jour1 + 0.2 + i * 0.55, sfx: 'pop', gain: 0.3 })), ...strikes(S.jour1, S.visite, 0.55, 0, 'splash', 0.12), { t: S.jour1 + 1.3, sfx: 'swish', gain: 0.3 }, { t: S.jour1 + 2.0, sfx: 'pop', gain: 0.3 },
  // visite
  ...TOUR.map((s) => ({ t: S.visite + s.t0 + 0.05, sfx: 'pop', gain: 0.22 })),
  ...Array.from({ length: 4 }, (_, i) => ({ t: S.visite + 0.3 + i * 0.5, sfx: 'click', gain: 0.25 })),
  ...strikes(S.visite + TOUR[1].t0, S.visite + TOUR[2].t0, 0.32, 0, 'splash', 0.2),
  { t: S.visite + TOUR[2].t0 + 0.3, sfx: 'boing', gain: 0.25 }, ...Array.from({ length: 3 }, (_, i) => ({ t: S.visite + TOUR[2].t0 + 0.5 + i * 0.6, sfx: 'whoosh', gain: 0.15, len: 0.5 })),
  ...strikes(S.visite + TOUR[3].t0, S.visite + TOUR[3].t0 + TOUR[3].len, 1.9, 0, 'splash', 0.3), ...Array.from({ length: 4 }, (_, i) => ({ t: S.visite + TOUR[3].t0 + 0.4 + i * 0.45, sfx: 'tick', gain: 0.3 })),
  // jour 60 : le cœur bat, graine noire, élimination
  ...Array.from({ length: 4 }, (_, i) => ({ t: S.jour60 + 0.05 + i * 0.7, sfx: 'heart', gain: 0.4 })), { t: S.jour60 + 0.4, sfx: 'thud', gain: 0.3 }, { t: S.jour60 + 0.9, sfx: 'pop', gain: 0.35 },
  { t: OUT.obsession, sfx: 'buzz', gain: 0.5 }, { t: OUT.obsession, sfx: 'thud', gain: 0.35 },
  // pluie
  { t: S.pluie, sfx: 'rain', gain: 0.8, len: 5 * B }, { t: S.pluie + 0.2, sfx: 'whoosh', gain: 0.4, len: 0.6 }, { t: S.pluie + 0.55, sfx: 'sub', gain: 0.55 }, { t: S.pluie + 0.55, sfx: 'impact', gain: 0.25 },
  { t: S.pluie + 0.9, sfx: 'splash', gain: 0.3 }, { t: OUT.chance, sfx: 'buzz', gain: 0.5 },
  // récolte
  { t: S.recolte + 0.4, sfx: 'whoosh', gain: 0.3, len: 0.5 }, { t: OUT.ego, sfx: 'buzz', gain: 0.5 }, ...Array.from({ length: 5 }, (_, i) => ({ t: S.recolte + 0.55 + i * 0.12, sfx: 'tick', gain: 0.25 })),
  { t: S.recolte + 1.5, sfx: 'sub', gain: 0.6 }, { t: S.recolte + 1.5, sfx: 'ding', gain: 0.45 }, ...Array.from({ length: 4 }, (_, i) => ({ t: S.recolte + 1.5 + i * 0.12, sfx: 'pop', gain: 0.22 })), { t: S.recolte + 2.0, sfx: 'cash', gain: 0.3 },
  // chute
  { t: S.chute + 0.1, sfx: 'sub', gain: 0.55 }, { t: S.chute + 0.8, sfx: 'sub', gain: 0.5 }, { t: S.chute + 0.8, sfx: 'ding', gain: 0.3 },
  { t: S.boucle + 0.15, sfx: 'pop', gain: 0.3 },
];
