#!/usr/bin/env python3
"""ab_hooks.py : deux accroches pour la même capture, pour un test A/B.

Même corps de montage, seule l'accroche change (texte + passage de la source).
Sorties dans <dossier>/ :
  <nom>_A_TikTok.mp4, <nom>_B_TikTok.mp4   les deux vidéos
  ab_test.csv                              le suivi à remplir après publication
  ab_rapport.md                            les deux accroches, la règle du test

Usage :
  python ab_hooks.py capture.mp4 \
    --body "195.9-201.0,202.1-208.95,229.4-233.6" \
    --hook-a "209.0-213.5|ILS DEVAIENT JUSTE|SURVEILLER…" \
    --hook-b "192.0-195.7|ILS ONT CHOPÉ DONNIE|ET ON RESTE LÀ ?" \
    --title "GTA 6|MISSION" --cta "TU Y VAS OU TU RENTRES ?|DIS-LE EN COMMENTAIRE" \
    --crop-bottom 110 --crop-top 45 --cta-top --subs sous-titres_fr.srt

Pour chaque accroche : « passage|ligne 1|ligne 2 ». Le passage est en secondes
dans la source ; il est joué en premier et affiché pendant toute son étendue
(ou 3 s maximum avec --hook-dur).
Les deux vidéos doivent être publiées à quelques jours d'écart, avec le même
horaire, sinon le test mesure le moment et pas l'accroche.
"""
import argparse
import csv
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAKE = HERE / "make_tiktok.py"
PY = HERE / ".venv" / "bin" / "python" if (HERE / ".venv" / "bin" / "python").exists() else Path(sys.executable)


def parse_hook(s):
    parts = s.split("|")
    if len(parts) < 3:
        sys.exit(f"accroche invalide « {s} » : format « a-b|LIGNE 1|LIGNE 2 »")
    rng, l1, l2 = parts[0], parts[1], parts[2]
    return rng.strip(), f"{l1}|{l2}"


def render(src: Path, variant: str, hook_rng, hook_txt, body, args, out: Path):
    # le nom de sortie vient du nom du fichier : on crée un lien <stem>_A.<ext>
    link = out / f"{src.stem}_{variant}{src.suffix}"
    if link.exists() or link.is_symlink():
        link.unlink()
    link.symlink_to(src)
    segments = f"{hook_rng},{body}"
    cmd = [str(PY), str(MAKE), str(link), "--out", str(out), "--segments", segments,
           "--hook", hook_txt, "--hook-dur", str(args.hook_dur)]
    for flag, val in (("--title", args.title), ("--cta", args.cta), ("--cta-dur", args.cta_dur),
                      ("--crop-bottom", args.crop_bottom), ("--crop-top", args.crop_top),
                      ("--subs", args.subs), ("--caption", args.caption), ("--tags", args.tags)):
        if val not in (None, ""):
            cmd += [flag, str(val)]
    if args.cta_top:
        cmd.append("--cta-top")
    if args.mute:
        cmd.append("--mute")
    if args.mute or args.no_subs:
        cmd.append("--no-subs")
    print(f"· variante {variant} : accroche {hook_rng} « {hook_txt.replace('|', ' / ')} »", flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-800:], r.stderr[-1500:])
        sys.exit(f"rendu {variant} échoué")
    name = src.stem
    mp4 = out / f"{link.stem}" / f"{link.stem}_TikTok.mp4"
    if not mp4.exists():
        sys.exit(f"sortie introuvable : {mp4}")
    final = out / f"{name}_{variant}_TikTok.mp4"
    shutil.copy(mp4, final)
    return final


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--hook-a", required=True, help="« a-b|LIGNE 1|LIGNE 2 »")
    ap.add_argument("--hook-b", required=True, help="« a-b|LIGNE 1|LIGNE 2 »")
    ap.add_argument("--body", required=True, help="« a-b,a-b,… » : le reste du montage, identique pour A et B")
    ap.add_argument("--title", default="GTA 6|")
    ap.add_argument("--cta", default="")
    ap.add_argument("--cta-dur", type=float)
    ap.add_argument("--cta-top", action="store_true")
    ap.add_argument("--hook-dur", type=float, default=3.0)
    ap.add_argument("--crop-bottom", type=int)
    ap.add_argument("--crop-top", type=int)
    ap.add_argument("--subs", help=".srt en français (temps source), pour toute la vidéo")
    ap.add_argument("--no-subs", action="store_true")
    ap.add_argument("--mute", action="store_true")
    ap.add_argument("--caption", help="légende commune aux deux variantes")
    ap.add_argument("--tags")
    ap.add_argument("--out", help="dossier de sortie (défaut : <capture>_ab à côté de la capture)")
    args = ap.parse_args()

    src = Path(args.video).expanduser().resolve()
    if not src.exists():
        sys.exit(f"fichier introuvable : {src}")
    out = Path(args.out).expanduser().resolve() if args.out else src.parent / f"{src.stem}_ab"
    out.mkdir(parents=True, exist_ok=True)

    ra, ta = parse_hook(args.hook_a)
    rb, tb = parse_hook(args.hook_b)
    if ta == tb and ra == rb:
        sys.exit("les deux accroches sont identiques : rien à tester")

    va = render(src, "A", ra, ta, args.body, args, out)
    vb = render(src, "B", rb, tb, args.body, args, out)
    for link in out.glob(f"{src.stem}_[AB]{src.suffix}"):
        link.unlink()

    csv_path = out / "ab_test.csv"
    if not csv_path.exists():
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["date_publi", "variante", "fichier", "accroche", "heure", "vues_1h", "vues_24h",
                        "retention_3s_pct", "retention_moy_pct", "vues_completes_pct", "decrochage_s",
                        "partages", "commentaires", "gagnant"])
            for v, txt, f_ in (("A", ta, va), ("B", tb, vb)):
                w.writerow(["", v, f_.name, txt.replace("|", " / "), "", "", "", "", "", "", "", "", "", ""])

    rapport = out / "ab_rapport.md"
    rapport.write_text(f"""# Test A/B : {src.name}

| | Accroche | Passage source | Fichier |
|---|---|---|---|
| A | {ta.replace('|', ' / ')} | {ra} | `{va.name}` |
| B | {tb.replace('|', ' / ')} | {rb} | `{vb.name}` |

## Règles du test
1. Publier A et B à quelques jours d'écart, **à la même heure**, sur le même compte.
2. Une seule variable : l'accroche. Même légende, même question, même son.
   ⚠️ Les sous-titres suivent le passage de l'accroche : la variante B contient donc aussi les
   répliques de son passage. Pour un test pur, garder des accroches sans parole ou sous-titrer
   à la main les deux passages de la même façon.
3. Relever les stats après 1 h, 24 h et 72 h dans `ab_test.csv` (rétention 3 s, rétention moyenne,
   % de vues complètes, moment de décrochage).
4. Conclure seulement après quelques milliers de vues par variante. En dessous, pas de conclusion.
5. Le gagnant devient l'accroche de référence dans `PREFERENCES.md`.
""", encoding="utf-8")
    print(f"\n✓ {va}\n✓ {vb}\n✓ {csv_path}\n✓ {rapport}")


if __name__ == "__main__":
    main()
