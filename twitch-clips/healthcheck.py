#!/usr/bin/env python3
"""Status at a glance. Exit code 1 if a worker heartbeat is stale (> 3 min)."""
import json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import DB_PATH, OUT
from database.state import DB
from delivery.deliver import pending


def main():
    db = DB(DB_PATH)
    bad = 0
    print("== workers")
    for b in db.beats():
        age = time.time() - b["ts"]
        stale = age > 180
        bad += stale
        info = b["info"]
        try:
            i = json.loads(info); info = ", ".join(f"{k}={v}" for k, v in i.items())
        except Exception:
            pass
        print(f"  {'STALE' if stale else 'ok   '} {b['name']:<22} {int(age):>5}s ago  {info}")
    print("== buffers")
    bdir = os.path.join(OUT, "buffer")
    for ch in sorted(os.listdir(bdir)) if os.path.isdir(bdir) else []:
        print(f"  {ch:<12} {len(os.listdir(os.path.join(bdir, ch)))} segments")
    print("== clips by state:", db.counts())
    print("== ready, not sent:", [p[0] for p in pending(db)])
    for e in db.last_errors(5):
        print(f"  error {time.strftime('%H:%M:%S', time.localtime(e['ts']))} {e['component']}: {e['message'][:120]}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
