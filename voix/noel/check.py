# Vérification « à l'aveugle » des prises : Whisper sans le texte en indice, comparé au texte attendu.
import sys, re, json, difflib
from faster_whisper import WhisperModel
sys.path.insert(0, 'voix/noel')
attendu = json.load(open('voix/noel/textes.json'))
m = WhisperModel('small', device='cpu', compute_type='int8')
norm = lambda s: re.sub(r"[^a-zàâçéèêëîïôûùüœ0-9 ]", ' ', s.lower().replace("’", "'").replace("'", ' ')).split()
for f in sys.argv[1:]:
    nom = f.split('/')[-1].rsplit('_', 1)[0]
    segs, _ = m.transcribe(f, language='fr', word_timestamps=True)
    mots = [[w.word.strip(), round(w.start, 3), round(w.end, 3)] for s in segs for w in s.words]
    a, b = norm(attendu[nom]), norm(' '.join(x[0] for x in mots))
    r = difflib.SequenceMatcher(None, a, b).ratio()
    json.dump(mots, open(f + '.blind.json', 'w'), ensure_ascii=False)
    print(f"{f.split('/')[-1]:22s} {r:.2f}  {mots[-1][2]:.1f}s | {' '.join(x[0] for x in mots)}")
