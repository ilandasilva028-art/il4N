# Voix continue : accroche puis prise entière (de « conçois » à la fin), sans découpe ni silence forcé.
import json, subprocess, numpy as np, soundfile as sf, torchaudio as ta
FILM="/home/user/il4N/reel"; D="/home/user/il4N/voix/final"; SR=48000
def load(p):
    x,sr=ta.load(p); x=x[0].numpy()
    return x if sr==SR else np.interp(np.linspace(0,len(x)-1,int(len(x)*SR/sr)),np.arange(len(x)),x)
def fade(y,f=0.015):
    n=int(f*SR); y=y.copy(); y[:n]*=np.linspace(0,1,n); y[-n:]*=np.linspace(1,0,n); return y
words=json.load(open(f"{D}/body_words.json"))
# on coupe après le dernier mot (écrivez-moi en privé) et avant « conçois » (mot 2 du corps)
body=load(f"{D}/body_fast.wav")
w=[(a/1.12,b/1.12) for _,a,b in words]
s=max(0,w[2][0]-0.05)           # « conçois »
e=w[-1][1]+0.15                 # « privé »
seg=fade(body[int(s*SR):int(e*SR)])
hook=load("/home/user/il4N/voix/fix/hook_1.wav")
env=np.convolve(hook**2,np.ones(int(0.01*SR))/int(0.01*SR),"same")
on=np.where(20*np.log10(np.sqrt(env)+1e-9)>-40)[0]
hook=fade(hook[max(0,on[0]-int(0.02*SR)):min(len(hook),on[-1]+int(0.02*SR))])
out=np.concatenate([hook, np.zeros(int(0.08*SR),np.float32), seg]).astype(np.float32)
print("hook",round(len(hook)/SR,2),"body",round(len(seg)/SR,2),"total",round(len(out)/SR,2))
out=out[:int(16.875*SR)]
sf.write(f"{D}/vo_flow_raw.wav",out/np.abs(out).max()*0.89,SR)
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",f"{D}/vo_flow_raw.wav","-af",
 "highpass=f=90,equalizer=f=3200:t=q:w=1.2:g=3,equalizer=f=220:t=q:w=1:g=-2,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=80:makeup=4,alimiter=limit=0.89",
 "-ar",str(SR),f"{FILM}/audio/vo.wav"],check=True)
print("vo ok")
