// « 4 business » (montage 2 : rétention, transitions, son) — film ORIGINAL, série Toi contre toi #7. Les quatre traits de caractère lancent chacun
// un business en ligne. L'EGO dépense tout dans l'image, L'OBSESSION ouvre dix projets sans en finir un,
// LA CHANCE attend le buzz, DISCIPLINE publie une vidéo par jour et répond à chaque client.
// Décors : plaques 3D rendues par Blender (engine/blender/bureaux.py → player/plates/business/),
// avec anchors.json pour poser les personnages animés exactement sur les sièges, bureaux et écrans.
// Ouverture in medias res : l'enseigne lumineuse de l'Ego s'écrase sur son bureau à l'image 0.
import { W, H, timeline, topBand, POSES, COLORS, clamp, prog, ease, pop, lerp, noise, hash, VARIANT, seriesTag, endCard, camera, dust, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
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
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #7', HANDLE = null;
const log = (s) => TEXTLOG.frame.push(s);

export const SCRIPT = {
  premiere: 'chute',
  accroche: VARIANT === 'b' ? ['QUI VEND', 'VRAIMENT ?'] : ['4 BUSINESS.', '1 SEUL SURVIT.'],
  structure: ['ouverture', 'conflit', 'effort', 'progression', 'obstacle', 'retournement', 'chute'],
  dialogues: ['REGARDEZ MON LOGO !', 'ENCORE UN PROJET !', 'JE SUIS VIRAL !', 'MERCI POUR VOTRE COMMANDE.'],
  conseils: ['UN SEUL PRODUIT D’ABORD.', 'PUBLIE CHAQUE JOUR.', 'RÉPONDS À CHAQUE CLIENT.'],
  details: ['JOUR 1', 'JOUR 180', '3 H', '1re vente', 'lampe à selfies', '10 onglets', 'colis'],
  chute: ['LE BUSINESS QUI SURVIT ?', 'CELUI QUI REVIENT CHAQUE JOUR.'],
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
// échelle des personnages : 1,9 m de haut (proportions « cartoon ») au plan des bureaux
const scOf = (a) => (1.9 * a.ego.ppm) / 424;

// ------------------------------------------------------------------ poses assises
const typing = (t, speed = 9, lean = 10) => ({ ...POSES.sit, lean, head: 14, armB: [72 + Math.sin(t * speed) * 7, 62], armF: [80 + Math.cos(t * speed * 1.1) * 7, 56] });
const selfie = { ...POSES.sit, lean: -10, head: -12, armF: [150, 30], armB: [40, 70] };
const slump = { ...POSES.sit, lean: 62, head: 50, armB: [95, 10], armF: [100, 6] };
const lounge = { ...POSES.sit, lean: -34, head: 6, armB: [20, 30], armF: [40, 60] };
function member(ctx, a, who, pose, opt = {}) {
  const sc = scOf(a), s = a[who].seat;
  return drawMember(ctx, who, s[0], s[1], pose, { scale: sc, showLabel: false, ...opt });
}

// ------------------------------------------------------------------ contenus des écrans muraux
function screen(ctx, r, draw, a = 1) {
  const [x0, y0, x1, y1] = r; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.globalAlpha = a; ctx.fillStyle = '#060a14'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  draw(x0, y0, x1 - x0, y1 - y0); ctx.restore();
}
const font = (h, k) => `900 ${Math.round(h * k)}px Display`;
function scrZero(ctx, x, y, w, h, t) {
  ctx.fillStyle = '#e3342c'; ctx.font = font(h, 0.42); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha *= 0.75 + 0.25 * Math.sin(t * 8); ctx.fillText('0 €', x + w / 2, y + h / 2);
}
function scrTabs(ctx, x, y, w, h, t, n) {
  for (let i = 0; i < n; i++) {
    const c = i % 4, r = Math.floor(i / 4), cw = w / 4.4, ch = h / 3.4;
    ctx.fillStyle = `hsl(${270 + i * 9},60%,${40 + 20 * hash(i + Math.floor(t * 6))}%)`;
    ctx.fillRect(x + w * 0.04 + c * cw * 1.08, y + h * 0.06 + r * ch * 1.1, cw, ch);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x + w * 0.04 + c * cw * 1.08 + 4, y + h * 0.06 + r * ch * 1.1 + 4, cw * (0.3 + 0.5 * hash(i)), 3);
  }
}
function scrHearts(ctx, x, y, w, h, t, level) {
  ctx.fillStyle = '#ff4d6d'; ctx.font = font(h, 0.3); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`♥ ${Math.round(level)}`, x + w / 2, y + h * 0.42);
  ctx.fillStyle = 'rgba(255,77,109,0.35)'; ctx.fillRect(x + w * 0.1, y + h * 0.75, w * 0.8 * clamp(level / 999), h * 0.08);
}
function scrCalendar(ctx, x, y, w, h, days) {
  for (let i = 0; i < 28; i++) {
    const c = i % 7, r = Math.floor(i / 7), cw = w / 7.6, ch = h / 4.8;
    const cx = x + w * 0.04 + c * cw * 1.05, cy = y + h * 0.08 + r * ch * 1.15;
    ctx.fillStyle = i < days ? 'rgba(227,52,44,0.9)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(cx, cy, cw, ch);
    if (i < days) { ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, ch * 0.12); ctx.beginPath(); ctx.moveTo(cx + cw * 0.25, cy + ch * 0.55); ctx.lineTo(cx + cw * 0.45, cy + ch * 0.75); ctx.lineTo(cx + cw * 0.78, cy + ch * 0.3); ctx.stroke(); }
  }
}
function scrGraph(ctx, x, y, w, h, k, rising = true) {
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x, y + h * i / 4); ctx.lineTo(x + w, y + h * i / 4); ctx.stroke(); }
  ctx.strokeStyle = rising ? '#e3342c' : '#6b6b70'; ctx.lineWidth = Math.max(3, h * 0.05); ctx.lineJoin = 'round'; ctx.beginPath();
  const n = 40, m = Math.max(1, Math.floor(n * k));
  for (let i = 0; i <= m; i++) { const u = i / n, v = rising ? Math.pow(u, 1.6) * 0.82 + Math.sin(i * 1.7) * 0.02 : 0.08 + Math.sin(i) * 0.03; ctx.lineTo(x + w * 0.05 + u * w * 0.9, y + h * (0.92 - v)); }
  ctx.stroke();
}
function scrRec(ctx, x, y, w, h, t, n) {
  ctx.fillStyle = Math.floor(t * 2) % 2 ? '#e3342c' : '#5a1512'; ctx.beginPath(); ctx.arc(x + w * 0.12, y + h * 0.2, h * 0.08, 0, 7); ctx.fill();
  ctx.fillStyle = '#f1f1f1'; ctx.font = font(h, 0.26); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`#${n}`, x + w / 2, y + h * 0.55);
}

// ------------------------------------------------------------------ enseigne de l'EGO (tombe à l'image 0)
function neon(ctx, a, tl, fallAt = 0.05) {
  const r = a.ego.monitor, sc = scOf(a), w = (r[2] - r[0]) * 1.05, cx = (r[0] + r[2]) / 2, y0 = r[1] - w * 0.32;
  const deskY = a.ego.desk[1] - w * 0.09;
  let y = y0, rot = 0;
  if (tl >= fallAt) { const u = tl - fallAt, fallT = Math.sqrt(Math.max(1, deskY - y0) / 2600); if (u < fallT) { y = y0 + 2600 * u * u; rot = u * 1.6; } else { const b = u - fallT; y = deskY - Math.abs(Math.sin(b * 14)) * 30 * Math.exp(-b * 6); rot = fallT * 1.6 + 0.08 * Math.exp(-b * 4); } }
  const on = tl < fallAt ? 1 : (hash(Math.floor(tl * 14)) > 0.35 ? 0.9 : 0.15);
  ctx.save(); ctx.translate(cx, y); ctx.rotate(rot);
  ctx.fillStyle = '#1a1408'; ctx.fillRect(-w / 2, -w * 0.09, w, w * 0.18);
  ctx.font = `900 ${Math.round(w * 0.12)}px Display`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffc94a'; ctx.shadowBlur = 30 * on; ctx.fillStyle = `rgba(255,214,110,${on})`; ctx.fillText('EGO STORE', 0, 2);
  ctx.restore();
  void sc;
  return { x: cx, y: deskY };
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
  kinetic(ctx, [[tag, '#f1f1f1']], 525, 52, u, 0.1, { stagger: 0.06 });
}
const headTop = (a, who) => [a[who].seat[0], a[who].seat[1] - scOf(a) * 330];

// ------------------------------------------------------------------ 1. ouverture : l'enseigne s'écrase
const HOOK = VARIANT === 'b' ? [[['QUI VEND', '#f1f1f1']], [['VRAIMENT ?', RED]]] : [[['4 BUSINESS.', '#f1f1f1']], [['1 SEUL ', '#f1f1f1'], ['SURVIT.', RED]]];
function ouverture(ctx, tl) {
  const push = 1.04 + 0.28 * ease.inOut(prog(tl, 0.3, 3.2)), quake = tl > 0.28 && tl < 0.9 ? 22 * Math.exp(-(tl - 0.28) * 6) : 0;
  ctx.save();
  ctx.translate(noise(tl * 70, 3) * quake, noise(tl * 70, 8) * quake);
  const a = plate(ctx, 'ego', { z: push, x: 520 + 60 * Math.sin(tl * 1.4), y: 1000 + 30 * Math.sin(tl * 1.9) });
  screen(ctx, a.ego.monitor, (x, y, w, h) => scrZero(ctx, x, y, w, h, tl));
  const hit = neon(ctx, a, tl);
  const back = ease.out(prog(tl, 0.12, 0.45));
  const tug = tl > 1.1 ? Math.sin((tl - 1.1) * 14) * 1.6 : 0, panic = tl > 0.5 && tl < 1.1 ? Math.sin(tl * 26) * 1.4 : 0;
  const egoPose = tl < 1.1
    ? { ...selfie, lean: lerp(-10, -38, back) + (tl < 0 ? Math.sin(tl * 3) * 3 : 0), head: -12 + (tl < 0 ? Math.sin(tl * 4) * 5 : 0), armF: [lerp(150, 120, back) + panic * 30 + (tl < 0 ? Math.sin(tl * 5) * 8 : 0), 30], armB: [lerp(40, 150, back) - panic * 30, 20] }
    : { ...POSES.sit, lean: 30 + tug * 8, head: 10, armF: [95 + tug * 12, 20], armB: [100 + tug * 12, 14] };
  member(ctx, a, 'ego', egoPose, { t: tl, mouth: back > 0.2 ? (tl > 1.1 ? 'grit' : 'open') : 'smirk', mood: back > 0.2 ? 'sad' : null });
  if (tl < -0.2 && Math.floor(-tl * 2.2) % 3 === 1) { const h = headTop(a, 'ego'); glow(ctx, h[0] + 70, h[1] + 90, 150, '255,255,255', 0.6); }
  if (tl > 0.4) for (let i = 0; i < 3; i++) { const ph = (tl * 1.7 + i / 3) % 1, k = hash(i + Math.floor(tl * 1.7 + i / 3) * 7); if (k > 0.5) { ctx.fillStyle = `rgba(255,220,120,${(1 - ph).toFixed(2)})`; ctx.beginPath(); ctx.arc(hit.x + (k - 0.75) * 300 + ph * 40, hit.y - 20 - ph * 90 + ph * ph * 160, 5, 0, 7); ctx.fill(); } }
  const t1 = 0.05 + Math.sqrt(Math.max(1, hit.y - (a.ego.monitor[1] - (a.ego.monitor[2] - a.ego.monitor[0]) * 0.34)) / 2600);
  dust(ctx, hit.x, hit.y + 30, tl, t1, { n: 16, spread: 360, color: '255,210,120' });
  impactRing(ctx, hit.x, hit.y, tl, t1, { r: 260, color: '#ffc94a' });
  ctx.restore();
  const rw = prog(tl, 7 * B - 0.5, 7 * B);
  if (rw > 0) rewind(ctx, tl * 8, rw);
  seriesTag(ctx, SERIES, pop(tl, 1.0));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 92, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 505, 100, tl, 2 * B, { stagger: 0.1, rise: 60 });
}

// ------------------------------------------------------------------ 2. jour 1 : le lancement (plan large)
function bills(ctx, a, tl) {
  const s = a.ego.desk;
  for (let i = 0; i < 14; i++) {
    const t0 = 0.3 + i * 0.22, u = tl - t0; if (u < 0) continue;
    const x = s[0] + (hash(i) - 0.3) * 260 * u, y = s[1] - 60 - 380 * u + 420 * u * u;
    if (y > H) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(u * 6 * (hash(i + 3) - 0.5)); ctx.fillStyle = '#5fbf6a'; ctx.fillRect(-14, -8, 28, 16); ctx.fillStyle = '#2e6b35'; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
  }
}
function jour1(ctx, tl) {
  ctx.save();
  const aw = A.large_nuit, pan = ease.inOut(prog(tl, 0.2, 4.2)), z1 = 1.75;
  const a = plate(ctx, 'large_nuit', { z: z1, x: lerp(aw.ego.seat[0] + 120, aw.discipline.seat[0] + 40, pan), y: 1040 });
  screen(ctx, a.ego.monitor, (x, y, w, h) => scrZero(ctx, x, y, w, h, tl));
  screen(ctx, a.obsession.monitor, (x, y, w, h) => scrTabs(ctx, x, y, w, h, tl, Math.min(10, 1 + Math.floor(tl * 2.6))));
  screen(ctx, a.chance.monitor, () => {}, 1);
  screen(ctx, a.discipline.monitor, (x, y, w, h) => scrRec(ctx, x, y, w, h, tl, 1));
  bills(ctx, a, tl);
  member(ctx, a, 'ego', selfie, { t: tl, mouth: 'smirk', showLabel: true });
  if (Math.floor(tl * 2.4) % 3 === 0) { const h = headTop(a, 'ego'); glow(ctx, h[0] + 30, h[1] + 40, 60, '255,255,255', 0.7); }
  member(ctx, a, 'obsession', typing(tl, 22), { t: tl, mouth: 'grit', mood: 'angry', showLabel: true });
  member(ctx, a, 'chance', lounge, { t: tl, eyesClosed: true, showLabel: true });
  for (let z = 0; z < 3; z++) { const ph = (tl * 0.8 + z / 3) % 1, h = headTop(a, 'chance'); ctx.save(); ctx.globalAlpha = 1 - ph; ctx.font = `900 ${16 + z * 4}px Display`; ctx.fillStyle = '#7fdc9a'; ctx.fillText('z', h[0] + 20 + ph * 26, h[1] - ph * 60); ctx.restore(); }
  member(ctx, a, 'discipline', typing(tl, 6, 4), { t: tl, mouth: 'grit', mood: 'determined', showLabel: true });
  if (tl > 0.6) { const h = headTop(a, 'ego'); bubble(ctx, 'REGARDEZ MON LOGO !', h[0] + 40, h[1] - 40, tl, 0.6, { log, size: 30 }); }
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['1', RED]]);
  tip(ctx, 1, 'UN SEUL PRODUIT D’ABORD.', tl, 2.1);
}

// ------------------------------------------------------------------ 3. visite des bureaux, un par un
const TOUR = [
  { who: 'ego', beats: 4, tag: 'TOUT POUR L’IMAGE.' },
  { who: 'obsession', beats: 4, tag: '10 PROJETS, 0 FINI.' },
  { who: 'chance', beats: 4, tag: 'ELLE ATTEND LE BUZZ.' },
  { who: 'discipline', beats: 4, tag: 'UNE VIDÉO PAR JOUR.' },
];
let acc = 0; for (const s of TOUR) { s.t0 = acc * B; s.len = s.beats * B; acc += s.beats; }
function visite(ctx, tl) {
  let k = 0; for (let i = 0; i < TOUR.length; i++) if (tl >= TOUR[i].t0) k = i;
  const sh = TOUR[k], u = tl - sh.t0, pr = u / sh.len;
  ctx.save();
  const a = plate(ctx, sh.who, { z: 1.0 + 0.07 * pr, x: 540, y: 1050 });
  const r = a[sh.who].monitor, h = headTop(a, sh.who);
  if (sh.who === 'ego') {
    screen(ctx, r, (x, y, w, hh) => scrZero(ctx, x, y, w, hh, tl));
    neon(ctx, a, -1, 99);
    member(ctx, a, 'ego', selfie, { t: tl, mouth: 'smirk' });
    if (Math.floor(u * 3) % 2 === 0) glow(ctx, h[0] + 60, h[1] + 80, 140, '255,255,255', 0.75);
  } else if (sh.who === 'obsession') {
    screen(ctx, r, (x, y, w, hh) => scrTabs(ctx, x, y, w, hh, tl, 10));
    const p = typing(tl, 26, 16);
    member(ctx, a, 'obsession', p, { t: tl, mouth: 'grit', mood: 'angry' });
    sweat(ctx, a.obsession.seat[0], a.obsession.seat[1], p, tl * 2, { scale: scOf(a) });
    if (u > 0.1) bubble(ctx, 'ENCORE UN PROJET !', h[0] + 30, h[1] - 50, u, 0.1, { log });
  } else if (sh.who === 'chance') {
    const viral = ease.in(prog(u, 0.2, 1.6));
    screen(ctx, r, (x, y, w, hh) => scrHearts(ctx, x, y, w, hh, tl, viral * 999));
    for (let i = 0; i < 14; i++) { const ph = (u * 0.9 + hash(i)) % 1; if (u < 0.3) break; ctx.save(); ctx.globalAlpha = 1 - ph; ctx.fillStyle = '#ff4d6d'; ctx.font = '900 46px Display'; ctx.fillText('♥', r[0] + (r[2] - r[0]) * hash(i + 9), r[1] - ph * 260); ctx.restore(); }
    const up = ease.back(prog(u, 0.25, 0.6));
    member(ctx, a, 'chance', up > 0.5 ? { ...POSES.victory } : lounge, { t: tl, mouth: up > 0.5 ? 'happy' : null, eyesClosed: up < 0.5 });
    if (u > 0.3) bubble(ctx, 'JE SUIS VIRAL !', h[0] + 30, h[1] - 70, u, 0.3, { log });
  } else {
    screen(ctx, r, (x, y, w, hh) => scrCalendar(ctx, x, y, w, hh, 1 + Math.floor(prog(u, 0.2, 2.1) * 27)));
    member(ctx, a, 'discipline', typing(tl, 7, 6), { t: tl, mouth: 'grit', mood: 'determined' });
  }
  ctx.restore();
  card(ctx, sh.who, sh.tag, u);
  if (k === 3) tip(ctx, 2, 'PUBLIE CHAQUE JOUR.', u, 0.2);
}

// ------------------------------------------------------------------ 4. 3 h du matin : la première vente
function nuit(ctx, tl) {
  const z = 1.32 + 0.5 * ease.inOut(prog(tl, 0.4, 2.0));
  ctx.save();
  const a0 = A.large_nuit, fx = lerp(540, a0.discipline.seat[0] + 60, ease.inOut(prog(tl, 0.4, 2.0)));
  const a = plate(ctx, 'large_nuit', { z, x: fx, y: 1010 });
  screen(ctx, a.ego.monitor, (x, y, w, h) => scrZero(ctx, x, y, w, h, tl), 0.6);
  screen(ctx, a.obsession.monitor, () => {}, 1);
  screen(ctx, a.chance.monitor, (x, y, w, h) => scrHearts(ctx, x, y, w, h, tl, 999 * (1 - ease.out(prog(tl, 0, 0.8)))));
  const sale = 1.5;
  screen(ctx, a.discipline.monitor, (x, y, w, h) => { if (tl < sale) scrRec(ctx, x, y, w, h, tl, 30); else { ctx.fillStyle = '#e3342c'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#fff'; ctx.font = font(h, 0.3); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1re VENTE', x + w / 2, y + h / 2); } });
  if (tl > sale) { const m = a.discipline.monitor; glow(ctx, (m[0] + m[2]) / 2, (m[1] + m[3]) / 2, 160, '227,52,44', 0.5 * (1 - prog(tl, sale, sale + 1.5) * 0.5)); impactRing(ctx, (m[0] + m[2]) / 2, (m[1] + m[3]) / 2, tl, sale, { r: 120, color: '#ffffff' }); }
  member(ctx, a, 'ego', { ...POSES.sit, lean: 10, head: 36, armF: [70, 90], armB: [60, 90] }, { t: tl, mouth: 'sad' });
  member(ctx, a, 'obsession', slump, { t: tl, eyesClosed: true });
  member(ctx, a, 'chance', { ...lounge, head: 30 }, { t: tl, mouth: 'sad' });
  member(ctx, a, 'discipline', tl > sale ? { ...POSES.sit, lean: -6, head: -10, armF: [150, 20], armB: [40, 60] } : typing(tl, 6, 4), { t: tl, mouth: tl > sale ? 'happy' : 'grit', mood: 'determined' });
  if (tl > 0.4 && tl < sale + 0.1) { const h = headTop(a, 'discipline'); bubble(ctx, 'MERCI POUR VOTRE COMMANDE.', h[0] - 60, h[1] - 30, tl, 0.4, { log, size: 30 }); }
  ctx.restore();
  title(ctx, tl, [['3 H', '#f1f1f1']]);
  tip(ctx, 3, 'RÉPONDS À CHAQUE CLIENT.', tl, 0.5);
}

// ------------------------------------------------------------------ 5. jour 180 : l'aube
function aube(ctx, tl, extra = 0) {
  const T = tl + extra, z = 1.5 + 0.35 * ease.inOut(prog(T, 0.2, 3.8));
  ctx.save();
  const a0 = A.large_aube, fx = lerp(a0.ego.seat[0] + 160, a0.discipline.seat[0] + 80, ease.inOut(prog(T, 0.2, 3.8)));
  const a = plate(ctx, 'large_aube', { z, x: fx, y: 1010 });
  screen(ctx, a.ego.monitor, () => {}, 1);
  screen(ctx, a.obsession.monitor, () => {}, 1);
  screen(ctx, a.chance.monitor, (x, y, w, h) => scrGraph(ctx, x, y, w, h, 1, false));
  screen(ctx, a.discipline.monitor, (x, y, w, h) => scrGraph(ctx, x, y, w, h, ease.out(prog(T, 0.3, 2.6))));
  member(ctx, a, 'ego', { ...POSES.sit, lean: 6, head: 30 }, { t: T, mouth: 'sad' });
  member(ctx, a, 'obsession', slump, { t: T, eyesClosed: true });
  member(ctx, a, 'chance', { ...lounge, head: 26 }, { t: T, mouth: 'sad' });
  member(ctx, a, 'discipline', typing(T, 6, 4), { t: T, mouth: 'happy', mood: 'determined' });
  ctx.restore();
}
function aubeScene(ctx, tl) { aube(ctx, tl); title(ctx, tl, [['JOUR ', '#f1f1f1'], ['180', RED]]); }

// ------------------------------------------------------------------ 6. chute
function chute(ctx, tl) {
  aube(ctx, tl, 8 * B);
  topBand(ctx);
  kinetic(ctx, [['LE BUSINESS ', '#f1f1f1'], ['QUI SURVIT ?', '#9a9a9c']], 410, 60, tl, 0.1);
  kinetic(ctx, [['CELUI QUI REVIENT ', '#f1f1f1'], ['CHAQUE JOUR.', RED]], 505, 50, tl, 0.8, { rise: 60 });
}

// ------------------------------------------------------------------ compteur d'élimination (rétention : « qui va tenir ? »)
const OUT = { obsession: S.nuit + 0.35, chance: S.nuit + 0.9, ego: S.aube + 0.6 };
const ORDER = ['ego', 'obsession', 'chance', 'discipline'];
function tracker(ctx, t) {
  const show = clamp((t - 1.2) / 0.3) * (t < S.boucle ? 1 : 0);
  if (show <= 0) return;
  ctx.save(); ctx.globalAlpha = show; ctx.translate(826, 300); ctx.scale(1.25, 1.25); ctx.translate(-826, -300);
  const y = 300, x0 = 712;
  ctx.fillStyle = 'rgba(8,8,12,0.72)'; ctx.beginPath(); ctx.roundRect(x0 - 40, y - 42, 4 * 74 + 10, 84, 42); ctx.fill();
  ORDER.forEach((who, i) => {
    const c = CAST[who], x = x0 + i * 74, out = OUT[who] !== undefined && t >= OUT[who], k = out ? clamp((t - OUT[who]) / 0.25) : 0;
    const win = who === 'discipline' && t >= S.chute;
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
    if (out) {
      const s2 = 1.8 - 0.8 * ease.out(k); ctx.scale(s2, s2); ctx.strokeStyle = RED; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-22, -22); ctx.lineTo(22, 22); ctx.moveTo(22, -22); ctx.lineTo(-22, 22); ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();
}

// ------------------------------------------------------------------ boucle : avant la chute de l'enseigne (raccord parfait avec l'image 0)
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
  if (transition(ctx, t, renderAt, CUTS)) return;
  renderAt(ctx, t);
}
export const samples = (t) => (t < S.jour1 || t >= S.boucle ? 2 : 1);

// Lumière (lib/light.js) : lueur des écrans et des suspensions, rayons de la fenêtre à l'aube
export const post = cinema((t) => ({ threshold: 0.8, ...look(t) }));
function look(t) {
  if (t >= S.boucle || t < S.jour1) { const L = A.ego ? toScreen(...A.ego.ego.lamp) : { x: 540, y: 500 }; return { bloom: 1.0, rays: { x: L.x, y: L.y, strength: 0.6, color: '#ffc27a', radius: 0.03 }, fog: { density: 0.25, height: 0.35, color: '#1a1e30' }, warm: 1 }; }
  if (t < S.visite) return { bloom: 0.9, fog: { density: 0.2, height: 0.3, color: '#1a1e30' }, warm: 1 };
  if (t < S.nuit) { const who = TOUR.filter((s) => t - S.visite >= s.t0).pop()?.who || 'ego'; const L = A[who] ? toScreen(...A[who][who].lamp) : { x: 540, y: 500 }; return { bloom: 1.0, rays: { x: L.x, y: L.y, strength: 0.55, color: '#ffc27a', radius: 0.03 }, fog: { density: 0.2, height: 0.3, color: '#1a1e30' }, warm: 1 }; }
  if (t < S.aube) return { bloom: 1.1, fog: { density: 0.25, height: 0.3, color: '#1a1e30' }, warm: 0.9 };
  if (t < S.boucle) return { bloom: 0.9, rays: { x: 980, y: 520, strength: 0.7, color: '#ffb070', radius: 0.08 }, fog: { density: 0.2, height: 0.3, color: '#5a3a30' }, warm: 1.4 };
  return { bloom: 0.8 };
}

// Son : ambiance continue + temps forts (boum grave, notifications, caisse, cœur, buzzer d'élimination) + transitions.
const CUT_SFX = CUTS.flatMap((c) => c.type === 'whip' ? [{ t: c.t, sfx: 'whip', gain: 0.55 }] : c.type === 'glitch' ? [{ t: c.t, sfx: 'glitch', gain: 0.4, len: c.d }] : [{ t: c.t, sfx: 'whoosh', gain: 0.45, len: 0.3 }, { t: c.t + 0.1, sfx: 'sub', gain: 0.45 }]);
export const HITS = [
  { t: 0, sfx: 'room', gain: 0.55, len: S.end },
  ...CUT_SFX,
  // ouverture : l'enseigne lâche, tombe, s'écrase (boum), grésille ; l'Ego tire dessus
  { t: 0, sfx: 'whoosh', gain: 0.4, len: 0.3 }, { t: 0.3, sfx: 'sub', gain: 0.9 }, { t: 0.3, sfx: 'impact', gain: 0.45 }, { t: 0.32, sfx: 'shatter', gain: 0.4 },
  ...Array.from({ length: 6 }, (_, i) => ({ t: 0.5 + i * 0.37, sfx: 'tick', gain: 0.2 })), { t: 1.15, sfx: 'thud', gain: 0.25 }, { t: 1.45, sfx: 'thud', gain: 0.22 },
  { t: 2 * B, sfx: 'pop', gain: 0.3 }, { t: 7 * B - 0.4, sfx: 'riser', gain: 0.3, len: 0.6 },
  // jour 1 : frappe, billets qui s'envolent
  { t: S.jour1, sfx: 'type', gain: 0.3, len: 8 * B }, ...Array.from({ length: 7 }, (_, i) => ({ t: S.jour1 + 0.3 + i * 0.44, sfx: 'swish', gain: 0.18 })),
  { t: S.jour1 + 0.6, sfx: 'pop', gain: 0.3 }, { t: S.jour1 + 2.1, sfx: 'pop', gain: 0.3 },
  // visite : l'Ego (déclencheur photo), l'Obsession (frappe + onglets), la Chance (notifications en cascade), Discipline (régulier)
  ...TOUR.map((s) => ({ t: S.visite + s.t0 + 0.05, sfx: 'pop', gain: 0.22 })),
  ...Array.from({ length: 5 }, (_, i) => ({ t: S.visite + 0.3 + i * 0.33, sfx: 'click', gain: 0.25 })),
  { t: S.visite + TOUR[1].t0, sfx: 'type', gain: 0.45, len: TOUR[1].len }, ...Array.from({ length: 4 }, (_, i) => ({ t: S.visite + TOUR[1].t0 + 0.2 + i * 0.4, sfx: 'notif', gain: 0.14, len: 0.8 })),
  { t: S.visite + TOUR[2].t0 + 0.3, sfx: 'boing', gain: 0.3 }, ...Array.from({ length: 9 }, (_, i) => ({ t: S.visite + TOUR[2].t0 + 0.35 + i * 0.16, sfx: 'notif', gain: 0.16, len: 1 + i * 0.06 })),
  { t: S.visite + TOUR[3].t0, sfx: 'type', gain: 0.22, len: TOUR[3].len }, ...Array.from({ length: 4 }, (_, i) => ({ t: S.visite + TOUR[3].t0 + 0.3 + i * 0.4, sfx: 'tick', gain: 0.3 })),
  // 3 h : cœur qui bat, deux éliminations, la première vente
  ...Array.from({ length: 3 }, (_, i) => ({ t: S.nuit + 0.05 + i * 0.7, sfx: 'heart', gain: 0.45 })),
  { t: OUT.obsession, sfx: 'buzz', gain: 0.5 }, { t: OUT.obsession, sfx: 'impact', gain: 0.25 },
  { t: OUT.chance, sfx: 'buzz', gain: 0.5 }, { t: OUT.chance, sfx: 'impact', gain: 0.25 },
  { t: S.nuit + 0.4, sfx: 'pop', gain: 0.25 }, { t: S.nuit + 0.5, sfx: 'pop', gain: 0.25 },
  { t: S.nuit + 1.5, sfx: 'cash', gain: 0.55 }, { t: S.nuit + 1.5, sfx: 'notif', gain: 0.3 }, { t: S.nuit + 1.5, sfx: 'sub', gain: 0.35 },
  // jour 180 : l'Ego éliminé, les commandes arrivent
  { t: OUT.ego, sfx: 'buzz', gain: 0.5 }, { t: OUT.ego, sfx: 'impact', gain: 0.25 },
  ...Array.from({ length: 7 }, (_, i) => ({ t: S.aube + 1.0 + i * 0.32, sfx: 'notif', gain: 0.15, len: 1 + i * 0.05 })), { t: S.aube + 3.1, sfx: 'cash', gain: 0.45 },
  // chute
  { t: S.chute + 0.1, sfx: 'sub', gain: 0.6 }, { t: S.chute + 0.1, sfx: 'impact', gain: 0.3 }, { t: S.chute + 0.8, sfx: 'sub', gain: 0.5 }, { t: S.chute + 0.8, sfx: 'ding', gain: 0.3 },
  // boucle
  { t: S.boucle + 0.15, sfx: 'pop', gain: 0.3 },
];
