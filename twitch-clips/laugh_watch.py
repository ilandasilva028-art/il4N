#!/usr/bin/env python3
"""Record a Twitch channel and turn every big laugh into a ready-to-post TikTok.

Usage (python env with transformers + faster-whisper, e.g. /home/user/tts-env/bin/python):
  laugh_watch.py <channel> <out_dir> [--thresh 0.03] [--min-hits 2]

1. streamlink records the live into 30 s segments (last 15 min kept).
2. Each finished segment's audio is scored by an AudioSet classifier (AST) on 3 s windows,
   every 1.5 s: score = Laughter + Belly laugh + Giggle + Chuckle.
3. A "big laugh" = at least --min-hits windows above --thresh within 8 s.
4. For each big laugh: [laugh - 22 s, laugh + 12 s] is cut, transcribed (French), and rendered
   as a 9:16 clip with word-by-word subtitles + a hook (make_clip.py), plus a .txt TikTok caption.
"""
import argparse, glob, json, os, re, subprocess, sys, time
from datetime import datetime
import numpy as np

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
HERE = os.path.dirname(os.path.abspath(__file__))
SEG = 30
KEEP = 15 * 60
PRE, POST = 22, 12
LAUGH = ("Laughter", "Belly laugh", "Giggle", "Chuckle, chortle")
SEG_RE = re.compile(r"seg_(\d{8}_\d{6})\.ts$")


def log(m):
    print(f"[{datetime.now():%H:%M:%S}] {m}", flush=True)


def seg_time(p):
    m = SEG_RE.search(p)
    return datetime.strptime(m.group(1), "%Y%m%d_%H%M%S").timestamp() if m else None


def segments(d):
    return sorted((p for p in glob.glob(f"{d}/seg_*.ts") if seg_time(p)), key=seg_time)


def start_recorder(channel, d, quality):
    os.makedirs(d, exist_ok=True)
    cmd = (f"streamlink twitch.tv/{channel} {quality} -O --retry-open 5 "
           f"| ffmpeg -v error -i pipe:0 -map 0 -c copy -f segment -segment_time {SEG} "
           f"-reset_timestamps 1 -strftime 1 '{d}/seg_%Y%m%d_%H%M%S.ts'")
    return subprocess.Popen(cmd, shell=True, start_new_session=True,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def audio(path):
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "16000",
                        "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(b, np.float32)


def laugh_times(clf, path, thresh):
    """Times (s from segment start) of 3 s windows whose laughter score passes thresh."""
    a = audio(path)
    wins, starts = [], []
    for i in range(0, max(len(a) - 48000, 1), 24000):
        wins.append({"raw": a[i:i + 48000], "sampling_rate": 16000}); starts.append(i / 16000)
    hits = []
    for st, res in zip(starts, clf(wins, top_k=None, batch_size=8)):
        s = sum(x["score"] for x in res if x["label"] in LAUGH)
        if s >= thresh:
            hits.append((st, s))
    return hits


def join(segs, out):
    lst = out + ".txt"
    with open(lst, "w") as f:
        for s in segs:
            f.write("file '%s'\n" % s)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-c", "copy", "-f", "mpegts", out], check=False)
    os.remove(lst)


def make_tiktok(whisper, channel, seg_dir, out_dir, t):
    start, end = t - PRE, t + POST
    segs = [p for p in segments(seg_dir) if seg_time(p) <= end and seg_time(p) + SEG >= start]
    if not segs:
        return
    first = seg_time(segs[0])
    stamp = f"{datetime.fromtimestamp(t):%Y%m%d_%H%M%S}"
    joined = os.path.join(out_dir, f"_join_{stamp}.ts")
    join(segs, joined)
    s0, s1 = max(start - first, 0), end - first
    segs_w, _ = whisper.transcribe(joined, language="fr", word_timestamps=True, vad_filter=True,
                                   clip_timestamps=[s0, s1])
    tr = [{"start": s.start, "end": s.end, "text": s.text.strip(),
           "words": [{"w": w.word, "s": w.start, "e": w.end} for w in (s.words or [])]}
          for s in segs_w]
    tjson = joined + ".json"
    json.dump(tr, open(tjson, "w"), ensure_ascii=False)
    name = channel.replace("023", "").capitalize()
    out = os.path.join(out_dir, f"tiktok_{channel}_{stamp}.mp4")
    subprocess.run([sys.executable, "-I", os.path.join(HERE, "make_clip.py"), joined, tjson,
                    str(s0), str(s1), out, "--layout", "blur",
                    "--hook", f"{name.upper()} EXPLOSE DE RIRE 😂"], check=False,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    quote = max((x["text"] for x in tr if len(x["text"]) <= 70), key=len, default="")
    caption = (f"{name} est mort de rire 😂{(' « ' + quote + ' »') if quote else ''}\n"
               f"Crédit : @{channel}\n"
               f"#{name} #Twitch #Clip #Mdr #Pourtoi")
    open(out[:-4] + ".txt", "w").write(caption + "\n")
    for p in (joined, tjson):
        os.remove(p)
    log(f"TIKTOK -> {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("channel"); ap.add_argument("out_dir")
    ap.add_argument("--quality", default="720p60,720p,best")
    ap.add_argument("--thresh", type=float, default=0.03)
    ap.add_argument("--min-hits", type=int, default=2)
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    seg_dir = os.path.join(a.out_dir, "_buffer")

    from transformers import pipeline
    from faster_whisper import WhisperModel
    clf = pipeline("audio-classification", model="MIT/ast-finetuned-audioset-10-10-0.4593")
    whisper = WhisperModel("small", device="cpu", compute_type="int8")

    rec = start_recorder(a.channel, seg_dir, a.quality)
    log(f"recording {a.channel}, listening for laughs")
    scanned, pending, last = set(), [], 0.0
    while True:
        segs = segments(seg_dir)
        for p in segs[:-1]:                      # the newest segment is still being written
            if p in scanned:
                continue
            scanned.add(p)
            hits = laugh_times(clf, p, a.thresh)
            t0 = seg_time(p)
            for i, (st, sc) in enumerate(hits):
                group = [h for h in hits if st <= h[0] <= st + 8]
                if len(group) >= a.min_hits and t0 + st - last > 60:
                    last = t0 + st
                    log(f"LAUGH x{len(group)} (max {max(g[1] for g in group):.3f}) at {datetime.fromtimestamp(last):%H:%M:%S}")
                    pending.append(last)
                    break
        newest = seg_time(segs[-1]) if segs else 0
        while pending and newest >= pending[0] + POST:   # footage after the laugh is on disk
            make_tiktok(whisper, a.channel, seg_dir, a.out_dir, pending.pop(0))
        for p in segs:
            if seg_time(p) < time.time() - KEEP:
                os.remove(p); scanned.discard(p)
        if rec.poll() is not None:
            log("recorder stopped, restarting in 20 s")
            time.sleep(20)
            rec = start_recorder(a.channel, seg_dir, a.quality)
        time.sleep(5)


if __name__ == "__main__":
    main()
