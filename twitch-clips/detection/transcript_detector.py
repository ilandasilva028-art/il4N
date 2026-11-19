"""Speech analysis of a candidate window with faster-whisper (transcribed ONCE, reused for subtitles)."""
import collections, os, re

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
_model = None

MARKERS = {
    "laugh": re.compile(r"\b(ha(ha)+|hi(hi)+|mdr|ptdr|je suis mort|mort de rire|j'en peux plus|pété de rire)\b", re.I),
    "surprise": re.compile(r"\b(quoi|hein|attends|c'est pas possible|impossible|non mais|oh putain|oh la vache"
                           r"|what|wait|no way|oh my god|wtf|j'y crois pas|comment ça)\b", re.I),
    "fail": re.compile(r"\b(raté|j'ai raté|c'est raté|nul|catastrophe|non non non|oh non|mince|merde|je suis nul"
                       r"|j'ai tout cassé|fail)\b", re.I),
    "swear": re.compile(r"\b(putain|merde|bordel|wesh|sa mère|ta mère)\b", re.I),
}


def model(name="small"):
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(name, device="cpu", compute_type="int8")
    return _model


def transcribe(path, start=0.0, end=None, model_name="small"):
    """Segments with word timestamps (seconds relative to the file). Language auto-detected."""
    kw = dict(word_timestamps=True, vad_filter=True)
    if start or end:
        kw["clip_timestamps"] = [float(start), float(end)] if end else [float(start)]
    segs, info = model(model_name).transcribe(path, **kw)
    out = []
    for s in segs:
        words = [{"w": w.word, "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)}
                 for w in (s.words or [])]
        out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(), "words": words})
    return {"language": info.language, "lang_prob": round(info.language_probability, 2), "segments": out}


def features(tr, t0=None, t1=None):
    """Markers found in [t0, t1] (seconds, file-relative). Never invents text: only counts what was said."""
    segs = [s for s in tr["segments"] if (t0 is None or s["end"] >= t0) and (t1 is None or s["start"] <= t1)]
    text = " ".join(s["text"] for s in segs)
    found = {k: len(rx.findall(text)) for k, rx in MARKERS.items()}
    sentences = [s["text"] for s in segs]
    rep = collections.Counter(x.lower().strip(" !?.,") for x in re.split(r"[.!?]", text) if len(x.strip()) > 3)
    repeated = max(rep.values(), default=0)
    words = [w for s in segs for w in s["words"]]
    uncertain = [w["w"].strip() for w in words if w.get("p", 1) < 0.45 and any(c.isalpha() for c in w["w"])]
    quote = best_quote(segs)
    return dict(text=text, n_words=len(words), markers=found, repeated=repeated,
                exclaim=text.count("!"), questions=text.count("?"), quote=quote,
                uncertain=uncertain[:10], n_sentences=len(sentences))


def best_quote(segs):
    """A short, real sentence (4-14 words) that sounds like a reaction; None if nothing fits."""
    best, score = None, -1
    for s in segs:
        for sent in re.split(r"(?<=[.!?])\s+", s["text"]):
            n = len(sent.split())
            if 3 <= n <= 14:
                sc = sent.count("!") * 2 + sent.count("?") + sum(bool(rx.search(sent)) * 2 for rx in MARKERS.values())
                if sc > score:
                    best, score = sent.strip(), sc
    return best if score > 0 else None
