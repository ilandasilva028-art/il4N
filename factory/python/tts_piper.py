"""Synthèse vocale française locale avec Piper (une phrase = un fichier WAV).

Usage : python tts_piper.py <segments.json> <dossier_sortie>
segments.json : {"model": "...onnx", "speaker": 0, "length_scale": 0.92, "noise_scale": 0.667, "noise_w": 0.8,
                 "segments": [{"id": "s01", "text": "..."}]}
Écrit <id>.wav pour chaque segment et affiche un JSON {id: durée_en_secondes}.
"""
import json
import sys
import wave
from pathlib import Path


def main() -> int:
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)

    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(spec["model"])
    cfg = SynthesisConfig(
        speaker_id=spec.get("speaker"),
        length_scale=spec.get("length_scale", 1.0),
        noise_scale=spec.get("noise_scale", 0.667),
        noise_w_scale=spec.get("noise_w", 0.8),
    )
    result = {}
    for seg in spec["segments"]:
        path = out / f"{seg['id']}.wav"
        with wave.open(str(path), "wb") as wf:
            voice.synthesize_wav(seg["text"], wf, syn_config=cfg)
        with wave.open(str(path), "rb") as rf:
            result[seg["id"]] = round(rf.getnframes() / rf.getframerate(), 3)
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
