"""Twitch live: status, ring-buffer recording (no re-encode), window extraction, anonymous chat."""
import glob, json, os, re, subprocess, time
from datetime import datetime

SEG_RE = re.compile(r"seg_(\d{8}_\d{6})\.ts$")


def live_status(channel, timeout=40):
    """(is_live, category, title) using streamlink's Twitch plugin. Never raises."""
    try:
        r = subprocess.run(["streamlink", "--json", f"twitch.tv/{channel}"], capture_output=True,
                           text=True, timeout=timeout)
        d = json.loads(r.stdout or "{}")
        m = d.get("metadata") or {}
        return bool(d.get("streams")), m.get("category"), m.get("title")
    except Exception:
        return False, None, None


def start_recorder(channel, seg_dir, quality, seg_seconds):
    """streamlink -> ffmpeg segment muxer: seg_YYYYmmdd_HHMMSS.ts files, stream copy only."""
    os.makedirs(seg_dir, exist_ok=True)
    cmd = (f"streamlink twitch.tv/{channel} '{quality}' -O --retry-open 3 2>/dev/null "
           f"| ffmpeg -v error -i pipe:0 -map 0 -c copy -f segment -segment_time {seg_seconds} "
           f"-reset_timestamps 1 -strftime 1 '{seg_dir}/seg_%Y%m%d_%H%M%S.ts'")
    return subprocess.Popen(cmd, shell=True, start_new_session=True,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def stop_recorder(proc):
    if proc and proc.poll() is None:
        try:
            os.killpg(os.getpgid(proc.pid), 15)
        except Exception:
            pass


def seg_time(path):
    m = SEG_RE.search(path)
    return datetime.strptime(m.group(1), "%Y%m%d_%H%M%S").timestamp() if m else None


def segments(seg_dir):
    return sorted((p for p in glob.glob(os.path.join(seg_dir, "seg_*.ts")) if seg_time(p)), key=seg_time)


def prune(seg_dir, keep_seconds):
    cutoff = time.time() - keep_seconds
    for p in segments(seg_dir):
        if seg_time(p) < cutoff:
            try:
                os.remove(p)
            except FileNotFoundError:
                pass


def window_ready(seg_dir, end_ts):
    """True when the footage up to end_ts is in finished segments (a newer segment has started)."""
    segs = segments(seg_dir)
    return bool(segs) and seg_time(segs[-1]) >= end_ts


def extract_window(seg_dir, start_ts, end_ts, out_path, seg_seconds):
    """Copy the segments covering [start_ts, end_ts] into one TS (atomic). Returns (path, ts_of_file_start)."""
    segs = [p for p in segments(seg_dir) if seg_time(p) <= end_ts and seg_time(p) + seg_seconds >= start_ts]
    if not segs:
        raise RuntimeError("no buffered segment covers this window (buffer pruned or recorder down)")
    lst = out_path + ".list"
    with open(lst, "w") as f:
        for s in segs:
            f.write("file '%s'\n" % s.replace("'", "'\\''"))
    tmp = out_path + ".part"
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                        "-c", "copy", "-f", "mpegts", tmp], capture_output=True, text=True)
    os.remove(lst)
    if r.returncode != 0 or not os.path.exists(tmp) or os.path.getsize(tmp) < 10000:
        raise RuntimeError(f"window extraction failed: {r.stderr[-300:]}")
    os.replace(tmp, out_path)
    return out_path, seg_time(segs[0])


class Chat:
    """Anonymous read-only Twitch chat over IRC websocket, with automatic reconnection."""

    def __init__(self, channel, log=print):
        self.channel, self.log, self.ws = channel.lower(), log, None

    def connect(self):
        import websocket
        while True:
            try:
                ws = websocket.create_connection("wss://irc-ws.chat.twitch.tv:443", timeout=2)
                ws.send("PASS SCHMOOPIIE")
                ws.send("NICK justinfan%d" % (10000 + os.getpid() % 80000))
                ws.send(f"JOIN #{self.channel}")
                self.ws = ws
                return
            except Exception as e:
                self.log(f"chat connect failed ({type(e).__name__}), retry in 15 s")
                time.sleep(15)

    def poll(self):
        """Return the list of chat message texts received now (may be empty)."""
        import websocket
        if self.ws is None:
            self.connect()
        try:
            data = self.ws.recv()
        except websocket.WebSocketTimeoutException:
            return []
        except Exception:
            self.log("chat connection lost, reconnecting")
            try:
                self.ws.close()
            except Exception:
                pass
            self.ws = None
            return []
        msgs = []
        for line in data.split("\r\n"):
            if line.startswith("PING"):
                self.ws.send("PONG :tmi.twitch.tv")
            elif " PRIVMSG #" in line:
                msgs.append(line.split(" PRIVMSG #", 1)[1].split(" :", 1)[-1])
        return msgs
