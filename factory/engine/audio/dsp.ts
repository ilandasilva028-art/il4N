// Briques DSP minimales (sans dépendance) : WAV, filtres biquad, oscillateurs, réverbération,
// générateur pseudo-aléatoire déterministe. Tout l'audio généré est original.
import fs from 'node:fs';

export const SR = 48000;

export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function writeWav(file: string, channels: Float32Array[], sr = SR): void {
  const n = channels[0].length, nc = channels.length;
  const buf = Buffer.alloc(44 + n * nc * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * nc * 2, 28); buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const v = Math.max(-1, Math.min(1, channels[c][i]));
    buf.writeInt16LE(Math.round(v * 32767), o); o += 2;
  }
  fs.writeFileSync(file, buf);
}

export function readWavMono(file: string): { data: Float32Array; sr: number } {
  const b = fs.readFileSync(file);
  let o = 12, sr = SR, nc = 1, bits = 16, dataOff = 0, dataLen = 0, fmt = 1;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4);
    if (id === 'fmt ') { fmt = b.readUInt16LE(o + 8); nc = b.readUInt16LE(o + 10); sr = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); }
    if (id === 'data') { dataOff = o + 8; dataLen = Math.min(len, b.length - dataOff); break; }
    o += 8 + len + (len % 2);
  }
  const bps = bits / 8, frames = Math.floor(dataLen / (bps * nc));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < nc; c++) {
      const p = dataOff + (i * nc + c) * bps;
      s += fmt === 3 ? b.readFloatLE(p) : bits === 16 ? b.readInt16LE(p) / 32768 : bits === 24 ? (b.readIntLE(p, 3) / 8388608) : b.readInt32LE(p) / 2147483648;
    }
    out[i] = s / nc;
  }
  return { data: out, sr };
}

export class Biquad {
  b0 = 1; b1 = 0; b2 = 0; a1 = 0; a2 = 0; x1 = 0; x2 = 0; y1 = 0; y2 = 0;
  set(type: 'lp' | 'hp' | 'bp', freq: number, q = 0.707, sr = SR) {
    const w = (2 * Math.PI * Math.min(freq, sr * 0.45)) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  tick(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

// Dent de scie à bande limitée (polyBLEP) : moins de repliement qu'une dent de scie naïve.
export function polyBlepSaw(phase: number, dt: number): number {
  let v = 2 * phase - 1;
  if (phase < dt) { const t = phase / dt; v -= t + t - t * t - 1; }
  else if (phase > 1 - dt) { const t = (phase - 1) / dt; v -= t * t + t + t + 1; }
  return v;
}

// Réverbération de Schroeder (4 filtres en peigne + 2 passe-tout), mono -> stéréo léger.
export function reverb(input: Float32Array, mix = 0.25, size = 1): [Float32Array, Float32Array] {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(d * size * (SR / 44100)));
  const aps = [225, 556].map((d) => Math.round(d * (SR / 44100)));
  const out = [new Float32Array(input.length), new Float32Array(input.length)];
  for (let ch = 0; ch < 2; ch++) {
    const wet = new Float32Array(input.length);
    combs.forEach((d0, k) => {
      const d = d0 + ch * 23 + k;
      const buf = new Float32Array(d); let idx = 0, lp = 0;
      for (let i = 0; i < input.length; i++) {
        const y = buf[idx];
        lp = y * 0.8 + lp * 0.2;
        buf[idx] = input[i] + lp * 0.78;
        idx = (idx + 1) % d;
        wet[i] += y * 0.25;
      }
    });
    for (const d of aps) {
      const buf = new Float32Array(d); let idx = 0;
      for (let i = 0; i < wet.length; i++) {
        const b = buf[idx], x = wet[i];
        buf[idx] = x + b * 0.5;
        wet[i] = b - x * 0.5;
        idx = (idx + 1) % d;
      }
    }
    for (let i = 0; i < input.length; i++) out[ch][i] = input[i] * (1 - mix) + wet[i] * mix;
  }
  return [out[0], out[1]];
}

export function peakNormalize(chs: Float32Array[], peakDb = -1): void {
  let p = 0;
  for (const c of chs) for (let i = 0; i < c.length; i++) p = Math.max(p, Math.abs(c[i]));
  if (p < 1e-6) return;
  const g = 10 ** (peakDb / 20) / p;
  for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= g;
}
