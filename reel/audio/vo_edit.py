# /// script
# dependencies = ["numpy", "soundfile"]
# ///
# Monte la voix off : coupe les blancs de chaque prise, pose le début de chaque phrase sur un beat,
# écrit reel/audio/vo.wav (48 kHz mono) et affiche les écarts entre phrases.
import json, sys, subprocess, numpy as np, soundfile as sf

FILM = "/home/user/il4N/reel"
TAKES = "/home/user/il4N/voix/takes"
SR = 48000
grid = json.load(open(f"{FILM}/beats.json"))
P, O = grid["period"], grid["offset"]
dur = json.load(open(f"{FILM}/film.json"))["duration"]

# (prise, beat où la parole démarre)
PLAN = json.loads(sys.argv[1]) if len(sys.argv) > 1 else [
    ["p1_t1", 0.1], ["p2_t1", 8.5], ["p3_t1", 12.4], ["p4_t1", 20.5],
    ["p5_t1", 22.9], ["p6_t1", 24.4], ["p7_t1", 28.6],
]

def load(name):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f"{TAKES}/{name}.wav", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def trim(x, thr_db=-38):
    win = int(0.01 * SR)
    env = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, "same"))
    on = np.where(20 * np.log10(env + 1e-9) > thr_db)[0]
    a, b = max(0, on[0] - int(0.02 * SR)), min(len(x), on[-1] + int(0.08 * SR))
    y = x[a:b].copy()
    f = int(0.008 * SR); y[:f] *= np.linspace(0, 1, f); y[-f * 3:] *= np.linspace(1, 0, f * 3)
    return y

out = np.zeros(int(dur * SR) + SR, np.float32)
prev_end = -1
for name, beat in PLAN:
    y = trim(load(name))
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
sf.write(f"{FILM}/audio/vo.wav", out, SR)
print("-> reel/audio/vo.wav", "last speech ends", round(prev_end, 2), "s of", dur)
