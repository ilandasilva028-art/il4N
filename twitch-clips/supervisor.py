#!/usr/bin/env python3
"""Keeps every worker alive: one `main.py watch <channel>` per configured channel + one `main.py process`.

Single instance (file lock). Runs recover.py first. Restarts dead workers with backoff.
This only lives as long as the machine: in an ephemeral cloud container it stops at every restart
and must be started again (./start.sh). On a permanent machine, run start.sh from systemd/cron @reboot.
"""
import fcntl, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import DB_PATH, OUT, PY_HEAVY, ROOT, ensure_dirs, load_config, log
from database.state import DB
from recover import recover


def main():
    ensure_dirs()
    os.makedirs(os.path.join(OUT, "logs"), exist_ok=True)
    lock = open(os.path.join(OUT, "supervisor.lock"), "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("supervisor already running"); return
    db = DB(DB_PATH)
    recover(db)
    cfg = load_config()
    workers = {f"watch:{c['name']}": ["watch", c["name"]] for c in cfg["channels"]}
    workers["process"] = ["process"]
    procs, backoff = {}, {}
    while True:
        for name, args in workers.items():
            p = procs.get(name)
            if p is None or p.poll() is not None:
                if p is not None:
                    log("supervisor", f"{name} exited ({p.returncode}), restarting")
                    db.error("supervisor", f"{name} exited with {p.returncode}")
                wait = backoff.get(name, 0)
                if wait and time.time() < wait:
                    continue
                logf = open(os.path.join(OUT, "logs", name.replace(":", "_") + ".log"), "a")
                procs[name] = subprocess.Popen([PY_HEAVY, "-u", os.path.join(ROOT, "main.py"), *args],
                                               stdout=logf, stderr=subprocess.STDOUT, cwd=ROOT)
                backoff[name] = time.time() + 20
        db.beat("supervisor", ",".join(f"{n}:{'up' if p.poll() is None else 'down'}" for n, p in procs.items()))
        time.sleep(10)


if __name__ == "__main__":
    main()
