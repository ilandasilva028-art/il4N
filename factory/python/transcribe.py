"""Transcription horodatée au mot (faster-whisper, CPU, int8).

Usage : python transcribe.py <audio_ou_video> <sortie.json> [--model base] [--lang fr] [--models-dir DIR] [--prompt TEXTE]
Le modèle est téléchargé une fois dans --models-dir (base ≈ 145 Mo, small ≈ 470 Mo).
"""
import argparse
import json
import os
import sys
import time


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("out")
    p.add_argument("--model", default="base")
    p.add_argument("--lang", default="fr")
    p.add_argument("--models-dir", default=None)
    p.add_argument("--prompt", default=None, help="texte attendu (aide l'orthographe des noms propres)")
    p.add_argument("--threads", type=int, default=max(1, (os.cpu_count() or 2) // 2))
    a = p.parse_args()

    from faster_whisper import WhisperModel

    t0 = time.time()
    model = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=a.threads, download_root=a.models_dir)
    segments, info = model.transcribe(
        a.src,
        language=None if a.lang == "auto" else a.lang,
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
        initial_prompt=a.prompt,
    )
    segs, words = [], []
    for s in segments:
        segs.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(), "avg_logprob": round(s.avg_logprob, 3), "no_speech_prob": round(s.no_speech_prob, 3)})
        for w in s.words or []:
            words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "prob": round(w.probability, 3)})
    out = {
        "model": a.model,
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration": round(info.duration, 3),
        "text": " ".join(s["text"] for s in segs).strip(),
        "segments": segs,
        "words": words,
        "seconds": round(time.time() - t0, 1),
    }
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(json.dumps({"ok": True, "words": len(words), "seconds": out["seconds"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
