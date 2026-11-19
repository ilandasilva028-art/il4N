"use client";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, Clapperboard, ExternalLink, MessageSquare, Mic } from "lucide-react";
import { fmtDate, fmtDur, media, useApi, type Clip } from "@/lib/api";
import { Badge, Button, Card, CardTitle, Empty, ErrorBox, PageHeader, RIGHTS_FR, ScorePill, Skeleton, StateBadge } from "@/components/ui";
import { ScoreBars } from "@/components/charts";

type Detail = Clip & {
  signals: { kind?: string; count?: number; baseline?: number; samples?: string[]; category?: string }[];
  score_detail: { total: number; decision: string; sub: Record<string, number>; weights: Record<string, number> } | null;
  analysis: { transcript: { language: string; segments: { start: number; end: number; text: string }[] }; cut: { start: number; end: number; anchor: number };
    features: { quote: string | null; uncertain: string[] }; visual?: { cam_box: number[] | null } } | null;
  metadata: Record<string, unknown> | null; description: string | null; history: { ts: number; action: string; detail: string }[];
};

export default function ClipDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: c, error, loading } = useApi<Detail>(`/clips/${id}`, 5000);
  if (loading && !c) return <Skeleton className="h-96" />;
  if (error || !c) return <ErrorBox error={error ?? "Clip introuvable"} />;
  const segs = c.analysis?.transcript.segments ?? [];
  const cut = c.analysis?.cut;
  return (
    <>
      <Link href="/clips" className="text-sm text-mute hover:text-ink flex items-center gap-1 mb-3"><ArrowLeft className="size-4" />Bibliothèque</Link>
      <PageHeader title={`Clip #${c.id} · ${c.creator}`} subtitle={`${fmtDate(c.detected_at)} · ${c.platform}`}
        right={<>{c.analysis && c.rights !== "discovered" && <Link href={`/studio?id=${c.id}`}><Button><Clapperboard className="size-4" />Ouvrir dans le studio</Button></Link>}
          <a href={c.url} target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink className="size-4" />Source originale</Button></a></>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <Card className="p-3">
            {c.has_final ? <video src={media(`/clips/${c.id}/media?kind=final`)} controls playsInline className="w-full aspect-[9/16] rounded-xl bg-black" />
              : c.has_video ? <video src={media(`/clips/${c.id}/media?kind=source`)} controls playsInline className="w-full aspect-video rounded-xl bg-black" />
              : <Empty title="Aucune vidéo">Ce moment a été repéré dans le chat sans téléchargement (droits : {RIGHTS_FR[c.rights]}). Retrouvez-le sur la chaîne à l'heure indiquée.</Empty>}
          </Card>
          <Card>
            <CardTitle>Informations</CardTitle>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-mute">Statut</dt><dd><StateBadge state={c.state} label={c.stage} /></dd>
              <dt className="text-mute">Score</dt><dd><ScorePill score={c.score} /></dd>
              <dt className="text-mute">Droits</dt><dd>{RIGHTS_FR[c.rights]}</dd>
              <dt className="text-mute">Durée</dt><dd>{fmtDur(c.duration)}</dd>
              <dt className="text-mute">Catégorie</dt><dd>{c.category ?? "—"}</dd>
              <dt className="text-mute">Accroche</dt><dd className="truncate">{c.hook ?? "—"}</dd>
            </dl>
            {c.error && <div className="mt-3"><ErrorBox error={c.error} /></div>}
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardTitle icon={<MessageSquare className="size-4 text-brand2" />}>Signaux du chat</CardTitle>
            {c.signals.filter((s) => s.kind).length === 0 ? <p className="text-sm text-mute">Pas de signal de chat (source importée : moment trouvé par l'audio).</p> :
              c.signals.filter((s) => s.kind).map((s, i) => (
                <div key={i} className="text-sm mb-2"><Badge tone="brand">{s.kind}</Badge> {s.count} messages en 10 s (habituel ~{s.baseline})
                  {s.samples?.length ? <p className="text-xs text-mute mt-1">« {s.samples.join(" » · « ")} »</p> : null}</div>))}
          </Card>
          {c.score_detail && <Card><CardTitle>Détail du score ({c.score_detail.total}/100 · {c.score_detail.decision})</CardTitle>
            <ScoreBars sub={c.score_detail.sub} weights={c.score_detail.weights} /></Card>}
          <Card>
            <CardTitle icon={<Mic className="size-4 text-brand2" />}>Transcription {c.analysis && <Badge>{c.analysis.transcript.language}</Badge>}</CardTitle>
            {!segs.length ? <p className="text-sm text-mute">Pas encore de transcription (le clip n'a pas été analysé).</p> : (
              <div className="space-y-1.5 max-h-80 overflow-auto pr-1 text-sm">
                {segs.map((s, i) => {
                  const inCut = cut && s.end > cut.start && s.start < cut.end;
                  return <p key={i} className={inCut ? "text-ink" : "text-mute/60"}><span className="text-[11px] tabular-nums text-mute mr-2">{s.start.toFixed(1)} s</span>{s.text}</p>;
                })}
              </div>)}
            {c.analysis?.features.uncertain?.length ? <p className="text-xs text-warn mt-2">Mots incertains à vérifier : {c.analysis.features.uncertain.join(", ")}</p> : null}
          </Card>
          {c.description && <Card><CardTitle>Description TikTok</CardTitle><pre className="whitespace-pre-wrap text-sm font-sans">{c.description}</pre></Card>}
          {c.history.length > 0 && <Card><CardTitle>Historique</CardTitle>
            <ul className="text-sm space-y-1">{c.history.map((h, i) => <li key={i}><span className="text-mute">{fmtDate(h.ts)}</span> · {h.action}</li>)}</ul></Card>}
        </div>
      </div>
    </>
  );
}
