#!/usr/bin/env python3
"""Find candidate highlight moments in a recording.

Usage: python analyze.py <video.ts> <out_dir> [--model small]
Writes <out_dir>/<name>.transcript.json (faster-whisper with word timestamps) and
<out_dir>/<name>.moments.txt: transcript lines annotated with loudness, the loudest
windows first, so a human (or Claude) can pick the best clips.
Must run with a Python that has faster-whisper installed.
"""
import argparse, json, os, re, subprocess
from faster_whisper import WhisperModel


def loudness(video):
    """RMS level (dB) per second."""
    out = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-af",
         "asetnsamples=16000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level",
         "-f", "null", "-"], capture_output=True, text=True).stderr
    return [float(v) if v not in ("-inf", "inf") else -90.0
            for v in re.findall(r"RMS_level=(-?[0-9.]+|-?inf)", out)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("out_dir"); ap.add_argument("--model", default="small")
    a = ap.parse_args()
    name = os.path.splitext(os.path.basename(a.video))[0]
    os.makedirs(a.out_dir, exist_ok=True)

    rms = loudness(a.video)
    base = sorted(rms)[len(rms) // 2] if rms else -30

    m = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(a.video, language="fr", word_timestamps=True, vad_filter=True)
    out = []
    for s in segs:
        out.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                    "words": [{"w": w.word, "s": w.start, "e": w.end} for w in (s.words or [])]})
    json.dump(out, open(f"{a.out_dir}/{name}.transcript.json", "w"), ensure_ascii=False)

    # 20 s windows ranked by loudness peak above the median
    win = []
    for t in range(0, max(len(rms) - 20, 1), 5):
        w = rms[t:t + 20]
        if w:
            win.append((max(w) - base, t))
    win.sort(reverse=True)
    with open(f"{a.out_dir}/{name}.moments.txt", "w") as f:
        f.write(f"median RMS {base:.1f} dB\n\n## Loudest 20s windows (peak above median dB, start s)\n")
        for d, t in win[:15]:
            f.write(f"{d:+.1f} dB @ {t}s\n")
        f.write("\n## Transcript (start-end, peak dB above median)\n")
        for s in out:
            seg = rms[int(s["start"]):int(s["end"]) + 1] or [base]
            f.write(f"{s['start']:7.1f}-{s['end']:7.1f} [{max(seg) - base:+5.1f}] {s['text']}\n")
    print("ok", name, len(out), "segments")


if __name__ == "__main__":
    main()
