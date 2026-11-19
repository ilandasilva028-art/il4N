"""Light visual analysis (CPU): webcam box via YuNet face detection, scene cuts via PySceneDetect.

Webcam = a small face that stays at the same place on frames spread over the window
(game characters move, a webcam overlay does not). Returns None when not reliable.
"""
import os, subprocess
import numpy as np

MODEL = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models",
                     "face_detection_yunet_2023mar.onnx")


def frames(path, start, end, n=6, w=1280, h=720):
    out = []
    for i in range(n):
        t = start + (end - start) * (i + 0.5) / n
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1",
                              "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                             capture_output=True).stdout
        if len(raw) == w * h * 3:
            out.append(np.frombuffer(raw, np.uint8).reshape(h, w, 3))
    return out


def cam_box(path, start, end, w=1280, h=720):
    """[x, y, bw, bh] of the webcam overlay on a 1280x720 frame, or None."""
    try:
        import cv2
    except ImportError:
        return None
    if not os.path.exists(MODEL):
        return None
    det = cv2.FaceDetectorYN.create(MODEL, "", (w, h), 0.8, 0.3, 50)
    hits = []
    fr = frames(path, start, end, 6, w, h)
    for f in fr:
        _, faces = det.detect(f)
        for fc in (faces if faces is not None else []):
            x, y, fw, fh, score = fc[0], fc[1], fc[2], fc[3], fc[-1]
            if fh < 0.30 * h and score > 0.8:           # small face = overlay candidate
                hits.append((x + fw / 2, y + fh / 2, fw, fh))
    if len(fr) < 4 or not hits:
        return None
    # cluster: the most frequent stable position (+-40 px) must appear on >= 2/3 of the frames
    best = max(hits, key=lambda a: sum(abs(a[0] - b[0]) < 40 and abs(a[1] - b[1]) < 40 for b in hits))
    group = [b for b in hits if abs(best[0] - b[0]) < 40 and abs(best[1] - b[1]) < 40]
    if len(group) < max(3, int(len(fr) * 2 / 3)):
        return None
    cx, cy = np.median([g[0] for g in group]), np.median([g[1] for g in group])
    fw, fh = np.median([g[2] for g in group]), np.median([g[3] for g in group])
    bh = min(h, fh * 2.6)                                  # head + shoulders
    if bh < 150:                                           # too small: upscaling to 1080 px would be a blur
        return None
    bw = min(w, bh * 1.6)                                  # wide 16:10 box -> webcam band ~675 px high
    x0 = int(np.clip(cx - bw / 2, 0, w - bw)); y0 = int(np.clip(cy - bh * 0.42, 0, h - bh))
    return [x0, y0, int(bw) // 2 * 2, int(bh) // 2 * 2]


def scene_cuts(path, start, end):
    """Times (file-relative s) of hard cuts inside [start, end]. Empty list on any problem."""
    try:
        from scenedetect import ContentDetector, SceneManager, open_video
        v = open_video(path)
        v.seek(start)
        sm = SceneManager(); sm.add_detector(ContentDetector(threshold=30))
        sm.auto_downscale = True
        sm.detect_scenes(v, end_time=end)
        return [round(s[0].get_seconds(), 2) for s in sm.get_scene_list()[1:]]
    except Exception:
        return []
