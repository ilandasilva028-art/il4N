// « 4 mineurs, 1 seul diamant » — film ORIGINAL, série Toi contre toi #8. Coupe de terrain 3D (Blender,
// engine/blender/mine.py → plates/mine/coupe.jpg) ; les puits, échelles, outils et personnages sont animés ici.
// L'EGO creuse pour la photo et abandonne à 30 cm d'un diamant ; L'OBSESSION creuse dix trous peu profonds ;
// LA CHANCE attend le bip du détecteur et trouve… du verre ; DISCIPLINE creuse le même trou, un barreau par jour.
// Rétention : compteur d'élimination, règle de profondeur, boucle parfaite (la fin rejoue l'avant de l'image 0).
import { W, H, timeline, topBand, POSES, COLORS, clamp, prog, ease, pop, lerp, noise, hash, VARIANT, seriesTag, camera, dust, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
import { glow, bubble, rewind, sweat } from '../lib/world.js';
import { shatterBake, drawBaked } from '../lib/anim.js';
import { drawMember, CAST } from '../lib/cast.js';
import { cinema } from '../lib/light.js';
import { transition } from '../lib/trans.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['ouverture', 7], ['jour1', 8], ['visite', 16], ['nuit', 8], ['abandon', 6], ['diamant', 8], ['chute', 6], ['boucle', 3]]);
export const DURATION = S.end;
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #8';
const log = (s) => TEXTLOG.frame.push(s);

export const SCRIPT = {
  premiere: 'raté',
  accroche: VARIANT === 'b' ? ['QUI VA TROUVER', 'LE DIAMANT ?'] : ['4 MINEURS.', '1 SEUL DIAMANT.'],
  structure: ['ouverture', 'conflit', 'effort', 'progression', 'obstacle', 'retournement', 'chute'],
  dialogues: ['REGARDEZ MA PELLE EN OR !', 'JE CREUSE AILLEURS !', 'BIP ! UN DIAMANT !', 'PERSONNE NE REGARDE ?'],
  conseils: ['CREUSE UN SEUL TROU.', 'UN BARREAU PAR JOUR.', 'NE LÂCHE PAS AU MILIEU.'],
  details: ['JOUR 1', 'JOUR 90', 'JOUR 180', 'pelle en or', 'détecteur', 'règle en mètres', 'à 30 cm'],
  chute: ['LE DIAMANT ÉTAIT PROCHE.', 'IL FALLAIT CONTINUER.'],
};

// ------------------------------------------------------------------ plaque Blender (repère logique 1080 × 2880, 1 m = 100 px)
let IMG = null, A = null;
export async function init() {
  A = (await fetch('plates/mine/anchors.json').then((r) => r.json())).coupe;
  IMG = new Image(); IMG.src = 'plates/mine/coupe.jpg'; await IMG.decode();
}
const PH = 2880, GY = 900, PPM = 100;
const COL = { ego: 150, obsession: 410, chance: 670, discipline: 930 };
const LY = (m) => GY + m * PPM;                     // profondeur (m, positive vers le bas) → y logique
let CAM = { x: 540, y: 960, z: 1 };
const toScreen = (x, y) => ({ x: (x - CAM.x) * CAM.z + W / 2, y: (y - CAM.y) * CAM.z + H / 2 });
function view(ctx, { x = 540, y = 960, z = 1 } = {}) {
  const hw = W / (2 * z), hh = H / (2 * z);
  x = clamp(x, hw, W - hw); y = clamp(y, hh, PH - hh);
  CAM = { x, y, z };
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-x, -y);
  ctx.drawImage(IMG, 0, 0, W, PH);
}
const keys = (tl, list) => { // [[t, x, y, z], …] → cadrage interpolé (transitions de 0,6 s)
  let [, x, y, z] = list[0];
  for (let i = 1; i < list.length; i++) { const k = ease.inOut(prog(tl, list[i][0], list[i][0] + 0.6)); x = lerp(x, list[i][1], k); y = lerp(y, list[i][2], k); z = lerp(z, list[i][3], k); }
  return { x, y, z };
};

// ------------------------------------------------------------------ personnages, outils
const SC = (1.9 * PPM) / 424, LEG = 158 * SC;
const D = Math.PI / 180;
function handPos(x, y, pose, sc, face = 1) {
  const lean = pose.lean * D * face, sx = Math.sin(lean) * 112 * 0.9, sy = -Math.cos(lean) * 112 * 0.9;
  const a1 = (pose.armF[0] + pose.lean) * D, a2 = (pose.armF[0] + pose.lean + pose.armF[1]) * D;
  const hx = sx + Math.sin(a1) * 66 * face + Math.sin(a2) * 62 * face, hy = sy + Math.cos(a1) * 66 + Math.cos(a2) * 62;
  return { x: x + hx * sc, y: y + hy * sc, a: a2 };
}
// coup de pioche : phase 0 → 1 (descente rapide puis remontée lente)
const swingK = (ph) => (ph < 0.3 ? ease.in(ph / 0.3) : 1 - ease.inOut((ph - 0.3) / 0.7));
function digPose(k) {
  return { ...POSES.stand, lean: lerp(4, 38, k), head: lerp(-6, 26, k), armF: [lerp(178, 58, k), lerp(8, 18, k)], armB: [lerp(170, 52, k), lerp(8, 22, k)], legB: [lerp(6, 30, k), lerp(-4, -50, k)], legF: [lerp(-6, 20, k), lerp(-4, -40, k)] };
}
function tool(ctx, h, face, kind = 'pioche', sc = SC) {
  const len = 150 * sc, dx = Math.sin(h.a) * face, dy = Math.cos(h.a);
  const ex = h.x + dx * len, ey = h.y + dy * len;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = kind === 'or' ? '#c9962e' : '#6b4a2b'; ctx.lineWidth = 9 * sc / 0.45; ctx.beginPath(); ctx.moveTo(h.x - dx * 20 * sc, h.y - dy * 20 * sc); ctx.lineTo(ex, ey); ctx.stroke();
  if (kind === 'pioche') {
    ctx.strokeStyle = '#b9bcc4'; ctx.lineWidth = 10 * sc / 0.45; ctx.beginPath();
    ctx.moveTo(ex - dy * 55 * sc, ey + dx * 55 * sc * 0.4); ctx.quadraticCurveTo(ex, ey, ex + dy * 55 * sc, ey - dx * 55 * sc * 0.4); ctx.stroke();
  } else {
    ctx.fillStyle = kind === 'or' ? '#f0c24a' : '#9aa0a8'; ctx.save(); ctx.translate(ex, ey); ctx.rotate(-h.a * face);
    ctx.beginPath(); ctx.roundRect(-22 * sc / 0.45, 0, 44 * sc / 0.45, 52 * sc / 0.45, 10); ctx.fill(); ctx.restore();
    if (kind === 'or') glow(ctx, ex, ey, 60, '255,200,90', 0.5);
  }
  ctx.restore();
}
function digger(ctx, who, x, floorY, tl, { period = 0.9, face = 1, kind = 'pioche', mood = 'determined', mouth = 'grit', off = 0 } = {}) {
  const k = swingK(((tl + off) / period) % 1), pose = digPose(k), y = floorY - LEG + k * 14;
  drawMember(ctx, who, x, y, pose, { scale: SC, t: tl, face, mood, mouth, showLabel: false });
  tool(ctx, handPos(x, y, pose, SC, face), face, kind);
  return k;
}

// ------------------------------------------------------------------ puits, échelle, règle, diamants
function shaft(ctx, cx, depth, { w = 1.15, seed = 1, lamp = true } = {}) {
  if (depth <= 0.02) return;
  const x0 = cx - (w * PPM) / 2, x1 = cx + (w * PPM) / 2, y1 = LY(depth);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x0, GY - 4);
  for (let y = GY; y <= y1; y += 18) ctx.lineTo(x0 + noise(y * 0.05, seed) * 7, y);
  ctx.lineTo(x0 + 6, y1); ctx.quadraticCurveTo(cx, y1 + 10, x1 - 6, y1);
  for (let y = y1; y >= GY; y -= 18) ctx.lineTo(x1 + noise(y * 0.05, seed + 7) * 7, y);
  ctx.lineTo(x1, GY - 4); ctx.closePath();
  const g = ctx.createLinearGradient(0, GY, 0, y1 + 10); g.addColorStop(0, '#1b130d'); g.addColorStop(1, '#070504');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,140,0.10)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  // tas de terre à côté du trou
  const pile = Math.min(1, depth / 4) * 50 + 10;
  ctx.fillStyle = '#3a2615'; ctx.beginPath(); ctx.ellipse(x1 + 34, GY - 2, 44 + pile * 0.4, pile * 0.55, 0, Math.PI, 0); ctx.fill();
  if (lamp && depth > 1.2) { glow(ctx, cx, y1 - 70, 110, '255,180,90', 0.55); ctx.fillStyle = '#ffd38a'; ctx.beginPath(); ctx.arc(cx - (w * PPM) / 2 + 14, y1 - 70, 6, 0, 7); ctx.fill(); }
}
function ladder(ctx, cx, depth, rungs) {
  const y1 = LY(depth), top = GY - 50;
  ctx.save(); ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 26, top); ctx.lineTo(cx - 26, y1); ctx.moveTo(cx + 26, top); ctx.lineTo(cx + 26, y1); ctx.stroke();
  ctx.lineWidth = 6;
  for (let i = 0; i < rungs; i++) { const y = top + 30 + i * 36; if (y > y1 - 10) break; ctx.beginPath(); ctx.moveTo(cx - 26, y); ctx.lineTo(cx + 26, y); ctx.stroke(); }
  ctx.restore();
}
function ruler(ctx) {
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.font = '800 22px Display'; ctx.textAlign = 'right';
  ctx.beginPath(); ctx.moveTo(1062, GY); ctx.lineTo(1062, LY(12)); ctx.stroke();
  for (let m = 1; m <= 12; m++) { ctx.beginPath(); ctx.moveTo(1048, LY(m)); ctx.lineTo(1062, LY(m)); ctx.stroke(); if (m % 2 === 0) ctx.fillText(`−${m} m`, 1044, LY(m) + 8); }
  ctx.restore();
}
function gem(ctx, x, y, s, { glass = false, shine = 0, t = 0 } = {}) {
  ctx.save(); ctx.translate(x, y);
  const top = -s * 0.55, bot = s * 0.9;
  ctx.fillStyle = glass ? 'rgba(200,240,255,0.75)' : 'rgba(210,245,255,0.95)';
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(s, 0); ctx.lineTo(0, bot); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(s * 0.35, 0); ctx.lineTo(0, s * 0.2); ctx.lineTo(-s * 0.35, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (shine > 0) { glow(ctx, x, y, s * 6 * shine, '170,230,255', 0.6 * shine); const r = s * (1.6 + 0.4 * Math.sin(t * 9)); ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${(0.8 * shine).toFixed(2)})`; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6); ctx.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6); ctx.stroke(); } ctx.restore(); }
}

// ------------------------------------------------------------------ état du chantier dans le temps (profondeurs en m)
const S_ = S;
const depthOf = {
  ego: (t) => t < S_.visite ? 0.15 + 0.35 * prog(t, S_.jour1, S_.visite) : t < S_.nuit ? 0.9 : Math.min(4.0, 0.9 + 3.1 * prog(t, S_.nuit, S_.abandon)),
  discipline: (t) => t < S_.visite ? 0.65 * prog(t, S_.jour1, S_.visite) : t < S_.nuit ? 0.65 + 2.6 * prog(t, S_.visite, S_.nuit) : t < S_.diamant ? 3.25 + 5.6 * prog(t, S_.nuit, S_.diamant) : Math.min(10.95, 8.85 + 2.1 * prog(t, S_.diamant + 0.2, S_.diamant + 1.6)),
  chance: (t) => t < S_.visite ? 0 : 1.15,
};
const OBS_HOLES = [[300, 0.35], [345, 0.6], [395, 0.45], [445, 0.7], [495, 0.4], [540, 0.3]];
function world(ctx, t, { focus = null } = {}) {
  ruler(ctx);
  // L'EGO
  shaft(ctx, COL.ego, depthOf.ego(t), { seed: 3, lamp: false });
  // L'OBSESSION : plein de petits trous
  const nObs = t < S_.jour1 ? 6 : Math.min(6, 1 + Math.floor((t - S_.jour1) * 1.6));
  OBS_HOLES.slice(0, nObs).forEach(([x, d], i) => shaft(ctx, x, d, { w: 0.42, seed: 10 + i, lamp: false }));
  // LA CHANCE : un trou au « bip »
  shaft(ctx, COL.chance, depthOf.chance(t), { w: 0.9, seed: 5, lamp: false });
  // DISCIPLINE : un seul puits, une échelle qui grandit
  const dd = depthOf.discipline(t);
  shaft(ctx, COL.discipline, dd, { seed: 8 });
  ladder(ctx, COL.discipline, dd, 1 + Math.floor((dd * PPM) / 36));
  void focus;
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

// ------------------------------------------------------------------ 1. ouverture : le « diamant » de la Chance éclate (image 0)
const HOOK = VARIANT === 'b' ? [[['QUI VA TROUVER', '#f1f1f1']], [['LE ', '#f1f1f1'], ['DIAMANT ?', RED]]] : [[['4 MINEURS.', '#f1f1f1']], [['1 SEUL ', '#f1f1f1'], ['DIAMANT.', RED]]];
let GLASS = null;
const glassBake = () => GLASS || (GLASS = shatterBake({ x: COL.chance + 40, y: LY(1.15) - LEG - 90, n: 16, w: 16, h: 12, power: 12, colors: ['#d8f4ff', '#a8e4ff', '#ffffff'], seed: 5, ground: LY(1.15), duration: 4 }));
function chanceHold(ctx, t, tl, broke) {
  const fy = LY(1.15), y = fy - LEG;
  const pose = broke ? { ...POSES.stand, lean: -10, head: 8, armF: [130, 40], armB: [110, 50] } : { ...POSES.victory, armF: [-170, -10] };
  drawMember(ctx, 'chance', COL.chance - 20, y, pose, { scale: SC, t, mouth: broke ? 'sad' : 'happy', mood: broke ? 'sad' : null, showLabel: false });
  if (!broke) { gem(ctx, COL.chance + 40, y - 90, 22, { glass: true, shine: 0.7, t }); }
}
function ouverture(ctx, tl) {
  const cam = keys(tl, [[-9, 670, 860, 2.1], [0.6, 640, 900, 1.75], [2.2, 700, 1000, 1.45]]);
  const quake = tl > 0 && tl < 0.5 ? 16 * Math.exp(-tl * 7) : 0;
  ctx.save(); ctx.translate(noise(tl * 70, 3) * quake, noise(tl * 70, 8) * quake);
  view(ctx, cam);
  const t = S.chute; // chantier « avancé » pour l'ouverture : tous les puits sont visibles
  world(ctx, S.nuit + 0.1);
  hammock(ctx);
  const broke = tl >= 0;
  chanceHold(ctx, t + tl, tl, broke);
  if (broke) {
    drawBaked(ctx, glassBake().at(tl));
    impactRing(ctx, COL.chance + 40, LY(1.15) - LEG - 90, tl, 0, { r: 160, color: '#cfefff' });
    if (tl < 0.12) glow(ctx, COL.chance + 40, LY(1.15) - LEG - 90, 260, '220,245,255', 0.9 * (1 - tl / 0.12));
  }
  ctx.restore();
  const rw = prog(tl, 7 * B - 0.5, 7 * B);
  if (rw > 0) rewind(ctx, tl * 8, rw);
  seriesTag(ctx, SERIES, pop(tl, 1.0));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 92, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 505, 96, tl, 2 * B, { stagger: 0.1, rise: 60 });
}
function hammock(ctx) {
  ctx.strokeStyle = '#6a5a40'; ctx.lineWidth = 7;
  for (const x of [COL.chance + 120, COL.chance + 250]) { ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, GY - 110); ctx.stroke(); }
}

// ------------------------------------------------------------------ 2. jour 1 : chacun commence (travelling)
function jour1(ctx, tl) {
  const pan = ease.inOut(prog(tl, 0.2, 3.6));
  ctx.save(); view(ctx, { x: lerp(210, 880, pan), y: 860, z: 1.7 });
  const t = S.jour1 + tl;
  world(ctx, t);
  // L'EGO : pelle en or, il pose plus qu'il ne creuse
  const ep = { ...POSES.stand, lean: -8, head: -10, armF: [150, 30], armB: [-20, 40] };
  drawMember(ctx, 'ego', COL.ego - 40, GY - LEG, ep, { scale: SC, t, mouth: 'smirk', showLabel: true });
  tool(ctx, { x: COL.ego + 10, y: GY - 60, a: Math.PI * 0.95 }, 1, 'or');
  if (Math.floor(tl * 2.4) % 3 === 0) glow(ctx, COL.ego, GY - LEG - 120, 70, '255,255,255', 0.7);
  // L'OBSESSION : creuse un trou, puis un autre, puis un autre…
  const hop = Math.floor(tl * 1.6) % 6, ox = OBS_HOLES[hop][0];
  digger(ctx, 'obsession', ox - 34, GY, tl, { period: 0.38, mood: 'angry' });
  // LA CHANCE : détecteur de métaux, elle attend le bip
  const sweep = Math.sin(tl * 2.2);
  const cp = { ...POSES.stand, lean: 12, head: 24, armF: [70 + sweep * 10, 30], armB: [60, 40] };
  drawMember(ctx, 'chance', COL.chance - 40, GY - LEG, cp, { scale: SC, t, mouth: null, showLabel: true });
  const h = handPos(COL.chance - 40, GY - LEG, cp, SC); ctx.strokeStyle = '#aaa'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(COL.chance + 40 + sweep * 30, GY - 10); ctx.stroke();
  ctx.fillStyle = '#cfd3da'; ctx.beginPath(); ctx.ellipse(COL.chance + 40 + sweep * 30, GY - 8, 22, 7, 0, 0, 7); ctx.fill();
  hammock(ctx);
  // DISCIPLINE : premier trou, premier barreau
  digger(ctx, 'discipline', COL.discipline - 10, LY(depthOf.discipline(t)), tl, { period: 0.95 });
  if (tl > 0.4) bubble(ctx, 'REGARDEZ MA PELLE EN OR !', COL.ego + 30, GY - LEG - 150, tl, 0.4, { log, size: 28 });
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['1', RED]]);
  tip(ctx, 1, 'CREUSE UN SEUL TROU.', tl, 2.0);
}

// ------------------------------------------------------------------ 3. visite des quatre chantiers
const TOUR = [
  { who: 'ego', beats: 4, tag: 'IL CREUSE POUR LA PHOTO.' },
  { who: 'obsession', beats: 4, tag: '10 TROUS, AUCUN PROFOND.' },
  { who: 'chance', beats: 4, tag: 'ELLE ATTEND LE BIP.' },
  { who: 'discipline', beats: 4, tag: 'TOUJOURS LE MÊME TROU.' },
];
let acc = 0; for (const s of TOUR) { s.t0 = acc * B; s.len = s.beats * B; acc += s.beats; }
function visite(ctx, tl) {
  let k = 0; for (let i = 0; i < TOUR.length; i++) if (tl >= TOUR[i].t0) k = i;
  const sh = TOUR[k], u = tl - sh.t0, pr = u / sh.len, t = S.visite + tl;
  const dd = depthOf.discipline(t);
  const frames = { ego: { x: 190, y: 900, z: 2.3 }, obsession: { x: 420, y: 790, z: 2.2 }, chance: { x: 660, y: 840, z: 2.3 }, discipline: { x: 900, y: lerp(980, LY(dd) - 120, pr), z: 2.0 } };
  const f = frames[sh.who];
  ctx.save(); view(ctx, { ...f, z: f.z + 0.12 * pr });
  world(ctx, t);
  if (sh.who === 'ego') {
    // assis dans son trou de 90 cm, selfie avec la pelle en or
    const p = { ...POSES.sit, lean: -14, head: -12, armF: [150, 30], armB: [40, 70] };
    drawMember(ctx, 'ego', COL.ego - 10, LY(0.9) - 52, p, { scale: SC, t, mouth: 'smirk', showLabel: false });
    tool(ctx, { x: COL.ego + 40, y: LY(0.9) - 30, a: Math.PI * 0.9 }, 1, 'or');
    if (Math.floor(u * 3) % 2 === 0) glow(ctx, COL.ego + 20, LY(0.9) - 170, 90, '255,255,255', 0.75);
  } else if (sh.who === 'obsession') {
    const hop = Math.floor(u * 2.2) % 6, ox = OBS_HOLES[hop][0];
    digger(ctx, 'obsession', ox - 34, GY, u, { period: 0.32, mood: 'angry' });
    sweat(ctx, ox - 34, GY - LEG, POSES.stand, u * 2, { scale: SC });
    if (u > 0.1) bubble(ctx, 'JE CREUSE AILLEURS !', ox, GY - LEG - 95, u, 0.1, { log, size: 28 });
  } else if (sh.who === 'chance') {
    const beep = u > 0.25, found = u > 0.75;
    if (!found) {
      const cp = { ...POSES.stand, lean: 14, head: 26, armF: [70, 30], armB: [60, 40] };
      drawMember(ctx, 'chance', COL.chance - 50, LY(1.15) - LEG, cp, { scale: SC, t, mouth: beep ? 'happy' : null, showLabel: false });
      if (beep && Math.floor(u * 10) % 2 === 0) glow(ctx, COL.chance + 30, LY(1.15) - 10, 60, '120,255,160', 0.8);
    } else chanceHold(ctx, t, u, false);
    if (u > 0.3) bubble(ctx, 'BIP ! UN DIAMANT !', COL.chance, LY(1.15) - LEG - 120, u, 0.3, { log, size: 28 });
  } else {
    digger(ctx, 'discipline', COL.discipline - 10, LY(dd), u, { period: 0.9 });
  }
  ctx.restore();
  card(ctx, sh.who, sh.tag, u);
  if (k === 3) tip(ctx, 2, 'UN BARREAU PAR JOUR.', u, 0.2);
}

// ------------------------------------------------------------------ 4. jour 90 : la roche dure, deux abandons
const OUT = { obsession: S.nuit + 0.5, chance: S.nuit + 1.5, ego: S.abandon + 1.7 };
function nuit(ctx, tl) {
  const t = S.nuit + tl;
  const cam = keys(tl, [[-9, 560, 1180, 1.3], [2.2, 820, 1560, 1.45]]);
  ctx.save(); view(ctx, cam);
  world(ctx, t);
  // l'Obsession s'effondre d'épuisement à côté de ses petits trous
  const ko = ease.out(prog(tl, 0.4, 0.8));
  drawMember(ctx, 'obsession', 470, GY - LEG + ko * 60, ko > 0.5 ? POSES.lie : digPose(0.6), { scale: SC, t, spiral: ko > 0.5, mood: 'sad', showLabel: false });
  // la Chance : son diamant… éclate. C'était du verre.
  const br = tl >= 1.4;
  chanceHold(ctx, t, tl, br);
  if (br) drawBaked(ctx, glassBake().at(tl - 1.4));
  // l'Ego creuse, lentement
  digger(ctx, 'ego', COL.ego - 10, LY(depthOf.ego(t)), tl, { period: 1.3, kind: 'or', mouth: 'sad', mood: null });
  // Discipline frappe la roche : étincelles
  const dd = depthOf.discipline(t);
  const kd = digger(ctx, 'discipline', COL.discipline - 10, LY(dd), tl, { period: 0.85 });
  if (kd > 0.92) { for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (hash(i + Math.floor(t * 9)) - 0.5) * 2.2; ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(COL.discipline + 30 + Math.cos(a) * 30 * hash(i + 3), LY(dd) - 6 + Math.sin(a) * 30 * hash(i + 5), 3.5, 0, 7); ctx.fill(); } glow(ctx, COL.discipline + 30, LY(dd) - 6, 60, '255,200,120', 0.7); }
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['90', RED]]);
  tip(ctx, 3, 'NE LÂCHE PAS AU MILIEU.', tl, 1.9);
}

// ------------------------------------------------------------------ 5. l'Ego abandonne… à 30 cm du diamant
function abandon(ctx, tl) {
  const t = S.abandon + tl, d = 4.0;
  const cam = keys(tl, [[-9, 230, LY(d) - 160, 2.0], [1.9, 230, LY(d) + 10, 2.3]]);
  ctx.save(); view(ctx, cam);
  world(ctx, t);
  const dg = A.diamonds.ego;
  gem(ctx, dg[0], dg[1], 24, { shine: 0.35 + 0.65 * prog(tl, 1.9, 2.3), t });
  // il s'arrête, regarde autour, puis remonte à la corde
  ctx.strokeStyle = '#c8b48a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(COL.ego + 40, GY - 40); ctx.lineTo(COL.ego + 40, LY(d)); ctx.stroke();
  const up = ease.inOut(prog(tl, 1.2, 2.4));
  const y = lerp(LY(d) - LEG, GY - LEG - 30, up);
  const pose = up > 0 ? { ...POSES.hang, armF: [-172 + Math.sin(tl * 12) * 10, -6] } : { ...POSES.stand, head: tl > 0.3 ? 30 : -10, armF: [20, 20] };
  drawMember(ctx, 'ego', COL.ego + 18, y, pose, { scale: SC, t, mouth: 'sad', mood: 'sad', showLabel: false });
  if (up <= 0) tool(ctx, { x: COL.ego - 30, y: LY(d) - 20, a: Math.PI * 0.85 }, 1, 'or');
  if (tl > 0.15 && tl < 1.9) bubble(ctx, 'PERSONNE NE REGARDE ?', COL.ego + 60, LY(d) - LEG - 160, tl, 0.15, { log, size: 28 });
  // la révélation : 30 cm
  if (tl > 1.95) {
    const k = pop(tl, 1.95, 0.25), ya = LY(d), yb = dg[1] - 20;
    ctx.save(); ctx.globalAlpha = clamp(k); ctx.strokeStyle = RED; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(dg[0] + 60, ya); ctx.lineTo(dg[0] + 60, yb); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  ctx.restore();
  if (tl > 1.95) { const k = pop(tl, 1.95, 0.25); ctx.save(); ctx.globalAlpha = clamp(k); topBand(ctx); ctx.restore(); kinetic(ctx, [['À ', '#f1f1f1'], ['30 CM.', RED]], 470, 110, tl, 1.95, { stagger: 0.08, rise: 40 }); }
}

// ------------------------------------------------------------------ 6. jour 180 : le diamant
function diamant(ctx, tl, extra = 0) {
  const T = tl + extra, t = S.diamant + Math.min(T, 4), dd = depthOf.discipline(S.diamant + Math.min(T, 1.6));
  const hit = 1.6, reveal = ease.out(prog(T, hit, hit + 0.8));
  const cam = keys(T, [[-9, 900, LY(dd) - 100, 2.0], [hit + 0.5, 760, LY(9), 1.25]]);
  ctx.save(); view(ctx, cam);
  world(ctx, t);
  const dg = A.diamonds.discipline;
  gem(ctx, dg[0], dg[1], 32, { shine: reveal, t: T });
  if (T > hit) { impactRing(ctx, dg[0], dg[1], T, hit, { r: 240, color: '#cff4ff' }); dust(ctx, dg[0], dg[1], T, hit, { n: 14, spread: 260, color: '200,235,255' }); }
  if (T < hit + 0.3) digger(ctx, 'discipline', COL.discipline - 10, LY(dd), T, { period: 0.8 });
  else {
    const hold = { ...POSES.victory, armF: [-170, -10] };
    drawMember(ctx, 'discipline', COL.discipline - 20, LY(dd) - LEG, hold, { scale: SC, t: T, mouth: 'happy', showLabel: false });
  }
  // les trois autres, à la surface, regardent dans le puits
  [['ego', 790, 'sad'], ['chance', 700, 'sad'], ['obsession', 620, 'sad']].forEach(([who, x, m], i) => {
    const k = ease.out(prog(T, hit + 0.6 + i * 0.15, hit + 1.0 + i * 0.15));
    if (k > 0) drawMember(ctx, who, x, GY - LEG, { ...POSES.stand, lean: 20, head: 40 }, { scale: SC, t: T, mouth: m, alpha: k, showLabel: false });
  });
  ctx.restore();
}
function diamantScene(ctx, tl) { diamant(ctx, tl); title(ctx, tl, [['JOUR ', '#f1f1f1'], ['180', RED]]); }

// ------------------------------------------------------------------ 7. chute
function chute(ctx, tl) {
  diamant(ctx, tl, 8 * B);
  topBand(ctx);
  kinetic(ctx, [['LE DIAMANT ', '#f1f1f1'], ['ÉTAIT PROCHE.', '#9a9a9c']], 410, 64, tl, 0.1);
  kinetic(ctx, [['IL FALLAIT ', '#f1f1f1'], ['CONTINUER.', RED]], 510, 80, tl, 0.8, { rise: 60 });
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
    const win = who === 'discipline' && t >= S.diamant + 1.7;
    ctx.save(); ctx.translate(x, y);
    if (out) { const sh = (1 - k) * 8; ctx.translate(noise(t * 80, i) * sh, 0); }
    if (win) { const p = 1 + 0.08 * Math.sin(t * 9); ctx.scale(p, p); glow(ctx, 0, 0, 70, '170,230,255', 0.5); }
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

// ------------------------------------------------------------------ 8. boucle : juste avant l'image 0 (la Chance brandit son « diamant »)
const BOUCLE = 3 * B;
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

const SCENES = [[S.ouverture, ouverture], [S.jour1, jour1], [S.visite, visite], [S.nuit, nuit], [S.abandon, abandon], [S.diamant, diamantScene], [S.chute, chute], [S.boucle, boucle]];
const CUTS = [
  { t: S.jour1, type: 'glitch', d: 0.26 },
  { t: S.visite, type: 'whip', dir: 1 },
  { t: S.visite + TOUR[1].t0, type: 'whip', dir: -1 },
  { t: S.visite + TOUR[2].t0, type: 'whip', dir: 1 },
  { t: S.visite + TOUR[3].t0, type: 'zoom', d: 0.3 },
  { t: S.nuit, type: 'glitch', d: 0.26 },
  { t: S.abandon, type: 'whip', dir: -1 },
  { t: S.diamant, type: 'zoom', d: 0.3 },
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

// Lumière : soleil couchant, lanternes, éclat du diamant
export const post = cinema((t) => ({ threshold: 0.8, ...look(t) }));
function look(t) {
  if (t >= S.diamant && t < S.boucle) {
    const dg = A ? toScreen(...A.diamonds.discipline) : { x: 900, y: 1000 }, k = clamp((t - S.diamant - 1.6) / 0.8);
    return { bloom: 0.9 + 0.5 * k, threshold: 0.75, rays: { x: dg.x, y: dg.y, strength: 0.2 + 1.0 * k, color: '#bfeaff', radius: 0.05 }, fog: { density: 0.25, height: 0.4, color: '#141820' }, warm: 0.8 };
  }
  if (t >= S.abandon && t < S.diamant) { const dg = A ? toScreen(...A.diamonds.ego) : { x: 200, y: 1000 }; return { bloom: 1.0, rays: { x: dg.x, y: dg.y, strength: 0.5, color: '#bfeaff', radius: 0.04 }, fog: { density: 0.2, height: 0.35, color: '#141820' } }; }
  const sun = toScreen(1000, 700);
  return { bloom: 0.9, rays: { x: sun.x, y: sun.y, strength: 0.5, color: '#ffb070', radius: 0.08 }, fog: { density: 0.2, height: 0.3, color: '#2a2030' }, warm: 1.2 };
}

// ------------------------------------------------------------------ son
const strikes = (t0, t1, period, off, sfx, gain) => { const out = []; for (let n = 0; ; n++) { const t = t0 + (n + 0.3) * period - off; if (t >= t1) break; if (t >= t0) out.push({ t, sfx, gain }); } return out; };
const CUT_SFX = CUTS.flatMap((c) => c.type === 'whip' ? [{ t: c.t, sfx: 'whip', gain: 0.55 }] : c.type === 'glitch' ? [{ t: c.t, sfx: 'glitch', gain: 0.4, len: c.d }] : [{ t: c.t, sfx: 'whoosh', gain: 0.45, len: 0.3 }, { t: c.t + 0.1, sfx: 'sub', gain: 0.45 }]);
export const HITS = [
  { t: 0, sfx: 'room', gain: 0.4, len: S.end },
  ...CUT_SFX,
  // ouverture : le verre éclate
  { t: 0, sfx: 'shatter', gain: 0.6 }, { t: 0, sfx: 'sub', gain: 0.8 }, { t: 0.02, sfx: 'impact', gain: 0.3 }, ...Array.from({ length: 5 }, (_, i) => ({ t: 0.25 + i * 0.12, sfx: 'tick', gain: 0.18 })),
  { t: 2 * B, sfx: 'pop', gain: 0.3 }, { t: 7 * B - 0.4, sfx: 'riser', gain: 0.3, len: 0.6 },
  // jour 1 : pioches
  ...strikes(S.jour1, S.visite, 0.38, 0, 'thud', 0.18), ...strikes(S.jour1, S.visite, 0.95, 0, 'thud', 0.32),
  { t: S.jour1 + 0.4, sfx: 'pop', gain: 0.3 }, { t: S.jour1 + 2.0, sfx: 'pop', gain: 0.3 }, ...Array.from({ length: 4 }, (_, i) => ({ t: S.jour1 + 0.8 + i * 0.7, sfx: 'click', gain: 0.2 })),
  // visite
  ...TOUR.map((s) => ({ t: S.visite + s.t0 + 0.05, sfx: 'pop', gain: 0.22 })),
  ...Array.from({ length: 5 }, (_, i) => ({ t: S.visite + 0.3 + i * 0.33, sfx: 'click', gain: 0.25 })),
  ...strikes(S.visite + TOUR[1].t0, S.visite + TOUR[2].t0, 0.32, 0, 'thud', 0.25),
  ...Array.from({ length: 6 }, (_, i) => ({ t: S.visite + TOUR[2].t0 + 0.25 + i * 0.09, sfx: 'notif', gain: 0.12, len: 1.4 })), { t: S.visite + TOUR[2].t0 + 0.75, sfx: 'ding', gain: 0.35 },
  ...strikes(S.visite + TOUR[3].t0, S.visite + TOUR[3].t0 + TOUR[3].len, 0.9, 0, 'thud', 0.4),
  // jour 90 : roche, cœur, deux éliminations
  ...strikes(S.nuit, S.abandon, 0.85, 0, 'impact', 0.22), ...strikes(S.nuit, S.abandon, 0.85, 0, 'tick', 0.35),
  ...Array.from({ length: 4 }, (_, i) => ({ t: S.nuit + 0.05 + i * 0.85, sfx: 'heart', gain: 0.4 })),
  { t: OUT.obsession, sfx: 'buzz', gain: 0.5 }, { t: OUT.obsession, sfx: 'thud', gain: 0.35 },
  { t: S.nuit + 1.4, sfx: 'shatter', gain: 0.55 }, { t: OUT.chance, sfx: 'buzz', gain: 0.5 },
  // abandon : à 30 cm
  { t: S.abandon + 0.15, sfx: 'pop', gain: 0.25 }, { t: S.abandon + 1.2, sfx: 'swish', gain: 0.3 }, { t: OUT.ego, sfx: 'buzz', gain: 0.5 },
  { t: S.abandon + 1.95, sfx: 'sub', gain: 0.6 }, { t: S.abandon + 1.95, sfx: 'impact', gain: 0.3 },
  // jour 180 : le diamant
  ...strikes(S.diamant, S.diamant + 1.6, 0.8, 0, 'impact', 0.25), { t: S.diamant + 1.6, sfx: 'riser', gain: 0.4, len: 0.8 },
  { t: S.diamant + 1.6, sfx: 'shatter', gain: 0.4 }, { t: S.diamant + 1.65, sfx: 'sub', gain: 0.75 }, { t: S.diamant + 1.7, sfx: 'ding', gain: 0.5 }, { t: S.diamant + 2.1, sfx: 'cash', gain: 0.35 },
  // chute
  { t: S.chute + 0.1, sfx: 'sub', gain: 0.55 }, { t: S.chute + 0.8, sfx: 'sub', gain: 0.5 }, { t: S.chute + 0.8, sfx: 'ding', gain: 0.3 },
  { t: S.boucle + 0.15, sfx: 'pop', gain: 0.3 },
];
