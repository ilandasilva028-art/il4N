"""Heuristic 0-100 "TikTok potential" score with its breakdown.

This is a ranking aid, NOT a probability of going viral.
Each sub-score is 0..1, multiplied by its configurable weight.
"""


def clamp(x):
    return max(0.0, min(1.0, float(x)))


def score(chat, audio, tf, technical_ok, weights, priority=80, review=65):
    """chat: chat event dict or None; audio: audio_detector.analyze(); tf: transcript features."""
    m = tf.get("markers", {}) if tf else {}
    laugh_ast = (audio or {}).get("laugh_score") or 0
    scream_ast = (audio or {}).get("scream_score") or 0
    rise = (audio or {}).get("rise_db") or 0
    kind = (chat or {}).get("kind")

    sub = {}
    # understandable moment: enough speech + a usable quote
    sub["interest"] = clamp(0.5 * clamp(tf.get("n_words", 0) / 40) + 0.5 * bool(tf.get("quote")))
    # streamer reaction: laughs / surprise / swears / repetition in speech, laughter model
    sub["reaction"] = clamp(0.25 * m.get("laugh", 0) + 0.2 * m.get("surprise", 0) + 0.15 * m.get("swear", 0)
                            + 0.15 * max(0, tf.get("repeated", 0) - 1) + 8 * laugh_ast + 4 * scream_ast)
    # chat anomaly vs this channel's own baseline
    sub["chat"] = clamp((chat or {}).get("strength", 0))
    # surprise / originality
    sub["surprise"] = clamp(0.3 * m.get("surprise", 0) + 0.3 * m.get("fail", 0)
                            + 0.4 * bool((audio or {}).get("silence_then_spike"))
                            + (0.3 if kind in ("surprise", "fail") else 0))
    # loudness jump over the window median (6 dB -> 0, 20 dB -> 1)
    sub["audio"] = clamp((rise - 6) / 14)
    # punchline quality: short exclamation/question sentence
    q = tf.get("quote") or ""
    sub["dialogue"] = clamp((0.6 if q else 0) + 0.2 * ("!" in q) + 0.2 * ("?" in q))
    sub["technical"] = 1.0 if technical_ok else 0.0

    total = round(sum(sub[k] * weights.get(k, 0) for k in sub), 1)
    decision = "priority" if total >= priority else "review" if total >= review else "ignore"
    return dict(total=total, decision=decision, sub={k: round(v, 2) for k, v in sub.items()},
                weights=weights, note="heuristic ranking, not a virality probability")
