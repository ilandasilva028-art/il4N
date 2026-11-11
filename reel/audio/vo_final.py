# Monte la voix finale : accroche séparée + corps (prise choisie) découpé aux mots, posé sur les beats.
import json, subprocess, difflib, numpy as np, soundfile as sf, torchaudio as ta
FILM="/home/user/il4N/reel"; D="/home/user/il4N/voix/final"; SR=48000
g=json.load(open(f"{FILM}/beats.json")); P,O=g["period"],g["offset"]
def load(path):
    x,sr=ta.load(path); x=x[0].numpy()
    return x if sr==SR else np.interp(np.linspace(0,len(x)-1,int(len(x)*SR/sr)),np.arange(len(x)),x)
def fade(y,f=0.012):
    n=int(f*SR); y=y.copy(); y[:n]*=np.linspace(0,1,n); y[-n:]*=np.linspace(1,0,n); return y
words=json.load(open(f"{D}/body_words.json"))
keys=[("conçois",8.5),("crée",12.5),("mets",20.5),("zéro",27.2),("écrivez",30.2)]
def find(k,start=0):
    best=None
    for i in range(start,len(words)):
        r=difflib.SequenceMatcher(None,words[i][0].lower().strip(".,!?…'"),k).ratio()
        if best is None or r>best[0]: best=(r,i)
        if r>0.8: return i
    return best[1]
idx=[]; cur=0
for k,_ in keys:
    i=find(k,cur); idx.append(i); cur=i+1
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",f"{D}/body_s4.wav","-af","atempo=1.12",f"{D}/body_fast.wav"],check=True)
body=load(f"{D}/body_fast.wav")
words=[(w,a/1.12,b/1.12) for w,a,b in words]
out=np.zeros(int(16.875*SR)+SR,np.float32)
# accroche : prise dédiée
hook=load("/home/user/il4N/voix/fix/hook_1.wav")
env=np.convolve(hook**2,np.ones(int(0.01*SR))/int(0.01*SR),"same")
on=np.where(20*np.log10(np.sqrt(env)+1e-9)>-40)[0]
hook=hook[max(0,on[0]-int(0.02*SR)):min(len(hook),on[-1]+int(0.12*SR))]; hook=fade(hook)
print("hook dur",round(len(hook)/SR,2))
t0=O+0*P; i0=int(t0*SR); out[i0:i0+len(hook)]+=hook
prev_end=None
for n,((k,beat),i) in enumerate(zip(keys,idx)):
    start=max(0,words[i][1]-0.05)
    end=words[idx[n+1]][1]-0.06 if n+1<len(idx) else words[-1][2]+0.1
    seg=fade(body[int(start*SR):int(end*SR)])
    t=O+beat*P
    if prev_end is not None and t<prev_end+0.12: t=prev_end+0.12
    s=int(t*SR); out[s:s+len(seg)]+=seg; prev_end=t+len(seg)/SR
    print(f"{k:8s} {words[i][0]:12s} place {t:5.2f}s  dur {len(seg)/SR:4.2f}s  fin {t+len(seg)/SR:5.2f}s")
out=out[:int(16.875*SR)]
sf.write(f"{D}/vo_raw.wav",out/np.abs(out).max()*0.89,SR)
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",f"{D}/vo_raw.wav","-af",
 "highpass=f=90,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=220:t=q:w=1:g=-2,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=80:makeup=4,alimiter=limit=0.89",
 "-ar",str(SR),f"{FILM}/audio/vo.wav"],check=True)
print("vo ok")
