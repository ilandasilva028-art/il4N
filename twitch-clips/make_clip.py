#!/usr/bin/env python3
"""Make a vertical 9:16 clip (webcam on top, gameplay below, word-by-word subtitles).

Usage:
  python3 make_clip.py <video> <transcript.json> <start> <end> <out.mp4> [--hook "TEXTE"]
             [--layout cam|blur] [--cam x:y:w:h] [--game-x X]

transcript.json: list of {"start","end","text","words":[{"w","s","e"}]} (faster-whisper output).
"""
import argparse, json, subprocess, tempfile, os

W, H = 1080, 1920


def ts(t):
    t = max(t, 0)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def build_ass(words, start, end, hook, sub_y):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,DejaVu Sans,78,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,5,60,60,0,1
Style: Hook,DejaVu Sans,64,&H00000000,&H00000000,&H0000E5FF,&H0000E5FF,-1,0,0,0,100,100,0,0,3,18,0,8,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if hook:
        ev.append(f"Dialogue: 1,{ts(0)},{ts(min(3.5, end - start))},Hook,,0,0,0,,{hook}")
    ws = [w for w in words if w["e"] > start and w["s"] < end]
    # groups of max 3 words, current word highlighted in yellow
    groups = [ws[i:i + 3] for i in range(0, len(ws), 3)]
    for g in groups:
        for i, w in enumerate(g):
            s = w["s"] - start
            e = (g[i + 1]["s"] if i + 1 < len(g) else w["e"]) - start
            txt = " ".join(
                ("{\\c&H00E5FF&}" + x["w"].strip().upper() + "{\\c&HFFFFFF&}") if x is w else x["w"].strip().upper()
                for x in g)
            ev.append(f"Dialogue: 0,{ts(s)},{ts(e)},Sub,,0,0,0,,{{\\pos({W // 2},{sub_y})}}{txt}")
    return head + "\n".join(ev) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("transcript")
    ap.add_argument("start", type=float); ap.add_argument("end", type=float); ap.add_argument("out")
    ap.add_argument("--hook", default="")
    ap.add_argument("--cam", default="1000:84:280:200", help="webcam crop x:y:w:h in source pixels (1280x720)")
    ap.add_argument("--game-x", type=int, default=300, help="left edge of the gameplay crop")
    ap.add_argument("--layout", choices=["cam", "blur"], default="cam",
                    help="cam: webcam band on top + gameplay; blur: full 16:9 frame centered on a blurred background")
    a = ap.parse_args()

    words = [w for seg in json.load(open(a.transcript)) for w in seg["words"]]
    cx, cy, cw, ch = map(int, a.cam.split(":"))
    cam_h = round(W * ch / cw / 2) * 2          # webcam band height
    game_h = H - cam_h                           # gameplay band height
    game_w = round(720 * W / game_h / 2) * 2     # source width to keep aspect

    if a.layout == "blur":
        vid_h = W * 9 // 16                       # 1080x608 sharp video in the middle
        top = (H - vid_h) // 2
        sub_y = top + vid_h + 150
        fc_base = (f"[0:v]split[a][b];[a]scale=-2:{H},crop={W}:{H},boxblur=25:2,eq=brightness=-0.15[bg];"
                   f"[b]scale={W}:{vid_h}[fg];[bg][fg]overlay=0:{top}")
    else:
        sub_y = cam_h + 40
        fc_base = (f"[0:v]crop={cw}:{ch}:{cx}:{cy},scale={W}:{cam_h}[cam];"
                   f"[0:v]crop={game_w}:720:{a.game_x}:0,scale={W}:{game_h}[game];"
                   f"[cam][game]vstack")

    with tempfile.NamedTemporaryFile("w", suffix=".ass", delete=False) as f:
        f.write(build_ass(words, a.start, a.end, a.hook, sub_y))
        ass = f.name

    fc = f"{fc_base},ass={ass}[v]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a.start), "-to", str(a.end), "-i", a.video,
                    "-filter_complex", fc, "-map", "[v]", "-map", "0:a",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30",
                    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", a.out], check=True)
    os.unlink(ass)
    print("ok ->", a.out)


if __name__ == "__main__":
    main()
