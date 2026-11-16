// Tests unitaires du moteur (npm test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordErrorRate, normalizeWords } from '../engine/analysis/transcribe.ts';
import { numberToFrench, speakable } from '../engine/agents/scriptwriter.ts';
import { textStats, qualityControl } from '../engine/agents/qc.ts';
import { paletteDistance, colorName } from '../engine/analysis/color.ts';
import { estimateTempo, spectral } from '../engine/analysis/audio.ts';
import { synthMusic } from '../engine/audio/music.ts';

test('WER : identique = 0, ponctuation et accents ignorés', () => {
  assert.equal(wordErrorRate('Écrivez-moi en privé !', 'ecrivez moi en prive'), 0);
  assert.equal(wordErrorRate('un deux trois', 'un trois'), 0.333);
  assert.deepEqual(normalizeWords("L'été"), ['l', 'ete']);
});

test('nombres écrits en lettres pour la voix', () => {
  assert.equal(numberToFrench(21), 'vingt et un');
  assert.equal(numberToFrench(80), 'quatre-vingts');
  assert.equal(numberToFrench(365), 'trois cent soixante-cinq');
  assert.equal(speakable('-20 % sur 3 flyers'), '-vingt pour cent sur trois flyers');
});

test('lisibilité : mots à l’écran, temps de lecture, accroche', () => {
  const log = Array.from({ length: 60 }, (_, i) => ({ t: i / 30, texts: i < 12 ? ['LA MOTIVATION'] : ['LA MOTIVATION', 'EST UN PIÈGE.'] }));
  const s = textStats(log, 30);
  assert.equal(s.maxWords, 5);
  assert.equal(s.hookWords, 5);
  // « EST UN PIÈGE. » : 3 mots affichés 1,6 s >= 1,2 s requis
  assert.equal(s.tooShort.length, 0);
  const short = textStats([{ t: 0, texts: ['ÉCRAN COUPÉ À 22 H'] }], 30);
  assert.equal(short.tooShort.length, 1);
});

test('couleurs : noms et distance de palettes', () => {
  assert.equal(colorName('#e3342c'), 'rouge');
  assert.equal(colorName('#050505'), 'noir');
  assert.equal(paletteDistance([{ hex: '#000000', share: 100, name: '' }], [{ hex: '#000000', share: 100, name: '' }]), 0);
});

test('musique synthétisée : durée, crête ≤ -1 dBFS, tempo retrouvé', () => {
  const [L] = synthMusic({ durationSec: 8, bpm: 124, mood: 'sombre', dropAt: 1, seed: 3 });
  let peak = 0; for (const v of L) peak = Math.max(peak, Math.abs(v));
  assert.ok(peak <= 0.9 && peak > 0.5, `crête ${peak}`);
  // ré-échantillonnage simple 48 k → 16 k pour l'estimateur de tempo
  const pcm = new Float32Array(Math.floor(L.length / 3)); for (let i = 0; i < pcm.length; i++) pcm[i] = L[i * 3];
  const sp = spectral(pcm);
  const { bpm } = estimateTempo(sp.flux, sp.hopSec);
  assert.ok(bpm && [1, 2, 0.5].some((m) => Math.abs(bpm * m - 124) / 124 < 0.06), `tempo ${bpm}`);
});

test('contrôle qualité : les critères non mesurables ne rapportent jamais de points', () => {
  const fake: any = { probe: { video: { displayWidth: 1080, displayHeight: 1920, avgFps: 30, codec: 'h264', profile: 'High', pixFmt: 'yuv420p', bitrateKbps: 6000 }, audio: { codec: 'aac', sampleRate: 48000 }, durationSec: 20 },
    style: { sharpness: 500, meanLuma: 30, meanContrast: 40, meanSaturation: 0.1, cutsPerMinute: 25, avgShotSec: 2, durationSec: 20, hasVoice: false }, defects: { blackSegments: [], frozenSegments: [] },
    color: { palette: [{ hex: '#050505', share: 90, name: 'noir' }], lumaVariationBetweenFrames: 10 }, audio: { cutsOnBeatPct: 50, integratedLufs: -14, truePeakDbtp: -1.5, tempoBpm: 124, tempoWindows: [] },
    hook: { motionFirst3sRatio: 1 }, ending: { loopSimilarity: 0.95 } };
  const q = qualityControl(fake, null, { durationSec: 20 });
  const manual = q.checks.filter((c) => c.points === null);
  assert.ok(manual.some((c) => c.item.startsWith('Force du message')));
  assert.equal(q.measurableMax + q.manualMax, 100);
});

test('cinématique inverse : le pied atteint exactement la cible', async () => {
  const { ik2, gait } = await import('../engine/render/player/lib/anim.js');
  const D = Math.PI / 180;
  for (const [dx, dy] of [[30, 140], [-40, 150], [0, 158], [60, 120]]) {
    const [a1, a2] = ik2(dx, dy, 80, 78, 1);
    const kx = Math.sin(a1 * D) * 80, ky = Math.cos(a1 * D) * 80;
    const fx = kx + Math.sin((a1 + a2) * D) * 78, fy = ky + Math.cos((a1 + a2) * D) * 78;
    assert.ok(Math.hypot(fx - dx, fy - dy) < 0.5, `cible ${dx},${dy} atteinte à ${fx.toFixed(1)},${fy.toFixed(1)}`);
    assert.ok(a2 <= 0.01, 'le genou plie vers l’avant');
  }
  // pied d'appui immobile dans le monde pendant que la hanche avance
  const g1 = gait(0.10, { x0: 200, speed: 260 }), g2 = gait(0.15, { x0: 200, speed: 260 });
  const footX = (g: any) => { const [a1, a2] = g.pose.legF; return g.x + Math.sin(a1 * D) * 80 + Math.sin((a1 + a2) * D) * 78; };
  if (g1.plantedF && g2.plantedF) assert.ok(Math.abs(footX(g1) - footX(g2)) < 1.5, 'le pied ne glisse pas');
});

test('contrôle de scénario : repère ce qui manque', async () => {
  const { checkScript } = await import('../engine/agents/scriptCheck.ts');
  const good = checkScript({ accroche: ['JOUR 180.', 'ILS APPLAUDISSENT.'], structure: ['ouverture', 'conflit', 'obstacle', 'chute'], dialogues: ['TOI ? SPORTIF ?', 'J’AI PAS ARRÊTÉ.'], conseils: ['NOTE CHAQUE SÉANCE.', 'JOURS SANS : 5 MINUTES.'], details: ['5 H 00', 'JOUR 63', 'banc'], chute: ['LAISSE-LES RIRE.', 'CONTINUE.'] });
  assert.ok(good.every((c) => c.ok), good.filter((c) => !c.ok).map((c) => c.item).join(', '));
  const bad = checkScript({ accroche: ['Il faut toujours être motivé chaque jour de sa vie'], structure: ['chute'], chute: ['Bravo'] });
  assert.ok(bad.filter((c) => !c.ok).length >= 5);
  assert.equal(checkScript(null)[0].ok, false);
});
