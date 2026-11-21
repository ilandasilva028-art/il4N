#!/usr/bin/env python3
"""Clip factory entry point (run with the env that has faster-whisper: /home/user/tts-env/bin/python).

  main.py watch <channel>                     chat watcher (+ recorder only if rights allow)
  main.py process                             candidate pipeline (one heavy job at a time)
  main.py local <file> --creator X --rights owned|authorized [--url U] [--category C] [--max 5]
  main.py once <clip_id>                      process a single clip now (debug)
"""
import argparse, json, os, sys, time, traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import DB_PATH, OUT, atomic_write_json, atomic_write_text, can_download, ensure_dirs, load_config, log
from database.state import DB
from detection.chat_detector import ChatDetector
from delivery.validate import validate
from editing import caption_generator, hook_generator, layout_detector, smart_cut, subtitles
from editing.render import render


def chan_cfg(cfg, name):
    return next((c for c in cfg["channels"] if c["name"] == name), {"name": name, "rights": "discovered"})


# ----------------------------------------------------------------------------------------- watch
def watch(name):
    from sources import twitch_live as tl
    cfg, db = load_config(), DB(DB_PATH)
    ch, d, r = chan_cfg(cfg, name), cfg["detection"], cfg["recording"]
    download = can_download(ch["rights"])
    seg_dir = os.path.join(OUT, "buffer", name)
    det = ChatDetector(d["bucket_seconds"], d["warmup_buckets"], d["history_buckets"], d["min_messages"],
                       d["ratio"], d["hype_ratio"], d["hype_min_messages"], d["cooldown_seconds"])
    chat = tl.Chat(name, log=lambda m: log(f"watch:{name}", m))
    rec, live, category, last_check, waiting = None, False, None, 0, []
    log(f"watch:{name}", f"rights={ch['rights']} -> {'record + clip' if download else 'chat only, no download'}")
    while True:
        now = time.time()
        if now - last_check > 60:
            try:                                  # sensitivity edited in the dashboard applies live
                ch = chan_cfg(load_config(), name)
                det.min_messages, det.ratio = {"basse": (8, 4.0), "haute": (3, 2.0)}.get(
                    ch.get("sensitivity"), (d["min_messages"], d["ratio"]))
            except Exception as e:
                db.error(f"watch:{name}", f"config: {e}")
            live, category, title = tl.live_status(name)
            last_check = now
            db.beat(f"watch:{name}", json.dumps({"live": live, "category": category, "title": title, "rights": ch["rights"],
                                                 "recording": bool(rec and rec.poll() is None)}))
            if live and download and (rec is None or rec.poll() is not None):
                rec = tl.start_recorder(name, seg_dir, r["quality"], r["segment_seconds"])
            if not live:
                tl.stop_recorder(rec); rec = None
        if not live:
            time.sleep(20); continue
        for m in chat.poll():
            det.add(m, time.time())
        ev = det.tick(time.time())
        if ev:
            ev["category"] = category
            url = f"https://www.twitch.tv/{name}"
            if download:
                cid = db.add_clip("twitch", name, f"live:{name}", url, ch["rights"], now, ev, "CANDIDATE",
                                  margin=d["cooldown_seconds"])
                if cid:
                    waiting.append((cid, now))
                    log(f"watch:{name}", f"candidate #{cid}: {ev['kind']} {ev['count']} msgs (usual ~{ev['baseline']})")
            else:
                cid = db.add_clip("twitch", name, f"live:{name}", url, ch["rights"], now, ev, "DISCOVERED",
                                  margin=d["cooldown_seconds"])
                if cid:
                    log(f"watch:{name}", f"discovered #{cid}: {ev['kind']} {ev['count']} msgs (not downloaded: rights)")
        for cid, trig in list(waiting):          # cut the window out of the ring buffer once recorded
            if tl.window_ready(seg_dir, trig + d["window_after"]):
                waiting.remove((cid, trig))
                try:
                    cdir = os.path.join(OUT, "candidates", str(cid)); os.makedirs(cdir, exist_ok=True)
                    path, t0 = tl.extract_window(seg_dir, trig - d["window_before"], trig + d["window_after"],
                                                 os.path.join(cdir, "source.ts"), r["segment_seconds"])
                    from delivery.validate import probe
                    dur = float(probe(path)["format"]["duration"])
                    db.set(cid, src_path=path, src_offset=t0, win_start=0, win_end=dur)
                except Exception as e:
                    db.set(cid, "FAILED", error=str(e)[:500]); db.error(f"watch:{name}", e)
        tl.prune(seg_dir, r["buffer_minutes"] * 60)


# --------------------------------------------------------------------------------------- process
def analyze(db, cfg, row):
    from detection import audio_detector, transcript_detector, viral_scorer
    d, sc = cfg["detection"], cfg["scoring"]
    src, ws, we = row["src_path"], row["win_start"] or 0, row["win_end"]
    signals = json.loads(row["signals"] or "[]")
    chat = next((s for s in signals if s.get("kind")), None)
    lag = d["chat_lag_seconds"] if row["platform"] == "twitch" else 0
    trigger = row["trigger_ts"] - (row["src_offset"] or 0)
    audio = audio_detector.analyze(src, ws, we - ws, use_ast=d.get("ast_on_candidates", True))
    if not audio.get("ok"):
        raise RuntimeError("no usable audio in window")
    peaks = [p + ws for p in audio["peaks"]]
    tr = transcript_detector.transcribe(src, ws, we, cfg["subtitles"]["whisper_model"])
    cut = smart_cut.choose(tr["segments"], peaks, trigger, lag, we, **{
        "cmin": cfg["cut"]["min"], "cmax": cfg["cut"]["max"], "target": cfg["cut"]["target"]})
    cut["start"] = max(cut["start"], ws)
    from detection import visual_detector
    cuts = visual_detector.scene_cuts(src, max(ws, cut["start"] - 0.5), cut["start"] + 2.5)
    after = [c for c in cuts if cut["start"] < c <= cut["start"] + 2.5 and cut["end"] - c >= cfg["cut"]["min"]]
    if after:                                   # don't open on the last second of the previous scene
        cut["start"], cut["start_reason"] = after[0], "scene cut"
        cut["duration"] = round(cut["end"] - cut["start"], 2)
    visual = {"cam_box": visual_detector.cam_box(src, cut["start"], cut["end"]), "scene_cuts": cuts}
    tf = transcript_detector.features(tr, cut["start"], cut["end"])
    letters = sum(ch.isalpha() for ch in tf["text"])
    latin = sum(ch.isascii() or ch in "éèêëàâäîïôöùûüçœÉÈÊÀÂÎÔÙÛÇ" for ch in tf["text"] if ch.isalpha())
    if tr["language"] not in ("fr", "en") or tf["n_words"] < 8 or (letters and latin / letters < 0.9):
        db.set(row["id"], "REJECTED", error=f"pas de parole exploitable (langue {tr['language']}, {tf['n_words']} mots)")
        log("process", f"#{row['id']} rejeté : pas de parole exploitable")
        return
    from delivery.validate import probe
    info = probe(src) or {}
    tech = {s.get("codec_type") for s in info.get("streams", [])} >= {"audio", "video"}
    s = viral_scorer.score(chat, audio, tf, tech, sc["weights"], sc["priority"], sc["review"])
    cdir = os.path.join(OUT, "candidates", str(row["id"]))
    os.makedirs(cdir, exist_ok=True)
    atomic_write_json(os.path.join(cdir, "analysis.json"),
                      {"transcript": tr, "cut": cut, "features": tf, "audio": {k: v for k, v in audio.items() if k != "curve"},
                       "chat": chat, "score": s, "visual": visual})
    if db.similar_transcript(row["creator"], tf["text"], exclude_id=row["id"]):
        db.set(row["id"], "REJECTED", error="duplicate transcript", score=s["total"], score_detail=json.dumps(s))
        return
    state = "ANALYZED" if s["decision"] != "ignore" else "REJECTED"
    db.set(row["id"], state, score=s["total"], score_detail=json.dumps(s), transcript=tf["text"],
           cut_start=cut["start"], cut_end=cut["end"], out_dir=cdir,
           error=None if state == "ANALYZED" else f"score {s['total']} < {sc['review']}")
    log("process", f"#{row['id']} score {s['total']} ({s['decision']}) cut {cut['duration']}s -> {state}")


def render_clip(db, cfg, row):
    a = json.load(open(os.path.join(OUT, "candidates", str(row["id"]), "analysis.json")))
    tr, tf, cut, chat, s = a["transcript"], a["features"], a["cut"], a["chat"], a["score"]
    ch = chan_cfg(cfg, row["creator"])
    display = row["creator"].replace("023", "").capitalize()
    db.set(row["id"], "RENDERING", attempts=(row["attempts"] or 0) + 1, phase="render", progress=0,
           started=time.time(), finished=None, cancel_requested=0)
    ov = json.loads(row["render_params"] or "{}")          # studio overrides (dashboard)
    st = (cfg.get("subtitles") or {})
    if ov.get("start") is not None and ov.get("end") is not None:
        cut = dict(cut, start=float(ov["start"]), end=float(ov["end"]))
    hook = ov.get("hook") or hook_generator.make(display, chat, tf, a["audio"], db.recent_hooks(row["creator"]),
                                                 seed=str(row["id"]))[0]
    translate = subtitles.translate_en_fr if tr["language"] != "fr" else None
    ass, mode, uncertain = subtitles.build(tr, cut["start"], cut["end"], hook=hook, translate=translate,
                                           sub_y=ov.get("sub_y") or st.get("position_y"),
                                           font_size=ov.get("font_size") or st.get("font_size", 72),
                                           color=ov.get("color") or st.get("color", "#FFFFFF"),
                                           highlight=ov.get("highlight") or st.get("highlight", "#FFE500"))
    lay = layout_detector.choose(ch, (a.get("visual") or {}).get("cam_box"))
    if ov.get("layout") == "blur":
        lay = {"mode": "blur", "reason": "studio"}
    elif ov.get("layout") == "cam" and ov.get("cam_box"):
        lay = {"mode": "cam", "cam_box": [int(v) for v in ov["cam_box"]], "reason": "studio"}
    stamp = time.strftime("%Y%m%d_%H%M%S", time.localtime(row["trigger_ts"] if row["platform"] == "twitch" else time.time()))
    out_dir = os.path.join(OUT, "ready", f"{row['id']}_{row['creator']}_{stamp}")
    os.makedirs(out_dir, exist_ok=True)
    final = os.path.join(out_dir, "clip_final.mp4")
    rc = cfg["render"]
    tmp = render(row["src_path"], cut["start"], cut["end"], final, lay, ass, rc["fps"], rc["crf"], rc["preset"],
                 on_progress=lambda f: db.set(row["id"], progress=round(f, 3)),
                 should_cancel=lambda: bool((db.get(row["id"]) or {})["cancel_requested"]))
    db.set(row["id"], phase="validate")
    ok, info = validate(tmp, min_dur=cfg["cut"]["min"] - 3, max_dur=max(cfg["cut"]["max"] + 15, cut["end"] - cut["start"] + 3))
    if not ok:
        os.remove(tmp)
        raise RuntimeError(f"validation failed: {info}")
    os.replace(tmp, final)
    db.set(row["id"], "VALIDATED", hook=hook)
    ev_kind = hook_generator.evidence_kind(chat, tf, a["audio"])
    category = (chat or {}).get("category") or (json.loads(row["signals"] or "[{}]")[0].get("category"))
    caption = caption_generator.make(display, row["creator"], ev_kind, tf.get("quote"), category,
                                     uncertain=bool(tf.get("uncertain")))
    atomic_write_text(os.path.join(out_dir, "description_tiktok.txt"), caption)
    atomic_write_json(os.path.join(out_dir, "metadata.json"), {
        "clip_id": row["id"], "platform": row["platform"], "creator": row["creator"], "source_url": row["url"],
        "source_ref": row["source_ref"], "rights": row["rights"],
        "moment_utc": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(row["trigger_ts"])) if row["platform"] == "twitch" else None,
        "cut_in_source_s": [cut["start"], cut["end"]], "duration_s": info["duration"],
        "score": s["total"], "score_detail": s["sub"], "decision": s["decision"], "evidence": ev_kind,
        "hook": hook, "subtitles": mode, "uncertain_words": uncertain[:10], "layout": lay,
        "validation": info, "delivery": {"state": "READY"}, "published": False})
    db.set(row["id"], "READY", out_dir=out_dir, phase=None, progress=1, finished=time.time())
    db.event("process", f"clip #{row['id']} ({row['creator']}) prêt")
    log("process", f"#{row['id']} READY -> {out_dir}")


def process_forever():
    cfg, db = load_config(), DB(DB_PATH)
    while True:
        db.beat("process")
        row = next(iter(db.by_state("ANALYZED")), None) or \
            next((r for r in db.by_state("CANDIDATE") if r["src_path"]), None)
        if not row:
            time.sleep(5); continue
        cfg = load_config()                       # settings edited in the dashboard apply to the next job
        try:
            if row["state"] == "CANDIDATE":
                db.set(row["id"], phase="analyze", started=time.time())
            (render_clip if row["state"] == "ANALYZED" else analyze)(db, cfg, row)
            if row["state"] == "CANDIDATE":
                db.set(row["id"], phase=None)
        except Exception as e:
            if str(e) == "cancelled":
                db.set(row["id"], "REJECTED", error="annulé depuis le tableau de bord", phase=None, cancel_requested=0)
                continue
            n = (row["attempts"] or 0) + 1
            db.set(row["id"], "FAILED" if n >= 3 else row["state"], attempts=n, error=str(e)[:500], phase=None)
            db.error("process", f"#{row['id']}: {traceback.format_exc()[-800:]}")
            log("process", f"#{row['id']} error ({n}/3): {e}")


# ----------------------------------------------------------------------------------------- local
def add_local(path, creator, rights, url=None, category=None, max_moments=5):
    """Authorized/owned local file: find distinct moments by loudness peaks, queue them as candidates."""
    from detection import audio_detector
    if not can_download(rights):
        raise SystemExit("refused: rights must be 'owned' or 'authorized' to prepare a video for republication")
    cfg, db = load_config(), DB(DB_PATH)
    a = audio_detector.decode(path)
    db_curve = audio_detector.loudness(a)
    import numpy as np
    k = int(1 / audio_detector.HOP)
    sm = np.convolve(db_curve, np.ones(k) / k, mode="same")
    dur = len(a) / audio_detector.SR
    picks = []
    for i in np.argsort(sm)[::-1]:
        t = i * audio_detector.HOP
        if all(abs(t - p) > 40 for p in picks):
            picks.append(t)
        if len(picks) >= max_moments:
            break
    ids = []
    for t in sorted(picks):
        ev = {"kind": None, "source": "audio_peak", "category": category}
        cid = db.add_clip("local", creator, os.path.abspath(path), url or os.path.abspath(path), rights, t, ev,
                          "CANDIDATE", margin=30, src_path=os.path.abspath(path), src_offset=0,
                          win_start=max(0, t - 45), win_end=min(dur, t + 20))
        if cid:
            ids.append(cid)
    log("local", f"{len(ids)} candidate(s) queued from {os.path.basename(path)}: {ids}")
    return ids


if __name__ == "__main__":
    ensure_dirs()
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("watch"); w.add_argument("channel")
    sub.add_parser("process")
    lo = sub.add_parser("local"); lo.add_argument("file"); lo.add_argument("--creator", required=True)
    lo.add_argument("--rights", required=True); lo.add_argument("--url"); lo.add_argument("--category")
    lo.add_argument("--max", type=int, default=5)
    o = sub.add_parser("once"); o.add_argument("clip_id", type=int)
    a = ap.parse_args()
    if a.cmd == "watch":
        watch(a.channel)
    elif a.cmd == "process":
        process_forever()
    elif a.cmd == "local":
        add_local(a.file, a.creator, a.rights, a.url, a.category, a.max)
    elif a.cmd == "once":
        cfg, db = load_config(), DB(DB_PATH)
        row = db.get(a.clip_id)
        if row["state"] == "CANDIDATE":
            analyze(db, cfg, row); row = db.get(a.clip_id)
        if row["state"] == "ANALYZED":
            render_clip(db, cfg, row)
        print(db.get(a.clip_id)["state"])
