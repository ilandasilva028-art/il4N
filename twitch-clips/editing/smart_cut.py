"""Choose [start, end] of the TikTok inside a candidate window.

1. anchor = the reaction: loudest audio peak in [trigger - lag - 12 s, trigger + 2 s]
   (chat reacts a few seconds AFTER the moment), else trigger - lag.
2. end   = end of the sentence that follows the reaction (reaction kept whole) + small tail.
3. start = a sentence start so that the clip lasts ~target s (min..max), never mid-sentence.
All times in seconds relative to the window file.
"""


def choose(segments, peaks, trigger, lag, win_len, cmin=15, cmax=35, target=25):
    lo, hi = trigger - lag - 12, trigger + 2
    cand = [p for p in (peaks or []) if lo <= p <= hi]
    anchor = cand[0] if cand else max(0.0, trigger - lag)
    segs = sorted(segments, key=lambda s: s["start"])

    # end: end of the segment covering anchor+1.5 s (or the next one), keep the reaction complete
    end = anchor + 4
    for s in segs:
        if s["end"] >= anchor + 1.5:
            end = s["end"]
            nxt = [x for x in segs if x["start"] >= s["end"] and x["start"] - s["end"] < 0.6]
            if nxt and nxt[0]["end"] - anchor <= 12:
                end = nxt[0]["end"]
            break
    end = min(win_len, end + 0.4)

    # start: sentence boundary around end - target, clip length within [cmin, cmax]
    starts = [s["start"] for s in segs if s["start"] < anchor] or [max(0.0, anchor - 8)]
    want = end - target
    ok = [t for t in starts if cmin <= end - t <= cmax]
    if ok:
        start = min(ok, key=lambda t: abs(t - want))
    else:
        start = max(0.0, end - target)            # no boundary fits: fall back to target length
    if end - start < cmin:
        start = max(0.0, end - cmin)
    if end - start > cmax:
        start = end - cmax
    # never start inside a word: move to the beginning of the segment that contains `start`
    for s in segs:
        if s["start"] < start < s["end"] and end - s["start"] <= cmax + 3:
            start = s["start"]
            break
    start = max(0.0, start - 0.2)
    return dict(start=round(start, 2), end=round(end, 2), anchor=round(anchor, 2),
                duration=round(end - start, 2), anchor_from="audio_peak" if cand else "chat_minus_lag")


# --------------------------------------------------------------------------------------------------
# Without a chat trigger (Twitch clips, imported videos): find the most interesting stretch ourselves.
def _seg_interest(seg):
    from detection.transcript_detector import MARKERS
    t = seg["text"]
    sc = sum(len(rx.findall(t)) * w for (k, rx), w in zip(MARKERS.items(), (3, 2, 2, 0.5, 2)))
    sc += t.count("!") * 1.0 + t.count("?") * 0.6
    words = t.lower().split()
    if len(words) >= 4 and len(set(words)) <= len(words) / 2:      # "non non non non", "waw waw waw"
        sc += 2
    return sc


def best_window(segments, peaks, win_len, cmin=15, cmax=35, target=25):
    """Pick [start, end] (sentence boundaries) maximising reactions + loud peaks + speech density.

    The window must END just after a strong reaction (the punchline), must not open in the middle of
    a sentence and avoids long silences. Returns the same dict shape as choose()."""
    segs = sorted([s for s in segments if s["text"].strip()], key=lambda s: s["start"])
    if not segs:
        return choose(segments, peaks, win_len, 0, win_len, cmin, cmax, target)
    interest = [_seg_interest(s) for s in segs]
    best, bs = None, -1e9
    for i, a in enumerate(segs):
        for j in range(i, len(segs)):
            b = segs[j]
            st, en = max(0.0, a["start"] - 0.25), min(win_len, b["end"] + 0.5)
            dur = en - st
            if dur > cmax:
                break
            if dur < cmin:
                continue
            inside = range(i, j + 1)
            react = sum(interest[k] for k in inside)
            speech = sum(segs[k]["end"] - segs[k]["start"] for k in inside) / dur
            gaps = max([segs[k + 1]["start"] - segs[k]["end"] for k in range(i, j)] or [0])
            loud = sum(1 for p in (peaks or []) if st <= p <= en)
            punch = max(interest[k] for k in range(max(i, j - 1), j + 1))   # strong ending
            s = react + 1.5 * loud + 4 * speech + 1.2 * punch - 0.6 * max(0, gaps - 3) - 0.08 * abs(dur - target)
            if s > bs:
                best, bs = (st, en), s
    if best is None:            # clip shorter than cmin: take everything
        best = (0.0, win_len)
    st, en = best
    return dict(start=round(st, 2), end=round(en, 2), anchor=round(en, 2), duration=round(en - st, 2),
                anchor_from="best_window", interest=round(bs, 2))
