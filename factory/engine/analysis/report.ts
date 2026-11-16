// AGENT 1 — VIDEO ANALYST
// Produit la fiche technique complète d'une vidéo (JSON + Markdown) à partir de mesures réelles.
// Tout ce qui n'est pas mesurable automatiquement est listé comme tel dans le rapport.
import fs from 'node:fs';
import path from 'node:path';
import { probe, type ProbeInfo } from './probe.ts';
import { analyzeColor, type ColorReport } from './color.ts';
import { detectScenes, detectTransitions, mergeShots, analyzeSharpness, analyzeMotion, detectDefects, extractKeyframes, contactSheet, videoFrameSets, type SceneReport, type SharpnessReport, type MotionReport, type DefectReport } from './video.ts';
import { analyzeAudio, type AudioReport } from './audio.ts';
import { transcribe, normalizeWords, type Transcript } from './transcribe.ts';
import { writeJson, writeText } from '../core/store.ts';
import type { Logger } from '../core/log.ts';

export interface HookReport {
  firstWordSec: number | null; wordsFirst3s: number; textFirst3s: string; cutsFirst3s: number;
  motionFirst3sRatio: number; leadingSilenceSec: number; verdict: string[];
}
export interface Moment { t: number; why: string }
export interface StyleProfile {
  durationSec: number; width: number; height: number; fps: number; bitrateKbps: number | null;
  avgShotSec: number; cutsPerMinute: number; cutsFirst3s: number;
  palette: { hex: string; share: number; name: string }[]; meanLuma: number; meanContrast: number; meanSaturation: number;
  sharpness: number; motionEnergy: number; integratedLufs: number | null; truePeakDbtp: number | null;
  tempoBpm: number | null; speechRateWpm: number | null; firstWordSec: number | null; hasVoice: boolean;
}
export interface AnalysisReport {
  version: 1; createdAt: string; source: string; analysisSeconds: number;
  probe: ProbeInfo; scenes: SceneReport; color: ColorReport; sharpness: SharpnessReport; motion: MotionReport;
  defects: DefectReport; audio: AudioReport; transcript: Transcript & { wordsPerMinute: number | null };
  hook: HookReport; structure: { thirds: { from: number; to: number; cuts: number; words: number; motion: number; loudnessDb: number }[]; peakMoments: Moment[] };
  ending: { lastWords: string; ctaDetected: string[]; loopSimilarity: number | null; loopLikely: boolean };
  keyframes: { t: number; file: string; shot: number }[]; contactSheet: { file: string; fps: number; cols: number } | null;
  style: StyleProfile; notMeasured: string[]; manualNotes: string;
}

const CTA_WORDS = ['abonne', 'abonnez', 'suis', 'suivez', 'follow', 'commente', 'commentez', 'partage', 'partagez', 'lien', 'bio', 'ecris', 'ecrivez', 'like', 'enregistre', 'enregistrez', 'partie', 'suite', 'decouvre', 'decouvrez', 'clique', 'cliquez', 'message', 'prive'];

export async function analyzeVideo(file: string, outDir: string, opts: { log?: Logger; transcribe?: boolean; expectedText?: string; onProgress?: (p: number, label: string) => void } = {}): Promise<AnalysisReport> {
  const t0 = Date.now();
  const log = opts.log;
  const prog = opts.onProgress || (() => {});
  fs.mkdirSync(outDir, { recursive: true });

  prog(0.05, 'Lecture technique (ffprobe)');
  const info = await probe(file, log);
  if (!info.video) throw new Error('Ce fichier ne contient pas de piste vidéo.');
  const dur = info.durationSec;
  const { displayWidth: dw, displayHeight: dh } = info.video;

  prog(0.15, 'Détection des plans');
  const hard = await detectScenes(file, dur, log);
  prog(0.3, 'Couleurs, netteté, mouvement');
  const sets = await videoFrameSets(file, dw, dh, dur, log);
  const scenes = mergeShots(hard, detectTransitions(sets.motion, hard.cuts), dur);
  prog(0.45, 'Images clés et planche contact');
  const keyframes = await extractKeyframes(file, scenes.shots, path.join(outDir, 'keyframes'), log);
  const sheet = await contactSheet(file, dur, path.join(outDir, 'contact.jpg'), log).catch((e) => { log?.warn(`Planche contact : ${e.message}`); return null; });
  const color = analyzeColor(sets.color);
  const sharpness = analyzeSharpness(sets.sharp);
  const motion = analyzeMotion(sets.motion);
  prog(0.55, 'Défauts (images noires / figées)');
  const defects = await detectDefects(file, log);
  prog(0.62, 'Audio (loudness, tempo, silences)');
  const audio = await analyzeAudio(file, dur, !!info.audio, [...scenes.cuts, ...scenes.transitions], log);

  let tr: Transcript = { ok: false, reason: 'Transcription désactivée.', text: '', segments: [], words: [] };
  if (info.audio && opts.transcribe !== false) {
    prog(0.7, 'Transcription (Whisper)');
    tr = await transcribe(file, path.join(outDir, 'transcript.json'), { log, prompt: opts.expectedText });
  }
  prog(0.9, 'Synthèse');
  const speechSec = tr.segments.reduce((a, s) => a + (s.end - s.start), 0);
  const wpm = tr.ok && speechSec > 1 ? Math.round((tr.words.length / speechSec) * 60) : null;

  // --- Accroche (0-3 s)
  const firstWord = tr.words.length ? tr.words[0].start : null;
  const w3 = tr.words.filter((w) => w.start < 3);
  const motionRatio = motion.meanEnergy ? Math.round((motion.energyFirst3s / motion.meanEnergy) * 100) / 100 : 0;
  const verdict: string[] = [];
  if (firstWord !== null) verdict.push(firstWord <= 0.5 ? `Parole immédiate (${firstWord.toFixed(2)} s) : bon.` : `Premier mot à ${firstWord.toFixed(2)} s : l'accroche parlée démarre tard.`);
  else verdict.push(tr.ok ? 'Aucune parole détectée : accroche purement visuelle/musicale.' : 'Parole non analysée (transcription indisponible).');
  verdict.push(scenes.cutsFirst3s >= 2 ? `${scenes.cutsFirst3s} coupes dans les 3 premières secondes : rythme d'ouverture soutenu.` : scenes.cutsFirst3s === 1 ? '1 coupe dans les 3 premières secondes.' : 'Aucune coupe dans les 3 premières secondes : l’accroche repose sur un seul plan (mouvement interne ou texte).');
  verdict.push(motionRatio >= 1.1 ? `Ouverture plus animée que la moyenne (×${motionRatio}).` : motionRatio < 0.7 ? `Ouverture plus calme que le reste (×${motionRatio}) : risque de décrochage.` : `Ouverture aussi animée que le reste (×${motionRatio}).`);
  if (audio.leadingSilenceSec > 0.3) verdict.push(`Silence de ${audio.leadingSilenceSec.toFixed(2)} s au début : à supprimer.`);

  // --- Structure en tiers + moments forts
  const thirds = [0, 1, 2].map((k) => {
    const allCuts = [...scenes.cuts, ...scenes.transitions];
    const from = (dur * k) / 3, to = (dur * (k + 1)) / 3;
    const mot = motion.energyCurve.filter((e) => e.t >= from && e.t < to);
    const rms = audio.rmsCurve.filter((e) => e.t >= from && e.t < to && e.db > -70);
    return {
      from: r2(from), to: r2(to), cuts: allCuts.filter((c) => c >= from && c < to).length,
      words: tr.words.filter((w) => w.start >= from && w.start < to).length,
      motion: Math.round((mot.reduce((a, e) => a + e.e, 0) / Math.max(1, mot.length)) * 10) / 10,
      loudnessDb: Math.round((rms.reduce((a, e) => a + e.db, 0) / Math.max(1, rms.length)) * 10) / 10,
    };
  });
  const peaks: Moment[] = [];
  const sorted = [...motion.energyCurve].sort((a, b) => b.e - a.e);
  for (const p of sorted) {
    if (peaks.length >= 4) break;
    if (peaks.some((q) => Math.abs(q.t - p.t) < 1.5)) continue;
    const isCut = [...scenes.cuts, ...scenes.transitions].some((c) => Math.abs(c - p.t) < 0.15);
    const word = tr.words.find((w) => Math.abs(w.start - p.t) < 0.4);
    peaks.push({ t: p.t, why: `${isCut ? 'coupe' : 'pic de mouvement'}${word ? ` sur « ${word.word} »` : ''}` });
  }
  peaks.sort((a, b) => a.t - b.t);

  // --- Fin : appel à l'action, boucle
  const lastWords = tr.words.filter((w) => w.start > dur - 3).map((w) => w.word).join(' ');
  const lastNorm = normalizeWords(lastWords);
  const cta = CTA_WORDS.filter((c) => lastNorm.some((w) => w.startsWith(c)));
  let loopSim: number | null = null;
  if (sets.color.frames.length > 2) {
    const a = sets.color.frames[0], b = sets.color.frames[sets.color.frames.length - 1];
    let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
    loopSim = Math.round((1 - d / a.length / 255) * 100) / 100;
  }

  const style: StyleProfile = {
    durationSec: r2(dur), width: dw, height: dh, fps: info.video.avgFps || info.video.fps, bitrateKbps: info.video.bitrateKbps ?? info.bitrateKbps,
    avgShotSec: scenes.avgShotSec, cutsPerMinute: scenes.cutsPerMinute, cutsFirst3s: scenes.cutsFirst3s,
    palette: color.palette, meanLuma: color.meanLuma, meanContrast: color.meanContrast, meanSaturation: color.meanSaturation,
    sharpness: sharpness.meanLaplacianVar, motionEnergy: motion.meanEnergy, integratedLufs: audio.integratedLufs, truePeakDbtp: audio.truePeakDbtp,
    tempoBpm: audio.tempoConfidence >= 0.15 ? audio.tempoBpm : null, speechRateWpm: wpm, firstWordSec: firstWord, hasVoice: tr.ok ? tr.words.length > 3 : audio.pitch.voicedPct > 15,
  };

  const notMeasured = [
    'Émotion, ton et intention de la voix : non mesurables automatiquement (seuls débit, hauteur estimée et pauses sont mesurés).',
    'Séparation voix / musique / effets : pas de modèle de séparation installé (trop lourd pour 8 Go) ; volumes estimés sur le mixage complet.',
    'Texte à l’écran et sous-titres (contenu, police, animation) : pas d’OCR installé — à lire sur la planche contact et les images clés.',
    'Profondeur de champ, qualité des animations, style d’illustration : jugement visuel à faire sur la planche contact.',
    'Potentiel de partage / revisionnage : aucune donnée d’audience ; seuls des indicateurs structurels (accroche, rythme, boucle, appel à l’action) sont calculés.',
  ];
  if (!tr.ok) notMeasured.unshift(`Transcription : ${tr.reason}`);

  const report: AnalysisReport = {
    version: 1, createdAt: new Date().toISOString(), source: path.basename(file), analysisSeconds: Math.round((Date.now() - t0) / 100) / 10,
    probe: info, scenes, color, sharpness, motion, defects, audio, transcript: { ...tr, wordsPerMinute: wpm },
    hook: { firstWordSec: firstWord, wordsFirst3s: w3.length, textFirst3s: w3.map((w) => w.word).join(' '), cutsFirst3s: scenes.cutsFirst3s, motionFirst3sRatio: motionRatio, leadingSilenceSec: audio.leadingSilenceSec, verdict },
    structure: { thirds, peakMoments: peaks },
    ending: { lastWords, ctaDetected: cta, loopSimilarity: loopSim, loopLikely: (loopSim ?? 0) > 0.85 },
    keyframes, contactSheet: sheet, style, notMeasured, manualNotes: '',
  };
  writeJson(path.join(outDir, 'analysis.json'), report);
  writeText(path.join(outDir, 'analysis.md'), reportMarkdown(report));
  prog(1, 'Analyse terminée');
  return report;
}

const fmt = (x: number | null | undefined, unit = '', d = 1) => (x === null || x === undefined || Number.isNaN(x) ? 'n/d' : `${Number(x).toFixed(d)}${unit}`);

export function reportMarkdown(r: AnalysisReport): string {
  const v = r.probe.video!, a = r.probe.audio;
  const L: string[] = [];
  L.push(`# Fiche d'analyse — ${r.source}`, '', `Analysé le ${new Date(r.createdAt).toLocaleString('fr-FR')} en ${r.analysisSeconds} s. Toutes les valeurs ci-dessous sont **mesurées** dans le fichier, sauf mention « estimation ».`, '');
  L.push('## 1. Technique', '', '| Élément | Valeur |', '|---|---|',
    `| Résolution | ${v.displayWidth}×${v.displayHeight} (${v.aspect}, ${v.orientation}) |`,
    `| Images/s | ${v.avgFps} (nominal ${v.fps}) |`, `| Durée | ${fmt(r.probe.durationSec, ' s', 2)} |`,
    `| Codec vidéo | ${v.codec}${v.profile ? ` (${v.profile})` : ''}, ${v.pixFmt} |`,
    `| Débit | vidéo ${v.bitrateKbps ?? 'n/d'} kb/s · total ${r.probe.bitrateKbps ?? 'n/d'} kb/s |`,
    `| Audio | ${a ? `${a.codec} ${a.sampleRate} Hz, ${a.channels} canal(aux), ${a.bitrateKbps ?? 'n/d'} kb/s` : 'aucun'} |`, '');
  L.push('## 2. Image et réalisation', '',
    `- **Ambiance** : ${r.color.mood.join(' · ')}.`,
    `- **Luminosité moyenne** ${fmt(r.color.meanLuma)}/255 · **contraste** (écart-type) ${fmt(r.color.meanContrast)} · **saturation** ${fmt(r.color.meanSaturation * 100)} % · noirs écrasés ${fmt(r.color.darkPct)} % · blancs brûlés ${fmt(r.color.brightPct)} %.`,
    `- **Palette dominante** : ${r.color.palette.map((p) => `\`${p.hex}\` ${p.name} (${p.share} %)`).join(', ')}.`,
    `- **Cohérence lumineuse entre plans** : variation de luminosité ${fmt(r.color.lumaVariationBetweenFrames)} (plus c'est bas, plus l'étalonnage est homogène).`,
    `- **Netteté** (variance du laplacien à ${r.sharpness.analysisWidth} px) : moyenne ${r.sharpness.meanLaplacianVar}, minimum ${r.sharpness.minLaplacianVar} · densité de contours ${r.sharpness.edgeDensity} %.`,
    `- **Mouvement** (estimation) : énergie moyenne ${r.motion.meanEnergy}, plans statiques ${r.motion.staticPct} % du temps, mouvement dominant : ${r.motion.dominantCamera}.`,
    `  - zoom avant ${r.motion.camera.zoomInPct} % · zoom arrière ${r.motion.camera.zoomOutPct} % · pano gauche/droite ${r.motion.camera.panLeftPct}/${r.motion.camera.panRightPct} % · vertical haut/bas ${r.motion.camera.tiltUpPct}/${r.motion.camera.tiltDownPct} % · secousses ${r.motion.camera.shakePct} %`,
    `  - _${r.motion.note}_`, '');
  L.push('## 3. Montage', '',
    `- **${r.scenes.shotCount} plans** : ${r.scenes.cuts.length} coupe(s) franche(s) + ${r.scenes.transitions.length} transition(s) animée(s) (whip, fondu, volet…), soit ${r.scenes.cutsPerMinute} changements de plan/min.`,
    `- Durée des plans : moyenne ${r.scenes.avgShotSec} s, médiane ${r.scenes.medianShotSec} s, min ${r.scenes.minShotSec} s, max ${r.scenes.maxShotSec} s.`,
    `- Premier changement de plan : ${r.scenes.firstCutSec ?? 'aucun'} s · changements dans les 3 premières secondes : ${r.scenes.cutsFirst3s}.`,
    `- Coupes calées sur une attaque audio (±70 ms) : ${r.audio.cutsOnBeatPct ?? 'n/d'} %.`,
    `- Défauts : ${r.defects.blackSegments.length} passage(s) noir(s), ${r.defects.frozenSegments.length} passage(s) figé(s) ≥ 0,6 s${r.defects.frozenSegments.length ? ` (${r.defects.frozenSegments.map((f) => `${f.start}-${f.end} s`).join(', ')} — peut être volontaire sur un plan texte)` : ''}.`, '',
    '| Plan | Début | Fin | Durée |', '|---|---|---|---|', ...r.scenes.shots.slice(0, 80).map((s) => `| ${s.index + 1} | ${s.start} | ${s.end} | ${s.duration} |`), '');
  L.push('## 4. Audio', '',
    `- **Loudness intégrée** ${fmt(r.audio.integratedLufs, ' LUFS')} (cible TikTok courante ≈ −14) · **plage** ${fmt(r.audio.loudnessRangeLu, ' LU')} · **crête vraie** ${fmt(r.audio.truePeakDbtp, ' dBTP')}.`,
    `- Silences (< −40 dB, ≥ 0,3 s) : ${r.audio.silencePct} % du temps · silence d'ouverture ${fmt(r.audio.leadingSilenceSec, ' s', 2)}.`,
    `- Tempo estimé : ${r.audio.tempoBpm ?? 'n/d'} BPM (confiance ${r.audio.tempoConfidence}) · ${r.audio.onsetsPerSec} attaques/s.`,
    `- Équilibre spectral : graves ${r.audio.bands.lowPct} % · médiums ${r.audio.bands.midPct} % · aigus ${r.audio.bands.highPct} %.`,
    `- Hauteur de voix (estimation) : médiane ${r.audio.pitch.medianHz ?? 'n/d'} Hz (p10 ${r.audio.pitch.p10Hz ?? '-'} / p90 ${r.audio.pitch.p90Hz ?? '-'}) — _${r.audio.pitch.note}_`,
    `- Dynamique (p95 − p10 des niveaux) : ${r.audio.dynamicRangeDb} dB.`, '');
  L.push('## 5. Voix et texte', '');
  if (r.transcript.ok) {
    L.push(`- Transcription (${r.transcript.model}, langue ${r.transcript.language}) : ${r.transcript.words.length} mots, **${r.transcript.wordsPerMinute ?? 'n/d'} mots/min** sur le temps parlé.`, '', '> ' + (r.transcript.text || '(aucune parole)'), '');
  } else L.push(`- ${r.transcript.reason}`, '');
  L.push('## 6. Potentiel TikTok (indicateurs structurels)', '', `**Accroche (0-3 s)** : « ${r.hook.textFirst3s || '—'} »`, ...r.hook.verdict.map((x) => `- ${x}`), '',
    '**Progression** (par tiers) :', '', '| Tiers | Coupes | Mots | Mouvement | Niveau audio |', '|---|---|---|---|---|',
    ...r.structure.thirds.map((t, i) => `| ${i + 1} (${t.from}-${t.to} s) | ${t.cuts} | ${t.words} | ${t.motion} | ${t.loudnessDb} dB |`), '',
    `**Moments forts** : ${r.structure.peakMoments.map((m) => `${m.t} s (${m.why})`).join(' · ') || 'n/d'}`, '',
    `**Fin** : « ${r.ending.lastWords || '—'} » · appel à l'action détecté : ${r.ending.ctaDetected.length ? r.ending.ctaDetected.join(', ') : 'aucun'} · similarité première/dernière image ${r.ending.loopSimilarity ?? 'n/d'} → ${r.ending.loopLikely ? 'boucle probable (favorise le revisionnage)' : 'pas de boucle visuelle'}.`, '');
  L.push('## 7. Non mesuré automatiquement (à juger à l’œil)', '', ...r.notMeasured.map((x) => `- ${x}`), '');
  if (r.manualNotes) L.push('## 8. Observations visuelles', '', r.manualNotes, '');
  L.push('## Fichiers', '', `- Planche contact : \`${r.contactSheet?.file ?? 'n/d'}\``, `- Images clés : \`keyframes/\` (${r.keyframes.length})`, '- Données complètes : `analysis.json`', '');
  return L.join('\n');
}

function r2(x: number) { return Math.round(x * 100) / 100; }
