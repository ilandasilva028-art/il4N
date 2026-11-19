"""Chat signal: per-channel baselines for laughs, surprise, fails and overall volume.

Pure Python (no I/O) so it can be unit-tested with synthetic messages.
"""
import collections, re, statistics

PATTERNS = {
    "laugh": re.compile(r"(mdr|ptdr|xptdr|jpp|ahah|haha|hihi|\blol\b|\bxd\b|kekw|\blul\b|omegalul|icant"
                        r"|😂|🤣|💀)", re.I),
    "surprise": re.compile(r"(\bwtf\b|\bquoi+\b|\bhein+\b|impossible|\bomg\b|\bwhat\b|chelou|bizarre"
                           r"|\?\?+|😳|😱|🤨|monkas|pogu?|wesh)", re.I),
    "fail": re.compile(r"(\bfail\b|\brip\b|\bf\b|cheh|sheesh|nul+\b|\bcata\b|😭|🤡)", re.I),
}


class ChatDetector:
    def __init__(self, bucket=10, warmup=6, history=30, min_messages=5, ratio=3.0,
                 hype_ratio=3.0, hype_min_messages=25, cooldown=90):
        self.bucket, self.warmup, self.min_messages, self.ratio = bucket, warmup, min_messages, ratio
        self.hype_ratio, self.hype_min, self.cooldown = hype_ratio, hype_min_messages, cooldown
        self.hist = {k: collections.deque(maxlen=history) for k in (*PATTERNS, "total")}
        self.cur = dict.fromkeys(self.hist, 0)
        self.samples = {k: [] for k in PATTERNS}
        self.bucket_end, self.last_event = None, -1e18

    def add(self, text, ts):
        if self.bucket_end is None:
            self.bucket_end = ts + self.bucket
        self.cur["total"] += 1
        for k, rx in PATTERNS.items():
            if rx.search(text):
                self.cur[k] += 1
                if len(self.samples[k]) < 5:
                    self.samples[k].append(text[:80])

    def tick(self, ts):
        """Close the bucket if its time is over. Returns an event dict or None."""
        if self.bucket_end is None:
            self.bucket_end = ts + self.bucket
            return None
        if ts < self.bucket_end:
            return None
        cur, samples = self.cur, self.samples
        self.cur, self.samples = dict.fromkeys(self.hist, 0), {k: [] for k in PATTERNS}
        self.bucket_end = ts + self.bucket
        warm = len(self.hist["total"]) >= self.warmup
        base = {k: (statistics.median(h) if h else 0) for k, h in self.hist.items()}
        for k in self.hist:
            self.hist[k].append(cur[k])
        if not warm or ts - self.last_event < self.cooldown:
            return None
        best = None
        for k in PATTERNS:                    # laugh / surprise / fail spikes
            need = max(self.min_messages, self.ratio * max(base[k], 1))
            if cur[k] >= need:
                strength = min(1.0, cur[k] / (2 * need))
                if not best or strength > best["strength"]:
                    best = dict(kind=k, count=cur[k], baseline=base[k], strength=round(strength, 3))
        need_total = max(self.hype_min, self.hype_ratio * max(base["total"], 1))
        if not best and cur["total"] >= need_total:   # whole chat explodes without keywords
            best = dict(kind="hype", count=cur["total"], baseline=base["total"],
                        strength=round(min(1.0, cur["total"] / (2 * need_total)), 3))
        if best:
            best["counts"] = cur
            best["samples"] = samples.get(best["kind"], [])
            self.last_event = ts
        return best
