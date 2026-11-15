# Voix off des reels de Noël : clone Chatterbox multilingue de la voix d'Ilan (voix/ref22.wav, avec son accord,
# réservée à ses propres vidéos). Recette docs/ROUTINE-QUOTIDIENNE.md : texte entier d'une traite, accroche en
# prise séparée, exaggeration 0.5 / cfg_weight 0.5, 3 graines, transcription Whisper (faster-whisper small) mot à mot.
# Usage : /home/user/tts-env/bin/python voix/noel/gen.py
import json, os, sys, time
import torch, torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(ROOT, "voix/ref22.wav")
OUT = os.path.join(ROOT, "voix/noel")
TEXTES = {
    "flyers_hook": "Noël approche. Votre flyer, lui ?",
    "flyers_body": "S'il passe inaperçu… Start, Pro ou Prestige : moins vingt pour cent, une offre flash de dix jours ! "
                   "Jusqu'au vingt-cinq novembre. Maquette gratuite. Écrivez-moi en privé !",
    "site_hook": "Je crée votre site. Et je le gère pour vous.",
    "site_body": "Lisible sur téléphone. Pour Noël : moins dix pour cent. "
                 "L'abonnement : quatre-vingt-dix euros la première année. Maquette gratuite. Écrivez-moi en privé !",
}
SEEDS = [11, 22, 33]

torch.set_num_threads(os.cpu_count() or 4)
tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
asr = WhisperModel("small", device="cpu", compute_type="int8")
choix = sys.argv[1:] or list(TEXTES)
for nom in choix:
    texte = TEXTES[nom]
    for seed in SEEDS:
        f = os.path.join(OUT, f"{nom}_{seed}.wav")
        if not os.path.exists(f):
            t0 = time.time(); torch.manual_seed(seed)
            wav = tts.generate(texte, language_id="fr", audio_prompt_path=REF, exaggeration=0.5, cfg_weight=0.5)
            ta.save(f, wav, tts.sr)
            print(f"{nom} graine {seed} : {wav.shape[-1] / tts.sr:.1f} s en {time.time() - t0:.0f} s", flush=True)
        segs, _ = asr.transcribe(f, language="fr", word_timestamps=True, initial_prompt=texte)
        mots = [[w.word.strip(), round(w.start, 3), round(w.end, 3)] for s in segs for w in s.words]
        json.dump(mots, open(f + ".words.json", "w"), ensure_ascii=False)
        print("   Whisper :", " ".join(m[0] for m in mots), flush=True)
