#!/usr/bin/env python3
"""traversee.py : vidéo « Combien de temps pour traverser la carte de GTA 6 ? »
avec les VRAIS temps chronométrés par Ilan (jamais de chiffre inventé).

Plan JSON :
{
  "nom": "traversee_leonida",
  "carte": "carte.png",                       # capture d'écran de la carte du jeu (avec le trajet)
  "hook": "COMBIEN DE TEMPS POUR|TRAVERSER GTA 6 ?",
  "trajets": [                                 # du plus lent au plus rapide ; crop_top / crop_bottom : interface du jeu
    {"mode": "À PIED",  "minutes": 0, "couleur": "FF4FA3", "clip": "pied.mp4",  "a": 10, "b": 40},
    {"mode": "VOITURE", "minutes": 0, "couleur": "FFC94A", "clip": "auto.mp4",  "a": 5,  "b": 35},
    {"mode": "AVION",   "minutes": 0, "couleur": "4AC9FF", "clip": "avion.mp4", "a": 0,  "b": 20}
  ],
  "cta": "T'AURAIS PARIÉ COMBIEN ?|DIS-LE EN COMMENTAIRE",
  "test": false                                # true = bandeau « TEST » (chiffres pas réels)
}
« minutes » = temps réel dans le jeu, chronométré. a/b = passage du clip à montrer (accéléré
pour tenir en ~5 s). Chemins relatifs au JSON.

  python traversee.py plan.json --out sorties
Le son du jeu est coupé (accéléré, il serait criard) : bruitages synthétisés (compteur,
souffles, impacts). Ajouter un son TikTok tendance à la publication.
"""
import argparse
import json
import math
import shutil
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import make_tiktok as mt  # noqa: E402

W, H, FPS = 1080, 1920, 30
HOOK_D, SECT_D, END_D = 3.0, 5.0, 5.5
PY, PH = 500, 860  # image au premier plan


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3  # démarre vite, ralentit à l'arrivée (suspense sur le chiffre)


def fmt_temps(m):
    m = int(round(m))
    return f"{m // 60} H {m % 60:02d}" if m >= 60 else f"{m} MIN"


def render_map(carte: Path, out: Path, dur, zoom_from=1.0, zoom_to=1.12):
    vf = (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=24:2,"
          f"eq=brightness=-0.22:saturation=1.2[bg];"
          f"[0:v]scale={W}:{PH}:force_original_aspect_ratio=increase,crop={W}:{PH},setsar=1,"
          f"scale=w='trunc({W}*({zoom_from}+({zoom_to}-{zoom_from})*t/{dur})/2)*2':h=-2:eval=frame,"
          f"crop={W}:{PH}[fg];[bg][fg]overlay=0:{PY},{mt.GRADE},format=yuv420p[v]")
    mt.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-i", str(carte),
            "-filter_complex", vf, "-map", "[v]", "-t", f"{dur:.3f}", "-r", str(FPS),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", str(out)])


def render_clip(clip: Path, a, b, out: Path, dur, crop_top=0, crop_bottom=0):
    speed = max(1.0, (b - a) / dur)
    info = mt.probe(clip)
    ch = info["h"] - int(crop_top) - int(crop_bottom)
    cw = min(info["w"], int(round(ch * 16 / 9 / 2)) * 2)
    crop = f"crop={cw}:{ch}:{(info['w'] - cw) // 2}:{int(crop_top)},"  # sans l'interface du jeu
    vf = (f"[0:v]setpts=(PTS-STARTPTS)/{speed:.4f},fps={FPS},{crop}split[x][y];"
          f"[x]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:2,"
          f"eq=brightness=-0.2:saturation=1.2[bg];"
          f"[y]scale={W}:{PH}:force_original_aspect_ratio=increase,crop={W}:{PH},setsar=1[fg];"
          f"[bg][fg]overlay=0:{PY},{mt.GRADE},format=yuv420p[v]")
    mt.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-i", str(clip), "-filter_complex", vf,
            "-map", "[v]", "-t", f"{dur:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast",
            "-crf", "16", str(out)])
    return speed


def ass_counter(ev, t0, dur, minutes, col):
    """Compteur qui défile de 0 au temps réel, puis claque (impact)."""
    run_d = dur * 0.72
    steps = int(run_d * 15)
    m = mt.font_metrics(mt.ANTON)
    for k in range(steps + 1):
        ta = t0 + k / 15
        tb = t0 + (k + 1) / 15 if k < steps else t0 + dur
        val = minutes * ease(k / steps)
        txt = fmt_temps(val)
        em = 190 if k < steps else 190
        size = em / m["k"]
        pop = r"\fscx125\fscy125\t(0,160,\fscx100\fscy100)" if k == steps else ""
        ytop = PY + PH + 40 - m["top_gap"] * em
        ev.append(f"Dialogue: 3,{mt.ass_time(ta)},{mt.ass_time(tb)},Default,,0,0,0,,"
                  rf"{{\an8\pos(540,{ytop:.0f})\fn{mt.ANTON}\fs{size:.1f}\c{mt.ass_color(col)}"
                  rf"\3c&H000000&\bord9\shad4\4c&H80000000&{pop}}}{txt}")
    return t0 + run_d  # instant où le chiffre se pose


def txt_at(txt, col, em, an, x, y, t0, t1):
    """Texte Anton ancré librement (an7 = gauche, an9 = droite), avec pop."""
    m = mt.font_metrics(mt.ANTON)
    return (f"Dialogue: 3,{mt.ass_time(t0)},{mt.ass_time(t1)},Default,,0,0,0,,"
            rf"{{\an{an}\pos({x},{y})\fn{mt.ANTON}\fs{em / m['k']:.1f}\c{mt.ass_color(col)}\3c&H000000&"
            rf"\bord6\shad3\4c&H80000000&\fscx118\fscy118\t(0,140,\fscx100\fscy100)}}{mt.ass_escape(txt)}")


def ass_bars(ev, t0, t1, trajets):
    """Classement final : barres proportionnelles aux vrais temps."""
    mx = max(t["minutes"] for t in trajets) or 1
    x0, wmax, y0, gap = 90, 900, PY + 120, 190
    for i, t in enumerate(trajets):
        y = y0 + i * gap
        w = max(40, wmax * t["minutes"] / mx)
        st = t0 + 0.25 * i
        ev.append(f"Dialogue: 2,{mt.ass_time(st)},{mt.ass_time(t1)},Default,,0,0,0,,"
                  rf"{{\an7\pos({x0},{y + 62})\p1\bord0\shad0\c{mt.ass_color(t['couleur'])}"
                  rf"\fscx0\t(0,500,\fscx100)}}m 0 0 l {w:.0f} 0 l {w:.0f} 70 l 0 70{{\p0}}")
        ev.append(txt_at(t["mode"], "FFFFFF", 62, 7, x0, y - 30, st, t1))
        ev.append(txt_at(fmt_temps(t["minutes"]), t["couleur"], 62, 9, x0 + wmax, y - 30, st + 0.4, t1))


def sfx_track(path: Path, total, whooshes, impacts, ticks):
    sr = mt.SR
    n = int(sr * (total + 0.5))
    mix = np.zeros((n, 2))

    def put(clip, t, g):
        i = max(0, int(t * sr))
        j = min(n, i + len(clip))
        if j > i:
            mix[i:j] += clip[: j - i] * g

    w = mt._whoosh()
    imp = mt._impact()
    tick = mt._impact(0.06)
    for t in whooshes:
        put(w, t - 0.24, 0.35)
    for t in impacts:
        put(imp, t, 0.6)
    for t in ticks:
        put(tick, t, 0.12)
    mix = np.clip(mix, -0.98, 0.98)
    with wave.open(str(path), "wb") as fh:
        fh.setnchannels(2)
        fh.setsampwidth(2)
        fh.setframerate(sr)
        fh.writeframes((mix * 32767).astype("<i2").tobytes())


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

    with tempfile.TemporaryDirectory(prefix="traversee_") as tmp:
        work = Path(tmp)
        parts = []
        render_map(carte, work / "s0.mp4", HOOK_D)
        parts.append(work / "s0.mp4")
        starts, speeds = [], []
        t = HOOK_D
        for i, tr in enumerate(trajets):
            p = work / f"s{i + 1}.mp4"
            speeds.append(render_clip((base / tr["clip"]).resolve(), tr["a"], tr["b"], p, SECT_D,
                                      tr.get("crop_top", 0), tr.get("crop_bottom", 0)))
            parts.append(p)
            starts.append(t)
            t += SECT_D
        render_map(carte, work / "fin.mp4", END_D, 1.12, 1.0)
        parts.append(work / "fin.mp4")
        t_end = t
        total = t + END_D
        (work / "list.txt").write_text("".join(f"file '{p.name}'\n" for p in parts))
        mt.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(work / "list.txt"),
                "-c", "copy", str(work / "video.mp4")])

        # textes
        head = (f"[Script Info]\nScriptType: v4.00+\nPlayResX: {W}\nPlayResY: {H}\nWrapStyle: 2\n"
                "ScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, "
                "SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, "
                "Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
                f"Style: Default,{mt.ANTON},80,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,6,0,8,"
                "20,20,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        ev = mt.hook_events(mt.split2(spec.get("hook", "COMBIEN DE TEMPS POUR|TRAVERSER GTA 6 ?")), HOOK_D)
        impacts, ticks, whooshes = [0.02], [], []
        for i, (tr, s0, sp) in enumerate(zip(trajets, starts, speeds)):
            whooshes.append(s0)
            col = tr.get("couleur", "FFFFFF")
            ev.append(mt.ass_line(tr["mode"], mt.ANTON, col, 120, 250, s0, s0 + SECT_D, 8, layer=2))
            ev.append(mt.ass_line(f"ACCÉLÉRÉ ×{sp:.0f}" if sp >= 1.5 else "", mt.ARCHIVO, "FFFFFF", 40, 395,
                                  s0, s0 + SECT_D, 5, pop=False, layer=2))
            stop = ass_counter(ev, s0 + 0.15, SECT_D - 0.15, tr["minutes"], col)
            impacts.append(stop)
            ticks += list(np.arange(s0 + 0.15, stop, 1 / 12))
        whooshes.append(t_end)
        ev.append(mt.ass_line("LE CLASSEMENT", mt.ANTON, mt.STYLE["pink"], 110, 250, t_end, total, 8, layer=2))
        ass_bars(ev, t_end + 0.2, total, trajets)
        cta = mt.split2(spec.get("cta", "T'AURAIS PARIÉ COMBIEN ?|DIS-LE EN COMMENTAIRE"))
        for i, (txt, (col, em, y)) in enumerate(zip(cta, mt.STYLE["cta"])):
            if txt:
                ev.append(mt.ass_line(txt, mt.ANTON, mt.STYLE[col], em, y + 140, t_end + 1.2 + 0.15 * i, total,
                                      mt.STYLE["outline_big"], layer=3))
        if spec.get("test"):
            ev.append(mt.ass_line("TEST · CHIFFRES PAS RÉELS", mt.ARCHIVO, "FF3333", 44, 1760, 0, total, 5,
                                  pop=False, layer=5))
        (work / "textes.ass").write_text(head + "\n".join(ev) + "\n", encoding="utf-8")
        shutil.copytree(mt.FONTS_DIR, work / "fonts", dirs_exist_ok=True)

        sfx_track(work / "sfx.wav", total, whooshes, impacts, ticks)
        out = out_dir / f"{nom}_TikTok.mp4"
        mt.run(["ffmpeg", "-v", "error", "-y", "-i", "video.mp4", "-i", "sfx.wav", "-filter_complex",
                "[0:v]ass=filename=textes.ass:fontsdir=fonts,format=yuv420p[v];"
                f"[1:a]loudnorm=I=-16:TP=-2,aresample=48000[a]",
                "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "medium",
                "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], cwd=str(work))
    mt.contact_sheet(out, out_dir / f"{nom}_planche.jpg", total)
    lignes = " · ".join(f"{t['mode'].lower()} {fmt_temps(t['minutes']).lower()}" for t in trajets)
    (out_dir / f"{nom}_legende.txt").write_text(
        f"J'ai chronométré la traversée de Leonida 🗺️ {lignes}. T'aurais parié combien ? 👇\n"
        "#gta6 #gtavi #leonida #gta6gameplay #gamingfr\n", encoding="utf-8")
    print(f"✓ {out} ({total:.1f} s)")


if __name__ == "__main__":
    main()
