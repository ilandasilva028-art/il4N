"""TikTok description: one natural specific sentence, credit, exactly 5 relevant hashtags."""
import re

PHRASES = {
    "laugh": "est mort de rire",
    "surprise": "ne s'attendait pas du tout à ça",
    "fail": "voit son plan partir en vrille",
    "hype": "fait réagir tout le chat",
}
KIND_TAG = {"laugh": "#Mdr", "surprise": "#WTF", "fail": "#Fail", "hype": "#Reaction"}
GAME_TAGS = {"grand theft auto vi": ["#GTA6", "#GTAVI"], "just chatting": ["#JustChatting"],
             "fortnite": ["#Fortnite"], "minecraft": ["#Minecraft"], "league of legends": ["#LeagueOfLegends"]}


def tag(s):
    return "#" + re.sub(r"[^0-9A-Za-zÀ-ÿ]", "", s.title())


def make(display_name, handle, kind, quote, category, uncertain=False):
    first = f"{display_name} {PHRASES.get(kind, PHRASES['hype'])}"
    if quote and not uncertain:
        first += f" : « {quote.strip()} »"
    first += " 😂" if kind == "laugh" else " 😳" if kind == "surprise" else " 💀" if kind == "fail" else " 🔥"
    tags = []
    for t in GAME_TAGS.get((category or "").lower(), [tag(category)] if category else ["#Gaming"]):
        tags.append(t)
    tags.append(tag(display_name))
    tags.append(KIND_TAG.get(kind, "#Reaction"))
    for t in ("#Twitch", "#Clip", "#Streamer"):
        if len(tags) < 5:
            tags.append(t)
    tags = list(dict.fromkeys(tags))[:5]
    while len(tags) < 5:
        tags.append(["#Twitch", "#Clip", "#Streamer", "#Gaming", "#FR"][len(tags)])
    return f"{first}\n\nCrédit : @{handle}\n\n{' '.join(tags)}\n"
