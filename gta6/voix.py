"""voix.py : voix off française (femme) pour make_tiktok.py.

Moteur par défaut : Kokoro (github.com/thewh1teagle/kokoro-onnx, MIT ; modèle Apache-2.0),
voix « ff_siwis ». Secours : Piper (github.com/rhasspy/piper, MIT), voix « fr_FR-siwis-medium ».
Les deux voix viennent du jeu de données SIWIS (licence CC-BY 4.0) : créditer
« Voix : SIWIS (CC-BY 4.0) » dans la description ou la bio. Gratuit, hors ligne.

Fichier de narration (--voix narration.txt), une réplique par ligne, temps de SORTIE :
    0.4 | Il lui avait promis une vraie maison.
    9.0 | Quelques jours plus tard…
    # les lignes qui commencent par # sont ignorées
Chaque réplique part à son instant (décalée si la précédente n'est pas finie).
Prononciation des noms anglais : « Jason[Djéïssonne] » (affiche Jason, dit Djéïssonne).
Lexique conseillé : Jason[Djéïssonne], Lucia[Loussia], Vice City[Vaïsse Siti], Leonida[Léonida].
"""
from __future__ import annotations

import re
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np

KOKORO_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
KOKORO_FILES = ("kokoro-v1.0.onnx", "voices-v1.0.bin")
VOICE = "fr_FR-siwis-medium"
URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/"
SR = 48000


def model_path() -> Path:
    d = Path.home() / ".cache" / "il4n-voix"
    d.mkdir(parents=True, exist_ok=True)
    for f in (f"{VOICE}.onnx", f"{VOICE}.onnx.json"):
        p = d / f
        if not p.exists():
            print(f"· téléchargement de la voix {f}…", flush=True)
            urllib.request.urlretrieve(URL + f, p)
    return d / f"{VOICE}.onnx"


def parse_script(path: Path):
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^\s*([\d.]+)\s*\|\s*(.+)$", line)
        if not m:
            raise SystemExit(f"ligne de narration invalide : « {line} » (format « 2.5 | texte »)")
        out.append((float(m.group(1)), m.group(2).strip()))
    return sorted(out)


PRONONCE = re.compile(r"(\S+?)\[([^\]]+)\]")


def a_dire(text):
    """« Jason[Djéïssonne] » -> ce que la voix prononce."""
    return PRONONCE.sub(lambda m: m.group(2), text)


def a_afficher(text):
    """« Jason[Djéïssonne] » -> ce que le sous-titre affiche."""
    return PRONONCE.sub(lambda m: m.group(1), text)


_kokoro = None


def kokoro():
    """Kokoro (github.com/thewh1teagle/kokoro-onnx, MIT ; voix ff_siwis) : plus naturelle que Piper."""
    global _kokoro
    if _kokoro is None:
        try:
            from kokoro_onnx import Kokoro
        except ImportError:
            _kokoro = False
            return _kokoro
        d = Path.home() / ".cache" / "il4n-voix"
        d.mkdir(parents=True, exist_ok=True)
        for f in KOKORO_FILES:
            if not (d / f).exists():
                print(f"· téléchargement de la voix {f}…", flush=True)
                urllib.request.urlretrieve(KOKORO_URL + f, d / f)
        _kokoro = Kokoro(str(d / KOKORO_FILES[0]), str(d / KOKORO_FILES[1]))
    return _kokoro


MOTEUR = "kokoro"  # kokoro (défaut) ou piper


def synth(text: str, out: Path, speed=1.06):
    """Une réplique -> wav 48 kHz stéréo, traitée (présence, compression)."""
    raw = out.with_suffix(".raw.wav")
    k = kokoro() if MOTEUR == "kokoro" else False
    if k:
        import wave
        a, sr = k.create(text, voice="ff_siwis", speed=speed, lang="fr-fr")
        with wave.open(str(raw), "wb") as fh:
            fh.setnchannels(1)
            fh.setsampwidth(2)
            fh.setframerate(sr)
            fh.writeframes((np.clip(a, -1, 1) * 32767).astype("<i2").tobytes())
    else:
        r = subprocess.run([sys.executable, "-m", "piper", "-m", str(model_path()), "-f", str(raw),
                            "--length-scale", f"{1 / speed:.3f}", "--sentence-silence", "0.15",
                            "--noise-scale", "0.6", "--noise-w-scale", "0.7"],
                           input=text, text=True, capture_output=True)
        if r.returncode != 0:
            raise SystemExit("voix : échec Piper\n" + r.stderr[-800:])
    # voix plus « radio » : coupe le bas, présence à 3 kHz, compression, fin propre
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                    "highpass=f=90,equalizer=f=3000:t=q:w=1.2:g=3,equalizer=f=220:t=q:w=1:g=-2,"
                    "acompressor=threshold=-20dB:ratio=3.5:attack=5:release=80,"
                    "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"  # silence final seulement
                    f"aresample={SR},pan=stereo|c0=c0|c1=c0", str(out)], check=True)
    raw.unlink(missing_ok=True)


def read_wav(p: Path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


def word_times(wav: Path, text: str):
    """Instant de chaque mot (Whisper sur la voix générée : synchro exacte)."""
    from faster_whisper import WhisperModel
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True).stdout
    m = WhisperModel("small", device="auto", compute_type="int8")
    segs, _ = m.transcribe(np.frombuffer(raw, np.float32).copy(), language="fr", word_timestamps=True,
                           initial_prompt=text)
    ws = [{"s": w.start, "e": w.end, "w": w.word.strip()} for s in segs for w in (s.words or []) if w.word.strip()]
    # on garde le TEXTE ÉCRIT (orthographe exacte) et on répartit ses mots sur les temps trouvés
    mots = text.split()
    if not ws:
        d = len(read_wav(wav)) / SR
        return [{"s": d * i / len(mots), "e": d * (i + 1) / len(mots), "w": w} for i, w in enumerate(mots)]
    t0, t1 = ws[0]["s"], ws[-1]["e"]
    if len(ws) == len(mots):
        return [{"s": a["s"], "e": a["e"], "w": w} for a, w in zip(ws, mots)]
    lens = np.array([len(w) + 1 for w in mots], float)
    edges = t0 + (t1 - t0) * np.concatenate([[0], np.cumsum(lens) / lens.sum()])
    return [{"s": float(edges[i]), "e": float(edges[i + 1]), "w": w} for i, w in enumerate(mots)]


def build_track(script: Path, work: Path, total: float, gain_db=0.0):
    """-> (piste voix wav, mots horodatés en temps de sortie, fenêtres de parole)."""
    lines = parse_script(script)
    n = int(SR * (total + 0.5))
    track = np.zeros((n, 2), np.float32)
    words, windows, t_free = [], [], 0.0
    for i, (t, text) in enumerate(lines):
        w = work / f"voix_{i:02d}.wav"
        synth(a_dire(text), w)
        a = read_wav(w)
        start = max(t, t_free)
        i0 = int(start * SR)
        i1 = min(n, i0 + len(a))
        if i1 <= i0:
            continue
        track[i0:i1] += a[: i1 - i0]
        dur = (i1 - i0) / SR
        for wd in word_times(w, a_afficher(text)):
            words.append({"s": start + wd["s"], "e": start + wd["e"], "w": wd["w"]})
        words[-1]["eob"] = True
        windows.append((start, start + dur))
        t_free = start + dur + 0.15
        if start + dur > total:
            print(f"⚠️ voix : la réplique « {text[:30]}… » dépasse la fin de la vidéo", flush=True)
    peak = float(np.abs(track).max()) or 1.0
    track = track / peak * 0.89 * (10 ** (gain_db / 20))
    out = work / "voix.wav"
    import wave
    with wave.open(str(out), "wb") as fh:
        fh.setnchannels(2)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes((np.clip(track, -1, 1) * 32767).astype("<i2").tobytes())
    return out, words, windows
