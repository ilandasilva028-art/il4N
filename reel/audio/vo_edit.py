# /// script
# dependencies = ["numpy", "soundfile"]
# ///
# Monte la voix off : coupe les blancs de chaque prise, pose le début de chaque phrase sur un beat,
# écrit reel/audio/vo.wav (48 kHz mono) et affiche les écarts entre phrases.
import json, sys, subprocess, numpy as np, soundfile as sf

FILM = "/home/user/il4N/reel"
TAKES = "/home/user/il4N/voix"
SR = 48000
grid = json.load(open(f"{FILM}/beats.json"))
P, O = grid["period"], grid["offset"]
dur = json.load(open(f"{FILM}/film.json"))["duration"]

# (prise, beat où la parole démarre)
PLAN = json.loads(sys.argv[1]) if len(sys.argv) > 1 else [
    # prise continue full_1 : [début s, fin s] dans la prise, beat de pose
    ["fix/hook_1", 0.0, 2.1, 0.0], ["full/full_1", 2.08, 2.98, 8.5], ["full/full_1", 3.22, 3.96, 12.5],
    ["full/full_1", 4.12, 7.32, 20.5], ["full/full_1", 7.88, 9.12, 27.35], ["fix/cta_2", 0.0, 1.6, 30.2],
]

def load(name):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f"{TAKES}/{name}.wav", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def trim(x, a, b, thr_db=-40):
    x = x[int(a * SR): int(b * SR)]
    win = int(0.01 * SR)
    env = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, "same"))
    on = np.where(20 * np.log10(env + 1e-9) > thr_db)[0]
    a, b = max(0, on[0] - int(0.02 * SR)), min(len(x), on[-1] + int(0.08 * SR))
    y = x[a:b].copy()
    f = int(0.008 * SR); y[:f] *= np.linspace(0, 1, f); y[-f * 3:] *= np.linspace(1, 0, f * 3)
    return y

out = np.zeros(int(dur * SR) + SR, np.float32)
prev_end = -1
for name, a, b, beat in PLAN:
    y = trim(load(name), a, b)
    t0 = O + beat * P
    i = int(t0 * SR)
    end = t0 + len(y) / SR
    gap = t0 - prev_end
    print(f"{name:7s} beat {beat:5.2f}  {t0:5.2f}s -> {end:5.2f}s  ({len(y)/SR:4.2f}s)  gap {gap:+.2f}s  ends at beat {(end-O)/P:5.2f}")
    out[i:i + len(y)] += y
    prev_end = end
out = out[: int(dur * SR)]
pk = np.abs(out).max()
out = out / pk * 0.89
sf.write(f"{FILM}/audio/vo_raw.wav", out, SR)
# voix plus présente et plus dense : coupe-bas, présence, compression, limiteur
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{FILM}/audio/vo_raw.wav", "-af",
    "highpass=f=90,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=220:t=q:w=1:g=-2,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=80:makeup=4,alimiter=limit=0.89",
    "-ar", str(SR), f"{FILM}/audio/vo.wav"], check=True)
print("-> reel/audio/vo.wav", "last speech ends", round(prev_end, 2), "s of", dur)
