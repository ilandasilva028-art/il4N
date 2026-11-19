"use client";
import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Lock, PackageCheck, Save, X } from "lucide-react";
import { api, fmtDate, fmtDur, media, useApi, type Clip } from "@/lib/api";
import { Badge, Button, Card, Empty, ErrorBox, Input, PageHeader, RIGHTS_FR, ScorePill, Skeleton } from "@/components/ui";

type Ready = Clip & { description: string; export_allowed: boolean; metadata: { uncertain_words?: string[] } | null };

function ReadyCard({ v, onChange }: { v: Ready; onChange: () => void }) {
  const [title, setTitle] = useState(v.title ?? v.hook ?? "");
  const [desc, setDesc] = useState(v.description);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const tags = desc.split(/\s+/).filter((w) => w.startsWith("#"));
  const dirty = desc !== v.description || title !== (v.title ?? v.hook ?? "");
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setErr(null); setOk(null);
    try { await fn(); setOk(msg); onChange(); } catch (e) { setErr((e as Error).message); }
  };
  const authorized = v.rights === "authorized" || v.rights === "owned";
  return (
    <Card className="grid md:grid-cols-[220px_1fr] gap-4">
      <video src={media(`/clips/${v.id}/media?kind=final`)} controls playsInline preload="metadata" className="w-full max-w-[260px] mx-auto aspect-[9/16] rounded-xl bg-black" />
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">#{v.id} · {v.creator}</span><ScorePill score={v.score} /><Badge>{fmtDur(v.duration)}</Badge>
          {v.approved === 1 ? <Badge tone="ok">Accepté</Badge> : v.approved === 0 ? <Badge tone="bad">Refusé</Badge> : <Badge tone="warn">À valider</Badge>}
          {v.state === "SENT" && <Badge tone="ok">Téléchargé</Badge>}
        </div>
        <div className="text-xs text-mute flex flex-wrap gap-x-4 gap-y-1">
          <span>Terminé le {fmtDate(v.created)}</span>
          <span className={authorized ? "text-ok" : "text-bad"}>Droits : {RIGHTS_FR[v.rights]}</span>
          <a href={v.url} target="_blank" rel="noreferrer" className="text-brand2 flex items-center gap-1">Source originale<ExternalLink className="size-3" /></a>
        </div>
        <div><label className="text-xs text-mute">Titre</label><Input value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} /></div>
        <div>
          <div className="flex justify-between text-xs text-mute"><span>Description TikTok</span>
            <span className={tags.length === 5 ? "text-ok" : "text-bad"}>{tags.length}/5 hashtags</span></div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5}
            className="w-full rounded-lg bg-bg border border-line p-3 text-sm outline-none focus:border-brand" />
          {v.metadata?.uncertain_words?.length ? <p className="text-[11px] text-warn">Transcription incertaine à vérifier : {v.metadata.uncertain_words.join(", ")}</p> : null}
        </div>
        <ErrorBox error={err} />{ok && <p className="text-sm text-ok">{ok}</p>}
        <div className="flex flex-wrap gap-2">
          {dirty && <Button variant="outline" onClick={() => run(() => api(`/clips/${v.id}/ready`, { method: "PATCH", body: JSON.stringify({ title, description: desc }) }), "Modifications enregistrées")}><Save className="size-4" />Enregistrer</Button>}
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(desc).then(() => setOk("Description copiée"), () => setErr("Copie impossible (navigateur)"))}><Copy className="size-4" />Copier la description</Button>
          <Button variant="success" onClick={() => run(() => api(`/clips/${v.id}/review`, { method: "POST", body: JSON.stringify({ decision: "approve" }) }), "Clip accepté")}><Check className="size-4" />Accepter</Button>
          <Button variant="danger" onClick={() => run(() => api(`/clips/${v.id}/review`, { method: "POST", body: JSON.stringify({ decision: "reject" }) }), "Clip refusé")}><X className="size-4" />Refuser</Button>
          {v.export_allowed ? (
            <a href={media(`/clips/${v.id}/download`)} download><Button><Download className="size-4" />Télécharger le MP4</Button></a>
          ) : (
            <Button disabled title={!authorized ? "Autorisation de réutilisation non établie" : "Acceptez d'abord le clip"}>
              <Lock className="size-4" />{!authorized ? "Export bloqué (droits)" : "Acceptez pour télécharger"}</Button>
          )}
        </div>
        <p className="text-[11px] text-mute">Aucune publication automatique : vous publiez vous-même sur TikTok après vérification.</p>
      </div>
    </Card>
  );
}

export default function ReadyPage() {
  const { data, error, loading, reload } = useApi<Ready[]>("/ready", 10000);
  return (
    <>
      <PageHeader title="Vidéos prêtes à publier" subtitle="MP4 validés (ffprobe + décodage). Export possible seulement si les droits sont établis et le clip accepté." />
      <ErrorBox error={error} />
      {loading && !data ? <Skeleton className="h-96" /> : !data?.length ? (
        <Empty title="Aucune vidéo terminée" icon={<PackageCheck className="size-5" />}>Les vidéos montées apparaissent ici. Importez une vidéo autorisée ou générez un clip depuis le studio.</Empty>
      ) : <div className="space-y-4">{data.map((v) => <ReadyCard key={v.id} v={v} onChange={reload} />)}</div>}
    </>
  );
}
