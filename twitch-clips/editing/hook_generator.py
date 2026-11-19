"""Short on-screen hook, specific to the moment and only based on detected facts.

- Uses a REAL quote from the transcript when a short punchy one exists.
- Otherwise a template matching the evidence (laugh only if laughter was detected, etc.).
- Avoids repeating the creator's recent hooks.
"""
import hashlib

TEMPLATES = {
    "laugh": ["{N} NE S'EN REMET PAS", "FOU RIRE DE {N}", "{N} CRAQUE COMPLÈTEMENT", "IMPOSSIBLE POUR {N} DE RESTER SÉRIEUX"],
    "surprise": ["{N} N'AVAIT PAS PRÉVU ÇA", "PERSONNE NE S'Y ATTENDAIT", "{N} N'EN REVIENT PAS", "ÇA A PRIS {N} DE COURT"],
    "fail": ["ÇA NE S'EST PAS PASSÉ COMME PRÉVU", "{N} A TOUT RATÉ", "LE PLAN DE {N} TOURNE MAL"],
    "hype": ["LE CHAT A EXPLOSÉ ICI", "LE MOMENT QUI A FAIT RÉAGIR TOUT LE CHAT", "TOUT LE CHAT A RÉAGI À ÇA"],
}


def evidence_kind(chat, tf, audio):
    m = (tf or {}).get("markers", {})
    laugh_proof = m.get("laugh", 0) > 0 or ((audio or {}).get("laugh_score") or 0) >= 0.02
    kind = (chat or {}).get("kind") or "hype"
    if kind == "laugh" and not laugh_proof:
        return "hype"                                  # chat laughed, but no proof the streamer did
    if kind == "hype":
        if laugh_proof:
            return "laugh"
        if m.get("surprise", 0) >= 2:
            return "surprise"
        if m.get("fail", 0) >= 2:
            return "fail"
    return kind


def make(name, chat, tf, audio, recent=(), seed=""):
    N = name.upper()
    q = (tf or {}).get("quote")
    if q and len(q) <= 48 and len(q.split()) <= 9 and not (tf.get("uncertain")):
        h = f"« {q.upper().rstrip('.')} »"
        if h not in recent:
            return h, "quote"
    kind = evidence_kind(chat, tf, audio)
    opts = [t.format(N=N) for t in TEMPLATES.get(kind, TEMPLATES["hype"])]
    fresh = [o for o in opts if o not in recent] or opts
    i = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(fresh)
    return fresh[i], kind
