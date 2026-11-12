// Plan d'ouverture dessiné en code : terrain de foot de nuit, projecteurs, frappe du ballon.
// drawFoot(ctx, t) : t = temps local du plan (0 → 2 s). Rendu déterministe (aucun hasard non fixé).
(() => {
  const W = 1080, H = 1920, HZ = 1010;          // ligne d'horizon (bas de la clôture)
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = x => 1 - Math.pow(1 - clamp(x), 3);

  // ---------- décor fixe, pré-rendu une fois (plus large que l'écran pour bouger la caméra)
  const PAD = 160, BW = W + PAD * 2, BH = H + PAD * 2;
  const bg = document.createElement('canvas'); bg.width = BW; bg.height = BH;
  const b = bg.getContext('2d');
  b.translate(PAD, PAD);
  // ciel nuit, léger violet (charte)
  let g = b.createLinearGradient(0, -PAD, 0, HZ);
  g.addColorStop(0, '#05060f'); g.addColorStop(0.6, '#10112a'); g.addColorStop(1, '#23224a');
  b.fillStyle = g; b.fillRect(-PAD, -PAD, BW, HZ + PAD);
  // immeubles (gauche) avec fenêtres allumées
  const blds = [[-160, 470, 330, 540], [150, 560, 240, 450], [370, 700, 150, 310], [1060, 640, 200, 370]];
  for (const [x, y, w, h] of blds) {
    b.fillStyle = '#121427'; b.fillRect(x, y, w, h);
    b.fillStyle = 'rgba(255,255,255,.04)'; b.fillRect(x, y, w, 6);
    for (let wy = y + 30; wy < y + h - 40; wy += 46) for (let wx = x + 18; wx < x + w - 30; wx += 40) {
      const r = rnd();
      b.fillStyle = r < 0.32 ? `rgba(255,${190 + (r * 150) | 0},110,${0.55 + r})` : r < 0.4 ? 'rgba(140,170,255,.35)' : 'rgba(0,0,0,.35)';
      b.fillRect(wx, wy, 20, 26);
    }
  }
  // poteaux des projecteurs
  const LAMPS = [[640, 640], [930, 700]];
  for (const [x, y] of LAMPS) { b.fillStyle = '#2a2c40'; b.fillRect(x - 4, y, 8, HZ - y); }
  // clôture / filet de fond
  b.fillStyle = 'rgba(30,60,48,.85)'; b.fillRect(-PAD, HZ - 130, BW, 130);
  b.strokeStyle = 'rgba(160,200,180,.10)'; b.lineWidth = 1;
  for (let x = -PAD; x < BW; x += 14) { b.beginPath(); b.moveTo(x, HZ - 130); b.lineTo(x + 14, HZ); b.stroke(); b.beginPath(); b.moveTo(x + 14, HZ - 130); b.lineTo(x, HZ); b.stroke(); }
  b.fillStyle = 'rgba(200,230,215,.25)'; b.fillRect(-PAD, HZ - 132, BW, 3);
  // cage de but au loin
  const GX = 540, GW = 330, GH = 110, GY = HZ + 18;
  b.strokeStyle = 'rgba(255,255,255,.18)'; b.lineWidth = 1;
  for (let x = GX - GW / 2; x <= GX + GW / 2; x += 9) { b.beginPath(); b.moveTo(x, GY - GH); b.lineTo(x + 6, GY - 20); b.stroke(); }
  for (let y = GY - GH; y < GY - 20; y += 9) { b.beginPath(); b.moveTo(GX - GW / 2, y); b.lineTo(GX + GW / 2, y); b.stroke(); }
  b.strokeStyle = '#f2f4f7'; b.lineWidth = 6; b.lineCap = 'round';
  b.beginPath(); b.moveTo(GX - GW / 2, GY); b.lineTo(GX - GW / 2, GY - GH); b.lineTo(GX + GW / 2, GY - GH); b.lineTo(GX + GW / 2, GY); b.stroke();
  // pelouse : dégradé + bandes de tonte en perspective
  g = b.createLinearGradient(0, HZ, 0, H + PAD);
  g.addColorStop(0, '#16351a'); g.addColorStop(0.25, '#235a22'); g.addColorStop(1, '#3c8a2c');
  b.fillStyle = g; b.fillRect(-PAD, HZ, BW, H + PAD - HZ);
  for (let i = 0; i < 14; i++) {
    const z0 = i, z1 = i + 1, y0 = HZ + 2400 / (14 - z0 + 1.6) - 150, y1 = HZ + 2400 / (14 - z1 + 1.6) - 150;
    if (i % 2) { b.fillStyle = 'rgba(0,0,0,.10)'; b.fillRect(-PAD, y0, BW, y1 - y0); }
  }
  // brins d'herbe, plus gros au premier plan
  for (let i = 0; i < 26000; i++) {
    const y = HZ + Math.pow(rnd(), 0.55) * (H + PAD - HZ);
    const x = -PAD + rnd() * BW, d = (y - HZ) / (H - HZ);
    const len = 2 + d * d * 34, lean = (rnd() - 0.5) * len * 0.5;
    const l = 25 + rnd() * 30 + d * 10;
    b.strokeStyle = `hsla(${95 + rnd() * 25},55%,${l}%,${0.35 + rnd() * 0.5})`;
    b.lineWidth = 0.6 + d * 2.4;
    b.beginPath(); b.moveTo(x, y); b.lineTo(x + lean, y - len); b.stroke();
  }
  // lueur des projecteurs sur la pelouse
  for (const [x] of LAMPS) {
    const rg = b.createRadialGradient(x - 120, HZ + 300, 0, x - 120, HZ + 300, 700);
    rg.addColorStop(0, 'rgba(230,240,255,.20)'); rg.addColorStop(1, 'rgba(230,240,255,0)');
    b.fillStyle = rg; b.fillRect(-PAD, HZ, BW, 1200);
  }

  // ---------- ballon
  function ball(c, x, y, r, rot, blur) {
    c.save(); c.translate(x, y);
    // ombre au sol
    c.save(); c.scale(1, 0.22); c.beginPath(); c.arc(r * 0.15, r * 4.2, r * 1.05, 0, Math.PI * 2);
    c.fillStyle = `rgba(0,0,0,${0.45 * (1 - blur)})`; c.fill(); c.restore();
    c.rotate(rot);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.closePath();
    let sg = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.7, '#d9dde3'); sg.addColorStop(1, '#7d838e');
    c.fillStyle = sg; c.fill();
    c.save(); c.clip();
    // panneaux sombres (pentagones) répartis sur la sphère
    const P = [[0, 0, 0.36], [0.72, -0.35, 0.26], [-0.7, -0.4, 0.26], [0.05, 0.82, 0.26], [0.85, 0.6, 0.2], [-0.8, 0.55, 0.2], [0, -0.92, 0.22]];
    for (const [px, py, s] of P) {
      c.beginPath();
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; c.lineTo(px * r + Math.cos(a) * s * r, py * r + Math.sin(a) * s * r); }
      c.closePath(); c.fillStyle = '#1c1f26'; c.fill();
    }
    c.strokeStyle = 'rgba(40,44,52,.55)'; c.lineWidth = Math.max(1, r * 0.025);
    for (const [px, py, s] of P) for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 - Math.PI / 2;
      c.beginPath(); c.moveTo(px * r + Math.cos(a) * s * r, py * r + Math.sin(a) * s * r); c.lineTo(px * r + Math.cos(a) * s * r * 2.1, py * r + Math.sin(a) * s * r * 2.1); c.stroke();
    }
    c.restore();
    // ombrage + reflet du projecteur
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2);
    sg = c.createRadialGradient(-r * 0.4, -r * 0.45, 0, 0, 0, r * 1.05);
    sg.addColorStop(0, 'rgba(255,255,255,.35)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,10,.45)');
    c.fillStyle = sg; c.fill();
    c.restore();
  }

  function lamp(c, x, y, pulse) {
    c.save(); c.globalCompositeOperation = 'lighter';
    let rg = c.createRadialGradient(x, y, 0, x, y, 420);
    rg.addColorStop(0, `rgba(255,255,255,${0.9 * pulse})`); rg.addColorStop(0.05, 'rgba(220,230,255,.55)'); rg.addColorStop(0.3, 'rgba(150,140,255,.12)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(x - 420, y - 420, 840, 840);
    c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(x - 26, y - 10, 52, 20);
    // traînées d'étoile (objectif)
    c.strokeStyle = 'rgba(200,210,255,.25)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 260, y); c.lineTo(x + 260, y); c.stroke();
    c.beginPath(); c.moveTo(x, y - 160); c.lineTo(x, y + 160); c.stroke();
    c.restore();
  }

  // particules d'herbe projetées à l'impact (positions fixes, seedées)
  const BITS = Array.from({ length: 70 }, () => [rnd() * Math.PI - Math.PI, 300 + rnd() * 900, 2 + rnd() * 5, rnd()]);

  const KICK = 0.85;           // instant de la frappe
  const FLY = 0.62;            // durée du vol vers le but
  window.drawFoot = (c, t) => {
    c.save();
    // caméra : légère respiration « filmé à la main » + zoom lent ; recul et tilt après la frappe
    const k = clamp((t - KICK) / FLY);
    const hx = Math.sin(t * 5.3) * 6 + Math.sin(t * 11.7) * 2.5, hy = Math.cos(t * 4.1) * 5;
    const shake = t > KICK ? Math.exp(-(t - KICK) * 9) * 26 : 0;
    const sx = hx + Math.sin(t * 90) * shake, sy = hy + Math.cos(t * 77) * shake;
    const z = 1.06 + 0.04 * t - 0.05 * ease(k);
    const tilt = 120 * ease(k);   // la caméra suit le ballon vers le but
    c.translate(W / 2 + sx, H / 2 + sy + tilt); c.scale(z, z); c.translate(-W / 2, -H / 2);
    c.drawImage(bg, -PAD, -PAD);
    for (const [x, y] of LAMPS) lamp(c, x, y, 1 + 0.05 * Math.sin(t * 30 + x));

    // ballon : posé au premier plan → frappé → finit dans le filet
    const X0 = 560, Y0 = 1520, R0 = 120, X1 = 548, Y1 = HZ - 40, R1 = 11;
    if (t < KICK) {
      ball(c, X0, Y0, R0, -0.15 + Math.sin(t * 2) * 0.02, 0);
    } else {
      const e = ease(k);
      const x = X0 + (X1 - X0) * e, r = R0 + (R1 - R0) * Math.pow(e, 0.55);
      const arc = Math.sin(Math.PI * Math.min(1, e)) * 230;
      const y = Y0 + (Y1 - Y0) * e - arc;
      // traînée de vitesse
      c.save(); c.globalAlpha = 0.25 * (1 - e);
      for (let j = 1; j < 6; j++) {
        const e2 = ease(clamp((t - j * 0.012 - KICK) / FLY));
        const x2 = X0 + (X1 - X0) * e2, y2 = Y0 + (Y1 - Y0) * e2 - Math.sin(Math.PI * e2) * 230;
        c.beginPath(); c.arc(x2, y2, R0 + (R1 - R0) * Math.pow(e2, 0.55), 0, Math.PI * 2); c.fillStyle = '#dfe3ea'; c.fill();
      }
      c.restore();
      ball(c, x, y, r, -0.15 + (t - KICK) * 22, Math.min(1, e * 2));
      // filet qui bouge quand le ballon arrive
      if (k >= 1) {
        const n = Math.exp(-(t - KICK - FLY) * 6);
        c.save(); c.globalCompositeOperation = 'lighter';
        const rg = c.createRadialGradient(X1, Y1, 0, X1, Y1, 90);
        rg.addColorStop(0, `rgba(255,255,255,${0.35 * n})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = rg; c.fillRect(X1 - 90, Y1 - 90, 180, 180); c.restore();
      }
    }
    // impact : éclair + herbe projetée
    if (t > KICK - 0.02) {
      const d = t - KICK;
      const fl = Math.exp(-Math.max(0, d) * 14);
      c.save(); c.globalCompositeOperation = 'lighter';
      const rg = c.createRadialGradient(X0 - 40, Y0 + 60, 0, X0 - 40, Y0 + 60, 420);
      rg.addColorStop(0, `rgba(255,255,255,${0.55 * fl})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = rg; c.fillRect(X0 - 460, Y0 - 360, 840, 840); c.restore();
      for (const [a, v, s, h] of BITS) {
        const tt = Math.max(0, d);
        const px = X0 - 30 + Math.cos(a) * v * tt, py = Y0 + 90 + Math.sin(a) * v * tt + 1400 * tt * tt;
        c.fillStyle = `hsla(${100 + h * 20},50%,${35 + h * 25}%,${Math.max(0, 1 - tt * 1.6)})`;
        c.fillRect(px, py, s, s * 2.2);
      }
    }
    c.restore();
    // étalonnage : vignette + grain léger
    const vg = c.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.7)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  };
})();
