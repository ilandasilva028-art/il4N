"use client";
import Link from "next/link";
import { useState } from "react";
import { Factory, RotateCcw, X } from "lucide-react";
import { api, fmtDate, fmtDur, useApi, useLive, type Clip } from "@/lib/api";
import { Badge, Button, Card, Empty, ErrorBox, PageHeader, Progress, Skeleton, StateBadge } from "@/components/ui";

const COLUMNS = ["À analyser", "Analyse en cours", "Prêt à monter", "Montage en cours", "Validation", "Terminé", "Erreur"];

function Job({ j, onChange }: { j: Clip; onChange: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const live = useLive().live?.jobs.find((x) => x.id === j.id);
  const progress = live?.progress ?? j.progress;
  const act = async (a: string) => { setErr(null); try { await api(`/clips/${j.id}/${a}`, { method: "POST" }); onChange(); } catch (e) { setErr((e as Error).message); } };
  return (
    <Card className="p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/clips/${j.id}`} className="font-medium text-sm hover:text-brand2 truncate">#{j.id} · {j.creator}</Link>
        <StateBadge state={j.state} label={j.stage} />
      </div>
      <p className="text-xs text-mute truncate">{j.platform} · {fmtDate(j.created)}{j.waiting_source ? " · en attente de la fenêtre vidéo" : ""}</p>
      {j.stage === "Montage en cours" && <><Progress value={progress ?? 0} tone="warn" /><p className="text-[11px] text-mute">Encodage {Math.round((progress ?? 0) * 100)} % (mesuré par FFmpeg)</p></>}
      {j.stage === "Analyse en cours" && <p className="text-[11px] text-warn">Analyse audio + transcription… (avancement non mesurable)</p>}
      {j.elapsed != null && <p className="text-[11px] text-mute">Durée du traitement : {fmtDur(j.elapsed)}</p>}
      {j.error && j.state === "FAILED" && <p className="text-xs text-bad break-words">{j.error}</p>}
      <ErrorBox error={err} />
      <div className="flex gap-2">
        {j.state === "FAILED" && <Button variant="outline" onClick={() => act("retry")}><RotateCcw className="size-3.5" />Réessayer</Button>}
        {["CANDIDATE", "ANALYZED", "RENDERING"].includes(j.state) && <Button variant="danger" onClick={() => act("cancel")}><X className="size-3.5" />Annuler</Button>}
      </div>
    </Card>
  );
}

export default function Production() {
  const { data, error, loading, reload } = useApi<Clip[]>("/jobs", 3000);
  const by = (col: string) => (data ?? []).filter((j) => (j.stage === "Livré" ? "Terminé" : j.stage) === col);
  return (
    <>
      <PageHeader title="Production" subtitle="File d'attente persistée dans SQLite : elle survit aux redémarrages (reprise automatique)."
        right={<Badge tone="brand">Un rendu lourd à la fois</Badge>} />
      <ErrorBox error={error} />
      {loading && !data ? <Skeleton className="h-64" /> : !data?.length ? (
        <Empty title="File d'attente vide" icon={<Factory className="size-5" />}>Aucune tâche en cours. Les tâches apparaissent quand un moment autorisé est détecté ou qu'une vidéo est importée.</Empty>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
          {COLUMNS.map((col) => (
            <div key={col} className="min-w-[260px] w-[260px] shrink-0 snap-start">
              <div className="flex items-center justify-between mb-2 px-1"><span className="text-sm font-medium">{col}</span><Badge>{by(col).length}</Badge></div>
              <div className="space-y-2">{by(col).map((j) => <Job key={j.id} j={j} onChange={reload} />)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
