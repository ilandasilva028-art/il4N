# Musique synthétisée (libre de droits) : un coup fort sur chaque coupe, comme la vidéo de référence.
import numpy as np, wave
SR = 48000; DUR = 8.8
CUTS = [2.00, 3.00, 4.03, 5.07, 6.10, 7.10, 8.32]
t = np.arange(int(SR * DUR)) / SR
out = np.zeros_like(t)
rng = np.random.default_rng(7)
def add(sig, at, gain=1.0):
    i = int(at * SR); n = min(len(sig), len(out) - i)
    if n > 0: out[i:i + n] += sig[:n] * gain
def kick(l=0.45):
    x = np.arange(int(SR * l)) / SR
    f = 45 + 110 * np.exp(-x * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7)
def snare(l=0.25):
    x = np.arange(int(SR * l)) / SR
    return (rng.standard_normal(len(x)) * 0.6 + np.sin(2 * np.pi * 190 * x) * 0.5) * np.exp(-x * 18)
def hat(l=0.06):
    x = np.arange(int(SR * l)) / SR
    n = rng.standard_normal(len(x)); n = np.diff(n, prepend=0)
    return n * np.exp(-x * 70)
def sub(f, l):
    x = np.arange(int(SR * l)) / SR
    env = np.minimum(1, x * 40) * np.exp(-x * 1.6)
    return np.tanh(2.2 * np.sin(2 * np.pi * f * x)) * env
# intro (plan d'ouverture) : nappe + montée vers la 1re coupe
x = t[t < 2.0]
pad = sum(np.sin(2 * np.pi * f * x) for f in (110, 130.8, 164.8, 220)) / 4
out[:len(x)] += pad * np.minimum(1, x / 0.3) * 0.18
rise = rng.standard_normal(len(x)) * (x / 2.0) ** 3 * 0.35
out[:len(x)] += np.convolve(rise, np.ones(8) / 8, 'same')
for i, c in enumerate([0.0, 0.517, 1.033, 1.55]): add(kick(), c, 0.55)
for i in range(16): add(hat(), i * 0.129, 0.12 + 0.1 * (i % 2))
# corps : un impact par coupe (kick + caisse + basse), charleston entre les coupes
notes = [55, 55, 65.4, 73.4, 55, 49, 55]
for k, c in enumerate(CUTS):
    add(kick(), c, 1.0); add(snare(), c, 0.35)
    nxt = CUTS[k + 1] if k + 1 < len(CUTS) else DUR
    add(sub(notes[k], nxt - c), c, 0.45)
    step = (nxt - c) / 4
    for j in range(8): add(hat(), c + j * step / 2, 0.18 if j % 2 else 0.1)
    add(kick(0.3), c + 2 * step, 0.6)
out = np.tanh(out * 1.3)
out = out / np.max(np.abs(out)) * 0.89
st = np.stack([out, out], 1)
with wave.open('out/musique.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes())
