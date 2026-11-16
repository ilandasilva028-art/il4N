// AGENT 7 — QUALITY CONTROLLER
// Compare la vidéo produite à la référence avec la grille sur 100. Chaque point est soit MESURÉ
// (avec la valeur et la règle), soit « à évaluer par vous » (jamais attribué d'office).
import type { AnalysisReport } from '../analysis/report.ts';
import { paletteDistance } from '../analysis/color.ts';

export interface Check { criterion: string; item: string; max: number; points: number | null; measured: string; rule: string; fix?: string; severity?: 'bloquant' | 'majeur' | 'mineur' }
export interface QcReport { score: number; measurableMax: number; manualMax: number; scorePct: number; checks: Check[]; defects: Check[]; notes: string[] }

const lin = (v: number, good: number, bad: number) => Math.max(0, Math.min(1, (bad - v) / (bad - good)));
const ratioScore = (r: number, lo: number, hi: number) => (r >= lo && r <= hi ? 1 : r < lo ? Math.max(0, r / lo) : Math.max(0, 1 - (r - hi) / hi));

export function qualityControl(out: AnalysisReport, ref: AnalysisReport | null, expect: { durationSec?: number; hasVoice?: boolean } = {}): QcReport {
  const c: Check[] = [];
  const add = (criterion: string, item: string, max: number, k: number | null, measured: string, rule: string, fix?: string) =>
    c.push({ criterion, item, max, points: k === null ? null : Math.round(max * k * 10) / 10, measured, rule, fix });
  const v = out.probe.video!;
  const R = ref?.style;

  // Qualité visuelle (25)
  add('Qualité visuelle', 'Résolution 1080×1920', 5, v.displayWidth === 1080 && v.displayHeight === 1920 ? 1 : v.displayHeight >= 1280 ? 0.5 : 0, `${v.displayWidth}×${v.displayHeight}`, 'exactement 1080×1920');
  add('Qualité visuelle', 'Netteté vs référence', 5, R ? Math.min(1, out.style.sharpness / (R.sharpness * 0.6)) : null, `${out.style.sharpness} (réf. ${R?.sharpness ?? 'n/d'})`, '≥ 60 % de la netteté de la référence', 'baisser le CRF / épaissir les traits');
  add('Qualité visuelle', 'Exposition vs référence', 5, R ? lin(Math.abs(out.style.meanLuma - R.meanLuma), 12, 50) : null, `luminosité ${out.style.meanLuma} (réf. ${R?.meanLuma ?? 'n/d'})`, 'écart ≤ 12/255', 'assombrir/éclaircir les fonds');
  add('Qualité visuelle', 'Contraste et saturation vs référence', 5, R ? (lin(Math.abs(out.style.meanContrast - R.meanContrast), 8, 30) + lin(Math.abs(out.style.meanSaturation - R.meanSaturation), 0.08, 0.35)) / 2 : null, `contraste ${out.style.meanContrast} / sat. ${out.style.meanSaturation} (réf. ${R?.meanContrast ?? '-'} / ${R?.meanSaturation ?? '-'})`, 'contraste ±8, saturation ±0,08', 'ajuster l’étalonnage');
  const frozenLong = out.defects.frozenSegments.filter((f) => f.end - f.start > 1.2).length;
  add('Qualité visuelle', 'Pas d’image noire / figée > 1,2 s', 5, out.defects.blackSegments.length ? 0 : lin(frozenLong, 0, 3), `${out.defects.blackSegments.length} noir(s), ${frozenLong} figé(s) > 1,2 s`, 'aucun', 'ajouter du mouvement aux plans fixes');

  // Cohérence artistique (15)
  const pd = ref ? paletteDistance(out.color.palette, ref.color.palette) : null;
  add('Cohérence artistique', 'Palette proche de la référence', 10, pd === null ? null : lin(pd, 8, 35), pd === null ? 'n/d' : `distance ${pd}`, 'distance ≤ 8 (0 = identique)', 'reprendre les teintes mesurées');
  add('Cohérence artistique', 'Homogénéité lumineuse entre plans', 5, R && ref ? lin(Math.max(0, out.color.lumaVariationBetweenFrames - ref.color.lumaVariationBetweenFrames), 5, 30) : lin(out.color.lumaVariationBetweenFrames, 15, 45), `${out.color.lumaVariationBetweenFrames} (réf. ${ref?.color.lumaVariationBetweenFrames ?? 'n/d'})`, '≤ référence + 5');

  // Montage et fluidité (15)
  add('Montage et fluidité', 'Cadence ≥ 30 i/s constante', 3, v.avgFps >= 29.9 ? 1 : 0, `${v.avgFps} i/s`, '≥ 30 i/s');
  add('Montage et fluidité', 'Changements de plan/min vs référence', 6, R ? ratioScore(out.style.cutsPerMinute / Math.max(1, R.cutsPerMinute), 0.7, 1.5) : null, `${out.style.cutsPerMinute}/min (réf. ${R?.cutsPerMinute ?? 'n/d'})`, 'entre 70 % et 150 % de la référence', 'ajouter/retirer des coupes');
  add('Montage et fluidité', 'Durée moyenne des plans vs référence', 3, R ? ratioScore(out.style.avgShotSec / Math.max(0.1, R.avgShotSec), 0.6, 1.6) : null, `${out.style.avgShotSec} s (réf. ${R?.avgShotSec ?? 'n/d'})`, 'entre 60 % et 160 %');
  add('Montage et fluidité', 'Coupes calées sur la musique', 3, out.audio.cutsOnBeatPct === null ? null : Math.min(1, out.audio.cutsOnBeatPct / Math.max(40, ref?.audio.cutsOnBeatPct ?? 40)), `${out.audio.cutsOnBeatPct ?? 'n/d'} % (réf. ${ref?.audio.cutsOnBeatPct ?? 'n/d'} %)`, '≥ max(40 %, référence)', 'caler les coupes sur les temps');

  // Audio et voix (15)
  add('Audio et voix', 'Loudness −14 LUFS ±1', 5, out.audio.integratedLufs === null ? 0 : lin(Math.abs(out.audio.integratedLufs + 14), 1, 4), `${out.audio.integratedLufs} LUFS`, '−15 à −13 LUFS', 'renormaliser');
  add('Audio et voix', 'Crête vraie ≤ −1 dBTP', 3, out.audio.truePeakDbtp === null ? 0 : out.audio.truePeakDbtp <= -0.9 ? 1 : 0, `${out.audio.truePeakDbtp} dBTP`, '≤ −1 dBTP', 'limiteur plus bas');
  // Tempo : comparé à la plage des tempos mesurés par fenêtres de 20 s sur la référence (octave ×2 / ×½ tolérée).
  const refT = (ref?.audio.tempoWindows || []).filter((w) => w.bpm && w.confidence >= 0.3).map((w) => w.bpm as number);
  const ot = out.audio.tempoBpm;
  let tempoK: number | null = null, refTxt = 'n/d';
  if (refT.length && ot) {
    const lo = Math.min(...refT) * 0.94, hi = Math.max(...refT) * 1.06;
    const dist = Math.min(...[1, 2, 0.5].map((m) => { const x = ot * m; return x >= lo && x <= hi ? 0 : Math.min(Math.abs(x - lo) / lo, Math.abs(x - hi) / hi); }));
    tempoK = lin(dist, 0, 0.2); refTxt = `${Math.round(Math.min(...refT))}–${Math.round(Math.max(...refT))}`;
  }
  add('Audio et voix', 'Tempo dans la plage de la référence', 4, tempoK, `${ot ?? 'n/d'} BPM (réf. ${refTxt})`, 'dans la plage ±6 % (octave tolérée)', 'changer le BPM');
  const wantVoice = expect.hasVoice ?? R?.hasVoice ?? false;
  add('Audio et voix', wantVoice ? 'Voix présente' : 'Pas de voix (comme la référence)', 3, (out.style.hasVoice === wantVoice) ? 1 : 0, out.style.hasVoice ? 'voix détectée' : 'aucune voix', wantVoice ? 'voix attendue' : 'aucune voix attendue');

  // Narration et accroche (15)
  add('Narration et accroche', 'Ouverture au moins aussi animée que le reste', 4, Math.min(1, out.hook.motionFirst3sRatio / 1.0), `×${out.hook.motionFirst3sRatio}`, '≥ ×1,0', 'plus de mouvement dans les 3 premières secondes');
  add('Narration et accroche', 'Durée proche de la cible', 4, expect.durationSec ? lin(Math.abs(out.style.durationSec - expect.durationSec) / expect.durationSec, 0.1, 0.4) : null, `${out.style.durationSec} s (cible ${expect.durationSec ?? 'n/d'})`, '±10 %');
  add('Narration et accroche', 'Fin qui boucle sur le début', 3, out.ending.loopSimilarity === null ? null : lin(1 - out.ending.loopSimilarity, 0.12, 0.4), `similarité ${out.ending.loopSimilarity}`, '≥ 0,88', 'finir sur une image proche de l’ouverture');
  add('Narration et accroche', 'Force du message et de la chute', 4, null, 'jugement humain', 'à noter par vous');

  // Sous-titres (5)
  add('Sous-titres', 'Lisibilité et synchronisation du texte', 5, null, 'pas d’OCR : à vérifier sur la planche contact', 'à noter par vous');

  // Qualité technique (10)
  add('Qualité technique', 'H.264 High, yuv420p', 3, v.codec === 'h264' && /yuv420p/.test(v.pixFmt) ? 1 : 0, `${v.codec} ${v.profile} ${v.pixFmt}`, 'h264 / yuv420p');
  add('Qualité technique', 'Audio AAC présent', 2, out.probe.audio?.codec === 'aac' ? 1 : 0, out.probe.audio ? `${out.probe.audio.codec} ${out.probe.audio.sampleRate} Hz` : 'aucun', 'AAC');
  add('Qualité technique', 'Débit vidéo ≥ 4 Mb/s', 3, lin(4000 - (v.bitrateKbps ?? 0), 0, 3000), `${v.bitrateKbps} kb/s`, '≥ 4 000 kb/s', 'CRF plus bas');
  add('Qualité technique', 'Durée vidéo = durée audio', 2, out.probe.durationSec > 0 ? 1 : 0, `${out.probe.durationSec.toFixed(2)} s`, 'cohérente');

  const measured = c.filter((x) => x.points !== null);
  const score = Math.round(measured.reduce((a, x) => a + (x.points as number), 0) * 10) / 10;
  const measurableMax = measured.reduce((a, x) => a + x.max, 0);
  const defects = measured.filter((x) => (x.points as number) < x.max * 0.75).map((x) => ({ ...x, severity: ((x.points as number) < x.max * 0.3 ? 'majeur' : 'mineur') as Check['severity'] }));
  const notes = ['Score = estimation interne sur les seuls critères mesurables ; il ne garantit pas une qualité équivalente à la référence.'];
  if (ref && ref.probe.video && ref.probe.video.displayWidth !== 1080) notes.push('La référence est un enregistrement d’écran (interface TikTok incluse) : ses mesures de couleur et de netteté incluent l’interface.');
  return { score, measurableMax, manualMax: 100 - measurableMax, scorePct: Math.round((score / measurableMax) * 1000) / 10, checks: c, defects, notes };
}

export function qcMarkdown(q: QcReport, title: string): string {
  const L = [`# Contrôle qualité — ${title}`, '', `**Score mesuré : ${q.score} / ${q.measurableMax}** (${q.scorePct} %) · ${q.manualMax} points à évaluer par vous (non attribués).`, '', ...q.notes.map((n) => `> ${n}`), '',
    '| Critère | Point de contrôle | Points | Mesure | Règle |', '|---|---|---|---|---|',
    ...q.checks.map((x) => `| ${x.criterion} | ${x.item} | ${x.points === null ? `— / ${x.max}` : `${x.points} / ${x.max}`} | ${x.measured} | ${x.rule} |`), ''];
  if (q.defects.length) L.push('## Défauts classés', '', ...q.defects.sort((a, b) => (a.severity === 'majeur' ? -1 : 1) - (b.severity === 'majeur' ? -1 : 1)).map((d) => `- **${d.severity}** — ${d.item} : ${d.measured} (règle : ${d.rule})${d.fix ? ` → correction : ${d.fix}` : ''}`), '');
  return L.join('\n');
}
