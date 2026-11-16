// Outils d'animation avancés, déterministes (le film reste une fonction pure du temps) :
//  - choreo()  : chorégraphie GSAP (timelines, easings pro) « seekée » au temps exact de chaque image ;
//  - bake()    : physique Matter.js précalculée une fois, puis lue image par image (débris, objets qui tombent) ;
//  - ik2 / gait : cinématique inverse (pieds plantés au sol sans glisser, mains qui attrapent une cible).
// GSAP (licence GreenSock « no charge », usage commercial autorisé) et Matter.js (MIT) sont chargés par index.html.
import { BODY } from './stick.js';

const D = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ------------------------------------------------------------------ GSAP
// choreo({ zoom: 1 }, (tl, s) => { tl.to(s, { zoom: 1.2, duration: 0.4, ease: 'back.out(2)' }, 0.5); })
// → fonction t ↦ état (objet) ; à appeler à chaque image.
export function choreo(initial, build) {
  const g = globalThis.gsap;
  if (!g) throw new Error('GSAP absent : vérifier index.html (vendor/gsap.js).');
  const state = { ...initial };
  const tl = g.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  build(tl, state);
  return (t) => { tl.time(clamp(t, 0, tl.duration()), true); return state; };
}

// ------------------------------------------------------------------ physique Matter.js
// bake((M, world) => [{ body, w, h, color, r }...], { duration, ground, walls }) → { at(t) → [{x,y,a,item}] }
export function bake(setup, { duration = 3, fps = 60, gravity = 1.4, ground = 1300, walls = true, W = 1080 } = {}) {
  const M = globalThis.Matter;
  if (!M) throw new Error('Matter.js absent : vérifier index.html (vendor/matter.js).');
  const engine = M.Engine.create({ enableSleeping: false });
  engine.gravity.y = gravity;
  const statics = [M.Bodies.rectangle(W / 2, ground + 50, W * 3, 100, { isStatic: true, friction: 0.8 })];
  if (walls) statics.push(M.Bodies.rectangle(-60, 0, 100, 6000, { isStatic: true }), M.Bodies.rectangle(W + 60, 0, 100, 6000, { isStatic: true }));
  M.Composite.add(engine.world, statics);
  const items = setup(M, engine.world);
  M.Composite.add(engine.world, items.map((i) => i.body));
  const n = Math.ceil(duration * fps), frames = [];
  for (let i = 0; i <= n; i++) {
    frames.push(items.map((it) => [it.body.position.x, it.body.position.y, it.body.angle]));
    M.Engine.update(engine, 1000 / fps);
  }
  return {
    items,
    at(t) { const f = frames[clamp(Math.round(t * fps), 0, n)]; return items.map((it, k) => ({ x: f[k][0], y: f[k][1], a: f[k][2], item: it })); },
  };
}

// Éclatement : n morceaux rectangulaires projetés depuis (x, y), qui retombent et rebondissent au sol.
export function shatterBake({ x, y, n = 14, w = 26, h = 18, power = 14, colors = ['#e9e9eb'], seed = 1, ground = 1300, duration = 3, spread = 1 }) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return bake((M) => Array.from({ length: n }, (_, i) => {
    const ww = w * (0.6 + rnd() * 0.8), hh = h * (0.6 + rnd() * 0.8);
    const body = M.Bodies.rectangle(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 30, ww, hh, { restitution: 0.35, friction: 0.6, frictionAir: 0.01, chamfer: { radius: 3 } });
    const ang = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * 1.2 * spread;
    M.Body.setVelocity(body, { x: Math.cos(ang) * power * (0.5 + rnd()), y: Math.sin(ang) * power * (0.5 + rnd()) });
    M.Body.setAngularVelocity(body, (rnd() - 0.5) * 0.6);
    return { body, w: ww, h: hh, color: colors[i % colors.length] };
  }), { duration, ground });
}

// Mur de briques qui s'effondre (briques empilées, poussées par un impact).
export function wallBake({ x, y, cols = 3, rows = 9, bw = 72, bh = 72, push = 7, seed = 3, ground = 1300, duration = 3, color = '#3d3d40' }) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return bake((M) => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const body = M.Bodies.rectangle(x + c * bw + bw / 2, y - r * bh - bh / 2, bw - 3, bh - 3, { restitution: 0.15, friction: 0.7 });
      M.Body.setVelocity(body, { x: push * (0.3 + rnd()) * (r / rows + 0.3), y: -rnd() * 3 });
      M.Body.setAngularVelocity(body, (rnd() - 0.4) * 0.12);
      out.push({ body, w: bw - 3, h: bh - 3, color: (r + c) % 2 ? color : '#47474a' });
    }
    return out;
  }, { duration, ground });
}

export function drawBaked(ctx, frame, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  for (const p of frame) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.fillStyle = p.item.color; ctx.beginPath(); ctx.roundRect(-p.item.w / 2, -p.item.h / 2, p.item.w, p.item.h, 3); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ cinématique inverse
// Deux segments (L1, L2) depuis l'origine vers la cible (dx vers l'avant, dy vers le bas), en unités du rig.
// Renvoie [a1, a2] en degrés, au format des poses (0 = vers le bas, + = vers l'avant). bend = +1 : genou en avant.
export function ik2(dx, dy, L1, L2, bend = 1) {
  const dist = Math.hypot(dx, dy);
  const d = clamp(dist, Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
  const phi = Math.atan2(dx, dy);
  const tx = Math.sin(phi) * d, ty = Math.cos(phi) * d;
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const a1 = phi + bend * A;
  const kx = Math.sin(a1) * L1, ky = Math.cos(a1) * L1;
  const a2 = Math.atan2(tx - kx, ty - ky) - a1;
  return [a1 / D, ((a2 / D + 540) % 360) - 180];
}

// Marche avec pieds plantés : la hanche avance à vitesse constante, chaque pied reste fixe au sol pendant
// l'appui puis décrit un arc. Renvoie { x, y, pose } à passer à drawStick (avec scale identique).
export function gait(t, { x0 = 200, speed = 260, ground = 1300, scale = 1, face = 1, stepLen = 105, lift = 34, lean = 5, run = false } = {}) {
  const L = BODY.thigh + BODY.shin;
  const C = 2 * stepLen * scale;              // distance parcourue par cycle complet
  const travel = speed * t;
  const hipX = x0 + face * travel;
  const p0 = ((travel / C) % 1 + 1) % 1;
  const stance = run ? 0.4 : 0.62;
  const foot = (ph) => {
    if (ph < stance) return { rel: C * (0.5 * stance - ph), lift: 0 };            // pied fixe dans le monde
    const q = (ph - stance) / (1 - stance), e = q * q * (3 - 2 * q);
    return { rel: C * (-0.5 * stance + e * stance), lift: Math.sin(Math.PI * q) * lift * scale * (run ? 1.6 : 1) };
  };
  const fF = foot(p0), fB = foot((p0 + 0.5) % 1);
  const bob = (run ? 14 : 7) * scale * Math.abs(Math.cos(2 * Math.PI * p0));
  const hipY = ground - L * scale * (run ? 0.9 : 0.94) + bob - (run ? 10 * scale : 0);
  const leg = (f) => ik2(f.rel / scale, (ground - f.lift - hipY) / scale, BODY.thigh, BODY.shin, 1);
  const sw = Math.sin(2 * Math.PI * p0);
  return {
    x: hipX, y: hipY,
    pose: {
      lean: run ? 16 : lean, head: 0,
      armB: [24 * sw * (run ? 1.8 : 1), run ? 80 : 20], armF: [-24 * sw * (run ? 1.8 : 1), run ? 80 : 20],
      legF: leg(fF), legB: leg(fB),
    },
    plantedF: fF.lift === 0, plantedB: fB.lift === 0,
  };
}

// Instants où un pied touche le sol (pour les bruitages de pas parfaitement synchronisés).
export function gaitSteps(t0, t1, opts = {}) {
  const { speed = 260, scale = 1, stepLen = 105, run = false } = opts;
  const C = 2 * stepLen * scale, stance = run ? 0.4 : 0.62, out = [];
  for (let k = 0; ; k++) {
    for (const off of [0, 0.5]) {
      // le pied avant (phase 0 à l'instant 0) se pose quand sa phase revient à 0, l'autre à 0,5 cycle d'écart
      const travel = (k + off) * C;
      const t = t0 + travel / speed;
      if (t > t1) return out;
      if (t > t0 + 0.05) out.push({ t, sfx: 'step', gain: 0.55 });
    }
  }
  void stance;
}
