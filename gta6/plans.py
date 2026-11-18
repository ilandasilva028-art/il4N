"""plans.py : mode « beaux plans » de make_tiktok.py.

Trouve tout seul, dans une capture de cinématique ou de bande-annonce :
- les plans (coupes exactes) ;
- les écrans de générique (grand fond uni) et les images noires/blanches, qu'il écarte ;
- les plus beaux plans (couleurs, contraste, netteté, ni trop sombres ni brûlés) ;
- une piste musicale continue sans dialogue ;
- les temps forts de la musique, pour caler les coupes dessus.

Réglé sur la capture du 18/11/2026 (ouverture GTA 6, 99 s) : il retrouve les 16 plans
choisis à la main, sans aucun générique.
"""
from __future__ import annotations

import difflib
import re
import subprocess
from dataclasses import dataclass

import numpy as np

# Seuils mesurés sur la capture de référence (voir PREFERENCES.md)
FLAT_CREDIT = 0.33   # part de l'image d'une seule couleur au-delà de laquelle c'est un générique
LUM_DARK = 0.10      # en dessous : image trop sombre
LUM_WHITE = 0.68     # au-dessus : image brûlée / flash blanc
CON_FADE = 0.07      # contraste sous lequel c'est un fondu ou un écran uni
EDGE = 0.12          # on évite les 0,12 s au bord de chaque plan (fondus)


@dataclass
class Shot:
    a: float
    b: float
    score: float = 0.0
    kind: str = "plan"   # plan | generique | noir | sombre | brule
    feats: dict | None = None

    @property
    def d(self):
        return self.b - self.a


def exact_cuts(path, thr=0.25):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-an", "-vf",
                        f"scale=160:-2,select='gt(scene\\,{thr})',metadata=print:file=-", "-f", "null", "-"],
                       capture_output=True, text=True)
    return [float(x) for x in re.findall(r"pts_time:([\d.]+)", r.stdout)]


def frame_features(path, duration, fps=4, w=128, h=72):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"fps={fps},scale={w}:{h}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.float32)
    out = []
    for i, f in enumerate(fr):
        q = (f // 8).astype(np.int32)
        key = q[..., 0] * 1024 + q[..., 1] * 32 + q[..., 2]
        flat = np.bincount(key.ravel()).max() / key.size
        lum = f.mean(-1) / 255
        rg = f[..., 0] - f[..., 1]
        yb = 0.5 * (f[..., 0] + f[..., 1]) - f[..., 2]
        col = (np.hypot(rg.std(), yb.std()) + 0.3 * np.hypot(rg.mean(), yb.mean())) / 255
        gy, gx = np.gradient(lum)
        out.append({"t": i / fps, "flat": float(flat), "lum": float(lum.mean()), "con": float(lum.std()),
                    "col": float(col), "sharp": float(np.hypot(gx, gy).mean())})
    return out


def frame_kind(f):
    if f["flat"] >= FLAT_CREDIT and f["lum"] >= 0.18:
        return "generique"
    if f["con"] < CON_FADE:
        return "noir"
    if f["lum"] < LUM_DARK:
        return "sombre"
    if f["lum"] > LUM_WHITE:
        return "brule"
    return "plan"


def find_shots(path, duration, speech=(), fps=4):
    """Plans propres : on coupe aux vrais changements de plan, puis, à l'intérieur,
    on ne garde que les suites d'images sans générique ni fondu (les génériques
    arrivent souvent en fondu, sans coupe franche)."""
    cuts = [c for c in exact_cuts(path) if 0.2 < c < duration - 0.2]
    bounds = [0.0] + cuts + [duration]
    feats = frame_features(path, duration, fps=fps)
    half = 0.5 / fps
    shots = []
    for a, b in zip(bounds, bounds[1:]):
        fr = [f for f in feats if a <= f["t"] < b]
        runs, cur = [], []
        for f in fr:
            if frame_kind(f) == "plan":
                cur.append(f)
            else:
                if cur:
                    runs.append((cur, f))
                cur = []
                shots.append(Shot(f["t"] - half, f["t"] + half, kind=frame_kind(f), feats=f))
        if cur:
            runs.append((cur, None))
        for run, stopper in runs:
            # marge plus large côté fondu (pas de vraie coupe) que côté coupe franche
            ra = a + EDGE if run[0]["t"] - a < 1.5 / fps else run[0]["t"] + 0.15
            rb = b - EDGE if stopper is None else run[-1]["t"] - 0.3
            if rb - ra < 0.6:
                continue
            med = {k: float(np.median([f[k] for f in run])) for k in ("flat", "lum", "con", "col", "sharp")}
            sp = sum(max(0.0, min(y, rb) - max(x, ra)) for x, y in speech) / (rb - ra)
            med["speech"] = round(sp, 2)
            shots.append(Shot(round(ra, 3), round(rb, 3), kind="plan", feats=med))
    shots.sort(key=lambda s: s.a)
    good = [s for s in shots if s.kind == "plan"]
    if good:
        def z(k):
            v = np.array([s.feats[k] for s in good])
            return (v - v.mean()) / (v.std() + 1e-6)
        zc, zn, zs = z("col"), z("con"), z("sharp")
        for i, s in enumerate(good):
            s.score = round(float(1.0 * zc[i] + 0.8 * zn[i] + 0.7 * zs[i]
                                  - (0.6 if s.feats["lum"] < 0.15 else 0)
                                  - 1.0 * s.feats["speech"]), 3)  # dialogue : moins « carte postale »
    return shots


def onsets(path, start, dur, sr=22050, hop=512):
    """Temps forts de la musique (en s, relatifs au début de la fenêtre)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(path),
                          "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32)
    if len(x) < 4096:
        return []
    n = 2048
    win = np.hanning(n)
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * win
    mag = np.log1p(np.abs(np.fft.rfft(frames, axis=1)))
    flux = np.maximum(0, np.diff(mag, axis=0)).sum(1)
    flux = (flux - flux.mean()) / (flux.std() + 1e-6)
    t = (np.arange(len(flux)) + 1) * hop / sr
    mind = int(0.25 * sr / hop)
    peaks = []
    for i in range(1, len(flux) - 1):
        if flux[i] > 0.8 and flux[i] >= flux[max(0, i - mind):i + mind + 1].max():
            peaks.append(float(t[i]))
    return peaks


def music_window(path, total, duration, speech, env, hop=0.1):
    """Début de la fenêtre musicale : le moins de voix possible, puis le plus d'énergie."""
    best, best_key = 0.0, None
    for m in np.arange(0.0, max(0.0, duration - total) + 0.01, 0.5):
        sp = sum(max(0.0, min(b, m + total) - max(a, m)) for a, b in speech)
        e = float(np.mean(env[int(m / hop):int((m + total) / hop)])) if len(env) else 0.0
        key = (round(sp, 1), -e)
        if best_key is None or key < best_key:
            best, best_key = float(m), key
    return best


def choose_shots(shots, target=28.0, max_len=2.4, last_len=4.5, min_len=0.8, check=None, log=None):
    good = [s for s in shots if s.kind == "plan" and s.d >= min_len]
    if not good:
        return []
    ranked = sorted(good, key=lambda s: -s.score)
    picked, total = [], 0.0
    hook = None
    for s in ranked:
        if total >= target:
            break
        if s.score < -1.7 and total >= target * 0.7:
            break  # le reste est trop terne
        if check:
            # on ne vérifie que la partie du plan qu'on va vraiment utiliser (+ marge)
            probe = Shot(s.a, min(s.b, s.a + last_len + 0.5), s.score, "plan", s.feats)
            c, why = check(probe)
            if why and log:
                log(f"  {s.a:.1f}-{s.b:.1f} s : {why} -> {'écarté' if c is None else f'coupé à {c.b:.1f} s'}")
            if c is None:
                continue
            if c.b < probe.b:
                s = c
        if s.d < min_len:
            continue
        if hook is None:
            hook = s
        picked.append(s)
        total += min(s.d, max_len)
    if not picked:
        return []
    body = sorted([s for s in picked if s is not hook], key=lambda s: s.a)
    # fin : le plus beau plan long (>= 3 s), pour finir fort pendant l'appel à commenter
    longs = [s for s in body if s.d >= 3.0 and s.feats.get("speech", 0) < 0.3]
    if longs:
        final = max(longs, key=lambda s: s.score)
        body = [s for s in body if s is not final] + [final]
    order = [hook] + body
    segs = []
    for i, s in enumerate(order):
        cap = last_len if i == len(order) - 1 else max_len
        a = s.a
        b = min(s.b, a + cap)
        segs.append([round(a, 3), round(b, 3), round(s.b, 3)])  # [début, fin, fin max possible]
    return segs


def snap_to_beats(segs, beats, tol=0.3, min_len=0.6):
    """Décale chaque coupe sur le temps fort le plus proche quand le plan le permet."""
    if not beats:
        return [(a, b) for a, b, _ in segs]
    out, t = [], 0.0
    for i, (a, b, bmax) in enumerate(segs):
        d = b - a
        cut = t + d
        if i < len(segs) - 1:
            near = [x for x in beats if abs(x - cut) <= tol and t + min_len <= x <= t + (bmax - a)]
            if near:
                cut = min(near, key=lambda x: abs(x - cut))
        d = cut - t
        out.append((round(a, 3), round(a + d, 3)))
        t += d
    return out


# --------------------------------------------------------------------------
# Textes incrustés (génériques par-dessus l'image, sous-titres du jeu) : OCR
# --------------------------------------------------------------------------
ROLES = re.compile(r"produc|direct|design|music|musique|score|operation|publish|technolog|executive|"
                   r"sound|quality|assurance|animation|written|presents|rockstar|casting|editor|"
                   r"supervis|engineer|art\b|lead\b|credits", re.I)
_ocr = None


def get_ocr():
    global _ocr
    if _ocr is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _ocr = RapidOCR()
        except Exception:
            _ocr = False
    return _ocr


def read_text(path, t, w=640, h=360):
    ocr = get_ocr()
    if not ocr:
        return []
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1",
                          "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         capture_output=True).stdout
    if len(raw) != w * h * 3:
        return []
    res, _ = ocr(np.frombuffer(raw, np.uint8).reshape(h, w, 3))
    out = []
    for box, txt, conf in res or []:
        ys = [p[1] for p in box]
        xs = [p[0] for p in box]
        out.append({"text": txt.strip(), "conf": float(conf), "yc": sum(ys) / 4 / h, "xc": sum(xs) / 4 / w})
    return out


def norm(x):
    return re.sub(r"[^a-z]", "", x.lower())


def credit_names(path, shots):
    """Textes lus sur les écrans de générique : on les reconnaîtra ensuite par-dessus les images."""
    names = set()
    spans = []
    for sh in shots:
        if sh.kind == "generique":
            if spans and sh.a - spans[-1][1] < 0.6:
                spans[-1][1] = sh.b
            else:
                spans.append([sh.a, sh.b])
    for a, b in spans:
        for t in np.arange(a + 0.2, b, 1.5):
            for it in read_text(path, float(t)):
                n = norm(it["text"])
                if len(n) >= 4 and it["conf"] > 0.6:
                    names.add(n)
    return names


def bad_text(items, names):
    for it in items:
        if it["conf"] < 0.6 or len(norm(it["text"])) < 3:
            continue
        # sous-titre du jeu : en bas, centré, phrase lisible (pas un bout de décor)
        if it["yc"] > 0.80 and 0.3 < it["xc"] < 0.7 and it["conf"] > 0.8 and len(norm(it["text"])) >= 6:
            return f"sous-titre « {it['text'][:40]} »"
        if ROLES.search(it["text"]):
            return f"générique « {it['text'][:40]} »"
        n = norm(it["text"])
        for m in names:
            if difflib.SequenceMatcher(None, n, m).ratio() > 0.8 or (len(n) >= 6 and n in m):
                return f"générique « {it['text'][:40]} »"
    return None


def clean_text(path, shot, names, step=0.5):
    """Raccourcit le plan avant l'apparition d'un texte incrusté. None si inutilisable."""
    if not get_ocr():
        return shot, None
    t = shot.a + 0.05
    while t < shot.b:
        why = bad_text(read_text(path, t), names)
        if why:
            end = t - 0.35
            if end - shot.a < 0.8:
                return None, why
            return Shot(shot.a, round(end, 3), shot.score, "plan", shot.feats), why
        t += step
    return shot, None
