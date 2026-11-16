// Harnais du lecteur : charge le film demandé (?film=nom → films/nom.js) et expose window.seek(t),
// qui peint l'image au temps t (fonction pure du temps : rendu image par image reproductible).
const params = new URLSearchParams(location.search);
const name = (params.get('film') || 'discipline').replace(/[^a-z0-9-]/g, '');
const canvas = document.getElementById('film');

const mod = await import(`./films/${name}.js`);
const W = mod.W || 1080, H = mod.H || 1920;
canvas.width = W; canvas.height = H;
await Promise.all(['900 40px Display', '800 40px Display', '700 40px Display', '40px Serif'].map((f) => document.fonts.load(f, 'AaÉé0').catch(() => null)));
if (mod.init) await mod.init();

const ctx = canvas.getContext('2d', { alpha: false });
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const bctx = buf.getContext('2d', { alpha: false });
const fps = Number(params.get('fps') || mod.FPS || 30);
const paint = (c, t) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none'; mod.draw(c, t); c.restore(); };

window.seek = (t) => {
  const n = mod.samples ? mod.samples(t) : 1;
  if (n <= 1) { paint(ctx, t); }
  else {
    for (let k = 0; k < n; k++) { paint(bctx, t + (k / n) * (0.5 / fps)); ctx.globalAlpha = 1 / (k + 1); ctx.drawImage(buf, 0, 0); }
    ctx.globalAlpha = 1;
  }
  if (mod.post) { ctx.save(); mod.post(ctx, t); ctx.restore(); }
};
window.DURATION = mod.DURATION;
window.FPS = mod.FPS || null;
window.HITS = mod.HITS || [];
window.MUSIC = mod.MUSIC || null;
window.seek(0);
window.filmReady = true;

if (params.get('render') !== '1') {
  let start = performance.now();
  const loop = () => { const t = ((performance.now() - start) / 1000) % mod.DURATION; window.seek(t); requestAnimationFrame(loop); };
  canvas.addEventListener('click', () => { start = performance.now(); });
  requestAnimationFrame(loop);
}
