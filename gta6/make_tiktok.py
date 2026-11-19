#!/usr/bin/env python3
"""make_tiktok.py : une capture GTA 6 -> un clip TikTok vertical prêt à valider.

Exemples :
  python make_tiktok.py capture.mp4
  python make_tiktok.py capture.mp4 --hook "CETTE SCÈNE DE GTA 6|M'A MIS UNE CLAQUE" \
      --title "GTA 6|JASON & LUCIA" --cta "JASON OU LUCIA ?|TON PERSO PRÉFÉRÉ EN COMMENTAIRE"
  python make_tiktok.py capture.mp4 --segments "30.2-33.0,3.6-21.8,33.0-39.6"

Un fichier `capture.json` posé à côté de la vidéo est lu automatiquement
(mêmes clés que les options : hook, title, cta, caption, tags, segments, exclude,
target, subs...). Voir exemples/jason_lucia.json.

Sorties (dossier <out>/<nom>/) :
  <nom>_TikTok.mp4        la vidéo 1080x1920 30 i/s, -14 LUFS
  <nom>_legende.txt       la légende proposée (à valider)
  <nom>_couverture.jpg    image de couverture (hook)
  <nom>_planche.jpg       planche contact pour vérifier d'un coup d'oeil
  <nom>_rapport.md        découpe choisie, scores, transcription, contrôles
  <nom>_montage.json      la découpe, réutilisable (--segments-file) pour corriger
  <nom>_sous-titres.srt   sous-titres (temps de la SOURCE) : corrigeables puis --subs
"""
from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
FONTS_DIR = HERE / "fonts"

# --------------------------------------------------------------------------
# Style (validé sur la vidéo 1, ajusté pour les zones sûres TikTok)
# Les tailles sont en « px d'em » comme dans drawtext ; converties pour libass.
# Positions = haut des majuscules, sur un canevas 1080x1920.
# Zones à éviter : 0-250 px (barre du haut), > 1490 px (légende, pseudo),
# et ~120 px à droite (boutons j'aime / commentaires).
# --------------------------------------------------------------------------
W, H = 1080, 1920
STYLE = {
    "pink": "FF4FA3",
    "yellow": "FFC94A",
    "white": "FFFFFF",
    "panel_y": 520,          # vidéo au premier plan (1080x778). V1 : 571
    "panel_h": 778,
    "focus_aspect": 1500 / 1080,
    "hook": [  # (texte, couleur, taille, y)
        ("white", 92, 300),
        ("pink", 104, 410),
    ],
    "title": [("pink", 110, 280), ("white", 76, 410)],
    "sub_y": 1335,
    "sub_size": 60,
    "sub_line_gap": 82,
    "cta": [("yellow", 96, 1330), ("white", 54, 1448)],
    "max_text_w": 900,       # largeur max d'une ligne (laisse la colonne de droite)
    "outline_big": 7,
    "outline_sub": 6,
}
ANTON = "Anton"
ARCHIVO = "Archivo Black"
FONT_FILES = {ANTON: "Anton-Regular.ttf", ARCHIVO: "ArchivoBlack-Regular.ttf"}


def log(*a):
    print("·", *a, flush=True)


def die(msg):
    print(f"ERREUR : {msg}", file=sys.stderr)
    sys.exit(1)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=kw.pop("text", True), **kw)
    if r.returncode != 0:
        err = r.stderr if isinstance(r.stderr, str) else r.stderr.decode("utf8", "replace")
        die(f"commande échouée : {' '.join(map(str, cmd))[:300]}\n{err[-2000:]}")
    return r


# --------------------------------------------------------------------------
# Vérification de l'installation
# --------------------------------------------------------------------------
def doctor(quiet=False):
    problems = []
    for b in ("ffmpeg", "ffprobe"):
        if not shutil.which(b):
            problems.append(f"{b} introuvable (Mac : brew install ffmpeg)")
    if not problems:
        filters = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True).stdout
        for f in ("ass", "loudnorm", "boxblur", "drawbox"):
            if not re.search(rf"\s{f}\s", filters):
                problems.append(f"ffmpeg sans le filtre « {f} » (installer un ffmpeg complet, ex. brew install ffmpeg)")
    for fam, fn in FONT_FILES.items():
        if not (FONTS_DIR / fn).exists():
            problems.append(f"police manquante : {FONTS_DIR / fn}")
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        problems.append("faster-whisper non installé (pip install -r requirements.txt) : sous-titres auto désactivés")
    try:
        import fontTools  # noqa: F401
    except ImportError:
        problems.append("fonttools non installé (pip install -r requirements.txt)")
    try:
        import rapidocr_onnxruntime  # noqa: F401
    except ImportError:
        problems.append("rapidocr non installé (pip install -r requirements.txt) : génériques incrustés non détectés en mode plans")
    if not quiet:
        if problems:
            for p in problems:
                print("✗", p)
        else:
            print("✓ ffmpeg, filtres, polices, Whisper : tout est prêt.")
    return problems


# --------------------------------------------------------------------------
# Mesure du texte (pour réduire automatiquement une ligne trop longue)
# --------------------------------------------------------------------------
_font_cache: dict = {}


def font_metrics(family):
    if family not in _font_cache:
        from fontTools.ttLib import TTFont

        t = TTFont(str(FONTS_DIR / FONT_FILES[family]))
        upm = t["head"].unitsPerEm
        os2 = t["OS/2"]
        cmap = t.getBestCmap()
        hmtx = t["hmtx"]
        cap = getattr(os2, "sCapHeight", 0) or int(upm * 0.7)
        _font_cache[family] = {
            "upm": upm,
            # libass met la police à l'échelle sur winAscent+winDescent
            "k": upm / (os2.usWinAscent + os2.usWinDescent),
            "top_gap": (os2.usWinAscent - cap) / upm,
            "adv": {cp: hmtx[g][0] / upm for cp, g in cmap.items()},
        }
    return _font_cache[family]


def text_width(text, family, em):
    m = font_metrics(family)
    return sum(m["adv"].get(ord(c), 0.55) for c in text) * em


def fit_em(text, family, em, max_w):
    w = text_width(text, family, em)
    return em if w <= max_w else max(24, em * max_w / w)


# --------------------------------------------------------------------------
# Analyse de la source
# --------------------------------------------------------------------------
def probe(path):
    r = run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)])
    d = json.loads(r.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), None)
    if not v:
        die("pas de piste vidéo")
    a = any(s["codec_type"] == "audio" for s in d["streams"])
    num, den = (v.get("avg_frame_rate") or "30/1").split("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 30.0
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    if abs(rot) in (90, 270):
        w, h = h, w
    return {"duration": float(d["format"]["duration"]), "w": w, "h": h, "fps": fps, "audio": a}


def audio_envelope(path, hop=0.1, has_audio=True, duration=0.0):
    """Niveau sonore (dB RMS) par tranche de `hop` secondes."""
    n = int(math.ceil(duration / hop)) + 1
    if not has_audio:
        return np.full(n, -90.0)
    sr = 8000
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", str(sr),
                        "-f", "s16le", "-"], capture_output=True)
    x = np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768.0
    step = int(sr * hop)
    env = np.full(n, -90.0)
    for i in range(min(n, len(x) // step + 1)):
        seg = x[i * step:(i + 1) * step]
        if len(seg):
            env[i] = 20 * math.log10(float(np.sqrt(np.mean(seg ** 2))) + 1e-6)
    return env


def motion_scores(path, fps=5):
    """Score de changement d'image (0-1) échantillonné `fps` fois par seconde."""
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-an", "-vf",
                        f"fps={fps},scale=320:-2,select='gte(scene\\,0)',metadata=print:file=-",
                        "-f", "null", "-"], capture_output=True, text=True)
    times, scores, t = [], [], None
    for line in r.stdout.splitlines():
        m = re.search(r"pts_time:([\d.]+)", line)
        if m:
            t = float(m.group(1))
            continue
        m = re.search(r"lavfi\.scene_score=([\d.]+)", line)
        if m and t is not None:
            times.append(t)
            scores.append(float(m.group(1)))
    return np.array(times), np.array(scores)


def shot_cuts(times, scores, thr=0.3, min_gap=0.6):
    cuts = []
    for t, s in zip(times, scores):
        if s >= thr and (not cuts or t - cuts[-1] >= min_gap):
            cuts.append(float(t))
    return cuts


def transcribe(path, model_name, lang, cache: Path):
    if cache.exists():
        log("transcription : cache", cache.name)
        return json.loads(cache.read_text())
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        log("faster-whisper absent : pas de sous-titres automatiques")
        return {"language": None, "segments": []}
    log(f"transcription Whisper ({model_name}) …")
    model = WhisperModel(model_name, device="auto", compute_type="int8")
    # décodage par ffmpeg (évite les soucis de version de PyAV)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000",
                          "-f", "f32le", "-"], capture_output=True).stdout
    audio = np.frombuffer(raw, np.float32).copy()
    segs, info = model.transcribe(audio, language=None if lang == "auto" else lang,
                                  word_timestamps=True, vad_filter=True,
                                  vad_parameters={"min_silence_duration_ms": 400},
                                  condition_on_previous_text=False)
    out = {"language": info.language, "segments": []}
    for s in segs:
        words = [{"s": round(w.start, 3), "e": round(w.end, 3), "w": w.word.strip(), "p": round(w.probability, 3)}
                 for w in (s.words or []) if w.word.strip()]
        if words:
            out["segments"].append({"s": round(s.start, 3), "e": round(s.end, 3), "text": s.text.strip(),
                                    "words": words, "nsp": round(s.no_speech_prob, 3)})
    cache.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    return out


# --------------------------------------------------------------------------
# Sous-titres SRT (temps de la source) <-> mots
# --------------------------------------------------------------------------
def srt_time(t):
    t = max(0.0, t)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)) % 1000:03d}"


def parse_srt(path: Path):
    """Lit un SRT et renvoie une liste de mots horodatés (répartis dans chaque bloc)."""
    txt = path.read_text(encoding="utf-8-sig")
    words = []
    for block in re.split(r"\n\s*\n", txt.strip()):
        lines = [l for l in block.strip().splitlines() if l.strip()]
        tl = next((l for l in lines if "-->" in l), None)
        if not tl:
            continue

        def ts(x):
            x = x.strip().replace(",", ".")
            h, m, s = x.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)

        a, b = (ts(p) for p in tl.split("-->"))
        body = " ".join(lines[lines.index(tl) + 1:])
        toks = body.split()
        if not toks:
            continue
        # répartit le temps selon la longueur des mots
        lens = np.array([len(w) + 2 for w in toks], float)
        edges = a + (b - a) * np.concatenate([[0], np.cumsum(lens) / lens.sum()])
        for i, w in enumerate(toks):
            words.append({"s": float(edges[i]), "e": float(edges[i + 1]), "w": w})
        words[-1]["eob"] = True  # fin de bloc = coupure de phrase
    return words


def write_srt(words, path: Path):
    chunks = chunk_words(words, max_chars=42, max_words=9)
    with path.open("w", encoding="utf-8") as f:
        for i, c in enumerate(chunks, 1):
            f.write(f"{i}\n{srt_time(c[0]['s'])} --> {srt_time(c[-1]['e'])}\n{' '.join(w['w'] for w in c)}\n\n")


def all_words(tr):
    ws = []
    for s in tr["segments"]:
        for w in s["words"]:
            w = dict(w)
            w["w"] = w["w"].replace("’", "'")
            if ws and (w["w"].startswith("'") or ws[-1]["w"].endswith("'")) and w["s"] - ws[-1]["e"] < 0.3:
                ws[-1]["w"] += w["w"]
                ws[-1]["e"] = w["e"]
                continue
            ws.append(w)
        if ws:
            ws[-1]["eob"] = True
    return ws


# --------------------------------------------------------------------------
# Choix des moments
# --------------------------------------------------------------------------
@dataclass
class Unit:
    a: float
    b: float
    speech: bool
    score: float = 0.0
    text: str = ""

    @property
    def d(self):
        return self.b - self.a


def zscore(x):
    x = np.asarray(x, float)
    sd = x.std()
    return (x - np.median(x)) / (sd if sd > 1e-6 else 1.0)


def parse_ranges(s):
    if not s:
        return []
    if isinstance(s, list):
        out = []
        for r in s:
            out += parse_ranges(r) if isinstance(r, str) else [(float(r[0]), float(r[1]))]
        return out
    out = []
    for part in re.split(r"[,;\s]+", s.strip()):
        if part:
            a, b = part.split("-")
            out.append((float(a), float(b)))
    return out


SPEEDS = {"x1.5": 1.5, "x2": 2.0, "x3": 3.0, "x4": 4.0, "slow": 0.5, "x0.5": 0.5}


def parse_segments(s):
    """« a-b,a-b:full,a-b:x2,a-b:full:slow » -> ([(a, b)], [effets]).
    full = plein écran vertical (gros plans) ; x1.5/x2/x3/x4 = accéléré ; slow = ralenti x0,5."""
    if not s:
        return [], []
    items = s if isinstance(s, list) else [x for x in re.split(r"[,;\s]+", s.strip()) if x]
    ranges, fx = [], []
    for it in items:
        if isinstance(it, (list, tuple)):
            ranges.append((float(it[0]), float(it[1])))
            fx.append(dict(it[2]) if len(it) > 2 and isinstance(it[2], dict) else {})
            continue
        parts = it.split(":")
        a, b = parts[0].split("-")
        f = {}
        for flag in parts[1:]:
            flag = flag.strip().lower()
            if flag == "full":
                f["full"] = True
            elif flag == "censor":
                f["censor"] = True
            elif flag in SPEEDS:
                f["speed"] = SPEEDS[flag]
            elif flag:
                die(f"effet inconnu « {flag} » dans « {it} » (full, censor, x1.5, x2, x3, x4, slow)")
        ranges.append((float(a), float(b)))
        fx.append(f)
    return ranges, fx


def seg_out_dur(a, b, f):
    return (b - a) / float((f or {}).get("speed", 1.0))


def skip_dark_start(src, a, b, max_skip=1.0, thr=28):
    """Première image de l'accroche : jamais noire ni en fondu. Renvoie le nouveau début."""
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{min(max_skip, b - a - 0.8):.3f}",
                        "-i", str(src), "-vf", "fps=10,scale=160:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
                        "-an", "-f", "null", "-"], capture_output=True, text=True)
    ys = [float(x) for x in re.findall(r"YAVG=([\d.]+)", r.stdout)]
    for i, y in enumerate(ys):
        if y >= thr:
            return round(a + i / 10, 3)
    return a


def censor_times(segs, fx, total):
    out, t = [], 0.0
    for (a, b), f in zip(segs, fx):
        d = seg_out_dur(a, b, f)
        if f.get("censor"):
            out.append((t, min(total, t + d), bool(f.get("full"))))
        t += d
    return out


def label_times(segs, fx, total):
    """(début, fin, ligne 1, ligne 2) en temps de sortie pour chaque plan étiqueté."""
    out, t = [], 0.0
    for (a, b), f in zip(segs, fx):
        d = seg_out_dur(a, b, f)
        if f.get("label"):
            l1, l2 = (f["label"].split("|") + [""])[:2]
            out.append((t, min(total, t + d), l1.strip(), l2.strip()))
        t += d
    return out


def retention_checks(cfg, segs, fx, cut_times, total, hook_t, rehook):
    """Contrôles de rétention, notés dans le rapport (✅ / ⚠️)."""
    out = []
    hook_words = sum(len(x.split()) for x in cfg["hook"] if x) if not cfg.get("meme") else 0
    out.append(("Texte à l'écran dès 0 s", bool(any(cfg["hook"]) or cfg.get("meme"))))
    if not cfg.get("meme"):
        out.append((f"Accroche courte ({hook_words} mots, 7 max)", 0 < hook_words <= 7))
    events = sorted([0.0] + list(cut_times) + ([rehook[1]] if rehook else []) + [total])
    gap = max((b - a for a, b in zip(events, events[1:])), default=total)
    out.append((f"Plus long passage sans coupe : {gap:.1f} s (3,5 s max)", gap <= 3.55))
    out.append((f"Durée {total:.1f} s (15-35 s)", 15 <= total <= 35))
    out.append(("Relance au milieu (--rehook)", bool(rehook)))
    out.append(("Au moins un gros plan plein écran", any(f.get("full") for f in fx)))
    out.append(("Question finale ou légende-question", bool(any(cfg["cta"]) or cfg.get("caption"))))
    return out


def overlaps(a, b, ranges):
    return any(a < rb and b > ra for ra, rb in ranges)


def build_units(dur, words_tr, cuts, exclude):
    units = []
    # 1) phrases parlées : jamais coupées au milieu
    for s in words_tr["segments"]:
        a, b = max(0.0, s["words"][0]["s"] - 0.15), min(dur, s["words"][-1]["e"] + 0.25)
        if b - a > 0.3:
            units.append(Unit(a, b, True, text=s["text"]))
    units.sort(key=lambda u: u.a)
    # fusionne les phrases qui se chevauchent
    merged = []
    for u in units:
        if merged and u.a <= merged[-1].b + 0.05:
            merged[-1].b = max(merged[-1].b, u.b)
            merged[-1].text += " " + u.text
        else:
            merged.append(u)
    # 2) trous sans voix : découpés aux changements de plan, morceaux de 1,5 à 4 s
    gaps, t = [], 0.0
    for u in merged:
        if u.a - t > 0.6:
            gaps.append((t, u.a))
        t = max(t, u.b)
    if dur - t > 0.6:
        gaps.append((t, dur))
    for ga, gb in gaps:
        pts = [ga] + [c for c in cuts if ga + 1.2 < c < gb - 1.2] + [gb]
        for a, b in zip(pts, pts[1:]):
            n = max(1, int(round((b - a) / 3.0)))
            for k in range(n):
                ua, ub = a + (b - a) * k / n, a + (b - a) * (k + 1) / n
                if ub - ua >= 0.8:
                    merged.append(Unit(ua, ub, False))
    merged.sort(key=lambda u: u.a)
    return [u for u in merged if not overlaps(u.a, u.b, exclude)]


def score_units(units, env, hop, mt, ms, cuts):
    loud = zscore(env)
    mot = zscore(ms) if len(ms) else np.zeros(1)
    env_db = env
    for u in units:
        i0, i1 = int(u.a / hop), max(int(u.a / hop) + 1, int(u.b / hop))
        L = loud[i0:i1]
        peak = float(np.percentile(L, 90)) if len(L) else 0.0
        mean = float(L.mean()) if len(L) else 0.0
        if len(mt):
            sel = (mt >= u.a) & (mt < u.b)
            mo = float(mot[sel].mean()) if sel.any() else 0.0
        else:
            mo = 0.0
        ncut = sum(1 for c in cuts if u.a <= c < u.b)
        silent = float(np.mean(env_db[i0:i1] < -45)) if i1 > i0 else 1.0
        s = 0.45 * mean + 0.35 * peak + 0.35 * mo + 0.15 * min(ncut, 3)
        s += 0.9 if u.speech else 0.0
        s -= 1.2 * silent if not u.speech else 0.0
        u.score = round(s, 3)
    return units


def phrase_windows(words, dur, exclude, lo=1.5, hi=4.5):
    """Fenêtres d'accroche calées sur des débuts/fins de groupes de mots (pauses, ponctuation)."""
    if not words:
        return []
    groups, cur = [], [words[0]]
    for w in words[1:]:
        if w["s"] - cur[-1]["e"] > 0.25 or cur[-1].get("eob") or re.search(r"[.?!,…]$", cur[-1]["w"]):
            groups.append(cur)
            cur = []
        cur.append(w)
    groups.append(cur)
    out = []
    for i in range(len(groups)):
        for j in range(i, len(groups)):
            a = max(0.0, groups[i][0]["s"] - 0.1)
            b = min(dur, groups[j][-1]["e"] + 0.2)
            if b - a > hi:
                break
            if b - a >= lo and not overlaps(a, b, exclude):
                out.append(Unit(a, b, True, text=" ".join(w["w"] for g in groups[i:j + 1] for w in g)))
    return out


def choose(units, target, hook_range=None, hook_cands=None):
    if not units:
        die("rien d'exploitable dans la vidéo")
    # Accroche : le moment le plus fort, court (1,5-5 s), joué en premier (cold open)
    if hook_range:
        hook = Unit(hook_range[0], hook_range[1], False, 99)
    else:
        cands = [u for u in units if 1.5 <= u.d <= 5.0] + (hook_cands or [])
        cands = cands or units
        hook = max(cands, key=lambda u: u.score + 0.08 * min(u.d, 3))
        if hook.d > 5.0:
            hook = Unit(hook.a, hook.a + 3.0, hook.speech, hook.score)
    rest = []
    for u in units:  # les moments qui contiennent l'accroche sont gardés autour d'elle
        if not (u.a < hook.b and u.b > hook.a):
            rest.append(u)
            continue
        for a, b in ((u.a, hook.a), (hook.b, u.b)):
            if b - a >= 1.0:
                rest.append(Unit(a, b, u.speech, u.score))
    budget = target - hook.d
    chosen = []
    for u in sorted(rest, key=lambda u: -u.score):
        if u.score < -0.6:
            break  # temps mort
        if sum(c.d for c in chosen) + u.d <= budget + 1.5:
            chosen.append(u)
    chosen.sort(key=lambda u: u.a)
    # bouche les petits trous (< 1,5 s) entre deux moments gardés : évite les sauts gênants
    filled = []
    for u in chosen:
        if filled and 0 < u.a - filled[-1].b <= 1.5 and not (u.a > hook.a and filled[-1].b < hook.b):
            filled[-1] = Unit(filled[-1].a, u.b, filled[-1].speech or u.speech, max(filled[-1].score, u.score))
        elif filled and u.a - filled[-1].b <= 0.0:
            filled[-1].b = max(filled[-1].b, u.b)
        else:
            filled.append(Unit(u.a, u.b, u.speech, u.score))
    # retire le hook des morceaux remplis s'il y a chevauchement
    final = []
    for u in filled:
        if u.a < hook.b and u.b > hook.a:
            if u.a < hook.a - 0.8:
                final.append(Unit(u.a, hook.a, u.speech, u.score))
            if u.b > hook.b + 0.8:
                final.append(Unit(hook.b, u.b, u.speech, u.score))
        else:
            final.append(u)
    return [(round(hook.a, 2), round(hook.b, 2))] + [(round(u.a, 2), round(u.b, 2)) for u in final]


def split_on_cuts(segs, cuts, every=3.5, fx=None):
    """Coupe les longs morceaux (sans rien retirer) en parts égales pour placer un zoom
    au moins toutes les ~3,5 s (temps de SORTIE : un ralenti dure plus longtemps).
    Chaque coupure est calée sur un vrai changement de plan s'il y en a un à ±0,6 s."""
    out = []
    for i, (a, b) in enumerate(segs):
        sp = float(((fx or [{}] * len(segs))[i] or {}).get("speed", 1.0))
        ev = every * sp
        n = max(1, math.ceil((b - a) / ev - 1e-6))
        bounds = [a]
        for k in range(1, n):
            x = a + (b - a) * k / n
            near = [c for c in cuts if abs(c - x) <= 0.6 and bounds[-1] + 0.8 < c < b - 0.8]
            bounds.append(min(near, key=lambda c: abs(c - x)) if near else x)
        bounds.append(b)
        for j, (p0, p1) in enumerate(zip(bounds, bounds[1:])):
            out.append({"a": round(p0, 3), "b": round(p1, 3), "hard": j == 0, "seg": i})
    return out


# --------------------------------------------------------------------------
# Rendu
# --------------------------------------------------------------------------
GRADE = "eq=contrast=1.06:saturation=1.16:gamma=0.98"


def atempo_chain(sp):
    """atempo n'accepte que 0,5-2 : on enchaîne pour x3, x4."""
    out, r = [], sp
    while r > 2.0:
        out.append("atempo=2.0")
        r /= 2.0
    while r < 0.5:
        out.append("atempo=0.5")
        r /= 0.5
    out.append(f"atempo={r:.4f}")
    return ",".join(out)


def render_pieces(src, info, pieces, work: Path, fps_out, punch, drift, crop_shift, crop_bottom=0, crop_top=0,
                  grade=True):
    """Chaque plan est rendu au format final 1080x1920 : soit en bande (image 16:9 sur fond
    flouté), soit en plein écran vertical (« full »), avec zoom, vitesse et étalonnage."""
    py, ph = STYLE["panel_y"], STYLE["panel_h"]
    ct = int(crop_top)
    ch = info["h"] - int(crop_bottom) - ct  # sans sous-titres (bas) ni boussole (haut) du jeu
    ch -= ch % 2
    shift = max(-1.0, min(1.0, crop_shift))
    cw = min(info["w"], int(round(ch * STYLE["focus_aspect"] / 2)) * 2)
    cx = max(0, min(info["w"] - cw, int((info["w"] - cw) / 2 * (1 + shift))))
    fw = min(info["w"], int(round(ch * 9 / 16 / 2)) * 2)  # plein écran 9:16
    fxp = max(0, min(info["w"] - fw, int((info["w"] - fw) / 2 * (1 + shift))))
    g = f",{GRADE}" if grade else ""
    lst = work / "list.txt"
    names, cut_times, bounds, t_out = [], [], [], 0.0
    for i, p in enumerate(pieces):
        f = p.get("fx") or {}
        sp = float(f.get("speed", 1.0))
        d_src = p["b"] - p["a"]
        d = d_src / sp
        if i > 0:
            bounds.append(t_out)  # toute relance visuelle (coupe ou zoom interne)
            if p["hard"]:
                cut_times.append(t_out)
        z0 = punch if p["hard"] else punch * 0.6  # coupe interne au plan : plus doux
        zexpr = f"(1+{z0}*max(0\\,1-t/0.22)+{drift}*t/{max(d, 0.1):.3f})"
        speed = "" if sp == 1.0 else f"setpts=(PTS-STARTPTS)/{sp},"
        # censure : image pixelisée (on devine la pièce sans rien montrer)
        pix = (lambda w_, h_: f",scale=trunc({w_}/40/2)*2:-2:flags=area,scale={w_}:{h_}:flags=neighbor,gblur=sigma=3") \
            if f.get("censor") else (lambda w_, h_: "")
        rate = f"framerate=fps={fps_out}" if sp < 1.0 else f"fps={fps_out}"
        if f.get("full"):
            graph = (f"[0:v]{speed}{rate},crop={fw}:{ch}:{fxp}:{ct},scale={W}:{H},setsar=1,"
                     f"scale=w='trunc({W}*{zexpr}/2)*2':h=-2:eval=frame,crop={W}:{H}{g}{pix(W, H)},format=yuv420p[v]")
        else:
            graph = (f"[0:v]{speed}{rate},crop={cw}:{ch}:{cx}:{ct},scale={W}:{ph},setsar=1,"
                     f"scale=w='trunc({W}*{zexpr}/2)*2':h=-2:eval=frame,crop={W}:{ph}{g}{pix(W, ph)},split[p1][p2];"
                     f"[p1]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:2,"
                     f"eq=brightness=-0.18:saturation=1.2[bg];[bg][p2]overlay=0:{py},format=yuv420p[v]")
        fo = max(0.0, d - 0.05)
        af = ("" if sp == 1.0 else atempo_chain(sp) + ",") + \
            f"afade=t=in:d=0.03,afade=t=out:st={fo:.3f}:d=0.05,aresample=48000"
        out = work / f"p{i:03d}.mp4"
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{p['a']:.3f}", "-i", str(src)]
        if info["audio"]:
            cmd += ["-filter_complex", graph + f";[0:a]{af}[a]", "-map", "[v]", "-map", "[a]"]
        else:
            cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-filter_complex", graph,
                    "-map", "[v]", "-map", "1:a"]
        cmd += ["-t", f"{d:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", str(out)]
        run(cmd)
        names.append(out)
        t_out += probe(out)["duration"]
    lst.write_text("".join(f"file '{n.name}'\n" for n in names))
    joined = work / "joined.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)])
    return joined, (cw, ch, cx), cut_times, bounds


# --------------------------------------------------------------------------
# Sound design : sons originaux synthétisés (aucun droit d'auteur)
# --------------------------------------------------------------------------
SR = 48000


def _whoosh(dur=0.42, rng=None):
    rng = rng or np.random.default_rng(7)
    n = int(SR * dur)
    x = rng.standard_normal(n)
    t = np.linspace(0, 1, n)
    # filtre passe-bas qui s'ouvre puis se referme (souffle qui passe)
    cut = 0.03 + 0.35 * np.sin(np.pi * t) ** 2
    y = np.zeros(n)
    acc = 0.0
    for i in range(n):
        acc += cut[i] * (x[i] - acc)
        y[i] = acc
    env = np.sin(np.pi * t) ** 2
    y = y * env
    y /= np.abs(y).max() + 1e-9
    pan = np.linspace(-0.8, 0.8, n)  # de gauche à droite
    return np.stack([y * (1 - pan) / 2 * 2 ** 0.5, y * (1 + pan) / 2 * 2 ** 0.5], 1)


def _impact(dur=0.55):
    n = int(SR * dur)
    t = np.arange(n) / SR
    f = 70 * np.exp(-t * 3) + 38  # coup sourd qui descend
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7)
    rng = np.random.default_rng(3)
    click = rng.standard_normal(n) * np.exp(-t * 90) * 0.5
    y = body + click
    y /= np.abs(y).max() + 1e-9
    return np.stack([y, y], 1)


def add_sfx(joined: Path, work: Path, total, cut_times, hook_ticks=(), rehook_t=None):
    """Impact sur l'accroche, souffle à chaque coupe franche, mixés sous le son du jeu."""
    import wave

    meas = measure_loudness(joined)
    try:
        lvl = float(meas["input_i"]) if meas else -24.0
    except (TypeError, ValueError):
        lvl = -24.0
    if not math.isfinite(lvl) or lvl < -60:
        lvl = -30.0
    peak = min(0.55, 10 ** ((lvl + 12) / 20))  # environ 12 dB au-dessus du niveau moyen du jeu
    n = int(SR * (total + 1))
    mix = np.zeros((n, 2))

    def put(clip, t, gain):
        i = max(0, int(t * SR))
        j = min(n, i + len(clip))
        if j > i:
            mix[i:j] += clip[: j - i] * gain

    put(_impact(), 0.02, peak * 1.1)
    tick = _impact(0.18)
    for t in list(hook_ticks)[1:]:
        put(tick, t, peak * 0.35)  # petit coup sur chaque mot de l'accroche
    if rehook_t is not None:
        put(_whoosh(), rehook_t - 0.24, peak * 0.7)
        put(_impact(), rehook_t, peak * 0.9)
    w = _whoosh()
    for k, c in enumerate(cut_times):
        put(w if k % 2 == 0 else w[:, ::-1], c - 0.24, peak * 0.55)  # sens alterné
    mix = np.clip(mix, -0.98, 0.98)
    wav = work / "sfx.wav"
    with wave.open(str(wav), "wb") as fh:
        fh.setnchannels(2)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes((mix * 32767).astype("<i2").tobytes())
    out = work / "joined_sfx.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(joined), "-i", str(wav), "-filter_complex",
         "[0:a][1:a]amix=inputs=2:normalize=0:duration=first[a]", "-map", "0:v", "-map", "[a]",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", str(out)])
    log(f"sons : impact sur l'accroche + {len(cut_times)} souffles aux coupes")
    return out


def ass_color(hex6, alpha="00"):
    r, g, b = hex6[0:2], hex6[2:4], hex6[4:6]
    return f"&H{alpha}{b}{g}{r}".upper()


def ass_time(t):
    t = max(0.0, t)
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def ass_escape(s):
    return s.replace("\\", "/").replace("{", "(").replace("}", ")")


def ass_line(text, family, color, em, y, t0, t1, outline, pop=True, layer=1, fade_in=0, extra=""):
    em = fit_em(text, family, em, STYLE["max_text_w"])
    m = font_metrics(family)
    size = em / m["k"]
    ytop = y - m["top_gap"] * em  # y = haut des majuscules
    anim = r"\fscx118\fscy118\t(0,140,\fscx100\fscy100)" if pop else ""
    fad = rf"\fad({fade_in},0)" if fade_in else ""
    tags = (rf"{{\an8\pos(540,{ytop:.0f})\fn{family}\fs{size:.1f}\c{ass_color(color)}"
            rf"\3c&H000000&\bord{outline}\shad3\4c&H80000000&{anim}{fad}{extra}}}")
    return f"Dialogue: {layer},{ass_time(t0)},{ass_time(t1)},Default,,0,0,0,,{tags}{ass_escape(text)}"


def chunk_words(words, max_chars=24, max_words=5, max_gap=0.6):
    chunks, cur = [], []
    for w in words:
        if cur:
            txt = " ".join(x["w"] for x in cur + [w])
            if (len(txt) > max_chars or len(cur) >= max_words or w["s"] - cur[-1]["e"] > max_gap
                    or cur[-1].get("eob") or re.search(r"[.?!…]$", cur[-1]["w"])):
                chunks.append(cur)
                cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    return chunks


def split_lines(ws):
    """Coupe un groupe de mots en 1 ou 2 lignes équilibrées."""
    txt = " ".join(w["w"] for w in ws)
    if len(txt) <= 16 or len(ws) < 2:
        return [ws]
    best, bi = 1e9, 1
    for i in range(1, len(ws)):
        l1 = len(" ".join(w["w"] for w in ws[:i]))
        l2 = len(" ".join(w["w"] for w in ws[i:]))
        if max(l1, l2) < best:
            best, bi = max(l1, l2), i
    return [ws[:bi], ws[bi:]]


def clean_word(w):
    w = w.strip().upper()
    w = re.sub(r"\.{2,}", "…", w)
    w = w.rstrip(",;:") if len(w) > 1 else w
    w = re.sub(r"\.$", "", w)
    return w


def map_words(words, segs, fx=None):
    """Mots en temps source -> temps de sortie (en suivant la découpe et la vitesse)."""
    out, off = [], 0.0
    fx = fx or [{} for _ in segs]
    for (a, b), f in zip(segs, fx):
        sp = float((f or {}).get("speed", 1.0))
        for w in words:
            mid = (w["s"] + w["e"]) / 2
            if a - 0.02 <= mid <= b + 0.02:
                nw = dict(w)
                nw["s"] = off + max(0.0, w["s"] - a) / sp
                nw["e"] = off + min(b - a, w["e"] - a) / sp
                nw["w"] = clean_word(w["w"])
                if nw["w"]:
                    out.append(nw)
        if out:
            out[-1]["eob"] = True  # jamais un sous-titre à cheval sur une coupe
        off += (b - a) / sp
    return out


def sub_events(words, total, cta_t, mode):
    ev = []
    sy, em, gap = STYLE["sub_y"], STYLE["sub_size"], STYLE["sub_line_gap"]
    fam = ARCHIVO
    m = font_metrics(fam)
    chunks = chunk_words([w for w in words if w["s"] < cta_t])
    for ci, ch in enumerate(chunks):
        t0 = ch[0]["s"]
        nxt = chunks[ci + 1][0]["s"] if ci + 1 < len(chunks) else cta_t
        t1 = min(nxt, ch[-1]["e"] + 0.5, cta_t)
        if t1 - t0 < 0.25:
            t1 = min(t0 + 0.25, cta_t)
        lines = split_lines(ch)
        if mode == "classic":
            for li, lw in enumerate(lines):
                txt = " ".join(w["w"] for w in lw)
                col = STYLE["yellow"] if (li == len(lines) - 1 and len(lines) > 1) else STYLE["white"]
                ev.append(ass_line(txt, fam, col, em, sy + li * gap, t0, t1, STYLE["outline_sub"], pop=True))
            continue
        # karaoké : le mot prononcé passe en jaune et grossit légèrement
        flat = [w for lw in lines for w in lw]
        sizes = [fit_em(" ".join(w["w"] for w in lw), fam, em, STYLE["max_text_w"]) for lw in lines]
        for wi, w in enumerate(flat):
            ws = t0 if wi == 0 else w["s"]
            we = flat[wi + 1]["s"] if wi + 1 < len(flat) else t1
            if we <= ws:
                continue
            for li, lw in enumerate(lines):
                parts = []
                for x in lw:
                    if x is w:
                        parts.append(rf"{{\c{ass_color(STYLE['yellow'])}\fscx112\fscy112}}"
                                     rf"{ass_escape(x['w'])}{{\c{ass_color(STYLE['white'])}\fscx100\fscy100}}")
                    else:
                        parts.append(ass_escape(x["w"]))
                size = sizes[li] / m["k"]
                ytop = sy + li * gap - m["top_gap"] * sizes[li]
                pop = r"\fscx90\fscy90\t(0,90,\fscx100\fscy100)" if wi == 0 else ""
                tags = (rf"{{\an8\pos(540,{ytop:.0f})\fn{fam}\fs{size:.1f}\c{ass_color(STYLE['white'])}"
                        rf"\3c&H000000&\bord{STYLE['outline_sub']}\shad3\4c&H80000000&{pop}}}")
                ev.append(f"Dialogue: 2,{ass_time(ws)},{ass_time(we)},Default,,0,0,0,,{tags}{' '.join(parts)}")
    return ev


HOOK_STEP = 0.17  # écart entre deux mots de l'accroche


def hook_word_times(hook):
    """Instant d'apparition de chaque mot de l'accroche (ligne 1 puis ligne 2)."""
    n = sum(len(x.split()) for x in hook if x)
    return [round(0.02 + i * HOOK_STEP, 3) for i in range(n)]


def hook_events(hook, hook_t):
    """Accroche révélée mot par mot : chaque mot claque (grossit puis se pose).
    Les mots pas encore dits sont transparents : la mise en page ne bouge pas."""
    ev, k = [], 0
    times = hook_word_times(hook)
    for (txt, (col, em0, y)) in zip(hook, STYLE["hook"]):
        if not txt:
            continue
        words = txt.split()
        em = fit_em(txt, ANTON, em0, STYLE["max_text_w"])
        m = font_metrics(ANTON)
        size = em / m["k"]
        ytop = y - m["top_gap"] * em
        base = (rf"{{\an8\pos(540,{ytop:.0f})\fn{ANTON}\fs{size:.1f}\c{ass_color(STYLE[col])}"
                rf"\3c&H000000&\bord{STYLE['outline_big']}\shad3\4c&H80000000&}}")
        for j in range(len(words)):
            t0 = times[k + j]
            t1 = times[k + j + 1] if k + j + 1 < len(times) else hook_t
            if t1 <= t0:
                continue
            parts = []
            for w_i, w in enumerate(words):
                if w_i < j:
                    parts.append(ass_escape(w))
                elif w_i == j:
                    parts.append(r"{\fscx135\fscy135\t(0,110,\fscx100\fscy100)}" + ass_escape(w) + r"{\fscx100\fscy100}")
                else:
                    parts.append(r"{\alpha&HFF&}" + ass_escape(w) + r"{\alpha&H00&}")
            ev.append(f"Dialogue: 2,{ass_time(t0)},{ass_time(t1)},Default,,0,0,0,,{base}{' '.join(parts)}")
        # ligne complète jusqu'à la fin de l'accroche
        last = times[k + len(words) - 1]
        if last < hook_t and k + len(words) < len(times):
            ev.append(f"Dialogue: 2,{ass_time(times[k + len(words)])},{ass_time(hook_t)},Default,,0,0,0,,"
                      f"{base}{ass_escape(txt)}")
        k += len(words)
    return ev


def build_ass(path: Path, total, hook_t, hook, title, cta, cta_t, words, sub_mode, cta_top=False, meme=None,
              rehook=None, labels=None, censors=None):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{ANTON},80,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,6,0,8,20,20,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if meme and any(meme):
        # format mème : bandeau blanc en haut, texte noir, du début à la fin (remplace accroche et titre)
        ev.append(f"Dialogue: 0,{ass_time(0)},{ass_time(total)},Default,,0,0,0,,"
                  r"{\an7\pos(0,0)\p1\bord0\shad0\c&HFFFFFF&}m 0 225 l 1080 225 l 1080 505 l 0 505{\p0}")
        lines = [x for x in meme if x][:3]
        ys = {1: [345], 2: [300, 395], 3: [262, 347, 432]}[len(lines)]
        for txt, y in zip(lines, ys):
            ev.append(ass_line(txt, ARCHIVO, "000000", 66, y, 0, total, 0, pop=False, layer=1,
                               extra=r"\shad0"))
        hook, title = ["", ""], ["", ""]
    # Accroche : premier mot dès l'image 0, puis mot par mot
    if any(hook):
        ev += hook_events(hook, hook_t)
    # Relance au milieu : un texte choc là où les gens décrochent
    if rehook and rehook[0]:
        txt, t0 = rehook
        y = STYLE["panel_y"] + STYLE["panel_h"] // 2 - 55
        ev.append(ass_line(txt, ANTON, STYLE["yellow"], 112, y, t0, min(total, t0 + 1.7), 8, layer=4,
                           extra=r"\fscx150\fscy150\t(0,140,\fscx100\fscy100)\fad(0,180)"))
    # Tampon « CENSURÉ » sur les plans pixelisés
    for t0, t1, full in censors or []:
        y = (H // 2 if full else STYLE["panel_y"] + STYLE["panel_h"] // 2) - 70
        ev.append(ass_line("CENSURÉ", ANTON, "FF2D2D", 150, y, t0 + 0.05, t1, 10, layer=5,
                           extra=r"\frz12\3c&HFFFFFF&\fscx210\fscy210\t(0,130,\fscx100\fscy100)"))
    # Étiquettes par plan (liste numérotée) : elles prennent la place du titre
    if labels:
        title = ["", ""]
        end_top = cta_t if cta_top else total
        for t0, t1, l1, l2 in labels:
            t0, t1 = max(t0, hook_t), min(t1, end_top)
            if t1 - t0 < 0.3:
                continue
            for txt, (col, em, y) in zip((l1, l2), STYLE["title"]):
                if txt:
                    ev.append(ass_line(txt, ANTON, STYLE[col], em, y, t0, t1, STYLE["outline_big"], layer=2))
    # Titre fixe ensuite
    for txt, (col, em, y) in zip(title, STYLE["title"]):
        if txt:
            ev.append(ass_line(txt, ANTON, STYLE[col], em, y, hook_t, cta_t if cta_top else total,
                               STYLE["outline_big"], pop=False, fade_in=120))
    # Appel à commenter : en bas (remplace les sous-titres) ou en haut (remplace le titre,
    # les sous-titres continuent : utile quand la chute est dite à la fin)
    pos = [(c, e, y) for (c, e, _), y in zip(STYLE["cta"], (STYLE["title"][0][2], STYLE["title"][1][2] - 10))] \
        if cta_top else STYLE["cta"]
    for i, (txt, (col, em, y)) in enumerate(zip(cta, pos)):
        if txt:
            ev.append(ass_line(txt, ANTON, STYLE[col], em, y, cta_t + 0.15 * i, total, STYLE["outline_big"], layer=3))
    ev += sub_events(words, total, total if cta_top else cta_t, sub_mode)
    path.write_text(head + "\n".join(ev) + "\n", encoding="utf-8")


def measure_loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-af",
                        "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    return json.loads(m.group(0)) if m else None


def compose(joined, ass: Path, out: Path, total, ending, progress, work: Path, bar_y=None):
    py, ph = STYLE["panel_y"], STYLE["panel_h"]
    shutil.copytree(FONTS_DIR, work / "fonts", dirs_exist_ok=True)
    meas = measure_loudness(joined)
    if meas and meas.get("input_i") not in (None, "-inf"):
        ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
              f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:"
              f"offset={meas['target_offset']}:linear=true")
    else:
        ln = "anull"
    v_end = ""
    if ending == "fade":
        v_end = f",fade=t=out:st={max(0, total - 0.4):.3f}:d=0.4"
        a_end = f"afade=t=out:st={max(0, total - 0.6):.3f}:d=0.6"
    else:  # boucle : pas d'écran noir, la fin s'enchaîne sur le début
        a_end = f"afade=t=out:st={max(0, total - 0.12):.3f}:d=0.12"
    bar = ""
    if progress:
        by = py + ph if bar_y is None else bar_y
        bar = (f",drawbox=x=0:y={by}:w=iw:h=8:color=black@0.55:t=fill,"
               f"drawbox=x=0:y={by}:w='max(2\\,iw*t/{total:.3f})':h=8:color=0x{STYLE['pink']}:t=fill")
    loop = ""
    if ending == "loop" and total > 3:
        # boucle invisible : la fin se fond dans la première image, la vidéo repart sans coupure
        loop = (f"split[m][f0];[f0]trim=end_frame=1,loop=loop=-1:size=1,setpts=N/30/TB,format=yuva420p,"
                f"fade=t=in:st={total - 0.35:.3f}:d=0.35:alpha=1[ff];[m][ff]overlay=shortest=1,")
    graph = (f"[0:v]{loop}null{bar},ass=filename={ass.name}:fontsdir=fonts{v_end},format=yuv420p[v];"
             f"[0:a]{ln},aresample=48000,alimiter=limit=0.80:level=false,{a_end}[au]")
    (work / "compose.txt").write_text(graph)
    run(["ffmpeg", "-v", "error", "-y", "-i", joined.name, "-filter_complex_script", "compose.txt",
         "-map", "[v]", "-map", "[au]", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
         "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-movflags", "+faststart", str(out.resolve())], cwd=str(work))


def contact_sheet(video: Path, out: Path, total, n=8):
    times = [min(total - 0.05, total * (i + 0.5) / n) for i in range(n)]
    sel = "+".join(f"eq(n\\,{int(t * 30)})" for t in times)
    run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf",
         f"select='{sel}',scale=270:480,tile={n // 2}x2:padding=6:color=white", "-frames:v", "1",
         "-q:v", "3", str(out)])


def fix_loudness(path: Path, target=-14.0, tol=0.6):
    """Seconde passe si le volume final s'écarte de la cible (ex. limiteur trop sollicité)."""
    m = measure_loudness(path)
    try:
        i = float(m["input_i"])
    except (TypeError, ValueError, KeyError):
        return
    if not math.isfinite(i) or abs(i - target) <= tol:
        return
    tmp = path.with_suffix(".tmp.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-c:v", "copy", "-af",
         f"volume={target - i:.2f}dB,alimiter=limit=0.79:level=false", "-c:a", "aac", "-b:a", "192k",
         "-ar", "48000", "-movflags", "+faststart", str(tmp)])
    tmp.replace(path)
    log(f"volume corrigé : {i:.1f} -> {target:.0f} LUFS")


def check_output(path: Path):
    p = probe(path)
    m = measure_loudness(path)
    return {"w": p["w"], "h": p["h"], "fps": round(p["fps"], 2), "duration": round(p["duration"], 2),
            "audio": p["audio"], "lufs": m and m.get("input_i"), "true_peak": m and m.get("input_tp")}


# --------------------------------------------------------------------------
# Légende
# --------------------------------------------------------------------------
def sentence_case(s):
    s = s.strip().lower()
    s = re.sub(r"\bgta\b", "GTA", s)
    for n in ("jason", "lucia", "vice city", "leonida", "rockstar"):
        s = re.sub(rf"\b{n}\b", n.title(), s)
    return s[:1].upper() + s[1:]


def make_caption(cfg):
    if cfg.get("caption"):
        return cfg["caption"].strip() + "\n"
    hook = " ".join(x for x in cfg["hook"] if x)
    q = cfg["cta"][0] if cfg["cta"] and cfg["cta"][0] else "Tu en penses quoi ?"
    line = f"{sentence_case(hook)} 🎬 {sentence_case(q)} 👇"
    tags = cfg.get("tags") or ["#gta6", "#gtavi", "#vicecity", "#rockstargames", "#gamingfr"]
    if isinstance(tags, str):
        tags = tags.split()
    tags = [t if t.startswith("#") else "#" + t for t in tags]
    return f"{line}\n{' '.join(tags)}\n"


# --------------------------------------------------------------------------
def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9_-]+", "_", s).strip("_") or "clip"


def split2(s):
    if s is None:
        return ["", ""]
    if isinstance(s, list):
        return (s + ["", ""])[:2]
    p = s.split("|")
    return (p + ["", ""])[:2]


PLANS_DEFAULTS = {
    "hook": "C'EST PAS UN FILM.|C'EST GTA 6.",
    "title": "GTA 6|VICE CITY",
    "cta": "TON PLAN PRÉFÉRÉ ?|DIS-LE EN COMMENTAIRE",
    "target": 28.0,
    "punch": 0.05,
    "hook_dur": 3.0,
    "cta_dur": 4.5,
}


def json_keys(side: Path):
    try:
        return set(json.loads(side.read_text(encoding="utf-8"))) if side.exists() else set()
    except Exception:
        return set()


DEFAULTS = {
    "hook": "CETTE SCÈNE DE GTA 6|M'A MIS UNE CLAQUE",
    "title": "GTA 6|",
    "cta": "ET TOI ?|DIS-MOI EN COMMENTAIRE",
    "target": 30.0,
    "cta_dur": 5.0,
    "lang": "auto",
    "model": "small",
    "subs_mode": "karaoke",
    "ending": "loop",
    "punch": 0.07,
    "drift": 0.04,
    "fps": 30,
    "crop_shift": 0.0,
    "progress": True,
}


def main(argv=None):
    ap = argparse.ArgumentParser(description="Capture GTA 6 -> clip TikTok vertical.")
    ap.add_argument("video", nargs="?")
    ap.add_argument("--hook", help="accroche 0-3 s, 2 lignes séparées par |")
    ap.add_argument("--title", help="titre fixe en haut, 2 lignes séparées par |")
    ap.add_argument("--cta", help="appel à commenter (fin), 2 lignes séparées par |")
    ap.add_argument("--caption", help="légende TikTok complète (sinon générée)")
    ap.add_argument("--tags", help="hashtags, ex. '#gta6 #gta #jasonetlucia'")
    ap.add_argument("--target", type=float, help="durée visée en s (défaut 30)")
    ap.add_argument("--segments", help="découpe manuelle 'a-b,a-b' (le 1er = accroche)")
    ap.add_argument("--segments-file", help="montage.json d'un rendu précédent")
    ap.add_argument("--hook-at", help="forcer l'accroche 'a-b' (temps source)")
    ap.add_argument("--exclude", help="plages à ne jamais garder 'a-b,a-b' (générique...)")
    ap.add_argument("--subs", help="fichier .srt (temps source) à la place de Whisper")
    ap.add_argument("--no-subs", action="store_true")
    ap.add_argument("--subs-mode", choices=["karaoke", "classic"])
    ap.add_argument("--lang", help="langue de la voix : fr, en, auto (défaut auto)")
    ap.add_argument("--model", help="modèle Whisper : small (défaut), medium, large-v3")
    ap.add_argument("--ending", choices=["loop", "fade"], help="loop = pas d'écran noir (défaut)")
    ap.add_argument("--cta-dur", type=float)
    ap.add_argument("--punch", type=float, help="zoom à chaque coupe (0.07 = +7 %%, 0 = off)")
    ap.add_argument("--crop-shift", type=float, help="décale le cadrage : -1 gauche ... 1 droite")
    ap.add_argument("--no-progress", action="store_true", help="sans barre de progression")
    ap.add_argument("--panel-h", type=int, help="hauteur de l'image au premier plan (778 défaut, ~860 pour les beaux plans)")
    ap.add_argument("--crop-top", type=int, help="px retirés en haut de la source (boussole / HUD du jeu)")
    ap.add_argument("--cta-top", action="store_true", help="question finale en haut : les sous-titres restent visibles")
    ap.add_argument("--labels", help="étiquette par plan « BADGE|TEXTE;BADGE|TEXTE;… » (liste numérotée, vide = rien)")
    ap.add_argument("--voix", help="narration « temps | texte » par ligne : voix off française (Piper)")
    ap.add_argument("--voix-db", type=float, help="volume de la voix off (dB, défaut 0)")
    ap.add_argument("--rehook", help="texte de relance au milieu (ex. « ATTENDS LA SUITE… »)")
    ap.add_argument("--rehook-at", type=float, help="position de la relance (0-1, défaut 0.45)")
    ap.add_argument("--meme", help="format mème : bandeau blanc en haut, texte noir « LIGNE 1|LIGNE 2 »")
    ap.add_argument("--no-sfx", action="store_true", help="sans les sons de transition (souffles, impact)")
    ap.add_argument("--no-grade", action="store_true", help="sans l'étalonnage (contraste, saturation)")
    ap.add_argument("--mute", action="store_true", help="sans le son du jeu (ajouter un son TikTok à la publication)")
    ap.add_argument("--music-from", type=float, help="musique continue prise à ce temps de la source (montage de plans)")
    ap.add_argument("--hook-dur", type=float, help="durée d'affichage de l'accroche (défaut : 1er morceau)")
    ap.add_argument("--crop-bottom", type=int, help="px retirés en bas de la source (sous-titres incrustés du jeu)")
    ap.add_argument("--out", default=None, help="dossier de sortie (défaut ./sorties)")
    ap.add_argument("--analyse-only", action="store_true", help="propose la découpe sans rendre")
    ap.add_argument("--mode", choices=["auto", "plans"],
                    help="auto = moments forts + dialogues (défaut) ; plans = montage des plus beaux plans en musique")
    ap.add_argument("--doctor", action="store_true", help="vérifie l'installation")
    args = ap.parse_args(argv)

    if args.doctor:
        sys.exit(1 if doctor() else 0)
    if not args.video:
        ap.error("indiquer une vidéo")
    if doctor(quiet=True):
        doctor()
        if any("ffmpeg" in p or "police" in p or "fonttools" in p for p in doctor(quiet=True)):
            die("installation incomplète : lancer ./install.sh")

    src = Path(args.video).expanduser().resolve()
    if not src.exists():
        die(f"fichier introuvable : {src}")

    cfg = dict(DEFAULTS)
    side = src.with_suffix(".json")
    if side.exists():
        cfg.update(json.loads(side.read_text(encoding="utf-8")))
        log("réglages lus dans", side.name)
    for k in ("hook", "title", "cta", "caption", "tags", "target", "segments", "hook_at", "exclude", "subs",
              "subs_mode", "lang", "model", "ending", "cta_dur", "punch", "crop_shift", "crop_bottom", "music_from", "hook_dur"):
        v = getattr(args, k)
        if v is not None:
            cfg[k] = v
    if args.mode:
        cfg["mode"] = args.mode
    plans_mode = cfg.get("mode") == "plans"
    if plans_mode:
        # réglages validés sur le clip « beaux plans » du 18/11/2026 (voir PREFERENCES.md)
        for k, v in PLANS_DEFAULTS.items():
            if getattr(args, k, None) is None and k not in json_keys(side):
                cfg[k] = v
        cfg["no_subs"] = True
        if not args.panel_h:
            args.panel_h = 860
    if args.mute:
        cfg["mute"] = True
    if args.cta_top:
        cfg["cta_top"] = True
    if args.meme:
        cfg["meme"] = args.meme
    if args.rehook:
        cfg["rehook"] = args.rehook
    if args.voix:
        cfg["voix"] = args.voix
    if args.voix_db is not None:
        cfg["voix_db"] = args.voix_db
    if args.labels:
        cfg["labels"] = args.labels
    if args.rehook_at is not None:
        cfg["rehook_at"] = args.rehook_at
    if args.no_sfx:
        cfg["sfx"] = False
    if args.no_grade:
        cfg["grade"] = False
    if args.crop_top is not None:
        cfg["crop_top"] = args.crop_top
    if args.no_progress:
        cfg["progress"] = False
    if args.no_subs:
        cfg["no_subs"] = True
    if args.panel_h:
        STYLE["panel_h"] = int(args.panel_h) // 2 * 2
        STYLE["focus_aspect"] = W / STYLE["panel_h"]
        STYLE["panel_y"] = min(STYLE["panel_y"], 1360 - STYLE["panel_h"])
    cfg["hook"], cfg["title"], cfg["cta"] = split2(cfg["hook"]), split2(cfg["title"]), split2(cfg["cta"])

    name = slug(cfg.get("name") or Path(args.video).stem)  # nom du lien, pas de sa cible
    out_root = Path(args.out or cfg.get("out") or Path.cwd() / "sorties").expanduser().resolve()
    out_dir = out_root / name
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = out_root / ".cache"
    cache_dir.mkdir(exist_ok=True)

    info = probe(src)
    log(f"source : {src.name}  {info['w']}x{info['h']}  {info['fps']:.0f} i/s  {info['duration']:.1f} s")

    # ---- transcription
    words_src, tr = [], {"language": None, "segments": []}
    if cfg.get("subs"):
        words_src = parse_srt(Path(cfg["subs"]).expanduser())
        log(f"sous-titres lus : {cfg['subs']} ({len(words_src)} mots)")
    if (not cfg.get("no_subs") or plans_mode) and info["audio"]:
        key = f"{slug(src.stem)}_{int(src.stat().st_size)}_{cfg['model']}_{cfg['lang']}.json"
        tr = transcribe(src, cfg["model"], cfg["lang"], cache_dir / key)
        if not words_src:
            words_src = all_words(tr)
        log(f"voix : {len(tr['segments'])} phrases, langue détectée {tr['language']}")

    # ---- découpe
    exclude = parse_ranges(cfg.get("exclude"))
    seg_list, seg_fx = None, None
    if args.segments_file:
        mj = json.loads(Path(args.segments_file).read_text())
        seg_list = [tuple(x[:2]) for x in mj["segments"]]
        seg_fx = mj.get("fx") or [{} for _ in seg_list]
    elif cfg.get("segments"):
        seg_list, seg_fx = parse_segments(cfg["segments"])
    log("analyse du son et des plans …")
    env = audio_envelope(src, 0.1, info["audio"], info["duration"])
    mt, ms = motion_scores(src)
    cuts = shot_cuts(mt, ms)
    units = []
    shots_report = []
    if seg_list is None and plans_mode:
        import plans
        speech = [(sg["s"], sg["e"]) for sg in tr["segments"] if sg.get("nsp", 0) < 0.6]
        log("recherche des plus beaux plans (génériques et textes incrustés écartés) …")
        shots = [sh for sh in plans.find_shots(src, info["duration"], speech)
                 if not overlaps(sh.a, sh.b, exclude)]
        names = plans.credit_names(src, shots)
        if not plans.get_ocr():
            log("⚠️ OCR absent (pip install rapidocr-onnxruntime) : textes incrustés non vérifiés")
        picked = plans.choose_shots(shots, float(cfg["target"]),
                                    check=lambda sh: plans.clean_text(src, sh, names), log=log)
        if not picked:
            die("aucun plan exploitable trouvé")
        est = sum(b - a for a, b, _ in picked)
        if cfg.get("music_from") is None:
            cfg["music_from"] = plans.music_window(src, est, info["duration"], speech, env)
        beats = plans.onsets(src, float(cfg["music_from"]), est + 1.0) if info["audio"] else []
        seg_list = plans.snap_to_beats(picked, beats)
        log(f"{sum(1 for sh in shots if sh.kind == 'plan')} plans propres, {len(seg_list)} gardés, "
            f"{len(beats)} temps forts, musique à {float(cfg['music_from']):.1f} s")
        for sh in shots:
            shots_report.append(f"- `{sh.a:.2f}-{sh.b:.2f}` {sh.kind}"
                                + (f" score {sh.score:+.2f}" if sh.kind == "plan" else ""))
    if seg_list is None:
        units = score_units(build_units(info["duration"], tr, cuts, exclude), env, 0.1, mt, ms, cuts)
        hcands = score_units(phrase_windows(all_words(tr), info["duration"], exclude), env, 0.1, mt, ms, cuts)
        hook_range = parse_ranges(cfg["hook_at"])[0] if cfg.get("hook_at") else None
        seg_list = choose(units, float(cfg["target"]), hook_range, hcands)
    if seg_fx is None or len(seg_fx) != len(seg_list):
        seg_fx = [{} for _ in seg_list]
    if cfg.get("labels"):
        for f, lab in zip(seg_fx, str(cfg["labels"]).split(";")):
            if lab.strip():
                f["label"] = lab.strip()
    kept = [((max(0.0, a), min(info["duration"], b)), f) for (a, b), f in zip(seg_list, seg_fx) if b - a > 0.2]
    seg_list, seg_fx = [k[0] for k in kept], [k[1] for k in kept]
    trimmed = skip_dark_start(src, seg_list[0][0], seg_list[0][1])
    if trimmed > seg_list[0][0]:
        log(f"accroche : {trimmed - seg_list[0][0]:.2f} s d'image sombre retirées au début")
        seg_list[0] = (trimmed, seg_list[0][1])
    total = sum(seg_out_dur(a, b, f) for (a, b), f in zip(seg_list, seg_fx))
    hook_t = float(cfg["hook_dur"]) if cfg.get("hook_dur") else seg_out_dur(*seg_list[0], seg_fx[0])
    log(f"découpe : {len(seg_list)} morceaux, {total:.1f} s (accroche {hook_t:.1f} s)")
    (out_dir / f"{name}_montage.json").write_text(json.dumps(
        {"source": str(src), "segments": [[round(a, 2), round(b, 2)] for a, b in seg_list], "fx": seg_fx},
        indent=1, ensure_ascii=False))

    if words_src:
        write_srt(words_src, out_dir / f"{name}_sous-titres.srt")

    report = [f"# {name}", "", f"Source : `{src}`  ({info['w']}x{info['h']}, {info['fps']:.0f} i/s, "
              f"{info['duration']:.1f} s)", "", "## Découpe (temps source)", ""]
    for i, (a, b) in enumerate(seg_list):
        txt = " ".join(w["w"] for w in words_src if a <= (w["s"] + w["e"]) / 2 <= b)
        fxs = " ".join(k if k in ("full", "censor") else f"x{v:g}" for k, v in seg_fx[i].items()
                       if k in ("full", "speed", "censor"))
        report.append(f"{i + 1}. `{a:.2f}-{b:.2f}` ({b - a:.1f} s){' [' + fxs + ']' if fxs else ''}"
                      f"{' **ACCROCHE**' if i == 0 else ''}"
                      f"{' — « ' + txt[:120] + ' »' if txt else ''}")
    if units:
        report += ["", "## Tous les moments détectés (score)", ""]
        for u in units:
            report.append(f"- `{u.a:.1f}-{u.b:.1f}` score {u.score:+.2f} {'voix' if u.speech else ''}"
                          f"{' — ' + u.text[:80] if u.text else ''}")
    if shots_report:
        report += ["", "## Plans analysés", ""] + shots_report
    report += ["", f"Changements de plan détectés : {len(cuts)}", ""]

    if args.analyse_only:
        (out_dir / f"{name}_rapport.md").write_text("\n".join(report), encoding="utf-8")
        print("\n".join(report[:len(seg_list) + 6]))
        return out_dir

    # ---- rendu
    with tempfile.TemporaryDirectory(prefix="tiktok_") as tmp:
        work = Path(tmp)
        pieces = split_on_cuts(seg_list, cuts, fx=seg_fx)
        for pc in pieces:
            pc["fx"] = seg_fx[pc["seg"]]
        log(f"rendu de {len(pieces)} plans (zoom à chaque coupe"
            f"{', plein écran' if any(f.get('full') for f in seg_fx) else ''}"
            f"{', vitesse' if any(f.get('speed') for f in seg_fx) else ''}) …")
        joined, crop, cut_times, bounds = render_pieces(src, info, pieces, work, cfg["fps"], cfg["punch"], cfg["drift"],
                                                float(cfg["crop_shift"]), int(cfg.get("crop_bottom", 0)),
                                                int(cfg.get("crop_top", 0)), cfg.get("grade", True))
        total = probe(joined)["duration"]
        if cfg.get("mute"):
            # pas de son du jeu : à publier avec un son TikTok ajouté dans l'appli
            jm = work / "joined_mute.mp4"
            run(["ffmpeg", "-v", "error", "-y", "-i", str(joined), "-f", "lavfi", "-t", f"{total:.3f}",
                 "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                 "-c:a", "aac", "-b:a", "128k", str(jm)])
            joined = jm
        elif cfg.get("music_from") is not None and info["audio"]:
            # montage de plans : une seule piste continue au lieu de bouts de musique recollés
            mf = float(cfg["music_from"])
            log(f"musique continue depuis {mf:.1f} s de la source")
            jm = work / "joined_music.mp4"
            run(["ffmpeg", "-v", "error", "-y", "-i", str(joined), "-ss", f"{mf:.3f}", "-t", f"{total:.3f}",
                 "-i", str(src), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "afade=t=in:d=0.05",
                 "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", str(jm)])
            joined = jm
        rehook = None
        if cfg.get("rehook"):
            t_r = total * float(cfg.get("rehook_at", 0.45))
            near = [c for c in cut_times if abs(c - t_r) <= 1.5 and hook_t + 1 < c < total - float(cfg["cta_dur"]) - 1]
            t_r = min(near, key=lambda c: abs(c - t_r)) if near else t_r  # sur une coupe si possible
            rehook = (cfg["rehook"], round(t_r, 2))
        ticks = [] if cfg.get("meme") else hook_word_times(cfg["hook"])
        if cfg.get("sfx", True) and not cfg.get("mute"):
            joined = add_sfx(joined, work, total, cut_times, ticks, rehook[1] if rehook else None)
        voice_words, voice_win = [], []
        if cfg.get("voix"):
            import voix as vx
            log("voix off (Piper, voix française) …")
            vwav, voice_words, voice_win = vx.build_track(Path(cfg["voix"]).expanduser().resolve(), work, total,
                                                          float(cfg.get("voix_db", 0)))
            jv = work / "joined_voix.mp4"
            # le son du jeu baisse automatiquement quand la voix parle (ducking)
            run(["ffmpeg", "-v", "error", "-y", "-i", str(joined), "-i", str(vwav), "-filter_complex",
                 "[1:a]asplit=2[sc][vo];[0:a][sc]sidechaincompress=threshold=0.015:ratio=12:attack=15:release=400[duck];"
                 "[duck][vo]amix=inputs=2:normalize=0:duration=first:weights='0.75 1.0'[a]",
                 "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", str(jv)])
            joined = jv
            log(f"voix : {len(voice_win)} répliques, {len(voice_words)} mots")
        cta_t = max(hook_t + 1.0, total - float(cfg["cta_dur"]))
        words_out = [] if cfg.get("no_subs") else map_words(words_src, seg_list, seg_fx)
        if voice_words:
            # sous-titres : la voix off prime ; les répliques du jeu restent hors de ses passages
            keep = [w for w in words_out if not any(a - 0.2 < (w["s"] + w["e"]) / 2 < b + 0.2 for a, b in voice_win)]
            vw = [dict(w, w=clean_word(w["w"])) for w in voice_words]
            words_out = sorted(keep + [w for w in vw if w["w"]], key=lambda w: w["s"])
        ass = work / "overlay.ass"
        if not any(cfg["cta"]):
            cta_t = total  # pas de question finale : les sous-titres vont jusqu'au bout
        build_ass(ass, total, hook_t, cfg["hook"], cfg["title"], cfg["cta"], cta_t, words_out, cfg["subs_mode"],
                  bool(cfg.get("cta_top")), cfg["meme"].split("|") if cfg.get("meme") else None, rehook,
                  label_times(seg_list, seg_fx, total), censor_times(seg_list, seg_fx, total))
        shutil.copy(ass, out_dir / f"{name}_textes.ass")
        out_mp4 = out_dir / f"{name}_TikTok.mp4"
        log("composition finale (fond, textes, sous-titres, son -14 LUFS) …")
        # tout en plein écran : la barre de progression descend tout en bas
        compose(joined, ass, out_mp4, total, cfg["ending"], cfg["progress"], work,
                H - 10 if all(f.get("full") for f in seg_fx) else None)
        retention = retention_checks(cfg, seg_list, seg_fx, bounds, total, hook_t, rehook)

    fix_loudness(out_mp4)
    contact_sheet(out_mp4, out_dir / f"{name}_planche.jpg", total)
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{min(hook_t * 0.6, total - 0.1):.2f}", "-i", str(out_mp4),
         "-frames:v", "1", "-q:v", "2", str(out_dir / f"{name}_couverture.jpg")])
    cap = make_caption(cfg)
    (out_dir / f"{name}_legende.txt").write_text(cap, encoding="utf-8")

    chk = check_output(out_mp4)
    ok = (chk["w"], chk["h"]) == (1080, 1920) and chk["audio"]
    report += ["## Rétention", ""] + [f"- {'✅' if ok_ else '⚠️'} {lbl}" for lbl, ok_ in retention] + [""]
    report += ["## Contrôles", "",
               f"- format : {chk['w']}x{chk['h']}, {chk['fps']} i/s, {chk['duration']} s, audio {'oui' if chk['audio'] else 'NON'}",
               f"- son : {chk['lufs']} LUFS (cible -14), crête {chk['true_peak']} dBTP",
               f"- cadrage source : {crop[0]}x{crop[1]} à x={crop[2]}",
               f"- sous-titres : {len(words_out)} mots ({cfg['subs_mode']}), langue {tr['language']}",
               "" if tr["language"] in (None, "fr") or cfg.get("subs") else
               f"- ⚠️ la voix est en « {tr['language']} » : traduire `{name}_sous-titres.srt` puis relancer avec --subs",
               "", "## Légende proposée", "", "```", cap.strip(), "```", "",
               "## Transcription", "", " ".join(s["text"] for s in tr["segments"]) or "(aucune voix)", ""]
    (out_dir / f"{name}_rapport.md").write_text("\n".join(report), encoding="utf-8")
    log(f"{'✓' if ok else '✗'} {out_mp4}  ({chk['duration']} s, {chk['lufs']} LUFS)")
    return out_dir


if __name__ == "__main__":
    main()
