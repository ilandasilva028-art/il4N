// AGENT 3 — SCRIPTWRITER
// Trois modes, tous honnêtes sur leur origine (champ `source` du script) :
//  - « claude-cli » : rédaction par Claude Code en mode non interactif (`claude -p`), si installé et activé ;
//  - « points-cles » : construction déterministe à partir de VOS points clés (aucune invention) ;
//  - « manuel » : script fourni ligne par ligne.
import { run, which } from '../core/exec.ts';
import { TOOLS } from '../core/config.ts';
import type { Logger } from '../core/log.ts';
import type { Script, ScriptBeat, SceneType, IconName } from '../pipeline/types.ts';
import { SCENE_TYPES, ICONS } from '../pipeline/types.ts';
import type { AnalysisReport } from '../analysis/report.ts';
import { slugify } from '../core/store.ts';

export interface ScriptRequest {
  topic: string; durationSec: number; keyPoints?: string[]; hook?: string; cta?: string; handle?: string;
  tone?: string; mode: 'claude-cli' | 'points-cles' | 'manuel'; manualText?: string; reference?: AnalysisReport | null;
  wordsPerMinute?: number;
}

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
export function numberToFrench(n: number): string {
  if (n < 0) return 'moins ' + numberToFrench(-n);
  if (n <= 16) return UNITS[n];
  if (n < 20) return 'dix-' + UNITS[n - 10];
  if (n < 70) { const t = Math.floor(n / 10), u = n % 10; return TENS[t] + (u === 0 ? '' : u === 1 ? ' et un' : '-' + UNITS[u]); }
  if (n < 80) return n === 71 ? 'soixante et onze' : 'soixante-' + numberToFrench(n - 60);
  if (n < 100) return 'quatre-vingt' + (n === 80 ? 's' : '-' + numberToFrench(n - 80));
  if (n < 1000) { const h = Math.floor(n / 100), r = n % 100; return (h === 1 ? 'cent' : UNITS[h] + ' cent' + (r === 0 ? 's' : '')) + (r ? ' ' + numberToFrench(r) : ''); }
  if (n < 1_000_000) { const k = Math.floor(n / 1000), r = n % 1000; return (k === 1 ? 'mille' : numberToFrench(k) + ' mille') + (r ? ' ' + numberToFrench(r) : ''); }
  return String(n);
}

// La voix de synthèse lit mal les chiffres et symboles : on les écrit en toutes lettres.
export function speakable(text: string): string {
  return text
    .replace(/(\d+)\s?%/g, (_, d) => `${numberToFrench(Number(d))} pour cent`)
    .replace(/(\d+)\s?€/g, (_, d) => `${numberToFrench(Number(d))} euros`)
    .replace(/\b(\d{1,6})\b/g, (_, d) => numberToFrench(Number(d)))
    .replace(/&/g, ' et ').replace(/\s+/g, ' ').trim();
}

const STOP = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'a', 'à', 'en', 'pour', 'pas', 'que', 'qui', 'ton', 'ta', 'tes', 'ce', 'cette', 'est', 'sont', 'sur', 'dans', 'avec', 'tu', 'vous', 'je', 'il', 'elle', 'on', 'nous', 'ne', 'se', 'sa', 'son', 'ses', 'mon', 'ma', 'mes', 'votre', 'vos', 'au', 'aux', 'plus']);
export function pickAccent(text: string): string | undefined {
  const words = text.replace(/[.,!?;:…«»"]/g, '').split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()));
  return words.sort((a, b) => b.length - a.length)[0];
}
export function shorten(text: string, maxWords = 6): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const w = clean.split(' ');
  return w.length <= maxWords ? clean : w.slice(0, maxWords).join(' ').replace(/[,;:]$/, '') + '…';
}

function validateBeat(b: any, i: number): ScriptBeat {
  const scene: SceneType = SCENE_TYPES.includes(b.scene) ? b.scene : 'statement';
  const beat: ScriptBeat = {
    id: `b${String(i + 1).padStart(2, '0')}`, voice: String(b.voice || '').trim(), onScreen: String(b.onScreen || shorten(b.voice || '')).trim(),
    accent: b.accent ? String(b.accent) : pickAccent(String(b.onScreen || b.voice || '')), kicker: b.kicker ? String(b.kicker).slice(0, 28) : undefined, scene,
  };
  if (b.icon && ICONS.includes(b.icon)) beat.icon = b.icon as IconName;
  if (Array.isArray(b.items)) beat.items = b.items.slice(0, 5).map((x: any) => String(x).slice(0, 40));
  if (b.value) beat.value = String(b.value).slice(0, 12);
  if (b.left && b.right) { beat.left = { title: String(b.left.title || ''), text: String(b.left.text || '') }; beat.right = { title: String(b.right.title || ''), text: String(b.right.text || '') }; }
  if (scene === 'list' && !beat.items?.length) beat.scene = 'statement';
  if (scene === 'number' && !beat.value) beat.scene = 'statement';
  if (scene === 'compare' && !beat.left) beat.scene = 'statement';
  if (scene === 'image' && !b.image) beat.scene = 'statement';
  if (b.image) beat.image = String(b.image);
  return beat;
}

export function wordBudget(durationSec: number, wpm = 165): number { return Math.round((durationSec - 1.5) * (wpm / 60)); }

const SCHEMA = {
  type: 'object', required: ['title', 'hook', 'beats', 'cta', 'caption', 'hashtags'],
  properties: {
    title: { type: 'string' }, hook: { type: 'string' }, cta: { type: 'string' }, caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    beats: { type: 'array', items: { type: 'object', required: ['voice', 'onScreen', 'scene'], properties: {
      voice: { type: 'string' }, onScreen: { type: 'string' }, accent: { type: 'string' }, kicker: { type: 'string' },
      scene: { type: 'string', enum: SCENE_TYPES.filter((s) => s !== 'image') }, icon: { type: 'string', enum: ICONS },
      items: { type: 'array', items: { type: 'string' } }, value: { type: 'string' },
      left: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' } } },
      right: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' } } },
    } } },
  },
};

function referenceBrief(r?: AnalysisReport | null): string {
  if (!r) return 'Pas de vidéo de référence.';
  return [
    `Référence mesurée : ${r.style.durationSec} s, ${r.scenes.shotCount} plans (un toutes les ${r.scenes.avgShotSec} s),`,
    `parole ${r.transcript.wordsPerMinute ?? 'n/d'} mots/min, premier mot à ${r.hook.firstWordSec ?? 'n/d'} s,`,
    `accroche : « ${r.hook.textFirst3s || 'n/d'} », fin : « ${r.ending.lastWords || 'n/d'} ».`,
    'Inspire-toi de la STRUCTURE et du RYTHME, jamais du texte ni des idées propres de la référence.',
  ].join(' ');
}

async function viaClaude(req: ScriptRequest, log?: Logger): Promise<Script> {
  const bin = await which(TOOLS.claude);
  if (!bin) throw new Error('La CLI Claude Code est introuvable : choisissez le mode « points clés ».');
  const budget = wordBudget(req.durationSec, req.wordsPerMinute);
  const nBeats = Math.max(4, Math.min(10, Math.round(req.durationSec / 2.6)));
  const prompt = [
    `Écris le script d'une vidéo TikTok verticale en français sur : « ${req.topic} ».`,
    `Durée cible ${req.durationSec} s, environ ${budget} mots parlés au total, ${nBeats} plans (beats) dont le premier est l'accroche (scene "hook") et le dernier l'appel à l'action (scene "cta").`,
    req.keyPoints?.length ? `Points à couvrir (n'ajoute aucun fait au-delà) : ${req.keyPoints.join(' | ')}` : '',
    req.tone ? `Ton : ${req.tone}.` : 'Ton : direct, concret, tutoiement.',
    req.cta ? `Appel à l'action souhaité : ${req.cta}.` : '',
    referenceBrief(req.reference),
    'Règles : accroche ≤ 8 mots qui crée une tension ou une promesse précise ; phrases courtes et orales ; chaque beat = UNE idée ;',
    'onScreen ≤ 6 mots (ce qu’on lit à l’écran), accent = un mot de onScreen ; kicker optionnel ≤ 3 mots en majuscules ;',
    'scene parmi hook, statement, list (items ≤ 4 mots chacun), number (value = nombre réellement fourni par l’utilisateur uniquement), compare (left/right), quote, icon (icon obligatoire), cta.',
    'INTERDIT : statistiques, chiffres, études, témoignages ou promesses de résultats inventés. Si tu n’as pas de chiffre fourni, n’utilise pas la scène number.',
    'Écris les nombres en lettres dans "voice". hashtags : 4 à 6, pertinents, sans #fyp ni #pourtoi. caption ≤ 150 caractères.',
  ].filter(Boolean).join('\n');
  const args = ['-p', prompt, '--output-format', 'json', '--json-schema', JSON.stringify(SCHEMA), '--tools', '', '--no-session-persistence', '--strict-mcp-config',
    '--system-prompt', 'Tu es un scénariste TikTok francophone exigeant et honnête. Tu réponds uniquement avec le JSON demandé.'];
  log?.info('Scénariste : rédaction via Claude Code (claude -p)…');
  const r = await run(bin, args, { log, timeoutMs: 5 * 60 * 1000, lowPriority: false });
  if (r.code !== 0) throw new Error(`Claude Code a échoué : ${r.stderr.slice(-300) || r.stdout.slice(-300)}`);
  const env = JSON.parse(r.stdout);
  let data = env.structured_output;
  if (!data && typeof env.result === 'string') {
    const m = env.result.match(/\{[\s\S]*\}/);
    data = m ? JSON.parse(m[0]) : null;
  }
  if (!data?.beats?.length) throw new Error('Réponse de Claude Code inexploitable (pas de beats).');
  const beats = data.beats.map(validateBeat);
  beats[0].scene = 'hook';
  beats[beats.length - 1].scene = 'cta';
  return finalize({ title: data.title, topic: req.topic, hook: data.hook, beats, cta: data.cta, caption: data.caption, hashtags: data.hashtags, source: 'claude-cli', warnings: [] }, req);
}

function viaKeyPoints(req: ScriptRequest): Script {
  const pts = (req.keyPoints || []).map((p) => p.trim()).filter(Boolean);
  if (!pts.length) throw new Error('Mode « points clés » : indiquez au moins un point clé (une idée par ligne).');
  const warnings: string[] = [];
  const hook = req.hook?.trim() || `${req.topic.trim().replace(/[.!?]$/, '')} ?`;
  if (!req.hook) warnings.push('Accroche générée à partir du sujet : écrivez votre propre accroche pour un meilleur résultat.');
  const beats: ScriptBeat[] = [];
  beats.push({ id: 'b01', scene: 'hook', voice: hook, onScreen: shorten(hook, 7), accent: pickAccent(hook) });
  const numbered = pts.length >= 2 && pts.length <= 5;
  pts.forEach((p, i) => {
    const icons: IconName[] = ['bulb', 'target', 'check', 'star', 'eye'];
    const scene: SceneType = numbered ? (i % 2 === 0 ? 'list' : 'icon') : 'statement';
    beats.push({
      id: `b${String(beats.length + 1).padStart(2, '0')}`, scene, voice: p, onScreen: shorten(p, 6), accent: pickAccent(p),
      kicker: numbered ? `N°${i + 1}` : undefined, icon: scene === 'icon' ? icons[i % icons.length] : undefined,
      items: scene === 'list' ? pts.map((x) => shorten(x, 4)).slice(0, i + 1) : undefined,
    });
  });
  const cta = req.cta?.trim() || 'Abonne-toi pour la suite.';
  beats.push({ id: `b${String(beats.length + 1).padStart(2, '0')}`, scene: 'cta', voice: cta, onScreen: shorten(cta, 5), accent: pickAccent(cta) });
  return finalize({ title: req.topic, topic: req.topic, hook, beats, cta, caption: `${hook} ${pts.length} points à retenir.`.slice(0, 150), hashtags: defaultHashtags(req.topic), source: 'points-cles', warnings }, req);
}

// Mode manuel : une ligne = un plan. Format libre « voix » ou « voix | texte écran | type | accent ».
function viaManual(req: ScriptRequest): Script {
  const lines = (req.manualText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('Mode manuel : écrivez au moins 2 lignes (une par plan).');
  const beats = lines.map((l, i) => {
    const [voice, onScreen, type, accent] = l.split('|').map((x) => x?.trim());
    return validateBeat({ voice, onScreen: onScreen || shorten(voice, 6), scene: type || (i === 0 ? 'hook' : i === lines.length - 1 ? 'cta' : 'statement'), accent, icon: type === 'icon' ? 'bulb' : undefined }, i);
  });
  return finalize({ title: req.topic, topic: req.topic, hook: beats[0].voice, beats, cta: beats[beats.length - 1].voice, caption: beats[0].voice.slice(0, 150), hashtags: defaultHashtags(req.topic), source: 'manuel', warnings: [] }, req);
}

export function defaultHashtags(topic: string): string[] {
  const words = slugify(topic, 80).split('-').filter((w) => w.length > 3 && !STOP.has(w)).slice(0, 3);
  return [...words.map((w) => '#' + w), '#astuce', '#apprendresurtiktok'].slice(0, 5);
}

function finalize(s: Script, req: ScriptRequest): Script {
  const words = s.beats.reduce((a, b) => a + b.voice.split(/\s+/).length, 0);
  const budget = wordBudget(req.durationSec, req.wordsPerMinute);
  if (words > budget * 1.3) s.warnings.push(`Texte long (${words} mots pour ~${budget} conseillés) : la vidéo dépassera la durée cible.`);
  if (/\d/.test(s.beats.map((b) => b.voice).join(' '))) s.warnings.push('Des chiffres ont été écrits en lettres pour la voix de synthèse.');
  s.beats = s.beats.map((b) => ({ ...b, voice: speakable(b.voice) }));
  s.hashtags = (s.hashtags || []).map((h) => (h.startsWith('#') ? h : '#' + h)).slice(0, 6);
  return s;
}

export async function writeScript(req: ScriptRequest, log?: Logger): Promise<Script> {
  if (req.mode === 'manuel') return viaManual(req);
  if (req.mode === 'claude-cli') return viaClaude(req, log);
  return viaKeyPoints(req);
}
