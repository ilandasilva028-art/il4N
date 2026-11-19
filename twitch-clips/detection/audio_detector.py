"""Light audio analysis of a candidate window: loudness curve, peaks, silence-then-spike,
and (optional) AudioSet laughter scores on a few short windows around the peaks only."""
import subprocess
import numpy as np

SR = 16000
HOP = 0.25          # seconds per loudness frame
LAUGH = ("Laughter", "Belly laugh", "Giggle", "Chuckle, chortle")
SCREAM = ("Screaming", "Shout", "Yell")
_clf = None


def decode(path, start=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(max(start, 0)), "-i", path]
    if dur:
        cmd += ["-t", str(dur)]
    cmd += ["-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32)


def loudness(a):
    n = int(SR * HOP)
    frames = len(a) // n
    if frames == 0:
        return np.array([])
    x = a[: frames * n].reshape(frames, n)
    return 20 * np.log10(np.sqrt((x ** 2).mean(axis=1)) + 1e-6)


def analyze(path, start=0.0, dur=None, use_ast=True):
    """Returns dict with times in seconds relative to `start`."""
    a = decode(path, start, dur)
    db = loudness(a)
    if len(db) < 8:
        return dict(ok=False, reason="no audio")
    med = float(np.median(db))
    # smooth 1 s
    k = max(1, int(1 / HOP))
    sm = np.convolve(db, np.ones(k) / k, mode="same")
    peaks = []
    for i in np.argsort(sm)[::-1]:
        t = i * HOP
        if all(abs(t - p) > 4 for p in peaks):
            peaks.append(t)
        if len(peaks) == 3:
            break
    p0 = peaks[0]
    i0 = int(p0 / HOP)
    before = sm[max(0, i0 - int(3 / HOP)): max(1, i0 - int(0.5 / HOP))]
    silence_then_spike = bool(len(before) and before.min() < med - 8 and sm[i0] > med + 6)
    res = dict(ok=True, median_db=round(med, 1), peak_db=round(float(sm[i0]), 1),
               rise_db=round(float(sm[i0] - med), 1), peaks=[round(p, 2) for p in peaks],
               silence_then_spike=silence_then_spike, curve=[round(float(v), 1) for v in sm])
    if use_ast:
        res.update(ast_scores(a, peaks))
    return res


def ast_scores(a, peaks):
    """Laughter / scream probability on 3 s windows around the top peaks (<= 6 inferences)."""
    global _clf
    try:
        if _clf is None:
            import os
            os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
            from transformers import pipeline
            _clf = pipeline("audio-classification", model="MIT/ast-finetuned-audioset-10-10-0.4593")
        wins = []
        for p in peaks:
            for off in (-2.0, -0.5):
                s = int(max(0, p + off) * SR)
                w = a[s: s + 3 * SR]
                if len(w) > SR:
                    wins.append({"raw": w, "sampling_rate": SR})
        laugh = scream = 0.0
        for res in _clf(wins, top_k=None, batch_size=6):
            d = {x["label"]: x["score"] for x in res}
            laugh = max(laugh, sum(d.get(l, 0) for l in LAUGH))
            scream = max(scream, sum(d.get(l, 0) for l in SCREAM))
        return dict(laugh_score=round(laugh, 4), scream_score=round(scream, 4))
    except Exception as e:                      # model missing: keep going without it, say so
        return dict(laugh_score=None, scream_score=None, ast_error=str(e)[:200])
