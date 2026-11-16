// « Ceux qui rient » v2 — scénario en 7 temps (docs/SCENARIO.md) : ouverture in medias res, retour en
// arrière, conflit avec répliques, effort, obstacle, progression, retournement, chute. Héros au bandeau rouge.
import { W, H, timeline, topBand, grainVignette, POSES, COLORS, clamp, prog, ease, pop, lerp, noise, VARIANT, seriesTag, endCard, camera, dust, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
import { drawStick, lerpPose, breathe } from '../lib/stick.js';
import { choreo, bake, drawBaked, gait, gaitSteps, ik2 } from '../lib/anim.js';
import { bedroom, stage, street, rain, reflect, glow, lightCone, makeCrowd, drawCrowd, brows, sweat, whip, bubble, rewind, confettiBake, drawConfetti } from '../lib/world.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['ouverture', 6], ['retour', 3], ['conflit', 8], ['jour1', 8], ['jour63', 7], ['jour112', 8], ['retournement', 8], ['chute', 5], ['outro', 5]]);
export const DURATION = S.end;
const CONFETTI = confettiBake({ n: 46, seed: 4, duration: 8 });
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #2', HANDLE = null, LEG = 158;
const HERO = { band: RED, eyes: true, hands: true, feet: true };
const log = (s) => TEXTLOG.frame.push(s);

export const SCRIPT = {
  accroche: VARIANT === 'b' ? ['TOUT LE MONDE APPLAUDIT.', 'AVANT, ILS RIAIENT.'] : ['JOUR 180.', 'ILS APPLAUDISSENT.'],
  structure: ['ouverture', 'retour', 'conflit', 'effort', 'obstacle', 'progression', 'retournement', 'chute'],
  dialogues: ['TOI ? SPORTIF ?', 'T’ARRÊTERAS LUNDI.', 'COMMENT T’AS FAIT ?', 'J’AI PAS ARRÊTÉ.'],
  conseils: ['N’ANNONCE PAS TES PLANS.', 'JOURS SANS : 5 MINUTES.', 'NOTE CHAQUE SÉANCE.'],
  details: ['5 H 00', 'JOUR 63', 'réveil', 'banc', 'scène'],
  chute: ['LAISSE-LES RIRE.', 'CONTINUE.'],
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
function title(ctx, tl, parts, t0 = 0.05, size = 96) { topBand(ctx); kinetic(ctx, parts, 420, size, tl, t0, { stagger: 0.1, rise: 50 }); }
function frame(ctx, tl, fx = 540, fy = 1150, zoom = 1.3) { if (Math.floor(tl / (4 * B)) % 2 === 1) camera(ctx, { zoom, x: fx, y: fy }); }

// ------------------------------------------------------------------ 1. ouverture : la fin d'abord
const AUDIENCE = makeCrowd(7, 21, { x0: 20, spacing: 170, ground: 1960, scale: 1.3 });
const OPEN = choreo({ zoom: 1.6, y: 1150, rot: -0.04 }, (tl, s) => { tl.to(s, { zoom: 1.05, rot: 0, duration: 0.8, ease: 'expo.out' }, 0).to(s, { zoom: 1.2, duration: 2.5, ease: 'sine.inOut' }, 0.8); });
const HOOK = VARIANT === 'b'
  ? [[['TOUT LE MONDE ', '#f1f1f1'], ['APPLAUDIT.', '#f1f1f1']], [['AVANT, ILS ', '#f1f1f1'], ['RIAIENT.', RED]]]
  : [[['JOUR ', '#f1f1f1'], ['180.', RED]], [['ILS APPLAUDISSENT.', '#f1f1f1']]];
function heroOnStage(ctx, tl, mood = 'determined', mouth = null) {
  const p = breathe({ ...POSES.stand, head: -4 }, tl * 2, 0.8);
  drawStick(ctx, 540, 1300 - LEG, p, { ...HERO, t: tl, ground: 1300, mouth, rim: 1 });
  brows(ctx, 540, 1300 - LEG, p, { mood });
  glow(ctx, 540, 1100, 300, '255,255,255', 0.08);
}
function ouverture(ctx, tl) {
  const c = OPEN(tl);
  ctx.save(); camera(ctx, { zoom: c.zoom, x: 540, y: c.y, rot: c.rot });
  stage(ctx, tl + 20, { on: 1, sweep: 90 });
  heroOnStage(ctx, tl, 'determined', 'smirk');
  drawConfetti(ctx, CONFETTI.at(tl + 1.5));
  ctx.restore();
  drawCrowd(ctx, AUDIENCE, tl + 20, 'clap', { face: 1, blur: 6 });
  seriesTag(ctx, SERIES, pop(tl, 0.3));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 92, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 500, 70, tl, 2 * B, { stagger: 0.1, rise: 50 });
}

// ------------------------------------------------------------------ 2. retour en arrière
function retour(ctx, tl) {
  ouverture(ctx, 6 * B - tl * 3); // l'image recule
  rewind(ctx, tl, 1);
  TEXTLOG.frame = [];
  topBand(ctx);
  kinetic(ctx, [['180 JOURS ', '#f1f1f1'], ['AVANT…', RED]], 460, 80, tl, 0.05);
}

// ------------------------------------------------------------------ 3. conflit : ils se moquent
const MOCKERS = makeCrowd(5, 3, { x0: 80, spacing: 100, ground: 1300, scale: 0.88 });
function conflit(ctx, tl) {
  ctx.save(); frame(ctx, tl, 600, 1100);
  street(ctx, 300 + tl * 20, tl);
  const turn = prog(tl, 2.6, 2.9);
  const hero = (g) => {
    const p = breathe({ ...POSES.stand, head: lerp(24, 0, turn) }, tl * 2.4, 0.8);
    drawStick(g, 860, 1300 - LEG, p, { ...HERO, face: -1, t: tl, ground: 1300, mouth: turn < 0.5 ? 'sad' : 'grit', rim: -0.6 });
    brows(g, 860, 1300 - LEG, p, { face: -1, mood: turn < 0.5 ? 'sad' : 'determined' });
  };
  reflect(ctx, 1300, (g) => { drawCrowd(g, MOCKERS, tl, tl < 1.4 ? 'point' : 'laugh', { face: 1 }); hero(g); }, 0.16);
  lightCone(ctx, 860, 500, 1300, 420, { color: '255,225,180', a: 0.13, wTop: 30 });
  drawCrowd(ctx, MOCKERS, tl, tl < 1.4 ? 'point' : 'laugh', { face: 1 });
  hero(ctx);
  rain(ctx, tl, { n: 160 });
  bubble(ctx, 'TOI ? SPORTIF ?', 300, 920, tl, 0.25, { log });
  bubble(ctx, 'T’ARRÊTERAS LUNDI.', 380, 790, tl, 1.4, { tail: 'up', log });
  ctx.restore();
  title(ctx, tl, [['ILS ', '#f1f1f1'], ['RIAIENT.', RED]], 0.05, 84);
}

// ------------------------------------------------------------------ 4. jour 1 : 5 h, pompes
function pushup(k, ground, s, x) {
  const hipY = ground - lerp(78, 46, k) * s, lean = lerp(72, 80, k);
  const D = Math.PI / 180, sy = -Math.cos(lean * D) * 101;
  const gl = (ground - hipY) / s;
  const [a1, a2] = ik2(0, gl - sy, 66, 62, -1);
  const leg = ik2(-150, gl, 80, 78, 1);
  return { x, y: hipY, pose: { lean, head: -20, armB: [a1 - lean, a2], armF: [a1 - lean - 6, a2], legB: leg, legF: leg } };
}
function jour1(ctx, tl) {
  ctx.save(); frame(ctx, tl, 680, 1200);
  bedroom(ctx, tl, { alarm: { text: '05:00', blink: tl < 1.3 } });
  const up = prog(tl, 1.2, 1.8);
  if (tl < 1.8) drawStick(ctx, lerp(330, 470, up), lerp(1105, 1150, up), lerpPose(POSES.lie, POSES.sit, ease.inOut(up)), { ...HERO, scale: 0.92, eyes: tl > 0.9, t: tl });
  else if (tl < 2.4) { const g = gait((tl - 1.8), { x0: 480, speed: 400, ground: 1300, scale: 0.95 }); drawStick(ctx, g.x, g.y, g.pose, { ...HERO, scale: 0.95, t: tl, ground: 1300 }); }
  else {
    const k = Math.abs(Math.sin((tl - 2.4) * Math.PI * 1.6));
    const P = pushup(k, 1300, 0.95, 720);
    drawStick(ctx, P.x, P.y, P.pose, { ...HERO, scale: 0.95, t: tl, ground: 1300, mouth: 'grit' });
    brows(ctx, P.x, P.y, P.pose, { scale: 0.95, mood: 'determined' });
    if (tl > 3.0) sweat(ctx, P.x, P.y, P.pose, tl, { scale: 0.95 });
  }
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['1', RED], [' · 5 H 00', '#9a9a9c']]);
  tip(ctx, 1, 'N’ANNONCE PAS TES PLANS.', tl, 0.9);
}

// ------------------------------------------------------------------ 5. jour 63 : l'obstacle (zéro envie)
let CLOCK = null;
function clockBake() {
  if (CLOCK) return CLOCK;
  CLOCK = bake((M) => { const b = M.Bodies.rectangle(641, 1150, 86, 50, { restitution: 0.45, friction: 0.5 }); M.Body.setVelocity(b, { x: 6, y: -9 }); M.Body.setAngularVelocity(b, 0.25); return [{ body: b, w: 86, h: 50, color: '#0b0b0d' }]; }, { duration: 3, ground: 1300 });
  return CLOCK;
}
function jour63(ctx, tl) {
  ctx.save(); camera(ctx, { zoom: 1 + 0.1 * ease.inOut(prog(tl, 0, 7 * B)), x: 520, y: 1150 });
  bedroom(ctx, tl + 7, { alarm: tl < 0.35 ? { text: '05:00', blink: false } : null });
  ctx.fillStyle = '#16171e'; ctx.fillRect(590, 1120, 110, 60); // le réveil n'est plus sur la table
  if (tl >= 0.35) drawBaked(ctx, clockBake().at(tl - 0.35));
  const stand = prog(tl, 1.45, 1.85);
  if (tl < 1.45) {
    const p = breathe({ ...POSES.sit, head: 34, armF: [70, 120], armB: [60, 130] }, tl * 1.6, 2.5);
    drawStick(ctx, 470, 1150, tl < 0.35 ? { ...p, armF: [100, 10] } : p, { ...HERO, scale: 0.95, t: tl, mouth: 'sad' });
    brows(ctx, 470, 1150, p, { scale: 0.95, mood: 'sad' });
  } else {
    const k = Math.abs(Math.sin((tl - 1.85) * Math.PI * 2));
    const p = tl < 1.85 ? lerpPose(POSES.sit, POSES.stand, ease.inOut(stand)) : lerpPose(POSES.stand, POSES.crouch, k * 0.8);
    drawStick(ctx, 560, 1300 - LEG + (tl < 1.85 ? 0 : k * 40), p, { ...HERO, t: tl, ground: 1300, mouth: 'grit' });
    brows(ctx, 560, 1300 - LEG + (tl < 1.85 ? 0 : k * 40), p, { mood: 'determined' });
  }
  impactRing(ctx, 641, 1150, tl, 0.35, { r: 120, color: '#f1f1f1' });
  ctx.restore();
  title(ctx, tl, tl < 1.45 ? [['JOUR ', '#f1f1f1'], ['63', RED], [' · ZÉRO ENVIE.', '#9a9a9c']] : [['5 MINUTES ', '#f1f1f1'], ['QUAND MÊME.', RED]], tl < 1.45 ? 0.05 : 1.45, 76);
  tip(ctx, 2, 'JOURS SANS : 5 MINUTES.', tl, 1.55);
}

// ------------------------------------------------------------------ 6. jour 112 : il court, eux scrollent
const BENCH = makeCrowd(3, 9, { x0: 1500, spacing: 110, ground: 1300, scale: 0.85 });
function jour112(ctx, tl) {
  ctx.save(); frame(ctx, tl, 420, 1150);
  const g = gait(tl, { x0: 300, speed: 560, ground: 1300, run: true, stepLen: 120 });
  const camX = g.x - 360;
  street(ctx, camX, tl + 10);
  ctx.save(); ctx.translate(-camX, 0);
  ctx.fillStyle = '#2a2b31'; ctx.fillRect(1440, 1230, 360, 20); ctx.fillRect(1460, 1250, 14, 50); ctx.fillRect(1766, 1250, 14, 50);
  drawCrowd(ctx, BENCH, tl, 'phone', { face: 1 });
  ctx.restore();
  reflect(ctx, 1300, (c) => drawStick(c, g.x - camX, g.y, g.pose, { scale: 1, band: RED }), 0.2);
  drawStick(ctx, g.x - camX, g.y, g.pose, { ...HERO, t: tl, ground: 1300, mouth: 'grit', rim: 0.7 });
  brows(ctx, g.x - camX, g.y, g.pose, { mood: 'determined' });
  rain(ctx, tl + 3, { n: 170, angle: 0.3 });
  ctx.restore();
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['112', RED]]);
  tip(ctx, 3, 'NOTE CHAQUE SÉANCE.', tl, 0.7);
}

// ------------------------------------------------------------------ 7. retournement : le moqueur demande
const ASKER = makeCrowd(1, 3, { x0: 190, spacing: 0, ground: 1420, scale: 1.05 })[0];
function retournement(ctx, tl) {
  stage(ctx, tl + 30, { on: 1 });
  ctx.save(); frame(ctx, tl, 400, 1150, 1.2);
  heroOnStage(ctx, tl, 'determined', tl > 2.2 ? 'smirk' : null);
  drawCrowd(ctx, [ASKER], tl, tl < 0.5 ? 'clap' : 'watch', { face: 1 });
  bubble(ctx, 'COMMENT T’AS FAIT ?', 190, 1040, tl, 0.6, { log });
  bubble(ctx, 'J’AI PAS ARRÊTÉ.', 620, 880, tl, 2.0, { dark: true, log });
  ctx.restore();
  drawCrowd(ctx, AUDIENCE, tl + 30, 'watch', { face: 1, blur: 6 });
  title(ctx, tl, [['JOUR ', '#f1f1f1'], ['180', RED]]);
}

// ------------------------------------------------------------------ 8. chute
function chute(ctx, tl) {
  stage(ctx, tl + 40, { on: 1, sweep: 90 });
  const p = lerpPose(POSES.stand, POSES.victory, ease.out(prog(tl, 0.1, 0.4)));
  drawStick(ctx, 540, 1300 - LEG, p, { ...HERO, t: tl, ground: 1300, mouth: 'happy', squash: tl < 0.3 ? -0.08 : 0, rim: 1 });
  impactRing(ctx, 540, 1000, tl, 0.2, { r: 300, color: '#f1f1f1' });
  dust(ctx, 540, 1300, tl, 0.15, { n: 10, spread: 220 });
  drawConfetti(ctx, CONFETTI.at(tl));
  drawCrowd(ctx, AUDIENCE, tl + 40, 'clap', { face: 1, blur: 6 });
  topBand(ctx);
  kinetic(ctx, [['LAISSE-LES RIRE.', '#f1f1f1']], 420, 70, tl, 0.3);
  kinetic(ctx, [['CONTINUE.', RED]], 530, 110, tl, 1.0, { rise: 60 });
}

const end = (ctx, tl) => endCard(ctx, tl, { teaser: 'LA SUITE', handle: HANDLE, series: SERIES, t: tl });
const SCENES = [[S.ouverture, ouverture], [S.retour, retour], [S.conflit, conflit], [S.jour1, jour1], [S.jour63, jour63], [S.jour112, jour112], [S.retournement, retournement], [S.chute, chute], [S.outro, end]];
const WHIPS = [S.jour112, S.retournement];
const WD = 0.36;

export function draw(ctx, t) {
  TEXTLOG.frame = [];
  if (t >= S.end - B) { ouverture(ctx, 0); return; }
  for (const tb of WHIPS) {
    if (Math.abs(t - tb) < WD / 2) {
      const i = SCENES.findIndex(([s0]) => s0 === tb);
      const [a0, fa] = SCENES[i - 1], [, fb] = SCENES[i];
      whip(ctx, t, tb, WD, (c) => fa(c, t - a0), (c) => fb(c, Math.max(0, t - tb)), -1);
      return;
    }
  }
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
  const [t0, fn] = SCENES[k];
  const since = t - t0, cut = k > 0 && !WHIPS.includes(t0) && t0 !== S.retour;
  const sh = cut ? 16 * Math.exp(-since * 9) : 0;
  ctx.save(); ctx.translate(noise(t * 50, 5) * sh, noise(t * 50, 9) * sh);
  fn(ctx, since);
  ctx.restore();
  if (cut && since < 0.08) { ctx.fillStyle = `rgba(255,255,255,${(0.35 * (1 - since / 0.08)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}
export const samples = (t) => (WHIPS.some((tb) => Math.abs(t - tb) < WD / 2) ? 4 : (t >= S.jour112 && t < S.retournement) ? 2 : 1);
export const post = grainVignette;

export const HITS = [
  { t: 0, sfx: 'impact', gain: 0.9 }, { t: 0, sfx: 'applause', gain: 0.9, len: 6 * B + 0.2 }, { t: 2 * B, sfx: 'pop', gain: 0.6 },
  { t: S.retour, sfx: 'riser', gain: 0.4, len: 0.3 }, { t: S.retour + 0.05, sfx: 'swish', gain: 0.6 }, { t: S.retour + 0.6, sfx: 'swish', gain: 0.5 },
  { t: S.conflit, sfx: 'impact', gain: 0.8 }, { t: S.conflit, sfx: 'rain', gain: 0.9, len: 8 * B }, { t: S.conflit + 0.25, sfx: 'pop', gain: 0.6 }, { t: S.conflit + 1.4, sfx: 'pop', gain: 0.6 },
  { t: S.conflit + 2.6, sfx: 'thud', gain: 0.5 },
  { t: S.jour1, sfx: 'alarm', gain: 0.8 }, { t: S.jour1 + 0.64, sfx: 'alarm', gain: 0.7 }, { t: S.jour1 + 0.9, sfx: 'click', gain: 0.6 }, { t: S.jour1 + 1.2, sfx: 'swish', gain: 0.5 },
  ...gaitSteps(S.jour1 + 1.8, S.jour1 + 2.4, { speed: 400, scale: 0.95 }),
  ...Array.from({ length: 3 }, (_, i) => ({ t: S.jour1 + 2.4 + (i + 0.5) / 1.6, sfx: 'thud', gain: 0.4 })),
  { t: S.jour63, sfx: 'alarm', gain: 0.6 }, { t: S.jour63, sfx: 'rain', gain: 0.6, len: 7 * B }, { t: S.jour63 + 0.35, sfx: 'swish', gain: 0.7 }, { t: S.jour63 + 0.35, sfx: 'impact', gain: 0.5 },
  { t: S.jour63 + 0.9, sfx: 'thud', gain: 0.6 }, { t: S.jour63 + 1.2, sfx: 'click', gain: 0.3 }, { t: S.jour63 + 1.45, sfx: 'pop', gain: 0.6 }, { t: S.jour63 + 1.55, sfx: 'click', gain: 0.6 },
  ...Array.from({ length: 3 }, (_, i) => ({ t: S.jour63 + 1.85 + (i + 0.5) / 2, sfx: 'thud', gain: 0.4 })),
  { t: S.jour112, sfx: 'whoosh', gain: 0.7 }, { t: S.jour112, sfx: 'rain', gain: 0.8, len: 8 * B }, { t: S.jour112 + 0.7, sfx: 'click', gain: 0.6 }, ...gaitSteps(S.jour112, S.retournement - 0.2, { speed: 560, run: true, stepLen: 120 }),
  { t: S.retournement, sfx: 'whoosh', gain: 0.7 }, { t: S.retournement + 0.6, sfx: 'pop', gain: 0.7 }, { t: S.retournement + 2.0, sfx: 'pop', gain: 0.8 },
  { t: S.chute, sfx: 'impact', gain: 0.9 }, { t: S.chute, sfx: 'applause', gain: 1, len: 5 * B + 0.5 }, { t: S.chute + 1.0, sfx: 'impact', gain: 1 },
  { t: S.outro, sfx: 'impact', gain: 0.7 }, { t: S.outro + 0.2, sfx: 'pop', gain: 0.6 }, { t: S.end - B, sfx: 'whoosh', gain: 0.6 },
  ...['conflit', 'jour1', 'jour112', 'retournement'].map((k) => ({ t: S[k] + 4 * B, sfx: 'click', gain: 0.3 })),
];
