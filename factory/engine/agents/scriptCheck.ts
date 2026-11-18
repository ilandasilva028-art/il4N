// Contrôle du scénario (docs/SCENARIO.md) : vérifications structurelles simples et explicables.
// Indicatif : il ne note pas la qualité d'écriture, il signale ce qui manque.
import { normalizeWords } from '../analysis/transcribe.ts';

export interface FilmScript { accroche: string[]; structure: string[]; dialogues?: string[]; conseils?: string[]; details?: string[]; chute: string[]; premiere?: string }
export const PREMIERE_TYPES = ['chute', 'raté', 'perte de temps', 'obstacle'] as const;
export interface ScriptCheck { item: string; ok: boolean; detail: string }

const STOP = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'a', 'tu', 'te', 't', 'l', 'd', 'j', 'ne', 'pas', 'plus', 'ce', 'c', 'est', 'ils', 'il', 'toi']);
const words = (s: string) => normalizeWords(s);

// Hits = bruitages du film [{ t, sfx }] : la première seconde doit contenir une action (son d'impact ou de mouvement).
export function checkScript(s: FilmScript | null | undefined, hits: { t: number; sfx: string }[] = []): ScriptCheck[] {
  if (!s) return [{ item: 'SCRIPT exporté par le film', ok: false, detail: 'absent : ajouter export const SCRIPT (docs/SCENARIO.md)' }];
  const out: ScriptCheck[] = [];
  // Règle d'Ilan : une action dès la première seconde (chute, occasion ratée, temps perdu, obstacle) ; pas d'intro ni de logo.
  const early = hits.filter((h) => h.t < 1.0 && ['impact', 'thud', 'swish', 'whoosh', 'shatter', 'boing', 'step', 'door', 'alarm', 'splash', 'blub', 'pop'].includes(h.sfx));
  out.push({ item: 'Action dans la 1re seconde (son d’action)', ok: early.length > 0, detail: early.length ? `${early.length} bruitage(s) d’action avant 1 s` : 'aucun bruitage d’action avant 1 s' });
  const types = PREMIERE_TYPES as readonly string[];
  out.push({ item: 'Première seconde = chute, raté, perte de temps ou obstacle', ok: !!s.premiere && types.includes(s.premiere), detail: s.premiere ? `type : ${s.premiere}` : `absent (valeurs : ${types.join(', ')})` });
  const hookW = words(s.accroche.join(' '));
  out.push({ item: 'Accroche ≤ 6 mots', ok: hookW.length <= 6, detail: `${hookW.length} mots : « ${s.accroche.join(' ')} »` });
  const tension = /\?|\d|jamais|pas|plus|rire|piege|arrete|faux|stop|personne/i.test(s.accroche.join(' ').normalize('NFD').replace(/[̀-ͯ]/g, ''));
  out.push({ item: 'Accroche qui crée une question (contradiction, chiffre, provocation)', ok: tension, detail: tension ? 'oui' : 'aucun marqueur de tension' });
  const st = s.structure || [];
  for (const need of ['conflit', 'obstacle', 'chute']) out.push({ item: `Temps « ${need} » présent`, ok: st.includes(need), detail: st.join(' → ') });
  const tips = s.conseils || [];
  out.push({ item: '2 à 4 conseils applicables', ok: tips.length >= 2 && tips.length <= 4, detail: `${tips.length} : ${tips.join(' | ')}` });
  const longTips = tips.filter((t) => words(t).length > 6);
  out.push({ item: 'Conseils ≤ 6 mots', ok: !longTips.length, detail: longTips.length ? longTips.join(' | ') : 'ok' });
  const dl = s.dialogues || [];
  out.push({ item: 'Dialogues (2 à 4 bulles, ≤ 5 mots)', ok: dl.length >= 2 && dl.length <= 4 && dl.every((d) => words(d).length <= 5), detail: dl.join(' | ') || 'aucun' });
  const det = s.details || [];
  out.push({ item: 'Au moins 3 détails concrets (heure, jour, objet)', ok: det.length >= 3, detail: det.join(', ') || 'aucun' });
  const key = (arr: string[]) => new Set(words(arr.join(' ')).filter((w) => !STOP.has(w) && w.length > 2));
  const hk = key(s.accroche), ck = key(s.chute);
  const shared = [...ck].filter((w) => hk.has(w));
  out.push({ item: 'La chute rappelle l’accroche', ok: shared.length > 0 || st[0] === 'ouverture', detail: shared.length ? `mot repris : ${shared.join(', ')}` : st[0] === 'ouverture' ? 'boucle par l’image (ouverture in medias res)' : 'aucun rappel' });
  return out;
}

export function scriptMarkdown(c: ScriptCheck[]): string {
  const ok = c.filter((x) => x.ok).length;
  return ['## Scénario (contrôle indicatif, non noté)', '', `${ok}/${c.length} points de la méthode respectés (docs/SCENARIO.md).`, '', '| Point | | Détail |', '|---|---|---|',
    ...c.map((x) => `| ${x.item} | ${x.ok ? '✅' : '❌'} | ${x.detail} |`), ''].join('\n');
}
