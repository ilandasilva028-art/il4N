// Vision « Ceux qui rient » — film vitrine des outils « production » : décors en profondeur (parallaxe,
// profondeur de champ), lumière (réverbères, projecteurs, fenêtre), pluie + reflets, foule variée,
// panoramiques filés, physique, marche/course IK, sourcils et sueur, 60 i/s. Sans musique.
// Leçon concrète : 1. n'annonce pas tes plans, 2. note chaque séance, 3. compare-toi à hier.
import { W, H, timeline, caption, topBand, grainVignette, POSES, label, COLORS, clamp, prog, ease, pop, lerp, noise, VARIANT, seriesTag, endCard, camera, dust, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
import { drawStick, lerpPose, breathe } from '../lib/stick.js';
import { choreo, bake, drawBaked, gait, gaitSteps, ik2 } from '../lib/anim.js';
import { bedroom, gym, stage, street, rain, reflect, glow, lightCone, makeCrowd, drawCrowd, brows, sweat, whip } from '../lib/world.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['hook', 8], ['jour1', 9], ['jour47', 9], ['jour112', 10], ['jour180', 10], ['fin', 6], ['outro', 5]]);
export const DURATION = S.end;
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #2', HANDLE = null;
const LEG = 158;

const HOOK = VARIANT === 'b' ? [[['ILS RIENT DE TOI ?', '#f1f1f1']], [['PARFAIT.', RED]]] : [[['ILS VONT RIRE.', '#f1f1f1']], [['LAISSE-LES.', RED]]];

// Coupe de cadrage : tous les 4 temps, on alterne plan large / plan serré (centré sur l'action).
function frame(ctx, tl, fx = 540, fy = 1150, zoom = 1.32) {
  if (Math.floor(tl / (4 * B)) % 2 === 1) camera(ctx, { zoom, x: fx, y: fy });
}
// Pastille de conseil (bas de l'écran, zone sûre).
function tip(ctx, n, text, tl, t0) {
  const k = pop(tl, t0, 0.3);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 1418); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
  ctx.font = '900 40px Display'; ctx.letterSpacing = '2px';
  const w = ctx.measureText(text).width + 130;
  ctx.fillStyle = 'rgba(12,12,15,0.88)'; ctx.beginPath(); ctx.roundRect(-w / 2, -44, w, 88, 44); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(-w / 2 + 46, 0, 28, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), -w / 2 + 47, 2);
  ctx.textAlign = 'left'; ctx.fillStyle = '#f1f1f1'; ctx.fillText(text, -w / 2 + 92, 2);
  ctx.restore();
  if (k >= 0.5) TEXTLOG.frame.push(text); // journal de lisibilité
}
function dayTitle(ctx, tl, n) { topBand(ctx); kinetic(ctx, [['JOUR ', '#f1f1f1'], [String(n), RED]], 420, 104, tl, 0.05, { stagger: 0.1, rise: 50 }); }

// ------------------------------------------------------------------ 0. accroche : la foule rit sous la pluie
const HOOKC = choreo({ zoom: 1.4, camX: 0 }, (tl, s) => { tl.to(s, { zoom: 1.05, duration: 0.7, ease: 'expo.out' }, 0).to(s, { zoom: 1.16, camX: 60, duration: 3.2, ease: 'sine.inOut' }, 0.7); });
const MOCKERS = makeCrowd(6, 3, { x0: 70, spacing: 92, ground: 1300, scale: 0.86 });
function hook(ctx, tl) {
  const c = HOOKC(tl);
  ctx.save(); camera(ctx, { zoom: c.zoom, x: 760, y: 1100 });
  street(ctx, 300 + c.camX, tl);
  const hero = (g) => {
    const p = breathe({ ...POSES.stand, head: 6 }, tl * 2.4, 0.8);
    drawStick(g, 860, 1300 - LEG, p, { scale: 1, face: -1, eyes: true, t: tl, ground: 1300 });
    brows(g, 860, 1300 - LEG, p, { face: -1, mood: 'determined' });
  };
  reflect(ctx, 1300, (g) => { drawCrowd(g, MOCKERS, tl, tl < 2 * B ? 'point' : 'laugh', { face: 1 }); hero(g); }, 0.16);
  lightCone(ctx, 860, 500, 1300, 420, { color: '255,225,180', a: 0.13, wTop: 30 });
  drawCrowd(ctx, MOCKERS, tl, tl < 2 * B ? 'point' : 'laugh', { face: 1 });
  hero(ctx);
  rain(ctx, tl, { n: 160 });
  ctx.restore();
  seriesTag(ctx, SERIES, pop(tl, 0.3));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 82, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 505, 104, tl, 2 * B, { stagger: 0.1, rise: 60 });
}

// ------------------------------------------------------------------ 1. jour 1 : 5 h du matin, pompes
function pushup(k, ground, s, x) {
  // k : 0 = bras tendus, 1 = en bas. Bras et jambes calés par cinématique inverse.
  const hipY = ground - lerp(78, 46, k) * s, lean = lerp(72, 80, k);
  const D = Math.PI / 180, sx = Math.sin(lean * D) * 101, sy = -Math.cos(lean * D) * 101;
  const gl = (ground - hipY) / s;
  const [a1, a2] = ik2(0, gl - sy, 66, 62, -1);
  const leg = ik2(-150, gl, 80, 78, 1);
  return { x, y: hipY, pose: { lean, head: -20, armB: [a1 - lean, a2], armF: [a1 - lean - 6, a2], legB: leg, legF: leg } };
}
function jour1(ctx, tl) {
  ctx.save(); frame(ctx, tl, 640, 1200);
  bedroom(ctx, tl, { alarm: { text: '05:00', blink: tl < 1.4 } });
  const up = prog(tl, 1.3, 1.9), walkK = prog(tl, 1.9, 2.5);
  if (tl < 1.9) {
    const p = lerpPose(POSES.lie, POSES.sit, ease.inOut(up));
    drawStick(ctx, lerp(330, 470, up), lerp(1105, 1150, up), p, { scale: 0.92, eyes: tl > 1.0, t: tl });
  } else if (tl < 2.6) {
    const g = gait(walkK * 0.6, { x0: 480, speed: 470, ground: 1300, scale: 0.95 });
    drawStick(ctx, g.x, g.y, g.pose, { scale: 0.95, eyes: true, t: tl, ground: 1300 });
  } else {
    const k = Math.abs(Math.sin((tl - 2.6) * Math.PI * 1.6));
    const P = pushup(k, 1300, 0.95, 720);
    drawStick(ctx, P.x, P.y, P.pose, { scale: 0.95, eyes: true, t: tl, ground: 1300 });
    brows(ctx, P.x, P.y, P.pose, { scale: 0.95, mood: 'determined' });
    if (tl > 3.4) sweat(ctx, P.x, P.y, P.pose, tl, { scale: 0.95 });
  }
  ctx.restore();
  dayTitle(ctx, tl, 1);
  tip(ctx, 1, 'N’ANNONCE PAS TES PLANS.', tl, 1.0);
}

// ------------------------------------------------------------------ 2. jour 47 : la salle, puis il lâche la barre (physique)
let BAR = null;
function barBake() {
  if (BAR) return BAR;
  BAR = bake((M) => {
    const mk = (x, y, w, h, vx, vy, av, color) => { const b = M.Bodies.rectangle(x, y, w, h, { restitution: 0.4, friction: 0.6 }); M.Body.setVelocity(b, { x: vx, y: vy }); M.Body.setAngularVelocity(b, av); return { body: b, w, h, color }; };
    return [mk(540, 760, 420, 14, 0, 2, 0.02, '#bdbdbf'), mk(330, 760, 30, 120, -2, 1, -0.1, '#3a3a40'), mk(750, 760, 30, 120, 2, 1, 0.1, '#3a3a40')];
  }, { duration: 3, ground: 1300 });
  return BAR;
}
function jour47(ctx, tl) {
  ctx.save(); frame(ctx, tl, 540, 1050);
  gym(ctx, tl);
  const drop = 3.3;
  const s = 1.0, hipY = 1300 - LEG * s * 0.96;
  const D = Math.PI / 180;
  const pose = { ...POSES.stand, head: -10 };
  const sx = 0, sy = -101;
  if (tl < drop) {
    // développé : les mains montent et descendent (IK), la barre suit les mains
    const k = 0.5 - 0.5 * Math.cos((tl - 0.2) * Math.PI * 1.25);
    const reach = lerp(60, 122, clamp(k));
    const [a1, a2] = ik2(10, -reach, 66, 62, 1);
    pose.armF = [a1, a2]; pose.armB = [a1 - 4, a2];
    const hx = 540 + (Math.sin(a1 * D) * 66 + Math.sin((a1 + a2) * D) * 62), hy = hipY + sy + Math.cos(a1 * D) * 66 + Math.cos((a1 + a2) * D) * 62;
    drawStick(ctx, 540, hipY, pose, { scale: s, eyes: true, t: tl, ground: 1300, mouth: k > 0.8 ? null : 'sad' });
    brows(ctx, 540, hipY, pose, { mood: 'angry' });
    if (tl > 1.2) sweat(ctx, 540, hipY, pose, tl);
    ctx.fillStyle = '#bdbdbf'; ctx.fillRect(hx - 210, hy - 7, 420, 14);
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(hx - 225, hy - 60, 30, 120); ctx.fillRect(hx + 195, hy - 60, 30, 120);
    void sx;
  } else {
    drawBaked(ctx, barBake().at(tl - drop));
    const p = lerpPose({ ...POSES.stand, armB: [150, 10], armF: [-150, -10] }, POSES.victory, ease.out(prog(tl, drop, drop + 0.3)));
    drawStick(ctx, 540, hipY, p, { scale: s, eyes: true, t: tl, ground: 1300, mouth: 'happy', squash: 0.12 * Math.exp(-(tl - drop) * 8) });
    dust(ctx, 540, 1300, tl, drop + 0.35, { n: 12, spread: 300 });
    impactRing(ctx, 540, 1290, tl, drop + 0.35, { r: 260, color: '#f1f1f1' });
  }
  ctx.restore();
  dayTitle(ctx, tl, 47);
  tip(ctx, 2, 'NOTE CHAQUE SÉANCE.', tl, 0.9);
}

// ------------------------------------------------------------------ 3. jour 112 : course de nuit sous la pluie, ils scrollent
const BENCH = makeCrowd(3, 9, { x0: 1500, spacing: 110, ground: 1300, scale: 0.85 });
function jour112(ctx, tl) {
  ctx.save(); frame(ctx, tl, 420, 1150);
  const g = gait(tl, { x0: 300, speed: 560, ground: 1300, run: true, stepLen: 120 });
  const camX = g.x - 360;
  street(ctx, camX, tl + 10);
  ctx.save(); ctx.translate(-camX, 0);
  // banc + 3 personnes sur leur téléphone
  ctx.fillStyle = '#2a2b31'; ctx.fillRect(1440, 1230, 360, 20); ctx.fillRect(1460, 1250, 14, 50); ctx.fillRect(1766, 1250, 14, 50);
  drawCrowd(ctx, BENCH, tl, 'phone', { face: 1 });
  ctx.restore();
  reflect(ctx, 1300, (c) => drawStick(c, g.x - camX, g.y, g.pose, { scale: 1 }), 0.2);
  drawStick(ctx, g.x - camX, g.y, g.pose, { scale: 1, eyes: true, t: tl, ground: 1300 });
  brows(ctx, g.x - camX, g.y, g.pose, { mood: 'determined' });
  rain(ctx, tl + 3, { n: 170, angle: 0.3 });
  ctx.restore();
  dayTitle(ctx, tl, 112);
  tip(ctx, 3, 'COMPARE-TOI À HIER.', tl, 0.8);
}

// ------------------------------------------------------------------ 4. jour 180 : la scène, ils ne rient plus
const AUDIENCE = makeCrowd(7, 21, { x0: 20, spacing: 170, ground: 1960, scale: 1.3 });
function jour180(ctx, tl) {
  ctx.save(); frame(ctx, tl, 540, 1150);
  stage(ctx, tl, { on: clamp(0.3 + tl * 0.8) });
  const arrive = 1.6;
  const g = gait(Math.min(tl, arrive), { x0: 120, speed: 260, ground: 1300 });
  const x = g.x, y = g.y;
  const p = tl < arrive ? g.pose : breathe({ ...POSES.stand, head: -4 }, tl * 2, 0.8);
  drawStick(ctx, x, y, p, { scale: 1, eyes: true, t: tl, ground: 1300 });
  brows(ctx, x, y, p, { mood: 'determined' });
  glow(ctx, x, 1100, 300, '255,255,255', 0.08);
  // public au premier plan, flou (profondeur de champ) : il regarde, puis applaudit
  drawCrowd(ctx, AUDIENCE, tl, tl > 3.0 ? 'clap' : 'watch', { face: 1, blur: 6, alpha: 0.95 });
  ctx.restore();
  dayTitle(ctx, tl, 180);
  if (tl > 2.0) { kinetic(ctx, [['ILS NE RIENT ', '#f1f1f1'], ['PLUS.', RED]], 1440, 56, tl, 2.0); }
}

// ------------------------------------------------------------------ 5. chute
function fin(ctx, tl) {
  stage(ctx, tl + 5, { on: 1 });
  const p = lerpPose(POSES.stand, POSES.victory, ease.out(prog(tl, 0.1, 0.4)));
  drawStick(ctx, 540, 1300 - LEG, p, { scale: 1, eyes: true, t: tl, ground: 1300, mouth: 'happy', squash: tl < 0.3 ? -0.08 : 0 });
  impactRing(ctx, 540, 1000, tl, 0.2, { r: 300, color: '#f1f1f1' });
  drawCrowd(ctx, AUDIENCE, tl + 5, 'clap', { face: 1, blur: 6 });
  topBand(ctx);
  kinetic(ctx, [['LAISSE-LES RIRE.', '#f1f1f1']], 420, 70, tl, 0.3);
  kinetic(ctx, [['CONTINUE.', RED]], 530, 110, tl, 1.0, { rise: 60 });
}

const end = (ctx, tl) => endCard(ctx, tl, { teaser: 'LA SUITE DEMAIN', handle: HANDLE, series: SERIES, t: tl });
const SCENES = [[S.hook, hook], [S.jour1, jour1], [S.jour47, jour47], [S.jour112, jour112], [S.jour180, jour180], [S.fin, fin], [S.outro, end]];
const WHIPS = [S.jour47, S.jour112, S.jour180]; // panoramiques filés ; les autres changements = coupes franches
const WD = 0.36;

export function draw(ctx, t) {
  TEXTLOG.frame = [];
  if (t >= S.end - B) { hook(ctx, 0); return; }
  // panoramique filé entre deux scènes
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
  const since = t - t0, sh = k > 0 && !WHIPS.includes(t0) ? 16 * Math.exp(-since * 9) : 0;
  ctx.save();
  ctx.translate(W / 2 + noise(t * 50, 5) * sh, H / 2 + noise(t * 50, 9) * sh); ctx.translate(-W / 2, -H / 2);
  fn(ctx, since);
  ctx.restore();
  if (k > 0 && !WHIPS.includes(t0) && since < 0.08) { ctx.fillStyle = `rgba(255,255,255,${(0.35 * (1 - since / 0.08)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}
// flou de bougé pendant les panoramiques et la course
export const samples = (t) => (WHIPS.some((tb) => Math.abs(t - tb) < WD / 2) ? 4 : (t >= S.jour112 && t < S.jour180) ? 2 : 1);
export const post = grainVignette;

const runSteps = gaitSteps(S.jour112, S.jour180 - 0.2, { speed: 560, run: true, stepLen: 120 });
export const HITS = [
  { t: 0, sfx: 'impact', gain: 0.9 }, { t: 0, sfx: 'rain', gain: 0.9, len: 8 * B }, { t: 0.1, sfx: 'swish', gain: 0.5 },
  { t: 2 * B, sfx: 'impact', gain: 0.9 }, { t: 2 * B + 0.05, sfx: 'pop', gain: 0.6 },
  // jour 1
  { t: S.jour1, sfx: 'alarm', gain: 0.8 }, { t: S.jour1 + 0.64, sfx: 'alarm', gain: 0.8 }, { t: S.jour1 + 0.05, sfx: 'pop', gain: 0.6 }, { t: S.jour1 + 1.0, sfx: 'click', gain: 0.6 },
  { t: S.jour1 + 1.3, sfx: 'swish', gain: 0.5 }, ...gaitSteps(S.jour1 + 1.9, S.jour1 + 2.5, { speed: 470, scale: 0.95 }),
  ...Array.from({ length: 4 }, (_, i) => ({ t: S.jour1 + 2.6 + (i + 0.5) / 1.6, sfx: 'thud', gain: 0.4 })),
  // jour 47
  { t: S.jour47, sfx: 'whoosh', gain: 0.7 }, { t: S.jour47 + 0.05, sfx: 'pop', gain: 0.6 }, { t: S.jour47 + 0.9, sfx: 'click', gain: 0.6 },
  ...Array.from({ length: 3 }, (_, i) => ({ t: S.jour47 + 0.2 + (i + 0.5) / 0.625, sfx: 'click', gain: 0.45 })),
  { t: S.jour47 + 3.3 + 0.35, sfx: 'impact', gain: 1 }, { t: S.jour47 + 3.3 + 0.38, sfx: 'thud', gain: 0.8 }, { t: S.jour47 + 3.3 + 0.7, sfx: 'click', gain: 0.4 },
  // jour 112
  { t: S.jour112, sfx: 'whoosh', gain: 0.7 }, { t: S.jour112, sfx: 'rain', gain: 0.8, len: 10 * B }, { t: S.jour112 + 0.05, sfx: 'pop', gain: 0.6 }, { t: S.jour112 + 0.8, sfx: 'click', gain: 0.6 }, ...runSteps,
  // jour 180
  { t: S.jour180, sfx: 'whoosh', gain: 0.7 }, { t: S.jour180 + 0.05, sfx: 'pop', gain: 0.6 }, ...gaitSteps(S.jour180, S.jour180 + 1.6, { speed: 260 }),
  { t: S.jour180 + 2.0, sfx: 'impact', gain: 0.6 }, { t: S.jour180 + 3.0, sfx: 'applause', gain: 0.9, len: 10 * B - 3.0 + 6 * B },
  // chute + fin
  { t: S.fin, sfx: 'impact', gain: 0.8 }, { t: S.fin + 0.2, sfx: 'ding', gain: 0.5 }, { t: S.fin + 1.0, sfx: 'impact', gain: 1 },
  ...['jour1', 'jour47', 'jour112', 'jour180'].flatMap((k) => [4, 8].filter((b) => b < 9).map((b) => ({ t: S[k] + b * B, sfx: 'click', gain: 0.35 }))),
  { t: S.outro, sfx: 'impact', gain: 0.7 }, { t: S.outro + 0.2, sfx: 'pop', gain: 0.6 }, { t: S.end - B, sfx: 'whoosh', gain: 0.6 },
];
void label;
