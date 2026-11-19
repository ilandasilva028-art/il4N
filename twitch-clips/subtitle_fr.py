#!/usr/bin/env python3
"""Burn French subtitles into a vertical clip (transcribe, translate EN->FR if needed).

Usage: <python with faster-whisper + transformers> subtitle_fr.py <clip.mp4> [out.mp4]
Default output: <clip>_fr.mp4. Runs fully offline after the first model download.
"""
import os, subprocess, sys, tempfile
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
from faster_whisper import WhisperModel


def ts(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def translate(lines):
    from transformers import MarianMTModel, MarianTokenizer
    name = "Helsinki-NLP/opus-mt-en-fr"
    tok, model = MarianTokenizer.from_pretrained(name), MarianMTModel.from_pretrained(name)
    out = model.generate(**tok(lines, return_tensors="pt", padding=True, truncation=True))
    return tok.batch_decode(out, skip_special_tokens=True)


def main():
    clip = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else clip[:-4] + "_fr.mp4"
    segs, info = WhisperModel("small", device="cpu", compute_type="int8").transcribe(clip, vad_filter=True)
    segs = [s for s in segs if s.text.strip()]
    if not segs:
        print("no speech, skipped"); return
    texts = [s.text.strip() for s in segs]
    if info.language != "fr":
        texts = translate(texts)
    ass = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,70,70,330,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    for s, t in zip(segs, texts):
        ass += f"Dialogue: 0,{ts(s.start)},{ts(s.end)},Sub,,0,0,0,,{t.upper()}\n"
    with tempfile.NamedTemporaryFile("w", suffix=".ass", delete=False) as f:
        f.write(ass)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", clip, "-vf", f"ass={f.name}",
                    "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-c:a", "copy",
                    "-movflags", "+faststart", out], check=True)
    os.unlink(f.name)
    print(f"ok ({info.language} -> fr) ->", out)


if __name__ == "__main__":
    main()
