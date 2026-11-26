#!/usr/bin/env python3
"""Récupère les clips Twitch les plus vus des chaînes AUTORISÉES et les met en file de traitement.

Les spectateurs ont déjà choisi ces moments (nombre de vues) ; le moteur trouve ensuite le passage le plus fort
dans chaque clip (smart_cut.best_window), détecte la webcam, filtre les contenus bloqués et fait le TikTok.

  python sources/top_clips.py [--range 24hr|7d|30d] [--top 6] [--min-views 300] [--channels a,b]
Refuse toute chaîne qui n'est pas en rights authorized/owned. Ne retraite jamais un clip déjà en base.
"""
import argparse, json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import DB_PATH, OUT, can_download, load_config, log  # noqa: E402
from database.state import DB  # noqa: E402
from delivery.validate import probe  # noqa: E402

SKIP_TITLE = re.compile(r"🔞|\b(suce|sexe|nude|bj|porn)\b", re.I)


def list_clips(channel, rng):
    r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", f"https://www.twitch.tv/{channel}/clips?filter=clips&range={rng}"],
                       capture_output=True, text=True, timeout=120)
    if r.returncode:
        raise RuntimeError(r.stderr.strip()[-200:])
    return json.loads(r.stdout).get("entries") or []


def known_ids(db):
    return {m.group(1) for (ref,) in db.c.execute("SELECT source_ref FROM clips")
            for m in [re.search(r"_(\d+)\.mp4$", ref or "")] if m}


def run(rng="24hr", top=6, min_views=300, channels=None):
    cfg, db = load_config(), DB(DB_PATH)
    d = os.path.join(OUT, "sources", "twitch_clips"); os.makedirs(d, exist_ok=True)
    seen, ids = known_ids(db), []
    for ch in cfg["channels"]:
        name = ch["name"]
        if channels and name not in channels or ch.get("enabled") is False:
            continue
        if not can_download(ch.get("rights", "discovered")):
            log("clips", f"{name}: ignoré (droits {ch.get('rights')})"); continue
        try:
            entries = list_clips(name, rng)
        except Exception as e:
            log("clips", f"{name}: liste impossible ({e})"); continue
        picked = [e for e in entries if (e.get("view_count") or 0) >= min_views and e["id"] not in seen
                  and not SKIP_TITLE.search(e.get("title") or "")][:top]
        for e in picked:
            path = os.path.join(d, f"{name}_{e['id']}.mp4")
            if not os.path.exists(path):
                r = subprocess.run(["yt-dlp", "-q", "-f", "best[height<=720]/best", "-o", path + ".part.mp4", e["url"]],
                                   capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=300)
                if r.returncode or not os.path.exists(path + ".part.mp4"):
                    log("clips", f"{name} {e['id']}: téléchargement raté {r.stderr.strip()[-150:]}"); continue
                os.replace(path + ".part.mp4", path)
            dur = float((probe(path) or {}).get("format", {}).get("duration") or 0)
            if dur < 8:
                continue
            sig = {"kind": None, "source": "twitch_clip", "views": e.get("view_count"), "title": e.get("title") or "",
                   "clip_id": e["id"]}
            cid = db.add_clip("twitch_clip", name, path, e["url"], ch["rights"], 0, sig, "CANDIDATE", margin=0,
                              src_path=path, src_offset=0, win_start=0, win_end=dur)
            if cid:
                ids.append(cid); log("clips", f"{name}: « {sig['title']} » ({sig['views']} vues) -> #{cid}")
    db.event("clips", f"{len(ids)} clip(s) Twitch récents mis en file")
    return ids


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--range", default="24hr", choices=["24hr", "7d", "30d", "all"])
    ap.add_argument("--top", type=int, default=6)
    ap.add_argument("--min-views", type=int, default=300)
    ap.add_argument("--channels")
    a = ap.parse_args()
    print(run(a.range, a.top, a.min_views, a.channels.split(",") if a.channels else None))
