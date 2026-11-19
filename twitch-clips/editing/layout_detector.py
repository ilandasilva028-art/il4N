"""Pick the vertical layout.

- cam:   webcam band on top + gameplay below. Needs a reliable webcam box: taken from config (cam_box).
- blur:  full 16:9 frame centered on a blurred copy. Safe fallback: nothing important is cut.
- crop:  direct vertical crop of the centre, only for sources that are already centred (opt-in).
'auto' = cam_box from config, else the webcam detected by detection/visual_detector.py, else blur.
"""


def choose(channel_cfg, detected_box=None, src_w=1280, src_h=720):
    layout = (channel_cfg or {}).get("layout", "auto")
    box = (channel_cfg or {}).get("cam_box")
    if layout == "auto" and not box and detected_box:
        return {"mode": "cam", "cam_box": [int(v) for v in detected_box],
                "reason": "webcam detected (stable face on several frames)"}
    if src_h > src_w:                          # already vertical
        return {"mode": "crop", "reason": "source already vertical"}
    if layout in ("auto", "cam") and box and len(box) == 4:
        return {"mode": "cam", "cam_box": [int(v) for v in box], "reason": "cam_box from config"}
    if layout == "crop":
        return {"mode": "crop", "reason": "forced by config"}
    return {"mode": "blur", "reason": "no reliable webcam box: safe fallback"}
