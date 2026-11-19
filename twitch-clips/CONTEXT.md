> **Mise à jour : le système actuel est décrit dans README.md (Clip Factory 2.0). Ce fichier décrit l’ancienne version.**

# Twitch → TikTok auto-clipper: full context for the next AI

## Goal (what the user wants)
- Watch **live** Twitch streams of big **French** streamers and, every time something **funny or weird**
  happens, cut it into a **ready-to-post TikTok**: 9:16, hook text, French subtitles, and a TikTok-only
  caption (hook line + `Crédit : @<channel>` + 5 hashtags). Each clip is sent to the user in chat.
- Current channels: **squeezie, anyme023, michou** (all on GTA VI at the time of writing).
  Removed on request: kaicenat, ishowspeed, kamet0, mistermv, domingo, jltomy. `aminematue` exists but was never live.
- User preferences: talks French, wants short simple answers, wants token economy, wants descriptions
  **for TikTok only**, always credit the streamer. Earlier they wanted GTA-VI-only clips; now they want
  "moments drôles ou étranges" on the 3 channels above, whatever the category.

## Where it runs (important constraints)
- A Claude Code **cloud container** (Linux, 4 CPU, 15 GB RAM, no GPU). It **restarts without warning**
  (≈5 times in one afternoon). Every restart kills all background processes and corrupts the clip being
  written. Nothing survives except files on disk.
- Outbound network goes through a **proxy allowlist** (no wildcards allowed via the agent tool).
  Twitch serves video from per-channel hosts like `<12 hex>.j.cloudfront.hls.ttvnw.net` and playlists from
  `use2X.playlist.ttvnw.net`; each new one must be added to the environment (they are listed in the
  environment settings). A refused host shows in `curl -sS "$HTTPS_PROXY/__agentproxy/status"`.
  Allowing `*.ttvnw.net` in the environment settings (by the user, in the UI) would remove this pain.
- YouTube downloads are blocked by YouTube's bot check from this IP (yt-dlp "Sign in to confirm you're not a bot").
- Python envs: system `python3` (streamlink 8.6.3, websocket-client) and **`/home/user/tts-env/bin/python`**
  (torch CPU, faster-whisper, transformers, sentencepiece). Models cached from Hugging Face:
  `small` whisper, `MIT/ast-finetuned-audioset-10-10-0.4593`, `Helsinki-NLP/opus-mt-en-fr`.
- Deliveries to the user: the agent sends files with SendUserFile **only during an active turn**; a
  scheduled one-shot trigger (`trig_01XimJBhHGomaugesa543ApN`, re-armed by hand each run, ~hourly) does
  the periodic "check folders → send new valid clips → relaunch dead watchers".

## Files (all in `twitch-clips/`)
| File | Role |
|---|---|
| `hype_watch.py` | **Main watcher.** Records a channel with streamlink into 30 s TS segments (20 min rolling buffer in `<out>/_buffer`), reads chat anonymously over IRC websocket, counts messages per 10 s, triggers on spikes, cuts [spike−45 s, spike+20 s], renders with `make_clip.py`, then runs `subtitle_fr.py` in the background. `--laugh` mode counts only funny/weird messages (`LAUGH_RE`: mdr, ptdr, 😂, KEKW, wtf, ??, 😳, chelou…), names files `tiktok_*.mp4`, adds hook "<NAME> EXPLOSE DE RIRE 😂" and writes a `.txt` caption. |
| `laughchat_forever.sh <channel>` | Supervisor loop for `hype_watch.py --laugh` (defaults `--min-msgs 5 --ratio 3`), output in `output/laugh/<channel>/`. **This is what currently runs.** |
| `watch_forever.sh <channel>` | Same supervisor for plain hype mode (output `output/hype/<channel>/`). |
| `make_clip.py` | Renders 9:16: `--layout cam` (webcam crop on top + gameplay crop below) or `--layout blur` (full 16:9 frame centered on blurred background). Burns word-by-word ASS subtitles from a faster-whisper transcript JSON (current word in yellow) and an optional hook banner. |
| `subtitle_fr.py` | Transcribes a clip (faster-whisper small), translates EN→FR with Marian if needed, burns sentence subtitles → `<clip>_fr.mp4`. |
| `analyze.py` | Offline: transcript + loudness per second for a recording (used for manual picks). Loudness window index is unreliable on joined files; trust transcript timestamps. |
| `laugh_watch.py` + `laugh_forever.sh` | Audio laughter detector (AST AudioSet classes Laughter/Belly laugh/Giggle/Chuckle on 3 s windows). **Abandoned:** too slow on CPU for 3 live streams (fell behind real time, footage got pruned before cutting) and only 1 detection in 45 min. |
| `record.sh` | First simple helper (live / vod / cut). |

## Pipeline as it runs now
1. `laughchat_forever.sh squeezie|anyme023|michou` (detached with `setsid nohup`).
2. streamlink `-O` | ffmpeg `-f segment -segment_time 30 -reset_timestamps 1` → `seg_YYYYmmdd_HHMMSS.ts`.
3. Chat: 1 min warm-up, then a 10 s bucket triggers if `count ≥ max(min_msgs, ratio × median(last 5 min))`, 2 min cooldown.
   Measured laugh-message rates: squeezie ~19/min, anyme ~5/min, jltomy ~0/min.
4. After spike+30 s: join needed segments with **ffmpeg concat demuxer** (segments restart timestamps;
   plain `cat` produced broken/corrupt clips — fixed), `make_clip.py --layout blur`, then `subtitle_fr.py` → `_fr.mp4`.
5. Validation used before sending: `ffprobe` must show numeric duration + audio + video streams.

## Known problems / what to improve (highest value first)
1. **Survive restarts**: nothing auto-starts after a container restart. Options: environment setup script
   or SessionStart hook that relaunches the 3 watchers; or run the whole thing on the user's own machine/VPS
   (`pip install streamlink websocket-client faster-whisper`, ffmpeg) where it can run 24/7.
2. **Clips are 65 s** (45 s before + 20 s after): too long for TikTok. Target 15–35 s centred on the reaction
   (e.g. −15 s/+10 s, or trim with transcript/loudness around the spike).
3. **Smarter "funny/weird" detection**: chat keyword spikes work but lag the moment by a few seconds and
   miss quiet-chat streamers. Combine signals: chat laugh/weird rate + audio loudness jump + (cheap) laughter
   model run only on the 30 s around a chat spike (not continuously) + transcript keywords. Rank and keep the best.
4. **Layout**: always `blur`. Detect the webcam box automatically (face detection on a frame) and use the
   `cam` layout (webcam on top, game below) — much better for TikTok.
5. **Subtitles**: `_fr` version uses sentence-level subs; word-by-word (`make_clip`) only exists when a transcript
   is passed. Unify: transcribe the cut once, then word-by-word subs + hook in a single render (also halves CPU).
   The subtitle step sometimes produced a corrupt `_fr.mp4` (killed mid-write) → write to a temp name then rename atomically.
6. **Captions are generic** ("<Name> est mort de rire 😂 Le chat ne s'en remet pas !"). Generate a specific hook
   from the transcript (best quote) and pick hashtags by category (#GTA6 #GTAVI when category is GTA VI).
7. **Atomic outputs**: render to `*.part.mp4` then `os.replace`, so a restart never leaves corrupt `tiktok_*.mp4`.
8. **Track "already sent"**: keep a `sent.json` instead of relying on chat history / timestamps.
9. **Proxy hosts**: auto-detect refused `*.ttvnw.net` hosts from the proxy status and report them (or ask the user to allow `*.ttvnw.net` once).
10. Old output folders `output/now/` (bad clips with wrong timestamps) and `output/hype/` can be deleted.

## How to run / test quickly
```bash
# start (one per channel)
setsid nohup bash twitch-clips/laughchat_forever.sh squeezie >/dev/null 2>&1 </dev/null &
# status
pgrep -fa hype_watch.py; grep -h LAUGH twitch-clips/output/laugh/*/*.chat.log | tail
# validate a clip
ffprobe -v error -show_entries format=duration:stream=codec_type -of compact <file>
```
Rights: clips are of other people's streams — always credit (`Crédit : @channel`), the user publishes them.
