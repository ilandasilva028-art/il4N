#!/usr/bin/env python3
"""Watch a Twitch channel's chat and cut a vertical clip whenever it gets hyped.

Usage:
  python3 hype_watch.py <channel> <out_dir> [--quality 720p60,720p,best] [--min-msgs 15] [--ratio 3]

How it works:
  1. streamlink records the live continuously into 30 s segments (kept 20 min, then deleted).
  2. The chat is read anonymously (Twitch IRC over websocket) and messages are counted per 10 s.
  3. When the count jumps above max(min-msgs, ratio x recent median), the last ~45 s before the
     spike and ~20 s after it are cut from the segments into a 9:16 clip (make_clip.py, blur layout).
  A 2 min cooldown avoids cutting ten clips out of one burst.

Runs until stopped (Ctrl+C). Needs: streamlink, ffmpeg, websocket-client.
"""
import argparse, collections, glob, json, os, re, signal, statistics, subprocess, sys, time
from datetime import datetime
import websocket  # websocket-client

HERE = os.path.dirname(os.path.abspath(__file__))
MAKE_CLIP = os.path.join(HERE, "make_clip.py")
SEG_RE = re.compile(r"seg_(\d{8}_\d{6})\.ts$")
WINDOW = 10          # seconds per chat-count bucket
KEEP = 20 * 60       # seconds of video kept on disk
PRE, POST = 45, 20   # clip = [spike - PRE, spike + POST]


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def start_recorder(channel, seg_dir, quality):
    os.makedirs(seg_dir, exist_ok=True)
    cmd = (f"streamlink twitch.tv/{channel} {quality} -O --retry-open 5 "
           f"| ffmpeg -v error -i pipe:0 -map 0 -c copy -f segment -segment_time 30 "
           f"-reset_timestamps 1 -strftime 1 '{seg_dir}/seg_%Y%m%d_%H%M%S.ts'")
    return subprocess.Popen(cmd, shell=True, start_new_session=True,
                            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def seg_time(path):
    m = SEG_RE.search(path)
    return datetime.strptime(m.group(1), "%Y%m%d_%H%M%S").timestamp() if m else None


def prune(seg_dir):
    cutoff = time.time() - KEEP
    for p in glob.glob(f"{seg_dir}/seg_*.ts"):
        t = seg_time(p)
        if t and t < cutoff:
            os.remove(p)


def cut_clip(seg_dir, spike_ts, out_dir, n):
    start, end = spike_ts - PRE, spike_ts + POST
    segs = sorted((p for p in glob.glob(f"{seg_dir}/seg_*.ts")
                   if seg_time(p) and seg_time(p) <= end and seg_time(p) + 30 >= start),
                  key=seg_time)
    if not segs or seg_time(segs[-1]) + 30 < end:
        log("not enough video buffered yet for this spike, skipped")
        return
    first = seg_time(segs[0])
    joined = os.path.join(out_dir, f"_join_{n}.ts")
    with open(joined, "wb") as f:              # MPEG-TS segments concatenate cleanly
        for s in segs:
            f.write(open(s, "rb").read())
    empty = os.path.join(out_dir, f"_empty_{n}.json")
    json.dump([], open(empty, "w"))
    out = os.path.join(out_dir, f"hype_{datetime.fromtimestamp(spike_ts):%Y%m%d_%H%M%S}.mp4")
    subprocess.run([sys.executable, "-I", MAKE_CLIP, joined, empty,
                    str(max(start - first, 0)), str(end - first), out,
                    "--layout", "blur"], check=False)
    for p in (joined, empty):
        os.remove(p)
    log(f"CLIP -> {out}")
    # French subtitles in the background (python env that has faster-whisper + transformers)
    py = os.environ.get("SUB_PYTHON", "/home/user/tts-env/bin/python")
    if os.path.exists(py):
        subprocess.Popen([py, "-I", os.path.join(HERE, "subtitle_fr.py"), out],
                         stdout=open(out[:-4] + "_fr.log", "w"), stderr=subprocess.STDOUT)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("channel"); ap.add_argument("out_dir")
    ap.add_argument("--quality", default="720p60,720p,best")
    ap.add_argument("--min-msgs", type=int, default=15)
    ap.add_argument("--ratio", type=float, default=3.0)
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    seg_dir = os.path.join(a.out_dir, "_buffer")

    rec = start_recorder(a.channel, seg_dir, a.quality)
    log(f"recording {a.channel} into {seg_dir}")
    ws = websocket.create_connection("wss://irc-ws.chat.twitch.tv:443", timeout=2)
    ws.send("PASS SCHMOOPIIE")
    ws.send("NICK justinfan%d" % (10000 + os.getpid() % 80000))
    ws.send(f"JOIN #{a.channel.lower()}")
    log(f"watching chat of #{a.channel}")

    history = collections.deque(maxlen=30)     # last 5 min of 10 s counts
    count, bucket_end, last_clip, n = 0, time.time() + WINDOW, 0.0, 0
    stop = False
    signal.signal(signal.SIGINT, lambda *_: globals().__setitem__("stop", True))

    try:
        while not stop:
            try:
                data = ws.recv()
            except websocket.WebSocketTimeoutException:
                data = ""
            for line in data.split("\r\n"):
                if line.startswith("PING"):
                    ws.send("PONG :tmi.twitch.tv")
                elif " PRIVMSG #" in line:
                    count += 1
            now = time.time()
            if now >= bucket_end:
                if len(history) < 6:  # 1 min warm-up to learn the normal chat speed
                    history.append(count); count, bucket_end = 0, now + WINDOW
                    continue
                baseline = statistics.median(history)
                threshold = max(a.min_msgs, a.ratio * max(baseline, 2))
                if count >= threshold and now - last_clip > 120:
                    n += 1
                    log(f"HYPE: {count} msgs / 10 s (normal ~{baseline:.0f}) -> cutting clip")
                    cut_clip(seg_dir, now, a.out_dir, n)
                    last_clip = now
                history.append(count)
                count, bucket_end = 0, now + WINDOW
                prune(seg_dir)
            if rec.poll() is not None:
                log("recorder stopped, restarting")
                rec = start_recorder(a.channel, seg_dir, a.quality)
    finally:
        ws.close()
        os.killpg(os.getpgid(rec.pid), signal.SIGTERM)
        log("stopped")


if __name__ == "__main__":
    main()
