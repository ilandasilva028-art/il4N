# Voix calée sur les plans + sous-titres synchronisés, pour les reels de Noël (adapté de reel/audio/vo_sync.py).
# Chaque phrase démarre au début de son plan ; débit ajusté entre 0,90 et 1,05 (au-delà de ×1,05 la voix clonée devient confuse : vérifié Whisper).
# Les sous-titres reprennent l'orthographe du script ; leurs temps viennent des mots horodatés par Whisper.
# Usage : /home/user/tts-env/bin/python voix/noel/vo_build.py flyers|site
import json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf, torchaudio as ta

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
V = os.path.join(ROOT, "voix/noel")
SR = 48000

# phrase : (prise, indices Whisper [i0, i1], plan en beats (début, fin), sous-titres [(mots, indices Whisper, mot clé)])
FILMS = {
    "flyers": [
        ("flyers_hook_33", (0, 4), (0, 5), [(["Noël", "approche."], [[0], [1]], 0), (["Votre", "flyer,", "lui ?"], [[2], [3], [4]], 2)]),
        ("flyers_body_33", (0, 3), (5, 8), [(["S'il", "passe", "inaperçu…"], [[0, 1], [2], [3]], 2)]),
        ("flyers_body_22", (7, 10), (8, 14), [(["Start,", "Pro"], [[7], [8]], 0), (["ou", "Prestige :"], [[9], [10]], 1)]),
        ("flyers_body_22", (11, 18), (14, 21), [(["moins", "20 %,"], [[11], [12]], 1), (["une", "offre", "flash"], [[13], [14], [15]], 2), (["de", "10", "jours !"], [[16], [17], [18]], 1)]),
        ("flyers_body_22", (19, 22), (21, 28), [(["Jusqu'au", "25", "novembre."], [[19, 20], [21], [22]], 1)]),
        ("flyers_body_22", (23, 29), (28, 35.5), [(["Maquette", "gratuite."], [[23, 24], [25]], 1), (["Écrivez-moi", "en", "privé !"], [[26, 27], [28], [29]], 0)]),
    ],
    "site": json.load(open(os.path.join(V, "site_plan.json"))) if os.path.exists(os.path.join(V, "site_plan.json")) else [],
}


def load(p):
    x, sr = ta.load(p); x = x[0].numpy()
    return x if sr == SR else np.interp(np.linspace(0, len(x) - 1, int(len(x) * SR / sr)), np.arange(len(x)), x).astype(np.float32)


def fade(y, f=0.015):
    n = int(f * SR); y = y.copy(); y[:n] *= np.linspace(0, 1, n); y[-n:] *= np.linspace(1, 0, n); return y


def stretch(y, tempo):
    a = tempfile.mktemp(suffix=".wav"); b = tempfile.mktemp(suffix=".wav"); sf.write(a, y, SR)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", a, "-af", f"atempo={tempo:.4f}", b], check=True)
    z, _ = sf.read(b, dtype="float32"); os.remove(a); os.remove(b); return z


def main(film):
    fdir = os.path.join(ROOT, "reels/2026-11-noel", film)
    g = json.load(open(os.path.join(fdir, "beats.json"))); P, O = g["period"], g["offset"]; sec = lambda u: O + u * P
    dur = json.load(open(os.path.join(fdir, "film.json")))["duration"]
    out = np.zeros(int(dur * SR) + SR, np.float32)
    subs, prev = [], 0.0
    for k, (take, (i0, i1), (ua, ub), groups) in enumerate(FILMS[film]):
        W = json.load(open(os.path.join(V, take + ".wav.blind.json")))
        x = load(os.path.join(V, take + ".wav"))
        # début : juste après le mot précédent (Whisper place souvent le début d'un mot trop tard), 0,25 s avant au plus
        a = max(0, W[i0][1] - 0.25, W[i0 - 1][2] + 0.02) if i0 > 0 else 0.0
        e = W[i1][2] + 0.10
        seg = x[int(a * SR):int(e * SR)]
        t0 = max(sec(ua), prev + 0.08) if k else 0.0
        room = sec(ub) - t0 - 0.12
        last = k == len(FILMS[film]) - 1
        tempo = min(1.05, max(0.9, len(seg) / SR / room)) if not last else min(1.05, max(1.0, len(seg) / SR / room))
        seg = fade(stretch(seg, tempo)); s = int(t0 * SR); out[s:s + len(seg)] += seg[:len(out) - s]; prev = t0 + len(seg) / SR
        at = lambda tw: t0 + (tw - a) / tempo
        for words, idx, key in groups:
            subs.append({"a": round(at(W[idx[0][0]][1]), 3), "b": None, "words": words, "key": key, "end": round(at(W[idx[-1][-1]][2]), 3)})
        print(f"{take:16s} [{i0}-{i1}] {t0:5.2f}->{prev:5.2f}s plan {sec(ua):5.2f}-{sec(ub):5.2f} tempo {tempo:.2f}")
    # chaque groupe reste affiché jusqu'au suivant (ou 0,4 s après son dernier mot)
    for i, s in enumerate(subs):
        nxt = subs[i + 1]["a"] if i + 1 < len(subs) else s["end"] + 0.6
        s["b"] = round(min(nxt, s["end"] + 0.6), 3); del s["end"]
    out = out[:int(dur * SR)]
    raw = os.path.join(fdir, "audio/vo_raw.wav")
    sf.write(raw, out / np.abs(out).max() * 0.89, SR)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-af",
                    "highpass=f=90,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=220:t=q:w=1:g=-2,"
                    "acompressor=threshold=-20dB:ratio=3.5:attack=5:release=80:makeup=4,alimiter=limit=0.89",
                    "-ar", str(SR), os.path.join(fdir, "audio/vo.wav")], check=True)
    with open(os.path.join(fdir, "subs.js"), "w") as f:
        f.write("// Sous-titres générés par voix/noel/vo_build.py (temps en secondes, texte du script).\n")
        f.write("export const SUBS = " + json.dumps(subs, ensure_ascii=False, indent=1) + ";\n")
    print(f"vo.wav + subs.js ({len(subs)} groupes)")


main(sys.argv[1])
