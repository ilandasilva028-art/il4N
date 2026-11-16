// AGENT 4 — VISUAL PRODUCER
// Transforme le script + la durée réelle de chaque phrase en plan de montage : plans calés sur la
// grille rythmique, transitions, jump-cuts (punch-ins), apparition des mots, sous-titres, bruitages.
// Le rendu visuel lui-même (motion design procédural) est fait par engine/render/player/film.js.
import type { Script, StyleBible, FilmPlan, PlanScene, Hit, SubGroup, SubWord } from '../pipeline/types.ts';
import type { RawSegment } from './voice.ts';
import { normalizeWords } from '../analysis/transcribe.ts';

export interface PlanOptions { seed: number; punchFactor?: number; leadIn?: number; gap?: number; ctaHold?: number }

export function layoutTimeline(script: Script, style: StyleBible, segs: RawSegment[], o: PlanOptions) {
  const grid = 60 / style.music.bpm / 2; // croche
  const q = (t: number) => Math.ceil(t / grid - 1e-6) * grid;
  const lead = o.leadIn ?? 0.06, gap = o.gap ?? 0.16;
  let t = 0;
  const scenes: { start: number; voiceStart: number; voiceEnd: number }[] = [];
  segs.forEach((s, i) => {
    const start = i === 0 ? 0 : Math.max(q(t), scenes[i - 1].start + 0.9);
    const voiceStart = start + (i === 0 ? lead : 0.1);
    scenes.push({ start, voiceStart, voiceEnd: voiceStart + s.duration });
    t = voiceStart + s.duration + gap;
  });
  const last = scenes[scenes.length - 1];
  const duration = Math.ceil((last.voiceEnd + (o.ctaHold ?? 1.7)) / grid) * grid;
  return { scenes, duration: Math.round(duration * 1000) / 1000 };
}

export function buildPlan(script: Script, style: StyleBible, segs: RawSegment[], o: PlanOptions): FilmPlan {
  const { scenes: tl, duration } = layoutTimeline(script, style, segs, o);
  const cycle: PlanScene['transition'][] = style.motion.transition === 'whip' ? ['whip-up', 'whip-left'] : style.motion.transition === 'zoom' ? ['zoom'] : style.motion.transition === 'mask' ? ['mask'] : ['whip-up', 'zoom', 'mask', 'whip-left'];
  const every = style.motion.punchEverySec / (o.punchFactor ?? 1);
  const scenes: PlanScene[] = script.beats.map((b, i) => {
    const start = tl[i].start, end = i < tl.length - 1 ? tl[i + 1].start : duration;
    const punches: number[] = [];
    if (b.scene !== 'cta') for (let p = start + Math.max(0.7, every); p < end - 0.45; p += every) punches.push(Math.round(p * 1000) / 1000);
    return { id: b.id, type: b.scene, start, end, voiceStart: tl[i].voiceStart, voiceEnd: tl[i].voiceEnd, beat: b, transition: i === 0 ? 'cut' : cycle[(i - 1) % cycle.length], punches, wordTimes: [] };
  });
  return { version: 1, w: style.format.w, h: style.format.h, fps: style.format.fps, duration, bpm: style.music.bpm, seed: o.seed, style, scenes, subtitles: [], hits: [], assets: {} };
}

// Répartition par défaut des mots d'une phrase (si Whisper est indisponible) : au prorata des lettres.
export function proportionalWords(text: string, start: number, end: number): SubWord[] {
  const toks = text.split(/\s+/).filter(Boolean);
  const total = toks.reduce((a, t) => a + Math.max(2, t.length), 0);
  let t = start;
  return toks.map((tok) => { const d = ((end - start) * Math.max(2, tok.length)) / total; const w = { text: tok, start: t, end: t + d, accent: false }; t += d; return w; });
}

const norm = (s: string) => normalizeWords(s).join('');

export function attachWords(plan: FilmPlan, perScene: SubWord[][]): FilmPlan {
  plan.scenes.forEach((sc, i) => {
    const acc = sc.beat.accent ? norm(sc.beat.accent) : '';
    sc.wordTimes = (perScene[i] || []).map((w) => ({ ...w, accent: !!acc && norm(w.text) === acc }));
    // Les jump-cuts tombent sur le début du mot le plus proche (coupe « sur la parole »).
    sc.punches = sc.punches.map((p) => {
      const near = sc.wordTimes.reduce<SubWord | null>((b, w) => (Math.abs(w.start - p) < Math.abs((b?.start ?? Infinity) - p) ? w : b), null);
      return near && Math.abs(near.start - p) < 0.4 && near.start > sc.start + 0.5 ? near.start : p;
    }).filter((p, k, arr) => k === 0 || p - arr[k - 1] > 0.5);
  });
  plan.subtitles = groupSubtitles(plan.scenes.flatMap((s) => s.wordTimes), plan.style.subtitles.maxWords);
  plan.hits = buildHits(plan);
  return plan;
}

export function groupSubtitles(words: SubWord[], maxWords = 3): SubGroup[] {
  const groups: SubGroup[] = [];
  let cur: SubWord[] = [];
  const flush = () => { if (cur.length) groups.push({ start: cur[0].start, end: cur[cur.length - 1].end, words: cur }); cur = []; };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length && prev && w.start - prev.end > 0.35) flush();
    cur.push(w);
    const chars = cur.reduce((a, x) => a + x.text.length + 1, 0);
    if (cur.length >= maxWords || /[.!?…,:;]$/.test(w.text) || chars > 20) flush();
  });
  flush();
  // Chaque groupe reste affiché jusqu'au suivant (max 0,4 s de plus) : pas de clignotement.
  groups.forEach((g, i) => { const next = groups[i + 1]; g.end = Math.round(Math.min(next ? next.start : g.end + 0.4, g.end + 0.4) * 1000) / 1000; });
  return groups;
}

export function buildHits(plan: FilmPlan): Hit[] {
  const hits: Hit[] = [];
  plan.scenes.forEach((sc, i) => {
    if (i === 0) hits.push({ t: 0.0, sfx: 'impact', gain: 0.7 });
    else hits.push({ t: sc.start, sfx: sc.transition === 'zoom' ? 'impact' : 'whoosh', gain: i === 1 ? 0.9 : 0.7, len: 0.32 });
    sc.wordTimes.filter((w) => w.accent).slice(0, 1).forEach((w) => hits.push({ t: w.start, sfx: 'pop', gain: 0.8 }));
    sc.punches.forEach((p) => hits.push({ t: p, sfx: 'tick', gain: 0.45 }));
    if (sc.type === 'list') hits.push({ t: sc.voiceStart + 0.15, sfx: 'pop', gain: 0.6 });
    if (sc.type === 'cta') hits.push({ t: sc.voiceStart + 0.25, sfx: 'ding', gain: 0.7 });
  });
  return hits.sort((a, b) => a.t - b.t);
}
