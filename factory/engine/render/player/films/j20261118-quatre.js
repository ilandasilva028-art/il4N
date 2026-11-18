// « Les quatre » — film ORIGINAL : quatre traits de caractère (DISCIPLINE, L'EGO, L'OBSESSION, LA CHANCE)
// traversent les mêmes épreuves (course, salle, mur d'escalade, la nuit, le sommet) ; un seul arrive.
import { W, H, timeline, topBand, grainVignette, POSES, COLORS, clamp, prog, ease, pop, lerp, noise, VARIANT, seriesTag, endCard, camera, dust, impactRing, kinetic, TEXTLOG, bricks, ladder, flag, speedLines } from '../lib/kit.js';
import { lerpPose, breathe, climb } from '../lib/stick.js';
import { gait, gaitSteps, ik2, bake, drawBaked, choreo } from '../lib/anim.js';
import { street, gym, bedroom, glow, bubble, rain, confettiBake, drawConfetti, motes, lightCone, sweat } from '../lib/world.js';
import { drawMember, CAST } from '../lib/cast.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['course', 8], ['salle', 9], ['mur', 9], ['nuit', 7], ['sommet', 8], ['chute', 5], ['outro', 5]]);
export const DURATION = S.end;
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #5', HANDLE = null, SC = 0.72, LEG = 158 * SC;
const log = (s) => TEXTLOG.frame.push(s);

export const SCRIPT = {
  premiere: 'perte de temps',
  accroche: VARIANT === 'b' ? ['QUI ARRIVE', 'EN HAUT ?'] : ['4 PERSONNAGES.', '1 SEUL ARRIVE.'],
  structure: ['ouverture', 'conflit', 'effort', 'progression', 'obstacle', 'retournement', 'chute'],
  dialogues: ['REGARDEZ-MOI !', 'ENCORE ! ENCORE !', 'PERSONNE NE REGARDE ?', 'LA PROCHAINE FOIS…'],
  conseils: ['MÊME HEURE, CHAQUE JOUR.', 'PETIT, MAIS TOUS LES JOURS.', 'DORS POUR DURER.'],
  details: ['JOUR 30', 'JOUR 90', '23 H', '3 H', 'bus'],
  chute: ['LA CHANCE PASSE.', 'LA DISCIPLINE RESTE.'],
};

function tip(ctx, n, text, tl, t0) {
  const k = pop(tl, t0, 0.3);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 1418); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
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
function frame(ctx, tl, fx = 540, fy = 1150, zoom = 1.28) { if (Math.floor(tl / (4 * B)) % 2 === 1) camera(ctx, { zoom, x: fx, y: fy }); }

// ------------------------------------------------------------------ 1. la course (coup de départ à l'image 0)
const HOOK = VARIANT === 'b' ? [[['QUI ARRIVE', '#f1f1f1']], [['EN ', '#f1f1f1'], ['HAUT ?', RED]]] : [[['4 PERSONNAGES.', '#f1f1f1']], [['1 SEUL ', '#f1f1f1'], ['ARRIVE.', RED]]];
const OPEN = choreo({ zoom: 1.35 }, (tl, s) => { tl.to(s, { zoom: 1, duration: 0.5, ease: 'expo.out' }, 0); });
function course(ctx, tl) {
  const c = OPEN(tl);
  const gD = gait(tl, { x0: 640, speed: 330, ground: 1300, scale: SC, run: true, stepLen: 110 });
  const camX = Math.max(0, gD.x - 640);
  ctx.save(); camera(ctx, { zoom: c.zoom, x: 300, y: 1150 });
  street(ctx, camX, tl + 2, { wet: false });
  ctx.save(); ctx.translate(-camX, 0);
  // ligne de départ + fumée du pistolet
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(90, 1300, 14, 160);
  if (tl < 1.2) for (let i = 0; i < 6; i++) { const k = prog(tl, 0, 1.2); ctx.fillStyle = `rgba(220,220,225,${(0.4 * (1 - k)).toFixed(2)})`; ctx.beginPath(); ctx.arc(60 + i * 16 + k * 60, 1010 - k * 120 - i * 8, 20 + k * 40, 0, 7); ctx.fill(); }
  // L'OBSESSION : sprint à fond, disparaît devant
  const gO = gait(tl, { x0: 470, speed: 720, ground: 1300, scale: SC, run: true, stepLen: 120 });
  speedLines(ctx, gO.x, 1300, tl, { dir: -1, alpha: 0.8 });
  drawMember(ctx, 'obsession', gO.x, gO.y, gO.pose, { scale: SC, t: tl, ground: 1300, mouth: 'open', mood: 'angry' });
  // LA CHANCE : court, puis saute sur le toit d'un bus qui passe
  const hop = 1.5;
  const busX = 120 + (tl - 1.1) * 1100;
  if (tl > 1.0 && busX < camX + W + 600) {
    ctx.fillStyle = '#2b2f3a'; ctx.beginPath(); ctx.roundRect(busX - 340, 1080, 680, 210, 20); ctx.fill();
    for (let w = 0; w < 6; w++) { ctx.fillStyle = 'rgba(255,230,170,0.55)'; ctx.fillRect(busX - 310 + w * 105, 1110, 80, 60); }
    ctx.fillStyle = '#111'; for (const dx of [-220, 220]) { ctx.beginPath(); ctx.arc(busX + dx, 1290, 34, 0, 7); ctx.fill(); }
    glow(ctx, busX + 340, 1240, 160, '255,245,220', 0.4);
  }
  if (tl < hop) { const gC = gait(tl, { x0: 310, speed: 360, ground: 1300, scale: SC, run: true }); drawMember(ctx, 'chance', gC.x, gC.y, gC.pose, { scale: SC, t: tl, ground: 1300 }); }
  else drawMember(ctx, 'chance', busX - 60, 1080 - LEG * 0.6, { ...POSES.sit, head: -10 }, { scale: SC, t: tl, mouth: 'happy' });
  // L'EGO : s'arrête tout de suite pour un selfie
  const eStop = 0.45;
  if (tl < eStop) { const gE = gait(tl, { x0: 150, speed: 300, ground: 1300, scale: SC, run: true }); drawMember(ctx, 'ego', gE.x, gE.y, gE.pose, { scale: SC, t: tl, ground: 1300 }); }
  else {
    const ex = 150 + eStop * 300, pose = { ...POSES.stand, lean: -6, head: -10, armF: [150, 30], armB: [30, 60] };
    drawMember(ctx, 'ego', ex, 1300 - LEG, pose, { scale: SC, t: tl, ground: 1300, mouth: 'smirk' });
    if (Math.floor(tl * 2.5) % 2 === 0 && tl > 0.8) glow(ctx, ex + 60, 1300 - LEG - 150, 120, '255,255,255', 0.7);
    bubble(ctx, 'REGARDEZ-MOI !', ex, 1300 - LEG - 210, tl, 0.8, { log });
  }
  // DISCIPLINE : son rythme, ni plus ni moins
  drawMember(ctx, 'discipline', gD.x, gD.y, gD.pose, { scale: SC, t: tl, ground: 1300, mood: 'determined', mouth: 'grit' });
  ctx.restore(); ctx.restore();
  if (tl < 0.1) { ctx.fillStyle = `rgba(255,255,255,${(0.5 * (1 - tl / 0.1)).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
  seriesTag(ctx, SERIES, pop(tl, 1.0));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 80, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 500, 100, tl, 2 * B, { stagger: 0.1, rise: 60 });
}

// ------------------------------------------------------------------ 2. la salle : jour 30
let BAR = null;
function barBake() {
  if (BAR) return BAR;
  BAR = bake((M) => { const b = M.Bodies.rectangle(420, 900, 300, 12, { restitution: 0.4 }); M.Body.setAngularVelocity(b, 0.15); const p1 = M.Bodies.rectangle(280, 900, 22, 90, { restitution: 0.4 }), p2 = M.Bodies.rectangle(560, 900, 22, 90, { restitution: 0.4 }); M.Body.setVelocity(p1, { x: -3, y: -2 }); M.Body.setVelocity(p2, { x: 3, y: -2 }); return [{ body: b, w: 300, h: 12, color: '#bdbdbf' }, { body: p1, w: 22, h: 90, color: '#3a3a40' }, { body: p2, w: 22, h: 90, color: '#3a3a40' }]; }, { duration: 3, ground: 1300 });
  return BAR;
}
function salle(ctx, tl) {
  ctx.save(); frame(ctx, tl, 540, 1100);
  gym(ctx, tl);
  // L'EGO devant le miroir : il pose, il ne s'entraîne pas
  const flex = 0.5 + 0.5 * Math.sin(tl * 3);
  drawMember(ctx, 'ego', 190, 1300 - LEG, { ...POSES.stand, lean: -4, armB: [100 + 40 * flex, 130], armF: [-100 - 40 * flex, -130] }, { scale: SC, t: tl, ground: 1300, mouth: 'smirk' });
  // L'OBSESSION : répétitions frénétiques, puis s'effondre (la barre tombe)
  const crash = 3.0, ox = 420;
  if (tl < crash) {
    const k = 0.5 - 0.5 * Math.cos(tl * 9);
    const [a1, a2] = ik2(8, -lerp(55, 120, k), 66, 62, 1);
    const pose = { ...POSES.stand, head: -12, armF: [a1, a2], armB: [a1 - 4, a2] };
    const y = 1300 - LEG, hx = ox + (Math.sin(a1 * Math.PI / 180) * 66 + Math.sin((a1 + a2) * Math.PI / 180) * 62) * SC, hy = y - 101 * SC + (Math.cos(a1 * Math.PI / 180) * 66 + Math.cos((a1 + a2) * Math.PI / 180) * 62) * SC;
    drawMember(ctx, 'obsession', ox, y, pose, { scale: SC, t: tl, ground: 1300, mouth: 'grit', mood: 'angry' });
    sweat(ctx, ox, y, pose, tl * 2, { scale: SC });
    ctx.fillStyle = '#bdbdbf'; ctx.fillRect(hx - 150, hy - 6, 300, 12); ctx.fillStyle = '#3a3a40'; ctx.fillRect(hx - 160, hy - 45, 22, 90); ctx.fillRect(hx + 138, hy - 45, 22, 90);
    bubble(ctx, 'ENCORE ! ENCORE !', ox, y - 230, tl, 0.4, { log });
  } else {
    drawBaked(ctx, barBake().at(tl - crash));
    drawMember(ctx, 'obsession', ox, 1300 - 40, POSES.lie, { scale: SC, t: tl, spiral: true });
    dust(ctx, ox, 1300, tl, crash + 0.1, { n: 10, spread: 220 });
    impactRing(ctx, ox, 1280, tl, crash + 0.1, { r: 200, color: '#b28cff' });
  }
  // DISCIPLINE : squats réguliers
  const sq = Math.abs(Math.sin(tl * Math.PI * 1.1));
  drawMember(ctx, 'discipline', 640, 1300 - LEG + sq * 40 * SC, lerpPose(POSES.stand, POSES.crouch, sq * 0.75), { scale: SC, t: tl, ground: 1300, mouth: 'grit', mood: 'determined' });
  // LA CHANCE : dort sur le banc (« Zzz »)
  ctx.fillStyle = '#26262c'; ctx.fillRect(780, 1210, 250, 22); ctx.fillRect(800, 1232, 12, 68); ctx.fillRect(1000, 1232, 12, 68);
  drawMember(ctx, 'chance', 960, 1170, POSES.lie, { scale: SC, t: tl, eyesClosed: true });
  for (let z = 0; z < 3; z++) { const ph = (tl * 0.8 + z / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - ph; ctx.font = `900 ${28 + z * 6}px Display`; ctx.fillStyle = '#7fdc9a'; ctx.fillText('z', 900 + ph * 50 + z * 10, 1080 - ph * 120); ctx.restore(); }
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['30', RED]]);
  tip(ctx, 1, 'MÊME HEURE, CHAQUE JOUR.', tl, 0.9);
}

// ------------------------------------------------------------------ 3. le mur d'escalade : jour 90
function mur(ctx, tl) {
  const climbY = (t) => 1300 - LEG - t * 160;
  const dY = climbY(tl), camY = Math.min(0, dY - 1000);
  ctx.save(); frame(ctx, tl, 560, 1000, 1.2);
  ctx.translate(0, -camY);
  ctx.fillStyle = '#0d0d10'; ctx.fillRect(0, camY - 50, W, H + 100);
  bricks(ctx, 0, camY - 50, W, 1400 - camY);
  ctx.fillStyle = '#16161a'; ctx.fillRect(0, 1300, W, 700);
  for (const x of [300, 560, 820]) ladder(ctx, x, 1300, -1400);
  lightCone(ctx, 560, camY + 100, 1300, 700, { a: 0.06 });
  // DISCIPLINE monte régulièrement
  drawMember(ctx, 'discipline', 560, dY, climb(tl * 1.3), { scale: SC, t: tl, mouth: 'grit', mood: 'determined' });
  // LA CHANCE monte vite… le barreau casse, elle tombe
  const brk = 1.6;
  if (tl < brk) drawMember(ctx, 'chance', 820, climbY(tl * 1.9) , climb(tl * 2.2), { scale: SC, t: tl, mouth: 'happy' });
  else {
    const fy = Math.min(1300 - 40, climbY(brk * 1.9) + 900 * (tl - brk) ** 2);
    drawMember(ctx, 'chance', 830, fy, fy >= 1260 ? POSES.lie : POSES.fall, { scale: SC, t: tl, spiral: fy >= 1260 });
    const ry = climbY(brk * 1.9) - 60;
    ctx.save(); ctx.translate(820, ry + 300 * (tl - brk) ** 2 * 3); ctx.rotate((tl - brk) * 4); ctx.fillStyle = '#9a9a9c'; ctx.fillRect(-70, -5, 140, 9); ctx.restore();
    const land = brk + Math.sqrt(Math.max(0, (1300 - 40 - climbY(brk * 1.9)) / 900));
    dust(ctx, 830, 1300, tl, land, { n: 10, spread: 180 });
  }
  // L'EGO grimpe un peu, regarde autour, redescend
  const egoUp = tl < 1.4 ? tl : Math.max(0, 1.4 - (tl - 2.4) * 0.8);
  drawMember(ctx, 'ego', 300, climbY(egoUp), tl > 1.4 && tl < 2.4 ? { ...climb(1.4 * 1.3), head: 20 } : climb(egoUp * 1.3), { scale: SC, t: tl, mouth: tl > 1.4 ? 'sad' : 'smirk' });
  if (tl > 1.4) bubble(ctx, 'PERSONNE NE REGARDE ?', 300, climbY(Math.min(1.4, egoUp)) - 230, tl, 1.5, { log });
  // L'OBSESSION, épuisée, assise au pied du mur avec un bandage
  drawMember(ctx, 'obsession', 120, 1300 - LEG + 50 * SC, { ...POSES.sit, head: 30 }, { scale: SC, t: tl, mouth: 'sad', ground: 1300 });
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['90', RED]]);
  tip(ctx, 2, 'PETIT, MAIS TOUS LES JOURS.', tl, 0.8);
}

// ------------------------------------------------------------------ 4. la nuit : écran partagé 23 h / 3 h
function nuit(ctx, tl) {
  const half = (y0, h, shiftY, draw) => { ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, h); ctx.clip(); ctx.translate(0, shiftY); draw(); ctx.restore(); };
  half(250, 720, -470, () => {
    bedroom(ctx, tl);
    drawMember(ctx, 'discipline', 330, 1105, POSES.lie, { scale: 0.92, t: tl, eyesClosed: true, showLabel: false });
  });
  half(970, 720, 250, () => {
    bedroom(ctx, tl + 4, { alarm: { text: '03:00', blink: false } });
    const p = { ...POSES.phone, head: 30 };
    drawMember(ctx, 'obsession', 470, 1150, { ...POSES.sit, armF: [40, 100], armB: [36, 104], head: 30 }, { scale: 0.92, t: tl, mouth: 'grit', mood: 'angry', showLabel: false });
    glow(ctx, 540, 1070, 160, '150,180,255', 0.5);
    ctx.fillStyle = '#cfe0ff'; ctx.fillRect(520, 1040, 40, 64);
    void p;
  });
  ctx.fillStyle = RED; ctx.fillRect(0, 967, W, 6);
  topBand(ctx);
  kinetic(ctx, [['23 H : ', '#f1f1f1'], ['DISCIPLINE DORT.', '#9a9a9c']], 420, 52, tl, 0.1);
  kinetic(ctx, [['3 H : ', '#f1f1f1'], ['L’OBSESSION VEILLE.', '#b28cff']], 1060, 52, tl, 0.9);
  tip(ctx, 3, 'DORS POUR DURER.', tl, 1.6);
}

// ------------------------------------------------------------------ 5. le sommet : jour 180, un seul arrive
const CONF = confettiBake({ n: 40, seed: 6, duration: 8 });
function stairs(ctx) {
  for (let i = 0; i < 9; i++) { const x = 60 + i * 85, y = 1300 - i * 52; ctx.fillStyle = i % 2 ? '#2e2e31' : '#3a3a3d'; ctx.fillRect(x, y, 85, 1920 - y); }
}
function sommet(ctx, tl, after = 0) {
  ctx.save(); frame(ctx, tl + after, 760, 900, 1.2);
  ctx.fillStyle = '#060608'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, 1300); g.addColorStop(0, '#0a0b12'); g.addColorStop(1, '#1b1c26'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1300);
  glow(ctx, 900, 380, 420, '255,220,170', 0.18);
  motes(ctx, tl, { x: 800, y: 300, w: 500, h: 900, n: 40, a: 0.35, seed: 3 });
  stairs(ctx);
  const topX = 60 + 8 * 85 + 42, topY = 1300 - 8 * 52;
  flag(ctx, topX + 50, topY, tl, 1);
  // DISCIPLINE au sommet
  const p = lerpPose(POSES.stand, POSES.victory, ease.out(prog(tl + after, 0.2, 0.6)));
  drawMember(ctx, 'discipline', topX - 20, topY - LEG, p, { scale: SC, t: tl, ground: topY, mouth: 'happy' });
  impactRing(ctx, topX - 20, topY - 200, tl + after, 0.3, { r: 220, color: '#f1f1f1' });
  // en bas : LA CHANCE gratte un ticket, L'EGO fait un selfie avec le drapeau derrière, L'OBSESSION dort
  drawMember(ctx, 'chance', 200, 1300 - LEG, { ...POSES.stand, armF: [70, 60], armB: [50, 70], head: 24 }, { scale: SC, t: tl, ground: 1300, mouth: 'sad' });
  ctx.fillStyle = '#e8e2c8'; ctx.fillRect(240, 1300 - LEG - 50, 40, 26);
  drawMember(ctx, 'ego', 420, 1300 - LEG, { ...POSES.stand, lean: -6, armF: [150, 30], armB: [30, 60], head: -8 }, { scale: SC, t: tl, ground: 1300, mouth: 'smirk', face: -1 });
  if (Math.floor((tl + after) * 2) % 3 === 0) glow(ctx, 380, 1300 - LEG - 150, 110, '255,255,255', 0.6);
  drawMember(ctx, 'obsession', 620, 1300 - LEG + 50 * SC, { ...POSES.sit, head: 34 }, { scale: SC, t: tl, eyesClosed: true, ground: 1300 });
  drawConfetti(ctx, CONF.at(tl + after));
  ctx.restore();
}
function sommetScene(ctx, tl) {
  sommet(ctx, tl);
  bubble(ctx, 'LA PROCHAINE FOIS…', 200, 1300 - LEG - 230, tl, 1.2, { log });
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['180', RED]]);
}

// ------------------------------------------------------------------ 6. chute
function chute(ctx, tl) {
  sommet(ctx, tl + 8 * B, 0);
  topBand(ctx);
  kinetic(ctx, [['LA CHANCE ', '#7fdc9a'], ['PASSE.', '#f1f1f1']], 410, 76, tl, 0.2);
  kinetic(ctx, [['LA DISCIPLINE ', '#f1f1f1'], ['RESTE.', RED]], 510, 76, tl, 0.9, { rise: 60 });
}

const end = (ctx, tl) => endCard(ctx, tl, { teaser: 'LA SUITE', handle: HANDLE, series: SERIES, t: tl });
const SCENES = [[S.course, course], [S.salle, salle], [S.mur, mur], [S.nuit, nuit], [S.sommet, sommetScene], [S.chute, chute], [S.outro, end]];

export function draw(ctx, t) {
  TEXTLOG.frame = [];
  if (t >= S.end - B) { course(ctx, 0); return; }
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
  const [t0, fn] = SCENES[k];
  const since = t - t0, sh = k > 0 ? 14 * Math.exp(-since * 9) : 0;
  ctx.save(); ctx.translate(noise(t * 50, 5) * sh, noise(t * 50, 9) * sh);
  fn(ctx, since);
  ctx.restore();
  if (k > 0 && since < 0.08) { ctx.fillStyle = `rgba(255,255,255,${(0.32 * (1 - since / 0.08)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}
export const samples = (t) => (t < S.salle ? 2 : 1);
export const post = grainVignette;

export const HITS = [
  // départ : coup de pistolet à l'image 0, foulées, bus, selfie
  { t: 0, sfx: 'impact', gain: 1 }, { t: 0.01, sfx: 'shatter', gain: 0.3 }, ...gaitSteps(0, 8 * B, { speed: 330, scale: SC, run: true, stepLen: 110 }),
  { t: 1.1, sfx: 'whoosh', gain: 0.8, len: 0.8 }, { t: 1.5, sfx: 'boing', gain: 0.6 }, { t: 0.8, sfx: 'click', gain: 0.6 }, { t: 1.6, sfx: 'click', gain: 0.5 }, { t: 0.8, sfx: 'pop', gain: 0.6 }, { t: 2 * B, sfx: 'pop', gain: 0.6 },
  // salle : répétitions frénétiques, chute de la barre
  { t: S.salle, sfx: 'impact', gain: 0.6 }, ...Array.from({ length: 8 }, (_, i) => ({ t: S.salle + 0.35 + i * 0.35, sfx: 'click', gain: 0.35 })), { t: S.salle + 0.4, sfx: 'pop', gain: 0.6 },
  { t: S.salle + 0.9, sfx: 'click', gain: 0.6 }, { t: S.salle + 3.1, sfx: 'impact', gain: 1 }, { t: S.salle + 3.15, sfx: 'thud', gain: 0.8 }, { t: S.salle + 3.5, sfx: 'click', gain: 0.4 },
  // mur : barreau qui casse, chute
  { t: S.mur, sfx: 'whoosh', gain: 0.6 }, { t: S.mur + 0.8, sfx: 'click', gain: 0.6 }, { t: S.mur + 1.6, sfx: 'shatter', gain: 0.7 }, { t: S.mur + 2.4, sfx: 'thud', gain: 0.9 }, { t: S.mur + 1.5, sfx: 'pop', gain: 0.6 },
  // nuit
  { t: S.nuit, sfx: 'impact', gain: 0.5 }, { t: S.nuit, sfx: 'rain', gain: 0.5, len: 7 * B }, { t: S.nuit + 0.9, sfx: 'pop', gain: 0.5 }, { t: S.nuit + 1.6, sfx: 'click', gain: 0.6 },
  // sommet + chute + fin
  { t: S.sommet, sfx: 'whoosh', gain: 0.6 }, { t: S.sommet + 0.3, sfx: 'ding', gain: 0.6 }, { t: S.sommet + 0.3, sfx: 'applause', gain: 0.6, len: 13 * B }, { t: S.sommet + 1.2, sfx: 'pop', gain: 0.6 },
  { t: S.chute, sfx: 'impact', gain: 0.8 }, { t: S.chute + 0.9, sfx: 'impact', gain: 1 },
  { t: S.outro, sfx: 'impact', gain: 0.7 }, { t: S.outro + 0.2, sfx: 'pop', gain: 0.6 }, { t: S.end - B, sfx: 'whoosh', gain: 0.6 },
];
void CAST; void breathe; void rain;
