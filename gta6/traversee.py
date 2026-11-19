#!/usr/bin/env python3
"""traversee.py (v2) : « Combien de temps pour traverser la carte de GTA 6 ? »
avec les VRAIS temps chronométrés par Ilan (jamais de chiffre inventé).

Plan JSON :
{
  "nom": "traversee_leonida",
  "carte": "carte.png",                        # capture d'écran de la carte du jeu
  "points": [[612, 640], [598, 420], …],       # facultatif : le trajet, en pixels de carte.png
  "hook": "COMBIEN DE TEMPS POUR|TRAVERSER GTA 6 ?",
  "trajets": [                                  # du plus lent au plus rapide (le suspense monte)
    {"mode": "À PIED", "minutes": 0, "couleur": "FF4FA3", "clip": "pied.mp4", "a": 10, "b": 40,
     "crop_top": 0, "crop_bottom": 0},          # crop : interface du jeu à masquer
    …
  ],
  "cta": "T'AURAIS PARIÉ COMBIEN ?|DIS-LE EN COMMENTAIRE",
  "test": false                                 # true = bandeau « TEST » (chiffres pas réels)
}

Rendu : carte animée (le trajet se dessine, avec halo), trajets en plein écran vertical
(accéléré avec flou de mouvement, étalonnage, vignettage), transitions animées, compteur
avec halo + barre de progression + flash à l'arrivée, classement en barres animées.
Son du jeu coupé (accéléré, il serait criard) : bruitages synthétisés. Ajouter un son TikTok.

  python traversee.py plan.json --out sorties
"""
import argparse
import json
import math
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import make_tiktok as mt  # noqa: E402

W, H, FPS = 1080, 1920, 30
HOOK_D, SECT_D, END_D, XF = 3.4, 5.2, 6.0, 0.35
TRANSITIONS = ["zoomin", "slideup", "smoothleft", "circleopen", "slidedown", "smoothright"]
LOOK = "eq=contrast=1.10:saturation=1.22:gamma=0.97,vignette=angle=PI/4.6,unsharp=5:5:0.5"


# --------------------------------------------------------------------------
def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def fmt_temps(m):
    m = int(round(m))
    return f"{m // 60} H {m % 60:02d}" if m >= 60 else f"{m} MIN"


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def gradient_png(path: Path):
    """Assombrit le haut et le bas : les textes restent lisibles sur n'importe quelle image."""
    a = np.zeros((H, W), np.float32)
    y = np.arange(H, dtype=np.float32)[:, None]
    a += np.clip(1 - y / 700, 0, 1) ** 1.6 * 0.78
    a += np.clip((y - 1150) / 770, 0, 1) ** 1.4 * 0.85
    img = np.zeros((H, W, 4), np.uint8)
    img[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(path)


# --------------------------------------------------------------------------
# Carte animée : rendue image par image avec Pillow
# --------------------------------------------------------------------------
def render_map(carte: Path, out: Path, dur, points, color, z0, z1, draw_from, draw_to, pulse=False):
    src = Image.open(carte).convert("RGB")
    mw, mh = src.size
    s0 = max(W / mw, H / mh)
    pts = np.array(points, float) if points else None
    if pts is not None and len(pts) > 1:
        seg = np.hypot(*np.diff(pts, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        cx, cy = pts[:, 0].mean(), pts[:, 1].mean()  # zoom centré sur le trajet
    else:
        cum, cx, cy = None, mw / 2, mh / 2
    rgb = hex_rgb(color)
    n = int(round(dur * FPS))
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-vf", f"{LOOK},format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
           str(out)]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    for k in range(n):
        t = k / FPS
        z = z0 + (z1 - z0) * ease(t / dur)
        s = s0 * z
        # le centre du trajet glisse vers le centre de l'écran pendant le zoom
        fx = mw / 2 + (cx - mw / 2) * min(1, (z - 1) / 0.25) if z > 1 else mw / 2
        fy = mh / 2 + (cy - mh / 2) * min(1, (z - 1) / 0.25) if z > 1 else mh / 2
        ox, oy = W / 2 - fx * s, H / 2 - fy * s
        frame = src.resize((int(mw * s) + 2, int(mh * s) + 2), Image.BILINEAR)
        canvas = Image.new("RGB", (W, H))
        canvas.paste(frame, (int(ox), int(oy)))
        if cum is not None:
            f = ease((t - draw_from) / max(0.01, draw_to - draw_from))
            if f > 0:
                L = f * cum[-1]
                idx = int(np.searchsorted(cum, L))
                vis = [tuple(pp) for pp in pts[:idx]]
                if idx < len(pts):
                    a, b = pts[idx - 1], pts[idx]
                    r = (L - cum[idx - 1]) / max(1e-6, cum[idx] - cum[idx - 1])
                    vis.append(tuple(a + (b - a) * r))
                xy = [(x * s + ox, y * s + oy) for x, y in vis]
                glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                gd = ImageDraw.Draw(glow)
                if len(xy) > 1:
                    gd.line(xy, fill=rgb + (190,), width=34, joint="curve")
                glow = glow.filter(ImageFilter.GaussianBlur(14))
                canvas.paste(glow, (0, 0), glow)
                d = ImageDraw.Draw(canvas)
                if len(xy) > 1:
                    d.line(xy, fill=rgb, width=13, joint="curve")
                    d.line(xy, fill=(255, 255, 255), width=4, joint="curve")
                # départ, tête du trajet (point lumineux), arrivée
                sx, sy = xy[0]
                d.ellipse((sx - 16, sy - 16, sx + 16, sy + 16), outline=(255, 255, 255), width=6)
                hx, hy = xy[-1]
                rr = 14 + (6 * math.sin(t * 10) if pulse else 0)
                d.ellipse((hx - rr, hy - rr, hx + rr, hy + rr), fill=(255, 255, 255))
                d.ellipse((hx - rr + 5, hy - rr + 5, hx + rr - 5, hy + rr - 5), fill=rgb)
        p.stdin.write(canvas.tobytes())
    p.stdin.close()
    if p.wait() != 0:
        mt.die("rendu de la carte échoué : " + p.stderr.read().decode()[-500:])


# --------------------------------------------------------------------------
def render_clip(clip: Path, a, b, out: Path, dur, crop_top=0, crop_bottom=0):
    """Trajet en plein écran vertical, accéléré, flou de mouvement, léger zoom continu."""
    speed = max(1.0, (b - a) / dur)
    info = mt.probe(clip)
    ch = info["h"] - int(crop_top) - int(crop_bottom)
    ch -= ch % 2
    cw = min(info["w"], int(round(ch * 9 / 16 / 2)) * 2)
    blur = ",tmix=frames=3:weights='1 2 1'" if speed > 2 else ""
    zoom = f"(1.0+0.07*t/{dur})"
    vf = (f"setpts=(PTS-STARTPTS)/{speed:.4f},fps={FPS}{blur},"
          f"crop={cw}:{ch}:{(info['w'] - cw) // 2}:{int(crop_top)},scale={W}:{H},setsar=1,"
          f"scale=w='trunc({W}*{zoom}/2)*2':h=-2:eval=frame,crop={W}:{H},{LOOK},format=yuv420p")
    mt.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-i", str(clip), "-vf", vf, "-an",
            "-t", f"{dur:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", str(out)])
    return speed


def chain_xfade(parts, durs, out: Path, grad: Path):
    """Enchaîne les parties avec des transitions animées, puis pose le dégradé de lisibilité."""
    inputs = []
    for p in parts:
        inputs += ["-i", str(p)]
    inputs += ["-loop", "1", "-i", str(grad)]
    g, prev, off = [], "[0:v]", 0.0
    for i in range(1, len(parts)):
        off += durs[i - 1] - XF
        tr = TRANSITIONS[(i - 1) % len(TRANSITIONS)]
        g.append(f"{prev}[{i}:v]xfade=transition={tr}:duration={XF}:offset={off:.3f}[x{i}]")
        prev = f"[x{i}]"
    total = sum(durs) - XF * (len(parts) - 1)
    g.append(f"{prev}[{len(parts)}:v]overlay=0:0:shortest=1,format=yuv420p[v]")
    mt.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(g), "-map", "[v]",
            "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "15", str(out)])
    return total


# --------------------------------------------------------------------------
# Textes animés (ASS)
# --------------------------------------------------------------------------
def dl(layer, t0, t1, tags, txt=""):
    return f"Dialogue: {layer},{mt.ass_time(t0)},{mt.ass_time(t1)},Default,,0,0,0,,{{{tags}}}{txt}"


def rrect(w, h, r):
    """Rectangle arrondi en dessin ASS (coin haut-gauche en 0,0)."""
    k = 0.55 * r
    return (f"m {r} 0 l {w - r} 0 b {w - r + k} 0 {w} {r - k} {w} {r} l {w} {h - r} "
            f"b {w} {h - r + k} {w - r + k} {h} {w - r} {h} l {r} {h} b {r - k} {h} 0 {h - r + k} 0 {h - r} "
            f"l 0 {r} b 0 {r - k} {r - k} 0 {r} 0")


def anton(em):
    m = mt.font_metrics(mt.ANTON)
    return em / m["k"], m["top_gap"] * em


def pill(ev, t0, t1, txt, col, y, em=104):
    """Nom du véhicule dans une pastille colorée qui arrive en glissant."""
    em = mt.fit_em(txt, mt.ANTON, em, 820)
    tw = mt.text_width(txt, mt.ANTON, em)
    pw, ph = int(tw + 90), int(em * 1.28)
    x = 540 - pw // 2
    size, gap = anton(em)
    c = mt.ass_color(col)
    ev.append(dl(2, t0, t1, rf"\an7\move({x - 700},{y},{x},{y},0,260)\p1\bord0\shad0\c{c}\blur0.6", rrect(pw, ph, ph // 2)) + r"{\p0}")
    ev.append(dl(2, t0, t1, rf"\an7\move({x - 700},{y + 10},{x},{y + 10},0,260)\p1\bord0\shad0\c&H000000&\alpha&H90&\blur12",
                 rrect(pw, ph, ph // 2)) + r"{\p0}")
    ev.append(dl(3, t0, t1, rf"\an8\move({540 - 700},{y + ph * 0.13 - gap * 0.35:.0f},540,{y + ph * 0.13 - gap * 0.35:.0f},0,260)"
                 rf"\fn{mt.ANTON}\fs{size:.1f}\c&HFFFFFF&\bord3\3c&H000000&\shad0", mt.ass_escape(txt)))
    return y + ph


def counter(ev, t0, dur, minutes, col, y=1215):
    """Compteur : halo, barre de progression, puis flash + secousse à l'arrivée."""
    run_d = dur * 0.70
    steps = int(run_d * 15)
    size, gap = anton(200)
    c = mt.ass_color(col)
    ytop = y - gap
    for k in range(steps + 1):
        ta = t0 + k / 15
        tb = t0 + (k + 1) / 15 if k < steps else t0 + dur
        txt = fmt_temps(minutes * ease(k / steps))
        if k == steps:
            # arrivée : pop + secousse (3 positions rapides)
            for j, dx in enumerate((14, -10, 0)):
                t_a = ta + j * 0.045
                t_b = ta + (j + 1) * 0.045 if j < 2 else tb
                ev.append(dl(4, t_a, t_b, rf"\an8\pos({540 + dx},{ytop:.0f})\fn{mt.ANTON}\fs{size:.1f}\c{c}"
                             rf"\3c&H000000&\bord10\shad5\4c&H80000000&" + (r"\fscx128\fscy128" if j == 0 else ""), txt))
                ev.append(dl(3, t_a, t_b, rf"\an8\pos({540 + dx},{ytop:.0f})\fn{mt.ANTON}\fs{size:.1f}\c{c}\3c{c}"
                             rf"\bord22\blur18\alpha&H70&\shad0", txt))
            continue
        ev.append(dl(4, ta, tb, rf"\an8\pos(540,{ytop:.0f})\fn{mt.ANTON}\fs{size:.1f}\c&HFFFFFF&\3c&H000000&"
                     rf"\bord10\shad5\4c&H80000000&", txt))
        ev.append(dl(3, ta, tb, rf"\an8\pos(540,{ytop:.0f})\fn{mt.ANTON}\fs{size:.1f}\c{c}\3c{c}\bord20\blur18"
                     rf"\alpha&HA0&\shad0", txt))
    # barre de progression
    bx, by, bw, bh = 160, y + 225, 760, 26
    ev.append(dl(2, t0, t0 + dur, rf"\an7\pos({bx},{by})\p1\bord0\shad0\c&HFFFFFF&\alpha&HB0&", rrect(bw, bh, bh // 2)) + r"{\p0}")
    ev.append(dl(3, t0, t0 + dur, rf"\an7\pos({bx},{by})\p1\bord0\shad0\c{c}\fscx0\t(0,{int(run_d * 1000)},0.45,\fscx100)",
                 rrect(bw, bh, bh // 2)) + r"{\p0}")
    stop = t0 + run_d
    # flash blanc plein écran à l'arrivée
    ev.append(dl(6, stop, stop + 0.28, r"\an7\pos(0,0)\p1\bord0\shad0\c&HFFFFFF&\alpha&H50&\t(0,280,\alpha&HFF&)",
                 f"m 0 0 l {W} 0 l {W} {H} l 0 {H}") + r"{\p0}")
    return stop


def ranking(ev, t0, t1, trajets):
    """Classement : barres arrondies qui poussent une à une, temps qui défilent, tampon du plus rapide."""
    mx = max(t["minutes"] for t in trajets) or 1
    x0, wmax, y0, gap, bh = 100, 880, 560, 205, 74
    best = min(range(len(trajets)), key=lambda i: trajets[i]["minutes"])
    lsize, lgap = anton(60)
    for i, tr in enumerate(trajets):
        y = y0 + i * gap
        w = max(60, wmax * tr["minutes"] / mx)
        st = t0 + 0.28 * i
        c = mt.ass_color(tr["couleur"])
        ev.append(dl(2, st, t1, rf"\an7\pos({x0},{y + 70})\p1\bord0\shad0\c{c}\blur10\alpha&H80&\fscx0"
                     rf"\t(0,600,0.5,\fscx100)", rrect(int(w), bh, bh // 2)) + r"{\p0}")
        ev.append(dl(3, st, t1, rf"\an7\pos({x0},{y + 70})\p1\bord0\shad0\c{c}\fscx0\t(0,600,0.5,\fscx100)",
                     rrect(int(w), bh, bh // 2)) + r"{\p0}")
        ev.append(dl(4, st, t1, rf"\an1\pos({x0 + 6},{y + 58})\fn{mt.ANTON}\fs{lsize:.1f}\c&HFFFFFF&\bord5"
                     rf"\3c&H000000&\shad2\alpha&HFF&\t(0,200,\alpha&H00&)", mt.ass_escape(tr["mode"])))
        # temps qui défile pendant que la barre pousse
        n = 9
        for k in range(n + 1):
            ta = st + 0.6 * k / n
            tb = st + 0.6 * (k + 1) / n if k < n else t1
            ev.append(dl(4, ta, tb, rf"\an3\pos({x0 + wmax},{y + 58})\fn{mt.ANTON}\fs{lsize:.1f}\c{c}\bord5"
                         rf"\3c&H000000&\shad2", fmt_temps(tr["minutes"] * ease(k / n))))
        if i == best:
            ts = st + 0.9
            ev.append(dl(5, ts, t1, rf"\an4\pos({min(x0 + w + 40, 640):.0f},{y + 70 + bh // 2})\fn{mt.ANTON}"
                         rf"\fs{anton(64)[0]:.1f}\c&HFFFFFF&\3c{mt.ass_color(mt.STYLE['pink'])}\bord12\shad0"
                         rf"\frz-9\fscx260\fscy260\alpha&HFF&\t(0,170,\fscx100\fscy100\alpha&H00&)", "LE + RAPIDE"))
    return t0 + 0.28 * (len(trajets) - 1) + 0.9


def sfx_track(path: Path, total, whooshes, impacts, ticks):
    sr = mt.SR
    n = int(sr * (total + 0.5))
    mix = np.zeros((n, 2))

    def put(clip, t, g):
        i = max(0, int(t * sr))
        j = min(n, i + len(clip))
        if j > i:
            mix[i:j] += clip[: j - i] * g

    w, imp, tick = mt._whoosh(), mt._impact(), mt._impact(0.06)
    for t in whooshes:
        put(w, t - 0.24, 0.4)
    for t in impacts:
        put(imp, t, 0.6)
    for t in ticks:
        put(tick, t, 0.10)
    mix = np.clip(mix, -0.98, 0.98)
    with wave.open(str(path), "wb") as fh:
        fh.setnchannels(2)
        fh.setsampwidth(2)
        fh.setframerate(sr)
        fh.writeframes((mix * 32767).astype("<i2").tobytes())


# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plan")
    ap.add_argument("--out", default="sorties")
    args = ap.parse_args()
    plan_path = Path(args.plan).resolve()
    base = plan_path.parent
    spec = json.loads(plan_path.read_text(encoding="utf-8"))
    trajets = spec["trajets"]
    if any(not t.get("minutes") for t in trajets):
        mt.die("un trajet n'a pas de temps chronométré (« minutes ») : jamais de chiffre inventé")
    nom = mt.slug(spec.get("nom", "traversee"))
    out_dir = Path(args.out).resolve() / nom
    out_dir.mkdir(parents=True, exist_ok=True)
    carte = (base / spec["carte"]).resolve()
    points = spec.get("points")
    lead = trajets[-1].get("couleur", "FFFFFF")

    with tempfile.TemporaryDirectory(prefix="traversee_") as tmp:
        work = Path(tmp)
        gradient_png(work / "grad.png")
        print("· carte animée (accroche)…", flush=True)
        render_map(carte, work / "s0.mp4", HOOK_D, points, mt.STYLE["pink"], 1.0, 1.35, 0.35, 2.6)
        parts, durs, speeds = [work / "s0.mp4"], [HOOK_D], []
        for i, tr in enumerate(trajets):
            print(f"· trajet {tr['mode']}…", flush=True)
            p = work / f"s{i + 1}.mp4"
            speeds.append(render_clip((base / tr["clip"]).resolve(), tr["a"], tr["b"], p, SECT_D,
                                      tr.get("crop_top", 0), tr.get("crop_bottom", 0)))
            parts.append(p)
            durs.append(SECT_D)
        print("· carte animée (classement)…", flush=True)
        render_map(carte, work / "fin.mp4", END_D, points, lead, 1.25, 1.12, -1, 0, pulse=True)
        parts.append(work / "fin.mp4")
        durs.append(END_D)
        print("· transitions…", flush=True)
        total = chain_xfade(parts, durs, work / "video.mp4", work / "grad.png")
        starts = [sum(durs[:k]) - XF * k for k in range(len(durs))]

        head = (f"[Script Info]\nScriptType: v4.00+\nPlayResX: {W}\nPlayResY: {H}\nWrapStyle: 2\n"
                "ScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, "
                "SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, "
                "Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
                f"Style: Default,{mt.ANTON},80,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,6,0,8,"
                "20,20,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        ev = mt.hook_events(mt.split2(spec.get("hook", "COMBIEN DE TEMPS POUR|TRAVERSER GTA 6 ?")), starts[1])
        impacts, ticks, whooshes = [0.02], [], []
        for i, (tr, sp) in enumerate(zip(trajets, speeds)):
            s0 = starts[i + 1]
            s1 = starts[i + 2]
            whooshes.append(s0)
            col = tr.get("couleur", "FFFFFF")
            yb = pill(ev, s0 + 0.05, s1, tr["mode"], col, 215)
            if sp >= 1.5:
                ev.append(dl(3, s0 + 0.3, s1, rf"\an8\pos(540,{yb + 22})\fn{mt.ARCHIVO}\fs{mt.STYLE['sub_size'] / mt.font_metrics(mt.ARCHIVO)['k'] * 0.75:.1f}"
                             rf"\c&HFFFFFF&\bord4\3c&H000000&\shad0\alpha&HFF&\t(0,200,\alpha&H00&)", f"ACCÉLÉRÉ ×{sp:.0f}"))
            stop = counter(ev, s0 + 0.2, (s1 - s0) - 0.2, tr["minutes"], col)
            impacts.append(stop)
            ticks += list(np.arange(s0 + 0.2, stop, 1 / 12))
        t_end = starts[-1]
        whooshes.append(t_end)
        pill(ev, t_end + 0.05, total, "LE CLASSEMENT", mt.STYLE["pink"], 215)
        t_best = ranking(ev, t_end + 0.35, total, trajets)
        impacts.append(t_best)
        cta = mt.split2(spec.get("cta", "T'AURAIS PARIÉ COMBIEN ?|DIS-LE EN COMMENTAIRE"))
        for i, (txt, (col, em, y)) in enumerate(zip(cta, mt.STYLE["cta"])):
            if txt:
                ev.append(mt.ass_line(txt, mt.ANTON, mt.STYLE[col], em, y, t_best + 0.5 + 0.15 * i, total,
                                      mt.STYLE["outline_big"], layer=4))
        if spec.get("test"):
            ev.append(mt.ass_line("TEST · CHIFFRES PAS RÉELS", mt.ARCHIVO, "FF3333", 44, 1770, 0, total, 5,
                                  pop=False, layer=7))
        (work / "textes.ass").write_text(head + "\n".join(ev) + "\n", encoding="utf-8")
        shutil.copytree(mt.FONTS_DIR, work / "fonts", dirs_exist_ok=True)

        sfx_track(work / "sfx.wav", total, whooshes, impacts, ticks)
        out = out_dir / f"{nom}_TikTok.mp4"
        print("· textes, sons, export…", flush=True)
        mt.run(["ffmpeg", "-v", "error", "-y", "-i", "video.mp4", "-i", "sfx.wav", "-filter_complex",
                "[0:v]ass=filename=textes.ass:fontsdir=fonts,format=yuv420p[v];"
                "[1:a]loudnorm=I=-16:TP=-2,aresample=48000[a]",
                "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "medium",
                "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], cwd=str(work))
    mt.contact_sheet(out, out_dir / f"{nom}_planche.jpg", total)
    lignes = " · ".join(f"{t['mode'].lower()} {fmt_temps(t['minutes']).lower()}" for t in trajets)
    (out_dir / f"{nom}_legende.txt").write_text(
        f"J'ai chronométré la traversée de Leonida 🗺️ {lignes}. T'aurais parié combien ? 👇\n"
        "#gta6 #gtavi #leonida #gta6gameplay #gamingfr\n", encoding="utf-8")
    print(f"✓ {out} ({total:.1f} s)")


if __name__ == "__main__":
    main()
