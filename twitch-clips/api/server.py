#!/usr/bin/env python3
"""Clip Factory Studio — API FastAPI (docs: /api/docs).

Lancer :  /home/user/tts-env/bin/python -m uvicorn api.server:app --host 127.0.0.1 --port 8000
Accès distant : définir DASHBOARD_TOKEN (obligatoire si host != 127.0.0.1) ; le navigateur envoie
"Authorization: Bearer <token>" (ou ?token= pour les médias).
Toutes les données viennent de output/state.db, config.yaml et des fichiers produits. Rien n'est simulé.
"""
import asyncio, fcntl, json, os, shutil, signal, subprocess, sys, threading, time
from typing import Literal, Optional

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import yaml  # noqa: E402
from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse  # noqa: E402
from pydantic import BaseModel, Field, field_validator  # noqa: E402

from common import DB_PATH, OUT, can_download, ensure_dirs, load_config  # noqa: E402
from database.state import DB  # noqa: E402

ensure_dirs()
TOKEN = os.environ.get("DASHBOARD_TOKEN", "")
CONFIG = os.path.join(ROOT, "config.yaml")
app = FastAPI(title="Clip Factory Studio API", version="1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
_local = threading.local()


def db() -> DB:
    if not getattr(_local, "db", None):
        _local.db = DB(DB_PATH)
    return _local.db


@app.middleware("http")
async def auth(request: Request, call_next):
    if TOKEN and request.url.path.startswith("/api") and request.url.path not in ("/api/health",):
        got = request.headers.get("authorization", "").removeprefix("Bearer ").strip() or request.query_params.get("token", "")
        if got != TOKEN:
            return JSONResponse({"detail": "Non autorisé : jeton du tableau de bord requis"}, status_code=401)
    return await call_next(request)


# ----------------------------------------------------------------------------- helpers
STATE_FR = {"DISCOVERED": "Repéré (non téléchargé)", "CANDIDATE": "À analyser", "ANALYZED": "Prêt à monter",
            "RENDERING": "Montage en cours", "VALIDATED": "Validation", "READY": "Terminé", "SENT": "Livré",
            "REJECTED": "Rejeté", "FAILED": "Erreur"}


def stage(r):
    st, ph = r["state"], r["phase"]
    if st == "CANDIDATE":
        return "Analyse en cours" if ph == "analyze" else "À analyser"
    if st == "RENDERING" and ph == "validate":
        return "Validation"
    return STATE_FR.get(st, st)


def read_cfg():
    return load_config(CONFIG)


def write_cfg(cfg):
    """Atomic config write under an exclusive lock (engine re-reads it)."""
    with open(CONFIG + ".lock", "w") as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        tmp = CONFIG + ".part"
        with open(tmp, "w") as f:
            f.write("# Géré par Clip Factory Studio (et éditable à la main). rights: discovered | authorized | owned\n")
            yaml.safe_dump(cfg, f, allow_unicode=True, sort_keys=False)
        os.replace(tmp, CONFIG)


def analysis(cid):
    p = os.path.join(OUT, "candidates", str(cid), "analysis.json")
    return json.load(open(p)) if os.path.exists(p) else None


def final_path(r):
    p = os.path.join(r["out_dir"] or "", "clip_final.mp4")
    return p if r["out_dir"] and os.path.exists(p) else None


def duration_of(r, a=None):
    if r["cut_start"] is not None and r["cut_end"] is not None:
        return round(r["cut_end"] - r["cut_start"], 1)
    return None


def clip_summary(r):
    sig = json.loads(r["signals"] or "[{}]")
    first = sig[0] if sig else {}
    return {"id": r["id"], "platform": r["platform"], "creator": r["creator"], "url": r["url"],
            "rights": r["rights"], "state": r["state"], "stage": stage(r), "score": r["score"],
            "detected_at": r["trigger_ts"] if r["platform"] == "twitch" else r["created"],
            "created": r["created"], "duration": duration_of(r), "kind": first.get("kind"),
            "chat_count": first.get("count"), "chat_baseline": first.get("baseline"),
            "category": first.get("category"), "hook": r["hook"], "title": r["title"],
            "approved": r["approved"], "error": r["error"], "progress": r["progress"], "phase": r["phase"],
            "has_video": bool(final_path(r) or (r["src_path"] and os.path.exists(r["src_path"]))),
            "has_final": bool(final_path(r)), "transcript": (r["transcript"] or "")[:300]}


def beats():
    out = {}
    for b in db().beats():
        info = b["info"]
        try:
            info = json.loads(info)
        except Exception:
            pass
        out[b["name"]] = {"age": round(time.time() - b["ts"]), "info": info}
    return out


def engine_state():
    hb = beats()
    sup = hb.get("supervisor")
    running = bool(sup and sup["age"] < 60)
    return {"running": running, "supervisor_age": sup and sup["age"],
            "processor_ok": bool(hb.get("process") and hb["process"]["age"] < 60),
            "workers": hb}


# ----------------------------------------------------------------------------- health / overview
@app.get("/api/health")
def health():
    return {"ok": True, "engine": engine_state()["running"], "time": time.time()}


@app.get("/api/overview")
def overview():
    c, cfg, hb = db().c, read_cfg(), beats()
    chans = cfg["channels"]
    live = [ch["name"] for ch in chans if isinstance((hb.get(f"watch:{ch['name']}") or {}).get("info"), dict)
            and hb[f"watch:{ch['name']}"]["info"].get("live") and hb[f"watch:{ch['name']}"]["age"] < 180]
    day0 = time.mktime(time.localtime()[:3] + (0, 0, 0, 0, 0, -1))
    q = lambda sql, *a: c.execute(sql, a).fetchone()[0]  # noqa: E731
    counts = db().counts()
    series = []
    for i in range(13, -1, -1):
        d0 = day0 - i * 86400
        series.append({"day": time.strftime("%d/%m", time.localtime(d0)),
                       "detected": q("SELECT COUNT(*) FROM clips WHERE created>=? AND created<?", d0, d0 + 86400),
                       "produced": q("SELECT COUNT(*) FROM clips WHERE state IN ('READY','SENT') AND finished>=? AND finished<?",
                                     d0, d0 + 86400)})
    ready = [clip_summary(r) for r in c.execute(
        "SELECT * FROM clips WHERE state IN ('READY','SENT') ORDER BY finished DESC LIMIT 4")]
    activity = [dict(r) for r in c.execute("SELECT ts, level, component, message FROM system_events ORDER BY id DESC LIMIT 12")]
    recent = [clip_summary(r) for r in c.execute("SELECT * FROM clips ORDER BY id DESC LIMIT 8")]
    return {"channels": len(chans), "enabled": sum(1 for ch in chans if ch.get("enabled", True)), "live": live,
            "detected_today": q("SELECT COUNT(*) FROM clips WHERE created>=?", day0),
            "to_analyze": counts.get("CANDIDATE", 0), "rendering": counts.get("RENDERING", 0) + counts.get("ANALYZED", 0),
            "ready": counts.get("READY", 0), "errors": counts.get("FAILED", 0)
            + q("SELECT COUNT(*) FROM errors WHERE ts>=?", day0),
            "counts": counts, "engine": engine_state(), "series": series, "ready_clips": ready,
            "activity": activity, "recent": recent}


# ----------------------------------------------------------------------------- engine control
@app.post("/api/engine/start")
def engine_start():
    subprocess.Popen(["bash", os.path.join(ROOT, "start.sh")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                     start_new_session=True)
    db().event("api", "démarrage du moteur demandé")
    return {"ok": True}


@app.post("/api/engine/stop")
def engine_stop():
    for pat in ("supervisor.py", "main.py watch", "main.py process"):
        subprocess.run(["pkill", "-f", pat])
    subprocess.run(["pkill", "-f", "streamlink twitch.tv"])
    db().event("api", "arrêt du moteur demandé", "warning")
    return {"ok": True}


# ----------------------------------------------------------------------------- channels (Twitch)
class ChannelIn(BaseModel):
    name: str = Field(pattern=r"^[A-Za-z0-9_]{3,25}$")
    rights: Literal["discovered", "authorized", "owned"] = "discovered"


class ChannelPatch(BaseModel):
    enabled: Optional[bool] = None
    rights: Optional[Literal["discovered", "authorized", "owned"]] = None
    layout: Optional[Literal["auto", "blur", "cam"]] = None
    cam_box: Optional[list[int]] = None
    sensitivity: Optional[Literal["basse", "normale", "haute"]] = None


SENS = {"basse": (8, 4.0), "normale": (5, 3.0), "haute": (3, 2.0)}


@app.get("/api/channels")
def channels():
    cfg, hb, c = read_cfg(), beats(), db().c
    out = []
    for ch in cfg["channels"]:
        b = hb.get(f"watch:{ch['name']}")
        info = b["info"] if b and isinstance(b["info"], dict) else {}
        fresh = bool(b and b["age"] < 180)
        n = c.execute("SELECT COUNT(*) FROM clips WHERE creator=?", (ch["name"],)).fetchone()[0]
        last = c.execute("SELECT MAX(created) FROM clips WHERE creator=?", (ch["name"],)).fetchone()[0]
        out.append({**ch, "enabled": ch.get("enabled", True), "sensitivity": ch.get("sensitivity", "normale"),
                    "worker": "actif" if fresh else ("arrêté" if not b else "sans signal"),
                    "heartbeat_age": b and b["age"], "live": info.get("live") if fresh else None,
                    "category": info.get("category") if fresh else None, "title": info.get("title") if fresh else None,
                    "recording": info.get("recording") if fresh else None, "clips": n, "last_event": last,
                    "avatar": info.get("avatar"), "url": f"https://www.twitch.tv/{ch['name']}"})
    return out


@app.post("/api/channels", status_code=201)
def add_channel(body: ChannelIn):
    cfg = read_cfg()
    if any(c["name"].lower() == body.name.lower() for c in cfg["channels"]):
        raise HTTPException(409, "Cette chaîne est déjà suivie")
    cfg["channels"].append({"name": body.name.lower(), "platform": "twitch", "rights": body.rights,
                            "enabled": True, "layout": "auto", "cam_box": None, "sensitivity": "normale"})
    write_cfg(cfg)
    db().event("api", f"chaîne ajoutée : {body.name}")
    return {"ok": True}


@app.patch("/api/channels/{name}")
def patch_channel(name: str, body: ChannelPatch):
    cfg = read_cfg()
    ch = next((c for c in cfg["channels"] if c["name"] == name), None)
    if not ch:
        raise HTTPException(404, "Chaîne inconnue")
    for k, v in body.model_dump(exclude_none=True).items():
        if k == "cam_box" and len(v) != 4:
            raise HTTPException(422, "cam_box = [x, y, largeur, hauteur]")
        ch[k] = v
    write_cfg(cfg)
    db().event("api", f"chaîne {name} modifiée : {body.model_dump(exclude_none=True)}")
    return {"ok": True}


@app.delete("/api/channels/{name}")
def delete_channel(name: str):
    cfg = read_cfg()
    n = len(cfg["channels"])
    cfg["channels"] = [c for c in cfg["channels"] if c["name"] != name]
    if len(cfg["channels"]) == n:
        raise HTTPException(404, "Chaîne inconnue")
    write_cfg(cfg)
    db().event("api", f"chaîne supprimée : {name}", "warning")
    return {"ok": True}


@app.post("/api/channels/{name}/refresh")
def refresh_channel(name: str):
    from sources.twitch_live import live_status
    live, cat, title = live_status(name, timeout=30)
    return {"live": live, "category": cat, "title": title, "checked_at": time.time()}


@app.get("/api/channels/{name}/events")
def channel_events(name: str, limit: int = 50):
    return [clip_summary(r) for r in db().c.execute(
        "SELECT * FROM clips WHERE creator=? ORDER BY id DESC LIMIT ?", (name, limit))]


# ----------------------------------------------------------------------------- clips
@app.get("/api/clips")
def list_clips(platform: Optional[str] = None, creator: Optional[str] = None, state: Optional[str] = None,
               min_score: Optional[float] = None, q: Optional[str] = None, since: Optional[float] = None,
               min_dur: Optional[float] = None, max_dur: Optional[float] = None, order: str = "recent",
               limit: int = Query(200, le=1000)):
    sql, args = "SELECT * FROM clips WHERE 1=1", []
    for col, v in (("platform", platform), ("creator", creator), ("state", state)):
        if v:
            sql += f" AND {col}=?"; args.append(v)
    if min_score is not None:
        sql += " AND score>=?"; args.append(min_score)
    if since:
        sql += " AND created>=?"; args.append(since)
    if q:
        sql += " AND (creator LIKE ? OR url LIKE ? OR transcript LIKE ? OR hook LIKE ?)"; args += [f"%{q}%"] * 4
    sql += " ORDER BY " + ("score DESC NULLS LAST, id DESC" if order == "score" else "id DESC") + " LIMIT ?"
    args.append(limit)
    out = [clip_summary(r) for r in db().c.execute(sql, args)]
    if min_dur is not None:
        out = [c for c in out if c["duration"] and c["duration"] >= min_dur]
    if max_dur is not None:
        out = [c for c in out if c["duration"] and c["duration"] <= max_dur]
    return out


@app.get("/api/clips/{cid}")
def get_clip(cid: int):
    r = db().get(cid)
    if not r:
        raise HTTPException(404, "Clip introuvable")
    a = analysis(cid)
    meta, desc = None, None
    if final_path(r):
        mp = os.path.join(r["out_dir"], "metadata.json")
        meta = json.load(open(mp)) if os.path.exists(mp) else None
        dp = os.path.join(r["out_dir"], "description_tiktok.txt")
        desc = open(dp, encoding="utf-8").read() if os.path.exists(dp) else None
    hist = [dict(h) for h in db().c.execute("SELECT * FROM delivery_history WHERE clip_id=? ORDER BY id", (cid,))]
    src_dur = None
    if r["src_path"] and os.path.exists(r["src_path"]):
        src_dur = r["win_end"]
    return {**clip_summary(r), "signals": json.loads(r["signals"] or "[]"),
            "score_detail": json.loads(r["score_detail"]) if r["score_detail"] else None,
            "analysis": a and {"transcript": a["transcript"], "cut": a["cut"], "features": a["features"],
                               "audio": a["audio"], "visual": a.get("visual"), "chat": a["chat"]},
            "metadata": meta, "description": desc, "render_params": json.loads(r["render_params"] or "{}"),
            "history": hist, "source_duration": src_dur, "win_start": r["win_start"], "win_end": r["win_end"],
            "review_note": r["review_note"]}


@app.get("/api/clips/{cid}/media")
def clip_media(cid: int, kind: Literal["final", "source"] = "final"):
    r = db().get(cid)
    if not r:
        raise HTTPException(404, "Clip introuvable")
    p = final_path(r) if kind == "final" else (r["src_path"] if r["src_path"] and os.path.exists(r["src_path"]) else None)
    if not p:
        raise HTTPException(404, "Vidéo non disponible pour ce clip")
    if p.endswith(".ts"):           # browsers can't play MPEG-TS: make a light mp4 proxy once
        prox = os.path.join(OUT, "candidates", str(cid), "preview.mp4")
        if not os.path.exists(prox):
            tmp = prox + ".part.mp4"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, "-vf", "scale=-2:480", "-c:v", "libx264",
                            "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
                            tmp], check=False)
            if not os.path.exists(tmp):
                raise HTTPException(500, "Aperçu impossible à générer")
            os.replace(tmp, prox)
        p = prox
    return FileResponse(p, media_type="video/mp4")


@app.get("/api/clips/{cid}/thumb")
def clip_thumb(cid: int):
    r = db().get(cid)
    if not r:
        raise HTTPException(404, "Clip introuvable")
    d = os.path.join(OUT, "candidates", str(cid)); os.makedirs(d, exist_ok=True)
    th = os.path.join(d, "thumb.jpg")
    if not os.path.exists(th):
        src = final_path(r) or (r["src_path"] if r["src_path"] and os.path.exists(r["src_path"]) else None)
        if not src:
            raise HTTPException(404, "Pas de vidéo, donc pas de miniature")
        t = 1.0 if final_path(r) else max(0, (r["cut_start"] or (r["win_end"] or 2) / 2))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", src, "-frames:v", "1",
                        "-vf", "scale=360:-2", th + ".part.jpg"], check=False)
        if not os.path.exists(th + ".part.jpg"):
            raise HTTPException(500, "Miniature impossible")
        os.replace(th + ".part.jpg", th)
    return FileResponse(th, media_type="image/jpeg")


class RenderIn(BaseModel):
    start: float = Field(ge=0)
    end: float = Field(gt=0)
    layout: Literal["auto", "blur", "cam"] = "auto"
    cam_box: Optional[list[int]] = None
    hook: Optional[str] = Field(default=None, max_length=90)
    sub_y: int = Field(default=1330, ge=200, le=1800)
    font_size: int = Field(default=72, ge=36, le=120)
    color: str = Field(default="#FFFFFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    highlight: str = Field(default="#FFE500", pattern=r"^#[0-9A-Fa-f]{6}$")

    @field_validator("end")
    @classmethod
    def _dur(cls, v, info):
        s = info.data.get("start", 0)
        if not (5 <= v - s <= 90):
            raise ValueError("la durée doit être comprise entre 5 et 90 s")
        return v


@app.post("/api/clips/{cid}/render")
def render_clip(cid: int, body: RenderIn):
    r = db().get(cid)
    if not r:
        raise HTTPException(404, "Clip introuvable")
    if not can_download(r["rights"]):
        raise HTTPException(403, "Droits insuffisants : la source n'est pas autorisée à la réutilisation")
    if not analysis(cid):
        raise HTTPException(409, "Le clip doit d'abord être analysé")
    if r["state"] in ("RENDERING",):
        raise HTTPException(409, "Un rendu est déjà en cours pour ce clip")
    if body.layout == "cam" and (not body.cam_box or len(body.cam_box) != 4):
        raise HTTPException(422, "Mode webcam : indiquez le cadre de la webcam")
    db().set(cid, "ANALYZED", render_params=json.dumps(body.model_dump()), error=None, attempts=0,
             approved=None, progress=0, phase="queued")
    db().delivery(cid, "render_requested", body.model_dump_json())
    db().event("studio", f"rendu demandé pour le clip #{cid}")
    return {"ok": True, "queued": True}


@app.post("/api/clips/{cid}/retry")
def retry(cid: int):
    r = db().get(cid)
    if not r or r["state"] not in ("FAILED", "REJECTED"):
        raise HTTPException(409, "Seuls les clips en erreur ou rejetés peuvent être relancés")
    if not can_download(r["rights"]):
        raise HTTPException(403, "Droits insuffisants pour traiter ce clip")
    new = "ANALYZED" if analysis(cid) else ("CANDIDATE" if r["src_path"] and os.path.exists(r["src_path"]) else None)
    if not new:
        raise HTTPException(409, "La vidéo source n'existe plus : impossible de relancer")
    db().set(cid, new, attempts=0, error=None, phase=None, cancel_requested=0)
    db().event("production", f"clip #{cid} relancé ({new})")
    return {"ok": True, "state": new}


@app.post("/api/clips/{cid}/cancel")
def cancel(cid: int):
    r = db().get(cid)
    if not r:
        raise HTTPException(404, "Clip introuvable")
    if r["state"] == "RENDERING":
        db().set(cid, cancel_requested=1)
        return {"ok": True, "message": "Annulation demandée (le rendu s'arrête dans la seconde)"}
    if r["state"] in ("CANDIDATE", "ANALYZED"):
        db().set(cid, "REJECTED", error="annulé depuis le tableau de bord", phase=None)
        return {"ok": True}
    raise HTTPException(409, "Ce clip n'est pas en cours de traitement")


class ReviewIn(BaseModel):
    decision: Literal["approve", "reject"]
    note: Optional[str] = Field(default=None, max_length=500)


@app.post("/api/clips/{cid}/review")
def review(cid: int, body: ReviewIn):
    r = db().get(cid)
    if not r or not final_path(r):
        raise HTTPException(409, "Aucune vidéo terminée à valider")
    db().set(cid, approved=1 if body.decision == "approve" else 0, review_note=body.note)
    db().delivery(cid, body.decision, body.note or "")
    return {"ok": True}


class ReadyEdit(BaseModel):
    title: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = Field(default=None, max_length=2200)


@app.patch("/api/clips/{cid}/ready")
def edit_ready(cid: int, body: ReadyEdit):
    r = db().get(cid)
    if not r or not final_path(r):
        raise HTTPException(404, "Vidéo terminée introuvable")
    if body.title is not None:
        db().set(cid, title=body.title)
    if body.description is not None:
        tags = [w for w in body.description.split() if w.startswith("#")]
        if len(tags) != 5:
            raise HTTPException(422, f"La description doit contenir exactement 5 hashtags (actuellement {len(tags)})")
        if "Crédit : @" not in body.description:
            raise HTTPException(422, "Le crédit du créateur (« Crédit : @… ») est obligatoire")
        p = os.path.join(r["out_dir"], "description_tiktok.txt")
        with open(p + ".part", "w", encoding="utf-8") as f:
            f.write(body.description)
        os.replace(p + ".part", p)
    db().delivery(cid, "edited", body.model_dump_json(exclude_none=True))
    return {"ok": True}


@app.get("/api/clips/{cid}/download")
def download(cid: int):
    r = db().get(cid)
    if not r or not final_path(r):
        raise HTTPException(404, "Vidéo terminée introuvable")
    if not can_download(r["rights"]):
        raise HTTPException(403, "Export bloqué : l'autorisation de réutilisation n'est pas établie pour cette source")
    if r["approved"] != 1:
        raise HTTPException(403, "Export bloqué : acceptez d'abord le clip")
    db().delivery(cid, "downloaded")
    if r["state"] == "READY":
        db().set(cid, "SENT", sent_at=time.time())
    return FileResponse(final_path(r), media_type="video/mp4", filename=f"{r['creator']}_{cid}.mp4")


@app.get("/api/ready")
def ready():
    out = []
    for r in db().c.execute("SELECT * FROM clips WHERE state IN ('READY','SENT') ORDER BY finished DESC"):
        if not final_path(r):
            continue
        dp = os.path.join(r["out_dir"], "description_tiktok.txt")
        mp = os.path.join(r["out_dir"], "metadata.json")
        out.append({**clip_summary(r), "description": open(dp, encoding="utf-8").read() if os.path.exists(dp) else "",
                    "metadata": json.load(open(mp)) if os.path.exists(mp) else None,
                    "export_allowed": can_download(r["rights"]) and r["approved"] == 1})
    return out


# ----------------------------------------------------------------------------- production queue
@app.get("/api/jobs")
def jobs():
    rows = db().c.execute("SELECT * FROM clips WHERE state IN ('CANDIDATE','ANALYZED','RENDERING','VALIDATED','FAILED') "
                          "OR (state IN ('READY','SENT') AND finished > ?) ORDER BY id DESC LIMIT 200",
                          (time.time() - 86400,)).fetchall()
    out = []
    for r in rows:
        s = clip_summary(r)
        s["elapsed"] = round((r["finished"] or time.time()) - r["started"]) if r["started"] else None
        s["waiting_source"] = r["state"] == "CANDIDATE" and not r["src_path"]
        out.append(s)
    return out


# ----------------------------------------------------------------------------- YouTube
@app.get("/api/youtube/search")
def yt_search(q: str = Query(min_length=2), published_after: Optional[str] = None,
              duration: Literal["any", "short", "medium", "long"] = "any"):
    import requests
    cfg = read_cfg()
    key = os.environ.get(cfg.get("youtube", {}).get("api_key_env", "YOUTUBE_API_KEY"))
    if not key:
        raise HTTPException(503, "Recherche YouTube indisponible : clé YOUTUBE_API_KEY non configurée côté serveur")
    p = {"part": "snippet", "q": q, "type": "video", "maxResults": 20, "key": key, "videoDuration": duration,
         "relevanceLanguage": "fr"}
    if published_after:
        p["publishedAfter"] = published_after
    try:
        r = requests.get("https://www.googleapis.com/youtube/v3/search", params=p, timeout=20)
    except Exception as e:
        raise HTTPException(502, f"YouTube injoignable depuis le serveur : {type(e).__name__}")
    if r.status_code != 200:
        raise HTTPException(502, f"Erreur API YouTube : {r.json().get('error', {}).get('message', r.status_code)}")
    return [{"id": it["id"]["videoId"], "title": it["snippet"]["title"], "channel": it["snippet"]["channelTitle"],
             "published": it["snippet"]["publishedAt"], "thumb": it["snippet"]["thumbnails"]["medium"]["url"],
             "url": f"https://www.youtube.com/watch?v={it['id']['videoId']}"} for it in r.json().get("items", [])]


@app.get("/api/youtube/sources")
def yt_sources():
    return [dict(r) | {"meta": json.loads(r["meta"] or "{}")} for r in db().c.execute(
        "SELECT * FROM sources WHERE platform='youtube' ORDER BY id DESC LIMIT 200")]


class YtChannel(BaseModel):
    channel_id: str = Field(pattern=r"^UC[A-Za-z0-9_-]{20,24}$")


@app.post("/api/youtube/channels")
def yt_add(body: YtChannel):
    cfg = read_cfg()
    ids = cfg.setdefault("youtube", {}).setdefault("channel_ids", [])
    if body.channel_id in ids:
        raise HTTPException(409, "Chaîne déjà suivie")
    ids.append(body.channel_id); write_cfg(cfg)
    return {"ok": True}


@app.delete("/api/youtube/channels/{channel_id}")
def yt_del(channel_id: str):
    cfg = read_cfg()
    ids = cfg.get("youtube", {}).get("channel_ids", [])
    if channel_id not in ids:
        raise HTTPException(404, "Chaîne inconnue")
    ids.remove(channel_id); write_cfg(cfg)
    return {"ok": True}


@app.post("/api/youtube/discover")
def yt_discover():
    from sources.youtube_source import discover
    res = discover()
    if res is None:
        raise HTTPException(503, "Découverte YouTube indisponible : clé YOUTUBE_API_KEY non configurée")
    return {"found": len(res)}


@app.post("/api/import", status_code=202)
async def import_local(file: UploadFile = File(...), creator: str = Form(..., pattern=r"^[\w .-]{2,40}$"),
                       rights: Literal["owned", "authorized"] = Form(...), url: Optional[str] = Form(None),
                       category: Optional[str] = Form(None), max_moments: int = Form(5, ge=1, le=10)):
    if not (file.filename or "").lower().endswith((".mp4", ".mov", ".mkv", ".webm", ".ts")):
        raise HTTPException(422, "Format vidéo non pris en charge (mp4, mov, mkv, webm, ts)")
    d = os.path.join(OUT, "imports"); os.makedirs(d, exist_ok=True)
    dest = os.path.join(d, f"{int(time.time())}_{os.path.basename(file.filename)}")
    with open(dest + ".part", "wb") as f:
        while chunk := await file.read(1 << 20):
            f.write(chunk)
    os.replace(dest + ".part", dest)
    db().event("import", f"vidéo importée : {os.path.basename(dest)} ({rights})")

    def work():
        import main
        try:
            ids = main.add_local(dest, creator, rights, url, category, max_moments)
            DB(DB_PATH).event("import", f"{len(ids)} moment(s) candidat(s) depuis {os.path.basename(dest)}")
        except BaseException as e:
            DB(DB_PATH).error("import", e)
    threading.Thread(target=work, daemon=True).start()
    return {"ok": True, "file": os.path.basename(dest)}


# ----------------------------------------------------------------------------- stats
@app.get("/api/stats")
def stats():
    c = db().c
    q = lambda sql, *a: c.execute(sql, a).fetchone()[0]  # noqa: E731
    total = q("SELECT COUNT(*) FROM clips")
    finished = q("SELECT COUNT(*) FROM clips WHERE state IN ('READY','SENT')")
    failed = q("SELECT COUNT(*) FROM clips WHERE state='FAILED'")
    per = [dict(r) for r in c.execute(
        "SELECT creator, COUNT(*) AS detected, SUM(state IN ('READY','SENT')) AS produced, "
        "SUM(approved=1) AS approved, ROUND(AVG(score),1) AS avg_score FROM clips GROUP BY creator ORDER BY detected DESC")]
    week0 = time.time() - 8 * 7 * 86400
    weekly = [dict(r) for r in c.execute(
        "SELECT strftime('%Y-S%W', created, 'unixepoch', 'localtime') AS week, COUNT(*) AS detected, "
        "SUM(state IN ('READY','SENT')) AS produced FROM clips WHERE created>=? GROUP BY week ORDER BY week", (week0,))]
    return {"detected": total, "approved": q("SELECT COUNT(*) FROM clips WHERE approved=1"),
            "rejected": q("SELECT COUNT(*) FROM clips WHERE state='REJECTED' OR approved=0"),
            "produced": finished, "failed": failed,
            "error_rate": round(failed / (finished + failed), 3) if finished + failed else None,
            "avg_duration": q("SELECT ROUND(AVG(cut_end-cut_start),1) FROM clips WHERE state IN ('READY','SENT')"),
            "avg_processing": q("SELECT ROUND(AVG(finished-started)) FROM clips WHERE finished IS NOT NULL AND started IS NOT NULL"),
            "by_creator": per, "weekly": weekly, "tiktok": None}


# ----------------------------------------------------------------------------- settings
class SettingsIn(BaseModel):
    detection: Optional[dict] = None
    scoring: Optional[dict] = None
    cut: Optional[dict] = None
    render: Optional[dict] = None
    subtitles: Optional[dict] = None


LIMITS = {"detection.min_messages": (1, 100), "detection.ratio": (1.0, 20.0), "detection.cooldown_seconds": (10, 3600),
          "detection.chat_lag_seconds": (0, 30), "cut.min": (5, 60), "cut.max": (10, 120), "cut.target": (5, 90),
          "scoring.priority": (0, 100), "scoring.review": (0, 100), "render.crf": (14, 35), "render.max_parallel": (1, 2),
          "render.fps": (24, 60), "subtitles.font_size": (36, 120), "subtitles.position_y": (200, 1800)}


@app.get("/api/settings")
def get_settings():
    cfg = read_cfg()
    du = shutil.disk_usage(OUT)
    size = lambda p: sum(os.path.getsize(os.path.join(a, f)) for a, _, fs in os.walk(p) for f in fs) if os.path.isdir(p) else 0  # noqa: E731
    keys = {k: bool(os.environ.get(v)) for k, v in (("twitch_client_id", cfg["twitch_api"]["client_id_env"]),
                                                    ("twitch_client_secret", cfg["twitch_api"]["client_secret_env"]),
                                                    ("youtube_api_key", cfg["youtube"]["api_key_env"]))}
    return {"detection": cfg["detection"], "scoring": cfg["scoring"], "cut": cfg["cut"], "render": cfg["render"],
            "subtitles": cfg.get("subtitles", {}), "youtube_channels": cfg.get("youtube", {}).get("channel_ids", []),
            "output_dir": OUT, "api_keys_present": keys, "dashboard_auth": bool(TOKEN),
            "disk": {"total": du.total, "free": du.free,
                     "buffer": size(os.path.join(OUT, "buffer")), "candidates": size(os.path.join(OUT, "candidates")),
                     "ready": size(os.path.join(OUT, "ready"))}}


@app.put("/api/settings")
def put_settings(body: SettingsIn):
    cfg = read_cfg()
    for sec, vals in body.model_dump(exclude_none=True).items():
        for k, v in vals.items():
            if k not in cfg.get(sec, {}) and not (sec == "subtitles" and k in ("font_size", "color", "highlight", "position_y")):
                raise HTTPException(422, f"Paramètre inconnu : {sec}.{k}")
            lim = LIMITS.get(f"{sec}.{k}")
            if lim and not (isinstance(v, (int, float)) and lim[0] <= v <= lim[1]):
                raise HTTPException(422, f"{sec}.{k} doit être entre {lim[0]} et {lim[1]}")
            cfg.setdefault(sec, {})[k] = v
    if cfg["cut"]["min"] >= cfg["cut"]["max"]:
        raise HTTPException(422, "La durée minimale doit être inférieure à la durée maximale")
    write_cfg(cfg)
    db().event("api", "paramètres modifiés")
    return {"ok": True}


@app.post("/api/maintenance/clean-previews")
def clean_previews():
    """Frees disk space: deletes generated previews/thumbnails only (never sources nor final videos)."""
    n = 0
    for a, _, fs in os.walk(os.path.join(OUT, "candidates")):
        for f in fs:
            if f in ("preview.mp4", "thumb.jpg"):
                os.remove(os.path.join(a, f)); n += 1
    return {"deleted": n}


# ----------------------------------------------------------------------------- events + SSE
@app.get("/api/events")
def events(limit: int = 100):
    return [dict(r) for r in db().c.execute("SELECT * FROM system_events ORDER BY id DESC LIMIT ?", (limit,))]


@app.get("/api/stream")
async def stream(request: Request):
    async def gen():
        while not await request.is_disconnected():
            d = DB(DB_PATH)
            jobs_now = [{"id": r["id"], "state": r["state"], "stage": stage(r), "progress": r["progress"]}
                        for r in d.c.execute("SELECT * FROM clips WHERE state IN ('CANDIDATE','ANALYZED','RENDERING')")]
            payload = {"counts": d.counts(), "engine": engine_state()["running"], "jobs": jobs_now, "ts": time.time()}
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(2)
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


# Never: no publishing endpoint exists. Exports require rights + manual approval.
PUBLISHING_ENABLED = False
