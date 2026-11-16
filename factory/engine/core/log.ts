// Journalisation horodatée, en console et dans un fichier par tâche (data/logs/<id>.log).
import fs from 'node:fs';
import path from 'node:path';
import { DIRS } from './config.ts';

export type Level = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  file?: string;
}

export function createLogger(name: string, file?: string): Logger {
  if (file) fs.mkdirSync(path.dirname(file), { recursive: true });
  const quiet = process.env.FACTORY_QUIET === '1';
  const write = (level: Level, msg: string) => {
    const line = `${new Date().toISOString()} [${level.toUpperCase()}] [${name}] ${msg}`;
    if (file) fs.appendFileSync(file, line + '\n');
    if (!quiet && (level !== 'debug' || process.env.FACTORY_DEBUG === '1')) {
      (level === 'error' ? console.error : console.log)(line);
    }
  };
  return {
    file,
    debug: (m) => write('debug', m),
    info: (m) => write('info', m),
    warn: (m) => write('warn', m),
    error: (m) => write('error', m),
  };
}

export const jobLogFile = (jobId: string) => path.join(DIRS.logs, `${jobId}.log`);
