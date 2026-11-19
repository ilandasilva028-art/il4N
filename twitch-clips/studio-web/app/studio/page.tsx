"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, Crop, Pause, Play, Scissors, Sparkles, Type, Wand2 } from "lucide-react";
import { api, fmtDur, media, useApi, type Clip } from "@/lib/api";
import { Badge, Button, Card, CardTitle, Empty, ErrorBox, Input, Label, PageHeader, Progress, Select, Skeleton, StateBadge } from "@/components/ui";

type Detail = Clip & {
  analysis: { transcript: { segments: { start: number; end: number; text: string }[] }; cut: { start: number; end: number; anchor: number };
    visual?: { cam_box: number[] | null } } | null;
  render_params: Partial<Params>; win_start: number | null; win_end: number | null;
};
type Params = { start: number; end: number; layout: "auto" | "blur" | "cam"; cam_box: number[] | null; hook: string;
  sub_y: number; font_size: number; color: string; highlight: string };

const PW = 270, PH = 480;            // preview canvas (1080x1920 / 4)

function Preview({ video, p, camBox }: { video: HTMLVideoElement | null; p: Params; camBox: number[] | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = ref.current, v = video;
      if (c && v && v.videoWidth) {
        const ctx = c.getContext("2d")!;
        const sw = v.videoWidth, sh = v.videoHeight, k = sw / 1280;
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, PW, PH);
        const mode = p.layout === "auto" ? (camBox ? "cam" : "blur") : p.layout;
        const box = p.layout === "cam" ? p.cam_box : camBox;
        if (mode === "cam" && box) {
          const [x, y, w, h] = box.map((n) => n * k);
          const camH = Math.round(PW * h / w), gameH = PH - camH, gw = sh * PW / gameH;
          ctx.drawImage(v, x, y, w, h, 0, 0, PW, camH);
          ctx.drawImage(v, (sw - gw) / 2, 0, gw, sh, 0, camH, PW, gameH);
        } else {
          const bw = sh * PW / PH;
          ctx.globalAlpha = 0.45; ctx.drawImage(v, (sw - bw) / 2, 0, bw, sh, 0, 0, PW, PH); ctx.globalAlpha = 1;
          const vh = PW * 9 / 16;
          ctx.drawImage(v, 0, 0, sw, sh, 0, (PH - vh) / 2, PW, vh);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [video, p, camBox]);
  return (
    <div className="relative mx-auto rounded-2xl overflow-hidden border border-line shadow-2xl shadow-brand/10" style={{ width: PW, height: PH }}>
      <canvas ref={ref} width={PW} height={PH} className="block" />
      {p.hook && <div className="absolute inset-x-3 text-center" style={{ top: 170 / 4 }}>
        <span className="inline bg-[#FFE500] text-black font-extrabold text-[15px] leading-tight px-1.5 box-decoration-clone">{p.hook}</span></div>}
      <div className="absolute inset-x-3 text-center font-extrabold uppercase" style={{ top: p.sub_y / 4 - p.font_size / 8, fontSize: p.font_size / 4, color: p.color, textShadow: "0 0 3px #000,0 0 3px #000,0 0 3px #000" }}>
        Aperçu <span style={{ color: p.highlight }}>sous-titres</span>
      </div>
      <Badge className="absolute bottom-2 left-2 bg-black/60">Aperçu indicatif · rendu final par FFmpeg</Badge>
    </div>
  );
}

function Editor({ id }: { id: number }) {
  const { data: c, error, reload } = useApi<Detail>(`/clips/${id}`, 2000);
  const [p, setP] = useState<Params | null>(null);
  const [vid, setVid] = useState<HTMLVideoElement | null>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (c?.analysis && !p) {
      const rp = c.render_params || {};
      setP({ start: rp.start ?? c.analysis.cut.start, end: rp.end ?? c.analysis.cut.end, layout: rp.layout ?? "auto",
        cam_box: rp.cam_box ?? c.analysis.visual?.cam_box ?? null, hook: rp.hook ?? c.hook ?? "", sub_y: rp.sub_y ?? 1330,
        font_size: rp.font_size ?? 72, color: rp.color ?? "#FFFFFF", highlight: rp.highlight ?? "#FFE500" });
    }
  }, [c, p]);
  if (error) return <ErrorBox error={error} />;
  if (!c || !p) return <Skeleton className="h-[600px]" />;
  if (!c.analysis) return <Empty title="Clip non analysé">Le studio a besoin de l'analyse (transcription, découpe). Attendez la fin de l'analyse dans Production.</Empty>;
  const len = c.win_end ?? 60;
  const segs = c.analysis.transcript.segments;
  const up = (k: Partial<Params>) => setP({ ...p, ...k });
  const rendering = c.state === "RENDERING" || (c.state === "ANALYZED" && c.phase === "queued");
  const generate = async () => {
    setBusy(true); setErr(null);
    const body = { ...p, hook: p.hook || null, cam_box: p.layout === "cam" ? p.cam_box : null };
    try { await api(`/clips/${id}/render`, { method: "POST", body: JSON.stringify(body) }); reload(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const seek = (s: number) => { if (vid) vid.currentTime = s; };
  return (
    <div className="grid xl:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-4 min-w-0">
        <Card className="p-3">
          <video ref={setVid} src={media(`/clips/${id}/media?kind=source`)} crossOrigin="anonymous" playsInline
            onTimeUpdate={(e) => { const v = e.currentTarget; setT(v.currentTime); if (v.currentTime >= p.end && !v.paused) { v.pause(); } }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="w-full aspect-video rounded-xl bg-black" />
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button variant="outline" onClick={() => { if (!vid) return; if (vid.paused) { if (vid.currentTime < p.start || vid.currentTime >= p.end) vid.currentTime = p.start; vid.play(); } else vid.pause(); }}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}Lire l'extrait</Button>
            <span className="text-sm tabular-nums text-mute">{t.toFixed(1)} s / {len.toFixed(0)} s</span>
            <Button variant="ghost" onClick={() => up({ start: Math.min(t, p.end - 5) })}>Début ici</Button>
            <Button variant="ghost" onClick={() => up({ end: Math.max(t, p.start + 5) })}>Fin ici</Button>
            <Badge tone={p.end - p.start > 35 || p.end - p.start < 15 ? "warn" : "ok"}>Durée {fmtDur(p.end - p.start)}</Badge>
          </div>
        </Card>
        <Card>
          <CardTitle icon={<Scissors className="size-4 text-brand2" />}>Timeline</CardTitle>
          <div className="relative h-14 rounded-lg bg-bg border border-line overflow-hidden cursor-pointer"
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * len); }}>
            {segs.map((s, i) => <div key={i} title={s.text} className="absolute top-2 h-3 rounded bg-white/15" style={{ left: `${s.start / len * 100}%`, width: `${Math.max(0.4, (s.end - s.start) / len * 100)}%` }} />)}
            <div className="absolute inset-y-0 bg-brand/25 border-x-2 border-brand" style={{ left: `${p.start / len * 100}%`, width: `${(p.end - p.start) / len * 100}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-warn" title="Réaction détectée" style={{ left: `${c.analysis.cut.anchor / len * 100}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${t / len * 100}%` }} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div><Label>Début : {p.start.toFixed(1)} s</Label><input type="range" min={0} max={len} step={0.1} value={p.start} className="w-full" onChange={(e) => up({ start: Math.min(Number(e.target.value), p.end - 5) })} /></div>
            <div><Label>Fin : {p.end.toFixed(1)} s</Label><input type="range" min={0} max={len} step={0.1} value={p.end} className="w-full" onChange={(e) => up({ end: Math.max(Number(e.target.value), p.start + 5) })} /></div>
          </div>
          <p className="text-[11px] text-mute mt-2">Barres grises : phrases transcrites · trait orange : réaction détectée · zone violette : extrait.</p>
        </Card>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardTitle icon={<Crop className="size-4 text-brand2" />}>Cadrage</CardTitle>
            <Select className="w-full" value={p.layout} onChange={(e) => up({ layout: e.target.value as Params["layout"] })}>
              <option value="auto">Automatique ({c.analysis.visual?.cam_box ? "webcam détectée" : "pas de webcam fiable → fond flouté"})</option>
              <option value="blur">Plein écran sur fond flouté</option><option value="cam">Webcam en haut + gameplay</option>
            </Select>
            {p.layout === "cam" && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {["x", "y", "largeur", "hauteur"].map((l, i) => (
                  <div key={l}><Label>{l}</Label><Input type="number" min={0} max={1280} value={p.cam_box?.[i] ?? 0}
                    onChange={(e) => { const b = [...(p.cam_box ?? [0, 0, 320, 200])]; b[i] = Number(e.target.value); up({ cam_box: b }); }} /></div>))}
                <p className="col-span-4 text-[11px] text-mute">Cadre de la webcam sur l'image 1280×720 de la source.</p>
              </div>)}
          </Card>
          <Card>
            <CardTitle icon={<Type className="size-4 text-brand2" />}>Accroche et sous-titres</CardTitle>
            <Label>Texte d'accroche (3 premières secondes)</Label>
            <Input value={p.hook} maxLength={90} onChange={(e) => up({ hook: e.target.value.toUpperCase() })} placeholder="Laisser vide = accroche automatique" />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><Label>Position verticale : {p.sub_y}px</Label><input type="range" min={900} max={1650} value={p.sub_y} onChange={(e) => up({ sub_y: Number(e.target.value) })} className="w-full" /></div>
              <div><Label>Taille : {p.font_size}</Label><input type="range" min={48} max={110} value={p.font_size} onChange={(e) => up({ font_size: Number(e.target.value) })} className="w-full" /></div>
              <label className="flex items-center gap-2 text-xs text-mute">Couleur <input type="color" value={p.color} onChange={(e) => up({ color: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-xs text-mute">Mot actif <input type="color" value={p.highlight} onChange={(e) => up({ highlight: e.target.value })} /></label>
            </div>
          </Card>
        </div>
      </div>
      <div className="space-y-4">
        <Card className="p-4"><CardTitle icon={<Sparkles className="size-4 text-brand2" />}>Aperçu 9:16</CardTitle>
          <Preview video={vid} p={p} camBox={c.analysis.visual?.cam_box ?? null} /></Card>
        <Card>
          <div className="flex items-center justify-between mb-3"><span className="text-sm font-semibold">Rendu</span><StateBadge state={c.state} label={c.stage} /></div>
          {rendering && <div className="space-y-1.5 mb-3"><Progress value={c.progress ?? 0} tone="warn" />
            <p className="text-xs text-mute">{c.phase === "queued" ? "En file d'attente" : c.phase === "validate" ? "Validation ffprobe…" : `Encodage FFmpeg ${Math.round((c.progress ?? 0) * 100)} %`}</p></div>}
          {c.error && !rendering && <div className="mb-3"><ErrorBox error={c.error} /></div>}
          <ErrorBox error={err} />
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={generate} loading={busy} disabled={rendering}><Wand2 className="size-4" />{c.has_final ? "Régénérer la vidéo" : "Générer la vidéo"}</Button>
            {rendering && <Button variant="danger" onClick={() => api(`/clips/${id}/cancel`, { method: "POST" }).then(reload)}>Annuler le rendu</Button>}
          </div>
          {c.has_final && !rendering && (
            <div className="mt-4 space-y-2"><p className="text-xs text-mute">Résultat final (FFmpeg) :</p>
              <video key={c.progress} src={media(`/clips/${id}/media?kind=final`)} controls playsInline className="w-full aspect-[9/16] rounded-xl bg-black" />
              <Link href="/ready" className="text-xs text-brand2 hover:underline">Valider dans Vidéos prêtes →</Link></div>)}
        </Card>
      </div>
    </div>
  );
}

function Picker() {
  const router = useRouter();
  const { data, loading, error } = useApi<Clip[]>("/clips?limit=300");
  const ok = (data ?? []).filter((c) => c.has_video && c.rights !== "discovered" && ["ANALYZED", "READY", "SENT", "REJECTED", "FAILED", "RENDERING"].includes(c.state));
  if (loading && !data) return <Skeleton className="h-40" />;
  if (error) return <ErrorBox error={error} />;
  if (!ok.length) return <Empty title="Aucun clip à monter" icon={<Clapperboard className="size-5" />}>Le studio travaille sur des clips analysés dont la réutilisation est autorisée. Importez une vidéo autorisée (Recherche YouTube → Import) ou attendez une détection sur une chaîne autorisée.</Empty>;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ok.map((c) => (
        <button key={c.id} onClick={() => router.push(`/studio?id=${c.id}`)} className="text-left rounded-xl border border-line bg-card p-3 hover:border-brand/50 transition">
          <div className="flex justify-between gap-2"><span className="font-medium">#{c.id} · {c.creator}</span><StateBadge state={c.state} label={c.stage} /></div>
          <p className="text-xs text-mute mt-1 truncate">{c.hook || c.transcript || "—"}</p>
        </button>))}
    </div>
  );
}

function StudioInner() {
  const sp = useSearchParams();
  const id = Number(sp.get("id"));
  return (
    <>
      <PageHeader title="Studio de montage" subtitle={id ? `Clip #${id} — les réglages sont appliqués au rendu final FFmpeg.` : "Choisissez un clip à préparer pour TikTok."}
        right={id ? <Link href="/studio"><Button variant="outline">Changer de clip</Button></Link> : undefined} />
      {id ? <Editor id={id} /> : <Picker />}
    </>
  );
}

export default function Studio() {
  return <Suspense fallback={<Skeleton className="h-96" />}><StudioInner /></Suspense>;
}
