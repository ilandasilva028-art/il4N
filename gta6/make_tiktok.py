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
from dataclasses import dataclass, field
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


def split_on_cuts(segs, cuts, every=3.5):
    """Coupe les longs morceaux (sans rien retirer) pour placer un « punch-in »
    au moins toutes les ~3,5 s : de préférence sur un vrai changement de plan."""
    out = []
    for i, (a, b) in enumerate(segs):
        pieces, t = [], a
        while b - t > every * 1.6:
            win = [c for c in cuts if t + every * 0.7 <= c <= t + every * 1.4 and c < b - 1.2]
            nxt = win[0] if win else t + every
            pieces.append((t, nxt))
            t = nxt
        pieces.append((t, b))
        for j, p in enumerate(pieces):
            out.append({"a": round(p[0], 3), "b": round(p[1], 3), "hard": j == 0, "seg": i})
    return out


# --------------------------------------------------------------------------
# Rendu
# --------------------------------------------------------------------------
def render_pieces(src, info, pieces, work: Path, fps_out, punch, drift, crop_shift, crop_bottom=0):
    pw, ph = W, STYLE["panel_h"]
    ch = info["h"] - int(crop_bottom)  # sans le bas : sous-titres incrustés du jeu
    cw = min(info["w"], int(round(ch * STYLE["focus_aspect"] / 2)) * 2)
    cx = int((info["w"] - cw) / 2 * (1 + max(-1.0, min(1.0, crop_shift))))
    cx = max(0, min(info["w"] - cw, cx))
    lst = work / "list.txt"
    names = []
    for i, p in enumerate(pieces):
        d = p["b"] - p["a"]
        z0 = punch if p["hard"] else punch * 0.6  # coupe interne au plan : plus doux
        # zoom : punch-in rapide au début du morceau + légère poussée continue
        zexpr = f"(1+{z0}*max(0\\,1-t/0.22)+{drift}*t/{max(d, 0.1):.3f})"
        vf = (f"fps={fps_out},crop={cw}:{ch}:{cx}:0,scale={pw}:{ph},setsar=1,"
              f"scale=w='trunc({pw}*{zexpr}/2)*2':h=-2:eval=frame,crop={pw}:{ph}")
        fo = max(0.0, d - 0.05)
        af = f"afade=t=in:d=0.03,afade=t=out:st={fo:.3f}:d=0.05,aresample=48000"
        out = work / f"p{i:03d}.mp4"
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{p['a']:.3f}", "-i", str(src), "-t", f"{d:.3f}",
               "-vf", vf]
        if info["audio"]:
            cmd += ["-af", af]
        else:
            cmd += ["-f", "lavfi", "-t", f"{d:.3f}", "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v", "-map", "1:a"]
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", str(out)]
        run(cmd)
        names.append(out)
    lst.write_text("".join(f"file '{n.name}'\n" for n in names))
    joined = work / "joined.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)])
    return joined, (cw, ch, cx)


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


def map_words(words, segs):
    """Mots en temps source -> temps de sortie (en suivant la découpe)."""
    out, off = [], 0.0
    for a, b in segs:
        for w in words:
            mid = (w["s"] + w["e"]) / 2
            if a - 0.02 <= mid <= b + 0.02:
                nw = dict(w)
                nw["s"] = off + max(0.0, w["s"] - a)
                nw["e"] = off + min(b - a, w["e"] - a)
                nw["w"] = clean_word(w["w"])
                if nw["w"]:
                    out.append(nw)
        if out:
            out[-1]["eob"] = True  # jamais un sous-titre à cheval sur une coupe
        off += b - a
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


def build_ass(path: Path, total, hook_t, hook, title, cta, cta_t, words, sub_mode):
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
    # Accroche : visible dès l'image 0, 2e ligne qui claque juste après
    for i, (txt, (col, em, y)) in enumerate(zip(hook, STYLE["hook"])):
        if txt:
            ev.append(ass_line(txt, ANTON, STYLE[col], em, y, 0 if i == 0 else 0.12, hook_t, STYLE["outline_big"]))
    # Titre fixe ensuite
    for txt, (col, em, y) in zip(title, STYLE["title"]):
        if txt:
            ev.append(ass_line(txt, ANTON, STYLE[col], em, y, hook_t, total, STYLE["outline_big"], pop=False,
                               fade_in=120))
    # Appel à commenter
    for i, (txt, (col, em, y)) in enumerate(zip(cta, STYLE["cta"])):
        if txt:
            ev.append(ass_line(txt, ANTON, STYLE[col], em, y, cta_t + 0.15 * i, total, STYLE["outline_big"], layer=3))
    ev += sub_events(words, total, cta_t, sub_mode)
    path.write_text(head + "\n".join(ev) + "\n", encoding="utf-8")


def measure_loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-af",
                        "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    return json.loads(m.group(0)) if m else None


def compose(joined, ass: Path, out: Path, total, ending, progress, work: Path):
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
        bar = (f",drawbox=x=0:y={py + ph}:w=iw:h=8:color=black@0.55:t=fill,"
               f"drawbox=x=0:y={py + ph}:w='max(2\\,iw*t/{total:.3f})':h=8:color=0x{STYLE['pink']}:t=fill")
    graph = (f"[0:v]split[a][b];"
             f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:2,"
             f"eq=brightness=-0.18:saturation=1.2[bg];"
             f"[bg][b]overlay=0:{py}{bar},ass=filename={ass.name}:fontsdir=fonts{v_end},format=yuv420p[v];"
             f"[0:a]{ln},aresample=48000,{a_end}[au]")
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
    seg_list = None
    if args.segments_file:
        seg_list = [tuple(x) for x in json.loads(Path(args.segments_file).read_text())["segments"]]
    elif cfg.get("segments"):
        seg_list = parse_ranges(cfg["segments"])
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
    seg_list = [(max(0.0, a), min(info["duration"], b)) for a, b in seg_list if b - a > 0.2]
    total = sum(b - a for a, b in seg_list)
    hook_t = float(cfg["hook_dur"]) if cfg.get("hook_dur") else seg_list[0][1] - seg_list[0][0]
    log(f"découpe : {len(seg_list)} morceaux, {total:.1f} s (accroche {hook_t:.1f} s)")
    (out_dir / f"{name}_montage.json").write_text(json.dumps(
        {"source": str(src), "segments": [[round(a, 2), round(b, 2)] for a, b in seg_list]}, indent=1))

    if words_src:
        write_srt(words_src, out_dir / f"{name}_sous-titres.srt")

    report = [f"# {name}", "", f"Source : `{src}`  ({info['w']}x{info['h']}, {info['fps']:.0f} i/s, "
              f"{info['duration']:.1f} s)", "", "## Découpe (temps source)", ""]
    for i, (a, b) in enumerate(seg_list):
        txt = " ".join(w["w"] for w in words_src if a <= (w["s"] + w["e"]) / 2 <= b)
        report.append(f"{i + 1}. `{a:.2f}-{b:.2f}` ({b - a:.1f} s){' **ACCROCHE**' if i == 0 else ''}"
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
        pieces = split_on_cuts(seg_list, cuts)
        log(f"rendu de {len(pieces)} plans (punch-in à chaque coupe) …")
        joined, crop = render_pieces(src, info, pieces, work, cfg["fps"], cfg["punch"], cfg["drift"],
                                     float(cfg["crop_shift"]), int(cfg.get("crop_bottom", 0)))
        total = probe(joined)["duration"]
        if cfg.get("music_from") is not None and info["audio"]:
            # montage de plans : une seule piste continue au lieu de bouts de musique recollés
            mf = float(cfg["music_from"])
            log(f"musique continue depuis {mf:.1f} s de la source")
            jm = work / "joined_music.mp4"
            run(["ffmpeg", "-v", "error", "-y", "-i", str(joined), "-ss", f"{mf:.3f}", "-t", f"{total:.3f}",
                 "-i", str(src), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "afade=t=in:d=0.05",
                 "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", str(jm)])
            joined = jm
        cta_t = max(hook_t + 1.0, total - float(cfg["cta_dur"]))
        words_out = [] if cfg.get("no_subs") else map_words(words_src, seg_list)
        ass = work / "overlay.ass"
        build_ass(ass, total, hook_t, cfg["hook"], cfg["title"], cfg["cta"], cta_t, words_out, cfg["subs_mode"])
        shutil.copy(ass, out_dir / f"{name}_textes.ass")
        out_mp4 = out_dir / f"{name}_TikTok.mp4"
        log("composition finale (fond, textes, sous-titres, son -14 LUFS) …")
        compose(joined, ass, out_mp4, total, cfg["ending"], cfg["progress"], work)

    contact_sheet(out_mp4, out_dir / f"{name}_planche.jpg", total)
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{min(hook_t * 0.6, total - 0.1):.2f}", "-i", str(out_mp4),
         "-frames:v", "1", "-q:v", "2", str(out_dir / f"{name}_couverture.jpg")])
    cap = make_caption(cfg)
    (out_dir / f"{name}_legende.txt").write_text(cap, encoding="utf-8")

    chk = check_output(out_mp4)
    ok = (chk["w"], chk["h"]) == (1080, 1920) and chk["audio"]
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
