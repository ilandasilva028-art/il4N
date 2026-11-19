#!/usr/bin/env python3
"""Run at every (re)start: clean partial files and put interrupted work back in a resumable state.

- *.part / *.part.mp4 files are deleted (never a valid result).
- RENDERING -> ANALYZED (render again), or FAILED after 3 attempts.
- READY/VALIDATED: the final file is re-validated; if broken -> ANALYZED (re-render from the source).
- CANDIDATE without footage after 15 min -> FAILED (the live buffer is gone).
SENT clips are never touched, so nothing is delivered twice.
"""
import glob, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import DB_PATH, OUT, log
from database.state import DB
from delivery.validate import validate


def recover(db=None):
    db = db or DB(DB_PATH)
    removed = 0
    for p in glob.glob(os.path.join(OUT, "**", "*.part*"), recursive=True):
        try:
            os.remove(p); removed += 1
        except OSError:
            pass
    fixed = []
    for r in db.by_state("RENDERING"):
        n = r["attempts"] or 0
        db.set(r["id"], "FAILED" if n >= 3 else "ANALYZED", error="interrupted during render")
        fixed.append((r["id"], "RENDERING->" + ("FAILED" if n >= 3 else "ANALYZED")))
    for r in db.by_state("VALIDATED", "READY"):
        f = os.path.join(r["out_dir"] or "", "clip_final.mp4")
        ok, info = validate(f) if os.path.exists(f) else (False, "missing")
        if not ok:
            src_ok = r["src_path"] and os.path.exists(r["src_path"])
            analysis = os.path.join(OUT, "candidates", str(r["id"]), "analysis.json")
            new = "ANALYZED" if src_ok and os.path.exists(analysis) else "FAILED"
            if new == "ANALYZED":
                db.set(r["id"], new, out_dir=os.path.dirname(analysis), error=f"final file invalid: {info}")
            else:
                db.set(r["id"], new, error=f"final file invalid: {info}")
            fixed.append((r["id"], f"{r['state']}->{new}"))
        elif r["state"] == "VALIDATED" and os.path.exists(os.path.join(r["out_dir"], "metadata.json")):
            db.set(r["id"], "READY"); fixed.append((r["id"], "VALIDATED->READY"))
    for r in db.by_state("CANDIDATE"):
        if not r["src_path"] and time.time() - r["created"] > 900:
            db.set(r["id"], "FAILED", error="footage lost (buffer gone before extraction)")
            fixed.append((r["id"], "CANDIDATE->FAILED"))
    log("recover", f"removed {removed} partial file(s); fixed {fixed or 'nothing'}")
    return removed, fixed


if __name__ == "__main__":
    recover()
