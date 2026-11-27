// Couche de motion design générique (formes, éclats, rayons, particules), pilotée par la fiche MONTAGE.
// Se place entre l'image du film et les textes : décor animé, jamais devant les mots.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import type { MontageSpec } from './Montage';

const COL: Record<string, string> = { ego: '#e9c75a', obsession: '#b28cff', chance: '#7fdc9a', discipline: '#e3342c' };
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const c01 = (x: number) => Math.min(1, Math.max(0, x));
const out = (x: number) => 1 - Math.pow(1 - c01(x), 3);

// Éclat de coupe : anneaux + traits de vitesse + bandes diagonales colorées
const CutBurst: React.FC<{ t: number; at: number; color: string; dir: number }> = ({ t, at, color, dir }) => {
  const u = t - at; if (u < -0.12 || u > 0.55) return null;
  const k = c01(u / 0.45), wipe = c01((u + 0.12) / 0.3);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {[0, 1, 2].map((i) => <div key={i} style={{ position: 'absolute', left: -400, right: -400, top: 300 + i * 520, height: 140, background: i === 1 ? '#fff' : color, opacity: 0.85 * (1 - wipe) * (u < 0.18 ? 1 : 0), transform: `translateX(${dir * (wipe * 2600 - 1300)}px) rotate(-14deg)` }} />)}
      {[0, 1, 2].map((i) => { const r = out(k - i * 0.12) * 1100; return <div key={'r' + i} style={{ position: 'absolute', left: 540 - r / 2, top: 960 - r / 2, width: r, height: r, borderRadius: '50%', border: `${10 - i * 3}px solid ${i ? '#fff' : color}`, opacity: (1 - k) * 0.7 }} />; })}
      {Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2 + rnd(i) * 0.3, d = 160 + out(k) * 700, len = 120 * (1 - k); return <div key={'l' + i} style={{ position: 'absolute', left: 540 + Math.cos(a) * d, top: 960 + Math.sin(a) * d, width: len, height: 5, background: i % 3 ? '#fff' : color, opacity: 1 - k, transform: `rotate(${a}rad)`, transformOrigin: '0 50%' }} />; })}
    </AbsoluteFill>
  );
};

// Fond de carte personnage : rayons tournants + halo + soulignement animé + étincelles
const CardFX: React.FC<{ t: number; who: string; start: number; end: number }> = ({ t, who, start, end }) => {
  const u = t - start; if (u < 0 || t > end) return null;
  const c = COL[who] ?? '#fff', k = out(u / 0.35), fade = c01((end - t) / 0.25);
  return (
    <AbsoluteFill style={{ opacity: fade, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 540 - 520, top: 470 - 520, width: 1040, height: 1040, borderRadius: '50%', opacity: 0.32 * k, transform: `rotate(${u * 25}deg) scale(${0.4 + 0.6 * k})`, background: `repeating-conic-gradient(${c}55 0deg 9deg, transparent 9deg 22deg)`, maskImage: 'radial-gradient(circle, #000 15%, transparent 65%)', WebkitMaskImage: 'radial-gradient(circle, #000 15%, transparent 65%)' }} />
      <div style={{ position: 'absolute', left: 540 - 380, top: 470 - 150, width: 760, height: 300, borderRadius: '50%', background: `radial-gradient(${c}66, transparent 70%)`, opacity: k }} />
      <div style={{ position: 'absolute', top: 572, left: 540 - 260 * k, width: 520 * k, height: 8, borderRadius: 4, background: c, boxShadow: `0 0 24px ${c}` }} />
      {Array.from({ length: 14 }, (_, i) => { const ph = (u * 0.7 + rnd(i)) % 1, x = 160 + rnd(i + 9) * 760, y = 640 - ph * 380, s = 6 + rnd(i + 3) * 12; return <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, background: c, opacity: Math.sin(ph * Math.PI) * 0.9, transform: `rotate(${ph * 360 + i * 30}deg)`, borderRadius: i % 2 ? '50%' : 2 }} />; })}
    </AbsoluteFill>
  );
};

// Accroche : crochets rouges qui encadrent le texte + flash d'entrée
const HookFX: React.FC<{ t: number; end: number }> = ({ t, end }) => {
  if (t > end) return null;
  const k = out(t / 0.4), f = c01((end - t) / 0.3), pulse = 1 + 0.03 * Math.sin(t * 8);
  const br = (s: React.CSSProperties) => <div style={{ position: 'absolute', width: 70, height: 70, borderColor: '#e3342c', borderStyle: 'solid', borderWidth: 0, ...s }} />;
  return (
    <AbsoluteFill style={{ opacity: f, pointerEvents: 'none', transform: `scale(${pulse})` }}>
      <div style={{ position: 'absolute', left: 540 - 460 * k, top: 340, width: 920 * k, height: 290 }}>
        {br({ left: 0, top: 0, borderLeftWidth: 10, borderTopWidth: 10 })}{br({ right: 0, top: 0, borderRightWidth: 10, borderTopWidth: 10 })}
        {br({ left: 0, bottom: 0, borderLeftWidth: 10, borderBottomWidth: 10 })}{br({ right: 0, bottom: 0, borderRightWidth: 10, borderBottomWidth: 10 })}
      </div>
      {t < 0.15 && <AbsoluteFill style={{ background: '#fff', opacity: 0.6 * (1 - t / 0.15) }} />}
    </AbsoluteFill>
  );
};

// Fin : formes qui gravitent autour de la question
const OutroFX: React.FC<{ t: number; start: number; end: number }> = ({ t, start, end }) => {
  const u = t - start; if (u < 0 || t > end) return null;
  const k = out(u / 0.5);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Object.values(COL).map((c, i) => Array.from({ length: 5 }, (_, j) => { const a = u * (0.9 + i * 0.2) + (i * 5 + j) * 1.26, r = (280 + j * 40) * k; const s = 14 + j * 4; return <div key={i + '-' + j} style={{ position: 'absolute', left: 540 + Math.cos(a) * r * 1.4 - s / 2, top: 490 + Math.sin(a) * r * 0.55 - s / 2, width: s, height: s, background: c, borderRadius: j % 2 ? '50%' : 3, transform: `rotate(${a}rad)`, opacity: 0.85 }} />; }))}
    </AbsoluteFill>
  );
};

// Ambiance continue : poussières, battement de vignette au tempo, grain
const Ambient: React.FC<{ t: number; bpm: number }> = ({ t, bpm }) => {
  const beat = (t * bpm / 60) % 1, v = 0.42 + 0.12 * Math.exp(-beat * 6);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: 26 }, (_, i) => { const ph = (t * (0.03 + rnd(i) * 0.05) + rnd(i + 50)) % 1; const s = 3 + rnd(i + 7) * 6; return <div key={i} style={{ position: 'absolute', left: (rnd(i + 20) * 1080 + Math.sin(t + i) * 30), top: 1920 - ph * 2100, width: s, height: s, borderRadius: '50%', background: '#fff', opacity: 0.25 * Math.sin(ph * Math.PI) }} />; })}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${v}) 100%)` }} />
    </AbsoluteFill>
  );
};

export const MotionFX: React.FC<{ spec: MontageSpec }> = ({ spec }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
  const s: any = spec; const order = ['ego', 'obsession', 'chance', 'discipline'];
  const outro = (s.lines ?? [])[0];
  void interpolate; void Easing;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <Ambient t={t} bpm={s.bpm ?? 124} />
      <HookFX t={t} end={s.hook.end} />
      {(s.cards ?? []).map((c: any, i: number) => <CardFX key={i} t={t} who={c.who} start={c.start} end={c.end} />)}
      {outro && <OutroFX t={t} start={outro.start} end={outro.end} />}
      {(s.cuts ?? []).map((c: any, i: number) => <CutBurst key={i} t={t} at={c.t} color={COL[order[i % 4]]} dir={c.dir ?? (i % 2 ? -1 : 1)} />)}
    </AbsoluteFill>
  );
};
