// Routine « 1 vidéo par jour » (style mentality).
//   npm run daily -- next                         → vision du jour + nom du film à écrire
//   npm run daily -- produce <film> <visionId>    → rendu + musique + mix + analyse + contrôle qualité (une itération)
//   npm run daily -- deliver <film> <visionId>    → copie la meilleure version dans livraisons/ + journal
// Rien n'est jamais publié : la publication reste manuelle, après validation.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DIRS, ensureDirs } from './core/config.ts';
import { readJson, writeJson, writeText } from './core/store.ts';
import { createLogger } from './core/log.ts';
import { produceFilm } from './pipeline/filmProduction.ts';
import { runOk } from './core/exec.ts';
import { TOOLS } from './core/config.ts';
import type { QcReport } from './agents/qc.ts';

interface Vision { id: string; titre: string; accroche: string[]; metaphore: string; scenes: string[]; chute: string[]; mot: string; hashtags: string[] }
interface Entry { date: string; vision: string; film: string; version: string; score: number; max: number; file: string }

const VISIONS = path.join(ROOT, 'themes', 'visions.json');
const LIV = path.join(ROOT, 'livraisons');
const JOURNAL = path.join(LIV, 'journal.json');
const REF = path.join(ROOT, 'references', 'style-mentality.json');

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }); // AAAA-MM-JJ
const journal = (): Entry[] => readJson<Entry[]>(JOURNAL, []);
const vision = (id: string): Vision => {
  const v = readJson<{ visions: Vision[] }>(VISIONS).visions.find((x) => x.id === id);
  if (!v) throw new Error(`Vision inconnue : ${id}`);
  return v;
};

ensureDirs();
const [cmd, film, visionId] = process.argv.slice(2);
const log = createLogger('daily');

if (cmd === 'next') {
  const used = new Set(journal().map((e) => e.vision));
  const all = readJson<{ visions: Vision[] }>(VISIONS).visions;
  const v = all.find((x) => !used.has(x.id));
  const d = today().replace(/-/g, '');
  console.log(JSON.stringify(v ? { date: today(), film: `j${d}-${v.id}`, file: `engine/render/player/films/j${d}-${v.id}.js`, vision: v, restantes: all.filter((x) => !used.has(x.id)).length - 1 }
    : { date: today(), vision: null, message: 'Banque épuisée : inventer 10 nouvelles visions dans themes/visions.json.' }, null, 2));
} else if (cmd === 'produce') {
  if (!film) throw new Error('Usage : produce <film> <visionId>');
  const base = path.join(DIRS.projects, film);
  const n = fs.existsSync(base) ? fs.readdirSync(base).filter((x) => /^v\d+$/.test(x)).length + 1 : 1;
  if (n > 3) { console.log(JSON.stringify({ error: 'Maximum de 3 itérations atteint pour ce film : livrer la meilleure version ou demander une décision.' })); process.exit(2); }
  const r = await produceFilm({ film, outDir: path.join(base, `v${n}`), referenceAnalysis: REF, log });
  console.log(JSON.stringify({ version: `v${n}`, score: r.qc.score, max: r.qc.measurableMax, pct: r.qc.scorePct, defauts: r.qc.defects.map((d) => `${d.severity} : ${d.item} (${d.measured})`), planche: path.join(base, `v${n}`, 'analyse', 'contact.jpg') }, null, 2));
} else if (cmd === 'deliver') {
  if (!film || !visionId) throw new Error('Usage : deliver <film> <visionId>');
  const v = vision(visionId);
  const base = path.join(DIRS.projects, film);
  const versions = fs.readdirSync(base).filter((x) => /^v\d+$/.test(x));
  const scored = versions.map((x) => ({ x, qc: readJson<QcReport>(path.join(base, x, 'qc.json')) })).sort((a, b) => b.qc.score - a.qc.score);
  const best = scored[0];
  const date = today();
  const out = path.join(LIV, `${date}-${v.id}`);
  fs.mkdirSync(out, { recursive: true });
  const mp4 = path.join(out, `${v.id}.mp4`);
  // Copie de livraison légère (SSIM ≈ 0,998 vs le master) pour ne pas alourdir le dépôt git.
  await runOk(TOOLS.ffmpeg, ['-v', 'error', '-y', '-i', path.join(base, best.x, 'final.mp4'), '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', mp4]);
  fs.copyFileSync(path.join(base, best.x, 'qc.md'), path.join(out, 'controle-qualite.md'));
  const dur = best.qc.checks.find((c) => c.item.startsWith('Durée vidéo'))?.measured || '';
  await runOk(TOOLS.ffmpeg, ['-v', 'error', '-y', '-sseof', '-2.5', '-i', mp4, '-frames:v', '1', path.join(out, 'couverture.jpg')]);
  const sc = (x: string) => x.toLowerCase().replace(/(^|[.!?…]\s+)(\p{L})/gu, (_m, a, c) => a + c.toUpperCase());
  const caption = `${sc(v.accroche.join(' '))} ${sc(v.chute.join(''))}`.replace(/\s+/g, ' ').trim().slice(0, 150);
  writeText(path.join(out, 'LISEZMOI.md'), [
    `# ${v.titre} — vidéo du ${date}`, '', '**Rien n’est publié.** À regarder, écouter, puis publier toi-même si elle te plaît.', '',
    `- Fichier : \`${v.id}.mp4\` (${dur}) · couverture : \`couverture.jpg\``,
    `- Concept : ${v.metaphore}`,
    `- Score mesuré : **${best.qc.score} / ${best.qc.measurableMax}** (${best.qc.scorePct} %) sur ${versions.length} itération(s) — ${best.qc.manualMax} points à noter par toi (message, lisibilité).`, '',
    '## Publication proposée', '', '```', caption, '', [...new Set([...v.hashtags, '#motivation'])].slice(0, 5).join(' '), '```', '',
    'Conseil : publie à heure fixe, réponds aux premiers commentaires dans l’heure, épingle un commentaire-question (« Tu es plutôt jour 1 ou un jour ? »).',
    '', '## Itérations', '', ...scored.map((s) => `- ${s.x} : ${s.qc.score} / ${s.qc.measurableMax}${s.x === best.x ? ' ← livrée' : ''}`), '',
    '_Le score est une estimation interne : il ne garantit ni la viralité ni une qualité équivalente aux vidéos de référence._', '',
  ].join('\n'));
  const j = journal().filter((e) => !(e.date === date && e.vision === v.id));
  j.push({ date, vision: v.id, film, version: best.x, score: best.qc.score, max: best.qc.measurableMax, file: path.relative(ROOT, mp4) });
  writeJson(JOURNAL, j);
  console.log(JSON.stringify({ livre: path.relative(ROOT, out), version: best.x, score: best.qc.score }));
} else {
  console.log('Commandes : next | produce <film> <visionId> | deliver <film> <visionId>');
}
