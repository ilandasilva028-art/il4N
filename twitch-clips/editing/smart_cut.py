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
