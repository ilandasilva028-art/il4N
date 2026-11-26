// « 4 tirelires, 10 € par jour » — film ORIGINAL, série Toi contre toi #10. Les quatre traits de caractère ont chacun
// une tirelire. L'EGO dépense pour l'image, L'OBSESSION cumule trois jobs et s'épuise, LA CHANCE joue au loto,
// DISCIPLINE met 10 € de côté chaque jour : 180 jours × 10 € = 1 800 € (simple arithmétique, sans intérêts).
// Décors : plaques 3D Blender du bureau (player/plates/business/) ; tirelires, pièces, billets de loto : canvas.
// Rétention : compteur d'élimination, transitions, boucle parfaite (la fin rejoue l'instant avant l'image 0).
// Mode propre (?v=clean) + fiche MONTAGE : montage final avec Remotion (factory/remotion/).
import { W, H, timeline, topBand, POSES, COLORS, clamp, prog, ease, pop, lerp, noise, hash, VARIANT, seriesTag, camera, dust, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
import { glow, bubble, rewind, sweat } from '../lib/world.js';
import { drawMember, CAST } from '../lib/cast.js';
import { cinema } from '../lib/light.js';
import { transition } from '../lib/trans.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['ouverture', 7], ['jour1', 8], ['visite', 16], ['nuit', 7], ['aube', 7], ['chute', 6], ['boucle', 3]]);
export const DURATION = S.end;
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #10';
const log = (s) => TEXTLOG.frame.push(s);
const CLEAN = VARIANT === 'clean'; // image seule pour le montage Remotion

export const SCRIPT = {
  premiere: 'raté',
  accroche: VARIANT === 'b' ? ['QUI VA AVOIR', '1 800 € ?'] : ['10 € PAR JOUR.', '4 TIRELIRES.'],
  structure: ['ouverture', 'conflit', 'effort', 'progression', 'obstacle', 'retournement', 'chute'],
  dialogues: ['C’EST UN INVESTISSEMENT !', 'ENCORE UN JOB !', 'CETTE FOIS, C’EST BON !', '10 €, COMME HIER.'],
  conseils: ['MET DE CÔTÉ, CHAQUE JOUR.', 'AUTOMATISE LE VIREMENT.', 'ÉVITE LES ACHATS D’IMAGE.'],
  details: ['JOUR 1', 'JOUR 90', 'JOUR 180', '10 € par jour', '1 800 €', 'ticket de loto', '3 jobs', 'carte refusée'],
  chute: ['TOUT SE JOUE', 'PIÈCE PAR PIÈCE.'],
};

// ------------------------------------------------------------------ plaques Blender
const PLATES = ['large_nuit', 'ego', 'obsession', 'chance', 'discipline', 'large_aube'];
const IMG = {}; let A = {};
export async function init() {
  A = await fetch('plates/business/anchors.json').then((r) => r.json());
  await Promise.all(PLATES.map(async (n) => { const im = new Image(); im.src = `plates/business/${n}.jpg`; await im.decode(); IMG[n] = im; }));
}
let CAM = { x: 540, y: 960, z: 1 };
const toScreen = (x, y) => ({ x: (x - CAM.x) * CAM.z + CAM.x, y: (y - CAM.y) * CAM.z + CAM.y });
function plate(ctx, name, { z = 1, x = 540, y = 960 } = {}) {
  const half = W / (2 * z), halfH = H / (2 * z);
  x = clamp(x, half, W - half); y = clamp(y, halfH, H - halfH);
  CAM = { x, y, z }; camera(ctx, { zoom: z, x, y });
  ctx.drawImage(IMG[name], 0, 0, W, H);
  return A[name];
}
const scOf = (a) => (1.9 * a.ego.ppm) / 424;
const interp = (pts, t) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])); return pts[pts.length - 1][1]; };

// ------------------------------------------------------------------ poses
const typing = (t, speed = 9, lean = 10) => ({ ...POSES.sit, lean, head: 14, armB: [72 + Math.sin(t * speed) * 7, 62], armF: [80 + Math.cos(t * speed * 1.1) * 7, 56] });
const selfie = { ...POSES.sit, lean: -10, head: -12, armF: [150, 30], armB: [40, 70] };
const slump = { ...POSES.sit, lean: 62, head: 50, armB: [95, 10], armF: [100, 6] };
const lounge = { ...POSES.sit, lean: -34, head: 6, armB: [20, 30], armF: [40, 60] };
function member(ctx, a, who, pose, opt = {}) { const s = a[who].seat; return drawMember(ctx, who, s[0], s[1], pose, { scale: scOf(a), showLabel: false, ...opt }); }
const headTop = (a, who) => [a[who].seat[0], a[who].seat[1] - scOf(a) * 330];

// ------------------------------------------------------------------ évolution de l'épargne
const OUT = { obsession: S.nuit + 0.4, chance: S.nuit + 1.1, ego: S.aube + 0.6 };
const BREAK = S.aube + 2.7; // Discipline casse sa tirelire
const fillD = (t) => interp([[0, 0], [S.jour1, 0.04], [S.visite, 0.18], [S.nuit, 0.42], [S.aube, 0.66], [BREAK, 1], [S.end, 1]], t);
const SAVED = (t) => Math.min(1800, Math.round(interp([[S.jour1, 0], [S.visite, 300], [S.nuit, 900], [S.aube, 1300], [BREAK, 1800]], t) / 10) * 10);

// ------------------------------------------------------------------ accessoires : tirelire, pièce, billet de loto
function coin(ctx, x, y, r, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.abs(Math.cos(rot)) * 0.9 + 0.1, 1);
  ctx.fillStyle = '#e8b73a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#a97a14'; ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.18, 0, 7); ctx.fill();
  ctx.restore();
}
function piggy(ctx, x, y, s, { fill = 0, gold = false, crack = 0, shake = 0, t = 0, face = 1 } = {}) {
  ctx.save(); ctx.translate(x + Math.sin(t * 70) * shake, y); ctx.scale(s * face, s);
  const body = gold ? '#e9c75a' : '#ff9eb8', dark = gold ? '#b8902a' : '#e0708f';
  ctx.fillStyle = dark; for (const dx of [-36, 18]) ctx.fillRect(dx, -18, 16, 20);
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -48, 58, 42, 0, 0, 7); ctx.fill();
  if (fill > 0) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, -48, 54, 38, 0, 0, 7); ctx.clip(); ctx.fillStyle = 'rgba(255,205,70,0.88)'; const h = 76 * clamp(fill); ctx.fillRect(-60, -8 - h, 120, h + 4); ctx.restore(); }
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-6, -84); ctx.lineTo(10, -102); ctx.lineTo(24, -80); ctx.closePath(); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(56, -46, 15, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = dark; for (const dy of [-50, -42]) { ctx.beginPath(); ctx.arc(60, dy + 2, 2.6, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(34, -64, 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#6b2a3c'; ctx.fillRect(-16, -90, 32, 6);
  ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-56, -52); ctx.quadraticCurveTo(-76, -64, -66, -80); ctx.stroke();
  if (crack > 0) { ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-6, -90); ctx.lineTo(4, -66); ctx.lineTo(-10, -50); ctx.lineTo(6, -28); ctx.stroke(); }
  ctx.restore();
}
const pigOn = (ctx, a, who, opt = {}) => { const d = a[who].desk, s = (a[who].ppm * 0.72) / 116; piggy(ctx, d[0] + a[who].ppm * 0.42, d[1] + 4, s, opt); return { x: d[0] + a[who].ppm * 0.42, y: d[1] + 4, s }; };
// pièces qui tombent dans la fente de la tirelire de Discipline (une par 0,9 s)
function coinDrops(ctx, a, t0, t1, tl, period = 0.9) {
  const d = a.discipline.desk, s = (a.discipline.ppm * 0.72) / 116, px = d[0] + a.discipline.ppm * 0.42, py = d[1] + 4;
  for (let n = 0; ; n++) {
    const tc = t0 + n * period; if (tc > t1) break; const u = (tl - tc) / 0.35; if (u < 0 || u > 1) continue;
    coin(ctx, px - 6 * s, py - 150 * s + u * 60 * s - (1 - u) * 90 * s, 17 * s, u * 9);
  }
}
function ticket(ctx, x, y, w, scratch, rot = 0, lost = true) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#e9e4cf'; ctx.beginPath(); ctx.roundRect(-w / 2, -w * 0.32, w, w * 0.64, 8); ctx.fill();
  ctx.fillStyle = '#2fa59a'; ctx.fillRect(-w / 2, -w * 0.32, w, w * 0.14);
  const ax = -w * 0.38, ay = -w * 0.08, aw = w * 0.76, ah = w * 0.3;
  ctx.fillStyle = '#9a9a9c'; ctx.fillRect(ax, ay, aw, ah);
  if (scratch > 0) { ctx.save(); ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip(); ctx.fillStyle = '#f7f3e0'; ctx.fillRect(ax, ay, aw * clamp(scratch), ah); ctx.restore(); }
  if (scratch >= 1) { ctx.fillStyle = lost ? RED : '#2fa59a'; ctx.font = `900 ${Math.round(w * 0.2)}px Display`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lost ? 'PERDU' : 'GAGNÉ', 0, ay + ah / 2); }
  ctx.restore();
}

// ------------------------------------------------------------------ contenus des écrans muraux
function screen(ctx, r, draw, a = 1) {
  const [x0, y0, x1, y1] = r; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.globalAlpha = a; ctx.fillStyle = '#060a14'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  draw(x0, y0, x1 - x0, y1 - y0); ctx.restore();
}
const font = (h, k) => `900 ${Math.round(h * k)}px Display`;
function scrText(ctx, x, y, w, h, text, color, k = 0.32, blink = 0, t = 0) {
  ctx.fillStyle = color; ctx.font = font(h, k); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha *= blink ? 0.75 + 0.25 * Math.sin(t * 8) : 1; ctx.fillText(text, x + w / 2, y + h / 2);
}
function scrJobs(ctx, x, y, w, h, n) {
  for (let i = 0; i < n; i++) { ctx.fillStyle = ['#b28cff', '#8f6fe0', '#6a4fc0'][i]; ctx.fillRect(x + w * 0.08, y + h * (0.1 + i * 0.3), w * 0.84, h * 0.22); ctx.fillStyle = '#fff'; ctx.font = font(h, 0.15); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(`JOB ${i + 1}`, x + w * 0.14, y + h * (0.21 + i * 0.3)); }
}
function scrSavings(ctx, x, y, w, h, amount) {
  ctx.fillStyle = '#ffd98c'; ctx.font = font(h, 0.34); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${amount.toLocaleString('fr-FR').replace(/ | /g, ' ')} €`, x + w / 2, y + h * 0.42);
  ctx.fillStyle = 'rgba(255,217,140,0.25)'; ctx.fillRect(x + w * 0.1, y + h * 0.74, w * 0.8, h * 0.08); ctx.fillStyle = '#ffd98c'; ctx.fillRect(x + w * 0.1, y + h * 0.74, w * 0.8 * clamp(amount / 1800), h * 0.08);
}

// ------------------------------------------------------------------ textes
function tip(ctx, n, text, tl, t0) {
  if (CLEAN) return;
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
function title(ctx, tl, parts, t0 = 0.05, size = 90) { if (CLEAN) return; topBand(ctx); kinetic(ctx, parts, 420, size, tl, t0, { stagger: 0.1, rise: 50 }); }
function card(ctx, who, tag, u) {
  if (CLEAN) return;
  const c = CAST[who]; topBand(ctx);
  kinetic(ctx, [[c.name, c.labelColor]], 430, 92, u, 0.05, { stagger: 0.08, rise: 40 });
  kinetic(ctx, [[tag, '#f1f1f1']], 525, 52, u, 0.1, { stagger: 0.06 });
}

// ------------------------------------------------------------------ 1. ouverture : le ticket de loto de la Chance est perdant (image 0)
const HOOK = VARIANT === 'b' ? [[['QUI VA AVOIR', '#f1f1f1']], [['1 800 € ?', RED]]] : [[['10 € PAR JOUR.', '#f1f1f1']], [['4 ', RED], ['TIRELIRES.', '#f1f1f1']]];
const BOUCLE = 3 * B;
function ouverture(ctx, tl) {
  const push = 1.08 + 0.3 * ease.inOut(prog(tl, 0.25, 3.0)), quake = tl > 0 && tl < 0.7 ? 22 * Math.exp(-tl * 6) : 0;
  ctx.save(); ctx.translate(noise(tl * 70, 3) * quake, noise(tl * 70, 8) * quake);
  const a = plate(ctx, 'chance', { z: push, x: 520 + 50 * Math.sin(tl * 1.4), y: 1010 + 24 * Math.sin(tl * 1.9) });
  screen(ctx, a.chance.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, 'LOTO : 0 € GAGNÉ', '#e3342c', 0.17, 1, tl));
  const d = a.chance.desk, ppm = a.chance.ppm, scr = tl < 0 ? clamp((tl + 1.45) / 1.45) : 1;
  const slam = ease.out(prog(tl, 0, 0.3));
  const pg = pigOn(ctx, a, 'chance', { fill: 0, shake: tl > 0 && tl < 0.5 ? 6 * (1 - tl / 0.5) : 0, t: tl });
  // le ticket : gratté (avant 0), PERDU (0), froissé et projeté (après)
  const tk = tl < 0.45 ? [d[0] - ppm * 0.3, d[1] - ppm * 0.16, 0] : [d[0] - ppm * 0.3 - (tl - 0.45) * 420, d[1] - ppm * 0.16 - (tl - 0.45) * 160 + (tl - 0.45) ** 2 * 900, (tl - 0.45) * 7];
  if (tk[1] < H + 100) ticket(ctx, tk[0], tk[1], ppm * 0.62, scr, tk[2], true);
  // une pièce s'échappe de la tirelire et roule
  if (tl > 0.1) { const u = tl - 0.1; coin(ctx, pg.x + 40 * pg.s + u * 260, d[1] + 6 + Math.abs(Math.sin(u * 7)) * -22 * Math.exp(-u * 1.5), 12 * pg.s * 1.4, u * 12); }
  const pose = tl < 0 ? { ...POSES.sit, lean: 24, head: 30, armF: [82 + Math.sin(tl * 22) * 14, 52], armB: [60, 60] } : { ...POSES.sit, lean: lerp(24, -30, slam) + Math.sin(tl * 12) * 3, head: lerp(30, -14, slam), armF: [lerp(82, 150, slam), 30], armB: [lerp(60, 130, slam), 20] };
  member(ctx, a, 'chance', pose, { t: tl, mouth: tl < 0 ? 'grit' : 'open', mood: tl < 0 ? null : 'sad' });
  if (tl > 0.5) { const h = headTop(a, 'chance'); bubble(ctx, 'ENCORE UN TICKET !', h[0] + 30, h[1] - 40, tl, 0.5, { log, size: 28 }); }
  dust(ctx, d[0], d[1], tl, 0.05, { n: 10, spread: 260, color: '230,200,140' });
  ctx.restore();
  const rw = prog(tl, 7 * B - 0.5, 7 * B);
  if (rw > 0) rewind(ctx, tl * 8, rw);
  if (CLEAN) return;
  seriesTag(ctx, SERIES, pop(tl, 1.0));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 92, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 505, 100, tl, 2 * B, { stagger: 0.1, rise: 60 });
}

// ------------------------------------------------------------------ 2. jour 1 : chacun et sa tirelire (travelling)
function bags(ctx, a, n) {
  const d = a.ego.desk, ppm = a.ego.ppm;
  for (let i = 0; i < n; i++) {
    const x = d[0] - ppm * (0.1 + i * 0.22), h = ppm * (0.3 + 0.05 * (i % 2)), w = ppm * 0.2;
    ctx.fillStyle = ['#e3342c', '#b28cff', '#e9c75a', '#4dc3ff'][i % 4]; ctx.fillRect(x - w / 2, d[1] + ppm * 0.62 - h, w, h);
    ctx.strokeStyle = '#f1f1f1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, d[1] + ppm * 0.62 - h, w * 0.28, Math.PI, 0); ctx.stroke();
  }
}
function jour1(ctx, tl) {
  ctx.save();
  const aw = A.large_nuit, pan = ease.inOut(prog(tl, 0.2, 4.2));
  const a = plate(ctx, 'large_nuit', { z: 1.75, x: lerp(aw.ego.seat[0] + 120, aw.discipline.seat[0] + 40, pan), y: 1040 });
  const t = S.jour1 + tl;
  screen(ctx, a.ego.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, `-${Math.round(40 + tl * 70)} €`, '#e3342c', 0.3, 1, tl));
  screen(ctx, a.obsession.monitor, (x, y, w, h) => scrJobs(ctx, x, y, w, h, Math.min(3, 1 + Math.floor(tl * 1.1))));
  screen(ctx, a.chance.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, 'LOTO : 0 €', '#e3342c', 0.22));
  screen(ctx, a.discipline.monitor, (x, y, w, h) => scrSavings(ctx, x, y, w, h, SAVED(t)));
  bags(ctx, a, Math.min(4, 1 + Math.floor(tl * 1.2)));
  pigOn(ctx, a, 'ego', { gold: true, fill: 0, t });
  pigOn(ctx, a, 'obsession', { fill: 0.05, t });
  pigOn(ctx, a, 'chance', { fill: 0, t });
  pigOn(ctx, a, 'discipline', { fill: fillD(t), t });
  coinDrops(ctx, a, 0.5, 8 * B, tl, 1.1);
  member(ctx, a, 'ego', selfie, { t: tl, mouth: 'smirk', showLabel: true });
  if (Math.floor(tl * 2.4) % 3 === 0) { const h = headTop(a, 'ego'); glow(ctx, h[0] + 30, h[1] + 40, 60, '255,255,255', 0.7); }
  member(ctx, a, 'obsession', typing(tl, 22), { t: tl, mouth: 'grit', mood: 'angry', showLabel: true });
  member(ctx, a, 'chance', { ...typing(tl, 16, 20), head: 26 }, { t: tl, mouth: null, showLabel: true });
  member(ctx, a, 'discipline', typing(tl, 6, 4), { t: tl, mouth: 'grit', mood: 'determined', showLabel: true });
  if (tl > 0.5 && tl < 1.25) { const h = headTop(a, 'ego'); bubble(ctx, 'C’EST UN INVESTISSEMENT !', h[0] + 40, h[1] - 40, tl, 0.5, { log, size: 26 }); }
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['1', RED]]);
  tip(ctx, 1, 'MET DE CÔTÉ, CHAQUE JOUR.', tl, 1.4);
}

// ------------------------------------------------------------------ 3. visite des quatre tirelires
const TOUR = [
  { who: 'ego', beats: 4, tag: 'TOUT POUR L’IMAGE.' },
  { who: 'obsession', beats: 4, tag: '3 JOBS, 0 SOMMEIL.' },
  { who: 'chance', beats: 4, tag: 'ELLE JOUE AU LOTO.' },
  { who: 'discipline', beats: 4, tag: '10 € PAR JOUR.' },
];
let acc = 0; for (const s of TOUR) { s.t0 = acc * B; s.len = s.beats * B; acc += s.beats; }
function visite(ctx, tl) {
  let k = 0; for (let i = 0; i < TOUR.length; i++) if (tl >= TOUR[i].t0) k = i;
  const sh = TOUR[k], u = tl - sh.t0, pr = u / sh.len, t = S.visite + tl;
  ctx.save();
  const a = plate(ctx, sh.who, { z: 1.0 + 0.07 * pr, x: 540, y: 1050 });
  const r = a[sh.who].monitor, h = headTop(a, sh.who), d = a[sh.who].desk, ppm = a[sh.who].ppm;
  if (sh.who === 'ego') {
    screen(ctx, r, (x, y, w, hh) => scrText(ctx, x, y, w, hh, `-${Math.round(249 * clamp(u / 1.2))} €`, '#e3342c', 0.3, 1, tl));
    bags(ctx, a, 4);
    pigOn(ctx, a, 'ego', { gold: true, fill: 0, crack: 1, t });
    // le ticket de caisse s'imprime
    const ru = clamp(u / 1.6); ctx.fillStyle = '#f1efe4'; ctx.fillRect(d[0] - ppm * 0.95, d[1] - ppm * 0.1, ppm * 0.26, ppm * 0.9 * ru);
    member(ctx, a, 'ego', selfie, { t: tl, mouth: 'smirk' });
    if (Math.floor(u * 3) % 2 === 0) glow(ctx, h[0] + 60, h[1] + 80, 140, '255,255,255', 0.75);
    if (u > 0.3) bubble(ctx, 'C’EST UN INVESTISSEMENT !', h[0] + 30, h[1] - 50, u, 0.3, { log });
  } else if (sh.who === 'obsession') {
    screen(ctx, r, (x, y, w, hh) => scrJobs(ctx, x, y, w, hh, 3));
    pigOn(ctx, a, 'obsession', { fill: 0.12, shake: 2, t });
    const p = typing(tl, 26, 16);
    member(ctx, a, 'obsession', p, { t: tl, mouth: 'grit', mood: 'angry' });
    sweat(ctx, a.obsession.seat[0], a.obsession.seat[1], p, tl * 2, { scale: scOf(a) });
    if (u > 0.1) bubble(ctx, 'ENCORE UN JOB !', h[0] + 30, h[1] - 50, u, 0.1, { log });
  } else if (sh.who === 'chance') {
    screen(ctx, r, (x, y, w, hh) => scrText(ctx, x, y, w, hh, 'LOTO : 0 / 10', '#e3342c', 0.2, 1, tl));
    pigOn(ctx, a, 'chance', { fill: 0, t });
    for (let i = 0; i < 6; i++) { const ph = (u * 0.8 + i / 6) % 1; ticket(ctx, d[0] - ppm * (0.2 + i * 0.12) - ph * 60, d[1] - ppm * 0.1 + ph * ppm * 0.75, ppm * 0.4, 1, ph * 3 * (i % 2 ? 1 : -1), true); }
    member(ctx, a, 'chance', { ...typing(tl, 18, 18), head: 24 }, { t: tl, mouth: 'happy' });
    if (u > 0.25) bubble(ctx, 'CETTE FOIS, C’EST BON !', h[0] + 30, h[1] - 60, u, 0.25, { log });
  } else {
    screen(ctx, r, (x, y, w, hh) => scrSavings(ctx, x, y, w, hh, SAVED(t)));
    pigOn(ctx, a, 'discipline', { fill: fillD(t), t });
    coinDrops(ctx, a, 0.2, 4 * B, u, 0.7);
    member(ctx, a, 'discipline', typing(tl, 7, 6), { t: tl, mouth: 'grit', mood: 'determined' });
    if (u > 0.2 && u < 1.5) bubble(ctx, '10 €, COMME HIER.', h[0] + 30, h[1] - 50, u, 0.2, { log });
  }
  ctx.restore();
  card(ctx, sh.who, sh.tag, u);
  if (k === 3) tip(ctx, 2, 'AUTOMATISE LE VIREMENT.', u, 0.1);
}

// ------------------------------------------------------------------ 4. jour 90 : l'Obsession craque, la Chance a perdu 90 tickets
function nuit(ctx, tl) {
  const z = 1.32 + 0.5 * ease.inOut(prog(tl, 0.4, 2.0)), t = S.nuit + tl;
  ctx.save();
  const a0 = A.large_nuit, fx = lerp(540, a0.discipline.seat[0] + 60, ease.inOut(prog(tl, 0.4, 2.0)));
  const a = plate(ctx, 'large_nuit', { z, x: fx, y: 1010 });
  screen(ctx, a.ego.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, '0 € RESTANT', '#e3342c', 0.2, 1, tl), 0.8);
  screen(ctx, a.obsession.monitor, () => {}, 1);
  screen(ctx, a.chance.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, 'LOTO : 0 / 90', '#e3342c', 0.2));
  screen(ctx, a.discipline.monitor, (x, y, w, h) => scrSavings(ctx, x, y, w, h, SAVED(t)));
  bags(ctx, a, 4);
  pigOn(ctx, a, 'ego', { gold: true, fill: 0, crack: 1, t });
  pigOn(ctx, a, 'obsession', { fill: 0.14, t });
  pigOn(ctx, a, 'chance', { fill: 0, t });
  pigOn(ctx, a, 'discipline', { fill: fillD(t), t });
  coinDrops(ctx, a, 1.0, 7 * B, tl, 1.0);
  const cd = a.chance.desk; for (let i = 0; i < 9; i++) ticket(ctx, cd[0] - a.chance.ppm * (0.1 + (i % 5) * 0.1), cd[1] + a.chance.ppm * (0.45 + 0.04 * Math.floor(i / 5)), a.chance.ppm * 0.34, 1, (hash(i) - 0.5) * 1.2, true);
  member(ctx, a, 'ego', { ...POSES.sit, lean: 10, head: 36, armF: [70, 90], armB: [60, 90] }, { t: tl, mouth: 'sad' });
  member(ctx, a, 'obsession', tl > 0.4 ? slump : typing(tl, 22), { t: tl, eyesClosed: tl > 0.4, mood: tl > 0.4 ? null : 'angry' });
  member(ctx, a, 'chance', { ...lounge, head: 30 }, { t: tl, mouth: 'sad' });
  member(ctx, a, 'discipline', typing(tl, 6, 4), { t: tl, mouth: 'grit', mood: 'determined' });
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['90', RED]]);
  tip(ctx, 3, 'ÉVITE LES ACHATS D’IMAGE.', tl, 0.5);
}

// ------------------------------------------------------------------ 5. jour 180 : Discipline casse sa tirelire
function aube(ctx, tl, extra = 0) {
  const T = tl + extra, t = S.aube + T, z = 1.5 + 0.35 * ease.inOut(prog(T, 0.2, 3.8));
  ctx.save();
  const a0 = A.large_aube, fx = lerp(a0.ego.seat[0] + 160, a0.discipline.seat[0] + 80, ease.inOut(prog(T, 0.2, 3.8)));
  const a = plate(ctx, 'large_aube', { z, x: fx, y: 1010 });
  const broke = t >= BREAK;
  screen(ctx, a.ego.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, 'CARTE REFUSÉE', '#e3342c', 0.15, 1, T));
  screen(ctx, a.obsession.monitor, () => {}, 1);
  screen(ctx, a.chance.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, 'LOTO : 0 / 180', '#6b6b70', 0.16));
  screen(ctx, a.discipline.monitor, (x, y, w, h) => scrSavings(ctx, x, y, w, h, SAVED(t)));
  bags(ctx, a, 4);
  pigOn(ctx, a, 'ego', { gold: true, fill: 0, crack: 1, t });
  pigOn(ctx, a, 'obsession', { fill: 0.1, t });
  pigOn(ctx, a, 'chance', { fill: 0, t });
  const dd = a.discipline.desk, dppm = a.discipline.ppm;
  if (!broke) { const p = pigOn(ctx, a, 'discipline', { fill: fillD(t), crack: prog(t, BREAK - 0.5, BREAK) > 0 ? 1 : 0, shake: prog(t, BREAK - 0.6, BREAK) * 5, t }); void p; }
  else {
    const u = t - BREAK, px = dd[0] + dppm * 0.42;
    for (let i = 0; i < 34; i++) { const vx = (hash(i) - 0.5) * 520, vy = -(180 + hash(i + 9) * 460), x = px + vx * u, y = dd[1] - 30 + vy * u + 1100 * u * u; if (y < dd[1] + dppm * 0.55) coin(ctx, x, y, 11 + hash(i + 3) * 6, u * (6 + i % 5)); else coin(ctx, x, dd[1] + dppm * 0.55 + (i % 4) * 4, 11 + hash(i + 3) * 6, 0.4); }
    impactRing(ctx, px, dd[1] - 40, t, BREAK, { r: 200, color: '#ffd98c' });
    glow(ctx, px, dd[1] - 40, 220, '255,215,120', 0.5 * (1 - prog(u, 0, 1.5) * 0.5));
  }
  member(ctx, a, 'ego', { ...POSES.sit, lean: 6, head: 30 }, { t: T, mouth: 'sad' });
  member(ctx, a, 'obsession', slump, { t: T, eyesClosed: true });
  member(ctx, a, 'chance', { ...lounge, head: 26 }, { t: T, mouth: 'sad' });
  member(ctx, a, 'discipline', broke ? { ...POSES.victory, armF: [-165, -10], armB: [165, 10] } : typing(T, 6, 4), { t: T, mouth: 'happy', mood: 'determined' });
  ctx.restore();
}
function aubeScene(ctx, tl) { aube(ctx, tl); title(ctx, tl, [['JOUR ', '#f1f1f1'], ['180', RED]]); }

// ------------------------------------------------------------------ 6. chute
function chute(ctx, tl) {
  aube(ctx, tl, 7 * B);
  if (CLEAN) return;
  topBand(ctx);
  kinetic(ctx, [['TOUT SE JOUE ', '#f1f1f1']], 420, 70, tl, 0.1);
  kinetic(ctx, [['PIÈCE ', '#f1f1f1'], ['PAR PIÈCE.', RED]], 520, 92, tl, 0.8, { rise: 60 });
}

// ------------------------------------------------------------------ compteur d'élimination
const ORDER = ['ego', 'obsession', 'chance', 'discipline'];
function tracker(ctx, t) {
  if (CLEAN) return;
  const show = clamp((t - 1.2) / 0.3) * (t < S.boucle ? 1 : 0);
  if (show <= 0) return;
  ctx.save(); ctx.globalAlpha = show; ctx.translate(826, 300); ctx.scale(1.25, 1.25); ctx.translate(-826, -300);
  const y = 300, x0 = 712;
  ctx.fillStyle = 'rgba(8,8,12,0.72)'; ctx.beginPath(); ctx.roundRect(x0 - 40, y - 42, 4 * 74 + 10, 84, 42); ctx.fill();
  ORDER.forEach((who, i) => {
    const c = CAST[who], x = x0 + i * 74, out = OUT[who] !== undefined && t >= OUT[who], k = out ? clamp((t - OUT[who]) / 0.25) : 0;
    const win = who === 'discipline' && t >= BREAK;
    ctx.save(); ctx.translate(x, y);
    if (out) { const sh = (1 - k) * 8; ctx.translate(noise(t * 80, i) * sh, 0); }
    if (win) { const p = 1 + 0.08 * Math.sin(t * 9); ctx.scale(p, p); glow(ctx, 0, 0, 70, '255,215,120', 0.45); }
    ctx.globalAlpha *= out ? 0.45 : 1;
    ctx.fillStyle = out ? '#55555c' : c.color; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(6, -4, 3.5, 0, 7); ctx.arc(16, -4, 3.5, 0, 7); ctx.fill();
    if (who === 'discipline' && !out) { ctx.fillStyle = RED; ctx.fillRect(-26, -16, 52, 8); }
    if (who === 'ego') { ctx.fillStyle = out ? '#77777c' : '#e2b53e'; ctx.beginPath(); ctx.moveTo(-16, -22); ctx.lineTo(-16, -34); ctx.lineTo(-6, -26); ctx.lineTo(0, -38); ctx.lineTo(6, -26); ctx.lineTo(16, -34); ctx.lineTo(16, -22); ctx.fill(); }
    if (who === 'chance') { ctx.fillStyle = out ? '#77777c' : '#4fbf6c'; for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(Math.cos(q * 1.57) * 6, -32 + Math.sin(q * 1.57) * 6, 5, 0, 7); ctx.fill(); } }
    if (who === 'obsession') { ctx.strokeStyle = out ? '#77777c' : c.color; ctx.lineWidth = 4; for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.moveTo(-10 + q * 10, -24); ctx.lineTo(-13 + q * 10, -36); ctx.stroke(); } }
    ctx.globalAlpha = show;
    if (out) { const s2 = 1.8 - 0.8 * ease.out(k); ctx.scale(s2, s2); ctx.strokeStyle = RED; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); ctx.stroke(); }
    ctx.restore();
  });
  ctx.restore();
}

// ------------------------------------------------------------------ 7. boucle : le ticket de la Chance, juste avant « PERDU »
function boucle(ctx, tl) {
  ouverture(ctx, tl - BOUCLE);
  if (CLEAN) return;
  const k = pop(tl, 0.15, 0.25) * (1 - clamp((tl - (BOUCLE - 0.55)) / 0.3));
  if (k > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 1480); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
    ctx.font = '900 44px Display'; ctx.letterSpacing = '3px'; const w = ctx.measureText('ABONNE-TOI').width + 90;
    ctx.fillStyle = RED; ctx.beginPath(); ctx.roundRect(-w / 2, -42, w, 84, 42); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ABONNE-TOI', 0, 2); ctx.restore();
    if (k >= 0.5) log('ABONNE-TOI');
  }
}

const SCENES = [[S.ouverture, ouverture], [S.jour1, jour1], [S.visite, visite], [S.nuit, nuit], [S.aube, aubeScene], [S.chute, chute], [S.boucle, boucle]];
const CUTS = [
  { t: S.jour1, type: 'glitch', d: 0.26 },
  { t: S.visite, type: 'whip', dir: 1 },
  { t: S.visite + TOUR[1].t0, type: 'whip', dir: -1 },
  { t: S.visite + TOUR[2].t0, type: 'whip', dir: 1 },
  { t: S.visite + TOUR[3].t0, type: 'zoom', d: 0.3 },
  { t: S.nuit, type: 'glitch', d: 0.26 },
  { t: S.aube, type: 'whip', dir: 1 },
  { t: S.boucle, type: 'zoom', d: 0.3 },
];
function renderAt(ctx, t) {
  TEXTLOG.frame = [];
  CAM = { x: 540, y: 960, z: 1 };
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
  const [t0, fn] = SCENES[k];
  const since = t - t0, sh = k > 0 && k !== 6 ? 10 * Math.exp(-since * 9) : 0;
  ctx.save(); ctx.translate(noise(t * 50, 5) * sh, noise(t * 50, 9) * sh);
  fn(ctx, since);
  ctx.restore();
  tracker(ctx, t);
}
export function draw(ctx, t) {
  if (!CLEAN && transition(ctx, t, renderAt, CUTS)) return;
  renderAt(ctx, t);
}
export const samples = (t) => (t < S.jour1 || t >= S.boucle ? 2 : 1);

// Lumière : lueur des écrans et des suspensions ; éclat doré quand la tirelire éclate
export const post = cinema((t) => ({ threshold: 0.8, ...look(t) }));
function look(t) {
  if (t >= BREAK && t < S.boucle) return { bloom: 1.1, threshold: 0.75, rays: { x: 980, y: 520, strength: 0.9, color: '#ffd9a0', radius: 0.08 }, fog: { density: 0.2, height: 0.3, color: '#5a3a30' }, warm: 1.4 };
  if (t >= S.nuit && t < S.boucle) return { bloom: 1.0, fog: { density: 0.22, height: 0.3, color: '#1a1e30' }, warm: 1 };
  const L = A.chance ? toScreen(...A.chance.chance.lamp) : { x: 540, y: 500 };
  return { bloom: 1.0, rays: { x: L.x, y: L.y, strength: 0.55, color: '#ffc27a', radius: 0.03 }, fog: { density: 0.22, height: 0.35, color: '#1a1e30' }, warm: 1 };
}

// ------------------------------------------------------------------ fiche de montage Remotion (factory/remotion/src/Montage.tsx)
const W_ = '#f1f1f1';
export const MONTAGE = {
  fps: FPS, duration: S.end, series: SERIES,
  hook: { a: [[['10 € PAR JOUR.', W_]], [['4 ', RED], ['TIRELIRES.', W_]]], b: [[['QUI VA AVOIR', W_]], [['1 800 € ?', RED]]], line2At: 2 * B, end: S.jour1 },
  bands: [[0, S.jour1], [S.jour1, S.visite], [S.visite, S.nuit], [S.nuit, S.chute], [S.chute, S.boucle]],
  titles: [{ pre: 'JOUR ', n: '1', start: S.jour1 + 0.05, end: S.visite }, { pre: 'JOUR ', n: '90', start: S.nuit + 0.05, end: S.aube }, { pre: 'JOUR ', n: '180', start: S.aube + 0.05, end: S.chute }],
  cards: TOUR.map((s, i) => ({ who: s.who, tag: s.tag, start: S.visite + s.t0 + 0.04, end: i < 3 ? S.visite + TOUR[i + 1].t0 : S.nuit })),
  tips: [{ n: 1, text: 'MET DE CÔTÉ, CHAQUE JOUR.', start: S.jour1 + 1.4, end: S.visite }, { n: 2, text: 'AUTOMATISE LE VIREMENT.', start: S.visite + TOUR[3].t0 + 0.1, end: S.nuit }, { n: 3, text: 'ÉVITE LES ACHATS D’IMAGE.', start: S.nuit + 0.5, end: S.aube }],
  lines: [{ words: [['TOUT SE JOUE ', W_]], start: S.chute + 0.1, end: S.boucle, size: 70, y: 420 }, { words: [['PIÈCE ', W_], ['PAR PIÈCE.', RED]], start: S.chute + 0.8, end: S.boucle, size: 92, y: 520, stagger: 0.1 }],
  tracker: { from: 1.2, to: S.boucle, out: OUT, winAt: BREAK },
  progress: { from: 1.2, to: S.boucle },
  cuts: CUTS.map((c) => ({ t: c.t, type: c.type, dir: c.dir })),
  subscribe: { start: S.boucle + 0.15, end: S.end - 0.55 },
};

// ------------------------------------------------------------------ son
const strikes = (t0, t1, period, off, sfx, gain) => { const out = []; for (let n = 0; ; n++) { const t = t0 + (n + 0.3) * period - off; if (t >= t1) break; if (t >= t0) out.push({ t, sfx, gain }); } return out; };
const CUT_SFX = CUTS.flatMap((c) => c.type === 'whip' ? [{ t: c.t, sfx: 'whip', gain: 0.55 }] : c.type === 'glitch' ? [{ t: c.t, sfx: 'glitch', gain: 0.4, len: c.d }] : [{ t: c.t, sfx: 'whoosh', gain: 0.45, len: 0.3 }, { t: c.t + 0.1, sfx: 'sub', gain: 0.45 }]);
export const HITS = [
  { t: 0, sfx: 'room', gain: 0.4, len: S.end },
  ...CUT_SFX,
  // ouverture : ticket gratté, PERDU, poing sur le bureau, pièce qui roule
  ...Array.from({ length: 4 }, (_, i) => ({ t: 0.04 + i * 0.1, sfx: 'swish', gain: 0.25 })), { t: 0.02, sfx: 'impact', gain: 0.35 }, { t: 0.02, sfx: 'sub', gain: 0.6 }, { t: 0.04, sfx: 'buzz', gain: 0.3 }, { t: 0.15, sfx: 'thud', gain: 0.35 },
  ...Array.from({ length: 5 }, (_, i) => ({ t: 0.25 + i * 0.2, sfx: 'tick', gain: 0.25 })), { t: 2 * B, sfx: 'pop', gain: 0.3 }, { t: 7 * B - 0.4, sfx: 'riser', gain: 0.3, len: 0.6 },
  // jour 1 : achats, frappe, pièces dans la tirelire de Discipline
  { t: S.jour1 + 0.4, sfx: 'pop', gain: 0.3 }, ...strikes(S.jour1, S.visite, 1.1, 0, 'ding', 0.2), ...strikes(S.jour1, S.visite, 0.45, 0, 'click', 0.18), { t: S.jour1, sfx: 'type', gain: 0.3, len: 8 * B },
  // visite
  ...TOUR.map((s) => ({ t: S.visite + s.t0 + 0.05, sfx: 'pop', gain: 0.22 })),
  { t: S.visite + 0.3, sfx: 'cash', gain: 0.3 }, { t: S.visite + 0.8, sfx: 'cash', gain: 0.25 },
  { t: S.visite + TOUR[1].t0, sfx: 'type', gain: 0.45, len: TOUR[1].len }, ...Array.from({ length: 4 }, (_, i) => ({ t: S.visite + TOUR[1].t0 + 0.2 + i * 0.4, sfx: 'notif', gain: 0.14, len: 0.8 })),
  ...Array.from({ length: 6 }, (_, i) => ({ t: S.visite + TOUR[2].t0 + 0.2 + i * 0.28, sfx: 'swish', gain: 0.25 })), { t: S.visite + TOUR[2].t0 + 0.4, sfx: 'boing', gain: 0.25 },
  ...strikes(S.visite + TOUR[3].t0, S.visite + TOUR[3].t0 + TOUR[3].len, 0.7, 0, 'ding', 0.3), ...Array.from({ length: 3 }, (_, i) => ({ t: S.visite + TOUR[3].t0 + 0.4 + i * 0.5, sfx: 'tick', gain: 0.3 })),
  // jour 90 : cœur, deux éliminations
  ...Array.from({ length: 3 }, (_, i) => ({ t: S.nuit + 0.05 + i * 0.7, sfx: 'heart', gain: 0.4 })),
  { t: OUT.obsession, sfx: 'buzz', gain: 0.5 }, { t: OUT.obsession, sfx: 'thud', gain: 0.35 }, { t: OUT.chance, sfx: 'buzz', gain: 0.5 }, { t: OUT.chance, sfx: 'impact', gain: 0.25 },
  ...strikes(S.nuit + 1, S.aube, 1.0, 0, 'ding', 0.25),
  // jour 180 : carte refusée, la tirelire éclate
  { t: OUT.ego, sfx: 'buzz', gain: 0.5 }, { t: OUT.ego, sfx: 'impact', gain: 0.25 },
  { t: BREAK - 0.5, sfx: 'riser', gain: 0.4, len: 0.5 }, { t: BREAK, sfx: 'shatter', gain: 0.5 }, { t: BREAK, sfx: 'sub', gain: 0.7 }, { t: BREAK + 0.05, sfx: 'cash', gain: 0.55 },
  ...Array.from({ length: 8 }, (_, i) => ({ t: BREAK + 0.2 + i * 0.12, sfx: 'ding', gain: 0.2 })),
  // chute
  { t: S.chute + 0.1, sfx: 'sub', gain: 0.55 }, { t: S.chute + 0.8, sfx: 'sub', gain: 0.5 }, { t: S.chute + 0.8, sfx: 'ding', gain: 0.3 },
  { t: S.boucle + 0.15, sfx: 'pop', gain: 0.3 },
];
