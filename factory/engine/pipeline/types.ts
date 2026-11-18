// Types partagés par les agents de production.

export type SceneType = 'hook' | 'statement' | 'list' | 'number' | 'compare' | 'quote' | 'icon' | 'image' | 'cta';
export const SCENE_TYPES: SceneType[] = ['hook', 'statement', 'list', 'number', 'compare', 'quote', 'icon', 'image', 'cta'];
export type IconName = 'check' | 'cross' | 'clock' | 'bulb' | 'euro' | 'heart' | 'star' | 'arrow' | 'phone' | 'chart' | 'warning' | 'target' | 'eye' | 'lock';
export const ICONS: IconName[] = ['check', 'cross', 'clock', 'bulb', 'euro', 'heart', 'star', 'arrow', 'phone', 'chart', 'warning', 'target', 'eye', 'lock'];

export interface ScriptBeat {
  id: string;
  voice: string;          // phrase dite par la voix off
  onScreen: string;       // texte affiché en grand (≤ 7 mots)
  accent?: string;        // mot mis en valeur (couleur d'accent)
  kicker?: string;        // petite étiquette au-dessus (ex. « ERREUR N°1 »)
  scene: SceneType;
  icon?: IconName;
  items?: string[];       // list
  value?: string;         // number (fourni par l'utilisateur, jamais inventé)
  left?: { title: string; text: string };  // compare
  right?: { title: string; text: string };
  image?: string;         // image : nom de fichier fourni par l'utilisateur
}

export interface Script {
  title: string; topic: string; hook: string; beats: ScriptBeat[]; cta: string;
  caption: string; hashtags: string[];
  source: 'claude-cli' | 'points-cles' | 'manuel'; warnings: string[];
}

export interface StyleBible {
  name: string;
  palette: { bg: string; bg2: string; ink: string; muted: string; accent: string; accent2: string };
  fonts: { display: string; accent: string };
  motion: { energy: number; punchEverySec: number; shake: boolean; transition: 'whip' | 'zoom' | 'mask' | 'mix' };
  music: { mood: 'energique' | 'chill' | 'cinematique'; bpm: number; volumeDb: number };
  grade: { contrast: number; saturation: number; grain: number; vignette: number };
  subtitles: { enabled: boolean; size: number; y: number; uppercase: boolean; maxWords: number; highlight: boolean };
  format: { w: number; h: number; fps: number };
  voice: { engine: 'piper' | 'none'; model: string; speaker?: number; lengthScale: number };
  targetDurationSec: number; targetLufs: number;
  rules: string[];
  derivedFrom: string | null;
}

export interface SubWord { text: string; start: number; end: number; accent: boolean }
export interface SubGroup { start: number; end: number; words: SubWord[] }

export interface PlanScene {
  id: string; type: SceneType; start: number; end: number;
  voiceStart: number; voiceEnd: number;
  beat: ScriptBeat;
  transition: 'cut' | 'whip-up' | 'whip-left' | 'zoom' | 'mask' | 'flash';
  punches: number[];       // jump-cuts internes (temps absolus)
  wordTimes: SubWord[];    // mots de la voix pendant ce plan
}

export interface Hit { t: number; sfx: 'whoosh' | 'pop' | 'impact' | 'tick' | 'riser' | 'ding' | 'step' | 'thud' | 'door' | 'alarm' | 'type' | 'shatter' | 'swish' | 'click' | 'boing' | 'rain' | 'applause' | 'splash' | 'blub' | 'underwater'; gain?: number; len?: number }

export interface FilmPlan {
  version: 1; w: number; h: number; fps: number; duration: number; bpm: number; seed: number;
  style: StyleBible; scenes: PlanScene[]; subtitles: SubGroup[]; hits: Hit[];
  assets: Record<string, string>;  // nom -> chemin relatif servi au lecteur
}

export interface VoiceSegment { id: string; text: string; file: string; duration: number; start: number }
export interface VoiceTrack { file: string; duration: number; segments: VoiceSegment[]; engine: string; model: string }
