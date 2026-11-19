#!/usr/bin/env python3
"""Existing Twitch clips via the official Helix API (metadata only).

Needs an app from https://dev.twitch.tv/console (free): set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.
Hosts needed through the proxy: id.twitch.tv, api.twitch.tv.
Clips are stored as DISCOVERED sources (link, creator of the clip, views, date). Nothing is downloaded:
Helix gives no download URL, and reuse needs the streamer's permission anyway.

  python sources/twitch_clips.py [hours=24]
"""
import os, sys, time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests  # noqa: E402
from common import DB_PATH, load_config, log  # noqa: E402
from database.state import DB  # noqa: E402


def token(cid, secret):
    r = requests.post("https://id.twitch.tv/oauth2/token", timeout=20,
                      data={"client_id": cid, "client_secret": secret, "grant_type": "client_credentials"})
    r.raise_for_status()
    return r.json()["access_token"]


def fetch(hours=24):
    cfg = load_config()
    ta = cfg.get("twitch_api", {})
    cid, secret = os.environ.get(ta.get("client_id_env", "")), os.environ.get(ta.get("client_secret_env", ""))
    if not cid or not secret:
        log("twitch_clips", "BLOCKED: TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET not set (free app on dev.twitch.tv)")
        return None
    h = {"Client-Id": cid, "Authorization": f"Bearer {token(cid, secret)}"}
    db, since = DB(DB_PATH), datetime.now(timezone.utc) - timedelta(hours=hours)
    out = []
    for ch in cfg["channels"]:
        u = requests.get("https://api.twitch.tv/helix/users", headers=h, params={"login": ch["name"]}, timeout=20)
        u.raise_for_status()
        data = u.json().get("data") or []
        if not data:
            continue
        r = requests.get("https://api.twitch.tv/helix/clips", headers=h, timeout=20, params={
            "broadcaster_id": data[0]["id"], "started_at": since.strftime("%Y-%m-%dT%H:%M:%SZ"), "first": 50})
        r.raise_for_status()
        for c in r.json().get("data", []):
            age_h = max(0.5, (datetime.now(timezone.utc) -
                              datetime.fromisoformat(c["created_at"].replace("Z", "+00:00"))).total_seconds() / 3600)
            c["views_per_hour"] = round(c["view_count"] / age_h, 1)
            new = db.add_source("twitch_clip", ch["name"], c["id"], c["url"], c["title"], ch["rights"],
                                {k: c[k] for k in ("creator_name", "created_at", "view_count", "duration",
                                                   "vod_offset", "views_per_hour", "game_id")})
            out.append((c["views_per_hour"], ch["name"], c["title"], c["url"], new))
    out.sort(reverse=True)
    for v, ch, title, url, new in out[:15]:
        log("twitch_clips", f"{'NEW ' if new else '    '}{v:>8} vues/h  {ch:<10} {title[:50]}  {url}")
    return out


if __name__ == "__main__":
    fetch(int(sys.argv[1]) if len(sys.argv) > 1 else 24)
