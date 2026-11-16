// Configuration centrale : chemins, limites de ressources, outils externes.
// Toutes les valeurs peuvent être surchargées par variables d'environnement (voir .env.example).
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

function findRoot(): string {
  if (process.env.FACTORY_ROOT) return path.resolve(process.env.FACTORY_ROOT);
  // Next.js et tsx sont lancés depuis factory/ ; on remonte jusqu'au package.json du projet.
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg) && fs.readFileSync(pkg, 'utf8').includes('"tiktok-ai-video-factory"')) return dir;
    const sub = path.join(dir, 'factory');
    if (fs.existsSync(path.join(sub, 'package.json'))) return sub;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

export const ROOT = findRoot();
export const DATA = path.resolve(process.env.FACTORY_DATA || path.join(ROOT, 'data'));

export const DIRS = {
  data: DATA,
  references: path.join(DATA, 'references'),
  projects: path.join(DATA, 'projects'),
  jobs: path.join(DATA, 'jobs'),
  logs: path.join(DATA, 'logs'),
  models: path.join(DATA, 'models'),
  studio: path.join(DATA, 'studio'),
  tmp: path.join(DATA, 'tmp'),
};

export const PLAYER_DIR = path.join(ROOT, 'engine', 'render', 'player');
export const PYTHON_DIR = path.join(ROOT, 'python');

const cpus = os.cpus().length || 2;
const totalGb = os.totalmem() / 1024 ** 3;

export const LIMITS = {
  // Threads FFmpeg : la moitié des cœurs, au moins 1 (sur un Mac Intel 4 cœurs : 2).
  ffmpegThreads: Number(process.env.FACTORY_FFMPEG_THREADS || Math.max(1, Math.floor(cpus / 2))),
  // Une seule tâche lourde à la fois : 8 Go de RAM ne permettent pas plus (Chromium + FFmpeg + Whisper).
  workerConcurrency: 1,
  // Priorité basse pour ne pas figer l'ordinateur (nice 10 sur macOS / Linux).
  nice: Number(process.env.FACTORY_NICE || 10),
  // Durée maximale d'une étape externe avant abandon (ms).
  stepTimeoutMs: Number(process.env.FACTORY_STEP_TIMEOUT_MS || 45 * 60 * 1000),
  maxUploadBytes: Number(process.env.FACTORY_MAX_UPLOAD_MB || 500) * 1024 * 1024,
  maxReferenceSeconds: Number(process.env.FACTORY_MAX_REFERENCE_SECONDS || 600),
  maxIterations: 3,
  lowMemory: totalGb < 12,
};

export const TOOLS = {
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobe: process.env.FFPROBE_PATH || 'ffprobe',
  python: process.env.FACTORY_PYTHON || path.join(ROOT, '.venv', 'bin', 'python'),
  claude: process.env.CLAUDE_CLI_PATH || 'claude',
  // Modèle Whisper : "base" (~150 Mo, rapide) par défaut avec 8 Go ; "small" (~470 Mo) plus précis.
  whisperModel: process.env.FACTORY_WHISPER_MODEL || (totalGb < 12 ? 'base' : 'small'),
};

export const PIPER_DIR = path.join(DIRS.models, 'piper');

export function ensureDirs(): void {
  for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });
}

export const SYSTEM = { cpus, totalGb: Math.round(totalGb * 10) / 10, platform: process.platform, arch: process.arch };
