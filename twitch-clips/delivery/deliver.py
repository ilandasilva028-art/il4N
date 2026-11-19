"""Delivery folder output/ready/<id>_<creator>_<stamp>/ with clip_final.mp4, description_tiktok.txt,
metadata.json. Sending to the chat is done by the assistant during an active turn; this module only
lists what is READY and not yet SENT, and records deliveries. Nothing is ever published to TikTok.

CLI:
  python delivery/deliver.py pending          # list READY clips not sent yet
  python delivery/deliver.py mark-sent 12 13  # record that clips 12 and 13 were delivered
"""
import json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import DB_PATH, OUT  # noqa: E402
from database.state import DB  # noqa: E402

PUBLISHING_ENABLED = False      # hard switch: this project never publishes anywhere


def pending(db):
    out = []
    for r in db.by_state("READY"):
        d = r["out_dir"]
        if d and os.path.exists(os.path.join(d, "clip_final.mp4")):
            out.append((r["id"], d, r["score"]))
    return out


def mark_sent(db, ids):
    for i in ids:
        r = db.get(int(i))
        if r and r["state"] == "READY":
            db.set(int(i), "SENT", sent_at=time.time())
            meta = os.path.join(r["out_dir"], "metadata.json")
            if os.path.exists(meta):
                m = json.load(open(meta))
                m["delivery"] = {"state": "SENT", "at": time.strftime("%Y-%m-%d %H:%M:%S")}
                tmp = meta + ".part"
                json.dump(m, open(tmp, "w"), ensure_ascii=False, indent=2)
                os.replace(tmp, meta)


if __name__ == "__main__":
    db = DB(DB_PATH)
    cmd = sys.argv[1] if len(sys.argv) > 1 else "pending"
    if cmd == "pending":
        for i, d, s in pending(db):
            print(f"{i}\t{s}\t{d}")
    elif cmd == "mark-sent":
        mark_sent(db, sys.argv[2:])
        print("ok")
