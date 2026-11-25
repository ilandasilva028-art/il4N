// Montage générique Remotion, piloté par la fiche MONTAGE exportée par chaque film du moteur canvas
// (engine/render/player/films/*.js). L'image vient du rendu « propre » du film (?v=clean : ni textes, ni compteur,
// ni transitions), le son vient du mixeur du moteur : le timing est identique, donc tout reste synchrone.
import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, Easing } from 'remotion';

export type Words = [string, string][];
export type Who = 'ego' | 'obsession' | 'chance' | 'discipline';
export type MontageSpec = {
  fps: number; duration: number; series?: string;
  hook: { a: Words[]; b: Words[]; line2At: number; end: number };
  bands: [number, number][];
  titles: { pre: string; n: string; start: number; end: number }[];
  cards: { who: Who; tag: string; start: number; end: number }[];
  tips: { n: number; text: string; start: number; end: number }[];
  lines: { words: Words; start: number; end: number; size: number; y: number; stagger?: number }[];
  tracker?: { from: number; to: number; out: Partial<Record<Who, number>>; winAt?: number };
  progress?: { from: number; to: number };
  cuts: { t: number; type: 'whip' | 'zoom' | 'glitch'; dir?: number }[];
  subscribe?: { start: number; end: number };
};
export type MontageProps = { spec: MontageSpec; variant: 'a' | 'b'; video: string; audio: string };

const RED = '#e3342c';
const CAST: Record<Who, { name: string; label: string; body: string }> = {
  ego: { name: 'L’EGO', label: '#e9c75a', body: '#e9d9a6' },
  obsession: { name: 'L’OBSESSION', label: '#b28cff', body: '#b9a3e3' },
  chance: { name: 'LA CHANCE', label: '#7fdc9a', body: '#b7e4c2' },
  discipline: { name: 'DISCIPLINE', label: '#f1f1f1', body: '#f1f1f1' },
};
const FONT = `
@font-face { font-family: Display; src: url(${staticFile('Inter-Bold.otf')}); font-weight: 700; }
@font-face { font-family: Display; src: url(${staticFile('Inter-ExtraBold.otf')}); font-weight: 800; }
@font-face { font-family: Display; src: url(${staticFile('Inter-Black.otf')}); font-weight: 900; }`;
const TXT: React.CSSProperties = { fontFamily: 'Display', fontWeight: 900, letterSpacing: 3, color: '#f1f1f1', textShadow: '0 4px 18px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)' };
const clamp = (x: number) => Math.min(1, Math.max(0, x));
let FPS = 60;

// mots qui « sautent » un par un (ressort)
const Pop: React.FC<{ words: Words; start: number; end?: number; size: number; y: number; stagger?: number }> = ({ words, start, end = 1e9, size, y, stagger = 0.07 }) => {
  const frame = useCurrentFrame(); const t = frame / FPS;
  if (t < start - 0.05 || t > end) return null;
  let i = 0;
  return (
    <div style={{ position: 'absolute', top: y - size, left: 50, right: 50, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: Math.round(size * 0.3), opacity: clamp((end - t) / 0.12) }}>
      {words.flatMap(([text, color]) => text.split(' ').filter(Boolean).map((w) => {
        const k = spring({ frame: frame - Math.round((start + stagger * i++) * FPS), fps: FPS, config: { damping: 11, stiffness: 190, mass: 0.7 } });
        return <span key={i} style={{ ...TXT, fontSize: size, color, display: 'inline-block', opacity: clamp(k * 1.4), transform: `translateY(${(1 - k) * 46}px) scale(${0.55 + 0.45 * k}) rotate(${(1 - k) * -7}deg)` }}>{w}</span>;
      }))}
    </div>
  );
};
const TopBand: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const t = useCurrentFrame() / FPS;
  if (t < from || t > to) return null;
  return <div style={{ position: 'absolute', left: 0, right: 0, top: 250, height: 420, opacity: clamp((t - from) / 0.15) * clamp((to - t) / 0.15), background: 'linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.55) 65%, rgba(0,0,0,0))' }} />;
};
const DayTitle: React.FC<{ pre: string; n: string; start: number; end: number }> = ({ pre, n, start, end }) => {
  const frame = useCurrentFrame(); const t = frame / FPS;
  if (t < start || t > end) return null;
  const k = spring({ frame: frame - Math.round(start * FPS), fps: FPS, config: { damping: 9, stiffness: 260 } });
  const shake = t - start < 0.18 ? Math.sin(t * 120) * 6 * (1 - (t - start) / 0.18) : 0;
  const bar = interpolate(t, [start + 0.1, start + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', top: 330, width: '100%', textAlign: 'center', opacity: clamp((end - t) / 0.12), transform: `translateX(${shake}px) scale(${1.7 - 0.7 * k})` }}>
      <span style={{ ...TXT, fontSize: 104, whiteSpace: 'pre' }}>{pre}<span style={{ color: RED }}>{n}</span></span>
      <div style={{ margin: '8px auto 0', height: 8, width: 300 * bar, background: RED, borderRadius: 4 }} />
    </div>
  );
};
const Card: React.FC<{ who: Who; tag: string; start: number; end: number }> = ({ who, tag, start, end }) => {
  const frame = useCurrentFrame(); const t = frame / FPS;
  if (t < start || t > end) return null;
  const c = CAST[who];
  const under = interpolate(t, [start + 0.15, start + 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', top: 330, width: '100%', textAlign: 'center', opacity: clamp((end - t) / 0.1) }}>
      <div>{c.name.split('').map((ch, i) => {
        const k = spring({ frame: frame - Math.round((start + i * 0.025) * FPS), fps: FPS, config: { damping: 12, stiffness: 220 } });
        return <span key={i} style={{ ...TXT, fontSize: 100, color: c.label, display: 'inline-block', whiteSpace: 'pre', opacity: clamp(k * 1.5), transform: `translateY(${(1 - k) * 60}px)`, textShadow: `0 0 26px ${c.label}88, 0 4px 18px rgba(0,0,0,0.9)` }}>{ch}</span>;
      })}</div>
      <div style={{ margin: '4px auto 14px', height: 8, width: 360 * under, background: c.label, borderRadius: 4 }} />
      <Pop words={[[tag, '#f1f1f1']]} start={start + 0.12} end={end} size={52} y={232} stagger={0.05} />
    </div>
  );
};
const Tip: React.FC<{ n: number; text: string; start: number; end: number }> = ({ n, text, start, end }) => {
  const frame = useCurrentFrame(); const t = frame / FPS;
  if (t < start || t > end) return null;
  const k = spring({ frame: frame - Math.round(start * FPS), fps: FPS, config: { damping: 13, stiffness: 200 } });
  const r = spring({ frame: frame - Math.round((start + 0.08) * FPS), fps: FPS, config: { damping: 8, stiffness: 160 } });
  return (
    <div style={{ position: 'absolute', top: 1436, width: '100%', display: 'flex', justifyContent: 'center', opacity: clamp(k * 1.3) * clamp((end - t) / 0.12), transform: `translateY(${(1 - k) * 80}px) scale(${0.85 + 0.15 * k})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '18px 40px 18px 18px', background: 'rgba(12,12,15,0.92)', borderRadius: 50, border: '2px solid rgba(255,255,255,0.12)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ ...TXT, width: 58, height: 58, borderRadius: 29, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, transform: `rotate(${(1 - r) * -180}deg) scale(${r})` }}>{n}</div>
        <span style={{ ...TXT, fontSize: 40, letterSpacing: 2 }}>{text}</span>
      </div>
    </div>
  );
};
const Head: React.FC<{ who: Who; out: boolean }> = ({ who, out }) => (
  <svg width={64} height={80} viewBox="-32 -46 64 80">
    {who === 'ego' && <path d="M-16,-22 L-16,-34 L-6,-26 L0,-38 L6,-26 L16,-34 L16,-22 Z" fill={out ? '#77777c' : '#e2b53e'} />}
    {who === 'chance' && [0, 1, 2, 3].map((q) => <circle key={q} cx={Math.cos(q * 1.57) * 6} cy={-32 + Math.sin(q * 1.57) * 6} r={5} fill={out ? '#77777c' : '#4fbf6c'} />)}
    {who === 'obsession' && [0, 1, 2].map((q) => <line key={q} x1={-10 + q * 10} y1={-24} x2={-13 + q * 10} y2={-38} stroke={out ? '#77777c' : CAST.obsession.body} strokeWidth={4} strokeLinecap="round" />)}
    <circle r={26} fill={out ? '#55555c' : CAST[who].body} />
    <circle cx={6} cy={-4} r={3.5} fill="#111" /><circle cx={16} cy={-4} r={3.5} fill="#111" />
    {who === 'discipline' && <rect x={-26} y={-16} width={52} height={8} fill={RED} />}
  </svg>
);
const Tracker: React.FC<{ spec: NonNullable<MontageSpec['tracker']> }> = ({ spec }) => {
  const frame = useCurrentFrame(); const t = frame / FPS;
  const show = clamp((t - spec.from) / 0.3) * (t < spec.to ? 1 : 0);
  if (show <= 0) return null;
  const order: Who[] = ['ego', 'obsession', 'chance', 'discipline'];
  const left = order.filter((w) => !(spec.out[w] !== undefined && t >= (spec.out[w] as number))).length;
  return (
    <div style={{ position: 'absolute', top: 252, right: 40, opacity: show, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 18px', background: 'rgba(8,8,12,0.75)', borderRadius: 48 }}>
      {order.map((who, i) => {
        const o = spec.out[who]; const out = o !== undefined && t >= o;
        const k = out ? spring({ frame: frame - Math.round((o as number) * FPS), fps: FPS, config: { damping: 9, stiffness: 240 } }) : 0;
        const shake = out && t - (o as number) < 0.25 ? Math.sin(t * 90 + i) * 8 * (1 - (t - (o as number)) / 0.25) : 0;
        const win = who === 'discipline' && spec.winAt !== undefined && t >= spec.winAt;
        return (
          <div key={who} style={{ position: 'relative', opacity: out ? 0.5 : 1, transform: `translateX(${shake}px) scale(${win ? 1 + 0.08 * Math.sin(t * 9) : 1})`, filter: win ? 'drop-shadow(0 0 14px #ffd98c)' : undefined }}>
            <Head who={who} out={out} />
            {out && <svg width={64} height={80} viewBox="-32 -46 64 80" style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${1.9 - 0.9 * k})`, opacity: clamp(k * 2) }}><path d="M-22,-22 L22,22 M22,-22 L-22,22" stroke={RED} strokeWidth={8} strokeLinecap="round" /></svg>}
          </div>
        );
      })}
      <span style={{ ...TXT, fontSize: 40, marginLeft: 8, color: left === 1 ? '#ffd98c' : '#f1f1f1' }}>{left}</span>
    </div>
  );
};
const Progress: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const t = useCurrentFrame() / FPS;
  if (t < from || t >= to) return null;
  return (
    <div style={{ position: 'absolute', top: 236, left: 72, right: 72, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.14)' }}>
      <div style={{ width: `${((t - from) / (to - from)) * 100}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${RED}, #ff8a5c)`, boxShadow: `0 0 12px ${RED}` }} />
    </div>
  );
};
// l'image du moteur + transitions appliquées à l'image
const Picture: React.FC<{ src: string; cuts: MontageSpec['cuts'] }> = ({ src, cuts }) => {
  const frame = useCurrentFrame(); const t = frame / FPS;
  let tf = '', filter = '', flash = 0, glitch = 0;
  for (const c of cuts) {
    const w = c.type === 'zoom' ? 0.18 : 0.14, d = t - c.t;
    if (Math.abs(d) >= w) continue;
    const p = d / w;
    if (c.type === 'whip') {
      const dir = c.dir ?? 1, x = p < 0 ? -dir * 648 * Math.pow(1 + p, 3) : dir * 648 * Math.pow(1 - p, 3);
      tf = `translateX(${x}px) scaleX(${1 + 0.15 * (1 - Math.abs(p))})`; filter = `blur(${26 * (1 - Math.abs(p))}px)`;
    } else if (c.type === 'zoom') {
      tf = `scale(${p < 0 ? 1 + 1.4 * Math.pow(1 + p, 3) : 1 + 0.45 * Math.pow(1 - p, 2)}) rotate(${p < 0 ? 4 * Math.pow(1 + p, 2) : -3 * Math.pow(1 - p, 2)}deg)`;
      filter = `blur(${18 * (1 - Math.abs(p))}px)`; flash = 0.7 * (1 - Math.abs(p));
    } else {
      glitch = 1 - Math.abs(p); const gx = (((Math.sin(frame * 12.9898) * 43758.5453) % 1) * 60) * glitch;
      tf = `translateX(${gx}px) skewX(${gx * 0.15}deg)`; filter = `hue-rotate(${glitch * 160}deg) saturate(${1 + glitch * 2}) contrast(${1 + glitch * 0.6})`;
    }
  }
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: tf, filter }}><OffthreadVideo src={staticFile(src)} muted /></AbsoluteFill>
      {glitch > 0 && <AbsoluteFill>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${((((Math.sin((frame + i * 7) * 78.233) * 43758.5453) % 1) + 1) % 1) * 100}%`, height: 8 + i * 6, background: ['#e3342c', '#3cf', '#fff', '#b28cff', '#e3342c', '#3cf'][i], opacity: 0.35 * glitch, mixBlendMode: 'screen' }} />)}</AbsoluteFill>}
      {flash > 0 && <AbsoluteFill style={{ background: '#fff', opacity: flash }} />}
    </AbsoluteFill>
  );
};

export const Montage: React.FC<MontageProps> = ({ spec, variant, video, audio }) => {
  FPS = spec.fps;
  const frame = useCurrentFrame(); const t = frame / FPS;
  const hook = variant === 'b' ? spec.hook.b : spec.hook.a;
  const sub = spec.subscribe;
  const subK = sub ? spring({ frame: frame - Math.round(sub.start * FPS), fps: FPS, config: { damping: 8, stiffness: 200 } }) : 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <style>{FONT}</style>
      <Picture src={video} cuts={spec.cuts} />
      {spec.bands.map(([a, b], i) => <TopBand key={i} from={a} to={b} />)}
      {hook[0] && <Pop words={hook[0]} start={0} end={spec.hook.end} size={96} y={430} />}
      {hook[1] && <Pop words={hook[1]} start={spec.hook.line2At} end={spec.hook.end} size={104} y={545} />}
      {spec.series && t > 1.0 && t < spec.hook.end && <div style={{ position: 'absolute', top: 262, left: 72, padding: '8px 22px', borderRadius: 23, background: 'rgba(255,255,255,0.1)', ...TXT, fontSize: 26, letterSpacing: 4, opacity: clamp((t - 1) / 0.25) }}>{spec.series}</div>}
      {spec.titles.map((x, i) => <DayTitle key={i} {...x} />)}
      {spec.cards.map((x, i) => <Card key={i} {...x} />)}
      {spec.tips.map((x, i) => <Tip key={i} {...x} />)}
      {spec.lines.map((x, i) => <Pop key={i} words={x.words} start={x.start} end={x.end} size={x.size} y={x.y} stagger={x.stagger} />)}
      {sub && t > sub.start && t < sub.end && <div style={{ position: 'absolute', top: 1438, width: '100%', display: 'flex', justifyContent: 'center', opacity: clamp((sub.end - t) / 0.3), transform: `scale(${0.6 + 0.4 * subK})` }}>
        <div style={{ ...TXT, fontSize: 46, padding: '20px 52px', borderRadius: 46, background: RED, boxShadow: `0 0 40px ${RED}88` }}>ABONNE-TOI</div>
      </div>}
      {spec.tracker && <Tracker spec={spec.tracker} />}
      {spec.progress && <Progress {...spec.progress} />}
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
