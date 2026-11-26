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
    """[x, y, bw, bh] of the webcam overlay on a 1280x720 frame, or None.

    1. a small face that stays at the same place on >= half of 8 frames (game faces move, the webcam does not);
    2. a first box guessed from the face size (Twitch overlays are ~6 faces wide, ~3.4 faces high);
    3. each side snapped to the overlay border: an edge present on ALL frames (the game behind changes);
    4. sides within 40 px of the frame border are snapped to it."""
    try:
        import cv2
    except ImportError:
        return None
    if not os.path.exists(MODEL):
        return None
    fr = frames(path, start, end, 8, w, h)
    if len(fr) < 4:
        return None
    det = cv2.FaceDetectorYN.create(MODEL, "", (w, h), 0.6, 0.3, 50)
    hits = []
    for f in fr:
        _, faces = det.detect(f)
        for fc in (faces if faces is not None else []):
            x, y, fw, fh = (float(v) for v in fc[:4])
            if 18 <= fh < 0.13 * h:            # overlay faces are small; a big face = full-screen camera
                hits.append((x + fw / 2, y + fh / 2, fw, fh))
    if not hits:
        return None
    best = max(hits, key=lambda a: sum(abs(a[0] - b[0]) < 60 and abs(a[1] - b[1]) < 60 for b in hits))
    group = [b for b in hits if abs(best[0] - b[0]) < 60 and abs(best[1] - b[1]) < 60]
    if len(group) < max(3, len(fr) // 2):
        return None
    cx, cy, fw, fh = (float(np.median([g[i] for g in group])) for i in range(4))
    g = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.int16) for f in fr]
    ex = np.min([np.abs(np.diff(a, axis=1)) for a in g], axis=0) > 12      # persistent vertical edges
    ey = np.min([np.abs(np.diff(a, axis=0)) for a in g], axis=0) > 12      # persistent horizontal edges
    bw, bh = 6.0 * fh, 3.4 * fh
    L, R, T, B = cx - bw / 2, cx + bw / 2, cy - bh / 2, cy + bh / 2
    vr = slice(int(max(0, T + 0.15 * bh)), int(min(h, B - 0.15 * bh)))
    hc = slice(int(max(0, L + 0.15 * bw)), int(min(w - 1, R - 0.15 * bw)))

    if vr.stop - vr.start < 4 or hc.stop - hc.start < 4:
        return None

    def snap(pos, size, n, prof):
        lo, hi = int(max(0, pos - 0.35 * size)), int(min(n - 1, pos + 0.35 * size))
        best_i, best_s = None, 0.5
        for i in range(lo, hi):
            v = prof(i)
            if v > best_s:
                best_i, best_s = i, v
        return pos if best_i is None else best_i + 1

    L = snap(L, bw, w, lambda i: ex[vr, i].mean()); R = snap(R, bw, w, lambda i: ex[vr, i].mean())
    T = snap(T, bh, h, lambda i: ey[i, hc].mean()); B = snap(B, bh, h, lambda i: ey[i, hc].mean())
    L = 0 if L < 40 else L; T = 0 if T < 40 else T
    R = w if R > w - 40 else R; B = h if B > h - 40 else B
    L, T, R, B = max(0, L), max(0, T), min(w, R), min(h, B)
    if R - L < 120 or B - T < 70 or R - L > 0.45 * w or B - T > 0.5 * h:
        return None
    return [int(L), int(T), int(R - L) // 2 * 2, int(B - T) // 2 * 2]


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
