#!/usr/bin/env python3
"""Rattrapage depuis les rediffusions (VOD) : pour des moments repérés (DISCOVERED) sur une chaîne autorisée,
télécharge la fenêtre [moment-50 s, moment+25 s] de la VOD avec yt-dlp et remet le moment en file (CANDIDATE).

  python sources/vod_backfill.py <vod_id> <vod_start_unix_ts> <clip_id> [<clip_id> ...]
Refuse si la chaîne n'est pas en rights authorized/owned.
"""
import os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import DB_PATH, OUT, can_download, load_config, log  # noqa: E402
from database.state import DB  # noqa: E402
from delivery.validate import probe  # noqa: E402

BEFORE, AFTER = 50, 25


_playlists = {}


def fetch_window(vod_id, start, end, out):
    """Download only the HLS segments covering [start, end] s of the VOD (python requests, via the proxy),
    concatenate them locally. Returns how many seconds the file starts before `start`."""
    import requests
    if vod_id not in _playlists:
        url = subprocess.run(["yt-dlp", "-g", "-f", "720p60/720p/best", f"https://www.twitch.tv/videos/{vod_id}"],
                             capture_output=True, text=True, check=True).stdout.strip().splitlines()[0]
        _playlists[vod_id] = (url, requests.get(url, timeout=30).text)
    url, m3u = _playlists[vod_id]
    base = url.rsplit("/", 1)[0] + "/"
    t, dur, segs, first_t = 0.0, None, [], None
    for line in m3u.splitlines():
        if line.startswith("#EXTINF:"):
            dur = float(line.split(":")[1].split(",")[0])
        elif line and not line.startswith("#") and dur is not None:
            if t + dur > start and t < end:
                segs.append(base + line)
                first_t = t if first_t is None else first_t
            t += dur; dur = None
    if not segs:
        raise RuntimeError("aucun segment dans cette plage (VOD trop courte ?)")
    tmp = out + ".part.ts"
    with open(tmp, "wb") as f:
        for u in segs:
            rr = requests.get(u, timeout=60)
            rr.raise_for_status()
            f.write(rr.content)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-c", "copy", "-movflags", "+faststart", out + ".part.mp4"],
                   check=True)
    os.remove(tmp)
    os.replace(out + ".part.mp4", out)
    return start - first_t


def backfill(vod_id, vod_start, ids):
    db, cfg = DB(DB_PATH), load_config()
    rights = {c["name"]: c["rights"] for c in cfg["channels"]}
    for cid in ids:
        r = db.get(cid)
        if not r or r["state"] not in ("DISCOVERED", "FAILED"):
            log("vod", f"#{cid}: ignoré (état {r and r['state']})"); continue
        if not can_download(rights.get(r["creator"], "discovered")):
            log("vod", f"#{cid}: refusé, {r['creator']} n'est pas autorisé"); continue
        off = int(r["trigger_ts"] - vod_start)
        d = os.path.join(OUT, "candidates", str(cid)); os.makedirs(d, exist_ok=True)
        out = os.path.join(d, "source.mp4")
        lead = 0.0
        if not os.path.exists(out):
            try:
                lead = fetch_window(vod_id, max(0, off - BEFORE), off + AFTER, out)
            except Exception as e:
                db.error("vod", f"#{cid}: {e}"); log("vod", f"#{cid}: échec téléchargement ({e})"); continue
        dur = float(probe(out)["format"]["duration"])
        h, m, s = off // 3600, off % 3600 // 60, off % 60
        db.set(cid, "CANDIDATE", rights=rights[r["creator"]], src_path=out, src_offset=r["trigger_ts"] - min(off, BEFORE) - lead,
               win_start=0, win_end=dur, url=f"https://www.twitch.tv/videos/{vod_id}?t={h}h{m}m{s}s", error=None, attempts=0)
        db.event("vod", f"moment #{cid} ({r['creator']}) récupéré depuis la rediffusion")
        log("vod", f"#{cid}: {dur:.0f}s récupérées -> en file")


if __name__ == "__main__":
    backfill(sys.argv[1], float(sys.argv[2]), [int(x) for x in sys.argv[3:]])
