"""Validate a rendered video: ffprobe (video+audio, size, duration) + real decode of start and end."""
import json, subprocess


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration:stream=codec_type,codec_name,width,height", "-of", "json", path],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return json.loads(r.stdout or "{}")


def validate(path, min_dur=5, max_dur=90, need_size=(1080, 1920)):
    info = probe(path)
    if not info:
        return False, "ffprobe failed"
    streams = info.get("streams", [])
    v = [s for s in streams if s.get("codec_type") == "video"]
    a = [s for s in streams if s.get("codec_type") == "audio"]
    try:
        dur = float(info.get("format", {}).get("duration"))
    except (TypeError, ValueError):
        return False, "no duration"
    if not v:
        return False, "no video stream"
    if not a:
        return False, "no audio stream"
    if need_size and (v[0].get("width"), v[0].get("height")) != tuple(need_size):
        return False, f"bad size {v[0].get('width')}x{v[0].get('height')}"
    if not (min_dur <= dur <= max_dur):
        return False, f"duration {dur:.1f}s out of range"
    for ss in (0, max(0, dur - 2)):     # decode test: beginning and end
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(ss), "-t", "2", "-i", path, "-f", "null", "-"],
                           capture_output=True, text=True)
        if r.returncode != 0 or "Invalid" in r.stderr or "corrupt" in r.stderr.lower():
            return False, f"decode error at {ss:.0f}s: {r.stderr[-200:]}"
    return True, dict(duration=round(dur, 2), video=v[0].get("codec_name"), audio=a[0].get("codec_name"),
                      size=f"{v[0].get('width')}x{v[0].get('height')}")
