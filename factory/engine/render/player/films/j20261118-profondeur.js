// « La profondeur » — film ORIGINAL de la série « Toi contre toi » (décor sous-marin).
// Leçon : la concentration se trouve en profondeur ; les notifications te ramènent à la surface.
// Conseils : couper les notifications · 25 min, une seule tâche · téléphone dans une autre pièce.
import { W, H, timeline, topBand, grainVignette, COLORS, clamp, prog, ease, pop, lerp, noise, VARIANT, seriesTag, endCard, camera, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
import { brows, bubble, glow } from '../lib/world.js';
import { ocean, diver, bubbles, jellyfish, yOf, PX } from '../lib/ocean.js';
import { choreo } from '../lib/anim.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['ouverture', 6], ['conflit', 8], ['effort', 8], ['obstacle', 7], ['progression', 8], ['retournement', 8], ['chute', 5], ['outro', 5]]);
export const DURATION = S.end;
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · #4', HANDLE = null;
const log = (s) => TEXTLOG.frame.push(s);

export const SCRIPT = {
  premiere: 'raté',
  accroche: VARIANT === 'b' ? ['QUI TE TIENT', 'EN SURFACE ?'] : ['30 SECONDES', 'ET TU REMONTES.'],
  structure: ['ouverture', 'conflit', 'effort', 'obstacle', 'progression', 'retournement', 'chute'],
  dialogues: ['T’AS VU ÇA ?', 'JUSTE 2 MIN…', 'PLUS TARD.'],
  conseils: ['COUPE LES NOTIFS.', '25 MIN, UNE TÂCHE.', 'TÉLÉPHONE DANS UNE AUTRE PIÈCE.'],
  details: ['−20 M', '25 MIN', 'notification', 'perle', 'méduses'],
  chute: ['CE QUI COMPTE', 'EST EN PROFONDEUR.'],
};

// ------------------------------------------------------------------ éléments
function phone(ctx, x, y, a, lit = 1, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  if (lit > 0) glow(ctx, 0, 0, 120, '150,190,255', 0.35 * lit);
  ctx.fillStyle = '#15171d'; ctx.beginPath(); ctx.roundRect(-34, -62, 68, 124, 12); ctx.fill();
  ctx.fillStyle = lit > 0 ? `rgba(190,215,255,${0.4 + 0.5 * lit})` : '#2a2d36'; ctx.beginPath(); ctx.roundRect(-27, -52, 54, 104, 7); ctx.fill();
  if (lit > 0) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(20, -44, 9, 0, 7); ctx.fill(); }
  ctx.restore();
}
function tip(ctx, n, text, tl, t0) {
  const k = pop(tl, t0, 0.3);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 1418); ctx.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
  ctx.font = '900 40px Display'; ctx.letterSpacing = '2px';
  const w = ctx.measureText(text).width + 130;
  ctx.fillStyle = 'rgba(4,16,22,0.9)'; ctx.beginPath(); ctx.roundRect(-w / 2, -44, w, 88, 44); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(-w / 2 + 46, 0, 28, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), -w / 2 + 47, 2);
  ctx.textAlign = 'left'; ctx.fillStyle = '#f1f1f1'; ctx.fillText(text, -w / 2 + 92, 2);
  ctx.restore();
  if (k >= 0.5) log(text);
}
function title(ctx, tl, parts, t0 = 0.05, size = 86) { topBand(ctx); kinetic(ctx, parts, 420, size, tl, t0, { stagger: 0.1, rise: 50 }); }
const headOf = (x, y, angle, s = 0.9) => [x + Math.sin(angle) * 162 * s, y - Math.cos(angle) * 162 * s];

// ------------------------------------------------------------------ 1. ouverture : une notification le fait remonter
const OPEN = choreo({ camD: 5.2, angle: Math.PI, hy: 5.0, zoom: 1.3 }, (tl, s) => {
  tl.to(s, { zoom: 1, duration: 0.6, ease: 'expo.out' }, 0)
    .to(s, { angle: 0.15, duration: 0.45, ease: 'back.out(1.6)' }, 0.25)       // il se retourne vers la surface
    .to(s, { hy: 0.6, duration: 1.7, ease: 'power2.in' }, 0.55)                  // et remonte
    .to(s, { camD: 2.2, duration: 1.9, ease: 'power2.inOut' }, 0.5);
});
const HOOK = VARIANT === 'b'
  ? [[['QUI TE TIENT', '#f1f1f1']], [['EN ', '#f1f1f1'], ['SURFACE ?', RED]]]
  : [[['30 SECONDES', '#f1f1f1']], [['ET TU ', '#f1f1f1'], ['REMONTES.', RED]]];
function ouverture(ctx, tl) {
  const c = OPEN(tl);
  ctx.save(); camera(ctx, { zoom: c.zoom, x: 540, y: 1000 });
  ocean(ctx, tl, c.camD);
  const x = 540, y = yOf(c.hy, c.camD);
  // le téléphone qui vibre juste au-dessus de lui : c'est lui qui l'appelle
  const shake = Math.sin(tl * 60) * 6 * (tl < 1.2 ? 1 : 0);
  phone(ctx, 700 + shake, yOf(Math.min(c.hy, 3.2) - 1.6, c.camD), 0.2, 1, 0.9);
  diver(ctx, x, y, tl, { angle: c.angle, kick: tl < 0.25 ? 1 : 1.6, mouth: tl < 0.3 ? 'open' : null });
  const [hx, hy] = headOf(x, y, c.angle);
  bubbles(ctx, tl, hx, hy, { n: 8, rate: 1.4, seed: 2 });
  if (tl < 0.5) impactRing(ctx, 700, yOf(3.4, c.camD), tl, 0.0, { r: 160, color: '#bfe0ff' });
  ctx.restore();
  seriesTag(ctx, SERIES, pop(tl, 1.2));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 88, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 505, 104, tl, 2 * B, { stagger: 0.1, rise: 60 });
}

// ------------------------------------------------------------------ 2. conflit : en surface, tout sonne
const PHONES = [[300, 1.2, -0.3], [780, 0.9, 0.25], [190, 2.6, 0.5], [880, 2.4, -0.4], [520, 0.5, 0.1]];
function conflit(ctx, tl) {
  const camD = 2.2 + Math.sin(tl * 0.6) * 0.15;
  ctx.save(); camera(ctx, { zoom: 1 + 0.06 * ease.inOut(prog(tl, 0, 8 * B)), x: 540, y: 1100 });
  ocean(ctx, tl + 3, camD);
  PHONES.forEach(([px, pd, pa], i) => phone(ctx, px + Math.sin(tl * 1.1 + i) * 14, yOf(pd + Math.sin(tl * 1.5 + i) * 0.15, camD), pa + Math.sin(tl + i) * 0.1, (Math.floor(tl * 3 + i) % 3 === 0) ? 1 : 0.4, 0.85));
  const x = 540, y = yOf(1.6, camD);
  diver(ctx, x, y, tl, { angle: 0.1 * Math.sin(tl * 2), kick: 0.35, arms: 'hold', mouth: 'sad' });
  brows(ctx, x, y + 0, { lean: 0, head: 0 }, { scale: 0.9, mood: 'sad' });
  ctx.restore();
  bubble(ctx, 'T’AS VU ÇA ?', 300, yOf(1.2, camD) - 70, tl, 0.5, { log });
  bubble(ctx, 'JUSTE 2 MIN…', 780, yOf(0.9, camD) - 70, tl, 1.7, { tail: 'up', log });
  title(ctx, tl, [['EN SURFACE, ', '#f1f1f1'], ['TOUT SONNE.', RED]], 0.05, 72);
}

// ------------------------------------------------------------------ 3. effort : il lâche le téléphone (physique : les téléphones flottent vers la surface)
let FLOAT = null;
function floatBake() {
  if (FLOAT) return FLOAT;
  const M = globalThis.Matter, engine = M.Engine.create(); engine.gravity.y = -0.5;
  const ceil = M.Bodies.rectangle(540, -40, 3000, 80, { isStatic: true });
  const items = PHONES.map(([px, pd, pa], i) => { const b = M.Bodies.rectangle(px, pd * PX + 40, 68, 124, { frictionAir: 0.06, restitution: 0.3, angle: pa }); M.Body.setVelocity(b, { x: (i % 2 ? 1 : -1) * 2, y: -1 }); M.Body.setAngularVelocity(b, (i - 2) * 0.03); return b; });
  M.Composite.add(engine.world, [ceil, ...items]);
  const frames = [];
  for (let f = 0; f <= 60 * 5; f++) { frames.push(items.map((b) => [b.position.x, b.position.y, b.angle])); M.Engine.update(engine, 1000 / 60); }
  FLOAT = (t) => frames[Math.min(frames.length - 1, Math.max(0, Math.round(t * 60)))];
  return FLOAT;
}
function effort(ctx, tl) {
  const dive = ease.inOut(prog(tl, 1.0, 3.6));
  const camD = lerp(2.2, 11, dive);
  ctx.save(); camera(ctx, { zoom: 1.04, x: 540, y: 1000 });
  ocean(ctx, tl + 6, camD);
  floatBake()(tl).forEach(([px, py, pa], i) => phone(ctx, px, yOf(py / PX, camD), pa, i === 4 ? 0.2 : 0.6, 0.85));
  const turn = ease.inOut(prog(tl, 0.6, 1.1));
  const x = 540, y = yOf(lerp(1.6, 10.6, dive), camD);
  diver(ctx, x, y, tl, { angle: lerp(0.1, Math.PI, turn), kick: 1.2, arms: turn > 0.6 ? 'streamline' : 'hold', mouth: 'grit' });
  const [hx, hy] = headOf(x, y, lerp(0.1, Math.PI, turn));
  bubbles(ctx, tl, hx, hy, { n: 10, rate: 1.2, seed: 5 });
  ctx.restore();
  title(ctx, tl, [['−', '#f1f1f1'], [String(Math.max(2, Math.round(camD))), RED], [' M', '#f1f1f1']], 0.05, 96);
  tip(ctx, 1, 'COUPE LES NOTIFS.', tl, 0.5);
}

// ------------------------------------------------------------------ 4. obstacle : envie de remonter à −20 m
function obstacle(ctx, tl) {
  const camD = 20 + Math.sin(tl * 0.8) * 0.2;
  ctx.save(); camera(ctx, { zoom: 1 + 0.08 * ease.inOut(prog(tl, 0, 7 * B)), x: 540, y: 1000 });
  ocean(ctx, tl + 10, camD);
  const hesitate = tl < 1.5;
  const x = 540, y = yOf(20, camD);
  const ang = hesitate ? Math.PI * 0.62 + Math.sin(tl * 2) * 0.08 : lerp(Math.PI * 0.62, Math.PI, ease.out(prog(tl, 1.5, 1.9)));
  diver(ctx, x, y, tl, { angle: ang, kick: hesitate ? 0.3 : 1.2, arms: hesitate ? 'hold' : 'streamline', mouth: hesitate ? 'sad' : 'grit' });
  const [hx, hy] = headOf(x, y, ang);
  bubbles(ctx, tl, hx, hy, { n: hesitate ? 14 : 8, rate: hesitate ? 2 : 1, seed: 7 });
  // minuteur 25 min autour du héros (anneau qui se remplit)
  if (tl > 1.5) {
    const k = prog(tl, 1.5, 7 * B);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, y, 230, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = RED; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, 230, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
  }
  ctx.restore();
  title(ctx, tl, tl < 1.5 ? [['−20 M', RED], [' · ENVIE DE REMONTER.', '#f1f1f1']] : [['ENCORE ', '#f1f1f1'], ['25 MIN.', RED]], tl < 1.5 ? 0.05 : 1.5, 60);
  tip(ctx, 2, '25 MIN, UNE TÂCHE.', tl, 1.6);
}

// ------------------------------------------------------------------ 5. progression : la descente dans le canyon
function progression(ctx, tl) {
  const camD = lerp(20, 74, ease.inOut(prog(tl, 0, 8 * B)));
  ctx.save(); camera(ctx, { zoom: 1.02, x: 540, y: 1000, rot: Math.sin(tl * 0.7) * 0.012 });
  ocean(ctx, tl + 14, camD);
  const x = 540 + Math.sin(tl * 1.1) * 40, y = yOf(camD + 0.3, camD);
  diver(ctx, x, y, tl, { angle: Math.PI + Math.sin(tl * 1.1) * 0.12, kick: 1.4, mouth: 'grit' });
  const [hx, hy] = headOf(x, y, Math.PI);
  bubbles(ctx, tl, hx, hy, { n: 8, rate: 1, seed: 9 });
  ctx.restore();
  title(ctx, tl, [['−', '#f1f1f1'], [String(Math.round(camD)), RED], [' M', '#f1f1f1']], 0.05, 96);
  tip(ctx, 3, 'TÉLÉPHONE DANS UNE AUTRE PIÈCE.', tl, 0.4);
}

// ------------------------------------------------------------------ 6. retournement : la perle ; le téléphone coule, il s'en fiche
function retournement(ctx, tl) {
  const camD = 78;
  ctx.save(); camera(ctx, { zoom: 1 + 0.06 * ease.inOut(prog(tl, 0, 8 * B)), x: 540, y: 1100 });
  ocean(ctx, tl + 20, camD);
  // corniche + huître ouverte avec une perle rouge lumineuse
  const lx = 640, ly = yOf(80.2, camD);
  ctx.fillStyle = '#020b10'; ctx.beginPath(); ctx.moveTo(380, ly + 30); ctx.lineTo(980, ly + 10); ctx.lineTo(1080, ly + 400); ctx.lineTo(300, ly + 400); ctx.fill();
  ctx.fillStyle = '#1e2a30'; ctx.beginPath(); ctx.ellipse(lx, ly + 18, 90, 28, 0, 0, Math.PI); ctx.fill();
  ctx.save(); ctx.translate(lx - 80, ly + 14); ctx.rotate(-0.5 - 0.1 * Math.sin(tl * 2)); ctx.fillStyle = '#26343b'; ctx.beginPath(); ctx.ellipse(70, 0, 80, 22, 0, Math.PI, 0); ctx.fill(); ctx.restore();
  const got = tl > 2.2;
  const pearlX = got ? lerp(lx, 470, ease.out(prog(tl, 2.2, 2.8))) : lx, pearlY = got ? lerp(ly, yOf(78.6, camD), ease.out(prog(tl, 2.2, 2.8))) : ly;
  glow(ctx, pearlX, pearlY, 260 + 40 * Math.sin(tl * 3), '227,52,44', 0.55);
  ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.arc(pearlX, pearlY, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(pearlX - 7, pearlY - 7, 6, 0, Math.PI * 2); ctx.fill();
  impactRing(ctx, pearlX, pearlY, tl, 2.3, { r: 300 });
  // le héros arrive, tend la main, attrape la perle
  const arrive = ease.out(prog(tl, 0, 1.4));
  const x = lerp(540, 470, arrive), y = yOf(lerp(74, 78.6, arrive), camD);
  diver(ctx, x, y, tl, { angle: lerp(Math.PI, Math.PI * 0.75, arrive), kick: 0.6, arms: tl > 1.6 ? 'reach' : 'streamline', mouth: got ? 'smirk' : 'grit' });
  // un téléphone allumé coule à côté de lui… il ne le regarde pas
  phone(ctx, 860 + Math.sin(tl) * 20, yOf(73 + tl * 1.2, camD), 0.4 + tl * 0.3, 1, 0.8);
  jellyfish(ctx, 200, yOf(76.5 + Math.sin(tl * 0.6) * 0.3, camD), tl, 1.1, 3);
  ctx.restore();
  bubble(ctx, 'PLUS TARD.', 470, yOf(77, camD) - 40, tl, 3.0, { dark: true, log });
  title(ctx, tl, [['−80 M', RED]], 0.05, 96);
}

// ------------------------------------------------------------------ 7. chute : il remonte avec la perle
function chute(ctx, tl) {
  const camD = lerp(30, 10, ease.inOut(prog(tl, 0, 5 * B)));
  ctx.save(); camera(ctx, { zoom: 1.05, x: 540, y: 1000 });
  ocean(ctx, tl + 30, camD);
  const x = 540, y = yOf(camD + 0.6, camD);
  diver(ctx, x, y, tl, { angle: 0.05, kick: 1.3, arms: 'reach', mouth: 'happy' });
  const [hx, hy] = headOf(x, y, 0.05);
  glow(ctx, hx + 60, hy - 60, 240, '227,52,44', 0.5);
  ctx.fillStyle = '#ff5a4f'; ctx.beginPath(); ctx.arc(hx + 60, hy - 60, 20, 0, Math.PI * 2); ctx.fill();
  bubbles(ctx, tl, hx, hy, { n: 10, rate: 1.4, seed: 11 });
  ctx.restore();
  topBand(ctx);
  kinetic(ctx, [['CE QUI COMPTE', '#f1f1f1']], 420, 72, tl, 0.3);
  kinetic(ctx, [['EST EN ', '#f1f1f1'], ['PROFONDEUR.', RED]], 525, 84, tl, 1.0, { rise: 60 });
}

const end = (ctx, tl) => endCard(ctx, tl, { teaser: 'LA SUITE', handle: HANDLE, series: SERIES, t: tl });
const SCENES = [[S.ouverture, ouverture], [S.conflit, conflit], [S.effort, effort], [S.obstacle, obstacle], [S.progression, progression], [S.retournement, retournement], [S.chute, chute], [S.outro, end]];

export function draw(ctx, t) {
  TEXTLOG.frame = [];
  if (t >= S.end - B) { ouverture(ctx, 0); return; }
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
  const [t0, fn] = SCENES[k];
  const since = t - t0, sh = k > 0 ? 14 * Math.exp(-since * 9) : 0;
  ctx.save(); ctx.translate(noise(t * 50, 5) * sh, noise(t * 50, 9) * sh);
  fn(ctx, since);
  ctx.restore();
  if (k > 0 && since < 0.08) { ctx.fillStyle = `rgba(220,245,255,${(0.3 * (1 - since / 0.08)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}
export const samples = (t) => (t >= S.progression && t < S.retournement ? 2 : 1);
export const post = grainVignette;

export const HITS = [
  // ouverture : notification (bip), il se retourne et remonte, éclaboussure à la surface
  { t: 0, sfx: 'pop', gain: 0.9 }, { t: 0.02, sfx: 'ding', gain: 0.5 }, { t: 0, sfx: 'underwater', gain: 0.9, len: S.chute + 5 * B },
  { t: 0.3, sfx: 'swish', gain: 0.7 }, { t: 0.55, sfx: 'whoosh', gain: 0.5, len: 0.5 }, ...[0.4, 0.9, 1.4, 1.9].map((t) => ({ t, sfx: 'blub', gain: 0.5 })), { t: 2 * B, sfx: 'pop', gain: 0.6 },
  // conflit : notifications
  { t: S.conflit, sfx: 'splash', gain: 0.8 }, ...[0.2, 0.9, 1.5, 2.3, 3.0].map((d) => ({ t: S.conflit + d, sfx: 'ding', gain: 0.3 })), { t: S.conflit + 0.5, sfx: 'pop', gain: 0.6 }, { t: S.conflit + 1.7, sfx: 'pop', gain: 0.6 },
  // effort : il lâche, les téléphones remontent, il plonge
  { t: S.effort, sfx: 'whoosh', gain: 0.6 }, { t: S.effort + 0.5, sfx: 'click', gain: 0.6 }, { t: S.effort + 0.7, sfx: 'swish', gain: 0.6 }, { t: S.effort + 1.0, sfx: 'whoosh', gain: 0.6, len: 0.6 },
  ...[1.3, 1.9, 2.6, 3.2].map((d) => ({ t: S.effort + d, sfx: 'blub', gain: 0.45 })),
  // obstacle : hésitation, puis minuteur
  { t: S.obstacle, sfx: 'impact', gain: 0.5 }, ...[0.2, 0.5, 0.8, 1.1].map((d) => ({ t: S.obstacle + d, sfx: 'blub', gain: 0.5 })), { t: S.obstacle + 1.5, sfx: 'pop', gain: 0.7 }, { t: S.obstacle + 1.6, sfx: 'click', gain: 0.6 },
  // progression : descente rapide
  { t: S.progression, sfx: 'whoosh', gain: 0.7, len: 0.6 }, { t: S.progression + 0.4, sfx: 'click', gain: 0.6 }, { t: S.progression + 2.0, sfx: 'riser', gain: 0.3, len: 1.8 },
  // retournement : perle
  { t: S.retournement, sfx: 'impact', gain: 0.6 }, { t: S.retournement + 2.3, sfx: 'ding', gain: 0.7 }, { t: S.retournement + 2.3, sfx: 'impact', gain: 0.8 }, { t: S.retournement + 3.0, sfx: 'pop', gain: 0.7 },
  // chute + fin
  { t: S.chute, sfx: 'whoosh', gain: 0.6 }, { t: S.chute + 0.3, sfx: 'pop', gain: 0.5 }, { t: S.chute + 1.0, sfx: 'impact', gain: 0.9 },
  { t: S.outro, sfx: 'impact', gain: 0.7 }, { t: S.outro + 0.2, sfx: 'pop', gain: 0.6 }, { t: S.end - B, sfx: 'whoosh', gain: 0.6 },
];
