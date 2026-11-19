#!/usr/bin/env python3
"""YouTube discovery with the official YouTube Data API v3 (metadata only, never a downloader).

Set YOUTUBE_API_KEY (free key, Google Cloud console) and add channel IDs in config.yaml (youtube.channel_ids).
Host needed through the proxy: www.googleapis.com.
Videos are stored as DISCOVERED sources with a simple interest ranking (views/hour + title keywords).
To make TikToks from a video you own or are authorized to use, put the file on disk and run:
  main.py local <file> --creator <name> --rights owned|authorized --url <youtube url>
(several distinct moments are extracted from one long video).

  python sources/youtube_source.py
"""
import os, re, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests  # noqa: E402
from common import DB_PATH, load_config, log  # noqa: E402
from database.state import DB  # noqa: E402

API = "https://www.googleapis.com/youtube/v3"
KEYWORDS = re.compile(r"(fou rire|r[ée]action|fail|wtf|incroyable|pi[èe]ge|choc|best of|moments?|insolite|dr[ôo]le)", re.I)


def discover():
    cfg = load_config()
    yt = cfg.get("youtube", {})
    key = os.environ.get(yt.get("api_key_env", "YOUTUBE_API_KEY"))
    if not key:
        log("youtube", "BLOCKED: YOUTUBE_API_KEY not set")
        return None
    if not yt.get("channel_ids"):
        log("youtube", "no channel_ids configured in config.yaml (youtube.channel_ids)")
        return []
    db, out = DB(DB_PATH), []
    for chid in yt["channel_ids"]:
        c = requests.get(f"{API}/channels", timeout=20,
                         params={"part": "contentDetails,snippet", "id": chid, "key": key}).json()
        if not c.get("items"):
            log("youtube", f"channel {chid}: not found / API error {c.get('error', {}).get('message')}")
            continue
        name = c["items"][0]["snippet"]["title"]
        uploads = c["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        pl = requests.get(f"{API}/playlistItems", timeout=20, params={
            "part": "contentDetails", "playlistId": uploads, "maxResults": yt.get("max_results", 10), "key": key}).json()
        ids = [i["contentDetails"]["videoId"] for i in pl.get("items", [])]
        if not ids:
            continue
        v = requests.get(f"{API}/videos", timeout=20, params={
            "part": "snippet,statistics,contentDetails", "id": ",".join(ids), "key": key}).json()
        for it in v.get("items", []):
            sn, st = it["snippet"], it.get("statistics", {})
            age_h = max(1, (datetime.now(timezone.utc) -
                            datetime.fromisoformat(sn["publishedAt"].replace("Z", "+00:00"))).total_seconds() / 3600)
            vph = int(st.get("viewCount", 0)) / age_h
            kw = len(KEYWORDS.findall(sn["title"] + " " + sn.get("description", "")[:500]))
            interest = round(vph * (1 + 0.5 * kw), 1)
            url = f"https://www.youtube.com/watch?v={it['id']}"
            new = db.add_source("youtube", name, it["id"], url, sn["title"], "discovered",
                                {"published": sn["publishedAt"], "views": st.get("viewCount"),
                                 "duration": it["contentDetails"]["duration"], "interest": interest})
            out.append((interest, name, sn["title"], url, new))
    out.sort(reverse=True)
    for i, name, title, url, new in out[:15]:
        log("youtube", f"{'NEW ' if new else '    '}{i:>9}  {name[:15]:<15} {title[:55]}  {url}")
    return out


if __name__ == "__main__":
    discover()
