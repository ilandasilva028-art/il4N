"""Single-pass vertical render: layout + subtitles + hook burned in, atomic output.

1080x1920, H.264 (CRF), AAC 160k, 30 fps, faststart. Writes <out>.part.mp4 then os.replace().
"""
import os, subprocess, tempfile, time

W, H = 1080, 1920


def filtergraph(layout, ass_path):
    mode = layout["mode"]
    if mode == "cam":
        x, y, w, h = layout["cam_box"]
        cam_h = round(W * h / w / 2) * 2
        game_h = H - cam_h
        game_w = round(720 * W / game_h / 2) * 2
        g = (f"[0:v]scale=1280:720,split[a][b];[a]crop={w}:{h}:{x}:{y},scale={W}:{cam_h}[cam];"
             f"[b]crop={game_w}:720:(1280-{game_w})/2:0,scale={W}:{game_h}[game];[cam][game]vstack")
    elif mode == "crop":
        g = f"[0:v]scale=-2:{H},crop={W}:{H}"
    else:  # blur
        vid_h = W * 9 // 16
        g = (f"[0:v]split[a][b];[a]scale=-2:{H},crop={W}:{H},boxblur=25:2,eq=brightness=-0.18[bg];"
             f"[b]scale={W}:{vid_h}[fg];[bg][fg]overlay=0:{(H - vid_h) // 2}")
    esc = ass_path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    return f"{g},setsar=1,ass='{esc}'[v]"


def render(src, start, end, out, layout, ass_text, fps=30, crf=21, preset="medium", threads=3,
           on_progress=None, should_cancel=None):
    with tempfile.NamedTemporaryFile("w", suffix=".ass", delete=False, encoding="utf-8") as f:
        f.write(ass_text)
        ass = f.name
    tmp = out[:-4] + ".part.mp4"
    cmd = ["nice", "-n", "10", "ffmpeg", "-v", "error", "-y", "-ss", f"{start:.2f}", "-to", f"{end:.2f}",
           "-i", src, "-filter_complex", filtergraph(layout, ass), "-map", "[v]", "-map", "0:a:0?",
           "-r", str(fps), "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p",
           "-threads", str(threads), "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
           "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", "-f", "mp4", tmp]
    total = max(0.1, end - start)
    try:
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        last = 0
        for line in p.stdout:                       # real progress from ffmpeg (-progress)
            if line.startswith("out_time_us="):
                try:
                    done = int(line.split("=")[1]) / 1e6
                except ValueError:
                    continue
                if on_progress and time.time() - last > 1:
                    on_progress(min(1.0, done / total)); last = time.time()
                if should_cancel and should_cancel():
                    p.kill(); p.wait()
                    if os.path.exists(tmp):
                        os.remove(tmp)
                    raise RuntimeError("cancelled")
        err = p.stderr.read()
        if p.wait() != 0:
            raise RuntimeError(f"ffmpeg failed: {err[-400:]}")
        if on_progress:
            on_progress(1.0)
        return tmp                      # caller validates, then os.replace(tmp, out)
    finally:
        os.unlink(ass)
