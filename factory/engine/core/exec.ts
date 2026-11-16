// Lancement de processus externes (ffmpeg, python, claude) avec délai maximal, priorité basse et journalisation.
import { spawn } from 'node:child_process';
import { LIMITS } from './config.ts';
import type { Logger } from './log.ts';

export interface RunOptions {
  cwd?: string;
  input?: string | Buffer;
  timeoutMs?: number;
  log?: Logger;
  env?: NodeJS.ProcessEnv;
  lowPriority?: boolean;
  onStderrLine?: (line: string) => void;
  maxBuffer?: number;
}

export interface RunResult { code: number; stdout: string; stderr: string; stdoutBuf: Buffer }

export class ExecError extends Error {
  constructor(message: string, public result: RunResult) { super(message); }
}

export function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? LIMITS.stepTimeoutMs;
  const usNice = opts.lowPriority !== false && process.platform !== 'win32' && LIMITS.nice > 0;
  const realCmd = usNice ? 'nice' : cmd;
  const realArgs = usNice ? ['-n', String(LIMITS.nice), cmd, ...args] : args;
  opts.log?.debug(`$ ${cmd} ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ').slice(0, 600)}`);
  return new Promise((resolve, reject) => {
    const child = spawn(realCmd, realArgs, { cwd: opts.cwd, env: { ...process.env, ...opts.env }, stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = []; let outLen = 0;
    const errChunks: string[] = []; let partial = '';
    const maxBuffer = opts.maxBuffer ?? 512 * 1024 * 1024;
    child.stdout.on('data', (d: Buffer) => { outLen += d.length; if (outLen <= maxBuffer) out.push(d); });
    child.stderr.on('data', (d: Buffer) => {
      const s = d.toString();
      errChunks.push(s);
      if (errChunks.length > 4000) errChunks.splice(0, 2000);
      if (opts.onStderrLine) {
        partial += s;
        const lines = partial.split(/\r?\n|\r/);
        partial = lines.pop() || '';
        lines.forEach((l) => opts.onStderrLine!(l));
      }
    });
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
    child.on('error', (e) => { clearTimeout(timer); reject(new ExecError(`Impossible de lancer ${cmd} : ${e.message}`, { code: -1, stdout: '', stderr: e.message, stdoutBuf: Buffer.alloc(0) })); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const stdoutBuf = Buffer.concat(out);
      const res = { code: code ?? -1, stdout: stdoutBuf.toString(), stderr: errChunks.join(''), stdoutBuf };
      if (signal === 'SIGKILL') return reject(new ExecError(`${cmd} interrompu (délai de ${Math.round(timeoutMs / 1000)} s dépassé)`, res));
      resolve(res);
    });
    if (opts.input !== undefined) child.stdin.end(opts.input); else child.stdin.end();
  });
}

export async function runOk(cmd: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  const r = await run(cmd, args, opts);
  if (r.code !== 0) {
    const tail = r.stderr.trim().split('\n').slice(-8).join('\n');
    opts.log?.error(`${cmd} a échoué (code ${r.code}) : ${tail}`);
    throw new ExecError(`${cmd} a échoué (code ${r.code}) : ${tail}`, r);
  }
  return r;
}

export async function which(cmd: string): Promise<string | null> {
  try {
    const r = await run(process.platform === 'win32' ? 'where' : 'which', [cmd], { lowPriority: false, timeoutMs: 5000 });
    return r.code === 0 ? r.stdout.trim().split('\n')[0] : null;
  } catch { return null; }
}
