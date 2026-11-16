// AGENT 2 — CREATIVE DIRECTOR
// Construit la « bible de style » d'une vidéo : palette, typographie, énergie du montage, musique,
// étalonnage, sous-titres, voix. Elle s'inspire des MESURES de la référence (rythme, lumière,
// saturation, tempo) sans copier son contenu.
import path from 'node:path';
import fs from 'node:fs';
import type { StyleBible } from '../pipeline/types.ts';
import type { AnalysisReport } from '../analysis/report.ts';
import { rgbToHsl } from '../analysis/color.ts';
import { PIPER_DIR } from '../core/config.ts';

export const PRESETS: Record<string, StyleBible['palette'] & { label: string }> = {
  'violet-neon': { label: 'Violet néon (sombre)', bg: '#0d0a18', bg2: '#1d1236', ink: '#f6f3ff', muted: '#a59bc4', accent: '#a855f7', accent2: '#22d3ee' },
  chaleureux: { label: 'Chaleureux (sombre)', bg: '#17110d', bg2: '#2b1d13', ink: '#fff7ee', muted: '#c2a58a', accent: '#ff8a3d', accent2: '#ffd166' },
  'minimal-clair': { label: 'Minimal clair', bg: '#f5f3ee', bg2: '#e6e1d6', ink: '#141218', muted: '#6c6874', accent: '#ff4d2e', accent2: '#2e5bff' },
  il4n: { label: 'Charte IL4N (nuit + or)', bg: '#111018', bg2: '#1b1825', ink: '#fffdf8', muted: '#a49eaa', accent: '#d6a96a', accent2: '#3f8a62' },
  ocean: { label: 'Océan (bleu profond)', bg: '#06141f', bg2: '#0c2a3d', ink: '#eefaff', muted: '#8fb3c4', accent: '#2dd4bf', accent2: '#fbbf24' },
};

export const VOICES: { id: string; label: string; model: string; speaker?: number }[] = [
  { id: 'pierre', label: 'Pierre (homme, posé)', model: 'fr_FR-upmc-medium', speaker: 1 },
  { id: 'jessica', label: 'Jessica (femme, claire)', model: 'fr_FR-upmc-medium', speaker: 0 },
  { id: 'siwis', label: 'Siwis (femme, dynamique)', model: 'fr_FR-siwis-medium' },
  { id: 'tom', label: 'Tom (homme, grave)', model: 'fr_FR-tom-medium' },
];

export function availableVoices() {
  return VOICES.map((v) => ({ ...v, installed: fs.existsSync(path.join(PIPER_DIR, `${v.model}.onnx`)) }));
}

const hexLuma = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
const hsl = (h: string) => { const n = parseInt(h.slice(1), 16); return rgbToHsl(n >> 16, (n >> 8) & 255, n & 255); };
function hslHex(h: number, s: number, l: number): string {
  const f = (n: number) => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function paletteFromReference(r: AnalysisReport): StyleBible['palette'] {
  const sw = r.color.palette;
  const dark = r.color.meanLuma < 120;
  const byLuma = [...sw].sort((a, b) => hexLuma(a.hex) - hexLuma(b.hex));
  const bg = dark ? byLuma[0]?.hex ?? '#111018' : byLuma[byLuma.length - 1]?.hex ?? '#f5f3ee';
  const ink = dark ? (byLuma[byLuma.length - 1] && hexLuma(byLuma[byLuma.length - 1].hex) > 180 ? byLuma[byLuma.length - 1].hex : '#fafafa') : (byLuma[0] && hexLuma(byLuma[0].hex) < 70 ? byLuma[0].hex : '#141218');
  const [bh, bs, bl] = hsl(bg);
  const bg2 = hslHex(bh, Math.min(1, bs + 0.05), dark ? Math.min(0.35, bl + 0.07) : Math.max(0.6, bl - 0.07));
  const sat = [...sw].filter((s) => s.share >= 0.8).sort((a, b) => hsl(b.hex)[1] * (1 - Math.abs(hsl(b.hex)[2] - 0.55)) - hsl(a.hex)[1] * (1 - Math.abs(hsl(a.hex)[2] - 0.55)));
  let accent = sat[0]?.hex;
  if (!accent || hsl(accent)[1] < 0.25) accent = dark ? '#a855f7' : '#ff4d2e';
  const [ah] = hsl(accent);
  const second = sat.slice(1).find((s) => Math.abs(hsl(s.hex)[0] - ah) > 40 && hsl(s.hex)[1] > 0.25)?.hex;
  const accent2 = second ?? hslHex((ah + 150) % 360, 0.75, 0.6);
  const [ih, is] = hsl(ink);
  return { bg, bg2, ink, muted: hslHex(ih, Math.min(0.2, is), dark ? 0.68 : 0.42), accent: hslHex(ah, Math.max(0.6, hsl(accent)[1]), 0.6), accent2 };
}

export interface DirectionInput {
  preset?: string; reference?: AnalysisReport | null; durationSec?: number; voiceId?: string;
  mood?: StyleBible['music']['mood']; fps?: number; subtitles?: boolean; lengthScale?: number;
}

export function buildStyleBible(input: DirectionInput): StyleBible {
  const ref = input.reference ?? null;
  const usingRef = input.preset === 'reference' && !!ref;
  const palette = usingRef ? paletteFromReference(ref!) : (() => { const p = PRESETS[input.preset || 'violet-neon'] || PRESETS['violet-neon']; const { label: _l, ...rest } = p; return rest; })();
  const voice = VOICES.find((v) => v.id === input.voiceId) || VOICES[0];

  const energy = ref ? Math.max(0.25, Math.min(1, ref.style.motionEnergy / 10)) : 0.7;
  const punchEverySec = ref ? Math.max(0.9, Math.min(3.5, ref.style.avgShotSec)) : 1.8;
  const mood = input.mood || (energy > 0.55 ? 'energique' : energy > 0.35 ? 'chill' : 'cinematique');
  const defaultBpm = { energique: 124, chill: 86, cinematique: 100 }[mood];
  const refBpm = ref?.style.tempoBpm;
  const bpm = refBpm && refBpm >= 70 && refBpm <= 160 ? Math.round(refBpm) : defaultBpm;
  // Débit de parole : ~165 mots/min par défaut (TikTok), aligné sur la référence si mesuré.
  const wpm = ref?.style.speechRateWpm;
  const lengthScale = input.lengthScale ?? (wpm ? Math.max(0.78, Math.min(1.1, 0.92 * (165 / wpm))) : 0.9);

  const rules = [
    'Une seule idée par plan, lisible en moins de 1,5 s sur téléphone.',
    'Mouvement dès l’image 0 : pas de fondu d’ouverture.',
    `Palette limitée : fond ${palette.bg}/${palette.bg2}, texte ${palette.ink}, accent unique ${palette.accent} (accent secondaire ${palette.accent2} rare).`,
    'Chaque apparition de texte est accompagnée d’un son (pop, whoosh, impact).',
    `Changement visuel (coupe, punch-in ou transition) toutes les ${punchEverySec.toFixed(1)} s environ.`,
    'Zone de sécurité TikTok : rien d’essentiel dans les 250 px du haut, les 430 px du bas et les 150 px de droite.',
    'Aucune image, voix, musique ou personnage repris de la référence : uniquement des éléments générés.',
  ];
  return {
    name: usingRef ? 'Dérivé de la référence' : (PRESETS[input.preset || 'violet-neon']?.label ?? 'Violet néon'),
    palette, fonts: { display: 'Display', accent: 'Accent' },
    motion: { energy, punchEverySec, shake: energy > 0.5, transition: energy > 0.6 ? 'whip' : energy > 0.4 ? 'mix' : 'zoom' },
    music: { mood, bpm, volumeDb: -2 },
    grade: {
      contrast: ref ? Math.max(0.9, Math.min(1.25, ref.style.meanContrast / 50)) : 1.05,
      saturation: ref ? Math.max(0.85, Math.min(1.3, ref.style.meanSaturation / 0.3)) : 1.05,
      grain: 0.05, vignette: 0.35,
    },
    subtitles: { enabled: input.subtitles !== false, size: 68, y: 1330, uppercase: false, maxWords: 3, highlight: true },
    format: { w: 1080, h: 1920, fps: input.fps || 30 },
    voice: { engine: 'piper', model: voice.model, speaker: voice.speaker, lengthScale: Math.round(lengthScale * 100) / 100 },
    targetDurationSec: input.durationSec || (ref ? Math.max(8, Math.min(90, Math.round(ref.style.durationSec))) : 20),
    targetLufs: -14,
    rules,
    derivedFrom: ref ? ref.source : null,
  };
}
