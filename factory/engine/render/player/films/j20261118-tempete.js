// « La tempête » — film ORIGINAL, série Toi contre toi #6. Les quatre traits de caractère construisent
// chacun leur maison. DISCIPLINE pose une brique par jour, L'EGO peint une façade en carton,
// L'OBSESSION empile sans dormir une tour bancale, LA CHANCE trouve une tente.
// Une nuit, l'orage arrive : seule la maison de briques tient, et Discipline ouvre la porte aux autres.
// Ouverture in medias res : la foudre fait tomber la tour à l'image 0, puis retour au jour 1.
// Lumière : lib/light.js (bloom, rayons, brouillard animé) réglée scène par scène.
import { W, H, timeline, topBand, POSES, COLORS, clamp, prog, ease, pop, lerp, noise, VARIANT, seriesTag, endCard, camera, dust, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
import { lerpPose } from '../lib/stick.js';
import { gait, gaitSteps, bake, drawBaked, choreo } from '../lib/anim.js';
import { glow, bubble, rain, rewind, lightCone, sweat } from '../lib/world.js';
import { drawMember } from '../lib/cast.js';
import { cinema } from '../lib/light.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['eclair', 7], ['jour1', 9], ['jour60', 9], ['alerte', 6], ['tempete', 10], ['refuge', 6], ['chute', 5], ['outro', 5]]);
export const DURATION = S.end;
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #6', HANDLE = null, SC = 0.6, LEG = 158 * SC, G = 1300;
const log = (s) => TEXTLOG.frame.push(s);

export const SCRIPT = {
  premiere: 'chute',
  accroche: VARIANT === 'b' ? ['QUI RESTE', 'DEBOUT ?'] : ['UNE TEMPÊTE.', '4 MAISONS.'],
  structure: ['ouverture', 'conflit', 'effort', 'progression', 'obstacle', 'retournement', 'chute'],
  dialogues: ['ÇA FAIT RICHE, NON ?', 'PAS LE TEMPS DE DORMIR !', 'J’AI TROUVÉ UNE TENTE !', 'C’ÉTAIT DU CARTON…'],
  conseils: ['UNE BRIQUE PAR JOUR.', 'LES FONDATIONS AVANT LA DÉCO.', 'RÉPARE LES FISSURES TÔT.'],
  details: ['JOUR 1', 'JOUR 60', '22 H', 'ALERTE ORAGE', 'tente', 'façade en carton'],
  chute: ['LA TEMPÊTE NE PRÉVIENT PAS.', 'CONSTRUIS AVANT.'],
};

// ------------------------------------------------------------------ positions des quatre terrains
const EGO_X = 140, EGO_C = 300;      // façade (centre) + personnage
const TOW_X = 410, OBS_C = 480;      // tour + personnage
const TENT_X = 665;                  // hamac / tente
const HOUSE_X = 915, DIS_C = 775;    // maison de briques + personnage

// Caméra : plans rapprochés qui passent d'un terrain à l'autre. keys = [[t, centreX, zoom], …] (transition 0,4 s).
// CAM garde le cadrage de l'image courante pour placer les rayons de lumière (post) au bon endroit à l'écran.
let CAM = { x: 540, y: 1180, z: 1 };
function shot(ctx, tl, keys, y = 1180) {
  let x = keys[0][1], z = keys[0][2];
  for (let i = 1; i < keys.length; i++) { const k = ease.inOut(prog(tl, keys[i][0], keys[i][0] + 0.4)); x = lerp(x, keys[i][1], k); z = lerp(z, keys[i][2], k); }
  const half = W / (2 * z); x = clamp(x, half, W - half);
  CAM = { x, y, z }; camera(ctx, { zoom: z, x, y });
}
const toScreen = (wx, wy) => ({ x: (wx - CAM.x) * CAM.z + CAM.x, y: (wy - CAM.y) * CAM.z + CAM.y });
const ROWS = 9, PER = 5, BW = 50, BH = 32, HW = PER * BW; // maison : 9 rangées de 5 briques
const TB = { w: 70, h: 34 };          // briques de la tour

function tip(ctx, n, text, tl, t0) {
  const k = pop(tl, t0, 0.3);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 1460); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
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

// ------------------------------------------------------------------ décor : ciel, collines, nuages, sol
const SKIES = {
  dusk: ['#1a1424', '#5a3040', '#c0674a'],
  evening: ['#0b0d1a', '#1c2038', '#3a3550'],
  night: ['#06070d', '#10131f', '#1a1d2a'],
  storm: ['#05060a', '#0d1018', '#161a24'],
};
function land(ctx, t, mood, { wind = 0, flash = 0 } = {}) {
  const [a, b, c] = SKIES[mood];
  const g = ctx.createLinearGradient(0, 0, 0, G); g.addColorStop(0, a); g.addColorStop(0.65, b); g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, G);
  if (mood === 'dusk') { glow(ctx, 160, 1050, 520, '255,170,110', 0.45); ctx.fillStyle = '#ffcf8a'; ctx.beginPath(); ctx.arc(160, 1060, 60, 0, 7); ctx.fill(); }
  if (mood === 'evening') { ctx.fillStyle = '#e9ecff'; ctx.beginPath(); ctx.arc(860, 420, 46, 0, 7); ctx.fill(); glow(ctx, 860, 420, 260, '200,215,255', 0.3); }
  if (mood === 'evening' || mood === 'night') for (let i = 0; i < 40; i++) { const x = (i * 271) % W, y = 300 + ((i * 137) % 600), tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i)); ctx.fillStyle = `rgba(255,255,255,${(0.35 * tw).toFixed(2)})`; ctx.fillRect(x, y, 3, 3); }
  // nuages qui défilent (plus vite avec le vent)
  const nc = mood === 'storm' ? 9 : mood === 'night' ? 6 : 4;
  for (let i = 0; i < nc; i++) {
    const sp = 18 + wind * 160 + i * 4, x = ((i * 397 + t * sp) % (W + 700)) - 350, y = 290 + (i % 4) * 95;
    ctx.fillStyle = mood === 'storm' ? `rgba(${30 + flash * 120},${34 + flash * 120},${48 + flash * 130},0.9)` : mood === 'dusk' ? 'rgba(120,60,80,0.45)' : 'rgba(40,44,70,0.6)';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + k * 85, y + Math.sin(i + k) * 18, 120, 46, 0, 0, 7); ctx.fill(); }
  }
  // collines lointaines + fermes éclairées
  ctx.fillStyle = mood === 'dusk' ? '#2a1c2a' : '#0e1018';
  ctx.beginPath(); ctx.moveTo(0, G); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 1130 + Math.sin(x * 0.006 + 1) * 40 + Math.sin(x * 0.017) * 14); ctx.lineTo(W, G); ctx.fill();
  for (const [x, y] of [[90, 1160], [560, 1150], [780, 1175]]) { ctx.fillStyle = 'rgba(255,200,120,0.85)'; ctx.fillRect(x, y, 8, 6); glow(ctx, x + 4, y + 3, 30, '255,190,110', 0.4); }
  ctx.fillStyle = mood === 'dusk' ? '#1c1418' : '#0a0b10';
  ctx.beginPath(); ctx.moveTo(0, G); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 1215 + Math.sin(x * 0.009 + 3) * 22); ctx.lineTo(W, G); ctx.fill();
  // sol
  ctx.fillStyle = '#121216'; ctx.fillRect(0, G, W, H - G);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, G, W, 4);
  // herbes qui plient avec le vent
  ctx.strokeStyle = 'rgba(70,80,70,0.8)'; ctx.lineWidth = 3;
  for (let i = 0; i < 46; i++) { const x = (i * 23.7) % W, bend = Math.sin(t * (2 + wind * 6) + i) * (4 + wind * 22) + wind * 18; ctx.beginPath(); ctx.moveTo(x, G); ctx.quadraticCurveTo(x + bend * 0.4, G - 14, x + bend, G - 26 - (i % 3) * 6); ctx.stroke(); }
}

function bolt(ctx, x1, y2, seed, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#eef2ff'; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.shadowColor = '#9fb6ff'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.moveTo(x1 + 120, 280); let x = x1 + 120;
  for (let y = 280; y < y2; y += 70) { x += (noise(seed * 13 + y, 3) * 90) - (x - x1) * 0.35; ctx.lineTo(x, y); }
  ctx.lineTo(x1, y2); ctx.stroke(); ctx.restore();
}

// ------------------------------------------------------------------ les quatre « maisons »
// DISCIPLINE : maison de briques. p = part des briques posées (0 → 1), lit = fenêtre allumée, door = ouverture.
function house(ctx, p, { lit = 0, door = 0, crack = 0 } = {}) {
  const x0 = HOUSE_X - HW / 2, nb = Math.floor(p * ROWS * PER + 1e-6);
  ctx.fillStyle = '#4a4a4e'; ctx.fillRect(x0 - 14, G - 12, HW + 28, 12); // fondations
  for (let i = 0; i < nb; i++) {
    const r = Math.floor(i / PER), c = i % PER, off = r % 2 ? BW / 2 : 0;
    const x = x0 + c * BW + off - (r % 2 && c === PER - 1 ? 0 : 0), y = G - 12 - (r + 1) * BH;
    const w = r % 2 && c === PER - 1 ? BW / 2 : BW;
    ctx.fillStyle = (r + c) % 3 === 0 ? '#8a3b30' : (r + c) % 3 === 1 ? '#9c4537' : '#7e352c';
    ctx.fillRect(x + 2, y + 2, w - 4, BH - 4);
    if (r % 2 && c === 0) { ctx.fillRect(x0 + 2, y + 2, BW / 2 - 4, BH - 4); }
  }
  const top = G - 12 - ROWS * BH;
  if (nb >= 4 * PER) {
    // porte (s'ouvre vers l'intérieur : le battant rétrécit, la lumière chaude sort)
    const dx = HOUSE_X - 30, dy = G - 12 - 3 * BH - 10, dw = 60, dh = 3 * BH + 10;
    if (door > 0) { ctx.fillStyle = '#ffd38a'; ctx.fillRect(dx, dy, dw, dh); glow(ctx, HOUSE_X, G - 50, 260 * door, '255,200,120', 0.55 * door); }
    ctx.fillStyle = '#3b2618'; ctx.fillRect(dx, dy, dw * (1 - 0.8 * door), dh);
    ctx.fillStyle = '#c9a25a'; ctx.beginPath(); ctx.arc(dx + dw * (1 - 0.8 * door) - 10, dy + dh / 2, 4, 0, 7); ctx.fill();
  }
  if (nb >= 7 * PER) {
    const wx = HOUSE_X + 50, wy = G - 12 - 7 * BH + 6, ww = 62, wh = 2 * BH - 12;
    ctx.fillStyle = lit ? `rgb(${Math.round(lerp(20, 255, lit))},${Math.round(lerp(22, 205, lit))},${Math.round(lerp(30, 130, lit))})` : '#16181f';
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#2a1a12'; ctx.fillRect(wx + ww / 2 - 3, wy, 6, wh); ctx.fillRect(wx, wy + wh / 2 - 3, ww, 6);
    if (lit) glow(ctx, wx + ww / 2, wy + wh / 2, 150, '255,200,120', 0.4 * lit);
  }
  if (p >= 0.999) {
    // toit
    ctx.fillStyle = '#2c2c31'; ctx.beginPath(); ctx.moveTo(x0 - 30, top); ctx.lineTo(HOUSE_X, top - 130); ctx.lineTo(x0 + HW + 30, top); ctx.fill();
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(x0 + HW - 60, top - 100, 30, 70);
  }
  if (crack > 0) {
    ctx.strokeStyle = `rgba(10,10,12,${crack.toFixed(2)})`; ctx.lineWidth = 5; ctx.beginPath();
    ctx.moveTo(x0 + 40, top + 60); ctx.lineTo(x0 + 62, top + 92); ctx.lineTo(x0 + 50, top + 120); ctx.lineTo(x0 + 72, top + 150); ctx.stroke();
  }
}

// L'EGO : façade dorée en carton. p = peinte (0 → 1) ; fall = chute vers la gauche (0 → 1) ; lights = guirlande.
function facade(ctx, t, { p = 1, fall = 0, lights = 0, flash = 0 } = {}) {
  const w = 250, h = 430, x0 = EGO_X - w / 2;
  // derrière la façade : deux tasseaux… et rien d'autre
  ctx.fillStyle = '#5a4630'; ctx.save(); ctx.translate(EGO_X + 40, G); ctx.rotate(-0.5); ctx.fillRect(-6, -260, 12, 260); ctx.restore();
  ctx.save(); ctx.translate(EGO_X - 60, G); ctx.rotate(-0.35); ctx.fillRect(-6, -220, 12, 220); ctx.restore();
  ctx.save(); ctx.translate(x0, G); ctx.rotate(-Math.PI / 2 * ease.in(fall)); ctx.translate(-x0, -G);
  ctx.beginPath(); ctx.rect(x0 - 10, G - h * p - 10, w + 20, h * p + 10); ctx.clip();
  ctx.fillStyle = '#b8984a'; ctx.fillRect(x0, G - h, w, h);
  ctx.fillStyle = '#2a2418'; ctx.fillRect(x0 + 18, G - h + 70, w - 36, h - 70);
  ctx.fillStyle = '#b8984a'; for (const cx of [x0 + 18, x0 + w - 42]) ctx.fillRect(cx, G - h + 70, 24, h - 70); // colonnes
  ctx.fillStyle = '#c9a850'; ctx.beginPath(); ctx.moveTo(x0 - 10, G - h + 70); ctx.lineTo(EGO_X, G - h - 20); ctx.lineTo(x0 + w + 10, G - h + 70); ctx.fill();
  ctx.fillStyle = 'rgba(200,160,80,0.75)'; for (const [dx, dy] of [[60, 140], [150, 140], [60, 250], [150, 250]]) ctx.fillRect(x0 + dx, G - h + dy, 40, 60);
  ctx.fillStyle = '#5a4630'; ctx.fillRect(EGO_X - 26, G - 110, 52, 110);
  ctx.font = '900 30px Display'; ctx.textAlign = 'center'; ctx.fillStyle = '#2a2418'; ctx.fillText('VILLA', EGO_X, G - h + 58);
  if (lights > 0) for (let i = 0; i < 9; i++) {
    const bx = x0 - 6 + i * (w + 12) / 8, by = G - h + 72 + Math.sin(i * 0.9) * 6, on = (Math.floor(t * 4) + i) % 3 !== 0 ? 1 : 0.4;
    const col = ['255,90,80', '255,210,90', '120,220,255'][i % 3];
    ctx.fillStyle = `rgba(${col},${(lights * on).toFixed(2)})`; ctx.beginPath(); ctx.arc(bx, by, 7, 0, 7); ctx.fill();
    glow(ctx, bx, by, 40, col, 0.5 * lights * on);
  }
  if (flash) { ctx.fillStyle = `rgba(200,210,255,${0.25 * flash})`; ctx.fillRect(x0, G - h, w, h); }
  ctx.restore();
}

// L'OBSESSION : tour de briques bancale. n = nombre de briques ; wob = oscillation.
const towerPos = (i) => ({ x: TOW_X + Math.sin(i * 0.33) * 14 + i * 1.6, y: G - (i + 0.5) * TB.h, a: Math.sin(i * 0.5) * 0.05 });
function tower(ctx, n, t, wob = 0) {
  for (let i = 0; i < n; i++) {
    const p = towerPos(i), sway = Math.sin(t * 3) * wob * (i / 22) ** 2 * 26;
    ctx.save(); ctx.translate(p.x + sway, p.y); ctx.rotate(p.a + sway * 0.004);
    ctx.fillStyle = i % 2 ? '#6a5a7a' : '#7a6a8c'; ctx.fillRect(-TB.w / 2 + 2, -TB.h / 2 + 2, TB.w - 4, TB.h - 4); ctx.restore();
  }
}
const TOWER_N = 24;
let TOWER = null;
function towerBake() {
  if (TOWER) return TOWER;
  TOWER = bake((M) => Array.from({ length: TOWER_N }, (_, i) => {
    const p = towerPos(i);
    const body = M.Bodies.rectangle(p.x, p.y, TB.w - 4, TB.h - 4, { angle: p.a, restitution: 0.2, friction: 0.6 });
    M.Body.setVelocity(body, { x: 0.6 + i * 0.32, y: -0.2 * (i % 3) });
    M.Body.setAngularVelocity(body, 0.01 * (i % 5) - 0.015);
    return { body, w: TB.w - 4, h: TB.h - 4, color: i % 2 ? '#6a5a7a' : '#7a6a8c' };
  }), { duration: 4, ground: G });
  return TOWER;
}

// LA CHANCE : hamac (jour 1), puis tente (trouvée), qui s'envole dans la tempête.
function hammock(ctx) {
  ctx.strokeStyle = '#6a5a40'; ctx.lineWidth = 9;
  for (const x of [TENT_X - 70, TENT_X + 70]) { ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x, G - 150); ctx.stroke(); }
  ctx.strokeStyle = '#b7e4c2'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(TENT_X - 70, G - 140); ctx.quadraticCurveTo(TENT_X, G - 40, TENT_X + 70, G - 140); ctx.stroke();
}
function tent(ctx, k = 1, fly = 0) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(TENT_X + fly * fly * 1400, G - fly * 700); ctx.rotate(fly * 5); ctx.scale(k, k);
  ctx.fillStyle = '#3f8f5a'; ctx.beginPath(); ctx.moveTo(-110, 0); ctx.lineTo(0, -140); ctx.lineTo(110, 0); ctx.fill();
  ctx.fillStyle = '#2b6a40'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(0, -80); ctx.lineTo(26, 0); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ 1. ouverture : la foudre fait tomber la tour (image 0)
const HOOK = VARIANT === 'b' ? [[['QUI RESTE', '#f1f1f1']], [['DEBOUT ?', RED]]] : [[['UNE TEMPÊTE.', '#f1f1f1']], [['4 ', RED], ['MAISONS.', '#f1f1f1']]];
const OPEN = choreo({ zoom: 1.3 }, (tl, s) => { tl.to(s, { zoom: 1.05, duration: 0.6, ease: 'expo.out' }, 0); });
function storm(ctx, tl, { strike = null, rainA = 0.5 } = {}) {
  const flash = strike !== null && tl >= strike && tl < strike + 0.25 ? (tl - strike < 0.08 ? 1 : tl - strike > 0.14 && tl - strike < 0.2 ? 0.6 : 0) : 0;
  const ambient = ((tl + 1.7) % 3.1) < 0.07 ? 0.5 : 0;
  land(ctx, tl, 'storm', { wind: 1, flash: Math.max(flash, ambient) });
  return Math.max(flash, ambient);
}
function eclair(ctx, tl) {
  const c = OPEN(tl);
  ctx.save(); CAM = { x: 540, y: 1150, z: c.zoom }; camera(ctx, { zoom: c.zoom, x: 540, y: 1150 });
  const f = storm(ctx, tl, { strike: 0 });
  facade(ctx, tl, { lights: 0.8, flash: f });
  tent(ctx, 1);
  house(ctx, 1, { lit: 1 });
  if (tl < 0.05) tower(ctx, TOWER_N, tl, 0.5); else drawBaked(ctx, towerBake().at(tl - 0.05));
  if (tl < 0.25) bolt(ctx, TOW_X + 20, G - TOWER_N * TB.h, 7, tl < 0.08 ? 1 : 0.5);
  impactRing(ctx, TOW_X, G - TOWER_N * TB.h, tl, 0.02, { r: 240, color: '#cfdcff' });
  dust(ctx, TOW_X + 160, G, tl, 0.9, { n: 14, spread: 320 });
  // L'OBSESSION voit sa tour tomber : recule, tombe assise
  const back = ease.out(prog(tl, 0.1, 0.6));
  drawMember(ctx, 'obsession', OBS_C - 60 * back, G - LEG + 50 * SC * back, lerpPose(POSES.stand, POSES.sit, back), { scale: SC, t: tl, ground: G, mouth: 'open', mood: 'sad', showLabel: false });
  rain(ctx, tl, { n: 170, angle: 0.4, speed: 2600, a: 0.45 });
  ctx.restore();
  if (f) { ctx.fillStyle = `rgba(200,212,255,${(0.35 * f).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
  // retour en arrière vers le jour 1
  const rw = prog(tl, 7 * B - 0.5, 7 * B);
  if (rw > 0) rewind(ctx, tl * 8, rw);
  seriesTag(ctx, SERIES, pop(tl, 1.0));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 86, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 500, 100, tl, 2 * B, { stagger: 0.1, rise: 60 });
}

// ------------------------------------------------------------------ 2. jour 1 : chacun commence
const placed = (tl, every, t0 = 0.3) => Math.max(0, Math.floor((tl - t0) / every) + 1);
function jour1(ctx, tl) {
  ctx.save(); shot(ctx, tl, [[0, 540, 1], [0.7, 330, 1.6], [2.4, 760, 1.6], [3.6, 540, 1.05]]);
  land(ctx, tl, 'dusk');
  // L'EGO peint sa façade (vite et beau)
  const paint = ease.out(prog(tl, 0.1, 2.0));
  facade(ctx, tl, { p: paint });
  const brushY = G - 430 * paint;
  drawMember(ctx, 'ego', EGO_C, G - LEG, { ...POSES.stand, armF: [-150 + Math.sin(tl * 14) * 20, -20], head: -10 }, { scale: SC, t: tl, ground: G, mouth: 'smirk', face: -1 });
  ctx.fillStyle = '#e9c75a'; ctx.fillRect(EGO_C - 70, Math.max(brushY, G - LEG - 140), 18, 34);
  // L'OBSESSION empile à toute vitesse
  const nT = Math.min(14, placed(tl, 0.28, 0.1));
  tower(ctx, nT, tl, 0.2);
  const arm = Math.sin(tl * 22);
  drawMember(ctx, 'obsession', OBS_C, G - LEG, { ...POSES.stand, lean: 8, armF: [150 + arm * 25, 20], armB: [120 - arm * 25, 30], head: -18 }, { scale: SC, t: tl, ground: G, mouth: 'grit', mood: 'angry' });
  // LA CHANCE fait la sieste dans un hamac
  hammock(ctx);
  drawMember(ctx, 'chance', TENT_X + 5, G - 95, POSES.lie, { scale: SC, t: tl, eyesClosed: true });
  for (let z = 0; z < 3; z++) { const ph = (tl * 0.8 + z / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - ph; ctx.font = `900 ${26 + z * 6}px Display`; ctx.fillStyle = '#7fdc9a'; ctx.fillText('z', TENT_X + 10 + ph * 40, G - 190 - ph * 100); ctx.restore(); }
  // DISCIPLINE pose ses premières briques, une à la fois
  const nb = Math.min(4, placed(tl, 0.95, 0.5));
  house(ctx, nb / (ROWS * PER));
  const cyc = ((tl - 0.5) % 0.95 + 0.95) % 0.95 / 0.95, bend = Math.sin(cyc * Math.PI);
  drawMember(ctx, 'discipline', DIS_C, G - LEG + bend * 30 * SC, lerpPose(POSES.stand, POSES.crouch, bend * 0.8), { scale: SC, t: tl, ground: G, mouth: 'grit', mood: 'determined' });
  if (bend > 0.2) { ctx.fillStyle = '#9c4537'; ctx.fillRect(DIS_C + 30, G - LEG + 20 - bend * 10, 46, 26); }
  if (tl > 1.0) bubble(ctx, 'ÇA FAIT RICHE, NON ?', EGO_C - 20, G - LEG - 200, tl, 1.0, { log });
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['1', RED]]);
  tip(ctx, 1, 'UNE BRIQUE PAR JOUR.', tl, 2.1);
}

// ------------------------------------------------------------------ 3. jour 60 : ce qui se voit / ce qui tient
function jour60(ctx, tl) {
  ctx.save(); shot(ctx, tl, [[0, 360, 1.5], [2.0, 720, 1.5], [3.6, 540, 1.05]]);
  land(ctx, tl, 'evening');
  facade(ctx, tl, { lights: 1 });
  lightCone(ctx, EGO_X, 520, G, 300, { color: '255,220,150', a: 0.08 });
  // L'EGO : selfies devant la façade
  drawMember(ctx, 'ego', EGO_C, G - LEG, { ...POSES.stand, lean: -6, armF: [150, 30], armB: [30, 60], head: -8 }, { scale: SC, t: tl, ground: G, mouth: 'smirk', face: -1, showLabel: false });
  if (Math.floor(tl * 2.4) % 3 === 0) glow(ctx, EGO_C - 40, G - LEG - 120, 100, '255,255,255', 0.6);
  // L'OBSESSION : tour immense, sans dormir
  tower(ctx, TOWER_N, tl, 1);
  drawMember(ctx, 'obsession', OBS_C, G - LEG, { ...POSES.stand, lean: 10, head: -26, armF: [160, 10], armB: [130, 20] }, { scale: SC, t: tl, ground: G, mouth: 'grit', mood: 'angry', showLabel: false });
  sweat(ctx, OBS_C, G - LEG, POSES.stand, tl * 2, { scale: SC });
  // LA CHANCE : trouve une tente, elle se déplie toute seule
  const tk = ease.back(prog(tl, 1.9, 2.3));
  if (tl < 1.9) hammock(ctx);
  tent(ctx, tk);
  drawMember(ctx, 'chance', TENT_X - 90, G - LEG, tl < 1.9 ? { ...POSES.stand, head: 20, armF: [40, 60] } : POSES.victory, { scale: SC, t: tl, ground: G, mouth: 'happy', showLabel: false });
  // DISCIPLINE : les murs montent, toujours au même rythme
  const p = (36 + Math.min(6, placed(tl, 0.7, 0.4))) / (ROWS * PER);
  house(ctx, p);
  const cyc = ((tl - 0.4) % 0.7 + 0.7) % 0.7 / 0.7, up = Math.sin(cyc * Math.PI);
  drawMember(ctx, 'discipline', DIS_C, G - LEG, { ...POSES.stand, armF: [-60 - up * 90, -20], armB: [-40 - up * 80, -20], head: -10 }, { scale: SC, t: tl, ground: G, mouth: 'grit', mood: 'determined', showLabel: false });
  if (tl > 0.2 && tl < 2.1) bubble(ctx, 'PAS LE TEMPS DE DORMIR !', OBS_C - 40, G - LEG - 210, tl, 0.2, { log });
  if (tl > 2.2) bubble(ctx, 'J’AI TROUVÉ UNE TENTE !', TENT_X - 40, G - LEG - 210, tl, 2.2, { log });
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['60', RED]]);
  tip(ctx, 2, 'LES FONDATIONS AVANT LA DÉCO.', tl, 2.4);
}

// ------------------------------------------------------------------ 4. 22 h : alerte orage
function alerte(ctx, tl) {
  ctx.save(); shot(ctx, tl, [[0, 540, 1.05], [0.3, 760, 1.45]]);
  land(ctx, tl, 'night', { wind: 0.45 });
  facade(ctx, tl, { lights: 1 });
  drawMember(ctx, 'ego', EGO_C, G - LEG, { ...POSES.stand, lean: -6, armF: [150, 30], armB: [30, 60], head: -8 }, { scale: SC, t: tl, ground: G, mouth: 'smirk', face: -1, showLabel: false });
  if (Math.floor(tl * 2.4) % 3 === 1) glow(ctx, EGO_C - 40, G - LEG - 120, 100, '255,255,255', 0.6);
  tower(ctx, TOWER_N, tl, 1.6);
  drawMember(ctx, 'obsession', OBS_C, G - LEG + 50 * SC, { ...POSES.sit, head: 34 }, { scale: SC, t: tl, ground: G, eyesClosed: true, showLabel: false });
  tent(ctx, 1);
  // DISCIPLINE vérifie le mur et rebouche la fissure avant l'orage
  house(ctx, 1, { lit: 0.6, crack: 1 - prog(tl, 1.2, 1.8) });
  const fix = prog(tl, 0.6, 1.8), dab = Math.sin(tl * 16) * (fix > 0 && fix < 1 ? 1 : 0);
  drawMember(ctx, 'discipline', HOUSE_X - HW / 2 - 50, G - LEG, { ...POSES.stand, armF: [-150 + dab * 12, -10], head: -24 }, { scale: SC, t: tl, ground: G, mood: 'determined', mouth: 'grit', face: 1, showLabel: false });
  rain(ctx, tl, { n: 50, angle: 0.25, a: 0.25 });
  ctx.restore();
  topBand(ctx);
  kinetic(ctx, [['22 H : ', '#f1f1f1'], ['ALERTE ORAGE', RED]], 420, 70, tl, 0.05);
  tip(ctx, 3, 'RÉPARE LES FISSURES TÔT.', tl, 0.8);
}

// ------------------------------------------------------------------ 5. la tempête
const STRIKE = 2.6;
function tempete(ctx, tl) {
  const shake = tl > STRIKE && tl < STRIKE + 0.4 ? 10 * (1 - (tl - STRIKE) / 0.4) : 0;
  ctx.save(); ctx.translate(noise(tl * 60, 2) * shake, noise(tl * 60, 4) * shake);
  shot(ctx, tl, [[0, 640, 1.3], [1.0, 360, 1.5], [2.4, 540, 1.1]]);
  const f = storm(ctx, tl, { strike: STRIKE });
  // la façade de l'EGO tombe : derrière, il n'y a rien
  const fall = prog(tl, 1.2, 1.7);
  facade(ctx, tl, { fall, lights: 1 - fall, flash: f });
  drawMember(ctx, 'ego', EGO_C, G - LEG, fall > 0.3 ? { ...POSES.sad, head: 30 } : { ...POSES.stand, head: -6 }, { scale: SC, t: tl, ground: G, mouth: fall > 0.3 ? 'sad' : 'open', face: -1, showLabel: false });
  // la tente de LA CHANCE s'envole, elle court après
  const fly = prog(tl, 0.35, 1.6);
  tent(ctx, 1, fly);
  const gC = gait(Math.max(0, tl - 0.5), { x0: TENT_X - 60, speed: 520, ground: G, scale: SC, run: true });
  if (gC.x < W + 100) drawMember(ctx, 'chance', gC.x, gC.y, gC.pose, { scale: SC, t: tl, ground: G, mouth: 'open', showLabel: false });
  // la foudre frappe la tour de l'OBSESSION (rappel de l'ouverture)
  if (tl < STRIKE) tower(ctx, TOWER_N, tl, 2.2); else drawBaked(ctx, towerBake().at(tl - STRIKE));
  if (tl > STRIKE && tl < STRIKE + 0.25) bolt(ctx, TOW_X + 20, G - TOWER_N * TB.h, 11, tl - STRIKE < 0.08 ? 1 : 0.5);
  impactRing(ctx, TOW_X, G - TOWER_N * TB.h, tl, STRIKE + 0.02, { r: 240, color: '#cfdcff' });
  dust(ctx, TOW_X + 160, G, tl, STRIKE + 0.9, { n: 14, spread: 320 });
  const back = ease.out(prog(tl, STRIKE + 0.1, STRIKE + 0.6));
  drawMember(ctx, 'obsession', OBS_C - 60 * back, G - LEG + 50 * SC * back, lerpPose(POSES.stand, POSES.sit, back), { scale: SC, t: tl, ground: G, mouth: 'open', mood: 'sad', showLabel: false });
  // la maison de briques tient ; DISCIPLINE est à l'abri, la fenêtre reste allumée
  house(ctx, 1, { lit: 1 });
  rain(ctx, tl, { n: 190, angle: 0.45, speed: 2700, a: 0.5 });
  if (tl > 1.6) bubble(ctx, 'C’ÉTAIT DU CARTON…', EGO_C, G - LEG - 210, tl, 1.6, { log });
  ctx.restore();
  if (f) { ctx.fillStyle = `rgba(200,212,255,${(0.3 * f).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ 6. le refuge : Discipline ouvre la porte
function refuge(ctx, tl) {
  ctx.save(); shot(ctx, tl, [[0, 540, 1.05], [0.3, 700, 1.3]]);
  land(ctx, tl, 'storm', { wind: 0.6 });
  facade(ctx, tl, { fall: 1 });
  drawBaked(ctx, towerBake().at(4));
  const door = ease.out(prog(tl, 0.2, 0.7));
  house(ctx, 1, { lit: 1, door });
  // DISCIPLINE dans l'encadrement de la porte
  drawMember(ctx, 'discipline', HOUSE_X, G - 12 - LEG, { ...POSES.stand, armF: [-80, -30], head: -6 }, { scale: SC, t: tl, ground: G - 12, mouth: 'happy', face: -1, alpha: door, showLabel: false });
  // les trois autres, trempés, arrivent et entrent
  const walkers = [['chance', 0.5, 'sad'], ['ego', 0.9, 'sad'], ['obsession', 1.3, 'sad']];
  for (const [who, t0, mouth] of walkers) {
    if (tl < t0) continue;
    const g = gait(tl - t0, { x0: -60, speed: 420, ground: G, scale: SC });
    const x = Math.min(g.x, HOUSE_X - 40), inside = clamp((g.x - (HOUSE_X - 120)) / 80);
    if (inside >= 1) continue;
    drawMember(ctx, who, x, g.y, { ...g.pose, head: 18 }, { scale: SC, t: tl, ground: G, mouth, alpha: 1 - inside, showLabel: false });
  }
  rain(ctx, tl, { n: 120, angle: 0.35, speed: 2400, a: 0.4 });
  ctx.restore();
}
const REF_LEN = 6 * B;

// ------------------------------------------------------------------ 7. chute
function chute(ctx, tl) {
  refuge(ctx, REF_LEN + tl);
  topBand(ctx);
  kinetic(ctx, [['LA TEMPÊTE ', '#f1f1f1'], ['NE PRÉVIENT PAS.', '#9a9a9c']], 410, 62, tl, 0.1);
  kinetic(ctx, [['CONSTRUIS ', '#f1f1f1'], ['AVANT.', RED]], 520, 92, tl, 0.8, { rise: 60 });
}

const end = (ctx, tl) => endCard(ctx, tl, { teaser: 'LA SUITE', handle: HANDLE, series: SERIES, t: tl });
const SCENES = [[S.eclair, eclair], [S.jour1, jour1], [S.jour60, jour60], [S.alerte, alerte], [S.tempete, tempete], [S.refuge, refuge], [S.chute, chute], [S.outro, end]];
const LOOP = 0.35; // image de boucle : après le flash de l'ouverture

export function draw(ctx, t) {
  TEXTLOG.frame = [];
  CAM = { x: 540, y: 1180, z: 1 };
  if (t >= S.end - 2 * B) { eclair(ctx, LOOP); return; }
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
  const [t0, fn] = SCENES[k];
  const since = t - t0, sh = k > 0 ? 12 * Math.exp(-since * 9) : 0;
  ctx.save(); ctx.translate(noise(t * 50, 5) * sh, noise(t * 50, 9) * sh);
  fn(ctx, since);
  ctx.restore();
  if (k > 0 && k !== 6 && since < 0.08) { ctx.fillStyle = `rgba(255,255,255,${(0.28 * (1 - since / 0.08)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}
export const samples = (t) => (t < S.jour1 || (t >= S.tempete && t < S.refuge) ? 2 : 1);

// Lumière par scène (lib/light.js)
const WIN_W = { x: HOUSE_X + 81, y: G - 12 - 7 * BH + 32 };
export const post = cinema((t) => ({ threshold: 0.8, ...look(t) }));
function look(t) {
  const WIN = toScreen(WIN_W.x, WIN_W.y), DOOR = toScreen(HOUSE_X, G - 70), SUN = toScreen(160, 1060), MOON = toScreen(860, 420);
  if (t >= S.end - 2 * B || t < S.jour1) return { bloom: 1.0, fog: { density: 0.55, height: 0.5, color: '#2a3050', speed: 2 }, rays: { x: WIN.x, y: WIN.y, strength: 0.5, color: '#ffc27a', radius: 0.03 }, warm: 0.8 };
  if (t < S.jour60) return { bloom: 0.9, rays: { x: SUN.x, y: SUN.y, strength: 0.9, color: '#ffb37a', radius: 0.07 }, fog: { density: 0.3, height: 0.3, color: '#5a3448' }, warm: 1.5, sat: 1.1 };
  if (t < S.alerte) return { bloom: 1.1, rays: { x: MOON.x, y: MOON.y, strength: 0.55, color: '#cfdcff', radius: 0.05 }, fog: { density: 0.35, height: 0.35 }, warm: 1 };
  if (t < S.tempete) return { bloom: 1.0, rays: { x: WIN.x, y: WIN.y, strength: 0.35, color: '#ffc27a', radius: 0.025 }, fog: { density: 0.45, height: 0.45, color: '#2a3050', speed: 1.5 } };
  if (t < S.refuge) return { bloom: 1.0, fog: { density: 0.6, height: 0.55, color: '#2a3050', speed: 2.5 }, rays: { x: WIN.x, y: WIN.y, strength: 0.6, color: '#ffc27a', radius: 0.03 }, warm: 0.8 };
  if (t < S.outro) return { bloom: 1.1, rays: { x: DOOR.x, y: DOOR.y, strength: 1.1, color: '#ffc27a', radius: 0.05 }, fog: { density: 0.5, height: 0.5, color: '#2a3050', speed: 2 }, warm: 1.4 };
  return { bloom: 0.8 };
}

export const HITS = [
  // ouverture : foudre sur la tour à l'image 0
  { t: 0, sfx: 'impact', gain: 1 }, { t: 0.02, sfx: 'shatter', gain: 0.8 }, { t: 0.05, sfx: 'thud', gain: 0.9 }, { t: 0, sfx: 'rain', gain: 0.6, len: 7 * B },
  { t: 0.9, sfx: 'thud', gain: 0.6 }, { t: 2 * B, sfx: 'pop', gain: 0.6 }, { t: 1.4, sfx: 'impact', gain: 0.35 }, { t: 7 * B - 0.5, sfx: 'riser', gain: 0.5, len: 0.5 },
  // jour 1 : pinceau, briques empilées, brique posée
  { t: S.jour1, sfx: 'whoosh', gain: 0.6 }, { t: S.jour1 + 0.1, sfx: 'swish', gain: 0.4 }, { t: S.jour1 + 0.8, sfx: 'swish', gain: 0.4 }, { t: S.jour1 + 1.3, sfx: 'pop', gain: 0.6 },
  ...Array.from({ length: 14 }, (_, i) => ({ t: S.jour1 + 0.1 + i * 0.28, sfx: 'click', gain: 0.3 })),
  ...Array.from({ length: 4 }, (_, i) => ({ t: S.jour1 + 0.5 + i * 0.95, sfx: 'tick', gain: 0.7 })), { t: S.jour1 + 2.1, sfx: 'pop', gain: 0.6 },
  // jour 60 : selfies, tente qui se déplie, briques
  { t: S.jour60, sfx: 'impact', gain: 0.5 }, { t: S.jour60 + 0.2, sfx: 'pop', gain: 0.6 }, { t: S.jour60 + 1.9, sfx: 'boing', gain: 0.6 }, { t: S.jour60 + 2.2, sfx: 'pop', gain: 0.6 }, { t: S.jour60 + 2.4, sfx: 'pop', gain: 0.5 },
  ...Array.from({ length: 6 }, (_, i) => ({ t: S.jour60 + 0.4 + i * 0.7, sfx: 'tick', gain: 0.6 })), { t: S.jour60 + 0.4, sfx: 'click', gain: 0.5 }, { t: S.jour60 + 1.2, sfx: 'click', gain: 0.5 },
  // 22 h : alerte, la pluie commence, la fissure rebouchée
  { t: S.alerte, sfx: 'alarm', gain: 0.45, len: 0.8 }, { t: S.alerte, sfx: 'rain', gain: 0.35, len: 6 * B }, { t: S.alerte + 0.8, sfx: 'pop', gain: 0.5 }, { t: S.alerte + 1.2, sfx: 'swish', gain: 0.5 }, { t: S.alerte + 1.6, sfx: 'swish', gain: 0.5 },
  // tempête : tente envolée, façade qui tombe, foudre sur la tour
  { t: S.tempete, sfx: 'rain', gain: 0.8, len: 10 * B }, { t: S.tempete, sfx: 'impact', gain: 0.6 }, { t: S.tempete + 0.4, sfx: 'whoosh', gain: 0.8, len: 1 }, { t: S.tempete + 0.5, sfx: 'boing', gain: 0.4 },
  ...gaitSteps(S.tempete + 0.5, S.tempete + 1.7, { speed: 520, scale: SC, run: true }).map((h) => ({ ...h, sfx: 'step' })),
  { t: S.tempete + 1.2, sfx: 'whoosh', gain: 0.6 }, { t: S.tempete + 1.7, sfx: 'thud', gain: 0.9 }, { t: S.tempete + 1.6, sfx: 'pop', gain: 0.5 },
  { t: S.tempete + STRIKE, sfx: 'impact', gain: 1 }, { t: S.tempete + STRIKE + 0.02, sfx: 'shatter', gain: 0.8 }, { t: S.tempete + STRIKE + 0.9, sfx: 'thud', gain: 0.7 },
  // refuge : la porte s'ouvre, ils entrent
  { t: S.refuge, sfx: 'rain', gain: 0.5, len: 11 * B }, { t: S.refuge + 0.2, sfx: 'door', gain: 0.8 }, ...gaitSteps(S.refuge + 0.5, S.refuge + 2.9, { speed: 420, scale: SC }).map((h) => ({ ...h, gain: 0.4 })),
  { t: S.chute + 0.1, sfx: 'impact', gain: 0.7 }, { t: S.chute + 0.8, sfx: 'impact', gain: 1 },
  { t: S.outro, sfx: 'impact', gain: 0.7 }, { t: S.outro + 0.2, sfx: 'pop', gain: 0.6 }, { t: S.end - 2 * B, sfx: 'impact', gain: 0.7 },
];
