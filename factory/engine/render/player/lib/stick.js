// Rig de bonhomme « épais » (style motion design minimaliste) : fonction pure d'une pose.
// Angles en degrés : 0 = membre vers le bas, positif = vers l'avant du personnage.
// Le personnage est ancré à la hanche (x, y). face = 1 (regarde à droite) ou -1.

export const COLORS = { white: '#f1f1f1', gray: '#8c8c8c', dark: '#4a4a4a', red: '#e3342c' };
const D = Math.PI / 180;

export const BODY = { torso: 112, neck: 50, head: 52, upper: 66, fore: 62, thigh: 80, shin: 78, wTorso: 66, wArm: 40, wLeg: 44 };

export const POSES = {
  stand: { lean: 0, head: 0, armB: [10, 12], armF: [-10, 12], legB: [6, -4], legF: [-6, -4] },
  sad: { lean: 6, head: 22, armB: [4, 4], armF: [-4, 4], legB: [4, -2], legF: [-4, -2] },
  hang: { lean: 0, head: -8, armB: [172, 6], armF: [-172, -6], legB: [8, -12], legF: [-6, -18] },
  sit: { lean: -4, head: 6, armB: [30, 40], armF: [26, 44], legB: [86, -84], legF: [92, -90] },
  push: { lean: 34, head: -10, armB: [84, 14], armF: [92, 8], legB: [-34, -16], legF: [26, -38] },
  fall: { lean: 92, head: 10, armB: [150, 20], armF: [40, 30], legB: [8, -6], legF: [-14, -10] },
  victory: { lean: -4, head: -16, armB: [160, 20], armF: [-160, -20], legB: [8, -2], legF: [-8, -2] },
  punch: { lean: 14, head: 0, armB: [40, 110], armF: [96, 0], legB: [-24, -10], legF: [20, -24] },
  kneel: { lean: 8, head: 20, armB: [10, 20], armF: [40, 60], legB: [-60, -110], legF: [86, -86] },
  phone: { lean: 4, head: 28, armB: [40, 100], armF: [36, 104], legB: [6, -4], legF: [-6, -4] },
  carry: { lean: 18, head: 10, armB: [150, 30], armF: [-150, -30], legB: [-14, -20], legF: [16, -26] },
  think: { lean: 2, head: 14, armB: [8, 8], armF: [30, 150], legB: [6, -4], legF: [-6, -4] },
  crouch: { lean: 30, head: 30, armB: [60, 40], armF: [70, 30], legB: [80, -130], legF: [70, -120] },
  lie: { lean: -88, head: 0, armB: [10, 10], armF: [-10, 10], legB: [-2, 0], legF: [2, 0] },
  pull: { lean: -26, head: -6, armB: [70, 10], armF: [80, 0], legB: [-30, -10], legF: [22, -20] },
};

export function lerpPose(a, b, k) {
  const o = {};
  for (const key of Object.keys(a)) {
    const va = a[key], vb = b[key] ?? va;
    o[key] = Array.isArray(va) ? va.map((v, i) => v + (vb[i] - v) * k) : va + (vb - va) * k;
  }
  return o;
}

// Cycles procéduraux (phase en tours : 0..1 = un cycle complet).
export function walk(phase, amp = 1) {
  const s = Math.sin(phase * 2 * Math.PI), c = Math.cos(phase * 2 * Math.PI);
  return {
    lean: 4 * amp, head: 0,
    armB: [-24 * s * amp, 16 + 10 * amp], armF: [24 * s * amp, 16 + 10 * amp],
    legB: [28 * s * amp, -10 - 26 * Math.max(0, -c) * amp], legF: [-28 * s * amp, -10 - 26 * Math.max(0, c) * amp],
  };
}
export function run(phase) {
  const p = walk(phase, 1.6);
  return { ...p, lean: 16, armB: [p.armB[0], 80], armF: [p.armF[0], 80] };
}
export function climb(phase) {
  const s = Math.sin(phase * 2 * Math.PI);
  return {
    lean: 0, head: -10,
    armB: [158 + 18 * s, 18 - 18 * s], armF: [-158 + 18 * s, -18 - 18 * s],
    legB: [36 + 30 * s, -60 - 40 * s], legF: [36 - 30 * s, -60 + 40 * s],
  };
}
export function breathe(pose, t, amt = 1) {
  const b = Math.sin(t * 2.2) * amt;
  return { ...pose, lean: pose.lean + b * 1.5, head: pose.head + b * 2 };
}

function limb(ctx, x, y, a1, l1, a2, l2, w, face) {
  const x1 = x + Math.sin(a1 * D) * l1 * face, y1 = y + Math.cos(a1 * D) * l1;
  const x2 = x1 + Math.sin((a1 + a2) * D) * l2 * face, y2 = y1 + Math.cos((a1 + a2) * D) * l2;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  return [x2, y2];
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(Math.max(0, Math.min(255, v * k))).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
}

// Dessine le bonhomme ; retourne la position du haut de la tête (pour poser une étiquette).
export function drawStick(ctx, x, y, pose, { color = COLORS.white, face = 1, scale = 1, alpha = 1, mouth = null, glow = 0, eyes = false, t = 0, squash = 0, ground = null } = {}) {
  const B = BODY;
  if (ground !== null) {
    // ombre portée au sol : plus petite et plus claire quand le personnage est en l'air
    const feet = y + (B.thigh + B.shin) * scale, air = Math.max(0, Math.min(1, (ground - feet) / 320));
    ctx.save(); ctx.globalAlpha *= alpha * 0.45 * (1 - air * 0.7);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, ground + 4, 95 * scale * (1 - air * 0.5), 16 * scale * (1 - air * 0.5), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.save();
  // squash > 0 : écrasé (atterrissage), < 0 : étiré (saut) ; volume conservé, ancré aux pieds
  const foot = (B.thigh + B.shin) * scale;
  ctx.translate(x, y + foot); ctx.scale(scale * (1 + squash * 0.5), scale * (1 - squash)); ctx.translate(0, -foot / scale);
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  const lean = pose.lean * D * face;
  const nx = Math.sin(lean) * B.torso, ny = -Math.cos(lean) * B.torso;
  const sx = nx * 0.9, sy = ny * 0.9;
  const back = shade(color, 0.78);
  // membres arrière
  ctx.strokeStyle = back;
  limb(ctx, sx, sy, pose.armB[0] + pose.lean, B.upper, pose.armB[1], B.fore, B.wArm, face);
  limb(ctx, 0, 0, pose.legB[0], B.thigh, pose.legB[1], B.shin, B.wLeg, face);
  // tronc
  ctx.strokeStyle = color; ctx.lineWidth = B.wTorso;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(nx, ny); ctx.stroke();
  // tête
  const ha = (pose.lean + pose.head * 0.6) * D * face;
  const hx = nx + Math.sin(ha) * B.neck, hy = ny - Math.cos(ha) * B.neck;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(hx, hy, B.head, 0, Math.PI * 2); ctx.fill();
  if (eyes) {
    // deux yeux tournés vers l'avant, clignement toutes les ~3 s (déterministe)
    const ph = (t * 0.33 + x * 0.0013) % 1, closed = ph > 0.965;
    ctx.fillStyle = '#111';
    for (const dx of [6, 24]) {
      if (closed) ctx.fillRect(hx + dx * face - 5, hy - 6, 10, 3);
      else { ctx.beginPath(); ctx.ellipse(hx + dx * face, hy - 6, 4.5, 7, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  if (mouth) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.beginPath();
    if (mouth === 'sad') ctx.arc(hx + 8 * face, hy + 22, 12, Math.PI * 1.15, Math.PI * 1.85);
    else ctx.arc(hx + 8 * face, hy + 4, 12, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  // membres avant
  ctx.strokeStyle = color;
  limb(ctx, 0, 0, pose.legF[0], B.thigh, pose.legF[1], B.shin, B.wLeg, face);
  limb(ctx, sx, sy, pose.armF[0] + pose.lean, B.upper, pose.armF[1], B.fore, B.wArm, face);
  ctx.restore();
  return { headX: x + hx * scale, headY: y + (hy - B.head) * scale };
}

// Étiquette en capitales espacées (au-dessus d'un personnage ou d'un objet).
export function label(ctx, text, x, y, { size = 34, color = '#f1f1f1', alpha = 1, track = 5, weight = 900 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px Display`;
  ctx.letterSpacing = `${track}px`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillText(text, x + track / 2, y);
  ctx.restore();
}
