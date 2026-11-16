// Stockage fichier : JSON écrit de façon atomique (fichier temporaire puis renommage),
// identifiants lisibles et sûrs pour les chemins.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function readJson<T>(file: string, fallback?: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch (e) {
    if (fallback !== undefined) return fallback;
    throw e;
  }
}

export function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export function writeText(file: string, text: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

export function newId(prefix: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
  return `${prefix}-${stamp}-${crypto.randomBytes(2).toString('hex')}`;
}

export const SAFE_ID = /^[a-z]+-[0-9]{8}-[0-9]{6}-[0-9a-f]{4}$/;
export function assertId(id: string): string {
  if (!SAFE_ID.test(id)) throw new Error(`Identifiant invalide : ${id}`);
  return id;
}

export function slugify(s: string, max = 40): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max) || 'video';
}

export function listDirs(dir: string): string[] {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse(); } catch { return []; }
}

export const exists = (p: string) => fs.existsSync(p);
