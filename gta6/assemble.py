#!/usr/bin/env python3
"""assemble.py : un clip à partir de PLUSIEURS captures.

Lit un plan JSON, extrait chaque passage, enlève l'interface du jeu propre à chaque
capture (haut / bas), remet tout au même format (1280x720, 30 i/s, son 48 kHz),
colle les passages dans une « source » unique, recale les sous-titres .srt de
chaque capture, puis lance make_tiktok.py avec la bonne découpe.

Plan JSON :
{
  "nom": "top5_repliques",
  "musique": {"src": "capture2.mov", "from": 9.07},      # facultatif : piste continue + coupes sur les temps forts
  "plans": [
    {"src": "capture5.mp4", "a": 108.2, "b": 111.6, "crop_bottom": 110,
     "fx": "full", "srt": "st_interrupteur.srt", "label": "#5|DES TRUCS PAS COOL"},
    ...
  ],
  "options": ["--hook", "LIGNE 1|LIGNE 2", "--cta", "…", "--rehook", "…"]
}
Les chemins sont relatifs au fichier JSON. crop_top / crop_bottom sont en pixels de LA
capture d'origine. fx : full, x2, slow… (comme --segments). label : « BADGE|TEXTE »
affiché pendant le plan (format liste numérotée).

  python assemble.py plan.json --out ./sorties
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import make_tiktok as mt  # noqa: E402

W, H, FPS = 1280, 720, 30


def srt_items(path: Path):
    txt = path.read_text(encoding="utf-8-sig")
    out = []
    for block in re.split(r"\n\s*\n", txt.strip()):
        lines = [x for x in block.strip().splitlines() if x.strip()]
        tl = next((x for x in lines if "-->" in x), None)
        if not tl:
            continue

        def ts(x):
            x = x.strip().replace(",", ".")
            h, m, s = x.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)

        a, b = (ts(p) for p in tl.split("-->"))
        out.append((a, b, " ".join(lines[lines.index(tl) + 1:])))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plan")
    ap.add_argument("--out", default="sorties")
    ap.add_argument("--garder", action="store_true", help="garder la source assemblée (debug)")
    args = ap.parse_args()

    plan_path = Path(args.plan).resolve()
    base = plan_path.parent
    spec = json.loads(plan_path.read_text(encoding="utf-8"))
    nom = mt.slug(spec["nom"])
    plans = spec["plans"]

    # coupes calées sur les temps forts de la musique
    music = spec.get("musique")
    if music:
        import plans as pl  # noqa: F401  (module plans.py)
        msrc = (base / music["src"]).resolve()
        est = sum(p["b"] - p["a"] for p in plans) + 2
        beats = pl.onsets(msrc, float(music["from"]), est)
        segs = [[p["a"], p["b"], p.get("b_max", p["b"] + 0.6)] for p in plans]
        snapped = pl.snap_to_beats(segs, beats, tol=0.35, min_len=0.6)
        for p, (a, b) in zip(plans, snapped):
            p["b"] = b
        print(f"· musique : {len(beats)} temps forts, coupes recalées")

    work = Path(tempfile.mkdtemp(prefix="assemble_"))
    parts, cues, segs, labels, t = [], [], [], [], 0.0
    for i, p in enumerate(plans):
        src = (base / p["src"]).resolve()
        info = mt.probe(src)
        ct, cb = int(p.get("crop_top", 0)), int(p.get("crop_bottom", 0))
        ch = info["h"] - ct - cb
        cw = min(info["w"], int(round(ch * 16 / 9 / 2)) * 2)
        cx = (info["w"] - cw) // 2
        d = p["b"] - p["a"]
        out = work / f"part{i:02d}.mp4"
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{p['a']:.3f}", "-i", str(src), "-t", f"{d:.3f}",
               "-vf", f"crop={cw}:{ch}:{cx}:{ct},scale={W}:{H}:flags=lanczos,setsar=1,fps={FPS},format=yuv420p"]
        if info["audio"]:
            cmd += ["-af", "aresample=48000,afade=t=in:d=0.02", "-ac", "2"]
        else:
            cmd += ["-f", "lavfi", "-t", f"{d:.3f}", "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v", "-map", "1:a"]
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "10", "-c:a", "aac", "-b:a", "256k", str(out)]
        mt.run(cmd)
        dd = mt.probe(out)["duration"]
        parts.append(out)
        if p.get("srt"):
            for a, b, txt in srt_items((base / p["srt"]).resolve()):
                if b > p["a"] and a < p["a"] + dd:
                    cues.append((t + max(0.0, a - p["a"]), t + min(dd, b - p["a"]), txt))
        fx = p.get("fx", "")
        # 0,04 s de marge : le collage peut décaler d'une image
        segs.append(f"{t + 0.02:.3f}-{t + dd - 0.02:.3f}" + (f":{fx}" if fx else ""))
        labels.append(p.get("label", ""))
        t += dd

    (work / "list.txt").write_text("".join(f"file '{x.name}'\n" for x in parts))
    source = work / f"{nom}.mp4"
    mt.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(work / "list.txt"),
            "-c", "copy", str(source)])
    if music:
        sm = work / f"{nom}_m.mp4"
        mt.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-ss", f"{float(music['from']):.3f}",
                "-t", f"{t:.3f}", "-i", str((base / music['src']).resolve()), "-map", "0:v", "-map", "1:a",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2", str(sm)])
        sm.replace(source)

    cmd = [sys.executable, str(HERE / "make_tiktok.py"), str(source), "--out", str(Path(args.out).resolve()),
           "--segments", ",".join(segs), "--lang", "en"]
    if cues:
        srt = work / f"{nom}.srt"
        srt.write_text("".join(f"{k}\n{mt.srt_time(a)} --> {mt.srt_time(b)}\n{txt}\n\n"
                               for k, (a, b, txt) in enumerate(cues, 1)), encoding="utf-8")
        cmd += ["--subs", str(srt)]
    else:
        cmd += ["--no-subs"]
    if any(labels):
        cmd += ["--labels", ";".join(labels)]
    if music:
        cmd += ["--music-from", "0"]
    cmd += spec.get("options", [])
    print(f"· source assemblée : {len(plans)} passages, {t:.1f} s")
    r = subprocess.run(cmd)
    if not args.garder:
        for f in work.iterdir():
            f.unlink()
        work.rmdir()
    sys.exit(r.returncode)


if __name__ == "__main__":
    main()
