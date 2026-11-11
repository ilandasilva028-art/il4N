# Voix calée sur les plans : chaque phrase démarre au début de son plan et le remplit (débit ajusté 0.88-1.15).
import json, subprocess, numpy as np, soundfile as sf, torchaudio as ta, tempfile, os
FILM="/home/user/il4N/reel"; D="/home/user/il4N/voix/sync"; SR=48000
g=json.load(open(f"{FILM}/beats.json")); P,O=g["period"],g["offset"]; sec=lambda u:O+u*P
def load(p):
    x,sr=ta.load(p); x=x[0].numpy()
    return x if sr==SR else np.interp(np.linspace(0,len(x)-1,int(len(x)*SR/sr)),np.arange(len(x)),x).astype(np.float32)
def fade(y,f=0.015):
    n=int(f*SR); y=y.copy(); y[:n]*=np.linspace(0,1,n); y[-n:]*=np.linspace(1,0,n); return y
def stretch(y,tempo):
    a=tempfile.mktemp(suffix=".wav"); b=tempfile.mktemp(suffix=".wav"); sf.write(a,y,SR)
    subprocess.run(["ffmpeg","-loglevel","error","-y","-i",a,"-af",f"atempo={tempo:.4f}",b],check=True)
    z,_=sf.read(b,dtype="float32"); os.remove(a); os.remove(b); return z
B=json.load(open(f"{D}/best.json")); W=B["words"]; take=load(f"{D}/take{B['take']}.wav")
low=[w[0].lower().strip(".,!?…'-") for w in W]
def idx(word,after=0): return next(i for i in range(after,len(low)) if word in low[i])
# début de chaque phrase (indice du premier mot) et plan visé (début, fin) en beats
i1=0; i2=idx("crée")-2; i3=idx("mets")-2; i4=idx("et",idx("ligne")); i5=idx("écrivez")
starts=[i1,i2,i3,i4,i5]
slots=[(4.35,11.85),(11.85,20),(20,23.6),(23.6,28.7),(28.7,35.5)]
out=np.zeros(int(16.875*SR)+SR,np.float32)
hook=load("/home/user/il4N/voix/fix/hook_1.wav")
env=np.convolve(hook**2,np.ones(480)/480,"same"); on=np.where(20*np.log10(np.sqrt(env)+1e-9)>-40)[0]
hook=fade(hook[max(0,on[0]-960):on[-1]+960]); out[:len(hook)]+=hook
prev=len(hook)/SR
for k,(i,(ua,ub)) in enumerate(zip(starts,slots)):
    a=max(0,W[i][1]-0.04); e=(W[starts[k+1]-1][2]+0.08) if k+1<len(starts) else W[-1][2]+0.12
    seg=take[int(a*SR):int(e*SR)]
    t0=max(sec(ua),prev+0.08); room=sec(ub)-t0-0.12
    tempo=min(1.15,max(0.88,len(seg)/SR/room)) if k<4 else 1.0
    seg=fade(stretch(seg,tempo)); s=int(t0*SR); out[s:s+len(seg)]+=seg[:len(out)-s]; prev=t0+len(seg)/SR
    print(f"{' '.join(w[0] for w in W[i:(starts[k+1] if k+1<len(starts) else len(W))])[:46]:46s} {t0:5.2f}->{prev:5.2f}s plan {sec(ua):5.2f}-{sec(ub):5.2f} tempo {tempo:.2f}")
out=out[:int(16.875*SR)]
sf.write(f"{D}/vo_raw.wav",out/np.abs(out).max()*0.89,SR)
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",f"{D}/vo_raw.wav","-af",
 "highpass=f=90,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=220:t=q:w=1:g=-2,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=80:makeup=4,alimiter=limit=0.89",
 "-ar",str(SR),f"{FILM}/audio/vo.wav"],check=True); print("vo ok")
