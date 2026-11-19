"""Shared helpers: config, paths, logging, atomic writes."""
import json, os, sys, time
from datetime import datetime

import yaml

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("CLIP_OUT", os.path.join(ROOT, "output"))   # tests use their own folder
DB_PATH = os.path.join(OUT, "state.db")
def _heavy_python():
    """Python that has faster-whisper: SUB_PYTHON, the cloud env, the local .venv, else this interpreter."""
    for p in (os.environ.get("SUB_PYTHON"), "/home/user/tts-env/bin/python", os.path.join(ROOT, ".venv", "bin", "python")):
        if p and os.path.exists(p):
            return p
    return sys.executable


PY_HEAVY = _heavy_python()


def load_config(path=None):
    with open(path or os.path.join(ROOT, "config.yaml")) as f:
        cfg = yaml.safe_load(f)
    for ch in cfg.get("channels", []):
        if ch.get("rights") not in ("discovered", "authorized", "owned"):
            raise ValueError(f"channel {ch.get('name')}: rights must be discovered|authorized|owned")
    return cfg


def can_download(rights):
    return rights in ("authorized", "owned")


def log(component, msg):
    print(f"[{datetime.now():%H:%M:%S}] {component}: {msg}", flush=True)


def atomic_write_text(path, text):
    tmp = path + ".part"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
        f.flush(); os.fsync(f.fileno())
    os.replace(tmp, path)


def atomic_write_json(path, obj):
    atomic_write_text(path, json.dumps(obj, ensure_ascii=False, indent=2))


def ensure_dirs():
    for d in ("buffer", "candidates", "ready", "archive"):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)


def now():
    return time.time()
