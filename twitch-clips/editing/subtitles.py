"""ASS subtitles from ONE transcription: word-by-word (active word highlighted) for French,
sentence-level faithful EN->FR translation otherwise. Max 2 lines, TikTok safe zone."""
import os

W, H = 1080, 1920
SUB_Y = 1330                   # above TikTok's bottom UI (caption/buttons), below the centre
MAX_LINE = 22                  # characters per line, 2 lines max
_mt = None


def ts(t):
    t = max(t, 0)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def esc(s):
    return s.replace("{", "(").replace("}", ")").replace("\n", " ")


HEADER = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,DejaVu Sans,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,1,7,4,5,90,90,0,1
Style: Hook,DejaVu Sans,62,&H00000000,&H00000000,&H0000E5FF,&H0000E5FF,-1,0,0,0,100,100,0,0,3,18,0,8,80,80,170,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def _merge_tokens(words):
    out = []
    for w in words:                                    # "l" + "'envoie" -> "l'envoie"
        if out and not w["w"].startswith(" "):
            out[-1] = {**out[-1], "w": out[-1]["w"] + w["w"], "e": w["e"]}
        else:
            out.append(dict(w))
    return out


def _blocks(words):
    """Group words into caption blocks of <= 2 lines of MAX_LINE chars."""
    blocks, cur, lines, line = [], [], 1, 0
    for w in words:
        n = len(w["w"].strip()) + 1
        if line + n > MAX_LINE:
            if lines == 2 or (cur and w["s"] - cur[-1]["e"] > 0.8):
                blocks.append(cur); cur, lines, line = [], 1, 0
            else:
                lines, line = lines + 1, 0
        elif cur and w["s"] - cur[-1]["e"] > 0.8:        # pause: start a new block
            blocks.append(cur); cur, lines, line = [], 1, 0
        cur.append(w); line += n
    if cur:
        blocks.append(cur)
    return blocks


def _wrap(tokens):
    lines, line = [], ""
    for t in tokens:
        if line and len(_plain(line)) + len(_plain(t)) + 1 > MAX_LINE:
            lines.append(line); line = t
        else:
            line = f"{line} {t}".strip()
    lines.append(line)
    return "\\N".join(lines[:2])


def _plain(s):
    import re
    return re.sub(r"\{[^}]*\}", "", s)


def build(transcript, start, end, hook=None, translate=None):
    """transcript: transcript_detector.transcribe() result. Returns (ass_text, mode, uncertain)."""
    lang = transcript.get("language")
    segs = [s for s in transcript["segments"] if s["end"] > start and s["start"] < end]
    ev, uncertain = [], []
    if hook:
        ev.append(f"Dialogue: 1,{ts(0)},{ts(min(3.0, end - start))},Hook,,0,0,0,,{wrap_hook(esc(hook))}")
    if lang == "fr" or not translate:
        mode = "word" if lang == "fr" else f"word-{lang}"
        words = _merge_tokens([w for s in segs for w in s["words"] if w["e"] > start and w["s"] < end])
        uncertain = [w["w"].strip() for w in words if w.get("p", 1) < 0.45 and any(c.isalpha() for c in w["w"])]
        for b in _blocks(words):
            for i, w in enumerate(b):
                s0 = w["s"] - start
                s1 = (b[i + 1]["s"] if i + 1 < len(b) else w["e"]) - start
                toks = [("{\\c&H00E5FF&}" + esc(x["w"].strip().upper()) + "{\\c&HFFFFFF&}") if x is w
                        else esc(x["w"].strip().upper()) for x in b]
                ev.append(f"Dialogue: 0,{ts(s0)},{ts(max(s1, s0 + 0.05))},Sub,,0,0,0,,"
                          f"{{\\pos({W // 2},{SUB_Y})}}{_wrap(toks)}")
    else:
        mode = f"translated-{lang}-fr"
        fr = translate([s["text"] for s in segs]) if segs else []
        for s, t in zip(segs, fr):
            toks = esc(t.upper()).split()
            ev.append(f"Dialogue: 0,{ts(max(s['start'], start) - start)},{ts(min(s['end'], end) - start)},Sub,,0,0,0,,"
                      f"{{\\pos({W // 2},{SUB_Y})}}{_wrap(toks)}")
    return HEADER + "\n".join(ev) + "\n", mode, uncertain


def wrap_hook(text, width=24):
    """Hook banner on 2-3 short lines (WrapStyle 2 disables automatic wrapping)."""
    lines, line = [], ""
    for w in text.split():
        if line and len(line) + 1 + len(w) > width:
            lines.append(line); line = w
        else:
            line = f"{line} {w}".strip()
    lines.append(line)
    return "\\N".join(lines[:3])


def translate_en_fr(texts):
    global _mt
    os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
    from transformers import MarianMTModel, MarianTokenizer
    if _mt is None:
        n = "Helsinki-NLP/opus-mt-en-fr"
        _mt = (MarianTokenizer.from_pretrained(n), MarianMTModel.from_pretrained(n))
    tok, m = _mt
    out = m.generate(**tok(texts, return_tensors="pt", padding=True, truncation=True))
    return tok.batch_decode(out, skip_special_tokens=True)
