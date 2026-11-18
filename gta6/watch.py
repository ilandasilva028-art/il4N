#!/usr/bin/env python3
"""watch.py : dossier « à traiter » -> clips TikTok.

Dépose une capture (.mp4/.mov/.mkv) dans  ~/GTA6_TikTok/a_traiter/
(optionnel : un .json du même nom avec hook, title, cta, tags...).
Le script la monte, met le résultat dans   ~/GTA6_TikTok/a_valider/<nom>/
et range la capture dans                   ~/GTA6_TikTok/sources/
En cas d'erreur, la capture va dans        ~/GTA6_TikTok/erreurs/ (+ un .log).

Rien n'est publié : Ilan regarde a_valider/, puis déplace le dossier
dans valide/ quand la vidéo est bonne.

  python watch.py            # surveille en continu (Ctrl+C pour arrêter)
  python watch.py --once     # traite ce qui est là puis s'arrête
  GTA6_DIR=/autre/dossier python watch.py
"""
import argparse
import os
import shutil
import sys
import time
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import make_tiktok  # noqa: E402

EXTS = {".mp4", ".mov", ".mkv", ".m4v", ".webm"}


def dirs(root: Path):
    d = {k: root / k for k in ("a_traiter", "a_valider", "valide", "sources", "erreurs")}
    for p in d.values():
        p.mkdir(parents=True, exist_ok=True)
    return d


def stable(p: Path, wait=3.0):
    """Attend que la copie soit finie (taille qui ne bouge plus)."""
    try:
        s1 = p.stat().st_size
        time.sleep(wait)
        return s1 > 0 and p.stat().st_size == s1
    except FileNotFoundError:
        return False


def process(video: Path, d):
    print(f"\n=== {video.name} ===", flush=True)
    side = video.with_suffix(".json")
    try:
        make_tiktok.main([str(video), "--out", str(d["a_valider"])])
        dest = d["sources"]
    except SystemExit as e:
        if e.code in (0, None):
            dest = d["sources"]
        else:
            dest = d["erreurs"]
    except Exception:
        (d["erreurs"] / f"{video.stem}.log").write_text(traceback.format_exc())
        traceback.print_exc()
        dest = d["erreurs"]
    shutil.move(str(video), str(dest / video.name))
    if side.exists():
        shutil.move(str(side), str(dest / side.name))
    print(f"→ capture rangée dans {dest.name}/", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.environ.get("GTA6_DIR", "~/GTA6_TikTok"))
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--interval", type=float, default=10)
    a = ap.parse_args()
    d = dirs(Path(a.dir).expanduser())
    print(f"Dossier surveillé : {d['a_traiter']}", flush=True)
    while True:
        todo = sorted(p for p in d["a_traiter"].iterdir()
                      if p.suffix.lower() in EXTS and not p.name.startswith("."))
        for v in todo:
            if stable(v):
                process(v, d)
        if a.once:
            break
        time.sleep(a.interval)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\narrêt.")
