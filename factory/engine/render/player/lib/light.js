// Passe « lumière » en WebGL2, appliquée à l'image finie (après le flou de mouvement, avant le grain).
// Outils gratuits utilisés : WebGL2 intégré à Chromium, et le bruit simplex GLSL d'Ashima Arts
// (paquet npm glsl-noise, licence MIT) pour un brouillard qui ondule.
// Effets :
//   - bloom : les zones claires (néons, phares, fenêtres) bavent une lueur douce, sur deux échelles ;
//   - rayons : flou radial depuis une source (lampe, lune, projecteur) → rayons de lumière volumétriques ;
//   - brouillard : brume animée, plus dense en bas, teintée ;
//   - étalonnage : contraste, saturation, ombres froides / hautes lumières chaudes ;
//   - aberration chromatique légère sur les bords (effet objectif).
// Usage dans un film : export const post = cinema((t) => ({ bloom: 0.9, rays: { x: 540, y: 300, strength: 0.5 } }));
// Toutes les coordonnées sont en pixels de l'image (1080 × 1920). Si WebGL2 manque, la passe est ignorée.
import { W, H, grainVignette } from './kit.js';

const NOISE = await fetch('/vendor/simplex3d.glsl').then((r) => (r.ok ? r.text() : '')).catch(() => '');

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const head = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
`;

// 1) extraction des zones claires (seuil doux), écrite à 1/4 de résolution
const FS_BRIGHT = head + `uniform sampler2D src; uniform float thr;
void main() {
  vec3 c = texture(src, uv).rgb;
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float s = (mx - mn) / max(mx, 1e-3);
  // seules les sources colorées brillent (néons, phares, drapeau) : les personnages blancs et les bulles restent nets
  float k = smoothstep(thr, thr + 0.25, mx) * smoothstep(0.25, 0.55, s);
  o = vec4(c * k, 1.0);
}`;

// 2) flou gaussien séparable (9 échantillons, pondérations linéaires)
const FS_BLUR = head + `uniform sampler2D src; uniform vec2 dir;
void main() {
  vec3 s = texture(src, uv).rgb * 0.2270270270;
  s += texture(src, uv + dir * 1.3846153846).rgb * 0.3162162162;
  s += texture(src, uv - dir * 1.3846153846).rgb * 0.3162162162;
  s += texture(src, uv + dir * 3.2307692308).rgb * 0.0702702703;
  s += texture(src, uv - dir * 3.2307692308).rgb * 0.0702702703;
  o = vec4(s, 1.0);
}`;

// 3) rayons de lumière : flou radial vers la source (technique « god rays » en espace écran)
const FS_RAYS = head + `uniform sampler2D src, scene; uniform vec2 pos; uniform float decay; uniform float len; uniform float rad; uniform float aspect;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  vec2 d = (uv - pos) * len / 48.0;
  vec2 q = uv; float w = 1.0; vec3 s = vec3(0.0);
  for (int i = 0; i < 48; i++) {
    q -= d;
    vec2 e = (q - pos) * vec2(aspect, 1.0);
    float disc = exp(-dot(e, e) / (rad * rad));            // la source elle-même
    float occ = 1.0 - 0.8 * smoothstep(0.3, 0.7, lum(texture(scene, q).rgb)); // les formes claires coupent les rayons
    s += (texture(src, q).rgb + vec3(disc * occ)) * w; w *= decay;
  }
  o = vec4(s / 48.0, 1.0);
}`;

// 4) brouillard : bruit fractal animé, calculé à 1/4 de résolution
const FS_FOG = head + NOISE.replace(/#pragma.*$/m, '') + `
uniform float t; uniform float aspect;
void main() {
  vec2 p = vec2(uv.x * aspect, uv.y) * 3.0;
  float n = 0.0, a = 0.5;
  vec3 q = vec3(p + vec2(t * 0.06, 0.0), t * 0.05);
  for (int i = 0; i < 4; i++) { n += a * snoise(q); q = q * 2.03 + vec3(1.7, 9.2, 0.0); a *= 0.5; }
  o = vec4(vec3(smoothstep(-0.25, 0.55, n)), 1.0);
}`;

// 5) composition finale + étalonnage
const FS_FINAL = head + `uniform sampler2D src, bloomA, bloomB, rays, fog;
uniform float bloom, raysK, ca, contrast, sat, warm, fogK, fogH, exposure;
uniform vec3 raysCol, fogCol;
vec3 sat3(vec3 c, float s) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); return mix(vec3(l), c, s); }
void main() {
  vec2 d = uv - 0.5; float r2 = dot(d, d);
  vec2 off = d * ca * r2 * 4.0;
  vec3 c = vec3(texture(src, uv + off).r, texture(src, uv).g, texture(src, uv - off).b);
  c += (texture(bloomA, uv).rgb * 0.6 + texture(bloomB, uv).rgb * 0.9) * bloom;
  c += texture(rays, uv).rgb * raysCol * raysK;
  float f = texture(fog, uv).r;
  float h = smoothstep(fogH, 0.0, uv.y);           // plus dense en bas de l'image
  c = mix(c, fogCol, clamp(f * h * fogK, 0.0, 0.85));
  c *= exposure;
  c = (c - 0.5) * contrast + 0.5;
  c = sat3(c, sat);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += mix(vec3(-0.02, 0.0, 0.035), vec3(0.04, 0.015, -0.03), smoothstep(0.15, 0.75, l)) * warm;  // ombres froides, lumières chaudes
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const DEF = { bloom: 0.7, threshold: 0.62, rays: null, fog: null, contrast: 1.06, sat: 1.06, warm: 1, ca: 0.0015, exposure: 1 };

let G = null;
function setup() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return (G = false);
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (fs) => {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  };
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = (w, h) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  };
  const target = (w, h) => { const t = tex(w, h); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; };
  const q = [W >> 2, H >> 2], e = [W >> 3, H >> 3];
  G = {
    gl, cv, src: tex(W, H),
    P: { bright: prog(FS_BRIGHT), blur: prog(FS_BLUR), rays: prog(FS_RAYS), fog: NOISE ? prog(FS_FOG) : null, final: prog(FS_FINAL) },
    q1: target(...q), q2: target(...q), e1: target(...e), e2: target(...e), ry: target(...q), fg: target(...q), black: target(4, 4),
  };
  gl.bindFramebuffer(gl.FRAMEBUFFER, G.black.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  return G;
}

function pass(P, out, inputs, uni = {}) {
  const { gl } = G; gl.useProgram(P.p);
  gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null);
  gl.viewport(0, 0, out ? out.w : W, out ? out.h : H);
  let unit = 0;
  for (const [name, t] of Object.entries(inputs)) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(P.u[name], unit++); }
  for (const [name, v] of Object.entries(uni)) {
    if (P.u[name] == null) continue;
    if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, P.u[name], v); else gl.uniform1f(P.u[name], v);
  }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

// Applique la passe lumière sur le contexte 2D (image complète déjà peinte).
export function light(ctx, t, opts = {}) {
  if (G === null) { try { setup(); } catch (e) { console.warn('light.js désactivé :', e.message); G = false; } }
  if (!G) return;
  const o = { ...DEF, ...opts }; const { gl } = G;
  gl.bindTexture(gl.TEXTURE_2D, G.src);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
  // bloom sur deux échelles (1/4 et 1/8)
  pass(G.P.bright, G.q1, { src: G.src }, { thr: o.threshold });
  pass(G.P.blur, G.q2, { src: G.q1.t }, { dir: [1 / G.q1.w, 0] });
  pass(G.P.blur, G.q1, { src: G.q2.t }, { dir: [0, 1 / G.q1.h] });
  pass(G.P.blur, G.e1, { src: G.q1.t }, { dir: [2 / G.e1.w, 0] });
  pass(G.P.blur, G.e2, { src: G.e1.t }, { dir: [0, 2 / G.e1.h] });
  let raysT = G.black.t;
  if (o.rays) { pass(G.P.rays, G.ry, { src: G.q1.t, scene: G.src }, { pos: [o.rays.x / W, 1 - o.rays.y / H], decay: o.rays.decay ?? 0.965, len: o.rays.length ?? 0.85, rad: o.rays.radius ?? 0.06, aspect: W / H }); raysT = G.ry.t; }
  let fogT = G.black.t;
  if (o.fog && G.P.fog) { pass(G.P.fog, G.fg, {}, { t: t * (o.fog.speed ?? 1), aspect: W / H }); fogT = G.fg.t; }
  pass(G.P.final, null, { src: G.src, bloomA: G.q1.t, bloomB: G.e2.t, rays: raysT, fog: fogT }, {
    bloom: o.bloom, raysK: o.rays ? (o.rays.strength ?? 0.6) : 0, raysCol: rgb(o.rays?.color || '#ffe2b0'),
    ca: o.ca, contrast: o.contrast, sat: o.sat, warm: o.warm, exposure: o.exposure,
    fogK: o.fog ? (o.fog.density ?? 0.5) : 0, fogH: o.fog ? (o.fog.height ?? 0.5) : 0.5, fogCol: rgb(o.fog?.color || '#3a4062'),
  });
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'copy';
  ctx.drawImage(G.cv, 0, 0); ctx.restore();
}

// Post-traitement « cinéma » : lumière WebGL puis grain + vignette. `cfg(t)` renvoie les réglages du moment.
export const cinema = (cfg = () => ({})) => (ctx, t) => { light(ctx, t, typeof cfg === 'function' ? cfg(t) : cfg); grainVignette(ctx, t); };
